---
title: "Apps Backend: vacaciones, calendario, activos, retroalimentacion, bd_ciudades"
scope: "backend"
status: "active"
last_updated: "2025-11-05"
---

# Apps Backend: vacaciones, calendario, activos, retroalimentacion, bd_ciudades

## Objetivo
Documentar las apps de soporte del ERP: gestión de solicitudes de vacaciones con cálculo de días hábiles, calendario de feriados, control de activos fijos, retroalimentación de OT con encuestas, y base de datos de ciudades chilenas.

---

## 1. App: vacaciones/

### Propósito
Sistema de solicitudes de vacaciones con validación de días disponibles según ley chilena, cálculo de días hábiles excluyendo fines de semana y feriados, y flujo de aprobación/rechazo.

### Modelo Principal

#### SolicitudVacaciones
Representa una solicitud de vacaciones de un usuario con validaciones de fechas, días disponibles y estado de aprobación.

**Campos clave**:
```python
usuario_empresa: FK → UsuarioEmpresa
fecha_inicio: DateField
fecha_fin: DateField
estado: CharField  # choices ESTADO_SOLICITUD_VACACIONES
                   # '1' = Pendiente, '2' = Aprobada, '3' = Rechazada
es_extraordinaria: BooleanField(default=False)  # Solicitud extraordinaria (sin descuento de días)
fecha_solicitud: DateTimeField(auto_now_add=True)
comentario: TextField
creado_por: FK → User (nullable)  # Usuario que creó la solicitud
aprobado_rechazado_por: FK → User (nullable)  # Usuario que aprobó/rechazó
firma_usuario: TextField  # Firma digital del empleado
```

**Método clean()**:
```python
def clean(self):
    if self.pk and self.estado == "1":
        # Si es una actualización de solicitud pendiente, no validar
        return

    # Validación 1: fecha_fin >= fecha_inicio
    if self.fecha_fin < self.fecha_inicio:
        raise DRFValidationError('La fecha de fin no puede ser anterior a la fecha de inicio.')

    # Validación 2: empleado tiene derecho a vacaciones (ver UsuarioEmpresa)
    if not self.usuario_empresa.tiene_derecho_a_vacaciones():
        raise DRFValidationError('El empleado aún no tiene derecho a vacaciones.')

    # Validación 3: días disponibles (solo al aprobar)
    if self.estado == '2' and not self.es_extraordinaria:
        dias_solicitados = self.calcular_dias_solicitados()
        dias_disponibles = self.usuario_empresa.dias_vacaciones_disponibles()
        if dias_solicitados > dias_disponibles:
            raise DRFValidationError('No tienes suficientes días de vacaciones disponibles.')

    # Validación 4: solo una solicitud extraordinaria pendiente por empleado
    if self.es_extraordinaria:
        solicitud_pendiente = SolicitudVacaciones.objects.filter(
            usuario_empresa=self.usuario_empresa,
            es_extraordinaria=True,
            estado='1'
        ).exclude(pk=self.pk).exists()
        if solicitud_pendiente:
            raise DRFValidationError('Ya existe una solicitud extraordinaria pendiente para este empleado.')
```

**Método calcular_dias_solicitados()**:
```python
def calcular_dias_solicitados(self):
    dias_totales = (self.fecha_fin - self.fecha_inicio).days + 1
    dias_solicitados = 0

    for i in range(dias_totales):
        dia_actual = self.fecha_inicio + timedelta(days=i)
        dia_calendario = DiaCalendario.objects.filter(fecha=dia_actual).first()

        # Contamos solo los días hábiles (lunes a viernes)
        if dia_actual.weekday() < 5:  # 0=lunes, 4=viernes
            if dia_calendario:
                if not dia_calendario.es_feriado:
                    dias_solicitados += 1
            else:
                # Si el día no está en el calendario, asumimos que es laborable
                dias_solicitados += 1

    return dias_solicitados
```

