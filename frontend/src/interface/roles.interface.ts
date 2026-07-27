export const ROLES = [
    'staff',
    'superadmin',
    'rrhh',
    'multi-empresas',
    'contratos',
    'finanzas',
    'tecnico',
    'ventas',
    'comprador',
    'bodega',
    'operaciones',
    'representante_legal',
] as const;

export type TRol = (typeof ROLES)[number];
