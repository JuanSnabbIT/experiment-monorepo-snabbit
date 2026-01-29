from reportlab.platypus import SimpleDocTemplate
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        """Add page info to each page (flows last)"""
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        if self._pageNumber != page_count:
            return
        self.setFont("Helvetica", 8)
        self.setFillColorRGB(0, 0, 0)
        page = f"{self._pageNumber}/{self._pageNumber}"
        self.drawRightString(self._pagesize[0] - 40, 15, page)

class StandardPDFTemplate(SimpleDocTemplate):
    """
    Standardized PDF Template for the ERP.
    Pre-configured with A4 size and standard margins.
    """
    def __init__(self, buffer, **kwargs):
        super().__init__(
            buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40,
            **kwargs
        )

def create_pdf_engine(buffer):
    """
    Factory to create a standard PDF engine.
    """
    return StandardPDFTemplate(buffer)
