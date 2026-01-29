import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import ApiService from '@/services/ApiService';
import { getErrorMessage } from '@/utils/errorHandlers';
import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-toastify';

interface MovimientoAsignacion {
	tipo: 'vincular' | 'desvincular';
	equipo_id?: number | null;
	item_guia_id?: number | null;
	label?: string | null;
}

interface Props {
	ordenId: number;
	soporteId: number;
	usuarioAsignadoId: number;
	usuarioNombre: string;
	tecnicoNombre: string;
	movimientos: MovimientoAsignacion[];
	isOpen: boolean;
	setIsOpen: Dispatch<SetStateAction<boolean>>;
	onSuccess?: () => void;
}

function FirmarAsignacionUsuario({
	ordenId,
	soporteId,
	usuarioAsignadoId,
	usuarioNombre,
	tecnicoNombre,
	movimientos,
	isOpen,
	setIsOpen,
	onSuccess,
}: Props) {
	const sigCanvas = useRef<SignatureCanvas | null>(null);
	const topRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (isOpen) {
			if (topRef.current) {
				topRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [isOpen]);

	const clear = () => {
		if (sigCanvas.current) {
			sigCanvas.current.clear();
		}
	};

	const renderMovimiento = (mov: MovimientoAsignacion) => {
		const accion = mov.tipo === 'vincular' ? 'Vincular' : 'Desvincular';
		const detalle = mov.label || (mov.item_guia_id ? `Item serializado #${mov.item_guia_id}` : 'Equipo');
		return `${accion}: ${detalle}`;
	};

	const handleConfirmar = async () => {
		if (sigCanvas.current?.isEmpty()) {
			toast.error('Por favor firme la confirmacion', { toastId: 'firma-asignacion' });
			return;
		}
		try {
			const resp = await ApiService.fetchData<{
				estado?: string;
				detail?: string;
			}>({
				url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${soporteId}/usuarios-asignados/${usuarioAsignadoId}/firmar-asignacion/`,
				method: 'post',
				headers: { 'Content-Type': 'application/json' },
				data: JSON.stringify({
					firma: sigCanvas.current?.toDataURL('image/png'),
				}),
			});
			if (resp.data?.estado === 'pendiente') {
				toast.info(resp.data?.detail || 'Firma guardada. Pendiente de aplicar.', {
					autoClose: 2000,
				});
			} else {
				toast.success('Asignacion confirmada', { autoClose: 1200 });
			}
			clear();
			setIsOpen(false);
			onSuccess?.();
		} catch (error: unknown) {
			toast.error(getErrorMessage(error) || 'Error al confirmar la asignacion');
		}
	};

	return (
		<Modal
			size='md'
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			isStaticBackdrop={true}
			isCentered={true}
			isScrollable={true}>
			<ModalHeader>
				<Badge className='text-xl'>Confirmar asignacion de equipo</Badge>
			</ModalHeader>
			<ModalBody>
				<div className='space-y-4'>
					<div ref={topRef} />
					<div className='rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900'>
						<div>
							El tecnico <span className='font-bold'>{tecnicoNombre || 'Tecnico'}</span> realizo las siguientes acciones:
						</div>
						<div className='mt-2 ml-4 space-y-1'>
							{movimientos.length > 0 ? (
								movimientos.map((mov, idx) => (
									<div key={`mov-${idx}`} className='font-semibold'>
										- {renderMovimiento(mov)}
									</div>
								))
							) : (
								<div className='font-semibold italic text-blue-700'>Sin cambios registrados</div>
							)}
						</div>
						<div className='pt-2 mt-2 border-t border-blue-200'>
							Usted <span className='font-bold'>{usuarioNombre || 'Usuario'}</span> valida la realizacion de estas acciones?
						</div>
					</div>

					<div className='space-y-2'>
						<label className='block text-sm font-medium text-gray-700'>Firma de conformidad:</label>
						<div className='rounded-lg border-2 border-gray-300 bg-white overflow-auto flex justify-center'>
							<SignatureCanvas
								ref={sigCanvas}
								canvasProps={{
									className: 'bg-white',
									height: 280,
									width: 400,
								}}
							/>
						</div>
						<Button size='sm' variant='outline' color='gray' onClick={clear}>
							Limpiar firma
						</Button>
					</div>
				</div>
			</ModalBody>
			<ModalFooter>
				<ModalFooterChild>
					<Button variant='outline' color='red' onClick={() => setIsOpen(false)}>
						Cancelar
					</Button>
				</ModalFooterChild>
				<ModalFooterChild>
					<Button variant='solid' color='emerald' onClick={handleConfirmar}>
						Confirmar
					</Button>
				</ModalFooterChild>
			</ModalFooter>
		</Modal>
	);
}

export default FirmarAsignacionUsuario;
