---
name: contratos-b2b
description: Contratos comerciales B2B, servicios, licencias, plantillas V2, flujos de aprobación
lastUpdated: 2026-06-01
relatedFiles:
  - backend/contratos/models.py
  - backend/contratos/serializers.py
  - backend/contratos/motor_plantillas_v2.py
  - backend/contratos/currency_utils.py
  - frontend/src/pages/Contratos/
  - .github/instructions/motor-plantillas-v2.md
---

# Contratos B2B — Contratos Comerciales

## ¿Qué es?

Acuerdos formales entre una **empresa prestadora** y una **empresa cliente** para servicios o licencias. Incluyen:
- Servicios (soporte técnico, consultoría)
- Licencias de software (con modalidades anuales/mensuales)
- Cuotas de venta
- Términos de pago (mensual, anual, pago único)
- Moneda de cobro (CLP, USD, UF)

---

## Modelo Principal: ContratoEmpresaCliente

**Ubicación:** `backend/contratos/models.py` (línea 20+)

```python
class ContratoEmpresaCliente(ModeloBaseHistorico):
    empresa_prestadora = FK(Empresa)       # Quien ofrece
    empresa_cliente = FK(Empresa)          # Quien compra
    fecha_inicio = DateField()
    fecha_fin = DateField(null=True)
    estado = CharField(choices=ESTADOS_CONTRATO)
    
    # 💱 Moneda de cobro (CRÍTICO)
    moneda_cobro = CharField(choices=[
        ('CLP', 'Pesos Chilenos'),
        ('USD', 'Dólares Americanos'),
        ('UF', 'Unidad de Fomento'),
    ])
    
    # 📋 Plantilla (NUEVO - V2)
    plantilla = FK(PlantillaContrato, null=True)
    plantilla_version_usada = CharField(max_length=50)
    
    # 📸 Snapshots de tasas (CRÍTICO para contratos en aprobación)
    snapshot_tasa_dolar = DecimalField(null=True)
    snapshot_tasa_uf = DecimalField(null=True)
    snapshot_total_venta = DecimalField(null=True)
    snapshot_total_servicios = DecimalField(null=True)
    
    # Relaciones
    servicios_genericos = M2M(Servicio, through=ContratoServicio)
    licencias = M2M(Licencia, through=ContratoLicencia)
    visitas = M2M(Visita, through=ContratoVisita)
```

---

## Estados del Contrato

**Definidos en:** `backend/contratos/estados_modelo.py`

```
borrador
  ↓
enviado_aprobacion_cliente  ← Congela snapshots aquí ⭐
  ↓
cambios_solicitados  ↔ (cliente solicita cambios)
  ↓
aprovado  ← Cliente aprobó
  ↓
firmado  ← Documento final con firmas
  ↓
activo  ← En vigencia
  ↓
finalizado  ← Fecha fin alcanzada
  (o) cancelado  ← Cancelado explícitamente
```

---

## Componentes Relacionados

### 1. ContratoServicio
Relación entre contrato y servicio con detalles comerciales:
```python
class ContratoServicio:
    contrato = FK(ContratoEmpresaCliente)
    servicio = FK(Servicio)
    cantidad = IntegerField()
    precio_unitario = DecimalField()
    moneda = CharField(choices=[CLP, USD, UF])  # Moneda individual
    total_para_forma_pago = DecimalField()      # Calculado
```

### 2. ContratoLicencia
Licencia de software dentro del contrato:
```python
class ContratoLicencia:
    contrato = FK(ContratoEmpresaCliente)
    licencia = FK(Licencia)
    modalidad = CharField(choices=[P1M, P1Y, PAGO_UNICO])
    precio = DecimalField()
    moneda = CharField()
    cantidad_licencias = IntegerField()
```

### 3. ContratoVisita
Visitas de soporte incluidas:
```python
class ContratoVisita:
    contrato = FK(ContratoEmpresaCliente)
    visita = FK(Visita)
    cantidad_mensuales = IntegerField()
    cantidad_usadas = IntegerField()
```

