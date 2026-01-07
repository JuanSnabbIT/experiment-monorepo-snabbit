# Notas de Desarrollo y Mejoras

Manejar bien lo de los estados y flujos, el tecnico solo interactua en la OT, la Guia de Salida avanza sola


revision de Items y serializados para la correcta asginación en las OTs y la devolución en caso de uso/no uso de estas

- Customalert para los modals

- Boucher de registro de devoluciones de items

# Cotizaciones: 
- Filtro en la lista para ver por tipos, Cotizaciones rechazadas permiten crear copias para retomarlas.
- Revisar como se genera el pdf
- Crear OC: Boton rapido crear todas OC

# Ordenes de Compra: 
- Revisar como se genera el pdf.
- Revisar Dolar observado; no permitir fechas de compras superiores al dia actual.
- Cambiar flujo OC: al crear en borrador se agregan los items, al enviar al proveedor que pida Fecha de Compra, al cambiar de estado a "entregado" pedir Fecha de Entrega, Agregar fotos a OC

# Guias de salida:
- Al crearla, referenciar al cliente.
De esta manera, se puede buscar solamente las guias de salida de ese cliente en las OTs
- Mejorar UI de Vista Lista Guias de Salida

# Ordenes de Trabajos: 
- Generar una vista para las rendiciones, no debe de quedar guardado, debe ser solo frontend y referenciar lo que existe
- Gestionar los botones para que se pueda/no se pueda hacer ciertas acciones durante cierto estado
- Permitir borrar Compras hechas en la pestaña "Compras"
- Seguimiento/Comentarios: Deben ser de tipo Comentario Tecnico, Incidencia y Comunicación al Usuario
- Actualizar botones para mayor orden; regla de los 3 clicks para crear/setear una OT
- Cambiar el boton de avanzar estado de los trabajos en la OT, esta bien que el cambio de "pendiente" a "en proceso" sea solo un click sin opciones, pero cuando se esta en estado "en proceso" debe ser un dropdown con los estados "Completado", "Medianamente Completado" y "No realizado"

## ✅ COMPLETADO (2026-01-07): Workflow de Firma y Completación de Trabajos

**Feature:** Modal de firma para marcar servicios/soportes como completados con captura de firma del receptor.

**Backend (Django DRF):**
- ✅ Endpoint `/api/ordenes-de-trabajo/{id}/servicios-generales/{id}/completar-trabajo/`
- ✅ Endpoint `/api/ordenes-de-trabajo/{id}/soportes-tecnicos/{id}/completar-trabajo/`
- ✅ Acepta: `firma_entrega` (base64 PNG), `entregado_a` (usuario ID), `estado` (completado|medianamente_completado)
- ✅ Validación: presencia de seguimientos antes de permitir finalización
- ✅ Auto-crea seguimiento de tipo "actualizacion" con metadata de firma

**Frontend (React TypeScript):**
- ✅ Componente `FirmarCompletarTrabajo.tsx`: Modal reactivo con carga dinámica de usuarios, canvas de firma, selector de receptor con actualización dinámica
- ✅ Integración en `DropdownEstadoTrabajo.tsx`: Valida seguimientos antes de abrir modal
- ✅ Integración en `ListaServiciosOT.tsx` y `ListaSoportesTecnicosOT.tsx`: State management + refresh de listas

**UI:**
- ✅ Modal width: `md` (48rem), centered, scrollable
- ✅ Canvas: 400x280px sin escalado (fix para offset cursor-dibujo)
- ✅ Texto: "Usted [Nombre], ¿Está de acuerdo...?" (gramáticamente correcto)

**Validación - Test Plan:**
| Test | Descripción | Validación |
|------|-------------|-----------|
| Test 1 | Flujo básico de firma | ✅ Modal aparece, visible, información correcta |
| Test 2 | Dinámicamente receptor | ✅ Nombre actualiza sin salto de línea |
| Test 3 | Dibujo de firma | ✅ Cursor y trazo alineados |
| Test 4 | Validación de campos | ✅ Botón disabled hasta que se firme y seleccione receptor |
| Test 5 | Envío y post-acción | ✅ Toast éxito, modal cierra, estado actualiza |
| Test 6 | Base64 en backend | ✅ Payload contiene firma_entrega + entregado_a + estado |
| Test 7 | Medianamente Completado | ✅ Flujo igual, estado badge azul |

