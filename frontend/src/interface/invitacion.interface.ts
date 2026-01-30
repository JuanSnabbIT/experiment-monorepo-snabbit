export interface IInvitacionEmpresa {
    id: number;
    fecha_creacion: string;
    fecha_modificacion: string;
    email: string;
    first_name: string;
    last_name: string;
    token: string;
    activation_token: string;
    is_accepted: boolean;
    invited_at: string;
    accepted_at: null | string;
    expiration_date: string;
    is_denied: boolean;
    sucursal: number;
    is_expired: boolean;
    id_user: number | false;
}
