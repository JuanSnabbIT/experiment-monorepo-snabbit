import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import RadioCard from '@/components/form/RadioCard';
import SelectReact, { TSelectGroups, TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { useContratoWizard } from '@/hooks/useContratoWizard';
import { IRelacionEmpresa } from '@/interface/empresas.interface';
import { ICrearContratoConTrabajadorPayload } from '@/interface/rrhh.interface';
import { useAppSelector } from '@/store';
import { useGetPlantillasContratoQuery } from '@/store/slices/contratos/plantillaContratoApi';
import { useGetUsuariosTodoElClienteQuery } from '@/store/slices/empresa/empresaApi';
import { useGetAfpCatalogoQuery } from '@/store/slices/rrhh/catalogosRrhhApi';
import { useGetGruposTurnoQuery } from '@/store/slices/rrhh/grupoTurnoApi';
import {
    useCrearContratoConTrabajadorMutation,
    useGenerarPdfContratoTrabajadorMutation,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { IContratoTrabajador } from '@/interface/rrhh.interface';
import { getErrorMessage } from '@/utils/errorHandlers';
import { validarRut } from '@/utils/rut.util';
import classNames from 'classnames';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import StepJornada from '../components/trabajador/StepJornada';
import StepPrevisionBanco from '../components/trabajador/StepPrevisionBanco';
import StepRemuneraciones from '../components/trabajador/StepRemuneraciones';
import StepTerminosLaborales from '../components/trabajador/StepTerminosLaborales';
import StepTrabajador from '../components/trabajador/StepTrabajador';
import { IFormValuesContratoTrabajador } from '../components/trabajador/types';

interface Props {
    detalleCliente?: IRelacionEmpresa;
    externalIsOpen?: boolean;
    onExternalClose?: () => void;
    contratoId?: number | null;
    usuarioEmpresaInicial?: { id: number; nombre: string; sucursalId?: number };
}

type TStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const STEP_LABELS: Record<TStep, string> = {
    1: 'Básicos',
    2: 'Trabajador',
    3: 'Contrato',
    4: 'Jornada',
    5: 'Previsión',
    6: 'Remun.',
    7: 'Revisión',
    8: 'PDF listo',
};

// Campos a validar (y marcar como touched) al intentar avanzar de cada step.
const STEP_FIELDS: Record<TStep, (keyof IFormValuesContratoTrabajador)[]> = {
    1: ['referencia_interna'],
    2: [
        'trab_modo',
        'trab_usuario_empresa_id',
        'trab_first_name',
        'trab_last_name',
        'trab_email',
        'trab_sucursal_id',
        'trab_rut',
        'trab_nacionalidad',
        'trab_fecha_nacimiento',
        'trab_direccion',
    ],
    3: ['tipo_contrato', 'fecha_inicio', 'cargo', 'causal_reemplazo', 'trab_trabajador_reemplazado_id'],
    4: ['jornada', 'hora_inicio', 'hora_fin', 'grupo_turno_id'],
    5: [
        'sistema_salud',
        'nombre_isapre',
        'sistema_salud_otro',
        'banco',
        'tipo_cuenta_bancaria',
        'numero_cuenta_bancaria',
    ],
    6: ['sueldo', 'tipo_gratificacion', 'bono_colacion', 'bono_movilizacion'],
    7: [],
    8: [],
};

const validationSchema = Yup.object({
    referencia_interna: Yup.string().required('Requerido'),
    trab_modo: Yup.string().oneOf(['existente', 'nuevo']).required(),
    trab_usuario_empresa_id: Yup.mixed().when('trab_modo', {
        is: 'existente',
        then: (s) => s.required('Selecciona un trabajador'),
        otherwise: (s) => s.notRequired(),
    }),
    trab_email: Yup.string().when('trab_modo', {
        is: 'nuevo',
        then: (s) => s.email('Email invalido').required('Requerido'),
        otherwise: (s) => s.notRequired(),
    }),
    trab_first_name: Yup.string().when('trab_modo', {
        is: 'nuevo',
        then: (s) => s.required('Requerido'),
        otherwise: (s) => s.notRequired(),
    }),
    trab_last_name: Yup.string().when('trab_modo', {
        is: 'nuevo',
        then: (s) => s.required('Requerido'),
        otherwise: (s) => s.notRequired(),
    }),
    trab_rut: Yup.string().when('trab_modo', {
        is: 'nuevo',
        then: (s) =>
            s.required('Requerido').test('rut-valido', 'RUT invalido', (value) => {
                if (!value || !value.trim()) return false;
                return validarRut(value);
            }),
        otherwise: (s) =>
            s.notRequired().test('rut-valido', 'RUT invalido', (value) => {
                if (!value || !value.trim()) return true;
                return validarRut(value);
            }),
    }),
    trab_nacionalidad: Yup.string().when('trab_modo', {
        is: 'nuevo',
        then: (s) => s.required('Requerido'),
        otherwise: (s) => s.notRequired(),
    }),
    trab_fecha_nacimiento: Yup.string().when('trab_modo', {
        is: 'nuevo',
        then: (s) => s.required('Requerido'),
        otherwise: (s) => s.notRequired(),
    }),
    trab_direccion: Yup.string().when('trab_modo', {
        is: 'nuevo',
        then: (s) => s.required('Requerido'),
        otherwise: (s) => s.notRequired(),
    }),
    trab_sucursal_id: Yup.mixed().required('Selecciona una sucursal'),
    tipo_contrato: Yup.string().required('Requerido'),
    fecha_inicio: Yup.string().required('Requerido'),
    fecha_termino: Yup.string().when('tipo_contrato', {
        is: 'plazo_fijo',
        then: (s) => s.required('Requerido para plazo fijo'),
        otherwise: (s) => s.notRequired(),
    }),
    cargo: Yup.string().required('Requerido'),
    jornada: Yup.string().required('Requerido'),
    grupo_turno_id: Yup.mixed().when('jornada', {
        is: 'turnos',
        then: (s) => s.required('Selecciona un grupo de turnos'),
        otherwise: (s) => s.notRequired().nullable(),
    }),
    horas_semanales: Yup.mixed().notRequired(),
    hora_inicio: Yup.string().when('jornada', {
        is: (v: string) => v !== 'turnos',
        then: (s) => s.required('Requerido'),
        otherwise: (s) => s.notRequired(),
    }),
    hora_fin: Yup.string().when('jornada', {
        is: (v: string) => v !== 'turnos',
        then: (s) => s.required('Requerido'),
        otherwise: (s) => s.notRequired(),
    }),
    sueldo: Yup.number()
        .typeError('Debe ser un numero')
        .required('Requerido')
        .min(1, 'Debe ser mayor a 0'),
    plantilla_contrato_id: Yup.mixed(),
    causal_reemplazo: Yup.string().when('tipo_contrato', {
        is: 'reemplazo',
        then: (s) => s.required('Requerido para contrato de reemplazo'),
        otherwise: (s) => s.notRequired(),
    }),
    trab_trabajador_reemplazado_id: Yup.mixed().when('tipo_contrato', {
        is: 'reemplazo',
        then: (s) => s.required('Selecciona trabajador reemplazado'),
        otherwise: (s) => s.notRequired(),
    }),
    nombre_isapre: Yup.string().when('sistema_salud', {
        is: 'isapre',
        then: (s) => s.required('Requerido para sistema Isapre'),
        otherwise: (s) => s.notRequired(),
    }),
    sistema_salud_otro: Yup.string().when('sistema_salud', {
        is: 'otro',
        then: (s) => s.required('Especifica el sistema de salud'),
        otherwise: (s) => s.notRequired(),
    }),
    banco: Yup.string().test(
        'banco-completo',
        'Requerido si completas datos bancarios',
        function validateBanco(value) {
            const { tipo_cuenta_bancaria, numero_cuenta_bancaria } =
                this.parent as IFormValuesContratoTrabajador;
            const tieneOtros = Boolean(tipo_cuenta_bancaria || numero_cuenta_bancaria);
            if (!tieneOtros) return true;
            return Boolean(value && String(value).trim());
        },
    ),
    tipo_cuenta_bancaria: Yup.string().test(
        'tipo-cuenta-completo',
        'Requerido si completas datos bancarios',
        function validateTipoCuenta(value) {
            const { banco, numero_cuenta_bancaria } = this.parent as IFormValuesContratoTrabajador;
            const tieneOtros = Boolean(banco || numero_cuenta_bancaria);
            if (!tieneOtros) return true;
            return Boolean(value && String(value).trim());
        },
    ),
    numero_cuenta_bancaria: Yup.string().test(
        'numero-cuenta-completo',
        'Requerido si completas datos bancarios',
        function validateNumeroCuenta(value) {
            const { banco, tipo_cuenta_bancaria } = this.parent as IFormValuesContratoTrabajador;
            const tieneOtros = Boolean(banco || tipo_cuenta_bancaria);
            if (!tieneOtros) return true;
            return Boolean(value && String(value).trim());
        },
    ),
    tipo_gratificacion: Yup.string().when('gratificacion_activa', {
        is: true,
        then: (s) => s.required('Selecciona el tipo de gratificacion'),
        otherwise: (s) => s.notRequired(),
    }),
    bono_colacion: Yup.number().when('bono_colacion_activo', {
        is: true,
        then: (s) => s.typeError('Debe ser un numero').required('Requerido').min(1, 'Debe ser mayor a 0'),
        otherwise: (s) => s.notRequired(),
    }),
    bono_movilizacion: Yup.number().when('bono_movilizacion_activo', {
        is: true,
        then: (s) => s.typeError('Debe ser un numero').required('Requerido').min(1, 'Debe ser mayor a 0'),
        otherwise: (s) => s.notRequired(),
    }),
});

const initialValues: IFormValuesContratoTrabajador = {
    referencia_interna: '',
    observaciones: '',
    trab_modo: 'existente',
    trab_empresa_cliente_id: '',
    trab_usuario_empresa_id: '',
    trab_first_name: '',
    trab_last_name: '',
    trab_email: '',
    trab_rut: '',
    trab_sucursal_id: '',
    trab_enviar_invitacion: true,
    trab_nacionalidad: '',
    trab_fecha_nacimiento: '',
    trab_direccion: '',
    trab_estado_civil: '',
    trab_profesion_u_oficio: '',
    enviar_al_empleador: true,
    tipo_contrato: '',
    fecha_inicio: '',
    fecha_termino: '',
    cantidad_meses: '',
    cargo: '',
    funciones: '',
    jornada: 'completa',
    horas_semanales: '',
    dias_semana: [],
    turnos_rotativo: [],
    grupo_turno_id: null,
    horario_detalle: '',
    hora_inicio: '09:00',
    hora_fin: '18:00',
    tiempo_colacion: 30,
    lugar_trabajo: '',
    lugar_celebracion_contrato: '',
    fecha_firma: '',
    trab_trabajador_reemplazado_id: '',
    causal_reemplazo: '',
    sueldo: '',
    tipo_sueldo: 'base' as const,
    moneda: 'CLP',
    tipo_gratificacion: '',
    gratificacion_activa: false,
    descuentos_activos: false,
    porcentaje_descuentos: '20',
    bono_movilizacion: '',
    bono_movilizacion_activo: false,
    bono_colacion: '',
    bono_colacion_activo: false,
    afp: null,
    descuento_prevision_activo: false,
    sistema_salud: '',
    descuento_salud_activo: false,
    nombre_isapre: '',
    sistema_salud_otro: '',
    banco: '',
    tipo_cuenta_bancaria: '',
    numero_cuenta_bancaria: '',
    plantilla_contrato_id: '',
    archivo_pdf: null,
};

const TIPO_CONTRATO_CARDS = [
    { value: 'indefinido', label: 'Indefinido', desc: 'Sin fecha de término pactada.' },
    { value: 'plazo_fijo', label: 'Plazo fijo', desc: 'Fecha de término determinada.' },
    { value: 'reemplazo', label: 'Reemplazo', desc: 'Cubre ausencia temporal.' },
] as const;

const Stepper = ({ step }: { step: TStep }) => (
    <div className='mb-6 flex items-center justify-center'>
        {([1, 2, 3, 4, 5, 6, 7] as TStep[]).map((k, i) => {
            const esActual = k === step;
            const esCompletado = k < step;
            return (
                <div key={k} className='flex items-center'>
                    {i > 0 && (
                        <div
                            className={classNames(
                                'h-px w-8',
                                esCompletado ? 'bg-blue-500' : 'bg-zinc-200 dark:bg-zinc-700',
                            )}
                        />
                    )}
                    <div className='flex flex-col items-center gap-1'>
                        <div
                            className={classNames(
                                'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                                {
                                    'border-blue-500 bg-blue-500 text-white': esActual,
                                    'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300':
                                        esCompletado,
                                    'border-zinc-300 bg-white text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-500':
                                        !esActual && !esCompletado,
                                },
                            )}>
                            {esCompletado ? (
                                <svg
                                    className='h-4 w-4'
                                    fill='none'
                                    viewBox='0 0 24 24'
                                    stroke='currentColor'>
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2.5}
                                        d='M5 13l4 4L19 7'
                                    />
                                </svg>
                            ) : (
                                k
                            )}
                        </div>
                        <span
                            className={classNames('text-[10px] font-medium leading-none', {
                                'text-blue-600 dark:text-blue-400': esActual,
                                'text-blue-500': esCompletado,
                                'text-zinc-400 dark:text-zinc-500': !esActual && !esCompletado,
                            })}>
                            {STEP_LABELS[k]}
                        </span>
                    </div>
                </div>
            );
        })}
    </div>
);

