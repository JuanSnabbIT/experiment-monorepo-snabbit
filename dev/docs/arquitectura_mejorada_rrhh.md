# 🏗️ ARQUITECTURA MEJORADA: RRHH Contratos Laborales

**Objetivo:** Mejorar UX, atomicidad, escalabilidad y mantenibilidad  
**Scope:** Backend + Frontend (sin cambiar stack tecnológico)  
**Timeline:** 2-3 sprints

---

## 📊 ARQUITECTURA ACTUAL vs MEJORADA

### ACTUAL (Problemas)

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
├─────────────────────────────────────────────────────────┤
│  CrearContratoWizard (Component monolítico)             │
│  ├─ Formik (estado local)                              │
│  ├─ 7 Steps (acoplados a Formik)                        │
│  └─ No persiste en BD hasta paso 7 ❌                   │
│                                                         │
│  RTK Query (manejo de cache)                           │
│  ├─ providesTags/invalidatesTags                       │
│  └─ Funciona pero parcial ⚠️                            │
└─────────────────────────────────────────────────────────┘
                          ↓ (POST en paso 7)
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (Django)                       │
├─────────────────────────────────────────────────────────┤
│  ContratoTrabajadorViewSet (12 métodos)                │
│  ├─ crear_con_trabajador() - Atómico ✓                │
│  ├─ cambiar_estado() - NO atómico ❌                   │
│  ├─ enviar_aprobacion_empleador() - NO atómico ❌     │
│  ├─ aceptar() - Parcial atómico ⚠️                     │
│  └─ generar_pdf() - Sin idempotencia ❌                │
│                                                         │
│  Serializers (validación distribuida)                  │
│  ├─ ContratoTrabajadorSerializer (lectura)            │
│  ├─ ContratoTrabajadorWriteSerializer (escritura)     │
│  └─ CrearContratoConTrabajadorSerializer (especial)   │
│                                                         │
│  Lógica de negocio: mezclada en ViewSets ❌           │
└─────────────────────────────────────────────────────────┘
```

### MEJORADA (Propuesta)

```
┌──────────────────────────────────────────────────────────┐
│                 FRONTEND (React + Hooks)                 │
├──────────────────────────────────────────────────────────┤
│  useContratoWizard (Custom hook)                        │
│  ├─ Estado centralizado (Redux + local)                │
│  ├─ AutoSave a BD en cada paso (PATCH)                 │
│  └─ Confirmaciones modal integradas ✓                  │
│                                                         │
│  StepComponents (desacoplados)                         │
│  ├─ Step1Basicos.tsx                                   │
│  ├─ Step2Trabajador.tsx                                │
│  └─ Cada uno: validación + autoSave                    │
│                                                         │
│  RTK Query mejorada                                    │
│  ├─ invalidatesTags completo                           │
│  └─ Polling en estado pendiente_aprobacion            │
│                                                         │
│  Servicios (lógica de UI)                             │
│  ├─ contatoWizardService.ts (orquestación)           │
│  └─ validationService.ts (reglas centralizadas)       │
└──────────────────────────────────────────────────────────┘
                ↓ (PATCH después de cada step)
         ↓ (POST solo en paso 7 con atomicidad)
┌──────────────────────────────────────────────────────────┐
│                  BACKEND (Django)                         │
├──────────────────────────────────────────────────────────┤
│  RRHHContratosService (lógica de negocio)              │
│  ├─ crear_contrato()                                   │
│  ├─ cambiar_estado() (atómico)                         │
│  ├─ enviar_aprobacion() (atómico)                      │
│  └─ aceptar_aprobacion() (atómico)                     │
│                                                         │
│  ContratoTrabajadorViewSet (refactored)                │
│  ├─ Delegación a RRHHContratosService                 │
│  ├─ Manejo de HTTP (request/response)                 │
│  ├─ Validación de permisos                            │
│  └─ Simples, testeable ✓                               │
│                                                         │
│  Serializers (validación)                             │
│  ├─ Centralizados por caso de uso                     │
│  ├─ Compartidos con frontend (JSON schema)             │
│  └─ DRY: una fuente de verdad                         │
│                                                         │
│  Transacciones (atomicidad)                           │
│  ├─ @transaction.atomic en TODOS los cambios críticos│
│  ├─ on_commit() para tasks async (email)              │
│  └─ Rollback automático en error ✓                    │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 PRINCIPIOS DE MEJORA

