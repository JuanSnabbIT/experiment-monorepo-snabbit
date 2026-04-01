import Balance from '@/components/Balance';
import Input from '@/components/form/Input';
import SelectReact from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Icon from '@/components/icon/Icon';
import AuthorityCheckNav from '@/components/layouts/AuthorityCheckNav/AuthorityCheckNav';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { TIPO_MONEDA } from '@/constants/cotizacion.constant';
import { IItemCotizacion } from '@/interface/cotizaciones.interface';
import ApiService from '@/services/ApiService';
import { listaContentTypeThunk, useAppDispatch, useAppSelector } from '@/store';
import {
    useDeleteSolicitanteCotizacionMutation,
    useGetDetalleCotizacionPorNumeroQuery,
    useGetItemsEnCotizacionQuery,
    useGetSeguimientoCotizacionQuery,
    useGetSolicitantesCotizacionQuery,
} from '@/store/slices/cotizaciones/cotizacionApi';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { formatCurrency, formatPrice } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert } from '@/utils/sweetAlert';
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
import classNames from 'classnames';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import AgregarSolicitanteCotizacion from '../modals/AgregarSolicitanteCotizacion';
import AprobarCotizacion from '../modals/AprobarCotizacion';
import CrearItemCotizacion from '../modals/CrearItemCotizacion';
import CrearOCDeCotizacion from '../modals/CrearOCDeCotizacion';
import EditarItemEnCotizacion from '../modals/EditarItemEnCotizacion';
import EnviarCotizacionParaAprobar from '../modals/EnviarCotizacionParaAprobar';
import RechazarCotizacion from '../modals/RechazarCotizacion';
import SeguimientoCotizacion from './SeguimientoCotizacion';
import TablaComentarios from './TablaComentarios';
import TablaImpuestos from './TablaImpuestos';
import TablaItemsTecnico from './TablaItemsTecnico';
import TablaVenta from './TablaVenta';

const columnHelper = createColumnHelper<IItemCotizacion>();

type UsoInternoField =
    | 'tipo_moneda'
    | 'dolar_observado'
    | 'fecha_facturacion'
    | 'valor_uf'
    | 'ppm'
    | 'porcentaje_recargo';

