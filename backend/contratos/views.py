from rest_framework import viewsets, status, serializers
from django.db import models
from contratos.models import (
    ContratoEmpresaCliente,
    EnvioContratoAprobacion,
    EnvioContratoFirmaUsuario,
    UsuarioVinculadoContrato,
    ContratoServicio,
    ContratoVisita,
    ContratoLicencia,
    ContratoCondicionEspecial,
    AcuerdoConfidencialidadContrato,
    Servicio,
    PlanServicio,
    CaracteristicaServicio,
    UsuarioVinculadoLicencia,
    PersonaLicenciataria,
    CorreoPersonaLicenciataria,
    Visita,
    Licencia,
    CondicionEspecial,
    FacturaContrato,
)
from empresas.models import UsuarioEmpresa
from .serializers import (
    ContratoEmpresaClienteSerializer,
    EnvioContratoAprobacionSerializer,
    EnvioContratoFirmaUsuarioSerializer,
    # ContratoLicenciaVinculoUsuarioSerializer,
    UsuarioVinculadoContratoSerializer,
    ContratoServicioSerializer,
    ContratoVisitaSerializer,
    ContratoLicenciaSerializer,
    ContratoCondicionEspecialSerializer,
    AcuerdoConfidencialidadContratoSerializer,
    ServicioSerializer,
    PlanServicioSerializer,
    CaracteristicaServicioSerializer,
    UsuarioVinculadoLicenciaSerializer,
    PersonaLicenciatariaSerializer,
    CorreoPersonaLicenciatariaSerializer,
    VisitaSerializer,
    LicenciaSerializer,
    CondicionEspecialSerializer,
    FacturaContratoSerializer,
    LicenciaVinculadaPorUsuarioSerializer,
    ContratoVinculadoPorUsuarioSerializer,
)
from cuentas.functions import obtener_usuario_empresa
from rest_framework import permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.utils import OperationalError, ProgrammingError
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.contenttypes.models import ContentType
from django.http import HttpResponse, JsonResponse, Http404, HttpResponseBadRequest
from django.views.decorators.http import require_GET, require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from core.tasks import send_email_task
from .flow_helpers import (
    construir_pdf_contrato,
    enviar_correo_aprobacion,
    enviar_correo_firma,
    get_client_ip,
    marcar_envio,
    obtener_destinatario_principal,
    obtener_envio_aprobacion_pendiente,
    obtener_envio_firma_pendiente,
    preparar_documento_contrato,
)
import json
import os
from dotenv import load_dotenv
load_dotenv()


def _empresa_del_usuario(user):
    from core.models import PersonalizacionUsuario

    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    if personalizacion and personalizacion.sucursal_principal:
        return personalizacion.sucursal_principal.empresa
    return None


