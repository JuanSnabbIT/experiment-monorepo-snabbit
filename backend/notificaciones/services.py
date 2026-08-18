"""Servicios de notificaciones: orquestacion de eventos de negocio.

Estas funciones son los puntos de entrada que los hooks de cada modulo deben llamar.
Cada funcion:
- Resuelve los destinatarios segun reglas de negocio.
- Verifica que el tipo de evento este activo para la empresa.
- Excluye al usuario que dispara la accion (si aplica).
- Encola la tarea Celery de envio push.
"""

from __future__ import annotations

import logging
from typing import Iterable

from django.contrib.auth.models import Group

from .models import (
    ConfiguracionNotificacionEmpresa,
    TipoEventoNotificacion,
)

logger = logging.getLogger(__name__)


# Nombres de grupos Django que deben existir (creados en seed_base.py).
GRUPO_CONTABILIDAD = "contabilidad"
GRUPO_COMPRADOR = "comprador"
GRUPO_TECNICO = "tecnico"

# Lote SEB-275..301 (epic SEB-201).
GRUPO_VENTAS = "ventas"
GRUPO_OPERACIONES = "operaciones"
GRUPO_FINANZAS = "finanzas"
GRUPO_RRHH = "rrhh"
GRUPO_CONTRATOS = "contratos"
GRUPO_BODEGA = "bodega"


def _usuarios_en_rol_de_empresa(empresa, nombre_grupo: str) -> list[int]:
    """Retorna ids de Users activos del rol indicado dentro de la empresa.

    Filtra por `UsuarioEmpresa.sucursal.empresa == empresa` para evitar fuga
    de datos entre empresas (multi-tenancy).
    """
    if empresa is None:
        return []

    from empresas.models import UsuarioEmpresa  # import local para evitar ciclos

    grupo = Group.objects.filter(name=nombre_grupo).first()
    if grupo is None:
        logger.warning(
            "Grupo '%s' no existe; ningun usuario sera notificado.", nombre_grupo
        )
        return []

    qs = UsuarioEmpresa.objects.filter(
        sucursal__empresa=empresa,
        grupos=grupo,
        usuario__is_active=True,
    ).values_list("usuario_id", flat=True).distinct()

    return list(qs)


def _disparar(
    usuario_ids: Iterable[int],
    tipo: str,
    titulo: str,
    cuerpo: str,
    url_destino: str,
    datos: dict | None,
    excluir_usuario_id: int | None,
) -> None:
    """Llama la tarea Celery de envio push, excluyendo a `excluir_usuario_id`."""
    destinatarios = [uid for uid in set(usuario_ids) if uid and uid != excluir_usuario_id]
    if not destinatarios:
        return

    # Import local para evitar ciclos al importar el modulo.
    from .tasks import send_fcm_push_task

    send_fcm_push_task.delay(
        usuario_ids=destinatarios,
        tipo=tipo,
        titulo=titulo,
        cuerpo=cuerpo,
        url_destino=url_destino,
        datos=datos or {},
    )


# ============================================================================
# Helper para notificar a un usuario directo (no por grupo)
# ============================================================================
def _disparar_a_usuario_directo(
    user_id: int | None,
    *,
    empresa,
    tipo: str,
    titulo: str,
    cuerpo: str,
    url_destino: str,
    datos: dict | None = None,
    excluir_usuario_id: int | None = None,
) -> None:
    """Notifica a un usuario individual respetando gating por empresa."""
    if not user_id:
        return
    if not ConfiguracionNotificacionEmpresa.esta_activo(empresa, tipo):
        return
    _disparar(
        usuario_ids=[user_id],
        tipo=tipo,
        titulo=titulo,
        cuerpo=cuerpo,
        url_destino=url_destino,
        datos=datos,
        excluir_usuario_id=excluir_usuario_id,
    )


