import math
from datetime import date

from core.models import ModeloBase
from core.validators import validate_rut_chileno
from dateutil.relativedelta import relativedelta
from django.contrib.auth.models import Group
from django.db import models
import uuid
from .estados_modelo import (
    ESTADO_USUARIO_EMPRESA, TIPOS_RELACION_EMPRESA,
    SISTEMA_SALUD, TIPO_CUENTA_BANCARIA, PARENTESCO_CARGA,
)


class Empresa(ModeloBase):
    nombre = models.CharField(max_length=255)
    sitio_web = models.TextField(blank=True, null=True)
    direccion_principal = models.CharField(max_length=250)
    logo = models.TextField(blank=True, null=True)
    firma_empresa = models.TextField(blank=True, null=True)
    clientes = models.ManyToManyField(
        "self", symmetrical=False, through="RelacionEmpresa"
    )
    recargo = models.PositiveIntegerField(default=0)
    rut_empresa = models.CharField(max_length=100, blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    giro = models.CharField(max_length=255, blank=True, null=True, verbose_name="Giro o actividad económica")
    nombre_fantasia = models.CharField(max_length=255, blank=True, null=True, verbose_name="Nombre de fantasía")
    representante_legal = models.CharField(max_length=255, blank=True, null=True)
    rut_representante = models.CharField(max_length=20, blank=True, null=True)
    ppm = models.DecimalField(default=1, max_digits=5, decimal_places=2)
    uuid = models.UUIDField(unique=True, editable=False, blank=True, null=True)

    class Meta:
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"

    def __str__(self):
        return self.nombre

    def save(self, *args, **kwargs):
        if not self.uuid:
            self.uuid = uuid.uuid4()
        super().save(*args, **kwargs)


class RelacionEmpresa(ModeloBase):
    prestador_servicios = models.ForeignKey(
        Empresa,
        related_name="relaciones_como_prestador_servicios",
        on_delete=models.CASCADE,
    )
    cliente = models.ForeignKey(
        Empresa, related_name="relaciones_como_cliente", on_delete=models.CASCADE
    )
    tipo_relacion = models.CharField(
        max_length=50,
        default="prestador-cliente",
        choices=TIPOS_RELACION_EMPRESA,
    )

    class Meta:
        verbose_name = "Relación entre Empresas"
        verbose_name_plural = "Relaciones entre Empresas"
        unique_together = ("prestador_servicios", "cliente")

    def __str__(self):
        return f"{self.prestador_servicios} -> {self.cliente} ({self.tipo_relacion})"


class SucursalEmpresa(ModeloBase):
    nombre = models.CharField(max_length=250)
    direccion = models.CharField(max_length=255, null=True, blank=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    region = models.IntegerField(default=0)
    provincia = models.IntegerField(default=0)
    comuna = models.IntegerField(default=0)
    empresa = models.ForeignKey(
        "empresas.Empresa", related_name="sucursales", on_delete=models.CASCADE
    )

    class Meta:
        verbose_name = "Sucursal de la Empresa"
        verbose_name_plural = "Sucursales de la Empresa"

    def __str__(self):
        return f"{self.nombre} de {self.empresa}"


class UsuarioEmpresa(ModeloBase):
    usuario = models.OneToOneField("cuentas.User", on_delete=models.CASCADE)
    sucursal = models.ForeignKey(
        "empresas.SucursalEmpresa", on_delete=models.CASCADE, related_name="usuarios"
    )
    fecha_ingreso = models.DateField(blank=True, null=True)
    fecha_contrato = models.DateField(blank=True, null=True)
    cargo = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        # Cargo vigente del trabajador. Puede cambiar sin afectar contratos historicos.
        # ContratoTrabajador.cargo registra el cargo al momento de la firma (dato historico, ADR-24).
    )
    rut = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="RUT del usuario",
        validators=[validate_rut_chileno],
    )
    estado = models.CharField(max_length=1, choices=ESTADO_USUARIO_EMPRESA, default="1")
    grupos = models.ManyToManyField(Group, blank=True)

    # Datos previsionales (opcionales) para contratos laborales
    afp = models.ForeignKey(
        "rrhh.AfpCatalogo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="AFP",
        related_name="usuarios_empresa",
    )
    sistema_salud = models.CharField(
        max_length=20, choices=SISTEMA_SALUD, blank=True, null=True,
        verbose_name="Sistema de salud",
    )
    nombre_isapre = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="Nombre de la Isapre",
    )

    # Datos bancarios (opcionales) para pago de remuneraciones
    banco = models.CharField(max_length=100, blank=True, null=True)
    tipo_cuenta_bancaria = models.CharField(
        max_length=20, choices=TIPO_CUENTA_BANCARIA, blank=True, null=True,
    )
    numero_cuenta_bancaria = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        verbose_name = "Usuario de la Empresa"
        verbose_name_plural = "Usuarios de la Empresa"
        ordering = ["fecha_creacion"]

    def __str__(self):
        return f"{self.usuario.get_nombre()}"

    def get_fecha_inicio_laboral(self):
        """
        Retorna la fecha de inicio laboral real del trabajador.
        Cascada: fecha_contrato (campo denormalizado) → primer ContratoTrabajador
        activado (vigente/terminado) ordenado por fecha_inicio ASC → None.
        """
        if self.fecha_contrato:
            return self.fecha_contrato
        primer_contrato = self.contratos_laborales.filter(
            estado__in=["vigente", "terminado"],
            fecha_inicio__isnull=False,
        ).order_by("fecha_inicio").first()
        return primer_contrato.fecha_inicio if primer_contrato else None

    def tiene_derecho_a_vacaciones(self):
        """Verifica si el empleado ha cumplido al menos un año de servicio."""
        fecha = self.get_fecha_inicio_laboral()
        if fecha:
            hoy = date.today()
            delta = relativedelta(hoy, fecha)
            años_servicio = delta.years + (delta.months / 12) + (delta.days / 365.25)
            return años_servicio >= 1
        return False

    def calcular_años_servicio(self):
        """Calcula los años de servicio."""
        fecha = self.get_fecha_inicio_laboral()
        if fecha:
            hoy = date.today()
            delta = relativedelta(hoy, fecha)
            años_servicio = delta.years + (delta.months / 12) + (delta.days / 365.25)
            return años_servicio
        return 0

    def calcular_dias_vacaciones_acumulados(self):
        """Calcula los días de vacaciones acumulados a razón de 1.25 días por mes trabajado,
        pero solo si el empleado ha cumplido al menos un año de servicio."""
        fecha = self.get_fecha_inicio_laboral()
        if not fecha or not self.tiene_derecho_a_vacaciones():
            return 0

        hoy = date.today()
        delta = relativedelta(hoy, fecha)
        # Total de meses completos trabajados desde el primer año
        total_meses = delta.years * 12 + delta.months

        dias_vacaciones = total_meses * 1.25

        # Calcular feriado progresivo
        total_años = delta.years + (delta.months / 12)
        if total_años >= 10:
            años_adicionales = math.floor(total_años - 10)
            dias_adicionales = (
                años_adicionales // 3
            )  # Un día adicional por cada 3 años completos
            dias_vacaciones += dias_adicionales

        return dias_vacaciones

    def calcular_dias_vacaciones_tomados(self):
        from vacaciones.models import SolicitudVacaciones

        solicitudes_aprobadas = SolicitudVacaciones.objects.filter(
            usuario_empresa=self, estado="2"  # Estado aprobado
        )
        dias_tomados = sum(
            solicitud.calcular_dias_solicitados() for solicitud in solicitudes_aprobadas
        )
        return dias_tomados

    def dias_vacaciones_disponibles(self):
        dias_acumulados = self.calcular_dias_vacaciones_acumulados()
        dias_tomados = self.calcular_dias_vacaciones_tomados()
        dias_disponibles = dias_acumulados - dias_tomados
        return dias_disponibles

    def calcular_dias_desde_contratacion(self):
        """Calcula los días que han pasado desde la contratación, incluyendo fines de semana y feriados."""
        fecha = self.get_fecha_inicio_laboral()
        if not fecha:
            return {"dias_totales": 0, "años": 0, "meses": 0, "dias": 0, "formato": "Sin fecha de contratación"}

        hoy = date.today()
        dias_totales = (hoy - fecha).days
        delta = relativedelta(hoy, fecha)
        formato = f"{delta.years} años, {delta.months} meses, {delta.days} días"

        return {
            "dias_totales": dias_totales,
            "años": delta.years,
            "meses": delta.months,
            "dias": delta.days,
            "formato": formato,
        }

    def generar_papeleta(self):
        return {
            "nombre_empleado": self.usuario.get_nombre_completo(),
            "años_servicio": self.calcular_años_servicio(),
            "dias_acumulados": self.calcular_dias_vacaciones_acumulados(),
            "dias_tomados": self.calcular_dias_vacaciones_tomados(),
            "dias_disponibles": self.dias_vacaciones_disponibles(),
            "rut": self.usuario.rut,
            "dias_corridos": self.calcular_dias_desde_contratacion(),
        }


