import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import type { IAnexoContrato, IContratoTrabajador } from '@/interface/rrhh.interface';
import { downloadPdfFromUrl } from '@/utils/downloadHelpers';
import {
    useActivarAnexoContratoMutation,
    useEliminarAnexoContratoMutation,
    useGetAnexosContratoQuery,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert } from '@/utils/sweetAlert';
import dayjs from 'dayjs';
import { useState } from 'react';
import { toast } from 'react-toastify';
import CrearAnexoWizardModal from '../../modals/CrearAnexoWizardModal';

// ─── Helpers de display ───────────────────────────────────────────────────────

const buildDetalles = (a: IAnexoContrato): Array<{ label: string; valor: string }> => {
    const GRATIFICACION: Record<string, string> = {
        art_47: 'Gratif. anual (Art. 47)',
        art_50_mensual: 'Gratif. mensual (Art. 50)',
        no_aplica: 'Sin gratificación',
    };
    const JORNADA: Record<string, string> = { completa: 'Completa', parcial: 'Parcial', turnos: 'Turnos' };
    const fmt = (v?: string | null) => (v ? `$${Number(v).toLocaleString('es-CL')}` : null);

    const items: Array<{ label: string; valor: string }> = [];
    if (a.nuevo_tipo_contrato)
        items.push({ label: 'Tipo de contrato', valor: 'Indefinido' });
    if (a.nueva_fecha_termino)
        items.push({ label: 'Nueva fecha de término', valor: dayjs(a.nueva_fecha_termino).format('DD/MM/YYYY') });
    if (a.nuevo_sueldo)
        items.push({ label: 'Sueldo base', valor: fmt(a.nuevo_sueldo) ?? '' });
    if (a.nuevo_tipo_gratificacion)
        items.push({ label: 'Gratificación', valor: GRATIFICACION[a.nuevo_tipo_gratificacion] ?? a.nuevo_tipo_gratificacion });
    if (a.nuevo_bono_movilizacion)
        items.push({ label: 'Bono movilización', valor: fmt(a.nuevo_bono_movilizacion) ?? '' });
    if (a.nuevo_bono_colacion)
        items.push({ label: 'Bono colación', valor: fmt(a.nuevo_bono_colacion) ?? '' });
    if (a.nuevo_cargo)
        items.push({ label: 'Cargo', valor: a.nuevo_cargo });
    if (a.nuevas_funciones)
        items.push({ label: 'Funciones', valor: a.nuevas_funciones });
    if (a.nueva_jornada)
        items.push({ label: 'Jornada', valor: JORNADA[a.nueva_jornada] ?? a.nueva_jornada });
    if (a.nuevas_horas_semanales)
        items.push({ label: 'Horas semanales', valor: `${a.nuevas_horas_semanales} hrs/semana` });
    if (a.nuevo_lugar_trabajo)
        items.push({ label: 'Lugar de trabajo', valor: a.nuevo_lugar_trabajo });
    return items;
};

// ─── Helpers de display ───────────────────────────────────────────────────────

const formatMonto = (v?: string | null) =>
    v ? `$${Number(v).toLocaleString('es-CL')}` : null;

const GRATIFICACION_LABEL: Record<string, string> = {
    art_47: 'Gratif. anual (Art. 47)',
    art_50_mensual: 'Gratif. mensual (Art. 50)',
    no_aplica: 'Sin gratificación',
};

const JORNADA_LABEL: Record<string, string> = {
    completa: 'Completa',
    parcial: 'Parcial',
    turnos: 'Turnos',
};

const TIPO_LABEL: Record<string, string> = {
    prorroga: 'Prórroga',
    cambio_tipo_contrato: 'Conversión a indefinido',
    modificacion_sueldo: 'Modificación de sueldo',
    modificacion_cargo: 'Modificación de cargo',
    modificacion_funciones: 'Modificación de funciones',
    modificacion_jornada: 'Modificación de jornada',
    cambio_lugar_trabajo: 'Cambio de lugar de trabajo',
    modificacion_general: 'Modificación general',
    otro: 'Otro',
};

