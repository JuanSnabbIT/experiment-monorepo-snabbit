import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import { useGetContratoTrabajadorDetalleQuery } from '@/store/slices/rrhh/contratoTrabajadorApi';
import dayjs from 'dayjs';

interface ITabFirmaProps {
    contratoId: number;
    contrato: IContratoTrabajador;
}

const TabFirmaTrabajador = ({ contratoId }: ITabFirmaProps) => {
    const { data: contratoDetalle } = useGetContratoTrabajadorDetalleQuery(contratoId);
    const envios = (contratoDetalle as (IContratoTrabajador & { envios_firma?: IEnvioFirma[] }))
        ?.envios_firma ?? [];

    return (
        <Card>
            <CardHeader>Envios a Firma</CardHeader>
            <CardBody>
                {envios.length === 0 ? (
                    <p className='text-sm text-gray-500 dark:text-zinc-400'>
                        No se han enviado contratos a firma aun.
                    </p>
                ) : (
                    <Table>
                        <THead>
                            <Tr>
                                <Th>Fecha envio</Th>
                                <Th>Estado</Th>
                                <Th>Fecha firma</Th>
                                <Th>URL</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {envios.map((envio) => (
                                <Tr key={envio.uuid}>
                                    <Td>
                                        {envio.fecha_envio
                                            ? dayjs(envio.fecha_envio).format('DD/MM/YYYY HH:mm')
                                            : '—'}
                                    </Td>
                                    <Td>
                                        {envio.firmado ? (
                                            <Badge color='emerald'>Firmado</Badge>
                                        ) : (
                                            <Badge color='amber'>Pendiente</Badge>
                                        )}
                                    </Td>
                                    <Td>
                                        {envio.fecha_firma
                                            ? dayjs(envio.fecha_firma).format('DD/MM/YYYY HH:mm')
                                            : '—'}
                                    </Td>
                                    <Td>
                                        <Button
                                            icon='HeroArrowTopRightOnSquare'
                                            size='sm'
                                            onClick={() => {
                                                const url = `/contrato/public/firma-trabajador/${envio.uuid}`;
                                                navigator.clipboard
                                                    .writeText(window.location.origin + url)
                                                    .then(() => {})
                                                    .catch(() => {});
                                            }}>
                                            Copiar URL
                                        </Button>
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                )}
            </CardBody>
        </Card>
    );
};

interface IEnvioFirma {
    uuid: string;
    firmado: boolean;
    fecha_envio: string | null;
    fecha_firma: string | null;
}

export default TabFirmaTrabajador;
