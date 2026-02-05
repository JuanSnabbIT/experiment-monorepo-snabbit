# Planificación: Estados y Flujo de Rendiciones

**Fecha:** 2026-02-05  
**Módulo:** Rendiciones  
**Objetivo:** Definir estados, transiciones y lógica de negocio para el módulo de rendiciones

---

## 1. Estados Actuales (Backend)

Definidos en `backend/rendiciones/estados_modelos.py`:

```python
ESTADOS_RENDICIONES = (
    ("0", "Borrador"),
    ("1", "En Espera de Aprobación"),
    ("2", "Aprobada"),
    ("3", "Rechazada"),
    ("4", "Pagada"),
)
```

---

## 2. Flujo de Estados Propuesto

```
┌─────────────┐
│   Borrador  │ (0)
└──────┬──────┘
       │ [Enviar a aprobación]
       ↓
┌──────────────────────┐
│ En Espera Aprobación │ (1)
└──────┬───────────────┘
       │
       ├─→ [Aprobar] ───→ ┌──────────┐
       │                  │ Aprobada │ (2)
       │                  └────┬─────┘
       │                       │ [Pagar]
       │                       ↓
       │                  ┌─────────┐
       │                  │ Pagada  │ (4)
       │                  └─────────┘
       │
       └─→ [Rechazar] ──→ ┌───────────┐
                          │ Rechazada │ (3)
                          └───────────┘
```

---

## 3. Matriz de Transiciones

| Estado Actual | Acción | Estado Destino | Permiso Requerido |
|---------------|--------|----------------|-------------------|
| Borrador (0) | Enviar a Aprobación | En Espera (1) | Usuario creador |
| En Espera (1) | Aprobar | Aprobada (2) | Administrador/Aprobador |
| En Espera (1) | Rechazar | Rechazada (3) | Administrador/Aprobador |
| Aprobada (2) | Pagar | Pagada (4) | Administrador/Tesorería |
| Rechazada (3) | - | - | Estado final |
| Pagada (4) | - | - | Estado final |

---

## 4. Reglas de Negocio

### 4.1 Estado "Borrador" (0)
- **Editable:** Sí (fecha, observaciones, items)
- **Eliminable:** Sí
- **Transiciones:** Solo a "En Espera de Aprobación" (1)
- **Validaciones:** Debe tener al menos 1 item con monto > 0

### 4.2 Estado "En Espera de Aprobación" (1)
- **Editable:** No
- **Eliminable:** No
- **Transiciones:** A "Aprobada" (2) o "Rechazada" (3)
- **Acciones disponibles:**
  - **Aprobar:** Cambia a estado "Aprobada"
  - **Rechazar:** Cambia a estado "Rechazada" (requiere motivo de rechazo)
- **Validaciones:** Solo usuarios con rol aprobador pueden cambiar estado

### 4.3 Estado "Aprobada" (2)
- **Editable:** No
- **Eliminable:** No
- **Transiciones:** Solo a "Pagada" (4)
- **Funcionalidad adicional:** Genera PDF de rendición aprobada
- **Acciones disponibles:**
  - **Pagar:** Cambia a "Pagada" (requiere fecha y método de pago)

### 4.4 Estado "Rechazada" (3)
- **Editable:** No
- **Eliminable:** No
- **Transiciones:** Ninguna (estado final)
- **Visualización:** Se muestra motivo de rechazo
- **Consideración futura:** Permitir "reabrir" a Borrador para corrección

### 4.5 Estado "Pagada" (4)
- **Editable:** No
- **Eliminable:** No
- **Transiciones:** Ninguna (estado final)
- **Registros adicionales:** Fecha de pago, método, comprobante

---

## 5. Implementación Frontend

### 5.1 Componente `CambiarEstadoRendicion`

**Estado Actual:**
- Solo muestra botón de aprobar/rechazar en estado "1"
- Ya implementa lógica de rechazo

**Mejoras Necesarias:**
1. **Modal de Confirmación de Rechazo:**
   - Campo obligatorio: Motivo de rechazo (textarea)
   - Validación: Mínimo 10 caracteres
   
2. **Modal de Aprobación (Estado 1 → 2):**
   - Simple confirmación, sin campos adicionales
   
3. **Modal de Pago (Estado 2 → 4):**
   - Simple confirmación, sin campos adicionales
   - Solo actualiza el estado

4. **Mejora de UX:**
   - Estados finales (3, 4) deben mostrar badge sin botón
   - Agregar confirmación antes de enviar a aprobación (0 → 1)

### 5.2 Vista `DetalleRendicion`

**Cambios Realizados:**
- ✅ Botón PDF movido al header
- ✅ Ícono cambiado a `HeroDocumentArrowDown`
- ✅ Categoría de items de compra corregida

**Pendientes:**
- Mostrar motivo de rechazo cuando estado = "3"
- Mostrar información de revisión (revisado_por, fecha_revision) cuando estado = "2" o posterior
- Bloquear edición en estados != "0"

---

## 6. Implementación Backend

### 6.1 Endpoint de Rechazo

**Archivo:** `backend/rendiciones/views.py`

