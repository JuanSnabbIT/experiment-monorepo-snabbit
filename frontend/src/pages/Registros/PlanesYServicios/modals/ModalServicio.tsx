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
import { CATEGORIAS_SERVICIO } from '@/constants/contrato.constant';
import { ICaracteristicaServicio, IServicio } from '@/interface/contrato.interface';
import {
    useCreateServicioMutation,
    useGetCaracteristicasServicioQuery,
    useUpdateServicioMutation,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert } from '@/utils/sweetAlert';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import ModalCaracteristicaServicio from './ModalCaracteristicaServicio';

interface IModalServicioProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    servicio?: IServicio;
}

interface IAlcanceItem {
    caracteristica_id: number;
    modo: 'incluye' | 'no_incluye';
    orden: number;
}

const CURRENCY_DECIMALS: Record<string, number> = {
    CLP: 0,
    USD: 1,
    UF: 4,
};

const normalizePrecioValue = (value: string, currency: string) => {
    const raw = value.replace(',', '.');
    const [integerPart, decimalPart] = raw.split('.');
    const precision = CURRENCY_DECIMALS[currency] ?? 2;

    if (!decimalPart || precision === 0) {
        return integerPart || '';
    }

    return `${integerPart}.${decimalPart.slice(0, precision)}`;
};

const getPrecioStep = (currency: string) => {
    if (currency === 'USD') return '0.1';
    if (currency === 'UF') return '0.0001';
    return '1';
};

const validationSchema = Yup.object({
    nombre: Yup.string()
        .min(2, 'Minimo 2 caracteres')
        .max(255, 'Maximo 255 caracteres')
        .required('El nombre es requerido'),
    descripcion: Yup.string().max(1000, 'Maximo 1000 caracteres').nullable(),
    categoria: Yup.string().required('La categoria es requerida'),
    precio: Yup.string()
        .nullable()
        .test('is-number', 'Debe ser un numero', (value) => {
            if (value === undefined || value === null || value === '') return true;
            const parsed = Number(value.toString().replace(',', '.'));
            return !Number.isNaN(parsed);
        })
        .test(
            'currency-precision',
            'CLP no puede tener decimales, USD maximo 1 decimal, UF maximo 4 decimales',
            function (value) {
                if (value === undefined || value === null || value === '') return true;
                const currency = (this.parent as { tipo_moneda?: string }).tipo_moneda;
                const raw = value.toString().replace(',', '.');
                const [, decimalPart] = raw.split('.');
                const maxDecimals = currency !== undefined ? (CURRENCY_DECIMALS[currency] ?? 2) : 2;
                return !decimalPart || decimalPart.length <= maxDecimals;
            },
        ),
    tipo_moneda: Yup.string().required('La moneda es requerida'),
    clausulas_especiales: Yup.string().max(2000, 'Maximo 2000 caracteres').nullable(),
});

const categoriaOptions: TSelectOption[] = CATEGORIAS_SERVICIO.map((c) => ({
    value: c.value,
    label: c.label,
}));

