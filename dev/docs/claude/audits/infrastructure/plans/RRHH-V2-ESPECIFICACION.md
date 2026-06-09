# 📋 Especificación Técnica - Flujo RRHH V2 (Contratos Laborales)

**Fecha:** Junio 2026  
**Versión:** 2.0  
**Estado:** Aprobado  
**Autor:** JuanSnabbIT + Claude Code Analysis

---

## 📌 Decisiones Críticas Aprobadas

### **Modelo de Trabajador**
- **Decisión:** Trabajador = `UsuarioEmpresa` con estado laboral específico
- **Implicación:** No hay tabla nueva; filtramos por relación existente
- **Multi-tenancy:** Automático vía `UsuarioEmpresa.empresa`

### **Versionado de Contratos**
- **Decisión:** Combinación B+A
  - **ModeloBaseHistorico** → auditoría automática de cambios
  - **Duplicado para renovaciones** → nueva instancia `ContratoTrabajador`
- **Flujo:** borrador → vigente → (cambios se registran en historial) → renovación crea nuevo

### **Plantillas de Contratos**
- **Decisión:** Snabbit crea y gestiona todas
  - Plantillas centralizadas (estándares legales)
  - Plantillas personalizadas por empresa cliente
- **Scope V2:** Almacenamiento + interpolación de etiquetas
- **Generación PDF:** Fuera de scope (Fase 2)

### **Flujo de Aprobación**
- **Decisión:** RH gestiona creación/edición. Empresa cliente aprueba/rechaza/solicita cambios
- **Mecanismo:** Link público con UUID token (via `EnvioAprobacionEmpleador`)
- **Sin firma digital:** Fase separada
- **Decisiones empresa:** Pendiente → Aprobado / Rechazado / Cambios solicitados

### **Remuneración**
- **Campos V2:** sueldo_base, tipo_gratificacion, bono_movilizacion, bono_colacion, moneda (CLP)
- **Sueldo líquido:** Manual + validación simple (no > sueldo_base)
- **Multi-moneda:** ❌ Fuera de scope (siempre CLP)
- **Cálculo automático:** ❌ Fase 2 (integración contabilidad)

### **Índices de Base de Datos**
- `idx_contrato_estado`
- `idx_contrato_fecha_termino`
- `idx_contrato_trabajador_estado`
- `idx_contrato_trabajador_fecha`
- `idx_contrato_trabajador_estado_fecha`

---

## 🗄️ Modelos Django

### **ContratoTrabajador** (heredar de `ModeloBaseHistorico`)

