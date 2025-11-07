# Exploración: Módulo de Contratos

**Fecha**: 2025-11-07  
**Estado**: Exploración activa  
**Módulo**: `contratos` (Backend) + `Contratos` (Frontend)  
**Objetivo**: Entender el flujo completo de creación y configuración de contratos, desde el contrato base hasta su estado "válido" para facturación.

---

## 1. Contexto de la Exploración

### 1.1. ¿Qué descubriste?

Has identificado correctamente el flujo de navegación:

```
1. Módulo "Empresas" → 
2. Seleccionar Cliente (en submódulo "Clientes") → 
3. Tab "Contratos" → 
4. Botón "Crear" → 
5. Modal de creación → 
6. Vista de detalles del contrato
```

### 1.2. Estado actual

Creaste un contrato con los datos mínimos:
- **Nombre**: (el que asignaste)
- **Tipo**: (servicio/licencia/otro)
- **Fecha inicio**: 07/11/2025
- **Fecha fin**: 07/12/2025
- **Descripción**: (la que escribiste)

**Estado del contrato**: `borrador` (draft)  
**Válido para facturación**: ❌ NO (aún falta configuración)

### 1.3. ⚠️ Problema detectado: Lista de servicios/planes vacía

Al intentar agregar servicios o planes al contrato, la lista de opciones aparece **vacía**. Esto se debe a que:

**Causa**: La base de datos no tiene servicios ni planes de servicio creados.

**Solución**: Ejecutar el script `seed_servicios.py` que crea datos de ejemplo:

```cmd
backend\ENV\Scripts\python.exe scripts\setup\seed_servicios.py
```

Este script crea:
- 5 tipos de servicio (Instalación, Mantenimiento, Soporte, Reparación, Consultoría)
- 7 servicios individuales con precios de referencia
- 5 características de servicio
- 3 planes de servicio (paquetes con múltiples servicios)

**Después de ejecutar el script**, la lista desplegable mostrará opciones bajo dos categorías:
- "Servicios" → servicios individuales
- "Planes" → paquetes de servicios

---

## 2. Anatomía de un Contrato: Modelo de Datos

### 2.1. Contrato Base (`ContratoEmpresaCliente`)

Es el modelo principal que acabas de crear:

```python
# backend/contratos/models.py
class ContratoEmpresaCliente(ModeloBaseHistorico):
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TIPO_CONTRATO)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CONTRATO, default='borrador')
    observaciones = models.TextField(blank=True)
    
    # RELACIONES CLAVE
    empresa_prestadora = models.ForeignKey(Empresa)  # Tu empresa
    empresa_cliente = models.ForeignKey(Empresa)      # El cliente
    
    # RELACIONES MANY-TO-MANY (mediante tablas intermedias)
    servicios_genericos → ContratoServicio
    visitas → ContratoVisita
    licencias → ContratoLicencia
    condiciones_especiales → ContratoCondicionEspecial
    usuarios_vinculados → UsuarioVinculadoContrato
```

**Estados posibles**:
- `borrador`: Recién creado, en configuración
- `activo`: Configurado y firmado, opera normalmente
- `suspendido`: Pausado temporalmente
- `finalizado`: Terminado (por fecha o cancelación)

### 2.2. Tipos de Contrato

El campo `tipo` determina qué secciones aparecen en la vista de detalles:

```python
TIPO_CONTRATO = [
    ('servicios', 'Servicios'),      # Muestra: Servicios/Planes + Visitas
    ('licencia', 'Licencias'),       # Muestra: Servicios/Planes + Licencias
    ('proyecto', 'Proyecto'),        # Contrato por proyecto único
    ('otros', 'Otros')               # Genérico
]
```

En tu caso, si elegiste **"servicios"**, verás las secciones de:
- ✅ Servicios y Planes Contratados
- ✅ Visitas Programadas
- ❌ Licencias (solo si tipo = "licencia")

### 2.3. Relaciones del Contrato (Tablas Intermedias)

Un contrato **NO ES VÁLIDO** hasta que tenga al menos:

1. **Servicios/Planes** (1+ registros en `ContratoServicio`)
2. **Usuarios Vinculados** (1+ registros en `UsuarioVinculadoContrato`)
3. **Acuerdos de Confidencialidad** (1+ registros en `AcuerdoConfidencialidadContrato`)
4. **Estado** = `activo`

