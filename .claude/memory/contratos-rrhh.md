---
name: contratos-rrhh
description: Contratos laborales, firma digital, estados, anexos, UsuarioEmpresa
lastUpdated: 2026-06-01
relatedFiles:
  - backend/rrhh/models.py
  - backend/rrhh/serializers.py
  - backend/contratos/motor_plantillas_v2.py
  - frontend/src/pages/RRHH/
  - .github/instructions/motor-plantillas-v2.md
---

# Contratos RRHH — Contratos Laborales (NUEVO - Sprint 21)

## ¿Qué es?

Sistema de **contratos de trabajo** para empleados de empresas cliente.

Un **trabajador** en ERP Snabbit = `UsuarioEmpresa` (usuario de empresa cliente) + al menos un `ContratoTrabajador` activo.

---

## Modelo Principal: ContratoTrabajador

**Ubicación:** `backend/rrhh/models.py`

```python
class ContratoTrabajador(ModeloBaseHistorico):
    # Identificación
    uuid = UUIDField(unique=True)
    
    # Partes del contrato
    empresa_prestadora = FK(Empresa)     # Snabbit (quien ofrece)
    empresa_cliente = FK(Empresa)        # Empresa donde trabaja
    trabajador = FK(UsuarioEmpresa)      # El empleado
    
    # Datos básicos
    cargo = CharField(max_length=255)
    departamento = CharField()
    fecha_inicio = DateField()
    fecha_termino = DateField(null=True)
    
    # 📋 Plantilla de contrato
    plantilla = FK(PlantillaContrato)    # V2 para renderizar
    
    # 💰 Remuneración
    remuneracion_mensual = DecimalField()
    tipo_contrato = CharField(choices=[
        ('indefinido', 'Indefinido'),
        ('plazo_fijo', 'Plazo Fijo'),
        ('obra', 'Obra'),
        ('practicante', 'Practicante'),
    ])
    
    # 📊 Previsión social (desgloses)
    afp = FK(AfpCatalogo)
    banco = FK(BancoCatalogo)
    numero_cuenta = CharField()
    tipo_cuenta = CharField(choices=[...])
    
    # 🎯 Estado
    estado = CharField(choices=ESTADOS_CONTRATO_TRABAJADOR)
    
    # 🔗 Relaciones
    anexos = RelatedManager  # AnexoContrato
    envios_firma = RelatedManager  # EnvioContratoTrabajadorFirma
```

---

## UsuarioEmpresa: El Trabajador

**Ubicación:** `backend/empresas/models.py`

```python
class UsuarioEmpresa:
    usuario = FK(User)              # Usuario Snabbit
    empresa = FK(Empresa)           # Empresa donde trabaja
    cargo = CharField()
    grupos = M2M(Group)             # Permisos del empleado
    es_administrador = BooleanField()
    
    # Un usuario puede tener múltiples UsuarioEmpresa
    # (trabajar en varias empresas clientes)
```

**Relación:**
- 1 User → N UsuarioEmpresa (user trabaja en varias empresas)
- 1 UsuarioEmpresa → N ContratoTrabajador (historia laboral)

---

## Estados del Contrato Laboral

**Definidos en:** `backend/rrhh/estados_modelo.py`

```
borrador
  ↓
enviado_firma  ← Se genera link público de firma
  ↓
firmado_trabajador  ← Trabajador firmó
  ↓
vigente  ← En efecto
  ↓
finalizado  ← Fecha término alcanzada
  (o) cancelado
```

---

## Componentes Relacionados

### 1. AnexoContrato
Documentos adjuntos al contrato:
```python
class AnexoContrato(ModeloBase):
    contrato = FK(ContratoTrabajador)
    titulo = CharField()          # "Beneficios", "Confidencialidad"
    contenido = TextField()       # Cláusulas
    orden = PositiveIntegerField()
    fue_editado_manualmente = BooleanField()
```

### 2. EnvioContratoTrabajadorFirma
Auditoría de firma digital:
```python
class EnvioContratoTrabajadorFirma(ModeloBase):
    contrato = FK(ContratoTrabajador)
    fecha_envio = DateTimeField()
    fecha_firma = DateTimeField(null=True)
    
    # Token para URL pública
    token_firma = CharField(unique=True)
    
    # Documento PDF + firma
    pdf_contenido = FileField()
    pdf_firmado = FileField(null=True)
    
    # Metadata firma
    ip_firma = CharField()
    navegador = CharField()
```

### 3. Catálogos de Referencia

```python
class AfpCatalogo(ModeloBase):
    nombre = CharField()          # "CAPITAL", "CUPRUM", etc.
    codigo = CharField(unique=True)
    comision_porcentaje = DecimalField()

class BancoCatalogo(ModeloBase):
    nombre = CharField()          # "SANTANDER", "ITAU", etc.
    codigo = CharField(unique=True)
    tipo_cuenta_choices = [...]   # Corriente, Ahorro, etc.
```

