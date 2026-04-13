import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import type { IOrdenDeTrabajoV3 } from '@/interface/ordenTrabajoV3.interface';
import { useSolicitarRetroalimentacionV3Mutation } from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { toast } from 'react-toastify';

interface IProps {
    orden: IOrdenDeTrabajoV3;
}

const PanelRetroalimentacion = ({ orden }: IProps) => {
    const [solicitarRetro, { isLoading }] = useSolicitarRetroalimentacionV3Mutation();

    const solicitante = orden.cliente_solicitante_detalle;

    const handleReenviar = async () => {
        try {
            await solicitarRetro(orden.id).unwrap();
            toast.success('Correo de retroalimentacion reenviado correctamente.');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <span className='font-semibold text-gray-700 dark:text-gray-200'>
                        Retroalimentacion del Cliente
                    </span>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='space-y-4'>
                <div className='rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-700 dark:bg-violet-900/20'>
                    <p className='mb-1 text-sm font-semibold text-violet-800 dark:text-violet-300'>
                        Estado: Esperando respuesta
                    </p>
                    <p className='text-sm text-violet-700 dark:text-violet-400'>
                        Se ha enviado una encuesta de satisfaccion al cliente. La OT avanzara
                        automaticamente a{' '}
                        <span className='font-medium'>Por facturar</span> cuando el cliente
                        responda, o al vencer el plazo de 72 horas.
                    </p>
                </div>

                {solicitante && (
                    <div className='text-sm text-gray-600 dark:text-gray-400'>
                        <span className='font-medium'>Enviado a:</span>{' '}
                        {solicitante.nombre}
                        {solicitante.email && (
                            <span className='ml-1 text-gray-400'>({solicitante.email})</span>
                        )}
                    </div>
                )}

                {!solicitante && (
                    <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20'>
                        <p className='text-sm text-amber-700 dark:text-amber-300'>
                            Esta OT no tiene un solicitante configurado. No se enviara correo de
                            retroalimentacion automaticamente.
                        </p>
                    </div>
                )}

                {solicitante && (
                    <div className='flex justify-end'>
                        <Button
                            icon='HeroArrowPath'
                            isLoading={isLoading}
                            onClick={handleReenviar}>
                            Reenviar correo
                        </Button>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default PanelRetroalimentacion;