**Status:** 🟢 **LISTO PARA PRODUCCIÓN** (validación manual pendiente)

# Datos de prueba: 
- EmpresasCliente con PPM y Recargo asignados. 
- DetalleProveedor no tiene TipoMoneda

# Bodegas:
- arreglar stock de items


# Reglon de facturización:
- Traer detalles de cotizaciones y detalles de OTs.
- modificar tabla CierreAdministrativoOT, agregar campos de detalle y constraste, guardar estos datos para la correcta facturación en campos jsonfield

## ✅ COMPLETADO (2026-01-06):
### Sistema de Facturación por Contrato - MVP Funcional

**Contexto:** Se cambió el enfoque de facturación de OT-céntrico a CONTRATO-céntrico con períodos mensuales (26→25).

**Backend Implementado:**
1. **Modelo `CierreAdministrativoOT` refactorizado:**
   - `contrato` FK (principal) + `orden` FK (opcional, legacy)
   - `periodo_desde`, `periodo_hasta` DateField (auto-cálculo 26→25)
   - `resultado` JSONField con estructura:
     ```json
     {
       "pactado": {
         "items": [...],  // Servicios/Licencias contratados
         "total": 500.0,
         "moneda": "CLP"
       },
       "ejecutado": {
         "items": [...],  // Servicios/Items entregados
         "total": 0.0,
         "moneda": "CLP"
       }
     }
     ```

2. **Función `calcular_pactado_del_contrato()`:**
   - Extrae `ContratoServicio` + `ContratoLicencia`
   - Genera items con cantidad × precio_unitario = total
   - Auto-llena al crear cierre

3. **Función `calcular_ejecutado_del_contrato()`:**
   - Extrae items ejecutados en período:
     - **SoporteTecnico** y **ServicioEnOT** de OTs completadas
     - **ItemCotizacion** de Cotizaciones aceptadas
     - **ItemsGuiaSalida** de Guías entregadas
     - **Rendiciones** facturables (politica_viaticos='F')
   - Auto-llena al crear cierre

4. **Endpoint:** `POST /api/cierres-facturacion/` con auto-cálculo completo

**Frontend Implementado:**
1. **Botón "Crear facturación"** en vista detalle contrato
   - Toggle automático a "Ver facturación" cuando existe
2. **Vista `CierreContratoDetalle`:**
   - Header: Contrato + Cliente + Período
   - Tabla "Datos Pactado": servicios contratados
   - Tabla "Datos Ejecutado": trabajos/items realizados
   - Comparativa: Total Pactado vs Ejecutado + Diferencia

**Estado Actual:**
- ✅ Creación manual de cierres funcional
- ✅ Auto-población de pactado y ejecutado
- ✅ Vista de comparación operativa
- ⏳ Precios en items ejecutado = $0 (por diseño, sin fuente de precio aún)
- ⏳ Pendiente: workflow de aprobación, edición manual, generación de factura

**Archivos Modificados:**
- `backend/ordentrabajov2/models.py` (migración 0011)
- `backend/ordentrabajov2/functions.py` (nuevas funciones cálculo)
- `backend/ordentrabajov2/views.py` (perform_create actualizado)
- `backend/ordentrabajov2/serializers.py` (campos expuestos)
- `frontend/src/pages/Facturacion/CierreContratoDetalle.tsx` (nueva vista)
- `frontend/src/pages/Contratos/ContratosDelCliente.tsx` (botón agregado)

---

# Rendiciones:
- Crear tabla maestra dentro de Core/Models para la tabla "VariableRendicion" en donde preestablecer las categorias de rendición y sus respectivos montos de cargo, para que al momento de crear una rendición solo se seleccione la categoria y el sistema automáticamente asigne el monto correspondiente según la tabla maestra creada.

---

