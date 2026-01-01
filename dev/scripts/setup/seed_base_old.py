#!/usr/bin/env python
"""
Script orquestador que ejecuta scripts de seed en orden correcto.

Qué hace:
- Ejecuta secuencialmente setup_superuser.py (si no existe superusuario) y luego pobla datos base
- Verifica éxito de cada paso antes de continuar
- Proporciona resumen completo al finalizar
- Crea SOLO datos base necesarios para probar flujos de usuario

IMPORTANTE: NO crea datos de flujos (OT, Contratos, Cotizaciones, etc.)
Estos se deben crear manualmente para probar los flujos del sistema.

Cuándo usar:
- Después de reset_db.py para poblar sistema desde cero
- Primera inicialización del sistema
- Testing con datos base sólidos

Prerequisitos:
- Base de datos resetada (reset_db.py)
- Migraciones aplicadas (manage.py migrate)

Uso:
    cd backend
    backend\\ENV\\Scripts\\python.exe ..\\dev\\scripts\\setup\\seed_base.py

Salida:
    - Ejecuta cada script en orden
    - Muestra progreso de cada script
    - Detiene ejecución si algún script falla
    - Resumen final con totales creados
"""
import os
import subprocess
import sys
from pathlib import Path

# Rutas
BACKEND_PATH = Path(__file__).parents[2] / "backend"
SCRIPTS_DIR = Path(__file__).parent
PYTHON_EXE = BACKEND_PATH / "ENV" / "Scripts" / "python.exe"

# Scripts a ejecutar en orden de dependencias
SEED_SCRIPTS = [
    {
        "name": "setup_superuser.py",
        "description": "Crear superusuario, empresa base (11111111-1) y grupos",
        "required": True,
        "condition": "no_superuser",  # Solo ejecutar si no hay superusuario
    },
    {
        "name": "seed_base.py",
        "description": "Poblar empresas, items, bodegas, stock, proveedores, software",
        "required": True,
        "condition": None,  # Siempre ejecutar
    },
]


def print_header(text):
    """Imprime encabezado con formato."""
    print("\n" + "=" * 80)
    print(text.center(80))
    print("=" * 80)


def print_step(step_num, total_steps, script_name, description):
    """Imprime información del paso actual."""
    print(f"\n{'=' * 80}")
    print(f"PASO {step_num}/{total_steps}: {script_name}")
    print(f"Descripción: {description}")
    print(f"{'=' * 80}")


def check_condition(condition):
    """Verifica si se debe ejecutar el script basado en condición."""
    if condition == "no_superuser":
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return not User.objects.filter(is_superuser=True).exists()
    return True


def run_script(script_path):
    """Ejecuta un script y retorna True si tuvo éxito."""
    result = subprocess.run(
        [str(PYTHON_EXE), str(script_path)],
        cwd=str(BACKEND_PATH),
        capture_output=False,
    )
    return result.returncode == 0


