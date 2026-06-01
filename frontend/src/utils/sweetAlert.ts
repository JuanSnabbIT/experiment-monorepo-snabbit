import Swal, { SweetAlertIcon, SweetAlertResult } from 'sweetalert2';

export const getSweetAlertTheme = (overrides?: {
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

type BlockerItem = {
    mensaje: string;
    detalle?: string[];
};

export const showBlockersAlert = async (bloqueadores: BlockerItem[]): Promise<void> => {
    const theme = getSweetAlertTheme();
    const isDark =
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark');
    const borderColor = isDark ? '#7f1d1d' : '#fca5a5';
    const bgColor = isDark ? 'rgba(127,29,29,0.2)' : 'rgba(254,226,226,0.4)';
    const textColor = isDark ? '#fca5a5' : '#b91c1c';

    const htmlContent = bloqueadores
        .map((b) => {
            const detalleHtml = b.detalle?.length
                ? `<ul style="margin-top:4px;padding-left:16px;font-size:12px;opacity:0.85;">${b.detalle.map((d) => `<li>${d}</li>`).join('')}</ul>`
                : '';
            return `<div style="margin-bottom:8px;padding:8px 10px;border-radius:6px;border:1px solid ${borderColor};background:${bgColor};text-align:left;font-size:13px;color:${textColor};">&#x2715; ${b.mensaje}${detalleHtml}</div>`;
        })
        .join('');

    await Swal.fire({
        title: 'Hay elementos pendientes',
        html: htmlContent,
        icon: 'error',
        confirmButtonText: 'Entendido',
        ...theme,
    });
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
