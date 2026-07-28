"""
Crea (o reutiliza) un usuario de servicio "agente" y su token DRF, listo para
que el MCP del cotizador cree cotizaciones vía API.

El usuario de servicio:
  - Define la EMPRESA emisora (multi-tenancy) vía su sucursal.
  - Es la traza de auditoría (los seguimientos dirán quién creó la cotización).
  - Autentica con un token DRF de larga duración (Authorization: Token <key>).

Uso:
    python manage.py crear_agente_cotizador --email agente@miempresa.cl --sucursal 1
    python manage.py crear_agente_cotizador --email agente@miempresa.cl --sucursal 1 --rotar-token

El token se imprime UNA vez. Guárdalo en el .env del MCP. Para revocar el acceso,
usa --rotar-token (invalida el anterior) o borra el usuario/token.
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.models import PersonalizacionUsuario
from cuentas.models import User
from empresas.models import SucursalEmpresa, UsuarioEmpresa
from rest_framework.authtoken.models import Token


class Command(BaseCommand):
    help = "Crea un usuario de servicio 'agente' + token DRF para el MCP del cotizador."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Email del usuario de servicio.")
        parser.add_argument(
            "--sucursal",
            required=True,
            type=int,
            help="ID de la SucursalEmpresa. Determina la empresa emisora.",
        )
        parser.add_argument("--first-name", default="Agente", help="Nombre.")
        parser.add_argument("--last-name", default="Cotizador", help="Apellido.")
        parser.add_argument(
            "--rotar-token",
            action="store_true",
            help="Regenera el token (invalida el anterior).",
        )

    @transaction.atomic
    def handle(self, *args, **opts):
        email = opts["email"].strip().lower()

        try:
            sucursal = SucursalEmpresa.objects.select_related("empresa").get(pk=opts["sucursal"])
        except SucursalEmpresa.DoesNotExist:
            raise CommandError(f"No existe SucursalEmpresa con id={opts['sucursal']}.")

        user, creado_user = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": opts["first_name"],
                "last_name": opts["last_name"],
                "is_active": True,
            },
        )
        if creado_user:
            user.set_unusable_password()  # el acceso es solo por token
            user.save(update_fields=["password"])

        ue, creado_ue = UsuarioEmpresa.objects.get_or_create(
            usuario=user, defaults={"sucursal": sucursal, "cargo": "Agente IA"}
        )
        if not creado_ue and ue.sucursal_id != sucursal.id:
            ue.sucursal = sucursal
            ue.save(update_fields=["sucursal"])

        perso, _ = PersonalizacionUsuario.objects.get_or_create(usuario=user)
        if perso.sucursal_principal_id != sucursal.id:
            perso.sucursal_principal = sucursal
            perso.save(update_fields=["sucursal_principal"])

        if opts["rotar_token"]:
            Token.objects.filter(user=user).delete()
        token, _ = Token.objects.get_or_create(user=user)

        self.stdout.write(self.style.SUCCESS("=== Usuario de servicio listo ==="))
        self.stdout.write(f"  Usuario:  {email} ({'creado' if creado_user else 'existente'})")
        self.stdout.write(f"  Sucursal: {sucursal.nombre} (id={sucursal.id})")
        self.stdout.write(f"  Empresa:  {sucursal.empresa.nombre} (id={sucursal.empresa_id})")
        self.stdout.write("")
        self.stdout.write(self.style.WARNING("  API KEY (Authorization: Token <key>):"))
        self.stdout.write(self.style.WARNING(f"    {token.key}"))
        self.stdout.write("")
        self.stdout.write("  Ponlo en dev/mcp_cotizador/.env como ERP_TOKEN=<key>")
