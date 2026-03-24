import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { TIPO_CONTRATO } from '@/constants/contrato.constant';
import { IContratoBorradorPayload } from '@/interface/contrato.interface';
import { IRelacionEmpresa } from '@/interface/empresas.interface';
import { useAppSelector } from '@/store';
import {
    useCreateContratoCompletoMutation,
    useGetCondicionesEspecialesQuery,
    useGetLicenciasCatalogoQuery,
    useGetPlanesServicioQuery,
    useGetServiciosQuery,
} from '@/store/slices/contratos/contratoApi';
import {
    useGetPlantillasContratoQuery,
} from '@/store/slices/contratos/plantillaContratoApi';
import { useGetUsuariosTodoElClienteQuery } from '@/store/slices/empresa/empresaApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import classNames from 'classnames';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import { IContratoEdicion, ISeleccionPlanServicios } from '../components/contrato.types';
import SelectorPlanServicios from '../components/SelectorPlanServicios';
import ModalLicenciaContrato from './ModalLicenciaContrato';

// Tipos

type TWizardStep = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<TWizardStep, string> = {
    1: 'Datos del contrato',
    2: 'Plan y Servicios',
    3: 'Licencias',
    4: 'Revisi\u00f3n',
};

const MONEDA_OPTIONS: TSelectOption[] = [
    { value: 'USD', label: 'USD' },
    { value: 'CLP', label: 'CLP' },
    { value: 'UF', label: 'UF' },
];

const FORMA_PAGO_OPTIONS: TSelectOption[] = [
    { value: 'mensual', label: 'Mensual' },
    { value: 'anual', label: 'Anual' },
    { value: 'pago_unico', label: 'Pago unico' },
];

const formatCurrencyByMoneda = (
    value: number,
    moneda: 'CLP' | 'UF' | 'USD' = 'USD',
) => {
    if (moneda === 'UF') {
        return `${new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value)} UF`;
    }

    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: moneda,
        maximumFractionDigits: 0,
    }).format(value);
};

interface ICrearContratoDelClienteProps {
    detalleCliente?: IRelacionEmpresa;
    /** Control externo: si se define, el modal se abre/cierra desde afuera */
    externalIsOpen?: boolean;
    /** Callback cuando el modal externo debe cerrarse */
    onExternalClose?: () => void;
    /** Si se define, el tipo queda fijo y no es editable en el paso 1 */
    tipoFijo?: string;
    /** Licencias preseleccionadas que se cargan en el paso 2 (no se pueden eliminar) */
    licenciasIniciales?: IContratoEdicion['licencias'];
}

// Stepper visual

