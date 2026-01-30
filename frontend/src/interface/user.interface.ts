import { IPreferenciasDashboard } from './dashboard.interface';

export interface IUserMe {
    email: string;
    first_name: string;
    second_name: null | string;
    last_name: string;
    second_last_name: null | string;
    rut: null | string;
    celular: null | string;
    genero: string;
    fecha_nacimiento: null | string;
    is_staff: boolean;
    pk: number;
    image: null | string;
    estado_civil: null | string;
    nacionalidad: null | string;
    fecha_ingreso: null | string;
    fecha_contrato: null | string;
    fono_fijo: null | string;
    cargo: null | string;
    direccion: null | string;
    region: number;
    provincia: number;
    comuna: number;
}

export interface IGruposUsuarios {
    grupos: string[];
}

export interface IPersonalizacionUsuario {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    tema: string;
    font_size: number;
    usuario: number;
    sucursal_principal: null | number;
    empresa: number | null;
    dashboard_preferences: IPreferenciasDashboard;
}

export interface IUser {
    email: string;
    first_name: string;
    second_name: null | string;
    last_name: string;
    second_last_name: null | string;
    rut: string;
    celular: null | string;
    genero: string;
    fecha_nacimiento: null | string;
    is_staff: boolean;
    pk: number;
    image: null | string;
    estado_civil: null | string;
    nacionalidad: null | string;
    direccion: string;
    region: number;
    provincia: number;
    comuna: number;
    is_active: boolean;
}
