---
title: "Glosario"
scope: "full-stack"
status: "active"
last_updated: "2025-11-03"
---

# Glosario

## Objetivo
Definir términos de negocio (dominio ERP) y técnicos comunes en el monorepo para facilitar comprensión y comunicación entre desarrolladores, agentes IA y stakeholders.

## Términos de negocio (dominio ERP)

### Activo
Bien físico o intangible de la empresa (equipos, vehículos, software). Módulo: `activos/`.

### Bodega
Almacén o depósito de productos. Módulo: `bodegas/`. Gestiona inventario, movimientos (entradas/salidas), stock por producto.

### Contrato
Acuerdo comercial con cliente para prestación de servicios. Módulo: `contratos/`. Incluye términos, duración, productos/servicios asociados, renovaciones.

### Cotización
Propuesta comercial enviada a cliente con detalle de productos/servicios y precios. Módulo: `cotizaciones/`. Puede convertirse en contrato u orden de trabajo.

### Cuenta
Usuario del sistema (empleado, cliente, proveedor). Módulo: `cuentas/`. Gestiona autenticación, permisos, roles.

### Empresa
Entidad cliente o proveedora. Módulo: `empresas/`. Relacionada con contratos, cotizaciones, facturas.

### Item
Producto o servicio ofrecido. Módulo: `items/`. Vinculado a cotizaciones, órdenes de trabajo, inventario.

### Orden de Trabajo (OT)
Instrucción para ejecutar servicio técnico o instalación. Módulo: `ordentrabajo/`. Asociada a contrato, asigna recursos, registra avance.

### Recurso
Empleado o equipo asignable a orden de trabajo. Módulo: `recursos/`. Incluye disponibilidad, habilidades, asignaciones.

### Rendición
Registro de gastos o ingresos asociados a orden de trabajo o proyecto. Módulo: `rendiciones/`. Incluye comprobantes, aprobaciones.

### Vacaciones
Solicitud y gestión de días libres de empleados. Módulo: `vacaciones/`. Flujo de aprobación, integración con calendario.

### Visita
Visita técnica o comercial a cliente. Módulo: `visitas/`. Registra fecha, propósito, resultado, seguimiento.

## Términos técnicos

### API REST
Interfaz de programación basada en HTTP con operaciones CRUD (GET, POST, PUT, DELETE). Backend expone bajo `/api/`.

### ASGI (Asynchronous Server Gateway Interface)
Estándar Python para aplicaciones asíncronas. Usado con Daphne + Channels para WebSockets.

### BaseService
Servicio centralizado en frontend (`src/services/BaseService.ts`) que maneja llamadas HTTP, autenticación JWT, interceptores.

### Celery
Sistema de colas de tareas asíncronas para Python. Usado para procesos en segundo plano (emails, reportes, procesamiento de archivos).

### Channels
Extensión de Django para WebSockets y comunicación en tiempo real. Configurado en `sw_erp/asgi.py`.

### CORS (Cross-Origin Resource Sharing)
Mecanismo de seguridad que controla qué dominios pueden acceder a la API. Configurado en `settings.py`.

### CSRF (Cross-Site Request Forgery)
Ataque que explota autenticación por sesión. Django protege con tokens CSRF; APIs REST con JWT generalmente no lo necesitan.

### DRF (Django REST Framework)
Framework para construir APIs REST en Django. Incluye serializers, viewsets, permisos, paginación.

### JWT (JSON Web Token)
Token de autenticación firmado usado para acceso a API. Incluye `access` (corta duración) y `refresh` (larga duración).

### Migración
Archivo generado por Django que define cambios en esquema de base de datos. Ejecutar con `manage.py migrate`.

### Mock
Objeto simulado usado en tests para reemplazar dependencias externas (APIs, servicios).

### msw (Mock Service Worker)
Biblioteca para mockear APIs HTTP en tests de frontend. Intercepta requests y devuelve respuestas simuladas.

### N+1
Problema de performance donde se ejecutan 1 query inicial + N queries adicionales en un loop. Solución: `select_related`/`prefetch_related`.

### Redux Toolkit
Biblioteca para gestión de estado en React. Incluye slices (reducers), thunks (efectos asíncronos), store.

### Serializer
Clase de DRF que convierte modelos Django a/desde JSON. Valida entradas, transforma datos.

### Signal
Mecanismo de Django para ejecutar código automáticamente tras eventos (ej. `post_save`, `pre_delete`).

### Slice (Redux)
Módulo de Redux Toolkit que define estado, reducers y acciones para un dominio (ej. `productosSlice`).

### Thunk
Función asíncrona en Redux que ejecuta efectos secundarios (llamadas HTTP, lógica compleja) antes de despachar acciones.

### ViewSet
Clase de DRF que agrupa lógica CRUD para un modelo. Incluye `list`, `create`, `retrieve`, `update`, `destroy`.

### WebSocket
Protocolo de comunicación bidireccional en tiempo real. Usado con Channels para notificaciones, chat, actualizaciones live.

## Acrónimos comunes

- **API**: Application Programming Interface
- **CDN**: Content Delivery Network
- **CI/CD**: Continuous Integration / Continuous Deployment
- **CRUD**: Create, Read, Update, Delete
- **DB**: Database (Base de Datos)
- **DRF**: Django REST Framework
- **DTO**: Data Transfer Object
- **ERP**: Enterprise Resource Planning
- **JWT**: JSON Web Token
- **ORM**: Object-Relational Mapping
- **OT**: Orden de Trabajo
- **PR**: Pull Request
- **REST**: Representational State Transfer
- **RTL**: React Testing Library
- **SPA**: Single Page Application
- **TTL**: Time To Live (duración de caché)
- **UI/UX**: User Interface / User Experience

## Referencias cruzadas
- [Backend (Django)](./backend/general.md): conceptos técnicos de Django/DRF.
- [Frontend (React)](./frontend/general.md): conceptos técnicos de React/Redux.
- [Seguridad](./procesos/security.md): JWT, CORS, CSRF.
- Todos los módulos para contexto técnico específico.

---
