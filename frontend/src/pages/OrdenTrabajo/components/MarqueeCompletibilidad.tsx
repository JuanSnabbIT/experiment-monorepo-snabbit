import Icon from '@/components/icon/Icon';
import Card, { CardBody } from '@/components/ui/Card';
import {
    useGetCheckBloqueadoresAvanceOTQuery,
    useGetCheckCompletibilidadOTQuery,
    useGetDetalleOrdenTrabajoQuery,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import Marquee from 'react-fast-marquee';
import { useParams } from 'react-router-dom';

function MarqueeCompletibilidad() {
    const { id } = useParams<{ id: string }>();
    const { data: detalleOrdenTrabajo } = useGetDetalleOrdenTrabajoQuery(id || '', {
        skip: !id,
    });

    const estado = detalleOrdenTrabajo?.estado;
    const otId = detalleOrdenTrabajo?.id || '';

    // Para en_proceso: check de completabilidad (soportes/servicios pendientes)
    const { data: checkCompletibilidadOT } = useGetCheckCompletibilidadOTQuery(otId, {
        skip: !otId || estado !== 'en_proceso',
    });

    // Para facturada: bloqueadores administrativos de cierre
    const { data: checkBloqueadores } = useGetCheckBloqueadoresAvanceOTQuery(otId, {
        skip: !otId || estado !== 'facturada',
    });

    if (!detalleOrdenTrabajo) return null;

    // en_proceso: mostrar bloqueadores de completabilidad
    if (estado === 'en_proceso') {
        return (
            <Card>
                <CardBody>
                    <Marquee>
                        {checkCompletibilidadOT ? (
                            <div className='flex flex-row'>
                                {checkCompletibilidadOT.se_puede_completar ? (
                                    <div className='text-2xl'>Todo listo para Completar la OT</div>
                                ) : checkCompletibilidadOT.razones.length > 0 ? (
                                    checkCompletibilidadOT.razones.map((raz, index) => (
                                        <div
                                            key={index}
                                            className='mx-10 flex flex-wrap items-center gap-2 text-2xl'>
                                            <Icon
                                                icon='DuoCircle'
                                                className='text-blue-500 dark:text-blue-400'
                                            />
                                            {raz}
                                        </div>
                                    ))
                                ) : (
                                    <div />
                                )}
                            </div>
                        ) : (
                            'Verificando completabilidad…'
                        )}
                    </Marquee>
                </CardBody>
            </Card>
        );
    }

    // facturada: mostrar bloqueadores administrativos para el cierre
    if (estado === 'facturada') {
        return (
            <Card>
                <CardBody>
                    <Marquee>
                        {checkBloqueadores ? (
                            <div className='flex flex-row'>
                                {checkBloqueadores.se_puede_avanzar ? (
                                    <div className='text-2xl text-emerald-500'>
                                        Todo listo para Cerrar la OT
                                    </div>
                                ) : checkBloqueadores.razones.length > 0 ? (
                                    checkBloqueadores.razones.map((raz, index) => (
                                        <div
                                            key={index}
                                            className='mx-10 flex flex-wrap items-center gap-2 text-2xl'>
                                            <Icon
                                                icon='DuoCircle'
                                                className='text-amber-500 dark:text-amber-400'
                                            />
                                            {raz}
                                        </div>
                                    ))
                                ) : (
                                    <div />
                                )}
                            </div>
                        ) : (
                            'Verificando requisitos de cierre…'
                        )}
                    </Marquee>
                </CardBody>
            </Card>
        );
    }

    return null;
}

export default MarqueeCompletibilidad;
