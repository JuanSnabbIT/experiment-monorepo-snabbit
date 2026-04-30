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
    """Guarda el estado y técnico anteriores para hooks post_save."""
    if instance.pk:
        previo = (
            OrdenDeTrabajo.objects.filter(pk=instance.pk)
            .values("estado", "tecnico_responsable_ot_id")
            .first()
        )
        if previo:
            instance._estado_anterior = previo["estado"]
            instance._tecnico_responsable_anterior_id = previo["tecnico_responsable_ot_id"]
        else:
            instance._estado_anterior = None
            instance._tecnico_responsable_anterior_id = None
    else:
        instance._estado_anterior = None
        instance._tecnico_responsable_anterior_id = None


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


# ── Hooks de notificaciones FCM (lote SEB-275..301) ──
@receiver(post_save, sender=OrdenDeTrabajo)
def fcm_hook_ot_v2(sender, instance, created, **kwargs):
    """Dispara N1 (asignación técnico), N10 (cambio de estado), N11 (facturada).

    Falla silenciosamente para no romper el flujo de negocio.
    """
    import logging

    logger_local = logging.getLogger(__name__)

    estado_anterior = getattr(instance, "_estado_anterior", None)
    tecnico_anterior_id = getattr(instance, "_tecnico_responsable_anterior_id", None)
    tecnico_actual_id = instance.tecnico_responsable_ot_id

    # N1: asignación / reasignación de técnico
    try:
        if tecnico_actual_id and tecnico_actual_id != tecnico_anterior_id:
            from notificaciones.services import notificar_ot_asignada_tecnico

            tecnico_user_id = (
                instance.tecnico_responsable_ot.usuario_id
                if instance.tecnico_responsable_ot
                else None
            )
            if tecnico_user_id:
                notificar_ot_asignada_tecnico(
                    instance, tecnico_user_id, usuario_actor=None
                )
    except Exception:
        logger_local.exception("Hook FCM N1 (OT v2 asignación) fallo (silencioso).")

    # N10 / N11: cambios de estado
    if not created and estado_anterior and estado_anterior != instance.estado:
        try:
            from notificaciones.services import (
                notificar_ot_cambio_estado,
                notificar_ot_cerrada_facturada,
            )

            notificar_ot_cambio_estado(
                instance, estado_anterior, instance.estado, usuario_actor=None
            )
            if instance.estado == "facturada":
                notificar_ot_cerrada_facturada(instance, usuario_actor=None)
        except Exception:
            logger_local.exception("Hook FCM N10/N11 (OT v2 estado) fallo (silencioso).")

