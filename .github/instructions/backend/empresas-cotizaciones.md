---
title: "Backend: Apps Empresas y Cotizaciones"
scope: "backend"
status: "active"
last_updated: "2025-11-05"
---

# 🏢 Apps Backend: Empresas y Cotizaciones

## Objetivo
Documentar las apps `empresas/` y `cotizaciones/` del backend Django, que gestionan la estructura organizacional (empresas, sucursales, empleados, relaciones cliente-proveedor) y el sistema de cotizaciones (presupuestos, items, seguimiento, envío por email).

---

## 📦 App: empresas/

### Propósito
Gestiona la **estructura organizacional completa** del ERP: empresas, sucursales, empleados (usuarios vinculados a sucursales), relaciones de negocio (cliente-proveedor), y equipos de trabajo.

---

### 🗄️ Modelos

#### `Empresa`
**Propósito**: Entidad legal (cliente o prestador de servicios). Base del sistema multiempresa.

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `nombre` | CharField (max 150) | Razón social de la empresa |
| `rut_empresa` | CharField (max 12, unique, nullable) | RUT de la empresa (ej.: 76123456-7) |
| `direccion_principal` | CharField | Dirección fiscal principal |
| `telefono` | CharField | Teléfono de contacto |
| `email` | EmailField | Email corporativo |
| `sitio_web` | URLField | Website de la empresa |
| `logo` | TextField | Logo corporativo (URL o base64) |
| `firma_empresa` | TextField | Firma digital para documentos |
| `recargo` | IntegerField (default 0) | Porcentaje de recargo por defecto (para cotizaciones) |
| `ppm` | DecimalField (default 1.00) | PPM (Pequeña y Mediana Minería - impuesto Chile) |
| `clientes` | M2M (self) | Relación con otras empresas como clientes (through `RelacionEmpresa`) |

**Relaciones**:
- `1:N` → `SucursalEmpresa` (related_name: `sucursales`)
- `M2M` → `self` (through `RelacionEmpresa`, related_name: `clientes`)
- `1:N` → `Cotizacion` (como empresa o como cliente)
- `1:N` → `Contrato` (relación empresa-cliente)

**Hereda**: `ModeloBase` (fecha_creacion, fecha_modificacion)

**Métodos Útiles**:
```python
empresa.sucursales.all()  # Lista de sucursales
empresa.clientes.all()  # Empresas a las que presta servicios (vía RelacionEmpresa)
```

---

#### `RelacionEmpresa` (Tabla Intermedia para M2M)
**Propósito**: Define **relación de negocio** entre dos empresas (prestador de servicios ↔ cliente).

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `prestador_servicios` | FK(Empresa) | Empresa que presta servicios |
| `cliente` | FK(Empresa) | Empresa que es cliente |
| `tipo_relacion` | CharField | Tipo de relación (ej.: "Servicios IT", "Mantenimiento") |

**Constraint**: `unique_together = ('prestador_servicios', 'cliente')` (relación única por par)

**Uso**:
```python
# Empresa A presta servicios a Empresa B
RelacionEmpresa.objects.create(
    prestador_servicios=empresa_a,
    cliente=empresa_b,
    tipo_relacion='Mantenimiento preventivo'
)

# Obtener todos los clientes de Empresa A
clientes = RelacionEmpresa.objects.filter(prestador_servicios=empresa_a)
```

---

#### `SucursalEmpresa`
**Propósito**: **Sucursal física** de una empresa (casa matriz, sucursales regionales, oficinas).

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `nombre` | CharField (max 150) | Nombre de la sucursal (ej.: "Casa Matriz", "Sucursal Centro") |
| `direccion` | CharField | Dirección completa de la sucursal |
| `telefono` | CharField | Teléfono de sucursal |
| `email` | EmailField | Email de sucursal |
| `region`, `provincia`, `comuna` | IntegerField | Ubicación geográfica (Chile) |
| `empresa` | FK(Empresa) | Empresa a la que pertenece (related_name: `sucursales`) |

**Relaciones**:
- `N:1` → `Empresa` (sucursal pertenece a una empresa)
- `1:N` → `UsuarioEmpresa` (empleados asignados a sucursal)
- `1:N` → `PersonalizacionUsuario.sucursal_principal` (usuarios operan desde esta sucursal)

**Hereda**: `ModeloBase`

**Creación Automática**: Al crear una `Empresa`, un **signal** (`empresas/signals.py`) crea automáticamente una sucursal "Casa Matriz":
```python
@receiver(post_save, sender=Empresa)
def crear_casa_matriz(sender, instance, created, **kwargs):
    if created:
        SucursalEmpresa.objects.create(
            nombre="Casa Matriz",
            empresa=instance,
            direccion=instance.direccion_principal
        )
```

---

#### `UsuarioEmpresa`
**Propósito**: **Vinculación empleado-empresa** con datos laborales, permisos específicos de empresa y cálculo de vacaciones.