**Lógica**:
1. Calcula días totales entre `fecha_inicio` y `fecha_fin`
2. Itera día por día
3. Solo cuenta lunes a viernes (`weekday() < 5`)
4. Consulta `DiaCalendario` para verificar si es feriado
5. Si no existe registro en `DiaCalendario` → asume laborable
6. Retorna total de días hábiles solicitados

**Método save()**:
```python
def save(self, *args, **kwargs):
    if not self.pk:
        # Solo limpiar al crear una nueva instancia
        self.clean()
    super().save(*args, **kwargs)
```

**Ejemplo de uso**:
```python
# Crear solicitud (pendiente por defecto)
solicitud = SolicitudVacaciones.objects.create(
    usuario_empresa=usuario_empresa,
    fecha_inicio=date(2025, 12, 1),
    fecha_fin=date(2025, 12, 5),
    comentario="Vacaciones de fin de año",
    creado_por=usuario_sistema,
    firma_usuario=base64_firma
)
# Estado = '1' (Pendiente)
# calcular_dias_solicitados() retorna 5 (lunes a viernes)

# Aprobar solicitud
solicitud.estado = '2'
solicitud.aprobado_rechazado_por = gerente_rrhh
solicitud.save()  # clean() valida días disponibles

# Rechazar solicitud
solicitud.estado = '3'
solicitud.aprobado_rechazado_por = gerente_rrhh
solicitud.comentario += "\nRechazada por falta de cobertura en el área"
solicitud.save()
```

**Relación con UsuarioEmpresa**:
```python
# Ver empresas/models.py - UsuarioEmpresa
def tiene_derecho_a_vacaciones(self):
    """Valida si empleado ha cumplido 1 año de antigüedad"""
    if not self.fecha_ingreso:
        return False
    antiguedad = (date.today() - self.fecha_ingreso).days
    return antiguedad >= 365  # 1 año = 365 días

def dias_vacaciones_disponibles(self):
    """
    Calcula días de vacaciones disponibles según ley chilena:
    - 15 días hábiles por año trabajado
    - Se acumulan progresivamente (1.25 días por mes)
    - Se restan los días ya aprobados
    """
    if not self.fecha_ingreso:
        return 0
    
    antiguedad_dias = (date.today() - self.fecha_ingreso).days
    meses_trabajados = antiguedad_dias / 30.44  # Promedio días por mes
    
    # Acumulación progresiva: 15 días/año = 1.25 días/mes
    dias_acumulados = meses_trabajados * 1.25
    
    # Restar días aprobados
    dias_aprobados = SolicitudVacaciones.objects.filter(
        usuario_empresa=self,
        estado='2',  # Aprobadas
        es_extraordinaria=False
    ).aggregate(
        total=Sum('dias_solicitados')
    )['total'] or 0
    
    return max(0, dias_acumulados - dias_aprobados)
```

---

## 2. App: calendario/

### Propósito
Gestión de días feriados y calendario laboral por empresa, con soporte para feriados irrenunciables y consulta de días hábiles.

### Modelo Principal

#### DiaCalendario
Representa un día específico en el calendario de una empresa (feriado, laborable, irrenunciable).

**Campos clave**:
```python
empresa: FK → Empresa
fecha: DateField
es_feriado: BooleanField(default=True)
es_irrenunciable: BooleanField(default=False)  # Feriados que NO se pueden mover (18 sept, 1 mayo, etc.)
descripcion: CharField(max_length=255)  # Ej: "Día del Trabajo", "Fiestas Patrias"
tipo: CharField(max_length=50)  # Ej: "nacional", "regional", "empresa"
```

