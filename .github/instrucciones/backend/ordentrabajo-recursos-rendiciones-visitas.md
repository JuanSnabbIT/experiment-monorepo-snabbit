---
title: "Apps Backend: ordentrabajo, recursos, rendiciones, visitas"
scope: "backend"
status: "active"
last_updated: "2025-11-05"
---

# Apps Backend: ordentrabajo, recursos, rendiciones, visitas

## Objetivo
Documentar los modelos, lógica de negocio y relaciones de las apps operacionales del ERP: gestión de órdenes de trabajo con asignación de recursos, control de equipos y software, rendiciones de gastos con comprobantes, y visitas técnicas con entrega de equipos.

---

## 1. App: ordentrabajo/

### Propósito
Sistema completo de gestión de órdenes de trabajo (OT) con asignación de usuarios internos/externos, seguimiento de tareas (detalles), historial de cambios, adjuntos, gastos asociados y vinculación polimórfica a cotizaciones/visitas/compras.

### Modelos Principales

#### OrdenDeTrabajo
Representa una orden de trabajo completa con fechas, estado, prioridad y responsables.

**Campos clave**:
```python
empresa: FK → Empresa  # Empresa que ejecuta la OT
cliente: FK → Empresa  # Cliente para quien se ejecuta
fecha_inicio_ot: DateField
fecha_finalizacion_ot: DateField
estado: CharField  # choices ESTADOS_ORDEN (pendiente, en_proceso, completada, cancelada, etc.)
descripcion: TextField
prioridad: CharField  # choices PRIORIDAD (1=baja, 2=media, 3=alta, 4=crítica)
notas_internas: TextField
responsable_empresa: FK → UsuarioEmpresa  # Encargado principal
solicitante_empresa: FK → UsuarioEmpresa  # Quien solicitó la OT
usuarios_asignados: M2M → through UsuarioAsignadoOT
adjuntos: M2M → through AdjuntoDeOrden
trabajos: M2M → through DetalleTrabajo
historial_cambios: M2M → through HistorialCambiosOrden
```

**Validaciones**:
- `clean()`: `fecha_finalizacion_ot >= fecha_inicio_ot`

**Relaciones**:
- Hereda de `ModeloBaseHistorico` → tracking completo con django-simple-history
- Una OT pertenece a una empresa (ejecutora) y un cliente (receptor)
- Múltiples usuarios asignados (internos o externos)
- Múltiples detalles de trabajo (tareas específicas)
- Historial de cambios de estado/condiciones

**Meta**:
- `ordering = ['-fecha_creacion']`

---

#### UsuarioAsignadoOT
Tabla intermedia que permite asignar usuarios internos (UsuarioEmpresa) o externos (nombre + email) a una OT.

**Campos clave**:
```python
orden: FK → OrdenDeTrabajo
usuario_empresa: FK → UsuarioEmpresa (nullable)
usuario_externo: CharField (nullable)
correo_usuario_externo: EmailField (nullable)
```

**Constraint XOR**:
```python
CheckConstraint(
    check=(
        (usuario_empresa__isnull=False & usuario_externo__isnull=True & correo_usuario_externo__isnull=True) |
        (usuario_empresa__isnull=True & usuario_externo__isnull=False)
    ),
    name="usuario_empresa_xor_usuario_externo"
)
```
- **Lógica**: Debe tener `usuario_empresa` **O** `usuario_externo`, pero no ambos ni ninguno.

**Validaciones**:
- `clean()`: 
  - Si tiene `usuario_empresa` → no puede tener `usuario_externo` ni `correo_usuario_externo`
  - Debe tener al menos uno de los dos tipos de usuario

**Ejemplo de uso**:
```python
# Usuario interno
UsuarioAsignadoOT.objects.create(
    orden=ot,
    usuario_empresa=usuario_snabbit
)

# Usuario externo (proveedor, colaborador externo)
UsuarioAsignadoOT.objects.create(
    orden=ot,
    usuario_externo="Juan Pérez - Proveedor ABC",
    correo_usuario_externo="juan@proveedor.com"
)
```

---

#### DetalleTrabajo
Representa una tarea específica dentro de una OT. Puede referenciar polimórficamente a Cotizacion, VisitaSoporte o Compra mediante GenericForeignKey.

**Campos clave**:
```python
nombre: CharField(max_length=100)
orden: FK → OrdenDeTrabajo
descripcion: TextField
content_type: FK → ContentType  # Tipo de trabajo (Cotizacion, VisitaSoporte, Compra)
trabajo_id: PositiveIntegerField
trabajo: GenericForeignKey('content_type', 'trabajo_id')  # Referencia polimórfica
seguimiento: M2M → through SeguimientoDetalleTrabajo
estado: CharField  # choices ESTADOS_DETALLE_TRABAJO (pendiente, en_proceso, completado, etc.)
tecnico_asignado: FK → UsuarioEmpresa
insumo: OneToOne → GuiaSalida  # Guía de salida de bodega para insumos de este detalle
```

**Opciones GenericForeignKey**:
```python
opciones = Q(app_label='cotizaciones', model='cotizacion') | 
           Q(app_label='visitas', model='visitasoporte') | 
           Q(app_label='bodegas', model='compra')
```

**Ejemplo de uso**:
```python
# Detalle vinculado a una Cotización
DetalleTrabajo.objects.create(
    nombre="Instalación de servidores",
    orden=ot,
    descripcion="Instalar 3 servidores Dell según cotización #123",
    content_type=ContentType.objects.get_for_model(Cotizacion),
    trabajo_id=123,
    estado='pendiente',
    tecnico_asignado=tecnico_juan
)

# Detalle vinculado a una Visita de Soporte
DetalleTrabajo.objects.create(
    nombre="Revisión de equipos",
    orden=ot,
    descripcion="Revisar 10 equipos en oficina central",
    content_type=ContentType.objects.get_for_model(VisitaSoporte),
    trabajo_id=456,
    estado='en_proceso',
    tecnico_asignado=tecnico_maria,
    insumo=guia_salida_123  # Insumos entregados para esta visita
)
```

**Relaciones**:
- Hereda de `ModeloBaseHistorico` → tracking completo
- Múltiples seguimientos (comentarios, cambios de estado)
- Puede tener insumos asociados (OneToOne GuiaSalida)

---

#### SeguimientoDetalleTrabajo
Registro de comentarios, cambios de estado, actualizaciones en un DetalleTrabajo.

