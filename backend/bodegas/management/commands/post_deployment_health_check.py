from django.core.management.base import BaseCommand
from django.db.models import Count, F, Q

from bodegas.models import MovimientoStock, SerieItem, StockItemEnBodega


class Command(BaseCommand):
    help = "Ejecuta validaciones básicas de salud post-despliegue para inventario y series."

    def _print_check(self, name, passed, details=""):
        icon = "✓" if passed else "✗"
        status = "PASS" if passed else "FAIL"
        self.stdout.write(f"{icon} [{status}] {name}")
        if details:
            self.stdout.write(f"    {details}")

    def handle(self, *args, **options):
        all_passed = True
        self.stdout.write(self.style.MIGRATE_HEADING("POST-DEPLOYMENT HEALTH CHECK"))

        stock_negativo = StockItemEnBodega.objects.filter(
            Q(cantidad__lt=0) | Q(cantidad_no_disponible__lt=0)
        )
        passed = not stock_negativo.exists()
        all_passed &= passed
        self._print_check(
            "No hay stock negativo",
            passed,
            f"Stocks verificados: {StockItemEnBodega.objects.count()}",
        )

        estados_validos = {"disponible", "reservada", "despachada", "devuelta"}
        estados_invalidos = SerieItem.objects.exclude(estado__in=estados_validos)
        passed = not estados_invalidos.exists()
        all_passed &= passed
        self._print_check(
            "Todas las series tienen estados válidos",
            passed,
            f"Series verificadas: {SerieItem.objects.count()}",
        )

        duplicadas = (
            SerieItem.objects.values("serie", "empresa_id")
            .annotate(total=Count("id"))
            .filter(total__gt=1)
        )
        passed = not duplicadas.exists()
        all_passed &= passed
        self._print_check(
            "No hay series duplicadas por empresa",
            passed,
            f"Combinaciones únicas: {SerieItem.objects.values('serie', 'empresa_id').distinct().count()}",
        )

        inconsistentes = list(
            StockItemEnBodega.objects.filter(item__requiere_serie=True)
            .annotate(
                series_activas=Count(
                    "series",
                    filter=Q(series__estado__in=["disponible", "reservada"]),
                )
            )
            .exclude(cantidad=F("series_activas"))
            .values_list("id", "cantidad", "series_activas")[:10]
        )
        passed = len(inconsistentes) == 0
        all_passed &= passed
        detalle = "Sin discrepancias" if passed else f"Primeras discrepancias: {inconsistentes}"
        self._print_check("Stock seriado consistente con series activas", passed, detalle)

        movimientos = MovimientoStock.objects.count()
        self._print_check(
            "Movimientos registrados accesibles",
            True,
            f"Total movimientos: {movimientos}",
        )

        resumen = (
            f"Stocks: {StockItemEnBodega.objects.count()} | "
            f"Series: {SerieItem.objects.count()} | "
            f"Movimientos: {movimientos}"
        )
        self.stdout.write(resumen)

        if not all_passed:
            raise SystemExit(1)