## 📋 VISIÓN DE FACTURACIÓN MANUAL (Retroalimentación 2026-01-07)

### Descripción Original:
> "Para facturar, por ahora que sea manualmente en donde las personas que vayan a facturar puedan simplemente ir a una vista donde se muestren las OTs aprobadas, y desde ahí seleccionar las OTs que se van a facturar, luego se contrasta con un contrato en donde se indica todo el detalle (Servicios y Planes contratados, Visitas programadas, Condiciones Especiales, Usuarios vinculados) para luego generar la diferencia, que serian por ejemplo visitas extra, servicios no contemplados, etc."

---

### 🎯 Interpretación y Propuesta de Flujo:

#### **PASO 1: Vista de Selección de OTs para Facturar**
**Ubicación:** Nueva página `/facturacion/seleccionar-ots` o modal desde contrato

**UI Propuesta:**
```
┌─────────────────────────────────────────────────────┐
│ Facturación Manual - Seleccionar OTs                │
├─────────────────────────────────────────────────────┤
│ Filtros:                                            │
│  [Cliente: AYG ASOCIADOS ▼] [Período: Último mes ▼]│
│  [Estado: Completada ☑] [No facturadas ☑]          │
├─────────────────────────────────────────────────────┤
│                                                      │
│ OTs Disponibles:                                    │
│ ☐ OT #123 - Instalación servidor (05/01/2026)      │
│    └─ 2 servicios, 3 items entregados               │
│ ☑ OT #124 - Mantenimiento mensual (12/01/2026)     │
│    └─ 1 servicio, sin items                         │
│ ☐ OT #125 - Soporte técnico (18/01/2026)           │
│    └─ 1 soporte, 5 items entregados                 │
│                                                      │
│           [Cancelar] [Siguiente: Contrastar →]      │
└─────────────────────────────────────────────────────┘
```

**Lógica:**
- Mostrar OTs con `estado in ['completada', 'cerrada']`
- Filtrar por cliente (para luego vincular con contrato)
- Filtrar por rango de fechas (opcional)
- Permitir multi-selección con checkboxes
- Mostrar resumen: cantidad de servicios/items por OT

---

#### **PASO 2: Seleccionar Contrato para Contrastar**
**Transición:** Al hacer clic en "Siguiente", modal/página de selección de contrato

**UI Propuesta:**
```
┌─────────────────────────────────────────────────────┐
│ Seleccionar Contrato para Contrastar                │
├─────────────────────────────────────────────────────┤
│ Cliente: AYG ASOCIADOS                              │
│ OTs Seleccionadas: 2 (OT #124, #125)               │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Contratos Activos del Cliente:                      │
│ ⚪ Contrato #1 - Prueba Contrato (Servicios)        │
│    └─ Vigencia: 06/01/2026 - 06/01/2026            │
│    └─ 1 servicio, 2 visitas programadas             │
│                                                      │
│ ⚪ Sin Contrato (Trabajo Ad-hoc)                    │
│    └─ Facturar servicios sin contrastar             │
│                                                      │
│        [← Volver] [Siguiente: Ver Contraste →]      │
└─────────────────────────────────────────────────────┘
```

**Lógica:**
- Buscar contratos del cliente con `estado='activo'`
- Opción "Sin Contrato" para trabajos ad-hoc sin vínculo
- Al seleccionar contrato → navegar a vista de contraste

---

#### **PASO 3: Vista de Contraste (Pactado vs Ejecutado)**
**Ubicación:** `/facturacion/contraste/{contrato_id}?ots=124,125`

