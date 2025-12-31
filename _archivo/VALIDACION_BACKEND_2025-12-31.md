# Validación Backend - Bloques 2-5
**Fecha:** 2025-12-31  
**Branch:** integration/revision-bloques-1-5  
**Objetivo:** Validar código backend contra checklist de convenciones

---

## ❌ VIOLACIONES CRÍTICAS (Data Leak Risk)

### 1. ViewSets sin filtrado por PersonalizacionUsuario

**backend/bodegas/views.py:**
```python
class OrdenCompraViewSet(viewsets.ModelViewSet):
    queryset = OrdenCompra.objects.all()  # ❌ RETORNA TODAS las órdenes
    # FALTA: get_queryset() con filtro por empresa/sucursal
    
class GuiaSalidaViewSet(viewsets.ModelViewSet):
    queryset = GuiaSalida.objects.all()  # ❌ RETORNA TODAS las guías
    # FALTA: get_queryset() con filtro por empresa/sucursal
```

**backend/items/views.py:**
```python
class ItemEmpresaViewset(viewsets.ModelViewSet):
    def get_queryset(self):
        empresa_pk = self.kwargs.get("empresa_pk")  # ❌ Confía en URL
        queryset = ItemEmpresa.objects.all()
        if empresa_pk:
            queryset = queryset.filter(empresa_id=empresa_pk)
        # FALTA: Validar que usuario tenga acceso a esa empresa
```

**backend/ordentrabajov2/views.py:**
```python
class OrdenDeTrabajoViewSet(BaseWriteViewSet):
    def get_queryset(self):
        qs = super().get_queryset()  # ❌ Obtiene TODAS las órdenes
        if empresa:
            qs = qs.filter(empresa_id=empresa)  # ❌ Confía en query param
        # FALTA: Validar PersonalizacionUsuario → sucursal_principal
```

**Riesgo:** Usuarios pueden acceder a datos de otras empresas manipulando URLs/parámetros.

**Solución requerida:**
```python
def get_queryset(self):
    user = self.request.user
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    if not personalizacion or not personalizacion.sucursal_principal:
        return self.queryset.none()
    empresa = personalizacion.sucursal_principal.empresa
    return self.queryset.filter(empresa=empresa)  # o campo equivalente
```

---

## ❌ VIOLACIONES DE FORMATO

### 2. Errores con key "error" en lugar de "detail"

**backend/bodegas/views.py - OrdenCompraViewSet:**
- Línea 583: `{"error": "Se requiere item, cantidad y precio"}`
- Línea 606: `{"error": "Orden de compra no encontrada"}`
- Línea 612: `{"error": str(e)}`

**backend/items/views.py - ProveedorEmpresaViewSet:**
- Línea 93: `{"error": "Debe proporcionar un 'item_id'..."}`
- Línea 107: `{"error": "Debe proporcionar un 'item_id'..."}`
- Línea 115: `{"error": "Item no encontrado."}`
- Línea 136: `{"error": "Debe proporcionar un 'item_id'..."}`
- Línea 144: `{"error": "Item no encontrado."}`
- Línea 148: `{"error": "El item no está asociado a este proveedor."}`

**Corrección:** Todos deben usar `{"detail": "mensaje"}` según convención DRF.

---

### 3. URL paths con guiones bajos

**backend/items/views.py:**
- Línea 124: `url_path="desasociar_item"` → debe ser `"desasociar-item"`

**Convención:** Siempre kebab-case en URL paths: `@action(url_path="nombre-accion")`

---

## ⚠️ CODE SMELLS

### 4. Lógica pesada en views (debe ir a functions.py)

**backend/bodegas/views.py:**
- `crear_toma_inventario` (~70 líneas)
- `completar_orden_compra` (~100 líneas)
- `aprobar_guia` (~80 líneas)
- `comprobar_guia` (~70 líneas)
- `devolver_a_bodega` (~80 líneas)

**Regla:** Métodos en views deben tener < 50 líneas. Lógica compleja debe ir a `functions.py`.

---

## ✅ VALIDACIONES CORRECTAS

### backend/bodegas/views.py:
- ✅ `BodegaViewSet.get_queryset()` filtra por PersonalizacionUsuario
- ✅ `TomaInventarioViewSet` usa `transaction.atomic()`
- ✅ URLs en kebab-case: `url_path="buscar-por-toma-y-codigo"`
- ✅ Mayoría de errores usan `{"detail": "..."}`

---

## 📊 RESUMEN

| Archivo | ViewSets | ❌ Sin filtro | ❌ Key error | ❌ URL format | ⚠️ Logic >50L |
|---------|----------|--------------|--------------|---------------|--------------|
| bodegas/views.py | 8 | 2 | 7 | 0 | 5 |
| items/views.py | 4 | 1 | 6 | 1 | 0 |
| ordentrabajov2/views.py | 9 | 1 | 0 | 0 | ? |
| **TOTAL** | **21** | **4** | **13** | **1** | **5+** |

---

## 🔴 PRIORIDADES

1. **CRÍTICO**: Implementar `get_queryset()` con PersonalizacionUsuario en 4 viewsets
2. **ALTO**: Corregir 13 casos de `{"error":...}` → `{"detail":...}`
3. **MEDIO**: Cambiar URL path `desasociar_item` → `desasociar-item`
4. **BAJO**: Refactorizar métodos >50 líneas a `functions.py`

---

---

## ✅ ARCHIVOS ADICIONALES VALIDADOS

### backend/cotizaciones/views.py
- ❌ **4 errores** con key `"error"` (líneas 536, 543, 551, 555)
- ✅ ViewSet principal filtra por PersonalizacionUsuario
- ✅ URLs en kebab-case

