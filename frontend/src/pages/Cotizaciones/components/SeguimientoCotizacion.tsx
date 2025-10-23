import Button from '@/components/ui/Button';
import Dropdown, { DropdownFooter, DropdownItem, DropdownMenu, DropdownToggle } from '@/components/ui/Dropdown';
import React, { useState, useEffect } from 'react';
import { RootState, seguimientoCotizacionThunk, useAppDispatch, useAppSelector } from '@/store';
import ApiService from '@/services/ApiService';
import { toast } from 'react-toastify';
import Input from '@/components/form/Input';
import Badge from '@/components/ui/Badge';

const SeguimientoCotizacion = ({ cotizacionId }: { cotizacionId:number | string | any }) => {
	const dispatch = useAppDispatch();
	const { listaSeguimientoCotizacion, loading } = useAppSelector((state) => state.cotizacion);
	const { personalizacionUsuario } = useAppSelector((state: RootState) => state.auth);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [newComment, setNewComment] = useState<string>('');
	const [preventClose, setPreventClose] = useState<boolean>(false);

	useEffect(() => {
		dispatch(seguimientoCotizacionThunk({ id_cotizacion: cotizacionId }));
	}, [dispatch]);

	const handleAddComment = async () => {
		if (newComment.trim()) {
			setPreventClose(true);
			try {
				await ApiService.fetchData({
					url: `/api/cotizaciones/${cotizacionId}/seguimientos/`,
					method: 'post',
					data: {
						cotizacion: cotizacionId,
						usuario: personalizacionUsuario?.id,
						comentario: newComment
					 }
				});
				toast.success('Comentario añadido', {autoClose: 1000});
				dispatch(seguimientoCotizacionThunk({ id_cotizacion: cotizacionId }));
				setNewComment('');
			} catch (error) {
				toast.error('Error comentando');
			} finally {
				setPreventClose(false);
			}
		}
	};

	const handleDropdownToggle = () => {
		dispatch(seguimientoCotizacionThunk({ id_cotizacion: cotizacionId }));
		if (!preventClose) {
			setIsOpen(!isOpen);
		}
	};

	return (
		<Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
			<DropdownToggle>
				<Button variant='solid' color={isOpen ? 'red' : 'sky'} className='!px-4 !py-2' onClick={handleDropdownToggle}>
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
						) : listaSeguimientoCotizacion.length > 0 ? (
							<ul className='space-y-4'>
								{listaSeguimientoCotizacion.map((seguimiento, index) => (
									<li key={index} className='border-b pb-4 break-words max-w-[300px]'>
										<div className='flex justify-between items-center'>
											<p className='font-semibold break-words'>{seguimiento.usuario_nombre}</p>
											<span className='text-sm text-gray-500'>{new Date(seguimiento.fecha).toLocaleString()}</span>
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
							placeholder='Añadir seguimiento'
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
