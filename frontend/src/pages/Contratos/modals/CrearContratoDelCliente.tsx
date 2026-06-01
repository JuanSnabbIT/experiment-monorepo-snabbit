import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Icon from '@/components/icon/Icon';
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
import {
    IContratoBorradorPayload,
    ICotizacionVinculadaResumen,
    ICuotaVenta,
} from '@/interface/contrato.interface';
import { IRelacionEmpresa } from '@/interface/empresas.interface';
import { useAppSelector } from '@/store';
import {
    useCreateContratoCompletoMutation,
    useGetCondicionesEspecialesQuery,
    useGetCotizacionesDisponiblesClienteQuery,
    useGetLicenciasCatalogoQuery,
    useGetPlanesServicioQuery,
    useGetServiciosQuery
} from '@/store/slices/contratos/contratoApi';
import {
    useGetPlantillasContratoQuery,
} from '@/store/slices/contratos/plantillaContratoApi';
import { useGetTipoCambioQuery } from '@/store/slices/cotizaciones/cotizacionApi';
import { useGetUsuariosTodoElClienteQuery } from '@/store/slices/empresa/empresaApi';
import { convertCurrency } from '@/utils/currency';
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

type TWizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEP_LABELS: Record<TWizardStep, string> = {
    1: 'Datos b\u00e1sicos',
    2: 'Configuraci\u00f3n comercial',
    3: 'Destinatario',
    4: 'Plan y Servicios',
    5: 'Licencias',
    6: 'Cotizaciones',
    7: 'Revisi\u00f3n',
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

const FORMA_PAGO_VENTA_OPTIONS: TSelectOption[] = [
    { value: 'contado', label: 'Contado' },
    { value: 'cuotas', label: 'Cuotas' },
];

type THitoPagoVenta = NonNullable<ICuotaVenta['hito_pago_tipo']>;

type TFormaPagoContractual = 'mensual' | 'anual' | 'pago_unico';

type TFormaPagoVenta = 'contado' | 'cuotas';

interface ICrearContratoFormValues {
    nombre: string;
    fecha_inicio: string;
    fecha_fin: string;
    observaciones: string;
    tipo: string;
    moneda_cobro: 'CLP' | 'UF' | 'USD';
    forma_pago_contractual: TFormaPagoContractual;
    forma_pago_venta: TFormaPagoVenta;
    cuotas_venta: ICuotaVenta[];
    plantilla: string;
    dias_aviso_termino: number;
    requiere_nda: boolean;
    destinatario_modo: 'interno' | 'externo';
    destinatario_interno_id: string;
    destinatario_nombre: string;
    destinatario_correo: string;
    condicion_catalogo_id: string;
    condicion_texto: string;
}

const HITO_PAGO_VENTA_LABELS: Record<THitoPagoVenta, string> = {
    inicio: 'Inicio',
    entrega_intermedia: 'Entrega intermedia',
    entrega_final: 'Entrega final',
    personalizado: 'Personalizado',
};

const HITO_PAGO_VENTA_OPTIONS: TSelectOption[] = [
    { value: 'inicio', label: HITO_PAGO_VENTA_LABELS.inicio },
    { value: 'entrega_intermedia', label: HITO_PAGO_VENTA_LABELS.entrega_intermedia },
    { value: 'entrega_final', label: HITO_PAGO_VENTA_LABELS.entrega_final },
    { value: 'personalizado', label: HITO_PAGO_VENTA_LABELS.personalizado },
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

    const formatted = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: moneda,
        maximumFractionDigits: moneda === 'USD' ? 1 : 0,
    }).format(value);

    return `${formatted} ${moneda}`;
};

const getTotalPorFormaPagoContractual = (
    precioUnitario: number,
    cantidad: number,
    formaPagoContractual: 'mensual' | 'anual' | 'pago_unico',
    vecesPorMes = 1,
): number => {
    const subtotalMensual = precioUnitario * cantidad * vecesPorMes;

    if (formaPagoContractual === 'pago_unico') {
        return precioUnitario * cantidad;
    }

    if (formaPagoContractual === 'anual') {
        return subtotalMensual * 12;
    }

    return subtotalMensual;
};

const normalizeCurrency = (currency?: string | null): 'CLP' | 'UF' | 'USD' => {
    if (currency === '1') return 'USD';
    if (currency === '2') return 'CLP';
    if (currency === '3') return 'UF';
    if (currency === 'CLP' || currency === 'UF' || currency === 'USD') return currency;
    return 'CLP';
};

const getHitoPagoVentaLabel = (tipo?: THitoPagoVenta | null) =>
    (tipo ? HITO_PAGO_VENTA_LABELS[tipo] : null) || HITO_PAGO_VENTA_LABELS.inicio;

const buildCuotaVenta = (
    orden: number,
    hitoPagoTipo: THitoPagoVenta = orden === 1 ? 'inicio' : 'entrega_intermedia',
): ICuotaVenta => ({
    orden,
    porcentaje: orden === 1 ? 100 : 0,
    hito_pago_tipo: hitoPagoTipo,
    hito_pago_descripcion: getHitoPagoVentaLabel(hitoPagoTipo),
});

const buildDefaultCuotasVenta = (): ICuotaVenta[] => [buildCuotaVenta(1, 'inicio')];

