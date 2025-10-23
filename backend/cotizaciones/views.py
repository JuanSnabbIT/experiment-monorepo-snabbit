import os
from core.tasks import send_email_task
from empresas.models import UsuarioEmpresa, Empresa
from .serializers import *
from rest_framework import viewsets, status
from .models import Cotizacion, ItemCotizacion, SeguimientoCotizacion
from rest_framework.decorators import action
from rest_framework.response import Response
from core.models import PersonalizacionUsuario
from django.shortcuts import get_object_or_404
from .functions import crear_seguimiento_cotizacion, generar_pdf_cotizacion, generar_pdf_cotizacion_desde_model
from cuentas.functions import obtener_usuario_empresa
from empresas.models import UsuarioEmpresa
from empresas.serializers import UsuarioEmpresaSerializer
from datetime import datetime
from bodegas.models import OrdenCompra, ItemEnOrdenCompra
from bodegas.serializers import OrdenCompraSerializer
from items.models import ProveedorEmpresa
from django.db import transaction
from items.models import ItemEmpresa
from django.http import HttpResponse


class CotizacionViewSet(viewsets.ModelViewSet):
    queryset = Cotizacion.objects.prefetch_related('items', 'seguimientos')
    serializer_class = CotizacionSerializer

    def perform_create(self, serializer):
        """Interceptar la creación para agregar seguimiento"""
        cotizacion = serializer.save()
        usuario_empresa = UsuarioEmpresa.objects.get(usuario=self.request.user)
        crear_seguimiento_cotizacion(
            cotizacion_id=cotizacion.id,
            usuario_id=usuario_empresa.id,
            comentario=f"Cotización {cotizacion.numero_cotizacion} creada."
        )

    def perform_update(self, serializer):
        """Interceptar la edición para agregar seguimiento"""
        cotizacion = serializer.save()
        usuario_empresa = UsuarioEmpresa.objects.get(usuario=self.request.user)
        crear_seguimiento_cotizacion(
            cotizacion_id=cotizacion.id,
            usuario_id=usuario_empresa.id,
            comentario=f"Cotización {cotizacion.numero_cotizacion} actualizada."
        )

    @action(detail=False, methods=['get'], url_path='cotizaciones-empresa')
    def cotizaciones_empresa(self, request):
        usuario = request.user
        try:
            personalizacion = PersonalizacionUsuario.objects.get(usuario=usuario)
            empresa = personalizacion.sucursal_principal
            if not empresa:
                return Response({"detail": "Empresa principal no seleccionada."}, status=400)
            empresa = get_object_or_404(Empresa, pk=empresa.pk)  # Asegúrate de que sea una instancia de Empresa
        except PersonalizacionUsuario.DoesNotExist:
            return Response({"detail": "Personalización del usuario no encontrada."}, status=404)

        cotizaciones = self.queryset.filter(empresa=empresa)
        serializer = self.get_serializer(cotizaciones, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='enviar-cotizacion')
    def enviar_cotizacion(self, request, pk=None):
        """
        Permite enviar una cotización por correo, adjuntando el PDF y guardando los destinatarios en el modelo.

        Requiere en el body:
        - `copias`: Lista de correos en copia (`CC`).
        - `usuarios_empresa`: Lista de `pks` de usuarios de empresa a guardar en `EnvioCorreoCotizacion` y agregar en copia.
        """
        cotizacion = get_object_or_404(Cotizacion, pk=pk)

        # Obtener datos desde el request
        # email_principal = request.data.get("email_principal")
        copias = request.data.get("copias", [])  # Lista de correos en CC
        usuarios_empresa_pks = request.data.get("usuarios_empresa", [])  # Pks de usuarios
        usuarios_empresa_pks = [int(pk) for pk in usuarios_empresa_pks if str(pk).isdigit()]

        # if not email_principal:
        #     return Response({"detail": "El correo principal es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

        # correos_usuarios_empresa = []
        correos_cc = []
        usuarios_empresa = None
        if usuarios_empresa_pks:
            # Obtener usuarios de empresa si se enviaron pks
            usuarios_empresa = UsuarioEmpresa.objects.filter(pk__in=usuarios_empresa_pks)
            correos_cc = [user.usuario.email for user in usuarios_empresa if user.usuario.email]

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
        pdf_filename = f"Coti_{cotizacion.numero_cotizacion}_{cotizacion.cliente.nombre}.pdf"

        # # Actualizar estado de la cotización
        # cotizacion.estado = "enviada"
        # cotizacion.save()

        # Registrar el envío en `EnvioCorreoCotizacion`
        envio = EnvioCorreoCotizacion.objects.create(cotizacion=cotizacion, correos_externos=", ".join(copias))
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
            pdf_attachment=(pdf_filename, pdf_bytes)  # Adjuntar PDF
        )

        return Response({"detail": "Cotización enviada exitosamente."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='enviar-cotizacion-solicitantes')
    def enviar_cotizacion_solicitantes(self, request, pk=None):
        """
        Action similar a 'enviar-cotizacion', pero en lugar de recibir los correos
        desde el request, se obtienen de los solicitantes asociados.
        
        Primero se envía el correo (llamando a send_email_task.delay) y luego,
        de manera exitosa, se actualiza el estado de la cotización y se registra el envío.
        Esto permite que si el envío falla, el estado no se actualice y se pueda reintentar.
        """
        cotizacion = get_object_or_404(Cotizacion, pk=pk)

        # Recopilar los correos de los solicitantes
        solicitantes = cotizacion.solicitantes.all()
        correos_solicitantes = [
            solicitante.usuario.email 
            for solicitante in solicitantes
            if solicitante.content_type.model.lower() == 'solicitanteexterno'
               and hasattr(solicitante.usuario, 'email') 
               and solicitante.usuario.email
        ]
        correos_usuarios = [
            solicitante.usuario.usuario.email 
            for solicitante in solicitantes
            if solicitante.content_type.model.lower() == 'usuarioempresa'
               and hasattr(solicitante.usuario.usuario, 'email') 
               and solicitante.usuario.usuario.email
        ]

        # Combinar ambas listas de correos y eliminar duplicados
        recipient_emails = list(set(correos_solicitantes + correos_usuarios))
        if not recipient_emails:
            return Response({"detail": "No se encontraron correos válidos."}, status=status.HTTP_400_BAD_REQUEST)

        # # Preparar los datos para el PDF y el cuerpo del correo
        # datos_cotizacion = {
        #     "numero_cotizacion": cotizacion.numero_cotizacion,
        #     "fecha_vencimiento": cotizacion.fecha_vencimiento.strftime('%Y-%m-%d') if cotizacion.fecha_vencimiento else 'N/A',
        #     "estado": cotizacion.estado,
        #     "total_estimado": f"${cotizacion.total_estimado:.2f}",
        #     "observaciones": cotizacion.observaciones or "",
        #     "items": [
        #         {
        #             "nombre": item.item_empresa.nombre if item.item_empresa else item.nombre,
        #             # "descripcion": item.item_empresa.descripcion_corta if item.item_empresa else item.descripcion,
        #             "descripcion": item.descripcion,
        #             "cantidad": item.cantidad,
        #             "precio_unitario": float(item.precio_unitario),
        #             "costo_total": float(item.costo_total)
        #         }
        #         for item in cotizacion.detalles.all()
        #     ]
        # }

        # # Datos de la empresa y del cliente
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
        pdf_filename = f"Coti_{cotizacion.numero_cotizacion}_{cotizacion.cliente.nombre}.pdf"

        # Construir el cuerpo del correo
        html_body = f"""
        <p>Estimado,</p>
        <p>Adjunto encontrará la cotización número <strong>{cotizacion.numero_cotizacion}</strong>.</p>
        <p>Fecha de vencimiento: {cotizacion.fecha_vencimiento.strftime('%Y-%m-%d') if cotizacion.fecha_vencimiento else 'N/A'}</p>
        <p>Observaciones: {cotizacion.observaciones}</p>
        <p>Para ver más detalles, haga clic en el siguiente enlace:</p>
        """
        url_cotizacion = f"{os.getenv('FRONTEND_URL')}/cotizacion/detalle-cotizacion/{cotizacion.numero_cotizacion}"

        # Primero, enviar el correo utilizando send_email_task.delay
        resultado = send_email_task.delay(
            subject=f"Cotización N°{cotizacion.numero_cotizacion} - {cotizacion.nombre}",
            recipient_list=recipient_emails,
            html_body=html_body,
            titulo=f"Cotización {cotizacion.numero_cotizacion}",
            url_boton=url_cotizacion,
            text_boton="Ver Cotización",
            cc=[],  # Todos los correos son destinatarios principales
            pdf_attachment=(pdf_filename, pdf_bytes)
        )

        # Solo si el envío se programa correctamente (la tarea es asíncrona), se procede a actualizar:
        cotizacion.estado = "enviada"
        cotizacion.save()

        envio = EnvioCorreoCotizacion.objects.create(
            cotizacion=cotizacion,
            correos_externos=", ".join(recipient_emails)
        )
        envio.save()

        return Response({"detail": "Cotización enviada y registrada exitosamente."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='aprobar-cotizacion')
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

        # -------- Validaciones básicas --------
        solicitante_id = request.data.get('solicitante_id')
        fecha_aprobacion = request.data.get('fecha_aprobacion')
        item_ids = request.data.get('item_ids', [])

        if not solicitante_id or not fecha_aprobacion:
            return Response(
                {"detail": "solicitante_id y fecha_aprobacion son obligatorios."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not isinstance(item_ids, list):
            return Response(
                {"detail": "item_ids debe ser una lista."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            solicitante = SolicitanteCotizacion.objects.get(id=solicitante_id)
        except SolicitanteCotizacion.DoesNotExist:
            return Response({"detail": "Solicitante no encontrado."},
                            status=status.HTTP_404_NOT_FOUND)

        try:
            fecha_aprobacion_dt = datetime.strptime(fecha_aprobacion, "%Y-%m-%d")
        except ValueError:
            return Response({"detail": "Formato de fecha incorrecto. Use AAAA-MM-DD."},
                            status=status.HTTP_400_BAD_REQUEST)

        # -------- Lógica principal (atómica) --------
        with transaction.atomic():
            # 1. Solicitante
            solicitante.fecha_aprobacion = fecha_aprobacion_dt
            solicitante.aprobo = True
            solicitante.save(update_fields=["fecha_aprobacion", "aprobo"])

            # 2. Items
            items = ItemCotizacion.objects.select_for_update().filter(id__in=item_ids)
            for item in items:
                # Crear o vincular ItemEmpresa si no existe
                if item.item_empresa is None:
                    item_empresa, _created = ItemEmpresa.objects.get_or_create(
                        nombre=item.nombre or f"ItemCotizacion {item.id}",
                        empresa=cotizacion.empresa,
                        defaults={
                            "descripcion_corta": (item.descripcion or "")[:45]
                        }
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
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['get'], url_path='ordenes-compras')
    def ordenes_compras(self, request, pk=None):
        cotizacion = self.get_object()
        ordenes = OrdenCompra.objects.filter(relacion_cotizacion=cotizacion)
        serializer = OrdenCompraSerializer(ordenes, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='crear-orden-compra')
    def crear_orden_compra(self, request, pk=None):
        cotizacion = self.get_object()

        # Obtener el proveedor_id enviado en el body del POST
        proveedor_id = request.data.get("proveedor_id")
        if not proveedor_id:
            return Response({"error": "El campo 'proveedor_id' es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

        # Validar que el proveedor exista
        try:
            proveedor = ProveedorEmpresa.objects.get(pk=proveedor_id)
        except ProveedorEmpresa.DoesNotExist:
            return Response({"error": "Proveedor no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # Filtrar los ítems de la cotización que tienen 'proveedor_empresa' y 'item_empresa' definidos,
        # y que su proveedor coincida con el proveedor indicado
        items_filtrados = cotizacion.detalles.filter(
            proveedor_empresa__isnull=False,
            item_empresa__isnull=False,
            proveedor_empresa=proveedor
        )

        if not items_filtrados.exists():
            return Response(
                {"error": "No se encontraron ítems que cumplan con las condiciones para este proveedor."},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario_empresa = obtener_usuario_empresa(request.user)

        # Crear la Orden de Compra
        # Se asume que oc_cliente y oc_empresa se obtienen de la cotización,
        # y que el usuario autenticado es el que crea la orden (creado_por)
        orden = OrdenCompra.objects.create(
            proveedor=proveedor,
            oc_cliente=cotizacion.cliente,
            oc_empresa=cotizacion.empresa,
            creado_por=usuario_empresa,
            relacion_cotizacion=cotizacion
        )

        # Para cada ítem filtrado, crear un ItemEnOrdenCompra
        for item in items_filtrados:
            # Se utiliza el item_empresa, la cantidad de la cotización y el precio unitario.
            # Nota: si 'precio_unitario' es Decimal y el modelo espera Integer, considera cómo manejar la conversión.
            ItemEnOrdenCompra.objects.create(
                orden_compra=orden,
                item=item.item_empresa,
                cantidad=item.cantidad,
                precio=int(item.precio_unitario)  # Puedes ajustar esta conversión si es necesario
            )

        # Serializar la orden creada y retornarla
        serializer = OrdenCompraSerializer(orden, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='descargar-pdf')
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
        filename = f"Coti_{cotizacion.numero_cotizacion}_{cotizacion.cliente.nombre}.pdf"
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get'], url_path=r'por-numero/(?P<numero>\d+)')
    def por_numero(self, request, numero=None):
        """
        GET /api/cotizaciones/por-numero/{numero}/
        Devuelve el detalle de la cotización cuyo numero_cotizacion coincida.
        """
        try:
            cot = self.get_queryset().get(numero_cotizacion=numero)
        except Cotizacion.DoesNotExist:
            return Response(
                {'detail': f'No existe cotización con número {numero}'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = self.get_serializer(cot)
        return Response(serializer.data)

class ItemCotizacionViewSet(viewsets.ModelViewSet):
    serializer_class = ItemCotizacionSerializer
    queryset = ItemCotizacion.objects.all()

    def get_queryset(self):
        cotizacion_id = self.kwargs.get('cotizacion_pk')  # Obtener el ID de la cotización desde la URL
        if cotizacion_id:
            return ItemCotizacion.objects.filter(cotizacion_id=cotizacion_id)
        return ItemCotizacion.objects.all()  # Retorna todos los items si no es una vista anidada

    def perform_create(self, serializer):
        """Interceptar la creación para agregar seguimiento"""
        item = serializer.save()
        usuario_empresa = UsuarioEmpresa.objects.get(usuario=self.request.user)
        crear_seguimiento_cotizacion(
            cotizacion_id=item.cotizacion.id,
            usuario_id=usuario_empresa.id,
            comentario=f"{item.nombre} creada."
        )

    def perform_update(self, serializer):
        """Interceptar la edición para agregar seguimiento"""
        item = serializer.save()
        usuario_empresa = UsuarioEmpresa.objects.get(usuario=self.request.user)
        crear_seguimiento_cotizacion(
            cotizacion_id=item.cotizacion.id,
            usuario_id=usuario_empresa.id,
            comentario=f"{item.nombre} actualizada."
        )

    def perform_destroy(self, instance):
        usuario_empresa = UsuarioEmpresa.objects.get(usuario=self.request.user)
        crear_seguimiento_cotizacion(
            cotizacion_id=instance.cotizacion.id,
            usuario_id=usuario_empresa.id,
            comentario=f"{instance.nombre} eliminado."
        )
        return super().perform_destroy(instance)

class SeguimientoCotizacionViewSet(viewsets.ModelViewSet):
    serializer_class = SeguimientoCotizacionSerializer
    queryset = SeguimientoCotizacion.objects.all()

    def get_queryset(self):
        cotizacion_id = self.kwargs.get('cotizacion_pk')  # Obtener el ID de la cotización desde la URL
        if cotizacion_id:
            return SeguimientoCotizacion.objects.filter(cotizacion_id=cotizacion_id)
        return SeguimientoCotizacion.objects.all()  # Retorna todos los seguimientos si no es una vista anidada

class SolicitanteCotizacionViewSet(viewsets.ModelViewSet):
    serializer_class = SolicitanteCotizacionSerializer
    queryset = SolicitanteCotizacion.objects.all()

    def get_queryset(self):
        queryset = SolicitanteCotizacion.objects.all()
        cotizacion_pk = self.kwargs.get('cotizacion_pk')
        if cotizacion_pk:
            queryset = queryset.filter(cotizacion_id=cotizacion_pk)
        return queryset

    @action(detail=False, methods=['get'], url_path='sin-relacionar')
    def sin_relacionar(self, request, *args, **kwargs):
        cotizacion_pk = self.kwargs.get('cotizacion_pk')
        if not cotizacion_pk:
            return Response({'detail': 'Cotización no especificada.'},
                            status=status.HTTP_400_BAD_REQUEST)

        cotizacion = get_object_or_404(Cotizacion, pk=cotizacion_pk)

        # Se filtran los solicitantes asociados a la cotización que sean de tipo 'usuarioempresa'
        solicitantes = SolicitanteCotizacion.objects.filter(
            cotizacion_id=cotizacion_pk,
            content_type__model='usuarioempresa'
        )
        # Se obtienen los IDs de los usuarios relacionados
        usuario_ids = solicitantes.values_list('usuario_id', flat=True)

        # Se obtienen los usuarios empresa que NO están relacionados con la cotización
        usuarios = UsuarioEmpresa.objects.filter(sucursal__empresa_id=cotizacion.cliente).exclude(id__in=usuario_ids)
        serializer = UsuarioEmpresaSerializer(usuarios, many=True)
        return Response(serializer.data)

class SolicitanteExternoViewSet(viewsets.ModelViewSet):
    serializer_class = SolicitanteExternoSerializer
    queryset = SolicitanteExterno.objects.all()

class ComentarioCotizacionViewSet(viewsets.ModelViewSet):
    serializer_class = ComentarioCotizacionSerializer
    queryset = ComentarioCotizacion.objects.all()

    def get_queryset(self):
        cotizacion_id = self.kwargs.get('cotizacion_pk')
        if cotizacion_id:
            return ComentarioCotizacion.objects.filter(cotizacion_id=cotizacion_id)
        return ComentarioCotizacion.objects.all()
