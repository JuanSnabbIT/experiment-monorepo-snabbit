import Button from '@/components/ui/Button';
import Dropdown, { DropdownItem, DropdownMenu, DropdownToggle } from '@/components/ui/Dropdown';
import Tooltip from '@/components/ui/Tooltip';

type EstadoFinal = 'completado' | 'medianamente_completado' | 'no_realizado';

interface DropdownEstadoTrabajoProps {
	onSelectEstado: (estado: EstadoFinal) => void;
	disabled?: boolean;
	tooltipText?: string;
}

const DropdownEstadoTrabajo = ({
	onSelectEstado,
	disabled = false,
	tooltipText = 'Cambiar estado del trabajo',
}: DropdownEstadoTrabajoProps) => {
	const opciones: Array<{ value: EstadoFinal; label: string; color: string; icon: string }> = [
		{
			value: 'completado',
			label: 'Completado',
			color: 'emerald',
			icon: 'HeroCheck',
		},
		{
			value: 'medianamente_completado',
			label: 'Medianamente Completado',
			color: 'blue',
			icon: 'HeroCheckCircle',
		},
		{
			value: 'no_realizado',
			label: 'No Realizado',
			color: 'red',
			icon: 'HeroXMark',
		},
	];

	if (disabled) {
		return (
			<Tooltip text={tooltipText}>
				<Button
					size='sm'
					variant='outline'
					rounded='rounded-full'
					color='gray'
					isDisable={true}
					icon='DuoLoading'
					className='opacity-75'>
					En Proceso
				</Button>
			</Tooltip>
		);
	}

	return (
		<Dropdown>
			<DropdownToggle>
				<Button
					size='sm'
					variant='solid'
					rounded='rounded-full'
					color='sky'
					icon='DuoLoading'
					aria-label='Cambiar estado'>
					En Proceso
				</Button>
			</DropdownToggle>
			<DropdownMenu placement='bottom-end'>
				{opciones.map((opcion) => (
					<DropdownItem
						key={opcion.value}
						onClick={() => onSelectEstado(opcion.value)}
						icon={opcion.icon}>
						<span className={`font-medium text-${opcion.color}-600`}>
							{opcion.label}
						</span>
					</DropdownItem>
				))}
			</DropdownMenu>
		</Dropdown>
	);
};

export default DropdownEstadoTrabajo;