def _disparar_a_grupo(
    *,
    empresa,
    grupo: str,
    tipo: str,
    titulo: str,
    cuerpo: str,
    url_destino: str,
    datos: dict | None = None,
    excluir_usuario_id: int | None = None,
) -> None:
    """Notifica a todos los usuarios de un grupo dentro de la empresa."""
    if empresa is None:
        return
    if not ConfiguracionNotificacionEmpresa.esta_activo(empresa, tipo):
        return
    usuario_ids = _usuarios_en_rol_de_empresa(empresa, grupo)
    if not usuario_ids:
        return
    _disparar(
        usuario_ids=usuario_ids,
        tipo=tipo,
        titulo=titulo,
        cuerpo=cuerpo,
        url_destino=url_destino,
        datos=datos,
        excluir_usuario_id=excluir_usuario_id,
    )


# ============================================================================
# Lote SEB-275..301 — funciones notificar_* (epic SEB-201)
# ============================================================================

# ----- Ordenes de Trabajo (N1, N10, N11) ------------------------------------
def _url_destino_ot(ot) -> str:
    """Retorna la URL frontend correcta segun la version de la OT."""
    if type(ot).__name__ == "OrdenDeTrabajoV3":
        return f"/ot-v3/{ot.id}"
    return f"/ot/{ot.id}"


def notificar_ot_asignada_tecnico(ot, tecnico_user_id: int, *, usuario_actor=None) -> None:
    """N1: Tecnico recibe push cuando se le asigna/reasigna una OT."""
    actor_id = getattr(usuario_actor, "id", None)
    empresa = getattr(ot, "empresa", None)
    _disparar_a_usuario_directo(
        user_id=tecnico_user_id,
        empresa=empresa,
        tipo=TipoEventoNotificacion.OT_ASIGNADA_TECNICO.value,
        titulo="OT asignada",
        cuerpo=f"Se te asigno la OT #{ot.id}.",
        url_destino=_url_destino_ot(ot),
        datos={"ot_id": ot.id},
        excluir_usuario_id=actor_id,
    )


def notificar_ot_cambio_estado(
    ot,
    estado_anterior: str,
    estado_nuevo: str,
    *,
    usuario_actor=None,
) -> None:
    """N10: Notifica al rol pertinente segun la transicion de estado de la OT."""
    empresa = getattr(ot, "empresa", None)
    actor_id = getattr(usuario_actor, "id", None)
    tipo = TipoEventoNotificacion.OT_CAMBIO_ESTADO.value

    transiciones = {
        # OT V2
        ("pendiente", "en_proceso"): "tecnico_directo",
        ("en_proceso", "completada"): GRUPO_OPERACIONES,
        ("completada", "cerrada"): GRUPO_FINANZAS,
        # OT V3
        ("borrador", "preparacion"): GRUPO_TECNICO,
        ("preparacion", "en_ejecucion"): "tecnico_directo",
        ("en_ejecucion", "retroalimentacion"): GRUPO_OPERACIONES,
        ("retroalimentacion", "por_facturar"): GRUPO_FINANZAS,
        ("por_facturar", "facturada"): GRUPO_FINANZAS,
        ("facturada", "cerrada"): GRUPO_OPERACIONES,
    }
    objetivo = transiciones.get((estado_anterior, estado_nuevo))

    titulo = "OT cambio de estado"
    cuerpo = f"OT #{ot.id}: {estado_anterior} -> {estado_nuevo}."
    url_destino = _url_destino_ot(ot)
    datos = {"ot_id": ot.id, "estado_anterior": estado_anterior, "estado_nuevo": estado_nuevo}

    # Cancelacion: tecnico responsable + operaciones
    if estado_nuevo == "cancelada":
        tecnico_id = _resolver_tecnico_user_id(ot)
        _disparar_a_usuario_directo(
            user_id=tecnico_id,
            empresa=empresa,
            tipo=tipo,
            titulo=titulo,
            cuerpo=cuerpo,
            url_destino=url_destino,
            datos=datos,
            excluir_usuario_id=actor_id,
        )
        _disparar_a_grupo(
            empresa=empresa,
            grupo=GRUPO_OPERACIONES,
            tipo=tipo,
            titulo=titulo,
            cuerpo=cuerpo,
            url_destino=url_destino,
            datos=datos,
            excluir_usuario_id=actor_id,
        )
        return

    if objetivo == "tecnico_directo":
        tecnico_id = _resolver_tecnico_user_id(ot)
        _disparar_a_usuario_directo(
            user_id=tecnico_id,
            empresa=empresa,
            tipo=tipo,
            titulo=titulo,
            cuerpo=cuerpo,
            url_destino=url_destino,
            datos=datos,
            excluir_usuario_id=actor_id,
        )
        return

    # completada -> cerrada: solo operaciones (finanzas se notifica via N11 al facturar)
    if (estado_anterior, estado_nuevo) == ("completada", "cerrada"):
        _disparar_a_grupo(
            empresa=empresa,
            grupo=GRUPO_OPERACIONES,
            tipo=tipo,
            titulo=titulo,
            cuerpo=cuerpo,
            url_destino=url_destino,
            datos=datos,
            excluir_usuario_id=actor_id,
        )
        return

    if objetivo:
        _disparar_a_grupo(
            empresa=empresa,
            grupo=objetivo,
            tipo=tipo,
            titulo=titulo,
            cuerpo=cuerpo,
            url_destino=url_destino,
            datos=datos,
            excluir_usuario_id=actor_id,
        )


