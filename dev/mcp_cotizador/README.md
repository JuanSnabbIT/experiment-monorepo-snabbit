# MCP Cotizador — ERP Snabbit

MCP server que permite a un agente crear cotizaciones completas (cabecera + ítems)
en el ERP, de forma atómica, vía el endpoint `POST /api/cotizaciones/crear-completa/`.

## Arquitectura

```
Agente (Cowork) ──► MCP server (server.py) ──HTTP+Token──► ERP Django
                                                   │
                                                   ▼
                                    /api/cotizaciones/crear-completa/
                                    (transacción atómica, empresa forzada,
                                     tipo de cambio síncrono, sin correo)
```

El agente NO habla con la base de datos ni simula clics: llama una API con contrato
estable. Lo que crea aparece en tu UI porque usa las mismas tablas que el frontend.

## Puesta en marcha

### 1. Backend (una vez)

El endpoint ya está en el repo (`cotizaciones/agente_views.py`, `agente_serializers.py`,
ruta en `cotizaciones/urls.py`). No requiere migraciones. Solo asegúrate de desplegar el código.

Crea el usuario de servicio y su token:

```bash
cd backend
python manage.py crear_agente_cotizador --email agente@miempresa.cl --sucursal <ID_SUCURSAL>
```

Copia la API key que imprime.

### 2. MCP server

```bash
cd dev/mcp_cotizador
pip install -r requirements.txt
cp .env.example .env      # y completa ERP_BASE_URL + ERP_TOKEN
python server.py
```

### 3. Conectar a Cowork

Registra este server como MCP local (stdio) en tu configuración de Cowork/Claude,
apuntando a `python /ruta/a/dev/mcp_cotizador/server.py` con las variables de entorno
`ERP_BASE_URL` y `ERP_TOKEN`.

## Herramienta expuesta

`crear_cotizacion_completa(cliente, nombre, items, tipo_moneda="2", ...)`

- `cliente`: ID de la Empresa cliente (debe estar relacionada con tu empresa).
- `items`: lista de dicts. Cada uno: `cantidad`, `precio_unitario`, y `nombre` o `item_empresa`.
  Opcionales: `tipo_moneda` ("1"=USD, "2"=CLP, "3"=UF), `descripcion`, `proveedor_empresa`, `porcentaje_recargo`.
- Monedas: `"1"`=USD, `"2"`=CLP, `"3"`=UF.

Devuelve `numero_cotizacion`, `total_estimado` y deja la cotización en estado **pendiente**.

## Garantías y límites de seguridad

- **Multi-tenancy forzado**: la empresa emisora se deriva del token, nunca del payload.
- **Cliente validado**: debe existir una `RelacionEmpresa` con tu empresa.
- **Ítems validados**: `item_empresa`/`proveedor_empresa` deben pertenecer a tu empresa.
- **Atómico**: o entra la cotización completa, o no entra nada.
- **Sin correo**: nunca envía al cliente. El envío es una acción humana aparte.

### Riesgo conocido (no resuelto por este MCP)

El ERP tiene `DEFAULT_PERMISSION_CLASSES = AllowAny`. Este endpoint sí exige token,
pero el resto de la API no. Endurecer la postura de auth global es un trabajo separado
y recomendado antes de exponer más superficie a agentes.
