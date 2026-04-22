import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { TIPO_MONEDA_LICENCIA } from '@/constants/contrato.constant';
import { useAppDispatch, useAppSelector } from '@/store';
import { useCreateLicenciaCatalogoMutation, useDeleteLicenciaCatalogoMutation, useGetLicenciasCatalogoQuery } from '@/store/slices/contratos/contratoApi';
import { listaProveedoresEmpresaThunk } from '@/store/slices/item/itemSlice';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

const MODALIDADES_PAGO_OPTIONS: TSelectOption[] = [
    { value: 'P1M', label: 'P1M — Mensual' },
    { value: 'P1M_P1Y', label: 'P1M con compromiso P1Y' },
    { value: 'P1Y', label: 'P1Y — Anual' },
    { value: 'PAGO_UNICO', label: 'Pago único' },
];

interface IFormValues {
    nombre: string;
    numero_parte: string;
    proveedor: string;
    descripcion: string;
    precio_compra: number;
    precio_venta: number;
    precio_venta_p1m: number;
    precio_venta_p1m_compromiso_p1y: number;
    precio_venta_p1y: number;
    precio_venta_pago_unico: number;
    precio_modalidad_p1m: number;
    precio_modalidad_p1m_compromiso_p1y: number;
    precio_modalidad_p1y: number;
    precio_modalidad_pago_unico: number;
    moneda: string;
    activo: boolean;
}

