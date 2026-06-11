"""Modelos del modulo RRHH: contratos laborales y anexos."""

import uuid
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models import ModeloBase, ModeloBaseHistorico

from .estados_modelo import (
    CAUSAL_REEMPLAZO,
    ESTADO_CIVIL,
    ESTADO_CONTRATO,
    JORNADA_CONTRATO,
    MONEDA_CONTRATO,
    MOTIVO_TERMINO_CONTRATO,
    TIPO_GRATIFICACION,
    TIPO_ANEXO,
    TIPO_CONTRATO,
)


def archivo_contrato_path(instance, filename):
    """Ruta de almacenamiento del PDF del contrato."""
    folder = instance.usuario_empresa_id if instance.usuario_empresa_id else f"pendiente_{instance.pk or 'new'}"
    return f"rrhh/contratos/{folder}/{filename}"


def archivo_anexo_path(instance, filename):
    """Ruta de almacenamiento del PDF de un anexo."""
    return f"rrhh/anexos/{instance.contrato_id}/{filename}"


class ContratoTrabajador(ModeloBaseHistorico):
    """Contrato laboral entre la empresa y un trabajador (UsuarioEmpresa)."""

    usuario_empresa = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.PROTECT,
        related_name="contratos_laborales",
        null=True,
        blank=True,
    )

    # Datos del trabajador nuevo antes de que exista como usuario en el sistema.
    # Se rellena cuando modo=="nuevo" en el wizard y se limpia al crear el User
    # durante la aprobacion del contrato.
    datos_trabajador_nuevo = models.JSONField(
        null=True,
        blank=True,
        help_text="Datos del trabajador pendiente de creacion. Se limpia tras la aprobacion.",
    )
    snapshot_documento = models.JSONField(
        null=True,
        blank=True,
        help_text="Snapshot estructurado de datos contractuales usado al enviar a aprobacion.",
    )

    # Identificador de negocio (mostrado en listas / detalle)
    referencia_interna = models.CharField(max_length=200, blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)

    # Campos legales Art. 10 Codigo del Trabajo
    estado_civil = models.CharField(max_length=20, choices=ESTADO_CIVIL, blank=True, null=True)
    profesion_u_oficio = models.CharField(max_length=150, blank=True, null=True)
    sistema_salud_otro = models.CharField(max_length=100, blank=True, null=True)
    trabajador_reemplazado = models.ForeignKey(
        "empresas.UsuarioEmpresa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contratos_de_reemplazo",
    )
    causal_reemplazo = models.CharField(max_length=30, choices=CAUSAL_REEMPLAZO, blank=True, null=True)

    tipo_contrato = models.CharField(max_length=20, choices=TIPO_CONTRATO)
    fecha_inicio = models.DateField()
    fecha_termino = models.DateField(blank=True, null=True)

    cargo = models.CharField(max_length=150)
    funciones = models.TextField(blank=True, null=True)

    jornada = models.CharField(max_length=20, choices=JORNADA_CONTRATO)
    horas_semanales = models.PositiveSmallIntegerField(blank=True, null=True)
    horario_detalle = models.CharField(max_length=500, blank=True, null=True)
    tiempo_colacion = models.PositiveIntegerField(default=30, blank=True, null=True)
    lugar_trabajo = models.CharField(max_length=255, blank=True, null=True)

    sueldo_base = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sueldo_liquido = models.DecimalField(
        max_digits=12, decimal_places=2, blank=True, null=True,
    )
    moneda = models.CharField(max_length=5, choices=MONEDA_CONTRATO, default="CLP")
    tipo_gratificacion = models.CharField(
        max_length=20,
        choices=TIPO_GRATIFICACION,
        default="no_aplica",
    )
    bono_movilizacion = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bono_colacion = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    archivo_pdf = models.FileField(upload_to=archivo_contrato_path, blank=True, null=True)

    plantilla_contrato = models.ForeignKey(
        "contratos.PlantillaContrato",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="contratos_trabajador",
    )

    lugar_celebracion_contrato = models.CharField(max_length=255, blank=True, null=True)
    fecha_firma = models.DateField(blank=True, null=True)

    # Campos adicionales de configuracion
    enviar_al_empleador = models.BooleanField(
        default=True,
        help_text="Si es False, no se envia notificacion al empleador al crear el contrato.",
    )
    cantidad_meses = models.PositiveSmallIntegerField(
        blank=True,
        null=True,
        help_text="Duracion en meses para contratos a plazo fijo (informativo).",
    )
    dias_semana = models.JSONField(
        default=list,
        blank=True,
        help_text="Dias de la semana trabajados. Ej: ['L','M','X','J','V'].",
    )
    turnos_rotativo = models.JSONField(
        default=list,
        blank=True,
        help_text="Turnos rotativos. Lista de objetos con nombre, dias, hora_inicio, hora_fin.",
    )
    grupo_turno = models.ForeignKey(
        "rrhh.GrupoTurno",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contratos",
        help_text="Grupo de turnos rotativos asignado al contrato.",
    )
    grupo_turno_snapshot = models.JSONField(
        null=True,
        blank=True,
        help_text="Copia inmutable del grupo al momento de activar el contrato.",
    )

    estado = models.CharField(max_length=25, choices=ESTADO_CONTRATO, default="borrador")
    fecha_aprobacion = models.DateTimeField(blank=True, null=True)
    aceptado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="contratos_trabajador_aceptados",
    )

    motivo_termino = models.CharField(
        max_length=30, choices=MOTIVO_TERMINO_CONTRATO, blank=True, null=True,
    )
    fecha_termino_real = models.DateField(blank=True, null=True)
    observaciones_termino = models.TextField(blank=True, null=True)
    motivo_anulacion = models.TextField(blank=True, null=True)

    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="contratos_trabajador_creados",
    )

    class Meta:
        verbose_name = "Contrato de Trabajador"
        verbose_name_plural = "Contratos de Trabajadores"
        ordering = ["-fecha_inicio", "-fecha_creacion"]

    def __str__(self):
        trab = self.usuario_empresa or "(trabajador pendiente)"
        return f"Contrato {self.tipo_contrato} - {trab} ({self.estado})"


