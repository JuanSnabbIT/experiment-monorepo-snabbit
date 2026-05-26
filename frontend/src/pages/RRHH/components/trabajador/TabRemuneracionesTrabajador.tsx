import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';

interface ITabRemuneracionesProps {
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

const TabRemuneracionesTrabajador = ({ contrato }: ITabRemuneracionesProps) => {
    return (
        <Card>
            <CardHeader>Remuneraciones</CardHeader>
            <CardBody>
                <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
                    <Campo
                        label='Sueldo base'
                        value={
                            contrato.sueldo_base
                                ? `${contrato.sueldo_base} ${contrato.moneda_label ?? contrato.moneda}`
                                : null
                        }
                    />
                    <Campo
                        label='Moneda'
                        value={contrato.moneda_label ?? contrato.moneda}
                    />
                    <Campo
                        label='Gratificacion legal'
                        value={contrato.gratificacion_legal ? 'Si' : 'No'}
                    />
                    <Campo
                        label='Bono movilizacion'
                        value={
                            contrato.bono_movilizacion && contrato.bono_movilizacion !== '0.00'
                                ? contrato.bono_movilizacion
                                : 'No aplica'
                        }
                    />
                    <Campo
                        label='Bono colacion'
                        value={
                            contrato.bono_colacion && contrato.bono_colacion !== '0.00'
                                ? contrato.bono_colacion
                                : 'No aplica'
                        }
                    />
                </div>
            </CardBody>
        </Card>
    );
};

export default TabRemuneracionesTrabajador;
