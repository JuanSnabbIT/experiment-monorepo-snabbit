#!/usr/bin/env python
"""
Carga todos los datos de seed desde un unico JSON hacia la BD de Django.

Lee desde: dev/scripts/datos_exportados/seed_datos.json
(Generado por dev/scripts/exportar_seed_sqlite.py)

Orden de carga (respeta dependencias de FK):
  1. grupos              (auth.Group)
  2. empresas            (empresas.Empresa)
  3. sucursales          (empresas.SucursalEmpresa)
  4. relaciones_empresa  (empresas.RelacionEmpresa)
  5. usuarios            (cuentas.User - password=test1234)
  6. usuarios_empresa    (empresas.UsuarioEmpresa) + M2M grupos
  7. personalizaciones   (core.PersonalizacionUsuario)
  8. categorias          (items.Categoria)
  9. fabricantes         (items.Fabricante)
 10. proveedores         (items.ProveedorEmpresa)
 11. items               (items.ItemEmpresa) + M2M proveedores
 12. bodegas             (bodegas.Bodega)
 13. stock               (bodegas.StockItemEnBodega)
 14. series              (bodegas.SerieItem)
 15. etiquetas           (contratos.EtiquetaPlantilla)
 16. caracteristicas     (contratos.CaracteristicaServicio)
 17. servicios           (contratos.Servicio + alcance por nombre)
 18. licencias           (contratos.Licencia)
 19. planes              (contratos.PlanServicio + detalles por nombre)
 20. plantilla_servicios (contratos.PlantillaContrato - copia por empresa)
 21. plantilla_trabajador (contratos.PlantillaContrato - hardcoded, por empresa)

Uso:
    cd backend
    python ..\\dev\\scripts\\setup\\seeds\\seed_all.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Setup Django
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[4]
BACKEND_PATH = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_PATH))
os.chdir(BACKEND_PATH)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")

import django
django.setup()

from django.db import transaction  # noqa: E402

DATOS_FILE = REPO_ROOT / "dev" / "scripts" / "datos_exportados" / "seed_datos.json"
PASSWORD_DEFAULT = "test1234"

# ---------------------------------------------------------------------------
# Secciones hardcoded para plantilla de contrato de trabajador
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Notas de alineación con AdaptadorContratoTrabajador:
#   - empresa.ciudad    : Empresa no tiene campo ciudad; el adaptador usa
#                         direccion_principal como fallback.
#                         MEJORA FUTURA (Opción A): agregar CharField ciudad a Empresa.
#   - forma_pago        : No existe en ContratoTrabajador; texto fijo por ahora.
#                         MEJORA FUTURA (Opción A): agregar campo forma_pago a
#                         ContratoTrabajador y reemplazar texto fijo por [contrato.forma_pago].
#   - prestaciones      : Reemplazado por bonos existentes (bono_colacion, bono_movilizacion).
#                         MEJORA FUTURA (Opción A): agregar campo prestaciones_adicionales
#                         a ContratoTrabajador y usar [contrato.prestaciones_adicionales].
# ---------------------------------------------------------------------------
SECCIONES_TRABAJADOR = [
    {
        "orden": 1,
        "tipo": "encabezado",
        "titulo": "Contrato de Trabajo",
        "contenido_template": (
            "En [empresa.ciudad], a [contrato.fecha_inicio], "
            "entre [empresa.nombre], RUT [empresa.rut_empresa], representada "
            "legalmente por [empresa.representante_legal], RUT "
            "[empresa.rut_representante], en adelante el EMPLEADOR, y "
            "[trabajador.nombre_completo], de nacionalidad "
            "[trabajador.nacionalidad], estado civil [trabajador.estado_civil], "
            "RUT [trabajador.rut], con domicilio en [trabajador.direccion], "
            "en adelante el TRABAJADOR, se ha convenido el siguiente contrato "
            "de trabajo:"
        ),
    },
    {
        "orden": 2,
        "tipo": "clausula",
        "titulo": "PRIMERO: Funciones y lugar de trabajo",
        "contenido_template": (
            "El (la) TRABAJADOR(A) se compromete a desempenar el cargo de "
            "<b>[contrato.cargo]</b> en las instalaciones del EMPLEADOR "
            "ubicadas en [contrato.lugar_trabajo], pudiendo ser trasladado(a) "
            "a otro lugar dentro de la misma ciudad si las necesidades de la "
            "empresa lo requieren."
        ),
    },
    {
        "orden": 3,
        "tipo": "clausula",
        "titulo": "SEGUNDO: Jornada de trabajo",
        "contenido_template": (
            "La jornada de trabajo sera de tipo <b>[contrato.jornada]</b>, con "
            "un total de [contrato.horas_semanales] horas semanales. "
            "Horario: [contrato.horario_detalle]. Se excluye un tiempo de "
            "colacion diaria de [contrato.tiempo_colacion] minutos. "
            "El (la) trabajador(a) reconoce y acepta que, por necesidades del "
            "servicio, los horarios pueden modificarse con sujecion a las "
            "normas legales, y se compromete a realizar a peticion del "
            "EMPLEADOR hasta dos horas extraordinarias diarias si las "
            "necesidades de funcionamiento asi lo requieren."
        ),
    },
    {
        "orden": 4,
        "tipo": "clausula",
        "titulo": "TERCERO: Obligaciones del trabajador",
        "contenido_template": (
            "El (la) TRABAJADOR(A) se obliga a: (a) Guardar absoluta reserva "
            "sobre los negocios, operaciones y datos del EMPLEADOR y sus "
            "clientes; (b) No ejecutar durante la jornada de trabajo actos "
            "que no sean los propios de sus funciones, sin autorizacion del "
            "EMPLEADOR; (c) Cumplir fielmente las instrucciones y reglamentos "
            "internos de la empresa."
        ),
    },
    {
        "orden": 5,
        "tipo": "clausula",
        "titulo": "CUARTO: Remuneracion",
        # Opción A futura: agregar campo forma_pago a ContratoTrabajador y
        # reemplazar "mediante transferencia bancaria" por [contrato.forma_pago].
        "contenido_template": (
            "El EMPLEADOR pagara al (la) TRABAJADOR(A) una remuneracion "
            r"mensual bruta de <b>\$[remuneracion.sueldo_base]</b> "
            "([remuneracion.sueldo_base_palabras]), pagadera en "
            "forma mensual mediante transferencia bancaria a mes vencido. "
            "Esta remuneracion incluye todas las prestaciones en dinero o "
            "especies correspondientes al respectivo periodo de pago."
        ),
    },
    {
        "orden": 6,
        "tipo": "clausula",
        "titulo": "QUINTO: Prestaciones adicionales",
        # Opción A futura: agregar campo prestaciones_adicionales a ContratoTrabajador
        # y reemplazar los bonos individuales por [contrato.prestaciones_adicionales].
        "contenido_template": (
            "El EMPLEADOR otorgara adicionalmente al (la) TRABAJADOR(A) "
            r"las siguientes prestaciones: bono de colacion $[remuneracion.bono_colacion] "
            r"y bono de movilizacion $[remuneracion.bono_movilizacion]. "
            "Estas prestaciones no constituyen remuneracion y no son "
            "imponibles para los efectos legales."
        ),
    },
    {
        "orden": 7,
        "tipo": "clausula",
        "titulo": "SEXTO: Feriado legal",
        "contenido_template": (
            "El (la) TRABAJADOR(A) tendra derecho al feriado legal "
            "establecido en el Codigo del Trabajo, consistente en quince "
            "dias habiles de vacaciones anuales con goce de remuneracion "
            "integra, incrementandose en un dia habil adicional por cada "
            "tres anos de servicio prestados al EMPLEADOR."
        ),
    },
    {
        "orden": 8,
        "tipo": "clausula",
        "titulo": "SEPTIMO: Termino del contrato",
        "contenido_template": (
            "El presente contrato podra terminar por alguna de las causales "
            "establecidas en el Codigo del Trabajo. En caso de desahucio, "
            "se dara aviso con 30 dias de anticipacion o pagando una "
            "indemnizacion equivalente a la ultima remuneracion mensual "
            "devengada."
        ),
    },
    {
        "orden": 9,
        "tipo": "clausula",
        "titulo": "OCTAVO: Vigencia",
        "contenido_template": (
            "Este contrato regira a partir del dia "
            "<b>[contrato.fecha_inicio]</b> y tendra "
            "vigencia <b>[contrato.tipo_contrato]</b>."
        ),
    },
    {
        "orden": 10,
        "tipo": "clausula",
        "titulo": "NOVENO: Modificaciones",
        "contenido_template": (
            "Cualquier modificacion al presente contrato debera "
            "hacerse por escrito y firmarse por ambas partes, "
            "pasando a formar parte integrante de este instrumento. "
            "Las modificaciones acordadas verbalmente no tendran validez legal."
        ),
    },
    {
        "orden": 11,
        "tipo": "clausula",
        "titulo": "DECIMO: Responsabilidades especiales",
        "contenido_template": (
            "El (la) TRABAJADOR(A) es personalmente responsable de "
            "los bienes, equipos y herramientas puestos a su disposicion "
            "para el desempeno de sus funciones, y debera restituirlos "
            "en el mismo estado en que los recibio, salvo el deterioro "
            "normal producido por el uso."
        ),
    },
    {
        "orden": 12,
        "tipo": "clausula",
        "titulo": "DECIMO PRIMERO: Funciones especificas",
        "contenido_template": "[contrato.funciones]",
    },
    {
        "orden": 13,
        "tipo": "clausula",
        "titulo": "DECIMO SEGUNDO: Fecha de ingreso",
        "contenido_template": (
            "Para todos los efectos legales, la fecha de ingreso del (la) "
            "TRABAJADOR(A) al EMPLEADOR es el [contrato.fecha_inicio]."
        ),
    },
    {
        "orden": 14,
        "tipo": "clausula",
        "titulo": "DECIMO TERCERO: Prevision y salud",
        "contenido_template": (
            "El (la) TRABAJADOR(A) declara estar afiliado(a) a la AFP "
            "[prevision.afp_nombre] y al sistema de salud "
            "[prevision.sistema_salud]. "
            "Las cotizaciones previsionales y de salud seran descontadas "
            "mensualmente de la remuneracion y enteradas oportunamente "
            "por el EMPLEADOR a las instituciones correspondientes."
        ),
    },
    {
        "orden": 15,
        "tipo": "clausula",
        "titulo": "DECIMO CUARTO: Domicilio",
        "contenido_template": (
            "Para todos los efectos del presente contrato, las partes "
            "fijan domicilio en la ciudad de [empresa.ciudad]. "
            "Cualquier notificacion judicial o extrajudicial sera valida "
            "si se realiza en los domicilios indicados en este instrumento."
        ),
    },
    {
        "orden": 16,
        "tipo": "firmas",
        "titulo": "Firmas",
        "contenido_template": (
            "En conformidad, firman las partes en [empresa.ciudad], "
            "a [contrato.fecha_firma]."
        ),
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def print_section(title: str):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print("=" * 60)


def print_paso(modelo: str, creados: int, actualizados: int, omitidos: int = 0):
    partes = [f"creados={creados}", f"actualizados={actualizados}"]
    if omitidos:
        partes.append(f"omitidos={omitidos}")
    print(f"  {modelo}: {', '.join(partes)}")


def cargar_datos() -> dict:
    if not DATOS_FILE.exists():
        print(f"ERROR: No se encontro {DATOS_FILE}")
        print("Ejecuta primero: python ..\\dev\\scripts\\exportar_seed_sqlite.py")
        sys.exit(1)
    with open(DATOS_FILE, encoding="utf-8") as f:
        return json.load(f)


def _rut_empresa(rut, mapa_empresas_por_rut: dict):
    if not rut:
        return None
    return mapa_empresas_por_rut.get(rut)


def _resolver_empresa(row: dict, mapa_por_rut: dict, mapa_por_nombre: dict, empresa_default=None):
    """Resuelve empresa por RUT; si no hay RUT, cae a nombre; si no hay nombre, usa empresa_default."""
    rut = row.get("empresa_prestadora_rut")
    if rut:
        return mapa_por_rut.get(rut)
    nombre = row.get("empresa_prestadora_nombre")
    if nombre:
        return mapa_por_nombre.get(nombre, empresa_default)
    return empresa_default


# ---------------------------------------------------------------------------
# 1-7: AUTH / EMPRESAS / USUARIOS
# ---------------------------------------------------------------------------

def seed_grupos(datos: list) -> dict:
    from django.contrib.auth.models import Group
    creados = actualizados = 0
    mapa: dict = {}
    for row in datos:
        g, creado = Group.objects.get_or_create(name=row["name"])
        mapa[row["id"]] = g
        if creado:
            creados += 1
        else:
            actualizados += 1
    print_paso("Grupos", creados, actualizados)
    return mapa


def seed_empresas(datos: list) -> tuple:
    from empresas.models import Empresa
    creados = actualizados = 0
    mapa_id: dict = {}
    mapa_rut: dict = {}
    for row in datos:
        clave = {"rut_empresa": row["rut_empresa"]} if row.get("rut_empresa") else {"nombre": row["nombre"]}
        defaults = {
            "nombre": row["nombre"],
            "email": row.get("email") or "",
            "telefono": row.get("telefono") or "",
            "giro": row.get("giro") or "",
            "nombre_fantasia": row.get("nombre_fantasia") or "",
            "representante_legal": row.get("representante_legal") or "",
            "rut_representante": row.get("rut_representante") or "",
            "direccion_principal": row.get("direccion_principal") or "",
            "recargo": row.get("recargo") or 0,
            "ppm": row.get("ppm") or 0,
        }
        empresa, creada = Empresa.objects.update_or_create(**clave, defaults=defaults)
        mapa_id[row["id"]] = empresa
        if row.get("rut_empresa"):
            mapa_rut[row["rut_empresa"]] = empresa
        if creada:
            creados += 1
        else:
            actualizados += 1
    print_paso("Empresas", creados, actualizados)
    from empresas.models import Empresa as _Emp
    mapa_nombre = {e.nombre: e for e in _Emp.objects.all()}
    return mapa_id, mapa_rut, mapa_nombre


def seed_sucursales(datos: list, mapa_empresas: dict) -> dict:
    from empresas.models import SucursalEmpresa
    creados = actualizados = omitidos = 0
    mapa: dict = {}
    for row in datos:
        empresa = mapa_empresas.get(row["empresa_id"])
        if empresa is None:
            omitidos += 1
            continue
        suc, creada = SucursalEmpresa.objects.update_or_create(
            nombre=row["nombre"],
            empresa=empresa,
            defaults={
                "direccion": row.get("direccion") or "",
                "region": row.get("region") or 0,
                "provincia": row.get("provincia") or 0,
                "comuna": row.get("comuna") or 0,
                "telefono": row.get("telefono") or "",
                "email": row.get("email") or "",
            },
        )
        mapa[row["id"]] = suc
        if creada:
            creados += 1
        else:
            actualizados += 1
    print_paso("Sucursales", creados, actualizados, omitidos)
    return mapa


def seed_relaciones_empresa(datos: list, mapa_empresas: dict):
    from empresas.models import RelacionEmpresa
    creados = actualizados = omitidos = 0
    for row in datos:
        prestador = mapa_empresas.get(row["prestador_servicios_id"])
        cliente = mapa_empresas.get(row["cliente_id"])
        if prestador is None or cliente is None:
            omitidos += 1
            continue
        _, creada = RelacionEmpresa.objects.update_or_create(
            prestador_servicios=prestador,
            cliente=cliente,
            defaults={"tipo_relacion": row.get("tipo_relacion") or "cliente"},
        )
        if creada:
            creados += 1
        else:
            actualizados += 1
    print_paso("RelacionEmpresa", creados, actualizados, omitidos)


def seed_usuarios(datos: list) -> dict:
    from django.contrib.auth import get_user_model
    User = get_user_model()
    creados = actualizados = 0
    mapa: dict = {}
    for row in datos:
        defaults = {
            "first_name": row.get("first_name") or "",
            "last_name": row.get("last_name") or "",
            "second_name": row.get("second_name") or None,
            "second_last_name": row.get("second_last_name") or None,
            "is_active": row.get("is_active") if row.get("is_active") is not None else False,
            "is_staff": row.get("is_staff") or False,
            "is_superuser": row.get("is_superuser") or False,
            "rut": row.get("rut") or None,
            "celular": row.get("celular") or "",
            "region": row.get("region") or 0,
            "provincia": row.get("provincia") or 0,
            "comuna": row.get("comuna") or 0,
            "direccion": row.get("direccion") or "",
        }
        usuario, creado = User.objects.update_or_create(email=row["email"], defaults=defaults)
        if creado:
            usuario.set_password(PASSWORD_DEFAULT)
            usuario.save()
            creados += 1
        else:
            actualizados += 1
        mapa[row["id"]] = usuario
    print_paso("Usuarios", creados, actualizados)
    return mapa


def seed_usuarios_empresa(datos_ue: list, datos_grupos_m2m: list, mapa_usuarios: dict, mapa_sucursales: dict, mapa_grupos: dict) -> dict:
    from empresas.models import UsuarioEmpresa
    creados = actualizados = omitidos = 0
    mapa: dict = {}
    grupos_por_ue: dict = {}
    for row in datos_grupos_m2m:
        grupos_por_ue.setdefault(row["usuarioempresa_id"], []).append(row["group_id"])
    for row in datos_ue:
        usuario = mapa_usuarios.get(row["usuario_id"])
        sucursal = mapa_sucursales.get(row["sucursal_id"])
        if usuario is None or sucursal is None:
            omitidos += 1
            continue
        ue, creada = UsuarioEmpresa.objects.update_or_create(
            usuario=usuario,
            defaults={
                "sucursal": sucursal,
                "cargo": row.get("cargo") or "",
                "rut": row.get("rut") or None,
                "estado": row.get("estado") or "1",
                "fecha_ingreso": row.get("fecha_ingreso") or None,
                "fecha_contrato": row.get("fecha_contrato") or None,
            },
        )
        ids_grupos_orig = grupos_por_ue.get(row["id"], [])
        grupos_obj = [mapa_grupos[gid] for gid in ids_grupos_orig if gid in mapa_grupos]
        if grupos_obj:
            ue.grupos.set(grupos_obj)
        mapa[row["id"]] = ue
        if creada:
            creados += 1
        else:
            actualizados += 1
    print_paso("UsuarioEmpresa", creados, actualizados, omitidos)
    return mapa


def seed_personalizaciones(datos: list, mapa_usuarios: dict, mapa_sucursales: dict):
    from core.models import PersonalizacionUsuario
    procesadas = omitidos = 0
    for row in datos:
        usuario = mapa_usuarios.get(row["usuario_id"])
        if usuario is None:
            omitidos += 1
            continue
        sucursal = mapa_sucursales.get(row["sucursal_principal_id"]) if row.get("sucursal_principal_id") else None
        PersonalizacionUsuario.objects.update_or_create(
            usuario=usuario,
            defaults={"sucursal_principal": sucursal, "tema": row.get("tema") or "1", "font_size": row.get("font_size") or 13},
        )
        procesadas += 1
    if omitidos:
        print(f"  AVISO: {omitidos} personalizaciones omitidas (usuario no encontrado)")
    print(f"  PersonalizacionUsuario: {procesadas} procesadas")


# ---------------------------------------------------------------------------
# 8-14: INVENTARIO
# ---------------------------------------------------------------------------

def seed_categorias(datos: list) -> dict:
    from items.models import Categoria
    creados = actualizados = 0
    mapa: dict = {}
    for row in datos:
        cat, creada = Categoria.objects.update_or_create(nombre=row["nombre"], defaults={})
        mapa[row["id"]] = cat
        if creada:
            creados += 1
        else:
            actualizados += 1
    print_paso("Categorias", creados, actualizados)
    return mapa


def seed_fabricantes(datos: list) -> dict:
    from items.models import Fabricante
    creados = actualizados = 0
    mapa: dict = {}
    for row in datos:
        fab, creada = Fabricante.objects.update_or_create(
            nombre=row["nombre"],
            defaults={
                "pagina_web": row.get("pagina_web") or "",
                "email_soporte": row.get("email_soporte") or "",
                "telefono_soporte": row.get("telefono_soporte") or "",
            },
        )
        mapa[row["id"]] = fab
        if creada:
            creados += 1
        else:
            actualizados += 1
    print_paso("Fabricantes", creados, actualizados)
    return mapa


def seed_proveedores(datos: list, mapa_empresas: dict) -> dict:
    from items.models import ProveedorEmpresa
    creados = actualizados = omitidos = 0
    mapa: dict = {}
    for row in datos:
        empresa = mapa_empresas.get(row["empresa_id"])
        if empresa is None:
            omitidos += 1
            continue
        rut = row.get("rut") or None
        clave = {"rut": rut, "empresa": empresa} if rut else {"nombre": row["nombre"], "empresa": empresa}
        defaults = {
            "nombre": row["nombre"],
            "rut": rut,
            "empresa": empresa,
            "direccion": row.get("direccion") or "",
            "region": row.get("region") or 0,
            "provincia": row.get("provincia") or 0,
            "comuna": row.get("comuna") or 0,
            "pagina_web": row.get("pagina_web") or "",
            "telefono": row.get("telefono") or "",
            "ejecutivo_asignado": row.get("ejecutivo_asignado") or "",
            "email_ejecutivo": row.get("email_ejecutivo") or "",
            "tipo_moneda": row.get("tipo_moneda") or "2",
            "recargo_dolar": row.get("recargo_dolar") or 0,
            "catalogo_web": row.get("catalogo_web") or "",
        }
        prov, creada = ProveedorEmpresa.objects.update_or_create(**clave, defaults=defaults)
        mapa[row["id"]] = prov
        if creada:
            creados += 1
        else:
            actualizados += 1
    print_paso("ProveedorEmpresa", creados, actualizados, omitidos)
    return mapa


def seed_items(datos: list, mapa_empresas: dict, mapa_categorias: dict, mapa_fabricantes: dict, mapa_proveedores: dict):
    from items.models import ItemEmpresa
    creados = actualizados = omitidos = 0
    for row in datos:
        empresa = mapa_empresas.get(row["empresa_id"])
        if empresa is None:
            omitidos += 1
            continue
        categoria = mapa_categorias.get(row.get("categoria_id"))
        fabricante = mapa_fabricantes.get(row.get("fabricante_id"))
        clave = (
            {"codigo_barras": row["codigo_barras"]}
            if row.get("codigo_barras")
            else {"nombre": row["nombre"], "empresa": empresa}
        )
        defaults = {
            "nombre": row["nombre"],
            "descripcion_corta": row.get("descripcion_corta") or "",
            "empresa": empresa,
            "fabricante": fabricante,
            "categoria": categoria,
            "comentarios": row.get("comentarios") or "",
            "es_equipo": row.get("es_equipo") or False,
        }
        if row.get("codigo_barras"):
            defaults["codigo_barras"] = row["codigo_barras"]
        item, creado = ItemEmpresa.objects.update_or_create(**clave, defaults=defaults)
        ids_prov = row.get("proveedores_ids", [])
        provs = [mapa_proveedores[pid] for pid in ids_prov if pid in mapa_proveedores]
        if provs:
            item.proveedores_empresa.set(provs)
        if creado:
            creados += 1
        else:
            actualizados += 1
    print_paso("ItemEmpresa", creados, actualizados, omitidos)


def seed_bodegas(datos: list, mapa_sucursales: dict) -> dict:
    from bodegas.models import Bodega
    creados = actualizados = omitidos = 0
    mapa: dict = {}
    for row in datos:
        sucursal = mapa_sucursales.get(row["sucursal_id"])
        if sucursal is None:
            omitidos += 1
            continue
        bodega, creada = Bodega.objects.update_or_create(nombre=row["nombre"], sucursal=sucursal, defaults={})
        mapa[row["id"]] = bodega
        if creada:
            creados += 1
        else:
            actualizados += 1
    print_paso("Bodegas", creados, actualizados, omitidos)
    return mapa


def seed_stock(datos: list, mapa_bodegas: dict, mapa_items: dict) -> dict:
    from bodegas.models import StockItemEnBodega
    creados = actualizados = omitidos = 0
    mapa: dict = {}
    for row in datos:
        bodega = mapa_bodegas.get(row["bodega_id"])
        item = mapa_items.get(row["item_id"])
        if bodega is None or item is None:
            omitidos += 1
            continue
        stock, creado = StockItemEnBodega.objects.update_or_create(
            bodega=bodega,
            item=item,
            defaults={"cantidad": row.get("cantidad") or 0, "pmp": row.get("pmp") or 0, "stock_minimo": row.get("stock_minimo") or 0},
        )
        mapa[row["id"]] = stock
        if creado:
            creados += 1
        else:
            actualizados += 1
    print_paso("StockItemEnBodega", creados, actualizados, omitidos)
    return mapa


def seed_series(datos: list, mapa_stock: dict, mapa_empresas: dict):
    from bodegas.models import SerieItem
    creados = actualizados = omitidos = 0
    for row in datos:
        empresa = mapa_empresas.get(row.get("empresa_id"))
        stock_item = mapa_stock.get(row.get("stock_item_id"))
        if empresa is None or stock_item is None:
            omitidos += 1
            continue
        _, creado = SerieItem.objects.update_or_create(
            serie=row["serie"],
            empresa=empresa,
            defaults={"estado": row.get("estado") or "disponible", "stock_item": stock_item, "item_orden_compra_en_stock": None, "item_guia_salida": None},
        )
        if creado:
            creados += 1
        else:
            actualizados += 1
    print_paso("SerieItem", creados, actualizados, omitidos)


# ---------------------------------------------------------------------------
# 15-21: CONTRATOS CATALOGO
# ---------------------------------------------------------------------------

def seed_etiquetas(datos: list, mapa_empresas_por_rut: dict, mapa_empresas_por_nombre: dict = None, empresa_default=None):
    from contratos.models import EtiquetaPlantilla
    creados = actualizados = 0
    for row in datos:
        empresa = _resolver_empresa(row, mapa_empresas_por_rut, mapa_empresas_por_nombre or {}, empresa_default)
        _, creado = EtiquetaPlantilla.objects.update_or_create(
            clave=row["clave"],
            empresa_prestadora=empresa,
            defaults={
                "nombre_display": row.get("nombre_display") or row["clave"],
                "categoria": row.get("categoria") or "",
                "origen_dato": row.get("origen_dato") or "manual",
                "descripcion": row.get("descripcion") or "",
                "valor_default": row.get("valor_default") or "",
            },
        )
        if creado:
            creados += 1
        else:
            actualizados += 1
    print_paso("EtiquetaPlantilla", creados, actualizados)


def seed_caracteristicas(datos: list, mapa_empresas_por_rut: dict, mapa_empresas_por_nombre: dict = None, empresa_default=None) -> dict:
    from contratos.models import CaracteristicaServicio
    creados = actualizados = 0
    mapa: dict = {}
    for row in datos:
        empresa = _resolver_empresa(row, mapa_empresas_por_rut, mapa_empresas_por_nombre or {}, empresa_default)
        car, creado = CaracteristicaServicio.objects.update_or_create(
            nombre=row["nombre"],
            empresa_prestadora=empresa,
            defaults={"descripcion": row.get("descripcion") or "", "activo": row.get("activo") if row.get("activo") is not None else True},
        )
        mapa[row["nombre"]] = car
        if creado:
            creados += 1
        else:
            actualizados += 1
    print_paso("CaracteristicaServicio", creados, actualizados)
    return mapa


def seed_servicios(datos: list, mapa_caracteristicas: dict, mapa_empresas_por_rut: dict, mapa_empresas_por_nombre: dict = None, empresa_default=None) -> dict:
    from contratos.models import Servicio, ServicioCaracteristica
    creados = actualizados = 0
    mapa: dict = {}
    for row in datos:
        empresa = _resolver_empresa(row, mapa_empresas_por_rut, mapa_empresas_por_nombre or {}, empresa_default)
        servicio, creado = Servicio.objects.update_or_create(
            nombre=row["nombre"],
            empresa_prestadora=empresa,
            defaults={
                "descripcion": row.get("descripcion") or "",
                "categoria": row.get("categoria") or "",
                "activo": row.get("activo") if row.get("activo") is not None else True,
                "es_vigente": row.get("es_vigente") if row.get("es_vigente") is not None else True,
                "precio": row.get("precio") or "0",
                "tipo_moneda": row.get("tipo_moneda") or "2",
                "veces_por_mes_default": row.get("veces_por_mes_default") or 1,
                "formas_pago_permitidas": row.get("formas_pago_permitidas") or "",
                "incluye": row.get("incluye") or "",
                "no_incluye": row.get("no_incluye") or "",
                "clausulas_especiales": row.get("clausulas_especiales") or "",
                "version": row.get("version") or 1,
            },
        )
        mapa[row["nombre"]] = servicio
        alcance_data = row.get("alcance_items", [])
        if alcance_data:
            servicio.alcance_items.all().delete()
            for ai in alcance_data:
                car = mapa_caracteristicas.get(ai["caracteristica_nombre"])
                if car:
                    ServicioCaracteristica.objects.create(
                        servicio=servicio,
                        caracteristica=car,
                        modo=ai.get("modo") or "incluido",
                        orden=ai.get("orden") or 0,
                    )
        if creado:
            creados += 1
        else:
            actualizados += 1
    print_paso("Servicio", creados, actualizados)
    return mapa


def seed_licencias(datos: list, mapa_empresas_por_rut: dict, mapa_empresas_por_nombre: dict = None, empresa_default=None):
    from contratos.models import Licencia
    creados = actualizados = 0
    for row in datos:
        empresa = _resolver_empresa(row, mapa_empresas_por_rut, mapa_empresas_por_nombre or {}, empresa_default)
        _, creado = Licencia.objects.update_or_create(
            nombre=row["nombre"],
            empresa_prestadora=empresa,
            defaults={
                "proveedor": row.get("proveedor") or "",
                "descripcion": row.get("descripcion") or "",
                "numero_parte": row.get("numero_parte") or "",
                "modalidad_base": row.get("modalidad_base") or "",
                "modalidad_anual_forma_pago": row.get("modalidad_anual_forma_pago") or "",
                "precio_partner": row.get("precio_partner") or "0",
                "precio_venta": row.get("precio_venta") or "0",
                "moneda": row.get("moneda") or "2",
                "activo": row.get("activo") if row.get("activo") is not None else True,
            },
        )
        if creado:
            creados += 1
        else:
            actualizados += 1
    print_paso("Licencia", creados, actualizados)


def seed_planes(datos: list, mapa_servicios: dict, mapa_empresas_por_rut: dict, mapa_empresas_por_nombre: dict = None, empresa_default=None):
    from contratos.models import PlanServicio, PlanServicioDetalle
    creados = actualizados = 0
    for row in datos:
        empresa = _resolver_empresa(row, mapa_empresas_por_rut, mapa_empresas_por_nombre or {}, empresa_default)
        plan, creado = PlanServicio.objects.update_or_create(
            nombre=row["nombre"],
            empresa_prestadora=empresa,
            defaults={
                "descripcion": row.get("descripcion") or "",
                "version": row.get("version") or 1,
                "activo": row.get("activo") if row.get("activo") is not None else True,
                "es_vigente": row.get("es_vigente") if row.get("es_vigente") is not None else True,
                "precio": row.get("precio") or "0",
                "precio_anual": row.get("precio_anual") or None,
                "tipo_moneda": row.get("tipo_moneda") or "2",
                "veces_por_mes_default": row.get("veces_por_mes_default") or 1,
                "num_visitas_mensuales": row.get("num_visitas_mensuales") or 0,
                "formas_pago_permitidas": row.get("formas_pago_permitidas") or "",
                "incluye": row.get("incluye") or "",
                "no_incluye": row.get("no_incluye") or "",
                "clausulas_especiales": row.get("clausulas_especiales") or "",
            },
        )
        detalles_data = row.get("detalles_servicio", [])
        if detalles_data:
            plan.detalles_servicio.all().delete()
            for d in detalles_data:
                servicio = mapa_servicios.get(d["servicio_nombre"])
                if servicio:
                    PlanServicioDetalle.objects.create(
                        plan=plan,
                        servicio_version=servicio,
                        orden=d.get("orden") or 0,
                        obligatorio=d.get("obligatorio") if d.get("obligatorio") is not None else True,
                        cantidad_default=d.get("cantidad_default") or 1,
                        veces_por_mes_default=d.get("veces_por_mes_default") or 1,
                    )
        if creado:
            creados += 1
        else:
            actualizados += 1
    print_paso("PlanServicio", creados, actualizados)


def seed_plantilla_servicios(plantilla_data, mapa_empresas_todos: list):
    if not plantilla_data:
        print("  AVISO: plantilla_servicios no encontrada en datos, omitiendo.")
        return
    from contratos.models import PlantillaContrato, SeccionPlantilla
    TITULO = plantilla_data["titulo"]
    secciones_data = plantilla_data.get("secciones", [])
    creadas = omitidas = 0
    for empresa in mapa_empresas_todos:
        plantilla, creada = PlantillaContrato.objects.get_or_create(
            empresa_prestadora=empresa,
            titulo=TITULO,
            tipo_contrato=plantilla_data.get("tipo_contrato") or "servicios",
            defaults={
                "descripcion": plantilla_data.get("descripcion") or "",
                "version": plantilla_data.get("version") or 1,
                "activa": plantilla_data.get("activa") if plantilla_data.get("activa") is not None else True,
                "requiere_nda": plantilla_data.get("requiere_nda") or False,
                "orden_bloque_alcance": plantilla_data.get("orden_bloque_alcance") or 1,
                "orden_bloque_operacion": plantilla_data.get("orden_bloque_operacion") or 2,
                "orden_bloque_condiciones": plantilla_data.get("orden_bloque_condiciones") or 3,
                "es_default": True,
            },
        )
        if creada:
            for s in secciones_data:
                SeccionPlantilla.objects.create(
                    plantilla=plantilla,
                    titulo=s.get("titulo") or "",
                    tipo=s.get("tipo") or "clausula",
                    contenido_template=s.get("contenido_template") or "",
                    orden=s.get("orden") or 0,
                    slot_documental=s.get("slot_documental") or "",
                    orden_en_slot=s.get("orden_en_slot") or 0,
                    es_editable_en_contrato=s.get("es_editable_en_contrato") if s.get("es_editable_en_contrato") is not None else True,
                    es_obligatoria=s.get("es_obligatoria") if s.get("es_obligatoria") is not None else True,
                )
            creadas += 1
        else:
            omitidas += 1
    print(f"  PlantillaContrato (servicios): creadas={creadas}, existentes={omitidas}")


def seed_plantilla_trabajador(mapa_empresas_todos: list):
    from contratos.models import PlantillaContrato, SeccionPlantilla
    plantillas_creadas = plantillas_existentes = secciones_creadas = secciones_actualizadas = 0
    for empresa in mapa_empresas_todos:
        plantilla, creada = PlantillaContrato.objects.get_or_create(
            empresa_prestadora=empresa,
            tipo_contrato="trabajador",
            es_default=True,
            defaults={
                "titulo": "Contrato de Trabajo (Default)",
                "descripcion": "Plantilla base de contrato laboral",
                "version": 1,
                "activa": True,
                "requiere_nda": False,
            },
        )
        if creada:
            plantillas_creadas += 1
        else:
            plantillas_existentes += 1
        # Siempre sincronizar secciones (update_or_create garantiza que re-ejecutar
        # el seed corrija plantillas existentes con etiquetas desactualizadas).
        for s in SECCIONES_TRABAJADOR:
            _, sec_creada = SeccionPlantilla.objects.update_or_create(
                plantilla=plantilla,
                orden=s["orden"],
                defaults={
                    "tipo": s["tipo"],
                    "titulo": s["titulo"],
                    "contenido_template": s["contenido_template"],
                },
            )
            if sec_creada:
                secciones_creadas += 1
            else:
                secciones_actualizadas += 1
    print(
        f"  PlantillaContrato (trabajador): creadas={plantillas_creadas}, "
        f"existentes={plantillas_existentes} | "
        f"SeccionPlantilla: creadas={secciones_creadas}, actualizadas={secciones_actualizadas}"
    )


def _construir_mapa_items_por_id_orig(datos_items: list, mapa_empresas: dict) -> dict:
    from items.models import ItemEmpresa
    mapa: dict = {}
    for row in datos_items:
        empresa = mapa_empresas.get(row["empresa_id"])
        if empresa is None:
            continue
        try:
            if row.get("codigo_barras"):
                item = ItemEmpresa.objects.get(codigo_barras=row["codigo_barras"])
            else:
                item = ItemEmpresa.objects.get(nombre=row["nombre"], empresa=empresa)
            mapa[row["id"]] = item
        except ItemEmpresa.DoesNotExist:
            pass
    return mapa


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
def run():
    print_section("Cargando datos desde seed_datos.json...")
    datos = cargar_datos()

    with transaction.atomic():
        print_section("AUTH / EMPRESAS")
        mapa_grupos = seed_grupos(datos.get("grupos", []))
        mapa_empresas, mapa_empresas_por_rut, mapa_empresas_por_nombre = seed_empresas(datos.get("empresas", []))
        mapa_sucursales = seed_sucursales(datos.get("sucursales", []), mapa_empresas)
        seed_relaciones_empresa(datos.get("relaciones_empresa", []), mapa_empresas)
        mapa_usuarios = seed_usuarios(datos.get("usuarios", []))
        seed_usuarios_empresa(
            datos.get("usuarios_empresa", []),
            datos.get("usuarios_empresa_grupos", []),
            mapa_usuarios,
            mapa_sucursales,
            mapa_grupos,
        )
        seed_personalizaciones(datos.get("personalizaciones", []), mapa_usuarios, mapa_sucursales)

        print_section("INVENTARIO")
        mapa_categorias = seed_categorias(datos.get("categorias", []))
        mapa_fabricantes = seed_fabricantes(datos.get("fabricantes", []))
        mapa_proveedores = seed_proveedores(datos.get("proveedores", []), mapa_empresas)
        seed_items(datos.get("items", []), mapa_empresas, mapa_categorias, mapa_fabricantes, mapa_proveedores)
        mapa_bodegas = seed_bodegas(datos.get("bodegas", []), mapa_sucursales)
        mapa_items = _construir_mapa_items_por_id_orig(datos.get("items", []), mapa_empresas)
        mapa_stock = seed_stock(datos.get("stock", []), mapa_bodegas, mapa_items)
        seed_series(datos.get("series", []), mapa_stock, mapa_empresas)

        print_section("CONTRATOS CATALOGO")
        empresa_default_catalogo = mapa_empresas_por_nombre.get("Snabbit")
        seed_etiquetas(datos.get("etiquetas", []), mapa_empresas_por_rut, mapa_empresas_por_nombre, empresa_default_catalogo)
        mapa_caracteristicas = seed_caracteristicas(datos.get("caracteristicas", []), mapa_empresas_por_rut, mapa_empresas_por_nombre, empresa_default_catalogo)
        mapa_servicios = seed_servicios(datos.get("servicios", []), mapa_caracteristicas, mapa_empresas_por_rut, mapa_empresas_por_nombre, empresa_default_catalogo)
        seed_licencias(datos.get("licencias", []), mapa_empresas_por_rut, mapa_empresas_por_nombre, empresa_default_catalogo)
        seed_planes(datos.get("planes", []), mapa_servicios, mapa_empresas_por_rut, mapa_empresas_por_nombre, empresa_default_catalogo)

        todas_empresas = list(mapa_empresas.values())
        seed_plantilla_servicios(datos.get("plantilla_servicios"), todas_empresas)
        seed_plantilla_trabajador(todas_empresas)

    print_section("Seed completado exitosamente")


if __name__ == "__main__":
    run()