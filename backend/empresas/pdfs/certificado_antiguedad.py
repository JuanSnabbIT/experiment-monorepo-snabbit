from textwrap import wrap

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from core.pdf.canvas_utils import draw_logo, draw_paginacion, get_logo_empresa_b64
from core.pdf.styles import FONTS, MESES_ES


def generar_certificado_antiguedad_pdf(usuario_empresa, buffer):
    """
    Genera el PDF de Certificado de Antigüedad Laboral para un UsuarioEmpresa.
    El buffer debe ser un BytesIO ya abierto; se posiciona al inicio al terminar.
    """
    pdf = canvas.Canvas(buffer, pagesize=A4)
    ancho, alto = A4
    margen_x = 50
    margen_y = 40
    y_pos = alto - margen_y

    empresa = usuario_empresa.sucursal.empresa if usuario_empresa.sucursal else None
    nombre_empresa = empresa.nombre if empresa else ""
    rut_empresa = empresa.rut_empresa or "" if empresa else ""
    direccion_empresa = empresa.direccion_principal or "" if empresa else ""
    representante_legal = empresa.representante_legal or "" if empresa else ""
    rut_representante = empresa.rut_representante or "" if empresa else ""

    nombre_trabajador = usuario_empresa.usuario.get_nombre_completo()
    rut_trabajador = usuario_empresa.rut or ""
    cargo = usuario_empresa.cargo or "trabajador/a"

    antiguedad = usuario_empresa.calcular_dias_desde_contratacion()
    años = antiguedad["años"]
    meses = antiguedad["meses"]
    dias = antiguedad["dias"]
    fecha_inicio = usuario_empresa.get_fecha_inicio_laboral()

    from datetime import date
    hoy = date.today()
    fecha_emision = f"{hoy.day} de {MESES_ES[hoy.month - 1]} de {hoy.year}"

    # ── Logo empresa ──────────────────────────────────────────────────────────
    logo_b64 = get_logo_empresa_b64(empresa) if empresa else None
    if logo_b64:
        draw_logo(pdf, logo_b64, ancho, alto, margen_x, margen_y)

    # ── Encabezado empresa ────────────────────────────────────────────────────
    pdf.setFont(*FONTS["titulo"])
    pdf.drawString(margen_x, y_pos, nombre_empresa)
    y_pos -= 18

    pdf.setFont(*FONTS["fecha"])
    if rut_empresa:
        pdf.drawString(margen_x, y_pos, f"RUT: {rut_empresa}")
        y_pos -= 13
    if direccion_empresa:
        pdf.drawString(margen_x, y_pos, direccion_empresa)
        y_pos -= 13

    # ── Línea divisoria ───────────────────────────────────────────────────────
    y_pos -= 8
    pdf.setStrokeColor(colors.HexColor("#003366"))
    pdf.setLineWidth(1.5)
    pdf.line(margen_x, y_pos, ancho - margen_x, y_pos)
    y_pos -= 30

    # ── Título ────────────────────────────────────────────────────────────────
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawCentredString(ancho / 2, y_pos, "CERTIFICADO DE ANTIGÜEDAD LABORAL")
    y_pos -= 40

    # ── Cuerpo del certificado ────────────────────────────────────────────────
    pdf.setFont(*FONTS["datos"])
    ancho_texto = ancho - 2 * margen_x
    chars_por_linea = int(ancho_texto / 5.8)  # 5.8 pts/char ajustado para A4

    def escribir_parrafo(texto, indent=0):
        nonlocal y_pos
        lineas = wrap(texto, width=chars_por_linea - indent)
        for i, linea in enumerate(lineas):
            x = margen_x + (indent * 5.8 if i == 0 else 0)
            pdf.drawString(x, y_pos, linea)
            y_pos -= 16

    # Párrafo declarativo de la empresa
    parrafo_empresa = (
        f"{nombre_empresa}"
        + (f", RUT {rut_empresa}," if rut_empresa else ",")
        + (f" con domicilio en {direccion_empresa}," if direccion_empresa else "")
        + (f" representada legalmente por {representante_legal}" if representante_legal else "")
        + (f", RUT {rut_representante}," if rut_representante else "")
    )
    escribir_parrafo(parrafo_empresa)
    y_pos -= 8

    # Título CERTIFICA
    pdf.setFont(*FONTS["datos_label"])
    pdf.drawString(margen_x, y_pos, "CERTIFICA:")
    y_pos -= 22
    pdf.setFont(*FONTS["datos"])

    # Párrafo central
    fecha_inicio_str = (
        fecha_inicio.strftime("%d/%m/%Y") if fecha_inicio else "fecha no registrada"
    )
    antiguedad_texto = f"{años} año{'s' if años != 1 else ''}"
    if meses:
        antiguedad_texto += f", {meses} mes{'es' if meses != 1 else ''}"
    if dias:
        antiguedad_texto += f" y {dias} día{'s' if dias != 1 else ''}"

    parrafo_cert = (
        f"Que don/doña {nombre_trabajador}"
        + (f", RUT {rut_trabajador}," if rut_trabajador else ",")
        + f" se desempeña en el cargo de {cargo} en esta empresa"
        + f" desde el {fecha_inicio_str},"
        + f" acumulando una antigüedad de {antiguedad_texto} a la fecha."
    )
    escribir_parrafo(parrafo_cert)
    y_pos -= 16

    # Fórmula de cierre
    escribir_parrafo(
        "Se extiende el presente certificado a petición del interesado, "
        "para los fines que estime conveniente."
    )
    y_pos -= 30

    # Lugar y fecha
    pdf.setFont(*FONTS["datos"])
    pdf.drawString(margen_x, y_pos, f"{nombre_empresa}, {fecha_emision}")
    y_pos -= 60

    # ── Firma representante ───────────────────────────────────────────────────
    firma_x = margen_x + 30
    pdf.setLineWidth(1)
    pdf.setStrokeColor(colors.black)
    pdf.line(firma_x, y_pos, firma_x + 200, y_pos)
    y_pos -= 14

    pdf.setFont(*FONTS["firma_label"])
    if representante_legal:
        pdf.drawString(firma_x, y_pos, representante_legal)
        y_pos -= 13
    pdf.setFont(*FONTS["firma_cargo"])
    pdf.drawString(firma_x, y_pos, "Representante Legal")

    # ── Paginación ────────────────────────────────────────────────────────────
    draw_paginacion(pdf, ancho, margen_x, margen_y)

    pdf.save()
    buffer.seek(0)
