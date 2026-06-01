import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import type { IContratoTrabajadorHistorialEvento, TActorTipoContrato } from '@/interface/rrhh.interface';
import { useGetHistorialContratoTrabajadorQuery } from '@/store/slices/rrhh/contratoTrabajadorApi';
import dayjs from 'dayjs';
import { useState } from 'react';

interface ITabHistorialProps {
    contratoId: number;
    empleadorNombre?: string | null;
    prestadoraNombre?: string | null;
}

type TFiltroActor = 'todos' | 'sin_sistema' | TActorTipoContrato;

const ACTOR_CONFIG: Record<TActorTipoContrato, { label: string; dot: string; badge: 'zinc' | 'blue' | 'amber' }> = {
    sistema: { label: 'Sistema', dot: 'bg-zinc-400', badge: 'zinc' },
    rrhh: { label: 'RRHH', dot: 'bg-blue-500', badge: 'blue' },
    cliente: { label: 'Empleador', dot: 'bg-amber-400', badge: 'amber' },
};

const EVENTO_LABEL: Record<string, string> = {
    creacion: 'Contrato creado',
    modificacion_campos: 'Campos modificados',
    cambio_estado: 'Cambio de estado',
    envio_aprobacion: 'Enviado a aprobacion',
    aprobacion: 'Aprobado por empleador',
    rechazo: 'Rechazado por empleador',
    solicitud_cambio: 'Cambios solicitados',
    anexo_creado: 'Anexo creado',
    eliminacion: 'Registro eliminado',
};

