"""ViewSets del modulo RRHH."""

import copy
import logging
import os
from datetime import date, timedelta

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import PersonalizacionUsuario
from core.tasks import send_email_task
from cuentas.models import InvitacionEmpresa, User
from empresas.models import RelacionEmpresa, SucursalEmpresa, UsuarioEmpresa

from .estados_modelo import TRANSICIONES_CONTRATO
from .models import (
    AfpCatalogo,
    AnexoContrato,
    BancoCatalogo,
    CargoCatalogo,
    ConfiguracionLaboral,
    ContratoTrabajador,
    EnvioAprobacionEmpleador,
    NacionalidadCatalogo,
    TurnoLaboral,
)
from .mixins import JsonBlockMixin
from .serializers import (
    AfpCatalogoSerializer,
    AnexoContratoSerializer,
    BancoCatalogoSerializer,
    CargoCatalogoSerializer,
    ConfiguracionLaboralSerializer,
    ContratoAprobacionPublicaSerializer,
    ContratoTrabajadorSerializer,
    ContratoTrabajadorWriteSerializer,
    CrearContratoConTrabajadorSerializer,
    EnvioAprobacionEmpleadorSerializer,
    NacionalidadCatalogoSerializer,
    SnapshotGetBlockSerializer,
    SnapshotUpdateBlockSerializer,
    TurnoLaboralSerializer,
)


logger = logging.getLogger(__name__)


def _empresa_actual(request):
    """Devuelve la empresa del usuario autenticado o None."""
    pers = PersonalizacionUsuario.objects.filter(usuario=request.user).first()
    if pers and pers.sucursal_principal:
        return pers.sucursal_principal.empresa
    return None


def _empresas_clientes_ids(empresa):
    """IDs de empresas relacionadas como clientes (multi-tenancy extendido)."""
    if not empresa:
        return []
    return list(
        RelacionEmpresa.objects.filter(
            prestador_servicios=empresa,
            tipo_relacion="prestador-cliente",
        ).values_list("cliente_id", flat=True)
    )


def _resolver_empresa_destino(request, prestadora):
    """Resuelve la empresa destino desde empresa_id del body.

    Acepta la prestadora o cualquiera de sus clientes; en otro caso retorna
    la prestadora. Usado para catalogos por empresa (turnos, AFP, banco, config).
    """
    empresa_id_body = request.data.get("empresa_id")
    if not empresa_id_body:
        return prestadora
    from empresas.models import Empresa

    try:
        destino = Empresa.objects.get(id=empresa_id_body)
    except Empresa.DoesNotExist:
        return prestadora
    if destino == prestadora or destino.id in _empresas_clientes_ids(prestadora):
        return destino
    return prestadora


def _validar_empresa_id_param(request, empresa):
    """Valida que el empresa_id del query param pertenezca a las empresas visibles del usuario.

    Evita IDOR: un usuario no puede consultar datos de empresas que no le pertenecen.
    Retorna el ID validado o None si el param es inválido/no autorizado.
    """
    empresa_id_param = request.query_params.get("empresa_id", "").strip()
    if not empresa_id_param or not empresa_id_param.isdigit():
        return None
    empresa_id = int(empresa_id_param)
    ids_visibles = ([empresa.id] + _empresas_clientes_ids(empresa)) if empresa else []
    return empresa_id if empresa_id in ids_visibles else None


def _normalizar_valores_json(value):
    """Normaliza valores no serializables de JSON antes de guardarlos en JSONField."""
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _normalizar_valores_json(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_normalizar_valores_json(v) for v in value]
    return value


class CargoCatalogoViewSet(viewsets.ModelViewSet):
    """CRUD para el catalogo de cargos de la empresa."""

    serializer_class = CargoCatalogoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        empresa = _empresa_actual(self.request)
        if not empresa:
            return CargoCatalogo.objects.none()
        return CargoCatalogo.objects.filter(empresa=empresa, activo=True)

    def perform_create(self, serializer):
        empresa = _empresa_actual(self.request)
        serializer.save(empresa=empresa)


