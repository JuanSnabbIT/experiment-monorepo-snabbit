"""Scraper de consulta de afiliacion AFP/AFC en spensiones.cl.

Modulo puro (sin dependencias de Django) para que sea testeable de forma
aislada. El flujo es GET del formulario (para extraer el sessionid) + POST
inmediato a la URL de procesamiento. El reCAPTCHA del sitio NO se valida en el
servidor, asi que cualquier valor en g-recaptcha-response funciona.

Si el HTML de spensiones.cl cambia y el parser no encuentra el patron esperado,
se lanza AfpScraperError en vez de devolver datos parciales silenciosamente.
"""

import re
import unicodedata

import requests
from bs4 import BeautifulSoup

FORM_URL = "https://www.spensiones.cl/apps/certificados/formConsultaAfiliacion.php"
PROCESO_URL = "https://www.spensiones.cl/apps/certificados/consultaAfiliacion.php"
TIMEOUT_SECONDS = 20

_MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10,
    "noviembre": 11, "diciembre": 12,
}
_MESES_NOMBRE = {v: k.capitalize() for k, v in _MESES.items()}

# "1 de Agosto de 2023" / "01 de agosto de 2023"
_RE_FECHA_TEXTO = re.compile(
    r"(\d{1,2})\s+de\s+([A-Za-zñÑáéíóúÁÉÍÓÚ]+)\s+de\s+(\d{4})", re.IGNORECASE
)
# "01/08/2023"
_RE_FECHA_SLASH = re.compile(r"(\d{1,2})/(\d{1,2})/(\d{4})")


class AfpScraperError(Exception):
    """El scraping falla o el HTML no tiene la estructura esperada."""


def normalizar_rut(rut):
    """Normaliza un RUT a formato 'NNNNNNNN-D' (sin puntos, con guion, DV mayuscula)."""
    if not rut:
        return ""
    limpio = re.sub(r"[^0-9kK]", "", str(rut)).upper()
    if len(limpio) < 2:
        return ""
    return f"{limpio[:-1]}-{limpio[-1]}"


def rut_sin_guion(rut):
    """Devuelve el RUT solo con digitos + DV, sin puntos ni guion (para keys de cache)."""
    return normalizar_rut(rut).replace("-", "")


def _strip_acentos(texto):
    return "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )


def _fecha_iso(match_texto, match_slash):
    """Convierte el primer match de fecha disponible a 'YYYY-MM-DD' o None."""
    if match_slash:
        d, m, y = match_slash.groups()
        return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
    if match_texto:
        d, mes_nombre, y = match_texto.groups()
        mes = _MESES.get(_strip_acentos(mes_nombre).lower())
        if mes:
            return f"{int(y):04d}-{mes:02d}-{int(d):02d}"
    return None


def _extraer_fecha(fragmento):
    """Extrae la primera fecha (texto o slash) de un fragmento de texto."""
    return _fecha_iso(_RE_FECHA_TEXTO.search(fragmento), _RE_FECHA_SLASH.search(fragmento))


def _extraer_mes_actualizacion(texto):
    """Extrae 'Mes AAAA' de leyendas tipo 'ultimo dia habil del mes de Mayo de 2026'."""
    m = re.search(
        r"mes\s+de\s+([A-Za-zñÑáéíóúÁÉÍÓÚ]+)\s+de\s+(\d{4})", texto, re.IGNORECASE
    )
    if m:
        return f"{m.group(1).capitalize()} {m.group(2)}"
    return None


