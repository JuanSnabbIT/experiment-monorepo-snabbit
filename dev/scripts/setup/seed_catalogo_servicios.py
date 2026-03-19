#!/usr/bin/env python
"""
Seed: Catálogo de Servicios, Planes y Características — ERP Snabbit

Crea datos de catálogo orientados a empresas de servicios de TI:
  - Soporte técnico e informático
  - Telecomunicaciones
  - Distribución, instalación y configuración de productos tecnológicos

QUÉ CREA:
  ✅ 22 CaracteristicaServicio  (agrupadas por dominio)
  ✅ 12 Servicio                (distribuidos en las 5 categorías del sistema)
  ✅  4 PlanServicio            (agrupaciones de servicios)
  ✅ ServicioCaracteristica     (alcance de cada servicio)
  ✅ PlanServicioDetalle        (servicios dentro de cada plan)

CARACTERÍSTICAS:
  - Idempotente: usa get_or_create, se puede ejecutar múltiples veces
  - Asigna empresa_prestadora automáticamente (primera empresa del sistema)
  - Si hay más de una empresa, permite seleccionar por número

PREREQUISITOS:
  - seed_base.py ejecutado previamente (empresa base debe existir)

USO:
  cd backend
  python ..\\dev\\scripts\\setup\\seed_catalogo_servicios.py
"""

import os
import sys
from decimal import Decimal
from pathlib import Path

# ─────────────────────────────────────────────
# Setup Django
# ─────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parents[3]
BACKEND_PATH = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_PATH))
os.chdir(BACKEND_PATH)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")

import django
django.setup()

from contratos.models import (
    CaracteristicaServicio,
    PlanServicio,
    PlanServicioDetalle,
    Servicio,
    ServicioCaracteristica,
)
from django.db import transaction
from empresas.models import Empresa


# ─────────────────────────────────────────────
# Utilidades
# ─────────────────────────────────────────────

def print_section(title):
    print("\n" + "=" * 80)
    print(f"  {title}".ljust(80))
    print("=" * 80)


def print_step(step, total, msg):
    print(f"  [{step}/{total}] {msg}")


# ─────────────────────────────────────────────
# 0. Seleccionar empresa prestadora
# ─────────────────────────────────────────────

def seleccionar_empresa():
    print_section("0. Empresa Prestadora")

    empresas = list(Empresa.objects.all().order_by("id"))
    if not empresas:
        print("  ❌ No hay empresas en el sistema. Ejecuta seed_base.py primero.")
        sys.exit(1)

    if len(empresas) == 1:
        empresa = empresas[0]
        print_step(1, 1, f"Empresa seleccionada automáticamente: {empresa.nombre}")
        return empresa

    print("\n  Empresas disponibles:")
    for i, e in enumerate(empresas, 1):
        print(f"    {i}. {e.nombre} (RUT: {e.rut_empresa or 'N/A'})")

    print()
    while True:
        try:
            opcion = int(input("  Selecciona el número de empresa prestadora: ").strip())
            if 1 <= opcion <= len(empresas):
                empresa = empresas[opcion - 1]
                print_step(1, 1, f"Empresa seleccionada: {empresa.nombre}")
                return empresa
        except ValueError:
            pass
        print(f"  Opción inválida. Ingresa un número entre 1 y {len(empresas)}.")


# ─────────────────────────────────────────────
# 1. Características del servicio
# ─────────────────────────────────────────────

