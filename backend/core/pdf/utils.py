def format_currency(value):
    """
    Standard currency formatter for PDFs (CLP style).
    $1.500.000
    """
    if value is None:
        return "$0"
    return f"${value:,.0f}".replace(",", ".")

def format_currency_usd(value):
    """
    Standard currency formatter for USD.
    1,500.00 USD
    """
    if value is None:
        return "0.00 USD"
    return f"{value:,.2f} USD"

def clean_text(text):
    """
    Removes HTML-like tags if needed, or sanitizes input.
    """
    if not text:
        return ""
    return str(text).replace("<", "&lt;").replace(">", "&gt;")