**Campos clave**:
```python
detalle_trabajo: FK → DetalleTrabajo
tipo: CharField  # choices TIPO_SEGUIMIENTO (comentario, cambio_estado, incidencia, etc.)
fecha: DateTimeField(auto_now_add=True)
comentario: TextField
usuario: FK → UsuarioEmpresa
```

**Ejemplo de uso**:
```python
SeguimientoDetalleTrabajo.objects.create(
    detalle_trabajo=detalle,
    tipo='cambio_estado',
    comentario="Detalle completado. Equipos instalados correctamente.",
    usuario=tecnico_responsable
)
```

---

#### HistorialCambiosOrden
Registro completo de cambios de estado, condiciones, responsables en una OrdenDeTrabajo.

**Campos clave**:
```python
orden: FK → OrdenDeTrabajo
fecha_cambio: DateTimeField(auto_now_add=True)
estado_anterior: TextField  # Estado o condición antes del cambio
estado_actual: TextField  # Estado o condición después del cambio
comentario: TextField
usuario: FK → UsuarioEmpresa  # Quien realizó el cambio
```

**Ejemplo de uso**:
```python
HistorialCambiosOrden.objects.create(
    orden=ot,
    estado_anterior='pendiente',
    estado_actual='en_proceso',
    comentario="OT asignada a técnico Juan Pérez. Fecha inicio: 2025-11-05",
    usuario=gerente_ot
)
```

**Meta**:
- `ordering = ["-fecha_creacion"]`

---

#### AdjuntoDeOrden
Archivos adjuntos asociados a una OT (informes, fotos, documentos).

**Campos clave**:
```python
orden: FK → OrdenDeTrabajo
tipo: CharField  # choices TIPO_ADJUNTO (informe, foto, factura, etc.)
archivo: FileField(upload_to=adjuntos_ot)
descripcion: CharField(max_length=255)
```

**Función upload_to**:
```python
def adjuntos_ot(instance, filename):
    return 'ot/{0}/adjuntos/{1}'.format(instance.orden.pk, filename)
```
- Organiza archivos por OT: `ot/123/adjuntos/informe_tecnico.pdf`

**Ejemplo de uso**:
```python
AdjuntoDeOrden.objects.create(
    orden=ot,
    tipo='informe',
    archivo=request.FILES['informe'],
    descripcion="Informe técnico de instalación"
)
```

---

#### DetalleGastoRendicionOT
Gastos asociados específicamente a una OT (diferente de DetalleGastoRendicion genérico).

**Campos clave**:
```python
orden: FK → OrdenDeTrabajo
categoria: FK → CategoriaGastoRendicion (PROTECT)
detalle: CharField(max_length=255)
cantidad: PositiveIntegerField
monto_unitario: PositiveIntegerField
monto_total: PositiveIntegerField (auto-calculado)
fecha_gasto: DateField
```

**Método save()**:
```python
def save(self, *args, **kwargs):
    self.monto_total = self.cantidad * self.monto_unitario
    super().save(*args, **kwargs)
```

**Ejemplo de uso**:
```python
DetalleGastoRendicionOT.objects.create(
    orden=ot,
    categoria=CategoriaGastoRendicion.objects.get(nombre="Transporte"),
    detalle="Viaje a oficina cliente",
    cantidad=1,
    monto_unitario=15000,
    fecha_gasto=date(2025, 11, 5)
)
# monto_total = 15000 (auto-calculado)
```

**Relación con ItemRendicion**:
- Puede ser referenciado por `ItemRendicion` (GenericForeignKey)
- Al eliminar, signal `borrar_items_relacionados` elimina ItemRendicion asociados

---

### Signals

#### 1. trigger_retroalimentacion
**Trigger**: `post_save` en `OrdenDeTrabajo`

**Función**:
```python
@receiver(post_save, sender=OrdenDeTrabajo)
def trigger_retroalimentacion(sender, instance, **kwargs):
    if instance.estado == "completada":
        task_gestionar_retroalimentacion_para_orden.delay(instance.id)
```

**Lógica**:
- Cuando una OT cambia a estado `"completada"` → dispara tarea Celery para enviar retroalimentación al usuario
- Ver `retroalimentacion.tasks.task_gestionar_retroalimentacion_para_orden`

---

#### 2. crear_asignado_solicitante
**Trigger**: `post_save` en `OrdenDeTrabajo`

**Función**:
```python
@receiver(post_save, sender=OrdenDeTrabajo)
def crear_asignado_solicitante(sender, instance, created, **kwargs):
    if created and instance.solicitante_empresa:
        existe = UsuarioAsignadoOT.objects.filter(
            orden=instance,
            usuario_empresa=instance.solicitante_empresa
        ).exists()
        if not existe:
            UsuarioAsignadoOT.objects.create(
                orden=instance,
                usuario_empresa=instance.solicitante_empresa
            )
```

**Lógica**:
- Al **crear** una nueva OT → auto-asigna el solicitante como usuario asignado
- Evita duplicados: solo crea si no existe ya `UsuarioAsignadoOT` para ese solicitante

**Ejemplo de flujo**:
```python
ot = OrdenDeTrabajo.objects.create(
    empresa=snabbit,
    cliente=empresa_cliente,
    descripcion="Instalar equipos",
    solicitante_empresa=gerente_cliente  # ← Auto-asignado vía signal
)
# Signal crea: UsuarioAsignadoOT(orden=ot, usuario_empresa=gerente_cliente)
```

---

#### 3. borrar_items_relacionados
**Trigger**: `pre_delete` en `DetalleGastoRendicionOT`

**Función**:
```python
@receiver(pre_delete, sender=DetalleGastoRendicionOT)
def borrar_items_relacionados(sender, instance, **kwargs):
    ctype = ContentType.objects.get_for_model(DetalleGastoRendicionOT)
    ItemRendicion.objects.filter(
        content_type=ctype,
        detalle_id=instance.pk
    ).delete()
```

**Lógica**:
- Antes de eliminar un `DetalleGastoRendicionOT` → elimina todos los `ItemRendicion` que lo referencian
- Evita registros huérfanos en la tabla `ItemRendicion`

---

### Serializers Clave

