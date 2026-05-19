"""ViewSets del modulo RRHH."""

import json
import os
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from contratos.flow_helpers import get_client_ip, validar_firma_imagen
from core.models import PersonalizacionUsuario
from core.tasks import send_email_task
from cuentas.models import InvitacionEmpresa, User
from empresas.models import RelacionEmpresa, SucursalEmpresa, UsuarioEmpresa

from .estados_modelo import TRANSICIONES_CONTRATO
from .models import ContratoTrabajador, EnvioContratoTrabajadorFirma
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

        return Response(
            {
                "contrato": ContratoTrabajadorSerializer(contrato).data,
                "usuario_empresa_id": ue.id,
                "invitacion_enviada": invitacion_enviada,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="enviar-firma")
    def enviar_firma(self, request, pk=None):
        """Envia el contrato laboral al trabajador para firma publica.

        Transiciona el contrato a 'en_firma' y crea un ``EnvioContratoTrabajadorFirma``
        con snapshot inmutable del documento. Devuelve la URL publica de firma.
        """
        from django.core.files.base import ContentFile

        from contratos.models import PlantillaContrato
        from contratos.adaptadores import AdaptadorContratoTrabajador
        from contratos.motor_plantillas_v2 import generar_secciones_v2
        from contratos.funciones_v2 import generar_contrato_pdf_v2

        contrato = self.get_object()

        if contrato.estado != "pendiente_aceptacion":
            return Response(
                {
                    "detail": (
                        "Solo se puede enviar a firma desde estado 'pendiente_aceptacion'. "
                        f"Estado actual: '{contrato.estado}'."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Resolver plantilla si no esta asignada.
        empresa = (
            contrato.usuario_empresa.sucursal.empresa
            if contrato.usuario_empresa and contrato.usuario_empresa.sucursal_id
            else None
        )
        if not contrato.plantilla_contrato_id and empresa:
            plantilla = PlantillaContrato.objects.filter(
                empresa_prestadora=empresa,
                tipo_contrato="trabajador",
                es_default=True,
                activa=True,
            ).first()
            if plantilla:
                contrato.plantilla_contrato = plantilla
                contrato.save(update_fields=["plantilla_contrato", "fecha_modificacion"])

        # Generar/refrescar PDF si no existe.
        if not contrato.archivo_pdf:
            if not contrato.plantilla_contrato_id:
                return Response(
                    {"detail": "El contrato no tiene plantilla asignada. Genera el PDF primero."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            adaptador = AdaptadorContratoTrabajador(contrato)
            generar_secciones_v2(adaptador)
            pdf_bytes = generar_contrato_pdf_v2(adaptador)
            contrato.archivo_pdf.save(
                f"contrato_trabajador_{contrato.id}.pdf",
                ContentFile(pdf_bytes),
                save=True,
            )

        # Construir snapshot del contrato para inmutabilidad documental.
        snapshot = _construir_snapshot_trabajador(contrato)

        with transaction.atomic():
            envio = EnvioContratoTrabajadorFirma.objects.create(
                contrato=contrato,
                enviado=True,
                fecha_envio=timezone.now(),
                snapshot_contrato=snapshot,
                pdf_congelado=(
                    contrato.archivo_pdf.read() if contrato.archivo_pdf else None
                ),
            )
            contrato.estado = "en_firma"
            contrato.save(update_fields=["estado", "fecha_modificacion"])

        frontend_url = getattr(settings, "FRONTEND_URL", "").rstrip("/")
        url_firma = f"{frontend_url}/contrato/public/firma-trabajador/{envio.uuid}/"

        return Response(
            {
                "uuid": str(envio.uuid),
                "url_firma": url_firma,
                "contrato": ContratoTrabajadorSerializer(contrato).data,
            },
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------------
# Helper: construir snapshot del contrato trabajador para inmutabilidad
# ---------------------------------------------------------------------------

def _construir_snapshot_trabajador(contrato):
    """Serializa los datos relevantes del contrato para el snapshot de firma."""
    secciones_qs = contrato.secciones_generadas.order_by("orden") if hasattr(contrato, "secciones_generadas") else []
    secciones = [
        {
            "id": s.id,
            "titulo": s.titulo,
            "contenido_renderizado": s.contenido_renderizado,
            "orden": s.orden,
        }
        for s in secciones_qs
    ]

    ue = contrato.usuario_empresa
    trabajador = ue.usuario if ue else None
    empresa = ue.sucursal.empresa if ue and ue.sucursal_id else None

    return {
        "tipo_label": "Contrato Laboral",
        "nombre": contrato.nombre or f"Contrato #{contrato.id}",
        "fecha_inicio": contrato.fecha_inicio.isoformat() if contrato.fecha_inicio else None,
        "fecha_termino": contrato.fecha_termino.isoformat() if contrato.fecha_termino else None,
        "tipo_contrato_label": contrato.get_tipo_contrato_display(),
        "cargo": contrato.cargo or "",
        "sueldo_base": str(contrato.sueldo_base) if contrato.sueldo_base else None,
        "sueldo_liquido": str(contrato.sueldo_liquido) if contrato.sueldo_liquido else None,
        "moneda": contrato.moneda or "CLP",
        "datos_empresa": {
            "nombre": empresa.nombre if empresa else "",
            "rut": empresa.rut if empresa else "",
            "direccion": empresa.direccion if empresa else "",
        },
        "datos_trabajador": {
            "nombre": trabajador.get_full_name() if trabajador else "",
            "email": trabajador.email if trabajador else "",
            "rut": ue.rut if ue else "",
        },
        "secciones_generadas": secciones,
    }


# ---------------------------------------------------------------------------
# Vistas publicas de firma laboral (sin autenticacion)
# ---------------------------------------------------------------------------


class PublicContratoTrabajadorFirmaDetailView(APIView):
    """GET /api/public/contrato-trabajador-firma/<uuid:token>/

    Retorna los datos necesarios para que el trabajador revise y firme
    su contrato. El shape es compatible con ``IContratoPublicoFirma`` del
    frontend para reutilizar ``ContratoFirmaExperience``.
    """

    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            envio = EnvioContratoTrabajadorFirma.objects.select_related(
                "contrato",
                "contrato__usuario_empresa__usuario",
                "contrato__usuario_empresa__sucursal__empresa",
            ).get(uuid=token, enviado=True)
        except EnvioContratoTrabajadorFirma.DoesNotExist:
            return Response(
                {"detail": "Token no valido o envio de firma no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        contrato = envio.contrato
        snapshot = envio.snapshot_contrato or {}

        # Preferir secciones del snapshot (congelado al enviar) para integridad documental.
        if snapshot.get("secciones_generadas"):
            secciones_data = snapshot["secciones_generadas"]
        else:
            secciones_qs = contrato.secciones_generadas.order_by("orden") if hasattr(contrato, "secciones_generadas") else []
            secciones_data = [
                {
                    "id": s.id,
                    "titulo": s.titulo,
                    "contenido_renderizado": s.contenido_renderizado,
                    "orden": s.orden,
                }
                for s in secciones_qs
            ]

        ue = contrato.usuario_empresa
        trabajador = ue.usuario if ue else None

        data = {
            "uuid": str(envio.uuid),
            "puede_firmar": not envio.firmado and contrato.estado == "en_firma",
            "firmado": envio.firmado,
            "fecha_envio": envio.fecha_envio.isoformat() if envio.fecha_envio else None,
            "fecha_emision": envio.fecha_envio.isoformat() if envio.fecha_envio else None,
            "fecha_firma": envio.fecha_firma.isoformat() if envio.fecha_firma else None,
            "firma": envio.firma or "",
            "firma_prestadora_disponible": False,
            "es_version_enviada": True,
            "destinatario": {
                "nombre": trabajador.get_full_name() if trabajador else "",
                "email": trabajador.email if trabajador else "",
            },
            "contrato": snapshot,
            "secciones_generadas": secciones_data,
        }
        return Response(data)


class PublicContratoTrabajadorFirmaPDFView(APIView):
    """GET /api/public/contrato-trabajador-firma/<uuid:token>/pdf/

    Sirve el PDF congelado del envio de firma.
    """

    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            envio = EnvioContratoTrabajadorFirma.objects.get(uuid=token, enviado=True)
        except EnvioContratoTrabajadorFirma.DoesNotExist:
            return Response(
                {"detail": "Token no valido o envio de firma no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not envio.pdf_congelado:
            return Response(
                {"detail": "PDF no disponible para este envio."},
                status=status.HTTP_404_NOT_FOUND,
            )

        pdf_bytes = bytes(envio.pdf_congelado)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'inline; filename="contrato_laboral_{envio.contrato_id}.pdf"'
        )
        return response


class PublicFirmarContratoTrabajadorView(APIView):
    """PATCH /api/public/contrato-trabajador-firma/<uuid:token>/firmar/

    Recibe la firma del trabajador, la persiste, y transiciona el contrato
    a estado 'vigente'.

    Payload requerido::

        {
            "firma": "<base64 de imagen>",
            "fecha_firma": "<ISO datetime>",
            "firmado": true
        }
    """

    permission_classes = [AllowAny]

    def patch(self, request, token):
        try:
            envio = EnvioContratoTrabajadorFirma.objects.select_related("contrato").get(
                uuid=token, enviado=True
            )
        except EnvioContratoTrabajadorFirma.DoesNotExist:
            return Response(
                {"detail": "Token no valido o envio de firma no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if envio.firmado:
            return Response(
                {"detail": "Este enlace ya fue utilizado para firmar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if envio.contrato.estado != "en_firma":
            return Response(
                {
                    "detail": "El contrato no esta disponible para firma.",
                    "estado_actual": envio.contrato.estado,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = request.data
        if not isinstance(payload, dict):
            try:
                payload = json.loads(request.body.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                payload = {}

        firma_value = payload.get("firma")
        fecha_firma_str = payload.get("fecha_firma")
        firmado_value = payload.get("firmado")

        if firma_value is None or fecha_firma_str is None or firmado_value is None:
            return Response(
                {"detail": 'Se requieren los campos "firma", "fecha_firma" y "firmado".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fecha_firma = parse_datetime(fecha_firma_str)
        if fecha_firma is None:
            return Response(
                {"detail": '"fecha_firma" no es un datetime ISO valido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            firma_normalizada = validar_firma_imagen(firma_value)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            envio.firma = firma_normalizada
            envio.fecha_firma = fecha_firma
            envio.firmado = bool(firmado_value)
            envio.ip_respuesta = get_client_ip(request)
            envio.save(update_fields=["firma", "fecha_firma", "firmado", "ip_respuesta"])

            contrato = envio.contrato
            contrato.estado = "vigente"
            contrato.fecha_aceptacion = timezone.now()

            # Sincronizar datos al UsuarioEmpresa.
            ue = contrato.usuario_empresa
            if contrato.cargo:
                ue.cargo = contrato.cargo
            if contrato.fecha_inicio and not ue.fecha_contrato:
                ue.fecha_contrato = contrato.fecha_inicio
            ue.save(update_fields=["cargo", "fecha_contrato"])

            contrato.save(update_fields=["estado", "fecha_aceptacion", "fecha_modificacion"])

        return Response(
            {
                "uuid": str(envio.uuid),
                "firmado": envio.firmado,
                "fecha_firma": envio.fecha_firma.isoformat(),
            },
            status=status.HTTP_200_OK,
        )
