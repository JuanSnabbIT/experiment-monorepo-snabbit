import { useState } from 'react';
import Badge from "@/components/ui/Badge";
import Timeline, { TimelineItem } from '@/components/Timeline';
import Collapse from '@/components/utils/Collapse';
import Button from '@/components/ui/Button';
import dayjs from "dayjs";
import "dayjs/locale/es"

const TimelineSeguimientos = ({ seguimientos }: { seguimientos: any }) => {
	const [openItemIndex, setOpenItemIndex] = useState<number | null>(null);
	const [isOpening, setIsOpening] = useState<boolean>(false);

	const handleToggle = (index: number) => {
		if (isOpening) return;
		setIsOpening(true);
		if (openItemIndex === index) {
			setOpenItemIndex(null);
		} else {
			setOpenItemIndex(index);
		}
		setTimeout(() => setIsOpening(false), 1000);
	};

	const ordenados = [...seguimientos].sort(
		(a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
	);

	return (
		<Timeline className="h-full max-h-[30vh] overflow-y-auto">
			{ordenados.map((seguimiento, index) => (
				<div className="flex flex-col justify-between w-full mb-4" key={seguimiento.id}>
					<TimelineItem
						icon={
							seguimiento.tipo === 'actualizacion' ? 
									'HeroArrowPath'
								: seguimiento.tipo === 'incidencia' ? 
									'HeroExclamationCircle'
								: 'HeroChatBubbleBottomCenterText'
						}
						color={
							seguimiento.tipo === 'actualizacion' ?
								'emerald'
							: seguimiento.tipo === 'incidencia' ?
								'red'
							: 'amber'
						}
						colorShade="500"
					>
						<div className="flex items-start justify-between w-full">
							<div className="flex items-center">
								<Badge
									className={
										seguimiento.tipo === 'actualizacion' ?
											'mr-2 text-green-500'
										: seguimiento.tipo === 'incidencia' ?
											'mr-2 text-red-500'
										: 'mr-2 text-yellow-500'
									}
								>{seguimiento.comentario}</Badge>
								<Button
									icon="HeroEye"
									className="cursor-pointer ml-2"
									onClick={() => handleToggle(index)}
								/>
							</div>
						</div>
					</TimelineItem>
					<Collapse isOpen={openItemIndex === index} className="transition-opacity">
						<div className='pl-8'>
							<div className="p-3 rounded-md mt-2">
								<div>
									<strong>Usuario:</strong> {seguimiento.nombre_usuario}
								</div>
								<div>
									<strong>Fecha:</strong> {dayjs(seguimiento.fecha).locale("es").format("DD/MM/YYYY HH:mm [Hrs]")}
								</div>
							</div>
						</div>
					</Collapse>
				</div>
			))}
		</Timeline>
	);
};

export default TimelineSeguimientos;
