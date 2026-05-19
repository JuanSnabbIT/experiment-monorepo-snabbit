// Contenido del wizard de contrato laboral, sin <Modal> wrapper.
// Pensado para montarse DENTRO del modal unico de creacion de contratos
// (CrearContratoDelCliente.tsx) cuando el usuario selecciona tipo 'trabajador'.
//
// Renderiza: <ModalBody> con Stepper + step actual, y <ModalFooter> con la
// navegacion. El componente padre debe proveer el <Modal> y <ModalHeader>.

import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import { ModalBody, ModalFooter, ModalFooterChild } from '@/components/ui/Modal';
import { IRelacionEmpresa } from '@/interface/empresas.interface';
import { ICrearContratoConTrabajadorPayload } from '@/interface/rrhh.interface';
import { useGetUsuariosTodoElClienteQuery } from '@/store/slices/empresa/empresaApi';
import {
    useCrearContratoConTrabajadorMutation,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import classNames from 'classnames';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import StepRemuneraciones from './StepRemuneraciones';
import StepTerminosLaborales from './StepTerminosLaborales';
import StepTrabajador from './StepTrabajador';
import { IFormValuesContratoTrabajador } from './types';

interface Props {
    detalleCliente?: IRelacionEmpresa;
    /** Nombre/referencia interna heredado del paso 1 B2B (ej: "Contrato Juan Perez"). */
    initialNombre?: string;
    /** Cierra el modal padre. */
    onClose: () => void;
    /** Callback opcional al crearse el contrato. */
    onSuccess?: () => void;
}

type TStep = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<TStep, string> = {
    1: 'Datos basicos',
    2: 'Trabajador',
    3: 'Terminos laborales',
    4: 'Remuneraciones',
    5: 'Revision',
};

// Campos a validar (y marcar como touched) al intentar avanzar de cada step.
const STEP_FIELDS: Record<TStep, (keyof IFormValuesContratoTrabajador)[]> = {
    1: ['nombre'],
    2: [
        'trab_modo',
        'trab_usuario_empresa_id',
        'trab_first_name',
        'trab_email',
        'trab_sucursal_id',
    ],
    3: ['tipo_contrato', 'fecha_inicio', 'fecha_termino', 'cargo', 'jornada', 'horas_semanales'],
    4: ['sueldo_base'],
    5: [],
};

const validationSchema = Yup.object({
    nombre: Yup.string().required('Requerido'),
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
    horas_semanales: Yup.mixed().when('jornada', {
        is: (v: string) => v === 'parcial' || v === 'part_time',
        then: (s) => s.required('Requerido para esta jornada'),
        otherwise: (s) => s.notRequired(),
    }),
    sueldo_base: Yup.number()
        .typeError('Debe ser un numero')
        .required('Requerido')
        .min(0, 'No puede ser negativo'),
});

const buildInitialValues = (initialNombre?: string): IFormValuesContratoTrabajador => ({
    nombre: initialNombre ?? '',
    observaciones: '',
    trab_modo: 'existente',
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
    tipo_contrato: '',
    fecha_inicio: '',
    fecha_termino: '',
    cargo: '',
    funciones: '',
    jornada: '',
    horas_semanales: '',
    horario_detalle: '',
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
    estado_inicial: 'borrador',
    lugar_firma: '',
    fecha_firma: '',
});

const Stepper = ({ step }: { step: TStep }) => (
    <div className='mb-4 flex flex-wrap items-center justify-center gap-1'>
        {([1, 2, 3, 4, 5] as TStep[]).map((k, i) => {
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
                        className={classNames('rounded-full px-3 py-1 text-xs font-medium', {
                            'bg-blue-500 text-white': esActual,
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300':
                                esCompletado,
                            'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500':
                                !esActual && !esCompletado,
                        })}>
                        {STEP_LABELS[k]}
                    </div>
                </div>
            );
        })}
    </div>
);

