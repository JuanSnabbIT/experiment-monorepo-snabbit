#!/usr/bin/env python
r"""
Script de población masiva de datos transaccionales para testing.
Crea Cotizaciones, Guías de Salida de Bodega y Órdenes de Trabajo (v2).

Prerequisitos:
  - seed_base.py ejecutado previamente (empresas, usuarios, items, bodegas)
  - Migraciones aplicadas

Uso:
    cd backend
    ENV\Scripts\python.exe ..\dev\scripts\setup\seed_transaccional.py
    ENV\Scripts\python.exe ..\dev\scripts\setup\seed_transaccional.py --cantidad 20
    ENV\Scripts\python.exe ..\dev\scripts\setup\seed_transaccional.py --solo cotizaciones
    ENV\Scripts\python.exe ..\dev\scripts\setup\seed_transaccional.py --solo guias
    ENV\Scripts\python.exe ..\dev\scripts\setup\seed_transaccional.py --solo ots
    ENV\Scripts\python.exe ..\dev\scripts\setup\seed_transaccional.py --limpiar

Crea (por defecto 10 de cada flujo):
  - Cotizaciones con ItemCotizacion (2-4 items cada una)
  - Guías de Salida con ItemsGuiaSalida (1-3 items cada una)
  - Órdenes de Trabajo v2 con SoporteTecnico, ServicioEnOT, Seguimientos y Gastos
  - Las OTs se vinculan a Cotizaciones y Guías generadas
"""

import argparse
import os
import random
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

# ── Bootstrap Django ──────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parents[3]
BACKEND_PATH = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_PATH))
os.chdir(BACKEND_PATH)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")

import django
django.setup()
# ─────────────────────────────────────────────────────────────────────────────

from django.db import transaction

from bodegas.models import Bodega, GuiaSalida, ItemsGuiaSalida, StockItemEnBodega
from cotizaciones.models import Cotizacion, ItemCotizacion
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa
from items.models import ItemEmpresa
from ordentrabajov2.models import (
    GastoOperativoEnOt,
    HistorialCambiosOrden,
    OrdenDeTrabajo,
    SeguimientoItemOT,
    ServicioEnOT,
    SoporteTecnico,
)
from rendiciones.models import CategoriaGastoRendicion

# ── Paletas de datos ficticios ────────────────────────────────────────────────

NOMBRES_COTIZACION = [
    "Renovación de equipos de red",
    "Soporte preventivo anual",
    "Instalación de cámaras IP",
    "Mantenimiento de servidores",
    "Actualización de software ERP",
    "Migración de datos en la nube",
    "Suministro de laptops corporativas",
    "Ampliación de red inalámbrica WiFi 6",
    "Instalación de UPS rack",
    "Diagnóstico y reparación de workstations",
    "Implementación de backup offsite",
    "Provisión de licencias Microsoft 365",
    "Montaje de sala de servidores",
    "Auditoría de seguridad informática",
    "Capacitación usuario final",
    "Recableado estructurado Cat6A",
    "Suministro de tóner y consumibles",
    "Configuración de firewall perimetral",
    "Instalación de sistema de control de acceso",
    "Mantenimiento de equipos periféricos",
]

DESCRIPCIONES_OT = [
    "Revisión completa de la infraestructura de red y actualización de firmware en switches.",
    "Soporte técnico presencial por falla en estación de trabajo del área contabilidad.",
    "Instalación y configuración de nuevo servidor de archivos en sala de máquinas.",
    "Migración de base de datos legado a nueva instancia PostgreSQL optimizada.",
    "Capacitación en uso de herramientas colaborativas Microsoft 365 para 20 usuarios.",
    "Instalación de nuevas cámaras de vigilancia IP en perímetro del edificio.",
    "Reparación de red inalámbrica con extensión de cobertura a planta 3.",
    "Actualización y hardening de sistema operativo en servidores de producción.",
    "Implementación de solución de respaldo automatizado con retención 90 días.",
    "Diagnóstico y reemplazo de discos en RAID del servidor de base de datos.",
    "Configuración de VPN sitio a sitio entre sucursales Santiago y Valparaíso.",
    "Instalación de equipos UPS en DataCenter y configuración de alertas.",
    "Cambio de switch core y reorganización del cableado en rack principal.",
    "Provisión e instalación de 10 computadores de escritorio para nueva área.",
    "Mantenimiento preventivo semestral de toda la infraestructura de TI.",
]