### 1. **ATOMICIDAD GARANTIZADA**

**Problema actual:**
```python
# ❌ cambiar_estado NO es atómico
def cambiar_estado(self, request, pk=None):
    contrato = self.get_object()
    contrato.estado = nuevo_estado
    contrato.save()  # ← Punto 1
    
    ue = contrato.usuario_empresa
    ue.save()  # ← Punto 2: si falla, contrato ya saved
```

**Solución:**
```python
# ✅ Usar servicio con transacción explícita
@transaction.atomic
def cambiar_estado_a_vigente(self, contrato_id):
    contrato = ContratoTrabajador.objects.select_for_update().get(pk=contrato_id)
    contrato.estado = "vigente"
    contrato.save()
    
    ue = contrato.usuario_empresa
    ue.cargo = contrato.cargo
    ue.fecha_contrato = contrato.fecha_inicio
    ue.save()
    
    # Si ue.save() falla aquí → rollback completo
    return contrato
```

### 2. **SEPARACIÓN DE CONCERNS**

**Antes:**
- ViewSet = HTTP + Validación + Lógica + Base de datos

**Después:**
- ViewSet = HTTP solo
- Service = Lógica de negocio
- Serializer = Validación
- Repository/QuerySet = Acceso BD

### 3. **AUTO-GUARDADO PROGRESIVO**

**Antes:**
- Wizard: todo en memoria (Formik) hasta paso 7
- Si falla paso 7 → pérdida de datos

**Después:**
- Cada paso: PATCH /api/rrhh/contratos/{id}/ (debounced 1s)
- BD siempre actualizada
- Cliente siempre puede cerrar sin pérdida

### 4. **VALIDACIÓN CENTRALIZADA**

**Antes:**
- Frontend: Yup schema
- Backend: Django validators
- Riesgo: divergencia

**Después:**
- Fuente única: TypeScript interfaces + Pydantic/DRF serializers
- Frontend genera tipos desde backend (OpenAPI → TypeScript)
- Backend genera validaciones desde schema

### 5. **CONFIRMACIONES INTELIGENTES**

**Antes:**
- Clic "Generar PDF" → generado sin confirmación

**Después:**
- Step 7 muestra: "¿Generar contrato?" (modal 1)
- Clic confirmar → "¿Estás seguro? No podrás editar después." (modal 2)
- Cada acción destructiva: 2 confirmaciones

---

## 🏗️ PROPUESTA DETALLADA

### BACKEND

#### 1. Crear Servicio de Lógica

