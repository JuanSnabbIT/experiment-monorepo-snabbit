"""
Smoke test del endpoint agente-facing /api/cotizaciones/crear-completa/.

CORRE ESTO EN TU MÁQUINA (donde el backend dev está levantado). No requiere
dependencias externas (solo stdlib).

Requisitos previos:
  1. Backend dev corriendo (python manage.py runserver).
  2. Usuario de servicio + token creados:
       python manage.py crear_agente_cotizador --email agente@tuempresa.cl --sucursal <id>

Uso:
  # 1) Ver tus clientes para elegir un cliente_id válido:
  ERP_TOKEN=xxxx python smoke_test.py --listar-clientes

  # 2) Crear una cotización de prueba (CLP, 1 ítem):
  ERP_TOKEN=xxxx CLIENTE_ID=12 python smoke_test.py

Variables de entorno:
  ERP_BASE_URL  (default http://localhost:8000)
  ERP_TOKEN     (requerido)
  CLIENTE_ID    (requerido para crear)
"""
import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("ERP_BASE_URL", "http://localhost:8000").rstrip("/")
TOKEN = os.environ.get("ERP_TOKEN", "")


def _req(method, path, body=None):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Token {TOKEN}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode() or "null")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "null")
        except Exception:
            return e.code, {"raw": "sin cuerpo JSON"}
    except urllib.error.URLError as e:
        print(f"ERROR de conexión a {url}: {e}")
        sys.exit(1)


def listar_clientes():
    status, data = _req("GET", "/api/relaciones-empresa/")
    print(f"[GET /api/relaciones-empresa/] -> {status}")
    if status != 200:
        print(json.dumps(data, indent=2, ensure_ascii=False))
        return
    rels = data if isinstance(data, list) else data.get("results", [])
    print(f"{len(rels)} relaciones. Usa el ID del CLIENTE como CLIENTE_ID:")
    for r in rels:
        print(f"  prestador={r.get('prestador_servicios')}  cliente={r.get('cliente')}  tipo={r.get('tipo_relacion')}")


def crear():
    cliente_id = os.environ.get("CLIENTE_ID")
    if not cliente_id:
        print("Falta CLIENTE_ID. Corre primero: python smoke_test.py --listar-clientes")
        sys.exit(1)

    payload = {
        "cliente": int(cliente_id),
        "nombre": "PRUEBA - MCP smoke test",
        "tipo_moneda": "2",  # CLP
        "observaciones": "Cotización de prueba generada por smoke_test.py",
        "items": [
            {
                "nombre": "Servicio de prueba",
                "descripcion": "Ítem de smoke test",
                "cantidad": 1,
                "precio_unitario": "100000.00",
            }
        ],
    }
    status, data = _req("POST", "/api/cotizaciones/crear-completa/", payload)
    print(f"[POST /api/cotizaciones/crear-completa/] -> {status}")
    print(json.dumps(data, indent=2, ensure_ascii=False))
    if status == 201:
        print(f"\nOK. Cotización #{data.get('numero_cotizacion')} creada en estado '{data.get('estado')}'.")
        print("Ábrela en tu ERP para confirmar que aparece igual que una creada por el frontend.")


if __name__ == "__main__":
    if not TOKEN:
        print("Falta ERP_TOKEN en el entorno.")
        sys.exit(1)
    if "--listar-clientes" in sys.argv:
        listar_clientes()
    else:
        crear()