const CrearContratoTrabajadorWizard = ({
    detalleCliente: detalleClienteProp,
    externalIsOpen,
    onExternalClose,
    contratoId,
    usuarioEmpresaInicial,
}: Props) => {
    const navigate = useNavigate();
    const { detalleCliente: detalleClienteStore } = useAppSelector(
        (state) => state.empresa,
    );
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const detalleCliente = detalleClienteProp ?? detalleClienteStore;

    // isOpen se calcula antes de las queries para usarlo como skip condition.
    const isControlledExternally = externalIsOpen !== undefined;
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = isControlledExternally ? externalIsOpen : internalIsOpen;

    // Las plantillas y AFP solo se necesitan cuando el modal está abierto.
    // Sin skip, estas queries disparan al montar el componente causando
    // un cascade de re-renders si el usuario abre el modal antes de que
    // el caché esté caliente (freeze en primera visita).
    const { data: todasLasPlantillas = [] } = useGetPlantillasContratoQuery(undefined, { skip: !isOpen });
    const { data: afpList = [] } = useGetAfpCatalogoQuery(undefined, { skip: !isOpen });
    const wizard = useContratoWizard(contratoId ?? null);

    const setIsOpen = (val: boolean) => {
        if (isControlledExternally) {
            if (!val && onExternalClose) onExternalClose();
        } else {
            setInternalIsOpen(val);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        formik.resetForm();
        setStep(1);
        setStepAttempted(false);
        setContratoCreado(null);
    };

    const [step, setStep] = useState<TStep>(1);
    // Rastrea si el usuario intentó avanzar en el paso actual.
    // Permite bloquear el botón Siguiente solo tras el primer intento fallido.
    const [stepAttempted, setStepAttempted] = useState(false);

    // Reset del intento al cambiar de paso
    useEffect(() => { setStepAttempted(false); }, [step]);

    const [crearContratoConTrabajador, { isLoading: creandoCT }] =
        useCrearContratoConTrabajadorMutation();
    const [generarPdf, { isLoading: generandoPdf }] =
        useGenerarPdfContratoTrabajadorMutation();
    const [contratoCreado, setContratoCreado] = useState<IContratoTrabajador | null>(null);

    const formik = useFormik<IFormValuesContratoTrabajador>({
        initialValues,
        validationSchema,
        onSubmit: async (values) => {
            try {
                // Construir payload del contrato
                const contratoPayload: Record<string, unknown> = {
                    referencia_interna: values.referencia_interna || null,
                    observaciones: values.observaciones || null,
                    tipo_contrato: values.tipo_contrato,
                    fecha_inicio: values.fecha_inicio,
                    fecha_termino: values.fecha_termino || null,
                    cargo: values.cargo,
                    funciones: values.funciones || null,
                    jornada: values.jornada,
                    horas_semanales: values.horas_semanales || null,
                    dias_semana: values.dias_semana,
                    turnos_rotativo: values.jornada === 'turnos' ? [] : values.turnos_rotativo,
                    grupo_turno: values.jornada === 'turnos' ? values.grupo_turno_id : null,
                    horario_detalle: values.horario_detalle || null,
                    tiempo_colacion: values.tiempo_colacion || 30,
                    lugar_trabajo: values.lugar_trabajo || null,
                    enviar_al_empleador: values.enviar_al_empleador,
                    cantidad_meses: values.cantidad_meses || null,
                    sueldo: values.sueldo || 0,
                    tipo_sueldo: values.tipo_sueldo,
                    descuento_prevision_activo: values.descuento_prevision_activo,
                    descuento_salud_activo: values.descuento_salud_activo,
                    moneda: 'CLP',
                    tipo_gratificacion: values.gratificacion_activa ? values.tipo_gratificacion : 'no_aplica',
                    bono_movilizacion: values.bono_movilizacion_activo ? Number(values.bono_movilizacion) || 0 : 0,
                    bono_colacion: values.bono_colacion_activo ? Number(values.bono_colacion) || 0 : 0,
                    bono_movilizacion_activo: values.bono_movilizacion_activo,
                    bono_colacion_activo: values.bono_colacion_activo,
                    hora_inicio: values.jornada !== 'turnos' ? (values.hora_inicio || null) : null,
                    hora_fin:    values.jornada !== 'turnos' ? (values.hora_fin || null)    : null,
                    lugar_celebracion_contrato: values.lugar_celebracion_contrato || null,
                    fecha_firma: values.fecha_firma || null,
                    plantilla_contrato: values.plantilla_contrato_id || null,
                    estado_civil: values.trab_estado_civil || null,
                    profesion_u_oficio: values.trab_profesion_u_oficio || null,
                    sistema_salud_otro: values.sistema_salud_otro || null,
                    trabajador_reemplazado: values.trab_trabajador_reemplazado_id || null,
                    causal_reemplazo: values.causal_reemplazo || null,
                    estado: 'borrador',
                };

                // Datos opcionales del trabajador (UE/User) que enviamos en ambos modos
                const trabajadorExtra = {
                    afp: values.afp || undefined,
                    sistema_salud: values.sistema_salud || undefined,
                    nombre_isapre: values.nombre_isapre || undefined,
                    sistema_salud_otro: values.sistema_salud_otro || undefined,
                    banco: values.banco || undefined,
                    tipo_cuenta_bancaria: values.tipo_cuenta_bancaria || undefined,
                    numero_cuenta_bancaria: values.numero_cuenta_bancaria || undefined,
                    nacionalidad: values.trab_nacionalidad || undefined,
                    fecha_nacimiento: values.trab_fecha_nacimiento || undefined,
                    direccion: values.trab_direccion || undefined,
                };

                // Función interna: genera PDF, cierra el modal y navega al detalle del contrato
                const _finalizarCreacion = async (contrato: IContratoTrabajador, mensaje: string) => {
                    toast.success(mensaje);
                    if (contrato.plantilla_contrato) {
                        try {
                            await generarPdf(contrato.id).unwrap();
                        } catch {
                            toast.warning('Contrato creado, pero no se pudo generar el PDF.');
                        }
                    }
                    formik.resetForm();
                    setStep(1);
                    setStepAttempted(false);
                    setContratoCreado(null);
                    setIsOpen(false);
                    navigate(`/rrhh/contratos/${contrato.id}`);
                };

                if (values.trab_modo === 'existente') {
                    // Usar el endpoint atomico tambien para 'existente' para que aplique
                    // los datos previsionales/bancarios/personales al UE/User.
                    const payload: ICrearContratoConTrabajadorPayload & {
                        sucursal_id_invalidar?: number;
                    } = {
                        trabajador: {
                            modo: 'existente',
                            usuario_empresa_id: Number(values.trab_usuario_empresa_id),
                            ...trabajadorExtra,
                        } as never,
                        contrato: contratoPayload as never,
                    };
                    const resp = await crearContratoConTrabajador(payload).unwrap();
                    await _finalizarCreacion(resp.contrato ?? resp as never, 'Contrato laboral creado.');
                    return resp;
                }

                // Modo nuevo: usar endpoint atomico
                const payload: ICrearContratoConTrabajadorPayload & {
                    sucursal_id_invalidar?: number;
                } = {
                    trabajador: {
                        modo: 'nuevo',
                        email: values.trab_email,
                        first_name: values.trab_first_name,
                        last_name: values.trab_last_name,
                        rut: values.trab_rut || undefined,
                        sucursal_id: Number(values.trab_sucursal_id),
                        enviar_invitacion: values.trab_enviar_invitacion,
                        ...trabajadorExtra,
                    } as never,
                    contrato: contratoPayload as never,
                    sucursal_id_invalidar: Number(values.trab_sucursal_id),
                };
                const resp = await crearContratoConTrabajador(payload).unwrap();
                await _finalizarCreacion(
                    resp.contrato ?? resp as never,
                    resp.invitacion_enviada ? 'Contrato creado e invitación enviada.' : 'Contrato creado.',
                );
                return resp;
            } catch (err) {
                toast.error(getErrorMessage(err));
                throw err;
            }
        },
    });

    // Pre-fill Step 2 cuando se crea un contrato para un trabajador confirmado específico
    useEffect(() => {
        if (isOpen && usuarioEmpresaInicial) {
            formik.resetForm({
                values: {
                    ...initialValues,
                    trab_modo: 'existente',
                    trab_usuario_empresa_id: usuarioEmpresaInicial.id,
                    trab_sucursal_id: usuarioEmpresaInicial.sucursalId ?? '',
                },
            });
            setStep(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Empresa cliente de contexto: se toma del detalle actual y no se pide manualmente.
    const empresaClienteContexto = detalleCliente;

    // Obtener sucursales de la empresa cliente contextual
    const sucursales = empresaClienteContexto?.info_cliente.sucursales || [];

    // Obtener usuarios de la empresa cliente contextual
    const { data: usuariosCliente = [] } = useGetUsuariosTodoElClienteQuery(
        empresaClienteContexto?.info_cliente.id || '',
        { skip: !empresaClienteContexto?.info_cliente.id || !isOpen },
    );

    const { data: gruposTurno = [] } = useGetGruposTurnoQuery(
        { empresa_id: empresaClienteContexto?.info_cliente.id },
        { skip: !empresaClienteContexto?.info_cliente.id || !isOpen },
    );

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className='space-y-5'>
                        <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-200'>
                            Empresa cliente: <strong>{empresaClienteContexto?.info_cliente.nombre ?? 'Contexto no disponible'}</strong>
                        </div>
                        {/* Referencia interna (required) */}
                        <div>
                            <Label htmlFor='referencia_interna'>
                                Referencia interna{' '}
                                <span className='text-red-500'>*</span>
                            </Label>
                            <p className='mb-1.5 text-xs text-zinc-500 dark:text-zinc-400'>
                                Asigna un nombre para identificar internamente este contrato.
                            </p>
                            <Validation
                                isValid={!formik.errors.referencia_interna}
                                isTouched={!!formik.touched.referencia_interna}
                                invalidFeedback={formik.errors.referencia_interna || ''}>
                                <Input
                                    id='referencia_interna'
                                    name='referencia_interna'
                                    placeholder='Ej: Contrato Juan López — Abril 2026'
                                    value={formik.values.referencia_interna}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        {/* Observaciones */}
                        <div>
                            <Label htmlFor='observaciones'>Observaciones</Label>
                            <Textarea
                                id='observaciones'
                                name='observaciones'
                                rows={3}
                                placeholder='Notas internas sobre este contrato...'
                                value={formik.values.observaciones}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <>
                        {usuarioEmpresaInicial && (
                            <div className='mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-200'>
                                Creando contrato para:{' '}
                                <strong>{usuarioEmpresaInicial.nombre}</strong>
                            </div>
                        )}
                        <StepTrabajador
                            formik={formik}
                            usuariosCliente={usuariosCliente}
                            sucursales={sucursales}
                            bloqueado={!!usuarioEmpresaInicial}
                            nombreTrabajador={usuarioEmpresaInicial?.nombre}
                        />
                    </>
                );
            case 3: {
                const sucursalDireccion =
                    sucursales.find((s) => s.id === Number(formik.values.trab_sucursal_id))
                        ?.direccion ?? undefined;
                return (
                    <div className='space-y-5'>
                        {/* Tipo de contrato */}
                        <div>
                            <Label className='mb-2 block'>
                                Tipo de contrato <span className='text-red-500'>*</span>
                            </Label>
                            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                                {TIPO_CONTRATO_CARDS.map((op) => {
                                    const iconMap = {
                                        indefinido: 'HeroClipboardDocumentCheck',
                                        plazo_fijo: 'HeroCalendarDays',
                                        reemplazo: 'HeroArrowPath',
                                    } as const;
                                    return (
                                        <RadioCard
                                            key={op.value}
                                            id={`tipo_${op.value}`}
                                            name='tipo_contrato'
                                            value={op.value}
                                            checked={formik.values.tipo_contrato === op.value}
                                            onChange={(e) => {
                                                formik.setFieldValue('tipo_contrato', e.target.value, false);
                                                formik.setFieldTouched('tipo_contrato', true, false);
                                                formik.setFieldError('tipo_contrato', undefined);
                                                if (e.target.value !== 'plazo_fijo') {
                                                    formik.setFieldValue('cantidad_meses', '', false);
                                                }
                                            }}
                                            icon={iconMap[op.value as keyof typeof iconMap]}>
                                            <span className='text-xs font-semibold leading-tight'>
                                                {op.label}
                                            </span>
                                            <span className='block text-[10px] leading-tight text-zinc-500 dark:text-zinc-400'>
                                                {op.desc}
                                            </span>
                                        </RadioCard>
                                    );
                                })}
                            </div>
                            {formik.touched.tipo_contrato && formik.errors.tipo_contrato && (
                                <p className='mt-1 text-xs text-red-500'>
                                    {formik.errors.tipo_contrato}
                                </p>
                            )}
                        </div>
                        <hr className='border-zinc-200 dark:border-zinc-700' />
                        <StepTerminosLaborales formik={formik} sucursalDireccion={sucursalDireccion} usuariosCliente={usuariosCliente} />
                    </div>
                );
            }
            case 4:
                return (
                    <StepJornada
                        formik={formik}
                        empresaClienteId={empresaClienteContexto?.info_cliente.id || ''}
                        onConfigureTurnos={
                            empresaClienteContexto?.info_cliente.id
                                ? () =>
                                      window.open(
                                          `/empresas/${empresaClienteContexto.info_cliente.id}?section=ConfiguracionRRHH`,
                                          '_blank',
                                      )
                                : undefined
                        }
                    />
                );
            case 5:
                return <StepPrevisionBanco formik={formik} />;
            case 6:
                return <StepRemuneraciones formik={formik} />;
            case 7: {
                const trabajadorLabel =
                    formik.values.trab_modo === 'existente'
                        ? usuariosCliente.find(
                              (u) => String(u.id) === String(formik.values.trab_usuario_empresa_id),
                          )?.nombre_usuario ?? `ID ${formik.values.trab_usuario_empresa_id}`
                        : `${formik.values.trab_first_name} ${formik.values.trab_last_name}`.trim();
                const tipoLabel = ({
                    indefinido: 'Indefinido',
                    plazo_fijo: 'Plazo fijo',
                    reemplazo: 'Reemplazo',
                } as Record<string, string>)[formik.values.tipo_contrato] ?? formik.values.tipo_contrato;
                const jornadaLabel = ({
                    completa: 'Jornada completa',
                    parcial: 'Jornada parcial',
                    turnos: 'Turnos',
                } as Record<string, string>)[formik.values.jornada] ?? formik.values.jornada;
                return (
                    <div className='space-y-3 text-sm'>
                        <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                            Verifica los datos antes de generar el contrato.
                        </p>
                        {/* Plantilla de contrato */}
                        {(() => {
                            const plantillasFiltradas = todasLasPlantillas.filter((p) => {
                                if (p.tipo_contrato !== 'trabajador' || !p.activa) return false;
                                // Mostrar plantillas universales (sin subtipo) o que coincidan con el tipo de contrato
                                const subtipo = (p as unknown as { subtipo_trabajador?: string | null }).subtipo_trabajador;
                                if (!subtipo) return true;
                                return subtipo === formik.values.tipo_contrato;
                            });
                            const globales = plantillasFiltradas.filter((p) => p.es_global);
                            const deEmpresa = plantillasFiltradas.filter((p) => !p.es_global);
                            const gruposOpciones: TSelectGroups = [
                                ...(globales.length > 0
                                    ? [{
                                        label: 'Globales',
                                        options: globales.map((p) => ({
                                            value: String(p.id),
                                            label: p.titulo,
                                        })),
                                    }]
                                    : []),
                                ...(deEmpresa.length > 0
                                    ? [{
                                        label: 'De empresa',
                                        options: deEmpresa.map((p) => ({
                                            value: String(p.id),
                                            label: p.titulo,
                                        })),
                                    }]
                                    : []),
                            ];
                            const plantillaSeleccionada =
                                plantillasFiltradas.find(
                                    (p) => String(p.id) === String(formik.values.plantilla_contrato_id),
                                ) ?? null;
                            const valorSeleccionado = plantillaSeleccionada
                                ? { value: String(plantillaSeleccionada.id), label: plantillaSeleccionada.titulo }
                                : null;
                            return (
                                <div className='rounded-xl border border-zinc-200 p-3 dark:border-zinc-700'>
                                    <h4 className='mb-2 flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-200'>
                                        <svg
                                            className='h-4 w-4 text-blue-500'
                                            fill='none'
                                            viewBox='0 0 24 24'
                                            stroke='currentColor'>
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth={2}
                                                d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
                                            />
                                        </svg>
                                        Plantilla de contrato
                                    </h4>
                                    <Validation
                                        isValid={!formik.errors.plantilla_contrato_id}
                                        isTouched={formik.touched.plantilla_contrato_id}
                                        invalidFeedback={formik.errors.plantilla_contrato_id as string}>
                                        <SelectReact
                                            name='plantilla_contrato_id'
                                            options={gruposOpciones}
                                            value={valorSeleccionado}
                                            onChange={(opt) =>
                                                formik.setFieldValue(
                                                    'plantilla_contrato_id',
                                                    opt ? Number((opt as TSelectOption).value) : '',
                                                )
                                            }
                                            isClearable
                                            placeholder='Selecciona una plantilla de contrato...'
                                        />
                                    </Validation>
                                    <p className='mt-1.5 text-xs text-zinc-500 dark:text-zinc-400'>
                                        Selecciona la plantilla que se usará para generar el PDF.
                                    </p>
                                </div>
                            );
                        })()}
                        {/* Trabajador */}
                        <div className='rounded-xl border border-zinc-200 p-3 dark:border-zinc-700'>
                            <h4 className='mb-2 flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-200'>
                                <svg
                                    className='h-4 w-4 text-blue-500'
                                    fill='none'
                                    viewBox='0 0 24 24'
                                    stroke='currentColor'>
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                                    />
                                </svg>
                                Trabajador
                            </h4>
                            <dl className='grid grid-cols-2 gap-x-4 gap-y-1 text-xs'>
                                <dt className='text-zinc-500'>Nombre:</dt>
                                <dd className='font-medium'>{trabajadorLabel || '—'}</dd>
                                {formik.values.trab_modo === 'nuevo' && (
                                    <>
                                        <dt className='text-zinc-500'>Email:</dt>
                                        <dd className='font-medium'>
                                            {formik.values.trab_email || '—'}
                                        </dd>
                                        <dt className='text-zinc-500'>RUT:</dt>
                                        <dd className='font-medium'>
                                            {formik.values.trab_rut || '—'}
                                        </dd>
                                    </>
                                )}
                            </dl>
                        </div>
                        {/* Condiciones laborales */}
                        <div className='rounded-xl border border-zinc-200 p-3 dark:border-zinc-700'>
                            <h4 className='mb-2 flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-200'>
                                <svg
                                    className='h-4 w-4 text-blue-500'
                                    fill='none'
                                    viewBox='0 0 24 24'
                                    stroke='currentColor'>
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                                    />
                                </svg>
                                Contrato y jornada
                            </h4>
                            <dl className='grid grid-cols-2 gap-x-4 gap-y-1 text-xs'>
                                <dt className='text-zinc-500'>Cargo:</dt>
                                <dd className='font-medium'>{formik.values.cargo || '—'}</dd>
                                {formik.values.funciones && (
                                    <>
                                        <dt className='text-zinc-500'>Funciones:</dt>
                                        <dd className='font-medium'>{formik.values.funciones}</dd>
                                    </>
                                )}
                                <dt className='text-zinc-500'>Tipo:</dt>
                                <dd className='font-medium'>{tipoLabel || '—'}</dd>
                                <dt className='text-zinc-500'>Jornada:</dt>
                                <dd className='font-medium'>{jornadaLabel || '—'}</dd>
                                {formik.values.jornada === 'turnos' && formik.values.grupo_turno_id && (
                                    <>
                                        <dt className='text-zinc-500'>Grupo turnos:</dt>
                                        <dd className='font-medium'>
                                            {gruposTurno.find(
                                                (g) => String(g.id) === String(formik.values.grupo_turno_id),
                                            )?.nombre ?? `ID ${formik.values.grupo_turno_id}`}
                                        </dd>
                                    </>
                                )}
                                <dt className='text-zinc-500'>Fecha inicio:</dt>
                                <dd className='font-medium'>
                                    {formik.values.fecha_inicio || '—'}
                                </dd>
                                {formik.values.fecha_termino && (
                                    <>
                                        <dt className='text-zinc-500'>Fecha termino:</dt>
                                        <dd className='font-medium'>
                                            {formik.values.fecha_termino}
                                        </dd>
                                    </>
                                )}
                            </dl>
                        </div>
                        {/* Remuneraciones */}
                        <div className='rounded-xl border border-zinc-200 p-3 dark:border-zinc-700'>
                            <h4 className='mb-2 flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-200'>
                                <svg
                                    className='h-4 w-4 text-blue-500'
                                    fill='none'
                                    viewBox='0 0 24 24'
                                    stroke='currentColor'>
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
                                    />
                                </svg>
                                Remuneraciones
                            </h4>
                            <dl className='grid grid-cols-2 gap-x-4 gap-y-1 text-xs'>
                                <dt className='text-zinc-500'>
                                    {formik.values.tipo_sueldo === 'base' ? 'Sueldo base:' : 'Sueldo líquido:'}
                                </dt>
                                <dd className='font-medium'>
                                    {formik.values.sueldo
                                        ? `$${Number(formik.values.sueldo).toLocaleString('es-CL')} CLP`
                                        : '—'}
                                </dd>
                                {formik.values.descuentos_activos && (
                                    <>
                                        <dt className='text-zinc-500'>Descuentos legales:</dt>
                                        <dd className='font-medium'>
                                            {formik.values.porcentaje_descuentos}%
                                        </dd>
                                    </>
                                )}
                                {formik.values.gratificacion_activa && formik.values.tipo_gratificacion && (
                                    <>
                                        <dt className='text-zinc-500'>Gratificacion:</dt>
                                        <dd className='font-medium'>
                                            {({ art_47: 'Anual (Art.47)', art_50_mensual: 'Mensual (Art.50)', no_aplica: 'No aplica' } as Record<string, string>)[formik.values.tipo_gratificacion] ?? formik.values.tipo_gratificacion}
                                        </dd>
                                    </>
                                )}
                                {formik.values.bono_colacion_activo && formik.values.bono_colacion && (
                                    <>
                                        <dt className='text-zinc-500'>Bono colacion:</dt>
                                        <dd className='font-medium'>
                                            ${Number(formik.values.bono_colacion).toLocaleString('es-CL')} CLP
                                        </dd>
                                    </>
                                )}
                                {formik.values.bono_movilizacion_activo && formik.values.bono_movilizacion && (
                                    <>
                                        <dt className='text-zinc-500'>Bono movilizacion:</dt>
                                        <dd className='font-medium'>
                                            ${Number(formik.values.bono_movilizacion).toLocaleString('es-CL')} CLP
                                        </dd>
                                    </>
                                )}
                                <dt className='text-zinc-500'>AFP / Salud:</dt>
                                <dd className='font-medium'>
                                    {[formik.values.afp, formik.values.sistema_salud === 'isapre' ? formik.values.nombre_isapre : formik.values.sistema_salud].filter(Boolean).join(' / ') || '—'}
                                </dd>
                            </dl>
                        </div>
                    </div>
                );
            }
            case 8:
                return (
                    <div className='flex flex-col items-center gap-5 py-6 text-center'>
                        <div className='flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30'>
                            <svg className='h-7 w-7 text-emerald-600 dark:text-emerald-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                            </svg>
                        </div>
                        <div>
                            <p className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                                Contrato creado exitosamente
                            </p>
                            {contratoCreado?.referencia_interna && (
                                <p className='mt-0.5 text-sm text-zinc-500 dark:text-zinc-400'>
                                    {contratoCreado.referencia_interna}
                                </p>
                            )}
                        </div>
                        {generandoPdf && (
                            <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                                Generando PDF...
                            </p>
                        )}
                        {contratoCreado?.archivo_pdf && (
                            <a
                                href={contratoCreado.archivo_pdf}
                                target='_blank'
                                rel='noreferrer'
                                className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700'>
                                <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                                </svg>
                                Ver PDF del contrato
                            </a>
                        )}
                        {!contratoCreado?.archivo_pdf && !generandoPdf && (
                            <p className='text-sm text-amber-600 dark:text-amber-400'>
                                El PDF se generará cuando asignes una plantilla al contrato.
                            </p>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    const isLast = step === 7;
    const isPdfStep = step === 8;
    const isLoading = creandoCT || formik.isSubmitting || generandoPdf;
    // Deshabilita "Siguiente" solo si el usuario ya intentó avanzar (stepAttempted)
    // y aún hay errores en los campos del paso actual.
    const stepHasErrors =
        stepAttempted &&
        STEP_FIELDS[step].some(
            (f) => !!(formik.errors as Record<string, unknown>)[f],
        );

    const handleNext = async () => {
        setStepAttempted(true);
        const camposStep = STEP_FIELDS[step];
        // Marca como touched solo los campos del step actual para mostrar errores.
        const touchedActualizado = camposStep.reduce<Record<string, boolean>>((acc, f) => {
            acc[f] = true;
            return acc;
        }, {});
        formik.setTouched({ ...formik.touched, ...touchedActualizado }, true);

        const errores = await formik.validateForm();
        const erroresEnStep = camposStep.filter(
            (f) => Boolean((errores as Record<string, unknown>)[f]),
        );
        if (erroresEnStep.length > 0) {
            toast.error('Completa los campos obligatorios para continuar.');
            return;
        }
        setStep((s) => (s + 1) as TStep);
    };

    const handleGenerar = async () => {
        // Marca todos los campos como touched para que se vean los errores remanentes.
        const errores = await formik.validateForm();
        if (Object.keys(errores).length > 0) {
            const todosTouched = Object.keys(formik.values).reduce<Record<string, boolean>>(
                (acc, k) => {
                    acc[k] = true;
                    return acc;
                },
                {},
            );
            formik.setTouched(todosTouched, true);
            toast.error('Hay campos obligatorios sin completar. Revisa los pasos previos.');
            return;
        }
        formik.handleSubmit();
    };

    return (
        <>
            {!isControlledExternally && (
                <Button variant='solid' color='blue' onClick={() => setIsOpen(true)}>
                    Crear contrato laboral
                </Button>
            )}
            <Modal
                isOpen={!!isOpen}
                setIsOpen={(v) => {
                    const newValue = typeof v === 'function' ? v(!!isOpen) : v;
                    if (!newValue) {
                        handleClose();
                        return;
                    }
                    setIsOpen(true);
                }}
                size='lg'
                isScrollable
                isStaticBackdrop
            >
                <ModalHeader>
                    <div>
                        <p className='font-semibold leading-tight'>Nuevo contrato laboral</p>
                        <p className='text-xs font-normal text-zinc-500 dark:text-zinc-400'>
                            Ingresa los datos para generar un nuevo contrato.
                        </p>
                    </div>
                </ModalHeader>
                <ModalBody isScrollable>
                    {!isPdfStep && <Stepper step={step} />}
                    {renderStep()}
                    {contratoId && (
                        <div className='mt-4 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/30'>
                            {wizard.guardando && (
                                <div className='flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400'>
                                    <svg className='h-4 w-4 animate-spin' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                                    </svg>
                                    <span>Guardando cambios...</span>
                                </div>
                            )}
                            {wizard.éxito && wizard.ultimoGuardado && (
                                <div className='flex items-center gap-2 text-sm text-green-600 dark:text-green-400'>
                                    <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
                                        <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
                                    </svg>
                                    <span>Guardado</span>
                                </div>
                            )}
                            {wizard.error && (
                                <div className='flex items-center gap-2 text-sm text-red-600 dark:text-red-400'>
                                    <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
                                        <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                                    </svg>
                                    <span>{wizard.error}</span>
                                    <button onClick={() => wizard.reintentarGuardar()} className='ml-auto text-xs font-medium underline hover:no-underline'>
                                        Reintentar
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild>
                        <Button onClick={handleClose}>{isPdfStep ? 'Cerrar' : 'Cancelar'}</Button>
                    </ModalFooterChild>
                    {!isPdfStep && (
                        <ModalFooterChild>
                            {step > 1 && (
                                <Button onClick={() => setStep((s) => (s - 1) as TStep)}>
                                    Atras
                                </Button>
                            )}
                            {!isLast ? (
                                <Button
                                    variant='solid'
                                    color='blue'
                                    isDisable={stepHasErrors}
                                    onClick={handleNext}>
                                    Siguiente
                                </Button>
                            ) : (
                                <Tooltip text='Debes seleccionar una plantilla antes de generar el contrato'>
                                    <span className='inline-flex'>
                                        <Button
                                            variant='solid'
                                            color='blue'
                                            isDisable={isLoading || !formik.values.plantilla_contrato_id}
                                            icon='HeroCheckCircle'
                                            onClick={handleGenerar}>
                                            {isLoading ? 'Guardando...' : 'Generar contrato'}
                                        </Button>
                                    </span>
                                </Tooltip>
                            )}
                        </ModalFooterChild>
                    )}
                </ModalFooter>
            </Modal>
        </>
    );
};

export default CrearContratoTrabajadorWizard;
