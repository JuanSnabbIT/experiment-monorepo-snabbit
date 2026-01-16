from reportlab.platypus import SimpleDocTemplate
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm

class StandardPDFTemplate(SimpleDocTemplate):
    """
    Standardized PDF Template for the ERP.
    Pre-configured with A4 size and standard margins.
    """
    def __init__(self, buffer, **kwargs):
        super().__init__(
            buffer,
            pagesize=A4,
            rightMargin=1.5 * cm,
            leftMargin=1.5 * cm,
            topMargin=1.5 * cm,
            bottomMargin=1.5 * cm,
            **kwargs
        )

def create_pdf_engine(buffer):
    """
    Factory to create a standard PDF engine.
    """
    return StandardPDFTemplate(buffer)