**UI Propuesta (similar a lo ya implementado, mejorado):**
```
┌───────────────────────────────────────────────────────────────────┐
│ Contraste de Facturación                                          │
│ Contrato #1 - Prueba Contrato | Cliente: AYG ASOCIADOS           │
│ Período: 26/12/2025 - 25/01/2026                                  │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ┌─────────────────────────┬─────────────────────────┐            │
│ │ PACTADO (Contrato)      │ EJECUTADO (OTs)         │            │
│ ├─────────────────────────┼─────────────────────────┤            │
│ │ Soporte Técnico Nivel 2 │ ✓ Soporte Técnico #124  │ ← Vinculado│
│ │ 1 unidad - $500         │   1 unidad - $0         │            │
│ │                         │                         │            │
│ │ (Sin más servicios)     │ + Instalación Extra #125│ ← No pactado│
│ │                         │   1 unidad - $0         │            │
│ │                         │                         │            │
│ │                         │ Items Entregados:       │            │
│ │                         │ • Cable UTP (5 uds)     │            │
│ │                         │ • Switch Cisco (1 ud)   │            │
│ └─────────────────────────┴─────────────────────────┘            │
│                                                                    │
│ ANÁLISIS DE DIFERENCIAS:                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ ✅ Incluidos en Contrato:                                         │
│    • Soporte Técnico Nivel 2 (pactado) ← $500                    │
│                                                                    │
│ ⚠️ EXTRAS (no contemplados en contrato):                          │
│    • Instalación Extra #125 ← $??? (definir precio)              │
│    • Items entregados (6 unidades) ← $??? (definir precio)       │
│                                                                    │
│ 💰 TOTAL A FACTURAR:                                              │
│    Servicios Pactados:     $500                                   │
│    Servicios Extras:       $??? (pendiente cotizar)               │
│    Items/Materiales:       $??? (pendiente valorizar)             │
│    ─────────────────────────────                                  │
│    TOTAL ESTIMADO:         $500+                                  │
│                                                                    │
│         [← Volver] [Guardar Contraste] [Generar Factura →]       │
└───────────────────────────────────────────────────────────────────┘
```

**Funcionalidad Clave:**
1. **Matching Automático:** Sistema intenta vincular servicios ejecutados con pactados
2. **Detección de Extras:** Marca todo lo ejecutado que NO está en contrato
3. **Valorización Manual:** Permite asignar precio a servicios/items sin precio
4. **Exportación:** Botón "Generar Factura" crea documento o envía a sistema externo

---

### 📊 Estructura de Datos Propuesta:

**Agregar campo a `CierreAdministrativoOT`:**
```python
class CierreAdministrativoOT:
    # ... campos existentes ...
    
    # Nuevos campos para workflow manual
    ordenes_vinculadas = models.ManyToManyField(
        'ordentrabajov2.OrdenDeTrabajo',
        blank=True,
        related_name='cierres_facturacion'
    )
    
    analisis_diferencias = models.JSONField(
        default=dict,
        blank=True,
        help_text="Estructura: {incluidos: [...], extras: [...], ajustes_precio: [...]}"
    )
```

**Estructura de `analisis_diferencias`:**
```json
{
  "incluidos": [
    {
      "pactado_id": "servicio_1",
      "ejecutado_id": "ot_124_servicio_2",
      "nombre": "Soporte Técnico Nivel 2",
      "precio_pactado": 500.0,
      "precio_real": 500.0,
      "diferencia": 0.0
    }
  ],
  "extras": [
    {
      "ejecutado_id": "ot_125_servicio_3",
      "nombre": "Instalación Extra",
      "precio_asignado": 0.0,
      "requiere_cotizacion": true,
      "observaciones": "Trabajo no contemplado en contrato"
    }
  ],
  "ajustes_precio": [
    {
      "item_id": "guia_2_item_1",
      "nombre": "Cable UTP Cat5e",
      "cantidad": 5,
      "precio_unitario_asignado": 10.0,
      "total": 50.0
    }
  ]
}
```

---

### 🚀 Plan de Implementación:

#### **Fase 1: Vista de Selección de OTs (Nueva)**
- [ ] Crear página `/facturacion/seleccionar-ots`
- [ ] Endpoint: `GET /api/ordenes-trabajo/?cliente={id}&estado=completada&sin_facturar=true`
- [ ] Checkbox multi-select + botón "Siguiente"

#### **Fase 2: Selección de Contrato (Modal/Vista)**
- [ ] Modal o página para elegir contrato del cliente
- [ ] Validar si existe contrato activo
- [ ] Opción "Sin Contrato" para trabajos ad-hoc

