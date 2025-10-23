from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractBaseUser, PermissionsMixin
from core.models import ModeloBase, PersonalizacionUsuario
from cuentas.estados_modelos import *
import uuid
from django.utils import timezone
from datetime import timedelta
from django.core.exceptions import ValidationError


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **kwargs):

        if not email:
            raise ValueError("La Dirección de Correo Electronico es Requerido")

        email = self.normalize_email(email)
        user = self.model(email=email, **kwargs)
        user.set_password(password)
        user.save()

        return user

    def create_superuser(self, email, password=None, **kwargs):
        kwargs.setdefault('is_active', True)
        kwargs.setdefault('is_staff', True)
        kwargs.setdefault('is_superuser', True)

        if kwargs.get('is_active') is not True:
            raise ValueError("El super usuario debe estar activo")

        if kwargs.get('is_staff') is not True:
            raise ValueError("El super usuario debe ser staff")

        if kwargs.get('is_superuser') is not True:
            raise ValueError("No es super usuario")

        return self.create_user(email, password, **kwargs)

def foto_perfil_usuario(instance, filename):
    return 'usuario/{0}/{1}'.format(instance.email, filename)

class User(AbstractBaseUser, PermissionsMixin, ModeloBase):
    email               = models.EmailField(max_length=250, unique=True)
    first_name          = models.CharField(max_length=250)
    second_name         = models.CharField(max_length=250, blank=True, null=True)
    last_name           = models.CharField(max_length=250)
    second_last_name    = models.CharField(max_length=250, blank=True, null=True)
    usuario_nuevo       = models.BooleanField(default=False)
    is_active           = models.BooleanField(default=False)
    is_staff            = models.BooleanField(default=False)
    image               = models.ImageField(upload_to=foto_perfil_usuario, blank=True, null=True)
    rut                 = models.CharField(max_length=50, unique=True, blank=True, null=True)
    celular             = models.CharField(max_length=17, blank=True, null=True)
    genero              = models.CharField(max_length=2, choices=GENEROS, default='0')
    fecha_nacimiento    = models.DateField(null=True, blank=True)
    estado_civil        = models.CharField(max_length=50, choices=ESTADOS_CIVILES_CHILE, blank=True, null=True)
    nacionalidad        = models.CharField(max_length=100, blank=True, null=True)
    direccion           = models.CharField(max_length=250, blank=True, null=True)
    region              = models.IntegerField(default=0)
    provincia           = models.IntegerField(default=0)
    comuna              = models.IntegerField(default=0)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def get_nombre_completo(self):
        nombre_completo = f'{self.first_name}'

        if self.second_name:
            nombre_completo += f' {self.second_name}'

        nombre_completo += f' {self.last_name}'

        if self.second_last_name:
            nombre_completo += f' {self.second_last_name}'

        return nombre_completo

    def get_nombre(self):
        return f'{self.first_name} {self.last_name}'

    def __str__(self):
        return self.email

# class InvitacionEmpresa(ModeloBase):
#     email = models.EmailField(max_length=250)
#     token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
#     sucursal = models.ForeignKey("empresas.SucursalEmpresa", on_delete=models.CASCADE)
#     is_accepted = models.BooleanField(default=False)
#     invited_at = models.DateTimeField(default=timezone.now)
#     accepted_at = models.DateTimeField(blank=True, null=True)
#     expiration_date = models.DateTimeField(null=True, blank=True)  # Campo de expiración
#     is_denied = models.BooleanField(default=False)

#     def save(self, *args, **kwargs):
#         if not self.expiration_date:
#             self.expiration_date = self.invited_at + timedelta(days=7)  # Expira en 7 días por defecto
#         super().save(*args, **kwargs)

#     def __str__(self):
#         return f"Invitacion para {self.email} en {self.sucursal}"

#     def accept(self):
#         if self.is_expired():
#             raise ValidationError("La invitación ha expirado")
#         self.is_accepted = True
#         self.accepted_at = timezone.now()
#         self.save()
        
#         # Asociar la vivienda a la personalización del sitio web del usuario
#         user = User.objects.filter(email=self.email).first()
#         if user:
#             personalizacion, created = PersonalizacionUsuario.objects.get_or_create(usuario=user)
#             personalizacion.sucursal_principal = self.sucursal
#             personalizacion.save()

#     def is_expired(self):
#         return self.expiration_date and timezone.now() > self.expiration_date

# models.py

class InvitacionEmpresa(ModeloBase):
    email = models.EmailField(max_length=250)
    first_name = models.CharField(max_length=250)
    last_name = models.CharField(max_length=250)
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    activation_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    sucursal = models.ForeignKey("empresas.SucursalEmpresa", on_delete=models.CASCADE)
    is_accepted = models.BooleanField(default=False)
    invited_at = models.DateTimeField(default=timezone.now)
    accepted_at = models.DateTimeField(blank=True, null=True)
    expiration_date = models.DateTimeField(null=True, blank=True)
    is_denied = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.expiration_date:
            self.expiration_date = self.invited_at + timedelta(days=7)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Invitación para {self.email} en {self.sucursal}"

    def is_expired(self):
        return self.expiration_date and timezone.now() > self.expiration_date
