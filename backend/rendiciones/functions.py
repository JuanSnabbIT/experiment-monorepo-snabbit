from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.platypus import Table, TableStyle
from reportlab.lib import colors
from textwrap import wrap

def generar_rendicion_pdf(nombre_empresa, rut_empresa, direccion_empresa, telefono_empresa, 
                          email_empresa, sitio_web_empresa, fecha_rendicion, id_rendicion, 
                          usuario_empresa, rendicion, datos_tabla, buffer):
    """
    Genera un PDF de rendición.
    
    Parámetros:
      - nombre_empresa, rut_empresa, direccion_empresa, telefono_empresa, email_empresa, sitio_web_empresa:
          Datos de la empresa.
      - fecha_rendicion: Fecha de la rendición.
      - id_rendicion: Código o identificador de la rendición.
      - usuario_empresa: Instancia del modelo UsuarioEmpresa (quien realizó la rendición).
      - rendicion: Instancia del modelo Rendicion (para obtener observaciones y total).
      - datos_tabla: Lista de listas con los datos de los detalles de gastos. Ejemplo:
            [
              ["Categoría", "Detalle", "Cantidad", "Monto Unitario", "Monto Total", "Fecha Gasto"],
              ["Transporte", "Taxi al aeropuerto", "1", "15.00", "15.00", "2025-02-10"],
              ...
            ]
      - buffer: Objeto tipo BytesIO donde se guardará el PDF.
    """
    # Crear PDF y definir márgenes
    pdf = canvas.Canvas(buffer, pagesize=letter)
    ancho, alto = letter
    margen_x = 30
    margen_y = 30
    y_pos = alto - margen_y

    # Encabezado de la empresa (lado izquierdo)
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(margen_x, y_pos, nombre_empresa)
    y_pos -= 25

    pdf.setFont("Helvetica", 10)
    if rut_empresa:
        pdf.drawString(margen_x, y_pos, f"RUT: {rut_empresa}")
        y_pos -= 15
    if direccion_empresa:
        pdf.drawString(margen_x, y_pos, direccion_empresa)
        y_pos -= 15
    if telefono_empresa:
        pdf.drawString(margen_x, y_pos, f"Teléfono: {telefono_empresa}")
        y_pos -= 15
    if email_empresa:
        pdf.drawString(margen_x, y_pos, f"Correo: {email_empresa}")
        y_pos -= 15
    if sitio_web_empresa:
        pdf.drawString(margen_x, y_pos, f"Sitio Web: {sitio_web_empresa}")
        y_pos -= 15

    # Encabezado derecho: Datos de la rendición
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(ancho - margen_x - 200, alto - margen_y, "RENDICIÓN")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(ancho - margen_x - 200, alto - margen_y - 20, f"Fecha: {fecha_rendicion}")
    pdf.drawString(ancho - margen_x - 200, alto - margen_y - 35, f"Código: {id_rendicion}")

    # Línea divisoria
    pdf.line(margen_x, y_pos - 10, ancho - margen_x, y_pos - 10)
    y_pos -= 30

    # Información del usuario (quien realizó la rendición)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(margen_x, y_pos, "Usuario:")
    y_pos -= 15

    pdf.setFont("Helvetica", 10)
    # Se asume que el modelo UsuarioEmpresa tiene un atributo "usuario" que es instancia de User
    full_name = usuario_empresa.usuario.get_nombre_completo() if hasattr(usuario_empresa, 'usuario') else ""
    pdf.drawString(margen_x, y_pos, full_name)
    y_pos -= 15
    if usuario_empresa.usuario.email:
        pdf.drawString(margen_x, y_pos, f"Correo: {usuario_empresa.usuario.email}")
        y_pos -= 15
    # Si deseas mostrar la sucursal u otro dato adicional:
    if usuario_empresa.sucursal:
        pdf.drawString(margen_x, y_pos, f"Sucursal: {usuario_empresa.sucursal}")
        y_pos -= 15

    # Nueva línea divisoria
    pdf.line(margen_x, y_pos - 10, ancho - margen_x, y_pos - 10)
    y_pos -= 30

    # Creación de la tabla de detalles de gastos
    ancho_tabla = ancho - (2 * margen_x)
    colWidths = [
        0.15 * ancho_tabla,  # Categoría
        0.25 * ancho_tabla,  # Detalle
        0.10 * ancho_tabla,  # Cantidad
        0.15 * ancho_tabla,  # Monto Unitario
        0.15 * ancho_tabla,  # Monto Total
        0.20 * ancho_tabla   # Fecha Gasto
    ]
    tabla = Table(datos_tabla, colWidths=colWidths)
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003366")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
    ]))
    table_width, table_height = tabla.wrap(0, 0)
    table_position_y = y_pos - table_height - 40
    tabla.drawOn(pdf, margen_x, table_position_y)

    # Totales (por ejemplo, el total de la rendición)
    totals_position_y = table_position_y - 40
    pdf.setFont("Helvetica-Bold", 10)
    right_margin = ancho - margen_x
    pdf.drawRightString(right_margin, totals_position_y, f"TOTAL RENDICIÓN: ${rendicion.total_rendicion}")

    # Observaciones (comentarios o instrucciones)
    comments_position_y = totals_position_y - 60
    pdf.setFont("Helvetica", 10)
    pdf.drawString(margen_x, comments_position_y, "Observaciones:")
    pdf.rect(margen_x, comments_position_y - 50, ancho - margen_x * 2, 40)
    wrapped_text = pdf.beginText(margen_x + 10, comments_position_y - 25)
    wrapped_text.setFont("Helvetica", 10)
    max_width = ancho - margen_x * 2 - 20
    for line in wrap(rendicion.observaciones or "", width=int(max_width / 6)):
        wrapped_text.textLine(line)
    pdf.drawText(wrapped_text)

    # Finalizar y guardar el PDF en el buffer
    pdf.save()
    buffer.seek(0)
