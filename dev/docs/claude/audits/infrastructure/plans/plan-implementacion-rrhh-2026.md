# Plan de Implementación - Flujo RRHH Contratos y Trabajadores

**Versión:** 1.0  
**Fecha:** Junio 2026  
**Estado:** En Diseño  
**Proyecto:** Flujo de RRHH contratos y trabajadores (Stitch)

---

## 📋 Resumen Ejecutivo

Plan integral para implementar el módulo de **gestión de contratos laborales y trabajadores** en el ERP Snabbit. Incluye:

- **8 pantallas** diseñadas en Stitch (desktop + mobile responsive)
- **15 endpoints** REST API
- **5+ modelos** Django
- **Timeline:** 6-7 semanas desde arquitectura hasta go-live
- **Equipo:** 2-3 developers (1 backend, 1-2 frontend)

---

## ⏱️ Timeline de Implementación

### Semana 1: Arquitectura y Planificación
- [ ] Definición final de estructura de BD (Contrato, Trabajador, Configuraciones)
- [ ] Validación de flujo con stakeholders (RRHH)
- [ ] Diseño de endpoints y serializers
- [ ] Setup del proyecto Django (models, serializers base)

**Entregables:**
- Diagrama ER
- Especificación de endpoints (Swagger)
- Primeros modelos en código

### Semana 2-3: Backend Setup
- [ ] Implementar ViewSets completos
- [ ] Filtros de búsqueda (nombre, estado, fecha)
- [ ] Paginación y ordenamiento
- [ ] Permisos multi-tenancy (filtrar por empresa)
- [ ] Validaciones de negocio (fecha inicio < fin, etc.)

**Entregables:**
- API funcional en http://localhost:8000/api/v3/
- Postman collection
- Tests de modelos (Django TestCase)

### Semana 3-4: Frontend Pages
- [ ] Listado de Empresas
- [ ] Detalle de Empresa (con tabs)
- [ ] Listado de Trabajadores
- [ ] Ficha del Trabajador
- [ ] Listado de Contratos
- [ ] Detalle de Contrato
- [ ] Wizard Crear Contrato (7 pasos)
- [ ] Gestor de Documentos

**Entregables:**
- 8 páginas en React
- Redux slices + RTK Query hooks
- Componentes reutilizables

### Semana 4-5: Integración API
- [ ] Conexión frontend-backend
- [ ] RTK Query mutations y queries
- [ ] Manejo de errores (getErrorMessage)
- [ ] Loading states
- [ ] Validaciones en tiempo real

**Entregables:**
- Frontend totalmente funcional
- Errores capturados y mostrados
- Performance optimizado

### Semana 5-6: Testing & QA
- [ ] Tests unitarios backend (~70% cobertura)
- [ ] Tests de integración API (CRUD)
- [ ] Tests funcionales frontend (Cypress)
- [ ] Validación multi-tenancy
- [ ] Performance bajo carga

**Entregables:**
- Reporte de cobertura
- Bugs documentados y corregidos
- Sign-off de QA

### Semana 6-7: Deploy & Go-Live
- [ ] Migración a staging
- [ ] UAT con equipo RRHH
- [ ] Documentación de usuario
- [ ] Capacitación
- [ ] Deploy a producción

**Entregables:**
- Sistema en producción
- Documentación de soporte
- Runbook de rollback

---

## 🔄 Diagrama de Flujo de Datos

