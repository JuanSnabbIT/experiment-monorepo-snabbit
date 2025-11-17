# Cierre Administrativo de Orden de Trabajo (OT)

Este documento describe el flujo de cierre administrativo de una OT, los endpoints disponibles, el modelo `CierreAdministrativoOT`, y el uso del campo JSON `resultado` con un esquema sugerido y ejemplos. Incluye además una matriz de manejo para Frontend.

- Postman: `postman/OT-Cierre.postman_collection.json`
- Endpoints base: bajo `/api/` (según `backend/sw_erp/urls.py` y `OrdenDeTrabajoViewSet`)

## Resumen del Flujo

1) Validación de cierre (solo lectura)
- Verifica condiciones por tipo de detalle de OT:
  - Cotización: debe tener `fecha_facturacion` definida.
  - Visita: debe tener retroalimentación aplicada con respuestas.
  - Compra: estado debe ser “1” (completada), con ítems y guía(s) de salida válida(s) (estados “E” o “T”).
- Retorna un resumen con banderas por dominio y si la OT se puede cerrar.

2) Cierre administrativo (persistencia)
- Crea o actualiza un `CierreAdministrativoOT` (OneToOne por OT) con:
  - Usuario, fecha, si es válido, el `resultado` (JSON), y un comentario.
- Soporta cierre “forzado” para registrar un cierre observado en casos que no cumplan todas las validaciones.

3) Consulta de cierre
- Recupera el `CierreAdministrativoOT` existente para mostrar el estado final del cierre y sus observaciones.

## Endpoints

- GET `/api/ordentrabajo/{id}/validar-cierre/`
  - Respuesta: JSON con `puede_cerrar`, `validaciones` y `detalles` (ver esquema más abajo).

- POST `/api/ordentrabajo/{id}/cerrar/`
  - Body JSON: `{ "comentario": string?, "forzar": boolean? }`
  - Efecto: crea/actualiza el cierre y retorna su estado (`valido`, `resultado`, etc.).
  - Comportamiento implementado:
    - Si ya existe un cierre y `forzar=false` → `409 Conflict` + payload del cierre existente.
    - Si `forzar=true` → requiere usuario autenticado con permiso (`is_staff`, `is_superuser` o `ordentrabajo.force_close_ot`) y `comentario` obligatorio.

- GET `/api/ordentrabajo/{id}/cierre/`
  - Respuesta: JSON con el `CierreAdministrativoOT` (si existe) o `404` si no hay cierre.

## Modelo: `CierreAdministrativoOT`

Campos relevantes:
- `orden`: OneToOne a `OrdenDeTrabajo` (relación `cierre_administrativo`).
- `usuario`: `empresas.UsuarioEmpresa` (puede ser `null`).
- `fecha_cierre`: `DateTime` (auto).
- `valido`: `bool` — verdadero si todas las validaciones pasan al momento del cierre.
- `resultado`: `JSONField` — resumen estructurado de validaciones, razones y metadatos.
- `comentario`: `Text` — observaciones o justificación (recomendado en cierres forzados).

## Campo `resultado` (JSON): Uso y Esquema

Propósito: encapsular el resumen de validaciones y las razones de cierre o de observación en un formato estable para Frontend, reporting y auditoría.

Estructura recomendada (establecida por `validar_cierre_ot`/`cerrar_ot`):
```json
{
  "version": 1,
  "puede_cerrar": true,
  "forzado": false,
  "validaciones": {
    "cotizacion": true,
    "visitasoporte": true,
    "compra": true
  },
  "detalles": {
    "cotizacion": [],
    "visitasoporte": [],
    "compra": []
  },
  "refs": {
    "orden_id": 123,
    "cotizacion_id": 456,
    "visitasoporte_id": 789,
    "compra_id": 321
  }
}
```

Notas:
- `version`: facilita compatibilidad futura si cambia el formato.
- `puede_cerrar`: evaluación actual en memoria; en un cierre creado con `valido=true` debe estar alineado a esa foto.
- `forzado`: `true` si el cierre se registra pese a validaciones fallidas (el cierre quedará con `valido=false`).
- `validaciones`: banderas por dominio mínimo: `cotizacion`, `visitasoporte`, `compra`.
- `detalles`: lista de observaciones por dominio (mensajes cortos/razones).
- `refs`: referencias útiles para UI o auditoría (opcional y seguro si no expone datos sensibles).