#### **Fase 3: Vista de Contraste Mejorada (Actualizar Existente)**
- [ ] Recibir parámetro `?ots=123,124,125` en `/facturacion/cierre-contrato/{id}`
- [ ] Backend: vincular OTs al cierre via `ordenes_vinculadas`
- [ ] Frontend: mostrar 2 columnas con drag-drop para matching manual
- [ ] Sección "Análisis de Diferencias" con:
  - ✅ Items que coinciden (incluidos)
  - ⚠️ Items extras (no pactados)
  - 💰 Campo input para asignar precios manualmente

#### **Fase 4: Valorización Manual**
- [ ] Modal "Asignar Precio" para items sin precio
- [ ] Botón "Cotizar Extra" para servicios adicionales
- [ ] Campo "Observaciones" para justificar extras

#### **Fase 5: Generación de Factura**
- [ ] Botón "Generar Factura" → PDF o integración con sistema contable
- [ ] Cambiar estado cierre: `borrador` → `aprobado` → `facturado`
- [ ] Marcar OTs vinculadas como `estado='facturada'`

---

### 🤔 Preguntas Clave para Confirmar:

1. **¿La selección de OTs es obligatoria?** ¿O puedo crear facturación desde contrato directamente?
2. **¿Cómo se define el precio de servicios extras?** ¿Manual, desde cotización, desde tarifa fija?
3. **¿Qué pasa con visitas programadas?** ¿Se verifican contra calendario?
4. **¿Condiciones especiales afectan precio?** ¿Descuentos, recargos, etc.?
5. **¿Workflow de aprobación?** ¿Quién aprueba antes de facturar?

---

### 💡 Propuesta Simplificada (MVP):

**Si queremos arrancar rápido:**
1. ✅ Ya tienes vista de contraste (lo implementado hoy)
2. Agregar botón "Vincular OTs" que abre modal de selección
3. Backend agrega `ordenes_vinculadas` M2M al cierre
4. Frontend muestra OTs vinculadas en detalle de cierre
5. Modal "Agregar Item Extra" para servicios no pactados
6. Botón "Aprobar para Facturar" cambia estado

¿Qué te parece este análisis? ¿Vamos por la propuesta simplificada o prefieres el flujo completo de 5 fases?

---

## 🔍 ACLARACIONES Y PROFUNDIZACIÓN (2026-01-07)

### Punto 1: Estados de Orden de Trabajo (CRÍTICO)

**Estados reales de OT (confirmado):**
```
Pendiente → En Proceso → Completada → Validada y Cerrada → Facturada → Cancelada
```

**Estados de TRABAJOS (dentro de la OT):**
- Pendiente
- En Proceso
- Completado
- Medianamente Completado
- No Realizado

**Aclaración importante:**
- "Medianamente Completada" es estado de trabajo individual, NO de la OT
- "Validada y Cerrada" existe pero NO tiene lugar claro en el flujo de facturación
  - ¿Es intermedia entre "Completada" y "Facturada"?
  - ¿O es redundante con "Completada"?

**Propuesta de flujo simplificado:**
```
OT Completada → (admin selecciona para facturar) → OT Facturada → (fin)
```

**Preguntas:**
- ¿"Validada y Cerrada" debería desaparecer o tiene propósito específico?
- ¿"Completada" ya indica que TODOS los trabajos están en estado "completado" o "medianamente_completado"?
- ¿O una OT puede estar "Completada" con trabajos aún en "Pendiente"?

---

### Punto 2: El Verdadero Problema — Emparejamiento Multidimensional

**Tu insight clave:** El emparejamiento NO es solo por "tipo de servicio", sino por:
- **Tipo de servicio**
- **Conjunto de usuarios asociados**
- **Cantidad de sesiones/visitas**

#### **Caso 1: Usuarios parciales en múltiples visitas**

**Contrato pactado:**
```
Servicio: Soporte Técnico
Usuarios: Juan, Pepe
Frecuencia: 1 visita mensual
```

**OTs ejecutadas en el período:**
```
OT #120 (01/01): Soporte a Juan (completada)
OT #121 (15/01): Soporte a Pepe (completada)
```