```python
# backend/rrhh/services.py (NUEVO)

from django.db import transaction
from .models import ContratoTrabajador, EnvioAprobacionEmpleador
from empresas.models import UsuarioEmpresa

class RRHHContratosService:
    """Lógica de negocio centralizada para contratos laborales"""
    
    @staticmethod
    @transaction.atomic
    def crear_contrato(empresa, trabajador_data, contrato_data):
        """Crea contrato + User/UsuarioEmpresa atomicamente"""
        # Validar ownership (ya implementado en crear_con_trabajador)
        # Crear User/UsuarioEmpresa si modo "nuevo"
        # Crear ContratoTrabajador
        # Retornar contrato creado
        pass
    
    @staticmethod
    @transaction.atomic
    def cambiar_estado_a_vigente(contrato_id, usuario):
        """Cambiar a vigente + sync UsuarioEmpresa atomicamente"""
        contrato = ContratoTrabajador.objects.select_for_update().get(pk=contrato_id)
        
        if contrato.estado != "pendiente_aprobacion":
            raise ValidationError("Solo pendiente_aprobacion puede pasar a vigente")
        
        # Validar aprobación del empleador
        envio = contrato.envios_aprobacion_empleador.filter(expirado=False).first()
        if not envio or envio.decision != "aprobado":
            raise ValidationError("Empleador no aprobó")
        
        # Transición atómica
        contrato.estado = "vigente"
        contrato.fecha_aprobacion = timezone.now()
        contrato.aceptado_por = usuario
        contrato.save()
        
        # Sync UsuarioEmpresa
        if contrato.usuario_empresa:
            ue = contrato.usuario_empresa
            ue.cargo = contrato.cargo
            ue.fecha_contrato = contrato.fecha_inicio
            ue.save(update_fields=["cargo", "fecha_contrato"])
        
        return contrato
    
    @staticmethod
    @transaction.atomic
    def cambiar_estado(contrato_id, nuevo_estado, **kwargs):
        """Cambiar estado con validación de máquina de estados"""
        contrato = ContratoTrabajador.objects.select_for_update().get(pk=contrato_id)
        
        # Validar transición
        if nuevo_estado not in TRANSICIONES_CONTRATO.get(contrato.estado, []):
            raise ValidationError(f"Transición no permitida: {contrato.estado} → {nuevo_estado}")
        
        # Lógica por estado
        if nuevo_estado == "terminado":
            motivo = kwargs.get("motivo_termino")
            if not motivo:
                raise ValidationError("motivo_termino es requerido")
            contrato.motivo_termino = motivo
            contrato.fecha_termino_real = kwargs.get("fecha_termino_real", timezone.now().date())
        
        elif nuevo_estado == "anulado":
            motivo = kwargs.get("motivo_anulacion")
            if not motivo:
                raise ValidationError("motivo_anulacion es requerido")
            contrato.motivo_anulacion = motivo
        
        # Guardar atómicamente
        contrato.estado = nuevo_estado
        contrato.save()
        
        return contrato
    
    @staticmethod
    @transaction.atomic
    def enviar_a_aprobacion_empleador(contrato_id, email_empleador, usuario):
        """Generar PDF + crear EnvioAprobacionEmpleador + transición atomicamente"""
        contrato = ContratoTrabajador.objects.select_for_update().get(pk=contrato_id)
        
        if contrato.estado != "borrador":
            raise ValidationError("Solo borrador puede enviarse a aprobación")
        
        # Generar PDF (idempotente)
        if not contrato.archivo_pdf:
            pdf_bytes = _generar_pdf(contrato, persistir=True)
        else:
            pdf_bytes = contrato.archivo_pdf.read()
        
        # Crear envío
        envio = EnvioAprobacionEmpleador.objects.create(
            contrato=contrato,
            pdf_congelado=pdf_bytes,
            enviado_a=email_empleador,
            enviado_por=usuario
        )
        
        # Transición
        contrato.estado = "pendiente_aprobacion"
        contrato.save()
        
        # Enviar email async (on_commit)
        transaction.on_commit(
            lambda: send_email_aprobacion_task.delay(envio.id)
        )
        
        return envio
```

#### 2. Refactorizar ViewSets

```python
# backend/rrhh/views.py

class ContratoTrabajadorViewSet(viewsets.ModelViewSet):
    # Más corto, enfocado en HTTP
    
    @action(detail=True, methods=["post"])
    def cambiar_estado(self, request, pk=None):
        try:
            contrato = RRHHContratosService.cambiar_estado(
                contrato_id=pk,
                nuevo_estado=request.data.get("estado"),
                **request.data
            )
            return Response(ContratoTrabajadorSerializer(contrato).data)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=400)
```

#### 3. Usar Transacciones Explícitas

```python
# Todos los cambios críticos:
@transaction.atomic
def metodo_critico(self):
    # Múltiples saves
    objeto1.save()
    objeto2.save()
    # Si falla aquí → rollback completo
```

