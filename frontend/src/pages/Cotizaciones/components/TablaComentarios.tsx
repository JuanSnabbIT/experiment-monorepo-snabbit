import Input from '@/components/form/Input'
import Icon from '@/components/icon/Icon'
import Badge from '@/components/ui/Badge'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import { TIPO_SEGUIMIENTO_COTIZACION } from '@/constants/cotizacion.constant'
import { TColors } from '@/types/colors.type'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import relativeTime from 'dayjs/plugin/relativeTime'
import { ChangeEvent, useState } from 'react'
import ModalCrearComentario from '../modals/ModalCrearComentario'

dayjs.extend(relativeTime)

dayjs.locale('es')

import { ICotizacion, ISeguimientoCotizacion } from '@/interface/cotizaciones.interface'

const TablaComentarios = ({
	cotizacion,
	comentarios = [],
	loading = false,
	onComentarioChange,
}: {
	cotizacion: ICotizacion | undefined;
	comentarios: ISeguimientoCotizacion[];
	loading?: boolean;
	onComentarioChange?: () => void;
}) => {
    const [selectedTipo, setSelectedTipo] = useState<string | null>(null)
    const [searchText, setSearchText] = useState('')
    const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())


    const obtenerIconoTipo = (tipo: string) => {
        const match = TIPO_SEGUIMIENTO_COTIZACION.find((item) => item.value === tipo)
        return match?.icon || 'HeroChatBubbleLeft'
    }

    const obtenerColorTipo = (tipo: string): TColors => {
        const match = TIPO_SEGUIMIENTO_COTIZACION.find((item) => item.value === tipo)
        return (match?.color || 'gray') as TColors
    }

    const obtenerLabelTipo = (tipo: string): string => {
        const match = TIPO_SEGUIMIENTO_COTIZACION.find((item) => item.value === tipo)
        return match?.label || tipo
    }

    const toggleExpand = (id: number) => {
        setExpandedComments((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    const highlightText = (text: string, query: string) => {
        if (!query.trim()) return text
        const regex = new RegExp(`(${query})`, 'gi')
        const parts = text.split(regex)
        return parts.map((part, i) =>
            regex.test(part) ? (
                <mark key={i} className="bg-yellow-200 font-semibold">
                    {part}
                </mark>
            ) : (
                part
            ),
        )
    }

    const getDateLabel = (date: string): string => {
        const d = dayjs(date)
        const today = dayjs().startOf('day')
        const yesterday = today.subtract(1, 'day')
        if (d.isSame(today, 'day')) return 'Hoy'
        if (d.isSame(yesterday, 'day')) return 'Ayer'
        return d.format('DD [de] MMMM, YYYY')
    }

    const filtradosPorTipo = selectedTipo
        ? comentarios.filter((seg) => seg.tipo === selectedTipo)
        : comentarios

    const seguimientosFiltrados = searchText.trim()
        ? filtradosPorTipo.filter((seg) =>
                (seg.comentario || '').toLowerCase().includes(searchText.toLowerCase()) ||
                (seg.usuario_nombre || '').toLowerCase().includes(searchText.toLowerCase()),
        )
        : filtradosPorTipo

    const tiposUnicos = Array.from(
        new Set(comentarios.map((seg) => seg.tipo)),
    )

    if (loading) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <Badge className="text-xl">Comentarios</Badge>
                </CardHeader>
                <CardBody>
                    <div className="text-sm text-gray-500">Cargando comentarios...</div>
                </CardBody>
            </Card>
        )
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex flex-col gap-3 w-full">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <Badge className="text-xl">Comentarios</Badge>
                        <div className="flex items-center gap-3">
                            <div className="w-64">
                                <Input
                                    name="buscar_comentarios"
                                    type="text"
                                    placeholder="Buscar en comentarios..."
                                    value={searchText}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                        setSearchText(e.target.value)
                                    }
                                    className="text-sm"
                                />
                            </div>
                            <ModalCrearComentario 
                                cotizacionId={cotizacion?.id} 
                                onComentarioChange={onComentarioChange} 
                            />
                        </div>
                    </div>
                    {tiposUnicos.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setSelectedTipo(null)}
                                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                    selectedTipo === null
                                        ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                }`}>
                                Todos ({comentarios.length})
                            </button>
                            {tiposUnicos.map((tipo) => {
                                const count = comentarios.filter(
                                    (seg) => seg.tipo === tipo,
                                ).length
                                const color = obtenerColorTipo(tipo)
                                return (
                                    <button
                                        key={tipo}
                                        onClick={() => setSelectedTipo(tipo)}
                                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                            selectedTipo === tipo
                                                ? `bg-${color}-600 text-white shadow-sm`
                                                : `bg-${color}-100/50 dark:bg-${color}-900/20 text-${color}-700 dark:text-${color}-300 hover:bg-${color}-200 dark:hover:bg-${color}-800/40`
                                        }`}>
                                        {obtenerLabelTipo(tipo)} ({count})
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardBody className="w-full h-full">
                {seguimientosFiltrados.length > 0 ? (
                    <div className="overflow-x-auto">
                        {(() => {
                            const sorted = seguimientosFiltrados
                                .slice()
                                .sort(
                                    (a, b) =>
                                        new Date(b.fecha).getTime() -
                                        new Date(a.fecha).getTime(),
                                )
                            return (
                                <div className="flex gap-4 pb-2">
                                    {sorted.map((seguimiento) => {
                                        const isExpanded = expandedComments.has(seguimiento.id)
                                        const comentario = seguimiento.comentario || ''
                                        const isLongComment = comentario.length > 150
                                        return (
                                            <div
                                                key={seguimiento.id}
                                                className="w-72 flex-shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-3 shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Icon
                                                        icon={obtenerIconoTipo(seguimiento.tipo)}
                                                        className="text-lg text-zinc-600 dark:text-zinc-400"
                                                    />
                                                    <Badge color={obtenerColorTipo(seguimiento.tipo)}>
                                                        {obtenerLabelTipo(seguimiento.tipo)}
                                                    </Badge>
                                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-medium ml-auto">
                                                        {dayjs(seguimiento.fecha).format('DD/MM/YYYY HH:mm')}
                                                    </span>
                                                </div>
                                                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">
                                                    {seguimiento.usuario_nombre || 'Usuario Desconocido'}
                                                </div>
                                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-2 italic">
                                                    {getDateLabel(seguimiento.fecha)}
                                                </div>
                                                {comentario ? (
                                                    <div className="relative">
                                                        <div
                                                            className={`p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg text-sm leading-relaxed whitespace-pre-wrap flex-1 text-zinc-700 dark:text-zinc-300 ${
                                                                !isExpanded && isLongComment
                                                                    ? 'line-clamp-3'
                                                                    : ''
                                                            }`}>
                                                            {highlightText(comentario, searchText)}
                                                        </div>
                                                        <div className="flex gap-2 mt-1">
                                                            {isLongComment && (
                                                                <button
                                                                    onClick={() =>
                                                                        toggleExpand(seguimiento.id)
                                                                    }
                                                                    className="text-xs text-blue-600 hover:underline">
                                                                    {isExpanded ? 'Ver menos' : 'Ver mas'}
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => copyToClipboard(comentario)}
                                                                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors">
                                                                <Icon
                                                                    icon="HeroClipboard"
                                                                    className="w-3 h-3"
                                                                />
                                                                Copiar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="italic text-gray-400">
                                                        Sin comentario
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })()}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-8">
                        {comentarios.length === 0
                            ? 'No hay comentarios registrados'
                            : 'No hay comentarios que coincidan con la busqueda'}
                    </div>
                )}
            </CardBody>
        </Card>
    )
}

export default TablaComentarios
