# ✅ CHECKLIST DE VERIFICACIÓN POST-INTEGRACIÓN

**Fecha:** 2025-12-31  
**Rama:** `integration/revision-bloques-1-5`  
**Objetivo:** Validar que todo esté en su lugar antes de mergear a dev

---

## 🔧 VERIFICACIONES BACKEND

### Settings & Configuration

- [ ] **INSTALLED_APPS** contiene:
  ```python
  INSTALLED_APPS = [
      ...
      'cotizaciones',       # ✅ Bloque 1
      'compras',            # ✅ Bloque 2
      'ordenes_compra',     # ✅ Bloque 3 (o similar)
      'bodegas',            # ✅ Bloque 4 (Guías)
      'ordentrabajov2',     # ✅ Bloque 5
      # Old:
      # 'ordentrabajo',     # ❌ Debe estar comentado o removido
  ]
  ```
  **Verificar:** `backend/sw_erp/settings.py`

- [ ] **URL Routing** en urls.py principal:
  ```python
  urlpatterns = [
      path('api/cotizaciones/', include('cotizaciones.urls')),
      path('api/compras/', include('compras.urls')),
      path('api/ordenes-compra/', include('ordenes_compra.urls')),
      path('api/ordenes-de-trabajo/', include('ordentrabajov2.urls')),
      # ...
  ]
  ```
  **Verificar:** `backend/sw_erp/urls.py`

- [ ] **CELERY_BEAT_SCHEDULE** contiene tasks de Cotizaciones:
  ```python
  CELERY_BEAT_SCHEDULE = {
      'update-dolar-diario': {
          'task': 'cotizaciones.tasks.update_dolar_task',
          'schedule': crontab(hour=9),  # 9 AM diario
      },
      'expirar-cotizaciones': {
          'task': 'cotizaciones.tasks.expirar_cotizaciones_vencidas',
          'schedule': crontab(hour=0),  # 0 AM diario
      },
  }
  ```
  **Verificar:** `backend/sw_erp/settings.py` o `celery.py`

- [ ] **Environment Variables** necesarias:
  ```bash
  MINDICADOR_API_KEY=...        # Para cotizaciones
  CORREO_APPWEB=...              # Para tasks de email
  ```
  **Verificar:** `.env` or `docker-compose.yml`

### Migrations & Database

- [ ] **Migrations presentes** para cada módulo:
  ```bash
  backend/cotizaciones/migrations/
  backend/compras/migrations/
  backend/ordenes_compra/migrations/
  backend/bodegas/migrations/
  backend/ordentrabajov2/migrations/
  backend/core/migrations/
  ```
  **Comando:** `python manage.py migrate --plan`

- [ ] **No hay conflictos de migration**:
  ```bash
  python manage.py migrate --plan
  # No debe mostrar errores
  ```

- [ ] **Tablas BD creadas correctamente**:
  ```sql
  -- Verificar que existan:
  SELECT * FROM sqlite_master WHERE type='table' AND name LIKE '%cotizacion%';
  SELECT * FROM sqlite_master WHERE type='table' AND name LIKE '%compra%';
  SELECT * FROM sqlite_master WHERE type='table' AND name LIKE '%orden_trabajo%';
  ```

### Models & Imports

- [ ] **No hay circular imports**:
  ```bash
  python manage.py check
  # Resultado esperado: System check identified no issues (0 silenced).
  ```

- [ ] **Modelos tienen relaciones correctas**:
  ```python
  # Verificar en models.py de cada app:
  cotizaciones.Cotizacion
    ├─ ForeignKey → items.Item
    ├─ ForeignKey → usuarios.Usuario
    └─ relaciones → compras.Compra (reverse)
  
  compras.Compra
    ├─ ForeignKey → cotizaciones.Cotizacion
    ├─ ForeignKey → proveedores.Proveedor
    └─ relaciones → ordenes_compra.OrdenCompra
  ```