def notificar_ot_cerrada_facturada(ot, *, usuario_actor=None) -> None:
    """N11: OT facturada -> notifica a finanzas y operaciones."""
    empresa = getattr(ot, "empresa", None)
    actor_id = getattr(usuario_actor, "id", None)
    tipo = TipoEventoNotificacion.OT_CERRADA_FACTURADA.value
    titulo = "OT facturada"
    cuerpo = f"OT #{ot.id} fue facturada."
    url_destino = _url_destino_ot(ot)
    datos = {"ot_id": ot.id}
    for grupo in (GRUPO_FINANZAS, GRUPO_OPERACIONES):
        _disparar_a_grupo(
            empresa=empresa,
            grupo=grupo,
            tipo=tipo,
            titulo=titulo,
            cuerpo=cuerpo,
            url_destino=url_destino,
            datos=datos,
            excluir_usuario_id=actor_id,
        )


def _resolver_tecnico_user_id(ot) -> int | None:
    """Obtiene el User.id del tecnico responsable, soportando OT v2 y v3."""
    # v2: tecnico_responsable_ot -> UsuarioEmpresa -> usuario
    ue = getattr(ot, "tecnico_responsable_ot", None)
    if ue is not None:
        return getattr(getattr(ue, "usuario", None), "id", None)
    # v3: tecnico_responsable -> User directo
    user = getattr(ot, "tecnico_responsable", None)
    if user is not None:
        return getattr(user, "id", None)
    return None


# ----- Cotizaciones (N2, N3, N4) --------------------------------------------
def notificar_cotizacion_aprobada(cotizacion, *, usuario_actor=None) -> None:
    """N2: Cotizacion aprobada por cliente -> notifica a ventas."""
    empresa = getattr(cotizacion, "empresa", None)
    actor_id = getattr(usuario_actor, "id", None)
    _disparar_a_grupo(
        empresa=empresa,
        grupo=GRUPO_VENTAS,
        tipo=TipoEventoNotificacion.COTIZACION_APROBADA.value,
        titulo="Cotizacion aprobada",
        cuerpo=f"Cotizacion #{cotizacion.numero_cotizacion or cotizacion.id} fue aprobada por el cliente.",
        url_destino=f"/cotizaciones/{cotizacion.id}",
        datos={"cotizacion_id": cotizacion.id},
        excluir_usuario_id=actor_id,
    )


def notificar_cotizacion_rechazada(cotizacion, *, usuario_actor=None) -> None:
    """N3: Cotizacion rechazada por cliente -> notifica a ventas."""
    empresa = getattr(cotizacion, "empresa", None)
    actor_id = getattr(usuario_actor, "id", None)
    _disparar_a_grupo(
        empresa=empresa,
        grupo=GRUPO_VENTAS,
        tipo=TipoEventoNotificacion.COTIZACION_RECHAZADA.value,
        titulo="Cotizacion rechazada",
        cuerpo=f"Cotizacion #{cotizacion.numero_cotizacion or cotizacion.id} fue rechazada.",
        url_destino=f"/cotizaciones/{cotizacion.id}",
        datos={"cotizacion_id": cotizacion.id},
        excluir_usuario_id=actor_id,
    )


