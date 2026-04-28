from celery import shared_task
from datetime import date, timedelta
from contratos.models import (
    ContratoEmpresaCliente,
    ContratoLicencia,
    FacturaContrato,
    NotificacionVentanaLicencia,
    UsuarioVinculadoContrato,
)
from core.pdf.canvas_utils import get_logo_empresa_b64
from django.template.loader import render_to_string
from core.tasks import send_email_task
from dateutil.relativedelta import relativedelta
import os


@shared_task
def actualizar_contratos_vencidos():
    """Busca contratos vencidos y los marca como finalizados."""
    contratos_vencidos = ContratoEmpresaCliente.objects.filter(fecha_fin__lt=date.today(), estado='activo')
    count = contratos_vencidos.count()
    for contrato in contratos_vencidos:
        contrato.estado = 'finalizado'
        contrato.save()
        print(f"Contrato {contrato.id} finalizado automáticamente.")
    return f"Se han finalizado {count} contratos vencidos."


@shared_task
def notificar_contratos_por_vencer():
    """
    Notifica por email a usuarios vinculados de contratos que vencen en los próximos 30 días.
    Se recomienda ejecutar diariamente vía Celery Beat.
    """
    hoy = date.today()
    fecha_limite = hoy + timedelta(days=30)

    contratos_por_vencer = ContratoEmpresaCliente.objects.filter(
        estado='activo',
        fecha_fin__isnull=False,
        fecha_fin__lte=fecha_limite,
        fecha_fin__gte=hoy,
    )

    notificaciones_enviadas = 0
    frontend_url = os.getenv("FRONTEND_URL", "https://app.gestionsnabb-it.cl")

    for contrato in contratos_por_vencer:
        dias_restantes = (contrato.fecha_fin - hoy).days

        # Solo notificar en hitos: 30, 15, 7, 3, 1 días
        if dias_restantes not in (30, 15, 7, 3, 1):
            continue

        # Obtener emails de usuarios vinculados
        vinculos = UsuarioVinculadoContrato.objects.filter(
            contrato=contrato
        ).select_related("usuario__usuario")

        emails = [v.usuario.usuario.email for v in vinculos if v.usuario and v.usuario.usuario]
        if not emails:
            continue

        subject = f"⚠️ Contrato '{contrato.nombre}' vence en {dias_restantes} día(s)"
        html_body = render_to_string(
            "email-contratos/contrato_por_vencer.html",
            {
                "contrato_nombre": contrato.nombre,
                "empresa_prestadora": str(contrato.empresa_prestadora),
                "empresa_cliente": str(contrato.empresa_cliente),
                "fecha_fin": contrato.fecha_fin.strftime("%d/%m/%Y"),
                "dias_restantes": dias_restantes,
            },
        )

        send_email_task.delay(
            subject,
            emails,
            html_body,
            "Contrato por vencer",
            f"{frontend_url}/empresa/contratos",
            "Ver contratos",
            logo_empresa_b64=get_logo_empresa_b64(contrato.empresa_prestadora),
            empresa_nombre=getattr(contrato.empresa_prestadora, 'nombre', None),
        )
        notificaciones_enviadas += 1

    return f"Se enviaron {notificaciones_enviadas} notificaciones de contratos por vencer."


