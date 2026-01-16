from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

# --- COLOR PALETTE (Based on Cotizaciones) ---
BRAND_BLUE = colors.HexColor("#003366")    # Cotizaciones Header Background
ACTION_BLUE = colors.HexColor("#3b82f6")   # Links / En Proceso
SUCCESS_GREEN = colors.HexColor("#10b981") # Completada
ALERT_RED = colors.HexColor("#ef4444")     # Cancelada / Errors
LIGHT_GRAY = colors.whitesmoke             # Table Alternates
TEXT_DARK = colors.black                   # Main Text
TEXT_GRAY = colors.HexColor("#6b7280")     # Labels

# --- FONTS ---
# Helvetica is standard for PDF compatibility
FONT_BOLD = "Helvetica-Bold"
FONT_NORMAL = "Helvetica"

# --- STYLES ---
def get_pdf_styles():
    """
    Returns a dictionary of standard ParagraphStyles for the system.
    """
    styles = getSampleStyleSheet()
    
    # 1. Document Title (e.g., "ORDEN DE TRABAJO")
    styles.add(ParagraphStyle(
        name="DocTitle",
        parent=styles["Heading1"],
        fontName=FONT_BOLD,
        fontSize=18,
        textColor=BRAND_BLUE,
        alignment=TA_CENTER,
        spaceAfter=15,
    ))

    # 2. Module Title (Section Headers with Background)
    styles.add(ParagraphStyle(
        name="ModuleTitle",
        parent=styles["Heading1"],
        fontName=FONT_BOLD,
        fontSize=14,
        textColor=colors.white,
        backColor=BRAND_BLUE,
        alignment=TA_CENTER,
        spaceBefore=10,
        spaceAfter=10,
        borderPadding=6,
    ))

    # 3. Section Head (Subtitles within a module)
    styles.add(ParagraphStyle(
        name="SectionHead",
        parent=styles["Heading2"],
        fontName=FONT_BOLD,
        fontSize=14,
        textColor=BRAND_BLUE,
        spaceBefore=12,
        spaceAfter=6,
    ))

    # 4. Standard Body Text
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

    # 7. Small Print / Footer
    styles.add(ParagraphStyle(
        name="SmallPrint",
        parent=styles["Normal"],
        fontName=FONT_NORMAL,
        fontSize=8,
        textColor=TEXT_GRAY,
        leading=10,
    ))

    # 8. Right Aligned Data (e.g. Status)
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
