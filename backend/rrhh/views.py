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
from .models import CargoCatalogo, ContratoTrabajador
from .serializers import (
    CargoCatalogoSerializer,
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
        from django.core.files.base import ContentFile

        from contratos.models import PlantillaContrato
        from contratos.adaptadores import AdaptadorContratoTrabajador
        from contratos.motor_plantillas_v2 import generar_secciones_v2
        from contratos.funciones_v2 import generar_contrato_pdf_v2

        contrato = self.get_object()
        empresa = (
            contrato.usuario_empresa.sucursal.empresa
            if contrato.usuario_empresa and contrato.usuario_empresa.sucursal_id
            else None
        )

        # Resolucion de plantilla.
        plantilla = contrato.plantilla_contrato
        if not plantilla and empresa:
            plantilla = (
                PlantillaContrato.objects.filter(
                    empresa_prestadora=empresa,
                    tipo_contrato="trabajador",
                    es_default=True,
                    activa=True,
                ).first()
            )
        if not plantilla:
            plantilla = (
                PlantillaContrato.objects.filter(
                    empresa_prestadora__isnull=True,
                    tipo_contrato="trabajador",
                    es_default=True,
                    activa=True,
                ).first()
            )

        if not plantilla:
            return Response(
                {
                    "detail": (
                        "No hay plantilla de contrato laboral disponible. "
                        "Asigna una plantilla al contrato o configura una "
                        "plantilla default tipo 'trabajador'."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Persistir la plantilla resuelta si vino por default.
        if not contrato.plantilla_contrato_id:
            contrato.plantilla_contrato = plantilla
            contrato.save(update_fields=["plantilla_contrato", "fecha_modificacion"])

        adaptador = AdaptadorContratoTrabajador(contrato)

        # 1. Generar/refrescar secciones renderizadas.
        generar_secciones_v2(adaptador)

        # 2. Generar PDF.
        pdf_bytes = generar_contrato_pdf_v2(adaptador)

        # 3. Persistir.
        nombre_archivo = f"contrato_trabajador_{contrato.id}.pdf"
        contrato.archivo_pdf.save(
            nombre_archivo, ContentFile(pdf_bytes), save=True,
        )

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
                _aplicar_datos_extra(ue, user, trabajador_data)

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

        # Notificacion al empleador (empresa cliente) si corresponde
        enviar_al_empleador = contrato_data.get("enviar_al_empleador", True)
        if enviar_al_empleador:
            try:
                empresa_cliente = ue.sucursal.empresa if ue.sucursal_id else None
                email_contacto = getattr(empresa_cliente, "email_contacto", None) if empresa_cliente else None
                if email_contacto:
                    nombre_trab = ue.usuario.get_full_name() if ue.usuario_id else "el trabajador"
                    html_notif = (
                        f"<p>Se ha creado un nuevo contrato laboral para <strong>{nombre_trab}</strong>.</p>"
                        f"<p>Contrato: {contrato.nombre or contrato.get_tipo_contrato_display()}</p>"
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
                "usuario_empresa_id": ue.id,
                "invitacion_enviada": invitacion_enviada,
            },
            status=status.HTTP_201_CREATED,
        )
