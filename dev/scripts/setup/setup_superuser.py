#!/usr/bin/env python
"""
Script para configurar un superusuario con permisos de empresa.

Qué hace:
- Crea grupos de permisos estándar (staff, superadmin, multi-empresas, etc.)
- Crea empresa inicial "Snabbit" con sucursal "Casa Matriz"
- Asocia el superusuario a la empresa con grupos administrativos
- Configura personalización del usuario para el dashboard

Cuándo usar:
- Primera vez que inicializas el proyecto
- Después de resetear la base de datos
- Al configurar un nuevo entorno de desarrollo

Prerequisitos:
- Haber ejecutado: python manage.py migrate
  (el script pedirá crear un superusuario si no existe)

Uso:
    cd backend
    ..\dev\scripts\setup\setup_superuser.py
"""
import os
import sys

import django

# Calcular ruta al directorio backend y moverse allí para evitar problemas de carga de apps
this_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.abspath(os.path.join(this_dir, "..", "..", ".."))
backend_path = os.path.join(repo_root, "backend")

if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

try:
    os.chdir(backend_path)
except Exception:
    pass

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")
try:
    django.setup()
except Exception as e:
    print("Error iniciando Django:", e)
    sys.exit(1)

# Ejecutar migraciones para asegurar que todas las tablas existen antes
# de crear objetos que disparen signals dependientes de tablas (ej: DescripcionGrupo)
from django.core.management import call_command

try:
    print("=> Generando migraciones pendientes (si las hay) y aplicándolas...")
    # Intentar crear migraciones automáticas sólo para las apps principales de desarrollo
    apps_para_migrar = ["core", "cuentas", "empresas"]
    try:
        print(f"=> Ejecutando makemigrations para: {', '.join(apps_para_migrar)}")
        call_command("makemigrations", *apps_para_migrar, "--noinput")
    except Exception as e:
        print("⚠️  makemigrations falló o no generó cambios:", e)

    # Aplicar migraciones
    call_command("migrate", "--noinput")
except Exception as e:
    print("❌ Error al ejecutar migraciones automáticamente:", e)
    print("Por favor ejecuta manualmente: backend\\ENV\\Scripts\\python.exe manage.py migrate")
    sys.exit(1)

from core.models import PersonalizacionUsuario
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa

User = get_user_model()


def crear_grupos():
    """Crea los grupos necesarios para el sistema."""
    grupos = [
        ("staff", "Personal administrativo general"),
        ("superadmin", "Administrador con permisos máximos"),
        ("multi-empresas", "Acceso a múltiples empresas"),
        ("tecnico", "Técnico de campo para OT y visitas"),
        ("representante_legal", "Representante legal de empresa"),
    ]

    grupos_creados = []
    for nombre_grupo, descripcion in grupos:
        grupo, created = Group.objects.get_or_create(name=nombre_grupo)
        grupos_creados.append(grupo)
        if created:
            print(f"✓ Grupo '{nombre_grupo}' creado")
        else:
            print(f"  Grupo '{nombre_grupo}' ya existe")

    return grupos_creados


def crear_empresa_inicial():
    """Crea la empresa base y asegura la sucursal "Casa Matriz"."""
    empresa, created = Empresa.objects.get_or_create(
        rut_empresa="11111111-1",
        defaults={
            "nombre": "Snabbit",
            "direccion_principal": "Dirección Principal 123",
            "telefono": "+56912345678",
            "email": "contacto@snabbit.cl",
        },
    )

    if created:
        print(f"✓ Empresa '{empresa.nombre}' creada (RUT: {empresa.rut_empresa})")
    else:
        print(f"  Empresa '{empresa.nombre}' ya existe (RUT: {empresa.rut_empresa})")

    sucursal = empresa.sucursales.filter(nombre="Casa Matriz").first()
    if sucursal:
        print(f"  Sucursal '{sucursal.nombre}' ya existe")
    else:
        sucursal = SucursalEmpresa.objects.create(
            empresa=empresa,
            nombre="Casa Matriz",
            direccion=empresa.direccion_principal,
        )
        print(f"✓ Sucursal '{sucursal.nombre}' creada (fallback)")

    return empresa, sucursal


def configurar_usuario_empresa(user, sucursal, grupos):
    """Crea o actualiza el perfil UsuarioEmpresa del superusuario."""
    usuario_empresa, created = UsuarioEmpresa.objects.get_or_create(
        usuario=user,
        defaults={
            "sucursal": sucursal,
            "estado": "1",
        },
    )

    if created:
        print(f"✓ UsuarioEmpresa creado para '{user.email}'")
    else:
        actualizado = False
        if usuario_empresa.sucursal_id != sucursal.id:
            usuario_empresa.sucursal = sucursal
            actualizado = True
        if usuario_empresa.estado != "1":
            usuario_empresa.estado = "1"
            actualizado = True

        if actualizado:
            usuario_empresa.save()
            print(f"✓ UsuarioEmpresa actualizado para '{user.email}'")
        else:
            print(f"  UsuarioEmpresa ya existe para '{user.email}'")

    grupos_admin = [
        g for g in grupos if g.name in ["staff", "superadmin", "multi-empresas"]
    ]
    usuario_empresa.grupos.set(grupos_admin)
    print(f"✓ Grupos asignados: {', '.join([g.name for g in grupos_admin])}")

    return usuario_empresa


