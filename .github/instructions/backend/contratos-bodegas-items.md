---
title: "Backend: Apps Contratos, Bodegas e Items"
scope: "backend"
status: "active"
last_updated: "2025-11-05"
---

# 📋 Apps Backend: Contratos, Bodegas e Items

## Objetivo
Documentar las apps `contratos/`, `bodegas/` e `items/` del backend Django, que gestionan los contratos de servicios/licencias (con firmas digitales), el inventario completo (bodegas, stock, compras, tomas de inventario), y el catálogo de productos/servicios (items, categorías, fabricantes, proveedores).

---

## 📦 App: contratos/

### Propósito
Gestiona el **ciclo completo de contratos** entre empresas: contratos de servicios, licencias de software (con ventanas de reducción), visitas periódicas, condiciones especiales, firmas digitales, y acuerdos de confidencialidad. Incluye lógica compleja de licenciamiento con modalidades (anual, mensual, partner).

---

### 🗄️ Modelos

#### `ContratoEmpresaCliente`
**Propósito**: Contrato maestro entre empresa prestadora y empresa cliente. Base del sistema de contratos.

**Campos Principales**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `empresa_prestadora` | FK(Empresa) | Empresa que presta servicios (related_name: `contratos_como_prestadora`) |
| `empresa_cliente` | FK(Empresa) | Empresa que recibe servicios (related_name: `contratos_como_cliente`) |
| `nombre` | CharField (max 100) | Nombre del contrato |
| `tipo` | CharField (choices) | Tipo de contrato (servicios, licencia, mixto) |
| `fecha_inicio` | DateField | Fecha de inicio del contrato |
| `fecha_fin` | DateField (nullable) | Fecha de fin del contrato (null = indefinido) |
| `estado` | CharField (choices) | Estado del contrato (borrador, activo, finalizado, cancelado) |
| `observaciones` | TextField | Observaciones generales |

**Estados Disponibles** (`ESTADOS_CONTRATO`):
- `'borrador'`: En preparación, no vigente
- `'activo'`: Vigente y ejecutable
- `'finalizado'`: Terminado (por fecha_fin o manualmente)
- `'cancelado'`: Cancelado antes de tiempo

**Tipos de Contrato** (`TIPO_CONTRATO`):
- `'servicios'`: Contrato de servicios técnicos/profesionales
- `'licencia'`: Contrato de licenciamiento de software
- `'mixto'`: Servicios + Licencias

**Relaciones M2M** (via through):
- `servicios_genericos`: M2M(ContentType) through `ContratoServicio` (polimórfico: Servicio o PlanServicio)
- `visitas`: M2M(Visita) through `ContratoVisita`
- `licencias`: M2M(Licencia) through `ContratoLicencia`
- `condiciones_especiales`: M2M(CondicionEspecial) through `ContratoCondicionEspecial`
- `usuarios_vinculados`: M2M(UsuarioEmpresa) through `UsuarioVinculadoContrato`

**Hereda**: `ModeloBaseHistorico` (tracking completo de cambios con django-simple-history)

**Constraint**: `check_fecha_inicio_menor_fecha_fin` (fecha_fin >= fecha_inicio o null)

**Método `clean()`**:
```python
def clean(self):
    if self.fecha_inicio > date.today():
        raise ValidationError("La fecha de inicio no puede estar en el futuro.")
    if self.fecha_fin and self.fecha_fin < self.fecha_inicio:
        raise ValidationError("La fecha de fin no puede ser anterior a la fecha de inicio.")
```

**Método `actualizar_estado()`**:
```python
def actualizar_estado(self):
    """Verifica si el contrato ha vencido y actualiza su estado automáticamente."""
    if self.fecha_fin and self.fecha_fin < date.today():
        self.estado = 'finalizado'
```

**Método `save()`**:
```python
def save(self, *args, **kwargs):
    self.actualizar_estado()  # ← Auto-finaliza contratos vencidos
    super().save(*args, **kwargs)
```

---

#### `UsuarioVinculadoContrato`
**Propósito**: Asociar **usuarios específicos** a un contrato (gerentes, técnicos, representantes legales) para firmas digitales y responsabilidades.

**Campos**:
- `usuario`: FK(UsuarioEmpresa) - Usuario vinculado
- `contrato`: FK(ContratoEmpresaCliente, related_name: `vinculos_contrato`)
- `fecha_vinculacion`: DateField (auto_now_add)
- `tipo_usuario`: CharField (choices) - Rol en el contrato

**Tipos de Usuario** (`TIPOS_USUARIO_CONTRATO`):
- `'gerencia'`: Gerente del contrato
- `'tecnico'`: Técnico responsable
- `'representante_legal'`: Representante legal (firma contratos)
- `'supervisor'`: Supervisor de ejecución

**Uso**: Workflow de firmas digitales (cada usuario firma su parte del contrato).

---

#### `EnvioContratoFirmaUsuario`
**Propósito**: Registro de **envío de contrato para firma digital** (link único por usuario).

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `usuario` | FK(UsuarioVinculadoContrato) | Usuario que debe firmar |
| `uuid` | UUIDField (unique) | Token único para link de firma |
| `firma` | TextField (nullable) | Firma digital (imagen base64 o path) |
| `fecha_firma` | DateTimeField (nullable) | Timestamp de firma |
| `firmado` | BooleanField (default False) | Si ya firmó |
| `fecha_envio` | DateTimeField (nullable) | Timestamp de envío del email |
| `enviado` | BooleanField (default False) | Si ya se envió el email |

**Flujo de Firma**:
```
1. Backend crea EnvioContratoFirmaUsuario con UUID único
   ↓
2. Celery envía email con link: /firmar-contrato/{uuid}
   ↓
3. Usuario hace clic, frontend muestra contrato + canvas para firma
   ↓
4. Usuario firma, frontend envía firma (base64) a API
   ↓
5. Backend valida UUID, guarda firma, marca firmado=True, fecha_firma=now()
   ↓
6. Si todos los usuarios vinculados firmaron → contrato pasa a estado 'activo'
```

---

#### `Servicio`
**Propósito**: **Catálogo de servicios** que la empresa puede ofrecer en contratos.