const ContenidoWizardTrabajador = ({
    detalleCliente,
    initialNombre,
    onClose,
    onSuccess,
}: Props) => {
    const [step, setStep] = useState<TStep>(1);

    const empresaClienteId = detalleCliente?.info_cliente.id;
    const sucursales = detalleCliente?.info_cliente.sucursales || [];

    const { data: usuariosCliente = [] } = useGetUsuariosTodoElClienteQuery(
        empresaClienteId ?? '',
        { skip: !empresaClienteId },
    );

    const [crearContratoConTrabajador, { isLoading: creandoCT }] =
        useCrearContratoConTrabajadorMutation();

    const formik = useFormik<IFormValuesContratoTrabajador>({
        initialValues: buildInitialValues(initialNombre),
        validationSchema,
        onSubmit: async (values) => {
            try {
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
                    horario_detalle: values.horario_detalle || null,
                    tiempo_colacion: values.tiempo_colacion || 30,
                    lugar_trabajo: values.lugar_trabajo || null,
                    sueldo_base: values.sueldo_base || 0,
                    sueldo_liquido: values.sueldo_liquido || null,
                    moneda: values.moneda,
                    gratificacion_legal: values.gratificacion_legal,
                    bono_movilizacion: values.bono_movilizacion || 0,
                    bono_colacion: values.bono_colacion || 0,
                    lugar_firma: values.lugar_firma || null,
                    fecha_firma: values.fecha_firma || null,
                    estado: values.estado_inicial,
                };

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

                let resp;
                if (values.trab_modo === 'existente') {
                    const payload: ICrearContratoConTrabajadorPayload = {
                        trabajador: {
                            modo: 'existente',
                            usuario_empresa_id: Number(values.trab_usuario_empresa_id),
                            ...trabajadorExtra,
                        } as never,
                        contrato: contratoPayload as never,
                    };
                    resp = await crearContratoConTrabajador(payload).unwrap();
                } else {
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
                    resp = await crearContratoConTrabajador(payload).unwrap();
                }

                toast.success(
                    values.trab_modo === 'nuevo' && resp.invitacion_enviada
                        ? 'Contrato creado e invitacion enviada.'
                        : 'Contrato laboral creado.',
                );
                if (onSuccess) onSuccess();
                onClose();
                formik.resetForm();
                setStep(1);
                return resp;
            } catch (err) {
                toast.error(getErrorMessage(err));
                throw err;
            }
        },
    });

    // Si el padre cambia el "nombre" en el paso 1 B2B antes de seleccionar trabajador,
    // arrastrarlo a este formik para no perder lo escrito.
    useEffect(() => {
        if (initialNombre && !formik.values.nombre) {
            formik.setFieldValue('nombre', initialNombre);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialNombre]);

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className='space-y-3'>
                        <div>
                            <Label htmlFor='nombre'>
                                Nombre contrato <span className='text-red-500'>*</span>
                            </Label>
                            <Validation
                                isValid={!formik.errors.nombre}
                                isTouched={!!formik.touched.nombre}
                                invalidFeedback={formik.errors.nombre || ''}>
                                <Input
                                    id='nombre'
                                    name='nombre'
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
                        <div>
                            <Label>Estado inicial del contrato</Label>
                            <div className='mt-1 flex flex-col gap-2 text-sm'>
                                <label className='flex items-center gap-2 cursor-pointer'>
                                    <input
                                        type='radio'
                                        name='estado_inicial'
                                        value='borrador'
                                        checked={formik.values.estado_inicial === 'borrador'}
                                        onChange={() =>
                                            formik.setFieldValue('estado_inicial', 'borrador')
                                        }
                                    />
                                    <span>
                                        <strong>Borrador</strong> — quedara en edicion sin
                                        notificar al trabajador.
                                    </span>
                                </label>
                                <label className='flex items-center gap-2 cursor-pointer'>
                                    <input
                                        type='radio'
                                        name='estado_inicial'
                                        value='pendiente_aceptacion'
                                        checked={
                                            formik.values.estado_inicial === 'pendiente_aceptacion'
                                        }
                                        onChange={() =>
                                            formik.setFieldValue(
                                                'estado_inicial',
                                                'pendiente_aceptacion',
                                            )
                                        }
                                    />
                                    <span>
                                        <strong>Pendiente de aceptacion</strong> — el trabajador
                                        debera aceptarlo desde el portal.
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <StepTrabajador
                        formik={formik}
                        usuariosCliente={usuariosCliente}
                        sucursales={sucursales}
                    />
                );
            case 3:
                return <StepTerminosLaborales formik={formik} />;
            case 4:
                return <StepRemuneraciones formik={formik} />;
            case 5:
                return (
                    <div className='space-y-2 text-sm'>
                        <p>
                            <strong>Trabajador:</strong>{' '}
                            {formik.values.trab_modo === 'existente'
                                ? `Existente (id ${formik.values.trab_usuario_empresa_id})`
                                : `Nuevo: ${formik.values.trab_first_name} ${formik.values.trab_last_name} <${formik.values.trab_email}>`}
                        </p>
                        <p>
                            <strong>Tipo:</strong> {formik.values.tipo_contrato}
                        </p>
                        <p>
                            <strong>Cargo:</strong> {formik.values.cargo}
                        </p>
                        <p>
                            <strong>Jornada:</strong> {formik.values.jornada}
                        </p>
                        <p>
                            <strong>Sueldo:</strong> {formik.values.sueldo_base}{' '}
                            {formik.values.moneda}
                        </p>
                        <p>
                            <strong>Inicio:</strong> {formik.values.fecha_inicio}
                            {formik.values.fecha_termino &&
                                ` / Termino: ${formik.values.fecha_termino}`}
                        </p>
                        <p>
                            <strong>Estado inicial:</strong> {formik.values.estado_inicial}
                        </p>
                    </div>
                );
            default:
                return null;
        }
    };

    const isLast = step === 5;
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
        const erroresEnStep = camposStep.filter((f) => Boolean((errores as Record<string, unknown>)[f]));
        if (erroresEnStep.length > 0) {
            toast.error('Completa los campos obligatorios para continuar.');
            return;
        }
        setStep((s) => (s + 1) as TStep);
    };

    return (
        <>
            <ModalBody>
                <Stepper step={step} />
                {renderStep()}
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild>
                    <Button onClick={onClose}>Cancelar</Button>
                </ModalFooterChild>
                <ModalFooterChild>
                    {step > 1 && (
                        <Button onClick={() => setStep((s) => (s - 1) as TStep)}>Atras</Button>
                    )}
                    {!isLast ? (
                        <Button variant='solid' color='blue' onClick={handleNext}>
                            Siguiente
                        </Button>
                    ) : (
                        <Button
                            variant='solid'
                            color='blue'
                            isDisable={isLoading}
                            onClick={() => formik.handleSubmit()}>
                            {isLoading ? 'Guardando...' : 'Crear contrato'}
                        </Button>
                    )}
                </ModalFooterChild>
            </ModalFooter>
        </>
    );
};

export default ContenidoWizardTrabajador;
