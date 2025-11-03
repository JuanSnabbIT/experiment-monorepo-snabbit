# Instrucciones para Asistencia de Código en ERP Monorepo

## 1. Propósito y alcance del proyecto

Este repositorio implementa un **sistema ERP completo** mediante una arquitectura monorepo que separa responsabilidades entre backend y frontend:

- **Backend (`backend/`)**: Django 5.1 con ASGI (Daphne + Channels) para tiempo real, Celery para tareas asíncronas, DRF para API REST con autenticación JWT.
- **Frontend (`frontend/`)**: Vite + React + TypeScript + TailwindCSS, consumo de API REST y estado con Redux Toolkit.

El objetivo es mantener un código **seguro, consistente, testeable y documentado**, facilitando tanto el desarrollo humano como la asistencia de agentes IA (GitHub Copilot, etc.).

---

## 2. Principios generales

### 2.1. Prioridades de desarrollo
1. **Seguridad**: No exponer credenciales, validar entradas, controlar accesos.
2. **Exactitud**: Código correcto y verificado antes de sugerir cambios.
3. **Completitud**: Incluir tests, documentación y validaciones necesarias.
4. **Velocidad**: Optimizar sin comprometer las prioridades anteriores.

### 2.2. Calidad del código (DX)
- Mantener **cambios mínimos y localizados** (diffs pequeños).
- Respetar convenciones del repo: PEP 8 (Python), ESLint + Prettier (TypeScript/React).
- **Explicar el "por qué"** de cada cambio en commits y PRs.
- **Validar antes de actuar**: no inventar rutas, archivos, APIs o comandos sin verificar.

### 2.3. Modularidad y claridad
- Separar responsabilidades: lógica de negocio, presentación, persistencia, servicios.
- Código legible por humanos y agentes IA: docstrings, comentarios justificados, nombres claros.
- Evitar duplicidad; centralizar lógica compartida en servicios/helpers.

---

## 3. Estructura general del repositorio

```
monorepo_erp/
├── backend/                # Django 5.1 + DRF + Celery + Channels
│   ├── sw_erp/             # Proyecto principal (settings, celery, asgi)
│   ├── <apps>/             # Apps por dominio (bodegas, cuentas, cotizaciones, etc.)
│   ├── ENV/                # Entorno virtual Python (no versionado)
│   ├── manage.py
│   ├── req.txt             # Dependencias
│   └── db.sqlite3          # BD local
├── frontend/               # Vite + React + TypeScript
│   ├── src/
│   │   ├── components/     # Componentes de presentación
│   │   ├── pages/          # Páginas/rutas principales
│   │   ├── services/       # Llamadas HTTP (BaseService.ts)
│   │   ├── store/          # Redux slices y thunks
│   │   ├── routes/         # Configuración de rutas
│   │   └── hooks/          # Hooks personalizados
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── .github/
│   ├── copilot-instructions.md  # Este archivo (raíz)
│   └── instructions/            # Módulos temáticos
│       ├── backend-instructions.md
│       ├── frontend-instructions.md
│       ├── standards.md
│       ├── security.md
│       ├── pr-flow.md
│       ├── ci-cd.md
│       ├── testing.md
│       ├── performance.md
│       ├── observability.md
│       ├── playbooks.md
│       └── glossary.md
└── .vscode/
    └── tasks.json          # Tareas de VS Code
```

---

## 4. Cómo debe actuar Copilot y otros agentes IA

### 4.1. Verificación antes de cambios
- **Leer contexto** del repo con herramientas de búsqueda/lectura antes de proponer cambios.
- **No inventar** nombres de archivos, endpoints, variables o comandos.
- **Validar** que las rutas existen y que las dependencias están instaladas.

### 4.2. Cambios incrementales y explicados
- Generar **diffs pequeños y atómicos** (un concepto por cambio).
- Incluir **justificación técnica** (por qué) y **cómo probar** (comandos cmd.exe para Windows).
- Reportar **estado de calidad**: Build/Lint/Tests = PASS/FAIL.

### 4.3. Tests y documentación
- Añadir tests cuando se modifique lógica de negocio, endpoints o UI visible.
- Documentar funciones/clases públicas con docstrings (Python) o JSDoc/TSDoc (TypeScript).

### 4.4. Seguridad
- **No hardcodear secretos**; usar variables de entorno y proponer `.env.example`.
- Validar permisos en endpoints y componentes protegidos.
- Evitar exponer datos sensibles en logs o respuestas de error.

