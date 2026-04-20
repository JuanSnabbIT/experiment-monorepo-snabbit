"""
Comando de gestión: sanear_datos_historicos

Fase 4 del plan de alineación de datos históricos.

Detecta y sanea inconsistencias en la base de datos existente antes del despliegue
del nuevo sistema de trazabilidad (BitácoraMovimiento, SerieItem).

Problemas detectados:
  1. Series duplicadas (mismo código en misma empresa)
  2. Series huérfanas (sin stock_item válido)
  3. Series en estado inválido
  4. Series activas sin correlación con stock disponible
  5. Stock negativo
  6. Diferencias entre stock registrado y series activas

Modo de uso:
  python manage.py sanear_datos_historicos --reporte        # solo detecta, sin modificar
  python manage.py sanear_datos_historicos --sanear         # detecta y corrige automáticamente
  python manage.py sanear_datos_historicos --sanear --dry-run  # simula correcciones
  python manage.py sanear_datos_historicos --empresa-id 5  # filtra por empresa
"""

import json
from datetime import datetime, timezone as dt_timezone

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone


ESTADOS_VALIDOS_SERIE = {'disponible', 'reservada', 'despachada', 'devuelta'}


class Command(BaseCommand):
    help = (
        "Detecta y sanea inconsistencias en datos históricos de bodegas/series/stock. "
        "Fase 4 del plan de alineación de datos."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--reporte',
            action='store_true',
            default=False,
            help='Solo genera reporte de inconsistencias, no modifica nada.',
        )
        parser.add_argument(
            '--sanear',
            action='store_true',
            default=False,
            help='Detecta y aplica correcciones automáticas.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=False,
            dest='dry_run',
            help='Simula las correcciones sin persistir cambios (requiere --sanear).',
        )
        parser.add_argument(
            '--empresa-id',
            type=int,
            default=None,
            dest='empresa_id',
            help='Limita el análisis a una empresa específica (por ID).',
        )
        parser.add_argument(
            '--output',
            type=str,
            default=None,
            help='Ruta del archivo JSON donde exportar el reporte (opcional).',
        )

    def handle(self, *args, **options):
        if not options['reporte'] and not options['sanear']:
            raise CommandError(
                "Debes especificar --reporte o --sanear. "
                "Usa --help para ver las opciones."
            )

        dry_run = options['dry_run']
        empresa_id = options['empresa_id']

        self.stdout.write(self.style.MIGRATE_HEADING(
            "\n=== Fase 4: Detección y Saneamiento de Datos Históricos ==="
        ))
        self.stdout.write(f"Modo: {'REPORTE' if options['reporte'] else 'SANEAMIENTO'}")
        if dry_run:
            self.stdout.write(self.style.WARNING("Dry-run activado: no se aplicarán cambios"))
        if empresa_id:
            self.stdout.write(f"Filtrando por empresa ID={empresa_id}")

        inicio = timezone.now()

        # Cargar modelos aquí para evitar import circular en nivel de módulo
        from bodegas.models import (
            SerieItem, StockItemEnBodega, Bodega, AnomalíaMovimiento
        )
        from empresas.models import Empresa

        # Filtrar empresas
        empresas_qs = Empresa.objects.all()
        if empresa_id:
            empresas_qs = empresas_qs.filter(pk=empresa_id)
            if not empresas_qs.exists():
                raise CommandError(f"No se encontró empresa con ID={empresa_id}")

        reporte = {
            'fecha_ejecucion': inicio.isoformat(),
            'modo': 'reporte' if options['reporte'] else 'saneamiento',
            'dry_run': dry_run,
            'empresa_id': empresa_id,
            'detecciones': [],
            'correcciones': [],
            'resumen': {},
        }

        total_inconsistencias = 0
        total_corregidas = 0

        # ── 1. Series duplicadas ───────────────────────────────────────────────
        self.stdout.write("\n[1/6] Buscando series duplicadas...")
        duplicadas = (
            SerieItem.objects
            .values('serie', 'empresa')
            .annotate(total=Count('id'))
            .filter(total__gt=1)
        )
        if empresa_id:
            duplicadas = duplicadas.filter(empresa_id=empresa_id)

        for dup in duplicadas:
            total_inconsistencias += 1
            detalle = {
                'tipo': 'serie_duplicada',
                'serie': dup['serie'],
                'empresa_id': dup['empresa'],
                'cantidad_duplicados': dup['total'],
                'accion': 'requiere_revision_manual',
            }
            reporte['detecciones'].append(detalle)
            self.stdout.write(
                self.style.WARNING(
                    f"  Serie duplicada: '{dup['serie']}' x{dup['total']} "
                    f"(empresa {dup['empresa']})"
                )
            )
            # Registrar anomalía en BD
            if not dry_run and options['sanear']:
                series_qs = SerieItem.objects.filter(
                    serie=dup['serie'], empresa_id=dup['empresa']
                )
                AnomalíaMovimiento.objects.get_or_create(
                    empresa_id=dup['empresa'],
                    tipo_anomalia='serie_duplicada',
                    resuelta=False,
                    defaults={
                        'descripcion': (
                            f"Serie '{dup['serie']}' duplicada "
                            f"({dup['total']} registros)"
                        ),
                        'datos_anomalia': {
                            'serie': dup['serie'],
                            'ids': list(series_qs.values_list('id', flat=True)),
                            'cantidad': dup['total'],
                        },
                    }
                )

        # ── 2. Series huérfanas (sin stock_item válido) ───────────────────────
        self.stdout.write("\n[2/6] Buscando series huérfanas (sin stock_item)...")
        series_huerfanas_qs = SerieItem.objects.filter(stock_item__isnull=True)
        if empresa_id:
            series_huerfanas_qs = series_huerfanas_qs.filter(empresa_id=empresa_id)

        count_huerfanas = series_huerfanas_qs.count()
        if count_huerfanas:
            total_inconsistencias += count_huerfanas
            self.stdout.write(
                self.style.WARNING(f"  {count_huerfanas} series sin stock_item")
            )
            for serie in series_huerfanas_qs:
                detalle = {
                    'tipo': 'serie_huerfana',
                    'serie_id': serie.id,
                    'serie': serie.serie,
                    'empresa_id': serie.empresa_id,
                    'estado': serie.estado,
                    'accion': 'marcar_anomalia',
                }
                reporte['detecciones'].append(detalle)
                if not dry_run and options['sanear']:
                    AnomalíaMovimiento.objects.get_or_create(
                        empresa_id=serie.empresa_id,
                        tipo_anomalia='movimiento_huerfano',
                        serie_item=serie,
                        resuelta=False,
                        defaults={
                            'descripcion': (
                                f"SerieItem id={serie.id} '{serie.serie}' "
                                "sin stock_item asociado"
                            ),
                            'datos_anomalia': {
                                'serie_id': serie.id,
                                'serie': serie.serie,
                                'estado': serie.estado,
                            },
                        }
                    )
        else:
            self.stdout.write("  OK — ninguna serie huérfana")

        # ── 3. Series en estado inválido ───────────────────────────────────────
        self.stdout.write("\n[3/6] Buscando series con estado inválido...")
        series_invalidas_qs = SerieItem.objects.exclude(estado__in=ESTADOS_VALIDOS_SERIE)
        if empresa_id:
            series_invalidas_qs = series_invalidas_qs.filter(empresa_id=empresa_id)

        count_invalidas = series_invalidas_qs.count()
        if count_invalidas:
            total_inconsistencias += count_invalidas
            self.stdout.write(
                self.style.WARNING(f"  {count_invalidas} series con estado inválido")
            )
            for serie in series_invalidas_qs:
                detalle = {
                    'tipo': 'estado_invalido',
                    'serie_id': serie.id,
                    'serie': serie.serie,
                    'estado_actual': serie.estado,
                    'empresa_id': serie.empresa_id,
                    'accion': 'corregir_a_disponible' if options['sanear'] else 'pendiente',
                }
                reporte['detecciones'].append(detalle)
                if options['sanear']:
                    if not dry_run:
                        with transaction.atomic():
                            serie.estado = 'disponible'
                            serie.save(update_fields=['estado'])
                    reporte['correcciones'].append({
                        'serie_id': serie.id,
                        'serie': serie.serie,
                        'estado_anterior': detalle['estado_actual'],
                        'estado_nuevo': 'disponible',
                        'motivo': 'Estado inválido corregido a disponible',
                        'dry_run': dry_run,
                    })
                    total_corregidas += 1
                    self.stdout.write(
                        f"  Corregida serie {serie.serie}: "
                        f"'{detalle['estado_actual']}' → 'disponible'"
                        + (" (dry-run)" if dry_run else "")
                    )
        else:
            self.stdout.write("  OK — todos los estados son válidos")

        # ── 4. Series activas sin correlación con stock ────────────────────────
        self.stdout.write(
            "\n[4/6] Verificando correlación series activas ↔ stock disponible..."
        )
        stock_items_qs = StockItemEnBodega.objects.all()
        if empresa_id:
            stock_items_qs = stock_items_qs.filter(bodega__sucursal__empresa_id=empresa_id)

        problemas_correlacion = 0
        for stock in stock_items_qs.select_related('bodega', 'item'):
            series_activas = SerieItem.objects.filter(
                stock_item=stock,
                estado__in=['disponible', 'reservada'],
            )
            cant_activas = series_activas.count()
            cantidad_disponible = stock.cantidad - stock.cantidad_no_disponible

            if cant_activas > cantidad_disponible:
                inconsistencia = cant_activas - cantidad_disponible
                problemas_correlacion += inconsistencia
                total_inconsistencias += 1
                detalle = {
                    'tipo': 'series_sin_correlacion_stock',
                    'stock_item_id': stock.id,
                    'item': str(stock.item),
                    'bodega': str(stock.bodega),
                    'cantidad_stock_disponible': cantidad_disponible,
                    'cantidad_series_activas': cant_activas,
                    'diferencia': inconsistencia,
                    'accion': 'marcar_anomalia',
                }
                reporte['detecciones'].append(detalle)
                self.stdout.write(
                    self.style.WARNING(
                        f"  {stock.item} [{stock.bodega}]: "
                        f"{cant_activas} series activas > {cantidad_disponible} stock disponible "
                        f"(Δ+{inconsistencia})"
                    )
                )
                if not dry_run and options['sanear']:
                    empresa_obj = (
                        stock.bodega.sucursal.empresa
                        if hasattr(stock.bodega, 'sucursal')
                        else None
                    )
                    if empresa_obj:
                        AnomalíaMovimiento.objects.get_or_create(
                            empresa=empresa_obj,
                            tipo_anomalia='inconsistencia_series',
                            stock_item=stock,
                            resuelta=False,
                            defaults={
                                'descripcion': (
                                    f"{cant_activas} series activas superan el stock "
                                    f"disponible ({cantidad_disponible}) en {stock.item} / {stock.bodega}"
                                ),
                                'datos_anomalia': detalle,
                                'bodega': stock.bodega,
                            }
                        )

        if problemas_correlacion == 0:
            self.stdout.write("  OK — series activas consistentes con stock")

        # ── 5. Stock negativo ──────────────────────────────────────────────────
        self.stdout.write("\n[5/6] Buscando stock negativo...")
        stocks_negativos_qs = StockItemEnBodega.objects.filter(cantidad__lt=0)
        if empresa_id:
            stocks_negativos_qs = stocks_negativos_qs.filter(
                bodega__sucursal__empresa_id=empresa_id
            )

        count_neg = stocks_negativos_qs.count()
        if count_neg:
            total_inconsistencias += count_neg
            self.stdout.write(
                self.style.WARNING(f"  {count_neg} items con stock negativo")
            )
            for stock in stocks_negativos_qs.select_related('bodega', 'item'):
                detalle = {
                    'tipo': 'stock_negativo',
                    'stock_item_id': stock.id,
                    'item': str(stock.item),
                    'bodega': str(stock.bodega),
                    'cantidad': stock.cantidad,
                    'accion': 'marcar_para_revision_manual',
                }
                reporte['detecciones'].append(detalle)
                self.stdout.write(
                    self.style.ERROR(
                        f"  STOCK NEGATIVO: {stock.item} [{stock.bodega}] = {stock.cantidad}"
                    )
                )
                if not dry_run and options['sanear']:
                    empresa_obj = (
                        stock.bodega.sucursal.empresa
                        if hasattr(stock.bodega, 'sucursal')
                        else None
                    )
                    if empresa_obj:
                        AnomalíaMovimiento.objects.get_or_create(
                            empresa=empresa_obj,
                            tipo_anomalia='stock_negativo',
                            stock_item=stock,
                            resuelta=False,
                            defaults={
                                'descripcion': (
                                    f"Stock negativo: {stock.cantidad} unidades "
                                    f"en {stock.item} / {stock.bodega}"
                                ),
                                'datos_anomalia': detalle,
                                'bodega': stock.bodega,
                            }
                        )
        else:
            self.stdout.write("  OK — ningún stock negativo")

        # ── 6. MovimientoStock huérfanos (sin content_type) ────────────────────
        self.stdout.write("\n[6/6] Buscando MovimientoStock huérfanos...")
        from bodegas.models import MovimientoStock
        mov_huerfanos_qs = MovimientoStock.objects.filter(
            content_type__isnull=True,
            object_id__isnull=True,
        )
        if empresa_id:
            # MovimientoStock no tiene empresa directa; filtrar por bodega
            mov_huerfanos_qs = mov_huerfanos_qs.filter(
                stock_item__bodega__sucursal__empresa_id=empresa_id
            )

        count_mov_huerfanos = mov_huerfanos_qs.count()
        if count_mov_huerfanos:
            total_inconsistencias += count_mov_huerfanos
            self.stdout.write(
                self.style.WARNING(
                    f"  {count_mov_huerfanos} MovimientoStock sin documento origen"
                )
            )
            for mov in mov_huerfanos_qs.select_related('stock_item__bodega__sucursal__empresa'):
                empresa_obj = (
                    mov.stock_item.bodega.sucursal.empresa
                    if mov.stock_item and mov.stock_item.bodega
                    else None
                )
                detalle = {
                    'tipo': 'movimiento_stock_huerfano',
                    'movimiento_id': mov.id,
                    'tipo_movimiento': mov.tipo_movimiento,
                    'cantidad': mov.cantidad,
                    'stock_item_id': mov.stock_item_id,
                    'accion': 'marcar_anomalia',
                }
                reporte['detecciones'].append(detalle)
                if not dry_run and options['sanear'] and empresa_obj:
                    AnomalíaMovimiento.objects.get_or_create(
                        empresa=empresa_obj,
                        tipo_anomalia='movimiento_huerfano',
                        stock_item=mov.stock_item,
                        resuelta=False,
                        defaults={
                            'descripcion': (
                                f"MovimientoStock id={mov.id} tipo={mov.tipo_movimiento} "
                                f"sin documento origen (content_type=null)"
                            ),
                            'datos_anomalia': detalle,
                        }
                    )
        else:
            self.stdout.write("  OK — ningún MovimientoStock huérfano")

        # ── Resumen ────────────────────────────────────────────────────────────
        fin = timezone.now()
        duracion = (fin - inicio).total_seconds()

        reporte['resumen'] = {
            'total_inconsistencias': total_inconsistencias,
            'total_corregidas_automaticamente': total_corregidas,
            'total_pendientes_revision_manual': total_inconsistencias - total_corregidas,
            'duracion_segundos': duracion,
            'fecha_fin': fin.isoformat(),
        }

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.MIGRATE_HEADING("RESUMEN"))
        self.stdout.write(f"  Inconsistencias detectadas : {total_inconsistencias}")
        self.stdout.write(f"  Corregidas automáticamente : {total_corregidas}")
        self.stdout.write(
            f"  Pendientes revisión manual : {total_inconsistencias - total_corregidas}"
        )
        self.stdout.write(f"  Duración                   : {duracion:.2f}s")
        self.stdout.write("=" * 60)

        if total_inconsistencias == 0:
            self.stdout.write(self.style.SUCCESS("\n✓ Base de datos consistente. No se encontraron problemas."))
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"\n⚠ Se encontraron {total_inconsistencias} inconsistencias. "
                    "Revisa el reporte y las AnomalíaMovimiento creadas."
                )
            )

        # ── Exportar JSON ──────────────────────────────────────────────────────
        output_path = options.get('output')
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(reporte, f, ensure_ascii=False, indent=2, default=str)
            self.stdout.write(
                self.style.SUCCESS(f"\nReporte exportado a: {output_path}")
            )

        return reporte
