import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import Container from '@/components/layouts/Container/Container';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { COLOR_ESTADO_FINIQUITO } from '@/constants/contrato.constant';
import type { IConceptoFiniquito, IContratoTrabajador, IFiniquitoContrato } from '@/interface/rrhh.interface';
import { downloadPdfFromUrl } from '@/utils/downloadHelpers';
import {
    useActualizarConceptosMutation,
    useAprobarFiniquitoMutation,
    useCalcularFiniquitoMutation,
    useEliminarFiniquitoMutation,
    useGenerarPdfFiniquitoMutation,
    useGetFiniquitoPorContratoQuery,
    useMarcarPagadoFiniquitoMutation,
    useRegenerarPdfFiniquitoMutation,
} from '@/store/slices/rrhh/finiquitoApi';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

interface IProps {
    contrato: IContratoTrabajador;
}

// --- Sub-componente: campo read-only ---
const Campo = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div>
        <p className='text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
            {label}
        </p>
        <p className='mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-100'>{value ?? '—'}</p>
    </div>
);

// --- Sub-componente: campo tipo input (read-only) ---
const CampoBox = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div>
        <p className='mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
            {label}
        </p>
        <div className='rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'>
            {value ?? '—'}
        </div>
    </div>
);

// --- Sub-componente: contexto de terminación ---
const ResumenTerminacion = ({ contrato }: { contrato: IContratoTrabajador }) => (
    <div className='rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900'>
        <p className='mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
            Datos de terminación
        </p>
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
            <Campo label='Motivo' value={contrato.motivo_termino_label ?? contrato.motivo_termino} />
            <Campo
                label='Fecha real de término'
                value={
                    contrato.fecha_termino_real
                        ? dayjs(contrato.fecha_termino_real).format('DD-MM-YYYY')
                        : '—'
                }
            />
            {contrato.observaciones_termino && (
                <div className='col-span-2 sm:col-span-3'>
                    <Campo label='Observaciones' value={contrato.observaciones_termino} />
                </div>
            )}
        </div>
    </div>
);

// --- Sub-componente: fila de concepto ---
interface IFilaProps {
    concepto: IConceptoFiniquito;
    editable: boolean;
    moneda: string;
    onSave: (updated: IConceptoFiniquito) => void;
    onDelete: () => void;
}

const FilaConcepto = ({ concepto, editable, moneda, onSave, onDelete }: IFilaProps) => {
    const [editando, setEditando] = useState(false);
    const [nombre, setNombre] = useState(concepto.nombre);
    const [detalle, setDetalle] = useState(concepto.detalle);
    const [monto, setMonto] = useState(String(concepto.monto));

    const handleSave = () => {
        onSave({ ...concepto, nombre, detalle, monto: parseFloat(monto) || 0 });
        setEditando(false);
    };

    const handleCancel = () => {
        setNombre(concepto.nombre);
        setDetalle(concepto.detalle);
        setMonto(String(concepto.monto));
        setEditando(false);
    };

    if (editando) {
        return (
            <Tr>
                <Td>
                    <Input
                        id={`concepto-nombre-${concepto.id}`}
                        name='nombre'
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                    />
                </Td>
                <Td>
                    <Input
                        id={`concepto-detalle-${concepto.id}`}
                        name='detalle'
                        value={detalle}
                        onChange={(e) => setDetalle(e.target.value)}
                    />
                </Td>
                <Td>
                    <Input
                        id={`concepto-monto-${concepto.id}`}
                        name='monto'
                        type='number'
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                    />
                </Td>
                <Td>
                    <div className='flex gap-1'>
                        <Button size='xs' variant='solid' color='emerald' onClick={handleSave}>
                            Guardar
                        </Button>
                        <Button size='xs' variant='outline' color='zinc' onClick={handleCancel}>
                            Cancelar
                        </Button>
                    </div>
                </Td>
            </Tr>
        );
    }

    return (
        <Tr>
            <Td className='font-medium text-zinc-800 dark:text-zinc-100'>
                {concepto.nombre || (
                    <span className='italic text-zinc-400 dark:text-zinc-600'>Sin nombre</span>
                )}
            </Td>
            <Td className='text-zinc-500 dark:text-zinc-400'>{concepto.detalle}</Td>
            <Td className='text-right font-mono text-sm'>
                {formatCurrency(Number(concepto.monto), moneda)}
            </Td>
            {editable && (
                <Td>
                    <div className='flex gap-1'>
                        <Button size='xs' variant='outline' color='zinc' icon='HeroPencil' onClick={() => setEditando(true)} />
                        <Button size='xs' variant='outline' color='red' icon='HeroTrash' onClick={onDelete} />
                    </div>
                </Td>
            )}
        </Tr>
    );
};

