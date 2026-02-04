---
Responsable: Fabián
Email: -
Proxima_revision: 2026-08-04
Estado: index
---

# dev/docs — Índice y reglas de uso

Este directorio contiene la documentación viva del proyecto.

Plantilla mínima para documentos canónicos:

```yaml
Responsable: Fabián      # Nombre o rol responsable
Email: -                 # Opcional: contacto
Proxima_revision: 2026-08-04
Estado: canonical|staging|archived
```

Archivos canónicos:
- `analisis.md` — Decisiones técnicas, hallazgos y especificaciones.
- `sistemas.md` — Inventario de sistemas en producción y patrones técnicos.
- `planificacion.md` — Roadmap y épicas activas.
- `flujos_operativos.md` — Procedimientos operativos y checklists.
- `changelog.md` — Historial de entregas y releases.
- `notas.md` — Bloc de notas corto (staging).

Reglas rápidas:
- Mantener en `dev/docs/` únicamente documentación viva del sistema.
- Añadir front-matter YAML en la cabeza de cada documento.
- No borrar contenido de `notas.md`: al migrar, añadir la marca `✅ Migrado a <archivo> (YYYY-MM-DD)` al final de la nota original.
- Si un documento canónico cambia, registrar la actualización en `changelog.md`.
