import { ChangeEvent, useEffect, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Icon from '@/components/icon/Icon';
import Input from '@/components/form/Input';
import { listarSeguimientosOTThunk, useAppDispatch, useAppSelector } from '@/store';
import { TIPO_SEGUIMIENTO } from '@/constants/ordentrabajo.constant';
import { TColors } from '@/types/colors.type';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

const SeguimientosOT = ({ ordenId }: { ordenId: number | undefined }) => {
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

	const tiposUnicos = Array.from(
		new Set(listaSeguimientosOT.map((seg) => seg.tipo)),
	);

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
		);
	}

	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex flex-col gap-3 w-full">
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<Badge className="text-xl">Comentarios</Badge>
						<div className="w-64">
							<Input
								name="buscar_seguimientos"
								type="text"
								placeholder="Buscar en comentarios..."
								value={searchText}
								onChange={(e: ChangeEvent<HTMLInputElement>) =>
									setSearchText(e.target.value)
								}
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
								const color = obtenerColorTipo(tipo);
								return (
									<button
										key={tipo}
										onClick={() => setSelectedTipo(tipo)}
										className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
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
			<CardBody className="w-full h-full">
				{seguimientosFiltrados.length > 0 ? (
					<div className="overflow-x-auto">
						{(() => {
							const sorted = seguimientosFiltrados
								.slice()
								.sort(
									(a, b) =>
										new Date(b.fecha_creacion).getTime() -
										new Date(a.fecha_creacion).getTime(),
								);
							return (
								<div className="flex gap-4 pb-2">
									{sorted.map((seguimiento) => {
										const isExpanded = expandedComments.has(seguimiento.id);
										const comentario = seguimiento.comentario || '';
										const isLongComment = comentario.length > 150;
										const hasOrigen =
											!!seguimiento.servicio_nombre || !!seguimiento.soporte_nombre;
										return (
											<div
												key={seguimiento.id}
												className="w-80 flex-shrink-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
												<div className="flex items-center gap-2 mb-2">
													<Icon
														icon={obtenerIconoTipo(seguimiento.tipo)}
														className="text-lg"
													/>
													<Badge color={obtenerColorTipo(seguimiento.tipo)}>
														{obtenerLabelTipo(seguimiento.tipo)}
													</Badge>
													<span className="text-xs text-gray-500 ml-auto">
														{dayjs(seguimiento.fecha_creacion).format(
															'DD/MM/YYYY HH:mm',
														)}
													</span>
												</div>
												<div className="text-xs text-gray-500">
													{seguimiento.usuario_nombre || 'Usuario Desconocido'}
												</div>
												<div className="text-xs text-gray-400 mb-2">
													{getDateLabel(seguimiento.fecha_creacion)}
												</div>
												<div className="flex flex-wrap gap-2 text-xs mb-2">
													{seguimiento.servicio_nombre && (
														<span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-blue-700">
															<Icon icon="HeroWrenchScrewdriver" className="w-3 h-3" />
															Servicio: {seguimiento.servicio_nombre}
														</span>
													)}
													{seguimiento.soporte_nombre && (
														<span className="inline-flex items-center gap-1 rounded bg-violet-50 px-2 py-1 text-violet-700">
															<Icon icon="HeroComputerDesktop" className="w-3 h-3" />
															Soporte: {seguimiento.soporte_nombre}
														</span>
													)}
													{!hasOrigen && (
														<span className="inline-flex items-center rounded bg-gray-100 px-2 py-1 text-gray-600">
															Orden de trabajo
														</span>
													)}
												</div>
												{comentario ? (
													<div className="relative">
														<div
															className={`p-3 bg-gray-50 rounded text-sm leading-relaxed whitespace-pre-wrap flex-1 ${
																!isExpanded && isLongComment
																	? 'line-clamp-3'
																	: ''
															}`}>
															{highlightText(comentario, searchText)}
														</div>
														<div className="flex gap-2 mt-1">
															{isLongComment && (
																<button
																	onClick={() => toggleExpand(seguimiento.id)}
																	className="text-xs text-blue-600 hover:underline">
																	{isExpanded ? 'Ver menos' : 'Ver mas'}
																</button>
															)}
															<button
																onClick={() => copyToClipboard(comentario)}
																className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1">
																<Icon
																	icon="HeroClipboard"
																	className="w-3 h-3"
																/>
																Copiar
															</button>
														</div>
													</div>
												) : (
													<span className="italic text-gray-400">Sin comentario</span>
												)}
											</div>
										);
									})}
								</div>
							);
						})()}
					</div>
				) : (
					<div className="text-center text-gray-500 py-8">
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
