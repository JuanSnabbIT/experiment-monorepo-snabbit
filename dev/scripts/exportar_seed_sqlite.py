#!/usr/bin/env python
"""
Exporta todos los datos de seed desde la BD local (SQLite dev) usando Django ORM.

Reemplaza exportar_seed_postgres.py + exportar_seed_contratos.py en el flujo local.
Para exportar desde un PostgreSQL remoto, sigue usando exportar_seed_postgres.py.

Escribe en: dev/scripts/datos_exportados/seed_datos.json

Grupos exportados:
  AUTH / EMPRESAS:
    auth_group, empresas_empresa, empresas_sucursalempresa,
    empresas_relacionempresa, cuentas_user, empresas_usuarioempresa
    (+M2M grupos), core_personalizacionusuario

  INVENTARIO:
    items_categoria, items_fabricante, items_proveedorempresa,
    items_itemempresa (+M2M proveedores_ids embebido),
    bodegas_bodega, bodegas_stockitemenbodega,
    bodegas_serieitem (solo estado='disponible')

  CONTRATOS CATALOGO:
    contratos_etiquetaplantilla, contratos_caracteristicaservicio,
    contratos_servicio (+alcance por nombre),
    contratos_licencia,
    contratos_planservicio (+detalles por nombre de servicio),
    contratos_plantillacontrato (+secciones, solo la plantilla canonica)

Campos OMITIDOS por seguridad:
  cuentas_user      : password, image
  empresas_empresa  : logo, firma_empresa

Uso:
    cd backend
    python ..\\dev\\scripts\\exportar_seed_sqlite.py
"""
from __future__ import annotations

import json
import os
import sys
from decimal import Decimal
from pathlib import Path

# ---------------------------------------------------------------------------
# Setup Django
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_PATH = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_PATH))
os.chdir(BACKEND_PATH)

# Forzar SQLite local: no usar el settings normal (que apunta a PG),
# configurar Django manualmente con una BD SQLite.
_SQLITE_PATH = BACKEND_PATH / "db.sqlite3"

import django
from django.conf import settings as dj_settings

# Configurar Django directamente (sin cargar sw_erp.settings) si no esta aun configurado
if not dj_settings.configured:
    # Importar settings originales para obtener INSTALLED_APPS etc.
    os.environ["DJANGO_SETTINGS_MODULE"] = "sw_erp.settings"
    import importlib
    _orig = importlib.import_module("sw_erp.settings")
    _orig_dict = {k: getattr(_orig, k) for k in dir(_orig) if k.isupper()}
    # Sobreescribir la BD
    _orig_dict["DATABASES"] = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": str(_SQLITE_PATH),
        }
    }
    dj_settings.configure(**_orig_dict)

django.setup()

OUTPUT_DIR = REPO_ROOT / "dev" / "scripts" / "datos_exportados"
OUTPUT_FILE = OUTPUT_DIR / "seed_datos.json"


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------
class JsonEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)


def print_ok(msg: str):
    print(f"  OK  {msg}")


def print_section(title: str):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print("=" * 60)


# ---------------------------------------------------------------------------
# AUTH / EMPRESAS
# ---------------------------------------------------------------------------

def exportar_grupos() -> list:
    from django.contrib.auth.models import Group
    return [{"id": g.id, "name": g.name} for g in Group.objects.all().order_by("id")]


def exportar_empresas() -> list:
    from empresas.models import Empresa
    result = []
    for e in Empresa.objects.all().order_by("id"):
        result.append({
            "id": e.id,
            "nombre": e.nombre,
            "rut_empresa": e.rut_empresa,
            "email": e.email,
            "telefono": e.telefono,
            "giro": e.giro,
            "nombre_fantasia": e.nombre_fantasia,
            "representante_legal": e.representante_legal,
            "rut_representante": e.rut_representante,
            "direccion_principal": e.direccion_principal,
            "recargo": e.recargo,
            "ppm": e.ppm,
        })
    return result


