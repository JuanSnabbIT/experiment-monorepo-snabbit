"""
Motor de generacion de PDF v2 — polimorfico via adaptadores.

Para contratos B2B (``ContratoEmpresaCliente``) reutiliza integramente el
motor v1 (`generar_contrato_desde_plantilla`) para preservar fielmente el
layout y bloques comerciales (servicios, cotizaciones, licencias, cuotas,
condiciones, acuerdos).

Para contratos laborales (``ContratoTrabajador``) implementa un layout
simplificado:

* Header con logo y nombre de la empresa empleadora.
* Tabla de partes (empleador / trabajador con RUT y direccion).
* Tabla de vigencia (fecha_inicio / fecha_termino / tipo_contrato).
* Iteracion de ``SeccionContratoGenerada`` (sin bloque comercial).
* Bloque de firmas opcional (tipo de seccion ``firmas``).

El motor v1 NO se modifica.
"""

from __future__ import annotations

import html
import json as _json
import re as _re
from io import BytesIO
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from contratos.adaptadores import IContratoBase
from contratos.funciones import (
    _build_logo_image,
    _build_signature_image,
    _html_to_flowables,
    _make_contract_canvas_class,
    _safe_paragraph_text,
    generar_contrato_desde_plantilla,
)

# Patrón que detecta el marcador de tabla de turnos inyectado por el adaptador
_PATRON_TABLA_TURNOS = _re.compile(
    r"__TABLA_TURNOS_JSON__(.*?)__END_TABLA__",
    _re.DOTALL,
)


def _construir_tabla_turnos_rl(slots_json: str, estilo_celda, estilo_label) -> "Table | None":
    """
    Convierte JSON de slots en una Table ReportLab con estilos.
    Columnas: #, Turno, Hora inicio, Hora fin.
    """
    try:
        slots = _json.loads(slots_json)
    except (ValueError, TypeError):
        return None
    if not slots:
        return None

    data = [[
        Paragraph("<b>#</b>", estilo_label),
        Paragraph("<b>Turno</b>", estilo_label),
        Paragraph("<b>Hora inicio</b>", estilo_label),
        Paragraph("<b>Hora fin</b>", estilo_label),
    ]]
    for i, slot in enumerate(slots, 1):
        data.append([
            Paragraph(str(i), estilo_celda),
            Paragraph(html.escape(str(slot.get("nombre", ""))), estilo_celda),
            Paragraph(html.escape(str(slot.get("hora_inicio", ""))), estilo_celda),
            Paragraph(html.escape(str(slot.get("hora_fin", ""))), estilo_celda),
        ])

    tabla = Table(data, colWidths=[0.4 * inch, 3.1 * inch, 1.5 * inch, 1.5 * inch])
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8f0fe")),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("FONTNAME",   (0, 0), (-1, 0), "Times-Bold"),
        ("GRID",       (0, 0), (-1, -1), 0.5, colors.HexColor("#c0c0c0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9fa")]),
        ("ALIGN",      (0, 0), (-1, -1), "LEFT"),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
    ]))
    return tabla


def _flowables_con_tabla_turnos(texto: str, estilo_parrafo, estilo_bullet, estilo_celda, estilo_label) -> list:
    """
    Procesa texto que puede contener marcadores __TABLA_TURNOS_JSON__...__END_TABLA__.
    Para cada marcador genera una Table ReportLab nativa; el texto restante
    se procesa con _html_to_flowables.
    Retorna lista mixta de flowables.
    """
    partes = _PATRON_TABLA_TURNOS.split(texto)
    resultado = []
    # split con un grupo de captura devuelve: [texto, json, texto, json, texto, ...]
    for i, parte in enumerate(partes):
        if i % 2 == 0:
            if parte.strip():
                resultado.extend(_html_to_flowables(parte, estilo_parrafo, estilo_bullet))
        else:
            tabla = _construir_tabla_turnos_rl(parte, estilo_celda, estilo_label)
            if tabla:
                resultado.append(tabla)
    return resultado


def _es_b2b(adaptador: IContratoBase) -> bool:
    from contratos.models import ContratoEmpresaCliente
    return isinstance(adaptador.instancia, ContratoEmpresaCliente)


