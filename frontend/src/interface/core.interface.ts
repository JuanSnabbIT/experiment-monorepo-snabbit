export interface IRegion {
    region_id: number
    region_nombre: string
}

export interface IProvincia {
    provincia_id: number
    provincia_nombre: string
    provincia_region: number
}

export interface IComuna {
    comuna_id: number
    comuna_nombre: string
    comuna_provincia: number
}

export interface IContentType {
    id: number
    app_label: string
    model: string
}

export interface IAcuerdoBase {
    id: number
    fecha_creacion: string
    fecha_modificacion: string
    titulo: string
    contenido: string
}