def exportar_sucursales() -> list:
    from empresas.models import SucursalEmpresa
    result = []
    for s in SucursalEmpresa.objects.all().order_by("empresa_id", "id"):
        result.append({
            "id": s.id,
            "nombre": s.nombre,
            "empresa_id": s.empresa_id,
            "direccion": s.direccion,
            "region": s.region,
            "provincia": s.provincia,
            "comuna": s.comuna,
            "telefono": s.telefono,
            "email": s.email,
        })
    return result


def exportar_relaciones_empresa() -> list:
    from empresas.models import RelacionEmpresa
    result = []
    for r in RelacionEmpresa.objects.all().order_by("id"):
        result.append({
            "id": r.id,
            "prestador_servicios_id": r.prestador_servicios_id,
            "cliente_id": r.cliente_id,
            "tipo_relacion": r.tipo_relacion,
        })
    return result


def exportar_usuarios() -> list:
    from django.contrib.auth import get_user_model
    User = get_user_model()
    result = []
    # Defer campos que pueden no existir en la BD si hay migraciones pendientes
    DEFER_CAMPOS = ("nivel_estudios", "titulo_especialidad", "institucion_educacional")
    for u in User.objects.all().defer(*DEFER_CAMPOS).order_by("id"):
        result.append({
            "id": u.id,
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "second_name": u.second_name,
            "second_last_name": u.second_last_name,
            "is_active": u.is_active,
            "is_staff": u.is_staff,
            "is_superuser": u.is_superuser,
            "rut": u.rut,
            "celular": u.celular,
            "region": u.region,
            "provincia": u.provincia,
            "comuna": u.comuna,
            "direccion": u.direccion,
        })
    return result


def exportar_usuarios_empresa() -> list:
    from empresas.models import UsuarioEmpresa
    result = []
    # Defer campos FK que pueden no existir en la BD si hay migraciones pendientes
    DEFER_UE = ("afp",)
    for ue in UsuarioEmpresa.objects.all().defer(*DEFER_UE).order_by("id"):
        result.append({
            "id": ue.id,
            "usuario_id": ue.usuario_id,
            "sucursal_id": ue.sucursal_id,
            "cargo": ue.cargo,
            "rut": ue.rut,
            "estado": ue.estado,
            "fecha_ingreso": str(ue.fecha_ingreso) if ue.fecha_ingreso else None,
            "fecha_contrato": str(ue.fecha_contrato) if ue.fecha_contrato else None,
        })
    return result


def exportar_usuarios_empresa_grupos() -> list:
    """M2M: UsuarioEmpresa <-> Group."""
    from empresas.models import UsuarioEmpresa
    result = []
    for ue in UsuarioEmpresa.objects.defer("afp").prefetch_related("grupos").order_by("id"):
        for g in ue.grupos.all():
            result.append({"usuarioempresa_id": ue.id, "group_id": g.id})
    return result


def exportar_personalizaciones() -> list:
    from core.models import PersonalizacionUsuario
    result = []
    for p in PersonalizacionUsuario.objects.all().order_by("id"):
        result.append({
            "id": p.id,
            "usuario_id": p.usuario_id,
            "sucursal_principal_id": p.sucursal_principal_id,
            "tema": p.tema,
            "font_size": p.font_size,
        })
    return result


# ---------------------------------------------------------------------------
# INVENTARIO
# ---------------------------------------------------------------------------

def exportar_categorias() -> list:
    from items.models import Categoria
    return [{"id": c.id, "nombre": c.nombre} for c in Categoria.objects.all().order_by("nombre")]


def exportar_fabricantes() -> list:
    from items.models import Fabricante
    result = []
    for f in Fabricante.objects.all().order_by("nombre"):
        result.append({
            "id": f.id,
            "nombre": f.nombre,
            "pagina_web": f.pagina_web,
            "email_soporte": f.email_soporte,
            "telefono_soporte": f.telefono_soporte,
        })
    return result


def exportar_proveedores() -> list:
    from items.models import ProveedorEmpresa
    result = []
    for p in ProveedorEmpresa.objects.all().order_by("empresa_id", "nombre"):
        result.append({
            "id": p.id,
            "nombre": p.nombre,
            "rut": p.rut,
            "empresa_id": p.empresa_id,
            "direccion": p.direccion,
            "region": p.region,
            "provincia": p.provincia,
            "comuna": p.comuna,
            "pagina_web": p.pagina_web,
            "telefono": p.telefono,
            "ejecutivo_asignado": p.ejecutivo_asignado,
            "email_ejecutivo": p.email_ejecutivo,
            "tipo_moneda": p.tipo_moneda,
            "recargo_dolar": p.recargo_dolar,
            "catalogo_web": p.catalogo_web,
        })
    return result


