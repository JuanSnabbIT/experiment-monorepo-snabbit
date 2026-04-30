import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import type { IHistorialEstadoOTV3, IOrdenDeTrabajoV3 } from '@/interface/ordenTrabajoV3.interface';
import dayjs from 'dayjs';

interface IProps {
    orden: IOrdenDeTrabajoV3;
}

const PanelCierre = ({ orden }: IProps) => {
    const tareasCompletadas = orden.tareas?.filter((t) => t.estado === 'completada') ?? [];
    const tareasNoRealizadas = orden.tareas?.filter((t) => t.estado === 'no_realizada') ?? [];
    const tareasPendientes = orden.tareas?.filter((t) =>
        ['pendiente', 'en_proceso'].includes(t.estado),
    ) ?? [];

    return (
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            {/* Resumen de tareas */}
            <Card>
                <CardHeader>
                    <CardHeaderChild>Resumen de Tareas</CardHeaderChild>
                </CardHeader>
                <CardBody>
                    <div className='mb-4 grid grid-cols-3 gap-3'>
                        <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-700 dark:bg-emerald-900/20'>
                            <p className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
                                {tareasCompletadas.length}
                            </p>
                            <p className='text-xs text-emerald-600 dark:text-emerald-400'>
                                Completadas
                            </p>
                        </div>
                        <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-center dark:border-red-700 dark:bg-red-900/20'>
                            <p className='text-2xl font-bold text-red-600 dark:text-red-400'>
                                {tareasNoRealizadas.length}
                            </p>
                            <p className='text-xs text-red-600 dark:text-red-400'>No realizadas</p>
                        </div>
                        <div className='rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800'>
                            <p className='text-2xl font-bold text-zinc-600 dark:text-zinc-400'>
                                {tareasPendientes.length}
                            </p>
                            <p className='text-xs text-zinc-500'>Pendientes</p>
                        </div>
                    </div>

                    {orden.tareas && orden.tareas.length > 0 && (
                        <div className='space-y-2'>
                            {orden.tareas.map((t) => (
                                <div
                                    key={t.id}
                                    className='flex items-center justify-between rounded-lg border border-zinc-100 p-2 text-sm dark:border-zinc-800'>
                                    <div>
                                        <p className='font-medium'>{t.titulo}</p>
                                        {t.fecha_ejecutada && (
                                            <p className='text-xs text-zinc-400'>
                                                Ejecutada:{' '}
                                                {dayjs(t.fecha_ejecutada).format('DD/MM/YYYY')}
                                            </p>
                                        )}
                                    </div>
                                    <Badge
                                        color={
                                            t.estado === 'completada'
                                                ? 'emerald'
                                                : t.estado === 'no_realizada'
                                                  ? 'red'
                                                  : 'zinc'
                                        }>
                                        {t.estado_display}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Resumen de gastos */}
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        Gastos y Rendicion{' '}
                        <span className='text-sm font-normal text-zinc-500'>
                            Total: ${orden.total_gastos?.toLocaleString('es-CL') ?? '0'}
                        </span>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody>
                    {orden.gastos && orden.gastos.length > 0 ? (
                        <Table>
                            <THead>
                                <Tr>
                                    <Th>Detalle</Th>
                                    <Th>Cant.</Th>
                                    <Th>Total</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {orden.gastos.map((g) => (
                                    <Tr key={g.id}>
                                        <Td>{g.detalle}</Td>
                                        <Td>{g.cantidad}</Td>
                                        <Td>${parseFloat(g.monto_total).toLocaleString('es-CL')}</Td>
                                    </Tr>
                                ))}
                                <Tr>
                                    <Td colSpan={2} className='font-bold text-right'>
                                        TOTAL:
                                    </Td>
                                    <Td className='font-bold text-emerald-600'>
                                        ${typeof orden.total_gastos === 'number' ? orden.total_gastos.toLocaleString('es-CL') : '0'}
                                    </Td>
                                </Tr>
                            </TBody>
                        </Table>
                    ) : (
                        <p className='py-2 text-sm text-zinc-400'>Sin gastos registrados.</p>
                    )}
                </CardBody>
            </Card>

            {/* Historial de estados */}
            <Card className='lg:col-span-2'>
                <CardHeader>
                    <CardHeaderChild>Historial de Estados</CardHeaderChild>
                </CardHeader>
                <CardBody>
                    {orden.historial_estados && orden.historial_estados.length > 0 ? (
                        <div className='relative pl-4'>
                            <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700' />
                            <div className='space-y-4'>
                                {orden.historial_estados.map((h: IHistorialEstadoOTV3) => (
                                    <div key={h.id} className='relative'>
                                        <div className='absolute -left-5 top-1 h-2 w-2 rounded-full bg-blue-500' />
                                        <div className='text-sm'>
                                            <div className='flex items-center gap-2'>
                                                {h.estado_anterior && (
                                                    <>
                                                        <Badge color='zinc' className='text-xs'>
                                                            {h.estado_anterior.replace(/_/g, ' ')}
                                                        </Badge>
                                                        <span className='text-gray-400'>→</span>
                                                    </>
                                                )}
                                                <Badge color='blue' className='text-xs'>
                                                    {h.estado_nuevo.replace(/_/g, ' ')}
                                                </Badge>
                                                <span className='text-xs text-gray-400'>
                                                    {dayjs(h.fecha_creacion).format(
                                                        'DD/MM/YY HH:mm',
                                                    )}
                                                </span>
                                            </div>
                                            {h.usuario_nombre && (
                                                <p className='mt-0.5 text-xs text-gray-400'>
                                                    Por: {h.usuario_nombre}
                                                </p>
                                            )}
                                            {h.comentario && (
                                                <p className='mt-1 text-gray-600 dark:text-gray-400'>
                                                    {h.comentario}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className='text-sm text-gray-400'>Sin historial de estados.</p>
                    )}
                </CardBody>
            </Card>
        </div>
    );
};

export default PanelCierre;
