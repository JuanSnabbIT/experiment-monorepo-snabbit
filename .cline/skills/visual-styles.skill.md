---
name: visual-styles
description: "Catálogo canónico de estilos UI del ERP Snabbit. Usar cuando: crear o editar cualquier componente visual (botones, badges, modales, tablas, cards, dropdowns, formularios)."
---

# Skill: Visual Styles — ERP Snabbit

## Cuando usar este skill
- Crear o editar un botón de cualquier tipo
- Agregar un badge de estado
- Implementar un modal (confirmación, formulario, detalle)
- Crear una tabla con datos
- Usar cards, dropdowns, formularios, layout

## Patrones UI principales

### Botones
```tsx
// Botón primario
<Button color='blue' variant='solid'>Acción</Button>

// Botón ghost (secundario)
<Button color='zinc' variant='outlined'>Cancelar</Button>

// Botón con icono
<Button color='violet' variant='solid' icon='HeroEye' size='sm' />

// Botón como link tab
<Button size='sm' rounded='rounded-full' className='border' isActive color='blue' colorIntensity='500' variant='solid'>
```

### Badges de estado
```tsx
<Badge variant='solid' color={BADGE_COLOR_ESTADO[estado] ?? 'zinc'} className='capitalize'>
  {estado_label}
</Badge>
```

### Tablas
```tsx
<Table className='min-w-[600px] table-fixed'>
  <THead>
    <Tr>
      <Th isColumnBorder={false} className='text-left'>...</Th>
    </Tr>
  </THead>
  <TBody>
    <Tr>
      <Td>...</Td>
    </Tr>
  </TBody>
</Table>
```

### Cards
```tsx
<Card>
  <CardHeader>...</CardHeader>
  <CardBody>...</CardBody>
</Card>
```

### Iconos
```tsx
<Icon icon='HeroCheckCircle' size='text-2xl' className='text-emerald-500' />
```

### Tooltips
```tsx
<Tooltip text='Texto descriptivo'>
  <span>Elemento</span>
</Tooltip>
```

### Select con API
```tsx
<SelectReact
  placeholder='Seleccionar...'
  name='campo'
  options={options}
  value={selected}
  onChange={(e) => setSelected(e as { value: string; label: string })}
/>
```

## Referencias
- Skill completa original: `.github/skills/visual-styles/SKILL.md`
- Componentes UI: `frontend/src/components/ui/`
- Tema base: `tema_base/fyr-vite/`