#### OrdenDeTrabajoSerializer
**Computed fields**:
- `empresa_nombre`: `obj.empresa.nombre`
- `cliente_nombre`: `obj.cliente.nombre`
- `estado_label`: `obj.get_estado_display()`
- `prioridad_label`: `obj.get_prioridad_display()`
- `ultimo_historial`: Serializa el `HistorialCambiosOrden` más reciente
- `nombre_solicitante`: `obj.solicitante_empresa.usuario.get_nombre_completo()`
- `nombre_responsable`: `obj.responsable_empresa.usuario.get_nombre_completo()`

**Ejemplo de respuesta**:
```json
{
  "id": 123,
  "empresa_nombre": "Snabbit",
  "cliente_nombre": "Empresa Cliente A",
  "fecha_inicio_ot": "2025-11-01",
  "fecha_finalizacion_ot": "2025-11-05",
  "estado": "completada",
  "estado_label": "Completada",
  "prioridad": "3",
  "prioridad_label": "Alta",
  "descripcion": "Instalación de 10 equipos",
  "nombre_solicitante": "Juan Pérez García",
  "nombre_responsable": "María González López",
  "ultimo_historial": {
    "fecha_cambio": "2025-11-05T15:30:00Z",
    "estado_anterior": "en_proceso",
    "estado_actual": "completada",
    "comentario": "Todos los equipos instalados y probados"
  }
}
```

---

#### DetalleGuiaSerializer
Serializa un `DetalleTrabajo` incluyendo datos resumidos de la `GuiaSalida` asociada (insumos).

**Campos**:
- `nombre`, `descripcion`, `estado`, `estado_label`
- `guia`: `GuiaSalidaMiniSerializer(source="insumo")`

**GuiaSalidaMiniSerializer**:
```python
class GuiaSalidaMiniSerializer(serializers.ModelSerializer):
    cantidad_items = serializers.SerializerMethodField()
    estado_label = serializers.SerializerMethodField()

    class Meta:
        model = GuiaSalida
        fields = ("id", "motivo", "cantidad_items", "estado", "estado_label")

    def get_cantidad_items(self, obj):
        return obj.items.count()

    def get_estado_label(self, obj):
        return obj.get_estado_display()
```

**Ejemplo de respuesta**:
```json
{
  "nombre": "Instalación de servidores",
  "descripcion": "Instalar 3 servidores Dell",
  "estado": "completado",
  "estado_label": "Completado",
  "guia": {
    "id": 45,
    "motivo": "Entrega equipos para OT #123",
    "cantidad_items": 3,
    "estado": "T",
    "estado_label": "Terminado"
  }
}
```

---

### Diagrama de Relaciones

```
OrdenDeTrabajo (ModeloBaseHistorico)
├── empresa (FK → Empresa)
├── cliente (FK → Empresa)
├── responsable_empresa (FK → UsuarioEmpresa)
├── solicitante_empresa (FK → UsuarioEmpresa)
├── usuarios_asignados (M2M through UsuarioAsignadoOT)
│   ├── usuario_empresa (FK → UsuarioEmpresa) XOR
│   └── usuario_externo (CharField + email)
├── trabajos (M2M through DetalleTrabajo)
│   ├── nombre, descripcion, estado
│   ├── content_type + trabajo_id (GenericFK → Cotizacion/VisitaSoporte/Compra)
│   ├── tecnico_asignado (FK → UsuarioEmpresa)
│   ├── insumo (OneToOne → GuiaSalida)
│   └── seguimiento (M2M through SeguimientoDetalleTrabajo)
│       ├── tipo, fecha, comentario
│       └── usuario (FK → UsuarioEmpresa)
├── historial_cambios (M2M through HistorialCambiosOrden)
│   ├── fecha_cambio, estado_anterior, estado_actual
│   ├── comentario
│   └── usuario (FK → UsuarioEmpresa)
├── adjuntos (M2M through AdjuntoDeOrden)
│   ├── tipo, archivo (FileField)
│   └── descripcion
└── detallegastorendicionot_set (reverse FK)
    ├── categoria (FK → CategoriaGastoRendicion)
    ├── detalle, cantidad, monto_unitario, monto_total
    └── fecha_gasto
```

---

## 2. App: recursos/

### Propósito
Gestión de equipos (computadoras, laptops), software instalado, monitores, asignación de equipos a usuarios, fotos de equipos y control de estado/garantías.

### Modelos Principales

#### Equipo
Representa un equipo de cómputo completo con todas sus especificaciones técnicas.

**Campos clave**:
```python
nombre_equipo: CharField(max_length=50)
contraseña_administrador: CharField(max_length=50)
cliente: FK → Empresa (nullable)  # Empresa propietaria del equipo
registrado_por: FK → UsuarioEmpresa  # Quien registró el equipo
tipo_equipo: CharField  # choices TIPO_EQUIPO (ESCRITORIO, LAPTOP, SERVIDOR, etc.)
marca: CharField  # choices MARCA_EQUIPO (HP, DELL, LENOVO, APPLE, OTRA, etc.)
modelo: CharField(max_length=100)
numero_serie: CharField(max_length=100, unique=True)

# Información del procesador
id_procesador: CharField(max_length=50)
tipo_procesador: CharField  # choices TIPO_PROCESADOR (INTEL, AMD, OTRO)
generacion_procesador: CharField  # choices GENERACION_PROCESADOR (10, 11, 12, 13, etc.)

# Especificaciones
almacenamientos: M2M → through AlmacenamientoEquipo
ram: CharField  # choices TAMANIO_RAM (4GB, 8GB, 16GB, 32GB, OTRA)
sistema_operativo: CharField  # choices SISTEMA_OPERATIVO (WINDOWS_10, WINDOWS_11, LINUX, MACOS, etc.)
tipo_tarjeta_grafica: CharField  # choices TIPO_TARJETA_GRAFICA (INTEGRADA, DEDICADA, SIN_ESPECIFICAR)
nombre_tarjeta_grafica: CharField(max_length=50)
marca_tarjeta_grafica: CharField  # choices MARCA_TARJETA_GRAFICA (NVIDIA, AMD, INTEL, OTRA)
monitor: M2M → through MonitorEquipo

# Control de fechas
fecha_compra: DateField
fecha_caducidad_garantia: DateField
condicion_equipo: CharField  # choices CONDICIONES_EQUIPO (NUEVO, USADO, REACONDICIONADO, etc.)
estado: BooleanField(default=True)

# Relaciones
usuarios: M2M → through UsuarioEquipo
software_instalado: M2M → ContentType through SoftwareInstalado
```