**Campos Laborales**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `usuario` | OneToOneField(User) | Usuario de Django asociado |
| `sucursal` | FK(SucursalEmpresa) | Sucursal donde trabaja el empleado |
| `fecha_ingreso` | DateField | Fecha de inicio de contrato (default: hoy) |
| `fecha_contrato` | DateField | Fecha oficial de contrato |
| `cargo` | CharField | Cargo del empleado (ej.: "Técnico", "Administrador") |
| `estado` | CharField (choices) | Estado del empleado (activo, inactivo, finiquitado) |
| `grupos` | M2M(Group) | Grupos de permisos de Django (staff, bodeguero, etc.) |

**Estados Disponibles** (`ESTADO_USUARIO_EMPRESA`):
- `'1'`: Activo
- `'2'`: Inactivo
- `'3'`: Finiquitado

**Métodos de Vacaciones**:
```python
# ¿Tiene derecho a vacaciones? (fecha_contrato >= 1 año)
tiene_derecho = usuario_empresa.tiene_derecho_a_vacaciones()

# Años de servicio (desde fecha_contrato)
años = usuario_empresa.calcular_años_servicio()

# Días de vacaciones acumulados (15 días base, +1 día cada 3 años tras 10 años)
dias = usuario_empresa.calcular_dias_vacaciones_acumulados()
```

**Lógica de Vacaciones** (Legislación Chilena):
- **Base**: 15 días hábiles por año trabajado
- **Progresivo**: +1 día adicional cada 3 años trabajados **después** de los primeros 10 años
- **Ejemplo**:
  - 1 año de servicio: 15 días
  - 10 años de servicio: 15 días
  - 13 años de servicio: 16 días (15 + 1)
  - 16 años de servicio: 17 días (15 + 2)

**Relaciones**:
- `1:1` → `User` (cuentas.User)
- `N:1` → `SucursalEmpresa` (empleado pertenece a sucursal)
- `M:M` → `Group` (permisos basados en grupos de Django)

**Hereda**: `ModeloBase`

---

### 📊 Serializers

#### `EmpresaSerializer`
**Propósito**: Serializar empresa con lista de sucursales anidadas.

**Campos Especiales**:
```python
sucursales = SucursalEmpresaSerializer(many=True, read_only=True)  # ← Lista anidada
```

**Uso**: GET /api/empresas/{id}/ retorna empresa con todas sus sucursales.

---

#### `SucursalEmpresaSerializer`
**Propósito**: CRUD de sucursales.

**Campos**: `__all__` (todos los campos del modelo)

---

#### `UsuarioEmpresaSerializer`
**Propósito**: Serializar empleado con datos calculados.

**Campos Calculados** (SerializerMethodField):
| Campo | Descripción |
|-------|-------------|
| `nombre_usuario` | `user.get_nombre_completo()` (4 nombres) |
| `email_usuario` | `user.email` |
| `papeleta` | ¿Pendiente? (relacionado con vacaciones/permisos) |
| `estado_label` | Texto legible del estado (Activo/Inactivo/Finiquitado) |
| `is_active` | `user.is_active` (puede loguear) |
| `nombre_sucursal` | `sucursal.nombre` |

**Uso**: Mostrar datos completos de empleado en UI sin hacer queries adicionales.

---

#### `RelacionEmpresaSerializer`
**Propósito**: Serializar relación con datos completos de prestador y cliente.

**Campos Especiales**:
```python
info_prestador_servicios = EmpresaSerializer(source='prestador_servicios', read_only=True)
info_cliente = EmpresaSerializer(source='cliente', read_only=True)
```

**Uso**: Ver relación con nombres completos de empresas (no solo IDs).

---

#### `EmpresaContratoSerializer`
**Propósito**: Serializer específico para módulo de contratos.

**Campos Calculados**:
```python
representantes_legales = SerializerMethodField()  # ← Lista de usuarios con grupo "representante_legal"

def get_representantes_legales(self, obj):
    usuarios = UsuarioEmpresa.objects.filter(
        sucursal__empresa=obj,
        grupos__name="representante_legal"
    )
    return UsuarioEmpresaSerializer(usuarios, many=True).data
```

**Uso**: Al crear contrato, frontend muestra lista de representantes legales disponibles para firma.

---

### 🌐 ViewSets y Endpoints

#### `EmpresaViewSet`
**Endpoint Base**: `/api/empresas/`

**Métodos Estándar**:
- `GET /api/empresas/` - Listar empresas (filtrado según permisos)
- `POST /api/empresas/` - Crear empresa (auto-crea Casa Matriz vía signal)
- `GET /api/empresas/{id}/` - Detalle de empresa
- `PUT/PATCH /api/empresas/{id}/` - Editar empresa
- `DELETE /api/empresas/{id}/` - Eliminar empresa ⚠️ (cascade a sucursales)

**Custom Actions** (filtros por contexto):

##### `@action: select-empresas`
**Endpoint**: `GET /api/empresas/select-empresas/`