CARACTERISTICAS_DATA = [
    # --- Soporte técnico ---
    ("Soporte remoto",                  "Atención y resolución de incidencias vía acceso remoto al equipo o sistema"),
    ("Soporte presencial",              "Visita técnica en las dependencias del cliente para resolver incidencias"),
    ("Guardia de turno 24/7",           "Disponibilidad de ingenieros de guardia las 24 horas, los 7 días de la semana"),
    ("Tiempo de respuesta menor a 4h",  "SLA garantizado: inicio de atención en menos de 4 horas hábiles desde el reporte"),
    ("Gestión de tickets",              "Sistema de registro, seguimiento y cierre de solicitudes e incidencias"),
    ("Informe mensual de incidencias",  "Reporte detallado mensual con estadísticas, tendencias y recomendaciones"),
    # --- TI / Infraestructura ---
    ("Administración de servidores",    "Gestión, monitoreo y mantenimiento de servidores físicos y/o virtuales"),
    ("Backup y recuperación de datos",  "Ejecución de respaldos periódicos y procedimientos de recuperación ante fallos"),
    ("Monitoreo de red",                "Supervisión continua del estado y rendimiento de la infraestructura de red"),
    ("Administración de usuarios",      "Gestión de cuentas, permisos y roles en sistemas y directorios activos"),
    ("Gestión de parches",              "Aplicación periódica de actualizaciones de seguridad y parches de sistema"),
    # --- Telecomunicaciones ---
    ("Administración de central IP",    "Configuración y administración de central telefónica IP (PBX/VoIP)"),
    ("Gestión de conectividad WAN/LAN", "Administración de enlaces WAN, switches y topología de red local"),
    ("Configuración de firewall y VPN", "Implementación y mantenimiento de reglas de firewall y túneles VPN seguros"),
    ("Monitoreo de ancho de banda",     "Supervisión del consumo de ancho de banda y detección de anomalías de tráfico"),
    # --- Distribución y productos TI ---
    ("Suministro de equipos certificados",  "Provisión de hardware de marcas certificadas con garantía de fábrica"),
    ("Instalación y rack de equipos",       "Instalación física, cableado y organización en rack según estándares"),
    ("Configuración inicial de hardware",   "Configuración de BIOS, red, hostname y parámetros base del equipo"),
    ("Puesta en marcha en sitio",           "Pruebas funcionales, validación y entrega operativa en las instalaciones del cliente"),
    ("Capacitación al usuario final",       "Sesión de inducción y uso básico de los equipos o sistemas instalados"),
    ("Garantía extendida de equipos",       "Extensión de garantía post-venta con soporte del proveedor incluido"),
    # --- General ---
    ("Documentación técnica",           "Entrega de manuales, diagramas de red y registros de configuración"),
]


def create_caracteristicas(empresa):
    print_section("1. Características del Servicio")
    creadas = 0
    existentes = 0
    objetos = {}

    for nombre, descripcion in CARACTERISTICAS_DATA:
        caract, created = CaracteristicaServicio.objects.get_or_create(
            empresa_prestadora=empresa,
            nombre=nombre,
            defaults={"descripcion": descripcion, "activo": True},
        )
        objetos[nombre] = caract
        if created:
            creadas += 1
        else:
            existentes += 1

    print_step(1, 1, f"{creadas} creadas, {existentes} ya existían ({len(CARACTERISTICAS_DATA)} total)")
    return objetos


# ─────────────────────────────────────────────
# 2. Servicios
# ─────────────────────────────────────────────