@shared_task
def generar_facturas_mensuales():
    """Genera automáticamente prefacturas en borrador para contratos activos
    cuyo día de facturación coincide con el día actual.

    Se recomienda ejecutar diariamente vía Celery Beat.
    Solo crea la factura si no existe ya una para el mismo período y contrato.
    """
    hoy = date.today()
    dia_hoy = hoy.day

    contratos = ContratoEmpresaCliente.objects.filter(
        estado="activo",
        dia_facturacion=dia_hoy,
    )

    facturas_creadas = 0

    for contrato in contratos:
        # Período = mes anterior completo
        periodo_fin = hoy.replace(day=1) - timedelta(days=1)
        periodo_inicio = periodo_fin.replace(day=1)

        # Verificar que no exista ya una factura no-anulada para este período
        ya_existe = FacturaContrato.objects.filter(
            contrato=contrato,
            periodo_inicio=periodo_inicio,
            periodo_fin=periodo_fin,
        ).exclude(estado="anulado").exists()

        if ya_existe:
            continue

        FacturaContrato.objects.create(
            contrato=contrato,
            empresa_prestadora=contrato.empresa_prestadora,
            empresa_cliente=contrato.empresa_cliente,
            estado="por_facturar",
            periodo_inicio=periodo_inicio,
            periodo_fin=periodo_fin,
            fecha_emision=hoy,
            monto_total=contrato.total_items_comerciales or 0,
            moneda=contrato.moneda_cobro,
            comentario=f"Prefactura automática — período {periodo_inicio.strftime('%m/%Y')}",
        )
        facturas_creadas += 1

    return f"Se generaron {facturas_creadas} prefacturas automáticas."


@shared_task
def notificar_ventana_edicion_licencias():
    """
    Notifica al inicio de cada ventana de 7 días para gestión de cupos de licencias.
    Envía una sola notificación por licencia y ciclo.
    """
    hoy = date.today()
    frontend_url = os.getenv("FRONTEND_URL", "https://app.gestionsnabb-it.cl")
    notificaciones_enviadas = 0

    licencias = (
        ContratoLicencia.objects.filter(estado="activa")
        .select_related("contrato", "contrato__empresa_cliente", "licencia")
    )

    for licencia in licencias:
        ciclo_inicio = licencia.inicio_periodo_actual
        if not ciclo_inicio or ciclo_inicio != hoy:
            continue

        if NotificacionVentanaLicencia.objects.filter(
            licencia=licencia,
            ciclo_inicio=ciclo_inicio,
        ).exists():
            continue

        vinculos = (
            UsuarioVinculadoContrato.objects.filter(contrato=licencia.contrato)
            .select_related("usuario__usuario")
        )
        emails = sorted(
            {
                vinculo.usuario.usuario.email
                for vinculo in vinculos
                if vinculo.usuario
                and vinculo.usuario.usuario
                and vinculo.usuario.usuario.email
            }
        )
        if not emails:
            continue

        fecha_limite = licencia.fin_periodo_actual or ciclo_inicio
        empresa_cliente = licencia.contrato.empresa_cliente
        detail_url = (
            f"{frontend_url}/empresa/detalle-cliente/{empresa_cliente.id}"
            f"/contrato/{licencia.contrato.id}/licencia/{licencia.id}"
        )

        subject = (
            f"[Acción requerida] Ventana abierta para ajustar cupos — "
            f"{licencia.licencia.nombre} / {empresa_cliente.nombre}"
        )
        html_body = render_to_string(
            "email-contratos/contrato_ventana_licencias.html",
            {
                "licencia_nombre": licencia.licencia.nombre,
                "contrato_nombre": licencia.contrato.nombre,
                "fecha_limite": fecha_limite.strftime("%d/%m/%Y"),
                "empresa_cliente": empresa_cliente.nombre,
                "detalle_url": detail_url,
            },
        )

        send_email_task.delay(
            subject,
            emails,
            html_body,
            "Gestión de cupos disponible",
            detail_url,
            "Revisar licencia",
            logo_empresa_b64=get_logo_empresa_b64(licencia.contrato.empresa_prestadora),
            empresa_nombre=getattr(licencia.contrato.empresa_prestadora, 'nombre', None),
        )

        NotificacionVentanaLicencia.objects.create(
            licencia=licencia,
            ciclo_inicio=ciclo_inicio,
            destinatarios=", ".join(emails),
        )
        notificaciones_enviadas += 1

    return (
        "Se enviaron "
        f"{notificaciones_enviadas} notificaciones de apertura de ventana de licencias."
    )
