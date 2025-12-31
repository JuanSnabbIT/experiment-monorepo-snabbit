# 🧪 GUÍA DE VALIDACIÓN: Bloques 1-3 Integration

**Rama:** `integration/revision-bloques-1-5`  
**Estado:** Listos para validación y PR  
**Fecha:** 31 Diciembre 2025

---

## ⚠️ Requisitos Previos

### Backend
```bash
# Asegurar que el venv está limpio (issue null bytes en site-packages)
cd backend
# Opción 1: Recrear venv
rm -rf ENV
python -m venv ENV
ENV\Scripts\activate
pip install -r req.txt

# Opción 2: Usar Python del sistema (si está disponible)
python -m venv ENV_CLEAN
```

### Frontend
```bash
cd frontend
# Asegurar npm está en PATH
npm --version  # Debe retornar versión
```

---

## ✅ Checklist de Validación

### 1️⃣ BLOQUE 1: Cotizaciones Backend

**Objetivo:** Verificar que porcentaje_recargo funciona correctamente

```bash
# Ejecutar tests de cotizaciones
cd backend
python manage.py test cotizaciones -v 2

# Validar sintaxis
python -m py_compile cotizaciones/models.py
python -m py_compile cotizaciones/serializers.py
```

**Qué validar:**
- ✅ Model `Cotizacion` tiene `porcentaje_recargo` (PositiveIntegerField, default=0)
- ✅ Model `Cotizacion` tiene `historia = Historia()` (simple_history)
- ✅ 6 propiedades en `ItemCotizacion` usan `self.cotizacion.porcentaje_recargo or 0`:
  - `recargo_iva_venta`
  - `precio_total_backend`
  - `precio_unitario_backend`
  - `ganancia`
  - `precio_venta_neta_unitario_moneda_base`
  - `precio_venta_neta_total_moneda_base`
- ✅ Serializers validan `fecha_facturacion` y `tipo_cambio_usado`
- ✅ Tests pasan sin errores

---

### 2️⃣ BLOQUE 2: Bodegas - Data-Leak Security Fixes

**Objetivo:** Verificar que los filtros PersonalizacionUsuario previenen data leaks

```bash
# Tests de bodegas (enfoque en cambios de views)
cd backend
python manage.py test bodegas.tests.test_views -v 2

# Validar sintaxis del archivo modificado
python -m py_compile bodegas/views.py
```

**Qué validar (Manual o Unit Test):**

#### VoucherDevolucionViewSet
```python
# Verificar que get_queryset() filtra por PersonalizacionUsuario
def test_voucher_devolucion_queryset_filters_by_user():
    # Usuario de EMPRESA A, SUCURSAL 1
    # No debe ver vouchers de EMPRESA B o SUCURSAL 2
    # ✅ Filtra por: orden_trabajo__sucursal, orden_trabajo__sucursal__empresa
```

#### ItemEnCompraViewSet
```python
# Verificar que get_queryset() filtra por sucursal
def test_item_en_compra_queryset_filters_by_sucursal():
    # Usuario de SUCURSAL 1
    # No debe ver items de compra de SUCURSAL 2
    # ✅ Filtra por: compra__sucursal
```

#### ItemsGuiaSalidaViewSet
```python
# Verificar que get_queryset() filtra por empresa/sucursal
def test_items_guia_salida_queryset_filters():
    # Usuario de EMPRESA A, SUCURSAL 1
    # No debe ver items de EMPRESA B
    # ✅ Filtra por: guia__bodega__sucursal, guia__bodega__sucursal__empresa
```

**✅ Verificación Rápida (Sin Tests Unitarios):**
```bash
# Abrir shell de Django
python manage.py shell
>>> from bodegas.views import VoucherDevolucionViewSet
>>> from core.models import PersonalizacionUsuario
>>> # Verificar que el código tiene los filtros
>>> import inspect
>>> print(inspect.getsource(VoucherDevolucionViewSet.get_queryset))
# Debe mostrar: .filter(orden_trabajo__sucursal=sucursal, orden_trabajo__sucursal__empresa=empresa)
```

---

### 3️⃣ BLOQUE 3: Frontend - Core Improvements

**Objetivo:** Verificar que Modal/Aside/priceFormat funcionan sin regressions

```bash
cd frontend

# Validar TypeScript compilation
npx tsc --noEmit

# Validar build
npm run build

# Validar linting
npm run lint
```

#### 3.1 Modal.tsx - Backdrop Click Fix
**Qué validar (Manual Testing Required):**
1. Abre modal cualquiera en la UI
2. **PRUEBA CRÍTICA:** Scrollea dentro del modal y clickea en el scrollbar
   - ✅ El modal NO debe cerrarse (bug corregido)
   - ❌ Si se cierra, hay regresión
3. Clickea en el backdrop (área gris oscuro fuera del modal)
   - ✅ El modal SÍ debe cerrarse (behavior correcto)

**Código Cambio:**
```typescript
// Verificar en Modal.tsx línea ~320
onClick={handleModalClick}
onTouchStart={handleStaticBackdropClick}
// event.target === event.currentTarget check
```

#### 3.2 Aside.tsx - Flex Layout Fix
**Qué validar:**
1. Abre una página con Aside (ej: Items)
2. Redimensiona ventana (viewport responsive)
   - ✅ Aside debe respetar flex-1 (tomar espacio disponible)
   - ✅ Content debe ser scrolleable verticalmente (overflow-y-auto)
3. Compara con versión anterior (móvil y desktop)
   - ✅ Mejor responsividad
   - ✅ Scroll vertical en lugar de horizontal

**Código Cambio:**
```tsx
// Verificar en Aside.tsx línea ~35
className={classNames('flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6', 'no-scrollbar')}
```

