---
Responsable: Fabián
Email: -
Proxima_revision: 2026-08-04
Estado: canonical
---

# Análisis – Monorepo ERP

**Propósito único:** Registrar decisiones técnicas, hallazgos críticos y análisis profundos de problemas/soluciones en el sistema.

**Qué va aquí:**
- Decisiones arquitectónicas con justificación
- Hallazgos de vulnerabilidades/bugs con impacto
- Análisis detallado de BLOQUEs implementados (patrones, riesgos, validaciones)
- Análisis activos con status de progreso
- Documentación de soluciones complejas (políticas, algoritmos, migraciones)

**Qué NO va aquí:**
- ❌ Timeline o fechas de entregas → usa `changelog.md`
- ❌ Roadmap o épicas futuras → usa `planificacion.md`
- ❌ Notas diarias o snippets → usa `notas.md`
- ❌ Procedimientos operativos paso a paso → usa `flujos_operativos.md`

**Mantenimiento:**
- Actualizar al cerrar análisis activos (mover a sección de completados con fecha)
- Un análisis por tema (no mezclar dominios)
- Incluir siempre: contexto, problema, impacto, solución propuesta, validación

---

## Estructura por Módulos

- Cada análisis debe comenzar con una nota de contexto breve y luego agruparse por módulo.
- Módulos sugeridos: `recursos`, `bodegas`, `ordentrabajov2`, `rendiciones`, `cotizaciones`, `facturacion`, `infra`.
- Para cada módulo incluir: problema, impacto, solución propuesta, cambios requeridos (migrations, views, serializers), pruebas necesarias.

## Módulo: Recursos y Activos


## Anexos Importados

Los siguientes análisis y especificaciones se integran aquí desde documentos temporales encontrados en el repositorio. Se conservaron títulos, fechas y contenido técnico para trazabilidad.
 
---

# Análisis: Auditoría de Seguridad (2025-02-12)

**Fecha:** 2025-02-12  
**Estado:** Pendiente de remediación  
**Contexto:** Auditoría de permisos y multi-tenancy en ViewSets

## Resumen ejecutivo
- **ViewSets auditados:** 50+
- **Hallazgos críticos:** 10+ (acceso público y fugas multi-tenant)
- **Riesgo:** exposición de datos entre empresas y endpoints sin autenticación

## Vulnerabilidades Críticas (CVE-like)

### CVE-ERP-001: Acceso público a `CategoriaViewSet`
**Severidad:** 🔴 CRÍTICO | **CVSS:** 8.2  
**Archivo:** `backend/items/views.py`

**Problema:** ausencia de `permission_classes`.

**Remediación:**
```python
permission_classes = [permissions.IsAuthenticated]
```

---

### CVE-ERP-002: Acceso público a `FabricanteViewSet`
**Severidad:** 🔴 CRÍTICO | **CVSS:** 8.2  
**Archivo:** `backend/items/views.py`

**Problema:** ausencia de `permission_classes`.

**Remediación:**
```python
permission_classes = [permissions.IsAuthenticated]
```

---

### CVE-ERP-003: Fuga multi-tenant en `LicenciaViewSet`
**Severidad:** 🔴 CRÍTICO | **CVSS:** 9.0  
**Archivo:** `backend/contratos/views.py`

**Problema:** `queryset = Licencia.objects.all()` sin `get_queryset()`.

**Remediación (patrón multi-tenant):**
```python
def get_queryset(self):
  user = self.request.user
  personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
  if personalizacion and personalizacion.sucursal_principal:
    return Licencia.objects.filter(
      empresa=personalizacion.sucursal_principal.empresa
    )
  return Licencia.objects.none()
```

---

### CVE-ERP-004 a CVE-ERP-008: Acceso público en contratos
**Severidad:** 🟡 ALTO | **Archivo:** `backend/contratos/views.py`

**ViewSets afectados:**
- `ServicioViewSet`
- `PlanServicioViewSet`
- `CaracteristicaServicioViewSet`
- `VisitaViewSet`
- `CondicionEspecialViewSet`

**Remediación:** agregar `permission_classes = [permissions.IsAuthenticated]`.

---

### CVE-ERP-009: Acceso público a `SoftwareViewSet`
**Severidad:** 🟡 ALTO | **Archivo:** `backend/core/views.py`

**Remediación:** `permission_classes = [permissions.IsAuthenticated]`.

---

### CVE-ERP-010: Acceso público a `AcuerdoConfidencialidadBaseViewSet`
**Severidad:** 🟠 MEDIO | **Archivo:** `backend/core/views.py`

**Remediación:** `permission_classes = [permissions.IsAuthenticated]`.

## Vulnerabilidades Altas

### RISK-HIGH-001: `AsistenciaUsuarioViewSet` sin filtro multi-tenant
**Archivo:** `backend/visitas/views.py`

**Problema:** filtra solo por visita, no por empresa.

**Remediación:** agregar filtro por empresa en `get_queryset()`.

---

### RISK-HIGH-002: `EntregaDeEquipoViewSet` sin filtro explícito
**Archivo:** `backend/visitas/views.py`

**Remediación:** aplicar patrón PersonalizacionUsuario (empresa/sucursal).

---

### RISK-HIGH-003 a RISK-HIGH-007: Recursos sin `permission_classes`
**Archivo:** `backend/recursos/views.py`

**ViewSets afectados:**
- `SoftwareInstaladoViewSet`
- `UsuarioEquipoViewSet`
- `MonitorEquipoViewSet`
- `AlmacenamientoEquipoViewSet`
- `FotoEquipoViewSet`

**Remediación:** agregar `permission_classes` y filtro multi-tenant.

## Vulnerabilidades Medias

