import ImageUploadEditor from '@/components/form/ImageUploadEditor';
import Input from '@/components/form/Input';
import Validation from '@/components/form/Validation';
import Icon from '@/components/icon/Icon';
import AuthorityCheckNav from '@/components/layouts/AuthorityCheckNav/AuthorityCheckNav';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { ISucursalEmpresa } from '@/interface/empresas.interface';
import { IInvitacionEmpresa } from '@/interface/invitacion.interface';
import ApiService from '@/services/ApiService';
import { listaInvitacionesThunk, useAppDispatch, useAppSelector } from '@/store';
import {
    useGetDetalleEmpresaQuery,
    useGetSucursalesEmpresaQuery,
    useUpdateEmpresaMutation,
} from '@/store/slices/empresa/empresaApi';
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
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { toast } from 'react-toastify';
import * as Yup from 'yup';
import EliminarInvitacionRechazada from '../InvitacionEmpresa/modals/EliminarInvitacionRechazada';
import ConfiguracionRRHH from '../RRHH/ConfiguracionRRHH';
import CrearInvitacionEmpresaDesdeDetalleEmpresa from './modals/CrearInvitacionEmpresaDesdeDetalleEmpresa';
import CrearSucursal from './modals/CrearSucursal';

const columnHelper = createColumnHelper<ISucursalEmpresa>();
const columnHelperInvitaciones = createColumnHelper<IInvitacionEmpresa>();

