---
name: arch-monorepo
description: Estructura física del monorepo, convenciones, carpetas clave, entry points
lastUpdated: 2026-06-01
relatedFiles:
  - backend/
  - frontend/
  - dev/
  - .github/
  - .claude/
---

# Arquitectura del Monorepo ERP Snabbit

## Estructura Física

```
monorepo_erp/
│
├── .github/                                # Documentación para Copilot
│   ├── AGENTS.md                          # Reglas transversales
│   ├── copilot-instructions.md            # Para GitHub Copilot
│   └── instructions/                      # 11 guías específicas
│
├── .claude/                               # Documentación para Claude Code
│   ├── CLAUDE.md                          # Punto de entrada
│   ├── MEMORY.md                          # Índice de memoria
│   ├── AUDIT.md                           # Esta auditoría
│   ├── settings.json                      # Configuración Claude Code
│   └── memory/                            # 14 archivos de memoria persistente
│
├── .vscode/                               # Configuración VS Code
│   ├── tasks.json                         # Tasks de desarrollo
│   └── settings.json                      # Settings del workspace
│
├── backend/                               # Django + DRF (Puerto 8000)
│   ├── sw_erp/                            # Configuración Django (WSGI, settings, urls)
│   ├── core/                              # SSOT: modelos base, multi-tenancy
│   │   ├── models.py                      # ModeloBase, ModeloBaseHistorico, PersonalizacionUsuario
│   │   ├── managers.py                    # QuerySets personalizados
│   │   └── pdf/                           # Utilidades PDF
│   │
│   ├── [APPS ACTIVOS]
│   ├── cuentas/                           # Auth, usuarios, login
│   ├── empresas/                          # Empresas, sucursales, usuarios empresa
│   ├── items/                             # Catálogo de productos
│   ├── bodegas/                           # Inventario, movimientos, guías
│   │   └── movimientos.py                 # SSOT: registrar_entrada, salida, etc.
│   │
│   ├── cotizaciones/                      # Cotizaciones (multi-moneda)
│   ├── contratos/                         # Contratos B2B + RRHH
│   │   ├── models.py                      # ContratoEmpresaCliente, ContratoTrabajador
│   │   ├── currency_utils.py              # SSOT: conversión de monedas
│   │   ├── motor_plantillas.py            # Motor V1
│   │   ├── motor_plantillas_v2.py         # Motor V2 (nuevo)
│   │   ├── adaptadores.py                 # IContratoBase, adaptadores
│   │   └── management/commands/           # Seeds (bloques, etiquetas, plantillas)
│   │
│   ├── ordentrabajo/                      # V1 (DESACTIVADA)
│   ├── ordentrabajov2/                    # V2 (DEPRECADA)
│   ├── ordentrabajov3/                    # V3 (ACTIVA) ⭐
│   ├── rrhh/                              # Contratos laborales + firma digital ⭐
│   ├── rendiciones/                       # Rendición de gastos
│   ├── visitas/                           # Visitas de soporte
│   ├── recursos/                          # Equipos y software
│   ├── calendario/                        # Días calendario
│   ├── vacaciones/                        # Vacaciones
│   │
│   ├── manage.py                          # CLI Django
│   ├── requirements.txt                   # Dependencias Python
│   └── README.md                          # Setup backend
│
├── frontend/                              # React 18 + TypeScript 5 + Vite 5 (Puerto 5173)
│   ├── src/
│   │   ├── App.tsx                        # Componente raíz
│   │   ├── main.tsx                       # Entry point
│   │   │
│   │   ├── config/
│   │   │   ├── theme.config.ts            # Configuración de tema (PERSONALIZABLE)
│   │   │   ├── pages.config.ts            # Rutas y autority
│   │   │   └── ...
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                        # 12 componentes base (Tailwind + Fyr pattern)
│   │   │   │   ├── Button.tsx, Card.tsx, Modal.tsx, Table.tsx, ...
│   │   │   │   └── Desarrollados localmente
│   │   │   │
│   │   │   ├── form/                      # 9 componentes form + nuevos (Sprint 21)
│   │   │   │   ├── Input.tsx, SelectReact.tsx, Checkbox.tsx, FileInput.tsx, RadioCard.tsx ...
│   │   │   │   └── Desarrollados localmente
│   │   │   │
│   │   │   ├── layouts/                   # Wrappers estructurales
│   │   │   │   ├── PageWrapper.tsx, Subheader.tsx, Container.tsx
│   │   │   │   └── Desarrollados localmente
│   │   │   │
│   │   │   ├── icon/                      # Sistema de iconos (Heroicons)
│   │   │   ├── modals/                    # Modales reutilizables
│   │   │   ├── helper/                    # Componentes de utilidad
│   │   │   └── utils/                     # Componentes personalizados (proyecto)
│   │   │
│   │   ├── pages/                         # Vistas por módulo
│   │   │   ├── Contratos/                 # Contratos B2B
│   │   │   ├── RRHH/                      # Contratos laborales
│   │   │   ├── Bodegas/
│   │   │   ├── Cotizaciones/
│   │   │   └── ...
│   │   │
│   │   ├── services/                      # HTTP layer
│   │   │   ├── BaseService.ts             # Base de axios
│   │   │   ├── ApiService.ts              # HTTP wrapper
│   │   │   └── RtkQueryService.ts         # RTK Query API (75+ tags)
│   │   │
│   │   ├── store/                         # Redux state
│   │   │   └── slices/                    # API endpoints + reducers por dominio
│   │   │       ├── auth/
│   │   │       ├── contratos/
│   │   │       ├── rrhh/
│   │   │       └── ...
│   │   │
│   │   ├── interface/                     # TypeScript interfaces (prefijo I)
│   │   │   ├── ordenTrabajo.interface.ts
│   │   │   ├── contrato.interface.ts
│   │   │   └── ...
│   │   │
│   │   ├── constants/                     # Constantes de negocio
│   │   ├── context/                       # React contexts
│   │   ├── hooks/                         # Custom hooks
│   │   ├── routes/                        # Configuración de rutas (React Router)
│   │   ├── styles/                        # Estilos globales
│   │   ├── types/                         # Types TypeScript (no interfaces)
│   │   └── utils/                         # Helpers (errorHandlers, etc.)
│   │
│   ├── tsconfig.json                      # strict: true (OBLIGATORIO)
│   ├── vite.config.ts                     # Configuración Vite
│   ├── package.json                       # Dependencias Node
│   └── README.md                          # Setup frontend
│
├── dev/                                   # Desarrollo
│   ├── docs/                              # Documentación VIVA (única permitida)
│   │   ├── adr-rrhh.md                    # Decisiones arquitectónicas
│   │   ├── changelog.md                   # Cambios de estado
│   │   ├── flujos_operativos.md           # Flujos de negocio
│   │   ├── sistemas.md                    # Documentación de sistemas
│   │   └── (máximo 1 archivo por dominio)
│   │
│   └── scripts/                           # Herramientas
│       ├── jira/                          # Integración Jira (CLI)
│       │   ├── jira_client.py             # Cliente Jira
│       │   ├── listar_proyectos.py
│       │   ├── crear_historia.py
│       │   └── gestionar_sprint.py
│       │
│       └── (otros scripts de setup/mantenimiento)
│
├── postman/                               # Colecciones Postman
│   ├── Snabbit-Backend.postman_collection.json
│   └── (ambiente local/prod)
│
├── erp-snabbit.code-workspace             # Workspace config (Copilot instructions)
├── AGENTS.md                              # Reglas globales para agentes
├── CLAUDE.md → .claude/CLAUDE.md          # (apunta a estructura .claude/)
└── README.md                              # Documentación general
```

