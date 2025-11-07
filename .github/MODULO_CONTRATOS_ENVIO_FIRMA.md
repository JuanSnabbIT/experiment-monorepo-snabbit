# 📧 Módulo de Envío de Contratos para Firma

**Fecha**: 2025-11-07  
**Estado**: 🔴 CRÍTICO - Bugs en producción  
**Autor**: Exploración técnica del sistema

---

## 📋 Índice

1. [Contexto](#contexto)
2. [Flujo Diseñado (Teoría)](#flujo-diseñado-teoría)
3. [Flujo Real (Implementación Actual)](#flujo-real-implementación-actual)
4. [Bugs Identificados](#bugs-identificados)
5. [Análisis Técnico Detallado](#análisis-técnico-detallado)
6. [Roadmap de Corrección](#roadmap-de-corrección)
7. [Referencias Técnicas](#referencias-técnicas)

---

## Contexto

El sistema ERP tiene una funcionalidad para **enviar contratos a usuarios vinculados para que los firmen digitalmente**. Este proceso es crítico porque:

- **Define el estado del contrato**: Un contrato solo debe pasar de `borrador` a `activo` cuando **todos** los usuarios vinculados lo han firmado.
- **Envía correos electrónicos**: Cada envío dispara una tarea Celery que envía un email con un link único (UUID).
- **Habilita firma pública**: El usuario recibe un link del tipo `/firmar-contrato/{uuid}` que abre una página pública donde puede firmar sin autenticarse.

### Descubrimiento del Usuario

> **Problema reportado**: *"Al presionar el botón 'Enviar' en el modal 'Enviar Contrato', el contrato sí se envía (aparece el objeto `EnvioContratoFirmaUsuario` en el admin de Django), pero en el frontend no ocurre nada: ni mensaje de confirmación ni cierre del modal. Presioné el botón varias veces pensando que no funcionaba y se crearon múltiples objetos duplicados."*

---

## Flujo Diseñado (Teoría)

Según la documentación en `.github/instructions/backend/contratos-bodegas-items.md`, el flujo esperado es:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. Usuario presiona "Enviar" en modal CrearEnvioContratoFirmaUsuario   │
│    - Frontend: POST a /api/contratos/{id}/usuarios-vinculados/{id}/envio-firma/ │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. Backend crea EnvioContratoFirmaUsuario con UUID único                │
│    - enviado=True, fecha_envio=now()                                    │
│    - Dispara tarea Celery para enviar email                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. Celery envía email con link: /firmar-contrato/{uuid}                 │
│    - Email contiene botón "Firmar contrato ahora"                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. Usuario hace clic → Página pública FirmarContratoYAcuerdoConfidencialidad │
│    - Muestra contrato + acuerdos de confidencialidad                    │
│    - Canvas de firma digital (react-signature-canvas)                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. Usuario firma → Frontend PATCH a /api/envio-firma/{uuid}/firmar/    │
│    - Envía: firma (base64), fecha_firma (ISO), firmado=true            │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. Backend valida UUID, guarda firma, marca firmado=True                │
│    - envio.firmado = True                                                │
│    - envio.firma = base64_string                                         │
│    - envio.fecha_firma = timestamp                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 7. ⚠️ LÓGICA FALTANTE: Verificar si todos firmaron                      │
│    - Si todos los EnvioContratoFirmaUsuario.firmado == True             │
│    - → Contrato.estado cambia de 'borrador' a 'activo'                  │
│    - → Notificar administrador del contrato                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Flujo Real (Implementación Actual)

### 1. Frontend: Modal de Envío (`CrearEnvioContratoFirmaUsuario.tsx`)

**Archivo**: `frontend/src/pages/Contratos/modals/CrearEnvioContratoFirmaUsuario.tsx`

```typescript
onSubmit: async (values) => {
    try {
        const response = await ApiService.fetchData({
            url: `/api/contratos/${detalleContratoEmpresaCliente?.id}/usuarios-vinculados/${values.usuario}/envio-firma/`,
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ usuario: values.usuario }),
        });
        if (response.data) {
            toast.success('Envio exitoso', { autoClose: 1000 });
            setIsOpen(false);  // ✅ SÍ cierra el modal
        }
    } catch (error: any) {
        const mensajesError = Object.values(error.response.data).flat().join(' ');
        toast.error(mensajesError || 'Error al enviar la firma', {
            toastId: 'Error al enviar la firma',
        });
    }
}
```

**Observación**: El código **SÍ tiene lógica para cerrar el modal** (`setIsOpen(false)`) y mostrar mensaje de éxito. El problema debe estar en **otro lugar**.

---

### 2. Backend: ViewSet de Envío (`EnvioContratoFirmaUsuarioViewSet`)

**Archivo**: `backend/contratos/views.py` (líneas 545-579)

```python
class EnvioContratoFirmaUsuarioViewSet(viewsets.ModelViewSet):
    queryset = EnvioContratoFirmaUsuario.objects.all()
    serializer_class = EnvioContratoFirmaUsuarioSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        envio = serializer.save(enviado=True, fecha_envio=timezone.now())

        # Preparar y enviar correo
        self._enviar_correo(envio)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
```

**Análisis**:
- ✅ Guarda el envío correctamente
- ✅ Dispara email mediante Celery
- ✅ Retorna HTTP 201 Created
- ⚠️ **NO valida si ya existe un envío previo para ese usuario**

---

### 3. Backend: Endpoint de Firma Pública (`firmar_envio`)

**Archivo**: `backend/contratos/views.py` (líneas 638-682)

```python
@csrf_exempt
@require_http_methods(["PATCH"])
def firmar_envio(request, uuid):
    try:
        envio = EnvioContratoFirmaUsuario.objects.get(uuid=uuid)
    except EnvioContratoFirmaUsuario.DoesNotExist:
        return JsonResponse({'error': 'Envío no encontrado.'}, status=404)

    # ... parsear JSON ...
    
    envio.firma       = firma_value
    envio.fecha_firma = fecha_firma
    envio.firmado     = bool(firmado_value)
    envio.save(update_fields=['firma', 'fecha_firma', 'firmado'])

    # ⚠️ AQUÍ FALTA LÓGICA:
    # - Verificar si todos los EnvioContratoFirmaUsuario del contrato están firmados
    # - Si todos firmaron → cambiar contrato.estado de 'borrador' a 'activo'
    # - Enviar notificación al admin del contrato

    return JsonResponse({...})
```

---

### 4. Frontend: Página de Firma Pública

**Archivo**: `frontend/src/pages/Contratos/components/FirmarContratoYAcuerdoConfidencialidad.tsx`

```typescript
const response = await ApiService.fetchData({
    url: `/api/envio-firma/${uuid}/firmar/`, 
    method: 'patch',
    headers: {'Content-Type': 'application/json'}, 
    isLoginRequest: true,  // 🔍 No requiere autenticación
    data: JSON.stringify({
        firma: sigCanvas.current?.toDataURL('image/png'),
        fecha_firma: dayjs().locale("es"),
        firmado: true
    })
})
if (response.data) {
    toast.success("Contrato firmado", {autoClose: 1000})
    navigate("/login")
}
```

**Observación**: Funciona correctamente, la firma se guarda en el backend.

---

## Bugs Identificados

### 🐛 Bug #1: Modal no muestra retroalimentación (APARENTE)

**Síntoma**: El usuario reporta que el modal no se cierra ni muestra mensaje de confirmación.

**Causa Raíz PROBABLE**: 
1. **Error de red silencioso**: Si `ApiService.fetchData` falla sin entrar al `catch`, el código nunca llega a `setIsOpen(false)`.
2. **Re-render inesperado**: `useEffect` con dependencia `[isOpen]` recarga el detalle del contrato; si esto dispara un re-render, el modal podría volver a abrirse.
3. **Promise no resuelta**: `response.data` podría ser `undefined` o falsy, evitando la ejecución de `setIsOpen(false)`.

**Evidencia Técnica**:
```typescript
useEffect(() => {
    if (isOpen) {
        dispatch(detalleContratoEmpresaClienteThunk({
            id_contrato: detalleContratoEmpresaCliente?.id,
        }));
    } else {
        formik.resetForm();
    }
}, [isOpen]);
```

Si `detalleContratoEmpresaClienteThunk` tarda en resolver y modifica el estado de Redux, podría causar un re-render que impida el cierre del modal.

---

### 🐛 Bug #2: Creación de envíos duplicados

**Síntoma**: Se crean múltiples objetos `EnvioContratoFirmaUsuario` para el mismo usuario vinculado.

**Causa Raíz**: **Falta de validación de unicidad en el backend**. El ViewSet permite crear N envíos para el mismo `UsuarioVinculadoContrato`.

**Solución Propuesta**:
```python
def create(self, request, *args, **kwargs):
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    # ✅ Validar si ya existe un envío previo
    usuario_vinculado_id = kwargs.get('usuario_vinculado_pk')
    envio_existente = EnvioContratoFirmaUsuario.objects.filter(
        usuario__id=usuario_vinculado_id
    ).first()
    
    if envio_existente:
        if envio_existente.firmado:
            return Response(
                {"detail": "Este usuario ya firmó el contrato."},
                status=status.HTTP_400_BAD_REQUEST
            )
        else:
            # Reenviar el correo existente
            self._enviar_correo(envio_existente)
            return Response(
                {"detail": "Ya existe un envío previo. Se ha reenviado el correo."},
                status=status.HTTP_200_OK
            )
    
    # Crear nuevo envío solo si no existe
    envio = serializer.save(enviado=True, fecha_envio=timezone.now())
    self._enviar_correo(envio)
    
    headers = self.get_success_headers(serializer.data)
    return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
```

---

### 🐛 Bug #3: Contrato nunca pasa de 'borrador' a 'activo'

**Síntoma**: Aun después de que todos los usuarios firman, el contrato permanece en estado `borrador`.

**Causa Raíz**: **Falta de lógica de verificación y activación automática**.

**Ubicación esperada**: `firmar_envio` (después de guardar la firma) o mediante **Django Signal** en `post_save` de `EnvioContratoFirmaUsuario`.

**Solución Propuesta (Opción A - En el endpoint)**:
```python
@csrf_exempt
@require_http_methods(["PATCH"])
def firmar_envio(request, uuid):
    # ... código existente ...
    
    envio.firma       = firma_value
    envio.fecha_firma = fecha_firma
    envio.firmado     = bool(firmado_value)
    envio.save(update_fields=['firma', 'fecha_firma', 'firmado'])
    
    # ✅ Verificar si todos los usuarios vinculados han firmado
    contrato = envio.usuario.contrato
    todos_los_envios = EnvioContratoFirmaUsuario.objects.filter(
        usuario__contrato=contrato
    )
    
    # Validar que exista al menos un envío por cada usuario vinculado
    usuarios_vinculados_count = UsuarioVinculadoContrato.objects.filter(
        contrato=contrato
    ).count()
    
    envios_firmados_count = todos_los_envios.filter(firmado=True).count()
    
    if envios_firmados_count == usuarios_vinculados_count and usuarios_vinculados_count > 0:
        # Todos firmaron → Activar contrato
        contrato.estado = 'activo'
        contrato.save(update_fields=['estado'])
        
        # Opcional: Enviar notificación al admin
        # notify_contract_activated.delay(contrato.id)
    
    return JsonResponse({...})
```

**Solución Propuesta (Opción B - Con Signal)**:
```python
# En contratos/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import EnvioContratoFirmaUsuario, UsuarioVinculadoContrato

@receiver(post_save, sender=EnvioContratoFirmaUsuario)
def activar_contrato_si_todos_firmaron(sender, instance, **kwargs):
    """
    Signal que verifica si todos los usuarios vinculados han firmado.
    Si es así, cambia el contrato de 'borrador' a 'activo'.
    """
    if not instance.firmado:
        return  # Solo actuar cuando firmado=True
    
    contrato = instance.usuario.contrato
    
    # Contar usuarios vinculados vs envíos firmados
    usuarios_vinculados_count = UsuarioVinculadoContrato.objects.filter(
        contrato=contrato
    ).count()
    
    envios_firmados_count = EnvioContratoFirmaUsuario.objects.filter(
        usuario__contrato=contrato,
        firmado=True
    ).count()
    
    # Si todos firmaron y el contrato está en borrador → Activar
    if (envios_firmados_count == usuarios_vinculados_count and 
        usuarios_vinculados_count > 0 and 
        contrato.estado == 'borrador'):
        
        contrato.estado = 'activo'
        contrato.save(update_fields=['estado'])
        
        # Opcional: Registrar en logs
        logger.info(f"Contrato {contrato.id} activado automáticamente tras firmas completas")
```

---

## Análisis Técnico Detallado

### 1. Modelo de Datos (`EnvioContratoFirmaUsuario`)

**Archivo**: `backend/contratos/models.py` (líneas 61-72)

```python
class EnvioContratoFirmaUsuario(ModeloBase):
    firma = models.TextField(blank=True, null=True)  # Base64 de imagen de firma
    fecha_firma = models.DateTimeField(blank=True, null=True)
    firmado = models.BooleanField(default=False)
    fecha_envio = models.DateTimeField(blank=True, null=True)
    enviado = models.BooleanField(default=False)
    uuid = models.UUIDField(unique=True, default=uuid.uuid4)
    usuario = models.ForeignKey("contratos.UsuarioVinculadoContrato", on_delete=models.CASCADE)
```

**Análisis de Consistencia**:
- ✅ UUID único garantiza que cada envío tiene un link único
- ⚠️ **NO tiene constraint de unicidad en `usuario`** → Permite duplicados
- ⚠️ **NO tiene FK directa al contrato** → Requiere traversal: `envio.usuario.contrato`

**Propuesta de Mejora**:
```python
class EnvioContratoFirmaUsuario(ModeloBase):
    # ... campos existentes ...
    
    class Meta:
        verbose_name = "Envio del Contrato para Firmar"
        verbose_name_plural = "Envios de Contratos para Firmar"
        # ✅ Agregar constraint de unicidad
        constraints = [
            models.UniqueConstraint(
                fields=['usuario'],
                condition=models.Q(enviado=True),
                name='unique_envio_por_usuario'
            )
        ]
```

---

### 2. Serializer (`UsuarioVinculadoContratoSerializer`)

**Archivo**: `backend/contratos/serializers.py` (líneas 264-268)

```python
def get_existe_envio(self, obj):
    if EnvioContratoFirmaUsuario.objects.filter(usuario=obj).exists():
        return EnvioContratoFirmaUsuario.objects.filter(usuario=obj).first().pk
    else:
        return None
```

**Análisis**:
- ✅ Permite al frontend saber si un usuario ya tiene un envío
- ⚠️ **Problema**: Si hay envíos duplicados, solo devuelve el primero (`.first()`)
- ⚠️ **No diferencia entre enviado/no-enviado o firmado/no-firmado**

**Propuesta de Mejora**:
```python
def get_existe_envio(self, obj):
    """
    Retorna info detallada del envío más reciente del usuario.
    """
    envio = EnvioContratoFirmaUsuario.objects.filter(
        usuario=obj,
        enviado=True
    ).order_by('-fecha_envio').first()
    
    if envio:
        return {
            'id': envio.pk,
            'firmado': envio.firmado,
            'fecha_firma': envio.fecha_firma.isoformat() if envio.fecha_firma else None,
            'fecha_envio': envio.fecha_envio.isoformat() if envio.fecha_envio else None,
        }
    return None
```

---

### 3. Routing del Frontend

**Archivo**: `frontend/src/routes/contratosRoutes.tsx` (inferido)

```typescript
{
    path: '/firmar-contrato/:uuid',
    element: <FirmarContratoYAcuerdoConfidencialidad />,
    // ⚠️ isProtectedRoute: false (ruta pública)
}
```

**Validación**: Esta ruta **DEBE ser pública** para que usuarios externos puedan firmar sin autenticarse.

---

## Roadmap de Corrección

### Sprint 1: Hotfixes Críticos (1-2 días)

#### Tarea 1.1: Prevenir envíos duplicados
**Prioridad**: 🔴 CRÍTICA  
**Archivo**: `backend/contratos/views.py`

```python
# En EnvioContratoFirmaUsuarioViewSet.create()
def create(self, request, *args, **kwargs):
    usuario_vinculado_id = kwargs.get('usuario_vinculado_pk')
    
    # Validar envío existente
    envio_existente = EnvioContratoFirmaUsuario.objects.filter(
        usuario__id=usuario_vinculado_id,
        enviado=True
    ).first()
    
    if envio_existente:
        if envio_existente.firmado:
            return Response(
                {"detail": "Este usuario ya firmó el contrato."},
                status=status.HTTP_400_BAD_REQUEST
            )
        else:
            # Reenviar
            envio_existente.fecha_envio = timezone.now()
            envio_existente.save(update_fields=['fecha_envio'])
            self._enviar_correo(envio_existente)
            return Response(
                EnvioContratoFirmaUsuarioSerializer(envio_existente).data,
                status=status.HTTP_200_OK
            )
    
    # Crear nuevo envío
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    envio = serializer.save(enviado=True, fecha_envio=timezone.now())
    self._enviar_correo(envio)
    
    return Response(serializer.data, status=status.HTTP_201_CREATED)
```

**Testing**:
```cmd
REM Desde backend/
ENV\Scripts\python.exe manage.py test contratos.tests.test_envio_duplicado
```

---

#### Tarea 1.2: Activación automática del contrato
**Prioridad**: 🔴 CRÍTICA  
**Archivo**: `backend/contratos/signals.py`

```python
@receiver(post_save, sender=EnvioContratoFirmaUsuario)
def activar_contrato_si_todos_firmaron(sender, instance, created, **kwargs):
    """
    Verifica si todos los usuarios vinculados han firmado.
    Si es así, cambia el contrato de 'borrador' a 'activo'.
    """
    # Solo actuar cuando se marca firmado=True
    if not instance.firmado:
        return
    
    contrato = instance.usuario.contrato
    
    # Contar usuarios vinculados
    usuarios_vinculados = UsuarioVinculadoContrato.objects.filter(
        contrato=contrato
    )
    total_usuarios = usuarios_vinculados.count()
    
    if total_usuarios == 0:
        return
    
    # Contar envíos firmados (uno por usuario)
    usuarios_ids = usuarios_vinculados.values_list('id', flat=True)
    envios_firmados = EnvioContratoFirmaUsuario.objects.filter(
        usuario__id__in=usuarios_ids,
        firmado=True
    ).values('usuario').distinct().count()
    
    # Si todos firmaron y el contrato está en borrador → Activar
    if envios_firmados == total_usuarios and contrato.estado == 'borrador':
        contrato.estado = 'activo'
        contrato.save(update_fields=['estado'])
        
        # Logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(
            f"Contrato {contrato.id} activado automáticamente. "
            f"{envios_firmados}/{total_usuarios} usuarios firmaron."
        )
        
        # Opcional: Tarea Celery para notificar
        # from contratos.tasks import notificar_contrato_activado
        # notificar_contrato_activado.delay(contrato.id)
```

**Testing**:
```cmd
REM Desde backend/
ENV\Scripts\python.exe manage.py test contratos.tests.test_activacion_automatica
```

---

#### Tarea 1.3: Mejorar feedback en frontend
**Prioridad**: 🟡 ALTA  
**Archivo**: `frontend/src/pages/Contratos/modals/CrearEnvioContratoFirmaUsuario.tsx`

```typescript
onSubmit: async (values) => {
    try {
        const response = await ApiService.fetchData({
            url: `/api/contratos/${detalleContratoEmpresaCliente?.id}/usuarios-vinculados/${values.usuario}/envio-firma/`,
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ usuario: values.usuario }),
        });
        
        // ✅ Validar response.data explícitamente
        if (response && response.data) {
            toast.success('Envío exitoso. El usuario recibirá un correo electrónico.', { 
                autoClose: 2000 
            });
            
            // ✅ Recargar detalle del contrato para actualizar estado de envíos
            await dispatch(
                detalleContratoEmpresaClienteThunk({
                    id_contrato: detalleContratoEmpresaCliente?.id,
                })
            ).unwrap();
            
            setIsOpen(false);
            formik.resetForm();
        } else {
            toast.warning('El envío se procesó pero no se recibió confirmación.', {
                autoClose: 3000
            });
        }
    } catch (error: any) {
        const mensajesError = error.response?.data 
            ? Object.values(error.response.data).flat().join(' ')
            : 'Error desconocido al enviar la firma';
        
        toast.error(mensajesError, {
            toastId: 'Error al enviar la firma',
            autoClose: 5000
        });
    }
}
```

**Validación Manual**:
1. Abrir DevTools → Network
2. Enviar contrato
3. Verificar que el request devuelve HTTP 201 Created
4. Confirmar que el modal se cierra y aparece toast de éxito

---

### Sprint 2: Mejoras de Robustez (3-5 días)

#### Tarea 2.1: Agregar constraint de unicidad en DB
**Archivo**: `backend/contratos/models.py`

```python
class EnvioContratoFirmaUsuario(ModeloBase):
    # ... campos existentes ...
    
    class Meta:
        verbose_name = "Envio del Contrato para Firmar"
        verbose_name_plural = "Envios de Contratos para Firmar"
        constraints = [
            models.UniqueConstraint(
                fields=['usuario'],
                condition=models.Q(enviado=True),
                name='unique_envio_por_usuario'
            )
        ]
```

**Migración**:
```cmd
REM Desde backend/
ENV\Scripts\python.exe manage.py makemigrations contratos
ENV\Scripts\python.exe manage.py migrate
```

---

#### Tarea 2.2: Mejorar serializer de envíos
**Archivo**: `backend/contratos/serializers.py`

```python
class UsuarioVinculadoContratoSerializer(serializers.ModelSerializer):
    # ... campos existentes ...
    
    def get_existe_envio(self, obj):
        envio = EnvioContratoFirmaUsuario.objects.filter(
            usuario=obj,
            enviado=True
        ).order_by('-fecha_envio').first()
        
        if envio:
            return {
                'id': envio.pk,
                'uuid': str(envio.uuid),
                'firmado': envio.firmado,
                'fecha_firma': envio.fecha_firma.isoformat() if envio.fecha_firma else None,
                'fecha_envio': envio.fecha_envio.isoformat(),
            }
        return None
```

**Impacto en Frontend**:
```typescript
// En ContratosDelCliente.tsx
{vinculos.existe_envio ? (
    vinculos.existe_envio.firmado ? (
        <Badge color="green">Firmado el {vinculos.existe_envio.fecha_firma}</Badge>
    ) : (
        <Button onClick={reenviar}>Reenviar</Button>
    )
) : (
    <Badge color="gray">Pendiente de envío</Badge>
)}
```

---

#### Tarea 2.3: Agregar tests unitarios
**Archivo**: `backend/contratos/tests.py`

```python
from django.test import TestCase
from contratos.models import (
    ContratoEmpresaCliente, 
    UsuarioVinculadoContrato, 
    EnvioContratoFirmaUsuario
)

class EnvioFirmaTestCase(TestCase):
    def setUp(self):
        # Crear contrato, usuarios vinculados, etc.
        pass
    
    def test_no_permite_envios_duplicados(self):
        """Verificar que no se permiten envíos duplicados para el mismo usuario."""
        pass
    
    def test_activacion_automatica_con_todas_firmas(self):
        """Verificar que el contrato se activa cuando todos firman."""
        contrato = ContratoEmpresaCliente.objects.create(estado='borrador', ...)
        usuario1 = UsuarioVinculadoContrato.objects.create(contrato=contrato, ...)
        usuario2 = UsuarioVinculadoContrato.objects.create(contrato=contrato, ...)
        
        # Firmar usuario 1
        envio1 = EnvioContratoFirmaUsuario.objects.create(usuario=usuario1, enviado=True)
        envio1.firmado = True
        envio1.save()
        
        # Contrato debe seguir en borrador
        contrato.refresh_from_db()
        self.assertEqual(contrato.estado, 'borrador')
        
        # Firmar usuario 2
        envio2 = EnvioContratoFirmaUsuario.objects.create(usuario=usuario2, enviado=True)
        envio2.firmado = True
        envio2.save()
        
        # Contrato debe pasar a activo
        contrato.refresh_from_db()
        self.assertEqual(contrato.estado, 'activo')
    
    def test_no_activa_si_faltan_firmas(self):
        """Verificar que el contrato NO se activa si falta al menos una firma."""
        pass
```

**Ejecución**:
```cmd
REM Desde backend/
ENV\Scripts\python.exe manage.py test contratos.tests.EnvioFirmaTestCase
```

---

### Sprint 3: Mejoras de UX (1-2 días)

#### Tarea 3.1: Indicador visual de progreso de firmas
**Archivo**: `frontend/src/pages/Contratos/ContratosDelCliente.tsx`

```typescript
const calcularProgresoFirmas = () => {
    if (!detalleContratoEmpresaCliente) return 0;
    
    const total = detalleContratoEmpresaCliente.vinculos_contrato.length;
    const firmados = detalleContratoEmpresaCliente.vinculos_contrato.filter(
        v => v.existe_envio && v.existe_envio.firmado
    ).length;
    
    return total > 0 ? (firmados / total) * 100 : 0;
};

// En el render:
<div className="mb-4">
    <Badge>Progreso de Firmas: {calcularProgresoFirmas().toFixed(0)}%</Badge>
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${calcularProgresoFirmas()}%` }}
        />
    </div>
    <p className="text-sm text-gray-500 mt-1">
        {detalleContratoEmpresaCliente?.vinculos_contrato.filter(v => v.existe_envio?.firmado).length} 
        de {detalleContratoEmpresaCliente?.vinculos_contrato.length} usuarios han firmado
    </p>
</div>
```

---

#### Tarea 3.2: Notificación al admin cuando contrato se activa
**Archivo**: `backend/contratos/tasks.py` (crear si no existe)

```python
from celery import shared_task
from django.core.mail import send_mail
from contratos.models import ContratoEmpresaCliente

@shared_task
def notificar_contrato_activado(contrato_id):
    """
    Envía notificación por email cuando un contrato se activa automáticamente.
    """
    try:
        contrato = ContratoEmpresaCliente.objects.get(id=contrato_id)
        
        # Email al administrador de la empresa prestadora
        admin_email = contrato.empresa_prestadora.email  # Ajustar según modelo
        
        send_mail(
            subject=f"Contrato {contrato.id} activado",
            message=f"El contrato con {contrato.empresa_cliente.nombre} ha sido activado automáticamente tras completar todas las firmas.",
            from_email='noreply@gestionsnabb-it.cl',
            recipient_list=[admin_email],
        )
        
        return f"Notificación enviada a {admin_email}"
    except ContratoEmpresaCliente.DoesNotExist:
        return f"Contrato {contrato_id} no encontrado"
```

**Integración en Signal**:
```python
# En contratos/signals.py
if envios_firmados == total_usuarios and contrato.estado == 'borrador':
    contrato.estado = 'activo'
    contrato.save(update_fields=['estado'])
    
    # ✅ Disparar notificación
    from contratos.tasks import notificar_contrato_activado
    notificar_contrato_activado.delay(contrato.id)
```

---

## Referencias Técnicas

### Archivos Clave

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `backend/contratos/models.py` | 61-72 | Modelo `EnvioContratoFirmaUsuario` |
| `backend/contratos/views.py` | 545-682 | ViewSet de envío y endpoint de firma |
| `backend/contratos/serializers.py` | 260-326 | Serializers de contratos y envíos |
| `backend/contratos/signals.py` | 1-80 | Signals existentes (licencias) |
| `frontend/src/pages/Contratos/modals/CrearEnvioContratoFirmaUsuario.tsx` | 1-142 | Modal de envío |
| `frontend/src/pages/Contratos/components/FirmarContratoYAcuerdoConfidencialidad.tsx` | 1-107 | Página pública de firma |

### Endpoints de API

| Método | URL | Descripción | Autenticación |
|--------|-----|-------------|---------------|
| `POST` | `/api/contratos/{id}/usuarios-vinculados/{id}/envio-firma/` | Crear envío de firma | ✅ Requerida |
| `POST` | `/api/contratos/{id}/usuarios-vinculados/{id}/envio-firma/{id}/reenviar/` | Reenviar correo | ✅ Requerida |
| `GET` | `/api/acuerdos-por-envio/{uuid}/` | Obtener acuerdos del contrato | ❌ Pública |
| `PATCH` | `/api/envio-firma/{uuid}/firmar/` | Registrar firma del usuario | ❌ Pública |

### Estados del Contrato

```python
ESTADOS_CONTRATO = [
    ('borrador', 'Borrador'),    # Estado inicial
    ('activo', 'Activo'),        # Cuando todos firman
    ('suspendido', 'Suspendido'),
    ('finalizado', 'Finalizado'),
]
```

### Relaciones del Modelo

```
ContratoEmpresaCliente (1) ←──→ (N) UsuarioVinculadoContrato
                                       ↓ (1)
                                       ↓
                        EnvioContratoFirmaUsuario (N)
                        - uuid (único)
                        - firmado (boolean)
```

---

## Conclusión

El sistema de envío de contratos para firma **tiene bugs críticos** que impactan la experiencia del usuario y la integridad de los datos:

1. **Envíos duplicados**: Falta validación de unicidad.
2. **Contrato nunca se activa**: Falta lógica de verificación de firmas completas.
3. **Feedback ambiguo**: Modal parece no responder (aunque técnicamente el código es correcto).

**Prioridad de implementación**:
1. ✅ Prevenir duplicados (hotfix)
2. ✅ Activación automática con signal (hotfix)
3. ✅ Mejorar feedback visual (mejora UX)
4. 🔄 Agregar tests y constraints DB (robustez)

**Impacto estimado**: 3-5 días de desarrollo + testing completo.

---

**Última actualización**: 2025-11-07  
**Próximo paso**: Implementar Tarea 1.1 (prevención de duplicados) y Tarea 1.2 (activación automática).