### RISK-MED-001: `ItemEmpresaViewset` sin `empresa_pk`
**Archivo:** `backend/items/views.py`

**Problema:** sin `empresa_pk` retorna todos los items.

**Remediación:** requerir `empresa_pk` o devolver `none()`.

## Plan de remediación propuesto

### Fase 1 (Crítico)
- Agregar `permission_classes = [IsAuthenticated]` a viewsets públicos.
- Implementar filtro multi-tenant en `LicenciaViewSet`.
- Crear tests de aislamiento de datos.

### Fase 2 (Alto)
- Aplicar filtros multi-tenant en `recursos` y `visitas`.
- Crear permission reusable `EsDeEmpresa`.

### Fase 3 (Medio)
- Auditoría de accesos y rate limiting en endpoints públicos.

---

# Análisis: RTK Query — Fix de Invalidación de Cache (OrdenTrabajo)

**Fecha:** 2025-02-03  
**Estado:** ✅ Completado  
**Contexto:** RTK Query invalidatesTags funcionando, pero el UI no actualizaba por uso de `refetch()` manual.

## Problema
- Mutations ya tenían `invalidatesTags`.
- Componentes capturaban `refetch()` y lo llamaban manualmente.
- Resultado: doble fetch + condiciones de carrera + datos stale.

## Solución aplicada
1. **Eliminar `refetch()` en handlers** (uso manual invalida el mecanismo automático).
2. **Mantener `refetch()` solo en botones de refresh manual**.
3. **Confiar en `invalidatesTags` como fuente única de refresco**.

## Resultado esperado
- UI se actualiza sin reload.
- Una sola request por mutación.
- Consistencia de datos.

## Referencias
- Guía RTK Query: `.github/instructions/rtk-query-best-practices.md`

---

# Análisis: Propiedad vs Ubicación del Equipo

**Fecha:** 2026-01-12  
**Contexto:** Clarificar el modelo de negocio para gestión de equipos en Soportes Técnicos

---

## El Problema

El usuario planteó una pregunta crítica:

> "Se supone que si estamos registrando items en este sistema y luego registramos también equipos a clientes en este sistema, quiere decir que los equipos NO son de propiedad de los clientes, sino que son propiedad de la empresa de mi superior, pero que están siendo asignados y dejados en la empresa del cliente... el sistema debería reflejar una forma de poder ver todos los equipos de la empresa de mi superior, ¿no?"

**Análisis del problema:**
1. Existen **dos roles de Empresa** en el flujo:
   - **Empresa Superior** (propietaria) → compra, registra, posee inventario
   - **Cliente** (destino) → recibe equipo en préstamo/asignación temporal
2. El modelo actual NO distingue entre estos roles
3. El usuario NO PUEDE ver "todos sus equipos" (los de su empresa)
4. Los equipos aparecen asociados al cliente, no al propietario

---

## Casos de Uso del Mundo Real

### Caso 1: Empresa de Soporte Técnico
```
SuperiorIT (empresa propietaria de equipos)
├── Compra 50 laptops
├── Registra en bodega
├── Envía lote a Cliente A (implementación)
├── Asigna laptops a usuarios de Cliente A
├── 6 meses después, Cliente A devuelve 48 laptops
│   └── 2 laptops quedan dañadas, no devueltas
├── Las 48 se regresan a bodega SuperiorIT
├── Posteriormente, asigna 45 de esas 48 a Cliente B
└── [Historial completo: SuperiorIT → Cliente A → SuperiorIT → Cliente B]
```

**Necesidades del negocio:**
- ✅ SuperiorIT debe ver: "Tengo 50 laptops, 45 en Cliente B, 5 en bodega"
- ✅ SuperiorIT debe ver historial: "Esta laptop estuvo en Cliente A del 2024-06 al 2025-01"
- ✅ SuperiorIT debe poder: devolver equipo a bodega → reasignar a otro cliente
- ✅ SuperiorIT debe saber: "Cliente A devolvió equipos el 2025-01-10"

### Caso 2: Empresa de Outsourcing de Equipos
```
TechLease (empresa que ALQUILA equipos)
├── Compra inventario de equipos
├── Cliente X alquila 20 desktops (contrato 12 meses)
├── TechLease rastrea: ubicación física, desgaste, mantenimiento
├── Mes 6: Cliente X solicita reemplazo de 3 equipos defectuosos
│   └── TechLease envía 3 nuevos, retira 3 dañados
├── Mes 12: Cliente X devuelve los 20 equipos
│   └── TechLease inspecciona, documenta condición
├── Los 17 equipos sin daño se almacenan/reasingan
└── Los 3 equipos dañados se reparan/descartan
```

**Necesidades del negocio:**
- ✅ Control de activos por empresa propietaria
- ✅ Auditoría de movimientos (entrada/salida)
- ✅ Condición de equipo al retornar
- ✅ Billing basado en equipos/mes en cliente

### Caso 3: Empresa con Múltiples Clientes y Equipos Compartidos
```
ProyectosGlobal (empresa propietaria)
├── Equipo SN#ABC123 (camaras profesionales)
│   ├── Proyecto X (Cliente A): 2024-01 a 2024-03
│   ├── Proyecto Y (Cliente B): 2024-04 a 2024-06
│   └── Bodega: 2024-07 a presente
├── Equipo SN#DEF456 (laptop)
│   ├── Cliente A: 2024-01 a presente (12 meses)
```

**Necesidades del negocio:**
- ✅ Historial completo de dónde estuvo cada equipo
- ✅ Detectar "equipos en limbo" (sin cliente, sin bodega)
- ✅ Costo de propiedad por equipo (amortización)

---

## Análisis del Modelo Actual

### Estructura Django

