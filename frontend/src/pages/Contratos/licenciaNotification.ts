import { IContratoLicencia } from '@/interface/contrato.interface';

type TNotificacionLicencia = {
    color: 'emerald' | 'amber' | 'red';
    icon: string;
    titulo: string;
    mensaje: string;
    apoyo?: string;
    marquee: string;
    recordatorio: string;
};

export function buildLicenciaNotification(licencia: IContratoLicencia): TNotificacionLicencia {
    if (!licencia.se_puede_aumentar && !licencia.se_puede_reducir) {
        return {
            color: 'red',
            icon: 'HeroNoSymbol',
            titulo: 'Edicion de cupos no disponible',
            mensaje: 'Esta licencia no admite cambios de cupos en su estado actual.',
            marquee:
                'Edicion de cupos no disponible: esta licencia no admite cambios de cupos en su estado actual.',
            recordatorio: 'Esta licencia no admite cambios de cupos en su estado actual.',
        };
    }

    if (licencia.se_puede_reducir) {
        if (licencia.dias_hasta_fin_edicion === 0) {
            return {
                color: 'amber',
                icon: 'HeroExclamationTriangle',
                titulo: 'Ultimo dia para rebajar cupos',
                mensaje:
                    'Hoy finaliza la ventana para disminuir cupos o solicitar la baja de esta licencia.',
                marquee:
                    'Ultimo dia para rebajar cupos: hoy finaliza la ventana para disminuir cupos o solicitar la baja de esta licencia.',
                recordatorio: 'Hoy es el ultimo dia para rebajar cupos.',
            };
        }

        return {
            color: 'emerald',
            icon: 'HeroCheckCircle',
            titulo: 'Ventana de ajuste activa',
            mensaje: 'Puedes aumentar o disminuir cupos durante esta ventana operativa.',
            apoyo: `Quedan ${licencia.dias_hasta_fin_edicion ?? 0} dia(s) para rebajar cupos o solicitar la baja de la licencia.`,
            marquee: `Ventana de ajuste activa: puedes aumentar o disminuir cupos durante esta ventana operativa. Quedan ${licencia.dias_hasta_fin_edicion ?? 0} dia(s) para rebajar cupos o solicitar la baja de la licencia.`,
            recordatorio: licencia.fecha_fin_edicion
                ? `Puedes rebajar cupos hasta el ${new Date(
                      `${licencia.fecha_fin_edicion}T00:00:00`,
                  ).toLocaleDateString('es-CL')}.`
                : 'Puedes rebajar cupos dentro de la ventana operativa vigente.',
        };
    }

    return {
        color: 'amber',
        icon: 'HeroExclamationTriangle',
        titulo: 'Rebaja de cupos no disponible',
        mensaje: 'La ventana operativa ya finalizo. En este momento solo puedes aumentar cupos.',
        marquee:
            'Rebaja de cupos no disponible: la ventana operativa ya finalizo. En este momento solo puedes aumentar cupos.',
        recordatorio: 'Solo puedes aumentar cupos en este momento.',
    };
}