#### a) ContratoServicio (Servicios y Planes)

```python
class ContratoServicio(ModeloBaseHistorico):
    contrato = FK(ContratoEmpresaCliente)
    content_type = FK(ContentType)  # Apunta a "Servicio" o "PlanServicio"
    object_id = PositiveIntegerField()
    servicio_generico = GenericForeignKey()  # Polimórfico
    
    cantidad = IntegerField(default=1)
    precio_unitario = DecimalField(default=0)
```

**Propósito**: Define QUÉ servicios o paquetes están incluidos en el contrato.

**Ejemplo real**:
```
- Servicio: "Soporte Remoto" → 10 tickets/mes
- Plan: "Paquete Empresa" → incluye 5 servicios predefinidos
```

#### b) ContratoVisita (Visitas Programadas)

```python
class ContratoVisita(ModeloBaseHistorico):
    contrato = FK(ContratoEmpresaCliente)
    visita = FK(Visita)  # Catálogo de tipos de visita
    
    frecuencia = CharField(choices=FRECUENCIA)  # mensual/quincenal/semanal/diaria
    cantidad = IntegerField(default=1)
```

**Propósito**: Define CUÁNTAS visitas están incluidas en el contrato por período.

**Ejemplo real**:
```
- Visita: "Mantenimiento Preventivo" → 2/mes
- Visita: "Auditoría de Seguridad" → 1/trimestre
```

**⚠️ CLAVE PARA FACTURACIÓN**: Si una OT tiene `tipo_trabajo='visita_terreno'` y se ejecutan **3 visitas** pero el contrato solo incluye **2**, la 3ra visita es **EXTRA** y debe facturarse aparte.

#### c) ContratoLicencia (Licencias de Software)

```python
class ContratoLicencia(ModeloBaseHistorico):
    contrato = FK(ContratoEmpresaCliente)
    licencia = FK(Licencia)  # Catálogo de licencias
    
    tipo_modalidad = CharField()  # anual/mensual/perpetua/otros
    cantidad = IntegerField()
    precio_unitario = DecimalField()
    fecha_inicio = DateField()
    fecha_fin = DateField()
    tipo_moneda = CharField()  # USD/CLP/EUR
    
    # WINDOWING (ventanas de edición)
    @property
    def inicio_periodo_actual(self):
        """Calcula inicio de la ventana de edición actual"""
        # Lógica compleja basada en tipo_modalidad
        
    @property
    def puede_reducir(self):
        """Solo se puede reducir cantidad dentro de la ventana"""
```

**Propósito**: Gestionar licencias con lógica de "windowing" (solo se puede reducir cantidad en ciertas fechas).

**Ejemplo real**:
```
- Licencia: "Office 365 E3" → 50 usuarios × $12 USD/mes
  - Ventana actual: 01/11/2025 - 30/11/2025
  - Puede reducir: ✅ (estamos en la ventana)
  - Días restantes: 23 días
```

#### d) UsuarioVinculadoContrato (Usuarios del Contrato)

```python
class UsuarioVinculadoContrato(ModeloBaseHistorico):
    usuario = FK(UsuarioEmpresa)
    contrato = FK(ContratoEmpresaCliente)
    
    tipo_usuario = CharField(choices=TIPOS_USUARIO)  
    # gerencia/finanzas/operaciones/general
    fecha_vinculacion = DateField(auto_now_add=True)
```

**Propósito**: Define QUIÉN tiene acceso/responsabilidad sobre el contrato.

**Relación con Firma Digital**:
- Cuando vinculas un usuario, puedes enviarle el contrato para firma digital.
- El sistema crea un `EnvioContratoFirmaUsuario` con un UUID único.
- El usuario recibe un correo con link: `https://app.gestionsnabb-it.cl/firmar-contrato/{uuid}`

#### e) AcuerdoConfidencialidadContrato (NDA/Cláusulas)

```python
class AcuerdoConfidencialidadContrato(ModeloBaseHistorico):
    contrato = FK(ContratoEmpresaCliente)
    acuerdo_base = FK(AcuerdoConfidencialidadBase)  # Plantilla de acuerdo
```

**Propósito**: Vincular cláusulas de confidencialidad del catálogo al contrato específico.

---

## 3. Flujo de Configuración del Contrato (Paso a Paso)

