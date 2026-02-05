import Swal, { SweetAlertIcon, SweetAlertResult } from 'sweetalert2';

const getSweetAlertTheme = (overrides?: {
    confirmButtonColor?: string;
    cancelButtonColor?: string;
}) => {
    const isDarkTheme =
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark');

    const confirmButtonColor = overrides?.confirmButtonColor
        ? overrides.confirmButtonColor
        : isDarkTheme
          ? '#6366f1'
          : undefined;
    const cancelButtonColor = overrides?.cancelButtonColor
        ? overrides.cancelButtonColor
        : isDarkTheme
          ? '#52525b'
          : undefined;

    return {
        background: isDarkTheme ? '#18181b' : undefined,
        color: isDarkTheme ? '#e4e4e7' : undefined,
        confirmButtonColor,
        cancelButtonColor,
        inputAttributes: isDarkTheme
            ? {
                  style:
                      'background:#27272a;color:#e4e4e7;border:1px solid #3f3f46;',
              }
            : undefined,
    };
};

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
        ...getSweetAlertTheme(),
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
        ...getSweetAlertTheme({
            confirmButtonColor: confirmColor,
            cancelButtonColor: cancelColor,
        }),
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
    const theme = getSweetAlertTheme();
    const result = await Swal.fire({
        ...theme,
        title,
        text,
        icon: 'warning',
        input: 'text',
        inputPlaceholder: confirmPhrase,
        inputAttributes: {
            ...(theme.inputAttributes || {}),
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
