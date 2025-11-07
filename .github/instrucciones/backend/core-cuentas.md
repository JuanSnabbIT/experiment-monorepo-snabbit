---
title: "Backend: Apps Core y Cuentas (Autenticación)"
scope: "backend"
status: "active"
last_updated: "2025-11-05"
---

# 🔐 Apps Backend: Core y Cuentas (Autenticación)

## Objetivo
Documentar las apps `core/` y `cuentas/` del backend Django, que gestionan la funcionalidad base del sistema (modelos abstractos, personalización de usuario) y la autenticación (usuarios, invitaciones, JWT).

---

## 📦 App: core/

### Propósito
Proporciona **modelos base abstractos**, **personalización de usuario**, y **configuración global** del sistema. Es la base sobre la que se construyen todas las demás apps.

---

### 🗄️ Modelos

#### `ModeloBase` (Abstracto)
**Propósito**: Modelo abstracto base para todas las entidades del sistema que NO requieren historial.

**Campos**:
- `fecha_creacion`: DateTimeField (auto_now_add=True) - Timestamp de creación
- `fecha_modificacion`: DateTimeField (auto_now=True) - Timestamp de última modificación

**Uso**: Heredado por todos los modelos que no necesitan tracking de cambios (ej.: Empresa, Producto, Usuario).

**Ejemplo**:
```python
class Producto(ModeloBase):
    nombre = models.CharField(max_length=200)
    # fecha_creacion y fecha_modificacion se heredan automáticamente
```

---

#### `ModeloBaseHistorico` (Abstracto)
**Propósito**: Modelo abstracto para entidades que requieren **historial de cambios** (auditoría completa).

**Campos**:
- `fecha_creacion`: DateTimeField (auto_now_add=True)
- `fecha_modificacion`: DateTimeField (auto_now=True)
- `historia`: Historia (simple-history) - Tracking completo de cambios

**Uso**: Heredado por modelos críticos que necesitan auditoría (ej.: Contrato, AcuerdoConfidencialidad, StockItem).

**Ejemplo**:
```python
class Contrato(ModeloBaseHistorico):
    numero = models.CharField(max_length=50)
    # Cambios en numero, fecha_inicio, etc. se registran en historia
```

**Beneficio**: Permite ver versiones anteriores, quién hizo cambios y cuándo (`Contrato.history.all()`).

---

#### `PersonalizacionUsuario` (Core del Sistema)
**Propósito**: **Contexto operativo del usuario** - Define la sucursal principal, tema visual y preferencias del dashboard.

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `usuario` | OneToOneField(User) | Usuario asociado (relación 1:1) |
| `tema` | CharField (choices) | Tema visual (1=claro, 2=oscuro, 3=sistema) |
| `font_size` | PositiveIntegerField | Tamaño de fuente (default: 13px) |
| `sucursal_principal` | FK(SucursalEmpresa) ⭐ | **CRÍTICO**: Contexto operativo del usuario |
| `dashboard_preferences` | JSONField | Preferencias de widgets del dashboard |

**Importancia Crítica de `sucursal_principal`**:

```python
# ❌ Sin sucursal_principal:
# - Dashboard muestra "sin empresa"
# - Invitaciones retornan []
# - Filtros backend fallan (get_queryset() vacío)

# ✅ Con sucursal_principal configurado:
# - Usuario tiene contexto de empresa y sucursal
# - Filtros backend funcionan correctamente
# - Módulos de gestión accesibles
```

**Relación con UsuarioEmpresa**:
- `UsuarioEmpresa.sucursal`: Sucursal a la que pertenece el empleado (vinculación contractual)
- `PersonalizacionUsuario.sucursal_principal`: Sucursal desde la que opera actualmente (contexto operativo)
- **Ambos deben coincidir** para usuarios no-admin (staff puede tener varias sucursales)

**Flujo de Creación**:
```python
# Opción A: Invitación aceptada (flujo normal)
InvitacionEmpresa.accept() → crea User + UsuarioEmpresa + PersonalizacionUsuario

# Opción B: Superusuario (setup_superuser.py)
PersonalizacionUsuario.objects.get_or_create(
    usuario=superuser,
    defaults={'sucursal_principal': casa_matriz}
)
```

