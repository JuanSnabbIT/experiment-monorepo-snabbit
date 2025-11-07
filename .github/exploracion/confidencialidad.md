# Módulo de Confidencialidad en Contratos

## 📋 Índice
1. [Concepto General](#concepto-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Flujo de Uso](#flujo-de-uso)
4. [Modelos Involucrados](#modelos-involucrados)
5. [Casos de Uso](#casos-de-uso)
6. [Guía Práctica](#guía-práctica)

---

## Concepto General

### ¿Qué es un Acuerdo de Confidencialidad?

Un **Acuerdo de Confidencialidad** (también llamado NDA - Non-Disclosure Agreement) es un contrato legal mediante el cual las partes se comprometen a:

- 🔒 **Mantener información en secreto**: No revelar información sensible a terceros
- 📝 **Definir qué información es confidencial**: Especificar claramente qué se protege
- ⏱️ **Establecer duración**: Cuánto tiempo dura la obligación de confidencialidad
- ⚖️ **Consecuencias del incumplimiento**: Penalidades legales por violación del acuerdo

### ¿Por qué es importante en un ERP?

En un sistema ERP que gestiona contratos de servicios tecnológicos, la confidencialidad es **crítica** porque:

1. **Acceso a infraestructura**: Los proveedores acceden a sistemas internos del cliente
2. **Datos sensibles**: Manejan información de clientes, estrategias de negocio, etc.
3. **Propiedad intelectual**: Código fuente, diseños, arquitecturas son confidenciales
4. **Cumplimiento normativo**: Leyes de protección de datos (Ley 19.628 en Chile, GDPR)
5. **Responsabilidad legal**: Ambas partes necesitan protección jurídica

---

## Arquitectura del Sistema

El sistema de confidencialidad en este ERP tiene **dos niveles**:

### Nivel 1: Acuerdos Base (Plantillas)

**Modelo**: `AcuerdoConfidencialidadBase` (app `core`)

```python
class AcuerdoConfidencialidadBase(ModeloBaseHistorico):
    titulo = CharField        # Ej: "NDA Estándar - Bilateral"
    contenido = TextField     # Texto completo del acuerdo
```

**Propósito**: 
- Son **plantillas reutilizables** de acuerdos de confidencialidad
- Se crean una vez y se usan en múltiples contratos
- Contienen el texto legal estándar del NDA

**Ejemplos de plantillas**:
- NDA Unilateral (solo el cliente revela información)
- NDA Bilateral (ambas partes comparten información)
- NDA para Desarrollo de Software
- NDA para Infraestructura/Datacenter
- NDA para Proyectos de Consultoría

### Nivel 2: Acuerdos Vinculados a Contratos

**Modelo**: `AcuerdoConfidencialidadContrato` (app `contratos`)

```python
class AcuerdoConfidencialidadContrato(ModeloBaseHistorico):
    contrato = ForeignKey(ContratoEmpresaCliente)  # Contrato al que aplica
    acuerdo_base = ForeignKey(AcuerdoConfidencialidadBase)  # Plantilla usada
```

**Propósito**:
- Vincula una **plantilla de NDA** a un **contrato específico**
- Cada contrato puede tener múltiples acuerdos (ej: uno general + uno para cada proyecto)
- Es la instancia concreta del acuerdo que se firma

---

## Flujo de Uso

### Paso 1: Crear Plantillas de Acuerdos (Una sola vez)

**Quién lo hace**: Administrador del sistema o área legal

**Cuándo**: En la configuración inicial del sistema

**Dónde**: Django Admin → Core → Acuerdos de Confidencialidad Base

**Cómo**:
1. Ir a `/admin/core/acuerdoconfidencialidadbase/`
2. Click en "Agregar Acuerdo de Confidencialidad Base"
3. Llenar:
   - **Título**: Nombre descriptivo (ej: "NDA Estándar - Bilateral")
   - **Contenido**: Texto completo del acuerdo legal (puede ser extenso)
4. Guardar

**Resultado**: Se crea una plantilla reutilizable

**Script automatizado**:
```cmd
cd backend
ENV\Scripts\python.exe ..\scripts\setup\seed_acuerdos_confidencialidad.py
```
Este script crea 5 plantillas de NDA predefinidas.

---

### Paso 2: Vincular Acuerdo a un Contrato

**Quién lo hace**: Usuario que crea/edita el contrato

**Cuándo**: Al crear o modificar un contrato que requiera confidencialidad

**Dónde**: Django Admin → Contratos → Contrato Empresa Cliente → (editar contrato existente)

**Cómo**:

#### Opción A: Inline en el formulario de contrato

1. Ir al contrato existente (ej: `http://localhost:8000/admin/contratos/contratoempresacliente/X/change/`)
2. Buscar la sección **"FIRMAS DE CONFIDENCIALIDAD"** (inline al final del formulario)
3. Click en "Agregar otra Firma de acuerdo de confidencialidad"
4. Seleccionar en el dropdown **"Acuerdo base"** la plantilla deseada
   - Ejemplo: "NDA Estándar - Bilateral"
5. Guardar el contrato

#### Opción B: Crear directamente el vínculo

1. Ir a `/admin/contratos/acuerdoconfidencialidadcontrato/`
2. Click "Agregar Firma de Acuerdo de Confidencialidad"
3. Seleccionar:
   - **Contrato**: El contrato al que aplica
   - **Acuerdo base**: La plantilla de NDA
4. Guardar

**Resultado**: El acuerdo de confidencialidad queda vinculado al contrato

---

### Paso 3: Revisar Acuerdos Vinculados

**Consulta en Django Admin**:
- Ver todos los acuerdos de un contrato: Editar el contrato → sección "Firmas de confidencialidad"
- Ver qué contratos usan un acuerdo base: Editar el acuerdo base → pestaña "Firmas" (related_name)

**Consulta en código**:
```python
# Obtener acuerdos de un contrato
contrato = ContratoEmpresaCliente.objects.get(id=1)
acuerdos = contrato.firmas_confidencialidad.all()

for firma in acuerdos:
    print(f"Acuerdo: {firma.acuerdo_base.titulo}")
    print(f"Contenido: {firma.acuerdo_base.contenido}")
```

---

## Modelos Involucrados

### Relación entre modelos

```
┌─────────────────────────────────┐
│ AcuerdoConfidencialidadBase     │  ← Plantillas (app: core)
│ (Plantilla de NDA)              │
│ - titulo                        │
│ - contenido (texto del NDA)     │
└────────────┬────────────────────┘
             │
             │ FK (acuerdo_base)
             │
             ▼
┌─────────────────────────────────┐
│ AcuerdoConfidencialidadContrato │  ← Instancias (app: contratos)
│ (NDA aplicado a un contrato)    │
│ - contrato  ────────────────┐   │
│ - acuerdo_base              │   │
└─────────────────────────────┼───┘
                              │
                              │ FK (contrato)
                              ▼
                    ┌─────────────────────┐
                    │ ContratoEmpresaCliente
                    │ - empresa_prestadora
                    │ - empresa_cliente
                    │ - servicios
                    │ - licencias
                    │ - firmas_confidencialidad ←─┐
                    └─────────────────────────────┘
```

### Campos detallados

#### AcuerdoConfidencialidadBase (core.models)

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `id` | AutoField | ID único | 1 |
| `titulo` | CharField(255) | Nombre del acuerdo | "NDA Estándar - Bilateral" |
| `contenido` | TextField | Texto completo del NDA | "ACUERDO DE CONFIDENCIALIDAD..." |
| `fecha_creacion` | DateTimeField | Cuándo se creó la plantilla | 2025-01-15 10:00 |
| `fecha_modificacion` | DateTimeField | Última edición | 2025-01-20 15:30 |

**Relaciones**:
- `firmas` (reverse FK): Contratos que usan esta plantilla

#### AcuerdoConfidencialidadContrato (contratos.models)

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `id` | AutoField | ID único | 1 |
| `contrato` | ForeignKey | Contrato vinculado | Contrato #5 |
| `acuerdo_base` | ForeignKey | Plantilla de NDA | "NDA Estándar - Bilateral" |
| `fecha_creacion` | DateTimeField | Cuándo se vinculó | 2025-02-01 09:00 |
| `fecha_modificacion` | DateTimeField | Última edición | 2025-02-01 09:00 |

**Relaciones**:
- `contrato` → `ContratoEmpresaCliente`
- `acuerdo_base` → `AcuerdoConfidencialidadBase`

---

## Casos de Uso

### Caso 1: Contrato de Servicios de Desarrollo

**Escenario**: 
- Empresa Snabbit (prestadora) desarrollará un sistema a medida para Cliente A
- Necesitan proteger el código fuente y los requisitos de negocio

**Solución**:
1. Crear contrato normal (empresa prestadora, cliente, fechas, etc.)
2. Agregar servicios (Desarrollo Web Personalizado)
3. Vincular acuerdo: **"NDA - Proyectos de Desarrollo de Software"**
   - Protege: código fuente, requisitos, modelos de datos, diseños UI
   - Define: quién es dueño del código desarrollado
   - Duración: 3 años post-proyecto

**Beneficio**: Claridad jurídica sobre propiedad intelectual y uso del código

---

### Caso 2: Contrato de Hosting/Datacenter

**Escenario**:
- Snabbit gestionará la infraestructura de Cliente B
- Tendrá acceso a configuraciones de red, credenciales, datos de clientes

**Solución**:
1. Crear contrato de tipo "Servicios"
2. Agregar servicios (Hosting Datacenter, Monitoreo 24/7)
3. Vincular acuerdo: **"NDA - Infraestructura y Datacenter"**
   - Protege: topología de red, credenciales, planes de disaster recovery
   - Obliga: segregación de clientes, eliminación de datos al terminar
   - Duración: 5 años post-contrato

**Beneficio**: Cumplimiento de normativas de seguridad (ISO 27001, SOC 2)

---

### Caso 3: Contrato con Múltiples Acuerdos

**Escenario**:
- Contrato integral que incluye desarrollo + hosting + soporte
- Cada área tiene requisitos de confidencialidad diferentes

**Solución**:
1. Crear contrato con todos los servicios
2. Vincular **múltiples acuerdos**:
   - "NDA - Proyectos de Desarrollo de Software" (para el equipo de desarrollo)
   - "NDA - Infraestructura y Datacenter" (para el equipo de operaciones)
   - "NDA Estándar - Bilateral" (acuerdo general para ambas empresas)

**Beneficio**: Protección específica por área sin sobrecargar un solo documento

---

### Caso 4: Actualización de Plantilla

**Escenario**:
- El área legal actualiza el texto del "NDA Estándar - Bilateral"
- Ya existen 10 contratos usando esa plantilla

**Solución**:
1. Editar `AcuerdoConfidencialidadBase` con ID del acuerdo
2. Actualizar el campo `contenido`
3. Guardar

**Resultado**:
- Los 10 contratos existentes automáticamente "ven" el nuevo texto
- No hay que actualizar cada contrato manualmente
- El historial (ModeloBaseHistorico) registra cuándo se cambió

**Importante**: Si es cambio sustancial, considerar:
- Crear una **nueva versión** de la plantilla (ej: "NDA Estándar - Bilateral v2")
- Contratos antiguos mantienen la versión vieja
- Contratos nuevos usan la versión actualizada

---

## Guía Práctica

### Escenario: Acabas de crear un contrato

**Situación actual**:
- Contrato creado con empresa cliente seleccionada
- Agregaste Plan de Mantención Infraestructura (cantidad: 1, precio: 1000)
- Agregaste Licencia Microsoft 365 (cantidad: 10, precio: 1000 USD)
- Agregaste un usuario vinculado
- **BLOQUEADO** en Confidencialidad: dropdown "Acuerdo Base" vacío

---

### Solución paso a paso

#### Paso 1: Crear acuerdos base (si no existen)

**Opción automática** (RECOMENDADO):
```cmd
cd backend
ENV\Scripts\python.exe ..\scripts\setup\seed_acuerdos_confidencialidad.py
```

**Resultado**: Se crean 5 plantillas de NDA:
1. NDA Estándar - Unilateral
2. NDA Estándar - Bilateral
3. NDA Simplificado - Servicios Tecnológicos
4. NDA - Proyectos de Desarrollo de Software
5. NDA - Infraestructura y Datacenter

---

**Opción manual**:
1. Ir a: `http://localhost:8000/admin/core/acuerdoconfidencialidadbase/`
2. Click "Agregar Acuerdo de Confidencialidad Base"
3. Llenar:
   - **Título**: "NDA Servicios de Mantención"
   - **Contenido**: (copiar texto de ejemplo más abajo)
4. Guardar

**Ejemplo de contenido para mantención**:
```
ACUERDO DE CONFIDENCIALIDAD - SERVICIOS DE MANTENCIÓN

Las partes acuerdan mantener confidencial:

1. INFORMACIÓN PROTEGIDA
   - Configuraciones de sistemas e infraestructura del cliente
   - Credenciales de acceso proporcionadas para mantenimiento
   - Vulnerabilidades detectadas durante revisiones preventivas
   - Planes de actualización y roadmaps tecnológicos

2. OBLIGACIONES DEL PROVEEDOR
   a) No revelar información sobre la infraestructura del cliente
   b) Eliminar todos los accesos temporales post-mantenimiento
   c) Reportar vulnerabilidades únicamente al cliente (no a terceros)
   d) No utilizar herramientas o configuraciones del cliente en otros proyectos

3. OBLIGACIONES DEL CLIENTE
   a) No revelar metodologías y procedimientos propietarios del proveedor
   b) Reconocer que los procedimientos de mantenimiento son propiedad del proveedor

4. VIGENCIA
   Durante el contrato y 2 años posteriores.
```

---

#### Paso 2: Recargar la página del contrato

1. Refrescar la página del contrato en el navegador (F5)
2. Scroll hasta la sección **"Firmas de acuerdo de confidencialidad"**
3. Ahora el dropdown **"Acuerdo base"** mostrará las plantillas creadas

---

#### Paso 3: Vincular el acuerdo al contrato

1. En la sección "Firmas de acuerdo de confidencialidad", click **"Agregar otra Firma..."**
2. En el dropdown **"Acuerdo base"**, seleccionar:
   - Para tu caso (mantención): **"NDA - Infraestructura y Datacenter"** 
   - O la que creaste manualmente: **"NDA Servicios de Mantención"**
3. Guardar el contrato (botón "Guardar" al final del formulario)

**Resultado**: 
- El acuerdo queda vinculado al contrato
- En la lista, verás: "Firma de [NDA seleccionado] para Contrato #[ID]"

---

### Campos del formulario explicados

Cuando intentas crear una firma de confidencialidad, el formulario muestra:

| Campo | Descripción | ¿Es obligatorio? | ¿Qué poner? |
|-------|-------------|------------------|-------------|
| **Acuerdo Base** | Plantilla de NDA a usar | ✅ SÍ | Seleccionar del dropdown (requiere haberlas creado primero) |
| **Contenido** | Texto del acuerdo | ❌ NO (read-only) | Se llena automáticamente desde la plantilla seleccionada |
| **Fecha de firma** | Cuándo se firmó | ❌ NO | Dejar vacío (se llenará cuando el usuario firme) |
| **Firmado** | ¿Ya está firmado? | ❌ NO | Dejar desmarcado inicialmente |
| **Usuario** | Quién firma | ⚠️ DEPENDE | Relacionado con `EnvioContratoFirmaUsuario` (funcionalidad de firma electrónica) |
| **Archivo** | Documento firmado | ❌ NO | Si subes PDF escaneado con firmas |
| **Firma** | Firma digital | ❌ NO | Si usas firma electrónica en el sistema |

**Nota importante**: El campo "Contenido" dice "seleccionar primero un acuerdo base" porque:
- Es un campo **calculado/read-only**
- Se rellena automáticamente con el texto de la plantilla elegida
- No lo editas directamente, solo seleccionas la plantilla

---

### Verificación: ¿Funcionó?

Después de guardar el contrato:

1. **Ver en el admin del contrato**:
   - Editar el contrato
   - Scroll a "Firmas de acuerdo de confidencialidad"
   - Deberías ver: "Firma de [NDA] para Contrato #[ID]"

2. **Ver en lista de acuerdos**:
   - Ir a: `/admin/contratos/acuerdoconfidencialidadcontrato/`
   - Buscar el contrato
   - Ver qué acuerdo está vinculado

3. **Consulta en shell Django**:
```python
from contratos.models import ContratoEmpresaCliente

contrato = ContratoEmpresaCliente.objects.get(id=TU_CONTRATO_ID)
acuerdos = contrato.firmas_confidencialidad.all()

for firma in acuerdos:
    print(f"Acuerdo: {firma.acuerdo_base.titulo}")
    print(f"Texto completo:\n{firma.acuerdo_base.contenido}")
```

---

## Preguntas Frecuentes

### ¿Puedo tener múltiples acuerdos en un mismo contrato?

**Sí**. Un contrato puede tener varios `AcuerdoConfidencialidadContrato` vinculados.

**Ejemplo**:
- NDA general (bilateral)
- NDA específico para desarrollo
- NDA específico para infraestructura

---

### ¿Qué pasa si edito una plantilla de acuerdo base?

**Todos los contratos que usan esa plantilla verán el texto actualizado** porque usan ForeignKey.

**Recomendación**: Si el cambio es sustancial:
1. Crear nueva plantilla (versión 2)
2. Contratos existentes mantienen versión 1
3. Nuevos contratos usan versión 2

---

### ¿Dónde se almacenan las firmas electrónicas?

El sistema tiene soporte básico para firmas digitales en `EnvioContratoFirmaUsuario`, pero la funcionalidad completa depende de integración con servicios de firma electrónica (ej: DocuSign, Adobe Sign).

Actualmente puedes:
- Marcar como "firmado" manualmente
- Subir PDF escaneado con firmas
- Registrar fecha de firma

---

### ¿Cómo elimino un acuerdo de un contrato?

1. Editar el contrato
2. En la sección "Firmas de acuerdo de confidencialidad"
3. Marcar checkbox "Eliminar" junto al acuerdo
4. Guardar contrato

**Nota**: Esto elimina la **vinculación**, no la plantilla base.

---

### ¿Puedo exportar el acuerdo firmado?

Actualmente el sistema almacena el texto, pero generar PDF con firmas requiere:
1. Integración con biblioteca de generación de PDFs (ReportLab, WeasyPrint)
2. Template del documento con encabezados, pies de página, logos
3. Inserción de firmas digitales o escaneadas

**Workaround actual**:
- Copiar contenido del acuerdo
- Pegar en Word/Google Docs
- Formatear como documento legal
- Enviar para firma electrónica externa

---

## Próximos Pasos Sugeridos

### Para el administrador del sistema:

1. ✅ **Ejecutar seed de acuerdos**: 
   ```cmd
   ENV\Scripts\python.exe ..\scripts\setup\seed_acuerdos_confidencialidad.py
   ```

2. 📝 **Revisar plantillas creadas**:
   - Adaptar textos a la legislación local (chilena en este caso)
   - Consultar con área legal si es necesario
   - Crear versiones específicas por tipo de servicio

3. 📋 **Documentar políticas internas**:
   - Qué tipo de contrato usa qué NDA
   - Quién aprueba los acuerdos
   - Procedimiento de firma

---

### Para desarrolladores:

1. 🔌 **Integrar firma electrónica**: Conectar con DocuSign/Adobe Sign API
2. 📄 **Generación de PDFs**: Implementar export de acuerdos en formato PDF
3. 📧 **Notificaciones**: Email automático cuando se vincula un NDA al contrato
4. 🔍 **Auditoría**: Logging de quién crea/modifica/elimina acuerdos

---

## Resumen Ejecutivo

**Problema resuelto**: 
Dropdown "Acuerdo Base" vacío → necesitas crear plantillas primero

**Solución inmediata**:
```cmd
cd backend
ENV\Scripts\python.exe ..\scripts\setup\seed_acuerdos_confidencialidad.py
```

**Resultado**:
- 5 plantillas de NDA creadas
- Dropdown ahora funcional
- Puedes vincular acuerdos a contratos

**Concepto clave**:
- **Acuerdo Base** = Plantilla reutilizable (se crea una vez)
- **Firma de Confidencialidad** = Instancia de la plantilla aplicada a un contrato específico

**Flujo completo**:
1. Crear plantillas (una sola vez) → Acuerdos Base
2. Crear contrato → ContratoEmpresaCliente
3. Vincular plantilla a contrato → AcuerdoConfidencialidadContrato
4. (Opcional) Registrar firmas de usuarios
