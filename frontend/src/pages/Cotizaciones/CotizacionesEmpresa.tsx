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
import { ESTADO_COTIZACION } from '@/constants/cotizacion.constant';
import useDescargarCotizacionPdf from '@/hooks/useDescargarCotizacionPdf';
import { ICotizacion } from '@/interface/cotizaciones.interface';
import {
    listaCotizacionesSucursalThunk,
    listaMisClientesThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { formatCurrency } from '@/utils/currency';
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
import { MouseEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MultiValue } from 'react-select';
import CopiasCotizacion from './modals/CopiasCotizacion';
import CrearCotizacion from './modals/CrearCotizacion';

const columnHelper = createColumnHelper<ICotizacion>();

const CotizacionesEmpresa = () => {
    // 1. Hooks & State
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { listaCotizaciones, loading } = useAppSelector((state) => state.cotizacion);
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaMisClientes } = useAppSelector((state) => state.empresa);

    // Custom Hooks
    const { descargarPdf, loadingPdf } = useDescargarCotizacionPdf();

    // Table State
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    // Filter State
    const [optionClientes, setOptionClientes] = useState<{ value: string; label: string }[]>([]);
    const [filtroCliente, setFiltroCliente] = useState<string[]>([]);
    const [filtroEstado, setFiltroEstado] = useState<string[]>([]);

    // Modal State
    const [copiasModalOpen, setCopiasModalOpen] = useState(false);
    const [cotizacionCopias, setCotizacionCopias] = useState<ICotizacion | null>(null);

    // 2. Effects
    useEffect(() => {
        if (personalizacionUsuario?.empresa) {
            dispatch(listaCotizacionesSucursalThunk(undefined));
            dispatch(listaMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }));
        }
    }, [personalizacionUsuario]);

    useEffect(() => {
        if (listaMisClientes.length > 0) {
            setOptionClientes(
                listaMisClientes.map((cliente) => ({
                    value: cliente.info_cliente.id.toString(),
                    label: cliente.info_cliente.nombre,
                })),
            );
        } else {
            setOptionClientes([]);
        }
    }, [listaMisClientes]);

    useEffect(() => {
        if (!personalizacionUsuario?.empresa) return;

        const params = new URLSearchParams();
        filtroCliente.forEach((id) => params.append('cliente', id));
        filtroEstado.forEach((id) => params.append('estado', id));

        dispatch(listaCotizacionesSucursalThunk({ filtro: params }));
    }, [filtroCliente, filtroEstado, personalizacionUsuario]);

    // 3. Handlers
    const handleAbrirCopias = (cotizacion: ICotizacion, event?: MouseEvent<HTMLButtonElement>) => {
        event?.stopPropagation();
        setCotizacionCopias(cotizacion);
        setCopiasModalOpen(true);
    };

    const handleDescargarClick = async (
        cotizacion: ICotizacion,
        event?: MouseEvent<HTMLButtonElement>,
    ) => {
        event?.stopPropagation();
        await descargarPdf(cotizacion);
    };

    // 4. Columns
    const columns = [
        columnHelper.accessor('numero_cotizacion', {
            cell: (info) => (
                <div className='font-bold text-zinc-600 dark:text-zinc-400'>#{info.getValue()}</div>
            ),
            header: 'N°',
        }),
        columnHelper.accessor('nombre', {
            cell: (info) => (
                <div className='font-semibold text-zinc-900 dark:text-zinc-100'>
                    {info.getValue()}
                </div>
            ),
            header: 'Nombre',
        }),
        columnHelper.accessor('cliente_nombre', {
            cell: (info) => (
                <div className='font-medium text-zinc-700 dark:text-zinc-300'>
                    {info.getValue()}
                </div>
            ),
            header: 'Cliente',
        }),
        columnHelper.accessor('fecha_facturacion', {
            cell: (info) => {
                const value = info.getValue() || info.row.original.fecha_creacion;
                return (
                    <div className='text-sm text-zinc-500 dark:text-zinc-400'>
                        {value ? dayjs(value).format('DD/MM/YYYY') : '-'}
                    </div>
                );
            },
            header: 'Fecha',
        }),
        columnHelper.accessor('total_estimado', {
            cell: (info) => {
                const row = info.row.original;
                const monto = parseFloat(info.getValue() as unknown as string);

                return (
                    <div className='font-mono font-medium text-zinc-700 dark:text-zinc-300'>
                        {formatCurrency(monto, row.tipo_moneda)}
                    </div>
                );
            },
            header: 'Total',
        }),
        columnHelper.accessor('estado_label', {
            cell: (info) => {
                const estado = info.getValue();
                let color: 'emerald' | 'red' | 'amber' | 'blue' | 'zinc' = 'zinc';
                const estadoLower = estado?.toLowerCase() || '';

                if (estadoLower.includes('aceptad')) color = 'emerald';
                else if (estadoLower.includes('rechazad')) color = 'red';
                else if (estadoLower.includes('pendiente')) color = 'amber';
                else if (estadoLower.includes('enviada')) color = 'blue';
                else if (estadoLower.includes('borrador')) color = 'zinc';

                const estadoOC = info.row.original.estado_oc_derivado;

                return (
                    <div className='flex flex-col gap-1'>
                        <Badge variant='solid' color={color} className='capitalize shadow-sm'>
                            {estado}
                        </Badge>
                        {estadoOC === 'pendiente_oc' && (
                            <Badge color='amber' variant='outline' className='text-xs'>
                                Sin OC
                            </Badge>
                        )}
                        {estadoOC === 'en_oc' && (
                            <Badge color='blue' variant='outline' className='text-xs'>
                                En OC
                            </Badge>
                        )}
                        {estadoOC === 'cerrada_comercialmente' && (
                            <Badge color='zinc' variant='outline' className='text-xs'>
                                Cerrada comercialmente
                            </Badge>
                        )}
                    </div>
                );
            },
            header: 'Estado',
        }),
        columnHelper.display({
            id: 'acciones',
            header: 'Acciones',
            cell: (info) => {
                const esAceptada = info.row.original.estado?.toLowerCase() === 'aceptada';
                const esRechazada = info.row.original.estado?.toLowerCase() === 'rechazada';
                const tieneCopias = (info.row.original.copias_count || 0) > 0;
                const isDownloading = loadingPdf === info.row.original.id;

                return (
                    <div className='flex gap-2'>
                        <Tooltip text='Ver Detalle'>
                            <Button
                                variant='solid'
                                color='violet'
                                onClick={() =>
                                    navigate(
                                        `/cotizacion/detalle-cotizacion/${info.row.original.numero_cotizacion}/`,
                                    )
                                }
                                icon='HeroEye'
                            />
                        </Tooltip>

                        {esAceptada && (
                            <Tooltip text='Descargar PDF'>
                                <Button
                                    variant='solid'
                                    color='red'
                                    icon='HeroDocumentArrowDown'
                                    isLoading={isDownloading}
                                    onClick={(event) =>
                                        handleDescargarClick(info.row.original, event)
                                    }
                                />
                            </Tooltip>
                        )}

                        {(esRechazada || tieneCopias) && (
                            <Tooltip text='Copias'>
                                <Button
                                    variant='solid'
                                    color='emerald'
                                    icon='HeroDocumentDuplicate'
                                    onClick={(event) => handleAbrirCopias(info.row.original, event)}
                                />
                            </Tooltip>
                        )}

                        {(() => {
                            const estadoLower = (info.row.original.estado || '').toLowerCase();
                            const puedeEliminar =
                                estadoLower.includes('pendiente') ||
                                estadoLower.includes('expirada');
                            return puedeEliminar ? (
                                <ConfirmarEliminar
                                    mensaje={`Está a punto de eliminar la cotización Nº${info.row.original.numero_cotizacion}. ¿Desea continuar?`}
                                    peticionUrl={`/api/cotizaciones/${info.row.original.id}/`}
                                    onDispatch={() =>
                                        dispatch(listaCotizacionesSucursalThunk(undefined))
                                    }
                                />
                            ) : null;
                        })()}
                    </div>
                );
            },
        }),
    ];

    const table = useReactTable({
        data: listaCotizaciones,
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

    // 5. Render
    return (
        <PageWrapper
            isProtectedRoute={true}
            name='Cotizaciones Clientes'
            title='Cotizaciones Clientes'>
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
                                name='cliente'
                                placeholder='Cliente'
                                noOptionsMessage={() => 'Sin Opciones'}
                                options={optionClientes}
                                isMulti={true}
                                onChange={(selectedOptions) => {
                                    const ids = (selectedOptions as MultiValue<TSelectOption>).map(
                                        (option) => option.value,
                                    );
                                    setFiltroCliente(ids);
                                }}
                            />
                        </div>
                        <div className='min-w-[200px]'>
                            <SelectReact
                                name='estado'
                                placeholder='Estado'
                                noOptionsMessage={() => 'Sin Opciones'}
                                options={ESTADO_COTIZACION}
                                isMulti={true}
                                onChange={(selectedOptions) => {
                                    const ids = (selectedOptions as MultiValue<TSelectOption>).map(
                                        (option) => option.value,
                                    );
                                    setFiltroEstado(ids);
                                }}
                            />
                        </div>
                        <CrearCotizacion empresa={true} />
                    </div>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <Card className='h-full border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'>
                    <CardBody className='z-0 overflow-auto'>
                        <Table className='min-w-[1000px] table-fixed'>
                            <THead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <Tr key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <Th
                                                key={header.id}
                                                isColumnBorder={false}
                                                className='text-left font-semibold text-zinc-500 dark:text-zinc-400'>
                                                {header.isPlaceholder ? null : (
                                                    <div
                                                        key={header.id}
                                                        aria-hidden='true'
                                                        {...{
                                                            className: header.column.getCanSort()
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
                                                                    className='text-zinc-400 ltr:ml-1.5 rtl:mr-1.5'
                                                                />
                                                            ),
                                                            desc: (
                                                                <Icon
                                                                    icon='HeroChevronDown'
                                                                    className='text-zinc-400 ltr:ml-1.5 rtl:mr-1.5'
                                                                />
                                                            ),
                                                        }[header.column.getIsSorted() as string] ??
                                                            null}
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
                    </CardBody>
                    <div className='border-t border-zinc-200 p-4 dark:border-zinc-800'>
                        <TableCardFooterTemplateV2 table={table} />
                    </div>
                </Card>
            </Container>
            <CopiasCotizacion
                cotizacion={cotizacionCopias}
                isOpen={copiasModalOpen}
                setIsOpen={setCopiasModalOpen}
            />
        </PageWrapper>
    );
};

export default CotizacionesEmpresa;
