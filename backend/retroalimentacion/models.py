from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from core.models import ModeloBase
import uuid
from ordentrabajo.models import OrdenDeTrabajo
from core.models import PreguntaEnRetroalimentacion


class Retroalimentacion(ModeloBase):
    orden_trabajo = models.ForeignKey(OrdenDeTrabajo, on_delete=models.CASCADE, verbose_name="Orden de Trabajo", related_name="retroalimentacion")
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, verbose_name="Token")
    cantidad_visitas = models.PositiveIntegerField(default=0, verbose_name="Cantidad de visitas")
    preguntas = models.ManyToManyField('core.PreguntaEnRetroalimentacion', through="retroalimentacion.RetroalimentacionAplicada", verbose_name="Preguntas de retroalimentación")
    usuario_empresa = models.ForeignKey("empresas.UsuarioEmpresa", on_delete=models.CASCADE, null=True, blank=True)
    usuario_externo = models.CharField(max_length=250, blank=True, null=True)
    correo_usuario_externo = models.EmailField(blank=True, null=True)
    observacion_retroalimentacion = models.TextField(null=True, blank=True)
    fecha_retroalimentacion = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name="Retroalimentacion de OT"
        verbose_name_plural="Retroalimentaciones de OT"

    def generar_preguntas_aplicables(self):
        from ordentrabajo.models import DetalleTrabajo  # evitar circular import

        detalles = DetalleTrabajo.objects.filter(orden=self.orden_trabajo)

        for detalle in detalles:
            trabajo = detalle.trabajo
            if not trabajo:
                continue

            content_type = ContentType.objects.get_for_model(trabajo)
            preguntas = PreguntaEnRetroalimentacion.objects.filter(
                content_type=content_type,
                activo=True
            )

            for pregunta in preguntas:
                RetroalimentacionAplicada.objects.get_or_create(
                    retroalimentacion=self,
                    content_type=content_type,
                    object_id=trabajo.pk,
                    pregunta=pregunta
                )

    def __str__(self):
        if self.usuario_empresa:
            usuario = self.usuario_empresa.usuario.get_nombre()
        elif self.usuario_externo:
            usuario = self.usuario_externo
        else:
            usuario = "Sin usuario asignado"

        return f"Retroalimentación OT N°{self.orden_trabajo.id} por {usuario} ({self.fecha_retroalimentacion or 'Sin fecha'})"

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