import { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import type {
    IAdjuntoOTV3,
    IGastoOTV3,
    IGuiaSalidaResumenOTV3,
    IOrdenDeTrabajoV3,
    ISeguimientoOTV3,
    ITareaOTV3,
} from '@/interface/ordenTrabajoV3.interface';
import { useCambiarEstadoTareaV3Mutation, useCreateSeguimientoV3Mutation, useDeleteAdjuntoV3Mutation, useDeleteGastoV3Mutation, useToggleChecklistItemV3Mutation } from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useState } from 'react';
import { toast } from 'react-toastify';
import AgregarAdjuntoOTV3 from '../modals/AgregarAdjuntoOTV3';
import CompletarTareaOTV3 from '../modals/CompletarTareaOTV3';
import CrearGastoOTV3 from '../modals/CrearGastoOTV3';
import FirmarGuiaOTV3 from '../modals/FirmarGuiaOTV3';

interface IProps {
    orden: IOrdenDeTrabajoV3;
    firmantesOptions?: TSelectOption[];
    receptoresOptions?: TSelectOption[];
}

const ESTADO_TAREA_COLOR: Record<string, string> = {
    pendiente: 'zinc',
    en_proceso: 'blue',
    completada: 'emerald',
    no_realizada: 'red',
};

const PanelEjecucion = ({ orden, firmantesOptions = [], receptoresOptions = [] }: IProps) => {
    const [deleteGasto] = useDeleteGastoV3Mutation();
    const [deleteAdjunto] = useDeleteAdjuntoV3Mutation();
    const [createSeguimiento, { isLoading: loadingSeguimiento }] = useCreateSeguimientoV3Mutation();
    const [toggleChecklist] = useToggleChecklistItemV3Mutation();
    const [cambiarEstadoTarea] = useCambiarEstadoTareaV3Mutation();
    const [tareaSeleccionada, setTareaSeleccionada] = useState<ITareaOTV3 | null>(null);
    const [modalCompletar, setModalCompletar] = useState(false);
    const [modalGasto, setModalGasto] = useState(false);
    const [modalAdjunto, setModalAdjunto] = useState(false);
    const [comentario, setComentario] = useState('');
    const [expandedCot, setExpandedCot] = useState<Set<number>>(new Set());
    const [guiaParaFirmar, setGuiaParaFirmar] = useState<IGuiaSalidaResumenOTV3 | null>(null);
    const [modalFirma, setModalFirma] = useState(false);

    const guiasDeOT = orden.guias_vinculadas ?? [];

    const handleEliminarGasto = async (gasto: IGastoOTV3) => {
        try {
            await deleteGasto({ ordenId: orden.id, gastoId: gasto.id }).unwrap();
            toast.success('Gasto eliminado');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleEliminarAdjunto = async (adjunto: IAdjuntoOTV3) => {
        try {
            await deleteAdjunto({ ordenId: orden.id, adjuntoId: adjunto.id }).unwrap();
            toast.success('Adjunto eliminado');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleEnviarComentario = async () => {
        if (!comentario.trim()) return;
        try {
            await createSeguimiento({
                ordenId: orden.id,
                tipo: 'comentario_tecnico',
                contenido: comentario,
            }).unwrap();
            setComentario('');
            toast.success('Comentario agregado');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleIniciarTarea = async (tarea: ITareaOTV3) => {
        try {
            await cambiarEstadoTarea({ ordenId: orden.id, tareaId: tarea.id, estado: 'en_proceso' }).unwrap();
            toast.success('Tarea iniciada');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleAbrirCompletar = (tarea: ITareaOTV3) => {
        setTareaSeleccionada(tarea);
        setModalCompletar(true);
    };

    return (
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            {/* Kanban liviano de tareas */}
            <Card className='lg:col-span-2'>
                <CardHeader>
                    <CardHeaderChild>
                        Tareas{' '}
                        <span className='text-sm font-normal text-zinc-500'>
                            ({orden.tareas_completadas}/{orden.total_tareas} completadas)
                        </span>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                        {/* Pendientes */}
                        <div className='rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                            <p className='mb-3 text-sm font-semibold text-zinc-500'>Pendientes</p>
                            <div className='space-y-2'>
                                {orden.tareas
                                    ?.filter((t) => t.estado === 'pendiente')
                                    .map((t) => (
                                        <div
                                            key={t.id}
                                            className='rounded-md border border-zinc-200 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900'>
                                            <p className='font-medium'>{t.titulo}</p>
                                            {t.tecnico_asignado_nombre && (
                                                <p className='text-xs text-zinc-400'>{t.tecnico_asignado_nombre}</p>
                                            )}
                                            <Button
                                                size='sm'
                                                icon='HeroPlay'
                                                className='mt-2 w-full'
                                                onClick={() => handleIniciarTarea(t)}>
                                                Iniciar
                                            </Button>
                                        </div>
                                    ))}
                                {!orden.tareas?.filter((t) => t.estado === 'pendiente').length && (
                                    <p className='py-2 text-center text-xs text-zinc-400'>Sin tareas pendientes</p>
                                )}
                            </div>
                        </div>

                        {/* En proceso */}
                        <div className='rounded-lg border border-blue-200 bg-blue-50/30 p-3 dark:border-blue-700 dark:bg-blue-900/10'>
                            <p className='mb-3 text-sm font-semibold text-blue-600 dark:text-blue-400'>
                                En proceso
                            </p>
                            <div className='space-y-2'>
                                {orden.tareas
                                    ?.filter((t) => t.estado === 'en_proceso')
                                    .map((t) => (
                                        <div
                                            key={t.id}
                                            className='rounded-md border border-blue-200 bg-white p-2 text-sm dark:border-blue-700 dark:bg-zinc-900'>
                                            <p className='font-medium'>{t.titulo}</p>
                                            {t.tecnico_asignado_nombre && (
                                                <p className='text-xs text-zinc-400'>{t.tecnico_asignado_nombre}</p>
                                            )}
                                            {t.requiere_firma && (
                                                <Badge color='amber' className='mt-1'>
                                                    Requiere firma
                                                </Badge>
                                            )}
                                            <Button
                                                size='sm'
                                                icon='HeroCheck'
                                                color='emerald'
                                                className='mt-2 w-full'
                                                onClick={() => handleAbrirCompletar(t)}>
                                                Completar
                                            </Button>
                                        </div>
                                    ))}
                                {!orden.tareas?.filter((t) => t.estado === 'en_proceso').length && (
                                    <p className='py-2 text-center text-xs text-blue-400'>Sin tareas en proceso</p>
                                )}
                            </div>
                        </div>

                        {/* Completadas */}
                        <div className='rounded-lg border border-emerald-200 bg-emerald-50/30 p-3 dark:border-emerald-700 dark:bg-emerald-900/10'>
                            <p className='mb-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400'>
                                Completadas
                            </p>
                            <div className='space-y-2'>
                                {orden.tareas
                                    ?.filter((t) =>
                                        ['completada', 'no_realizada'].includes(t.estado),
                                    )
                                    .map((t) => (
                                        <div
                                            key={t.id}
                                            className='rounded-md border border-emerald-200 bg-white p-2 text-sm dark:border-emerald-700 dark:bg-zinc-900'>
                                            <p className='font-medium'>{t.titulo}</p>
                                            <div className='mt-1 flex flex-wrap gap-1'>
                                                <Badge color={ESTADO_TAREA_COLOR[t.estado] as any}>
                                                    {t.estado_display}
                                                </Badge>
                                                {t.firma_datos && (
                                                    <Badge color='violet'>Firmada</Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                {!orden.tareas?.filter((t) =>
                                    ['completada', 'no_realizada'].includes(t.estado),
                                ).length && (
                                    <p className='py-2 text-center text-xs text-emerald-400'>
                                        Ninguna completada aún
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Gastos */}
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        Gastos{' '}
                        <span className='text-sm font-normal text-zinc-500'>
                            Total: ${orden.total_gastos?.toLocaleString('es-CL') ?? '0'}
                        </span>
                    </CardHeaderChild>
                    <Button
                        icon='HeroPlus'
                        size='sm'
                        variant='outline'
                        onClick={() => setModalGasto(true)}>
                        Agregar
                    </Button>
                </CardHeader>
                <CardBody>
                    {orden.gastos && orden.gastos.length > 0 ? (
                        <div className='space-y-2'>
                            {orden.gastos.map((g) => (
                                <div
                                    key={g.id}
                                    className='flex items-center justify-between rounded-lg border border-zinc-100 p-2 text-sm dark:border-zinc-800'>
                                    <div>
                                        <p className='font-medium'>{g.detalle}</p>
                                        <p className='text-xs text-zinc-400'>
                                            {g.cantidad} x ${parseFloat(g.monto_unitario).toLocaleString('es-CL')} ={' '}
                                            <span className='font-semibold text-zinc-700 dark:text-zinc-300'>
                                                ${parseFloat(g.monto_total).toLocaleString('es-CL')}
                                            </span>
                                        </p>
                                    </div>
                                    <Button
                                        icon='HeroTrash'
                                        size='sm'
                                        color='red'
                                        onClick={() => handleEliminarGasto(g)}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className='py-2 text-sm text-zinc-400'>Sin gastos registrados.</p>
                    )}
                </CardBody>
            </Card>

            {/* Adjuntos/Fotos */}
            <Card>
                <CardHeader>
                    <CardHeaderChild>Adjuntos y Fotos</CardHeaderChild>
                    <Button
                        icon='HeroPlus'
                        size='sm'
                        variant='outline'
                        onClick={() => setModalAdjunto(true)}>
                        Agregar
                    </Button>
                </CardHeader>
                <CardBody>
                    {orden.adjuntos && orden.adjuntos.length > 0 ? (
                        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                            {orden.adjuntos.map((a) => (
                                <div
                                    key={a.id}
                                    className='group relative overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700'>
                                    {a.tipo === 'foto' ? (
                                        <img
                                            src={a.archivo}
                                            alt={a.descripcion || 'adjunto'}
                                            className='h-24 w-full object-cover'
                                        />
                                    ) : (
                                        <div className='flex h-24 items-center justify-center bg-zinc-50 text-zinc-500 dark:bg-zinc-800'>
                                            <span className='text-3xl'>ðŸ“Ž</span>
                                        </div>
                                    )}
                                    <div className='absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/50 px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100'>
                                        <span className='truncate text-xs text-white'>
                                            {a.descripcion || a.tipo}
                                        </span>
                                        <Button
                                            icon='HeroTrash'
                                            size='sm'
                                            color='red'
                                            onClick={() => handleEliminarAdjunto(a)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className='py-2 text-sm text-zinc-400'>Sin adjuntos.</p>
                    )}
                </CardBody>
            </Card>

            {/* Comentarios/Seguimientos */}
            <Card className='lg:col-span-2'>
                <CardHeader>
                    <CardHeaderChild>Comentarios y Seguimiento</CardHeaderChild>
                </CardHeader>
                <CardBody>
                    {/* Feed de comentarios */}
                    <div className='mb-4 max-h-64 space-y-3 overflow-y-auto'>
                        {orden.seguimientos && orden.seguimientos.length > 0 ? (
                            orden.seguimientos
                                .map((s: ISeguimientoOTV3) => (
                                    <div
                                        key={s.id}
                                        className='rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-800/50'>
                                        <div className='mb-1 flex items-center gap-2 text-xs text-zinc-400'>
                                            <span className='font-medium text-zinc-600 dark:text-zinc-300'>
                                                {s.autor_nombre}
                                            </span>
                                            <span>
                                                {dayjs(s.fecha_creacion).format('DD/MM/YY HH:mm')}
                                            </span>
                                        </div>
                                        <p className='text-zinc-700 dark:text-zinc-200'>{s.contenido}</p>
                                    </div>
                                ))
                        ) : (
                            <p className='text-sm text-zinc-400'>Sin comentarios aun.</p>
                        )}
                    </div>
                    {/* Input nuevo comentario */}
                    <div className='flex gap-2'>
                        <Textarea
                            value={comentario}
                            onChange={(e) => setComentario(e.target.value)}
                            placeholder='Agregar comentario...'
                            rows={2}
                            className='flex-1'
                        />
                        <Button
                            icon='HeroPaperAirplane'
                            variant='solid'
                            className='self-end'
                            isLoading={loadingSeguimiento}
                            onClick={handleEnviarComentario}>
                            Enviar
                        </Button>
                    </div>
                </CardBody>
            </Card>

            {/* Cotizaciones de la OT "” solo lectura con firma de guias */}
            {orden.cotizaciones_detalle && orden.cotizaciones_detalle.length > 0 && (
                <Card className='lg:col-span-2'>
                    <CardHeader>
                        <CardHeaderChild>
                            Cotizaciones de la OT
                            <Badge color='emerald' className='ml-2'>
                                {orden.cotizaciones_detalle.length}
                            </Badge>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        <div className='space-y-4'>
                            {orden.cotizaciones_detalle.map((cotizacion) => {
                                const guiasDeEstaCot = guiasDeOT.filter(
                                    (guia) => guia.cotizacion_origen_id === cotizacion.id,
                                );
                                const isExpanded = expandedCot.has(cotizacion.id);
                                const toggleExpanded = () =>
                                    setExpandedCot((prev) => {
                                        const next = new Set(prev);
                                        next.has(cotizacion.id)
                                            ? next.delete(cotizacion.id)
                                            : next.add(cotizacion.id);
                                        return next;
                                    });

                                return (
                                    <div
                                        key={cotizacion.id}
                                        className='rounded-lg border border-zinc-200 dark:border-zinc-700'>
                                        {/* Cabecera de cotizacion */}
                                        <div className='flex items-center justify-between gap-3 rounded-t-lg border-b border-zinc-200 bg-blue-50 px-4 py-3 dark:border-zinc-700 dark:bg-blue-900/20'>
                                            <div className='min-w-0'>
                                                <p className='truncate font-semibold text-blue-800 dark:text-blue-300'>
                                                    #{cotizacion.numero_cotizacion} "”{' '}
                                                    {cotizacion.nombre}
                                                </p>
                                                <div className='mt-1 flex flex-wrap gap-1'>
                                                    {cotizacion.tiene_equipos && (
                                                        <Badge color='violet' className='text-xs'>
                                                            Con equipos
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Items "” siempre visibles */}
                                        <div className='px-4 pt-3'>
                                            {cotizacion.items && cotizacion.items.length > 0 ? (
                                                <div className='overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700'>
                                                    <table className='w-full text-sm'>
                                                        <thead className='bg-gray-100 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'>
                                                            <tr>
                                                                <th className='px-3 py-2 text-left'>
                                                                    Item
                                                                </th>
                                                                <th className='px-3 py-2 text-left'>
                                                                    Proveedor
                                                                </th>
                                                                <th className='px-3 py-2 text-right'>
                                                                    Cant.
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                                                            {cotizacion.items.map((item) => (
                                                                <tr
                                                                    key={item.id}
                                                                    className='bg-white dark:bg-gray-900/30'>
                                                                    <td className='px-3 py-2 text-zinc-700 dark:text-zinc-300'>
                                                                        {item.nombre}
                                                                    </td>
                                                                    <td className='px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400'>
                                                                        {item.proveedor_empresa_nombre ??
                                                                            '"”'}
                                                                    </td>
                                                                    <td className='px-3 py-2 text-right text-zinc-600 dark:text-zinc-400'>
                                                                        {item.cantidad}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className='text-sm text-zinc-400'>
                                                    Sin items registrados.
                                                </p>
                                            )}
                                        </div>

                                        {/* Resumen guias + toggle */}
                                        <div className='flex items-center justify-between px-4 py-3'>
                                            <span className='text-sm text-zinc-500'>
                                                {guiasDeEstaCot.length > 0 ? (
                                                    <span className='font-medium text-emerald-600 dark:text-emerald-400'>
                                                        {guiasDeEstaCot.length} guia(s) de salida
                                                        vinculada(s)
                                                    </span>
                                                ) : (
                                                    <span className='text-amber-600 dark:text-amber-400'>
                                                        Sin guias de salida
                                                    </span>
                                                )}
                                            </span>
                                            <Button
                                                size='sm'
                                                variant='outline'
                                                icon={
                                                    isExpanded
                                                        ? 'HeroChevronUp'
                                                        : 'HeroChevronDown'
                                                }
                                                onClick={toggleExpanded}>
                                                {isExpanded ? 'Menos' : 'Ver detalle'}
                                            </Button>
                                        </div>

                                        {/* Detalle colapsable */}
                                        {isExpanded && (
                                            <div className='space-y-4 border-t border-zinc-200 px-4 pb-4 pt-3 dark:border-zinc-700'>
                                                {/* Alerta equipos */}
                                                {cotizacion.tiene_equipos && (
                                                    <div className='flex items-start gap-2 rounded-lg border border-violet-300 bg-violet-50 p-3 text-sm text-violet-800 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-300'>
                                                        <span className='font-semibold'>
                                                            Atencion:
                                                        </span>
                                                        Esta cotizacion incluye equipos con tareas
                                                        de entrega asignadas.
                                                    </div>
                                                )}

                                                {/* Guias de salida */}
                                                <div>
                                                    <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                                                        Guias de Salida
                                                    </p>
                                                    {guiasDeEstaCot.length === 0 ? (
                                                        <p className='text-sm text-zinc-400'>
                                                            Sin guias de salida para esta
                                                            cotizacion.
                                                        </p>
                                                    ) : (
                                                        <div className='space-y-2'>
                                                            {guiasDeEstaCot.map((g) => (
                                                                <div
                                                                    key={g.id}
                                                                    className='flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                                                    <div>
                                                                        <p className='text-sm font-medium'>
                                                                            Guia #{g.id}{' '}
                                                                            <Badge
                                                                                color={
                                                                                    g.estado === 'FR'
                                                                                        ? 'emerald'
                                                                                        : 'amber'
                                                                                }
                                                                                className='ml-1 text-xs'>
                                                                                {g.estado_label}
                                                                            </Badge>
                                                                        </p>
                                                                        <p className='text-xs text-zinc-500'>
                                                                            {g.descripcion_items}
                                                                        </p>
                                                                    </div>
                                                                    {g.estado === 'P' && (
                                                                        <Tooltip text='Firmar guia de salida'>
                                                                            <Button
                                                                                size='sm'
                                                                                icon='HeroPencil'
                                                                                color='emerald'
                                                                                onClick={() => {
                                                                                    setGuiaParaFirmar(g);
                                                                                    setModalFirma(true);
                                                                                }}
                                                                            />
                                                                        </Tooltip>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Modales */}
            <CompletarTareaOTV3
                isOpen={modalCompletar}
                setIsOpen={setModalCompletar}
                tarea={tareaSeleccionada}
                ordenId={orden.id}
                receptoresOptions={receptoresOptions}
            />
            <CrearGastoOTV3
                isOpen={modalGasto}
                setIsOpen={setModalGasto}
                ordenId={orden.id}
            />
            <AgregarAdjuntoOTV3
                isOpen={modalAdjunto}
                setIsOpen={setModalAdjunto}
                ordenId={orden.id}
            />
            <FirmarGuiaOTV3
                isOpen={modalFirma}
                setIsOpen={setModalFirma}
                guia={guiaParaFirmar}
                ordenId={orden.id}
                firmantesOptions={firmantesOptions}
            />
        </div>
    );
};

export default PanelEjecucion;

