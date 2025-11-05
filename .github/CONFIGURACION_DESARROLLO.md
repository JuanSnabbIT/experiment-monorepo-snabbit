---
title: "Configuración de Desarrollo"
scope: "development"
status: "active"
last_updated: "2025-11-05"
---

# ⚙️ Configuración de Desarrollo

## Objetivo
Documentar la configuración completa del entorno de desarrollo local, incluyendo VS Code tasks, extensiones recomendadas, debuggers y workflows.

---

## 🖥️ VS Code

### Tasks Configuradas (`.vscode/tasks.json`)

El proyecto incluye **18 tasks automatizadas** divididas en categorías:

#### Backend Tasks

| Task | Descripción | Comando |
|------|-------------|---------|
| **Backend: Runserver** | Inicia servidor Django (desarrollo) | `python manage.py runserver` |
| **Backend: Daphne (ASGI)** | Inicia servidor ASGI (WebSockets) | `daphne sw_erp.asgi:application` |
| **Backend: Celery Worker** | Inicia worker Celery | `celery -A sw_erp worker` |
| **Backend: Celery Beat** | Inicia scheduler Celery | `celery -A sw_erp beat` |
| **Backend: Make Migrations** | Genera migraciones | `python manage.py makemigrations` |
| **Backend: Migrate** | Aplica migraciones | `python manage.py migrate` |
| **Backend: Run Tests** | Ejecuta tests Django | `python manage.py test` |

#### Setup Tasks

| Task | Descripción | Comando |
|------|-------------|---------|
| **Setup: Superusuario + Empresa** | Configura superuser con empresa y permisos | `python scripts/setup/setup_superuser.py` |
| **Setup: Seed Datos Prueba** | Pobla BD con datos de prueba | `python scripts/setup/seed_data.py` |
| **Setup: Reset Base Local** | ⚠️ Elimina DB y re-migra | `python scripts/setup/reset_db.py` |
| **Development: Reset Local (Wrapper)** | Wrapper interactivo para reset | `python scripts/development/reset_local_data.py` |

#### Data Tasks

| Task | Descripción | Comando |
|------|-------------|---------|
| **Data: Ejecutar Notebook Creacion Usuarios** | Ejecuta notebook de carga masiva | `jupyter nbconvert --execute Creacion_Usuarios_Masiva.ipynb` |

#### Frontend Tasks

| Task | Descripción | Comando |
|------|-------------|---------|
| **Frontend: Dev Server** | Inicia Vite dev server | `npm run dev` |
| **Frontend: Build** | Build de producción | `npm run build` |
| **Frontend: Test** | Ejecuta tests Jest | `npm run test` |

#### Composite Tasks

| Task | Descripción | Depende de |
|------|-------------|------------|
| **Start: Backend (Runserver + Celery)** | Inicia backend completo | Runserver + Worker + Beat (paralelo) |
| **Start: All (Backend + Frontend)** | Inicia sistema completo | Backend + Frontend (paralelo) |

### Cómo Ejecutar Tasks

**Opción 1: Command Palette**
1. `Ctrl+Shift+P` → "Tasks: Run Task"
2. Seleccionar task de la lista

**Opción 2: Terminal → Run Task**
1. `Terminal` → `Run Task...`
2. Seleccionar task

**Opción 3: Keybindings personalizados**
```json
// .vscode/keybindings.json (crear si no existe)
[
  {
    "key": "ctrl+shift+b",
    "command": "workbench.action.tasks.runTask",
    "args": "Start: All (Backend + Frontend)"
  }
]
```

---

## 🔧 Extensiones Recomendadas

### Backend (Python + Django)

| Extensión | Publisher | Propósito |
|-----------|-----------|-----------|
| **Python** | Microsoft | Soporte Python, IntelliSense, debugging |
| **Pylance** | Microsoft | Language server rápido, tipado |
| **Django** | Baptiste Darthenay | Snippets y sintaxis Django templates |
| **autoDocstring** | Nils Werner | Generación automática de docstrings |
| **Black Formatter** | Microsoft | Formateo automático Python |
| **Ruff** | Astral Software | Linter ultra-rápido |

### Frontend (React + TypeScript)

