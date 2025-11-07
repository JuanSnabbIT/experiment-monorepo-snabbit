# Modelo de Negocio del ERP

## Propósito General

Este ERP está diseñado para **empresas de servicios técnicos** que brindan mantención, soporte y soluciones tecnológicas a clientes corporativos. El sistema gestiona:

- **Órdenes de Trabajo (OT)**: Solicitudes de servicio de clientes con seguimiento completo
- **Inventario**: Equipos de alto valor y consumibles con control por bodega
- **Recursos**: Técnicos, visitas a terreno, equipos asignados
- **Compras**: Adquisición de nuevo inventario con tracking de activos
- **Facturación**: Cálculo de costos (materiales + mano de obra + equipos)

---

## 1. Conceptos Fundamentales

### 1.1. Item (Catálogo Maestro)

**Definición**: Cualquier producto o material que la empresa maneja.

**Ejemplos**:
- Router Wi-Fi modelo TP-Link AC1750
- Cable UTP categoría 6 (por metro)
- Tornillos métricos M3
- Monitor Dell 24"
- Teclado inalámbrico Logitech

**Propósito**: Catálogo centralizado con información genérica (SKU, nombre, descripción, precio base, si requiere serialización).

**Atributos clave**:
- `sku`: Código único del producto
- `nombre`: Descripción comercial
- `precio`: Precio base de referencia
- `es_serializado`: `True` si requiere tracking individual (equipos de valor), `False` si es consumible

**Ubicación en código**: `items/models.py` → `Item`

---

### 1.2. ItemBodega (Stock por Ubicación)

**Definición**: Cantidad física de un Item en una Bodega específica.

**Ejemplos**:
- "10 cables UTP en Bodega Central"
- "5 routers TP-Link en Bodega Santiago"
- "50 tornillos M3 en Bodega Norte"

**Propósito**: Control de inventario por ubicación física, registro de stock disponible.

**Atributos clave**:
- `bodega`: FK a Bodega (ubicación física)
- `item`: FK a Item (qué producto)
- `cantidad_stock`: Cantidad disponible
- `numero_serie`: Nullable - solo si el item individual tiene serial (ej: un router específico)

**Creación**:
- **Path 1 (Consumibles)**: Manual vía Registros → Items → Movimientos Stock → ENTRADA_DIRECTA (one-time)
- **Path 2 (Serializados)**: Automática vía `complete_orden_signal` cuando OrdenCompra se completa con `numero_serie` asignados

**Ubicación en código**: `bodegas/models.py` → `ItemBodega`

---

### 1.3. Equipo (Activo Trackable)

**Definición**: Item serializado que requiere seguimiento individual a lo largo de su ciclo de vida.

**Ejemplos**:
- Router #SN123456 asignado a Cliente ABC, ubicación "Sala Servidores"
- Laptop #SN789012 asignada a técnico Juan Pérez
- Impresora #SN345678 en estado MANTENIMIENTO

**Propósito**: Tracking de activos de alto valor - saber dónde está cada equipo, quién lo tiene, en qué estado se encuentra.

**Atributos clave**:
- `numero_serie`: String ÚNICO - identificador físico del equipo
- `item`: FK a Item (tipo de equipo)
- `estado`: Choices (DISPONIBLE, ASIGNADO, MANTENIMIENTO)
- `usuario_asignado`: FK a User nullable (técnico que tiene el equipo)
- `ubicacion`: TextField (descripción física de dónde está)

**Creación automática**:
```python
# Signal: complete_orden_signal (contratos/signals.py)
@receiver(post_save, sender=OrdenCompra)
def complete_orden_signal(sender, instance, **kwargs):
    if instance.estado == EstadoOrdenCompra.COMPLETADA:
        with transaction.atomic():
            for item_oc in instance.itemordencompra_set.all():
                if item_oc.numero_serie:  # Solo si es serializado
                    # Crea ItemBodega
                    item_bodega = ItemBodega.objects.create(
                        bodega=instance.bodega,
                        item=item_oc.item,
                        cantidad_stock=1,
                        numero_serie=item_oc.numero_serie
                    )
                    # Crea Equipo
                    Equipo.objects.create(
                        numero_serie=item_oc.numero_serie,
                        item=item_oc.item,
                        estado='DISPONIBLE',
                        ubicacion=f'Bodega {instance.bodega.nombre}'
                    )
```

