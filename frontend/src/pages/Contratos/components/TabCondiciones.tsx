import Textarea from '@/components/form/Textarea';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { useUpdateContratoMutation } from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { buildUpdatePayload } from './contrato.helpers';
import { ITabCondicionesProps } from './contrato.types';

const TabCondiciones = ({
    detalleContratoEmpresaCliente,
    puedeEditar,
}: ITabCondicionesProps) => {
    const [agregando, setAgregando] = useState(false);
    const [textoCondicion, setTextoCondicion] = useState('');
    const [updateContrato, { isLoading: guardando }] = useUpdateContratoMutation();

    const handleAgregar = async () => {
        if (textoCondicion.trim() === '') {
            toast.error('Ingrese el texto de la condición', {
                toastId: 'condicion-texto-vacio',
            });
            return;
        }
        try {
            const payload = buildUpdatePayload(detalleContratoEmpresaCliente, {
                condiciones_especiales: [
                    ...detalleContratoEmpresaCliente.contrato_condiciones_especiales.map((c) => ({
                        id: c.id,
                    })),
                    { texto: textoCondicion.trim() },
                ],
            });
            await updateContrato({
                id: detalleContratoEmpresaCliente.id,
                data: payload,
            }).unwrap();
            setTextoCondicion('');
            setAgregando(false);
            toast.success('Condición agregada', { autoClose: 1000 });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleEliminar = async (condicionId: number) => {
        try {
            const payload = buildUpdatePayload(detalleContratoEmpresaCliente, {
                condiciones_especiales: detalleContratoEmpresaCliente.contrato_condiciones_especiales
                    .filter((c) => c.id !== condicionId)
                    .map((c) => ({ id: c.id })),
                eliminar_condiciones: [condicionId],
            });
            await updateContrato({
                id: detalleContratoEmpresaCliente.id,
                data: payload,
            }).unwrap();
            toast.success('Condición eliminada', { autoClose: 1000 });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <Card>
            <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                <CardHeaderChild>
                    <div className='text-xl font-bold text-blue-500'>Condiciones Especiales</div>
                </CardHeaderChild>
                <CardHeaderChild>
                    {puedeEditar && (
                        <Tooltip text='Agregar Condición'>
                            <Button
                                variant='outline'
                                color='blue'
                                icon='HeroPlus'
                                className='text-blue-500'
                                onClick={() => setAgregando(!agregando)}>
                                Agregar
                            </Button>
                        </Tooltip>
                    )}
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='p-4'>
                <div className='flex flex-col'>
                    {agregando && (
                        <div className='mb-4 flex flex-col gap-2 rounded-lg border border-blue-200 p-3 dark:border-blue-800'>
                            <Textarea
                                name='texto_condicion'
                                placeholder='Escriba la condición especial...'
                                value={textoCondicion}
                                onChange={(e) => setTextoCondicion(e.target.value)}
                                rows={3}
                            />
                            <div className='flex justify-end gap-2'>
                                <Button
                                    icon='HeroXMark'
                                    color='red'
                                    size='sm'
                                    onClick={() => {
                                        setAgregando(false);
                                        setTextoCondicion('');
                                    }}>
                                    Cancelar
                                </Button>
                                <Button
                                    icon='HeroCheck'
                                    variant='solid'
                                    color='emerald'
                                    size='sm'
                                    isLoading={guardando}
                                    onClick={handleAgregar}>
                                    Guardar
                                </Button>
                            </div>
                        </div>
                    )}
                    {detalleContratoEmpresaCliente.contrato_condiciones_especiales.length > 0 ? (
                        detalleContratoEmpresaCliente.contrato_condiciones_especiales.map(
                            (condicion, index) => (
                                <div
                                    className='flex items-start justify-between gap-2 border-b border-zinc-200 px-2 py-3 last:border-b-0 dark:border-zinc-700'
                                    key={condicion.id ?? index}>
                                    <div className='flex-1'>
                                        <div className='font-semibold'>
                                            {condicion.titulo_condicion}
                                        </div>
                                        {condicion.descripcion_condicion &&
                                            condicion.descripcion_condicion !==
                                                condicion.titulo_condicion && (
                                                <div className='mt-1 text-sm text-zinc-500'>
                                                    {condicion.descripcion_condicion}
                                                </div>
                                            )}
                                    </div>
                                    {puedeEditar && (
                                        <Tooltip text='Eliminar condición'>
                                            <Button
                                                color='red'
                                                icon='HeroTrash'
                                                size='sm'
                                                onClick={() => handleEliminar(condicion.id)}
                                            />
                                        </Tooltip>
                                    )}
                                </div>
                            ),
                        )
                    ) : (
                        <div className='text-sm text-zinc-500'>Sin Condiciones</div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
};

export default TabCondiciones;
