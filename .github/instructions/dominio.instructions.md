# Instrucciones de Dominio de Negocio

> Contexto de negocio para que los agentes entiendan las entidades y flujos del ERP.
> Referencia rápida del modelo de datos y relaciones.

---

## Modelo de Tenancy

```
Empresa (tenant raíz)
├── Sucursal (1:N)
│   └── UsuarioEmpresa (N:M via PersonalizacionUsuario)
├── RelacionEmpresa (prestador ↔ cliente)
│   └── EmpresaCliente (empresas que son clientes)
├── Cotizacion (1:N)
├── OrdenDeTrabajo (1:N)
├── Contrato (1:N)
├── Bodega (1:N)
└── ... (todas las entidades de negocio)
```

**Regla cardinal**: toda consulta a la BD DEBE filtrar por empresa del usuario autenticado.

---

## Flujos principales

### Cotizaciones → Órdenes de Trabajo

```
Cotización (pendiente → enviada → aprobada/rechazada)
    └── Si aprobada → puede generar OrdenDeTrabajo
        └── OT (pendiente → en_proceso → completada)
            ├── SoporteTecnico (N por OT)
            │   ├── UsuarioAsignado (técnicos)
            │   ├── GastoOperativo (gastos de terreno)
            │   └── GuiaSalida (materiales de bodega)
            ├── ServicioEnOT (servicios prestados)
            └── CierreAdministrativo (cierre facturación)
```

### Bodegas y Stock

```
Bodega
├── StockItemEnBodega (stock actual por item)
├── OrdenCompra (solicitud de compra)
│   └── ItemEnOrdenCompra
│       └── Cuando se recibe → genera MovimientoStock (entrada)
├── Compra (compra directa)
│   └── ItemEnCompra
├── GuiaSalida (salida de materiales)
│   └── ItemEnGuiaSalida
│       └── Genera MovimientoStock (salida)
└── TomaInventario (ajuste manual)
    └── ItemEnInventario
```

### Contratos

```
ContratoEmpresaCliente (borrador → activo → vencido/cancelado)
├── ContratoServicio (servicios incluidos)
│   └── GenericFK → Servicio | PlanServicio
├── ContratoLicencia (licencias de software)
└── Renovación automática vía Celery beat
```

### Rendiciones

```
Rendicion (borrador → enviada → aprobada/rechazada)
└── GastoRendicion (N gastos por rendición)
    └── Puede vincular con GastoOperativoEnOt
```

---

## Apps y sus entidades principales

### `core`
- `PersonalizacionUsuario`: perfil extendido, vincula User ↔ Sucursal
- `IndicadorEconomico`: tipos de cambio (USD, UF, etc.)
- `EmailTemplate`: plantillas de email (no modelo, es lógica en tasks.py)
- `DescripcionGrupo`: metadata para grupos de permisos

### `cuentas`
- `User`: modelo custom (email como username)
- `UsuarioEmpresa`: vincula User con Empresa + rol/grupos
- `InvitacionEmpresa`: invitaciones por email

### `empresas`
- `Empresa`: tenant raíz
- `Sucursal`: sucursales de la empresa
- `RelacionEmpresa`: relaciones prestador-cliente entre empresas
- `EmpresaCliente`: empresas externas que son clientes

### `cotizaciones`
- `Cotizacion`: cotización formal
- `ItemCotizacion`: líneas de la cotización (con conversión CLP/USD/UF)
- `SolicitanteCotizacion`: quien solicita (GenericFK → externo | usuario)
- `SeguimientoCotizacion`: audit trail de acciones
- `EnvioCorreoCotizacion`: registro de emails enviados
- `CotizacionOrdenTrabajoRelacion`: vincula cotización con OT

### `ordentrabajov2`
- `OrdenDeTrabajo`: orden de trabajo principal
- `SoporteTecnico`: intervención/visita dentro de la OT
- `UsuarioAsignadoSoporte`: técnicos asignados
- `ServicioEnOT`: servicios prestados
- `SeguimientoServicioOT`: seguimiento de servicios
- `GastoOperativoEnOt`: gastos de terreno
- `CierreAdministrativoOT`: cierre para facturación
- `ServicioGeneral` + `SeguimientoServicioGeneral`: servicios no ligados a soporte

### `bodegas`
- `Bodega`: almacén
- `StockItemEnBodega`: stock actual
- `OrdenCompra` + `ItemEnOrdenCompra`: solicitudes de compra
- `Compra` + `ItemEnCompra`: compras directas
- `GuiaSalida` + `ItemEnGuiaSalida`: salidas de material
- `TomaInventario` + `ItemEnInventario`: ajustes de inventario
- `MovimientoStock`: registro de movimientos (entrada/salida) con GenericFK

### `items`
- `Item`: producto/material del catálogo
- `CategoriaItem`: categorización jerárquica
- `Proveedor`: proveedores
- `Fabricante`: fabricantes

### `contratos`
- `ContratoEmpresaCliente`: contrato principal
- `ContratoServicio`: servicios del contrato (GenericFK)
- `ContratoLicencia`: licencias incluidas

### `retroalimentacion`
- `Retroalimentacion`: encuesta/feedback (GenericFK)
- `PreguntaEnRetroalimentacion`: preguntas (GenericFK → múltiples modelos)
- `RespuestaEnRetroalimentacion`: respuestas

---

## Monedas y Conversión

El ERP maneja tres monedas:
- **CLP** (Peso chileno) — moneda base
- **USD** (Dólar americano)
- **UF** (Unidad de Fomento — valor indexado chileno)

Patrón de conversión en `ItemCotizacion`:
- Cada item almacena precio en su moneda original + tipo de moneda
- Properties calculan `_tasa_usd_clp()`, `_tasa_uf_clp()` usando indicadores económicos
- Total siempre se expresa en CLP para consolidación

---

## Localización Chile

| Aspecto | Valor |
|---|---|
| Timezone | `America/Santiago` |
| Locale | `es-ES` |
| Monedas | CLP, UF, USD |
| Feriados | `holidays` library (Chilean holidays) |
| Divisiones | Región → Provincia → Comuna (`bd_ciudades`) |
| RUT | Campo frecuente en empresas y contactos |

---

## Patrones de estado por app

### Cotizaciones
`pendiente` → `enviada` → `aprobada` | `rechazada` | `expirada`

### Órdenes de Trabajo  
`pendiente` → `en_proceso` → `completada` | `cancelada`

### Soportes Técnicos
`pendiente` → `en_proceso` → `completado` | `cancelado`

### Contratos
`borrador` → `activo` → `vencido` | `cancelado`

### Rendiciones
`borrador` → `enviada` → `aprobada` | `rechazada`

### Órdenes de Compra
`pendiente` → `aprobada` → `recibida` | `cancelada`

### Guías de Salida
`pendiente` → `completada` | `cancelada`