**¿Por qué crear Equipo automáticamente?**
- Items serializados = activos de valor que requieren lifecycle management
- Desde el momento que entran a bodega, necesitas saber: ubicación, estado, quién lo tiene
- Equipos pueden moverse entre OT, asignarse a técnicos, enviarse a mantenimiento

**Ubicación en código**: `activos/models.py` → `Equipo`

---

## 2. Flujos de Negocio End-to-End

### 2.1. Flujo 1: Atención de Servicio Técnico (Caso Real)

#### Contexto
Cliente "Empresa ABC" reporta: "Nuestro router principal dejó de funcionar, empleados sin internet".

#### Paso 1: Creación de OT

**Actor**: Coordinador de servicios
**Acción**: Registros → Orden de Trabajo → Crear Nueva

**Datos ingresados**:
- `empresa_cliente`: Empresa ABC (FK)
- `descripcion_problema`: "Router principal sin funcionar, sin conectividad"
- `prioridad`: Alta
- `fecha_inicio`: 2025-11-05
- `estado`: Pendiente (automático)

**Sistema genera**:
- `folio`: OT-2025-0042 (via `folio_generation_signal`)
- `uuid`: Auto-generado para identificación única

**Estado inicial**: Pendiente

---

#### Paso 2: Asignación de Técnico

**Actor**: Supervisor técnico
**Acción**: OT Detalle → Tab "Trabajos en OT" → Agregar Trabajo

**Datos ingresados**:
- `trabajo_titulo`: "Diagnóstico y reparación conectividad"
- `estado`: Pendiente
- Asignar técnico: Juan Pérez (User)

**Sistema crea**:
```python
# RecursoOT con GenericFK apuntando a User
RecursoOT.objects.create(
    orden_trabajo=ot_instance,
    content_type=ContentType.objects.get_for_model(User),
    object_id=juan_perez.id  # GenericFK
)
```

**Signal `auto_assign_recursos_signal` se dispara**:
- Si el recurso es Equipo → actualiza `Equipo.estado` a ASIGNADO

**Transición estado OT**: Pendiente → **Proceso** (automático cuando se crea primer Trabajo)

---

#### Paso 3: Preparación de Materiales

**Actor**: Bodeguero
**Acción**: Bodegas → Guías de Salida → Crear Nueva

**Datos ingresados**:
- `bodega`: Bodega Central
- Items a incluir:
  * 15 metros cable UTP categoría 6
  * 10 conectores RJ45
  * 2 switches de red 8 puertos
- `estado`: Pendiente

**Completa guía**: Pendiente → **Espera Firma Recibido**

**Propósito**: Autorización formal de salida de materiales desde bodega hacia técnico.

---

#### Paso 4: Agregar Insumos a OT

**Actor**: Coordinador
**Acción**: OT Detalle → Tab "Trabajos en OT" → Trabajo → Agregar Insumo

**Selecciona**:
- `guia_salida`: Guía recién completada
- Items de la guía aparecen disponibles

**Sistema crea**:
```python
ItemOT.objects.create(
    orden_trabajo=ot_instance,
    item_bodega=None,  # NO se usa
    guia_salida=guia_salida_instance,  # SÍ se usa
    cantidad=15,
    item=cable_utp
)
# XOR constraint: solo UNO de {item_bodega, guia_salida} puede estar lleno
```

**Resultado**:
- Materiales consumibles registrados en OT
- NO se espera devolución (consumidos en terreno)
- Inventario se reduce en ItemBodega automáticamente (via MovimientoBodega)

---

#### Paso 5: Asignar Equipo de Reemplazo

**Actor**: Coordinador
**Acción**: OT Detalle → Tab "Trabajos en OT" → Trabajo → Entrega de Equipos

**Selecciona**:
- Equipo: Router TP-Link #SN123456 (estado DISPONIBLE)

**Sistema crea**:
```python
RecursoOT.objects.create(
    orden_trabajo=ot_instance,
    content_type=ContentType.objects.get_for_model(Equipo),
    object_id=router.id  # GenericFK apuntando a Equipo
)
```