### 4.5. Convenciones del entorno
- **Comandos**: usar `cmd.exe` (Windows).
- **Backend local**: invocar `backend/ENV/Scripts/python.exe` (cwd: `backend/`).
- **Frontend**: comandos npm desde `frontend/`.

---

## 5. Enlaces a módulos temáticos

Cada módulo está en `.github/instructions/` y sigue una estructura estándar con frontmatter YAML, objetivo, reglas clave, checklist y referencias cruzadas.

### 5.1. Módulos técnicos por stack
- **[Backend (Django)](./instructions/backend-instructions.md)**: modelos, serializers, vistas, Celery, Channels, JWT, permisos.
- **[Frontend (React)](./instructions/frontend-instructions.md)**: componentes, rutas, estado (Redux), servicios HTTP, tipado.
- **[Estándares de código](./instructions/standards.md)**: PEP 8, ESLint, Prettier, convenciones de nombres, estructura de carpetas.

### 5.2. Módulos de procesos
- **[Seguridad](./instructions/security.md)**: manejo de secretos, CORS/CSRF, validaciones, JWT, rotación de claves.
- **[Flujo de PR](./instructions/pr-flow.md)**: convenciones de commits, ramas, revisiones, plantillas de PR.
- **[CI/CD](./instructions/ci-cd.md)**: pipelines, linters, tests automáticos, despliegue Docker.

### 5.3. Módulos de calidad
- **[Testing](./instructions/testing.md)**: estrategias unit/integración/e2e, cobertura, fixtures, mocks (msw).
- **[Performance](./instructions/performance.md)**: optimización de queries (N+1), lazy-load, memoización, índices DB.
- **[Observabilidad](./instructions/observability.md)**: logging, métricas (Prometheus), tracing, health checks.

### 5.4. Módulos de soporte
- **[Playbooks](./instructions/playbooks.md)**: onboarding, manejo de incidentes, rollback, troubleshooting común.
- **[Glosario](./instructions/glossary.md)**: términos de negocio (ERP, bodega, contrato, OT) y técnicos (JWT, thunk, serializer).

---

## 6. Plantilla estándar de un módulo

Cada archivo en `.github/instructions/` debe seguir esta estructura:

```markdown
---
title: "<Nombre del módulo>"
scope: "<Alcance: backend, frontend, full-stack, proceso, etc.>"
status: "active | draft | deprecated"
last_updated: "YYYY-MM-DD"
---

# <Título del módulo>

## Objetivo
Descripción breve del propósito de este módulo y a quién va dirigido (desarrolladores, IA, ambos).

## Reglas clave
1. **Regla 1**: Explicación técnica del "qué" y el "por qué".
   - Ejemplo de código o configuración.
2. **Regla 2**: Justificación y contexto.
   - Checklist o pasos si aplica.

## Checklist / Procedimiento
- [ ] Paso 1: acción concreta.
- [ ] Paso 2: validación o comando.

## Referencias cruzadas
- Ver [Módulo relacionado](./otro-modulo.md) para más detalles.
- Documentación externa: [enlace oficial](https://example.com).

---
```

**Longitud máxima sugerida**: 100-120 líneas (excluyendo código de ejemplo extenso).

---

## 7. Prompts cortos sugeridos para Copilot

### Crear un nuevo módulo
```
Crea un módulo de instrucciones en `.github/instructions/<nombre>.md` siguiendo la plantilla estándar. Incluye: frontmatter YAML, objetivo, 5-7 reglas clave con ejemplos, checklist y referencias cruzadas a otros módulos.
```

### Actualizar un módulo existente
```
Actualiza `.github/instructions/<nombre>.md` con las nuevas reglas sobre <tema>. Mantén la estructura, añade ejemplos de código y actualiza `last_updated`.
```

### Generar checklist de PR
```
Genera un checklist de PR basado en las instrucciones de `pr-flow.md`, `testing.md` y `security.md`. Incluye: tests, linters, migraciones, comandos para probar.
```

### Validar cumplimiento de estándares
```
Revisa el archivo <ruta> según `standards.md` y `backend-instructions.md`. Reporta violaciones de PEP 8, falta de tipado, docstrings faltantes, y propón correcciones.
```

---

## 8. Directivas operativas para la IA (resumen)