NOMBRES_SOPORTES = [
    "Diagnóstico inicial de falla",
    "Revisión de hardware",
    "Actualización de firmware",
    "Configuración de red",
    "Instalación de software",
    "Pruebas de conectividad",
    "Limpieza y mantenimiento preventivo",
    "Configuración de seguridad",
    "Copia de respaldo",
    "Pruebas de carga y rendimiento",
]

NOMBRES_SERVICIOS = [
    "Configuración de equipos",
    "Instalación en sitio",
    "Capacitación de usuarios",
    "Documentación técnica",
    "Entrega de informe final",
    "Revisión de garantía",
    "Monitoreo post-implementación",
]

COMENTARIOS_SEGUIMIENTO = [
    "Trabajo en progreso, sin inconvenientes detectados.",
    "Se identificaron problemas en la conexión de red, resueltos con cambio de switch.",
    "Usuario informado del avance. Queda pendiente configuración final.",
    "Equipo instalado correctamente, realizando pruebas de funcionamiento.",
    "Se solicita confirmación del cliente para continuar con la siguiente fase.",
    "Trabajo completado exitosamente, se realizaron pruebas de validación.",
    "Se detectó falla adicional en UPS, se gestionará en una visita posterior.",
    "Configuración finalizada, sistema operando en forma óptima.",
]

MOTIVOS_GUIA = [
    "Entrega de materiales para OT de instalación de red",
    "Despacho de equipos para mantenimiento preventivo",
    "Salida de consumibles para soporte técnico en terreno",
    "Despacho de hardware para ampliación de infraestructura",
    "Entrega de insumos para instalación de cámaras IP",
]