# Estructura: (nombre, categoria, descripcion, precio_clp, precio_uf, precio_usd, veces_por_mes, [incluye_nombres], [no_incluye_nombres])
SERVICIOS_DATA = [
    # ── soporte ──────────────────────────────────────────────────────────────
    (
        "Soporte Técnico Básico",
        "soporte",
        "Soporte remoto en horario hábil para resolución de incidencias de hardware y software.",
        Decimal("120000"), Decimal("0"), Decimal("0"), 1,
        ["Soporte remoto", "Gestión de tickets", "Informe mensual de incidencias"],
        ["Soporte presencial", "Guardia de turno 24/7"],
    ),
    (
        "Soporte Técnico Premium",
        "soporte",
        "Soporte remoto y presencial con SLA garantizado y disponibilidad extendida.",
        Decimal("250000"), Decimal("0"), Decimal("0"), 1,
        ["Soporte remoto", "Soporte presencial", "Tiempo de respuesta menor a 4h",
         "Gestión de tickets", "Informe mensual de incidencias"],
        ["Guardia de turno 24/7"],
    ),
    (
        "Mesa de Ayuda 24/7",
        "soporte",
        "Servicio de helpdesk con guardia permanente y atención multicanal.",
        Decimal("0"), Decimal("5"), Decimal("0"), 1,
        ["Soporte remoto", "Guardia de turno 24/7", "Tiempo de respuesta menor a 4h",
         "Gestión de tickets", "Informe mensual de incidencias"],
        ["Soporte presencial"],
    ),
    # ── mantencion ───────────────────────────────────────────────────────────
    (
        "Mantención Preventiva Mensual",
        "mantencion",
        "Revisión y mantenimiento proactivo de infraestructura TI con informe de estado.",
        Decimal("180000"), Decimal("0"), Decimal("0"), 1,
        ["Administración de servidores", "Gestión de parches",
         "Monitoreo de red", "Informe mensual de incidencias", "Documentación técnica"],
        [],
    ),
    (
        "Administración de Infraestructura TI",
        "mantencion",
        "Gestión integral de servidores, usuarios y red con monitoreo continuo.",
        Decimal("0"), Decimal("8"), Decimal("0"), 1,
        ["Administración de servidores", "Administración de usuarios",
         "Monitoreo de red", "Gestión de parches", "Documentación técnica"],
        [],
    ),
    (
        "Backup y Recuperación de Datos",
        "mantencion",
        "Implementación y operación de solución de respaldo con pruebas periódicas de restauración.",
        Decimal("150000"), Decimal("0"), Decimal("0"), 1,
        ["Backup y recuperación de datos", "Informe mensual de incidencias", "Documentación técnica"],
        ["Soporte presencial"],
    ),
    # ── datacenter ───────────────────────────────────────────────────────────
    (
        "Gestión de Conectividad y Red",
        "datacenter",
        "Administración de WAN/LAN, firewall y VPN con monitoreo de ancho de banda.",
        Decimal("0"), Decimal("6"), Decimal("0"), 1,
        ["Gestión de conectividad WAN/LAN", "Configuración de firewall y VPN",
         "Monitoreo de ancho de banda", "Documentación técnica"],
        [],
    ),
    (
        "Administración de Central Telefónica IP",
        "datacenter",
        "Configuración, mantenimiento y soporte de central PBX/VoIP corporativa.",
        Decimal("0"), Decimal("4"), Decimal("0"), 1,
        ["Administración de central IP", "Soporte remoto",
         "Gestión de tickets", "Documentación técnica"],
        ["Soporte presencial"],
    ),
    # ── capacitacion ─────────────────────────────────────────────────────────
    (
        "Capacitación Herramientas TI",
        "capacitacion",
        "Sesión de capacitación en herramientas ofimáticas, colaboración y productividad.",
        Decimal("90000"), Decimal("0"), Decimal("0"), 1,
        ["Capacitación al usuario final", "Documentación técnica"],
        [],
    ),
    (
        "Capacitación en Ciberseguridad",
        "capacitacion",
        "Taller de buenas prácticas de seguridad informática para usuarios finales y equipos TI.",
        Decimal("0"), Decimal("2.5"), Decimal("0"), 1,
        ["Capacitación al usuario final", "Documentación técnica"],
        [],
    ),
    # ── desarrollo (instalación/distribución) ────────────────────────────────
    (
        "Instalación y Configuración de Equipos",
        "desarrollo",
        "Instalación física, configuración inicial y puesta en marcha de equipos TI en sitio.",
        Decimal("80000"), Decimal("0"), Decimal("0"), 1,
        ["Instalación y rack de equipos", "Configuración inicial de hardware",
         "Puesta en marcha en sitio", "Capacitación al usuario final", "Documentación técnica"],
        [],
    ),
    (
        "Distribución e Instalación de Hardware",
        "desarrollo",
        "Suministro, instalación y garantía extendida de equipos tecnológicos certificados.",
        Decimal("0"), Decimal("0"), Decimal("400"), 1,
        ["Suministro de equipos certificados", "Instalación y rack de equipos",
         "Configuración inicial de hardware", "Garantía extendida de equipos",
         "Puesta en marcha en sitio"],
        ["Capacitación al usuario final"],
    ),
]


