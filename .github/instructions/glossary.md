# 📚 Glossary – Términos, Abreviaturas & Contexto

Diccionario de términos y convenciones del proyecto Monorepo ERP.

---

## 🔤 Términos Técnicos

### A
- **ASGI** — Asynchronous Server Gateway Interface. Protocolo para aplicaciones web async (Daphne, Uvicorn).
- **APT** — Advanced Package Tool. Gestor de paquetes en Linux (Debian/Ubuntu).
- **API** — Application Programming Interface. Interfaz para comunicación cliente-servidor (REST, GraphQL).

### B
- **Bearer Token** — Token JWT usado en encabezado `Authorization: Bearer <token>`.
- **Bodega** — Almacén/depósito en el ERP. Maneja inventario (items, movimientos, stocks).

### C
- **CORS** — Cross-Origin Resource Sharing. Política de seguridad web para requests desde diferentes orígenes.
- **CSRF** — Cross-Site Request Forgery. Ataque web; prevenido con tokens CSRF.
- **Celery** — Task queue asincrónica (background jobs, scheduled tasks).

### D
- **Daphne** — ASGI server para Django (WebSocket + HTTP).
- **DRF** — Django REST Framework. Framework para APIs REST en Django.
- **Database** — Base de datos (PostgreSQL, SQLite, MySQL).

### E
- **ERP** — Enterprise Resource Planning. Sistema de gestión empresarial (Monorepo ERP).
- **Empresa** — Entidad empresarial en el sistema (tiene Sucursales, Usuarios).

### F
- **FK** — Foreign Key. Relación N-1 entre tablas (clave foránea).
- **Frontend** — Aplicación cliente (React, Vue, Angular).

### G
- **GraphQL** — Query language para APIs (alternativa a REST).
- **Git** — Sistema de control de versiones.

### H
- **HTTP** — HyperText Transfer Protocol. Protocolo web (GET, POST, PATCH, DELETE).
- **HTTPS** — HTTP Secure (con TLS/SSL).

### J
- **JWT** — JSON Web Token. Token de autenticación sin estado (header.payload.signature).
- **JSON** — JavaScript Object Notation. Formato de datos ligero.

### K
- **K8s** — Abreviatura de Kubernetes.
- **Kubernetes** — Orquestador de contenedores.

### L
- **Linting** — Análisis estático de código (ESLint, Pylint).

### M
- **M2M** — Many-to-Many. Relación N-N entre tablas.
- **Middleware** — Componente que procesa requests/responses (Django, Express).
- **Migration** — Script de cambio de schema de BD (Django migrations).
- **Monorepo** — Repositorio único con múltiples proyectos (backend + frontend).

### N
- **NaN** — Not a Number. Valor especial en JavaScript/TypeScript.
- **Nginx** — Web server / reverse proxy de alto rendimiento.

### O
- **ORM** — Object-Relational Mapping. Abstracción de BD (Django ORM, SQLAlchemy).
- **OT** — Orden de Trabajo. Entidad principal en el sistema.

### P
- **Payload** — Datos enviados en HTTP request/response body.
- **Postgres** — PostgreSQL, base de datos relacional.
- **PR** — Pull Request. Solicitud de merge de cambios en Git.

### Q
- **Query** — Consulta a BD (SELECT, UPDATE, DELETE).
- **QuerySet** — Objeto Django que representa una query a BD.

### R
- **RBAC** — Role-Based Access Control. Control de acceso basado en roles/grupos.
- **Redis** — Cache en memoria (key-value store).
- **Refresh Token** — Token de larga vida para renovar access tokens.
- **REST** — Representational State Transfer. Arquitectura para APIs (HTTP verbs + resources).

### S
- **SPA** — Single Page Application. Aplicación web que carga una sola vez (React, Vue).
- **SQL** — Structured Query Language. Lenguaje para bases de datos.
- **SQLite** — BD relacional ligera (por defecto en desarrollo Django).
- **Slice** — Redux slice. Unidad de estado en Redux (reducer + actions).

### T
- **Thunk** — Función que retorna otra función (Redux thunks para async operations).
- **Token** — Cadena que representa autenticación o autorización (JWT).
- **TypeScript** — Superset de JavaScript con tipos estáticos.

### U
- **URI** — Uniform Resource Identifier (URL es un tipo de URI).
- **URL** — Uniform Resource Locator (ej: `https://api.example.com/ordenes`).

### V
- **ViewSet** — Clase DRF que maneja todas las operaciones CRUD (List, Create, Retrieve, Update, Delete).
- **Vite** — Bundler moderno para aplicaciones web (rápido).

### W
- **WebSocket** — Protocolo bidireccional para comunicación en tiempo real (Django Channels).
- **WSGI** — Web Server Gateway Interface. Estándar para aplicaciones web síncronas (Gunicorn).

### X
- **XSS** — Cross-Site Scripting. Ataque de inyección de código en HTML/JS.

### Y
- **Yarn** — Gestor de paquetes Node (alternativa a npm).

### Z
- **ZIP** — Formato de archivo comprimido.

---

## 🏢 Modelos de Dominio

### Estructura Multi-tenancy

```
Empresa (1)
  ├─ Sucursal (N)
  │   ├─ Usuario (M2M vía UsuarioEmpresa)
  │   └─ Bodega, OrdenTrabajo, Rendicion, etc.
  │
  └─ UsuarioEmpresa (N)
      ├─ usuario (FK)
      ├─ grupos (M2M → roles específicos por empresa)
      └─ es_admin_empresa (boolean)
```

