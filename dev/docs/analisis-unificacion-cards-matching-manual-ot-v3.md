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
- Crear/ajustar endpoint de recepción final para registrar la "prefactura en armado" (cliente, OTs, contratos, fecha, tipo cambio)
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
- Hooks de efecto para limpiar/resetear datos en cascada (useEffect/observer/react-query custom hooks).
- Validaciones instantáneas, visual feedback claro (deshabilitar avance si falta info esencial).
- Estado global/local en contexto (Context API/recoil/zustand según base del proyecto).

### Backend
- Un endpoint POST/PUT para la "prefactura en armado" que reciba el payload completo unificado (cliente, OTs, contratos, fecha, tipo de cambio).
- Posible consolidación de endpoints de obtención de contratos para multiples OTs/cliente en uno único optimizado.
- Validación de consistencia y reglas de negocio en una sola transacción backend.

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