def exportar_items() -> list:
    """Exporta items con proveedores M2M embebidos como lista de IDs originales."""
    from items.models import ItemEmpresa
    result = []
    for item in (
        ItemEmpresa.objects
        .select_related("fabricante", "categoria", "empresa")
        .prefetch_related("proveedores_empresa")
        .order_by("empresa_id", "nombre")
    ):
        proveedores_ids = list(item.proveedores_empresa.values_list("id", flat=True))
        result.append({
            "id": item.id,
            "nombre": item.nombre,
            "descripcion_corta": item.descripcion_corta,
            "empresa_id": item.empresa_id,
            "fabricante_id": item.fabricante_id,
            "categoria_id": item.categoria_id,
            "comentarios": item.comentarios,
            "codigo_barras": item.codigo_barras,
            "es_equipo": item.es_equipo,
            "proveedores_ids": proveedores_ids,
        })
    return result


def exportar_bodegas() -> list:
    from bodegas.models import Bodega
    result = []
    for b in Bodega.objects.all().order_by("sucursal_id", "nombre"):
        result.append({"id": b.id, "nombre": b.nombre, "sucursal_id": b.sucursal_id})
    return result


def exportar_stock() -> list:
    from bodegas.models import StockItemEnBodega
    result = []
    for s in StockItemEnBodega.objects.all().order_by("bodega_id", "item_id"):
        result.append({
            "id": s.id,
            "bodega_id": s.bodega_id,
            "item_id": s.item_id,
            "cantidad": s.cantidad,
            "pmp": s.pmp,
            "stock_minimo": s.stock_minimo,
        })
    return result


def exportar_series() -> list:
    """Exporta series en estado 'disponible'. Omite reservadas/despachadas/devueltas."""
    from bodegas.models import SerieItem
    result = []
    for s in SerieItem.objects.filter(estado="disponible").order_by("empresa_id", "id"):
        result.append({
            "id": s.id,
            "serie": s.serie,
            "estado": s.estado,
            "empresa_id": s.empresa_id,
            "stock_item_id": s.stock_item_id,
        })
    return result


# ---------------------------------------------------------------------------
# CONTRATOS CATALOGO
# ---------------------------------------------------------------------------

def exportar_etiquetas() -> list:
    from contratos.models import EtiquetaPlantilla
    result = []
    for e in EtiquetaPlantilla.objects.all().order_by("categoria", "clave"):
        result.append({
            "id": e.id,
            "clave": e.clave,
            "nombre_display": e.nombre_display,
            "categoria": e.categoria,
            "origen_dato": e.origen_dato,
            "descripcion": e.descripcion,
            "valor_default": e.valor_default,
            "empresa_prestadora_rut": (
                e.empresa_prestadora.rut_empresa if e.empresa_prestadora else None
            ),
        })
    return result


def exportar_caracteristicas() -> list:
    from contratos.models import CaracteristicaServicio
    result = []
    for c in CaracteristicaServicio.objects.all().order_by("nombre"):
        result.append({
            "id": c.id,
            "nombre": c.nombre,
            "descripcion": c.descripcion,
            "activo": c.activo,
            "empresa_prestadora_rut": (
                c.empresa_prestadora.rut_empresa if c.empresa_prestadora else None
            ),
            "empresa_prestadora_nombre": (
                c.empresa_prestadora.nombre if c.empresa_prestadora else None
            ),
        })
    return result


