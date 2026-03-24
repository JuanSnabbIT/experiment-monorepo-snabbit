import re

from django.db import models

from contratos.models import (
    ContratoEmpresaCliente,
    EtiquetaPlantilla,
    SeccionPlantilla,
    SeccionContratoGenerada,
)

PATRON_ETIQUETA = re.compile(r'\[([a-z_]+)\]')


def resolver_valor_etiqueta(clave, contrato, etiquetas_map):
    """
    Dado una clave de etiqueta y un contrato, retorna el valor resuelto.
    etiquetas_map: dict {clave: EtiquetaPlantilla} pre-cargado.
    """
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