class AnexoContrato(ModeloBaseHistorico):
    """Anexo / modificacion contractual asociado a un ContratoTrabajador."""

    contrato = models.ForeignKey(
        ContratoTrabajador,
        on_delete=models.CASCADE,
        related_name="anexos",
    )

    tipo = models.CharField(max_length=30, choices=TIPO_ANEXO)
    fecha_efectiva = models.DateField()
    descripcion = models.TextField()
    nueva_fecha_termino = models.DateField(null=True, blank=True)
    archivo_pdf = models.FileField(upload_to=archivo_anexo_path, blank=True, null=True)

    estado = models.CharField(max_length=25, choices=ESTADO_CONTRATO, default="borrador")
    numero_anexo = models.PositiveIntegerField(null=True, blank=True)

    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="anexos_contrato_creados",
    )

    class Meta:
        verbose_name = "Anexo de Contrato"
        verbose_name_plural = "Anexos de Contratos"
        ordering = ["contrato", "numero_anexo", "-fecha_efectiva"]
        unique_together = [("contrato", "numero_anexo")]

    def __str__(self):
        return f"Anexo {self.tipo} ({self.fecha_efectiva}) - {self.contrato_id}"


class CargoCatalogo(ModeloBase):
    """Catalogo de cargos por empresa para el asistente de contratos laborales."""

    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="cargos_catalogo",
    )
    nombre = models.CharField(max_length=150)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = [("empresa", "nombre")]
        verbose_name = "Cargo del Catalogo"
        verbose_name_plural = "Cargos del Catalogo"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class AfpCatalogo(ModeloBase):
    """Catalogo de AFP disponibles. Registros globales (empresa=null) + por empresa."""

    nombre = models.CharField(max_length=100)
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="afp_catalogo",
    )
    activo = models.BooleanField(default=True)
    tasa_cotizacion = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Tasa vigente. Ej: 0.1144 para 11.44%. Actualizar tras cada licitacion.",
    )

    class Meta:
        unique_together = [("nombre", "empresa")]
        verbose_name = "AFP"
        verbose_name_plural = "AFPs"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class BancoCatalogo(ModeloBase):
    """Catalogo de bancos disponibles. Registros globales (empresa=null) + por empresa."""

    nombre = models.CharField(max_length=100)
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="bancos_catalogo",
    )
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = [("nombre", "empresa")]
        verbose_name = "Banco"
        verbose_name_plural = "Bancos"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class NacionalidadCatalogo(ModeloBase):
    """Catalogo de nacionalidades disponibles. Registros globales (empresa=null) + por empresa."""

    nombre = models.CharField(max_length=100)
    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="nacionalidades_catalogo",
    )
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = [("nombre", "empresa")]
        verbose_name = "Nacionalidad"
        verbose_name_plural = "Nacionalidades"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class ConfiguracionLaboral(ModeloBase):
    """Parametros legales y valores del modulo RRHH.

    empresa=None → valor legal global (por ley).
    empresa=X    → override por empresa (casos excepcionales).
    """

    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="configuraciones_laborales",
    )
    clave = models.CharField(max_length=100)
    valor = models.DecimalField(max_digits=14, decimal_places=4)
    descripcion = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = [("empresa", "clave")]
        verbose_name = "Configuracion laboral"
        verbose_name_plural = "Configuraciones laborales"
        ordering = ["clave"]

    def __str__(self):
        ambito = "global" if self.empresa_id is None else f"empresa {self.empresa_id}"
        return f"{self.clave} = {self.valor} ({ambito})"