**Default Dashboard Preferences**:
```python
{
    "indicadores_economicos": True,
    "empresa_seleccionada": True,
    "actualizaciones_oc": True,
    "ultimos_eventos": True
}
```

---

#### `Software`
**Propósito**: Catálogo de software utilizado por la empresa (licencias, versiones).

**Campos**:
- `nombre`: CharField - Nombre del software (ej.: "AutoCAD", "SAP")

**Uso**: Asignar software a recursos/equipos, tracking de licencias.

---

#### `AcuerdoConfidencialidadBase`
**Propósito**: **Template base** de acuerdos de confidencialidad (NDA) para contratos.

**Campos**:
- `titulo`: CharField - Título del acuerdo
- `contenido`: TextField - Texto completo del acuerdo (HTML/Markdown)

**Hereda**: `ModeloBaseHistorico` (tracking de cambios en acuerdos legales)

**Uso**: Al crear contrato, se selecciona un `AcuerdoConfidencialidadBase` y se genera instancia específica para el cliente.

---

#### `DescripcionGrupo`
**Propósito**: Asociar descripciones a grupos de permisos de Django (`auth.Group`).

**Campos**:
- `group`: OneToOneField(Group) - Grupo de Django (staff, superadmin, bodeguero, etc.)
- `descripcion`: TextField - Descripción legible del grupo

**Uso**: Documentar propósito y permisos de cada grupo para UI de gestión de usuarios.

**Ejemplo**:
```python
DescripcionGrupo.objects.create(
    group=Group.objects.get(name='bodeguero'),
    descripcion='Encargado de inventario: movimientos de stock, entradas/salidas, conteos físicos'
)
```

---

#### `PreguntaEnRetroalimentacion`
**Propósito**: Sistema de **retroalimentación genérico** para múltiples entidades (Cotizaciones, Visitas, Compras, etc.).

**Campos**:
- `texto`: TextField - Pregunta de retroalimentación (ej.: "¿Cómo califica el servicio?")
- `content_type`: FK(ContentType) - Tipo de entidad asociada (GenericForeignKey)
- `activo`: BooleanField - Si la pregunta está activa

**Content Types Permitidos**:
```python
Q(app_label='cotizaciones', model='cotizacion') |
Q(app_label='visitas', model='visitasoporte') |
Q(app_label='bodegas', model='compra') |
Q(app_label='visitas', model='asistenciausuario') |
Q(app_label='visitas', model='entregadeequipo')
```

**Manager Personalizado**: `PreguntaEnRetroalimentacionManager` (filtros por content_type, activas).

**Uso**: Cliente completa retroalimentación tras visita/servicio. Frontend muestra preguntas según entidad.

---

### 📊 Serializers

| Serializer | Modelo | Campos Especiales | Propósito |
|------------|--------|-------------------|-----------|
| `PersonalizacionUsuarioSerializer` | PersonalizacionUsuario | `empresa` (SerializerMethodField) | Obtiene ID de empresa desde sucursal_principal |
| `ContentTypeSerializer` | ContentType | `id`, `app_label`, `model` | Listar tipos de contenido para GenericForeignKey |
| `SoftwareSerializer` | Software | `__all__` | CRUD de software |
| `AcuerdoConfidencialidadBaseSerializer` | AcuerdoConfidencialidadBase | `__all__` | CRUD de templates de acuerdos |

---

### 🌐 ViewSets

#### `PersonalizacionUsuarioViewSet`
**Endpoint**: `/api/personalizacion-usuario/`

**Permisos**: `IsAuthenticated` (por defecto)

**get_queryset()**:
```python
def get_queryset(self):
    return PersonalizacionUsuario.objects.filter(usuario=self.request.user)
```
- **Solo retorna personalización del usuario actual** (seguridad)

**create()**: **BLOQUEADO** (405 Method Not Allowed)
- Personalización se crea automáticamente al aceptar invitación o en setup_superuser.py

**Métodos HTTP Permitidos**:
- `GET` /api/personalizacion-usuario/ - Obtener personalización propia
- `PUT`/`PATCH` /api/personalizacion-usuario/{id}/ - Actualizar tema, font_size, dashboard_preferences
- `DELETE` - No recomendado (rompe integridad)

---

#### `ContentTypeViewSet`
**Endpoint**: `/api/content-types/`

