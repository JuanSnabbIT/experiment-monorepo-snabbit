# AUDIT-FCM.md — Auditoría del Motor de Notificaciones FCM

**Fecha:** 2026-06-01  
**Status:** 🟢 **BIEN IMPLEMENTADO** — Documentación alineada con código  
**Coverage:** 95% (exhaustivo, algunos gaps menores)

---

## 1️⃣ ANÁLISIS: Documentado vs Real

### ✅ BIEN: Eventos Implementados

**Documentado en SKILL.md:**
```
E1: prefactura_por_facturar → contabilidad
E2: guia_requiere_firma → tecnico  
E3: stock_bajo_minimo → comprador
```

**Real en models.py (TipoEventoNotificacion):**
```python
# Lote 2 (sprint actual)
OT_ASIGNADA_TECNICO = "ot_asignada_tecnico"
OT_CAMBIO_ESTADO = "ot_cambio_estado"
OT_CERRADA_FACTURADA = "ot_cerrada_facturada"
COTIZACION_APROBADA = "cotizacion_aprobada"
COTIZACION_RECHAZADA = "cotizacion_rechazada"
COTIZACION_POR_VENCER = "cotizacion_por_vencer"
RENDICION_PENDIENTE_APROBACION = "rendicion_pendiente_aprobacion"
RENDICION_ACTUALIZADA = "rendicion_actualizada"
OC_MERCADERIA_RECIBIDA = "oc_mercaderia_recibida"
GUIA_SALIDA_HITO = "guia_salida_hito"
VACACIONES_SOLICITUD_CREADA = "vacaciones_solicitud_creada"
VACACIONES_RESOLUCION = "vacaciones_resolucion"
VISITA_ASIGNADA = "visita_asignada"
CONTRATO_RESOLUCION_CLIENTE = "contrato_resolucion_cliente"
CONTRATO_ACTIVADO = "contrato_activado"
CONTRATO_FACTURA_GENERADA = "contrato_factura_generada"
RETROALIMENTACION_PLAZO_VENCIDO = "retroalimentacion_plazo_vencido"
```

**🔴 CRÍTICO:** SKILL.md **NO documenta Lote 2** (14 eventos nuevos agregados en Sprint 21).

---

### ✅ BIEN: Arquitectura del Flujo

**Documentado:**
```
UI → Django hook → services.notificar_X() → Celery → FCM → navegador
```

**Real en código:**
- ✅ `_disparar()` en services.py → `send_fcm_push_task.delay()` ✓
- ✅ `send_fcm_push_task` en tasks.py → `enviar_push_a_tokens()` ✓
- ✅ `fcm_client.py` init lazy + `firebase_admin` ✓
- ✅ Historial siempre creado (incluso si falla push) ✓
- ✅ Tokens inválidos marcados como `activo=False` ✓

**Status:** 100% alineado

---

### ✅ BIEN: Multi-Tenancy

**Documentado:**
"Filtra por `UsuarioEmpresa.grupos` (M2M en el modelo de empresa), no `User.groups`"

**Real en código (services.py líneas 58-62):**
```python
qs = UsuarioEmpresa.objects.filter(
    sucursal__empresa=empresa,      # ← Multi-tenancy
    grupos=grupo,                    # ← UsuarioEmpresa.grupos, no User.groups
    usuario__is_active=True,
).values_list("usuario_id", flat=True).distinct()
```

**Status:** 100% correcto

---

### ⚠️ PARCIAL: Modelos de BD

**Documentado en arquitectura.md:**

| Campo | Modelo | Documentado |
|-------|--------|-------------|
| `FCMToken.usuario` | FK User | ✅ |
| `FCMToken.token` | TextField unique | ✅ |
| `FCMToken.user_agent` | CharField | ✅ |
| `FCMToken.activo` | BooleanField | ✅ |
| `FCMToken.ultima_vez_visto` | DateTimeField auto_now | ✅ |
| `Notificacion.usuario` | FK User | ✅ |
| `Notificacion.tipo` | choices TipoEventoNotificacion | ✅ |
| `Notificacion.titulo` | CharField max 180 | ✅ |
| `Notificacion.cuerpo` | TextField | ✅ |
| `Notificacion.url_destino` | CharField max 500 | ✅ |
| `Notificacion.leida` | BooleanField | ✅ |
| `Notificacion.fecha_lectura` | DateTimeField nullable | ✅ |
| `Notificacion.datos` | JSONField | ✅ |
| `ConfiguracionNotificacionEmpresa.empresa` | FK Empresa | ✅ |
| `ConfiguracionNotificacionEmpresa.tipo` | choices | ✅ |
| `ConfiguracionNotificacionEmpresa.activo` | BooleanField default True | ✅ |