def notificar_cotizacion_por_vencer(cotizacion) -> None:
    """N4: Alerta diaria de cotizaciones proximas a vencer (anti-flood en BD)."""
    empresa = getattr(cotizacion, "empresa", None)
    tipo = TipoEventoNotificacion.COTIZACION_POR_VENCER.value
    if not ConfiguracionNotificacionEmpresa.esta_activo(empresa, tipo):
        return
    if getattr(cotizacion, "alerta_vencimiento_fcm_enviada", False):
        return
    usuario_ids = _usuarios_en_rol_de_empresa(empresa, GRUPO_VENTAS)
    if not usuario_ids:
        return
    _disparar(
        usuario_ids=usuario_ids,
        tipo=tipo,
        titulo="Cotizacion por vencer",
        cuerpo=(
            f"Cotizacion #{cotizacion.numero_cotizacion or cotizacion.id} vence el "
            f"{cotizacion.fecha_vencimiento}."
        ),
        url_destino=f"/cotizaciones/{cotizacion.id}",
        datos={"cotizacion_id": cotizacion.id},
        excluir_usuario_id=None,
    )
    cotizacion.alerta_vencimiento_fcm_enviada = True
    cotizacion.save(update_fields=["alerta_vencimiento_fcm_enviada"])


# ----- Rendiciones (N5, N6) -------------------------------------------------
def _empresa_de_rendicion(rendicion):
    """Obtiene empresa desde rendicion.usuario.sucursal.empresa (UsuarioEmpresa)."""
    try:
        return rendicion.usuario.sucursal.empresa
    except Exception:
        return None


def notificar_rendicion_pendiente_aprobacion(rendicion, *, usuario_actor=None) -> None:
    """N5: Tecnico envia rendicion -> notifica a operaciones + finanzas."""
    empresa = _empresa_de_rendicion(rendicion)
    actor_id = getattr(usuario_actor, "id", None)
    titulo = "Rendicion pendiente de aprobacion"
    cuerpo = f"Hay una nueva rendicion pendiente (#{rendicion.id})."
    url_destino = f"/rendiciones/{rendicion.id}"
    datos = {"rendicion_id": rendicion.id}
    tipo = TipoEventoNotificacion.RENDICION_PENDIENTE_APROBACION.value
    for grupo in (GRUPO_OPERACIONES, GRUPO_FINANZAS):
        _disparar_a_grupo(
            empresa=empresa,
            grupo=grupo,
            tipo=tipo,
            titulo=titulo,
            cuerpo=cuerpo,
            url_destino=url_destino,
            datos=datos,
            excluir_usuario_id=actor_id,
        )


def notificar_rendicion_actualizada(
    rendicion,
    accion: str,
    *,
    usuario_actor=None,
) -> None:
    """N6: Rendicion aprobada/rechazada/pagada -> notifica al tecnico autor."""
    empresa = _empresa_de_rendicion(rendicion)
    actor_id = getattr(usuario_actor, "id", None)
    try:
        tecnico_user_id = rendicion.usuario.usuario_id
    except Exception:
        tecnico_user_id = None
    _disparar_a_usuario_directo(
        user_id=tecnico_user_id,
        empresa=empresa,
        tipo=TipoEventoNotificacion.RENDICION_ACTUALIZADA.value,
        titulo=f"Rendicion {accion}",
        cuerpo=f"Tu rendicion #{rendicion.id} fue {accion}.",
        url_destino=f"/rendiciones/{rendicion.id}",
        datos={"rendicion_id": rendicion.id, "accion": accion},
        excluir_usuario_id=actor_id,
    )


