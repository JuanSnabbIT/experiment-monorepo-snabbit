import re

from django.db import models

from contratos.models import (
    ContratoEmpresaCliente,
    EtiquetaPlantilla,
    SeccionPlantilla,
    SeccionContratoGenerada,
)
from contratos.venta_helpers import construir_resumen_venta_contrato

PATRON_ETIQUETA = re.compile(r'\[([a-z_]+)\]')


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
            f'Cotizaci\u00f3n #{cot.numero_cotizacion} - {cot.nombre}'
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
        '<th>Descripci\u00f3n</th><th>Cantidad</th><th>Precio Unit.</th><th>Total</th>'
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


def renderizar_seccion(contenido_template, contrato, etiquetas_map):
    """
    Reemplaza todas las [etiquetas] en el texto por valores reales.
    Retorna el texto renderizado.
    """
    def reemplazo(match):
        clave = match.group(1)
        return resolver_valor_etiqueta(clave, contrato, etiquetas_map)

    return PATRON_ETIQUETA.sub(reemplazo, contenido_template)


def generar_secciones_contrato(contrato):
    """
    Genera SeccionContratoGenerada para cada sección de la plantilla del contrato.
    No sobreescribe secciones editadas manualmente.
    Retorna lista de SeccionContratoGenerada creadas/actualizadas.
    """
    plantilla = contrato.plantilla
    if not plantilla:
        return []

    empresa = contrato.empresa_prestadora
    etiquetas = EtiquetaPlantilla.objects.filter(
        models.Q(empresa_prestadora__isnull=True)
        | models.Q(empresa_prestadora=empresa)
    )
    # Empresa-específica tiene prioridad sobre global (si misma clave)
    etiquetas_map = {}
    for e in etiquetas:
        if e.clave not in etiquetas_map or e.empresa_prestadora is not None:
            etiquetas_map[e.clave] = e

    secciones = plantilla.secciones.all().order_by("orden")
    resultado = []

    for seccion in secciones:
        existente = SeccionContratoGenerada.objects.filter(
            contrato=contrato,
            seccion_plantilla=seccion,
        ).first()

        if existente and existente.fue_editado_manualmente:
            resultado.append(existente)
            continue

        contenido = renderizar_seccion(seccion.contenido_template, contrato, etiquetas_map)

        if existente:
            existente.contenido_renderizado = contenido
            existente.titulo = seccion.titulo
            existente.orden = seccion.orden
            existente.save()
            resultado.append(existente)
        else:
            nueva = SeccionContratoGenerada.objects.create(
                contrato=contrato,
                seccion_plantilla=seccion,
                titulo=seccion.titulo,
                contenido_renderizado=contenido,
                orden=seccion.orden,
            )
            resultado.append(nueva)

    return resultado