---

## Flujo Típico de Firma Digital

### Paso 1: Crear Contrato
```
Empresa cliente → Snabbit
  "Necesito un contrato para Juan García"
```

ViewSet crea `ContratoTrabajador`:
- Estado: `borrador`
- Plantilla: seleccionada
- Datos: remuneración, AFC, banco, etc.

### Paso 2: Generar Secciones (Motor V2)
```python
from contratos.adaptadores import AdaptadorContratoTrabajador
from contratos.motor_plantillas_v2 import generar_secciones_v2

adaptador = AdaptadorContratoTrabajador(contrato_trabajador)
secciones = generar_secciones_v2(adaptador)
# Interpola [trabajador.nombre], [empresa_cliente.nombre], 
#          [remuneracion_mensual], [afp.nombre], etc.
```

### Paso 3: Enviar a Firma
```
ViewSet.cambiar_estado("enviado_firma"):
  1. Generar PDF (secciones renderizadas)
  2. Crear EnvioContratoTrabajadorFirma con token
  3. Enviar email al trabajador con link público:
     /api/public/contrato-trabajador/{token}/firmar/
```

### Paso 4: Trabajador Firma (URL Pública)
```
GET /api/public/contrato-trabajador/{token}/
  → Devuelve PDF para que vea el contrato

POST /api/public/contrato-trabajador/{token}/firmar/
  → Firma digital (registra IP, navegador)
  → Cambia estado a "firmado_trabajador"
```

### Paso 5: Activar
```
Manual o automático → Estado "vigente"
```

---

## Motor V2: Diferencias B2B vs Laboral

**Etiquetas B2B:**
```
[empresa_cliente.nombre]
[total_servicios]
[moneda_cobro]
[cuotas_venta_tabla]
```

**Etiquetas Laboral:**
```
[trabajador.nombre]
[remuneracion_mensual]
[afp.nombre]
[banco.nombre]
[empresa_cliente.nombre]
```

**Implementación:** Patrón polimórfico con adaptadores:
- `AdaptadorContratoB2B` → resuelve etiquetas B2B
- `AdaptadorContratoTrabajador` → resuelve etiquetas laboral

Si adaptador NO puede resolver etiqueta (ej: B2B resolviendo `[remuneracion_mensual]`):
- Retorna `NOT_HANDLED` → se omite la etiqueta

---

## Multi-tenancy

✅ RRHH ViewSet filtra por empresa prestadora:

```python
def get_queryset(self):
    user = self.request.user
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    if personalizacion and personalizacion.sucursal_principal:
        empresa = personalizacion.sucursal_principal.empresa
        return ContratoTrabajador.objects.filter(
            empresa_prestadora=empresa
        )
    return ContratoTrabajador.objects.none()
```

---

## RTK Query Tags

En `frontend/src/services/RtkQueryService.ts`:

```typescript
'ContratoTrabajador',
'ContratoTrabajadorList',
'ContratoTrabajadorHistorial',
'CargoCatalogo',
'AfpCatalogo',
'BancoCatalogo',
'AnexoContrato',
```

---

## Frontend: Páginas Principales

### 1. ListaContratosTrabajador.tsx
```
✅ Crear contrato (wizard)
✅ Listar contratos (estado, trabajador, empresa)
✅ Ver detalles / editar
✅ Enviar a firma
```

### 2. DetalleContratoTrabajador.tsx
```
Tabs:
  - Datos laborales (cargo, remuneración, AFC)
  - Documento (visualizar PDF)
  - Anexos (cláusulas adicionales)
  - Historial (cambios de estado)
  - Firma (auditoría, fecha, IP)
```

### 3. CrearContratoTrabajadorWizard.tsx
```
Steps:
  1. Seleccionar trabajador (UsuarioEmpresa)
  2. Datos laborales (cargo, remuneración)
  3. Previsión (AFP, banco, cuenta)
  4. Términos (tipo contrato, fecha inicio/fin)
  5. Plantilla (seleccionar template)
  6. Review + crear
```

### 4. ContratoAprobacionEmpleador.tsx (Pública)
```
URL: /contrato-aprobacion-empleador/{token}
  ✅ Ver contrato (PDF)
  ✅ Botón "Firmar digitalmente"
  ✅ Registro de firma (hora, IP)
```

---

## Cuándo Usar Esto

- Entender flujo de firma digital
- Trabajar con motor V2 (plantillas)
- Debugging de contratos laborales
- Integración con AFP/bancos
- Auditoría de firmas

---

**Diferencia clave:** Laborales usan firma pública + token, B2B es interno sin firma.