- [ ] **PersonalizacionUsuario filter está en get_queryset()**:
  ```python
  # Cada ViewSet debe filtrar por empresa/sucursal
  def get_queryset(self):
      user_pers = PersonalizacionUsuario.objects.get(usuario=self.request.user)
      return self.queryset.filter(
          empresa=user_pers.empresa,
          sucursal=user_pers.sucursal
      )
  ```
  **Riesgo:** Data leak si no está filtrado

### API Endpoints

- [ ] **Endpoints registrados en urls.py**:
  ```
  ✅ GET    /api/cotizaciones/
  ✅ GET    /api/cotizaciones/{id}/
  ✅ POST   /api/cotizaciones/
  ✅ PUT    /api/cotizaciones/{id}/
  ✅ POST   /api/cotizaciones/{id}/copiar/
  ✅ POST   /api/cotizaciones/{id}/actualizar-dolar/
  
  ✅ GET    /api/compras/
  ✅ POST   /api/compras/
  
  ✅ GET    /api/ordenes-compra/
  ✅ POST   /api/ordenes-compra/
  
  ✅ GET    /api/ordenes-de-trabajo/
  ✅ POST   /api/ordenes-de-trabajo/
  ```

- [ ] **Serializers tienen campos correctos**:
  ```python
  # Verificar que serializers tengan:
  - read_only_fields (id, created_at, updated_at)
  - validation methods
  - related_fields correctos
  ```

### Tasks & Celery

- [ ] **Tasks importables sin errores**:
  ```bash
  python -c "from cotizaciones.tasks import update_dolar_task; print('OK')"
  python -c "from core.tasks import send_email_task, update_dolar_task; print('OK')"
  ```

- [ ] **Celery beat scheduler configurado**:
  ```bash
  # Iniciar celery beat y verificar que lance tasks:
  celery -A sw_erp beat --loglevel=info
  ```

---

## 🎨 VERIFICACIONES FRONTEND

### Routes & Navigation

- [ ] **Rutas configuradas en router**:
  ```typescript
  // src/routes/contentRoutes.tsx debe incluir:
  {
    path: '/cotizaciones',
    element: <Cotizaciones />
  },
  {
    path: '/compras',
    element: <Compras />
  },
  {
    path: '/ordenes-de-compra',
    element: <OrdenesCompra />
  },
  {
    path: '/ordenes-de-trabajo',
    element: <OrdenesTrabajo />
  },
  // ... etc
  ```

- [ ] **Menú lateral (Aside) contiene links**:
  ```tsx
  // src/components/layouts/Aside/Aside.tsx
  <NavLink to="/cotizaciones">Cotizaciones</NavLink>
  <NavLink to="/compras">Compras</NavLink>
  <NavLink to="/ordenes-de-compra">OC</NavLink>
  <NavLink to="/ordenes-de-trabajo">OT</NavLink>
  ```

- [ ] **No hay errores de ruta 404** al navegar a:
  - `/cotizaciones`
  - `/compras`
  - `/ordenes-de-compra`
  - `/ordenes-de-trabajo`

### Components & Imports

- [ ] **No hay imports rojos en IDE** (unresolved):
  ```typescript
  // Verificar que no haya:
  // import { X } from 'path/that/doesnt/exist'
  ```

- [ ] **Utils se importan correctamente**:
  ```typescript
  import { formatCurrency } from '@/utils/currency';
  import { downloadPDF } from '@/utils/downloadHelpers';
  import { confirmAlert, successAlert } from '@/utils/sweetAlert';
  ```

- [ ] **Componentes antiguos removidos**:
  ```
  ❌ Viejos componentes de ordentrabajo v1 (si existen)
  ✅ Nuevos componentes de ordentrabajov2
  ```

### Redux Store

