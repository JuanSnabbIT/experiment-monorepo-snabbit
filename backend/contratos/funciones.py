import base64
import binascii
import html
from html.parser import HTMLParser
from io import BytesIO

from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    ListFlowable,
    ListItem,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib import colors
from reportlab.lib.units import inch

from .venta_helpers import construir_resumen_venta_contrato, normalizar_moneda


def _safe_paragraph_text(value):
    return html.escape((value or "")).replace("\n", "<br/>")


class _HTMLToFlowables(HTMLParser):
    """
    Parser HTML liviano que convierte HTML simple (p, ul, ol, li, strong, b, em, i, br)
    en una lista de textos con markup de ReportLab (Paragraph-compatible).
    """

    def __init__(self):
        super().__init__()
        self._paragraphs: list[str] = []
        self._current: list[str] = []
        self._list_items: list[str] = []
        self._in_list: bool = False
        self._in_li: bool = False
        self._bold: int = 0
        self._italic: int = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("p", "div"):
            self._flush_current()
        elif tag in ("strong", "b"):
            self._bold += 1
            self._current.append("<b>")
        elif tag in ("em", "i"):
            self._italic += 1
            self._current.append("<i>")
        elif tag == "br":
            self._current.append("<br/>")
        elif tag in ("ul", "ol"):
            self._flush_current()
            self._in_list = True
            self._list_items = []
        elif tag == "li":
            self._in_li = True
            self._current = []

    def handle_endtag(self, tag):
        if tag in ("p", "div"):
            self._flush_current()
        elif tag in ("strong", "b"):
            self._bold = max(0, self._bold - 1)
            self._current.append("</b>")
        elif tag in ("em", "i"):
            self._italic = max(0, self._italic - 1)
            self._current.append("</i>")
        elif tag == "li":
            if self._in_li:
                self._list_items.append("".join(self._current).strip())
                self._current = []
                self._in_li = False
        elif tag in ("ul", "ol"):
            self._in_list = False
            if self._list_items:
                # Encode list as special marker
                for item in self._list_items:
                    self._paragraphs.append(f"__LIST_ITEM__:{item}")
                self._list_items = []

    def handle_data(self, data):
        text = html.escape(data.replace("\xa0", " "))
        self._current.append(text)

    def _flush_current(self):
        text = "".join(self._current).strip()
        if text:
            self._paragraphs.append(text)
        self._current = []

    def get_paragraphs(self) -> list[str]:
        self._flush_current()
        return self._paragraphs


def _html_to_flowables(html_content: str, style_parrafo, style_bullet) -> list:
    """Convierte HTML a una lista de flowables de ReportLab."""
    parser = _HTMLToFlowables()
    parser.feed(html_content or "")
    result = []
    for para in parser.get_paragraphs():
        if para.startswith("__LIST_ITEM__:"):
            text = para[len("__LIST_ITEM__:"):]
            result.append(Paragraph(f"&bull;&nbsp;&nbsp;{text}", style_bullet))
        else:
            result.append(Paragraph(para, style_parrafo))
    return result


def _build_signature_image(firma_base64):
    if not firma_base64:
        return Spacer(1, 36)

    try:
        raw_value = firma_base64.split(",", 1)[1] if "," in firma_base64 else firma_base64
        image_bytes = base64.b64decode(raw_value, validate=True)
    except (ValueError, TypeError, binascii.Error):
        return Spacer(1, 36)

    image = Image(BytesIO(image_bytes))
    image.drawWidth = 2.2 * inch
    image.drawHeight = 0.9 * inch
    image.hAlign = "CENTER"
    return image


def _normalize_contract_text_lines(value):
    if not value:
        return []
    lines = []
    for raw_line in str(value).splitlines():
        line = raw_line.strip().lstrip("-*").strip()
        if line:
            lines.append(line)
    return lines


def _scope_lines_from_model(servicio, modo):
    return _normalize_contract_text_lines(servicio.construir_texto_alcance(modo))


def _append_plan_component_rows(data_items, item, estilo_bullet):
    componentes_snapshot = item.snapshot_componentes_plan or []
    if componentes_snapshot:
        componentes = componentes_snapshot
    elif item.plan_version_id:
        componentes = []
        detalles = item.plan_version.detalles_servicio.select_related(
            "servicio_version"
        ).prefetch_related(
            "servicio_version__caracteristicas",
            "servicio_version__alcance_items__caracteristica",
        )
        for detalle in detalles:
            servicio = detalle.servicio_version
            componentes.append(
                {
                    "nombre": servicio.nombre,
                    "descripcion": servicio.descripcion,
                    "categoria_label": servicio.get_categoria_display(),
                    "obligatorio": detalle.obligatorio,
                    "cantidad_default": detalle.cantidad_default,
                    "veces_por_mes_default": detalle.veces_por_mes_default,
                    "incluye": _scope_lines_from_model(servicio, "incluye") or _normalize_contract_text_lines(servicio.incluye),
                    "no_incluye": _scope_lines_from_model(servicio, "no_incluye") or _normalize_contract_text_lines(servicio.no_incluye),
                    "clausulas_especiales": servicio.clausulas_especiales,
                }
            )
    else:
        componentes = []

    for componente in componentes:
        encabezado = (
            f"&nbsp;&nbsp;&nbsp;&nbsp;<i>Servicio incluido:</i> {html.escape(componente.get('nombre') or 'Servicio incluido')}"
        )
        data_items.append([Paragraph(encabezado, estilo_bullet), "", "", "", ""])

        descripcion = componente.get("descripcion")
        if descripcion:
            data_items.append(
                [
                    Paragraph(
                        f"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Descripcion: {html.escape(str(descripcion))}",
                        estilo_bullet,
                    ),
                    "",
                    "",
                    "",
                    "",
                ]
            )

        for label, values in (
            ("Incluye", componente.get("incluye") or []),
            ("No incluye", componente.get("no_incluye") or []),
        ):
            normalized_values = (
                _normalize_contract_text_lines(values)
                if isinstance(values, str)
                else [str(value) for value in values if value]
            )
            for value in normalized_values:
                data_items.append(
                    [
                        Paragraph(
                            f"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{html.escape(label)}: {html.escape(value)}",
                            estilo_bullet,
                        ),
                        "",
                        "",
                        "",
                        "",
                    ]
                )

        clausulas = componente.get("clausulas_especiales")
        if clausulas:
            data_items.append(
                [
                    Paragraph(
                        f"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Clausulas: {html.escape(str(clausulas))}",
                        estilo_bullet,
                    ),
                    "",
                    "",
                    "",
                    "",
                ]
            )


