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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import Pages from '@/config/pages.config';
import { IContratoMatching, IFacturaContrato } from '@/interface/contrato.interface';
import { IRelacionEmpresa } from '@/interface/empresas.interface';
import { useAppSelector } from '@/store';
import {
    useCreateFacturaContratoMutation,
    useGetContratosActivosClienteQuery,
    useGetFacturasContratoQuery,
    useGetProximoPeriodoFacturaQuery,
} from '@/store/slices/contratos/contratoApi';
import { useGetMisClientesQuery } from '@/store/slices/empresa/empresaApi';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import {
    buildPrefacturaContratoDetailPath,
    calculatePrefacturaMetricas,
    createPrefacturacionSearchParams,
    getPrefacturaEstadoColor,
    getPrefacturaEstadoLabel,
    IPrefacturacionRouteState,
    IPrefacturaListItemVM,
    parsePrefacturacionSearchParams,
    TPrefacturaEstado
} from './prefacturacion.shared';

const estadoOptions: TSelectOption[] = [
    { value: 'borrador', label: 'Borrador' },
    { value: 'por_facturar', label: 'Por facturar' },
    { value: 'facturado', label: 'Facturado' },
];

const columnHelper = createColumnHelper<IPrefacturaListItemVM>();

const formatDateRange = (start?: string | null, end?: string | null) => {
    if (!start || !end) {
        return '-';
    }

    return `${dayjs(start).format('DD/MM/YYYY')} -> ${dayjs(end).format('DD/MM/YYYY')}`;
};

const formatContratoTotal = (factura: IFacturaContrato) => {
    const valor = factura.monto_calculado ?? factura.monto_total;
    return formatCurrency(valor, factura.moneda);
};

