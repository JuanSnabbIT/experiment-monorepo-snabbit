#!/usr/bin/env python
"""
Seed de datos de prueba — Servicios, Planes y Caracteristicas TI/Telecomunicaciones

Crea:
  - 18 Caracteristicas (atributos reutilizables)
  -  9 Servicios con alcance (incluye / no incluye)
  -  4 Planes que agrupan servicios

Prerequisitos:
  - seed_base.py ya ejecutado (empresa "Snabbit" debe existir)
  - Migraciones aplicadas

Uso:
  cd backend
  python ..\\dev\\scripts\\seed_servicios_ti.py
"""

import os
import sys
from decimal import Decimal
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_PATH = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_PATH))
os.chdir(BACKEND_PATH)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")

import django
django.setup()

from django.db import transaction
from empresas.models import Empresa
from contratos.models import (
    CaracteristicaServicio,
    Servicio,
    ServicioCaracteristica,
    PlanServicio,
    PlanServicioDetalle,
)


def print_section(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_ok(msg):
    print(f"  [OK] {msg}")


def print_skip(msg):
    print(f"  [--] {msg} (ya existe)")


# ---------------------------------------------------------------------------
# DATOS
# ---------------------------------------------------------------------------

CARACTERISTICAS = [
    # nombre                                    descripcion
    ("Soporte remoto",                          "Atencion y resolucion de incidencias de forma remota via herramienta de acceso."),
    ("Soporte presencial",                      "Visita tecnica al sitio del cliente para resolver el incidente in situ."),
    ("Monitoreo 24/7",                          "Supervision continua de dispositivos e infraestructura las 24 horas, los 7 dias."),
    ("SLA 4 horas",                             "Tiempo maximo de respuesta garantizado de 4 horas habiles."),
    ("SLA 8 horas",                             "Tiempo maximo de respuesta garantizado de 8 horas habiles."),
    ("SLA 24 horas",                            "Tiempo maximo de respuesta garantizado de 24 horas habiles."),
    ("Backup diario",                           "Copia de seguridad automatica diaria de la informacion critica del cliente."),
    ("Backup semanal",                          "Copia de seguridad automatica semanal."),
    ("Instalacion de equipos",                  "Montaje fisico, cableado y configuracion inicial de equipos en terreno."),
    ("Configuracion basica",                    "Parametrizacion estandar del equipo segun perfil de la instalacion."),
    ("Configuracion avanzada",                  "Parametrizacion detallada con reglas personalizadas, VLANs, ACLs, etc."),
    ("Acceso a grabacion en nube",              "Almacenamiento y acceso remoto a grabaciones de camara via plataforma cloud."),
    ("Acceso a grabacion local",                "Grabacion almacenada en DVR/NVR local del cliente."),
    ("Capacitacion a usuario final",            "Sesion de entrenamiento al personal del cliente para uso del sistema instalado."),
    ("Informe tecnico post-servicio",           "Documento de cierre con detalle de trabajos realizados, estado y recomendaciones."),
    ("Garantia de equipo 12 meses",             "Garantia sobre materiales y mano de obra por 12 meses desde la instalacion."),
    ("Actualizacion de firmware",               "Actualizacion de software embebido en dispositivos de red, camaras o alarmas."),
    ("Gestion de usuarios y permisos",          "Creacion, modificacion y baja de usuarios en el sistema administrado."),
]

# categoria in ('mantencion','desarrollo','soporte','capacitacion','datacenter')
SERVICIOS = [
    {
        "nombre": "Instalacion de Camaras IP",
        "descripcion": "Instalacion, cableado y configuracion de camaras de videovigilancia IP incluyendo NVR y acceso remoto.",
        "categoria": "mantencion",
        "precio_clp": Decimal("120000"),
        "incluye_idx": [8, 9, 12, 14, 15],    # indices en CARACTERISTICAS (0-based)
        "no_incluye_idx": [11],
    },
    {
        "nombre": "Instalacion de Alarma de Intrusion",
        "descripcion": "Instalacion de central de alarma, sensores de movimiento, contactos magneticos y sirena con comunicacion GSM.",
        "categoria": "mantencion",
        "precio_clp": Decimal("95000"),
        "incluye_idx": [8, 9, 13, 15],
        "no_incluye_idx": [1],
    },
    {
        "nombre": "Instalacion y Configuracion de Red LAN/WiFi",
        "descripcion": "Instalacion de switch, access points y cableado estructurado Cat6. Configuracion de VLANs y red inalambrica segmentada.",
        "categoria": "mantencion",
        "precio_clp": Decimal("150000"),
        "incluye_idx": [8, 10, 16],
        "no_incluye_idx": [],
    },
    {
        "nombre": "Soporte Helpdesk TI",
        "descripcion": "Mesa de ayuda para usuarios finales: reset de credenciales, problemas de conectividad, impresoras, software de oficina.",
        "categoria": "soporte",
        "precio_clp": Decimal("45000"),
        "incluye_idx": [0, 3, 13],
        "no_incluye_idx": [1],
    },
    {
        "nombre": "Mantencion Preventiva de Red",
        "descripcion": "Revision mensual de switches, routers y access points: actualizacion de firmware, limpieza de logs y reporte de estado.",
        "categoria": "mantencion",
        "precio_clp": Decimal("60000"),
        "incluye_idx": [1, 14, 16],
        "no_incluye_idx": [2],
    },
    {
        "nombre": "Monitoreo y Alertas de Infraestructura",
        "descripcion": "Supervision proactiva con herramientas NOC: alertas en tiempo real ante caidas, saturacion o anomalias de red.",
        "categoria": "datacenter",
        "precio_clp": Decimal("0"),
        "precio_uf": Decimal("2.5"),
        "incluye_idx": [2, 3, 14],
        "no_incluye_idx": [1],
    },
    {
        "nombre": "Backup y Recuperacion en Nube",
        "descripcion": "Solucion de backup automatico diario hacia almacenamiento cloud con retencion de 30 dias y restauracion garantizada.",
        "categoria": "datacenter",
        "precio_uf": Decimal("1.8"),
        "incluye_idx": [6, 11, 14],
        "no_incluye_idx": [7],
    },
    {
        "nombre": "Administracion de Usuarios y Equipos",
        "descripcion": "Gestion del directorio activo o IdP: altas, bajas, cambios de rol, politicas de contrasenas y reporte mensual.",
        "categoria": "soporte",
        "precio_clp": Decimal("35000"),
        "incluye_idx": [0, 17, 14],
        "no_incluye_idx": [1],
    },
    {
        "nombre": "Capacitacion en Uso de Sistemas",
        "descripcion": "Sesiones de capacitacion al usuario final en herramientas instaladas: camara, alarma, red o software de gestion.",
        "categoria": "capacitacion",
        "precio_clp": Decimal("50000"),
        "incluye_idx": [13, 14],
        "no_incluye_idx": [],
    },
]

PLANES = [
    {
        "nombre": "Plan Vigilancia Basica",
        "descripcion": "Ideal para locales o viviendas. Incluye instalacion de camaras y alarma con soporte remoto ante incidentes.",
        "servicios_idx": [0, 1],  # indices en SERVICIOS (0-based)
        "precio_clp": Decimal("180000"),
        "num_visitas_mensuales": 1,
    },
    {
        "nombre": "Plan TI Esencial",
        "descripcion": "Soporte helpdesk mensual mas monitoreo de red para PYMEs. Sin contrato de instalacion.",
        "servicios_idx": [3, 4],
        "precio_clp": Decimal("95000"),
        "num_visitas_mensuales": 1,
    },
    {
        "nombre": "Plan TI Completo",
        "descripcion": "Servicio integral para empresas: helpdesk, monitoreo 24/7, backup en nube y administracion de usuarios.",
        "servicios_idx": [3, 5, 6, 7],
        "precio_uf": Decimal("6.5"),
        "num_visitas_mensuales": 2,
    },
    {
        "nombre": "Plan Infraestructura 360",
        "descripcion": "Cobertura total: red, videovigilancia, alarma, monitoreo y backup. Para empresas que requieren maxima disponibilidad.",
        "servicios_idx": [0, 1, 2, 4, 5, 6],
        "precio_uf": Decimal("12.0"),
        "num_visitas_mensuales": 4,
    },
]


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def run():
    empresa = Empresa.objects.filter(nombre__icontains="snabbit").first()
    if not empresa:
        empresa = Empresa.objects.first()
    if not empresa:
        print("ERROR: No se encontro ninguna empresa. Ejecuta seed_base.py primero.")
        sys.exit(1)

    print(f"\nEmpresa prestadora: {empresa.nombre} (id={empresa.id})")

    with transaction.atomic():
        # ---- Caracteristicas -----------------------------------------------
        print_section("Caracteristicas de servicio")
        carac_objs = []
        for nombre, descripcion in CARACTERISTICAS:
            obj, created = CaracteristicaServicio.objects.get_or_create(
                empresa_prestadora=empresa,
                nombre=nombre,
                defaults={"descripcion": descripcion, "activo": True},
            )
            carac_objs.append(obj)
            if created:
                print_ok(nombre)
            else:
                print_skip(nombre)

        # ---- Servicios -------------------------------------------------------
        print_section("Servicios")
        servicio_objs = []
        for sdata in SERVICIOS:
            defaults = {
                "descripcion": sdata["descripcion"],
                "categoria": sdata["categoria"],
                "precio_clp": sdata.get("precio_clp", Decimal("0")),
                "precio_uf": sdata.get("precio_uf", Decimal("0")),
                "precio_usd": sdata.get("precio_usd", Decimal("0")),
                "activo": True,
                "es_vigente": True,
            }
            obj, created = Servicio.objects.get_or_create(
                empresa_prestadora=empresa,
                nombre=sdata["nombre"],
                defaults=defaults,
            )
            servicio_objs.append(obj)

            # Alcance: incluye
            orden = 0
            for idx in sdata.get("incluye_idx", []):
                carac = carac_objs[idx]
                ServicioCaracteristica.objects.get_or_create(
                    servicio=obj,
                    caracteristica=carac,
                    defaults={"modo": ServicioCaracteristica.MODO_INCLUYE, "orden": orden},
                )
                orden += 1

            # Alcance: no incluye
            for idx in sdata.get("no_incluye_idx", []):
                carac = carac_objs[idx]
                ServicioCaracteristica.objects.get_or_create(
                    servicio=obj,
                    caracteristica=carac,
                    defaults={"modo": ServicioCaracteristica.MODO_NO_INCLUYE, "orden": orden},
                )
                orden += 1

            if created:
                print_ok(sdata["nombre"])
            else:
                print_skip(sdata["nombre"])

        # ---- Planes ----------------------------------------------------------
        print_section("Planes de servicio")
        for pdata in PLANES:
            defaults = {
                "descripcion": pdata["descripcion"],
                "precio_clp": pdata.get("precio_clp", Decimal("0")),
                "precio_uf": pdata.get("precio_uf", Decimal("0")),
                "precio_usd": pdata.get("precio_usd", Decimal("0")),
                "num_visitas_mensuales": pdata.get("num_visitas_mensuales"),
                "activo": True,
                "es_vigente": True,
            }
            plan, created = PlanServicio.objects.get_or_create(
                empresa_prestadora=empresa,
                nombre=pdata["nombre"],
                defaults=defaults,
            )

            # Vincular servicios via through
            for orden, idx in enumerate(pdata["servicios_idx"]):
                servicio = servicio_objs[idx]
                PlanServicioDetalle.objects.get_or_create(
                    plan=plan,
                    servicio_version=servicio,
                    defaults={"orden": orden},
                )

            if created:
                print_ok(pdata["nombre"])
            else:
                print_skip(pdata["nombre"])

    print_section("Resumen final")
    print(f"  Caracteristicas : {CaracteristicaServicio.objects.filter(empresa_prestadora=empresa).count()}")
    print(f"  Servicios       : {Servicio.objects.filter(empresa_prestadora=empresa).count()}")
    print(f"  Planes          : {PlanServicio.objects.filter(empresa_prestadora=empresa).count()}")
    print("\n  Seed completado.\n")


if __name__ == "__main__":
    run()
