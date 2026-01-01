# 🏢 Monorepo ERP Snabbit

Sistema ERP completo implementado con arquitectura monorepo. Separa responsabilidades entre backend (Django) y frontend (React), con documentación centralizada y scripts de utilidad.

---

## 📁 Estructura del Proyecto

```
monorepo_erp/
├── .github/                     # 📚 Instrucciones para agentes AI
│   ├── copilot-instructions.md  # Índice maestro para Copilot/AI
│   └── instructions/            # Guías específicas por tecnología
│       ├── architecture.md
│       ├── backend-guide.md
│       ├── frontend-guide.md
│       ├── typescript.instructions.md
│       ├── security.md
│       ├── testing.md
│       ├── deployment.md
│       └── glossary.md
├── backend/                     # Django 5.1 + DRF + Celery + Channels
│   ├── sw_erp/                  # Proyecto principal (settings, celery, asgi)
│   ├── <apps>/                  # Apps por dominio (bodegas, cuentas, cotizaciones, etc.)
│   ├── ENV/                     # Entorno virtual Python (no versionado)
│   ├── manage.py
│   ├── req.txt                  # Dependencias
│   └── db.sqlite3               # BD local (desarrollo)
├── frontend/                    # Vite + React + TypeScript + TailwindCSS
│   ├── src/
│   │   ├── components/          # Componentes de presentación
│   │   ├── pages/               # Páginas/rutas principales
│   │   ├── services/            # Llamadas HTTP (ApiService.ts)
│   │   ├── store/               # Redux slices y thunks
│   │   ├── routes/              # Configuración de rutas
│   │   └── hooks/               # Hooks personalizados
│   ├── package.json
│   └── vite.config.ts
├── dev/                         # 🛠️ Recursos de desarrollo
│   ├── docs/                    # Documentación técnica viva
│   └── scripts/                 # Scripts de setup y mantenimiento
│       ├── setup/               # Inicialización (setup_superuser, seed_data)
│       ├── development/         # Desarrollo (reset_local_data)
│       └── maintenance/         # Mantenimiento
├── postman/                     # Colecciones Postman
├── AGENTS.md                    # Guía operativa para agentes AI
└── README.md                    # Este archivo
```

---

## 🚀 Inicio Rápido

### Prerequisitos
- Python 3.11+
- Node.js 18+
- Git

### Opción 1: Automático (Windows)
```cmd
REM Desde scripts/setup/
setup_full_environment.bat
```

### Opción 2: Manual

#### Backend
```cmd
cd backend
python -m venv ENV
ENV\Scripts\activate
pip install -r req.txt
python manage.py migrate
python manage.py createsuperuser
python ..\scripts\setup\setup_superuser.py
python ..\scripts\setup\seed_data.py
python manage.py runserver
```

#### Frontend
```cmd
cd frontend
npm install
npm run dev
```

**Ver guía completa**: [`.github/INICIALIZACION.md`](.github/INICIALIZACION.md)

---

## 📚 Documentación

Toda la documentación del proyecto está centralizada en `.github/`:

### 🤖 Guías para Agentes de IA

Este proyecto incluye instrucciones específicas para GitHub Copilot y otros agentes de IA:

- **[Instrucciones Canónicas](.github/copilot-instructions.md)**: Contexto del proyecto, arquitectura, convenciones y workflows
- **[Guía para Agentes AI](AGENTS.md)**: Principios transversales, workflow recomendado y formato de respuestas
- **Instrucciones Granulares** en `.github/instructions/`:
  - [Python](.github/instructions/python.instructions.md) - Estándares PEP 8, type hints, modelos Django
  - [TypeScript](.github/instructions/typescript.instructions.md) - Strict mode, interfaces, React patterns
  - [Backend](.github/instructions/backend.instructions.md) - Django/DRF, Celery, multi-tenant
  - [Frontend](.github/instructions/frontend.instructions.md) - Redux Toolkit, BaseService, TailwindCSS
  - [Markdown](.github/instructions/markdown.instructions.md) - Estructura de documentos
  - [Shell](.github/instructions/shell.instructions.md) - Scripts bash/batch/PowerShell
- **[Exclusiones](.copilotignore)**: Archivos excluidos del contexto de Copilot (secretos, cachés, binarios)