**Propósito**: Obtener lista de empresas según permisos del usuario.

**Lógica**:
```python
def select_empresas(self, request):
    user = request.user
    grupos_usuario = UsuarioEmpresa.objects.filter(usuario=user).first()
    
    if grupos_usuario and grupos_usuario.grupos.filter(name__in=['staff', 'superadmin']).exists():
        # Staff/superadmin: Ve TODAS las empresas
        empresas = Empresa.objects.all()
    else:
        # Usuario regular: Solo ve su propia empresa
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        empresas = Empresa.objects.filter(pk=personalizacion.sucursal_principal.empresa.pk)
    
    return Response(EmpresaSerializer(empresas, many=True).data)
```

**Uso**: Dropdowns de selección de empresa en frontend (filtrado automático por permisos).

---

##### `@action: mis-clientes`
**Endpoint**: `GET /api/empresas/mis-clientes/`

**Propósito**: Obtener lista de **clientes** de la empresa del usuario.

**Lógica**:
```python
def mis_clientes(self, request):
    user = request.user
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    empresa = personalizacion.sucursal_principal.empresa
    
    # Obtener clientes vía RelacionEmpresa
    relaciones = RelacionEmpresa.objects.filter(prestador_servicios=empresa)
    
    return Response(RelacionEmpresaSerializer(relaciones, many=True).data)
```

**Uso**: Módulo de cotizaciones/contratos → "Seleccionar cliente" (solo muestra clientes reales de la empresa).

---

##### `@action: sucursales`
**Endpoint**: `GET /api/empresas/{id}/sucursales/`

**Propósito**: Listar sucursales de una empresa específica.

---

##### `@action: equipos`
**Endpoint**: `GET /api/empresas/{id}/equipos/`

**Propósito**: Obtener equipos asignados a una empresa (relacionado con módulo `activos/`).

---

##### `@action: usuarios`
**Endpoint**: `GET /api/empresas/{id}/usuarios/`

**Propósito**: Listar empleados de una empresa específica.

**Lógica**: Obtiene todos los `UsuarioEmpresa` cuya `sucursal.empresa` coincida con la empresa especificada.

---

##### `@action: usuarios-de-clientes`
**Endpoint**: `GET /api/empresas/{id}/usuarios-de-clientes/`

**Propósito**: Obtener empleados de **empresas cliente** (para cotizaciones/contratos).

**Lógica**:
```python
def usuarios_de_clientes(self, request, pk=None):
    empresa = self.get_object()
    relaciones = RelacionEmpresa.objects.filter(prestador_servicios=empresa)
    clientes_ids = relaciones.values_list('cliente__id', flat=True)
    
    # Obtener usuarios de empresas cliente
    usuarios = UsuarioEmpresa.objects.filter(sucursal__empresa__id__in=clientes_ids)
    
    return Response(UsuarioEmpresaSerializer(usuarios, many=True).data)
```

**Uso**: Al crear cotización/contrato, mostrar solicitantes del lado del cliente.

---

##### `@action: equipos-clientes`
**Endpoint**: `GET /api/empresas/{id}/equipos-clientes/`

**Propósito**: Obtener equipos de empresas cliente (para asignación en OT/visitas).

---

#### `SucursalEmpresaViewSet`
**Endpoint Base**: `/api/sucursales-empresa/`

**Custom Action**:

##### `@action: usuarios`
**Endpoint**: `GET /api/sucursales-empresa/{id}/usuarios/`

**Propósito**: Listar empleados de una sucursal específica.

---

#### `UsuarioEmpresaViewSet`
**Endpoint Base**: `/api/usuarios-empresa/`

**get_queryset()**: **Filtrado automático** por `sucursal_principal` del usuario:
```python
def get_queryset(self):
    user = self.request.user
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    
    if personalizacion and personalizacion.sucursal_principal:
        # Solo ve empleados de su sucursal
        return UsuarioEmpresa.objects.filter(sucursal=personalizacion.sucursal_principal)
    else:
        return UsuarioEmpresa.objects.none()  # Sin contexto → Sin datos
```

**Custom Actions**:

##### `@action: detalle-usuario`
**Endpoint**: `GET /api/usuarios-empresa/detalle-usuario/?usuario_id={id}`

**Propósito**: Obtener detalle de `UsuarioEmpresa` por `User.id`.

---

##### `@action: ultimas-actividades`
**Endpoint**: `GET /api/usuarios-empresa/{id}/ultimas-actividades/`

**Propósito**: Timeline de actividades del empleado (solicitudes de vacaciones, OT, visitas).

**Lógica**: Agrega actividades de múltiples modelos (SolicitudVacaciones, OrdenTrabajo, etc.) y las retorna ordenadas por fecha.

---

### 🔧 Signals

**Archivo**: `empresas/signals.py`

#### `crear_casa_matriz`
**Signal**: `post_save` de `Empresa`

**Propósito**: Al crear una empresa, **automáticamente** crear sucursal "Casa Matriz".