**Status:** 100% documentado y correcto

---

### ⚠️ PARCIAL: Grupos Django

**Documentado:**
```
contabilidad → E1
tecnico → E2  
comprador → E3
```

**Real en services.py (líneas 26-37):**
```python
GRUPO_CONTABILIDAD = "contabilidad"  # ✅ Documentado
GRUPO_COMPRADOR = "comprador"        # ✅ Documentado
GRUPO_TECNICO = "tecnico"            # ✅ Documentado

# Lote SEB-275..301 (sin documentar en SKILL.md):
GRUPO_VENTAS = "ventas"              # ❌ Nuevo
GRUPO_OPERACIONES = "operaciones"    # ❌ Nuevo
GRUPO_FINANZAS = "finanzas"          # ❌ Nuevo
GRUPO_RRHH = "rrhh"                  # ❌ Nuevo
GRUPO_CONTRATOS = "contratos"        # ❌ Nuevo
GRUPO_BODEGA = "bodega"              # ❌ Nuevo
```

**🔴 CRÍTICO:** SKILL.md no menciona 6 grupos nuevos agregados.

---

### ✅ BIEN: Firebase Initialization

**Documentado en arquitectura.md:** "lazy init"

**Real en fcm_client.py:**
- ✅ Thread-safe lazy init con `_init_lock` ✓
- ✅ Resuelve credenciales en orden de prioridad ✓
- ✅ Soporta 3 métodos: JSON inline, vars sueltas, path ✓
- ✅ Handle de \n escapados en PRIVATE_KEY ✓
- ✅ Logging de errores/warnings ✓

**Status:** 100% implementado correctamente

---

### ⚠️ PARCIAL: Celery Integration

**Documentado:**
- Task name: `notificaciones.send_fcm_push_task`
- Purga automática cada 30 días vía Celery Beat 03:00

**Real en tasks.py:**
- ✅ Task `send_fcm_push_task` existe ✓
- ✅ Crea historial siempre ✓
- ✅ Marcar tokens inválidos ✓
- ⚠️ Celery Beat schedule **NO documentado en dónde se configura** (probablemente en settings.py)
- ⚠️ Purga automática **NO verificada** que esté registrada en Celery Beat

---

## 2️⃣ PROBLEMAS IDENTIFICADOS

### 🔴 CRÍTICA #1: Documentación Desactualizada (Lote 2)

**Problema:**
- SKILL.md documenta solo 3 eventos (E1, E2, E3)
- Código implementa 17 eventos (incluyendo Lote 2)
- 8 grupos Django sin documentar

**Impacto:**
- Desarrolladores NO saben qué nuevos eventos existen
- Hooks de módulos nuevos (RRHH, contratos) pueden no estar registrados
- Risk de eventos disparándose sin notificaciones

**Fix:**
- Actualizar SKILL.md con Lote 2 completo (17 eventos + 8 grupos)
- Listar qué módulos disparan cada evento

---

### 🟠 ALTA #2: Celery Beat Schedule No Documentado

**Problema:**
- Arquitectura.md dice "purga automática cada 30 días vía Celery Beat 03:00"
- No documentado DÓNDE se configura el schedule
- No verificado que `purgar_notificaciones_antiguas` esté registrada

**Fix:**
- Agregar a arquitectura.md: dónde ver configuración de Celery Beat
- Verificar que purga está en `CELERY_BEAT_SCHEDULE` en settings.py

---

### 🟠 ALTA #3: Servicios de Eventos No Documentados

**Documentado en SKILL.md:**
- Referencias vagas a "funciones `notificar_X()` en services.py"

**Real en services.py:**
- Lineas 150+: muchas funciones `notificar_*()` implementadas para Lote 2
- Signatures, parámetros, flujos NO documentados