```python
class Equipo(ModeloBase):
    cliente = FK(Empresa, null=True, blank=True)  # ← ¿Propietario o ubicación?
    registrado_por = FK(UsuarioEmpresa)  # ← Usuario que lo crea (implies empresa)
    numero_serie = CharField(unique=True)
    tipo_equipo = CharField()
    # ... otros campos
```

```python
class UsuarioEquipo(ModeloBaseHistorico):
    equipo = FK(Equipo)
    usuario = FK(UsuarioEmpresa)  # Usuario del cliente
```

---

### Interpretación Actual del Modelo

**Campo `cliente`:**
- Nombre sugiere: "El cliente propietario del equipo"
- Lógica implícita: `Equipo` pertenece a `cliente`
- Pero en el código: **NUNCA se asigna en `crear_equipos_para_items_guia()`**
- Resultado: `cliente = NULL` siempre

**Campo `registrado_por`:**
- Registro de auditoría: "¿Quién lo creó?"
- Se puede inferir propietario: `registrado_por.usuario_empresa.empresa`
- Pero es indirecto, NO es explícito

### Vistas / Filtros Actuales

```python
# backend/recursos/views.py
class EquipoViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        empresa_id = self.kwargs.get('empresa_pk')
        if empresa_id:
            # BUSCA: "Equipos donde cliente tiene relación con esta empresa"
            return Equipo.objects.filter(
                cliente__relaciones_como_cliente__prestador_servicios=empresa_id
            )
        return Equipo.objects.all()  # ← SIN FILTRO (¡peligro!)
```

**Lo que hace:**
- Busca `Equipo.cliente` que tenga una relación comercial con `empresa_id`
- Asume que `cliente` = propietario

**El problema:**
- `cliente = NULL` siempre, así que este filtro retorna NADA
- El usuario NO puede ver sus propios equipos
- El system permite ver equipos de otros (security issue)

---

## Interpretaciones Posibles

### Interpretación 1: Cliente = Propietario (Diseño Actual - Fallido)

```
┌─────────────────────┐
│  Equipo             │
│  ├── cliente ──────→│ Empresa (propietaria)
│  └── registrado_por │ UsuarioEmpresa
└─────────────────────┘

UsuarioEquipo
├── equipo → Equipo
├── usuario → UsuarioEmpresa (de cliente)
```

**Problemas:**
- `cliente = NULL` siempre
- No hay forma de especificar ubicación diferente del propietario
- No soporta préstamos entre clientes
- UsuarioEquipo no especifica "en qué empresa estoy usando esto"

### Interpretación 2: registrado_por.empresa = Propietario (Actual - Implícita)

```
┌─────────────────────┐
│  Equipo             │
│  ├── cliente ───→ NULL
│  └── registrado_por─→ UsuarioEmpresa (de empresa propietaria)
└─────────────────────┘

registrado_por.usuario_empresa.empresa = PROPIETARIO
```

**Ventajas:**
- Inferir propietario de `registrado_por` (pero implícito)
- Almacenar `cliente` para ubicación (pero NO se usa)

**Problemas:**
- Confuso, no es obvio
- Si usuario de Empresa A crea equipo, pero se asigna a Empresa B, ¿quién es propietario?
- Vistas actuales rompen: filtro por cliente no funciona

### Interpretación 3: Propietario = Empresa Explícita (RECOMENDADA)

```
┌──────────────────────────┐
│  Equipo (NUEVA)          │
│  ├── empresa_propietaria─→ Empresa (who owns it)
│  ├── cliente ────────────→ Empresa o NULL (ubicación actual)
│  └── registrado_por──────→ UsuarioEmpresa (audit)
└──────────────────────────┘

UsuarioEquipo
├── equipo → Equipo
├── usuario → UsuarioEmpresa (de cliente)
├── empresa_ubicacion → Empresa (where it's located)  // NUEVA
```

**Ventajas:**
- Explícito y claro
- Separa propiedad de ubicación
- Soporta cambios de ubicación
- Soporta "sin cliente" (en bodega)
- Historial de movimientos fácil de rastrear

**Cambios necesarios:**
- Agregar campo `empresa_propietaria` a Equipo
- Actualizar `crear_equipos_para_items_guia()` para asignar propietario
- Cambiar vistas: filtrar por `empresa_propietaria`, no `cliente`
- Opcionalmente, agregar modelo `MovimientoEquipo` para auditoría

---

## Comparativa: Mundo Real vs Actual

| Aspecto | Mundo Real | Sistema Actual | ¿Funciona? |
|---------|-----------|-----------------|-----------|
| **Propiedad del equipo** | Empresa Superior posee | `cliente=NULL` o inferred | ❌ No |
| **Ubicación del equipo** | Ubicado en Cliente A | `cliente=NULL` | ❌ No |
| **Cambio de ubicación** | A→B→C, registrado | No hay mecanismo | ❌ No |
| **Ver todos mis equipos** | "Dame todos, adonde sea" | No hay filtro correcto | ❌ No |
| **Usuario que lo usa** | Especificado en cliente | `UsuarioEquipo.usuario` | ✅ Sí |
| **Auditoría** | Quién lo registró | `registrado_por` | ✅ Sí (parcial) |
| **Equipo sin cliente** | En bodega, sin asignar | `cliente=NULL` | ⚠️ Ambiguo |
| **Equipo desvinculado** | Sin usuario, ubicado | Sin mecanismo | ❌ No |

---

## Flujos Afectados

### Flujo Actual (Incompleto)
```
Bodega (SuperiorIT)
    ↓
GuiaSalida (individualizado)
    ↓
comprobar_guia()
    ↓
crear_equipos_para_items_guia()
    → Equipo.create(numero_serie=X, cliente=NULL, registrado_por=user)
    ↓
??? El equipo "flota" sin ubicación
```

