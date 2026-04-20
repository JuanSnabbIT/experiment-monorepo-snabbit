#!/usr/bin/env python
"""
Post-Deployment Health Check Script (Fase 5)

Ejecutar después del despliegue para validar integridad del sistema.
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db.models import Q, Count, F
from django.utils import timezone
from datetime import timedelta
from bodegas.models import (
    StockItemEnBodega, SerieItem, MovimientoStock, 
    BitácoraMovimiento, BitácoraSerieMovimiento, AnomalíaMovimiento
)

def print_header(text):
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)

def print_check(name, passed, details=""):
    icon = "✓" if passed else "✗"
    status = "PASS" if passed else "FAIL"
    print(f"{icon} [{status}] {name}")
    if details:
        print(f"       {details}")

def main():
    print_header("POST-DEPLOYMENT HEALTH CHECK - FASE 5")
    
    all_passed = True
    
    # CHECK 1: Stock no negativo
    print("\nCHECK 1: Integridad de Stock")
    stock_negativo = StockItemEnBodega.objects.filter(
        Q(cantidad__lt=0) | Q(cantidad_no_disponible__lt=0)
    )
    check_1_passed = stock_negativo.count() == 0
    all_passed = all_passed and check_1_passed
    print_check(
        "No hay stock negativo",
        check_1_passed,
        f"Items verificados: {StockItemEnBodega.objects.count()}"
    )
    if not check_1_passed:
        for item in stock_negativo[:3]:
            print(f"       ⚠️  {item.bodega.nombre} / {item.item.nombre}: cantidad={item.cantidad}")
    
    # CHECK 2: Series sin bodega en estado activo
    print("\nCHECK 2: Ubicación de Series")
    series_sin_bodega = SerieItem.objects.filter(
        bodega_actual__isnull=True,
        estado__in=['available', 'reserved']
    )
    check_2_passed = series_sin_bodega.count() == 0
    all_passed = all_passed and check_2_passed
    print_check(
        "Todas las series activas tienen bodega asignada",
        check_2_passed,
        f"Series activas: {SerieItem.objects.filter(estado__in=['available', 'reserved']).count()}"
    )
    
    # CHECK 3: Movimientos sin auditoría (últimas 24 horas)
    print("\nCHECK 3: Auditoría de Movimientos")
    hace_24h = timezone.now() - timedelta(hours=24)
    movimientos_recientes = MovimientoStock.objects.filter(
        fecha__gte=hace_24h
    )
    movimientos_auditados = BitácoraMovimiento.objects.filter(
        movimiento_stock__fecha__gte=hace_24h
    ).values('movimiento_stock').distinct().count()
    
    pct_auditoria = (movimientos_auditados / movimientos_recientes.count() * 100) if movimientos_recientes.count() > 0 else 100
    check_3_passed = pct_auditoria >= 95
    all_passed = all_passed and check_3_passed
    print_check(
        "Movimientos auditados >= 95%",
        check_3_passed,
        f"{movimientos_auditados}/{movimientos_recientes.count()} = {pct_auditoria:.1f}%"
    )
    
    # CHECK 4: Anomalías detectadas
    print("\nCHECK 4: Anomalías del Sistema")
    anomalias_recientes = AnomalíaMovimiento.objects.filter(
        fecha_deteccion__gte=hace_24h
    )
    check_4_passed = anomalias_recientes.count() == 0
    all_passed = all_passed and check_4_passed
    print_check(
        "Sin anomalías detectadas en últimas 24h",
        check_4_passed,
        f"Total histórico: {AnomalíaMovimiento.objects.count()}"
    )
    if not check_4_passed:
        for anom in anomalias_recientes[:3]:
            print(f"       ⚠️  {anom.tipo}: {anom.descripcion[:50]}")
    
    # CHECK 5: Series duplicadas
    print("\nCHECK 5: Unicidad de Series")
    duplicadas = SerieItem.objects.values('numero_serie').annotate(
        count=Count('id')
    ).filter(count__gt=1)
    check_5_passed = duplicadas.count() == 0
    all_passed = all_passed and check_5_passed
    print_check(
        "No hay series duplicadas",
        check_5_passed,
        f"Series únicas: {SerieItem.objects.values('numero_serie').distinct().count()}"
    )
    if not check_5_passed:
        for dup in duplicadas[:3]:
            print(f"       ⚠️  Número '{dup['numero_serie']}' aparece {dup['count']} veces")
    
    # CHECK 6: Estados de serie válidos
    print("\nCHECK 6: Validez de Estados de Serie")
    VALID_STATES = {'available', 'reserved', 'in_transit', 'sold', 'returned', 'blocked'}
    invalid_states = SerieItem.objects.exclude(
        estado__in=VALID_STATES
    )
    check_6_passed = invalid_states.count() == 0
    all_passed = all_passed and check_6_passed
    print_check(
        "Todos los estados de serie son válidos",
        check_6_passed,
        f"Estados: {', '.join(VALID_STATES)}"
    )
    if not check_6_passed:
        for serie in invalid_states[:3]:
            print(f"       ⚠️  Serie {serie.numero_serie}: estado='{serie.estado}'")
    
    # CHECK 7: Consistencia stock vs series
    print("\nCHECK 7: Consistencia Stock vs Series")
    bodegas_inconsistentes = 0
    for bodega in __import__('bodegas.models', fromlist=['Bodega']).Bodega.objects.all():
        for stock_item in bodega.stock_items.filter(item__requiere_serie=True):
            series_disponibles = SerieItem.objects.filter(
                item=stock_item.item,
                bodega_actual=bodega,
                estado__in=['available', 'reserved']
            ).count()
            if abs(series_disponibles - stock_item.cantidad) > 1:  # Tolerancia de 1
                bodegas_inconsistentes += 1
    
    check_7_passed = bodegas_inconsistentes == 0
    all_passed = all_passed and check_7_passed
    print_check(
        "Stock coincide con recuento de series",
        check_7_passed,
        f"Bodegas verificadas: {__import__('bodegas.models', fromlist=['Bodega']).Bodega.objects.count()}"
    )
    
    # RESUMEN
    print("\n" + "=" * 70)
    print("RESUMEN DE DATOS")
    print("=" * 70)
    print(f"Items en bodega: {StockItemEnBodega.objects.count()}")
    print(f"Series registradas: {SerieItem.objects.count()}")
    print(f"Movimientos (últimas 24h): {movimientos_recientes.count()}")
    print(f"Bitácoras de auditoría: {BitácoraMovimiento.objects.count()}")
    print(f"Anomalías detectadas: {AnomalíaMovimiento.objects.count()}")
    
    # RESULTADO FINAL
    print_header("RESULTADO")
    if all_passed:
        print("\n✓ HEALTH CHECK EXITOSO - Sistema listo para operación")
        return 0
    else:
        print("\n✗ HEALTH CHECK CON ISSUES - Investigar antes de continuar")
        return 1

if __name__ == '__main__':
    sys.exit(main())
