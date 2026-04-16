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
import Tooltip from '@/components/ui/Tooltip';
import { ICaracteristicaServicio, IPlanServicio, IServicio } from '@/interface/contrato.interface';
import {
    useCreatePlanServicioMutation,
    useGetServiciosQuery,
    useUpdatePlanServicioMutation,
} from '@/store/slices/contratos/contratoApi';
import { useGetTipoCambioQuery } from '@/store/slices/cotizaciones/cotizacionApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import ScopeSummary from '../../components/ScopeSummary';

interface IModalPlanServicioProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    plan?: IPlanServicio;
}

interface IFormularioPlan {
    nombre: string;
    descripcion: string;
    servicios_ids: number[];
    moneda: string;
    precio: string;
    num_visitas_mensuales: string;
    clausulas_especiales: string;
}

const validationSchema = Yup.object({
    nombre: Yup.string()
        .min(2, 'Minimo 2 caracteres')
        .max(255, 'Maximo 255 caracteres')
        .required('El nombre es requerido'),
    descripcion: Yup.string().max(1000, 'Maximo 1000 caracteres').nullable(),
    servicios_ids: Yup.array().of(Yup.number()).min(1, 'Debe incluir al menos un servicio'),
    moneda: Yup.string().required(),
    precio: Yup.number().nullable().typeError('Debe ser un numero'),
    num_visitas_mensuales: Yup.number()
        .nullable()
        .min(0, 'Debe ser mayor o igual a 0')
        .integer('Debe ser un entero')
        .typeError('Debe ser un numero'),
    clausulas_especiales: Yup.string().max(2000, 'Maximo 2000 caracteres').nullable(),
});

const MONEDA_OPTIONS: TSelectOption[] = [
    { value: 'clp', label: 'CLP' },
    { value: 'uf', label: 'UF' },
    { value: 'usd', label: 'USD' },
];

