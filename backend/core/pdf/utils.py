def format_currency(value):
    """
    Standard CLP: $1.500.000
    """
    if value is None:
        return "$0"
    return f"${value:,.0f}".replace(",", ".")

def format_currency_usd(value):
    """
    Standard USD Chilean format: 1.500,0 USD
    """
    if value is None:
        return "0,0 USD"
    # Format to 1 decimal with comma as decimal and dot as thousands
    s = f"{value:,.1f}" # 1,250.5
    return s.replace(",", "X").replace(".", ",").replace("X", ".") + " USD"

def format_currency_uf(value):
    """
    Standard UF format: 1.500,22 UF
    """
    if value is None:
        return "0,00 UF"
    s = f"{value:,.2f}" # 1,250.55
    return s.replace(",", "X").replace(".", ",").replace("X", ".") + " UF"

def clean_text(text):
    """
    Removes HTML-like tags if needed, or sanitizes input.
    """
    if not text:
        return ""
    return str(text).replace("<", "&lt;").replace(">", "&gt;")
