import logging
import os
import threading
from datetime import datetime

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Count, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from celery.exceptions import CeleryError
from kombu.exceptions import OperationalError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from bodegas.models import ItemEnOrdenCompra, ItemOrdenCompraEnStock, MovimientoStock, OrdenCompra
from bodegas.serializers import OrdenCompraSerializer
from core.models import PersonalizacionUsuario
from core.tasks import send_email_task
from cuentas.functions import obtener_usuario_empresa
from empresas.models import Empresa, UsuarioEmpresa
from empresas.serializers import UsuarioEmpresaSerializer
from items.models import ItemEmpresa, ProveedorEmpresa

logger = logging.getLogger(__name__)

from .functions import (
    crear_orden_compra_para_proveedor,
    crear_seguimiento_cotizacion,
    generar_pdf_cotizacion,
    generar_pdf_cotizacion_desde_model,
)
from .models import (
    Cotizacion,
    ItemCotizacion,
    SeguimientoCotizacion,
    SolicitanteCotizacion,
)
from .serializers import *
from .tasks import actualizar_tipo_cambio_cotizacion


def _has_manual_tipo_cambio(data):
    def _provided(key):
        value = data.get(key, None)
        return value not in (None, '', 'null')

    return _provided('dolar_observado'), _provided('valor_uf')


def _run_tipo_cambio_update(cotizacion_id, actualizar_dolar=True, actualizar_uf=True):
    def run_tipo_cambio_update():
        actualizar_tipo_cambio_cotizacion(
            cotizacion_id,
            actualizar_dolar=actualizar_dolar,
            actualizar_uf=actualizar_uf,
        )

    hilo = threading.Thread(target=run_tipo_cambio_update)
    hilo.start()