def _parsear_respuesta(html, rut_normalizado):
    """Parsea el HTML de respuesta a un dict estructurado.

    Lanza AfpScraperError si no encuentra el bloque de afiliacion AFP.
    """
    soup = BeautifulSoup(html, "html.parser")
    texto = soup.get_text(" ", strip=True)
    texto_norm = _strip_acentos(texto).lower()

    if "no se encuentra" in texto_norm or "no registra" in texto_norm:
        raise AfpScraperError(f"El RUT {rut_normalizado} no registra afiliacion.")

    # Nombre AFP: capturar lo que sigue a "AFP " (ej: "AFP MODELO" -> "MODELO").
    afp_match = re.search(r"\bAFP\s+([A-ZÑÁÉÍÓÚ][A-ZÑÁÉÍÓÚ\s\.]+?)(?:,|\.|\bcon\b|\bdesde\b|$)", texto)
    afp_nombre = None
    if afp_match:
        afp_nombre = re.sub(r"\s+", " ", afp_match.group(1)).strip().rstrip(".")
    if not afp_nombre:
        raise AfpScraperError(
            "No se pudo extraer el nombre de la AFP del HTML (estructura cambio?)."
        )

    # Separar en bloque AFP y bloque AFC para fechas independientes.
    partes = re.split(r"\bAFC\b", texto, maxsplit=1)
    bloque_afp = partes[0]
    bloque_afc = partes[1] if len(partes) > 1 else ""

    afp_fecha = _extraer_fecha(bloque_afp)
    afc_fecha = _extraer_fecha(bloque_afc) if bloque_afc else None

    # Nombre completo: primera secuencia larga de palabras en mayusculas.
    nombre_match = re.search(r"([A-ZÑÁÉÍÓÚ]{2,}(?:\s+[A-ZÑÁÉÍÓÚ]{2,}){2,})", texto)
    nombre_completo = (
        re.sub(r"\s+", " ", nombre_match.group(1)).strip() if nombre_match else None
    )
    # Evitar que "AFP MODELO" sea tomado como nombre completo.
    if nombre_completo and nombre_completo.startswith("AFP "):
        nombre_completo = None

    return {
        "nombre_completo": nombre_completo,
        "rut": rut_normalizado,
        "afp_nombre": afp_nombre,
        "afp_fecha_afiliacion": afp_fecha,
        "afc_afiliado": bool(bloque_afc and afc_fecha),
        "afc_fecha_afiliacion": afc_fecha,
        "afp_datos_al_mes": _extraer_mes_actualizacion(bloque_afp),
        "afc_datos_al_mes": _extraer_mes_actualizacion(bloque_afc) if bloque_afc else None,
    }


def consultar_afiliacion(rut):
    """Consulta la afiliacion AFP/AFC de un RUT en spensiones.cl.

    Retorna un dict con los datos parseados. Lanza AfpScraperError ante
    cualquier fallo (red, estructura inesperada, RUT sin afiliacion).
    """
    rut_normalizado = normalizar_rut(rut)
    if not rut_normalizado or len(rut_normalizado) < 3:
        raise AfpScraperError(f"RUT invalido: {rut!r}")

    session = requests.Session()
    session.headers.update(
        {"User-Agent": "Mozilla/5.0 (compatible; ERP-Snabbit/1.0)"}
    )

    try:
        resp_form = session.get(FORM_URL, timeout=TIMEOUT_SECONDS)
        resp_form.raise_for_status()
    except requests.RequestException as exc:
        raise AfpScraperError(f"No se pudo cargar el formulario: {exc}") from exc

    soup = BeautifulSoup(resp_form.text, "html.parser")
    session_input = soup.find("input", {"name": "sessionid"})
    sessionid = session_input.get("value") if session_input else None
    if not sessionid:
        raise AfpScraperError("No se encontro sessionid en el formulario.")

    payload = {
        "rut": rut_normalizado,
        "sessionid": sessionid,
        # El reCAPTCHA NO se valida server-side; el campo igual debe ir presente
        # para obtener la respuesta completa (sin el, devuelve pagina de error).
        "g-recaptcha-response": "FAKE_TOKEN",
    }
    try:
        # El servidor exige Referer apuntando al formulario; sin el redirige a 404.
        resp = session.post(
            PROCESO_URL,
            data=payload,
            headers={"Referer": FORM_URL},
            timeout=TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise AfpScraperError(f"Fallo el POST de consulta: {exc}") from exc

    # La pagina declara charset iso-8859-1; sin esto los acentos llegan corruptos.
    resp.encoding = "iso-8859-1"
    return _parsear_respuesta(resp.text, rut_normalizado)
