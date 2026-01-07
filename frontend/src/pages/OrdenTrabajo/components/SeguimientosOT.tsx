import { useEffect, useState } from 'react';
import { listarSeguimientosOTThunk, useAppDispatch, useAppSelector } from '@/store';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Timeline, { TimelineItem } from '@/components/Timeline';
import { ISeguimientoItemOT } from '@/interface/ordenTrabajo.interface';
import { TColors } from '@/types/colors.type';
import Icon from '@/components/icon/Icon';
import Input from '@/components/form/Input';
import { TIPO_SEGUIMIENTO } from '@/constants/ordentrabajo.constant';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import relativeTime from 'dayjs/plugin/relativeTime';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(relativeTime);
dayjs.extend(isSameOrBefore);

dayjs.locale('es');

const SeguimientosOT = ({ordenId} : {ordenId: number | undefined}) => {
const dispatch = useAppDispatch();
const { listaSeguimientosOT, loading } = useAppSelector((state) => state.ordenTrabajo);
const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
const [searchText, setSearchText] = useState('');
const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());

useEffect(() => {
if (ordenId) {
dispatch(listarSeguimientosOTThunk({ id_orden: ordenId }));
}
}, [dispatch, ordenId]);

const obtenerIconoTipo = (tipo: string) => {
	switch (tipo.toLowerCase()) {
		case 'comentario_tecnico':
			return 'HeroDocumentText';
		case 'incidencia':
			return 'HeroExclamationCircle';
		case 'comunicacion_usuario':
			return 'HeroChatBubbleLeftRight';
		default:
			return 'HeroChatBubbleLeft';
	}
};

const obtenerColorTipo = (tipo: string): TColors => {
switch (tipo.toLowerCase()) {
case 'actualizacion':
return 'amber';
case 'comentario_tecnico':
return 'blue';
case 'incidencia':
return 'red';
case 'comunicacion_usuario':
return 'emerald';
default:
return 'gray';
}
};

