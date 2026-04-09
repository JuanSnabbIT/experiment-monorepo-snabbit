import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { useGetGuiasDisponiblesV3Query, useVincularGuiaV3Mutation } from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface IProps {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    ordenId: number;
}

const VincularGuiaOTV3 = ({ isOpen, setIsOpen, ordenId }: IProps) => {
    const [guiaId, setGuiaId] = useState<string | null>(null);
    const { data: guias = [], isFetching } = useGetGuiasDisponiblesV3Query(ordenId, { skip: !isOpen });
    const [vincularGuia, { isLoading }] = useVincularGuiaV3Mutation();

    const opciones: TSelectOption[] = guias.map((g) => ({
        value: String(g.id),
        label: `#${g.id} — ${g.estado_label} | ${g.descripcion_items || 'Sin items'} | ${g.cliente_nombre}`,
    }));

    const handleConfirmar = async () => {
        if (!guiaId) return;
        try {
            await vincularGuia({ ordenId, guia_id: Number(guiaId) }).unwrap();
            toast.success('Guia vinculada correctamente');
            setGuiaId(null);
            setIsOpen(false);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleClose = () => {
        setGuiaId(null);
        setIsOpen(false);
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={handleClose}>
            <ModalHeader>Vincular Guia de Salida</ModalHeader>
            <ModalBody className='grid grid-cols-1 gap-4'>
                <SelectReact
                    name='guia_id'
                    options={opciones}
                    value={opciones.find((o) => o.value === guiaId) ?? null}
                    onChange={(opt) => setGuiaId(opt ? (opt as TSelectOption).value : null)}
                    isLoading={isFetching}
                    placeholder='Selecciona una guia disponible...'
                />
            </ModalBody>
            <ModalFooter>
                <Button onClick={handleClose} isDisable={isLoading}>
                    Cancelar
                </Button>
                <Button
                    variant='solid'
                    isLoading={isLoading}
                    isDisable={!guiaId}
                    onClick={() => { void handleConfirmar(); }}>
                    Vincular
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default VincularGuiaOTV3;
