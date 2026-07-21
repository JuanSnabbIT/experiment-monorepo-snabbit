import json
import os
import base64
import binascii

from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone

from django.template.loader import render_to_string
from core.tasks import send_email_task
from core.pdf.canvas_utils import get_logo_empresa_b64

from .funciones import generar_contrato_en_memoria, generar_contrato_desde_plantilla
from .models import (
    ContratoCondicionEspecial,
    ContratoEmpresaCliente,
    ContratoServicio,
    AcuerdoConfidencialidadContrato,
    EnvioContratoAprobacion,
    EnvioContratoFirmaUsuario,
)
from .serializers import ContratoEmpresaClienteSerializer
from .venta_helpers import normalizar_moneda


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def obtener_destinatario_principal(contrato: ContratoEmpresaCliente):
    return contrato.destinatario_principal


def obtener_envio_aprobacion_pendiente(contrato: ContratoEmpresaCliente):
    return (
        contrato.envios_aprobacion.filter(
            respondido=False,
            deprecado=False,
        )
        .order_by("-fecha_envio", "-id")
        .first()
    )


def obtener_envio_firma_pendiente(contrato: ContratoEmpresaCliente):
    return (
        EnvioContratoFirmaUsuario.objects.filter(
            usuario__contrato=contrato,
            firmado=False,
        )
        .order_by("-fecha_envio", "-id")
        .first()
    )


def obtener_ultimo_envio_firma(contrato: ContratoEmpresaCliente):
    return (
        EnvioContratoFirmaUsuario.objects.filter(usuario__contrato=contrato)
        .order_by("-fecha_envio", "-id")
        .first()
    )


def construir_snapshot_contrato(contrato: ContratoEmpresaCliente, request=None):
    contrato.refresh_from_db()
    snapshot = ContratoEmpresaClienteSerializer(
        contrato,
        context={"request": request} if request else {},
    ).data
    # JSONField no acepta datetime/date nativos dentro de estructuras anidadas.
    return json.loads(json.dumps(snapshot, cls=DjangoJSONEncoder))


def firma_prestadora_disponible(contrato: ContratoEmpresaCliente):
    return bool(getattr(contrato.empresa_prestadora, "firma_empresa", None))


