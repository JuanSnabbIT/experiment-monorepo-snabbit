---
name: snapshot-tasas
description: Por qué congelar tasas de cambio en contratos — volatilidad, snapshot fields
lastUpdated: 2026-06-01
relatedFiles:
  - backend/contratos/models.py
  - backend/contratos/currency_utils.py
  - .github/instructions/currency-system.md
---

# Snapshots de Tasas — Congelación de Monedas

## Problema

**Escenario:** Cotización en USD a $1,000 USD cuando dólar = $900 CLP
- Usuario calcula total: 1,000 × 900 = $900,000 CLP
- 2 semanas después, dólar sube a $950 CLP
- Sistema recalcula: 1,000 × 950 = $950,000 CLP
- ❌ Contrato cambió de precio sin aprobación del cliente

**Impacto:** Pérdida de dinero, disputas legales, desconfianza

## Solución: Snapshots

**Congelar tasas en momento clave** (ej: aprobación de cotización)

```python
class ContratoEmpresaCliente(ModeloBase):
    # Tasas en el momento de APROBACIÓN
    snapshot_tasa_dolar = DecimalField()      # Dólar al momento de aprobar
    snapshot_tasa_uf = DecimalField()         # UF al momento de aprobar
    snapshot_total_venta = DecimalField()     # Total en moneda_cobro CONGELADO
    snapshot_total_servicios = DecimalField() # Total servicios congelado
```

## Cuándo Congelar

### ✅ EN APROBACIÓN (Cliente aprueba cotización)

```python
# En views.py o serializer:
def aprobar_cotizacion(self, request, *args, **kwargs):
    cotizacion = self.get_object()
    
    # Obtener tasas hoy
    dolar, uf = obtener_tipos_cambio_actuales()
    
    # Congelar en snapshots
    cotizacion.snapshot_tasa_dolar = dolar
    cotizacion.snapshot_tasa_uf = uf
    cotizacion.snapshot_total_venta = cotizacion.total_venta  # En moneda_cobro
    cotizacion.estado = 'aprobada'
    cotizacion.save()
    
    # De ahora en adelante, usar snapshots para cálculos
```

### ❌ NO congelar en borrador

Borrador = Precio puede cambiar. Usuario quiere ver actualizaciones

## Cómo Usar Snapshots en Cálculos

```python
def calcular_total_final(contrato: ContratoEmpresaCliente) -> Decimal:
    """Usa snapshots si contrato está aprobado, tasas actuales si es borrador"""
    
    if contrato.estado == 'aprobada':
        # ✅ Usar SNAPSHOTS (congelado)
        return contrato.snapshot_total_venta
    else:
        # ✅ Usar tasas ACTUALES (dinámico)
        dolar, uf = obtener_tipos_cambio_actuales()
        return consolidar_totales_items(
            items=contrato.items.all(),
            moneda_cobro=contrato.moneda_cobro,
            dolar_observado=dolar,
            valor_uf=uf
        )
```

## Ventajas

✅ **Auditoría:** Sabemos qué precio aprobó cliente (histórico)  
✅ **Precisión legal:** Contrato vale lo que cliente aprobó  
✅ **Menos disputas:** Cliente sabe precio final  
✅ **Facilita facturación:** Factura usa snapshot (no tasa del día)

## Snapshot Fields Actuales

| Modelo | Campo Snapshot | Propósito |
|--------|----------------|-----------|
| `ContratoEmpresaCliente` | `snapshot_tasa_dolar` | Dólar al aprobar |
| | `snapshot_tasa_uf` | UF al aprobar |
| | `snapshot_total_venta` | Total congelado |
| | `snapshot_total_servicios` | Servicios congelados |
| `ContratoTrabajador` | `snapshot_tasa_dolar` | Dólar (si aplica) |
| | `snapshot_sueldo` | Sueldo congelado |

## Ejemplo Real

**Cotización B2B:**
```
Febrero 2026:
  - Servicio: $5,000 USD
  - Dólar: $900 CLP → Total: $4,500,000 CLP
  - Cliente aprueba
  - Se congelan: snapshot_tasa_dolar = 900, snapshot_total = 4,500,000

Marzo 2026:
  - Dólar sube a $950 CLP
  - Contrato sigue valiendo $4,500,000 CLP (snapshot)
  - Factura se emite a $4,500,000 CLP
  - ✅ Cliente paga lo que aprobó, no lo que dólar hizo hoy
```

## Checklist

```
☐ ¿El contrato tiene estado 'aprobado'?
  → Usar snapshot_* para todos los cálculos

☐ ¿El contrato está en borrador/pendiente?
  → Usar obtener_tipos_cambio_actuales() + consolidar_totales_items()

☐ ¿Se actualizaron items después de aprobación?
  → ⚠️ Advertir: "Esto no cambiará el precio aprobado"

☐ ¿Factura generada?
  → Usar snapshot de ese contrato (no tasa del día de facturación)
```

---

**Cuándo usar:** Agregación de items, validación de precio, facturación, auditoría de cambios