- [ ] **Slices creados para nuevos módulos**:
  ```typescript
  // src/store/slices/
  ├─ cotizacionesSlice.ts     ✅
  ├─ comprasSlice.ts          ✅
  ├─ ordenesCompraSlice.ts    ✅
  ├─ ordenesTrabajSlice.ts    ✅
  └─ ... (o modules específicos)
  ```

- [ ] **rootReducer.ts contiene todos los reducers**:
  ```typescript
  const rootReducer = combineReducers({
    cotizaciones: cotizacionesReducer,
    compras: comprasReducer,
    ordenesCompra: ordenesCompraReducer,
    ordenesTrabajo: ordenesTrabajoReducer,
    // ...
  });
  ```

- [ ] **API calls apuntan a endpoints correctos**:
  ```typescript
  // En componentes:
  const response = await apiService.get('/api/cotizaciones/');
  const response = await apiService.post('/api/compras/', data);
  ```

### Styles & Layout

- [ ] **No hay imports de CSS rotos**:
  ```
  ✅ Tailwind classes funcionan
  ✅ CSS variables del tema aplicadas
  ✅ Responsive design funciona
  ```

- [ ] **Componentes UI renderean correctamente**:
  - [ ] Tablas muestran datos
  - [ ] Modales abren/cierran
  - [ ] Formularios validan
  - [ ] Botones responden

---

## 🔗 INTEGRACIONES

### End-to-End Workflows

- [ ] **Flujo Cotización → Compra**:
  ```
  1. Crear Cotización
  2. Marcar como aprobada
  3. Crear Compra desde cotización
  4. Verificar que se copien datos
  ```

- [ ] **Flujo Compra → Orden de Compra**:
  ```
  1. Crear Compra
  2. Generar OC
  3. Confirmar OC
  4. Verificar campos sincronizados
  ```

- [ ] **Flujo OC → Guía de Salida**:
  ```
  1. Crear/Confirmar OC
  2. Crear Guía de Salida
  3. Registrar firmas
  4. Cambiar estado
  ```

- [ ] **Sistema de Órdenes de Trabajo v2**:
  ```
  1. Crear OT
  2. Agregar actividades
  3. Agregar soportes
  4. Cerrar administrativamente
  5. Verificar estado
  ```

### Data Consistency

- [ ] **Datos sincronizados entre módulos**:
  ```
  - Items en cotización = items en compra
  - Montos totales se recalculan
  - Estados se propagan correctamente
  ```

- [ ] **Filtros por empresa/sucursal funcionan**:
  ```
  - Cambiar empresa/sucursal
  - Verificar que datos filtren correctamente
  - No hay data leak entre empresas
  ```

---

## 🧪 TESTING

### Unit Tests

- [ ] **Tests de modelos pasan**:
  ```bash
  python manage.py test cotizaciones.tests.CotizacionModelTests -v 2
  python manage.py test compras.tests
  python manage.py test ordenes_compra.tests
  python manage.py test ordentrabajov2.tests
  ```

- [ ] **Tests de serializers pasan**:
  ```bash
  python manage.py test cotizaciones.tests.SerializerTests
  ```

- [ ] **Tests de views pasan**:
  ```bash
  python manage.py test cotizaciones.tests.ViewTests
  ```

### Integration Tests

- [ ] **API endpoints responden**:
  ```bash
  # Con Postman o curl:
  curl http://localhost:8001/api/cotizaciones/
  curl http://localhost:8001/api/compras/
  # ... etc
  ```

- [ ] **Autenticación funciona**:
  ```
  - Token generado correctamente
  - Requests sin token → 401
  - Requests con token → éxito
  ```

### Frontend Tests

- [ ] **Componentes renderizan sin errores**:
  ```bash
  npm test -- --coverage
  ```

- [ ] **No hay warnings en consola del navegador**:
  ```javascript
  // F12 → Console
  // No debe haber errores rojos (exceptuando terceros)
  ```

---

## 🚀 DEPLOYMENT READINESS