**Ejemplo de uso**:
```python
Equipo.objects.create(
    nombre_equipo="PC-OFICINA-01",
    contraseña_administrador="Admin2025!",
    cliente=empresa_cliente_a,
    registrado_por=usuario_tecnico,
    tipo_equipo="ESCRITORIO",
    marca="HP",
    modelo="ProDesk 600 G6",
    numero_serie="5CD1234ABC",
    id_procesador="Intel Core i7-10700",
    tipo_procesador="INTEL",
    generacion_procesador="10",
    ram="16GB",
    sistema_operativo="WINDOWS_11",
    tipo_tarjeta_grafica="INTEGRADA",
    fecha_compra=date(2024, 3, 15),
    fecha_caducidad_garantia=date(2027, 3, 15),
    condicion_equipo="NUEVO"
)
```

**Relaciones**:
- Hereda de `ModeloBase` (timestamps básicos)
- Puede tener múltiples almacenamientos (HDD, SSD, etc.)
- Puede tener múltiples monitores
- Puede tener múltiples software instalados (GenericFK a Software o SoftwareDeEmpresa)
- Historial de asignaciones a usuarios (UsuarioEquipo)

---

#### AlmacenamientoEquipo
Representa discos de almacenamiento del equipo (HDD, SSD, NVMe, etc.). Un equipo puede tener múltiples almacenamientos.

**Campos clave**:
```python
almacenamiento: CharField  # choices TIPO_ALMACENAMIENTO (SSD_128GB, SSD_256GB, HDD_1TB, etc.)
equipo: FK → Equipo
fecha_instalacion: DateField
adicional: BooleanField(default=False)  # Si es disco adicional (no principal)
activo: BooleanField(default=True)
observaciones: TextField
```

**Ejemplo de uso**:
```python
# Disco principal
AlmacenamientoEquipo.objects.create(
    almacenamiento="SSD_256GB",
    equipo=equipo,
    fecha_instalacion=date(2024, 3, 15),
    adicional=False
)

# Disco adicional
AlmacenamientoEquipo.objects.create(
    almacenamiento="HDD_1TB",
    equipo=equipo,
    fecha_instalacion=date(2024, 6, 10),
    adicional=True,
    observaciones="Disco adicional para almacenamiento de archivos"
)
```

---

#### SoftwareDeEmpresa
Software específico de una empresa (licencias propietarias, software personalizado).

**Campos clave**:
```python
software: FK → Software  # Referencia a Software base (core.Software)
empresa: FK → Empresa
activo: BooleanField(default=True)
```

**Ejemplo de uso**:
```python
SoftwareDeEmpresa.objects.create(
    software=Software.objects.get(nombre="Microsoft Office"),
    empresa=empresa_cliente_a,
    activo=True
)
```

---

#### SoftwareInstalado
Software instalado en un equipo específico. Usa GenericForeignKey para referenciar Software (genérico) o SoftwareDeEmpresa (específico de empresa).

**Campos clave**:
```python
content_type: FK → ContentType  # Tipo: Software o SoftwareDeEmpresa
software_id: PositiveIntegerField
software: GenericForeignKey('content_type', 'software_id')  # Referencia polimórfica
version: CharField(max_length=20)
clave: CharField(max_length=50)  # Licencia/clave de activación
equipo: FK → Equipo
observaciones: TextField
```

**Opciones GenericForeignKey**:
```python
opciones = Q(app_label='core', model='software') | 
           Q(app_label='recursos', model='softwaredeempresa')
```

**Ejemplo de uso**:
```python
# Software genérico
SoftwareInstalado.objects.create(
    content_type=ContentType.objects.get_for_model(Software),
    software_id=software_office.pk,
    version="2021",
    clave="XXXXX-XXXXX-XXXXX",
    equipo=equipo,
    observaciones="Licencia corporativa"
)

# Software de empresa específica
SoftwareInstalado.objects.create(
    content_type=ContentType.objects.get_for_model(SoftwareDeEmpresa),
    software_id=software_empresa.pk,
    version="3.5",
    clave="ABC123",
    equipo=equipo
)
```

---

#### MonitorEquipo
Monitores asignados a un equipo.

**Campos clave**:
```python
nombre: CharField(max_length=100)
modelo: CharField(max_length=100)
numero_serie: CharField(max_length=100)
accesorios: TextField  # Cables, soportes, etc.
observaciones: TextField
equipo: FK → Equipo
```

**Ejemplo de uso**:
```python
MonitorEquipo.objects.create(
    nombre="Monitor HP 24 pulgadas",
    modelo="HP E24 G4",
    numero_serie="MON123456",
    accesorios="Cable HDMI, cable de poder",
    equipo=equipo
)
```

---

#### UsuarioEquipo
Asignación de un equipo a un usuario específico con fechas y fotos de entrega/devolución.

**Campos clave**:
```python
equipo: FK → Equipo
usuario: FK → UsuarioEmpresa
fecha_asignacion: DateField(auto_now_add=True)
fecha_devolucion: DateField (nullable)  # Fecha de devolución del equipo
observaciones: TextField
estado: BooleanField(default=True)  # Activo = equipo aún asignado
fotos: M2M → through FotoEquipo
```

**Ejemplo de uso**:
```python
# Asignación de equipo
UsuarioEquipo.objects.create(
    equipo=equipo,
    usuario=usuario_empresa,
    observaciones="Equipo entregado para trabajo remoto"
)

# Devolución de equipo
usuario_equipo.fecha_devolucion = date(2025, 11, 5)
usuario_equipo.estado = False
usuario_equipo.save()
```

**Relaciones**:
- Hereda de `ModeloBaseHistorico` → tracking completo de asignaciones
- Múltiples fotos (entrega, estado del equipo)

**Meta**:
- `ordering = ["-fecha_creacion"]`

---

#### FotoEquipo
Fotos de un equipo en el momento de asignación o devolución.

**Campos clave**:
```python
usuario_equipo: FK → UsuarioEquipo
imagen: TextField  # Base64 o URL de imagen
descripcion: CharField(max_length=100)
fecha_tomada: DateField
```

**Ejemplo de uso**:
```python
FotoEquipo.objects.create(
    usuario_equipo=usuario_equipo,
    imagen=base64_image,
    descripcion="Estado del equipo al momento de entrega",
    fecha_tomada=date(2025, 11, 5)
)
```