**Tipo**: `ReadOnlyModelViewSet` (solo GET)

**Uso**: Frontend obtiene IDs de content_types para GenericForeignKey en retroalimentación.

---

#### `SoftwareViewSet`
**Endpoint**: `/api/software/`

**CRUD completo**: Listar, crear, editar, eliminar software.

---

#### `AcuerdoConfidencialidadBaseViewSet`
**Endpoint**: `/api/acuerdos-confidencialidad-base/`

**CRUD completo**: Gestionar templates de acuerdos de confidencialidad.

---

### 🔧 Tasks (Celery)

**Archivo**: `core/tasks.py`

#### `send_email_task`
**Propósito**: Envío asíncrono de correos electrónicos (invitaciones, notificaciones, reportes).

**Parámetros**:
- `subject`: Asunto del correo
- `message`: Cuerpo del mensaje (HTML/texto)
- `recipient_list`: Lista de destinatarios

**Uso**:
```python
from core.tasks import send_email_task

send_email_task.delay(
    subject="Invitación a Empresa",
    message="Has sido invitado a unirte a...",
    recipient_list=['usuario@example.com']
)
```

**Configuración**: Usa backend de email de Django (SMTP/SendGrid/etc. según `settings.py`).

---

## 📦 App: cuentas/

### Propósito
Gestiona **autenticación de usuarios**, **invitaciones a empresas**, y **permisos basados en grupos**. Integra con **Djoser + SimpleJWT** para API REST con tokens.

---

### 🗄️ Modelos

#### `User` (Modelo de Usuario Personalizado)
**Propósito**: Reemplaza el modelo de usuario por defecto de Django con autenticación por **email** (no username).

**Hereda**: `AbstractBaseUser`, `PermissionsMixin`, `ModeloBase`

**Campos de Autenticación**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `email` | EmailField (unique) | **Campo de login** (USERNAME_FIELD) |
| `password` | CharField (hash) | Contraseña hasheada (bcrypt/argon2) |
| `is_active` | BooleanField | Si el usuario puede loguear (default: False) |
| `is_staff` | BooleanField | Acceso al admin de Django |
| `is_superuser` | BooleanField | Permisos totales |

**Campos de Perfil**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `first_name`, `second_name` | CharField | Nombres |
| `last_name`, `second_last_name` | CharField | Apellidos |
| `rut` | CharField (unique) | RUT chileno (ej.: 12345678-9) |
| `celular` | CharField | Teléfono celular |
| `genero` | CharField (choices) | Género (0=no especifica, 1=masculino, 2=femenino, 3=otro) |
| `fecha_nacimiento` | DateField | Fecha de nacimiento |
| `estado_civil` | CharField (choices) | Estado civil (Chile) |
| `nacionalidad` | CharField | País de origen |
| `direccion` | CharField | Dirección completa |
| `region`, `provincia`, `comuna` | IntegerField | Ubicación geográfica (Chile) |
| `image` | ImageField | Foto de perfil |
| `usuario_nuevo` | BooleanField | Si es primera vez que ingresa (cambiar contraseña) |

**Métodos Útiles**:
```python
user.get_nombre_completo()  # "Juan Carlos Pérez González"
user.get_nombre()           # "Juan Pérez"
```

**Manager Personalizado**: `UserManager`
- `create_user(email, password, **kwargs)`: Crear usuario normal
- `create_superuser(email, password, **kwargs)`: Crear superusuario (is_staff=True, is_superuser=True, is_active=True)

**USERNAME_FIELD**: `email` (login con email, no username)

**REQUIRED_FIELDS**: `first_name`, `last_name` (obligatorios al crear superusuario)

---

#### `InvitacionEmpresa`
**Propósito**: Invitar usuarios a unirse a una empresa/sucursal con **token único** y **expiración automática**.

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `email` | EmailField | Email del invitado |
| `first_name`, `last_name` | CharField | Nombre del invitado (pre-crear User) |
| `token` | UUIDField (unique) | Token de invitación (URL) |
| `activation_token` | UUIDField (unique) | Token de activación de cuenta |
| `sucursal` | FK(SucursalEmpresa) | Sucursal a la que se invita |
| `is_accepted` | BooleanField | Si ya aceptó la invitación |
| `is_denied` | BooleanField | Si rechazó la invitación |
| `invited_at` | DateTimeField | Timestamp de invitación |
| `accepted_at` | DateTimeField | Timestamp de aceptación |
| `expiration_date` | DateTimeField | Fecha de expiración (7 días por defecto) |