### Flujo Recomendado (Propuesto)
```
Bodega (SuperiorIT)
    ↓
GuiaSalida (individualizado, destino=ClienteA)
    ↓
comprobar_guia()
    ↓
crear_equipos_para_items_guia()
    → Equipo.create(
        numero_serie=X,
        empresa_propietaria=user.empresa,  // NUEVA
        cliente=guia.orden.cliente,        // NUEVA: de la OT
        registrado_por=user
      )
    ↓
UsuarioEquipo.create(
    equipo=E,
    usuario=user_cliente,
    empresa_ubicacion=cliente,  // NUEVA
    fecha_asignacion=today
)
    ↓
Equipo rastreable: propiedad, ubicación, usuario
```

---

## Recomendación Final

**Decisión:** Usar **Interpretación 3** (Propietario Explícito)

**Por qué:**
1. ✅ Refleja realidad del negocio (propiedad vs ubicación)
2. ✅ Permite responder: "¿Dónde están TODOS mis equipos?"
3. ✅ Soporta préstamos/traslados entre clientes
4. ✅ Auditoría clara y rastreable
5. ✅ Escalable a múltiples propietarios (future-proof)

**Cambios mínimos:**
- Agregar `empresa_propietaria = FK(Empresa)`
- Actualizar `crear_equipos_para_items_guia()` (2-3 líneas)
- Cambiar filtros en vistas (3-4 líneas)
- Opcionalmente: modelo `MovimientoEquipo` para historial

**Cambios no invasivos:**
- `cliente` sigue siendo nullable (para bodega sin ubicación)
- `registrado_por` sigue igual (auditoría)
- `UsuarioEquipo` sigue igual (usuarios del equipo)

**Próximos pasos:**
1. Consenso en diseño (propietario explícito)
2. Crear migración
3. Actualizar lógica en `crear_equipos_para_items_guia()`
4. Actualizar vistas y serializers
5. Probar con datos reales

---

**Autor:** Análisis para planificación (sin implementación)  
**Estado:** Pendiente decisión del usuario

---

# Módulo: Facturación
# Especificación: CierreAdministrativoOT

**Versión**: 1.0  
**Fecha**: 2026-01-12  
**Propósito**: Documentar estructura exacta de prefacturas y JSON para facturación manual por OTs

---

## Modelo Django

```python
# backend/ordentrabajov2/models.py

class CierreAdministrativoOT(ModeloBase):
    """
    Representa una prefactura manual de OT(s).
    Guarda todos los items considerados (facturados + no facturados) para auditoría.
    """
    cliente = models.ForeignKey(
        'empresas.Empresa',
        on_delete=models.CASCADE,
        related_name='cierres_administrativos'
    )
    ots_incluidas = models.JSONField(
        default=list,
        help_text="Array de IDs de OTs: [7, 8, 9]"
    )
    items_facturables = models.JSONField(
        default=list,
        help_text="Array de items a considerar para factura"
    )
    resumen = models.JSONField(
        default=dict,
        help_text="Totales: total_items, total_facturar, total_excluidos"
    )
    estado_cierre = models.CharField(
        max_length=20,
        choices=[
            ('borrador', 'Borrador - Editando'),
            ('finalizado', 'Finalizado - Listo para facturar'),
            ('facturado', 'Facturado - Factura real generada'),
        ],
        default='borrador'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    creado_por = models.ForeignKey(
        'empresas.UsuarioEmpresa',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Auditoría
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    actualizado_por = models.ForeignKey(
        'empresas.UsuarioEmpresa',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cierres_actualizados'
    )

    class Meta:
        verbose_name = "Cierre Administrativo OT"
        verbose_name_plural = "Cierres Administrativos OT"
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"Cierre {self.id} - Cliente {self.cliente.nombre} - Estado {self.estado_cierre}"
```

---

## Estructura del JSON - Detalle Completo

### POST /api/cierres-administrativos/ (Crear Prefactura)

**Request Body:**
```json
{
  "cliente_id": 15,
  "ots_incluidas": [7, 8],
  "items_facturables": [
    {
      "ot_id": 7,
      "item_id": 23,
      "tipo": "servicio_ot",
      "cantidad": 1,
      "precio_total": 0,
      "precio_ajustado": 0,
      "facturar": true,
      "comentario": "Servicio inicial de la OT"
    },
    {
      "ot_id": 7,
      "item_id": 6,
      "tipo": "guia_salida",
      "cantidad": 4,
      "precio_total": 0,
      "precio_ajustado": 0,
      "facturar": true,
      "comentario": "Camara Domo 2MP"
    },
    {
      "ot_id": 7,
      "item_id": 45,
      "tipo": "rendicion",
      "cantidad": 1,
      "precio_total": 2500,
      "precio_ajustado": 2500,
      "facturar": false,
      "comentario": "Gasto de viático (excluido)"
    },
    {
      "ot_id": 7,
      "item_id": 88,
      "tipo": "compra",
      "cantidad": 1,
      "precio_total": 2500,
      "precio_ajustado": 3000,
      "facturar": true,
      "comentario": "Precio ajustado por cliente solicitud especial"
    }
  ],
  "resumen": {
    "total_items": 4,
    "total_facturar": 3000,
    "total_excluidos": 2500
  }
}
```

**Response (201 Created):**
```json
{
  "id": 42,
  "cliente_id": 15,
  "ots_incluidas": [7, 8],
  "items_facturables": [...],
  "resumen": {...},
  "estado_cierre": "borrador",
  "fecha_creacion": "2026-01-12T10:30:00Z",
  "creado_por_id": 5,
  "mensaje": "Prefactura creada exitosamente. ID: 42"
}
```

