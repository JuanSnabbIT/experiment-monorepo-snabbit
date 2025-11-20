# Guía para Agentes AI - Monorepo ERP

Esta guía define pautas transversales para **todos los agentes de inteligencia artificial** (GitHub Copilot, Claude, otros LLMs) trabajando en este repositorio.

---

## 🎯 Principios Generales

### 1. Planificación antes de ejecución
- **Antes de tocar múltiples archivos**: Propón un plan corto en pasos numerados.
- **Ejecuta por lotes**: Agrupa cambios relacionados, no hagas edits uno por uno.
- **Valida el plan**: Si detectas ambigüedades o conflictos potenciales, pide aclaración.

### 2. Claridad y trazabilidad
- **Explica el "por qué"**: Cada cambio relevante debe tener justificación en el mensaje de commit.
- **Commits atómicos**: Un commit = un cambio lógico completo y funcional.
- **Mensajes descriptivos**: Imperativo español, ≤50 caracteres (ver `.github/copilot-instructions.md`).

### 3. Confirmación en acciones destructivas
- **Siempre pide confirmación** antes de:
  - Eliminar archivos o directorios con contenido no trivial
  - Reescribir lógica de negocio compleja sin tests
  - Modificar configuraciones críticas (settings.py, package.json, migrations)
  - Hacer cambios que afecten producción o datos persistentes

### 4. Respeto al contexto del proyecto
- **Lee primero**: Consulta `.github/copilot-instructions.md` y docs en `docs/` antes de proponer cambios.
- **Sigue convenciones**: Usa los patterns definidos en `.github/instructions/*.instructions.md`.
- **No inventes**: No agregues dependencias, frameworks o herramientas sin justificación explícita.

---

## 📁 Estructura de Instrucciones

```
.github/
├── copilot-instructions.md          # Instrucciones canónicas del proyecto
└── instructions/
    ├── python.instructions.md       # Aplica a **/*.py
    ├── typescript.instructions.md   # Aplica a **/*.{ts,tsx}
    ├── markdown.instructions.md     # Aplica a **/*.md
    ├── shell.instructions.md        # Aplica a **/*.{sh,bat,ps1}
    ├── backend.instructions.md      # Contexto Django/DRF
    ├── frontend.instructions.md     # Contexto React/Redux
    └── ...
```

**Cómo se aplican**: VS Code Copilot carga automáticamente el archivo `.instructions.md` que coincide con el patrón `applyTo` del archivo actual.

---

## 🔍 Workflow Recomendado

### Al recibir una tarea:

1. **Entender el alcance**
   - ¿Qué archivos/módulos se verán afectados?
   - ¿Hay dependencias entre cambios?
   - ¿Qué tests/validaciones existen?

2. **Consultar contexto**
   - Lee `.github/copilot-instructions.md` para arquitectura general
   - Lee el `.instructions.md` específico del tipo de archivo que vas a modificar
   - Revisa docs relacionadas en `docs/` si existen (ej: migraciones, CHANGELOGs)

3. **Proponer plan**
   - Lista pasos numerados
   - Indica archivos a modificar
   - Menciona riesgos conocidos

4. **Ejecutar y validar**
   - Haz cambios en lotes pequeños
   - Ejecuta linters/formatters/tests tras cada lote
   - Commitea con mensajes claros

5. **Documentar**
   - Actualiza README o docs si es necesario
   - Si el cambio es complejo, añade comentarios en código
   - Si introduces breaking changes, documéntalos en CHANGELOG

---

## ⚠️ Riesgos Comunes a Evitar

| ❌ No hagas | ✅ Haz en su lugar |
|-------------|-------------------|
| Tocar models.py sin generar migrations | Ejecuta `makemigrations` y valida `migrate --plan` |
| Usar `any` en TypeScript sin justificar | Define tipos explícitos o usa `unknown` |
| Hardcodear URLs o paths | Usa variables de entorno o paths relativos |
| Eliminar código "que parece no usarse" | Busca referencias con grep/semantic search primero |
| Instalar packages sin actualizar req.txt/package.json | Siempre sincroniza archivos de dependencias |
| Commitear credenciales o .env | Revisa `.copilotignore` y `.gitignore` |

---

## 📝 Formato de Respuestas (para agentes de chat)

Cuando completes una tarea, siempre incluye:

1. **Archivos modificados**: Lista con paths relativos
2. **Resumen de cambios**: Qué se hizo y por qué
3. **Comandos ejecutados**: Para reproducir o validar
4. **Pruebas realizadas**: Tests, linters, builds ejecutados
5. **Riesgos y rollback**: Qué podría salir mal y cómo revertir

**Ejemplo de respuesta estructurada**:

```
## Cambios realizados

### Archivos modificados:
- backend/ordentrabajov2/models.py
- backend/ordentrabajov2/serializers.py
- docs/CHANGELOG_ORDEN_TRABAJO_V2.md

### Resumen:
Agregado campo `fecha_cierre` a modelo OrdenDeTrabajo para tracking de cierre administrativo.

### Comandos ejecutados:
```bash
python manage.py makemigrations
python manage.py migrate --plan
python manage.py test ordentrabajov2
```

### Validaciones:
✓ Migrations generadas sin conflictos
✓ Tests pasando (12/12)
✓ No breaking changes en API

### Riesgos:
- Migración altera tabla en producción (reversible)
- Rollback: `python manage.py migrate ordentrabajov2 <previous_migration>`
```

---

## 🔗 Referencias

- Instrucciones canónicas: `.github/copilot-instructions.md`
- Configuración VS Code: `.vscode/settings.json`
- Exclusiones: `.copilotignore`
- Documentación del proyecto: `README.md` y `docs/`

---

**Última actualización**: 2025-11-18
