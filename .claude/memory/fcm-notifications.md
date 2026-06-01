---
name: fcm-notifications
description: Motor FCM para notificaciones push — 17 eventos, 9 grupos Django, Celery + Firebase, multi-tenancy, token lifecycle
lastUpdated: 2026-06-01
relatedFiles:
  - backend/notificaciones/
  - .github/skills/notificaciones/SKILL.md
  - dev/docs/audits/infrastructure/AUDIT-FCM.md
---

# FCM Notifications Motor

## Resumen Rápido

**17 eventos de notificación** (Lote 1: 3, Lote 2: 14) enviados vía Firebase Cloud Messaging.

- **Flujo:** Django hook → `services.notificar_X()` → Celery → `send_fcm_push_task` → Firebase → navegador
- **Destinatarios:** Filtrados por `UsuarioEmpresa.grupos` (multi-tenancy via sucursal.empresa)
- **Historial:** Siempre creado (incluso si FCM falla) — durabilidad garantizada
- **Tokens:** Marcados como `activo=False` si inválidos

---

## 17 Eventos Implementados

### Lote 1 (Original — documentado en SKILL.md)
| Evento | Grupo | Módulo | Status |
|--------|-------|--------|--------|
| `PREFACTURA_POR_FACTURAR` | contabilidad | cotizaciones | ✅ Documentado |
| `GUIA_REQUIERE_FIRMA` | tecnico | ordentrabajov3 | ✅ Documentado |
| `STOCK_BAJO_MINIMO` | comprador | bodegas | ✅ Documentado |

### Lote 2 (Sprint 21 — SIN documentar en SKILL.md ❌)
| Evento | Grupo | Módulo |
|--------|-------|--------|
| `OT_ASIGNADA_TECNICO` | tecnico | ordentrabajov3 |
| `OT_CAMBIO_ESTADO` | tecnico, operaciones | ordentrabajov3 |
| `OT_CERRADA_FACTURADA` | finanzas | ordentrabajov3 |
| `COTIZACION_APROBADA` | ventas | cotizaciones |
| `COTIZACION_RECHAZADA` | ventas | cotizaciones |
| `COTIZACION_POR_VENCER` | ventas | cotizaciones |
| `RENDICION_PENDIENTE_APROBACION` | finanzas | rendiciones |
| `RENDICION_ACTUALIZADA` | finanzas | rendiciones |
| `OC_MERCADERIA_RECIBIDA` | bodega | bodegas |
| `GUIA_SALIDA_HITO` | bodega | bodegas |
| `VACACIONES_SOLICITUD_CREADA` | rrhh | rrhh |
| `VACACIONES_RESOLUCION` | rrhh | rrhh |
| `VISITA_ASIGNADA` | operaciones | visitas |
| `CONTRATO_RESOLUCION_CLIENTE` | contratos | contratos |
| `CONTRATO_ACTIVADO` | contratos | contratos |
| `CONTRATO_FACTURA_GENERADA` | finanzas | contratos |
| `RETROALIMENTACION_PLAZO_VENCIDO` | tecnico | ordentrabajov3 |

---

## 9 Grupos Django

```python
# En backend/notificaciones/services.py líneas 26-37

GRUPO_CONTABILIDAD = "contabilidad"
GRUPO_COMPRADOR = "comprador"
GRUPO_TECNICO = "tecnico"
GRUPO_VENTAS = "ventas"             # Lote 2 (sin documentar ❌)
GRUPO_OPERACIONES = "operaciones"   # Lote 2
GRUPO_FINANZAS = "finanzas"         # Lote 2
GRUPO_RRHH = "rrhh"                 # Lote 2
GRUPO_CONTRATOS = "contratos"       # Lote 2
GRUPO_BODEGA = "bodega"             # Lote 2
```

**Para agregar usuario a grupo:** 
```python
from django.contrib.auth.models import Group
grupo = Group.objects.get(name="tecnico")
usuario.groups.add(grupo)
```

