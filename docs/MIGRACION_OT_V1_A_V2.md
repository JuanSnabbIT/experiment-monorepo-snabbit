# Migración Frontend: OrdenTrabajo V1 → V2

## 📋 Resumen de Cambios Backend

### Modelos Principales

#### V1 (ordentrabajo)
- `OrdenDeTrabajo` - Modelo único
- `DetalleTrabajo` - Con GenericForeignKey a Cotizacion/VisitaSoporte/Compra

#### V2 (ordentrabajov2)
- `OrdenDeTrabajo` - Modelo base con `tipo_servicio`
- `SoporteTecnico` - Para servicios de soporte (presencial/remoto)
- `ServicioEnOT` - Para servicios generales
- `UsuarioAsignadoSoporte` - M2M entre SoporteTecnico y UsuarioEquipo
- `RendicionEnOt` - Gastos/rendiciones directamente en OT
- `CierreAdministrativoOT` - OneToOne con OT para validación de cierre

### Campos Nuevos en OrdenDeTrabajo V2

```python
tipo_servicio = CharField(choices=SERVICIOS_OT, default='general')
    # 'general' | 'soporte_r' | 'soporte_p'

tecnico_responsable_ot = FK(UsuarioEmpresa, null=True, blank=True)
    # Antes: responsable_empresa

cliente_solicitante = FK(UsuarioEmpresa, null=True, blank=True)
    # Antes: solicitante_empresa
```

### Campos Nuevos en Detalles (SoporteTecnico / ServicioEnOT)

```python
# Comunes en ambos
nombre = CharField(max_length=100)
descripcion = TextField()
estado = CharField(choices=ESTADOS_DETALLE_TRABAJO)
tecnico_asignado = FK(UsuarioEmpresa)
fecha_soporte / fecha_servicio = DateField(null=True)

# Solo en SoporteTecnico
usuarios = M2M(UsuarioEquipo, through='UsuarioAsignadoSoporte')

# Solo en ServicioEnOT
resuelto = BooleanField(default=False)
```

---

## 🔄 Mapeo de Endpoints

### OrdenDeTrabajo

| Operación | V1 | V2 |
|-----------|----|----|
| Listar | `GET /api/ordenes-trabajo/` | `GET /api/ordenes-de-trabajo/` |
| Crear | `POST /api/ordenes-trabajo/` | `POST /api/ordenes-de-trabajo/` |
| Detalle | `GET /api/ordenes-trabajo/{id}/` | `GET /api/ordenes-de-trabajo/{id}/` |
| Actualizar | `PATCH /api/ordenes-trabajo/{id}/` | `PATCH /api/ordenes-de-trabajo/{id}/` |
| Cambiar Estado | `PATCH /api/ordenes-trabajo/{id}/` | `POST /api/ordenes-de-trabajo/{id}/cambiar-estado/` |

### Detalles de Trabajo

**V1:**
```
GET/POST /api/ordenes-trabajo/{id}/detalles-trabajo/
GET/PATCH/DELETE /api/ordenes-trabajo/{id}/detalles-trabajo/{detalle_id}/
```

**V2 (depende de tipo_servicio):**

**Para Soporte (soporte_p, soporte_r):**
```
GET/POST /api/ordenes-de-trabajo/{id}/soportes-tecnicos/
GET/PATCH/DELETE /api/ordenes-de-trabajo/{id}/soportes-tecnicos/{soporte_id}/
POST /api/ordenes-de-trabajo/{id}/soportes-tecnicos/{soporte_id}/actualizar-estado/
```

**Para Servicios Generales:**
```
GET/POST /api/ordenes-de-trabajo/{id}/servicios-generales/
GET/PATCH/DELETE /api/ordenes-de-trabajo/{id}/servicios-generales/{servicio_id}/
POST /api/ordenes-de-trabajo/{id}/servicios-generales/{servicio_id}/actualizar-estado/
```

### Usuarios Asignados (Solo para Soporte)

**V2 Nuevo:**
```
GET/POST /api/soportes-v2/{soporte_id}/usuarios-asignados-soporte/
GET/PATCH/DELETE /api/soportes-v2/{soporte_id}/usuarios-asignados-soporte/{usuario_id}/
```

### Historial de Cambios

