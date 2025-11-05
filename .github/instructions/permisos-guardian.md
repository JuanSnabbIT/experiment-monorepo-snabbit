---
title: "Modernización de Permisos con Django Guardian"
scope: "backend"
status: "draft"
last_updated: "2025-11-04"
---

# 🛡️ Django Guardian - Permisos a Nivel de Objeto

**Plan de Implementación para Modernizar el Sistema de Permisos**

> **📌 Prerrequisito**: Leer [permisos-sistema.md](./permisos-sistema.md) para entender el sistema actual

---

## 📋 Índice

1. [¿Por Qué Django Guardian?](#-por-qué-django-guardian)
2. [Comparación: Actual vs Guardian](#-comparación-actual-vs-guardian)
3. [Instalación y Configuración](#-instalación-y-configuración)
4. [Definir Permisos en Modelos](#-definir-permisos-en-modelos)
5. [Utilidades Compartidas](#-utilidades-compartidas)
6. [Migración de ViewSets](#-migración-de-viewsets)
7. [Script de Migración de Datos](#-script-de-migración-de-datos)
8. [Integración con Frontend](#-integración-con-frontend)
9. [Testing](#-testing)
10. [Optimización](#-optimización)

---

## 🎯 ¿Por Qué Django Guardian?

### Sistema Actual (Limitaciones)

```python
# ❌ Solo puedo filtrar por empresa
class CotizacionViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Cotizacion.objects.filter(
            empresa=self.request.user.personalizacion.sucursal_principal.empresa
        )
    # Todos los usuarios de la empresa ven TODAS las cotizaciones
```

### Con Django Guardian

```python
# ✅ Permisos granulares por objeto
from guardian.shortcuts import get_objects_for_user

class CotizacionViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return get_objects_for_user(
            self.request.user,
            'cotizaciones.view_cotizacion',
            klass=Cotizacion
        )
    # Usuario solo ve cotizaciones específicas con permiso
```

### Casos de Uso

1. **Cotización #123**: Solo el vendedor creador y su supervisor pueden editarla
2. **OT de Sucursal Norte**: Solo técnicos asignados a esa sucursal pueden verlas
3. **Contrato VIP**: Solo gerentes con permiso `can_view_financial_data` ven precios
4. **Transferir permisos**: Al duplicar cotización, copiar permisos del original

---

## 📊 Comparación: Actual vs Guardian

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

## 🔧 Instalación y Configuración

### Paso 1: Instalar Django Guardian

```cmd
cd backend
ENV\Scripts\activate
pip install django-guardian
pip freeze > req.txt
```

### Paso 2: Actualizar `settings.py`

**Archivo**: `backend/sw_erp/settings.py`

```python
INSTALLED_APPS = [
    # ... apps existentes
    'guardian',  # ← Agregar
]

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',  # Default Django
    'guardian.backends.ObjectPermissionBackend',  # Guardian
]

# Opcional: Usuario anónimo para permisos públicos
ANONYMOUS_USER_NAME = None  # o 'AnonymousUser'
```

### Paso 3: Ejecutar Migraciones

```cmd
cd backend
backend\ENV\Scripts\python.exe manage.py migrate
```

**Output esperado**:
```
Running migrations:
  Applying guardian.0001_initial... OK
  Applying guardian.0002_generic_permissions_index... OK
```

### Paso 4: Prueba de Concepto (POC)

**Crear archivo**: `backend/test_guardian_poc.py`

```python
"""
Prueba de concepto de Django Guardian
Ejecutar: python manage.py test test_guardian_poc
"""
from django.test import TestCase
from guardian.shortcuts import assign_perm, get_objects_for_user
from cotizaciones.models import Cotizacion
from cuentas.models import User
from empresas.models import Empresa


class GuardianPOCTest(TestCase):
    def setUp(self):
        self.empresa_a = Empresa.objects.create(nombre="Empresa A")
        self.empresa_b = Empresa.objects.create(nombre="Empresa B")
        
        self.cotizacion_a = Cotizacion.objects.create(
            numero="COT-001",
            empresa=self.empresa_a
        )
        self.cotizacion_b = Cotizacion.objects.create(
            numero="COT-002",
            empresa=self.empresa_b
        )
        
        self.user = User.objects.create_user(
            email="test@example.com",
            password="test123"
        )
    
    def test_asignar_permiso_objeto(self):
        """Usuario puede ver cotización específica"""
        # Asignar permiso a cotizacion_a
        assign_perm('view_cotizacion', self.user, self.cotizacion_a)
        
        # Verificar permiso
        self.assertTrue(
            self.user.has_perm('cotizaciones.view_cotizacion', self.cotizacion_a)
        )
        self.assertFalse(
            self.user.has_perm('cotizaciones.view_cotizacion', self.cotizacion_b)
        )
    
    def test_obtener_objetos_con_permiso(self):
        """Obtener solo cotizaciones con permiso"""
        assign_perm('view_cotizacion', self.user, self.cotizacion_a)
        
        cotizaciones_permitidas = get_objects_for_user(
            self.user,
            'cotizaciones.view_cotizacion',
            klass=Cotizacion
        )
        
        self.assertEqual(cotizaciones_permitidas.count(), 1)
        self.assertEqual(cotizaciones_permitidas.first(), self.cotizacion_a)
```

**Ejecutar POC**:

```cmd
cd backend
backend\ENV\Scripts\python.exe manage.py test test_guardian_poc
```

---

## 🏗️ Definir Permisos en Modelos

### Cotizaciones

**Archivo**: `backend/cotizaciones/models.py`

```python
class Cotizacion(ModeloBase):
    # ... campos existentes
    
    class Meta:
        verbose_name = "Cotización"
        verbose_name_plural = "Cotizaciones"
        ordering = ['-fecha_creacion']
        permissions = [
            ('can_approve_cotizacion', 'Puede aprobar cotizaciones'),
            ('can_reject_cotizacion', 'Puede rechazar cotizaciones'),
            ('can_export_cotizacion', 'Puede exportar cotizaciones'),
            ('can_send_cotizacion', 'Puede enviar cotizaciones por email'),
        ]
```

### Órdenes de Trabajo

**Archivo**: `backend/ordentrabajo/models.py`

```python
class OrdenDeTrabajo(ModeloBase):
    # ... campos existentes
    
    class Meta:
        verbose_name = "Orden de Trabajo"
        verbose_name_plural = "Órdenes de Trabajo"
        permissions = [
            ('can_assign_ot', 'Puede asignar órdenes de trabajo'),
            ('can_close_ot', 'Puede cerrar órdenes de trabajo'),
            ('can_cancel_ot', 'Puede cancelar órdenes de trabajo'),
            ('can_view_all_ot', 'Puede ver todas las OT de la empresa'),
        ]
```

### Contratos

**Archivo**: `backend/contratos/models.py`

```python
class Contrato(ModeloBase):
    # ... campos existentes
    
    class Meta:
        verbose_name = "Contrato"
        verbose_name_plural = "Contratos"
        permissions = [
            ('can_activate_contrato', 'Puede activar contratos'),
            ('can_renew_contrato', 'Puede renovar contratos'),
            ('can_terminate_contrato', 'Puede terminar contratos'),
            ('can_view_financial_data', 'Puede ver datos financieros'),
        ]
```

**Generar migraciones**:

```cmd
cd backend
backend\ENV\Scripts\python.exe manage.py makemigrations
backend\ENV\Scripts\python.exe manage.py migrate
```

---

## 🛠️ Utilidades Compartidas

**Crear archivo**: `backend/core/guardian_utils.py`

```python
"""
Utilidades para Django Guardian
Centraliza lógica de permisos para evitar duplicación
"""
from guardian.shortcuts import assign_perm, remove_perm, get_objects_for_user
from django.contrib.auth.models import Group
from typing import List
from django.db.models import Model


def asignar_permisos_empresa(usuario, empresa, permisos: List[str], modelo: Model):
    """
    Asigna permisos a un usuario para todos los objetos de su empresa
    
    Args:
        usuario: Usuario de Django
        empresa: Instancia de Empresa
        permisos: Lista de permisos ['view', 'change', 'delete']
        modelo: Modelo Django (ej: Cotizacion)
    
    Ejemplo:
        asignar_permisos_empresa(user, empresa, ['view', 'change'], Cotizacion)
    """
    objetos = modelo.objects.filter(empresa=empresa)
    
    for obj in objetos:
        for permiso in permisos:
            codename = f'{permiso}_{modelo._meta.model_name}'
            assign_perm(codename, usuario, obj)


def asignar_permisos_grupo_empresa(grupo: Group, empresa, permisos: List[str], modelo: Model):
    """
    Asigna permisos a un grupo para todos los objetos de una empresa
    
    Ejemplo:
        grupo_staff = Group.objects.get(name='staff')
        asignar_permisos_grupo_empresa(grupo_staff, empresa, ['view', 'change'], Cotizacion)
    """
    objetos = modelo.objects.filter(empresa=empresa)
    
    for obj in objetos:
        for permiso in permisos:
            codename = f'{permiso}_{modelo._meta.model_name}'
            assign_perm(codename, grupo, obj)


def obtener_objetos_permitidos(usuario, app_label: str, model_name: str, permiso: str = 'view'):
    """
    Obtiene todos los objetos que un usuario puede ver/editar/eliminar
    
    Args:
        usuario: Usuario de Django
        app_label: Nombre de la app (ej: 'cotizaciones')
        model_name: Nombre del modelo (ej: 'cotizacion')
        permiso: Tipo de permiso ('view', 'change', 'delete')
    
    Returns:
        QuerySet filtrado por permisos
    
    Ejemplo:
        cotizaciones = obtener_objetos_permitidos(user, 'cotizaciones', 'cotizacion', 'view')
    """
    from django.apps import apps
    
    permission = f'{app_label}.{permiso}_{model_name}'
    modelo = apps.get_model(app_label, model_name)
    
    return get_objects_for_user(
        usuario,
        permission,
        klass=modelo,
        use_groups=True,  # Incluye permisos de grupos
        accept_global_perms=True  # Incluye permisos globales
    )


def copiar_permisos_objeto(obj_origen, obj_destino, usuario_o_grupo):
    """
    Copia los permisos de un objeto a otro
    
    Útil al duplicar cotizaciones, contratos, etc.
    
    Ejemplo:
        cotizacion_nueva = duplicar_cotizacion(cotizacion_original)
        copiar_permisos_objeto(cotizacion_original, cotizacion_nueva, user)
    """
    from guardian.models import UserObjectPermission, GroupObjectPermission
    from django.contrib.contenttypes.models import ContentType
    
    content_type = ContentType.objects.get_for_model(obj_origen)
    
    if isinstance(usuario_o_grupo, Group):
        permisos = GroupObjectPermission.objects.filter(
            content_type=content_type,
            object_pk=obj_origen.pk,
            group=usuario_o_grupo
        )
        for perm in permisos:
            assign_perm(perm.permission.codename, usuario_o_grupo, obj_destino)
    else:
        permisos = UserObjectPermission.objects.filter(
            content_type=content_type,
            object_pk=obj_origen.pk,
            user=usuario_o_grupo
        )
        for perm in permisos:
            assign_perm(perm.permission.codename, usuario_o_grupo, obj_destino)
```

### Permission Classes para DRF

**Crear archivo**: `backend/core/permissions.py`

```python
"""
Clases de permisos personalizadas para DRF + Guardian
"""
from rest_framework import permissions


class EmpresaObjectPermission(permissions.BasePermission):
    """
    Permiso personalizado que verifica:
    1. Usuario está autenticado
    2. Usuario tiene permiso sobre el objeto (Guardian)
    3. Objeto pertenece a la empresa del usuario
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Superadmins tienen acceso total
        if request.user.is_superuser:
            return True
        
        # Verificar permiso de Guardian
        if request.method in permissions.SAFE_METHODS:
            perm = f'{obj._meta.app_label}.view_{obj._meta.model_name}'
        elif request.method == 'POST':
            perm = f'{obj._meta.app_label}.add_{obj._meta.model_name}'
        elif request.method in ['PUT', 'PATCH']:
            perm = f'{obj._meta.app_label}.change_{obj._meta.model_name}'
        elif request.method == 'DELETE':
            perm = f'{obj._meta.app_label}.delete_{obj._meta.model_name}'
        else:
            return False
        
        return request.user.has_perm(perm, obj)


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permiso personalizado: Solo el creador puede editar
    """
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Solo el creador puede editar/eliminar
        return obj.usuario_creador == request.user
```

---

## 🔄 Migración de ViewSets

### Prioridad de Migración

1. **Cotizaciones** (alta complejidad, alta frecuencia)
2. **Órdenes de Trabajo** (crítico para operación)
3. **Contratos** (alta sensibilidad)
4. **Bodegas/Inventario**
5. **Usuarios/Empresa**

### Ejemplo: CotizacionViewSet

**ANTES** (`backend/cotizaciones/views.py`):

```python
class CotizacionViewSet(viewsets.ModelViewSet):
    queryset = Cotizacion.objects.all()
    serializer_class = CotizacionSerializer
    
    def get_queryset(self):
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if personalizacion and personalizacion.sucursal_principal:
            return Cotizacion.objects.filter(
                empresa=personalizacion.sucursal_principal.empresa
            )
        return Cotizacion.objects.none()
```

**DESPUÉS** (con Guardian):

```python
from core.permissions import EmpresaObjectPermission
from core.guardian_utils import obtener_objetos_permitidos
from guardian.shortcuts import assign_perm

class CotizacionViewSet(viewsets.ModelViewSet):
    queryset = Cotizacion.objects.all()
    serializer_class = CotizacionSerializer
    permission_classes = [EmpresaObjectPermission]
    
    def get_queryset(self):
        """
        Filtra cotizaciones por permisos de Guardian.
        Usuario solo ve cotizaciones con permiso 'view_cotizacion'.
        """
        return obtener_objetos_permitidos(
            self.request.user,
            'cotizaciones',
            'cotizacion',
            'view'
        )
    
    def perform_create(self, serializer):
        """
        Al crear cotización, asignar permisos automáticamente
        """
        cotizacion = serializer.save()
        
        # Asignar permisos al creador
        assign_perm('view_cotizacion', self.request.user, cotizacion)
        assign_perm('change_cotizacion', self.request.user, cotizacion)
        assign_perm('delete_cotizacion', self.request.user, cotizacion)
        
        # Si tiene grupos, asignar a grupos también
        from empresas.models import UsuarioEmpresa
        try:
            usuario_empresa = UsuarioEmpresa.objects.get(usuario=self.request.user)
            for grupo in usuario_empresa.grupos.all():
                assign_perm('view_cotizacion', grupo, cotizacion)
                if grupo.name in ['staff', 'superadmin']:
                    assign_perm('change_cotizacion', grupo, cotizacion)
                    assign_perm('delete_cotizacion', grupo, cotizacion)
        except UsuarioEmpresa.DoesNotExist:
            pass
```

---

## 📦 Script de Migración de Datos

**Crear archivo**: `backend/management/commands/migrar_permisos_guardian.py`

```python
"""
Script para migrar permisos existentes a Django Guardian.
Asigna permisos a nivel de objeto basándose en la empresa del usuario.

Ejecutar: python manage.py migrar_permisos_guardian
"""
from django.core.management.base import BaseCommand
from guardian.shortcuts import assign_perm
from empresas.models import UsuarioEmpresa
from cotizaciones.models import Cotizacion
from ordentrabajo.models import OrdenDeTrabajo
from contratos.models import Contrato
from tqdm import tqdm


class Command(BaseCommand):
    help = 'Migra permisos existentes a Django Guardian'
    
    def handle(self, *args, **kwargs):
        self.stdout.write('Iniciando migración de permisos...')
        
        self.migrar_permisos_cotizaciones()
        self.migrar_permisos_ordenes()
        self.migrar_permisos_contratos()
        
        self.stdout.write(self.style.SUCCESS('✅ Migración completada'))
    
    def migrar_permisos_cotizaciones(self):
        self.stdout.write('Migrando cotizaciones...')
        
        for usuario_empresa in tqdm(UsuarioEmpresa.objects.all()):
            user = usuario_empresa.usuario
            empresa = usuario_empresa.sucursal.empresa
            
            cotizaciones = Cotizacion.objects.filter(empresa=empresa)
            
            for cotizacion in cotizaciones:
                # Todos pueden ver cotizaciones de su empresa
                assign_perm('view_cotizacion', user, cotizacion)
                
                # Permisos por grupo
                for grupo in usuario_empresa.grupos.all():
                    assign_perm('view_cotizacion', grupo, cotizacion)
                    
                    if grupo.name in ['staff', 'superadmin', 'vendedor']:
                        assign_perm('change_cotizacion', grupo, cotizacion)
                        assign_perm('can_approve_cotizacion', grupo, cotizacion)
                    
                    if grupo.name in ['superadmin']:
                        assign_perm('delete_cotizacion', grupo, cotizacion)
        
        self.stdout.write(self.style.SUCCESS(f'  Procesadas {Cotizacion.objects.count()} cotizaciones'))
    
    def migrar_permisos_ordenes(self):
        self.stdout.write('Migrando órdenes de trabajo...')
        
        for usuario_empresa in tqdm(UsuarioEmpresa.objects.all()):
            user = usuario_empresa.usuario
            empresa = usuario_empresa.sucursal.empresa
            
            ordenes = OrdenDeTrabajo.objects.filter(empresa=empresa)
            
            for orden in ordenes:
                assign_perm('view_ordentrabajo', user, orden)
                
                for grupo in usuario_empresa.grupos.all():
                    assign_perm('view_ordentrabajo', grupo, orden)
                    
                    if grupo.name in ['staff', 'superadmin', 'tecnico']:
                        assign_perm('change_ordentrabajo', grupo, orden)
                        assign_perm('can_assign_ot', grupo, orden)
                    
                    if grupo.name in ['staff', 'superadmin']:
                        assign_perm('can_close_ot', grupo, orden)
                        assign_perm('can_cancel_ot', grupo, orden)
        
        self.stdout.write(self.style.SUCCESS(f'  Procesadas {OrdenDeTrabajo.objects.count()} órdenes'))
    
    def migrar_permisos_contratos(self):
        # Similar a las anteriores
        pass
```

**Ejecutar migración**:

```cmd
cd backend
backend\ENV\Scripts\python.exe manage.py migrar_permisos_guardian
```

---

## 🎨 Integración con Frontend

### Endpoint de Permisos por Objeto

**Modificar serializer**:

```python
# cotizaciones/serializers.py
from guardian.shortcuts import get_perms

class CotizacionSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = Cotizacion
        fields = '__all__'
    
    def get_permissions(self, obj):
        """Devuelve permisos del usuario sobre este objeto"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return {}
        
        user = request.user
        
        return {
            'can_view': user.has_perm('cotizaciones.view_cotizacion', obj),
            'can_edit': user.has_perm('cotizaciones.change_cotizacion', obj),
            'can_delete': user.has_perm('cotizaciones.delete_cotizacion', obj),
            'can_approve': user.has_perm('cotizaciones.can_approve_cotizacion', obj),
            'can_export': user.has_perm('cotizaciones.can_export_cotizacion', obj),
        }
```

### Interfaz TypeScript

**Actualizar**: `frontend/src/interface/cotizacion.interface.ts`

```typescript
export interface ICotizacionPermisos {
    can_view: boolean
    can_edit: boolean
    can_delete: boolean
    can_approve: boolean
    can_export: boolean
}

export interface ICotizacion {
    id: number
    numero: string
    // ... otros campos
    permissions: ICotizacionPermisos
}
```

### Componentes UI con Permisos

```tsx
// frontend/src/pages/Cotizacion/DetalleCotizacion.tsx
function DetalleCotizacion() {
    const { cotizacion } = useAppSelector(state => state.cotizaciones)
    
    return (
        <div>
            <h1>{cotizacion.numero}</h1>
            
            {cotizacion.permissions.can_edit && (
                <Button onClick={handleEditar}>Editar</Button>
            )}
            
            {cotizacion.permissions.can_approve && (
                <Button onClick={handleAprobar}>Aprobar</Button>
            )}
            
            {cotizacion.permissions.can_delete && (
                <Button variant="danger" onClick={handleEliminar}>Eliminar</Button>
            )}
        </div>
    )
}
```

---

## 🧪 Testing

**Crear**: `backend/cotizaciones/tests/test_permissions.py`

```python
from django.test import TestCase
from rest_framework.test import APIClient
from guardian.shortcuts import assign_perm
from cuentas.models import User
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa
from cotizaciones.models import Cotizacion


class CotizacionPermissionsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        self.empresa_a = Empresa.objects.create(nombre="Empresa A")
        self.sucursal_a = SucursalEmpresa.objects.create(nombre="Sucursal A", empresa=self.empresa_a)
        
        self.user_a = User.objects.create_user(email="user_a@test.com", password="test123")
        UsuarioEmpresa.objects.create(usuario=self.user_a, sucursal=self.sucursal_a)
        
        self.cotizacion_a = Cotizacion.objects.create(numero="COT-001", empresa=self.empresa_a)
        
        assign_perm('view_cotizacion', self.user_a, self.cotizacion_a)
    
    def test_usuario_ve_solo_cotizaciones_con_permiso(self):
        """Usuario A solo ve cotización A"""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/cotizaciones/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['numero'], 'COT-001')
    
    def test_usuario_puede_editar_con_permiso(self):
        """Usuario A puede editar cotización A"""
        assign_perm('change_cotizacion', self.user_a, self.cotizacion_a)
        
        self.client.force_authenticate(user=self.user_a)
        response = self.client.patch(
            f'/api/cotizaciones/{self.cotizacion_a.id}/',
            {'observaciones': 'Actualizado'}
        )
        
        self.assertEqual(response.status_code, 200)
```

**Ejecutar tests**:

```cmd
cd backend
backend\ENV\Scripts\python.exe manage.py test cotizaciones.tests.test_permissions
```

---

## ⚡ Optimización

### Índices de Base de Datos

**Crear comando**: `backend/core/management/commands/optimize_guardian.py`

```python
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Optimiza índices de Django Guardian'
    
    def handle(self, *args, **kwargs):
        with connection.cursor() as cursor:
            # Índices para UserObjectPermission
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_user_perm_user_id 
                ON guardian_userobjectpermission(user_id)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_user_perm_content_type 
                ON guardian_userobjectpermission(content_type_id, object_pk)
            ''')
            
            # Índices para GroupObjectPermission
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_group_perm_group_id 
                ON guardian_groupobjectpermission(group_id)
            ''')
        
        self.stdout.write(self.style.SUCCESS('✅ Índices optimizados'))
```

### Optimizar Queries

```python
from guardian.shortcuts import get_objects_for_user

# Optimizar con select_related y prefetch_related
cotizaciones = get_objects_for_user(
    user,
    'cotizaciones.view_cotizacion',
    klass=Cotizacion.objects.select_related('empresa', 'usuario_creador')
                              .prefetch_related('items')
)
```

---

## ✅ Checklist de Implementación

### Fase 0: Preparación
- [ ] Instalar django-guardian
- [ ] Configurar settings.py
- [ ] Ejecutar migraciones
- [ ] Ejecutar POC exitosamente

### Fase 1: Configuración
- [ ] Definir permisos en modelos
- [ ] Crear guardian_utils.py
- [ ] Crear permissions.py
- [ ] Generar migraciones

### Fase 2: Migración ViewSets
- [ ] Migrar CotizacionViewSet
- [ ] Migrar OrdenDeTrabajoViewSet
- [ ] Migrar ContratoViewSet
- [ ] Tests de cada ViewSet

### Fase 3: Migración de Datos
- [ ] Ejecutar script de migración
- [ ] Validar permisos migrados
- [ ] Backup de BD antes de migración

### Fase 4: Frontend
- [ ] Agregar campo `permissions` a serializers
- [ ] Actualizar interfaces TypeScript
- [ ] Actualizar componentes de UI
- [ ] Tests de UI con permisos

### Fase 5: Producción
- [ ] Optimizar índices de Guardian
- [ ] Monitorear performance
- [ ] Documentar sistema de permisos
- [ ] Capacitar equipo

---

## 📚 Referencias

- [Django Guardian Docs](https://django-guardian.readthedocs.io/)
- [DRF Object Permissions](https://www.django-rest-framework.org/api-guide/permissions/#object-level-permissions)
- [Guardian Performance](https://django-guardian.readthedocs.io/en/stable/userguide/performance.html)

## Referencias Cruzadas

- [permisos-sistema.md](./permisos-sistema.md): Sistema actual y limitaciones
- [backend-instructions.md](./backend-instructions.md): Configuración de DRF
- [security.md](./security.md): JWT y validaciones
- [testing.md](./testing.md): Estrategias de tests

---

**Última actualización**: 2025-11-04
