# Mapea el nombre “clásico” del modelo (string) a un dict { campo_interno: “Etiqueta legible” }
# Para cada modelo que incluimos, debemos poner aquí los campos por los que nos interese generar detalle.
FIELDS_MAPPING = {
    'OrdenDeTrabajo': {
        'estado': 'Estado de la orden',
        'descripcion': 'Descripción de la orden',
        'fecha_inicio_ot': 'Fecha de inicio',
        'fecha_finalizacion_ot': 'Fecha de finalización',
        'prioridad': 'Prioridad',
        'notas_internas': 'Notas internas',
        'solicitante_empresa_id': 'Solicitante (empresa)',
        'responsable_empresa_id': 'Responsable (empresa)',
    },
    'AdjuntoDeOrden': {
        'tipo': 'Tipo de adjunto',
        'descripcion': 'Descripción del adjunto',
    },
    'DetalleTrabajo': {
        'nombre': 'Nombre del detalle',
        'descripcion': 'Descripción del detalle',
        'estado': 'Estado del trabajo',
        'tecnico_asignado': 'Técnico asignado',
        'insumo_id': 'ID de Insumo',
        'content_type_id': 'Tipo de trabajo',
        'trabajo_id': 'ID del trabajo',
    },
    'UsuarioAsignadoOT': {
        'usuario_empresa': 'Usuario interno asignado',
        'usuario_externo': 'Usuario externo asignado',
        'correo_usuario_externo': 'Correo usuario externo',
    },
    'SeguimientoDetalleTrabajo': {
        'tipo': 'Tipo de seguimiento',
        'comentario': 'Comentario',
        'usuario': 'Usuario responsable',
    },
    'HistorialCambiosOrden': {
        'estado_anterior': 'Estado anterior',
        'estado_actual': 'Estado actual',
        'comentario': 'Comentario del cambio',
    },
    'DetalleGastoRendicionOT': {
        'categoria': 'Categoría de gasto',
        'detalle': 'Detalle del gasto',
        'cantidad': 'Cantidad',
        'monto_unitario': 'Monto unitario',
        'monto_total': 'Monto total',
        'fecha_gasto': 'Fecha del gasto',
    },
}


# Función auxiliar para obtener un nombre humano (o “acción modelo”) según el string del modelo.
def get_accion_modelo(model_name: str) -> str:
    nombres = {
        'OrdenDeTrabajo': 'Orden de Trabajo',
        'AdjuntoDeOrden': 'Adjunto de Orden',
        'DetalleTrabajo': 'Detalle de Trabajo',
        'UsuarioAsignadoOT': 'Usuario Asignado',
        'SeguimientoDetalleTrabajo': 'Seguimiento Detalle',
        'HistorialCambiosOrden': 'Historial de Cambios',
        'DetalleGastoRendicionOT': 'Detalle Gasto Rendición',
    }
    return nombres.get(model_name, model_name)


# =========================
# Validación de Cierre OT
# =========================
from django.db import transaction
from typing import Dict, Any
from django.contrib.contenttypes.models import ContentType

from .models import (
    OrdenDeTrabajo,
    DetalleTrabajo,
    SeguimientoDetalleTrabajo,
    HistorialCambiosOrden,
    AdjuntoDeOrden,
    DetalleGastoRendicionOT,
    CierreAdministrativoOT,
)

from cotizaciones.models import Cotizacion
from visitas.models import VisitaSoporte
from bodegas.models import Compra, GuiaSalida, ItemEnCompra
from retroalimentacion.models import Retroalimentacion


def _analizar_detalle_cotizacion(cot: Cotizacion) -> Dict[str, Any]:
    estado = getattr(cot, "estado", "")
    facturada = bool(getattr(cot, "fecha_facturacion", None))
    comentario = None
    if not facturada:
        comentario = (
            "Cotización sin fecha de facturación. Revisar emisión de factura/boleta."
        )
    return {
        "tipo": "cotizacion",
        "id": cot.id,
        "numero": getattr(cot, "numero_cotizacion", None),
        "estado": estado,
        "facturada": facturada,
        "comentario": comentario,
    }


def _analizar_detalle_visita(orden: OrdenDeTrabajo) -> Dict[str, Any]:
    retro = Retroalimentacion.objects.filter(orden_trabajo_id=orden.id).first()
    tiene = bool(retro)
    total_preguntas = retro.retroalimentacion_aplicada.count() if retro else 0
    promedio = None
    if total_preguntas:
        vals = [float(r.cantidad_estrellas or 0) for r in retro.retroalimentacion_aplicada.all()]
        if vals:
            promedio = round(sum(vals) / len(vals), 2)
    comentario = None if tiene and total_preguntas else "Sin retroalimentación registrada o sin respuestas."
    return {
        "tipo": "visitasoporte",
        "tiene_retroalimentacion": tiene,
        "preguntas_respondidas": total_preguntas,
        "promedio_estrellas": promedio,
        "comentario": comentario,
    }


def _analizar_detalle_compra(compra: Compra, insumo: GuiaSalida | None) -> Dict[str, Any]:
    estado_ok = getattr(compra, "estado", "-") == "1"
    items_count = ItemEnCompra.objects.filter(compra=compra).count()
    guia_ok = None
    if insumo:
        guia_ok = getattr(insumo, "estado", "P") in ("E", "T")
    comentario = []
    if not estado_ok:
        comentario.append("Compra no está en estado 'Completada'.")
    if items_count == 0:
        comentario.append("Compra sin ítems asociados.")
    if insumo and guia_ok is False:
        comentario.append("Guía de salida no entregada/terminada.")
    return {
        "tipo": "compra",
        "id": compra.id,
        "codigo": compra.codigo,
        "estado_completada": estado_ok,
        "items": items_count,
        "guia_estado_valida": guia_ok,
        "comentario": "; ".join(comentario) if comentario else None,
    }


