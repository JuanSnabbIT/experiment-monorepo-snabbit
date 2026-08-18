"""
Resolucion de etiquetas de plantillas — modulo neutral compartido por todos
los motores de renderizado (v1 legacy, v2 legacy, v2.9).

Contiene la logica generica de navegacion de rutas de datos (``_resolver_ruta``)
y las etiquetas especiales B2B (cotizaciones, cuotas de venta) que no son
exclusivas de ningun motor en particular — cualquier motor que necesite
interpolar ``[etiqueta]`` sobre un ``ContratoEmpresaCliente``/``ContratoTrabajador``
pasa por aqui.

Antes vivia repartido entre motor_plantillas.py (v1) y motor_plantillas_v2.py
(v2), con v2.9 dependiendo transitivamente de ambos. Extraido a este modulo
para que el motor v2.9 no dependa de los motores legacy.
"""

from __future__ import annotations

import re

from django.db import models

from contratos.venta_helpers import construir_resumen_venta_contrato

PATRON_ETIQUETA = re.compile(r'\[([a-z_.]+)\]')


# ---------------------------------------------------------------------------
# Resolucion generica de rutas (usada por v1, v2 y v2.9)
# ---------------------------------------------------------------------------

def resolver_valor_etiqueta(clave, contrato, etiquetas_map):
    """
    Dado una clave de etiqueta y un contrato, retorna el valor resuelto.
    etiquetas_map: dict {clave: EtiquetaPlantilla} pre-cargado.
    """
    # Etiquetas especiales calculadas para cotizaciones de venta
    if clave == 'cotizaciones_tabla':
        return _renderizar_cotizaciones_tabla(contrato)
    if clave == 'cantidad_cotizaciones':
        return str(contrato.cotizaciones_vinculadas.count())
    if clave == 'total_cotizaciones':
        return _calcular_total_cotizaciones(contrato)
    if clave == 'forma_pago_venta':
        return _obtener_forma_pago_venta(contrato)
    if clave == 'cantidad_cuotas_venta':
        return _obtener_cantidad_cuotas_venta(contrato)
    if clave == 'cuotas_venta_tabla':
        return _renderizar_cuotas_venta_tabla(contrato)
    if clave == 'cotizaciones_totales_convertidos':
        return _renderizar_totales_convertidos_cotizaciones(contrato)
    if clave == 'dolar_observado_cotizaciones':
        return _renderizar_dolar_observado_cotizaciones(contrato)

    etiqueta = etiquetas_map.get(clave)
    if not etiqueta or not etiqueta.origen_dato:
        # Fallback: si la clave contiene punto es una ruta directa (ej: empresa_prestadora.nombre)
        # usada en plantillas default. Intentar resolverla antes de devolver el literal.
        if '.' in clave:
            return _resolver_ruta(contrato, clave)
        return etiqueta.valor_default if etiqueta else f"[{clave}]"

    return _resolver_ruta(contrato, etiqueta.origen_dato, etiqueta.valor_default)


def _resolver_ruta(contrato, ruta, default=None):
    """
    Navega la ruta de datos desde el contrato.
    Rutas soportadas:
    - empresa_cliente.campo
    - empresa_prestadora.campo
    - contrato.campo
    - representante_cliente.campo
    - representante_proveedor.campo
    - items_comerciales[0].campo
    - calculado:vigencia_meses
    """
    if ruta.startswith("calculado:"):
        return _resolver_calculado(contrato, ruta)

    partes = ruta.split(".")
    obj = contrato

    for parte in partes:
        if parte == "contrato":
            continue
        elif parte == "empresa_cliente":
            obj = contrato.empresa_cliente
        elif parte == "empresa_prestadora":
            obj = contrato.empresa_prestadora
        elif parte == "representante_cliente":
            obj = _obtener_representante(contrato.empresa_cliente)
        elif parte == "representante_proveedor":
            obj = _obtener_representante(contrato.empresa_prestadora)
        elif "[" in parte:
            campo, idx = parte.split("[")
            idx = int(idx.rstrip("]"))
            qs = getattr(obj, campo, None)
            if qs is None:
                return default or ""
            items = list(qs.all()) if hasattr(qs, 'all') else qs
            obj = items[idx] if idx < len(items) else None
        else:
            obj = getattr(obj, parte, None)

        if obj is None:
            return default or ""

    valor = obj
    if callable(valor):
        valor = valor()

    return str(valor) if valor is not None else (default or "")


