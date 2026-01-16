---
Responsable: -
Email: -
Proxima_revision: -
Estado: canonical
---

# Sistemas – Monorepo ERP

**Propósito único:** Inventario de sistemas vivos en producción (módulos, patterns técnicos, integraciones).

**Qué va aquí:**
- Módulos activos con localizaciones (modelos, views, servicios)
- Patterns técnicos reutilizables (PersonalizacionUsuario filtering, confirmAlert, etc.)
- Sistemas de generación (PDFs, reportes, etc.)
- Integraciones recomendadas (futuras, contexto de la arquitectura)
- Reglas de mantenimiento por módulo

**Qué NO va aquí:**
- ❌ Decisiones de diseño → usa `analisis.md`
- ❌ Cambios planificados → usa `planificacion.md`
- ❌ Notas de desarrollo → usa `notas.md`
- ❌ Procedimientos paso a paso → usa `flujos_operativos.md`

**Mantenimiento:**
- Actualizar cuando un sistema nuevo entre en producción
- Mantener solo sistemas VIVOS (archivados no incluyen)
- Enlazar a análisis detallados en `analisis.md` cuando sea necesario
- Una sección por módulo/sistema

---

## Estructura por Módulos

- Módulos (ejemplos): `bodegas`, `ordentrabajov2`, `rendiciones`, `cotizaciones`, `items`, `recursos`, `empresas`, `frontend`.
- Para cada módulo: ubicar modelos, viewsets, serializers, endpoints críticos y estado (prod/legacy/experimental).
- Mantener una subsección con acciones pendientes y enlaces a `analisis.md` cuando aplique.

## Generación de PDFs

**Librería:** ReportLab (todos los PDFs)

**Backend principal:** `backend/cotizaciones/functions.py`
- `generar_pdf_cotizacion_desde_model()`
- Helpers para tablas, estilos, márgenes

**Módulos cubiertos:**
- Cotizaciones (desde cliente, con histórico)
- Bodegas (Órdenes Compra, Guías Salida, Devoluciones/Vouchers)
- Rendiciones (gastos ligados a OT)
- Contratos (PDF de contrato con firma)
- Vacaciones (PDF de solicitud/aprobación)
- Órdenes de Compra (documento de pedido)

**Regla:** Validar rutas y contratos antes de modificar plantillas

---

## Módulo: Bodegas
## Sistema de Devoluciones

**Backend:** `backend/bodegas`
- Modelos: `VoucherDevolucion` + `MovimientoEnVoucher`
- ViewSet: `VoucherDevolucionViewSet` (list/detalle/PDF/HTML)
- Security: Filtro PersonalizacionUsuario (BLOQUE 2) → previene data leaks

**Frontend:** `frontend/src`
- Interfaces: `src/interface/bodega.interface.ts`
- Servicio: `src/services/VoucherDevolucionService`
- Slice: `src/store/slices/bodega`
- Componentes:
  - `src/pages/OrdenTrabajo/components/DevolucionesOT.tsx` (vista en OT)
  - `src/pages/Bodegas/` (lista y detalle de devoluciones)

**Uso:** Registro y seguimiento de devoluciones de items, agrupación por movimiento, descarga PDF/HTML

---

## Módulo: Rendiciones/Compras
## Rendiciones y Compras

**Modelos clave (bodegas):**
- `Compra` (items, estados borrador → enviada → completada)
- `ItemEnCompra` (asignación items a compra)
- `Bodega` (asociada a sucursal/empresa)

**Modelo clave (ordentrabajov2):**
- `RendicionEnOt` (gastos ligados a OT)

**Flujo típico:**
- Cotización aceptada → Crear Orden Compra (por proveedor)
- OC completada → Ingreso a `StockItemEnBodega`
- Crear Guía de Salida → Reserva stock
- Guía entregada → Crea OT + Soporte (hoy 1:1)
- Soporte completado → Opcional rendición de gastos

**Security:** 3 filtros PersonalizacionUsuario en BLOQUEs 2-4

---

## Módulo: Órdenes de Trabajo
## Órdenes de Trabajo V2

**Backend:** `backend/ordentrabajov2` (reemplaza `ordentrabajo`)

**Módulos principales:**
- `ordentrabajov2/models.py`: `OrdenTrabajo`, `ServicioEnOT`, `SoporteTecnico`, `RetroalimentacionServicio`
- `ordentrabajov2/serializers.py`: Serialización completa
- `ordentrabajov2/views.py`: Endpoints CRUD + actions
- `ordentrabajov2/functions.py`: Lógica pesada (creación automática desde GuiaSalida, cierre con validaciones)

**Frontend:** Multiple pages + services + slices
- `src/pages/OrdenTrabajo/` (detalle, lista, formulario, servicios, soportes)
- `src/services/OrdenTrabjoService.ts`
- `src/store/slices/ordenTrabajo`

**Decisión técnica:** Refactores cosméticos deferred (renderBadgeValue, confirmAlert patterns ya presentes)

---

## Módulo: Frontend
## Patrón Frontend: confirmAlert (SweetAlert2)

**Uso:** Confirmaciones de acciones críticas (eliminación, cambios de estado)

**Ubicación:** `frontend/src/utils/sweetAlert.ts`

**Función principal:**
```typescript
export const confirmAlert = async ({
  title,
  text,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  icon = 'warning',
  confirmColor,
  cancelColor,
}): Promise<boolean>
```

