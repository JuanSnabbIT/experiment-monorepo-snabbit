export interface IItem {
    id: number;
    datos_categoria: null | ICategoria;
    datos_fabricante: null | IFabricante;
    imagenes: IImagen[];
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    descripcion_corta: null | string;
    perecible: boolean;
    fabricante: null | number;
    categoria: number;
}

export interface IImagen {
    id: number;
    item: number;
    imagen: string;
}

export interface ICategoria {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
}

export interface IFabricante {
    id: number;
    nombre: string;
    pagina_web: string | null;
    email_soporte: string | null;
    telefono_soporte: string | null;
}

export interface IProveedorEmpresa {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    rut: string;
    direccion: null | string;
    region: number;
    provincia: number;
    comuna: number;
    pagina_web: null | string;
    telefono: null | string;
    ejecutivo_asignado: null | string;
    email_ejecutivo: null | string;
    catalogo_web: null | string;
    recargo_dolar: number;
    empresa: number;
    tipo_moneda?: string;
}

export interface IItemEmpresa {
    id: number;
    datos_categoria: null | ICategoria;
    datos_fabricante: null | IFabricante;
    nombre: string;
    descripcion_corta: null | string;
    perecible: boolean;
    fabricante: null | number;
    categoria: number | null;
    fecha_creacion: string;
    fecha_modificacion: string;
    comentarios: string;
    empresa: number;
    proveedores_empresa: number[];
    datos_proveedores: IProveedorEmpresa[];
    imagenes: {
        id: number;
        imagen: string;
        item: number;
    }[];
    codigo_barras: string | null;
}

export interface ICampoAdicionalItem {
    id: number;
    nombre_campo: string;
    proveedor: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    valor: string;
    campo: number;
    item: number;
}