**Ejemplo de uso**:
```python
# Feriado nacional irrenunciable
DiaCalendario.objects.create(
    empresa=empresa,
    fecha=date(2025, 9, 18),
    es_feriado=True,
    es_irrenunciable=True,
    descripcion="Fiestas Patrias",
    tipo="nacional"
)

# Feriado de empresa (cumpleaños de la empresa)
DiaCalendario.objects.create(
    empresa=empresa,
    fecha=date(2025, 11, 15),
    es_feriado=True,
    es_irrenunciable=False,
    descripcion="Aniversario de la empresa",
    tipo="empresa"
)

# Día laborable especial (sábado de recuperación)
DiaCalendario.objects.create(
    empresa=empresa,
    fecha=date(2025, 11, 16),  # Sábado
    es_feriado=False,
    descripcion="Día de recuperación por puente",
    tipo="empresa"
)
```

**Uso en SolicitudVacaciones**:
```python
# En calcular_dias_solicitados()
dia_calendario = DiaCalendario.objects.filter(fecha=dia_actual).first()
if dia_calendario and not dia_calendario.es_feriado:
    dias_solicitados += 1
```

**Meta**:
- `ordering = ['fecha']`

---

### Modelo VacacionesUsuario (Comentado)
**Nota**: Este modelo está comentado en el código actual. Se documenta para referencia futura.

```python
class VacacionesUsuario(models.Model):
    usuario_empresa: OneToOne → UsuarioEmpresa
    dias_acumulados: FloatField(default=0)
    dias_tomados: FloatField(default=0)
    
    @property
    def dias_disponibles(self):
        return self.dias_acumulados - self.dias_tomados
    
    def calcular_dias_acumulados(self):
        """
        Calcula días acumulados según fecha_ingreso:
        - 1 día de vacaciones por cada 20 días trabajados
        """
        fecha_ingreso = self.usuario_empresa.fecha_ingreso
        if fecha_ingreso:
            hoy = date.today()
            dias_trabajados = self.calcular_dias_trabajados(fecha_ingreso, hoy)
            self.dias_acumulados = dias_trabajados / 20
            self.save()
```

**Motivo de estar comentado**:
- Lógica migrada a `UsuarioEmpresa.dias_vacaciones_disponibles()`
- Modelo anterior usaba acumulación diferente (1 día/20 días trabajados)
- Modelo actual usa ley chilena estándar (15 días hábiles/año = 1.25 días/mes)

---

## 3. App: activos/

### Propósito
Gestión de activos fijos de la empresa (equipos, muebles, vehículos) con control de valor, asignación a usuarios, documentos asociados e imágenes.

### Modelos Principales

#### Activo
Representa un activo fijo de la empresa con origen en inventario y valor contable.

**Campos clave**:
```python
empresa: FK → Empresa
stock: FK → StockItemEnBodega (nullable)  # Origen del activo (si viene de bodega)
cantidad: PositiveIntegerField(default=0)  # Cantidad de unidades del activo
numero_serie: CharField(max_length=50)  # Número de serie único (opcional)
valor: IntegerField(default=0)  # Valor contable del activo
```

**Método get_documentos()**:
```python
def get_documentos(self):
    return self.documentoactivo_set.all()
```

**Ejemplo de uso**:
```python
# Activo creado desde stock de bodega
activo = Activo.objects.create(
    empresa=snabbit,
    stock=stock_item_notebook,
    cantidad=10,
    valor=5000000  # $5.000.000 CLP (10 notebooks x $500.000)
)

# Activo sin stock (compra directa, no pasa por bodega)
activo = Activo.objects.create(
    empresa=snabbit,
    numero_serie="VEH-2024-001",
    cantidad=1,
    valor=15000000  # Vehículo de empresa
)
```

**Relaciones**:
- Hereda de `ModeloBase` (timestamps básicos)
- Múltiples documentos asociados (DocumentoActivo)
- Múltiples imágenes (ImagenActivo)

---

#### DocumentoActivo
Representa un documento individual del activo (factura, acta de entrega, contrato).

**Campos clave**:
```python
estado_activado: BooleanField(default=False)  # Si el activo está activado contablemente
activo: FK → Activo
asignado: BooleanField(default=False)  # Si el activo está asignado a un usuario
asignado_a: FK → UsuarioEmpresa (nullable)  # Usuario asignado
firma_asignado: TextField  # Firma digital del usuario al recibir
en_bodega: BooleanField(default=False)  # Si el activo está físicamente en bodega
bodega: FK → Bodega (nullable)  # Bodega donde se encuentra
```