DETALLES_GASTO = [
    ("Traslado en taxi al cliente", "transporte"),
    ("Almuerzo en terreno", "alimentacion"),
    ("Repuesto adicional no contemplado", "hardware"),
    ("Estacionamiento en el edificio", "transporte"),
    ("Cable y conectores adicionales", "hardware"),
    ("Software de diagnóstico", "software"),
    ("Gasto de hospedaje visita región", "hospedaje"),
    ("Otros gastos menores", "otros"),
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _print_header(titulo: str) -> None:
    ancho = 72
    print("\n" + "┌" + "─" * ancho + "┐")
    print("│" + titulo.center(ancho) + "│")
    print("└" + "─" * ancho + "┘")


def _print_section(titulo: str) -> None:
    print(f"\n{'=' * 72}")
    print(f"  {titulo}")
    print("=" * 72)


def _print_ok(msg: str) -> None:
    print(f"  ✅ {msg}")


def _print_warn(msg: str) -> None:
    print(f"  ⚠️  {msg}")


def _print_err(msg: str) -> None:
    print(f"  ❌ {msg}")


# ── Validaciones previas ──────────────────────────────────────────────────────

def _cargar_datos_base():
    """Valida y carga objetos base generados por seed_base.py."""
    _print_section("Verificando datos base (prerequisito: seed_base.py)")

    empresa_base = Empresa.objects.filter(rut_empresa="11111111-1").first()
    if not empresa_base:
        _print_err("No existe empresa base Snabbit (rut 11111111-1). Ejecuta seed_base.py primero.")
        sys.exit(1)
    _print_ok(f"Empresa base: {empresa_base.nombre}")

    clientes = list(Empresa.objects.exclude(rut_empresa="11111111-1")[:10])
    if not clientes:
        _print_err("No hay empresas cliente. Ejecuta seed_base.py primero.")
        sys.exit(1)
    _print_ok(f"Clientes disponibles: {len(clientes)}")

    usuarios_internos = list(
        UsuarioEmpresa.objects.filter(sucursal__empresa=empresa_base).select_related(
            "usuario", "sucursal"
        )[:8]
    )
    if not usuarios_internos:
        _print_err("No hay UsuarioEmpresa para Snabbit. Ejecuta seed_base.py primero.")
        sys.exit(1)
    _print_ok(f"Usuarios internos: {len(usuarios_internos)}")

    items = list(ItemEmpresa.objects.filter(empresa=empresa_base)[:20])
    if not items:
        _print_err("No hay ItemEmpresa para Snabbit. Ejecuta seed_base.py primero.")
        sys.exit(1)
    _print_ok(f"Items disponibles: {len(items)}")

    stocks = list(StockItemEnBodega.objects.filter(bodega__sucursal__empresa=empresa_base, cantidad__gt=0))
    bodegas = list(Bodega.objects.filter(sucursal__empresa=empresa_base))

    if not bodegas:
        _print_err("No hay bodegas para Snabbit. Ejecuta seed_base.py primero.")
        sys.exit(1)
    _print_ok(f"Bodegas: {len(bodegas)}, Stocks con cantidad>0: {len(stocks)}")

    categorias_gasto = list(CategoriaGastoRendicion.objects.all()[:8])
    if not categorias_gasto:
        _print_warn("No hay CategoriaGastoRendicion. Los gastos operativos no se crearán.")

    return {
        "empresa_base": empresa_base,
        "clientes": clientes,
        "usuarios_internos": usuarios_internos,
        "items": items,
        "stocks": stocks,
        "bodegas": bodegas,
        "categorias_gasto": categorias_gasto,
    }


# ── Cotizaciones ──────────────────────────────────────────────────────────────

def seed_cotizaciones(datos: dict, cantidad: int) -> list:
    """Crea `cantidad` cotizaciones con 2-4 items cada una."""
    _print_section(f"Creando {cantidad} Cotizaciones con ítems")

    empresa = datos["empresa_base"]
    clientes = datos["clientes"]
    items = datos["items"]
    usuarios = datos["usuarios_internos"]

    ESTADOS = ["pendiente", "enviada", "aprobada", "rechazada", "cerrada"]
    MONEDAS = [("2", "CLP"), ("1", "USD")]  # mayoría CLP

    creadas = []
    for i in range(cantidad):
        cliente = random.choice(clientes)
        estado = random.choices(ESTADOS, weights=[20, 25, 35, 10, 10])[0]
        moneda, _ = random.choices(MONEDAS, weights=[80, 20])[0]
        recargo = random.randint(18, 30)
        dias_venc = random.randint(7, 45)
        nombre = random.choice(NOMBRES_COTIZACION) + f" #{i+1}"

        cot = Cotizacion.objects.create(
            nombre=nombre,
            empresa=empresa,
            cliente=cliente,
            estado=estado,
            descripcion=f"Cotización de prueba generada automáticamente ({i+1}/{cantidad})",
            tipo_moneda=moneda,
            porcentaje_recargo=recargo,
            ppm=Decimal(str(random.uniform(3, 7))).quantize(Decimal("0.01")),
            fecha_vencimiento=date.today() + timedelta(days=dias_venc),
            observaciones="Datos generados por seed_transaccional.py para pruebas.",
        )

        # Items de cotización (2-4)
        num_items = random.randint(2, 4)
        items_sample = random.sample(items, min(num_items, len(items)))
        total = Decimal("0")
        for item_emp in items_sample:
            precio_unit = Decimal(str(random.randint(50_000, 1_500_000)))
            cantidad_item = random.randint(1, 5)
            costo_total = precio_unit * cantidad_item
            total += costo_total
            ItemCotizacion.objects.create(
                cotizacion=cot,
                item_empresa=item_emp,
                nombre=item_emp.nombre,
                descripcion=f"Ítem de prueba: {item_emp.nombre}",
                cantidad=cantidad_item,
                precio_unitario=precio_unit,
                costo_total=costo_total,
                porcentaje_recargo=recargo,
            )

        # Actualizar total
        cot.total_estimado = total
        cot.save(update_fields=["total_estimado"])

        creadas.append(cot)
        print(f"  [{i+1:>3}/{cantidad}] Cotización #{cot.numero_cotizacion} — {cliente.nombre[:30]:<30} [{estado}]")

    _print_ok(f"Cotizaciones creadas: {len(creadas)}")
    return creadas


# ── Guías de Salida ───────────────────────────────────────────────────────────

def seed_guias_salida(datos: dict, cantidad: int) -> list:
    """Crea `cantidad` guías de salida con 1-3 ítems de stock."""
    _print_section(f"Creando {cantidad} Guías de Salida")

    empresa = datos["empresa_base"]
    clientes = datos["clientes"]
    usuarios = datos["usuarios_internos"]
    bodegas = datos["bodegas"]
    stocks = datos["stocks"]

    if not stocks:
        _print_warn("No hay stock disponible (cantidad>0). Guías se crearán sin ítems.")

    ESTADOS_GUIA = [
        ("P", 30),    # Pendiente
        ("ER", 20),   # Espera firma tecnico
        ("FR", 15),   # Firmada por tecnico
        ("ET", 15),   # En Transito
        ("E", 15),    # Entregada
        ("T", 5),     # Terminada
    ]
    estados, pesos = zip(*ESTADOS_GUIA)

    creadas = []
    for i in range(cantidad):
        bodega = random.choice(bodegas)
        cliente = random.choice(clientes)
        usuario = random.choice(usuarios)
        estado = random.choices(estados, weights=pesos)[0]

        guia = GuiaSalida.objects.create(
            bodega=bodega,
            cliente=cliente,
            creado_por=usuario,
            recibido_por=usuario,
            motivo=random.choice(MOTIVOS_GUIA),
            estado=estado,
        )

        # Ítems de la guía (1-3) — solo si hay stock
        if stocks:
            stocks_disponibles = [s for s in stocks if s.bodega == bodega] or stocks
            num_items = random.randint(1, min(3, len(stocks_disponibles)))
            for stock in random.sample(stocks_disponibles, num_items):
                cant = random.randint(1, min(3, max(1, stock.cantidad)))
                ItemsGuiaSalida.objects.create(
                    guia=guia,
                    stock_item=stock,
                    cantidad_original=cant,
                    cantidad_rebajada=cant if estado not in ("P", "ER") else 0,
                    cantidad_devuelta=0,
                )

        creadas.append(guia)
        print(f"  [{i+1:>3}/{cantidad}] Guía #{guia.id:>4} — {bodega.nombre[:25]:<25} [{estado}]")

    _print_ok(f"Guías de salida creadas: {len(creadas)}")
    return creadas


# ── Órdenes de Trabajo v2 ─────────────────────────────────────────────────────

def seed_ordenes_trabajo(
    datos: dict,
    cantidad: int,
    cotizaciones: list,
    guias: list,
) -> list:
    """
    Crea `cantidad` OTs v2 con:
      - 1-2 SoporteTecnico
      - 1 ServicioEnOT
      - Seguimientos para cada soporte/servicio
      - Gastos operativos
      - Historial de cambio de estado
      - Cotizaciones y Guías vinculadas (si existen)
    """
    _print_section(f"Creando {cantidad} Órdenes de Trabajo (v2)")

    empresa = datos["empresa_base"]
    clientes = datos["clientes"]
    usuarios = datos["usuarios_internos"]
    categorias_gasto = datos["categorias_gasto"]

    ESTADOS_OT = [
        ("pendiente", 20),
        ("en_proceso", 40),
        ("completada", 20),
        ("cerrada", 10),
        ("cancelada", 5),
        ("facturada", 5),
    ]
    TIPOS_SERVICIO = ["general", "soporte_r", "soporte_p"]
    PRIORIDADES = ["1", "2", "3"]

    estados_ot, pesos_ot = zip(*ESTADOS_OT)

    creadas = []
    total_soportes = 0
    total_servicios = 0
    total_seguimientos = 0
    total_gastos = 0

    for i in range(cantidad):
        cliente = random.choice(clientes)
        tecnico = random.choice(usuarios)
        estado = random.choices(estados_ot, weights=pesos_ot)[0]
        tipo = random.choice(TIPOS_SERVICIO)
        prioridad = random.choice(PRIORIDADES)
        dias_atras = random.randint(1, 90)
        fecha_inicio = date.today() - timedelta(days=dias_atras)

        ot = OrdenDeTrabajo.objects.create(
            empresa=empresa,
            cliente=cliente,
            tipo_servicio=tipo,
            estado=estado,
            descripcion=random.choice(DESCRIPCIONES_OT),
            prioridad=prioridad,
            tecnico_responsable_ot=tecnico,
            fecha_inicio_ot=fecha_inicio,
            fecha_finalizacion_ot=(
                fecha_inicio + timedelta(days=random.randint(1, 14))
                if estado in ("completada", "cerrada", "facturada")
                else None
            ),
            notas_internas="OT generada por seed_transaccional.py — solo para pruebas.",
        )

        # ── Vincular cotizaciones (1-2 si hay disponibles) ────────────────
        if cotizaciones:
            cots_sample = random.sample(cotizaciones, min(random.randint(1, 2), len(cotizaciones)))
            ot.cotizaciones.set(cots_sample)

        # ── Vincular guía de salida (0-1) ─────────────────────────────────
        if guias and random.random() > 0.3:
            guia = random.choice(guias)
            # Asignar OT solo si la guía no tiene una ya
            if guia.orden_trabajo_id is None:
                guia.orden_trabajo = ot
                guia.save(update_fields=["orden_trabajo"])

        # ── SoporteTecnico (1-2) ──────────────────────────────────────────
        num_soportes = random.randint(1, 2)
        soportes_creados = []
        for s in range(num_soportes):
            estado_soporte = random.choice(["pendiente", "en_proceso", "completado"])
            tec = random.choice(usuarios)
            soporte = SoporteTecnico.objects.create(
                orden=ot,
                nombre=random.choice(NOMBRES_SOPORTES),
                descripcion=f"Soporte técnico #{s+1} para OT #{ot.id}",
                estado=estado_soporte,
                tecnico_asignado=tec,
                fecha_soporte=fecha_inicio + timedelta(days=random.randint(0, 5)),
            )
            soportes_creados.append(soporte)
            total_soportes += 1

            # Seguimientos del soporte (1-3)
            for seg_n in range(random.randint(1, 3)):
                SeguimientoItemOT.objects.create(
                    soporte=soporte,
                    usuario=random.choice(usuarios),
                    tipo=random.choice(["comentario_tecnico", "incidencia", "actualizacion", "comunicacion_usuario"]),
                    comentario=random.choice(COMENTARIOS_SEGUIMIENTO),
                )
                total_seguimientos += 1

        # ── ServicioEnOT (1) ──────────────────────────────────────────────
        estado_servicio = random.choice(["pendiente", "en_proceso", "completado"])
        servicio = ServicioEnOT.objects.create(
            orden=ot,
            nombre=random.choice(NOMBRES_SERVICIOS),
            descripcion=f"Servicio adicional para OT #{ot.id}",
            estado=estado_servicio,
            tecnico_asignado=random.choice(usuarios),
            fecha_servicio=fecha_inicio + timedelta(days=random.randint(0, 7)),
        )
        total_servicios += 1

        # Seguimiento del servicio (1-2)
        for _ in range(random.randint(1, 2)):
            SeguimientoItemOT.objects.create(
                servicio=servicio,
                usuario=random.choice(usuarios),
                tipo=random.choice(["comentario_tecnico", "comunicacion_usuario"]),
                comentario=random.choice(COMENTARIOS_SEGUIMIENTO),
            )
            total_seguimientos += 1

        # ── Gastos operativos (1-3) ───────────────────────────────────────
        if categorias_gasto:
            for _ in range(random.randint(1, 3)):
                detalle_txt, _ = random.choice(DETALLES_GASTO)
                cat = random.choice(categorias_gasto)
                cantidad_gasto = random.randint(1, 3)
                monto_unit = random.randint(3_000, 80_000)
                GastoOperativoEnOt.objects.create(
                    orden=ot,
                    categoria=cat,
                    detalle=detalle_txt,
                    cantidad=cantidad_gasto,
                    monto_unitario=monto_unit,
                    usuario_comprador=random.choice(usuarios),
                    fecha_compra=datetime.combine(
                        fecha_inicio + timedelta(days=random.randint(0, 7)),
                        datetime.min.time(),
                    ),
                )
                total_gastos += 1

        # ── Historial de cambio de estado ─────────────────────────────────
        if estado != "pendiente":
            HistorialCambiosOrden.objects.create(
                orden=ot,
                estado_anterior="pendiente",
                estado_actual=estado,
                comentario=f"Cambio de estado registrado por seed_transaccional.py",
                usuario=random.choice(usuarios),
            )

        creadas.append(ot)
        print(
            f"  [{i+1:>3}/{cantidad}] OT #{ot.id:>4} — "
            f"{cliente.nombre[:22]:<22} [{estado:<12}] "
            f"soportes={num_soportes} cotiz={ot.cotizaciones.count()}"
        )

    _print_ok(f"OTs creadas: {len(creadas)} | Soportes: {total_soportes} | Servicios: {total_servicios}")
    _print_ok(f"Seguimientos: {total_seguimientos} | Gastos operativos: {total_gastos}")
    return creadas


# ── Limpieza ──────────────────────────────────────────────────────────────────

def limpiar_datos_transaccionales():
    """Elimina todos los registros transaccionales (OTs, cotizaciones, guías)."""
    _print_section("Limpiando datos transaccionales anteriores")

    from bodegas.models import ItemsGuiaSalida
    from cotizaciones.models import ItemCotizacion

    c1 = HistorialCambiosOrden.objects.all().delete()[0]
    c2 = GastoOperativoEnOt.objects.all().delete()[0]
    c3 = SeguimientoItemOT.objects.all().delete()[0]
    c4 = ServicioEnOT.objects.all().delete()[0]
    c5 = SoporteTecnico.objects.all().delete()[0]
    c6 = OrdenDeTrabajo.objects.all().delete()[0]
    c7 = ItemsGuiaSalida.objects.all().delete()[0]
    c8 = GuiaSalida.objects.all().delete()[0]
    c9 = ItemCotizacion.objects.all().delete()[0]
    c10 = Cotizacion.objects.all().delete()[0]

    _print_ok(f"Historial OT: {c1} | Gastos: {c2} | Seguimientos: {c3}")
    _print_ok(f"Servicios: {c4} | Soportes: {c5} | OTs: {c6}")
    _print_ok(f"Items Guía: {c7} | Guías: {c8} | Items Cotización: {c9} | Cotizaciones: {c10}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Población masiva de datos transaccionales (Cotizaciones, Guías, OTs)"
    )
    parser.add_argument(
        "--cantidad",
        type=int,
        default=10,
        help="Cantidad de registros a crear por flujo (default: 10)",
    )
    parser.add_argument(
        "--solo",
        choices=["cotizaciones", "guias", "ots"],
        help="Ejecutar solo un flujo específico",
    )
    parser.add_argument(
        "--limpiar",
        action="store_true",
        help="Eliminar datos transaccionales existentes antes de crear nuevos",
    )
    args = parser.parse_args()

    _print_header("SEED TRANSACCIONAL — Cotizaciones · Guías de Salida · OTs v2")
    print(f"\n  Cantidad por flujo : {args.cantidad}")
    print(f"  Flujo seleccionado : {args.solo or 'todos'}")
    print(f"  Limpiar antes      : {'Sí' if args.limpiar else 'No'}")

    # Limpiar si se solicitó
    if args.limpiar:
        limpiar_datos_transaccionales()

    # Cargar datos base (valida prerrequisitos)
    datos = _cargar_datos_base()

    cotizaciones = []
    guias = []
    ots = []

    with transaction.atomic():
        solo = args.solo
        n = args.cantidad

        if solo is None or solo == "cotizaciones":
            cotizaciones = seed_cotizaciones(datos, n)

        if solo is None or solo == "guias":
            guias = seed_guias_salida(datos, n)

        if solo is None or solo == "ots":
            ots = seed_ordenes_trabajo(datos, n, cotizaciones, guias)

    # ── Resumen final ─────────────────────────────────────────────────────────
    _print_section("✅ SEED TRANSACCIONAL COMPLETADO")
    total_cot = Cotizacion.objects.count()
    total_guias = GuiaSalida.objects.count()
    total_ots = OrdenDeTrabajo.objects.count()
    total_sop = SoporteTecnico.objects.count()
    total_serv = ServicioEnOT.objects.count()
    total_seg = SeguimientoItemOT.objects.count()
    total_gas = GastoOperativoEnOt.objects.count()

    print(f"""
  📊 Totales en BD:
     • Cotizaciones        : {total_cot} (creadas esta ejecución: {len(cotizaciones)})
     • Guías de Salida     : {total_guias} (creadas esta ejecución: {len(guias)})
     • Órdenes de Trabajo  : {total_ots} (creadas esta ejecución: {len(ots)})
     • Soportes Técnicos   : {total_sop}
     • Servicios en OT     : {total_serv}
     • Seguimientos OT     : {total_seg}
     • Gastos Operativos   : {total_gas}

  🎯 Puedes ahora:
     • Explorar los datos desde el frontend (http://localhost:5173)
     • Probar los endpoints de la API (http://localhost:8000/api/)
     • Importar la colección Postman de postman/
""")


if __name__ == "__main__":
    main()