def create_servicios(empresa, caracteristicas):
    print_section("2. Servicios")
    creados = 0
    existentes = 0
    objetos = {}

    for (nombre, categoria, descripcion, precio_clp, precio_uf, precio_usd,
         veces, incluye_nombres, no_incluye_nombres) in SERVICIOS_DATA:

        servicio, created = Servicio.objects.get_or_create(
            empresa_prestadora=empresa,
            nombre=nombre,
            es_vigente=True,
            defaults={
                "categoria": categoria,
                "descripcion": descripcion,
                "precio_clp": precio_clp,
                "precio_uf": precio_uf,
                "precio_usd": precio_usd,
                "veces_por_mes_default": veces,
                "activo": True,
                "version": 1,
            },
        )
        objetos[nombre] = servicio

        if created:
            # Crear alcance (ServicioCaracteristica)
            todas = []
            for orden, nombre_caract in enumerate(incluye_nombres):
                caract = caracteristicas.get(nombre_caract)
                if caract:
                    ServicioCaracteristica.objects.get_or_create(
                        servicio=servicio,
                        caracteristica=caract,
                        defaults={"modo": "incluye", "orden": orden},
                    )
                    todas.append(caract)
            for orden, nombre_caract in enumerate(no_incluye_nombres, len(incluye_nombres)):
                caract = caracteristicas.get(nombre_caract)
                if caract:
                    ServicioCaracteristica.objects.get_or_create(
                        servicio=servicio,
                        caracteristica=caract,
                        defaults={"modo": "no_incluye", "orden": orden},
                    )

            # Sincronizar M2M de características
            servicio.caracteristicas.set([c for c in todas])

            # Generar textos de alcance
            incluye_texto = servicio.construir_texto_alcance("incluye")
            no_incluye_texto = servicio.construir_texto_alcance("no_incluye")
            if incluye_texto or no_incluye_texto:
                servicio.incluye = incluye_texto
                servicio.no_incluye = no_incluye_texto
                servicio.save(update_fields=["incluye", "no_incluye"])

            creados += 1
        else:
            existentes += 1

    print_step(1, 1, f"{creados} creados, {existentes} ya existían ({len(SERVICIOS_DATA)} total)")
    return objetos


# ─────────────────────────────────────────────
# 3. Planes de servicio
# ─────────────────────────────────────────────

# Estructura: (nombre, descripcion, [nombres_servicios_incluidos])
PLANES_DATA = [
    (
        "Plan Soporte Esencial",
        "Cobertura básica de soporte técnico remoto y mantención preventiva mensual para PYMES.",
        [
            "Soporte Técnico Básico",
            "Mantención Preventiva Mensual",
        ],
    ),
    (
        "Plan TI Completo",
        "Gestión integral de infraestructura TI con soporte premium, backup y administración de red.",
        [
            "Soporte Técnico Premium",
            "Administración de Infraestructura TI",
            "Backup y Recuperación de Datos",
        ],
    ),
    (
        "Plan Telecomunicaciones",
        "Administración de conectividad WAN/LAN y central telefónica IP con monitoreo incluido.",
        [
            "Gestión de Conectividad y Red",
            "Administración de Central Telefónica IP",
        ],
    ),
    (
        "Plan Integral TI Premium",
        "Solución completa de TI: soporte 24/7, infraestructura, telecomunicaciones y backup.",
        [
            "Mesa de Ayuda 24/7",
            "Administración de Infraestructura TI",
            "Backup y Recuperación de Datos",
            "Gestión de Conectividad y Red",
            "Administración de Central Telefónica IP",
        ],
    ),
]


def create_planes(empresa, servicios):
    print_section("3. Planes de Servicio")
    creados = 0
    existentes = 0

    for nombre, descripcion, nombres_servicios in PLANES_DATA:
        plan, created = PlanServicio.objects.get_or_create(
            empresa_prestadora=empresa,
            nombre=nombre,
            es_vigente=True,
            defaults={
                "descripcion": descripcion,
                "activo": True,
                "version": 1,
            },
        )

        if created:
            for orden, nombre_servicio in enumerate(nombres_servicios):
                servicio = servicios.get(nombre_servicio)
                if servicio:
                    PlanServicioDetalle.objects.get_or_create(
                        plan=plan,
                        servicio_version=servicio,
                        defaults={"orden": orden, "obligatorio": True, "cantidad_default": 1},
                    )
            creados += 1
        else:
            existentes += 1

    print_step(1, 1, f"{creados} creados, {existentes} ya existían ({len(PLANES_DATA)} total)")


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def main():
    print("\n")
    print("┌" + "─" * 78 + "┐")
    print("│" + "SEED CATÁLOGO DE SERVICIOS — ERP Snabbit".center(78) + "│")
    print("│" + "Soporte TI | Telecomunicaciones | Distribución Tecnológica".center(78) + "│")
    print("└" + "─" * 78 + "┘")

    empresa = seleccionar_empresa()

    with transaction.atomic():
        caracteristicas = create_caracteristicas(empresa)
        servicios = create_servicios(empresa, caracteristicas)
        create_planes(empresa, servicios)

    print("\n")
    print("┌" + "─" * 78 + "┐")
    print("│" + "✅  Seed completado exitosamente".center(78) + "│")
    print("└" + "─" * 78 + "┘\n")


if __name__ == "__main__":
    main()
