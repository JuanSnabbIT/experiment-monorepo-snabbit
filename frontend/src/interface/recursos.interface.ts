export interface IEquipo {
    id: number;
    tipo_equipo_label: string;
    marca_label: string;
    tipo_procesador_label: string;
    generacion_procesador_label: string;
    ram_label: string;
    sistema_operativo_label: string;
    condicion_equipo_label: string;
    datos_almacenamiento: IAlmacenamientoEquipo[];
    datos_monitor: IMonitorEquipo[];
    datos_software: ISoftwareInstalado[];
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre_equipo: null | string;
    contraseña_administrador: null | string;
    tipo_equipo: string;
    marca: string;
    modelo: string;
    numero_serie: string;
    id_procesador: null | string;
    tipo_procesador: string;
    generacion_procesador: string;
    ram: string;
    sistema_operativo: string;
    tipo_tarjeta_grafica: string;
    tipo_tarjeta_grafica_label: string;
    nombre_tarjeta_grafica: null | string;
    marca_tarjeta_grafica: string;
    marca_tarjeta_grafica_label: string;
    fecha_compra: null | string;
    fecha_caducidad_garantia: null | string;
    condicion_equipo: string;
    estado: boolean;
    cliente: number | null;
    registrado_por: number;
    software_instalado: number[];
    nombre_usuario_asignado: string;
}

export interface ITareaOtV3Origen {
    id: number;
    titulo: string;
    orden_id: number;
    tipo_tarea: string;
}

export interface IItemGuiaOrigen {
    id: number;
    numero_serie: string | null;
    item_id: number | null;
}

export interface IUsuarioEquipo {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    fecha_asignacion: string;
    fecha_devolucion: null | string;
    observaciones: string;
    estado: boolean;
    equipo: number;
    usuario: number;
    nombre_usuario: string;
    datos_equipo: IEquipo;
    foto_usuario: string | null;
    tarea_otv3?: ITareaOtV3Origen | null;
    item_guia_origen?: IItemGuiaOrigen | null;
}

export interface IDesvincularEquipoRequest {
    bodega_destino_id: number;
    motivo?: string;
}

export interface IDesvincularEquipoResponse {
    detail: string;
    usuario_equipo: IUsuarioEquipo;
    ingreso_bodega: {
        bodega_id: number;
        stock_item_id: number;
        item_id: number;
        serie: string;
        autocreado: boolean;
        movimiento_stock_id: number | null;
        cantidad_ingresada: number;
    };
}

export interface ISoftware {
    id: number;
    nombre: string;
}

export interface ISoftwareDeEmpresa {
    id: number;
    software: number;
    empresa: number;
    activo: boolean;
    nombre_empresa: string;
}

export interface IAlmacenamientoEquipo {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    almacenamiento: string;
    almacenamiento_label: string;
    fecha_instalacion: string | null;
    adicional: boolean;
    activo: boolean;
    observaciones: string;
    equipo: number;
}

export interface ISoftwareInstalado {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    software_id: number;
    version: string | null;
    nombre_software: string;
    clave: string | null;
    observaciones: string;
    content_type: number;
    equipo: number;
}

export interface IMonitorEquipo {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    modelo: string | null;
    numero_serie: string | null;
    accesorios: string;
    observaciones: string;
    equipo: number;
}

export interface IFotoEquipo {
    id: number;
    nombre_usuario: string;
    fecha_creacion: string;
    fecha_modificacion: string;
    imagen: string;
    descripcion: string;
    fecha_tomada: string;
    usuario_equipo: number;
}