**Ejemplo de uso**:
```python
# Crear documento de activo (sin asignar)
documento = DocumentoActivo.objects.create(
    activo=activo,
    estado_activado=True,
    en_bodega=True,
    bodega=bodega_central
)

# Asignar activo a usuario
documento.asignado = True
documento.asignado_a = usuario_empresa
documento.firma_asignado = base64_firma
documento.en_bodega = False
documento.bodega = None
documento.save()

# Devolver activo a bodega
documento.asignado = False
documento.asignado_a = None
documento.en_bodega = True
documento.bodega = bodega_central
documento.save()
```

---

#### ImagenActivo
Imágenes asociadas al activo (fotos del equipo, estado, etc.).

**Campos clave**:
```python
activo: FK → Activo
imagen: TextField  # Base64 o URL de imagen
```

**Ejemplo de uso**:
```python
ImagenActivo.objects.create(
    activo=activo,
    imagen=base64_image
)
```

---

### Campo Comentado (GenericForeignKey)
**Nota**: El código original incluye un campo GenericFK comentado:

```python
# opciones = Q(app_label='bodegas', model='stockitemenbodega') | 
#            Q(app_label='bodegas', model='itemenordencompra')
# content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, limit_choices_to=opciones)
# origen_id = models.PositiveIntegerField()
# origen = GenericForeignKey('content_type', 'origen_id')
```

**Motivo de estar comentado**:
- Reemplazado por FK directo a `StockItemEnBodega`
- Versión anterior permitía referenciar `StockItemEnBodega` o `ItemEnOrdenCompra`
- Simplificación: solo origen desde stock es suficiente

---

### Diagrama de Relaciones

```
Activo (ModeloBase)
├── empresa (FK → Empresa)
├── stock (FK → StockItemEnBodega)
├── cantidad, numero_serie, valor
├── documentos (reverse FK → DocumentoActivo)
│   ├── estado_activado, asignado
│   ├── asignado_a (FK → UsuarioEmpresa)
│   ├── firma_asignado
│   ├── en_bodega
│   └── bodega (FK → Bodega)
└── imagenes (reverse FK → ImagenActivo)
    └── imagen (base64/URL)
```

---

## 4. App: retroalimentacion/

### Propósito
Sistema de encuestas de satisfacción automáticas al completar órdenes de trabajo, con preguntas personalizables según tipo de trabajo (cotización, visita, compra) y registro de accesos vía UUID.

### Modelos Principales

#### Retroalimentacion
Representa una encuesta de retroalimentación asociada a una orden de trabajo completada.

**Campos clave**:
```python
orden_trabajo: FK → OrdenDeTrabajo
uuid: UUIDField(default=uuid.uuid4, unique=True)  # Token único para acceso público
cantidad_visitas: PositiveIntegerField(default=0)  # Contador de accesos
preguntas: M2M → PreguntaEnRetroalimentacion through RetroalimentacionAplicada
usuario_empresa: FK → UsuarioEmpresa (nullable)
usuario_externo: CharField (nullable)
correo_usuario_externo: EmailField (nullable)
observacion_retroalimentacion: TextField
fecha_retroalimentacion: DateTimeField (nullable)  # Fecha de respuesta
```

**Método generar_preguntas_aplicables()**:
```python
def generar_preguntas_aplicables(self):
    from ordentrabajo.models import DetalleTrabajo  # evitar circular import

    detalles = DetalleTrabajo.objects.filter(orden=self.orden_trabajo)

    for detalle in detalles:
        trabajo = detalle.trabajo  # GenericForeignKey
        if not trabajo:
            continue

        content_type = ContentType.objects.get_for_model(trabajo)
        preguntas = PreguntaEnRetroalimentacion.objects.filter(
            content_type=content_type,
            activo=True
        )

        for pregunta in preguntas:
            RetroalimentacionAplicada.objects.get_or_create(
                retroalimentacion=self,
                content_type=content_type,
                object_id=trabajo.pk,
                pregunta=pregunta
            )
```

