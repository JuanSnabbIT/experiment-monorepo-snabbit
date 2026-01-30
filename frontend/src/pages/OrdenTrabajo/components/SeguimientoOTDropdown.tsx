import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Dropdown, { DropdownItem, DropdownMenu, DropdownToggle } from '@/components/ui/Dropdown';
import Icon from '@/components/icon/Icon';
import Input from '@/components/form/Input';
import { TIPO_SEGUIMIENTO } from '@/constants/ordentrabajo.constant';
import {
    useCrearSeguimientoOTMutation,
    useGetSeguimientosOTQuery,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { toast } from 'react-toastify';

dayjs.locale('es');

const SeguimientoOTDropdown = ({ ordenId }: { ordenId: number | undefined }) => {
    const [newComment, setNewComment] = useState<string>('');
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const {
        data: listaSeguimientosOT = [],
        isLoading,
        isFetching,
        refetch,
    } = useGetSeguimientosOTQuery(
        { ordenId: ordenId ?? 0 },
        { skip: !ordenId },
    );
    const [crearSeguimientoOT, { isLoading: isCreating }] = useCrearSeguimientoOTMutation();

    const obtenerLabelTipo = (tipo: string): string => {
        const match = TIPO_SEGUIMIENTO.find((item) => item.value === tipo);
        return match?.label || tipo;
    };

    const obtenerIconoTipo = (tipo: string): string => {
        const match = TIPO_SEGUIMIENTO.find((item) => item.value === tipo);
        return match?.icon || 'HeroChatBubbleLeft';
    };

    const handleAddComment = async () => {
        if (!ordenId || !newComment.trim()) return;
        try {
            await crearSeguimientoOT({
                ordenId,
                data: {
                    comentario: newComment,
                    tipo: 'comentario_tecnico',
                },
            }).unwrap();
            toast.success('Comentario anadido', { autoClose: 1000 });
            setNewComment('');
            refetch();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error) || 'Error comentando');
        }
    };
    const listaVisible = ordenId ? listaSeguimientosOT : [];

    return (
        <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
            <DropdownToggle>
                <Button variant='solid' color={isOpen ? 'red' : 'sky'} className='!px-4 !py-2'>
                    {isOpen ? 'Ver menos' : 'Seguimiento'}
                </Button>
            </DropdownToggle>
            <DropdownMenu placement='bottom-end' isCloseAfterLeave={false}>
                <DropdownItem>
                    <Badge>Seguimientos</Badge>
                </DropdownItem>
                <DropdownItem className='max-h-[300px] w-full max-w-[600px] rounded-lg'>
                    <div className='max-h-[300px] w-full overflow-y-auto px-4 pt-4'>
                        {isLoading || isFetching ? (
                            <p className='text-center'>Cargando seguimiento...</p>
                        ) : listaVisible.length > 0 ? (
                            <ul className='space-y-4'>
                                {listaVisible.map((seguimiento) => (
                                    <li
                                        key={seguimiento.id}
                                        className='max-w-[320px] break-words border-b pb-4'>
                                        <div className='flex items-center justify-between'>
                                            <p className='break-words font-semibold'>
                                                {seguimiento.usuario_nombre ||
                                                    'Usuario Desconocido'}
                                            </p>
                                            <span className='text-sm text-gray-500'>
                                                {dayjs(seguimiento.fecha_creacion).format(
                                                    'DD/MM/YYYY HH:mm',
                                                )}
                                            </span>
                                        </div>
                                        <div className='flex items-center gap-1 text-xs text-gray-500'>
                                            <Icon icon={obtenerIconoTipo(seguimiento.tipo)} />
                                            {obtenerLabelTipo(seguimiento.tipo)}
                                        </div>
                                        <div className='mt-1 text-xs text-gray-400'>
                                            {seguimiento.servicio_nombre
                                                ? `Servicio: ${seguimiento.servicio_nombre}`
                                                : seguimiento.soporte_nombre
                                                  ? `Soporte: ${seguimiento.soporte_nombre}`
                                                  : 'Orden de trabajo'}
                                        </div>
                                        <div className='break-words'>
                                            <p
                                                className='mt-2 break-words'
                                                style={{
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-wrap',
                                                }}>
                                                {seguimiento.comentario || 'Sin comentario'}
                                            </p>
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
                    <div className='flex w-[340px] items-center space-x-2'>
                        <Input
                            type='text'
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder='Anadir seguimiento'
                            className='mb-2 flex-grow rounded-md'
                            name=''
                        />
                        <Button
                            variant='outline'
                            color='emerald'
                            onClick={handleAddComment}
                            className='mb-2'
                            icon='HeroPaperAirplane'
                            isLoading={isCreating}
                            disabled={isCreating}
                        />
                    </div>
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    );
};

export default SeguimientoOTDropdown;
