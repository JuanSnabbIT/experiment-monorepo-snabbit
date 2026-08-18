import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import Icon from '@/components/icon/Icon';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { Pages } from '@/config/pages.config';
import { COLOR_ESTADO, esContratoProximoAVencer } from '@/constants/contrato.constant';
import { IRelacionEmpresa } from '@/interface/empresas.interface';
import { IContratoTrabajador } from '@/interface/rrhh.interface';
import CrearContratoTrabajadorWizard from '@/pages/RRHH/modals/CrearContratoTrabajadorWizard';
import {
    useEnviarAvisoVencimientoContratoTrabajadorMutation,
    useGetContratosTrabajadorPorEmpresaClienteQuery,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { downloadPdfFromUrl } from '@/utils/downloadHelpers';
import { getErrorMessage } from '@/utils/errorHandlers';
import { toast } from 'react-toastify';
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
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';


type TFiltroKpi = 'vigentes' | 'en_proceso' | 'finalizados';

const columnHelper = createColumnHelper<IContratoTrabajador>();

interface ITablaContratosLaboralesClienteProps {
    detalleCliente?: IRelacionEmpresa;
}

const TablaContratosLaboralesCliente = ({ detalleCliente }: ITablaContratosLaboralesClienteProps) => {
    const navigate = useNavigate();

    const [sorting, setSorting] = useState<SortingState>([{ id: 'id', desc: true }]);
    const [inputBuscar, setInputBuscar] = useState('');
    const [globalFilter, setGlobalFilter] = useState('');
    const [filtroKpi, setFiltroKpi] = useState<TFiltroKpi | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [descargandoPlanilla, setDescargandoPlanilla] = useState(false);

    const [enviarAvisoVencimiento, { isLoading: enviandoAviso }] =
        useEnviarAvisoVencimientoContratoTrabajadorMutation();

    const [contratoAviso, setContratoAviso] = useState<IContratoTrabajador | null>(null);
    const [emailAvisoMode, setEmailAvisoMode] = useState<'rrhh' | 'custom'>('rrhh');
    const [emailAvisoCustom, setEmailAvisoCustom] = useState('');

    const emailsRrhhAviso = contratoAviso?.emails_rrhh_empresa ?? [];

    const abrirModalAviso = (contrato: IContratoTrabajador) => {
        setContratoAviso(contrato);
        setEmailAvisoMode((contrato.emails_rrhh_empresa?.length ?? 0) > 0 ? 'rrhh' : 'custom');
        setEmailAvisoCustom('');
    };

    const cerrarModalAviso = () => {
        setContratoAviso(null);
        setEmailAvisoMode('rrhh');
        setEmailAvisoCustom('');
    };

    const handleEnviarAvisoVencimiento = async () => {
        if (!contratoAviso) return;
        const emailDestino = emailAvisoMode === 'custom' ? emailAvisoCustom.trim() : undefined;
        if (emailAvisoMode === 'custom' && !emailDestino) {
            toast.error('Ingresa el correo de destino.');
            return;
        }
        if (emailAvisoMode === 'rrhh' && emailsRrhhAviso.length === 0) {
            toast.error('No hay correos RRHH registrados en esta empresa. Ingresa uno manualmente.');
            return;
        }
        try {
            await enviarAvisoVencimiento({ id: contratoAviso.id, email_destino: emailDestino }).unwrap();
            toast.success('Aviso de vencimiento enviado.');
            cerrarModalAviso();
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const handleDescargarPlanilla = async () => {
        if (!empresaClienteId) return;
        setDescargandoPlanilla(true);
        try {
            await downloadPdfFromUrl(
                `/api/rrhh/contratos-trabajador/export-planilla/?empresa_cliente=${empresaClienteId}`,
                'contratos_laborales.xlsx',
            );
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setDescargandoPlanilla(false);
        }
    };

    const handleBuscarChange = (value: string) => {
        setInputBuscar(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setGlobalFilter(value), 300);
    };

    const empresaClienteId = detalleCliente?.info_cliente?.id;

    const { data: contratos = [], isLoading } = useGetContratosTrabajadorPorEmpresaClienteQuery(
        empresaClienteId ?? '',
        { skip: !empresaClienteId },
    );

    const metricas = useMemo(() => ({
        total: contratos.length,
        vigentes: contratos.filter((c) => c.estado === 'vigente').length,
        en_proceso: contratos.filter((c) =>
            ['borrador', 'pendiente_aprobacion'].includes(c.estado),
        ).length,
        finalizados: contratos.filter((c) =>
            ['terminado', 'anulado', 'descartado'].includes(c.estado),
        ).length,
    }), [contratos]);

    const contratosFiltrados = useMemo(() => {
        let lista = contratos;

        if (filtroKpi === 'vigentes') {
            lista = lista.filter((c) => c.estado === 'vigente');
        } else if (filtroKpi === 'en_proceso') {
            lista = lista.filter((c) =>
                ['borrador', 'pendiente_aprobacion'].includes(c.estado),
            );
        } else if (filtroKpi === 'finalizados') {
            lista = lista.filter((c) =>
                ['terminado', 'anulado', 'descartado'].includes(c.estado),
            );
        }

        return lista;
    }, [contratos, filtroKpi]);

    const handleKpiClick = (kpi: TFiltroKpi) => {
        setFiltroKpi((prev) => (prev === kpi ? null : kpi));
    };

    const columns = useMemo(
        () => [
            columnHelper.accessor('id', {
                header: 'N°',
                size: 60,
                cell: (info) => (
                    <span className='font-bold text-zinc-600 dark:text-zinc-400'>
                        {info.getValue()}
                    </span>
                ),
            }),
            columnHelper.accessor('nombre_trabajador', {
                header: 'Trabajador',
                cell: (info) => (
                    <span className='font-semibold text-zinc-700 dark:text-zinc-300'>
                        {info.getValue() ?? '—'}
                    </span>
                ),
            }),
            columnHelper.accessor('rut_trabajador', {
                header: 'RUT',
                cell: (info) => <span className='text-zinc-600 dark:text-zinc-400'>{info.getValue() ?? '—'}</span>,
            }),
            columnHelper.accessor('cargo', {
                header: 'Cargo',
                cell: (info) => <span className='text-zinc-600 dark:text-zinc-400'>{info.getValue() || '—'}</span>,
            }),
            columnHelper.accessor('tipo_contrato', {
                header: 'Tipo',
                cell: (info) => (
                    <Badge variant='outline' color='blue'>
                        {info.row.original.tipo_contrato_label ?? info.getValue()}
                    </Badge>
                ),
            }),
            columnHelper.accessor('estado', {
                header: 'Estado',
                cell: (info) => (
                    <Badge
                        variant='solid'
                        color={COLOR_ESTADO[info.getValue()] ?? 'zinc'}
                        className='capitalize'>
                        {info.row.original.estado_label ?? info.getValue()}
                    </Badge>
                ),
            }),
            columnHelper.accessor('fecha_inicio', {
                header: 'Inicio',
                cell: (info) => (
                    <span className='text-zinc-500'>
                        {info.getValue() ? dayjs(info.getValue()).format('DD/MM/YYYY') : '—'}
                    </span>
                ),
            }),
            columnHelper.accessor('fecha_termino', {
                header: 'Término',
                cell: (info) => {
                    const value = info.getValue();
                    if (!value) return <span className='italic text-zinc-400'>Indefinido</span>;
                    return <span className='text-zinc-500'>{dayjs(value).format('DD/MM/YYYY')}</span>;
                },
            }),
            columnHelper.display({
                id: 'acciones',
                header: 'Acciones',
                cell: (info) => (
                    <div className='flex justify-center gap-2'>
                        <Tooltip text='Ver detalle'>
                            <Button
                                color='violet'
                                variant='solid'
                                icon='HeroEye'
                                size='sm'
                                onClick={() => {
                                    navigate(
                                        Pages.rrhh.subPages.detalleContratoTrabajador.to.replace(
                                            ':contratoId',
                                            `${info.row.original.id}`,
                                        ) + `?from=cliente&clienteId=${detalleCliente?.id}`,
                                    );
                                }}
                            />
                        </Tooltip>
                        {esContratoProximoAVencer(info.row.original) && (
                            <Tooltip
                                text={
                                    info.row.original.aviso_vencimiento_enviado
                                        ? 'Aviso de vencimiento ya enviado — reenviar'
                                        : 'Enviar aviso de vencimiento'
                                }>
                                <Button
                                    color={info.row.original.aviso_vencimiento_enviado ? 'amber' : 'blue'}
                                    variant='solid'
                                    icon='HeroEnvelope'
                                    size='sm'
                                    onClick={() => abrirModalAviso(info.row.original)}
                                />
                            </Tooltip>
                        )}
                    </div>
                ),
            }),
        ],
        [navigate],
    );

    const table = useReactTable({
        data: contratosFiltrados,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className='flex flex-col gap-4'>
            {/* ── Métricas ── */}
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                    <button type='button' className='text-left' onClick={() => setFiltroKpi(null)}>
                        <Card className={`transition-all duration-200 ${!filtroKpi ? 'ring-2 ring-blue-500' : ''}`}>
                            <CardBody className='flex items-center gap-3 py-3'>
                                <Icon icon='HeroDocumentText' size='text-2xl' className='text-blue-500' />
                                <div>
                                    <p className='text-xs text-zinc-500'>Total</p>
                                    <p className='text-xl font-bold'>{metricas.total}</p>
                                </div>
                            </CardBody>
                        </Card>
                    </button>
                    <button type='button' className='text-left' onClick={() => handleKpiClick('vigentes')}>
                        <Card className={`transition-all duration-200 ${filtroKpi === 'vigentes' ? 'ring-2 ring-emerald-500' : ''}`}>
                            <CardBody className='flex items-center gap-3 py-3'>
                                <Icon icon='HeroCheckCircle' size='text-2xl' className='text-emerald-500' />
                                <div>
                                    <p className='text-xs text-zinc-500'>Vigentes</p>
                                    <p className='text-xl font-bold'>{metricas.vigentes}</p>
                                </div>
                            </CardBody>
                        </Card>
                    </button>
                    <button type='button' className='text-left' onClick={() => handleKpiClick('en_proceso')}>
                        <Card className={`transition-all duration-200 ${filtroKpi === 'en_proceso' ? 'ring-2 ring-amber-500' : ''}`}>
                            <CardBody className='flex items-center gap-3 py-3'>
                                <Icon icon='HeroClock' size='text-2xl' className='text-amber-500' />
                                <div>
                                    <p className='text-xs text-zinc-500'>En proceso</p>
                                    <p className='text-xl font-bold'>{metricas.en_proceso}</p>
                                </div>
                            </CardBody>
                        </Card>
                    </button>
                    <button type='button' className='text-left' onClick={() => handleKpiClick('finalizados')}>
                        <Card className={`transition-all duration-200 ${filtroKpi === 'finalizados' ? 'ring-2 ring-violet-500' : ''}`}>
                            <CardBody className='flex items-center gap-3 py-3'>
                                <Icon icon='HeroArchiveBox' size='text-2xl' className='text-violet-500' />
                                <div>
                                    <p className='text-xs text-zinc-500'>Finalizados</p>
                                    <p className='text-xl font-bold'>{metricas.finalizados}</p>
                                </div>
                            </CardBody>
                        </Card>
                    </button>
            </div>

            {/* ── Tabla ── */}
            <Card>
                <CardHeader className='flex justify-between items-start'>
                    <div className='flex flex-col gap-1'>
                        <h2 className='text-xl font-semibold text-blue-600'>Contratos laborales</h2>
                        <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                            Se muestran contratos laborales asociados a la empresa cliente seleccionada.
                        </p>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Input
                            type='text'
                            value={inputBuscar}
                            onChange={(e) => handleBuscarChange(e.target.value)}
                            placeholder='Buscar nombre, RUT...'
                            name='buscarContratoLaboralCliente'
                            className='max-w-[180px]'
                        />
                        <Tooltip text='Descargar planilla de contratos vigentes, vencidos, terminados o anulados'>
                            <Button
                                variant='outline'
                                color='zinc'
                                icon='HeroArrowDownTray'
                                isLoading={descargandoPlanilla}
                                isDisable={!empresaClienteId || descargandoPlanilla}
                                onClick={handleDescargarPlanilla}>
                                Descargar planilla
                            </Button>
                        </Tooltip>
                        <Tooltip text='Crear un nuevo contrato laboral para este cliente'>
                            <Button
                                variant='solid'
                                color='blue'
                                icon='HeroPlus'
                                onClick={() => setWizardOpen(true)}>
                                Nuevo contrato laboral
                            </Button>
                        </Tooltip>
                    </div>
                </CardHeader>
                <CardBody>
                    <Table>
                        <THead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <Tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <Th key={header.id} isColumnBorder={false} className='text-left'>
                                            {header.isPlaceholder ? null : (
                                                <div
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
                            {isLoading ? (
                                <Tr>
                                    <Td colSpan={columns.length} className='text-center'>
                                        Cargando contratos laborales...
                                    </Td>
                                </Tr>
                            ) : table.getRowModel().rows.length === 0 ? (
                                <Tr>
                                    <Td colSpan={columns.length} className='text-center text-zinc-400'>
                                        {filtroKpi || globalFilter
                                            ? 'No hay contratos que coincidan con los filtros aplicados.'
                                            : 'No hay contratos laborales asociados a este cliente.'}
                                    </Td>
                                </Tr>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <Tr
                                        key={row.id}
                                        className={
                                            esContratoProximoAVencer(row.original)
                                                ? 'bg-amber-50/60 dark:bg-amber-900/15 [&>td:first-child]:border-l-4 [&>td:first-child]:border-amber-500'
                                                : undefined
                                        }>
                                        {row.getVisibleCells().map((cell) => (
                                            <Td key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </Td>
                                        ))}
                                    </Tr>
                                ))
                            )}
                        </TBody>
                    </Table>
                    <div className='mt-2'>
                        <TableCardFooterTemplateV2 table={table} />
                    </div>
                </CardBody>
            </Card>

            <CrearContratoTrabajadorWizard
                detalleCliente={detalleCliente}
                externalIsOpen={wizardOpen}
                onExternalClose={() => setWizardOpen(false)}
            />

            <Modal isOpen={!!contratoAviso} setIsOpen={(v) => { if (!v) cerrarModalAviso(); }}>
                <ModalHeader>
                    {contratoAviso?.aviso_vencimiento_enviado
                        ? 'Reenviar aviso de vencimiento'
                        : 'Enviar aviso de vencimiento'}
                </ModalHeader>
                <ModalBody>
                    <p className='mb-4 text-sm text-zinc-500 dark:text-zinc-400'>
                        Se enviará un correo avisando que el contrato de{' '}
                        <strong>{contratoAviso?.nombre_trabajador ?? 'el trabajador'}</strong> vence el{' '}
                        <strong>
                            {contratoAviso?.fecha_termino
                                ? dayjs(contratoAviso.fecha_termino).format('DD/MM/YYYY')
                                : '—'}
                        </strong>
                        .
                    </p>

                    {contratoAviso?.aviso_vencimiento_enviado && (
                        <Alert variant='outline' color='amber' icon='HeroExclamationTriangle' className='mb-4'>
                            Este aviso ya fue enviado antes — automáticamente por el sistema o
                            manualmente. Puedes reenviarlo si es necesario.
                        </Alert>
                    )}

                    <button
                        type='button'
                        disabled={emailsRrhhAviso.length === 0}
                        onClick={() => setEmailAvisoMode('rrhh')}
                        className={`mb-2 flex w-full items-start gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                            emailsRrhhAviso.length === 0
                                ? 'cursor-not-allowed border-zinc-200 opacity-50 dark:border-zinc-700'
                                : emailAvisoMode === 'rrhh'
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                  : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                        }`}>
                        <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                                emailAvisoMode === 'rrhh' && emailsRrhhAviso.length > 0
                                    ? 'border-blue-500'
                                    : 'border-zinc-400 dark:border-zinc-600'
                            }`}>
                            {emailAvisoMode === 'rrhh' && emailsRrhhAviso.length > 0 && (
                                <span className='h-2 w-2 rounded-full bg-blue-500' />
                            )}
                        </span>
                        <div className='min-w-0'>
                            <p className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                                Correos RRHH registrados
                            </p>
                            {emailsRrhhAviso.length > 0 ? (
                                <p className='mt-0.5 truncate text-xs text-blue-600 dark:text-blue-400'>
                                    {emailsRrhhAviso.join(', ')}
                                </p>
                            ) : (
                                <p className='mt-0.5 text-xs text-zinc-400'>
                                    No hay usuarios RRHH con correo registrado en esta empresa
                                </p>
                            )}
                        </div>
                    </button>

                    <button
                        type='button'
                        onClick={() => setEmailAvisoMode('custom')}
                        className={`flex w-full items-start gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                            emailAvisoMode === 'custom'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                        }`}>
                        <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                                emailAvisoMode === 'custom'
                                    ? 'border-blue-500'
                                    : 'border-zinc-400 dark:border-zinc-600'
                            }`}>
                            {emailAvisoMode === 'custom' && <span className='h-2 w-2 rounded-full bg-blue-500' />}
                        </span>
                        <p className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                            Ingresar correo manualmente
                        </p>
                    </button>

                    {emailAvisoMode === 'custom' && (
                        <div className='mt-3'>
                            <Label htmlFor='email-aviso-vencimiento'>Correo de destino</Label>
                            <Input
                                id='email-aviso-vencimiento'
                                name='email-aviso-vencimiento'
                                type='email'
                                placeholder='correo@empresa.com'
                                value={emailAvisoCustom}
                                onChange={(e) => setEmailAvisoCustom(e.target.value)}
                            />
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button onClick={cerrarModalAviso}>Cancelar</Button>
                    <Button
                        variant='solid'
                        color='blue'
                        icon='HeroEnvelope'
                        isDisable={enviandoAviso}
                        onClick={handleEnviarAvisoVencimiento}>
                        {enviandoAviso
                            ? 'Enviando...'
                            : contratoAviso?.aviso_vencimiento_enviado
                              ? 'Reenviar'
                              : 'Enviar'}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default TablaContratosLaboralesCliente;
