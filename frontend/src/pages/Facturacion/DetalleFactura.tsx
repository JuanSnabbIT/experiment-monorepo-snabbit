import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild, CardTitle } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import ItemDetailModal from '@/pages/Facturacion/ItemDetailModal';
import ApiService from '@/services/ApiService';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { TColorIntensity } from '@/types/colorIntensities.type';
import { TColors } from '@/types/colors.type';
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
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { buildPrefacturacionListPath, parsePrefacturacionSearchParams } from './prefacturacion.shared';

interface PrefacturaResumen {
    total_items?: number;
    total_facturar?: number;
    total_excluidos?: number;
    [key: string]: unknown;
}

interface PrefacturaVisitas {
    periodo?: string;
    incluidas_mes?: number;
    confirmadas_mes?: number;
    marcadas_prefactura?: number;
    proyectadas_mes?: number;
    exceso_prefactura?: number;
    ots_marcadas?: number[];
    precio_unitario_exceso?: number;
    total_exceso?: number;
}

interface PrefacturaItem {
    ot_id?: number;
    id?: number;
    item_id?: number;
    tipo?: string;
    cantidad?: number;
    precio_total?: number;
    precio_ajustado?: number | null;
    facturar?: boolean;
    comentario?: string;
    nombre?: string;
    parent_id?: number;
    guia_id?: number;
    rendicion_id?: number;
    stock_item_id?: number | null;
    [key: string]: unknown;
}

interface PrefacturaItemsPayload {
    cliente_id?: number | null;
    contrato_id?: number | null;
    ots_incluidas?: number[];
    items?: PrefacturaItem[];
    resumen?: PrefacturaResumen;
    visitas?: PrefacturaVisitas;
    [key: string]: unknown;
}

interface PrefacturaDetalle {
    id: number;
    cliente: number | null;
    cliente_nombre?: string | null;
    estado_cierre: string;
    comentario?: string | null;
    resultado?: PrefacturaItemsPayload;
    fecha_creacion?: string;
    fecha_modificacion?: string;
    creado_por?: number | null;
    actualizado_por?: number | null;
    documento_factura?: string | File | null;
}

const columnHelper = createColumnHelper<PrefacturaItem>();

const getItemDetailUrl = (item: PrefacturaItem): string | null => {
    const { tipo, id, ot_id } = item;

    switch (tipo) {
        case 'visita_adicional_contrato':
            return null;
        case 'servicio_ot':
        case 'soporte_tecnico':
            // Navegar al detalle de la Orden de Trabajo
            return `/orden-trabajo/detalle-orden-trabajo/${ot_id}`;
        case 'guia_salida': {
            // Navegar al detalle de la Guía de Salida usando parent_id (puede venir como guia_id antiguo)
            const parentId = (item as any).parent_id ?? (item as any).guia_id;
            return parentId ? `/bodega/detalle-guia-salida-bodega/${parentId}` : null;
        }
        case 'rendicion_gasto':
        case 'compra_material': {
            // Navegar al detalle de la Rendición
            const parentId = (item as any).parent_id ?? (item as any).rendicion_id;
            return parentId ? `/rendicion/detalle-rendicion/${parentId}` : null;
        }
        default:
            return null;
    }
};

