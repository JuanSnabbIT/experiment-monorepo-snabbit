````instructions
# Copilot Instructions - Monorepo ERP

Índice maestro de instrucciones para agentes de IA. Define qué cargar según el alcance y proporciona contexto rápido del sistema.

---

## 1. Rol de Este Archivo

- **Punto de entrada único** para agentes de IA.
- Dirige al conjunto mínimo de instrucciones según el alcance.
- Proporciona contexto rápido para evitar búsquedas innecesarias.

---

## 2. Resumen del Sistema

### ¿Qué es este sistema?
ERP multi-empresa para gestión de servicios de TI. Permite a empresas prestadoras de servicios gestionar:
- Órdenes de trabajo (soporte técnico, servicios generales)
- Cotizaciones y presupuestos
- Inventario y bodegas
- Contratos con clientes
- Rendiciones de gastos
- Equipos y recursos
- Visitas de soporte
- Calendario y vacaciones

### Stack Tecnológico
| Capa | Tecnología |
|------|------------|
| **Backend** | Django 5.1.x + DRF + Celery + Redis |
| **Frontend** | React 18 + TypeScript 5 + Vite 5 |
| **Estado** | Redux Toolkit + RTK Query |
| **Auth** | Djoser + SimpleJWT (5h access / 10h refresh) |
| **BD Dev** | SQLite |
| **BD Prod** | PostgreSQL |

---

## 3. Estructura del Monorepo

```
monorepo_erp/
├── .github/                # Instrucciones para agentes
│   ├── copilot-instructions.md  # ESTE ARCHIVO
│   └── instructions/            # Guías específicas
├── .vscode/                # Tasks de desarrollo
├── backend/                # Django + DRF
│   ├── core/               # Modelos base, multi-tenancy
│   ├── cuentas/            # Auth, usuarios
│   ├── empresas/           # Empresas, sucursales
│   ├── items/              # Catálogo de productos
│   ├── bodegas/            # Inventario, compras, guías
│   ├── cotizaciones/       # Cotizaciones
│   ├── ordentrabajov2/     # Órdenes de trabajo (ACTIVO)
│   ├── ordentrabajo/       # V1 - DESACTIVADA
│   ├── rendiciones/        # Rendición de gastos
│   ├── contratos/          # Contratos
│   ├── visitas/            # Visitas de soporte
│   ├── recursos/           # Equipos y software
│   ├── calendario/         # Días calendario
│   ├── vacaciones/         # Vacaciones
│   └── sw_erp/             # Configuración Django
├── frontend/               # React + TypeScript
│   └── src/
│       ├── pages/          # Vistas por módulo
│       ├── components/     # Componentes UI
│       ├── store/slices/   # Redux por dominio
│       ├── services/       # HTTP (BaseService, RTK Query)
│       ├── interface/      # Tipos TypeScript
│       └── hooks/          # Custom hooks
├── dev/
│   ├── docs/               # Documentación viva
│   └── scripts/            # Scripts de desarrollo
├── postman/                # Colecciones Postman
├── AGENTS.md               # Reglas para agentes IA
└── README.md
```

---

## 4. Instrucciones Disponibles

| Archivo | Contenido |
|---------|-----------|
| `AGENTS.md` | Reglas transversales, checklist final, política de documentación |
| `architecture.md` | Estructura completa, stack, modelos, endpoints, flujos |
| `backend-guide.md` | Convenciones Django, patrones ViewSet, estados, movimientos |
| `frontend-guide.md` | Convenciones React, Redux, RTK Query, componentes |
| `typescript.instructions.md` | Estándares TypeScript/React |
| `rtk-query-best-practices.md` | Mejores prácticas RTK Query |
| `security.md` | JWT, permisos, CORS, multi-tenancy |
| `testing.md` | Tests, validaciones, linting |
| `deployment.md` | Build y despliegue |
| `glossary.md` | Glosario de términos de negocio y técnicos |

---

## 5. Routing por Alcance

### Backend
Cargar: `AGENTS.md` + `architecture.md` + `backend-guide.md`

### Frontend
Cargar: `AGENTS.md` + `architecture.md` + `frontend-guide.md` + `typescript.instructions.md`