### FRONTEND

#### 1. Custom Hook para Wizard

```typescript
// frontend/src/hooks/useContratoWizard.ts (NUEVO)

import { useCallback, useReducer } from 'react';
import { useCreateContratoMutation, useUpdateContratoMutation } from '@/store/slices/rrhh/contratoTrabajadorApi';

interface WizardState {
  currentStep: number;
  formData: IFormValuesContratoTrabajador;
  contratoId: string | null;
  isAutoSaving: boolean;
  autoSaveError: string | null;
}

export const useContratoWizard = () => {
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const [updateContrato, { isLoading: isUpdating }] = useUpdateContratoMutation();
  
  // AutoSave después de cambio
  const autoSaveStep = useCallback(async (stepNumber: number) => {
    if (!state.contratoId) {
      // Crear contrato en paso 1
      const result = await createContrato(state.formData);
      dispatch({ type: 'SET_CONTRATO_ID', payload: result.id });
    } else {
      // PATCH contrato existente
      dispatch({ type: 'SET_AUTO_SAVING', payload: true });
      try {
        await updateContrato({
          id: state.contratoId,
          data: state.formData
        }).unwrap();
        dispatch({ type: 'SET_AUTO_SAVE_ERROR', payload: null });
      } catch (error) {
        dispatch({ type: 'SET_AUTO_SAVE_ERROR', payload: error.message });
      } finally {
        dispatch({ type: 'SET_AUTO_SAVING', payload: false });
      }
    }
  }, [state.contratoId, state.formData]);
  
  const goToNextStep = useCallback(async () => {
    await autoSaveStep(state.currentStep);
    dispatch({ type: 'NEXT_STEP' });
  }, [autoSaveStep, state.currentStep]);
  
  return {
    state,
    goToNextStep,
    goToPreviousStep: () => dispatch({ type: 'PREV_STEP' }),
    setFormData: (data) => dispatch({ type: 'SET_FORM_DATA', payload: data }),
    isAutoSaving: state.isAutoSaving || isUpdating
  };
};
```

#### 2. AutoSave en Campos

```typescript
// frontend/src/components/form/FormField.tsx (mejorado)

import { useEffect, useRef } from 'react';
import debounce from 'lodash/debounce';

export const FormField = ({ value, onChange, onAutoSave, ...props }) => {
  const debouncedAutoSave = useRef(debounce((val) => {
    onAutoSave?.(val);
  }, 1000)).current; // 1 segundo after stop typing
  
  const handleChange = (e) => {
    onChange(e);
    debouncedAutoSave(e.target.value);
  };
  
  return <input onChange={handleChange} value={value} {...props} />;
};
```

#### 3. Confirmaciones 2-Paso

```typescript
// frontend/src/components/modals/ConfirmationModal.tsx

export const ConfirmationModal = ({ 
  title, 
  subtitle, 
  steps = 1,  // 1 o 2 pasos
  onConfirm 
}) => {
  const [step, setStep] = useState(1);
  
  if (step === 1) {
    return (
      <Modal>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <Button onClick={() => steps === 2 ? setStep(2) : onConfirm()}>
          Siguiente
        </Button>
      </Modal>
    );
  }
  
  // Paso 2
  return (
    <Modal>
      <h2>¿Estás seguro?</h2>
      <p>Esta acción no se puede deshacer</p>
      <Button onClick={onConfirm}>Sí, confirmo</Button>
      <Button onClick={() => setStep(1)}>Volver atrás</Button>
    </Modal>
  );
};
```

#### 4. Indicador de AutoSave

```typescript
// Barra inferior del wizard

<div className="wizard-footer">
  {isAutoSaving ? (
    <>
      <span>🔄 Guardando...</span>
    </>
  ) : (
    <>
      <span>✓ Guardado</span>
    </>
  )}
</div>
```

---

## 📋 PLAN DE IMPLEMENTACIÓN