**Implementación Sugerida:**
```python
@action(detail=True, methods=["post"], url_path="rechazar")
def rechazar(self, request, pk=None):
    """
    Rechaza una rendición y registra el motivo.
    Solo permitido en estado '1' (En Espera).
    """
    rendicion = self.get_object()
    
    if rendicion.estado != '1':
        return Response(
            {"error": "Solo se pueden rechazar rendiciones en espera de aprobación"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    motivo = request.data.get('motivo_rechazo')
    if not motivo or len(motivo) < 10:
        return Response(
            {"error": "Debe proporcionar un motivo de rechazo (mínimo 10 caracteres)"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    rendicion.estado = '3'
    rendicion.motivo_rechazo = motivo
    rendicion.fecha_rechazo = timezone.now()
    rendicion.rechazada_por = request.user
    rendicion.save()
    
    # TODO: Enviar notificación al usuario que creó la rendición
    
    serializer = self.get_serializer(rendicion)
    return Response(serializer.data)

@action(detail=True, methods=["post"], url_path="aprobar")
def aprobar(self, request, pk=None):
    """
    Aprueba una rendición.
    Solo permitido en estado '1' (En Espera).
    """
    rendicion = self.get_object()
    
    if rendicion.estado != '1':
        return Response(
            {"error": "Solo se pueden aprobar rendiciones en espera de aprobación"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    rendicion.estado = '2'
    rendicion.revisado_por = request.user
    rendicion.fecha_revision = timezone.now()
    rendicion.save()
    
    # TODO: Enviar notificación al usuario que creó la rendición
    
    serializer = self.get_serializer(rendicion)
    return Response(serializer.data)

@action(detail=True, methods=["post"], url_path="pagar")
def pagar(self, request, pk=None):
    """
    Marca una rendición como pagada.
    Solo permitido en estado '2' (Aprobada).
    """
    rendicion = self.get_object()
    
    if rendicion.estado != '2':
        return Response(
            {"error": "Solo se pueden pagar rendiciones aprobadas"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    rendicion.estado = '4'
    rendicion.save()
    
    # TODO: Enviar notificación al usuario que creó la rendición
    
    serializer = self.get_serializer(rendicion)
    return Response(serializer.data)
```

### 6.2 Modelo `Rendicion` - Campos Adicionales

**Archivo:** `backend/rendiciones/models.py`

**Campos a agregar:**
```python
# Campos de rechazo
motivo_rechazo = models.TextField(blank=True, null=True)
fecha_rechazo = models.DateTimeField(blank=True, null=True)
rechazada_por = models.ForeignKey(
    'cuentas.Usuario',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='rendiciones_rechazadas'
)

# Campos de aprobación/revisión
revisado_por = models.ForeignKey(
    'cuentas.Usuario',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='rendiciones_revisadas'
)
fecha_revision = models.DateTimeField(blank=True, null=True)
```

**Notas:**
- El cambio a estado "Pagada" (4) solo requiere actualizar el estado, sin campos adicionales
- Los campos de rechazo se populan cuando rechaza_por (rechazar)
- Los campos de revisión se populan cuando se aprueba (rechazar NO los usa)

**⚠️ Requiere migración:**
```bash
python manage.py makemigrations rendiciones
python manage.py migrate
```

---

## 7. Notificaciones

### Eventos que Requieren Notificación:

1. **Rendición enviada a aprobación (0 → 1):**
   - Destinatario: Aprobadores/Administradores
   - Mensaje: "Nueva rendición pendiente de aprobación"

2. **Rendición aprobada (1 → 2):**
   - Destinatario: Usuario creador
   - Mensaje: "Tu rendición ha sido aprobada"

3. **Rendición rechazada (1 → 3):**
   - Destinatario: Usuario creador
   - Mensaje: "Tu rendición ha sido rechazada. Motivo: [motivo]"

4. **Rendición pagada (2 → 4):**
   - Destinatario: Usuario creador
   - Mensaje: "Tu rendición ha sido pagada"

---

## 8. Permisos y Roles

| Acción | Rol Requerido |
|--------|---------------|
| Crear rendición | Cualquier usuario |
| Editar rendición (estado 0) | Creador |
| Eliminar rendición (estado 0) | Creador |
| Enviar a aprobación | Creador |
| Aprobar/Rechazar | Administrador, Aprobador de Rendiciones |
| Pagar | Administrador, Tesorería |
| Ver PDF | Creador, Aprobador, Administrador |

---

## 9. Roadmap de Implementación

### Fase 1: Backend (Prioritario)
- [ ] Agregar campos al modelo `Rendicion` (motivo_rechazo, fecha_pago, etc.)
- [ ] Crear migración
- [ ] Implementar endpoint `rechazar`
- [ ] Implementar endpoint `pagar`
- [ ] Actualizar serializer para incluir nuevos campos
- [ ] Tests unitarios

### Fase 2: Frontend
- [ ] Actualizar interfaz `IRendicion` con nuevos campos
- [ ] Crear modal de rechazo con motivo
- [ ] Crear modal de pago con detalles
- [ ] Mostrar información de rechazo/pago en vista detalle
- [ ] Actualizar lógica de botones según estado

### Fase 3: Mejoras UX
- [ ] Sistema de notificaciones
- [ ] Historial de cambios de estado
- [ ] Dashboard de rendiciones por estado
- [ ] Filtros avanzados en lista de rendiciones

---

## 10. Consideraciones Futuras

### 10.1 Reapertura de Rendiciones Rechazadas
- Permitir que rendiciones rechazadas vuelvan a "Borrador"
- El usuario puede corregir y reenviar
- Se mantiene historial de rechazos previos

### 10.2 Aprobación en Múltiples Niveles
- Nivel 1: Supervisor directo
- Nivel 2: Jefe de área
- Nivel 3: Gerencia (para montos > X)

### 10.3 Integración con Contabilidad
- Generar asientos contables automáticos al pagar
- Exportar a sistemas contables externos
- Reportes fiscales

---

**Última actualización:** 2026-02-05  
**Responsable:** Sistema  
**Próxima revisión:** Al implementar Fase 1
