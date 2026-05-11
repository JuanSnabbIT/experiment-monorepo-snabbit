import Input from '@/components/form/Input';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { useEffect, useState } from 'react';
import { ITabVisitasProps } from './contrato.types';

const TabVisitas = ({
    detalleContratoEmpresaCliente,
    puedeEditar,
}: ITabVisitasProps) => {
    const visitasPlanMensuales = detalleContratoEmpresaCliente.items_comerciales.reduce(
        (acc, item) => acc + (item.snapshot_num_visitas_mensuales ?? item.num_visitas_mensuales ?? 0),
        0,
    );

    const [visitasMensuales, setVisitasMensuales] = useState<string>(visitasPlanMensuales.toString());
    const [isSaved, setIsSaved] = useState(true);

    useEffect(() => {
        setVisitasMensuales(visitasPlanMensuales.toString());
        setIsSaved(true);
    }, [visitasPlanMensuales]);

    if (detalleContratoEmpresaCliente.tipo !== 'servicios') {
        return null;
    }

    return (
        <Card>
            <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                <CardHeaderChild>
                    <div className='flex flex-col gap-1'>
                        <div className='text-xl font-bold text-blue-500'>Visitas Programadas</div>
                        <div className='text-xs text-zinc-500'>Número de visitas del plan: {visitasPlanMensuales}</div>
                    </div>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='p-4'>
                <div className='flex flex-col gap-4'>
                    <div className='flex items-end gap-2'>
                        <div className='flex-1'>
                            <Input
                                id='visitasMensuales'
                                name='visitasMensuales'
                                type='number'
                                value={visitasMensuales}
                                onChange={(e) => {
                                    setVisitasMensuales(e.target.value);
                                    setIsSaved(false);
                                }}
                                min={0}
                                disabled={!puedeEditar}
                            />
                        </div>
                        <Button
                            variant='solid'
                            color='blue'
                            onClick={() => setIsSaved(true)}
                            disabled={!puedeEditar || isSaved}>
                            Guardar
                        </Button>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
};

export default TabVisitas;