// --- Sub-componente: totales ---
const Totales = ({ finiquito, moneda }: { finiquito: IFiniquitoContrato; moneda: string }) => (
    <div className='flex justify-end'>
        <div className='rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900 min-w-48'>
            <div className='space-y-1 text-sm'>
                <div className='flex justify-between gap-8 text-zinc-500 dark:text-zinc-400'>
                    <span>Total bruto</span>
                    <span className='font-mono'>
                        {formatCurrency(Number(finiquito.total_bruto), moneda)}
                    </span>
                </div>
                {Number(finiquito.total_descuentos) > 0 && (
                    <div className='flex justify-between gap-8 text-red-500'>
                        <span>Descuentos</span>
                        <span className='font-mono'>
                            -{formatCurrency(Number(finiquito.total_descuentos), moneda)}
                        </span>
                    </div>
                )}
                <div className='flex justify-between gap-8 border-t border-zinc-200 pt-1 dark:border-zinc-700'>
                    <span className='font-semibold text-zinc-800 dark:text-zinc-100'>Total neto</span>
                    <span className='text-base font-bold font-mono text-zinc-800 dark:text-zinc-100'>
                        {formatCurrency(Number(finiquito.total_neto), moneda)}
                    </span>
                </div>
            </div>
        </div>
    </div>
);