```python
class ContratoTrabajador(ModeloBaseHistorico):
    """Contrato laboral entre empresa y trabajador (UsuarioEmpresa)."""
    
    # Relación con trabajador
    usuario_empresa = ForeignKey(
        'empresas.UsuarioEmpresa',
        on_delete=PROTECT,
        related_name='contratos_laborales',
        null=True,
        blank=True,
    )
    
    # Datos del trabajador nuevo (si aún no existe en sistema)
    datos_trabajador_nuevo = JSONField(null=True, blank=True)
    
    # Identificadores
    referencia_interna = CharField(max_length=200, blank=True, null=True)
    observaciones = TextField(blank=True, null=True)
    
    # Datos legales (Art. 10 CT)
    estado_civil = CharField(choices=ESTADO_CIVIL, blank=True, null=True)
    profesion_u_oficio = CharField(max_length=150, blank=True, null=True)
    sistema_salud_otro = CharField(max_length=100, blank=True, null=True)
    trabajador_reemplazado = ForeignKey(
        'empresas.UsuarioEmpresa',
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name='contratos_de_reemplazo',
    )
    causal_reemplazo = CharField(choices=CAUSAL_REEMPLAZO, blank=True, null=True)
    
    # Contrato
    tipo_contrato = CharField(choices=TIPO_CONTRATO)  # indefinido, plazo_fijo, reemplazo
    fecha_inicio = DateField()
    fecha_termino = DateField(blank=True, null=True)
    
    # Datos del puesto
    cargo = CharField(max_length=150)
    funciones = TextField(blank=True, null=True)
    
    # Jornada
    jornada = CharField(choices=JORNADA_CONTRATO)  # completa, parcial, turnos
    horas_semanales = PositiveSmallIntegerField(blank=True, null=True)
    horario_detalle = CharField(max_length=500, blank=True, null=True)
    tiempo_colacion = PositiveIntegerField(default=30)
    lugar_trabajo = CharField(max_length=255, blank=True, null=True)
    dias_semana = JSONField(default=list)  # ['L','M','X','J','V']
    turnos_rotativo = JSONField(default=list)
    
    # Remuneración
    sueldo_base = DecimalField(max_digits=12, decimal_places=2, default=0)
    sueldo_liquido = DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    moneda = CharField(choices=MONEDA_CONTRATO, default='CLP')
    tipo_gratificacion = CharField(choices=TIPO_GRATIFICACION, default='no_aplica')
    bono_movilizacion = DecimalField(max_digits=12, decimal_places=2, default=0)
    bono_colacion = DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Documentos
    plantilla_contrato = ForeignKey(
        'contratos.PlantillaContrato',
        on_delete=SET_NULL,
        blank=True,
        null=True,
        related_name='contratos_trabajador',
    )
    archivo_pdf = FileField(upload_to=archivo_contrato_path, blank=True, null=True)
    lugar_celebracion_contrato = CharField(max_length=255, blank=True, null=True)
    fecha_firma = DateField(blank=True, null=True)
    
    # Control
    enviar_al_empleador = BooleanField(default=True)
    cantidad_meses = PositiveSmallIntegerField(blank=True, null=True)
    
    # Estado
    estado = CharField(
        max_length=25,
        choices=ESTADO_CONTRATO,
        default='borrador'
    )  # borrador, pendiente_aprobacion, vigente, terminado, anulado, descartado
    
    # Aprobación
    fecha_aprobacion = DateTimeField(blank=True, null=True)
    aceptado_por = ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=SET_NULL,
        blank=True,
        null=True,
        related_name='contratos_trabajador_aceptados',
    )
    
    # Término
    motivo_termino = CharField(
        max_length=30,
        choices=MOTIVO_TERMINO_CONTRATO,
        blank=True,
        null=True,
    )
    fecha_termino_real = DateField(blank=True, null=True)
    observaciones_termino = TextField(blank=True, null=True)
    motivo_anulacion = TextField(blank=True, null=True)
    
    # Auditoría
    creado_por = ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=SET_NULL,
        blank=True,
        null=True,
        related_name='contratos_trabajador_creados',
    )
    
    class Meta:
        verbose_name = 'Contrato de Trabajador'
        verbose_name_plural = 'Contratos de Trabajadores'
        ordering = ['-fecha_inicio', '-fecha_creacion']
        indexes = [
            models.Index(fields=['estado'], name='idx_contrato_estado'),
            models.Index(fields=['fecha_termino'], name='idx_contrato_fecha_termino'),
            models.Index(
                fields=['usuario_empresa', 'estado'],
                name='idx_contrato_trabajador_estado'
            ),
            models.Index(
                fields=['usuario_empresa', 'fecha_inicio'],
                name='idx_contrato_trabajador_fecha'
            ),
            models.Index(
                fields=['usuario_empresa', 'estado', 'fecha_inicio'],
                name='idx_contrato_trabajador_estado_fecha'
            ),
        ]
    
    def clean(self):
        if self.sueldo_liquido and self.sueldo_liquido > self.sueldo_base:
            raise ValidationError(
                'Sueldo líquido no puede ser mayor que sueldo base'
            )
```

### **EnvioAprobacionEmpleador** (REUTILIZAR EXISTENTE)

```python
class EnvioAprobacionEmpleador(ModeloBase):
    """Registro de envío de contrato al empleador para aprobación."""
    
    uuid = UUIDField(default=uuid.uuid4, unique=True)  # ← TOKEN para link público
    contrato = ForeignKey(
        ContratoTrabajador,
        on_delete=CASCADE,
        related_name='envios_aprobacion_empleador',
    )
    
    pdf_congelado = BinaryField()  # Snapshot del PDF en el momento del envío
    enviado_a = EmailField()
    enviado_por = ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name='envios_aprobacion_empleador_enviados',
    )
    
    # Decisión de empresa
    decision = CharField(
        max_length=25,
        choices=[
            ('pendiente', 'Pendiente'),
            ('aprobado', 'Aprobado'),
            ('rechazado', 'Rechazado'),
            ('cambios_solicitados', 'Cambios solicitados'),
        ],
        default='pendiente'
    )
    
    motivo_rechazo = TextField(null=True, blank=True)
    cambios_solicitados = JSONField(default=list)
    
    notificar_trabajador = BooleanField(default=False)
    
    # Timeline
    fecha_envio = DateTimeField(auto_now_add=True)
    fecha_respuesta = DateTimeField(null=True, blank=True)
    ip_respuesta = GenericIPAddressField(null=True, blank=True)
    expirado = BooleanField(default=False)
    
    EXPIRACION_DIAS = 14
    
    @property
    def fecha_expiracion(self):
        return self.fecha_envio + timedelta(days=self.EXPIRACION_DIAS)
    
    def esta_expirado(self):
        return self.expirado or timezone.now() > self.fecha_expiracion
```

