from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

# --- COLOR PALETTE (Based on Cotizaciones) ---
BRAND_BLUE = colors.HexColor("#003366")    # Legacy Blue (kept for compatibility)
ACTION_BLUE = colors.HexColor("#3b82f6")   # Links / En Proceso
SUCCESS_GREEN = colors.HexColor("#10b981") # Completada
ALERT_RED = colors.HexColor("#ef4444")     # Cancelada / Errors
LIGHT_GRAY = colors.whitesmoke             # Table Alternates
TEXT_DARK = colors.black                   # Main Text
TEXT_GRAY = colors.HexColor("#404040")     # Labels (Darkened from #6b7280 for better visibility)

# --- FONTS ---
# Helvetica is standard for PDF compatibility
FONT_BOLD = "Helvetica-Bold"
FONT_NORMAL = "Helvetica"

FONTS = {
    "fecha": ("Helvetica", 9),
    "titulo": ("Helvetica-Bold", 14),
    "datos_label": ("Helvetica-Bold", 10),
    "datos": ("Helvetica", 10),
    "introduccion": ("Helvetica", 10),
    "fijo": ("Helvetica-Oblique", 9),
    "cierre": ("Helvetica", 10),
    "firma_label": ("Helvetica-Bold", 10),
    "firma": ("Helvetica", 10),
    "firma_cargo": ("Helvetica", 9),
    "footer": ("Helvetica", 8),
}

MESES_ES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
]

INTRO_STYLE = ParagraphStyle(
    "intro", fontName="Helvetica", fontSize=10, leading=12
)

FOOTER_STYLE = ParagraphStyle(
    "footer", fontName="Helvetica", fontSize=8, leading=10, alignment=1
)

CELL_STYLE = ParagraphStyle(
    "cell", fontName="Helvetica", fontSize=10, leading=12
)

# --- STYLES ---
def get_pdf_styles():
    """
    Returns a dictionary of standard ParagraphStyles for the system.
    """
    styles = getSampleStyleSheet()
    
    # 1. Document Title (legacy cotizaciones)
    styles.add(ParagraphStyle(
        name="DocTitle",
        parent=styles["Heading1"],
        fontName=FONT_BOLD,
        fontSize=14,
        textColor=TEXT_DARK,
        alignment=TA_CENTER,
        spaceAfter=10,
    ))

    # 2. Module Title (simple, legacy-friendly)
    styles.add(ParagraphStyle(
        name="ModuleTitle",
        parent=styles["Heading1"],
        fontName=FONT_BOLD,
        fontSize=12,
        textColor=TEXT_DARK,
        alignment=TA_CENTER,
        spaceBefore=10,
        spaceAfter=10,
    ))

    # 3. Section Head (Subtitles within a module)
    styles.add(ParagraphStyle(
        name="SectionHead",
        parent=styles["Heading2"],
        fontName=FONT_BOLD,
        fontSize=10,
        textColor=TEXT_DARK,
        spaceBefore=12,
        spaceAfter=6,
    ))

    # 4. Standard Body Text
    if "BodyText" in styles:
        styles["BodyText"].fontName = FONT_NORMAL
        styles["BodyText"].fontSize = 10
        styles["BodyText"].textColor = TEXT_DARK
        styles["BodyText"].leading = 12
    else:
        styles.add(ParagraphStyle(
            name="BodyText",
            parent=styles["Normal"],
            fontName=FONT_NORMAL,
            fontSize=10,
            textColor=TEXT_DARK,
            leading=12,
        ))

    # 5. Table Label (Bold metadata keys)
    styles.add(ParagraphStyle(
        name="Label",
        parent=styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=10,
        textColor=TEXT_DARK,
        leading=12,
    ))

    # 6. Table Cell Data
    styles.add(ParagraphStyle(
        name="Data",
        parent=styles["Normal"],
        fontName=FONT_NORMAL,
        fontSize=10,
        textColor=TEXT_DARK,
        leading=12,
    ))

    # 7. Small Print / Fixed Text (legacy)
    styles.add(ParagraphStyle(
        name="SmallPrint",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9,
        textColor=TEXT_DARK,
        leading=11,
    ))

    # 8. Footer (legacy)
    styles.add(ParagraphStyle(
        name="Footer",
        parent=styles["Normal"],
        fontName=FONT_NORMAL,
        fontSize=8,
        textColor=TEXT_DARK,
        alignment=TA_CENTER,
        leading=10,
    ))

    # 9. Right Aligned Data (e.g. Status)
    styles.add(ParagraphStyle(
        name="DataRight",
        parent=styles["Normal"],
        fontName=FONT_NORMAL,
        fontSize=10,
        textColor=TEXT_DARK,
        alignment=TA_RIGHT,
    ))

    return styles

def success_color_by_state(estado):
    """
    Returns the appropriate color object based on the state string.
    """
    if estado in ["completada", "pagada", "aceptada", "facturada"]:
        return SUCCESS_GREEN
    elif estado in ["cancelada", "rechazada"]:
        return ALERT_RED
    elif estado in ["en_proceso", "enviada"]:
        return ACTION_BLUE
    return TEXT_GRAY