---

## Campos de Item

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `ot_id` | integer | ✅ | ID de la OrdenDeTrabajo |
| `item_id` | integer | ✅ | ID del item específico (no compuesto) |
| `tipo` | string | ✅ | Tipo de modelo: `servicio_ot`, `soporte_tecnico`, `guia_salida`, `rendicion`, `compra` |
| `cantidad` | integer | ✅ | Cantidad del item |
| `precio_total` | float | ✅ | Precio original (del contrato o OT) - lectura solamente |
| `precio_ajustado` | float | ✅ | Precio ajustado por admin (puede ≠ precio_total) |
| `facturar` | boolean | ✅ | ¿Se incluirá en factura real? |
| `comentario` | string | ❌ | Contexto adicional (max 500 caracteres) |

---

## Validaciones Backend

### Al Crear Prefactura (POST)

1. **Cliente existe**: `cliente_id` debe ser válido
2. **OTs pertenecen al cliente**: Todas las OTs en `ots_incluidas` deben estar del cliente
3. **Items existen**: Para cada item:
   - `ot_id` + `item_id` + `tipo` deben referenciar un item existente en BD
   - Si `tipo=servicio_ot` → buscar en ServicioEnOT
   - Si `tipo=soporte_tecnico` → buscar en SoporteTecnico
   - Si `tipo=guia_salida` → buscar en GuiaSalida
   - Si `tipo=rendicion` → buscar en Rendicion
   - Si `tipo=compra` → buscar en Compra
4. **Precio ajustado válido**: 
   - `precio_ajustado >= 0` (sin negativos, o con regla especial)
   - Si `precio_ajustado ≠ precio_total` → comentario es recomendado
5. **Al menos un item con facturar=true**

### Al Actualizar Prefactura (PATCH/PUT)

1. Solo permitir si `estado_cierre = 'borrador'`
2. Solo se puede modificar:
   - `precio_ajustado`
   - `facturar` (checkbox)
   - `comentario`
3. NO se puede modificar:
   - `ot_id`, `item_id`, `tipo`, `cantidad`, `precio_total`
4. Recalcular `resumen` automáticamente

### Al Finalizar Prefactura (cambiar a finalizado)

1. Validar que al menos 1 item tiene `facturar=true`
2. Bloquear ediciones posteriores (estado finalizado)

---

## Cálculo del Resumen

```python
# Pseudocódigo
total_items = len(items_facturables)
total_facturar = sum(item['precio_ajustado'] for item in items_facturables if item['facturar'] == True)
total_excluidos = sum(item['precio_ajustado'] for item in items_facturables if item['facturar'] == False)

resumen = {
    "total_items": total_items,
    "total_facturar": total_facturar,
    "total_excluidos": total_excluidos
}
```

---

## Flujos de Estado

```
CREACIÓN:
POST /api/cierres-administrativos/
└─ estado = 'borrador'

EDICIÓN (solo en borrador):
PATCH /api/cierres-administrativos/{id}/
└─ estado sigue siendo 'borrador'

FINALIZACIÓN:
PATCH /api/cierres-administrativos/{id}/
body: { "estado_cierre": "finalizado" }
└─ estado = 'finalizado' → BLOQUEA futuras ediciones

FACTURACIÓN (futuro):
POST /api/cierres-administrativos/{id}/generar-factura/
└─ estado = 'facturado'
└─ crea Factura real en sistema fiscal
```

---

## Tipos de Items Soportados

### 1. `servicio_ot`
- Referencia: ServicioEnOT
- ID: servicio_en_ot.id
- Cantidad: 1 (siempre)
- Precio: Generalmente $0 (a menos que haya sobrevalor)

### 2. `soporte_tecnico`
- Referencia: SoporteTecnico
- ID: soporte_tecnico.id
- Cantidad: 1 (siempre)
- Precio: Generalmente $0

### 3. `guia_salida`
- Referencia: ItemsGuiaSalida (items dentro de GuiaSalida)
- ID: items_guia_salida.id (del registro de item en la guía)
- Cantidad: cantidad_entregada
- Precio: $0 (factura de productos, no servicios)

### 4. `rendicion`
- Referencia: RendicionItem (gastos dentro de Rendición)
- ID: rendicion_item.id
- Cantidad: 1 (siempre)
- Precio: monto_total del gasto

### 5. `compra`
- Referencia: ItemEnCompra (ítems de una compra)
- ID: item_en_compra.id
- Cantidad: cantidad
- Precio: precio_unitario * cantidad

---

## Ejemplo de Uso Completo

### 1. Usuario crea prefactura
```typescript
// Frontend: FacturacionesComparativa.tsx
const prefacturaJSON = {
  cliente_id: 15,
  ots_incluidas: [7],
  items_facturables: [
    { ot_id: 7, item_id: 23, tipo: 'servicio_ot', cantidad: 1, precio_total: 0, precio_ajustado: 0, facturar: true, comentario: 'Servicio inicial' },
    { ot_id: 7, item_id: 6, tipo: 'guia_salida', cantidad: 4, precio_total: 0, precio_ajustado: 0, facturar: true, comentario: 'Cámara Domo 2MP' }
  ],
  resumen: { total_items: 2, total_facturar: 0, total_excluidos: 0 }
};

// POST a backend
ApiService.fetchData({
  url: '/api/cierres-administrativos/',
  method: 'post',
  data: prefacturaJSON
});
```

### 2. Backend guarda en BD
```python
# Backend: CierreAdministrativoOTViewSet.create()
# Valida todos los items, guarda en BD
# Retorna: { id: 42, estado: 'borrador', ... }
```

### 3. Usuario ve prefactura en listado
```
GET /api/cierres-administrativos/
→ Tabla con todas las prefacturas del usuario
```

