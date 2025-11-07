---
title: "Flujo de Pull Requests"
scope: "proceso"
status: "active"
last_updated: "2025-11-03"
---

# Flujo de Pull Requests

## Objetivo
Definir el proceso de creación, revisión y merge de Pull Requests (PRs) para mantener calidad, trazabilidad y colaboración efectiva en el monorepo ERP.

## Reglas clave

### 1. Convenciones de commits

- **Formato**: imperativo en español, <= 50 caracteres en título.
- **Estructura**:
  ```
  <Tipo>: <Descripción breve>
  
  [Cuerpo opcional: contexto, motivación, decisiones técnicas]
  
  Refs #<issue> | Closes #<issue>
  ```
- **Tipos comunes**: `Feat` (nueva funcionalidad), `Fix` (corrección de bug), `Refactor` (cambio sin alterar comportamiento), `Docs` (documentación), `Test` (tests), `Chore` (tareas de mantenimiento).
- Ejemplo:
  ```
  Feat: añadir filtro por bodega en endpoint productos
  
  Implementa query param `bodega` para filtrar productos por bodega.
  Incluye tests de integración y validación de permisos.
  
  Refs #123
  ```

### 2. Estrategia de ramas

- **Rama principal**: `main` (producción estable).
- **Ramas de desarrollo**: `develop` (si se usa GitFlow) o feature branches directamente desde `main`.
- **Nomenclatura**:
  - Feature: `feature/<issue>-descripcion` (ej. `feature/123-filtro-bodega`)
  - Fix: `fix/<issue>-descripcion` (ej. `fix/456-cors-error`)
  - Chore: `chore/descripcion` (ej. `chore/actualizar-deps`)
- **Merges**: preferir **squash merge** a `main` para historial limpio; rebase local antes de merge.

### 3. Estructura del PR

Usar plantilla en `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Objetivo
Descripción breve del propósito del PR.

## Cambios
- Archivo 1: propósito del cambio.
- Archivo 2: propósito del cambio.

## Cómo probar
```cmd
cd backend
backend\ENV\Scripts\python.exe manage.py test <app>
```

## Checklist
- [ ] Tests añadidos/actualizados (pasan localmente).
- [ ] Linters pasan sin errores (backend: `ruff`, frontend: ESLint).
- [ ] Migraciones generadas y revisadas (si aplica).
- [ ] Documentación actualizada (docstrings, README, si aplica).
- [ ] Variables de entorno documentadas en `.env.example` (si aplica).
- [ ] Revisión de seguridad (no hay secretos hardcodeados).

## Notas de despliegue
Consideraciones especiales para deploy (migraciones, variables nuevas, servicios adicionales).

## Referencias
Refs #<issue> | Closes #<issue>
```

### 4. Revisión de código

#### Revisor debe verificar
- [ ] Cambios alineados con objetivo del PR (sin scope creep).
- [ ] Código sigue estándares del repo ([standards.md](./procesos/standards.md)).
- [ ] Tests cubren casos principales y edge cases.
- [ ] Linters y formateo aplicados (no hay warnings).
- [ ] Documentación actualizada (docstrings, comentarios justificados).
- [ ] No hay secretos hardcodeados ni datos sensibles expuestos.
- [ ] Migraciones son correctas y no destructivas (validar con DBA si es crítico).
- [ ] Performance: no hay N+1, queries ineficientes, re-renders excesivos.

#### Autor debe
- Responder a comentarios en <= 48h.
- Aplicar cambios solicitados o justificar decisiones técnicas.
- Re-solicitar revisión tras aplicar cambios significativos.

### 5. Merge

- **Condiciones previas**:
  - Al menos 1 aprobación (2 si es cambio crítico).
  - CI/CD pasa (linters, tests, build).
  - Conflictos resueltos.
- **Estrategia**: squash merge a `main` (historial limpio); mensaje del merge = título del PR.
- **Post-merge**: eliminar rama feature; verificar despliegue automático (si aplica).

### 6. PRs grandes

- **Evitar PRs > 500 líneas**: dividir en PRs lógicos y atómicos.
- **Marcar como draft**: si el PR está en progreso y no listo para revisión final.
- **Contexto adicional**: proporcionar diagramas, screenshots, videos si ayuda a entender cambios.

### 7. Rollback

- **Revertir PR**: si causa incidente en producción, revertir inmediatamente y abrir issue para fix.
- **Comunicar**: notificar al equipo en canal de incidentes; documentar causa raíz.

## Checklist de PR

- [ ] Commits con mensajes claros (imperativo, español, <= 50 caracteres).
- [ ] Rama nombrada según convención (`feature/`, `fix/`, `chore/`).
- [ ] PR usa plantilla completa (objetivo, cambios, cómo probar, checklist).
- [ ] Tests añadidos/actualizados; linters y formateo aplicados.
- [ ] Al menos 1 aprobación; CI/CD pasa sin errores.
- [ ] Migraciones revisadas (si aplica); documentación actualizada.
- [ ] Sin secretos hardcodeados; revisión de seguridad realizada.

## Referencias cruzadas
- [Estándares](./procesos/standards.md): convenciones de código y formato.
- [Testing](./testing.md): estrategias de tests y cobertura.
- [Seguridad](./procesos/security.md): revisión de seguridad en PRs.
- [CI/CD](./procesos/ci-cd.md): pipelines automáticos y validaciones.

---