| Extensión | Publisher | Propósito |
|-----------|-----------|-----------|
| **ESLint** | Microsoft | Linter JavaScript/TypeScript |
| **Prettier** | Prettier | Formateo automático código |
| **ES7+ React/Redux/React-Native snippets** | dsznajder | Snippets React/Redux |
| **Tailwind CSS IntelliSense** | Tailwind Labs | Autocompletado Tailwind |
| **Auto Rename Tag** | Jun Han | Renombra tags HTML/JSX automáticamente |

### General

| Extensión | Publisher | Propósito |
|-----------|-----------|-----------|
| **GitLens** | GitKraken | Anotaciones Git inline |
| **Error Lens** | Alexander | Muestra errores inline |
| **Path Intellisense** | Christian Kohler | Autocompletado de rutas |
| **Better Comments** | Aaron Bond | Colorea comentarios (`TODO`, `FIXME`, etc.) |
| **REST Client** | Huachao Mao | Test de APIs desde VS Code |

### Instalación Masiva

Crea `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "batisteo.vscode-django",
    "njpwerner.autodocstring",
    "ms-python.black-formatter",
    "charliermarsh.ruff",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "dsznajder.es7-react-js-snippets",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "eamodio.gitlens",
    "usernamehw.errorlens",
    "christian-kohler.path-intellisense",
    "aaron-bond.better-comments",
    "humao.rest-client"
  ]
}
```

VS Code mostrará una notificación para instalar todas las extensiones recomendadas.

---

## 🐛 Debuggers

### Backend (Python/Django)

Crea `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Django",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/backend/manage.py",
      "args": [
        "runserver",
        "0.0.0.0:8000"
      ],
      "django": true,
      "justMyCode": true,
      "cwd": "${workspaceFolder}/backend"
    },
    {
      "name": "Python: Django Tests",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/backend/manage.py",
      "args": [
        "test",
        "${file}"
      ],
      "django": true,
      "justMyCode": false,
      "cwd": "${workspaceFolder}/backend"
    },
    {
      "name": "Python: Current File",
      "type": "python",
      "request": "launch",
      "program": "${file}",
      "console": "integratedTerminal",
      "justMyCode": true,
      "cwd": "${fileDirname}"
    }
  ]
}
```

**Uso**:
1. Poner breakpoint (click en margen izquierdo)
2. `F5` o `Run` → `Start Debugging`
3. Seleccionar configuración ("Python: Django")

### Frontend (React)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Chrome: Frontend",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/frontend/src",
      "sourceMapPathOverrides": {
        "webpack:///src/*": "${webRoot}/*"
      }
    }
  ]
}
```

**Uso**:
1. Iniciar frontend: `npm run dev` (desde `frontend/`)
2. Poner breakpoint en código TypeScript
3. `F5` → Abre Chrome con debugger conectado
4. Interactuar con UI → breakpoints se activan en VS Code

---

## 📝 Settings Workspace

Crea `.vscode/settings.json` (configuración solo para este proyecto):

```json
{
  // Python
  "python.defaultInterpreterPath": "${workspaceFolder}/backend/ENV/Scripts/python.exe",
  "python.linting.enabled": true,
  "python.linting.ruffEnabled": true,
  "python.linting.pylintEnabled": false,
  "python.formatting.provider": "black",
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    }
  },
  
  // JavaScript/TypeScript
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  
  // Django templates
  "[django-html]": {
    "editor.quickSuggestions": {
      "strings": true
    }
  },
  
  // Files
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true,
    "**/node_modules": true,
    "**/.venv": true,
    "**/ENV": false // Mostrar ENV para facilitar navegación
  },
  
  // Editor
  "editor.rulers": [88, 120], // PEP 8 (88) y límite suave (120)
  "editor.wordWrap": "on",
  "editor.minimap.enabled": true,
  
  // Git
  "git.ignoreLimitWarning": true,
  
  // Terminal
  "terminal.integrated.defaultProfile.windows": "Command Prompt",
  "terminal.integrated.cwd": "${workspaceFolder}"
}
```

---

## 🔄 Workflows Comunes

### 1. Iniciar Sistema Completo

**Opción A: Task compuesta**
```cmd
Ctrl+Shift+P → "Tasks: Run Task" → "Start: All (Backend + Frontend)"
```

**Opción B: Manual (3 terminales)**
```cmd
REM Terminal 1: Backend
cd backend
ENV\Scripts\python.exe manage.py runserver

REM Terminal 2: Celery (opcional)
cd backend
ENV\Scripts\python.exe -m celery -A sw_erp worker --loglevel=info