def exportar_servicios() -> list:
    from contratos.models import Servicio
    result = []
    for s in Servicio.objects.all().order_by("nombre"):
        alcance = [
            {
                "caracteristica_nombre": item.caracteristica.nombre,
                "modo": item.modo,
                "orden": item.orden,
            }
            for item in s.alcance_items.select_related("caracteristica").order_by("orden", "id")
        ]
        result.append({
            "id": s.id,
            "nombre": s.nombre,
            "descripcion": s.descripcion,
            "categoria": s.categoria,
            "activo": s.activo,
            "es_vigente": s.es_vigente,
            "precio": str(s.precio),
            "tipo_moneda": s.tipo_moneda,
            "veces_por_mes_default": s.veces_por_mes_default,
            "formas_pago_permitidas": s.formas_pago_permitidas,
            "incluye": s.incluye,
            "no_incluye": s.no_incluye,
            "clausulas_especiales": s.clausulas_especiales,
            "version": s.version,
            "alcance_items": alcance,
            "empresa_prestadora_rut": (
                s.empresa_prestadora.rut_empresa if s.empresa_prestadora else None
            ),
            "empresa_prestadora_nombre": (
                s.empresa_prestadora.nombre if s.empresa_prestadora else None
            ),
        })
    return result


def exportar_licencias() -> list:
    from contratos.models import Licencia
    result = []
    for lic in Licencia.objects.all().order_by("nombre"):
        result.append({
            "id": lic.id,
            "nombre": lic.nombre,
            "proveedor": lic.proveedor,
            "descripcion": lic.descripcion,
            "numero_parte": lic.numero_parte,
            "modalidad_base": lic.modalidad_base,
            "modalidad_anual_forma_pago": lic.modalidad_anual_forma_pago,
            "precio_partner": str(lic.precio_partner),
            "precio_venta": str(lic.precio_venta),
            "moneda": lic.moneda,
            "activo": lic.activo,
            "empresa_prestadora_rut": (
                lic.empresa_prestadora.rut_empresa if lic.empresa_prestadora else None
            ),
            "empresa_prestadora_nombre": (
                lic.empresa_prestadora.nombre if lic.empresa_prestadora else None
            ),
        })
    return result


def exportar_planes() -> list:
    from contratos.models import PlanServicio
    result = []
    for p in PlanServicio.objects.all().order_by("nombre"):
        detalles = [
            {
                "servicio_nombre": d.servicio_version.nombre,
                "orden": d.orden,
                "obligatorio": d.obligatorio,
                "cantidad_default": d.cantidad_default,
                "veces_por_mes_default": d.veces_por_mes_default,
            }
            for d in p.detalles_servicio.select_related("servicio_version").order_by("orden", "id")
        ]
        result.append({
            "id": p.id,
            "nombre": p.nombre,
            "descripcion": p.descripcion,
            "version": p.version,
            "activo": p.activo,
            "es_vigente": p.es_vigente,
            "precio": str(p.precio),
            "precio_anual": str(p.precio_anual) if p.precio_anual is not None else None,
            "tipo_moneda": p.tipo_moneda,
            "veces_por_mes_default": p.veces_por_mes_default,
            "num_visitas_mensuales": p.num_visitas_mensuales,
            "formas_pago_permitidas": p.formas_pago_permitidas,
            "incluye": p.incluye,
            "no_incluye": p.no_incluye,
            "clausulas_especiales": p.clausulas_especiales,
            "detalles_servicio": detalles,
            "empresa_prestadora_rut": (
                p.empresa_prestadora.rut_empresa if p.empresa_prestadora else None
            ),
            "empresa_prestadora_nombre": (
                p.empresa_prestadora.nombre if p.empresa_prestadora else None
            ),
        })
    return result


