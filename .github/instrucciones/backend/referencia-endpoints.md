# 📋 Referencia Rápida de Endpoints del Sistema ERP

**Fecha:** 2025-11-04  
**Generado para:** Exploración del sistema

---

## 🔐 Autenticación

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/auth/jwt/create` | POST | Login (obtener access y refresh tokens) |
| `/auth/jwt/refresh` | POST | Renovar access token con refresh token |
| `/auth/jwt/verify` | POST | Verificar validez de token |
| `/auth/users/me/` | GET | Obtener datos del usuario actual |
| `/auth/users/` | GET, POST | Listar usuarios / Crear usuario |

**Ejemplo de login:**
```bash
POST http://localhost:8000/auth/jwt/create
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}
```

---

## 🏢 Empresas y Sucursales

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/empresas/` | GET, POST | Listar/crear empresas |
| `/api/empresas/{id}/` | GET, PUT, PATCH, DELETE | Detalle/editar/eliminar empresa |
| `/api/empresas/{id}/sucursales-empresa/` | GET, POST | Sucursales de una empresa |
| `/api/usuarios-empresa/` | GET, POST | Relaciones usuario-empresa |

---

## 📝 Cotizaciones

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/cotizaciones/` | GET, POST | Listar/crear cotizaciones |
| `/api/cotizaciones/{id}/` | GET, PUT, PATCH, DELETE | Detalle/editar/eliminar cotización |
| `/api/cotizaciones/{id}/items/` | GET, POST | Items de una cotización |
| `/api/cotizaciones/{id}/seguimientos/` | GET, POST | Seguimientos de cotización |
| `/api/items-cotizacion/` | GET, POST | Todos los items de cotizaciones |

---

## 📋 Contratos

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/contratos/` | GET, POST | Listar/crear contratos |
| `/api/contratos/{id}/` | GET, PUT, PATCH, DELETE | Detalle/editar/eliminar contrato |
| `/api/contratos/{id}/items/` | GET, POST | Items de un contrato |
| `/api/contratos/{id}/renovar/` | POST | Renovar contrato |

---

## 🔧 Órdenes de Trabajo

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/ordentrabajo/` | GET, POST | Listar/crear OTs |
| `/api/ordentrabajo/{id}/` | GET, PUT, PATCH, DELETE | Detalle/editar/eliminar OT |
| `/api/ordentrabajo/{id}/asignar-recurso/` | POST | Asignar técnico/recurso a OT |
| `/api/ordentrabajo/{id}/cambiar-estado/` | POST | Cambiar estado de OT |
| `/api/ordentrabajo/{id}/adjuntos/` | GET, POST | Adjuntos (fotos, documentos) |

---

## 📦 Bodegas e Inventario

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/bodegas/` | GET, POST | Listar/crear bodegas |
| `/api/bodegas/{id}/` | GET, PUT, PATCH, DELETE | Detalle/editar/eliminar bodega |
| `/api/movimientos/` | GET, POST | Movimientos de inventario |
| `/api/movimientos/{id}/` | GET, PUT, PATCH, DELETE | Detalle de movimiento |
| `/api/guias-salida/` | GET, POST | Guías de salida |
| `/api/stock/` | GET | Consultar stock actual |

---

## 🎯 Items y Productos

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/items/` | GET, POST | Listar/crear items (productos/servicios) |
| `/api/items/{id}/` | GET, PUT, PATCH, DELETE | Detalle/editar/eliminar item |
| `/api/items/{id}/stock/` | GET | Stock del item en bodegas |

---

## 👥 Recursos Humanos

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/recursos/` | GET, POST | Listar/crear recursos (empleados, equipos) |
| `/api/recursos/{id}/` | GET, PUT, PATCH, DELETE | Detalle/editar/eliminar recurso |
| `/api/recursos/{id}/asignaciones/` | GET | Ver asignaciones del recurso |
| `/api/recursos/{id}/disponibilidad/` | GET | Consultar disponibilidad |

---

## 🚗 Activos

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/activos/` | GET, POST | Listar/crear activos (vehículos, equipos) |
| `/api/activos/{id}/` | GET, PUT, PATCH, DELETE | Detalle/editar/eliminar activo |
| `/api/activos/{id}/mantenciones/` | GET, POST | Mantenciones del activo |

---

## 📍 Visitas

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/visitas/` | GET, POST | Listar/crear visitas |
| `/api/visitas/{id}/` | GET, PUT, PATCH, DELETE | Detalle/editar/eliminar visita |
| `/api/visitas/{id}/completar/` | POST | Completar visita |

---

