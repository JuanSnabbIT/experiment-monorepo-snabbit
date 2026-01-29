import base64
import os
from io import BytesIO
from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import Table, TableStyle, Image, Paragraph
from reportlab.lib.utils import ImageReader
from .styles import TEXT_DARK, get_pdf_styles

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

def _build_logo(logo_base64=None):
    if logo_base64:
        try:
            b64 = logo_base64.split(",", 1)[1] if "," in logo_base64 else logo_base64
            img = ImageReader(BytesIO(base64.b64decode(b64)))
            iw, ih = img.getSize()
            w_logo = 120
            h_logo = w_logo * (ih / iw)
            return Image(img, width=w_logo, height=h_logo)
        except Exception:
            pass
    if os.path.exists(LOGO_PATH):
        return Image(LOGO_PATH, width=4 * cm, height=2 * cm)
    return ""


def get_header_flowable(left_text="", logo_base64=None, valign="MIDDLE"):
    """
    Returns a Table flowable representing the legacy document header.
    (Left text, logo on right).
    """
    styles = get_pdf_styles()
    logo_img = _build_logo(logo_base64)
    if hasattr(left_text, "wrap"):
        left_cell = left_text
    else:
        left_cell = Paragraph(left_text, styles["Data"]) if left_text else ""
    
    # Structure: [Logo, Spacer]
    # We can expand right column for company info if specs require.
    data = [[left_cell, logo_img]]

    table_width = A4[0] - 80
    logo_width = 120
    table = Table(data, colWidths=[table_width - logo_width, logo_width])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), valign),
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        # Optional: Add bottom border
        # ("LINEBELOW", (0, 0), (-1, -1), 2, BRAND_BLUE),
    ]))
    return table

def draw_footer(canvas, doc):
    """
    Standard Footer: Contact Info and Page Numbers.
    Matches the legacy Cotizaciones design.
    """
    canvas.saveState()

    styles = get_pdf_styles()
    footer_text = (
        "<b>Snabb IT | Asesores Tecnol\u00f3gicos</b><br/>"
        "<a href='https://maps.app.goo.gl/R1pAm1ANqs5eEjvSA'>"
        "Gran Av. Jos\u00e9 Miguel Carrera N\u00b0 3840 Of - 808, San Miguel"
        "</a> - Fono: <a href='tel:+56227596140'>(56-2) 27596140</a><br/>"
        "Vis\u00edtenos en <a href='https://snabbit.cl' target='_blank'>https://snabbit.cl</a>"
    )
    para = Paragraph(footer_text, styles['Footer'])
    w, h = para.wrap(doc.width, doc.bottomMargin)
    para.drawOn(canvas, doc.leftMargin, doc.bottomMargin - h - 5)

    canvas.restoreState()

def create_info_table(data, col_widths=None):
    """
    Creates a standard key-value info table.
    Legacy Style: Compact rows, Bold labels.
    """
    if not col_widths:
        # Adjusted for more compact look if needed, but strict widths passed by caller usually better.
        col_widths = [3.5 * cm, 5.5 * cm, 3.5 * cm, 5.5 * cm]
        
    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (-1, -1), TEXT_DARK),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"), # Col 0 Bold (Label)
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"), # Col 2 Bold (Label) usually
        ("VALIGN", (0, 0), (-1, -1), "TOP"), # Top align for multi-line address
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2), # Compact padding
        ("TOPPADDING", (0, 0), (-1, -1), 2),
    ]))
    return table

def create_data_table(headers, data, col_widths):
    """
    Creates a standard data table.
    Legacy Style: Gray header, black text, numeric right-aligned.
    """
    # Add Headers as first row
    table_data = [headers] + data
    
    table = Table(table_data, colWidths=col_widths)
    table.setStyle(TableStyle([
        # Header Row Style (Legacy)
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, 0), "LEFT"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("LEFTPADDING", (0, 0), (-1, 0), 6),

        # Body Style (Legacy)
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 1), (0, -1), "LEFT"),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("LEFTPADDING", (0, 1), (-1, -1), 6),
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
