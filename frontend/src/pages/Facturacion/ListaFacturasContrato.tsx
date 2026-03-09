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
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';

import { IFacturaContrato } from '@/interface/contrato.interface';
import { useAppSelector } from '@/store';
import {
  useAsociarDocumentoFacturaMutation,
  useCreateFacturaContratoMutation,
  useDeleteFacturaContratoMutation,
  useFinalizarFacturaContratoMutation,
  useGetFacturasContratoQuery,
  useGetResumenFacturasContratoQuery,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';

// ── Helpers ───────────────────────────────────────────────────

const colorEstado = (estado: string) => {
    const map: Record<string, 'amber' | 'blue' | 'emerald' | 'zinc'> = {
        borrador: 'amber',
        por_facturar: 'blue',
        facturado: 'emerald',
    };
    return map[estado] ?? 'zinc';
};

const estadoOptions: TSelectOption[] = [
    { value: 'borrador', label: 'Borrador' },
    { value: 'por_facturar', label: 'Por facturar' },
    { value: 'facturado', label: 'Facturado' },
];

const columnHelper = createColumnHelper<IFacturaContrato>();

// ── Componente ────────────────────────────────────────────────

const ListaFacturasContrato = () => {
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);

    // ── Filtros ───────────────────────────────────────────────
    const [filtroEstado, setFiltroEstado] = useState<string[]>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [verHistorico, setVerHistorico] = useState(false);

    // ── Modal crear factura ───────────────────────────────────
    const [modalCrear, setModalCrear] = useState(false);
    const [nuevaFactura, setNuevaFactura] = useState({
        contrato: '',
        empresa_cliente: '',
        periodo_inicio: '',
        periodo_fin: '',
        comentario: '',
    });

    // ── RTK Query ─────────────────────────────────────────────
    const queryParams = useMemo(() => {
        const params: { estado?: string; historico?: boolean } = {};
        if (filtroEstado.length === 1) params.estado = filtroEstado[0];
        if (verHistorico) params.historico = true;
        return params;
    }, [filtroEstado, verHistorico]);

    const { data: facturas = [], isLoading } = useGetFacturasContratoQuery(queryParams);
    const { data: resumen = [] } = useGetResumenFacturasContratoQuery();
    const [createFactura] = useCreateFacturaContratoMutation();
    const [finalizarFactura] = useFinalizarFacturaContratoMutation();
    const [asociarDocumento] = useAsociarDocumentoFacturaMutation();
    const [deleteFactura] = useDeleteFacturaContratoMutation();

    // ── Modal subir documento ───────────────────────────────────
    const [modalDocumento, setModalDocumento] = useState(false);
    const [facturaDocumentoId, setFacturaDocumentoId] = useState<number | null>(null);
    const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);

    // ── Datos filtrados ───────────────────────────────────────
    const facturasFiltradas = useMemo(() => {
        if (filtroEstado.length === 0 || filtroEstado.length === 1) return facturas;
        return facturas.filter((f) => filtroEstado.includes(f.estado));
    }, [facturas, filtroEstado]);

    // ── Métricas ──────────────────────────────────────────────
    const metricas = useMemo(() => {
        const m = { total: 0, borrador: 0, por_facturar: 0, facturado: 0 };
        for (const r of resumen) {
            m.total += r.cantidad;
            if (r.estado in m) {
                (m as Record<string, number>)[r.estado] = r.cantidad;
            }
        }
        return m;
    }, [resumen]);

    // ── Columnas tabla ────────────────────────────────────────
    const columns = useMemo(
        () => [
            columnHelper.accessor('id', {
                header: '#',
                cell: (info) => info.getValue(),
                size: 60,
            }),
            columnHelper.accessor('nombre_contrato', {
                header: 'Contrato',
                cell: (info) => info.getValue(),
            }),
            columnHelper.accessor('nombre_cliente', {
                header: 'Cliente',
                cell: (info) => info.getValue(),
            }),
            columnHelper.accessor('periodo_inicio', {
                header: 'Período',
                cell: (info) => {
                    const row = info.row.original;
                    return `${dayjs(row.periodo_inicio).format('DD/MM/YYYY')} → ${dayjs(row.periodo_fin).format('DD/MM/YYYY')}`;
                },
            }),
            columnHelper.accessor('monto_total', {
                header: 'Monto',
                cell: (info) => {
                    const val = Number(info.getValue());
                    const moneda = info.row.original.moneda_label || 'CLP';
                    return `${moneda} ${val.toLocaleString('es-CL')}`;
                },
            }),
            columnHelper.accessor('estado', {
                header: 'Estado',
                cell: (info) => (
                    <Badge color={colorEstado(info.getValue())}>
                        {info.row.original.estado_label}
                    </Badge>
                ),
            }),
            columnHelper.accessor('fecha_emision', {
                header: 'Emisión',
                cell: (info) =>
                    info.getValue() ? dayjs(info.getValue()).format('DD/MM/YYYY') : '-',
            }),
            columnHelper.display({
                id: 'acciones',
                header: 'Acciones',
                cell: ({ row }) => {
                    const f = row.original;
                    return (
                        <div className='flex gap-1'>
                            {f.estado === 'borrador' && (
                                <Tooltip text='Marcar como Por facturar'>
                                    <Button
                                        size='sm'
                                        icon='HeroArrowRight'
                                        color='blue'
                                        onClick={() => handleFinalizar(f.id)}
                                    />
                                </Tooltip>
                            )}
                            {f.estado === 'por_facturar' && (
                                <Tooltip text='Adjuntar documento (marca como Facturado)'>
                                    <Button
                                        size='sm'
                                        icon='HeroDocumentArrowUp'
                                        color='emerald'
                                        onClick={() => {
                                            setFacturaDocumentoId(f.id);
                                            setArchivoSeleccionado(null);
                                            setModalDocumento(true);
                                        }}
                                    />
                                </Tooltip>
                            )}
                            {f.estado === 'facturado' && f.documento_factura && (
                                <Tooltip text='Reemplazar documento'>
                                    <Button
                                        size='sm'
                                        icon='HeroArrowPath'
                                        color='zinc'
                                        onClick={() => {
                                            setFacturaDocumentoId(f.id);
                                            setArchivoSeleccionado(null);
                                            setModalDocumento(true);
                                        }}
                                    />
                                </Tooltip>
                            )}
                            {f.estado === 'borrador' && (
                                <Tooltip text='Eliminar'>
                                    <Button
                                        size='sm'
                                        icon='HeroTrash'
                                        color='red'
                                        onClick={() => handleEliminar(f.id)}
                                    />
                                </Tooltip>
                            )}
                        </div>
                    );
                },
            }),
        ],
        [],
    );

    const table = useReactTable({
        data: facturasFiltradas,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    // ── Handlers ──────────────────────────────────────────────
    const handleFinalizar = async (id: number) => {
        try {
            await finalizarFactura(id).unwrap();
            toast.success('Factura marcada como "Por facturar"');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleSubirDocumento = async () => {
        if (!facturaDocumentoId || !archivoSeleccionado) {
            toast.error('Selecciona un archivo antes de continuar');
            return;
        }
        try {
            await asociarDocumento({
                id: facturaDocumentoId,
                documento: archivoSeleccionado,
            }).unwrap();
            toast.success('Documento adjuntado. Prefactura marcada como Facturada.');
            setModalDocumento(false);
            setArchivoSeleccionado(null);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleEliminar = async (id: number) => {
        try {
            await deleteFactura(id).unwrap();
            toast.success('Factura eliminada');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleCrear = async () => {
        if (!nuevaFactura.contrato || !nuevaFactura.periodo_inicio || !nuevaFactura.periodo_fin) {
            toast.error('Complete los campos obligatorios');
            return;
        }
        try {
            await createFactura({
                contrato: Number(nuevaFactura.contrato),
                empresa_cliente: Number(nuevaFactura.empresa_cliente),
                empresa_prestadora: personalizacionUsuario?.empresa
                    ? Number(personalizacionUsuario.empresa)
                    : undefined,
                periodo_inicio: nuevaFactura.periodo_inicio,
                periodo_fin: nuevaFactura.periodo_fin,
                comentario: nuevaFactura.comentario,
            } as Partial<IFacturaContrato>).unwrap();
            toast.success('Prefactura creada');
            setModalCrear(false);
            setNuevaFactura({
                contrato: '',
                empresa_cliente: '',
                periodo_inicio: '',
                periodo_fin: '',
                comentario: '',
            });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    // ── Render ─────────────────────────────────────────────────

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <Button onClick={() => navigate(-1)} icon='HeroArrowLeft'>
                        Volver
                    </Button>
                    <h1 className='text-xl font-bold'>Facturas de Contrato</h1>
                </SubheaderLeft>
                <SubheaderRight>
                    <Button
                        variant='solid'
                        icon='HeroPlus'
                        onClick={() => setModalCrear(true)}>
                        Nueva Prefactura
                    </Button>
                </SubheaderRight>
            </Subheader>

            <Container>
                {/* Métricas */}
                <div className='mb-4 grid grid-cols-2 gap-4 md:grid-cols-4'>
                    <Card>
                        <CardBody>
                            <p className='text-sm text-zinc-500'>Total</p>
                            <p className='text-2xl font-bold'>{metricas.total}</p>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody>
                            <p className='text-sm text-zinc-500'>Borrador</p>
                            <p className='text-2xl font-bold text-amber-500'>
                                {metricas.borrador}
                            </p>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody>
                            <p className='text-sm text-zinc-500'>Por facturar</p>
                            <p className='text-2xl font-bold text-blue-500'>
                                {metricas.por_facturar}
                            </p>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody>
                            <p className='text-sm text-zinc-500'>Facturado</p>
                            <p className='text-2xl font-bold text-emerald-500'>
                                {metricas.facturado}
                            </p>
                        </CardBody>
                    </Card>

                </div>

                {/* Filtros + tabla */}
                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <Input
                                id='buscar'
                                name='buscar'
                                placeholder='Buscar...'
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                className='w-64'
                            />
                        </CardHeaderChild>
                        <CardHeaderChild>
                            <div className='flex items-center gap-2'>
                                <SelectReact
                                    name='filtroEstado'
                                    isMulti
                                    options={estadoOptions}
                                    value={estadoOptions.filter((o) =>
                                        filtroEstado.includes(o.value),
                                    )}
                                    onChange={(v) =>
                                        setFiltroEstado(
                                            (v as TSelectOption[])?.map((o) => o.value) ?? [],
                                        )
                                    }
                                    placeholder='Filtrar estado...'
                                    className='w-64'
                                />
                                <Button
                                    variant={verHistorico ? 'solid' : 'outline'}
                                    color={verHistorico ? 'violet' : 'zinc'}
                                    icon='HeroArchiveBox'
                                    onClick={() => setVerHistorico(!verHistorico)}>
                                    Histórico
                                </Button>
                            </div>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        {isLoading ? (
                            <p className='py-8 text-center text-zinc-400'>Cargando...</p>
                        ) : facturasFiltradas.length === 0 ? (
                            <p className='py-8 text-center text-zinc-400'>
                                No hay facturas de contrato para mostrar.
                            </p>
                        ) : (
                            <Table>
                                <THead>
                                    {table.getHeaderGroups().map((hg) => (
                                        <Tr key={hg.id}>
                                            {hg.headers.map((h) => (
                                                <Th
                                                    key={h.id}
                                                    className='cursor-pointer select-none'
                                                    onClick={h.column.getToggleSortingHandler()}>
                                                    {flexRender(
                                                        h.column.columnDef.header,
                                                        h.getContext(),
                                                    )}
                                                    {{
                                                        asc: ' ↑',
                                                        desc: ' ↓',
                                                    }[h.column.getIsSorted() as string] ?? ''}
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
                    <TableCardFooterTemplateV2 table={table} />
                </Card>
            </Container>

            {/* Modal subir documento de factura */}
            <Modal isOpen={modalDocumento} setIsOpen={setModalDocumento}>
                <ModalHeader>Adjuntar Documento de Factura</ModalHeader>
                <ModalBody>
                    <p className='mb-3 text-sm text-zinc-400'>
                        Selecciona el archivo de factura emitido externamente. Al confirmar, la
                        prefactura pasará automáticamente al estado <strong>Facturado</strong>.
                    </p>
                    <input
                        type='file'
                        accept='.pdf,.xml,.jpg,.jpeg,.png'
                        onChange={(e) => setArchivoSeleccionado(e.target.files?.[0] ?? null)}
                        className='block w-full text-sm'
                    />
                    {archivoSeleccionado && (
                        <p className='mt-2 text-xs text-emerald-500'>
                            Archivo seleccionado: {archivoSeleccionado.name}
                        </p>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        onClick={() => {
                            setModalDocumento(false);
                            setArchivoSeleccionado(null);
                        }}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        color='emerald'
                        isDisable={!archivoSeleccionado}
                        onClick={handleSubirDocumento}>
                        Confirmar y Facturar
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal crear prefactura */}
            <Modal isOpen={modalCrear} setIsOpen={setModalCrear}>
                <ModalHeader>Nueva Prefactura de Contrato</ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Label htmlFor='contrato'>ID Contrato *</Label>
                            <Input
                                id='contrato'
                                name='contrato'
                                type='number'
                                value={nuevaFactura.contrato}
                                onChange={(e) =>
                                    setNuevaFactura({ ...nuevaFactura, contrato: e.target.value })
                                }
                            />
                        </div>
                        <div>
                            <Label htmlFor='empresa_cliente'>ID Empresa Cliente *</Label>
                            <Input
                                id='empresa_cliente'
                                name='empresa_cliente'
                                type='number'
                                value={nuevaFactura.empresa_cliente}
                                onChange={(e) =>
                                    setNuevaFactura({
                                        ...nuevaFactura,
                                        empresa_cliente: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className='grid grid-cols-2 gap-4'>
                            <div>
                                <Label htmlFor='periodo_inicio'>Período inicio *</Label>
                                <Input
                                    id='periodo_inicio'
                                    name='periodo_inicio'
                                    type='date'
                                    value={nuevaFactura.periodo_inicio}
                                    onChange={(e) =>
                                        setNuevaFactura({
                                            ...nuevaFactura,
                                            periodo_inicio: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <Label htmlFor='periodo_fin'>Período fin *</Label>
                                <Input
                                    id='periodo_fin'
                                    name='periodo_fin'
                                    type='date'
                                    value={nuevaFactura.periodo_fin}
                                    onChange={(e) =>
                                        setNuevaFactura({
                                            ...nuevaFactura,
                                            periodo_fin: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor='comentario'>Comentario</Label>
                            <Textarea
                                id='comentario'
                                name='comentario'
                                value={nuevaFactura.comentario}
                                onChange={(e) =>
                                    setNuevaFactura({
                                        ...nuevaFactura,
                                        comentario: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={() => setModalCrear(false)}>Cancelar</Button>
                    <Button variant='solid' onClick={handleCrear}>
                        Crear Prefactura
                    </Button>
                </ModalFooter>
            </Modal>
        </PageWrapper>
    );
};

export default ListaFacturasContrato;