const ModalPlanServicio = ({ isOpen, setIsOpen, plan }: IModalPlanServicioProps) => {
    const isEditing = !!plan;
    const [createPlan] = useCreatePlanServicioMutation();
    const [updatePlan] = useUpdatePlanServicioMutation();
    const { data: servicios = [] } = useGetServiciosQuery();

    const serviciosOptions: TSelectOption[] = servicios.map((s) => ({
        value: String(s.id),
        label: `${s.nombre} (${s.categoria_label})`,
    }));

    const formik = useFormik<IFormularioPlan>({
        enableReinitialize: true,
        initialValues: {
            nombre: plan?.nombre || '',
            descripcion: plan?.descripcion || '',
            servicios_ids: plan?.servicios?.map((s) => s.id) || [],
            moneda: plan?.precio_uf ? 'uf' : plan?.precio_usd ? 'usd' : 'clp',
            precio: plan?.precio_uf || plan?.precio_usd || plan?.precio_clp || '',
            num_visitas_mensuales: plan?.num_visitas_mensuales != null ? String(plan.num_visitas_mensuales) : '',
            clausulas_especiales: plan?.clausulas_especiales || '',
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                const payload = {
                    nombre: values.nombre,
                    descripcion: values.descripcion,
                    servicios_ids: values.servicios_ids,
                    precio_clp: values.moneda === 'clp' ? values.precio || undefined : undefined,
                    precio_uf: values.moneda === 'uf' ? values.precio || undefined : undefined,
                    precio_usd: values.moneda === 'usd' ? values.precio || undefined : undefined,
                    num_visitas_mensuales:
                        values.num_visitas_mensuales !== ''
                            ? Number(values.num_visitas_mensuales)
                            : null,
                    clausulas_especiales: values.clausulas_especiales || null,
                };
                if (isEditing && plan) {
                    await updatePlan({ id: plan.id, data: payload }).unwrap();
                    toast.success('Plan actualizado correctamente');
                } else {
                    await createPlan(payload).unwrap();
                    toast.success('Plan creado correctamente');
                }
                setIsOpen(false);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Servicios seleccionados para preview de alcance y precio sugerido
    const selectedServicios: IServicio[] = useMemo(
        () => servicios.filter((s) => formik.values.servicios_ids.includes(s.id)),
        [servicios, formik.values.servicios_ids],
    );

    // Precio sugerido = suma de precios base de servicios seleccionados
    const precioSugerido = useMemo(() => {
        let clp = 0;
        let uf = 0;
        let usd = 0;
        selectedServicios.forEach((s) => {
            clp += Number(s.precio_clp || 0);
            uf += Number(s.precio_uf || 0);
            usd += Number(s.precio_usd || 0);
        });
        return { clp, uf, usd };
    }, [selectedServicios]);

    // Autocompletar precio al seleccionar servicios (solo en creacion, si esta vacio)
    useEffect(() => {
        if (!isOpen || isEditing) return;
        const currentPrecio = Number(formik.values.precio || 0);
        if (currentPrecio === 0) {
            const moneda = formik.values.moneda;
            const sugerido =
                moneda === 'uf'
                    ? precioSugerido.uf
                    : moneda === 'usd'
                      ? precioSugerido.usd
                      : precioSugerido.clp;
            if (sugerido > 0) formik.setFieldValue('precio', String(sugerido));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formik.values.servicios_ids, isOpen]);

    // Alcance heredado calculado desde servicios seleccionados
    const alcancePreview = useMemo(() => {
        const agrupados: Record<
            number,
            {
                caracteristica: ICaracteristicaServicio;
                incluye: string[];
                no_incluye: string[];
            }
        > = {};
        selectedServicios.forEach((s) => {
            (s.alcance_caracteristicas || []).forEach((item) => {
                const registro = agrupados[item.caracteristica.id] || {
                    caracteristica: item.caracteristica,
                    incluye: [],
                    no_incluye: [],
                };
                registro[item.modo].push(s.nombre);
                agrupados[item.caracteristica.id] = registro;
            });
        });

        const heredado: Array<{
            caracteristica: ICaracteristicaServicio;
            modo: 'incluye' | 'no_incluye';
            servicios: string[];
        }> = [];
        const conflictos: Array<{
            caracteristica: ICaracteristicaServicio;
            servicios_incluye: string[];
            servicios_no_incluye: string[];
        }> = [];

        Object.values(agrupados).forEach((item) => {
            if (item.incluye.length > 0 && item.no_incluye.length > 0) {
                conflictos.push({
                    caracteristica: item.caracteristica,
                    servicios_incluye: item.incluye,
                    servicios_no_incluye: item.no_incluye,
                });
            } else {
                heredado.push({
                    caracteristica: item.caracteristica,
                    modo: item.incluye.length > 0 ? 'incluye' : 'no_incluye',
                    servicios: item.incluye.length > 0 ? item.incluye : item.no_incluye,
                });
            }
        });

        return { heredado, conflictos };
    }, [selectedServicios]);

    const handleApplyPrecioSugerido = () => {
        const moneda = formik.values.moneda;
        const val =
            moneda === 'uf'
                ? String(precioSugerido.uf)
                : moneda === 'usd'
                  ? String(precioSugerido.usd)
                  : String(precioSugerido.clp);
        formik.setFieldValue('precio', val);
    };

    const today = new Date().toISOString().slice(0, 10);
    const { data: tc } = useGetTipoCambioQuery(today);

    const precioEquivs = useMemo(() => {
        const amount = Number(formik.values.precio || 0);
        if (!tc || amount <= 0) return null;
        const { uf, dolar } = tc;
        let clp: number;
        if (formik.values.moneda === 'clp') clp = amount;
        else if (formik.values.moneda === 'uf') clp = amount * uf;
        else clp = amount * dolar;
        const fmt = (v: number, decimals: number) =>
            new Intl.NumberFormat('es-CL', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            }).format(v);
        return [
            formik.values.moneda !== 'clp' ? `$${fmt(Math.round(clp), 0)} CLP` : null,
            formik.values.moneda !== 'uf' ? `${fmt(clp / uf, 2)} UF` : null,
            formik.values.moneda !== 'usd' ? `${fmt(clp / dolar, 2)} USD` : null,
        ]
            .filter(Boolean)
            .join(' · ≈ ');
    }, [formik.values.precio, formik.values.moneda, tc]);

    return (
        <Modal isStaticBackdrop isOpen={isOpen} setIsOpen={setIsOpen} size='lg'>
            <ModalHeader>
                <Badge className='text-xl'>
                    {isEditing ? 'Editar Plan de Servicio' : 'Crear Plan de Servicio'}
                </Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    <div className='flex items-center gap-2'>
                        <Tooltip
                            text='Un plan agrupa varios servicios bajo un precio único. Ej: Plan Básico TI (Helpdesk + Backup), Plan Enterprise 24/7 (Soporte + Mantención + Monitoreo), Pack Startup.'
                            placement='bottom'>
                            <span className='inline-flex cursor-help items-center text-blue-400'>
                                <Icon icon='HeroInformationCircle' className='text-lg' />
                            </span>
                        </Tooltip>
                        <span className='text-xs text-zinc-400'>¿Qué es un plan?</span>
                    </div>
                    <div>
                        <Label htmlFor='nombre'>Nombre</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.nombre}
                            invalidFeedback={formik.errors.nombre}>
                            <Input
                                id='nombre'
                                name='nombre'
                                placeholder='Nombre del plan'
                                value={formik.values.nombre}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='descripcion'>Descripcion</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.descripcion}
                            invalidFeedback={formik.errors.descripcion}>
                            <Textarea
                                id='descripcion'
                                name='descripcion'
                                placeholder='Descripcion general del plan'
                                value={formik.values.descripcion}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                rows={3}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='servicios'>Servicios incluidos</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.servicios_ids}
                            invalidFeedback={
                                typeof formik.errors.servicios_ids === 'string'
                                    ? formik.errors.servicios_ids
                                    : undefined
                            }>
                            <SelectReact
                                isMulti
                                options={serviciosOptions}
                                value={serviciosOptions.filter((o) =>
                                    formik.values.servicios_ids.includes(Number(o.value)),
                                )}
                                onChange={(options) => {
                                    const selected = options as TSelectOption[];
                                    formik.setFieldValue(
                                        'servicios_ids',
                                        selected.map((o) => Number(o.value)),
                                    );
                                }}
                                name='servicios'
                                placeholder='Seleccionar servicios...'
                            />
                        </Validation>
                    </div>

                    {/* Precio del plan con sugerido */}
                    <div>
                        <div className='mb-2 flex items-center justify-between'>
                            <Label htmlFor='precio'>Precio del plan</Label>
                            {selectedServicios.length > 0 && (
                                <Button
                                    size='xs'
                                    variant='outline'
                                    color='blue'
                                    icon='HeroArrowPath'
                                    onClick={handleApplyPrecioSugerido}>
                                    Usar precio sugerido
                                </Button>
                            )}
                        </div>
                        {selectedServicios.length > 0 && (
                            <div className='mb-2 text-xs text-zinc-500'>
                                Sugerido ({formik.values.moneda.toUpperCase()}):{' '}
                                {formik.values.moneda === 'uf'
                                    ? precioSugerido.uf.toLocaleString('es-CL', {
                                          minimumFractionDigits: 2,
                                      })
                                    : formik.values.moneda === 'usd'
                                      ? precioSugerido.usd.toLocaleString('es-CL', {
                                            minimumFractionDigits: 2,
                                        })
                                      : precioSugerido.clp.toLocaleString('es-CL')}
                            </div>
                        )}
                        <div className='flex gap-2'>
                            <div className='w-28 shrink-0'>
                                <SelectReact
                                    options={MONEDA_OPTIONS}
                                    value={
                                        MONEDA_OPTIONS.find(
                                            (o) => o.value === formik.values.moneda,
                                        ) ?? MONEDA_OPTIONS[0]
                                    }
                                    onChange={(opt) =>
                                        formik.setFieldValue(
                                            'moneda',
                                            (opt as TSelectOption).value,
                                        )
                                    }
                                    name='moneda'
                                />
                            </div>
                            <div className='flex-1'>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.precio}
                                    invalidFeedback={formik.errors.precio}>
                                    <Input
                                        id='precio'
                                        name='precio'
                                        type='number'
                                        placeholder='0'
                                        value={formik.values.precio}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                </Validation>
                            </div>
                        </div>
                        {precioEquivs && (
                            <div className='mt-2 text-xs text-zinc-400'>
                                Equiv. referencial: ≈ {precioEquivs}
                            </div>
                        )}
                    </div>

                    {/* Alcance heredado de servicios (read-only) */}
                    {selectedServicios.length > 0 &&
                        (alcancePreview.heredado.length > 0 ||
                            alcancePreview.conflictos.length > 0) && (
                            <div>
                                <Label htmlFor='alcance_heredado'>Alcance heredado de servicios</Label>
                                <div className='rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                                    <ScopeSummary
                                        planItems={alcancePreview.heredado}
                                        conflicts={alcancePreview.conflictos}
                                    />
                                </div>
                            </div>
                        )}

                    <div>
                        <Label htmlFor='clausulas_especiales'>Clausulas especiales</Label>
                        <Textarea
                            id='clausulas_especiales'
                            name='clausulas_especiales'
                            placeholder='Indica condiciones especiales reutilizables.'
                            value={formik.values.clausulas_especiales}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            rows={3}
                        />
                    </div>
                    <div>
                        <Label htmlFor='num_visitas_mensuales'>Visitas presenciales mensuales</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.num_visitas_mensuales}
                            invalidFeedback={formik.errors.num_visitas_mensuales}>
                            <Input
                                id='num_visitas_mensuales'
                                name='num_visitas_mensuales'
                                type='number'
                                min={0}
                                step={1}
                                placeholder='0 (dejar vacio si no aplica)'
                                value={formik.values.num_visitas_mensuales}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Button color='red' onClick={() => setIsOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        onClick={() => formik.handleSubmit()}
                        isDisable={formik.isSubmitting}>
                        {isEditing ? 'Actualizar' : 'Guardar'}
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

export default ModalPlanServicio;