### 3.1. Estado Actual (Borrador)

Tu contrato recién creado está en este estado:

```typescript
{
  id: X,
  nombre: "Tu Nombre",
  estado: "borrador",
  tipo: "servicios",  // o el que elegiste
  fecha_inicio: "2025-11-07",
  fecha_fin: "2025-12-07",
  
  // ❌ VACÍOS (por eso no es válido)
  contrato_servicios: [],
  contrato_visitas: [],
  vinculos_contrato: [],
  firmas_confidencialidad: [],
  
  // PROPIEDAD CALCULADA
  valido: false  // ← Falla validación
}
```

### 3.2. Pasos para Completar el Contrato

#### **PASO 1: Agregar Servicios/Planes**

En la vista de detalles del contrato, verás la sección "Servicios y Planes Contratados":

```tsx
// frontend/src/pages/Contratos/ContratosDelCliente.tsx
<CardHeader>
    <div>Servicios y Planes Contratados</div>
    <AgregarServiciosyPlanesContrato />  ← MODAL
</CardHeader>
```

**Acciones**:
1. Click en el botón "Agregar" (o similar, depende del diseño del modal)
2. Se abre modal que permite:
   - Seleccionar **Servicios** del catálogo (`Servicio` model)
   - O seleccionar **Planes** del catálogo (`PlanServicio` model)
   - Especificar **cantidad** y **precio unitario**

**Llamada API**:
```http
PUT /api/contratos/{id}/editar-servicios-genericos/
Content-Type: application/json

{
  "servicios_genericos": [
    {
      "content_type": 45,  // ID de ContentType "servicio"
      "object_id": 12,     // ID del servicio específico
      "cantidad": 5,
      "precio_unitario": 15000
    },
    {
      "content_type": 46,  // ID de ContentType "planservicio"
      "object_id": 3,
      "cantidad": 1,
      "precio_unitario": 250000
    }
  ]
}
```

**Resultado**:
- Crea registros en `ContratoServicio`
- El contrato ahora tiene servicios asociados

#### **PASO 2: Agregar Visitas (solo si tipo = "servicios")**

Si tu contrato es tipo "servicios", aparece la sección "Visitas Programadas":

**Forma de agregar**:
- **Opción A**: Modo Edición
  1. Click botón "Editar Contrato"
  2. Scroll a sección "Visitas Programadas"
  3. Aparece selector de visitas del catálogo
  4. Seleccionar visita, especificar frecuencia y cantidad
  5. Click "Agregar"
  6. Guardar edición

**Llamada API** (al guardar):
```http
PUT /api/contratos/{id}/actualizar/
Content-Type: application/json

{
  "contrato": { ... },  // Datos básicos
  "visitas": [
    {
      "visita_id": 5,
      "frecuencia": "mensual",
      "cantidad": 2
    }
  ],
  "eliminar_visitas": []
}
```

#### **PASO 3: Agregar Licencias (solo si tipo = "licencia")**

Similar a visitas, pero con datos de modalidad, fechas y precio.

#### **PASO 4: Agregar Usuarios Vinculados**

En la sección "Usuarios Vinculados":

**Forma de agregar** (modo edición):
1. Click "Editar Contrato"
2. Scroll a "Usuarios Vinculados"
3. Selector muestra usuarios del cliente que NO están ya vinculados
4. Seleccionar usuario
5. Elegir tipo: `gerencia`, `finanzas`, `operaciones`, `general`
6. Click "Agregar"
7. Guardar

**Llamada API**:
```http
PUT /api/contratos/{id}/actualizar/

{
  "usuarios_vinculados": [
    {
      "usuario_id": 42,
      "tipo_usuario": "gerencia"
    }
  ],
  "eliminar_usuarios": []
}
```

**Resultado**:
- Crea registros en `UsuarioVinculadoContrato`
- Aparece botón de "Enviar para Firma" (icono de correo)

#### **PASO 5: Enviar Contrato para Firma Digital**

Una vez que hay usuarios vinculados:

**Acción**:
1. Click en botón "Crear Envío" (modal `CrearEnvioContratoFirmaUsuario`)
2. Seleccionar usuario(s) a quien enviar
3. Sistema envía correo con link único

