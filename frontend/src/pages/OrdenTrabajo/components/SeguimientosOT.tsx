import { ChangeEvent, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Icon from '@/components/icon/Icon';
import Input from '@/components/form/Input';
import { useGetSeguimientosOTQuery } from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { TIPO_SEGUIMIENTO } from '@/constants/ordentrabajo.constant';
import { TColors } from '@/types/colors.type';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

const SeguimientosOT = ({ ordenId }: { ordenId: number | undefined }) => {
    const {
        data: listaSeguimientosOT = [],
        isLoading: loading,
    } = useGetSeguimientosOTQuery(
        { ordenId: ordenId || '' },
        { skip: !ordenId },
    );
    const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');
    const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());

    const obtenerIconoTipo = (tipo: string) => {
        const match = TIPO_SEGUIMIENTO.find((item) => item.value === tipo);
        return match?.icon || 'HeroChatBubbleLeft';
    };

    const obtenerColorTipo = (tipo: string): TColors => {
        const match = TIPO_SEGUIMIENTO.find((item) => item.value === tipo);
        return (match?.color || 'gray') as TColors;
    };

    const obtenerLabelTipo = (tipo: string): string => {
        const match = TIPO_SEGUIMIENTO.find((item) => item.value === tipo);
        return match?.label || tipo;
    };

    const toggleExpand = (id: number) => {
        setExpandedComments((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const highlightText = (text: string, query: string) => {
        if (!query.trim()) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? (
                <mark key={i} className='bg-yellow-200 font-semibold'>
                    {part}
                </mark>
            ) : (
                part
            ),
        );
    };

    const getDateLabel = (date: string): string => {
        const d = dayjs(date);
        const today = dayjs().startOf('day');
        const yesterday = today.subtract(1, 'day');
        if (d.isSame(today, 'day')) return 'Hoy';
        if (d.isSame(yesterday, 'day')) return 'Ayer';
        return d.format('DD [de] MMMM, YYYY');
    };

    const filtradosPorTipo = selectedTipo
        ? listaSeguimientosOT.filter((seg) => seg.tipo === selectedTipo)
        : listaSeguimientosOT;

    const seguimientosFiltrados = searchText.trim()
        ? filtradosPorTipo.filter((seg) => {
              const query = searchText.toLowerCase();
              return (
                  (seg.comentario || '').toLowerCase().includes(query) ||
                  (seg.usuario_nombre || '').toLowerCase().includes(query) ||
                  (seg.servicio_nombre || '').toLowerCase().includes(query) ||
                  (seg.soporte_nombre || '').toLowerCase().includes(query)
              );
          })
        : filtradosPorTipo;

    const tiposUnicos = Array.from(new Set(listaSeguimientosOT.map((seg) => seg.tipo)));

    if (loading) {
        return (
            <Card className='w-full'>
                <CardHeader>
                    <Badge className='text-xl'>Comentarios</Badge>
                </CardHeader>
                <CardBody>
                    <div className='text-sm text-gray-500'>Cargando comentarios...</div>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card className='w-full'>
            <CardHeader>
                <div className='flex w-full flex-col gap-3'>
                    <div className='flex flex-wrap items-center justify-between gap-4'>
                        <Badge className='text-xl'>Comentarios</Badge>
                        <div className='w-64'>
                            <Input
                                name='buscar_seguimientos'
                                type='text'
                                placeholder='Buscar en comentarios...'
                                value={searchText}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setSearchText(e.target.value)
                                }
                                className='text-sm'
                            />
                        </div>
                    </div>
                    {tiposUnicos.length > 0 && (
                        <div className='flex flex-wrap gap-2'>
                            <button
                                onClick={() => setSelectedTipo(null)}
                                className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                                    selectedTipo === null
                                        ? 'bg-gray-700 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}>
                                Todos ({listaSeguimientosOT.length})
                            </button>
                            {tiposUnicos.map((tipo) => {
                                const count = listaSeguimientosOT.filter(
                                    (seg) => seg.tipo === tipo,
                                ).length;
                                const color = obtenerColorTipo(tipo);
                                return (
                                    <button
                                        key={tipo}
                                        onClick={() => setSelectedTipo(tipo)}
                                        className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                                            selectedTipo === tipo
                                                ? `bg-${color}-600 text-white`
                                                : `bg-${color}-100 text-${color}-700 hover:bg-${color}-200`
                                        }`}>
                                        {obtenerLabelTipo(tipo)} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardBody className='h-full w-full'>
                {seguimientosFiltrados.length > 0 ? (
                    <div className='overflow-x-auto'>
                        {(() => {
                            const sorted = seguimientosFiltrados
                                .slice()
                                .sort(
                                    (a, b) =>
                                        new Date(b.fecha_creacion).getTime() -
                                        new Date(a.fecha_creacion).getTime(),
                                );
                            return (
                                <div className='flex gap-4 pb-2'>
                                    {sorted.map((seguimiento) => {
                                        const isExpanded = expandedComments.has(seguimiento.id);
                                        const comentario = seguimiento.comentario || '';
                                        const isLongComment = comentario.length > 150;
                                        const hasOrigen =
                                            !!seguimiento.servicio_nombre ||
                                            !!seguimiento.soporte_nombre;
                                        return (
                                            <div
                                                key={seguimiento.id}
                                                className='w-80 flex-shrink-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm'>
                                                <div className='mb-2 flex items-center gap-2'>
                                                    <Icon
                                                        icon={obtenerIconoTipo(seguimiento.tipo)}
                                                        className='text-lg'
                                                    />
                                                    <Badge
                                                        color={obtenerColorTipo(seguimiento.tipo)}>
                                                        {obtenerLabelTipo(seguimiento.tipo)}
                                                    </Badge>
                                                    <span className='ml-auto text-xs text-gray-500'>
                                                        {dayjs(seguimiento.fecha_creacion).format(
                                                            'DD/MM/YYYY HH:mm',
                                                        )}
                                                    </span>
                                                </div>
                                                <div className='text-xs text-gray-500'>
                                                    {seguimiento.usuario_nombre ||
                                                        'Usuario Desconocido'}
                                                </div>
                                                <div className='mb-2 text-xs text-gray-400'>
                                                    {getDateLabel(seguimiento.fecha_creacion)}
                                                </div>
                                                <div className='mb-2 flex flex-wrap gap-2 text-xs'>
                                                    {seguimiento.servicio_nombre && (
                                                        <span className='inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-blue-700'>
                                                            <Icon
                                                                icon='HeroWrenchScrewdriver'
                                                                className='h-3 w-3'
                                                            />
                                                            Servicio: {seguimiento.servicio_nombre}
                                                        </span>
                                                    )}
                                                    {seguimiento.soporte_nombre && (
                                                        <span className='inline-flex items-center gap-1 rounded bg-violet-50 px-2 py-1 text-violet-700'>
                                                            <Icon
                                                                icon='HeroComputerDesktop'
                                                                className='h-3 w-3'
                                                            />
                                                            Soporte: {seguimiento.soporte_nombre}
                                                        </span>
                                                    )}
                                                    {!hasOrigen && (
                                                        <span className='inline-flex items-center rounded bg-gray-100 px-2 py-1 text-gray-600'>
                                                            Orden de trabajo
                                                        </span>
                                                    )}
                                                </div>
                                                {comentario ? (
                                                    <div className='relative'>
                                                        <div
                                                            className={`flex-1 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm leading-relaxed ${
                                                                !isExpanded && isLongComment
                                                                    ? 'line-clamp-3'
                                                                    : ''
                                                            }`}>
                                                            {highlightText(comentario, searchText)}
                                                        </div>
                                                        <div className='mt-1 flex gap-2'>
                                                            {isLongComment && (
                                                                <button
                                                                    onClick={() =>
                                                                        toggleExpand(seguimiento.id)
                                                                    }
                                                                    className='text-xs text-blue-600 hover:underline'>
                                                                    {isExpanded
                                                                        ? 'Ver menos'
                                                                        : 'Ver mas'}
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() =>
                                                                    copyToClipboard(comentario)
                                                                }
                                                                className='flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800'>
                                                                <Icon
                                                                    icon='HeroClipboard'
                                                                    className='h-3 w-3'
                                                                />
                                                                Copiar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className='italic text-gray-400'>
                                                        Sin comentario
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    <div className='py-8 text-center text-gray-500'>
                        {listaSeguimientosOT.length === 0
                            ? 'No hay comentarios registrados'
                            : 'No hay comentarios que coincidan con la busqueda'}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default SeguimientosOT;
