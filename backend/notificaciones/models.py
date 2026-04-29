"""Modelos de la app `notificaciones`.

Incluye:
- FCMToken: tokens de dispositivo registrados por usuario para envío push (Firebase Cloud Messaging).
- Notificacion: historial persistente de notificaciones enviadas (campana del header).
- ConfiguracionNotificacionEmpresa: activación/desactivación de tipos de evento por empresa.

Reglas de negocio (v1):
- Solo eventos de push: prefactura "Por Facturar", guía requiere firma, stock bajo.
- Retención del historial: 30 días (purga vía Celery Beat).
- Configuración por empresa: cada empresa decide qué tipos de notificación están activos.
"""

from django.conf import settings
from django.db import models

from core.models import ModeloBase


class TipoEventoNotificacion(models.TextChoices):
    """Catálogo central de tipos de evento que pueden generar notificaciones push.

    Mantener sincronizado con los hooks definidos en cada módulo del backend.
    """

    PREFACTURA_POR_FACTURAR = "prefactura_por_facturar", "Prefactura lista para facturar"
    GUIA_REQUIERE_FIRMA = "guia_requiere_firma", "Guía requiere firma del técnico"
    STOCK_BAJO_MINIMO = "stock_bajo_minimo", "Stock por debajo del mínimo"


class FCMToken(ModeloBase):
    """Token de dispositivo registrado por un usuario para recibir push de FCM.

    Un usuario puede tener múltiples tokens (varios navegadores/dispositivos).
    Los tokens marcados como `activo=False` son los que el SDK reportó como inválidos
    (UNREGISTERED, INVALID_ARGUMENT) y no deben usarse para envío.
    """

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="fcm_tokens",
    )
    token = models.TextField(unique=True)
    user_agent = models.CharField(max_length=255, blank=True, default="")
    activo = models.BooleanField(default=True)
    ultima_vez_visto = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Token FCM"
        verbose_name_plural = "Tokens FCM"
        indexes = [
            models.Index(fields=["usuario", "activo"]),
        ]

    def __str__(self) -> str:
        return f"FCMToken({self.usuario_id}, activo={self.activo})"


class Notificacion(ModeloBase):
    """Historial persistente de una notificación entregada a un usuario.

    Se crea siempre que se dispare `send_fcm_push_task`, incluso si el envío push falla,
    para que el usuario pueda verla luego en la campana del header.
    """

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notificaciones",
    )
    tipo = models.CharField(max_length=64, choices=TipoEventoNotificacion.choices)
    titulo = models.CharField(max_length=180)
    cuerpo = models.TextField(blank=True, default="")
    # URL relativa del frontend a la que se debe navegar al hacer clic.
    url_destino = models.CharField(max_length=500, blank=True, default="")
    leida = models.BooleanField(default=False)
    fecha_lectura = models.DateTimeField(null=True, blank=True)
    # Datos adicionales (ids de OT, guia, item, etc.) para uso del frontend.
    datos = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Notificación"
        verbose_name_plural = "Notificaciones"
        ordering = ["-fecha_creacion"]
        indexes = [
            models.Index(fields=["usuario", "leida"]),
            models.Index(fields=["fecha_creacion"]),
        ]

    def __str__(self) -> str:
        return f"Notificacion({self.tipo}, usuario={self.usuario_id}, leida={self.leida})"


class ConfiguracionNotificacionEmpresa(ModeloBase):
    """Permite a cada empresa activar o desactivar tipos de notificación.

    Si NO existe registro para un (empresa, tipo) → se considera ACTIVO por defecto.
    Esto evita tener que poblar la tabla al alta de empresas existentes.
    """

    empresa = models.ForeignKey(
        "empresas.Empresa",
        on_delete=models.CASCADE,
        related_name="configuraciones_notificacion",
    )
    tipo = models.CharField(max_length=64, choices=TipoEventoNotificacion.choices)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Configuración de notificación por empresa"
        verbose_name_plural = "Configuraciones de notificación por empresa"
        unique_together = [("empresa", "tipo")]
        indexes = [
            models.Index(fields=["empresa", "tipo"]),
        ]

    def __str__(self) -> str:
        return f"{self.empresa_id} | {self.tipo} | activo={self.activo}"

    @classmethod
    def esta_activo(cls, empresa, tipo) -> bool:
        """Retorna True si la empresa tiene el tipo activo. Default: activo.

        Si NO existe registro para (empresa, tipo) se considera ACTIVO.
        """
        if empresa is None:
            return False
        cfg = cls.objects.filter(empresa=empresa, tipo=tipo).first()
        return True if cfg is None else cfg.activo
