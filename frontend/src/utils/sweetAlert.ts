import Swal, { SweetAlertIcon, SweetAlertResult } from 'sweetalert2';

type BaseAlertOptions = {
    title: string;
    text: string;
    confirmText?: string;
    icon?: SweetAlertIcon;
};

type ConfirmAlertOptions = BaseAlertOptions & {
    cancelText?: string;
    confirmColor?: string;
    cancelColor?: string;
};

type ConfirmCriticalOptions = {
    title: string;
    text: string;
    confirmText?: string;
    cancelText?: string;
    confirmPhrase?: string;
};

export const showAlert = async ({
    title,
    text,
    confirmText = 'OK',
    icon = 'info',
}: BaseAlertOptions): Promise<SweetAlertResult> =>
    Swal.fire({
        title,
        text,
        icon,
        confirmButtonText: confirmText,
    });

export const confirmAlert = async ({
    title,
    text,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    icon = 'warning',
    confirmColor,
    cancelColor,
}: ConfirmAlertOptions): Promise<boolean> => {
    const result = await Swal.fire({
        title,
        text,
        icon,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        confirmButtonColor: confirmColor,
        cancelButtonColor: cancelColor,
        reverseButtons: true,
    });

    return result.isConfirmed;
};

export const confirmCritical = async ({
    title,
    text,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    confirmPhrase = 'CONFIRMAR',
}: ConfirmCriticalOptions): Promise<boolean> => {
    const result = await Swal.fire({
        title,
        text,
        icon: 'warning',
        input: 'text',
        inputPlaceholder: confirmPhrase,
        inputAttributes: {
            autocapitalize: 'off',
        },
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: true,
        inputValidator: (value: string) => {
            if ((value || '').trim() !== confirmPhrase) {
                return `Escriba ${confirmPhrase} para continuar`;
            }
            return undefined;
        },
    });

    return result.isConfirmed;
};
