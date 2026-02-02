# API Pública - Aprobación/Rechazo de Cotizaciones

> **Última actualización:** 2026-02-02  
> **Responsable:** Equipo Backend  
> **Próxima revisión:** 2026-08-02

## Resumen

El sistema permite que clientes (solicitantes) aprueben o rechacen cotizaciones desde un enlace en su email, **sin necesidad de autenticación**.

---

## Endpoints Públicos

**Base URL:** `/api/public/cotizacion/`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/{token}/` | Ver detalle de cotización |
| POST | `/{token}/aprobar/` | Aprobar cotización |
| POST | `/{token}/rechazar/` | Rechazar cotización |

---

## 1. GET `/api/public/cotizacion/{token}/`

**Obtiene el detalle completo de la cotización para mostrar al cliente.**

### Response 200

```json
{
  "id": 123,
  "numero_cotizacion": 800,
  "nombre": "Proyecto X",
  "estado": "enviada",
  "estado_display": "Enviada",
  "fecha_emision": "2026-01-15",
  "fecha_vencimiento": "2026-02-15",
  "es_vigente": true,
  "moneda": "CLP",
  "observaciones": "Incluye instalación",
  "empresa": {
    "nombre": "Mi Empresa SpA",
    "rut": "76.XXX.XXX-X",
    "logo": "https://..."
  },
  "cliente": {
    "nombre": "Cliente ABC",
    "rut": "77.XXX.XXX-X"
  },
  "items": [
    {
      "id": 1,
      "nombre_display": "Servicio de mantención",
      "descripcion": "Mantención mensual",
      "cantidad": 12,
      "precio_venta_unitario": "150000.00",
      "descuento_porcentaje": "0.00",
      "subtotal": "1800000.00"
    }
  ],
  "subtotal": "1800000.00",
  "descuento_total": "0.00",
  "iva": "342000.00",
  "total": "2142000.00",
  "solicitante": {
    "nombre": "Juan Pérez",
    "email": "juan@cliente.cl",
    "puede_responder": true,
    "ya_respondio": false,
    "aprobo": null
  }
}
```

### Errores

- `404`: Token inválido o no encontrado

---

## 2. POST `/api/public/cotizacion/{token}/aprobar/`

**Aprueba la cotización (total o parcial).**

### Request Body

```json
{
  "item_ids": [1, 2, 3]
}
```

> `item_ids` es opcional. Si está vacío o no se envía, se aprueban todos los items.

### Response 200

```json
{
  "detail": "Cotización aprobada exitosamente.",
  "numero_cotizacion": 800,
  "items_aprobados": 3
}
```

### Errores

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | "Este enlace ya fue utilizado para responder." | Token ya usado |
| 400 | "Esta cotización no está en estado de espera de respuesta." | Estado inválido |
| 404 | "Token no encontrado" | Token inexistente |
| 410 | "Esta cotización ha expirado y ya no puede ser aprobada." | Fecha vencimiento pasada |

---

## 3. POST `/api/public/cotizacion/{token}/rechazar/`

**Rechaza la cotización.**

### Request Body

```json
{
  "motivo": "El precio excede nuestro presupuesto"
}
```

> `motivo` es **requerido** y debe tener mínimo 10 caracteres.

### Response 200

```json
{
  "detail": "Cotización rechazada.",
  "numero_cotizacion": 800
}
```

### Errores

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | "Por favor proporcione un motivo más detallado (mínimo 10 caracteres)." | Motivo muy corto |
| 400 | "Este enlace ya fue utilizado para responder." | Token ya usado |
| 400 | "Esta cotización no está en estado de espera de respuesta." | Estado inválido |
| 404 | "Token no encontrado" | Token inexistente |
| 410 | "Esta cotización ha expirado y ya no puede ser rechazada." | Fecha vencimiento pasada |

---

## Flujo de UI Recomendado

```
┌─────────────────────────────────────────────────────────┐
│  Email con link: https://app.com/cotizacion/{token}    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  GET /api/public/cotizacion/{token}/                   │
│  → Mostrar detalle de cotización                       │
│  → Verificar solicitante.puede_responder               │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│ puede_responder  │            │ puede_responder  │
│     = true       │            │     = false      │
└────────┬─────────┘            └────────┬─────────┘
         │                               │
         ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│ Mostrar botones: │            │ Mostrar mensaje: │
│ [Aprobar]        │            │ "Ya respondiste" │
│ [Rechazar]       │            │ o "Expirada"     │
└────────┬─────────┘            └──────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌────────┐
│Aprobar │  │Rechazar│
└───┬────┘  └───┬────┘
    │           │
    ▼           ▼
┌────────────┐ ┌─────────────────┐
│ Selección  │ │ Modal con       │
│ de items   │ │ textarea motivo │
│ (opcional) │ │ (min 10 chars)  │
└─────┬──────┘ └───────┬─────────┘
      │                │
      ▼                ▼
┌──────────────────────────────────────┐
│ POST .../aprobar/ o .../rechazar/   │
└──────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│ Pantalla de confirmación:            │
│ "Gracias, tu respuesta fue enviada"  │
└──────────────────────────────────────┘
```

---

## Campos Clave para UI

| Campo | Tipo | Uso |
|-------|------|-----|
| `es_vigente` | boolean | Si es `false`, mostrar aviso de expiración |
| `solicitante.puede_responder` | boolean | Si es `false`, ocultar botones de acción |
| `solicitante.ya_respondio` | boolean | Mostrar "Ya respondiste anteriormente" |
| `solicitante.aprobo` | boolean/null | `true`=aprobó, `false`=rechazó, `null`=sin respuesta |
| `estado_display` | string | Texto legible del estado |

---

## Consideraciones Técnicas

1. **Sin autenticación**: Estos endpoints son públicos, el token UUID es la única validación
2. **Token single-use**: Después de aprobar/rechazar, el token no puede usarse para más acciones
3. **Multi-view**: El cliente puede ver la cotización múltiples veces con el mismo token
4. **Notificaciones**: Al aprobar/rechazar, se notifica automáticamente al emisor de la cotización vía Celery task
5. **IP tracking**: Se registra la IP del cliente al responder para auditoría

---

## Archivos Relacionados (Backend)

- `cotizaciones/public_views.py` - Vistas públicas
- `cotizaciones/public_serializers.py` - Serializers para endpoints públicos
- `cotizaciones/urls.py` - Registro de URLs
- `cotizaciones/tasks.py` - Task `notificar_respuesta_cotizacion`
- `cotizaciones/models.py` - Campos de token en `SolicitanteCotizacion`