**Signal `auto_assign_recursos_signal` actualiza**:
```python
router.estado = 'ASIGNADO'
router.usuario_asignado = juan_perez
router.ubicacion = 'En tránsito a Cliente ABC'
router.save()
```

**Resultado**:
- Router trackable asignado a OT
- Sistema sabe que Juan Pérez tiene ese router
- Se espera eventual devolución o registro de instalación permanente

---

#### Paso 6: Trabajo en Terreno

**Actor**: Técnico Juan Pérez
**Acción**: Móvil/Web → OT Detalle → Tab "Visitas"

**Registra VisitaTerreno**:
- `fecha_inicio`: 2025-11-05 09:00
- `fecha_fin`: 2025-11-05 12:30
- `comentarios`: "Router cliente dañado por sobretensión. Instalado router #SN123456 nuevo. Cableado estructurado renovado con cable UTP nuevo. Cliente operativo."
- `fotos`: Subidas desde móvil (evidencia)

**Estado Trabajo**: Pendiente → **Completado**

---

#### Paso 7: Finalización y Validación

**Actor**: Supervisor
**Acción**: OT Detalle → Revisar Trabajos

**Validaciones**:
- ✅ Todos los Trabajos marcados Completados
- ✅ Materiales consumidos registrados en ItemOT
- ✅ Equipo instalado registrado en RecursoOT
- ✅ Visita con evidencia fotográfica

**Sistema detecta**: Todos los Trabajos completados
**Transición automática**: Proceso → **Completada**

**Supervisor valida manualmente**: "Servicio bien ejecutado"
**Transición manual**: Completada → **Validada**

---

#### Paso 8: Facturación

**Actor**: Contabilidad
**Acción**: Facturación → Generar Factura desde OT

**Sistema calcula costos**:
```python
# Insumos consumidos
insumos_cost = sum(item_ot.cantidad * item_ot.item.precio for item_ot in ot.itemot_set.all())

# Equipos entregados permanentemente (si aplica)
equipos_cost = sum(equipo.item.precio for equipo in ot.recursos_equipos if not equipo.devuelto)

# Horas técnico (desde VisitaTerreno)
horas_tecnico = sum((visita.fecha_fin - visita.fecha_inicio).total_seconds() / 3600 for visita in ot.visitaterreno_set.all())
mano_obra_cost = horas_tecnico * tarifa_tecnico

# Total
total = insumos_cost + equipos_cost + mano_obra_cost
```

**Factura generada**: Enviada a Cliente ABC
**Transición manual**: Validada → **Cerrada**

**Estado final**: Cerrada (archivado, historial completo para auditoría)

---

### 2.2. Flujo 2: Adquisición de Nuevo Inventario

#### Contexto
Bodeguero detecta: "Quedan solo 2 routers en stock, necesitamos reponer".

#### Paso 1: Crear Orden de Compra

**Actor**: Jefe de Compras
**Acción**: Compras → Órdenes de Compra → Crear Nueva

**Datos ingresados**:
- `proveedor`: TechSupply Inc.
- Items:
  * 20 routers TP-Link AC1750 @ $80.000 c/u
  * 50 cables UTP Cat6 @ $5.000 c/u
- `estado`: Borrador

**Propósito**: Solicitud formal de compra, puede modificarse antes de enviar.

---

#### Paso 2: Envío y Aprobación

**Flujo de estados**:
1. **Borrador**: Creación inicial, editable
2. **Enviada**: OC enviada al proveedor (no más ediciones)
3. **Aceptada**: Proveedor confirma disponibilidad y plazo
4. **Completada**: Mercadería recibida físicamente en bodega

---

#### Paso 3: Recepción de Mercadería

**Actor**: Bodeguero
**Acción**: Compras → OC Detalle → Completar Orden

**Proceso**:
- Verifica cantidad recibida vs. cantidad pedida
- **Asigna números de serie** a routers (uno por uno):
  * Router 1: SN123456
  * Router 2: SN123457
  * ...
  * Router 20: SN123475
- Confirma bodega destino: Bodega Central

**Marca estado**: Aceptada → **Completada**

---

#### Paso 4: Signal `complete_orden_signal` Dispara

