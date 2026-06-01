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

export interface ICargaFamiliar {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    rut: string;
    fecha_nacimiento: string | null;
    parentesco: 'hijo_a' | 'conyuge' | 'conviviente_civil' | 'padre' | 'madre' | 'otro';
    parentesco_label: string;
    is_activo: boolean;
}

export interface IContratoLaboralHistorial {
    id: number;
    tipo_contrato_label: string;
    estado: string;
    estado_label: string;
    fecha_inicio: string;
    fecha_termino: string | null;
    archivo_pdf: string | null;
}

export interface IContratoLaboralVigente {
    id: number;
    tipo_contrato: string;
    tipo_contrato_label: string;
    jornada: string;
    jornada_label: string;
    cargo: string | null;
    lugar_trabajo: string | null;
    sueldo_base: string;
    sueldo_liquido: string | null;
    moneda: 'CLP' | 'UF' | 'USD';
    gratificacion_legal: boolean;
    bono_movilizacion: string;
    bono_colacion: string;
    fecha_inicio: string;
    fecha_termino: string | null;
    estado: string;
    estado_label: string;
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
    // Datos personales desde cuentas.User
    first_name?: string | null;
    second_name?: string | null;
    last_name?: string | null;
    second_last_name?: string | null;
    celular?: string | null;
    genero?: string | null;
    genero_label?: string | null;
    fecha_nacimiento?: string | null;
    estado_civil?: string | null;
    estado_civil_label?: string | null;
    nacionalidad?: string | null;
    direccion?: string | null;
    region?: number | null;
    provincia?: number | null;
    comuna?: number | null;
    // Nombres resueltos desde bd_ciudades (evitar mostrar IDs crudos en UI)
    region_nombre?: string | null;
    provincia_nombre?: string | null;
    comuna_nombre?: string | null;
    foto_perfil?: string | null;
    // Datos previsionales
    afp?: string | null;
    sistema_salud?: 'fonasa' | 'isapre' | 'otro' | null;
    sistema_salud_label?: string | null;
    nombre_isapre?: string | null;
    // Datos bancarios para pago de remuneraciones
    banco?: string | null;
    tipo_cuenta_bancaria?: 'corriente' | 'vista' | 'ahorro' | 'rut' | null;
    tipo_cuenta_bancaria_label?: string | null;
    numero_cuenta_bancaria?: string | null;
    // Datos de educacion desde cuentas.User
    nivel_estudios?: string | null;
    nivel_estudios_label?: string | null;
    titulo_especialidad?: string | null;
    institucion_educacional?: string | null;
    // Cargas familiares
    cargas_familiares?: ICargaFamiliar[];
    // Historial de contratos laborales RRHH
    contratos_laborales_historial?: IContratoLaboralHistorial[];
    // Contrato laboral RRHH vigente
    contrato_laboral_vigente?: IContratoLaboralVigente | null;
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