### 4. Usuario edita prefactura
```typescript
// Cambiar precio_ajustado o marca como no facturar
PATCH /api/cierres-administrativos/42/
body: {
  items_facturables: [
    { ...mismo item..., precio_ajustado: 2500 },  // Ajustó precio
    { ...mismo item..., facturar: false }          // Decidió no facturar
  ]
}
```

### 5. Usuario finaliza
```
PATCH /api/cierres-administrativos/42/
body: { "estado_cierre": "finalizado" }
```

---

## Próximas Fases (Futuro)

- [ ] Generar Factura Real desde CierreAdministrativoOT finalizado
- [ ] Integración con sistema fiscal
- [ ] PDF/Descarga de prefactura
- [ ] Auditoría de cambios en préstamos
- [ ] Política de bloqueo de precios (no permitir cambios si hay regla)


## Decisiones Técnicas Críticas

### Data-Leak Prevention (BLOQUE 2) – 2025-12-31 ✅ IMPLEMENTADO

**Vulnerabilidad Identificada:** 3 ViewSets retornaban `.all()` sin filtrar por empresa/sucursal

**Contexto:**
- `VoucherDevolucionViewSet`: Exposición completa de vouchers de devolución
- `ItemEnCompraViewSet`: Exposición completa de items de compra
- `ItemsGuiaSalidaViewSet`: Exposición completa de items de guías de salida

**Impacto:** Cross-company data leak – Usuarios podían acceder a datos de otras empresas/sucursales (vulnerabilidad ALTA)

**Solución Implementada:**
- Agregado filtro PersonalizacionUsuario en `get_queryset()` de cada ViewSet
- `VoucherDevolucion`: Filtra por `orden_trabajo__sucursal` + `empresa`
- `ItemEnCompra`: Filtra por `compra__sucursal`
- `ItemsGuiaSalida`: Filtra por `guia__bodega__sucursal` + `empresa`

**Cumplimiento de Estándares:** Alineado con regla backend: "SIEMPRE filtrar `get_queryset()` por PersonalizacionUsuario"

**Validación:** Commit `fabe48a` - Tests de sintaxis sin errores; requiere test unitario en producción

---

### Modal Backdrop Click Bug (BLOQUE 3) – 2025-12-31 ✅ IMPLEMENTADO

**Problema Identificado:** Modal cerraba al clickear en scrollbars
- `useEventListener('mousedown')` capturaba eventos de scrollbar
- Afectaba UX negativamente (cierre no deseado)

**Análisis:** Event propagation en listeners globales no diferenciaba backdrop vs scrollbar

**Solución Implementada:**
- Reemplazados listeners globales por handlers directos: `handleModalClick` y `handleStaticBackdropClick`
- Lógica: `event.target === event.currentTarget` (solo cierra si se clickea exactamente en el backdrop)
- Mejor performance: Eliminados listeners globales

**Impacto:** Sin breaking changes; solo corrección de UX

**Validación:** Commit `a94d9f7` - Manual testing requerido (no puede automatizarse completamente)

---

## Hallazgos de BLOQUEs Implementados

### BLOQUE 1: Cotizaciones Backend ✅

**Estado:** Validado existente en recovery
- Campo `porcentaje_recargo` en modelo `Cotizacion` (PositiveIntegerField, default=0)
- Histórico con `simple_history`
- 6 propiedades en `ItemCotizacion` actualizadas para usar `porcentaje_recargo or 0`

**Validación:** Tests de cotizaciones pasan sin errores

---

### BLOQUE 2: Bodegas + Compras ✅

**Estado:** 3 data-leak fixes + sistema completo de compras/devoluciones
- `VoucherDevolucion` + `MovimientoEnVoucher` modelos
- `Compra` + `ItemEnCompra` con estados borrador/completada
- Endpoints list/detalle/PDF/HTML

**Validaciones Realizadas:**
- Sintaxis Python: ✅ Sin errores
- Filtros PersonalizacionUsuario: ✅ Implementados
- Seguridad: ✅ Data-leak fixes aplicados

---

### BLOQUE 3: Órdenes Compra Frontend ✅

**Estado:** 3 refactores de UX
- Modal backdrop click: ✅ Corregido
- Aside flex layout: ✅ Mejorado (flex-1, overflow-y-auto)
- priceFormat CLP: ✅ Localizado es-CL sin decimales

**Validaciones Realizadas:**
- TypeScript compilation: ✅ Build success
- Linting: ✅ Sin warnings
- Manual testing (backdrop + layout + formato): Requerido

---

### BLOQUE 4: Guías de Salida ✅

**Estado:** Sistema completo con 3 data-leak filters (igual patrón que BLOQUE 2)
- `GuiaSalida` CRUD backend/frontend
- Filtros PersonalizacionUsuario: ✅ Implementados
- Endpoints: list/detalle/PDF/HTML

**Decisión:** Mismo patrón de seguridad que BLOQUE 2 → No requiere análisis adicional

---

## Módulo: Órdenes de Trabajo
### BLOQUE 5: Órdenes Trabajo V2 ✅

**Estado:** Sistema completo con refactores frontend
- `ordentrabajov2` app activada (reemplaza `ordentrabajo`)
- `ServicioEnOT` para servicios generales
- Refactores identificados en recovery:
  - `renderBadgeValue` helper (DetalleItemEmpresa)
  - `ModalEliminar` → `confirmAlert` pattern (SweetAlert2)
  - Imports consolidados

**Nota:** `renderBadgeValue` y `confirmAlert` ya existen en main (no requiere migración adicional)

**Decisión Technical Debt:** Refactores cosméticos deferred a próximo sprint (media prioridad)

