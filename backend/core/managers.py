# core/managers.py
from django.contrib.contenttypes.models import ContentType
from django.db import models

class PreguntaEnRetroalimentacionManager(models.Manager):
    def para_modelo(self, instancia_modelo):
        ct = ContentType.objects.get_for_model(instancia_modelo)
        return self.filter(content_type=ct, activo=True)