---

### Serializers Clave

#### EquipoSerializer
**Computed fields**:
- `tipo_equipo_label`: `obj.get_tipo_equipo_display()`
- `marca_label`: `obj.get_marca_display()`
- `tipo_procesador_label`: `obj.get_tipo_procesador_display()`
- `generacion_procesador_label`: `obj.get_generacion_procesador_display()`
- `ram_label`: `obj.get_ram_display()`
- `sistema_operativo_label`: `obj.get_sistema_operativo_display()`
- `condicion_equipo_label`: `obj.get_condicion_equipo_display()`
- `marca_tarjeta_grafica_label`: `obj.get_marca_tarjeta_grafica_display()`
- `tipo_tarjeta_grafica_label`: `obj.get_tipo_tarjeta_grafica_display()`
- `datos_almacenamiento`: `AlmacenamientoEquipoSerializer(source="almacenamientoequipo_set", read_only=True, many=True)`
- `datos_monitor`: `MonitorEquipoSerializer(source="monitorequipo_set", read_only=True, many=True)`
- `datos_software`: `SoftwareInstaladoSerializer(source="softwareinstalado_set", read_only=True, many=True)`
- `nombre_usuario_asignado`: Usuario actualmente asignado (`usuario_equipo.filter(estado=True).first()`)

**Ejemplo de respuesta**:
```json
{
  "id": 45,
  "nombre_equipo": "PC-OFICINA-01",
  "tipo_equipo": "ESCRITORIO",
  "tipo_equipo_label": "Computadora de Escritorio",
  "marca": "HP",
  "marca_label": "HP",
  "modelo": "ProDesk 600 G6",
  "numero_serie": "5CD1234ABC",
  "tipo_procesador": "INTEL",
  "tipo_procesador_label": "Intel",
  "generacion_procesador": "10",
  "generacion_procesador_label": "10ma Generación",
  "ram": "16GB",
  "ram_label": "16 GB",
  "sistema_operativo": "WINDOWS_11",
  "sistema_operativo_label": "Windows 11",
  "nombre_usuario_asignado": "Juan Pérez García",
  "datos_almacenamiento": [
    {
      "almacenamiento": "SSD_256GB",
      "almacenamiento_label": "SSD 256 GB",
      "adicional": false,
      "activo": true
    },
    {
      "almacenamiento": "HDD_1TB",
      "almacenamiento_label": "HDD 1 TB",
      "adicional": true,
      "activo": true
    }
  ],
  "datos_monitor": [
    {
      "nombre": "Monitor HP 24 pulgadas",
      "modelo": "HP E24 G4",
      "numero_serie": "MON123456"
    }
  ],
  "datos_software": [
    {
      "nombre_software": "Microsoft Office",
      "version": "2021",
      "clave": "XXXXX-XXXXX-XXXXX"
    }
  ]
}
```

---

### Diagrama de Relaciones

```
Equipo (ModeloBase)
├── cliente (FK → Empresa)
├── registrado_por (FK → UsuarioEmpresa)
├── almacenamientos (M2M through AlmacenamientoEquipo)
│   ├── almacenamiento (choices), adicional, activo
│   └── fecha_instalacion, observaciones
├── monitor (M2M through MonitorEquipo)
│   ├── nombre, modelo, numero_serie
│   └── accesorios, observaciones
├── software_instalado (M2M through SoftwareInstalado)
│   ├── content_type + software_id (GenericFK → Software/SoftwareDeEmpresa)
│   ├── version, clave
│   └── observaciones
└── usuarios (M2M through UsuarioEquipo)
    ├── usuario (FK → UsuarioEmpresa)
    ├── fecha_asignacion, fecha_devolucion
    ├── observaciones, estado
    └── fotos (M2M through FotoEquipo)
        ├── imagen (base64/URL)
        ├── descripcion
        └── fecha_tomada
```

---

## 3. App: rendiciones/

### Propósito
Sistema de rendiciones de gastos con categorías, detalles de gastos internos, gastos de OT y compras, cálculo automático de totales y vinculación polimórfica de items.

### Modelos Principales

#### CategoriaGastoRendicion
Categorías para clasificar gastos (transporte, alimentación, materiales, etc.).

**Campos clave**:
```python
nombre: CharField(max_length=100)
descripcion: TextField
```

**Ejemplo de uso**:
```python
CategoriaGastoRendicion.objects.create(
    nombre="Transporte",
    descripcion="Gastos de movilización y transporte"
)
```

---

#### Rendicion
Representa una rendición de gastos completa de un usuario en una fecha específica.

**Campos clave**:
```python
usuario: FK → UsuarioEmpresa
fecha_rendicion: DateField
observaciones: TextField
estado: CharField  # choices ESTADOS_RENDICIONES (0=borrador, 1=enviada, 2=aprobada, 3=rechazada)
```

**Property total_rendicion**:
```python
@property
def total_rendicion(self):
    total = 0
    for item in self.items.all():
        det = item.detalle  # GenericForeignKey
        if det is None:
            continue

        ct = item.content_type
        # Gasto interno
        if ct.app_label == 'rendiciones' and ct.model == 'detallegastorendicion':
            total += det.monto_total
        # Gasto OT
        elif ct.app_label == 'ordentrabajo' and ct.model == 'detallegastorendicionot':
            total += det.monto_total
        # Compra
        elif ct.app_label == 'bodegas' and ct.model == 'compra':
            total += sum(line.cantidad * line.precio for line in det.itemencompra_set.all())

    return total
```

**Lógica**:
- Itera sobre todos los `ItemRendicion` asociados
- Suma `monto_total` de gastos (internos y OT)
- Suma `cantidad * precio` de cada `ItemEnCompra` para compras
- Retorna total acumulado

**Ejemplo de uso**:
```python
rendicion = Rendicion.objects.create(
    usuario=usuario_empresa,
    fecha_rendicion=date(2025, 11, 5),
    observaciones="Rendición de gastos semana 1 noviembre",
    estado='1'  # Enviada
)

# Acceder al total
print(rendicion.total_rendicion)  # 45000 (ejemplo)
```

**Meta**:
- `ordering = ['-fecha_creacion']`

---

#### DetalleGastoRendicion
Gasto interno genérico (no asociado a OT específica).

