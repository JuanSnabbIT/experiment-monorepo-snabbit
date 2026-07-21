/**
 * Paleta de color por categoría de etiqueta, compartida entre el chip insertado
 * en el documento (EditorDocumentoV29) y el panel de selección (PanelEtiquetas,
 * usado por el editor v2 y v2.9). Fuente de verdad única — ampliar acá si se
 * agrega una categoría nueva.
 *
 * Paleta validada con la skill de dataviz contra el safelist de Tailwind del
 * proyecto (zinc/red/amber/lime/emerald/teal/sky/blue/violet están generados —
 * `teal` se agregó junto con la categoría `licencia`, ver `tailwind.config.cjs`).
 * `proveedor` (blue) y `empleador` (violet) no pasan el chequeo de separación
 * para daltonismo entre sí, pero nunca coexisten en el mismo documento (una
 * plantilla es de tipo laboral o comercial, nunca ambas) y cada chip siempre
 * lleva su texto visible, nunca depende solo del color.
 */

/** Chip sólido — mismo estilo para el chip insertado en el documento y para las
 *  etiquetas listadas en el dropdown del panel (PanelEtiquetas). */
export const CATEGORIA_CHIP_SOLIDO: Record<string, string> = {
    cliente:    'border-sky-500 bg-sky-500/10 text-sky-600',
    proveedor:  'border-blue-500 bg-blue-500/10 text-blue-600',
    empleador:  'border-violet-500 bg-violet-500/10 text-violet-600',
    trabajador: 'border-emerald-500 bg-emerald-500/10 text-emerald-600',
    contrato:   'border-zinc-400 bg-zinc-500/10 text-zinc-600',
    economico:  'border-amber-500 bg-amber-500/10 text-amber-600',
    servicio:   'border-lime-500 bg-lime-500/10 text-lime-600',
    licencia:   'border-teal-500 bg-teal-500/10 text-teal-600',
    custom:     'border-red-500 bg-red-500/10 text-red-600',
};

/** Punto indicador sólido — usado junto al nombre de la categoría en el dropdown. */
export const CATEGORIA_DOT_CLASS: Record<string, string> = {
    cliente:    'bg-sky-500',
    proveedor:  'bg-blue-500',
    empleador:  'bg-violet-500',
    trabajador: 'bg-emerald-500',
    contrato:   'bg-zinc-400',
    economico:  'bg-amber-500',
    servicio:   'bg-lime-500',
    licencia:   'bg-teal-500',
    custom:     'bg-red-500',
};

/** Categoría de fallback para claves sin categoría reconocida. */
export const CATEGORIA_DEFAULT = 'proveedor';
