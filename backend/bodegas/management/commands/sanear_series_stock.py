from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count, Q, Sum

from bodegas.models import MovimientoStock, SerieEvento, SerieItem, StockItemEnBodega


class Command(BaseCommand):
    help = "Detecta y sanea inconsistencias de series/stock (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Solo reporta inconsistencias, no aplica correcciones.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Aplica correcciones seguras en forma transaccional.",
        )
        parser.add_argument(
            "--empresa-id",
            type=int,
            default=None,
            help="Limita el saneamiento a una empresa.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"] or not options["apply"]
        empresa_id = options.get("empresa_id")

        series_qs = SerieItem.objects.all()
        stocks_qs = StockItemEnBodega.objects.select_related("bodega__sucursal__empresa", "item")
        if empresa_id:
            series_qs = series_qs.filter(empresa_id=empresa_id)
            stocks_qs = stocks_qs.filter(bodega__sucursal__empresa_id=empresa_id)

        duplicadas_activas = list(
            series_qs.filter(
                estado__in=("disponible", "reservada", "despachada")
            )
            .values("empresa_id", "serie")
            .annotate(total=Count("id"))
            .filter(total__gt=1)
        )

        series_huerfanas_estado = list(
            series_qs.filter(
                Q(estado__in=("reservada", "despachada"), item_guia_salida__isnull=True)
                | Q(estado="disponible", item_guia_salida__isnull=False)
            )
        )

        stocks_negativos = list(
            stocks_qs.filter(Q(cantidad__lt=0) | Q(cantidad_no_disponible__lt=0))
        )

        diferencias_stock_mov = []
        diferencias_series_stock = []
        for stock in stocks_qs:
            total_mov = (
                MovimientoStock.objects.filter(stock_item=stock).aggregate(total=Sum("cantidad")).get("total")
                or 0
            )
            if total_mov != stock.cantidad:
                diferencias_stock_mov.append((stock, total_mov))

            total_series = SerieItem.objects.filter(stock_item=stock).count()
            if total_series > 0:
                esperado = (stock.cantidad or 0) + (stock.cantidad_no_disponible or 0)
                if total_series != esperado:
                    diferencias_series_stock.append((stock, total_series, esperado))

        self.stdout.write(f"Dry-run: {dry_run}")
        self.stdout.write(f"Duplicadas activas: {len(duplicadas_activas)}")
        self.stdout.write(f"Series huerfanas/estado invalido: {len(series_huerfanas_estado)}")
        self.stdout.write(f"Stock con negativos: {len(stocks_negativos)}")
        self.stdout.write(f"Diferencias stock vs movimientos: {len(diferencias_stock_mov)}")
        self.stdout.write(f"Diferencias stock vs series: {len(diferencias_series_stock)}")

        if dry_run:
            return

        correcciones = 0
        with transaction.atomic():
            # 1) Resolver series duplicadas activas conservando la primera activa.
            for row in duplicadas_activas:
                series = list(
                    series_qs.filter(
                        empresa_id=row["empresa_id"],
                        serie=row["serie"],
                        estado__in=("disponible", "reservada", "despachada"),
                    ).order_by("id")
                )
                if len(series) <= 1:
                    continue
                keep = series[0]
                for dup in series[1:]:
                    estado_anterior = dup.estado
                    dup.estado = "devuelta"
                    dup.item_guia_salida = None
                    dup.save(update_fields=["estado", "item_guia_salida", "fecha_modificacion"])
                    SerieEvento.objects.create(
                        serie_item=dup,
                        serie=dup.serie,
                        tipo_evento="REVERSO",
                        estado_anterior=estado_anterior,
                        estado_nuevo="devuelta",
                        stock_item=dup.stock_item,
                        causa=f"Saneamiento duplicada activa. Conservada serie id={keep.id}.",
                    )
                    correcciones += 1

            # 2) Corregir estados huerfanos obvios.
            for serie in series_huerfanas_estado:
                estado_anterior = serie.estado
                if serie.estado in ("reservada", "despachada") and serie.item_guia_salida_id is None:
                    serie.estado = "disponible"
                elif serie.estado == "disponible" and serie.item_guia_salida_id is not None:
                    serie.item_guia_salida = None
                else:
                    continue
                serie.save(update_fields=["estado", "item_guia_salida", "fecha_modificacion"])
                SerieEvento.objects.create(
                    serie_item=serie,
                    serie=serie.serie,
                    tipo_evento="AJUSTE",
                    estado_anterior=estado_anterior,
                    estado_nuevo=serie.estado,
                    stock_item=serie.stock_item,
                    causa="Saneamiento de estado de serie huerfano.",
                )
                correcciones += 1

            # 3) Normalizar negativos.
            for stock in stocks_negativos:
                nuevo_stock = max(stock.cantidad or 0, 0)
                nuevo_no_disponible = max(stock.cantidad_no_disponible or 0, 0)
                if (
                    nuevo_stock == stock.cantidad
                    and nuevo_no_disponible == stock.cantidad_no_disponible
                ):
                    continue
                stock.cantidad = nuevo_stock
                stock.cantidad_no_disponible = nuevo_no_disponible
                stock.save(update_fields=["cantidad", "cantidad_no_disponible"])
                correcciones += 1

            # 4) Alinear stock con movimientos cuando hay diferencia.
            for stock, total_mov in diferencias_stock_mov:
                stock.cantidad = max(total_mov, 0)
                stock.save(update_fields=["cantidad"])
                correcciones += 1

        self.stdout.write(self.style.SUCCESS(f"Correcciones aplicadas: {correcciones}"))
