import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import { Td, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { IUsuarioVinculadoLicencia } from '@/interface/contrato.interface';
import {
    useDeleteUsuarioVinculadoLicenciaMutation,
    useGetDetalleContratoLicenciaQuery,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useState } from 'react';
import { toast } from 'react-toastify';

function ItemsTablaDeUsuariosVinculadosLicencias({ user }: { user: IUsuarioVinculadoLicencia }) {
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);

    const [deleteUsuario, { isLoading: isDeleting }] = useDeleteUsuarioVinculadoLicenciaMutation();

    const { data: detalleContratoLicencia } = useGetDetalleContratoLicenciaQuery(user.licencia);

    const handleDelete = async () => {
        try {
            await deleteUsuario({
                licenciaId: user.licencia,
                usuarioId: user.id,
            }).unwrap();
            toast.success('Usuario desvinculado', { autoClose: 1000 });
            setConfirmDeleteOpen(false);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <>
            <Tr>
                <Td>
                    <div className='flex items-center gap-2'>
                        <span className='font-bold'>{user.nombre_display}</span>
                        {user.es_externo && (
                            <Badge variant='outline' color='amber' className='text-xs'>
                                Externo
                            </Badge>
                        )}
                    </div>
                    <div className='text-sm'>Correo: {user.correo_display}</div>
                </Td>
                <Td>
                    {dayjs(user.fecha_asignacion).locale('es').format('DD/MM/YYYY')}
                </Td>
                <Td>
                    <div className='flex flex-col gap-1'>
                        <Tooltip
                            text={
                                detalleContratoLicencia?.se_puede_desvincular
                                    ? 'Desvincular'
                                    : 'Disponible solo dentro de la ventana de 7 días'
                            }>
                            <Button
                                variant='solid'
                                color='red'
                                icon='HeroTrash'
                                size='sm'
                                onClick={() => setConfirmDeleteOpen(true)}
                                isDisable={!detalleContratoLicencia?.se_puede_desvincular}
                            />
                        </Tooltip>
                        {!detalleContratoLicencia?.se_puede_desvincular && (
                            <span className='text-xs text-zinc-400'>Solo en ventana de 7d</span>
                        )}
                    </div>
                </Td>
            </Tr>

            {/* Modal de confirmación para desvincular */}
            <Modal isOpen={confirmDeleteOpen} setIsOpen={setConfirmDeleteOpen}>
                <ModalHeader>Confirmar desvinculación</ModalHeader>
                <ModalBody>
                    {detalleContratoLicencia?.se_puede_desvincular
                        ? '¿Está seguro(a) de querer desvincular la licencia de este usuario?'
                        : 'La desvinculación solo está disponible dentro de los 7 días posteriores al inicio del ciclo vigente.'}
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button onClick={() => setConfirmDeleteOpen(false)}>Cancelar</Button>
                        <Button
                            variant='solid'
                            color='red'
                            onClick={handleDelete}
                            isLoading={isDeleting}
                            isDisable={!detalleContratoLicencia?.se_puede_desvincular}>
                            Desvincular
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default ItemsTablaDeUsuariosVinculadosLicencias;
