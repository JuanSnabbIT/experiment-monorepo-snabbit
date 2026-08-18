import base64
import binascii
import html
from html.parser import HTMLParser
from io import BytesIO

from reportlab.pdfgen import canvas as rl_canvas
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
from reportlab.lib.units import inch, cm

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


def _build_logo_image(empresa):
    """Retorna una Image de ReportLab con el logo de la empresa o None si no hay logo."""
    from core.pdf.canvas_utils import get_logo_empresa_b64

    logo_b64 = get_logo_empresa_b64(empresa)
    if not logo_b64:
        return None
    try:
        raw = logo_b64.split(",", 1)[1] if "," in logo_b64 else logo_b64
        img = Image(BytesIO(base64.b64decode(raw)))
        img.drawWidth = 1.5 * inch
        img.drawHeight = 0.6 * inch
        img.hAlign = "LEFT"
        return img
    except Exception:
        return None


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


def _make_contract_canvas_class(config: dict):
    """
    Retorna una clase Canvas con header, footer y watermark BORRADOR.

    config keys:
        nombre_empresa (str): Nombre de la empresa prestadora.
        nombre_contrato (str): Nombre del contrato (para el footer).
        es_borrador (bool): Si True, agrega marca de agua diagonal "BORRADOR".
    """

    class _ContractCanvas(rl_canvas.Canvas):
        def __init__(self, *args, **kwargs):
            rl_canvas.Canvas.__init__(self, *args, **kwargs)
            self._saved_page_states = []

        def showPage(self):
            self._saved_page_states.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            num_pages = len(self._saved_page_states)
            for state in self._saved_page_states:
                self.__dict__.update(state)
                self._draw_page_elements(num_pages)
                rl_canvas.Canvas.showPage(self)
            rl_canvas.Canvas.save(self)

        def _draw_page_elements(self, page_count):
            self.saveState()
            width, height = LETTER

            # ── Marca de agua BORRADOR ───────────────────────────────────────
            if config.get("es_borrador"):
                self.translate(width / 2, height / 2)
                self.rotate(45)
                self.setFont("Times-Bold", 80)
                self.setFillGray(0.70)
                self.setFillAlpha(0.20)
                self.drawCentredString(0, 0, "BORRADOR")
                self.restoreState()
                self.saveState()

            # ── Cabecera (header) ────────────────────────────────────────────
            header_y = height - 36
            self.setFont("Times-Bold", 9)
            self.setFillGray(0.3)
            self.drawString(54, header_y, html.unescape(config.get("nombre_empresa", "")))
            self.setFont("Times-Roman", 8)
            self.setFillGray(0.5)
            nombre_contrato = config.get("nombre_contrato", "")
            self.drawRightString(width - 54, header_y, nombre_contrato[:60])

            # Línea separadora del header
            self.setStrokeGray(0.7)
            self.setLineWidth(0.5)
            self.line(54, header_y - 5, width - 54, header_y - 5)

            # ── Pie de página (footer) ───────────────────────────────────────
            footer_y = 24
            current_page = len(self._saved_page_states)
            self.setFont("Times-Roman", 8)
            self.setFillGray(0.5)
            self.drawCentredString(
                width / 2, footer_y, f"Página {current_page} de {page_count}"
            )

            self.restoreState()

    return _ContractCanvas


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
