import os

from django.utils import timezone

from core.tasks import send_email_task

from .funciones import generar_contrato_en_memoria
from .models import (
    ContratoCondicionEspecial,
    ContratoEmpresaCliente,
    ContratoServicio,
    EnvioContratoAprobacion,
    EnvioContratoFirmaUsuario,
)
from .serializers import ContratoEmpresaClienteSerializer


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def obtener_destinatario_principal(contrato: ContratoEmpresaCliente):
    return contrato.destinatario_principal


def obtener_envio_aprobacion_pendiente(contrato: ContratoEmpresaCliente):
    return contrato.envios_aprobacion.filter(respondido=False).order_by("-fecha_envio", "-id").first()


def obtener_envio_firma_pendiente(contrato: ContratoEmpresaCliente):
    return (
        EnvioContratoFirmaUsuario.objects.filter(
            usuario__contrato=contrato,
            firmado=False,
        )
        .order_by("-fecha_envio", "-id")
        .first()
    )


def construir_snapshot_contrato(contrato: ContratoEmpresaCliente, request=None):
    contrato.refresh_from_db()
    return ContratoEmpresaClienteSerializer(
        contrato,
        context={"request": request} if request else {},
    ).data


def construir_pdf_contrato(contrato: ContratoEmpresaCliente):
    empresa_cliente = contrato.empresa_cliente
    empresa_prestadora = contrato.empresa_prestadora

    representantes_cliente = getattr(empresa_cliente, "representantes_legales", None)
    rep_legal_nombre = ""
    rep_legal_rut = ""
    if representantes_cliente and representantes_cliente.exists():
        rep = representantes_cliente.first()
        rep_legal_nombre = rep.usuario.get_nombre_completo() if hasattr(rep, "usuario") else ""

    datos_cliente = {
        "razon_social": empresa_cliente.nombre or "",
        "rut": getattr(empresa_cliente, "rut_empresa", "") or "",
        "domicilio": getattr(empresa_cliente, "direccion_principal", "") or "",
        "giro": "",
        "representante_legal": rep_legal_nombre,
        "rut_representante_legal": rep_legal_rut,
        "fono": getattr(empresa_cliente, "telefono", "") or "",
        "email": getattr(empresa_cliente, "email", "") or "",
    }

    representantes_prestadora = getattr(empresa_prestadora, "representantes_legales", None)
    rep_prest_nombre = ""
    if representantes_prestadora and representantes_prestadora.exists():
        rep_p = representantes_prestadora.first()
        rep_prest_nombre = rep_p.usuario.get_nombre_completo() if hasattr(rep_p, "usuario") else ""

    servicios = ContratoServicio.objects.filter(contrato=contrato)
    lista_servicios = [
        cs.servicio_generico.nombre if cs.servicio_generico else f"Servicio #{cs.object_id}"
        for cs in servicios
    ]
    valor_total = sum(float(cs.precio_unitario) * cs.cantidad for cs in servicios)

    datos_contrato = {
        "fecha": contrato.fecha_inicio.strftime("%d de %B del %Y") if contrato.fecha_inicio else "",
        "proveedor_razon_social": empresa_prestadora.nombre or "",
        "proveedor_rut": getattr(empresa_prestadora, "rut_empresa", "") or "",
        "proveedor_direccion": getattr(empresa_prestadora, "direccion_principal", "") or "",
        "proveedor_representante": rep_prest_nombre,
        "descripcion_plan": contrato.observaciones or "Sin descripcion adicional.",
        "valor_mensual": f"{valor_total:,.0f}",
        "descripcion_asesoria": contrato.observaciones or "",
        "forma_pago": "",
        "condiciones_generales": "\n".join(
            [
                (
                    f"{cce.condicion.titulo}: {cce.condicion.descripcion}"
                    if cce.condicion
                    else (cce.texto or "")
                )
                for cce in ContratoCondicionEspecial.objects.filter(contrato=contrato).select_related(
                    "condicion"
                )
            ]
        )
        or "Sin condiciones especiales.",
        "lista_tareas": lista_servicios if lista_servicios else ["Sin servicios asociados."],
    }

    return generar_contrato_en_memoria(contrato.nombre, datos_cliente, datos_contrato)


def preparar_documento_contrato(contrato: ContratoEmpresaCliente, request=None):
    snapshot = construir_snapshot_contrato(contrato, request=request)
    pdf_bytes = construir_pdf_contrato(contrato)
    return snapshot, pdf_bytes


def _frontend_url():
    return os.getenv("FRONTEND_URL", "https://app.gestionsnabb-it.cl")


def enviar_correo_aprobacion(envio: EnvioContratoAprobacion):
    subject = "Tu contrato esta listo para revision"
    recipient_list = [envio.destinatario.correo_display]
    html_body = (
        "<p>Hola,</p>"
        "<p>Tu contrato ya esta disponible para revision y aprobacion.</p>"
        "<p>Puedes revisarlo completo desde el siguiente enlace:</p>"
    )
    titulo = "Revisa tu contrato"
    url_boton = f"{_frontend_url()}/contrato/aprobacion/{envio.uuid}"
    text_boton = "Revisar contrato"

    send_email_task.delay(
        subject,
        recipient_list,
        html_body,
        titulo,
        url_boton,
        text_boton,
    )


def enviar_correo_firma(envio: EnvioContratoFirmaUsuario):
    subject = "Tu contrato esta listo para firma"
    recipient_list = [envio.usuario.correo_display]
    html_body = (
        "<p>Hola,</p>"
        "<p>Tu contrato fue aprobado y ya esta disponible para firma.</p>"
        "<p>Haz clic en el siguiente enlace para revisarlo y firmarlo:</p>"
    )
    titulo = "Firma tu contrato"
    url_boton = f"{_frontend_url()}/firmar-contrato/{envio.uuid}"
    text_boton = "Firmar contrato"

    send_email_task.delay(
        subject,
        recipient_list,
        html_body,
        titulo,
        url_boton,
        text_boton,
    )


def marcar_envio(envio):
    envio.enviado = True
    envio.fecha_envio = timezone.now()
    return envio
