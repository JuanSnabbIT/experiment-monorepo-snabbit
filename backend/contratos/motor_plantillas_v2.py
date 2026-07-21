"""
Motor de plantillas v2 — polimorfico via adaptadores.

Funciona con cualquier objeto que implemente ``IContratoBase``
(``AdaptadorContratoB2B``, ``AdaptadorContratoTrabajador``).

Estrategia:

* Para etiquetas especiales B2B (cotizaciones_tabla, cuotas_venta_tabla,
  totales convertidos, etc.) delega al motor v1 mediante
  ``resolver_valor_etiqueta`` cuando la instancia es ``ContratoEmpresaCliente``.
* Para etiquetas con ``origen_dato`` definido, intenta primero
  ``adaptador.resolver_ruta_extendida``. Si retorna ``NOT_HANDLED`` y la
  instancia es B2B, hace fallback a ``_resolver_ruta`` v1. Si la instancia
  es trabajador, retorna el ``valor_default`` o cadena vacia.

El motor v1 no se modifica.
"""

from __future__ import annotations

from django.db import models

from contratos.models import EtiquetaPlantilla, SeccionContratoGenerada, TIPOS_BLOQUE_DINAMICO
from contratos.adaptadores import IContratoBase, NOT_HANDLED
from contratos.motor_plantillas import (
    PATRON_ETIQUETA,
    _resolver_ruta,
    resolver_valor_etiqueta as resolver_valor_etiqueta_v1,
)


# Claves que el motor v1 maneja con logica especial (cotizaciones, cuotas, etc.)
_CLAVES_ESPECIALES_B2B = {
    "cotizaciones_tabla",
    "cantidad_cotizaciones",
    "total_cotizaciones",
    "forma_pago_venta",
    "cantidad_cuotas_venta",
    "cuotas_venta_tabla",
    "cotizaciones_totales_convertidos",
    "dolar_observado_cotizaciones",
}


def _es_adaptador_b2b(adaptador: IContratoBase) -> bool:
    from contratos.models import ContratoEmpresaCliente
    return isinstance(adaptador.instancia, ContratoEmpresaCliente)


def _resolver_ruta_v2(adaptador: IContratoBase, ruta: str, default=None) -> str:
    """
    Intenta resolver primero con el adaptador. Si retorna NOT_HANDLED y
    la instancia es B2B, hace fallback a ``_resolver_ruta`` v1.
    """
    resultado = adaptador.resolver_ruta_extendida(ruta, default)
    if resultado is not NOT_HANDLED:
        return resultado if resultado is not None else (default or "")

    if _es_adaptador_b2b(adaptador):
        return _resolver_ruta(adaptador.instancia, ruta, default)

    return default or ""


def resolver_valor_etiqueta_v2(clave: str, adaptador: IContratoBase, etiquetas_map: dict) -> str:
    """Equivalente polimorfico de ``resolver_valor_etiqueta`` del motor v1."""

    # Etiquetas especiales B2B → solo aplican si la instancia es ContratoEmpresaCliente.
    if clave in _CLAVES_ESPECIALES_B2B:
        if _es_adaptador_b2b(adaptador):
            return resolver_valor_etiqueta_v1(clave, adaptador.instancia, etiquetas_map)
        # Para trabajador, las claves comerciales no aplican: vacio.
        return ""

    etiqueta = etiquetas_map.get(clave)

    if not etiqueta or not etiqueta.origen_dato:
        # Fallback 1: ruta directa si la clave ya tiene punto.
        if "." in clave:
            return _resolver_ruta_v2(adaptador, clave)
        # Fallback 2: intentar el adaptador directamente (honra _ALIAS en AdaptadorContratoTrabajador
        # y cualquier alias que el adaptador conozca, sin requerir EtiquetaPlantilla en BD).
        resultado_adaptador = adaptador.resolver_ruta_extendida(clave)
        if resultado_adaptador is not NOT_HANDLED:
            return str(resultado_adaptador) if resultado_adaptador is not None else ""
        return etiqueta.valor_default if etiqueta else f"[{clave}]"

    return _resolver_ruta_v2(adaptador, etiqueta.origen_dato, etiqueta.valor_default)


def renderizar_seccion_v2(contenido_template: str, adaptador: IContratoBase, etiquetas_map: dict) -> str:
    """Reemplaza todas las ``[etiquetas]`` del texto usando el adaptador."""

    def _reemplazo(match):
        clave = match.group(1)
        valor = resolver_valor_etiqueta_v2(clave, adaptador, etiquetas_map)
        return str(valor) if valor is not None else ""

    return PATRON_ETIQUETA.sub(_reemplazo, contenido_template or "")


