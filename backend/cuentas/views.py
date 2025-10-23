from django.shortcuts import render
from django.contrib.auth import get_user_model
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from asgiref.sync import sync_to_async
from django.http import JsonResponse
from .serializers import *
from rest_framework.permissions import AllowAny
from django.core.mail import send_mail
from django_filters import rest_framework as filters
from core.tasks import send_email_task
from empresas.models import SucursalEmpresa, UsuarioEmpresa
from core.models import PersonalizacionUsuario

import os
from dotenv import load_dotenv
load_dotenv()

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

# async def get_grupos_user(request):
#     jwt_authenticator = JWTAuthentication()
#     try:
#         header = jwt_authenticator.get_header(request)
#         raw_token = jwt_authenticator.get_raw_token(header)
#         validated_token = jwt_authenticator.get_validated_token(raw_token)
#         user = await sync_to_async(jwt_authenticator.get_user)(validated_token)
#     except (InvalidToken, TokenError) as e:
#         return JsonResponse({'error': str(e)}, status=401)

#     if not user or not user.is_active:
#         return JsonResponse({'error': 'Usuario no autenticado o inactivo'}, status=401)

#     groups = await sync_to_async(list)(user.groups.values_list('name', flat=True))

#     response_data = {
#         'grupos': groups,
#     }
#     return JsonResponse(response_data)

async def get_grupos_user(request):
    jwt_authenticator = JWTAuthentication()
    try:
        header = jwt_authenticator.get_header(request)
        raw_token = jwt_authenticator.get_raw_token(header)
        validated_token = jwt_authenticator.get_validated_token(raw_token)
        user = await sync_to_async(jwt_authenticator.get_user)(validated_token)
    except (InvalidToken, TokenError) as e:
        return JsonResponse({'error': str(e)}, status=401)

    if not user or not user.is_active:
        return JsonResponse({'error': 'Usuario no autenticado o inactivo'}, status=401)

    # Envuelves también la obtención de los grupos en sync_to_async:
    grupos_usuario_empresa = await sync_to_async(
        lambda: list(
            UsuarioEmpresa.objects.filter(usuario=user)
            .values_list('grupos__name', flat=True)
            .distinct()
        )
    )()

    response_data = {
        'grupos': grupos_usuario_empresa,
    }
    return JsonResponse(response_data)

class InvitacionEmpresaFilter(filters.FilterSet):
    estado = filters.CharFilter(method='filter_by_estado')

    class Meta:
        model = InvitacionEmpresa
        fields = ['estado']

    def filter_by_estado(self, queryset, name, value):
        if value == 'aceptada':
            return queryset.filter(is_accepted=True)
        elif value == 'pendiente':
            return queryset.filter(is_accepted=False, is_denied=False, expiration_date__gte=timezone.now(), expiration_date__isnull=False).exclude(pk__in=[inv.pk for inv in queryset if inv.is_expired()])
        elif value == 'expirada':
            return queryset.filter(expiration_date__lt=timezone.now()) | queryset.filter(pk__in=[inv.pk for inv in queryset if inv.is_expired()])
        return queryset

