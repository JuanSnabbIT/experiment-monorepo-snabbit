from celery import shared_task
from datetime import date
from contratos.models import ContratoEmpresaCliente

@shared_task
def actualizar_contratos_vencidos():
    """Busca contratos vencidos y los marca como finalizados."""
    contratos_vencidos = ContratoEmpresaCliente.objects.filter(fecha_fin__lt=date.today(), estado='activo')
    for contrato in contratos_vencidos:
        contrato.estado = 'finalizado'
        contrato.save()
        print(f"Contrato {contrato.id} finalizado automáticamente.")
    return f"Se han finalizado {contratos_vencidos.count()} contratos vencidos."