class AfpCatalogoViewSet(viewsets.ModelViewSet):
    """Catalogo de AFP: globales (empresa=null) + por empresa.

    Los registros globales son de solo lectura. PATCH/DELETE solo aplican a
    registros de empresa.
    """

    serializer_class = AfpCatalogoSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        empresa = _empresa_actual(self.request)
        empresa_id_validado = _validar_empresa_id_param(self.request, empresa)
        search = self.request.query_params.get("search", "").strip()
        empresa_filtro = empresa_id_validado or (empresa.id if empresa else None)
        qs = AfpCatalogo.objects.filter(
            Q(empresa__isnull=True) | Q(empresa_id=empresa_filtro),
            activo=True,
        )
        if search:
            qs = qs.filter(nombre__icontains=search)
        return qs.order_by("nombre")

    def perform_create(self, serializer):
        prestadora = _empresa_actual(self.request)
        empresa = _resolver_empresa_destino(self.request, prestadora)
        nombre = serializer.validated_data.get("nombre", "").strip()
        existe = AfpCatalogo.objects.filter(
            Q(empresa__isnull=True) | Q(empresa=empresa),
            nombre__iexact=nombre,
        ).first()
        if existe:
            raise serializers.ValidationError({"nombre": "Ya existe una AFP con ese nombre."})
        serializer.save(empresa=empresa)

    def perform_update(self, serializer):
        if serializer.instance.empresa_id is None:
            raise serializers.ValidationError("Las AFP globales no pueden modificarse.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.empresa_id is None:
            raise serializers.ValidationError("Las AFP globales no pueden eliminarse.")
        instance.delete()


class BancoCatalogoViewSet(viewsets.ModelViewSet):
    """Catalogo de bancos: globales (empresa=null) + por empresa.

    Los registros globales son de solo lectura. PATCH/DELETE solo aplican a
    registros de empresa.
    """

    serializer_class = BancoCatalogoSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        empresa = _empresa_actual(self.request)
        empresa_id_validado = _validar_empresa_id_param(self.request, empresa)
        search = self.request.query_params.get("search", "").strip()
        empresa_filtro = empresa_id_validado or (empresa.id if empresa else None)
        qs = BancoCatalogo.objects.filter(
            Q(empresa__isnull=True) | Q(empresa_id=empresa_filtro),
            activo=True,
        )
        if search:
            qs = qs.filter(nombre__icontains=search)
        return qs.order_by("nombre")

    def perform_create(self, serializer):
        prestadora = _empresa_actual(self.request)
        empresa = _resolver_empresa_destino(self.request, prestadora)
        nombre = serializer.validated_data.get("nombre", "").strip()
        existe = BancoCatalogo.objects.filter(
            Q(empresa__isnull=True) | Q(empresa=empresa),
            nombre__iexact=nombre,
        ).first()
        if existe:
            raise serializers.ValidationError({"nombre": "Ya existe un banco con ese nombre."})
        serializer.save(empresa=empresa)

    def perform_update(self, serializer):
        if serializer.instance.empresa_id is None:
            raise serializers.ValidationError("Los bancos globales no pueden modificarse.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.empresa_id is None:
            raise serializers.ValidationError("Los bancos globales no pueden eliminarse.")
        instance.delete()


class NacionalidadCatalogoViewSet(viewsets.ModelViewSet):
    """Catalogo de nacionalidades: globales (empresa=null) + por empresa.

    Los registros globales son de solo lectura. PATCH/DELETE solo aplican a
    registros de empresa.
    """

    serializer_class = NacionalidadCatalogoSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        empresa = _empresa_actual(self.request)
        empresa_id_validado = _validar_empresa_id_param(self.request, empresa)
        search = self.request.query_params.get("search", "").strip()
        empresa_filtro = empresa_id_validado or (empresa.id if empresa else None)
        qs = NacionalidadCatalogo.objects.filter(
            Q(empresa__isnull=True) | Q(empresa_id=empresa_filtro),
            activo=True,
        )
        if search:
            qs = qs.filter(nombre__icontains=search)
        return qs.order_by("nombre")

    def perform_create(self, serializer):
        prestadora = _empresa_actual(self.request)
        empresa = _resolver_empresa_destino(self.request, prestadora)
        nombre = serializer.validated_data.get("nombre", "").strip()
        existe = NacionalidadCatalogo.objects.filter(
            Q(empresa__isnull=True) | Q(empresa=empresa),
            nombre__iexact=nombre,
        ).first()
        if existe:
            raise serializers.ValidationError({"nombre": "Ya existe una nacionalidad con ese nombre."})
        serializer.save(empresa=empresa)

    def perform_update(self, serializer):
        if serializer.instance.empresa_id is None:
            raise serializers.ValidationError("Las nacionalidades globales no pueden modificarse.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.empresa_id is None:
            raise serializers.ValidationError("Las nacionalidades globales no pueden eliminarse.")
        instance.delete()


class ConfiguracionLaboralViewSet(viewsets.ModelViewSet):
    """Parametros legales/laborales: globales (empresa=null) + override por empresa.

    Los parametros globales son de solo lectura. Para crear un override por
    empresa se hace POST con empresa_id en el body y la misma clave.
    """

    serializer_class = ConfiguracionLaboralSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        empresa = _empresa_actual(self.request)
        empresa_id_validado = _validar_empresa_id_param(self.request, empresa)
        empresa_filtro = empresa_id_validado or (empresa.id if empresa else None)
        return ConfiguracionLaboral.objects.filter(
            Q(empresa__isnull=True) | Q(empresa_id=empresa_filtro),
        ).order_by("clave")

    def perform_create(self, serializer):
        prestadora = _empresa_actual(self.request)
        empresa = _resolver_empresa_destino(self.request, prestadora)
        clave = serializer.validated_data.get("clave", "").strip()
        existe = ConfiguracionLaboral.objects.filter(empresa=empresa, clave=clave).first()
        if existe:
            raise serializers.ValidationError(
                {"clave": "Ya existe un parametro con esa clave para esta empresa."}
            )
        serializer.save(empresa=empresa)

    def perform_update(self, serializer):
        if serializer.instance.empresa_id is None:
            raise serializers.ValidationError("Los parametros globales no pueden modificarse.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.empresa_id is None:
            raise serializers.ValidationError("Los parametros globales no pueden eliminarse.")
        instance.delete()


class TurnoLaboralViewSet(viewsets.ModelViewSet):
    """Catalogo de turnos laborales: globales (empresa=null) + por empresa."""

    serializer_class = TurnoLaboralSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        empresa = _empresa_actual(self.request)
        empresa_id_validado = _validar_empresa_id_param(self.request, empresa)
        if empresa_id_validado:
            qs = TurnoLaboral.objects.filter(
                Q(empresa__isnull=True) | Q(empresa_id=empresa_id_validado),
            )
        else:
            clientes_ids = _empresas_clientes_ids(empresa)
            qs = TurnoLaboral.objects.filter(
                Q(empresa__isnull=True) | Q(empresa=empresa) | Q(empresa_id__in=clientes_ids),
            )
        solo_activos = self.request.query_params.get("activos", "true")
        if solo_activos.lower() == "true":
            qs = qs.filter(activo=True)
        return qs.order_by("nombre")

    def perform_create(self, serializer):
        prestadora = _empresa_actual(self.request)

        # Si se envía empresa_id en el body, usar esa empresa (debe ser cliente de la prestadora)
        empresa_id_body = self.request.data.get("empresa_id")
        if empresa_id_body:
            from empresas.models import Empresa
            try:
                empresa_destino = Empresa.objects.get(id=empresa_id_body)
                es_cliente = RelacionEmpresa.objects.filter(
                    prestador_servicios=prestadora,
                    cliente=empresa_destino,
                    tipo_relacion="prestador-cliente",
                ).exists()
                empresa = empresa_destino if (es_cliente or empresa_destino == prestadora) else prestadora
            except Empresa.DoesNotExist:
                empresa = prestadora
        else:
            empresa = prestadora

        nombre = serializer.validated_data.get("nombre", "").strip()
        existe = TurnoLaboral.objects.filter(
            Q(empresa__isnull=True) | Q(empresa=empresa),
            nombre__iexact=nombre,
        ).first()
        if existe:
            raise serializers.ValidationError({"nombre": "Ya existe un turno con ese nombre."})
        serializer.save(empresa=empresa)

    def perform_update(self, serializer):
        if serializer.instance.empresa is None:
            raise serializers.ValidationError("Los turnos globales no pueden modificarse.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.empresa is None:
            raise serializers.ValidationError("Los turnos globales no pueden eliminarse.")
        instance.delete()


class AnexoContratoViewSet(viewsets.ModelViewSet):
    """CRUD de anexos / modificaciones contractuales."""

    serializer_class = AnexoContratoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        empresa = _empresa_actual(self.request)
        if not empresa:
            return AnexoContrato.objects.none()
        ids_visibles = [empresa.id, *_empresas_clientes_ids(empresa)]
        qs = AnexoContrato.objects.filter(
            contrato__usuario_empresa__sucursal__empresa_id__in=ids_visibles,
        ).select_related("contrato")
        contrato_id = self.request.query_params.get("contrato")
        if contrato_id:
            qs = qs.filter(contrato_id=contrato_id)
        return qs.order_by("-fecha_efectiva", "-fecha_creacion")

    def perform_create(self, serializer):
        anexo = serializer.save(creado_por=self.request.user)
        if anexo.tipo == "prorroga" and anexo.nueva_fecha_termino:
            contrato = anexo.contrato
            contrato.fecha_termino = anexo.nueva_fecha_termino
            contrato.save(update_fields=["fecha_termino"])


class ContratoTrabajadorViewSet(JsonBlockMixin, viewsets.ModelViewSet):
    """CRUD + transiciones para contratos laborales."""

    queryset = ContratoTrabajador.objects.all()
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ContratoTrabajadorWriteSerializer
        return ContratoTrabajadorSerializer

    def get_queryset(self):
        empresa = _empresa_actual(self.request)
        if not empresa:
            return ContratoTrabajador.objects.none()

        ids_visibles = [empresa.id, *_empresas_clientes_ids(empresa)]
        sucursal_ids = list(
            SucursalEmpresa.objects.filter(empresa_id__in=ids_visibles).values_list("id", flat=True)
        )
        sucursal_ids_json = [*sucursal_ids, *[str(sid) for sid in sucursal_ids]]
        qs = ContratoTrabajador.objects.filter(
            Q(usuario_empresa__sucursal__empresa_id__in=ids_visibles)
            | Q(
                usuario_empresa__isnull=True,
                datos_trabajador_nuevo__sucursal_id__in=sucursal_ids_json,
            )
        ).select_related("usuario_empresa__usuario", "usuario_empresa__sucursal")

        usuario_empresa_id = self.request.query_params.get("usuario_empresa")
        if usuario_empresa_id:
            qs = qs.filter(usuario_empresa_id=usuario_empresa_id)

        empresa_cliente_id = self.request.query_params.get("empresa_cliente")
        if empresa_cliente_id:
            sucursales_cliente_ids = list(
                SucursalEmpresa.objects.filter(empresa_id=empresa_cliente_id).values_list("id", flat=True)
            )
            sucursales_cliente_ids_json = [
                *sucursales_cliente_ids,
                *[str(sid) for sid in sucursales_cliente_ids],
            ]
            qs = qs.filter(
                Q(usuario_empresa__sucursal__empresa_id=empresa_cliente_id)
                | Q(
                    usuario_empresa__isnull=True,
                    datos_trabajador_nuevo__sucursal_id__in=sucursales_cliente_ids_json,
                )
            )

        return qs

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    @action(detail=True, methods=["get"], url_path="get-block")
    def get_block(self, request, pk=None):
        """Lee un bloque de snapshot_documento por path validado."""
        contrato = self.get_object()
        serializer = SnapshotGetBlockSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        path = serializer.validated_data["path"]

        # TODO(RBAC): validar permisos finos por rol para lectura por path.
        snapshot = contrato.snapshot_documento or {}
        try:
            value = super().get_block(snapshot, path)
        except KeyError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"path": path, "value": value}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["patch"], url_path="update-block")
    def update_block(self, request, pk=None):
        """Actualiza un bloque permitido de snapshot_documento en estado borrador."""
        contrato = self.get_object()

        if contrato.estado != "borrador":
            return Response(
                {"detail": "Solo se puede editar snapshot_documento por bloques en estado borrador."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SnapshotUpdateBlockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        path = serializer.validated_data["path"]
        value = serializer.validated_data["value"]

        # TODO(RBAC): validar permisos finos por rol para escritura por path.
        snapshot_base = contrato.snapshot_documento or {}
        snapshot_copy = copy.deepcopy(snapshot_base)

        try:
            old_value = super().get_block(snapshot_base, path)
            updated_snapshot = super().set_block(snapshot_copy, path, value)
        except (KeyError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        contrato.snapshot_documento = updated_snapshot
        contrato.save(update_fields=["snapshot_documento", "fecha_modificacion"])

        logger.info(
            "Snapshot actualizado por bloque",
            extra={
                "contrato_id": contrato.id,
                "usuario_id": getattr(request.user, "id", None),
                "path": path,
                "old_value": old_value,
                "new_value": value,
            },
        )

        return Response(
            {"path": path, "old_value": old_value, "value": value},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="cambiar-estado")
    def cambiar_estado(self, request, pk=None):
        from .services import RRHHContratosService

        contrato = self.get_object()
        nuevo_estado = request.data.get("estado")

        if not nuevo_estado:
            return Response(
                {"detail": 'Debe indicar "estado".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Filtrar claves que ya se pasan como argumentos explícitos para evitar TypeError
            extra_data = {
                k: v for k, v in request.data.items()
                if k not in ("estado", "contrato_id", "nuevo_estado")
            }
            contrato = RRHHContratosService.cambiar_estado(
                contrato_id=pk,
                nuevo_estado=nuevo_estado,
                usuario=request.user,
                **extra_data
            )
            return Response(ContratoTrabajadorSerializer(contrato).data)
        except ValidationError as e:
            return Response(
                {"detail": str(e), "errors": e.message_dict if hasattr(e, 'message_dict') else {}},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error cambiando estado: {str(e)}")
            return Response(
                {"detail": "Error al cambiar estado. Intenta nuevamente."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"], url_path="aceptar")
    def aceptar(self, request, pk=None):
        from .services import RRHHContratosService

        contrato = self.get_object()

        if contrato.estado != "pendiente_aprobacion":
            return Response(
                {"detail": "Solo se pueden aceptar contratos en estado 'pendiente_aprobacion'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            contrato = RRHHContratosService.cambiar_estado_a_vigente(
                contrato_id=pk,
                usuario=request.user
            )
            return Response(ContratoTrabajadorSerializer(contrato).data)
        except ValidationError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except ContratoTrabajador.DoesNotExist:
            return Response(
                {"detail": "Contrato no encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error aceptando contrato: {str(e)}")
            return Response(
                {"detail": "Error al aceptar. Intenta nuevamente."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=["post"], url_path="generar-pdf")
    def generar_pdf(self, request, pk=None):
        """
        Genera el PDF del contrato laboral usando el motor v2 polimorfico.

        Estrategia de plantilla:
          1. ``contrato.plantilla_contrato`` (FK explicita).
          2. Plantilla default de la empresa empleadora con
             ``tipo_contrato='trabajador'`` y ``es_default=True``.
          3. Plantilla global (sin empresa) ``tipo_contrato='trabajador'``
             con ``es_default=True``.

        Persiste el PDF en ``contrato.archivo_pdf`` y retorna el contrato
        serializado.
        """
        from contratos.servicio_pdf import PlantillaNoDisponibleError, generar_pdf as _generar_pdf

        contrato = self.get_object()
        try:
            _generar_pdf(contrato, persistir=True)
        except PlantillaNoDisponibleError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ContratoTrabajadorSerializer(contrato).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="subir-pdf",
        parser_classes=(MultiPartParser, FormParser),
    )
    def subir_pdf(self, request, pk=None):
        """Reemplaza el archivo_pdf del contrato con un PDF subido manualmente (firmado, escaneado, etc.)."""
        contrato = self.get_object()
        archivo = request.FILES.get("archivo_pdf")
        if not archivo:
            return Response(
                {"detail": "Debes enviar el archivo en el campo 'archivo_pdf'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not archivo.name.lower().endswith(".pdf"):
            return Response(
                {"detail": "Solo se aceptan archivos PDF."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Eliminar archivo anterior si existe
        if contrato.archivo_pdf:
            try:
                contrato.archivo_pdf.delete(save=False)
            except Exception:
                pass
        contrato.archivo_pdf.save(archivo.name, archivo, save=True)
        return Response(ContratoTrabajadorSerializer(contrato).data)

    @action(detail=True, methods=["patch"], url_path="actualizar-datos-relacionados")
    def actualizar_datos_relacionados(self, request, pk=None):
        """
        Actualiza datos del trabajador mientras el contrato esta en borrador.
        - Si el trabajador es 'nuevo' (datos_trabajador_nuevo seteado): hace merge en el JSONField.
        - Si el trabajador es 'existente' (usuario_empresa seteado): actualiza UsuarioEmpresa y User.
        Solo opera en estado 'borrador'.
        """
        contrato = self.get_object()

        if contrato.estado != "borrador":
            return Response(
                {"detail": "Solo se pueden modificar datos relacionados en estado borrador."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = request.data

        UE_FIELDS = (
            "afp",
            "sistema_salud",
            "nombre_isapre",
            "banco",
            "tipo_cuenta_bancaria",
            "numero_cuenta_bancaria",
        )
        USER_FIELDS = ("nacionalidad", "fecha_nacimiento", "direccion")
        PERSONAL_FIELDS = ("first_name", "last_name", "rut")

        if contrato.datos_trabajador_nuevo is not None:
            # Trabajador pendiente de creacion: actualizar el JSONField
            nuevo = dict(contrato.datos_trabajador_nuevo)
            campos_actualizables = UE_FIELDS + USER_FIELDS + PERSONAL_FIELDS
            for campo in campos_actualizables:
                if campo in data:
                    nuevo[campo] = data[campo]
            contrato.datos_trabajador_nuevo = nuevo
            contrato.save(update_fields=["datos_trabajador_nuevo"])

        elif contrato.usuario_empresa_id is not None:
            # Trabajador existente: actualizar UsuarioEmpresa y User
            ue = contrato.usuario_empresa
            ue_changed = []
            for campo in UE_FIELDS:
                if campo in data:
                    if campo == "afp":
                        ue.afp_id = data[campo] if data[campo] else None
                        ue_changed.append("afp")
                    else:
                        setattr(ue, campo, data[campo])
                        ue_changed.append(campo)
            if ue_changed:
                ue.save(update_fields=ue_changed)

            if ue.usuario_id:
                user = ue.usuario
                user_changed = []
                for campo in USER_FIELDS + PERSONAL_FIELDS:
                    if campo in data:
                        if campo == "first_name":
                            user.first_name = data[campo]
                            user_changed.append("first_name")
                        elif campo == "last_name":
                            user.last_name = data[campo]
                            user_changed.append("last_name")
                        elif campo == "rut":
                            user.rut = data[campo]
                            user_changed.append("rut")
                        else:
                            setattr(user, campo, data[campo])
                            user_changed.append(campo)
                if user_changed:
                    user.save(update_fields=user_changed)
        else:
            return Response(
                {"detail": "El contrato no tiene trabajador asociado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        contrato.refresh_from_db()
        return Response(ContratoTrabajadorSerializer(contrato).data)

    @action(detail=False, methods=["post"], url_path="crear-con-trabajador")
    def crear_con_trabajador(self, request):
        """Crea (o reusa) un UsuarioEmpresa y le asocia un contrato laboral en una sola operacion."""
        validador = CrearContratoConTrabajadorSerializer(data=request.data)
        validador.is_valid(raise_exception=True)
        trabajador_data = validador.validated_data["trabajador"]
        contrato_data = dict(validador.validated_data["contrato"])

        empresa = _empresa_actual(request)
        if not empresa:
            return Response(
                {"detail": "Usuario sin empresa asociada."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ids_visibles = [empresa.id, *_empresas_clientes_ids(empresa)]

        invitacion_enviada = False

        # Campos opcionales que se aplican al UsuarioEmpresa (datos previsionales/bancarios)
        UE_FIELDS_OPCIONALES = (
            "afp",
            "sistema_salud",
            "nombre_isapre",
            "banco",
            "tipo_cuenta_bancaria",
            "numero_cuenta_bancaria",
        )
        # Campos opcionales que se aplican al User (datos personales)
        USER_FIELDS_OPCIONALES = ("nacionalidad", "fecha_nacimiento", "direccion")

        def _aplicar_datos_extra(ue, user, data):
            """Asigna campos opcionales de UE y User si vienen en el payload."""
            ue_changed = []
            for f in UE_FIELDS_OPCIONALES:
                if f in data and data.get(f) not in (None, ""):
                    if f == "afp":
                        ue.afp_id = data[f] if data[f] else None
                        ue_changed.append("afp")
                    else:
                        setattr(ue, f, data[f])
                        ue_changed.append(f)
            if ue_changed:
                ue.save(update_fields=ue_changed)
            if user is not None:
                user_changed = []
                for f in USER_FIELDS_OPCIONALES:
                    if f in data and data.get(f) not in (None, ""):
                        setattr(user, f, data[f])
                        user_changed.append(f)
                if user_changed:
                    user.save(update_fields=user_changed)

        with transaction.atomic():
            if trabajador_data["modo"] == "existente":
                ue_id = trabajador_data["usuario_empresa_id"]
                ue = UsuarioEmpresa.objects.select_related("sucursal", "usuario").filter(pk=ue_id).first()
                if not ue or ue.sucursal.empresa_id not in ids_visibles:
                    return Response(
                        {"detail": "UsuarioEmpresa no encontrado o fuera de tu alcance."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                _aplicar_datos_extra(ue, ue.usuario, trabajador_data)
                datos_trabajador_nuevo = None
            else:
                # modo == "nuevo": solo se valida el payload y se guarda en datos_trabajador_nuevo.
                # El User y UsuarioEmpresa se crean cuando el empleador apruebe el contrato.
                email = trabajador_data["email"].lower().strip()
                sucursal_id = trabajador_data["sucursal_id"]
                sucursal = SucursalEmpresa.objects.filter(pk=sucursal_id).first()
                if not sucursal or sucursal.empresa_id not in ids_visibles:
                    return Response(
                        {"detail": "Sucursal no encontrada o fuera de tu alcance."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if User.objects.filter(email=email).exists():
                    return Response(
                        {"detail": "Ya existe un usuario con ese email."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                ue = None
                datos_trabajador_nuevo = {
                    k: _normalizar_valores_json(v)
                    for k, v in trabajador_data.items()
                }
                datos_trabajador_nuevo["email"] = email  # normalizado

            contrato_data["usuario_empresa"] = ue.id if ue else None
            ser = ContratoTrabajadorWriteSerializer(data=contrato_data)
            ser.is_valid(raise_exception=True)
            contrato = ser.save(creado_por=request.user, datos_trabajador_nuevo=datos_trabajador_nuevo)

        # Notificacion al empleador (empresa cliente) si corresponde (solo modo existente)
        enviar_al_empleador = contrato_data.get("enviar_al_empleador", True)
        if enviar_al_empleador and ue:
            try:
                empresa_cliente = ue.sucursal.empresa if ue.sucursal_id else None
                email_contacto = getattr(empresa_cliente, "email_contacto", None) if empresa_cliente else None
                if email_contacto:
                    nombre_trab = ue.usuario.get_nombre_completo() if ue.usuario_id else "el trabajador"
                    html_notif = (
                        f"<p>Se ha creado un nuevo contrato laboral para <strong>{nombre_trab}</strong>.</p>"
                        f"<p>Contrato: {contrato.referencia_interna or contrato.get_tipo_contrato_display()}</p>"
                        f"<p>Fecha de inicio: {contrato.fecha_inicio}</p>"
                    )
                    transaction.on_commit(
                        lambda ec=email_contacto: send_email_task.delay(
                            "Nuevo contrato laboral creado",
                            [ec],
                            html_notif,
                            "Notificacion de Contrato",
                        )
                    )
            except Exception:
                pass  # No interrumpir la creacion por un fallo de notificacion

        return Response(
            {
                "contrato": ContratoTrabajadorSerializer(contrato).data,
                "usuario_empresa_id": ue.id if ue else None,
                "invitacion_enviada": invitacion_enviada,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="crear-copia")
    def crear_copia(self, request, pk=None):
        """Crea una copia del contrato en estado borrador.

        El nombre del nuevo contrato se recibe en el body como `nombre`.
        Los documentos PDF, firma, fecha de aprobacion y sueldo liquido NO se copian.
        """
        original = self.get_object()
        nombre = (request.data.get("nombre") or "").strip()
        if not nombre:
            return Response(
                {"detail": "El campo 'nombre' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        CAMPOS_COPIADOS = [
            "usuario_empresa", "datos_trabajador_nuevo",
            "tipo_contrato", "fecha_inicio", "fecha_termino",
            "cargo", "funciones", "jornada", "horas_semanales",
            "horario_detalle", "tiempo_colacion", "lugar_trabajo",
            "sueldo_base", "moneda", "tipo_gratificacion",
            "bono_movilizacion", "bono_colacion",
            "plantilla_contrato", "lugar_celebracion_contrato", "observaciones",
            "cantidad_meses", "dias_semana", "turnos_rotativo",
            "enviar_al_empleador",
        ]

        nuevo = ContratoTrabajador(
            referencia_interna=nombre,
            estado="borrador",
            creado_por=request.user,
        )
        for campo in CAMPOS_COPIADOS:
            setattr(nuevo, campo, getattr(original, campo))

        nuevo._change_reason = f"[SISTEMA] Copia del contrato #{original.pk} creada por {request.user}"
        nuevo.save()

        return Response(
            ContratoTrabajadorSerializer(nuevo).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="enviar-aprobacion-empleador")
    def enviar_aprobacion_empleador(self, request, pk=None):
        """
        Envia el contrato PDF al empleador para su aprobacion previa.
        REFACTORIZADO: Usa RRHHContratosService.enviar_a_aprobacion_empleador()
        """
        from .services import RRHHContratosService

        contrato = self.get_object()

        email_empleador = request.data.get("email_empleador", "").strip()
        if not email_empleador:
            return Response(
                {"detail": "Debes indicar el 'email_empleador' al que enviar la aprobacion."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            envio = RRHHContratosService.enviar_a_aprobacion_empleador(
                contrato_id=pk,
                email_empleador=email_empleador,
                usuario=request.user
            )

            return Response(
                {
                    "contrato": ContratoTrabajadorSerializer(envio.contrato).data,
                    "envio": EnvioAprobacionEmpleadorSerializer(envio).data,
                },
                status=status.HTTP_200_OK,
            )
        except ValidationError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error enviando aprobacion: {str(e)}")
            return Response(
                {"detail": "Error al enviar. Intenta nuevamente."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # ── Helpers para historial ────────────────────────────────────────────────

    @staticmethod
    def _actor_tipo_rrhh(history_user):
        """Clasifica el actor segun si el cambio fue hecho por un usuario autenticado o el sistema."""
        return "sistema" if history_user is None else "rrhh"

    @staticmethod
    def _safe_user_display_rrhh(history_user):
        if not history_user:
            return None
        if hasattr(history_user, "get_nombre_completo"):
            return history_user.get_nombre_completo() or str(history_user)
        return str(history_user)

    @staticmethod
    def _humanize_contrato_trab_change(registro):
        """Describe el cambio del contrato en lenguaje natural, con diff de campos relevantes."""
        CAMPOS_LEGIBLES = {
            "estado": "Estado",
            "cargo": "Cargo",
            "sueldo_base": "Sueldo base",
            "sueldo_liquido": "Sueldo liquido",
            "moneda": "Moneda",
            "fecha_inicio": "Fecha inicio",
            "fecha_termino": "Fecha termino",
            "tipo_contrato": "Tipo de contrato",
            "jornada": "Jornada",
            "horas_semanales": "Horas semanales",
            "lugar_trabajo": "Lugar de trabajo",
            "bono_movilizacion": "Bono movilizacion",
            "bono_colacion": "Bono colacion",
            "tipo_gratificacion": "Tipo de gratificacion",
            "horario_detalle": "Horario detalle",
            "funciones": "Funciones",
            "observaciones": "Observaciones",
            "nombre": "Nombre",
        }
        if registro.history_type == "+":
            return "Contrato creado en borrador"
        if registro.history_type == "-":
            return "Contrato eliminado"
        try:
            prev = registro.prev_record
            if prev is None:
                return "Actualizacion del contrato"
            delta = registro.diff_against(prev)
            cambios = []
            for change in delta.changes:
                if change.field not in CAMPOS_LEGIBLES:
                    continue
                label = CAMPOS_LEGIBLES[change.field]
                if change.field == "estado":
                    cambios.append(f"{label} cambio de '{change.old}' a '{change.new}'")
                else:
                    cambios.append(f"Se modifico {label}")
            if cambios:
                return "; ".join(cambios)
            return "Actualizacion del contrato"
        except Exception:
            return "Actualizacion del contrato"

    @staticmethod
    def _diff_campos_contrato_trab(registro):
        """Retorna lista de diffs {campo, valor_anterior, valor_nuevo} para campos relevantes."""
        CAMPOS_LEGIBLES = {
            "estado": "Estado",
            "cargo": "Cargo",
            "sueldo_base": "Sueldo base",
            "sueldo_liquido": "Sueldo liquido",
            "moneda": "Moneda",
            "fecha_inicio": "Fecha inicio",
            "fecha_termino": "Fecha termino",
            "tipo_contrato": "Tipo de contrato",
            "jornada": "Jornada",
            "horas_semanales": "Horas semanales",
            "lugar_trabajo": "Lugar de trabajo",
            "bono_movilizacion": "Bono movilizacion",
            "bono_colacion": "Bono colacion",
            "tipo_gratificacion": "Tipo de gratificacion",
            "horario_detalle": "Horario detalle",
            "funciones": "Funciones",
            "observaciones": "Observaciones",
            "nombre": "Nombre",
        }
        if registro.history_type != "~":
            return []
        try:
            prev = registro.prev_record
            if prev is None:
                return []
            delta = registro.diff_against(prev)
            result = []
            for change in delta.changes:
                if change.field not in CAMPOS_LEGIBLES:
                    continue
                result.append({
                    "campo": CAMPOS_LEGIBLES[change.field],
                    "valor_anterior": str(change.old) if change.old is not None else None,
                    "valor_nuevo": str(change.new) if change.new is not None else None,
                })
            return result
        except Exception:
            return []

    def _build_contrato_trab_history_event(self, registro):
        actor = self._actor_tipo_rrhh(registro.history_user)
        detalle = self._humanize_contrato_trab_change(registro)
        cambios = self._diff_campos_contrato_trab(registro)
        # Determinar evento_tipo
        if registro.history_type == "+":
            evento_tipo = "creacion"
        elif registro.history_type == "-":
            evento_tipo = "eliminacion"
        else:
            # Si no hubo cambios en campos rastreados, ignorar el registro
            if not cambios:
                return None
            # Ver si hubo cambio de estado
            tiene_estado = any(c["campo"] == "Estado" for c in cambios)
            evento_tipo = "cambio_estado" if tiene_estado else "modificacion_campos"

        # Cambios de estado y modificacion de campos siempre son de la empresa prestadora
        if evento_tipo in ("cambio_estado", "modificacion_campos", "creacion"):
            actor = "rrhh"

        return {
            "id": f"contrato-{registro.history_id}",
            "fecha": registro.history_date,
            "actor_tipo": actor,
            "actor_nombre": self._safe_user_display_rrhh(registro.history_user),
            "evento_tipo": evento_tipo,
            "origen": "contrato",
            "detalle": detalle,
            "cambios": cambios,
        }

    @staticmethod
    def _build_envio_aprobacion_events(envio):
        """Genera hasta dos eventos por EnvioAprobacionEmpleador: envio (rrhh) + respuesta (cliente)."""
        eventos = []
        # Evento 1: envio realizado por RRHH
        nombre_rrhh = None
        if envio.enviado_por_id:
            u = envio.enviado_por
            if hasattr(u, "get_nombre_completo"):
                nombre_rrhh = u.get_nombre_completo() or str(u)
            else:
                nombre_rrhh = str(u)
        eventos.append({
            "id": f"envio-{envio.id}",
            "fecha": envio.fecha_envio,
            "actor_tipo": "rrhh",
            "actor_nombre": nombre_rrhh,
            "evento_tipo": "envio_aprobacion",
            "origen": "aprobacion_empleador",
            "detalle": f"Contrato enviado al empleador ({envio.enviado_a}) para aprobacion.",
            "cambios": [],
        })
        # Evento 2: respuesta del empleador (solo si ya respondio)
        if envio.decision != "pendiente" and envio.fecha_respuesta:
            DECISION_EVENTO = {
                "aprobado": ("aprobacion", "El empleador aprobo el contrato."),
                "rechazado": ("rechazo", f"El empleador rechazo el contrato. Motivo: {envio.motivo_rechazo or 'No especificado'}."),
                "cambios_solicitados": ("solicitud_cambio", "El empleador solicito cambios al contrato."),
            }
            evento_tipo, detalle_base = DECISION_EVENTO.get(
                envio.decision, ("aprobacion", "El empleador respondio.")
            )
            cambios = []
            if envio.decision == "cambios_solicitados" and envio.cambios_solicitados:
                for item in envio.cambios_solicitados:
                    cambios.append({
                        "campo": "Cambio solicitado",
                        "valor_anterior": None,
                        "valor_nuevo": str(item),
                    })
            eventos.append({
                "id": f"respuesta-{envio.id}",
                "fecha": envio.fecha_respuesta,
                "actor_tipo": "cliente",
                "actor_nombre": f"Empleador ({envio.enviado_a})",
                "evento_tipo": evento_tipo,
                "origen": "aprobacion_empleador",
                "detalle": detalle_base,
                "cambios": cambios,
            })
        return eventos

    def _build_anexo_history_event(self, registro):
        if registro.history_type == "+":
            evento_tipo = "anexo_creado"
            detalle = "Se creo un anexo al contrato."
        else:
            evento_tipo = "modificacion_campos"
            detalle = "Se modifico un anexo del contrato."
        # Cambios en anexos siempre son de la empresa prestadora
        actor = "rrhh"
        return {
            "id": f"anexo-{registro.history_id}",
            "fecha": registro.history_date,
            "actor_tipo": actor,
            "actor_nombre": self._safe_user_display_rrhh(registro.history_user),
            "evento_tipo": evento_tipo,
            "origen": "anexo",
            "detalle": detalle,
            "cambios": [],
        }

    @action(detail=True, methods=["get"], url_path="historial")
    def historial(self, request, pk=None):
        """Timeline de cambios del contrato: RRHH, sistema y empleador."""
        contrato = self.get_object()

        eventos = [
            e for e in (
                self._build_contrato_trab_history_event(r)
                for r in contrato.historia.all().order_by("-history_date")[:100]
            )
            if e is not None
        ]

        for anexo in contrato.anexos.all():
            eventos.extend(
                self._build_anexo_history_event(r)
                for r in anexo.historia.all().order_by("-history_date")[:20]
            )

        for envio in contrato.envios_aprobacion_empleador.all().order_by("fecha_envio"):
            eventos.extend(self._build_envio_aprobacion_events(envio))

        eventos.sort(key=lambda e: e["fecha"] or "", reverse=True)

        return Response(eventos)

    @action(detail=True, methods=["get"], url_path="estado-aprobacion-empleador")
    def estado_aprobacion_empleador(self, request, pk=None):
        """Devuelve el ultimo envio de aprobacion activo del contrato."""
        contrato = self.get_object()
        envio = contrato.envios_aprobacion_empleador.filter(expirado=False).first()
        if not envio:
            return Response({"envio": None})
        return Response({"envio": EnvioAprobacionEmpleadorSerializer(envio).data})


def _envio_aprobacion_empleador_expirado(envio):
    return envio.esta_expirado()


def _get_envio_aprobacion_fecha_expiracion(envio):
    return envio.fecha_expiracion


# ─── Vistas publicas (sin autenticacion) ─────────────────────────────────────

class ContratoAprobacionPublicaView(APIView):
    """GET /api/public/contrato-aprobacion/<uuid>/ — datos del contrato para el empleador."""

    permission_classes = [AllowAny]

    def get(self, request, uuid):
        envio = EnvioAprobacionEmpleador.objects.filter(uuid=uuid).select_related(
            "contrato__usuario_empresa__usuario",
            "contrato__usuario_empresa__sucursal__empresa",
        ).first()
        if not envio:
            return Response({"detail": "Enlace no valido."}, status=status.HTTP_404_NOT_FOUND)
        if _envio_aprobacion_empleador_expirado(envio):
            return Response(
                {
                    "detail": "Este enlace ha expirado.",
                    "fecha_expiracion": _get_envio_aprobacion_fecha_expiracion(envio),
                },
                status=status.HTTP_410_GONE,
            )
        contrato_data = ContratoAprobacionPublicaSerializer(envio.contrato).data
        return Response(
            {
                "contrato": contrato_data,
                "decision": envio.decision,
                "decision_label": envio.get_decision_display(),
                "fecha_envio": envio.fecha_envio,
                "fecha_expiracion": _get_envio_aprobacion_fecha_expiracion(envio),
            }
        )


class ContratoAprobacionPDFView(APIView):
    """GET /api/public/contrato-aprobacion/<uuid>/pdf/ — descarga el PDF del contrato.

    Comportamiento:
    - Si decision != 'aprobado': regenera el PDF usando el motor canonico con
      marca de agua BORRADOR (forzar_borrador=True).
    - Si decision == 'aprobado':
        - ?watermark=0 (default): entrega el PDF congelado limpio.
        - ?watermark=1: regenera con marca de agua (no deberia usarse normalmente).
    """

    permission_classes = [AllowAny]

    def get(self, request, uuid):
        from django.http import HttpResponse

        from contratos.servicio_pdf import PlantillaNoDisponibleError, generar_pdf as _generar_pdf

        envio = EnvioAprobacionEmpleador.objects.filter(uuid=uuid).select_related(
            "contrato"
        ).first()
        if not envio:
            return Response({"detail": "Enlace no valido."}, status=status.HTTP_404_NOT_FOUND)
        if _envio_aprobacion_empleador_expirado(envio):
            return Response(
                {
                    "detail": "Este enlace ha expirado.",
                    "fecha_expiracion": _get_envio_aprobacion_fecha_expiracion(envio),
                },
                status=status.HTTP_410_GONE,
            )

        aprobado = envio.decision == "aprobado"
        forzar_borrador = not aprobado or request.query_params.get("watermark", "0") == "1"

        if forzar_borrador:
            # Regenerar con el motor canonico y marca de agua BORRADOR
            try:
                pdf_bytes = _generar_pdf(envio.contrato, forzar_borrador=True)
            except PlantillaNoDisponibleError:
                return Response(
                    {"detail": "No hay plantilla disponible para generar el PDF."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            # PDF congelado aprobado, sin marca de agua
            pdf_bytes = bytes(envio.pdf_congelado)

        filename = f"contrato_aprobacion_{envio.contrato_id}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response



class ContratoAprobacionResponderView(APIView):
    """POST /api/public/contrato-aprobacion/<uuid>/responder/ — registra la decision del empleador."""

    permission_classes = [AllowAny]

    def post(self, request, uuid):
        envio = EnvioAprobacionEmpleador.objects.filter(uuid=uuid).select_related(
            "contrato__usuario_empresa__usuario",
        ).first()
        if not envio:
            return Response({"detail": "Enlace no valido."}, status=status.HTTP_404_NOT_FOUND)
        if _envio_aprobacion_empleador_expirado(envio):
            return Response(
                {
                    "detail": "Este enlace ha expirado.",
                    "fecha_expiracion": _get_envio_aprobacion_fecha_expiracion(envio),
                },
                status=status.HTTP_410_GONE,
            )
        if envio.decision != "pendiente":
            return Response(
                {"detail": "Ya se registro una respuesta para este envio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        decision = request.data.get("decision")
        if decision not in ("aprobado", "rechazado", "cambios_solicitados"):
            return Response(
                {"detail": "decision debe ser: aprobado, rechazado o cambios_solicitados."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        envio.decision = decision
        envio.motivo_rechazo = request.data.get("motivo_rechazo") or None
        envio.cambios_solicitados = request.data.get("cambios_solicitados") or []
        envio.notificar_trabajador = bool(request.data.get("notificar_trabajador", False))
        envio.fecha_respuesta = timezone.now()
        # Registrar IP de forma segura
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded:
            ip = x_forwarded.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR")
        envio.ip_respuesta = ip

        email_trabajador = request.data.get("email_trabajador") or None
        if isinstance(email_trabajador, str):
            email_trabajador = email_trabajador.strip() or None
        if envio.notificar_trabajador and email_trabajador:
            try:
                validate_email(email_trabajador)
            except ValidationError:
                return Response(
                    {"detail": "Email de trabajador inválido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        envio.save()

        contrato = envio.contrato
        enviado_por_email = (
            envio.enviado_por.email if envio.enviado_por_id else None
        )

        if decision == "aprobado":
            if contrato.estado == "pendiente_aprobacion":
                update_fields = ["estado", "fecha_modificacion"]
                contrato.estado = "vigente"

                # Si hay trabajador pendiente (modo nuevo del wizard), crear User + UsuarioEmpresa ahora.
                if contrato.datos_trabajador_nuevo:
                    with transaction.atomic():
                        datos = contrato.datos_trabajador_nuevo
                        email_trab = datos["email"].lower().strip()
                        sucursal_trab = SucursalEmpresa.objects.filter(pk=datos["sucursal_id"]).first()

                        if not sucursal_trab or User.objects.filter(email=email_trab).exists():
                            # Sucursal eliminada o email ya registrado: limpiar datos sin crear usuario.
                            contrato.datos_trabajador_nuevo = None
                            update_fields += ["datos_trabajador_nuevo"]
                        else:
                            nuevo_user = User.objects.create_user(
                                email=email_trab,
                                first_name=datos.get("first_name", ""),
                                last_name=datos.get("last_name", ""),
                                is_active=False,
                            )
                            nuevo_ue = UsuarioEmpresa.objects.create(
                                usuario=nuevo_user,
                                sucursal=sucursal_trab,
                                rut=datos.get("rut") or None,
                                estado="1",
                            )
                            ue_extra = (
                                "afp", "sistema_salud", "nombre_isapre",
                                "banco", "tipo_cuenta_bancaria", "numero_cuenta_bancaria",
                            )
                            ue_changed = [f for f in ue_extra if datos.get(f)]
                            for f in ue_changed:
                                setattr(nuevo_ue, f, datos[f])
                            if ue_changed:
                                nuevo_ue.save(update_fields=ue_changed)
                            user_extra = ("nacionalidad", "fecha_nacimiento", "direccion")
                            user_changed = [f for f in user_extra if datos.get(f)]
                            for f in user_changed:
                                setattr(nuevo_user, f, datos[f])
                            if user_changed:
                                nuevo_user.save(update_fields=user_changed)

                            contrato.usuario_empresa = nuevo_ue
                            contrato.datos_trabajador_nuevo = None
                            update_fields += ["usuario_empresa", "datos_trabajador_nuevo"]

                            if datos.get("enviar_invitacion", True):
                                invitacion = InvitacionEmpresa.objects.create(
                                    email=email_trab,
                                    first_name=datos.get("first_name", ""),
                                    last_name=datos.get("last_name", ""),
                                    sucursal=sucursal_trab,
                                    expiration_date=timezone.now() + timedelta(days=7),
                                )
                                activation_link = (
                                    f"{os.getenv('FRONTEND_URL', '').rstrip('/')}"
                                    f"/aceptar-invitacion/{invitacion.activation_token}/"
                                )
                                html_inv = (
                                    f"<p>Tu contrato laboral esta listo. "
                                    f"Activa tu cuenta para revisarlo.</p>"
                                )
                                transaction.on_commit(
                                    lambda e=email_trab, l=activation_link: send_email_task.delay(
                                        "Tu contrato laboral esta listo",
                                        [e],
                                        html_inv,
                                        "Invitacion Empresa",
                                        l,
                                        "Activar mi cuenta",
                                    )
                                )
                        contrato._change_reason = "[SISTEMA] Contrato aprobado por empleador via vista publica"
                        contrato.save(update_fields=update_fields)
                else:
                    contrato._change_reason = "[SISTEMA] Contrato aprobado por empleador via vista publica"
                    contrato.save(update_fields=update_fields)

            # Notificar al usuario interno
            if enviado_por_email:
                nombre_trab = (
                    contrato.usuario_empresa.usuario.get_nombre_completo()
                    if contrato.usuario_empresa and contrato.usuario_empresa.usuario_id
                    else "el trabajador"
                )
                html = (
                    f"<p>El empleador ha <strong>aprobado</strong> el contrato de "
                    f"<strong>{nombre_trab}</strong>.</p>"
                    f"<p>Ya puedes activar el contrato desde el sistema.</p>"
                )
                transaction.on_commit(
                    lambda e=enviado_por_email: send_email_task.delay(
                        "Contrato laboral aprobado por el empleador",
                        [e],
                        html,
                        "Aprobacion de Contrato",
                        "",
                        "",
                    )
                )

            # Si notificar_trabajador: enviar PDF al trabajador
            if envio.notificar_trabajador:
                email_destino = email_trabajador or (
                    contrato.usuario_empresa.usuario.email
                    if contrato.usuario_empresa and contrato.usuario_empresa.usuario_id
                    else None
                )
                if email_destino:
                    pdf_bytes = bytes(envio.pdf_congelado)
                    html_trab = (
                        f"<p>Tu contrato laboral fue aprobado. Se adjunta el documento para tu revision.</p>"
                    )
                    transaction.on_commit(
                        lambda e=email_destino, p=pdf_bytes, cid=contrato.id: send_email_task.delay(
                            "Tu contrato laboral esta listo",
                            [e],
                            html_trab,
                            "Contrato Laboral",
                            "",
                            "",
                            pdf_attachment=(f"contrato_{cid}.pdf", p),
                        )
                    )

        elif decision == "rechazado":
            # El rechazo anula el contrato definitivamente (fin del flujo)
            if contrato.estado in ("pendiente_aprobacion", "borrador"):
                contrato.estado = "anulado"
                contrato._change_reason = "[SISTEMA] Contrato rechazado por empleador via vista publica"
                contrato.save(update_fields=["estado", "fecha_modificacion"])

            if enviado_por_email:
                motivo = envio.motivo_rechazo or "Sin motivo indicado."
                html = (
                    f"<p>El empleador ha <strong>rechazado</strong> el contrato.</p>"
                    f"<p>Motivo: {motivo}</p>"
                )
                transaction.on_commit(
                    lambda e=enviado_por_email: send_email_task.delay(
                        "Contrato laboral rechazado por el empleador",
                        [e],
                        html,
                        "Rechazo de Contrato",
                        "",
                        "",
                    )
                )

        elif decision == "cambios_solicitados":
            if enviado_por_email:
                cambios = envio.cambios_solicitados or []
                lista_cambios = "".join(f"<li>{c}</li>" for c in cambios) if cambios else "<li>Sin detalle.</li>"
                html = (
                    f"<p>El empleador ha solicitado <strong>cambios</strong> al contrato:</p>"
                    f"<ul>{lista_cambios}</ul>"
                )
                transaction.on_commit(
                    lambda e=enviado_por_email: send_email_task.delay(
                        "El empleador solicito cambios al contrato",
                        [e],
                        html,
                        "Cambios Solicitados al Contrato",
                        "",
                        "",
                    )
                )

        return Response(
            {
                "ok": True,
                "decision": envio.decision,
                "decision_label": envio.get_decision_display(),
            }
        )
