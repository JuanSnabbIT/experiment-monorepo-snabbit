````instructions
# Copilot Instructions - Monorepo ERP Snabbit

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

### Fuente Visual (tema_base)
- **Ubicación:** `tema_base/fyr-vite/`
- **Rol:** Read-only. Consumir componentes, NO modificar.
- **Config tema:** `frontend/src/config/theme.config.ts`

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
│       ├── components/     # Componentes UI (sincronizados con tema_base)
│       ├── store/slices/   # Redux por dominio
│       ├── services/       # HTTP (BaseService, RTK Query)
│       ├── interface/      # Tipos TypeScript (prefijo I)
│       └── hooks/          # Custom hooks
├── tema_base/              # Fuente visual (Fyr theme) - READ ONLY
│   └── fyr-vite/
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
| `backend-guide.md` | Convenciones Django, patrones ViewSet, multi-tenancy, movimientos |
| `frontend-patterns.md` | Estructura de páginas, imports canónicos, convenciones React |
| `typescript.instructions.md` | Estándares TypeScript/React |
| `rtk-query-best-practices.md` | Tags RTK Query, invalidación, deuda técnica |
| `visual-consistency.md` | Componentes UI canónicos, tema, consistencia visual |
| `testing.md` | Tests, validaciones, linting |
| `deployment.md` | Build y despliegue |
| `glossary.md` | Glosario de términos de negocio y técnicos |

---

## 5. Routing por Alcance

### Backend
Cargar: `AGENTS.md` + `backend-guide.md`

### Frontend
Cargar: `AGENTS.md` + `frontend-patterns.md` + `typescript.instructions.md`

### RTK Query / Estado
Cargar: `AGENTS.md` + `rtk-query-best-practices.md`

### Consistencia Visual / UI
Cargar: `AGENTS.md` + `visual-consistency.md` + `frontend-patterns.md`

### Testing
Cargar: `AGENTS.md` + `testing.md`

### Deployment
Cargar: `AGENTS.md` + `deployment.md`

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
- **Tags definidos en:** `services/RtkQueryService.ts` (75+ tags)
- **Ver deuda técnica:** `rtk-query-best-practices.md`

---

## 7. Componentes UI Canónicos

### Imports UI (desde tema_base)
```tsx
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, TFoot, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import Alert from '@/components/ui/Alert';
import Dropdown, { DropdownItem, DropdownMenu, DropdownToggle } from '@/components/ui/Dropdown';
```

### Imports Form
```tsx
import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Checkbox from '@/components/form/Checkbox';
import Validation from '@/components/form/Validation';
import Label from '@/components/form/Label';
```

### Imports Layout
```tsx
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Container from '@/components/layouts/Container/Container';
```

---

## 8. Comandos de Desarrollo

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

## 9. Política de Documentación

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

## 10. Reglas Críticas para Agentes

1. **Leer `AGENTS.md`** antes de cualquier cambio significativo
2. **Proponer plan** antes de modificar múltiples archivos
3. **No crear documentación** sin solicitud explícita
4. **Filtrar por empresa** en todo ViewSet (multi-tenancy)
5. **No usar `refetch()`** en RTK Query post-mutation
6. **Siempre crear migraciones** al cambiar modelos
7. **Verificar con `npm run lint` y `npm run build`** antes de terminar
8. **Usar componentes de tema_base** — NO crear componentes UI nuevos
9. **Interfaces con prefijo `I`** en TypeScript
10. **Usar `getErrorMessage`** de `utils/errorHandlers.ts` para catch

---

## 11. Encoding

- Todos los archivos deben guardarse en **UTF-8 sin BOM**.
- Si ves texto con caracteres corruptos (mojibake como `Ã³`, `Ã±`, `Ã©`, `â€"`), corrige y re-guarda en UTF-8 antes de continuar.
- **Regla obligatoria al escribir archivos con la herramienta de terminal:** usar siempre `[System.IO.File]::WriteAllText(path, content, New-Object System.Text.UTF8Encoding $false)` en PowerShell, o `open(path, 'w', encoding='utf-8')` en Python. Nunca usar `Set-Content` ni `Out-File` sin `-Encoding UTF8` explícito.
- **Regla obligatoria en cada fase de implementación:** después de crear o modificar cualquier archivo `.py`, `.ts` o `.tsx` que contenga texto en español, verificar ausencia de mojibake con: `if (Get-Content -Raw archivo) -match 'Ã|â€|Â°|ï¿½' { Write-Host 'ENCODING ERROR' }`.
- La causa más frecuente de mojibake en este repo es `replace_string_in_file` sobre archivos que ya tienen caracteres no-ASCII cuando el contexto del agente no maneja correctamente la cadena. Alternativa segura: PowerShell con `[System.IO.File]::ReadAllBytes` + `GetString(UTF8)` + reemplazo + `WriteAllText`.

---

Última actualización: 2026-04-01
````