**Código**:
```python
@receiver(post_save, sender=Empresa)
def crear_casa_matriz(sender, instance, created, **kwargs):
    if created:
        SucursalEmpresa.objects.create(
            nombre="Casa Matriz",
            empresa=instance,
            direccion=instance.direccion_principal
        )
```

**Beneficio**: Garantiza que toda empresa tenga al menos 1 sucursal (requisito para vinculación de usuarios).

---

## 📦 App: cotizaciones/

### Propósito
Gestiona el **sistema de cotizaciones** (presupuestos) completo: creación de cotizaciones con items, cálculo de impuestos (IVA, PPM), seguimiento de estado, envío por email con PDF adjunto, solicitantes (internos/externos), comentarios.

---

### 🗄️ Modelos

#### `Cotizacion`
**Propósito**: Presupuesto enviado a cliente con items, precios, impuestos y vigencia.

**Campos Principales**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `nombre` | CharField | Nombre descriptivo de la cotización |
| `empresa` | FK(Empresa) | Empresa que emite la cotización (prestador) |
| `cliente` | FK(Empresa) | Empresa cliente que recibe la cotización |
| `numero_cotizacion` | IntegerField (unique) | Número correlativo auto-generado (inicio: 800) |
| `fecha_vencimiento` | DateField | Fecha límite de validez (auto: +2 semanas) |
| `estado` | CharField (choices) | Estado de la cotización (pendiente, aprobada, rechazada, etc.) |
| `descripcion` | CharField | Descripción general |
| `total_estimado` | DecimalField | Total calculado de la cotización |
| `observaciones` | TextField | Observaciones para el cliente |
| `tipo_moneda` | CharField (choices) | Moneda (1=USD, 2=CLP, 3=UF) |
| `dolar_observado` | DecimalField | Tasa de cambio USD→CLP al momento |
| `valor_uf` | DecimalField | Valor UF al momento (Chile) |
| `ppm` | DecimalField (default 1.00) | PPM (Pequeña y Mediana Minería - impuesto Chile) |
| `fecha_facturacion` | DateField | Fecha de facturación |

**Estados Disponibles** (`ESTADOS_COTIZACION`):
- `'pendiente'`: Creada, no enviada
- `'enviada'`: Enviada a cliente
- `'aprobada'`: Cliente aprobó
- `'rechazada'`: Cliente rechazó
- `'expirada'`: Venció sin respuesta

**Relaciones**:
- `N:1` → `Empresa` (empresa emisora)
- `N:1` → `Empresa` (cliente)
- `1:N` → `ItemCotizacion` (items de la cotización)
- `1:N` → `SeguimientoCotizacion` (comentarios de seguimiento)
- `1:N` → `SolicitanteCotizacion` (solicitantes internos/externos)
- `M:M` → `self` (through `ComentarioCotizacion` - comentarios internos)

**Hereda**: `ModeloBase`

**Métodos Útiles**:
```python
cotizacion.calcular_total_estimado  # Propiedad: suma costo_total de todos los items
cotizacion.es_vigente  # Propiedad: fecha_vencimiento >= hoy
cotizacion.establecer_fecha_vencimiento()  # fecha_creacion + 2 semanas
```

**Auto-generación de número_cotizacion** (método `save()`):
```python
if not self.numero_cotizacion:
    last_cot = Cotizacion.objects.order_by('-numero_cotizacion').first()
    if last_cot and last_cot.numero_cotizacion:
        self.numero_cotizacion = last_cot.numero_cotizacion + 1
    else:
        self.numero_cotizacion = 800  # Valor inicial
    
    # Evitar duplicados (si hay conflicto, incrementar)
    while Cotizacion.objects.filter(numero_cotizacion=self.numero_cotizacion).exists():
        self.numero_cotizacion += 1
```

---

#### `ItemCotizacion`
**Propósito**: **Línea de item** en una cotización (producto o servicio) con cálculos fiscales complejos (IVA, PPM, recargo, ganancia, conversión de moneda).

**Campos Principales**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `cotizacion` | FK(Cotizacion) | Cotización a la que pertenece |
| `item_empresa` | FK(ItemEmpresa) | Item del catálogo (productos/servicios) |
| `proveedor_empresa` | FK(ProveedorEmpresa) | Proveedor del item |
| `aprobado` | BooleanField | Si el item fue aprobado por el cliente |
| `nombre` | CharField | Nombre del item (override si no hay item_empresa) |
| `descripcion` | TextField | Descripción del producto/servicio |
| `cantidad` | PositiveIntegerField | Cantidad de unidades |
| `precio_unitario` | DecimalField | Precio por unidad (en moneda base) |
| `costo_total` | DecimalField | cantidad × precio_unitario (calculado en save()) |
| `porcentaje_recargo` | IntegerField | Margen de ganancia (%) |
| `recargo_dolar` | IntegerField (default 5) | Recargo sobre USD (si moneda=USD) |

**Hereda**: `ModeloBase`

---