### RTK Query / Estado
Cargar: `AGENTS.md` + `frontend-guide.md` + `rtk-query-best-practices.md`

### Seguridad / Auth
Cargar: `AGENTS.md` + `security.md`

### Testing
Cargar: `AGENTS.md` + `testing.md`

### Deployment
Cargar: `AGENTS.md` + `deployment.md`

### Contexto General
Cargar: `AGENTS.md` + `architecture.md` + `glossary.md`

---

## 6. Contexto Rápido por Dominio

### Órdenes de Trabajo (ordentrabajov2)
- **Modelos principales:** `OrdenDeTrabajo`, `SoporteTecnico`, `ServicioEnOT`
- **Estados OT:** pendiente → en_proceso → completada → cerrada → facturada
- **Guías:** Se vinculan directamente a OT (no a Soporte)
- **⚠️ IMPORTANTE:** `ordentrabajo` (V1) está DESACTIVADA

### Cotizaciones
- **Modelos:** `Cotizacion`, `ItemCotizacion`, `SolicitanteCotizacion`
- **Monedas:** "1"=USD, "2"=CLP, "3"=UF
- **Aprobación pública:** `/api/public/cotizacion/{token}/`

### Bodegas / Inventario
- **Modelos:** `Bodega`, `StockItemEnBodega`, `OrdenCompra`, `GuiaSalida`
- **Movimientos:** Usar `bodegas/movimientos.py` (registrar_entrada, registrar_salida, etc.)
- **⚠️ CRÍTICO:** `cantidad` siempre es DELTA, no saldo

### Multi-tenancy
- **Patrón obligatorio:** Todo ViewSet filtra por `PersonalizacionUsuario.sucursal_principal.empresa`
- **Si no se implementa:** Fuga de datos entre empresas

### RTK Query
- **Invalidación:** Usar `invalidatesTags`, NUNCA `refetch()` manual
- **Tags definidos en:** `services/RtkQueryService.ts`

---

## 7. Comandos de Desarrollo

### Backend
```bash
cd backend
python manage.py runserver 0.0.0.0:8000   # Servidor
python manage.py makemigrations            # Crear migraciones
python manage.py migrate                   # Aplicar migraciones
python manage.py test                      # Tests
celery -A sw_erp worker --loglevel=info    # Worker Celery
celery -A sw_erp beat --loglevel=info      # Scheduler Celery
```

### Frontend
```bash
cd frontend
npm run dev           # Servidor desarrollo
npm run build         # Build producción
npm run lint          # Verificar errores
npm run prettier:fix  # Formatear código
```

### VS Code Tasks
Disponibles en `.vscode/tasks.json`:
- Backend: Runserver, Celery Worker, Celery Beat, Migrations
- Frontend: Dev Server
- Docker: Build+Push Backend/Frontend

---

## 8. Política de Documentación

- **Documentación viva:** Solo en `dev/docs/`
- **NO crear archivos en:** raíz, `backend/docs/`, `frontend/docs/`
- **Regla:** Actualizar existentes > crear nuevos
- **Checklist antes de crear:** Ver `AGENTS.md`

### Archivos en `dev/docs/`:
- `analisis.md` - Análisis técnicos
- `changelog.md` - Cambios de estado
- `flujos_operativos.md` - Flujos de negocio
- `notas.md` - Notas generales
- `planificacion.md` - Planificación
- `sistemas.md` - Documentación de sistemas

---

## 9. Reglas Críticas para Agentes

1. **Leer `AGENTS.md`** antes de cualquier cambio significativo
2. **Proponer plan** antes de modificar múltiples archivos
3. **No crear documentación** sin solicitud explícita
4. **Filtrar por empresa** en todo ViewSet (multi-tenancy)
5. **No usar `refetch()`** en RTK Query
6. **Siempre crear migraciones** al cambiar modelos
7. **Verificar con `npm run lint` y `npm run build`** antes de terminar

---

## 10. Encoding

- Archivos deben guardarse en **UTF-8**.
- Si ves texto con caracteres corruptos, corrige y re-guarda en UTF-8.

---

Última actualización: 2026-02-03
````