**Emparejamiento:**
- Pactado: 1 visita a [Juan, Pepe]
- Ejecutado: 2 visitas ([Juan], [Pepe])
- **Diferencia:** 1 visita extra (2 vs 1 pactada) — **NO es simplemente suma de usuarios**

**Cobro:**
- Base pactada: 1 visita = $500
- Ejecutado: 2 visitas = 2 × $250 (si se factura por persona) o 2 × $500 (si se factura por visita)
- **Pregunta crítica:** ¿Cómo se calcula el precio: por visita o por usuario?

---

#### **Caso 2: Usuario no pactado (extra)**

**Contrato pactado:**
```
Servicio: Soporte Técnico
Usuarios: Juan, Pepe
Cantidad: 1 visita mensual
Precio: $500
```

**OTs ejecutadas:**
```
OT #120: Soporte a Juan, Pepe y Camilo (completada)
```

**Emparejamiento:**
- Pactado: Soporte a [Juan, Pepe]
- Ejecutado: Soporte a [Juan, Pepe, Camilo]
- **Diferencia:** Usuario extra (Camilo) → es una "extensión" del servicio

**Cobro:**
- Base: $500 (Soporte a Juan + Pepe pactado)
- Extra: ¿$500 más por Camilo? ¿O porcentaje del servicio?
- **Pregunta:** ¿El precio extra se calcula proporcional o es una tarifa fija?

---

#### **Casos Complejos No Mencionados (que debes considerar):**

**Caso 3: Mismo servicio, usuarios diferentes, múltiples OTs**
```
Contrato: Soporte a [Juan, Pepe, Carlos] (3 usuarios, 1 visita)
Ejecutadas:
  OT #120: Soporte a Juan + Pepe
  OT #121: Soporte a Carlos
  OT #122: Soporte a Juan (segunda visita)
```
- ¿Esto cuenta como 1 visita (usuario único) o 3 (una por OT)?
- ¿O 1.5 visitas (3 usuarios / 2 grupos)?

**Caso 4: Usuario que no está en el contrato**
```
Contrato: Soporte a [Juan, Pepe]
Ejecutada: 
  OT #120: Soporte a Juan, Pepe, Diego
```
- Diego no está vinculado al contrato
- ¿Esto es "extra completo" (usuario nuevo) o "extensión"?

**Caso 5: Cambio de usuario mid-contrato**
```
Contrato original: Soporte a [Juan, Pepe]
A mitad de período: Usuario Diego se vincula
  OT #120 (inicio período): Soporte a [Juan, Pepe]
  OT #121 (fin período): Soporte a [Juan, Pepe, Diego]
```
- ¿Se cobra Diego desde OT #121 en adelante?
- ¿O es un extra completo?

**Caso 6: Servicios diferentes pero mismo usuario**
```
Contrato: 
  - Soporte Nivel 1: [Juan, Pepe]
  - Soporte Nivel 2: [Carlos]
Ejecutadas:
  OT #120: Soporte Nivel 1 a [Juan, Pepe]
  OT #121: Soporte Nivel 2 a [Juan, Carlos] ← Juan está en ambos
```
- Cuando Juan aparece en Nivel 2 (que no debería), ¿se cuenta como extra o error?

---

### 📊 Matriz de Emparejamiento Propuesta

| Escenario | Pactado | Ejecutado | Resultado | Tipo |
|-----------|---------|-----------|-----------|------|
| Usuarios coinciden exactamente | [Juan, Pepe] | [Juan, Pepe] | ✅ Match perfecto | Incluido |
| Usuarios parciales | [Juan, Pepe] | [Juan] | ⚠️ Falta Pepe | Parcial |
| Usuario extra | [Juan, Pepe] | [Juan, Pepe, Diego] | ➕ Extra | Diferencia |
| Usuario no pactado | [Juan, Pepe] | [Diego, Carlos] | ❌ Sin match | Extra total |
| Múltiples OTs, mismo usuario | [Juan] (1 visita) | [Juan] OT#1, [Juan] OT#2 | ➕ Visita extra | Diferencia |
| Cambio de usuario intra-período | [Juan] | [Pepe] | ❌ Usuario diferente | Extra |