def main():
    print_header("SEED BASE - Poblando datos base del sistema")

    print("\n📋 Scripts a ejecutar:")
    for i, script in enumerate(SEED_SCRIPTS, 1):
        status = "✅ Requerido" if script["required"] else "⚠️ Opcional"
        condition_text = f" (Condición: {script['condition']})" if script["condition"] else ""
        print(f"   {i}. {script['name']:30} - {script['description']} [{status}]{condition_text}")

    # Verificar que existan todos los scripts
    missing_scripts = []
    for script in SEED_SCRIPTS:
        script_path = SCRIPTS_DIR / script["name"]
        if not script_path.exists():
            missing_scripts.append(script["name"])

    if missing_scripts:
        print("\n❌ ERROR: Los siguientes scripts no existen:")
        for script_name in missing_scripts:
            print(f"   - {script_name}")
        print(f"\nRuta esperada: {SCRIPTS_DIR}")
        sys.exit(1)

    # Ejecutar scripts
    total_scripts = len(SEED_SCRIPTS)
    successful = 0
    failed = []
    skipped = []

    for i, script in enumerate(SEED_SCRIPTS, 1):
        script_path = SCRIPTS_DIR / script["name"]

        # Verificar condición
        if script["condition"] and not check_condition(script["condition"]):
            print(f"\n⏭️ Saltando {script['name']} - Condición '{script['condition']}' no cumplida")
            skipped.append(script["name"])
            continue

        print_step(i, total_scripts, script["name"], script["description"])

        if run_script(script_path):
            print(f"\n✅ {script['name']} completado exitosamente")
            successful += 1
        else:
            print(f"\n❌ ERROR en {script['name']}")
            failed.append(script["name"])

            if script["required"]:
                print(f"\n⚠️ Este script es REQUERIDO. Deteniendo ejecución.")
                break
            else:
                print(f"\n⚠️ Este script es opcional. Continuando...")

    # Resumen final
    print_header("RESUMEN DE EJECUCIÓN")

    print(f"\n📊 Estadísticas:")
    print(f"   - Scripts ejecutados:    {successful}/{total_scripts}")
    print(f"   - Scripts exitosos:      {successful}")
    print(f"   - Scripts fallidos:      {len(failed)}")
    print(f"   - Scripts saltados:      {len(skipped)}")

    if failed:
        print(f"\n❌ Scripts que fallaron:")
        for script_name in failed:
            print(f"   - {script_name}")

    if skipped:
        print(f"\n⏭️ Scripts saltados:")
        for script_name in skipped:
            print(f"   - {script_name}")

    if successful == total_scripts - len(skipped):
        print("\n" + "=" * 80)
        print("✅ SEED BASE FINALIZADO CON ÉXITO".center(80))
        print("=" * 80)
        print("\n🎯 DATOS BASE CREADOS - SISTEMA LISTO PARA PRUEBAS")
        print("\n📦 Datos disponibles:")
        print("   ✅ Empresa base (Snabbit) + Sucursales")
        print("   ✅ Grupos de permisos")
        print("   ✅ Superusuario (si no existía)")
        print("   ✅ Empresas cliente + Relaciones")
        print("   ✅ Categorías + Fabricantes + Proveedores")
        print("   ✅ Items + Stock en bodegas")
        print("   ✅ Software catálogo")
        print("\n🧪 Flujos listos para probar manualmente:")
        print("   • Crear Órdenes de Trabajo (V2)")
        print("   • Crear Contratos con clientes")
        print("   • Crear Cotizaciones con items")
        print("   • Crear Visitas de Soporte")
        print("   • Movimientos de Bodega (Guías Salida/Entrada)")
        print("   • Órdenes de Compra y Compras")
        print("   • Rendiciones de gastos")
        print("   • Solicitudes de Vacaciones")
        print("\n💡 Iniciar sistema:")
        print("   1. Backend:  backend\\ENV\\Scripts\\python.exe manage.py runserver")
        print("   2. Frontend: cd frontend && npm run dev")
        print("   3. Acceder:  http://localhost:5173")
        print("   4. Login:    admin@snabbit.cl / [password configurado]")
        print()
        return 0
    else:
        print("\n" + "=" * 80)
        print("⚠️ SEED BASE FINALIZADO CON ERRORES".center(80))
        print("=" * 80)
        print("\n💡 Recomendaciones:")
        print("   1. Revisar errores arriba")
        print("   2. Ejecutar scripts individualmente para debugging")
        print("   3. Verificar prerequisitos de cada script")
        return 1


def bootstrap_django():
    this_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.abspath(os.path.join(this_dir, "..", "..", ".."))
    backend_path = os.path.join(repo_root, "backend")
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    try:
        os.chdir(backend_path)
    except Exception:
        pass

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")
    django.setup()


def ensure_company_and_branch():
    from empresas.models import Empresa, SucursalEmpresa

    empresa, _ = Empresa.objects.get_or_create(
        rut_empresa="11111111-1",
        defaults={
            "nombre": "Snabbit",
            "direccion_principal": "Direccion Principal 123",
            "telefono": "+56912345678",
            "email": "contacto@snabbit.cl",
        },
    )
    sucursal, _ = SucursalEmpresa.objects.get_or_create(
        empresa=empresa,
        nombre="Casa Matriz",
        defaults={
            "direccion": empresa.direccion_principal,
            "telefono": empresa.telefono,
            "email": empresa.email,
        },
    )
    return empresa, sucursal