def validar_firma_imagen(firma_value):
    if not isinstance(firma_value, str) or not firma_value.startswith("data:image/"):
        raise ValueError("La firma debe enviarse como una imagen en formato data URL.")
    if ";base64," not in firma_value:
        raise ValueError("La firma debe incluir una imagen codificada en base64.")

    encoded_value = firma_value.split(";base64,", 1)[1]
    try:
        base64.b64decode(encoded_value, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("La firma no contiene una imagen base64 valida.") from exc

    return firma_value


def _format_money(value):
    try:
        return f"{float(value):,.0f}"
    except (TypeError, ValueError):
        return "0"


def _normalize_contract_text_lines(value):
    if not value:
        return []
    lines = []
    for raw_line in str(value).splitlines():
        line = raw_line.strip().lstrip("-*").strip()
        if line:
            lines.append(line)
    return lines


def _scope_lines_from_payload_items(items, modo):
    lines = []
    for item in items or []:
        if item.get("modo") != modo:
            continue
        caracteristica = item.get("caracteristica") or {}
        nombre = caracteristica.get("nombre")
        descripcion = caracteristica.get("descripcion")
        if not nombre:
            continue
        lines.append(f"{nombre}: {descripcion}" if descripcion else nombre)
    return lines


def _build_plan_componentes_from_payload(item_payload):
    componentes = item_payload.get("snapshot_componentes_plan") or []
    if componentes:
        return componentes

    plan_payload = item_payload.get("plan_version") or item_payload.get("servicio_generico") or {}
    detalles = plan_payload.get("detalles_servicio") or []
    componentes_fallback = []
    for index, detalle in enumerate(detalles):
        servicio = detalle.get("servicio_version") or {}
        componentes_fallback.append(
            {
                "nombre": servicio.get("nombre"),
                "descripcion": servicio.get("descripcion"),
                "categoria_label": servicio.get("categoria_label"),
                "obligatorio": detalle.get("obligatorio"),
                "cantidad_default": detalle.get("cantidad_default"),
                "veces_por_mes_default": detalle.get("veces_por_mes_default"),
                "orden": detalle.get("orden", index),
                "caracteristicas": servicio.get("caracteristicas") or [],
                "alcance_caracteristicas": servicio.get("alcance_caracteristicas") or [],
                "incluye": servicio.get("incluye"),
                "no_incluye": servicio.get("no_incluye"),
                "clausulas_especiales": servicio.get("clausulas_especiales"),
            }
        )

    if componentes_fallback:
        return componentes_fallback

    for index, servicio in enumerate(plan_payload.get("servicios") or []):
        componentes_fallback.append(
            {
                "nombre": servicio.get("nombre"),
                "descripcion": servicio.get("descripcion"),
                "categoria_label": servicio.get("categoria_label"),
                "obligatorio": None,
                "cantidad_default": None,
                "veces_por_mes_default": servicio.get("veces_por_mes_default"),
                "orden": index,
                "caracteristicas": servicio.get("caracteristicas") or [],
                "alcance_caracteristicas": servicio.get("alcance_caracteristicas") or [],
                "incluye": servicio.get("incluye"),
                "no_incluye": servicio.get("no_incluye"),
                "clausulas_especiales": servicio.get("clausulas_especiales"),
            }
        )
    return componentes_fallback


def _append_plan_component_lines(lineas, item_payload):
    componentes = _build_plan_componentes_from_payload(item_payload)
    for componente in componentes:
        nombre = componente.get("nombre") or "Servicio incluido"
        lineas.append(f"  Servicio incluido: {nombre}")
        descripcion = componente.get("descripcion")
        if descripcion:
            lineas.append(f"    Descripcion: {descripcion}")

        incluye = _normalize_contract_text_lines(componente.get("incluye"))
        if not incluye:
            incluye = _scope_lines_from_payload_items(
                componente.get("alcance_caracteristicas"), "incluye"
            )
        for include_line in incluye:
            lineas.append(f"    Incluye: {include_line}")

        no_incluye = _normalize_contract_text_lines(componente.get("no_incluye"))
        if not no_incluye:
            no_incluye = _scope_lines_from_payload_items(
                componente.get("alcance_caracteristicas"), "no_incluye"
            )
        for exclude_line in no_incluye:
            lineas.append(f"    No incluye: {exclude_line}")

        clausulas = componente.get("clausulas_especiales")
        if clausulas:
            lineas.append(f"    Clausulas: {clausulas}")


def _build_service_lines_from_payload(contrato_payload):
    lineas = []
    cotizaciones_vinculadas = contrato_payload.get("cotizaciones_vinculadas") or []
    for item in contrato_payload.get("items_comerciales") or []:
        nombre = item.get("snapshot_nombre") or item.get("nombre") or "Servicio"
        cantidad = item.get("cantidad") or 0
        precio = item.get("precio_unitario_contratado") or 0
        forma_pago = item.get("forma_pago") or contrato_payload.get("forma_pago_contractual") or "mensual"
        subtotal = (
            item.get("total_pago_unico")
            if forma_pago == "pago_unico"
            else item.get("total_anual")
            if forma_pago == "anual"
            else item.get("total_mensual")
        )
        lineas.append(
            f"{nombre} | Cantidad: {cantidad} | Precio unitario: ${_format_money(precio)}"
            f" | Subtotal: ${_format_money(subtotal)}"
        )
        visitas = item.get("snapshot_num_visitas_mensuales")
        if visitas:
            lineas.append(f"  Visitas presenciales/mes: {visitas}")
        for label, value in (
            ("Incluye", item.get("snapshot_incluye")),
            ("No incluye", item.get("snapshot_no_incluye")),
            ("Clausulas", item.get("snapshot_clausulas")),
        ):
            if value:
                lineas.append(f"  {label}: {value}")
        if item.get("tipo_origen") == "plan":
            _append_plan_component_lines(lineas, item)

    if lineas:
        return lineas

    if cotizaciones_vinculadas:
        resumen_comercial = contrato_payload.get("resumen_comercial") or {}
        for cotizacion in cotizaciones_vinculadas:
            numero = cotizacion.get("numero_cotizacion") or cotizacion.get("id") or "s/n"
            nombre = cotizacion.get("nombre") or "Cotizacion"
            moneda = (
                cotizacion.get("tipo_moneda_label")
                or cotizacion.get("tipo_moneda")
                or contrato_payload.get("moneda_cobro")
                or "CLP"
            )
            total = cotizacion.get("total_estimado") or 0
            total_convertido = cotizacion.get("total_convertido")
            moneda_contrato = (
                cotizacion.get("moneda_contrato")
                or resumen_comercial.get("moneda")
                or contrato_payload.get("moneda_cobro")
                or "CLP"
            )
            dolar_observado = cotizacion.get("dolar_observado")
            valor_uf = cotizacion.get("valor_uf")
            if cotizacion.get("tiene_items_moneda_mixta"):
                monedas_items = ", ".join(cotizacion.get("monedas_items") or [])
                lineas.append(
                    "  Incluye items convertidos desde monedas distintas"
                    f"{f': {monedas_items}' if monedas_items else ''}"
                )
            lineas.append(
                f"Cotizacion #{numero} - {nombre} | Moneda: {moneda} | Total: {total}"
            )
            if total_convertido is not None:
                lineas.append(
                    f"  Total convertido a {moneda_contrato}: {total_convertido}"
                )
            if dolar_observado is not None:
                lineas.append(f"  Dolar observado usado: {dolar_observado}")
            if valor_uf is not None:
                lineas.append(f"  Valor UF usado: {valor_uf}")
            for item in cotizacion.get("items") or []:
                item_nombre = item.get("nombre") or "Item"
                cantidad = item.get("cantidad") or 0
                precio_unitario = item.get("precio_unitario") or 0
                total_item = item.get("costo_total") or 0
                lineas.append(
                    f"  {item_nombre} | Cantidad: {cantidad} | Precio unitario: {precio_unitario}"
                    f" | Total: {total_item}"
                )
        if resumen_comercial.get("forma_pago_venta") == "cuotas":
            lineas.append("Condicion de pago: Cuotas")
            for cuota in resumen_comercial.get("cuotas_venta_resumen") or []:
                lineas.append(
                    "  "
                    f"Cuota {cuota.get('orden')}: {cuota.get('porcentaje')}% | "
                    f"Monto: {cuota.get('monto')} {moneda_contrato} | "
                    f"Hito: {cuota.get('hito_pago_label') or cuota.get('hito_pago_descripcion') or 'Sin definir'}"
                )
        elif cotizaciones_vinculadas:
            lineas.append("Condicion de pago: Contado")
        return lineas

    for item in contrato_payload.get("contrato_servicios") or []:
        nombre = item.get("nombre") or "Servicio"
        cantidad = item.get("cantidad") or 0
        precio = item.get("precio_unitario") or 0
        subtotal = item.get("subtotal")
        servicio = item.get("servicio_generico") or {}
        lineas.append(
            f"{nombre} | Cantidad: {cantidad} | Precio unitario: ${_format_money(precio)}"
            f" | Subtotal: ${_format_money(subtotal if subtotal is not None else float(precio) * float(cantidad))}"
        )
        for label, value in (
            ("Incluye", servicio.get("incluye")),
            ("No incluye", servicio.get("no_incluye")),
            ("Clausulas", servicio.get("clausulas_especiales")),
        ):
            if value:
                lineas.append(f"  {label}: {value}")
        if item.get("tipo_item") == "plan":
            _append_plan_component_lines(lineas, item)
    for licencia in contrato_payload.get("contrato_licencias") or []:
        nombre = licencia.get("nombre_licencia") or "Licencia"
        cantidad = licencia.get("cantidad") or 0
        precio = licencia.get("precio_unitario") or 0
        lineas.append(
            f"{nombre} | Cantidad: {cantidad} | Precio unitario: ${_format_money(precio)}"
            f" | Subtotal: ${_format_money(float(precio) * float(cantidad))}"
        )
    return lineas or ["Sin servicios asociados."]


def _build_conditions_from_payload(contrato_payload):
    condiciones = []
    for condicion in contrato_payload.get("contrato_condiciones_especiales") or []:
        nombre = (
            condicion.get("nombre_condicion")
            or condicion.get("titulo_condicion")
            or "Condicion especial"
        )
        detalle = (
            condicion.get("detalle_condicion")
            or condicion.get("descripcion_condicion")
            or condicion.get("texto")
            or ""
        )
        multa = condicion.get("multa_condicion")
        linea = f"{nombre}: {detalle}".strip()
        if multa:
            linea += f" | Multa: ${_format_money(multa)}"
        condiciones.append(linea)
    return "\n".join(condiciones) or "Sin condiciones especiales."


def construir_pdf_desde_payload(
    contrato_payload,
    *,
    firma_cliente_b64=None,
    firmante_cliente=None,
):
    datos_empresa = contrato_payload.get("datos_empresa") or {}
    datos_cliente_payload = contrato_payload.get("datos_cliente") or {}
    destinatario = contrato_payload.get("destinatario_principal") or {}

    datos_cliente = {
        "razon_social": datos_cliente_payload.get("nombre") or "",
        "rut": datos_cliente_payload.get("rut_empresa") or "",
        "domicilio": datos_cliente_payload.get("direccion_principal") or "",
        "giro": "",
        "representante_legal": destinatario.get("nombre_display") or "",
        "rut_representante_legal": "",
        "fono": datos_cliente_payload.get("telefono") or "",
        "email": datos_cliente_payload.get("email") or "",
    }

    lista_servicios = _build_service_lines_from_payload(contrato_payload)
    resumen_comercial = contrato_payload.get("resumen_comercial") or {}
    moneda_resumen = (
        resumen_comercial.get("moneda")
        or contrato_payload.get("moneda_cobro")
        or "USD"
    )
    datos_contrato = {
        "fecha": contrato_payload.get("fecha_inicio") or "",
        "proveedor_razon_social": datos_empresa.get("nombre") or "",
        "proveedor_rut": datos_empresa.get("rut_empresa") or "",
        "proveedor_direccion": datos_empresa.get("direccion_principal") or "",
        "proveedor_representante": datos_empresa.get("nombre") or "",
        "descripcion_plan": contrato_payload.get("observaciones") or "Sin descripcion adicional.",
        "valor_mensual": _format_money(
            resumen_comercial.get("total_contrato", contrato_payload.get("total_contrato"))
        ),
        "descripcion_asesoria": contrato_payload.get("observaciones") or "",
        "forma_pago": resumen_comercial.get(
            "forma_pago_venta_label",
            resumen_comercial.get(
                "forma_pago_contractual",
                contrato_payload.get("forma_pago_contractual", ""),
            ),
        ),
        "condiciones_generales": _build_conditions_from_payload(contrato_payload),
        "lista_tareas": lista_servicios,
        "moneda_contrato": normalizar_moneda(moneda_resumen),
        "firma_empresa_b64": datos_empresa.get("firma_empresa"),
        "firma_cliente_b64": firma_cliente_b64,
        "cliente_firmante": firmante_cliente or destinatario.get("nombre_display") or "",
        "acuerdos_confidencialidad": [
            {
                "titulo": acuerdo.get("titulo_acuerdo"),
                "contenido": acuerdo.get("contenido_acuerdo"),
            }
            for acuerdo in contrato_payload.get("firmas_confidencialidad") or []
            if acuerdo.get("titulo_acuerdo")
        ],
    }

    return generar_contrato_en_memoria(
        contrato_payload.get("nombre") or "Contrato",
        datos_cliente,
        datos_contrato,
    )


def _resolver_pdf_contrato(
    contrato: ContratoEmpresaCliente,
    *,
    firma_cliente_b64=None,
    firmante_cliente=None,
    payload_fallback=None,
):
    """
    Punto único de decisión v1/v2.9 para el PDF de un contrato B2B. Usado por
    ``construir_pdf_contrato`` y ``actualizar_pdf_firmado_envio`` — antes cada
    uno decidía por su cuenta si el contrato tenía secciones generadas, lo que
    podía divergir entre el PDF de aprobación y el PDF firmado final.

    - Si la plantilla es v2.9: congela (o recongela, si cambió de versión) el
      documento único y renderiza con WeasyPrint. La firma capturada no se
      embebe en el documento todavía — el bloque "firma" del motor v2.9 solo
      dibuja líneas para firma húmeda, no una imagen de firma digital
      (limitación conocida, fuera de alcance de esta integración).
    - Si no, sigue la lógica v1 existente (secciones + plantilla), con
      fallback al payload genérico (``payload_fallback`` si se provee —
      p.ej. el snapshot congelado al enviar a aprobación — o el serializer
      en vivo) si el contrato no tiene plantilla o no se pudieron generar
      secciones.
    """
    if contrato.plantilla and contrato.plantilla.version_editor == "v29":
        from contratos.adaptadores import AdaptadorContratoB2B
        from contratos.motor_v29 import generar_o_recongelar_documento_v29
        from weasyprint import HTML as WeasyHTML

        adaptador = AdaptadorContratoB2B(contrato)
        documento = generar_o_recongelar_documento_v29(adaptador)
        return WeasyHTML(string=documento.html_generado).write_pdf()

    if contrato.plantilla:
        # Si el contrato tiene plantilla pero aún no tiene secciones generadas,
        # intentar regenerarlas para mantener el PDF fiel a la plantilla.
        from contratos.motor_plantillas import generar_secciones_contrato

        if not contrato.secciones_generadas.exists() or (
            contrato.plantilla.version
            and str(contrato.plantilla.version) != str(contrato.plantilla_version_usada or "")
        ):
            generar_secciones_contrato(contrato)

        if contrato.secciones_generadas.exists():
            return generar_contrato_desde_plantilla(
                contrato,
                firma_cliente_b64=firma_cliente_b64,
                firmante_cliente=firmante_cliente or "",
            )

    payload = payload_fallback or ContratoEmpresaClienteSerializer(contrato).data
    return construir_pdf_desde_payload(
        payload,
        firma_cliente_b64=firma_cliente_b64,
        firmante_cliente=firmante_cliente,
    )


def construir_pdf_contrato(contrato: ContratoEmpresaCliente):
    return _resolver_pdf_contrato(contrato)


def actualizar_pdf_firmado_envio(envio: EnvioContratoFirmaUsuario):
    contrato = envio.usuario.contrato
    envio.pdf_congelado = _resolver_pdf_contrato(
        contrato,
        firma_cliente_b64=envio.firma,
        firmante_cliente=envio.usuario.nombre_display,
        payload_fallback=envio.snapshot_contrato,
    )
    return envio


def preparar_documento_contrato(
    contrato: ContratoEmpresaCliente,
    request=None,
    *,
    require_provider_signature=False,
):
    if require_provider_signature and not firma_prestadora_disponible(contrato):
        raise ValueError(
            "La empresa prestadora debe tener una firma configurada antes de enviar el contrato a firma."
        )
    snapshot = construir_snapshot_contrato(contrato, request=request)
    pdf_bytes = construir_pdf_contrato(contrato)
    return snapshot, pdf_bytes


def _frontend_url():
    return os.getenv("FRONTEND_URL", "https://app.gestionsnabb-it.cl")


def enviar_correo_aprobacion(envio: EnvioContratoAprobacion):
    subject = "Tu contrato esta listo para revision"
    recipient_list = [envio.destinatario.correo_display]
    nombre = envio.destinatario.nombre_display or "cliente"
    html_body = render_to_string(
        "email-contratos/contrato_aprobacion.html",
        {"nombre": nombre},
    )
    titulo = "Revisa tu contrato"
    url_boton = f"{_frontend_url()}/contrato/public/aprobacion/{envio.uuid}"
    text_boton = "Revisar contrato"

    empresa = getattr(envio.contrato, "empresa_prestadora", None)
    logo_b64 = get_logo_empresa_b64(empresa) if empresa else None

    send_email_task.delay(
        subject,
        recipient_list,
        html_body,
        titulo,
        url_boton,
        text_boton,
        logo_empresa_b64=logo_b64,
        empresa_nombre=getattr(empresa, 'nombre', None),
    )


def enviar_correo_firma(envio: EnvioContratoFirmaUsuario):
    subject = "Tu contrato esta listo para firma"
    recipient_list = [envio.usuario.correo_display]
    nombre = envio.usuario.nombre_display or "cliente"
    html_body = render_to_string(
        "email-contratos/contrato_firma.html",
        {"nombre": nombre},
    )
    titulo = "Firma tu contrato"
    url_boton = f"{_frontend_url()}/contrato/public/firma/{envio.uuid}"
    text_boton = "Firmar contrato"

    empresa = getattr(getattr(envio.usuario, "contrato", None), "empresa_prestadora", None)
    logo_b64 = get_logo_empresa_b64(empresa) if empresa else None

    send_email_task.delay(
        subject,
        recipient_list,
        html_body,
        titulo,
        url_boton,
        text_boton,
        logo_empresa_b64=logo_b64,
        empresa_nombre=getattr(empresa, 'nombre', None),
    )


def marcar_envio(envio):
    envio.enviado = True
    envio.fecha_envio = timezone.now()
    return envio