const ListaPrefacturasContrato = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const [sorting, setSorting] = useState<SortingState>([]);

    const routeState = useMemo(
        () => parsePrefacturacionSearchParams(searchParams),
        [searchParams],
    );
    const { tab, estado: filtroEstado, q: globalFilter, historico: verHistorico } = routeState;

    const createContratoSearchParams = useCallback(
        (state: Partial<IPrefacturacionRouteState>) => {
            const params = createPrefacturacionSearchParams(state);
            params.delete('tab');
            return params;
        },
        [],
    );

    const updateRouteState = useCallback(
        (patch: Partial<IPrefacturacionRouteState>) => {
            const nextState: IPrefacturacionRouteState = {
                tab: 'contrato',
                estado: patch.estado ?? routeState.estado,
                q: patch.q ?? routeState.q,
                historico: patch.historico ?? routeState.historico,
            };

            const nextParams = createContratoSearchParams(nextState);
            if (nextParams.toString() !== searchParams.toString()) {
                setSearchParams(nextParams, { replace: true });
            }
        },
        [routeState, searchParams, setSearchParams, createContratoSearchParams],
    );

    useEffect(() => {
        if (tab === 'ot') {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('tab');
            const queryString = nextParams.toString();
            navigate(
                `${Pages.facturacion.subPages.prefacturasOTV3.to}${queryString ? `?${queryString}` : ''}`,
                { replace: true },
            );
            return;
        }

        const parsed = parsePrefacturacionSearchParams(searchParams);
        const normalizedParams = createContratoSearchParams(parsed);
        if (normalizedParams.toString() !== searchParams.toString()) {
            setSearchParams(normalizedParams, { replace: true });
        }
    }, [searchParams, setSearchParams, tab, navigate, createContratoSearchParams]);

    const contratoQueryParams = useMemo(() => {
        const params: { estado?: string; historico?: boolean } = {};
        if (filtroEstado.length === 1) {
            params.estado = filtroEstado[0];
        }
        if (verHistorico) {
            params.historico = true;
        }
        return Object.keys(params).length > 0 ? params : undefined;
    }, [filtroEstado, verHistorico]);

    const { data: facturasContrato = [], isLoading: isLoadingContrato } =
        useGetFacturasContratoQuery(contratoQueryParams);
    const [createFactura] = useCreateFacturaContratoMutation();

    const [modalCrear, setModalCrear] = useState(false);
    const [selectedClienteId, setSelectedClienteId] = useState<string>('');
    const [selectedContratoId, setSelectedContratoId] = useState<string>('');
    const [nuevaFactura, setNuevaFactura] = useState({
        periodo_inicio: '',
        periodo_fin: '',
        comentario: '',
    });

    const empresaId = personalizacionUsuario?.empresa;
    const { data: misClientes = [] } = useGetMisClientesQuery(empresaId ?? undefined, {
        skip: !empresaId,
    });
    const { data: contratosCliente = [] } = useGetContratosActivosClienteQuery(
        selectedClienteId ? Number(selectedClienteId) : 0,
        { skip: !selectedClienteId },
    );
    const { data: proximoPeriodo } = useGetProximoPeriodoFacturaQuery(
        selectedContratoId ? Number(selectedContratoId) : 0,
        { skip: !selectedContratoId },
    );

    useEffect(() => {
        if (proximoPeriodo) {
            setNuevaFactura((prev) => ({
                ...prev,
                periodo_inicio: proximoPeriodo.periodo_inicio,
                periodo_fin: proximoPeriodo.periodo_fin,
            }));
        }
    }, [proximoPeriodo]);

    const clienteOptions: TSelectOption[] = useMemo(
        () =>
            misClientes.map((relacion: IRelacionEmpresa) => ({
                value: String(relacion.cliente),
                label: relacion.info_cliente?.nombre || `Cliente #${relacion.cliente}`,
            })),
        [misClientes],
    );

    const contratoOptions: TSelectOption[] = useMemo(
        () =>
            contratosCliente.map((contrato: IContratoMatching) => ({
                value: String(contrato.id),
                label: `#${contrato.id} - ${contrato.nombre}`,
            })),
        [contratosCliente],
    );

    const facturasContratoFiltradas = useMemo(() => {
        if (filtroEstado.length <= 1) {
            return facturasContrato;
        }

        return facturasContrato.filter((factura) => filtroEstado.includes(factura.estado as never));
    }, [facturasContrato, filtroEstado]);

    const contratoListItems = useMemo<IPrefacturaListItemVM[]>(
        () =>
            facturasContratoFiltradas.map((factura) => ({
                id: factura.id,
                tipo: 'contrato',
                tipoLabel: 'Contrato',
                referencia: factura.nombre_contrato,
                cliente: factura.nombre_cliente,
                contexto: formatDateRange(factura.periodo_inicio, factura.periodo_fin),
                estado: factura.estado,
                estadoLabel: factura.estado_label || getPrefacturaEstadoLabel(factura.estado),
                totalLabel: formatContratoTotal(factura),
                fechaLabel: factura.fecha_emision
                    ? dayjs(factura.fecha_emision).format('DD/MM/YYYY')
                    : '-',
                otIds: [],
                detailPath: buildPrefacturaContratoDetailPath(factura.id, routeState),
            })),
        [facturasContratoFiltradas, routeState],
    );

    const currentItems = contratoListItems;
    const currentMetricas = useMemo(
        () =>
            calculatePrefacturaMetricas(currentItems, (item) => item.estado),
        [currentItems],
    );

    const columns = useMemo(
        () => [
            columnHelper.accessor('id', {
                header: '#',
                cell: (info) => <span className='font-bold'>#{info.getValue()}</span>,
                size: 70,
            }),
            columnHelper.accessor('tipoLabel', {
                header: 'Tipo',
                cell: (info) => (
                    <Badge
                        variant='outline'
                        color={info.row.original.tipo === 'contrato' ? 'violet' : 'sky'}>
                        {info.getValue()}
                    </Badge>
                ),
            }),
            columnHelper.accessor('referencia', {
                header: 'Referencia',
                cell: (info) => (
                    <div>
                        <p className='font-semibold'>{info.getValue()}</p>
                        <p className='text-xs text-zinc-500'>{info.row.original.contexto}</p>
                    </div>
                ),
            }),
            columnHelper.accessor('cliente', {
                header: 'Cliente',
                cell: (info) => info.getValue(),
            }),
            columnHelper.display({
                id: 'contexto',
                header: 'Periodo',
                cell: ({ row }) => row.original.contexto,
            }),
            columnHelper.accessor('totalLabel', {
                header: 'Total',
                cell: (info) => info.getValue(),
            }),
            columnHelper.accessor('estadoLabel', {
                header: 'Estado',
                cell: (info) => (
                    <Badge variant='outline' color={getPrefacturaEstadoColor(info.row.original.estado)}>
                        {info.getValue()}
                    </Badge>
                ),
            }),
            columnHelper.accessor('fechaLabel', {
                header: 'Fecha',
                cell: (info) => info.getValue(),
            }),
            columnHelper.display({
                id: 'acciones',
                header: 'Acciones',
                cell: ({ row }) => (
                    <Tooltip text='Ver detalle'>
                        <Button
                            size='sm'
                            variant='solid'
                            icon='HeroEye'
                            color='violet'
                            onClick={() => navigate(row.original.detailPath)}
                        />
                    </Tooltip>
                ),
            }),
        ],
        [navigate],
    );

    const table = useReactTable({
        data: currentItems,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const handleCrearContrato = async () => {
        if (!selectedContratoId || !nuevaFactura.periodo_inicio || !nuevaFactura.periodo_fin) {
            toast.error('Seleccione un contrato y verifique el periodo');
            return;
        }

        const contratoSeleccionado = contratosCliente.find(
            (contrato: IContratoMatching) => String(contrato.id) === selectedContratoId,
        );

        try {
            await createFactura({
                contrato: Number(selectedContratoId),
                empresa_cliente: contratoSeleccionado
                    ? Number(contratoSeleccionado.empresa_cliente)
                    : Number(selectedClienteId),
                empresa_prestadora: empresaId ? Number(empresaId) : undefined,
                periodo_inicio: nuevaFactura.periodo_inicio,
                periodo_fin: nuevaFactura.periodo_fin,
                comentario: nuevaFactura.comentario,
            } as Partial<IFacturaContrato>).unwrap();

            toast.success('Prefactura creada');
            setModalCrear(false);
            setSelectedClienteId('');
            setSelectedContratoId('');
            setNuevaFactura({ periodo_inicio: '', periodo_fin: '', comentario: '' });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const isLoading = isLoadingContrato;

    const renderMetricCard = (label: string, value: number, valueClassName?: string) => (
        <Card>
            <CardBody>
                <p className='text-sm text-zinc-500'>{label}</p>
                <p className={`text-2xl font-bold ${valueClassName ?? ''}`.trim()}>{value}</p>
            </CardBody>
        </Card>
    );

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <h1 className='text-xl font-bold'>Prefacturas Contratos</h1>
                </SubheaderLeft>
                <SubheaderRight>
                    <Button variant='solid' icon='HeroPlus' onClick={() => setModalCrear(true)}>
                        Nueva Prefactura Contrato
                    </Button>
                </SubheaderRight>
            </Subheader>

            <Container>
                <div className='mb-4 grid grid-cols-2 gap-4 md:grid-cols-4'>
                    {renderMetricCard('Total', currentMetricas.total)}
                    {renderMetricCard('Borrador', currentMetricas.borrador, 'text-amber-500')}
                    {renderMetricCard(
                        'Por facturar',
                        currentMetricas.por_facturar,
                        'text-blue-500',
                    )}
                    {renderMetricCard('Facturado', currentMetricas.facturado, 'text-emerald-500')}
                </div>

                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <Input
                                id='buscar'
                                name='buscar'
                                placeholder='Buscar...'
                                value={globalFilter}
                                onChange={(event) =>
                                    updateRouteState({ q: event.target.value })
                                }
                                className='w-64'
                            />
                        </CardHeaderChild>
                        <CardHeaderChild>
                            <div className='flex items-center gap-2'>
                                <SelectReact
                                    name='filtroEstado'
                                    isMulti
                                    options={estadoOptions}
                                    value={estadoOptions.filter((option) =>
                                        filtroEstado.includes(option.value as never),
                                    )}
                                    onChange={(value) =>
                                        updateRouteState({
                                            estado:
                                                (value as TSelectOption[])?.map(
                                                    (option) => option.value,
                                                ) as TPrefacturaEstado[] | undefined,
                                        })
                                    }
                                    placeholder='Filtrar estado...'
                                    className='w-64'
                                />
                                <Button
                                    variant={verHistorico ? 'solid' : 'outline'}
                                    color={verHistorico ? 'violet' : 'zinc'}
                                    icon='HeroArchiveBox'
                                    onClick={() =>
                                        updateRouteState({ historico: !verHistorico })
                                    }>
                                    Historico
                                </Button>
                            </div>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        {isLoading ? (
                            <p className='py-8 text-center text-zinc-400'>Cargando...</p>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <p className='py-8 text-center text-zinc-400'>
                                No hay prefacturas para mostrar.
                            </p>
                        ) : (
                            <Table>
                                <THead>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <Tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <Th
                                                    key={header.id}
                                                    className='cursor-pointer select-none'
                                                    onClick={header.column.getToggleSortingHandler()}>
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext(),
                                                    )}
                                                    {{
                                                        asc: ' ↑',
                                                        desc: ' ↓',
                                                    }[header.column.getIsSorted() as string] ?? ''}
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
                        )}
                    </CardBody>
                    <TableCardFooterTemplateV2 table={table as never} />
                </Card>
            </Container>

            <Modal isOpen={modalCrear} setIsOpen={setModalCrear}>
                <ModalHeader>Nueva Prefactura de Contrato</ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Label htmlFor='empresa_cliente'>Empresa Cliente *</Label>
                            <SelectReact
                                id='empresa_cliente'
                                name='empresa_cliente'
                                options={clienteOptions}
                                value={
                                    clienteOptions.find((option) => option.value === selectedClienteId) ??
                                    null
                                }
                                onChange={(value) => {
                                    const nextClienteId = (value as TSelectOption | null)?.value ?? '';
                                    setSelectedClienteId(nextClienteId);
                                    setSelectedContratoId('');
                                    setNuevaFactura((prev) => ({
                                        ...prev,
                                        periodo_inicio: '',
                                        periodo_fin: '',
                                    }));
                                }}
                                placeholder='Seleccione empresa cliente'
                            />
                        </div>

                        <div>
                            <Label htmlFor='contrato'>Contrato *</Label>
                            <SelectReact
                                id='contrato'
                                name='contrato'
                                options={contratoOptions}
                                value={
                                    contratoOptions.find((option) => option.value === selectedContratoId) ??
                                    null
                                }
                                onChange={(value) =>
                                    setSelectedContratoId(
                                        (value as TSelectOption | null)?.value ?? '',
                                    )
                                }
                                placeholder='Seleccione contrato'
                                isDisabled={!selectedClienteId}
                            />
                        </div>

                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                            <div>
                                <Label htmlFor='periodo_inicio'>Periodo Inicio *</Label>
                                <Input
                                    id='periodo_inicio'
                                    name='periodo_inicio'
                                    type='date'
                                    value={nuevaFactura.periodo_inicio}
                                    onChange={(event) =>
                                        setNuevaFactura((prev) => ({
                                            ...prev,
                                            periodo_inicio: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div>
                                <Label htmlFor='periodo_fin'>Periodo Fin *</Label>
                                <Input
                                    id='periodo_fin'
                                    name='periodo_fin'
                                    type='date'
                                    value={nuevaFactura.periodo_fin}
                                    onChange={(event) =>
                                        setNuevaFactura((prev) => ({
                                            ...prev,
                                            periodo_fin: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor='comentario'>Comentario</Label>
                            <Textarea
                                id='comentario'
                                value={nuevaFactura.comentario}
                                onChange={(event) =>
                                    setNuevaFactura((prev) => ({
                                        ...prev,
                                        comentario: event.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        onClick={() => {
                            setModalCrear(false);
                            setSelectedClienteId('');
                            setSelectedContratoId('');
                            setNuevaFactura({ periodo_inicio: '', periodo_fin: '', comentario: '' });
                        }}>
                        Cancelar
                    </Button>
                    <Button variant='solid' onClick={handleCrearContrato}>
                        Crear Prefactura
                    </Button>
                </ModalFooter>
            </Modal>
        </PageWrapper>
    );
};

export default ListaPrefacturasContrato;