# ----- Bodegas (N8, N23) ----------------------------------------------------
def notificar_oc_mercaderia_recibida(orden_compra, *, usuario_actor=None) -> None:
    """N8: OC recepcionada -> notifica al creador de la OC."""
    empresa = getattr(orden_compra, "oc_empresa", None) or getattr(orden_compra, "empresa", None)
    actor_id = getattr(usuario_actor, "id", None)
    creador = getattr(orden_compra, "creado_por", None)
    creador_user_id = getattr(getattr(creador, "usuario", None), "id", None)
    _disparar_a_usuario_directo(
        user_id=creador_user_id,
        empresa=empresa,
        tipo=TipoEventoNotificacion.OC_MERCADERIA_RECIBIDA.value,
        titulo="Mercaderia recibida",
        cuerpo=f"La OC #{orden_compra.id} fue recepcionada.",
        url_destino=f"/bodegas/ordenes-compra/{orden_compra.id}",
        datos={"orden_compra_id": orden_compra.id},
        excluir_usuario_id=actor_id,
    )


def notificar_guia_salida_hito(
    guia,
    hito: str,
    *,
    usuario_actor=None,
    destinatarios_user_ids: list[int] | None = None,
) -> None:
    """N23: Hito en guia de salida (aprobada / devuelta / recibida)."""
    try:
        empresa = guia.bodega.sucursal.empresa
    except Exception:
        empresa = None
    actor_id = getattr(usuario_actor, "id", None)
    titulo = f"Guia de salida {hito}"
    cuerpo = f"Guia #{guia.id}: {hito}."
    url_destino = f"/bodegas/guias-salida/{guia.id}"
    datos = {"guia_id": guia.id, "hito": hito}
    tipo = TipoEventoNotificacion.GUIA_SALIDA_HITO.value

    if destinatarios_user_ids:
        if not ConfiguracionNotificacionEmpresa.esta_activo(empresa, tipo):
            return
        _disparar(
            usuario_ids=destinatarios_user_ids,
            tipo=tipo,
            titulo=titulo,
            cuerpo=cuerpo,
            url_destino=url_destino,
            datos=datos,
            excluir_usuario_id=actor_id,
        )
    else:
        _disparar_a_grupo(
            empresa=empresa,
            grupo=GRUPO_BODEGA,
            tipo=tipo,
            titulo=titulo,
            cuerpo=cuerpo,
            url_destino=url_destino,
            datos=datos,
            excluir_usuario_id=actor_id,
        )


# ----- Vacaciones (N12, N13) ------------------------------------------------
def _empresa_de_solicitud_vacaciones(solicitud):
    try:
        return solicitud.usuario_empresa.sucursal.empresa
    except Exception:
        return None


def notificar_vacaciones_solicitud_creada(solicitud, *, usuario_actor=None) -> None:
    """N12: Solicitud creada -> notifica a RRHH."""
    empresa = _empresa_de_solicitud_vacaciones(solicitud)
    actor_id = getattr(usuario_actor, "id", None)
    _disparar_a_grupo(
        empresa=empresa,
        grupo=GRUPO_RRHH,
        tipo=TipoEventoNotificacion.VACACIONES_SOLICITUD_CREADA.value,
        titulo="Nueva solicitud de vacaciones",
        cuerpo=(
            f"Solicitud #{solicitud.id} de "
            f"{solicitud.fecha_inicio} a {solicitud.fecha_fin}."
        ),
        url_destino=f"/vacaciones/{solicitud.id}",
        datos={"solicitud_id": solicitud.id},
        excluir_usuario_id=actor_id,
    )


def notificar_vacaciones_resolucion(
    solicitud,
    accion: str | None = None,
    *,
    usuario_actor=None,
) -> None:
    """N13: Solicitud aprobada/rechazada -> notifica al solicitante.

    Si `accion` no se pasa, se infiere del campo `solicitud.estado` (2=aprobada, 3=rechazada).
    """
    if accion is None:
        estado = getattr(solicitud, "estado", "")
        accion = "aprobada" if estado == "2" else "rechazada"
    empresa = _empresa_de_solicitud_vacaciones(solicitud)
    actor_id = getattr(usuario_actor, "id", None)
    try:
        solicitante_user_id = solicitud.usuario_empresa.usuario_id
    except Exception:
        solicitante_user_id = None
    _disparar_a_usuario_directo(
        user_id=solicitante_user_id,
        empresa=empresa,
        tipo=TipoEventoNotificacion.VACACIONES_RESOLUCION.value,
        titulo=f"Vacaciones {accion}",
        cuerpo=f"Tu solicitud #{solicitud.id} fue {accion}.",
        url_destino=f"/vacaciones/{solicitud.id}",
        datos={"solicitud_id": solicitud.id, "accion": accion},
        excluir_usuario_id=actor_id,
    )