REM Terminal 3: Frontend
cd frontend
npm run dev
```

### 2. Aplicar Cambios en Modelos

```cmd
REM Generar migraciones
Task: "Backend: Make Migrations"

REM Revisar archivo generado
backend/<app>/migrations/####_<nombre>.py

REM Aplicar migraciones
Task: "Backend: Migrate"
```

### 3. Probar Endpoint con REST Client

Crea archivo `tests.http`:
```http
### Login
POST http://localhost:8000/auth/jwt/create
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}

### Guardar token
@token = {{login.response.body.access}}

### Listar empresas
GET http://localhost:8000/api/empresas/
Authorization: Bearer {{token}}

### Crear empresa
POST http://localhost:8000/api/empresas/
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "nombre": "Empresa Test",
  "rut_empresa": "12345678-9",
  "direccion_principal": "Calle Falsa 123"
}
```

Click en "Send Request" encima de cada bloque `###`.

### 4. Debugging de Thunk Redux

**Frontend**:
1. Abrir DevTools (`F12`)
2. Tab "Redux" (instalar extensión Redux DevTools)
3. Disparar acción
4. Ver:
   - State antes/después
   - Action payload
   - Diff de cambios

**Código**:
```typescript
// src/store/slices/empresa/empresaSlice.ts
export const listaEmpresasThunk = createAsyncThunk(
  'empresa/listaEmpresasThunk',
  async (_, {rejectWithValue}) => {
    console.log('[Thunk] Iniciando listaEmpresasThunk'); // ← Debug
    try {
      const response = await ApiService.fetchData({
        url: '/api/empresas/',
        method: 'get'
      });
      console.log('[Thunk] Respuesta:', response.data); // ← Debug
      return response.data;
    } catch(error: any) {
      console.error('[Thunk] Error:', error); // ← Debug
      return rejectWithValue(error.response.data);
    }
  }
);
```

### 5. Ejecutar Tests

**Backend**:
```cmd
Task: "Backend: Run Tests"

REM O específico:
cd backend
ENV\Scripts\python.exe manage.py test empresas
ENV\Scripts\python.exe manage.py test empresas.tests.test_models
```

**Frontend**:
```cmd
Task: "Frontend: Test"

REM O con coverage:
cd frontend
npm run test -- --coverage
```

---

## 📦 Gestión de Dependencias

### Backend (Python)

**Instalar nueva dependencia**:
```cmd
cd backend
ENV\Scripts\pip.exe install <paquete>
ENV\Scripts\pip.exe freeze > req.txt
```

**Actualizar dependencias**:
```cmd
ENV\Scripts\pip.exe install --upgrade -r req.txt
```

### Frontend (Node.js)

**Instalar nueva dependencia**:
```cmd
cd frontend
npm install <paquete>
```

**Actualizar dependencias**:
```cmd
npm update
npm audit fix  # Corregir vulnerabilidades
```

---

## 🔍 Troubleshooting

### "Module not found" (Python)

**Causa**: Entorno virtual no activado o intérprete incorrecto.

**Solución**:
1. VS Code: `Ctrl+Shift+P` → "Python: Select Interpreter"
2. Seleccionar `backend/ENV/Scripts/python.exe`

### "Cannot find module" (TypeScript)

**Causa**: Falta `npm install` o rutas mal configuradas.

**Solución**:
```cmd
cd frontend
npm install
```

Verificar `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Task falla con "python no encontrado"

**Causa**: Ruta del intérprete incorrecta en `tasks.json`.

**Solución**:
Verificar que existe `backend/ENV/Scripts/python.exe`. Si no:
```cmd
cd backend
python -m venv ENV
ENV\Scripts\pip.exe install -r req.txt
```

### Redis connection refused

**Causa**: Redis no está corriendo.

**Solución**:
```cmd
REM Con Docker:
docker run -d --name redis-erp -p 6379:6379 redis:latest

REM Verificar:
docker exec -it redis-erp redis-cli ping
```

---

## 📚 Referencias

- [Tareas de VS Code](./instructions/tasks.instructions.md)
- [Backend Instructions](./instructions/backend-instructions.md)
- [Frontend Instructions](./instructions/frontend-instructions.md)
- [Playbooks](./instructions/playbooks.md)

---

**Última actualización**: 2025-11-05  
**Mantenido por**: Equipo de desarrollo ERP