| V1 | V2 |
|----|----|
| `/api/ordenes-trabajo/{id}/historial-cambios-orden/` | `/api/ordenes-de-trabajo/{id}/historial-cambios/` |

### Adjuntos

| V1 | V2 |
|----|----|
| `/api/ordenes-trabajo/{id}/adjuntos/` | `/api/ordenes-de-trabajo/{id}/archivos-adjuntos/` |

### Gastos/Rendiciones

**V1:**
```
GET /api/ordenes-trabajo/{id}/detalles-gastos/
```

**V2:**
```
GET/POST /api/ordenes-de-trabajo/{id}/gastos-rendicion/
GET/PATCH/DELETE /api/ordenes-de-trabajo/{id}/gastos-rendicion/{gasto_id}/
```

### Cierre Administrativo

**V2 Nuevo:**
```
GET /api/ordenes-de-trabajo/{id}/cierre-administrativo/
PATCH /api/ordenes-de-trabajo/{id}/cierre-administrativo/{cierre_id}/
```

---

## 📦 Cambios en Interfaces TypeScript

### IOrdenDeTrabajo (interface)

**Campos a AGREGAR:**
```typescript
tipo_servicio: 'general' | 'soporte_r' | 'soporte_p'
tecnico_responsable_ot: number | null
cliente_solicitante: number | null
soporte_tecnico_count?: number  // read-only
servicios_count?: number  // read-only
cierre_administrativo?: ICierreAdministrativoOT | null
```

**Campos a RENOMBRAR:**
```typescript
// V1
responsable_empresa: number | null
solicitante_empresa: number | null

// V2 (equivalentes)
tecnico_responsable_ot: number | null
cliente_solicitante: number | null
```

**Campos a ELIMINAR:**
```typescript
adjuntos: number[]  // Ya no se devuelve en el serializer
trabajos: number[]  // Ya no se devuelve en el serializer
```

### IDetalleOrdenDeTrabajo (interface)

**Necesita separarse en dos:**

```typescript
// Para soportes técnicos
interface ISoporteTecnico {
    id: number
    orden: number
    nombre: string
    descripcion: string
    estado: 'pendiente' | 'en_proceso' | 'completado' | 'medianamente_completado' | 'no_realizado'
    tecnico_asignado: number | null
    fecha_soporte: string | null
    fecha_creacion: string
    fecha_modificacion: string
}

// Para servicios generales
interface IServicioEnOT {
    id: number
    orden: number
    nombre: string
    descripcion: string
    estado: 'pendiente' | 'en_proceso' | 'completado' | 'medianamente_completado' | 'no_realizado'
    tecnico_asignado: number | null
    resuelto: boolean
    fecha_servicio: string | null
    fecha_creacion: string
    fecha_modificacion: string
}
```

### Nuevas Interfaces

```typescript
interface IUsuarioAsignadoSoporte {
    id: number
    soporte_tecnico: number
    usuario_equipo: number
    trabajo_realizado: string
    resuelto: boolean
    fecha_creacion: string
    fecha_modificacion: string
}

interface IRendicionEnOt {
    id: number
    orden: number
    categoria: string
    detalle: string | null
    cantidad: number
    monto_unitario: number
    monto_total: number
    usuario_comprador: number | null
    fecha_compra: string
    fecha_creacion: string
    fecha_modificacion: string
}

interface ICierreAdministrativoOT {
    id: number
    orden: number
    usuario: number | null
    fecha_cierre: string
    valido: boolean
    resultado: Record<string, any>
    comentario: string | null
    fecha_creacion: string
    fecha_modificacion: string
}
```

---

## 🎯 Plan de Implementación

### Fase 1: Actualizar Interfaces y Slice
1. ✅ Analizar diferencias estructurales
2. ⏳ Actualizar `ordenTrabajo.interface.ts`
3. ⏳ Actualizar `ordenTrabajoSlice.ts` con nuevos endpoints

### Fase 2: Componentes Principales
4. ⏳ Modificar `CrearOrdenOT.tsx` - agregar campo `tipo_servicio`
5. ⏳ Modificar `DetalleOT.tsx` - usar nuevos endpoints y campos
6. ⏳ Modificar `ListaDetalleTrabajoOT.tsx` - detectar tipo y usar endpoint correcto

