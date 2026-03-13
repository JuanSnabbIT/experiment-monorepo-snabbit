import Icon from '@/components/icon/Icon';
import Card, { CardBody } from '@/components/ui/Card';
import { IContratoLicencia } from '@/interface/contrato.interface';
import Marquee from 'react-fast-marquee';
import { buildLicenciaNotification } from '../licenciaNotification';

interface IMarqueeEstadoLicenciaProps {
    licencia: IContratoLicencia;
}

function MarqueeEstadoLicencia({ licencia }: IMarqueeEstadoLicenciaProps) {
    const notificacion = buildLicenciaNotification(licencia);
    const colorClass =
        notificacion.color === 'emerald'
            ? 'text-emerald-700 dark:text-emerald-300'
            : notificacion.color === 'red'
              ? 'text-red-700 dark:text-red-300'
              : 'text-amber-700 dark:text-amber-300';

    return (
        <Card>
            <CardBody>
                <Marquee pauseOnHover gradient={false} speed={45}>
                    <div className={`mx-10 flex items-center gap-3 text-lg font-semibold ${colorClass}`}>
                        <Icon icon={notificacion.icon} className={colorClass} />
                        <span>{notificacion.marquee}</span>
                    </div>
                </Marquee>
            </CardBody>
        </Card>
    );
}

export default MarqueeEstadoLicencia;