def exportar_plantilla_servicios() -> dict | None:
    """Exporta la plantilla canonica de SERVICIOS TECNOLOGICOS Y ASESORIAS."""
    from contratos.models import PlantillaContrato
    TITULO = "CONTRATO DE SERVICIOS TECNOLOGICOS Y ASESORIAS"
    DEFER_PC = ("empresa_cliente_id",)
    qs = PlantillaContrato.objects.filter(titulo=TITULO).defer(*DEFER_PC).order_by("id")
    if not qs.exists():
        return None
    plantilla = qs.filter(es_default=True).first() or qs.first()
    secciones = [
        {
            "titulo": s.titulo,
            "tipo": s.tipo,
            "contenido_template": s.contenido_template,
            "orden": s.orden,
            "slot_documental": s.slot_documental,
            "orden_en_slot": s.orden_en_slot,
            "es_editable_en_contrato": s.es_editable_en_contrato,
            "es_obligatoria": s.es_obligatoria,
        }
        for s in plantilla.secciones.all().defer("contenido_template_estructurado", "mostrar_numero", "plantilla").order_by("orden")
    ]
    return {
        "titulo": plantilla.titulo,
        "descripcion": plantilla.descripcion,
        "version": plantilla.version,
        "tipo_contrato": plantilla.tipo_contrato,
        "activa": plantilla.activa,
        "requiere_nda": plantilla.requiere_nda,
        "orden_bloque_alcance": plantilla.orden_bloque_alcance,
        "orden_bloque_operacion": plantilla.orden_bloque_operacion,
        "orden_bloque_condiciones": plantilla.orden_bloque_condiciones,
        "secciones": secciones,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    datos: dict = {}

    print_section("AUTH / EMPRESAS")
    datos["grupos"] = exportar_grupos()
    print_ok(f"{len(datos['grupos'])} grupos")
    datos["empresas"] = exportar_empresas()
    print_ok(f"{len(datos['empresas'])} empresas")
    datos["sucursales"] = exportar_sucursales()
    print_ok(f"{len(datos['sucursales'])} sucursales")
    datos["relaciones_empresa"] = exportar_relaciones_empresa()
    print_ok(f"{len(datos['relaciones_empresa'])} relaciones empresa")
    datos["usuarios"] = exportar_usuarios()
    print_ok(f"{len(datos['usuarios'])} usuarios")
    datos["usuarios_empresa"] = exportar_usuarios_empresa()
    print_ok(f"{len(datos['usuarios_empresa'])} UsuarioEmpresa")
    datos["usuarios_empresa_grupos"] = exportar_usuarios_empresa_grupos()
    print_ok(f"{len(datos['usuarios_empresa_grupos'])} asignaciones de grupo")
    datos["personalizaciones"] = exportar_personalizaciones()
    print_ok(f"{len(datos['personalizaciones'])} personalizaciones")

    print_section("INVENTARIO")
    datos["categorias"] = exportar_categorias()
    print_ok(f"{len(datos['categorias'])} categorias")
    datos["fabricantes"] = exportar_fabricantes()
    print_ok(f"{len(datos['fabricantes'])} fabricantes")
    datos["proveedores"] = exportar_proveedores()
    print_ok(f"{len(datos['proveedores'])} proveedores")
    datos["items"] = exportar_items()
    print_ok(f"{len(datos['items'])} items (M2M proveedores embebido)")
    datos["bodegas"] = exportar_bodegas()
    print_ok(f"{len(datos['bodegas'])} bodegas")
    datos["stock"] = exportar_stock()
    print_ok(f"{len(datos['stock'])} registros de stock")
    datos["series"] = exportar_series()
    print_ok(f"{len(datos['series'])} series disponibles")

    print_section("CONTRATOS CATALOGO")
    datos["etiquetas"] = exportar_etiquetas()
    print_ok(f"{len(datos['etiquetas'])} etiquetas de plantilla")
    datos["caracteristicas"] = exportar_caracteristicas()
    print_ok(f"{len(datos['caracteristicas'])} caracteristicas de servicio")
    datos["servicios"] = exportar_servicios()
    print_ok(f"{len(datos['servicios'])} servicios")
    datos["licencias"] = exportar_licencias()
    print_ok(f"{len(datos['licencias'])} licencias")
    datos["planes"] = exportar_planes()
    print_ok(f"{len(datos['planes'])} planes")
    datos["plantilla_servicios"] = exportar_plantilla_servicios()
    if datos["plantilla_servicios"]:
        n = len(datos["plantilla_servicios"]["secciones"])
        print_ok(f"Plantilla servicios tecnologicos: {n} secciones")
    else:
        print("  AVISO: no se encontro plantilla de servicios tecnologicos")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2, cls=JsonEncoder)

    size_kb = OUTPUT_FILE.stat().st_size / 1024
    print(f"\n{'=' * 60}")
    print(f"  Exportacion completada")
    print(f"  Archivo : {OUTPUT_FILE}")
    print(f"  Tamano  : {size_kb:.1f} KB")
    print("=" * 60)


if __name__ == "__main__":
    main()