```python
@receiver(post_save, sender=OrdenCompra)
def complete_orden_signal(sender, instance, **kwargs):
    if instance.estado == EstadoOrdenCompra.COMPLETADA:
        with transaction.atomic():  # Garantiza atomicidad
            for item_oc in instance.itemordencompra_set.all():
                if item_oc.numero_serie:
                    # Crea ItemBodega (inventario)
                    ItemBodega.objects.create(
                        bodega=instance.bodega,
                        item=item_oc.item,
                        cantidad_stock=1,
                        numero_serie=item_oc.numero_serie
                    )
                    # Crea Equipo (activo trackable)
                    Equipo.objects.create(
                        numero_serie=item_oc.numero_serie,
                        item=item_oc.item,
                        estado='DISPONIBLE',
                        ubicacion=f'Bodega {instance.bodega.nombre}'
                    )
                else:
                    # Items no serializados: solo actualiza stock
                    item_bodega, created = ItemBodega.objects.get_or_create(
                        bodega=instance.bodega,
                        item=item_oc.item,
                        defaults={'cantidad_stock': item_oc.cantidad}
                    )
                    if not created:
                        item_bodega.cantidad_stock += item_oc.cantidad
                        item_bodega.save()
```

**Resultado**:
- **20 nuevos routers**:
  * 20 registros ItemBodega (inventario)
  * 20 registros Equipo (activos trackables)
  * Todos en estado DISPONIBLE
- **50 cables UTP**:
  * 1 registro ItemBodega con cantidad_stock=50
  * NO se crean Equipos (consumibles no serializados)

---

#### Paso 5: Disponibilidad Inmediata

**Próxima OT que necesite router**:
- Tab "Entrega de Equipos" → 20 routers nuevos aparecen en selector
- Estado DISPONIBLE → pueden asignarse inmediatamente
- Tracking completo desde entrada hasta instalación en cliente

---

## 3. Separación de Conceptos: ¿Por Qué Tres Modelos?

### Item vs. ItemBodega vs. Equipo

```
ITEM (Catálogo Maestro)
│
├─ Atributos genéricos: SKU, nombre, precio, especificaciones
├─ NO tiene ubicación física
├─ NO tiene cantidad
└─ Sirve de template para instancias físicas

    ↓

ITEMBODEGA (Stock por Ubicación)
│
├─ Instancia física en bodega específica
├─ cantidad_stock: Cuántos hay disponibles
├─ numero_serie: Nullable (si el item individual tiene serial)
└─ Control de inventario multi-bodega

    ↓ (Solo si es serializado)

EQUIPO (Activo Trackable)
│
├─ Item serializado con lifecycle management
├─ numero_serie ÚNICO: Identificador físico
├─ estado: DISPONIBLE / ASIGNADO / MANTENIMIENTO
├─ usuario_asignado: Quién lo tiene
├─ ubicacion: Dónde está físicamente
└─ Tracking end-to-end desde compra hasta baja
```

### Ejemplo Concreto

**Item**: Router TP-Link AC1750
- SKU: "RTR-TPLNK-1750"
- Precio: $80.000
- es_serializado: True

**ItemBodega** (múltiples registros):
- Bodega Central: cantidad_stock=5 (5 routers disponibles)
- Bodega Santiago: cantidad_stock=3
- Bodega Norte: cantidad_stock=2
- **Total stock empresa: 10 routers**

**Equipo** (10 registros individuales):
1. Router #SN123456 - DISPONIBLE - Bodega Central
2. Router #SN123457 - ASIGNADO a Juan Pérez - Cliente ABC
3. Router #SN123458 - MANTENIMIENTO - Taller Técnico
4. ...
10. Router #SN123465 - DISPONIBLE - Bodega Norte

**¿Por qué no todo es Equipo?**

**Consumibles** (tornillos, cables, conectores):
- NO necesitan tracking individual
- Se manejan por cantidad (50 metros cable UTP)
- Solo requieren ItemBodega

**Activos de valor** (routers, laptops, servidores):
- SÍ necesitan saber exactamente dónde está cada uno
- Requieren ItemBodega (inventario) + Equipo (tracking)
- Lifecycle: compra → bodega → asignado → instalado → mantenimiento → baja

---

## 4. XOR Constraint en ItemOT: Prevención de Doble Contabilización

### El Problema que Resuelve

