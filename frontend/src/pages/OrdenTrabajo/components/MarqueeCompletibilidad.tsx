import Icon from '@/components/icon/Icon';
import Card, { CardBody } from '@/components/ui/Card';
import {
    useGetCheckCompletibilidadOTQuery,
    useGetDetalleOrdenTrabajoQuery,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { useParams } from 'react-router-dom';
import Marquee from 'react-fast-marquee';

function MarqueeCompletibilidad() {
    const { id } = useParams<{ id: string }>();
    const { data: detalleOrdenTrabajo } = useGetDetalleOrdenTrabajoQuery(id || '', {
        skip: !id,
    });
    const { data: checkCompletibilidadOT } = useGetCheckCompletibilidadOTQuery(
        detalleOrdenTrabajo?.id || '',
        { skip: !detalleOrdenTrabajo?.id },
    );

    return (
        <Card>
            <CardBody>
                <Marquee>
                    {checkCompletibilidadOT ? (
                        <div className='flex flex-row'>
                            {checkCompletibilidadOT.se_puede_completar ? (
                                <div className='text-2xl'>Todo listo para Completar la OT</div>
                            ) : !checkCompletibilidadOT.se_puede_completar &&
                              checkCompletibilidadOT.razones.length > 0 ? (
                                checkCompletibilidadOT.razones.map((raz, index) => (
                                    <div
                                        key={index}
                                        className='mx-10 flex flex-wrap items-center gap-2 text-2xl'>
                                        <Icon icon='DuoCircle' className='text-blue-500'></Icon>
                                        {raz}
                                    </div>
                                ))
                            ) : (
                                <div></div>
                            )}
                        </div>
                    ) : (
                        'No se pudo obtener si la OT se puede completar'
                    )}
                </Marquee>
            </CardBody>
        </Card>
    );
}

export default MarqueeCompletibilidad;