### Code Quality

- [ ] **Linting pasa sin errors**:
  ```bash
  # Backend
  flake8 backend/ --max-line-length=100
  black --check backend/
  isort --check-only backend/
  
  # Frontend
  npm run lint
  ```

- [ ] **No hay dead code**:
  ```
  - Imports no usados: ✅ Removidos
  - Funciones no llamadas: ✅ Removidas
  - Variables no usadas: ✅ Removidas
  ```

- [ ] **Type checking pasa** (TypeScript):
  ```bash
  npm run type-check
  # No hay errores de tipo
  ```

### Documentation

- [ ] **README actualizado** con:
  - [ ] Nuevos módulos listados
  - [ ] Nuevas rutas/endpoints documentadas
  - [ ] Setup instructions claras

- [ ] **Docstrings en funciones críticas**:
  ```python
  def update_dolar_task(cotizacion_id):
      """
      Tarea para actualizar el valor del dolar observado de una cotización.
      
      Args:
          cotizacion_id (int): ID de la cotización
      
      Returns:
          str: Mensaje de resultado
      """
  ```

- [ ] **API Documentation**:
  - [ ] Swagger/OpenAPI actualizado (si existe)
  - [ ] Ejemplos de requests/responses

### Performance

- [ ] **No hay N+1 queries**:
  ```python
  # Usar select_related() / prefetch_related()
  queryset = Cotizacion.objects.select_related('usuario').prefetch_related('items')
  ```

- [ ] **Indexes en BD para campos comúnmente filtrados**:
  ```python
  class Meta:
      indexes = [
          models.Index(fields=['empresa', 'estado']),
      ]
  ```

---

## 📋 PRE-MERGE CHECKLIST FINAL

### Antes de mergear a `dev`:

- [ ] `python manage.py check` → 0 issues
- [ ] `python manage.py migrate --plan` → sin errores
- [ ] Suite de tests → 100% pasando
- [ ] Linting → sin errors
- [ ] Type checking → sin errores
- [ ] README → actualizado
- [ ] Documentación → completa
- [ ] Git history → limpio (no hay commits temp/WIP)
- [ ] Commits están squashed o organizados
- [ ] PR description → clara y completa

### Checklist de commits:

```bash
# Verificar última 5 commits
git log --oneline -5

# Resultado esperado:
# abd6716 fix(backend): restaurar tareas de cotizaciones desde recovery
# 94a3176 fix(frontend): recuperar 6 archivos criticos desde recovery
# d40e7e0 refactor(ordenes-trabajo): eliminar archivos obsoletos
# 997a94b refactor(backend): aplicar formateo correcto desde recovery
# ... (más commits de bloques)
```

### Merge command:

```bash
# En rama integration
git checkout dev
git pull origin dev
git merge integration/revision-bloques-1-5 --no-ff -m "Merge: Integrar bloques 1-5 con validación completa"
git push origin dev
```

---

## 🎯 CRITERIOS DE ACEPTACIÓN

**Rama está lista para mergear si:**

- ✅ Todos los 5 bloques están presentes (28 commits)
- ✅ 0 ImportErrors en `python manage.py check`
- ✅ 0 breaking changes en API
- ✅ Cambios críticos (tasks.py, indicators.py) están presentes
- ✅ Frontend utils (currency, sweetAlert, downloadHelpers) están presentes
- ✅ Tests pasan (o tests escritos para nuevos features)
- ✅ Documentación actualizada
- ✅ Git history limpio

**Rama NO está lista si:**

- ❌ Faltan archivos críticos (sin fix)
- ❌ ImportErrors presentes
- ❌ Breaking changes no documentados
- ❌ Tests fallando
- ❌ Linting errors
- ❌ Documentación desactualizada

---

**Versión:** 1.0  
**Última actualización:** 2025-12-31  
**Estado:** CHECKLIST ACTIVO - Usar para validar antes de merge