def generar_contrato_desde_plantilla(
    contrato,
    *,
    firma_cliente_b64=None,
    firmante_cliente="",
):
    """
    Genera PDF de contrato a partir de sus SeccionContratoGenerada.

    Incluye:
      - Cabecera con nombre del contrato y datos de las partes (empresa prestadora y cliente)
      - Secciones por tipo:
          encabezado → título centrado
          clausula / condiciones_generales / libre → título + contenido HTML parseado
          firmas → bloque de firmas (empresa + cliente)

    Retorna bytes del PDF.
    """
    secciones = contrato.secciones_generadas.select_related("seccion_plantilla").order_by("orden")

    firma_empresa_b64 = None
    nombre_empresa = ""
    rut_empresa = ""
    rep_legal_empresa = ""
    if contrato.empresa_prestadora:
        firma_empresa_b64 = getattr(contrato.empresa_prestadora, "firma_empresa", None)
        nombre_empresa = contrato.empresa_prestadora.nombre or ""
        rut_empresa = getattr(contrato.empresa_prestadora, "rut_empresa", None) or ""
        reps = getattr(contrato.empresa_prestadora, "representantes_legales", None)
        if reps is not None:
            rep_obj = reps.first()
            if rep_obj:
                nombre_usuario = getattr(rep_obj, "nombre_usuario", None) or getattr(rep_obj, "nombre", None) or ""
                rep_legal_empresa = nombre_usuario

    nombre_cliente = ""
    rut_cliente = ""
    rep_legal_cliente = ""
    if contrato.empresa_cliente:
        nombre_cliente = contrato.empresa_cliente.nombre or ""
        rut_cliente = getattr(contrato.empresa_cliente, "rut_empresa", None) or ""
        reps_cliente = getattr(contrato.empresa_cliente, "representantes_legales", None)
        if reps_cliente is not None:
            rep_obj_c = reps_cliente.first()
            if rep_obj_c:
                nombre_usuario_c = getattr(rep_obj_c, "nombre_usuario", None) or getattr(rep_obj_c, "nombre", None) or ""
                rep_legal_cliente = nombre_usuario_c

    if not firmante_cliente and rep_legal_cliente:
        firmante_cliente = rep_legal_cliente

    buffer = BytesIO()

    estilos = getSampleStyleSheet()
    estilo_normal = estilos["Normal"]
    estilo_normal.fontName = "Times-Roman"
    estilo_normal.fontSize = 10
    estilo_normal.leading = 14

    estilo_titulo_doc = ParagraphStyle(
        "titulo_doc",
        parent=estilo_normal,
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        spaceBefore=0,
        spaceAfter=6,
        bold=True,
    )

    estilo_subtitulo_doc = ParagraphStyle(
        "subtitulo_doc",
        parent=estilo_normal,
        fontSize=11,
        leading=15,
        alignment=TA_CENTER,
        spaceAfter=16,
    )

    estilo_titulo = ParagraphStyle(
        "titulo_plantilla",
        parent=estilo_normal,
        fontSize=12,
        leading=16,
        alignment=TA_CENTER,
        spaceAfter=10,
        bold=True,
    )

    estilo_subtitulo = ParagraphStyle(
        "subtitulo_plantilla",
        parent=estilo_normal,
        fontSize=11,
        leading=14,
        alignment=TA_LEFT,
        spaceBefore=12,
        spaceAfter=6,
        bold=True,
    )

    estilo_parrafo = ParagraphStyle(
        "parrafo_plantilla",
        parent=estilo_normal,
        alignment=TA_JUSTIFY,
        firstLineIndent=20,
        spaceAfter=8,
    )

    estilo_bullet = ParagraphStyle(
        "bullet_plantilla",
        parent=estilo_normal,
        alignment=TA_LEFT,
        leftIndent=20,
        spaceAfter=4,
    )

    estilo_tabla_celda = ParagraphStyle(
        "tabla_celda_plantilla",
        parent=estilo_normal,
        alignment=TA_LEFT,
        fontSize=10,
    )

    estilo_tabla_label = ParagraphStyle(
        "tabla_label_plantilla",
        parent=estilo_normal,
        alignment=TA_LEFT,
        fontSize=9,
        textColor=colors.HexColor("#555555"),
    )

    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    elementos = []

    # ── Cabecera del documento ───────────────────────────────────────────────
    elementos.append(Paragraph(
        _safe_paragraph_text(contrato.nombre or "CONTRATO"),
        estilo_titulo_doc,
    ))
    tipo_label = getattr(contrato, "get_tipo_display", lambda: contrato.tipo)()
    elementos.append(Paragraph(
        f"Contrato de tipo <b>{html.escape(tipo_label)}</b>",
        estilo_subtitulo_doc,
    ))

    # Tabla de partes
    fecha_inicio_str = contrato.fecha_inicio.strftime("%d/%m/%Y") if contrato.fecha_inicio else "—"
    fecha_fin_str = contrato.fecha_fin.strftime("%d/%m/%Y") if contrato.fecha_fin else "Sin fecha de término"

    data_partes = [
        [
            Paragraph("<b>Empresa Prestadora</b>", estilo_tabla_celda),
            Paragraph("<b>Empresa Cliente</b>", estilo_tabla_celda),
        ],
        [
            Paragraph(html.escape(nombre_empresa), estilo_tabla_celda),
            Paragraph(html.escape(nombre_cliente), estilo_tabla_celda),
        ],
    ]
    if rut_empresa or rut_cliente:
        data_partes.append([
            Paragraph(f"RUT: {html.escape(rut_empresa)}", estilo_tabla_label),
            Paragraph(f"RUT: {html.escape(rut_cliente)}", estilo_tabla_label),
        ])
    if rep_legal_empresa or rep_legal_cliente:
        data_partes.append([
            Paragraph(f"Rep. Legal: {html.escape(rep_legal_empresa)}", estilo_tabla_label),
            Paragraph(f"Rep. Legal: {html.escape(rep_legal_cliente)}", estilo_tabla_label),
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

    # Vigencia
    data_vigencia = [
        [
            Paragraph("<b>Inicio de vigencia</b>", estilo_tabla_label),
            Paragraph("<b>Término de vigencia</b>", estilo_tabla_label),
            Paragraph("<b>Moneda contractual</b>", estilo_tabla_label),
        ],
        [
            Paragraph(fecha_inicio_str, estilo_tabla_celda),
            Paragraph(fecha_fin_str, estilo_tabla_celda),
            Paragraph(html.escape(getattr(contrato, "moneda_cobro", "") or ""), estilo_tabla_celda),
        ],
    ]
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

    # ── Separar secciones: contenido vs firmas ──────────────────────────────
    secciones_list = list(secciones)
    secciones_contenido = []
    secciones_firmas = []
    for seccion in secciones_list:
        tipo = seccion.seccion_plantilla.tipo if seccion.seccion_plantilla else "libre"
        if tipo == "firmas":
            secciones_firmas.append(seccion)
        else:
            secciones_contenido.append(seccion)

    # ── Secciones de la plantilla (sin firmas) ───────────────────────────────
    for seccion in secciones_contenido:
        tipo = seccion.seccion_plantilla.tipo if seccion.seccion_plantilla else "libre"

        if tipo == "encabezado":
            elementos.append(Paragraph(
                _safe_paragraph_text(seccion.titulo),
                estilo_titulo,
            ))
            if seccion.contenido_renderizado.strip():
                elementos.extend(_html_to_flowables(
                    seccion.contenido_renderizado, estilo_parrafo, estilo_bullet
                ))
            elementos.append(Spacer(1, 10))
        else:
            # clausula, condiciones_generales, libre
            if seccion.titulo:
                elementos.append(Paragraph(
                    f"<b>{_safe_paragraph_text(seccion.titulo)}</b>",
                    estilo_subtitulo,
                ))
            elementos.extend(_html_to_flowables(
                seccion.contenido_renderizado, estilo_parrafo, estilo_bullet
            ))
            elementos.append(Spacer(1, 6))

    if not secciones_list:
        elementos.append(Paragraph("(Sin contenido de plantilla)", estilo_parrafo))

    # ── Datos comerciales ────────────────────────────────────────────────────
    moneda = getattr(contrato, "moneda_cobro", "") or "USD"

    def _fmt_moneda(valor):
        """Formatea un valor numérico según la moneda del contrato."""
        try:
            num = float(valor or 0)
        except (TypeError, ValueError):
            return "—"
        if moneda == "CLP":
            return f"${num:,.0f}"
        if moneda == "UF":
            return f"{num:,.2f} UF"
        return f"US${num:,.2f}"

    items_comerciales = list(contrato.items_comerciales.all())
    cotizaciones_vinculadas = list(contrato.cotizaciones_vinculadas.prefetch_related("items").all())
    licencias = list(contrato.contrato_licencias.select_related("licencia").all())
    condiciones = list(contrato.contrato_condiciones_especiales.select_related("condicion").all())
    acuerdos = list(contrato.firmas_confidencialidad.select_related("acuerdo_base").all())

    # ── Servicios contratados ────────────────────────────────────────────────
    if items_comerciales:
        elementos.append(Spacer(1, 14))
        elementos.append(Paragraph("<b>Servicios Contratados</b>", estilo_subtitulo))

        data_items = [
            [
                Paragraph("<b>Servicio</b>", estilo_tabla_celda),
                Paragraph("<b>Cant.</b>", estilo_tabla_celda),
                Paragraph("<b>Visitas/mes</b>", estilo_tabla_celda),
                Paragraph("<b>P. Unitario</b>", estilo_tabla_celda),
                Paragraph("<b>Subtotal</b>", estilo_tabla_celda),
            ]
        ]
        for item in items_comerciales:
            nombre = item.snapshot_nombre or "—"
            subtotal = item.total_para_forma_pago_contractual
            visitas = item.snapshot_num_visitas_mensuales
            data_items.append([
                Paragraph(html.escape(nombre), estilo_tabla_celda),
                Paragraph(str(item.cantidad or 1), estilo_tabla_celda),
                Paragraph(str(visitas) if visitas else "—", estilo_tabla_celda),
                Paragraph(_fmt_moneda(item.precio_unitario_contratado), estilo_tabla_celda),
                Paragraph(_fmt_moneda(subtotal), estilo_tabla_celda),
            ])

            # Alcance (incluye / no incluye)
            alcance_parts = []
            if item.snapshot_incluye and str(item.snapshot_incluye).strip():
                alcance_parts.append(("Incluye", str(item.snapshot_incluye).strip()))
            if item.snapshot_no_incluye and str(item.snapshot_no_incluye).strip():
                alcance_parts.append(("No incluye", str(item.snapshot_no_incluye).strip()))

            if alcance_parts:
                for label, text in alcance_parts:
                    for linea in text.split("\n"):
                        linea = linea.strip()
                        if linea:
                            elementos_extra = Paragraph(
                                f"&nbsp;&nbsp;&nbsp;&nbsp;<i>{html.escape(label)}:</i> {html.escape(linea)}",
                                estilo_bullet,
                            )
                            data_items.append([elementos_extra, "", "", "", ""])

            if item.snapshot_descripcion and str(item.snapshot_descripcion).strip():
                data_items.append(
                    [
                        Paragraph(
                            f"&nbsp;&nbsp;&nbsp;&nbsp;<i>Descripcion:</i> {html.escape(str(item.snapshot_descripcion).strip())}",
                            estilo_bullet,
                        ),
                        "",
                        "",
                        "",
                        "",
                    ]
                )

            if item.tipo_origen == "plan":
                _append_plan_component_rows(data_items, item, estilo_bullet)

        tabla_items = Table(
            data_items,
            colWidths=[2.8 * inch, 0.7 * inch, 0.9 * inch, 1.3 * inch, 1.3 * inch],
        )
        tabla_items.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f4f8")),
            ("GRID", (0, 0), (-1, 0), 0.5, colors.HexColor("#cccccc")),
            ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#cccccc")),
            ("ALIGN", (1, 0), (2, -1), "CENTER"),
            ("ALIGN", (3, 0), (4, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elementos.append(tabla_items)
        elementos.append(Spacer(1, 6))

    if contrato.tipo == "venta" and cotizaciones_vinculadas:
        resumen_venta = construir_resumen_venta_contrato(contrato)
        detalles_por_id = {
            detalle["id"]: detalle for detalle in resumen_venta.get("cotizaciones_detalle", [])
        }
        elementos.append(Spacer(1, 14))
        elementos.append(Paragraph("<b>Cotizaciones Vinculadas</b>", estilo_subtitulo))

        for cotizacion in cotizaciones_vinculadas:
            moneda_cotizacion = normalizar_moneda(cotizacion.tipo_moneda)
            total_cotizacion = cotizacion.calcular_total_estimado
            detalle_cotizacion = detalles_por_id.get(cotizacion.id, {})
            elementos.append(
                Paragraph(
                    (
                        f"<b>Cotizacion #{cotizacion.numero_cotizacion or cotizacion.id}</b> - "
                        f"{_safe_paragraph_text(cotizacion.nombre or '')}"
                    ),
                    estilo_parrafo,
                )
            )
            elementos.append(
                Paragraph(
                    f"Moneda original: {_safe_paragraph_text(moneda_cotizacion)} | Total: {_safe_paragraph_text(str(total_cotizacion))}",
                    estilo_bullet,
                )
            )
            total_convertido = detalle_cotizacion.get("total_convertido")
            dolar_observado = detalle_cotizacion.get("dolar_observado")
            valor_uf = detalle_cotizacion.get("valor_uf")
            if detalle_cotizacion.get("tiene_items_moneda_mixta"):
                monedas_items = ", ".join(detalle_cotizacion.get("monedas_items") or [])
                elementos.append(
                    Paragraph(
                        (
                            "Incluye items convertidos desde monedas distintas "
                            f"({ _safe_paragraph_text(monedas_items) or 'mixtas' })."
                        ),
                        estilo_bullet,
                    )
                )
            if total_convertido is not None:
                elementos.append(
                    Paragraph(
                        (
                            f"Total convertido a {_safe_paragraph_text(moneda)}: "
                            f"{_safe_paragraph_text(str(total_convertido))}"
                        ),
                        estilo_bullet,
                    )
                )
            if dolar_observado is not None:
                elementos.append(
                    Paragraph(
                        f"Dolar observado al cotizar: {_safe_paragraph_text(str(dolar_observado))}",
                        estilo_bullet,
                    )
                )
            if valor_uf is not None:
                elementos.append(
                    Paragraph(
                        f"Valor UF al cotizar: {_safe_paragraph_text(str(valor_uf))}",
                        estilo_bullet,
                    )
                )

            data_cotizacion = [
                [
                    Paragraph("<b>Item</b>", estilo_tabla_celda),
                    Paragraph("<b>Cant.</b>", estilo_tabla_celda),
                    Paragraph("<b>P. Unitario</b>", estilo_tabla_celda),
                    Paragraph("<b>Total</b>", estilo_tabla_celda),
                ]
            ]
            for item in cotizacion.items.all():
                nombre_item = item.item_empresa.nombre if item.item_empresa else item.nombre or "Item"
                data_cotizacion.append(
                    [
                        Paragraph(html.escape(nombre_item), estilo_tabla_celda),
                        Paragraph(str(item.cantidad or 0), estilo_tabla_celda),
                        Paragraph(
                            html.escape(f"{moneda_cotizacion} {item.precio_venta_neta_unitario_moneda_base}"),
                            estilo_tabla_celda,
                        ),
                        Paragraph(
                            html.escape(f"{moneda_cotizacion} {item.precio_venta_neta_total_moneda_base}"),
                            estilo_tabla_celda,
                        ),
                    ]
                )

            tabla_cotizacion = Table(
                data_cotizacion,
                colWidths=[3 * inch, 0.7 * inch, 1.5 * inch, 1.5 * inch],
            )
            tabla_cotizacion.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f4f8")),
                ("GRID", (0, 0), (-1, 0), 0.5, colors.HexColor("#cccccc")),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#cccccc")),
                ("ALIGN", (1, 0), (1, -1), "CENTER"),
                ("ALIGN", (2, 0), (3, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]))
            elementos.append(tabla_cotizacion)
            elementos.append(Spacer(1, 6))

        elementos.append(
            Paragraph(
                f"<b>Total consolidado en {html.escape(moneda)}: {_fmt_moneda(resumen_venta['total_contrato'])}</b>",
                estilo_parrafo,
            )
        )
        forma_pago_venta_label = resumen_venta.get("forma_pago_venta_label") or "Contado"
        elementos.append(
            Paragraph(
                f"Forma de pago venta: {_safe_paragraph_text(forma_pago_venta_label)}",
                estilo_bullet,
            )
        )
        if resumen_venta.get("forma_pago_venta") == "cuotas":
            cuotas_rows = [
                [
                    Paragraph("<b>Cuota</b>", estilo_tabla_celda),
                    Paragraph("<b>%</b>", estilo_tabla_celda),
                    Paragraph("<b>Hito</b>", estilo_tabla_celda),
                    Paragraph("<b>Monto</b>", estilo_tabla_celda),
                ]
            ]
            for cuota in resumen_venta.get("cuotas_venta_resumen") or []:
                cuotas_rows.append(
                    [
                        Paragraph(str(cuota.get("orden") or "1"), estilo_tabla_celda),
                        Paragraph(f"{cuota.get('porcentaje')}%", estilo_tabla_celda),
                        Paragraph(
                            _safe_paragraph_text(
                                cuota.get("hito_pago_label")
                                or cuota.get("hito_pago_descripcion")
                                or "Sin definir"
                            ),
                            estilo_tabla_celda,
                        ),
                        Paragraph(_fmt_moneda(cuota.get("monto")), estilo_tabla_celda),
                    ]
                )
            tabla_cuotas = Table(
                cuotas_rows,
                colWidths=[1.0 * inch, 1.0 * inch, 2.2 * inch, 1.8 * inch],
            )
            tabla_cuotas.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f4f8")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]))
            elementos.append(tabla_cuotas)
        elementos.append(Spacer(1, 6))

    # ── Licencias contratadas ────────────────────────────────────────────────
    if licencias:
        elementos.append(Spacer(1, 14))
        elementos.append(Paragraph("<b>Licencias Contratadas</b>", estilo_subtitulo))

        data_lic = [
            [
                Paragraph("<b>Licencia</b>", estilo_tabla_celda),
                Paragraph("<b>Proveedor</b>", estilo_tabla_celda),
                Paragraph("<b>Modalidad</b>", estilo_tabla_celda),
                Paragraph("<b>Cant.</b>", estilo_tabla_celda),
                Paragraph("<b>P. Unitario</b>", estilo_tabla_celda),
            ]
        ]
        for lic in licencias:
            nombre_lic = lic.licencia.nombre if lic.licencia else "—"
            proveedor = lic.licencia.proveedor if lic.licencia else "—"
            modalidad = lic.get_tipo_modalidad_display()
            moneda_lic = lic.tipo_moneda or moneda
            if moneda_lic == "CLP":
                precio_str = f"${float(lic.precio_unitario or 0):,.0f}"
            elif moneda_lic == "UF":
                precio_str = f"{float(lic.precio_unitario or 0):,.2f} UF"
            else:
                precio_str = f"US${float(lic.precio_unitario or 0):,.2f}"

            data_lic.append([
                Paragraph(html.escape(nombre_lic), estilo_tabla_celda),
                Paragraph(html.escape(proveedor or "—"), estilo_tabla_celda),
                Paragraph(html.escape(modalidad), estilo_tabla_celda),
                Paragraph(str(lic.cantidad or 1), estilo_tabla_celda),
                Paragraph(precio_str, estilo_tabla_celda),
            ])

        tabla_lic = Table(data_lic, colWidths=[2 * inch, 1.5 * inch, 1.3 * inch, 0.7 * inch, 1.2 * inch])
        tabla_lic.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f4f8")),
            ("GRID", (0, 0), (-1, 0), 0.5, colors.HexColor("#cccccc")),
            ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#cccccc")),
            ("ALIGN", (3, 0), (3, -1), "CENTER"),
            ("ALIGN", (4, 0), (4, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elementos.append(tabla_lic)
        elementos.append(Spacer(1, 6))

    # ── Condiciones especiales ───────────────────────────────────────────────
    if condiciones:
        elementos.append(Spacer(1, 14))
        elementos.append(Paragraph("<b>Condiciones Especiales</b>", estilo_subtitulo))

        for cond in condiciones:
            titulo_cond = cond.titulo_personalizado or (cond.condicion.titulo if cond.condicion else "Condición")
            detalle_cond = cond.detalle_personalizado or (cond.condicion.descripcion if cond.condicion else cond.texto or "")
            multa = float(cond.multa_incumplimiento or 0)

            elementos.append(Paragraph(f"<b>{_safe_paragraph_text(titulo_cond)}</b>", estilo_parrafo))
            if detalle_cond:
                elementos.append(Paragraph(_safe_paragraph_text(detalle_cond), estilo_parrafo))
            if multa > 0:
                elementos.append(Paragraph(
                    f"<i>Multa por incumplimiento: {_fmt_moneda(multa)}</i>",
                    estilo_bullet,
                ))
            elementos.append(Spacer(1, 4))

    # ── Resumen comercial ────────────────────────────────────────────────────
    if items_comerciales or (contrato.tipo == "venta" and cotizaciones_vinculadas):
        total_contrato = (
            construir_resumen_venta_contrato(contrato)["total_contrato"]
            if contrato.tipo == "venta"
            else contrato.total_items_comerciales
        )
        if contrato.tipo == "venta":
            forma_label = construir_resumen_venta_contrato(contrato).get(
                "forma_pago_venta_label",
                "Contado",
            )
        else:
            forma_label = getattr(
                contrato,
                "get_forma_pago_contractual_display",
                lambda: contrato.forma_pago_contractual,
            )()

        elementos.append(Spacer(1, 14))
        elementos.append(Paragraph("<b>Resumen Comercial</b>", estilo_subtitulo))

        data_resumen = [
            [
                Paragraph("<b>Moneda</b>", estilo_tabla_celda),
                Paragraph("<b>Forma de Pago</b>", estilo_tabla_celda),
                Paragraph("<b>Total del Contrato</b>", estilo_tabla_celda),
            ],
            [
                Paragraph(html.escape(moneda), estilo_tabla_celda),
                Paragraph(html.escape(forma_label), estilo_tabla_celda),
                Paragraph(f"<b>{_fmt_moneda(total_contrato)}</b>", estilo_tabla_celda),
            ],
        ]
        tabla_resumen = Table(data_resumen, colWidths=[2.33 * inch, 2.33 * inch, 2.34 * inch])
        tabla_resumen.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f4f8")),
            ("BACKGROUND", (2, 1), (2, 1), colors.HexColor("#e8f5e9")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("ALIGN", (2, 1), (2, 1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elementos.append(tabla_resumen)
        elementos.append(Spacer(1, 6))

    # ── Acuerdos de confidencialidad ─────────────────────────────────────────
    if acuerdos:
        elementos.append(Spacer(1, 14))
        elementos.append(Paragraph("<b>Acuerdos de Confidencialidad</b>", estilo_subtitulo))

        for acuerdo in acuerdos:
            titulo_acuerdo = "Acuerdo de Confidencialidad"
            contenido_acuerdo = ""
            if acuerdo.acuerdo_base:
                titulo_acuerdo = acuerdo.acuerdo_base.titulo or titulo_acuerdo
                contenido_acuerdo = acuerdo.acuerdo_base.contenido or ""
            elementos.append(Paragraph(f"<b>{_safe_paragraph_text(titulo_acuerdo)}</b>", estilo_parrafo))
            if contenido_acuerdo:
                elementos.extend(_html_to_flowables(contenido_acuerdo, estilo_parrafo, estilo_bullet))
            elementos.append(Spacer(1, 4))

    # ── Firmas (al final) ────────────────────────────────────────────────────
    for _seccion in secciones_firmas:
        elementos.append(Spacer(1, 24))
        data_firmas = [
            [
                _build_signature_image(firma_empresa_b64),
                _build_signature_image(firma_cliente_b64),
            ],
            [
                Paragraph("<b>__________________________</b>", estilo_tabla_celda),
                Paragraph("<b>__________________________</b>", estilo_tabla_celda),
            ],
            [
                Paragraph("Firma de la Empresa Prestadora", estilo_tabla_celda),
                Paragraph("Firma del Cliente", estilo_tabla_celda),
            ],
            [
                Paragraph(_safe_paragraph_text(nombre_empresa), estilo_tabla_celda),
                Paragraph(_safe_paragraph_text(firmante_cliente or nombre_cliente), estilo_tabla_celda),
            ],
        ]
        tabla_firmas = Table(data_firmas, colWidths=[3 * inch, 3 * inch])
        tabla_firmas.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 18),
        ]))
        elementos.append(tabla_firmas)

    doc.build(elementos)
    buffer.seek(0)
    return buffer.getvalue()


def generar_contrato_en_memoria(nombre_archivo_pdf, datos_cliente, datos_contrato):
    """
    Genera un contrato en PDF con un formato similar al proporcionado,
    usando la librería ReportLab.

    :param nombre_archivo_pdf: Nombre (con ruta) del PDF de salida, ej: "contrato.pdf".
    :param datos_cliente: Diccionario con la información del cliente.
    :param datos_contrato: Diccionario con la información general del contrato.
    """

    # Creamos el buffer en memoria donde se almacenará el PDF
    buffer = BytesIO()

    # ============= ESTILOS =============
    estilos = getSampleStyleSheet()

    # Puedes crear estilos personalizados si quieres más control
    estilo_normal = estilos["Normal"]
    estilo_normal.fontName = 'Times-Roman'
    estilo_normal.fontSize = 10
    estilo_normal.leading = 14  # Espaciado de línea

    estilo_titulo = ParagraphStyle(
        'titulo',
        parent=estilo_normal,
        fontSize=12,
        leading=16,
        alignment=TA_CENTER,
        spaceAfter=10,
        bold=True
    )

    estilo_subtitulo = ParagraphStyle(
        'subtitulo',
        parent=estilo_normal,
        fontSize=11,
        leading=14,
        alignment=TA_CENTER,
        spaceAfter=8,
        bold=True
    )

    estilo_parrafo = ParagraphStyle(
        'parrafo',
        parent=estilo_normal,
        alignment=TA_JUSTIFY,
        firstLineIndent=20,
        spaceAfter=8
    )

    estilo_tabla_encabezado = ParagraphStyle(
        'tabla_encabezado',
        parent=estilo_normal,
        alignment=TA_CENTER,
        fontSize=10,
        bold=True
    )

    estilo_tabla_celda = ParagraphStyle(
        'tabla_celda',
        parent=estilo_normal,
        alignment=TA_LEFT,
        fontSize=10
    )

    # ============= CREACIÓN DEL DOCUMENTO =============
    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        rightMargin=50,
        leftMargin=50,
        topMargin=50,
        bottomMargin=50
    )

    elementos = []

    # ============= ENCABEZADO =============
    titulo = Paragraph("CONTRATO DE SERVICIOS TECNOLÓGICOS Y ASESORÍAS", estilo_titulo)
    elementos.append(titulo)

    subtitulo = Paragraph(f"Fecha: {datos_contrato['fecha']}", estilo_subtitulo)
    elementos.append(subtitulo)

    # Puedes poner aquí datos de la empresa proveedora
    introduccion_proveedor = Paragraph(
        f"""Entre <b>{datos_contrato['proveedor_razon_social']}</b> R.U.T. {datos_contrato['proveedor_rut']}, 
        domiciliada en {datos_contrato['proveedor_direccion']}, representada por 
        Don <b>{datos_contrato['proveedor_representante']}</b>, por una parte, 
        y el cliente individualizado a continuación, por otra parte:""",
        estilo_parrafo
    )
    elementos.append(introduccion_proveedor)
    elementos.append(Spacer(1, 12))

    # ============= DATOS DEL CLIENTE =============
    # Se puede usar una tabla para presentar la información de forma ordenada
    data_cliente = [
        [Paragraph("<b>1.- IDENTIFICACIÓN DEL CLIENTE</b>", estilo_tabla_encabezado), ""],
        ["Nombre o Razón Social:", Paragraph(datos_cliente['razon_social'], estilo_tabla_celda)],
        ["R.U.T:", Paragraph(datos_cliente['rut'], estilo_tabla_celda)],
        ["Domicilio:", Paragraph(datos_cliente['domicilio'], estilo_tabla_celda)],
        ["Giro o actividad:", Paragraph(datos_cliente['giro'], estilo_tabla_celda)],
        ["Representante legal:", Paragraph(datos_cliente['representante_legal'], estilo_tabla_celda)],
        ["R.U.T Rep. Legal:", Paragraph(datos_cliente['rut_representante_legal'], estilo_tabla_celda)],
        ["Fono:", Paragraph(datos_cliente['fono'], estilo_tabla_celda)],
        ["Email:", Paragraph(datos_cliente['email'], estilo_tabla_celda)]
    ]

    tabla_cliente = Table(data_cliente, colWidths=[2.5*inch, 3.5*inch])
    tabla_cliente.setStyle(TableStyle([
        ('SPAN', (0,0), (1,0)),               # Encabezado en la primera fila
        ('BACKGROUND', (0,0), (1,0), colors.lightgrey),
        ('ALIGN', (0,0), (1,0), 'CENTER'),
        ('VALIGN', (0,0), (1,0), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 1, colors.black),
        ('GRID', (0,1), (-1,-1), 0.5, colors.grey),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))

    elementos.append(tabla_cliente)
    elementos.append(Spacer(1, 12))

    # ============= VALORES Y PLAN =============
    valores_html = f"""
        <b>2.- TIPO DE PLAN Y VALORES</b><br/>
        Asesoría externa tecnológica en sistemas e infraestructura, incluye:<br/>
        {_safe_paragraph_text(datos_contrato['descripcion_plan'])}<br/><br/>
        <b>Valor fijo por asesoría mensual:</b> ${datos_contrato['valor_mensual']}<br/>
        Factura exenta por servicios.<br/><br/>
    """
    valores_parrafo = Paragraph(valores_html, estilo_parrafo)
    elementos.append(valores_parrafo)

    # ============= CLAUSULAS / DESCRIPCIÓN =============
    clausulas_html = f"""
        <b>3.- DESCRIPCIÓN DETALLADA DE ASESORÍA</b><br/>
        {_safe_paragraph_text(datos_contrato['descripcion_asesoria'])}<br/><br/>

        <b>4.- FORMA Y FECHA DE PAGO</b><br/>
        {_safe_paragraph_text(datos_contrato['forma_pago'])}<br/><br/>

        <b>5.- CONDICIONES GENERALES</b><br/>
        {_safe_paragraph_text(datos_contrato['condiciones_generales'])}<br/><br/>
    """
    clausulas_parrafo = Paragraph(clausulas_html, estilo_parrafo)
    elementos.append(clausulas_parrafo)

    # Agregamos un salto de página si lo deseas
    elementos.append(PageBreak())

    # ============= LISTA DE TAREAS EJEMPLO =============
    # Si tienes una lista de tareas detalladas, puedes formatearla como viñetas, tablas, etc.
    tareas_encabezado = Paragraph("<b>Detalle de servicios y plan contratado</b>", estilo_parrafo)
    elementos.append(tareas_encabezado)
    elementos.append(Spacer(1, 6))

    # Para simplicidad, generamos párrafos con cada tarea. Podrías usar tablas anidadas u otro estilo.
    for tarea in datos_contrato['lista_tareas']:
        elementos.append(Paragraph(f"- {_safe_paragraph_text(tarea)}", estilo_parrafo))

    elementos.append(Spacer(1, 12))

    acuerdos_confidencialidad = datos_contrato.get('acuerdos_confidencialidad') or []
    if acuerdos_confidencialidad:
        elementos.append(PageBreak())
        elementos.append(
            Paragraph("<b>6.- ACUERDO DE CONFIDENCIALIDAD</b>", estilo_parrafo),
        )
        elementos.append(Spacer(1, 6))
        for index, acuerdo in enumerate(acuerdos_confidencialidad, start=1):
            titulo = _safe_paragraph_text(acuerdo.get('titulo'))
            contenido = _safe_paragraph_text(acuerdo.get('contenido'))
            elementos.append(
                Paragraph(
                    f"<b>{index}. {titulo}</b><br/>{contenido}",
                    estilo_parrafo,
                ),
            )
            elementos.append(Spacer(1, 6))

    # ============= FIRMAS =============
    # Tabla para firmas
    data_firmas = [
        [
            _build_signature_image(datos_contrato.get('firma_cliente_b64')),
            _build_signature_image(datos_contrato.get('firma_empresa_b64')),
        ],
        [
            Paragraph("<b>__________________________</b>", estilo_tabla_celda),
            Paragraph("<b>__________________________</b>", estilo_tabla_celda),
        ],
        [
            Paragraph("Firma y Timbre del Cliente", estilo_tabla_celda),
            Paragraph("Firma de la Empresa Prestadora", estilo_tabla_celda),
        ],
        [
            Paragraph(
                _safe_paragraph_text(datos_contrato.get('cliente_firmante', '')),
                estilo_tabla_celda,
            ),
            Paragraph(
                _safe_paragraph_text(datos_contrato['proveedor_representante']),
                estilo_tabla_celda,
            ),
        ],
    ]

    tabla_firmas = Table(data_firmas, colWidths=[3*inch, 3*inch])
    tabla_firmas.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 18),
    ]))

    elementos.append(tabla_firmas)

    # Crea el PDF en el buffer
    doc.build(elementos)

    # Regresar a la posición inicial para que getvalue() lea todo
    buffer.seek(0)
    return buffer.getvalue()