---

## Análisis Activos

### Reemplazo OT V2 (2025-12-31)

**Estado:** En curso – Validación final requerida

**Completado:**
- App `ordentrabajov2` activada; `ordentrabajo` desactivada
- Djoser configurado: `SEND_ACTIVATION_EMAIL = False`
- Rutas frontend alineadas: `/cambio-contra/:uid/:token`
- Celery beat: Task de contratos → `contratos.tareas_2do_plano.actualizar_contratos_vencidos`
- Retroalimentacion apuntando a `ordentrabajov2` (modelos, utils, tasks)
- `manage.py check`: Sin errores

**Pendiente:**
- Revisar migraciones generadas (`bodegas`, `rendiciones`, `ordentrabajov2`)
- Ejecutar `migrate` en dev y validar
- Ajuste adicional en `retroalimentacion` para lógica V2 (si aplica)

**Riesgos:**
- Cambios en migraciones de `retroalimentacion` pueden requerir recrear BD en entornos con `0001_initial` preexistente

---

## Patrón Técnico: PersonalizacionUsuario Filtering

**Aplicado en BLOQUEs 2 y 4** – Prevención de data-leaks

```python
# Patrón estándar
def get_queryset(self):
    sucursal = self.request.user.personalizacionusuario.sucursal
    empresa = sucursal.empresa
    return super().get_queryset().filter(
        modelo__sucursal=sucursal,
        modelo__sucursal__empresa=empresa
    )
```

**Regla Aplicada:** Estándar del proyecto "SIEMPRE filtrar get_queryset() por PersonalizacionUsuario → empresa/sucursal"

**Cumplimiento:** 100% en BLOQUEs 2 y 4; revisión en otros módulos pendiente
---

## Módulo: Rendiciones
## BLOQUE 6: Análisis de Rendiciones (En Progreso) – 2026-01-05

**Estado:** 🟢 FASES 1-3 COMPLETADAS | 🔵 FASE 4 EN CURSO

### Aclaraciones de Alcance (2026-01-05)

**⚠️ TERMINOLOGÍA CRÍTICA:**
- **"Rendición"** (módulo `rendiciones`): Documento administrativo que consolida todos los gastos de una o más OTs para reembolso y facturación
- **"Gastos Operativos"** (modelo `GastoOperativoEnOt` en `ordentrabajov2`): Gastos operativos registrados durante la ejecución de una OT específica
- **Histórico:** Se usaba "RendicionEnOt" hasta v0.XX; renombrado a `GastoOperativoEnOt` para eliminar ambigüedad

**FLUJO CORRECTO:**
1. Técnico ejecuta OT → registra **Gastos Operativos** (`GastoOperativoEnOt`) y hace **Compras** durante el trabajo
2. OT pasa a estado "Completada" → **Sistema crea automáticamente Rendición** con todos los gastos y compras
3. Administración revisa **Rendición** → Aprueba/Rechaza → Procesa reembolso y facturación

**ARQUITECTURA ACTUAL (verificada 2026-01-13):**
- ✅ Modelo `GastoOperativoEnOt` existe en `ordentrabajov2` (gastos operativos de la OT)
- ✅ Modelo `Compra` existe en `bodegas` (materiales/servicios facturables)
- ✅ Modelo `Rendicion` existe en `rendiciones` (documento consolidado)
- ✅ `ItemRendicion` usa GenericForeignKey para referenciar `GastoOperativoEnOt`, `DetalleGastoRendicion`, `Compra`
- ❌ **NO existe creación automática** de Rendición al completar OT (FASE 6 pendiente)
- ❌ **NO existe FK** `Rendicion.orden_trabajo` (FASE 6 pendiente)
- ✅ Existe hook `_sincronizar_relaciones_completada()` en OT (actualiza Compras, no crea Rendición)

### Problema Identificado (Estado Actual)

**Situación Actual:**
- ❌ Sistema completamente manual: Usuario crea Rendición vacía, agrega gastos uno a uno
- ❌ Sin relación OT ↔ Rendición: No hay FK entre modelos, imposible saber si OT está rendida
- ✅ **RESUELTO (FASE 1):** Categorías limpiadas, solo operativas (18 categorías, materiales eliminados)
- ✅ **RESUELTO (FASE 2):** Política de viáticos implementada (reembolsable vs facturable)
- ❌ PDF incompleto: Solo muestra `DetalleGastoRendicion`, omite `GastoOperativoEnOt` y `Compra` (FASE 5)
- ❌ Sin validación: Técnicamente se puede rendir 2+ veces el mismo gasto (FASE 6)
- ❌ Sin automatización: No se crea Rendición al completar OT (FASE 6)

### Conceptos Profesionales Aclarados

**Rendición de Gastos:** Documento que consolida TODOS los gastos de una OT, separados por propósito:

1. **Gastos Operativos (reembolsables al técnico):**
   - Pagador inicial: Técnico (de su bolsillo)
   - Pagador final: Depende de **política de viáticos**:
     - 'I' (Incluidos): Empresa asume, NO facturable
     - 'F' (Facturables): Se cobran al cliente
   - Ejemplos: Taxi, comida, hospedaje, peajes, llamadas
   - Modelos: `GastoOperativoEnOt`, `DetalleGastoRendicion`

2. **Compras (SIEMPRE facturables al cliente):**
   - Dinero de empresa / técnico con fondo
   - Se cobran en factura al cliente
   - Incluyen: Materiales inesperados, consumibles
   - Modelo: `Compra` (siempre facturable, independiente de política)

**Política de Viáticos:** Define si gastos operativos se reembolsan internamente o se facturan al cliente
- `'I'` (Incluidos): Empresa asume gastos operativos (no se cobran)
- `'F'` (Facturables): Cliente paga gastos operativos (se cobran en factura)