const ModalServicio = ({ isOpen, setIsOpen, servicio }: IModalServicioProps) => {
    const isEditing = !!servicio;
    const [createServicio] = useCreateServicioMutation();
    const [updateServicio] = useUpdateServicioMutation();
    const { data: caracteristicas = [] } = useGetCaracteristicasServicioQuery();

    const [alcanceItems, setAlcanceItems] = useState<IAlcanceItem[]>([]);
    const [selectedCaracteristica, setSelectedCaracteristica] = useState<TSelectOption | null>(
        null,
    );
    const [modalCaractOpen, setModalCaractOpen] = useState(false);

    useEffect(() => {
        if (isOpen && servicio?.alcance_caracteristicas) {
            setAlcanceItems(
                servicio.alcance_caracteristicas.map((item) => ({
                    caracteristica_id: item.caracteristica_id,
                    modo: item.modo,
                    orden: item.orden,
                })),
            );
        } else if (isOpen) {
            setAlcanceItems([]);
        }
    }, [isOpen, servicio]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: servicio?.nombre || '',
            descripcion: servicio?.descripcion || '',
            categoria: servicio?.categoria || '',
            precio: servicio?.precio || '',
            tipo_moneda: servicio?.tipo_moneda || 'CLP',
            clausulas_especiales: servicio?.clausulas_especiales || '',
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                const payload = {
                    nombre: values.nombre,
                    descripcion: values.descripcion || undefined,
                    categoria: values.categoria,
                    precio: values.precio || undefined,
                    tipo_moneda: values.tipo_moneda,
                    clausulas_especiales: values.clausulas_especiales || null,
                    alcance_config: alcanceItems.map((item, idx) => ({
                        caracteristica_id: item.caracteristica_id,
                        modo: item.modo,
                        orden: item.orden || idx + 1,
                    })),
                };
                if (isEditing && servicio) {
                    if (servicio.bloqueado_por_uso) {
                        const ok = await confirmAlert({
                            title: 'Se creará una nueva versión',
                            text: `Este servicio está vinculado a contratos activos. Se guardará como versión ${(servicio.version || 1) + 1} y la versión actual quedará protegida para los contratos existentes.`,
                            confirmText: 'Crear nueva versión',
                            cancelText: 'Cancelar',
                            icon: 'info',
                        });
                        if (!ok) return;
                    }
                    await updateServicio({ id: servicio.id, data: payload }).unwrap();
                    toast.success('Servicio actualizado correctamente');
                } else {
                    await createServicio(payload).unwrap();
                    toast.success('Servicio creado correctamente');
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
            setAlcanceItems([]);
            setSelectedCaracteristica(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const addedIds = alcanceItems.map((a) => a.caracteristica_id);
    const caracteristicaOptions: TSelectOption[] = caracteristicas
        .filter((c) => !addedIds.includes(c.id))
        .map((c) => ({ value: String(c.id), label: c.nombre }));

    const handleAddAlcance = () => {
        if (!selectedCaracteristica) return;
        const id = Number(selectedCaracteristica.value);
        setAlcanceItems((prev) => [
            ...prev,
            { caracteristica_id: id, modo: 'incluye', orden: prev.length + 1 },
        ]);
        setSelectedCaracteristica(null);
    };

    const handleToggleModo = (idx: number) => {
        setAlcanceItems((prev) =>
            prev.map((item, i) =>
                i === idx
                    ? { ...item, modo: item.modo === 'incluye' ? 'no_incluye' : 'incluye' }
                    : item,
            ),
        );
    };

    const handleRemoveAlcance = (idx: number) => {
        setAlcanceItems((prev) => prev.filter((_, i) => i !== idx));
    };

    const getCaracteristicaNombre = (id: number) => {
        return caracteristicas.find((c) => c.id === id)?.nombre || `#${id}`;
    };

    const handleCaracteristicaSaved = (nueva: ICaracteristicaServicio) => {
        setAlcanceItems((prev) => [
            ...prev,
            { caracteristica_id: nueva.id, modo: 'incluye', orden: prev.length + 1 },
        ]);
    };

    return (
        <>
            <Modal
                isStaticBackdrop
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                size='lg'
                isScrollable>
                <ModalHeader>
                    <Badge className='text-xl'>
                        {isEditing ? 'Editar Servicio' : 'Crear Servicio'}
                    </Badge>
                </ModalHeader>
                <ModalBody className='max-h-[68vh] overflow-y-auto'>
                    <div className='flex flex-col gap-4'>
                        <div className='flex items-center gap-2'>
                            <Tooltip
                                text='Un servicio es una unidad de trabajo que ofreces: Soporte Helpdesk, Mantención Preventiva, Backup en Nube, Desarrollo a Medida. Asignále características para definir su alcance.'
                                placement='bottom'>
                                <span className='inline-flex cursor-help items-center text-blue-400'>
                                    <Icon icon='HeroInformationCircle' className='text-lg' />
                                </span>
                            </Tooltip>
                            <span className='text-xs text-zinc-400'>¿Qué es un servicio?</span>
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
                                    placeholder='Nombre del servicio'
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
                                    placeholder='Descripcion del servicio'
                                    value={formik.values.descripcion}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    rows={3}
                                />
                            </Validation>
                        </div>

                        <div>
                            <Label htmlFor='categoria'>Categoria</Label>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.categoria}
                                invalidFeedback={formik.errors.categoria}>
                                <SelectReact
                                    options={categoriaOptions}
                                    value={
                                        categoriaOptions.find(
                                            (o) => o.value === formik.values.categoria,
                                        ) || null
                                    }
                                    onChange={(option) => {
                                        const selected = option as TSelectOption;
                                        formik.setFieldValue(
                                            'categoria',
                                            selected?.value || '',
                                        );
                                    }}
                                    name='categoria'
                                    placeholder='Seleccionar categoria...'
                                />
                            </Validation>
                        </div>

                        <div>
                            <Label htmlFor='precio'>Precio</Label>
                            <div className='flex items-start gap-2'>
                                <div className='w-28 shrink-0'>
                                    <SelectReact
                                        options={[
                                            { value: 'CLP', label: 'CLP' },
                                            { value: 'UF', label: 'UF' },
                                            { value: 'USD', label: 'USD' },
                                        ]}
                                        value={{ value: formik.values.tipo_moneda, label: formik.values.tipo_moneda }}
                                        onChange={(opt) => {
                                            const selected = opt as TSelectOption;
                                            formik.setFieldValue('tipo_moneda', selected?.value || 'CLP');
                                        }}
                                        name='tipo_moneda'
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
                                            step={getPrecioStep(formik.values.tipo_moneda)}
                                            placeholder='0'
                                            value={formik.values.precio}
                                            onChange={(event) => {
                                                const rawValue = event.target.value;
                                                const normalizedValue = normalizePrecioValue(
                                                    rawValue,
                                                    formik.values.tipo_moneda,
                                                );
                                                formik.setFieldValue('precio', normalizedValue);
                                            }}
                                            onBlur={(event) => {
                                                const rawValue = event.target.value;
                                                const normalizedValue = normalizePrecioValue(
                                                    rawValue,
                                                    formik.values.tipo_moneda,
                                                );
                                                if (normalizedValue !== rawValue) {
                                                    formik.setFieldValue('precio', normalizedValue);
                                                }
                                                formik.handleBlur(event);
                                            }}
                                        />
                                    </Validation>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor='addCaracteristica'>Alcance (caracteristicas)</Label>
                            <div className='flex items-center gap-2'>
                                <div className='flex-1'>
                                    <SelectReact
                                        options={caracteristicaOptions}
                                        value={selectedCaracteristica}
                                        onChange={(option) =>
                                            setSelectedCaracteristica(
                                                option as TSelectOption,
                                            )
                                        }
                                        name='addCaracteristica'
                                        placeholder='Seleccionar caracteristica...'
                                        isClearable
                                    />
                                </div>
                                <Tooltip text='Agregar al alcance'>
                                    <Button
                                        icon='HeroPlus'
                                        variant='solid'
                                        size='sm'
                                        isDisable={!selectedCaracteristica}
                                        onClick={handleAddAlcance}
                                    />
                                </Tooltip>
                                <Tooltip text='Crear nueva caracteristica'>
                                    <Button
                                        icon='HeroPlus'
                                        variant='outline'
                                        color='amber'
                                        size='sm'
                                        onClick={() => setModalCaractOpen(true)}
                                    />
                                </Tooltip>
                            </div>

                            {alcanceItems.length > 0 && (
                                <div className='mt-3 space-y-2 max-h-72 overflow-y-auto pr-1'>
                                    {alcanceItems.map((item, idx) => (
                                        <div
                                            key={item.caracteristica_id}
                                            className='flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700'>
                                            <span className='flex-1 text-sm font-medium'>
                                                {getCaracteristicaNombre(
                                                    item.caracteristica_id,
                                                )}
                                            </span>
                                            <Button
                                                size='xs'
                                                variant={
                                                    item.modo === 'incluye'
                                                        ? 'solid'
                                                        : 'outline'
                                                }
                                                color='blue'
                                                onClick={() =>
                                                    item.modo !== 'incluye' &&
                                                    handleToggleModo(idx)
                                                }>
                                                Incluye
                                            </Button>
                                            <Button
                                                size='xs'
                                                variant={
                                                    item.modo === 'no_incluye'
                                                        ? 'solid'
                                                        : 'outline'
                                                }
                                                color='amber'
                                                onClick={() =>
                                                    item.modo !== 'no_incluye' &&
                                                    handleToggleModo(idx)
                                                }>
                                                No incluye
                                            </Button>
                                            <Tooltip text='Quitar'>
                                                <Button
                                                    icon='HeroXMark'
                                                    size='xs'
                                                    color='red'
                                                    onClick={() =>
                                                        handleRemoveAlcance(idx)
                                                    }
                                                />
                                            </Tooltip>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <Label htmlFor='clausulas_especiales'>Clausulas especiales</Label>
                            <Textarea
                                id='clausulas_especiales'
                                name='clausulas_especiales'
                                placeholder='Condiciones o clausulas adicionales del servicio'
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

            <ModalCaracteristicaServicio
                isOpen={modalCaractOpen}
                setIsOpen={setModalCaractOpen}
                onSaved={handleCaracteristicaSaved}
            />
        </>
    );
};

export default ModalServicio;