const DetalleCotizacion = () => {
    const dispatch = useAppDispatch();
    const { numero_cotizacion } = useParams();
    const numeroKey = numero_cotizacion ? String(numero_cotizacion) : '';

    // RTK Query Hooks
    const {
        data: detalleCotizacion,
        isFetching: fetchingDetalle,
        isLoading: loadingDetalle,
        refetch,
    } = useGetDetalleCotizacionPorNumeroQuery(numeroKey, {
        skip: !numeroKey,
        refetchOnMountOrArgChange: true,
    });

    const isPendingState = detalleCotizacion?.estado === 'pendiente';
    const canEditUsoInternoField = (field: UsoInternoField) =>
        isEditing && (isPendingState || field === 'fecha_facturacion');

    const idKey = detalleCotizacion?.id ? String(detalleCotizacion.id) : '';

    const {
        data: itemsEnCotizacion = [],
        isFetching: fetchingItems,
        refetch: refetchItems,
    } = useGetItemsEnCotizacionQuery(idKey, { skip: !idKey });

    const {
        data: solicitantesCotizacion = [],
        isFetching: fetchingSolicitantes,
    } = useGetSolicitantesCotizacionQuery(idKey, { skip: !idKey });

    const {
        data: listaSeguimientoCotizacion = [],
        isFetching: fetchingSeguimiento,
        refetch: refetchSeguimiento,
    } = useGetSeguimientoCotizacionQuery(idKey, { skip: !idKey });

    const { listaGrupos } = useAppSelector((state) => state.auth);
    const { listaContentType } = useAppSelector((state) => state.core);

    const [deleteSolicitanteCotizacion] = useDeleteSolicitanteCotizacionMutation();

    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [activeComponent, setActiveComponent] = useState<string>('Preparación');
    const [crearSolicitante, setCrearSolicitante] = useState<boolean>(false);
    const [creandoSolicitante, setCreandoSolicitante] = useState<boolean>(false);
    const [refrescandoTipoCambio, setRefrescandoTipoCambio] = useState<boolean>(false);
    const [refrescandoEstado, setRefrescandoEstado] = useState<boolean>(false);
    const [pollingTipoCambio, setPollingTipoCambio] = useState<boolean>(false);
    const [modoIngresoManual, setModoIngresoManual] = useState<boolean>(false);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: detalleCotizacion?.nombre || '',
            cliente: detalleCotizacion?.cliente || '',
            descripcion: detalleCotizacion?.descripcion || '',
            observaciones: detalleCotizacion?.observaciones || '',
            fecha_facturacion: detalleCotizacion?.fecha_facturacion || '',
            ppm: detalleCotizacion?.ppm || 0.001,
            dolar_observado: detalleCotizacion?.dolar_observado || 0,
            valor_uf: detalleCotizacion?.valor_uf || 0,
            tipo_moneda: detalleCotizacion?.tipo_moneda || '2',
            porcentaje_recargo: detalleCotizacion?.porcentaje_recargo || 0,
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().required('Requerido').nonNullable('Requerido'),
            cliente: Yup.string().required('Requerido').nonNullable('Requerido'),
            descripcion: Yup.string().notRequired().nullable().max(150, 'Maximo 150 Caracteres'),
            observaciones: Yup.string().notRequired().nullable(),
            fecha_facturacion: Yup.string().notRequired().nullable(),
            tipo_moneda: Yup.string().required('Requerido').nonNullable('Requerido'),
            ppm: Yup.string()
                .required('Requerido')
                .nonNullable('Requerido')
                .min(0.001, 'Tiene que ser mayor a 0'),
            dolar_observado: Yup.number()
                .notRequired()
                .nullable()
                .min(0, 'Tiene que ser mayor o igual a 0'),
            valor_uf: Yup.number()
                .notRequired()
                .nullable()
                .min(0, 'Tiene que ser mayor o igual a 0'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/cotizaciones/${detalleCotizacion?.id}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(values),
                });
                if (response.data) {
                    toast.success('Cotización actualizada', { autoClose: 1000 });

                    // Refresco inmediato de la UI
                    refetch();
                    refetchItems();

                    // Si cambió fecha o moneda, la tarea de Celery se está ejecutando en el backend.
                    // Hacemos un segundo refresco a los 2 segundos para capturar los nuevos valores del dólar/UF
                    // sin que el usuario tenga que recargar manualmente.
                    if (
                        values.fecha_facturacion !== detalleCotizacion?.fecha_facturacion ||
                        values.tipo_moneda !== detalleCotizacion?.tipo_moneda
                    ) {
                        setRefrescandoTipoCambio(true);
                    }

                    formik.resetForm();
                    setIsEditing(false);
                    setModoIngresoManual(false);
                } else {
                    toast.error('Error al actualizar la cotización');
                }
            } catch (error: unknown) {
                const mensajesError = getErrorMessage(error);
                toast.error(mensajesError || 'Error al actualizar la cotizacion', {
                    toastId: 'Error al actualizar la cotizacion',
                });
            }
        },
    });

    async function handleRefrescarValores() {
        if (!detalleCotizacion?.id) return;
        setRefrescandoTipoCambio(true);
        try {
            await ApiService.fetchData({
                url: `/api/cotizaciones/${detalleCotizacion.id}/refrescar-tipo-cambio/`,
                method: 'post',
            });
            refetch();
            refetchItems();
            // El polling se encargará de los siguientes 3 segundos para asegurar que el thread terminó
        } catch (error: any) {
            toast.error('Error al refrescar valores');
            setRefrescandoTipoCambio(false);
        }
    }

    // Polling para refrescar estado después de acciones asíncronas (como enviar correo)
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (refrescandoEstado) {
            let attempts = 0;
            refetch();
            interval = setInterval(() => {
                attempts++;
                refetch();
                if (detalleCotizacion?.estado !== 'pendiente' || attempts >= 5) {
                    setRefrescandoEstado(false);
                }
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [refrescandoEstado, refetch, detalleCotizacion?.estado]);

    // Polling automático cuando dolar_observado o valor_uf están en 0
    useEffect(() => {
        if (!detalleCotizacion) return;

        const necesitaDolar = detalleCotizacion.tipo_moneda === '1';
        const necesitaUF = detalleCotizacion.tipo_moneda === '3';
        const dolarValor = Number(detalleCotizacion.dolar_observado ?? 0);
        const ufValor = Number(detalleCotizacion.valor_uf ?? 0);
        const dolarEnCero = necesitaDolar && dolarValor === 0;
        const ufEnCero = necesitaUF && ufValor === 0;

        if (dolarEnCero || ufEnCero) {
            setPollingTipoCambio(true);
            let attempts = 0;
            const maxAttempts = 10;
            
            const interval = setInterval(async () => {
                attempts++;
                const result = await refetch();
                const data = result.data;
                
                if (data) {
                    const dolarActual = Number(data.dolar_observado ?? 0);
                    const ufActual = Number(data.valor_uf ?? 0);
                    const dolarActualizado = !necesitaDolar || dolarActual > 0;
                    const ufActualizada = !necesitaUF || ufActual > 0;
                    
                    if ((dolarActualizado && ufActualizada) || attempts >= maxAttempts) {
                        clearInterval(interval);
                        setPollingTipoCambio(false);
                    }
                } else if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    setPollingTipoCambio(false);
                }
            }, 2000); // Polling cada 2 segundos

            return () => {
                clearInterval(interval);
                setPollingTipoCambio(false);
            };
        }
    }, [detalleCotizacion?.id, detalleCotizacion?.dolar_observado, detalleCotizacion?.valor_uf, detalleCotizacion?.tipo_moneda, refetch]);

    // Asegurar que el spinner no quede encendido cuando no hay polling activo
    useEffect(() => {
        if (refrescandoTipoCambio) return;
        if (!detalleCotizacion) {
            setPollingTipoCambio(false);
            return;
        }

        const necesitaDolar = detalleCotizacion.tipo_moneda === '1';
        const necesitaUF = detalleCotizacion.tipo_moneda === '3';
        const dolarValorActual = Number(detalleCotizacion.dolar_observado ?? 0);
        const ufValorActual = Number(detalleCotizacion.valor_uf ?? 0);
        const listoDolar = !necesitaDolar || dolarValorActual > 0;
        const listoUF = !necesitaUF || ufValorActual > 0;

        if (listoDolar && listoUF) {
            setPollingTipoCambio(false);
        }
    }, [refrescandoTipoCambio, detalleCotizacion?.id, detalleCotizacion?.dolar_observado, detalleCotizacion?.valor_uf, detalleCotizacion?.tipo_moneda]);

    // Polling cuando se solicita refrescar manualmente (cambio de fecha)
    useEffect(() => {
        if (!refrescandoTipoCambio || !detalleCotizacion) return;

        let attempts = 0;
        const maxAttempts = 5;
        let pollingComplete = false;
        
        const valorInicial = {
            dolar: Number(detalleCotizacion.dolar_observado ?? 0),
            uf: Number(detalleCotizacion.valor_uf ?? 0),
            fecha: detalleCotizacion.fecha_tipo_cambio,
        };
        
        setPollingTipoCambio(true);

        const interval = setInterval(async () => {
            if (pollingComplete) return;
            attempts++;
            
            try {
                const result = await refetch();
                const newData = result.data;

                if (newData) {
                    const necesitaDolar = newData.tipo_moneda === '1';
                    const necesitaUF = newData.tipo_moneda === '3';
                    
                    const dolarActual = Number(newData.dolar_observado ?? 0);
                    const ufActual = Number(newData.valor_uf ?? 0);

                    const dolarCambio = necesitaDolar &&
                        (dolarActual !== valorInicial.dolar ||
                         newData.fecha_tipo_cambio !== valorInicial.fecha);
                    
                    const ufCambio = necesitaUF &&
                        (ufActual !== valorInicial.uf ||
                         newData.fecha_tipo_cambio !== valorInicial.fecha);
                    
                    if ((dolarCambio || ufCambio) && isEditing) {
                        formik.setValues({
                            ...formik.values,
                            dolar_observado: newData.dolar_observado ?? formik.values.dolar_observado,
                            valor_uf: newData.valor_uf ?? formik.values.valor_uf,
                        });
                    }
                    
                    if (dolarCambio || ufCambio) {
                        pollingComplete = true;
                        clearInterval(interval);
                        setTimeout(() => {
                            setRefrescandoTipoCambio(false);
                            setPollingTipoCambio(false);
                        }, 300);
                    } else if (attempts >= maxAttempts) {
                        pollingComplete = true;
                        clearInterval(interval);
                        setRefrescandoTipoCambio(false);
                        setPollingTipoCambio(false);
                    }
                }
            } catch (error) {
                if (attempts >= maxAttempts) {
                    pollingComplete = true;
                    clearInterval(interval);
                    setRefrescandoTipoCambio(false);
                    setPollingTipoCambio(false);
                }
            }
        }, 1500);

        return () => {
            clearInterval(interval);
            setPollingTipoCambio(false);
        };
    }, [refrescandoTipoCambio, detalleCotizacion?.id, isEditing, refetch, formik]);

    const handleStateChange = () => {
        refetch();
        refetchItems();
    };

    const isFutureDate =
        detalleCotizacion?.fecha_facturacion &&
        dayjs(detalleCotizacion.fecha_facturacion).isAfter(dayjs(), 'day');

    const fechaTipoCambio = detalleCotizacion?.fecha_tipo_cambio;
    const fechaTipoCambioLabel = fechaTipoCambio ? dayjs(fechaTipoCambio).format('DD/MM/YYYY') : '';
    const tipoCambioTooltip = fechaTipoCambioLabel
        ? `Tipo de cambio corresponde al día ${fechaTipoCambioLabel}`
        : '';

    const necesitaDolarRender = detalleCotizacion?.tipo_moneda === '1';
    const necesitaUfRender = detalleCotizacion?.tipo_moneda === '3';
    const dolarValorRender = Number(detalleCotizacion?.dolar_observado ?? 0);
    const ufValorRender = Number(detalleCotizacion?.valor_uf ?? 0);
    const mostrarSpinnerDolar =
        !isEditing && pollingTipoCambio && (refrescandoTipoCambio || (necesitaDolarRender && dolarValorRender === 0));
    const mostrarSpinnerUf =
        !isEditing && pollingTipoCambio && (refrescandoTipoCambio || (necesitaUfRender && ufValorRender === 0));

    // Apagar pollingTipoCambio automáticamente cuando no hay refresh activo y valores son válidos
    useEffect(() => {
        if (!refrescandoTipoCambio && pollingTipoCambio) {
            const necesitaDolarCheck = detalleCotizacion?.tipo_moneda === '1';
            const necesitaUfCheck = detalleCotizacion?.tipo_moneda === '3';
            const dolarOk = !necesitaDolarCheck || Number(detalleCotizacion?.dolar_observado ?? 0) > 0;
            const ufOk = !necesitaUfCheck || Number(detalleCotizacion?.valor_uf ?? 0) > 0;

            if (dolarOk && ufOk) {
                setPollingTipoCambio(false);
            }
        }
    }, [refrescandoTipoCambio, pollingTipoCambio, detalleCotizacion?.dolar_observado, detalleCotizacion?.valor_uf, detalleCotizacion?.tipo_moneda]);

    // Refrescar automáticamente si cambia la fecha mientras se edita (debounce)
    useEffect(() => {
        if (
            isEditing &&
            formik.values.fecha_facturacion &&
            formik.values.fecha_facturacion !== detalleCotizacion?.fecha_facturacion
        ) {
            const timer = setTimeout(() => {
                handleRefrescarValores();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [formik.values.fecha_facturacion, isEditing, detalleCotizacion]);

    const descargarCotizacionPDF = async () => {
        if (!detalleCotizacion) return;
        try {
            const response = await ApiService.fetchData<BlobPart>({
                url: `/api/cotizaciones/${detalleCotizacion.id}/descargar-pdf`,
                method: 'get',
            });
            if (response.data) {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute(
                    'download',
                    `Coti_${detalleCotizacion.numero_cotizacion}_${detalleCotizacion.cliente_nombre}.pdf`,
                );
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            }
        } catch (error: any) {
            const mensajesError = getErrorMessage(error);
            toast.error(mensajesError || 'No se pudo obtener el PDF', {
                toastId: 'No se pudo obtener el PDF',
            });
        }
    };

    const columns = [
        columnHelper.accessor('nombre_item', {
            cell: (info) => (
                <div>
                    <div>{info.getValue()}</div>
                    <div className='text-xs'>{info.row.original.descripcion}</div>
                </div>
            ),
            header: 'Nombre',
        }),
        columnHelper.accessor('nombre_proveedor', {
            cell: (info) => (
                <div>
                    <div>{info.row.original.nombre_proveedor || 'Sin Proveedor'}</div>
                    <div className='text-xs text-gray-500'>
                        Item: {info.row.original.tipo_moneda_label || 'CLP'}
                        {info.row.original.tipo_moneda_proveedor_label
                            ? ` | Proveedor: ${info.row.original.tipo_moneda_proveedor_label}`
                            : ''}
                    </div>
                </div>
            ),
            header: 'Proveedor',
        }),
        columnHelper.accessor('cantidad', {
            cell: (info) => info.getValue(),
            header: 'Cantidad',
        }),
        columnHelper.accessor('precio_unitario', {
            cell: (info) => {
                const porcentajeRecargo = info.row.original.porcentaje_recargo ?? detalleCotizacion?.porcentaje_recargo ?? 0;
                const monedaItem = info.row.original.tipo_moneda || '2';
                const monedaCotizacion = detalleCotizacion?.tipo_moneda || '2';
                return (
                    <div>
                        {formatCurrency(
                            info.row.original.precio_unitario,
                            monedaItem,
                        )}
                        <div className='text-xs text-gray-500'>
                            Venta cotización:{' '}
                            {formatCurrency(
                                info.row.original.precio_venta_neta_unitario_moneda_base,
                                monedaCotizacion,
                            )}
                        </div>
                        <Tooltip text='Porcentaje de Recargo' placement='bottom'>
                            <div>
                                <Balance
                                    status={
                                        porcentajeRecargo
                                            ? porcentajeRecargo > 0
                                                ? 'positive'
                                                : 'fixed'
                                            : 'fixed'
                                    }
                                    value={`${porcentajeRecargo}%`}
                                />
                            </div>
                        </Tooltip>
                    </div>
                );
            },
            header: 'Precio Unitario',
        }),
        columnHelper.display({
            id: 'total_neto',
            cell: (info) => (
                <div>
                    {formatCurrency(
                        info.row.original.costo_total,
                        info.row.original.tipo_moneda || '2',
                    )}
                    <div className='text-xs text-gray-500'>
                        Total cotización:{' '}
                        {formatCurrency(
                            info.row.original.precio_venta_neta_total_moneda_base,
                            detalleCotizacion?.tipo_moneda || '2',
                        )}
                    </div>
                </div>
            ),
            header: 'Total Neto',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex flex-wrap justify-center gap-2'>
                    {detalleCotizacion?.estado === 'pendiente' && (
                        <EditarItemEnCotizacion
                            item={info.row.original}
                            cotizacion={detalleCotizacion}
                            onItemChange={refetchItems}
                        />
                    )}
                    {detalleCotizacion?.estado == 'pendiente' && (
                        <ConfirmarEliminar
                            nombre={info.row.original.nombre}
                            peticionUrl={`/api/cotizaciones/${detalleCotizacion.id}/items/${info.row.original.id}/`}
                            onDispatch={() => refetchItems()}
                            tooltipText='Eliminar item'
                        />
                    )}
                </div>
            ),
            header: 'Acciones',
        }),
    ];

    const table = useReactTable({
        data: itemsEnCotizacion,
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

    useEffect(() => {
        if (numeroKey) {
            setActiveComponent('Preparación');
        }
    }, [numeroKey]);

    useEffect(() => {
        if (listaContentType.length === 0) {
            dispatch(listaContentTypeThunk());
        }
    }, [listaContentType, dispatch]);

    return (
        <PageWrapper isProtectedRoute={true} name='Detalle Cotizacion' title='Detalle Cotizacion'>
            <Subheader>
                <SubheaderLeft>{null}</SubheaderLeft>
                <SubheaderRight>
                    {detalleCotizacion && (
                        <AuthorityCheckNav
                            authority={['staff', 'superadmin']}
                            userAuthority={listaGrupos?.grupos}>
                            {detalleCotizacion.estado === 'pendiente' && (
                                <EnviarCotizacionParaAprobar
                                    cotizacion={detalleCotizacion}
                                    solicitantes={solicitantesCotizacion}
                                    items={itemsEnCotizacion}
                                    onEnviarChange={() => {
                                        setRefrescandoEstado(true);
                                        refetch();
                                    }}
                                />
                            )}
                            {detalleCotizacion.estado === 'enviada' && (
                                <>
                                    <AprobarCotizacion
                                        cotizacion={detalleCotizacion}
                                        solicitantes={solicitantesCotizacion}
                                        items={itemsEnCotizacion}
                                        onAprobarChange={handleStateChange}
                                    />
                                    <RechazarCotizacion
                                        cotizacionId={detalleCotizacion?.id}
                                        onRechazarChange={handleStateChange}
                                    />
                                </>
                            )}
                            {detalleCotizacion.estado === 'aceptada' && (
                                <>
                                    <Tooltip text='Descargar PDF'>
                                        <Button
                                            variant='solid'
                                            color='red'
                                            icon='HeroDocumentArrowDown'
                                            onClick={descargarCotizacionPDF}></Button>
                                    </Tooltip>
                                    <CrearOCDeCotizacion
                                        cotizacion={detalleCotizacion}
                                        items={itemsEnCotizacion}
                                    />
                                </>
                            )}
                            {!detalleCotizacion?.fecha_facturacion_congelada && (
                                <div className='flex items-center justify-end'>
                                    {isEditing ? (
                                        <div className='flex gap-2'>
                                            <Tooltip text='Guardar Cambios'>
                                                <Button
                                                    variant='solid'
                                                    color='emerald'
                                                    icon='HeroCheck'
                                                    onClick={() => formik.handleSubmit()}
                                                />
                                            </Tooltip>
                                            <Tooltip text='Cancelar'>
                                                <Button
                                                    color='red'
                                                    variant='solid'
                                                    onClick={() => {
                                                        setIsEditing(false);
                                                        setModoIngresoManual(false);
                                                        formik.resetForm();
                                                    }}
                                                    icon='HeroXMark'
                                                />
                                            </Tooltip>
                                        </div>
                                    ) : (
                                        <Tooltip text='Editar'>
                                            <Button
                                                variant='solid'
                                                icon='HeroPencil'
                                                onClick={() => {
                                                    setIsEditing(true);
                                                }}
                                            />
                                        </Tooltip>
                                    )}
                                </div>
                            )}
                            <SeguimientoCotizacion
                                cotizacionId={detalleCotizacion?.id}
                                seguimientos={listaSeguimientoCotizacion}
                                loading={fetchingSeguimiento}
                                onSeguimientoChange={refetchSeguimiento}
                            />
                        </AuthorityCheckNav>
                    )}
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                {loadingDetalle ? (
                    <div className='flex h-64 items-center justify-center'>
                        <div className='animate-pulse text-zinc-500'>
                            Cargando datos de cotización...
                        </div>
                    </div>
                ) : (
                    <div className='grid grid-cols-1 gap-4'>
                        {/* Nombre, cliente, estado, descripcion, observaciones */}
                        {/* PPM, Recargo Cliente, Tipo de Moneda, Recargo por Dolar, Dolar Observado, fecha facturacion */}

                        <AuthorityCheckNav
                            authority={['staff', 'superadmin']}
                            userAuthority={listaGrupos?.grupos}>
                            <div className='grid grid-cols-12 gap-4'>
                                <div className='col-span-full md:col-span-8'>
                                    <Card className='h-full w-full'>
                                        <CardHeader>
                                            <Badge className='text-xl'>
                                                Información de la Cotización
                                            </Badge>
                                        </CardHeader>
                                        <CardBody>
                                            <div className='flex flex-col gap-4'>
                                                <div className='grid grid-cols-3 gap-4 rounded-xl border border-zinc-200 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-900/10'>
                                                    <div>
                                                        <Badge>Cliente</Badge>
                                                        <div className='ml-4 font-medium text-zinc-900 dark:text-zinc-100'>
                                                            {detalleCotizacion?.cliente_nombre}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Badge>Nombre</Badge>
                                                        {isEditing ? (
                                                            <Validation
                                                                isValid={formik.isValid}
                                                                isTouched={formik.touched.nombre}
                                                                invalidFeedback={
                                                                    formik.errors.nombre
                                                                }>
                                                                <Input
                                                                    name='nombre'
                                                                    placeholder='nombre'
                                                                    onBlur={formik.handleBlur}
                                                                    onChange={formik.handleChange}
                                                                    value={formik.values.nombre}
                                                                />
                                                            </Validation>
                                                        ) : (
                                                            <div className='ml-4 font-medium text-zinc-900 dark:text-zinc-100'>
                                                                {detalleCotizacion?.nombre}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <Badge>Estado</Badge>
                                                        <div className='ml-4 font-medium text-zinc-900 dark:text-zinc-100'>
                                                            {detalleCotizacion?.estado_label}
                                                        </div>
                                                        {detalleCotizacion?.estado_oc_derivado === 'pendiente_oc' && (
                                                            <Badge color='amber' variant='outline' className='mt-1 text-xs'>
                                                                Sin OC
                                                            </Badge>
                                                        )}
                                                        {detalleCotizacion?.estado_oc_derivado === 'en_oc' && (
                                                            <Badge color='blue' variant='outline' className='mt-1 text-xs'>
                                                                En OC
                                                            </Badge>
                                                        )}
                                                        {detalleCotizacion?.estado_oc_derivado === 'cerrada_comercialmente' && (
                                                            <Badge color='zinc' variant='outline' className='mt-1 text-xs'>
                                                                Cerrada comercialmente
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className='col-span-full'>
                                                        <Badge>Descripción</Badge>
                                                        {isEditing ? (
                                                            <Validation
                                                                isValid={formik.isValid}
                                                                isTouched={
                                                                    formik.touched.descripcion
                                                                }
                                                                invalidFeedback={
                                                                    formik.errors.descripcion
                                                                }>
                                                                <Textarea
                                                                    name='descripcion'
                                                                    onBlur={formik.handleBlur}
                                                                    onChange={formik.handleChange}
                                                                    value={
                                                                        formik.values.descripcion
                                                                    }
                                                                />
                                                            </Validation>
                                                        ) : (
                                                            <div className='ml-4'>
                                                                {detalleCotizacion?.descripcion ||
                                                                    'Sin Descripción'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className='col-span-full'>
                                                        <Badge>Observaciones</Badge>
                                                        {isEditing ? (
                                                            <Validation
                                                                isValid={formik.isValid}
                                                                isTouched={
                                                                    formik.touched.observaciones
                                                                }
                                                                invalidFeedback={
                                                                    formik.errors.observaciones
                                                                }>
                                                                <Textarea
                                                                    name='observaciones'
                                                                    onBlur={formik.handleBlur}
                                                                    onChange={formik.handleChange}
                                                                    value={
                                                                        formik.values.observaciones
                                                                    }
                                                                />
                                                            </Validation>
                                                        ) : (
                                                            <div className='ml-4'>
                                                                {detalleCotizacion?.observaciones ||
                                                                    'Sin Observaciones'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardBody>
                                    </Card>
                                </div>
                                <div className='col-span-full md:col-span-4'>
                                    <Card className='h-full w-full'>
                                        <CardHeader>
                                            <Badge className='text-xl'>Uso Interno</Badge>
                                        </CardHeader>
                                        <CardBody>
                                            {isFutureDate && (
                                                <div className='mb-4 rounded-lg border-l-4 border-yellow-500 bg-yellow-100 p-3 text-sm text-yellow-800'>
                                                    <div className='flex items-center gap-2 font-bold'>
                                                        <Icon icon='HeroExclamationTriangle' />
                                                        Cotización Proyectada
                                                    </div>
                                                    Esta cotización tiene fecha futura. Los valores
                                                    de moneda son estimados.
                                                </div>
                                            )}
                                            {detalleCotizacion?.estado_tipo_cambio === 'error' && !modoIngresoManual && (
                                                <div className='mb-4 rounded-lg border-l-4 border-red-500 bg-red-100 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300'>
                                                    <div className='flex items-center gap-2 font-bold'>
                                                        <Icon icon='HeroExclamationCircle' />
                                                        Error al obtener tipo de cambio
                                                    </div>
                                                    <p className='mt-1'>
                                                        {detalleCotizacion?.error_tipo_cambio || 'No se pudo obtener el valor del dólar/UF desde la API.'}
                                                    </p>
                                                    <div className='mt-2 flex gap-2'>
                                                        <Button
                                                            variant='outline'
                                                            color='red'
                                                            size='xs'
                                                            icon='HeroPencil'
                                                            onClick={() => {
                                                                setModoIngresoManual(true);
                                                                setIsEditing(true);
                                                            }}
                                                        >
                                                            Ingresar manualmente
                                                        </Button>
                                                        <Button
                                                            variant='outline'
                                                            color='zinc'
                                                            size='xs'
                                                            icon='HeroArrowPath'
                                                            onClick={handleRefrescarValores}
                                                            isLoading={refrescandoTipoCambio}
                                                        >
                                                            Reintentar
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                            {modoIngresoManual && isEditing && (
                                                <div className='mb-4 rounded-lg border-l-4 border-blue-500 bg-blue-100 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'>
                                                    <div className='flex items-center gap-2 font-bold'>
                                                        <Icon icon='HeroInformationCircle' />
                                                        Modo ingreso manual
                                                    </div>
                                                    <p className='mt-1'>
                                                        Ingresa los valores de Dólar y/o UF manualmente y guarda los cambios.
                                                    </p>
                                                </div>
                                            )}
                                            <div className='flex flex-col gap-4'>
                                                <div
                                                    className={classNames(
                                                        'grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-900/10',
                                                    )}>
                                                    <div>
                                                        <Badge>Moneda de Venta</Badge>
                                                        {canEditUsoInternoField('tipo_moneda') ? (
                                                            <Validation
                                                                isValid={formik.isValid}
                                                                isTouched={
                                                                    formik.touched.tipo_moneda
                                                                }
                                                                invalidFeedback={
                                                                    formik.errors.tipo_moneda
                                                                }>
                                                                <SelectReact
                                                                    name='tipo_moneda'
                                                                    id='tipo_moneda'
                                                                    placeholder='Seleccione un tipo de moneda'
                                                                    options={TIPO_MONEDA}
                                                                    value={TIPO_MONEDA.find(
                                                                        (option) =>
                                                                            option.value ===
                                                                            formik.values
                                                                                .tipo_moneda,
                                                                    )}
                                                                    onChange={(option: any) =>
                                                                        formik.setFieldValue(
                                                                            'tipo_moneda',
                                                                            option?.value,
                                                                        )
                                                                    }
                                                                    onBlur={formik.handleBlur}
                                                                />
                                                            </Validation>
                                                        ) : (
                                                            <div className='ml-4 font-medium text-zinc-900 dark:text-zinc-100'>
                                                                {
                                                                    detalleCotizacion?.tipo_moneda_label
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <Badge>Dolar Observado</Badge>
                                                        {canEditUsoInternoField('dolar_observado') ? (
                                                            <Validation
                                                                isValid={formik.isValid}
                                                                isTouched={
                                                                    formik.touched.dolar_observado
                                                                }
                                                                invalidFeedback={
                                                                    formik.errors.dolar_observado
                                                                }>
                                                                <div className='relative'>
                                                                    <Input
                                                                        name='dolar_observado'
                                                                        type='number'
                                                                        onChange={
                                                                            formik.handleChange
                                                                        }
                                                                        onBlur={formik.handleBlur}
                                                                        value={
                                                                            formik.values
                                                                                .dolar_observado
                                                                        }
                                                                    />
                                                                    <div className='absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1'>
                                                                        <Tooltip text='Refrescar Dólar ahora'>
                                                                            <Button
                                                                                variant='default'
                                                                                size='xs'
                                                                                icon='HeroArrowPath'
                                                                                className={classNames(
                                                                                    '!p-1',
                                                                                    refrescandoTipoCambio
                                                                                        ? 'text-primary animate-spin'
                                                                                        : 'text-zinc-400',
                                                                                )}
                                                                                onClick={
                                                                                    handleRefrescarValores
                                                                                }
                                                                            />
                                                                        </Tooltip>
                                                                    </div>
                                                                </div>
                                                            </Validation>
                                                        ) : (
                                                            <>
                                                                {tipoCambioTooltip ? (
                                                                    <Tooltip
                                                                        text={tipoCambioTooltip}>
                                                                        <div className='ml-4 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2'>
                                                                            ${' '}
                                                                            {formatPrice(
                                                                                detalleCotizacion?.dolar_observado,
                                                                                2,
                                                                                0,
                                                                            )}
                                                                            {mostrarSpinnerDolar && (
                                                                                <Icon icon='HeroArrowPath' className='animate-spin text-blue-500 text-sm' />
                                                                            )}
                                                                        </div>
                                                                    </Tooltip>
                                                                ) : (
                                                                    <div className='ml-4 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2'>
                                                                        ${' '}
                                                                        {formatPrice(
                                                                            detalleCotizacion?.dolar_observado,
                                                                            2,
                                                                            0,
                                                                        )}
                                                                        {mostrarSpinnerDolar && (
                                                                            <Icon icon='HeroArrowPath' className='animate-spin text-blue-500 text-sm' />
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <Badge>Fecha de Facturación</Badge>
                                                        {canEditUsoInternoField('fecha_facturacion') ? (
                                                            <Validation
                                                                isValid={formik.isValid}
                                                                isTouched={
                                                                    formik.touched.fecha_facturacion
                                                                }
                                                                invalidFeedback={
                                                                    formik.errors.fecha_facturacion
                                                                }>
                                                                <Input
                                                                    name='fecha_facturacion'
                                                                    type='date'
                                                                    onChange={formik.handleChange}
                                                                    onBlur={formik.handleBlur}
                                                                    value={
                                                                        formik.values
                                                                            .fecha_facturacion
                                                                    }
                                                                />
                                                            </Validation>
                                                        ) : (
                                                            <div className='ml-4'>
                                                                {dayjs(
                                                                    detalleCotizacion?.fecha_facturacion,
                                                                ).format('DD/MM/YYYY')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <Badge>UF Observado</Badge>
                                                        {canEditUsoInternoField('valor_uf') ? (
                                                            <Validation
                                                                isValid={formik.isValid}
                                                                isTouched={formik.touched.valor_uf}
                                                                invalidFeedback={
                                                                    formik.errors.valor_uf
                                                                }>
                                                                <div className='relative'>
                                                                    <Input
                                                                        name='valor_uf'
                                                                        onChange={
                                                                            formik.handleChange
                                                                        }
                                                                        onBlur={formik.handleBlur}
                                                                        value={
                                                                            formik.values.valor_uf
                                                                        }
                                                                    />
                                                                    <div className='absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1'>
                                                                        <Tooltip text='Refrescar UF ahora'>
                                                                            <Button
                                                                                variant='default'
                                                                                size='xs'
                                                                                icon='HeroArrowPath'
                                                                                className={classNames(
                                                                                    '!p-1',
                                                                                    refrescandoTipoCambio
                                                                                        ? 'text-primary animate-spin'
                                                                                        : 'text-zinc-400',
                                                                                )}
                                                                                onClick={
                                                                                    handleRefrescarValores
                                                                                }
                                                                            />
                                                                        </Tooltip>
                                                                    </div>
                                                                </div>
                                                            </Validation>
                                                        ) : (
                                                            <>
                                                                {tipoCambioTooltip ? (
                                                                    <Tooltip
                                                                        text={tipoCambioTooltip}>
                                                                        <div className='ml-4 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2'>
                                                                            ${' '}
                                                                            {formatPrice(
                                                                                detalleCotizacion?.valor_uf,
                                                                                2,
                                                                                0,
                                                                            )}
                                                                            {mostrarSpinnerUf && (
                                                                                <Icon icon='HeroArrowPath' className='animate-spin text-blue-500 text-sm' />
                                                                            )}
                                                                        </div>
                                                                    </Tooltip>
                                                                ) : (
                                                                    <div className='ml-4 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2'>
                                                                        ${' '}
                                                                        {formatPrice(
                                                                            detalleCotizacion?.valor_uf,
                                                                            2,
                                                                            0,
                                                                        )}
                                                                        {mostrarSpinnerUf && (
                                                                            <Icon icon='HeroArrowPath' className='animate-spin text-blue-500 text-sm' />
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <Badge>PPM</Badge>
                                                        {canEditUsoInternoField('ppm') ? (
                                                            <Validation
                                                                isValid={formik.isValid}
                                                                isTouched={formik.touched.ppm}
                                                                invalidFeedback={formik.errors.ppm}>
                                                                <Input
                                                                    name='ppm'
                                                                    type='number'
                                                                    onChange={(e) => {
                                                                        formik.setFieldValue(
                                                                            'ppm',
                                                                            Number(e.target.value),
                                                                        );
                                                                    }}
                                                                    onBlur={formik.handleBlur}
                                                                    value={formik.values.ppm}
                                                                />
                                                            </Validation>
                                                        ) : (
                                                            <div className='ml-4 font-medium text-zinc-900 dark:text-zinc-100'>
                                                                {formatPrice(
                                                                    detalleCotizacion?.ppm,
                                                                    2,
                                                                )}
                                                                %
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <Badge>Porcentaje de Recargo</Badge>
                                                        {canEditUsoInternoField('porcentaje_recargo') ? (
                                                            <Validation
                                                                isValid={formik.isValid}
                                                                isTouched={formik.touched.porcentaje_recargo}
                                                                invalidFeedback={formik.errors.porcentaje_recargo}>
                                                                <Input
                                                                    name='porcentaje_recargo'
                                                                    type='number'
                                                                    onChange={(e) => {
                                                                        formik.setFieldValue(
                                                                            'porcentaje_recargo',
                                                                            Number(e.target.value),
                                                                        );
                                                                    }}
                                                                    onBlur={formik.handleBlur}
                                                                    value={formik.values.porcentaje_recargo}
                                                                />
                                                            </Validation>
                                                        ) : (
                                                            <div className='ml-4 font-medium text-zinc-900 dark:text-zinc-100'>
                                                                {formatPrice(
                                                                    detalleCotizacion?.porcentaje_recargo,
                                                                    2,
                                                                )}
                                                                %
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardBody>
                                    </Card>
                                </div>
                            </div>
                        </AuthorityCheckNav>

                        <AuthorityCheckNav
                            authority={['tecnico']}
                            userAuthority={listaGrupos?.grupos}>
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <Badge className='text-xl'>Datos</Badge>
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody>
                                    <div className='flex flex-col gap-4'>
                                        <div className='grid grid-cols-2 gap-4 rounded-xl border border-blue-500 p-4 lg:grid-cols-3'>
                                            <div>
                                                <Badge>Cliente</Badge>
                                                <div className='ml-4'>
                                                    {detalleCotizacion?.cliente_nombre}
                                                </div>
                                            </div>
                                            <div>
                                                <Badge>Nombre</Badge>
                                                <div className='ml-4'>
                                                    {detalleCotizacion?.nombre}
                                                </div>
                                            </div>
                                            <div>
                                                <Badge>Estado</Badge>
                                                <div className='ml-4'>
                                                    {detalleCotizacion?.estado_label}
                                                </div>
                                            </div>
                                        </div>
                                        <div className='grid grid-cols-2 gap-4 rounded-xl border border-blue-500 p-4'>
                                            <div>
                                                <Badge>Descripción</Badge>
                                                <div className='ml-4'>
                                                    {detalleCotizacion?.descripcion ||
                                                        'Sin Descripción'}
                                                </div>
                                            </div>
                                            <div>
                                                <Badge>Observaciones</Badge>
                                                <div className='ml-4'>
                                                    {detalleCotizacion?.observaciones ||
                                                        'Sin Observaciones'}
                                                </div>
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
                                    <div className='col-span-full flex justify-end'>
                                        <AuthorityCheckNav
                                            authority={['staff', 'superadmin']}
                                            userAuthority={listaGrupos?.grupos}>
                                            {crearSolicitante ? (
                                                <>
                                                    <Button
                                                        color='red'
                                                        onClick={() => {
                                                            setCrearSolicitante(false);
                                                        }}>
                                                        Cancelar
                                                    </Button>
                                                    <Button
                                                        variant='solid'
                                                        onClick={() => {
                                                            setCreandoSolicitante(true);
                                                        }}>
                                                        Crear
                                                    </Button>
                                                </>
                                            ) : (
                                                <Tooltip text='Añadir Solicitantes'>
                                                    <Button
                                                        variant='solid'
                                                        onClick={() => {
                                                            setCrearSolicitante(true);
                                                        }}
                                                        icon='HeroPlus'
                                                    />
                                                </Tooltip>
                                            )}
                                        </AuthorityCheckNav>
                                    </div>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className='flex flex-col gap-4'>
                                    <AgregarSolicitanteCotizacion
                                        isEditing={crearSolicitante}
                                        setIsEditing={setCrearSolicitante}
                                        creandoSolicitante={creandoSolicitante}
                                        setCreandoSolicitante={setCreandoSolicitante}
                                        cotizacionId={detalleCotizacion?.id}
                                    />
                                    {solicitantesCotizacion.length > 0 ? (
                                        solicitantesCotizacion.map((solicitante) => (
                                            <div
                                                className='grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-900/10'
                                                key={solicitante.id}>
                                                <div>
                                                    <Badge>Nombre</Badge>
                                                    <div className='ml-4 flex flex-col gap-1 font-medium text-zinc-900 dark:text-zinc-100'>
                                                        <div className='flex items-center gap-2'>
                                                            {solicitante.nombre_usuario}
                                                            {solicitante.aprobo && (
                                                                <Tooltip
                                                                    text={`Cotización Aceptada por ${solicitante.nombre_usuario}`}>
                                                                    <Icon
                                                                        size='text-2xl'
                                                                        icon={'HeroCheckCircle'}
                                                                        color={'emerald'}
                                                                    />
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                        {solicitante.aprobo && solicitante.fecha_aprobacion && (
                                                            <span className='text-xs text-emerald-600 dark:text-emerald-400'>
                                                                Aprobado el {dayjs(solicitante.fecha_aprobacion).format('DD/MM/YYYY HH:mm')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className='flex flex-row items-center justify-between'>
                                                    <div>
                                                        <Badge>Email</Badge>
                                                        <div className='ml-4 font-medium text-zinc-900 dark:text-zinc-100'>
                                                            {solicitante.email_usuario}
                                                        </div>
                                                    </div>
                                                    <div className='flex items-center gap-2'>
                                                        <AuthorityCheckNav
                                                            authority={['staff', 'superadmin']}
                                                            userAuthority={listaGrupos?.grupos}>
                                                            {(detalleCotizacion?.estado === 'enviada' || detalleCotizacion?.estado === 'aceptada') && (
                                                                <Tooltip text='Enviar copia de la cotización'>
                                                                    <Button
                                                                        icon='HeroEnvelope'
                                                                        color='blue'
                                                                        variant='solid'
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            const confirmed = await confirmAlert({
                                                                                title: 'Enviar copia',
                                                                                text: `¿Enviar cotización a ${solicitante.email_usuario}?`,
                                                                                confirmText: 'Enviar',
                                                                                cancelText: 'Cancelar',
                                                                            });
                                                                            
                                                                            if (confirmed) {
                                                                                try {
                                                                                    await ApiService.fetchData({
                                                                                        url: `/api/cotizaciones/${detalleCotizacion?.id}/enviar-copia-solicitante/`,
                                                                                        method: 'post',
                                                                                        headers: { 'Content-Type': 'application/json' },
                                                                                        data: JSON.stringify({ solicitante_id: solicitante.id }),
                                                                                    });
                                                                                    toast.success('Copia enviada correctamente', { autoClose: 1000 });
                                                                                } catch (error: any) {
                                                                                    const errorMsg = error?.data?.detail || error?.message || 'Error desconocido';
                                                                                    toast.error(`Error enviando copia: ${errorMsg}`);
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                </Tooltip>
                                                            )}
                                                            {detalleCotizacion?.estado === 'pendiente' && (
                                                                <Tooltip text='Eliminar Solicitante'>
                                                                    <Button
                                                                        icon='HeroTrash'
                                                                        color='red'
                                                                        variant='solid'
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            const confirmed = await confirmAlert({
                                                                                title: 'Confirmar eliminación',
                                                                                text: '¿Estás seguro(a) de eliminar al solicitante?',
                                                                                confirmText: 'Eliminar',
                                                                                cancelText: 'Cancelar',
                                                                                icon: 'warning',
                                                                                confirmColor: '#ef4444',
                                                                            });
                                                                            
                                                                            if (confirmed) {
                                                                                try {
                                                                                    await deleteSolicitanteCotizacion({
                                                                                        id: solicitante.id,
                                                                                        cotizacionId: detalleCotizacion.id,
                                                                                    }).unwrap();
                                                                                    toast.success('Solicitante eliminado correctamente', { autoClose: 1000 });
                                                                                } catch (error: any) {
                                                                                    const errorMsg = error?.data?.detail || error?.message || 'Error desconocido';
                                                                                    toast.error(`Error eliminando Solicitante: ${errorMsg}`);
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                </Tooltip>
                                                            )}
                                                        </AuthorityCheckNav>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className='ml-4 w-full'>No hay Solicitantes</div>
                                    )}
                                </div>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardBody>
                                <div className='flex flex-row gap-4 overflow-auto'>
                                    <AuthorityCheckNav
                                        authority={['staff', 'superadmin']}
                                        userAuthority={listaGrupos?.grupos}>
                                        <Button
                                            {...(activeComponent === 'Preparación'
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
                                                setActiveComponent('Preparación');
                                            }}>
                                            Preparación
                                        </Button>
                                        <Button
                                            {...(activeComponent === 'Impuestos'
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
                                                setActiveComponent('Impuestos');
                                            }}>
                                            Impuestos
                                        </Button>
                                        <Button
                                            {...(activeComponent === 'Cotización Final'
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
                                                setActiveComponent('Cotización Final');
                                            }}>
                                            Cotización Final
                                        </Button>
                                        <Button
                                            {...(activeComponent === 'Comentarios'
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
                                                setActiveComponent('Comentarios');
                                            }}>
                                            Comentarios
                                        </Button>
                                    </AuthorityCheckNav>
                                    <AuthorityCheckNav
                                        authority={['tecnico']}
                                        userAuthority={listaGrupos?.grupos}>
                                        <Button
                                            {...(activeComponent === 'Items'
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
                                                setActiveComponent('Items');
                                            }}>
                                            Items
                                        </Button>
                                    </AuthorityCheckNav>
                                </div>
                            </CardBody>
                        </Card>

                        {activeComponent === 'Preparación' && (
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <Badge className='text-xl'>Preparación</Badge>
                                    </CardHeaderChild>
                                    <CardHeaderChild>
                                        <AnimacionDeInputModoMovil
                                            globalFilter={globalFilter}
                                            setGlobalFilter={setGlobalFilter}
                                            anchoInput={140}>
                                            {detalleCotizacion &&
                                                detalleCotizacion.estado === 'pendiente' && (
                                                    <CrearItemCotizacion
                                                        cotizacion={detalleCotizacion}
                                                        items={itemsEnCotizacion}
                                                        onItemChange={refetchItems}
                                                    />
                                                )}
                                        </AnimacionDeInputModoMovil>
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody className='z-0'>
                                    <div className='overflow-auto'>
                                        <Table className='min-w-[800px] table-fixed'>
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
                                                    <Tr 
                                                        key={row.id}
                                                        className={classNames(
                                                            row.original.aprobado 
                                                                ? 'border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10' 
                                                                : 'border-l-4 border-l-transparent'
                                                        )}
                                                    >
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
                                        <div className='mt-2 min-w-[800px]'>
                                            <TableCardFooterTemplateV2 table={table} />
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        )}

                        {activeComponent === 'Impuestos' && (
                            <TablaImpuestos items={itemsEnCotizacion} />
                        )}

                        {activeComponent === 'Cotización Final' && (
                            <TablaVenta items={itemsEnCotizacion} cotizacion={detalleCotizacion} />
                        )}

                        {activeComponent === 'Comentarios' && (
                            <TablaComentarios
                                cotizacion={detalleCotizacion}
                                comentarios={listaSeguimientoCotizacion}
                                loading={fetchingSeguimiento}
                                onComentarioChange={refetchSeguimiento}
                            />
                        )}

                        {activeComponent === 'Items' && (
                            <TablaItemsTecnico
                                items={itemsEnCotizacion}
                                cotizacion={detalleCotizacion}
                            />
                        )}
                    </div>
                )}
            </Container>
        </PageWrapper>
    );
};

export default DetalleCotizacion;
