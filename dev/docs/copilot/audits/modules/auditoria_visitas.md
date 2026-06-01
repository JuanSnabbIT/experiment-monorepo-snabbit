# Auditoria Funcional: Visitas de Soporte

**Fecha:** 2026-04-15 | **Modulo:** visitas | **Estado:** EN REVISION

---

## 1. Modelos y Estados

| Modelo | Campo estado | Valores posibles |
|--------|-------------|------------------|
| `VisitaSoporte` | `estado` | `pendiente` / `completada` / `cerrada` |
| `AsistenciaUsuario` | `estado` | `por_revisar` / `revisado` / `no_equipo` / `no_usuario` / `no_disponible` |
| `EntregaDeEquipo` | `estado` | `por_entregar` / `entregado` / `no_entregado` / `no_usuario` / `desperfecto` |

### Mapa de transicion de VisitaSoporte

```
pendiente
  └→ completada  (manual, cuando se finalizan las actividades)
       └→ cerrada  (cierre administrativo definitivo)

Nota: NO hay auto-transicion a "completada".
Los signals que auto-completaban la visita estan COMENTADOS/DESHABILITADOS.
```

### Estados de AsistenciaUsuario (no secuenciales)

```
por_revisar
  ├→ revisado       (equipo revisado con exito)
  ├→ no_equipo      (usuario no tiene equipo para revisar)
  ├→ no_usuario     (usuario no estuvo presente)
  └→ no_disponible  (equipo no disponible)
```

### Estados de EntregaDeEquipo (no secuenciales)

```
por_entregar
  ├→ entregado      (con firma del receptor)
  ├→ no_entregado   (entrega no realizada)
  ├→ no_usuario     (usuario no estuvo presente)
  └→ desperfecto    (equipo en mal estado, entrega cancelada)
```

---

## 2. Flujos

### Flujo 1: Creacion y gestion de Visita

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/visitas/` crea visita en estado `pendiente` | Implementado | | |
| 2 | Visita se vincula a un cliente (empresa cliente) | Implementado via FK `cliente` | | |
| 3 | Multi-tenancy: `get_queryset()` filtra por empresa del usuario | Implementado en `VisitaSoporteViewSet` | | |
| 4 | Transicion `pendiente → completada` es manual (no automatica) | Implementado via endpoint de cambio de estado | | |
| 5 | Transicion `completada → cerrada` es manual | Implementado | | |

### Flujo 2: Asistencia tecnica (revision de equipos existentes)

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/visitas/{id}/asistencias/` crea registro de revision de equipo del usuario | Implementado | | |
| 2 | `AsistenciaUsuario` registra el resultado de la revision | Implementado | | |
| 3 | Posibles resultados: revisado, no_equipo, no_usuario, no_disponible | Implementado como choices | | |
| 4 | ⚠️ Signal que auto-completaba la visita cuando todas las asistencias terminaban: COMENTADO/DESHABILITADO | Signal comentado en `visitas/signals.py` | | |

### Flujo 3: Entrega de equipos nuevos

| # | Paso / Comportamiento | Estado actual (codigo) | OK | Discrepancia / Debe hacer |
|---|----------------------|----------------------|----|--------------------------|
| 1 | `POST /api/visitas/{id}/entregas/crear-con-item-guia/` crea entrega de equipo vinculada a una GuiaSalida | Implementado en `EntregaDeEquipoViewSet.crear_con_item_guia()` | | |
| 2 | Al crear la entrega: `equipo.cliente` se asigna automaticamente al cliente de la visita | Implementado en `crear_con_item_guia()` | | |
| 3 | Posibles resultados de entrega: entregado, no_entregado, no_usuario, desperfecto | Implementado como choices | | |
| 4 | Entrega con estado `entregado` requiere firma del receptor | ⚠️ No verificado si la firma es obligatoria en el backend | | |
| 5 | Al eliminar `EntregaDeEquipo`: `equipo.cliente` se vacia automaticamente | Implementado en `destroy()` del ViewSet | | |
| 6 | ⚠️ Signal que auto-transicionaba `GuiaSalida` cuando todos los equipos eran entregados: COMENTADO/DESHABILITADO | Signal comentado en `visitas/signals.py` | | |

