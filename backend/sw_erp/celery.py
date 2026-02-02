# mi_proyecto/celery.py
from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
from celery.schedules import crontab


# Establece el módulo de configuración de Django para que Celery lo use
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sw_erp.settings')

app = Celery('sw_erp')

# Carga la configuración de Django en Celery
app.config_from_object('django.conf:settings', namespace='CELERY')
app.conf.broker_connection_retry_on_startup = True


# Autodiscover tasks de las apps de Django
app.autodiscover_tasks()

# Define las tareas programadas

from celery.schedules import crontab

app.conf.beat_schedule = {
    'actualizar_contratos_vencidos_diario': {
        'task': 'tareas2doplano.tareas.actualizar_contratos_vencidos',
        'schedule': crontab(hour=8, minute=0),
    },
    'expirar_cotizaciones_vencidas': {
        'task': 'cotizaciones.tasks.expirar_cotizaciones_vencidas',
        'schedule': crontab(hour=0, minute=0),  # Diariamente a medianoche
    },
    'refrescar_tipo_cambio_proyecciones': {
        'task': 'cotizaciones.tasks.refrescar_tipo_cambio_proyecciones',
        'schedule': crontab(hour=6, minute=0),  # Diariamente a las 6 AM
    },
}