**Campos**:
- `nombre`: CharField (max 255) - Nombre del servicio (ej.: "Soporte Técnico Nivel 2")
- `descripcion`: TextField - Descripción detallada
- `categoria`: CharField (choices) - Categoría del servicio
- `caracteristicas`: M2M(CaracteristicaServicio) - Características del servicio

**Categorías de Servicio** (`CATEGORIAS_SERVICIO`):
- `'soporte'`: Soporte técnico
- `'mantenimiento'`: Mantenimiento preventivo/correctivo
- `'instalacion'`: Instalación de equipos/software
- `'consultoria'`: Consultoría especializada
- `'capacitacion'`: Capacitación de usuarios

---

#### `CaracteristicaServicio`
**Propósito**: Características técnicas de un servicio (ej.: "24/7", "Respuesta en 4 horas").

**Campos**:
- `nombre`: CharField (max 255)
- `descripcion`: TextField (nullable)

**Uso**: Detalle técnico de servicios en cotizaciones/contratos.

---

#### `PlanServicio`
**Propósito**: **Bundle de servicios** (paquete con múltiples servicios).

**Campos**:
- `nombre`: CharField (max 255) - Nombre del plan (ej.: "Plan Empresarial Gold")
- `descripcion`: TextField
- `servicios`: M2M(Servicio) - Servicios incluidos en el plan

**Uso**: Vender paquetes de servicios a precio preferencial.

---

#### `ContratoServicio` (Tabla Intermedia - GenericForeignKey)
**Propósito**: Asociar **servicios o planes** a un contrato con cantidad y precio.

**Campos**:
- `contrato`: FK(ContratoEmpresaCliente, related_name: `contrato_servicios`)
- `content_type`: FK(ContentType) - Tipo de servicio (Servicio o PlanServicio)
- `object_id`: PositiveIntegerField - ID del servicio/plan
- `servicio_generico`: GenericForeignKey - Apunta a Servicio o PlanServicio
- `cantidad`: PositiveIntegerField (default 1)
- `precio_unitario`: DecimalField

**Constraint**: `limit_choices_to={"model__in": ["servicio", "planservicio"]}`

**Método `save()`**: Asigna `content_type` automáticamente según tipo de `servicio_generico`.

**Hereda**: `ModeloBaseHistorico`

---

#### `Visita`
**Propósito**: Tipo de visita técnica/comercial (ej.: "Mantenimiento Preventivo", "Capacitación On-site").

**Campos**:
- `descripcion`: CharField (max 255)

---

#### `ContratoVisita` (Tabla Intermedia)
**Propósito**: Asociar **visitas periódicas** a un contrato.

**Campos**:
- `contrato`: FK(ContratoEmpresaCliente, related_name: `contrato_visitas`)
- `visita`: FK(Visita, related_name: `visita_contratos`)
- `frecuencia`: CharField (choices) - Frecuencia de la visita
- `cantidad`: PositiveIntegerField (default 1) - Cantidad de visitas por período

**Frecuencias Disponibles** (`FRECUENCIA_VISITA`):
- `'diaria'`: Diaria
- `'semanal'`: Semanal
- `'quincenal'`: Quincenal
- `'mensual'`: Mensual
- `'trimestral'`: Trimestral
- `'semestral'`: Semestral
- `'anual'`: Anual

**Hereda**: `ModeloBaseHistorico`

---

#### `Licencia`
**Propósito**: Tipo de licencia de software (ej.: "Microsoft 365 E3", "Adobe Creative Cloud").

**Campos**:
- `nombre`: CharField (max 255)
- `proveedor`: CharField (max 255, nullable) - Proveedor de la licencia

---

#### `ContratoLicencia` (Tabla Intermedia - Lógica Compleja)
**Propósito**: Asociar **licencias de software** a un contrato con **lógica de licenciamiento** (ventanas de reducción, partner, modalidades).

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `contrato` | FK(ContratoEmpresaCliente) | Contrato al que pertenece |
| `licencia` | FK(Licencia) | Licencia de software |
| `tipo_modalidad` | CharField (choices) | Modalidad de licenciamiento ⭐ |
| `otro_tipo` | CharField (nullable) | Otra modalidad (si tipo='otros') |
| `cantidad` | PositiveIntegerField | Cantidad de licencias |
| `precio_unitario` | DecimalField | Precio por licencia |
| `tipo_moneda` | CharField (choices) | Moneda (USD, CLP, EUR) |
| `fecha_inicio` | DateField (nullable) | Fecha de inicio de licencias |
| `fecha_fin` | DateField (nullable) | Fecha de fin de licencias |
| `partner` | BooleanField (default True) | Si es partner (afecta reducciones) |
| `usuarios` | M2M(UsuarioEmpresa) | Usuarios asignados a licencias |

**Modalidades de Licenciamiento** (`TIPO_MODALIDAD_LICENCIA`):
- `'p1y-a'`: **Anual con pago anual** (renovación cada año, ventana reducción: 7 días desde inicio de cada año)
- `'p1y-m'`: **Anual con pago mensual** (renovación anual, pago mensual, ventana reducción: 7 días desde inicio de cada año)
- `'p1m-m'`: **Mensual** (renovación cada 30 días, ventana reducción: primeros 7 días de cada mes)
- `'otros'`: Otra modalidad (especificar en `otro_tipo`)

**Hereda**: `ModeloBaseHistorico`

---

#### Lógica de Ventanas de Reducción (CRÍTICA ⚠️)

**Contexto**: Microsoft y otros proveedores permiten **reducir licencias** solo en ventanas específicas (7 días al inicio de cada período).

##### Helper: `_inicio_periodo()`
**Propósito**: Calcular el inicio del período vigente actual según modalidad.

**Lógica**:
```python
def _inicio_periodo(self):
    fecha_base = self.fecha_inicio or self.contrato.fecha_inicio
    if not fecha_base:
        return None
    
    # Modalidad anual (p1y-a, p1y-m)
    if self.tipo_modalidad in ('p1y-a', 'p1y-m'):
        rd = relativedelta(date.today(), fecha_base)
        bloques = rd.years  # Cuántos años completos han pasado
        return fecha_base + relativedelta(years=bloques)
    
    # Modalidad mensual (p1m-m)
    if self.tipo_modalidad == 'p1m-m':
        total_dias = (date.today() - fecha_base).days
        bloques = total_dias // 30  # Cuántos bloques de 30 días
        return fecha_base + relativedelta(days=bloques * 30)
    
    return None
```