#### Propiedades de Cálculo Fiscal (CRÍTICAS ⚠️)

##### 1. `recargo_iva_venta`
**Propósito**: Calcular IVA sobre venta (19% en Chile) del monto **con recargo**.

**Fórmula**:
```python
base = costo_total + (costo_total * porcentaje_recargo / 100)
iva_venta = base * 0.19
```

**Ejemplo**:
- `costo_total = 1,000 CLP`
- `porcentaje_recargo = 20%`
- `base = 1,000 + (1,000 * 0.20) = 1,200 CLP`
- `recargo_iva_venta = 1,200 * 0.19 = 228 CLP`

---

##### 2. `iva_compra`
**Propósito**: IVA de compra (19%) sobre `costo_total` (sin recargo).

**Fórmula**:
```python
iva_compra = costo_total * 0.19
```

**Ejemplo**:
- `costo_total = 1,000 CLP`
- `iva_compra = 1,000 * 0.19 = 190 CLP`

---

##### 3. `valor_ppm`
**Propósito**: Impuesto PPM (Pequeña y Mediana Minería - Chile) sobre base con recargo.

**Fórmula**:
```python
base = costo_total + (costo_total * porcentaje_recargo / 100)
ppm_amount = base * (cotizacion.ppm / 100)
```

**Ejemplo**:
- `costo_total = 1,000 CLP`
- `porcentaje_recargo = 20%`
- `cotizacion.ppm = 1%`
- `base = 1,200 CLP`
- `valor_ppm = 1,200 * 0.01 = 12 CLP`

---

##### 4. `total_impuesto`
**Propósito**: Total de impuestos netos a pagar al SII (Servicio de Impuestos Internos - Chile).

**Fórmula**:
```python
total_impuesto = (iva_venta) - (iva_compra) + (ppm_amount)
```

**Lógica Fiscal**:
- **IVA Venta**: Lo que cobra al cliente (crédito fiscal)
- **IVA Compra**: Lo que pagó al proveedor (débito fiscal)
- **Diferencia IVA**: (iva_venta - iva_compra) = monto a pagar/retener
- **PPM**: Impuesto adicional del sector minero
- **Total Impuesto**: Suma neta de impuestos

**Ejemplo**:
- `iva_venta = 228 CLP`
- `iva_compra = 190 CLP`
- `valor_ppm = 12 CLP`
- `total_impuesto = 228 - 190 + 12 = 50 CLP`

---

##### 5. `ganancia`
**Propósito**: Ganancia neta después de impuestos.

**Fórmula**:
```python
recargo = costo_total * (porcentaje_recargo / 100)
ganancia = recargo - total_impuesto
```

**Lógica**:
- **Recargo**: Lo que se gana bruto (`costo_total * porcentaje_recargo%`)
- **Total Impuesto**: Lo que se paga al SII
- **Ganancia Neta**: Recargo - Impuestos

**Ejemplo**:
- `costo_total = 1,000 CLP`
- `porcentaje_recargo = 20%`
- `recargo = 1,000 * 0.20 = 200 CLP`
- `total_impuesto = 50 CLP`
- `ganancia = 200 - 50 = 150 CLP`

---

#### Conversión de Moneda (Multi-Currency)

##### Helper Methods
```python
def _tasa_usd_clp(self) -> Decimal:
    """Tasa CLP por 1 USD (incluye recargo_dolar)"""
    return Decimal(cotizacion.dolar_observado + self.recargo_dolar)

def _tasa_uf_clp(self) -> Decimal:
    """Tasa CLP por 1 UF"""
    return Decimal(cotizacion.valor_uf)
```

##### `precio_venta_neta_unitario_moneda_base`
**Propósito**: Precio unitario **con recargo** en la moneda base (USD, CLP o UF).

**Fórmula**:
```python
precio_neto = precio_unitario + (precio_unitario * porcentaje_recargo / 100)
```

**Ejemplo**:
- `precio_unitario = 100 USD`
- `porcentaje_recargo = 20%`
- `precio_venta_neta = 100 + (100 * 0.20) = 120 USD`

---

##### `precio_unitario_backend`
**Propósito**: Convertir precio unitario con recargo a **CLP y USD** según tipo_moneda.

**Retorna**: `{"clp": Decimal, "usd": Decimal}`

**Lógica de Conversión**:

**Si tipo_moneda = "1" (USD)**:
```python
precio_neto_usd = precio_venta_neta_unitario_moneda_base  # Ya en USD
precio_neto_clp = precio_neto_usd * (dolar_observado + recargo_dolar)
```

**Si tipo_moneda = "2" (CLP)**:
```python
precio_neto_clp = precio_venta_neta_unitario_moneda_base  # Ya en CLP
precio_neto_usd = precio_neto_clp / dolar_observado  # SIN recargo_dolar
```

**Si tipo_moneda = "3" (UF)**:
```python
precio_neto_uf = precio_venta_neta_unitario_moneda_base
precio_neto_clp = precio_neto_uf * valor_uf
precio_neto_usd = precio_neto_clp / dolar_observado  # SIN recargo_dolar
```