**Campos clave**:
```python
categoria: FK → CategoriaGastoRendicion (PROTECT)
detalle: CharField(max_length=255)
cantidad: PositiveIntegerField
monto_unitario: PositiveIntegerField
monto_total: PositiveIntegerField (auto-calculado)
fecha_gasto: DateField
```

**Método save()**:
```python
def save(self, *args, **kwargs):
    self.monto_total = self.cantidad * self.monto_unitario
    super().save(*args, **kwargs)
```

**Ejemplo de uso**:
```python
DetalleGastoRendicion.objects.create(
    categoria=CategoriaGastoRendicion.objects.get(nombre="Alimentación"),
    detalle="Almuerzo con cliente",
    cantidad=1,
    monto_unitario=12000,
    fecha_gasto=date(2025, 11, 5)
)
# monto_total = 12000 (auto-calculado)
```

**Meta**:
- `ordering = ["-fecha_creacion"]`

---

#### ItemRendicion
Tabla intermedia polimórfica que vincula una Rendición con sus items (DetalleGastoRendicion, DetalleGastoRendicionOT, o Compra).

**Campos clave**:
```python
rendicion: FK → Rendicion
content_type: FK → ContentType
detalle_id: PositiveIntegerField
detalle: GenericForeignKey('content_type', 'detalle_id')
```

**Opciones GenericForeignKey**:
```python
opciones = Q(app_label='ordentrabajo', model='detallegastorendicionot') | 
           Q(app_label='rendiciones', model='detallegastorendicion') | 
           Q(app_label='bodegas', model='compra')
```

**Método delete() personalizado**:
```python
def delete(self, *args, **kwargs):
    # Si el detalle es instancia de DetalleGastoRendicion (app 'rendiciones'), lo borramos
    if isinstance(self.detalle, DetalleGastoRendicion):
        self.detalle.delete()
    # Luego borramos el propio ItemRendicion
    super().delete(*args, **kwargs)
```

**Lógica**:
- Al eliminar `ItemRendicion` → elimina también el `DetalleGastoRendicion` asociado (si aplica)
- **No elimina** `DetalleGastoRendicionOT` ni `Compra` (solo desvincula)

**Ejemplo de uso**:
```python
# Vincular gasto interno a rendición
ItemRendicion.objects.create(
    rendicion=rendicion,
    content_type=ContentType.objects.get_for_model(DetalleGastoRendicion),
    detalle_id=detalle_gasto.pk
)

# Vincular gasto de OT a rendición
ItemRendicion.objects.create(
    rendicion=rendicion,
    content_type=ContentType.objects.get_for_model(DetalleGastoRendicionOT),
    detalle_id=detalle_gasto_ot.pk
)

# Vincular compra a rendición
ItemRendicion.objects.create(
    rendicion=rendicion,
    content_type=ContentType.objects.get_for_model(Compra),
    detalle_id=compra.pk
)
```

**Meta**:
- `ordering = ["-fecha_creacion"]`

---

### Diagrama de Relaciones

```
Rendicion (ModeloBase)
├── usuario (FK → UsuarioEmpresa)
├── fecha_rendicion, observaciones, estado
└── items (M2M through ItemRendicion)
    ├── content_type + detalle_id (GenericFK)
    ├── → DetalleGastoRendicion
    │   ├── categoria (FK → CategoriaGastoRendicion)
    │   ├── detalle, cantidad, monto_unitario, monto_total
    │   └── fecha_gasto
    ├── → DetalleGastoRendicionOT (ordentrabajo app)
    │   ├── orden (FK → OrdenDeTrabajo)
    │   ├── categoria, detalle, cantidad, monto_unitario, monto_total
    │   └── fecha_gasto
    └── → Compra (bodegas app)
        ├── codigo, fecha, total
        └── itemencompra_set (FK reverse)
            ├── item, cantidad, precio
            └── monto_total

CategoriaGastoRendicion
├── nombre
└── descripcion
```

---

## 4. App: visitas/

### Propósito
Sistema de visitas técnicas de soporte con revisión de equipos de usuarios (AsistenciaUsuario), entrega de equipos nuevos/reparados (EntregaDeEquipo), y control de insumos mediante guías de salida.

### Modelos Principales

#### VisitaSoporte
Representa una visita técnica completa a un cliente con fecha, estado y descripción del servicio realizado.

**Campos clave**:
```python
empresa: FK → Empresa  # Empresa que realiza la visita (Snabbit)
cliente: FK → Empresa  # Cliente visitado
asistencia_usuarios: M2M → through AsistenciaUsuario
entrega_equipo: M2M → through EntregaDeEquipo
descripcion_servicio: TextField  # Descripción de lo realizado en la visita
estado: CharField  # choices ESTADO_VISITA_SOPORTE (pendiente, en_proceso, completada, cerrada, etc.)
guia_salida: OneToOne → GuiaSalida  # Insumos llevados a la visita
```

**Ejemplo de uso**:
```python
VisitaSoporte.objects.create(
    empresa=snabbit,
    cliente=empresa_cliente_a,
    descripcion_servicio="Revisión de 10 equipos + entrega de 2 equipos nuevos",
    estado="pendiente",
    guia_salida=guia_salida_123  # Guía con insumos (cables, periféricos, etc.)
)
```

**Relaciones**:
- Hereda de `ModeloBase` (timestamps básicos)
- Múltiples asistencias a usuarios (revisiones de equipos)
- Múltiples entregas de equipos
- Una guía de salida (OneToOne) para insumos

---

#### AsistenciaUsuario
Revisión de un equipo de usuario durante una visita (tabla intermedia entre VisitaSoporte y UsuarioEquipo).

**Campos clave**:
```python
visita: FK → VisitaSoporte
estado_revision: CharField  # choices ESTADO_REVISION_EQUIPO (por_revisar, revisado, requiere_mantenimiento, etc.)
observaciones: TextField  # Estado del equipo al momento de revisión
usuario_equipo: FK → UsuarioEquipo  # Equipo del usuario revisado
observaciones_revision: TextField  # Observaciones técnicas de la revisión
```

**Ejemplo de uso**:
```python
AsistenciaUsuario.objects.create(
    visita=visita,
    estado_revision="revisado",
    observaciones="Equipo en buen estado, se actualizó sistema operativo",
    usuario_equipo=usuario_equipo_juan,
    observaciones_revision="Windows 11 actualizado, antivirus activo"
)
```

---