**Ejemplo Anual**:
- `fecha_inicio = 2023-01-15`
- `hoy = 2025-02-10`
- `años_completos = 2`
- `inicio_periodo_actual = 2025-01-15` (inicio del 3er año)

**Ejemplo Mensual**:
- `fecha_inicio = 2025-01-05`
- `hoy = 2025-11-20`
- `dias_transcurridos = 319 días`
- `bloques = 319 // 30 = 10 bloques`
- `inicio_periodo_actual = 2025-01-05 + (10*30 días) = 2025-11-04`

---

##### Propiedad: `dias_desde_inicio_periodo`
**Propósito**: Cuántos días han pasado desde el inicio del período actual.

**Fórmula**:
```python
@property
def dias_desde_inicio_periodo(self):
    inicio = self._inicio_periodo()
    return None if not inicio else (date.today() - inicio).days
```

**Ejemplo**:
- `inicio_periodo_actual = 2025-11-04`
- `hoy = 2025-11-08`
- `dias_desde_inicio_periodo = 4 días`

---

##### Propiedad: `puede_reducir`
**Propósito**: **¿Estamos en ventana de reducción?** (primeros 7 días del período).

**Fórmula**:
```python
@property
def puede_reducir(self):
    dias = self.dias_desde_inicio_periodo
    return dias is not None and dias <= 7
```

**Ejemplo**:
- `dias_desde_inicio_periodo = 4` → `puede_reducir = True` ✅
- `dias_desde_inicio_periodo = 10` → `puede_reducir = False` ❌

---

##### Propiedad: `inicio_periodo_actual` y `fin_periodo_actual`
**Propósito**: Mostrar en UI cuándo inicia y termina la ventana de reducción.

**Fórmula**:
```python
@property
def inicio_periodo_actual(self):
    return self._inicio_periodo()

@property
def fin_periodo_actual(self):
    inicio = self.inicio_periodo_actual
    return None if not inicio else inicio + relativedelta(days=7)
```

**Ejemplo**:
- `inicio_periodo_actual = 2025-11-04`
- `fin_periodo_actual = 2025-11-11`

---

##### Propiedad: `dias_hasta_fin_periodo`
**Propósito**: Cuántos días faltan para que termine la ventana de reducción.

**Fórmula**:
```python
@property
def dias_hasta_fin_periodo(self):
    fin = self.fin_periodo_actual
    return None if not fin else (fin - date.today()).days
```

---

##### Método `mensaje_inicio_periodo()`
**Propósito**: Mensajes para notificar a usuarios sobre ventanas de reducción.

**Retorna**:
- Si `dias_desde_inicio_periodo == 0`: "Hoy comienza la ventana de reducción de licencias."
- Si `dias_desde_inicio_periodo == 7`: "Hoy finaliza la ventana de reducción de licencias."
- Caso contrario: "" (sin mensaje)

**Uso**: Celery ejecuta tarea diaria que verifica esto y envía notificaciones.

---

##### Método `clean()`
**Propósito**: **Validar reducciones** antes de guardar.

**Lógica**:
```python
def clean(self):
    super().clean()
    
    # Solo validar si es contrato de licencia y modalidad con ventanas
    if (self.contrato.tipo == 'licencia'
        and self.tipo_modalidad in ('p1y-a', 'p1y-m', 'p1m-m')
        and self.pk):  # Solo si ya existe (edición)
        
        # Obtener cantidad original de BD
        original = ContratoLicencia.objects.get(pk=self.pk).cantidad
        nueva = self.cantidad
        
        # Si se reduce cantidad y NO estamos en ventana de reducción → ERROR
        if nueva < original and not self.puede_reducir:
            descripcion = (
                '7 días desde el inicio de cada año'
                if self.tipo_modalidad in ('p1y-a', 'p1y-m')
                else 'los primeros 7 días de cada bloque mensual'
            )
            raise ValidationError(
                f"No puedes reducir licencias fuera de {descripcion}."
            )
```

**Escenarios**:
- ✅ Aumentar licencias: SIEMPRE permitido
- ✅ Reducir licencias dentro de ventana (días 0-7): Permitido
- ❌ Reducir licencias fuera de ventana (días 8+): **ValidationError**

---

##### Otras Propiedades Útiles

**`dias_licenciamiento`**:
```python
@property
def dias_licenciamiento(self):
    """Días transcurridos desde fecha_inicio de la licencia."""
    fecha_base = self.fecha_inicio or self.contrato.fecha_inicio
    return None if not fecha_base else (date.today() - fecha_base).days
```

**`dias_restantes_licencia`**:
```python
@property
def dias_restantes_licencia(self):
    """Días restantes hasta fecha_fin de la licencia."""
    fecha_cierre = self.fecha_fin or self.contrato.fecha_fin
    return None if not fecha_cierre else (fecha_cierre - date.today()).days
```

---

#### `UsuarioVinculadoLicencia` (Tabla Intermedia)
**Propósito**: Asignar **licencias individuales** a usuarios específicos.

**Campos**:
- `usuario`: FK(UsuarioEmpresa, nullable) - Usuario asignado (puede ser null si es licencia genérica)
- `licencia`: FK(ContratoLicencia, related_name: `vinculos_licencia`)
- `fecha_asignacion`: DateField (auto_now_add)
- `nombre`: CharField (nullable) - Nombre alternativo (si usuario es null)
- `correo_generico`: EmailField (nullable) - Email alternativo (si usuario es null)

**Hereda**: `ModeloBaseHistorico`

**Uso**: Tracking de quién usa cada licencia (auditoría de uso de software).

---

#### `CondicionEspecial`
**Propósito**: Cláusulas especiales/legales de contratos (ej.: penalidades, garantías, confidencialidad).

**Campos**:
- `titulo`: CharField (max 255)
- `descripcion`: TextField

**Hereda**: `ModeloBaseHistorico`

---

#### `ContratoCondicionEspecial` (Tabla Intermedia)
**Propósito**: Asociar condiciones especiales a un contrato.

**Campos**:
- `contrato`: FK(ContratoEmpresaCliente, related_name: `contrato_condiciones_especiales`)
- `condicion`: FK(CondicionEspecial, related_name: `condicion_contratos`)

**Hereda**: `ModeloBaseHistorico`

---

#### `AcuerdoConfidencialidadContrato`
**Propósito**: Instancia específica de **acuerdo de confidencialidad (NDA)** para un contrato.

**Campos**:
- `contrato`: FK(ContratoEmpresaCliente, related_name: `firmas_confidencialidad`)
- `acuerdo_base`: FK(AcuerdoConfidencialidadBase, related_name: `firmas`, nullable)

**Hereda**: `ModeloBaseHistorico`

**Relación con `core.AcuerdoConfidencialidadBase`**:
- `AcuerdoConfidencialidadBase`: Template reutilizable (título, contenido HTML)
- `AcuerdoConfidencialidadContrato`: Instancia específica para un contrato (permite modificaciones sin afectar template)

---

### 🔧 Signals

**Archivo**: `contratos/signals.py`

#### Signal 1: `create_contrato_servicio_for_licencia`
**Trigger**: `post_save` de `ContratoEmpresaCliente`

**Propósito**: Cuando se crea un contrato de tipo `'licencia'`, automáticamente crear un `ContratoServicio` asociado al servicio "Servicio de Licencias".

**Lógica**:
```python
@receiver(post_save, sender=ContratoEmpresaCliente)
def create_contrato_servicio_for_licencia(sender, instance, created, **kwargs):
    if created and instance.tipo == 'licencia':
        try:
            servicio_licencias = Servicio.objects.get(nombre="Servicio de Licencias")
        except Servicio.DoesNotExist:
            return
        
        ContratoServicio.objects.create(
            contrato=instance,
            servicio_generico=servicio_licencias,
            cantidad=1,
            precio_unitario=0  # Se calculará con el signal de ContratoLicencia
        )
```

**Beneficio**: Garantiza que contratos de licencia tengan un servicio asociado (requisito para facturación).

---

#### Signal 2: `update_contrato_servicio_price`
**Trigger**: `post_save` de `ContratoLicencia`

**Propósito**: Al crear/editar una licencia, **actualizar automáticamente** el `precio_unitario` del `ContratoServicio "Servicio de Licencias"` sumando todas las licencias del contrato.

**Lógica**:
```python
@receiver(post_save, sender=ContratoLicencia)
def update_contrato_servicio_price(sender, instance, **kwargs):
    contrato = instance.contrato
    
    # Buscar servicio "Servicio de Licencias"
    servicio_licencias_ct = ContentType.objects.get_for_model(Servicio)
    servicio_licencias = Servicio.objects.get(nombre="Servicio de Licencias")
    
    # Buscar ContratoServicio asociado
    contrato_servicio = ContratoServicio.objects.filter(
        contrato=contrato,
        content_type=servicio_licencias_ct,
        object_id=servicio_licencias.id
    ).first()
    
    if not contrato_servicio:
        return
    
    # Calcular total: Σ(cantidad * precio_unitario) de todas las licencias
    total_price = ContratoLicencia.objects.filter(contrato=contrato).aggregate(
        total=Sum(F('cantidad') * F('precio_unitario'), output_field=DecimalField())
    )['total'] or 0
    
    # Actualizar precio del ContratoServicio
    contrato_servicio.precio_unitario = total_price
    contrato_servicio.save()
```

**Ejemplo**:
- Licencia 1: 10 licencias × $50 = $500
- Licencia 2: 5 licencias × $100 = $500
- **Total ContratoServicio**: $1,000

**Beneficio**: Precio del servicio se actualiza automáticamente al agregar/editar licencias.

---

### 📊 Serializers

#### `ContratoEmpresaClienteSerializer`
**Propósito**: Serializar contrato completo con todas sus relaciones anidadas.

**Campos Anidados** (read-only):
- `contrato_servicios`: ContratoServicioSerializer(many=True)
- `contrato_visitas`: ContratoVisitaSerializer(many=True)
- `contrato_licencias`: ContratoLicenciaSerializer(many=True)
- `contrato_condiciones_especiales`: ContratoCondicionEspecialSerializer(many=True)
- `vinculos_contrato`: UsuarioVinculadoContratoSerializer(many=True)
- `firmas_confidencialidad`: AcuerdoConfidencialidadContratoSerializer(many=True)

**Campos Calculados**:
| Campo | Descripción |
|-------|-------------|
| `estado_label` | Texto legible del estado (Borrador/Activo/Finalizado) |
| `tipo_label` | Texto legible del tipo (Servicios/Licencia/Mixto) |
| `valido` | Booleano: ¿Contrato cumple requisitos mínimos? |
| `datos_empresa` | EmpresaContratoSerializer(empresa_prestadora) (nested) |
| `datos_cliente` | EmpresaContratoSerializer(empresa_cliente) (nested) |

**Método `get_valido()`**:
```python
def get_valido(self, obj):
    # Contrato válido SI:
    # 1. Estado = 'activo'
    # 2. Tiene al menos 1 firma de confidencialidad
    # 3. Tiene al menos 1 usuario vinculado
    # 4. Tiene al menos 1 servicio asociado
    
    if obj.estado != 'activo':
        return False
    if not obj.firmas_confidencialidad.exists():
        return False
    if not obj.vinculos_contrato.exists():
        return False
    if not obj.contrato_servicios.exists():
        return False
    return True
```

**Uso**: Frontend valida si contrato está completo antes de ejecutar acciones (facturar, crear OT, etc.).

---

#### `ContratoLicenciaSerializer`
**Propósito**: Serializar licencia con **todos los cálculos de ventanas de reducción**.

**Campos Calculados**:
| Campo | Descripción |
|-------|-------------|
| `tipo_modalidad_label` | Texto legible (Anual pago anual/Mensual) |
| `nombre_licencia` | `licencia.nombre` |
| `proveedor_licencia` | `licencia.proveedor` |
| `tipo_moneda_label` | Texto legible (USD/CLP/EUR) |
| `licencias_disponibles` | `cantidad - vinculos_licencia.count()` (libres) |
| `fecha_inicio_edicion` | `inicio_periodo_actual.isoformat()` |
| `fecha_fin_edicion` | `fin_periodo_actual.isoformat()` |
| `nombre_contrato` | `contrato.nombre` |
| `se_puede_reducir` | `puede_reducir` (booleano) |
| `dias_restantes_licencia` | `dias_restantes_licencia` (int) |

**Uso**: Frontend muestra alertas visuales cuando se acerca ventana de reducción y bloquea reducciones fuera de ventana.

---

#### `ContratoServicioSerializer`
**Propósito**: Serializar servicio/plan con polimorfismo (GenericForeignKey).

**Campos Calculados**:
- `servicio_generico`: Nested serializer (ServicioSerializer o PlanServicioSerializer según content_type)
- `nombre`: `servicio_generico.nombre` (campo plano para filtros)

---

#### `UsuarioVinculadoContratoSerializer`
**Campos Calculados**:
- `datos_usuario`: `{"nombre": usuario.usuario.get_nombre_completo(), "email": usuario.usuario.email}`
- `tipo_usuario_label`: Texto legible (Gerencia/Técnico/Representante Legal)
- `existe_envio`: `EnvioContratoFirmaUsuario.pk` si existe, sino `None` (para validar si ya se envió firma)

---

### 🌐 ViewSets y Endpoints

#### `ContratoEmpresaClienteViewSet`
**Endpoint Base**: `/api/contratos/`

**Custom Actions**:

##### `@action: filtrar-por-empresa-cliente`
**Endpoint**: `GET /api/contratos/filtrar-por-empresa-cliente/{empresa_pk}/{cliente_pk}/`

**Propósito**: Obtener contratos donde `empresa_prestadora` y `empresa_cliente` coincidan.

**Uso**: Módulo de contratos → Ver todos los contratos entre 2 empresas específicas.

---

##### `@action: actualizar`
**Endpoint**: `PUT /api/contratos/{id}/actualizar/`

**Propósito**: Actualizar contrato y **todas sus relaciones intermedias** en una sola transacción atómica.

**Body Esperado**:
```json
{
    "contrato": {
        "nombre": "Nuevo nombre",
        "fecha_fin": "2026-12-31"
    },
    "visitas": [
        {
            "id": 1,  // Editar existente
            "frecuencia": "quincenal",
            "cantidad": 2
        },
        {
            "visita_id": 3,  // Crear nueva
            "frecuencia": "mensual",
            "cantidad": 1
        }
    ],
    "eliminar_visitas": [2],  // IDs de visitas a eliminar
    "licencias": [...],  // Similar a visitas
    "eliminar_licencias": [4]
}
```

**Lógica** (simplificada):
```python
@action(detail=True, methods=['put'], url_path='actualizar')
def actualizar(self, request, pk=None):
    with transaction.atomic():
        contrato = self.get_object()
        
        # 1. Actualizar campos del contrato
        contrato_serializer = ContratoEmpresaClienteSerializer(
            contrato, data=request.data.get("contrato", {}), partial=True
        )
        contrato_serializer.is_valid(raise_exception=True)
        contrato_serializer.save()
        
        # 2. Actualizar visitas
        visitas_data = request.data.get("visitas", [])
        visitas_a_eliminar = request.data.get("eliminar_visitas", [])
        
        # Eliminar
        ContratoVisita.objects.filter(pk__in=visitas_a_eliminar, contrato=contrato).delete()
        
        # Editar/Crear
        for item in visitas_data:
            if "id" in item:  # Editar
                cv = ContratoVisita.objects.get(id=item["id"], contrato=contrato)
                cv.frecuencia = item.get("frecuencia", cv.frecuencia)
                cv.cantidad = item.get("cantidad", cv.cantidad)
                cv.save()
            else:  # Crear
                ContratoVisita.objects.create(
                    contrato=contrato,
                    visita_id=item["visita_id"],
                    frecuencia=item["frecuencia"],
                    cantidad=item["cantidad"]
                )
        
        # 3. Repetir lógica para licencias, condiciones, etc.
        
        return Response(ContratoEmpresaClienteSerializer(contrato).data)
```

**Beneficio**: Frontend puede actualizar contrato completo en una sola llamada (evita múltiples requests y problemas de consistencia).

---

## 📦 App: bodegas/

### Propósito
Gestiona el **sistema de inventario completo**: bodegas físicas, stock de items con historial (django-simple-history), movimientos de entrada/salida, órdenes de compra, compras nacionales/internacionales, tomas de inventario con fotos, y cálculo de PMP (Precio Medio Ponderado).

---

### 🗄️ Modelos

#### `Bodega`
**Propósito**: Almacén físico de la empresa.

**Campos**:
- `nombre`: CharField (max 250) - Nombre de la bodega (ej.: "Bodega Central", "Sucursal Santiago")
- `sucursal`: FK(SucursalEmpresa) - Sucursal a la que pertenece
- `stocks`: M2M(ItemEmpresa) through `StockItemEnBodega`

**Hereda**: `ModeloBase`

---

#### `StockItemEnBodega`
**Propósito**: **Registro de stock** de un item en una bodega específica con **historial completo** de movimientos.

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `bodega` | FK(Bodega, related_name: `stock_items`) | Bodega donde está el item |
| `item` | OneToOneField(ItemEmpresa) | Item del que se hace tracking ⭐ |
| `cantidad` | IntegerField (default 0) | Cantidad disponible |
| `cantidad_no_disponible` | IntegerField (default 0) | Cantidad reservada/comprometida |
| `pmp` | IntegerField (default 0) | Precio Medio Ponderado (PMP) |
| `compras` | M2M(ContentType) | Historial de compras (OC/Compra) |

**Hereda**: `ModeloBaseHistorico` (django-simple-history tracking completo)

**Constraint**: `OneToOneField(ItemEmpresa)` → **Un item solo puede estar en UNA bodega** (no multi-bodega por item, sino por empresa).

**Cálculo de PMP** (Precio Medio Ponderado):
```
PMP = (Stock_Anterior * PMP_Anterior + Cantidad_Nueva * Precio_Nuevo) / (Stock_Anterior + Cantidad_Nueva)
```