**Sin XOR Constraint**:
```python
# ❌ MALO: Podrías hacer esto
ItemOT.objects.create(
    orden_trabajo=ot,
    item_bodega=cable_bodega_central,  # Referencia a stock existente
    guia_salida=guia_123,              # Y TAMBIÉN referencia a guía nueva
    cantidad=10
)
```

**Resultado**:
- Sistema resta 10 cables del stock de Bodega Central (item_bodega)
- Y TAMBIÉN cuenta 10 cables en la Guía de Salida (guia_salida)
- **Doble contabilización**: inventario descuadrado en 10 cables

---

### Con XOR Constraint

```python
class ItemOT(models.Model):
    item_bodega = models.ForeignKey(ItemBodega, null=True, blank=True)
    guia_salida = models.ForeignKey(GuiaSalida, null=True, blank=True)
    
    def clean(self):
        if self.item_bodega and self.guia_salida:
            raise ValidationError(
                "ItemOT debe tener O item_bodega O guia_salida, NO ambos. "
                "Esto previene doble contabilización de inventario."
            )
        if not self.item_bodega and not self.guia_salida:
            raise ValidationError(
                "ItemOT debe tener al menos uno: item_bodega o guia_salida."
            )
```

**Regla**: Solo UNO de estos puede estar lleno:
- ✅ `item_bodega=X, guia_salida=None` → Item desde stock existente
- ✅ `item_bodega=None, guia_salida=Y` → Item desde guía nueva
- ❌ `item_bodega=X, guia_salida=Y` → ValidationError (doble contabilización)

---

### Casos de Uso Reales

**Caso A: Item desde Stock Existente**
```python
# Técnico necesita cable que YA está en bodega
ItemOT.objects.create(
    orden_trabajo=ot_urgente,
    item_bodega=cable_bodega_central,  # Stock existente
    guia_salida=None,
    cantidad=15
)
# Sistema resta 15 del stock de Bodega Central
```

**Caso B: Item desde Guía de Salida Nueva**
```python
# Técnico necesita cable de una distribución nueva autorizada
ItemOT.objects.create(
    orden_trabajo=ot_proyecto,
    item_bodega=None,
    guia_salida=guia_materiales_proyecto,  # Distribución autorizada
    cantidad=15
)
# Sistema cuenta 15 en la guía, NO toca stock directamente
```

**Beneficio**: Claridad de provenance - siempre sabes de dónde vino cada item.

---

## 5. Estados de OT: Control de Workflow y Calidad

### Máquina de Estados

```
PENDIENTE (inicial)
    ↓ [AUTO: primer Trabajo asignado]
PROCESO (trabajo activo)
    ↓ [MANUAL: detención temporal]
PAUSADA
    ↓ [AUTO: todos Trabajos completados]
COMPLETADA (trabajo técnico terminado)
    ↓ [MANUAL: supervisor valida]
VALIDADA (aprobado para facturar)
    ↓ [MANUAL: factura generada]
CERRADA (archivado final)

CANCELADA (cualquier momento: cliente cancela, error, etc.)
```

### Propósito de Cada Estado

#### PENDIENTE
**Significado**: OT creada, esperando asignación de recursos.

**Triggers de entrada**:
- Creación inicial de OT

**Triggers de salida**:
- Automático: Se crea primer Trabajo → PROCESO
- Manual: Cliente cancela antes de asignar → CANCELADA

**Permisos**:
- Editable: Sí (todos los campos)
- Eliminar: No (soft delete vía CANCELADA)

**Dashboard metrics**:
- "OT Pendientes": cuántas esperando asignación
- Alertas si OT lleva >24h en PENDIENTE

---

#### PROCESO
**Significado**: Hay técnicos trabajando activamente en la OT.

**Triggers de entrada**:
- Automático: Primer Trabajo creado (via signal)

**Triggers de salida**:
- Automático: Todos los Trabajos completados → COMPLETADA
- Manual: Supervisor pausa temporalmente → PAUSADA
- Manual: Cliente cancela a medio camino → CANCELADA

**Permisos**:
- Editable: Solo campos operativos (comentarios, recursos)
- NO editable: empresa_cliente, folio, fechas iniciales

**Dashboard metrics**:
- "OT en Proceso": trabajo activo HOY
- Alertas si OT lleva >7 días en PROCESO sin avanzar (posible bloqueo)