**Lógica**:
1. Obtiene todos los `DetalleTrabajo` de la OT
2. Para cada detalle, obtiene el trabajo referenciado (Cotizacion, VisitaSoporte, Compra)
3. Busca preguntas activas para ese tipo de trabajo
4. Crea `RetroalimentacionAplicada` para cada pregunta (usando `get_or_create` para evitar duplicados)

**Ejemplo de uso**:
```python
# Crear retroalimentación al completar OT (vía signal)
retroalimentacion = Retroalimentacion.objects.create(
    orden_trabajo=ot,
    usuario_empresa=ot.solicitante_empresa,
    correo_usuario_externo=ot.solicitante_empresa.usuario.email
)

# Generar preguntas según detalles de la OT
retroalimentacion.generar_preguntas_aplicables()

# URL pública para responder encuesta
url = f"{FRONTEND_URL}/retroalimentacion/{retroalimentacion.uuid}/"
```

---

#### RetroalimentacionAplicada
Respuesta individual a una pregunta de retroalimentación (tabla intermedia entre Retroalimentacion y PreguntaEnRetroalimentacion).

**Campos clave**:
```python
retroalimentacion: FK → Retroalimentacion
content_type: FK → ContentType  # Tipo de trabajo (Cotizacion, VisitaSoporte, Compra)
object_id: PositiveIntegerField
modelo_relacionado: GenericForeignKey("content_type", "object_id")  # Trabajo específico
pregunta: FK → PreguntaEnRetroalimentacion
cantidad_estrellas: DecimalField(max_digits=2, decimal_places=1)  # 1.0 a 5.0
observaciones: TextField
```

**Ejemplo de uso**:
```python
# Usuario responde encuesta
RetroalimentacionAplicada.objects.filter(
    retroalimentacion=retroalimentacion,
    pregunta=pregunta_satisfaccion
).update(
    cantidad_estrellas=4.5,
    observaciones="Muy buen servicio, solo una pequeña demora"
)

# Registrar fecha de retroalimentación
retroalimentacion.fecha_retroalimentacion = timezone.now()
retroalimentacion.save()
```

---

#### LogDeAccesoRetroalimentacion
Registro de accesos a la encuesta de retroalimentación (auditoría).

**Campos clave**:
```python
retroalimentacion: FK → Retroalimentacion
ip: GenericIPAddressField
user_agent: TextField
timestamp: DateTimeField(auto_now_add=True)
```

**Ejemplo de uso**:
```python
# Al acceder a URL de encuesta (view)
LogDeAccesoRetroalimentacion.objects.create(
    retroalimentacion=retroalimentacion,
    ip=request.META.get('REMOTE_ADDR'),
    user_agent=request.META.get('HTTP_USER_AGENT')
)

# Incrementar contador
retroalimentacion.cantidad_visitas += 1
retroalimentacion.save()
```

**Meta**:
- `ordering = ["-timestamp"]`

---

### Relación con core.PreguntaEnRetroalimentacion
```python
# Ver core/models.py
class PreguntaEnRetroalimentacion(models.Model):
    content_type: FK → ContentType  # Tipo de trabajo al que aplica la pregunta
    pregunta: TextField
    activo: BooleanField(default=True)
```

**Ejemplo de configuración**:
```python
# Pregunta para Cotizaciones
PreguntaEnRetroalimentacion.objects.create(
    content_type=ContentType.objects.get_for_model(Cotizacion),
    pregunta="¿Qué tan satisfecho está con la cotización recibida?",
    activo=True
)

# Pregunta para Visitas de Soporte
PreguntaEnRetroalimentacion.objects.create(
    content_type=ContentType.objects.get_for_model(VisitaSoporte),
    pregunta="¿El técnico resolvió su problema de manera efectiva?",
    activo=True
)
```