### Solución Propuesta

**Arquitectura:**

```
Empresa (Cliente):
  └─ politica_viaticos_default: 'I' | 'F'
       ↓ (heredado a todas sus OTs/Rendiciones)

Rendición:
  ├─ cliente: FK a Empresa
  ├─ politica_viaticos: NULLABLE (override si es excepción)
  └─ politica_viaticos_efectiva: Propiedad (usa override o heredado)
       ↓
  total_reembolso_tecnico = SUMA(todos los gastos, siempre)
  total_facturable_cliente = SUMA(gastos operativos SI politica='F' + SIEMPRE Compras)
  total_no_facturable = total_reembolso - total_facturable
```

**Categorías:**
- ✅ SOLO operativos: Transporte, Alimentación, Hospedaje, Comunicaciones, Peajes, Servicios Admin
- ❌ ELIMINAR materiales: Esos van a `Compra`

**Cambios en Modelos:**
1. `Empresa.politica_viaticos_default`: CharField choices ('I'/'F'), default='I'
2. `Rendicion.cliente`: FK nullable (null=True, blank=True)
3. `Rendicion.politica_viaticos`: CharField choices nullable (null=True, blank=True)
4. `Rendicion` propiedades: `total_reembolso_tecnico`, `total_facturable_cliente`, `total_no_facturable`

**Flujos Modificados:**
1. Creación Rendición: Usuario selecciona cliente → hereda política automáticamente
2. Edición: Puede override política (solo si Borrador)
3. PDF: Separa gastos operativos vs materiales, muestra 3 totales
4. Serializers: Retornan política efectiva y 3 totales

**Validaciones Necesarias:**
- Política debe ser válida al guardar ('I' o 'F')
- Si cliente vacío, usar default 'I'
- Impedir cambio de cliente si Rendición ya tiene aprobaciones

**Opcional - Automatización (Fase 6):**
- Cuando OT pasa a "completada": Crear automáticamente Rendición con todos los gastos
- Estado inicial: "En Aprobación" (no Borrador)
- FK `Rendicion.orden_trabajo`: OneToOneField
- Validación: Una sola Rendición por OT

### Decisión de Implementación

**Opción elegida:** C (Híbrido - Cliente + Override en Rendición)
- Rationale: Balance entre simplicidad (cliente default) y flexibilidad (override por rendición)
- Previene error humano (olvido de marcar política)
- Permite excepciones (mismo cliente, política diferente por proyecto)

### Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| Data migration: Rendiciones existentes sin cliente | ALTO | Script post-migración: asignar cliente de usuario.sucursal.empresa |
| Limpieza de categorías: Referencias huérfanas | MEDIO | Revisar si CategoriaGastoRendicion se usa en otros modelos |
| Cambio en lógica de facturación: Facturas cliente | ALTO | Validar con negocio antes de implementar; documental cambio |
| Compras duplicadas en rendición | BAJO | Validación frontend: mostrar gasto ya rendido como "no disponible" |

### Documentación del Cambio (Antes/Después)

Será actualizada en `changelog.md` al completar cada fase:
- Qué se eliminó/agregó en modelos
- Cambios en serializers
- Cambios en cálculos
- Cambios en UX/PDF
- Impacto en facturas (si aplica)

---

## Matching Manual para Facturación (importado desde `dev/docs/matching-manual.md`)

**Propósito único:** Documentar estrategia y UI de emparejamiento manual de OTs pactadas vs ejecutadas para facturación.

**Resumen:** Se decidió arrancar con un proceso de matching 100% manual por la alta complejidad contextual de las OTs. El admin realizará vinculación visual entre lo pactado (contrato) y lo ejecutado (OTs), asignando precios y clasificando items/extras.

### Decisión: 100% Manual (Justificación)

La dinámica real de los trabajos en OT es demasiado variable para automatizar sin perder control:

- No siempre 1 OT presencial = 1 visita
- No siempre 1 servicio pactado = 1 trabajo ejecutado
- Los usuarios dentro de la OT afectan el matching (p.ej. visita a [Juan, Pepe] ≠ visita a [Juan, Pepe, Diego])

### Ejemplos de Complejidad (resumen)

- Visita incompleta: faltó usuario → puede generar nueva visita/extra
- Servicio extra en la misma visita: se factura como extra
- Guías y rendiciones dentro de la misma OT: separarlos en materiales vs gastos operativos

(Los ejemplos completos y bloques de código se mantienen en `dev/docs/matching-manual.md` mientras revisamos la integración de UI)

### Estrategia de UI (alto nivel)

- Implementar `MatchingPanel` con dos columnas (Pactado | Ejecutado)
- Dropdowns y controles para vincular items, asignar precio, marcar extras
- Componente frontend sugerido: `MatchingPanel.tsx` con estado `MatchingState` y `vinculaciones`

### Implicaciones técnicas (resumen)

- Endpoint backend sugerido: `POST /api/cierres-facturacion/crear-con-matching/` que reciba `ots_ids`, `contrato_id` y `vinculaciones`
- Modelo `CierreAdministrativoOT` debe aceptar `ordenes_vinculadas` (M2M) y un JSONField `analisis_matching`
- Frontend: `MatchingPanel.tsx`, lógica para cálculos dinámicos y UI de vinculación

### Siguientes pasos sugeridos

1. Mantener `dev/docs/matching-manual.md` como fuente temporal mientras se implementa MVP visual.
2. Implementar `MatchingPanel.tsx` en frontend (MVP) y endpoint backend mínimo.
3. Migrar ejemplos clave y la estructura de vinculaciones al `analisis.md` si se estabilizan los casos.

---

---