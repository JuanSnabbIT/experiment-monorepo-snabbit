import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { useCreateAsignacionV3Mutation } from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface IProps {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    ordenId: number;
    tecnicosOptions: TSelectOption[];
}

const AsignarTecnicoOTV3 = ({ isOpen, setIsOpen, ordenId, tecnicosOptions }: IProps) => {
    const [createAsignacion, { isLoading }] = useCreateAsignacionV3Mutation();
    const [selected, setSelected] = useState<TSelectOption | null>(null);

    const handleClose = () => {
        setSelected(null);
        setIsOpen(false);
    };

    const handleAsignar = async () => {
        if (!selected) return;
        try {
            await createAsignacion({
                ordenId,
                tecnico: Number(selected.value),
                rol: 'apoyo',
            }).unwrap();
            toast.success('Tecnico asignado correctamente');
            setSelected(null);
            setIsOpen(false);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={handleClose}>
            <ModalHeader>Agregar al equipo de trabajo</ModalHeader>
            <ModalBody>
                <Label htmlFor='tecnico' className='mb-1'>
                    Seleccionar persona
                </Label>
                <SelectReact
                    id='tecnico'
                    name='tecnico'
                    options={tecnicosOptions}
                    value={selected}
                    onChange={(opt) => setSelected((opt as TSelectOption) ?? null)}
                    placeholder='Buscar por nombre...'
                />
            </ModalBody>
            <ModalFooter>
                <Button onClick={handleClose} isDisable={isLoading}>
                    Cancelar
                </Button>
                <Button
                    variant='solid'
                    isLoading={isLoading}
                    isDisable={!selected}
                    onClick={() => { void handleAsignar(); }}>
                    Agregar
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default AsignarTecnicoOTV3;