def ensure_client_companies(prestador):
    from empresas.models import Empresa, RelacionEmpresa

    clientes_data = [
        {"nombre": "AYG ASOCIADOS", "rut_empresa": "76123456-7"},
        {"nombre": "CAMACOES", "rut_empresa": "76345678-5"},
        {"nombre": "MOLINA RIOS", "rut_empresa": "76456789-0"},
    ]
    clientes = []
    for data in clientes_data:
        cliente, _ = Empresa.objects.get_or_create(
            rut_empresa=data["rut_empresa"],
            defaults={
                "nombre": data["nombre"],
                "direccion_principal": "Direccion Cliente",
                "telefono": "+56900000000",
                "email": "contacto@cliente.cl",
            },
        )
        clientes.append(cliente)
        RelacionEmpresa.objects.get_or_create(
            prestador_servicios=prestador, cliente=cliente
        )
    return clientes


def ensure_catalogs(empresa):
    from items.models import Categoria, Fabricante, ProveedorEmpresa

    categorias = {}
    for nombre in ["Camaras de Seguridad", "Cables y Conectores", "Accesorios"]:
        categoria, _ = Categoria.objects.get_or_create(nombre=nombre)
        categorias[nombre] = categoria

    fabricantes = {}
    for nombre in ["Hikvision", "Dahua", "Generico"]:
        fabricante, _ = Fabricante.objects.get_or_create(nombre=nombre)
        fabricantes[nombre] = fabricante

    # Proveedores con tipo de moneda definido para pruebas
    proveedor_clp, _ = ProveedorEmpresa.objects.get_or_create(
        rut="77777777-7",
        defaults={
            "nombre": "Proveedor Demo",
            "empresa": empresa,
            "direccion": "Direccion Proveedor 123",
            "telefono": "+56911111111",
            "email_ejecutivo": "ventas@proveedor.cl",
            "tipo_moneda": "2",  # CLP
        },
        empresa=empresa,
    )

    proveedor_usd, _ = ProveedorEmpresa.objects.get_or_create(
        rut="76555666-7",
        defaults={
            "nombre": "Importadora TechPro",
            "empresa": empresa,
            "direccion": "Av. Providencia 1234, Santiago",
            "telefono": "+56912345678",
            "email_ejecutivo": "j.perez@techpro.cl",
            "tipo_moneda": "1",  # USD
            "recargo_dolar": 5,
        },
        empresa=empresa,
    )

    proveedor_uf, _ = ProveedorEmpresa.objects.get_or_create(
        rut="76666777-5",
        defaults={
            "nombre": "Proveedor UF",
            "empresa": empresa,
            "direccion": "Direccion UF 123",
            "telefono": "+56922222222",
            "email_ejecutivo": "ventas@proveedoruf.cl",
            "tipo_moneda": "3",  # UF
        },
        empresa=empresa,
    )
    return categorias, fabricantes, proveedor_clp


def ensure_items_and_stock(empresa, sucursal, categorias, fabricantes):
    from items.models import ItemEmpresa
    from bodegas.models import Bodega, StockItemEnBodega

    bodega, _ = Bodega.objects.get_or_create(
        nombre="Bodega Principal",
        sucursal=sucursal,
    )

    items_data = [
        {
            "nombre": "Camara Domo 2MP",
            "categoria": categorias["Camaras de Seguridad"],
            "fabricante": fabricantes["Hikvision"],
            "cantidad": 6,
        },
        {
            "nombre": "DVR 8 Canales",
            "categoria": categorias["Camaras de Seguridad"],
            "fabricante": fabricantes["Dahua"],
            "cantidad": 4,
        },
        {
            "nombre": "Cable UTP Cat5e",
            "categoria": categorias["Cables y Conectores"],
            "fabricante": fabricantes["Generico"],
            "cantidad": 20,
        },
        {
            "nombre": "Canaleta 20x10",
            "categoria": categorias["Accesorios"],
            "fabricante": fabricantes["Generico"],
            "cantidad": 15,
        },
        {
            "nombre": "Fuente 12V 2A",
            "categoria": categorias["Accesorios"],
            "fabricante": fabricantes["Generico"],
            "cantidad": 8,
        },
    ]

    for data in items_data:
        item, _ = ItemEmpresa.objects.get_or_create(
            empresa=empresa,
            nombre=data["nombre"],
            defaults={
                "categoria": data["categoria"],
                "fabricante": data["fabricante"],
                "descripcion_corta": data["nombre"],
            },
        )
        stock, created = StockItemEnBodega.objects.get_or_create(
            item=item,
            defaults={"bodega": bodega, "cantidad": data["cantidad"], "pmp": 0},
        )
        if not created and stock.cantidad < data["cantidad"]:
            stock.cantidad = data["cantidad"]
            stock.save(update_fields=["cantidad"])