// ─── AnexoCard ────────────────────────────────────────────────────────────────

interface IAnexoCardProps {
    a: IAnexoContrato;
    onDescargar: (url: string, id: number) => void;
    onActivar: (id: number) => void;
    onDescartar: (id: number, contratoId: number) => void;
    activandoId: number | null;
    descartandoId: number | null;
}

const AnexoCard = ({ a, onDescargar, onActivar, onDescartar, activandoId, descartandoId }: IAnexoCardProps) => {
    const [expanded, setExpanded] = useState(false);
    const esBorrador = a.estado === 'borrador';
    const detalles = buildDetalles(a);
    const tieneDetalles = detalles.length > 0;

    const alguienOcupado = activandoId !== null || descartandoId !== null;

    return (
        <div className={`rounded-lg border p-4 ${esBorrador ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20' : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'}`}>
            <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                        {a.numero_anexo && (
                            <span className='shrink-0 rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-xs font-bold text-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'>
                                N°{a.numero_anexo}
                            </span>
                        )}
                        <p className='text-sm font-semibold text-zinc-800 dark:text-zinc-100'>
                            {a.tipo_label ?? TIPO_LABEL[a.tipo] ?? a.tipo}
                        </p>
                        {esBorrador && <Badge color='amber' variant='outline'>Pendiente de activar</Badge>}
                        {a.numero_prorroga && <Badge color='blue' variant='outline'>Prórroga N°{a.numero_prorroga}</Badge>}
                    </div>
                    <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
                        Efectivo: {a.fecha_efectiva ? dayjs(a.fecha_efectiva).format('DD/MM/YYYY') : '—'}
                    </p>
                    {a.descripcion && (
                        <p className='mt-1 text-sm text-zinc-600 dark:text-zinc-300'>{a.descripcion}</p>
                    )}
                    {tieneDetalles && (
                        <button
                            type='button'
                            onClick={() => setExpanded((p) => !p)}
                            className='mt-1.5 text-xs text-blue-500 hover:underline dark:text-blue-400'>
                            {expanded
                                ? 'Ocultar detalle'
                                : `Ver detalle (${detalles.length} campo${detalles.length > 1 ? 's' : ''})`}
                        </button>
                    )}
                    {tieneDetalles && expanded && (
                        <div className='mt-2 rounded border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/60'>
                            <table className='w-full text-xs'>
                                <tbody>
                                    {detalles.map((item, i) => (
                                        <tr
                                            key={i}
                                            className={i > 0 ? 'border-t border-zinc-200 dark:border-zinc-700' : ''}>
                                            <td className='py-1 pr-4 font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap align-top'>
                                                {item.label}
                                            </td>
                                            <td className='py-1 text-zinc-800 dark:text-zinc-100 break-words'>
                                                {item.valor}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className='flex shrink-0 items-center gap-2'>
                    {esBorrador && (
                        <>
                            <Button
                                size='sm'
                                color='red'
                                variant='outline'
                                icon='HeroTrash'
                                isLoading={descartandoId === a.id}
                                isDisable={alguienOcupado}
                                onClick={() => onDescartar(a.id, a.contrato)}>
                                Descartar
                            </Button>
                            <Button
                                size='sm'
                                variant='solid'
                                color='emerald'
                                icon='HeroCheckCircle'
                                isLoading={activandoId === a.id}
                                isDisable={alguienOcupado}
                                onClick={() => onActivar(a.id)}>
                                Activar
                            </Button>
                        </>
                    )}
                    {a.archivo_pdf && !esBorrador && (
                        <Button
                            icon='HeroDocumentArrowDown'
                            size='sm'
                            onClick={() => onDescargar(a.archivo_pdf!, a.id)}>
                            PDF
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Tab principal ────────────────────────────────────────────────────────────

interface IProps {
    contrato: IContratoTrabajador;
}

const TabAnexosV2Trabajador = ({ contrato }: IProps) => {
    const { data: anexos = [], isLoading } = useGetAnexosContratoQuery(contrato.id);
    const [activarAnexo] = useActivarAnexoContratoMutation();
    const [eliminarAnexo] = useEliminarAnexoContratoMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [activandoId, setActivandoId] = useState<number | null>(null);
    const [descartandoId, setDescartandoId] = useState<number | null>(null);

    const esVigente = contrato.estado === 'vigente';
    const esVencido = contrato.estado === 'vencido';
    const esFinal = contrato.estado === 'terminado' || contrato.estado === 'anulado';
    const esBorradorOPendiente =
        contrato.estado === 'borrador' || contrato.estado === 'pendiente_aprobacion';

    const handleDescargarPdf = async (url: string, id: number) => {
        try {
            await downloadPdfFromUrl(url, `anexo_${id}.pdf`);
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const handleActivar = async (id: number) => {
        const ok = await confirmAlert({
            title: 'Activar anexo',
            text: 'Al activar, los cambios se aplicarán al contrato. Esta acción no se puede revertir.',
            confirmText: 'Activar',
            icon: 'warning',
        });
        if (!ok) return;
        setActivandoId(id);
        try {
            const result = await activarAnexo(id).unwrap();
            toast.success('Anexo activado. Cambios aplicados al contrato.');
            if (result.numero_prorroga && result.numero_prorroga >= 2) {
                toast.warn(
                    `Esta es la ${result.numero_prorroga}ª prórroga. Art. 159 N°4 CT: si el contrato supera 1 año o se renueva más de una vez, el trabajador puede exigir que se declare indefinido.`,
                    { autoClose: 10000 },
                );
            }
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setActivandoId(null);
        }
    };

    const handleDescartar = async (id: number, contratoId: number) => {
        const ok = await confirmAlert({
            title: 'Descartar borrador',
            text: 'El borrador se eliminará. Esta acción no se puede deshacer.',
            confirmText: 'Descartar',
            icon: 'warning',
        });
        if (!ok) return;
        setDescartandoId(id);
        try {
            await eliminarAnexo({ id, contratoId }).unwrap();
            toast.success('Borrador descartado.');
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setDescartandoId(null);
        }
    };

    if (esBorradorOPendiente) {
        return (
            <Card>
                <CardBody>
                    <Alert variant='outline' color='blue' icon='HeroInformationCircle'>
                        Los anexos están disponibles únicamente cuando el contrato está Vigente.
                    </Alert>
                </CardBody>
            </Card>
        );
    }

    return (
        <>
            <div className='space-y-4'>
                {esVencido && (
                    <Alert variant='outline' color='red' icon='HeroExclamationTriangle'>
                        Este contrato está vencido. Solo puedes crear un anexo de{' '}
                        <strong>Conversión a Indefinido</strong> para formalizar la continuación de la relación laboral.
                    </Alert>
                )}
                <Card>
                    <CardHeader>
                        <div className='flex w-full items-center justify-between'>
                            <span>{esFinal ? 'Historial de Anexos' : 'Anexos del Contrato'}</span>
                            <div className='flex items-center gap-2'>
                                {esFinal && <Badge color='zinc' variant='outline'>Solo lectura</Badge>}
                                {(esVigente || esVencido) && (
                                    <Button
                                        icon='HeroPlus'
                                        variant='solid'
                                        size='sm'
                                        onClick={() => setModalOpen(true)}>
                                        Nuevo anexo
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardBody>
                        {isLoading ? (
                            <p className='text-sm text-zinc-500'>Cargando...</p>
                        ) : anexos.length === 0 ? (
                            <p className='text-sm text-zinc-400'>No hay anexos registrados.</p>
                        ) : (
                            <div className='space-y-3'>
                                {anexos.map((a: IAnexoContrato) => (
                                    <AnexoCard
                                        key={a.id}
                                        a={a}
                                        onDescargar={handleDescargarPdf}
                                        onActivar={handleActivar}
                                        onDescartar={handleDescartar}
                                        activandoId={activandoId}
                                        descartandoId={descartandoId}
                                    />
                                ))}
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>

            {(esVigente || esVencido) && (
                <CrearAnexoWizardModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    contrato={contrato}
                />
            )}
        </>
    );
};

export default TabAnexosV2Trabajador;
