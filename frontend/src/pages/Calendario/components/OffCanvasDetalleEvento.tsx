import { Dispatch, SetStateAction } from 'react';
import OffCanvas, { OffCanvasBody, OffCanvasHeader } from '@/components/ui/OffCanvas';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

export type ICalendarEventSelected =
    | {
          tipo_evento: 'feriado';
          descripcion: string;
          tipo: string;
          es_irrenunciable: boolean;
          fecha: string;
      }
    | {
          tipo_evento: 'solicitud_vacaciones';
          id: number;
          nombre_empleado: string;
          fecha_inicio: string;
          fecha_fin: string;
          estado: string;
          estado_label: string;
          nombre_aprobado_rechazado_por: string;
      }
    | {
          tipo_evento: 'orden_trabajo_v3';
          id: number;
          titulo: string;
          cliente_nombre: string | null;
          estado: string;
          tecnico_responsable_nombre: string | null;
          fecha_programada: string | null;
          fecha_fin_estimada: string | null;
      }
    | {
          tipo_evento: 'contrato_b2b';
          id: number;
          nombre: string;
          datos_cliente_nombre: string;
          fecha_fin: string;
          estado: string;
      }
    | {
          tipo_evento: 'contrato_laboral';
          id: number;
          nombre_trabajador: string | null;
          cargo: string;
          fecha_termino: string;
          estado: string;
      };

interface IOffCanvasDetalleEventoProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    selectedEvent: ICalendarEventSelected | null;
}