**Método `save()`**:
```python
def save(self, *args, **kwargs):
    if not self.expiration_date:
        self.expiration_date = self.invited_at + timedelta(days=7)  # ← Expira en 7 días
    super().save(*args, **kwargs)
```

**Método `is_expired()`**:
```python
def is_expired(self):
    return self.expiration_date and timezone.now() > self.expiration_date
```

**Flujo de Invitación**:
```
1. Admin crea InvitacionEmpresa con email + sucursal
   ↓
2. Sistema genera token UUID único
   ↓
3. Celery envía email con link: /aceptar-invitacion/{token}
   ↓
4. Usuario hace clic, frontend llama API con token
   ↓
5. Backend valida:
   - Token existe
   - No expiró (< 7 días)
   - No fue aceptada previamente
   ↓
6. Backend crea:
   - User (email, first_name, last_name, is_active=False inicialmente)
   - UsuarioEmpresa (usuario + sucursal + grupos)
   - PersonalizacionUsuario (sucursal_principal = sucursal de invitación)
   ↓
7. Usuario activa cuenta con activation_token y define contraseña
   ↓
8. is_active = True, puede loguear
```

**Estados de Invitación**:
- **Pendiente**: `is_accepted=False`, `is_denied=False`, no expirada
- **Aceptada**: `is_accepted=True`
- **Rechazada**: `is_denied=True`
- **Expirada**: `expiration_date < now()`

---

### 📊 Serializers

#### `UserCreateSerializer`
**Propósito**: Crear nuevos usuarios (registro manual, no usado en invitaciones).

**Hereda**: `djoser.serializers.UserCreateSerializer`

**Campos**: `id`, `email`, `first_name`, `last_name`, `password`, `is_active`

**Validación**: Djoser valida formato de email, fortaleza de contraseña.

---

#### `UserSerializer`
**Propósito**: Serializar perfil completo de usuario (GET /auth/users/me/).

**Hereda**: `djoser.serializers.UserSerializer`

**Campos**: Todos los campos de perfil (`email`, nombres, apellidos, `rut`, `celular`, `genero`, `fecha_nacimiento`, `image`, ubicación, `is_staff`, `is_active`).

**Uso**: Obtener datos del usuario actual en frontend.

---

#### `InvitacionEmpresaSerializer`
**Propósito**: Serializar invitaciones con datos calculados.

**Campos Extra**:
```python
is_expired = serializers.SerializerMethodField()  # ← Calcula si expiró
id_user = serializers.SerializerMethodField()     # ← ID del User creado (si existe y está activo)
```

**Método `get_id_user()`**:
```python
def get_id_user(self, obj):
    usuario = User.objects.filter(email=obj.email)
    if usuario.exists() and usuario.first().is_active:
        return usuario.first().pk  # ← ID del User
    else:
        return False  # ← User no existe o inactivo
```

**Uso**: Frontend valida si invitación ya fue aceptada y enlaza con perfil de usuario.

---

### 🌐 ViewSets y Endpoints

#### `UserViewSet`
**Endpoint**: `/api/users/` (Djoser)

**Permisos**: Configurados en `settings.py` (Djoser + JWT)

**Métodos HTTP**:
- `GET /api/users/` - Listar usuarios (solo staff)
- `GET /api/users/me/` - Perfil del usuario actual ⭐
- `PUT/PATCH /api/users/me/` - Actualizar perfil
- `DELETE /api/users/me/` - Eliminar cuenta propia

**Parser Classes**: `JSONParser`, `MultiPartParser`, `FormParser` (soporta subida de imágenes)

---

#### `InvitacionEmpresaViewSet`
**Endpoint**: `/api/invitaciones-empresa/`

**get_queryset()**: Filtra por `sucursal_principal` del usuario (similar a backend de empresas):
```python
def get_queryset(self):
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=self.request.user).first()
    
    if personalizacion and personalizacion.sucursal_principal:
        return InvitacionEmpresa.objects.filter(sucursal=personalizacion.sucursal_principal)
    
    return InvitacionEmpresa.objects.none()  # ← Sin contexto → Sin invitaciones
```

