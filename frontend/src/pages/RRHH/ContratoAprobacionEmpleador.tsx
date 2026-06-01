import Checkbox from '@/components/form/Checkbox';
import Icon from '@/components/icon/Icon';
import Button from '@/components/ui/Button';
import type { IContratoAprobacionPublica, IResponderAprobacionPayload } from '@/interface/rrhh.interface';
import ApiService from '@/services/ApiService';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import { getSweetAlertTheme } from '@/utils/sweetAlert';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const CAMBIOS_OPCIONES = [
    'Sueldo base',
    'Jornada laboral',
    'Cargo / funcion',
    'Fechas del contrato',
    'Funciones y responsabilidades',
    'Bonos y beneficios',
    'Otro',
];

const ContratoAprobacionEmpleador = () => {
    const { uuid } = useParams<{ uuid: string }>();

    const [datos, setDatos] = useState<IContratoAprobacionPublica | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [respondido, setRespondido] = useState(false);
    const [decisionFinal, setDecisionFinal] = useState<string | null>(null);
    const [contratoRevisado, setContratoRevisado] = useState(false);

    const fetchDatos = useCallback(async () => {
        if (!uuid) {
            setError('Enlace invalido.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const resp = await ApiService.fetchData<IContratoAprobacionPublica>({
                url: `/api/public/rrhh/contrato-aprobacion/${uuid}/`,
                method: 'get',
                isLoginRequest: true,
            });
            setDatos(resp.data);
            if (resp.data.decision !== 'pendiente') {
                setRespondido(true);
                setDecisionFinal(resp.data.decision);
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [uuid]);

    useEffect(() => {
        fetchDatos();
    }, [fetchDatos]);

    const responder = async (payload: IResponderAprobacionPayload) => {
        setSubmitting(true);
        try {
            await ApiService.fetchData({
                url: `/api/public/rrhh/contrato-aprobacion/${uuid}/responder/`,
                method: 'post',
                data: payload,
                isLoginRequest: true,
            });
            setRespondido(true);
            setDecisionFinal(payload.decision);
            // Descarga automática del contrato aprobado (sin marca de agua)
            if (payload.decision === 'aprobado' && uuid) {
                try {
                    const apiBase = (import.meta.env.VITE_API_URL as string) ?? '';
                    const resp = await fetch(
                        `${apiBase}/api/public/rrhh/contrato-aprobacion/${uuid}/pdf/?watermark=0`,
                    );
                    if (resp.ok) {
                        const blob = await resp.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `contrato_aprobado_${uuid}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                    }
                } catch {
                    // No bloquear el flujo si la descarga falla
                }
            }
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDescargarPDF = async () => {
        if (!uuid) return;

        const apiBase = (import.meta.env.VITE_API_URL as string) ?? '';
        const aprobado = datos?.decision === 'aprobado';
        const pdfUrl = aprobado
            ? `${apiBase}/api/public/rrhh/contrato-aprobacion/${uuid}/pdf/?watermark=0`
            : `${apiBase}/api/public/rrhh/contrato-aprobacion/${uuid}/pdf/`;

        const doDownload = async () => {
            try {
                const resp = await fetch(pdfUrl);
                if (!resp.ok) throw new Error('No se pudo descargar el PDF.');
                const blob = await resp.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = aprobado
                    ? `contrato_aprobado_${uuid}.pdf`
                    : `contrato_borrador_${uuid}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            } catch (err) {
                toast.error(getErrorMessage(err));
            }
        };

        if (!aprobado) {
            const swalTheme = getSweetAlertTheme();
            const result = await Swal.fire({
                ...swalTheme,
                title: 'PDF con marca de agua',
                html: `
                    <p style="font-size:14px;line-height:1.6;text-align:left;">
                        Este documento incluye la marca de agua <strong>BORRADOR</strong>
                        porque aún no has aprobado el contrato.
                    </p>
                    <p style="font-size:13px;line-height:1.5;text-align:left;margin-top:10px;color:#6b7280;">
                        La marca de agua desaparecerá automaticamente una vez que apruebes el documento.
                    </p>
                `,
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'Descargar de todas formas',
                cancelButtonText: 'Cancelar',
            });
            if (!result.isConfirmed) return;
        }

        await doDownload();
    };

    const handleAprobar = async () => {
        const initialEmail = contrato.email_trabajador ?? '';
        const emailValue = String(initialEmail).replace(/"/g, '&quot;');

        const result = await Swal.fire({
            title: '¿Aprobar contrato?',
            html: `
                <div style="font-size:14px;line-height:1.5;margin-bottom:16px;text-align:left;">
                    Confirma que has revisado el documento y apruebas el contrato.
                </div>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;text-align:left;">
                    <label style="display:flex;align-items:center;gap:10px;font-size:14px;cursor:pointer;">
                        <input id="swal2-notificar" type="checkbox" style="width:18px;height:18px;" ${initialEmail ? 'checked' : ''} />
                        <span>Notificar al trabajador por correo</span>
                    </label>
                </div>
                <div id="swal2-email-wrapper" style="display:${initialEmail ? 'block' : 'none'};text-align:left;width:100%;max-width:100%;">
                    <label for="swal2-email" style="display:block;font-size:13px;margin-bottom:8px;color:#6b7280;">Email de notificación</label>
                    <div style="display:flex;align-items:center;gap:8px;width:100%;height:40px;flex-wrap:nowrap;">
                        <input id="swal2-email" class="swal2-input" type="email" placeholder="Email del trabajador" value="${emailValue}" disabled style="flex:1;width:auto;min-width:0;height:100%;margin:0;padding:0 0.75rem;box-sizing:border-box;" />
                        <button id="swal2-email-edit-btn" type="button" class="swal2-styled" style="display:flex;align-items:center;justify-content:center;align-self:center;padding:0;min-width:40px;width:40px;height:40px;border-radius:0.625rem;color:inherit;background:#f3f4f6;border:1px solid #d1d5db;" aria-label="Editar email" title="Editar email">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                        </button>
                    </div>
                    <p style="font-size:12px;color:#6b7280;margin-top:10px;line-height:1.5;">
                        El correo se enviará a esta dirección si la notificación está activada.
                    </p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Confirmar aprobacion',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            ...getSweetAlertTheme({ confirmButtonColor: '#10b981' }),
            didOpen: () => {
                const checkbox = document.getElementById('swal2-notificar') as HTMLInputElement | null;
                const emailWrapper = document.getElementById('swal2-email-wrapper');
                const emailInput = document.getElementById('swal2-email') as HTMLInputElement | null;
                const editButton = document.getElementById('swal2-email-edit-btn');

                const editIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>';
                const saveIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 16H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v6a2 2 0 0 1-2 2z" /><path d="M17 9V5.5L12.5 1H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" /><path d="M9 17h6" /><path d="M9 13h6" /></svg>';

                const setEditing = (editing: boolean) => {
                    if (!emailInput || !editButton) return;
                    emailInput.disabled = !editing;
                    editButton.innerHTML = editing ? saveIconSvg : editIconSvg;
                    editButton.title = editing ? 'Guardar email' : 'Editar email';
                    editButton.setAttribute('aria-label', editing ? 'Guardar email' : 'Editar email');
                    if (editing) {
                        emailInput.focus();
                        emailInput.select();
                    }
                };

                if (checkbox && emailWrapper) {
                    checkbox.addEventListener('change', () => {
                        emailWrapper.style.display = checkbox.checked ? 'block' : 'none';
                        if (!checkbox.checked) {
                            setEditing(false);
                        }
                    });
                }

                if (editButton) {
                    editButton.addEventListener('click', () => {
                        const currentlyEditing = emailInput ? !emailInput.disabled : false;
                        setEditing(!currentlyEditing);
                    });
                }
            },
            preConfirm: () => {
                const checkbox = document.getElementById('swal2-notificar') as HTMLInputElement | null;
                const emailInput = document.getElementById('swal2-email') as HTMLInputElement | null;
                const shouldNotify = checkbox?.checked ?? false;
                const editedEmail = emailInput?.value.trim() ?? '';

                if (shouldNotify && !editedEmail) {
                    Swal.showValidationMessage('Debes indicar el email del trabajador para notificar.');
                    return false;
                }
                if (
                    shouldNotify &&
                    editedEmail &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editedEmail)
                ) {
                    Swal.showValidationMessage('Ingresa un email válido.');
                    return false;
                }

                return {
                    notificar_trabajador: shouldNotify,
                    email_trabajador: editedEmail,
                };
            },
        });

        if (result.isConfirmed) {
            const payload: IResponderAprobacionPayload = {
                decision: 'aprobado',
                notificar_trabajador: result.value?.notificar_trabajador ?? false,
            };
            if (result.value?.email_trabajador) {
                payload.email_trabajador = result.value.email_trabajador;
            }
            await responder(payload);
        }
    };

    const handleRechazar = async () => {
        const result = await Swal.fire({
            title: '¿Rechazar contrato?',
            input: 'textarea',
            inputLabel: 'Motivo del rechazo',
            inputPlaceholder: 'Indica el motivo del rechazo...',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Rechazar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            ...getSweetAlertTheme({ confirmButtonColor: '#ef4444' }),
            inputValidator: (value: string) => {
                if (!value?.trim()) return 'El motivo del rechazo es requerido.';
                return null;
            },
        });
        if (result.isConfirmed) {
            await responder({ decision: 'rechazado', motivo_rechazo: (result.value as string).trim() });
        }
    };

    const handleCambios = async () => {
        const isDark = document.documentElement.classList.contains('dark');
        const inputSt = isDark
            ? 'background:#27272a;color:#e4e4e7;border:1px solid #3f3f46;'
            : 'border:1px solid #e5e7eb;';
        const checkboxHtml = CAMBIOS_OPCIONES.map(
            (op, i) =>
                `<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;text-align:left;font-size:13px;">
                    <input type="checkbox" id="cambio-${i}" style="width:15px;height:15px;flex-shrink:0;accent-color:#f59e0b;" />
                    <span>${op}</span>
                </label>`,
        ).join('');
        const result = await Swal.fire({
            title: 'Solicitar cambios',
            html: `<div style="text-align:left;margin-bottom:10px;font-size:13px;">Selecciona los aspectos que requieren modificacion:</div><div style="margin-bottom:10px;">${checkboxHtml}</div><textarea id="cambio-otro" placeholder="Observaciones adicionales (opcional)..." rows="3" style="width:100%;padding:8px;border-radius:6px;resize:vertical;font-size:13px;${inputSt}"></textarea>`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Enviar solicitud',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            ...getSweetAlertTheme({ confirmButtonColor: '#f59e0b' }),
            preConfirm: () => {
                const seleccionados = CAMBIOS_OPCIONES.filter(
                    (_, i) =>
                        (document.getElementById(`cambio-${i}`) as HTMLInputElement)?.checked,
                );
                const otro = (
                    (document.getElementById('cambio-otro') as HTMLTextAreaElement)?.value ?? ''
                ).trim();
                const lista = [...seleccionados];
                if (otro) lista.push(otro);
                if (lista.length === 0) {
                    Swal.showValidationMessage(
                        'Selecciona al menos un cambio o escribe observaciones.',
                    );
                    return false;
                }
                return lista;
            },
        });
        if (result.isConfirmed && result.value) {
            await responder({
                decision: 'cambios_solicitados',
                cambios_solicitados: result.value as string[],
            });
        }
    };

    // --- Loading ---
    if (loading) {
        return (
            <div className='flex min-h-screen items-center justify-center bg-gray-100 dark:bg-zinc-900'>
                <div className='text-center'>
                    <div className='mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent' />
                    <p className='text-gray-600 dark:text-zinc-400'>Cargando contrato...</p>
                </div>
            </div>
        );
    }

    // --- Error ---
    if (error) {
        return (
            <div className='flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-zinc-900'>
                <div className='w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg dark:bg-zinc-800'>
                    <Icon icon='HeroExclamationTriangle' className='mx-auto mb-4 text-5xl text-red-500' />
                    <h2 className='mb-2 text-xl font-semibold text-red-600'>Enlace no disponible</h2>
                    <p className='text-sm text-gray-500 dark:text-zinc-400'>{error}</p>
                </div>
            </div>
        );
    }

    // Safety guard (datos always set when loading=false and error=null)
    if (!datos) return null;

    const { contrato } = datos;

    const RESPONDIDO_CONFIG: Record<string, { bg: string; icon: string; color: string; mensaje: string }> = {
        aprobado: {
            bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
            icon: 'HeroCheckCircle',
            color: 'text-emerald-600 dark:text-emerald-400',
            mensaje: 'Has aprobado el contrato laboral. El equipo de RRHH ha sido notificado.',
        },
        rechazado: {
            bg: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
            icon: 'HeroXCircle',
            color: 'text-red-600 dark:text-red-400',
            mensaje: 'Has rechazado el contrato laboral. El equipo de RRHH ha sido notificado.',
        },
        cambios_solicitados: {
            bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
            icon: 'HeroExclamationCircle',
            color: 'text-amber-600 dark:text-amber-400',
            mensaje:
                'Tu solicitud de cambios fue enviada. El equipo de RRHH revisará tus comentarios.',
        },
    };
    const respondidoCfg = respondido
        ? (RESPONDIDO_CONFIG[decisionFinal ?? ''] ?? {
              bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
              icon: 'HeroDocumentCheck',
              color: 'text-blue-600 dark:text-blue-400',
              mensaje: 'Tu respuesta ha sido registrada.',
          })
        : null;

    return (
        <div className='min-h-screen bg-gray-100 py-10 print:bg-white print:py-0 dark:bg-zinc-900'>
            <div className='mx-auto max-w-6xl px-4 lg:px-8'>
                <div className='overflow-hidden rounded-xl bg-white shadow-lg print:rounded-none print:shadow-none dark:bg-zinc-800'>
                    <div className='space-y-5 p-6 sm:p-8'>
                        {/* Membrete */}
                        <div className='flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between dark:border-zinc-700'>
                            <div>
                                <span className='inline-block rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'>
                                    Contrato Laboral
                                </span>
                                <p className='mt-1 text-xl font-bold text-gray-900 dark:text-zinc-100'>
                                    {contrato.empresa_nombre ?? 'Empleador'}
                                </p>
                            </div>
                            <div className='flex flex-col items-start gap-1 text-sm text-gray-500 sm:items-end dark:text-zinc-400'>
                                <p className='font-semibold text-gray-800 dark:text-zinc-200'>
                                    Revisión de Contrato
                                </p>
                                <p>
                                    Contrato N°{' '}
                                    <span className='font-medium text-gray-700 dark:text-zinc-300'>
                                        {contrato.id}
                                    </span>
                                </p>
                                <p>
                                    Enviado:{' '}
                                    <span className='font-medium text-gray-700 dark:text-zinc-300'>
                                        {new Date(datos.fecha_envio).toLocaleDateString('es-CL')}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Datos del contrato — grid 2 columnas en desktop */}
                        <div className='overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-700'>
                            <div className='border-b border-gray-100 bg-gray-50 px-5 py-3 dark:border-zinc-700 dark:bg-zinc-900/50'>
                                <h2 className='text-sm font-semibold text-gray-700 dark:text-zinc-300'>
                                    Información del Contrato
                                </h2>
                            </div>
                            <div className='grid grid-cols-1 divide-y divide-gray-100 dark:divide-zinc-700 lg:grid-cols-2 lg:divide-x lg:divide-y-0'>
                                {/* Columna izquierda: Trabajador */}
                                <dl className='divide-y divide-gray-100 text-sm dark:divide-zinc-700'>
                                    <div className='grid grid-cols-[140px,1fr] gap-3 px-5 py-3'>
                                        <dt className='text-gray-500 dark:text-zinc-400'>Trabajador</dt>
                                        <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                            {contrato.nombre_trabajador ?? '—'}
                                        </dd>
                                    </div>
                                    {contrato.email_trabajador && (
                                        <div className='grid grid-cols-[140px,1fr] gap-3 px-5 py-3'>
                                            <dt className='text-gray-500 dark:text-zinc-400'>Email</dt>
                                            <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                                {contrato.email_trabajador}
                                            </dd>
                                        </div>
                                    )}
                                    <div className='grid grid-cols-[140px,1fr] gap-3 px-5 py-3'>
                                        <dt className='text-gray-500 dark:text-zinc-400'>Cargo</dt>
                                        <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                            {contrato.cargo}
                                        </dd>
                                    </div>
                                    <div className='grid grid-cols-[140px,1fr] gap-3 px-5 py-3'>
                                        <dt className='text-gray-500 dark:text-zinc-400'>Tipo de contrato</dt>
                                        <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                            {contrato.tipo_contrato_label ?? contrato.tipo_contrato}
                                        </dd>
                                    </div>
                                </dl>
                                {/* Columna derecha: Condiciones laborales */}
                                <dl className='divide-y divide-gray-100 text-sm dark:divide-zinc-700'>
                                    <div className='grid grid-cols-[140px,1fr] gap-3 px-5 py-3'>
                                        <dt className='text-gray-500 dark:text-zinc-400'>Jornada</dt>
                                        <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                            {contrato.jornada_label ?? contrato.jornada}
                                        </dd>
                                    </div>
                                    <div className='grid grid-cols-[140px,1fr] gap-3 px-5 py-3'>
                                        <dt className='text-gray-500 dark:text-zinc-400'>Fecha de inicio</dt>
                                        <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                            {contrato.fecha_inicio}
                                        </dd>
                                    </div>
                                    {contrato.fecha_termino && (
                                        <div className='grid grid-cols-[140px,1fr] gap-3 px-5 py-3'>
                                            <dt className='text-gray-500 dark:text-zinc-400'>
                                                Fecha de término
                                            </dt>
                                            <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                                {contrato.fecha_termino}
                                            </dd>
                                        </div>
                                    )}
                                    <div className='grid grid-cols-[140px,1fr] gap-3 px-5 py-3'>
                                        <dt className='text-gray-500 dark:text-zinc-400'>Sueldo base</dt>
                                        <dd className='font-medium text-gray-900 dark:text-zinc-100'>
                                            {formatCurrency(contrato.sueldo_base, contrato.moneda)}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        {/* Estado respondido — inline */}
                        {respondidoCfg && (
                            <div
                                className={`flex items-start gap-3 rounded-lg border p-4 ${respondidoCfg.bg}`}>
                                <Icon
                                    icon={respondidoCfg.icon}
                                    className={`mt-0.5 flex-shrink-0 text-2xl ${respondidoCfg.color}`}
                                />
                                <div>
                                    <p className={`font-semibold ${respondidoCfg.color}`}>
                                        Respuesta registrada
                                    </p>
                                    <p className='mt-1 text-sm text-gray-600 dark:text-zinc-300'>
                                        {respondidoCfg.mensaje}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* PDF */}
                        <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 print:hidden dark:border-zinc-700 dark:bg-zinc-800/50'>
                            <div className='flex flex-wrap items-center justify-between gap-3'>
                                <p className='text-sm text-gray-600 dark:text-zinc-300'>
                                    Revisa el documento antes de tomar una decisión.
                                </p>
                                <Button
                                    variant='outline'
                                    color='blue'
                                    icon='HeroDocumentArrowDown'
                                    onClick={handleDescargarPDF}>
                                    {datos?.decision === 'aprobado'
                                        ? 'Ver PDF'
                                        : 'Ver PDF'}
                                </Button>
                            </div>
                        </div>

                        {/* Acciones — solo cuando pendiente */}
                        {!respondido && (
                            <div className='rounded-lg border border-blue-200 bg-blue-50 p-5 print:hidden dark:border-blue-900 dark:bg-blue-950/30'>
                                <label className='mb-4 flex cursor-pointer items-center gap-3 rounded-lg border border-blue-300 bg-white p-3 dark:border-blue-700 dark:bg-zinc-800'>
                                    <Checkbox
                                        id='contrato-revisado'
                                        checked={contratoRevisado}
                                        onChange={(e) => setContratoRevisado(e.target.checked)}
                                    />
                                    <span className='text-sm text-gray-700 dark:text-zinc-200'>
                                        He revisado el contrato antes de responder.
                                    </span>
                                </label>
                                <div
                                    className={!contratoRevisado ? 'pointer-events-none opacity-50' : ''}>
                                    <div className='flex flex-col gap-3 sm:flex-row'>
                                        <Button
                                            variant='solid'
                                            color='emerald'
                                            icon='HeroCheckCircle'
                                            isDisable={submitting}
                                            onClick={handleAprobar}
                                            className='flex-1'>
                                            Aprobar contrato
                                        </Button>
                                        <Button
                                            variant='solid'
                                            color='amber'
                                            icon='HeroPencilSquare'
                                            isDisable={submitting}
                                            onClick={handleCambios}
                                            className='flex-1'>
                                            Solicitar cambios
                                        </Button>
                                        <Button
                                            variant='solid'
                                            color='red'
                                            icon='HeroXCircle'
                                            isDisable={submitting}
                                            onClick={handleRechazar}
                                            className='flex-1'>
                                            Rechazar
                                        </Button>
                                    </div>
                                    <p className='mt-4 text-xs text-gray-400 dark:text-zinc-500'>
                                        Fecha de envío:{' '}
                                        {new Date(datos.fecha_envio).toLocaleString('es-CL')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContratoAprobacionEmpleador;
