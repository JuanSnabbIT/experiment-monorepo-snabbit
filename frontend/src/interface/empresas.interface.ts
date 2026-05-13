export interface IEmpresa {
    id: number;
    sucursales: {
        id: number;
        nombre: string;
        direccion: string;
    }[];
    fecha_creacion: string;
    fecha_modificacion: string;
    nombre: string;
    sitio_web: string;
    direccion_principal: string;
    logo: string;
    firma_empresa: string;
    recargo: number;
    rut_empresa: null | string;
    telefono: null | string;
    email: null | string;
    clientes: number[];
    ppm: number;
}

export interface IRelacionEmpresa {
    id: number;
    info_prestador_servicios: IEmpresa;
    info_cliente: IEmpresa;
    fecha_creacion: string;
    fecha_modificacion: string;
    tipo_relacion: string;
    tipo_relacion_label: string;
    prestador_servicios: number;
    cliente: number;
}

export interface IUsuarioEmpresa {
    id: number;
    nombre_usuario: string;
    email_usuario: string;
    papeleta: {
        nombre_empleado: string;
        años_servicio: number;
        dias_acumulados: number;
        dias_tomados: number;
        dias_disponibles: number;
        rut: null | string;
        dias_corridos: {
            dias_totales: number;
            formato: string;
        };
    };
    estado_label: string;
    is_active: boolean;
    nombre_sucursal: string;
    fecha_creacion: string;
    fecha_modificacion: string;
    fecha_ingreso: null | string;
    fecha_contrato: null | string;
    cargo: null | string;
    estado: string;
    usuario: number;
    sucursal: number;
    grupos: number[];
    // Datos previsionales (opcionales) para contratos laborales
    afp?: string | null;
    sistema_salud?: 'fonasa' | 'isapre' | 'otro' | null;
    nombre_isapre?: string | null;
    // Datos bancarios (opcionales)
    banco?: string | null;
    tipo_cuenta_bancaria?: 'corriente' | 'vista' | 'ahorro' | 'rut' | null;
    numero_cuenta_bancaria?: string | null;
}

export interface IUltimasActividadesUsuarioEmpresa {
    tipo: string;
    fecha: string;
    descripcion: string;
}

export interface ISucursalEmpresa {
    id: number;
    nombre: string;
    direccion: string | null;
    telefono: string | null;
    email: string | null;
    region: number;
    provincia: number;
    comuna: number;
    empresa: number;
}