**Filtros**: `InvitacionEmpresaFilter` (por estado: pendiente, aceptada, expirada)

**create()**: Crea invitación y envía email con Celery:
```python
def create(self, request, *args, **kwargs):
    # Validar que email no exista como usuario activo
    email = request.data.get('email')
    if User.objects.filter(email=email, is_active=True).exists():
        return Response({"detail": "El usuario con este email ya existe."}, status=400)
    
    # Crear invitación
    invitacion = InvitacionEmpresa.objects.create(
        email=email,
        first_name=request.data['first_name'],
        last_name=request.data['last_name'],
        sucursal=sucursal
    )
    
    # Enviar email asíncrono
    send_email_task.delay(
        subject="Invitación a Empresa",
        message=f"Link: /aceptar-invitacion/{invitacion.token}",
        recipient_list=[email]
    )
    
    return Response(InvitacionEmpresaSerializer(invitacion).data, status=201)
```

**accept_invitation()**: Custom action para aceptar invitación (ver views.py completo).

---

#### `get_grupos_user` (Async View)
**Endpoint**: `/api/grupos-user/` (función asíncrona)

**Propósito**: Obtener grupos del usuario actual desde `UsuarioEmpresa.grupos`.

**Autenticación**: JWT (valida token en header)

**Respuesta**:
```json
{
    "grupos": ["staff", "superadmin", "bodeguero"]
}
```

**Uso**: Frontend valida permisos para mostrar/ocultar módulos según grupos.

**Implementación Asíncrona**:
```python
async def get_grupos_user(request):
    jwt_authenticator = JWTAuthentication()
    # Validar token JWT
    user = await sync_to_async(jwt_authenticator.get_user)(validated_token)
    
    # Obtener grupos de UsuarioEmpresa (NO de auth.User.groups)
    grupos = await sync_to_async(
        lambda: list(UsuarioEmpresa.objects.filter(usuario=user).values_list("grupos__name", flat=True).distinct())
    )()
    
    return JsonResponse({"grupos": grupos})
```

**Nota**: Usa grupos de `UsuarioEmpresa.grupos` (M2M a `auth.Group`), NO `User.groups`.

---

## 🔗 Relaciones Entre Modelos

```
User (cuentas.User)
├── OneToOne → PersonalizacionUsuario (core)
│   └── FK → SucursalEmpresa (empresas) ⭐ sucursal_principal
├── OneToOne → UsuarioEmpresa (empresas)
│   ├── FK → SucursalEmpresa (empresas) ⭐ sucursal
│   └── M2M → Group (auth.Group) ⭐ grupos
└── FK ← InvitacionEmpresa.email (lookup por email)

InvitacionEmpresa
└── FK → SucursalEmpresa (empresas)
```

**Flujo de Creación de Usuario (Invitación)**:
```python
# 1. Crear invitación
invitacion = InvitacionEmpresa.objects.create(
    email='nuevo@example.com',
    first_name='Nuevo',
    last_name='Usuario',
    sucursal=casa_matriz
)

# 2. Usuario acepta invitación (API call)
# Backend crea:

# 2.1. User
user = User.objects.create_user(
    email=invitacion.email,
    first_name=invitacion.first_name,
    last_name=invitacion.last_name,
    is_active=False  # ← Activar tras definir contraseña
)

# 2.2. UsuarioEmpresa
usuario_empresa = UsuarioEmpresa.objects.create(
    usuario=user,
    sucursal=invitacion.sucursal,
    estado='1'  # Activo
)
usuario_empresa.grupos.add(Group.objects.get(name='representante_legal'))

# 2.3. PersonalizacionUsuario
personalizacion = PersonalizacionUsuario.objects.create(
    usuario=user,
    sucursal_principal=invitacion.sucursal,  # ← CRÍTICO
    tema='3',  # Sistema
    font_size=14
)

# 2.4. Marcar invitación como aceptada
invitacion.is_accepted = True
invitacion.accepted_at = timezone.now()
invitacion.save()

# 3. Usuario activa cuenta con activation_token
user.set_password(new_password)
user.is_active = True
user.save()
```

