import Checkbox, { CheckboxGroup } from '@/components/form/Checkbox';
import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import {
    detalleOrdenTrabajoThunk,
    listaAsistenciaUsuariosThunk,
    listaEntregaEquipoThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

function CompletarVisitaDT({ id_visita }: { id_visita: number | string | undefined }) {
    const dispatch = useAppDispatch();
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo);
    const { listaEntregaEquipos, listaAsistenciaUsuarios } = useAppSelector(
        (state) => state.visita,
    );
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isCompletada, setIsCompletada] = useState<boolean>(true);

    useEffect(() => {
        if (isOpen && id_visita) {
            dispatch(listaAsistenciaUsuariosThunk({ id_visita: id_visita }));
            dispatch(listaEntregaEquipoThunk({ id_visita: id_visita }));
        }
    }, [isOpen, id_visita]);

    return (
        <>
            <Tooltip text='Completar/Cerrar Visita'>
                <Button
                    variant='solid'
                    icon='HeroStopCircle'
                    color='zinc'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Completar/Cerrar Visita</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Nuevo Estado de la Visita</Badge>
                            <CheckboxGroup isInline>
                                <Checkbox
                                    label='Completada'
                                    onClick={() => {
                                        setIsCompletada(true);
                                    }}
                                    checked={isCompletada}
                                />
                                <Checkbox
                                    label='Cerrada'
                                    onClick={() => {
                                        setIsCompletada(false);
                                    }}
                                    checked={!isCompletada}
                                />
                            </CheckboxGroup>
                        </div>
                        {listaAsistenciaUsuarios.length > 0 &&
                        listaAsistenciaUsuarios.filter(
                            (asis) => asis.estado_revision === 'por_revisar',
                        ).length > 0 ? (
                            <>
                                <Badge className='text-xl'>Asistencias Pendientes</Badge>
                                {listaAsistenciaUsuarios
                                    .filter((asis) => asis.estado_revision === 'por_revisar')
                                    .map((asis, index) => (
                                        <div
                                            key={index}
                                            className='flex flex-wrap items-center gap-2'>
                                            <Icon icon='DuoCircle'></Icon>
                                            Asistencia N°{asis.id}
                                        </div>
                                    ))}
                            </>
                        ) : (
                            <Badge>Sin Asistencias Pendientes</Badge>
                        )}
                        {listaEntregaEquipos.length > 0 &&
                        listaEntregaEquipos.filter((ent) => ent.estado_entrega === 'por_entregar')
                            .length > 0 ? (
                            <>
                                <Badge className='text-xl'>Entregas Pendientes</Badge>
                                {listaEntregaEquipos
                                    .filter((ent) => ent.estado_entrega === 'por_revisar')
                                    .map((ent, index) => (
                                        <div
                                            key={index}
                                            className='flex flex-wrap items-center gap-2'>
                                            <Icon icon='DuoCircle'></Icon>
                                            Entrega N°{ent.id}
                                        </div>
                                    ))}
                            </>
                        ) : (
                            <Badge>Sin Entregas Pendientes</Badge>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpen(false);
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            isDisable={
                                listaAsistenciaUsuarios.filter(
                                    (asis) => asis.estado_revision === 'por_revisar',
                                ).length > 0 &&
                                listaEntregaEquipos.filter(
                                    (ent) => ent.estado_entrega === 'por_entregar',
                                ).length > 0
                            }
                            onClick={async () => {
                                try {
                                    const response = await ApiService.fetchData({
                                        url: `/api/visitas-soporte/${id_visita}/`,
                                        method: 'patch',
                                        headers: { 'Content-Type': 'application/json' },
                                        data: JSON.stringify({
                                            estado: isCompletada ? 'completada' : 'cerrada',
                                        }),
                                    });
                                    if (response.data) {
                                        toast.success(
                                            isCompletada ? 'Visita Completada' : 'Visita Cerrada',
                                            { autoClose: 1000 },
                                        );
                                        setIsOpen(false);
                                        dispatch(
                                            detalleOrdenTrabajoThunk({
                                                id_ordenTrabajo: detalleOrdenTrabajo?.id,
                                            }),
                                        );
                                    }
                                } catch (error: any) {
                                    const mensajesError = Object.values(error.response.data)
                                        .flat()
                                        .join(' ');
                                    toast.error(
                                        mensajesError || 'Error al completar/cerrar visita',
                                        { toastId: 'Error al completar/cerrar visita' },
                                    );
                                }
                            }}>
                            Guardar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CompletarVisitaDT;