**Ejemplo**:
- `precio_unitario = 100 USD`
- `porcentaje_recargo = 20%`
- `dolar_observado = 900 CLP`
- `recargo_dolar = 5 CLP`
- `precio_venta_neta = 120 USD`
- `precio_unitario_backend = {"clp": 120 * (900+5) = 108,600 CLP, "usd": 120 USD}`

---

##### `precio_total_backend`
**Propósito**: Convertir precio total (unitario × cantidad) a CLP y USD.

**Retorna**: `{"clp": Decimal, "usd": Decimal}`

**Fórmula**:
```python
unitarios = precio_unitario_backend
total_clp = unitarios["clp"] * cantidad
total_usd = unitarios["usd"] * cantidad
```

---

#### `SeguimientoCotizacion`
**Propósito**: **Timeline de eventos** de una cotización (creación, edición, envío, aprobación).

**Campos**:
- `cotizacion`: FK(Cotizacion)
- `fecha`: DateTimeField (auto_now_add)
- `comentario`: TextField (descripción del evento)
- `usuario`: FK(UsuarioEmpresa) (quien hizo la acción)

**Uso**: Auditoría completa de ciclo de vida de cotización.

---

#### `EnvioCorreoCotizacion`
**Propósito**: Registrar **envíos de cotización por email** (destinatarios, fecha).

**Campos**:
- `cotizacion`: FK(Cotizacion)
- `fecha_envio`: DateTimeField (auto_now_add)
- `usuarios_destinatarios`: M2M(UsuarioEmpresa) (usuarios internos)
- `correos_externos`: TextField (CSV de emails externos)

**Método Útil**:
```python
envio.get_correos_externos()  # Retorna lista: ["cliente@example.com", "otro@example.com"]
```

---

#### `SolicitanteCotizacion` (GenericForeignKey)
**Propósito**: Asociar **solicitantes** (internos o externos) a una cotización.

**Campos**:
- `cotizacion`: FK(Cotizacion)
- `content_type`: FK(ContentType) (polymorphic)
- `usuario_id`: PositiveIntegerField
- `usuario`: GenericForeignKey (apunta a UsuarioEmpresa o SolicitanteExterno)
- `aprobo`: BooleanField (si el solicitante aprobó la cotización)
- `fecha_aprobacion`: DateTimeField

**Content Types Permitidos**:
- `app_label='cotizaciones', model='solicitanteexterno'`
- `app_label='empresas', model='usuarioempresa'`

**Uso**: Workflow de aprobación multi-firma (solicitantes internos + externos aprueban cotización).

---

#### `SolicitanteExterno`
**Propósito**: Solicitante externo (no usuario del sistema) que puede aprobar cotizaciones.

**Campos**:
- `email`: EmailField
- `nombre`: CharField

**Uso**: Cliente sin cuenta en el sistema puede aprobar cotización vía link con token.

---

#### `ComentarioCotizacion`
**Propósito**: Comentarios internos en cotización (comunicación entre empleados).

**Campos**:
- `comentario`: TextField
- `cotizacion`: FK(Cotizacion)
- `creado_por`: FK(UsuarioEmpresa)

**Ordering**: `-fecha_creacion` (más recientes primero)

---

### 📊 Serializers

#### `ItemCotizacionSerializer`
**Propósito**: Serializar item con **todos los cálculos fiscales** como campos computados.

**Campos Calculados** (SerializerMethodField):
| Campo | Propiedad del Modelo |
|-------|---------------------|
| `ppm` | `obj.cotizacion.ppm` (hereda de cotización) |
| `nombre_item` | `obj.item_empresa.nombre` o `obj.nombre` (fallback) |
| `nombre_proveedor` | `obj.proveedor_empresa.nombre` |
| `recargo_iva_venta` | `obj.recargo_iva_venta` (IVA sobre venta) |
| `iva_compra` | `obj.iva_compra` (IVA de compra) |
| `valor_ppm` | `obj.valor_ppm` (impuesto PPM) |
| `total_impuesto` | `obj.total_impuesto` (suma de impuestos netos) |
| `ganancia` | `obj.ganancia` (ganancia neta tras impuestos) |
| `precio_unitario_backend` | `obj.precio_unitario_backend` ({"clp": ..., "usd": ...}) |
| `precio_total_backend` | `obj.precio_total_backend` ({"clp": ..., "usd": ...}) |
| `precio_venta_neta_unitario_moneda_base` | `obj.precio_venta_neta_unitario_moneda_base` |
| `precio_venta_neta_total_moneda_base` | `obj.precio_venta_neta_total_moneda_base` |

**Beneficio**: Frontend recibe **todos los cálculos fiscales** sin necesidad de computar localmente.

---

#### `CotizacionSerializer`
**Propósito**: Serializar cotización con datos de empresa y cliente.