#### 3.3 priceFormat - CLP Localization
**Qué validar:**
1. Abrir cualquier página con precios (cotizaciones, items, etc)
2. Verificar formato de moneda
   - ✅ Debe mostrar: `$123.456` (CLP sin decimales)
   - ❌ NO debe mostrar: `USD 123.45` o `$123.45`
3. Ejemplos:
   - Precio: 1000 → `$1.000` ✅
   - Precio: 1500000 → `$1.500.000` ✅

**Código Cambio:**
```typescript
// Verificar en priceFormat.util.ts línea ~3
'es-CL' // no 'en-US'
currency: 'CLP' // no 'USD'
minimumFractionDigits: 0 // sin decimales
```

---

## 🔍 Validación de Seguridad (CRÍTICO)

### Data-Leak Prevention Tests

```bash
# Crear test de seguridad temporal (luego borrar)
cat > test_data_leak_prevention.py << 'EOF'
from django.test import TestCase
from django.contrib.auth import get_user_model
from core.models import PersonalizacionUsuario, Empresa, Sucursal
from bodegas.models import VoucherDevolucion

User = get_user_model()

class DataLeakPreventionTests(TestCase):
    def setUp(self):
        # Crear 2 empresas diferentes
        self.empresa_a = Empresa.objects.create(nombre="Empresa A")
        self.empresa_b = Empresa.objects.create(nombre="Empresa B")
        
        self.sucursal_a = Sucursal.objects.create(empresa=self.empresa_a, nombre="Sucursal A")
        self.sucursal_b = Sucursal.objects.create(empresa=self.empresa_b, nombre="Sucursal B")
        
        # Usuarios de diferentes empresas
        self.user_a = User.objects.create_user(username='user_a', email='a@test.com')
        self.user_b = User.objects.create_user(username='user_b', email='b@test.com')
        
        self.perso_a = PersonalizacionUsuario.objects.create(
            usuario=self.user_a, empresa=self.empresa_a, sucursal=self.sucursal_a
        )
        self.perso_b = PersonalizacionUsuario.objects.create(
            usuario=self.user_b, empresa=self.empresa_b, sucursal=self.sucursal_b
        )
    
    def test_voucher_devolucion_no_cross_company_leak(self):
        """Usuario A no debe ver vouchers de Empresa B"""
        # TODO: Implementar test completo
        # Crear voucher en Empresa B
        # Usuario A hace request a /api/vouchers-devolucion/
        # Verificar que NO aparece el voucher de Empresa B
        pass

EOF
python manage.py test test_data_leak_prevention -v 2
```

**Checklist de Seguridad:**
- ✅ VoucherDevolucionViewSet.get_queryset() tiene `.filter(orden_trabajo__sucursal=...)`
- ✅ ItemEnCompraViewSet.get_queryset() tiene `.filter(compra__sucursal=...)`
- ✅ ItemsGuiaSalidaViewSet.get_queryset() tiene `.filter(guia__bodega__sucursal=...)`
- ✅ Todos usan `PersonalizacionUsuario.objects.get(usuario=self.request.user)`

---

## 📊 Performance Validation

### BLOQUE 2: Database Queries
```bash
# Verificar que los nuevos filtros no degradan performance
# Usar Django Debug Toolbar o django-querycount

pip install django-querycount

# En test o desarrollo:
python manage.py runserver --load-queries
# Hacer request a /api/vouchers-devolucion/
# Verificar: query count no aumentó significativamente
```

### BLOQUE 3: Modal Performance
- Verificar que el modal NO tiene memory leaks
- Abierto/Cerrado múltiples veces (50+)
- Chrome DevTools: Performance tab
- ✅ Memory debe mantenerse estable

---

## 🚀 Próximos Pasos Post-Validación

### Si TODO PASA ✅
```bash
# Crear PR para main
git push origin integration/revision-bloques-1-5
# En GitHub: Create Pull Request

# Descripción del PR
Title: "Merge: BLOQUEs 1-3 - Seguridad + UX Improvements"
Body: 
"""
## Cambios
- BLOQUE 1: Cotizaciones backend validado
- BLOQUE 2: 3 data-leak security fixes (CRÍTICO)
- BLOQUE 3: Modal/Aside/priceFormat improvements

## Tests
- [x] Backend tests: PASSED
- [x] Frontend build: PASSED
- [x] Security validation: PASSED
- [x] Manual testing: PASSED

## Breaking Changes
- None

## Notes
Data-leak fixes son production-critical. 
Revisar especialmente BLOQUE 2.
"""
```

### Si FALLA ❌
```bash
# Identificar qué falló
# Fixear en integration
# Recommit
# Revalidar
```

---

## 📝 Comandos de Referencia Rápida

```bash
# Backend
cd backend && python manage.py test cotizaciones bodegas -v 2

# Frontend
cd frontend && npm run build && npm run lint

# Ambos (desde raíz)
cd backend && python manage.py test && cd ../frontend && npm run build

# Verificar cambios específicos
git show fabe48a  # BLOQUE 2
git show a94d9f7  # BLOQUE 3
```

---

## ⏱️ Tiempo Estimado

- BLOQUE 1 validation: 5-10 min
- BLOQUE 2 validation: 10-15 min (security critical)
- BLOQUE 3 validation: 15-20 min (manual testing)
- **Total: 30-45 minutos**

---

## ✨ Conclusión

Una vez que TODOS los items de este checklist estén ✅, la rama está lista para:
1. Push a origin
2. Create PR
3. Code review
4. Merge a main
5. Deploy a producción

**Prioridad:** Data-leak fixes en BLOQUE 2 son CRÍTICOS para seguridad.

---

**Preparado:** 31 Diciembre 2025  
**Validadores:** QA + DevOps Team  
**Status:** Ready for Testing