### FASE 1: Backend Core (Sprint 1)

```
[ ] Crear RRHHContratosService
    [ ] crear_contrato() - atómico
    [ ] cambiar_estado() - atómico
    [ ] cambiar_estado_a_vigente() - atómico
    [ ] enviar_a_aprobacion_empleador() - atómico

[ ] Refactorizar ViewSets
    [ ] ContratoTrabajadorViewSet - delegar a service
    [ ] AnexoContratoViewSet - delegar a service
    [ ] Eliminar lógica de vistas

[ ] Agregar transacciones
    [ ] @transaction.atomic en métodos críticos
    [ ] select_for_update() en queries
    [ ] on_commit() para async tasks

[ ] Tests
    [ ] Atomicidad: rollback en error
    [ ] Validaciones: transiciones correctas
    [ ] Integración: E2E workflows
```

### FASE 2: Frontend Core (Sprint 1-2)

```
[ ] useContratoWizard hook
    [ ] Estado + dispatch
    [ ] AutoSave logic
    [ ] Error handling

[ ] AutoSave en steps
    [ ] Debounced PATCH /api/contrato/{id}/
    [ ] Indicador visual
    [ ] Error recovery

[ ] Confirmaciones 2-paso
    [ ] ConfirmationModal component
    [ ] Integración en acciones críticas
    [ ] Tests

[ ] Indicador de progreso
    [ ] Barra visual
    [ ] "Paso X/7"
    [ ] Estado auto-save
```

### FASE 3: UX + Documentación (Sprint 2-3)

```
[ ] Mensajes de error mejorados
    [ ] Error codes + suggestions
    [ ] Backend returns structured errors
    [ ] Frontend muestra user-friendly messages

[ ] Tooltips contextual
    [ ] Agregar en campos complejos
    [ ] Help text dinámico
    [ ] Links a documentación

[ ] Documentación + videos
    [ ] Onboarding interactivo
    [ ] Videos de operaciones complejas
    [ ] FAQ y glosario

[ ] Design system consistency
    [ ] Standardizar confirmaciones
    [ ] Validación visual
    [ ] Loading states
```

---

## 🎯 IMPACTO ESTIMADO

```
Antes:
├─ Pérdida de datos: ALTO (sin autoSave)
├─ Clicks accidentales: ALTO (sin confirmación)
├─ Errores sin solución: ALTO (mensajes genéricos)
├─ Curva aprendizaje: LARGA (sin documentación)
├─ Eficiencia usuario: BAJA (sin templates/atajos)
└─ Score Nielsen: 4.7/10

Después:
├─ Pérdida de datos: BAJO (autoSave)
├─ Clicks accidentales: BAJO (2 confirmaciones)
├─ Errores sin solución: BAJO (mensajes + sugerencias)
├─ Curva aprendizaje: CORTA (onboarding + docs)
├─ Eficiencia usuario: MEDIA-ALTA (templates, atajos)
└─ Score Nielsen: 7.9/10

MEJORA NETA: +3.2 puntos (68% mejora)
TIME-TO-VALUE: 2-3 sprints
```

---

## 📊 TABLA DE CAMBIOS

| Aspecto | Actual | Mejorado | Esfuerzo | Impacto |
|---|---|---|---|---|
| Atomicidad | Parcial | Total | 2d | CRÍTICA |
| AutoSave | No | Sí (cada step) | 3d | CRÍTICA |
| Confirmaciones | Mínimas | 2-paso | 1.5d | ALTA |
| Validación | Duplicada | Centralizada | 2.5d | MEDIA |
| Mensajes error | Genéricos | Contextuales | 2d | ALTA |
| Documentación | Nula | Completa | 4d | ALTA |
| Templates | No | Sí | 2d | MEDIA |
| Atajos keyboard | No | Sí | 1.5d | MEDIA |
| **TOTAL** | | | **18.5 días** | |

*Estimación: 1 sprint = 10 días (2.5 sprints)*