**Backend** (`EnvioContratoFirmaUsuarioViewSet.create`):
```python
def create(self, request):
    # Crea EnvioContratoFirmaUsuario
    envio = serializer.save(enviado=True, fecha_envio=timezone.now())
    
    # Envía correo con Celery
    send_email_task.delay(
        subject="¡Tu contrato está listo para firmar!",
        recipient_list=[envio.usuario.usuario.usuario.email],
        url_boton=f"{FRONTEND_URL}/firmar-contrato/{envio.uuid}",
        text_boton="Firmar contrato ahora"
    )
```

**Flujo público de firma**:
```
1. Usuario recibe correo con link único
2. Click en link → Redirige a /firmar-contrato/{uuid}
3. GET /api/contratos/envio/{uuid}/acuerdos/ (vista pública, no autenticada)
4. Muestra acuerdos de confidencialidad del contrato
5. Usuario firma digitalmente
6. PATCH /api/contratos/envio/{uuid}/firmar/ (vista pública)
   Body: {
     "firma": "base64...",
     "fecha_firma": "2025-11-07T...",
     "firmado": true
   }
```

#### **PASO 6: Agregar Condiciones Especiales**

En modo edición, sección "Condiciones Especiales":

**Catálogo** (`CondicionEspecial`):
```python
# backend/contratos/models.py
class CondicionEspecial(ModeloBaseHistorico):
    titulo = CharField(max_length=200)
    descripcion = TextField()
```

Son plantillas reutilizables como:
- "Cláusula de Confidencialidad Estándar"
- "Penalización por Incumplimiento"
- "Renovación Automática"

**Forma de agregar**:
- Modo edición → Selector de condiciones → Agregar
- API: Similar a visitas/usuarios

#### **PASO 7: Cambiar Estado a "Activo"**

⚠️ **IMPORTANTE**: El estado NO se cambia manualmente en este flujo.

**Validación de contrato válido**:
```python
# backend/contratos/serializers.py
def get_valido(self, obj):
    # Estado activo
    if obj.estado != 'activo':
        return False
    # Al menos 1 acuerdo de confidencialidad
    if not obj.firmas_confidencialidad.exists():
        return False
    # Al menos 1 usuario vinculado
    if not obj.vinculos_contrato.exists():
        return False
    # Al menos 1 servicio
    if not obj.contrato_servicios.exists():
        return False
    return True
```

**Posible flujo futuro** (no implementado aún):
- Botón "Activar Contrato" que valida condiciones y cambia estado
- O validación automática al cumplir requisitos

---

## 4. Exploración Práctica Sugerida

### 4.1. Escenario de Prueba

Completa tu contrato actual siguiendo estos pasos:

```
┌─────────────────────────────────────────────────────────┐
│ ESCENARIO: Contrato de Soporte Técnico Mensual         │
└─────────────────────────────────────────────────────────┘

1. SERVICIOS (agregar 2):
   - Servicio: "Soporte Remoto" → 10 tickets × $15,000 c/u
   - Plan: "Paquete Básico" → 1 × $250,000

2. VISITAS (agregar 2):
   - Visita: "Mantenimiento Preventivo" → 2/mes
   - Visita: "Instalación de Software" → 1/mes

3. USUARIOS VINCULADOS (agregar 1):
   - Seleccionar un UsuarioEmpresa del cliente
   - Tipo: "gerencia"

4. CONDICIONES ESPECIALES (agregar 1):
   - Seleccionar cualquier condición del catálogo

5. FIRMAS:
   - Enviar a firma al usuario vinculado
   - Revisar correo enviado (logs de Celery si tienes acceso)

6. VALIDAR:
   - Verificar propiedad "valido" en la respuesta JSON
   - Confirmar si está listo para facturación
```

### 4.2. Comandos de Exploración (Backend)

```cmd
REM Desde backend/
REM Ver servicios disponibles en catálogo
backend\ENV\Scripts\python.exe manage.py shell
>>> from contratos.models import Servicio, PlanServicio
>>> Servicio.objects.all()
>>> PlanServicio.objects.all()

REM Ver visitas disponibles
>>> from contratos.models import Visita
>>> Visita.objects.all()

REM Ver condiciones especiales
>>> from contratos.models import CondicionEspecial
>>> CondicionEspecial.objects.all()

REM Ver tu contrato actual
>>> from contratos.models import ContratoEmpresaCliente
>>> contrato = ContratoEmpresaCliente.objects.last()
>>> contrato.nombre
>>> contrato.estado
>>> contrato.contrato_servicios.count()  # ¿Tiene servicios?
>>> contrato.vinculos_contrato.count()   # ¿Tiene usuarios?
```