def validar_cierre_ot(orden_id: int) -> Dict[str, Any]:
    orden = (
        OrdenDeTrabajo.objects.select_related(
            "empresa",
            "cliente",
            "responsable_empresa__usuario",
            "solicitante_empresa__usuario",
        )
        .prefetch_related(
            "usuarioasignadoot_set__usuario_empresa__usuario",
            "detalletrabajo_set__tecnico_asignado__usuario",
            "historial__usuario__usuario",
            "adjuntodeorden_set",
            "detallegastorendicionot_set__categoria",
        )
        .get(id=orden_id)
    )

    resultado: Dict[str, Any] = {
        "version": 1,
        "orden": {
            "id": orden.id,
            "empresa": orden.empresa.nombre,
            "cliente": orden.cliente.nombre,
            "estado": orden.estado,
        },
        "detalles": [],
        "validaciones": {
            "cotizacion": True,
            "visitasoporte": True,
            "compra": True,
        },
        "observaciones": [],
        "puede_cerrar": False,
        "forzado": False,
    }

    for dt in orden.detalletrabajo_set.all():
        if not dt.content_type or not dt.trabajo_id:
            resultado["observaciones"].append(
                f"Detalle #{dt.id} sin trabajo relacionado; revisar."
            )
            continue

        tipo = dt.content_type.model
        if tipo == "cotizacion":
            try:
                cot = Cotizacion.objects.get(id=dt.trabajo_id)
                info = _analizar_detalle_cotizacion(cot)
                resultado["detalles"].append({"detalle": dt.id, **info})
                if not info["facturada"]:
                    resultado["validaciones"]["cotizacion"] = False
                    if info.get("comentario"):
                        resultado["observaciones"].append(info["comentario"])
            except Cotizacion.DoesNotExist:
                resultado["validaciones"]["cotizacion"] = False
                resultado["observaciones"].append(
                    f"Detalle #{dt.id}: cotización no encontrada (id {dt.trabajo_id})."
                )

        elif tipo == "visitasoporte":
            info = _analizar_detalle_visita(orden)
            resultado["detalles"].append({"detalle": dt.id, **info})
            if not (info["tiene_retroalimentacion"] and info["preguntas_respondidas"] > 0):
                resultado["validaciones"]["visitasoporte"] = False
                if info.get("comentario"):
                    resultado["observaciones"].append(info["comentario"])

        elif tipo == "compra":
            try:
                compra = Compra.objects.get(id=dt.trabajo_id)
                info = _analizar_detalle_compra(compra, dt.insumo)
                resultado["detalles"].append({"detalle": dt.id, **info})
                if not (info["estado_completada"] and info["items"] > 0 and (info["guia_estado_valida"] in (True, None))):
                    resultado["validaciones"]["compra"] = False
                    if info.get("comentario"):
                        resultado["observaciones"].append(info["comentario"])
            except Compra.DoesNotExist:
                resultado["validaciones"]["compra"] = False
                resultado["observaciones"].append(
                    f"Detalle #{dt.id}: compra no encontrada (id {dt.trabajo_id})."
                )

    resultado["puede_cerrar"] = all(resultado["validaciones"].values())
    return resultado


@transaction.atomic
def cerrar_ot(orden_id: int, usuario_empresa=None, comentario: str | None = None, forzar: bool = False) -> CierreAdministrativoOT:
    orden = OrdenDeTrabajo.objects.get(id=orden_id)
    existente = getattr(orden, "cierre_administrativo", None)
    if existente and not forzar:
        raise ValueError("La OT ya posee un cierre administrativo. Use forzar=True para sobrescribir.")

    resultado = validar_cierre_ot(orden_id)
    # Asegurar metacampos
    if "version" not in resultado:
        resultado["version"] = 1
    resultado["forzado"] = bool(forzar)
    cierre, _ = CierreAdministrativoOT.objects.update_or_create(
        orden=orden,
        defaults={
            "usuario": usuario_empresa,
            "valido": bool(resultado.get("puede_cerrar")),
            "resultado": resultado,
            "comentario": comentario,
        },
    )
    return cierre


# ==============================
# Utilidad para Insumo disponible
# ==============================
def obtener_insumo_disponible(bodega_id: int, usuario_empresa_id: int, estados_validos: tuple[str, ...] = ("E", "T")) -> GuiaSalida:
    """
    Retorna una GuiaSalida válida de la bodega indicada que no esté ya
    asociada como insumo en algún DetalleTrabajo. Si no existe, crea una nueva
    con estado "E".

    Parámetros
    - bodega_id: ID de la bodega donde buscar/crear la guía
    - usuario_empresa_id: ID del UsuarioEmpresa que quedará como creador (creado_por)
    - estados_validos: estados permitidos para considerar una guía "válida"

    Nota: usa IDs para evitar problemas de instancias en contextos con recargas.
    """
    usadas = DetalleTrabajo.objects.exclude(insumo__isnull=True).values_list("insumo_id", flat=True)
    guia = (
        GuiaSalida.objects.filter(bodega_id=bodega_id, estado__in=estados_validos)
        .exclude(id__in=list(usadas))
        .order_by("id")
        .first()
    )
    if not guia:
        guia = GuiaSalida.objects.create(bodega_id=bodega_id, creado_por_id=usuario_empresa_id, estado="E")
    return guia
