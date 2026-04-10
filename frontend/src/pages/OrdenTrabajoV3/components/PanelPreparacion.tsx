import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import type {
    IAsignacionTecnicoOTV3,
    ICotizacionResumenOTV3,
    IItemGuiaSalidaResumenOTV3,
    IOrdenDeTrabajoV3,
    ITareaOTV3,
} from '@/interface/ordenTrabajoV3.interface';
import {
    useCrearTareasEntregaGuiaV3Mutation,
    useDeleteAsignacionV3Mutation,
    useDeleteTareaV3Mutation,
    useDesvincularCotizacionV3Mutation,
    useDesvincularGuiaV3Mutation,
} from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useState } from 'react';
import { toast } from 'react-toastify';
import AgregarTareaOTV3 from '../modals/AgregarTareaOTV3';
import AsignarTecnicoOTV3 from '../modals/AsignarTecnicoOTV3';
import CrearGuiaRapidaOTV3 from '../modals/CrearGuiaRapidaOTV3';
import VincularCotizacionOTV3 from '../modals/VincularCotizacionOTV3';

interface IProps {
    orden: IOrdenDeTrabajoV3;
    tecnicosOptions: TSelectOption[];
    receptoresOptions: TSelectOption[];
    bodegasOptions: TSelectOption[];
    onTareaClick?: (tarea: ITareaOTV3) => void;
}

const ESTADO_TAREA_COLOR: Record<string, string> = {
    pendiente: 'zinc',
    en_proceso: 'blue',
    completada: 'emerald',
    no_realizada: 'red',
};

