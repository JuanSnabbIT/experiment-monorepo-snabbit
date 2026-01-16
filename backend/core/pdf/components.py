import os
from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import Table, TableStyle, Image, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from .styles import get_pdf_styles, BRAND_BLUE, TEXT_GRAY, TEXT_DARK, LIGHT_GRAY

# --- CONSTANTS ---
LOGO_PATH = os.path.join(settings.BASE_DIR, "static", "img", "logo_sn.png")

def draw_header(canvas, doc):
    """
    Callback function to draw the standard Header on each page.
    Note: For SimpleDocTemplate, this is usually called via onFirstPage or onLaterPages.
    However, when using Flowables, it's often better to just put the header in the story
    for the first page, and use page templates for subsequent pages if needed.
    
    BUT, for consistency with 'Cotizaciones' style (Logo left, Info right), 
    we will provide a flowable-based Header Table.
    """
    canvas.saveState()
    # Draw bottom border of header
    # canvas.setStrokeColor(BRAND_BLUE)
    # canvas.setLineWidth(2)
    # canvas.line(doc.leftMargin, doc.height + doc.topMargin, doc.width + doc.leftMargin, doc.height + doc.topMargin)
    canvas.restoreState()

def get_header_flowable():
    """
    Returns a Table flowable representing the standard document header.
    (Logo on Left, empty on right - or Company Info if needed).
    """
    logo_img = "[LOGO]"
    if os.path.exists(LOGO_PATH):
        logo_img = Image(LOGO_PATH, width=4 * cm, height=2 * cm)
    
    # Structure: [Logo, Spacer]
    # We can expand right column for company info if specs require.
    data = [[logo_img, ""]]
    
    table = Table(data, colWidths=[6 * cm, 12 * cm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        # Optional: Add bottom border
        # ("LINEBELOW", (0, 0), (-1, -1), 2, BRAND_BLUE),
    ]))
    return table

def draw_footer(canvas, doc):
    """
    Standard Footer: Page Number on Right, Timestamp on Left.
    """
    canvas.saveState()
    styles = get_pdf_styles()
    
    # Page Number
    page_num_text = f"Página {doc.page}"
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(TEXT_GRAY)
    canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, doc.bottomMargin - 10, page_num_text)
    
    # Timestamp (Left) - Could be dynamic, but for now just a placeholder or passed context
    # canvas.drawString(doc.leftMargin, doc.bottomMargin - 10, "Generado por ERP Snabbit")
    
    canvas.restoreState()

def create_info_table(data, col_widths=None):
    """
    Creates a standard key-value info table (invisible borders).
    data format: List of lists/rows. 
    Example: [["Client:", "Name", "Date:", "2023-01-01"]]
    """
    if not col_widths:
        # Default 4 columns for 2 key-value pairs per row
        col_widths = [3.5 * cm, 5.5 * cm, 3.5 * cm, 5.5 * cm]
        
    styles = get_pdf_styles()
    
    # We need to process data to wrap text in Paragraphs if needed,
    # OR apply specific fonts to specific cells via TableStyle.
    # For simplicity, we apply style via TableStyle.
    
    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (-1, -1), TEXT_DARK),
        # Labels are usually in columns 0 and 2
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table

def create_data_table(headers, data, col_widths):
    """
    Creates a standard data table with BrandBlue header background.
    """
    styles = get_pdf_styles()
    
    # Add Headers as first row
    table_data = [headers] + data
    
    table = Table(table_data, colWidths=col_widths)
    table.setStyle(TableStyle([
        # Header Row Style
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        
        # Body Style
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black), # Thin black grid like Cotizaciones
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return table

def create_signature_block(signatures):
    """
    Creates a signature block.
    signatures: List of tuples/dicts [("Role", "Name"), ...]
    """
    styles = get_pdf_styles()
    
    # Create two rows: Lines, Roles, Names
    # Actually, simpler to make separate blocks per signature or a single table.
    # Cotizaciones uses a specific layout, let's stick to a generic table for now.
    
    # Default: 2 signatures
    data = [
        ["_______________________________", "_______________________________"],
        [s[0] for s in signatures], # Roles
        [s[1] for s in signatures], # Names
    ]
    
    col_width = 9 * cm
    table = Table(data, colWidths=[col_width] * len(signatures))
    table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"), # Roles Bold
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 1), (-1, 1), 5), # Space between line and role
        ("BOTTOMPADDING", (0, 0), (-1, -1), 15),
    ]))
    return table