**Caso de uso**:
- Supervisor pregunta: "¿Cuántas OT están en curso ahora?"
- Respuesta: COUNT(estado=PROCESO) = 15 OT activas

---

#### PAUSADA
**Significado**: Trabajo detenido temporalmente (espera de materiales, cliente no disponible, etc.).

**Triggers de entrada**:
- Manual: Supervisor pausa desde PROCESO

**Triggers de salida**:
- Manual: Supervisor resume → PROCESO
- Manual: No se puede retomar → CANCELADA

**Permisos**:
- Editable: comentarios (explicar motivo de pausa)
- NO editable: fechas, recursos

**Dashboard metrics**:
- "OT Pausadas": cuántas bloqueadas
- Alertas si OT lleva >14 días PAUSADA (resolver o cancelar)

**Caso de uso**:
- Cliente no disponible esta semana para visita
- Supervisor pausa OT con comentario: "Cliente de vacaciones hasta 15/11"
- OT NO cuenta como activa en métricas de productividad

---

#### COMPLETADA
**Significado**: Trabajo técnico terminado, esperando validación de supervisor.

**Triggers de entrada**:
- Automático: Último Trabajo marcado completado (via signal)

**Triggers de salida**:
- Manual: Supervisor valida calidad → VALIDADA
- Manual: Supervisor detecta problemas → PROCESO (rework)
- Manual: Cliente rechaza trabajo → CANCELADA

**Permisos**:
- Editable: Solo comentarios de validación
- NO editable: recursos, trabajos, fechas

**Dashboard metrics**:
- "OT Esperando Validación": cola de revisión para supervisores
- SLA: Validar en <24h

**Caso de uso**:
- Técnico Juan termina trabajo, marca Trabajo como Completado
- Sistema detecta que todos los Trabajos de esa OT están Completados
- Estado automático: PROCESO → COMPLETADA
- Notifica supervisor: "OT-2025-0042 lista para validación"

---

#### VALIDADA
**Significado**: Supervisor aprobó calidad del trabajo, listo para facturar.

**Triggers de entrada**:
- Manual: Supervisor valida desde COMPLETADA

**Triggers de salida**:
- Manual: Contabilidad genera factura → CERRADA
- Manual: Supervisor detecta error post-validación → COMPLETADA (excepcional)

**Permisos**:
- Editable: Solo datos de facturación
- NO editable: trabajo técnico, recursos, fechas

**Dashboard metrics**:
- "OT Validadas": cola de facturación
- SLA: Facturar en <48h

**Caso de uso**:
- Contabilidad filtra OT en estado VALIDADA
- Genera facturas masivas de todas las OT validadas del mes
- Envía facturas a clientes

---

#### CERRADA
**Significado**: Factura generada y enviada, OT archivada. Histórico completo para auditoría.

**Triggers de entrada**:
- Manual: Contabilidad cierra después de facturar

**Triggers de salida**:
- Ninguno (estado final)

**Permisos**:
- Editable: NO (inmutable)
- Solo lectura para auditoría

**Dashboard metrics**:
- "OT Cerradas": histórico completo
- Reports: Análisis de rentabilidad por OT

**Caso de uso**:
- Auditoría interna: "¿Qué materiales se usaron en OT-2024-1234?"
- Acceso de solo lectura a OT CERRADA con histórico completo

---

#### CANCELADA
**Significado**: OT cancelada (cliente canceló, error de registro, duplicado, etc.).

**Triggers de entrada**:
- Manual: Desde cualquier estado (requiere justificación)

**Triggers de salida**:
- Ninguno (estado final)

**Permisos**:
- Editable: Solo comentarios de justificación
- NO editable: datos históricos

**Dashboard metrics**:
- "OT Canceladas": tasa de cancelación
- Análisis: Motivos de cancelación más comunes

**Caso de uso**:
- Cliente cancela servicio antes de iniciar
- Supervisor marca OT como CANCELADA
- Comentario: "Cliente contrató otro proveedor"
- OT NO se factura, NO consume recursos

---

### ¿Por Qué No Simplemente Pendiente → Facturada?

**Tu pregunta**: "¿Por qué tanta complejidad? ¿No bastaría con crear OT y facturar?"

**Respuesta**: Control de calidad y trazabilidad.