---

### Flujo Completo de Retroalimentación

```
1. OrdenDeTrabajo cambia a estado "completada"
   ↓
2. Signal trigger_retroalimentacion dispara tarea Celery
   ↓
3. task_gestionar_retroalimentacion_para_orden.delay(ot.id)
   ↓
4. Tarea crea Retroalimentacion con UUID único
   ↓
5. retroalimentacion.generar_preguntas_aplicables()
   - Detecta detalles de la OT (Cotizacion, VisitaSoporte, Compra)
   - Crea RetroalimentacionAplicada para cada pregunta activa
   ↓
6. Envía email al usuario con URL: /retroalimentacion/{uuid}/
   ↓
7. Usuario accede → LogDeAccesoRetroalimentacion registra IP y user_agent
   ↓
8. Usuario responde preguntas → actualiza cantidad_estrellas y observaciones
   ↓
9. Al terminar → retroalimentacion.fecha_retroalimentacion = now()
```

---

### Diagrama de Relaciones

```
Retroalimentacion (ModeloBase)
├── orden_trabajo (FK → OrdenDeTrabajo)
├── uuid (UUIDField, unique)
├── cantidad_visitas
├── usuario_empresa / usuario_externo (XOR)
├── observacion_retroalimentacion
├── fecha_retroalimentacion
├── preguntas (M2M through RetroalimentacionAplicada)
│   ├── content_type + object_id (GenericFK → Cotizacion/VisitaSoporte/Compra)
│   ├── pregunta (FK → PreguntaEnRetroalimentacion)
│   ├── cantidad_estrellas (1.0-5.0)
│   └── observaciones
└── logs_de_acceso (reverse FK → LogDeAccesoRetroalimentacion)
    ├── ip, user_agent
    └── timestamp
```

---

## 5. App: bd_ciudades/

### Propósito
Base de datos de regiones, provincias y comunas de Chile (referencia estática, no gestionada por Django).

### Modelos Principales

**Nota**: Estos modelos usan `managed = False`, lo que significa que Django **NO** crea ni modifica las tablas. Las tablas existen en la BD y Django solo las consulta.

#### Region
Representa una región de Chile (15 regiones).

**Campos clave**:
```python
region_id: IntegerField(primary_key=True)
region_nombre: CharField(max_length=50)
```

**Meta**:
- `managed = False` → Django no gestiona esta tabla
- `db_table = 'region'`

**Ejemplo de consulta**:
```python
Region.objects.all()
# <QuerySet [
#   <Region: 1 - Tarapacá>,
#   <Region: 2 - Antofagasta>,
#   <Region: 13 - Región Metropolitana>,
#   ...
# ]>
```

---

#### Provincia
Representa una provincia de Chile (vinculada a una región).

**Campos clave**:
```python
provincia_id: IntegerField(primary_key=True)
provincia_nombre: CharField(max_length=23)
provincia_region: FK → Region
```

**Meta**:
- `managed = False`
- `db_table = 'provincia'`

**Ejemplo de consulta**:
```python
Provincia.objects.filter(provincia_region=13)  # Provincias de RM
# <QuerySet [
#   <Provincia: Santiago>,
#   <Provincia: Cordillera>,
#   <Provincia: Maipo>,
#   ...
# ]>
```

---

#### Comuna
Representa una comuna de Chile (vinculada a una provincia).

**Campos clave**:
```python
comuna_id: IntegerField(primary_key=True)
comuna_nombre: CharField(max_length=20)
comuna_provincia: FK → Provincia
```

**Meta**:
- `managed = False`
- `db_table = 'comuna'`

**Ejemplo de consulta**:
```python
Comuna.objects.filter(comuna_provincia__provincia_nombre="Santiago")
# <QuerySet [
#   <Comuna: Santiago>,
#   <Comuna: Providencia>,
#   <Comuna: Las Condes>,
#   ...
# ]>
```