---

## Flujo Típico de Aprobación

### Fase 1: Borrador
- Usuario crea contrato
- Agrega servicios, licencias, visitas
- Sistema calcula totales con **tasas actuales**
- Cliente puede revisar en BORRADORES

### Fase 2: Enviado a Aprobación ⭐ SNAPSHOT
```python
# En ViewSet, al cambiar estado a "enviado_aprobacion_cliente":
dolar, uf = obtener_tipos_cambio_actuales()
contrato.snapshot_tasa_dolar = dolar
contrato.snapshot_tasa_uf = uf
contrato.snapshot_total_venta = calcular_total_venta(contrato)
contrato.snapshot_total_servicios = calcular_total_servicios(contrato)
contrato.save()
```

**POR QUÉ snapshots?** Si el contrato queda 7 días en aprobación y el USD sube 5%, los totales cambiarían. Snapshots = totales congelados.

### Fase 3: Cliente Aprueba
- Cliente ve números congelados (snapshots)
- Si solicita cambios → vuelve a borrador, se recalculan
- Si aprueba → estado `aprobado`

### Fase 4: Firmado
- Se genera PDF con etiquetas interpoladas
- Se adjunta documento final firmado
- Estado `firmado`

---

## Plantillas V2 (Nuevo)

### ¿Qué es?
Motor que genera el contenido del contrato por interpolación de etiquetas.

```
[empresa_cliente.nombre] contrata a [empresa_prestadora.nombre]
por los siguientes servicios:

[total_servicios]

Moneda: [moneda_cobro]
```

Se convierte a:

```
Acme Corp contrata a Snabbit SPA
por los siguientes servicios:

Soporte TI: $5.000.000 CLP
...

Moneda: CLP
```

### Componentes
- **PlantillaContrato:** Definición (título, versión, secciones)
- **SeccionPlantilla:** Cada sección con contenido template
- **EtiquetaPlantilla:** Variables disponibles (`[cliente.nombre]`, `[total_servicios]`, etc.)
- **SeccionContratoGenerada:** Resultado renderizado (editable manualmente)

### Flujo
1. Crear/seleccionar plantilla
2. Generar secciones (interpolar etiquetas)
3. Usuario puede editar manualmente si `fue_editado_manualmente=False` → permitir re-render
4. Si `fue_editado_manualmente=True` → proteger de re-render

---

## Multi-tenancy

✅ Verificado: ViewSet filtra por empresa.

```python
def get_queryset(self):
    user = self.request.user
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    if personalizacion and personalizacion.sucursal_principal:
        empresa = personalizacion.sucursal_principal.empresa
        return ContratoEmpresaCliente.objects.filter(
            empresa_prestadora=empresa
        )
    return ContratoEmpresaCliente.objects.none()
```

---

## RTK Query Tags

En `frontend/src/services/RtkQueryService.ts`:

```typescript
'Contratos',
'Contrato',
'ContratosDashboard',
'ContratoServicios',
'ContratoLicencias',
'ContratoVisitas',
'ContratoCondiciones',
'ContratoUsuarios',
'ContratoFirmas',
'FacturasContrato',
'FacturaContrato',
'FacturasContratoResumen',
'ContratoCotizaciones',
'ContratosActivosCliente',
'PlantillasContrato',
'EtiquetasPlantilla',
'SeccionesContratoGeneradas',
```

---

## Cuándo Usar Esto

- Entender flujo B2B vs laboral
- Trabajar con snapshots de tasas
- Implementar nuevas funciones de contrato
- Integrar plantillas V2
- Debugging de moneda / conversión

---

**Diferencia B2B vs Laboral:** B2B es comercial (empresa-empresa), Laboral es ContratoTrabajador (empleador-trabajador). Modelos completamente distintos.
