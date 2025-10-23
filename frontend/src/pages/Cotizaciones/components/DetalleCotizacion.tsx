import { useEffect, useState } from 'react';
import { detalleCotizacionPorNumeroThunk, detalleCotizacionThunk, listaContentTypeThunk, listaItemsEnCotizacionThunk, listaSolicitantesCotizacionThunk, useAppDispatch, useAppSelector } from '@/store';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Container from '@/components/layouts/Container/Container';
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Icon from '@/components/icon/Icon';
import { useParams } from 'react-router-dom';
import Input from '@/components/form/Input';
import Button from '@/components/ui/Button';
import { useFormik } from 'formik';
import ApiService from '@/services/ApiService';
import { toast } from 'react-toastify';
import Validation from '@/components/form/Validation';
import ModalEliminar from '@/pages/Items/Proveedor/modals/ModalEliminar';
import { IItemCotizacion } from '@/interface/cotizaciones.interface';
import CrearItemCotizacion from '../modals/CrearItemCotizacion';
import Tooltip from '@/components/ui/Tooltip';
import SeguimientoCotizacion from './SeguimientoCotizacion';
import Textarea from '@/components/form/Textarea';
import EnviarCotizacion from '../modals/EnviarCotizacion';
import * as Yup from 'yup'
import AgregarSolicitanteCotizacion from '../modals/AgregarSolicitanteCotizacion';
import AprobarCotizacion from '../modals/AprobarCotizacion';
import EnviarCotizacionParaAprobar from '../modals/EnviarCotizacionParaAprobar';
import TablaImpuestos from './TablaImpuestos';
import dayjs from 'dayjs';
import TablaVenta from './TablaVenta';
import classNames from 'classnames';
import RechazarCotizacion from '../modals/RechazarCotizacion';
import TablaComentarios from './TablaComentarios';
import AuthorityCheckNav from '@/components/layouts/AuthorityCheckNav/AuthorityCheckNav';
import TablaItemsTecnico from './TablaItemsTecnico';
import Balance from '@/components/Balance';
import CrearOCDeCotizacion from '../modals/CrearOCDeCotizacion';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import EditarItemEnCotizacion from '../modals/EditarItemEnCotizacion';
import { IIndicadorDolar } from '@/interface/bodega.interface';


const columnHelper = createColumnHelper<IItemCotizacion>();

