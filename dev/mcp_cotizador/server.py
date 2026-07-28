"""
MCP server del Cotizador ERP Snabbit.

Expone una sola herramienta de alto nivel para que un agente cree una cotización
completa (cabecera + ítems) en el ERP, de forma atómica, a través del endpoint
/api/cotizaciones/crear-completa/.

Auth: token DRF de larga duración (Authorization: Token <ERP_TOKEN>), asociado al
usuario de servicio creado con `manage.py crear_agente_cotizador`.

Ejecutar:
    pip install -r requirements.txt
    # definir ERP_BASE_URL y ERP_TOKEN (ver .env.example)
    python server.py
"""
import os
from typing import Any, Optional

import httpx
from mcp.server.fastmcp import FastMCP

ERP_BASE_URL = os.environ.get("ERP_BASE_URL", "https://gestion.snabbit.cl").rstrip("/")
ERP_TOKEN = os.environ.get("ERP_TOKEN", "")
TIMEOUT = float(os.environ.get("ERP_TIMEOUT", "30"))

mcp = FastMCP("cotizador-erp-snabbit")


def _headers() -> dict:
    if not ERP_TOKEN:
        raise RuntimeError("Falta ERP_TOKEN en el entorno.")
    return {"Authorization": f"Token {ERP_TOKEN}", "Content-Type": "application/json"}


@mcp.tool()
def crear_cotizacion_completa(
    cliente: int,
    nombre: str,
    items: list[dict[str, Any]],
    tipo_moneda: str = "2",
    observaciones: Optional[str] = None,
    fecha_facturacion: Optional[str] = None,
    dolar_observado: Optional[float] = None,
    valor_uf: Optional[float] = None,
) -> dict:
    """
    Crea una cotización completa en el ERP en una sola operación atómica.

    La cotización queda en estado 'pendiente' (NO se envía correo al cliente).
    Revísala y envíala manualmente desde el ERP.

    Args:
        cliente: ID de la Empresa cliente (debe estar relacionada con tu empresa).
        nombre: Nombre/título de la cotización.
        items: Lista de ítems. Cada ítem es un dict con:
            - cantidad (int, > 0)  [requerido]
            - precio_unitario (número, >= 0)  [requerido]
            - nombre (str) O item_empresa (int)  [al menos uno requerido]
            - tipo_moneda (str, opcional): "1"=USD, "2"=CLP, "3"=UF. Default: la de la cotización.
            - descripcion (str, opcional)
            - proveedor_empresa (int, opcional): ID de ProveedorEmpresa de tu empresa.
            - porcentaje_recargo (int, opcional): si 0/omitido, hereda el de la cotización.
        tipo_moneda: Moneda de la cotización. "1"=USD, "2"=CLP (default), "3"=UF.
        observaciones: Texto para el cliente (opcional).
        fecha_facturacion: "YYYY-MM-DD" (opcional; default hoy).
        dolar_observado: Valor manual del dólar (opcional; si moneda USD y no se da, el ERP lo resuelve).
        valor_uf: Valor manual de la UF (opcional; si moneda UF y no se da, el ERP lo resuelve).

    Returns:
        dict con id, numero_cotizacion, estado, total_estimado, items_creados.
    """
    payload: dict[str, Any] = {
        "cliente": cliente,
        "nombre": nombre,
        "tipo_moneda": tipo_moneda,
        "items": items,
    }
    if observaciones is not None:
        payload["observaciones"] = observaciones
    if fecha_facturacion is not None:
        payload["fecha_facturacion"] = fecha_facturacion
    if dolar_observado is not None:
        payload["dolar_observado"] = dolar_observado
    if valor_uf is not None:
        payload["valor_uf"] = valor_uf

    url = f"{ERP_BASE_URL}/api/cotizaciones/crear-completa/"
    try:
        resp = httpx.post(url, json=payload, headers=_headers(), timeout=TIMEOUT)
    except httpx.RequestError as e:
        return {"ok": False, "error": f"No se pudo conectar al ERP: {e}"}

    if resp.status_code == 201:
        data = resp.json()
        return {"ok": True, **data}

    # Error: devolver el detalle del backend para que el agente lo explique
    try:
        detalle = resp.json()
    except Exception:
        detalle = {"raw": resp.text}
    return {"ok": False, "status": resp.status_code, "error": detalle}


if __name__ == "__main__":
    mcp.run()