---

## Convenciones por Capa

### Backend (Python)

| Aspecto | Convención | Ejemplo |
|---------|------------|---------|
| **Carpeta app** | snake_case | `ordentrabajov3`, `contratos`, `bodegas` |
| **Modelos** | PascalCase singular | `OrdenDeTrabajo`, `ContratoEmpresaCliente` |
| **ViewSet** | `{Modelo}ViewSet` | `OrdenDeTrabajoViewSet` |
| **Serializer** | `{Modelo}Serializer` | `OrdenDeTrabajoSerializer` |
| **Función** | snake_case | `registrar_entrada()`, `validar_guias()` |
| **Archivo** | snake_case | `estados_modelo.py`, `movimientos.py` |
| **URL** | kebab-case | `/api/ordenes-de-trabajo/` |

### Frontend (TypeScript/React)

| Aspecto | Convención | Ejemplo |
|---------|------------|---------|
| **Archivo componente** | PascalCase | `DetalleContrato.tsx`, `ListaOT.tsx` |
| **Archivo interface** | camelCase.interface.ts | `ordenTrabajo.interface.ts` |
| **Archivo slice** | camelCase + "Slice" | `authSlice.ts`, `contratoSlice.ts` |
| **Archivo constantes** | camelCase + ".constant" | `contrato.constant.ts` |
| **Interfaz (export)** | Prefijo I | `IOrdenDeTrabajo`, `ICotizacion` |
| **Type (export)** | Sin prefijo | `TSelectOption`, `TColors` |
| **Enum** | PascalCase | `EstadoOT`, `TipoServicio` |
| **Custom hook** | `use{Nombre}` | `useEstadoOT()`, `useMultiTenancy()` |