- **Priorizar**: Seguridad > Exactitud > Completitud > Velocidad.
- **Verificar** antes de actuar: leer archivos, buscar rutas, confirmar dependencias.
- **Mantener cambios mínimos** y localizados; evitar refactorizaciones masivas sin solicitarlo.
- **Proporcionar tests** al cambiar comportamiento público (endpoints, lógica, UI).
- **Reportar calidad**: Build/Lint/Tests = PASS/FAIL (incluir causa si FAIL).
- **Usar comandos nativos de Windows (cmd.exe)**; invocar Python con `backend/ENV/Scripts/python.exe`.
- **Explicar el "por qué"** de cada cambio y cómo probar localmente.
- **No exponer secretos**: usar variables de entorno y proponer `.env.example`.

---

## 9. Estilo de respuesta del modelo

- **Idioma**: español.
- **Formato**: rutas entre backticks (`` `backend/sw_erp/settings.py` ``); comandos en bloques etiquetados como `cmd` (una línea por comando).
- **Estructura**:
  1. Preámbulo breve orientado a la acción.
  2. Secciones con encabezados claros (Análisis, Cambios, Cómo probar, Estado de calidad).
  3. Lista de archivos tocados y propósito de cada cambio.
  4. Comandos para probar (cmd.exe).
  5. Estado de calidad: PASS/FAIL (si FAIL, incluir causa breve).
- **Evitar**: narrativa extensa, fluff, repetición de contexto ya conocido.

---

## 10. Convenciones del repositorio

### 10.1. Endpoints de API
- APIs REST bajo `/api/` (ej.: `/api/productos/`, `/api/cotizaciones/`).
- Autenticación bajo `/auth/` (Djoser + SimpleJWT): `/auth/jwt/create`, `/auth/jwt/refresh`.

### 10.2. Autenticación y permisos
- JWT con `access` (5h) y `refresh` (10h) tokens (configurables en `settings.py`).
- Por defecto: `IsAuthenticated` en todas las vistas; `AllowAny` debe justificarse.
- Ver [security.md](./instructions/security.md) y [backend-instructions.md](./instructions/backend-instructions.md) para detalles.

### 10.3. Tareas asíncronas
- Celery con `@shared_task`; programación con `django-celery-beat`.
- Definir en `<app>/tasks.py`; autodiscovery configurado en `sw_erp/celery.py`.

### 10.4. Estructura de carpetas
- **Backend**: apps por dominio (`bodegas/`, `cuentas/`, etc.) con `models.py`, `serializers.py`, `views.py`, `urls.py`, `tasks.py`, `signals.py`.
- **Frontend**: `src/components/`, `src/pages/`, `src/services/`, `src/store/`, `src/routes/`, `src/hooks/`.

---

## 11. Comportamiento esperado de la IA

1. **Referenciar archivos concretos**: `backend/sw_erp/settings.py`, `frontend/src/services/BaseService.ts`.
2. **Justificar cambios**: explicar el "por qué" técnico.
3. **Proporcionar comandos para probar localmente** (cmd.exe, rutas absolutas desde workspace root).
4. **Añadir tests mínimos** cuando se modifique lógica de negocio o endpoints.
5. **No hardcodear secretos**; proponer variables de entorno en `.env.example`.
6. **Reportar estado de calidad** tras cambios: Build/Lint/Tests = PASS/FAIL.

---

## 12. Tareas de desarrollo (VS Code)

Este repositorio incluye tareas en `.vscode/tasks.json` para iniciar servicios locales:

- **Backend**: "Backend: Runserver", "Backend: Daphne (ASGI)", "Backend: Celery Worker", "Backend: Celery Beat".
- **Frontend**: "Frontend: Dev Server", "Frontend: Build", "Frontend: Test".
- **Compuestos**: "Start: Backend (Runserver + Celery)", "Start: All (Backend + Frontend)".

Consulta [tasks.instructions.md](./instructions/tasks.instructions.md) para detalles, prerrequisitos y resolución de problemas.

---

## 13. Notas finales

- **Módulos faltantes propuestos** (para creación futura):
  - `api-contracts.md`: contratos de API, versionado, breaking changes.
  - `ux-ui.md`: guía de componentes, accesibilidad, design tokens.
  - `i18n.md`: internacionalización y localización (si aplica).
  - `deployment.md`: estrategias de despliegue, rollback, blue-green, canary.

- **Mantén la coherencia**: al crear nuevos módulos, actualiza los enlaces en este archivo raíz y valida referencias cruzadas.

- **Evolución continua**: este sistema de instrucciones debe actualizarse conforme el proyecto crece. Propón cambios mediante PR siguiendo [pr-flow.md](./instructions/pr-flow.md).

---

**Última actualización**: 2025-11-03