---

## 3. Reglas de Negocio

| # | Regla | Implementada en | OK | Observacion |
|---|-------|----------------|----|-----------  |
| 1 | Multi-tenancy: visitas filtradas por empresa del usuario | `VisitaSoporteViewSet.get_queryset()` | | |
| 2 | Crear `EntregaDeEquipo` auto-asigna `equipo.cliente` al cliente de la visita | `EntregaDeEquipoViewSet.crear_con_item_guia()` | | |
| 3 | Eliminar `EntregaDeEquipo` vacia el cliente del equipo | `EntregaDeEquipoViewSet.destroy()` | | |
| 4 | Transiciones de `VisitaSoporte` son manuales (no auto-transiciones activas) | Signals deshabilitados | | |
| 5 | Auto-transicion de `GuiaSalida` cuando todas las entregas son completadas: DESHABILITADA | Signal comentado | | **REVISAR: es comportamiento intencional o pendiente de implementar** |

---

## 4. Side-effects (signals deshabilitados)

| Evento | Estado actual | Efecto esperado (DESHABILITADO) |
|--------|---------------|--------------------------------|
| Todas las `AsistenciaUsuario` de una visita terminan | ⚠️ COMENTADO | `VisitaSoporte.estado → "completada"` |
| Todas las `EntregaDeEquipo` de la visita estan en `entregado` | ⚠️ COMENTADO | `GuiaSalida.estado` transiciona |

---

## 5. Endpoints principales

| Metodo | URL | Descripcion | Auth |
|--------|-----|-------------|------|
| GET | `/api/visitas/` | Lista visitas del usuario (filtro empresa) | JWT |
| POST | `/api/visitas/` | Crear visita | JWT |
| GET | `/api/visitas/{id}/` | Detalle de visita | JWT |
| PATCH | `/api/visitas/{id}/` | Editar visita | JWT |
| GET | `/api/visitas/{id}/asistencias/` | Lista asistencias de la visita | JWT |
| POST | `/api/visitas/{id}/asistencias/` | Crear registro de asistencia | JWT |
| GET | `/api/visitas/{id}/entregas/` | Lista entregas de equipos de la visita | JWT |
| POST | `/api/visitas/{id}/entregas/crear-con-item-guia/` | Crear entrega vinculada a GuiaSalida | JWT |
| DELETE | `/api/visitas/{id}/entregas/{eid}/` | Eliminar entrega (vacia cliente del equipo) | JWT |

---

## 6. Checklist general del modulo Visitas

### Creacion y gestion basica
- [ ] Crear visita → estado `pendiente`
- [ ] Visita filtrada por empresa del usuario (multi-tenancy activo)
- [ ] Transicion manual `pendiente → completada → cerrada` funciona

### Asistencia tecnica
- [ ] Crear `AsistenciaUsuario` con los 4 posibles resultados funciona
- [ ] Los resultados no son secuenciales (cualquier resultado es valido desde `por_revisar`)
- [ ] ⚠️ Verificar: ¿la auto-transicion de visita a `completada` debe reactivarse?

### Entrega de equipos
- [ ] `crear-con-item-guia` crea entrega y asigna cliente al equipo
- [ ] Eliminar entrega vacia el cliente del equipo
- [ ] Los 4 resultados de entrega funcionan correctamente
- [ ] ⚠️ Verificar: ¿la firma en entregado es obligatoria en backend?
- [ ] ⚠️ Verificar: ¿la auto-transicion de GuiaSalida debe reactivarse?

---

*Ultima revision:* ___________  *Revisado por:* ___________