**Implementación en componentes:**
```typescript
// Ejemplo: ModalEliminar
const handleDelete = async () => {
  const ok = await confirmAlert({
    title: `Confirmar eliminación`,
    text: `¿Está seguro?`,
    confirmColor: '#dc2626',
  });
  if (!ok) return;
  
  try {
    await ApiService.fetchData({ url, method: 'delete' });
    toast.success('Eliminado correctamente');
    onDispatch(); // Refresh UI
  } catch (error) {
    toast.error(`Error: ${error}`);
  }
};
```

**Componentes usando patrón:**
- `ModalEliminar` (Items, Proveedores, Categorías, Fabricantes, etc.)
- Eliminaciones en OT, Servicios, Soportes

---

## Patrón Frontend: renderBadgeValue

**Uso:** Mostrar pares etiqueta-valor con fallback a placeholder

**Ubicación:** `frontend/src/pages/Items/DetalleItemEmpresa.tsx` (local function, exportable como utility si se reutiliza)

**Función:**
```typescript
const renderBadgeValue = (label: string, value: string | undefined, placeholder: string) => (
  <div className="w-full">
    <Badge>{label}</Badge>
    <div className={value ? "ml-4" : "ml-4 text-gray-400 italic"}>
      {value || placeholder}
    </div>
  </div>
);
```

**Uso:**
```typescript
{renderBadgeValue("Correo Soporte", email, "Sin Correo")}
{renderBadgeValue("Fabricante", nombre, "Sin Fabricante")}
```

**Aplicado en:** DetalleItemEmpresa (metadatos de fabricante, soporte técnico)

---

## Patrón Backend: PersonalizacionUsuario Filtering

**Regla:** SIEMPRE filtrar `get_queryset()` por PersonalizacionUsuario → empresa/sucursal

**Implementación (Estándar):**
```python
def get_queryset(self):
    sucursal = self.request.user.personalizacionusuario.sucursal
    empresa = sucursal.empresa
    return super().get_queryset().filter(
        modelo__sucursal=sucursal,
        modelo__sucursal__empresa=empresa
    )
```

**ViewSets Protegidos (BLOQUEs 2-4):**
- `VoucherDevolucionViewSet` → VoucherDevolucion (orden_trabajo → sucursal + empresa)
- `ItemEnCompraViewSet` → ItemEnCompra (compra → sucursal)
- `ItemsGuiaSalidaViewSet` → ItemsGuiaSalida (guia → bodega → sucursal + empresa)
- Otros ViewSets en GuiaSalida, OrdenCompra, etc.

**Cumplimiento:** 100% en BLOQUEs 2 y 4; auditoría en otros módulos recomendada

---

## Integraciones Recomendadas (Próximo Sprint)

### ServicioEnOT ↔ GuiaSalida
- Objetivo: Múltiples guías por OT, trazabilidad de insumos
- Pattern: FK/OneToOne entre `ServicioEnOT` → `GuiaSalida`
- Implicación: Cambios en creación automática OT (hoy 1:1, propuesto flexible)

### API Reportería
- Endpoints agregados para analytics: vendido, costos, márgenes
- Usar patterns existentes (filtros PersonalizacionUsuario, serializers)

---

## Reglas de Mantenimiento

- Reflejar solo sistemas en producción (archivado no incluido)
- Al cambiar un sistema, actualizar aquí + registrar en `changelog.md`
- No incluir planes: esos van en `planificacion.md`
- No detallar análisis: esos van en `analisis.md`
 
---

## Matriz de permisos UI — Órdenes de Trabajo (importado desde `dev/docs/orden_trabajo_ui_permissions.md`)

Este apartado resume las reglas de visibilidad/habilitación en la UI para Órdenes de Trabajo. Las reglas descritas aquí fueron importadas desde `orden_trabajo_ui_permissions.md` y deben servir como contrato visual para implementaciones frontend.

### Convención encontrada

- Checks inline en JSX: ternarios/condicionales en markup
- Estados por componente: cada componente verifica `detalleOrdenTrabajo.estado`
- No existe centralización actual (cada componente decide)

### Cambios puntuales recomendados (resumen)

1. `ListaOT` — Botón `Eliminar OT`: mostrar solo si `estado === 'pendiente'` (envolver `ModalEliminar` con check)
2. `ListaServiciosOT` / `ListaSoportesTecnicosOT` — Vincular/Desvincular Guías: mostrar solo en `pendiente`
3. `ComprasEnOT` / `RendicionesOT` — Crear Compra/Rendición: permitir solo en `en_proceso`
4. `Adjuntos` / `Fotos` — Permitir creación en `pendiente|en_proceso|completada` (verificar consistencia)

### Tabla de cambios (resumen)

| Componente | Acción | Recomendación |
|---|---:|---|
| ListaOT | Eliminar OT | Mostrar solo en `pendiente` |

---
| ListaServiciosOT | Vincular/Desvincular Guía | Mostrar solo en `pendiente` |
| ComprasEnOT | Crear Compra | Permitir solo en `en_proceso` |
| RendicionesOT | Crear Rendición | Permitir solo en `en_proceso` |

### Implementación (nota)

- Seguir patrón existente: cambios mínimos por componente (inline checks)
- Antes de aplicar cambios masivos, validar con mantenedor ya que algunas condiciones pueden depender de workflows locales

---