**Ejemplo**:
- Stock actual: 10 unidades × PMP $100 = $1,000
- Nueva compra: 5 unidades × $120 = $600
- **Nuevo PMP**: ($1,000 + $600) / (10 + 5) = $1,600 / 15 = **$106.67**

**Uso de `cantidad_no_disponible`**:
- Items reservados en órdenes de trabajo (no se pueden vender)
- Items en tránsito (comprados pero no recibidos)

---

#### `OrdenCompra`
**Propósito**: **Orden de compra** emitida a proveedor (pre-compra, tracking de pedidos).

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `codigo` | CharField (unique) | Código auto-generado (4 chars alfanuméricos) |
| `cotizacion` | FileField | PDF de cotización del proveedor (adjunto) |
| `proveedor` | FK(ProveedorEmpresa) | Proveedor al que se compra |
| `oc_cliente` | FK(Empresa) | Empresa cliente (si OC es para proyecto específico) |
| `oc_empresa` | FK(Empresa) | Empresa que emite la OC |
| `creado_por` | FK(UsuarioEmpresa) | Usuario que creó la OC |
| `relacion_cotizacion` | FK(Cotizacion) | Cotizacion original (si aplica) |
| `observaciones` | TextField | Observaciones generales |
| `estado` | CharField (choices) | Estado de la OC |
| `items` | M2M(ItemEmpresa) through `ItemEnOrdenCompra` |
| `dolar_observado` | PositiveIntegerField | Tasa USD al momento (si compra en USD) |
| `fecha_compra` | DateField | Fecha de compra |

**Estados de OC** (`ESTADOS_OC`):
- `'-'`: Pendiente de aprobación
- `'1'`: Aprobada
- `'2'`: En tránsito
- `'3'`: Recibida parcial
- `'4'`: Recibida completa
- `'5'`: Cancelada

**Hereda**: `ModeloBaseHistorico`

**Auto-generación de `codigo`** (método `save()`):
```python
def save(self, *args, **kwargs):
    if not self.codigo:
        self.codigo = generate_random_code()  # ← Genera 4 chars alfanuméricos
    return super().save(*args, **kwargs)
```

**Helper Function**:
```python
def generate_random_code():
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(4))  # ej.: "aB3x"
```

---

#### `ItemEnOrdenCompra` (Tabla Intermedia)
**Propósito**: Item específico en una orden de compra con cantidad y precio.

**Campos**:
- `orden_compra`: FK(OrdenCompra)
- `item`: FK(ItemEmpresa)
- `cantidad`: IntegerField
- `precio`: IntegerField

**Hereda**: `ModeloBase`

---

#### `Compra`
**Propósito**: **Compra efectiva** (recepción de mercadería) con documentación adjunta.

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `codigo` | CharField (unique) | Código auto-generado |
| `tipo` | CharField (choices) | Tipo de compra (nacional, internacional) |
| `sucursal` | FK(SucursalEmpresa) | Sucursal receptora |
| `proveedor` | FK(ProveedorEmpresa) | Proveedor |
| `creado_por` | FK(UsuarioEmpresa) | Usuario que registra la compra |
| `observaciones` | TextField | Observaciones |
| `estado` | CharField (choices) | Estado de la compra |
| `items` | M2M(ItemEmpresa) through `ItemEnCompra` |
| `bodega_temporal` | FK(Bodega) | Bodega donde ingresa la mercadería |

**Estados de Compra** (`ESTADO_CR`):
- `'-'`: Pendiente de revisión
- `'1'`: Aprobada
- `'2'`: Rechazada

**Propiedad `total_compra`**:
```python
@property
def total_compra(self):
    return sum(l.cantidad * l.precio for l in self.itemencompra_set.all())
```

**Hereda**: `ModeloBaseHistorico`

---

#### `ItemEnCompra` (Tabla Intermedia)
**Campos**:
- `compra`: FK(Compra)
- `item`: FK(ItemEmpresa)
- `cantidad`: IntegerField
- `precio`: IntegerField

**Hereda**: `ModeloBase`

---

#### `ArchivoCompra`
**Propósito**: Adjuntar documentos de compra (boletas, facturas, guías de despacho, fotos).

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `opcion` | CharField (choices) | Tipo de documento |
| `archivo` | FileField | Archivo PDF/imagen |
| `imagen` | TextField | Imagen en base64 (alternativa a archivo) |
| `creado_por` | FK(UsuarioEmpresa) | Usuario que adjuntó |
| `compra` | FK(Compra, related_name: `archivos`) | Compra asociada |
| `tipo` | CharField (choices) | Tipo de archivo |
| `observaciones` | TextField | Observaciones del archivo |

**Opciones de Archivo** (`OPCIONES_ARCHIVO`):
- `'boleta'`: Boleta de compra
- `'factura'`: Factura
- `'guia'`: Guía de despacho
- `'otro'`: Otro documento

**Hereda**: `ModeloBase`

---

#### `TomaInventario`
**Propósito**: **Toma de inventario** (conteo físico de stock) con registro fotográfico.

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `bodegas` | M2M(Bodega) | Bodegas a inventariar |
| `fecha_inicio` | DateTimeField | Inicio del inventario |
| `fecha_termino` | DateTimeField | Fin del inventario |
| `motivo` | TextField | Razón del inventario (ej.: "Auditoría anual", "Ajuste de stock") |
| `items_a_inventariar` | M2M(StockItemEnBodega) through `ItemEnTomaInventario` |
| `creado_por` | FK(UsuarioEmpresa) | Usuario que creó la toma |

**Hereda**: `ModeloBase`

**Ordering**: `-fecha_creacion` (más recientes primero)

---

#### `EstadoTomaInventario`
**Propósito**: Timeline de estados de una toma de inventario.

**Campos**:
- `toma_inventario`: FK(TomaInventario, related_name: `estados`)
- `estado`: CharField (choices) - Estado de la toma
- `usuario`: FK(UsuarioEmpresa) - Usuario que cambió el estado
- `fecha_cambio`: DateTimeField - Timestamp del cambio
- `observaciones`: TextField - Observaciones del cambio

**Estados de Toma** (`ESTADO_TOMA_INVENTARIO`):
- `'pendiente'`: Creada, no iniciada
- `'en_proceso'`: En ejecución
- `'finalizada'`: Completada
- `'cancelada'`: Cancelada