def configurar_personalizacion(user, sucursal):
    """Configura la personalización del usuario para el dashboard."""
    personalizacion, created = PersonalizacionUsuario.objects.get_or_create(
        usuario=user,
        defaults={
            "tema": "3",  # Sistema
            "font_size": 14,
            "sucursal_principal": sucursal,
        },
    )

    if created:
        print(f"✓ Personalización creada para '{user.email}'")
    else:
        actualizado = False
        if personalizacion.sucursal_principal_id != sucursal.id:
            personalizacion.sucursal_principal = sucursal
            actualizado = True

        if actualizado:
            personalizacion.save()
            print(f"✓ Personalización actualizada para '{user.email}'")
        else:
            print(f"  Personalización ya existe para '{user.email}'")

    return personalizacion


def crear_superusuario_interactivo():
    """Crea un superusuario de forma interactiva si no existe."""
    print("=" * 60)
    print("CREACIÓN DE SUPERUSUARIO")
    print("=" * 60)
    print()
    print("Por favor, ingresa los datos del superusuario:")
    print()

    import getpass

    from django.core.exceptions import ValidationError
    from django.core.validators import validate_email

    while True:
        email = input("Email: ").strip()
        if not email:
            print("❌ El email es obligatorio.")
            continue

        try:
            validate_email(email)
            if User.objects.filter(email=email).exists():
                print(f"❌ Ya existe un usuario con el email '{email}'.")
                continue
            break
        except ValidationError:
            print("❌ Email inválido. Intenta nuevamente.")

    while True:
        rut = input("RUT (formato: 12345678-9): ").strip()
        if not rut:
            print("❌ El RUT es obligatorio.")
            continue

        if User.objects.filter(rut=rut).exists():
            print(f"❌ Ya existe un usuario con el RUT '{rut}'.")
            continue
        break

    first_name = input("Nombre: ").strip()
    if not first_name:
        first_name = "Admin"

    last_name = input("Apellido: ").strip()
    if not last_name:
        last_name = "Sistema"

    while True:
        password = getpass.getpass("Contraseña (mínimo 8 caracteres): ")
        if len(password) < 8:
            print("❌ La contraseña debe tener al menos 8 caracteres.")
            continue

        password_confirm = getpass.getpass("Confirma contraseña: ")
        if password != password_confirm:
            print("❌ Las contraseñas no coinciden.")
            continue
        break

    try:
        user = User.objects.create_superuser(
            email=email,
            rut=rut,
            first_name=first_name,
            last_name=last_name,
            password=password,
        )
        print()
        print(f"✅ Superusuario '{user.email}' creado exitosamente")
        print()
        return user
    except Exception as e:
        print(f"❌ Error al crear superusuario: {e}")
        return None


def main():
    print("=" * 60)
    print("Configuración de Superusuario con Empresa")
    print("=" * 60)
    print()

    # 1. Buscar o crear superusuario
    try:
        superuser = User.objects.filter(is_superuser=True).first()
        if not superuser:
            print("⚠️  No se encontró ningún superusuario en el sistema.")
            print()
            respuesta = input("¿Deseas crear uno ahora? (s/n): ").strip().lower()
            print()

            if respuesta in ["s", "si", "yes", "y"]:
                superuser = crear_superusuario_interactivo()
                if not superuser:
                    print("❌ No se pudo crear el superusuario. Abortando.")
                    return
            else:
                print("❌ Configuración cancelada.")
                print()
                print("   Para crear un superusuario manualmente:")
                print("   cd backend")
                print("   backend\\ENV\\Scripts\\python.exe manage.py createsuperuser")
                print()
                return
        else:
            print(f"✓ Superusuario encontrado: {superuser.email}")
            print()
    except Exception as e:
        print(f"❌ Error al buscar superusuario: {e}")
        return

    # 2. Crear grupos
    print("--- Creando grupos de permisos ---")
    # Para evitar errores si la tabla core_descripciongrupo no existe (signals que crean DescripcionGrupo),
    # desconectamos temporalmente el receiver create_descripcion_grupo si está registrado.
    from django.db.models.signals import post_save
    SIGNALS_RECONNECTED = False
    try:
        import core.signals as _core_signals
        if hasattr(_core_signals, "create_descripcion_grupo"):
            try:
                post_save.disconnect(_core_signals.create_descripcion_grupo, sender=Group)
                SIGNALS_RECONNECTED = True
            except Exception:
                SIGNALS_RECONNECTED = False
    except Exception:
        SIGNALS_RECONNECTED = False

    grupos = crear_grupos()

    # Reconectar el signal si lo desconectamos antes
    try:
        if SIGNALS_RECONNECTED:
            post_save.connect(_core_signals.create_descripcion_grupo, sender=Group)
    except Exception:
        pass
    print()

    # 3. Crear empresa y sucursal
    print("--- Creando empresa inicial ---")
    empresa, sucursal = crear_empresa_inicial()
    print()

    # 4. Configurar UsuarioEmpresa
    print("--- Configurando UsuarioEmpresa ---")
    usuario_empresa = configurar_usuario_empresa(superuser, sucursal, grupos)
    print()

    # 5. Configurar Personalización
    print("--- Configurando Personalización ---")
    personalizacion = configurar_personalizacion(superuser, sucursal)
    print()

    print("=" * 60)
    print("✓ Configuración completada exitosamente")
    print("=" * 60)
    print()
    print("Próximos pasos:")
    print("1. Inicia el backend: python manage.py runserver")
    print("2. Inicia el frontend: cd ../frontend && npm run dev")
    print("3. Accede a http://localhost:5173")
    print("4. Login con tu superusuario")
    print("5. ¡Ahora tienes acceso completo al sistema!")
    print()


if __name__ == "__main__":
    main()
