import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import { IRelacionEmpresa } from '@/interface/empresas.interface';
import { ICrearContratoConTrabajadorPayload } from '@/interface/rrhh.interface';
import { useAppDispatch, useAppSelector } from '@/store';
import { useGetUsuariosTodoElClienteQuery } from '@/store/slices/empresa/empresaApi';
import { listaMisClientesThunk } from '@/store/slices/empresa/empresaSlice';
import {
    useCrearContratoConTrabajadorMutation,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import classNames from 'classnames';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
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
}

type TStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEP_LABELS: Record<TStep, string> = {
    1: 'Datos basicos',
    2: 'Trabajador',
    3: 'Contrato',
    4: 'Jornada',
    5: 'Remuneraciones',
    6: 'Prevision',
    7: 'Revision',
};

// Campos a validar (y marcar como touched) al intentar avanzar de cada step.
const STEP_FIELDS: Record<TStep, (keyof IFormValuesContratoTrabajador)[]> = {
    1: ['nombre'],
    2: [
        'trab_modo',
        'trab_empresa_cliente_id',
        'trab_usuario_empresa_id',
        'trab_first_name',
        'trab_email',
        'trab_sucursal_id',
    ],
    3: ['tipo_contrato', 'fecha_inicio', 'fecha_termino', 'cargo'],
    4: ['jornada', 'horas_semanales', 'hora_inicio', 'hora_fin'],
    5: ['sueldo_base'],
    6: [],
    7: [],
};

const validationSchema = Yup.object({
    nombre: Yup.string().required('Requerido'),
    trab_modo: Yup.string().oneOf(['existente', 'nuevo']).required(),
    trab_empresa_cliente_id: Yup.mixed().when('trab_modo', {
        is: 'existente',
        then: (s) => s.required('Selecciona una empresa cliente'),
        otherwise: (s) => s.notRequired(),
    }),
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
    trab_sucursal_id: Yup.mixed().when('trab_modo', {
        is: 'nuevo',
        then: (s) => s.required('Selecciona sucursal'),
        otherwise: (s) => s.notRequired(),
    }),
    tipo_contrato: Yup.string().required('Requerido'),
    fecha_inicio: Yup.string().required('Requerido'),
    fecha_termino: Yup.string().when('tipo_contrato', {
        is: 'plazo_fijo',
        then: (s) => s.required('Requerido para plazo fijo'),
        otherwise: (s) => s.notRequired(),
    }),
    cargo: Yup.string().required('Requerido'),
    jornada: Yup.string().required('Requerido'),
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
    sueldo_base: Yup.number()
        .typeError('Debe ser un numero')
        .required('Requerido')
        .min(0, 'No puede ser negativo'),
});

const initialValues: IFormValuesContratoTrabajador = {
    nombre: '',
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
    enviar_al_empleador: true,
    tipo_contrato: '',
    fecha_inicio: '',
    fecha_termino: '',
    cantidad_meses: '',
    cargo: '',
    funciones: '',
    jornada: '',
    horas_semanales: '',
    dias_semana: [],
    turnos_rotativo: [],
    horario_detalle: '',
    hora_inicio: '09:00',
    hora_fin: '18:00',
    tiempo_colacion: 30,
    lugar_trabajo: '',
    sueldo_base: '',
    sueldo_liquido: '',
    moneda: 'CLP',
    gratificacion_legal: false,
    bono_movilizacion: '',
    bono_colacion: '',
    afp: '',
    sistema_salud: '',
    nombre_isapre: '',
    banco: '',
    tipo_cuenta_bancaria: '',
    numero_cuenta_bancaria: '',
    lugar_firma: '',
    fecha_firma: '',
};