**IMPORTANTE:** Multi-tenancy usa `UsuarioEmpresa.grupos` (M2M en sucursal), NO `User.groups`.

---

## Arquitectura & Flujo

### 1. Hook → Service

```python
# En cualquier ViewSet:
from backend.notificaciones.services import notificar_ot_asignada

def crear_ot(self, request):
    ot = OrdenDeTrabajo.objects.create(...)
    notificar_ot_asignada(
        usuario_id=tecnico.id,
        empresa=ot.empresa,
        titulo="Nueva OT asignada",
        url_destino=f"/orden-trabajo-v3/{ot.id}",
        datos={"ot_id": ot.id, "numero": ot.numero}
    )
    return Response(...)
```

### 2. Service → Celery Queue

```python
# backend/notificaciones/services.py

def _disparar(grupo, usuarios_ids, titulo, cuerpo, url, datos, empresa):
    """Encola tarea en Celery"""
    send_fcm_push_task.delay(
        usuarios_ids=usuarios_ids,
        titulo=titulo,
        cuerpo=cuerpo,
        url_destino=url,
        datos=datos,
        empresa_id=empresa.id
    )
```

### 3. Celery Task → Firebase

```python
# backend/notificaciones/tasks.py

@shared_task
def send_fcm_push_task(usuarios_ids, titulo, cuerpo, url_destino, datos, empresa_id):
    """Envía push a tokens, marca inválidos"""
    
    # Obtener tokens activos
    tokens = FCMToken.objects.filter(
        usuario_id__in=usuarios_ids,
        activo=True
    ).values_list("token", "id")
    
    # Enviar a Firebase
    respuesta_fcm = enviar_push_a_tokens(
        token_list=[t[0] for t in tokens],
        titulo=titulo,
        cuerpo=cuerpo,
        url=url_destino,
        data=datos
    )
    
    # Crear historial (SIEMPRE)
    notificaciones = [
        Notificacion(
            usuario_id=uid,
            titulo=titulo,
            cuerpo=cuerpo,
            url_destino=url_destino,
            datos=datos
        )
        for uid in usuarios_ids
    ]
    Notificacion.objects.bulk_create(notificaciones)
    
    # Marcar tokens inválidos
    invalidos = respuesta_fcm.get("invalid_tokens", [])
    if invalidos:
        FCMToken.objects.filter(token__in=invalidos).update(activo=False)
```

---

## Multi-Tenancy Implementation

```python
# backend/notificaciones/services.py líneas 58-62

def _usuarios_en_rol_de_empresa(empresa, grupo):
    """Filtra por UsuarioEmpresa.grupos, no User.groups"""
    
    qs = UsuarioEmpresa.objects.filter(
        sucursal__empresa=empresa,      # ← Filtro por empresa (multi-tenancy)
        grupos=grupo,                    # ← UsuarioEmpresa.grupos (M2M)
        usuario__is_active=True,
    ).values_list("usuario_id", flat=True).distinct()
    
    return list(qs)
```

**Regla:** NUNCA usar `User.groups` directo. Siempre pasar por `UsuarioEmpresa.grupos` + `sucursal.empresa`.

---

## Firebase Initialization

```python
# backend/notificaciones/fcm_client.py

_init_lock = threading.Lock()
_firebase_initialized = False

def _ensure_initialized():
    """Lazy init thread-safe + credential resolution (3-priority)"""
    
    global _firebase_initialized
    
    if _firebase_initialized:
        return
    
    with _init_lock:
        if not _firebase_initialized:
            # Prioridad 1: JSON inline (FIREBASE_SERVICE_ACCOUNT_JSON_STRING)
            # Prioridad 2: Vars sueltas (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, etc.)
            # Prioridad 3: Path a JSON (FIREBASE_SERVICE_ACCOUNT_JSON_PATH)
            
            try:
                firebase_admin.initialize_app(credential)
                _firebase_initialized = True
            except Exception as e:
                logging.error(f"Firebase init failed: {e}")
                raise
```

