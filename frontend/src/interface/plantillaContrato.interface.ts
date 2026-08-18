export interface IEtiquetaPlantilla {
    id: number;
    empresa_prestadora: number | null;
    clave: string;
    nombre_display: string;
    categoria: 'cliente' | 'proveedor' | 'contrato' | 'servicio' | 'economico' | 'trabajador' | 'empleador' | 'licencia' | 'custom';
    tipo_contrato: string | null;
    origen_dato: string | null;
    descripcion: string | null;
    valor_default: string | null;
    fecha_creacion: string;
    fecha_modificacion: string;
}