def ensure_software():
    from core.models import Software

    for nombre in ["Windows", "Office", "Antivirus"]:
        Software.objects.get_or_create(nombre=nombre)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--internal":
        # Ejecutar lógica original de seed
        bootstrap_django()
        # Ensure required tables exist (dev branch does not track migrations).
        apps_to_migrate = [
            "core",
            "cuentas",
            "empresas",
            "items",
            "bodegas",
            "recursos",
            "cotizaciones",
            "contratos",
            "visitas",
            "calendario",
            "activos",
            "rendiciones",
            "retroalimentacion",
            "vacaciones",
        ]
        try:
            call_command("makemigrations", *apps_to_migrate, "--noinput")
            call_command("migrate", "--noinput")
        except Exception as exc:
            print("Failed to apply migrations automatically:", exc)
            print("Run: backend\\ENV\\Scripts\\python.exe manage.py migrate")
            raise
        empresa, sucursal = ensure_company_and_branch()
        ensure_client_companies(empresa)
        categorias, fabricantes, _ = ensure_catalogs(empresa)
        ensure_items_and_stock(empresa, sucursal, categorias, fabricantes)
        ensure_software()
        print("Seed base completed.")
    else:
        # Ejecutar orquestador
        sys.exit(main())
        },
    )
    return empresa, sucursal


def ensure_client_companies(prestador):
    from empresas.models import Empresa, RelacionEmpresa

    clientes_data = [
        {"nombre": "AYG ASOCIADOS", "rut_empresa": "76123456-7"},
        {"nombre": "CAMACOES", "rut_empresa": "76345678-5"},
        {"nombre": "MOLINA RIOS", "rut_empresa": "76456789-0"},
    ]
    clientes = []
    for data in clientes_data:
        cliente, _ = Empresa.objects.get_or_create(
            rut_empresa=data["rut_empresa"],
            defaults={
                "nombre": data["nombre"],
                "direccion_principal": "Direccion Cliente",
                "telefono": "+56900000000",
                "email": "contacto@cliente.cl",
            },
        )
        clientes.append(cliente)
        RelacionEmpresa.objects.get_or_create(
            prestador_servicios=prestador, cliente=cliente
        )
    return clientes


def ensure_catalogs(empresa):
    from items.models import Categoria, Fabricante, ProveedorEmpresa

    categorias = {}
    for nombre in ["Camaras de Seguridad", "Cables y Conectores", "Accesorios"]:
        categoria, _ = Categoria.objects.get_or_create(nombre=nombre)
        categorias[nombre] = categoria

    fabricantes = {}
    for nombre in ["Hikvision", "Dahua", "Generico"]:
        fabricante, _ = Fabricante.objects.get_or_create(nombre=nombre)
        fabricantes[nombre] = fabricante

    # Proveedores con tipo de moneda definido para pruebas
    proveedor_clp, _ = ProveedorEmpresa.objects.get_or_create(
        rut="77777777-7",
        defaults={
            "nombre": "Proveedor Demo",
            "empresa": empresa,
            "direccion": "Direccion Proveedor 123",
            "telefono": "+56911111111",
            "email_ejecutivo": "ventas@proveedor.cl",
            "tipo_moneda": "2",  # CLP
        },
        empresa=empresa,
    )

    proveedor_usd, _ = ProveedorEmpresa.objects.get_or_create(
        rut="76555666-7",
        defaults={
            "nombre": "Importadora TechPro",
            "empresa": empresa,
            "direccion": "Av. Providencia 1234, Santiago",
            "telefono": "+56912345678",
            "email_ejecutivo": "j.perez@techpro.cl",
            "tipo_moneda": "1",  # USD
            "recargo_dolar": 5,
        },
        empresa=empresa,
    )

    proveedor_uf, _ = ProveedorEmpresa.objects.get_or_create(
        rut="76666777-5",
        defaults={
            "nombre": "Proveedor UF",
            "empresa": empresa,
            "direccion": "Direccion UF 123",
            "telefono": "+56922222222",
            "email_ejecutivo": "ventas@proveedoruf.cl",
            "tipo_moneda": "3",  # UF
        },
        empresa=empresa,
    )
    return categorias, fabricantes, proveedor_clp


