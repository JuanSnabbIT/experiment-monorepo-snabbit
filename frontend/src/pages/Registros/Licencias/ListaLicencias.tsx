import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { TIPO_MONEDA_LICENCIA } from '@/constants/contrato.constant';
import { useAppDispatch, useAppSelector } from '@/store';
import {
    useCreateLicenciaCatalogoMutation,
    useDeleteLicenciaCatalogoMutation,
    useGetLicenciasCatalogoQuery,
} from '@/store/slices/contratos/contratoApi';
import { listaProveedoresEmpresaThunk } from '@/store/slices/item/itemSlice';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

const MODALIDADES_PAGO_OPTIONS: TSelectOption[] = [
    { value: 'P1M', label: 'P1M - Mensual' },
    { value: 'P1M_P1Y', label: 'P1M con compromiso P1Y' },
    { value: 'P1Y', label: 'P1Y - Anual' },
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

const WIZARD_STEPS = [
    { key: 1, label: 'Datos generales' },
    { key: 2, label: 'Precios por modalidad' },
];

const MODALIDAD_SECTIONS = [
    {
        key: 'p1m',
        title: 'Pago mensual',
        partnerField: 'precio_modalidad_p1m',
        saleField: 'precio_venta_p1m',
    },
    {
        key: 'p1m_p1y',
        title: 'Pago mensual con compromiso anual',
        partnerField: 'precio_modalidad_p1m_compromiso_p1y',
        saleField: 'precio_venta_p1m_compromiso_p1y',
    },
    {
        key: 'p1y',
        title: 'Pago anual',
        partnerField: 'precio_modalidad_p1y',
        saleField: 'precio_venta_p1y',
    },
    {
        key: 'pago_unico',
        title: 'Pago único',
        partnerField: 'precio_modalidad_pago_unico',
        saleField: 'precio_venta_pago_unico',
    },
] as const;

const ListaLicencias = () => {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaProveedoresEmpresa } = useAppSelector((state) => state.item);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState(1);
    const [selectedModalidadPago, setSelectedModalidadPago] = useState('P1M');
    const [optionProveedores, setOptionProveedores] = useState<TSelectOption[]>([]);
    const [modalidadError, setModalidadError] = useState<string | null>(null);

    const {
        data: licencias = [],
        isLoading,
        isFetching,
        isError,
    } = useGetLicenciasCatalogoQuery();
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

    const handlePreviousStep = () => setModalStep(1);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setModalStep(1);
        setModalidadError(null);
        formik.resetForm();
    };

    const handleOpenModal = () => {
        setModalStep(1);
        formik.resetForm();
        setModalidadError(null);
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
                    <div>
                        <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                            Registros
                        </div>
                        <h1 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                            Catálogo de licencias
                        </h1>
                    </div>
                </SubheaderLeft>
                <SubheaderRight className='w-full md:w-auto'>
                    <div className='flex w-full flex-col gap-4 md:flex-row md:items-center'>
                        <div className='min-w-[260px]'>
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
                        <Button icon='HeroPlus' variant='solid' onClick={handleOpenModal}>
                            Nueva licencia
                        </Button>
                    </div>
                </SubheaderRight>
            </Subheader>

            <Container className='h-full w-full'>
                <div className='grid grid-cols-1 gap-4'>
                    <Card className='border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'>
                        <CardHeader>
                            <CardHeaderChild>
                                <div>
                                    <div className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                        Licencias registradas
                                    </div>
                                    <div className='text-xs text-zinc-500 dark:text-zinc-400'>
                                        Vista homologada con el patrón de cotizaciones para revisión rápida y acciones claras.
                                    </div>
                                </div>
                            </CardHeaderChild>
                            <CardHeaderChild>
                                <Badge variant='outline' color='zinc'>
                                    {rows.length} registros
                                </Badge>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody className='z-0 overflow-auto'>
                            {isError ? (
                                <Alert color='red' variant='outline'>
                                    No se pudo cargar el catálogo de licencias. Intenta nuevamente.
                                </Alert>
                            ) : isLoading || isFetching ? (
                                <div className='flex h-56 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400'>
                                    Cargando licencias...
                                </div>
                            ) : rows.length === 0 ? (
                                <div className='flex h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 text-center dark:border-zinc-800 dark:bg-zinc-950/40'>
                                    <Icon icon='HeroRectangleStack' className='text-4xl text-zinc-400' />
                                    <div>
                                        <div className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                            No hay licencias registradas
                                        </div>
                                        <div className='text-sm text-zinc-500 dark:text-zinc-400'>
                                            Crea una nueva licencia para comenzar a poblar el catálogo.
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Table className='min-w-[900px] table-fixed'>
                                    <THead>
                                        <Tr>
                                            <Th className='font-semibold text-zinc-900 dark:text-zinc-100'>Nombre</Th>
                                            <Th className='font-semibold text-zinc-900 dark:text-zinc-100'>Número de parte</Th>
                                            <Th className='font-semibold text-zinc-900 dark:text-zinc-100'>Moneda</Th>
                                            <Th className='font-semibold text-zinc-900 dark:text-zinc-100'>Precio partner</Th>
                                            <Th className='font-semibold text-zinc-900 dark:text-zinc-100'>Precio venta</Th>
                                            <Th className='font-semibold text-zinc-900 dark:text-zinc-100'>Estado</Th>
                                            <Th className='font-semibold text-zinc-900 dark:text-zinc-100'>Acciones</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {rows.map((licencia) => (
                                            <Tr
                                                key={licencia.id}
                                                className='transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50'>
                                                <Td className='border-b border-zinc-100 dark:border-zinc-800/50'>
                                                    <div className='font-semibold text-zinc-700 dark:text-zinc-300'>
                                                        {licencia.nombre}
                                                    </div>
                                                    <div className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                        {licencia.proveedor || 'Sin proveedor'}
                                                    </div>
                                                </Td>
                                                <Td className='border-b border-zinc-100 dark:border-zinc-800/50'>
                                                    <span className='text-sm text-zinc-600 dark:text-zinc-400'>
                                                        {licencia.numero_parte || '—'}
                                                    </span>
                                                </Td>
                                                <Td className='border-b border-zinc-100 dark:border-zinc-800/50'>
                                                    <Badge variant='outline' color='zinc'>
                                                        {licencia.moneda}
                                                    </Badge>
                                                </Td>
                                                <Td className='border-b border-zinc-100 font-mono dark:border-zinc-800/50'>
                                                    {formatCurrency(
                                                        getPrecioModalidad(licencia, selectedModalidadPago),
                                                        licencia.moneda,
                                                    )}
                                                </Td>
                                                <Td className='border-b border-zinc-100 font-mono dark:border-zinc-800/50'>
                                                    {formatCurrency(
                                                        getPrecioVentaModalidad(licencia, selectedModalidadPago),
                                                        licencia.moneda,
                                                    )}
                                                </Td>
                                                <Td className='border-b border-zinc-100 dark:border-zinc-800/50'>
                                                    <Badge
                                                        variant='solid'
                                                        color={licencia.activo ? 'emerald' : 'zinc'}>
                                                        {licencia.activo ? 'Activo' : 'Inactivo'}
                                                    </Badge>
                                                </Td>
                                                <Td className='border-b border-zinc-100 dark:border-zinc-800/50'>
                                                    <div className='flex gap-2'>
                                                        <Button
                                                            variant='solid'
                                                            color='red'
                                                            size='sm'
                                                            icon='HeroTrash'
                                                            aria-label='Eliminar licencia'
                                                            onClick={() => handleDelete(licencia.id)}
                                                            isDisable={isDeleting}
                                                        />
                                                    </div>
                                                </Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </Container>

            <Modal isOpen={isModalOpen} setIsOpen={handleCloseModal} size='xl'>
                <ModalHeader>Crear licencia</ModalHeader>
                <form onSubmit={handleFormSubmit}>
                    <ModalBody>
                        <div className='mb-6 flex flex-wrap items-center gap-2'>
                            {WIZARD_STEPS.map((stepDef) => {
                                const isActive = stepDef.key === modalStep;
                                const isCompleted = stepDef.key < modalStep;

                                return (
                                    <div
                                        key={stepDef.key}
                                        className='flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 dark:border-zinc-700'>
                                        <span
                                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                                                isActive
                                                    ? 'bg-violet-600 text-white'
                                                    : isCompleted
                                                      ? 'bg-emerald-500 text-white'
                                                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                                            }`}>
                                            {stepDef.key}
                                        </span>
                                        <span
                                            className={`text-sm ${
                                                isActive
                                                    ? 'font-semibold text-zinc-900 dark:text-zinc-100'
                                                    : 'text-zinc-500 dark:text-zinc-400'
                                            }`}>
                                            {stepDef.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {modalStep === 1 ? (
                            <div className='grid gap-4 md:grid-cols-2'>
                                <div className='md:col-span-2'>
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
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.moneda}
                                        invalidFeedback={formik.errors.moneda}>
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
                                    </Validation>
                                </div>

                                <div className='flex items-end'>
                                    <div className='rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-700'>
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

                                <div className='md:col-span-2'>
                                    <Label htmlFor='descripcion'>Descripción</Label>
                                    <Textarea
                                        name='descripcion'
                                        value={formik.values.descripcion}
                                        onChange={formik.handleChange}
                                    />
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
                                    {MODALIDAD_SECTIONS.map((section) => (
                                        <div
                                            key={section.key}
                                            className='rounded-2xl border border-zinc-200 bg-zinc-50/40 p-5 dark:border-zinc-800 dark:bg-zinc-950/40'>
                                            <div className='mb-4'>
                                                <div className='text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                                                    {section.title}
                                                </div>
                                                <div className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                    Define precio de partner y precio de venta sugerido.
                                                </div>
                                            </div>
                                            <div className='grid gap-4 md:grid-cols-2'>
                                                <div>
                                                    <Label htmlFor={section.partnerField}>Precio de partner</Label>
                                                    <Input
                                                        name={section.partnerField}
                                                        type='number'
                                                        value={formik.values[section.partnerField]}
                                                        onChange={formik.handleChange}
                                                        step='0.01'
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor={section.saleField}>Precio de venta sugerido</Label>
                                                    <Input
                                                        name={section.saleField}
                                                        type='number'
                                                        value={formik.values[section.saleField]}
                                                        onChange={formik.handleChange}
                                                        step='0.01'
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
                                <Button type='submit' variant='solid' isLoading={isCreating}>
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
