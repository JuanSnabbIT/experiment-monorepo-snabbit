# Auditoria Funcional: Recursos (Equipos y Asignaciones)

**Fecha:** 2026-04-15 | **Modulo:** recursos | **Estado:** EN REVISION

---

## 1. Modelos y Estados

| Modelo | Campo estado | Valores posibles |
|--------|-------------|------------------|
| `Equipo` | `estado` | `True` (activo) / `False` (inactivo) — booleano |
| `Equipo` | `condicion` | `NUEVO` / `USADO` / `REFACCIONADO` / `OTRO` |
| `UsuarioEquipo` | `estado` | `True` (asignado activo) / `False` (devuelto/inactivo) |
| `ItemAsignadoUsuario` | `estado` | `True` (asignado activo) / `False` (devuelto/inactivo) |

> **Nota:** No hay maquina de estados compleja. Los estados son booleanos simples.

### Tipos de equipos

| Campo | Valores |
|-------|---------|
| `tipo_equipo` | `ESCRITORIO` / `PORTATIL` / `MOVIL` / `TABLET` / `OTRO` |
| `marca` | `HP` / `DELL` / `APPLE` / `LENOVO` / `ACER` / `ASUS` / `OTRA` |
| `sistema_operativo` | `WINDOWS10` / `WINDOWS11` / `UBUNTU` / `DEBIAN` / `MACOS` / `ANDROID` / `IOS` |
| `procesador` | `INTEL` / `AMD` / `OTRO` |
| `ram` | `4GB` / `8GB` / `16GB` / `32GB` / `64GB` |

---

## 2. Flujos