class TurnoLaboral(ModeloBase):
    """Catalogo de turnos laborales por empresa. empresa=null → turno global (preset)."""

    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="turnos_laborales",
    )
    nombre = models.CharField(max_length=100)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    cruza_medianoche = models.BooleanField(
        default=False,
        help_text="True cuando hora_fin < hora_inicio. Ej: Noche 22:00-06:00.",
    )
    dias_semana = models.JSONField(
        default=list,
        blank=True,
        help_text="Dias por defecto del turno. Ej: ['L','M','X','J','V'].",
    )
    horas_turno = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Horas por turno. Se calcula automaticamente si no se provee.",
    )
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = [("empresa", "nombre")]
        verbose_name = "Turno Laboral"
        verbose_name_plural = "Turnos Laborales"
        ordering = ["nombre"]

    def save(self, *args, **kwargs):
        if self.hora_inicio and self.hora_fin and not self.horas_turno:
            from datetime import datetime, time, timedelta
            def _to_time(val):
                if isinstance(val, time):
                    return val
                h, m = str(val).split(":")[:2]
                return time(int(h), int(m))
            inicio = datetime.combine(datetime.today(), _to_time(self.hora_inicio))
            fin = datetime.combine(datetime.today(), _to_time(self.hora_fin))
            if fin <= inicio:
                fin += timedelta(days=1)
                self.cruza_medianoche = True
            self.horas_turno = round((fin - inicio).total_seconds() / 3600, 2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre} ({self.hora_inicio}–{self.hora_fin})"


class GrupoTurno(ModeloBase):
    """Grupo de turnos rotativos reutilizable por empresa."""

    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="grupos_turno",
    )
    nombre = models.CharField(max_length=150)
    ciclo = models.CharField(
        max_length=20,
        choices=[
            ("semanal", "Semanal"),
            ("quincenal", "Quincenal"),
            ("mensual", "Mensual"),
        ],
        default="semanal",
    )
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = [("empresa", "nombre")]
        verbose_name = "Grupo de Turno"
        verbose_name_plural = "Grupos de Turnos"
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.nombre} ({self.ciclo})"

    @property
    def horas_promedio(self):
        """Promedio de horas por slot del grupo."""
        slots = self.slots.select_related("turno").all()
        values = [float(s.turno.horas_turno) for s in slots if s.turno and s.turno.horas_turno]
        return round(sum(values) / len(values), 2) if values else None


class SlotTurno(ModeloBase):
    """Turno individual dentro de un GrupoTurno, con orden explícito."""

    grupo = models.ForeignKey(
        GrupoTurno,
        on_delete=models.CASCADE,
        related_name="slots",
    )
    turno = models.ForeignKey(
        TurnoLaboral,
        on_delete=models.PROTECT,
        related_name="slots_grupo",
    )
    orden = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["orden"]
        unique_together = [("grupo", "orden")]
        verbose_name = "Slot de Turno"
        verbose_name_plural = "Slots de Turno"

    def __str__(self):
        return f"[{self.orden}] {self.turno.nombre} en {self.grupo.nombre}"


DECISION_APROBACION = [
    ("pendiente", "Pendiente"),
    ("aprobado", "Aprobado"),
    ("rechazado", "Rechazado"),
    ("cambios_solicitados", "Cambios solicitados"),
]


class EnvioAprobacionEmpleador(ModeloBase):
    """Registro de un envio de contrato al empleador para su aprobacion previa."""

    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    contrato = models.ForeignKey(
        ContratoTrabajador,
        on_delete=models.CASCADE,
        related_name="envios_aprobacion_empleador",
    )
    pdf_congelado = models.BinaryField()
    enviado_a = models.EmailField()
    enviado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="envios_aprobacion_empleador_enviados",
    )
    decision = models.CharField(max_length=25, choices=DECISION_APROBACION, default="pendiente")
    motivo_rechazo = models.TextField(null=True, blank=True)
    cambios_solicitados = models.JSONField(default=list)
    notificar_trabajador = models.BooleanField(default=False)
    fecha_envio = models.DateTimeField(auto_now_add=True)
    fecha_respuesta = models.DateTimeField(null=True, blank=True)
    ip_respuesta = models.GenericIPAddressField(null=True, blank=True)
    expirado = models.BooleanField(default=False)

    EXPIRACION_DIAS = 14

    @property
    def fecha_expiracion(self):
        return self.fecha_envio + timedelta(days=self.EXPIRACION_DIAS)

    def esta_expirado(self):
        return self.expirado or timezone.now() > self.fecha_expiracion

    class Meta:
        verbose_name = "Envio de Aprobacion al Empleador"
        verbose_name_plural = "Envios de Aprobacion al Empleador"
        ordering = ["-fecha_envio"]

    def __str__(self):
        return f"Aprobacion contrato {self.contrato_id} -> {self.enviado_a} ({self.decision})"
