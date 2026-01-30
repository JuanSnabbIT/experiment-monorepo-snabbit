import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { IItemEmpresa } from '@/interface/items.interface';
import { useAppDispatch, useAppSelector } from '@/store';
import {
    detalleProveedorEmpresaThunk,
    listaItemsEmpresaProveedorThunk,
    listaOrdenesCompraRecientesProveedorThunk,
} from '@/store/slices/item/itemSlice';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
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
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Input from '@/components/form/Input';
import ApiService from '@/services/ApiService';
import { toast } from 'react-toastify';
import Validation from '@/components/form/Validation';
import AgregarItem from './modals/AgregarItem';
import { IOrdenCompra } from '@/interface/bodega.interface';
import dayjs from 'dayjs';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';

const columnHelper = createColumnHelper<IItemEmpresa>();
const columnHelperOC = createColumnHelper<IOrdenCompra>();

const validationSchema = Yup.object({
    nombre: Yup.string().required('El nombre es requerido'),
    rut: Yup.string(),
    direccion: Yup.string(),
    telefono: Yup.string(),
    pagina_web: Yup.string().url('URL inválida'),
    region: Yup.number(),
    provincia: Yup.number(),
    comuna: Yup.number(),
    catalogo_web: Yup.string().url('URL inválida'),
    recargo_dolar: Yup.number()
        .required('Requerido')
        .nonNullable('Requerido')
        .min(-1, 'No puede ser menor a 0'),
});