**Campos Calculados**:
| Campo | Descripción |
|-------|-------------|
| `estado_label` | Texto legible del estado (Pendiente/Aprobada/Rechazada) |
| `tipo_moneda_label` | Texto legible (USD/CLP/UF) |
| `empresa_nombre` | `obj.empresa.nombre` |
| `cliente_nombre` | `obj.cliente.nombre` |
| `recargo_cliente` | `obj.cliente.recargo` (recargo por defecto del cliente) |
| `es_vigente` | `obj.es_vigente` (booleano: fecha_vencimiento >= hoy) |

---

#### `SeguimientoCotizacionSerializer`
**Campos Calculados**:
- `usuario_nombre`: `"{obj.usuario.usuario.first_name} {obj.usuario.usuario.last_name}"`

---

#### `SolicitanteCotizacionSerializer`
**Campos Calculados**:
- `nombre_usuario`: Nombre completo (según content_type: SolicitanteExterno.nombre o UsuarioEmpresa.usuario.get_nombre_completo())
- `email_usuario`: Email (según content_type)

---

#### `ComentarioCotizacionSerializer`
**Campos Calculados**:
- `nombre_creado_por`: `obj.creado_por.usuario.get_nombre_completo()`

---

### 🌐 ViewSets y Endpoints

#### `CotizacionViewSet`
**Endpoint Base**: `/api/cotizaciones/`

**QuerySet**: Optimizado con `prefetch_related('items', 'seguimientos')` para evitar N+1.

**Métodos Interceptados**:

##### `perform_create()`
**Propósito**: Al crear cotización, agregar seguimiento automático "Cotización creada".

```python
def perform_create(self, serializer):
    cotizacion = serializer.save()
    usuario_empresa = UsuarioEmpresa.objects.get(usuario=self.request.user)
    crear_seguimiento_cotizacion(
        cotizacion_id=cotizacion.id,
        usuario_id=usuario_empresa.id,
        comentario=f"Cotización {cotizacion.numero_cotizacion} creada."
    )
```

---

##### `perform_update()`
**Propósito**: Al editar cotización, agregar seguimiento "Cotización actualizada".

---

**Custom Actions**:

##### `@action: cotizaciones-empresa`
**Endpoint**: `GET /api/cotizaciones/cotizaciones-empresa/`

**Propósito**: Filtrar cotizaciones por empresa del usuario (según `PersonalizacionUsuario.sucursal_principal`).

**Lógica**:
```python
def cotizaciones_empresa(self, request):
    user = request.user
    personalizacion = PersonalizacionUsuario.objects.get(usuario=user)
    empresa = personalizacion.sucursal_principal.empresa
    
    cotizaciones = Cotizacion.objects.filter(empresa=empresa)
    return Response(CotizacionSerializer(cotizaciones, many=True).data)
```

---

##### `@action: enviar-cotizacion`
**Endpoint**: `POST /api/cotizaciones/{id}/enviar-cotizacion/`

**Propósito**: Enviar cotización por email con **PDF adjunto** (vía Celery).

**Body Requerido**:
```json
{
    "copias": ["cliente@example.com", "otro@example.com"],
    "usuarios_empresa": [1, 2, 3]  // pks de UsuarioEmpresa para CC
}
```

**Flujo**:
1. Validar que cotización exista
2. Obtener correos de usuarios internos (UsuarioEmpresa) para CC
3. Unir con correos externos (`copias`)
4. Generar PDF de cotización (`generar_pdf_cotizacion_desde_model()`)
5. Enviar email con PDF adjunto (vía `send_email_task.delay()`)
6. Registrar envío en `EnvioCorreoCotizacion`

**Código Simplificado**:
```python
@action(detail=True, methods=['post'], url_path='enviar-cotizacion')
def enviar_cotizacion(self, request, pk=None):
    cotizacion = get_object_or_404(Cotizacion, pk=pk)
    
    # Obtener correos CC
    copias = request.data.get("copias", [])
    usuarios_empresa_pks = request.data.get("usuarios_empresa", [])
    usuarios_empresa = UsuarioEmpresa.objects.filter(pk__in=usuarios_empresa_pks)
    correos_cc = [user.usuario.email for user in usuarios_empresa]
    correos_cc = list(set(copias + correos_cc))  # Unir y deduplicar
    
    # Generar PDF
    pdf_bytes = generar_pdf_cotizacion_desde_model(cotizacion_id=cotizacion.pk)
    pdf_filename = f"Coti_{cotizacion.numero_cotizacion}_{cotizacion.cliente.nombre}.pdf"
    
    # Enviar email
    send_email_task.delay(
        subject=f"Cotización #{cotizacion.numero_cotizacion}",
        message="Adjunto cotización solicitada.",
        recipient_list=correos_cc,
        attachments=[(pdf_filename, pdf_bytes, 'application/pdf')]
    )
    
    # Registrar envío
    envio = EnvioCorreoCotizacion.objects.create(
        cotizacion=cotizacion,
        correos_externos=", ".join(copias)
    )
    envio.usuarios_destinatarios.add(*usuarios_empresa)
    
    return Response({"detail": "Cotización enviada correctamente."})
```