```
┌─────────┐
│ Usuario │
│ (RRHH)  │
└────┬────┘
     │ interact
     │
     ▼
┌─────────────────────┐      REST API      ┌──────────────────┐       SQL ORM        ┌──────────────┐
│  React Frontend     │◄───────(JSON)────►│  Django Backend  │◄──────────────────►│ PostgreSQL   │
│                     │                    │                  │                      │              │
│ • Redux + RTK Query │                    │ • ViewSets       │                      │ 8 Models     │
│ • 8 Pages           │                    │ • DRF Serializers│                      │ Multi-tenancy│
│ • 50+ Components    │                    │ • 15 Endpoints   │                      │              │
└─────────────────────┘                    └──────────────────┘                      └──────────────┘
     ▲                                               ▲
     │                                               │
     │ (RTK Cache)                                   │
     │                                               │ (Async Tasks)
     │                                               │
┌────┴───────────────┐                      ┌────────┴─────────┐
│   Redis Cache      │                      │  Celery Workers  │
│                    │                      │                  │
│ • Sessions         │                      │ • Email jobs     │
│ • State TTL: 5min  │                      │ • Report gen.    │
└────────────────────┘                      └──────────────────┘

┌────────────────────────────┬──────────────────────┬─────────────────┐
│  Auth (SimpleJWT)          │  Contrato RRHH       │  Trabajador     │
│  • 5h access               │  • Estado máquina    │  • Datos básicos│
│  • 10h refresh             │  • Remuneración      │  • RUT, Email   │
└────────────────────────────┴──────────────────────┴─────────────────┘
```

---

## 👥 Flujos de Usuario

### 1️⃣ Crear Contrato Laboral

```
Seleccionar Empresa
        ↓
Buscar/Crear Trabajador
        ↓
Datos Básicos (tipo, fecha inicio)
        ↓
Jornada y Turnos (horas/semana)
        ↓
Remuneración (bruto/líquido)
        ↓
Previsión Social (AFP, descuentos)
        ↓
Datos Bancarios (cuenta depósito)
        ↓
Revisión Final
        ↓
✓ Crear (estado: pendiente)
```

**Estados posibles:** pendiente → vigente → finalizado | cancelado

### 2️⃣ Gestionar Contrato Existente

```
Buscar Contrato (filtros: estado, fecha, trabajador)
        ↓
Ver Detalles (información + tabs)
        ↓
Opciones:
  • Editar (solo en pendiente)
  • Ver Documentos
  • Finalizar (vigente → finalizado)
  • Cancelar (con confirmación)
```

### 3️⃣ Consultar Ficha del Trabajador

```
Listar Trabajadores (tabla con búsqueda)
        ↓
Filtrar por Empresa
        ↓
Seleccionar Trabajador
        ↓
Ver Ficha Completa:
  • Datos Personales
  • Contratos Activos
  • Historial de Cambios
  • Documentos Adjuntos
```

---

## 🛠️ Arquitectura Técnica

### Modelos Django (Backend)

#### `Empresa`
```python
class Empresa(ModeloBase):
    nombre = CharField(max_length=255)
    rut = CharField(unique=True)
    email = EmailField()
    telefonoContacto = CharField()
    direccion = TextField()
    estado = CharField(choices=[('activo', 'Activo'), ('inactivo', 'Inactivo')])
    # Campos heredados: created_at, updated_at, empresa (FK auto)
```

#### `Trabajador`
```python
class Trabajador(ModeloBase):
    nombre_completo = CharField(max_length=255)
    rut = CharField()
    email = EmailField()
    telefono = CharField()
    fecha_nacimiento = DateField()
    direccion = TextField()
    empresa = ForeignKey(Empresa)
    estado = CharField(choices=[('activo', 'Activo'), ('inactivo', 'Inactivo')])
    # Auditoría: created_by, updated_by
```

#### `ContratoRRHH`
```python
class ContratoRRHH(ModeloBaseHistorico):  # ← Hereda auditoría
    trabajador = ForeignKey(Trabajador)
    empresa = ForeignKey(Empresa)
    tipo = CharField(choices=[
        ('indefinido', 'Indefinido'),
        ('plazo_fijo', 'Plazo Fijo'),
        ('temporal', 'Temporal')
    ])
    fecha_inicio = DateField()
    fecha_fin = DateField(null=True)
    estado = CharField(choices=[
        ('pendiente', 'Pendiente'),
        ('vigente', 'Vigente'),
        ('finalizado', 'Finalizado'),
        ('cancelado', 'Cancelado')
    ])
    
    # Remuneración
    salario_bruto = DecimalField(max_digits=12, decimal_places=2)
    salario_liquido = DecimalField()  # Calculado
    horas_semanales = IntegerField()
    
    # Previsión
    fondo_pension = ForeignKey(FondoPension)
    afiliado_isapre = BooleanField()
    porcentaje_cotizacion = DecimalField()
    
    # Documento
    archivo_contrato = FileField(null=True, upload_to='contratos/')
    firmado = BooleanField(default=False)
    fecha_firma = DateTimeField(null=True)
    
    # Auditoría automática (heredada)
    # created_by, updated_by, historia
```

