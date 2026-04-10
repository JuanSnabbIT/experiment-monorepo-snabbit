import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import type { IOrdenDeTrabajoV3 } from '@/interface/ordenTrabajoV3.interface';
import { useNavigate } from 'react-router-dom';

interface IProps {
    orden: IOrdenDeTrabajoV3;
}

const PanelPorFacturar = ({ orden }: IProps) => {
    const navigate = useNavigate();

    const handleIrCrearPrefactura = () => {
        const params = new URLSearchParams({
            ot_preseleccionada: String(orden.id),
            ...(orden.cliente ? { cliente_id: String(orden.cliente) } : {}),
        });
        navigate(`/facturacion/otv3/prefacturas/crear?${params.toString()}`);
    };

    return (
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            <Card>
                <CardHeader>
                    <CardHeaderChild>Resumen para facturación</CardHeaderChild>
                </CardHeader>
                <CardBody>
                    <div className='space-y-2 text-sm text-gray-700 dark:text-gray-200'>
                        <div>
                            <span className='font-semibold'>Cliente:</span>{' '}
                            {orden.cliente_nombre ?? orden.cliente}
                        </div>
                        <div>
                            <span className='font-semibold'>Contrato:</span>{' '}
                            {orden.contrato ?? 'Sin contrato'}
                        </div>
                        <div>
                            <span className='font-semibold'>Total gastos:</span> $
                            {Number(orden.total_gastos ?? 0).toLocaleString('es-CL')}
                        </div>
                        <div>
                            <span className='font-semibold'>Cotizaciones:</span>{' '}
                            {orden.cotizaciones_detalle?.length ?? 0}
                        </div>
                        <div>
                            <span className='font-semibold'>Guías vinculadas:</span>{' '}
                            {orden.guias_vinculadas?.length ?? 0}
                        </div>
                        <div>
                            <span className='font-semibold'>Órdenes de compra:</span>{' '}
                            {orden.ordenes_compra_vinculadas?.length ?? 0}
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card className='border-blue-200 dark:border-blue-700'>
                <CardHeader>
                    <CardHeaderChild>Prefacturación OT V3</CardHeaderChild>
                </CardHeader>
                <CardBody>
                    <p className='mb-4 text-sm text-gray-500'>
                        Crea o abre la prefactura para cargar el documento de facturación. Al
                        asociar el documento, la OT pasará automáticamente a <strong>Facturada</strong>.
                    </p>
                    <Button
                        variant='solid'
                        color='blue'
                        icon='HeroDocumentText'
                        onClick={handleIrCrearPrefactura}>
                        Ir a prefactura
                    </Button>
                </CardBody>
            </Card>
        </div>
    );
};

export default PanelPorFacturar;

