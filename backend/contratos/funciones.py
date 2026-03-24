import base64
import binascii
import html
from io import BytesIO

from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib import colors
from reportlab.lib.units import inch


def _safe_paragraph_text(value):
    return html.escape((value or "")).replace("\n", "<br/>")


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


def generar_contrato_desde_plantilla(
    contrato,
    *,
    firma_cliente_b64=None,
    firmante_cliente="",
):
    """
    Genera PDF de contrato a partir de sus SeccionContratoGenerada.

    Cada sección se renderiza según su tipo (vía seccion_plantilla.tipo):
      - encabezado → título centrado
      - clausula / condiciones_generales / libre → título + párrafo justificado
      - firmas → bloque de firmas (se replica en cada sección de este tipo)

    Retorna bytes del PDF.
    """
    secciones = contrato.secciones_generadas.select_related("seccion_plantilla").order_by("orden")

    firma_empresa_b64 = None
    if contrato.empresa_prestadora:
        firma_empresa_b64 = contrato.empresa_prestadora.firma_empresa

    representante = ""
    if contrato.empresa_prestadora:
        representante = contrato.empresa_prestadora.nombre or ""

    buffer = BytesIO()

    estilos = getSampleStyleSheet()
    estilo_normal = estilos["Normal"]
    estilo_normal.fontName = "Times-Roman"
    estilo_normal.fontSize = 10
    estilo_normal.leading = 14

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

    estilo_tabla_celda = ParagraphStyle(
        "tabla_celda_plantilla",
        parent=estilo_normal,
        alignment=TA_LEFT,
        fontSize=10,
    )

    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        rightMargin=50,
        leftMargin=50,
        topMargin=50,
        bottomMargin=50,
    )

    elementos = []

    for seccion in secciones:
        tipo = seccion.seccion_plantilla.tipo if seccion.seccion_plantilla else "libre"

        if tipo == "encabezado":
            elementos.append(Paragraph(
                _safe_paragraph_text(seccion.titulo),
                estilo_titulo,
            ))
            if seccion.contenido_renderizado.strip():
                elementos.append(Paragraph(
                    _safe_paragraph_text(seccion.contenido_renderizado),
                    estilo_parrafo,
                ))
            elementos.append(Spacer(1, 12))

        elif tipo == "firmas":
            elementos.append(Spacer(1, 24))
            data_firmas = [
                [
                    _build_signature_image(firma_cliente_b64),
                    _build_signature_image(firma_empresa_b64),
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
                    Paragraph(_safe_paragraph_text(firmante_cliente), estilo_tabla_celda),
                    Paragraph(_safe_paragraph_text(representante), estilo_tabla_celda),
                ],
            ]
            tabla_firmas = Table(data_firmas, colWidths=[3 * inch, 3 * inch])
            tabla_firmas.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 18),
            ]))
            elementos.append(tabla_firmas)

        else:
            # clausula, condiciones_generales, libre
            elementos.append(Paragraph(
                f"<b>{_safe_paragraph_text(seccion.titulo)}</b>",
                estilo_subtitulo,
            ))
            elementos.append(Paragraph(
                _safe_paragraph_text(seccion.contenido_renderizado),
                estilo_parrafo,
            ))
            elementos.append(Spacer(1, 6))

    if not elementos:
        elementos.append(Paragraph("(Sin contenido de plantilla)", estilo_parrafo))

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
    tareas_encabezado = Paragraph("<b>Lista de Tareas Extendida del Proyecto</b>", estilo_parrafo)
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