class InvitacionEmpresaViewSet(viewsets.ModelViewSet):
    queryset = InvitacionEmpresa.objects.all()
    serializer_class = InvitacionEmpresaSerializer
    filter_backends = (filters.DjangoFilterBackend,)
    filterset_class = InvitacionEmpresaFilter

    def create(self, request, *args, **kwargs):
        email = request.data.get('email')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        sucursal_id = request.data.get('sucursal')

        if not all([email, first_name, last_name, sucursal_id]):
            return Response({'detail': 'Email, nombre, apellido y sucursal son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar si el usuario ya existe
        user_exists = User.objects.filter(email=email).exists()
        if user_exists:
            return Response({'detail': 'El usuario con este email ya existe.'}, status=status.HTTP_400_BAD_REQUEST)

        # Crear la invitación
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        invitacion = serializer.instance

        # Crear el usuario sin contraseña y desactivado
        user = User.objects.create_user(
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_active=False  # El usuario estará inactivo hasta que active su cuenta
        )

        if SucursalEmpresa.objects.filter(pk=sucursal_id).exists():
            sucursal = SucursalEmpresa.objects.get(pk=sucursal_id)
            UsuarioEmpresa.objects.get_or_create(
                usuario=user,
                sucursal=sucursal,
            )
        else:
            sucursal = "Sucursal sin Nombre"

        email_subject = "Aceptar Invitacion a Empresa"
        activation_link = f"{os.getenv('FRONTEND_URL')}/aceptar-invitacion/{invitacion.activation_token}/"
        html_body = f'''
            <p>Fuiste invitado a unirte a {sucursal}.</p>
            <p>Por favor acepte esta invitación.</p>
        '''
        titulo="Invitación Empresa"
        text_boton="Aceptar Invitación"

        send_email_task(email_subject, [email], html_body, titulo, activation_link, text_boton, [])

        # Enviar correo electrónico con el enlace de activación
        # send_mail(
        #     'Activación de cuenta',
        #     f'Hola {first_name},\n\nPor favor, activa tu cuenta haciendo clic en el siguiente enlace:\n{activation_link}',
        #     'no-reply@tu-dominio.com',
        #     [email],
        #     fail_silently=False,
        # )

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def get_queryset(self):
        # Obtener la personalización del usuario autenticado
        personalizacion_usuario = PersonalizacionUsuario.objects.filter(usuario=self.request.user).first()

        if personalizacion_usuario and personalizacion_usuario.sucursal_principal:
            # Filtrar las invitaciones por la sucursal principal del usuario
            return InvitacionEmpresa.objects.filter(sucursal=personalizacion_usuario.sucursal_principal)

        # Si no tiene una sucursal principal, devolver un queryset vacío
        return InvitacionEmpresa.objects.none()

    def perform_destroy(self, instance):
        # Eliminar la invitación
        super().perform_destroy(instance)

        # Eliminar el usuario asociado si existe y coincide con el email de la invitación
        user = User.objects.filter(email=instance.email).first()
        if user:
            user.delete()

    @action(detail=True, methods=['post'], url_path='reenviar-invitacion')
    def reenviar_invitacion(self, request, pk=None):
        """Reenviar una invitación por correo electrónico."""
        invitacion = self.get_object()

        if invitacion.is_expired():
            # Actualizar la fecha de expiración si ya expiró
            invitacion.expiration_date = timezone.now() + timedelta(days=7)
            invitacion.save()

        # Preparar y enviar el correo electrónico
        email_subject = "Reenviar Invitación a Empresa"
        activation_link = f"{os.getenv('FRONTEND_URL')}/aceptar-invitacion/{invitacion.activation_token}/"
        html_body = f'''
            <p>Has recibido nuevamente la invitación para unirte a {invitacion.sucursal}.</p>
            <p>Por favor, acepte esta invitación antes del {invitacion.expiration_date.strftime('%d/%m/%Y')}.</p>
        '''
        titulo = "Invitación Empresa"
        text_boton = "Aceptar Invitación"

        send_email_task(
            email_subject,
            [invitacion.email],
            html_body,
            titulo,
            activation_link,
            text_boton,
            []
        )

        return Response(
            {"detail": "La invitación ha sido reenviada exitosamente."},
            status=status.HTTP_200_OK
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def activate_account(request, token):
    try:
        invitacion = InvitacionEmpresa.objects.get(activation_token=token)
        if invitacion.is_expired():
            return Response({'detail': 'La invitación ha expirado.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(email=invitacion.email)
        password = request.data.get('password')

        if not password:
            return Response({'detail': 'La contraseña es requerida.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.is_active = True
        user.save()

        # Actualizar el estado de la invitación
        invitacion.is_accepted = True
        invitacion.accepted_at = timezone.now()
        invitacion.save()
        
        personalizacion, created = PersonalizacionUsuario.objects.get_or_create(usuario=user)
        personalizacion.sucursal_principal = invitacion.sucursal
        personalizacion.save()

        return Response({'detail': 'Cuenta activada con éxito.'}, status=status.HTTP_200_OK)
    except InvitacionEmpresa.DoesNotExist:
        return Response({'detail': 'Token inválido.'}, status=status.HTTP_400_BAD_REQUEST)
    except User.DoesNotExist:
        return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)