Ejemplo — Cierre válido:
```json
{
  "version": 1,
  "puede_cerrar": true,
  "forzado": false,
  "validaciones": { "cotizacion": true, "visitasoporte": true, "compra": true },
  "detalles": { "cotizacion": [], "visitasoporte": [], "compra": [] },
  "refs": { "orden_id": 30, "cotizacion_id": 101, "visitasoporte_id": 202, "compra_id": 303 }
}
```

Ejemplo — Cierre observado (forzado):
```json
{
  "version": 1,
  "puede_cerrar": false,
  "forzado": true,
  "validaciones": { "cotizacion": true, "visitasoporte": false, "compra": true },
  "detalles": {
    "cotizacion": [],
    "visitasoporte": ["Sin retroalimentación registrada"],
    "compra": []
  },
  "refs": { "orden_id": 31, "visitasoporte_id": 404 }
}
```

### Buenas prácticas
- Siempre incluir `version` y `puede_cerrar`.
- En cierres forzados, marcar `forzado=true` y exigir `comentario` no vacío.
- Mantener mensajes de `detalles` consistentes y orientados a acción (qué falta, dónde completarlo).
- Evitar datos sensibles en `resultado`; preferir ids en `refs` y resolver detalle vía APIs de negocio.

## Matriz de manejo del campo `resultado` (Frontend)

| Condición | Implicancia | Acción recomendada UI | CTA/Atajo sugerido |
|---|---|---|---|
| `puede_cerrar=true` y todas `validaciones=true` | Cierre listo | Habilitar botón “Cerrar OT” | Botón primario activo |
| `validaciones.cotizacion=false` | Falta factura | Mostrar alerta y link a Cotización | “Revisar cotización” |
| `validaciones.visitasoporte=false` | Falta retroalimentación | Mostrar alerta y link a Visita | “Completar retroalimentación” |
| `validaciones.compra=false` | Compra incompleta/guía inválida | Mostrar alerta y link a Compra/Bodega | “Completar compra/guía” |
| `puede_cerrar=false` y `forzado=false` | No cerrable | Deshabilitar cierre normal; permitir “Cerrar con observación” si rol lo permite | “Forzar cierre” con confirmación |
| Cierre existente `valido=false` (`forzado=true`) | Cierre observado | Mostrar distintivo/tooltip con `detalles` y `comentario` | “Ver cierre” / “Subsanar pendientes” |

Checklist de UI al confirmar cierres forzados:
- Requerir `comentario` (justificación) no vacío.
- Mostrar resumen de `detalles` a modo de confirmación consciente.
- Registrar usuario responsable (lo hace backend) y timestamp.

## Errores y códigos

- `GET validar-cierre`: 200 con payload de validación siempre que la OT sea visible al usuario.
- `POST cerrar`:
  - 200: cierre creado/actualizado.
  - 409 Conflict: cierre ya existe y `forzar=false` (se retorna payload del cierre existente).
  - 401 Unauthorized: si `forzar=true` sin autenticación.
  - 403 Forbidden: si `forzar=true` y el usuario no cuenta con permiso/rol.
  - 400 Bad Request: si `forzar=true` y falta `comentario`.
- `GET cierre`:
  - 200: retorno del cierre.
  - 404: sin cierre registrado.

## Notas de implementación

- El helper de insumos evita conflictos OneToOne de `DetalleTrabajo.insumo` al seleccionar/crear `GuiaSalida` válida por detalle.
- Para evitar discrepancias por recarga de módulos en Jupyter, las validaciones trabajan preferentemente con claves `*_id`.
- En producción se recomienda política de autorización para cierres forzados y auditoría del `comentario`.

---

¿Requieres que el endpoint `POST /cerrar` devuelva `409` cuando ya existe cierre y `forzar=false`? Puedo ajustar la vista para normalizar este comportamiento.