// --- Componente principal ---
const TabFiniquitoTrabajador = ({ contrato }: IProps) => {
    const esAnulado = contrato.estado === 'anulado';
    const esTerminado = contrato.estado === 'terminado';

    const { data: finiquito, isLoading } = useGetFiniquitoPorContratoQuery(contrato.id, {
        skip: !esTerminado,
    });

    const [calcular, { isLoading: calculando }] = useCalcularFiniquitoMutation();
    const [actualizarConceptos] = useActualizarConceptosMutation();
    const [eliminar, { isLoading: eliminando }] = useEliminarFiniquitoMutation();
    const [generarPdf, { isLoading: generandoPdf }] = useGenerarPdfFiniquitoMutation();
    const [regenerarPdf, { isLoading: regenerando }] = useRegenerarPdfFiniquitoMutation();
    const [aprobar, { isLoading: aprobando }] = useAprobarFiniquitoMutation();
    const [marcarPagado, { isLoading: pagando }] = useMarcarPagadoFiniquitoMutation();

    const diasTomadosSistema = Math.round(
        contrato.antiguedad_trabajador?.dias_vacaciones_tomados ?? 0,
    );
    const sueldoSistema = Math.round(
        parseFloat(contrato.sueldo || '0') +
        parseFloat(contrato.bono_movilizacion || '0') +
        parseFloat(contrato.bono_colacion || '0'),
    );

    const [filaNueva, setFilaNueva] = useState(false);
    const [diasTomados, setDiasTomados] = useState(diasTomadosSistema);
    const [avisoPrevio, setAvisoPrevio] = useState(true);
    const [editandoDiasTomados, setEditandoDiasTomados] = useState(false);
    const [sueldoPersonalizado, setSueldoPersonalizado] = useState(sueldoSistema);
    const [editandoSueldo, setEditandoSueldo] = useState(false);
    const [fechaTerminoEditada, setFechaTerminoEditada] = useState(
        contrato.fecha_termino_real ?? '',
    );
    const [editandoFechaTermino, setEditandoFechaTermino] = useState(false);
    const [modalAprobacionOpen, setModalAprobacionOpen] = useState(false);
    const [fechaAprobacion, setFechaAprobacion] = useState(dayjs().format('YYYY-MM-DD'));
    const [archivoFirmado, setArchivoFirmado] = useState<File | null>(null);

    // Causales que generan aviso previo (Art. 162 CT)
    const mostrarAvisoPrevio = ['necesidades_empresa', 'desahucio_empleador'].includes(
        contrato.motivo_termino ?? '',
    );

    // --- Computaciones compartidas (usadas en calculadora y en vista con finiquito) ---

    const fmtCLP = (n: number) => formatCurrency(n, contrato.moneda);

    const sueldoBase = sueldoPersonalizado;
    const sueldoBase_num = parseFloat(contrato.sueldo || '0');
    const bonoMov_num = parseFloat(contrato.bono_movilizacion || '0');
    const bonoCola_num = parseFloat(contrato.bono_colacion || '0');

    const fechaInicio = contrato.fecha_inicio ? dayjs(contrato.fecha_inicio) : null;
    const fechaTermino = fechaTerminoEditada ? dayjs(fechaTerminoEditada) : null;
    const diasCorridos =
        fechaInicio && fechaTermino && fechaTermino.isValid() && fechaInicio.isValid()
            ? fechaTermino.diff(fechaInicio, 'day')
            : 0;
    const diaMesTermino = fechaTermino?.isValid() ? fechaTermino.date() : 0;
    const diasHabilesAcumulados = Math.round((diasCorridos * 15) / 365);
    const diasAPagar = Math.max(0, diasHabilesAcumulados - diasTomados);

    const anosCompletos =
        contrato.antiguedad_trabajador?.años ?? Math.floor(diasCorridos / 365);
    const mesesIndemnizacion = Math.min(anosCompletos, 11);
    const motivo = contrato.motivo_termino ?? '';
    const CAUSALES_INDEMNIZACION = ['necesidades_empresa', 'desahucio_empleador', 'despido_injustificado'];
    const CAUSALES_AVISO = ['necesidades_empresa', 'desahucio_empleador'];

    const estimadoSueldoProp =
        sueldoBase > 0 && diaMesTermino > 0 ? Math.round((sueldoBase / 30) * diaMesTermino) : 0;
    const estimadoVacaciones =
        sueldoBase > 0 && diasAPagar > 0 ? Math.round((sueldoBase / 30) * diasAPagar) : 0;
    const estimadoIndemnizacion =
        CAUSALES_INDEMNIZACION.includes(motivo) && sueldoBase > 0 && anosCompletos >= 1
            ? Math.round(sueldoBase * mesesIndemnizacion)
            : 0;
    const estimadoAvisoPrevio =
        CAUSALES_AVISO.includes(motivo) && !avisoPrevio && sueldoBase > 0
            ? Math.round(sueldoBase)
            : 0;
    const estimadoRecargo =
        motivo === 'despido_injustificado' && estimadoIndemnizacion > 0
            ? Math.round(estimadoIndemnizacion * 0.3)
            : 0;
    const estimadoTotal =
        estimadoSueldoProp + estimadoVacaciones + estimadoIndemnizacion + estimadoAvisoPrevio + estimadoRecargo;

    // --- Handlers del calculador ---

    const handleEditarFechaTermino = async () => {
        const fechaOriginal = contrato.fecha_termino_real
            ? dayjs(contrato.fecha_termino_real).format('DD-MM-YYYY')
            : '—';
        const resultado = await Swal.fire({
            title: 'Editar fecha real de término',
            html: `La fecha registrada en el contrato es <strong>${fechaOriginal}</strong>.<br><br>Modificar esta fecha cambiará el cálculo de días trabajados y vacaciones proporcionales.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, editar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#f59e0b',
        });
        if (resultado.isConfirmed) setEditandoFechaTermino(true);
    };

    const handleEditarSueldo = async () => {
        const resultado = await Swal.fire({
            title: 'Editar remuneración íntegra mensual',
            html: `El sistema obtuvo <strong>${fmtCLP(sueldoSistema)}</strong> desde el contrato (sueldo + bono movilización + bono colación).<br><br>Modifica solo si los datos del contrato no reflejan la remuneración real del mes.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, editar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#f59e0b',
        });
        if (resultado.isConfirmed) setEditandoSueldo(true);
    };

    const handleEditarDiasTomados = async () => {
        const resultado = await Swal.fire({
            title: 'Editar días de vacaciones tomados',
            html: `El sistema detectó <strong>${diasTomadosSistema} día${diasTomadosSistema !== 1 ? 's' : ''}</strong> de vacaciones basándose en solicitudes aprobadas.<br><br>Modificar este valor cambiará el cálculo de vacaciones proporcionales en el finiquito.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, editar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#f59e0b',
        });
        if (resultado.isConfirmed) setEditandoDiasTomados(true);
    };

    const handleRecalcular = async () => {
        if (!finiquito) return;
        const resultado = await Swal.fire({
            title: 'Recalcular finiquito',
            html: 'Se eliminarán los conceptos actuales y podrás ajustar los parámetros antes de calcular nuevamente.<br><br>Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, recalcular',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
        });
        if (resultado.isConfirmed) {
            try {
                await eliminar({ id: finiquito.id, contratoId: contrato.id }).unwrap();
                toast.success('Finiquito eliminado. Ajusta los parámetros y calcula nuevamente.');
            } catch (err) {
                toast.error(getErrorMessage(err));
            }
        }
    };

    // --- CampoEditable (calculador interactivo) ---
    const CampoEditable = ({
        label,
        displayValue,
        editando,
        onEditar,
        children,
    }: {
        label: string;
        displayValue: string;
        editando: boolean;
        onEditar: () => void;
        children: React.ReactNode;
    }) => (
        <div>
            <p className='text-xs text-zinc-400 dark:text-zinc-500'>{label}</p>
            {editando ? (
                children
            ) : (
                <div className='mt-0.5 flex items-center gap-2'>
                    <p className='font-medium text-zinc-800 dark:text-zinc-100'>{displayValue}</p>
                    <Button size='xs' variant='default' color='blue' icon='HeroPencil' onClick={onEditar} />
                </div>
            )}
        </div>
    );

    // --- Contrato anulado: sin finiquito ---
    if (esAnulado) {
        return (
            <Container className='py-4'>
                <Card>
                    <CardBody>
                        <Alert
                            variant='outline'
                            color='amber'
                            icon='HeroExclamationTriangle'>
                            Los contratos anulados no generan finiquito. Si este contrato fue
                            terminado por error, corrija el estado desde el historial del contrato.
                        </Alert>
                    </CardBody>
                </Card>
            </Container>
        );
    }

    // --- Loading ---
    if (isLoading) {
        return (
            <Container className='py-4'>
                <Card>
                    <CardBody>
                        <p className='text-sm text-zinc-500'>Cargando finiquito...</p>
                    </CardBody>
                </Card>
            </Container>
        );
    }

    // --- Estados derivados del finiquito ---
    const esBorrador = finiquito?.estado === 'borrador';
    const esCalculado = finiquito?.estado === 'calculado';
    const esFirmado = finiquito?.estado === 'firmado';

    const handleGuardarConcepto = async (index: number, updated: IConceptoFiniquito) => {
        if (!finiquito) return;
        const nuevos = [...finiquito.conceptos];
        nuevos[index] = updated;
        try {
            await actualizarConceptos({ id: finiquito.id, conceptos: nuevos }).unwrap();
            toast.success('Concepto actualizado.');
        } catch (err) { toast.error(getErrorMessage(err)); }
    };

    const handleEliminarConcepto = async (index: number) => {
        if (!finiquito) return;
        const nuevos = finiquito.conceptos.filter((_, i) => i !== index);
        try {
            await actualizarConceptos({ id: finiquito.id, conceptos: nuevos }).unwrap();
            toast.success('Concepto eliminado.');
        } catch (err) { toast.error(getErrorMessage(err)); }
    };

    const handleAgregarConcepto = async (nuevo: IConceptoFiniquito) => {
        if (!finiquito) return;
        const nuevos = [...finiquito.conceptos, nuevo];
        try {
            await actualizarConceptos({ id: finiquito.id, conceptos: nuevos }).unwrap();
            setFilaNueva(false);
            toast.success('Concepto agregado.');
        } catch (err) { toast.error(getErrorMessage(err)); }
    };

    const handleAprobar = async () => {
        if (!finiquito) return;
        try {
            await aprobar({
                id: finiquito.id,
                fecha_firma: fechaAprobacion,
                ...(archivoFirmado ? { archivo_firmado: archivoFirmado } : {}),
            }).unwrap();
            toast.success('Finiquito aprobado correctamente.');
            setModalAprobacionOpen(false);
            setArchivoFirmado(null);
        } catch (err) { toast.error(getErrorMessage(err)); }
    };

    const handleDescargarPdfFiniquito = async () => {
        if (!finiquito?.archivo_pdf) return;
        try {
            await downloadPdfFromUrl(finiquito.archivo_pdf, `finiquito_${finiquito.contrato}.pdf`);
        } catch (err) { toast.error(getErrorMessage(err)); }
    };

    // --- Return unificado ---
    return (
        <Container className='py-4'>
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>

                {/* IZQUIERDA: Variables del cálculo */}
                <Card>
                    <CardHeader>
                        <span className='font-semibold'>Variables del cálculo</span>
                    </CardHeader>
                    <CardBody className='divide-y divide-zinc-100 dark:divide-zinc-800 p-0'>

                        {/* Causal de término — siempre read-only */}
                        <div className='px-5 py-4'>
                            <p className='mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                                Causal de término
                            </p>
                            <p className='text-sm font-medium text-zinc-800 dark:text-zinc-100'>
                                {contrato.motivo_termino_label ?? '—'}
                            </p>
                            <p className='mt-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
                                Determina si aplica indemnización, aviso previo y recargo.
                            </p>
                        </div>

                        {/* Período laboral */}
                        <div className='px-5 py-4'>
                            <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                                Período laboral
                            </p>
                            <div className='grid grid-cols-2 gap-3 text-sm'>
                                <div>
                                    <p className='text-xs text-zinc-400 dark:text-zinc-500'>Fecha de inicio</p>
                                    <p className='font-medium text-zinc-800 dark:text-zinc-100'>
                                        {contrato.fecha_inicio ?? '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className='text-xs text-zinc-400 dark:text-zinc-500'>Fecha real de término</p>
                                    {!finiquito ? (
                                        editandoFechaTermino ? (
                                            <div className='mt-0.5 flex items-center gap-1'>
                                                <Input
                                                    id='fecha-termino-editada'
                                                    name='fecha-termino-editada'
                                                    type='date'
                                                    value={fechaTerminoEditada}
                                                    onChange={(e) => setFechaTerminoEditada(e.target.value)}
                                                />
                                                <Button size='xs' variant='outline' color='zinc' icon='HeroXMark'
                                                    onClick={() => { setFechaTerminoEditada(contrato.fecha_termino_real ?? ''); setEditandoFechaTermino(false); }}
                                                />
                                            </div>
                                        ) : (
                                            <div className='mt-0.5 flex items-center gap-2'>
                                                <p className='font-medium text-zinc-800 dark:text-zinc-100'>
                                                    {fechaTerminoEditada ? dayjs(fechaTerminoEditada).format('DD-MM-YYYY') : '—'}
                                                </p>
                                                <Button size='xs' variant='default' color='blue' icon='HeroPencil' onClick={handleEditarFechaTermino} />
                                            </div>
                                        )
                                    ) : (
                                        <p className='mt-0.5 font-medium text-zinc-800 dark:text-zinc-100'>
                                            {fechaTerminoEditada ? dayjs(fechaTerminoEditada).format('DD-MM-YYYY') : '—'}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {diasCorridos > 0 && (
                                <div className='mt-3 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400'>
                                    <span className='font-semibold text-zinc-700 dark:text-zinc-300'>{diasCorridos} días corridos</span>
                                    {diaMesTermino > 0 && <> · día <span className='font-semibold text-zinc-700 dark:text-zinc-300'>{diaMesTermino}</span> del mes de término</>}
                                </div>
                            )}
                        </div>

                        {/* Remuneración íntegra */}
                        <div className='px-5 py-4'>
                            <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                                Remuneración íntegra mensual (Art. 71 CT)
                            </p>
                            {!finiquito ? (
                                editandoSueldo ? (
                                    <div className='flex items-center gap-2'>
                                        <Input id='sp' name='sp' type='number' value={String(sueldoPersonalizado)}
                                            onChange={(e) => setSueldoPersonalizado(Math.max(0, parseInt(e.target.value) || 0))}
                                        />
                                        <Button size='xs' variant='outline' color='zinc' icon='HeroXMark'
                                            onClick={() => { setSueldoPersonalizado(sueldoSistema); setEditandoSueldo(false); }}
                                        />
                                    </div>
                                ) : (
                                    <div className='flex items-center gap-2'>
                                        <p className='font-mono text-lg font-bold text-zinc-900 dark:text-zinc-50'>
                                            {sueldoBase > 0 ? fmtCLP(sueldoBase) : '—'}
                                        </p>
                                        <Button size='xs' variant='default' color='blue' icon='HeroPencil' onClick={handleEditarSueldo} />
                                    </div>
                                )
                            ) : (
                                <p className='font-mono text-lg font-bold text-zinc-900 dark:text-zinc-50'>
                                    {sueldoBase > 0 ? fmtCLP(sueldoBase) : '—'}
                                </p>
                            )}
                            {sueldoBase > 0 && (
                                <div className='mt-2 space-y-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
                                    <div className='flex justify-between'><span>Sueldo base</span><span className='font-mono'>{fmtCLP(sueldoBase_num)}</span></div>
                                    {bonoMov_num > 0 && <div className='flex justify-between'><span>+ Bono movilización</span><span className='font-mono'>{fmtCLP(bonoMov_num)}</span></div>}
                                    {bonoCola_num > 0 && <div className='flex justify-between'><span>+ Bono colación</span><span className='font-mono'>{fmtCLP(bonoCola_num)}</span></div>}
                                    <p className='pt-0.5'>Base para todos los conceptos del finiquito.</p>
                                </div>
                            )}
                        </div>

                        {/* Vacaciones proporcionales */}
                        <div className='px-5 py-4'>
                            <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                                Vacaciones proporcionales
                            </p>
                            <div className='space-y-2 text-sm'>
                                <div className='flex items-baseline justify-between'>
                                    <span className='text-zinc-500 dark:text-zinc-400'>Días hábiles acumulados</span>
                                    <div className='text-right'>
                                        <span className='font-medium text-zinc-800 dark:text-zinc-100'>{diasHabilesAcumulados} días</span>
                                        {diasCorridos > 0 && <p className='font-mono text-xs text-zinc-400 dark:text-zinc-500'>{diasCorridos} × 15/365</p>}
                                    </div>
                                </div>
                                <div className='flex items-center justify-between'>
                                    <span className='text-zinc-500 dark:text-zinc-400'>Días ya tomados</span>
                                    {!finiquito ? (
                                        editandoDiasTomados ? (
                                            <div className='flex items-center gap-1'>
                                                <Input id='dt' name='dt' type='number' value={String(diasTomados)}
                                                    onChange={(e) => setDiasTomados(Math.max(0, parseInt(e.target.value) || 0))}
                                                />
                                                <Button size='xs' variant='outline' color='zinc' icon='HeroXMark'
                                                    onClick={() => { setDiasTomados(diasTomadosSistema); setEditandoDiasTomados(false); }}
                                                />
                                            </div>
                                        ) : (
                                            <div className='flex items-center gap-2'>
                                                <span className='font-medium text-zinc-800 dark:text-zinc-100'>{diasTomados} días</span>
                                                <Button size='xs' variant='default' color='blue' icon='HeroPencil' onClick={handleEditarDiasTomados} />
                                            </div>
                                        )
                                    ) : (
                                        <span className='font-medium text-zinc-800 dark:text-zinc-100'>{diasTomados} días</span>
                                    )}
                                </div>
                                {!finiquito && diasTomadosSistema > 0 && (
                                    <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                                        {diasTomadosSistema} días registrados en solicitudes aprobadas.
                                    </p>
                                )}
                                <div className='flex items-baseline justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800'>
                                    <span className='font-medium text-zinc-700 dark:text-zinc-300'>Días a pagar</span>
                                    <span className='font-bold text-zinc-900 dark:text-zinc-50'>{diasAPagar} días</span>
                                </div>
                            </div>
                        </div>

                        {/* Aviso previo — solo cuando no hay finiquito y causal Art. 161 */}
                        {!finiquito && mostrarAvisoPrevio && (
                            <div className='px-5 py-4'>
                                <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                                    Aviso previo (Art. 162 CT)
                                </p>
                                <div className='flex items-start gap-3'>
                                    <input type='checkbox' id='aviso_previo' checked={avisoPrevio}
                                        onChange={(e) => setAvisoPrevio(e.target.checked)}
                                        className='mt-0.5 h-4 w-4 rounded border-zinc-300'
                                    />
                                    <label htmlFor='aviso_previo' className='cursor-pointer text-sm text-zinc-700 dark:text-zinc-300'>
                                        El empleador avisó con 30 días de anticipación
                                        <span className='mt-0.5 block text-xs text-zinc-400 dark:text-zinc-500'>
                                            Si no lo hizo, se agrega{sueldoBase > 0 ? ` ${fmtCLP(sueldoBase)} como` : ' una'} indemnización sustitutiva.
                                        </span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Recalcular — solo cuando existe el finiquito en borrador o calculado */}
                        {finiquito && (esBorrador || esCalculado) && (
                            <div className='px-5 py-3 flex items-center justify-between'>
                                <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                                    Calculado con estos datos.
                                </p>
                                <Button
                                    size='xs'
                                    variant='default'
                                    color='red'
                                    icon='HeroArrowPath'
                                    isLoading={eliminando}
                                    onClick={handleRecalcular}>
                                    Recalcular
                                </Button>
                            </div>
                        )}

                    </CardBody>
                </Card>

                {/* DERECHA: Detalle estimado o Conceptos reales */}
                <div className='space-y-4'>
                    {!finiquito ? (

                        /* --- Estimación indicativa --- */
                        <Card>
                            <CardHeader>
                                <span className='font-semibold'>Detalle del cálculo</span>
                            </CardHeader>
                            <CardBody className='divide-y divide-zinc-100 dark:divide-zinc-800 p-0'>

                                {estimadoSueldoProp === 0 && estimadoVacaciones === 0 && (
                                    <div className='px-5 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500'>
                                        Completa las variables para ver el detalle.
                                    </div>
                                )}

                                {estimadoSueldoProp > 0 && (
                                    <div className='px-5 py-3'>
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center gap-1'>
                                                <p className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>Sueldo proporcional</p>
                                                <Tooltip text='Remuneración íntegra ÷ 30 × día del mes de término. Art. 71 CT — el mes laboral se considera de 30 días para el cálculo proporcional.' placement='right' className='text-xs' />
                                            </div>
                                            <p className='font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50'>{fmtCLP(estimadoSueldoProp)}</p>
                                        </div>
                                        <p className='mt-0.5 font-mono text-xs text-zinc-400 dark:text-zinc-500'>
                                            {fmtCLP(sueldoBase)} ÷ 30 × {diaMesTermino} días del mes
                                        </p>
                                    </div>
                                )}

                                {estimadoVacaciones > 0 && (
                                    <div className='px-5 py-3'>
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center gap-1'>
                                                <p className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>Vacaciones proporcionales</p>
                                                <Tooltip text='Días a pagar × remuneración íntegra ÷ 30. Art. 67 CT — 15 días hábiles anuales. Fórmula acumulado: días_corridos × 15/365 − días tomados.' placement='right' className='text-xs' />
                                            </div>
                                            <p className='font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50'>{fmtCLP(estimadoVacaciones)}</p>
                                        </div>
                                        <p className='mt-0.5 font-mono text-xs text-zinc-400 dark:text-zinc-500'>
                                            {diasAPagar} días × {fmtCLP(sueldoBase)} ÷ 30
                                        </p>
                                    </div>
                                )}

                                {estimadoIndemnizacion > 0 && (
                                    <div className='px-5 py-3'>
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center gap-1'>
                                                <p className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>Indemnización por años (Art. 163 CT)</p>
                                                <Tooltip text='1 mes de rem. íntegra por año de servicio completo (máx. 11 meses). Art. 163 CT — tope equivalente a 90 UF. Solo causales Art. 161 y despido injustificado.' placement='right' className='text-xs' />
                                            </div>
                                            <p className='font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50'>{fmtCLP(estimadoIndemnizacion)}</p>
                                        </div>
                                        <p className='mt-0.5 font-mono text-xs text-zinc-400 dark:text-zinc-500'>
                                            {anosCompletos} año(s) → {mesesIndemnizacion} mes(es) × {fmtCLP(sueldoBase)}
                                        </p>
                                    </div>
                                )}

                                {estimadoRecargo > 0 && (
                                    <div className='px-5 py-3'>
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center gap-1'>
                                                <p className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>Recargo 30% (Art. 168 CT)</p>
                                                <Tooltip text='30% adicional sobre la indemnización por despido injustificado. Art. 168 CT — el tribunal puede fijar 30%, 50% o 80% según la gravedad. Se muestra el mínimo (30%).' placement='right' className='text-xs' />
                                            </div>
                                            <p className='font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50'>{fmtCLP(estimadoRecargo)}</p>
                                        </div>
                                        <p className='mt-0.5 font-mono text-xs text-zinc-400 dark:text-zinc-500'>30% sobre {fmtCLP(estimadoIndemnizacion)}</p>
                                    </div>
                                )}

                                {estimadoAvisoPrevio > 0 && (
                                    <div className='px-5 py-3'>
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center gap-1'>
                                                <p className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>Aviso previo sustitutivo (Art. 162 CT)</p>
                                                <Tooltip text='1 mes de remuneración íntegra. Art. 162 CT — si el empleador no avisa con 30 días de anticipación al trabajador, debe pagar esta indemnización sustitutiva del aviso.' placement='right' className='text-xs' />
                                            </div>
                                            <p className='font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50'>{fmtCLP(estimadoAvisoPrevio)}</p>
                                        </div>
                                        <p className='mt-0.5 font-mono text-xs text-zinc-400 dark:text-zinc-500'>1 mes de remuneración íntegra</p>
                                    </div>
                                )}

                                {estimadoTotal > 0 && (
                                    <div className='px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50'>
                                        <div className='flex items-baseline justify-between'>
                                            <p className='font-semibold text-zinc-800 dark:text-zinc-100'>Total estimado</p>
                                            <p className='font-mono text-xl font-bold text-zinc-900 dark:text-zinc-50'>{fmtCLP(estimadoTotal)}</p>
                                        </div>
                                        <p className='mt-1 text-xs text-zinc-400 dark:text-zinc-500'>
                                            Indicativo. El cálculo real puede diferir por topes legales (90 UF) u otros conceptos.
                                        </p>
                                    </div>
                                )}

                            </CardBody>
                        </Card>

                    ) : (

                        /* --- Conceptos reales del finiquito --- */
                        <Card>
                            <CardHeader>
                                <div className='flex w-full items-center justify-between'>
                                    <span className='font-semibold'>Conceptos del finiquito</span>
                                    <Badge color={COLOR_ESTADO_FINIQUITO[finiquito.estado]} variant='outline'>
                                        {finiquito.estado_label}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardBody className='space-y-3'>
                                <Table>
                                    <THead>
                                        <Tr>
                                            <Th>Concepto</Th>
                                            <Th>Detalle</Th>
                                            <Th className='text-right'>Monto</Th>
                                            {esBorrador && <Th>{''}</Th>}
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {finiquito.conceptos.map((c, i) => (
                                            <FilaConcepto
                                                key={c.id}
                                                concepto={c}
                                                editable={esBorrador}
                                                moneda={contrato.moneda}
                                                onSave={(updated) => handleGuardarConcepto(i, updated)}
                                                onDelete={() => handleEliminarConcepto(i)}
                                            />
                                        ))}
                                        {esBorrador && filaNueva && (
                                            <FilaConcepto
                                                concepto={{ id: `custom_${Date.now()}`, nombre: '', detalle: '', monto: 0 }}
                                                editable
                                                moneda={contrato.moneda}
                                                onSave={handleAgregarConcepto}
                                                onDelete={() => setFilaNueva(false)}
                                            />
                                        )}
                                    </TBody>
                                </Table>

                                {esBorrador && !filaNueva && (
                                    <Button size='sm' variant='outline' color='zinc' icon='HeroPlus' onClick={() => setFilaNueva(true)}>
                                        Agregar concepto
                                    </Button>
                                )}

                                <Totales finiquito={finiquito} moneda={contrato.moneda} />

                                {/* Acciones */}
                                <div className='space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800'>
                                    {finiquito.archivo_pdf && (
                                        <Button size='sm' variant='outline' color='zinc' icon='HeroDocumentArrowDown' className='w-full justify-center' onClick={handleDescargarPdfFiniquito}>
                                            Descargar PDF
                                        </Button>
                                    )}
                                    {esBorrador && !finiquito.archivo_pdf && (
                                        <Button size='sm' variant='outline' color='zinc' icon='HeroDocumentArrowDown' className='w-full justify-center' isLoading={generandoPdf}
                                            onClick={async () => {
                                                try {
                                                    const result = await generarPdf(finiquito.id).unwrap();
                                                    if (result.archivo_pdf) {
                                                        await downloadPdfFromUrl(result.archivo_pdf, `finiquito_${finiquito.contrato}.pdf`);
                                                    }
                                                } catch (err) { toast.error(getErrorMessage(err)); }
                                            }}>
                                            Generar PDF
                                        </Button>
                                    )}
                                    {esCalculado && (
                                        <Button size='sm' variant='outline' color='zinc' icon='HeroArrowPath' className='w-full justify-center' isLoading={regenerando}
                                            onClick={async () => { try { await regenerarPdf(finiquito.id).unwrap(); toast.success('PDF regenerado.'); } catch (err) { toast.error(getErrorMessage(err)); } }}>
                                            Regenerar PDF
                                        </Button>
                                    )}
                                    {(esBorrador || esCalculado) && (
                                        <Button size='sm' variant='solid' color='emerald' icon='HeroCheckCircle' className='w-full justify-center' isLoading={aprobando} onClick={() => setModalAprobacionOpen(true)}>
                                            Aprobar finiquito
                                        </Button>
                                    )}
                                    {esFirmado && (
                                        <Button size='sm' variant='solid' color='violet' icon='HeroBanknotes' className='w-full justify-center' isLoading={pagando}
                                            onClick={async () => { try { await marcarPagado(finiquito.id).unwrap(); toast.success('Finiquito marcado como pagado.'); } catch (err) { toast.error(getErrorMessage(err)); } }}>
                                            Marcar como pagado
                                        </Button>
                                    )}
                                </div>

                            </CardBody>
                        </Card>

                    )}

                    {/* Botón calcular — solo cuando no hay finiquito */}
                    {!finiquito && (
                        <Button
                            variant='solid'
                            color='blue'
                            icon='HeroCalculator'
                            className='w-full justify-center'
                            isLoading={calculando}
                            onClick={async () => {
                                try {
                                    await calcular({
                                        contrato_id: contrato.id,
                                        dias_vacaciones_tomados: diasTomados,
                                        aviso_previo_30_dias: avisoPrevio,
                                    }).unwrap();
                                    toast.success('Finiquito calculado correctamente.');
                                } catch (err) { toast.error(getErrorMessage(err)); }
                            }}>
                            Calcular finiquito
                        </Button>
                    )}

                </div>

            </div>

            {/* Modal: Aprobar finiquito */}
            <Modal isOpen={modalAprobacionOpen} setIsOpen={setModalAprobacionOpen}>
                <ModalHeader>Aprobar finiquito</ModalHeader>
                <ModalBody>
                    <div className='space-y-5'>
                        <div>
                            <Label htmlFor='fecha-aprobacion'>Fecha de aprobación</Label>
                            <Input id='fecha-aprobacion' name='fecha-aprobacion' type='date' value={fechaAprobacion} onChange={(e) => setFechaAprobacion(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor='archivo-firmado'>Documento firmado (opcional)</Label>
                            <p className='mb-2 mt-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
                                Si tienes el finiquito firmado físicamente, puedes adjuntarlo aquí.
                            </p>
                            {archivoFirmado ? (
                                <div className='flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-800 dark:bg-emerald-900/20'>
                                    <p className='min-w-0 flex-1 truncate text-sm text-emerald-700 dark:text-emerald-300'>{archivoFirmado.name}</p>
                                    <Button size='xs' variant='outline' color='zinc' icon='HeroXMark' onClick={() => setArchivoFirmado(null)} />
                                </div>
                            ) : (
                                <label htmlFor='archivo-firmado-input' className='flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-zinc-200 px-4 py-6 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'>
                                    <p className='text-sm font-medium text-zinc-500 dark:text-zinc-400'>Haz click para adjuntar</p>
                                    <p className='text-xs text-zinc-400 dark:text-zinc-500'>PDF, JPG o PNG</p>
                                    <input id='archivo-firmado-input' type='file' accept='.pdf,.jpg,.jpeg,.png' className='hidden' onChange={(e) => setArchivoFirmado(e.target.files?.[0] ?? null)} />
                                </label>
                            )}
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={() => { setModalAprobacionOpen(false); setArchivoFirmado(null); }}>Cancelar</Button>
                    <Button variant='solid' color='emerald' icon='HeroCheckCircle' isDisable={aprobando || !fechaAprobacion} onClick={handleAprobar}>
                        {aprobando ? 'Aprobando...' : 'Aprobar finiquito'}
                    </Button>
                </ModalFooter>
            </Modal>
        </Container>
    );
};

export default TabFiniquitoTrabajador;