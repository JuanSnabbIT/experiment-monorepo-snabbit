from datetime import date
from decimal import Decimal

from django.db.models import F, Sum, ExpressionWrapper, DecimalField
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ObjectDoesNotExist

from .models import (
    ContratoEmpresaCliente,
    ContratoServicio,
    FacturaContrato,
    Servicio,
    ContratoLicencia,
)


@receiver(post_save, sender=ContratoEmpresaCliente)
def create_contrato_servicio_for_licencia(sender, instance, created, **kwargs):
    """
    Signal para ContratoEmpresaCliente:
    Si se crea un contrato cuyo tipo es 'licencia', se busca el Servicio con nombre
    "Servicio de Licencias" y se crea un ContratoServicio asociado a ese contrato.
    """
    if created and instance.tipo == 'licencia':
        try:
            # Se busca el Servicio específico por su nombre
            servicio_licencias = Servicio.objects.get(nombre="Servicio de Licencias")
        except Servicio.DoesNotExist:
            # Aquí podrías registrar el error en tus logs o tomar otra acción
            return
        
        # Crear el ContratoServicio asociado con el servicio encontrado.
        # Al asignar el objeto a 'servicio_generico', el método save() de ContratoServicio
        # se encargará de asignar el content_type correcto.
        ContratoServicio.objects.create(
            contrato=instance,
            servicio_generico=servicio_licencias,
            cantidad=1,              # Ajusta según la lógica de negocio
            precio_unitario=0,       # Ajusta según la lógica de negocio
        )

@receiver(post_save, sender=ContratoLicencia)
def update_contrato_servicio_price(sender, instance, **kwargs):
    """
    Signal para actualizar el precio en el ContratoServicio asociado al "Servicio de Licencias".
    Cada vez que se guarde un objeto ContratoLicencia, se recalcula el total
    como la suma de (cantidad * precio_unitario) de todas las licencias vinculadas al mismo contrato
    y se asigna ese total al campo precio_unitario del ContratoServicio correspondiente.
    """
    # Obtener el contrato al que pertenece la licencia
    contrato = instance.contrato

    # Obtener el ContentType de Servicio y buscar el servicio de licencias
    servicio_licencias_ct = ContentType.objects.get_for_model(Servicio)
    try:
        servicio_licencias = Servicio.objects.get(nombre="Servicio de Licencias")
    except Servicio.DoesNotExist:
        # Si no existe el servicio, no se procede
        return

    # Buscar el ContratoServicio asociado a este contrato y al Servicio de Licencias
    contrato_servicio = ContratoServicio.objects.filter(
        contrato=contrato,
        content_type=servicio_licencias_ct,
        object_id=servicio_licencias.id
    ).first()

    if not contrato_servicio:
        # Si no se encontró un ContratoServicio que cumpla con la condición, se sale del signal.
        return

    # Calcular el total: suma de (cantidad * precio_unitario) de todas las ContratoLicencia para ese contrato
    aggregate = ContratoLicencia.objects.filter(contrato=contrato).aggregate(
        total=Sum(ExpressionWrapper(
            F('cantidad') * F('precio_unitario'),
            output_field=DecimalField()
        ))
    )
    total_price = aggregate['total'] or 0

    # Actualizar el precio del ContratoServicio y guardarlo
    contrato_servicio.precio_unitario = total_price
    contrato_servicio.save()


# ── Tracking: estado anterior del contrato para detectar transiciones ──
@receiver(pre_save, sender=ContratoEmpresaCliente)
def capturar_estado_anterior_contrato(sender, instance, **kwargs):
    """Guarda el estado anterior en un atributo temporal para el post_save."""
    if instance.pk:
        try:
            instance._estado_anterior = (
                ContratoEmpresaCliente.objects.filter(pk=instance.pk)
                .values_list("estado", flat=True)
                .first()
            )
        except ContratoEmpresaCliente.DoesNotExist:
            instance._estado_anterior = None
    else:
        instance._estado_anterior = None


# ── Auto-generar primera prefactura al activar contrato ──
@receiver(post_save, sender=ContratoEmpresaCliente)
def generar_primera_prefactura_al_activar(sender, instance, created, **kwargs):
    """
    Cuando un contrato pasa a estado 'activo' (firma completada),
    genera automáticamente la primera prefactura en estado 'por_facturar'
    con el monto calculado desde los ítems comerciales.
    """
    estado_anterior = getattr(instance, "_estado_anterior", None)
    if instance.estado != "activo" or estado_anterior == "activo":
        return

    hoy = date.today()
    periodo_inicio = hoy.replace(day=1)
    # Fin del mes actual
    if hoy.month == 12:
        periodo_fin = hoy.replace(year=hoy.year + 1, month=1, day=1)
    else:
        periodo_fin = hoy.replace(month=hoy.month + 1, day=1)
    from datetime import timedelta
    periodo_fin = periodo_fin - timedelta(days=1)

    # Evitar duplicados
    ya_existe = FacturaContrato.objects.filter(
        contrato=instance,
        periodo_inicio=periodo_inicio,
        periodo_fin=periodo_fin,
    ).exists()
    if ya_existe:
        return

    monto_total = instance.total_items_comerciales or Decimal("0")

    FacturaContrato.objects.create(
        contrato=instance,
        empresa_prestadora=instance.empresa_prestadora,
        empresa_cliente=instance.empresa_cliente,
        estado="por_facturar",
        periodo_inicio=periodo_inicio,
        periodo_fin=periodo_fin,
        fecha_emision=hoy,
        monto_total=monto_total,
        moneda=instance.moneda_cobro,
        comentario=f"Prefactura automática — primer período {periodo_inicio.strftime('%m/%Y')}",
    )