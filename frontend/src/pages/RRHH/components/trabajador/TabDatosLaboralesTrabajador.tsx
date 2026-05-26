import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import dayjs from 'dayjs';

interface ITabDatosLaboralesProps {
    contrato: IContratoTrabajador;
}

const Campo = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div>
        <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
            {label}
        </p>
        <p className='mt-0.5 text-sm text-gray-900 dark:text-zinc-100'>{value ?? '—'}</p>
    </div>
);

const TabDatosLaboralesTrabajador = ({ contrato }: ITabDatosLaboralesProps) => {
    return (
        <div className='space-y-4'>
            <Card>
                <CardHeader>Datos del Contrato</CardHeader>
                <CardBody>
                    <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
                        <Campo label='Cargo' value={contrato.cargo} />
                        <Campo
                            label='Tipo de contrato'
                            value={contrato.tipo_contrato_label ?? contrato.tipo_contrato}
                        />
                        <Campo
                            label='Estado'
                            value={contrato.estado_label ?? contrato.estado}
                        />
                        <Campo
                            label='Fecha inicio'
                            value={
                                contrato.fecha_inicio
                                    ? dayjs(contrato.fecha_inicio).format('DD/MM/YYYY')
                                    : null
                            }
                        />
                        <Campo
                            label='Fecha termino'
                            value={
                                contrato.fecha_termino
                                    ? dayjs(contrato.fecha_termino).format('DD/MM/YYYY')
                                    : 'Indefinido'
                            }
                        />
                        <Campo
                            label='Jornada'
                            value={contrato.jornada_label ?? contrato.jornada}
                        />
                        <Campo
                            label='Horas semanales'
                            value={contrato.horas_semanales ?? '—'}
                        />
                        <Campo label='Lugar de trabajo' value={contrato.lugar_trabajo} />
                    </div>
                    {contrato.funciones && (
                        <div className='mt-4'>
                            <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                Funciones
                            </p>
                            <p className='mt-0.5 whitespace-pre-wrap text-sm text-gray-900 dark:text-zinc-100'>
                                {contrato.funciones}
                            </p>
                        </div>
                    )}
                </CardBody>
            </Card>
            <Card>
                <CardHeader>Datos del Trabajador</CardHeader>
                <CardBody>
                    <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
                        <Campo label='Nombre' value={contrato.nombre_trabajador} />
                        <Campo label='Email' value={contrato.email_trabajador} />
                        <Campo label='RUT' value={contrato.rut_trabajador} />
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};

export default TabDatosLaboralesTrabajador;
