# Auditoría inicial del flujo de retroalimentaciones — Órdenes de Trabajo v3

Fecha: 2026-04-13
Responsable: Auditoría técnica

---

## 1. Ubicación y entidades
- El flujo de retroalimentaciones (feedback/comentarios) en órdenes de trabajo v3 depende actualmente de los comentarios y seguimientos registrados sobre la OT, sin modelo formal dedicado.
- Estados responsables: `pendiente`, `en_proceso`, `completada`, `cerrada`.
- Documentación relevante: `dev/docs/flujos_operativos.md`, `dev/docs/sistemas.md`, `dev/docs/analisis.md`, `dev/docs/notas.md`.

## 2. Gestión de retroalimentaciones
- El sistema permite adjuntar comentarios/seguimiento durante la vida de la OT (detalle web y móvil).
- Faltan validaciones obligatorias que exijan feedback antes de cerrar la OT. El feedback no es un estado, sino solo un registro en el historial.

## 3. Estados y validaciones
- No existe un estado intermedio tipo "Feedback pendiente" ni una transición bloqueada por ausencia de retroalimentación.
- El avance de OT a cierre depende formalmente de la finalización de la rendición o prefactura, no de tener feedback registrado.

## 4. Puntos de mejora / riesgos
- Feedback es opcional, no garante de calidad documental.
- Ambigüedad entre comentario, seguimiento y retroalimentación (sin distinción estructural en modelo ni UI).
- Potencial ausencia de historial verdadero (si solo se guarda comentario final).
- Falta de evidencias de validación por roles (quién debe/o puede dejar feedback).
- Riesgo de cerrar OTs sin feedback o con feedback inconsistente.

## 5. Recomendaciones iniciales
1. Formalizar feedback como requisito estructurado antes de permitir cierre (requisito UI y backend).
2. Mantener historial completo (quién, cuándo, qué tipo de comentario/feedback).
3. Incorporar alertas para OTs por cerrar sin retroalimentación.
4. Diferenciar en documentación y UI entre comentario operativo y feedback de calidad.
5. Definir roles/responsables para la retroalimentación (técnico, cliente, supervisor).

---

Diagnóstico realizado solo a nivel documental. No se hicieron cambios. Siguiente paso sugerido: revisión de código y propuesta de mejoras técnicas/UX si se requiere fortalecer el flujo.