const TabHistorialTrabajador = ({ contratoId, empleadorNombre, prestadoraNombre }: ITabHistorialProps) => {
    const rrhhLabel = prestadoraNombre ?? 'RRHH';
    const empleadorLabel = empleadorNombre ?? 'Empleador';
    const { data: eventos = [], isLoading, isError } = useGetHistorialContratoTrabajadorQuery(contratoId);
    const [filtro, setFiltro] = useState<TFiltroActor>('sin_sistema');
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const eventosFiltrados =
        filtro === 'todos'
            ? eventos
            : filtro === 'sin_sistema'
              ? eventos.filter((e: IContratoTrabajadorHistorialEvento) => e.actor_tipo !== 'sistema')
              : eventos.filter((e: IContratoTrabajadorHistorialEvento) => e.actor_tipo === filtro);

    const conteoActor = (tipo: TActorTipoContrato) =>
        eventos.filter((e: IContratoTrabajadorHistorialEvento) => e.actor_tipo === tipo).length;

    if (isLoading) {
        return (
            <Card>
                <CardBody>
                    <p className='text-sm text-zinc-400'>Cargando historial...</p>
                </CardBody>
            </Card>
        );
    }

    if (isError) {
        return (
            <Card>
                <CardBody>
                    <p className='text-sm text-red-400'>No se pudo cargar el historial.</p>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <span>Historial de cambios</span>
                <div className='flex gap-2 text-sm'>
                    <Button
                        size='sm'
                        variant={filtro === 'sin_sistema' ? 'solid' : 'outline'}
                        color='zinc'
                        onClick={() => setFiltro('sin_sistema')}>
                        Principales ({eventos.filter((e: IContratoTrabajadorHistorialEvento) => e.actor_tipo !== 'sistema').length})
                    </Button>
                    <Button
                        size='sm'
                        variant={filtro === 'todos' ? 'solid' : 'outline'}
                        color='zinc'
                        onClick={() => setFiltro(filtro === 'todos' ? 'sin_sistema' : 'todos')}>
                        Todos ({eventos.length})
                    </Button>
                    <Button
                        size='sm'
                        variant={filtro === 'rrhh' ? 'solid' : 'outline'}
                        color='blue'
                        onClick={() => setFiltro('rrhh')}>
                        {rrhhLabel} ({conteoActor('rrhh')})
                    </Button>
                    <Button
                        size='sm'
                        variant={filtro === 'cliente' ? 'solid' : 'outline'}
                        color='amber'
                        onClick={() => setFiltro('cliente')}>
                        {empleadorLabel} ({conteoActor('cliente')})
                    </Button>
                </div>
            </CardHeader>
            <CardBody>
                {eventosFiltrados.length === 0 ? (
                    <p className='text-sm text-zinc-400 italic'>Sin eventos para el filtro seleccionado.</p>
                ) : (
                    <div className='space-y-0'>
                        {eventosFiltrados.map((evento: IContratoTrabajadorHistorialEvento, idx: number) => {
                            const esUltimo = idx === eventosFiltrados.length - 1;
                            const cfg = ACTOR_CONFIG[evento.actor_tipo];
                            const tieneCambios = evento.cambios.length > 0;
                            const isExpanded = expanded.has(evento.id);

                            return (
                                <div key={evento.id} className='flex gap-4'>
                                    {/* Dot + linea vertical */}
                                    <div className='flex flex-col items-center'>
                                        <div
                                            className={`mt-1 h-3 w-3 flex-shrink-0 rounded-full ${cfg.dot}`}
                                        />
                                        {!esUltimo && (
                                            <div className='mt-1 w-0.5 flex-1 bg-zinc-200 dark:bg-zinc-700' />
                                        )}
                                    </div>
                                    {/* Contenido */}
                                    <div className={`${esUltimo ? 'pb-2' : 'pb-6'} min-w-0 flex-1`}>
                                        <div className='flex flex-wrap items-center gap-2'>
                                            <p className='text-sm font-semibold text-zinc-800 dark:text-zinc-100'>
                                                {EVENTO_LABEL[evento.evento_tipo] ?? evento.evento_tipo}
                                            </p>
                                            <Badge color={cfg.badge} variant='outline'>
                                                {evento.actor_tipo === 'rrhh'
                                                    ? rrhhLabel
                                                    : evento.actor_tipo === 'cliente'
                                                      ? empleadorLabel
                                                      : cfg.label}
                                            </Badge>
                                        </div>
                                        <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
                                            {dayjs(evento.fecha).format('DD/MM/YYYY HH:mm')}
                                            {evento.actor_nombre && (
                                                <span className='ml-2 text-zinc-400'>— {evento.actor_nombre}</span>
                                            )}
                                        </p>
                                        <p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
                                            {evento.detalle}
                                        </p>
                                        {tieneCambios && (
                                            <button
                                                type='button'
                                                onClick={() => toggleExpand(evento.id)}
                                                className='mt-1 text-xs text-blue-500 hover:underline'>
                                                {isExpanded
                                                    ? 'Ocultar detalle'
                                                    : `Ver ${evento.cambios.length} campo${evento.cambios.length > 1 ? 's' : ''} modificado${evento.cambios.length > 1 ? 's' : ''}`}
                                            </button>
                                        )}
                                        {tieneCambios && isExpanded && (
                                            <div className='mt-2 rounded border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800'>
                                                <table className='w-full text-xs'>
                                                    <thead>
                                                        <tr className='text-left text-zinc-500'>
                                                            <th className='pb-1 pr-3 font-medium'>Campo</th>
                                                            <th className='pb-1 pr-3 font-medium'>Anterior</th>
                                                            <th className='pb-1 font-medium'>Nuevo</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {evento.cambios.map((c, ci) => (
                                                            <tr key={ci} className='border-t border-zinc-200 dark:border-zinc-700'>
                                                                <td className='py-1 pr-3 font-medium text-zinc-700 dark:text-zinc-300'>
                                                                    {c.campo}
                                                                </td>
                                                                <td className='py-1 pr-3 text-red-500'>
                                                                    {c.valor_anterior ?? '—'}
                                                                </td>
                                                                <td className='py-1 text-emerald-600 dark:text-emerald-400'>
                                                                    {c.valor_nuevo ?? '—'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default TabHistorialTrabajador;

