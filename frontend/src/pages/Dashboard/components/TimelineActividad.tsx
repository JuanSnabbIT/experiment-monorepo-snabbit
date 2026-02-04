import Icon from '@/components/icon/Icon';
import LoaderDots from '@/components/LoaderDots.common';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import ApiService from '@/services/ApiService';
import { TIcons } from '@/types/icons.type';
import classNames from 'classnames';
import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Interfaz para actividad
export interface IActividadItem {
    id: number;
    tipo: 'ot' | 'cotizacion' | 'rendicion' | 'contrato' | 'visita';
    titulo: string;
    subtitulo: string;
    estado: string;
    estado_display?: string;
    fecha: string;
    icono: TIcons;
    color: string;
}

interface ITimelineActividadProps {
    limite?: number;
    className?: string;
}

// Mapeo de colores a clases
const colorClasses: Record<string, string> = {
    blue: 'text-blue-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    purple: 'text-purple-500',
    rose: 'text-rose-500',
    zinc: 'text-zinc-500',
    sky: 'text-sky-500',
};

const colorBgClasses: Record<string, string> = {
    blue: 'bg-blue-500/10',
    emerald: 'bg-emerald-500/10',
    amber: 'bg-amber-500/10',
    purple: 'bg-purple-500/10',
    rose: 'bg-rose-500/10',
    zinc: 'bg-zinc-100 dark:bg-zinc-800',
    sky: 'bg-sky-500/10',
};

/**
 * TimelineActividad - Componente de timeline que muestra actividad reciente
 * Inspirado en el Timeline del template fyr-vite
 */
const TimelineActividad: FC<ITimelineActividadProps> = ({ limite = 10, className }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [actividades, setActividades] = useState<IActividadItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchActividades = async () => {
            setLoading(true);
            try {
                const response = await ApiService.fetchData<{
                    actividades: IActividadItem[];
                    total: number;
                }>({
                    url: `/api/actividad-reciente/lista/?limite=${limite}`,
                    method: 'get',
                });
                setActividades(response.data.actividades);
                setError(null);
            } catch (err) {
                setError('Error al cargar actividad');
                console.error('Error fetching actividades:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchActividades();
    }, [limite]);

    const formatDate = (dateStr: string): string => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) {
            return `hace ${diffMins} min`;
        } else if (diffHours < 24) {
            return `hace ${diffHours}h`;
        } else if (diffDays < 7) {
            return `hace ${diffDays}d`;
        } else {
            return date.toLocaleDateString('es-CL', {
                day: '2-digit',
                month: 'short',
            });
        }
    };

    const handleClick = (actividad: IActividadItem) => {
        switch (actividad.tipo) {
            case 'ot':
                navigate(`/ordenes-trabajo/${actividad.id}`);
                break;
            case 'cotizacion':
                navigate(`/cotizaciones/${actividad.id}`);
                break;
            case 'rendicion':
                navigate(`/rendiciones/${actividad.id}`);
                break;
            default:
                break;
        }
    };

    return (
        <Card className={classNames('h-full', className)}>
            <CardHeader>
                <CardHeaderChild>
                    <Icon icon='HeroClock' className='mr-2 text-xl text-blue-500' />
                    <Badge className='text-lg'>Actividad Reciente</Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='max-h-96 overflow-y-auto'>
                {loading ? (
                    <div className='flex justify-center py-8'>
                        <LoaderDots />
                    </div>
                ) : error ? (
                    <p className='py-4 text-center text-sm text-rose-500'>{error}</p>
                ) : actividades.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-8 text-zinc-400'>
                        <Icon icon='HeroInbox' className='mb-2 text-4xl' />
                        <p className='text-sm'>Sin actividad reciente</p>
                    </div>
                ) : (
                    <div className='flex flex-col gap-3'>
                        {actividades.map((actividad, index) => (
                            <div
                                key={`${actividad.tipo}-${actividad.id}`}
                                className='flex gap-3 cursor-pointer rounded-lg p-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                onClick={() => handleClick(actividad)}>
                                {/* Icono con línea */}
                                <div className='flex flex-col items-center'>
                                    <div
                                        className={classNames(
                                            'flex h-8 w-8 items-center justify-center rounded-full',
                                            colorBgClasses[actividad.color] || colorBgClasses.zinc,
                                        )}>
                                        <Icon
                                            icon={actividad.icono}
                                            className={classNames(
                                                'text-lg',
                                                colorClasses[actividad.color] || colorClasses.zinc,
                                            )}
                                        />
                                    </div>
                                    {index < actividades.length - 1 && (
                                        <div className='mt-1 h-full min-h-4 w-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700' />
                                    )}
                                </div>

                                {/* Contenido */}
                                <div className='flex-1 min-w-0'>
                                    <p className='truncate text-sm font-medium text-zinc-900 dark:text-white'>
                                        {actividad.titulo}
                                    </p>
                                    <p className='truncate text-xs text-zinc-500'>
                                        {actividad.subtitulo}
                                    </p>
                                    <div className='mt-1 flex items-center gap-2'>
                                        <span className='text-xs text-zinc-400'>
                                            {formatDate(actividad.fecha)}
                                        </span>
                                        {actividad.estado_display && (
                                            <Badge
                                                variant='outline'
                                                color={
                                                    actividad.estado === 'aceptada'
                                                        ? 'emerald'
                                                        : actividad.estado === 'rechazada'
                                                          ? 'red'
                                                          : 'amber'
                                                }
                                                className='text-xs py-0'>
                                                {actividad.estado_display}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Flecha */}
                                <div className='flex items-center text-zinc-300 dark:text-zinc-600'>
                                    <Icon icon='HeroChevronRight' />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default TimelineActividad;