> **Cómo usar**: En VS Code, las instrucciones se aplican automáticamente según el tipo de archivo. Para configurar manualmente: `Ctrl+Shift+P` → "Configure Chat" → "Chat Instructions".

### Guías de Exploración
- **[Inicialización del Sistema](.github/INICIALIZACION.md)**: Setup completo, scripts, flujos de inicialización
- **[Módulo 1: Empresas](.github/EXPLORACION_EMPRESAS.md)**: Bugs encontrados, arquitectura, lecciones aprendidas

### Instrucciones Técnicas
- **[Backend (Django)](.github/instructions/backend-instructions.md)**: Modelos, serializers, vistas, Celery, Channels
- **[Frontend (React)](.github/instructions/frontend-instructions.md)**: Componentes, rutas, estado Redux, servicios HTTP
- **[Redux Toolkit y Thunks](.github/instructions/redux-thunks.md)**: Gestión de estado global, operaciones asíncronas
- **[Estructura del Store](.github/instructions/store-structure.md)**: Índice completo de slices Redux

### Módulos de Proceso
- **[Seguridad](.github/instructions/security.md)**: JWT, CORS/CSRF, validaciones, rotación de claves
- **[Flujo de PR](.github/instructions/pr-flow.md)**: Convenciones de commits, ramas, revisiones
- **[CI/CD](.github/instructions/ci-cd.md)**: Pipelines, linters, tests automáticos, despliegue

### Módulos de Calidad
- **[Testing](.github/instructions/testing.md)**: Estrategias unit/integración/e2e, cobertura, fixtures
- **[Performance](.github/instructions/performance.md)**: Optimización de queries (N+1), lazy-load, memoización
- **[Observabilidad](.github/instructions/observability.md)**: Logging, métricas (Prometheus), tracing

### Soporte
- **[Playbooks](.github/instructions/playbooks.md)**: Onboarding, manejo de incidentes, rollback, troubleshooting
- **[Glosario](.github/instructions/glossary.md)**: Términos de negocio y técnicos
- **[Tasks Instructions](.github/instructions/tasks.instructions.md)**: Tareas de VS Code

**Punto de entrada**: [`.github/copilot-instructions.md`](.github/copilot-instructions.md)

---

## 🔧 Scripts Disponibles

### Setup (`scripts/setup/`)
- **`setup_superuser.py`**: Configura superusuario con empresa, grupos, personalización
- **`seed_data.py`**: Pobla BD con datos de prueba (empresas, usuarios, items, bodegas)
- **`reset_db.py`**: ⚠️ DESTRUCTIVO - Elimina DB y re-ejecuta migraciones

### Development (`scripts/development/`)
- **`create_groups.py`**: Crea/actualiza grupos de permisos

### Maintenance (`scripts/maintenance/`)
- **`backup_db.py`**: Crea backup de db.sqlite3

**Ver detalle**: [`scripts/README.md`](scripts/README.md)

---

## 🎯 Stack Tecnológico

### Backend
- Django 5.1 (Python 3.11+)
- Django REST Framework (APIs REST)
- Celery + Redis (tareas asíncronas)
- Channels + Daphne (WebSockets, tiempo real)
- SimpleJWT (autenticación JWT)
- SQLite (desarrollo) / PostgreSQL (producción)

### Frontend
- React 18 (TypeScript)
- Vite (build tool)
- Redux Toolkit (estado global)
- TailwindCSS (estilos)
- Axios (HTTP client)
- React Router (rutas)

---

## 📝 Convenciones

- **Commits**: Imperativo español, <= 50 caracteres (ver [pr-flow.md](.github/instructions/pr-flow.md))
- **Código Backend**: PEP 8, docstrings obligatorios, tipado preferido
- **Código Frontend**: ESLint + Prettier, tipado estricto TypeScript
- **Tests**: Cobertura >= 70% en módulos críticos
- **Documentación**: Siempre en `.github/`, español

---

## 🐛 Reporte de Bugs

Revisar módulos de exploración en `.github/EXPLORACION_*.md` para bugs conocidos y lecciones aprendidas.

---

## 📧 Contacto

Sistema ERP para **Snabbit**  
Documentación actualizada: 2025-11-05
