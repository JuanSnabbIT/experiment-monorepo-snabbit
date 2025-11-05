"""Herramienta para listar endpoints del ERP.

Uso:
    backend\\ENV\\Scripts\\python.exe scripts/development/list_endpoints.py

Opcionalmente exporta el listado a Markdown en `.github/LISTA_ENDPOINTS.md`.
"""

from __future__ import annotations

import os
from collections import defaultdict

import django
from django.urls import get_resolver

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")
django.setup()


def get_all_urls(urlpatterns=None, prefix=""):
    """Extrae recursivamente todas las URLs del proyecto."""
    if urlpatterns is None:
        urlpatterns = get_resolver().url_patterns

    urls = []
    for pattern in urlpatterns:
        if hasattr(pattern, "url_patterns"):
            urls.extend(get_all_urls(pattern.url_patterns, prefix + str(pattern.pattern)))
        else:
            path = prefix + str(pattern.pattern)
            if hasattr(pattern, "callback"):
                view_name = (
                    pattern.callback.__name__
                    if hasattr(pattern.callback, "__name__")
                    else str(pattern.callback)
                )
                view_module = (
                    pattern.callback.__module__
                    if hasattr(pattern.callback, "__module__")
                    else "N/A"
                )
            else:
                view_name = "N/A"
                view_module = "N/A"

            urls.append(
                {
                    "path": path,
                    "view": view_name,
                    "module": view_module,
                    "name": pattern.name if hasattr(pattern, "name") else None,
                }
            )

    return urls


def categorize_endpoints(urls):
    """Categoriza endpoints por módulo según su path."""
    categorized = defaultdict(list)

    for url_info in urls:
        path = url_info["path"]

        if path.startswith("^auth/"):
            category = "Autenticación"
        elif "/api/empresas" in path or "/usuarios-empresa" in path:
            category = "Empresas y Sucursales"
        elif "/api/cotizaciones" in path:
            category = "Cotizaciones"
        elif "/api/contratos" in path:
            category = "Contratos"
        elif "/api/ordentrabajo" in path or "/api/orden" in path:
            category = "Órdenes de Trabajo"
        elif "/api/bodegas" in path or "/api/movimientos" in path or "/api/guias" in path:
            category = "Bodegas e Inventario"
        elif "/api/items" in path or "/api/productos" in path:
            category = "Items y Productos"
        elif "/api/recursos" in path:
            category = "Recursos Humanos"
        elif "/api/activos" in path:
            category = "Activos"
        elif "/api/vacaciones" in path:
            category = "Vacaciones"
        elif "/api/visitas" in path:
            category = "Visitas"
        elif "/api/rendiciones" in path:
            category = "Rendiciones"
        elif "/api/calendario" in path or "/api/eventos" in path:
            category = "Calendario"
        elif "/api/cuentas" in path or "/api/usuarios" in path or "/get_grupos" in path:
            category = "Usuarios y Cuentas"
        elif "/api/personalizacion" in path:
            category = "Personalización"
        elif "/api/regiones" in path or "/api/comunas" in path or "/api/ciudades" in path:
            category = "Geografía (Regiones/Comunas)"
        elif "/api/retroalimentacion" in path:
            category = "Retroalimentación"
        elif "admin/" in path:
            category = "Django Admin"
        elif "metrics/" in path:
            category = "Monitoreo (Prometheus)"
        else:
            category = "Otros"

        categorized[category].append(url_info)

    return categorized


def print_endpoints():
    """Imprime endpoints organizados por categoría."""
    print("\n" + "=" * 80)
    print("📋 LISTA COMPLETA DE ENDPOINTS DEL SISTEMA ERP")
    print("=" * 80 + "\n")

    urls = get_all_urls()
    categorized = categorize_endpoints(urls)

    for category in sorted(categorized.keys()):
        endpoints = categorized[category]

        print(f"\n🔹 {category.upper()} ({len(endpoints)} endpoints)")
        print("-" * 80)

        for endpoint in sorted(endpoints, key=lambda x: x["path"]):
            path = endpoint["path"].replace("^", "").replace("$", "").replace("\\", "")
            methods = "GET, POST, PUT, PATCH, DELETE"
            if "ListAPIView" in endpoint["view"]:
                methods = "GET"
            elif "CreateAPIView" in endpoint["view"]:
                methods = "POST"
            elif "RetrieveAPIView" in endpoint["view"]:
                methods = "GET"

            print(f"  /{path:<50}  [{methods}]")

        print()

    print("=" * 80)
    print(f"✅ Total de endpoints: {len(urls)}")
    print("=" * 80 + "\n")


def export_to_markdown():
    """Exporta la lista de endpoints a Markdown en .github."""
    urls = get_all_urls()
    categorized = categorize_endpoints(urls)

    output_file = os.path.join(os.path.dirname(__file__), "..", "..", ".github", "LISTA_ENDPOINTS.md")

    with open(output_file, "w", encoding="utf-8") as file:
        file.write("# 📋 Lista Completa de Endpoints del Sistema ERP\n\n")
        file.write("**Total de endpoints:** {}\n\n".format(len(urls)))
        file.write("---\n\n")
        file.write("## Índice\n\n")

        for category in sorted(categorized.keys()):
            anchor = (
                category.lower()
                .replace(" ", "-")
                .replace("(", "")
                .replace(")", "")
                .replace("/", "-")
            )
            file.write(f"- [{category}](#{anchor})\n")

        file.write("\n---\n\n")

        for category in sorted(categorized.keys()):
            endpoints = categorized[category]
            file.write(f"## {category}\n\n")
            file.write(f"**Total:** {len(endpoints)} endpoints\n\n")
            file.write("| Endpoint | Métodos HTTP | Descripción |\n")
            file.write("|----------|--------------|-------------|\n")

            for endpoint in sorted(endpoints, key=lambda x: x["path"]):
                path = (
                    endpoint["path"].replace("^", "").replace("$", "").replace("\\", "")
                )
                path = f"`/{path}`"

                methods = "GET, POST, PUT, PATCH, DELETE"
                if "list" in endpoint["view"].lower():
                    methods = "GET"
                elif "create" in endpoint["view"].lower():
                    methods = "POST"

                description = (
                    f"{endpoint['view']} ({endpoint['module']})"
                    if endpoint["module"] != "N/A"
                    else endpoint["view"]
                )

                file.write(f"| {path} | {methods} | {description} |\n")

            file.write("\n")

    print(f"✅ Lista exportada a: {output_file}\n")


if __name__ == "__main__":
    print_endpoints()

    try:
        export = input("¿Deseas exportar a Markdown? (s/n): ").strip().lower()
        if export in {"s", "si", "y", "yes"}:
            export_to_markdown()
    except (KeyboardInterrupt, EOFError):
        print("\n\n👋 Saliendo...")