#### EntregaDeEquipo
Entrega de un equipo nuevo o reparado a un usuario durante una visita (tabla intermedia entre VisitaSoporte y Equipo).

**Campos clave**:
```python
visita: FK → VisitaSoporte
estado_entrega: CharField  # choices ESTADO_ENTREGA_EQUIPO (por_entregar, entregado, rechazado, etc.)
equipo: FK → Equipo
observaciones: TextField
usuario_a_entregar: FK → UsuarioEmpresa  # Usuario que recibe el equipo
nombre_quien_recibe: TextField  # Nombre de quien firma la recepción
firma_entregado: TextField  # Firma digital (base64 o URL)
observaciones_entrega: TextField  # Observaciones al momento de entrega
```

**Ejemplo de uso**:
```python
EntregaDeEquipo.objects.create(
    visita=visita,
    estado_entrega="por_entregar",
    equipo=equipo_nuevo,
    usuario_a_entregar=usuario_maria,
    observaciones="Equipo nuevo HP ProDesk"
)

# Después de entregar
entrega.estado_entrega = "entregado"
entrega.nombre_quien_recibe = "María González López"
entrega.firma_entregado = base64_firma
entrega.observaciones_entrega = "Equipo entregado en buen estado, usuario satisfecho"
entrega.save()
```

---

### Serializers Clave

#### VisitaSoporteSerializer
**Computed fields**:
- `empresa_nombre`: `obj.empresa.nombre`
- `cliente_nombre`: `obj.cliente.nombre`
- `estado_label`: `obj.get_estado_display()`
- `guia_salida_nombre`: `f"N°{obj.guia_salida.pk} - {obj.guia_salida.motivo}"` si existe, sino `"Sin Guia de Salida"`

**Ejemplo de respuesta**:
```json
{
  "id": 78,
  "empresa_nombre": "Snabbit",
  "cliente_nombre": "Empresa Cliente A",
  "descripcion_servicio": "Revisión de 10 equipos + entrega de 2 equipos nuevos",
  "estado": "completada",
  "estado_label": "Completada",
  "guia_salida_nombre": "N°123 - Insumos para visita a Cliente A",
  "fecha_creacion": "2025-11-05T09:00:00Z"
}
```

---

#### AsistenciaUsuarioSerializer
**Computed fields**:
- `estado_revision_label`: `obj.get_estado_revision_display()`
- `usuario_equipo_nombre`: `obj.usuario_equipo.usuario.usuario.get_nombre_completo()`

**Ejemplo de respuesta**:
```json
{
  "id": 45,
  "visita": 78,
  "estado_revision": "revisado",
  "estado_revision_label": "Revisado",
  "usuario_equipo_nombre": "Juan Pérez García",
  "observaciones": "Equipo en buen estado, se actualizó sistema operativo",
  "observaciones_revision": "Windows 11 actualizado, antivirus activo"
}
```

---

#### EntregaDeEquipoSerializer
**Computed fields**:
- `nombre_usuario_a_entregar`: `obj.usuario_a_entregar.usuario.get_nombre_completo()`
- `estado_entrega_label`: `obj.get_estado_entrega_display()`
- `datos_equipo`: `EquipoSerializer(source="equipo", read_only=True)` (nested completo)
- `se_puede_firmar`: Validación de completitud del equipo

**Validación se_puede_firmar**:
```python
def get_se_puede_firmar(self, obj):
    if (obj.equipo.marca != "OTRA" and 
        obj.equipo.modelo != "" and 
        obj.equipo.id_procesador not in [None, ""] and 
        obj.equipo.tipo_procesador != "OTRO" and 
        obj.equipo.ram != "OTRA" and 
        obj.equipo.fecha_compra is not None):
        return True
    else:
        return False
```

**Lógica**:
- Valida que el equipo tenga datos completos antes de permitir firma
- Requiere: marca específica, modelo, procesador, tipo procesador, RAM, fecha de compra

**Ejemplo de respuesta**:
```json
{
  "id": 89,
  "visita": 78,
  "estado_entrega": "entregado",
  "estado_entrega_label": "Entregado",
  "nombre_usuario_a_entregar": "María González López",
  "nombre_quien_recibe": "María González López",
  "firma_entregado": "data:image/png;base64,iVBORw0KGgoAAAANSUh...",
  "observaciones_entrega": "Equipo entregado en buen estado, usuario satisfecho",
  "se_puede_firmar": true,
  "datos_equipo": {
    "id": 45,
    "nombre_equipo": "PC-OFICINA-02",
    "marca": "HP",
    "modelo": "ProDesk 600 G6",
    "numero_serie": "5CD5678XYZ",
    "tipo_procesador_label": "Intel",
    "generacion_procesador_label": "11ma Generación",
    "ram_label": "16 GB",
    "sistema_operativo_label": "Windows 11"
  }
}
```

---

### Diagrama de Relaciones

```
VisitaSoporte (ModeloBase)
├── empresa (FK → Empresa)
├── cliente (FK → Empresa)
├── descripcion_servicio, estado
├── guia_salida (OneToOne → GuiaSalida)
├── asistencia_usuarios (M2M through AsistenciaUsuario)
│   ├── estado_revision, observaciones
│   ├── usuario_equipo (FK → UsuarioEquipo)
│   │   ├── equipo (FK → Equipo)
│   │   └── usuario (FK → UsuarioEmpresa)
│   └── observaciones_revision
└── entrega_equipo (M2M through EntregaDeEquipo)
    ├── estado_entrega, observaciones
    ├── equipo (FK → Equipo)
    ├── usuario_a_entregar (FK → UsuarioEmpresa)
    ├── nombre_quien_recibe, firma_entregado
    └── observaciones_entrega
```

---

## Conceptos Clave

### 1. Patrón GenericForeignKey en ordentrabajo/
- **DetalleTrabajo.trabajo**: Puede apuntar a `Cotizacion`, `VisitaSoporte` o `Compra`
- **Ventaja**: Un detalle puede referenciar diferentes tipos de trabajos sin múltiples FKs
- **Uso**: `DetalleTrabajo.objects.create(content_type=ContentType.objects.get_for_model(Cotizacion), trabajo_id=123)`

### 2. Constraint XOR en UsuarioAsignadoOT
- **Lógica**: `usuario_empresa XOR usuario_externo` (solo uno de los dos, nunca ambos ni ninguno)
- **CheckConstraint**: Django valida en nivel de BD
- **clean()**: Validación adicional en nivel de modelo

