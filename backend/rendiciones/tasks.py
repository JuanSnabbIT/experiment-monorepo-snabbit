# rendiciones/tasks.py

from celery import shared_task
from rendiciones.models import Rendicion
from empresas.models import UsuarioEmpresa
from django.utils.timezone import now
from datetime import timedelta

@shared_task
def crear_rendicion_semanal(usuario_id, fecha_referencia=None):
    fecha_referencia = fecha_referencia or now().date()

    try:
        usuario = UsuarioEmpresa.objects.get(id=usuario_id)
    except UsuarioEmpresa.DoesNotExist:
        return f"Usuario {usuario_id} no existe"

    inicio_semana = fecha_referencia - timedelta(days=fecha_referencia.weekday())
    fin_semana = inicio_semana + timedelta(days=6)

    ya_existe = Rendicion.objects.filter(
        usuario=usuario,
        fecha_rendicion__range=(inicio_semana, fin_semana)
    ).exists()

    if ya_existe:
        return f"Ya existe rendición esta semana para {usuario}"

    rendicion = Rendicion.objects.create(
        usuario=usuario,
        fecha_rendicion=fecha_referencia,
        observaciones="Rendición semanal automática"
    )
    return f"Rendición creada para {usuario} en fecha {rendicion.fecha_rendicion}"
