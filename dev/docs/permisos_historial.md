# Historial — Motor de Permisos

Reemplaza a `auditoria_rrhh_contratos.md` y `rrhh_correcciones_sin_roles.md`
(2026-06-03), que describían un estado del código ya superado — afirmaban
"el motor de roles no existe" cuando el motor actual (`core/permissions.py`,
`TienePermisoDeRol`/`requiere_roles`) ya cubre todas las apps de escritura
sensible del sistema.

- **2026-06-24**: se crea `IsAdminOrRRHH`/`IsSuperAdmin` en `core/permissions.py`,
  aplicado solo a `rrhh` y `calendario`.
- **2026-07-24**: refactor completo del motor de permisos (ver
  `.claude/plans/arma-el-plan-formal-transient-bachman.md` para el detalle):
  - Fase 0: se cierra el hueco de `DEFAULT_PERMISSION_CLASSES = AllowAny`
    global en `sw_erp/settings.py`.
  - Fase 1: se generaliza `IsAdminOrRRHH` en `TienePermisoDeRol`/`requiere_roles`,
    con catálogo de roles en `DescripcionGrupo` + comando `sync_roles_catalogo`.
  - Fase 2: rollout de `requiere_roles(...)` a las 9 apps restantes de
    escritura sensible (`retroalimentacion`, `visitas`, `cotizaciones`,
    `empresas`/`cuentas`, `notificaciones`/`core`, `bodegas`, `recursos`,
    `ordentrabajov2`/`v3`, `contratos`).
  - Fase 3: unificación de `AuthorityCheck`/`AuthorityCheckNav` en
    `AuthorityGuard` (frontend) + fix de un bug de Rules of Hooks.
  - Fase 4: se cruzan roles del frontend (`pages.config.ts`) contra los
    permisos reales del backend para los 12 roles; se corrigen mismatches
    puntuales (`finanzas` y `tecnico` ganan acceso de solo lectura —
    `list`/`retrieve` — a Contratos, Órdenes de Trabajo, Cotizaciones y
    Guías de Bodega vía `get_permissions()`), un bug de omisión en el
    Calendario (capa "Contratos" sin `skip` para `rrhh` puro) y una
    sobre-concesión propia revertida (`rrhh` en Recursos > Software).
    Verificado end-to-end con Playwright contra los 13 usuarios de prueba
    (`qa_<rol>@test.local`, ver `crear_usuarios_qa_roles.py`).