---

## 🔗 Relaciones Entre Modelos (Empresas ↔ Cotizaciones)

```
Empresa (empresas)
├── 1:N → SucursalEmpresa (empresas)
│   ├── 1:N → UsuarioEmpresa (empresas)
│   │   └── 1:1 → User (cuentas)
│   └── 1:N → PersonalizacionUsuario.sucursal_principal (core) ⭐ CRÍTICO
├── M:M → self via RelacionEmpresa (cliente-proveedor)
├── 1:N → Cotizacion (como empresa emisora)
└── 1:N → Cotizacion (como cliente)

Cotizacion (cotizaciones)
├── N:1 → Empresa (empresa emisora)
├── N:1 → Empresa (cliente)
├── 1:N → ItemCotizacion (items de cotización)
│   ├── N:1 → ItemEmpresa (items.ItemEmpresa - catálogo)
│   └── N:1 → ProveedorEmpresa (items.ProveedorEmpresa)
├── 1:N → SeguimientoCotizacion (timeline de eventos)
│   └── N:1 → UsuarioEmpresa (quien hizo la acción)
├── 1:N → SolicitanteCotizacion (solicitantes internos/externos)
│   ├── N:1 → ContentType (polymorphic)
│   └── GenericFK → UsuarioEmpresa o SolicitanteExterno
├── 1:N → EnvioCorreoCotizacion (registro de envíos)
│   └── M:M → UsuarioEmpresa (destinatarios internos)
└── M:M → self via ComentarioCotizacion (comentarios internos)
    └── N:1 → UsuarioEmpresa (autor del comentario)
```

---

## 🔑 Conceptos Clave

### Empresas

1. **Signal de Casa Matriz**: Toda empresa tiene al menos 1 sucursal (auto-creada).

2. **UsuarioEmpresa vs. User.groups**: Permisos se gestionan en `UsuarioEmpresa.grupos`, NO en `User.groups`.

3. **Filtros por Contexto**: Muchos ViewSets filtran por `PersonalizacionUsuario.sucursal_principal` (sin él, retornan `[]`).

4. **Relaciones Cliente-Proveedor**: `RelacionEmpresa` es tabla intermedia M2M que define relaciones de negocio explícitas.

5. **Cálculo de Vacaciones**: Lógica legislación chilena (15 días + progresivo tras 10 años).

---

### Cotizaciones

1. **Multi-Currency**: Sistema soporta USD, CLP y UF con conversión automática en serializers.

2. **Cálculos Fiscales Complejos**: `ItemCotizacion` calcula IVA venta/compra, PPM, ganancia neta automáticamente.

3. **Recargo sobre Dólar**: Si `tipo_moneda=USD`, se aplica `recargo_dolar` (margen cambiario).

4. **GenericForeignKey para Solicitantes**: Permite solicitantes internos (UsuarioEmpresa) y externos (SolicitanteExterno) en mismo modelo.

5. **PDF con Celery**: Generación de PDF y envío de email es asíncrono (no bloquea request).

6. **Seguimiento Automático**: Cada create/update de cotización genera registro en `SeguimientoCotizacion` (auditoría completa).

---

## 🧪 Testing

### Tests Importantes a Cubrir

#### empresas/
- [ ] Signal `crear_casa_matriz`: crear empresa → validar que existe sucursal "Casa Matriz"
- [ ] UsuarioEmpresa: cálculo de vacaciones (15 días, progresivo tras 10 años)
- [ ] EmpresaViewSet.select_empresas: staff ve todas, usuario regular solo su empresa
- [ ] RelacionEmpresa: unique_together (prestador, cliente)

#### cotizaciones/
- [ ] Auto-generación de `numero_cotizacion` (inicio 800, incremento, evitar duplicados)
- [ ] ItemCotizacion: cálculos fiscales (IVA venta/compra, PPM, ganancia)
- [ ] ItemCotizacion: conversión de moneda (USD→CLP→UF)
- [ ] CotizacionViewSet.enviar_cotizacion: validar envío de email con PDF
- [ ] SolicitanteCotizacion: crear con UsuarioEmpresa y SolicitanteExterno (polymorphic)

---

## 📚 Referencias Cruzadas

- [core-cuentas.md](./core-cuentas.md): ModeloBase, User, PersonalizacionUsuario
- [items.md](./items.md): ItemEmpresa, ProveedorEmpresa (próximo documento)
- [contratos.md](./contratos.md): Relación Cotizacion → Contrato (próximo)
- [instructions/backend-instructions.md](../backend-instructions.md): Guía general backend
- [ARQUITECTURA_SISTEMA.md](../../ARQUITECTURA_SISTEMA.md): Visión general del sistema

---

**Última actualización**: 2025-11-05  
**Próximo documento**: `contratos-items.md` (apps contratos/, items/, bodegas/)
