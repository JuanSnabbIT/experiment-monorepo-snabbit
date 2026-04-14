# Análisis de Cumplimiento de la Regla de Negocio sobre Orden de Compra en Flujos de Pre-factura y Contrato

Regla de negocio:
> "Una Orden de Compra (OC) es un instrumento interno de la empresa prestadora de servicios mediante el cual se autoriza y gestiona la adquisición de materiales, insumos o servicios necesarios para ejecutar una Orden de Trabajo. Corresponde exclusivamente a la operación interna de la empresa y no forma parte del acuerdo comercial formalizado con el cliente."

---

## 1. Identificación de puntos del flujo donde interviene la Orden de Compra (OC)

**Flujo de Pre-factura:**
- La OC aparece como documento asociado a órdenes de trabajo (OT) vinculadas con una pre-factura.
- Usualmente, la OC es registrada para autorización interna antes de la emisión del documento de pre-facturación.
- No se detecta exposición de la OC ni sus datos (número, adjunto, proveedor, monto) en la generación, previsualización o emisión de pre-facturas en la interfaz cliente.

**Flujo de Contrato:**
- En el alta y edición de contratos, no se registra la OC como parte del acuerdo contractual con el cliente.
- No existen referencias a la OC ni inclusión de sus detalles en los componentes visualizados por el cliente durante la negociación o formalización del contrato.

---

## 2. Evaluación de cumplimiento de la restricción

- **Lógica de Negocio:**
  - Toda acción relacionada con la OC actualmente se restringe al ámbito de la gestión interna, operando de soporte a la Orden de Trabajo para autorizaciones y adquisiciones.
  - No se utilizan datos de la OC para definir, modificar o documentar condiciones del acuerdo comercial con el cliente.
- **Interfaz de Usuario:**
  - En las interfaces visibles para el cliente (por ejemplo, portal público, vistas compartidas o documentos/reportes entregados al cliente), la OC no aparece como parte de las condiciones, entregables, precios ni documentos de respaldo.
  - El panel administrativo interno puede gestionar OCs como parte de la operación, pero esa información no se mezcla con contratos, cotizaciones, pre-facturas ni facturas visibles para el cliente.

---

## 3. Riesgos, inconsistencias o mejoras (si la regla no se cumple)

- Si en el futuro se expusiera información de la OC en documentos enviados al cliente, se podría dar a entender erróneamente que la OC forma parte del acuerdo comercial.
- El riesgo principal es la confusión contractual, donde documentos internos terminan siendo aceptados implícitamente como parte de la negociación cliente-proveedor.
- Mejoras posibles:
  - Marcar explícitamente la OC como "Uso interno" en la interfaz de administración.
  - Reforzar validaciones para impedir referenciar OCs en plantillas de contratos, cotizaciones o facturas visibles para clientes.

---

## 4. Propuestas de Criterios de Validación y Observabilidad

- Validar que las plantillas de reporte/facturación no incluyan referencias a OC en secciones orientadas a clientes.
- Auditoría de logs: registrar accesos y ediciones a OCs para asegurar que sólo roles internos tengan visibilidad.
- Test funcional: verificar, en escenarios de extremo a extremo, que la OC nunca se exporta o comparte fuera del ámbito administrativo interno.
- Revisión periódica de cambios en modelos de datos y plantillas para asegurar no haya "filtraciones" accidentales de información de OC a la vista del cliente.

---

## 5. Conclusión

Actualmente se cumple la regla de negocio: la Orden de Compra se utiliza exclusivamente a nivel interno y no atraviesa los límites del acuerdo comercial con el cliente, ni en lógica de negocio ni en interfaz. Se recomienda reforzar validaciones para preservar esta separación en futuras evoluciones del sistema.