### backend/contratos/views.py
- ❌ **5 errores** con key `"error"` (líneas 291, 297, 312, 320, 327)
- ⚠️ `ContratoEmpresaClienteViewSet.get_queryset()` NO valida usuario (línea 61-63)
- ✅ 7 ViewSets adicionales tienen `get_queryset()`

### backend/rendiciones/views.py
- ✅ Sin errores con key "error"
- ✅ ViewSets filtran por PersonalizacionUsuario
- ✅ URLs en kebab-case

### backend/visitas/views.py
- ✅ 1 error comentado (no cuenta)
- ✅ Sin violaciones activas

### backend/calendario/views.py
- ✅ Sin errores con key "error"
- ✅ Sin violaciones detectadas

### backend/vacaciones/views.py
- ✅ Sin errores con key "error"
- ✅ Sin violaciones detectadas

---

## 📊 RESUMEN ACTUALIZADO

| Archivo | ViewSets | ❌ Sin filtro | ❌ Key error | ❌ URL format | ⚠️ Logic >50L |
|---------|----------|--------------|--------------|---------------|--------------|
| bodegas/views.py | 8 | 2 | 7 | 0 | 5 |
| items/views.py | 4 | 1 | 6 | 1 | 0 |
| ordentrabajov2/views.py | 9 | 1 | 0 | 0 | ? |
| cotizaciones/views.py | 4 | 0 | 4 | 0 | 0 |
| contratos/views.py | 8 | 1 | 5 | 0 | 0 |
| rendiciones/views.py | 4 | 0 | 0 | 0 | 0 |
| visitas/views.py | ? | 0 | 0 | 0 | 0 |
| calendario/views.py | ? | 0 | 0 | 0 | 0 |
| vacaciones/views.py | ? | 0 | 0 | 0 | 0 |
| **TOTAL** | **37+** | **5** | **22** | **1** | **5+** |

---

## 🔴 PRIORIDADES ACTUALIZADAS

1. **CRÍTICO**: Implementar `get_queryset()` con PersonalizacionUsuario en **5 viewsets**:
   - OrdenCompraViewSet (bodegas)
   - GuiaSalidaViewSet (bodegas)
   - ItemEmpresaViewset (items)
   - OrdenDeTrabajoViewSet (ordentrabajov2)
   - ContratoEmpresaClienteViewSet (contratos)

2. **ALTO**: Corregir **22 casos** de `{"error":...}` → `{"detail":...}`

3. **MEDIO**: Cambiar URL path `desasociar_item` → `desasociar-item`

4. **BAJO**: Refactorizar métodos >50 líneas a `functions.py`

---

## 📈 ESTADÍSTICAS BACKEND

### Diferencias Integration vs Recovery:
- **15 archivos backend** modificados
- **38 insertions, 670 deletions** (recovery tiene más código)
- Archivos clave: models.py, views.py, serializers.py, functions.py

### Archivos críticos pendientes:
- Comparar recovery vs integration en archivos con diferencias
- Decidir si aplicar formato desde recovery
- Validar que no falten funciones/métodos importantes

---

## 📋 ANÁLISIS FRONTEND

### Diferencias Integration vs Recovery:
- **42 archivos frontend** modificados
- **978 insertions, 2482 deletions** (recovery tiene ~1500 líneas más)
- Diferencias son **principalmente de formato**:
  - Recovery: comillas simples `'`
  - Integration: comillas dobles `"`
  - Ordenamiento de imports diferente

### Archivos con más diferencias (formato):
1. `TablaMovimientosStockEnItem.tsx`: -288 líneas (recovery más completo)
2. `ListaProveedoresEmpresa.tsx`: -237 líneas
3. `GraficoMovimientosStockEnItem.tsx`: -207 líneas

### 6 archivos que existen SOLO en recovery (candidatos a traer):

**Utils:**
- `frontend/src/utils/currency.ts` - Formateo de moneda
- `frontend/src/utils/downloadHelpers.ts` - Helpers de descarga
- `frontend/src/utils/sweetAlert.ts` - Configuración SweetAlert2

**Páginas:**
- `frontend/src/pages/Bodegas/Devoluciones/DetalleVoucherDevolucion.tsx`
- `frontend/src/pages/Bodegas/Devoluciones/ListaVouchersDevolucion.tsx`
- `frontend/src/pages/Cotizaciones/modals/CopiasCotizacion.tsx`

**Evaluación:**
- **utils:** Probablemente necesarios si otros componentes los importan
- **Devoluciones:** Parte funcional del sistema (Bloque 2 - Compras)
- **CopiasCotizacion:** Modal de duplicado de cotizaciones (Bloque 1)

---

## 🎯 DECISIONES REQUERIDAS

### 1. Backend: Corregir violaciones críticas
**Acción:** Crear branch `fix/backend-security-conventions` desde integration
- Implementar `get_queryset()` en 5 viewsets
- Corregir 22 casos `"error"` → `"detail"`
- Cambiar URL `desasociar_item` → `desasociar-item`

### 2. Frontend: Traer archivos faltantes desde recovery
**Acción:** Evaluar y traer 6 archivos frontend que faltan
- Verificar si utils se usan en otros componentes
- Decidir si Devoluciones es funcional o WIP
- Confirmar si CopiasCotizacion se usa

### 3. Formato: Unificar estándar de código
**Acción:** Decidir estándar y aplicar
- Backend: Ya tiene Black/isort correctos en recovery
- Frontend: Prettier config existe, decidir comillas simples/dobles

---

## ✅ SIGUIENTE PASO RECOMENDADO

1. **Traer archivos faltantes desde recovery** (6 archivos frontend)
2. **Aplicar formato desde recovery** a archivos con diferencias >200 líneas
3. **Crear branch fix/** para corregir violaciones backend
4. **Ejecutar linters** en todo el código
5. **Testing funcional** de integration branch
