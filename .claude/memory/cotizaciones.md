---
name: cotizaciones
description: Cotizaciones con multi-moneda, aprobación pública, solicitud de cambios, estados
lastUpdated: 2026-06-01
relatedFiles:
  - backend/cotizaciones/models.py
  - backend/cotizaciones/serializers.py
  - backend/cotizaciones/estados_modelo.py
  - .github/instructions/currency-system.md
---

# Cotizaciones — Multi-Moneda & Aprobación Pública

## Modelos Clave

**Cotizacion**
- `numero` — Identificador público (CZ-2026-001)
- `empresa` — Empresa prestadora
- `cliente` — Empresa cliente (FK)
- `moneda_cobro` — CLP, USD, UF
- `total_venta` — Precio final (congelado en aprobación)
- `estado` — borrador, enviada, aprobada, rechazada, vencida
- `token_aprobacion_publica` — UUID para firma pública (sin login)
- `fecha_vencimiento` — Cuándo expira

**ItemCotizacion**
- `cotizacion` — FK
- `descripcion` — Qué se cotiza
- `cantidad` — Unidades
- `precio_unitario` — Por unidad (moneda_cobro)
- `subtotal` — cantidad × precio_unitario

**SolicitudCambio**
- `cotizacion` — FK
- `usuario_solicitante` — Quien pide cambio
- `descripcion` — Qué cambiar
- `estado` — pendiente, aceptada, rechazada

## Conversión de Monedas

**SIEMPRE usar:** `contratos/currency_utils.py`

```python
from contratos.currency_utils import consolidar_totales_items, obtener_tipos_cambio_actuales

dolar, uf = obtener_tipos_cambio_actuales()
total_clp = consolidar_totales_items(
    items=cotizacion.items.all(),
    moneda_cobro=cotizacion.moneda_cobro,
    dolar_observado=dolar,
    valor_uf=uf
)
```

⚠️ **CRÍTICO:** Tasas se congelan en aprobación (`snapshot_tasa_dolar`, `snapshot_total_venta`). Ver [[snapshot-tasas]].

## Flujos Clave

### Creación
1. Usuario crea cotización (borrador)
2. Agrega items (CLP, USD, UF mixto)
3. Sistema calcula total en moneda_cobro
4. Estado: `borrador`

### Envío a Cliente
1. Click "Enviar"
2. Genera `token_aprobacion_publica` (UUID)
3. Envía URL: `/cotizaciones/aprobar/{token}/`
4. Estado: `enviada`
5. Cliente abre sin login, ve resumen, aprueba o rechaza

### Aprobación
1. Cliente click "Aprobar" (sin login)
2. Congeladas tasas (`snapshot_*`)
3. Estado: `aprobada`
4. Dispara notificación `COTIZACION_APROBADA` al grupo `ventas`

### Solicitud de Cambios
1. Cliente (o empresa) pide cambios via SolicitudCambio
2. Equipo revisa, acepta o rechaza
3. Si acepta: vuelve a `borrador` para editar
4. Genera nuevo token_aprobacion_publica

## Estados

```
borrador → enviada → aprobada → [facturación]
         ↘ rechazada
```

⏱️ Si no se aprueba en 30 días: `vencida` (notificación `COTIZACION_POR_VENCER`)

## Tareas Celery

- `alertar_cotizaciones_por_vencer` — Cada 9 AM (crontab)
- `expirar_cotizaciones_vencidas` — Cada medianoche

## Multi-Tenancy

```python
# ViewSet DEBE filtrar:
def get_queryset(self):
    empresa = self.request.user.personalizacion.sucursal_principal.empresa
    return Cotizacion.objects.filter(empresa=empresa)
```

## RTK Query Tags

Tags usados en frontend:
- `Cotizaciones` — Lista
- `CotizacionesDetalle` — Detalle
- `CotizacionesAprobadas` — Filtro aprobadas

Usar `invalidatesTags` tras crear/actualizar (nunca `refetch()` manual).

---

**Cuándo usar esto:** Implementar feature de cotizaciones, agregar moneda nueva, cambiar validaciones de aprobación
