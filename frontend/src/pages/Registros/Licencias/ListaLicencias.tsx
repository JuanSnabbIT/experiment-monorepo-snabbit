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
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import {
    TIPO_MODALIDAD_ANUAL_FORMA_PAGO,
    TIPO_MODALIDAD_BASE_LICENCIA,
    TIPO_MONEDA_LICENCIA,
} from '@/constants/contrato.constant';
import { ILicencia } from '@/interface/contrato.interface';
import ApiService from '@/services/ApiService';
import { useAppDispatch, useAppSelector } from '@/store';
import {
    useCreateLicenciaCatalogoMutation,
    useGetLicenciasCatalogoQuery,
} from '@/store/slices/contratos/contratoApi';
import { listaProveedoresEmpresaThunk } from '@/store/slices/item/itemSlice';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
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

const columnHelper = createColumnHelper<ILicencia>();

const getModalidadLabel = (licencia: {
    modalidad_base: string;
    modalidad_anual_forma_pago: string | null;
}) => {
    if (licencia.modalidad_base === 'P1M') return 'P1M - Mensual';
    if (licencia.modalidad_base === 'P1Y') {
        return licencia.modalidad_anual_forma_pago === 'PAGO_MENSUAL'
            ? 'P1Y - Pago mensual'
            : 'P1Y - Pago unico';
    }
    return 'Pago unico';
};

