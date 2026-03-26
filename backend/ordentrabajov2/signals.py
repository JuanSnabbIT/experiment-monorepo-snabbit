from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import (
    OrdenDeTrabajo,
    SoporteTecnico,
    ServicioEnOT,
    CierreAdministrativoOT,
)

@receiver(post_save, sender=OrdenDeTrabajo)
def crear_registros_iniciales_y_cierre(sender, instance, created, **kwargs):
    """Crea registros iniciales según el tipo de servicio y el cierre administrativo al pasar a estado 'cerrada'.
    - SoporteTecnico inicial para tipos soporte.
    - ServicioEnOT inicial para tipo general.
    - CierreAdministrativoOT al cerrar si aún no existe.
    Idempotente mediante get_or_create y hasattr.
    """
    if created:
        if instance.tipo_servicio in ("soporte_r", "soporte_p"):
            SoporteTecnico.objects.get_or_create(
                orden=instance,
                defaults={
                    "nombre": "Soporte inicial",
                    "descripcion": "Registro automático de soporte",
                    "estado": "pendiente",
                    "tecnico_asignado": instance.tecnico_responsable_ot,
                    "fecha_soporte": instance.fecha_inicio_ot,
                },
            )
        elif instance.tipo_servicio == "general":
            ServicioEnOT.objects.get_or_create(
                orden=instance,
                defaults={
                    "nombre": "Servicio inicial",
                    "descripcion": "Registro automático de servicio",
                    "estado": "pendiente",
                    "tecnico_asignado": instance.tecnico_responsable_ot,
                    "fecha_servicio": instance.fecha_inicio_ot,
                },
            )
    # Crear cierre administrativo si la orden está cerrada y no existe una prefactura que la incluya
    if instance.estado == "cerrada":
        prefacturas = CierreAdministrativoOT.objects.filter(
            cliente_id=instance.cliente_id,
            estado_cierre__in=["borrador", "en_revision", "aprobado", "facturado", "pagado"],
        ).only("id", "resultado")
        for prefactura in prefacturas:
            resultado = prefactura.resultado or {}
            ots_incluidas = resultado.get("ots_incluidas", [])
            if isinstance(ots_incluidas, list) and instance.id in ots_incluidas:
                return

        CierreAdministrativoOT.objects.create(
            cliente=instance.cliente,
            creado_por=instance.tecnico_responsable_ot,
            actualizado_por=instance.tecnico_responsable_ot,
            estado_cierre="borrador",
            resultado={
                "cliente_id": instance.cliente_id,
                "ots_incluidas": [instance.id],
                "items": [],
                "resumen": {},
            },
            comentario="Creado automaticamente al pasar a estado 'cerrada'",
        )


# ── Tracking: estado anterior de la OT para detectar transiciones ──
@receiver(pre_save, sender=OrdenDeTrabajo)
def capturar_estado_anterior_ot(sender, instance, **kwargs):
    """Guarda el estado anterior para el post_save de conteo de visitas."""
    if instance.pk:
        instance._estado_anterior = (
            OrdenDeTrabajo.objects.filter(pk=instance.pk)
            .values_list("estado", flat=True)
            .first()
        )
    else:
        instance._estado_anterior = None


# ── Conteo de visitas usadas al completar OT ──
@receiver(post_save, sender=OrdenDeTrabajo)
def actualizar_visitas_usadas_contrato(sender, instance, created, **kwargs):
    """
    Cuando una OT con contrato vinculado pasa a 'completada',
    cuenta los soportes presenciales e incrementa visitas_usadas en el contrato.
    Si se revierte desde 'completada', decrementa.
    """
    if created:
        return

    estado_anterior = getattr(instance, "_estado_anterior", None)
    if not estado_anterior or estado_anterior == instance.estado:
        return
    if not instance.contrato_id:
        return

    n_presenciales = SoporteTecnico.objects.filter(
        orden=instance, modalidad="presencial"
    ).count()
    if n_presenciales == 0:
        return

    from contratos.models import ContratoVisita

    visitas_contrato = ContratoVisita.objects.filter(contrato_id=instance.contrato_id)
    if not visitas_contrato.exists():
        return

    # OT pasa a completada → incrementar
    if instance.estado == "completada" and estado_anterior != "completada":
        for cv in visitas_contrato:
            cv.visitas_usadas += n_presenciales
            cv.save(update_fields=["visitas_usadas"])

    # OT sale de completada (reversión) → decrementar
    elif estado_anterior == "completada" and instance.estado != "completada":
        for cv in visitas_contrato:
            cv.visitas_usadas = max(0, cv.visitas_usadas - n_presenciales)
            cv.save(update_fields=["visitas_usadas"])
