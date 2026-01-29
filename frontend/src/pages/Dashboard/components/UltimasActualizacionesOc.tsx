import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import { listaEventosOcThunk, useAppDispatch, useAppSelector } from '@/store';
import React, { useEffect, useState } from 'react';
import Timeline, { TimelineItem } from '@/components/Timeline';
import Button from '@/components/ui/Button';
import Collapse from '@/components/utils/Collapse';

const UltimasActualizacionesOc = () => {
    const dispatch = useAppDispatch();
    const { eventosOc, loading } = useAppSelector((state) => state.bodega);
    const [openOrders, setOpenOrders] = useState<Record<string, boolean>>({});
    const [isOpening, setIsOpening] = useState<Record<string, boolean>>({});

    useEffect(() => {
        dispatch(listaEventosOcThunk());
    }, []);

    const groupedEvents = eventosOc.reduce<Record<string, typeof eventosOc>>((acc, evento) => {
        if (!acc[evento.codigo_orden]) {
            acc[evento.codigo_orden] = [];
        }
        acc[evento.codigo_orden].push(evento);
        return acc;
    }, {});

    const handleToggle = (codigo_orden: string) => {
        if (isOpening[codigo_orden]) return;

        setIsOpening((prev) => ({ ...prev, [codigo_orden]: true }));
        setOpenOrders((prev) => ({
            ...prev,
            [codigo_orden]: !prev[codigo_orden],
        }));
        setTimeout(() => setIsOpening((prev) => ({ ...prev, [codigo_orden]: false })), 1000);
    };

    return (
        <Card>
            <CardHeader>
                <Badge className='text-xl'>Últimas Actualizaciones</Badge>
            </CardHeader>
            <CardBody>
                {loading ? (
                    <div>Cargando...</div>
                ) : (
                    <Timeline>
                        {Object.keys(groupedEvents).length > 0 ? (
                            Object.keys(groupedEvents).map((codigo_orden) => (
                                <div key={codigo_orden} className='mb-4'>
                                    <TimelineItem icon='HeroHashtag' color='blue' colorShade='500'>
                                        <div
                                            className='mb-2 cursor-pointer'
                                            onClick={() => handleToggle(codigo_orden)}>
                                            <div className='flex items-center justify-between rounded-md p-2 shadow-sm transition-colors duration-200'>
                                                <p className='font-semibold'>
                                                    Cambios en: <Badge>{codigo_orden}</Badge>
                                                </p>
                                                <div className='flex'>
                                                    <div className='grow'>
                                                        <Button
                                                            variant='outline'
                                                            rightIcon={
                                                                isOpening[codigo_orden]
                                                                    ? 'HeroMinusCircle'
                                                                    : openOrders[codigo_orden]
                                                                      ? 'HeroChevronUp'
                                                                      : 'HeroChevronDown'
                                                            }
                                                            color={
                                                                isOpening[codigo_orden]
                                                                    ? 'red'
                                                                    : undefined
                                                            }
                                                            isDisable={
                                                                isOpening[codigo_orden]
                                                            }></Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </TimelineItem>
                                    <Collapse
                                        isOpen={openOrders[codigo_orden]}
                                        className='transition-opacity'>
                                        <div className='pl-4'>
                                            {groupedEvents[codigo_orden].map((evento, index) => (
                                                <TimelineItem
                                                    key={index}
                                                    icon='HeroHashtag'
                                                    color='blue'
                                                    colorShade='500'>
                                                    <div className='rounded-md p-3 shadow-sm'>
                                                        <Badge className='mb-1'>
                                                            {evento.tipo}
                                                        </Badge>
                                                        <div className='ml-4'>
                                                            <p className='text-sm font-semibold'>
                                                                Usuario: {evento.usuario}
                                                            </p>
                                                            <p className='text-sm text-gray-600'>
                                                                {new Date(
                                                                    evento.fecha,
                                                                ).toLocaleString('es-ES', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </p>
                                                            <p className='text-sm'>
                                                                {evento.detalle}
                                                            </p>
                                                        </div>
                                                        {evento.observacion && (
                                                            <p className='text-sm italic'>
                                                                Observación: {evento.observacion}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TimelineItem>
                                            ))}
                                        </div>
                                    </Collapse>
                                </div>
                            ))
                        ) : (
                            <div className='ml-4'>Lo siento, no tienes cambios recientes.</div>
                        )}
                    </Timeline>
                )}
            </CardBody>
        </Card>
    );
};

export default UltimasActualizacionesOc;