### **AnexoContrato** (EXISTENTE - modificaciones contractuales)

```python
class AnexoContrato(ModeloBaseHistorico):
    """Anexo / modificación contractual."""
    
    contrato = ForeignKey(
        ContratoTrabajador,
        on_delete=CASCADE,
        related_name='anexos',
    )
    
    tipo = CharField(
        max_length=30,
        choices=TIPO_ANEXO,
    )  # modificacion_sueldo, jornada, cargo, prorroga, otro
    
    fecha_efectiva = DateField()
    descripcion = TextField()
    nueva_fecha_termino = DateField(null=True, blank=True)
    archivo_pdf = FileField(upload_to=archivo_anexo_path, blank=True, null=True)
    
    estado = CharField(
        max_length=25,
        choices=ESTADO_CONTRATO,
        default='borrador'
    )
    
    numero_anexo = PositiveIntegerField(null=True, blank=True)
    creado_por = ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=SET_NULL,
        blank=True,
        null=True,
        related_name='anexos_contrato_creados',
    )
```

---

## 🎯 Máquina de Estados

```
┌─────────────┐
│  BORRADOR   │  (RH crea/edita)
└──────┬──────┘
       │
       ├─→ [RH: Enviar a aprobación]
       │   ↓
       │  ┌──────────────────────────┐
       │  │ PENDIENTE_APROBACION     │ + crea EnvioAprobacionEmpleador
       │  └────┬──────────────────────┘
       │       │
       │       ├─ "Aprobar" (via UUID link)
       │       │   ↓
       │       │  VIGENTE ✅
       │       │
       │       ├─ "Rechazar" (via UUID link)
       │       │   ↓
       │       │  DESCARTADO ❌
       │       │
       │       └─ "Cambios solicitados" (via UUID link)
       │           ↓
       │          BORRADOR 🔄 (RH edita de nuevo)
       │
       └─→ [RH: Descarta sin enviar]
           ↓
          DESCARTADO

┌──────────┐
│ VIGENTE  │  (En vigor)
└────┬─────┘
     │
     ├─→ [Anexo: modificación]
     │   └─ AnexoContrato en pendiente_aprobacion
     │
     └─→ [Terminar relación]
         ↓
       TERMINADO

┌──────────┐
│TERMINADO │  (Final)
└──────────┘

┌─────────┐
│ANULADO  │  (Final, solo desde VIGENTE)
└─────────┘
```

---

## 🔄 Transiciones Permitidas

```python
TRANSICIONES_CONTRATO = {
    'borrador': ['pendiente_aprobacion', 'descartado'],
    'pendiente_aprobacion': ['vigente', 'descartado', 'borrador'],
    'vigente': ['terminado', 'anulado'],
    'terminado': [],
    'anulado': [],
    'descartado': [],
}
```

---

## 📊 API Endpoints (Backend)

### **Contratos**

| Método | Endpoint | Acción |
|--------|----------|--------|
| GET | `/api/v3/contratos/` | Listar (filtrado por empresa) |
| GET | `/api/v3/contratos/{id}/` | Detalle |
| POST | `/api/v3/contratos/` | Crear en borrador |
| PUT | `/api/v3/contratos/{id}/` | Editar (solo si borrador) |
| DELETE | `/api/v3/contratos/{id}/` | Eliminar (solo si borrador) |
| POST | `/api/v3/contratos/{id}/enviar-aprobacion/` | Pasar a pendiente_aprobacion + crear EnvioAprobacionEmpleador |
| POST | `/api/v3/contratos/{id}/cambiar-estado-vigente/` | Aprobar (solo si empresa aprobó) |
| POST | `/api/v3/contratos/{id}/terminar/` | Marcar como terminado |
| POST | `/api/v3/contratos/{id}/anular/` | Anular contrato |

### **Aprobación Pública (sin auth, con UUID)**

| Método | Endpoint | Acción |
|--------|----------|--------|
| GET | `/api/public/contratos/aprobacion/{uuid}/` | Ver contrato para aprobación |
| POST | `/api/public/contratos/aprobacion/{uuid}/aprobar/` | Empresa aprueba |
| POST | `/api/public/contratos/aprobacion/{uuid}/rechazar/` | Empresa rechaza |
| POST | `/api/public/contratos/aprobacion/{uuid}/cambios/` | Empresa solicita cambios |

### **Anexos**

| Método | Endpoint | Acción |
|--------|----------|--------|
| GET | `/api/v3/contratos/{id}/anexos/` | Listar anexos |
| POST | `/api/v3/contratos/{id}/anexos/` | Crear anexo |
| PUT | `/api/v3/anexos/{id}/` | Editar |
| POST | `/api/v3/anexos/{id}/enviar-aprobacion/` | Enviar a empresa |

