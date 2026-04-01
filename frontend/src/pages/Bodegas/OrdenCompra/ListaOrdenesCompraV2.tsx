import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { ESTADOS_OC } from '@/constants/bodegas.constant';
import { IOrdenCompra } from '@/interface/bodega.interface';
import CrearOCDeCotizacion from '@/pages/Cotizaciones/modals/CrearOCDeCotizacion';
import ApiService from '@/services/ApiService';
import { useAppDispatch, useAppSelector } from '@/store';
import { useGetOrdenesCompraPorEmpresaQuery } from '@/store/slices/bodega/ordenCompraApi';
import { detalleEmpresaThunk, listaMisClientesThunk } from '@/store/slices/empresa/empresaSlice';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { formatPrice } from '@/utils/currency';
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
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MultiValue } from 'react-select';
import { toast } from 'react-toastify';
import CrearOrdenCompra from './modals/CrearOrdenCompra';
import SubirCotizacion from './modals/SubirCotizacion';

const columnHelper = createColumnHelper<IOrdenCompra>();
const estadosPdfPermitidos = new Set(['0', '1', '2', '3', '4', '5']);

function ListaOrdenesCompraV2() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { personalizacionUsuario, listaGrupos } = useAppSelector((state) => state.auth);
    // const { listaOrdenesCompra } = useAppSelector((state) => state.bodega) // Replaced by RTK Query
    const { detalleEmpresa, listaMisClientes } = useAppSelector((state) => state.empresa);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [optionEmpresa, setOptionEmpresa] = useState<{ value: string; label: string }[]>([]);
    const [filtroEmpresa, setFiltroEmpresa] = useState<string[]>([]);
    const [filtroEstado, setFiltroEstado] = useState<string[]>([]);
    const [queryParams, setQueryParams] = useState<string>('');

    const {
        data: listaOrdenesCompra = [],
        isLoading,
        refetch,
    } = useGetOrdenesCompraPorEmpresaQuery(
        { id_empresa: personalizacionUsuario?.empresa || '', filtro: queryParams },
        { skip: !personalizacionUsuario?.empresa, refetchOnMountOrArgChange: true },
    );

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }));
            dispatch(detalleEmpresaThunk({ id_empresa: personalizacionUsuario.empresa }));
        }
    }, [personalizacionUsuario]);

    useEffect(() => {
        if (detalleEmpresa && listaMisClientes) {
            const options: { value: string; label: string }[] = [];
            options.push({ value: detalleEmpresa.id.toString(), label: detalleEmpresa.nombre });
            setOptionEmpresa(
                options.concat(
                    listaMisClientes.map((emp) => {
                        return { value: emp.cliente.toString(), label: emp.info_cliente.nombre };
                    }),
                ),
            );
        }
    }, [detalleEmpresa, listaMisClientes]);

    const handleDescargarPdf = async (ordenId: number) => {
        try {
            const response = await ApiService.fetchData<BlobPart>({
                url: `/api/ordenes-compra/${ordenId}/pdf/`,
                method: 'get',
                headers: { 'Content-Type': 'application/pdf' },
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `orden_compra_${ordenId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error) || 'No se pudo descargar la OC');
        }
    };

    const columns = [
        columnHelper.accessor('codigo', {
            cell: (info) => (
                <div className='font-bold text-gray-600 dark:text-gray-400'>{info.getValue()}</div>
            ),
            header: 'Codigo',
        }),
        columnHelper.accessor('nombre_proveedor', {
            cell: (info) => (
                <div className='font-semibold text-gray-700 dark:text-gray-300'>
                    {info.getValue()}
                </div>
            ),
            header: 'Proveedor',
        }),
        columnHelper.accessor('nombre_cliente', {
            cell: (info) => (
                <div className='font-semibold text-gray-700 dark:text-gray-300'>
                    {info.getValue()}
                </div>
            ),
            header: 'Cliente',
        }),
        columnHelper.accessor('fecha_creacion', {
            cell: (info) => (
                <div className='text-gray-500'>
                    {dayjs(info.row.original.fecha_creacion).format('DD/MM/YYYY')}
                </div>
            ),
            header: 'Fecha',
        }),
        columnHelper.display({
            id: 'total',
            cell: (info) => {
                const items = info.row.original.datos_item || [];
                const neto = items.reduce((acc, item) => acc + item.cantidad * item.precio, 0);
                const iva = neto * 0.19;
                const total = neto + iva; // Asumiendo lógica estándar, si hay exentos debería manejarse en backend idealmente, pero frontend replica lo del detalle

                return (
                    <div className='font-mono font-medium'>
                        ${formatPrice(total)} {info.row.original.tipo_moneda_label || 'CLP'}
                    </div>
                );
            },
            header: 'Total',
        }),
        columnHelper.accessor('estado_label', {
            cell: (info) => {
                const estado = info.getValue();
                let color: 'emerald' | 'amber' | 'red' | 'blue' | 'gray' = 'gray';
                const estadoLower = estado?.toLowerCase() || '';

                if (
                    estadoLower.includes('completad') ||
                    estadoLower.includes('recibida') ||
                    estadoLower.includes('aprobada')
                )
                    color = 'emerald';
                else if (estadoLower.includes('borrador') || estadoLower.includes('pendiente'))
                    color = 'amber';
                else if (estadoLower.includes('rechazad') || estadoLower.includes('anulada'))
                    color = 'red';
                else if (estadoLower.includes('enviada')) color = 'blue';

                return (
                    <Badge variant='solid' color={color} className='capitalize'>
                        {estado}
                    </Badge>
                );
            },
            header: 'Estado',
        }),
        columnHelper.display({
            id: 'acciones',
            header: 'Acciones',
            cell: (info) => (
                <div className='flex gap-2'>
                    <Tooltip text='Detalle Orden de Compra'>
                        <Button
                            variant='solid'
                            color='violet'
                            onClick={() => {
                                navigate(`/compras/detalle-orden-compra/${info.row.original.id}`);
                            }}
                            icon='HeroEye'></Button>
                    </Tooltip>
                    {estadosPdfPermitidos.has(String(info.row.original.estado)) && (
                        <Tooltip text='Ver PDF'>
                            <Button
                                variant='solid'
                                color='red'
                                icon='HeroDocumentText'
                                onClick={() => {
                                    handleDescargarPdf(info.row.original.id);
                                }}></Button>
                        </Tooltip>
                    )}
                    <SubirCotizacion
                        cotizacion={info.row.original.cotizacion}
                        nombre_cotizacion={info.row.original.nombre_cotizacion}
                        id_orden={info.row.original.id}
                    />
                    {(info.row.original.estado === '-' || info.row.original.estado === '0') && (
                        <ConfirmarEliminar
                            mensaje={`Esta Seguro que desea eliminar la orden N°${info.row.original.codigo}`}
                            peticionUrl={`/api/ordenes-compra/${info.row.original.id}/`}
                            method='DELETE'
                            onDispatch={() => {
                                refetch();
                            }}
                        />
                    )}
                </div>
            ),
        }),
    ];

    const table = useReactTable({
        data: listaOrdenesCompra,
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
        const params = new URLSearchParams();
        filtroEmpresa.forEach((id) => params.append('oc_cliente', id));
        filtroEstado.forEach((id) => params.append('estado', id));
        setQueryParams(params.toString());
    }, [filtroEmpresa, filtroEstado]);

    return (
        <PageWrapper isProtectedRoute={true} name='Ordenes de Compra' title='Ordenes de Compra'>
            <Subheader>
                <SubheaderLeft>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        anchoInput={200}
                    />
                </SubheaderLeft>
                <SubheaderRight className='w-full md:w-auto'>
                    <div className='flex w-full flex-col gap-4 md:flex-row'>
                        <div className='min-w-[200px]'>
                            <SelectReact
                                name='oc_cliente'
                                placeholder='Cliente'
                                noOptionsMessage={() => 'Sin Opciones'}
                                options={optionEmpresa}
                                isMulti={true}
                                onChange={(selectedOptions) => {
                                    const ids = (selectedOptions as MultiValue<TSelectOption>).map(
                                        (option) => option.value,
                                    );
                                    setFiltroEmpresa(ids);
                                }}
                            />
                        </div>
                        <div className='min-w-[200px]'>
                            <SelectReact
                                name='estado'
                                placeholder='Estado'
                                noOptionsMessage={() => 'Sin Opciones'}
                                options={ESTADOS_OC}
                                isMulti={true}
                                onChange={(selectedOptions) => {
                                    const ids = (selectedOptions as MultiValue<TSelectOption>).map(
                                        (option) => option.value,
                                    );
                                    setFiltroEstado(ids);
                                }}
                            />
                        </div>
                        <CrearOCDeCotizacion />
                        <CrearOrdenCompra id_empresa={personalizacionUsuario?.empresa} />
                    </div>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <Card>
                    <CardBody className='z-0'>
                        <div className='overflow-auto'>
                            <Table className='min-w-[1000px] table-fixed'>
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
                            <div className='mt-2 min-w-[1000px]'>
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    );
}

export default ListaOrdenesCompraV2;
