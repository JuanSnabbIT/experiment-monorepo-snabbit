# Análisis técnico: Unificación simplificada de cards en Matching Manual OT V3

> Documento consolidado.
>
> Para cumplir la política de documentación del repositorio, este análisis debe mantenerse dentro de:
> - `dev/docs/analisis-matching-manual-ot-v3.md`
> - o, si corresponde por alcance, `dev/docs/analisis.md`

Este archivo no debe conservar contenido analítico duplicado. La fuente de verdad para este tema es `dev/docs/analisis-matching-manual-ot-v3.md`.
2. OTs seleccionadas ⇒ frontend llama a `/contratos?otIds=...` (o `/contratos?clienteId=...`)
3. Opcional: setea valor por defecto de fecha y tipo de cambio (ej: `/tipo-cambio?fecha=...`)
4. Al confirmar ⇒ request final al backend con el payload unificado

---

## 3. Cambios/retoques necesarios
### Backend
- Verificar que endpoints existentes soporten filtros compuestos (ej: buscar OTs por cliente, contratos por varias OTs)
- El endpoint de confirmación final ya existe: `POST /api/v3/prefacturas-otv3/` acepta `ot_ids`, `contrato_ids` (opcional), `fecha_prefactura`, `moneda_prefactura` y resuelve automáticamente las tasas de cambio (tasa_dolar_usada / tasa_uf_usada) a partir de la fecha indicada. **Gap concreto identificado:** el frontend debe asegurarse de enviar explícitamente `moneda_prefactura` y `fecha_prefactura`; si se omiten, el backend usa valores por defecto que podrían no coincidir con lo mostrado al usuario en el flujo unificado.
- Validar reglas de negocio integradas (relación contratos/OTs, disponibilidad de datos, validaciones cruzadas)

### Frontend
- Unir componentes/cards independientes en stepper o un solo formulario compuesto, manteniendo modularidad
- Mejorar gestión de dependencias reactivas: cuando cambia cliente, limpiar OTs/contratos previos; cuando OTs cambian, actualizar contratos
- Precargar datos comunes (hoy/tipo cambio) al abrir el flujo
- Exponer validaciones visuales fuertes en pasos encadenados

---

## 4. Retos técnicos y posibles conflictos/validaciones
- **Sincronización dependiente:** Cuando cambia el cliente, todo lo descendente debe resetearse (OTs, contratos, fecha, tipoCambio).
- **Consistencia de lotes:** No permitir avanzar con OTs/contratos de clientes distintos.
- **Validación cruzada:** Contratos deben corresponder (a nivel backend y visible en frontend) con OTs seleccionadas y cliente.
- **Cambio de fecha después de selección:** Debe actualizar tipo de cambio y quizás disparar advertencias.
- **Carga en batch:** La consulta de OTs o contratos con filtros complejos puede ser costosa.

---

## 5. Sugerencias de componentes/lógica
### Frontend
- Stepper unificado (`ClientStepper`) que orquesta ClientSelector, OTSelector, ContractSelector, DateAndFXSelector.
- Uso de lógica de efecto controlada para limpiar/resetear datos en cascada cuando cambia el cliente o la selección base, coordinando estado local del flujo con Redux Toolkit.
- Consultas y mutaciones remotas implementadas con RTK Query, reutilizando la configuración existente del proyecto en `frontend/src/services/RtkQueryService.ts`.
- Validaciones instantáneas y feedback visual claro (deshabilitar avance si falta información esencial).
- Estado global del flujo en slices de Redux Toolkit; evitar proponer Context API, Recoil, Zustand o React Query, ya que no corresponden a la base actual.

### Backend
- El endpoint de confirmación final ya existe: `POST /api/v3/prefacturas-otv3/` recibe `{ ot_ids: [int], contrato_ids?: [int], fecha_prefactura?, moneda_prefactura?, comentario? }`. No es necesario crear uno nuevo; el cliente se infiere y valida desde las OTs.
- Para obtener OTs elegibles por cliente, usar `GET /api/v3/prefacturas-otv3/ots-elegibles/?cliente_id=<int>`.
- Para obtener contratos disponibles, usar `GET /api/contratos/contratos/?cliente_id=<int>` (filtro existente en ContratoEmpresaClienteViewSet).
- Validación de consistencia y reglas de negocio (OTs del mismo cliente, sin prefactura activa duplicada, tasas de cambio) ya están implementadas en una transacción atómica en el endpoint existente.

---

## 6. Riesgos/escenarios complejos
- Cambios concurrentes (cambios de contrato/OT entre selección y confirmación: validar en backend antes de finalizar)
- Latencias por búsquedas complejas de contratos/OTs/cliente
- Inconsistencias back <-> front ante cambios rápidos o dobles submits
- Falta de reglas estrictas deja validar sólo en front: OJO, validar sí o sí todo en backend
- Adaptación de tests automáticos (e2e/backend) a flujo unificado

---

## Conclusión
Esta guía técnica busca ser apoyo claro y directo para la asignación, desarrollo y QA del flujo unificado en el módulo Matching Manual OT V3, alineando a frontend y backend desde el diseño hasta la entrega.