### Fase 3: Lógica Condicional
7. ⏳ Crear helper para detectar tipo de detalle según `tipo_servicio` de OT
8. ⏳ Implementar lógica condicional en modales de creación de detalles
9. ⏳ Ajustar componentes que consumen detalles de trabajo

### Fase 4: Pruebas
10. ⏳ Probar CRUD de OT con tipo 'general'
11. ⏳ Probar CRUD de OT con tipo 'soporte_p'
12. ⏳ Probar CRUD de OT con tipo 'soporte_r'
13. ⏳ Verificar estados, adjuntos, historial

---

## ⚠️ Consideraciones Importantes

### 1. **Detección de Tipo de Servicio**

El frontend debe determinar si crear `SoporteTecnico` o `ServicioEnOT`:

```typescript
const getDetalleEndpoint = (ordenTipoServicio: string) => {
    if (ordenTipoServicio === 'soporte_p' || ordenTipoServicio === 'soporte_r') {
        return 'soportes-tecnicos'
    }
    return 'servicios-generales'
}
```

### 2. **Campo content_type ya no existe**

En V1, `DetalleTrabajo` tenía un `GenericForeignKey` con `content_type` y `trabajo_id`.

En V2, esto desaparece - ahora son modelos específicos (`SoporteTecnico` o `ServicioEnOT`).

### 3. **Usuarios Asignados (M2M)**

Para soporte técnico, ahora se manejan usuarios a través de `UsuarioAsignadoSoporte`:

```typescript
// Crear asignación
POST /api/soportes-v2/{soporte_id}/usuarios-asignados-soporte/
{
    "usuario_equipo": 123,
    "trabajo_realizado": "Configuración de router",
    "resuelto": false
}
```

### 4. **Gastos/Rendiciones Simplificadas**

Ya no hay relación con sistema de Rendiciones externo. Ahora los gastos se crean directamente en la OT:

```typescript
POST /api/ordenes-de-trabajo/{id}/gastos-rendicion/
{
    "categoria": "hardware",
    "detalle": "Cable UTP Cat6",
    "cantidad": 50,
    "monto_unitario": 500,
    "fecha_compra": "2025-11-17T10:00:00Z"
}
```

### 5. **Cierre Administrativo**

Nueva funcionalidad para validar y cerrar OT:

```typescript
PATCH /api/ordenes-de-trabajo/{id}/cierre-administrativo/{cierre_id}/
{
    "valido": true,
    "comentario": "OT completada satisfactoriamente"
}
```

---

## 🔧 Helpers Recomendados

### 1. Detector de Endpoint de Detalles

```typescript
// frontend/src/utils/ordenTrabajoHelpers.ts

export const getDetalleTrabajoEndpoint = (
    tipoServicio: 'general' | 'soporte_r' | 'soporte_p'
): 'soportes-tecnicos' | 'servicios-generales' => {
    return ['soporte_p', 'soporte_r'].includes(tipoServicio) 
        ? 'soportes-tecnicos' 
        : 'servicios-generales'
}

export const isSoporteTecnico = (tipoServicio: string): boolean => {
    return ['soporte_p', 'soporte_r'].includes(tipoServicio)
}
```

### 2. Constructor de URLs Dinámicas

```typescript
export const buildDetalleTrabajoURL = (
    ordenId: number,
    tipoServicio: string,
    detalleId?: number
): string => {
    const endpoint = getDetalleTrabajoEndpoint(tipoServicio as any)
    const base = `/api/ordenes-de-trabajo/${ordenId}/${endpoint}/`
    return detalleId ? `${base}${detalleId}/` : base
}
```

---

## 📝 Notas Adicionales

- **Ambas apps están activas**: Durante la transición, tanto `ordentrabajo` como `ordentrabajov2` están disponibles
- **Los endpoints tienen guiones**: `/ordenes-de-trabajo/` en lugar de `/ordenes-trabajo/`
- **Estados son idénticos**: `ESTADOS_DETALLE_TRABAJO` y `ESTADOS_ORDEN` son los mismos en V1 y V2
- **Serializers más limpios**: V2 no incluye arrays de IDs relacionados, solo conteos

---

**Fecha:** 17 de Noviembre, 2025
**Estado:** Documento de referencia para migración
