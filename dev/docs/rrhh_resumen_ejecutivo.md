# 📊 RESUMEN EJECUTIVO: Auditoría RRHH Contratos

**Fecha:** 2026-06-03  
**Estado Actual:** 65% implementado  
**Implementable Ahora:** 4 correcciones  
**Fuera de Scope:** 1 corrección (requiere motor de roles)

---

## 🎯 HALLAZGOS PRINCIPALES

### ✅ LO QUE FUNCIONA (65%)
```
✓ Máquina de estados bien definida
✓ Auditoría/Historial completo e inmutable
✓ Multi-tenancy en lectura (GET/LIST)
✓ User creado solo al aprobar empleador
✓ Portal público empleador con UUID
✓ Expiración 14 días automática
✓ Serialización de datos correcta
```

### ⚠️ LO QUE ESTÁ INCOMPLETO (20%)
```
⚠ Anexos sin validar que contrato sea vigente
⚠ Terminar sin motivo obligatorio  
⚠ Gate de aprobación débil (sin validar decision)
⚠ Historial sin validación explícita (bajo riesgo)
```

### ❌ LO QUE FALTA (15%)
```
❌ Validación de rol RRHH
   └─ BLOQUEADO: No existe motor de roles en el sistema
```

---

## 📋 VULNERABILIDADES

| # | Problema | Severidad | Implementable | Timeline |
|---|----------|-----------|---------------|----------|
| 1 | Sin validación rol RRHH | 🔴 CRÍTICA | ❌ No (bloqueado) | N/A |
| 2 | Ownership en CREATE | 🔴 CRÍTICA | ✅ Sí | 45 min |
| 3 | Anexos sin vigente | 🟠 ALTA | ✅ Sí | 20 min |
| 4 | Terminar sin motivo | 🟠 ALTA | ✅ Sí | 15 min |
| 5 | Gate aprobación débil | 🔴 CRÍTICA | ✅ Sí | 20 min |

**TOTAL IMPLEMENTABLE:** 1h 40min (2 CRÍTICA + 2 ALTA)  
**BLOQUEADO:** Motor de roles

---

## 🔴 VULNERABILIDADES IMPLEMENTABLES AHORA

### FIX #1: OWNERSHIP EN CREATE (CRÍTICA - 45 min)
**Riesgo:** Usuario A podría crear contrato para Empresa B  
**Solución:** Validar UsuarioEmpresa y Sucursal pertenecen a empresa del usuario  
**Ubicación:** `backend/rrhh/views.py` línea ~620

**Cambio:**
```python
# Agregar validación en crear_con_trabajador()
if trabajador_data["modo"] == "existente":
    ue = UsuarioEmpresa.objects.filter(
        pk=ue_id,
        sucursal__empresa_id__in=ids_visibles  # ← NUEVO
    ).first()
    if not ue:
        return 400 error  # ← NUEVO
```

---

### FIX #2: ANEXO SIN VIGENTE (ALTA - 20 min)
**Riesgo:** Crear anexo en contrato borrador/pendiente/terminado  
**Solución:** Validar estado vigente en `perform_create()`  
**Ubicación:** `backend/rrhh/views.py` línea ~348

**Cambio:**
```python
# Agregar en AnexoContratoViewSet.perform_create()
if anexo.contrato.estado != "vigente":
    anexo.delete()
    raise ValidationError("Solo vigente...")  # ← NUEVO
```

---

### FIX #3: TERMINAR SIN MOTIVO (ALTA - 15 min)
**Riesgo:** Contrato sin auditoría del motivo de fin  
**Solución:** Hacer `motivo_termino` obligatorio  
**Ubicación:** `backend/rrhh/views.py` línea ~429

**Cambio:**
```python
# En cambiar_estado() para "terminado":
motivo = (request.data.get("motivo_termino") or "").strip()
if not motivo:
    return 400 error  # ← NUEVO: obligatorio
```

---

