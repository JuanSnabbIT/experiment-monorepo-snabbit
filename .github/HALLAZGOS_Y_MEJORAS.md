---
title: "Registro de Hallazgos y Mejoras Pendientes"
scope: "tracking"
status: "active"
last_updated: "2025-11-07"
---

# 🔍 Registro de Hallazgos y Mejoras Pendientes

## 🎯 Propósito

Este documento sirve como **cuaderno de bitácora** durante la exploración del sistema ERP. Aquí se registran:

- 🐛 **Bugs encontrados**: problemas que requieren corrección
- ⚠️ **Inconsistencias**: código que funciona pero podría mejorarse
- 💡 **Mejoras propuestas**: optimizaciones, refactorizaciones, nuevas features
- 📝 **Notas técnicas**: observaciones importantes sobre la arquitectura
- 🔄 **Cambios planificados**: modificaciones a realizar cuando se complete la exploración

**Filosofía**: Explorar primero, documentar hallazgos, planificar cambios, ejecutar después con visión completa.

---

## 📋 Índice de Hallazgos

### Por Prioridad
- [P0 - Crítico](#p0---crítico) (bloquea funcionalidad core)
- [P1 - Alto](#p1---alto) (afecta UX o seguridad)
- [P2 - Medio](#p2---medio) (mejora calidad del código)
- [P3 - Bajo](#p3---bajo) (nice-to-have, optimizaciones)

### Por Módulo
- [Empresas](#módulo-empresas)
- [Cotizaciones](#módulo-cotizaciones)
- [Contratos](#módulo-contratos)
- [Orden de Trabajo](#módulo-orden-de-trabajo)
- [Bodegas e Items](#módulo-bodegas-e-items)
- [Usuarios y Permisos](#módulo-usuarios-y-permisos)
- [Frontend General](#frontend-general)
- [Backend General](#backend-general)
- [Scripts y Utilidades](#scripts-y-utilidades)

### Por Tipo
- [🐛 Bugs](#bugs)
- [⚠️ Inconsistencias](#inconsistencias)
- [💡 Mejoras](#mejoras)
- [📝 Notas Técnicas](#notas-técnicas)

---

## 🐛 Bugs

### P0 - Crítico

#### BUG-001: Modal de envío de contrato no muestra feedback y permite duplicados
**Módulo**: Contratos  
**Descubierto en**: [MODULO_CONTRATOS_ENVIO_FIRMA.md](./MODULO_CONTRATOS_ENVIO_FIRMA.md)  
**Fecha**: 2025-11-07  
**Estado**: 🔴 CRÍTICO - En producción

**Descripción**:
Al presionar "Enviar" en el modal `CrearEnvioContratoFirmaUsuario`, el backend crea el objeto `EnvioContratoFirmaUsuario` correctamente, pero el frontend no muestra confirmación visual ni cierra el modal, permitiendo múltiples envíos duplicados.

**Impacto**:
- 🚨 **Creación masiva de envíos duplicados**: Usuario presiona botón múltiples veces
- 📧 **Spam de correos**: Cada envío duplicado dispara un email a través de Celery
- 🗄️ **Contaminación de DB**: Múltiples objetos `EnvioContratoFirmaUsuario` para el mismo usuario
- ❌ **Contrato nunca se activa**: Falta lógica para cambiar de `borrador` a `activo` cuando todos firman

**Causa raíz**:
1. **Falta validación de unicidad** en `EnvioContratoFirmaUsuarioViewSet.create()`: permite N envíos para el mismo usuario.
2. **Falta lógica de activación automática**: No hay signal ni endpoint que verifique si todos firmaron y cambie el estado del contrato.
3. **Posible problema de UX**: Modal podría no cerrarse por timing de `useEffect` recargando detalle del contrato.

**Solución propuesta**:
Ver roadmap completo en [MODULO_CONTRATOS_ENVIO_FIRMA.md](./MODULO_CONTRATOS_ENVIO_FIRMA.md#roadmap-de-corrección)

**Sprint 1 (Hotfixes - 1-2 días)**:
- ✅ Validar envío existente en `create()` antes de crear nuevo
- ✅ Agregar signal `post_save` para activar contrato cuando todos firman
- ✅ Mejorar feedback visual en frontend (toast + cierre explícito)

**Archivos afectados**:
- `backend/contratos/views.py` (líneas 545-579)
- `backend/contratos/signals.py` (agregar nuevo signal)
- `frontend/src/pages/Contratos/modals/CrearEnvioContratoFirmaUsuario.tsx`

**Tests necesarios**:
- [ ] Backend: test_no_permite_envios_duplicados
- [ ] Backend: test_activacion_automatica_con_todas_firmas
- [ ] Frontend: validar toast y cierre de modal tras envío exitoso

**Referencias**:
- Documentación técnica completa: [MODULO_CONTRATOS_ENVIO_FIRMA.md](./MODULO_CONTRATOS_ENVIO_FIRMA.md)
- Bugs relacionados: #BUG-004 (contrato nunca activo), #BUG-005 (feedback ambiguo)

---

#### BUG-002: Dashboard sin empresa asignada muestra pantalla en blanco
**Módulo**: Empresas  
**Descubierto en**: [EXPLORACION_EMPRESAS.md](./exploracion/empresas.md)  
**Fecha**: 2025-11-05  
**Estado**: 🔴 Pendiente

**Descripción**:
Cuando un usuario recién creado sin `PersonalizacionUsuario.empresa` accede al Dashboard, la UI no renderiza y no hay mensaje de error.

**Impacto**:
- Bloquea onboarding de nuevos usuarios
- No hay feedback visual para el usuario
- Requiere intervención manual vía Django Admin

**Causa raíz**:
`frontend/src/pages/Dashboard/DashboardPage.tsx` asume que `user.personalizacion.empresa` siempre existe:
```typescript
// Línea problemática
const empresaId = user.personalizacion.empresa.id; // undefined causa crash
```

**Solución propuesta**:
```typescript
// Opción 1: Mostrar mensaje guía
if (!user.personalizacion?.empresa) {
  return <EmptyState 
    message="No tienes empresa asignada" 
    action="Contacta al administrador o crea una nueva empresa"
  />;
}

// Opción 2: Redirigir a wizard de creación
if (!user.personalizacion?.empresa) {
  navigate('/empresas/crear');
}
```

**Archivos afectados**:
- `frontend/src/pages/Dashboard/DashboardPage.tsx`
- `frontend/src/store/slices/authSlice.ts` (validación en login)

**Tests necesarios**:
- [ ] Unit test: usuario sin empresa renderiza EmptyState
- [ ] E2E: flujo completo desde login hasta creación de empresa

**Referencias**:
- Ver [EXPLORACION_EMPRESAS.md Bug #2](./exploracion/empresas.md#bug-2-dashboard-sin-empresa-asignada)

---

#### BUG-003: Lista de invitaciones siempre vacía
**Módulo**: Empresas  
**Descubierto en**: [EXPLORACION_EMPRESAS.md](./exploracion/empresas.md)  
**Fecha**: 2025-11-05  
**Estado**: 🔴 Pendiente

**Descripción**:
Al crear `InvitacionEmpresa` desde frontend, el endpoint POST retorna 201 pero GET siempre retorna `[]`.

**Impacto**:
- Usuario no puede ver invitaciones enviadas
- No puede reenviar ni cancelar invitaciones

**Causa raíz sospechada**:
Posible filtro incorrecto en `cuentas/views.py` o problema de permisos en QuerySet.

**Para investigar**:
```cmd
REM Verificar si las invitaciones se crean en DB
backend\ENV\Scripts\python.exe backend\manage.py shell
>>> from cuentas.models import InvitacionEmpresa
>>> InvitacionEmpresa.objects.all()
```

**Solución propuesta**:
- Revisar `cuentas/views.py InvitacionEmpresaViewSet`
- Verificar `get_queryset()` y permisos aplicados
- Asegurar que filter por `empresa` usa el correcto lookup

**Archivos afectados**:
- `backend/cuentas/views.py`
- `backend/cuentas/serializers.py`
- `frontend/src/services/InvitacionService.ts`

**Tests necesarios**:
- [ ] Backend test: crear invitación y verificar que aparece en GET
- [ ] Frontend test: mock de lista con invitaciones

**Referencias**:
- Ver [EXPLORACION_EMPRESAS.md Bug #4](./exploracion/empresas.md#bug-4-lista-de-invitaciones-siempre-vacía)

---

### P1 - Alto

#### BUG-004: Permisos de grupo no se aplican automáticamente
**Módulo**: Usuarios y Permisos  
**Descubierto en**: Durante setup con `create_groups.py`  
**Fecha**: 2025-11-05  
**Estado**: 🟡 En investigación

**Descripción**:
Al asignar usuario a grupo "Administrador", los permisos del grupo no se reflejan inmediatamente en `user.has_perm()`.

**Impacto**:
- Flujo de onboarding requiere logout/login manual
- Confusión en usuarios nuevos

**Causa raíz sospechada**:
Django caché de permisos no se invalida tras `user.groups.add(group)`.

**Solución propuesta**:
Invalidar caché de permisos después de cambiar grupos:
```python
# En cuentas/views.py o signals
from django.contrib.auth.models import update_last_login
user.groups.add(group)
# Invalidar caché de permisos
if hasattr(user, '_perm_cache'):
    delattr(user, '_perm_cache')
if hasattr(user, '_user_perm_cache'):
    delattr(user, '_user_perm_cache')
```

**Archivos afectados**:
- `backend/cuentas/views.py`
- `backend/cuentas/signals.py` (si se usa signal para auto-asignar)

**Tests necesarios**:
- [ ] Test: verificar `has_perm()` inmediatamente después de `groups.add()`

**Referencias**:
- Django docs: [Permission caching](https://docs.djangoproject.com/en/5.1/topics/auth/default/#permission-caching)

---

### P2 - Medio

*(Espacio reservado para bugs de prioridad media)*

---

### P3 - Bajo

*(Espacio reservado para bugs de prioridad baja)*

---

## ⚠️ Inconsistencias

### P1 - Alto

#### INC-001: Uso inconsistente de UUID vs AutoField para IDs
**Módulo**: Backend General  
**Descubierto en**: Análisis de modelos en `instructions/backend/`  
**Fecha**: 2025-11-05  
**Estado**: 🟡 Documentado

**Descripción**:
Algunos modelos usan `UUIDField` como PK (Contrato, InvitacionEmpresa, Retroalimentacion), otros usan `AutoField` implícito (Empresa, Cotizacion, OrdenDeTrabajo con folio).

**Impacto**:
- Inconsistencia conceptual (¿cuándo usar UUID vs int?)
- URLs mixtas: `/api/contratos/<uuid>` vs `/api/empresas/<int>`
- Serialización diferente en frontend

**Justificación actual** (según docs):
- **UUID**: Para entidades compartibles públicamente sin exponer secuencia (contratos, invitaciones, feedback)
- **Int/AutoField**: Para entidades internas o con folio (empresas, OT, cotizaciones)

**Decisión recomendada**:
**MANTENER STATUS QUO** - La inconsistencia está justificada por casos de uso:
- UUID para seguridad/compartibilidad
- Int para facilidad de referencia humana (folio)

**Acción**:
Documentar claramente en `standards.md` cuándo usar cada tipo:

```markdown
## IDs: UUID vs AutoField

**Usar UUID cuando**:
- La entidad se comparte fuera del sistema (invitaciones, feedback)
- Se requiere no exponer secuencia/volumen (contratos)
- La entidad puede duplicarse en migraciones/merges

**Usar AutoField/Folio cuando**:
- La entidad tiene referencia humana (OT-12345, COT-001)
- No hay riesgo de seguridad en secuencia
- Se beneficia de sorting numérico simple
```

**Archivos afectados**:
- `backend/contratos/models.py` (UUID)
- `backend/cuentas/models.py` (UUID en InvitacionEmpresa)
- `backend/retroalimentacion/models.py` (UUID)
- `.github/instrucciones/standards.md` (documentar decisión)

**Tests necesarios**:
- N/A (decisión arquitectónica, no bug)

---

#### INC-002: Serializers con campos calculados no documentados
**Módulo**: Backend General  
**Descubierto en**: Revisión de serializers  
**Fecha**: 2025-11-07  
**Estado**: 🔴 Pendiente

**Descripción**:
Algunos `SerializerMethodField` no tienen docstring explicando qué calculan ni por qué.

**Ejemplo**:
```python
class CotizacionSerializer(serializers.ModelSerializer):
    total_con_iva = serializers.SerializerMethodField()  # ¿Qué hace?
    
    def get_total_con_iva(self, obj):
        # Lógica compleja sin comentarios
        return obj.total * (1 + obj.iva/100)
```

**Impacto**:
- Dificulta comprensión para nuevos desarrolladores
- No queda claro cuándo usar campos calculados vs properties del modelo

**Solución propuesta**:
Agregar docstrings a todos los `SerializerMethodField`:
```python
total_con_iva = serializers.SerializerMethodField()

def get_total_con_iva(self, obj):
    """
    Calcula el total de la cotización incluyendo IVA.
    
    Returns:
        Decimal: total bruto * (1 + IVA%)
    
    Example:
        Si total=1000 y IVA=19%, retorna 1190.00
    """
    return obj.total * (Decimal('1') + obj.iva / Decimal('100'))
```

**Archivos afectados**:
- Todos los serializers con `SerializerMethodField` (revisar app por app)

**Tests necesarios**:
- [ ] Lint rule para detectar SerializerMethodField sin docstring

---

### P2 - Medio

#### INC-003: Nombres de variables en español vs inglés
**Módulo**: Backend General  
**Descubierto en**: Revisión de código  
**Fecha**: 2025-11-07  
**Estado**: 🟡 Documentado

**Descripción**:
Mix de español e inglés en nombres de variables, campos de modelo, y métodos.

**Ejemplos**:
```python
# Modelo en español
class Empresa(models.Model):
    nombre = models.CharField(...)
    direccion = models.CharField(...)

# Método en inglés
def calculate_total(self):
    return self.total_items + self.impuestos
```

**Impacto**:
- Confusión para desarrolladores bilingües
- IDE autocomplete mezcla idiomas

**Decisión actual** (implícita):
- **Modelos y campos**: Español (dominio de negocio)
- **Métodos y funciones**: Inglés (convención Python)
- **UI/mensajes**: Español (usuario final chileno)

**Acción**:
Documentar formalmente en `standards.md`:

```markdown
## Convenciones de Idioma

**Español**:
- Nombres de modelos y campos (reflejan dominio de negocio chileno)
- Mensajes de error y validación (para usuarios finales)
- Documentación de negocio

**Inglés**:
- Nombres de funciones, métodos, variables locales (convención Python)
- Nombres de archivos y carpetas (convención proyecto)
- Comentarios técnicos de código
- Documentación técnica interna

**Justificación**: 
El dominio de negocio (ERP chileno) se expresa mejor en español.
La lógica técnica sigue convenciones internacionales Python.
```

**Archivos afectados**:
- `.github/instrucciones/standards.md`

**Tests necesarios**:
- N/A (decisión de convención)

---

### P3 - Bajo

*(Espacio reservado para inconsistencias de prioridad baja)*

---

## 💡 Mejoras

### P1 - Alto

#### MEJ-001: Implementar soft delete en modelos clave
**Módulo**: Backend General  
**Descubierto en**: Análisis de `ModeloBase` y `ModeloBaseHistorico`  
**Fecha**: 2025-11-07  
**Estado**: 🔴 Propuesta

**Descripción**:
Actualmente algunos modelos heredan de `ModeloBaseHistorico` (tracking de cambios) pero ninguno implementa soft delete (marcar como eliminado sin borrar).

**Motivación**:
- **Auditoría**: requisito legal de conservar registros (facturas, contratos)
- **Recuperación**: deshacer eliminaciones accidentales
- **Integridad referencial**: evitar cascadas de eliminación

**Modelos que se beneficiarían**:
- `Empresa`, `Cotizacion`, `ContratoEmpresaCliente`
- `OrdenDeTrabajo`, `Rendicion`, `VisitaSoporte`
- `ItemEmpresa`, `MovimientoBodega`

**Implementación propuesta**:
```python
# En core/models.py
class ModeloBaseSoftDelete(ModeloBase):
    """Base para modelos con soft delete."""
    eliminado = models.BooleanField(default=False, db_index=True)
    eliminado_en = models.DateTimeField(null=True, blank=True)
    eliminado_por = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='%(class)s_eliminados'
    )
    
    class Meta:
        abstract = True
    
    def delete(self, using=None, keep_parents=False):
        """Soft delete: marca como eliminado en lugar de borrar."""
        self.eliminado = True
        self.eliminado_en = timezone.now()
        self.save(using=using)
    
    def hard_delete(self):
        """Eliminación real de la base de datos."""
        super().delete()

# Manager personalizado para excluir eliminados por defecto
class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(eliminado=False)
```

**Uso**:
```python
class Empresa(ModeloBaseSoftDelete):
    nombre = models.CharField(...)
    
    objects = SoftDeleteManager()  # Excluye eliminados
    all_objects = models.Manager()  # Incluye eliminados

# API
empresa.delete()  # Soft delete
empresa.hard_delete()  # Eliminación real (solo admin)

# QuerySets
Empresa.objects.all()  # Solo activas
Empresa.all_objects.all()  # Incluye eliminadas
```

**Consideraciones**:
- **Migration grande**: agregar campos a muchos modelos
- **Performance**: índice en `eliminado` campo
- **Permisos**: solo superadmin puede `hard_delete()`
- **Signals**: actualizar signals que escuchan `post_delete`

**Archivos afectados**:
- `backend/core/models.py` (nueva clase base)
- Modelos en 15 apps (migrar a nueva base)
- ViewSets (agregar filtro opcional `?incluir_eliminados=true`)
- Signals que usan `post_delete`

**Tests necesarios**:
- [ ] Soft delete marca correctamente
- [ ] Manager excluye eliminados por defecto
- [ ] `all_objects` incluye eliminados
- [ ] Permisos de `hard_delete()` funcionan

**Referencia**:
- Django package: [django-safedelete](https://github.com/makinacorpus/django-safedelete)

---

#### MEJ-002: Centralizar validaciones de negocio
**Módulo**: Backend General  
**Descubierto en**: Análisis de serializers y models  
**Fecha**: 2025-11-07  
**Estado**: 🔴 Propuesta

**Descripción**:
Validaciones de negocio dispersas entre serializers, models, views y signals.

**Ejemplo problemático**:
```python
# Validación de stock en 3 lugares diferentes:

# 1. Serializer
class MovimientoBodegaSerializer:
    def validate(self, attrs):
        if attrs['tipo'] == 'SALIDA' and stock < cantidad:
            raise ValidationError("Stock insuficiente")

# 2. Signal
@receiver(pre_save, sender=MovimientoBodega)
def validar_stock(sender, instance, **kwargs):
    if instance.tipo == 'SALIDA' and stock < instance.cantidad:
        raise ValidationError("Stock insuficiente")

# 3. Método del modelo
class MovimientoBodega(models.Model):
    def clean(self):
        if self.tipo == 'SALIDA' and stock < self.cantidad:
            raise ValidationError("Stock insuficiente")
```

**Problema**:
- Duplicación de lógica
- Difícil de mantener
- Riesgo de inconsistencias

**Solución propuesta**:
Crear **validadores centralizados** por dominio:

```python
# backend/bodegas/validators.py
class MovimientoValidator:
    """Validaciones de negocio para movimientos de bodega."""
    
    @staticmethod
    def validar_stock_suficiente(bodega, item, cantidad):
        """
        Valida que hay stock suficiente para una salida.
        
        Raises:
            ValidationError: Si stock insuficiente
        """
        stock_actual = StockItemEnBodega.objects.get(
            bodega=bodega, item=item
        ).stock_actual
        
        if stock_actual < cantidad:
            raise ValidationError(
                f"Stock insuficiente. Disponible: {stock_actual}, "
                f"Solicitado: {cantidad}"
            )
    
    @staticmethod
    def validar_precio_positivo(precio):
        """Valida que el precio es mayor a 0."""
        if precio <= 0:
            raise ValidationError("El precio debe ser mayor a 0")

# Uso en modelo
class MovimientoBodega(models.Model):
    def clean(self):
        super().clean()
        if self.tipo == 'SALIDA':
            MovimientoValidator.validar_stock_suficiente(
                self.bodega, self.item, self.cantidad
            )
        MovimientoValidator.validar_precio_positivo(self.precio_unitario)

# Uso en serializer
class MovimientoBodegaSerializer:
    def validate(self, attrs):
        if attrs['tipo'] == 'SALIDA':
            MovimientoValidator.validar_stock_suficiente(
                attrs['bodega'], attrs['item'], attrs['cantidad']
            )
        return attrs
```

**Beneficios**:
- **DRY**: validación en un solo lugar
- **Testeable**: tests unitarios de validadores aislados
- **Documentado**: docstrings explican reglas de negocio
- **Reutilizable**: misma validación en API, admin, scripts

**Archivos afectados**:
- Crear `validators.py` en cada app de dominio
- Refactorizar serializers y modelos para usar validadores
- Actualizar tests para cubrir validadores

**Tests necesarios**:
- [ ] Tests unitarios para cada validador (happy path + edge cases)
- [ ] Tests de integración verifican que se usan en serializers/models

**Patrón a seguir**:
```python
# Estructura de validators.py
class <Dominio>Validator:
    """Validaciones de negocio para <Dominio>."""
    
    @staticmethod
    def validar_<regla>(parametros):
        """
        Descripción de la regla de negocio.
        
        Args:
            param1: Descripción
            param2: Descripción
        
        Raises:
            ValidationError: Cuándo y por qué
        
        Example:
            >>> Validator.validar_regla(valor)
        """
        if not cumple_regla:
            raise ValidationError("Mensaje claro y accionable")
```

---

### P2 - Medio

#### MEJ-003: Agregar índices de base de datos faltantes
**Módulo**: Backend General  
**Descubierto en**: Análisis de queries N+1  
**Fecha**: 2025-11-07  
**Estado**: 🟡 Propuesta

**Descripción**:
Algunas consultas frecuentes no tienen índices, causando performance degradado.

**Queries identificadas**:
```python
# 1. Filtrar OT por estado (muy frecuente)
OrdenDeTrabajo.objects.filter(estado='EN_PROCESO')  # Sin índice en 'estado'

# 2. Buscar items por empresa
ItemEmpresa.objects.filter(empresa_id=123)  # Sin índice compuesto

# 3. Movimientos por bodega + fecha
MovimientoBodega.objects.filter(
    bodega_id=1, 
    fecha_movimiento__gte='2025-01-01'
)  # Sin índice compuesto
```

**Índices propuestos**:
```python
# ordentrabajo/models.py
class OrdenDeTrabajo(models.Model):
    estado = models.CharField(...)
    
    class Meta:
        indexes = [
            models.Index(fields=['estado']),  # NUEVO
            models.Index(fields=['empresa', 'estado']),  # NUEVO (compuesto)
            models.Index(fields=['fecha_creacion']),  # NUEVO
        ]

# items/models.py
class ItemEmpresa(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['empresa', 'activo']),  # NUEVO
        ]

# bodegas/models.py
class MovimientoBodega(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['bodega', 'fecha_movimiento']),  # NUEVO
            models.Index(fields=['item', 'tipo']),  # NUEVO
        ]
```

**Análisis de impacto**:
- **Performance**: Mejora de 10-100x en queries frecuentes
- **Storage**: ~1-5% aumento en tamaño de DB
- **Write overhead**: Mínimo (~5-10%)

**Cómo identificar índices faltantes**:
```cmd
REM Habilitar query logging en settings.py
REM LOGGING = {'loggers': {'django.db.backends': {'level': 'DEBUG'}}}

REM Ejecutar test suite y analizar queries lentas
backend\ENV\Scripts\python.exe backend\manage.py test --debug-sql

REM Usar Django Debug Toolbar en desarrollo
```

**Archivos afectados**:
- Modelos en apps: ordentrabajo, bodegas, items, cotizaciones
- Nueva migración para agregar índices

**Tests necesarios**:
- [ ] Benchmark antes/después de índices
- [ ] Verificar que índices se crean correctamente

**Referencias**:
- [Django indexes docs](https://docs.djangoproject.com/en/5.1/ref/models/indexes/)
- [Database indexing best practices](https://www.postgresql.org/docs/current/indexes.html)

---

### P3 - Bajo

#### MEJ-004: Agregar typing completo en frontend
**Módulo**: Frontend General  
**Descubierto en**: Revisión de código TypeScript  
**Fecha**: 2025-11-07  
**Estado**: 🔴 Propuesta

**Descripción**:
Algunos archivos TypeScript usan `any` o typing incompleto.

**Ejemplos**:
```typescript
// services/BaseService.ts
export const fetchData = (endpoint: string): Promise<any> => {  // ❌ any
  // ...
}

// components/Table.tsx
interface TableProps {
  data: any[];  // ❌ any
  columns: any[];  // ❌ any
}
```

**Solución propuesta**:
```typescript
// types/api.types.ts (nuevo archivo)
export interface ApiResponse<T> {
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// services/BaseService.ts
export const fetchData = <T>(endpoint: string): Promise<ApiResponse<T>> => {
  // ...
}

// components/Table.tsx
interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
}
```

**Beneficios**:
- **Type safety**: errores detectados en compile-time
- **IntelliSense**: mejor autocompletado en IDE
- **Documentación**: tipos sirven como documentación viva
- **Refactoring**: cambios más seguros

**Plan de implementación**:
1. Habilitar `strict: true` en `tsconfig.json`
2. Crear `frontend/src/types/` con interfaces compartidas
3. Migrar archivo por archivo (empezar con servicios)
4. Agregar lint rule para prohibir `any` explícito

**Archivos afectados**:
- `tsconfig.json`
- `frontend/src/services/` (todos los servicios)
- `frontend/src/components/` (componentes genéricos)
- `frontend/src/store/` (Redux types)

**Tests necesarios**:
- [ ] Verificar que no hay errores de TypeScript en build
- [ ] Lint check sin warnings de `any`

---

## 📝 Notas Técnicas

### NOT-001: Contratos y OT no tienen relación FK directa
**Módulo**: Contratos + OrdenTrabajo  
**Descubierto en**: [ANALISIS_CONTRATOS_OT_CICLO_NEGOCIO.md](./ANALISIS_CONTRATOS_OT_CICLO_NEGOCIO.md)  
**Fecha**: 2025-11-07  
**Prioridad**: 🟡 ALTA (para meta final del proyecto)

**Descripción**:
`ContratoEmpresaCliente` y `OrdenDeTrabajo` **NO tienen ForeignKey** entre ellos. La relación es indirecta mediante el par empresa-cliente, lo que impide:
- Validar que una OT esté cubierta por un contrato activo
- Descontar servicios consumidos del contrato
- Rastrear qué OTs corresponden a qué contrato

**Impacto en meta final**:
Para implementar el sistema de comunicación formal de gastos extras al cliente, necesitamos vincular OT → Contrato para:
1. Determinar qué contrato cubre la OT
2. Validar que el trabajo ejecutado corresponde a servicios contratados
3. Facilitar facturación agrupada por contrato

**Solución propuesta**:
```python
# En ordentrabajo/models.py
class OrdenDeTrabajo(ModeloBaseHistorico):
    # ... campos existentes ...
    
    contrato = models.ForeignKey(
        'contratos.ContratoEmpresaCliente',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordenes_trabajo',
        help_text="Contrato bajo el cual se ejecuta esta OT"
    )
```

**Referencias**:
- Análisis completo: [ANALISIS_CONTRATOS_OT_CICLO_NEGOCIO.md](./ANALISIS_CONTRATOS_OT_CICLO_NEGOCIO.md)
- Roadmap de implementación: Ver Fase 2 del documento

---

### NOT-002: Sistema de envío de correos completamente funcional
**Módulo**: Core (tasks.py)  
**Descubierto en**: [ANALISIS_CONTRATOS_OT_CICLO_NEGOCIO.md](./ANALISIS_CONTRATOS_OT_CICLO_NEGOCIO.md)  
**Fecha**: 2025-11-07  
**Estado**: ✅ CONFIRMADO FUNCIONAL

**Descripción**:
El sistema de correos con Celery está **completamente implementado** y listo para usar:
- Tarea Celery: `core/tasks.py::send_email_task()`
- Template HTML responsive con header, footer, botón CTA
- Soporte para adjuntos PDF
- Variables dinámicas (titulo, html_body, url_boton, text_boton)

**Uso confirmado en**:
1. `contratos/views.py` - Envío de firma de contratos
2. Puede reutilizarse para:
   - Aprobación de gastos extras (meta final)
   - Notificaciones de OT
   - Rendiciones aprobadas
   - Cualquier email transaccional

**Configuración requerida**:
- Variables de entorno: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
- Celery worker activo: `celery -A sw_erp worker --loglevel=info`
- Broker (Redis/RabbitMQ) corriendo

**Referencias**:
- Ver sección "¿El envío de correos está implementado?" en [ANALISIS_CONTRATOS_OT_CICLO_NEGOCIO.md](./ANALISIS_CONTRATOS_OT_CICLO_NEGOCIO.md)

---

### NOT-003: Flujo de aprobación de gastos extras NO existe
**Módulo**: OrdenTrabajo + Rendiciones  
**Descubierto en**: [ANALISIS_CONTRATOS_OT_CICLO_NEGOCIO.md](./ANALISIS_CONTRATOS_OT_CICLO_NEGOCIO.md)  
**Fecha**: 2025-11-07  
**Prioridad**: 🔴 CRÍTICA (meta final del proyecto)

**Descripción**:
El sistema registra gastos extras en `DetalleGastoRendicionOT` y genera PDF de rendición interna, **PERO**:
- ❌ NO se comunica al cliente
- ❌ NO hay flujo de aprobación formal
- ❌ Cliente no puede aprobar/rechazar gastos
- ❌ No se valida aprobación antes de facturar

**Meta final del proyecto**:
*"La empresa necesita un método formal para informar a sus clientes de los gastos extras que se generan en los trabajos hechos"*

**Solución propuesta (completa en documento)**:
1. Crear modelo `AprobacionGastosOT` con UUID para link público
2. Endpoint `solicitar-aprobacion/` que genera PDF y envía correo
3. Página pública `/aprobar-gastos-ot/{uuid}` para cliente
4. Validación en endpoint `facturar/` que requiere aprobación

**Esfuerzo estimado**: 10-15 días (ver Fase 3 en documento)

**Referencias**:
- Análisis completo: [ANALISIS_CONTRATOS_OT_CICLO_NEGOCIO.md](./ANALISIS_CONTRATOS_OT_CICLO_NEGOCIO.md) - Sección "Gaps de Implementación"
- Roadmap detallado: Fase 3 del documento

---

## 📝 Notas Técnicas

### Arquitectura

#### NOTA-001: Patrón XOR en RecursoOT e ItemOT
**Módulo**: Orden de Trabajo  
**Fecha**: 2025-11-05

**Observación**:
Los modelos `RecursoOT` e `ItemOT` implementan **XOR constraint** (exactamente uno de múltiples campos debe estar lleno).

**RecursoOT**: `item_usado` XOR `equipo_usado` XOR `software_usado`
**ItemOT**: `item` XOR `item_bodega` XOR `equipo`

**Implementación**:
- Constraint a nivel de base de datos (CheckConstraint)
- Validación en `clean()` del modelo
- Validación en serializer

**Lección**:
Este patrón es útil para polimorfismo limitado sin GenericForeignKey. Considerar reutilizar en futuros modelos con relaciones "uno-de-varios".

**Referencia**:
Ver [MODELO_NEGOCIO.md - XOR Constraint](./MODELO_NEGOCIO.md#xor-constraint-en-itemot)

---

#### NOTA-002: GenericForeignKey para flexibilidad
**Módulo**: Backend General  
**Fecha**: 2025-11-05

**Observación**:
6 modelos usan `GenericForeignKey` para relaciones polimórficas:
1. `Software` (instalado_en: Equipo o Usuario)
2. `DetalleTrabajo` (recurso_afectado: cualquier modelo)
3. `AcuerdoConfidencialidad` (firmante)
4. `ItemRendicion` (recurso_rendido)
5. `Retroalimentacion` (objeto: OT, Visita, etc.)
6. `LicenciaContrato` (licencia_de: Cotizacion o Contrato)

**Trade-offs**:
✅ **Pros**: Flexibilidad máxima, evita múltiples FKs opcionales  
❌ **Cons**: No hay integridad referencial a nivel de DB, queries más complejas

**Best practice identificada**:
- Usar GenericFK cuando la lista de tipos relacionados es amplia o variable
- Usar XOR constraint cuando la lista es fija y pequeña (2-3 opciones)

**Referencia**:
- Django docs: [GenericForeignKey](https://docs.djangoproject.com/en/5.1/ref/contrib/contenttypes/#generic-relations)
- Ver documentos backend en `.github/instrucciones/backend/`

---

#### NOTA-003: Uso de signals para auto-creación
**Módulo**: Recursos  
**Fecha**: 2025-11-05

**Observación**:
Signal `post_save` en `CompraItem` auto-crea `Equipo` cuando el item es serializado:

```python
@receiver(post_save, sender=CompraItem)
def crear_equipo_si_serializado(sender, instance, created, **kwargs):
    if created and instance.item.tipo == 'SERIALIZADO':
        Equipo.objects.create(
            item=instance.item,
            numero_serie=instance.numero_serie,
            # ...
        )
```

**Ventaja**:
- DRY: auto-creación sin duplicar lógica en views
- Garantiza consistencia (serializado siempre → equipo)

**Riesgo**:
- Side effects ocultos (difícil de rastrear)
- Performance (N signals en bulk create)

**Recomendación**:
- Documentar signals claramente en docstrings
- Considerar bulk operations: usar `bulk_create` con `ignore_conflicts=True`
- Agregar tests explícitos de signals

**Referencia**:
Ver [instructions/backend/recursos-*.md](./instrucciones/backend/ordentrabajo-recursos-rendiciones-visitas.md#signals-en-recursos)

---

### Performance

#### NOTA-004: N+1 queries en serializers anidados
**Módulo**: Backend General  
**Fecha**: 2025-11-07

**Observación**:
Serializers con relaciones anidadas causan N+1 queries:

```python
class OrdenDeTrabajoSerializer(serializers.ModelSerializer):
    trabajos = DetalleTrabajoSerializer(many=True, read_only=True)  # ❌ N+1
    recursos = RecursoOTSerializer(many=True, read_only=True)  # ❌ N+1
```

**Impacto**:
Para 100 OT con 10 trabajos cada una:
- Sin prefetch: 1 + 100 + 1000 = **1101 queries**
- Con prefetch: 3 queries (OT + trabajos + recursos)

**Solución**:
```python
# ordentrabajo/views.py
class OrdenDeTrabajoViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return OrdenDeTrabajo.objects.prefetch_related(
            'trabajos',
            'recursos__item_usado',
            'recursos__equipo_usado',
            'items',
        ).select_related('empresa', 'contrato')
```

**Herramienta para detectar**:
```python
# settings.py (dev)
INSTALLED_APPS += ['django_extensions']

# manage.py shell_plus --print-sql
>>> ots = OrdenDeTrabajo.objects.all()[:10]
>>> for ot in ots:
...     print(ot.trabajos.all())  # Ver queries ejecutadas
```

**Referencia**:
- [Django select_related/prefetch_related](https://docs.djangoproject.com/en/5.1/ref/models/querysets/#prefetch-related)
- Ver [instructions/performance.md](./instrucciones/performance.md)

---

### Seguridad

#### NOTA-005: JWT lifetimes configurables
**Módulo**: Autenticación  
**Fecha**: 2025-11-07

**Observación**:
Tokens JWT tienen lifetimes configurables en `settings.py`:

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=5),   # Configurable
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=10),  # Configurable
}
```

**Balance de seguridad**:
- **Access corto**: Más seguro (ventana de ataque pequeña), más requests de refresh
- **Access largo**: Mejor UX (menos refreshes), más riesgo si token robado

**Configuración actual**: 5h access / 10h refresh (razonable para app interna)

**Recomendación para producción**:
```python
# Producción (más seguro)
'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
'REFRESH_TOKEN_LIFETIME': timedelta(days=1),

# Desarrollo (más conveniente)
'ACCESS_TOKEN_LIFETIME': timedelta(hours=5),
'REFRESH_TOKEN_LIFETIME': timedelta(hours=10),
```

**Referencia**:
- Ver [instructions/security.md](./instrucciones/security.md#jwt-configuration)

---

## 🔄 Cambios Planificados

### Para Después de Completar Exploración

#### CAMBIO-001: Refactorizar Dashboard sin empresa
**Relacionado**: BUG-001  
**Prioridad**: P0  
**Estimación**: 2 horas  

**Tareas**:
- [ ] Implementar EmptyState component
- [ ] Actualizar DashboardPage con validación
- [ ] Agregar tests (unit + E2E)
- [ ] Actualizar documentación de onboarding

---

#### CAMBIO-002: Investigar y corregir lista de invitaciones
**Relacionado**: BUG-002  
**Prioridad**: P0  
**Estimación**: 3 horas  

**Tareas**:
- [ ] Reproducir bug con debugging de DB
- [ ] Identificar causa raíz en ViewSet
- [ ] Corregir filtro/permisos
- [ ] Agregar tests backend
- [ ] Verificar en frontend

---

#### CAMBIO-003: Implementar soft delete
**Relacionado**: MEJ-001  
**Prioridad**: P1  
**Estimación**: 8 horas  

**Tareas**:
- [ ] Crear `ModeloBaseSoftDelete` en core
- [ ] Crear `SoftDeleteManager`
- [ ] Migrar 10 modelos críticos
- [ ] Actualizar ViewSets con filtro opcional
- [ ] Agregar tests completos
- [ ] Documentar en standards.md

---

#### CAMBIO-004: Centralizar validaciones de negocio
**Relacionado**: MEJ-002  
**Prioridad**: P1  
**Estimación**: 12 horas (por dominio)  

**Tareas por dominio** (bodegas, cotizaciones, contratos, ordentrabajo):
- [ ] Crear `<dominio>/validators.py`
- [ ] Identificar validaciones duplicadas
- [ ] Extraer a validadores centralizados
- [ ] Refactorizar modelos y serializers
- [ ] Agregar tests unitarios de validadores
- [ ] Documentar en código y docs

---

#### CAMBIO-005: Agregar índices de base de datos
**Relacionado**: MEJ-003  
**Prioridad**: P2  
**Estimación**: 4 horas  

**Tareas**:
- [ ] Analizar queries lentas con Django Debug Toolbar
- [ ] Identificar índices faltantes
- [ ] Crear migraciones con índices
- [ ] Ejecutar benchmarks antes/después
- [ ] Documentar decisiones en comments de modelos

---

### Para Futuras Mejoras (Backlog)

- [ ] CAMBIO-006: Typing completo en frontend (MEJ-004) - P3, 16 horas
- [ ] CAMBIO-007: Implementar caché de queries frecuentes - P2, 6 horas
- [ ] CAMBIO-008: Agregar rate limiting a API - P1, 4 horas
- [ ] CAMBIO-009: Documentar todos SerializerMethodField - P2, 4 horas
- [ ] CAMBIO-010: Crear design system component library - P3, 40 horas

---

## 📊 Estadísticas

### Por Prioridad
- **P0 (Crítico)**: 2 bugs
- **P1 (Alto)**: 1 bug, 2 inconsistencias, 2 mejoras
- **P2 (Medio)**: 2 inconsistencias, 2 mejoras
- **P3 (Bajo)**: 1 inconsistencia, 1 mejora

### Por Tipo
- **🐛 Bugs**: 3 total (2 P0, 1 P1)
- **⚠️ Inconsistencias**: 5 total (2 P1, 2 P2, 1 P3)
- **💡 Mejoras**: 5 total (2 P1, 2 P2, 1 P3)
- **📝 Notas Técnicas**: 5 observaciones arquitectónicas

### Por Módulo
- Empresas: 2 bugs
- Usuarios y Permisos: 1 bug
- Backend General: 5 inconsistencias, 3 mejoras, 4 notas
- Frontend General: 1 mejora
- Orden de Trabajo: 1 nota

### Estado de Cambios Planificados
- **Pendientes**: 5 cambios principales
- **Backlog**: 5 mejoras futuras
- **Estimación total**: ~55 horas de trabajo

---

## 🔄 Mantenimiento de Este Documento

### Cuándo Actualizar

**Durante exploración**:
- Al encontrar bug → agregar entrada en [Bugs](#bugs)
- Al identificar inconsistencia → agregar en [Inconsistencias](#inconsistencias)
- Al pensar mejora → agregar en [Mejoras](#mejoras)
- Al observar patrón interesante → agregar en [Notas Técnicas](#notas-técnicas)

**Antes de implementar cambios**:
- Mover hallazgo a [Cambios Planificados](#cambios-planificados)
- Crear tasks detalladas
- Estimar esfuerzo

**Después de implementar**:
- Marcar cambio como completado
- Agregar referencia a commit/PR
- Actualizar estadísticas

### Formato de Entrada

**Bug**:
```markdown
#### BUG-XXX: Título descriptivo
**Módulo**: <nombre>
**Descubierto en**: [doc.md](./doc.md) o "Durante exploración"
**Fecha**: YYYY-MM-DD
**Estado**: 🔴 Pendiente | 🟡 En investigación | 🟢 Resuelto

**Descripción**: Qué está mal
**Impacto**: Consecuencias
**Causa raíz**: Por qué pasa (si se sabe)
**Solución propuesta**: Cómo arreglarlo
**Archivos afectados**: Lista
**Tests necesarios**: Checklist
**Referencias**: Enlaces
```

**Mejora**:
```markdown
#### MEJ-XXX: Título descriptivo
**Módulo**: <nombre>
**Descubierto en**: Análisis de...
**Fecha**: YYYY-MM-DD
**Estado**: 🔴 Propuesta | 🟡 Aprobada | 🟢 Implementada

**Descripción**: Qué mejorar
**Motivación**: Por qué es importante
**Implementación propuesta**: Cómo hacerlo (con código)
**Beneficios**: Qué se gana
**Archivos afectados**: Lista
**Tests necesarios**: Checklist
```

**Nota Técnica**:
```markdown
#### NOTA-XXX: Título descriptivo
**Módulo**: <nombre>
**Fecha**: YYYY-MM-DD

**Observación**: Qué se descubrió
**Trade-offs**: Pros y cons (si aplica)
**Recomendación**: Qué hacer con esta info
**Referencia**: Enlaces relacionados
```

---

## 📚 Referencias

- **Documentación de exploración**: [EXPLORACION_EMPRESAS.md](./exploracion/empresas.md), [EXPLORACION_ORDENTRABAJO.md](./EXPLORACION_ORDENTRABAJO.md)
- **Arquitectura**: [ARQUITECTURA_SISTEMA.md](./arquitectura/sistema.md), [ARQUITECTURA_FRONTEND.md](./arquitectura/frontend.md)
- **Instrucciones técnicas**: [.github/instructions/](./instrucciones/)
- **Estado de documentación**: [ESTADO_DOCUMENTACION.md](./ESTADO_DOCUMENTACION.md)

---

**Última actualización**: 2025-11-07  
**Mantenido por**: Fabian (durante exploración)  
**Próxima revisión**: Al completar exploración completa del sistema