## 💰 Rendiciones

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/rendiciones/` | GET, POST | Listar/crear rendiciones |
| `/api/rendiciones/{id}/` | GET, PUT, PATCH, DELETE | Detalle/editar/eliminar rendición |
| `/api/rendiciones/{id}/aprobar/` | POST | Aprobar rendición |
| `/api/rendiciones/{id}/rechazar/` | POST | Rechazar rendición |

---

## 🏖️ Vacaciones

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/vacaciones/` | GET, POST | Listar/solicitar vacaciones |
| `/api/vacaciones/{id}/` | GET, PUT, PATCH, DELETE | Detalle/editar/eliminar solicitud |
| `/api/vacaciones/{id}/aprobar/` | POST | Aprobar solicitud |
| `/api/vacaciones/{id}/rechazar/` | POST | Rechazar solicitud |

---

## 📅 Calendario

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/calendario/` | GET, POST | Eventos del calendario |
| `/api/eventos/` | GET, POST | Listar/crear eventos |
| `/api/eventos/{id}/` | GET, PUT, PATCH, DELETE | Detalle/editar/eliminar evento |

---

## 👤 Usuarios y Cuentas

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/cuentas/usuarios/` | GET, POST | Listar/crear usuarios |
| `/api/cuentas/usuarios/{id}/` | GET, PUT, PATCH, DELETE | Detalle/editar/eliminar usuario |
| `/api/get_grupos_user/` | GET | Obtener grupos del usuario actual |
| `/api/personalizacion-usuarios/` | GET, PUT | Configuración personal del usuario |

---

## 🌎 Geografía (Regiones/Comunas)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/regiones/` | GET | Listar regiones |
| `/api/regiones/{id}/comunas/` | GET | Comunas de una región |
| `/api/comunas/` | GET | Listar todas las comunas |

---

## 📢 Retroalimentación

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/retroalimentacion/` | GET, POST | Listar/crear retroalimentación |
| `/api/retroalimentacion/{token}/` | GET, PUT | Acceder/actualizar retroalimentación por token (público) |

---

## 🔍 Cómo Usar Esta Referencia

### 1. **Probar endpoints en navegador**

Para endpoints GET, simplemente abre en navegador:
```
http://localhost:8000/api/cotizaciones/
```

### 2. **Usar curl (cmd)**

```cmd
REM GET
curl http://localhost:8000/api/cotizaciones/ -H "Authorization: Bearer <tu_access_token>"

REM POST
curl -X POST http://localhost:8000/api/cotizaciones/ ^
  -H "Authorization: Bearer <tu_access_token>" ^
  -H "Content-Type: application/json" ^
  -d "{\"nombre\":\"Cotización Test\",\"empresa\":1}"
```

### 3. **Usar Postman/Insomnia**

1. Importar colección
2. Configurar variable de entorno: `base_url = http://localhost:8000`
3. Obtener token desde `/auth/jwt/create`
4. Agregar header en todas las requests: `Authorization: Bearer <token>`

### 4. **Desde el navegador de DRF**

Abrir http://localhost:8000/api/ y navegar visualmente.

---

## 📝 Notas Importantes

### Autenticación Requerida

**Todos los endpoints bajo `/api/` requieren autenticación JWT** (excepto explícitamente públicos como retroalimentación por token).

**Flujo:**
1. Login → `/auth/jwt/create` → Obtener `access` y `refresh` tokens
2. Agregar header en cada request: `Authorization: Bearer <access_token>`
3. Si `access` expira → Renovar con `/auth/jwt/refresh`

### Formato de IDs

- `{id}`: ID numérico del registro (ej: `/api/cotizaciones/123/`)
- `{token}`: UUID para acceso público (ej: retroalimentación)

### Paginación

Listas largas están paginadas (50 items por página por defecto):
```
GET /api/cotizaciones/?page=2
```

### Filtros y Búsqueda

Muchos endpoints soportan filtros:
```
GET /api/cotizaciones/?empresa=1&estado=aprobada
GET /api/items/?search=cable
GET /api/ordentrabajo/?ordering=-fecha_creacion
```

### Acciones Personalizadas

Algunos ViewSets tienen acciones custom (sufijo `/accion/`):
- `/api/contratos/{id}/renovar/`
- `/api/ordentrabajo/{id}/cambiar-estado/`
- `/api/rendiciones/{id}/aprobar/`

---

## 🚀 Script de Generación Completa

Para obtener una lista exhaustiva y actualizada:

```cmd
cd backend
ENV\Scripts\python.exe list_endpoints.py
```

Esto generará un archivo completo: `.github/LISTA_ENDPOINTS.md`

---

**Última actualización:** 2025-11-04  
**Autor:** GitHub Copilot