const Stepper = ({ step }: { step: TStep }) => (
    <div className='mb-4 flex items-center justify-center gap-1'>
        {([1, 2, 3, 4, 5, 6, 7] as TStep[]).map((k, i) => {
            const esActual = k === step;
            const esCompletado = k < step;
            return (
                <div key={k} className='flex items-center gap-1'>
                    {i > 0 && (
                        <div
                            className={classNames(
                                'h-0.5 w-6',
                                esCompletado || esActual
                                    ? 'bg-blue-500'
                                    : 'bg-zinc-300 dark:bg-zinc-600',
                            )}
                        />
                    )}
                    <div
                        className={classNames(
                            'rounded-full px-3 py-1 text-xs font-medium',
                            {
                                'bg-blue-500 text-white': esActual,
                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300':
                                    esCompletado,
                                'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500':
                                    !esActual && !esCompletado,
                            },
                        )}>
                        {STEP_LABELS[k]}
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
}: Props) => {
    const dispatch = useAppDispatch();
    const { detalleCliente: detalleClienteStore, listaMisClientes } = useAppSelector(
        (state) => state.empresa,
    );
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const detalleCliente = detalleClienteProp ?? detalleClienteStore;

    const isControlledExternally = externalIsOpen !== undefined;
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = isControlledExternally ? externalIsOpen : internalIsOpen;

    const setIsOpen = (val: boolean) => {
        if (isControlledExternally) {
            if (!val && onExternalClose) onExternalClose();
        } else {
            setInternalIsOpen(val);
        }
    };

    const [step, setStep] = useState<TStep>(1);

    // Cargar lista de empresas cliente al abrir el wizard
    useEffect(() => {
        if (isOpen && personalizacionUsuario?.empresa && listaMisClientes.length === 0) {
            dispatch(listaMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }));
        }
    }, [isOpen, personalizacionUsuario, listaMisClientes.length, dispatch]);

    const [crearContratoConTrabajador, { isLoading: creandoCT }] =
        useCrearContratoConTrabajadorMutation();

    const formik = useFormik<IFormValuesContratoTrabajador>({
        initialValues,
        validationSchema,
        onSubmit: async (values) => {
            try {
                // Construir payload del contrato
                const contratoPayload: Record<string, unknown> = {
                    nombre: values.nombre || null,
                    observaciones: values.observaciones || null,
                    tipo_contrato: values.tipo_contrato,
                    fecha_inicio: values.fecha_inicio,
                    fecha_termino: values.fecha_termino || null,
                    cargo: values.cargo,
                    funciones: values.funciones || null,
                    jornada: values.jornada,
                    horas_semanales: values.horas_semanales || null,
                    dias_semana: values.dias_semana,
                    horario_detalle: values.horario_detalle || null,
                    tiempo_colacion: values.tiempo_colacion || 30,
                    lugar_trabajo: values.lugar_trabajo || null,
                    enviar_al_empleador: values.enviar_al_empleador,
                    cantidad_meses: values.cantidad_meses || null,
                    sueldo_base: values.sueldo_base || 0,
                    sueldo_liquido: values.sueldo_liquido || null,
                    moneda: values.moneda,
                    gratificacion_legal: values.gratificacion_legal,
                    bono_movilizacion: values.bono_movilizacion || 0,
                    bono_colacion: values.bono_colacion || 0,
                    lugar_firma: values.lugar_firma || null,
                    fecha_firma: values.fecha_firma || null,
                    estado: 'borrador',
                };

                // Datos opcionales del trabajador (UE/User) que enviamos en ambos modos
                const trabajadorExtra = {
                    afp: values.afp || undefined,
                    sistema_salud: values.sistema_salud || undefined,
                    nombre_isapre: values.nombre_isapre || undefined,
                    banco: values.banco || undefined,
                    tipo_cuenta_bancaria: values.tipo_cuenta_bancaria || undefined,
                    numero_cuenta_bancaria: values.numero_cuenta_bancaria || undefined,
                    nacionalidad: values.trab_nacionalidad || undefined,
                    fecha_nacimiento: values.trab_fecha_nacimiento || undefined,
                    direccion: values.trab_direccion || undefined,
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
                    toast.success('Contrato laboral creado.');
                    setIsOpen(false);
                    formik.resetForm();
                    setStep(1);
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
                toast.success(
                    resp.invitacion_enviada
                        ? 'Contrato creado e invitacion enviada.'
                        : 'Contrato creado.',
                );
                setIsOpen(false);
                formik.resetForm();
                setStep(1);
                return resp;
            } catch (err) {
                toast.error(getErrorMessage(err));
                throw err;
            }
        },
    });

    // Derivar empresa cliente seleccionada en el form
    const empresaClienteIdSeleccionada = formik.values.trab_empresa_cliente_id;
    const relacionSeleccionada =
        listaMisClientes.find(
            (r) => r.info_cliente.id === empresaClienteIdSeleccionada,
        ) ?? detalleCliente;
    const sucursales = relacionSeleccionada?.info_cliente.sucursales || [];

    const { data: usuariosCliente = [] } = useGetUsuariosTodoElClienteQuery(
        empresaClienteIdSeleccionada || '',
        { skip: !empresaClienteIdSeleccionada || !isOpen },
    );

    // Preseleccionar empresa cliente si vino desde un detalleCliente (contexto fijo)
    useEffect(() => {
        if (isOpen && detalleCliente?.info_cliente.id && !formik.values.trab_empresa_cliente_id) {
            formik.setFieldValue('trab_empresa_cliente_id', detalleCliente.info_cliente.id);
        }
    }, [isOpen, detalleCliente]);

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className='space-y-4'>
                        <div>
                            <Label htmlFor='nombre'>
                                Nombre / referencia interna{' '}
                                <span className='text-red-500'>*</span>
                            </Label>
                            <Validation
                                isValid={!formik.errors.nombre}
                                isTouched={!!formik.touched.nombre}
                                invalidFeedback={formik.errors.nombre || ''}>
                                <Input
                                    id='nombre'
                                    name='nombre'
                                    placeholder='Ej: Contrato Juan Perez - Enero 2025'
                                    value={formik.values.nombre}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Label htmlFor='observaciones'>Observaciones</Label>
                            <Textarea
                                id='observaciones'
                                name='observaciones'
                                value={formik.values.observaciones}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <StepTrabajador
                        formik={formik}
                        usuariosCliente={usuariosCliente}
                        sucursales={sucursales}
                        empresasCliente={listaMisClientes}
                    />
                );
            case 3: {
                const sucursalDireccion =
                    sucursales.find((s) => s.id === Number(formik.values.trab_sucursal_id))?.direccion ?? undefined;
                return <StepTerminosLaborales formik={formik} sucursalDireccion={sucursalDireccion} />;
            }
            case 4:
                return <StepJornada formik={formik} />;
            case 5:
                return <StepRemuneraciones formik={formik} />;
            case 6:
                return <StepPrevisionBanco formik={formik} />;
            case 7: {
                const trabajadorLabel =
                    formik.values.trab_modo === 'existente'
                        ? `ID ${formik.values.trab_usuario_empresa_id}`
                        : `${formik.values.trab_first_name} ${formik.values.trab_last_name}`.trim();
                const tipoLabel = ({
                    indefinido: 'Indefinido',
                    plazo_fijo: 'Plazo fijo',
                    honorarios: 'Honorarios',
                    reemplazo: 'Reemplazo',
                    obra_o_faena: 'Por obra o faena',
                } as Record<string, string>)[formik.values.tipo_contrato] ?? formik.values.tipo_contrato;
                const jornadaLabel = ({
                    completa: 'Jornada completa',
                    parcial: 'Jornada parcial',
                    part_time: 'Part time',
                    turnos: 'Turnos',
                } as Record<string, string>)[formik.values.jornada] ?? formik.values.jornada;
                return (
                    <div className='space-y-3 text-sm'>
                        <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                            Verifica los datos antes de generar el contrato.
                        </p>
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
                                        d='M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                                    />
                                </svg>
                                Condiciones laborales
                            </h4>
                            <dl className='grid grid-cols-2 gap-x-4 gap-y-1 text-xs'>
                                <dt className='text-zinc-500'>Cargo:</dt>
                                <dd className='font-medium'>{formik.values.cargo || '—'}</dd>
                                <dt className='text-zinc-500'>Tipo:</dt>
                                <dd className='font-medium'>{tipoLabel || '—'}</dd>
                                <dt className='text-zinc-500'>Jornada:</dt>
                                <dd className='font-medium'>{jornadaLabel || '—'}</dd>
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
                                <dt className='text-zinc-500'>Sueldo base:</dt>
                                <dd className='font-medium'>
                                    {formik.values.sueldo_base
                                        ? `${Number(formik.values.sueldo_base).toLocaleString('es-CL')} ${formik.values.moneda}`
                                        : '—'}
                                </dd>
                                {formik.values.bono_colacion && (
                                    <>
                                        <dt className='text-zinc-500'>Colacion:</dt>
                                        <dd className='font-medium'>
                                            {Number(
                                                formik.values.bono_colacion,
                                            ).toLocaleString('es-CL')}
                                        </dd>
                                    </>
                                )}
                                {formik.values.bono_movilizacion && (
                                    <>
                                        <dt className='text-zinc-500'>Movilizacion:</dt>
                                        <dd className='font-medium'>
                                            {Number(
                                                formik.values.bono_movilizacion,
                                            ).toLocaleString('es-CL')}
                                        </dd>
                                    </>
                                )}
                                <dt className='text-zinc-500'>Gratificacion:</dt>
                                <dd className='font-medium'>
                                    {formik.values.gratificacion_legal ? 'Legal' : 'No'}
                                </dd>
                            </dl>
                        </div>
                        {/* Alerta estado */}
                        <div className='flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300'>
                            <svg
                                className='mt-0.5 h-4 w-4 shrink-0'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'>
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                                />
                            </svg>
                            <span>
                                Al confirmar, el contrato quedara como{' '}
                                <strong>borrador</strong>. Desde el detalle podras
                                enviarlo a firma cuando este listo.
                            </span>
                        </div>
                    </div>
                );
            }
            default:
                return null;
        }
    };

    const isLast = step === 7;
    const isLoading = creandoCT || formik.isSubmitting;

    const handleNext = async () => {
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
            <Modal isOpen={!!isOpen} setIsOpen={(v) => setIsOpen(typeof v === 'function' ? v(!!isOpen) : v)} size='lg'>
                <ModalHeader>Nuevo contrato laboral</ModalHeader>
                <ModalBody isScrollable>
                    <Stepper step={step} />
                    {renderStep()}
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild>
                        <Button onClick={() => setIsOpen(false)}>Cancelar</Button>
                    </ModalFooterChild>
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
                                onClick={handleNext}>
                                Siguiente
                            </Button>
                        ) : (
                            <Button
                                variant='solid'
                                color='blue'
                                isDisable={isLoading}
                                icon='HeroCheckCircle'
                                onClick={handleGenerar}>
                                {isLoading ? 'Guardando...' : 'Generar contrato'}
                            </Button>
                        )}
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
};

export default CrearContratoTrabajadorWizard;
