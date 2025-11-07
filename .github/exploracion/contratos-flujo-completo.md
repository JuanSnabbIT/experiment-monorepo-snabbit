# Módulo de Contratos - Flujo Completo y Estado Actual

## 📋 Índice
1. [Estado Actual del Sistema](#estado-actual-del-sistema)
2. [Estados de Contrato](#estados-de-contrato)
3. [Flujo Esperado vs Realidad](#flujo-esperado-vs-realidad)
4. [Funcionalidades Faltantes](#funcionalidades-faltantes)
5. [Botones Sin Implementar](#botones-sin-implementar)
6. [Propuestas de Mejora](#propuestas-de-mejora)
7. [Roadmap de Implementación](#roadmap-de-implementación)

---

## Estado Actual del Sistema

### ✅ Funcionalidades Operativas

1. **Creación de Contratos** (Django Admin)
   - ✅ Empresa prestadora y cliente
   - ✅ Fechas de inicio y fin
   - ✅ Tipo de contrato (licencia, venta, servicios)
   - ✅ Nombre y observaciones

2. **Servicios y Planes**
   - ✅ Agregar servicios individuales con precio y cantidad
   - ✅ Agregar planes de servicio con precio y cantidad
   - ✅ ContentType para polimorfismo (Servicio o PlanServicio)

3. **Licencias**
   - ✅ Vincular licencias de software al contrato
   - ✅ Tipo de modalidad (anual, mensual, perpetua, etc.)
   - ✅ Cantidad, precio unitario, moneda (USD/CLP)
   - ✅ Fechas de inicio y fin de licenciamiento
   - ✅ Ventanas de reducción de licencias (7 días desde inicio de período)
   - ✅ Usuarios vinculados a cada licencia

4. **Visitas**
   - ✅ Vincular tipos de visitas al contrato
   - ✅ Frecuencia (mensual, trimestral, semestral, anual)
   - ✅ Cantidad de visitas

5. **Condiciones Especiales**
   - ✅ Vincular condiciones especiales (SLA, garantías, etc.)
   - ✅ Catálogo predefinido de condiciones

6. **Usuarios Vinculados**
   - ✅ Vincular usuarios de la empresa cliente al contrato
   - ✅ Tipo de usuario (jefatura, gerencia, finanzas, general)

7. **Acuerdos de Confidencialidad**
   - ✅ Vincular plantillas de NDA al contrato
   - ✅ Catálogo de acuerdos base reutilizables

8. **Visualización Frontend** (Parcial)
   - ✅ Ver detalle del contrato
   - ✅ Ver servicios/planes en carrusel (Swiper)
   - ✅ Ver licencias, visitas, condiciones, usuarios
   - ✅ Edición de campos básicos del contrato

---

### ❌ Funcionalidades NO Implementadas

1. **Gestión de Estados**
   - ❌ No hay botón para cambiar de "Borrador" → "Activo"
   - ❌ No hay botón para "Suspender" contrato
   - ❌ No hay botón para "Finalizar" contrato
   - ⚠️ Solo existe action en Django Admin: `marcar_como_finalizado`

2. **Detalles de Servicios/Planes**
   - ❌ Botón "Detalles" no hace nada (líneas 411 y 428 de ContratosDelCliente.tsx)
   - ❌ No hay modal para ver características del servicio
   - ❌ No hay modal para ver servicios incluidos en un plan

3. **Envío de Contratos para Firma**
   - ⚠️ Existe modelo `EnvioContratoFirmaUsuario` pero no está integrado al flujo
   - ❌ No hay botón para "Enviar contrato a firmar"
   - ❌ No hay flujo de firma electrónica

4. **Generación de Documentos**
   - ⚠️ Existe endpoint `/pdf` en el backend (línea 347 de views.py)
   - ❌ No hay botón en frontend para "Generar PDF"
   - ❌ No hay visualización del PDF generado

5. **Historial y Auditoría**
   - ⚠️ Modelo usa `ModeloBaseHistorico` (django-simple-history)
   - ❌ No hay UI para ver historial de cambios
   - ❌ No hay timeline de eventos del contrato

6. **Validaciones de Negocio**
   - ❌ No valida que un contrato tenga al menos 1 servicio/licencia antes de activar
   - ❌ No valida que haya usuarios vinculados antes de enviar a firma
   - ❌ No valida que las fechas sean coherentes

---

## Estados de Contrato

### Definición de Estados (backend/contratos/estados_modelo.py)

```python
ESTADOS_CONTRATO = [
    ('borrador', 'Borrador'),      # Estado inicial
    ('activo', 'Activo'),          # Contrato vigente
    ('suspendido', 'Suspendido'),  # Temporalmente inactivo
    ('finalizado', 'Finalizado')   # Terminado
]
```

### Ciclo de Vida Esperado

```
┌─────────────┐
│  BORRADOR   │  ← Estado inicial al crear contrato
└──────┬──────┘
       │
       │ (1) Completar información
       │ (2) Agregar servicios/licencias
       │ (3) Vincular usuarios
       │ (4) Vincular acuerdos de confidencialidad
       │ (5) Validar fechas
       │
       ▼
┌─────────────┐
│   ACTIVO    │  ← Contrato aprobado y vigente
└──────┬──────┘
       │
       ├─────────────────────┐
       │                     │
       │ (Opcional)          │ (Fin de vigencia)
       ▼                     ▼
┌─────────────┐        ┌─────────────┐
│ SUSPENDIDO  │        │ FINALIZADO  │
└──────┬──────┘        └─────────────┘
       │
       │ (Reactivar)
       ▼
┌─────────────┐
│   ACTIVO    │
└─────────────┘
```

### Reglas de Negocio por Estado

#### BORRADOR
**Permisos**:
- ✅ Editar todos los campos
- ✅ Agregar/eliminar servicios, licencias, visitas
- ✅ Agregar/eliminar usuarios vinculados
- ✅ Agregar/eliminar condiciones especiales
- ✅ Cambiar a ACTIVO (si cumple validaciones)

**Validaciones para pasar a ACTIVO**:
- ❌ **FALTA IMPLEMENTAR**: Debe tener al menos 1 servicio o licencia
- ❌ **FALTA IMPLEMENTAR**: Debe tener al menos 1 usuario vinculado
- ❌ **FALTA IMPLEMENTAR**: Debe tener acuerdo de confidencialidad (si es requerido por política)
- ❌ **FALTA IMPLEMENTAR**: Fecha de inicio debe ser válida

**Restricciones**:
- ❌ No se pueden crear Órdenes de Trabajo desde contrato en borrador
- ❌ No se pueden generar facturas

---

#### ACTIVO
**Permisos**:
- ⚠️ Edición limitada (solo observaciones, fechas de fin)
- ❌ **NO PERMITIDO**: Cambiar empresa prestadora/cliente
- ❌ **NO PERMITIDO**: Eliminar servicios ya facturados
- ⚠️ Agregar nuevos servicios/licencias (con aprobación)
- ⚠️ Reducir licencias (solo en ventanas permitidas)
- ✅ Cambiar a SUSPENDIDO
- ✅ Cambiar a FINALIZADO (si fecha_fin alcanzada)

**Automatizaciones**:
- ✅ `actualizar_estado()` en `save()` cambia a FINALIZADO si `fecha_fin < hoy`
- ⚠️ **FALTA**: Notificar a usuarios cuando cambia de estado
- ⚠️ **FALTA**: Crear eventos de calendario para visitas programadas

**Operaciones Permitidas**:
- ✅ Generar Órdenes de Trabajo
- ✅ Generar facturas
- ✅ Registrar visitas realizadas
- ✅ Asignar recursos a OT

---

#### SUSPENDIDO
**Motivos comunes**:
- Impago por parte del cliente
- Incumplimiento de términos contractuales
- Solicitud temporal del cliente
- Mantenimiento programado

**Permisos**:
- ❌ **NO PERMITIDO**: Crear nuevas OT
- ❌ **NO PERMITIDO**: Facturar servicios
- ✅ Ver historial y documentos
- ✅ Reactivar (cambiar a ACTIVO)
- ✅ Finalizar (cambiar a FINALIZADO)

**Efectos**:
- ⚠️ **FALTA**: Pausar facturación automática
- ⚠️ **FALTA**: Notificar a técnicos asignados
- ⚠️ **FALTA**: Cancelar visitas futuras programadas

---

#### FINALIZADO
**Motivos**:
- Fecha de fin alcanzada (automático)
- Terminación anticipada (manual)
- Incumplimiento grave

**Permisos**:
- ❌ **NO PERMITIDO**: Editar nada (solo consulta)
- ✅ Ver historial completo
- ✅ Generar reportes finales
- ❌ No se puede reactivar (crear nuevo contrato si es necesario)

**Datos Preservados**:
- ✅ Historial de cambios (django-simple-history)
- ✅ Documentos generados
- ✅ Acuerdos firmados

---

## Flujo Esperado vs Realidad

### Flujo Esperado (Ideal)

```
USUARIO CREA CONTRATO
│
├─ 1. Formulario de Creación
│  ├─ Empresa prestadora
│  ├─ Empresa cliente  
│  ├─ Tipo de contrato
│  ├─ Fechas
│  └─ Nombre
│
├─ 2. Agregar Servicios/Licencias
│  ├─ Seleccionar servicios del catálogo
│  ├─ Definir cantidad y precio
│  └─ Agregar planes completos
│
├─ 3. Configurar Detalles
│  ├─ Visitas programadas
│  ├─ Condiciones especiales
│  └─ Acuerdos de confidencialidad
│
├─ 4. Vincular Usuarios
│  ├─ Seleccionar usuarios del cliente
│  ├─ Asignar roles (jefatura, finanzas, etc.)
│  └─ Definir quién firma
│
├─ 5. Revisión y Validación
│  ├─ Verificar que todo esté completo
│  ├─ Ver resumen del contrato
│  └─ Pre-visualizar PDF
│
├─ 6. Activar Contrato
│  ├─ Cambiar de BORRADOR → ACTIVO
│  ├─ Generar PDF final
│  └─ Enviar a firma electrónica
│
├─ 7. Operación
│  ├─ Crear Órdenes de Trabajo
│  ├─ Registrar visitas
│  ├─ Generar facturas
│  └─ Monitorear cumplimiento
│
└─ 8. Finalización
   ├─ Cambiar a FINALIZADO (automático o manual)
   ├─ Generar reporte final
   └─ Archivar documentos
```

---

### Flujo Actual (Realidad)

```
USUARIO CREA CONTRATO
│
├─ 1. Django Admin - Crear Contrato
│  ├─ ✅ Llenar campos básicos
│  ├─ ✅ Guardar (queda en BORRADOR)
│  └─ ⚠️ NO HAY WIZARD, es un formulario largo
│
├─ 2. Agregar Servicios/Planes (Inline)
│  ├─ ✅ Agregar servicios vía ContratoServicio inline
│  ├─ ✅ Definir cantidad y precio
│  └─ ❌ NO SE PUEDE desde frontend fácilmente
│
├─ 3. Agregar Licencias (Inline)
│  ├─ ✅ Vincular licencias
│  ├─ ✅ Configurar modalidad, cantidad, precio
│  └─ ❌ NO HAY VALIDACIÓN de ventanas de reducción en UI
│
├─ 4. Agregar Visitas, Condiciones, Usuarios (Inlines)
│  ├─ ✅ Funciona en Django Admin
│  └─ ⚠️ En frontend es limitado
│
├─ 5. Acuerdos de Confidencialidad
│  ├─ ✅ Seleccionar de dropdown (ahora con seed)
│  └─ ❌ NO HAY preview del contenido del acuerdo
│
├─ 6. ❌ NO HAY PASO DE ACTIVACIÓN
│  ├─ Estado queda en BORRADOR permanentemente
│  ├─ No hay botón "Activar Contrato"
│  └─ No hay validaciones previas
│
├─ 7. ⚠️ Operación Limitada
│  ├─ ✅ Ver contrato en frontend
│  ├─ ✅ Editar campos básicos
│  ├─ ❌ Botón "Detalles" no hace nada
│  └─ ❌ No hay botón "Generar PDF"
│
└─ 8. ⚠️ Finalización Manual
   ├─ Django Admin → Action "Marcar como finalizado"
   ├─ O automático si fecha_fin < hoy
   └─ ❌ No hay UI para finalizar desde frontend
```

---

## Funcionalidades Faltantes

### 1. Gestión de Estados (CRÍTICO)

**Problema**: No hay forma de cambiar el estado del contrato desde el frontend.

**Impacto**: 
- Contratos quedan en "Borrador" indefinidamente
- No se puede distinguir contratos activos de borradores
- No se puede suspender o finalizar contratos desde UI

**Solución Propuesta**:

#### Backend (Django)
```python
# backend/contratos/views.py

@action(detail=True, methods=['post'], url_path='cambiar-estado')
def cambiar_estado(self, request, pk=None):
    """
    Cambia el estado del contrato con validaciones.
    
    Body:
    {
        "nuevo_estado": "activo",  # borrador, activo, suspendido, finalizado
        "motivo": "Aprobado por gerencia"  # Opcional
    }
    """
    contrato = self.get_object()
    nuevo_estado = request.data.get('nuevo_estado')
    motivo = request.data.get('motivo', '')
    
    # Validar transición de estados
    if not self._validar_transicion(contrato.estado, nuevo_estado):
        return Response(
            {"error": f"No se puede cambiar de {contrato.estado} a {nuevo_estado}"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validaciones específicas por estado destino
    if nuevo_estado == 'activo':
        errores = []
        
        # Debe tener al menos 1 servicio o licencia
        if not contrato.contrato_servicios.exists() and not contrato.contrato_licencias.exists():
            errores.append("Debe tener al menos un servicio o licencia")
        
        # Debe tener al menos 1 usuario vinculado
        if not contrato.vinculos_contrato.exists():
            errores.append("Debe tener al menos un usuario vinculado")
        
        # Fecha de inicio debe ser válida
        if contrato.fecha_inicio > date.today():
            errores.append("La fecha de inicio no puede estar en el futuro")
        
        if errores:
            return Response(
                {"errores": errores},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Cambiar estado
    contrato.estado = nuevo_estado
    contrato.save()
    
    # Registrar en historial (opcional)
    # CambioEstadoContrato.objects.create(
    #     contrato=contrato,
    #     estado_anterior=contrato.estado,
    #     estado_nuevo=nuevo_estado,
    #     motivo=motivo,
    #     usuario=request.user
    # )
    
    return Response({
        "success": True,
        "estado_anterior": contrato.historia.latest().estado if contrato.historia.exists() else None,
        "estado_actual": contrato.estado,
        "mensaje": f"Contrato cambiado a {contrato.get_estado_display()}"
    })

def _validar_transicion(self, estado_actual, estado_nuevo):
    """
    Valida que la transición de estado sea permitida.
    
    Transiciones permitidas:
    - borrador → activo
    - activo → suspendido
    - activo → finalizado
    - suspendido → activo
    - suspendido → finalizado
    """
    transiciones_permitidas = {
        'borrador': ['activo'],
        'activo': ['suspendido', 'finalizado'],
        'suspendido': ['activo', 'finalizado'],
        'finalizado': []  # Estado final, no puede cambiar
    }
    
    return estado_nuevo in transiciones_permitidas.get(estado_actual, [])
```

#### Frontend (React)
```tsx
// frontend/src/pages/Contratos/ContratosDelCliente.tsx

const handleCambiarEstado = async (nuevoEstado: string) => {
    if (!detalleContratoEmpresaCliente?.id) return;
    
    try {
        const response = await ApiService.post(
            `/contratos/${detalleContratoEmpresaCliente.id}/cambiar-estado/`,
            {
                nuevo_estado: nuevoEstado,
                motivo: `Cambio manual desde UI`
            }
        );
        
        toast.success(response.data.mensaje);
        
        // Recargar detalle del contrato
        dispatch(detalleContratoEmpresaClienteThunk({ id: detalleContratoEmpresaCliente.id }));
    } catch (error: any) {
        if (error.response?.data?.errores) {
            toast.error(`Errores: ${error.response.data.errores.join(', ')}`);
        } else {
            toast.error(error.response?.data?.error || 'Error al cambiar estado');
        }
    }
};

// En el JSX, agregar botones según estado actual
{!editando && (
    <div className="flex gap-2">
        {detalleContratoEmpresaCliente.estado === 'borrador' && (
            <Button
                variant="solid"
                color="emerald"
                icon="HeroCheck"
                onClick={() => handleCambiarEstado('activo')}
            >
                Activar Contrato
            </Button>
        )}
        
        {detalleContratoEmpresaCliente.estado === 'activo' && (
            <>
                <Button
                    variant="solid"
                    color="amber"
                    icon="HeroPause"
                    onClick={() => handleCambiarEstado('suspendido')}
                >
                    Suspender
                </Button>
                <Button
                    variant="solid"
                    color="red"
                    icon="HeroXMark"
                    onClick={() => handleCambiarEstado('finalizado')}
                >
                    Finalizar
                </Button>
            </>
        )}
        
        {detalleContratoEmpresaCliente.estado === 'suspendido' && (
            <>
                <Button
                    variant="solid"
                    color="emerald"
                    icon="HeroPlay"
                    onClick={() => handleCambiarEstado('activo')}
                >
                    Reactivar
                </Button>
                <Button
                    variant="solid"
                    color="red"
                    icon="HeroXMark"
                    onClick={() => handleCambiarEstado('finalizado')}
                >
                    Finalizar
                </Button>
            </>
        )}
    </div>
)}
```

---

### 2. Modal de Detalles de Servicio/Plan (IMPORTANTE)

**Problema**: Botones "Detalles" (líneas 411 y 428) no tienen `onClick`.

**Impacto**:
- No se pueden ver las características de un servicio
- No se pueden ver los servicios incluidos en un plan
- Información limitada en la vista de carrusel

**Solución Propuesta**:

```tsx
// frontend/src/pages/Contratos/modals/DetalleServicioPlan.tsx

import { useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface IDetalleServicioPlanProps {
    contratoServicio: any;  // Tipo del contrato_servicio
    isServicio: boolean;    // true = Servicio, false = Plan
}

export default function DetalleServicioPlan({ contratoServicio, isServicio }: IDetalleServicioPlanProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <>
            <Button variant="outline" onClick={() => setIsOpen(true)}>
                Detalles
            </Button>
            
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop size="xl">
                <ModalHeader className="flex items-center gap-2">
                    {isServicio ? (
                        <span className="text-blue-500">Detalles del Servicio</span>
                    ) : (
                        <span className="text-emerald-500">Detalles del Plan</span>
                    )}
                </ModalHeader>
                
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <div className="font-bold text-lg">{contratoServicio.nombre}</div>
                            <div className="text-sm text-zinc-500">ID: {contratoServicio.id}</div>
                        </div>
                        
                        {isServicio ? (
                            <>
                                <div>
                                    <span className="font-bold">Categoría:</span> {contratoServicio.servicio_generico.categoria_label}
                                </div>
                                
                                {contratoServicio.servicio_generico.descripcion && (
                                    <div>
                                        <span className="font-bold">Descripción:</span>
                                        <p className="mt-1">{contratoServicio.servicio_generico.descripcion}</p>
                                    </div>
                                )}
                                
                                {contratoServicio.servicio_generico.caracteristicas && contratoServicio.servicio_generico.caracteristicas.length > 0 && (
                                    <div>
                                        <span className="font-bold">Características:</span>
                                        <ul className="list-disc list-inside mt-2">
                                            {contratoServicio.servicio_generico.caracteristicas.map((caract: any) => (
                                                <li key={caract.id}>
                                                    <span className="font-semibold">{caract.nombre}</span>
                                                    {caract.descripcion && (
                                                        <p className="ml-6 text-sm text-zinc-600">{caract.descripcion}</p>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {contratoServicio.servicio_generico.descripcion && (
                                    <div>
                                        <span className="font-bold">Descripción:</span>
                                        <p className="mt-1">{contratoServicio.servicio_generico.descripcion}</p>
                                    </div>
                                )}
                                
                                {contratoServicio.servicio_generico.servicios && contratoServicio.servicio_generico.servicios.length > 0 && (
                                    <div>
                                        <span className="font-bold">Servicios Incluidos:</span>
                                        <ul className="list-disc list-inside mt-2">
                                            {contratoServicio.servicio_generico.servicios.map((serv: any) => (
                                                <li key={serv.id}>
                                                    <span className="font-semibold">{serv.nombre}</span> 
                                                    <span className="text-sm text-zinc-500"> ({serv.categoria_label})</span>
                                                    {serv.descripcion && (
                                                        <p className="ml-6 text-sm text-zinc-600">{serv.descripcion}</p>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}
                        
                        <div className="border-t pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="font-bold">Cantidad:</span> {contratoServicio.cantidad}
                                </div>
                                <div>
                                    <span className="font-bold">Precio Unitario:</span> ${Number(contratoServicio.precio_unitario).toLocaleString()}
                                </div>
                                <div className="col-span-2">
                                    <span className="font-bold text-lg">Total:</span> 
                                    <span className="text-lg font-semibold text-emerald-600"> ${(Number(contratoServicio.precio_unitario) * contratoServicio.cantidad).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalBody>
                
                <ModalFooter>
                    <Button variant="solid" onClick={() => setIsOpen(false)}>
                        Cerrar
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
}
```

Luego usar el componente en ContratosDelCliente.tsx:

```tsx
// Reemplazar los botones sin funcionalidad
import DetalleServicioPlan from './modals/DetalleServicioPlan';

// En el render del servicio (línea 411):
<DetalleServicioPlan 
    contratoServicio={contServ} 
    isServicio={true} 
/>

// En el render del plan (línea 428):
<DetalleServicioPlan 
    contratoServicio={contServ} 
    isServicio={false} 
/>
```

---

### 3. Generación de PDF (IMPORTANTE)

**Problema**: Existe endpoint `/pdf` en backend pero no hay botón en frontend.

**Backend**: Ya implementado (línea 347 de views.py)

**Solución Frontend**:

```tsx
// frontend/src/pages/Contratos/ContratosDelCliente.tsx

const handleGenerarPDF = async () => {
    if (!detalleContratoEmpresaCliente?.id) return;
    
    try {
        // Llamar al endpoint de PDF
        const response = await ApiService.get(
            `/contratos/${detalleContratoEmpresaCliente.id}/pdf/`,
            { responseType: 'blob' }  // Importante para recibir PDF
        );
        
        // Crear URL para el blob
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        
        // Abrir en nueva pestaña o descargar
        const link = document.createElement('a');
        link.href = url;
        link.download = `Contrato_${detalleContratoEmpresaCliente.nombre}_${detalleContratoEmpresaCliente.id}.pdf`;
        link.click();
        
        // Limpiar
        window.URL.revokeObjectURL(url);
        
        toast.success('PDF generado correctamente');
    } catch (error) {
        toast.error('Error al generar PDF');
        console.error(error);
    }
};

// Agregar botón en la UI
<Button
    variant="solid"
    color="blue"
    icon="HeroDocumentText"
    onClick={handleGenerarPDF}
>
    Generar PDF
</Button>
```

---

### 4. Envío de Contrato para Firma (AVANZADO)

**Modelo Existente**:
```python
class EnvioContratoFirmaUsuario(ModeloBase):
    firma = TextField(blank=True, null=True)
    fecha_firma = DateTimeField(blank=True, null=True)
    firmado = BooleanField(default=False)
    fecha_envio = DateTimeField(blank=True, null=True)
    enviado = BooleanField(default=False)
    uuid = UUIDField(unique=True, default=uuid.uuid4)
    usuario = ForeignKey(UsuarioVinculadoContrato, on_delete=CASCADE)
```

**Flujo Propuesto**:

1. Botón "Enviar a Firma" (solo en estado BORRADOR o ACTIVO)
2. Seleccionar usuarios del contrato que deben firmar
3. Generar UUID único por cada envío
4. Enviar email con link: `https://erp.com/contrato/firma/{uuid}/`
5. Usuario accede al link, ve el contrato, firma digitalmente
6. Al firmar, se registra en `EnvioContratoFirmaUsuario`
7. Cuando todos firman, contrato puede activarse

**Implementación**:
- ⚠️ Requiere integración con servicio de firma electrónica (DocuSign, Adobe Sign)
- ⚠️ O implementar firma simple con canvas HTML5
- ⚠️ Requiere sistema de emails transaccionales

---

## Botones Sin Implementar

### Resumen de Botones "Fantasma"

| Ubicación | Botón | Estado Actual | Acción Esperada |
|-----------|-------|---------------|-----------------|
| Carrusel Servicios (línea 411) | "Detalles" | Sin onClick | Abrir modal con características del servicio |
| Carrusel Planes (línea 428) | "Detalles" | Sin onClick | Abrir modal con servicios incluidos en el plan |
| Header Contrato | "Activar Contrato" | No existe | Cambiar estado borrador → activo |
| Header Contrato | "Suspender Contrato" | No existe | Cambiar estado activo → suspendido |
| Header Contrato | "Finalizar Contrato" | No existe | Cambiar estado activo/suspendido → finalizado |
| Header Contrato | "Generar PDF" | No existe | Descargar PDF del contrato |
| Header Contrato | "Enviar a Firma" | No existe | Iniciar flujo de firma electrónica |
| Sección Licencias | "Ver Usuarios Asignados" | No existe | Mostrar usuarios con acceso a cada licencia |
| Footer Contrato | "Ver Historial" | No existe | Timeline de cambios (django-simple-history) |

---

## Propuestas de Mejora

### Corto Plazo (1-2 semanas)

#### 1. ✅ Implementar Cambio de Estados (PRIORIDAD 1)
- Backend: Endpoint `cambiar-estado` con validaciones
- Frontend: Botones condicionales según estado actual
- Validaciones: Servicios, usuarios, fechas

**Estimación**: 8 horas
**Impacto**: ALTO - Permite flujo completo del contrato

---

#### 2. ✅ Modal de Detalles de Servicio/Plan (PRIORIDAD 2)
- Componente DetalleServicioPlan.tsx
- Mostrar características (servicios)
- Mostrar servicios incluidos (planes)
- Calcular total (cantidad × precio)

**Estimación**: 4 horas
**Impacto**: MEDIO - Mejora UX significativamente

---

#### 3. ✅ Botón Generar PDF (PRIORIDAD 3)
- Integrar endpoint existente `/pdf`
- Botón en header del contrato
- Descargar o abrir en nueva pestaña

**Estimación**: 2 horas
**Impacto**: MEDIO - Feature muy solicitada

---

### Mediano Plazo (1 mes)

#### 4. ⚠️ Wizard de Creación de Contratos
- Multi-step form en frontend
- Paso 1: Datos básicos
- Paso 2: Servicios/Licencias
- Paso 3: Visitas y Condiciones
- Paso 4: Usuarios vinculados
- Paso 5: Acuerdos de confidencialidad
- Paso 6: Revisión y activación

**Estimación**: 20 horas
**Impacto**: ALTO - Simplifica enormemente la creación

---

#### 5. ⚠️ Validaciones de Negocio
- Implementar reglas por estado
- Prevenir eliminación de servicios facturados
- Validar ventanas de reducción de licencias
- Alertas de contratos próximos a vencer

**Estimación**: 12 horas
**Impacto**: ALTO - Previene errores de negocio

---

#### 6. ⚠️ Timeline de Historial
- Integrar django-simple-history en frontend
- Componente Timeline
- Mostrar quién, cuándo, qué cambió
- Diff visual de cambios

**Estimación**: 10 horas
**Impacto**: MEDIO - Auditoría y trazabilidad

---

### Largo Plazo (3+ meses)

#### 7. ⚠️ Firma Electrónica
- Integración con DocuSign/Adobe Sign
- O implementar firma con canvas HTML5
- Flujo completo de envío y tracking
- Almacenar PDFs firmados

**Estimación**: 40 horas
**Impacto**: MUY ALTO - Feature empresarial crítica

---

#### 8. ⚠️ Facturación Automática desde Contratos
- Generar facturas mensuales/anuales
- Basado en servicios y licencias activos
- Integración con módulo de facturación
- Alertas de pagos pendientes

**Estimación**: 30 horas
**Impacto**: MUY ALTO - Automatización de procesos

---

#### 9. ⚠️ Dashboard de Contratos
- Resumen ejecutivo (activos, por vencer, suspendidos)
- Gráficos de ingresos por tipo de contrato
- Alertas de renovaciones
- KPIs de cumplimiento

**Estimación**: 25 horas
**Impacto**: ALTO - Visibilidad gerencial

---

## Roadmap de Implementación

### Sprint 1 (Semana 1-2) - Funcionalidad Base

**Objetivo**: Completar flujo mínimo viable

- [x] ~~Seed de acuerdos de confidencialidad~~ (COMPLETADO)
- [ ] Endpoint cambiar-estado con validaciones
- [ ] Botones de cambio de estado en frontend
- [ ] Modal de detalles de servicio/plan
- [ ] Botón generar PDF

**Entregables**:
- Contratos pueden pasar de BORRADOR → ACTIVO
- Usuarios pueden ver detalles completos de servicios
- Usuarios pueden descargar PDF del contrato

---

### Sprint 2 (Semana 3-4) - Validaciones y UX

**Objetivo**: Prevenir errores y mejorar experiencia

- [ ] Validaciones de negocio por estado
- [ ] Confirmaciones al cambiar estado (modals)
- [ ] Alertas de validaciones faltantes
- [ ] Mensajes de error descriptivos
- [ ] Tooltips explicativos

**Entregables**:
- Sistema previene creación de contratos inválidos
- UX clara con feedback inmediato

---

### Sprint 3 (Mes 2) - Wizard y Automatizaciones

**Objetivo**: Simplificar creación y automatizar procesos

- [ ] Wizard multi-paso para crear contratos
- [ ] Pre-carga de datos desde contratos anteriores
- [ ] Templates de contratos comunes
- [ ] Automatización: cambio a FINALIZADO al vencer
- [ ] Notificaciones por email de cambios de estado

**Entregables**:
- Creación de contratos 3x más rápida
- Menos errores humanos
- Usuarios notificados automáticamente

---

### Sprint 4+ (Mes 3+) - Features Avanzadas

**Objetivo**: Firma electrónica, facturación, analytics

- [ ] Integración firma electrónica
- [ ] Generación automática de facturas
- [ ] Dashboard ejecutivo
- [ ] Timeline de historial
- [ ] Reportes de cumplimiento

**Entregables**:
- Sistema completamente automatizado
- Visibilidad gerencial completa
- Cumplimiento regulatorio

---

## Conclusión

### Estado Actual (Resumen)

**Lo que funciona** ✅:
- Creación y edición básica de contratos
- Vinculación de servicios, licencias, visitas, condiciones, usuarios
- Acuerdos de confidencialidad
- Visualización en frontend

**Lo que falta** ❌:
- **Gestión de estados** (CRÍTICO)
- Detalles de servicios/planes
- Generación de PDF desde frontend
- Firma electrónica
- Validaciones de negocio
- Historial visual
- Wizard de creación

### Próximos Pasos Inmediatos

**Para el usuario**:
1. Seguir usando Django Admin para crear contratos
2. Agregar todos los servicios/licencias necesarios
3. Vincular usuarios y acuerdos de confidencialidad
4. **Cambiar estado manualmente en el dropdown del admin** (temporal)

**Para el desarrollador**:
1. Implementar endpoint `cambiar-estado` (backend)
2. Agregar botones de cambio de estado (frontend)
3. Implementar modal de detalles de servicio/plan
4. Conectar botón generar PDF

**Estimación total (funcionalidades críticas)**: ~14 horas de desarrollo

---

### Pregunta Respondida

**"¿Ahora qué? El estado sigue en borrador y no veo botón para avanzar"**

**Respuesta**:
- ✅ Es correcto, el sistema actualmente **NO tiene** botones para cambiar de estado en el frontend
- ✅ El botón "Detalles" efectivamente **no hace nada** (sin implementar)
- ⚠️ Para cambiar de estado ahora: Django Admin → editar contrato → cambiar dropdown "Estado" → guardar
- ⚠️ O usar action "Marcar como finalizado" en la lista de contratos del admin

**Lo que debes implementar**:
1. **Endpoint de cambio de estado** (backend) - 4 horas
2. **Botones condicionales por estado** (frontend) - 3 horas
3. **Modal de detalles** (frontend) - 4 horas
4. **Botón generar PDF** (frontend) - 2 horas

**Total**: ~13-14 horas para funcionalidad completa

---

**Documentado por**: Sistema de IA  
**Fecha**: 2025-11-07  
**Versión**: 1.0  
**Estado**: Análisis completo y propuestas de implementación
