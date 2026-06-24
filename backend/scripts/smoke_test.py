"""
Smoke test contra el servidor corriendo.

Requiere:
  - Servidor activo: python manage.py runserver 0.0.0.0:8000
  - Usuario de demo en DB (correr seed_demo_rrhh si no existe)
  - Librería requests (ya en req.txt)

Uso:
  python scripts/smoke_test.py
  python scripts/smoke_test.py --base-url http://localhost:8000
  python scripts/smoke_test.py --email demo@snabbit.cl --password demo123
  python scripts/smoke_test.py --mode tenancy
  python scripts/smoke_test.py --mode rrhh
"""

import argparse
import sys
import time

import requests

# Forzar UTF-8 en stdout para Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ─── Colores ANSI ────────────────────────────────────────────────────────────
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD = "\033[1m"

OK = f"{GREEN}OK{RESET}"
FAIL = f"{RED}FAIL{RESET}"
SKIP = f"{YELLOW}SKIP{RESET}"


# ─── Runner ──────────────────────────────────────────────────────────────────

class SmokeRunner:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.results: list[dict] = []
        self.token: str | None = None

    def _check(self, method: str, path: str, *, expected: int = 200, json=None, label: str | None = None) -> dict:
        url = f"{self.base_url}{path}"
        label = label or f"{method} {path}"
        start = time.time()
        try:
            resp = self.session.request(method, url, json=json, timeout=10)
            elapsed = int((time.time() - start) * 1000)
            ok = resp.status_code == expected
            count = ""
            if ok and resp.headers.get("Content-Type", "").startswith("application/json"):
                try:
                    data = resp.json()
                    if isinstance(data, list):
                        count = f"  {len(data)} items"
                    elif isinstance(data, dict) and "count" in data:
                        count = f"  {data['count']} items"
                    elif isinstance(data, dict) and "results" in data:
                        count = f"  {len(data['results'])} items"
                except Exception:
                    pass
            symbol = OK if ok else FAIL
            status_color = GREEN if ok else RED
            print(f"  {symbol} {label:<55} {status_color}{resp.status_code}{RESET}  ({elapsed}ms){count}")
            result = {"label": label, "status": resp.status_code, "ok": ok, "elapsed": elapsed}
            if not ok:
                try:
                    result["body"] = resp.text[:300]
                except Exception:
                    pass
            self.results.append(result)
            return result
        except requests.ConnectionError:
            print(f"  {FAIL} {label:<55} {RED}CONNECTION REFUSED{RESET}")
            self.results.append({"label": label, "ok": False, "error": "connection refused"})
            return {"ok": False}
        except requests.Timeout:
            print(f"  {FAIL} {label:<55} {RED}TIMEOUT{RESET}")
            self.results.append({"label": label, "ok": False, "error": "timeout"})
            return {"ok": False}

    def authenticate(self, email: str, password: str) -> bool:
        print(f"\n{BOLD}[AUTH]{RESET}")
        result = self._check(
            "POST", "/auth/jwt/create/",
            expected=200,
            json={"email": email, "password": password},
            label="POST /auth/jwt/create/",
        )
        if not result.get("ok"):
            print(f"  {YELLOW}→ Verifica credenciales de demo o corre seed_demo_rrhh{RESET}")
            return False

        resp = self.session.post(
            f"{self.base_url}/auth/jwt/create/",
            json={"email": email, "password": password},
            timeout=10,
        )
        self.token = resp.json().get("access")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})

        # Refresh token
        refresh = resp.json().get("refresh")
        if refresh:
            self._check(
                "POST", "/auth/jwt/refresh/",
                expected=200,
                json={"refresh": refresh},
                label="POST /auth/jwt/refresh/",
            )
        return True

    def check_endpoints(self):
        print(f"\n{BOLD}[ENDPOINTS CRÍTICOS]{RESET}")
        endpoints = [
            ("GET", "/api/empresas/empresas/"),
            ("GET", "/api/contratos/contratos/"),
            ("GET", "/api/rrhh/contratos-trabajador/"),
            ("GET", "/api/rrhh/afp-catalogo/"),
            ("GET", "/api/cotizaciones/cotizaciones/"),
            ("GET", "/api/v3/ordenes/"),
            ("GET", "/api/bodegas/"),
            ("GET", "/api/rendiciones/rendiciones/"),
            ("GET", "/api/vacaciones/solicitudes-vacaciones/"),
        ]
        for method, path in endpoints:
            self._check(method, path)

    def check_rrhh(self):
        print(f"\n{BOLD}[RRHH — endpoints directos]{RESET}")
        endpoints = [
            ("GET", "/api/rrhh/contratos-trabajador/"),
            ("GET", "/api/rrhh/afp-catalogo/"),
            ("GET", "/api/rrhh/cargos-catalogo/"),
            ("GET", "/api/rrhh/turnos-laborales/"),
            ("GET", "/api/rrhh/grupos-turno/"),
        ]
        for method, path in endpoints:
            self._check(method, path)

    def check_flujo_cliente_a_rrhh(self):
        """
        Flujo real: Empresa -> Cliente -> Trabajadores -> RRHH.
        Simula exactamente lo que hace DetalleUsuarioCliente.tsx al cargar.
        """
        print(f"\n{BOLD}[FLUJO CLIENTE → RRHH]{RESET}")

        # Paso 1: Obtener lista de empresas (empresa del usuario autenticado)
        resp = self.session.get(f"{self.base_url}/api/empresas/", timeout=10)
        empresas = resp.json() if resp.status_code == 200 else []
        if not empresas:
            print(f"  {SKIP} No hay empresas disponibles para este usuario — omitiendo flujo")
            return

        empresa_id = empresas[0].get("id") if isinstance(empresas, list) else None
        if not empresa_id:
            print(f"  {SKIP} No se pudo obtener empresa_id — omitiendo flujo")
            return
        self.results.append({"label": "GET /api/empresas/ (flujo)", "ok": True, "status": 200, "elapsed": 0})
        print(f"  {OK} GET /api/empresas/                                     200  (empresa_id={empresa_id})")

        # Paso 2: Obtener trabajadores de una empresa cliente
        result = self._check(
            "GET", f"/api/empresas/{empresa_id}/usuarios-de-clientes/",
            label=f"GET /api/empresas/{{id}}/usuarios-de-clientes/"
        )
        trabajadores = []
        if result.get("ok"):
            try:
                r = self.session.get(f"{self.base_url}/api/empresas/{empresa_id}/usuarios-de-clientes/", timeout=10)
                data = r.json()
                trabajadores = data if isinstance(data, list) else data.get("results", [])
            except Exception:
                pass

        if not trabajadores:
            print(f"  {SKIP} No hay trabajadores para continuar el flujo")
            return

        trabajador_id = trabajadores[0].get("id") or trabajadores[0].get("ref_id")
        if not trabajador_id:
            print(f"  {SKIP} No se pudo obtener ID de trabajador")
            return

        # Paso 3: Cargar ficha del trabajador (endpoint empresa — accesible para RRHH)
        self._check(
            "GET", f"/api/usuarios-empresa/detalle-usuario-cliente/{trabajador_id}/",
            label="GET /api/usuarios-empresa/detalle-usuario-cliente/{{id}}/",
            expected=200,
        )

        # Paso 4: Cargar contrato laboral del trabajador (endpoint RRHH — requiere rol)
        self._check(
            "GET", f"/api/rrhh/contratos-trabajador/?ref_id={trabajador_id}",
            label="GET /api/rrhh/contratos-trabajador/?ref_id={{id}}",
            expected=200,
        )

        # Paso 5: Catálogos RRHH usados en modales de la ficha
        self._check("GET", "/api/rrhh/afp-catalogo/",   label="GET /api/rrhh/afp-catalogo/ (modal prevision)")
        self._check("GET", "/api/rrhh/banco-catalogo/",  label="GET /api/rrhh/banco-catalogo/ (modal banco)")

    def check_contratos(self):
        print(f"\n{BOLD}[CONTRATOS B2B]{RESET}")
        endpoints = [
            ("GET", "/api/contratos/contratos/"),
            ("GET", "/api/contratos/plantillas-contrato-v2/"),
            ("GET", "/api/contratos/servicios/"),
        ]
        for method, path in endpoints:
            self._check(method, path)

    def check_cotizaciones(self):
        print(f"\n{BOLD}[COTIZACIONES]{RESET}")
        endpoints = [
            ("GET", "/api/cotizaciones/cotizaciones/"),
            ("GET", "/api/cotizaciones/items-cotizacion/"),
        ]
        for method, path in endpoints:
            self._check(method, path)

    def check_auth_only(self, email: str, password: str):
        print(f"\n{BOLD}[AUTH FLOW]{RESET}")
        resp = self.session.post(
            f"{self.base_url}/auth/jwt/create/",
            json={"email": email, "password": password},
            timeout=10,
        )
        if resp.status_code != 200:
            self._check("POST", "/auth/jwt/create/", expected=200,
                        json={"email": email, "password": password})
            return
        data = resp.json()
        access = data.get("access")
        refresh = data.get("refresh")
        print(f"  {OK} POST /auth/jwt/create/                                 {GREEN}200{RESET}")
        self.results.append({"label": "POST /auth/jwt/create/", "ok": True, "status": 200})

        if refresh:
            self._check("POST", "/auth/jwt/refresh/", expected=200,
                        json={"refresh": refresh})

        if access:
            # Verificar que el token funciona
            old_headers = dict(self.session.headers)
            self.session.headers.update({"Authorization": f"Bearer {access}"})
            self._check("GET", "/api/empresas/empresas/", expected=200,
                        label="GET /api/empresas/ (con token válido)")
            self.session.headers.update(old_headers)

    def print_summary(self):
        total = len(self.results)
        passed = sum(1 for r in self.results if r.get("ok"))
        failed = total - passed
        duration = sum(r.get("elapsed", 0) for r in self.results)

        print(f"\n{'═'*60}")
        if failed == 0:
            print(f"{GREEN}{BOLD}RESULTADO: {passed}/{total} OK{RESET}")
        else:
            print(f"{RED}{BOLD}RESULTADO: {passed}/{total} OK — {failed} FALLOS{RESET}")
            print(f"\n{BOLD}Fallos:{RESET}")
            for r in self.results:
                if not r.get("ok"):
                    print(f"  {FAIL} {r['label']}")
                    if "body" in r:
                        print(f"     {r['body'][:150]}")
                    if "error" in r:
                        print(f"     Error: {r['error']}")
        print(f"Duración total: {duration}ms")
        print('═'*60)
        return failed == 0


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Smoke test ERP Snabbit")
    parser.add_argument("--base-url", default="http://localhost:8000", help="URL base del servidor")
    parser.add_argument("--email", default="demo@snabbit.cl", help="Email del usuario de demo")
    parser.add_argument("--password", default="demo123", help="Password del usuario de demo")
    parser.add_argument("--mode", choices=["all", "auth", "tenancy", "rrhh", "contratos", "cotizaciones", "flujo-rrhh"],
                        default="all", help="Modo de ejecución")
    args = parser.parse_args()

    print(f"\n{BOLD}=== SMOKE TEST — ERP Snabbit ==={RESET}")
    print(f"Base URL: {args.base_url}")
    print(f"Usuario:  {args.email}")
    print(f"Modo:     {args.mode}")

    runner = SmokeRunner(args.base_url)

    if args.mode == "auth":
        runner.check_auth_only(args.email, args.password)
    else:
        auth_ok = runner.authenticate(args.email, args.password)
        if not auth_ok:
            print(f"\n{RED}Auth fallida — deteniendo smoke test.{RESET}")
            print("Verificar que el servidor esté corriendo y las credenciales sean correctas.")
            print("Si el usuario de demo no existe: python manage.py seed_demo_rrhh")
            sys.exit(1)

        if args.mode == "all":
            runner.check_endpoints()
            runner.check_flujo_cliente_a_rrhh()
        elif args.mode == "rrhh":
            runner.check_rrhh()
            runner.check_flujo_cliente_a_rrhh()
        elif args.mode == "flujo-rrhh":
            runner.check_flujo_cliente_a_rrhh()
        elif args.mode == "contratos":
            runner.check_contratos()
        elif args.mode == "cotizaciones":
            runner.check_cotizaciones()
        elif args.mode == "tenancy":
            print(f"\n{YELLOW}Modo --tenancy requiere 2 usuarios de empresas distintas en DB de demo.{RESET}")
            print("Ejecutar primero: python manage.py seed_contratos_cliente_demo")
            print("Luego re-ejecutar con credenciales de cada empresa.")
            runner.check_endpoints()

    success = runner.print_summary()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
