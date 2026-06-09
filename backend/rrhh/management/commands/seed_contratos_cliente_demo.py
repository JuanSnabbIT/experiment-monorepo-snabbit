from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from empresas.models import Empresa, SucursalEmpresa
from rrhh.models import ContratoTrabajador


class Command(BaseCommand):
    help = (
        "Crea contratos laborales demo en estado borrador asociados a una empresa cliente "
        "(via datos_trabajador_nuevo.sucursal_id)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--cliente-id",
            type=int,
            required=True,
            help="ID de la empresa cliente destino.",
        )
        parser.add_argument(
            "--cantidad",
            type=int,
            default=3,
            help="Cantidad de contratos demo a crear. Default: 3",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Muestra el plan sin crear registros.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Permite crear contratos aunque ya existan demos con el mismo prefijo.",
        )

    def handle(self, *args, **options):
        cliente_id = options["cliente_id"]
        cantidad = options["cantidad"]
        dry_run = options["dry_run"]
        force = options["force"]

        if cantidad <= 0:
            raise CommandError("--cantidad debe ser mayor a 0")

        cliente = Empresa.objects.filter(id=cliente_id).first()
        if not cliente:
            raise CommandError(f"No existe empresa cliente con id={cliente_id}")

        sucursal = SucursalEmpresa.objects.filter(empresa_id=cliente_id).order_by("id").first()
        if not sucursal:
            raise CommandError(
                f"La empresa cliente id={cliente_id} no tiene sucursal. Crea una sucursal antes."
            )

        prefijo_ref = f"DEMO-CLI-{cliente_id}-"
        existentes = ContratoTrabajador.objects.filter(
            referencia_interna__startswith=prefijo_ref,
            usuario_empresa__isnull=True,
        ).count()

        if existentes > 0 and not force:
            raise CommandError(
                "Ya existen contratos demo para este cliente con el prefijo "
                f"{prefijo_ref}. Usa --force para crear adicionales."
            )

        hoy = timezone.localdate()
        nombres_demo = [
            ("Alex", "Mora", "11111111-1", "Tecnico de Soporte"),
            ("Camila", "Fuentes", "22222222-2", "Analista de Operaciones"),
            ("Diego", "Rivas", "33333333-3", "Coordinador de Servicio"),
            ("Laura", "Pino", "44444444-4", "Administrativo"),
            ("Matias", "Salas", "55555555-5", "Supervisor Terreno"),
        ]

        self.stdout.write(
            self.style.WARNING(
                f"Cliente: {cliente.id} - {cliente.nombre} | Sucursal: {sucursal.id} - {sucursal.nombre}"
            )
        )
        self.stdout.write(
            self.style.WARNING(
                f"Se generaran {cantidad} contratos demo con prefijo {prefijo_ref}"
            )
        )

        if dry_run:
            self.stdout.write(self.style.SUCCESS("Dry-run completado. Sin cambios."))
            return

        creados = []
        with transaction.atomic():
            for idx in range(cantidad):
                nombre, apellido, rut, cargo = nombres_demo[idx % len(nombres_demo)]
                correlativo = existentes + idx + 1
                referencia = f"{prefijo_ref}{correlativo:02d}"

                datos_nuevo = {
                    "nombres": nombre,
                    "apellido_paterno": apellido,
                    "rut": rut,
                    "email": f"{nombre.lower()}.{apellido.lower()}+cli{cliente_id}@demo.local",
                    "direccion": f"Direccion demo {correlativo}",
                    "sucursal_id": sucursal.id,
                }

                contrato = ContratoTrabajador.objects.create(
                    usuario_empresa=None,
                    datos_trabajador_nuevo=datos_nuevo,
                    referencia_interna=referencia,
                    observaciones="Contrato demo asociado a empresa cliente para pruebas de UI.",
                    tipo_contrato="plazo_fijo",
                    fecha_inicio=hoy - timedelta(days=15 * (idx + 1)),
                    fecha_termino=hoy + timedelta(days=180),
                    cargo=cargo,
                    funciones=f"Funciones demo para {cargo}.",
                    jornada="completa",
                    horas_semanales=44,
                    horario_detalle="Lunes a viernes 09:00 a 18:00",
                    lugar_trabajo=sucursal.nombre,
                    sueldo_base=Decimal("850000"),
                    moneda="CLP",
                    estado="borrador",
                )
                creados.append((contrato.id, referencia))

        for contrato_id, referencia in creados:
            self.stdout.write(self.style.SUCCESS(f"Creado contrato id={contrato_id} ref={referencia}"))

        self.stdout.write(self.style.SUCCESS(f"Proceso completado. Total creados: {len(creados)}"))