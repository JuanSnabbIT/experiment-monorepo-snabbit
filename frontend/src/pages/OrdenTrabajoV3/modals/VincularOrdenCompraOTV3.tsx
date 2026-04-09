import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import {
    useGetOrdenesCompraDisponiblesV3Query,
    useVincularOrdenCompraV3Mutation,
} from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface IProps {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    ordenId: number;
}

const VincularOrdenCompraOTV3 = ({ isOpen, setIsOpen, ordenId }: IProps) => {
    const [ocId, setOcId] = useState<string | null>(null);
    const { data: ordenes = [], isFetching } = useGetOrdenesCompraDisponiblesV3Query(ordenId, {
        skip: !isOpen,
    });
    const [vincularOC, { isLoading }] = useVincularOrdenCompraV3Mutation();

    const opciones: TSelectOption[] = ordenes.map((oc) => ({
        value: String(oc.id),
        label: `${oc.codigo} — ${oc.estado_label} | ${oc.nombre_proveedor}`,
    }));

    const handleConfirmar = async () => {
        if (!ocId) return;
        try {
            await vincularOC({ ordenId, orden_compra_id: Number(ocId) }).unwrap();
            toast.success('Orden de compra vinculada correctamente');
            setOcId(null);
            setIsOpen(false);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleClose = () => {
        setOcId(null);
        setIsOpen(false);
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={handleClose}>
            <ModalHeader>Vincular Orden de Compra</ModalHeader>
            <ModalBody className='grid grid-cols-1 gap-4'>
                <SelectReact
                    name='orden_compra_id'
                    options={opciones}
                    value={opciones.find((o) => o.value === ocId) ?? null}
                    onChange={(opt) => setOcId(opt ? (opt as TSelectOption).value : null)}
                    isLoading={isFetching}
                    placeholder='Selecciona una orden de compra disponible...'
                />
            </ModalBody>
            <ModalFooter>
                <Button onClick={handleClose} isDisable={isLoading}>
                    Cancelar
                </Button>
                <Button
                    variant='solid'
                    isLoading={isLoading}
                    isDisable={!ocId}
                    onClick={() => {
                        void handleConfirmar();
                    }}>
                    Vincular
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default VincularOrdenCompraOTV3;