---

## 📱 Pantallas Frontend

### **1. Listado de Empresas RRHH**
- Tabla con empresas activas
- Columnas: Nombre, RUT, Estado
- Acciones: Ver detalles

### **2. Detalle de Empresa**
- Tabs: Datos Generales | Configuración Laboral | Trabajadores | Contratos | Documentos
- Cada tab con filtros específicos

### **3. Listado de Trabajadores (por empresa)**
- Tabla/Grid de trabajadores
- Filtros: Nombre, RUT, Cargo, Estado
- Acciones: Ver ficha, Crear contrato

### **4. Ficha del Trabajador**
- Tabs: Información Personal | Contratos | Documentos
- Muestra todos los contratos (vigentes + histórico)

### **5. Listado de Contratos (por empresa)**
- Tabla con contratos
- Filtros: Estado, Rango fechas, Trabajador
- Acciones: Ver detalle, Editar, Enviar a aprobación, etc.

### **6. Detalle de Contrato (RH)**
- Tabs: Información | Remuneración | Jornada | Documentos | Historial
- Acciones según estado:
  - **borrador:** Editar, Enviar aprobación, Descartar
  - **pendiente_aprobacion:** Ver estado envío, Reenviar, Volver a borrador
  - **vigente:** Ver detalles, Crear anexo, Terminar, Anular
  - **final:** Solo lectura

### **7. Crear Contrato (Wizard - 7 pasos)**
- Paso 1: Seleccionar empresa
- Paso 2: Seleccionar/crear trabajador
- Paso 3: Datos básicos (tipo, fechas, cargo)
- Paso 4: Jornada (horas, horario, turnos)
- Paso 5: Remuneración (sueldo, bonos, gratificación)
- Paso 6: Previsión (AFP, salud)
- Paso 7: Revisión final

### **8. Vista Pública de Aprobación (sin login)**
- URL: `/rrhh/aprobacion/{uuid}/`
- Muestra contrato (PDF o HTML)
- 3 botones: Aprobar | Rechazar | Solicitar Cambios
- Formulario para motivo (si rechaza o cambios)

---

## 🔐 Permisos

| Rol | Acciones |
|-----|----------|
| **RH (Snabbit)** | Crear, editar (borrador), enviar a aprobación, cambiar estados, terminar, anular |
| **Empresa Cliente** | Aprobar/rechazar/cambios (via link público con UUID) |
| **Admin** | Todas + ver auditoría completa |

---

## 📈 Criterios de Aceptación

### **Crear Contrato**
- [ ] Wizard completo en 7 pasos sin errores
- [ ] Validaciones en cada paso (RUT, fechas coherentes, sueldo > 0)
- [ ] Contrato se guarda en estado "borrador"
- [ ] Multi-tenancy: RH solo ve su empresa

### **Gestionar Contrato**
- [ ] Búsqueda y filtros funcionan (estado, fechas, trabajador)
- [ ] Edición solo en estado "borrador"
- [ ] Transiciones de estado permitidas según máquina
- [ ] Historial de cambios registrado (ModeloBaseHistorico)

### **Enviar a Aprobación**
- [ ] UUID token generado y único
- [ ] Email enviado con link público
- [ ] Link funciona sin login
- [ ] Empresa ve contrato y puede actuar (aprobar/rechazar/cambios)

### **Aprobación Empresa**
- [ ] Link con UUID accesible sin login
- [ ] Botones: Aprobar | Rechazar | Cambios
- [ ] Motivos registrados en BD
- [ ] Contrato actualiza estado según decisión

### **Auditoría**
- [ ] Cada cambio registra: usuario, fecha, campo, valor anterior, valor nuevo
- [ ] Historial visible en detalle del contrato

---

## 🗓️ Timeline (7 semanas)

- **Semana 1:** Arquitectura + migraciones DB
- **Semana 2-3:** Backend (ViewSets, serializers, permisos)
- **Semana 3-4:** Frontend (pantallas + RTK Query)
- **Semana 4-5:** Integración + flujos públicos (aprobación)
- **Semana 5-6:** Testing + QA
- **Semana 6-7:** Deploy + capacitación

---

## 🚀 Próximas Fases (Futuro)

- **Fase 2:** Firma digital, generación PDF, integración nómina, cálculo sueldo líquido automático
- **Fase 3:** Portal trabajador, solicitudes de cambio, notificaciones
- **Fase 4:** Reportes + analytics

---

**Última actualización:** 2026-06-04  
**Aprobado por:** JuanSnabbIT