---

## 🔒 Permisos y Seguridad

### Autenticación JWT (SimpleJWT)
**Configuración** (`settings.py`):
```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=10),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}
```

**Endpoints Djoser**:
- `POST /auth/jwt/create` → Login (retorna `access` y `refresh` tokens)
- `POST /auth/jwt/refresh` → Renovar `access` con `refresh`
- `POST /auth/jwt/verify` → Validar token
- `GET /auth/users/me/` → Perfil del usuario actual

**Flujo de Login**:
```
Frontend → POST /auth/jwt/create { email, password }
   ↓
Backend valida credenciales
   ↓
Retorna { access: "eyJ...", refresh: "eyJ..." }
   ↓
Frontend almacena tokens en localStorage
   ↓
Todos los requests incluyen: Authorization: Bearer <access>
```

### Grupos de Permisos
**Grupos Estándar** (creados por `setup_superuser.py` o `create_groups.py`):
- `staff`: Personal administrativo (acceso completo a módulos)
- `superadmin`: Administrador máximo (todos los permisos Django)
- `multi-empresas`: Puede operar en múltiples empresas/sucursales
- `tecnico`: Técnico de campo (OT, visitas, rendiciones)
- `bodeguero`: Encargado de inventario (bodegas, movimientos)
- `representante_legal`: Representante legal de empresa (firmar contratos, aprobar)

**Asignación de Grupos**:
```python
# Opción A: En UsuarioEmpresa (grupos por empresa)
usuario_empresa.grupos.add(Group.objects.get(name='bodeguero'))

# Opción B: En User (grupos globales, menos común)
user.groups.add(Group.objects.get(name='staff'))
```

**Validación en ViewSets**:
```python
class PersonalizacionUsuarioViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]  # ← Requiere JWT válido
    
    def get_queryset(self):
        # Solo retorna datos del usuario actual
        return PersonalizacionUsuario.objects.filter(usuario=self.request.user)
```

---

## 🧪 Testing

### Tests Importantes a Cubrir

#### core/
- [ ] ModeloBase y ModeloBaseHistorico: herencia, timestamps automáticos
- [ ] PersonalizacionUsuario: creación, actualización, delete cascade
- [ ] AcuerdoConfidencialidadBase: tracking de historia
- [ ] PreguntaEnRetroalimentacion: content_type validation, manager filters

#### cuentas/
- [ ] User: create_user, create_superuser, login con email
- [ ] InvitacionEmpresa: crear, expirar, aceptar, rechazar
- [ ] InvitacionEmpresaViewSet: GET (filtro por sucursal), POST (validar email duplicado), accept_invitation
- [ ] get_grupos_user: JWT validation, grupos de UsuarioEmpresa

---

## 📚 Referencias Cruzadas

- [ARQUITECTURA_SISTEMA.md](../../arquitectura/sistema.md): Visión general del monorepo
- [empresas.md](./empresas.md): Modelo UsuarioEmpresa, SucursalEmpresa (próximo documento)
- [instructions/backend-instructions.md](../backend/general.md): Guía general de backend
- [instructions/security.md](../procesos/security.md): JWT, rotación de tokens, validaciones
- [INICIALIZACION.md](../../guias/inicializacion.md): setup_superuser.py, flujos de creación de usuario

---

## 🔑 Conceptos Clave

1. **PersonalizacionUsuario.sucursal_principal**: CRÍTICO para que el sistema funcione. Sin él, dashboard, invitaciones y módulos fallan.

2. **UsuarioEmpresa vs. User.groups**: Permisos se gestionan en `UsuarioEmpresa.grupos`, NO en `User.groups` (Django por defecto).

3. **InvitacionEmpresa**: Flujo completo de onboarding (invitar → aceptar → crear User + UsuarioEmpresa + PersonalizacionUsuario).

4. **ModeloBase vs. ModeloBaseHistorico**: Usar `ModeloBaseHistorico` para modelos críticos que requieren auditoría completa.

5. **Autenticación por Email**: `USERNAME_FIELD = 'email'` (no username). Login con email + password.

---

**Última actualización**: 2025-11-05  
**Próximo documento**: `empresas.md` (modelos Empresa, SucursalEmpresa, UsuarioEmpresa, RelacionEmpresa)
