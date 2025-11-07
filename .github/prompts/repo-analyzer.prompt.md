---
mode: "agent"
model: "gpt-4o"
tools: ["githubRepo", "search/codebase"]
description: "Analiza el repo y organiza la documentación operativa dentro de .github/ sin tocar el código. Genera índices, guías por área, resúmenes estructurados y propuestas de mejora idempotentes."
---

# 🎯 Objetivo
Estandarizar y centralizar las instrucciones del proyecto **dentro de `.github/`**, para que personas y agentes entiendan rápido la arquitectura, flujos y convenciones. El resultado debe ser **idempotente**: múltiples ejecuciones no deben crear duplicados ni romper enlaces.

# 🧱 Reglas y Alcance
- **Zona segura:** Solo leer/escribir dentro de `.github/`. No mover ni borrar nada fuera.
- **Código intocable:** No modificar archivos de `backend/`, `frontend/`, `scripts/` u otros.
- **Conservador con lo existente:** Si hay documentación útil fuera de `.github/`, **referenciarla** con enlaces relativos; no copiar/pegar masivamente.
- **Lenguaje:** Español técnico, claro y consistente.
- **Formato:** Markdown para guías; JSON para resúmenes.
- **Enlaces robustos:** Siempre usar rutas relativas y verificar que existen.

# ⚙️ Parámetros (con defaults)
- profundidad = media | profunda
- enfoque     = general | frontend | backend | docs
- formato     = markdown
- idioma      = es
> Si no se pasan, usar los valores por defecto de arriba.

# 🧭 Proceso (determinista e idempotente)
1) **Detección de estructura**
   - Identificar si es monorepo (carpetas como `frontend/`, `backend/`, `scripts/`).
   - Registrar archivos clave: `README.md`, `Dockerfile`, `package.json`, `pyproject.toml`, CI/CD, infra.
2) **Inventario de documentación**
   - Mapear todos los `.md` relevantes dentro y fuera de `.github/`.
   - Detectar duplicados temáticos, huecos y redundancias.
3) **Diagnóstico (tabla P0–P3)**
   - Producir una tabla `Aspecto | Observaciones | Prioridad`.
4) **Plan de organización**
   - Definir y **actualizar sin duplicar** la siguiente estructura, creando/actualizando archivos:
     - `.github/INSTRUCTIONS_INDEX.md` (Índice navegable)
     - `.github/INSTRUCTIONS_MAIN.md` (Visión global)
     - `.github/INSTRUCTIONS_FRONTEND.md` (si existe `frontend/`)
     - `.github/INSTRUCTIONS_BACKEND.md` (si existe `backend/`)
     - `.github/meta/REPO_SUMMARY.json` (resumen estructurado)
     - `.github/prompts/` (dejar tu propio prompt y plantillas)
   - Si el repo no requiere subdivisión, solo `.github/INSTRUCTIONS.md`.
5) **Generación/Actualización de contenido**
   - Reescribir secciones con tono didáctico, sin repetir lo mismo en varios archivos; usar enlaces.
   - Extraer **comandos útiles** y **tareas comunes** (instalación, test, run local, build, lint).
   - Añadir **advertencias** para áreas sensibles (secrets, despliegue).
6) **Propuesta de mejoras fuera de `.github/`**
   - Si harían falta renombres o movimientos (fuera de `.github/`), generar **`.github/CHANGE_PLAN.md`** con un plan de PR (lista de movimientos y justificación) **sin ejecutarlos**.
7) **Validaciones**
   - Verificar enlaces relativos.
   - Garantizar idempotencia (si el archivo ya existe, consolidar en lugar de duplicar).
   - Marcar TODOs mínimos y próximos pasos.
8) **Salida final**
   - Escribir/actualizar los archivos anteriores y mostrar un **resumen de cambios** (qué se creó/actualizó/omitió).

# 🧩 Estructura esperada
- `.github/INSTRUCTIONS_INDEX.md`  → Mapa global, TOC por área, enlaces a todo.
- `.github/INSTRUCTIONS_MAIN.md`   → Contexto, arquitectura, módulos, flujos clave.
- `.github/INSTRUCTIONS_FRONTEND.md` (opcional)
- `.github/INSTRUCTIONS_BACKEND.md` (opcional)
- `.github/meta/REPO_SUMMARY.json` → { "type": "monorepo|single", "areas": [...], "build": {...}, "tests": {...}, "scripts": {...} }
- `.github/CHANGE_PLAN.md`         → Propuestas de refactor documental (si aplica).
- `.github/prompts/`               → Prompts y plantillas futuras.

# 🧪 Criterios de calidad
- Ningún archivo fuera de `.github/` fue modificado.
- Documentación sin redundancias, con secciones coherentes.
- Índice navegable, enlaces verificados.
- Resultado reproducible e idempotente.
- Tono técnico y claro, con glosario mínimo.

# ✍️ Plantillas (usa y adapta)

