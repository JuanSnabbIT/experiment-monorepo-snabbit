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

const validationSchema = Yup.object({
    nombre: Yup.string()
        .min(2, 'Minimo 2 caracteres')
        .max(255, 'Maximo 255 caracteres')
        .required('El nombre es requerido'),
    descripcion: Yup.string().max(1000, 'Maximo 1000 caracteres').nullable(),
    categoria: Yup.string().required('La categoria es requerida'),
    precio_clp: Yup.number().nullable().typeError('Debe ser un numero'),
    precio_uf: Yup.number().nullable().typeError('Debe ser un numero'),
    precio_usd: Yup.number().nullable().typeError('Debe ser un numero'),
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
    const [moneda, setMoneda] = useState<'CLP' | 'UF' | 'USD'>('CLP');
    const [showOtrasMonedas, setShowOtrasMonedas] = useState(false);

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
        if (isOpen && servicio) {
            if (Number(servicio.precio_uf || 0) > 0) setMoneda('UF');
            else if (Number(servicio.precio_usd || 0) > 0) setMoneda('USD');
            else setMoneda('CLP');
            const hasMultiple =
                [servicio.precio_clp, servicio.precio_uf, servicio.precio_usd].filter(
                    (p) => Number(p || 0) > 0,
                ).length > 1;
            setShowOtrasMonedas(hasMultiple);
        } else if (isOpen) {
            setMoneda('CLP');
            setShowOtrasMonedas(false);
        }
    }, [isOpen, servicio]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: servicio?.nombre || '',
            descripcion: servicio?.descripcion || '',
            categoria: servicio?.categoria || '',
            precio_clp: servicio?.precio_clp || '',
            precio_uf: servicio?.precio_uf || '',
            precio_usd: servicio?.precio_usd || '',
            clausulas_especiales: servicio?.clausulas_especiales || '',
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                const payload = {
                    nombre: values.nombre,
                    descripcion: values.descripcion || undefined,
                    categoria: values.categoria,
                    precio_clp: values.precio_clp || undefined,
                    precio_uf: values.precio_uf || undefined,
                    precio_usd: values.precio_usd || undefined,
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
            <Modal isStaticBackdrop isOpen={isOpen} setIsOpen={setIsOpen} size='lg'>
                <ModalHeader>
                    <Badge className='text-xl'>
                        {isEditing ? 'Editar Servicio' : 'Crear Servicio'}
                    </Badge>
                </ModalHeader>
                <ModalBody>
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
                            <Label htmlFor={`precio_${moneda.toLowerCase()}`}>Precio</Label>
                            <div className='flex items-start gap-2'>
                                <div className='w-28 shrink-0'>
                                    <SelectReact
                                        options={[
                                            { value: 'CLP', label: 'CLP' },
                                            { value: 'UF', label: 'UF' },
                                            { value: 'USD', label: 'USD' },
                                        ]}
                                        value={{ value: moneda, label: moneda }}
                                        onChange={(opt) => {
                                            const selected = opt as TSelectOption;
                                            setMoneda(
                                                selected.value as 'CLP' | 'UF' | 'USD',
                                            );
                                        }}
                                        name='moneda'
                                    />
                                </div>
                                <div className='flex-1'>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={
                                            formik.touched[
                                                `precio_${moneda.toLowerCase()}` as keyof typeof formik.touched
                                            ] as boolean | undefined
                                        }
                                        invalidFeedback={
                                            formik.errors[
                                                `precio_${moneda.toLowerCase()}` as keyof typeof formik.errors
                                            ]
                                        }>
                                        <Input
                                            id={`precio_${moneda.toLowerCase()}`}
                                            name={`precio_${moneda.toLowerCase()}`}
                                            type='number'
                                            placeholder='0'
                                            value={
                                                formik.values[
                                                    `precio_${moneda.toLowerCase()}` as keyof typeof formik.values
                                                ]
                                            }
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                        />
                                    </Validation>
                                </div>
                            </div>
                            <button
                                type='button'
                                className='mt-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                                onClick={() => setShowOtrasMonedas((v) => !v)}>
                                <Icon
                                    icon={
                                        showOtrasMonedas
                                            ? 'HeroChevronUp'
                                            : 'HeroChevronDown'
                                    }
                                    size='text-sm'
                                />
                                {showOtrasMonedas
                                    ? 'Ocultar otras monedas'
                                    : 'Ingresar en otras monedas'}
                            </button>
                            {showOtrasMonedas && (
                                <div className='mt-2 grid grid-cols-2 gap-3'>
                                    {(['CLP', 'UF', 'USD'] as const)
                                        .filter((m) => m !== moneda)
                                        .map((m) => {
                                            const field =
                                                `precio_${m.toLowerCase()}` as keyof typeof formik.values;
                                            return (
                                                <div key={m}>
                                                    <Label htmlFor={field}>{m}</Label>
                                                    <Input
                                                        id={field}
                                                        name={field}
                                                        type='number'
                                                        placeholder='0'
                                                        value={formik.values[field]}
                                                        onChange={formik.handleChange}
                                                        onBlur={formik.handleBlur}
                                                    />
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
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
                                <div className='mt-3 space-y-2'>
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