---

## Archivos Críticos (No Tocar sin Plan)

🔴 **Backend:**
- `backend/core/models.py` — ModeloBase, multi-tenancy SSOT
- `backend/contratos/currency_utils.py` — Conversión de monedas SSOT
- `backend/contratos/motor_plantillas_v2.py` — Motor V2
- `backend/contratos/adaptadores.py` — Patrón polimórfico

🔴 **Frontend:**
- `frontend/src/services/RtkQueryService.ts` — Tags y configuración RTK (75+ tags)
- `frontend/src/config/theme.config.ts` — Tema (personalizable)
- `frontend/src/components/` — Componentes desarrollados localmente (UI, form, layouts)

🔴 **Configuración:**
- `erp-snabbit.code-workspace` — Instrucciones Copilot
- `.claude/settings.json` — Configuración Claude Code

---

## Entry Points por Rol

### Desarrollador Backend
1. Lee: `backend/README.md`
2. Cargar: `.claude/CLAUDE.md` + `.github/AGENTS.md` + `.github/instructions/backend-guide.md`
3. Verificar: Estructura en `backend/` contra carpetas arriba

### Desarrollador Frontend
1. Lee: `frontend/README.md`
2. Cargar: `.claude/CLAUDE.md` + `.github/instructions/frontend-patterns.md`
3. Verificar: Estructura en `frontend/src/` contra carpetas arriba

### DevOps
1. Cargar: `.github/instructions/deployment.md`
2. Revisar: `backend/Dockerfile`, `frontend/Dockerfile`
3. Scripts: `build-and-push-backend.ps1`, `build-and-push-frontend.ps1`

### QA / Jira
1. Cargar: `.github/instructions/jira-guide.md`
2. Scripts: `dev/scripts/jira/`
3. Proyecto: `SEB` en Jira Cloud

---

## Integración Local

```bash
# Clonar
git clone https://titan.snabbit.cl/Snabbit/Monorepo-ERP-Snabbit.git

# Backend setup
cd backend
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.\.venv\Scripts\activate   # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000

# Frontend setup (nueva terminal)
cd frontend
npm install
npm run dev  # Vite on http://localhost:5173
```

---

## Datos Clave

- **Multi-tenancy:** Filtrar por `PersonalizacionUsuario.sucursal_principal.empresa`
- **Monedas:** CLP, USD, UF (en `contratos/currency_utils.py`)
- **Órdenes de Trabajo:** V3 activa (V2 deprecada, V1 desactivada)
- **Plantillas:** V2 con motor polimórfico (contratos B2B + laborales)
- **Theme:** Tailwind + Fyr pattern, config en `frontend/src/config/theme.config.ts`
- **Componentes:** 12 UI + 9 form + 4 layout, desarrollados localmente en `frontend/src/components/`
- **Documentación viva:** Solo en `dev/docs/` (máx 1 por dominio)

---

**Cuándo usar esto:** Nuevo miembro en el equipo, navegación del monorepo, preguntas sobre "dónde está X"