### Entidades Principales

| Entidad | Propósito | Status |
|---------|-----------|--------|
| **User** | Usuario del sistema (autenticación) | ✅ Activa |
| **Empresa** | Entidad empresarial (cliente) | ✅ Activa |
| **SucursalEmpresa** | Sucursal de una empresa | ✅ Activa |
| **UsuarioEmpresa** | Relación user-empresa-roles | ✅ Activa |
| **OrdenTrabajo** | OT v2 (principal) | ✅ Activa |
| **ordentrabajo.OrdenTrabajo** | OT v1 (legacy, deprecada) | ⚠️ Deprecada |
| **Bodega** | Almacén/depósito | ✅ Activa |
| **MovimientoBodega** | Entrada/salida de items | ✅ Activa |
| **Rendicion** | Registro de gastos | ✅ Activa |
| **Cotizacion** | Presupuesto de vendedor | ✅ Activa |
| **Contrato** | Acuerdo comercial | ✅ Activa |
| **Vacacion** | Período de vacaciones | ✅ Activa |
| **Visita** | Registro de visita a terreno | ✅ Activa |
| **Retroalimentacion** | Feedback (legacy) | ⚠️ Deprecada |

---

## 📂 Convenciones de Rutas

### Backend URLs

```
/api/
├─ token/                          # Autenticación
│  ├─ POST       → Login
│  └─ refresh/   → Refrescar token
├─ users/                          # Usuarios (Djoser)
│  ├─ GET        → Listar
│  ├─ POST       → Crear
│  └─ {id}/      → Detalle/actualizar
├─ empresas/                       # Empresas
├─ bodegas/                        # Bodegas e inventario
├─ ordentrabajov2/                 # Órdenes de trabajo (v2)
├─ rendiciones/                    # Rendiciones/gastos
├─ cotizaciones/                   # Cotizaciones
└─ ... (más apps)
```

### Frontend Routes

```
/                    # Home / Dashboard
/login               # Login
/ordenes             # Listado de OTs
/ordenes/{id}        # Detalle OT
/bodegas             # Inventario
/reportes            # Reportes
/admin               # Panel admin
```

---

## 🎨 Estilo de Código

### Python (Backend)

```python
# Nombres
CONSTANT_NAME = 10
variable_name = "valor"
class ClassName:
    def method_name(self):
        pass

# Imports
from django.db import models
from rest_framework import viewsets
from .models import OrdenTrabajo
from .serializers import OrdenTrabajoSerializer
```

### TypeScript/React (Frontend)

```typescript
// Nombres
const CONSTANT_NAME = 10;
const variableName = "valor";
interface IOrdenTrabajo { ... }
class ClassName { ... }

// Imports
import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { IOrdenTrabajo } from '@/interfaces';
```

---

## 📊 Abreviaturas Comunes

| Abreviatura | Significado |
|-------------|------------|
| **ASGI** | Asynchronous Server Gateway Interface |
| **API** | Application Programming Interface |
| **CORS** | Cross-Origin Resource Sharing |
| **CSRF** | Cross-Site Request Forgery |
| **DB / BD** | Database / Base de Datos |
| **DRF** | Django REST Framework |
| **ERP** | Enterprise Resource Planning |
| **FK** | Foreign Key (clave foránea) |
| **JWT** | JSON Web Token |
| **M2M** | Many-to-Many (relación N-N) |
| **ORM** | Object-Relational Mapping |
| **OT** | Orden de Trabajo |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **SPA** | Single Page Application |
| **SQL** | Structured Query Language |
| **XSS** | Cross-Site Scripting |

---

## 🔄 Estados y Enums

### Estado OT (Orden de Trabajo)

```
'pendiente'      → OT creada, aún no iniciada
'en_progreso'    → OT en ejecución
'completada'     → OT finalizada
'cancelada'      → OT anulada (opcional)
```

### Rol de Usuario

```
'Admin'          → Acceso total a la empresa
'Operador'       → Acceso a operaciones específicas
'Viewer'         → Solo lectura
'Supervisor'     → Supervisa operadores
```

### Estado Bodega

```
'entrada'        → Ingreso de items
'salida'         → Egreso de items
'ajuste'         → Ajuste manual de stock
'transfer'       → Transferencia entre bodegas
```

---

## 📞 Contactos Internos

| Rol | Repositorio | Contacto |
|-----|-------------|----------|
| **DevOps** | `.github/workflows/` | Scripts CI/CD |
| **Backend Lead** | `backend/` | Django + DRF |
| **Frontend Lead** | `frontend/` | React + Redux |
| **Tech Lead** | `dev/docs/` | Arquitectura general |

---

## 🔗 Referencias Externas

- [Django Docs](https://docs.djangoproject.com)
- [DRF Docs](https://www.django-rest-framework.org)
- [React Docs](https://react.dev)
- [Redux Docs](https://redux.js.org)
- [TypeScript Docs](https://www.typescriptlang.org)

---

## 📝 Últimos Cambios

| Fecha | Cambio |
|-------|--------|
| 2025-12-28 | Creación de glossary.md |
| 2025-12-28 | Migración OT v1 → OT v2 (deprecado v1) |
| 2025-11-20 | Actualización AGENTS.md |

**Última actualización:** 2025-12-28

