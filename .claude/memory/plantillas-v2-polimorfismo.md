---
name: plantillas-v2-polimorfismo
description: Decisión de diseño — patrón polimórfico para plantillas, adaptadores, IContratoBase
lastUpdated: 2026-06-01
relatedFiles:
  - backend/contratos/motor_plantillas_v2.py
  - backend/contratos/adaptadores.py
  - backend/contratos/models.py
  - .github/instructions/motor-plantillas-v2.md
---

# Motor de Plantillas V2 — Patrón Polimórfico

## Decisión: ¿Por Qué Polimorfismo?

**Problema:** Contratos B2B y laborales comparten estructura pero difieren en:
- Campos obligatorios
- Etiquetas interpolables
- Validaciones
- Flujos de aprobación

**Solución:** Patrón polimórfico mediante **adaptadores** que implementan interfaz común `IContratoBase`.

## Arquitectura

```
IContratoBase (interfaz)
  ├─ AdaptadorContratoB2B → ContratoEmpresaCliente
  ├─ AdaptadorContratoTrabajador → ContratoTrabajador
  └─ [Otros adaptadores futuros]
```

### IContratoBase (Interfaz)

```python
class IContratoBase(ABC):
    """Interfaz que todo contrato debe implementar para plantillas V2"""
    
    @property
    @abstractmethod
    def get_empresa_prestadora(self) -> Empresa:
        """Empresa que ofrece"""
        
    @property
    @abstractmethod
    def get_empresa_cliente(self) -> Empresa:
        """Empresa que compra"""
        
    @property
    @abstractmethod
    def get_fecha_inicio(self) -> date:
        """Fecha inicio de vigencia"""
    
    @abstractmethod
    def resolver_etiqueta(self, nombre_etiqueta: str) -> Any:
        """Interpolar [etiqueta] a valor real"""
        # [cliente.nombre] → "Acme Inc"
        # [fecha.inicio_formateada] → "01 de Junio de 2026"
        # Retorna None si no existe (NOT_HANDLED sentinel)
```

### Adaptador B2B

```python
from backend.contratos.adaptadores import AdaptadorContratoB2B

adaptador = AdaptadorContratoB2B(contrato_b2b)

# Generar secciones
secciones = generar_secciones_v2(adaptador)

# Renderizar etiqueta
contenido = renderizar_seccion_v2(
    "[cliente.nombre] contrata servicios de [empresa_prestadora.nombre]...",
    adaptador=adaptador
)
# Output: "Acme Inc contrata servicios de Snabbit..."
```

### Orden de Resolución de Etiquetas

1. **Etiquetas especiales B2B:** `[cliente.nombre]`, `[empresa_prestadora.nombre]`, etc.
2. **EtiquetaPlantilla en BD:** Lookup en tabla (valores customizables)
3. **Rutas de atributos:** `[contrato.fecha_inicio]` → acceso directo
4. **Fallback:** `NOT_HANDLED` → no interpolar, dejar como está

## Componentes Clave

### PlantillaContrato
- `nombre` — "Contrato B2B Estándar"
- `tipo` — "b2b" o "laboral"
- `contenido_html` — HTML con etiquetas [...]
- `versión` — Versionado

### SeccionPlantilla
- `orden` — Posición en plantilla
- `titulo` — "Términos y Condiciones"
- `contenido_template` — HTML con [etiquetas]

### EtiquetaPlantilla
- `nombre` — "cliente.razon_social"
- `valor_default` — "Empresa Cliente S.A."
- `es_editable` — Si puede customizar usuario

### SeccionContratoGenerada
- `contrato` — FK
- `plantilla` — FK PlantillaContrato
- `numero_seccion` — Orden
- `titulo_final` — Título renderizado
- `contenido_final` — Contenido renderizado
- `fue_editado_manualmente` — Flag para no re-render

## Flujo de Uso

```python
# 1. Obtener plantilla
plantilla = PlantillaContrato.objects.get(tipo='b2b', activo=True)

# 2. Crear adaptador del contrato
adaptador = AdaptadorContratoB2B(contrato)

# 3. Generar secciones (interpola todas las etiquetas)
secciones = generar_secciones_v2(adaptador, plantilla)

# 4. Guardar en BD
for seccion_generada in secciones:
    SeccionContratoGenerada.objects.create(...)

# 5. Usuario visualiza
# Frontend: GET /api/contratos/{id}/secciones/
# Retorna SeccionContratoGenerada (YA INTERPOLADO)

# 6. Si usuario edita manualmente
# SeccionContratoGenerada.fue_editado_manualmente = True
# → No se re-interpola al actualizar plantilla
```

## Extensibilidad

**Para agregar nuevo tipo de contrato:**

```python
# 1. Implementar IContratoBase
class AdaptadorMiContrato(IContratoBase):
    def __init__(self, mi_contrato):
        self.contrato = mi_contrato
    
    def get_empresa_prestadora(self) -> Empresa:
        return self.contrato.empresa
    
    def resolver_etiqueta(self, nombre: str) -> Any:
        # Lógica específica de tu modelo
        if nombre == "mi_campo_especial":
            return self.contrato.campo_especial
        return NOT_HANDLED

# 2. Usar en plantillas
adaptador = AdaptadorMiContrato(mi_contrato)
secciones = generar_secciones_v2(adaptador)
```

## Ventajas del Patrón

✅ **Reutilización:** Motor V2 funciona con cualquier tipo si implementa IContratoBase  
✅ **Testabilidad:** Mock adaptador para tests  
✅ **Separación de Responsabilidades:** Lógica de interpolación ≠ lógica de modelos  
✅ **Extensibilidad:** Agregar nuevo tipo sin modificar motor

---

**Cuándo usar:** Agregar nuevo tipo de contrato, cambiar orden de resolución de etiquetas, debugging de interpolación
