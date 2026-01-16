---
Responsable: -
Email: -
Proxima_revision: -
Estado: index
---

# Documentación — dev/docs/

Índice y reglas de uso para la documentación viva del proyecto.

Plantilla YAML (colocar al inicio de cada archivo):

---
Responsable: -
Email: -
Proxima_revision: -
Estado: canonical|staging|archived
---

Reglas rápidas:
- Mantener en `dev/docs/` únicamente documentación viva del sistema.
- `analisis.md`: decisiones técnicas y especificaciones canónicas.
- `sistemas.md`: inventario de sistemas en producción y patrones.
- `planificacion.md`: roadmap y épicas activas.
- `flujos_operativos.md`: procedimientos y checklists operativos.
- `changelog.md`: timeline de entregas y cierres de épicas.
- `notas.md`: staging / notas rápidas (máximo 1–2 líneas por nota).

Uso de migración desde `notas.md`:
- Cuando una nota se estabiliza y se copia a un documento canónico, dejar la nota original en `notas.md` y añadir al final de la entrada la marca

  ✅ Migrado a <archivo> (YYYY-MM-DD)

Ejemplo de contribución rápida:
1. Edita el archivo correspondiente en `dev/docs/`.
2. Si el cambio es canónico, actualiza also `changelog.md`.
3. Si migras desde `notas.md`, añade la marca `✅ Migrado a ...` en la nota original.
---
Responsable: -
Email: -
Proxima_revision: -
Estado: index
---

# dev/docs — Índice y reglas de uso

Este directorio contiene la documentación viva del proyecto. Plantilla mínima para documentos canónicos:

```yaml
Responsable: -          # Nombre o rol responsable (Product / Backend / DevOps)
Email: -                # Opcional: contacto
Proxima_revision: -     # YYYY-MM-DD o '-'
Estado: canonical|staging # canonical = documento vivo, staging = notas temporales
```

Archivos canónicos:
- `analisis.md` — Decisiones técnicas y especificaciones.
- `sistemas.md` — Inventario de sistemas en producción y patterns.
- `planificacion.md` — Roadmap y épicas activas.
- `flujos_operativos.md` — Procedimientos operativos y checklists.
- `changelog.md` — Historial de entregas y releases.
- `notas.md` — Bloc de notas corto y staging. Mantener breve; marcar entradas migradas con `✅ Migrado a <archivo>`.

Reglas rápidas:
- Añadir front-matter YAML en la cabeza de cada documento.
- No borrar contenido de `notas.md`: cuando migres a un canónico, añade al final de la nota original `✅ Migrado a <archivo>` con enlace.
- Si un documento canónico cambia, registrar la actualización en `changelog.md`.