**Hereda**: `ModeloBase`

---

#### `ItemEnTomaInventario`
**Propósito**: Item específico en una toma de inventario con cantidad original y encontrada.

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `toma_inventario` | FK(TomaInventario) | Toma de inventario |
| `stock_item` | FK(StockItemEnBodega) | Stock original del item |
| `cantidad_original` | IntegerField | Cantidad esperada (según sistema) |
| `cantidad_encontrada` | IntegerField | Cantidad contada físicamente |
| `estado` | CharField (choices) | Estado del item |
| `observaciones` | TextField | Observaciones (ej.: "Dañado", "Fecha vencida") |

**Estados de Item Inventariado** (`ESTADO_ITEM_INTEVENTARIADO`):
- `'por_inventariar'`: Pendiente de contar
- `'inventariado'`: Contado y registrado
- `'diferencia'`: Diferencia encontrada (cantidad_original ≠ cantidad_encontrada)

**Hereda**: `ModeloBase`

**Cálculo de Diferencia**:
```python
diferencia = cantidad_encontrada - cantidad_original
```
- Si `diferencia > 0`: Sobrante (más stock del esperado)
- Si `diferencia < 0`: Faltante (menos stock del esperado)
- Si `diferencia == 0`: OK (coincide con sistema)

---

#### `ImagenDeItemEnTomaInventario`
**Propósito**: Fotos del item durante la toma de inventario (evidencia de estado, ubicación).

**Campos**:
- `item`: FK(ItemEnTomaInventario, related_name: `imagenes`)
- `imagen`: TextField - Imagen en base64

**Hereda**: `ModeloBase`

**Uso**: App móvil toma fotos de items durante inventario, se adjuntan como evidencia.

---

## 📦 App: items/

### Propósito
Gestiona el **catálogo de productos y servicios** de la empresa: items (productos físicos/servicios), categorías, fabricantes, proveedores, imágenes, campos adicionales personalizables (metadata dinámica).

---

### 🗄️ Modelos

#### `Categoria`
**Propósito**: Categorizar items (Hardware, Software, Consumibles, Servicios, etc.).

**Campos**:
- `nombre`: CharField (max 250)

**Hereda**: `ModeloBase`

**Ordering**: `['nombre']` (alfabético)

---

#### `Fabricante`
**Propósito**: Fabricante de productos (ej.: Dell, HP, Microsoft, Cisco).

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `nombre` | CharField (max 64) | Nombre del fabricante |
| `pagina_web` | CharField (nullable) | Website oficial |
| `email_soporte` | CharField (nullable) | Email de soporte técnico |
| `telefono_soporte` | CharField (max 16, nullable) | Teléfono de soporte |

**Ordering**: `['nombre']`

---

#### `ProveedorEmpresa`
**Propósito**: Proveedor específico de la empresa (vendor, distribuidor).

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `nombre` | CharField (max 250) | Razón social del proveedor |
| `rut` | CharField (max 250) | RUT del proveedor |
| `direccion` | CharField (nullable) | Dirección fiscal |
| `region`, `provincia`, `comuna` | IntegerField | Ubicación geográfica (Chile) |
| `pagina_web` | CharField (nullable) | Website del proveedor |
| `telefono` | CharField (max 16, nullable) | Teléfono de contacto |
| `empresa` | FK(Empresa) | Empresa que registra el proveedor |
| `ejecutivo_asignado` | CharField (nullable) | Nombre del ejecutivo de cuentas |
| `email_ejecutivo` | EmailField (nullable) | Email del ejecutivo |
| `catalogo_web` | CharField (nullable) | URL del catálogo online |
| `recargo_dolar` | IntegerField (default 5) | Recargo sobre USD (margen cambiario) |

**Hereda**: `ModeloBase`

**Uso**: Cada empresa tiene su lista de proveedores (multi-tenant).

---

#### `CampoAdicionalProveedor`
**Propósito**: Definir **campos personalizados** por proveedor (metadata dinámica).

**Campos**:
- `nombre`: CharField (max 50) - Nombre del campo (ej.: "SKU Proveedor", "Garantía Meses")
- `proveedor`: FK(ProveedorEmpresa)

**Hereda**: `ModeloBase`

**Ejemplo**:
```python
CampoAdicionalProveedor.objects.create(
    nombre="SKU Proveedor",
    proveedor=proveedor_dell
)
```

---

#### `CampoAdicionalItem` (Tabla Intermedia)
**Propósito**: Valor del campo adicional para un item específico.

**Campos**:
- `campo`: FK(CampoAdicionalProveedor)
- `item`: FK(ItemEmpresa)
- `valor`: TextField - Valor del campo

**Hereda**: `ModeloBase`

**Ejemplo**:
```python
CampoAdicionalItem.objects.create(
    campo=campo_sku,  # "SKU Proveedor"
    item=laptop_dell,
    valor="DL-12345-US"
)
```

**Uso**: Permite definir campos personalizados por proveedor sin modificar modelo `ItemEmpresa`.

---

#### `ItemEmpresa`
**Propósito**: **Producto o servicio** del catálogo de la empresa.

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `nombre` | CharField (max 250) | Nombre del item |
| `descripcion_corta` | CharField (max 45, nullable) | Descripción breve (referencia rápida) |
| `fabricante` | FK(Fabricante, nullable) | Fabricante del producto |
| `categoria` | FK(Categoria, nullable) | Categoría del item |
| `empresa` | FK(Empresa) | Empresa a la que pertenece el item |
| `proveedores_empresa` | M2M(ProveedorEmpresa) | Proveedores que venden el item |
| `comentarios` | TextField (nullable) | Comentarios internos |
| `codigo_barras` | TextField (unique, nullable) | Código de barras (EAN-13, UPC, etc.) |
| `campos_adicionales` | M2M(CampoAdicionalProveedor) through `CampoAdicionalItem` |

**Hereda**: `ModeloBase`

**Uso**: Base del sistema de inventario, cotizaciones, OC, compras.

---

#### `ImagenItem`
**Propósito**: Imágenes del item (fotos de producto, datasheet, manual).