function OffCanvasDetalleEvento({
    isOpen,
    setIsOpen,
    selectedEvent,
}: IOffCanvasDetalleEventoProps) {
    const navigate = useNavigate();

    const getTitulo = () => {
        if (!selectedEvent) return 'Evento';
        switch (selectedEvent.tipo_evento) {
            case 'feriado':
                return 'Feriado';
            case 'solicitud_vacaciones':
                return 'Solicitud de Vacaciones';
            case 'orden_trabajo_v3':
                return 'Orden de Trabajo';
            case 'contrato_b2b':
                return 'Vencimiento de Contrato';
            case 'contrato_laboral':
                return 'Término de Contrato Laboral';
        }
    };

    return (
        <OffCanvas isOpen={isOpen} setIsOpen={setIsOpen} position='right' size='36rem'>
            <OffCanvasHeader>
                <span className='text-lg font-semibold'>{getTitulo()}</span>
            </OffCanvasHeader>
            <OffCanvasBody>
                <div className='flex flex-col gap-5'>
                    {selectedEvent?.tipo_evento === 'feriado' && (
                        <>
                            <div>
                                <Badge>Fecha</Badge>
                                <p className='ml-2 mt-1'>{selectedEvent.fecha}</p>
                            </div>
                            <div>
                                <Badge>Tipo</Badge>
                                <p className='ml-2 mt-1'>{selectedEvent.tipo || '—'}</p>
                            </div>
                            <div>
                                <Badge>¿Es Irrenunciable?</Badge>
                                <p className='ml-2 mt-1'>
                                    {selectedEvent.es_irrenunciable ? 'Sí' : 'No'}
                                </p>
                            </div>
                            <div>
                                <Badge>Descripción</Badge>
                                <p className='ml-2 mt-1'>{selectedEvent.descripcion || '—'}</p>
                            </div>
                        </>
                    )}

                    {selectedEvent?.tipo_evento === 'solicitud_vacaciones' && (
                        <>
                            <div>
                                <Badge>Empleado</Badge>
                                <p className='ml-2 mt-1'>{selectedEvent.nombre_empleado}</p>
                            </div>
                            <div className='grid grid-cols-2 gap-3'>
                                <div>
                                    <Badge>Fecha Inicio</Badge>
                                    <p className='ml-2 mt-1'>
                                        {dayjs(selectedEvent.fecha_inicio).format('DD/MM/YYYY')}
                                    </p>
                                </div>
                                <div>
                                    <Badge>Fecha Fin</Badge>
                                    <p className='ml-2 mt-1'>
                                        {dayjs(selectedEvent.fecha_fin).format('DD/MM/YYYY')}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <Badge>Estado</Badge>
                                <p className='ml-2 mt-1'>{selectedEvent.estado_label}</p>
                            </div>
                            {selectedEvent.nombre_aprobado_rechazado_por && (
                                <div>
                                    <Badge>Procesado Por</Badge>
                                    <p className='ml-2 mt-1'>
                                        {selectedEvent.nombre_aprobado_rechazado_por}
                                    </p>
                                </div>
                            )}
                            <Button
                                variant='solid'
                                icon='HeroArrowTopRightOnSquare'
                                onClick={() =>
                                    navigate(
                                        `/vacaciones/detalle-solicitud-vacaciones/${selectedEvent.id}`,
                                    )
                                }>
                                Ver Detalle Completo
                            </Button>
                        </>
                    )}

                    {selectedEvent?.tipo_evento === 'orden_trabajo_v3' && (
                        <>
                            <div>
                                <Badge>Título</Badge>
                                <p className='ml-2 mt-1'>{selectedEvent.titulo}</p>
                            </div>
                            <div>
                                <Badge>Cliente</Badge>
                                <p className='ml-2 mt-1'>{selectedEvent.cliente_nombre || '—'}</p>
                            </div>
                            <div>
                                <Badge>Estado</Badge>
                                <p className='ml-2 mt-1 capitalize'>{selectedEvent.estado.replace(/_/g, ' ')}</p>
                            </div>
                            <div>
                                <Badge>Técnico Responsable</Badge>
                                <p className='ml-2 mt-1'>
                                    {selectedEvent.tecnico_responsable_nombre || '—'}
                                </p>
                            </div>
                            <div className='grid grid-cols-2 gap-3'>
                                {selectedEvent.fecha_programada && (
                                    <div>
                                        <Badge>Fecha Programada</Badge>
                                        <p className='ml-2 mt-1'>
                                            {dayjs(selectedEvent.fecha_programada).format(
                                                'DD/MM/YYYY',
                                            )}
                                        </p>
                                    </div>
                                )}
                                {selectedEvent.fecha_fin_estimada && (
                                    <div>
                                        <Badge>Fin Estimado</Badge>
                                        <p className='ml-2 mt-1'>
                                            {dayjs(selectedEvent.fecha_fin_estimada).format(
                                                'DD/MM/YYYY',
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <Button
                                variant='solid'
                                icon='HeroArrowTopRightOnSquare'
                                onClick={() =>
                                    navigate(`/orden-trabajo-v3/${selectedEvent.id}`)
                                }>
                                Ir a OT
                            </Button>
                        </>
                    )}

                    {selectedEvent?.tipo_evento === 'contrato_b2b' && (
                        <>
                            <div>
                                <Badge>Contrato</Badge>
                                <p className='ml-2 mt-1'>{selectedEvent.nombre}</p>
                            </div>
                            <div>
                                <Badge>Cliente</Badge>
                                <p className='ml-2 mt-1'>{selectedEvent.datos_cliente_nombre}</p>
                            </div>
                            <div>
                                <Badge>Fecha Vencimiento</Badge>
                                <p className='ml-2 mt-1'>
                                    {dayjs(selectedEvent.fecha_fin).format('DD/MM/YYYY')}
                                </p>
                            </div>
                            <div>
                                <Badge>Estado</Badge>
                                <p className='ml-2 mt-1'>{selectedEvent.estado}</p>
                            </div>
                        </>
                    )}

                    {selectedEvent?.tipo_evento === 'contrato_laboral' && (
                        <>
                            <div>
                                <Badge>Trabajador</Badge>
                                <p className='ml-2 mt-1'>
                                    {selectedEvent.nombre_trabajador || '—'}
                                </p>
                            </div>
                            <div>
                                <Badge>Cargo</Badge>
                                <p className='ml-2 mt-1'>{selectedEvent.cargo}</p>
                            </div>
                            <div>
                                <Badge>Fecha Término</Badge>
                                <p className='ml-2 mt-1'>
                                    {dayjs(selectedEvent.fecha_termino).format('DD/MM/YYYY')}
                                </p>
                            </div>
                            <div>
                                <Badge>Estado</Badge>
                                <p className='ml-2 mt-1'>{selectedEvent.estado}</p>
                            </div>
                        </>
                    )}
                </div>
            </OffCanvasBody>
        </OffCanvas>
    );
}

export default OffCanvasDetalleEvento;