const ListaLicencias = () => {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaProveedoresEmpresa } = useAppSelector((state) => state.item);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState(1);
    const [selectedModalidadPago, setSelectedModalidadPago] = useState('P1M');
    const [optionProveedores, setOptionProveedores] = useState<TSelectOption[]>([]);
    const [modalidadError, setModalidadError] = useState<string | null>(null);
    const { data: licencias = [], isLoading, isFetching } = useGetLicenciasCatalogoQuery();
    const [createLicenciaCatalogo, { isLoading: isCreating }] = useCreateLicenciaCatalogoMutation();
    const [deleteLicenciaCatalogo, { isLoading: isDeleting }] = useDeleteLicenciaCatalogoMutation();

    const getPrecioModalidad = (licencia: any, modalidad: string) => {
        const value = (() => {
            switch (modalidad) {
                case 'P1M':
                    return licencia.precio_modalidad_p1m;
                case 'P1M_P1Y':
                    return licencia.precio_modalidad_p1m_compromiso_p1y;
                case 'P1Y':
                    return licencia.precio_modalidad_p1y;
                case 'PAGO_UNICO':
                    return licencia.precio_modalidad_pago_unico;
                default:
                    return 0;
            }
        })();

        return Number(value) || 0;
    };

    const getPrecioVentaModalidad = (licencia: any, modalidad: string) => {
        const value = (() => {
            switch (modalidad) {
                case 'P1M':
                    return licencia.precio_venta_p1m;
                case 'P1M_P1Y':
                    return licencia.precio_venta_p1m_compromiso_p1y;
                case 'P1Y':
                    return licencia.precio_venta_p1y;
                case 'PAGO_UNICO':
                    return licencia.precio_venta_pago_unico;
                default:
                    return 0;
            }
        })();

        return Number(value) || 0;
    };

    const formik = useFormik<IFormValues>({
        initialValues: {
            nombre: '',
            numero_parte: '',
            proveedor: '',
            descripcion: '',
            precio_compra: 0,
            precio_venta: 0,
            precio_venta_p1m: 0,
            precio_venta_p1m_compromiso_p1y: 0,
            precio_venta_p1y: 0,
            precio_venta_pago_unico: 0,
            precio_modalidad_p1m: 0,
            precio_modalidad_p1m_compromiso_p1y: 0,
            precio_modalidad_p1y: 0,
            precio_modalidad_pago_unico: 0,
            moneda: 'USD',
            activo: true,
        },
        validationSchema: Yup.object({
            nombre: Yup.string().required('Nombre es requerido'),
            precio_compra: Yup.number().min(0, 'Mínimo 0').required('Precio de partner es requerido'),
            precio_venta: Yup.number().min(0, 'Mínimo 0'),
            precio_venta_p1m: Yup.number().min(0, 'Mínimo 0'),
            precio_venta_p1m_compromiso_p1y: Yup.number().min(0, 'Mínimo 0'),
            precio_venta_p1y: Yup.number().min(0, 'Mínimo 0'),
            precio_venta_pago_unico: Yup.number().min(0, 'Mínimo 0'),
            precio_modalidad_p1m: Yup.number().min(0, 'Mínimo 0'),
            precio_modalidad_p1m_compromiso_p1y: Yup.number().min(0, 'Mínimo 0'),
            precio_modalidad_p1y: Yup.number().min(0, 'Mínimo 0'),
            precio_modalidad_pago_unico: Yup.number().min(0, 'Mínimo 0'),
            moneda: Yup.string().required('Moneda es requerida'),
        }),
        onSubmit: async (values) => {
            try {
                await createLicenciaCatalogo(values).unwrap();
                toast.success('Licencia creada');
                setIsModalOpen(false);
                setModalStep(1);
                formik.resetForm();
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    const WIZARD_STEPS = [
        { key: 1, label: 'Datos generales' },
        { key: 2, label: 'Precios por modalidad' },
    ];

    useEffect(() => {
        if (isModalOpen && personalizacionUsuario?.empresa) {
            dispatch(listaProveedoresEmpresaThunk({ id_empresa: personalizacionUsuario.empresa }));
        }
    }, [dispatch, isModalOpen, personalizacionUsuario?.empresa]);

    useEffect(() => {
        if (listaProveedoresEmpresa.length > 0) {
            setOptionProveedores(
                listaProveedoresEmpresa.map((prov) => ({
                    value: prov.nombre || prov.id.toString(),
                    label: prov.nombre,
                })),
            );
        } else {
            setOptionProveedores([]);
        }
    }, [listaProveedoresEmpresa]);

    const rows = useMemo(() => licencias || [], [licencias]);

    const handleNextStep = async () => {
        const errors = await formik.validateForm();

        if (errors.nombre || errors.moneda) {
            formik.setTouched({
                nombre: true,
                moneda: true,
            });
            return;
        }

        setModalidadError(null);
        setModalStep(2);
    };

    const handlePreviousStep = () => {
        setModalStep(1);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setModalStep(1);
        setModalidadError(null);
        formik.resetForm();
    };

    const handleOpenModal = () => {
        setModalStep(1);
        formik.resetForm();
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (modalStep === 1) {
            await handleNextStep();
            return;
        }

        const hasModalidadPrice = [
            formik.values.precio_modalidad_p1m,
            formik.values.precio_modalidad_p1m_compromiso_p1y,
            formik.values.precio_modalidad_p1y,
            formik.values.precio_modalidad_pago_unico,
        ].some((value) => Number(value) > 0);

        if (!hasModalidadPrice) {
            setModalidadError('Al menos un precio por modalidad debe ser mayor a 0.');
            return;
        }

        const hasModalidadSuggestedPrice = [
            formik.values.precio_venta_p1m,
            formik.values.precio_venta_p1m_compromiso_p1y,
            formik.values.precio_venta_p1y,
            formik.values.precio_venta_pago_unico,
        ].some((value) => Number(value) > 0);

        if (!hasModalidadSuggestedPrice) {
            setModalidadError('Al menos un precio de venta sugerido debe ser mayor a 0.');
            return;
        }

        setModalidadError(null);
        formik.handleSubmit(event);
    };

    const handleDelete = async (id: number) => {
        // eslint-disable-next-line no-alert
        if (!window.confirm('¿Eliminar esta licencia? Esta acción no se puede deshacer.')) {
            return;
        }
        try {
            await deleteLicenciaCatalogo(id).unwrap();
            toast.success('Licencia eliminada');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <PageWrapper isProtectedRoute name='Licencias' title='Licencias'>
            <Subheader>
                <SubheaderLeft>
                    <h1 className='text-lg font-semibold'>Catálogo de Licencias</h1>
                </SubheaderLeft>
                <SubheaderRight>
                    <Button icon='HeroPlus' variant='solid' onClick={handleOpenModal}>
                        Nueva licencia
                    </Button>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <Card>
                    <CardHeader>Licencias registradas</CardHeader>
                    <CardBody>
                        <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                            <div className='text-sm font-medium'>Selecciona modalidad de pago para ver el precio</div>
                            <div className='w-full sm:w-72'>
                                <SelectReact
                                    name='selectedModalidadPago'
                                    options={MODALIDADES_PAGO_OPTIONS}
                                    value={MODALIDADES_PAGO_OPTIONS.find(
                                        (option) => option.value === selectedModalidadPago,
                                    )}
                                    onChange={(option) =>
                                        setSelectedModalidadPago((option as TSelectOption).value)
                                    }
                                />
                            </div>
                        </div>
                        <div className='overflow-x-auto'>
                            <Table>
                                <THead>
                                    <Tr>
                                        <Th>Nombre</Th>
                                        <Th>Número de parte</Th>
                                        <Th>Moneda</Th>
                                        <Th>Precio partner</Th>
                                        <Th>Precio venta</Th>
                                        <Th>Activo</Th>
                                        <Th>Acciones</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {rows.map((licencia) => (
                                        <Tr key={licencia.id}>
                                            <Td>{licencia.nombre}</Td>
                                            <Td>{licencia.numero_parte || '—'}</Td>
                                            <Td>{licencia.moneda}</Td>
                                            <Td>{getPrecioModalidad(licencia, selectedModalidadPago).toFixed(2)}</Td>
                                            <Td>{getPrecioVentaModalidad(licencia, selectedModalidadPago).toFixed(2)}</Td>
                                            <Td>{licencia.activo ? 'Sí' : 'No'}</Td>
                                            <Td>
                                                <Button
                                                    variant='default'
                                                    color='red'
                                                    size='sm'
                                                    icon='HeroTrash'
                                                    aria-label='Eliminar licencia'
                                                    onClick={() => handleDelete(licencia.id)}
                                                    disabled={isDeleting}
                                                />
                                            </Td>
                                        </Tr>
                                    ))}
                                </TBody>
                            </Table>
                        </div>
                        {isLoading || isFetching ? (
                            <div className='mt-4 text-sm text-zinc-500'>Cargando licencias...</div>
                        ) : rows.length === 0 ? (
                            <div className='mt-4 text-sm text-zinc-500'>No hay licencias registradas.</div>
                        ) : null}
                    </CardBody>
                </Card>
            </Container>

            <Modal isOpen={isModalOpen} setIsOpen={handleCloseModal}>
                <ModalHeader>Crear licencia</ModalHeader>
                <form onSubmit={handleFormSubmit}>
                    <ModalBody>
                        <div className='mb-4 flex items-center justify-center gap-1'>
                            {WIZARD_STEPS.map((stepDef, index) => {
                                const isActive = stepDef.key === modalStep;
                                const isCompleted = stepDef.key < modalStep;
                                return (
                                    <div key={stepDef.key} className='flex items-center gap-1'>
                                        {index > 0 && (
                                            <div
                                                className={`h-0.5 w-6 ${
                                                    isCompleted
                                                        ? 'bg-blue-500'
                                                        : 'bg-zinc-300 dark:bg-zinc-600'
                                                }`}
                                            />
                                        )}
                                        <div
                                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                isActive
                                                    ? 'bg-blue-500 text-white'
                                                    : isCompleted
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                    : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
                                            }`}>
                                            {stepDef.label}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {modalStep === 1 ? (
                            <div className='grid gap-4'>
                                <div>
                                    <Label htmlFor='nombre'>Nombre</Label>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.nombre}
                                        invalidFeedback={formik.errors.nombre}>
                                        <Input
                                            name='nombre'
                                            value={formik.values.nombre}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                        />
                                    </Validation>
                                </div>
                                <div>
                                    <Label htmlFor='proveedor'>Proveedor</Label>
                                    <SelectReact
                                        name='proveedor'
                                        isCreatable
                                        options={optionProveedores}
                                        value={
                                            optionProveedores.find(
                                                (option) => option.value === formik.values.proveedor,
                                            ) ?? null
                                        }
                                        onChange={(option) =>
                                            formik.setFieldValue(
                                                'proveedor',
                                                (option as TSelectOption)?.value ?? '',
                                            )
                                        }
                                        onCreateOption={(inputValue) => {
                                            const newOption = { value: inputValue, label: inputValue };
                                            setOptionProveedores((prevOptions) => [...prevOptions, newOption]);
                                            formik.setFieldValue('proveedor', inputValue);
                                        }}
                                        formatCreateLabel={(inputValue) => `Crear proveedor: ${inputValue}`}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor='numero_parte'>Número de parte</Label>
                                    <Input
                                        name='numero_parte'
                                        value={formik.values.numero_parte}
                                        onChange={formik.handleChange}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor='moneda'>Moneda</Label>
                                    <SelectReact
                                        name='moneda'
                                        options={TIPO_MONEDA_LICENCIA}
                                        value={TIPO_MONEDA_LICENCIA.find(
                                            (option) => option.value === formik.values.moneda,
                                        )}
                                        onChange={(option) =>
                                            formik.setFieldValue('moneda', (option as TSelectOption).value)
                                        }
                                    />
                                </div>
                                <div>
                                    <Label htmlFor='descripcion'>Descripción</Label>
                                    <Textarea
                                        name='descripcion'
                                        value={formik.values.descripcion}
                                        onChange={formik.handleChange}
                                    />
                                </div>
                                <div>
                                    <Checkbox
                                        name='activo'
                                        checked={formik.values.activo}
                                        onChange={(event) =>
                                            formik.setFieldValue('activo', event.target.checked)
                                        }>
                                        Activo
                                    </Checkbox>
                                </div>
                            </div>
                        ) : (
                            <div className='space-y-4'>
                                {modalidadError && (
                                    <Alert color='red' variant='outline' className='rounded-2xl'>
                                        {modalidadError}
                                    </Alert>
                                )}
                                <div className='grid gap-4'>
                                    <div className='rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950'>
                                        <div className='mb-4 text-base font-semibold'>Pago Mensual</div>
                                        <div className='grid gap-4 md:grid-cols-2'>
                                            <div>
                                                <Label htmlFor='precio_modalidad_p1m'>Precio de partner</Label>
                                                <Input
                                                    name='precio_modalidad_p1m'
                                                    type='number'
                                                    value={formik.values.precio_modalidad_p1m}
                                                    onChange={formik.handleChange}
                                                    step='0.01'
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor='precio_venta_p1m'>Precio de venta sugerido</Label>
                                                <Input
                                                    name='precio_venta_p1m'
                                                    type='number'
                                                    value={formik.values.precio_venta_p1m}
                                                    onChange={formik.handleChange}
                                                    step='0.01'
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className='rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950'>
                                        <div className='mb-4 text-base font-semibold'>Pago mensual compromiso anual</div>
                                        <div className='grid gap-4 md:grid-cols-2'>
                                            <div>
                                                <Label htmlFor='precio_modalidad_p1m_compromiso_p1y'>Precio de partner</Label>
                                                <Input
                                                    name='precio_modalidad_p1m_compromiso_p1y'
                                                    type='number'
                                                    value={formik.values.precio_modalidad_p1m_compromiso_p1y}
                                                    onChange={formik.handleChange}
                                                    step='0.01'
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor='precio_venta_p1m_compromiso_p1y'>Precio de venta sugerido</Label>
                                                <Input
                                                    name='precio_venta_p1m_compromiso_p1y'
                                                    type='number'
                                                    value={formik.values.precio_venta_p1m_compromiso_p1y}
                                                    onChange={formik.handleChange}
                                                    step='0.01'
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className='rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950'>
                                        <div className='mb-4 text-base font-semibold'>Pago anual</div>
                                        <div className='grid gap-4 md:grid-cols-2'>
                                            <div>
                                                <Label htmlFor='precio_modalidad_p1y'>Precio de partner</Label>
                                                <Input
                                                    name='precio_modalidad_p1y'
                                                    type='number'
                                                    value={formik.values.precio_modalidad_p1y}
                                                    onChange={formik.handleChange}
                                                    step='0.01'
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor='precio_venta_p1y'>Precio de venta sugerido</Label>
                                                <Input
                                                    name='precio_venta_p1y'
                                                    type='number'
                                                    value={formik.values.precio_venta_p1y}
                                                    onChange={formik.handleChange}
                                                    step='0.01'
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className='rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950'>
                                        <div className='mb-4 text-base font-semibold'>Pago único</div>
                                        <div className='grid gap-4 md:grid-cols-2'>
                                            <div>
                                                <Label htmlFor='precio_modalidad_pago_unico'>Precio de partner</Label>
                                                <Input
                                                    name='precio_modalidad_pago_unico'
                                                    type='number'
                                                    value={formik.values.precio_modalidad_pago_unico}
                                                    onChange={formik.handleChange}
                                                    step='0.01'
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor='precio_venta_pago_unico'>Precio de venta sugerido</Label>
                                                <Input
                                                    name='precio_venta_pago_unico'
                                                    type='number'
                                                    value={formik.values.precio_venta_pago_unico}
                                                    onChange={formik.handleChange}
                                                    step='0.01'
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button type='button' variant='outline' onClick={handleCloseModal}>
                            Cancelar
                        </Button>
                        {modalStep === 2 ? (
                            <>
                                <Button type='button' variant='outline' onClick={handlePreviousStep}>
                                    Anterior
                                </Button>
                                <Button type='submit' variant='solid' disabled={isCreating}>
                                    Guardar
                                </Button>
                            </>
                        ) : (
                            <Button type='button' variant='solid' onClick={handleNextStep}>
                                Siguiente
                            </Button>
                        )}
                    </ModalFooter>
                </form>
            </Modal>
        </PageWrapper>
    );
};

export default ListaLicencias;