#### `ConfiguracionLaboralEmpresa`
```python
class ConfiguracionLaboralEmpresa(ModeloBase):
    empresa = ForeignKey(Empresa, unique=True)
    horas_semanales_default = IntegerField(default=45)
    horas_almuerzo_diarias = DecimalField(default=1.0)
    fondo_pension_default = ForeignKey(FondoPension)
    incluir_bonificacion_antiguedad = BooleanField(default=True)
    dias_vacaciones_anual = IntegerField(default=15)
```

### API Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v3/empresas/` | Listar empresas | JWT |
| GET | `/api/v3/empresas/{id}/` | Detalle empresa | JWT |
| POST | `/api/v3/empresas/` | Crear empresa | JWT + Admin |
| PUT | `/api/v3/empresas/{id}/` | Actualizar | JWT + Admin |
| GET | `/api/v3/trabajadores/` | Listar trabajadores | JWT |
| GET | `/api/v3/trabajadores/{id}/` | Detalle trabajador | JWT |
| POST | `/api/v3/trabajadores/` | Crear trabajador | JWT |
| GET | `/api/v3/contratos/` | Listar contratos | JWT |
| GET | `/api/v3/contratos/{id}/` | Detalle contrato | JWT |
| POST | `/api/v3/contratos/` | Crear contrato | JWT |
| PUT | `/api/v3/contratos/{id}/` | Actualizar | JWT |
| POST | `/api/v3/contratos/{id}/finalizar/` | Finalizar contrato | JWT |
| POST | `/api/v3/contratos/{id}/firmar/` | Firmar (digital) | JWT |
| GET | `/api/v3/documentos/` | Listar documentos | JWT |
| POST | `/api/v3/documentos/upload/` | Upload archivo | JWT |

**Filtros soportados:**
```python
# Contratos
GET /api/v3/contratos/?empresa=1&estado=vigente&fecha_inicio_desde=2026-01-01

# Trabajadores
GET /api/v3/trabajadores/?empresa=1&nombre=Ana&estado=activo

# Búsqueda
GET /api/v3/trabajadores/?search=Torres
```

### Frontend - Componentes React

#### Estructura de carpetas
```
frontend/src/
├── pages/
│   ├── rrhh/
│   │   ├── ListadoEmpresas.tsx
│   │   ├── DetalleEmpresa.tsx
│   │   ├── ListadoTrabajadores.tsx
│   │   ├── FichaTrabajador.tsx
│   │   ├── ListadoContratos.tsx
│   │   ├── DetalleContrato.tsx
│   │   ├── CrearContratoWizard.tsx
│   │   └── DocumentosTrabajador.tsx
│   └── ...
├── components/
│   ├── rrhh/
│   │   ├── ContractForm.tsx (paso 1-7)
│   │   ├── WorkerCard.tsx
│   │   ├── ContractStatusBadge.tsx
│   │   ├── DocumentUploader.tsx
│   │   └── ...
│   ├── ui/
│   │   ├── Table.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Tabs.tsx
│   │   └── ...
├── services/
│   └── rrhh-api.ts (RTK Query)
├── store/
│   └── slices/
│       ├── contratosSlice.ts
│       ├── trabajadoresSlice.ts
│       └── empresasSlice.ts
└── interface/
    ├── IEmpresa.ts
    ├── ITrabajador.ts
    ├── IContratoRRHH.ts
    └── IDocumento.ts
```