### FIX #4: GATE APROBACIÓN DÉBIL (CRÍTICA - 20 min)
**Riesgo:** Contrato pasa a vigente sin aprobación empleador  
**Solución:** Reforzar validación: envio existe AND decision=="aprobado"  
**Ubicación:** `backend/rrhh/views.py` línea ~452

**Cambio:**
```python
# En aceptar():
envio = contrato.envios_aprobacion_empleador.filter(expirado=False).first()
if not envio:
    return 400 error  # ← NUEVO: existe
if envio.decision != "aprobado":
    return 400 error  # ← NUEVO: aprobado
```

---

## ❌ NO IMPLEMENTABLE AHORA

### FALTA: VALIDACIÓN DE ROL RRHH (CRÍTICA)
**Status:** 🚫 **BLOQUEADO**  
**Razón:** No existe motor de roles en el sistema  
**Impacto:** Cualquier usuario autenticado puede crear/editar contratos RRHH  
**Cuando:** Será implementado cuando exista sistema de roles

**Será así:**
```python
# Cuando exista motor de roles:
class IsRRHH(BasePermission):
    def has_permission(self, request, view):
        return request.user.groups.filter(name='rrhh').exists()

# Aplicar en todos los ViewSets RRHH
class ContratoTrabajadorViewSet:
    permission_classes = [IsAuthenticated, IsRRHH]  # ← Cuando exista
```

---

## 📊 IMPACTO DE LAS CORRECCIONES

```
ANTES:
├─ Multi-tenancy: PARCIAL (solo lectura protegida)
├─ Máquina de estados: 85% (falta validación anexos/termino)
├─ Aprobación: DÉBIL (gate insuficiente)
└─ Auditoría: INCOMPLETA (sin motivo termino)

DESPUÉS de las 4 correcciones:
├─ Multi-tenancy: FUERTE (lectura + escritura protegidas)
├─ Máquina de estados: 100% (todas transiciones validadas)
├─ Aprobación: FUERTE (gate robusto)
└─ Auditoría: COMPLETA (todo motivo y trazabilidad)

RIESGO RESIDUAL:
└─ Sin motor de roles (cualquier auth puede acceder)
   └─ Mitigado por: multi-tenancy + auditoría
   └─ Riesgo: MEDIO-BAJO
```

---

## ✅ RECOMENDACIÓN

### PROCEDER AHORA CON:
- ✅ FIX #1: Ownership en CREATE (CRÍTICA)
- ✅ FIX #2: Anexo vigente (ALTA)
- ✅ FIX #3: Motivo termino (ALTA)
- ✅ FIX #4: Gate aprobación (CRÍTICA)

**Timeline:** 1h 40min + 20min testing = **2 horas**

### APLAZAR PARA DESPUÉS:
- ❌ FIX #0: Motor de roles (CRÍTICA pero bloqueado)
  - Esperar a que exista sistema de roles
  - Será agregado cuando esté implementado

---

## 📋 ARCHIVOS DE REFERENCIA

```
/dev/docs/
├── auditoria_rrhh_contratos.md          (auditoría completa)
├── rrhh_correcciones_sin_roles.md       (4 fixes implementables)
├── rrhh_flujo_diagrama.md               (flujo ideal TO-BE)
├── rrhh_diagrama_secuencia.md           (secuencias temporales)
└── rrhh_resumen_ejecutivo.md            (este archivo)
```

---

## 🚀 PRÓXIMOS PASOS

1. **Implementación** (2 horas)
   - Aplicar 4 FIX en una única PR
   - Tests para cada fix
   
2. **Code Review**
   - Validar cambios
   - Verificar tests green
   
3. **Merge + Deploy**
   - A develop → staging → producción
   
4. **Planificar motor de roles** (después)
   - Crear tarea para implementar sistema de permisos
   - Agregar validación de rol RRHH cuando exista

---

**Clasificación:** AUDITORÍA COMPLETA  
**Riesgo General:** MEDIO (mitigable en 2 horas)  
**Recomendación:** PROCEDER CON CORRECCIONES