const obtenerLabelTipo = (tipo: string): string => {
const tipoObj = TIPO_SEGUIMIENTO.find((t) => t.value === tipo);
return tipoObj?.label || tipo;
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
<mark key={i} className="bg-yellow-200 font-semibold">
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

// Filtrar por tipo seleccionado (client-side)
	const filtradosPorTipo = selectedTipo
		? listaSeguimientosOT.filter((seg) => seg.tipo === selectedTipo)
		: listaSeguimientosOT;

	// Filtrar por búsqueda de texto
	const seguimientosFiltrados = searchText.trim()
		? filtradosPorTipo.filter(
				(seg) =>
					seg.comentario?.toLowerCase().includes(searchText.toLowerCase()) ||
					seg.servicio_nombre?.toLowerCase().includes(searchText.toLowerCase()) ||
					seg.soporte_nombre?.toLowerCase().includes(searchText.toLowerCase()) ||
					seg.usuario_nombre?.toLowerCase().includes(searchText.toLowerCase()),
			)
		: filtradosPorTipo;

const tiposUnicos = Array.from(new Set(listaSeguimientosOT.map((seg) => seg.tipo)));

if (loading) {
return (
<Card className="w-full">
<CardHeader>
<Badge className="text-xl">Seguimientos de Trabajos</Badge>
</CardHeader>
<CardBody>
<div className="space-y-4">
{[...Array(3)].map((_, i) => (
<div key={i} className="animate-pulse flex space-x-4">
<div className="rounded-full bg-gray-300 h-10 w-10"></div>
<div className="flex-1 space-y-2 py-1">
<div className="h-4 bg-gray-300 rounded w-3/4"></div>
<div className="h-3 bg-gray-200 rounded w-1/2"></div>
</div>
</div>
))}
</div>
</CardBody>
</Card>
);
}

return (
<Card className="w-full">
<CardHeader>
<div className="flex flex-col gap-3">
<div className="flex items-center justify-between">
<Badge className="text-xl">Seguimientos de Trabajos</Badge>
<div className="w-64">
<Input
name="buscar_seguimientos"
type="text"
placeholder="Buscar en seguimientos..."
value={searchText}
onChange={(e: any) => setSearchText(e.target.value)}
className="text-sm"
/>
</div>
</div>
{tiposUnicos.length > 0 && (
<div className="flex gap-2 flex-wrap">
<button
onClick={() => setSelectedTipo(null)}
className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
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
return (
<button
key={tipo}
onClick={() => setSelectedTipo(tipo)}
className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
selectedTipo === tipo
? `bg-${obtenerColorTipo(tipo)}-600 text-white`
: `bg-${obtenerColorTipo(tipo)}-100 text-${obtenerColorTipo(tipo)}-700 hover:bg-${obtenerColorTipo(tipo)}-200`
}`}>
{obtenerLabelTipo(tipo)} ({count})
</button>
);
})}
</div>
)}
</div>
</CardHeader>
<CardBody className="w-full h-full">
{seguimientosFiltrados.length > 0 ? (
<div className="h-full overflow-auto pr-4">
{(() => {
const sorted = seguimientosFiltrados.slice().sort(
(a, b) =>
new Date(b.fecha_creacion).getTime() -
new Date(a.fecha_creacion).getTime(),
);
const groups: Record<string, ISeguimientoItemOT[]> = {};
sorted.forEach((seg) => {
const label = getDateLabel(seg.fecha_creacion);
if (!groups[label]) groups[label] = [];
groups[label].push(seg);
});
return Object.entries(groups).map(([dateLabel, segs]) => (
<div key={dateLabel} className="mb-6">
<div className="sticky top-0 bg-white z-10 py-2 mb-3 border-b-2 border-gray-200">
<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
{dateLabel}
</h3>
</div>
<Timeline>
{segs.map((seguimiento) => {
const isExpanded = expandedComments.has(seguimiento.id);
const comentario = seguimiento.comentario || '';
const isLongComment = comentario.length > 150;
return (
<div key={seguimiento.id} className="mb-4">
<TimelineItem
icon={obtenerIconoTipo(seguimiento.tipo)}
color={obtenerColorTipo(seguimiento.tipo)}
colorShade="500">
<div className="w-full">
<div className="flex items-center gap-2 mb-2 flex-wrap">
<Badge color={obtenerColorTipo(seguimiento.tipo)}>
{obtenerLabelTipo(seguimiento.tipo)}
</Badge>
<span className="text-xs text-gray-500">
{seguimiento.usuario_nombre || 'Usuario Desconocido'}
</span>
<span className="text-xs text-gray-500 ml-auto">
{dayjs(seguimiento.fecha_creacion).format('HH:mm')}
</span>
</div>
<div className="text-sm mb-2">
{seguimiento.servicio_nombre && (
<div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs mr-2">
<Icon icon="HeroWrenchScrewdriver" className="w-3 h-3" />
<span className="font-medium">Servicio:</span>
<span>{seguimiento.servicio_nombre}</span>
</div>
)}
{seguimiento.soporte_nombre && (
<div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-violet-50 text-violet-700 text-xs">
<Icon icon="HeroComputerDesktop" className="w-3 h-3" />
<span className="font-medium">Soporte:</span>
<span>{seguimiento.soporte_nombre}</span>
</div>
)}
</div>
{comentario ? (
<div className="relative">
<div
className={`p-3 bg-gray-50 rounded text-sm leading-relaxed whitespace-pre-wrap flex-1 ${
!isExpanded && isLongComment ? 'line-clamp-3' : ''
}`}>
{highlightText(comentario, searchText)}
</div>
<div className="flex gap-2 mt-1">
{isLongComment && (
<button
onClick={() => toggleExpand(seguimiento.id)}
className="text-xs text-blue-600 hover:underline">
{isExpanded ? 'Ver menos' : 'Ver más'}
</button>
)}
<button
onClick={() => copyToClipboard(comentario)}
className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1">
<Icon icon="HeroClipboard" className="w-3 h-3" />
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
</TimelineItem>
</div>
);
})}
</Timeline>
</div>
));
})()}
</div>
) : (
<div className="text-center text-gray-500 py-8">
{listaSeguimientosOT.length === 0
? 'No hay seguimientos registrados'
: 'No hay seguimientos que coincidan con la búsqueda'}
</div>
)}
</CardBody>
</Card>
);
};

export default SeguimientosOT;