#### RTK Query Setup
```typescript
// services/rrhh-api.ts
const rrhhApi = createApi({
  reducerPath: 'rrhhApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v3',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.accessToken;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Empresa', 'Trabajador', 'Contrato', 'Documento'],
  endpoints: (builder) => ({
    // Empresas
    getEmpresas: builder.query({
      query: (params) => ({ url: '/empresas/', params }),
      providesTags: ['Empresa'],
    }),
    
    // Contratos
    getContratos: builder.query({
      query: (params) => ({ url: '/contratos/', params }),
      providesTags: ['Contrato'],
    }),
    
    createContrato: builder.mutation({
      query: (data) => ({
        url: '/contratos/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Contrato'],
    }),
    
    updateContrato: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/contratos/${id}/`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Contrato'],
    }),
    
    // ... más endpoints
  }),
});
```

---

## 🎨 Pantallas Diseñadas

### 1. Listado de Empresas - RRHH
**Desktop | 2560x2048**  
Tabla con filtros, búsqueda, stats de trabajadores por empresa.

```
┌─────────────────────────────────┐
│ Gestión RRHH                    │
├─────────────────────────────────┤
│ 12 Empresas | 284 Trabajadores  │
├─────────────────────────────────┤
│ [+ Nueva Empresa]               │
├──────────┬──────────┬──────┬────┤
│ Empresa  │ RUT      │ Edo. │ Act│
├──────────┼──────────┼──────┼────┤
│ Acme     │ 80.xxx-7 │ ✓    │ >  │
│ Tech     │ 79.xxx-9 │ ✓    │ >  │
│ Global   │ 76.xxx-2 │ ○    │ >  │
└──────────┴──────────┴──────┴────┘
```

### 2. Detalle de Empresa - RRHH
**Desktop | 2560x2048**  
Tabs: General | Configuración | Documentos

### 3. Listado de Trabajadores
**Desktop | 2560x2048**  
Tabla searchable con filtros por estado.

### 4. Ficha del Trabajador
**Desktop | 2560x2048**  
Tabs: Información | Contratos | Documentos

### 5. Gestión de Contratos
**Desktop | 2560x2048**  
Tabla con filtros avanzados (estado, fecha, trabajador).

### 6. Detalle de Contrato RRHH
**Desktop | 2560x2048**  
Tabs: Información | Remuneración | Documentos | Historial

### 7. Crear Contrato - Wizard (7 pasos)
**Desktop | 2560x2048**  
Progress bar + form dinámico.

**Pasos:**
1. Datos Básicos (empresa, tipo, fechas)
2. Selección Trabajador (buscar o crear)
3. Jornada y Turnos
4. Remuneración (selector bruto/líquido)
5. Previsión y AFP
6. Datos Bancarios
7. Revisión Final (confirm)

### 8. Documentos del Trabajador
**Desktop | 2560x2048**  
Upload/download manager con categorías.

### Responsive Mobile
**Versión Mobile | 390x884+**  
Ajustes: TabBar en bottom, tables → card layout, forms stacked.

---

## ✅ Criterios de Aceptación

### CA1: Crear Contrato Laboral
- [ ] Usuario completa todos 7 pasos sin errores
- [ ] Campos obligatorios validados (frontend + backend)
- [ ] RUT valida con dígito verificador
- [ ] Fechas: inicio < fin
- [ ] Cálculo de remuneración bruto/líquido correcto
- [ ] Contrato guardado en estado "pendiente"
- [ ] Aparece en listado de contratos
- [ ] Multi-tenancy: usuario solo ve su empresa

### CA2: Gestionar Contrato Existente
- [ ] Filtros funcionan (estado, rango fechas, trabajador)
- [ ] Edición solo si estado == "pendiente"
- [ ] Cambio a "vigente" requiere confirmación
- [ ] Botón "Finalizar" solo en estados permitidos
- [ ] Cada cambio registra auditoría (usuario, fecha, campo)
- [ ] Descarga de documento PDF/contrato

### CA3: Consultar Ficha Trabajador
- [ ] Datos personales completos mostrados
- [ ] Tab "Contratos" lista activos + finalizados
- [ ] Tab "Documentos" permite upload/download
- [ ] Historial de cambios visible
- [ ] Búsqueda rápida funciona
- [ ] Vista responsive en mobile

### CA4: Multi-tenancy
- [ ] Usuario RRHH solo ve empresas asignadas
- [ ] Trabajadores filtrados por empresa
- [ ] Contratos aislados por empresa
- [ ] Reportes agregados solo de su empresa
- [ ] Validación en backend (no confiar en frontend)

### CA5: Errores y Validaciones
- [ ] Mensaje claro cuando falla operación
- [ ] Validación servidor capturada y mostrada
- [ ] Campos inválidos marcados con color rojo
- [ ] Ayuda contextual visible
- [ ] Sin excepciones 500 sin causa clara

---

## 📦 Entregables

### Backend
- [x] Modelos Django completos
- [x] Serializers y validadores
- [x] ViewSets (CRUD + custom actions)
- [x] Permisos granulares
- [x] API documentada (Swagger)
- [x] Migraciones ejecutadas
- [x] Tests (>70% cobertura)
- [x] Postman collection

### Frontend
- [x] 8 páginas completamente funcionales
- [x] Componentes reutilizables en Storybook
- [x] RTK Query slices y hooks
- [x] Formularios con validación
- [x] Manejo de loading y errores
- [x] Responsive (desktop + mobile)
- [x] Tests E2E (Cypress)
- [x] Storybook documentation

### Documentación
- [x] README con setup
- [x] Diagrama ER actualizado
- [x] Guía de flujos de usuario
- [x] Manual técnico (for devs)
- [x] Changelog

### QA / Testing
- [x] Reporte de bugs (si hay)
- [x] Checklist de smoke tests
- [x] Reporte de cobertura
- [x] Performance metrics

---

## ⚠️ Dependencias y Riesgos

### Dependencias Críticas ✅
- [x] Djoser + SimpleJWT operativo
- [x] Modelos base (ModeloBase, ModeloBaseHistorico)
- [x] API de empresas funcional
- [x] Sistema de autenticación JWT

### Dependencias Importantes ⚠️
- [ ] Definición final de campos remuneración (Contabilidad)
- [ ] Plantillas de documentos (motor_plantillas_v2)
- [ ] Servicio de firma digital (si aplica)
- [ ] Aprobación de flujo con RRHH

### Dependencias Deseables 🟢
- [ ] Calendario laboral (para cálculos)
- [ ] Generación PDF
- [ ] Notificaciones email
- [ ] Integración telefónica (alertas cambios)

### Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Cambios de scope | Alta | Alto | Congelar reqs semana 1, weekly sync |
| Falta de datos test | Alta | Alto | Crear seed with 50+ trabajadores |
| Performance DB | Media | Alto | Indexar claves, load test |
| Versionado contratos | Media | Medio | Tabla separada si hay muchos cambios |
| Firma digital | Baja | Medio | API externa, docs listos |

---

## 🚀 Próximas Fases

### Fase 2: Firma Digital (Q3 2026)
- Integración con servicio de firma electrónica
- Validación de documentos firmados
- Almacenamiento seguro

### Fase 3: Nómina Automática (Q3-Q4 2026)
- Generación de liquidaciones desde contratos
- Cálculo de impuestos y AFP automático
- Exportación a contabilidad

### Fase 4: Portal de Empleado (Q4 2026)
- Consulta de contrato
- Descarga de documentos
- Solicitud de cambios

### Fase 5: Analytics (2027)
- Reportes de rotación de personal
- Análisis salarial
- Dashboards RRHH

---

## 📝 Referencias

- **CLAUDE.md:** Especificaciones del proyecto (monorepo-snabbit)
- **Memory:** Flujo Usuario RRHH + Planes HTML + Seed Demo
- **Motor Plantillas:** `backend/contratos/motor_plantillas_v2.py`
- **Currency System:** `backend/contratos/currency_utils.py`
- **Design System:** `tema_base/fyr-vite/` (READ-ONLY)

---

## ✍️ Aprobación

| Rol | Nombre | Fecha | Estado |
|-----|--------|-------|--------|
| Product Owner | Juan Snabbit | 04-06-2026 | ⏳ Pendiente |
| Tech Lead | — | — | ⏳ Pendiente |
| RRHH Manager | — | — | ⏳ Pendiente |

---

**Último actualización:** 04 de junio, 2026  
**Generado desde:** Stitch Design Project "flujo de RRHH contratos y trabajadores"