### 4.3. Exploración en el Frontend

**Herramientas de desarrollo**:
1. Abrir DevTools (F12)
2. Pestaña "Network"
3. Filtrar por "Fetch/XHR"
4. Observar las llamadas API al:
   - Editar contrato
   - Agregar servicios
   - Agregar usuarios
   - Enviar firma

**Ejemplo de lo que verás**:
```http
PUT http://localhost:8000/api/contratos/5/actualizar/
Response:
{
  "id": 5,
  "nombre": "Tu Contrato",
  "estado": "borrador",
  "valido": false,  ← Observar este campo
  "contrato_servicios": [...],
  "vinculos_contrato": [...]
}
```

---

## 5. Relación con Facturación (Conexión con OTs)

### 5.1. ¿Por qué necesitamos configurar el contrato?

Recordemos el problema de negocio:

```
CONTRATO dice: "2 visitas/mes incluidas"
OT real ejecutada: 3 visitas

DIFERENCIA: 1 visita EXTRA → DEBE FACTURARSE
```

**Para que el sistema calcule esto**, necesita:
- **Contrato válido** con visitas configuradas
- **OT vinculada al contrato** (campo `contrato_base` en `OrdenDeTrabajo`)
- **Detalles de la OT** que indiquen tipo de trabajo

### 5.2. Campos Faltantes (Identificados en Exploración Anterior)

En `backend/ordentrabajo/models.py`, necesitarías agregar:

```python
class OrdenDeTrabajo(ModeloBaseHistorico):
    # ... campos existentes ...
    
    # NUEVO: Vinculación al contrato
    contrato_base = models.ForeignKey(
        'contratos.ContratoEmpresaCliente',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='ordenes_trabajo'
    )
```

```python
class DetalleTrabajo(ModeloBaseHistorico):
    # ... campos existentes ...
    
    # NUEVOS: Para comparación con contrato
    esta_en_contrato = models.BooleanField(default=False)
    precio_extra = models.DecimalField(max_digits=10, decimal_places=2, default=0)
```

**Lógica futura** (al cerrar OT):
```python
# Pseudocódigo
if ot.contrato_base:
    for detalle in ot.detalles_trabajo.all():
        if detalle.tipo == 'visita':
            # ¿Esta visita está en contrato?
            if not esta_incluida_en_contrato(detalle, ot.contrato_base):
                detalle.esta_en_contrato = False
                detalle.precio_extra = calcular_precio_visita_extra()
```

---

## 6. Siguientes Pasos en la Exploración

### 6.1. Exploración Inmediata

✅ **Hacer ahora**:
1. Completar tu contrato actual agregando:
   - Al menos 1 servicio
   - Al menos 1 visita
   - Al menos 1 usuario vinculado
2. Observar en DevTools las llamadas API
3. Verificar el campo `valido` en las respuestas

### 6.2. Exploración Avanzada

📋 **Próximos módulos a explorar**:
1. **Órdenes de Trabajo** (ya tienes base conceptual):
   - Crear OT "manualmente" desde el frontend
   - Vincularla a un contrato (si el campo existe)
   - Observar el flujo de estados

2. **Catálogos**:
   - Explorar modelos `Servicio`, `PlanServicio`, `Visita`, `Licencia`
   - Crear nuevos registros de prueba
   - Entender la relación con `ContentType` (polimorfismo)

3. **Firma Digital**:
   - Enviar un contrato a firma
   - Capturar el correo (si tienes acceso a logs o Mailtrap)
   - Probar el flujo de firma en `/firmar-contrato/{uuid}`

### 6.3. Documentación de Hallazgos

A medida que explores, puedes ir documentando:

```markdown
## Bugs Encontrados
- [ ] Bug X: Descripción, steps to reproduce

## Lecciones Aprendidas
- Lección 1: El campo `valido` no es persistido, es calculado en el serializer
- Lección 2: Las tablas intermedias usan `perform_create` para asignar FK

## Mejoras Sugeridas
- Mejora 1: Botón "Activar Contrato" con validaciones
- Mejora 2: Wizard de configuración paso a paso
```