# if __name__ == "__main__":

#     # Diccionario de datos del cliente (ejemplo)
#     datos_cliente = {
#         'razon_social': 'RSM Chile Auditores',
#         'rut': '76.073.255-9',
#         'domicilio': 'APOQUINDO 3650 703',
#         'giro': 'Actividades de contabilidad, teneduría de libros',
#         'representante_legal': 'Fernando Landa',
#         'rut_representante_legal': '11.111.111-1',
#         'fono': '(56-2) 25072788',
#         'email': 'fernando.landa@rsmchile.com'
#     }

#     # Diccionario de datos generales del contrato (ejemplo)
#     datos_contrato = {
#         'fecha': '01 de junio del 2017',
#         'proveedor_razon_social': 'Consultora Aguilera Rojas y Asociados Ltda. (Grupo AyG)',
#         'proveedor_rut': '76.365.641-1',
#         'proveedor_direccion': 'Gaspar de Soto #539, San Miguel',
#         'proveedor_representante': 'Luis Alberto Rojas Molina (Rut 15.890.661-9)',
#         'descripcion_plan': 'Implementación de proyecto tecnológico en base a IRS 1075, con lista de tareas expresada a un año.',
#         'valor_mensual': '850.000',
#         'descripcion_asesoria': """La asesoría externa se realizará en base al proyecto presentado... 
#             (aquí incluyes el detalle textual que necesites)""",
#         'forma_pago': "PAGOS A MES VENCIDO, PLAZO MÁXIMO LOS 10 PRIMEROS DÍAS CORRIDOS DE CADA MES",
#         'condiciones_generales': """(Aquí van las cláusulas y condiciones generales que tengas, 
#         puedes copiar y pegar desde tu documento original, adaptándolo)""",
#         'lista_tareas': [
#             "Implementación de NAS y gestión de respaldos",
#             "Instalación de antivirus corporativo",
#             "Cambio de servidor de correos a Office 365",
#             "Blindaje de red corporativa",
#             "Redundancia de sistemas",
#             "Procedimientos y planes de recuperación",
#             # etc...
#         ]
#     }

#     pdf_buffer = generar_contrato_en_memoria(datos_cliente, datos_contrato)
#     print("Contrato PDF generado exitosamente.")
