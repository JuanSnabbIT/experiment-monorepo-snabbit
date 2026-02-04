from rest_framework import viewsets, status
from django.db import models
from contratos.models import (
    ContratoEmpresaCliente,
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
    Visita,
    Licencia,
    CondicionEspecial,
)
from empresas.models import UsuarioEmpresa
from empresas.serializers import UsuarioEmpresaSerializer
from .serializers import (
    ContratoEmpresaClienteSerializer,
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
    VisitaSerializer,
    LicenciaSerializer,
    CondicionEspecialSerializer,
)
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.contrib.contenttypes.models import ContentType
from django.http import HttpResponse, JsonResponse, Http404, HttpResponseBadRequest
from .funciones import generar_contrato_en_memoria
from core.tasks import send_email_task
from django.utils.dateparse import parse_datetime
from django.views.decorators.http import require_GET, require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
import json
import os
from dotenv import load_dotenv
load_dotenv()


# ViewSet para Contrato (modelo padre)
class ContratoEmpresaClienteViewSet(viewsets.ModelViewSet):
    queryset = ContratoEmpresaCliente.objects.all()
    serializer_class = ContratoEmpresaClienteSerializer

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

    @action(detail=True, methods=['put'], url_path='actualizar')
    def actualizar(self, request, pk=None):
        """
        Actualiza tanto el modelo principal (ContratoEmpresaCliente) como 
        las tablas intermedias (ContratoVisita, ContratoLicencia, 
        ContratoCondicionEspecial, UsuarioVinculadoContrato).
        """
        with transaction.atomic():
            contrato = self.get_object()

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
                    cl.save()
                else:
                    # CREAR NUEVA
                    licencia_id = item.get("licencia_id")
                    if not licencia_id:
                        continue
                    try:
                        licencia_obj = Licencia.objects.get(pk=licencia_id)
                    except Licencia.DoesNotExist:
                        continue
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
                    # Si quisieras actualizar algo más, aquí iría. 
                    # Por ejemplo, si existiera un campo extra en la tabla intermedia.
                    cce.save()
                else:
                    # Crear nueva relación
                    condicion_id = item.get("condicion_id")
                    if not condicion_id:
                        continue
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
                    # No se cambia "contrato" ni "usuario"
                    uv.tipo_usuario = item.get("tipo_usuario", uv.tipo_usuario)
                    uv.save()
                else:
                    # Crear nuevo
                    usuario_id = item.get("usuario_id")
                    if not usuario_id:
                        continue
                    try:
                        usuario_obj = UsuarioEmpresa.objects.get(pk=usuario_id)
                    except UsuarioEmpresa.DoesNotExist:
                        continue
                    UsuarioVinculadoContrato.objects.create(
                        usuario=usuario_obj,
                        contrato=contrato,
                        tipo_usuario=item.get("tipo_usuario", "gerencia"),
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
        # Diccionario de datos del cliente (ejemplo)
        datos_cliente = {
            'razon_social': 'RSM Chile Auditores',
            'rut': '76.073.255-9',
            'domicilio': 'APOQUINDO 3650 703',
            'giro': 'Actividades de contabilidad, teneduría de libros',
            'representante_legal': 'Fernando Landa',
            'rut_representante_legal': '11.111.111-1',
            'fono': '(56-2) 25072788',
            'email': 'fernando.landa@rsmchile.com'
        }

        # Diccionario de datos generales del contrato (ejemplo)
        datos_contrato = {
            'fecha': '01 de junio del 2017',
            'proveedor_razon_social': 'Consultora Aguilera Rojas y Asociados Ltda. (Grupo AyG)',
            'proveedor_rut': '76.365.641-1',
            'proveedor_direccion': 'Gaspar de Soto #539, San Miguel',
            'proveedor_representante': 'Luis Alberto Rojas Molina (Rut 15.890.661-9)',
            'descripcion_plan': 'Implementación de proyecto tecnológico en base a IRS 1075, con lista de tareas expresada a un año.',
            'valor_mensual': '850.000',
            'descripcion_asesoria': """La asesoría externa se realizará en base al proyecto presentado... 
                (aquí incluyes el detalle textual que necesites)""",
            'forma_pago': "PAGOS A MES VENCIDO, PLAZO MÁXIMO LOS 10 PRIMEROS DÍAS CORRIDOS DE CADA MES",
            'condiciones_generales': """(Aquí van las cláusulas y condiciones generales que tengas, 
            puedes copiar y pegar desde tu documento original, adaptándolo)""",
            'lista_tareas': [
                "Implementación de NAS y gestión de respaldos",
                "Instalación de antivirus corporativo",
                "Cambio de servidor de correos a Office 365",
                "Blindaje de red corporativa",
                "Redundancia de sistemas",
                "Procedimientos y planes de recuperación",
                # etc...
            ]
        }

        pdf_buffer = generar_contrato_en_memoria("nombre_prueba", datos_cliente, datos_contrato)
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        # response['Content-Disposition'] = f'inline; filename="prueeaa.pdf"'
        return response

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
            ).values("id", "nombre", "empresa_cliente__nombre", "fecha_fin")[:10]
        )
        contratos_por_vencer_resultado = [
            {
                "id": c["id"],
                "nombre": c["nombre"],
                "cliente": c["empresa_cliente__nombre"],
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


class UsuarioVinculadoContratoViewSet(viewsets.ModelViewSet):
    serializer_class = UsuarioVinculadoContratoSerializer

    def get_queryset(self):
        contrato_pk = self.kwargs.get('contrato_pk')
        if contrato_pk:
            return UsuarioVinculadoContrato.objects.filter(contrato_id=contrato_pk)
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

    def get_queryset(self):
        contrato_pk = self.kwargs.get('contrato_pk')
        if contrato_pk:
            return ContratoLicencia.objects.filter(contrato_id=contrato_pk)
        return ContratoLicencia.objects.all()

    def perform_create(self, serializer):
        contrato_pk = self.kwargs.get('contrato_pk')
        contrato = ContratoEmpresaCliente.objects.get(pk=contrato_pk)
        serializer.save(contrato=contrato)

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

class PlanServicioViewSet(viewsets.ModelViewSet):
    queryset = PlanServicio.objects.all()
    serializer_class = PlanServicioSerializer

class CaracteristicaServicioViewSet(viewsets.ModelViewSet):
    queryset = CaracteristicaServicio.objects.all()
    serializer_class = CaracteristicaServicioSerializer

class VisitaViewSet(viewsets.ModelViewSet):
    queryset = Visita.objects.all()
    serializer_class = VisitaSerializer

class LicenciaViewSet(viewsets.ModelViewSet):
    queryset = Licencia.objects.all()
    serializer_class = LicenciaSerializer

class CondicionEspecialViewSet(viewsets.ModelViewSet):
    queryset = CondicionEspecial.objects.all()
    serializer_class = CondicionEspecialSerializer

class UsuarioVinculadoLicenciaViewSet(viewsets.ModelViewSet):
    queryset = UsuarioVinculadoLicencia.objects.all()
    serializer_class = UsuarioVinculadoLicenciaSerializer

    def get_queryset(self):
        contrato_licencia_pk = self.kwargs.get('licencia_pk')
        if contrato_licencia_pk:
            return UsuarioVinculadoLicencia.objects.filter(licencia_id=contrato_licencia_pk)
        return UsuarioVinculadoLicencia.objects.all()

    @action(detail=False, methods=['get'], url_path=r'empresa/(?P<empresa_pk>\d+)/usuarios-no-vinculados')
    def usuarios_no_vinculados(self, request, licencia_pk=None, empresa_pk=None):
        """
        Devuelve todos los UsuarioEmpresa que NO están vinculados
        a la licencia `licencia_pk` y pertenecen a la empresa `empresa_pk`.
        """
        # 1) IDs de usuarios ya asignados a esta licencia
        asignados = UsuarioVinculadoLicencia.objects.filter(licencia_id=licencia_pk).values_list('usuario_id', flat=True)

        # 2) Filtrar por empresa y excluir los asignados
        disponibles = UsuarioEmpresa.objects.exclude(pk__in=asignados).filter(sucursal__empresa_id=empresa_pk)

        # 3) Serializar y devolver
        serializer = UsuarioEmpresaSerializer(disponibles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class EnvioContratoFirmaUsuarioViewSet(viewsets.ModelViewSet):
    queryset = EnvioContratoFirmaUsuario.objects.all()
    serializer_class = EnvioContratoFirmaUsuarioSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        envio = serializer.save(enviado=True, fecha_envio=timezone.now())

        # Preparar y enviar correo
        self._enviar_correo(envio)

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
        recipient_list = [envio.usuario.usuario.usuario.email]
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
    envio.save(update_fields=['firma', 'fecha_firma', 'firmado'])

    # Responder con los campos actualizados
    return JsonResponse({
        'uuid': str(envio.uuid),
        'firma': envio.firma,
        'fecha_firma': envio.fecha_firma.isoformat(),
        'firmado': envio.firmado,
    }, status=200)