---

## 7. Preguntas Clave para Responder Durante la Exploración

### 7.1. Sobre el Flujo de Negocio

- [ ] ¿Qué pasa si creo un contrato sin fecha_fin? (indefinido)
- [ ] ¿Se puede editar un contrato en estado `activo`?
- [ ] ¿Hay validaciones de fechas (fecha_inicio < fecha_fin)?
- [ ] ¿Se puede eliminar un servicio del contrato si ya hay OTs vinculadas?

### 7.2. Sobre Datos y Catálogos

- [ ] ¿Cuántos servicios hay en el catálogo actual? (`Servicio.objects.count()`)
- [ ] ¿Hay planes predefinidos? (`PlanServicio.objects.all()`)
- [ ] ¿Qué tipos de visitas existen? (`Visita.objects.values_list('descripcion', flat=True)`)
- [ ] ¿Hay licencias configuradas? (`Licencia.objects.all()`)

### 7.3. Sobre Permisos y Seguridad

- [ ] ¿Qué permisos se requieren para crear contratos?
- [ ] ¿Un usuario de una empresa puede ver contratos de otra?
- [ ] ¿El endpoint de firma es realmente público sin auth?

---

## 8. Recursos de Referencia

### 8.1. Archivos Clave (Backend)

```
backend/contratos/
├── models.py           # Líneas 1-800: Todos los modelos
├── serializers.py      # Líneas 1-400: Serializers con validaciones
├── views.py            # Líneas 1-600: ViewSets y acciones custom
├── urls.py             # Routing de endpoints
└── funciones.py        # generar_contrato_en_memoria (PDF)
```

### 8.2. Archivos Clave (Frontend)

```
frontend/src/
├── pages/Contratos/
│   ├── ContratosDelCliente.tsx        # Vista principal de detalles
│   └── modals/
│       ├── CrearContratoDelCliente.tsx
│       ├── AgregarServiciosyPlanesContrato.tsx
│       └── CrearEnvioContratoFirmaUsuario.tsx
├── store/slices/contratos/
│   └── contratoSlice.ts               # Thunks y estado Redux
└── interface/contrato.interface.ts     # Tipos TypeScript
```

### 8.3. Documentos Relacionados

- **[MODULOS_AUTENTICACION_Y_CONTRATOS.md](./MODULOS_AUTENTICACION_Y_CONTRATOS.md)**:
  - Sección 2: Modelo de Contratos (arquitectura general)
  - Sección 2.2: Estados y validaciones
  - Sección 2.3: Relaciones polimórficas

- **[FLUJO_FACTURACION_CONTRATOS_OT.md](./FLUJO_FACTURACION_CONTRATOS_OT.md)**:
  - Sección 3: Comparación de contratos vs trabajo ejecutado
  - Sección 4: Lógica de detección de extras

---

## 9. Comandos Útiles para la Exploración

### 9.1. Backend (Django Shell)

```cmd
REM Activar shell de Django
cd backend
ENV\Scripts\python.exe manage.py shell

REM Consultas útiles
from contratos.models import *
from empresas.models import *

# Ver tu contrato recién creado
contrato = ContratoEmpresaCliente.objects.last()
print(f"ID: {contrato.id}, Nombre: {contrato.nombre}, Estado: {contrato.estado}")

# Ver relaciones
print(f"Servicios: {contrato.contrato_servicios.count()}")
print(f"Usuarios: {contrato.vinculos_contrato.count()}")
print(f"Visitas: {contrato.contrato_visitas.count()}")

# Ver catálogos
print(f"Total servicios: {Servicio.objects.count()}")
print(f"Total planes: {PlanServicio.objects.count()}")
print(f"Total visitas: {Visita.objects.count()}")

# Ver empresas vinculadas
print(f"Prestador: {contrato.empresa_prestadora.nombre}")
print(f"Cliente: {contrato.empresa_cliente.nombre}")
```

### 9.2. Frontend (Navegador)

```javascript
// Consola del navegador (F12)

// Ver estado Redux del contrato actual
window.__REDUX_DEVTOOLS_EXTENSION__?.()

// Ver datos del contrato en la respuesta de API
fetch('http://localhost:8000/api/contratos/5/')  // Cambia 5 por tu ID
  .then(r => r.json())
  .then(data => {
    console.log('Estado:', data.estado);
    console.log('Válido:', data.valido);
    console.log('Servicios:', data.contrato_servicios.length);
    console.log('Usuarios:', data.vinculos_contrato.length);
  });
```

