# Diseño de sistema - Gestion Snabbit

Este archivo describe el design system base del proyecto ERP Snabbit para integrarlo en Stitch.

## Nombre y propósito

- Nombre del sistema: **Gestion Snabbit**
- Propósito: UI administrativa para ERP multi-empresa de servicios de TI.
- Alcance: interfaz de administración interna, gestión de órdenes de trabajo, cotizaciones, inventario, contratos, visitas y rendiciones.

## Branding

- Proyecto: `Gestion Snabbit`
- Identidad visual: tonos azul y grises neutros con acentos de estado en `amber`, `emerald`, `red` y `violet`.
- Modo de color: usa `darkMode: 'class'` y respeta la preferencia del sistema.

## Paleta de color principal

| Token | Valor | Uso recomendado |
|---|---|---|
| `primary` | `#3b82f6` (blue-500) | Botones primarios, acentos activos, indicadores principales |
| `primary-dark` | `#1d4ed8` (blue-700) | Hover/active primario, estados resaltados |
| `accent-warning` | `#f59e0b` (amber-500) | Advertencias, badges de estado intermedio |
| `accent-success` | `#10b981` (emerald-500) | Mensajes de éxito, labels positivos |
| `accent-danger` | `#ef4444` (red-500) | Errores, estados críticos, botones destructivos |
| `accent-info` | `#0ea5e9` (sky-500) | Información, enlaces y estados secundarios |
| `accent-alt` | `#8b5cf6` (violet-500) | Secciones destacadas, tags de categoría |

## Neutrales y fondo

| Token | Valor | Uso recomendado |
|---|---|---|
| `background` | `#ffffff` | Fondo principal en modo claro |
| `surface` | `#f8fafc` / `#111827` | Cartas, paneles y superficies |
| `border` | `#e5e7eb` / `#374151` | Bordes, separadores |
| `text-primary` | `#111827` / `#f9fafb` | Texto principal |
| `text-secondary` | `#6b7280` / `#d1d5db` | Texto secundario |
| `muted` | `#737373` / `#9ca3af` | Texto de ayuda y metadatos |

## Tipografía

- Fuente base: `Poppins, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Tamaño base: `13px` por defecto.
- Escala de tipografía admitida: `12px`, `13px`, `14px`, `15px`, `16px`, `17px`, `18px`.
- Line-height recomendado: `1.5`.

### Jerarquía tipográfica sugerida

| Estilo | Tamaño | Peso | Uso |
|---|---|---|---|
| `display` | 24-28px | 700 | Títulos principales de páginas |
| `heading` | 18-22px | 600 | Secciones y títulos de panel |
| `body-large` | 16px | 500 | Texto de cuerpo principal |
| `body` | 13px | 400 | Texto normal, etiquetas, inputs |
| `caption` | 12px | 400 | Ayudas, notas, textos secundarios |

## Espaciado y layout

- Bordes: `rounded-lg` para contenedores principales.
- Borde interior coloquial: `border-2` para componentes con estructura.
- Transición base: `transition-all duration-300 ease-in-out`.
- Uso de cajas: componentes `Card` y `Container` con espacios coherentes y separación clara entre secciones.

## Componentes clave

### Layout

- `PageWrapper`: wrapper principal de página.
- `Subheader`: barra superior de página.
- `SubheaderLeft` / `SubheaderRight`: acciones y navegación contextual.
- `Container`: contenedor de contenido central.

### Contenedores

- `Card`, `CardBody`, `CardHeader`, `CardFooter`.
- Bordes suaves y fondo neutro, con `rounded-lg` y `border-2` cuando se requiere separación.

### Botones

- `Button`: variantes `solid`, `outline`, `ghost`.
- Iconos: usar prefijo `Hero` (`HeroPlus`, `HeroPencil`, `HeroTrash`, `HeroArrowLeft`, `HeroArrowPath`, `HeroDocumentArrowDown`).
- Color primario: `blue-500`.
- Estado de hover: `blue-700` / `amber-700` / `emerald-700` según variante.

### Formularios

- `Input`, `SelectReact`, `Textarea`, `Checkbox`, `Validation`, `Label`.
- Estilo: campos con `rounded-lg`, bordes claros y texto secundario suave.
- Validación: mensajes asociados bajo el campo con color `red-500` en errores.

### Modales y diálogos

- `Modal`: estructurado en `ModalHeader`, `ModalBody`, `ModalFooter`.
- Botones de acción dentro de footers.
- Uso de `CloseButton` para cerrar.

### Tablas

- `Table`, `THead`, `TBody`, `Tr`, `Th`, `Td`, `TFoot`.
- Separadores ligeros y cabeceras con texto semibold.

### Badges y estados

- `Badge` con colores de estado:
  - `amber` para `Pendiente`
  - `blue` para `En Proceso`
  - `emerald` para `Completado`
  - `red` para `Cancelado`
  - `violet` para `Facturado`

## Iconografía

- Sistema de iconos: Heroicons.
- Prefijo usado en props: `Hero<IconName>`.
- Iconos frecuentes:
  - `HeroArrowLeft`
  - `HeroPlus`
  - `HeroPencil`
  - `HeroTrash`
  - `HeroArrowPath`
  - `HeroDocumentArrowDown`
  - `HeroCheck`
  - `HeroXMark`

## Tonos y estados semánticos

- `success`: `emerald-500`
- `warning`: `amber-500`
- `danger`: `red-500`
- `info`: `sky-500`
- `neutral`: `zinc-900`, `zinc-500`

## Reglas de uso

- Siempre importar componentes UI desde `@/components/ui/`.
- Seguir la estructura de página: `PageWrapper` → `Subheader` → `Container` → `Card`.
- Evitar clases Tailwind arbitrarias para colores; usar tokens de la paleta.
- No crear componentes UI nuevos sin necesidad; reutilizar la biblioteca existente.
- Usar `getErrorMessage` para el manejo de errores en frontend.
- No usar `refetch()` manual en RTK Query, sino `invalidatesTags`.

## Archivos de referencia

- `frontend/src/config/theme.config.ts`
- `frontend/tailwind.config.cjs`

## Notas de Stitch

Este documento está pensado para que Stitch genere o actualice la definición visual del sistema basada en las decisiones de tema actuales del frontend.