### 3. GenericForeignKey en recursos/
- **SoftwareInstalado.software**: Puede apuntar a `Software` (core) o `SoftwareDeEmpresa` (recursos)
- **Ventaja**: Permite software genérico del sistema o software específico de una empresa

### 4. Property total_rendicion
- **Cálculo dinámico**: No se guarda en BD, se calcula al acceder
- **Lógica polimórfica**: Suma montos según tipo de item (DetalleGastoRendicion, DetalleGastoRendicionOT, Compra)
- **Performance**: Considera usar anotaciones (`annotate`) para queries grandes

### 5. Signals en ordentrabajo/
- **trigger_retroalimentacion**: Dispara tarea Celery al completar OT (enviar encuesta de satisfacción)
- **crear_asignado_solicitante**: Auto-asigna solicitante al crear OT (evita paso manual)
- **borrar_items_relacionados**: Limpia registros huérfanos al eliminar DetalleGastoRendicionOT

### 6. Validación se_puede_firmar
- **Lógica de negocio**: Requiere datos completos del equipo antes de permitir firma de entrega
- **Campos validados**: marca, modelo, procesador, tipo_procesador, RAM, fecha_compra
- **UI**: Frontend usa este flag para habilitar/deshabilitar botón "Firmar"

### 7. ModeloBaseHistorico vs ModeloBase
- **ordentrabajo**: Usa `ModeloBaseHistorico` en OrdenDeTrabajo, UsuarioAsignadoOT, DetalleTrabajo, etc. (tracking completo)
- **recursos**: Usa `ModeloBase` en Equipo (timestamps básicos), `ModeloBaseHistorico` en UsuarioEquipo (tracking de asignaciones)
- **rendiciones/visitas**: Usa `ModeloBase` (timestamps suficientes)

### 8. OneToOne vs FK en insumos
- **DetalleTrabajo.insumo**: `OneToOne → GuiaSalida` (un detalle = una guía de insumos)
- **VisitaSoporte.guia_salida**: `OneToOne → GuiaSalida` (una visita = una guía de insumos)
- **Lógica**: Guía de salida puede usarse para detalle de OT o visita completa (no ambos)

### 9. Auto-cálculo de monto_total
- **DetalleGastoRendicion** y **DetalleGastoRendicionOT**: `save()` auto-calcula `monto_total = cantidad * monto_unitario`
- **Ventaja**: Evita inconsistencias, frontend solo envía cantidad y monto_unitario

### 10. Eliminación cascada en ItemRendicion
- **delete()** personalizado: Si eliminas `ItemRendicion` de un `DetalleGastoRendicion` → elimina también el detalle
- **NO afecta**: `DetalleGastoRendicionOT` ni `Compra` (solo desvincula)
- **Lógica**: Gastos internos se crean desde rendiciones (eliminación lógica), gastos de OT/compras existen independientemente

---

## Checklist de Testing

### ordentrabajo/
- [ ] Crear OT con solicitante → verificar que signal crea `UsuarioAsignadoOT` automáticamente
- [ ] Asignar usuario interno y externo → debe fallar (constraint XOR)
- [ ] Asignar DetalleTrabajo con `content_type` inválido → debe fallar (opciones limitadas)
- [ ] Completar OT → verificar que signal dispara tarea Celery de retroalimentación
- [ ] Eliminar `DetalleGastoRendicionOT` → verificar que signal elimina `ItemRendicion` relacionados
- [ ] Calcular `se_puede_completar` (comentado en serializer) → probar lógica si se habilita
- [ ] Validar `fecha_finalizacion_ot >= fecha_inicio_ot` en `clean()`

### recursos/
- [ ] Crear equipo con `numero_serie` duplicado → debe fallar (unique constraint)
- [ ] Asignar múltiples almacenamientos a un equipo → verificar flag `adicional`
- [ ] Instalar software con GenericFK a `Software` y `SoftwareDeEmpresa` → ambos deben funcionar
- [ ] Asignar equipo a usuario → verificar `fecha_asignacion` se setea automáticamente
- [ ] Devolver equipo → setear `fecha_devolucion`, `estado=False`
- [ ] Validar `nombre_usuario_asignado` en serializer → debe retornar usuario con `estado=True`
- [ ] Subir foto de equipo → verificar imagen (base64 o URL)

### rendiciones/
- [ ] Crear rendición con múltiples items (gastos internos, OT, compras) → verificar `total_rendicion` suma correctamente
- [ ] Eliminar `ItemRendicion` de gasto interno → verificar que elimina `DetalleGastoRendicion`
- [ ] Eliminar `ItemRendicion` de gasto OT → verificar que NO elimina `DetalleGastoRendicionOT`
- [ ] Validar auto-cálculo `monto_total` en `save()` de `DetalleGastoRendicion`
- [ ] Cambiar estado de rendición (0→1→2→3) → verificar transiciones permitidas

### visitas/
- [ ] Crear visita con guía de salida → verificar OneToOne constraint
- [ ] Crear `AsistenciaUsuario` sin `usuario_equipo` → debe fallar (nullable pero requerido en negocio)
- [ ] Crear `EntregaDeEquipo` con equipo incompleto → verificar `se_puede_firmar=False`
- [ ] Completar datos de equipo → verificar `se_puede_firmar=True`
- [ ] Firmar entrega → setear `nombre_quien_recibe`, `firma_entregado`, `estado_entrega='entregado'`
- [ ] Validar campos computados en serializers (`empresa_nombre`, `cliente_nombre`, `guia_salida_nombre`)

---

## Referencias Cruzadas

- **[core-cuentas.md](./core-cuentas.md)**: ModeloBase, ModeloBaseHistorico, User, PersonalizacionUsuario
- **[empresas-cotizaciones.md](./empresas-cotizaciones.md)**: Empresa, UsuarioEmpresa, Cotizacion
- **[contratos-bodegas-items.md](./contratos-bodegas-items.md)**: GuiaSalida, Compra, StockItemEnBodega
- **[ARQUITECTURA_SISTEMA.md](../../arquitectura/sistema.md)**: Visión general del sistema
- **[backend-instructions.md](../backend/general.md)**: Guía general del backend

---

**Última actualización**: 2025-11-05  
**Autor**: Análisis de apps ordentrabajo, recursos, rendiciones, visitas  
**Estado**: 11 de 15 apps documentadas (73%)