def _resolver_calculado(contrato, ruta):
    """Resuelve etiquetas calculadas."""
    tipo = ruta.split(":")[1]
    if tipo == "vigencia_meses":
        if contrato.fecha_inicio and contrato.fecha_fin:
            delta = contrato.fecha_fin - contrato.fecha_inicio
            return str(round(delta.days / 30))
        return ""
    return ""


def _obtener_representante(empresa):
    """Retorna el UsuarioEmpresa con grupo 'representante_legal' de la empresa."""
    from empresas.models import UsuarioEmpresa
    return (
        UsuarioEmpresa.objects
        .filter(
            sucursal__empresa=empresa,
            grupos__name="representante_legal",
            estado="1",
        )
        .select_related("usuario")
        .first()
    )


def _renderizar_cotizaciones_tabla(contrato):
    """Genera una tabla HTML con cotizaciones vinculadas y sus items."""
    cotizaciones = contrato.cotizaciones_vinculadas.all().order_by('numero_cotizacion')
    if not cotizaciones.exists():
        return ''

    resumen = construir_resumen_venta_contrato(contrato)
    detalles_por_id = {
        detalle["id"]: detalle for detalle in resumen.get("cotizaciones_detalle", [])
    }
    filas = []
    for cot in cotizaciones:
        detalle = detalles_por_id.get(cot.id, {})
        moneda_label = cot.get_tipo_moneda_display()
        total = cot.calcular_total_estimado
        filas.append(
            f'<tr><td colspan="4"><strong>'
            f'Cotización #{cot.numero_cotizacion} - {cot.nombre}'
            f'</strong> ({moneda_label} {total})</td></tr>'
        )
        if detalle.get("total_convertido") is not None:
            filas.append(
                f'<tr><td colspan="4">Total convertido a {detalle.get("moneda_contrato")}: '
                f'{detalle.get("total_convertido")}</td></tr>'
            )
        if detalle.get("dolar_observado") is not None:
            filas.append(
                f'<tr><td colspan="4">Dolar observado al cotizar: '
                f'{detalle.get("dolar_observado")}</td></tr>'
            )
        if detalle.get("valor_uf") is not None:
            filas.append(
                f'<tr><td colspan="4">Valor UF al cotizar: {detalle.get("valor_uf")}</td></tr>'
            )
        for item in cot.items.all():
            nombre = item.item_empresa.nombre if item.item_empresa else item.nombre
            filas.append(
                f'<tr><td>{nombre}</td>'
                f'<td>{item.cantidad}</td>'
                f'<td>{moneda_label} {item.precio_unitario}</td>'
                f'<td>{moneda_label} {item.costo_total}</td></tr>'
            )

    return (
        '<table><thead><tr>'
        '<th>Descripción</th><th>Cantidad</th><th>Precio Unit.</th><th>Total</th>'
        '</tr></thead><tbody>'
        + ''.join(filas)
        + '</tbody></table>'
    )


def _calcular_total_cotizaciones(contrato):
    """Retorna el total consolidado de todas las cotizaciones vinculadas."""
    resumen = construir_resumen_venta_contrato(contrato)
    return str(resumen["total_contrato"])


def _obtener_forma_pago_venta(contrato):
    resumen = construir_resumen_venta_contrato(contrato)
    return resumen.get("forma_pago_venta_label", "")


def _obtener_cantidad_cuotas_venta(contrato):
    resumen = construir_resumen_venta_contrato(contrato)
    return str(len(resumen.get("cuotas_venta_resumen") or []))


def _renderizar_cuotas_venta_tabla(contrato):
    resumen = construir_resumen_venta_contrato(contrato)
    cuotas = resumen.get("cuotas_venta_resumen") or []
    if not cuotas:
        return ""
    filas = [
        (
            f"<tr><td>{cuota.get('orden')}</td><td>{cuota.get('porcentaje')}%</td>"
            f"<td>{cuota.get('hito_pago_label') or cuota.get('hito_pago_descripcion') or 'Sin definir'}</td>"
            f"<td>{cuota.get('monto')} {resumen.get('moneda')}</td></tr>"
        )
        for cuota in cuotas
    ]
    return (
        "<table><thead><tr>"
        "<th>Cuota</th><th>Porcentaje</th><th>Hito</th><th>Monto</th>"
        "</tr></thead><tbody>"
        + "".join(filas)
        + "</tbody></table>"
    )


