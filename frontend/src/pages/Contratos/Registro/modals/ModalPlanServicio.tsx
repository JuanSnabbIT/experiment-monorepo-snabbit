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
import { IPlanServicio, IServicio } from '@/interface/contrato.interface';
import {
    useCreatePlanServicioMutation,
    useGetServiciosQuery,
    useUpdatePlanServicioMutation,
} from '@/store/slices/contratos/contratoApi';
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
    precio_clp: string;
    precio_uf: string;
    precio_usd: string;
    clausulas_especiales: string;
}

const validationSchema = Yup.object({
    nombre: Yup.string()
        .min(2, 'Minimo 2 caracteres')
        .max(255, 'Maximo 255 caracteres')
        .required('El nombre es requerido'),
    descripcion: Yup.string().max(1000, 'Maximo 1000 caracteres').nullable(),
    servicios_ids: Yup.array().of(Yup.number()).min(1, 'Debe incluir al menos un servicio'),
    precio_clp: Yup.number().nullable().typeError('Debe ser un numero'),
    precio_uf: Yup.number().nullable().typeError('Debe ser un numero'),
    precio_usd: Yup.number().nullable().typeError('Debe ser un numero'),
    clausulas_especiales: Yup.string().max(2000, 'Maximo 2000 caracteres').nullable(),
});

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
            precio_clp: plan?.precio_clp || '',
            precio_uf: plan?.precio_uf || '',
            precio_usd: plan?.precio_usd || '',
            clausulas_especiales: plan?.clausulas_especiales || '',
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                const payload = {
                    nombre: values.nombre,
                    descripcion: values.descripcion,
                    servicios_ids: values.servicios_ids,
                    precio_clp: values.precio_clp || undefined,
                    precio_uf: values.precio_uf || undefined,
                    precio_usd: values.precio_usd || undefined,
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

    // Autocompletar precios al seleccionar servicios (solo en creacion, si estan vacios)
    useEffect(() => {
        if (!isOpen || isEditing) return;
        const currentClp = Number(formik.values.precio_clp || 0);
        const currentUf = Number(formik.values.precio_uf || 0);
        const currentUsd = Number(formik.values.precio_usd || 0);
        if (currentClp === 0 && currentUf === 0 && currentUsd === 0) {
            if (precioSugerido.clp > 0)
                formik.setFieldValue('precio_clp', String(precioSugerido.clp));
            if (precioSugerido.uf > 0)
                formik.setFieldValue('precio_uf', String(precioSugerido.uf));
            if (precioSugerido.usd > 0)
                formik.setFieldValue('precio_usd', String(precioSugerido.usd));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formik.values.servicios_ids, isOpen]);

    // Alcance heredado calculado desde servicios seleccionados
    const alcancePreview = useMemo(() => {
        const agrupados: Record<
            number,
            {
                caracteristica: { id: number; nombre: string; descripcion: string };
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
            caracteristica: { id: number; nombre: string; descripcion: string };
            modo: 'incluye' | 'no_incluye';
            servicios: string[];
        }> = [];
        const conflictos: Array<{
            caracteristica: { id: number; nombre: string; descripcion: string };
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
        formik.setFieldValue('precio_clp', String(precioSugerido.clp));
        formik.setFieldValue('precio_uf', String(precioSugerido.uf));
        formik.setFieldValue('precio_usd', String(precioSugerido.usd));
    };

    return (
        <Modal isStaticBackdrop isOpen={isOpen} setIsOpen={setIsOpen} size='lg'>
            <ModalHeader>
                <Badge className='text-xl'>
                    {isEditing ? 'Editar Plan de Servicio' : 'Crear Plan de Servicio'}
                </Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
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
                            <Label htmlFor='precio_clp'>Precio del plan</Label>
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
                                Sugerido (suma de servicios): CLP{' '}
                                {precioSugerido.clp.toLocaleString('es-CL')} · UF{' '}
                                {precioSugerido.uf.toLocaleString('es-CL', {
                                    minimumFractionDigits: 2,
                                })}{' '}
                                · USD{' '}
                                {precioSugerido.usd.toLocaleString('es-CL', {
                                    minimumFractionDigits: 2,
                                })}
                            </div>
                        )}
                        <div className='grid grid-cols-3 gap-4'>
                            <div>
                                <Label htmlFor='precio_clp'>CLP</Label>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.precio_clp}
                                    invalidFeedback={formik.errors.precio_clp}>
                                    <Input
                                        id='precio_clp'
                                        name='precio_clp'
                                        type='number'
                                        placeholder='0'
                                        value={formik.values.precio_clp}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Label htmlFor='precio_uf'>UF</Label>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.precio_uf}
                                    invalidFeedback={formik.errors.precio_uf}>
                                    <Input
                                        id='precio_uf'
                                        name='precio_uf'
                                        type='number'
                                        placeholder='0'
                                        value={formik.values.precio_uf}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Label htmlFor='precio_usd'>USD</Label>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.precio_usd}
                                    invalidFeedback={formik.errors.precio_usd}>
                                    <Input
                                        id='precio_usd'
                                        name='precio_usd'
                                        type='number'
                                        placeholder='0'
                                        value={formik.values.precio_usd}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                </Validation>
                            </div>
                        </div>
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