function DetalleEmpresa() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParamsEmpresa] = useSearchParams();

    const { listaInvitaciones } = useAppSelector((state) => state.invitacion);
    const { listaGrupos } = useAppSelector((state) => state.auth);
    const {
        data: detalleEmpresa,
        refetch: refetchDetalleEmpresa,
    } = useGetDetalleEmpresaQuery(id ?? '', { skip: !id });
    const {
        data: listaMisSucursales = [],
        refetch: refetchSucursales,
    } = useGetSucursalesEmpresaQuery(id, { skip: !id });
    const [updateEmpresa] = useUpdateEmpresaMutation();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [sortingInvitaciones, setSortingInvitaciones] = useState<SortingState>([]);
    const [globalFilterInvitaciones, setGlobalFilterInvitaciones] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [activeComponent, setActiveComponent] = useState<string>(
        searchParamsEmpresa.get('section') ?? 'Sucursales',
    );
    const [editandoLogo, setEditandoLogo] = useState<boolean>(false);
    const [tempLogo, setTempLogo] = useState<string>('');
    const [tempFirma, setTempFirma] = useState<string>('');

    useEffect(() => {
        if (id) {
            dispatch(listaInvitacionesThunk());
        }
    }, [id, dispatch]);

    const columns = [
        columnHelper.accessor('nombre', {
            cell: (info) => info.getValue(),
            header: 'Nombre',
        }),
        columnHelper.accessor('email', {
            cell: (info) => <div>{info.row.original.email || 'Sin Email'}</div>,
            header: 'Email',
        }),
        columnHelper.accessor('direccion', {
            cell: (info) => <div>{info.row.original.direccion || 'Sin Dirección'}</div>,
            header: 'Dirección',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <Tooltip text='Detalle Sucursal'>
                    <Button
                        variant='solid'
                        color='violet'
                        onClick={() => {
                            navigate(
                                `/empresas/${detalleEmpresa?.id}/detalle-sucursal/${info.row.original.id}/`,
                            );
                        }}
                        icon='HeroEye'></Button>
                </Tooltip>
            ),
        }),
    ];

    const table = useReactTable({
        data: listaMisSucursales,
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

    const columnsInvitaciones = [
        columnHelperInvitaciones.accessor('email', {
            cell: (info) => info.getValue(),
            header: 'Email',
        }),
        columnHelperInvitaciones.accessor('first_name', {
            cell: (info) => (
                <div>
                    {info.row.original.first_name} {info.row.original.last_name}
                </div>
            ),
            header: 'Nombre',
        }),
        columnHelperInvitaciones.display({
            id: 'estado',
            cell: (info) => (
                <div>
                    {info.row.original.is_accepted
                        ? 'Aceptada'
                        : info.row.original.is_denied
                          ? 'Rechazada'
                          : info.row.original.is_expired
                            ? 'Expirada'
                            : 'Pendiente'}
                </div>
            ),
            header: 'Estado',
        }),
        columnHelperInvitaciones.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex gap-2'>
                    {!info.row.original.is_accepted &&
                        !info.row.original.is_denied &&
                        !info.row.original.is_expired && (
                            <>
                                <Tooltip text='Reenviar'>
                                    <Button
                                        variant='solid'
                                        color='amber'
                                        onClick={async () => {
                                            try {
                                                const response = await ApiService.fetchData({
                                                    url: `/api/invitaciones-empresa/${info.row.original.id}/reenviar-invitacion/`,
                                                    method: 'post',
                                                });
                                                if (response.data) {
                                                    toast.success('Invitación reenviada');
                                                }
                                            } catch (error: any) {
                                                toast.error(error.response.data);
                                            }
                                        }}>
                                        Reenviar
                                    </Button>
                                </Tooltip>
                                <EliminarInvitacionRechazada
                                    invitacionId={info.row.original.id.toString()}
                                />
                            </>
                        )}
                    {info.row.original.is_accepted && info.row.original.id_user && (
                        <Tooltip text='Deshabilitar Usuario'>
                            <Button
                                variant='solid'
                                onClick={async () => {
                                    try {
                                        const response = await ApiService.fetchData({
                                            url: `/api/users/${info.row.original.id_user}/`,
                                            method: 'patch',
                                            headers: { 'Content-Type': 'application/json' },
                                            data: JSON.stringify({ is_active: false }),
                                        });
                                        if (response.data) {
                                            toast.success('Usuario deshabilitado', {
                                                autoClose: 1000,
                                            });
                                            dispatch(listaInvitacionesThunk());
                                        }
                                    } catch (error: any) {
                                        toast.error(
                                            error.response.data || 'Error al deshabilitar usuario',
                                            { toastId: 'Error al deshabilitar usuario' },
                                        );
                                    }
                                }}>
                                Deshabilitar
                            </Button>
                        </Tooltip>
                    )}
                </div>
            ),
            header: '',
        }),
    ];

    const tableInvitaciones = useReactTable({
        data: listaInvitaciones,
        columns: columnsInvitaciones,
        state: {
            sorting: sortingInvitaciones,
            globalFilter: globalFilterInvitaciones,
        },
        onSortingChange: setSortingInvitaciones,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilterInvitaciones,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            sitio_web: '',
            direccion_principal: '',
            recargo: 0,
            rut_empresa: '',
            telefono: '',
            email: '',
            ppm: 0,
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string()
                .required('Requerido')
                .max(255, 'Maximo 255 Caracteres')
                .nonNullable('Requerido'),
            sitio_web: Yup.string().nullable().notRequired(),
            direccion_principal: Yup.string()
                .required('Requerido')
                .max(250, 'Maximo 250 Caracteres')
                .nonNullable(),
            recargo: Yup.number()
                .required('Requerido')
                .min(0, 'Debe ser mayor o igual a 0')
                .nonNullable('Requerido'),
            rut_empresa: Yup.string().notRequired().nullable().max(100, 'Maximo 100 Caracteres'),
            telefono: Yup.string().notRequired().nullable().max(20, 'Maximo 20 Caracteres'),
            email: Yup.string().notRequired().nullable(),
            ppm: Yup.number()
                .required('Requerido')
                .min(0, 'Debe ser mayor o igual a 0')
                .nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            if (!id) return;
            try {
                await updateEmpresa({
                    id,
                    data: {
                        nombre: values.nombre,
                        sitio_web: values.sitio_web,
                        direccion_principal: values.direccion_principal,
                        recargo: values.recargo,
                        rut_empresa: values.rut_empresa,
                        telefono: values.telefono,
                        email: values.email,
                        ppm: values.ppm,
                    },
                }).unwrap();
                toast.success('Empresa editada', { autoClose: 1000 });
                formik.resetForm();
                setIsEditing(false);
                refetchDetalleEmpresa();
            } catch (error: any) {
                toast.error(error.response?.data || 'Error al editar la empresa', {
                    toastId: 'Error al editar la empresa',
                });
            }
        },
    });

    useEffect(() => {
        if (detalleEmpresa && isEditing) {
            formik.setValues({
                direccion_principal: detalleEmpresa.direccion_principal,
                email: detalleEmpresa.email || '',
                nombre: detalleEmpresa.nombre,
                recargo: Number(detalleEmpresa.recargo),
                rut_empresa: detalleEmpresa.rut_empresa || '',
                sitio_web: detalleEmpresa.sitio_web || '',
                telefono: detalleEmpresa.telefono || '',
                ppm: detalleEmpresa.ppm,
            });
        }
    }, [detalleEmpresa, isEditing]);

    useEffect(() => {
        if (activeComponent === 'Sucursales' && id) {
            refetchSucursales();
        }
        if (activeComponent === 'Invitaciones') {
            dispatch(listaInvitacionesThunk());
        }
    }, [activeComponent, dispatch, id, refetchSucursales]);

    return (
        <PageWrapper isProtectedRoute={true} name='Detalle Empresa' title='Detalle Empresa'>
            <Subheader>
                <SubheaderLeft>{null}</SubheaderLeft>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='grid grid-cols-1 gap-4'>
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Datos de la Empresa</Badge>
                            </CardHeaderChild>
                            <CardHeaderChild>
                                {isEditing ? (
                                    <>
                                        <Button
                                            color='red'
                                            onClick={() => {
                                                setIsEditing(false);
                                                formik.resetForm();
                                            }}>
                                            Cancelar
                                        </Button>
                                        <Button
                                            variant='solid'
                                            onClick={() => {
                                                formik.handleSubmit();
                                            }}>
                                            Guardar
                                        </Button>
                                    </>
                                ) : (
                                    <Tooltip text='Editar '>
                                        <Button
                                            variant='solid'
                                            onClick={() => setIsEditing(true)}
                                            icon='HeroPencil'></Button>
                                    </Tooltip>
                                )}
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                                {isEditing ? (
                                    <>
                                        <div>
                                            <Badge>Nombre</Badge>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.nombre}
                                                invalidFeedback={formik.errors.nombre}>
                                                <Input
                                                    name='nombre'
                                                    id='nombre'
                                                    type='text'
                                                    placeholder='Nombre'
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.nombre}
                                                />
                                            </Validation>
                                        </div>
                                        <div>
                                            <Badge>Rut de la Empresa</Badge>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.rut_empresa}
                                                invalidFeedback={formik.errors.rut_empresa}>
                                                <Input
                                                    name='rut_empresa'
                                                    id='rut_empresa'
                                                    type='text'
                                                    placeholder='Rut Empresa'
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.rut_empresa}
                                                />
                                            </Validation>
                                        </div>
                                        <div>
                                            <Badge>Dirección Principal</Badge>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.direccion_principal}
                                                invalidFeedback={formik.errors.direccion_principal}>
                                                <Input
                                                    id='direccion_principal'
                                                    name='direccion_principal'
                                                    type='text'
                                                    placeholder='Dirección Principal'
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.direccion_principal}
                                                />
                                            </Validation>
                                        </div>
                                        <div>
                                            <Badge>Teléfono</Badge>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.telefono}
                                                invalidFeedback={formik.errors.telefono}>
                                                <Input
                                                    name='telefono'
                                                    id='telefono'
                                                    type='text'
                                                    placeholder='Teléfono'
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.telefono}
                                                />
                                            </Validation>
                                        </div>
                                        <div>
                                            <Badge>Email</Badge>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.email}
                                                invalidFeedback={formik.errors.email}>
                                                <Input
                                                    name='email'
                                                    id='email'
                                                    type='text'
                                                    placeholder='Email'
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.email}
                                                />
                                            </Validation>
                                        </div>
                                        <div>
                                            <Badge>Sitio Web</Badge>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.sitio_web}
                                                invalidFeedback={formik.errors.sitio_web}>
                                                <Input
                                                    id='sitio_web'
                                                    name='sitio_web'
                                                    type='text'
                                                    placeholder='Sitio Web'
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.sitio_web}
                                                />
                                            </Validation>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className='w-full'>
                                            <Badge>Nombre</Badge>
                                            <div className='ml-4'>{detalleEmpresa?.nombre}</div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Rut de la Empresa</Badge>
                                            <div className='ml-4'>
                                                {detalleEmpresa?.rut_empresa || 'Sin Rut'}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Dirección Principal</Badge>
                                            <div className='ml-4'>
                                                {detalleEmpresa?.direccion_principal}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Teléfono</Badge>
                                            <div className='ml-4'>
                                                {detalleEmpresa?.telefono || 'Sin Teléfono'}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Email</Badge>
                                            <div className='ml-4'>
                                                {detalleEmpresa?.email || 'Sin Email'}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Sitio Web</Badge>
                                            <div className='ml-4'>
                                                {detalleEmpresa?.sitio_web
                                                    ? detalleEmpresa.sitio_web
                                                    : 'Sin sitio web'}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    <AuthorityCheckNav authority={['staff']} userAuthority={listaGrupos?.grupos}>
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className='text-xl'>Recargo y PPM</Badge>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className='grid grid-cols-2 gap-4'>
                                    {isEditing ? (
                                        <>
                                            <div>
                                                <Badge>Recargo</Badge>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.recargo}
                                                    invalidFeedback={formik.errors.recargo}>
                                                    <Input
                                                        name='recargo'
                                                        id='recargo'
                                                        type='number'
                                                        placeholder='Recargo'
                                                        onBlur={formik.handleBlur}
                                                        onChange={(e) => {
                                                            formik.setFieldValue(
                                                                'recargo',
                                                                Number(e.target.value),
                                                            );
                                                        }}
                                                        value={formik.values.recargo}
                                                    />
                                                </Validation>
                                            </div>
                                            <div>
                                                <Badge>PPM</Badge>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.ppm}
                                                    invalidFeedback={formik.errors.ppm}>
                                                    <Input
                                                        name='ppm'
                                                        id='ppm'
                                                        type='number'
                                                        placeholder='PPM'
                                                        onBlur={formik.handleBlur}
                                                        onChange={(e) => {
                                                            formik.setFieldValue(
                                                                'ppm',
                                                                Number(e.target.value),
                                                            );
                                                        }}
                                                        value={formik.values.ppm}
                                                    />
                                                </Validation>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className='w-full'>
                                                <Badge>Recargo</Badge>
                                                <div className='ml-4'>
                                                    {detalleEmpresa?.recargo
                                                        ? `${detalleEmpresa.recargo}%`
                                                        : 'Sin Recargo'}
                                                </div>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>PPM</Badge>
                                                <div className='ml-4'>
                                                    {detalleEmpresa?.ppm
                                                        ? `${detalleEmpresa.ppm}%`
                                                        : 'Sin PPM'}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    </AuthorityCheckNav>

                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Logo y Firma</Badge>
                            </CardHeaderChild>
                            <CardHeaderChild>
                                {editandoLogo ? (
                                    <>
                                        <Button
                                            color='red'
                                            onClick={() => {
                                                setEditandoLogo(false);
                                                setTempLogo('');
                                                setTempFirma('');
                                            }}>
                                            Cancelar
                                        </Button>
                                        <Button
                                            variant='solid'
                                            onClick={async () => {
                                                try {
                                                    const data: Record<string, string> = {};
                                                    if (tempLogo) {
                                                        data.logo = tempLogo;
                                                    }
                                                    if (tempFirma) {
                                                        data.firma_empresa = tempFirma;
                                                    }
                                                    if (Object.keys(data).length === 0) {
                                                        toast.info('No hay cambios para guardar');
                                                        return;
                                                    }
                                                    const response = await ApiService.fetchData({
                                                        url: `/api/empresas/${detalleEmpresa?.id}/`,
                                                        method: 'patch',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                        },
                                                        data: JSON.stringify(data),
                                                    });
                                                    if (response.data) {
                                                        toast.success('Logo y firma editados', {
                                                            autoClose: 1000,
                                                        });
                                                        refetchDetalleEmpresa();
                                                        setEditandoLogo(false);
                                                        setTempLogo('');
                                                        setTempFirma('');
                                                    }
                                                } catch (error: unknown) {
                                                    const err = error as { response?: { data?: string } };
                                                    toast.error(
                                                        err?.response?.data ||
                                                            'Error al guardar el logo y firma',
                                                        {
                                                            toastId:
                                                                'Error al guardar el logo y firma',
                                                        },
                                                    );
                                                }
                                            }}>
                                            Guardar
                                        </Button>
                                    </>
                                ) : (
                                    <Tooltip text='Editar Logo y Firma'>
                                        <Button
                                            variant='solid'
                                            icon='HeroPencil'
                                            onClick={() => {
                                                setEditandoLogo(true);
                                            }}></Button>
                                    </Tooltip>
                                )}
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                                {editandoLogo ? (
                                    <>
                                        <div className='col-span-1'>
                                            <ImageUploadEditor
                                                label='Logo'
                                                currentImage={detalleEmpresa?.logo || ''}
                                                defaultMaxWidth={400}
                                                defaultMaxHeight={200}
                                                outputFormat='image/png'
                                                onImageChange={(base64) => setTempLogo(base64)}
                                                onImageDelete={async () => {
                                                    try {
                                                        const response =
                                                            await ApiService.fetchData({
                                                                url: `/api/empresas/${detalleEmpresa?.id}/`,
                                                                method: 'patch',
                                                                headers: {
                                                                    'Content-Type':
                                                                        'application/json',
                                                                },
                                                                data: JSON.stringify({
                                                                    logo: '',
                                                                }),
                                                            });
                                                        if (response.data) {
                                                            toast.success('Logo eliminado', {
                                                                autoClose: 1000,
                                                            });
                                                            refetchDetalleEmpresa();
                                                        }
                                                    } catch (error: unknown) {
                                                        const err = error as { response?: { data?: string } };
                                                        toast.error(
                                                            err?.response?.data ||
                                                                'Error al eliminar el logo',
                                                            {
                                                                toastId:
                                                                    'Error al eliminar el logo',
                                                            },
                                                        );
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className='col-span-1'>
                                            <ImageUploadEditor
                                                label='Firma de la Empresa'
                                                currentImage={
                                                    detalleEmpresa?.firma_empresa || ''
                                                }
                                                defaultMaxWidth={600}
                                                defaultMaxHeight={200}
                                                outputFormat='image/png'
                                                onImageChange={(base64) => setTempFirma(base64)}
                                                onImageDelete={async () => {
                                                    try {
                                                        const response =
                                                            await ApiService.fetchData({
                                                                url: `/api/empresas/${detalleEmpresa?.id}/`,
                                                                method: 'patch',
                                                                headers: {
                                                                    'Content-Type':
                                                                        'application/json',
                                                                },
                                                                data: JSON.stringify({
                                                                    firma_empresa: '',
                                                                }),
                                                            });
                                                        if (response.data) {
                                                            toast.success('Firma eliminada', {
                                                                autoClose: 1000,
                                                            });
                                                            refetchDetalleEmpresa();
                                                        }
                                                    } catch (error: unknown) {
                                                        const err = error as { response?: { data?: string } };
                                                        toast.error(
                                                            err?.response?.data ||
                                                                'Error al eliminar la firma',
                                                            {
                                                                toastId:
                                                                    'Error al eliminar la firma',
                                                            },
                                                        );
                                                    }
                                                }}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className='col-span-1'>
                                            <Badge>Logo</Badge>
                                            {detalleEmpresa && detalleEmpresa.logo ? (
                                                <div className='mt-2'>
                                                    <img
                                                        src={detalleEmpresa.logo}
                                                        alt='Logo empresa'
                                                        className='max-h-40 rounded border border-zinc-200 dark:border-zinc-600'
                                                    />
                                                </div>
                                            ) : (
                                                <div className='ml-4 mt-2 text-zinc-500'>
                                                    Sin Logo
                                                </div>
                                            )}
                                        </div>
                                        <div className='col-span-1'>
                                            <Badge>Firma de la Empresa</Badge>
                                            {detalleEmpresa && detalleEmpresa.firma_empresa ? (
                                                <div className='mt-2'>
                                                    <img
                                                        src={detalleEmpresa.firma_empresa}
                                                        alt='Firma empresa'
                                                        className='max-h-40 rounded border border-zinc-200 dark:border-zinc-600'
                                                    />
                                                </div>
                                            ) : (
                                                <div className='ml-4 mt-2 text-zinc-500'>
                                                    Sin Firma
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardBody>
                            <div className='flex flex-row gap-4 overflow-auto'>
                                <Button
                                    {...(activeComponent === 'Sucursales'
                                        ? {
                                              size: 'sm',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                              isActive: true,
                                              color: 'blue',
                                              colorIntensity: '500',
                                              variant: 'solid',
                                          }
                                        : {
                                              size: 'sm',
                                              color: 'zinc',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                          })}
                                    onClick={() => {
                                        setActiveComponent('Sucursales');
                                    }}>
                                    Sucursales
                                </Button>
                                <Button
                                    {...(activeComponent === 'Invitaciones'
                                        ? {
                                              size: 'sm',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                              isActive: true,
                                              color: 'blue',
                                              colorIntensity: '500',
                                              variant: 'solid',
                                          }
                                        : {
                                              size: 'sm',
                                              color: 'zinc',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                          })}
                                    onClick={() => {
                                        setActiveComponent('Invitaciones');
                                    }}>
                                    Invitaciones
                                </Button>
                                <Button
                                    {...(activeComponent === 'ConfiguracionRRHH'
                                        ? {
                                              size: 'sm',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                              isActive: true,
                                              color: 'blue',
                                              colorIntensity: '500',
                                              variant: 'solid',
                                          }
                                        : {
                                              size: 'sm',
                                              color: 'zinc',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                          })}
                                    onClick={() => {
                                        setActiveComponent('ConfiguracionRRHH');
                                    }}>
                                    Configuración RRHH
                                </Button>
                            </div>
                        </CardBody>
                    </Card>

                    {activeComponent === 'Sucursales' && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className='text-xl'>Sucursales</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    <AnimacionDeInputModoMovil
                                        globalFilter={globalFilter}
                                        setGlobalFilter={setGlobalFilter}>
                                        <CrearSucursal empresaId={detalleEmpresa?.id} />
                                    </AnimacionDeInputModoMovil>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='z-0'>
                                <div className='overflow-auto'>
                                    <Table className='min-w-[700px] table-fixed'>
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
                                    <div className='mt-2 min-w-[700px]'>
                                        <TableCardFooterTemplateV2 table={table} />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {activeComponent === 'Invitaciones' && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className='text-xl'>Invitaciones</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    <AnimacionDeInputModoMovil
                                        globalFilter={globalFilter}
                                        setGlobalFilter={setGlobalFilter}>
                                        <CrearInvitacionEmpresaDesdeDetalleEmpresa
                                            id_empresa={detalleEmpresa?.id}
                                            sucursales={listaMisSucursales}
                                        />
                                    </AnimacionDeInputModoMovil>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='z-0'>
                                <div className='overflow-auto'>
                                    <Table className='min-w-[700px] table-fixed'>
                                        <THead>
                                            {tableInvitaciones
                                                .getHeaderGroups()
                                                .map((headerGroup) => (
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
                                            {tableInvitaciones.getRowModel().rows.map((row) => (
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
                                    <div className='mt-2 min-w-[700px]'>
                                        <TableCardFooterTemplateV2 table={tableInvitaciones} />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {activeComponent === 'ConfiguracionRRHH' && detalleEmpresa?.id && (
                        <ConfiguracionRRHH embedded empresaIdFijo={Number(detalleEmpresa.id)} />
                    )}
                </div>
            </Container>
        </PageWrapper>
    );
}

export default DetalleEmpresa;