def _renderizar_totales_convertidos_cotizaciones(contrato):
    resumen = construir_resumen_venta_contrato(contrato)
    detalles = resumen.get("cotizaciones_detalle") or []
    if not detalles:
        return ""
    lineas = [
        (
            f"Cotizacion #{detalle.get('numero_cotizacion') or detalle.get('id')}: "
            f"{detalle.get('total_convertido')} {detalle.get('moneda_contrato')}"
        )
        for detalle in detalles
        if detalle.get("total_convertido") is not None
    ]
    return "<br/>".join(lineas)


def _renderizar_dolar_observado_cotizaciones(contrato):
    resumen = construir_resumen_venta_contrato(contrato)
    detalles = resumen.get("cotizaciones_detalle") or []
    if not detalles:
        return ""
    lineas = [
        (
            f"Cotizacion #{detalle.get('numero_cotizacion') or detalle.get('id')}: "
            f"{detalle.get('dolar_observado')}"
        )
        for detalle in detalles
        if detalle.get("dolar_observado") is not None
    ]
    return "<br/>".join(lineas)


# ---------------------------------------------------------------------------
# Resolucion polimorfica (via adaptador) — usada por v2 y v2.9
# ---------------------------------------------------------------------------

# Claves que se resuelven con logica especial B2B (cotizaciones, cuotas, etc.)
CLAVES_ESPECIALES_B2B = {
    "cotizaciones_tabla",
    "cantidad_cotizaciones",
    "total_cotizaciones",
    "forma_pago_venta",
    "cantidad_cuotas_venta",
    "cuotas_venta_tabla",
    "cotizaciones_totales_convertidos",
    "dolar_observado_cotizaciones",
}


def es_adaptador_b2b(adaptador) -> bool:
    from contratos.models import ContratoEmpresaCliente
    return isinstance(adaptador.instancia, ContratoEmpresaCliente)


def resolver_ruta_polimorfica(adaptador, ruta: str, default=None) -> str:
    """
    Intenta resolver primero con el adaptador. Si retorna NOT_HANDLED y
    la instancia es B2B, hace fallback a ``_resolver_ruta`` generico.
    """
    from contratos.adaptadores import NOT_HANDLED

    resultado = adaptador.resolver_ruta_extendida(ruta, default)
    if resultado is not NOT_HANDLED:
        return resultado if resultado is not None else (default or "")

    if es_adaptador_b2b(adaptador):
        return _resolver_ruta(adaptador.instancia, ruta, default)

    return default or ""


def resolver_valor_etiqueta_v2(clave: str, adaptador, etiquetas_map: dict) -> str:
    """Equivalente polimorfico de ``resolver_valor_etiqueta``."""
    from contratos.adaptadores import NOT_HANDLED

    # Etiquetas especiales B2B → solo aplican si la instancia es ContratoEmpresaCliente.
    if clave in CLAVES_ESPECIALES_B2B:
        if es_adaptador_b2b(adaptador):
            return resolver_valor_etiqueta(clave, adaptador.instancia, etiquetas_map)
        # Para trabajador, las claves comerciales no aplican: vacio.
        return ""

    etiqueta = etiquetas_map.get(clave)

    if not etiqueta or not etiqueta.origen_dato:
        # Fallback 1: ruta directa si la clave ya tiene punto.
        if "." in clave:
            return resolver_ruta_polimorfica(adaptador, clave)
        # Fallback 2: intentar el adaptador directamente (honra _ALIAS en AdaptadorContratoTrabajador
        # y cualquier alias que el adaptador conozca, sin requerir EtiquetaPlantilla en BD).
        resultado_adaptador = adaptador.resolver_ruta_extendida(clave)
        if resultado_adaptador is not NOT_HANDLED:
            return str(resultado_adaptador) if resultado_adaptador is not None else ""
        return etiqueta.valor_default if etiqueta else f"[{clave}]"

    return resolver_ruta_polimorfica(adaptador, etiqueta.origen_dato, etiqueta.valor_default)


CONDICIONES_TRABAJADOR = {
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
    "si_lugar_trabajo":     lambda c: bool((c.lugar_trabajo or "").strip()),
}
