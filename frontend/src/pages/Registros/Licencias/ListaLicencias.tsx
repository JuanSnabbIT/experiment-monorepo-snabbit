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
import {
    TIPO_MODALIDAD_ANUAL_FORMA_PAGO,
    TIPO_MODALIDAD_BASE_LICENCIA,
    TIPO_MONEDA_LICENCIA,
} from '@/constants/contrato.constant';
import ApiService from '@/services/ApiService';
import { useAppDispatch, useAppSelector } from '@/store';
import {
    useCreateLicenciaCatalogoMutation,
    useDeleteLicenciaCatalogoMutation,
    useGetLicenciasCatalogoQuery,
} from '@/store/slices/contratos/contratoApi';
import { listaProveedoresEmpresaThunk } from '@/store/slices/item/itemSlice';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IFormValues {
    nombre: string;
    numero_parte: string;
    proveedor: string;
    descripcion: string;
    modalidad_base: 'P1M' | 'P1Y' | 'PAGO_UNICO';
    modalidad_anual_forma_pago: 'PAGO_UNICO' | 'PAGO_MENSUAL' | '';
    precio_partner: number;
    precio_venta: number;
    moneda: string;
    activo: boolean;
}

interface IQuickProveedor {
    nombre: string;
    rut: string;
}

const getModalidadLabel = (licencia: {
    modalidad_base: string;
    modalidad_anual_forma_pago: string | null;
}) => {
    if (licencia.modalidad_base === 'P1M') {
        return 'P1M - Mensual';
    }
    if (licencia.modalidad_base === 'P1Y') {
        if (licencia.modalidad_anual_forma_pago === 'PAGO_MENSUAL') {
            return 'P1Y - Pago mensual';
        }
        return 'P1Y - Pago unico';
    }
    return 'Pago unico';
};