const DetalleCotizacion = () => {
    const dispatch = useAppDispatch();
    const { numero_cotizacion } = useParams();
    const { listaGrupos } = useAppSelector((state) => state.auth)
    const { detalleCotizacion, listaItemsEnCotizacion, listaSolicitantesCotizacion } = useAppSelector((state) => state.cotizacion);
    const { listaContentType } = useAppSelector((state) => state.core)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [activeComponent, setActiveComponent] = useState<string>("Preparación");
    const [crearSolicitante, setCrearSolicitante] = useState<boolean>(false);
    const [creandoSolicitante, setCreandoSolicitante] = useState<boolean>(false)

    useEffect(() => {
        if (numero_cotizacion) {
            dispatch(detalleCotizacionPorNumeroThunk({numero_cotizacion}));
        }
    }, [numero_cotizacion]);

    useEffect(() => {
        if (detalleCotizacion) {
            dispatch(listaItemsEnCotizacionThunk({id_cotizacion: detalleCotizacion.id}));
            dispatch(listaSolicitantesCotizacionThunk({id_cotizacion: detalleCotizacion.id}));
        }
    }, [detalleCotizacion])

    useEffect(() => {
        if (listaContentType.length === 0) {
            dispatch(listaContentTypeThunk())
        }
    }, [listaContentType])

    useEffect(() => {
        if (isEditing) {
            formik.setValues({
                nombre: detalleCotizacion?.nombre || "",
                cliente: detalleCotizacion?.cliente || "",
                descripcion: detalleCotizacion?.descripcion || "",
                observaciones: detalleCotizacion?.observaciones || "",
                fecha_facturacion: detalleCotizacion?.fecha_facturacion || "",
                ppm: detalleCotizacion?.ppm || 0.001,
                dolar_observado: detalleCotizacion?.dolar_observado || 0,
                valor_uf: detalleCotizacion?.valor_uf || 0,
            });
        }
    }, [isEditing, detalleCotizacion]);

    useEffect(() => {
        const asignar_valores = async () => {
            try {
                let valor_dolar: number = 0
                let valor_uf: number = 0
                const responseDolar = await ApiService.fetchData<IIndicadorDolar>({baseURL: 'https://mindicador.cl/', url: `api/dolar/${dayjs(detalleCotizacion?.fecha_facturacion).format('DD-MM-YYYY')}`, method: 'get', isLoginRequest: true})
                if (responseDolar.data) {
                    valor_dolar = Number(responseDolar.data.serie[0].valor.toFixed(1))
                }
                if (detalleCotizacion?.tipo_moneda === "3") {
                    const responseUF = await ApiService.fetchData<IIndicadorDolar>({baseURL: 'https://mindicador.cl/', url: `api/uf/${dayjs(detalleCotizacion.fecha_facturacion).format('DD-MM-YYYY')}`, method: 'get', isLoginRequest: true})
                    if (responseUF) {
                        valor_uf = Number(responseUF.data.serie[0].valor.toFixed(0))
                    }
                }
                const response = await ApiService.fetchData({url: `/api/cotizaciones/${detalleCotizacion?.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                    dolar_observado: valor_dolar,
                    valor_uf: valor_uf
                })})
                if (response.data) {
                    dispatch(detalleCotizacionThunk({id_cotizacion: detalleCotizacion?.id}))
                }
            } catch (error: any) {
                toast.error(error || "Error al obtener el dolar observado y el valor uf", {toastId: "Error al obtener el dolar observado y el valor uf"})
            }
        }
        if (detalleCotizacion && detalleCotizacion.dolar_observado === null && detalleCotizacion.valor_uf === null) {
            asignar_valores()
        }
    }, [detalleCotizacion])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: detalleCotizacion?.nombre || "",
            cliente: detalleCotizacion?.cliente || "",
            descripcion: detalleCotizacion?.descripcion || "",
            observaciones: detalleCotizacion?.observaciones || "",
            fecha_facturacion: detalleCotizacion?.fecha_facturacion || "",
            ppm: detalleCotizacion?.ppm || 0.001,
            dolar_observado: detalleCotizacion?.dolar_observado || 0,
            valor_uf: detalleCotizacion?.valor_uf || 0,
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().required("Requerido").nonNullable("Requerido"),
            cliente: Yup.string().required("Requerido").nonNullable("Requerido"),
            descripcion: Yup.string().notRequired().nullable().max(150, "Maximo 150 Caracteres"),
            observaciones: Yup.string().notRequired().nullable(),
            fecha_facturacion: Yup.string().notRequired().nullable(),
            ppm: Yup.string().required("Requerido").nonNullable("Requerido").min(0.001, "Tiene que ser mayor a 0"),
            dolar_observado: Yup.number().notRequired().nullable().min(0, "Tiene que ser mayor o igual a 0"),
            valor_uf: Yup.number().notRequired().nullable().min(0, "Tiene que ser mayor o igual a 0"),
        }),
        onSubmit: async (values) => {
            try {
                if (values.fecha_facturacion != detalleCotizacion?.fecha_facturacion) {
                    let valor_dolar: number = 0
                    let valor_uf: number = 0
                    const responseDolar = await ApiService.fetchData<IIndicadorDolar>({baseURL: 'https://mindicador.cl/', url: `api/dolar/${dayjs(values.fecha_facturacion).format('DD-MM-YYYY')}`, method: 'get', isLoginRequest: true})
                    if (responseDolar.data) {
                        valor_dolar = Number(responseDolar.data.serie[0].valor.toFixed(0))
                    }
                    if (detalleCotizacion?.tipo_moneda === "3") {
                        const responseUF = await ApiService.fetchData<IIndicadorDolar>({baseURL: 'https://mindicador.cl/', url: `api/uf/${dayjs(values.fecha_facturacion).format('DD-MM-YYYY')}`, method: 'get', isLoginRequest: true})
                        if (responseUF) {
                            valor_uf = Number(responseUF.data.serie[0].valor.toFixed(0))
                        }
                    }
                    const response = await ApiService.fetchData({
                        url: `/api/cotizaciones/${detalleCotizacion?.id}/`,
                        method: 'patch',
                        headers: {'Content-Type': 'application/json'},
                        data: JSON.stringify({
                            ...values,
                            dolar_observado: valor_dolar,
                            valor_uf: valor_uf
                        })
                    });
                    if (response.data) {
                        toast.success("Cotización actualizada", { autoClose: 1000 });
                        dispatch(detalleCotizacionThunk({ id_cotizacion: detalleCotizacion?.id }));
                        formik.resetForm();
                        setIsEditing(false);
                    } else {
                        toast.error("Error al actualizar la cotización");
                    }
                } else {
                    const response = await ApiService.fetchData({
                        url: `/api/cotizaciones/${detalleCotizacion?.id}/`,
                        method: 'patch',
                        headers: {'Content-Type': 'application/json'},
                        data: JSON.stringify(values)
                    });
                    if (response.data) {
                        toast.success("Cotización actualizada", {autoClose: 1000});
                        dispatch(detalleCotizacionThunk({id_cotizacion: detalleCotizacion?.id}));
                        formik.resetForm();
                        setIsEditing(false);
                    } else {
                        toast.error("Error al actualizar la cotización");
                    }
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(" ");
                toast.error(mensajesError || "Error al actualizar la cotización", {toastId: "Error al actualizar la cotización"})
            }
        }
    });

    const columns = [
        columnHelper.accessor("nombre_item", {
            cell: (info) => (
                <div>
                    <div>{info.getValue()}</div>
                    <div className="text-xs">{info.row.original.descripcion}</div>
                </div>
            ),
            header: "Nombre"
        }),
        columnHelper.accessor("nombre_proveedor", {
            cell: (info) => (
                <div>{info.row.original.nombre_proveedor || "Sin Proveedor"}</div>
            ),
            header: "Proveedor"
        }),
        columnHelper.accessor("cantidad", {
            cell: (info) => info.getValue(),
            header: "Cantidad"
        }),
        columnHelper.accessor("precio_unitario", {
            cell: (info) => (
                <div>
                    {
                        detalleCotizacion?.tipo_moneda === "1" ? `${Number(Number(info.row.original.precio_unitario).toFixed(2)).toLocaleString()} USD` : 
                        detalleCotizacion?.tipo_moneda === "2" ? `$${Number(Number(info.row.original.precio_unitario).toFixed(0)).toLocaleString()}` : 
                        detalleCotizacion?.tipo_moneda === "3" ? `${Number(Number(info.row.original.precio_unitario).toFixed(2)).toLocaleString()} UF` : 
                        `${Number(Number(info.row.original.precio_unitario).toFixed(0)).toLocaleString()}`
                    }
                    <Tooltip text='Porcentaje de Recargo' placement='bottom'>
                        <div>
                            <Balance status={info.row.original.porcentaje_recargo ? (info.row.original.porcentaje_recargo > 0 ? "positive" : "fixed")  : "fixed"} value={`${info.row.original.porcentaje_recargo}%`} />
                        </div>
                    </Tooltip>
                </div>
            ),
            header: "Precio Unitario"
        }),
        columnHelper.display({
            cell: (info) => (
                <div>
                    {
                        detalleCotizacion?.tipo_moneda === "1" ? `${Number(Number(info.row.original.costo_total).toFixed(2)).toLocaleString()} USD` :
                        detalleCotizacion?.tipo_moneda === "2" ? `$${Number(Number(info.row.original.costo_total).toFixed(0)).toLocaleString()}` :
                        detalleCotizacion?.tipo_moneda === "3" ? `${Number(Number(info.row.original.costo_total).toFixed(2)).toLocaleString()} UF` : `${Number(Number(info.row.original.costo_total).toFixed(0)).toLocaleString()}`
                    }
                </div>
            ),
            header: "Total Neto"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div className="flex flex-wrap justify-center gap-2">
                    {detalleCotizacion?.estado === "pendiente" && (
                        <EditarItemEnCotizacion item={info.row.original} />
                    )}
                    {(detalleCotizacion?.estado == "pendiente" || detalleCotizacion?.estado == "rechazada") && (
                        <ModalEliminar
                            mensaje={`Estas seguro que deseas eliminar el ${info.row.original.nombre} ¿Desea continuar?`}
                            peticionUrl={`/api/cotizaciones/${detalleCotizacion.id}/items/${info.row.original.id}/`}
                            onDispatch={() => dispatch(listaItemsEnCotizacionThunk({ id_cotizacion: detalleCotizacion.id }))}>
                        </ModalEliminar>
                    )}
                </div>
            )
        })
    ];

    const table = useReactTable({
        data: listaItemsEnCotizacion,
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
        getPaginationRowModel: getPaginationRowModel()
    });

    useEffect(() => {
        if (detalleCotizacion && activeComponent === "Preparación") {
            dispatch(listaItemsEnCotizacionThunk({id_cotizacion: detalleCotizacion.id}));
        }
    }, [activeComponent])

    return (
        <PageWrapper isProtectedRoute={true} name="Detalle Cotizacion" title="Detalle Cotizacion">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Cotizacion N°{detalleCotizacion?.numero_cotizacion}</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    {detalleCotizacion && (
                        <AuthorityCheckNav authority={["staff", "superadmin"]} userAuthority={listaGrupos?.grupos}>
                            {!(detalleCotizacion.estado === "expirada" || detalleCotizacion.estado === "rechazada" || detalleCotizacion.estado === "pendiente") && (
                                <EnviarCotizacion cotizacion={detalleCotizacion} />
                            )}
                            {detalleCotizacion.estado === "pendiente" && (
                                <EnviarCotizacionParaAprobar />
                            )}
                            {detalleCotizacion.estado === "enviada" && (
                                <>
                                    <AprobarCotizacion />
                                    <RechazarCotizacion />
                                </>
                            )}
                            {detalleCotizacion.estado === "aceptada" && (
                                <>
                                    <Tooltip text="Descargar PDF">
                                        <Button variant="solid" color='red' icon='HeroDocumentArrowDown' onClick={async () => {
                                            try {
                                                const response = await ApiService.fetchData<BlobPart>({url: `/api/cotizaciones/${detalleCotizacion.id}/descargar-pdf`, method: 'get'})
                                                if (response.data) {
                                                    const url = window.URL.createObjectURL(new Blob([response.data]))
                                                    const link = document.createElement('a');
                                                    link.href = url;
                                                    link.setAttribute('download', `Coti_${detalleCotizacion.numero_cotizacion}_${detalleCotizacion.cliente_nombre}.pdf`);
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    link.remove();
                                                    window.URL.revokeObjectURL(url);
                                                }
                                            } catch (error: any) {
                                                const mensajesError = Object.values(error.response.data).flat().join(" ");
                                                toast.error(mensajesError || "No se pudo obtener el PDF", {toastId: "No se pudo obtener el PDF"})
                                            }
                                        }}></Button>
                                    </Tooltip>
                                    <CrearOCDeCotizacion />
                                </>
                            )}
                            {detalleCotizacion?.estado === "pendiente" && (
                                <div className="flex justify-end items-center">
                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            <Tooltip text='Guardar Cambios'>
                                                <Button variant='solid' color='emerald' icon='HeroCheck' onClick={() => formik.handleSubmit()} />
                                            </Tooltip>
                                            <Tooltip text='Cancelar'>
                                                <Button color='red' variant='solid' onClick={() => {setIsEditing(false); formik.resetForm()}} icon='HeroXMark'/>
                                            </Tooltip>
                                        </div>
                                    ) : (
                                        <Tooltip text="Editar">
                                            <Button variant="solid" icon="HeroPencil" onClick={() => {setIsEditing(true)}} />
                                        </Tooltip>
                                    )}
                                </div>
                            )}
                            <SeguimientoCotizacion cotizacionId={detalleCotizacion.id}/>
                        </AuthorityCheckNav>
                    )}
                </SubheaderRight>
            </Subheader>
            <Container className="w-full h-full">
                <div className="grid grid-cols-1 gap-4">
                    {/* Nombre, cliente, estado, descripcion, observaciones */}
                    {/* PPM, Recargo Cliente, Tipo de Moneda, Recargo por Dolar, Dolar Observado, fecha facturacion */}

                    <AuthorityCheckNav authority={["staff", "superadmin"]} userAuthority={listaGrupos?.grupos}>
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-full md:col-span-8">
                                <Card className='w-full h-full'>
                                    <CardHeader>
                                        <Badge className="text-xl">Información de la Cotización</Badge>
                                    </CardHeader>
                                    <CardBody>
                                        <div className='flex flex-col gap-4'>
                                            <div className='border border-blue-500 rounded-xl grid grid-cols-3 gap-4 p-4'>
                                                <div>
                                                    <Badge>Cliente</Badge>
                                                    <div className="ml-4">{detalleCotizacion?.cliente_nombre}</div>
                                                </div>
                                                <div>
                                                    <Badge>Nombre</Badge>
                                                    {isEditing ? (
                                                        <Validation
                                                            isValid={formik.isValid}
                                                            isTouched={formik.touched.nombre}
                                                            invalidFeedback={formik.errors.nombre}
                                                        >
                                                            <Input
                                                                name="nombre"
                                                                placeholder="nombre"
                                                                onBlur={formik.handleBlur}
                                                                onChange={formik.handleChange}
                                                                value={formik.values.nombre}
                                                            />
                                                        </Validation>
                                                    ) : (
                                                        <div className="ml-4">{detalleCotizacion?.nombre}</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <Badge>Estado</Badge>
                                                    <div className="ml-4">{detalleCotizacion?.estado_label}</div>
                                                </div>
                                                <div className='col-span-full'>
                                                    <Badge>Descripción</Badge>
                                                    {isEditing ? (
                                                        <Validation
                                                            isValid={formik.isValid}
                                                            isTouched={formik.touched.descripcion}
                                                            invalidFeedback={formik.errors.descripcion}
                                                        >
                                                            <Textarea
                                                                name='descripcion'
                                                                onBlur={formik.handleBlur}
                                                                onChange={formik.handleChange}
                                                                value={formik.values.descripcion}
                                                            />
                                                        </Validation>
                                                    ) : (
                                                        <div className="ml-4">{detalleCotizacion?.descripcion || "Sin Descripción"}</div>
                                                    )}
                                                </div>
                                                <div className='col-span-full'>
                                                    <Badge>Observaciones</Badge>
                                                    {isEditing ? (
                                                        <Validation
                                                            isValid={formik.isValid}
                                                            isTouched={formik.touched.observaciones}
                                                            invalidFeedback={formik.errors.observaciones}
                                                        >
                                                            <Textarea
                                                                name="observaciones"
                                                                onBlur={formik.handleBlur}
                                                                onChange={formik.handleChange}
                                                                value={formik.values.observaciones}
                                                            />
                                                        </Validation>
                                                    ) : (
                                                        <div className="ml-4">{detalleCotizacion?.observaciones || "Sin Observaciones"}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            </div>
                            <div className="col-span-full md:col-span-4">
                                <Card className='w-full h-full'>
                                    <CardHeader>
                                        <Badge className="text-xl">Uso Interno</Badge>
                                    </CardHeader>
                                    <CardBody>
                                        <div className='flex flex-col gap-4'>
                                            <div className={classNames("border border-blue-500 rounded-xl grid gap-4 p-4 grid-cols-2")}>
                                                <div>
                                                    <Badge>Tipo de Moneda</Badge>
                                                    <div className='ml-4'>{detalleCotizacion?.tipo_moneda_label}</div>
                                                </div>
                                                {detalleCotizacion?.tipo_moneda !== "3" && (
                                                    <>
                                                        <div>
                                                            <Badge>Dolar Observado</Badge>
                                                            {isEditing ? (
                                                                <Validation
                                                                isValid={formik.isValid}
                                                                isTouched={formik.touched.dolar_observado}
                                                                invalidFeedback={formik.errors.dolar_observado}
                                                                >
                                                                    <Input
                                                                        name='dolar_observado'
                                                                        type='number'
                                                                        onChange={formik.handleChange}
                                                                        onBlur={formik.handleBlur}
                                                                        value={formik.values.dolar_observado}
                                                                        />
                                                                </Validation>
                                                            ): (
                                                                <div className="ml-4">{detalleCotizacion?.dolar_observado}</div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                                <div>
                                                    <Badge>Fecha de Facturación</Badge>
                                                    {isEditing ? (
                                                        <Validation
                                                            isValid={formik.isValid}
                                                            isTouched={formik.touched.fecha_facturacion}
                                                            invalidFeedback={formik.errors.fecha_facturacion}
                                                        >
                                                            <Input
                                                                name='fecha_facturacion'
                                                                type='date'
                                                                onChange={formik.handleChange}
                                                                onBlur={formik.handleBlur}
                                                                value={formik.values.fecha_facturacion}
                                                            />
                                                        </Validation>
                                                    ) : (
                                                        <div className="ml-4">{dayjs(detalleCotizacion?.fecha_facturacion).format('DD/MM/YYYY')}</div>
                                                    )}
                                                </div>
                                                {detalleCotizacion?.tipo_moneda === "3" && (
                                                    <div>
                                                        <Badge>Valor UF</Badge>
                                                        {isEditing ? (
                                                            <Validation
                                                                isValid={formik.isValid}
                                                                isTouched={formik.touched.valor_uf}
                                                                invalidFeedback={formik.errors.valor_uf}
                                                            >
                                                                <Input
                                                                    name="valor_uf"
                                                                    onChange={formik.handleChange}
                                                                    onBlur={formik.handleBlur}
                                                                    value={formik.values.valor_uf}
                                                                />
                                                            </Validation>
                                                        ) : (
                                                            <div className="ml-4">{detalleCotizacion?.valor_uf}</div>
                                                        )}
                                                    </div>
                                                )}
                                                <div>
                                                    <Badge>PPM</Badge>
                                                    {isEditing ? (
                                                        <Validation
                                                            isValid={formik.isValid}
                                                            isTouched={formik.touched.ppm}
                                                            invalidFeedback={formik.errors.ppm}
                                                        >
                                                            <Input
                                                                name='ppm'
                                                                type='number'
                                                                onChange={(e) => {formik.setFieldValue("ppm", Number(e.target.value))}}
                                                                onBlur={formik.handleBlur}
                                                                value={formik.values.ppm}
                                                            />
                                                        </Validation>
                                                    ) : (
                                                        <div className="ml-4">{detalleCotizacion?.ppm}%</div>
                                                    )}
                                                </div>

                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            </div>
                        </div>
                    </AuthorityCheckNav>

                    <AuthorityCheckNav authority={["tecnico"]} userAuthority={listaGrupos?.grupos}>
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className="text-xl">Datos</Badge>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className='flex flex-col gap-4'>
                                    <div className="border border-blue-500 rounded-xl grid grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                                        <div>
                                            <Badge>Cliente</Badge>
                                            <div className="ml-4">{detalleCotizacion?.cliente_nombre}</div>
                                        </div>
                                        <div>
                                            <Badge>Nombre</Badge>
                                            <div className="ml-4">{detalleCotizacion?.nombre}</div>
                                        </div>
                                        <div>
                                            <Badge>Estado</Badge>
                                            <div className="ml-4">{detalleCotizacion?.estado_label}</div>
                                        </div>
                                    </div>
                                    <div className="border border-blue-500 rounded-xl grid grid-cols-2 gap-4 p-4">
                                        <div>
                                            <Badge>Descripción</Badge>
                                            <div className="ml-4">{detalleCotizacion?.descripcion || "Sin Descripción"}</div>
                                        </div>
                                        <div>
                                            <Badge>Observaciones</Badge>
                                            <div className="ml-4">{detalleCotizacion?.observaciones || "Sin Observaciones"}</div>
                                        </div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </AuthorityCheckNav>

                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Solicitantes</Badge>
                            </CardHeaderChild>
                            <CardHeaderChild>
                                <div className="flex justify-end col-span-full">
                                    <AuthorityCheckNav authority={["staff", "superadmin"]} userAuthority={listaGrupos?.grupos}>
                                        {detalleCotizacion?.estado === "pendiente" && (
                                            <>
                                                {crearSolicitante ? (
                                                    <>
                                                        <Button color="red" onClick={() => {setCrearSolicitante(false)}}>Cancelar</Button>
                                                        <Button variant="solid" onClick={() => {setCreandoSolicitante(true)}}>Crear</Button>
                                                    </>
                                                ) : (
                                                    <Tooltip text="Añadir Solicitantes">
                                                        <Button variant="solid" onClick={() => {setCrearSolicitante(true)}} icon="HeroPlus" />
                                                    </Tooltip>
                                                )}
                                            </>
                                        )}
                                    </AuthorityCheckNav>
                                </div>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className='flex flex-col gap-4'>
                                <AgregarSolicitanteCotizacion isEditing={crearSolicitante} setIsEditing={setCrearSolicitante} creandoSolicitante={creandoSolicitante} setCreandoSolicitante={setCreandoSolicitante} />
                                {listaSolicitantesCotizacion.length > 0 ? listaSolicitantesCotizacion.map(solicitante => (
                                    <div className="border border-blue-500 rounded-xl grid grid-cols-2 gap-4 p-4" key={solicitante.id}>
                                        <div>
                                            <Badge>Nombre</Badge>
                                            <div className="ml-4 flex items-center gap-2">{solicitante.nombre_usuario} {solicitante.aprobo && (<Tooltip text={`Cotización Aceptada por ${solicitante.nombre_usuario}`}><Icon size="text-4xl" icon={"HeroCheckCircle"} color={"emerald"} /></Tooltip>)}</div>
                                        </div>
                                        <div className='flex flex-row items-center justify-between'>
                                            <div>
                                                <Badge>Email</Badge>
                                                <div className="ml-4">{solicitante.email_usuario}</div>
                                            </div>
                                            <div>
                                                <ModalEliminar
                                                    mensaje="¿Estas seguro(a) de eliminar al solicitante?"
                                                    onDispatch={() => {dispatch(detalleCotizacionPorNumeroThunk({numero_cotizacion}))}}
                                                    peticionUrl={`/api/solicitantes-cotizacion/${solicitante.id}/`}
                                                    nombre="Solicitante"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className='w-full ml-4'>No hay Solicitantes</div>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardBody>
                            <div className="flex flex-row gap-4 overflow-auto">
                                <AuthorityCheckNav authority={["staff", "superadmin"]} userAuthority={listaGrupos?.grupos}>
                                    <Button
                                        {...(activeComponent === "Preparación" ? {size: 'sm', rounded: 'rounded-full', className: 'border', isActive: true, color: 'blue', colorIntensity: '500', variant: 'solid'} : {size: 'sm', color: 'zinc', rounded: 'rounded-full', className: 'border'})}
                                        onClick={() => {
                                            setActiveComponent("Preparación");
                                        }}>
                                        Preparación
                                    </Button>
                                    <Button
                                        {...(activeComponent === "Impuestos" ? {size: 'sm', rounded: 'rounded-full', className: 'border', isActive: true, color: 'blue', colorIntensity: '500', variant: 'solid'} : {size: 'sm', color: 'zinc', rounded: 'rounded-full', className: 'border'})}
                                        onClick={() => {
                                            setActiveComponent("Impuestos");
                                        }}>
                                        Impuestos
                                    </Button>
                                    <Button
                                        {...(activeComponent === "Cotización Final" ? {size: 'sm', rounded: 'rounded-full', className: 'border', isActive: true, color: 'blue', colorIntensity: '500', variant: 'solid'} : {size: 'sm', color: 'zinc', rounded: 'rounded-full', className: 'border'})}
                                        onClick={() => {
                                            setActiveComponent("Cotización Final");
                                        }}>
                                        Cotización Final
                                    </Button>
                                    <Button
                                        {...(activeComponent === "Comentarios" ? {size: 'sm', rounded: 'rounded-full', className: 'border', isActive: true, color: 'blue', colorIntensity: '500', variant: 'solid'} : {size: 'sm', color: 'zinc', rounded: 'rounded-full', className: 'border'})}
                                        onClick={() => {
                                            setActiveComponent("Comentarios");
                                        }}>
                                        Comentarios
                                    </Button>
                                </AuthorityCheckNav>
                                <AuthorityCheckNav authority={["tecnico"]} userAuthority={listaGrupos?.grupos}>
                                    <Button
                                        {...(activeComponent === "Items" ? {size: 'sm', rounded: 'rounded-full', className: 'border', isActive: true, color: 'blue', colorIntensity: '500', variant: 'solid'} : {size: 'sm', color: 'zinc', rounded: 'rounded-full', className: 'border'})}
                                        onClick={() => {
                                            setActiveComponent("Items");
                                        }}>
                                        Items
                                    </Button>
                                </AuthorityCheckNav>
                            </div>
                        </CardBody>
                    </Card>

                    {activeComponent === "Preparación" && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className="text-xl">Preparación</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    <AnimacionDeInputModoMovil globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} anchoInput={140}>
                                        {detalleCotizacion && detalleCotizacion.es_vigente && (detalleCotizacion.estado === "pendiente" || detalleCotizacion.estado === "rechazada") && (
                                            <CrearItemCotizacion />
                                        )}
                                    </AnimacionDeInputModoMovil>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='z-0'>
                                <div className="overflow-auto">
                                    <Table className='table-fixed min-w-[800px]'>
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
                                                                        className: header.column.getCanSort()
                                                                            ? 'cursor-pointer select-none flex items-center'
                                                                            : '',
                                                                        onClick: header.column.getToggleSortingHandler(),
                                                                    }}>
                                                                    {flexRender(
                                                                        header.column.columnDef.header,
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
                                                <Tr key={row.id}>
                                                    {row.getVisibleCells().map((cell) => (
                                                        <Td key={cell.id}>
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </Td>
                                                    ))}
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                    <div className="mt-2 min-w-[800px]">
                                        <TableCardFooterTemplateV2 table={table} />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {activeComponent === "Impuestos" && (
                        <TablaImpuestos />
                    )}

                    {activeComponent === "Cotización Final" && (
                        <TablaVenta />
                    )}

                    {activeComponent === "Comentarios" && (
                        <TablaComentarios />
                    )}

                    {activeComponent === "Items" && (
                        <TablaItemsTecnico />
                    )}
                </div>
            </Container>
        </PageWrapper>
    );
};

export default DetalleCotizacion;
