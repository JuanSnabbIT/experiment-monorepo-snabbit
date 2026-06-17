# Snabbit ERP Design System — Conventions

## Setup

No provider or theme wrapper required. Load stylesheet and bundle once, then use components directly:

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

All components available at `window.SnabbitDS.*`. Poppins font loads from Google Fonts via `styles.css` — no local font files needed.

## Styling idiom — props + Tailwind

Components are styled via **props** for appearance, and **Tailwind utility classes** for layout composition. Never use inline styles or CSS modules.

### Component props (the design vocabulary)

| Prop | Type | Values |
|---|---|---|
| `color` | TColors | `blue` `emerald` `amber` `red` `violet` `zinc` `sky` `lime` |
| `variant` | TButtonVariants | `solid` `outline` `default` `plain` |
| `size` | TButtonSize | `xs` `sm` `default` `lg` `xl` |
| `colorIntensity` | TColorIntensity | `50` `100` `200` … `900` `950` (default: `500`) |
| `rounded` | TRounded | `rounded` `rounded-md` `rounded-lg` `rounded-xl` `rounded-full` |
| `icon` | TIcons | `Hero<PascalCaseName>` — e.g. `HeroPlus` `HeroPencil` `HeroTrash` `HeroEye` |

### Badge color semantics (ERP — always follow this map)

| State | Color |
|---|---|
| Borrador / Inactivo | `zinc` |
| Pendiente / En revisión | `amber` |
| En proceso / Activo | `blue` or `emerald` |
| Completado / Vigente | `emerald` |
| Cancelado / Anulado | `red` |
| Finalizado / Terminado | `violet` |

### Tailwind vocabulary for layout glue

Use only the approved palette in utility classes: `zinc` `red` `amber` `lime` `emerald` `sky` `blue` `violet`. Never use `green`, `orange`, `pink`, `teal`, or other Tailwind colors.

Common layout patterns: `flex items-center gap-4`, `grid grid-cols-3 gap-4`, `p-4`, `text-sm font-medium text-zinc-500 dark:text-zinc-400`.

Dark mode: all components support dark mode via Tailwind's `dark:` prefix. Always pair light/dark variants.

## Standard page structure

```tsx
const { PageWrapper, Subheader, SubheaderLeft, SubheaderRight, Container, Card, CardHeader, CardHeaderChild, CardBody, Button } = window.SnabbitDS;

<PageWrapper>
  <Subheader>
    <SubheaderLeft>
      <Button icon="HeroArrowLeft">Volver</Button>
      <h1 className="text-xl font-bold">Título</h1>
    </SubheaderLeft>
    <SubheaderRight>
      <Button variant="solid" color="blue" icon="HeroPlus">Nuevo</Button>
    </SubheaderRight>
  </Subheader>
  <Container>
    <Card>
      <CardHeader>
        <CardHeaderChild>Sección</CardHeaderChild>
      </CardHeader>
      <CardBody>
        {/* content */}
      </CardBody>
    </Card>
  </Container>
</PageWrapper>
```

## Where the truth lives

- `styles.css` — single stylesheet entry; imports Tailwind output + component CSS
- `components/<group>/<Name>/<Name>.prompt.md` — per-component API reference
- `components/<group>/<Name>/<Name>.d.ts` — TypeScript props interface
- Groups: `general` (UI primitives), `form` (form controls), `layouts` (page structure)