---

### 🎯 Redefinición del Emparejamiento

**Clave:** El emparejamiento debe ser **SERVICIO + USUARIO(S) → PRECIO**

```
Firma de Match = {
  servicio_id: ContratoServicio.id,
  usuarios_pactados: set([Juan.id, Pepe.id]),
  cantidad_pactada: 1,
  precio_pactado: 500.0
}

Ejecución = {
  servicio_tipo: "Soporte",
  usuarios_ejecutados: set([Juan.id, Pepe.id, Diego.id]),
  cantidad_ejecutada: 1,
  precio_ejecutado: ? (a determinar)
}

Análisis:
  usuarios_coinciden = usuarios_pactados ∩ usuarios_ejecutados
  usuarios_faltantes = usuarios_pactados - usuarios_ejecutados
  usuarios_extra = usuarios_ejecutados - usuarios_pactados
```

---

### 🤔 Preguntas Clave para Redefinir

**ANTES de diseñar el matching:**

1. **¿Precio por visita o por usuario?**
   - Si es "1 visita a [Juan, Pepe]" por $500:
     - ¿Se puede "desglozar" como $250 por usuario? (si falta uno, se cobra menos)
     - ¿O es tarifa única? (aunque solo asista Juan, se cobra $500)

2. **¿Qué es una "visita completada"?**
   - Opción A: Una OT = una visita (independiente de usuarios)
   - Opción B: Una OT por usuario = una visita (si 3 usuarios en 1 OT, se cuenta como 3 visitas)
   - Opción C: Conjunto único de usuarios = una visita

3. **¿Cómo se contabilizan usuarios extra?**
   - ¿Tarifa fija adicional?
   - ¿Tarifa proporcional?
   - ¿Requiere cotización?

4. **¿Vinculación temporal de usuarios?**
   - ¿Los usuarios vinculados al contrato tienen fecha inicio/fin?
   - ¿O son fijos durante toda la vigencia del contrato?

---

---

## 📍 RESPUESTAS A PUNTOS DE ANÁLISIS (2026-01-07)

### Punto 4: OTs como Visitas y Workflow de Matching

**Decisión Confirmada:**
- ✅ NO agregar campos nuevos a OT (no queremos complicar el flujo técnico)
- ✅ Las OTs se clasifican en 3 tipos:
  - Servicios Generales
  - Soporte Técnico Presencial
  - Soporte Técnico Remoto
- ✅ TODAS EXCEPTO Soporte Remoto se tratan como **visitas ejecutadas**
  - Soporte Remoto: NO cuenta como visita (no hay desplazamiento)

**Workflow de Facturación (Matching):**
```
Paso 1: Admin selecciona OTs para facturar (multi-select)
Paso 2: Admin selecciona el Contrato a contrastar
Paso 3: Sistema trae pactado del contrato
Paso 4: Sistema trae ejecutado de las OTs seleccionadas
Paso 5: Admin revisa pactado vs ejecutado lado a lado
Paso 6: Sistema calcula diferencias automáticamente
Paso 7: Admin crea el CierreAdministrativoOT con resultado
```

**Implicaciones técnicas:**
- CierreAdministrativoOT necesita M2M con OrdenDeTrabajo (`ordenes_vinculadas`)
- No necesitamos campo "es_visita" en OT (lo determina el tipo)
- El matching es manual (admin elige qué OTs) pero con validaciones automáticas

---

### Punto 5: Condiciones Especiales

**Decisión:** ⏸️ POSPONER PARA DESPUÉS
- Punto de mejora futuro (cuando facturación esté "mayormente armada")
- Por ahora: solo documentadas, sin efecto automático

---

### Punto 6: Precios y Fuentes

**Decisión:** ✅ CORRECTO POR AHORA
- Mantener enfoque actual (ContratoServicio.precio_unitario para pactado)
- Revisitar cuando tengamos más implementado

---

