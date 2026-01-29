import Input from '@/components/form/Input'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Dropdown, { DropdownItem, DropdownMenu, DropdownToggle } from '@/components/ui/Dropdown'
import { TIPO_SEGUIMIENTO_COTIZACION } from '@/constants/cotizacion.constant'
import { ISeguimientoCotizacion } from '@/interface/cotizaciones.interface'
import ApiService from '@/services/ApiService'
import { RootState, useAppDispatch, useAppSelector } from '@/store'
import { getErrorMessage } from '@/utils/errorHandlers'
import { useState } from 'react'
import { toast } from 'react-toastify'

const SeguimientoCotizacion = ({ 
	cotizacionId,
	seguimientos = [],
	loading = false,
	onSeguimientoChange
}: { 
	cotizacionId:number | string | any;
	seguimientos: ISeguimientoCotizacion[];
	loading?: boolean;
	onSeguimientoChange?: () => void;
}) => {
	const dispatch = useAppDispatch();
	const { personalizacionUsuario } = useAppSelector((state: RootState) => state.auth);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [newComment, setNewComment] = useState<string>('');


	const obtenerLabelTipo = (tipo: string): string => {
		const match = TIPO_SEGUIMIENTO_COTIZACION.find((item) => item.value === tipo);
		return match?.label || tipo;
	};

	const handleAddComment = async () => {
		if (newComment.trim()) {
			try {
				await ApiService.fetchData({
					url: `/api/cotizaciones/${cotizacionId}/seguimientos/`,
					method: 'post',
					data: {
						cotizacion: cotizacionId,
						usuario: personalizacionUsuario?.id,
						comentario: newComment,
						tipo: 'comentario',
					 }
				});
				toast.success('Comentario anadido', {autoClose: 1000});
				if (onSeguimientoChange) onSeguimientoChange();
				setNewComment('');
			} catch (error: unknown) {
				toast.error(getErrorMessage(error) || 'Error comentando');
			}
		}
	};

	return (
		<Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
			<DropdownToggle>
				<Button variant='solid' color={isOpen ? 'red' : 'sky'} className='!px-4 !py-2'>
					{isOpen ? 'Ver menos' : "Seguimiento"}
				</Button>
			</DropdownToggle>
			<DropdownMenu placement='bottom-end' isCloseAfterLeave={false} >
				<DropdownItem>
					<Badge>Seguimientos</Badge>
				</DropdownItem>
				<DropdownItem className='w-full max-w-[600px] rounded-lg max-h-[300px]'>
					<div className='pt-4 px-4 overflow-y-auto max-h-[300px] w-full'>
						{loading ? (
							<p className='text-center'>Cargando seguimiento...</p>
						) : seguimientos.length > 0 ? (
							<ul className='space-y-4'>
								{seguimientos.map((seguimiento, index) => (
									<li key={index} className='border-b pb-4 break-words max-w-[300px]'>
										<div className='flex justify-between items-center'>
											<p className='font-semibold break-words'>{seguimiento.usuario_nombre}</p>
											<span className='text-sm text-gray-500'>{new Date(seguimiento.fecha).toLocaleString()}</span>
										</div>
										<div className='text-xs text-gray-500'>
											{obtenerLabelTipo(seguimiento.tipo)}
										</div>
										<div className='break-words'>
											<p className='mt-2 break-words' style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{seguimiento.comentario}</p>
										</div>
									</li>
								))}
							</ul>
						) : (
							<p className='text-center'>No hay seguimientos.</p>
						)}
					</div>
				</DropdownItem>
				<DropdownItem className='w-full max-w-[600px]'>
					<div className='flex items-center space-x-2 w-[340px]'>
						<Input
							type='text'
							value={newComment}
							onChange={(e) => setNewComment(e.target.value)}
							placeholder='Anadir seguimiento'
							className='rounded-md mb-2 flex-grow'
							name=''
						/>
						<Button 
							variant='outline' 
							color='emerald' 
							onClick={async () => {
								await handleAddComment();
								const lastComment = document.querySelector('.max-w-[300px]:last-child');
								if (lastComment) {
									lastComment.scrollIntoView({ behavior: 'smooth' });
								}
							}} 
							className='mb-2' 
							icon='HeroPaperAirplane'
						/>
					</div>
				</DropdownItem>
			</DropdownMenu>

		</Dropdown>
	);
};

export default SeguimientoCotizacion;