const DetalleFactura = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const routeState = parsePrefacturacionSearchParams(searchParams, 'ot');
    const backToList = buildPrefacturacionListPath(routeState, 'ot');
    const [factura, setFactura] = useState<PrefacturaDetalle | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<PrefacturaItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [detalleSeleccionado, setDetalleSeleccionado] = useState<number | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [enrichedItems, setEnrichedItems] = useState<PrefacturaItem[]>([]);
    const [enriching, setEnriching] = useState<boolean>(false);
    const [uploadingDocument, setUploadingDocument] = useState<boolean>(false);
    const [isOtsModalOpen, setIsOtsModalOpen] = useState<boolean>(false);
    const [otsLoading, setOtsLoading] = useState<boolean>(false);
    const [otsInfo, setOtsInfo] = useState<Record<number, any>>({});

    useEffect(() => {
        if (!id) return;
        fetchFactura();
    }, [id]);

    const fetchFactura = () => {
        if (!id) return;
        setLoading(true);
        ApiService.fetchData<PrefacturaDetalle>({
            url: `/api/cierres-administrativos/${id}/`,
            method: 'get',
        })
            .then((response) => {
                setFactura(response.data);
                // Enriquecer items con datos adicionales que no vienen en JSON
                enrichItemsData(response.data.resultado?.items || []);
            })
            .catch((error) => {
                const message =
                    error?.response?.data?.detail || error?.message || 'Error al cargar la factura';
                toast.error(message);
            })
            .finally(() => setLoading(false));
    };

    const handleEliminarPrefactura = async () => {
        if (!factura || factura.estado_cierre !== 'borrador') return;

        const ok = await confirmAlert({
            title: 'Eliminar prefactura',
            text: `¿Confirmas eliminar la prefactura #${factura.id}? Se podrá volver a crear una nueva.`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            icon: 'warning',
            confirmColor: '#dc2626',
        });
        if (!ok) return;

        try {
            await ApiService.fetchData({
                url: `/api/cierres-administrativos/${factura.id}/`,
                method: 'delete',
            });
            toast.success(`Prefactura #${factura.id} eliminada`);
            navigate(backToList);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleAsociarDocumento = async () => {
        if (!factura) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png';
        input.onchange = async (e: any) => {
            const archivo = e.target.files?.[0];
            if (!archivo) return;

            setUploadingDocument(true);
            const formData = new FormData();
            formData.append('documento', archivo);

            try {
                await ApiService.fetchData({
                    url: `/api/cierres-administrativos/${factura.id}/asociar-documento/`,
                    method: 'post',
                    data: formData,
                });
                toast.success('Documento asociado exitosamente');
                fetchFactura();
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            } finally {
                setUploadingDocument(false);
            }
        };
        input.click();
    };

    const handleDescargarDocumento = () => {
        if (!factura?.documento_factura) return;
        
        const url = typeof factura.documento_factura === 'string' 
            ? factura.documento_factura 
            : '';
        
        if (url) {
            window.open(url, '_blank');
        }
    };

    // Enriquecer items: fetch SOLO los datos que faltan (nombre del item, etc)
    const enrichItemsData = async (items: PrefacturaItem[]) => {
        setEnriching(true);

        const enrichedPromises = items.map(async (item) => {
            try {
                // Copiar item base (ya tiene cantidad, precio_total, etc)
                const enriched = { ...item };

                // Fetch según tipo - SOLO para obtener nombre del item
                if (item.tipo === 'guia_salida') {
                    // Fetch ItemsGuiaSalida usando item.id para obtener nombre
                    const response = await ApiService.fetchData({
                        url: `/api/items-guia/${item.id}/`,
                        method: 'get',
                    });
                    const itemGuia = response.data as any;
                    enriched.nombre = itemGuia.stock_item?.item?.nombre || `Item #${item.id}`;
                    // store parent_id for generic parent reference (guia or compra)
                    enriched.parent_id = itemGuia.guia?.id ?? (item as any).parent_id ?? null;
                    enriched.guia_id = itemGuia.guia?.id;
                    enriched.stock_item_id = itemGuia.stock_item?.id;
                }
                // TODO: servicio_ot y soporte_tecnico - fetch nombre desde OT
                // TODO: compra - fetch ItemEnCompra para nombre
                // TODO: gasto_operativo - fetch para nombre

                return enriched;
            } catch (error) {
                return { ...item, nombre: `${item.tipo} #${item.id}` };
            }
        });

        const results = await Promise.all(enrichedPromises);
        setEnrichedItems(results);
        setEnriching(false);
    };

    const items = enrichedItems;
    const resumen = factura?.resultado?.resumen;
    const visitas = factura?.resultado?.visitas;
    const otsIncluidas = factura?.resultado?.ots_incluidas ?? [];

    useEffect(() => {
        if (!isOtsModalOpen || otsIncluidas.length === 0) return;

        const missingIds = otsIncluidas.filter((id) => !otsInfo[id]);
        if (missingIds.length === 0) return;

        setOtsLoading(true);
        Promise.all(
            missingIds.map(async (otId) => {
                try {
                    const response = await ApiService.fetchData({
                        url: `/api/ordenes-de-trabajo/${otId}/`,
                        method: 'get',
                    });
                    return { otId, data: response.data };
                } catch (error) {
                    return { otId, data: null };
                }
            }),
        )
            .then((results) => {
                setOtsInfo((prev) => {
                    const next = { ...prev };
                    results.forEach((result) => {
                        next[result.otId] = result.data;
                    });
                    return next;
                });
            })
            .finally(() => setOtsLoading(false));
    }, [isOtsModalOpen, otsIncluidas, otsInfo]);

    const columns = [
        columnHelper.accessor('ot_id', {
            cell: (info) => (
                <div className='font-semibold text-blue-600 dark:text-blue-400'>
                    {info.getValue() || '—'}
                </div>
            ),
            header: 'N° OT',
        }),
        columnHelper.accessor('tipo', {
            cell: (info) => {
                const tipo = info.getValue();
                const tipoBadgeMap: Record<string, { label: string; color: TColors }> = {
                    servicio_ot: { label: 'Servicio', color: 'sky' },
                    soporte_tecnico: { label: 'Soporte', color: 'emerald' },
                    guia_salida: { label: 'Guía', color: 'amber' },
                    compra: { label: 'Compra', color: 'violet' },
                    compra_material: { label: 'Compra Material', color: 'lime' },
                    gasto_operativo: { label: 'Gasto Operativo', color: 'red' },
                    rendicion_gasto: { label: 'Gasto Operativo', color: 'blue' },
                    visita_adicional_contrato: { label: 'Visita adicional', color: 'red' },
                };

                const config = tipoBadgeMap[tipo ?? ''] ?? {
                    label: tipo || 'Item',
                    color: 'gray' as TColors,
                };

                return (
                    <Badge variant='outline' color={config.color} className='capitalize'>
                        {config.label}
                    </Badge>
                );
            },
            header: 'Tipo Item',
        }),
        columnHelper.display({
            id: 'descripcion',
            size: 520,
            minSize: 420,
            maxSize: 720,
            cell: (info) => {
                const item = info.row.original;
                const rowKey = `${item.tipo}-${item.id}`;
                const isExpanded = expandedRows.has(rowKey);

                // Descripción principal: preferir campo 'descripcion' si existe, sino 'nombre'
                const descripcion = (item as any).descripcion || item.nombre || 'Sin descripción';

                // Generar subtítulo/información extra según tipo (se mostrará en el área expandible)
                let detalles = '';
                switch (item.tipo) {
                    case 'servicio_ot':
                        detalles = `Trabajo #${item.id} de la OT #${item.ot_id}`;
                        break;
                    case 'soporte_tecnico':
                        detalles = `Soporte #${item.id} de la OT #${item.ot_id}`;
                        break;
                    case 'guia_salida':
                        {
                            const cantidadGuia = item.cantidad || 0;
                            const guiaId = (item as any).parent_id ?? (item as any).guia_id ?? '?';
                            detalles = `Item #${item.id} de la Guía #${guiaId} - Cantidad: ${cantidadGuia}`;
                        }
                        break;
                    case 'compra':
                        {
                            const compraId =
                                (item as any).parent_id ?? (item as any).compra_id ?? '?';
                            detalles = `Item #${item.id} de la Compra #${compraId}`;
                        }
                        break;
                    case 'gasto_operativo':
                        detalles = `Gasto #${item.id} de la OT #${item.ot_id}`;
                        break;
                    case 'visita_adicional_contrato':
                        detalles = `Cobro adicional del período ${factura?.resultado?.visitas?.periodo ?? '-'}`;
                        break;
                    default:
                        detalles = `${item.tipo} #${item.id}`;
                }

                return (
                    <div className='w-full space-y-1'>
                        <div className='flex items-start gap-2'>
                            <div className='flex-1 overflow-hidden'>
                                <div className='truncate text-sm font-medium text-gray-900 dark:text-gray-100'>
                                    {descripcion}
                                </div>
                            </div>
                            <Tooltip text='Ver detalles'>
                                <Button
                                    variant='solid'
                                    color='sky'
                                    icon='HeroEye'
                                    size='sm'
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newExpanded = new Set(expandedRows);
                                        if (newExpanded.has(rowKey)) {
                                            newExpanded.delete(rowKey);
                                        } else {
                                            newExpanded.add(rowKey);
                                        }
                                        setExpandedRows(newExpanded);
                                    }}
                                />
                            </Tooltip>
                        </div>

                        {/* Contenido expandible con la info adicional (usando campos del JSON) */}
                        {isExpanded && (
                            <div className='space-y-2 border-t border-gray-300 dark:border-zinc-700 pt-2 text-xs text-gray-600 dark:text-gray-400 dark:text-gray-300 dark:border-gray-600 dark:border-zinc-500'>
                                <div className='font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200'>
                                    {detalles}
                                </div>
                                {/* Comentario mostrado en la tabla; no repetir en el área expandida */}
                            </div>
                        )}
                    </div>
                );
            },
            header: 'Descripción',
        }),
        columnHelper.accessor('precio_total', {
            cell: (info) => {
                const val = Number(info.getValue() ?? 0);
                const formatted = `$${Math.ceil(val).toLocaleString('es-CL')}`;
                return <div className='font-mono text-sm'>{formatted}</div>;
            },
            header: 'Precio Total',
        }),
        columnHelper.accessor('precio_ajustado', {
            cell: (info) => {
                const val = Number(info.getValue() ?? 0);
                if (val === 0) return <div className='text-center text-gray-400 dark:text-gray-300'>—</div>;
                const formatted = `$${Math.ceil(val).toLocaleString('es-CL')}`;
                return (
                    <div className='font-mono text-sm font-semibold text-green-600'>
                        {formatted}
                    </div>
                );
            },
            header: 'Precio Ajustado',
        }),
        columnHelper.accessor('facturar', {
            cell: (info) => {
                const facturar = info.getValue();
                return facturar ? (
                    <Badge variant='solid' color='emerald'>
                        Sí
                    </Badge>
                ) : (
                    <Badge variant='outline' color='gray'>
                        No
                    </Badge>
                );
            },
            header: 'Facturar',
        }),
        columnHelper.accessor('comentario', {
            cell: (info) => (
                <div className='max-w-xs truncate text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                    {info.getValue() || '—'}
                </div>
            ),
            header: 'Comentario',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => {
                const item = info.row.original;
                return (
                    <div className='flex gap-2'>
                        <Tooltip text={`Ver ${item.tipo?.replace(/_/g, ' ')}`}>
                            <Button
                                variant='solid'
                                color='violet'
                                icon='HeroEye'
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedItem(item);
                                    setIsModalOpen(true);
                                }}
                            />
                        </Tooltip>
                    </div>
                );
            },
            header: 'Acciones',
        }),
    ];

    const table = useReactTable({
        data: items,
        columns,
        state: {
            sorting,
            globalFilter,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    const STATUS_BADGE_COLOR_INTENSITY: TColorIntensity = '400';

    const renderEstado = (estado: string) => {
        let color: TColors = 'gray';
        let label = estado;

        switch (estado) {
            case 'borrador':
                color = 'amber';
                label = 'Borrador';
                break;
            case 'por_facturar':
                color = 'blue';
                label = 'Por facturar';
                break;
            case 'facturado':
                color = 'emerald';
                label = 'Facturado';
                break;
        }

        return (
            <Badge
                variant='solid'
                color={color}
                colorIntensity={STATUS_BADGE_COLOR_INTENSITY}
                className='capitalize'>
                {label}
            </Badge>
        );
    };

    const renderVinculadosDetail = (item: PrefacturaItem) => {
        if (item.tipo === 'soporte_tecnico') {
            const usuarios = (item as any).usuarios_asignados || [];
            return (
                <div className='space-y-1 text-sm'>
                    <div className='font-semibold text-gray-800 dark:text-gray-100 dark:text-gray-200'>
                        Usuarios Asignados ({usuarios.length})
                    </div>
                    {usuarios.length === 0 ? (
                        <div className='text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300'>Sin usuarios asignados</div>
                    ) : (
                        <div className='space-y-1'>
                            {usuarios.map((usuario: any, idx: number) => (
                                <div
                                    key={usuario.id || idx}
                                    className='flex items-center justify-between gap-1 rounded border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1 text-xs dark:border-gray-700 dark:bg-gray-800'>
                                    <div>
                                        <div className='font-medium text-gray-700 dark:text-gray-300'>
                                            {usuario.nombre_usuario}
                                        </div>
                                        {usuario.numero_serie_equipo && (
                                            <div className='text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                                📱 {usuario.numero_serie_equipo}
                                            </div>
                                        )}
                                    </div>
                                    <Badge
                                        color={usuario.resuelto ? 'emerald' : 'amber'}
                                        variant='solid'
                                        className='text-xs'>
                                        {usuario.resuelto ? '✓' : '○'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        } else if (item.tipo === 'guia_salida') {
            const cantItems = (item as any).cantidad_items || (item as any).cantidad || 0;
            const guiaId = (item as any).parent_id ?? (item as any).guia_id ?? '?';
            return (
                <div className='space-y-1 text-sm'>
                    <div className='font-semibold text-gray-800 dark:text-gray-100 dark:text-gray-200'>
                        Items en Guía ({cantItems})
                    </div>
                    <div className='text-xs text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                        Guía de Salida #{guiaId} con {cantItems} items
                    </div>
                </div>
            );
        } else if (item.tipo === 'rendicion_gasto' || item.tipo === 'compra_material') {
            const cantDetalles = (item as any).cantidad_detalles || 0;
            return (
                <div className='space-y-1 text-sm'>
                    <div className='font-semibold text-gray-800 dark:text-gray-100 dark:text-gray-200'>
                        Detalles de Rendición ({cantDetalles})
                    </div>
                    <div className='text-xs text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                        Rendición #{(item as any).parent_id ?? (item as any).rendicion_id} con{' '}
                        {cantDetalles} líneas
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <Button
                        variant='outline'
                        icon='HeroArrowLeft'
                        onClick={() => navigate(backToList)}>
                        Volver
                    </Button>
                </SubheaderLeft>
                <SubheaderRight>
                    {factura && factura.estado_cierre === 'borrador' && (
                        <>
                            <Tooltip text='Eliminar prefactura'>
                                <Button
                                    variant='outline'
                                    color='red'
                                    icon='HeroTrash'
                                    onClick={handleEliminarPrefactura}>
                                    Eliminar
                                </Button>
                            </Tooltip>
                            <Button
                                variant='solid'
                                color='blue'
                                icon='HeroArrowRight'
                                onClick={async () => {
                                    if (!factura) return;
                                    const ok = await confirmAlert({
                                        title: 'Finalizar prefactura',
                                        text: `¿Confirmas pasar la prefactura #${factura.id} al estado "Por facturar"? Ya no podrá editarse.`,
                                        confirmText: 'Finalizar',
                                        cancelText: 'Cancelar',
                                        icon: 'info',
                                    });
                                    if (!ok) return;
                                    try {
                                        await ApiService.fetchData({
                                            url: `/api/cierres-administrativos/${factura.id}/finalizar/`,
                                            method: 'post',
                                        });
                                        toast.success(`Prefactura #${factura.id} marcada como "Por facturar"`);
                                        fetchFactura();
                                    } catch (error: unknown) {
                                        toast.error(getErrorMessage(error));
                                    }
                                }}>
                                Finalizar
                            </Button>
                        </>
                    )}

                    {factura && factura.estado_cierre === 'por_facturar' && (
                        <Button
                            variant='solid'
                            color='emerald'
                            icon='HeroDocumentArrowUp'
                            isLoading={uploadingDocument}
                            onClick={handleAsociarDocumento}>
                            {factura.documento_factura
                                ? 'Reemplazar documento'
                                : 'Adjuntar factura'}
                        </Button>
                    )}

                    {factura && factura.estado_cierre === 'facturado' && factura.documento_factura && (
                        <Button
                            variant='outline'
                            color='zinc'
                            icon='HeroArrowPath'
                            isLoading={uploadingDocument}
                            onClick={handleAsociarDocumento}>
                            Reemplazar Documento
                        </Button>
                    )}
                </SubheaderRight>
            </Subheader>

            <Container>
                {loading ? (
                    <Card>
                        <CardBody>
                            <div className='py-12 text-center text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                                Cargando factura...
                            </div>
                        </CardBody>
                    </Card>
                ) : !factura ? (
                    <Card>
                        <CardBody>
                            <div className='py-12 text-center text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                                Prefactura no encontrada.
                            </div>
                        </CardBody>
                    </Card>
                ) : (
                    <>
                        <Card className='mb-4'>
                            <CardHeader>
                                <CardHeaderChild>
                                    <CardTitle className='text-2xl'>
                                        Prefactura #{factura.id}
                                    </CardTitle>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                                    <div>
                                        <div className='text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                            Cliente
                                        </div>
                                        <div className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                                            {factura.cliente_nombre || 'Sin nombre'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className='text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                            Estado
                                        </div>
                                        <div className='mt-1'>
                                            {renderEstado(factura.estado_cierre || 'borrador')}
                                        </div>
                                    </div>
                                    <div>
                                        <div className='text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                            Fecha creación
                                        </div>
                                        <div className='text-lg text-gray-700 dark:text-gray-300'>
                                            {factura.fecha_creacion
                                                ? dayjs(factura.fecha_creacion).format(
                                                      'DD/MM/YYYY HH:mm',
                                                  )
                                                : '—'}
                                        </div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>

                        <Card className='mb-4'>
                            <CardHeader>
                                <CardHeaderChild>
                                    <CardTitle>Resumen</CardTitle>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                                    <div className='rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20'>
                                        <div className='text-sm font-semibold uppercase text-blue-600 dark:text-blue-400'>
                                            Total facturar
                                        </div>
                                        <div className='mt-1 text-2xl font-bold text-blue-900 dark:text-blue-100'>
                                            $
                                            {(resumen?.total_facturar ?? 0).toLocaleString('es-CL')}
                                        </div>
                                    </div>
                                    <div className='rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900/20'>
                                        <div className='text-sm font-semibold uppercase text-emerald-600 dark:text-emerald-400'>
                                            Total items
                                        </div>
                                        <div className='mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100'>
                                            {resumen?.total_items ?? items.length}
                                        </div>
                                    </div>
                                    <button
                                        type='button'
                                        onClick={() => setIsOtsModalOpen(true)}
                                        className='rounded-lg bg-purple-50 p-4 text-left transition hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40'>
                                        <div className='text-sm font-semibold uppercase text-purple-600 dark:text-purple-400'>
                                            OTs incluidas
                                        </div>
                                        <div className='mt-1 text-2xl font-bold text-purple-900 dark:text-purple-100'>
                                            {otsIncluidas.length}
                                        </div>
                                    </button>
                                </div>
                            </CardBody>
                        </Card>

                        {visitas && (
                            <Card className='mb-4 border-l-4 border-l-emerald-500'>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <CardTitle>Visitas del contrato</CardTitle>
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody>
                                    <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
                                        <div className='rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900/20'>
                                            <div className='text-sm font-semibold uppercase text-emerald-600 dark:text-emerald-400'>
                                                Incluidas
                                            </div>
                                            <div className='mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100'>
                                                {visitas.incluidas_mes ?? 0}
                                            </div>
                                        </div>
                                        <div className='rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20'>
                                            <div className='text-sm font-semibold uppercase text-blue-600 dark:text-blue-400'>
                                                Confirmadas
                                            </div>
                                            <div className='mt-1 text-2xl font-bold text-blue-900 dark:text-blue-100'>
                                                {visitas.confirmadas_mes ?? 0}
                                            </div>
                                        </div>
                                        <div className='rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20'>
                                            <div className='text-sm font-semibold uppercase text-amber-600 dark:text-amber-400'>
                                                Marcadas
                                            </div>
                                            <div className='mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100'>
                                                {visitas.marcadas_prefactura ?? 0}
                                            </div>
                                        </div>
                                        <div className='rounded-lg bg-red-50 p-4 dark:bg-red-900/20'>
                                            <div className='text-sm font-semibold uppercase text-red-600 dark:text-red-400'>
                                                Exceso
                                            </div>
                                            <div className='mt-1 text-2xl font-bold text-red-900 dark:text-red-100'>
                                                {visitas.exceso_prefactura ?? 0}
                                            </div>
                                        </div>
                                    </div>
                                    <div className='mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-900/40'>
                                        <div className='text-gray-700 dark:text-gray-300'>
                                            Período {visitas.periodo ?? '-'} | Proyección{' '}
                                            {(visitas.proyectadas_mes ?? 0)}/{visitas.incluidas_mes ?? 0}
                                        </div>
                                        <div className='font-semibold text-gray-900 dark:text-gray-100'>
                                            Total adicional:{' '}
                                            {`$${Number(visitas.total_exceso ?? 0).toLocaleString('es-CL')}`}
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        )}

                        {(factura.estado_cierre === 'por_facturar' || factura.estado_cierre === 'facturado') && (
                            <Card className='mb-4 border-l-4 border-l-violet-500'>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <CardTitle className='flex items-center gap-2'>
                                            <Icon icon='HeroDocumentText' className='size-5' />
                                            Documento de Prefactura
                                        </CardTitle>
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody>
                                    {factura.documento_factura ? (
                                        <div className='rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900/20'>
                                            <div className='flex items-center gap-4'>
                                                <Icon
                                                    icon='HeroCheckCircle'
                                                    className='size-8 text-emerald-600 dark:text-emerald-400'
                                                />
                                                <div className='flex-1'>
                                                    <div className='text-sm font-semibold text-gray-700 dark:text-gray-300'>
                                                        Documento asociado
                                                    </div>
                                                    <div className='text-xs text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                                                        {typeof factura.documento_factura === 'string'
                                                            ? factura.documento_factura.split('/').pop() || 'documento'
                                                            : 'Documento vinculado'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className='mt-4 flex gap-2'>
                                                <Button
                                                    variant='solid'
                                                    color='blue'
                                                    size='sm'
                                                    icon='HeroArrowDownTray'
                                                    onClick={handleDescargarDocumento}>
                                                    Descargar
                                                </Button>
                                                {factura.estado_cierre === 'facturado' && (
                                                    <Button
                                                        variant='solid'
                                                        color='amber'
                                                        size='sm'
                                                        icon='HeroArrowPath'
                                                        isDisable={uploadingDocument}
                                                        onClick={handleAsociarDocumento}>
                                                        {uploadingDocument
                                                            ? 'Subiendo...'
                                                            : 'Reemplazar documento'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className='flex items-center gap-4 rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20'>
                                            <Icon
                                                icon='HeroExclamationTriangle'
                                                className='size-8 text-amber-600 dark:text-amber-400'
                                            />
                                            <div>
                                                <div className='text-sm font-semibold text-gray-700 dark:text-gray-300'>
                                                    Sin documento asociado
                                                </div>
                                                <div className='text-xs text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                                                    Adjunta el documento de factura para completar el proceso
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <CardTitle>Items</CardTitle>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                {items.length === 0 ? (
                                    <div className='py-8 text-center text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                                        No hay items en esta prefactura.
                                    </div>
                                ) : (
                                    <>
                                        <Table>
                                            <THead>
                                                {table.getHeaderGroups().map((headerGroup) => (
                                                    <Tr key={headerGroup.id}>
                                                        {headerGroup.headers.map((header) => (
                                                            <Th
                                                                key={header.id}
                                                                isColumnBorder={false}
                                                                className='cursor-pointer select-none'
                                                                onClick={header.column.getToggleSortingHandler()}>
                                                                <div className='flex items-center gap-2'>
                                                                    {flexRender(
                                                                        header.column.columnDef
                                                                            .header,
                                                                        header.getContext(),
                                                                    )}
                                                                    {{
                                                                        asc: (
                                                                            <Icon
                                                                                icon='HeroChevronUp'
                                                                                className='size-4'
                                                                            />
                                                                        ),
                                                                        desc: (
                                                                            <Icon
                                                                                icon='HeroChevronDown'
                                                                                className='size-4'
                                                                            />
                                                                        ),
                                                                    }[
                                                                        header.column.getIsSorted() as string
                                                                    ] ?? null}
                                                                </div>
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
                                        <TableCardFooterTemplateV2 table={table} />
                                    </>
                                )}
                            </CardBody>
                        </Card>
                    </>
                )}
            </Container>
            <ItemDetailModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                item={selectedItem}
            />
            <Modal isOpen={isOtsModalOpen} setIsOpen={setIsOtsModalOpen}>
                <ModalHeader>
                    <CardTitle>OTs incluidas</CardTitle>
                </ModalHeader>
                <ModalBody>
                    {otsIncluidas.length === 0 ? (
                        <div className='py-6 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                            No hay OTs incluidas en esta prefactura.
                        </div>
                    ) : otsLoading ? (
                        <div className='py-6 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300'>Cargando OTs...</div>
                    ) : (
                        <div className='space-y-3'>
                            {otsIncluidas.map((otId) => (
                                <div
                                    key={otId}
                                    className='flex items-center justify-between rounded border border-gray-200 dark:border-zinc-700 bg-gradient-to-r from-purple-50 to-white p-3'>
                                    <div className='space-y-1'>
                                        <div className='font-semibold text-gray-800 dark:text-gray-100'>OT #{otId}</div>
                                        <div className='text-xs text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                                            {otsInfo[otId]?.cliente_nombre || 'Cliente no disponible'}
                                        </div>
                                        <div className='flex flex-wrap items-center gap-2 text-xs'>
                                            <Badge color='blue' variant='outline'>
                                                {otsInfo[otId]?.estado_label || 'Estado desconocido'}
                                            </Badge>
                                            <Badge color='amber' variant='outline'>
                                                {otsInfo[otId]?.tipo_servicio_label || 'Tipo no disponible'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <Button
                                        variant='solid'
                                        color='violet'
                                        size='sm'
                                        icon='HeroEye'
                                        onClick={() =>
                                            navigate(`/orden-trabajo/detalle-orden-trabajo/${otId}`)
                                        }>
                                        Ver OT
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button color='red' onClick={() => setIsOtsModalOpen(false)}>
                            Cerrar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </PageWrapper>
    );
};

export default DetalleFactura;
