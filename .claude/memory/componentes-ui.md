---
name: componentes-ui
description: Componentes UI base, form, layout — 25 componentes desarrollados localmente con Tailwind
lastUpdated: 2026-06-01
relatedFiles:
  - frontend/src/components/ui/
  - frontend/src/components/form/
  - frontend/src/components/layouts/
  - .github/instructions/visual-consistency.md
---

# Componentes UI — Tailwind + Fyr Pattern

## 12 Componentes Base (`components/ui/`)

| Componente | Archivo | Uso |
|------------|---------|-----|
| Alert | Alert.tsx | Mensajes inline (éxito, error, warning) |
| Badge | Badge.tsx | Etiquetas de estado (OT, cotización, etc.) |
| Button | Button.tsx | Botones de acción (primary, secondary, danger) |
| ButtonGroup | ButtonGroup.tsx | Grupo de botones relacionados |
| Card | Card.tsx | Contenedor principal (+ CardBody, CardHeader, etc.) |
| CloseButton | CloseButton.tsx | Cerrar modales, alertas |
| Dropdown | Dropdown.tsx | Menús desplegables (+ DropdownMenu, DropdownItem) |
| Modal | Modal.tsx | Diálogos (+ ModalHeader, ModalBody, ModalFooter) |
| OffCanvas | OffCanvas.tsx | Paneles laterales deslizantes |
| Progress | Progress.tsx | Barras de progreso (% completion) |
| Table | Table.tsx | Tablas con TanStack (+ THead, TBody, Th, Tr, Td) |
| Tooltip | Tooltip.tsx | Información contextual al hover |

**Imports:**
```tsx
import Button from '@/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import Table, { THead, TBody, Th, Tr, Td } from '@/components/ui/Table';
```

## 9 Componentes Form (`components/form/`)

| Componente | Archivo | Uso |
|------------|---------|-----|
| Checkbox | Checkbox.tsx | Casillas de verificación |
| FieldWrap | FieldWrap.tsx | Wrapper con icono + validación |
| Input | Input.tsx | Campo de texto simple |
| Label | Label.tsx | Etiqueta de campo |
| Radio | Radio.tsx | Botones radio |
| Select | Select.tsx | Select nativo HTML |
| SelectReact | SelectReact.tsx | Select con react-select (creatable, async) |
| Textarea | Textarea.tsx | Área de texto multiline |
| **FileInput** | FileInput.tsx | 🆕 Sprint 21 — Carga de archivos |
| **RadioCard** | RadioCard.tsx | 🆕 Sprint 21 — Radio button estilizado |

**Imports:**
```tsx
import Input from '@/components/form/Input';
import { SelectReact } from '@/components/form/SelectReact';
import FileInput from '@/components/form/FileInput';
import RadioCard from '@/components/form/RadioCard';
```

## 4 Componentes Layout (`components/layouts/`)

| Componente | Archivo | Uso |
|------------|---------|-----|
| PageWrapper | PageWrapper.tsx | Estructura principal de página |
| Subheader | Subheader.tsx | Sección con breadcrumb + acciones |
| Container | Container.tsx | Contenedor centrado con max-width |
| Sidebar | Sidebar.tsx | Navegación lateral |

## Tema Visual

**Configuración:** `frontend/src/config/theme.config.ts`

```typescript
const themeConfig: TThemeConfigs = {
    projectTitle: 'Gestion Snabbit',
    language: 'es',
    theme: DARK_MODE.SYSTEM,      // Respeta OS preference
    themeColor: 'blue',           // Primary color
    themeColorShade: '500',       // Intensidad
    rounded: 'rounded-lg',        // Border radius
    borderWidth: 'border-2',      // Border width
    transition: 'transition-all duration-300 ease-in-out',
    fontSize: 13,
};
```

**Colores disponibles (Tailwind):**
`zinc`, `red`, `amber`, `lime`, `emerald`, `sky`, `blue`, `violet`

## Patrones de Uso

### Button
```tsx
<Button 
  color="primary"           // primary, secondary, danger
  size="md"                 // sm, md, lg
  disabled={isLoading}
  onClick={handleClick}
  icon="HeroCheckCircle"    // Heroicons con prefijo Hero
>
  Guardar
</Button>
```

### Modal
```tsx
<Modal isOpen={isOpen} onClose={closeModal}>
  <ModalHeader>Confirmar acción</ModalHeader>
  <ModalBody>¿Está seguro?</ModalBody>
  <ModalFooter>
    <Button onClick={closeModal}>Cancelar</Button>
    <Button color="danger" onClick={confirm}>Eliminar</Button>
  </ModalFooter>
</Modal>
```

### Form Field
```tsx
<FieldWrap label="Nombre" error={errors.nombre} icon="HeroUser">
  <Input 
    value={formData.nombre}
    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
    placeholder="Ingrese nombre"
  />
</FieldWrap>
```

## Reglas de Uso

✅ **BIEN:**
- Componentes desde `@/components/{ui,form,layouts}/`
- Usar `rounded-lg`, colores Tailwind, Heroicons con prefijo
- Props tipadas (TypeScript strict mode)
- Validar en FieldWrap

❌ **MALO:**
- Importar desde rutas relativas (`../../../components`)
- Estilos inline (usar Tailwind classes)
- Colores arbitrarios (`bg-green-500` → usar `emerald`)
- Crear variantes sin justificación

## FileInput & RadioCard (Sprint 21)

**FileInput**
```tsx
<FileInput 
  accept=".pdf,.doc"
  maxSize={5 * 1024 * 1024}  // 5 MB
  onChange={(file) => handleFile(file)}
/>
```

**RadioCard**
```tsx
<RadioCard 
  name="tipo"
  value="cliente"
  label="Cliente"
  checked={formData.tipo === 'cliente'}
  onChange={(val) => setFormData({...formData, tipo: val})}
/>
```

## Iconos

**Sistema:** Heroicons (https://heroicons.com/)

**Formato:** `Hero{Nombre}` (camelCase con prefijo)

```tsx
import { HeroCheckCircle, HeroTrash, HeroExclamationTriangle } from '@heroicons/react/24/solid';

<Button icon="HeroTrash">Eliminar</Button>
```

## RTK Query

Cuando uses componentes en forms/modales con datos de API:

```tsx
const { data: contrato } = useGetContratoQuery(id);
const [updateContrato] = useUpdateContratoMutation();

// Actualizar → RTK invalida automáticamente
await updateContrato(data).unwrap();
// ✅ Componentes re-renderizan con data nueva
// ❌ NO hacer: refetch() manual
```

---

**Cuándo usar esto:** Construir vistas, agregar componentes nuevos, validar UI consistency
