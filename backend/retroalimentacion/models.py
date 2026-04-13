from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from core.models import ModeloBase
import uuid
from ordentrabajov2.models import OrdenDeTrabajo
from core.models import PreguntaEnRetroalimentacion


class Retroalimentacion(ModeloBase):
    # V2: relacion con OT clasica (nullable para soportar V3)
    orden_trabajo = models.ForeignKey(
        OrdenDeTrabajo,
        on_delete=models.CASCADE,
        verbose_name="Orden de Trabajo",
        related_name="retroalimentacion",
        null=True,
        blank=True,
    )
    # V3: relacion con OT V3 (one-to-one)
    orden_trabajo_v3 = models.OneToOneField(
        "ordentrabajov3.OrdenDeTrabajoV3",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="retroalimentacion",
        verbose_name="Orden de Trabajo V3",
    )
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, verbose_name="Token")
    cantidad_visitas = models.PositiveIntegerField(default=0, verbose_name="Cantidad de visitas")
    preguntas = models.ManyToManyField('core.PreguntaEnRetroalimentacion', through="retroalimentacion.RetroalimentacionAplicada", verbose_name="Preguntas de retroalimentación")
    usuario_empresa = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.CASCADE, null=True, blank=True)
    usuario_externo = models.CharField(max_length=250, blank=True, null=True)
    correo_usuario_externo = models.EmailField(blank=True, null=True)
    observacion_retroalimentacion = models.TextField(null=True, blank=True)
    fecha_retroalimentacion = models.DateTimeField(null=True, blank=True)
    # Control de recordatorios (V3)
    recordatorios_enviados = models.PositiveIntegerField(default=0)
    fecha_ultimo_recordatorio = models.DateTimeField(null=True, blank=True)
    fecha_vencimiento = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name="Retroalimentacion de OT"
        verbose_name_plural="Retroalimentaciones de OT"

    def generar_preguntas_aplicables(self):
        if self.orden_trabajo_v3_id:
            # V3: iterar TareaOTV3 de la orden
            from ordentrabajov3.models import TareaOTV3  # evitar circular import

            tareas = TareaOTV3.objects.filter(orden=self.orden_trabajo_v3)
            for tarea in tareas:
                content_type = ContentType.objects.get_for_model(tarea)
                preguntas = PreguntaEnRetroalimentacion.objects.filter(
                    content_type=content_type,
                    activo=True,
                )
                for pregunta in preguntas:
                    RetroalimentacionAplicada.objects.get_or_create(
                        retroalimentacion=self,
                        content_type=content_type,
                        object_id=tarea.pk,
                        pregunta=pregunta,
                    )
        else:
            # V2: SoporteTecnico es el "trabajo" directamente
            from ordentrabajov2.models import SoporteTecnico  # evitar circular import

            soportes = SoporteTecnico.objects.filter(orden=self.orden_trabajo)
            for soporte in soportes:
                content_type = ContentType.objects.get_for_model(soporte)
                preguntas = PreguntaEnRetroalimentacion.objects.filter(
                    content_type=content_type,
                    activo=True,
                )
                for pregunta in preguntas:
                    RetroalimentacionAplicada.objects.get_or_create(
                        retroalimentacion=self,
                        content_type=content_type,
                        object_id=soporte.pk,
                        pregunta=pregunta,
                    )

    def __str__(self):
        if self.usuario_empresa:
            usuario = self.usuario_empresa.usuario.get_nombre()
        elif self.usuario_externo:
            usuario = self.usuario_externo
        else:
            usuario = "Sin usuario asignado"

        if self.orden_trabajo_v3_id:
            ot_ref = f"OT V3 N°{self.orden_trabajo_v3_id}"
        elif self.orden_trabajo_id:
            ot_ref = f"OT N°{self.orden_trabajo_id}"
        else:
            ot_ref = "OT sin asignar"

        return f"Retroalimentacion {ot_ref} por {usuario} ({self.fecha_retroalimentacion or 'Sin fecha'})"

class RetroalimentacionAplicada(ModeloBase):
    retroalimentacion = models.ForeignKey(Retroalimentacion, on_delete=models.CASCADE, related_name="retroalimentacion_aplicada")
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    modelo_relacionado = GenericForeignKey("content_type", "object_id")
    pregunta = models.ForeignKey('core.PreguntaEnRetroalimentacion', on_delete=models.CASCADE)
    cantidad_estrellas = models.DecimalField(max_digits=2, decimal_places=1, null=True, blank=True, verbose_name="Puntuación (estrellas)")
    observaciones = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Retroalimentación Aplicada"
        verbose_name_plural = "Retroalimentaciones Aplicadas"

    def __str__(self):
        return f"Feedback para {self.modelo_relacionado}"

class LogDeAccesoRetroalimentacion(models.Model):
    retroalimentacion = models.ForeignKey(
        Retroalimentacion,
        on_delete=models.CASCADE,
        related_name="logs_de_acceso"
    )
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Log de Acceso a Retroalimentación"
        verbose_name_plural = "Logs de Acceso a Retroalimentación"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"Acceso a Retroalimentación {self.retroalimentacion.pk} desde {self.ip} el {self.timestamp}"