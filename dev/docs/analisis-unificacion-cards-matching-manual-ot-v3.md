# Análisis técnico: Unificación simplificada de cards en Matching Manual OT V3

## Objetivo
Uniformar la experiencia de usuario y lógica técnica al fusionar los siguientes pasos (cards) en un solo flujo en el módulo Matching Manual OT V3:
- Seleccionar cliente
- Seleccionar OTs
- Contratos
- Fecha prefactura y tipo de cambio

Este análisis contrasta el impacto y necesidades en backend y frontend para orientar su desarrollo y validación.

---

## 1. Flujo propuesto unificado
### Descripción
El usuario, desde un único entrypoint, podrá:
1. Seleccionar un cliente (empresa/pagador).
2. Visualizar y seleccionar OTs (órdenes de trabajo) activas pendientes de pre-facturación asociadas a ese cliente.
3. Vincular/seleccionar contratos aplicables a la selección de OTs.
4. Definir la fecha de pre-factura y el tipo de cambio relevante.

El objetivo es minimizar pantallas y pases de datos intermedios, consolidando en un solo formulario/stepper.

### Entrada esperada
- ID de usuario autenticado
- Cliente seleccionado
- (Una vez cliente seleccionado) OTs cargadas desde backend
- (Opcional) Contratos disponibles tras elegir OTs
- Fecha propuesta (sugerida: hoy) y tipo de cambio (puede precargarse consultando API)

### Salida esperada
- Objeto resumen con cliente, OTs seleccionadas, contratos, fecha, tipo de cambio

---

## 2. Interacción frontend <-> backend
### Backend
- Endpoints para:
    - Buscar OTs filtradas por cliente
    - Buscar contratos filtrados por OTs
    - Sugerir fecha y obtener tipo de cambio
    - Recibir/salvar la selección final unificada

### Frontend
- Stepper/formulario reactivo, modular, que solicita información necesaria progresivamente
- Sincronización/validación de estados (cliente → OTs → contratos → fecha/tipo cambio)
- Refrescos automáticos ante cambios arriba

### Secuencia de llamadas
1. Usuario elige cliente ⇒ frontend llama a `/ots?clienteId=...` ⇒ muestra OTs
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