## `.github/INSTRUCTIONS_INDEX.md`
```markdown
# Índice de Documentación

## Vista rápida
- Arquitectura: [.github/INSTRUCTIONS_MAIN.md](./INSTRUCTIONS_MAIN.md)
- Frontend: [.github/INSTRUCTIONS_FRONTEND.md](./INSTRUCTIONS_FRONTEND.md)
- Backend: [.github/INSTRUCTIONS_BACKEND.md](./INSTRUCTIONS_BACKEND.md)

## Documentos relevantes fuera de .github/
- [Modelo de negocio](../MODELO_NEGOCIO.md)
- [Arquitectura Frontend](../arquitectura/frontend.md)
- [Arquitectura Sistema](../arquitectura/sistema.md)
*(verifica existencia antes de enlazar)*

## Tareas comunes
- Instalar
- Ejecutar tests
- Levantar entorno local
- Build/CI

## Cambios recientes
- Ver `.github/meta/REPO_SUMMARY.json`
.github/INSTRUCTIONS_MAIN.md
markdown
Copiar código
# Instrucciones del Proyecto

## Contexto
Propósito del sistema y stakeholders clave.

## Estructura
| Carpeta   | Propósito |
|----------|-----------|
| frontend | ...       |
| backend  | ...       |
| scripts  | ...       |

## Flujos clave
- Autenticación
- Facturación
- Despliegue

## Tareas comunes (comandos)
- Instalar: ...
- Run local: ...
- Tests: ...
- Lint/Format: ...

## Buenas prácticas
- Convenciones de ramas, commits y PR
- Estándares de logs y manejo de errores

## Glosario
Términos del dominio y acrónimos.
.github/meta/REPO_SUMMARY.json (esquema)
json
Copiar código
{
  "repo_type": "monorepo|single",
  "areas": ["frontend","backend","scripts"],
  "build": { "frontend": {...}, "backend": {...} },
  "test": { "frontend": {...}, "backend": {...} },
  "workflows": ["CI", "CD"],
  "docs": { "index": ".github/INSTRUCTIONS_INDEX.md" },
  "last_generated_at": "ISO-8601",
  "quality": { "duplicates": [], "gaps": [], "warnings": [] }
}
.github/CHANGE_PLAN.md (solo si hace falta)
markdown
Copiar código
# Plan de cambios propuesto (no aplicado)
- Mover `arquitectura/frontend.md` a `docs/arquitectura/frontend.md`
- Unificar `COPILOT_SETUP.md` y `copilot-instructions.md`

Justificación, impacto y pasos.
🧾 Diagnóstico: tabla
Siempre incluir en INSTRUCTIONS_MAIN.md:

pgsql
Copiar código
| Aspecto | Observaciones | Prioridad |
|---------|---------------|-----------|
| Estructura monorepo | frontend/, backend/, scripts/ detectados | P0 |
| Redundancias Copilot | COPILOT_SETUP.md vs copilot-instructions.md | P1 |
| Índice faltante | No hay TOC global | P0 |
🚦 Modo de ejecución (chat)
/repo-docs: profundidad=profunda enfoque=backend

Si faltan parámetros, usar defaults.

perl
Copiar código

---

## Cómo se comporta (resumen práctico)
1) Escanea el repo, **no toca el código**, y crea/actualiza **sólo** archivos de `.github/`.  
2) Genera **INDEX**, **MAIN**, guías por **área**, un **SUMMARY.json** y un **CHANGE_PLAN.md** si detecta reorganizaciones útiles fuera de `.github/`.  
3) Reutiliza lo que ya tienes (p. ej. `COPILOT_SETUP.md`, `copilot-instructions.md`, `ARQUITECTURA_*`, `MODELO_*`, etc.) enlazándolo desde el índice, en lugar de duplicar.

## Sugerencia de estructura (adaptada a lo que se ve en tu captura)
- `.github/INSTRUCTIONS_INDEX.md` → enlaza:
  - `../arquitectura/frontend.md`, `../arquitectura/sistema.md`
  - `../COPILOT_SETUP.md`, `../copilot-instructions.md`
  - `../MODELO_DATOS_SISTEM.md?`, `../MODELO_NEGOCIO.md`
  - `../FLUJO_FACTURACION.md`, `../MODULO_AUTENTICACION.md`, etc.
- `.github/INSTRUCTIONS_FRONTEND.md` → comandos npm/yarn, estructura, build, testing, lint, CI.
- `.github/INSTRUCTIONS_BACKEND.md` → framework, scripts, run local, test, env vars, migraciones, CI.
- `.github/meta/REPO_SUMMARY.json` → lista de módulos (autenticación, orden de trabajo, confidencialidad), flujos (facturación) y gaps.

> Si más adelante decides **mover** esos `.md` del raíz a una carpeta `docs/`, el agente ya te dejará un **CHANGE_PLAN.md** con los pasos sugeridos para hacerlo en una PR separada.

---