class CotizacionViewSet(viewsets.ModelViewSet):
    queryset = Cotizacion.objects.prefetch_related("items", "seguimientos").annotate(
        copias_count=Count("copias")
    )
    serializer_class = CotizacionSerializer

    def perform_create(self, serializer):
        """Interceptar la creación para agregar seguimiento"""
        cliente = serializer.validated_data.get("cliente")
        ppm_value = serializer.validated_data.get("ppm", None)
        recargo_value = serializer.validated_data.get("porcentaje_recargo", None)
        extra_kwargs = {}

        if ppm_value is None and cliente:
            # Si no se envió ppm explícito, usar el ppm configurado en el cliente.
            extra_kwargs["ppm"] = cliente.ppm

        if recargo_value is None and cliente:
            # Si no se envió porcentaje_recargo explícito, usar el recargo configurado en el cliente.
            extra_kwargs["porcentaje_recargo"] = cliente.recargo

        cotizacion = serializer.save(**extra_kwargs)

        manual_dolar, manual_uf = _has_manual_tipo_cambio(self.request.data)
        if manual_dolar or manual_uf:
            fecha_referencia = cotizacion.fecha_facturacion or timezone.localdate()
            if cotizacion.tipo_moneda == '3' and manual_uf:
                cotizacion.fecha_tipo_cambio = fecha_referencia
                cotizacion.save(update_fields=['fecha_tipo_cambio'])
            if cotizacion.tipo_moneda != '3' and manual_dolar:
                cotizacion.fecha_tipo_cambio = fecha_referencia
                cotizacion.save(update_fields=['fecha_tipo_cambio'])

        # Al crear, ejecutar de forma asíncrona para no bloquear la respuesta
        if not (manual_dolar and manual_uf):
            _run_tipo_cambio_update(
                cotizacion.id,
                actualizar_dolar=not manual_dolar,
                actualizar_uf=not manual_uf,
            )

        usuario_empresa = UsuarioEmpresa.objects.get(usuario=self.request.user)
        crear_seguimiento_cotizacion(
            cotizacion_id=cotizacion.id,
            usuario_id=usuario_empresa.id,
            comentario=f"Cotización {cotizacion.numero_cotizacion} creada.",
        )

    def perform_update(self, serializer):
        """Interceptar la edición para agregar seguimiento"""
        # Capturar la instancia original antes de guardar
        instance_original = self.get_object()
        fecha_facturacion_original = instance_original.fecha_facturacion
        tipo_moneda_original = instance_original.tipo_moneda
        
        cotizacion = serializer.save()
        
        # Detección inteligente de cambio manual
        # Si el valor enviado es distinto al original, es un cambio manual.
        # Si es igual, asumimos que es el valor que ya estaba y permitimos auto-refresco.
        
        data = self.request.data
        manual_dolar = False
        manual_uf = False
        
        if 'dolar_observado' in data:
            val_env = data.get('dolar_observado')
            if val_env not in (None, '', 'null'):
                try:
                    if Decimal(str(val_env)) != instance_original.dolar_observado:
                        manual_dolar = True
                except:
                    pass
                    
        if 'valor_uf' in data:
            val_env = data.get('valor_uf')
            if val_env not in (None, '', 'null'):
                try:
                    if Decimal(str(val_env)) != instance_original.valor_uf:
                        manual_uf = True
                except:
                    pass

        # Si cambió la fecha_facturacion y no es manual, forzar refresco
        forzar_refresco = fecha_facturacion_original != cotizacion.fecha_facturacion

        if manual_dolar or manual_uf:
            fecha_referencia = cotizacion.fecha_facturacion or timezone.localdate()
            if manual_uf:
                cotizacion.fecha_tipo_cambio = fecha_referencia
            if manual_dolar:
                cotizacion.fecha_tipo_cambio = fecha_referencia
            cotizacion.save(update_fields=['fecha_tipo_cambio'])

        # Ejecutar actualización asíncrona si no es manual o si forzamos por cambio de fecha
        if not (manual_dolar and manual_uf) or forzar_refresco:
            _run_tipo_cambio_update(
                cotizacion.id,
                actualizar_dolar=not manual_dolar or forzar_refresco,
                actualizar_uf=not manual_uf or forzar_refresco,
            )
        usuario_empresa = UsuarioEmpresa.objects.get(usuario=self.request.user)
        crear_seguimiento_cotizacion(
            cotizacion_id=cotizacion.id,
            usuario_id=usuario_empresa.id,
            comentario=f"Cotización {cotizacion.numero_cotizacion} actualizada.",
        )

    @action(detail=False, methods=["get"], url_path="cotizaciones-empresa")
    def cotizaciones_empresa(self, request):
        usuario = request.user
        try:
            personalizacion = PersonalizacionUsuario.objects.get(usuario=usuario)
            empresa = personalizacion.sucursal_principal
            if not empresa:
                return Response(
                    {"detail": "Empresa principal no seleccionada."}, status=400
                )
            empresa = get_object_or_404(
                Empresa, pk=empresa.pk
            )  # Asegúrate de que sea una instancia de Empresa
        except PersonalizacionUsuario.DoesNotExist:
            return Response(
                {"detail": "Personalización del usuario no encontrada."}, status=404
            )

        cotizaciones = self.queryset.filter(empresa=empresa).order_by(
            "-numero_cotizacion"
        )
        cliente_ids = [
            value for value in request.query_params.getlist("cliente") if value
        ]
        estados = [value for value in request.query_params.getlist("estado") if value]

        if cliente_ids:
            cotizaciones = cotizaciones.filter(cliente_id__in=cliente_ids)
        if estados:
            cotizaciones = cotizaciones.filter(estado__in=estados)
        serializer = self.get_serializer(cotizaciones, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="refrescar-tipo-cambio")
    def refrescar_tipo_cambio(self, request, pk=None):
        """
        Actualiza manualmente el tipo de cambio (dolar/UF) de la cotización.
        Útil cuando el usuario cambia la fecha de facturación en el frontend.
        """
        cotizacion = self.get_object()
        
        _run_tipo_cambio_update(
            cotizacion.id,
            actualizar_dolar=True,
            actualizar_uf=True,
        )
        cotizacion.refresh_from_db()
        serializer = self.get_serializer(cotizacion)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="duplicar")
    def duplicar(self, request, pk=None):
        """
        Duplica una cotizacion rechazada, copiando items y solicitantes.
        La nueva cotizacion queda en estado pendiente.
        """
        cotizacion = self.get_object()
        if cotizacion.estado != "rechazada":
            return Response(
                {"detail": "Solo se pueden crear copias de cotizaciones rechazadas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            nueva_cotizacion = Cotizacion.objects.create(
                nombre=cotizacion.nombre,
                empresa=cotizacion.empresa,
                cliente=cotizacion.cliente,
                copia_de=cotizacion,
                estado="pendiente",
                descripcion=cotizacion.descripcion,
                total_estimado=cotizacion.total_estimado,
                observaciones=cotizacion.observaciones,
                tipo_moneda=cotizacion.tipo_moneda,
                porcentaje_recargo=cotizacion.porcentaje_recargo,
                fecha_facturacion=cotizacion.fecha_facturacion,
                dolar_observado=cotizacion.dolar_observado,
                valor_uf=cotizacion.valor_uf,
                ppm=cotizacion.ppm,
            )

            for item in cotizacion.items.all():
                ItemCotizacion.objects.create(
                    cotizacion=nueva_cotizacion,
                    item_empresa=item.item_empresa,
                    proveedor_empresa=item.proveedor_empresa,
                    aprobado=False,
                    nombre=item.nombre,
                    descripcion=item.descripcion,
                    cantidad=item.cantidad,
                    precio_unitario=item.precio_unitario,
                    recargo_dolar=item.recargo_dolar,
                )

            for solicitante in cotizacion.solicitantes.all():
                SolicitanteCotizacion.objects.create(
                    cotizacion=nueva_cotizacion,
                    content_type=solicitante.content_type,
                    usuario_id=solicitante.usuario_id,
                    aprobo=False,
                    fecha_aprobacion=None,
                )

            usuario_empresa = UsuarioEmpresa.objects.get(usuario=self.request.user)
            crear_seguimiento_cotizacion(
                cotizacion_id=nueva_cotizacion.id,
                usuario_id=usuario_empresa.id,
                comentario=(
                    f"Copia {nueva_cotizacion.numero_cotizacion} creada "
                    f"desde cotizacion rechazada {cotizacion.numero_cotizacion}."
                ),
            )

        serializer = self.get_serializer(nueva_cotizacion)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="copias")
    def copias(self, request, pk=None):
        cotizacion = self.get_object()
        copias = self.queryset.filter(copia_de=cotizacion).order_by(
            "-numero_cotizacion"
        )
        serializer = self.get_serializer(copias, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="enviar-cotizacion")
    def enviar_cotizacion(self, request, pk=None):
        """
        Permite enviar una cotización por correo, adjuntando el PDF y guardando los destinatarios en el modelo.

        Requiere en el body:
        - `copias`: Lista de correos en copia (`CC`).
        - `usuarios_empresa`: Lista de `pks` de usuarios de empresa a guardar en `EnvioCorreoCotizacion` y agregar en copia.
        """
        cotizacion = get_object_or_404(Cotizacion, pk=pk)

        # Validación de Fecha Futura
        hoy = timezone.localdate()
        if cotizacion.fecha_facturacion and cotizacion.fecha_facturacion > hoy:
            return Response(
                {"detail": "No se puede enviar una cotización con fecha de facturación futura. Espere a la fecha indicada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Obtener datos desde el request
        # email_principal = request.data.get("email_principal")
        copias = request.data.get("copias", [])  # Lista de correos en CC
        usuarios_empresa_pks = request.data.get(
            "usuarios_empresa", []
        )  # Pks de usuarios
        usuarios_empresa_pks = [
            int(pk) for pk in usuarios_empresa_pks if str(pk).isdigit()
        ]

        # if not email_principal:
        #     return Response({"detail": "El correo principal es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

        # correos_usuarios_empresa = []
        correos_cc = []
        usuarios_empresa = None
        if usuarios_empresa_pks:
            # Obtener usuarios de empresa si se enviaron pks
            usuarios_empresa = UsuarioEmpresa.objects.filter(
                pk__in=usuarios_empresa_pks
            )
            correos_cc = [
                user.usuario.email for user in usuarios_empresa if user.usuario.email
            ]

        if copias:
            # Unir los correos en copia
            correos_cc = list(set(copias + correos_cc))  # Evita duplicados

        # # Obtener datos de la cotización
        # datos_cotizacion = {
        #     "numero_cotizacion": cotizacion.numero_cotizacion,
        #     "fecha_vencimiento": cotizacion.fecha_vencimiento.strftime('%Y-%m-%d') if cotizacion.fecha_vencimiento else 'N/A',
        #     "estado": cotizacion.estado,
        #     "total_estimado": f"${cotizacion.total_estimado:.2f}",
        #     "observaciones": cotizacion.observaciones or "",
        #     "items": [
        #         {
        #             "nombre": item.item_empresa.nombre if item.item_empresa else item.nombre,
        #             "descripcion": item.descripcion,
        #             "cantidad": item.cantidad,
        #             "precio_unitario": float(item.precio_unitario),
        #             "costo_total": float(item.costo_total)
        #         }
        #         for item in cotizacion.detalles.all()
        #     ]
        # }

        # # Datos de la empresa y cliente
        # empresa = cotizacion.empresa
        # cliente = cotizacion.cliente
        # nombre_empresa = empresa.nombre
        # rut_empresa = getattr(empresa, 'rut_empresa', 'N/A')
        # direccion_empresa = getattr(empresa, 'direccion', 'N/A')
        # telefono_empresa = getattr(empresa, 'telefono', 'N/A')
        # email_empresa = getattr(empresa, 'email', 'N/A')
        # sitio_web_empresa = getattr(empresa, 'sitio_web', '')

        # nombre_cliente = cliente.nombre
        # rut_cliente = getattr(cliente, 'rut_empresa', 'N/A')
        # direccion_cliente = getattr(cliente, 'direccion', 'N/A')
        # telefono_cliente = getattr(cliente, 'telefono', 'N/A')
        # email_cliente = getattr(cliente, 'email', 'N/A')

        # # Generar PDF
        # pdf_bytes = generar_pdf_cotizacion(
        #     datos_cotizacion,
        #     nombre_empresa, rut_empresa, direccion_empresa, telefono_empresa,
        #     email_empresa, sitio_web_empresa, nombre_cliente, telefono_cliente,
        #     direccion_cliente, rut_cliente, email_cliente
        # )

        pdf_bytes = generar_pdf_cotizacion_desde_model(cotizacion_id=cotizacion.pk)
        pdf_filename = (
            f"Coti_{cotizacion.numero_cotizacion}_{cotizacion.cliente.nombre}.pdf"
        )

        # # Actualizar estado de la cotización
        # cotizacion.estado = "enviada"
        # cotizacion.save()

        # Registrar el envío en `EnvioCorreoCotizacion`
        envio = EnvioCorreoCotizacion.objects.create(
            cotizacion=cotizacion, correos_externos=", ".join(copias)
        )
        if usuarios_empresa:
            envio.usuarios_destinatarios.add(*usuarios_empresa)
        envio.save()

        # Construir cuerpo del correo
        html_body = f"""
        <p>Estimado,</p>
        <p>Adjunto encontrará la cotización número <strong>{cotizacion.numero_cotizacion}</strong>.</p>
        <p>Fecha de vencimiento: {cotizacion.fecha_vencimiento.strftime('%Y-%m-%d') if cotizacion.fecha_vencimiento else 'N/A'}</p>
        <p>Observaciones: {cotizacion.observaciones}</p>
        <p>Para ver más detalles, haga clic en el siguiente enlace:</p>
        """

        # URL del frontend para ver la cotización
        url_cotizacion = f"{os.getenv('FRONTEND_URL')}/cotizacion/detalle-cotizacion/{cotizacion.numero_cotizacion}"

        # Enviar correo con el PDF adjunto
        resultado = send_email_task.delay(
            subject=f"Cotización N°{cotizacion.numero_cotizacion} - {cotizacion.nombre}",
            recipient_list=correos_cc,
            html_body=html_body,
            titulo=f"Cotización {cotizacion.numero_cotizacion}",
            url_boton=url_cotizacion,
            text_boton="Ver Cotización",
            # cc=correos_cc,  # Correos en copia (usuarios + copias externas)
            pdf_attachment=(pdf_filename, pdf_bytes),  # Adjuntar PDF
        )

        return Response(
            {"detail": "Cotización enviada exitosamente."}, status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"], url_path="enviar-cotizacion-solicitantes")
    def enviar_cotizacion_solicitantes(self, request, pk=None):
        """
        Action similar a 'enviar-cotizacion', pero en lugar de recibir los correos
        desde el request, se obtienen de los solicitantes asociados.

        Primero se envía el correo (llamando a send_email_task.delay) y luego,
        de manera exitosa, se actualiza el estado de la cotización y se registra el envío.
        Esto permite que si el envío falla, el estado no se actualice y se pueda reintentar.
        """
        cotizacion = get_object_or_404(Cotizacion, pk=pk)

        # Validación de Fecha Futura
        hoy = timezone.localdate()
        if cotizacion.fecha_facturacion and cotizacion.fecha_facturacion > hoy:
            return Response(
                {"detail": "No se puede enviar una cotización con fecha de facturación futura. Espere a la fecha indicada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Recopilar los correos de los solicitantes
        solicitantes = cotizacion.solicitantes.all()
        correos_solicitantes = [
            solicitante.usuario.email
            for solicitante in solicitantes
            if solicitante.content_type.model.lower() == "solicitanteexterno"
            and hasattr(solicitante.usuario, "email")
            and solicitante.usuario.email
        ]
        correos_usuarios = [
            solicitante.usuario.usuario.email
            for solicitante in solicitantes
            if solicitante.content_type.model.lower() == "usuarioempresa"
            and hasattr(solicitante.usuario.usuario, "email")
            and solicitante.usuario.usuario.email
        ]

        # Combinar ambas listas de correos y eliminar duplicados
        recipient_emails = list(set(correos_solicitantes + correos_usuarios))
        if not recipient_emails:
            return Response(
                {"detail": "No se encontraron correos válidos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pdf_bytes = generar_pdf_cotizacion_desde_model(cotizacion_id=cotizacion.pk)
        pdf_filename = (
            f"Coti_{cotizacion.numero_cotizacion}_{cotizacion.cliente.nombre}.pdf"
        )

        # Construir el cuerpo del correo
        html_body = f"""
        <p>Estimado,</p>
        <p>Adjunto encontrará la cotización número <strong>{cotizacion.numero_cotizacion}</strong>.</p>
        <p>Fecha de vencimiento: {cotizacion.fecha_vencimiento.strftime('%Y-%m-%d') if cotizacion.fecha_vencimiento else 'N/A'}</p>
        <p>Observaciones: {cotizacion.observaciones}</p>
        <p>Para ver más detalles, haga clic en el siguiente enlace:</p>
        """
        url_cotizacion = (
            f"{os.getenv('FRONTEND_URL')}/cotizacion/detalle-cotizacion/{cotizacion.numero_cotizacion}"
        )

        try:
            send_email_task.delay(
                subject=f"Cotización N°{cotizacion.numero_cotizacion} - {cotizacion.nombre}",
                recipient_list=recipient_emails,
                html_body=html_body,
                titulo=f"Cotización {cotizacion.numero_cotizacion}",
                url_boton=url_cotizacion,
                text_boton="Ver Cotización",
                cc=[],
                pdf_attachment=(pdf_filename, pdf_bytes),
                on_success_cotizacion_id=cotizacion.pk,
                on_success_correos_externos=recipient_emails,
            )
        except (OperationalError, CeleryError) as exc:
            logger.error(
                "No se pudo encolar el envío de correo de cotización",
                exc_info=exc,
            )
            return Response(
                {
                    "detail": "No se pudo programar el envío. Verifique que Celery y Redis estén disponibles."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {"detail": "Cotización enviada y registrada exitosamente."},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="aprobar-cotizacion")
    def aprobar_cotizacion(self, request, pk=None):
        """
        Aprueba la cotización y sus componentes.

        Body esperado:
        {
          "solicitante_id": 123,
          "fecha_aprobacion": "2025-04-29",
          "item_ids": [1, 2, 3]
        }
        """
        cotizacion = self.get_object()

        # Validación de Fecha Futura
        hoy = timezone.localdate()
        if cotizacion.fecha_facturacion and cotizacion.fecha_facturacion > hoy:
            return Response(
                {"detail": "No se puede aprobar una cotización con fecha de facturación futura. Espere a la fecha indicada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------- Validaciones básicas --------
        solicitante_id = request.data.get("solicitante_id")
        fecha_aprobacion = request.data.get("fecha_aprobacion")
        item_ids = request.data.get("item_ids", [])

        if not solicitante_id or not fecha_aprobacion:
            return Response(
                {"detail": "solicitante_id y fecha_aprobacion son obligatorios."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(item_ids, list):
            return Response(
                {"detail": "item_ids debe ser una lista."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            solicitante = SolicitanteCotizacion.objects.get(id=solicitante_id)
        except SolicitanteCotizacion.DoesNotExist:
            return Response(
                {"detail": "Solicitante no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            fecha_aprobacion_dt = datetime.strptime(fecha_aprobacion, "%Y-%m-%d")
        except ValueError:
            return Response(
                {"detail": "Formato de fecha incorrecto. Use AAAA-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------- Lógica principal (atómica) --------
        with transaction.atomic():
            # 1. Solicitante
            solicitante.fecha_aprobacion = fecha_aprobacion_dt
            solicitante.aprobo = True
            solicitante.save(update_fields=["fecha_aprobacion", "aprobo"])

            # 2. Items
            cotizacion.items.all().update(aprobado=False)
            items = ItemCotizacion.objects.select_for_update().filter(id__in=item_ids)
            for item in items:
                # Crear o vincular ItemEmpresa si no existe
                if item.item_empresa is None:
                    item_empresa, _created = ItemEmpresa.objects.get_or_create(
                        nombre=item.nombre or f"ItemCotizacion {item.id}",
                        empresa=cotizacion.empresa,
                        defaults={"descripcion_corta": (item.descripcion or "")[:45]},
                    )
                    # asociar proveedor si existe
                    if item.proveedor_empresa:
                        item_empresa.proveedores_empresa.add(item.proveedor_empresa)

                    item.item_empresa = item_empresa  # relacionar

                item.aprobado = True
                item.save(update_fields=["aprobado", "item_empresa"])

            # 3. Cotización
            cotizacion.estado = "aceptada"
            cotizacion.save(update_fields=["estado"])

        return Response(
            {"detail": "Cotización aprobada y items actualizados correctamente."},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="ordenes-compras")
    def ordenes_compras(self, request, pk=None):
        cotizacion = self.get_object()
        ordenes = OrdenCompra.objects.filter(relacion_cotizacion=cotizacion)
        serializer = OrdenCompraSerializer(
            ordenes, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="items-resumen")
    def items_resumen(self, request, pk=None):
        """
        Retorna un resumen de items con cantidad pedida y recibida (segÃºn recepciones).
        """
        cotizacion = self.get_object()
        items = list(cotizacion.items.select_related("item_empresa"))
        item_empresa_ids = [item.item_empresa_id for item in items if item.item_empresa_id]
        if not item_empresa_ids:
            data = [
                {
                    "id": item.id,
                    "item_id": item.item_empresa_id,
                    "item_nombre": item.item_empresa.nombre if item.item_empresa else (item.nombre or "Sin nombre"),
                    "cantidad_pedida": item.cantidad,
                    "cantidad_recibida": 0,
                }
                for item in items
            ]
            return Response(data, status=status.HTTP_200_OK)

        item_oc_rows = ItemEnOrdenCompra.objects.filter(
            orden_compra__relacion_cotizacion=cotizacion,
            item_id__in=item_empresa_ids,
        ).values("id", "item_id")
        item_oc_ids = [row["id"] for row in item_oc_rows]
        item_oc_to_item = {row["id"]: row["item_id"] for row in item_oc_rows}

        recibidos_por_item = {item_id: 0 for item_id in item_empresa_ids}
        if item_oc_ids:
            ct_item_oc = ContentType.objects.get_for_model(ItemEnOrdenCompra)
            oc_stock_rows = ItemOrdenCompraEnStock.objects.filter(
                content_type=ct_item_oc,
                item_oc_id__in=item_oc_ids,
            ).values("id", "item_oc_id")
            oc_stock_to_item = {
                row["id"]: item_oc_to_item.get(row["item_oc_id"]) for row in oc_stock_rows
            }
            oc_stock_ids = list(oc_stock_to_item.keys())
            if oc_stock_ids:
                ct_oc_stock = ContentType.objects.get_for_model(ItemOrdenCompraEnStock)
                movs = MovimientoStock.objects.filter(
                    content_type=ct_oc_stock,
                    object_id__in=oc_stock_ids,
                    tipo_movimiento="ENTRADA",
                ).values("object_id").annotate(total=Sum("cantidad"))
                for row in movs:
                    item_id = oc_stock_to_item.get(row["object_id"])
                    if item_id:
                        recibidos_por_item[item_id] = recibidos_por_item.get(item_id, 0) + (row["total"] or 0)

        data = []
        for item in items:
            item_id = item.item_empresa_id
            data.append(
                {
                    "id": item.id,
                    "item_id": item_id,
                    "item_nombre": item.item_empresa.nombre if item.item_empresa else (item.nombre or "Sin nombre"),
                    "cantidad_pedida": item.cantidad,
                    "cantidad_recibida": recibidos_por_item.get(item_id, 0) if item_id else 0,
                }
            )
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="crear-orden-compra")
    def crear_orden_compra(self, request, pk=None):
        cotizacion = self.get_object()
        proveedor_id = request.data.get("proveedor_id")
        if not proveedor_id:
            return Response(
                {"error": "El campo 'proveedor_id' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            proveedor = ProveedorEmpresa.objects.get(pk=proveedor_id)
        except ProveedorEmpresa.DoesNotExist:
            return Response(
                {"error": "Proveedor no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )
        usuario_empresa = obtener_usuario_empresa(request.user)
        try:
            orden = crear_orden_compra_para_proveedor(
                cotizacion, proveedor, usuario_empresa
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        if orden is None:
            return Response(
                {
                    "error": "Ya existe una orden de compra para este proveedor y cotización."
                },
                status=status.HTTP_409_CONFLICT,
            )
        serializer = OrdenCompraSerializer(orden, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="crear-ordenes-compra-multiples")
    @transaction.atomic
    def crear_ordenes_compra_multiples(self, request, pk=None):
        cotizacion = self.get_object()
        usuario_empresa = obtener_usuario_empresa(request.user)
        # Extraer proveedores únicos de los items válidos
        proveedores_ids = (
            cotizacion.items.filter(
                proveedor_empresa__isnull=False, item_empresa__isnull=False
            )
            .values_list("proveedor_empresa", flat=True)
            .distinct()
        )
        ocs_creadas = []
        ocs_existentes = []
        for proveedor_id in proveedores_ids:
            try:
                proveedor = ProveedorEmpresa.objects.get(pk=proveedor_id)
            except ProveedorEmpresa.DoesNotExist:
                continue
            orden = crear_orden_compra_para_proveedor(
                cotizacion, proveedor, usuario_empresa
            )
            if orden is None:
                ocs_existentes.append(proveedor_id)
            else:
                ocs_creadas.append(orden)
        serializer = OrdenCompraSerializer(
            ocs_creadas, many=True, context={"request": request}
        )
        return Response(
            {
                "ordenes_creadas": serializer.data,
                "proveedores_existentes": ocs_existentes,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="descargar-pdf")
    def descargar_pdf(self, request, pk=None):
        """
        Permite descargar el PDF de una cotización.
        GET /api/cotizaciones/{pk}/descargar-pdf/
        """
        cotizacion = get_object_or_404(Cotizacion, pk=pk)

        # # 1. Armar el dict de datos para la función
        # datos_cotizacion = {
        #     "numero_cotizacion": cotizacion.numero_cotizacion,
        #     "fecha_vencimiento": cotizacion.fecha_vencimiento.strftime('%Y-%m-%d') if cotizacion.fecha_vencimiento else 'N/A',
        #     "estado": cotizacion.estado,
        #     "total_estimado": float(cotizacion.total_estimado),
        #     "observaciones": cotizacion.observaciones or "",
        #     "items": [
        #         {
        #             "nombre": item.item_empresa.nombre if item.item_empresa else item.nombre,
        #             # "descripcion": item.item_empresa.descripcion_corta if item.item_empresa else item.descripcion,
        #             "descripcion": item.descripcion,
        #             "cantidad": item.cantidad,
        #             "precio_unitario": float(item.precio_unitario),
        #             "costo_total": float(item.costo_total),
        #         }
        #         for item in cotizacion.detalles.all()
        #     ],
        # }

        # # 2. Extraer datos de empresa y cliente
        # empresa = cotizacion.empresa
        # cliente = cotizacion.cliente

        # nombre_empresa    = empresa.nombre
        # rut_empresa       = getattr(empresa, 'rut_empresa', '')
        # direccion_empresa = getattr(empresa, 'direccion', '')
        # telefono_empresa  = getattr(empresa, 'telefono', '')
        # email_empresa     = getattr(empresa, 'email', '')
        # sitio_web_empresa = getattr(empresa, 'sitio_web', '')

        # nombre_cliente    = cliente.nombre
        # rut_cliente       = getattr(cliente, 'rut_empresa', '')
        # direccion_cliente = getattr(cliente, 'direccion', '')
        # telefono_cliente  = getattr(cliente, 'telefono', '')
        # email_cliente     = getattr(cliente, 'email', '')

        # # 3. Generar el PDF en memoria
        # pdf_bytes = generar_pdf_cotizacion(
        #     datos_cotizacion,
        #     nombre_empresa, rut_empresa, direccion_empresa, telefono_empresa,
        #     email_empresa, sitio_web_empresa,
        #     nombre_cliente, telefono_cliente, direccion_cliente,
        #     rut_cliente, email_cliente
        # )

        pdf_bytes = generar_pdf_cotizacion_desde_model(cotizacion_id=cotizacion.pk)

        # 4. Construir la respuesta HTTP con adjunto
        filename = (
            f"Coti_{cotizacion.numero_cotizacion}_{cotizacion.cliente.nombre}.pdf"
        )
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=["get"], url_path=r"por-numero/(?P<numero>\d+)")
    def por_numero(self, request, numero=None):
        """
        GET /api/cotizaciones/por-numero/{numero}/
        Devuelve el detalle de la cotización cuyo numero_cotizacion coincida.
        """
        try:
            cot = self.get_queryset().get(numero_cotizacion=numero)
        except Cotizacion.DoesNotExist:
            return Response(
                {"detail": f"No existe cotización con número {numero}"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(cot)
        return Response(serializer.data)


class ItemCotizacionViewSet(viewsets.ModelViewSet):
    serializer_class = ItemCotizacionSerializer
    queryset = ItemCotizacion.objects.all()

    def get_queryset(self):
        cotizacion_id = self.kwargs.get(
            "cotizacion_pk"
        )  # Obtener el ID de la cotización desde la URL
        if cotizacion_id:
            return ItemCotizacion.objects.filter(cotizacion_id=cotizacion_id)
        return (
            ItemCotizacion.objects.all()
        )  # Retorna todos los items si no es una vista anidada

    def perform_create(self, serializer):
        """Interceptar la creación para agregar seguimiento"""
        item = serializer.save()
        usuario_empresa = UsuarioEmpresa.objects.get(usuario=self.request.user)

        nombre_item = item.nombre
        if not nombre_item and item.item_empresa:
            nombre_item = item.item_empresa.nombre

        crear_seguimiento_cotizacion(
            cotizacion_id=item.cotizacion.id,
            usuario_id=usuario_empresa.id,
            comentario=f'Item "{nombre_item or "Desconocido"}" añadido.',
        )

    def perform_update(self, serializer):
        """Interceptar la edición para agregar seguimiento"""
        item = serializer.save()
        usuario_empresa = UsuarioEmpresa.objects.get(usuario=self.request.user)

        nombre_item = item.nombre
        if not nombre_item and item.item_empresa:
            nombre_item = item.item_empresa.nombre

        crear_seguimiento_cotizacion(
            cotizacion_id=item.cotizacion.id,
            usuario_id=usuario_empresa.id,
            comentario=f'Item "{nombre_item or "Desconocido"}" actualizado.',
        )

    def perform_destroy(self, instance):
        usuario_empresa = UsuarioEmpresa.objects.get(usuario=self.request.user)

        nombre_item = instance.nombre
        if not nombre_item and instance.item_empresa:
            nombre_item = instance.item_empresa.nombre

        crear_seguimiento_cotizacion(
            cotizacion_id=instance.cotizacion.id,
            usuario_id=usuario_empresa.id,
            comentario=f'Item "{nombre_item or "Desconocido"}" eliminado.',
        )
        return super().perform_destroy(instance)


class SeguimientoCotizacionViewSet(viewsets.ModelViewSet):
    serializer_class = SeguimientoCotizacionSerializer
    queryset = SeguimientoCotizacion.objects.all()

    def get_queryset(self):
        cotizacion_id = self.kwargs.get(
            "cotizacion_pk"
        )  # Obtener el ID de la cotización desde la URL
        if cotizacion_id:
            return SeguimientoCotizacion.objects.filter(cotizacion_id=cotizacion_id)
        return (
            SeguimientoCotizacion.objects.all()
        )  # Retorna todos los seguimientos si no es una vista anidada


class SolicitanteCotizacionViewSet(viewsets.ModelViewSet):
    serializer_class = SolicitanteCotizacionSerializer
    queryset = SolicitanteCotizacion.objects.all()

    def get_queryset(self):
        queryset = SolicitanteCotizacion.objects.all()
        cotizacion_pk = self.kwargs.get("cotizacion_pk")
        if cotizacion_pk:
            queryset = queryset.filter(cotizacion_id=cotizacion_pk)
        return queryset

    @action(detail=False, methods=["get"], url_path="sin-relacionar")
    def sin_relacionar(self, request, *args, **kwargs):
        cotizacion_pk = self.kwargs.get("cotizacion_pk")
        if not cotizacion_pk:
            return Response(
                {"detail": "Cotización no especificada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cotizacion = get_object_or_404(Cotizacion, pk=cotizacion_pk)

        # Se filtran los solicitantes asociados a la cotización que sean de tipo 'usuarioempresa'
        solicitantes = SolicitanteCotizacion.objects.filter(
            cotizacion_id=cotizacion_pk, content_type__model="usuarioempresa"
        )
        # Se obtienen los IDs de los usuarios relacionados
        usuario_ids = solicitantes.values_list("usuario_id", flat=True)

        # Se obtienen los usuarios empresa que NO están relacionados con la cotización
        usuarios = UsuarioEmpresa.objects.filter(
            sucursal__empresa_id=cotizacion.cliente
        ).exclude(id__in=usuario_ids)
        serializer = UsuarioEmpresaSerializer(usuarios, many=True)
        return Response(serializer.data)


class SolicitanteExternoViewSet(viewsets.ModelViewSet):
    serializer_class = SolicitanteExternoSerializer
    queryset = SolicitanteExterno.objects.all()


