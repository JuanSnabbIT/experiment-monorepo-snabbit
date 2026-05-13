"""ViewSets del modulo RRHH."""

import os
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import PersonalizacionUsuario
from core.tasks import send_email_task
from cuentas.models import InvitacionEmpresa, User
from empresas.models import RelacionEmpresa, SucursalEmpresa, UsuarioEmpresa

from .estados_modelo import TRANSICIONES_CONTRATO
from .models import ContratoTrabajador
from .serializers import (
    ContratoTrabajadorSerializer,
    ContratoTrabajadorWriteSerializer,
    CrearContratoConTrabajadorSerializer,
)


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


class ContratoTrabajadorViewSet(viewsets.ModelViewSet):
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
        qs = ContratoTrabajador.objects.filter(
            usuario_empresa__sucursal__empresa_id__in=ids_visibles,
        ).select_related("usuario_empresa__usuario", "usuario_empresa__sucursal")

        usuario_empresa_id = self.request.query_params.get("usuario_empresa")
        if usuario_empresa_id:
            qs = qs.filter(usuario_empresa_id=usuario_empresa_id)

        empresa_cliente_id = self.request.query_params.get("empresa_cliente")
        if empresa_cliente_id:
            qs = qs.filter(usuario_empresa__sucursal__empresa_id=empresa_cliente_id)

        return qs

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    @action(detail=True, methods=["post"], url_path="cambiar-estado")
    def cambiar_estado(self, request, pk=None):
        contrato = self.get_object()
        nuevo_estado = request.data.get("estado")

        if not nuevo_estado:
            return Response(
                {"detail": 'Debe indicar "estado".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        permitidos = TRANSICIONES_CONTRATO.get(contrato.estado, [])
        if nuevo_estado not in permitidos:
            return Response(
                {
                    "detail": (
                        f"No se puede cambiar de '{contrato.estado}' a '{nuevo_estado}'."
                    ),
                    "transiciones_validas": permitidos,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        contrato.estado = nuevo_estado

        # Sincronizacion al activar contrato
        if nuevo_estado == "vigente":
            ue = contrato.usuario_empresa
            if contrato.cargo:
                ue.cargo = contrato.cargo
            if contrato.fecha_inicio and not ue.fecha_contrato:
                ue.fecha_contrato = contrato.fecha_inicio
            ue.save(update_fields=["cargo", "fecha_contrato"])

        if nuevo_estado == "terminado":
            contrato.fecha_termino_real = (
                request.data.get("fecha_termino_real") or timezone.now().date()
            )
            motivo = request.data.get("motivo_termino")
            if motivo:
                contrato.motivo_termino = motivo
            observaciones = request.data.get("observaciones_termino")
            if observaciones is not None:
                contrato.observaciones_termino = observaciones

        contrato.save()
        return Response(ContratoTrabajadorSerializer(contrato).data)

    @action(detail=True, methods=["post"], url_path="aceptar")
    def aceptar(self, request, pk=None):
        contrato = self.get_object()

        if contrato.estado != "pendiente_aceptacion":
            return Response(
                {"detail": "Solo se pueden aceptar contratos en estado 'pendiente_aceptacion'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        contrato.estado = "vigente"
        contrato.fecha_aceptacion = timezone.now()
        contrato.aceptado_por = request.user

        ue = contrato.usuario_empresa
        if contrato.cargo:
            ue.cargo = contrato.cargo
        if contrato.fecha_inicio and not ue.fecha_contrato:
            ue.fecha_contrato = contrato.fecha_inicio
        ue.save(update_fields=["cargo", "fecha_contrato"])

        contrato.save()
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

        with transaction.atomic():
            if trabajador_data["modo"] == "existente":
                ue_id = trabajador_data["usuario_empresa_id"]
                ue = UsuarioEmpresa.objects.select_related("sucursal").filter(pk=ue_id).first()
                if not ue or ue.sucursal.empresa_id not in ids_visibles:
                    return Response(
                        {"detail": "UsuarioEmpresa no encontrado o fuera de tu alcance."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                # modo == "nuevo"
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

                user = User.objects.create_user(
                    email=email,
                    first_name=trabajador_data["first_name"],
                    last_name=trabajador_data.get("last_name", ""),
                    is_active=False,
                )
                ue = UsuarioEmpresa.objects.create(
                    usuario=user,
                    sucursal=sucursal,
                    rut=trabajador_data.get("rut") or None,
                    estado="1",
                )

                if trabajador_data.get("enviar_invitacion", True):
                    invitacion = InvitacionEmpresa.objects.create(
                        email=email,
                        first_name=trabajador_data["first_name"],
                        last_name=trabajador_data.get("last_name", ""),
                        sucursal=sucursal,
                        expiration_date=timezone.now() + timedelta(days=7),
                    )
                    activation_link = (
                        f"{os.getenv('FRONTEND_URL', '').rstrip('/')}"
                        f"/aceptar-invitacion/{invitacion.activation_token}/"
                    )
                    html_body = (
                        f"<p>Has sido invitado a unirte a {sucursal} como trabajador.</p>"
                        f"<p>Por favor activa tu cuenta para revisar tu contrato.</p>"
                    )
                    transaction.on_commit(
                        lambda: send_email_task.delay(
                            "Invitacion como trabajador",
                            [email],
                            html_body,
                            "Invitacion Empresa",
                            activation_link,
                            "Aceptar Invitacion",
                        )
                    )
                    invitacion_enviada = True

            contrato_data["usuario_empresa"] = ue.id
            ser = ContratoTrabajadorWriteSerializer(data=contrato_data)
            ser.is_valid(raise_exception=True)
            contrato = ser.save(creado_por=request.user)

        return Response(
            {
                "contrato": ContratoTrabajadorSerializer(contrato).data,
                "usuario_empresa_id": ue.id,
                "invitacion_enviada": invitacion_enviada,
            },
            status=status.HTTP_201_CREATED,
        )
