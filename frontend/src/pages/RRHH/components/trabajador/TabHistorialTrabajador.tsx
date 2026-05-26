import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import dayjs from 'dayjs';

interface ITabHistorialProps {
    contrato: IContratoTrabajador;
}

const ESTADO_LABEL: Record<string, string> = {
    borrador: 'Borrador',
    pendiente_aceptacion: 'Pendiente aceptacion',
    vigente: 'Vigente',
    terminado: 'Terminado',
    anulado: 'Anulado',
};

const TabHistorialTrabajador = ({ contrato }: ITabHistorialProps) => {
    return (
        <Card>
            <CardHeader>Historial del Contrato</CardHeader>
            <CardBody>
                <Table>
                    <THead>
                        <Tr>
                            <Th>Campo</Th>
                            <Th>Valor</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        <Tr>
                            <Td>Estado actual</Td>
                            <Td>{ESTADO_LABEL[contrato.estado] ?? contrato.estado}</Td>
                        </Tr>
                        <Tr>
                            <Td>Fecha creacion</Td>
                            <Td>{dayjs(contrato.fecha_creacion).format('DD/MM/YYYY HH:mm')}</Td>
                        </Tr>
                        <Tr>
                            <Td>Ultima modificacion</Td>
                            <Td>
                                {dayjs(contrato.fecha_modificacion).format('DD/MM/YYYY HH:mm')}
                            </Td>
                        </Tr>
                        {contrato.fecha_aceptacion && (
                            <Tr>
                                <Td>Fecha aceptacion</Td>
                                <Td>
                                    {dayjs(contrato.fecha_aceptacion).format('DD/MM/YYYY HH:mm')}
                                </Td>
                            </Tr>
                        )}
                        {contrato.fecha_termino_real && (
                            <Tr>
                                <Td>Fecha termino real</Td>
                                <Td>
                                    {dayjs(contrato.fecha_termino_real).format('DD/MM/YYYY')}
                                </Td>
                            </Tr>
                        )}
                        {contrato.motivo_termino && (
                            <Tr>
                                <Td>Motivo termino</Td>
                                <Td>
                                    {contrato.motivo_termino_label ?? contrato.motivo_termino}
                                </Td>
                            </Tr>
                        )}
                        {contrato.observaciones_termino && (
                            <Tr>
                                <Td>Observaciones termino</Td>
                                <Td>{contrato.observaciones_termino}</Td>
                            </Tr>
                        )}
                    </TBody>
                </Table>
            </CardBody>
        </Card>
    );
};

export default TabHistorialTrabajador;
