import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { ICotizacionVinculadaResumen } from '@/interface/contrato.interface';
import {
  useGetCotizacionesDisponiblesQuery,
  useVincularCotizacionMutation,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import priceFormat from '@/utils/priceFormat.util';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface IModalVincularCotizacionProps {
    isOpen: boolean;
    onClose: () => void;
    contratoId: number;
    cotizacionesYaVinculadas: number[];
}

const ModalVincularCotizacion = ({
    isOpen,
    onClose,
    contratoId,
    cotizacionesYaVinculadas,
}: IModalVincularCotizacionProps) => {
    const { data: disponibles = [], isLoading } = useGetCotizacionesDisponiblesQuery(contratoId, {
        skip: !isOpen,
    });
    const [vincular, { isLoading: vinculando }] = useVincularCotizacionMutation();
    const [seleccionadas, setSeleccionadas] = useState<number[]>([]);

    const cotizacionesFiltradas = disponibles.filter(
        (c: ICotizacionVinculadaResumen) => !cotizacionesYaVinculadas.includes(c.id),
    );

    const toggleSeleccion = (id: number) => {
        setSeleccionadas((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const handleVincular = async () => {
        if (seleccionadas.length === 0) return;
        try {
            await vincular({ contratoId, cotizaciones_ids: seleccionadas }).unwrap();
            toast.success(
                `${seleccionadas.length} cotización(es) vinculada(s)`,
                { autoClose: 1500 },
            );
            setSeleccionadas([]);
            onClose();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleClose = () => {
        setSeleccionadas([]);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={handleClose} isScrollable fullScreen='lg'>
            <ModalHeader>Vincular Cotizaciones</ModalHeader>
            <ModalBody>
                {isLoading ? (
                    <div className='p-4 text-center text-zinc-500'>Cargando cotizaciones...</div>
                ) : cotizacionesFiltradas.length === 0 ? (
                    <div className='p-4 text-center text-zinc-500'>
                        No hay cotizaciones aceptadas disponibles para vincular.
                    </div>
                ) : (
                    <Table>
                        <THead>
                            <Tr>
                                <Th>{' '}</Th>
                                <Th>N° Cotización</Th>
                                <Th>Nombre</Th>
                                <Th>Moneda</Th>
                                <Th>Total</Th>
                                <Th>Items</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {cotizacionesFiltradas.map((cot: ICotizacionVinculadaResumen) => (
                                <Tr
                                    key={cot.id}
                                    className={
                                        seleccionadas.includes(cot.id)
                                            ? 'bg-blue-50 dark:bg-blue-950/30'
                                            : 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                    }
                                    onClick={() => toggleSeleccion(cot.id)}>
                                    <Td>
                                        <input
                                            type='checkbox'
                                            checked={seleccionadas.includes(cot.id)}
                                            onChange={() => toggleSeleccion(cot.id)}
                                            className='h-4 w-4'
                                        />
                                    </Td>
                                    <Td>{cot.numero_cotizacion || '-'}</Td>
                                    <Td>{cot.nombre}</Td>
                                    <Td>
                                        <Badge variant='outline' color='blue'>
                                            {cot.tipo_moneda_label}
                                        </Badge>
                                    </Td>
                                    <Td>{priceFormat(cot.total_estimado)}</Td>
                                    <Td>{cot.items_count}</Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                )}
            </ModalBody>
            <ModalFooter>
                <Button onClick={handleClose}>Cancelar</Button>
                <Button
                    variant='solid'
                    onClick={handleVincular}
                    isLoading={vinculando}
                    isDisable={seleccionadas.length === 0}>
                    Vincular ({seleccionadas.length})
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default ModalVincularCotizacion;
