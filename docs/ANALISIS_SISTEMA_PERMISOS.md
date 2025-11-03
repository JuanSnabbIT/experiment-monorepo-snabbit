# Análisis del Sistema de Permisos Actual - ERP Monorepo

## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura Actual](#arquitectura-actual)
3. [Cómo Funciona el Sistema Actual](#cómo-funciona-el-sistema-actual)
4. [Limitaciones Actuales](#limitaciones-actuales)
5. [¿Qué es Django Guardian?](#qué-es-django-guardian)
6. [Comparación: Sistema Actual vs Django Guardian](#comparación-sistema-actual-vs-django-guardian)
7. [Preparación para la Modernización](#preparación-para-la-modernización)

---

## Introducción

Este documento analiza el sistema de permisos actual del ERP para entender cómo funciona antes de modernizarlo con Django Guardian. El objetivo es comprender la lógica existente para migrar sin perder funcionalidad.

---

## Arquitectura Actual

### 🏗️ Componentes Principales

#### 1. **Backend (Django REST Framework)**

**Configuración Global** (`sw_erp/settings.py`):
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',  # <- Por defecto todos requieren autenticación
    ],
}
```

**¿Qué significa esto?**
- Por defecto, **TODOS** los endpoints requieren que el usuario esté autenticado (tenga un token JWT válido)
- Si alguien intenta acceder sin token → Error 401 (No autorizado)

#### 2. **Modelo de Usuario y Grupos**

```python
# cuentas/models.py
class User(AbstractBaseUser, PermissionsMixin, ModeloBase):
    email = models.EmailField(max_length=250, unique=True)
    first_name = models.CharField(max_length=250)
    # ... otros campos
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
```

**Hereda de `PermissionsMixin`**, lo que le da acceso al sistema de permisos de Django:
- `user.has_perm('app.permission')`
- `user.groups` (relación ManyToMany con grupos)
- `user.is_superuser` (acceso total)

#### 3. **Modelo de Empresa y Usuario-Empresa**

```python
# empresas/models.py
class UsuarioEmpresa(ModeloBase):
    usuario = models.OneToOneField("cuentas.User", on_delete=models.CASCADE)
    sucursal = models.ForeignKey("empresas.SucursalEmpresa", on_delete=models.CASCADE)
    grupos = models.ManyToManyField(Group, blank=True)  # <- ¡CLAVE!
    cargo = models.CharField(max_length=150, blank=True, null=True)
    estado = models.CharField(max_length=1, choices=ESTADO_USUARIO_EMPRESA, default="1")
```

**Este es un punto muy importante:**
- Los **grupos NO están directamente en el usuario**, sino en `UsuarioEmpresa`
- Un usuario puede tener diferentes grupos según la empresa/sucursal
- Esto permite multi-empresa: mismo usuario, diferentes roles por empresa

#### 4. **Personalización de Usuario**

```python
# core/models.py
class PersonalizacionUsuario(ModeloBase):
    usuario = models.OneToOneField("cuentas.User", on_delete=models.CASCADE)
    sucursal_principal = models.ForeignKey("empresas.SucursalEmpresa", on_delete=models.SET_NULL, null=True)
```

**Define la "sucursal activa"** del usuario, usada para filtrar datos.

---

## Cómo Funciona el Sistema Actual

### 🔐 Flujo de Autenticación y Autorización

#### **Paso 1: Login (JWT)**

```
Usuario → POST /auth/jwt/create con {email, password}
         ↓
Backend valida credenciales
         ↓
Backend devuelve {access: "token_5h", refresh: "token_10h"}
         ↓
Frontend guarda tokens en localStorage
```

#### **Paso 2: Obtener Grupos del Usuario**

```javascript
// frontend/src/store/slices/auth/authSlice.ts
export const obtenerGruposThunk = createAsyncThunk(
    'auth/obtenerGruposThunk',
    async ({access}) => {
        const response = await ApiService.fetchData({
            url: `/api/get_grupos_user/`,
            method: 'get',
            headers: {'Authorization': `Bearer ${access}`}
        })
        return response.data  // {grupos: ['staff', 'superadmin']}
    }
)
```

**Backend** (`cuentas/views.py`):
```python
async def get_grupos_user(request):
    # Valida JWT
    user = await sync_to_async(jwt_authenticator.get_user)(validated_token)
    
    # Obtiene grupos de UsuarioEmpresa (NO del User)
    grupos_usuario_empresa = await sync_to_async(
        lambda: list(
            UsuarioEmpresa.objects.filter(usuario=user)
            .values_list('grupos__name', flat=True)
            .distinct()
        )
    )()
    
    return JsonResponse({'grupos': grupos_usuario_empresa})
```

**¿Qué hace?**
- Lee los grupos asociados al `UsuarioEmpresa` del usuario autenticado
- Devuelve lista de nombres: `['staff', 'superadmin', 'tecnico']`

#### **Paso 3: Frontend Guarda Grupos en Redux**

```typescript
// Estado en Redux
{
    access: "eyJ0eXAiOiJKV1QiLCJhbGc...",
    isAuthenticated: true,
    listaGrupos: {grupos: ['staff', 'superadmin']},
    userMe: {...},
    personalizacionUsuario: {...}
}
```

#### **Paso 4: Control de Acceso en Frontend**

**Configuración de rutas** (`frontend/src/config/pages.config.ts`):
```typescript
export const Pages = {
    empresa: {
        to: '/empresa',
        text: 'Empresa',
        authority: ['staff', 'superadmin'],  // <- Solo estos grupos pueden acceder
        subPages: {
            listaUsuariosEmpresa: {
                to: '/empresa/lista-usuarios-empresa',
                authority: ['staff', 'superadmin']
            }
        }
    },
    contratos: {
        to: '/contratos',
        authority: ['staff', 'superadmin', 'tecnico'],
    }
}
```

**Componente de protección** (`frontend/src/components/layouts/AuthorityCheck/AuthorityCheck.tsx`):
```typescript
const AuthorityCheck = ({userAuthority = [], authority = [], children}) => {
    // Si authority está vacío, la ruta es pública
    if (!authority || authority.length === 0) {
        return <>{children}</>
    }

    // Verifica si el usuario tiene al menos uno de los grupos requeridos
    const roleMatched = useAuthority(userAuthority, authority, true)
    
    // Si coincide → muestra contenido; si no → redirige a /sin-permisos
    return <>{roleMatched ? children : <Navigate to="/sin-permisos" />}</>
}
```

**Hook de verificación** (`frontend/src/hooks/useAuthority.ts`):
```typescript
function useAuthority(userAuthority: string[], authority: string[]) {
    const roleMatched = useMemo(() => {
        // Devuelve true si el usuario tiene AL MENOS UNO de los grupos requeridos
        return authority.some((role) => userAuthority.includes(role))
    }, [authority, userAuthority])

    return roleMatched
}
```

**Ejemplo práctico:**
```
Usuario tiene: ['staff', 'tecnico']
Ruta requiere: ['staff', 'superadmin']

¿Puede acceder? SÍ (porque tiene 'staff')
```

#### **Paso 5: Control de Acceso en Backend (Filtrado de Datos)**

**Ejemplo: OrdenDeTrabajoViewSet**
```python
class OrdenDeTrabajoViewSet(viewsets.ModelViewSet):
    queryset = OrdenDeTrabajo.objects.all()
    serializer_class = OrdenDeTrabajoSerializer
    # permission_classes = [IsAuthenticated]  <- heredado de config global

    def get_queryset(self):
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        
        # Filtra por empresa de la sucursal principal del usuario
        if personalizacion and personalizacion.sucursal_principal:
            return OrdenDeTrabajo.objects.filter(
                empresa=personalizacion.sucursal_principal.empresa
            )
        
        # Si no tiene sucursal configurada, no ve nada
        return OrdenDeTrabajo.objects.none()
```

**¿Qué hace?**
- Cada usuario solo ve datos de SU empresa/sucursal
- El filtrado es manual en cada ViewSet
- No usa permisos de Django, solo filtros de queryset

**Otro ejemplo: CalendarioViewSet**
```python
class DiaCalendarioViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        try:
            personalizacion = PersonalizacionUsuario.objects.get(usuario=user)
            sucursal = personalizacion.sucursal_principal
            empresa = sucursal.empresa
        except (PersonalizacionUsuario.DoesNotExist, AttributeError):
            return DiaCalendario.objects.none()
        
        return DiaCalendario.objects.filter(empresa=empresa)
```

#### **Paso 6: Excepciones (Rutas Públicas)**

**Ejemplo: Retroalimentación sin permisos**
```python
# retroalimentacion/views.py
class RetroalimentacionPorTokenView(generics.RetrieveUpdateAPIView):
    queryset = Retroalimentacion.objects.all()
    permission_classes = [AllowAny]  # <- Sobrescribe el default IsAuthenticated
    lookup_field = "uuid"
    
    # Clientes externos pueden acceder con UUID sin autenticarse
```

**Ejemplo: Activación de cuenta**
```python
# cuentas/views.py
@api_view(['POST'])
@permission_classes([AllowAny])  # <- Ruta pública
def activate_account(request, token):
    # Permite activar cuenta sin estar autenticado
```

---

## Limitaciones Actuales

### ❌ Problemas del Sistema Actual

#### 1. **No Hay Permisos a Nivel de Objeto (Object-Level Permissions)**

```python
# Actual: Solo puedo verificar si está autenticado
class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    # permission_classes = [IsAuthenticated]
    
    # No puedo decir: "Este usuario puede editar ESTE producto específico"
```

**Problema:**
- No puedo dar permiso para editar "Cotización #123" pero no "Cotización #456"
- No puedo decir "Usuario X puede ver OT de Sucursal A, pero no de Sucursal B"
- Todo es filtrado manual en `get_queryset()`

#### 2. **Permisos Hardcodeados en Frontend**

```typescript
// pages.config.ts
empresa: {
    authority: ['staff', 'superadmin'],  // <- Hardcoded
}
```

**Problema:**
- Si cambio un grupo en BD, debo cambiar código frontend
- No es dinámico
- Difícil de mantener

#### 3. **Filtrado Manual Repetitivo**

```python
# Cada ViewSet tiene que implementar su propio filtrado
def get_queryset(self):
    user = self.request.user
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    if personalizacion and personalizacion.sucursal_principal:
        return MiModelo.objects.filter(empresa=personalizacion.sucursal_principal.empresa)
    return MiModelo.objects.none()
```

**Problema:**
- Código duplicado en ~20+ ViewSets
- Fácil olvidar filtrar en algún endpoint
- No es DRY (Don't Repeat Yourself)

#### 4. **Grupos por Empresa, NO por Modelo Django**

```python
# UsuarioEmpresa tiene grupos, pero NO usa el sistema de permisos de Django
grupos = models.ManyToManyField(Group, blank=True)
```

**Problema:**
- No aprovecha `user.has_perm('cotizaciones.change_cotizacion')`
- Sistema custom, no estándar de Django
- No integrable con herramientas como Django Admin

#### 5. **Sin Auditoría Granular**

**Problema:**
- No sé QUÉ objeto modificó un usuario (solo filtro por empresa)
- No puedo decir "El usuario X modificó la Cotización #123"

---

## ¿Qué es Django Guardian?

### 🛡️ Permisos a Nivel de Objeto

**Django Guardian** extiende el sistema de permisos de Django para permitir permisos **por objeto específico**.

#### **Django Estándar (sin Guardian)**

```python
# Solo puedes verificar permisos globales
if user.has_perm('cotizaciones.change_cotizacion'):
    # Usuario puede cambiar CUALQUIER cotización
```

#### **Django Guardian**

```python
from guardian.shortcuts import assign_perm, get_objects_for_user

# Asignar permiso a un objeto específico
cotizacion = Cotizacion.objects.get(id=123)
assign_perm('change_cotizacion', user, cotizacion)

# Verificar permiso en objeto específico
if user.has_perm('cotizaciones.change_cotizacion', cotizacion):
    # Usuario puede cambiar ESTA cotización específica

# Obtener solo objetos con permiso
cotizaciones_permitidas = get_objects_for_user(
    user,
    'cotizaciones.view_cotizacion',
    Cotizacion
)
```

### 🔑 Características Clave

#### 1. **Permisos por Objeto**
```python
# Usuario A puede editar Cotización #1, pero no #2
assign_perm('change_cotizacion', usuario_a, cotizacion_1)

# Usuario B puede ver OT de Sucursal Norte, pero no de Sucursal Sur
assign_perm('view_ordentrabajo', usuario_b, ot_sucursal_norte)
```

#### 2. **Permisos de Grupo por Objeto**
```python
# Grupo "Técnicos" puede ver todas las OT de Sucursal Norte
grupo_tecnicos = Group.objects.get(name='tecnicos')
for ot in ot_sucursal_norte:
    assign_perm('view_ordentrabajo', grupo_tecnicos, ot)
```

#### 3. **Integración con Django REST Framework**
```python
from rest_framework.permissions import DjangoObjectPermissions

class CotizacionViewSet(viewsets.ModelViewSet):
    queryset = Cotizacion.objects.all()
    permission_classes = [DjangoObjectPermissions]
    
    # ¡Guardian automáticamente filtra solo objetos con permiso!
    # No necesito escribir get_queryset()
```

#### 4. **Verificaciones Rápidas**
```python
# Obtener objetos con permiso (1 query optimizado)
cotizaciones = get_objects_for_user(
    user,
    'cotizaciones.view_cotizacion',
    klass=Cotizacion,
    use_groups=True  # Incluye permisos de grupos
)

# Verificar múltiples permisos
user.has_perms(['view_cotizacion', 'change_cotizacion'], cotizacion)
```

---

## Comparación: Sistema Actual vs Django Guardian

| Característica | Sistema Actual | Con Django Guardian |
|---------------|----------------|---------------------|
| **Autenticación** | JWT ✅ | JWT ✅ (sin cambios) |
| **Permisos globales** | `IsAuthenticated` ✅ | `IsAuthenticated` + `DjangoModelPermissions` ✅ |
| **Permisos por objeto** | ❌ Manual con `get_queryset()` | ✅ Automático |
| **Multi-empresa** | ✅ Filtrado manual | ✅ Permisos por empresa/sucursal |
| **Grupos dinámicos** | ❌ Hardcoded en frontend | ✅ Dinámico desde BD |
| **Código repetido** | ❌ Mucho (`get_queryset` en cada ViewSet) | ✅ Centralizado |
| **Auditoría** | ⚠️ Por empresa | ✅ Por objeto específico |
| **Integración Django Admin** | ❌ | ✅ |
| **Escalabilidad** | ⚠️ Crece con complejidad | ✅ Mejor mantenibilidad |

---

## Preparación para la Modernización

### 📝 Pasos Sugeridos

#### **Fase 1: Análisis (YA HECHO ✅)**
- [x] Entender sistema actual
- [x] Identificar patrones de filtrado
- [x] Mapear grupos existentes

#### **Fase 2: Instalación y Configuración**
```bash
# Instalar Django Guardian
pip install django-guardian

# settings.py
INSTALLED_APPS = [
    # ...
    'guardian',
]

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',  # Default
    'guardian.backends.ObjectPermissionBackend',  # Guardian
]
```

#### **Fase 3: Definir Permisos en Modelos**
```python
# cotizaciones/models.py
class Cotizacion(models.Model):
    # ... campos existentes
    
    class Meta:
        permissions = [
            ('can_approve_cotizacion', 'Puede aprobar cotizaciones'),
            ('can_export_cotizacion', 'Puede exportar cotizaciones'),
        ]
```

#### **Fase 4: Migrar ViewSets Gradualmente**

**Antes:**
```python
class CotizacionViewSet(viewsets.ModelViewSet):
    queryset = Cotizacion.objects.all()
    
    def get_queryset(self):
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if personalizacion and personalizacion.sucursal_principal:
            return Cotizacion.objects.filter(empresa=personalizacion.sucursal_principal.empresa)
        return Cotizacion.objects.none()
```

**Después:**
```python
from rest_framework.permissions import DjangoObjectPermissions
from guardian.shortcuts import get_objects_for_user

class CotizacionViewSet(viewsets.ModelViewSet):
    queryset = Cotizacion.objects.all()
    permission_classes = [IsAuthenticated, DjangoObjectPermissions]
    
    def get_queryset(self):
        # Guardian filtra automáticamente por permisos de objeto
        return get_objects_for_user(
            self.request.user,
            'cotizaciones.view_cotizacion',
            klass=Cotizacion
        )
```

#### **Fase 5: Asignar Permisos Iniciales**

**Script de migración:**
```python
from guardian.shortcuts import assign_perm

def migrar_permisos_empresa():
    """Asigna permisos a nivel de objeto según empresa actual"""
    for usuario_empresa in UsuarioEmpresa.objects.all():
        user = usuario_empresa.usuario
        empresa = usuario_empresa.sucursal.empresa
        
        # Asignar permisos a todas las cotizaciones de su empresa
        cotizaciones = Cotizacion.objects.filter(empresa=empresa)
        for cotizacion in cotizaciones:
            assign_perm('view_cotizacion', user, cotizacion)
            
            # Si tiene grupo 'staff', puede editar
            if usuario_empresa.grupos.filter(name='staff').exists():
                assign_perm('change_cotizacion', user, cotizacion)
```

#### **Fase 6: Actualizar Frontend (Opcional)**

```typescript
// Agregar verificación de permisos por objeto
interface IObjectPermissions {
    can_view: boolean
    can_edit: boolean
    can_delete: boolean
}

// En cada endpoint, devolver permisos del objeto
{
    id: 123,
    nombre: "Cotización Empresa X",
    permissions: {
        can_view: true,
        can_edit: false,
        can_delete: false
    }
}
```

---

## 🎯 Resumen Ejecutivo

### **Sistema Actual**
- ✅ Autenticación JWT funcional
- ✅ Grupos por empresa (`UsuarioEmpresa.grupos`)
- ✅ Filtrado por empresa funcional
- ❌ Sin permisos a nivel de objeto
- ❌ Código repetitivo en cada ViewSet
- ❌ Permisos hardcodeados en frontend

### **Con Django Guardian**
- ✅ Mantiene todo lo funcional actual
- ✅ Agrega permisos granulares por objeto
- ✅ Centraliza lógica de permisos
- ✅ Reduce código repetitivo
- ✅ Escalable y mantenible
- ✅ Integración con Django Admin

### **Riesgo de Migración**
- **Bajo**: Guardian es aditivo, no rompe nada existente
- **Esfuerzo**: Medio (requiere migrar cada ViewSet gradualmente)
- **Beneficio**: Alto (código más limpio, permisos granulares)

---

## 📚 Recursos Recomendados

### Documentación
- [Django Guardian Docs](https://django-guardian.readthedocs.io/)
- [Django Permissions](https://docs.djangoproject.com/en/5.1/topics/auth/default/#permissions-and-authorization)
- [DRF Permissions](https://www.django-rest-framework.org/api-guide/permissions/)

### Tutoriales
- [Object-level permissions with Django Guardian](https://testdriven.io/blog/django-permissions/)
- [DRF + Guardian Integration](https://www.django-rest-framework.org/api-guide/filtering/#djangoobjectpermissionsfilter)

---

**Fecha de creación:** 2025-11-03  
**Autor:** Análisis para modernización de permisos  
**Próximos pasos:** Revisar este documento con el equipo y planificar implementación gradual
