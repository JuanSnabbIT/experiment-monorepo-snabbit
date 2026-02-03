#!/usr/bin/env python
"""
Script de verificación de datos creados por seed_base.py

Valida:
- Empresa base y sucursal
- Empresas cliente
- Usuarios y personalizaciones
- Items, proveedores, bodegas, stock
- Relaciones empresa-cliente
- Recargo y PPM en rangos correctos
"""
import os
import sys
import django

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

bootstrap_django()

from django.contrib.auth import get_user_model
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa, RelacionEmpresa
from bodegas.models import Bodega, StockItemEnBodega
from items.models import ItemEmpresa, ProveedorEmpresa, Categoria, Fabricante
from core.models import PersonalizacionUsuario
from contratos.models import Servicio, Visita, Licencia

User = get_user_model()


def print_section(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def check_pass(condition, message):
    status = "✅" if condition else "❌"
    print(f"{status} {message}")
    return condition


def main():
    print("\n" + "┌" + "─" * 68 + "┐")
    print("│" + "VERIFICACIÓN DE DATOS - seed_base.py".center(68) + "│")
    print("└" + "─" * 68 + "┘")
    
    all_passed = True
    
    # 1. Empresa Base
    print_section("1. Empresa Base (Snabbit)")
    empresa_base = Empresa.objects.filter(rut_empresa="11111111-1").first()
    all_passed &= check_pass(empresa_base is not None, "Empresa Snabbit existe")
    
    if empresa_base:
        all_passed &= check_pass(
            22 <= empresa_base.recargo <= 28,
            f"Recargo en rango (22-28%): {empresa_base.recargo}%"
        )
        all_passed &= check_pass(
            3.0 <= float(empresa_base.ppm) <= 7.0,
            f"PPM en rango (3-7%): {empresa_base.ppm}%"
        )
    
    sucursal_base = SucursalEmpresa.objects.filter(
        empresa__rut_empresa="11111111-1",
        nombre="Casa Matriz"
    ).first()
    all_passed &= check_pass(sucursal_base is not None, "Sucursal Casa Matriz existe")
    
    if sucursal_base:
        all_passed &= check_pass(
            sucursal_base.region == 13,
            f"Región correcta: {sucursal_base.region}"
        )
        all_passed &= check_pass(
            sucursal_base.provincia == 131,
            f"Provincia correcta: {sucursal_base.provincia}"
        )
        all_passed &= check_pass(
            sucursal_base.comuna == 13101,
            f"Comuna correcta: {sucursal_base.comuna}"
        )
    
    # 2. Empresas Cliente
    print_section("2. Empresas Cliente")
    empresas_cliente = Empresa.objects.exclude(rut_empresa="11111111-1")
    count_clientes = empresas_cliente.count()
    all_passed &= check_pass(
        count_clientes >= 12,
        f"Empresas cliente creadas: {count_clientes}"
    )
    
    # Verificar recargo/PPM variables
    recargos_unicos = empresas_cliente.values('recargo').distinct().count()
    ppms_unicos = empresas_cliente.values('ppm').distinct().count()
    all_passed &= check_pass(
        recargos_unicos > 1,
        f"Recargos variables: {recargos_unicos} valores únicos"
    )
    all_passed &= check_pass(
        ppms_unicos > 1,
        f"PPMs variables: {ppms_unicos} valores únicos"
    )
    
    # 3. Usuarios
    print_section("3. Usuarios y Personalizaciones")
    total_users = User.objects.count()
    all_passed &= check_pass(
        total_users >= 41,
        f"Total usuarios: {total_users}"
    )
    
    total_personalizaciones = PersonalizacionUsuario.objects.count()
    all_passed &= check_pass(
        total_personalizaciones == total_users,
        f"PersonalizacionUsuario: {total_personalizaciones}/{total_users}"
    )
    
    usuarios_snabbit = UsuarioEmpresa.objects.filter(
        sucursal__empresa__rut_empresa="11111111-1"
    ).count()
    all_passed &= check_pass(
        usuarios_snabbit >= 5,
        f"Usuarios internos Snabbit: {usuarios_snabbit}"
    )
    
    superuser_exists = User.objects.filter(is_superuser=True).exists()
    all_passed &= check_pass(superuser_exists, "Superusuario existe")
    
    # 4. Relaciones Empresa
    print_section("4. Relaciones Empresa")
    relaciones = RelacionEmpresa.objects.filter(
        prestador_servicios__rut_empresa="11111111-1"
    ).count()
    all_passed &= check_pass(
        relaciones >= 12,
        f"RelacionEmpresa (Snabbit→Clientes): {relaciones}"
    )
    
    # 5. Items y Catálogos
    print_section("5. Items, Proveedores, Catálogos")
    items_count = ItemEmpresa.objects.filter(empresa__rut_empresa="11111111-1").count()
    all_passed &= check_pass(
        items_count >= 30,
        f"Items creados: {items_count}"
    )
    
    proveedores_count = ProveedorEmpresa.objects.filter(
        empresa__rut_empresa="11111111-1"
    ).count()
    all_passed &= check_pass(
        proveedores_count >= 10,
        f"Proveedores: {proveedores_count}"
    )
    
    categorias_count = Categoria.objects.count()
    all_passed &= check_pass(
        categorias_count >= 9,
        f"Categorías: {categorias_count}"
    )
    
    fabricantes_count = Fabricante.objects.count()
    all_passed &= check_pass(
        fabricantes_count >= 8,
        f"Fabricantes: {fabricantes_count}"
    )
    
    # 6. Bodegas y Stock
    print_section("6. Bodegas y Stock")
    bodegas_count = Bodega.objects.filter(
        sucursal__empresa__rut_empresa="11111111-1"
    ).count()
    all_passed &= check_pass(
        bodegas_count >= 2,
        f"Bodegas: {bodegas_count}"
    )
    
    stock_count = StockItemEnBodega.objects.filter(
        bodega__sucursal__empresa__rut_empresa="11111111-1"
    ).count()
    all_passed &= check_pass(
        stock_count >= 30,
        f"Registros de stock: {stock_count}"
    )
    
    # 7. Catálogos de Servicios
    print_section("7. Catálogos de Servicios")
    servicios_count = Servicio.objects.count()
    all_passed &= check_pass(
        servicios_count >= 5,
        f"Servicios: {servicios_count}"
    )
    
    visitas_count = Visita.objects.count()
    all_passed &= check_pass(
        visitas_count >= 3,
        f"Visitas: {visitas_count}"
    )
    
    licencias_count = Licencia.objects.count()
    all_passed &= check_pass(
        licencias_count >= 2,
        f"Licencias: {licencias_count}"
    )
    
    # Resumen Final
    print("\n" + "═" * 70)
    if all_passed:
        print("  🎉 TODAS LAS VERIFICACIONES PASARON".center(70))
        print("  Sistema correctamente inicializado".center(70))
    else:
        print("  ⚠️  ALGUNAS VERIFICACIONES FALLARON".center(70))
        print("  Revisar errores arriba".center(70))
    print("═" * 70 + "\n")
    
    return 0 if all_passed else 1


if __name__ == '__main__':
    sys.exit(main())