---

### Uso en el Sistema

Estos modelos se usan típicamente en:
- **Formularios de direcciones**: Selección de región → provincia → comuna
- **Filtros geográficos**: Buscar empresas por comuna
- **Reportes**: Agrupar datos por región

**Ejemplo de serializer**:
```python
class EmpresaSerializer(serializers.ModelSerializer):
    region = serializers.PrimaryKeyRelatedField(queryset=Region.objects.all())
    provincia = serializers.PrimaryKeyRelatedField(queryset=Provincia.objects.all())
    comuna = serializers.PrimaryKeyRelatedField(queryset=Comuna.objects.all())
    
    class Meta:
        model = Empresa
        fields = '__all__'
```

**Nota**: Las tablas deben pre-poblarse con datos de Chile (seed SQL o importación CSV).

---

## Conceptos Clave

### 1. Cálculo de Días Hábiles (vacaciones)
- **Lunes a viernes**: `dia.weekday() < 5`
- **Excluye feriados**: Consulta `DiaCalendario.es_feriado`
- **Si no existe en calendario**: Asume laborable (default)
- **Ventaja**: Flexibilidad para feriados específicos de empresa

### 2. Validaciones en clean() vs save()
- **clean()**: Validaciones de lógica de negocio (días disponibles, fechas, etc.)
- **save()**: Cálculos automáticos (monto_total, etc.)
- **SolicitudVacaciones**: Solo llama `clean()` en creación (`if not self.pk`)

### 3. Modelos managed = False (bd_ciudades)
- **Django NO crea/modifica tablas**: Solo consulta
- **Útil para**: Bases de datos legadas, datos de referencia externos
- **Migraciones**: Ignoradas para estos modelos
- **Responsabilidad**: Mantener tablas manualmente (SQL, CSV)

### 4. GenericForeignKey en retroalimentacion/
- **RetroalimentacionAplicada**: Vincula pregunta a trabajo específico (Cotizacion/VisitaSoporte/Compra)
- **Ventaja**: Una pregunta puede aplicarse a múltiples tipos de trabajo
- **Uso**: `content_type + object_id` apuntan al trabajo polimórficamente

### 5. UUID para Acceso Público
- **Retroalimentacion.uuid**: Token único para acceso sin autenticación
- **Seguridad**: UUID es aleatorio, difícil de adivinar
- **URL**: `/retroalimentacion/{uuid}/` → formulario público
- **Auditoría**: `LogDeAccesoRetroalimentacion` registra cada acceso

### 6. Acumulación de Vacaciones (Ley Chilena)
- **15 días hábiles por año**: Estándar legal
- **1.25 días por mes**: Acumulación progresiva
- **Antigüedad mínima**: 1 año (365 días) para derecho a vacaciones
- **Descuento**: Al aprobar solicitud, se restan días de acumulado

### 7. Solicitudes Extraordinarias
- **No descuentan días**: `es_extraordinaria=True`
- **Requieren aprobación especial**: Solo una pendiente por empleado
- **Casos comunes**: Permisos médicos, duelos, matrimonio

### 8. Activos desde Stock
- **FK stock**: Vincula activo a `StockItemEnBodega`
- **Ventaja**: Trazabilidad desde compra → bodega → activo
- **Casos**: Equipos, herramientas, consumibles convertidos en activos

### 9. DocumentoActivo vs ImagenActivo
- **DocumentoActivo**: Representa asignación/ubicación del activo (lógico)
- **ImagenActivo**: Foto del activo (visual)
- **Un activo puede tener múltiples documentos**: Ej: 10 notebooks = 10 documentos (uno por unidad)

### 10. Tarea Celery de Retroalimentación
- **Trigger**: `post_save` en `OrdenDeTrabajo` cuando `estado='completada'`
- **Tarea**: `task_gestionar_retroalimentacion_para_orden.delay(ot.id)`
- **Flujo asíncrono**: No bloquea respuesta HTTP
- **Ver**: `retroalimentacion/tasks.py` (no incluido en este análisis)

