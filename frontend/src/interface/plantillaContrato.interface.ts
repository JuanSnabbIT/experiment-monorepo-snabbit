export interface IPlantillaContrato {
    id: number;
    empresa_prestadora: number;
    titulo: string;
    descripcion: string | null;
    version: number;
    activa: boolean;
    tipo_contrato: 'licencia' | 'venta' | 'servicios';
    secciones: ISeccionPlantilla[];
    fecha_creacion: string;
    fecha_modificacion: string;
    es_default: boolean;
    // Posición de bloques demo en el documento
    orden_bloque_alcance: number;
    orden_bloque_operacion: number;
    orden_bloque_condiciones: number;
    // Labels de display
    tipo_contrato_label?: string;
}

export interface ISeccionPlantilla {
    id: number;
    plantilla: number;
    titulo: string;
    tipo: 'encabezado' | 'clausula' | 'condiciones_generales' | 'firmas' | 'libre';
    contenido_template: string;
    orden: number;
    es_editable_en_contrato: boolean;
    es_obligatoria: boolean;
    fecha_creacion: string;
    fecha_modificacion: string;
}

export interface IEtiquetaPlantilla {
    id: number;
    empresa_prestadora: number | null;
    clave: string;
    nombre_display: string;
    categoria: 'cliente' | 'proveedor' | 'contrato' | 'servicio' | 'economico' | 'custom';
    origen_dato: string | null;
    descripcion: string | null;
    valor_default: string | null;
    fecha_creacion: string;
    fecha_modificacion: string;
}

export interface ISeccionContratoGenerada {
    id: number;
    contrato: number;
    seccion_plantilla: number | null;
    titulo: string;
    contenido_renderizado: string;
    orden: number;
    fue_editado_manualmente: boolean;
    fecha_creacion: string;
    fecha_modificacion: string;
}

export interface IPreviewSeccion {
    titulo: string;
    contenido: string;
    orden: number;
    tipo: string;
}