def _usuarios_superadmin_activos() -> list[int]:
    """Ids de Users activos con rol 'superadmin' en cualquier empresa.

    A diferencia de _usuarios_en_rol_de_empresa, esta consulta NO se restringe
    a la empresa del evento: 'superadmin' es un rol de administracion interna
    (staff de la prestadora que gestiona clientes desde el panel), no un rol
    del lado del cliente. Se usa para que estos usuarios tambien reciban
    notificaciones aunque no tengan UsuarioEmpresa en la empresa cliente.
    """
    from empresas.models import UsuarioEmpresa  # import local para evitar ciclos

    grupo = Group.objects.filter(name="superadmin").first()
    if grupo is None:
        return []
    return list(
        UsuarioEmpresa.objects.filter(
            grupos=grupo, usuario__is_active=True,
        ).values_list("usuario_id", flat=True).distinct()
    )


# ----- Contratos laborales (constancia de aviso de vencimiento) -------------
def notificar_contrato_proximo_a_vencer(contrato) -> None:
    """Contrato laboral a plazo fijo proximo a vencer -> notifica a RRHH del
    cliente y, ademas, a los superadmin (rol global de la prestadora).

    Deja constancia in-app (visible en la campana del header) de que el
    aviso de vencimiento fue generado, independiente de si el correo
    llega o es revisado.
    """
    try:
        empresa = contrato.usuario_empresa.sucursal.empresa
    except Exception:
        empresa = None
    if empresa is None:
        return
    if not ConfiguracionNotificacionEmpresa.esta_activo(
        empresa, TipoEventoNotificacion.CONTRATO_PROXIMO_A_VENCER.value
    ):
        return

    try:
        nombre_trabajador = contrato.usuario_empresa.usuario.get_nombre_completo()
    except Exception:
        nombre_trabajador = "un trabajador"

    usuario_ids = set(_usuarios_en_rol_de_empresa(empresa, GRUPO_RRHH)) | set(
        _usuarios_superadmin_activos()
    )
    if not usuario_ids:
        return

    _disparar(
        usuario_ids=usuario_ids,
        tipo=TipoEventoNotificacion.CONTRATO_PROXIMO_A_VENCER.value,
        titulo="Contrato laboral próximo a vencer",
        cuerpo=(
            f"El contrato de {nombre_trabajador} vence el {contrato.fecha_termino}. "
            f"Se envió un aviso por correo."
        ),
        url_destino=f"/rrhh/contratos/{contrato.id}",
        datos={"contrato_id": contrato.id},
        excluir_usuario_id=None,
    )


# ----- Visitas (N14) --------------------------------------------------------
def notificar_visita_asignada(
    visita,
    tecnico_user_id: int,
    *,
    usuario_actor=None,
) -> None:
    """N14: Visita asignada o reasignada -> notifica al tecnico."""
    empresa = getattr(visita, "empresa", None)
    actor_id = getattr(usuario_actor, "id", None)
    _disparar_a_usuario_directo(
        user_id=tecnico_user_id,
        empresa=empresa,
        tipo=TipoEventoNotificacion.VISITA_ASIGNADA.value,
        titulo="Visita asignada",
        cuerpo=f"Tienes una visita asignada (#{visita.id}).",
        url_destino=f"/visitas/{visita.id}",
        datos={"visita_id": visita.id},
        excluir_usuario_id=actor_id,
    )