**Escenario sin estados intermedios**:
- Técnico va a terreno, hace trabajo malo
- Nadie valida → factura se genera automáticamente
- Cliente reclama: "Esto está mal hecho"
- Empresa pierde credibilidad y tiene que rehacer gratis

**Escenario con estados intermedios**:
- Técnico marca Trabajo como Completado
- Sistema: PROCESO → COMPLETADA (automático)
- Supervisor revisa fotos, comentarios, materiales usados
- Si está bien: VALIDADA (manual) → Contabilidad puede facturar
- Si está mal: vuelve a PROCESO → técnico rehace antes de facturar

**Beneficios**:
1. **Checkpoint de calidad**: Supervisor valida antes de facturar
2. **Visibilidad**: Gerente ve cuántas OT están en cada etapa
3. **Métricas**: Tiempo promedio en cada estado (optimización de procesos)
4. **Trazabilidad**: Auditoría completa de quién hizo qué y cuándo
5. **Control de costos**: No se factura nada sin validación previa

---

## 6. Casos de Uso Avanzados

### 6.1. Multi-OT con Mismo Equipo

**Escenario**: Router #SN123456 se instala en Cliente A, luego se recupera y reasigna a Cliente B.

**OT 1: Instalación en Cliente A**
```python
# Estado inicial: Equipo DISPONIBLE en bodega
RecursoOT.objects.create(
    orden_trabajo=ot_cliente_a,
    content_type=ContentType.objects.get_for_model(Equipo),
    object_id=router_123456.id
)
# Signal actualiza: router.estado = ASIGNADO, router.ubicacion = 'Cliente A'
```

**OT 2: Recuperación**
```python
# Técnico visita Cliente A, recupera router
VisitaTerreno.objects.create(
    orden_trabajo=ot_recuperacion,
    comentarios='Router recuperado de Cliente A, devuelto a bodega'
)
# Manual: Actualizar router.estado = DISPONIBLE, router.ubicacion = 'Bodega Central'
```

**OT 3: Instalación en Cliente B**
```python
# Router nuevamente disponible para asignar
RecursoOT.objects.create(
    orden_trabajo=ot_cliente_b,
    content_type=ContentType.objects.get_for_model(Equipo),
    object_id=router_123456.id
)
# Signal actualiza: router.estado = ASIGNADO, router.ubicacion = 'Cliente B'
```

**Histórico completo**:
- RecursoOT: Tres registros (OT 1, OT 2, OT 3)
- Activos/Equipo: Un registro con historial de estados
- Trazabilidad: Desde compra hasta ubicación actual

---

### 6.2. Rendición de Gastos

**Escenario**: Técnico compra materiales de emergencia en terreno.

**VisitaTerreno**:
```python
visita = VisitaTerreno.objects.create(
    orden_trabajo=ot_emergencia,
    comentarios='Cliente sin servicio, compré cable UTP en ferretería local'
)
```

**RendicionGasto**:
```python
RendicionGasto.objects.create(
    content_type=ContentType.objects.get_for_model(VisitaTerreno),
    object_id=visita.id,  # GenericFK a VisitaTerreno
    monto=15000,
    descripcion='15m cable UTP Cat6',
    comprobante=foto_boleta,
    estado='PENDIENTE'
)
```

**Flujo aprobación**:
- Supervisor revisa: PENDIENTE → APROBADA
- Contabilidad reembolsa a técnico
- Se suma a costos de la OT para facturación

---

### 6.3. Retroalimentación de Cliente

**Escenario**: Cliente evalúa servicio después de completar OT.

```python
Retroalimentacion.objects.create(
    content_type=ContentType.objects.get_for_model(OrdenTrabajo),
    object_id=ot_finalizada.id,  # GenericFK a OT
    usuario=cliente_abc_user,
    comentario='Excelente servicio, técnico muy profesional',
    puntuacion=5,
    tipo='CLIENTE'
)
```

**Análisis**:
- Dashboard: Promedio de puntuación por técnico
- Alertas: OT con puntuación <3 requieren seguimiento

---

## 7. Preguntas Frecuentes

### 7.1. ¿Por qué ItemOT tiene XOR constraint?

**R**: Prevención de doble contabilización.
- `item_bodega`: Item desde stock existente (resta del inventario directamente)
- `guia_salida`: Item desde distribución nueva (cuenta en guía, no resta stock duplicado)
- Si permites ambos → inventario descuadrado

