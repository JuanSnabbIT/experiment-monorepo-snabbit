from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import EntregaDeEquipo, AsistenciaUsuario, VisitaSoporte
from bodegas.models import GuiaSalida, ItemsGuiaSalida


# @receiver(post_save, sender=EntregaDeEquipo)
# def actualizar_estado_guia(sender, instance, **kwargs):
#     """
#     Signal que se dispara al guardar una EntregaDeEquipo.
#     Verifica si el equipo asociado a la entrega (mediante su número de serie)
#     está vinculado a algún ItemGuiaSalida y, de ser así, si todas las entregas 
#     correspondientes a esa Guía de Salida se encuentran en estado 'entregado'.
#     En ese caso, se actualiza el estado de la Guía de Salida.
#     """
#     equipo = instance.equipo
#     if not equipo or not equipo.numero_serie:
#         return

#     # Obtener todos los ItemsGuiaSalida y filtrar en memoria aquellos que coincidan
#     items_all = ItemsGuiaSalida.objects.all()
#     items = [
#         item for item in items_all
#         if item.numero_serie.get("serie") == equipo.numero_serie
#     ]

#     # Filtrar las Guías de Salida relacionadas a partir de los items filtrados
#     guias_relacionadas = GuiaSalida.objects.filter(
#         id__in=[item.guia_id for item in items]
#     ).distinct()

#     for guia in guias_relacionadas:
#         # Extraer todos los números de serie de los items asociados a la guía.
#         seriales_guia = [
#             item.numero_serie.get("serie")
#             for item in guia.itemsguiasalida_set.all()
#             if item.numero_serie.get("serie")
#         ]

#         if not seriales_guia:
#             continue

#         # Obtener todas las entregas cuyo equipo tenga un número de serie presente en la guía.
#         entregas = EntregaDeEquipo.objects.filter(equipo__numero_serie__in=seriales_guia)

#         # Verificar que para cada número de serie de la guía exista una entrega.
#         entregas_seriales = set(
#             entrega.equipo.numero_serie for entrega in entregas
#             if entrega.equipo.numero_serie
#         )
#         if not set(seriales_guia).issubset(entregas_seriales):
#             # Si falta alguna entrega para algún número de serie, no se actualiza la guía.
#             continue

#         # Verificar que todas las entregas estén en estado 'entregado'
#         if not entregas.exclude(estado_entrega="entregado").exists():
#             # Todos los equipos ya fueron entregados; se actualiza el estado de la Guía.
#             guia.estado = "E"  # Ajusta este valor según tus opciones de estado.
#             guia.save()

# def actualizar_estado_visita(visita):
#     """
#     Actualiza el estado de la visita basándose en el estado de todas sus asistencias y entregas.
#     Se considera "completado" si:
#       - Todas las asistencias tienen un estado dentro de estados_validos_asistencia.
#       - Todas las entregas tienen un estado dentro de estados_validos_entrega.
#     En caso contrario, se marca como "pendiente".
#     """
#     # Obtenemos las asistencias y entregas relacionadas a la visita
#     asistencias = visita.revisiones.all()  # related_name de AsistenciaUsuario
#     entregas = visita.entregas.all()        # related_name de EntregaDeEquipo

#     # Define los conjuntos de estados que se consideran "válidos" o "finalizados"
#     estados_validos_asistencia = {"revisado", "no_equipo", "no_usuario", "no_disponible"}  # Ejemplo: ajusta según tus constantes
#     estados_validos_entrega = {"entregado", "no_usuario"}  # Ejemplo

#     # Verificamos las asistencias:
#     # Si existen asistencias, todas deben estar en uno de los estados válidos.
#     # Si no hay asistencias, puedes definir si se considera como completado o no.
#     if asistencias.exists():
#         todas_asistencias_ok = all(a.estado_revision in estados_validos_asistencia for a in asistencias)
#     else:
#         todas_asistencias_ok = False  # No se considera completa si no hay asistencias

#     if entregas.exists():
#         todas_entregas_ok = all(e.estado_entrega in estados_validos_entrega for e in entregas)
#     else:
#         todas_entregas_ok = False  # No se considera completa si no hay entregas

#     if todas_asistencias_ok and todas_entregas_ok:
#         visita.estado = "completada"
#     else:
#         visita.estado = "pendiente"

#     visita.save()

# @receiver(post_save, sender=AsistenciaUsuario)
# def asistencia_usuario_post_save(sender, instance, **kwargs):
#     """
#     Cada vez que se guarda (o actualiza) una asistencia, se revisa el estado de la visita.
#     """
#     actualizar_estado_visita(instance.visita)

# @receiver(post_save, sender=EntregaDeEquipo)
# def entrega_de_equipo_post_save(sender, instance, **kwargs):
#     """
#     Cada vez que se guarda (o actualiza) una entrega, se revisa el estado de la visita.
#     """
#     actualizar_estado_visita(instance.visita)

# @receiver(post_delete, sender=AsistenciaUsuario)
# def asistencia_usuario_post_delete(sender, instance, **kwargs):
#     actualizar_estado_visita(instance.visita)

# @receiver(post_delete, sender=EntregaDeEquipo)
# def entrega_de_equipo_post_delete(sender, instance, **kwargs):
#     actualizar_estado_visita(instance.visita)