# ----- Contratos (N17, N18, N19) --------------------------------------------
def notificar_contrato_resolucion_cliente(
    contrato,
    accion: str,
    *,
    usuario_actor=None,
) -> None:
    """N17: Contrato firmado o rechazado por el cliente -> notifica a contratos."""
    empresa = getattr(contrato, "empresa_prestadora", None)
    actor_id = getattr(usuario_actor, "id", None)
    _disparar_a_grupo(
        empresa=empresa,
        grupo=GRUPO_CONTRATOS,
        tipo=TipoEventoNotificacion.CONTRATO_RESOLUCION_CLIENTE.value,
        titulo=f"Contrato {accion}",
        cuerpo=f"Contrato '{contrato.nombre}' (#{contrato.id}) fue {accion} por el cliente.",
        url_destino=f"/contratos/{contrato.id}",
        datos={"contrato_id": contrato.id, "accion": accion},
        excluir_usuario_id=actor_id,
    )


def notificar_contrato_activado(contrato, *, usuario_actor=None) -> None:
    """N18: Contrato activado y primera prefactura generada -> contratos + finanzas."""
    empresa = getattr(contrato, "empresa_prestadora", None)
    actor_id = getattr(usuario_actor, "id", None)
    titulo = "Contrato activado"
    cuerpo = f"Contrato '{contrato.nombre}' (#{contrato.id}) fue activado."
    url_destino = f"/contratos/{contrato.id}"
    datos = {"contrato_id": contrato.id}
    tipo = TipoEventoNotificacion.CONTRATO_ACTIVADO.value
    for grupo in (GRUPO_CONTRATOS, GRUPO_FINANZAS):
        _disparar_a_grupo(
            empresa=empresa,
            grupo=grupo,
            tipo=tipo,
            titulo=titulo,
            cuerpo=cuerpo,
            url_destino=url_destino,
            datos=datos,
            excluir_usuario_id=actor_id,
        )


def notificar_contrato_factura_generada(factura) -> None:
    """N19: Factura mensual generada -> notifica a finanzas."""
    contrato = getattr(factura, "contrato", None)
    empresa = getattr(contrato, "empresa_prestadora", None) if contrato else None
    contrato_id = getattr(contrato, "id", None)
    _disparar_a_grupo(
        empresa=empresa,
        grupo=GRUPO_FINANZAS,
        tipo=TipoEventoNotificacion.CONTRATO_FACTURA_GENERADA.value,
        titulo="Factura de contrato generada",
        cuerpo=f"Se genero la factura #{factura.id} del contrato #{contrato_id}.",
        url_destino=f"/contratos/{contrato_id}/facturas/{factura.id}" if contrato_id else f"/contratos/facturas/{factura.id}",
        datos={"factura_id": factura.id, "contrato_id": contrato_id},
        excluir_usuario_id=None,
    )


# ----- Retroalimentacion (N20) ----------------------------------------------
def notificar_retroalimentacion_plazo_vencido(retro) -> None:
    """N20: Plazo de retroalimentacion vencido -> notifica al tecnico responsable + operaciones."""
    otv3 = getattr(retro, "orden_trabajo_v3", None)
    if otv3 is None:
        return
    empresa = getattr(otv3, "empresa", None)
    tipo = TipoEventoNotificacion.RETROALIMENTACION_PLAZO_VENCIDO.value
    titulo = "Plazo de retroalimentacion vencido"
    cuerpo = f"OT V3 #{otv3.id}: el plazo de retroalimentacion vencio."
    url_destino = f"/ot-v3/{otv3.id}"
    datos = {"ot_v3_id": otv3.id, "retro_id": retro.id}

    tecnico_user = getattr(otv3, "tecnico_responsable", None)
    tecnico_user_id = getattr(tecnico_user, "id", None)
    _disparar_a_usuario_directo(
        user_id=tecnico_user_id,
        empresa=empresa,
        tipo=tipo,
        titulo=titulo,
        cuerpo=cuerpo,
        url_destino=url_destino,
        datos=datos,
        excluir_usuario_id=None,
    )
    _disparar_a_grupo(
        empresa=empresa,
        grupo=GRUPO_OPERACIONES,
        tipo=tipo,
        titulo=titulo,
        cuerpo=cuerpo,
        url_destino=url_destino,
        datos=datos,
        excluir_usuario_id=tecnico_user_id,
    )