---

## Checklist de Testing

### vacaciones/
- [ ] Crear solicitud con `fecha_fin < fecha_inicio` → debe fallar (clean())
- [ ] Crear solicitud para empleado con < 1 año de antigüedad → debe fallar (tiene_derecho_a_vacaciones)
- [ ] Aprobar solicitud con más días que disponibles → debe fallar (dias_vacaciones_disponibles)
- [ ] Crear segunda solicitud extraordinaria pendiente → debe fallar (solo una pendiente)
- [ ] Validar `calcular_dias_solicitados()` → excluye fines de semana y feriados
- [ ] Crear solicitud que incluya feriado irrenunciable → no debe contarlo como día hábil
- [ ] Actualizar solicitud pendiente → no debe validar días (permitir edición)

### calendario/
- [ ] Crear `DiaCalendario` para fecha duplicada en misma empresa → validar constraint unique
- [ ] Crear feriado irrenunciable (`es_irrenunciable=True`) → marcar correctamente
- [ ] Consultar días hábiles en rango → validar lógica de exclusión
- [ ] Crear día laborable en sábado → verificar uso en cálculos de vacaciones

### activos/
- [ ] Crear activo sin `stock` → debe permitir (nullable)
- [ ] Asignar `DocumentoActivo` a usuario → setear `asignado=True`, `asignado_a=usuario`, `firma_asignado`
- [ ] Devolver activo a bodega → setear `asignado=False`, `en_bodega=True`, `bodega`
- [ ] Subir múltiples `ImagenActivo` → verificar galería
- [ ] Validar `get_documentos()` → retorna todos los documentos del activo

### retroalimentacion/
- [ ] Completar OT → verificar que signal crea `Retroalimentacion`
- [ ] Llamar `generar_preguntas_aplicables()` → verificar que crea `RetroalimentacionAplicada` para cada detalle
- [ ] Acceder a URL `/retroalimentacion/{uuid}/` → verificar que crea `LogDeAccesoRetroalimentacion`
- [ ] Responder preguntas → actualizar `cantidad_estrellas` y `observaciones`
- [ ] Finalizar encuesta → verificar que setea `fecha_retroalimentacion`
- [ ] Acceder múltiples veces → verificar incremento de `cantidad_visitas`
- [ ] Crear pregunta para tipo de trabajo inexistente → no debe generar `RetroalimentacionAplicada`

### bd_ciudades/
- [ ] Consultar regiones → verificar que retorna 15 regiones de Chile
- [ ] Filtrar provincias por región → verificar FK correcta
- [ ] Filtrar comunas por provincia → verificar FK correcta
- [ ] Intentar crear/modificar registro → validar que Django no gestiona (managed=False)

---

## Referencias Cruzadas

- **[core-cuentas.md](./core-cuentas.md)**: ModeloBase, PreguntaEnRetroalimentacion
- **[empresas-cotizaciones.md](./empresas-cotizaciones.md)**: Empresa, UsuarioEmpresa (tiene_derecho_a_vacaciones, dias_vacaciones_disponibles)
- **[contratos-bodegas-items.md](./contratos-bodegas-items.md)**: StockItemEnBodega, Bodega
- **[ordentrabajo-recursos-rendiciones-visitas.md](./ordentrabajo-recursos-rendiciones-visitas.md)**: OrdenDeTrabajo, DetalleTrabajo, signal trigger_retroalimentacion
- **[ARQUITECTURA_SISTEMA.md](../../ARQUITECTURA_SISTEMA.md)**: Visión general del sistema
- **[backend-instructions.md](../backend-instructions.md)**: Guía general del backend

---

**Última actualización**: 2025-11-05  
**Autor**: Análisis de apps vacaciones, calendario, activos, retroalimentacion, bd_ciudades  
**Estado**: 15 de 15 apps documentadas (100%) ✅