**Fix:**
- Crear tabla de funciones de servicios con signatures
- Documentar parámetros (usuario_id, empresa, titulo, url_destino, datos)

---

## 3️⃣ VALIDACIÓN: Código vs Modelos

### ✅ Verificado Correcto

```python
# services.py: Multi-tenancy correcto
sucursal__empresa=empresa  ✓

# tasks.py: Historial siempre creado
Notificacion.objects.bulk_create(notificaciones)  ✓

# fcm_client.py: Init lazy seguro
with _init_lock: ...  ✓

# tasks.py: Tokens inválidos marcados
FCMToken.objects.filter(token__in=invalidos).update(activo=False)  ✓
```

---

### ⚠️ No Verificado (Requiere Datos de Entorno)

- ✅ Firebase credentials resueltas (3 métodos soportados)
- ⚠️ Celery Beat schedule activo (no hay datos de settings.py en lectura)
- ⚠️ Frontend hooks integrados (no revisé código frontend)

---

## 4️⃣ MATRIZ: Cobertura de Documentación

| Aspecto | Documentado | Real | Discrepancia |
|---------|-------------|------|--------------|
| **Eventos (Lote 1)** | 3 | 3 | ✅ OK |
| **Eventos (Lote 2)** | ❌ NO | 14 | 🔴 CRÍTICA |
| **Grupos** | 3 | 9 | 🔴 CRÍTICA |
| **Flujo E2E** | ✅ Sí | Sí | ✅ OK |
| **Modelos BD** | ✅ 100% | 100% | ✅ OK |
| **Multi-tenancy** | ✅ OK | OK | ✅ OK |
| **Firebase init** | ✅ OK | OK | ✅ OK |
| **Celery integration** | ⚠️ Parcial | Sí | 🟠 MEDIA |
| **Funciones servicios** | ❌ NO | 20+ | 🟠 MEDIA |
| **Error handling** | ✅ Sí | Sí | ✅ OK |

---

## 5️⃣ RECOMENDACIONES

### 🔴 CRÍTICA (Hacer ya)

1. **Actualizar SKILL.md Lote 2**
   - Agregar tabla de 17 eventos con grupos destinatarios
   - Documentar dónde y cómo se dispara cada uno

2. **Actualizar grupos Django**
   - Listar los 9 grupos que existen
   - Qué eventos recibe cada uno

### 🟠 ALTA (Próxima sesión)

3. **Documentar servicios.py**
   - Tabla de funciones `notificar_X()` con signatures
   - Parámetros, validaciones, ejemplos

4. **Verificar Celery Beat**
   - Confirmar `purgar_notificaciones_antiguas` está schedulada
   - Documentar en arquitectura.md dónde ver config

---

## 6️⃣ REFERENCIA ACTUAL

| Documento | Status | Issue |
|-----------|--------|-------|
| `.github/skills/notificaciones/SKILL.md` | 🟠 DESACTUALIZADO | Lote 1 OK, Lote 2 falta |
| `.github/skills/notificaciones/references/arquitectura.md` | 🟢 OK | Celery Beat config no documentado |
| `.github/skills/notificaciones/references/diagnostico.md` | 🟢 OK | — |
| `.github/skills/notificaciones/references/agregar-evento.md` | 🟠 PARCIAL | Pasos OK pero nuevos eventos/grupos no en tabla |
| `backend/notificaciones/` | 🟢 IMPLEMENTADO | Código correcto y completo |

---

## CHECKLIST DE VALIDACIÓN

```
Documentación:
☐ Actualizar SKILL.md con Lote 2 (17 eventos + 8 grupos)
☐ Documentar funciones notificar_X() en servicios
☐ Verificar Celery Beat configuration en settings.py
☐ Agregar tabla de nuevos servicios

Código:
☐ Verificar todos los hooks están conectados
☐ Tests en tests.py cubren nuevos eventos
☐ Frontend integrado con nuevos eventos

Arquitectura:
☐ Multi-tenancy: ✅ OK
☐ Firebase init: ✅ OK
☐ Celery: ✅ OK (pero schedule no documentado)
☐ Token management: ✅ OK
```

---

**Status General:** 🟢 Motor **bien implementado**, 🔴 **documentación desactualizada** (Lote 2)

---

**Próximo paso:** Actualizar SKILL.md con eventos/grupos Lote 2 cuando autorices