**Campos**:
- `item`: FK(ItemEmpresa, related_name: `imagenes`)
- `imagen`: TextField - Imagen en base64 o URL

**Uso**: Galería de imágenes en cotizaciones, fichas técnicas.

---

## 🔗 Relaciones Entre Modelos (Contratos ↔ Bodegas ↔ Items)

```
ContratoEmpresaCliente (contratos)
├── 1:N → ContratoLicencia (contratos)
│   ├── N:1 → Licencia (contratos)
│   └── M:M → UsuarioEmpresa via UsuarioVinculadoLicencia
├── 1:N → ContratoServicio (contratos)
│   └── GenericFK → Servicio o PlanServicio
└── 1:N → ContratoVisita (contratos)
    └── N:1 → Visita (contratos)

Bodega (bodegas)
├── N:1 → SucursalEmpresa (empresas)
└── 1:N → StockItemEnBodega (bodegas)
    ├── 1:1 → ItemEmpresa (items) ⭐ OneToOne
    └── Historia (simple-history tracking)

OrdenCompra (bodegas)
├── N:1 → ProveedorEmpresa (items)
├── N:1 → Empresa (oc_empresa)
├── N:1 → Empresa (oc_cliente)
├── N:1 → Cotizacion (cotizaciones) - opcional
└── M:M → ItemEmpresa via ItemEnOrdenCompra

Compra (bodegas)
├── N:1 → ProveedorEmpresa (items)
├── N:1 → SucursalEmpresa (empresas)
├── N:1 → Bodega (bodega_temporal)
├── M:M → ItemEmpresa via ItemEnCompra
└── 1:N → ArchivoCompra (bodegas)

TomaInventario (bodegas)
├── M:M → Bodega (bodegas)
├── M:M → StockItemEnBodega via ItemEnTomaInventario
└── 1:N → EstadoTomaInventario (bodegas)

ItemEmpresa (items)
├── N:1 → Empresa (empresas)
├── N:1 → Categoria (items)
├── N:1 → Fabricante (items)
├── M:M → ProveedorEmpresa (items)
├── M:M → CampoAdicionalProveedor via CampoAdicionalItem
├── 1:N → ImagenItem (items)
└── 1:1 → StockItemEnBodega (bodegas) ⭐ Inverso del OneToOne
```

---

## 🔑 Conceptos Clave

### Contratos

1. **Polimorfismo en ContratoServicio**: GenericForeignKey permite asociar Servicio o PlanServicio al mismo modelo.

2. **Ventanas de Reducción de Licencias**: Lógica compleja basada en modalidades (p1y-a, p1y-m, p1m-m) con validaciones estrictas.

3. **Signals Auto-calculados**: Precio de "Servicio de Licencias" se actualiza automáticamente al agregar/editar licencias.

4. **Historial Completo**: `ModeloBaseHistorico` en modelos críticos (ContratoEmpresaCliente, ContratoLicencia, etc.) permite auditoría completa.

5. **Firmas Digitales con UUID**: Cada usuario recibe link único para firmar contrato.

---

### Bodegas

1. **Stock con Historial**: `StockItemEnBodega` usa `ModeloBaseHistorico` → tracking de TODOS los movimientos (entradas, salidas, ajustes).

2. **PMP (Precio Medio Ponderado)**: Se calcula automáticamente en cada entrada de stock.

3. **Tomas de Inventario con Fotos**: Sistema móvil permite tomar fotos durante conteo físico (evidencia de estado/ubicación).

4. **OrdenCompra vs. Compra**: OC = pedido pendiente, Compra = recepción efectiva de mercadería.

5. **Códigos Auto-generados**: OrdenCompra y Compra tienen códigos únicos de 4 caracteres alfanuméricos.

---

### Items

1. **Campos Adicionales Dinámicos**: Permite agregar metadata personalizada por proveedor sin modificar esquema de BD.

2. **OneToOne Item-Stock**: Un item solo puede estar en UNA bodega (no multi-bodega por item, sino por empresa).

3. **Multi-Proveedor**: Un item puede tener múltiples proveedores (comparación de precios).

4. **Código de Barras Único**: Permite escaneo rápido en compras/ventas/inventario.

---

## 🧪 Testing

### Tests Importantes a Cubrir

#### contratos/
- [ ] ContratoLicencia: validar ventanas de reducción (dentro/fuera de ventana, modalidades p1y-a/p1y-m/p1m-m)
- [ ] ContratoLicencia: calcular inicio_periodo_actual, fin_periodo_actual, puede_reducir
- [ ] Signal: crear contrato tipo='licencia' → verifica que se crea ContratoServicio "Servicio de Licencias"
- [ ] Signal: crear/editar ContratoLicencia → verifica que actualiza precio_unitario de ContratoServicio
- [ ] ContratoEmpresaCliente.actualizar_estado(): verifica auto-finalización de contratos vencidos

#### bodegas/
- [ ] StockItemEnBodega: calcular PMP tras múltiples entradas con precios diferentes
- [ ] OrdenCompra/Compra: auto-generación de códigos únicos (4 chars alfanuméricos)
- [ ] TomaInventario: calcular diferencias (cantidad_encontrada - cantidad_original)
- [ ] ArchivoCompra: adjuntar múltiples archivos (boleta, factura, guía)

#### items/
- [ ] CampoAdicionalItem: crear campos dinámicos, obtener valores por item
- [ ] ItemEmpresa: código_barras único (constraint)
- [ ] ProveedorEmpresa: recargo_dolar por defecto (5)

---

## 📚 Referencias Cruzadas

- [core-cuentas.md](./core-cuentas.md): ModeloBase, ModeloBaseHistorico, User, PersonalizacionUsuario
- [empresas-cotizaciones.md](./empresas-cotizaciones.md): Empresa, SucursalEmpresa, UsuarioEmpresa, Cotizacion
- [instructions/backend-instructions.md](../backend-instructions.md): Guía general backend
- [ARQUITECTURA_SISTEMA.md](../../ARQUITECTURA_SISTEMA.md): Visión general del sistema

---

**Última actualización**: 2025-11-05  
**Próximo documento**: `ordentrabajo-recursos-rendiciones.md` (apps ordentrabajo/, recursos/, rendiciones/, visitas/)
