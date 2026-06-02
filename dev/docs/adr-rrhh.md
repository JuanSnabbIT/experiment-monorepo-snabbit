# ADR — Módulo RRHH: Decisiones de Diseño

**Responsable:** Equipo Snabbit  
**Fecha de debate:** Mayo 2026  
**Próxima revisión:** Noviembre 2026  
**Estado:** Backlog acordado — pendiente implementación  

> Estas decisiones fueron tomadas en sesiones de debate iterativo punto a punto.
> Ningún cambio ha sido implementado aún. El presente documento es el backlog de implementación autorizado.

---

## Índice

1. [Modelo: Tipos de contrato](#adr-01)
2. [Modelo: Jornada laboral](#adr-02)
3. [Modelo: Motivos de término de contrato](#adr-03)
4. [Modelo: Campos legales faltantes en ContratoTrabajador](#adr-04)
5. [Modelo: Renombres de campos y tabs](#adr-05)
6. [Remuneraciones: Descuentos legales desglosados](#adr-06)
7. [Remuneraciones: Gratificación legal](#adr-07)
8. [Remuneraciones: Validación de ingreso mínimo mensual](#adr-08)
9. [Validación de RUT](#adr-09)
10. [Previsión y datos bancarios: AFP catálogo cerrado](#adr-10)
11. [Wizard: Datos previsionales en modo trabajador existente](#adr-11)
12. [Backend: Bug multi-tenancy en get_queryset](#adr-12)
13. [UsuarioEmpresa: Inconsistencias de campos](#adr-13)
14. [Arquitectura frontend: Clientes/ vs RRHH/](#adr-14)
15. [Estado de contrato: renombrar `pendiente_aceptacion`](#adr-15)
16. [`AnexoContrato`: numeracion secuencial automatica](#adr-16)
17. [Alerta de vencimiento para contratos a plazo fijo](#adr-17)
18. [Modelo `Finiquito` y `ConceptoFiniquito`](#adr-18)
19. [Contrato `reemplazo`: campos opcionales de referencia](#adr-19)
20. [Eliminar tipo de contrato `obra_o_faena`](#adr-20)
21. [Separar estado `anulado` en `descartado` y `anulado`](#adr-21)
22. [Transición `borrador → vigente` sin paso de aprobación](#adr-22)
23. [Corregir label `'Desactivo'` en `ESTADO_USUARIO_EMPRESA`](#adr-23)
24. [Semántica del campo `cargo` en `UsuarioEmpresa` vs `ContratoTrabajador`](#adr-24)
25. [Labels de `fecha_inicio` y `fecha_contrato` en el wizard](#adr-25)
26. [Campo companion para `sistema_salud = 'otro'`](#adr-26)
27. [Agregar `tasa_cotizacion` a `AfpCatalogo`](#adr-27)
28. [Validación RUT Módulo 11: ubicación en backend y frontend](#adr-28)
29. [Estructura de rutas y tabs de la vista RRHH](#adr-29)
30. [Firma digital base64 y Ley 19.799 — fuera de scope](#adr-30)

---

<a name="adr-01"></a>
## ADR-01 — Tipos de contrato: eliminar `honorarios`

### Contexto
`TIPO_CONTRATO` en `estados_modelo.py` incluye la opción `honorarios`. En la legislación laboral chilena (Código del Trabajo), los honorarios son un contrato civil (prestación de servicios), no un contrato de trabajo. No genera relación laboral, no aplica jornada, no aplica descuentos previsionales obligatorios, ni derecho a vacaciones legales. Mantenerlo como tipo de contrato laboral en el ERP es semánticamente incorrecto y potencialmente induce errores legales al usuario.

### Decisión
Eliminar `"honorarios"` del choice `TIPO_CONTRATO`. El módulo RRHH solo cubre contratos laborales con relación de dependencia.

### Alternativas consideradas
- **Mantener con advertencia visual:** Agregar un badge o alerta "no es contrato laboral". Rechazada: genera confusión y no resuelve el problema semántico.
- **Crear módulo separado para honorarios:** Fuera del alcance actual.

### Consecuencias
- Migración de datos: registros existentes con `tipo_contrato = "honorarios"` deben ser convertidos o archivados antes de eliminar la opción.
- `TIPO_CONTRATO` queda con: `indefinido`, `plazo_fijo`, `reemplazo`, `obra_o_faena`. *(ADR-20 elimina `obra_o_faena` posteriormente; estado final: `indefinido`, `plazo_fijo`, `reemplazo`.)*
- Todos los lugares que renderizan este label deben actualizarse.

---

<a name="adr-02"></a>
## ADR-02 — Jornada laboral: opciones de horas semanales y eliminación de `part_time`

### Contexto
Dos problemas independientes en `JORNADA_CONTRATO` y el campo `horas_semanales`:

1. El selector de horas semanales en `StepJornada.tsx` permite valores arbitrarios incluyendo 45 horas, que excede el límite legal transitorio en Chile (Ley 21.561 reduce a 44h desde 2026, 40h desde 2028).
2. `JORNADA_CONTRATO` tiene la opción `part_time` que es redundante con `parcial` — son semánticamente equivalentes.

### Decisión

**Horas semanales:**
- Opciones fijas: `[20, 25, 30, 36, 40, 42, 44]`
- Mantener `isCreatable` para casos especiales con `formatCreateLabel={(v) => \`Agregar "${v}" horas\`}`
- Mostrar advertencia no bloqueante si el valor ingresado supera 40h (referencia a reducción progresiva de jornada)
- Constante en `types.ts`: `export const HORAS_SEMANALES_OPTIONS = [20, 25, 30, 36, 40, 42, 44]`

**Jornada:**
- Eliminar la opción `"part_time"` de `JORNADA_CONTRATO`
- Mantener `"parcial"` con label actualizado: `"Jornada Parcial (Part-Time)"`
- Migración de datos: registros con `jornada = "part_time"` → `"parcial"`

### Alternativas consideradas
- **Validación hard limit a 44h:** Demasiado restrictivo para registros históricos o contratos pactados antes de la ley.
- **Eliminar `parcial` también:** No corresponde, `parcial` es el término correcto del CT.

### Consecuencias
- Migración Django requerida para `part_time → parcial`
- Frontend: actualizar `StepJornada.tsx` con las nuevas opciones y la advertencia
- Las constantes de horas van en `frontend/src/pages/RRHH/components/trabajador/types.ts`

---

<a name="adr-03"></a>
## ADR-03 — Motivos de término de contrato expandidos

### Contexto
`MOTIVO_TERMINO_CONTRATO` actual tiene 5 opciones que no cubren la taxonomía legal completa del Código del Trabajo chileno. Específicamente faltan causales del Art. 159, Art. 160 y Art. 161 CT, que tienen diferencias sustantivas en derechos del trabajador (indemnizaciones, aviso previo).

### Decisión
Reemplazar el conjunto actual por las siguientes 10 opciones que cubren los artículos relevantes:

```python
MOTIVO_TERMINO_CONTRATO = (
    ("mutuo_acuerdo",        "Mutuo acuerdo (Art. 159 N°1)"),
    ("renuncia",             "Renuncia voluntaria (Art. 159 N°2)"),
    ("muerte_trabajador",    "Muerte del trabajador (Art. 159 N°3)"),
    ("vencimiento_plazo",    "Vencimiento del plazo (Art. 159 N°4)"),
    ("conclusion_obra",      "Conclusión de obra o faena (Art. 159 N°5)"),
    ("caso_fortuito",        "Caso fortuito o fuerza mayor (Art. 159 N°6)"),
    ("causal_art160",        "Causal disciplinaria (Art. 160)"),
    ("necesidades_empresa",  "Necesidades de la empresa (Art. 161 inc. 1°)"),
    ("desahucio",            "Desahucio del empleador (Art. 161 inc. 2°)"),
    ("otro",                 "Otro"),
)
```

### Alternativas consideradas
- **Mantener conjunto simplificado:** El riesgo es que el usuario escoja "otro" para casos que sí tienen causal específica.
- **Agrupar por artículo (subchoices):** No soportado nativamente en Django choices estándar.

### Consecuencias
- Migración: mapear valores anteriores a los nuevos (principalmente `necesidades_empresa` y `renuncia` son directos; `vencimiento_plazo` también).
- `otro` se mantiene como escape pero queda claro que es residual.

---

<a name="adr-04"></a>
## ADR-04 — Campos legales faltantes en ContratoTrabajador

### Contexto
El Art. 10 del Código del Trabajo exige que el contrato individual de trabajo contenga, entre otros, el estado civil del trabajador y su profesión u oficio. El modelo `ContratoTrabajador` no tiene estos campos.

### Decisión
Agregar al modelo `ContratoTrabajador`:

```python
# Datos personales del trabajador (Art. 10 CT)
ESTADO_CIVIL = (
    ("soltero_a",           "Soltero/a"),
    ("casado_a",            "Casado/a"),
    ("conviviente_civil",   "Conviviente civil"),
    ("divorciado_a",        "Divorciado/a"),
    ("viudo_a",             "Viudo/a"),
)

estado_civil = models.CharField(
    max_length=20, choices=ESTADO_CIVIL, blank=True, null=True
)
profesion_u_oficio = models.CharField(max_length=150, blank=True, null=True)
```

El JSONField `datos_trabajador_nuevo` ya existe y no requiere cambio — acepta estos campos para el flujo de trabajador nuevo.

### Alternativas consideradas
- **Ponerlos en `User` o `UsuarioEmpresa`:** Estado civil y profesión son específicos del contrato — pueden cambiar entre contratos. El estado civil puede variar legalmente.
- **Solo en el PDF generado:** No permite consulta ni validación posterior.

### Consecuencias
- Migración Django requerida (campos nullable, sin impacto en registros existentes).
- Agregar a `StepTrabajador.tsx` los nuevos campos.
- Agregar a serializers de RRHH.

---

<a name="adr-05"></a>
## ADR-05 — Renombres de campos y tabs

### Contexto
Varios nombres de campos y tabs en el módulo RRHH no reflejan el lenguaje del dominio:
- El campo `nombre` en `ContratoTrabajador` es un identificador de negocio interno, no el nombre del trabajador. Su nombre actual es ambiguo.
- `lugar_firma` es técnicamente el lugar de celebración del contrato (término del CT), no necesariamente donde se firma digitalmente.
- Dos tabs del wizard usan nombres genéricos en lugar de términos del dominio.

### Decisión

| Elemento | Nombre actual | Nombre propuesto |
|----------|--------------|-----------------|
| Campo modelo | `nombre` | `referencia_interna` |
| Campo modelo | `lugar_firma` | `lugar_celebracion_contrato` |
| Tab wizard | `"trabajador"` | `"datos_personales"` |
| Tab wizard | `"sueldo"` | `"remuneraciones"` |

### Alternativas consideradas
- **Mantener nombres actuales:** El problema es que `nombre` causa confusión cuando hay un `usuario_empresa` que ya tiene su propio nombre. El equipo técnico confirmó la ambigüedad.

### Consecuencias
- Migración Django para los dos campos renombrados (`nombre` → `referencia_interna`, `lugar_firma` → `lugar_celebracion_contrato`).
- Actualizar serializers, filtros y cualquier referencia en frontend.
- Actualizar el tipo `TTab` en el wizard.

---

<a name="adr-06"></a>
## ADR-06 — Descuentos legales: desglose fijo en lugar de porcentaje libre

### Contexto
`StepRemuneraciones.tsx` tenía un selector `descuentoOption` que permitía al usuario elegir un porcentaje de descuento entre 10% y 30% aplicado al sueldo base. Este modelo no refleja la realidad de los descuentos previsionales chilenos, que tienen tasas fijas por ley.

### Decisión
Reemplazar el selector libre por un desglose con tasas fijas:

| Descuento | Tasa | Observación |
|-----------|------|-------------|
| AFP | Variable según AFP | Tasa informativa desde catálogo AFP |
| Salud | 7% | Fija por ley (Fonasa/Isapre) |
| Seguro de Cesantía (SC) | 0.6% | Aporte trabajador dependiente |

El toggle bruto/líquido **se mantiene sin cambios** (decisión diferida al Product Owner para el cálculo inverso bruto/líquido).

El preview del cálculo debe marcarse como **"estimación referencial"** ya que no incluye todos los factores (AFC, impuesto único, etc.).

### Alternativas consideradas
- **Cálculo actuarial completo:** Requiere integración con tablas de impuesto único, AFC, AFC empresa. Fuera del alcance actual.
- **Eliminar el preview:** Reduce utilidad para el usuario al crear el contrato.

### Consecuencias
- Eliminar el select `descuentoOption` del frontend.
- Agregar constantes de tasas en `types.ts`.
- El cálculo bruto/líquido completo queda como deuda técnica marcada "DEFERRED PO".

---

<a name="adr-07"></a>
## ADR-07 — Gratificación legal: reemplazar booleano por enum de modalidad

### Contexto
`ContratoTrabajador.gratificacion_legal` es un `BooleanField`. Esto es insuficiente porque la ley chilena define dos modalidades distintas de gratificación legal con cálculos diferentes:
- **Art. 47 CT:** 30% de la remuneración anual del trabajador (pagado al año siguiente, solo si empresa tuvo utilidades).
- **Art. 50 CT:** 25% del sueldo mensual, con tope de 4.75 IMM/12 por mes (más común, pactado en el contrato).

Tratar ambas con un booleano imposibilita representar cuál se aplica.

### Decisión
Reemplazar `gratificacion_legal: BooleanField` por `tipo_gratificacion: CharField` con choices:

```python
TIPO_GRATIFICACION = (
    ("art_47",        "Gratificación anual (Art. 47 CT)"),
    ("art_50_mensual","Gratificación mensual garantizada (Art. 50 CT)"),
    ("no_aplica",     "No aplica"),
)
```

Constantes en `types.ts`:
```typescript
export const IMM_VIGENTE = 510966; // Mayo 2026 — actualizar manualmente
export const IMM_TOPE_GRATIFICACION = (IMM_VIGENTE * 4.75) / 12; // Tope mensual Art.50
```

- **Art. 50:** Se calcula automáticamente en el preview: `min(sueldo_base * 0.25, IMM_TOPE_GRATIFICACION)`.
- **Art. 47:** Solo se muestra como texto informativo, sin cálculo automático (depende de utilidades anuales).

### Alternativas consideradas
- **Mantener booleano + campo adicional:** Genera complejidad innecesaria.
- **Input libre de porcentaje:** Desconectado de la realidad legal.

### Consecuencias
- Migración Django: `gratificacion_legal=True` → `tipo_gratificacion="art_50_mensual"` (suposición conservadora); `False` → `"no_aplica"`.
- El frontend `DetalleUsuarioCliente.tsx` muestra `gratificacion_legal` como booleano → debe actualizarse para mostrar el label del enum.
- El dict `get_contrato_laboral_vigente()` en `empresas/serializers.py` debe incluir `tipo_gratificacion` + label en lugar de `gratificacion_legal`.

---

<a name="adr-08"></a>
## ADR-08 — Validación de ingreso mínimo mensual (IMM)

### Contexto
No existe ninguna validación que advierta al usuario cuando el `sueldo_base` ingresado en el contrato es inferior al Ingreso Mínimo Mensual vigente, proporcional a la jornada pactada. Esto no es un error técnico pero puede implicar un incumplimiento legal no detectado.

### Decisión
Agregar advertencia **no bloqueante** (no impide guardar) en `StepRemuneraciones.tsx`:
- Si `sueldo_base < (IMM_VIGENTE * horas_semanales / 45)`, mostrar alerta amarilla con el texto: *"El sueldo base es inferior al IMM proporcional a la jornada indicada."*
  > **Nota sobre el divisor `45`:** El IMM chileno fue fijado históricamente sobre una jornada de 45 h/semana. Aunque ADR-02 limita el máximo a 44 h desde 2026 (Ley 21.561), la práctica de la Dirección del Trabajo mantiene `45` como denominador del cálculo proporcional del IMM; se actualiza si existe pronunciamiento oficial en contrario.
- La advertencia no aparece si `jornada = "no_aplica"` (el tipo `honorarios` fue eliminado en ADR-01).
- `IMM_VIGENTE` es una constante manual en `types.ts` que debe actualizarse con cada ajuste del IMM (julio de cada año o cuando la ley lo defina).

### Alternativas consideradas
- **Bloquear el guardado:** Demasiado restrictivo para contratos históricos o correcciones.
- **Validación solo backend:** El feedback inmediato en el wizard es más útil.

### Consecuencias
- Nueva constante `IMM_VIGENTE` en `types.ts` con comentario de la fecha de vigencia.
- Proceso manual de actualización de la constante ante cambios legales (sin automatización por ahora).

---

<a name="adr-09"></a>
## ADR-09 — Validación de RUT chileno

### Contexto
No existe ningún validador de RUT en el codebase (ni en frontend ni en backend). El campo `rut` existe en `UsuarioEmpresa`, en `datos_trabajador_nuevo` (JSONField) y es capturado en `StepTrabajador.tsx` como `trab_rut` — todos sin validación. Un RUT inválido puede propagarse silenciosamente al contrato generado.

El usuario del proyecto proporcionó el algoritmo de validación (Módulo 11, secuencia 2–7, DV: K=10, `11→"0"`).

### Decisión

**Frontend — `frontend/src/utils/rut.util.ts`:**
```typescript
export interface IRutValidationResult {
    valid: boolean;
    formatted: string | null;
    error: string | null;
}
export function calcDV(rutSinDV: number): string { ... }
export function formatRut(rut: string): string { ... }       // display: 12.345.678-9
export function validateRut(rut: string): IRutValidationResult { ... }
```

- Integrar con Yup en `StepTrabajador.tsx` para `trab_rut`.
- Migrar la función `formatRut` local de `DetalleUsuarioCliente.tsx` al import desde este utility (ver DUC-01).

**Backend — `backend/core/validators.py`:**
```python
def validate_rut_chileno(value: str) -> None:
    """Valida formato y dígito verificador de RUT chileno."""
    ...  # Módulo 11, lanza ValidationError si inválido
```

- Aplicar a `UsuarioEmpresa.rut`.
- Considerar para campo `rut` en `datos_trabajador_nuevo` en la acción `crear_con_trabajador`.

### Alternativas consideradas
- **Usar librería `python-rut`:** Depender de una librería externa para lógica trivial. Rechazada.
- **Validar solo en frontend:** El backend debe ser la última línea de validación.

### Consecuencias
- Nuevos archivos: `frontend/src/utils/rut.util.ts` y adición en `backend/core/validators.py`.
- Migración de `formatRut` en `DetalleUsuarioCliente.tsx`.
- `UsuarioEmpresa.rut` recibe el validator en su definición de campo.

---

<a name="adr-10"></a>
## ADR-10 — AFP: catálogo cerrado en lugar de texto libre

### Contexto
Las AFP en Chile son un sistema regulado con un número fijo de entidades autorizadas (Capital, Cuprum, Habitat, PlanVital, ProVida, Uno). Sin embargo:
- `StepPrevisionBanco.tsx` tiene `isCreatable` activo para AFP, permitiendo que el usuario ingrese cualquier texto.
- `UsuarioEmpresa.afp` es un `CharField(max_length=50)` sin validación ni referencia al modelo `AfpCatalogo`.
- El modelo `AfpCatalogo` ya existe en `rrhh/models.py` pero no está vinculado a `UsuarioEmpresa`.

### Decisión
- Eliminar `isCreatable` del selector de AFP en `StepPrevisionBanco.tsx`.
- El selector de AFP usa el catálogo desde `AfpCatalogo` vía `useGetAfpCatalogoQuery()` (ya existe el hook).
- El Banco **mantiene** `isCreatable` porque los bancos no son un catálogo regulado cerrado.
- `UsuarioEmpresa.afp` se convierte en **FK a `AfpCatalogo`** (`ForeignKey(AfpCatalogo, null=True, blank=True, on_delete=SET_NULL)`). Permite almacenar tasas de cotización en el catálogo en el futuro.

### Alternativas consideradas
- **Choices fijo en el modelo (no FK):** Más simple, pero no escalable si se necesitan tasas por AFP.
- **Libre con validación backend:** El error llega tarde y la UX es peor.

### Consecuencias
- `StepPrevisionBanco.tsx`: remover `isCreatable` y `useCrearAfpInlineMutation` del selector AFP.
- `UsuarioEmpresa.afp`: cambiar de `CharField(max_length=50)` a `ForeignKey(AfpCatalogo, null=True, blank=True, on_delete=SET_NULL)`.
- Migración Django requerida para `UsuarioEmpresa.afp` (nueva FK).
- `UsuarioEmpresaSerializer`: agregar `afp_nombre = serializers.CharField(source='afp.nombre', read_only=True)` para el label en frontend.

---

<a name="adr-11"></a>
## ADR-11 — Wizard: datos previsionales en modo trabajador existente

### Contexto
Cuando se crea un contrato para un trabajador **existente** (`UsuarioEmpresa` ya creado), sus datos previsionales ya pueden estar almacenados en `UsuarioEmpresa.afp`, `.sistema_salud`, `.banco`, etc. La pregunta es: ¿debe el wizard omitir el paso `StepPrevisionBanco`, o mostrarlo con los datos del perfil?

### Decisión
**Pre-rellenar, no saltar.** El step `StepPrevisionBanco` se muestra siempre en ambos modos (existente y nuevo). Si el trabajador ya tiene los 6 campos previsionales completos en `UsuarioEmpresa`, se muestra un banner: *"Datos previsionales registrados. Puedes modificarlos o continuar."*

Razón principal: el momento de crear un contrato es naturalmente un punto de revisión — AFP, banco y datos de salud pueden haber cambiado desde el contrato anterior.

### Alternativas consideradas
- **Saltar el step:** Riesgo de propagar datos desactualizados sin confirmación del usuario.
- **Paso opcional/colapsado:** Más complejo de implementar, menor beneficio.

### Consecuencias
- `StepPrevisionBanco.tsx` recibe los datos del `UsuarioEmpresa` seleccionado como `initialValues` cuando el modo es "existente".
- Si el trabajador es nuevo, el step aparece vacío (comportamiento actual).

---

<a name="adr-12"></a>
## ADR-12 — Bug: filtro multi-tenancy en `get_queryset` de RRHH

### Contexto
El `get_queryset` del ViewSet de contratos RRHH no filtra correctamente los contratos donde el trabajador aún no tiene `UsuarioEmpresa` asignado (modo "nuevo" — `usuario_empresa=null`). Esto provoca que contratos en estado borrador creados por un usuario de empresa A sean visibles para un usuario de empresa B.

### Decisión
Reemplazar el queryset actual por:
```python
def get_queryset(self):
    ids_visibles = [...]  # empresas visibles por el usuario autenticado
    return ContratoTrabajador.objects.filter(
        Q(usuario_empresa__sucursal__empresa_id__in=ids_visibles)
        | Q(usuario_empresa__isnull=True, creado_por=self.request.user)
    )
```

### Alternativas consideradas
- **Eliminar modo "nuevo":** Requeriría crear el `UsuarioEmpresa` antes del contrato, cambia el flujo completo del wizard.

### Consecuencias
- Corrección de seguridad: fuga de datos entre empresas queda bloqueada.
- Contratos con `usuario_empresa=null` solo son visibles para quien los creó.

---

<a name="adr-13"></a>
## ADR-13 — UsuarioEmpresa: inconsistencias de campos con decisiones RRHH

### Contexto
El usuario del proyecto agregó nuevos campos previsionales/bancarios a `UsuarioEmpresa` de forma independiente durante la sesión de debate. Esto es arquitectónicamente correcto (los datos previsionales son del perfil del trabajador, no del contrato). Sin embargo, se detectaron inconsistencias con las decisiones anteriores:

| Campo | Estado actual | Corrección requerida |
|-------|--------------|---------------------|
| `afp = CharField(max_length=50)` | Texto libre | Convertir a FK a `AfpCatalogo` (ADR-10 resuelto) |
| `rut = CharField(max_length=20)` | Sin validator | Aplicar `validate_rut_chileno` (ADR-09) |

### Decisión
- `UsuarioEmpresa.rut`: aplicar `validate_rut_chileno` de `core/validators.py` (pendiente implementación de ADR-09).
- `UsuarioEmpresa.afp`: convertir a `ForeignKey(AfpCatalogo, null=True, blank=True, on_delete=SET_NULL)` (resuelto en ADR-10).
- Los campos `sistema_salud`, `banco`, `tipo_cuenta_bancaria`, `numero_cuenta_bancaria`, `nombre_isapre` no presentan inconsistencias.

### Consecuencias
- Migración BD requerida para el campo `afp` (CharField → FK).
- `UsuarioEmpresaSerializer`: reemplazar campo `afp` por `afp` (id) + `afp_nombre` (read-only).

---

<a name="adr-14"></a>
## ADR-14 — Arquitectura frontend: separación Clientes/ y RRHH/

### Contexto
`frontend/src/pages/Clientes/DetalleUsuarioCliente.tsx` (826 líneas) es un componente que actualmente mezcla:
- Vista de perfil del trabajador desde óptica de gestión comercial (contratos OT, equipos, licencias)
- Datos RRHH profundos (contratos laborales, previsión, cargas familiares, historial)

El módulo `RRHH/` no tiene su propio flujo de detalle de trabajador.

### Decisión
**Separación en dos ámbitos complementarios:**

**`Clientes/DetalleUsuarioCliente` (mantener y refinar):**
- Perfil de nivel negocio/operativo
- Datos personales básicos
- Contratos laborales: resumen y estado actual (no wizard de edición)
- Órdenes de trabajo vinculadas
- Equipos asignados
- Licencias asignadas
- Historial de contratos (read-only)
- **NO contiene** formularios de edición RRHH profundos

**`RRHH/` (nuevo flujo a crear):**
- Gestión completa del trabajador como entidad laboral
- Wizard de creación/edición de contratos
- Validaciones legales (RUT, IMM, jornada, gratificación)
- Ciclo de vida del contrato (estados, firma, aprobación)
- Datos previsionales editables

Ambas vistas usan el mismo modelo `UsuarioEmpresa` y `ContratoTrabajador` en el backend. El componente `DetalleUsuarioCliente` puede enlazar hacia el flujo RRHH cuando sea necesario.

### Pendiente
`/Clientes` queda marcado como **pendiente de análisis detallado** para identificar mejoras específicas a la vista de nivel negocio (tabs visibles, datos a mostrar, links a OTs, etc.).

### Alternativas consideradas
- **Un solo componente con tabs condicionales:** Genera un componente de 800+ líneas que crece sin límite. Rechazado.
- **Mover todo a RRHH/:** Pierde el contexto de gestión operativa del cliente.

### Consecuencias
- Nuevo componente/página en `RRHH/` para detalle de trabajador desde perspectiva laboral.
- `Clientes/DetalleUsuarioCliente` se simplifica y refactoriza (tabs solo read-only).
- `formatRut` local en `DetalleUsuarioCliente.tsx` → migrar a `rut.util.ts` (ADR-09/DUC-01).

---

<a name="adr-15"></a>
## ADR-15 — Estado de contrato: renombrar `pendiente_aceptacion` a `pendiente_aprobacion`

### Contexto
`ESTADO_CONTRATO` tiene el valor `"pendiente_aceptacion"` con label `"Pendiente aceptacion"`. El término es ambiguo: no indica quién acepta ni en qué sentido. En el flujo real, el contrato entra en este estado cuando el empleador lo envía al trabajador para que lo firme/apruebe.

### Decisión
Renombrar a `"pendiente_aprobacion"` con label `"Pendiente de aprobación"` (genérico, no asume quién aprueba, compatible con flujos donde el empleador también debe aprobar).

```python
ESTADO_CONTRATO = (
    ("borrador",             "Borrador"),
    ("pendiente_aprobacion", "Pendiente de aprobación"),  # antes: pendiente_aceptacion
    ("vigente",              "Vigente"),
    ("terminado",            "Terminado"),
    ("anulado",              "Anulado"),
)
```

`TRANSICIONES_CONTRATO` debe actualizarse en consecuencia:

> ⚠️ **Supersedido por ADR-21.** El dict a continuación refleja solo el estado tras ADR-15. La versión final — con `descartado` en lugar de `anulado` para estados pre-vigente y con los estados terminales explícitos — está en ADR-21.

```python
TRANSICIONES_CONTRATO = {
    "borrador":              ["pendiente_aprobacion", "vigente", "anulado"],
    "pendiente_aprobacion":  ["vigente", "anulado", "borrador"],
    "vigente":               ["terminado", "anulado"],
    "terminado":             [],
    "anulado":               [],
}
```

### Alternativas consideradas
- `pendiente_firma_trabajador`: demasiado específico, puede haber flujos donde el empleador también aprueba.
- `en_firma`: sugiere que la firma está en progreso, no que está esperando acción.

### Consecuencias
- Migración de datos: `pendiente_aceptacion` → `pendiente_aprobacion` en todos los registros existentes.
- Actualizar `estados_modelo.py`, serializers, y cualquier referencia en frontend (labels, filtros, badges de estado).
- El campo `fecha_aceptacion` en el modelo también debería renombrarse a `fecha_aprobacion` por consistencia.

---

## ADR-16

**Titulo:** `AnexoContrato` — numeracion secuencial automatica

**Estado:** pendiente de implementacion

**Contexto:**
El modelo `AnexoContrato` no tiene campo `numero_anexo`. Legalmente, los anexos al contrato laboral deben numerarse correlativamente (Anexo N°1, N°2…) respecto al contrato padre. Sin numeracion, es imposible identificar el orden en impresiones, PDFs o ante un tribunal laboral.

**Decision:** Opcion A — campo automatico via `pre_save` signal.

Agregar `numero_anexo = PositiveSmallIntegerField(editable=False)` al modelo. Una signal `pre_save` asigna el valor contando los anexos existentes del mismo contrato padre:

```python
# rrhh/signals.py
from django.db.models.signals import pre_save
from django.dispatch import receiver
from .models import AnexoContrato

@receiver(pre_save, sender=AnexoContrato)
def asignar_numero_anexo(sender, instance, **kwargs):
    if instance.pk is None:  # Solo en creacion
        count = AnexoContrato.objects.filter(
            contrato=instance.contrato
        ).count()
        instance.numero_anexo = count + 1
```

El campo se expone como `read_only` en el serializer.

**Alternativas descartadas:**
- B (manual): propenso a duplicados y requiere validacion de unicidad adicional.
- C (orden por fecha): no produce numero correlativo; dos anexos del mismo dia no tienen orden determinístico en PDF.

**Consecuencias:**
- Nueva migracion: agregar `numero_anexo` con `default=1` para registros existentes (o script de backfill).
- El PDF/template de anexo debe mostrar "Anexo N°{{ numero_anexo }}".
- El serializer de `AnexoContrato` expone `numero_anexo` como `read_only`.

## ADR-17

**Titulo:** Alerta de vencimiento para contratos a plazo fijo

**Estado:** pendiente de implementacion

**Contexto:**
Los contratos `tipo=plazo_fijo` tienen `fecha_termino`. El Art. 159 N°4 del Codigo del Trabajo establece que un plazo fijo renovado por segunda vez consecutiva se convierte automaticamente en indefinido. El sistema actual ignora la fecha de termino: no avisa ni bloquea.

**Decision:** Opcion A — banner informativo en frontend, sin logica automatica de conversion.

En el componente de detalle del contrato, mostrar un `Alert` de color `amber` cuando `fecha_termino` sea ≤ 30 dias desde hoy, y un `Alert` de color `red` cuando la fecha ya haya pasado (contrato vencido sin terminar):

```tsx
// Logica sugerida en DetalleContrato.tsx
const diasRestantes = differenceInDays(new Date(contrato.fecha_termino), new Date());

{contrato.tipo === 'plazo_fijo' && diasRestantes <= 30 && diasRestantes > 0 && (
    <Alert color="amber">
        Este contrato vence en {diasRestantes} dia(s). Recuerda que una segunda
        renovacion lo convierte en indefinido (Art. 159 N°4).
    </Alert>
)}
{contrato.tipo === 'plazo_fijo' && diasRestantes <= 0 && (
    <Alert color="red">
        Este contrato ha vencido y aun esta vigente. Revisa si corresponde renovar o terminar.
    </Alert>
)}
```

No se crea estado nuevo ni tarea Celery. La conversion a indefinido es una decision del administrador, no automatica.

**Alternativas descartadas:**
- B (estado `por_renovar` + Celery): agrega complejidad al flujo de estados; la conversion requiere validacion juridica por empresa.
- C (sin alerta): riesgo legal real — el administrador puede no notar el vencimiento.

**Consecuencias:**
- Solo cambio frontend: logica condicional en el componente de detalle del contrato.
- Sin migracion ni cambio de modelo.
- Requiere que `fecha_termino` sea visible en el serializer de detalle (ya lo es).

---

### Backend
| Archivo | Cambio |
|---------|--------|
| `rrhh/estados_modelo.py` | ADR-01, 02, 03, 07, 15, 20, 21 |
| `rrhh/models.py` | ADR-04, 05, 07, 16, 18, 19, 21, 26, 27 (migraciones) |
| `rrhh/signals.py` | ADR-16 (nuevo signal) |
| `rrhh/views.py` | ADR-12, 18, 21 |
| `rrhh/serializers.py` | ADR-05, 07, 26, 28 |
| `empresas/models.py` | ADR-13, 23 |
| `empresas/serializers.py` | ADR-07 |
| `core/validators.py` | ADR-09, 28 |

### Frontend
| Archivo | Cambio |
|---------|--------|
| `utils/rut.util.ts` | ADR-09, 28 (nuevo archivo) |
| `pages/RRHH/components/trabajador/types.ts` | ADR-02, 07, 08 |
| `pages/RRHH/components/trabajador/StepTrabajador.tsx` | ADR-04, 09, 28 |
| `pages/RRHH/components/trabajador/StepJornada.tsx` | ADR-02 |
| `pages/RRHH/components/trabajador/StepRemuneraciones.tsx` | ADR-06, 07, 08 |
| `pages/RRHH/components/trabajador/StepPrevisionBanco.tsx` | ADR-10, 11, 26 |
| `pages/RRHH/modals/CrearContratoTrabajadorWizard.tsx` | ADR-05 |
| `pages/RRHH/DetalleContrato.tsx` | ADR-17 (banner vencimiento), ADR-22 (modal confirmación borrador→vigente) |
| `pages/RRHH/ListaTrabajadores.tsx` | ADR-29 (nuevo archivo) |
| `pages/RRHH/DetalleTrabajador.tsx` | ADR-29 (nuevo archivo) |

### Migraciones Django requeridas
1. Eliminar `honorarios` de TIPO_CONTRATO (ADR-01)
2. Renombrar `part_time → parcial` en JORNADA_CONTRATO (ADR-02)
3. Expandir MOTIVO_TERMINO_CONTRATO (ADR-03)
4. Agregar `estado_civil`, `profesion_u_oficio` a `ContratoTrabajador` (ADR-04)
5. Renombrar `nombre → referencia_interna`, `lugar_firma → lugar_celebracion_contrato` (ADR-05)
6. Reemplazar `gratificacion_legal: BooleanField → tipo_gratificacion: CharField` (ADR-07)
7. Convertir `UsuarioEmpresa.afp: CharField → ForeignKey(AfpCatalogo)` (ADR-10/ADR-13)
8. Renombrar `pendiente_aceptacion → pendiente_aprobacion` en ESTADO_CONTRATO (ADR-15)
9. Renombrar `fecha_aceptacion → fecha_aprobacion` en `ContratoTrabajador` (ADR-15)
10. Agregar `numero_anexo: PositiveSmallIntegerField` a `AnexoContrato` (ADR-16)
11. Crear modelos `Finiquito` y `ConceptoFiniquito` (ADR-18)
12. Agregar `trabajador_reemplazado` y `causal_reemplazo` a `ContratoTrabajador` (ADR-19)
13. Eliminar `obra_o_faena` de TIPO_CONTRATO (ADR-20)
14. Agregar estado `descartado` y campo `motivo_anulacion` a `ContratoTrabajador` (ADR-21)
15. Agregar `sistema_salud_otro: CharField` a `ContratoTrabajador` (ADR-26)
16. Agregar `tasa_cotizacion: DecimalField` a `AfpCatalogo` (ADR-27)

---

## ADR-18

**Titulo:** Modelo `Finiquito` con conceptos variables

**Estado:** pendiente de implementacion

**Contexto:**
Al terminar un contrato laboral se debe emitir un finiquito. La estructura base es fija (partes, causal, fecha, firmas) pero el desglose de conceptos pagados es variable por persona (antiguedad, vacaciones proporcionales, bonos pendientes, descuentos). No existe ningun modelo `Finiquito` en el sistema.

**Decision:** Opcion A variante — modelo `Finiquito` + modelo hijo `ConceptoFiniquito`.

Estructura de modelos:

```python
class Finiquito(ModeloBase):
    contrato = models.OneToOneField(
        'ContratoTrabajador', on_delete=models.PROTECT,
        related_name='finiquito'
    )
    fecha_finiquito = models.DateField()
    # causal se toma de contrato.motivo_termino
    monto_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    firmado_trabajador = models.BooleanField(default=False)
    firmado_empresa = models.BooleanField(default=False)
    archivo_pdf = models.FileField(
        upload_to='finiquitos/', null=True, blank=True
    )
    observaciones = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Finiquito'


class ConceptoFiniquito(ModeloBase):
    finiquito = models.ForeignKey(
        Finiquito, on_delete=models.CASCADE,
        related_name='conceptos'
    )
    descripcion = models.CharField(max_length=200)
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    es_descuento = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Concepto de Finiquito'
```

`monto_total` se recalcula como `sum(conceptos donde no es_descuento) - sum(conceptos donde es_descuento)` via signal o metodo `calcular_total()`.

**Alternativas descartadas:**
- `detalle_json` en `Finiquito`: opaco para reportes y consultas SQL.
- `FileField` en `ContratoTrabajador`: no soporta estados de firma ni multiples revisiones.
- Sin modelo: no hay auditabilidad legal.

**Consecuencias:**
- Nueva migracion: crear tablas `Finiquito` y `ConceptoFiniquito`.
- El flujo de termino del contrato debe crear el `Finiquito` (o al menos permitirlo desde la UI).
- El estado `terminado` en `ContratoTrabajador` no se activa automaticamente hasta que exista finiquito firmado (decision a confirmar en implementacion).
- El estado `anulado` (ADR-21) **no requiere finiquito**: es una invalidación administrativa de un contrato vigente, no un término de la relación laboral. El `Finiquito` aplica exclusivamente cuando el estado pasa a `terminado`.
- Nuevos serializers, ViewSet y endpoint `/api/finiquitos/`.

---

## ADR-19

**Titulo:** Contrato `reemplazo` — campos opcionales de referencia al trabajador reemplazado

**Estado:** pendiente de implementacion

**Contexto:**
El tipo `reemplazo` (Art. 183-W CT) debe identificar al trabajador titular ausente. El modelo actual no tiene ningun campo para esto. La validacion estricta (campos obligatorios cuando `tipo == reemplazo`) fue descartada por el equipo; se prefiere que los campos existan pero sean opcionales para no bloquear el flujo en casos borde.

**Decision:** Opcion A con campos opcionales (sin validacion `clean()` obligatoria).

```python
# Agregar a ContratoTrabajador:
trabajador_reemplazado = models.ForeignKey(
    'empresas.UsuarioEmpresa',
    null=True, blank=True,
    on_delete=models.SET_NULL,
    related_name='contratos_de_reemplazo',
    verbose_name='Trabajador reemplazado',
)
causal_reemplazo = models.CharField(
    max_length=30,
    blank=True,
    choices=[
        ('licencia_medica', 'Licencia medica'),
        ('vacaciones', 'Vacaciones'),
        ('prenatal_postnatal', 'Pre/postnatal'),
        ('permiso_sin_goce', 'Permiso sin goce de sueldo'),
        ('otro', 'Otro'),
    ],
)
```

El wizard de creacion muestra estos campos solo cuando `tipo_contrato == 'reemplazo'`. No son obligatorios a nivel de modelo.

**Alternativas descartadas:**
- Validacion obligatoria en `clean()`: bloquea casos borde donde el trabajador reemplazado no esta en el sistema.
- TextField libre: no consultable ni auditable.
- Sin campos: contrato de reemplazo incompleto legalmente.

**Consecuencias:**
- Nueva migracion: agregar `trabajador_reemplazado` (FK nullable) y `causal_reemplazo` (CharField blank) a `ContratoTrabajador`.
- El serializer del wizard debe enviar estos campos condicionalmente.
- En el PDF del contrato de reemplazo, incluir la referencia al titular si existe.

---

## ADR-20

**Titulo:** Eliminar tipo de contrato `obra_o_faena`

**Estado:** pendiente de implementacion

**Contexto:**
El tipo `obra_o_faena` (Art. 159 N°5 CT) requiere especificar la obra o faena que delimita su duracion. Esta modalidad es caracteristica de rubros como construccion o agricultura; no aplica al perfil de empresas de servicios TI que usa este ERP. Mantenerlo genera confusion y riesgo de uso incorrecto.

**Decision:** Eliminar `obra_o_faena` de `TIPO_CONTRATO`.

```python
# rrhh/estados_modelo.py — TIPO_CONTRATO resultante
TIPO_CONTRATO = [
    ('indefinido',   'Indefinido'),
    ('plazo_fijo',   'Plazo fijo'),
    ('reemplazo',    'Reemplazo'),
    # 'honorarios' eliminado (ADR-01)
    # 'obra_o_faena' eliminado (ADR-20)
]
```

Consistente con ADR-01 (`honorarios` eliminado por la misma razon: no corresponde a contrato laboral del perfil del sistema).

**Alternativas descartadas:**
- Mantener con campo `descripcion_obra`: agrega complejidad para un tipo que el sistema no necesita.
- Mantener sin campo adicional: contrato incompleto legalmente.

**Consecuencias:**
- Migracion de datos: verificar que no existan registros con `tipo='obra_o_faena'` antes de eliminar. Si los hay, migrar a `indefinido` o dejar decision al administrador.
- Actualizar `estados_modelo.py`, serializers, wizard y labels frontend.
- Sin impacto en modelos de BD (solo choices, no columna separada).

---

## ADR-21

**Titulo:** Separar estado `anulado` en `descartado` y `anulado`

**Estado:** pendiente de implementacion

**Contexto:**
El estado `anulado` se usa tanto para descartar borradores (sin consecuencia legal) como para invalidar contratos vigentes (acto grave). Esta ambiguedad genera confusión en la UI y en auditorias.

**Decision:** Opcion A — dos estados distintos con transiciones separadas.

```python
# rrhh/estados_modelo.py

ESTADO_CONTRATO = [
    ('borrador',             'Borrador'),
    ('pendiente_aprobacion', 'Pendiente de aprobacion'),
    ('vigente',              'Vigente'),
    ('terminado',            'Terminado'),
    ('descartado',           'Descartado'),   # era: anulado desde borrador/pendiente
    ('anulado',              'Anulado'),      # solo desde vigente
]

TRANSICIONES_CONTRATO = {
    'borrador':             ['pendiente_aprobacion', 'vigente', 'descartado'],
    'pendiente_aprobacion': ['vigente', 'borrador', 'descartado'],
    'vigente':              ['terminado', 'anulado'],
    'terminado':            [],
    'descartado':           [],
    'anulado':              [],
}
```

Agregar campo al modelo:

```python
# rrhh/models.py — ContratoTrabajador
motivo_anulacion = models.TextField(
    blank=True,
    verbose_name='Motivo de anulacion',
    help_text='Requerido al anular un contrato vigente.',
)
```

La validacion se aplica en el ViewSet: si la transicion es `vigente -> anulado` y `motivo_anulacion` esta vacio, retornar HTTP 400.

**Alternativas descartadas:**
- B (un solo estado con campo obligatorio segun estado previo): requiere igualmente distinguir el caso; la diferencia de label aporta claridad semantica sin costo adicional.
- C (dejar como esta): confunde auditores y usuarios.

**Consecuencias:**
- Migracion de datos: registros existentes con `estado='anulado'` deben revisarse; si vinieron de `borrador` o `pendiente_aprobacion`, migrar a `descartado`.
- Actualizar `estados_modelo.py` (estados + transiciones), serializer, vista de cambio de estado, badges frontend.
- Nueva migracion: agregar campo `motivo_anulacion: TextField(blank=True)`.
- Labels en frontend: `descartado` = badge gris, `anulado` = badge rojo intenso.

---

## ADR-22

**Titulo:** Transición `borrador → vigente` sin paso de aprobacion

**Estado:** pendiente de analisis

**Contexto:**
Las `TRANSICIONES_CONTRATO` actuales permiten pasar de `borrador` directamente a `vigente`, salteando `pendiente_aprobacion`. Esto puede ocurrir de forma involuntaria y activa un contrato sin revision previa. La decision afecta tanto el backend (si se elimina la transicion del dict) como el frontend (si se agrega un modal de confirmacion).

**Decision preliminar:** Opcion A — mantener la transicion disponible, agregar modal de confirmacion en frontend.

Pendiente de analisis: revisar cómo el sistema actual dispara este cambio de estado (endpoint, ViewSet action, wizard), para determinar si la salvaguarda va en backend, frontend o ambos.

**Opciones en evaluacion:**
- A: Modal de confirmacion frontend solamente. Sin cambios en `TRANSICIONES_CONTRATO`.
- B: Eliminar `vigente` de las transiciones disponibles desde `borrador`. Flujo obligatorio: `borrador → pendiente_aprobacion → vigente`.
- C: Dejar como esta sin modificacion.

**Consecuencias (si se elige A):**
- Solo cambio frontend; el backend sigue aceptando la transicion sin restriccion adicional.
- Riesgo residual: clientes que usen la API directamente (Postman, integraciones) pueden saltear el modal.

---

## ADR-23

**Titulo:** Corregir label `'Desactivo'` en `ESTADO_USUARIO_EMPRESA`

**Estado:** pendiente de implementacion

**Contexto:**
`UsuarioEmpresa.estado` en `backend/empresas/models.py` usa el choices `('2', 'Desactivo')`. El termino no existe en castellano (deberia ser 'Inactivo' o 'Desactivado'). Aparece en UI, reportes y tooltips.

**Decision:** Opcion A — corregir solo el label a `'Inactivo'`. El valor `'2'` no cambia.

```python
# empresas/models.py
ESTADO_USUARIO_EMPRESA = [
    ('1', 'Activo'),
    ('2', 'Inactivo'),  # era: 'Desactivo'
]
```

**Consecuencias:**
- Sin migracion de datos (solo cambia el texto del choices, no el valor almacenado en BD).
- Actualizar cualquier label hardcodeado en frontend que diga 'Desactivo'.
- Sin impacto en logica de negocio.

---

## ADR-24

**Titulo:** Semantica del campo `cargo` en `UsuarioEmpresa` vs `ContratoTrabajador`

**Estado:** pendiente de implementacion

**Contexto:**
Ambos modelos tienen un campo `cargo`. Sin definicion explicita de responsabilidad, pueden quedar inconsistentes entre si.

**Decision:** Opcion A — mantener ambos con semantica documentada.

- `UsuarioEmpresa.cargo` = cargo vigente del trabajador (puede cambiar sin afectar contratos historicos).
- `ContratoTrabajador.cargo` = cargo al momento de la firma de ese contrato (dato historico, inmutable post-firma).

El wizard de creacion de contrato pre-llena `ContratoTrabajador.cargo` desde `UsuarioEmpresa.cargo` (ADR-11), pero no hay sincronizacion automatica posterior. Actualizaciones de cargo van solo a `UsuarioEmpresa`.

**Alternativas descartadas:**
- B (eliminar `ContratoTrabajador.cargo`): pierde trazabilidad historica del cargo por contrato.
- C (derivar `UsuarioEmpresa.cargo` del ultimo contrato vigente): agrega complejidad de query sin beneficio claro.

**Consecuencias:**
- Sin cambios de modelo ni migraciones.
- Agregar comentario/docstring en ambos campos aclarando la semantica.
- Documentar el pre-fill en el wizard (ya cubierto por ADR-11).

---

## ADR-25

**Titulo:** Labels de `fecha_inicio` y `fecha_contrato` en el wizard

**Estado:** pendiente de implementacion

**Contexto:**
`ContratoTrabajador` tiene dos campos de fecha con nombres tecnicos que no son autoexplicativos para el usuario final. En contratos retroactivos (practica legal comun en Chile), la fecha de firma puede ser posterior a la fecha de inicio efectivo de la relacion laboral.

**Decision:** Opcion A — mantener ambos campos, mejorar solo los labels y tooltips en el wizard.

| Campo | `verbose_name` actual | `verbose_name` propuesto | Tooltip sugerido |
|-------|-----------------------|--------------------------|------------------|
| `fecha_inicio` | *(por definir)* | 'Fecha de inicio de la relacion laboral' | 'Dia en que el trabajador comienza efectivamente a prestar servicios.' |
| `fecha_contrato` | *(por definir)* | 'Fecha de firma del contrato' | 'Dia en que se suscribe el documento. Puede ser posterior a la fecha de inicio.' |

Sin renombrar columnas ni crear migraciones. El cambio es de `verbose_name` en el modelo y de labels/placeholders en el wizard frontend.

**Alternativas descartadas:**
- B (fusionar en un campo): elimina trazabilidad de contratos retroactivos.
- C (renombrar columna `fecha_contrato` a `fecha_firma`): agrega una migracion sin valor funcional adicional sobre la opcion A.

**Consecuencias:**
- Actualizar `verbose_name` en `rrhh/models.py` (sin migracion de esquema).
- Actualizar labels y tooltips en el paso correspondiente del wizard frontend.

---

## ADR-26

**Titulo:** Campo companion para `sistema_salud = 'otro'`

**Estado:** pendiente de implementacion

**Contexto:**
`ContratoTrabajador.sistema_salud` incluye la opcion `'otro'` en su choices, pero no existe campo de texto libre para detallar cuál. El contrato queda con informacion incompleta e inutilizable legalmente.

**Decision:** Opcion A — agregar campo `sistema_salud_otro: CharField(max_length=100, blank=True)`.

```python
# rrhh/models.py — ContratoTrabajador
sistema_salud_otro = models.CharField(
    max_length=100,
    blank=True,
    verbose_name='Especificar sistema de salud',
    help_text='Requerido cuando sistema de salud es "Otro".',
)
```

Logica de validacion en el ViewSet/serializer:

```python
def validate(self, data):
    if data.get('sistema_salud') == 'otro' and not data.get('sistema_salud_otro', '').strip():
        raise serializers.ValidationError(
            {'sistema_salud_otro': 'Debe especificar el sistema de salud cuando selecciona "Otro".'}
        )
    return data
```

En el wizard frontend: mostrar el campo `sistema_salud_otro` condicionalmente cuando `sistema_salud == 'otro'`.

**Alternativas descartadas:**
- B (eliminar opcion 'otro'): limita casos borde validos (planes complementarios, extranjeros).
- C (dejar sin campo companion): dato inutilizable en documentos legales.

**Consecuencias:**
- Nueva migracion: agregar columna `sistema_salud_otro`.
- Actualizar serializer con validacion condicional.
- Agregar campo condicional en wizard frontend.

---

## ADR-27

**Titulo:** Agregar `tasa_cotizacion` a `AfpCatalogo`

**Estado:** pendiente de implementacion

**Contexto:**
ADR-06 define un desglose de descuentos en el contrato. Para calcular `descuento_afp = sueldo_base x tasa`, se necesita la tasa por AFP. `AfpCatalogo` actualmente no tiene este campo. Las tasas AFP en Chile son fijas por AFP pero cambian cada licitacion (aproximadamente cada 2 anos).

**Decision:** Opcion A — agregar `tasa_cotizacion` a `AfpCatalogo` en BD.

```python
# rrhh/models.py — AfpCatalogo
tasa_cotizacion = models.DecimalField(
    max_digits=5,
    decimal_places=4,
    null=True,
    blank=True,
    verbose_name='Tasa de cotizacion (%)',
    help_text='Ej: 0.1144 para 11.44%. Actualizar segun licitacion AFP vigente.',
)
```

Ejemplos de tasas vigentes a cargar en seed/admin:

| AFP | Tasa |
|-----|------|
| Habitat | 0.1127 |
| Cuprum | 0.1144 |
| Capital | 0.1144 |
| Modelo | 0.1058 |
| ProVida | 0.1127 |
| Uno (PlanVital) | 0.1069 |

El calculo de descuento AFP se realiza al momento de mostrar el desglose en el contrato; no se almacena el monto calculado (se recalcula desde tasa + sueldo vigente).

**Alternativas descartadas:**
- B (hardcodear en codigo): requiere deploy para actualizar tasas tras licitacion AFP.
- C (ingreso manual por contrato): propenso a errores y no escala.

**Consecuencias:**
- Nueva migracion: agregar columna `tasa_cotizacion` a `AfpCatalogo` (nullable para no romper registros existentes).
- Actualizar seed de AFPs con tasas vigentes.
- El serializer de desglose descuentos (ADR-06) puede leer `afp.tasa_cotizacion` para calcular el monto.

---

## ADR-28

**Titulo:** Validacion RUT Modulo 11: ubicacion en backend y frontend

**Estado:** pendiente de implementacion

**Contexto:**
ADR-09 acuerda validar el RUT chileno. Se necesita definir donde vive la logica para evitar duplicacion no controlada o brechas de validacion.

**Decision:** Opcion A — validacion dual: backend como fuente de verdad, frontend para feedback inmediato.

> **Alineación con ADR-09:** El validator backend vive en `core/validators.py` (misma ubicación que `validate_rut_chileno`). El frontend usa `rut.util.ts` (mismo archivo que ADR-09). ADR-28 aporta el algoritmo concreto y los snippets de integración.

**Backend** — `core/validators.py`:

```python
def validar_rut(rut: str) -> bool:
    """
    Valida RUT chileno usando algoritmo Modulo 11.
    Acepta formatos: '12345678-9', '123456789', '12.345.678-9'.
    """
    import re
    rut = re.sub(r'[\.\-]', '', rut).upper()
    if not re.match(r'^\d{7,8}[0-9K]$', rut):
        return False
    cuerpo, dv = rut[:-1], rut[-1]
    suma, factor = 0, 2
    for d in reversed(cuerpo):
        suma += int(d) * factor
        factor = 2 if factor == 7 else factor + 1  # ciclo 2→3→4→5→6→7→2
    dv_calc = 11 - (suma % 11)
    dv_esperado = 'K' if dv_calc == 10 else ('0' if dv_calc == 11 else str(dv_calc))
    return dv == dv_esperado
```

Usar en serializer de `ContratoTrabajador` y `UsuarioEmpresa`:

```python
def validate_rut(self, value):
    if not validar_rut(value):
        raise serializers.ValidationError('RUT invalido.')
    return value
```

**Frontend** — `frontend/src/utils/rut.util.ts` (mismo archivo que ADR-09):

```typescript
export function validarRut(rut: string): boolean {
    const clean = rut.replace(/[.-]/g, '').toUpperCase();
    if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
    const cuerpo = clean.slice(0, -1);
    const dv = clean.slice(-1);
    let suma = 0;
    let factor = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo[i]) * factor;
        factor = factor === 7 ? 2 : factor + 1;  // ciclo 2→3→4→5→6→7→2
    }
    const dvCalc = 11 - (suma % 11);
    const dvEsperado = dvCalc === 10 ? 'K' : dvCalc === 11 ? '0' : String(dvCalc);
    return dv === dvEsperado;
}
```

Usar en Formik `validate` o `validationSchema` (Yup custom):

```typescript
rut: Yup.string()
    .required('RUT es requerido')
    .test('rut-valido', 'RUT invalido', (v) => validarRut(v ?? ''))
```

**Alternativas descartadas:**
- B (solo backend): feedback de error solo al hacer submit; experiencia degradada.
- C (solo frontend): backend acepta RUTs invalidos si se llama directamente.

**Consecuencias:**
- Agregar `validar_rut` a `core/validators.py` (unificado con ADR-09; no crear `rrhh/utils.py` separado).
- Crear `frontend/src/utils/rut.util.ts` con `validarRut` (unificado con ADR-09).
- Actualizar serializers de `ContratoTrabajador` y `UsuarioEmpresa`.
- Actualizar schemas Yup en el wizard frontend.

---

## ADR-29

**Titulo:** Estructura de rutas y tabs de la vista RRHH

**Estado:** pendiente de implementacion

**Contexto:**
ADR-14 acuerda crear una vista RRHH independiente de Clientes. Falta definir la jerarquia de rutas y la organizacion interna de la vista de detalle por trabajador.

**Decision:** Opcion A — ruta `/rrhh/trabajadores/` como lista principal, detalle por trabajador con tabs.

```
Rutas frontend:
/rrhh/trabajadores/                  → ListaTrabajadores.tsx
/rrhh/trabajadores/:id/              → DetalleTrabajador.tsx
  ├─ tab: contratos                  → (default)
  ├─ tab: anexos
  ├─ tab: finiquitos
  └─ tab: datos-personales

/rrhh/trabajadores/:id/contratos/:contratoId/   → DetalleContrato.tsx (wizard o vista)
```

Navegacion del sidebar:
- Entrada: **RRHH** → **Trabajadores**
- Icono sugerido: `HeroUsers` o `HeroBriefcase`

Patron de archivo:

```
frontend/src/pages/RRHH/
├─ ListaTrabajadores.tsx
├─ DetalleTrabajador.tsx
└─ components/
    ├─ TabContratos.tsx
    ├─ TabAnexos.tsx
    ├─ TabFiniquitos.tsx
    └─ TabDatosPersonales.tsx
```

**Alternativas descartadas:**
- B (tabla global de contratos sin detalle por trabajador): dificil de filtrar a escala.
- C (mantener dentro de /clientes/): mezcla contextos distintos (prestador vs. cliente).

**Consecuencias:**
- Crear carpeta `frontend/src/pages/RRHH/`.
- Registrar rutas en el router principal.
- Agregar entrada al sidebar.
- Backend no requiere cambios de URL (ya existe `/api/rrhh/`).

---

## ADR-30

**Titulo:** Firma digital base64 y validez legal (Ley 19.799)

**Estado:** fuera de scope — pendiente de validacion legal

**Contexto:**
El sistema actual almacena las firmas del trabajador y del empleador como imagen base64 en `ContratoTrabajador`. La Ley 19.799 (Chile) regula los documentos electronicos y distingue dos niveles:

- **Firma electronica simple (FES):** cualquier mecanismo de identificacion electronica, incluido un dibujo en pantalla. Tiene validez legal bajo el Art. 3, pero puede ser impugnada con mayor facilidad en juicio.
- **Firma electronica avanzada (FEA):** requiere certificado emitido por entidad acreditada ante el MINECON. Valor probatorio mas alto; obligatoria para documentos publicos y actos de mayor cuantia.

**Decision:** Dejar el mecanismo actual (base64 = FES) **sin modificar por ahora**. El tema queda **fuera del scope de implementacion** del modulo RRHH v1.

**Razon para no incluir en scope:**
1. No hay claridad sobre si los clientes del ERP requieren FEA o si FES es suficiente para sus contratos. Esto depende del tamano de la empresa y del tipo de trabajadores (dependientes, honorarios, extranjeros).
2. Integrar FEA implica contratar un proveedor externo (ej: Acepta.com, eSign, FirmaDocumentos) con costo recurrente por firma, lo que cambia el modelo de negocio del ERP.
3. El mercado laboral chileno de pymes acepta ampliamente la FES para contratos de trabajo; la impugnacion es un riesgo bajo en ese contexto.

**Pendiente de validar antes de re-abrir:**
- Confirmar con clientes si algun rubro o tamano de empresa les exige FEA.
- Evaluar si el volumen de contratos justifica el costo por firma de un proveedor FEA.
- Revisar si la Inspeccion del Trabajo ha emitido dictamenes recientes sobre FES en contratos laborales digitales.

**Lo que NO se toca en esta iteracion:**
- El campo `firma_trabajador` y `firma_empleador` (base64) permanecen igual.
- No se agrega clausula legal al PDF en este scope (puede agregarse de forma independiente como mejora menor de plantilla).

---

## ADR-31

**Titulo:** Notificacion push al grupo RRHH cuando un contrato laboral entra en revision

**Estado:** pendiente de implementacion

**Contexto:**
Cuando un `ContratoTrabajador` transiciona a estado `pendiente_aprobacion` (paso previo a la firma), el equipo de RRHH no recibe ninguna senal del sistema. Deben revisar periodicamente la lista para detectar contratos que requieren su atencion. Esto crea demoras innecesarias en el flujo de aprobacion.

**Decision:** Agregar notificacion push al grupo `rrhh` cada vez que un contrato entra en estado `pendiente_aprobacion`. El evento se dispara desde dos puntos:
1. `cambiar_estado` cuando `nuevo_estado == 'pendiente_aprobacion'`
2. `perform_create` cuando el contrato se crea directamente en estado `pendiente_aprobacion`

Nueva constante en `notificaciones/models.py`:

```python
CONTRATO_LABORAL_REVISION_SOLICITADA = (
    "contrato_laboral_revision_solicitada",
    "Contrato laboral enviado a revision",
)
```

Nueva funcion en `notificaciones/services.py`:

```python
def notificar_contrato_laboral_revision_solicitada(contrato, *, usuario_actor=None) -> None:
    empresa = contrato.usuario_empresa.sucursal.empresa
    trabajador = str(contrato.usuario_empresa)
    _disparar_a_grupo(
        empresa=empresa,
        grupo=GRUPO_RRHH,
        tipo=TipoEventoNotificacion.CONTRATO_LABORAL_REVISION_SOLICITADA.value,
        titulo="Contrato laboral requiere revision",
        cuerpo=f"El contrato de {trabajador} esta pendiente de aprobacion.",
        url_destino=f"/rrhh/trabajadores/{contrato.usuario_empresa_id}/?tab=contratos",
        datos={"contrato_id": contrato.id, "usuario_empresa_id": contrato.usuario_empresa_id},
        excluir_usuario_id=getattr(usuario_actor, "id", None),
    )
```

Hook en `rrhh/views.py` — dentro de `cambiar_estado`, despues de `contrato.save()`:

```python
if nuevo_estado == "pendiente_aprobacion":
    from notificaciones.services import notificar_contrato_laboral_revision_solicitada
    notificar_contrato_laboral_revision_solicitada(contrato, usuario_actor=request.user)
```

**Alternativas descartadas:**
- Notificar en cualquier transicion de estado: genera ruido excesivo. Solo `pendiente_aprobacion` exige accion inmediata del equipo RRHH.
- Signal Django `post_save`: acoplamiento implicito, mas dificil de trazar. El patron establecido en el proyecto usa hooks explicitos en views.
- Polling desde frontend: innecesario cuando existe la infraestructura FCM ya instalada.

**Consecuencias:**
- Sin cambio de schema — no requiere migracion.
- Nueva constante en `TipoEventoNotificacion` (migrations requeridas si el campo `tipo` usa el enum directamente; en este proyecto es `CharField` libre, no requiere migracion).
- El grupo `rrhh` ya existe como `GRUPO_RRHH = "rrhh"` en `services.py`.
- Prerequisito: ADR-15 debe estar implementado (el estado se llama `pendiente_aprobacion`, no `pendiente_aceptacion`).
- La URL destino `/rrhh/trabajadores/{id}/?tab=contratos` es la ruta actual del modulo RRHH.

---

## ADR-32

**Titulo:** Notificacion push al trabajador cuando RRHH revisa su contrato laboral

**Estado:** pendiente de implementacion

**Contexto:**
Cuando RRHH envia un contrato laboral a la empresa cliente para su revision, el sistema no notifica a RRHH cuando el representante del cliente efectivamente abre y revisa ese contrato. RRHH no sabe si el contrato fue visto o sigue sin leer. Esto genera seguimientos manuales innecesarios (llamadas, correos).

**Decision:** Agregar campo `fecha_primera_revision_cliente` (DateTimeField nullable) a `ContratoTrabajador`. Cuando el usuario de la empresa cliente accede a la vista de revision del contrato por primera vez y el campo esta en `None`, se estampa la fecha y se notifica al grupo `rrhh`. Los accesos posteriores del mismo cliente no generan notificacion adicional.

El hook se ubica en el endpoint que sirve la vista de revision al cliente. Segun la arquitectura actual del modulo, las opciones son:
- Si la revision usa token publico (como cotizaciones): hook en la view del endpoint publico `GET /api/rrhh/contratos/{token}/revision/`
- Si la revision es autenticada: hook en `retrieve()` de `ContratoTrabajadorViewSet` verificando que el usuario pertenece a la empresa cliente del contrato

Campo nuevo en `rrhh/models.py`:

```python
fecha_primera_revision_cliente = models.DateTimeField(
    null=True,
    blank=True,
    verbose_name="Primera revision por empresa cliente",
    help_text="Fecha en que la empresa cliente abrio la vista de revision del contrato por primera vez.",
)
```

Override en la view de revision del cliente (patron con autenticacion):

```python
def retrieve(self, request, *args, **kwargs):
    contrato = self.get_object()
    es_usuario_cliente = (
        contrato.usuario_empresa.sucursal.empresa_id
        == getattr(request.user, "empresa_cliente_id", None)
    )
    if contrato.fecha_primera_revision_cliente is None and es_usuario_cliente:
        contrato.fecha_primera_revision_cliente = timezone.now()
        contrato.save(update_fields=["fecha_primera_revision_cliente"])
        from notificaciones.services import notificar_contrato_laboral_visto_cliente
        notificar_contrato_laboral_visto_cliente(contrato, usuario_actor=request.user)
    return Response(self.get_serializer(contrato).data)
```

Nueva constante en `notificaciones/models.py`:

```python
CONTRATO_LABORAL_VISTO_CLIENTE = (
    "contrato_laboral_visto_cliente",
    "Contrato laboral visto por empresa cliente",
)
```

Nueva funcion en `notificaciones/services.py`:

```python
def notificar_contrato_laboral_visto_cliente(contrato, *, usuario_actor=None) -> None:
    empresa = contrato.usuario_empresa.sucursal.empresa
    trabajador = str(contrato.usuario_empresa)
    _disparar_a_grupo(
        empresa=empresa,
        grupo=GRUPO_RRHH,
        tipo=TipoEventoNotificacion.CONTRATO_LABORAL_VISTO_CLIENTE.value,
        titulo="Contrato revisado por la empresa cliente",
        cuerpo=f"La empresa cliente ha visto el contrato de {trabajador} por primera vez.",
        url_destino=f"/rrhh/trabajadores/{contrato.usuario_empresa_id}/?tab=contratos",
        datos={"contrato_id": contrato.id, "usuario_empresa_id": contrato.usuario_empresa_id},
        excluir_usuario_id=getattr(usuario_actor, "id", None),
    )
```

**Alternativas descartadas:**
- Notificar en cada acceso del cliente sin campo de guarda: spam excesivo si el representante abre el contrato varias veces.
- Accion manual del cliente "marcar como visto": agrega friccion innecesaria al flujo del cliente externo.
- Signal `post_save`: acoplamiento implicito; el patron del proyecto usa hooks explicitos en views.

**Consecuencias:**
- Nueva migracion: campo `fecha_primera_revision_cliente` nullable en `ContratoTrabajador` (additive, sin impacto en datos existentes).
- El hook exacto depende del endpoint que use la empresa cliente para ver el contrato (publico con token vs autenticado). Debe definirse al implementar.
- Destinatario: grupo `rrhh` de la empresa prestadora (igual que ADR-31).
- No tiene prerequisito de ADR-31; son eventos independientes del mismo ciclo de vida del contrato.

---

## Planes de Implementacion

> Generado desde el backlog de ADRs. Organizado por flujo funcional, nivel de refactorizacion y dependencias.  
> **Regla:** ningun plan puede iniciarse sin completar su prerequisito declarado.

### Leyenda de niveles

| Nivel | Descripcion |
|-------|-------------|
| **L1 — Hotfix** | Sin schema, sin nuevas funcionalidades. Correcciones aisladas. |
| **L2 — Schema** | Migraciones, data migrations, refactor de campos existentes. Sin cambio de flujo de negocio. |
| **L3 — Feature** | Nuevo modelo, nuevo endpoint o nueva pagina con flujo completo. |
| **L4 — Arquitectural** | Restructuracion de carpetas, rutas o patrones base. Habilita otros planes. |

---

### P0 — Correcciones criticas y seguridad

**Nivel:** L1 (Hotfix)  
**Flujo:** Transversal — seguridad y consistencia de datos  
**ADRs:** ADR-12, ADR-15, ADR-23  
**Prerequisitos:** Ninguno — debe ejecutarse primero  

| Scope | Archivos afectados |
|-------|--------------------|
| Backend | `rrhh/views.py` (ADR-12), `rrhh/estados_modelo.py` + 1 data migration (ADR-15), `empresas/models.py` (ADR-23) |
| Frontend | Labels de badge `Inactivo`; filtros y selects que referencien `pendiente_aceptacion` |

**Migraciones:** 1 data migration (`pendiente_aceptacion → pendiente_aprobacion`)  
**Riesgo:** Bajo. La data migration es la operacion mas delicada; ejecutar en horario de bajo trafico.  
**Por que primero:** ADR-12 es un bug de seguridad activo (fuga de datos entre empresas). ADR-15 renombra el valor de estado que todos los planes siguientes asumen como `pendiente_aprobacion`.

---

### P1 — Maquina de estados y tipos de contrato

**Nivel:** L2 (Schema refactor con data migrations)  
**Flujo:** Ciclo de vida del contrato — modelo de estados  
**ADRs:** ADR-01, ADR-02, ADR-03, ADR-07 (`BooleanField → CharField`), ADR-20, ADR-21  
**Prerequisitos:** P0  

| Scope | Archivos afectados |
|-------|--------------------|
| Backend | `rrhh/estados_modelo.py`, `rrhh/models.py` (`tipo_gratificacion`, `motivo_anulacion`, estado `descartado`) |
| Frontend | `types.ts` (constantes IMM, gratificacion), badges de estado en wizard y listas |

**Migraciones:** 5 data migrations agrupadas en 1 archivo (`0002_refactor_estados_y_tipos`)  
**Riesgo:** Alto. Cambios de choices con datos existentes; requiere script de verificacion previo para detectar valores huerfanos (p.ej. registros con `tipo=honorarios` o `tipo=obra_o_faena`).  
**Por que segundo:** Los estados y tipos son el contrato de datos base. El frontend y todos los planes siguientes asumen este schema definitivo.

---

### P2 — Campos legales del contrato

**Nivel:** L2 (Schema additive)  
**Flujo:** Creacion del contrato — datos personales y legales del trabajador  
**ADRs:** ADR-04, ADR-05, ADR-19, ADR-24, ADR-25, ADR-26  
**Prerequisitos:** P0 (orden logico; tecnicamente paralelo a P1)  

| Scope | Archivos afectados |
|-------|--------------------|
| Backend | `rrhh/models.py` (campos nuevos + renames), `rrhh/serializers.py`, 3 migraciones agrupables |
| Frontend | `StepTrabajador.tsx` (campos nuevos), labels y tooltips de fechas (ADR-25) |

**Migraciones:** 3 agrupadas en 1 archivo (`0003_campos_legales_contrato`)  
**Riesgo:** Bajo. Todos los campos son `null=True` o `blank=True`; sin impacto en registros existentes. Los renames de `verbose_name` no generan migracion de esquema.  
**Por que tercero:** Sus campos deben existir en BD antes de activar los inputs correspondientes en el wizard (P6).

---

### P3 — AFP y datos previsionales

**Nivel:** L2 (Schema + FK migration)  
**Flujo:** Perfil previsional del trabajador  
**ADRs:** ADR-10, ADR-13, ADR-27  
**Prerequisitos:** P0 (orden logico); puede ejecutarse en paralelo a P2  

| Scope | Archivos afectados |
|-------|--------------------|
| Backend | `empresas/models.py` (`afp CharField → FK`), `rrhh/models.py` (`tasa_cotizacion` en `AfpCatalogo`), 2 migraciones |
| Frontend | `StepPrevisionBanco.tsx` (remover `isCreatable` en AFP), `UsuarioEmpresaSerializer` |

**Migraciones:** 2 (`0004_usuarioempresa_afp_fk`, `0005_afpcatalogo_tasa_cotizacion`)  
**Riesgo:** Medio. La migracion `CharField → FK` requiere data migration: mapear strings AFP almacenados a IDs del catalogo. Si existen valores no reconocidos, el script debe decidir `SET NULL` y registrar la incidencia.  
**Por que cuarto:** El FK de AFP es prerequisito del pre-fill del wizard (ADR-11) y del calculo de descuentos con `tasa_cotizacion` (ADR-27).

---

### P4 — Validacion de RUT

**Nivel:** L2 light (sin schema)  
**Flujo:** Validacion transversal de datos de entrada  
**ADRs:** ADR-09, ADR-28  
**Prerequisitos:** Ninguno — completamente independiente  

| Scope | Archivos afectados |
|-------|--------------------|
| Backend | `core/validators.py` (nuevo validator + funcion bool `validar_rut`) |
| Frontend | `src/utils/rut.util.ts` (nuevo archivo), schemas Yup en `StepTrabajador.tsx` |

**Migraciones:** Ninguna  
**Riesgo:** Bajo. Solo agrega validators; no modifica datos existentes. Riesgo menor: falso positivo si existen RUTs mal formateados ya almacenados en BD.  
**Recomendacion:** Antes de activar el validator en `UsuarioEmpresa.rut`, ejecutar una query de auditoria que liste RUTs invalidos existentes y decidir si se corrigen o se dejan como datos historicos.

---

### P5 — Arquitectura frontend RRHH

**Nivel:** L4 (Arquitectural)  
**Flujo:** Estructura de la seccion RRHH en el frontend  
**ADRs:** ADR-14, ADR-29  
**Prerequisitos:** Ninguno — puede ejecutarse en paralelo a P0-P4  

| Scope | Archivos afectados |
|-------|--------------------|
| Frontend | Nueva carpeta `pages/RRHH/` con `ListaTrabajadores.tsx` y `DetalleTrabajador.tsx` (stubs), rutas en router principal, entrada en sidebar |
| Backend | Sin cambios (la API `/api/rrhh/` ya existe) |

**Migraciones:** Ninguna  
**Riesgo:** Bajo. Es aditivo; no modifica codigo existente. Solo crea rutas y archivos stub.  
**Por que antes de P6 y P7:** Define los archivos y rutas donde P6 y P7 depositan sus componentes. Sin P5, esos planes generan archivos en ubicaciones que luego hay que mover.

---

### P6 — Wizard de creacion de contratos (refactor completo)

**Nivel:** L3 (Feature refactor)  
**Flujo:** Creacion del contrato — todos los steps del wizard  
**ADRs:** ADR-06, ADR-07 (frontend), ADR-08, ADR-11, ADR-22  
**Prerequisitos:** P1, P2, P3, P4, P5 — todos completos  

| Scope | Archivos afectados |
|-------|--------------------|
| Frontend | `StepJornada.tsx` (ADR-02), `StepRemuneraciones.tsx` (ADR-06, 07, 08), `StepPrevisionBanco.tsx` (ADR-11), `CrearContratoTrabajadorWizard.tsx` (ADR-05 tabs), modal confirmacion `borrador → vigente` (ADR-22) |
| Backend | Serializer: validacion condicional `sistema_salud_otro` (ADR-26, campo ya existe de P2) |

**Migraciones:** Ninguna (todos los campos de BD fueron creados en P2 y P3)  
**Riesgo:** Medio. El wizard ya esta en uso en produccion; riesgo de regresion en los flujos "nuevo trabajador" y "trabajador existente". Requiere pruebas end-to-end de ambos flujos antes de merge.  
**Por que penultimo:** Es el plan con mayor cantidad de prerequisitos; acumula el resultado de todos los planes anteriores.

---

### P7 — Documentos del contrato: Anexos y Finiquitos

**Nivel:** L3 (New models + new features)  
**Flujo:** Documentos del ciclo laboral  
**ADRs:** ADR-16, ADR-17, ADR-18  
**Prerequisitos:** P1 (estado `terminado` y `anulado` definidos), P2 (campos del contrato)  

| Scope | Archivos afectados |
|-------|--------------------|
| Backend | `rrhh/models.py` (`numero_anexo`, `Finiquito`, `ConceptoFiniquito`), `rrhh/signals.py` (signal `pre_save` ADR-16), nuevos serializers + ViewSets + endpoints |
| Frontend | `DetalleContrato.tsx` (banner vencimiento ADR-17), tab Finiquitos en `DetalleTrabajador.tsx` (ADR-18), numero de anexo en template PDF |

**Migraciones:** 2 (`0006_numero_anexo_anexocontrato`, `0007_finiquito_conceptofiniquito`)  
**Riesgo:** Medio-alto. ADR-18 es el mayor volumen de codigo nuevo del backlog (2 modelos + ViewSet completo). La decision de requerir finiquito firmado antes de activar estado `terminado` esta marcada como "a confirmar en implementacion" (ADR-18).  
**Pueden ejecutarse en paralelo:** ADR-17 (solo frontend, trivial) puede adelantarse desde P5 sin esperar P7 completo.

---

### Diagrama de dependencias

```
         P0
        /  \
       P1   P2 ─── P3
        \    \    /
         ──── P6 ◄── P4 (independiente)
        /    /
       P7  P5 ─────────────► P6
```

| Paralelos posibles | Detalle |
|--------------------|---------|
| P1 ‖ P2 | Ambos requieren P0; no se bloquean entre si |
| P2 ‖ P3 | Tocan modelos distintos |
| P4 ‖ todo | Completamente independiente |
| P5 ‖ P0-P4 | Solo frontend; no depende de BD |
| P7 puede dividirse | ADR-17 es frontend-only; puede ir con P5 |

---

### Resumen ejecutivo

| Plan | ADRs incluidos | Nivel | Migraciones | Prerequisito | Bloquea |
|------|----------------|-------|-------------|--------------|---------|
| P0 | 12, 15, 23 | L1 | 1 data | — | P1, P2, P3 |
| P1 | 01, 02, 03, 07, 20, 21 | L2 | 1 agrupada (5 ops) | P0 | P6, P7 |
| P2 | 04, 05, 19, 24, 25, 26 | L2 | 1 agrupada (3 ops) | P0 | P6, P7 |
| P3 | 10, 13, 27 | L2 | 2 | P0 | P6 |
| P4 | 09, 28 | L2 light | 0 | — | P6 |
| P5 | 14, 29 | L4 | 0 | — | P6, P7 |
| P6 | 06, 07, 08, 11, 22 | L3 | 0 | P1-P5 | — |
| P7 | 16, 17, 18 | L3 | 2 | P1, P2 | — |

**Total migraciones Django:** 11 operaciones agrupadas en ~7 archivos de migracion.  
**ADRs cubiertos:** 30/30 (ADR-30 excluido por decision explicita de fuera de scope).

---