### Flujo 1: Gestion de Equipos

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/equipos/` crea equipo con specs tecnicas | Implementado | | |
| 2 | Equipo tiene `numero_serie` unico por empresa (`numero_serie` + `empresa_propietaria` unique_together) | Implementado | | |
| 3 | Equipo puede tener `cliente` asignado (FK a empresa cliente, nullable) | Implementado | | |
| 4 | `estado = True` (activo) por defecto al crear | Implementado | | |
| 5 | Multi-tenancy: filtra por `empresa_propietaria` del usuario | Implementado (pero no via cadena `sucursal_principal`) | | |
| 6 | `GET /api/equipos/equipos-por-cliente/?cliente_id=X` lista equipos de un cliente especifico | Implementado en action | | |
| 7 | `GET /api/equipos/disponibles-para-entrega/` lista equipos SIN `UsuarioEquipo` activo | Implementado en action | | |

### Flujo 2: Asignacion de equipo a usuario (UsuarioEquipo)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `UsuarioEquipo` registra la asignacion de un equipo a un usuario | Implementado | | |
| 2 | Solo puede haber un `UsuarioEquipo.estado = True` por equipo (asignacion activa unica) | Validado: al crear nueva asignacion, las previas se desactivan | | |
| 3 | Creacion principal desde OTV3: al completar tarea con firma tipo `entrega_equipo` | Implementado en `TareaOTV3ViewSet.completar_con_firma()` | | |
| 4 | `GET /api/usuario-equipo/por-cliente/?cliente_id=X` lista usuarios con equipos del cliente | Implementado en action | | |
| 5 | `GET /api/usuario-equipo/por-usuario-empresa/?usuario_id=X` lista equipos de un usuario | Implementado en action | | |
| 6 | `GET /api/equipos/{id}/usuario-equipo/` retorna historial de asignaciones del equipo | Implementado en action | | |
| 7 | `GET /api/equipos/{id}/lista-fotos/` retorna fotos del `UsuarioEquipo` mas reciente | Implementado en action | | |
| 8 | `GET /api/usuario-equipo/{id}/equipo-detalle/` retorna detalles del equipo + usuario actual | Implementado en action | | |

### Flujo 3: Asignacion de items no serializados (ItemAsignadoUsuario)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `ItemAsignadoUsuario` registra asignacion de items sin numero de serie (ej: audifonos, mouse) | Implementado | | |
| 2 | Solo puede crearse desde `ItemsGuiaSalida` de OTs V3 (version=3) | Constraint validado en modelo | | |
| 3 | Creacion desde OTV3: al completar tarea con firma para items no serializados | Implementado en `TareaOTV3ViewSet.completar_con_firma()` | | |
| 4 | Al crear nueva asignacion: las previas para ese item y usuario se desactivan | Implementado — desactiva `estado = False` en previas | | |
| 5 | `estado = True`: asignacion activa; `estado = False`: devuelto/inactivo | Implementado como booleano | | |

### Flujo 4: Software y componentes del equipo

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `SoftwareInstalado` vincula software a un equipo (M2M via tabla intermedia) | Implementado | | |
| 2 | `MonitorEquipo` vincula monitor a equipo | Implementado | | |
| 3 | `AlmacenamientoEquipo` registra HDD/SSD del equipo | Implementado | | |
| 4 | `SoftwareDeEmpresa` gestiona licencias de software por empresa | Implementado | | |

---

## 3. Reglas de Negocio

| # | Regla | Implementada en | OK | Observacion |
|---|-------|----------------|----|-----------  |
| 1 | `numero_serie` es unico por empresa (unique_together con `empresa_propietaria`) | Modelo `Equipo` | | |
| 2 | Solo 1 `UsuarioEquipo.estado = True` por equipo (asignacion activa unica) | `TareaOTV3ViewSet.completar_con_firma()` desactiva previas | | |
| 3 | `ItemAsignadoUsuario` solo se puede crear desde `ItemsGuiaSalida` de OT V3 | Constraint en modelo | | |
| 4 | Crear `EntregaDeEquipo` (desde visitas) asigna `equipo.cliente` al cliente de la visita | `EntregaDeEquipoViewSet.crear_con_item_guia()` | | |
| 5 | Eliminar `EntregaDeEquipo` vacia `equipo.cliente` | `EntregaDeEquipoViewSet.destroy()` | | |
| 6 | Multi-tenancy: filtra por `empresa_propietaria` (no por cadena `sucursal_principal`) | `EquipoViewSet.get_queryset()` | | |

---

## 4. Side-effects

| Evento disparador | Efecto automatico | Ubicacion |
|------------------|-------------------|-----------|
| Completar tarea OTV3 con firma (item serializado) | Crea `UsuarioEquipo`, desactiva previos | `TareaOTV3ViewSet.completar_con_firma()` |
| Completar tarea OTV3 con firma (item no serializado) | Crea `ItemAsignadoUsuario`, desactiva previos | `TareaOTV3ViewSet.completar_con_firma()` |
| Crear `EntregaDeEquipo` desde visita | `equipo.cliente` = cliente de la visita | `EntregaDeEquipoViewSet.crear_con_item_guia()` |
| Eliminar `EntregaDeEquipo` | `equipo.cliente` = null | `EntregaDeEquipoViewSet.destroy()` |

---

## 5. Endpoints principales

| Metodo | URL | Descripcion | Auth |
|--------|-----|-------------|------|
| GET | `/api/equipos/` | Lista equipos de la empresa | JWT |
| POST | `/api/equipos/` | Crear equipo con specs | JWT |
| GET | `/api/equipos/{id}/` | Detalle de equipo | JWT |
| PATCH | `/api/equipos/{id}/` | Editar equipo | JWT |
| GET | `/api/equipos/{id}/usuario-equipo/` | Historial de asignaciones | JWT |
| GET | `/api/equipos/{id}/lista-fotos/` | Fotos del usuario actual | JWT |
| GET | `/api/equipos/equipos-por-cliente/` | Filtrar equipos por cliente | JWT |
| GET | `/api/equipos/disponibles-para-entrega/` | Equipos sin asignacion activa | JWT |
| GET | `/api/usuario-equipo/` | Lista asignaciones activas | JWT |
| POST | `/api/usuario-equipo/` | Crear asignacion manualmente | JWT |
| GET | `/api/usuario-equipo/{id}/equipo-detalle/` | Detalle equipo + usuario actual | JWT |
| GET | `/api/usuario-equipo/por-cliente/` | Usuarios con equipos del cliente | JWT |
| GET | `/api/usuario-equipo/por-usuario-empresa/` | Equipos de un usuario | JWT |
| GET | `/api/software-empresa/` | Licencias de software de la empresa | JWT |
| POST | `/api/software-empresa/` | Registrar licencia de software | JWT |

---

## 6. Checklist general del modulo Recursos

### Equipos
- [ ] Crear equipo con specs tecnicas (tipo, marca, SO, RAM, etc.)
- [ ] `numero_serie` unico por empresa (falla si se repite)
- [ ] `disponibles-para-entrega` retorna correctamente equipos sin `UsuarioEquipo` activo
- [ ] `equipos-por-cliente` filtra correctamente por cliente

### Asignaciones (UsuarioEquipo)
- [ ] Crear `UsuarioEquipo` desde completar tarea OTV3 con firma
- [ ] Al asignar nuevo equipo a usuario: asignacion previa del mismo equipo se desactiva
- [ ] Historial de asignaciones disponible via `usuario-equipo` del equipo
- [ ] `por-cliente` y `por-usuario-empresa` filtran correctamente

### Items no serializados (ItemAsignadoUsuario)
- [ ] Solo se crean desde `ItemsGuiaSalida` de OT V3
- [ ] Al crear nueva asignacion: la anterior del mismo item/usuario se desactiva
- [ ] Estado booleano refleja si esta activa o devuelta

### Integracion con Visitas
- [ ] Crear `EntregaDeEquipo` asigna `equipo.cliente`
- [ ] Eliminar `EntregaDeEquipo` vacia `equipo.cliente`

---

*Ultima revision:* ___________  *Revisado por:* ___________
