"""
Comando para pre-cargar indicadores económicos desde Mindicador.cl

Uso:
    python manage.py seed_indicadores              # Últimos 90 días
    python manage.py seed_indicadores --dias 365   # Último año
    python manage.py seed_indicadores --force      # Reescribir existentes
"""

import logging
import time
from datetime import date, timedelta
from decimal import Decimal

import requests
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import IndicadorEconomico

logger = logging.getLogger(__name__)

MINDICADOR_API_URL = "https://mindicador.cl/api"
API_TIMEOUT_SECONDS = 20
INDICADORES = ["dolar", "uf"]
# Espera entre llamadas para no saturar API (milisegundos)
DELAY_ENTRE_LLAMADAS_MS = 500


class Command(BaseCommand):
    help = "Carga indicadores económicos históricos desde Mindicador.cl"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dias",
            type=int,
            default=90,
            help="Cantidad de días hacia atrás a cargar (default: 90)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Sobrescribir valores existentes",
        )
        parser.add_argument(
            "--indicador",
            type=str,
            choices=INDICADORES,
            help="Cargar solo un indicador específico (dolar o uf)",
        )

    def handle(self, *args, **options):
        dias = options["dias"]
        force = options["force"]
        indicador_especifico = options.get("indicador")

        indicadores_a_cargar = [indicador_especifico] if indicador_especifico else INDICADORES
        
        self.stdout.write(
            self.style.NOTICE(
                f"Cargando indicadores: {indicadores_a_cargar} - Últimos {dias} días"
            )
        )

        hoy = timezone.localdate()
        total_creados = 0
        total_existentes = 0
        total_errores = 0

        for indicador in indicadores_a_cargar:
            self.stdout.write(f"\n📊 Procesando {indicador.upper()}...")
            
            try:
                # Obtener serie histórica completa del indicador
                url = f"{MINDICADOR_API_URL}/{indicador}"
                self.stdout.write(f"   Consultando API: {url}")
                
                response = requests.get(url, timeout=API_TIMEOUT_SECONDS)
                
                if not response.ok:
                    self.stdout.write(
                        self.style.ERROR(f"   ❌ API retornó {response.status_code}")
                    )
                    total_errores += 1
                    continue

                data = response.json()
                serie = data.get("serie", [])
                
                if not serie:
                    self.stdout.write(self.style.WARNING(f"   ⚠️ Serie vacía"))
                    continue

                self.stdout.write(f"   Registros en API: {len(serie)}")

                # Filtrar por rango de días
                fecha_limite = hoy - timedelta(days=dias)
                registros_filtrados = []
                
                for entry in serie:
                    fecha_str = entry.get("fecha", "")
                    if not fecha_str:
                        continue
                    
                    try:
                        # Mindicador usa ISO format con 'Z'
                        fecha = date.fromisoformat(fecha_str[:10])
                        if fecha >= fecha_limite:
                            registros_filtrados.append({
                                "fecha": fecha,
                                "valor": Decimal(str(entry["valor"])),
                            })
                    except (ValueError, KeyError) as e:
                        logger.warning(f"Error parseando entrada: {entry} - {e}")
                        continue

                self.stdout.write(f"   Registros en rango: {len(registros_filtrados)}")

                # Insertar/actualizar en BD
                creados = 0
                existentes = 0
                
                for registro in registros_filtrados:
                    try:
                        if force:
                            obj, created = IndicadorEconomico.objects.update_or_create(
                                tipo=indicador,
                                fecha=registro["fecha"],
                                defaults={
                                    "valor": registro["valor"],
                                    "fuente": "mindicador.cl (seed)",
                                }
                            )
                            if created:
                                creados += 1
                            else:
                                existentes += 1
                        else:
                            obj, created = IndicadorEconomico.objects.get_or_create(
                                tipo=indicador,
                                fecha=registro["fecha"],
                                defaults={
                                    "valor": registro["valor"],
                                    "fuente": "mindicador.cl (seed)",
                                }
                            )
                            if created:
                                creados += 1
                            else:
                                existentes += 1
                    except Exception as e:
                        logger.error(f"Error guardando {indicador} {registro['fecha']}: {e}")
                        total_errores += 1

                total_creados += creados
                total_existentes += existentes
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f"   ✅ {indicador.upper()}: {creados} creados, {existentes} existentes"
                    )
                )

                # Delay entre indicadores para no saturar API
                time.sleep(DELAY_ENTRE_LLAMADAS_MS / 1000)

            except requests.exceptions.Timeout:
                self.stdout.write(
                    self.style.ERROR(f"   ❌ Timeout consultando {indicador}")
                )
                total_errores += 1
            except requests.exceptions.RequestException as e:
                self.stdout.write(
                    self.style.ERROR(f"   ❌ Error de red: {e}")
                )
                total_errores += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"   ❌ Error inesperado: {e}")
                )
                total_errores += 1

        # Resumen final
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(
            self.style.SUCCESS(
                f"✅ COMPLETADO: {total_creados} creados, {total_existentes} existentes, {total_errores} errores"
            )
        )
        
        # Mostrar estadísticas de BD
        total_bd = IndicadorEconomico.objects.count()
        self.stdout.write(f"📊 Total registros en BD: {total_bd}")
        
        for ind in INDICADORES:
            count = IndicadorEconomico.objects.filter(tipo=ind).count()
            ultimo = IndicadorEconomico.objects.filter(tipo=ind).order_by("-fecha").first()
            if ultimo:
                self.stdout.write(
                    f"   {ind.upper()}: {count} registros, último: {ultimo.fecha} = ${ultimo.valor}"
                )