# ViewSet para Contrato (modelo padre)
class ContratoEmpresaClienteViewSet(viewsets.ModelViewSet):
    queryset = ContratoEmpresaCliente.objects.all()
    serializer_class = ContratoEmpresaClienteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _validar_contrato_editable(self, contrato):
        if contrato.puede_editar_contenido:
            return None
        return Response(
            {
                "detail": (
                    "El contrato no se puede editar mientras esta en revision del cliente, "
                    "aprobado para firma, en firma o finalizado."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    def get_queryset(self):
        """
        Filtrar contratos por empresa del usuario (multi-tenant).
        El usuario solo ve contratos donde su empresa es prestadora o cliente.
        """
        from core.models import PersonalizacionUsuario
        
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        
        if not personalizacion or not personalizacion.sucursal_principal:
            return ContratoEmpresaCliente.objects.none()
        
        empresa = personalizacion.sucursal_principal.empresa
        
        # Contratos donde la empresa es prestadora o cliente
        return ContratoEmpresaCliente.objects.filter(
            models.Q(empresa_prestadora=empresa) | models.Q(empresa_cliente=empresa)
        )

    def partial_update(self, request, *args, **kwargs):
        contrato = self.get_object()
        bloqueo = self._validar_contrato_editable(contrato)
        if bloqueo:
            return bloqueo
        return super().partial_update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        contrato = self.get_object()
        bloqueo = self._validar_contrato_editable(contrato)
        if bloqueo:
            return bloqueo
        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='filtrar-por-empresa-cliente/(?P<empresa_pk>[^/.]+)/(?P<cliente_pk>[^/.]+)')
    def filtrar_por_empresa_cliente(self, request, empresa_pk=None, cliente_pk=None):
        """
        Devuelve los contratos en los que:
         - `empresa_prestadora` coincide con `empresa_pk`
         - `empresa_cliente` coincide con `cliente_pk`
        """
        contratos = self.get_queryset().filter(
            empresa_prestadora_id=empresa_pk,
            empresa_cliente_id=cliente_pk
        )
        serializer = self.get_serializer(contratos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="cambiar-estado")
    def cambiar_estado(self, request, pk=None):
        """
        Cambia el estado de un contrato validando transiciones permitidas.
        Espera: { "estado": "activo" }
        
        Transiciones válidas:
        - borrador  → activo
        - activo    → suspendido, finalizado
        - suspendido → activo
        - finalizado → (sin transiciones, estado terminal)
        """
        contrato = self.get_object()
        nuevo_estado = request.data.get("estado")

        if not nuevo_estado:
            return Response(
                {"detail": 'Debe indicar el campo "estado".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        transiciones_validas = {
            "borrador": ["en_aprobacion_cliente"],
            "cambios_solicitados": ["en_aprobacion_cliente"],
            "en_aprobacion_cliente": ["aprobado_cliente", "cambios_solicitados"],
            "aprobado_cliente": ["en_firma"],
            "en_firma": ["activo"],
            "activo": ["suspendido", "finalizado"],
            "suspendido": ["activo"],
        }

        estados_permitidos = transiciones_validas.get(contrato.estado, [])
        if nuevo_estado not in estados_permitidos:
            return Response(
                {"detail": f"No se puede cambiar de '{contrato.get_estado_display()}' a '{nuevo_estado}'. "
                           f"Transiciones permitidas: {', '.join(estados_permitidos) if estados_permitidos else 'ninguna (estado terminal)'}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        contrato.estado = nuevo_estado
        contrato.save()
        return Response(self.get_serializer(contrato).data)

    @action(detail=True, methods=["post"], url_path="renovar")
    def renovar(self, request, pk=None):
        """
        Crea una copia (renovación) del contrato actual con estado 'borrador'.
        Duplica servicios, visitas, licencias, condiciones especiales y usuarios vinculados.
        Espera opcionalmente: { "fecha_inicio": "YYYY-MM-DD", "fecha_fin": "YYYY-MM-DD", "nombre": "..." }
        """
        contrato_original = self.get_object()

        if contrato_original.estado not in ("finalizado", "activo", "suspendido"):
            return Response(
                {"detail": "Solo se pueden renovar contratos activos, suspendidos o finalizados."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            nuevo_nombre = request.data.get("nombre", f"{contrato_original.nombre} (Renovación)")
            nueva_fecha_inicio = request.data.get("fecha_inicio")
            nueva_fecha_fin = request.data.get("fecha_fin")

            nuevo_contrato = ContratoEmpresaCliente.objects.create(
                empresa_prestadora=contrato_original.empresa_prestadora,
                empresa_cliente=contrato_original.empresa_cliente,
                fecha_inicio=nueva_fecha_inicio or contrato_original.fecha_fin or contrato_original.fecha_inicio,
                fecha_fin=nueva_fecha_fin,
                estado="borrador",
                observaciones=f"Renovación del contrato #{contrato_original.id} — {contrato_original.nombre}",
                nombre=nuevo_nombre,
                tipo=contrato_original.tipo,
            )

            # Duplicar servicios genéricos
            for cs in ContratoServicio.objects.filter(contrato=contrato_original):
                ContratoServicio.objects.create(
                    contrato=nuevo_contrato,
                    content_type=cs.content_type,
                    object_id=cs.object_id,
                    cantidad=cs.cantidad,
                    precio_unitario=cs.precio_unitario,
                )

            # Duplicar visitas
            for cv in ContratoVisita.objects.filter(contrato=contrato_original):
                ContratoVisita.objects.create(
                    contrato=nuevo_contrato,
                    visita=cv.visita,
                    frecuencia=cv.frecuencia,
                    cantidad=cv.cantidad,
                )

            # Duplicar licencias (sin fechas, para revisión)
            for cl in ContratoLicencia.objects.filter(contrato=contrato_original):
                ContratoLicencia.objects.create(
                    contrato=nuevo_contrato,
                    licencia=cl.licencia,
                    tipo_modalidad=cl.tipo_modalidad,
                    otro_tipo=cl.otro_tipo,
                    cantidad=cl.cantidad,
                    precio_unitario=cl.precio_unitario,
                    tipo_moneda=cl.tipo_moneda,
                    partner=cl.partner,
                )

            # Duplicar condiciones especiales
            for cce in ContratoCondicionEspecial.objects.filter(contrato=contrato_original):
                ContratoCondicionEspecial.objects.create(
                    contrato=nuevo_contrato,
                    condicion=cce.condicion,
                    texto=cce.texto,
                )

            # Duplicar usuarios vinculados
            for uv in UsuarioVinculadoContrato.objects.filter(contrato=contrato_original):
                UsuarioVinculadoContrato.objects.create(
                    usuario=uv.usuario,
                    contrato=nuevo_contrato,
                    tipo_usuario=uv.tipo_usuario,
                    nombre=uv.nombre,
                    correo_generico=uv.correo_generico,
                    es_destinatario_principal=uv.es_destinatario_principal,
                )

            # Duplicar acuerdos de confidencialidad
            for ac in AcuerdoConfidencialidadContrato.objects.filter(contrato=contrato_original):
                AcuerdoConfidencialidadContrato.objects.create(
                    contrato=nuevo_contrato,
                    acuerdo_base=ac.acuerdo_base,
                )

        return Response(
            self.get_serializer(nuevo_contrato).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['put'], url_path='actualizar')
    def actualizar(self, request, pk=None):
        """
        Actualiza tanto el modelo principal (ContratoEmpresaCliente) como 
        las tablas intermedias (ContratoVisita, ContratoLicencia, 
        ContratoCondicionEspecial, UsuarioVinculadoContrato).
        """
        with transaction.atomic():
            contrato = self.get_object()
            bloqueo = self._validar_contrato_editable(contrato)
            if bloqueo:
                return bloqueo

            # 1) ACTUALIZAR CAMPOS DEL CONTRATO PRINCIPAL
            contrato_data = request.data.get("contrato", {})
            # Usar partial=True para permitir actualizar parcialmente
            contrato_serializer = ContratoEmpresaClienteSerializer(
                contrato, 
                data=contrato_data, 
                partial=True
            )
            contrato_serializer.is_valid(raise_exception=True)
            contrato_serializer.save()

            # 2) ACTUALIZAR RELACIONES INTERMEDIAS

            # ============ CONTRATO VISITAS ============
            visitas_data = request.data.get("visitas", [])
            visitas_a_eliminar = request.data.get("eliminar_visitas", [])

            # Eliminar las visitas que llegan en la lista "eliminar_visitas"
            if visitas_a_eliminar:
                ContratoVisita.objects.filter(
                    pk__in=visitas_a_eliminar,
                    contrato=contrato
                ).delete()

            for item in visitas_data:
                if "id" in item:
                    # ACTUALIZAR VISITA EXISTENTE
                    try:
                        cv = ContratoVisita.objects.get(id=item["id"], contrato=contrato)
                    except ContratoVisita.DoesNotExist:
                        continue  # O lanza un error si prefieres
                    # No se permite cambiar "contrato" ni "visita". Ignoramos si vienen en el payload.
                    cv.frecuencia = item.get("frecuencia", cv.frecuencia)
                    cv.cantidad = item.get("cantidad", cv.cantidad)
                    cv.save()
                else:
                    # CREAR NUEVA VISITA
                    visita_id = item.get("visita_id")
                    if not visita_id:
                        continue  # O lanza un error si es requerido
                    try:
                        visita_obj = Visita.objects.get(pk=visita_id)
                    except Visita.DoesNotExist:
                        continue  # O lanza error

                    ContratoVisita.objects.create(
                        contrato=contrato,
                        visita=visita_obj,
                        frecuencia=item.get("frecuencia", "mensual"),
                        cantidad=item.get("cantidad", 1)
                    )

            # ============ CONTRATO LICENCIAS ============
            licencias_data = request.data.get("licencias", [])
            licencias_a_eliminar = request.data.get("eliminar_licencias", [])

            # Eliminar
            if licencias_a_eliminar:
                ContratoLicencia.objects.filter(
                    pk__in=licencias_a_eliminar,
                    contrato=contrato
                ).delete()

            for item in licencias_data:
                if "id" in item:
                    # ACTUALIZAR LICENCIA EXISTENTE
                    try:
                        cl = ContratoLicencia.objects.get(id=item["id"], contrato=contrato)
                    except ContratoLicencia.DoesNotExist:
                        continue
                    # No se permite cambiar "contrato" ni "licencia". Ignoramos si vienen en el payload.
                    cl.tipo_modalidad = item.get("tipo_modalidad", cl.tipo_modalidad)
                    cl.otro_tipo = item.get("otro_tipo", cl.otro_tipo)
                    cl.cantidad = item.get("cantidad", cl.cantidad)
                    cl.precio_unitario = item.get("precio_unitario", cl.precio_unitario)
                    cl.fecha_inicio = item.get("fecha_inicio", cl.fecha_inicio)
                    cl.fecha_fin = item.get("fecha_fin", cl.fecha_fin)
                    cl.tipo_moneda = item.get("tipo_moneda", cl.tipo_moneda)
                    try:
                        cl.save()
                    except DjangoValidationError as e:
                        raise serializers.ValidationError(
                            e.message_dict if hasattr(e, 'message_dict') else {'detail': e.messages}
                        )
                else:
                    # CREAR NUEVA
                    licencia_id = item.get("licencia_id")
                    if not licencia_id:
                        continue
                    try:
                        licencia_obj = Licencia.objects.get(pk=licencia_id)
                    except Licencia.DoesNotExist:
                        continue
                    try:
                        ContratoLicencia.objects.create(
                            contrato=contrato,
                            licencia=licencia_obj,
                            tipo_modalidad=item.get("tipo_modalidad", "otros"),
                            otro_tipo=item.get("otro_tipo", ""),
                            cantidad=item.get("cantidad", 1),
                            precio_unitario=item.get("precio_unitario", 0),
                            fecha_inicio=item.get("fecha_inicio", None),
                            fecha_fin=item.get("fecha_fin", None),
                            tipo_moneda=item.get("tipo_moneda", "USD")
                        )
                    except DjangoValidationError as e:
                        raise serializers.ValidationError(
                            e.message_dict if hasattr(e, 'message_dict') else {'detail': e.messages}
                        )

            # ============ CONTRATO CONDICIONES ESPECIALES ============
            condiciones_data = request.data.get("condiciones_especiales", [])
            condiciones_a_eliminar = request.data.get("eliminar_condiciones", [])

            # Eliminar
            if condiciones_a_eliminar:
                ContratoCondicionEspecial.objects.filter(
                    pk__in=condiciones_a_eliminar,
                    contrato=contrato
                ).delete()

            for item in condiciones_data:
                if "id" in item:
                    # Actualizar un registro existente
                    try:
                        cce = ContratoCondicionEspecial.objects.get(id=item["id"], contrato=contrato)
                    except ContratoCondicionEspecial.DoesNotExist:
                        continue
                    cce.save()
                else:
                    texto = item.get("texto")
                    condicion_id = item.get("condicion_id")
                    if texto:
                        # Condición de texto libre
                        ContratoCondicionEspecial.objects.create(
                            contrato=contrato,
                            texto=texto
                        )
                    elif condicion_id:
                        # Condición desde catálogo
                        try:
                            condicion_obj = CondicionEspecial.objects.get(pk=condicion_id)
                        except CondicionEspecial.DoesNotExist:
                            continue
                        ContratoCondicionEspecial.objects.create(
                            contrato=contrato,
                            condicion=condicion_obj
                        )

            # ============ USUARIOS VINCULADOS ============
            usuarios_data = request.data.get("usuarios_vinculados", [])
            usuarios_a_eliminar = request.data.get("eliminar_usuarios", [])

            # Eliminar
            if usuarios_a_eliminar:
                UsuarioVinculadoContrato.objects.filter(
                    pk__in=usuarios_a_eliminar,
                    contrato=contrato
                ).delete()

            for item in usuarios_data:
                if "id" in item:
                    # Actualizar
                    try:
                        uv = UsuarioVinculadoContrato.objects.get(id=item["id"], contrato=contrato)
                    except UsuarioVinculadoContrato.DoesNotExist:
                        continue
                    usuario_id = item.get("usuario_id")
                    nombre = item.get("nombre")
                    correo_generico = item.get("correo_generico")
                    if usuario_id:
                        try:
                            uv.usuario = UsuarioEmpresa.objects.get(pk=usuario_id)
                        except UsuarioEmpresa.DoesNotExist:
                            continue
                    elif nombre or correo_generico:
                        uv.usuario = None
                        uv.nombre = nombre
                        uv.correo_generico = correo_generico
                    uv.tipo_usuario = item.get("tipo_usuario", uv.tipo_usuario)
                    uv.es_destinatario_principal = item.get(
                        "es_destinatario_principal",
                        uv.es_destinatario_principal,
                    )
                    uv.save()
                else:
                    # Crear nuevo
                    usuario_id = item.get("usuario_id")
                    usuario_obj = None
                    if usuario_id:
                        try:
                            usuario_obj = UsuarioEmpresa.objects.get(pk=usuario_id)
                        except UsuarioEmpresa.DoesNotExist:
                            continue
                    UsuarioVinculadoContrato.objects.create(
                        usuario=usuario_obj,
                        contrato=contrato,
                        tipo_usuario=item.get("tipo_usuario", "gerencia"),
                        nombre=item.get("nombre"),
                        correo_generico=item.get("correo_generico"),
                        es_destinatario_principal=item.get("es_destinatario_principal", False),
                    )

            if usuarios_data and not contrato.vinculos_contrato.filter(
                es_destinatario_principal=True
            ).exists():
                raise serializers.ValidationError(
                    {
                        "usuarios_vinculados": (
                            "Debe existir exactamente un destinatario principal para el contrato."
                        )
                    }
                )

            # Al terminar todas las actualizaciones, retornamos el contrato ya refrescado.
            contrato.refresh_from_db()
            serializer_response = ContratoEmpresaClienteSerializer(contrato)
            return Response(serializer_response.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['put'], url_path='editar-servicios-genericos')
    def editar_servicios_genericos(self, request, pk=None):
        """
        Actualiza la relación 'servicios_genericos' (tabla intermedia ContratoServicio)
        para el contrato actual.

        Se espera recibir en el payload un JSON con la siguiente estructura:
        
        {
            "servicios_genericos": [
                {
                    "content_type": <id del ContentType>,       // Debe pertenecer a "servicio" o "planservicio"
                    "object_id": <id del servicio o plan>,
                    "cantidad": <cantidad opcional, default 1>,
                    "precio_unitario": <precio opcional, default 0>
                },
                ...
            ]
        }
        """
        contrato = self.get_object()
        bloqueo = self._validar_contrato_editable(contrato)
        if bloqueo:
            return bloqueo
        servicios_data = request.data.get("servicios_genericos")

        if servicios_data is None:
            return Response(
                {"detail": "No se proporcionaron datos para 'servicios_genericos'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(servicios_data, list):
            return Response(
                {"detail": "El campo 'servicios_genericos' debe ser una lista."},
                status=status.HTTP_400_BAD_REQUEST
            )

        allowed_models = ['servicio', 'planservicio']

        with transaction.atomic():
            # Eliminar las relaciones actuales para el contrato
            ContratoServicio.objects.filter(contrato=contrato).delete()

            for item in servicios_data:
                ct_id = item.get("content_type")
                object_id = item.get("object_id")
                if not ct_id or not object_id:
                    return Response(
                        {"detail": "Cada elemento debe contener 'content_type' y 'object_id'."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                try:
                    ct = ContentType.objects.get(id=ct_id)
                except ContentType.DoesNotExist:
                    return Response(
                        {"detail": f"No se encontró ContentType con id {ct_id}."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Validar que el ContentType pertenezca a los modelos permitidos
                if ct.model not in allowed_models:
                    return Response(
                        {"detail": f"El ContentType con id {ct_id} no pertenece a un modelo permitido (servicio, planservicio)."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                cantidad = item.get("cantidad", 1)
                precio_unitario = item.get("precio_unitario", 0)

                # Crear la nueva relación en la tabla intermedia
                ContratoServicio.objects.create(
                    contrato=contrato,
                    content_type=ct,
                    object_id=object_id,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario
                )

        contrato.refresh_from_db()
        serializer = ContratoEmpresaClienteSerializer(contrato)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        contrato = self.get_object()

        # Datos reales del cliente desde el contrato
        empresa_cliente = contrato.empresa_cliente
        empresa_prestadora = contrato.empresa_prestadora

        # Representantes legales de la empresa cliente
        representantes_cliente = getattr(empresa_cliente, 'representantes_legales', None)
        rep_legal_nombre = ""
        rep_legal_rut = ""
        if representantes_cliente and representantes_cliente.exists():
            rep = representantes_cliente.first()
            rep_legal_nombre = rep.usuario.get_nombre_completo() if hasattr(rep, 'usuario') else ""
            rep_legal_rut = ""

        datos_cliente = {
            'razon_social': empresa_cliente.nombre or '',
            'rut': getattr(empresa_cliente, 'rut_empresa', '') or '',
            'domicilio': getattr(empresa_cliente, 'direccion_principal', '') or '',
            'giro': '',
            'representante_legal': rep_legal_nombre,
            'rut_representante_legal': rep_legal_rut,
            'fono': getattr(empresa_cliente, 'telefono', '') or '',
            'email': getattr(empresa_cliente, 'email', '') or '',
        }

        # Representantes legales de la empresa prestadora
        representantes_prestadora = getattr(empresa_prestadora, 'representantes_legales', None)
        rep_prest_nombre = ""
        if representantes_prestadora and representantes_prestadora.exists():
            rep_p = representantes_prestadora.first()
            rep_prest_nombre = rep_p.usuario.get_nombre_completo() if hasattr(rep_p, 'usuario') else ""

        # Servicios contratados como lista de tareas
        servicios = ContratoServicio.objects.filter(contrato=contrato)
        lista_servicios = [cs.servicio_generico.nombre if cs.servicio_generico else f"Servicio #{cs.object_id}" for cs in servicios]

        # Valor mensual: suma de servicios
        valor_total = sum(float(cs.precio_unitario) * cs.cantidad for cs in servicios)

        datos_contrato = {
            'fecha': contrato.fecha_inicio.strftime('%d de %B del %Y') if contrato.fecha_inicio else '',
            'proveedor_razon_social': empresa_prestadora.nombre or '',
            'proveedor_rut': getattr(empresa_prestadora, 'rut_empresa', '') or '',
            'proveedor_direccion': getattr(empresa_prestadora, 'direccion_principal', '') or '',
            'proveedor_representante': rep_prest_nombre,
            'descripcion_plan': contrato.observaciones or 'Sin descripción adicional.',
            'valor_mensual': f"{valor_total:,.0f}",
            'descripcion_asesoria': contrato.observaciones or '',
            'forma_pago': '',
            'condiciones_generales': '\n'.join(
                [f"{cce.condicion.titulo}: {cce.condicion.descripcion}"
                 for cce in ContratoCondicionEspecial.objects.filter(contrato=contrato).select_related("condicion")]
            ) or 'Sin condiciones especiales.',
            'lista_tareas': lista_servicios if lista_servicios else ['Sin servicios asociados.'],
        }

        pdf_buffer = construir_pdf_contrato(contrato)
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="contrato_{contrato.id}_{contrato.nombre}.pdf"'
        return response

    @action(detail=True, methods=["post"], url_path="enviar-aprobacion")
    def enviar_aprobacion(self, request, pk=None):
        contrato = self.get_object()
        if contrato.estado not in ("borrador", "cambios_solicitados"):
            return Response(
                {"detail": "Solo se puede enviar a aprobacion desde borrador o cambios solicitados."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        destinatario = obtener_destinatario_principal(contrato)
        if not destinatario:
            return Response(
                {"detail": "Debe existir un destinatario principal antes de enviar a aprobacion."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        snapshot, pdf_bytes = preparar_documento_contrato(contrato, request=request)
        version = (contrato.envios_aprobacion.order_by("-version_envio").first().version_envio + 1) if contrato.envios_aprobacion.exists() else 1
        envio = EnvioContratoAprobacion.objects.create(
            contrato=contrato,
            destinatario=destinatario,
            snapshot_contrato=snapshot,
            pdf_congelado=pdf_bytes,
            version_envio=version,
        )
        marcar_envio(envio)
        envio.save(update_fields=["enviado", "fecha_envio"])
        enviar_correo_aprobacion(envio)

        contrato.estado = "en_aprobacion_cliente"
        contrato.save(update_fields=["estado", "fecha_modificacion"])
        return Response(
            EnvioContratoAprobacionSerializer(envio).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="reenviar-aprobacion")
    def reenviar_aprobacion(self, request, pk=None):
        contrato = self.get_object()
        envio = obtener_envio_aprobacion_pendiente(contrato)
        if not envio:
            return Response(
                {"detail": "No existe un envio de aprobacion pendiente para reenviar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        marcar_envio(envio)
        envio.save(update_fields=["enviado", "fecha_envio"])
        enviar_correo_aprobacion(envio)
        return Response({"detail": "Correo de aprobacion reenviado correctamente."})

    @action(detail=True, methods=["post"], url_path="enviar-firma")
    def enviar_firma(self, request, pk=None):
        contrato = self.get_object()
        if contrato.estado != "aprobado_cliente":
            return Response(
                {"detail": "Solo se puede enviar a firma cuando el contrato esta aprobado por el cliente."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        destinatario = obtener_destinatario_principal(contrato)
        if not destinatario:
            return Response(
                {"detail": "Debe existir un destinatario principal antes de enviar a firma."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        snapshot, pdf_bytes = preparar_documento_contrato(contrato, request=request)
        envio = EnvioContratoFirmaUsuario.objects.create(
            usuario=destinatario,
            snapshot_contrato=snapshot,
            pdf_congelado=pdf_bytes,
        )
        marcar_envio(envio)
        envio.save(update_fields=["enviado", "fecha_envio"])
        enviar_correo_firma(envio)

        contrato.estado = "en_firma"
        contrato.save(update_fields=["estado", "fecha_modificacion"])
        return Response(
            EnvioContratoFirmaUsuarioSerializer(envio).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="reenviar-firma")
    def reenviar_firma(self, request, pk=None):
        contrato = self.get_object()
        envio = obtener_envio_firma_pendiente(contrato)
        if not envio:
            return Response(
                {"detail": "No existe un envio de firma pendiente para reenviar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        marcar_envio(envio)
        envio.save(update_fields=["enviado", "fecha_envio"])
        enviar_correo_firma(envio)
        return Response({"detail": "Correo de firma reenviado correctamente."})

    @action(detail=False, methods=["get"], url_path="metricas-dashboard")
    def metricas_dashboard(self, request):
        """
        Endpoint para métricas del dashboard de contratos.
        
        Query params:
        - fecha_inicio: Fecha inicio del período (default: primer día del mes actual)
        - fecha_fin: Fecha fin del período (default: hoy)
        """
        from core.models import PersonalizacionUsuario
        from django.db.models import Count, Sum
        from datetime import date, timedelta
        
        # Obtener empresa del usuario
        personalizacion = PersonalizacionUsuario.objects.filter(
            usuario=request.user
        ).select_related("sucursal_principal__empresa").first()
        
        if not personalizacion or not personalizacion.sucursal_principal or not personalizacion.sucursal_principal.empresa:
            return Response(
                {"detail": "No se encontró empresa asociada al usuario"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        empresa_id = personalizacion.sucursal_principal.empresa.id
        hoy = date.today()
        
        # Queryset base para contratos de la empresa
        qs_contratos = ContratoEmpresaCliente.objects.filter(
            models.Q(empresa_prestadora_id=empresa_id) | 
            models.Q(empresa_cliente_id=empresa_id)
        )
        
        # 1. Conteo por estado
        conteo_estados = dict(qs_contratos.values_list("estado").annotate(count=Count("id")))
        estados_resultado = {
            "borrador": conteo_estados.get("borrador", 0),
            "activo": conteo_estados.get("activo", 0),
            "suspendido": conteo_estados.get("suspendido", 0),
            "finalizado": conteo_estados.get("finalizado", 0),
        }
        
        # 2. Contratos próximos a vencer (fecha_fin <= hoy+30, estado=activo)
        fecha_30_dias = hoy + timedelta(days=30)
        contratos_por_vencer = list(
            qs_contratos.filter(
                estado="activo",
                fecha_fin__isnull=False,
                fecha_fin__lte=fecha_30_dias,
                fecha_fin__gte=hoy
            ).values("id", "nombre", "empresa_cliente__nombre", "empresa_cliente", "fecha_fin")[:10]
        )
        contratos_por_vencer_resultado = [
            {
                "id": c["id"],
                "nombre": c["nombre"],
                "cliente": c["empresa_cliente__nombre"],
                "empresa_cliente": c["empresa_cliente"],
                "fecha_fin": c["fecha_fin"].isoformat() if c["fecha_fin"] else None,
                "dias_restantes": (c["fecha_fin"] - hoy).days if c["fecha_fin"] else None,
            }
            for c in contratos_por_vencer
        ]
        
        # 3. Contratos vencidos sin cerrar
        contratos_vencidos = qs_contratos.filter(
            estado="activo",
            fecha_fin__isnull=False,
            fecha_fin__lt=hoy
        ).count()
        
        # 4. Licencias próximas a vencer (usando fecha_fin de ContratoLicencia)
        licencias_por_vencer = list(
            ContratoLicencia.objects.filter(
                contrato__in=qs_contratos.filter(estado="activo"),
                fecha_fin__isnull=False,
                fecha_fin__lte=fecha_30_dias,
                fecha_fin__gte=hoy
            ).select_related("licencia", "contrato").values(
                "id",
                "licencia__nombre",
                "contrato__nombre",
                "fecha_fin"
            )[:10]
        )
        licencias_por_vencer_resultado = [
            {
                "id": l["id"],
                "nombre": l["licencia__nombre"],
                "contrato": l["contrato__nombre"],
                "fecha_vencimiento": l["fecha_fin"].isoformat() if l["fecha_fin"] else None,
                "dias_restantes": (l["fecha_fin"] - hoy).days if l["fecha_fin"] else None,
            }
            for l in licencias_por_vencer
        ]
        
        # 5. Firmas pendientes (EnvioContratoFirmaUsuario.usuario -> UsuarioVinculadoContrato.contrato)
        firmas_pendientes = EnvioContratoFirmaUsuario.objects.filter(
            usuario__contrato__in=qs_contratos,
            fecha_firma__isnull=True
        ).count()
        
        # 6. Top 5 clientes con más contratos
        top_clientes = list(
            qs_contratos.filter(empresa_prestadora_id=empresa_id)
            .values("empresa_cliente__id", "empresa_cliente__nombre")
            .annotate(total=Count("id"))
            .order_by("-total")[:5]
        )
        clientes_resultado = [
            {
                "id": c["empresa_cliente__id"],
                "nombre": c["empresa_cliente__nombre"],
                "total": c["total"]
            }
            for c in top_clientes
        ]
        
        return Response({
            "resumen": {
                "total_contratos": qs_contratos.count(),
                "contratos_activos": estados_resultado["activo"],
                "contratos_vencidos": contratos_vencidos,
                "firmas_pendientes": firmas_pendientes,
                "licencias_por_vencer": len(licencias_por_vencer_resultado),
            },
            "por_estado": estados_resultado,
            "contratos_por_vencer": contratos_por_vencer_resultado,
            "licencias_por_vencer": licencias_por_vencer_resultado,
            "top_clientes": clientes_resultado,
        })

    @action(detail=False, methods=['get'], url_path=r'por-usuario-empresa/(?P<usuario_empresa_pk>\d+)')
    def por_usuario_empresa(self, request, usuario_empresa_pk=None):
        """
        GET /api/contratos/por-usuario-empresa/{usuario_empresa_pk}/
        Retorna todos los contratos vinculados a un UsuarioEmpresa específico.
        """
        from core.models import PersonalizacionUsuario

        user = request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if not personalizacion or not personalizacion.sucursal_principal:
            return Response([], status=status.HTTP_200_OK)

        empresa = personalizacion.sucursal_principal.empresa
        vinculos = UsuarioVinculadoContrato.objects.filter(
            usuario_id=usuario_empresa_pk,
        ).filter(
            models.Q(contrato__empresa_prestadora=empresa) |
            models.Q(contrato__empresa_cliente=empresa)
        ).select_related(
            'contrato'
        ).order_by('-fecha_vinculacion')

        serializer = ContratoVinculadoPorUsuarioSerializer(vinculos, many=True)
        return Response(serializer.data)


class UsuarioVinculadoContratoViewSet(viewsets.ModelViewSet):
    serializer_class = UsuarioVinculadoContratoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        contrato_pk = self.kwargs.get('contrato_pk')
        if contrato_pk:
            return UsuarioVinculadoContrato.objects.filter(contrato_id=contrato_pk).select_related(
                'usuario',
                'usuario__usuario',
                'contrato',
            )
        return UsuarioVinculadoContrato.objects.none()

    def perform_create(self, serializer):
        contrato_pk = self.kwargs.get('contrato_pk')
        contrato = ContratoEmpresaCliente.objects.get(pk=contrato_pk)
        serializer.save(contrato=contrato)

class ContratoServicioViewSet(viewsets.ModelViewSet):
    serializer_class = ContratoServicioSerializer

    def get_queryset(self):
        contrato_pk = self.kwargs.get('contrato_pk')
        if contrato_pk:
            return ContratoServicio.objects.filter(contrato_id=contrato_pk)
        return ContratoServicio.objects.none()

    def perform_create(self, serializer):
        contrato_pk = self.kwargs.get('contrato_pk')
        contrato = ContratoEmpresaCliente.objects.get(pk=contrato_pk)
        serializer.save(contrato=contrato)

class ContratoVisitaViewSet(viewsets.ModelViewSet):
    serializer_class = ContratoVisitaSerializer

    def get_queryset(self):
        contrato_pk = self.kwargs.get('contrato_pk')
        if contrato_pk:
            return ContratoVisita.objects.filter(contrato_id=contrato_pk)
        return ContratoVisita.objects.none()

    def perform_create(self, serializer):
        contrato_pk = self.kwargs.get('contrato_pk')
        contrato = ContratoEmpresaCliente.objects.get(pk=contrato_pk)
        serializer.save(contrato=contrato)

class ContratoLicenciaViewSet(viewsets.ModelViewSet):
    serializer_class = ContratoLicenciaSerializer
    permission_classes = [permissions.IsAuthenticated]

    @staticmethod
    def _history_label(history_type):
        return {
            "+": "Creacion",
            "~": "Actualizacion",
            "-": "Eliminacion",
        }.get(history_type, "Cambio")

    @staticmethod
    def _safe_user_display(history_user):
        if not history_user:
            return None
        if hasattr(history_user, "get_nombre_completo"):
            nombre = history_user.get_nombre_completo()
            return nombre or str(history_user)
        return str(history_user)

    @staticmethod
    def _usuario_vinculado_display(registro):
        if getattr(registro, "correo_persona", None):
            persona = registro.correo_persona.persona
            nombre = persona.nombre if persona else None
            return nombre or registro.correo_persona.correo
        if getattr(registro, "usuario", None):
            user = registro.usuario.usuario
            return user.get_nombre_completo() or user.email or str(registro.usuario)
        return registro.nombre or registro.correo_generico or "Usuario externo"

    def _build_license_history_event(self, registro):
        return {
            "id": f"licencia-{registro.history_id}",
            "fecha": registro.history_date,
            "tipo": self._history_label(registro.history_type),
            "usuario": self._safe_user_display(registro.history_user),
            "cambios": registro.history_change_reason or "",
            "estado": registro.estado if hasattr(registro, "estado") else None,
            "cantidad": registro.cantidad if hasattr(registro, "cantidad") else None,
            "origen": "licencia",
            "detalle": "Cambio en la configuracion de la licencia",
        }

    def _build_link_history_event(self, registro):
        usuario_vinculado = self._usuario_vinculado_display(registro)
        accion = {
            "+": "Usuario vinculado",
            "~": "Vinculo actualizado",
            "-": "Usuario desvinculado",
        }.get(registro.history_type, "Cambio en vinculo")

        return {
            "id": f"vinculo-{registro.history_id}",
            "fecha": registro.history_date,
            "tipo": accion,
            "usuario": self._safe_user_display(registro.history_user),
            "cambios": registro.history_change_reason or f"{accion}: {usuario_vinculado}",
            "estado": None,
            "cantidad": None,
            "origen": "vinculo_usuario",
            "detalle": usuario_vinculado,
        }

    def get_queryset(self):
        contrato_pk = self.kwargs.get('contrato_pk')
        if contrato_pk:
            return ContratoLicencia.objects.filter(contrato_id=contrato_pk)

        # Multi-tenancy: filtrar por empresa del usuario autenticado
        from core.models import PersonalizacionUsuario
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if personalizacion and personalizacion.sucursal_principal:
            empresa = personalizacion.sucursal_principal.empresa
            return ContratoLicencia.objects.filter(
                models.Q(contrato__empresa_prestadora=empresa) |
                models.Q(contrato__empresa_cliente=empresa)
            )
        return ContratoLicencia.objects.none()

    def perform_create(self, serializer):
        contrato_pk = self.kwargs.get('contrato_pk')
        contrato = ContratoEmpresaCliente.objects.get(pk=contrato_pk)
        serializer.save(contrato=contrato)

    def partial_update(self, request, *args, **kwargs):
        """Permite editar individualmente solo la cantidad de cupos de la licencia."""
        instancia = self.get_object()
        campos_permitidos = {"cantidad"}
        campos_recibidos = set(request.data.keys())

        if "cantidad" not in request.data:
            return Response(
                {"detail": 'Debe indicar el campo "cantidad".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        campos_invalidos = campos_recibidos - campos_permitidos
        if campos_invalidos:
            return Response(
                {
                    "detail": (
                        "Desde este flujo solo se puede editar la cantidad de cupos."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(
            instancia,
            data={"cantidad": request.data.get("cantidad")},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='cambiar-estado')
    def cambiar_estado(self, request, pk=None, **kwargs):
        """Transiciona el estado de una ContratoLicencia según reglas de negocio."""
        from .estados_modelo import TRANSICIONES_ESTADO_LICENCIA

        obj = self.get_object()
        nuevo_estado = request.data.get('estado')

        if not nuevo_estado:
            return Response(
                {"detail": 'Debe indicar "estado".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        estados_permitidos = TRANSICIONES_ESTADO_LICENCIA.get(obj.estado, [])
        if nuevo_estado not in estados_permitidos:
            return Response(
                {"detail": f"No se puede cambiar de '{obj.get_estado_display()}' a '{nuevo_estado}'. "
                            f"Transiciones permitidas: {', '.join(estados_permitidos) or 'ninguna'}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if nuevo_estado == 'cancelada' and not obj.puede_cancelar:
            return Response(
                {
                    "detail": (
                        "Solo puedes cancelar la licencia dentro de los 7 días "
                        "posteriores al inicio del ciclo vigente."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        obj.estado = nuevo_estado
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['get'], url_path='historial')
    def historial(self, request, pk=None, **kwargs):
        """Retorna un timeline unificado de la licencia y sus vinculos de usuarios."""
        obj = self.get_object()
        licencia_eventos = [
            self._build_license_history_event(registro)
            for registro in obj.historia.all().order_by("-history_date")[:50]
        ]
        vinculo_eventos = [
            self._build_link_history_event(registro)
            for registro in UsuarioVinculadoLicencia.historia.filter(licencia_id=obj.pk).order_by("-history_date")[:50]
        ]
        data = sorted(
            licencia_eventos + vinculo_eventos,
            key=lambda evento: evento["fecha"],
            reverse=True,
        )[:50]
        return Response(data)

    @action(detail=False, methods=['get'], url_path=r'lista-vinculos/(?P<empresa_prestadora_pk>\d+)/(?P<empresa_cliente_pk>\d+)')
    def lista_vinculos(self, request, empresa_prestadora_pk=None, empresa_cliente_pk=None):
        """
        GET /contrato_licencias/activos/{empresa_prestadora_pk}/{empresa_cliente_pk}/
        """
        # 1) Filtramos contratos en estado activo y con ambas empresas
        contratos_activos = ContratoEmpresaCliente.objects.filter(
            estado='activo',
            empresa_prestadora_id=empresa_prestadora_pk,
            empresa_cliente_id=empresa_cliente_pk
        ).values_list('pk', flat=True)

        # 2) Obtenemos todas las licencias asociadas a esos contratos
        licencias = ContratoLicencia.objects.filter(contrato_id__in=contratos_activos)

        # 3) Serializamos y devolvemos
        serializer = self.get_serializer(licencias, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path=r'por-usuario-empresa/(?P<usuario_empresa_pk>\d+)')
    def por_usuario_empresa(self, request, usuario_empresa_pk=None, **kwargs):
        """
        GET /api/contrato-licencias/por-usuario-empresa/{usuario_empresa_pk}/
        Retorna todas las licencias vinculadas a un UsuarioEmpresa específico.
        """
        from core.models import PersonalizacionUsuario

        user = request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if not personalizacion or not personalizacion.sucursal_principal:
            return Response([], status=status.HTTP_200_OK)

        empresa = personalizacion.sucursal_principal.empresa
        vinculos = UsuarioVinculadoLicencia.objects.filter(
            usuario_id=usuario_empresa_pk,
        ).filter(
            models.Q(licencia__contrato__empresa_prestadora=empresa) |
            models.Q(licencia__contrato__empresa_cliente=empresa)
        ).select_related(
            'licencia', 'licencia__licencia', 'licencia__contrato'
        ).order_by('-fecha_asignacion')

        serializer = LicenciaVinculadaPorUsuarioSerializer(vinculos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='por-correo')
    def por_correo(self, request, **kwargs):
        correo = (request.query_params.get("correo") or "").strip().lower()
        if not correo:
            return Response({"detail": 'Debe indicar el query param "correo".'}, status=status.HTTP_400_BAD_REQUEST)

        empresa = _empresa_del_usuario(request.user)
        if not empresa:
            return Response([], status=status.HTTP_200_OK)

        vinculos = UsuarioVinculadoLicencia.objects.filter(
            correo_persona__empresa=empresa,
            correo_persona__correo_normalizado=correo,
        ).filter(
            models.Q(licencia__contrato__empresa_prestadora=empresa) |
            models.Q(licencia__contrato__empresa_cliente=empresa)
        ).select_related(
            'licencia', 'licencia__licencia', 'licencia__contrato', 'correo_persona'
        ).order_by('-fecha_asignacion')

        serializer = LicenciaVinculadaPorUsuarioSerializer(vinculos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path=r'por-persona/(?P<persona_pk>\d+)')
    def por_persona(self, request, persona_pk=None, **kwargs):
        empresa = _empresa_del_usuario(request.user)
        if not empresa:
            return Response([], status=status.HTTP_200_OK)

        vinculos = UsuarioVinculadoLicencia.objects.filter(
            correo_persona__persona_id=persona_pk,
            correo_persona__empresa=empresa,
        ).filter(
            models.Q(licencia__contrato__empresa_prestadora=empresa) |
            models.Q(licencia__contrato__empresa_cliente=empresa)
        ).select_related(
            'licencia', 'licencia__licencia', 'licencia__contrato', 'correo_persona__persona'
        ).order_by('-fecha_asignacion')

        serializer = LicenciaVinculadaPorUsuarioSerializer(vinculos, many=True)
        return Response(serializer.data)

class ContratoCondicionEspecialViewSet(viewsets.ModelViewSet):
    serializer_class = ContratoCondicionEspecialSerializer

    def get_queryset(self):
        contrato_pk = self.kwargs.get('contrato_pk')
        if contrato_pk:
            return ContratoCondicionEspecial.objects.filter(contrato_id=contrato_pk)
        return ContratoCondicionEspecial.objects.none()

    def perform_create(self, serializer):
        contrato_pk = self.kwargs.get('contrato_pk')
        contrato = ContratoEmpresaCliente.objects.get(pk=contrato_pk)
        serializer.save(contrato=contrato)

class AcuerdoConfidencialidadContratoViewSet(viewsets.ModelViewSet):
    serializer_class = AcuerdoConfidencialidadContratoSerializer

    def get_queryset(self):
        contrato_pk = self.kwargs.get('contrato_pk')
        if contrato_pk:
            return AcuerdoConfidencialidadContrato.objects.filter(contrato_id=contrato_pk)
        return AcuerdoConfidencialidadContrato.objects.none()

    def perform_create(self, serializer):
        contrato_pk = self.kwargs.get('contrato_pk')
        contrato = ContratoEmpresaCliente.objects.get(pk=contrato_pk)
        serializer.save(contrato=contrato)

# ViewSets para modelos de catálogo, que permanecen a nivel superior:
class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if ContratoServicio.objects.filter(
            content_type=ContentType.objects.get_for_model(Servicio),
            object_id=instance.pk,
        ).exists():
            return Response(
                {"detail": "No se puede eliminar: este servicio está asociado a contratos."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

class PlanServicioViewSet(viewsets.ModelViewSet):
    queryset = PlanServicio.objects.all()
    serializer_class = PlanServicioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if ContratoServicio.objects.filter(
            content_type=ContentType.objects.get_for_model(PlanServicio),
            object_id=instance.pk,
        ).exists():
            return Response(
                {"detail": "No se puede eliminar: este plan está asociado a contratos."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

class CaracteristicaServicioViewSet(viewsets.ModelViewSet):
    queryset = CaracteristicaServicio.objects.all()
    serializer_class = CaracteristicaServicioSerializer
    permission_classes = [permissions.IsAuthenticated]

class VisitaViewSet(viewsets.ModelViewSet):
    queryset = Visita.objects.all()
    serializer_class = VisitaSerializer

class LicenciaViewSet(viewsets.ModelViewSet):
    queryset = Licencia.objects.all()
    serializer_class = LicenciaSerializer
    permission_classes = [permissions.IsAuthenticated]

class CondicionEspecialViewSet(viewsets.ModelViewSet):
    queryset = CondicionEspecial.objects.all()
    serializer_class = CondicionEspecialSerializer

class PersonaLicenciatariaViewSet(viewsets.ModelViewSet):
    serializer_class = PersonaLicenciatariaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa = _empresa_del_usuario(self.request.user)
        if not empresa:
            return PersonaLicenciataria.objects.none()

        qs = PersonaLicenciataria.objects.filter(empresa=empresa).select_related(
            "usuario_empresa", "usuario_empresa__usuario"
        ).prefetch_related("correos")

        empresa_param = self.request.query_params.get("empresa")
        if empresa_param:
            qs = qs.filter(empresa_id=empresa_param)

        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                models.Q(nombre__icontains=q) |
                models.Q(correos__correo__icontains=q) |
                models.Q(usuario_empresa__usuario__email__icontains=q) |
                models.Q(usuario_empresa__usuario__first_name__icontains=q) |
                models.Q(usuario_empresa__usuario__last_name__icontains=q)
            ).distinct()

        return qs

    def perform_create(self, serializer):
        empresa = _empresa_del_usuario(self.request.user)
        serializer.save(empresa=empresa)


class CorreoPersonaLicenciatariaViewSet(viewsets.ModelViewSet):
    serializer_class = CorreoPersonaLicenciatariaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa = _empresa_del_usuario(self.request.user)
        if not empresa:
            return CorreoPersonaLicenciataria.objects.none()

        persona_pk = self.kwargs.get("persona_pk")
        qs = CorreoPersonaLicenciataria.objects.filter(empresa=empresa).select_related("persona")
        if persona_pk:
            qs = qs.filter(persona_id=persona_pk)
        return qs

    def perform_create(self, serializer):
        persona_pk = self.kwargs.get("persona_pk")
        persona = PersonaLicenciataria.objects.get(pk=persona_pk)
        serializer.save(persona=persona, empresa=persona.empresa)

class UsuarioVinculadoLicenciaViewSet(viewsets.ModelViewSet):
    queryset = UsuarioVinculadoLicencia.objects.all()
    serializer_class = UsuarioVinculadoLicenciaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        contrato_licencia_pk = self.kwargs.get('licencia_pk')
        if contrato_licencia_pk:
            return UsuarioVinculadoLicencia.objects.filter(licencia_id=contrato_licencia_pk).select_related(
                "usuario", "usuario__usuario", "correo_persona", "correo_persona__persona"
            )

        # Multi-tenancy: filtrar por empresa del usuario autenticado
        from core.models import PersonalizacionUsuario
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if personalizacion and personalizacion.sucursal_principal:
            empresa = personalizacion.sucursal_principal.empresa
            return UsuarioVinculadoLicencia.objects.filter(
                models.Q(licencia__contrato__empresa_prestadora=empresa) |
                models.Q(licencia__contrato__empresa_cliente=empresa)
            ).select_related("usuario", "usuario__usuario", "correo_persona", "correo_persona__persona")
        return UsuarioVinculadoLicencia.objects.none()

    def create(self, request, *args, **kwargs):
        """Bloquea la asignación si se alcanza el límite de licencias."""
        contrato_licencia_pk = self.kwargs.get('licencia_pk') or request.data.get('licencia')
        if contrato_licencia_pk:
            try:
                contrato_licencia = ContratoLicencia.objects.get(pk=contrato_licencia_pk)
                asignados = UsuarioVinculadoLicencia.objects.filter(licencia_id=contrato_licencia_pk).count()
                if asignados >= contrato_licencia.cantidad:
                    return Response(
                        {"detail": f"Se alcanzó el límite de {contrato_licencia.cantidad} licencias. No se pueden asignar más usuarios."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except ContratoLicencia.DoesNotExist:
                pass
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Valida la ventana de reducción antes de permitir desvincular un usuario."""
        obj = self.get_object()
        licencia = obj.licencia
        if not licencia.puede_desvincular_usuarios:
            return Response(
                {"detail": "No se puede desvincular este usuario fuera de los 7 días posteriores al inicio del ciclo vigente."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path=r'empresa/(?P<empresa_pk>\d+)/correos-disponibles')
    def correos_disponibles(self, request, licencia_pk=None, empresa_pk=None):
        """
        Devuelve todos los UsuarioEmpresa que NO están vinculados
        a la licencia `licencia_pk` y pertenecen a la empresa `empresa_pk`.
        """
        try:
            usuarios_empresa = UsuarioEmpresa.objects.filter(sucursal__empresa_id=empresa_pk).select_related("usuario")
            for usuario_empresa in usuarios_empresa:
                PersonaLicenciataria.sincronizar_desde_usuario_empresa(
                    usuario_empresa,
                    empresa=usuario_empresa.sucursal.empresa,
                )

            asignados = UsuarioVinculadoLicencia.objects.filter(
                licencia_id=licencia_pk,
                correo_persona__isnull=False,
            ).values_list('correo_persona_id', flat=True)

            disponibles = CorreoPersonaLicenciataria.objects.filter(
                empresa_id=empresa_pk,
                activo=True,
            ).exclude(pk__in=asignados).select_related(
                "persona", "persona__usuario_empresa", "persona__usuario_empresa__usuario"
            ).order_by("-es_principal", "correo")

            serializer = CorreoPersonaLicenciatariaSerializer(disponibles, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except (OperationalError, ProgrammingError):
            asignados = UsuarioVinculadoLicencia.objects.filter(
                licencia_id=licencia_pk,
            ).values_list('usuario_id', flat=True)

            disponibles = UsuarioEmpresa.objects.exclude(pk__in=asignados).filter(
                sucursal__empresa_id=empresa_pk
            ).select_related("usuario")

            data = [
                {
                    "id": usuario.id,
                    "persona": usuario.id,
                    "empresa": int(empresa_pk),
                    "correo": usuario.usuario.email,
                    "correo_normalizado": usuario.usuario.email.lower(),
                    "es_principal": True,
                    "es_corporativo": True,
                    "verificado": True,
                    "activo": True,
                    "persona_detalle": {
                        "id": usuario.id,
                        "nombre": usuario.usuario.get_nombre_completo(),
                        "es_interno": True,
                        "usuario_empresa": usuario.id,
                    },
                }
                for usuario in disponibles
            ]
            return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path=r'empresa/(?P<empresa_pk>\d+)/usuarios-no-vinculados')
    def usuarios_no_vinculados(self, request, licencia_pk=None, empresa_pk=None):
        return self.correos_disponibles(request, licencia_pk=licencia_pk, empresa_pk=empresa_pk)

class EnvioContratoFirmaUsuarioViewSet(viewsets.ModelViewSet):
    queryset = EnvioContratoFirmaUsuario.objects.all()
    serializer_class = EnvioContratoFirmaUsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        usuario_vinculado = UsuarioVinculadoContrato.objects.get(
            pk=self.kwargs.get("usuario_vinculado_pk"),
            contrato_id=self.kwargs.get("contrato_pk"),
        )
        contrato = usuario_vinculado.contrato
        if contrato.estado != "aprobado_cliente":
            return Response(
                {"detail": "Solo se puede enviar a firma cuando el contrato esta aprobado por el cliente."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not usuario_vinculado.es_destinatario_principal:
            return Response(
                {"detail": "En esta version solo se puede enviar a firma al destinatario principal."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        snapshot, pdf_bytes = preparar_documento_contrato(contrato, request=request)
        envio = EnvioContratoFirmaUsuario.objects.create(
            usuario=usuario_vinculado,
            snapshot_contrato=snapshot,
            pdf_congelado=pdf_bytes,
        )
        marcar_envio(envio)
        envio.save(update_fields=["enviado", "fecha_envio"])
        enviar_correo_firma(envio)

        contrato.estado = "en_firma"
        contrato.save(update_fields=["estado", "fecha_modificacion"])

        serializer = self.get_serializer(envio)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], url_path='reenviar')
    def reenviar(self, request, pk=None, contrato_pk=None, usuario_vinculado_pk=None):
        """
        Reenvía el correo de firma para este EnvioContratoFirmaUsuario.
        """
        envio = self.get_object()

        # Actualizar fecha de envío
        envio.fecha_envio = timezone.now()
        envio.enviado = True
        envio.save()

        # Preparar y enviar correo
        self._enviar_correo(envio)

        return Response(
            {"detail": "Correo de firma reenviado correctamente."},
            status=status.HTTP_200_OK
        )

    def _enviar_correo(self, envio: EnvioContratoFirmaUsuario):
        """
        Construye y dispara la tarea de envío de correo.
        """
        subject = "¡Tu contrato está listo para firmar!"
        recipient_list = [envio.usuario.correo_display]
        html_body = (
            "<p>Hola,</p>"
            "<p>Te hemos enviado (o reenviado) tu contrato para que lo firmes.</p>"
            "<p>Por favor haz clic en el botón de abajo para revisar y firmar:</p>"
        )
        titulo       = "Firma tu contrato"
        frontend_url = os.getenv("FRONTEND_URL", "https://app.gestionsnabb-it.cl")
        url_boton    = f"{frontend_url}/firmar-contrato/{envio.uuid}"
        text_boton   = "Firmar contrato ahora"

        # Tarea asíncrona de Celery
        send_email_task.delay(
            subject,
            recipient_list,
            html_body,
            titulo,
            url_boton,
            text_boton,
        )

@require_GET
def obtener_acuerdos_por_envio(request, uuid):
    """
    Vista pública que, dado el UUID de un EnvioContratoFirmaUsuario,
    devuelve los AcuerdoConfidencialidadContrato del contrato vinculado.
    """
    try:
        envio = EnvioContratoFirmaUsuario.objects.get(uuid=uuid, enviado=True)
    except EnvioContratoFirmaUsuario.DoesNotExist:
        return JsonResponse({'detail': 'Envío no encontrado o no enviado aún.'}, status=404)

    # Asumimos que UsuarioVinculadoContrato tiene FK .contrato
    contrato = envio.usuario.contrato

    acuerdos = AcuerdoConfidencialidadContrato.objects.filter(contrato=contrato)

    data = []
    for a in acuerdos:
        data.append({
            'id': a.id,
            'acuerdo_base_id': a.acuerdo_base_id,
            'acuerdo_base_titulo': a.acuerdo_base.titulo if a.acuerdo_base else None,
            'acuerdo_base_contenido': a.acuerdo_base.contenido if a.acuerdo_base else None,
            'contrato_id': a.contrato_id,
            'fecha_creacion': a.fecha_creacion.isoformat(),
            'fecha_modificacion': a.fecha_modificacion.isoformat(),
        })

    return JsonResponse({'acuerdos_confidencialidad': data}, status=200)

@csrf_exempt
@require_http_methods(["PATCH"])
def firmar_envio(request, uuid):
    """
    PATCH público para registrar la firma, fecha de firma y el estado firmado.
    Espera un JSON con:
      - firma: string (por ejemplo, base64 o texto de la firma)
      - fecha_firma: string ISO8601
      - firmado: boolean
    """
    try:
        envio = EnvioContratoFirmaUsuario.objects.get(uuid=uuid)
    except EnvioContratoFirmaUsuario.DoesNotExist:
        return JsonResponse({'detail': 'Envío no encontrado.'}, status=404)

    # Parsear body JSON
    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return HttpResponseBadRequest('JSON inválido.')

    firma_value       = payload.get('firma')
    fecha_firma_str   = payload.get('fecha_firma')
    firmado_value     = payload.get('firmado')

    if firma_value is None or fecha_firma_str is None or firmado_value is None:
        return HttpResponseBadRequest(
            'Se requieren los campos "firma", "fecha_firma" y "firmado".'
        )

    fecha_firma = parse_datetime(fecha_firma_str)
    if fecha_firma is None:
        return HttpResponseBadRequest('"fecha_firma" no es un datetime ISO válido.')

    # Actualizar y guardar sólo los campos necesarios
    envio.firma       = firma_value
    envio.fecha_firma = fecha_firma
    envio.firmado     = bool(firmado_value)
    envio.ip_respuesta = get_client_ip(request)
    envio.save(update_fields=['firma', 'fecha_firma', 'firmado', 'ip_respuesta'])
    if envio.usuario.contrato.estado == 'en_firma':
        envio.usuario.contrato.estado = 'activo'
        envio.usuario.contrato.save(update_fields=['estado', 'fecha_modificacion'])

    # Responder con los campos actualizados
    return JsonResponse({
        'uuid': str(envio.uuid),
        'firma': envio.firma,
        'fecha_firma': envio.fecha_firma.isoformat(),
        'firmado': envio.firmado,
    }, status=200)


# ═══════════════════════════════════════════════════════════════
#  Facturación de Contratos — Prefacturación mensual
# ═══════════════════════════════════════════════════════════════

class FacturaContratoViewSet(viewsets.ModelViewSet):
    """ViewSet para CRUD y acciones de estado sobre FacturaContrato.

    Flujo de estados: borrador → por_facturar → facturado
    La transición a 'facturado' se produce al asociar un documento de factura.

    Filtros via query params:
      - ?contrato=<id>   filtra por contrato
      - ?cliente=<id>    filtra por empresa cliente
      - ?estado=<estado> filtra por estado
      - ?historico=1     muestra solo registros en estado 'facturado'
    """

    queryset = FacturaContrato.objects.all()
    serializer_class = FacturaContratoSerializer
    permission_classes = [permissions.IsAuthenticated]

    # ── Multi-tenancy ──────────────────────────────────────────
    def get_queryset(self):
        from core.models import PersonalizacionUsuario

        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if not personalizacion or not personalizacion.sucursal_principal:
            return FacturaContrato.objects.none()

        empresa = personalizacion.sucursal_principal.empresa
        qs = FacturaContrato.objects.filter(empresa_prestadora=empresa)

        # Filtros opcionales
        contrato = self.request.query_params.get("contrato")
        if contrato:
            qs = qs.filter(contrato_id=contrato)

        cliente = self.request.query_params.get("cliente")
        if cliente:
            qs = qs.filter(empresa_cliente_id=cliente)

        estado = self.request.query_params.get("estado")
        if estado:
            qs = qs.filter(estado=estado)

        historico = self.request.query_params.get("historico")
        if historico == "1":
            qs = qs.filter(estado="facturado")

        return qs.select_related(
            "contrato", "empresa_prestadora", "empresa_cliente", "creado_por"
        )

    # ── Asignar creado_por / actualizado_por ───────────────────
    def perform_create(self, serializer):
        usuario_empresa = obtener_usuario_empresa(self.request.user)
        serializer.save(creado_por=usuario_empresa, actualizado_por=usuario_empresa)

    def perform_update(self, serializer):
        usuario_empresa = obtener_usuario_empresa(self.request.user)
        serializer.save(actualizado_por=usuario_empresa)

    # ── Solo editable en borrador ──────────────────────────────
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.estado != "borrador":
            return Response(
                {"detail": "Solo se pueden editar facturas en estado borrador."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.estado != "borrador":
            return Response(
                {"detail": "Solo se pueden editar facturas en estado borrador."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)

    # ── Transición: borrador → por_facturar ────────────────────
    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        """Marca la prefactura como lista para facturar."""
        factura = self.get_object()
        if factura.estado != "borrador":
            return Response(
                {"detail": "Solo facturas en borrador pueden pasar a 'Por facturar'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        factura.estado = "por_facturar"
        factura.fecha_emision = timezone.now().date()
        factura.actualizado_por = obtener_usuario_empresa(request.user)
        factura.save()
        return Response(self.get_serializer(factura).data)

    # ── Asociar documento → transición automática a facturado ──
    @action(detail=True, methods=["post"], url_path="asociar-documento")
    def asociar_documento(self, request, pk=None):
        """Sube el documento de factura emitido externamente.

        Si la prefactura está en estado 'por_facturar', cambia automáticamente
        a 'facturado'. También acepta re-subir documento desde estado 'facturado'.
        """
        factura = self.get_object()
        if factura.estado == "borrador":
            return Response(
                {"detail": "Debe finalizar la prefactura antes de adjuntar el documento."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        archivo = request.FILES.get("documento")
        if not archivo:
            return Response(
                {"detail": "Debe adjuntar un archivo 'documento'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        factura.documento_factura = archivo
        if factura.estado == "por_facturar":
            factura.estado = "facturado"
        factura.actualizado_por = obtener_usuario_empresa(request.user)
        factura.save()
        return Response(self.get_serializer(factura).data)

    # ── Eliminar solo si está en borrador ───────────────────────
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.estado != "borrador":
            return Response(
                {"detail": "Solo se pueden eliminar prefacturas en estado borrador."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    # ── Resumen / métricas ──────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="resumen")
    def resumen(self, request):
        """Devuelve conteos por estado para el dashboard."""
        qs = self.get_queryset()
        from django.db.models import Count, Sum

        resumen = qs.values("estado").annotate(
            cantidad=Count("id"),
            total=Sum("monto_total"),
        )
        return Response(list(resumen))