const ListaLicencias = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaProveedoresEmpresa } = useAppSelector((state) => state.item);

    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [optionProveedores, setOptionProveedores] = useState<TSelectOption[]>([]);
    const [showQuickProveedor, setShowQuickProveedor] = useState(false);
    const [quickProveedor, setQuickProveedor] = useState<IQuickProveedor>({ nombre: '', rut: '' });
    const [isCreatingProveedor, setIsCreatingProveedor] = useState(false);

    const {
        data: licencias = [],
        isLoading,
        isFetching,
        isError,
        refetch,
    } = useGetLicenciasCatalogoQuery();
    const [createLicenciaCatalogo, { isLoading: isCreating }] = useCreateLicenciaCatalogoMutation();

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
                        values.modalidad_base === 'P1Y' && values.modalidad_anual_forma_pago !== ''
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

    const columns = [
        columnHelper.accessor('nombre', {
            header: 'Licencia',
            cell: (info) => (
                <div className='space-y-1'>
                    <div className='font-semibold text-zinc-700 dark:text-zinc-300'>
                        {info.row.original.nombre}
                    </div>
                    <div className='text-sm text-zinc-500 dark:text-zinc-400'>
                        {info.row.original.numero_parte || 'Sin número de parte'}
                    </div>
                </div>
            ),
        }),
        columnHelper.accessor('proveedor', {
            header: 'Proveedor',
            cell: (info) => (
                <div className='font-medium text-zinc-600 dark:text-zinc-400'>
                    {info.getValue() || 'Sin proveedor'}
                </div>
            ),
        }),
        columnHelper.display({
            id: 'modalidad',
            header: 'Modalidad',
            cell: (info) => (
                <div className='text-sm text-zinc-600 dark:text-zinc-400'>
                    {getModalidadLabel(info.row.original)}
                </div>
            ),
        }),
        columnHelper.accessor('precio_venta', {
            header: 'Precio venta',
            cell: (info) => (
                <div className='font-mono font-medium text-zinc-700 dark:text-zinc-300'>
                    {formatCurrency(info.getValue(), info.row.original.moneda)}
                </div>
            ),
        }),
        columnHelper.accessor('activo', {
            header: 'Estado',
            cell: (info) => (
                <Badge
                    variant='solid'
                    color={info.getValue() ? 'emerald' : 'zinc'}
                    className='capitalize shadow-sm'>
                    {info.getValue() ? 'Activa' : 'Inactiva'}
                </Badge>
            ),
        }),
        columnHelper.display({
            id: 'acciones',
            header: 'Acciones',
            cell: (info) => (
                <div className='flex gap-2'>
                    <Button
                        variant='solid'
                        color='violet'
                        icon='HeroEye'
                        onClick={() => navigate(`/registros/detalle-licencia/${info.row.original.id}`)}
                    />
                    <ConfirmarEliminar
                        mensaje='¿Eliminar esta licencia? Esta acción no se puede deshacer.'
                        peticionUrl={`/api/licencias/${info.row.original.id}/`}
                        onDispatch={() => {
                            refetch();
                            toast.success('Licencia eliminada');
                        }}
                    />
                </div>
            ),
        }),
    ];

    const table = useReactTable({
        data: rows,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        enableGlobalFilter: true,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        globalFilterFn: (row, _columnId, filterValue) => {
            const term = String(filterValue || '').toLowerCase().trim();
            if (!term) return true;
            const { nombre, proveedor, numero_parte, moneda } = row.original;
            return [nombre, proveedor, numero_parte, moneda]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(term));
        },
    });

    const showLoadingState = (isLoading || isFetching) && rows.length === 0;
    const showEmptyState = !isLoading && !isFetching && !isError && table.getRowModel().rows.length === 0;

    return (
        <PageWrapper isProtectedRoute name='Licencias' title='Licencias'>
            <Subheader>
                <SubheaderLeft>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        anchoInput={220}
                    />
                </SubheaderLeft>
                <SubheaderRight className='w-full md:w-auto'>
                    <div className='flex w-full flex-col gap-4 md:flex-row'>
                        <Button icon='HeroPlus' variant='solid' onClick={handleOpenModal}>
                            Nueva licencia
                        </Button>
                    </div>
                </SubheaderRight>
            </Subheader>

            <Container className='h-full w-full'>
                <Card className='h-full border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'>
                    <CardBody className='z-0 overflow-auto'>
                        {isError ? (
                            <Alert color='red' className='m-4'>
                                No se pudieron cargar las licencias.
                            </Alert>
                        ) : showLoadingState ? (
                            <div className='flex min-h-[220px] flex-col items-center justify-center gap-3 text-center'>
                                <Icon icon='HeroArrowPath' className='animate-spin text-3xl text-zinc-400' />
                                <div>
                                    <p className='font-medium text-zinc-700 dark:text-zinc-300'>
                                        Cargando licencias
                                    </p>
                                    <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                                        Estamos preparando el catálogo.
                                    </p>
                                </div>
                            </div>
                        ) : showEmptyState ? (
                            <div className='flex min-h-[220px] flex-col items-center justify-center gap-3 text-center'>
                                <Icon icon='HeroRectangleStack' className='text-3xl text-zinc-300 dark:text-zinc-600' />
                                <div>
                                    <p className='font-medium text-zinc-700 dark:text-zinc-300'>
                                        No hay licencias registradas
                                    </p>
                                    <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                                        Crea la primera licencia para comenzar.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Table className='min-w-[900px] table-fixed'>
                                    <THead>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <Tr key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <Th
                                                        key={header.id}
                                                        isColumnBorder={false}
                                                        className='text-left font-semibold text-zinc-900 dark:text-zinc-100'>
                                                        {header.isPlaceholder ? null : (
                                                            <div
                                                                aria-hidden='true'
                                                                className={
                                                                    header.column.getCanSort()
                                                                        ? 'flex cursor-pointer select-none items-center'
                                                                        : ''
                                                                }
                                                                onClick={header.column.getToggleSortingHandler()}>
                                                                {flexRender(
                                                                    header.column.columnDef.header,
                                                                    header.getContext(),
                                                                )}
                                                                {{
                                                                    asc: (
                                                                        <Icon
                                                                            icon='HeroChevronUp'
                                                                            className='text-zinc-400 ltr:ml-1.5 rtl:mr-1.5'
                                                                        />
                                                                    ),
                                                                    desc: (
                                                                        <Icon
                                                                            icon='HeroChevronDown'
                                                                            className='text-zinc-400 ltr:ml-1.5 rtl:mr-1.5'
                                                                        />
                                                                    ),
                                                                }[header.column.getIsSorted() as string] ?? null}
                                                            </div>
                                                        )}
                                                    </Th>
                                                ))}
                                            </Tr>
                                        ))}
                                    </THead>
                                    <TBody>
                                        {table.getRowModel().rows.map((row) => (
                                            <Tr
                                                key={row.id}
                                                className='transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50'>
                                                {row.getVisibleCells().map((cell) => (
                                                    <Td
                                                        key={cell.id}
                                                        className='border-b border-zinc-100 dark:border-zinc-800/50'>
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext(),
                                                        )}
                                                    </Td>
                                                ))}
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                                <div className='border-t border-zinc-200 p-4 dark:border-zinc-800'>
                                    <TableCardFooterTemplateV2 table={table} />
                                </div>
                            </>
                        )}
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
                                                    (option) => option.value === formik.values.modalidad_base,
                                                ) as unknown as TSelectOption
                                            }
                                            onChange={(option) => {
                                                const modalidad = (option as TSelectOption).value as
                                                    | 'P1M'
                                                    | 'P1Y'
                                                    | 'PAGO_UNICO';
                                                formik.setFieldValue('modalidad_base', modalidad);
                                                if (modalidad !== 'P1Y') {
                                                    formik.setFieldValue('modalidad_anual_forma_pago', '');
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