def generar_contrato_pdf_v2(
    adaptador: IContratoBase,
    *,
    firma_b64: Optional[str] = None,
    firmante: str = "",
    forzar_borrador: bool = False,
) -> bytes:
    """
    Genera el PDF del contrato representado por ``adaptador``.

    * Si la instancia es ``ContratoEmpresaCliente`` → delega 100% al motor v1.
    * Si es ``ContratoTrabajador`` → render simplificado laboral.

    Args:
        forzar_borrador: Si True, imprime la marca de agua BORRADOR
            independientemente del estado del contrato (util para vistas
            previas publicas como la aprobacion del empleador).
    """
    if _es_b2b(adaptador):
        return generar_contrato_desde_plantilla(
            adaptador.instancia,
            firma_cliente_b64=firma_b64,
            firmante_cliente=firmante,
        )

    return _generar_pdf_trabajador(adaptador, firma_b64=firma_b64, firmante=firmante, forzar_borrador=forzar_borrador)


# ---------------------------------------------------------------------------
# Render trabajador
# ---------------------------------------------------------------------------

def _generar_pdf_trabajador(
    adaptador: IContratoBase,
    *,
    firma_b64: Optional[str] = None,
    firmante: str = "",
    forzar_borrador: bool = False,
) -> bytes:
    """Render PDF para contratos laborales."""

    contrato = adaptador.instancia  # rrhh.ContratoTrabajador
    empresa = adaptador.empresa_prestadora
    ue = contrato.usuario_empresa
    user = ue.usuario if ue else None

    # ----- Datos partes -----
    nombre_empresa = (empresa.nombre if empresa else "") or ""
    rut_empresa = (getattr(empresa, "rut_empresa", "") or "") if empresa else ""
    direccion_empresa = (getattr(empresa, "direccion_principal", "") or "") if empresa else ""
    representante_empresa = (getattr(empresa, "representante_legal", "") or "") if empresa else ""

    nombre_trabajador = user.get_nombre_completo() if user else ""
    rut_trabajador = (getattr(user, "rut", "") or "") if user else ""
    direccion_trabajador = (getattr(user, "direccion", "") or "") if user else ""
    email_trabajador = (user.email if user else "") or ""

    firma_empresa_b64 = getattr(empresa, "firma_empresa", None) if empresa else None

    if not firmante and nombre_trabajador:
        firmante = nombre_trabajador

    # ----- Secciones -----
    # Filtrar por plantilla activa para evitar contaminación entre plantillas
    # distintas aplicadas al mismo contrato (ej: contrato vs. finiquito).
    secciones_qs = adaptador.secciones_generadas_qs().select_related("seccion_plantilla")
    if adaptador.plantilla:
        secciones_qs = secciones_qs.filter(seccion_plantilla__plantilla=adaptador.plantilla)
    secciones = list(secciones_qs.order_by("orden"))
    secciones_contenido = []
    secciones_firmas = []
    for s in secciones:
        tipo = s.seccion_plantilla.tipo if s.seccion_plantilla else "libre"
        if tipo == "firmas":
            secciones_firmas.append(s)
        else:
            secciones_contenido.append(s)

    # ----- Estilos -----
    estilos = getSampleStyleSheet()
    estilo_normal = estilos["Normal"]
    estilo_normal.fontName = "Times-Roman"
    estilo_normal.fontSize = 10
    estilo_normal.leading = 14

    estilo_titulo_doc = ParagraphStyle(
        "titulo_doc",
        parent=estilo_normal, fontSize=14, leading=18,
        alignment=TA_CENTER, spaceAfter=6, bold=True,
    )
    estilo_subtitulo_doc = ParagraphStyle(
        "subtitulo_doc",
        parent=estilo_normal, fontSize=11, leading=15,
        alignment=TA_CENTER, spaceAfter=16,
    )
    estilo_titulo = ParagraphStyle(
        "titulo_plantilla", parent=estilo_normal,
        fontSize=12, leading=16, alignment=TA_CENTER,
        spaceAfter=10, bold=True,
    )
    estilo_subtitulo = ParagraphStyle(
        "subtitulo_plantilla", parent=estilo_normal,
        fontSize=11, leading=14, alignment=TA_LEFT,
        spaceBefore=12, spaceAfter=6, bold=True,
    )
    estilo_sec_titulo = ParagraphStyle(
        "sec_titulo", parent=estilo_normal,
        fontSize=14, leading=18, alignment=TA_CENTER,
        spaceBefore=14, spaceAfter=6, bold=True,
        textColor=colors.HexColor("#1a1a1a"),
    )
    estilo_sec_subtitulo = ParagraphStyle(
        "sec_subtitulo", parent=estilo_normal,
        fontSize=12, leading=15, alignment=TA_LEFT,
        spaceBefore=10, spaceAfter=4, bold=True,
        textColor=colors.HexColor("#333333"),
    )
    estilo_parrafo = ParagraphStyle(
        "parrafo_plantilla", parent=estilo_normal,
        alignment=TA_JUSTIFY, firstLineIndent=20, spaceAfter=8,
    )
    estilo_bullet = ParagraphStyle(
        "bullet_plantilla", parent=estilo_normal,
        alignment=TA_LEFT, leftIndent=20, spaceAfter=4,
    )
    estilo_tabla_celda = ParagraphStyle(
        "tabla_celda_plantilla", parent=estilo_normal,
        alignment=TA_LEFT, fontSize=10,
    )
    estilo_tabla_label = ParagraphStyle(
        "tabla_label_plantilla", parent=estilo_normal,
        alignment=TA_LEFT, fontSize=9,
        textColor=colors.HexColor("#555555"),
    )

    # ----- Documento -----
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=LETTER,
        rightMargin=54, leftMargin=54, topMargin=72, bottomMargin=54,
    )

    canvas_config = {
        "nombre_empresa": nombre_empresa,
        "nombre_contrato": adaptador.nombre or "Contrato de Trabajo",
        "es_borrador": forzar_borrador,
    }
    canvas_class = _make_contract_canvas_class(canvas_config)

    elementos = []

    # ----- Logo -----
    if empresa:
        logo_img = _build_logo_image(empresa)
        if logo_img:
            elementos.append(logo_img)
            elementos.append(Spacer(1, 8))

    # ----- Titulo -----
    elementos.append(Paragraph(
        _safe_paragraph_text(adaptador.nombre or "CONTRATO DE TRABAJO"),
        estilo_titulo_doc,
    ))
    tipo_contrato_label = (
        contrato.get_tipo_contrato_display() if hasattr(contrato, "get_tipo_contrato_display") else contrato.tipo_contrato
    )
    elementos.append(Paragraph(
        f"Contrato laboral - <b>{html.escape(tipo_contrato_label or '')}</b>",
        estilo_subtitulo_doc,
    ))

    # ----- Tabla partes -----
    data_partes = [
        [
            Paragraph("<b>Empleador</b>", estilo_tabla_celda),
            Paragraph("<b>Trabajador</b>", estilo_tabla_celda),
        ],
        [
            Paragraph(html.escape(nombre_empresa), estilo_tabla_celda),
            Paragraph(html.escape(nombre_trabajador), estilo_tabla_celda),
        ],
    ]
    if rut_empresa or rut_trabajador:
        data_partes.append([
            Paragraph(f"RUT: {html.escape(rut_empresa)}", estilo_tabla_label),
            Paragraph(f"RUT: {html.escape(rut_trabajador)}", estilo_tabla_label),
        ])
    if direccion_empresa or direccion_trabajador:
        data_partes.append([
            Paragraph(f"Direccion: {html.escape(direccion_empresa)}", estilo_tabla_label),
            Paragraph(f"Direccion: {html.escape(direccion_trabajador)}", estilo_tabla_label),
        ])
    if representante_empresa or email_trabajador:
        data_partes.append([
            Paragraph(f"Rep. Legal: {html.escape(representante_empresa)}", estilo_tabla_label),
            Paragraph(f"Email: {html.escape(email_trabajador)}", estilo_tabla_label),
        ])

    tabla_partes = Table(data_partes, colWidths=[3.5 * inch, 3.5 * inch])
    tabla_partes.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f4f8")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elementos.append(tabla_partes)
    elementos.append(Spacer(1, 6))

    # ----- Vigencia -----
    fecha_inicio_str = contrato.fecha_inicio.strftime("%d/%m/%Y") if contrato.fecha_inicio else "—"
    fecha_termino_str = (
        contrato.fecha_termino.strftime("%d/%m/%Y")
        if contrato.fecha_termino else "Indefinido"
    )

    data_vigencia = [
        [
            Paragraph("<b>Inicio</b>", estilo_tabla_label),
            Paragraph("<b>Termino</b>", estilo_tabla_label),
            Paragraph("<b>Tipo</b>", estilo_tabla_label),
        ],
        [
            Paragraph(fecha_inicio_str, estilo_tabla_celda),
            Paragraph(fecha_termino_str, estilo_tabla_celda),
            Paragraph(html.escape(tipo_contrato_label or ""), estilo_tabla_celda),
        ],
    ]

    # Agregar fila de horario cuando hay hora_inicio/hora_fin y la jornada no es turnos
    hora_inicio_ct = getattr(contrato, "hora_inicio", None)
    hora_fin_ct    = getattr(contrato, "hora_fin", None)
    if hora_inicio_ct and hora_fin_ct and getattr(contrato, "jornada", "") != "turnos":
        data_vigencia.append([
            Paragraph("<b>Hora inicio</b>", estilo_tabla_label),
            Paragraph("<b>Hora fin</b>", estilo_tabla_label),
            Paragraph("<b>Jornada</b>", estilo_tabla_label),
        ])
        data_vigencia.append([
            Paragraph(hora_inicio_ct.strftime("%H:%M"), estilo_tabla_celda),
            Paragraph(hora_fin_ct.strftime("%H:%M"), estilo_tabla_celda),
            Paragraph(html.escape(contrato.get_jornada_display() or ""), estilo_tabla_celda),
        ])
    tabla_vigencia = Table(data_vigencia, colWidths=[2.33 * inch, 2.33 * inch, 2.34 * inch])
    tabla_vigencia.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f4f8")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elementos.append(tabla_vigencia)
    elementos.append(Spacer(1, 18))

    # ----- Secciones de la plantilla -----
    for seccion in secciones_contenido:
        tipo = seccion.seccion_plantilla.tipo if seccion.seccion_plantilla else "libre"

        if tipo == "titulo":
            elementos.append(Paragraph(
                _safe_paragraph_text(seccion.titulo),
                estilo_sec_titulo,
            ))
        elif tipo == "subtitulo":
            elementos.append(Paragraph(
                _safe_paragraph_text(seccion.titulo),
                estilo_sec_subtitulo,
            ))
        elif tipo == "encabezado":
            elementos.append(Paragraph(
                _safe_paragraph_text(seccion.titulo),
                estilo_titulo,
            ))
            if (seccion.contenido_renderizado or "").strip():
                elementos.extend(_flowables_con_tabla_turnos(
                    seccion.contenido_renderizado, estilo_parrafo, estilo_bullet,
                    estilo_tabla_celda, estilo_tabla_label,
                ))
            elementos.append(Spacer(1, 10))
        else:
            if seccion.titulo:
                elementos.append(Paragraph(
                    f"<b>{_safe_paragraph_text(seccion.titulo)}</b>",
                    estilo_subtitulo,
                ))
            elementos.extend(_flowables_con_tabla_turnos(
                seccion.contenido_renderizado or "", estilo_parrafo, estilo_bullet,
                estilo_tabla_celda, estilo_tabla_label,
            ))
            elementos.append(Spacer(1, 6))

    if not secciones:
        elementos.append(Paragraph("(Sin contenido de plantilla)", estilo_parrafo))

    # ----- Firmas -----
    for _seccion in secciones_firmas:
        elementos.append(Spacer(1, 24))
        data_firmas = [
            [
                _build_signature_image(firma_empresa_b64),
                _build_signature_image(firma_b64),
            ],
            [
                Paragraph("<b>__________________________</b>", estilo_tabla_celda),
                Paragraph("<b>__________________________</b>", estilo_tabla_celda),
            ],
            [
                Paragraph("Firma del Empleador", estilo_tabla_celda),
                Paragraph("Firma del Trabajador", estilo_tabla_celda),
            ],
            [
                Paragraph(_safe_paragraph_text(representante_empresa or nombre_empresa), estilo_tabla_celda),
                Paragraph(_safe_paragraph_text(firmante or nombre_trabajador), estilo_tabla_celda),
            ],
        ]
        tabla_firmas = Table(data_firmas, colWidths=[3 * inch, 3 * inch])
        tabla_firmas.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 18),
        ]))
        elementos.append(tabla_firmas)

    doc.build(elementos, canvasmaker=canvas_class)
    buffer.seek(0)
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# Helper de alto nivel
# ---------------------------------------------------------------------------

def generar_pdf_para_contrato_v2(modelo) -> bytes:
    """
    Helper que detecta el tipo de modelo, construye el adaptador apropiado
    y genera el PDF. Util para llamadas one-shot.
    """
    from contratos.models import ContratoEmpresaCliente
    from rrhh.models import ContratoTrabajador
    from contratos.adaptadores import (
        AdaptadorContratoB2B,
        AdaptadorContratoTrabajador,
    )

    if isinstance(modelo, ContratoEmpresaCliente):
        return generar_contrato_pdf_v2(AdaptadorContratoB2B(modelo))
    if isinstance(modelo, ContratoTrabajador):
        return generar_contrato_pdf_v2(AdaptadorContratoTrabajador(modelo))

    raise TypeError(
        f"Modelo no soportado por motor v2: {type(modelo).__name__}"
    )