const ListaLicencias = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaProveedoresEmpresa } = useAppSelector((state) => state.item);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [optionProveedores, setOptionProveedores] = useState<TSelectOption[]>([]);
    const [showQuickProveedor, setShowQuickProveedor] = useState(false);
    const [quickProveedor, setQuickProveedor] = useState<IQuickProveedor>({ nombre: '', rut: '' });
    const [isCreatingProveedor, setIsCreatingProveedor] = useState(false);

    const { data: licencias = [], isLoading, isFetching } = useGetLicenciasCatalogoQuery();
    const [createLicenciaCatalogo, { isLoading: isCreating }] = useCreateLicenciaCatalogoMutation();
    const [deleteLicenciaCatalogo, { isLoading: isDeleting }] = useDeleteLicenciaCatalogoMutation();

    const formik = useFormik<IFormValues>({
        initialValues: {
            nombre: '',
            numero_parte: '',
            proveedor: '',
            descripcion: '',
            modalidad_base: 'P1M',
            modalidad_anual_forma_pago: '',
            precio_partner: 0,
            precio_venta: 0,
            moneda: 'USD',
            activo: true,
        },
        validationSchema: Yup.object({
            nombre: Yup.string().required('Nombre es requerido'),
            modalidad_base: Yup.mixed<'P1M' | 'P1Y' | 'PAGO_UNICO'>()
                .oneOf(['P1M', 'P1Y', 'PAGO_UNICO'])
                .required('Modalidad es requerida'),
            modalidad_anual_forma_pago: Yup.string().when('modalidad_base', {
                is: 'P1Y',
                then: (schema) => schema.required('Forma de pago anual es requerida'),
                otherwise: (schema) => schema.notRequired(),
            }),
            precio_partner: Yup.number()
                .moreThan(0, 'Debe ser mayor a 0')
                .required('Precio partner es requerido'),
            precio_venta: Yup.number()
                .moreThan(0, 'Debe ser mayor a 0')
                .required('Precio venta es requerido'),
            moneda: Yup.string().required('Moneda es requerida'),
        }),
        onSubmit: async (values) => {
            try {
                await createLicenciaCatalogo({
                    ...values,
                    modalidad_anual_forma_pago:
                        values.modalidad_base === 'P1Y' &&
                        values.modalidad_anual_forma_pago !== ''
                            ? values.modalidad_anual_forma_pago
                            : null,
                }).unwrap();
                toast.success('Licencia creada');
                handleCloseModal();
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
        setOptionProveedores(
            listaProveedoresEmpresa.map((proveedor) => ({
                value: proveedor.nombre,
                label: proveedor.nombre,
            })),
        );
    }, [listaProveedoresEmpresa]);

    const rows = useMemo(() => licencias || [], [licencias]);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setShowQuickProveedor(false);
        setQuickProveedor({ nombre: '', rut: '' });
        formik.resetForm();
    };

    const handleOpenModal = () => {
        formik.resetForm();
        setShowQuickProveedor(false);
        setQuickProveedor({ nombre: '', rut: '' });
        setIsModalOpen(true);
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

    const handleCreateProveedorRapido = async () => {
        const empresaId = personalizacionUsuario?.empresa;
        if (!empresaId) {
            toast.error('No fue posible identificar la empresa.');
            return;
        }
        if (!quickProveedor.nombre.trim() || !quickProveedor.rut.trim()) {
            toast.error('Nombre y RUT son obligatorios para crear proveedor.');
            return;
        }

        setIsCreatingProveedor(true);
        try {
            const response = await ApiService.fetchData<{ nombre: string }>({
                url: `/api/empresas/${empresaId}/proveedores-empresa/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: {
                    empresa: empresaId,
                    nombre: quickProveedor.nombre.trim(),
                    rut: quickProveedor.rut.trim(),
                },
            });

            const proveedorNombre = response.data?.nombre ?? quickProveedor.nombre.trim();
            await dispatch(listaProveedoresEmpresaThunk({ id_empresa: empresaId }));
            formik.setFieldValue('proveedor', proveedorNombre);
            setQuickProveedor({ nombre: '', rut: '' });
            setShowQuickProveedor(false);
            toast.success('Proveedor creado y seleccionado');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setIsCreatingProveedor(false);
        }
    };

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await formik.submitForm();
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
                        <div className='overflow-x-auto'>
                            <Table>
                                <THead>
                                    <Tr>
                                        <Th>Nombre</Th>
                                        <Th>Modalidad</Th>
                                        <Th>Moneda</Th>
                                        <Th>Precio venta</Th>
                                        <Th>Acciones</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {rows.map((licencia) => (
                                        <Tr key={licencia.id}>
                                            <Td>{licencia.nombre}</Td>
                                            <Td>{getModalidadLabel(licencia)}</Td>
                                            <Td>{licencia.moneda}</Td>
                                            <Td>{Number(licencia.precio_venta || 0).toFixed(2)}</Td>
                                            <Td>
                                                <div className='flex items-center gap-2'>
                                                    <Button
                                                        variant='outline'
                                                        size='sm'
                                                        icon='HeroEye'
                                                        onClick={() =>
                                                            navigate(`/registros/detalle-licencia/${licencia.id}`)
                                                        }>
                                                        Ver detalle
                                                    </Button>
                                                    <Button
                                                        variant='default'
                                                        color='red'
                                                        size='sm'
                                                        icon='HeroTrash'
                                                        aria-label='Eliminar licencia'
                                                        onClick={() => handleDelete(licencia.id)}
                                                        disabled={isDeleting}
                                                    />
                                                </div>
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
                                <div className='mb-1 flex items-center justify-between'>
                                    <Label htmlFor='proveedor'>Proveedor</Label>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        icon='HeroPlus'
                                        onClick={() => setShowQuickProveedor((prev) => !prev)}>
                                        Crear proveedor rápido
                                    </Button>
                                </div>
                                <SelectReact
                                    name='proveedor'
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
                                    isClearable
                                />
                            </div>

                            {showQuickProveedor && (
                                <div className='space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700'>
                                    <Alert color='blue' variant='outline' className='rounded-lg'>
                                        Creación rápida de proveedor: solo nombre y RUT.
                                    </Alert>
                                    <div className='grid gap-3 md:grid-cols-2'>
                                        <div>
                                            <Label htmlFor='quick_proveedor_nombre'>Nombre proveedor</Label>
                                            <Input
                                                name='quick_proveedor_nombre'
                                                value={quickProveedor.nombre}
                                                onChange={(e) =>
                                                    setQuickProveedor((prev) => ({
                                                        ...prev,
                                                        nombre: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor='quick_proveedor_rut'>RUT</Label>
                                            <Input
                                                name='quick_proveedor_rut'
                                                value={quickProveedor.rut}
                                                onChange={(e) =>
                                                    setQuickProveedor((prev) => ({
                                                        ...prev,
                                                        rut: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className='flex justify-end'>
                                        <Button
                                            type='button'
                                            variant='solid'
                                            onClick={handleCreateProveedorRapido}
                                            disabled={isCreatingProveedor}>
                                            Crear y seleccionar proveedor
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <Label htmlFor='numero_parte'>Número de parte</Label>
                                <Input
                                    name='numero_parte'
                                    value={formik.values.numero_parte}
                                    onChange={formik.handleChange}
                                />
                            </div>

                            <div className='grid gap-4 md:grid-cols-2'>
                                <div>
                                    <Label htmlFor='modalidad_base'>Modalidad</Label>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.modalidad_base}
                                        invalidFeedback={formik.errors.modalidad_base as string}>
                                        <SelectReact
                                            name='modalidad_base'
                                            options={[...TIPO_MODALIDAD_BASE_LICENCIA]}
                                            value={
                                                [...TIPO_MODALIDAD_BASE_LICENCIA].find(
                                                    (option) =>
                                                        option.value === formik.values.modalidad_base,
                                                ) as unknown as TSelectOption
                                            }
                                            onChange={(option) => {
                                                const modalidad = (option as TSelectOption).value as
                                                    | 'P1M'
                                                    | 'P1Y'
                                                    | 'PAGO_UNICO';
                                                formik.setFieldValue('modalidad_base', modalidad);
                                                if (modalidad !== 'P1Y') {
                                                    formik.setFieldValue(
                                                        'modalidad_anual_forma_pago',
                                                        '',
                                                    );
                                                }
                                            }}
                                        />
                                    </Validation>
                                </div>

                                {formik.values.modalidad_base === 'P1Y' && (
                                    <div>
                                        <Label htmlFor='modalidad_anual_forma_pago'>Forma pago anual</Label>
                                        <Validation
                                            isValid={formik.isValid}
                                            isTouched={formik.touched.modalidad_anual_forma_pago}
                                            invalidFeedback={
                                                formik.errors.modalidad_anual_forma_pago as string
                                            }>
                                            <SelectReact
                                                name='modalidad_anual_forma_pago'
                                                options={[...TIPO_MODALIDAD_ANUAL_FORMA_PAGO]}
                                                value={
                                                    [...TIPO_MODALIDAD_ANUAL_FORMA_PAGO].find(
                                                        (option) =>
                                                            option.value ===
                                                            formik.values.modalidad_anual_forma_pago,
                                                    ) as unknown as TSelectOption
                                                }
                                                onChange={(option) =>
                                                    formik.setFieldValue(
                                                        'modalidad_anual_forma_pago',
                                                        (option as TSelectOption).value,
                                                    )
                                                }
                                            />
                                        </Validation>
                                    </div>
                                )}
                            </div>

                            <div className='grid gap-4 md:grid-cols-2'>
                                <div>
                                    <Label htmlFor='precio_partner'>Precio partner</Label>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.precio_partner}
                                        invalidFeedback={formik.errors.precio_partner as string}>
                                        <Input
                                            name='precio_partner'
                                            type='number'
                                            value={formik.values.precio_partner}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            step='0.01'
                                        />
                                    </Validation>
                                </div>
                                <div>
                                    <Label htmlFor='precio_venta'>Precio venta</Label>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.precio_venta}
                                        invalidFeedback={formik.errors.precio_venta as string}>
                                        <Input
                                            name='precio_venta'
                                            type='number'
                                            value={formik.values.precio_venta}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            step='0.01'
                                        />
                                    </Validation>
                                </div>
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
                    </ModalBody>
                    <ModalFooter>
                        <Button type='button' variant='outline' onClick={handleCloseModal}>
                            Cancelar
                        </Button>
                        <Button type='submit' variant='solid' disabled={isCreating}>
                            Guardar
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>
        </PageWrapper>
    );
};

export default ListaLicencias;