**Regla de negocio**: Un item usado en OT viene de UNA fuente, no dos.

---

### 7.2. ¿Por qué Equipo se crea automáticamente al completar OrdenCompra?

**R**: Items serializados = activos de valor que requieren tracking desde el momento que entran.
- Desde entrada a bodega, necesitas saber: ubicación, estado, quién lo tiene
- Signal `complete_orden_signal` asegura atomicidad: ItemBodega + Equipo ambos se crean o ambos fallan
- Previene que haya ItemBodega serializado sin su Equipo correspondiente (data inconsistency)

---

### 7.3. ¿Cuándo usar "Agregar Insumo" vs "Entrega de Equipos"?

**"Agregar Insumo"** (ItemOT con guia_salida):
- Consumibles que NO requieren tracking individual
- Ejemplos: cables, tornillos, conectores
- NO se espera devolución (consumidos en terreno)
- Modelo: ItemOT

**"Entrega de Equipos"** (RecursoOT con GenericFK a Equipo):
- Activos trackables que SÍ requieren seguimiento
- Ejemplos: routers, laptops, servidores
- SE espera devolución o registro de instalación permanente
- Modelo: RecursoOT + Equipo

**Distinción clave**: ¿Necesitas saber dónde está ese item específico después? → Equipo. ¿No? → Insumo.

---

### 7.4. ¿Por qué MovimientoBodega tiene restricción ONE-TIME en ENTRADA_DIRECTA?

**R**: Seguridad y auditabilidad.
- ENTRADA_DIRECTA: Primera carga de stock (inicial setup)
- Movimientos posteriores DEBEN usar GuiaEntrada/GuiaSalida (audit trail completo)
- Previene manipulación arbitraria de inventario

**Flujo correcto**:
1. Inicial: ENTRADA_DIRECTA (one-time)
2. Reposición: OrdenCompra → GuiaEntrada
3. Salida: GuiaSalida
4. Ajustes: GuiaAjuste (con justificación)

**Resultado**: Trazabilidad completa de cada movimiento.

---

### 7.5. ¿Qué pasa si cancelo una OT después de asignar recursos?

**R**: Depende del estado y tipo de recurso.

**Recursos humanos (técnicos)**:
- RecursoOT permanece (histórico de asignación)
- User no cambia estado (técnico sigue disponible)

**Equipos**:
- RecursoOT permanece (histórico)
- Manual: Actualizar `Equipo.estado` de ASIGNADO → DISPONIBLE
- Manual: Actualizar `Equipo.ubicacion` (devolver a bodega)

**Insumos**:
- ItemOT permanece (histórico de consumo)
- NO se devuelve al inventario automáticamente
- Proceso manual si se requiere ajuste de stock

**Razón**: Conservar trazabilidad completa incluso en OT canceladas (auditoría).

---

## 8. Próximos Pasos Sugeridos

### Exploración A: Completar Workflow OT Actual
1. Asignar Equipo #SN123456 a técnico Juan
2. Probar "Asistencia de Usuarios" (ahora desbloqueado)
3. Completar todos los Trabajos
4. Transicionar estados: Proceso → Completada → Validada → Cerrada
5. Documentar hallazgos

### Exploración B: Tabs No Probados
1. **Compras**: ¿Cómo se linkea OrdenCompra con OT?
2. **Rendiciones**: Probar RendicionGasto desde VisitaTerreno
3. **Retroalimentaciones**: Probar feedback de cliente post-servicio

### Exploración C: Edge Cases
1. ¿Qué pasa si anulo GuiaSalida DESPUÉS de agregar Insumo?
2. ¿Puedo revertir estado OT de Validada a Completada?
3. ¿Qué pasa si asigno mismo Equipo a dos OT simultáneas?

### Exploración D: Documentación
1. Crear `EXPLORACION_ORDENTRABAJO.md` con:
   - 10 fases exploradas
   - Patrones descubiertos (GenericFK, XOR, signals)
   - Blockers y resoluciones
   - Lecciones aprendidas
   - Comparación Path 1 vs Path 2
2. Actualizar `ESTADO_DOCUMENTACION.md` (80% → 90%)

---

**Última actualización**: 2025-11-05
