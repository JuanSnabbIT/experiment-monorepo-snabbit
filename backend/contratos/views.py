import logging
from datetime import date, timedelta

from rest_framework import viewsets, status, serializers
from django.db import models
from django.conf import settings
from contratos.models import (
    ContratoEmpresaCliente,
    EnvioContratoAprobacion,
    EnvioContratoFirmaUsuario,
    UsuarioVinculadoContrato,
    ContratoItemComercial,
    ContratoServicio,
    ContratoVisita,
    ContratoLicencia,
    ContratoCondicionEspecial,
    AcuerdoConfidencialidadContrato,
    Servicio,
    PlanServicio,
    PlanServicioDetalle,
    CaracteristicaServicio,
    UsuarioVinculadoLicencia,
    PersonaLicenciataria,
    CorreoPersonaLicenciataria,
    Visita,
    Licencia,
    CondicionEspecial,
    FacturaContrato,
    PlantillaContrato,
    SeccionPlantilla,
    EtiquetaPlantilla,
    SeccionContratoGenerada,
)
from cotizaciones.models import Cotizacion
from empresas.models import UsuarioEmpresa
from .serializers import (
    ContratoEmpresaClienteSerializer,
    EnvioContratoAprobacionSerializer,
    EnvioContratoFirmaUsuarioSerializer,
    # ContratoLicenciaVinculoUsuarioSerializer,
    UsuarioVinculadoContratoSerializer,
    ContratoItemComercialSerializer,
    ContratoServicioSerializer,
    ContratoVisitaSerializer,
    ContratoLicenciaSerializer,
    ContratoCondicionEspecialSerializer,
    AcuerdoConfidencialidadContratoSerializer,
    ServicioSerializer,
    PlanServicioSerializer,
    PlanServicioDetalleSerializer,
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
    PlantillaContratoSerializer,
    SeccionPlantillaSerializer,
    EtiquetaPlantillaSerializer,
    SeccionContratoGeneradaSerializer,
    ContratoMatchingSerializer,
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
from django.utils.dateparse import parse_date, parse_datetime
from django.utils import timezone
from core.tasks import send_email_task
from .flow_helpers import (
    actualizar_pdf_firmado_envio,
    construir_pdf_contrato,
    enviar_correo_aprobacion,
    enviar_correo_firma,
    firma_prestadora_disponible,
    get_client_ip,
    marcar_envio,
    obtener_destinatario_principal,
    obtener_envio_aprobacion_pendiente,
    obtener_envio_firma_pendiente,
    obtener_ultimo_envio_firma,
    preparar_documento_contrato,
    validar_firma_imagen,
)
from .venta_helpers import obtener_errores_conversion_cotizaciones
import json
import os
from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

BLOQUES_VALIDOS = {"alcance", "operacion", "condiciones"}
MOTIVO_DEPRECACION_APROBACION_BORRADOR = "Contrato devuelto a borrador"


def _empresa_del_usuario(user):
    from core.models import PersonalizacionUsuario

    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    if personalizacion and personalizacion.sucursal_principal:
        return personalizacion.sucursal_principal.empresa
    return None


def _build_envio_firma_error_response(*, etapa, exc):
    detail = "Ocurrio un error interno al enviar el contrato a firma."
    payload = {"detail": detail, "etapa": etapa}
    if settings.DEBUG:
        payload["error"] = str(exc)
        payload["error_type"] = exc.__class__.__name__
    return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _contratos_visibles_para_empresa(empresa):
    if not empresa:
        return ContratoEmpresaCliente.objects.none()
    return ContratoEmpresaCliente.objects.filter(
        models.Q(empresa_prestadora=empresa) | models.Q(empresa_cliente=empresa)
    )


def _aplicar_orden_secciones(qs, orden_por_id):
    """Aplica el orden de secciones en una sola pasada atómica."""
    with transaction.atomic():
        for seccion_id, orden in orden_por_id.items():
            qs.filter(id=seccion_id).update(orden=orden)



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
                    "aprobado para firma, en firma, rechazado por cliente o finalizado."
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
        return _contratos_visibles_para_empresa(empresa)

    def _empresa_usuario(self):
        return _empresa_del_usuario(self.request.user)

    def _resolver_referencia_catalogo(self, contrato, item):
        tipo_origen = item.get("tipo_origen")
        if not tipo_origen and item.get("content_type"):
            try:
                tipo_origen = ContentType.objects.get(pk=item.get("content_type")).model
            except ContentType.DoesNotExist:
                tipo_origen = None
            if tipo_origen == "planservicio":
                tipo_origen = "plan"

        version_id = (
            item.get("version_id")
            or item.get("catalogo_version_id")
            or item.get("plan_version_id")
            or item.get("servicio_version_id")
            or item.get("object_id")
            or item.get("id")
        )

        if tipo_origen == "plan":
            referencia = PlanServicio.objects.filter(
                pk=version_id,
                empresa_prestadora=contrato.empresa_prestadora,
            ).first()
        else:
            tipo_origen = "servicio"
            referencia = Servicio.objects.filter(
                pk=version_id,
                empresa_prestadora=contrato.empresa_prestadora,
            ).first()

        if not referencia:
            raise serializers.ValidationError(
                {"alcance": [f"No se encontro un registro de catalogo valido para {tipo_origen}."]}
            )
        return tipo_origen, referencia

    def _crear_item_comercial_desde_payload(self, contrato, item, orden=0, es_addon=False):
        tipo_origen, referencia = self._resolver_referencia_catalogo(contrato, item)
        moneda = item.get("moneda") or contrato.moneda_cobro
        precio_unitario = (
            item.get("precio_unitario_contratado")
            or item.get("precio_unitario")
            or referencia.get_precio_por_moneda(moneda)
        )
        forma_pago = item.get("forma_pago") or contrato.forma_pago_contractual
        cantidad = item.get("cantidad") or 1
        veces_por_mes = item.get("veces_por_mes") or getattr(referencia, "veces_por_mes_default", 1) or 1

        item_comercial = ContratoItemComercial.objects.create(
            contrato=contrato,
            tipo_origen=tipo_origen,
            servicio_version=referencia if tipo_origen == "servicio" else None,
            plan_version=referencia if tipo_origen == "plan" else None,
            catalogo_version_id=referencia.pk,
            snapshot_nombre=item.get("snapshot_nombre") or referencia.nombre,
            snapshot_descripcion=item.get("snapshot_descripcion") or referencia.descripcion,
            snapshot_incluye=item.get("snapshot_incluye") or getattr(referencia, "incluye", None),
            snapshot_no_incluye=item.get("snapshot_no_incluye") or getattr(referencia, "no_incluye", None),
            snapshot_clausulas=item.get("snapshot_clausulas")
            or getattr(referencia, "clausulas_especiales", None),
            snapshot_componentes_plan=item.get("snapshot_componentes_plan") or [],
            cantidad=cantidad,
            veces_por_mes=veces_por_mes,
            forma_pago=forma_pago,
            moneda=moneda,
            precio_unitario_contratado=precio_unitario,
            num_visitas_mensuales=item.get("num_visitas_mensuales"),
            es_addon=bool(item.get("es_addon", es_addon)),
            orden=orden,
        )

        content_type = ContentType.objects.get_for_model(
            PlanServicio if tipo_origen == "plan" else Servicio
        )
        ContratoServicio.objects.create(
            contrato=contrato,
            content_type=content_type,
            object_id=referencia.pk,
            cantidad=cantidad,
            precio_unitario=precio_unitario,
            item_comercial=item_comercial,
        )
        return item_comercial

    def _reemplazar_alcance_comercial(self, contrato, alcance_data):
        ContratoServicio.objects.filter(contrato=contrato).delete()
        ContratoItemComercial.objects.filter(contrato=contrato).delete()

        if not alcance_data:
            return []

        modo = alcance_data.get("modo", "vacio")
        creados = []
        orden = 0

        plan_item = alcance_data.get("plan")
        plan_id = alcance_data.get("plan_id") or alcance_data.get("plan_version_id")
        if modo == "plan" and (plan_item or plan_id):
            payload_plan = plan_item or {"tipo_origen": "plan", "version_id": plan_id}
            creados.append(self._crear_item_comercial_desde_payload(contrato, payload_plan, orden=orden))
            orden += 1

        for bloque, es_addon in (("items", False), ("servicios", False), ("addons", True)):
            for item in alcance_data.get(bloque, []) or []:
                if bloque == "items" and item.get("tipo_origen") == "plan":
                    creados.append(
                        self._crear_item_comercial_desde_payload(
                            contrato,
                            item,
                            orden=orden,
                            es_addon=bool(item.get("es_addon")),
                        )
                    )
                else:
                    creados.append(
                        self._crear_item_comercial_desde_payload(
                            contrato,
                            item,
                            orden=orden,
                            es_addon=es_addon,
                        )
                    )
                orden += 1
        return creados

    def _reemplazar_visitas(self, contrato, visitas_data):
        ContratoVisita.objects.filter(contrato=contrato).delete()
        for item in visitas_data or []:
            visita_id = item.get("visita_id") or item.get("visita")
            if not visita_id:
                continue
            visita = Visita.objects.filter(pk=visita_id).first()
            if not visita:
                raise serializers.ValidationError({"visitas": [f"Visita {visita_id} no encontrada."]})
            ContratoVisita.objects.create(
                contrato=contrato,
                visita=visita,
                frecuencia=item.get("frecuencia", "mensual"),
                cantidad=item.get("cantidad", 1),
                precio_visita_adicional=item.get("precio_visita_adicional") or None,
            )

    def _normalizar_fecha_licencia(self, value, field_name):
        if value in (None, ""):
            return None

        if isinstance(value, date):
            return value

        if isinstance(value, str):
            value = value.strip()
            if not value:
                return None
            try:
                parsed = parse_date(value)
            except ValueError:
                parsed = None
            if parsed:
                return parsed

        raise serializers.ValidationError(
            {field_name: ["Debe tener formato YYYY-MM-DD o ser nulo."]}
        )

    def _normalizar_fechas_licencia(
        self,
        item,
        *,
        fecha_inicio_default=None,
        fecha_fin_default=None,
    ):
        return {
            "fecha_inicio": self._normalizar_fecha_licencia(
                item.get("fecha_inicio", fecha_inicio_default),
                "fecha_inicio",
            ),
            "fecha_fin": self._normalizar_fecha_licencia(
                item.get("fecha_fin", fecha_fin_default),
                "fecha_fin",
            ),
        }

    def _reemplazar_licencias(self, contrato, licencias_data):
        ContratoLicencia.objects.filter(contrato=contrato).delete()
        for item in licencias_data or []:
            licencia_id = item.get("licencia_id") or item.get("licencia")
            if not licencia_id:
                continue
            licencia = Licencia.objects.filter(pk=licencia_id).first()
            if not licencia:
                raise serializers.ValidationError(
                    {"licencias": [f"Licencia {licencia_id} no encontrada."]}
                )
            fechas_normalizadas = self._normalizar_fechas_licencia(item)
            try:
                ContratoLicencia.objects.create(
                    contrato=contrato,
                    licencia=licencia,
                    tipo_modalidad=item.get("tipo_modalidad", "otros"),
                    otro_tipo=item.get("otro_tipo"),
                    cantidad=item.get("cantidad", 1),
                    precio_unitario=item.get("precio_unitario", 0),
                    fecha_inicio=fechas_normalizadas["fecha_inicio"],
                    fecha_fin=fechas_normalizadas["fecha_fin"],
                    tipo_moneda=item.get("tipo_moneda") or contrato.moneda_cobro,
                    partner=item.get("partner", True),
                )
            except DjangoValidationError as exc:
                raise serializers.ValidationError(
                    exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}
                ) from exc

    def _reemplazar_cotizaciones(self, contrato, cotizaciones_ids):
        """Vincula cotizaciones al contrato de venta. Desvincula las previas."""
        # Desvincular cotizaciones previas de este contrato
        contrato.cotizaciones_vinculadas.update(contrato=None)

        if not cotizaciones_ids:
            return

        # Validar y vincular nuevas cotizaciones
        cotizaciones = Cotizacion.objects.filter(
            id__in=cotizaciones_ids,
            cliente=contrato.empresa_cliente,
            estado='aceptada',
        )
        # Verificar que no estén vinculadas a otro contrato
        ya_vinculadas = cotizaciones.exclude(contrato__isnull=True).exclude(contrato=contrato)
        if ya_vinculadas.exists():
            nums = ", ".join(str(c.numero_cotizacion) for c in ya_vinculadas)
            raise serializers.ValidationError(
                {"cotizaciones": [f"Las cotizaciones {nums} ya están vinculadas a otro contrato."]}
            )

        cotizaciones_validas = cotizaciones.filter(
            models.Q(contrato__isnull=True) | models.Q(contrato=contrato)
        )
        errores_conversion = obtener_errores_conversion_cotizaciones(
            cotizaciones_validas,
            contrato.moneda_cobro,
        )
        if errores_conversion:
            raise serializers.ValidationError(errores_conversion)
        cotizaciones_validas.update(contrato=contrato)

    def _reemplazar_condiciones(self, contrato, condiciones_data):
        ContratoCondicionEspecial.objects.filter(contrato=contrato).delete()
        for item in condiciones_data or []:
            condicion_id = item.get("condicion_id") or item.get("condicion")
            condicion = None
            if condicion_id:
                condicion = CondicionEspecial.objects.filter(pk=condicion_id).first()
                if not condicion:
                    raise serializers.ValidationError(
                        {"condiciones_especiales": [f"Condicion {condicion_id} no encontrada."]}
                    )
            ContratoCondicionEspecial.objects.create(
                contrato=contrato,
                condicion=condicion,
                texto=item.get("texto") or item.get("detalle") or item.get("detalle_personalizado"),
            )

    def _reemplazar_usuarios(self, contrato, usuarios_data, destinatario_principal=None):
        payload_usuarios = list(usuarios_data or [])
        if destinatario_principal:
            payload_usuarios = [
                {
                    **destinatario_principal,
                    "es_destinatario_principal": True,
                },
                *[item for item in payload_usuarios if item.get("es_destinatario_principal") is not True],
            ]

        if not payload_usuarios:
            raise serializers.ValidationError(
                {"destinatario_principal": ["Debe indicar al menos un destinatario principal."]}
            )

        UsuarioVinculadoContrato.objects.filter(contrato=contrato).delete()
        principales = 0
        for item in payload_usuarios:
            usuario_id = item.get("usuario_id") or item.get("usuario")
            usuario = None
            if usuario_id:
                usuario = UsuarioEmpresa.objects.filter(pk=usuario_id).first()
                if not usuario:
                    raise serializers.ValidationError(
                        {"destinatario_principal": [f"UsuarioEmpresa {usuario_id} no encontrado."]}
                    )
            es_principal = bool(item.get("es_destinatario_principal"))
            principales += 1 if es_principal else 0
            UsuarioVinculadoContrato.objects.create(
                contrato=contrato,
                usuario=usuario,
                tipo_usuario=item.get("tipo_usuario", "gerencia"),
                nombre=item.get("nombre"),
                correo_generico=item.get("correo_generico") or item.get("correo"),
                es_destinatario_principal=es_principal,
            )

        if principales != 1:
            raise serializers.ValidationError(
                {"destinatario_principal": ["Debe existir exactamente un destinatario principal."]}
            )

    def _guardar_borrador_unificado(self, contrato, payload, *, crear=False):
        errores = {}
        contrato_data = payload.get("contrato") or {}
        destinatario = payload.get("destinatario_principal")
        alcance = payload.get("alcance_comercial")
        licencias = payload.get("licencias")
        visitas = payload.get("visitas")
        condiciones = payload.get("condiciones_especiales")
        usuarios = payload.get("usuarios_vinculados")

        if contrato_data and not crear:
            serializer = ContratoEmpresaClienteSerializer(
                contrato,
                data=contrato_data,
                partial=not crear,
                context={"request": self.request},
            )
            if not serializer.is_valid():
                errores["contrato"] = serializer.errors
            else:
                serializer.save()

        if errores:
            raise serializers.ValidationError(errores)

        try:
            if alcance is not None:
                self._reemplazar_alcance_comercial(contrato, alcance)
        except serializers.ValidationError as exc:
            errores["alcance"] = exc.detail

        try:
            if licencias is not None:
                self._reemplazar_licencias(contrato, licencias)
        except serializers.ValidationError as exc:
            errores["licencias"] = exc.detail

        cotizaciones_ids = payload.get("cotizaciones_ids")
        try:
            if cotizaciones_ids is not None:
                self._reemplazar_cotizaciones(contrato, cotizaciones_ids)
        except serializers.ValidationError as exc:
            errores["cotizaciones"] = exc.detail

        try:
            if visitas is not None:
                self._reemplazar_visitas(contrato, visitas)
        except serializers.ValidationError as exc:
            errores["visitas"] = exc.detail

        try:
            if condiciones is not None:
                self._reemplazar_condiciones(contrato, condiciones)
        except serializers.ValidationError as exc:
            errores["condiciones_especiales"] = exc.detail

        try:
            if usuarios is not None or destinatario is not None:
                self._reemplazar_usuarios(contrato, usuarios, destinatario_principal=destinatario)
        except serializers.ValidationError as exc:
            errores["destinatario_principal"] = exc.detail

        if errores:
            raise serializers.ValidationError(errores)
        return contrato

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
            return history_user.get_nombre_completo() or str(history_user)
        return str(history_user)

    def _build_contract_history_event(self, registro):
        detalle = self._humanize_contract_change(registro)
        return {
            "id": f"contrato-{registro.history_id}",
            "fecha": registro.history_date,
            "tipo": self._history_label(registro.history_type),
            "usuario": self._safe_user_display(registro.history_user),
            "origen": "contrato",
            "detalle": detalle,
            "cambios": registro.history_change_reason or "",
            "solicitado_por_cliente": self._es_cambio_solicitado_por_cliente(registro),
        }

    def _humanize_contract_change(self, registro):
        if registro.history_type == "+":
            return "Se creó el contrato"
        if registro.history_type == "-":
            return "Se eliminó el contrato"
        # Para actualizaciones, intentar describir qué cambió
        try:
            prev = registro.prev_record
            if prev is None:
                return "Actualización del contrato"
            delta = registro.diff_against(prev)
            descripciones = []
            CAMPOS_LEGIBLES = {
                "estado": "Estado",
                "nombre": "Nombre",
                "fecha_inicio": "Fecha de inicio",
                "fecha_fin": "Fecha de término",
                "observaciones": "Observaciones",
                "tipo": "Tipo de contrato",
                "moneda_cobro": "Moneda de cobro",
                "forma_pago_contractual": "Forma de pago",
                "dia_facturacion": "Día de facturación",
            }
            for change in delta.changes:
                nombre_legible = CAMPOS_LEGIBLES.get(change.field, change.field)
                if change.field == "estado":
                    descripciones.append(f"{nombre_legible} cambió de '{change.old}' a '{change.new}'")
                else:
                    descripciones.append(f"Se modificó {nombre_legible}")
            if descripciones:
                return "; ".join(descripciones)
            return "Actualización del contrato"
        except Exception:
            return "Actualización del contrato"

    def _es_cambio_solicitado_por_cliente(self, registro):
        """Determina si el cambio fue posterior a una solicitud de cambios del cliente."""
        try:
            prev = registro.prev_record
            if prev and prev.estado == "cambios_solicitados":
                return True
        except Exception:
            pass
        return False

    def _build_generic_history_event(self, registro, origen, detalle):
        return {
            "id": f"{origen}-{registro.history_id}",
            "fecha": registro.history_date,
            "tipo": self._history_label(registro.history_type),
            "usuario": self._safe_user_display(registro.history_user),
            "origen": origen,
            "detalle": detalle,
            "cambios": registro.history_change_reason or "",
            "solicitado_por_cliente": False,
        }

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
            "en_aprobacion_cliente": ["aprobado_cliente", "cambios_solicitados", "rechazado_cliente"],
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
                contrato_anterior=contrato_original,
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
                    titulo_personalizado=cce.titulo_personalizado,
                    detalle_personalizado=cce.detalle_personalizado,
                    multa_incumplimiento=cce.multa_incumplimiento,
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

            # Duplicar secciones generadas por plantilla
            for sg in SeccionContratoGenerada.objects.filter(contrato=contrato_original).order_by("orden"):
                SeccionContratoGenerada.objects.create(
                    contrato=nuevo_contrato,
                    seccion_plantilla=sg.seccion_plantilla,
                    titulo=sg.titulo,
                    contenido_renderizado=sg.contenido_renderizado,
                    orden=sg.orden,
                    fue_editado_manualmente=sg.fue_editado_manualmente,
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
                    fechas_normalizadas = self._normalizar_fechas_licencia(
                        item,
                        fecha_inicio_default=cl.fecha_inicio,
                        fecha_fin_default=cl.fecha_fin,
                    )
                    cl.tipo_modalidad = item.get("tipo_modalidad", cl.tipo_modalidad)
                    cl.otro_tipo = item.get("otro_tipo", cl.otro_tipo)
                    cl.cantidad = item.get("cantidad", cl.cantidad)
                    cl.precio_unitario = item.get("precio_unitario", cl.precio_unitario)
                    cl.fecha_inicio = fechas_normalizadas["fecha_inicio"]
                    cl.fecha_fin = fechas_normalizadas["fecha_fin"]
                    cl.tipo_moneda = item.get("tipo_moneda", cl.tipo_moneda)
                    try:
                        cl.save()
                    except serializers.ValidationError as e:
                        raise serializers.ValidationError({"licencias": e.detail}) from e
                    except DjangoValidationError as e:
                        raise serializers.ValidationError(
                            {"licencias": e.message_dict if hasattr(e, 'message_dict') else {'detail': e.messages}}
                        ) from e
                else:
                    # CREAR NUEVA
                    licencia_id = item.get("licencia_id")
                    if not licencia_id:
                        continue
                    try:
                        licencia_obj = Licencia.objects.get(pk=licencia_id)
                    except Licencia.DoesNotExist:
                        continue
                    fechas_normalizadas = self._normalizar_fechas_licencia(item)
                    try:
                        ContratoLicencia.objects.create(
                            contrato=contrato,
                            licencia=licencia_obj,
                            tipo_modalidad=item.get("tipo_modalidad", "otros"),
                            otro_tipo=item.get("otro_tipo", ""),
                            cantidad=item.get("cantidad", 1),
                            precio_unitario=item.get("precio_unitario", 0),
                            fecha_inicio=fechas_normalizadas["fecha_inicio"],
                            fecha_fin=fechas_normalizadas["fecha_fin"],
                            tipo_moneda=item.get("tipo_moneda", "USD")
                        )
                    except serializers.ValidationError as e:
                        raise serializers.ValidationError({"licencias": e.detail}) from e
                    except DjangoValidationError as e:
                        raise serializers.ValidationError(
                            {"licencias": e.message_dict if hasattr(e, 'message_dict') else {'detail': e.messages}}
                        ) from e

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
                    cce.titulo_personalizado = item.get(
                        "nombre",
                        item.get("titulo_personalizado", cce.titulo_personalizado),
                    )
                    cce.detalle_personalizado = item.get(
                        "detalle",
                        item.get("detalle_personalizado", cce.detalle_personalizado),
                    )
                    if "multa" in item or "multa_incumplimiento" in item:
                        cce.multa_incumplimiento = item.get(
                            "multa",
                            item.get("multa_incumplimiento", cce.multa_incumplimiento),
                        )
                    cce.save()
                else:
                    texto = item.get("texto")
                    condicion_id = item.get("condicion_id")
                    if texto:
                        # Condición de texto libre
                        ContratoCondicionEspecial.objects.create(
                            contrato=contrato,
                            texto=texto,
                            titulo_personalizado=item.get("nombre"),
                            detalle_personalizado=item.get("detalle") or texto,
                            multa_incumplimiento=item.get(
                                "multa",
                                item.get("multa_incumplimiento", 0),
                            ),
                        )
                    elif condicion_id:
                        # Condición desde catálogo
                        try:
                            condicion_obj = CondicionEspecial.objects.get(pk=condicion_id)
                        except CondicionEspecial.DoesNotExist:
                            continue
                        ContratoCondicionEspecial.objects.create(
                            contrato=contrato,
                            condicion=condicion_obj,
                            titulo_personalizado=item.get("nombre"),
                            detalle_personalizado=item.get("detalle"),
                            multa_incumplimiento=item.get(
                                "multa",
                                item.get("multa_incumplimiento", 0),
                            ),
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

    @action(detail=False, methods=["post"], url_path="crear-completo")
    def crear_completo(self, request):
        empresa = self._empresa_usuario()
        if not empresa:
            return Response(
                {"detail": "No se pudo determinar la empresa del usuario autenticado."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payload = request.data or {}
        contrato_data = payload.get("contrato") or {}
        if contrato_data.get("empresa_prestadora") and contrato_data.get("empresa_prestadora") != empresa.id:
            return Response(
                {"contrato": {"empresa_prestadora": ["Debe coincidir con la empresa autenticada."]}},
                status=status.HTTP_403_FORBIDDEN,
            )

        contrato_data["empresa_prestadora"] = empresa.id
        serializer = ContratoEmpresaClienteSerializer(
            data=contrato_data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            contrato = serializer.save()
            try:
                self._guardar_borrador_unificado(contrato, payload, crear=True)
            except serializers.ValidationError:
                raise
            # Auto-generar secciones documentales desde la plantilla
            if contrato.plantilla:
                from contratos.motor_plantillas import generar_secciones_contrato
                generar_secciones_contrato(contrato)
            contrato.refresh_from_db()
            return Response(
                ContratoEmpresaClienteSerializer(contrato, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )

    @action(detail=True, methods=["put"], url_path="actualizar-borrador")
    def actualizar_borrador(self, request, pk=None):
        contrato = self.get_object()
        bloqueo = self._validar_contrato_editable(contrato)
        if bloqueo:
            return bloqueo

        with transaction.atomic():
            self._guardar_borrador_unificado(contrato, request.data or {}, crear=False)
            contrato.refresh_from_db()
            return Response(
                ContratoEmpresaClienteSerializer(contrato, context={"request": request}).data,
                status=status.HTTP_200_OK,
            )

    @action(detail=True, methods=["get"], url_path="resumen-comercial")
    def resumen_comercial(self, request, pk=None):
        contrato = self.get_object()
        serializer = ContratoEmpresaClienteSerializer(contrato, context={"request": request})
        return Response(serializer.data.get("resumen_comercial", {}), status=status.HTTP_200_OK)

    # ── Cotizaciones vinculadas (contratos de venta) ──────────────────

    @action(detail=True, methods=["get"], url_path="cotizaciones-disponibles")
    def cotizaciones_disponibles(self, request, pk=None):
        """Lista cotizaciones aceptadas del mismo cliente, sin contrato asignado (o ya vinculadas a este)."""
        from .serializers import CotizacionVinculadaResumenSerializer

        contrato = self.get_object()
        cotizaciones = Cotizacion.objects.filter(
            cliente=contrato.empresa_cliente,
            estado='aceptada',
        ).filter(
            models.Q(contrato__isnull=True) | models.Q(contrato=contrato)
        ).order_by('-numero_cotizacion')

        return Response(
            CotizacionVinculadaResumenSerializer(cotizaciones, many=True).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path=r"cotizaciones-disponibles-cliente/(?P<cliente_id>\d+)")
    def cotizaciones_disponibles_cliente(self, request, cliente_id=None):
        """Lista cotizaciones aceptadas de un cliente, sin contrato asignado. Para el wizard de creación."""
        from .serializers import CotizacionVinculadaResumenSerializer

        cotizaciones = Cotizacion.objects.filter(
            cliente_id=cliente_id,
            estado='aceptada',
            contrato__isnull=True,
        ).order_by('-numero_cotizacion')

        return Response(
            CotizacionVinculadaResumenSerializer(cotizaciones, many=True).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="vincular-cotizacion")
    def vincular_cotizacion(self, request, pk=None):
        """Vincula una o varias cotizaciones al contrato de venta."""
        contrato = self.get_object()
        bloqueo = self._validar_contrato_editable(contrato)
        if bloqueo:
            return bloqueo

        cotizacion_ids = request.data.get("cotizacion_ids", [])
        if not cotizacion_ids:
            return Response(
                {"detail": "Debe indicar al menos una cotizacion a vincular."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cotizaciones = Cotizacion.objects.filter(
            id__in=cotizacion_ids,
            cliente=contrato.empresa_cliente,
            estado='aceptada',
        )
        # Verificar que no estén vinculadas a otro contrato
        ya_vinculadas = cotizaciones.exclude(contrato__isnull=True).exclude(contrato=contrato)
        if ya_vinculadas.exists():
            nums = ", ".join(str(c.numero_cotizacion) for c in ya_vinculadas)
            return Response(
                {"detail": f"Las cotizaciones {nums} ya estan vinculadas a otro contrato."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cotizaciones.filter(
            models.Q(contrato__isnull=True) | models.Q(contrato=contrato)
        ).update(contrato=contrato)

        contrato.refresh_from_db()
        return Response(
            ContratoEmpresaClienteSerializer(contrato, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="desvincular-cotizacion")
    def desvincular_cotizacion(self, request, pk=None):
        """Desvincula una cotización del contrato."""
        contrato = self.get_object()
        bloqueo = self._validar_contrato_editable(contrato)
        if bloqueo:
            return bloqueo

        cotizacion_id = request.data.get("cotizacion_id")
        if not cotizacion_id:
            return Response(
                {"detail": "Debe indicar la cotizacion a desvincular."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cotizacion = Cotizacion.objects.filter(id=cotizacion_id, contrato=contrato).first()
        if not cotizacion:
            return Response(
                {"detail": "Cotizacion no encontrada o no vinculada a este contrato."},
                status=status.HTTP_404_NOT_FOUND,
            )

        cotizacion.contrato = None
        cotizacion.save(update_fields=["contrato"])

        contrato.refresh_from_db()
        return Response(
            ContratoEmpresaClienteSerializer(contrato, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

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

        with transaction.atomic():
            # Eliminar las relaciones actuales para el contrato
            ContratoServicio.objects.filter(contrato=contrato).delete()
            ContratoItemComercial.objects.filter(contrato=contrato).delete()

            for orden, item in enumerate(servicios_data):
                if item.get("tipo_origen") or item.get("version_id") or item.get("catalogo_version_id"):
                    self._crear_item_comercial_desde_payload(contrato, item, orden=orden)
                    continue

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

                allowed_models = ['servicio', 'planservicio']
                if ct.model not in allowed_models:
                    return Response(
                        {"detail": f"El ContentType con id {ct_id} no pertenece a un modelo permitido (servicio, planservicio)."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                cantidad = item.get("cantidad", 1)
                precio_unitario = item.get("precio_unitario", 0)

                # Crear la nueva relación en la tabla intermedia
                legado = ContratoServicio.objects.create(
                    contrato=contrato,
                    content_type=ct,
                    object_id=object_id,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario
                )
                if legado.item_comercial_id and legado.item_comercial.orden != orden:
                    legado.item_comercial.orden = orden
                    legado.item_comercial.save(update_fields=["orden", "fecha_modificacion"])

        contrato.refresh_from_db()
        serializer = ContratoEmpresaClienteSerializer(contrato)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['put'], url_path='editar-alcance-comercial')
    def editar_alcance_comercial(self, request, pk=None):
        """
        Reemplaza el alcance comercial (plan + servicios/addons) del contrato.
        Solo disponible en estado borrador o cambios_solicitados.

        Payload esperado:
        {
            "alcance_comercial": {
                "modo": "plan" | "personalizado" | "vacio",
                "plan_id": <id opcional>,
                "plan": { "tipo_origen": "plan", "version_id": ..., "cantidad": ..., ... },
                "addons": [ { "tipo_origen": "servicio", "version_id": ..., ... } ],
                "servicios": [ { "tipo_origen": "servicio", "version_id": ..., ... } ]
            }
        }
        """
        contrato = self.get_object()
        bloqueo = self._validar_contrato_editable(contrato)
        if bloqueo:
            return bloqueo

        alcance_data = request.data.get("alcance_comercial")
        if alcance_data is None:
            return Response(
                {"detail": "No se proporcionaron datos para 'alcance_comercial'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            self._reemplazar_alcance_comercial(contrato, alcance_data)

        contrato.refresh_from_db()
        serializer = ContratoEmpresaClienteSerializer(contrato)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        contrato = self.get_object()
        pdf_buffer = construir_pdf_contrato(contrato)
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="contrato_{contrato.id}_{contrato.nombre}.pdf"'
        return response

    @action(detail=True, methods=["get"], url_path="preview-firma")
    def preview_firma(self, request, pk=None):
        contrato = self.get_object()
        envio = obtener_ultimo_envio_firma(contrato)
        destinatario = obtener_destinatario_principal(contrato)
        es_version_enviada = bool(envio and envio.enviado and envio.snapshot_contrato)

        contrato_payload = (
            envio.snapshot_contrato
            if es_version_enviada
            else ContratoEmpresaClienteSerializer(
                contrato,
                context={"request": request},
            ).data
        )

        return Response(
            {
                "uuid": str(envio.uuid) if envio else None,
                "puede_firmar": False,
                "firmado": bool(envio.firmado) if envio else False,
                "fecha_envio": envio.fecha_envio if envio else None,
                "fecha_emision": envio.fecha_envio if envio else timezone.now(),
                "fecha_firma": envio.fecha_firma if envio else None,
                "firma": envio.firma if envio else None,
                "firma_prestadora_disponible": firma_prestadora_disponible(contrato),
                "es_version_enviada": es_version_enviada,
                "destinatario": {
                    "id": destinatario.id,
                    "nombre": destinatario.nombre_display,
                    "email": destinatario.correo_display,
                    "es_externo": destinatario.es_externo,
                }
                if destinatario
                else None,
                "contrato": contrato_payload,
            }
        )

    @action(detail=True, methods=["get"], url_path="preview-firma/pdf")
    def preview_firma_pdf(self, request, pk=None):
        contrato = self.get_object()
        envio = obtener_ultimo_envio_firma(contrato)
        pdf_buffer = (
            envio.pdf_congelado
            if envio and envio.enviado and envio.pdf_congelado
            else construir_pdf_contrato(contrato)
        )
        response = HttpResponse(pdf_buffer, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'inline; filename="contrato_preview_firma_{contrato.id}.pdf"'
        )
        return response

    @action(detail=True, methods=["post"], url_path="enviar-aprobacion")
    def enviar_aprobacion(self, request, pk=None):
        contrato = self.get_object()
        if contrato.estado not in ("borrador", "cambios_solicitados"):
            return Response(
                {"detail": "Solo se puede enviar a aprobacion desde borrador o cambios solicitados."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if contrato.requiere_nda and not contrato.firmas_confidencialidad.filter(firmado=True).exists():
            return Response(
                {"detail": "Este contrato requiere un acuerdo de confidencialidad firmado antes de enviarlo a aprobacion del cliente."},
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

    @action(detail=True, methods=["post"], url_path="volver-a-borrador")
    def volver_a_borrador(self, request, pk=None):
        contrato = self.get_object()
        if contrato.estado != "en_aprobacion_cliente":
            return Response(
                {
                    "detail": (
                        "Solo se puede volver a borrador cuando el contrato esta en revision del cliente."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            fecha_deprecacion = timezone.now()
            envios_deprecados = contrato.envios_aprobacion.filter(
                enviado=True,
                respondido=False,
                deprecado=False,
            ).update(
                deprecado=True,
                fecha_deprecacion=fecha_deprecacion,
                motivo_deprecacion=MOTIVO_DEPRECACION_APROBACION_BORRADOR,
            )

            contrato.estado = "borrador"
            contrato.save(update_fields=["estado", "fecha_modificacion"])

        contrato.refresh_from_db()
        return Response(
            {
                "detail": "Contrato devuelto a borrador. El enlace anterior fue invalidado.",
                "envios_deprecados": envios_deprecados,
                "contrato": self.get_serializer(contrato).data,
            }
        )

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

        if not firma_prestadora_disponible(contrato):
            return Response(
                {
                    "detail": (
                        "La empresa prestadora debe tener una firma configurada antes de enviar el contrato a firma."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            snapshot, pdf_bytes = preparar_documento_contrato(
                contrato,
                request=request,
                require_provider_signature=True,
            )
        except Exception as exc:
            logger.exception(
                "Error preparando documento para envio de firma. contrato_id=%s",
                contrato.id,
            )
            return _build_envio_firma_error_response(etapa="preparar_documento", exc=exc)

        try:
            envio = EnvioContratoFirmaUsuario.objects.create(
                usuario=destinatario,
                snapshot_contrato=snapshot,
                pdf_congelado=pdf_bytes,
            )
            marcar_envio(envio)
            envio.save(update_fields=["enviado", "fecha_envio"])
        except Exception as exc:
            logger.exception(
                "Error creando registro de envio de firma. contrato_id=%s destinatario_id=%s",
                contrato.id,
                destinatario.id,
            )
            return _build_envio_firma_error_response(etapa="crear_envio", exc=exc)

        try:
            enviar_correo_firma(envio)
        except Exception as exc:
            logger.exception(
                "Error despachando correo de firma. contrato_id=%s envio_id=%s",
                contrato.id,
                envio.id,
            )
            return _build_envio_firma_error_response(etapa="enviar_correo", exc=exc)

        try:
            contrato.estado = "en_firma"
            contrato.save(update_fields=["estado", "fecha_modificacion"])
        except Exception as exc:
            logger.exception(
                "Error actualizando contrato a en_firma. contrato_id=%s envio_id=%s",
                contrato.id,
                envio.id,
            )
            return _build_envio_firma_error_response(etapa="actualizar_estado", exc=exc)

        try:
            data = EnvioContratoFirmaUsuarioSerializer(envio).data
        except Exception as exc:
            logger.exception(
                "Error serializando respuesta de envio de firma. contrato_id=%s envio_id=%s",
                contrato.id,
                envio.id,
            )
            return _build_envio_firma_error_response(etapa="serializar_respuesta", exc=exc)

        return Response(data, status=status.HTTP_201_CREATED)

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

    @action(detail=True, methods=["get"], url_path="historial")
    def historial(self, request, pk=None):
        contrato = self.get_object()
        solo_cliente = request.query_params.get("solo_cliente", "true").lower() == "true"

        eventos = [
            self._build_contract_history_event(registro)
            for registro in contrato.historia.all().order_by("-history_date")[:30]
        ]
        eventos.extend(
            self._build_generic_history_event(registro, "servicio", "Se modificaron los servicios del contrato")
            for registro in ContratoServicio.historia.filter(contrato_id=contrato.pk).order_by("-history_date")[:30]
        )
        eventos.extend(
            self._build_generic_history_event(registro, "condicion", "Se modificaron las condiciones especiales")
            for registro in ContratoCondicionEspecial.historia.filter(contrato_id=contrato.pk).order_by("-history_date")[:30]
        )
        eventos.extend(
            self._build_generic_history_event(registro, "confidencialidad", "Se modificó un acuerdo de confidencialidad")
            for registro in AcuerdoConfidencialidadContrato.historia.filter(contrato_id=contrato.pk).order_by("-history_date")[:30]
        )
        for envio in contrato.envios_aprobacion.order_by("-fecha_envio", "-id")[:30]:
            if envio.deprecado:
                detalle_aprobacion = (
                    "Se invalido el enlace de aprobacion pendiente porque el contrato volvio a borrador"
                )
                fecha_aprobacion = envio.fecha_deprecacion or envio.fecha_envio
                tipo_aprobacion = "Revision"
                cambios_aprobacion = envio.motivo_deprecacion or ""
                solicitado_por_cliente = False
            elif envio.respondido:
                if envio.aprobado:
                    detalle_aprobacion = f"El cliente aprobó el contrato"
                else:
                    detalle_aprobacion = f"El cliente solicitó cambios: {envio.comentario_respuesta or 'Sin comentario'}"
            else:
                detalle_aprobacion = f"Se envió el contrato para revisión del cliente"
            if not envio.deprecado:
                fecha_aprobacion = envio.fecha_respuesta or envio.fecha_envio
                tipo_aprobacion = "Aprobacion" if envio.aprobado else "Revision"
                cambios_aprobacion = envio.comentario_respuesta or ""
                solicitado_por_cliente = True
            eventos.append({
                "id": f"aprobacion-{envio.id}",
                "fecha": fecha_aprobacion,
                "tipo": tipo_aprobacion,
                "usuario": envio.destinatario.nombre_display,
                "origen": "aprobacion",
                "detalle": detalle_aprobacion,
                "cambios": cambios_aprobacion,
                "solicitado_por_cliente": solicitado_por_cliente,
            })
        for envio in EnvioContratoFirmaUsuario.objects.filter(usuario__contrato=contrato).order_by("-fecha_envio", "-id")[:30]:
            if envio.firmado:
                detalle_firma = f"Contrato firmado por {envio.usuario.nombre_display}"
            else:
                detalle_firma = f"Se envió el contrato para firma de {envio.usuario.nombre_display}"
            eventos.append({
                "id": f"firma-{envio.id}",
                "fecha": envio.fecha_firma or envio.fecha_envio,
                "tipo": "Firma" if envio.firmado else "Envio",
                "usuario": envio.usuario.nombre_display,
                "origen": "firma",
                "detalle": detalle_firma,
                "cambios": "Documento firmado y versión PDF actualizada." if envio.firmado else "",
                "solicitado_por_cliente": True,
            })

        # Filtrar: por defecto solo creación + cambios solicitados por cliente
        if solo_cliente:
            eventos = [
                e for e in eventos
                if e.get("tipo") == "Creacion" or e.get("solicitado_por_cliente", False)
            ]

        eventos.sort(
            key=lambda item: (item["fecha"] is not None, item["fecha"] or timezone.now()),
            reverse=True,
        )
        return Response(eventos[:50])

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

    @action(detail=True, methods=["post"], url_path="generar-secciones")
    def generar_secciones(self, request, pk=None):
        """Genera/regenera secciones de contrato desde la plantilla asociada."""
        from contratos.motor_plantillas import generar_secciones_contrato
        contrato = self.get_object()
        if not contrato.plantilla:
            return Response(
                {"detail": "El contrato no tiene plantilla asociada."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        secciones = generar_secciones_contrato(contrato)
        return Response(SeccionContratoGeneradaSerializer(secciones, many=True).data)

    @action(detail=True, methods=["get"], url_path="secciones-generadas")
    def secciones_generadas_action(self, request, pk=None):
        """Lista las secciones generadas del contrato."""
        contrato = self.get_object()
        secciones = contrato.secciones_generadas.all().order_by("orden")
        return Response(SeccionContratoGeneradaSerializer(secciones, many=True).data)

    @action(detail=False, methods=["get"], url_path="activos-cliente")
    def activos_cliente(self, request):
        """Contratos activos de un cliente, con visitas (incluidas/usadas) e ítems comerciales.
        Usado por el módulo de facturación para matching OT → contrato.
        Query params: ?cliente_id=<int>
        """
        cliente_id = request.query_params.get("cliente_id")
        if not cliente_id:
            return Response(
                {"detail": "Se requiere el parámetro 'cliente_id'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = self.get_queryset().filter(
            empresa_cliente_id=cliente_id,
            estado="activo",
        ).prefetch_related("contrato_visitas", "contrato_visitas__visita", "items_comerciales")
        serializer = ContratoMatchingSerializer(qs, many=True)
        return Response(serializer.data)


class UsuarioVinculadoContratoViewSet(viewsets.ModelViewSet):
    serializer_class = UsuarioVinculadoContratoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        contrato_pk = self.kwargs.get('contrato_pk')
        empresa = _empresa_del_usuario(self.request.user)
        contratos_visibles = _contratos_visibles_para_empresa(empresa)
        if contrato_pk:
            return UsuarioVinculadoContrato.objects.filter(
                contrato_id=contrato_pk,
                contrato__in=contratos_visibles,
            ).select_related(
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
        empresa = _empresa_del_usuario(self.request.user)
        contratos_visibles = _contratos_visibles_para_empresa(empresa)
        if contrato_pk:
            return ContratoServicio.objects.filter(
                contrato_id=contrato_pk,
                contrato__in=contratos_visibles,
            ).select_related("item_comercial", "content_type")
        return ContratoServicio.objects.none()

    def perform_create(self, serializer):
        contrato_pk = self.kwargs.get('contrato_pk')
        contrato = ContratoEmpresaCliente.objects.get(pk=contrato_pk)
        serializer.save(contrato=contrato)

class ContratoVisitaViewSet(viewsets.ModelViewSet):
    serializer_class = ContratoVisitaSerializer

    def get_queryset(self):
        contrato_pk = self.kwargs.get('contrato_pk')
        empresa = _empresa_del_usuario(self.request.user)
        contratos_visibles = _contratos_visibles_para_empresa(empresa)
        if contrato_pk:
            return ContratoVisita.objects.filter(
                contrato_id=contrato_pk,
                contrato__in=contratos_visibles,
            )
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
        empresa = _empresa_del_usuario(self.request.user)
        contratos_visibles = _contratos_visibles_para_empresa(empresa)
        if contrato_pk:
            return ContratoCondicionEspecial.objects.filter(
                contrato_id=contrato_pk,
                contrato__in=contratos_visibles,
            )
        return ContratoCondicionEspecial.objects.none()

    def perform_create(self, serializer):
        contrato_pk = self.kwargs.get('contrato_pk')
        contrato = ContratoEmpresaCliente.objects.get(pk=contrato_pk)
        serializer.save(contrato=contrato)

class AcuerdoConfidencialidadContratoViewSet(viewsets.ModelViewSet):
    serializer_class = AcuerdoConfidencialidadContratoSerializer

    def get_queryset(self):
        contrato_pk = self.kwargs.get('contrato_pk')
        empresa = _empresa_del_usuario(self.request.user)
        contratos_visibles = _contratos_visibles_para_empresa(empresa)
        if contrato_pk:
            return AcuerdoConfidencialidadContrato.objects.filter(
                contrato_id=contrato_pk,
                contrato__in=contratos_visibles,
            )
        return AcuerdoConfidencialidadContrato.objects.none()

    def perform_create(self, serializer):
        contrato_pk = self.kwargs.get('contrato_pk')
        contrato = ContratoEmpresaCliente.objects.get(pk=contrato_pk)
        serializer.save(
            contrato=contrato,
            fecha_envio=timezone.now(),
            vigencia_desde=serializer.validated_data.get("vigencia_desde") or contrato.fecha_inicio,
        )

# ViewSets para modelos de catálogo, que permanecen a nivel superior:
class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa = _empresa_del_usuario(self.request.user)
        if not empresa:
            return Servicio.objects.none()
        qs = Servicio.objects.filter(empresa_prestadora=empresa).prefetch_related(
            "caracteristicas",
            "alcance_items__caracteristica",
        )
        if self.action == "list":
            qs = qs.filter(es_vigente=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(empresa_prestadora=_empresa_del_usuario(self.request.user))

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        usado_en_contrato = (
            ContratoItemComercial.objects.filter(servicio_version=instance).exists()
            or ContratoServicio.objects.filter(
                content_type=ContentType.objects.get_for_model(Servicio),
                object_id=instance.pk,
            ).exists()
        )
        if not usado_en_contrato:
            self.perform_update(serializer)
            return Response(serializer.data)

        with transaction.atomic():
            alcance_config = serializer.validated_data.pop("alcance_config", None)
            caracteristicas_ids = serializer.validated_data.pop("caracteristicas_ids", None)
            if alcance_config is None and caracteristicas_ids is not None:
                alcance_config = [
                    {
                        "caracteristica": caracteristica,
                        "modo": "incluye",
                        "orden": index,
                    }
                    for index, caracteristica in enumerate(caracteristicas_ids)
                ]
            payload = {
                "nombre": instance.nombre,
                "descripcion": instance.descripcion,
                "categoria": instance.categoria,
                "incluye": instance.incluye,
                "no_incluye": instance.no_incluye,
                "clausulas_especiales": instance.clausulas_especiales,
                "precio_clp": instance.precio_clp,
                "precio_uf": instance.precio_uf,
                "precio_usd": instance.precio_usd,
                "veces_por_mes_default": instance.veces_por_mes_default,
                "formas_pago_permitidas": instance.formas_pago_permitidas,
            }
            payload.update(serializer.validated_data)
            instance.es_vigente = False
            instance.save(update_fields=["es_vigente", "fecha_modificacion"])
            nuevo = Servicio.objects.create(
                **payload,
                empresa_prestadora=instance.empresa_prestadora,
                version=instance.version + 1,
                servicio_origen=instance.servicio_origen or instance,
                version_anterior=instance,
                activo=True,
                es_vigente=True,
            )
            if alcance_config is not None:
                ServicioSerializer._sync_alcance(nuevo, alcance_config)
            else:
                ServicioSerializer.clonar_alcance(instance, nuevo)
        return Response(self.get_serializer(nuevo).data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if (
            ContratoServicio.objects.filter(
                content_type=ContentType.objects.get_for_model(Servicio),
                object_id=instance.pk,
            ).exists()
            or ContratoItemComercial.objects.filter(servicio_version=instance).exists()
            or PlanServicioDetalle.objects.filter(servicio_version=instance).exists()
        ):
            return Response(
                {"detail": "No se puede eliminar: este servicio está asociado a contratos."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

class PlanServicioViewSet(viewsets.ModelViewSet):
    queryset = PlanServicio.objects.all()
    serializer_class = PlanServicioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa = _empresa_del_usuario(self.request.user)
        if not empresa:
            return PlanServicio.objects.none()
        return PlanServicio.objects.filter(empresa_prestadora=empresa).prefetch_related(
            "detalles_servicio__servicio_version__alcance_items__caracteristica",
            "detalles_servicio__servicio_version__caracteristicas",
            "servicios__alcance_items__caracteristica",
            "servicios__caracteristicas",
        )

    def perform_create(self, serializer):
        serializer.save(empresa_prestadora=_empresa_del_usuario(self.request.user))

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        usado_en_contrato = (
            ContratoItemComercial.objects.filter(plan_version=instance).exists()
            or ContratoServicio.objects.filter(
                content_type=ContentType.objects.get_for_model(PlanServicio),
                object_id=instance.pk,
            ).exists()
        )
        if not usado_en_contrato:
            self.perform_update(serializer)
            return Response(serializer.data)

        with transaction.atomic():
            servicios = list(serializer.validated_data.pop("servicios", []))
            payload = {
                "nombre": instance.nombre,
                "descripcion": instance.descripcion,
                "incluye": instance.incluye,
                "no_incluye": instance.no_incluye,
                "clausulas_especiales": instance.clausulas_especiales,
                "precio_clp": instance.precio_clp,
                "precio_uf": instance.precio_uf,
                "precio_usd": instance.precio_usd,
                "veces_por_mes_default": instance.veces_por_mes_default,
                "formas_pago_permitidas": instance.formas_pago_permitidas,
            }
            payload.update(serializer.validated_data)
            instance.es_vigente = False
            instance.save(update_fields=["es_vigente", "fecha_modificacion"])
            nuevo = PlanServicio.objects.create(
                **payload,
                empresa_prestadora=instance.empresa_prestadora,
                version=instance.version + 1,
                plan_origen=instance.plan_origen or instance,
                version_anterior=instance,
                activo=True,
                es_vigente=True,
            )
            if servicios:
                serializer._guardar_detalles_servicio(nuevo, servicios)
            else:
                for detalle in instance.detalles_servicio.all():
                    PlanServicioDetalle.objects.create(
                        plan=nuevo,
                        servicio_version=detalle.servicio_version,
                        orden=detalle.orden,
                        obligatorio=detalle.obligatorio,
                        cantidad_default=detalle.cantidad_default,
                        veces_por_mes_default=detalle.veces_por_mes_default,
                    )
        return Response(self.get_serializer(nuevo).data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if (
            ContratoServicio.objects.filter(
                content_type=ContentType.objects.get_for_model(PlanServicio),
                object_id=instance.pk,
            ).exists()
            or ContratoItemComercial.objects.filter(plan_version=instance).exists()
        ):
            return Response(
                {"detail": "No se puede eliminar: este plan está asociado a contratos."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

class CaracteristicaServicioViewSet(viewsets.ModelViewSet):
    queryset = CaracteristicaServicio.objects.all()
    serializer_class = CaracteristicaServicioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa = _empresa_del_usuario(self.request.user)
        if not empresa:
            return CaracteristicaServicio.objects.none()
        return CaracteristicaServicio.objects.filter(
            models.Q(empresa_prestadora=empresa) | models.Q(empresa_prestadora__isnull=True)
        )

    def perform_create(self, serializer):
        serializer.save(empresa_prestadora=_empresa_del_usuario(self.request.user))

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.servicios.exists():
            return Response(
                {"detail": "No se puede eliminar: la caracteristica esta asociada a servicios."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

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
        try:
            usuario_vinculado = UsuarioVinculadoContrato.objects.get(
                pk=self.kwargs.get("usuario_vinculado_pk"),
                contrato_id=self.kwargs.get("contrato_pk"),
            )
        except UsuarioVinculadoContrato.DoesNotExist:
            return Response(
                {"detail": "No se encontro el usuario vinculado indicado para este contrato."},
                status=status.HTTP_404_NOT_FOUND,
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
        if not firma_prestadora_disponible(contrato):
            return Response(
                {
                    "detail": (
                        "La empresa prestadora debe tener una firma configurada antes de enviar el contrato a firma."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            snapshot, pdf_bytes = preparar_documento_contrato(
                contrato,
                request=request,
                require_provider_signature=True,
            )
        except Exception as exc:
            logger.exception(
                "Error preparando documento para envio de firma anidado. contrato_id=%s usuario_vinculado_id=%s",
                contrato.id,
                usuario_vinculado.id,
            )
            return _build_envio_firma_error_response(etapa="preparar_documento", exc=exc)

        try:
            envio = EnvioContratoFirmaUsuario.objects.create(
                usuario=usuario_vinculado,
                snapshot_contrato=snapshot,
                pdf_congelado=pdf_bytes,
            )
            marcar_envio(envio)
            envio.save(update_fields=["enviado", "fecha_envio"])
        except Exception as exc:
            logger.exception(
                "Error creando envio de firma anidado. contrato_id=%s usuario_vinculado_id=%s",
                contrato.id,
                usuario_vinculado.id,
            )
            return _build_envio_firma_error_response(etapa="crear_envio", exc=exc)

        try:
            enviar_correo_firma(envio)
        except Exception as exc:
            logger.exception(
                "Error despachando correo de firma anidado. contrato_id=%s envio_id=%s",
                contrato.id,
                envio.id,
            )
            return _build_envio_firma_error_response(etapa="enviar_correo", exc=exc)

        try:
            contrato.estado = "en_firma"
            contrato.save(update_fields=["estado", "fecha_modificacion"])
        except Exception as exc:
            logger.exception(
                "Error actualizando contrato a en_firma en flujo anidado. contrato_id=%s envio_id=%s",
                contrato.id,
                envio.id,
            )
            return _build_envio_firma_error_response(etapa="actualizar_estado", exc=exc)

        try:
            serializer = self.get_serializer(envio)
            data = serializer.data
        except Exception as exc:
            logger.exception(
                "Error serializando respuesta de envio de firma anidado. contrato_id=%s envio_id=%s",
                contrato.id,
                envio.id,
            )
            return _build_envio_firma_error_response(etapa="serializar_respuesta", exc=exc)

        headers = self.get_success_headers(data)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], url_path='reenviar')
    def reenviar(self, request, pk=None, contrato_pk=None, usuario_vinculado_pk=None):
        """
        Reenvía el correo de firma para este EnvioContratoFirmaUsuario.
        """
        envio = self.get_object()
        contrato = envio.usuario.contrato

        if envio.firmado:
            return Response(
                {"detail": "El documento ya fue firmado y no admite un nuevo reenvio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if contrato.estado != "en_firma":
            return Response(
                {"detail": "El contrato ya no esta disponible para reenviar a firma."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
    try:
        firma_normalizada = validar_firma_imagen(firma_value)
    except ValueError as exc:
        return HttpResponseBadRequest(str(exc))

    envio.firma       = firma_normalizada
    envio.fecha_firma = fecha_firma
    envio.firmado     = bool(firmado_value)
    envio.ip_respuesta = get_client_ip(request)
    actualizar_pdf_firmado_envio(envio)
    envio.save(update_fields=['firma', 'fecha_firma', 'firmado', 'ip_respuesta', 'pdf_congelado'])
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

    # ── Próximo período disponible ─────────────────────────────
    @action(detail=False, methods=["get"], url_path="proximo-periodo")
    def proximo_periodo(self, request):
        """Calcula el próximo período de facturación no facturado para un contrato.

        Query params:
          - ?contrato_id=<id>  (obligatorio)

        Retorna: { periodo_inicio, periodo_fin } según la forma_pago_contractual.
        """
        from dateutil.relativedelta import relativedelta

        contrato_id = request.query_params.get("contrato_id")
        if not contrato_id:
            return Response(
                {"detail": "Debe indicar 'contrato_id'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            contrato = ContratoEmpresaCliente.objects.get(pk=contrato_id)
        except ContratoEmpresaCliente.DoesNotExist:
            return Response(
                {"detail": "Contrato no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        hoy = timezone.now().date()
        forma = contrato.forma_pago_contractual

        if forma == "anual":
            delta = relativedelta(years=1)
        elif forma == "pago_unico":
            delta = relativedelta(years=1)
        else:
            delta = relativedelta(months=1)

        ultima_factura = (
            FacturaContrato.objects.filter(contrato=contrato)
            .exclude(estado="anulado")
            .order_by("-periodo_fin")
            .first()
        )

        if ultima_factura:
            periodo_inicio = ultima_factura.periodo_fin + timedelta(days=1)
        else:
            periodo_inicio = contrato.fecha_inicio

        periodo_fin = periodo_inicio + delta - timedelta(days=1)

        return Response({
            "periodo_inicio": periodo_inicio.isoformat(),
            "periodo_fin": periodo_fin.isoformat(),
        })

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


# =====================================================================
# ViewSets del Sistema de Plantillas
# =====================================================================

class PlantillaContratoViewSet(viewsets.ModelViewSet):
    serializer_class = PlantillaContratoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa = _empresa_del_usuario(self.request.user)
        if not empresa:
            return PlantillaContrato.objects.none()
        qs = PlantillaContrato.objects.filter(empresa_prestadora=empresa)
        tipo = self.request.query_params.get("tipo_contrato")
        if tipo:
            qs = qs.filter(tipo_contrato=tipo)
        return qs

    def _serialize_plantilla(self, plantilla):
        return PlantillaContratoSerializer(plantilla).data

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        return Response([self._serialize_plantilla(plantilla) for plantilla in queryset])

    def retrieve(self, request, *args, **kwargs):
        plantilla = self.get_object()
        return Response(self._serialize_plantilla(plantilla))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            self._serialize_plantilla(serializer.instance),
            status=status.HTTP_201_CREATED,
        )

    def perform_create(self, serializer):
        empresa = _empresa_del_usuario(self.request.user)
        serializer.save(empresa_prestadora=empresa)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(self._serialize_plantilla(serializer.instance))

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="duplicar")
    def duplicar(self, request, pk=None):
        """Duplica una plantilla con sus secciones."""
        plantilla_original = self.get_object()
        nueva = PlantillaContrato.objects.create(
            empresa_prestadora=plantilla_original.empresa_prestadora,
            titulo=f"{plantilla_original.titulo} (copia)",
            descripcion=plantilla_original.descripcion,
            version=plantilla_original.version + 1,
            tipo_contrato=plantilla_original.tipo_contrato,
            orden_bloque_alcance=plantilla_original.orden_bloque_alcance,
            orden_bloque_operacion=plantilla_original.orden_bloque_operacion,
            orden_bloque_condiciones=plantilla_original.orden_bloque_condiciones,
            es_default=False,
        )
        for seccion in plantilla_original.secciones.all():
            SeccionPlantilla.objects.create(
                plantilla=nueva,
                titulo=seccion.titulo,
                tipo=seccion.tipo,
                contenido_template=seccion.contenido_template,
                orden=seccion.orden,
                es_editable_en_contrato=seccion.es_editable_en_contrato,
                es_obligatoria=seccion.es_obligatoria,
            )
        return Response(
            self._serialize_plantilla(nueva),
            status=status.HTTP_201_CREATED,
        )


class SeccionPlantillaViewSet(viewsets.ModelViewSet):
    serializer_class = SeccionPlantillaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        plantilla_id = self.kwargs.get("plantilla_pk")
        return SeccionPlantilla.objects.filter(plantilla_id=plantilla_id)

    def _normalizar_firmas(self, serializer):
        """Si la sección es tipo firmas, fuerza contenido canónico y flags."""
        from contratos.estados_modelo import CONTENIDO_CANONICO_FIRMAS

        if serializer.validated_data.get('tipo') == 'firmas' or (
            self.action in ('partial_update', 'update')
            and serializer.instance
            and serializer.instance.tipo == 'firmas'
        ):
            serializer.validated_data['contenido_template'] = CONTENIDO_CANONICO_FIRMAS
            serializer.validated_data['es_editable_en_contrato'] = False
            serializer.validated_data['es_obligatoria'] = True

    def perform_create(self, serializer):
        plantilla_id = self.kwargs.get("plantilla_pk")
        self._normalizar_firmas(serializer)
        orden = serializer.validated_data.get("orden")
        if orden is None or SeccionPlantilla.objects.filter(
            plantilla_id=plantilla_id, orden=orden
        ).exists():
            max_orden = (
                SeccionPlantilla.objects.filter(plantilla_id=plantilla_id)
                .order_by("-orden")
                .values_list("orden", flat=True)
                .first()
            ) or 0
            serializer.save(plantilla_id=plantilla_id, orden=max_orden + 1)
        else:
            serializer.save(plantilla_id=plantilla_id)

    def perform_update(self, serializer):
        self._normalizar_firmas(serializer)
        serializer.save()

    @action(detail=False, methods=["post"], url_path="reordenar")
    def reordenar(self, request, plantilla_pk=None):
        """Reordena secciones y posición de bloques demo.
        Body: {
            "secciones": [{ "id": 1, "orden": 1 }, { "id": 2, "orden": 2 }],
            "bloques": { "alcance": 3, "operacion": 5, "condiciones": 7 }
        }
        """
        secciones_data = request.data.get("secciones", [])
        bloques_data = request.data.get("bloques", {})

        if not secciones_data:
            return Response(
                {"detail": "Debe enviar una lista de secciones con id y orden."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = SeccionPlantilla.objects.filter(plantilla_id=plantilla_pk)
        ids_plantilla = set(qs.values_list("id", flat=True))
        ids_recibidos = []

        orden_por_id = {}
        for item in secciones_data:
            sec_id = item.get("id")
            orden = item.get("orden")

            if sec_id is None or orden is None:
                return Response(
                    {"detail": "Cada elemento debe tener 'id' y 'orden'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if sec_id not in ids_plantilla:
                return Response(
                    {"detail": f"La sección {sec_id} no pertenece a esta plantilla."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if sec_id in ids_recibidos:
                return Response(
                    {"detail": f"La sección {sec_id} está repetida en la solicitud."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            ids_recibidos.append(sec_id)
            orden_por_id[sec_id] = orden

        if set(ids_recibidos) != ids_plantilla:
            return Response(
                {"detail": "Debe enviar todas las secciones de la plantilla para reordenar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validar y aplicar posiciones de bloques
        bloque_fields = {}
        for bloque_key in ("alcance", "operacion", "condiciones"):
            if bloque_key in bloques_data:
                valor = bloques_data[bloque_key]
                if not isinstance(valor, int) or valor < 0:
                    return Response(
                        {"detail": f"El bloque '{bloque_key}' debe ser un entero positivo."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                bloque_fields[f"orden_bloque_{bloque_key}"] = valor

        with transaction.atomic():
            _aplicar_orden_secciones(qs, orden_por_id)
            if bloque_fields:
                PlantillaContrato.objects.filter(id=plantilla_pk).update(**bloque_fields)

        return Response({"detail": "Secciones reordenadas."}, status=status.HTTP_200_OK)


class EtiquetaPlantillaViewSet(viewsets.ModelViewSet):
    serializer_class = EtiquetaPlantillaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa = _empresa_del_usuario(self.request.user)
        if empresa:
            return EtiquetaPlantilla.objects.filter(
                models.Q(empresa_prestadora__isnull=True)
                | models.Q(empresa_prestadora=empresa)
            )
        return EtiquetaPlantilla.objects.filter(empresa_prestadora__isnull=True)

    def perform_create(self, serializer):
        empresa = _empresa_del_usuario(self.request.user)
        serializer.save(empresa_prestadora=empresa)


class SeccionContratoGeneradaViewSet(viewsets.ModelViewSet):
    serializer_class = SeccionContratoGeneradaSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'head']

    def get_queryset(self):
        contrato_id = self.kwargs.get("contrato_pk")
        return SeccionContratoGenerada.objects.filter(contrato_id=contrato_id)

    def perform_update(self, serializer):
        serializer.save(fue_editado_manualmente=True)