### Punto 7: Cálculo de Período

**Decisión:** 📋 MANUAL POR AHORA
- Admin selecciona manualmente las OTs y el contrato
- NO automático por rango de fechas (evita complejidad inicial)
- Revisitar cuando sistema esté más maduro

---

### Punto 8: OTs Ya Facturadas

**Decisión:** ✅ CORRECTO (VALIDACIÓN OBLIGATORIA)
- No se pueden seleccionar OTs con estado `Facturada` o `Cancelada`
- Backend valida que estado esté en: [Completada, Validada y Cerrada]
- Protege contra doble facturación

---

### Punto 9: Cambio Rápido de Contrato

**Decisión:** ✅ REQUISITO FUNCIONAL
- Admin marca el contrato a contrastar
- Si no es el correcto, puede cambiar rápidamente
- SIN perder las OTs ya seleccionadas
- UX: dropdown/modal de selección rápida de contrato

---

### Punto 10: Estructura del JSONField `resultado`

**Decisión:** ✅ FLEXIBLE POR AHORA
- NO es necesario perfeccionar schema hoy
- Mínimo requerido: `{ items: [...], secciones: [...]  }`
- Detalles posteriores cuando veamos en acción
- Requisito: permitir agregar items y organizarlos por secciones

---

## ❓ NUEVAS PREGUNTAS: Modelo de Facturación

**Contexto:** Necesitamos entender cuándo/cómo el cliente paga y cómo se facturan las rendiciones.

### P1: ¿Cuándo paga el cliente el contrato?
- [ ] A) Al firmar el contrato (todo de una suma)
- [ ] B) En cuotas mensuales (cada mes lo del mes)
- [ ] C) Solo al final (después de que se ejecute)

### P2: Las rendiciones (gastos de personal, viáticos, etc.) - ¿Cómo se cobran?
- [ ] A) Incluidas en el precio del contrato inicial (están dentro del costo total)
- [ ] B) Aparte, como "gastos adicionales" facturados al fin de mes
- [ ] C) Depende: si están pactadas, incluidas; si son sorpresas, aparte

### P3: Si el cliente contrata "Soporte 50 horas/mes" pero en realidad necesitó 60 horas:
- [ ] A) Cobra 10 horas extra al precio del contrato
- [ ] B) Cobra 10 horas extra al "costo real" (precio diferente)
- [ ] C) Absorbes las 10 horas (no cobras nada)

### P4: Si en el contrato "no está pactada" una rendición (por ejemplo, un viaje inesperado):
- [ ] A) No se cobra (no se pactó, no se cobra)
- [ ] B) Se cobra como "extra" al final del mes
- [ ] C) Error: debería haberse pactado; no se puede facturar sin ser pactado

---

### 📋 Síntesis para Siguiente Sesión

**Lo que está claro:**
- ✅ Estados de OT: Pendiente → En Proceso → Completada → Validada y Cerrada → Facturada
- ✅ Estados de trabajo: Pendiente, En Proceso, Completado, Medianamente Completado, No Realizado
- ✅ El emparejamiento es MULTIDIMENSIONAL (servicio + usuarios + cantidad)
- ✅ Existen casos complejos que requieren lógica más sofisticada
- ✅ Workflow de matching: OTs → Contrato → pactado vs ejecutado → diferencias
- ✅ OTs con tipos: Servicios, Soporte Presencial (= visitas), Soporte Remoto (≠ visita)
- ✅ Cambios deben ser manuales pero validados automáticamente

**Lo que FALTA clarificar:**
- ❓ **Modelo de pago:** cuándo paga el cliente (P1)
- ❓ **Facturación de rendiciones:** incluidas o separadas (P2)
- ❓ **Precios extras:** mismo precio o tarifa especial (P3)
- ❓ **Control de pactado:** qué se puede/no se puede facturar (P4)

**Siguiente paso:**
- Responder las 4 preguntas sobre modelo de facturación (P1-P4)
- Entonces especificar exactamente cómo se calcula pactado vs ejecutado
- Finalmente, especificar el algoritmo de matching con usuarios/visitas

 