function DetalleProveedorEmpresa() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { detalleProveedorEmpresa, listaItemsEmpresaProveedor } = useAppSelector(
        (state) => state.item,
    );
    const { listaComunas, listaProvincias, listaRegiones } = useAppSelector((state) => state.core);
    const { listaOrdenesCompraRecientesProveedor } = useAppSelector((state) => state.item);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [isEditing, setIsEditing] = useState(false);
    const [optRegiones, setOptRegiones] = useState<{ value: string; label: string }[]>([]);
    const [optProvincias, setOptProvincias] = useState<{ value: string; label: string }[]>([]);
    const [optComunas, setOptComunas] = useState<{ value: string; label: string }[]>([]);
    const [sortingOC, setSortingOC] = useState<SortingState>([]);
    const [globalFilterOC, setGlobalFilterOC] = useState<string>('');

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa && id) {
            dispatch(
                detalleProveedorEmpresaThunk({
                    id_empresa: personalizacionUsuario.empresa,
                    id_proveedor: id,
                }),
            );
            dispatch(
                listaItemsEmpresaProveedorThunk({
                    id_empresa: personalizacionUsuario.empresa,
                    id_proveedor: id,
                }),
            );
            dispatch(listaOrdenesCompraRecientesProveedorThunk({ dias: 30, id_proveedor: id }));
        }
    }, [personalizacionUsuario, id]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: detalleProveedorEmpresa?.nombre || '',
            rut: detalleProveedorEmpresa?.rut || '',
            direccion: detalleProveedorEmpresa?.direccion || '',
            ejecutivo_asignado: detalleProveedorEmpresa?.ejecutivo_asignado || '',
            email_ejecutivo: detalleProveedorEmpresa?.email_ejecutivo || '',
            telefono: detalleProveedorEmpresa?.telefono || '',
            pagina_web: detalleProveedorEmpresa?.pagina_web || '',
            region: detalleProveedorEmpresa?.region || '',
            provincia: detalleProveedorEmpresa?.provincia || '',
            comuna: detalleProveedorEmpresa?.comuna || '',
            catalogo_web: detalleProveedorEmpresa?.catalogo_web || '',
            recargo_dolar: detalleProveedorEmpresa?.recargo_dolar || 0,
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/empresas/${personalizacionUsuario?.empresa}/proveedores-empresa/${detalleProveedorEmpresa?.id}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(values),
                });
                if (response.data) {
                    dispatch(
                        detalleProveedorEmpresaThunk({
                            id_empresa: detalleProveedorEmpresa?.empresa,
                            id_proveedor: detalleProveedorEmpresa?.id,
                        }),
                    );
                    setIsEditing(false);
                    toast.success('Proveedor editado correctamente', { autoClose: 1000 });
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(' ');
                toast.error(mensajesError || 'Error al editar el proveedor', {
                    toastId: 'Error al editar el proveedor',
                });
            }
        },
    });

    useEffect(() => {
        setOptRegiones(
            listaRegiones.map((region) => {
                return { value: region.region_id.toString(), label: region.region_nombre };
            }),
        );
        setOptProvincias(
            listaProvincias.map((provincia) => {
                return {
                    value: provincia.provincia_id.toString(),
                    label: provincia.provincia_nombre,
                };
            }),
        );
        setOptComunas(
            listaComunas.map((comuna) => {
                return { value: comuna.comuna_id.toString(), label: comuna.comuna_nombre };
            }),
        );
    }, [listaComunas, listaProvincias, listaRegiones]);

    const columns = [
        columnHelper.accessor('nombre', {
            cell: (info) => info.getValue(),
            header: 'Nombre',
        }),
        columnHelper.accessor('datos_categoria.nombre', {
            cell: (info) => (
                <div>
                    {(info.row.original.datos_categoria &&
                        info.row.original.datos_categoria.nombre) ||
                        'Sin Categoria'}
                </div>
            ),
            header: 'Categoria',
        }),
        columnHelper.accessor('datos_fabricante.nombre', {
            cell: (info) => (
                <div>
                    {(info.row.original.datos_fabricante &&
                        info.row.original.datos_fabricante.nombre) ||
                        'Sin Fabricante'}
                </div>
            ),
            header: 'Fabricante',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex gap-2'>
                    <Tooltip text='Detalle'>
                        <Button
                            variant='solid'
                            color='violet'
                            icon='HeroEye'
                            onClick={() => {
                                navigate(`/registros/detalle-item-empresa/${info.row.original.id}`);
                            }}
                        />
                    </Tooltip>
                    <Tooltip text='Desasociar item del'>
                        <Button
                            variant='solid'
                            color='red'
                            onClick={async () => {
                                try {
                                    const response = await ApiService.fetchData({
                                        url: `/api/proveedores-empresa/${id}/desasociar_item/`,
                                        method: 'post',
                                        headers: { 'Content-Type': 'application/json' },
                                        data: JSON.stringify({ item_id: info.row.original.id }),
                                    });

                                    if (response.status === 200) {
                                        toast.success('Item desasociado correctamente');
                                        dispatch(
                                            listaItemsEmpresaProveedorThunk({
                                                id_empresa: personalizacionUsuario?.empresa,
                                                id_proveedor: id,
                                            }),
                                        );
                                    } else {
                                        toast.error('Hubo un error al desasociar el item.');
                                    }
                                } catch (error: any) {
                                    toast.error(
                                        error.response.data ||
                                            'Hubo un error al desasociar el item. Por favor, inténtelo de nuevo.',
                                        {
                                            toastId:
                                                'Hubo un error al desasociar el item. Por favor, inténtelo de nuevo.',
                                        },
                                    );
                                }
                            }}>
                            Desasociar
                        </Button>
                    </Tooltip>
                </div>
            ),
        }),
    ];

    const table = useReactTable({
        data: listaItemsEmpresaProveedor,
        columns: columns,
        state: {
            sorting: sorting,
            globalFilter: globalFilter,
        },
        onSortingChange: setSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const columnsOC = [
        columnHelperOC.accessor('codigo', {
            cell: (info) => info.getValue(),
            header: 'Codigo',
        }),
        columnHelperOC.accessor('nombre_cliente', {
            cell: (info) => info.getValue(),
            header: 'Cliente',
        }),
        columnHelperOC.accessor('fecha_creacion', {
            cell: (info) => (
                <div>{dayjs(info.row.original.fecha_creacion).format('DD/MM/YYYY')}</div>
            ),
            header: 'Fecha',
        }),
        columnHelperOC.display({
            id: 'acciones',
            cell: (info) => (
                <div>
                    <Tooltip text='Detalle'>
                        <Button
                            variant='solid'
                            icon='HeroEye'
                            color='violet'
                            onClick={() => {
                                navigate(`/compras/detalle-orden-compra/${info.row.original.id}`);
                            }}></Button>
                    </Tooltip>
                </div>
            ),
        }),
    ];

    const tableOC = useReactTable({
        data: listaOrdenesCompraRecientesProveedor,
        columns: columnsOC,
        state: {
            sorting: sortingOC,
            globalFilter: globalFilterOC,
        },
        onSortingChange: setSortingOC,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilterOC,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <PageWrapper
            isProtectedRoute={true}
            name='Detalle Proveedor Empresa'
            title='Detalle Proveedor Empresa'>
            <Subheader>
                <SubheaderLeft>
                    <Badge className='text-xl'>Detalle Proveedor Empresa</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    {isEditing ? (
                        <>
                            <Button
                                variant='solid'
                                onClick={() => {
                                    formik.handleSubmit();
                                }}>
                                Guardar
                            </Button>
                            <Button
                                variant='solid'
                                onClick={() => {
                                    setIsEditing(false);
                                    formik.setValues({
                                        nombre: detalleProveedorEmpresa?.nombre || '',
                                        rut: detalleProveedorEmpresa?.rut || '',
                                        direccion: detalleProveedorEmpresa?.direccion || '',
                                        ejecutivo_asignado:
                                            detalleProveedorEmpresa?.ejecutivo_asignado || '',
                                        email_ejecutivo:
                                            detalleProveedorEmpresa?.email_ejecutivo || '',
                                        telefono: detalleProveedorEmpresa?.telefono || '',
                                        pagina_web: detalleProveedorEmpresa?.pagina_web || '',
                                        region: detalleProveedorEmpresa?.region || '',
                                        provincia: detalleProveedorEmpresa?.provincia || '',
                                        comuna: detalleProveedorEmpresa?.comuna || '',
                                        catalogo_web: detalleProveedorEmpresa?.catalogo_web || '',
                                        recargo_dolar: detalleProveedorEmpresa?.recargo_dolar || 0,
                                    });
                                }}
                                color='red'>
                                Cancelar
                            </Button>
                        </>
                    ) : (
                        <Tooltip text='Editar Proveedor'>
                            <Button
                                variant='solid'
                                onClick={() => {
                                    setIsEditing(true);
                                }}
                                icon='HeroPencil'></Button>
                        </Tooltip>
                    )}
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex flex-col gap-4'>
                    <div className='w-full'>
                        <Card>
                            <CardHeader>
                                <Badge className='text-xl'>Datos Proveedor</Badge>
                            </CardHeader>
                            <CardBody>
                                <form onSubmit={formik.handleSubmit}>
                                    <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                                        <div className='w-full'>
                                            <Badge>Nombre</Badge>
                                            {isEditing ? (
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.nombre}
                                                    invalidFeedback={formik.errors.nombre}>
                                                    <Input
                                                        name='nombre'
                                                        placeholder='Ingrese un Nombre'
                                                        onChange={formik.handleChange}
                                                        onBlur={formik.handleBlur}
                                                        value={formik.values.nombre}
                                                    />
                                                </Validation>
                                            ) : (
                                                <div className=''>
                                                    {detalleProveedorEmpresa?.nombre}
                                                </div>
                                            )}
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Rut</Badge>
                                            {isEditing ? (
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.rut}
                                                    invalidFeedback={formik.errors.rut}>
                                                    <Input
                                                        name='rut'
                                                        placeholder='Ingrese un Rut'
                                                        onChange={formik.handleChange}
                                                        onBlur={formik.handleBlur}
                                                        value={formik.values.rut}
                                                    />
                                                </Validation>
                                            ) : (
                                                <div className='ml-4'>
                                                    {detalleProveedorEmpresa?.rut}
                                                </div>
                                            )}
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Dirección</Badge>
                                            {isEditing ? (
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.direccion}
                                                    invalidFeedback={formik.errors.direccion}>
                                                    <Input
                                                        name='direccion'
                                                        placeholder='Ingrese una Dirección'
                                                        onChange={formik.handleChange}
                                                        onBlur={formik.handleBlur}
                                                        value={formik.values.direccion}
                                                    />
                                                </Validation>
                                            ) : (
                                                <div className='ml-4'>
                                                    {detalleProveedorEmpresa?.direccion}
                                                </div>
                                            )}
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Ejecutivo</Badge>
                                            {isEditing ? (
                                                <Input
                                                    id='ejecutivo_asignado'
                                                    name='ejecutivo_asignado'
                                                    value={formik.values.ejecutivo_asignado}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                />
                                            ) : (
                                                <div className='ml-4'>
                                                    {detalleProveedorEmpresa?.ejecutivo_asignado
                                                        ? detalleProveedorEmpresa.ejecutivo_asignado
                                                        : 'Sin Ejecutivo'}
                                                </div>
                                            )}
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Recargo Por Dolar</Badge>
                                            {isEditing ? (
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.recargo_dolar}
                                                    invalidFeedback={formik.errors.recargo_dolar}>
                                                    <Input
                                                        name='recargo_dolar'
                                                        type='number'
                                                        onBlur={formik.handleBlur}
                                                        onChange={formik.handleChange}
                                                        value={formik.values.recargo_dolar}
                                                    />
                                                </Validation>
                                            ) : (
                                                <div className='ml-4'>
                                                    {detalleProveedorEmpresa?.recargo_dolar ||
                                                        'Sin Recargo'}
                                                </div>
                                            )}
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Correo Ejecutivo</Badge>
                                            {isEditing ? (
                                                <Input
                                                    id='email_ejecutivo'
                                                    name='email_ejecutivo'
                                                    value={formik.values.email_ejecutivo}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                />
                                            ) : (
                                                <div className='ml-4'>
                                                    {detalleProveedorEmpresa?.email_ejecutivo
                                                        ? detalleProveedorEmpresa.email_ejecutivo
                                                        : 'Sin Correo Ejecutivo'}
                                                </div>
                                            )}
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Telefono</Badge>
                                            {isEditing ? (
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.telefono}
                                                    invalidFeedback={formik.errors.telefono}>
                                                    <Input
                                                        name='telefono'
                                                        placeholder='Ingrese un Telefono'
                                                        onChange={formik.handleChange}
                                                        onBlur={formik.handleBlur}
                                                        value={formik.values.telefono}
                                                    />
                                                </Validation>
                                            ) : (
                                                <div className='ml-4'>
                                                    {detalleProveedorEmpresa?.telefono
                                                        ? detalleProveedorEmpresa.telefono
                                                        : 'Sin Telefono'}
                                                </div>
                                            )}
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Pagina Web</Badge>
                                            {isEditing ? (
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.pagina_web}
                                                    invalidFeedback={formik.errors.pagina_web}>
                                                    <Input
                                                        name='pagina_web'
                                                        placeholder='Ingrese una Pagina Web'
                                                        onChange={formik.handleChange}
                                                        onBlur={formik.handleBlur}
                                                        value={formik.values.pagina_web}
                                                    />
                                                </Validation>
                                            ) : (
                                                <div className='ml-4'>
                                                    {detalleProveedorEmpresa?.pagina_web
                                                        ? detalleProveedorEmpresa.pagina_web
                                                        : 'Sin Pagina'}
                                                </div>
                                            )}
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Region</Badge>
                                            {isEditing ? (
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.region}
                                                    invalidFeedback={formik.errors.region}>
                                                    <SelectReact
                                                        name='region'
                                                        placeholder='Seleccione una Región'
                                                        noOptionsMessage={(e) =>
                                                            `No existe la región ${e.inputValue}`
                                                        }
                                                        options={optRegiones}
                                                        onChange={(e) => {
                                                            formik.setFieldValue(
                                                                'region',
                                                                (e as TSelectOption).value,
                                                            );
                                                        }}
                                                        value={optRegiones.find(
                                                            (region) =>
                                                                region.value ===
                                                                formik.values.region.toString(),
                                                        )}
                                                    />
                                                </Validation>
                                            ) : (
                                                <div className='ml-4'>
                                                    {detalleProveedorEmpresa &&
                                                    detalleProveedorEmpresa.region > 0
                                                        ? listaRegiones.find(
                                                              (region) =>
                                                                  region.region_id ===
                                                                  detalleProveedorEmpresa.region,
                                                          )?.region_nombre
                                                        : 'Sin Region'}
                                                </div>
                                            )}
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Provincia</Badge>
                                            {isEditing ? (
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.provincia}
                                                    invalidFeedback={formik.errors.provincia}>
                                                    <SelectReact
                                                        name='provincia'
                                                        placeholder='Seleccione una Provincia'
                                                        noOptionsMessage={(e) =>
                                                            `No existe la provincia ${e.inputValue}`
                                                        }
                                                        options={optProvincias}
                                                        onChange={(e) => {
                                                            formik.setFieldValue(
                                                                'provincia',
                                                                (e as TSelectOption).value,
                                                            );
                                                        }}
                                                        value={optProvincias.find(
                                                            (provincia) =>
                                                                provincia.value ===
                                                                formik.values.provincia.toString(),
                                                        )}
                                                    />
                                                </Validation>
                                            ) : (
                                                <div className='ml-4'>
                                                    {detalleProveedorEmpresa &&
                                                    detalleProveedorEmpresa.provincia > 0
                                                        ? listaProvincias.find(
                                                              (provincia) =>
                                                                  provincia.provincia_id ===
                                                                  detalleProveedorEmpresa.provincia,
                                                          )?.provincia_nombre
                                                        : 'Sin Provincia'}
                                                </div>
                                            )}
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Comuna</Badge>
                                            {isEditing ? (
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.comuna}
                                                    invalidFeedback={formik.errors.comuna}>
                                                    <SelectReact
                                                        name='comuna'
                                                        placeholder='Seleccione una Comuna'
                                                        noOptionsMessage={(e) =>
                                                            `No existe la comuna ${e.inputValue}`
                                                        }
                                                        options={optComunas}
                                                        onChange={(e) => {
                                                            formik.setFieldValue(
                                                                'comuna',
                                                                (e as TSelectOption).value,
                                                            );
                                                        }}
                                                        value={optComunas.find(
                                                            (comuna) =>
                                                                comuna.value ===
                                                                formik.values.comuna.toString(),
                                                        )}
                                                    />
                                                </Validation>
                                            ) : (
                                                <div className='ml-4'>
                                                    {detalleProveedorEmpresa &&
                                                    detalleProveedorEmpresa.comuna > 0
                                                        ? listaComunas.find(
                                                              (comuna) =>
                                                                  comuna.comuna_id ===
                                                                  detalleProveedorEmpresa.comuna,
                                                          )?.comuna_nombre
                                                        : 'Sin Comuna'}
                                                </div>
                                            )}
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Catalogo Web</Badge>
                                            {isEditing ? (
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.catalogo_web}
                                                    invalidFeedback={formik.errors.catalogo_web}>
                                                    <Input
                                                        name='catalogo_web'
                                                        placeholder='Ingrese la URL del Catalogo Web'
                                                        onChange={formik.handleChange}
                                                        onBlur={formik.handleBlur}
                                                        value={formik.values.catalogo_web}
                                                    />
                                                </Validation>
                                            ) : (
                                                <div className='ml-4'>
                                                    {detalleProveedorEmpresa?.catalogo_web
                                                        ? detalleProveedorEmpresa.catalogo_web
                                                        : 'Sin Catalogo'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </CardBody>
                        </Card>
                    </div>

                    <div className='grid w-full grid-cols-1 gap-4 lg:grid-cols-2'>
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className='text-xl'>Items del Proveedor</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    <AnimacionDeInputModoMovil
                                        globalFilter={globalFilter}
                                        setGlobalFilter={setGlobalFilter}
                                        anchoInput={200}>
                                        {personalizacionUsuario?.empresa && (
                                            <AgregarItem
                                                id_empresa={personalizacionUsuario.empresa}
                                                id_proveedor={Number(id)}
                                            />
                                        )}
                                    </AnimacionDeInputModoMovil>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='z-0'>
                                <div className='overflow-auto'>
                                    <Table className='min-w-[850px] table-fixed'>
                                        <THead>
                                            {table.getHeaderGroups().map((headerGroup) => (
                                                <Tr key={headerGroup.id}>
                                                    {headerGroup.headers.map((header) => (
                                                        <Th
                                                            key={header.id}
                                                            isColumnBorder={false}
                                                            className='text-left'>
                                                            {header.isPlaceholder ? null : (
                                                                <div
                                                                    key={header.id}
                                                                    aria-hidden='true'
                                                                    {...{
                                                                        className:
                                                                            header.column.getCanSort()
                                                                                ? 'cursor-pointer select-none flex items-center'
                                                                                : '',
                                                                        onClick:
                                                                            header.column.getToggleSortingHandler(),
                                                                    }}>
                                                                    {flexRender(
                                                                        header.column.columnDef
                                                                            .header,
                                                                        header.getContext(),
                                                                    )}
                                                                    {{
                                                                        asc: (
                                                                            <Icon
                                                                                icon='HeroChevronUp'
                                                                                className='ltr:ml-1.5 rtl:mr-1.5'
                                                                            />
                                                                        ),
                                                                        desc: (
                                                                            <Icon
                                                                                icon='HeroChevronDown'
                                                                                className='ltr:ml-1.5 rtl:mr-1.5'
                                                                            />
                                                                        ),
                                                                    }[
                                                                        header.column.getIsSorted() as string
                                                                    ] ?? null}
                                                                </div>
                                                            )}
                                                        </Th>
                                                    ))}
                                                </Tr>
                                            ))}
                                        </THead>
                                        <TBody>
                                            {table.getRowModel().rows.map((row) => (
                                                <Tr key={row.id}>
                                                    {row.getVisibleCells().map((cell) => (
                                                        <Td key={cell.id}>
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
                                    <div className='mt-2 min-w-[850px]'>
                                        <TableCardFooterTemplateV2 table={table} />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className='text-xl'>Últimas Ordenes de Compra</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    <AnimacionDeInputModoMovil
                                        globalFilter={globalFilterOC}
                                        setGlobalFilter={setGlobalFilterOC}
                                        anchoInput={200}
                                    />
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='z-0'>
                                <div className='overflow-auto'>
                                    <Table className='min-w-[550px] table-fixed'>
                                        <THead>
                                            {tableOC.getHeaderGroups().map((headerGroup) => (
                                                <Tr key={headerGroup.id}>
                                                    {headerGroup.headers.map((header) => (
                                                        <Th
                                                            key={header.id}
                                                            isColumnBorder={false}
                                                            className='text-left'>
                                                            {header.isPlaceholder ? null : (
                                                                <div
                                                                    key={header.id}
                                                                    aria-hidden='true'
                                                                    {...{
                                                                        className:
                                                                            header.column.getCanSort()
                                                                                ? 'cursor-pointer select-none flex items-center'
                                                                                : '',
                                                                        onClick:
                                                                            header.column.getToggleSortingHandler(),
                                                                    }}>
                                                                    {flexRender(
                                                                        header.column.columnDef
                                                                            .header,
                                                                        header.getContext(),
                                                                    )}
                                                                    {{
                                                                        asc: (
                                                                            <Icon
                                                                                icon='HeroChevronUp'
                                                                                className='ltr:ml-1.5 rtl:mr-1.5'
                                                                            />
                                                                        ),
                                                                        desc: (
                                                                            <Icon
                                                                                icon='HeroChevronDown'
                                                                                className='ltr:ml-1.5 rtl:mr-1.5'
                                                                            />
                                                                        ),
                                                                    }[
                                                                        header.column.getIsSorted() as string
                                                                    ] ?? null}
                                                                </div>
                                                            )}
                                                        </Th>
                                                    ))}
                                                </Tr>
                                            ))}
                                        </THead>
                                        <TBody>
                                            {tableOC.getRowModel().rows.map((row) => (
                                                <Tr key={row.id}>
                                                    {row.getVisibleCells().map((cell) => (
                                                        <Td key={cell.id}>
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
                                    <div className='mt-2 min-w-[550px]'>
                                        <TableCardFooterTemplateV2 table={tableOC} />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </Container>
        </PageWrapper>
    );
}

export default DetalleProveedorEmpresa;
