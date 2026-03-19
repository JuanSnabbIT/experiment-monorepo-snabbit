import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import type { IContratoHistorialEvento } from '@/interface/contrato.interface';
import { useGetHistorialContratoQuery } from '@/store/slices/contratos/contratoApi';
import dayjs from 'dayjs';
import { useState } from 'react';
import ModalDetalleHistorial from '../modals/ModalDetalleHistorial';

interface ITabHistorialProps {
    contratoId: number;
}

const colorTipo = (tipo: string): 'blue' | 'emerald' | 'amber' | 'red' | 'violet' | 'zinc' => {
    switch (tipo) {
        case 'Creacion':
            return 'emerald';
        case 'Firma':
            return 'violet';
        case 'Aprobacion':
            return 'emerald';
        case 'Revision':
            return 'amber';
        case 'Envio':
            return 'blue';
        case 'Eliminacion':
            return 'red';
        default:
            return 'zinc';
    }
};

const TabHistorial = ({ contratoId }: ITabHistorialProps) => {
    const [verTodos, setVerTodos] = useState(false);
    const [eventoSeleccionado, setEventoSeleccionado] =
        useState<IContratoHistorialEvento | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const {
        data: historial = [],
        isLoading,
        isError,
    } = useGetHistorialContratoQuery({ id: contratoId, soloCliente: !verTodos });

    return (
        <>
            <Card>
                <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                    <CardHeaderChild>
                        <div className='text-xl font-bold text-blue-500'>
                            Historial del contrato
                        </div>
                    </CardHeaderChild>
                    <CardHeaderChild>
                        <Button
                            size='sm'
                            variant={verTodos ? 'solid' : 'outline'}
                            color='blue'
                            onClick={() => setVerTodos((prev) => !prev)}>
                            {verTodos ? 'Solo cambios del cliente' : 'Ver todo'}
                        </Button>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className='p-4'>
                    {isLoading ? (
                        <p className='text-sm text-zinc-500'>Cargando historial...</p>
                    ) : isError ? (
                        <p className='text-sm text-red-500'>
                            No se pudo cargar el historial.
                        </p>
                    ) : historial.length === 0 ? (
                        <p className='text-sm text-zinc-500'>Sin eventos registrados.</p>
                    ) : (
                        <div className='flex flex-col gap-2'>
                            {historial.map((evento) => (
                                <button
                                    key={evento.id}
                                    type='button'
                                    className='flex w-full cursor-pointer items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    onClick={() => {
                                        setEventoSeleccionado(evento);
                                        setModalOpen(true);
                                    }}>
                                    <Badge
                                        variant='outline'
                                        color={colorTipo(evento.tipo)}
                                        className='mt-0.5 shrink-0 text-[10px]'>
                                        {evento.tipo}
                                    </Badge>
                                    <div className='min-w-0 flex-1'>
                                        <p className='truncate text-sm font-medium text-zinc-800 dark:text-zinc-200'>
                                            {evento.detalle}
                                        </p>
                                        <p className='text-xs text-zinc-500'>
                                            {evento.fecha
                                                ? dayjs(evento.fecha).format('DD/MM/YYYY HH:mm')
                                                : '—'}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>

            <ModalDetalleHistorial
                evento={eventoSeleccionado}
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
            />
        </>
    );
};

export default TabHistorial;
