import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
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

interface INuevaCondicionState {
    nombre: string;
    detalle: string;
    multa: string;
}

const INITIAL_STATE: INuevaCondicionState = {
    nombre: '',
    detalle: '',
    multa: '',
};

const formatCurrency = (value: number, currency: 'CLP' | 'UF' | 'USD' = 'CLP') => {
    if (currency === 'UF') {
        return `${new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value)} UF`;
    }
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(value);
};

const TabCondiciones = ({
    detalleContratoEmpresaCliente,
    puedeEditar,
}: ITabCondicionesProps) => {
    const [agregando, setAgregando] = useState(false);
    const [nuevaCondicion, setNuevaCondicion] = useState<INuevaCondicionState>(INITIAL_STATE);
    const [confirmEliminarId, setConfirmEliminarId] = useState<number | null>(null);
    const monedaContrato = detalleContratoEmpresaCliente.moneda_cobro ?? 'CLP';
    const [updateContrato, { isLoading: guardando }] = useUpdateContratoMutation();

    const resetForm = () => {
        setNuevaCondicion(INITIAL_STATE);
        setAgregando(false);
    };

    const handleAgregar = async () => {
        const nombre = nuevaCondicion.nombre.trim();
        const detalle = nuevaCondicion.detalle.trim();

        if (!nombre && !detalle) {
            toast.error('Ingresa al menos un nombre o un detalle para la condicion.', {
                toastId: 'condicion-vacia',
            });
            return;
        }

        try {
            const payload = buildUpdatePayload(detalleContratoEmpresaCliente, {
                condiciones_especiales: [
                    ...detalleContratoEmpresaCliente.contrato_condiciones_especiales.map((c) => ({
                        id: c.id,
                    })),
                    {
                        texto: detalle || nombre,
                        nombre: nombre || 'Condicion especial',
                        detalle: detalle || nombre,
                        multa: Number(nuevaCondicion.multa || 0),
                    },
                ],
            });
            await updateContrato({
                id: detalleContratoEmpresaCliente.id,
                data: payload,
            }).unwrap();
            resetForm();
            toast.success('Condicion agregada', { autoClose: 1000 });
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
            setConfirmEliminarId(null);
            toast.success('Condicion eliminada', { autoClose: 1000 });
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
                        <Tooltip text='Agregar condicion especial'>
                            <Button
                                variant='outline'
                                color='blue'
                                icon='HeroPlus'
                                className='text-blue-500'
                                onClick={() => setAgregando((prev) => !prev)}>
                                Agregar
                            </Button>
                        </Tooltip>
                    )}
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='space-y-4 p-4'>
                {agregando && (
                    <div className='grid gap-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/10'>
                        <div className='grid gap-4 lg:grid-cols-2'>
                            <div>
                                <Label htmlFor='condicion-nombre'>Nombre</Label>
                                <Input
                                    id='condicion-nombre'
                                    name='condicion-nombre'
                                    placeholder='Ej. SLA reforzado'
                                    value={nuevaCondicion.nombre}
                                    onChange={(e) =>
                                        setNuevaCondicion((prev) => ({
                                            ...prev,
                                            nombre: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div>
                                <Label htmlFor='condicion-multa'>
                                    Multa por incumplimiento ({monedaContrato})
                                </Label>
                                <Input
                                    id='condicion-multa'
                                    name='condicion-multa'
                                    type='number'
                                    min='0'
                                    placeholder='0'
                                    value={nuevaCondicion.multa}
                                    onChange={(e) =>
                                        setNuevaCondicion((prev) => ({
                                            ...prev,
                                            multa: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor='condicion-detalle'>Detalle</Label>
                            <Textarea
                                id='condicion-detalle'
                                name='condicion-detalle'
                                placeholder='Describe el alcance, excepciones o compromiso de esta condicion.'
                                value={nuevaCondicion.detalle}
                                onChange={(e) =>
                                    setNuevaCondicion((prev) => ({
                                        ...prev,
                                        detalle: e.target.value,
                                    }))
                                }
                                rows={4}
                            />
                        </div>
                        <div className='flex flex-wrap justify-end gap-2'>
                            <Button icon='HeroXMark' color='red' size='sm' onClick={resetForm}>
                                Cancelar
                            </Button>
                            <Button
                                icon='HeroCheck'
                                variant='solid'
                                color='emerald'
                                size='sm'
                                isLoading={guardando}
                                onClick={handleAgregar}>
                                Guardar condicion
                            </Button>
                        </div>
                    </div>
                )}

                {detalleContratoEmpresaCliente.contrato_condiciones_especiales.length > 0 ? (
                    <div className='space-y-3'>
                        {detalleContratoEmpresaCliente.contrato_condiciones_especiales.map(
                            (condicion) => {
                                const multa = Number(condicion.multa_condicion || 0);
                                return (
                                    <div
                                        className='rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800'
                                        key={condicion.id}>
                                        <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                                            <div className='space-y-2'>
                                                <div className='flex flex-wrap items-center gap-2'>
                                                    <div className='text-base font-semibold text-zinc-900 dark:text-zinc-50'>
                                                        {condicion.nombre_condicion ||
                                                            condicion.titulo_condicion}
                                                    </div>
                                                    {multa > 0 && (
                                                        <span className='rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 dark:bg-red-950/30 dark:text-red-300'>
                                                            Multa: {formatCurrency(multa, monedaContrato)}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className='whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-300'>
                                                    {condicion.detalle_condicion ||
                                                        condicion.descripcion_condicion ||
                                                        'Sin detalle adicional.'}
                                                </p>
                                            </div>
                                            {puedeEditar && (
                                                confirmEliminarId === condicion.id ? (
                                                    <div className='flex items-center gap-1'>
                                                        <span className='whitespace-nowrap text-xs text-red-600'>
                                                            ¿Eliminar?
                                                        </span>
                                                        <Button
                                                            color='red'
                                                            variant='solid'
                                                            size='sm'
                                                            isLoading={guardando}
                                                            onClick={() =>
                                                                handleEliminar(condicion.id)
                                                            }>
                                                            Sí
                                                        </Button>
                                                        <Button
                                                            size='sm'
                                                            onClick={() =>
                                                                setConfirmEliminarId(null)
                                                            }>
                                                            No
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Tooltip text='Eliminar condicion'>
                                                        <Button
                                                            color='red'
                                                            icon='HeroTrash'
                                                            size='sm'
                                                            onClick={() =>
                                                                setConfirmEliminarId(condicion.id)
                                                            }
                                                        />
                                                    </Tooltip>
                                                )
                                            )}
                                        </div>
                                    </div>
                                );
                            },
                        )}
                    </div>
                ) : (
                    <div className='rounded-2xl border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700'>
                        Sin condiciones especiales registradas.
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default TabCondiciones;