**Vars de entorno requeridas:**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY` (handle \n escapados)
- `FIREBASE_CLIENT_EMAIL`

---

## Token Lifecycle

### 1. Registro (Frontend)

```typescript
// En useEffect al cargar app:
const token = await messaging.getToken({
    vapidKey: import.meta.env.VITE_FCM_VAPID_KEY
});

// Enviar a backend:
await api.post('/notificaciones/tokens/', {
    token: token,
    user_agent: navigator.userAgent
});
```

### 2. BD (Backend)

```python
# Modelo FCMToken
class FCMToken(ModeloBase):
    usuario = ForeignKey(User, on_delete=CASCADE)
    token = TextField(unique=True)                # Unique por dispositivo
    user_agent = CharField(max_length=255)        # Identificar dispositivo
    activo = BooleanField(default=True)           # Marcar como inválido si falla
    ultima_vez_visto = DateTimeField(auto_now=True)  # Last seen
```

### 3. Invalidación

```python
# Cuando Firebase dice "invalid_token":
FCMToken.objects.filter(token__in=invalidos).update(activo=False)

# Purga automática cada 30 días via Celery Beat:
# Ve a settings.py → CELERY_BEAT_SCHEDULE
# Función: purgar_notificaciones_antiguas() en tasks.py
```

---

## Modelos (BD)

### Notificacion

```python
class Notificacion(ModeloBase):
    usuario = ForeignKey(User, on_delete=CASCADE)
    tipo = CharField(max_length=100, choices=TipoEventoNotificacion.choices)
    titulo = CharField(max_length=180)
    cuerpo = TextField()
    url_destino = CharField(max_length=500)           # Ruta relativa o URL
    leida = BooleanField(default=False)
    fecha_lectura = DateTimeField(null=True, blank=True)
    datos = JSONField(default=dict)                   # Contexto (ot_id, etc.)
```

### ConfiguracionNotificacionEmpresa

```python
class ConfiguracionNotificacionEmpresa(ModeloBase):
    empresa = ForeignKey(Empresa, on_delete=CASCADE)
    tipo = CharField(max_length=100, choices=TipoEventoNotificacion.choices)
    activo = BooleanField(default=True)               # Gating por evento
    
    def esta_activo(self):
        # Si no existe registro = activo por defecto
        return self.activo
```

---

## Cuándo Usar Esto

1. **Agregar nuevo evento:** Sigue pasos en `agregar-evento.md` (pero actualiza SKILL.md también)
2. **Debug de notificaciones:** Revisar `Notificacion.objects.filter(usuario=user)` + `FCMToken` activos
3. **Multitenancy:** Verificar que filtro de empresa está en `_usuarios_en_rol_de_empresa()`
4. **Celery:** Verificar que `send_fcm_push_task` aparece en Redis queue (`redis-cli LLEN rpc`)

---

## Auditoría Status (2026-06-01)

| Aspecto | Status | Nota |
|---------|--------|------|
| **Código implementado** | 🟢 OK | Motor bien implementado, multi-tenancy correcto |
| **Lote 1 (3 eventos)** | 🟢 Documentado | En SKILL.md |
| **Lote 2 (14 eventos)** | 🔴 NO documentado | Detectado en auditoría, requiere actualizar SKILL.md |
| **Grupos Django** | 🔴 3/9 documentados | 6 grupos nuevos sin registrar |
| **Firebase init** | 🟢 OK | Thread-safe, 3 métodos credential |
| **Celery Beat** | ⚠️ OK pero no documentado | Función existe, config en settings.py no indicada |
| **Servicios** | 🟢 Código OK | Funciones `notificar_X()` existen pero sin tabla de referencia |

**Full audit:** Ver `dev/docs/audits/infrastructure/AUDIT-FCM.md`
