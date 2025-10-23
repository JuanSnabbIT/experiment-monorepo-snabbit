from __future__ import absolute_import, unicode_literals
# Esto hace que Celery se cargue con Django
from .celery import app as celery_app

__all__ = ('celery_app',)