def ensure_items_and_stock(empresa, sucursal, categorias, fabricantes):
    from items.models import ItemEmpresa
    from bodegas.models import Bodega, StockItemEnBodega

    bodega, _ = Bodega.objects.get_or_create(
        nombre="Bodega Principal",
        sucursal=sucursal,
    )

    items_data = [
        {
            "nombre": "Camara Domo 2MP",
            "categoria": categorias["Camaras de Seguridad"],
            "fabricante": fabricantes["Hikvision"],
            "cantidad": 6,
        },
        {
            "nombre": "DVR 8 Canales",
            "categoria": categorias["Camaras de Seguridad"],
            "fabricante": fabricantes["Dahua"],
            "cantidad": 4,
        },
        {
            "nombre": "Cable UTP Cat5e",
            "categoria": categorias["Cables y Conectores"],
            "fabricante": fabricantes["Generico"],
            "cantidad": 20,
        },
        {
            "nombre": "Canaleta 20x10",
            "categoria": categorias["Accesorios"],
            "fabricante": fabricantes["Generico"],
            "cantidad": 15,
        },
        {
            "nombre": "Fuente 12V 2A",
            "categoria": categorias["Accesorios"],
            "fabricante": fabricantes["Generico"],
            "cantidad": 8,
        },
    ]

    for data in items_data:
        item, _ = ItemEmpresa.objects.get_or_create(
            empresa=empresa,
            nombre=data["nombre"],
            defaults={
                "categoria": data["categoria"],
                "fabricante": data["fabricante"],
                "descripcion_corta": data["nombre"],
            },
        )
        stock, created = StockItemEnBodega.objects.get_or_create(
            item=item,
            defaults={"bodega": bodega, "cantidad": data["cantidad"], "pmp": 0},
        )
        if not created and stock.cantidad < data["cantidad"]:
            stock.cantidad = data["cantidad"]
            stock.save(update_fields=["cantidad"])


def ensure_software():
    from core.models import Software

    for nombre in ["Windows", "Office", "Antivirus"]:
        Software.objects.get_or_create(nombre=nombre)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--internal":
        # Ejecutar lógica original de seed
        bootstrap_django()
        # Ensure required tables exist (dev branch does not track migrations).
        apps_to_migrate = [
            "core",
            "cuentas",
            "empresas",
            "items",
            "bodegas",
            "recursos",
            "cotizaciones",
            "contratos",
            "visitas",
            "calendario",
            "activos",
            "rendiciones",
            "retroalimentacion",
            "vacaciones",
        ]
        try:
            call_command("makemigrations", *apps_to_migrate, "--noinput")
            call_command("migrate", "--noinput")
        except Exception as exc:
            print("Failed to apply migrations automatically:", exc)
            print("Run: backend\\ENV\\Scripts\\python.exe manage.py migrate")
            raise
        empresa, sucursal = ensure_company_and_branch()
        ensure_client_companies(empresa)
        categorias, fabricantes, _ = ensure_catalogs(empresa)
        ensure_items_and_stock(empresa, sucursal, categorias, fabricantes)
        ensure_software()
        print("Seed base completed.")
    else:
        # Ejecutar orquestador
        sys.exit(main())