---

---

## 10. Prerequisito: Poblar Servicios y Planes

⚠️ **IMPORTANTE**: Antes de poder agregar servicios/planes a un contrato, debes ejecutar el script de población:

```cmd
backend\ENV\Scripts\python.exe scripts\setup\seed_servicios.py
```

Este script crea:
1. **5 tipos de servicio**: Instalación, Mantenimiento, Soporte Técnico, Reparación, Consultoría
2. **7 servicios individuales** con ejemplos como:
   - Instalación de Cámara IP ($25,000)
   - Mantenimiento Preventivo Mensual ($35,000)
   - Soporte Técnico Remoto ($20,000)
   - Instalación DVR/NVR ($40,000)
   - Reparación de Equipos ($30,000)
   - Consultoría de Seguridad ($80,000)
   - Configuración de Red ($35,000)

3. **5 características de servicio**:
   - Incluye materiales
   - 24/7 Disponibilidad
   - Garantía extendida
   - Respuesta prioritaria
   - Informe técnico

4. **3 planes de servicio** (paquetes):
   - Plan Básico de Seguridad ($180,000)
   - Plan Empresarial Completo ($350,000)
   - Plan Mantenimiento Anual ($480,000)

**Verificación**: Después de ejecutar el script, puedes verificar con:

```python
from contratos.models import Servicio, PlanServicio
print(f"Servicios creados: {Servicio.objects.count()}")
print(f"Planes creados: {PlanServicio.objects.count()}")
```

---

## 11. Checklist de Exploración Completa

### 11.1. Prerequisitos (NUEVO - debe hacerse primero)

- [ ] Ejecutar `seed_servicios.py` para poblar catálogos
- [ ] Verificar que existen servicios: `Servicio.objects.count() > 0`
- [ ] Verificar que existen planes: `PlanServicio.objects.count() > 0`
- [ ] Verificar que la lista desplegable en frontend muestra opciones

### 11.2. Configuración Básica

- [ ] Crear contrato base con datos mínimos
- [ ] Verificar estado inicial (`borrador`)
- [ ] Confirmar campo `valido = false`

### 11.3. Agregar Relaciones

- [ ] Agregar al menos 1 servicio/plan
- [ ] Agregar al menos 1 visita (si tipo = "servicios")
- [ ] Agregar al menos 1 licencia (si tipo = "licencia")
- [ ] Agregar al menos 1 usuario vinculado
- [ ] Agregar al menos 1 condición especial

### 10.3. Firma Digital

- [ ] Enviar contrato a firma a un usuario
- [ ] Verificar que se crea `EnvioContratoFirmaUsuario`
- [ ] Revisar correo enviado (logs o Mailtrap)
- [ ] Probar flujo de firma (si tienes acceso al link)

### 10.4. Validaciones

- [ ] Verificar que `valido = true` después de completar todo
- [ ] Intentar editar contrato en modo edición
- [ ] Probar eliminar un servicio/visita/usuario
- [ ] Verificar que los cambios se persisten correctamente

### 10.5. Exploración de Código

- [ ] Leer `ContratoEmpresaClienteViewSet.actualizar()` en `views.py`
- [ ] Entender lógica de `editar_servicios_genericos()`
- [ ] Revisar endpoint público de firma (`firmar_envio`)
- [ ] Analizar serializer `get_valido()` para entender validación

---

## 11. Próximo Documento a Crear

Después de completar esta exploración, el siguiente paso sería:

**📄 EXPLORACION_ORDENES_TRABAJO.md**:
- Crear OT vinculada a un contrato
- Agregar detalles de trabajo (items, visitas, compras)
- Explorar el flujo de estados de OT
- Verificar cómo se calculan costos y se comparan con contratos

---

## 12. Notas y Observaciones de la Exploración

**Espacio para tus apuntes**:

```
Fecha: 07/11/2025
Contrato ID: ___
Observaciones:
- 
- 
- 

Bugs encontrados:
- 

Preguntas sin responder:
- 
```

---

**Última actualización**: 2025-11-07  
**Siguiente paso**: Completar configuración del contrato y documentar hallazgos.