const getCuotaFieldError = (
    cuotasErrors: unknown,
    index: number,
    field: 'porcentaje' | 'hito_pago_tipo' | 'hito_pago_descripcion',
) => {
    if (!Array.isArray(cuotasErrors)) return null;
    const cuotaError = cuotasErrors[index];
    if (!cuotaError || typeof cuotaError !== 'object') return null;
    const value = (cuotaError as Record<string, unknown>)[field];
    return typeof value === 'string' ? value : null;
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
    esVenta,
}: {
    step: TWizardStep;
    esServicios: boolean;
    esLicencia: boolean;
    esVenta: boolean;
}) => {
    const pasos: { key: TWizardStep; label: string; visible: boolean }[] = [
        { key: 1, label: STEP_LABELS[1], visible: true },
        { key: 2, label: STEP_LABELS[2], visible: true },
        { key: 3, label: STEP_LABELS[3], visible: true },
        { key: 4, label: STEP_LABELS[4], visible: esServicios },
        { key: 5, label: STEP_LABELS[5], visible: esLicencia },
        { key: 6, label: STEP_LABELS[6], visible: esVenta },
        { key: 7, label: STEP_LABELS[7], visible: true },
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
    const [cotizacionesSeleccionadas, setCotizacionesSeleccionadas] = useState<number[]>([]);
    const [licenciasStepError, setLicenciasStepError] = useState<string | null>(null);

    // Estado para la seleccion de plan/servicios (Paso 2)
    const SELECCION_INICIAL: ISeleccionPlanServicios = {
        modo: 'plan',
        plan_id: null,
        plan_cantidad: 1,
        plan_precio_unitario: 0,
        plan_descuento_anual_porcentaje: null,
        plan_num_visitas_mensuales: null,
        servicios: [],
    };
    const [seleccionPlan, setSeleccionPlan] = useState<ISeleccionPlanServicios>(SELECCION_INICIAL);

    const { data: listaLicencias = [] } = useGetLicenciasCatalogoQuery();
    const { data: planes = [] } = useGetPlanesServicioQuery();
    const { data: serviciosCatalogo = [] } = useGetServiciosQuery();
    const { data: condicionesCatalogo = [] } = useGetCondicionesEspecialesQuery();
    const fechaTipoCambio = new Date().toISOString().slice(0, 10);
    const { data: tipoCambio } = useGetTipoCambioQuery(fechaTipoCambio);
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

    const formik = useFormik<ICrearContratoFormValues>({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            fecha_inicio: '',
            fecha_fin: '',
            observaciones: '',
            tipo: tipoFijo ?? '',
            moneda_cobro: 'USD',
            forma_pago_contractual: 'mensual',
            forma_pago_venta: 'contado',
            cuotas_venta: [] as ICuotaVenta[],
            plantilla: '',
            dias_aviso_termino: 60,
            requiere_nda: false,
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
            plantilla: Yup.string().required('Debes seleccionar una plantilla'),
            moneda_cobro: Yup.string().oneOf(['CLP', 'UF', 'USD']).required('Requerido'),
            forma_pago_contractual: Yup.string()
                .oneOf(['mensual', 'anual', 'pago_unico'])
                .required('Requerido'),
            forma_pago_venta: Yup.string().when('tipo', {
                is: 'venta',
                then: (schema) => schema.oneOf(['contado', 'cuotas']).required('Requerido'),
                otherwise: (schema) => schema.notRequired(),
            }),
            cuotas_venta: Yup.array()
                .of(
                    Yup.object({
                        orden: Yup.number().min(1).required(),
                        porcentaje: Yup.number().moreThan(0, 'Debe ser mayor a 0').required(),
                        hito_pago_tipo: Yup.string()
                            .oneOf([
                                'inicio',
                                'entrega_intermedia',
                                'entrega_final',
                                'personalizado',
                            ])
                            .required('Selecciona cuando se cobra la cuota'),
                        hito_pago_descripcion: Yup.string().when('hito_pago_tipo', {
                            is: 'personalizado',
                            then: (schema) =>
                                schema
                                    .trim()
                                    .required('Describe el hito de cobro para esta cuota'),
                            otherwise: (schema) => schema.notRequired(),
                        }),
                    }),
                )
                .when(['tipo', 'forma_pago_venta'], {
                    is: (tipo: string, formaPagoVenta: string) =>
                        tipo === 'venta' && formaPagoVenta === 'cuotas',
                    then: (schema) =>
                        schema
                            .min(1, 'Debes agregar al menos una cuota')
                            .test(
                                'sum-100',
                                'La suma de cuotas debe ser exactamente 100%',
                                (value) =>
                                    Math.round(
                                        (value ?? []).reduce(
                                            (acc, cuota) => acc + Number(cuota?.porcentaje || 0),
                                            0,
                                        ) * 100,
                                    ) === 10000,
                            ),
                    otherwise: (schema) => schema.notRequired(),
                }),
            dias_aviso_termino: Yup.number()
                .min(0, 'Debe ser mayor o igual a 0')
                .when('fecha_fin', {
                    is: (fechaFin: string) => Boolean(fechaFin),
                    then: (schema) => schema.required('Requerido'),
                    otherwise: (schema) => schema.notRequired(),
                }),
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
                    forma_pago_contractual: (values.tipo === 'venta'
                        ? 'pago_unico'
                        : values.forma_pago_contractual) as 'mensual' | 'anual' | 'pago_unico',
                    forma_pago_venta:
                        values.tipo === 'venta'
                            ? (values.forma_pago_venta as 'contado' | 'cuotas')
                            : undefined,
                    cuotas_venta:
                        values.tipo === 'venta' && values.forma_pago_venta === 'cuotas'
                            ? values.cuotas_venta.map((cuota) => ({
                                  orden: cuota.orden,
                                  porcentaje: Number(cuota.porcentaje),
                                  hito_pago_tipo: cuota.hito_pago_tipo,
                                  hito_pago_descripcion:
                                      cuota.hito_pago_tipo === 'personalizado'
                                          ? cuota.hito_pago_descripcion?.trim() || ''
                                          : getHitoPagoVentaLabel(
                                                cuota.hito_pago_tipo as THitoPagoVenta | null,
                                            ),
                              }))
                            : [],
                    plantilla: Number(values.plantilla),
                    dias_aviso_termino: values.fecha_fin
                        ? values.dias_aviso_termino
                        : undefined,
                    requiere_nda: values.requiere_nda,
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
                    values.tipo === 'licencia'
                        ? { modo: 'vacio' as const }
                        : seleccionPlan.plan_id !== null || seleccionPlan.servicios.length > 0
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
                                            ...(seleccionPlan.plan_descuento_anual_porcentaje != null && {
                                                descuento_anual_porcentaje:
                                                    seleccionPlan.plan_descuento_anual_porcentaje,
                                            }),
                                            ...(seleccionPlan.plan_num_visitas_mensuales != null && {
                                                num_visitas_mensuales:
                                                    seleccionPlan.plan_num_visitas_mensuales,
                                            }),
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
                        cantidad: lic.cantidad,
                        fecha_inicio: lic.fecha_inicio ?? null,
                        fecha_fin: lic.fecha_fin ?? null,
                    })),
                    condiciones_especiales: licFormik.values.condiciones_especiales,
                    cotizaciones_ids:
                        esVenta && cotizacionesSeleccionadas.length > 0
                            ? cotizacionesSeleccionadas
                            : undefined,
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
    const esVenta = formik.values.tipo === 'venta' || tipoFijo === 'venta';
    const esServicios =
        formik.values.tipo === 'servicios' ||
        tipoFijo === 'servicios';

    useEffect(() => {
        if (!esVenta) return;
        if (formik.values.forma_pago_contractual !== 'pago_unico') {
            formik.setFieldValue('forma_pago_contractual', 'pago_unico');
        }
        if (
            formik.values.forma_pago_venta === 'cuotas' &&
            formik.values.cuotas_venta.length === 0
        ) {
            formik.setFieldValue('cuotas_venta', buildDefaultCuotasVenta());
        }
        if (
            formik.values.forma_pago_venta === 'contado' &&
            formik.values.cuotas_venta.length > 0
        ) {
            formik.setFieldValue('cuotas_venta', []);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [esVenta, formik.values.forma_pago_venta, formik.values.cuotas_venta.length]);

    const { data: cotizacionesDisponibles = [] } = useGetCotizacionesDisponiblesClienteQuery(
        detalleCliente?.info_cliente.id ?? '',
        {
            skip: !detalleCliente?.info_cliente.id || !isOpen || !esVenta,
        },
    );

    const monedaContrato = formik.values.moneda_cobro as 'CLP' | 'UF' | 'USD';
    const formaPagoContractual = formik.values.forma_pago_contractual as 'mensual' | 'anual' | 'pago_unico';
    const cantidadPorModoPagoResumen = formaPagoContractual === 'anual' ? 12 : 1;
    const planSeleccionadoResumen = planes.find((p) => p.id === seleccionPlan.plan_id);
    const totalPlanSeleccionado =
        seleccionPlan.modo === 'plan' && seleccionPlan.plan_id
            ? convertCurrency(
                  formaPagoContractual === 'anual' && seleccionPlan.plan_descuento_anual_porcentaje != null
                      ? seleccionPlan.plan_precio_unitario * 12 * (1 - seleccionPlan.plan_descuento_anual_porcentaje / 100) * seleccionPlan.plan_cantidad
                      : getTotalPorFormaPagoContractual(
                            seleccionPlan.plan_precio_unitario,
                            seleccionPlan.plan_cantidad,
                            formaPagoContractual,
                        ),
                  planSeleccionadoResumen?.tipo_moneda,
                  monedaContrato,
                  tipoCambio,
              )
            : 0;
    const getLicenciaPrecioPartner = (licId?: number): number =>
        listaLicencias.find((l) => l.id === licId)?.precio_partner ?? 0;

    const totalServiciosSeleccionados = seleccionPlan.servicios.reduce((acc, item) => {
        const servicio = serviciosCatalogo.find((sc) => sc.id === item.servicio_id);
        const subtotal = getTotalPorFormaPagoContractual(
            item.precio_unitario,
            item.cantidad,
            formaPagoContractual,
        );
        return acc + convertCurrency(subtotal, servicio?.tipo_moneda, monedaContrato, tipoCambio);
    }, 0);
    const totalLicenciasSeleccionadas = licFormik.values.licencias.reduce(
        (acc, item) => acc + item.cantidad * getLicenciaPrecioPartner(item.licencia_id),
        0,
    );
    const totalCotizacionesSeleccionadas = cotizacionesSeleccionadas.reduce((acc, cotizacionId) => {
        const cotizacion = cotizacionesDisponibles.find(
            (item: ICotizacionVinculadaResumen) => item.id === cotizacionId,
        );
        if (!cotizacion) return acc;
        const total =
            cotizacion.total_convertido != null
                ? Number(cotizacion.total_convertido)
                : convertCurrency(
                      Number(cotizacion.total_estimado || 0),
                      cotizacion.tipo_moneda,
                      monedaContrato,
                      tipoCambio,
                  );
        return acc + total;
    }, 0);

    const handleClose = () => {
        if (isControlledExternally) {
            onExternalClose?.();
        } else {
            setInternalIsOpen(false);
        }
        setStep(1);
        setLicenciasStepError(null);
        setSeleccionPlan(SELECCION_INICIAL);
        setCotizacionesSeleccionadas([]);
        setModalAddLicencia(false);
        formik.resetForm();
        licFormik.resetForm();
    };

    const validarPasoLicencias = (): boolean => {
        if (!esLicencia) {
            return true;
        }

        if (licFormik.values.licencias.length === 0) {
            setLicenciasStepError(
                'Debes agregar al menos una licencia para continuar con un contrato de tipo licenciamiento.',
            );
            return false;
        }

        const indexSinCatalogo = licFormik.values.licencias.findIndex((lic) => !lic.licencia_id);
        if (indexSinCatalogo >= 0) {
            setLicenciasStepError(
                `La licencia #${indexSinCatalogo + 1} no tiene un item de catalogo seleccionado.`,
            );
            return false;
        }

        const indexSinCantidad = licFormik.values.licencias.findIndex(
            (lic) => Number(lic.cantidad || 0) <= 0,
        );
        if (indexSinCantidad >= 0) {
            setLicenciasStepError(
                `La licencia #${indexSinCantidad + 1} debe tener una cantidad mayor a 0.`,
            );
            return false;
        }

        const indexSinPrecio = licFormik.values.licencias.findIndex(
            (lic) => getLicenciaPrecioPartner(lic.licencia_id) <= 0,
        );
        if (indexSinPrecio >= 0) {
            setLicenciasStepError(
                `La licencia #${indexSinPrecio + 1} debe tener un precio unitario mayor a 0.`,
            );
            return false;
        }

        setLicenciasStepError(null);
        return true;
    };

    const handleSiguiente = async () => {
        if (step === 1) {
            const errors = await formik.validateForm();
            const step1Fields = ['nombre', 'tipo', 'fecha_inicio', 'fecha_fin', 'observaciones'];
            formik.setTouched(
                step1Fields.reduce((acc, key) => ({ ...acc, [key]: true }), {}),
            );
            const step1Errors = step1Fields.filter((k) => errors[k as keyof typeof errors]);
            if (step1Errors.length > 0) return;
            setStep(2);
        } else if (step === 2) {
            const errors = await formik.validateForm();
            const step2Fields = esVenta
                ? ['plantilla', 'moneda_cobro', 'forma_pago_venta', 'cuotas_venta', 'dias_aviso_termino']
                : ['plantilla', 'moneda_cobro', 'forma_pago_contractual', 'dias_aviso_termino'];
            formik.setTouched(
                step2Fields.reduce((acc, key) => ({ ...acc, [key]: true }), {}),
            );
            const step2Errors = step2Fields.filter((k) => errors[k as keyof typeof errors]);
            if (step2Errors.length > 0) return;
            setStep(3);
        } else if (step === 3) {
            const errors = await formik.validateForm();
            const step3Fields = ['destinatario_modo', 'destinatario_interno_id', 'destinatario_nombre', 'destinatario_correo'];
            formik.setTouched(
                step3Fields.reduce((acc, key) => ({ ...acc, [key]: true }), {}),
            );
            const step3Errors = step3Fields.filter((k) => errors[k as keyof typeof errors]);
            if (step3Errors.length > 0) return;
            setStep(esServicios ? 4 : esLicencia ? 5 : esVenta ? 6 : 7);
        } else if (step === 4) {
            setStep(esLicencia ? 5 : esVenta ? 6 : 7);
        } else if (step === 5) {
            if (!validarPasoLicencias()) {
                return;
            }
            setStep(esVenta ? 6 : 7);
        } else if (step === 6) {
            if (esVenta && cotizacionesSeleccionadas.length === 0) {
                toast.error('Debes seleccionar al menos una cotización aceptada para continuar.');
                return;
            }
            setStep(7);
        }
    };

    const handleAtras = () => {
        if (step === 7) {
            setStep(esVenta ? 6 : esLicencia ? 5 : esServicios ? 4 : 3);
        } else if (step === 6) {
            setStep(esLicencia ? 5 : esServicios ? 4 : 3);
        } else if (step === 5) {
            setStep(esServicios ? 4 : 3);
        } else if (step === 4) {
            setStep(3);
        } else if (step === 3) {
            setStep(2);
        } else if (step === 2) {
            setStep(1);
        }
    };

    useEffect(() => {
        if (licenciasStepError) {
            setLicenciasStepError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [licFormik.values.licencias]);

    const getLicenciaNombre = (licId?: number) =>
        listaLicencias.find((l) => l.id === licId)?.nombre ?? '';

    const getLicenciaTipoMoneda = (licId?: number): 'CLP' | 'USD' | 'UF' =>
        ((listaLicencias.find((l) => l.id === licId)?.moneda as 'CLP' | 'USD' | 'UF' | undefined) ?? monedaContrato) as 'CLP' | 'USD' | 'UF';

    const getLicenciaModalidadLabel = (licId?: number) => {
        const licencia = listaLicencias.find((item) => item.id === licId);
        if (!licencia) {
            return '-';
        }
        if (licencia.modalidad_base === 'P1M') {
            return 'Compromiso mensual / P1M';
        }
        if (licencia.modalidad_base === 'P1Y') {
            return licencia.modalidad_anual_forma_pago === 'PAGO_MENSUAL'
                ? 'Compromiso anual pago mensual / P1Y-M'
                : 'Compromiso anual pago unico / P1Y-A';
        }
        if (licencia.modalidad_base === 'PAGO_UNICO') {
            return 'Perpetua';
        }
        return '-';
    };

    const licenciasChecklist = {
        tieneLicencias: licFormik.values.licencias.length > 0,
        catalogoCompleto:
            licFormik.values.licencias.length > 0 &&
            licFormik.values.licencias.every((lic) => Boolean(lic.licencia_id)),
        cantidadValida:
            licFormik.values.licencias.length > 0 &&
            licFormik.values.licencias.every((lic) => Number(lic.cantidad || 0) > 0),
        precioValido:
            licFormik.values.licencias.length > 0 &&
            licFormik.values.licencias.every((lic) => getLicenciaPrecioPartner(lic.licencia_id) > 0),
        vigenciaCompleta:
            licFormik.values.licencias.length > 0 &&
            licFormik.values.licencias.every((lic) => Boolean(lic.fecha_inicio && lic.fecha_fin)),
    };

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
                size='lg'
                isScrollable>
                <ModalHeader>
                    <Badge className='text-xl'>
                        Crear Contrato
                    </Badge>
                </ModalHeader>
                <>
                <ModalBody isScrollable>
                    <WizardStepper step={step} esServicios={esServicios} esLicencia={esLicencia} esVenta={esVenta} />

                    {/* Paso 1: Datos básicos */}
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
                                                const value = (e as TSelectOption).value;
                                                formik.setFieldValue('tipo', value);
                                            }}
                                            placeholder='Seleccione un tipo'
                                            noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                        />
                                    </Validation>
                                )}
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
                        </div>
                    )}

                    {/* Paso 2: Configuración comercial + Plantilla */}
                    {step === 2 && (
                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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
                                <Label htmlFor={esVenta ? 'forma_pago_venta' : 'forma_pago_contractual'}>
                                    Forma de pago{' '}
                                    <Tooltip text='Periodicidad de facturaci\u00f3n: mensual genera una prefactura por mes, anual genera una al a\u00f1o, pago \u00fanico genera una sola al activarse el contrato.'>
                                        <Icon icon='HeroInformationCircle' className='inline-block h-4 w-4 cursor-help text-zinc-400' />
                                    </Tooltip>
                                </Label>
                                <SelectReact
                                    name={esVenta ? 'forma_pago_venta' : 'forma_pago_contractual'}
                                    options={esVenta ? FORMA_PAGO_VENTA_OPTIONS : FORMA_PAGO_OPTIONS}
                                    value={
                                        (esVenta ? FORMA_PAGO_VENTA_OPTIONS : FORMA_PAGO_OPTIONS).find(
                                            (option) =>
                                                option.value ===
                                                (esVenta
                                                    ? formik.values.forma_pago_venta
                                                    : formik.values.forma_pago_contractual),
                                        ) ?? null
                                    }
                                    onChange={(option) =>
                                        formik.setFieldValue(
                                            esVenta ? 'forma_pago_venta' : 'forma_pago_contractual',
                                            (option as TSelectOption | null)?.value ??
                                                (esVenta ? 'contado' : 'mensual'),
                                        )
                                    }
                                    placeholder='Selecciona una forma de pago'
                                />
                                {esVenta && (
                                    <p className='mt-1 text-xs text-zinc-500'>
                                        Para venta el pago se configura como contado o cuotas.
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor='dias_aviso_termino'>
                                    Días de aviso previo{' '}
                                    <Tooltip text={!formik.values.fecha_fin
                                        ? 'La opción está bloqueada hasta que definas una fecha de término.'
                                        : 'Días antes del vencimiento en que el sistema enviará notificaciones automáticas al cliente y al equipo interno.'}>
                                        <Icon icon='HeroInformationCircle' className='inline-block h-4 w-4 cursor-help text-zinc-400' />
                                    </Tooltip>
                                </Label>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.dias_aviso_termino}
                                    invalidFeedback={formik.errors.dias_aviso_termino}>
                                    <Input
                                        id='dias_aviso_termino'
                                        name='dias_aviso_termino'
                                        type='number'
                                        onChange={formik.handleChange}
                                        value={formik.values.fecha_fin ? String(formik.values.dias_aviso_termino) : ''}
                                        onBlur={formik.handleBlur}
                                        disabled={!formik.values.fecha_fin}
                                        placeholder={!formik.values.fecha_fin ? 'Sin fecha de término' : undefined}
                                    />
                                </Validation>
                                <p className='mt-1 text-xs text-zinc-500'>
                                    Días de anticipación para notificar el término del contrato.
                                </p>
                            </div>
                            <div className='flex items-start gap-3 md:col-span-2'>
                                <Checkbox
                                    id='requiere_nda'
                                    name='requiere_nda'
                                    checked={formik.values.requiere_nda}
                                    onChange={formik.handleChange}
                                />
                                <div>
                                    <Label htmlFor='requiere_nda' className='cursor-pointer'>
                                        Requiere acuerdo de confidencialidad (NDA)
                                    </Label>
                                    <p className='mt-0.5 text-xs text-zinc-500'>
                                        Si activas esta opción, no se podrá enviar el contrato a aprobación del cliente sin un NDA firmado previamente.
                                    </p>
                                </div>
                            </div>
                            {esVenta && formik.values.forma_pago_venta === 'cuotas' && (
                                <div className='rounded-lg border border-zinc-200 p-4 md:col-span-2 dark:border-zinc-700'>
                                    <div className='mb-3 flex items-center justify-between gap-3'>
                                        <div>
                                            <p className='text-sm font-semibold text-zinc-800 dark:text-zinc-100'>
                                                Cuotas de venta
                                            </p>
                                            <p className='text-xs text-zinc-500'>
                                                La suma de porcentajes debe ser exactamente 100%.
                                            </p>
                                        </div>
                                        <Tooltip text='Agregar cuota'>
                                            <Button
                                                size='sm'
                                                variant='solid'
                                                color='blue'
                                                icon='HeroPlus'
                                                onClick={() =>
                                                    formik.setFieldValue('cuotas_venta', [
                                                        ...formik.values.cuotas_venta,
                                                        buildCuotaVenta(
                                                            formik.values.cuotas_venta.length + 1,
                                                        ),
                                                    ])
                                                }
                                            />
                                        </Tooltip>
                                    </div>
                                    <div className='space-y-3'>
                                        {formik.values.cuotas_venta.map((cuota, index) => (
                                            <div
                                                key={`cuota-${cuota.orden}-${index}`}
                                                className='grid gap-3 rounded-md border border-zinc-200 p-3 md:grid-cols-[120px,1fr,1fr,140px] dark:border-zinc-700'>
                                                <div className='flex items-center text-sm font-medium text-zinc-800 dark:text-zinc-100'>
                                                    Cuota {cuota.orden}
                                                </div>
                                                <div>
                                                    <Label htmlFor={`cuotas_venta.${index}.porcentaje`}>
                                                        Porcentaje
                                                    </Label>
                                                    <Input
                                                        id={`cuotas_venta.${index}.porcentaje`}
                                                        name={`cuotas_venta.${index}.porcentaje`}
                                                        type='number'
                                                        value={String(cuota.porcentaje)}
                                                        onChange={(event) => {
                                                            const next = [...formik.values.cuotas_venta];
                                                            next[index] = {
                                                                ...next[index],
                                                                porcentaje: Number(event.target.value),
                                                            };
                                                            formik.setFieldValue('cuotas_venta', next);
                                                        }}
                                                    />
                                                    {formik.submitCount > 0 &&
                                                        getCuotaFieldError(
                                                            formik.errors.cuotas_venta,
                                                            index,
                                                            'porcentaje',
                                                        ) && (
                                                            <p className='mt-1 text-xs text-red-500'>
                                                                {getCuotaFieldError(
                                                                    formik.errors.cuotas_venta,
                                                                    index,
                                                                    'porcentaje',
                                                                )}
                                                            </p>
                                                        )}
                                                </div>
                                                <div>
                                                    <Label htmlFor={`cuotas_venta.${index}.hito_pago_tipo`}>
                                                        Cuando se paga{' '}
                                                        <Tooltip text="Define qu\u00e9 evento activa el cobro de esta cuota. 'Inicio' = al firmar el contrato. 'Fin' = al entregar. 'Personalizado' = fecha o hito manual.">
                                                            <Icon icon='HeroInformationCircle' className='inline-block h-4 w-4 cursor-help text-zinc-400' />
                                                        </Tooltip>
                                                    </Label>
                                                    <SelectReact
                                                        name={`cuotas_venta.${index}.hito_pago_tipo`}
                                                        options={HITO_PAGO_VENTA_OPTIONS}
                                                        value={
                                                            HITO_PAGO_VENTA_OPTIONS.find(
                                                                (option) =>
                                                                    option.value === cuota.hito_pago_tipo,
                                                            ) ?? null
                                                        }
                                                        onChange={(option) => {
                                                            const tipo =
                                                                ((option as TSelectOption | null)
                                                                    ?.value as THitoPagoVenta | undefined) ??
                                                                'inicio';
                                                            const next = [...formik.values.cuotas_venta];
                                                            next[index] = {
                                                                ...next[index],
                                                                hito_pago_tipo: tipo,
                                                                hito_pago_descripcion:
                                                                    tipo === 'personalizado'
                                                                        ? next[index]
                                                                              .hito_pago_descripcion || ''
                                                                        : getHitoPagoVentaLabel(tipo),
                                                            };
                                                            formik.setFieldValue('cuotas_venta', next);
                                                        }}
                                                        placeholder='Selecciona un hito'
                                                    />
                                                    {cuota.hito_pago_tipo === 'personalizado' ? (
                                                        <div className='mt-2'>
                                                            <Input
                                                                id={`cuotas_venta.${index}.hito_pago_descripcion`}
                                                                name={`cuotas_venta.${index}.hito_pago_descripcion`}
                                                                type='text'
                                                                value={
                                                                    cuota.hito_pago_descripcion || ''
                                                                }
                                                                placeholder='Ej: Contra acta de recepcion'
                                                                onChange={(event) => {
                                                                    const next = [
                                                                        ...formik.values.cuotas_venta,
                                                                    ];
                                                                    next[index] = {
                                                                        ...next[index],
                                                                        hito_pago_descripcion:
                                                                            event.target.value,
                                                                    };
                                                                    formik.setFieldValue(
                                                                        'cuotas_venta',
                                                                        next,
                                                                    );
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <p className='mt-2 text-xs text-zinc-500'>
                                                            Se mostrara como:{' '}
                                                            {getHitoPagoVentaLabel(
                                                                cuota.hito_pago_tipo as THitoPagoVenta | null,
                                                            )}
                                                        </p>
                                                    )}
                                                    {formik.submitCount > 0 &&
                                                        (getCuotaFieldError(
                                                            formik.errors.cuotas_venta,
                                                            index,
                                                            'hito_pago_tipo',
                                                        ) ||
                                                            getCuotaFieldError(
                                                                formik.errors.cuotas_venta,
                                                                index,
                                                                'hito_pago_descripcion',
                                                            )) && (
                                                            <p className='mt-1 text-xs text-red-500'>
                                                                {getCuotaFieldError(
                                                                    formik.errors.cuotas_venta,
                                                                    index,
                                                                    'hito_pago_tipo',
                                                                ) ||
                                                                    getCuotaFieldError(
                                                                        formik.errors.cuotas_venta,
                                                                        index,
                                                                        'hito_pago_descripcion',
                                                                    )}
                                                            </p>
                                                        )}
                                                </div>
                                                <div className='flex items-end justify-end'>
                                                    <Tooltip text='Eliminar cuota'>
                                                        <Button
                                                            variant='solid'
                                                            icon='HeroTrash'
                                                            size='sm'
                                                            color='red'
                                                            isDisable={formik.values.cuotas_venta.length === 1}
                                                            onClick={() =>
                                                                formik.setFieldValue(
                                                                    'cuotas_venta',
                                                                    formik.values.cuotas_venta
                                                                        .filter((_, cuotaIndex) => cuotaIndex !== index)
                                                                        .map((item, cuotaIndex) => ({
                                                                            ...item,
                                                                            orden: cuotaIndex + 1,
                                                                        })),
                                                                )
                                                            }
                                                        />
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className='mt-3 flex items-center justify-between text-xs text-zinc-500'>
                                        <span>
                                            Suma actual:{' '}
                                            {formik.values.cuotas_venta.reduce(
                                                (acc, cuota) => acc + Number(cuota.porcentaje || 0),
                                                0,
                                            )}
                                            %
                                        </span>
                                        {totalCotizacionesSeleccionadas > 0 && (
                                            <span>
                                                Total estimado:{' '}
                                                {formatCurrencyByMoneda(
                                                    totalCotizacionesSeleccionadas,
                                                    monedaContrato,
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    {typeof formik.errors.cuotas_venta === 'string' && (
                                        <p className='mt-2 text-xs text-red-500'>
                                            {formik.errors.cuotas_venta}
                                        </p>
                                    )}
                                </div>
                            )}
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
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.plantilla}
                                        invalidFeedback={formik.errors.plantilla}>
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
                                            isDisabled={!tipoContratoSeleccionado}
                                            placeholder={
                                                tipoContratoSeleccionado
                                                    ? 'Selecciona una plantilla'
                                                    : 'Selecciona primero el tipo de contrato'
                                            }
                                            noOptionsMessage={() =>
                                                tipoContratoSeleccionado
                                                    ? 'No hay plantillas activas para este tipo'
                                                    : 'Selecciona primero el tipo de contrato'
                                            }
                                        />
                                    </Validation>
                                    <p className='mt-2 text-xs text-zinc-500'>
                                        La plantilla define la estructura del documento del contrato. Las secciones se generan automáticamente.
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
                        </div>
                    )}

                    {/* Paso 3: Destinatario */}
                    {step === 3 && (
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
                    )}

                    {/* Paso 4: Plan y servicios */}
                    {step === 4 && (
                        <SelectorPlanServicios
                            value={seleccionPlan}
                            onChange={setSeleccionPlan}
                            contractCurrency={monedaContrato}
                            contractPaymentMode={formik.values.forma_pago_contractual}
                            hidePlanInputs={true}
                            hideVisitasSection={true}
                        />
                    )}

                    {/* Paso 5: Licencias (solo tipo licencia) */}
                    {step === 5 && (
                        <div className='flex flex-col gap-3'>
                            <p className='text-sm text-zinc-500'>
                                Agrega las licencias que incluira este contrato. Este paso es
                                obligatorio para contratos de licenciamiento.
                            </p>

                            {licenciasStepError && (
                                <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200'>
                                    {licenciasStepError}
                                </div>
                            )}
                            {licFormik.values.licencias.length > 0 && (
                                <Table>
                                    <THead>
                                        <Tr>
                                            <Th>Licencia</Th>
                                            <Th>Modalidad</Th>
                                            <Th>Cupos</Th>
                                            <Th>Vigencia</Th>
                                            <Th>Total</Th>
                                            <Th>{' '}</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {licFormik.values.licencias.map((lic, i) => (
                                            <Tr key={i}>
                                                <Td>{getLicenciaNombre(lic.licencia_id)}</Td>
                                                <Td>
                                                    {getLicenciaModalidadLabel(lic.licencia_id)}
                                                </Td>
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
                                                    {formatCurrencyByMoneda(
                                                        lic.cantidad * getLicenciaPrecioPartner(lic.licencia_id),
                                                        monedaContrato,
                                                    )}
                                                </Td>
                                                <Td>
                                                    {!esLicenciaInicial(i) && (
                                                        <Tooltip text='Eliminar licencia'>
                                                            <Button
                                                                variant='solid'
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
                                                        </Tooltip>
                                                    )}
                                                </Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                            )}
                            {licFormik.values.licencias.length > 0 && (
                                <div className='text-right text-sm font-medium'>
                                    Total del paso:{' '}
                                    {formatCurrencyByMoneda(
                                        totalLicenciasSeleccionadas,
                                        monedaContrato,
                                    )}
                                </div>
                            )}
                            <Tooltip text='Agregar licencia'>
                                <Button variant='solid' color='blue' icon='HeroPlus' onClick={() => setModalAddLicencia(true)} />
                            </Tooltip>
                        </div>
                    )}

                    {/* Paso 6: Cotizaciones (solo tipo venta) */}
                    {step === 6 && (
                        <div className='flex flex-col gap-3'>
                            <p className='text-sm text-zinc-500'>
                                Selecciona cotizaciones aceptadas para vincular a este contrato
                                de venta. Puedes omitir este paso y vincularlas después.
                            </p>
                            {cotizacionesDisponibles.length === 0 ? (
                                <p className='text-sm text-zinc-400'>
                                    No hay cotizaciones aceptadas disponibles para este cliente.
                                </p>
                            ) : (
                                <Table>
                                    <THead>
                                        <Tr>
                                            <Th>{' '}</Th>
                                            <Th>N° Cotización</Th>
                                            <Th>Nombre</Th>
                                            <Th>Moneda</Th>
                                            <Th>Total original</Th>
                                            <Th>Total contrato</Th>
                                            <Th>Dolar obs.</Th>
                                            <Th>Items</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {cotizacionesDisponibles.map((cot: ICotizacionVinculadaResumen) => (
                                            <Tr
                                                key={cot.id}
                                                className={
                                                    cotizacionesSeleccionadas.includes(cot.id)
                                                        ? 'bg-blue-50 dark:bg-blue-950/30'
                                                        : 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                                }
                                                onClick={() =>
                                                    setCotizacionesSeleccionadas((prev) =>
                                                        prev.includes(cot.id)
                                                            ? prev.filter((x) => x !== cot.id)
                                                            : [...prev, cot.id],
                                                    )
                                                }>
                                                <Td>
                                                    <input
                                                        type='checkbox'
                                                        checked={cotizacionesSeleccionadas.includes(
                                                            cot.id,
                                                        )}
                                                        onChange={() =>
                                                            setCotizacionesSeleccionadas((prev) =>
                                                                prev.includes(cot.id)
                                                                    ? prev.filter(
                                                                          (x) => x !== cot.id,
                                                                      )
                                                                    : [...prev, cot.id],
                                                            )
                                                        }
                                                        className='h-4 w-4'
                                                    />
                                                </Td>
                                                <Td>{cot.numero_cotizacion || '-'}</Td>
                                                <Td>{cot.nombre}</Td>
                                                <Td>
                                                    <Badge variant='outline' color='blue'>
                                                        {cot.tipo_moneda_label}
                                                    </Badge>
                                                </Td>
                                                <Td>
                                                    {formatCurrencyByMoneda(
                                                        Number(cot.total_estimado || 0),
                                                        normalizeCurrency(cot.tipo_moneda),
                                                    )}
                                                </Td>
                                                <Td>
                                                    {cot.total_convertido != null
                                                        ? formatCurrencyByMoneda(
                                                              Number(cot.total_convertido || 0),
                                                              monedaContrato,
                                                          )
                                                        : '-'}
                                                </Td>
                                                <Td>
                                                    {cot.dolar_observado != null
                                                        ? formatCurrencyByMoneda(
                                                              Number(cot.dolar_observado),
                                                              'CLP',
                                                          )
                                                        : '-'}
                                                </Td>
                                                <Td>{cot.items_count}</Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                            )}
                            {cotizacionesSeleccionadas.length > 0 && (
                                <p className='text-sm text-blue-600'>
                                    {cotizacionesSeleccionadas.length} cotización(es)
                                    seleccionada(s)
                                </p>
                            )}
                        </div>
                    )}

                    {/* Paso 7: Revisión */}
                    {step === 7 && (
                        <div className='flex flex-col gap-3'>
                            <p className='text-sm text-zinc-500'>
                                Revisa los datos antes de crear el contrato.
                            </p>
                            <div className='grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                                <ResumenItem label='Nombre' valor={formik.values.nombre} />
                                <ResumenItem label='Tipo' valor={tipoLabel} />
                                <ResumenItem
                                    label='Plantilla'
                                    valor={plantillaSeleccionada?.titulo ?? '-'}
                                />
                                <ResumenItem label='Moneda' valor={formik.values.moneda_cobro} />
                                <ResumenItem
                                    label='Forma de pago'
                                    valor={
                                        esVenta
                                            ? FORMA_PAGO_VENTA_OPTIONS.find(
                                                  (option) =>
                                                      option.value === formik.values.forma_pago_venta,
                                              )?.label ?? formik.values.forma_pago_venta
                                            : FORMA_PAGO_OPTIONS.find(
                                                  (option) =>
                                                      option.value ===
                                                      formik.values.forma_pago_contractual,
                                              )?.label ?? formik.values.forma_pago_contractual
                                    }
                                />
                                <ResumenItem
                                    label='Aviso previo'
                                    valor={
                                        formik.values.fecha_fin && formik.values.dias_aviso_termino
                                            ? `${formik.values.dias_aviso_termino} días`
                                            : '-'
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
                                {esVenta && (
                                    <ResumenItem
                                        label='Total contrato estimado'
                                        valor={formatCurrencyByMoneda(
                                            totalCotizacionesSeleccionadas,
                                            monedaContrato,
                                        )}
                                    />
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
                                                                    normalizeCurrency(planSeleccionadoResumen?.tipo_moneda),
                                                                )}{' '}
                                                                c/u
                                                            </div>
                                                        </div>
                                                        <div className='text-right text-zinc-500'>
                                                            <div>x{seleccionPlan.plan_cantidad * cantidadPorModoPagoResumen}</div>
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
                                                        const subtotalServicio = convertCurrency(
                                                            getTotalPorFormaPagoContractual(
                                                                s.precio_unitario,
                                                                s.cantidad,
                                                                formaPagoContractual,
                                                            ),
                                                            serv?.tipo_moneda,
                                                            monedaContrato,
                                                            tipoCambio,
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
                                                                            normalizeCurrency(serv?.tipo_moneda),
                                                                        )}{' '}
                                                                        c/u
                                                                    </div>
                                                                </div>
                                                                <div className='text-right text-zinc-500'>
                                                                    <div>x{s.cantidad * cantidadPorModoPagoResumen}</div>
                                                                    <div className='text-xs'>
                                                                        {formatCurrencyByMoneda(
                                                                            subtotalServicio,
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
                                                            getLicenciaPrecioPartner(lic.licencia_id),
                                                            getLicenciaTipoMoneda(lic.licencia_id),
                                                        )}{' '}
                                                        c/u
                                                    </div>
                                                </div>
                                                <div className='text-right text-zinc-500'>
                                                    <div>{lic.cantidad} cupos</div>
                                                    <div className='text-xs'>
                                                        {formatCurrencyByMoneda(
                                                            lic.cantidad * getLicenciaPrecioPartner(lic.licencia_id),
                                                            getLicenciaTipoMoneda(lic.licencia_id),
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
                                    Debes agregar al menos una licencia para completar este tipo
                                    de contrato.
                                </p>
                            )}

                            {/* Resumen de cotizaciones */}
                            {esVenta && cotizacionesSeleccionadas.length > 0 && (
                                <div className='rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                                    <span className='text-xs font-semibold text-zinc-500'>
                                        Cotizaciones ({cotizacionesSeleccionadas.length})
                                    </span>
                                    <div className='mt-2 flex flex-col gap-1'>
                                        {cotizacionesSeleccionadas.map((cotId) => {
                                            const cot = cotizacionesDisponibles.find(
                                                (c: ICotizacionVinculadaResumen) => c.id === cotId,
                                            );
                                            if (!cot) return null;
                                            return (
                                                <div
                                                    key={cot.id}
                                                    className='flex items-center justify-between text-sm'>
                                                    <span>
                                                        {cot.numero_cotizacion
                                                            ? `#${cot.numero_cotizacion} — `
                                                            : ''}
                                                        {cot.nombre}
                                                    </span>
                                                    <div className='text-right text-zinc-500'>
                                                        <div className='text-xs'>
                                                            {cot.tipo_moneda_label}{' '}
                                                            {formatCurrencyByMoneda(
                                                                Number(cot.total_estimado || 0),
                                                                normalizeCurrency(cot.tipo_moneda),
                                                            )}
                                                        </div>
                                                        <div className='text-xs'>
                                                            {cot.total_convertido != null
                                                                ? formatCurrencyByMoneda(
                                                                      Number(cot.total_convertido || 0),
                                                                      monedaContrato,
                                                                  )
                                                                : '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className='mt-3 border-t border-zinc-200 pt-3 text-right text-sm font-medium dark:border-zinc-700'>
                                        Total cotizaciones:{' '}
                                        {formatCurrencyByMoneda(totalCotizacionesSeleccionadas, monedaContrato)}
                                    </div>
                                </div>
                            )}

                            {esVenta && formik.values.forma_pago_venta === 'cuotas' && (
                                <div className='rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                                    <span className='text-xs font-semibold text-zinc-500'>
                                        Cuotas de venta
                                    </span>
                                    <div className='mt-2 flex flex-col gap-1'>
                                        {formik.values.cuotas_venta.map((cuota) => (
                                            <div
                                                key={`review-cuota-${cuota.orden}`}
                                                className='flex items-center justify-between text-sm'>
                                                <span>
                                                    Cuota {cuota.orden} - {cuota.porcentaje}% -{' '}
                                                    {cuota.hito_pago_tipo === 'personalizado'
                                                        ? cuota.hito_pago_descripcion || 'Sin descripcion'
                                                        : getHitoPagoVentaLabel(
                                                              cuota.hito_pago_tipo as
                                                                  THitoPagoVenta | null,
                                                          )}
                                                </span>
                                                <span className='text-zinc-500'>
                                                    {formatCurrencyByMoneda(
                                                        (totalCotizacionesSeleccionadas *
                                                            Number(cuota.porcentaje || 0)) /
                                                            100,
                                                        monedaContrato,
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {esVenta && cotizacionesSeleccionadas.length === 0 && (
                                <p className='text-sm text-zinc-400'>
                                    No se seleccionaron cotizaciones. Podras vincularlas
                                    despues.
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
                                    { key: 2, visible: true },
                                    { key: 3, visible: true },
                                    { key: 4, visible: esServicios },
                                    { key: 5, visible: esLicencia },
                                    { key: 6, visible: esVenta },
                                    { key: 7, visible: true },
                                ]
                                    .filter((p) => p.visible)
                                    .findIndex((p) => p.key === step) + 1
                            }{' '}
                            de {4 + (esServicios ? 1 : 0) + (esLicencia ? 1 : 0) + (esVenta ? 1 : 0)}
                        </span>
                    </ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red' onClick={handleClose}>
                            Cancelar
                        </Button>
                        {step > 1 && <Button onClick={handleAtras}>Atras</Button>}
                        {step < 7 && (
                            <Button variant='solid' onClick={handleSiguiente}>
                                Siguiente
                            </Button>
                        )}
                        {step === 7 && (
                            <Button
                                variant='solid'
                                isLoading={formik.isSubmitting}
                                onClick={() => formik.handleSubmit()}>
                                Crear contrato
                            </Button>
                        )}
                    </ModalFooterChild>
                </ModalFooter>
                </>
            </Modal>

            <ModalLicenciaContrato
                isOpen={modalAddLicencia}
                onClose={() => setModalAddLicencia(false)}
                formik={licFormik}
                listaLicencias={listaLicencias}
                contractCurrency={monedaContrato}
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