const PanelPreparacion = ({ orden, tecnicosOptions, receptoresOptions, bodegasOptions, onTareaClick }: IProps) => {
    const [deleteAsignacion] = useDeleteAsignacionV3Mutation();
    const [deleteTarea] = useDeleteTareaV3Mutation();
    const [desvincularCotizacion] = useDesvincularCotizacionV3Mutation();
    const [desvincularGuia] = useDesvincularGuiaV3Mutation();
    const [crearTareasEntrega, { isLoading: isCreandoTareas }] = useCrearTareasEntregaGuiaV3Mutation();

    const [modalTarea, setModalTarea] = useState(false);
    const [modalTecnico, setModalTecnico] = useState(false);
    const [modalCotizacion, setModalCotizacion] = useState(false);
    const [modalGuiaRapida, setModalGuiaRapida] = useState(false);
    const [cotizacionParaGuia, setCotizacionParaGuia] = useState<ICotizacionResumenOTV3 | null>(
        null,
    );
    const [receptorPorItem, setReceptorPorItem] = useState<Record<number, number | null>>({});
    const [expandedCot, setExpandedCot] = useState<Set<number>>(new Set());

    const cotizaciones = orden.cotizaciones_detalle ?? [];
    const guiasDeOT = orden.guias_vinculadas ?? [];

    // Items de todas las guias vinculadas para asignacion de equipos
    const itemsConEntrega: (IItemGuiaSalidaResumenOTV3 & { guia_id: number })[] = guiasDeOT.flatMap(
        (g) => (g.items_detalle ?? []).map((item) => ({ ...item, guia_id: g.id })),
    );

    const handleRemoveTarea = async (tareaId: number) => {
        try {
            await deleteTarea({ ordenId: orden.id, tareaId }).unwrap();
            toast.success('Tarea eliminada');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleRemoveAsignacion = async (asig: IAsignacionTecnicoOTV3) => {
        try {
            await deleteAsignacion({ ordenId: orden.id, asignacionId: asig.id }).unwrap();
            toast.success('Tecnico removido');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleDesvincularCotizacion = async (cotizacionId: number) => {
        try {
            await desvincularCotizacion({ ordenId: orden.id, cotizacion_id: cotizacionId }).unwrap();
            toast.success('Cotizacion desvinculada');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleDesvincularGuia = async (guiaId: number) => {
        try {
            await desvincularGuia({ ordenId: orden.id, guia_id: guiaId }).unwrap();
            toast.success('Guia de salida desvinculada');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleCrearGuiaRapida = (cotizacion: ICotizacionResumenOTV3) => {
        setCotizacionParaGuia(cotizacion);
        setModalGuiaRapida(true);
    };

    const handleCrearTareasEntrega = async () => {
        const asignaciones = Object.entries(receptorPorItem)
            .filter(([, v]) => v !== null)
            .map(([itemId, receptorId]) => ({
                item_guia_id: Number(itemId),
                usuario_receptor_id: receptorId as number,
            }));
        if (asignaciones.length === 0) return;
        try {
            const result = await crearTareasEntrega({ ordenId: orden.id, asignaciones }).unwrap();
            toast.success(`${result.tareas_creadas} tarea(s) de entrega creada(s)`);
            setReceptorPorItem({});
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            {/* Informacion principal */}
            <Card>
                <CardHeader>
                    <CardHeaderChild>Informacion de la OT</CardHeaderChild>
                </CardHeader>
                <CardBody>
                    <dl className='space-y-3 text-sm'>
                        <div className='flex gap-2'>
                            <dt className='w-36 shrink-0 text-gray-500'>Cliente:</dt>
                            <dd className='font-medium'>{orden.cliente_nombre ?? '-'}</dd>
                        </div>
                        <div className='flex gap-2'>
                            <dt className='w-36 shrink-0 text-gray-500'>Modalidad:</dt>
                            <dd>{orden.modalidad_display}</dd>
                        </div>
                        <div className='flex gap-2'>
                            <dt className='w-36 shrink-0 text-gray-500'>Prioridad:</dt>
                            <dd>{orden.prioridad_display}</dd>
                        </div>
                        <div className='flex gap-2'>
                            <dt className='w-36 shrink-0 text-gray-500'>Fecha programada:</dt>
                            <dd>
                                {orden.fecha_programada
                                    ? dayjs(orden.fecha_programada).format('DD/MM/YYYY HH:mm')
                                    : '-'}
                            </dd>
                        </div>
                        {orden.descripcion && (
                            <div className='flex flex-col gap-1'>
                                <dt className='text-gray-500'>Descripcion:</dt>
                                <dd className='whitespace-pre-wrap rounded-md bg-gray-50 p-2 dark:bg-gray-800'>
                                    {orden.descripcion}
                                </dd>
                            </div>
                        )}
                    </dl>
                </CardBody>
            </Card>

            {/* Equipo de trabajo */}
            <Card>
                <CardHeader>
                    <CardHeaderChild>Equipo de Trabajo</CardHeaderChild>
                    <Button
                        icon='HeroPlus'
                        size='sm'
                        variant='outline'
                        onClick={() => setModalTecnico(true)}>
                        Asignar
                    </Button>
                </CardHeader>
                <CardBody>
                    {orden.asignaciones && orden.asignaciones.length > 0 ? (
                        <Table>
                            <THead>
                                <Tr>
                                    <Th>Tecnico</Th>
                                    <Th>Rol</Th>
                                    <Th>{' '}</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {orden.asignaciones.map((a) => (
                                    <Tr key={a.id}>
                                        <Td>{a.tecnico_nombre}</Td>
                                        <Td>
                                            <Badge color='blue'>{a.rol_display}</Badge>
                                        </Td>
                                        <Td>
                                            <Tooltip text='Remover'>
                                                <Button
                                                    icon='HeroTrash'
                                                    size='sm'
                                                    color='red'
                                                    onClick={() => handleRemoveAsignacion(a)}
                                                />
                                            </Tooltip>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    ) : (
                        <p className='text-sm text-gray-400'>Sin tecnicos asignados aun.</p>
                    )}
                </CardBody>
            </Card>

            {/* Tareas definidas */}
            <Card className='lg:col-span-2'>
                <CardHeader>
                    <CardHeaderChild>
                        Tareas Definidas{' '}
                        <span className='text-sm font-normal text-gray-500'>
                            ({orden.tareas_completadas}/{orden.total_tareas})
                        </span>
                    </CardHeaderChild>
                    <Button
                        icon='HeroPlus'
                        size='sm'
                        variant='outline'
                        onClick={() => setModalTarea(true)}>
                        Agregar tarea
                    </Button>
                </CardHeader>
                <CardBody>
                    {orden.tareas && orden.tareas.length > 0 ? (
                        <Table>
                            <THead>
                                <Tr>
                                    <Th>Tarea</Th>
                                    <Th>Tecnico</Th>
                                    <Th>Fecha programada</Th>
                                    <Th>Estado</Th>
                                    <Th>Firma</Th>
                                    <Th>{' '}</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {orden.tareas.map((t) => (
                                    <Tr
                                        key={t.id}
                                        className='cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                        onClick={() => onTareaClick?.(t)}>
                                        <Td>{t.titulo}</Td>
                                        <Td>{t.tecnico_asignado_nombre ?? '-'}</Td>
                                        <Td>
                                            {t.fecha_programada
                                                ? dayjs(t.fecha_programada).format('DD/MM/YY HH:mm')
                                                : '-'}
                                        </Td>
                                        <Td>
                                            <Badge color={ESTADO_TAREA_COLOR[t.estado] as any}>
                                                {t.estado_display}
                                            </Badge>
                                        </Td>
                                        <Td>
                                            {t.requiere_firma ? (
                                                <Badge color='amber'>Requiere firma</Badge>
                                            ) : (
                                                <span className='text-gray-400'>-</span>
                                            )}
                                        </Td>
                                        <Td onClick={(e) => e.stopPropagation()}>
                                            <Tooltip text='Eliminar tarea'>
                                                <Button
                                                    icon='HeroTrash'
                                                    size='sm'
                                                    color='red'
                                                    onClick={() => handleRemoveTarea(t.id)}
                                                />
                                            </Tooltip>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    ) : (
                        <p className='py-4 text-center text-sm text-gray-400'>
                            No hay tareas definidas. Agrega tareas antes de iniciar la ejecucion.
                        </p>
                    )}
                </CardBody>
            </Card>

            {/* Cotizaciones de la OT — card unificado */}
            <Card className='lg:col-span-2'>
                <CardHeader>
                    <CardHeaderChild>
                        Cotizaciones de la OT
                        {cotizaciones.length > 0 && (
                            <Badge color='emerald' className='ml-2'>
                                {cotizaciones.length}
                            </Badge>
                        )}
                    </CardHeaderChild>
                    <Button
                        icon='HeroLink'
                        size='sm'
                        variant='outline'
                        onClick={() => setModalCotizacion(true)}>
                        {cotizaciones.length > 0 ? 'Gestionar' : 'Vincular cotizacion'}
                    </Button>
                </CardHeader>
                <CardBody>
                    {cotizaciones.length === 0 ? (
                        <p className='py-2 text-sm text-gray-400'>
                            Sin cotizaciones vinculadas. Vincula una cotizacion aceptada del cliente
                            para gestionar sus guias de salida por separado.
                        </p>
                    ) : (
                        <div className='space-y-4'>
                            {cotizaciones.map((cotizacion) => {
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
                                        className='rounded-lg border border-gray-200 dark:border-gray-700'>
                                        {/* Cabecera de cotizacion */}
                                        <div className='flex items-center justify-between gap-3 rounded-t-lg border-b border-gray-200 bg-blue-50 px-4 py-3 dark:border-gray-700 dark:bg-blue-900/20'>
                                            <div className='min-w-0'>
                                                <p className='truncate font-semibold text-blue-800 dark:text-blue-300'>
                                                    #{cotizacion.numero_cotizacion} —{' '}
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
                                            <Tooltip text='Desvincular cotizacion'>
                                                <Button
                                                    size='sm'
                                                    color='red'
                                                    icon='HeroXMark'
                                                    onClick={() =>
                                                        void handleDesvincularCotizacion(
                                                            cotizacion.id,
                                                        )
                                                    }
                                                />
                                            </Tooltip>
                                        </div>

                                        {/* Items — siempre visibles */}
                                        <div className='px-4 pt-3'>
                                            {cotizacion.items && cotizacion.items.length > 0 ? (
                                                <div className='overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700'>
                                                    <table className='w-full text-sm'>
                                                        <thead className='bg-gray-100 text-xs font-semibold uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400'>
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
                                                                    <td className='px-3 py-2 text-gray-700 dark:text-gray-300'>
                                                                        {item.nombre}
                                                                    </td>
                                                                    <td className='px-3 py-2 text-xs text-gray-500 dark:text-gray-400'>
                                                                        {item.proveedor_empresa_nombre ??
                                                                            '—'}
                                                                    </td>
                                                                    <td className='px-3 py-2 text-right text-gray-600 dark:text-gray-400'>
                                                                        {item.cantidad}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className='text-sm text-gray-400'>
                                                    Sin items registrados.
                                                </p>
                                            )}
                                        </div>

                                        {/* Resumen guias + toggle */}
                                        <div className='flex items-center justify-between px-4 py-3'>
                                            <span className='text-sm text-gray-500'>
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
                                            <div className='space-y-4 border-t border-gray-200 px-4 pb-4 pt-3 dark:border-gray-700'>
                                                {/* Alerta equipos */}
                                                {cotizacion.tiene_equipos && (
                                                    <div className='flex items-start gap-2 rounded-lg border border-violet-300 bg-violet-50 p-3 text-sm text-violet-800 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-300'>
                                                        <span className='font-semibold'>
                                                            Atencion:
                                                        </span>
                                                        Esta cotizacion incluye equipos. Crea tareas
                                                        de tipo &quot;Entrega de equipo&quot; para
                                                        registrar la asignacion a usuarios.
                                                    </div>
                                                )}

                                                {/* Guias de salida */}
                                                <div>
                                                    <div className='mb-2 flex items-center justify-between'>
                                                        <p className='text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                                                            Guias de Salida
                                                        </p>
                                                        <Button
                                                            size='sm'
                                                            icon='HeroDocumentArrowDown'
                                                            variant='outline'
                                                            onClick={() =>
                                                                handleCrearGuiaRapida(cotizacion)
                                                            }>
                                                            Crear guia
                                                        </Button>
                                                    </div>
                                                    {guiasDeEstaCot.length === 0 ? (
                                                        <p className='text-sm text-gray-400'>
                                                            Sin guias de salida para esta
                                                            cotizacion.
                                                        </p>
                                                    ) : (
                                                        <div className='space-y-2'>
                                                            {guiasDeEstaCot.map((g) => (
                                                                <div
                                                                    key={g.id}
                                                                    className='flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50'>
                                                                    <div>
                                                                        <p className='text-sm font-medium'>
                                                                            Guia #{g.id}{' '}
                                                                            <Badge
                                                                                color='blue'
                                                                                className='ml-1 text-xs'>
                                                                                {g.estado_label}
                                                                            </Badge>
                                                                        </p>
                                                                        <p className='text-xs text-gray-500'>
                                                                            {g.descripcion_items}
                                                                        </p>
                                                                    </div>
                                                                    <Tooltip text='Desvincular guia'>
                                                                        <Button
                                                                            size='sm'
                                                                            icon='HeroXMark'
                                                                            color='red'
                                                                            onClick={() =>
                                                                                void handleDesvincularGuia(
                                                                                    g.id,
                                                                                )
                                                                            }
                                                                        />
                                                                    </Tooltip>
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
                    )}
                </CardBody>
            </Card>

            {/* Asignacion de equipos desde guias */}
            {itemsConEntrega.length > 0 && (
                <Card className='lg:col-span-2'>
                    <CardHeader>
                        <CardHeaderChild>Asignacion de Equipos a Usuarios</CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        <p className='mb-4 text-sm text-gray-500'>
                            Asigna un receptor por item despachado en guia de salida para crear las
                            tareas de entrega correspondientes.
                        </p>
                        <div className='space-y-3'>
                            {itemsConEntrega.map((item) => {
                                const yaCreada = orden.tareas.some(
                                    (t) => t.item_guia_origen === item.id,
                                );
                                const serieStr =
                                    item.numero_serie &&
                                    typeof item.numero_serie === 'object' &&
                                    (item.numero_serie as Record<string, unknown>).serie
                                        ? String(
                                              (item.numero_serie as Record<string, unknown>).serie,
                                          )
                                        : null;
                                return (
                                    <div
                                        key={item.id}
                                        className='flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50 sm:flex-row sm:items-center sm:justify-between'>
                                        <div className='text-sm'>
                                            <p className='font-medium'>{item.nombre_item}</p>
                                            {serieStr && (
                                                <p className='text-xs text-gray-500'>
                                                    Serie: {serieStr}
                                                </p>
                                            )}
                                            <p className='text-xs text-gray-500'>
                                                Cant.: {item.cantidad_rebajada}
                                            </p>
                                        </div>
                                        {yaCreada ? (
                                            <Badge color='emerald'>Tarea creada</Badge>
                                        ) : (
                                            <div className='w-full sm:w-64'>
                                                <SelectReact
                                                    name={`receptor_item_${item.id}`}
                                                    placeholder='Receptor...'
                                                    options={receptoresOptions}
                                                    isClearable
                                                    value={
                                                        receptoresOptions.find(
                                                            (o) =>
                                                                Number(o.value) ===
                                                                receptorPorItem[item.id],
                                                        ) ?? null
                                                    }
                                                    onChange={(opt) =>
                                                        setReceptorPorItem((prev) => ({
                                                            ...prev,
                                                            [item.id]: opt
                                                                ? Number(
                                                                      (opt as TSelectOption).value,
                                                                  )
                                                                : null,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {itemsConEntrega.some(
                            (item) => !orden.tareas.some((t) => t.item_guia_origen === item.id),
                        ) && (
                            <div className='mt-4 flex justify-end'>
                                <Button
                                    variant='solid'
                                    icon='HeroCheck'
                                    isLoading={isCreandoTareas}
                                    isDisable={
                                        !Object.values(receptorPorItem).some((v) => v !== null)
                                    }
                                    onClick={() => void handleCrearTareasEntrega()}>
                                    Crear tareas de entrega
                                </Button>
                            </div>
                        )}
                    </CardBody>
                </Card>
            )}

            {/* Modales */}
            <AgregarTareaOTV3
                isOpen={modalTarea}
                setIsOpen={setModalTarea}
                ordenId={orden.id}
                tecnicosOptions={tecnicosOptions}
                receptoresOptions={receptoresOptions}
            />
            <AsignarTecnicoOTV3
                isOpen={modalTecnico}
                setIsOpen={setModalTecnico}
                ordenId={orden.id}
                tecnicosOptions={tecnicosOptions}
            />
            <VincularCotizacionOTV3
                isOpen={modalCotizacion}
                setIsOpen={setModalCotizacion}
                ordenId={orden.id}
                cotizacionesVinculadas={orden.cotizaciones_detalle ?? []}
            />
            <CrearGuiaRapidaOTV3
                isOpen={modalGuiaRapida}
                setIsOpen={(v) => {
                    setModalGuiaRapida(v);
                    if (!v) setCotizacionParaGuia(null);
                }}
                ordenId={orden.id}
                cotizacionId={cotizacionParaGuia?.id ?? null}
                bodegasOptions={bodegasOptions}
            />
        </div>
    );
};

export default PanelPreparacion;