_CONDICIONES_TRABAJADOR = {
    "siempre":              lambda c: True,
    "solo_plazo_fijo":      lambda c: c.tipo_contrato == "plazo_fijo",
    "solo_indefinido":      lambda c: c.tipo_contrato == "indefinido",
    "solo_reemplazo":       lambda c: c.tipo_contrato == "reemplazo",
    "si_bono_movilizacion": lambda c: bool(getattr(c, "bono_movilizacion_activo", False)),
    "si_bono_colacion":     lambda c: bool(getattr(c, "bono_colacion_activo", False)),
    "si_grupo_turno":       lambda c: bool(c.grupo_turno_id or c.grupo_turno_snapshot),
    "si_gratificacion":     lambda c: c.tipo_gratificacion != "no_aplica",
    "si_jornada_parcial":   lambda c: c.jornada == "parcial",
    "si_banco":             lambda c: bool(c.usuario_empresa and c.usuario_empresa.banco),
    "si_isapre":            lambda c: bool(
        c.usuario_empresa and c.usuario_empresa.sistema_salud == "isapre"
    ),
}


def _evaluar_condicion_aparicion(condicion, adaptador: IContratoBase) -> bool:
    """
    Retorna True si la sección debe incluirse.
    - None o 'siempre' → True (siempre incluir).
    - Condición desconocida → True (fail-safe: no omitir por error).
    - Solo evalúa condiciones para ContratoTrabajador; B2B siempre True.
    """
    if not condicion or condicion == "siempre":
        return True
    if _es_adaptador_b2b(adaptador):
        return True
    fn = _CONDICIONES_TRABAJADOR.get(condicion)
    if fn is None:
        return True
    try:
        return bool(fn(adaptador.instancia))
    except Exception:
        return True


def generar_secciones_v2(adaptador: IContratoBase) -> list:
    """
    Genera o actualiza ``SeccionContratoGenerada`` para cada
    ``SeccionPlantilla`` de la plantilla del contrato.

    Respeta ``fue_editado_manualmente``. Reutiliza la misma logica que el
    motor v1 pero usando el adaptador para acceso al ORM polimorfico.

    Retorna la lista de secciones generadas.
    """
    plantilla = adaptador.plantilla
    if not plantilla:
        return []

    empresa = adaptador.empresa_prestadora
    etiquetas = EtiquetaPlantilla.objects.filter(
        models.Q(empresa_prestadora__isnull=True)
        | models.Q(empresa_prestadora=empresa)
    )
    etiquetas_map: dict = {}
    for e in etiquetas:
        # Empresa-especifica tiene prioridad sobre global.
        if e.clave not in etiquetas_map or e.empresa_prestadora is not None:
            etiquetas_map[e.clave] = e

    secciones = plantilla.secciones.all().order_by("orden")
    qs_existentes = adaptador.secciones_generadas_qs().select_related("seccion_plantilla")
    existentes_por_plantilla = {s.seccion_plantilla_id: s for s in qs_existentes}

    resultado: list[SeccionContratoGenerada] = []

    for seccion in secciones:
        # Evaluar condición de aparición antes de renderizar
        condicion = getattr(seccion, "condicion_aparicion", None)
        if not _evaluar_condicion_aparicion(condicion, adaptador):
            # Si existía una SeccionContratoGenerada anterior, eliminarla
            existente_a_eliminar = existentes_por_plantilla.get(seccion.id)
            if existente_a_eliminar:
                existente_a_eliminar.delete()
            continue

        existente = existentes_por_plantilla.get(seccion.id)

        if existente and existente.fue_editado_manualmente:
            resultado.append(existente)
            continue

        # Tipos estructurales sin cuerpo de texto.
        if seccion.tipo in ("titulo", "subtitulo"):
            contenido = ""
        elif seccion.tipo == "salto_pagina":
            contenido = '<div style="page-break-after:always;border-top:1px dashed #d4d4d8;margin:12px 0;text-align:center"></div>'
        elif seccion.tipo in TIPOS_BLOQUE_DINAMICO:
            # Bloques dinámicos: su contenido se genera al emitir el contrato, no desde template.
            contenido = ""
        else:
            contenido = renderizar_seccion_v2(seccion.contenido_template, adaptador, etiquetas_map)

        if existente:
            existente.contenido_renderizado = contenido
            existente.titulo = seccion.titulo
            existente.orden = seccion.orden
            existente.save()
            resultado.append(existente)
        else:
            nueva = adaptador.crear_seccion_generada(
                seccion_plantilla=seccion,
                titulo=seccion.titulo,
                contenido_renderizado=contenido,
                orden=seccion.orden,
            )
            resultado.append(nueva)

    if plantilla.version:
        adaptador.set_plantilla_version_usada(str(plantilla.version))

    return resultado