const WizardStepper = ({
    step,
    esServicios,
    esLicencia,
}: {
    step: TWizardStep;
    esServicios: boolean;
    esLicencia: boolean;
}) => {
    const pasos: { key: TWizardStep; label: string; visible: boolean }[] = [
        { key: 1, label: STEP_LABELS[1], visible: true },
        { key: 2, label: STEP_LABELS[2], visible: esServicios },
        { key: 3, label: STEP_LABELS[3], visible: esLicencia },
        { key: 4, label: STEP_LABELS[4], visible: true },
    ];

    const pasosVisibles = pasos.filter((p) => p.visible);

    return (
        <div className='mb-4 flex items-center justify-center gap-1'>
            {pasosVisibles.map((paso, i) => {
                const esActual = paso.key === step;
                const esCompletado = paso.key < step;

                return (
                    <div key={paso.key} className='flex items-center gap-1'>
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
                            {paso.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Componente principal

function CrearContratoDelCliente({
    detalleCliente: detalleClienteProp,
    externalIsOpen,
    onExternalClose,
    tipoFijo,
    licenciasIniciales,
}: ICrearContratoDelClienteProps = {}) {
    const navigate = useNavigate();
    const { detalleCliente: detalleClienteStore } = useAppSelector((state) => state.empresa);
    const detalleCliente = detalleClienteProp ?? detalleClienteStore;

    const isControlledExternally = externalIsOpen !== undefined;
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = isControlledExternally ? externalIsOpen : internalIsOpen;

    const [step, setStep] = useState<TWizardStep>(1);
    const [modalAddLicencia, setModalAddLicencia] = useState(false);

    // Estado para la seleccion de plan/servicios (Paso 2)
    const SELECCION_INICIAL: ISeleccionPlanServicios = {
        modo: 'plan',
        plan_id: null,
        plan_cantidad: 1,
        plan_precio_unitario: 0,
        servicios: [],
    };
    const [seleccionPlan, setSeleccionPlan] = useState<ISeleccionPlanServicios>(SELECCION_INICIAL);

    const { data: listaLicencias = [] } = useGetLicenciasCatalogoQuery();
    const { data: planes = [] } = useGetPlanesServicioQuery();
    const { data: serviciosCatalogo = [] } = useGetServiciosQuery();
    const { data: condicionesCatalogo = [] } = useGetCondicionesEspecialesQuery();
    const { data: plantillasContrato = [] } = useGetPlantillasContratoQuery();
    const { data: usuariosCliente = [] } = useGetUsuariosTodoElClienteQuery(
        detalleCliente?.info_cliente.id ?? '',
        {
            skip: !detalleCliente?.info_cliente.id || !isOpen,
        },
    );
    const [createContratoCompleto] = useCreateContratoCompletoMutation();

    // Formik auxiliar para licencias (Paso 2)
    const licFormik = useFormik<IContratoEdicion>({
        initialValues: {
            fecha_inicio: '',
            fecha_fin: null,
            observaciones: null,
            nombre: '',
            eliminar_visitas: [],
            visitas: [],
            eliminar_licencias: [],
            licencias: [],
            eliminar_condiciones: [],
            condiciones_especiales: [],
            eliminar_usuarios: [],
            usuarios_vinculados: [],
        },
        onSubmit: () => {},
    });

    useEffect(() => {
        if (isOpen && licenciasIniciales && licenciasIniciales.length > 0) {
            licFormik.setFieldValue('licencias', licenciasIniciales);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && tipoFijo) {
            formik.setFieldValue('tipo', tipoFijo);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, tipoFijo]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            fecha_inicio: '',
            fecha_fin: '',
            observaciones: '',
            tipo: tipoFijo ?? '',
            moneda_cobro: 'USD',
            forma_pago_contractual: 'mensual',
            plantilla: '',
            destinatario_modo: 'interno',
            destinatario_interno_id: '',
            destinatario_nombre: '',
            destinatario_correo: '',
            condicion_catalogo_id: '',
            condicion_texto: '',
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string()
                .required('Requerido')
                .nonNullable('Requerido')
                .max(100, 'M\u00e1ximo 100 caracteres'),
            fecha_inicio: Yup.string().required('Requerido').nonNullable('Requerido'),
            fecha_fin: Yup.string().notRequired().nullable(),
            observaciones: Yup.string().notRequired().nullable(),
            tipo: Yup.string().required('Requerido').nonNullable('Requerido'),
            moneda_cobro: Yup.string().oneOf(['CLP', 'UF', 'USD']).required('Requerido'),
            forma_pago_contractual: Yup.string()
                .oneOf(['mensual', 'anual', 'pago_unico'])
                .required('Requerido'),
            destinatario_modo: Yup.string().oneOf(['interno', 'externo']).required('Requerido'),
            destinatario_interno_id: Yup.string().when('destinatario_modo', {
                is: 'interno',
                then: (schema) => schema.required('Selecciona un usuario del cliente'),
                otherwise: (schema) => schema.notRequired(),
            }),
            destinatario_nombre: Yup.string().when('destinatario_modo', {
                is: 'externo',
                then: (schema) => schema.required('Ingresa el nombre del firmante'),
                otherwise: (schema) => schema.notRequired(),
            }),
            destinatario_correo: Yup.string().when('destinatario_modo', {
                is: 'externo',
                then: (schema) =>
                    schema.email('Correo inv\u00e1lido').required('Ingresa el correo del firmante'),
                otherwise: (schema) => schema.notRequired(),
            }),
        }),
        onSubmit: async (values) => {
            try {
                const contratoPayload = {
                    nombre: values.nombre,
                    fecha_inicio: dayjs(values.fecha_inicio).format('YYYY-MM-DD'),
                    fecha_fin: values.fecha_fin
                        ? dayjs(values.fecha_fin).format('YYYY-MM-DD')
                        : undefined,
                    observaciones: values.observaciones || undefined,
                    tipo: values.tipo,
                    empresa_prestadora: detalleCliente?.prestador_servicios,
                    empresa_cliente: detalleCliente?.info_cliente.id,
                    moneda_cobro: values.moneda_cobro as 'CLP' | 'UF' | 'USD',
                    forma_pago_contractual: values.forma_pago_contractual as
                        | 'mensual'
                        | 'anual'
                        | 'pago_unico',
                    plantilla: values.plantilla ? Number(values.plantilla) : null,
                };

                const destinatarioPrincipal =
                    formik.values.destinatario_modo === 'interno'
                        ? {
                              usuario_id: Number(formik.values.destinatario_interno_id),
                              tipo_usuario: 'general',
                              es_destinatario_principal: true,
                          }
                        : {
                              nombre: formik.values.destinatario_nombre,
                              correo_generico: formik.values.destinatario_correo,
                              tipo_usuario: 'general',
                              es_destinatario_principal: true,
                          };

                const alcance_comercial: IContratoBorradorPayload['alcance_comercial'] =
                    seleccionPlan.plan_id !== null || seleccionPlan.servicios.length > 0
                        ? {
                              modo:
                                  seleccionPlan.modo === 'plan' && seleccionPlan.plan_id
                                      ? 'plan'
                                      : 'personalizado',
                              plan_id: seleccionPlan.plan_id,
                              plan:
                                  seleccionPlan.modo === 'plan' && seleccionPlan.plan_id
                                      ? {
                                            tipo_origen: 'plan' as const,
                                            version_id: seleccionPlan.plan_id,
                                            cantidad: seleccionPlan.plan_cantidad,
                                            precio_unitario_contratado:
                                                seleccionPlan.plan_precio_unitario,
                                        }
                                      : null,
                              addons:
                                  seleccionPlan.modo === 'plan'
                                      ? seleccionPlan.servicios.map((s) => ({
                                            tipo_origen: 'servicio' as const,
                                            version_id: s.servicio_id,
                                            cantidad: s.cantidad,
                                            precio_unitario_contratado: s.precio_unitario,
                                            es_addon: true,
                                        }))
                                      : [],
                              servicios:
                                  seleccionPlan.modo === 'personalizado'
                                      ? seleccionPlan.servicios.map((s) => ({
                                            tipo_origen: 'servicio' as const,
                                            version_id: s.servicio_id,
                                            cantidad: s.cantidad,
                                            precio_unitario_contratado: s.precio_unitario,
                                        }))
                                      : [],
                          }
                        : { modo: 'vacio' as const };

                const contratoCreado = await createContratoCompleto({
                    contrato: contratoPayload,
                    destinatario_principal: destinatarioPrincipal,
                    alcance_comercial,
                    licencias: licFormik.values.licencias.map((lic) => ({
                        licencia_id: lic.licencia_id,
                        tipo_modalidad: lic.tipo_modalidad,
                        otro_tipo: lic.otro_tipo ?? null,
                        cantidad: lic.cantidad,
                        precio_unitario: lic.precio_unitario,
                        fecha_inicio: lic.fecha_inicio ?? null,
                        fecha_fin: lic.fecha_fin ?? null,
                        tipo_moneda: lic.tipo_moneda,
                    })),
                    condiciones_especiales: licFormik.values.condiciones_especiales,
                    visitas: licFormik.values.visitas,
                }).unwrap();

                toast.success('Contrato creado', { autoClose: 1000 });

                handleClose();
                navigate(
                    `/empresa/detalle-cliente/${detalleCliente?.id}/contrato/${contratoCreado.id}`,
                );
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    useEffect(() => {
        if (!formik.values.plantilla) return;

        const tipoSeleccionado = formik.values.tipo || tipoFijo || '';
        const plantillaSeleccionada = plantillasContrato.find(
            (plantilla) => String(plantilla.id) === formik.values.plantilla,
        );

        if (!plantillaSeleccionada) {
            formik.setFieldValue('plantilla', '');
            return;
        }

        if (tipoSeleccionado && plantillaSeleccionada.tipo_contrato !== tipoSeleccionado) {
            formik.setFieldValue('plantilla', '');
        }
    }, [formik.values.plantilla, formik.values.tipo, plantillasContrato, tipoFijo]);

    const esLicencia = formik.values.tipo === 'licencia' || tipoFijo === 'licencia';
    const esServicios =
        formik.values.tipo === 'servicios' ||
        formik.values.tipo === 'licencia' ||
        tipoFijo === 'servicios' ||
        tipoFijo === 'licencia';
    const monedaContrato = formik.values.moneda_cobro as 'CLP' | 'UF' | 'USD';
    const totalPlanSeleccionado =
        seleccionPlan.modo === 'plan' && seleccionPlan.plan_id
            ? seleccionPlan.plan_cantidad * seleccionPlan.plan_precio_unitario
            : 0;
    const totalServiciosSeleccionados = seleccionPlan.servicios.reduce(
        (acc, item) => acc + item.cantidad * item.precio_unitario,
        0,
    );
    const totalLicenciasSeleccionadas = licFormik.values.licencias.reduce(
        (acc, item) => acc + item.cantidad * item.precio_unitario,
        0,
    );

    const handleClose = () => {
        if (isControlledExternally) {
            onExternalClose?.();
        } else {
            setInternalIsOpen(false);
        }
        setStep(1);
        setSeleccionPlan(SELECCION_INICIAL);
        formik.resetForm();
        licFormik.resetForm();
    };

    const handleSiguiente = async () => {
        if (step === 1) {
            const errors = await formik.validateForm();
            formik.setTouched(
                Object.keys(formik.values).reduce(
                    (acc, key) => ({ ...acc, [key]: true }),
                    {},
                ),
            );
            if (Object.keys(errors).length > 0) return;
            setStep(esServicios ? 2 : esLicencia ? 3 : 4);
        } else if (step === 2) {
            setStep(esLicencia ? 3 : 4);
        } else if (step === 3) {
            setStep(4);
        }
    };

    const handleAtras = () => {
        if (step === 4) {
            setStep(esLicencia ? 3 : esServicios ? 2 : 1);
        } else if (step === 3) {
            setStep(esServicios ? 2 : 1);
        } else if (step === 2) {
            setStep(1);
        }
    };

    const getLicenciaNombre = (licId?: number) =>
        listaLicencias.find((l) => l.id === licId)?.nombre ?? '';

    const esLicenciaInicial = (index: number): boolean => {
        if (!licenciasIniciales || licenciasIniciales.length === 0) return false;
        const lic = licFormik.values.licencias[index];
        return licenciasIniciales.some((ini) => ini.licencia_id === lic.licencia_id);
    };

    const tipoLabel =
        TIPO_CONTRATO.find((t) => t.value === formik.values.tipo)?.label ?? formik.values.tipo;
    const tipoContratoSeleccionado = formik.values.tipo || tipoFijo || '';
    const usuariosClienteOptions: TSelectOption[] = usuariosCliente.map((usuario) => ({
        value: String(usuario.id),
        label: `${usuario.nombre_usuario} (${usuario.email_usuario})`,
    }));

    const condicionesCatalogoOptions: TSelectOption[] = condicionesCatalogo.map((condicion) => ({
        value: String(condicion.id),
        label: condicion.titulo,
    }));

    const plantillasCompatibles = plantillasContrato.filter(
        (plantilla) =>
            plantilla.activa &&
            (!tipoContratoSeleccionado || plantilla.tipo_contrato === tipoContratoSeleccionado),
    );

    const plantillaOptions: TSelectOption[] = plantillasCompatibles
        .map((p) => ({
            value: String(p.id),
            label: `${p.titulo} · v${p.version} · ${
                TIPO_CONTRATO.find((tipo) => tipo.value === p.tipo_contrato)?.label ||
                p.tipo_contrato
            }`,
        }));

    const plantillaSeleccionada = plantillasCompatibles.find(
        (plantilla) => String(plantilla.id) === formik.values.plantilla,
    );

    return (
        <>
            {!isControlledExternally && (
                <Tooltip text='Crear Contrato'>
                    <Button variant='solid' onClick={() => setInternalIsOpen(true)}>
                        Crear
                    </Button>
                </Tooltip>
            )}

            <Modal
                isOpen={isOpen}
                setIsOpen={(val) => {
                    if (!val) handleClose();
                }}
                size='lg'>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Contrato</Badge>
                </ModalHeader>
                <ModalBody>
                    <WizardStepper step={step} esServicios={esServicios} esLicencia={esLicencia} />

                    {/* Paso 1: Datos del contrato */}
                    {step === 1 && (
                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                            <div>
                                <Label htmlFor='nombre'>Nombre</Label>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.nombre}
                                    invalidFeedback={formik.errors.nombre}>
                                    <Input
                                        id='nombre'
                                        name='nombre'
                                        onChange={formik.handleChange}
                                        value={formik.values.nombre}
                                        onBlur={formik.handleBlur}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Label htmlFor='tipo'>Tipo</Label>
                                {tipoFijo ? (
                                    <div className='mt-1'>
                                        <Badge variant='solid' color='blue'>
                                            {TIPO_CONTRATO.find((t) => t.value === tipoFijo)
                                                ?.label ?? tipoFijo}
                                        </Badge>
                                    </div>
                                ) : (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.tipo}
                                        invalidFeedback={formik.errors.tipo}>
                                        <SelectReact
                                            name='tipo'
                                            options={TIPO_CONTRATO}
                                            value={TIPO_CONTRATO.find(
                                                (con) => con.value === formik.values.tipo,
                                            )}
                                            onChange={(e) => {
                                                formik.setFieldValue(
                                                    'tipo',
                                                    (e as TSelectOption).value,
                                                );
                                            }}
                                            placeholder='Seleccione un tipo'
                                            noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                        />
                                    </Validation>
                                )}
                            </div>
                            <div className='rounded-lg border border-blue-200 bg-blue-50/60 p-4 md:col-span-2 dark:border-blue-900/60 dark:bg-blue-950/20'>
                                <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                                    <div className='max-w-xl'>
                                        <p className='text-sm font-semibold text-blue-700 dark:text-blue-300'>
                                            Documento base
                                        </p>
                                        <p className='mt-1 text-xs text-zinc-500'>
                                            La plantilla define la estructura inicial del documento del contrato.
                                        </p>
                                    </div>
                                    <Badge
                                        variant='outline'
                                        color={tipoContratoSeleccionado ? 'blue' : 'zinc'}>
                                        {tipoContratoSeleccionado
                                            ? tipoLabel
                                            : 'Selecciona un tipo primero'}
                                    </Badge>
                                </div>
                                <div className='mt-4'>
                                    <Label htmlFor='plantilla'>Plantilla del documento</Label>
                                    <SelectReact
                                        name='plantilla'
                                        options={plantillaOptions}
                                        value={
                                            plantillaOptions.find(
                                                (option) => option.value === formik.values.plantilla,
                                            ) ?? null
                                        }
                                        onChange={(option) =>
                                            formik.setFieldValue(
                                                'plantilla',
                                                (option as TSelectOption | null)?.value ?? '',
                                            )
                                        }
                                        isClearable
                                        isDisabled={!tipoContratoSeleccionado}
                                        placeholder={
                                            tipoContratoSeleccionado
                                                ? 'Sin plantilla (opcional)'
                                                : 'Selecciona primero el tipo de contrato'
                                        }
                                        noOptionsMessage={() =>
                                            tipoContratoSeleccionado
                                                ? 'No hay plantillas activas para este tipo'
                                                : 'Selecciona primero el tipo de contrato'
                                        }
                                    />
                                    <p className='mt-2 text-xs text-zinc-500'>
                                        Elegir una plantilla te deja partir desde una estructura lista para generar el borrador.
                                    </p>
                                    {plantillaSeleccionada && (
                                        <div className='mt-3 rounded-lg border border-blue-200 bg-white p-3 dark:border-blue-900/60 dark:bg-zinc-950'>
                                            <div className='flex flex-col gap-2 md:flex-row md:items-start md:justify-between'>
                                                <div>
                                                    <p className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                        {plantillaSeleccionada.titulo}
                                                    </p>
                                                    <p className='text-xs text-zinc-500'>
                                                        {plantillaSeleccionada.descripcion ||
                                                            'Estructura lista para iniciar el documento del contrato.'}
                                                    </p>
                                                </div>
                                                <div className='flex gap-2'>
                                                    <Badge variant='outline' color='amber'>
                                                        v{plantillaSeleccionada.version}
                                                    </Badge>
                                                    <Badge variant='outline' color='blue'>
                                                        {TIPO_CONTRATO.find(
                                                            (tipo) =>
                                                                tipo.value ===
                                                                plantillaSeleccionada.tipo_contrato,
                                                        )?.label ||
                                                            plantillaSeleccionada.tipo_contrato}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {tipoContratoSeleccionado &&
                                        plantillasCompatibles.length === 0 && (
                                            <div className='mt-3 flex flex-col gap-3 rounded-lg border border-dashed border-zinc-300 p-3 text-xs text-zinc-500 dark:border-zinc-700'>
                                                <p>
                                                    No hay plantillas activas para este tipo de contrato.
                                                </p>
                                                <div>
                                                    <Button
                                                        size='sm'
                                                        icon='HeroArrowTopRightOnSquare'
                                                        onClick={() => {
                                                            handleClose();
                                                            navigate('/registros/plantillas-contrato');
                                                        }}>
                                                        Gestionar plantillas
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                </div>
                            </div>
                            <div>
                                <Label htmlFor='fecha_inicio'>Fecha de inicio</Label>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.fecha_inicio}
                                    invalidFeedback={formik.errors.fecha_inicio}>
                                    <Input
                                        id='fecha_inicio'
                                        name='fecha_inicio'
                                        type='date'
                                        onChange={formik.handleChange}
                                        value={formik.values.fecha_inicio}
                                        onBlur={formik.handleBlur}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Label htmlFor='fecha_fin'>Fecha de fin</Label>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.fecha_fin}
                                    invalidFeedback={formik.errors.fecha_fin}>
                                    <Input
                                        id='fecha_fin'
                                        name='fecha_fin'
                                        type='date'
                                        onChange={formik.handleChange}
                                        value={formik.values.fecha_fin}
                                        onBlur={formik.handleBlur}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Label htmlFor='moneda_cobro'>Moneda contractual</Label>
                                <SelectReact
                                    name='moneda_cobro'
                                    options={MONEDA_OPTIONS}
                                    value={
                                        MONEDA_OPTIONS.find(
                                            (option) => option.value === formik.values.moneda_cobro,
                                        ) ?? null
                                    }
                                    onChange={(option) =>
                                        formik.setFieldValue(
                                            'moneda_cobro',
                                            (option as TSelectOption | null)?.value ?? 'USD',
                                        )
                                    }
                                    placeholder='Selecciona una moneda'
                                />
                            </div>
                            <div>
                                <Label htmlFor='forma_pago_contractual'>Forma de pago</Label>
                                <SelectReact
                                    name='forma_pago_contractual'
                                    options={FORMA_PAGO_OPTIONS}
                                    value={
                                        FORMA_PAGO_OPTIONS.find(
                                            (option) =>
                                                option.value ===
                                                formik.values.forma_pago_contractual,
                                        ) ?? null
                                    }
                                    onChange={(option) =>
                                        formik.setFieldValue(
                                            'forma_pago_contractual',
                                            (option as TSelectOption | null)?.value ?? 'mensual',
                                        )
                                    }
                                    placeholder='Selecciona una forma de pago'
                                />
                            </div>
                            <div className='md:col-span-2'>
                                <Label htmlFor='observaciones'>Observaciones</Label>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.observaciones}
                                    invalidFeedback={formik.errors.observaciones}>
                                    <Textarea
                                        id='observaciones'
                                        name='observaciones'
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.observaciones}
                                    />
                                </Validation>
                            </div>
                            <div className='col-span-full rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                                <div className='mb-3 flex items-center justify-between gap-3'>
                                    <div>
                                        <p className='text-sm font-semibold'>Destinatario principal</p>
                                        <p className='text-xs text-zinc-500'>
                                            Este contacto recibira la aprobacion del borrador y luego la firma.
                                        </p>
                                    </div>
                                    <div className='flex gap-2'>
                                        <Button
                                            size='sm'
                                            variant={
                                                formik.values.destinatario_modo === 'interno'
                                                    ? 'solid'
                                                    : 'default'
                                            }
                                            onClick={() =>
                                                formik.setFieldValue('destinatario_modo', 'interno')
                                            }>
                                            Usuario existente
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant={
                                                formik.values.destinatario_modo === 'externo'
                                                    ? 'solid'
                                                    : 'default'
                                            }
                                            onClick={() =>
                                                formik.setFieldValue('destinatario_modo', 'externo')
                                            }>
                                            Contacto manual
                                        </Button>
                                    </div>
                                </div>

                                {formik.values.destinatario_modo === 'interno' ? (
                                    <div>
                                        <Label htmlFor='destinatario_interno_id'>
                                            Usuario del cliente
                                        </Label>
                                        <Validation
                                            isValid={formik.isValid}
                                            isTouched={formik.touched.destinatario_interno_id}
                                            invalidFeedback={formik.errors.destinatario_interno_id}>
                                            <SelectReact
                                                name='destinatario_interno_id'
                                                options={usuariosClienteOptions}
                                                value={
                                                    usuariosClienteOptions.find(
                                                        (option) =>
                                                            option.value ===
                                                            formik.values.destinatario_interno_id,
                                                    ) ?? null
                                                }
                                                onChange={(option) =>
                                                    formik.setFieldValue(
                                                        'destinatario_interno_id',
                                                        (option as TSelectOption | null)?.value ?? '',
                                                    )
                                                }
                                                placeholder='Selecciona un usuario del cliente'
                                            />
                                        </Validation>
                                    </div>
                                ) : (
                                    <div className='grid grid-cols-2 gap-4'>
                                        <div>
                                            <Label htmlFor='destinatario_nombre'>Nombre</Label>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.destinatario_nombre}
                                                invalidFeedback={formik.errors.destinatario_nombre}>
                                                <Input
                                                    id='destinatario_nombre'
                                                    name='destinatario_nombre'
                                                    onChange={formik.handleChange}
                                                    value={formik.values.destinatario_nombre}
                                                    onBlur={formik.handleBlur}
                                                />
                                            </Validation>
                                        </div>
                                        <div>
                                            <Label htmlFor='destinatario_correo'>Correo</Label>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.destinatario_correo}
                                                invalidFeedback={formik.errors.destinatario_correo}>
                                                <Input
                                                    id='destinatario_correo'
                                                    name='destinatario_correo'
                                                    type='email'
                                                    onChange={formik.handleChange}
                                                    value={formik.values.destinatario_correo}
                                                    onBlur={formik.handleBlur}
                                                />
                                            </Validation>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                        </div>
                    )}

                    {/* Paso 2: Plan y servicios */}
                    {step === 2 && (
                        <SelectorPlanServicios
                            value={seleccionPlan}
                            onChange={setSeleccionPlan}
                        />
                    )}

                    {/* Paso 3: Licencias (solo tipo licencia) */}
                    {step === 3 && (
                        <div className='flex flex-col gap-3'>
                            <p className='text-sm text-zinc-500'>
                                Agrega las licencias que incluira este contrato. Puedes omitir
                                este paso y agregarlas mas tarde.
                            </p>
                            {licFormik.values.licencias.length > 0 && (
                                <Table>
                                    <THead>
                                        <Tr>
                                            <Th>Licencia</Th>
                                            <Th>Cupos</Th>
                                            <Th>Vigencia</Th>
                                            <Th>{' '}</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {licFormik.values.licencias.map((lic, i) => (
                                            <Tr key={i}>
                                                <Td>{getLicenciaNombre(lic.licencia_id)}</Td>
                                                <Td>{lic.cantidad}</Td>
                                                <Td>
                                                    <span className='text-sm'>
                                                        {lic.fecha_inicio
                                                            ? dayjs(lic.fecha_inicio).format(
                                                                  'DD/MM/YY',
                                                              )
                                                            : ''}{' '}
                                                        {'->'}{' '}
                                                        {lic.fecha_fin
                                                            ? dayjs(lic.fecha_fin).format(
                                                                  'DD/MM/YY',
                                                              )
                                                            : ''}
                                                    </span>
                                                </Td>
                                                <Td>
                                                    {!esLicenciaInicial(i) && (
                                                        <Button
                                                            icon='HeroTrash'
                                                            size='sm'
                                                            color='red'
                                                            onClick={() => {
                                                                licFormik.setFieldValue(
                                                                    'licencias',
                                                                    licFormik.values.licencias.filter(
                                                                        (_, idx) => idx !== i,
                                                                    ),
                                                                );
                                                            }}
                                                        />
                                                    )}
                                                </Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                            )}
                            <Button icon='HeroPlus' onClick={() => setModalAddLicencia(true)}>
                                Agregar licencia
                            </Button>
                        </div>
                    )}

                    {/* Paso 4: Revision */}
                    {step === 4 && (
                        <div className='flex flex-col gap-3'>
                            <p className='text-sm text-zinc-500'>
                                Revisa los datos antes de crear el contrato.
                            </p>
                            <div className='grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                                <ResumenItem label='Nombre' valor={formik.values.nombre} />
                                <ResumenItem label='Tipo' valor={tipoLabel} />
                                <ResumenItem label='Moneda' valor={formik.values.moneda_cobro} />
                                <ResumenItem
                                    label='Forma de pago'
                                    valor={
                                        FORMA_PAGO_OPTIONS.find(
                                            (option) =>
                                                option.value ===
                                                formik.values.forma_pago_contractual,
                                        )?.label ?? formik.values.forma_pago_contractual
                                    }
                                />
                                <ResumenItem
                                    label='Fecha inicio'
                                    valor={
                                        formik.values.fecha_inicio
                                            ? dayjs(formik.values.fecha_inicio).format(
                                                  'DD/MM/YYYY',
                                              )
                                            : '-'
                                    }
                                />
                                <ResumenItem
                                    label='Fecha fin'
                                    valor={
                                        formik.values.fecha_fin
                                            ? dayjs(formik.values.fecha_fin).format('DD/MM/YYYY')
                                            : 'Sin fecha fin'
                                    }
                                />
                                {formik.values.observaciones && (
                                    <div className='col-span-full'>
                                        <ResumenItem
                                            label='Observaciones'
                                            valor={formik.values.observaciones}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className='rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                                <span className='text-xs font-semibold text-zinc-500'>
                                    Destinatario principal
                                </span>
                                <div className='mt-2 text-sm'>
                                    {formik.values.destinatario_modo === 'interno'
                                        ? usuariosCliente.find(
                                              (usuario) =>
                                                  String(usuario.id) ===
                                                  formik.values.destinatario_interno_id,
                                          )?.nombre_usuario ??
                                          'Sin destinatario seleccionado'
                                        : formik.values.destinatario_nombre || 'Sin destinatario seleccionado'}
                                </div>
                                <div className='text-xs text-zinc-500'>
                                    {formik.values.destinatario_modo === 'interno'
                                        ? usuariosCliente.find(
                                              (usuario) =>
                                                  String(usuario.id) ===
                                                  formik.values.destinatario_interno_id,
                                          )?.email_usuario ?? ''
                                        : formik.values.destinatario_correo}
                                </div>
                            </div>

                            {licFormik.values.condiciones_especiales.length > 0 && (
                                <div className='rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                                    <span className='text-xs font-semibold text-zinc-500'>
                                        Condiciones especiales
                                    </span>
                                    <div className='mt-2 flex flex-col gap-1'>
                                        {licFormik.values.condiciones_especiales.map((condicion, index) => (
                                            <div key={index} className='text-sm'>
                                                {condicion.condicion_id
                                                    ? condicionesCatalogo.find(
                                                          (item) => item.id === condicion.condicion_id,
                                                      )?.titulo ?? `Condicion #${condicion.condicion_id}`
                                                    : condicion.texto}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resumen de servicios/plan */}
                            {esServicios &&
                                (seleccionPlan.plan_id !== null ||
                                    seleccionPlan.servicios.length > 0) && (
                                    <div className='rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                                        <span className='text-xs font-semibold text-zinc-500'>
                                            Servicios
                                        </span>
                                        <div className='mt-2 flex flex-col gap-1'>
                                            {seleccionPlan.modo === 'plan' &&
                                                seleccionPlan.plan_id && (
                                                    <div className='flex items-center justify-between text-sm'>
                                                        <div>
                                                            <span className='font-medium'>
                                                                Plan:{' '}
                                                                {planes.find(
                                                                    (p) =>
                                                                        p.id ===
                                                                        seleccionPlan.plan_id,
                                                                )?.nombre ??
                                                                    `#${seleccionPlan.plan_id}`}
                                                            </span>
                                                            <div className='text-xs text-zinc-500'>
                                                                {formatCurrencyByMoneda(
                                                                    seleccionPlan.plan_precio_unitario,
                                                                    monedaContrato,
                                                                )}{' '}
                                                                c/u
                                                            </div>
                                                        </div>
                                                        <div className='text-right text-zinc-500'>
                                                            <div>x{seleccionPlan.plan_cantidad}</div>
                                                            <div className='text-xs'>
                                                                {formatCurrencyByMoneda(
                                                                    totalPlanSeleccionado,
                                                                    monedaContrato,
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            {seleccionPlan.servicios.length > 0 && (
                                                <>
                                                    <span className='mt-1 text-xs text-zinc-400'>
                                                        {seleccionPlan.modo === 'plan'
                                                            ? 'Addons:'
                                                            : 'Servicios individuales:'}
                                                    </span>
                                                    {seleccionPlan.servicios.map((s) => {
                                                        const serv = serviciosCatalogo.find(
                                                            (sc) => sc.id === s.servicio_id,
                                                        );
                                                        return (
                                                            <div
                                                                key={s.servicio_id}
                                                                className='flex items-center justify-between text-sm'>
                                                                <div>
                                                                    <span>
                                                                        {serv?.nombre ??
                                                                            `Servicio #${s.servicio_id}`}
                                                                    </span>
                                                                    <div className='text-xs text-zinc-500'>
                                                                        {formatCurrencyByMoneda(
                                                                            s.precio_unitario,
                                                                            monedaContrato,
                                                                        )}{' '}
                                                                        c/u
                                                                    </div>
                                                                </div>
                                                                <div className='text-right text-zinc-500'>
                                                                    <div>x{s.cantidad}</div>
                                                                    <div className='text-xs'>
                                                                        {formatCurrencyByMoneda(
                                                                            s.cantidad *
                                                                                s.precio_unitario,
                                                                            monedaContrato,
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </div>
                                        <div className='mt-3 border-t border-zinc-200 pt-3 text-right text-sm font-medium dark:border-zinc-700'>
                                            Total servicios:{' '}
                                            {formatCurrencyByMoneda(
                                                totalPlanSeleccionado +
                                                    totalServiciosSeleccionados,
                                                monedaContrato,
                                            )}
                                        </div>
                                    </div>
                                )}

                            {esServicios &&
                                seleccionPlan.plan_id === null &&
                                seleccionPlan.servicios.length === 0 && (
                                    <p className='text-sm text-zinc-400'>
                                        No se seleccionaron servicios. Podras agregarlos
                                        despues.
                                    </p>
                                )}

                            {/* Resumen de licencias */}
                            {esLicencia && licFormik.values.licencias.length > 0 && (
                                <div className='rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                                    <span className='text-xs font-semibold text-zinc-500'>
                                        Licencias ({licFormik.values.licencias.length})
                                    </span>
                                    <div className='mt-2 flex flex-col gap-1'>
                                        {licFormik.values.licencias.map((lic, i) => (
                                            <div
                                                key={i}
                                                className='flex items-center justify-between text-sm'>
                                                <div>
                                                    <span>
                                                        {getLicenciaNombre(lic.licencia_id)}
                                                    </span>
                                                    <div className='text-xs text-zinc-500'>
                                                        {formatCurrencyByMoneda(
                                                            lic.precio_unitario,
                                                            (lic.tipo_moneda ||
                                                                monedaContrato) as
                                                                | 'CLP'
                                                                | 'UF'
                                                                | 'USD',
                                                        )}{' '}
                                                        c/u
                                                    </div>
                                                </div>
                                                <div className='text-right text-zinc-500'>
                                                    <div>{lic.cantidad} cupos</div>
                                                    <div className='text-xs'>
                                                        {formatCurrencyByMoneda(
                                                            lic.cantidad * lic.precio_unitario,
                                                            (lic.tipo_moneda ||
                                                                monedaContrato) as
                                                                | 'CLP'
                                                                | 'UF'
                                                                | 'USD',
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className='mt-3 border-t border-zinc-200 pt-3 text-right text-sm font-medium dark:border-zinc-700'>
                                        Total licencias:{' '}
                                        {formatCurrencyByMoneda(
                                            totalLicenciasSeleccionadas,
                                            monedaContrato,
                                        )}
                                    </div>
                                </div>
                            )}

                            {esLicencia && licFormik.values.licencias.length === 0 && (
                                <p className='text-sm text-zinc-400'>
                                    No se agregaron licencias. Podras agregarlas despues.
                                </p>
                            )}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild>
                        <span className='text-xs text-zinc-400'>
                            Paso{' '}
                            {
                                [
                                    { key: 1, visible: true },
                                    { key: 2, visible: esServicios },
                                    { key: 3, visible: esLicencia },
                                    { key: 4, visible: true },
                                ]
                                    .filter((p) => p.visible)
                                    .findIndex((p) => p.key === step) + 1
                            }{' '}
                            de {2 + (esServicios ? 1 : 0) + (esLicencia ? 1 : 0)}
                        </span>
                    </ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red' onClick={handleClose}>
                            Cancelar
                        </Button>
                        {step > 1 && <Button onClick={handleAtras}>Atras</Button>}
                        {step < 4 && (
                            <Button variant='solid' onClick={handleSiguiente}>
                                Siguiente
                            </Button>
                        )}
                        {step === 4 && (
                            <Button
                                variant='solid'
                                isLoading={formik.isSubmitting}
                                onClick={() => formik.handleSubmit()}>
                                Crear contrato
                            </Button>
                        )}
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>

            <ModalLicenciaContrato
                isOpen={modalAddLicencia}
                onClose={() => setModalAddLicencia(false)}
                formik={licFormik}
                listaLicencias={listaLicencias}
            />
        </>
    );
}

// Sub-componente: linea de resumen

const ResumenItem = ({ label, valor }: { label: string; valor: string }) => (
    <div>
        <span className='text-xs text-zinc-500'>{label}</span>
        <p className='text-sm font-medium'>{valor}</p>
    </div>
);

export default CrearContratoDelCliente;
