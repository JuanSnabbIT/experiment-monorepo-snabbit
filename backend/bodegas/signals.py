from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from .models import Compra, ItemEnCompra, OrdenCompra, ItemEnOrdenCompra, ItemOrdenCompraEnStock
from django.contrib.contenttypes.models import ContentType

# import random

# def generate_random_code():
#     """
#     Generates a random 8-digit numeric code.

#     Returns:
#         str: A string representing the 8-digit random code.
#     """
#     return f"{random.randint(10000000, 99999999)}"

# @receiver(post_save, sender=OrdenCompra)
# def set_codigo_for_orden_compra_on_create(sender, instance, created, **kwargs):
#     """
#     Signal to automatically set the codigo field with a random 8-digit code
#     only when the instance is created.
#     """
#     if created and not instance.codigo:
#         instance.codigo = generate_random_code()
#         instance.save()

@receiver(post_save, sender=OrdenCompra)
def create_items_in_stock(sender, instance, **kwargs):
    if instance.estado == '3':
        # Eliminar todos los ItemOrdenCompraEnStock relacionados con esta orden de compra
        # ItemOrdenCompraEnStock.objects.filter(
        #     content_type__app_label='bodegas',
        #     content_type__model='itemenordencompra',
        #     item_oc_id__in=ItemEnOrdenCompra.objects.filter(orden_compra=instance).values_list('id', flat=True)
        # ).delete()
        # Crear nuevos registros en ItemOrdenCompraEnStock por cada ItemEnOrdenCompra
        items_en_orden = ItemEnOrdenCompra.objects.filter(orden_compra=instance)
        for item in items_en_orden:
            content_type = ContentType.objects.get_for_model(item)  # Obtén el ContentType del modelo
            ItemOrdenCompraEnStock.objects.get_or_create(
                content_type=content_type,
                item_oc_id=item.id,
                cantidad=item.cantidad
            )

@receiver(pre_delete, sender=ItemEnCompra)
def eliminar_item_en_stock(sender, instance, **kwargs):
    content_type = ContentType.objects.get_for_model(instance)
    item_stock = ItemOrdenCompraEnStock.objects.filter(
        content_type=content_type,
        item_oc_id=instance.id,
    )
    if item_stock.exists():
        item_stock.first().delete()
    

@receiver(post_save, sender=ItemEnCompra)
def create_items_in_stock(sender, created, instance, **kwargs):
    if created:
        compra = Compra.objects.get(pk=instance.compra.pk)
        content_type = ContentType.objects.get_for_model(instance)
        ItemOrdenCompraEnStock.objects.get_or_create(
            content_type=content_type,
            item_oc_id=instance.id,
            cantidad=instance.cantidad,
            bodega_temporal=compra.bodega_temporal
        )