# class TipoUsuarioEmpresa(ModeloBase):
#     nombre = models.CharField(max_length=100)
#     descripcion = models.TextField(null=True, blank=True)
#     empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)

#     class Meta:
#         verbose_name = "Tipo de Usuario de la Empresa"
#         verbose_name_plural = "Tipos de Usuarios de la Empresa"

#     def __str__(self):
#         return f"{self.nombre} de {self.empresa}"


class CargaFamiliar(ModeloBase):
    usuario_empresa = models.ForeignKey(
        UsuarioEmpresa,
        on_delete=models.CASCADE,
        related_name='cargas_familiares',
    )
    nombres = models.CharField(max_length=250)
    apellido_paterno = models.CharField(max_length=150)
    apellido_materno = models.CharField(max_length=150, blank=True, default='')
    rut = models.CharField(max_length=20, blank=True, default='')
    fecha_nacimiento = models.DateField(null=True, blank=True)
    parentesco = models.CharField(max_length=20, choices=PARENTESCO_CARGA)
    is_activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Carga familiar'
        verbose_name_plural = 'Cargas familiares'
        ordering = ['parentesco', 'apellido_paterno']

    def __str__(self):
        return f"{self.nombres} {self.apellido_paterno} ({self.get_parentesco_display()}) - {self.usuario_empresa}"
