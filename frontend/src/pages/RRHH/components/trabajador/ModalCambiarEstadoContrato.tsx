import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Button from '@/components/ui/Button';
import ButtonGroup from '@/components/ui/ButtonGroup';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import type {
    IContratoTrabajador,
    TEstadoContrato,
    TMotivoTerminoContrato,
} from '@/interface/rrhh.interface';
import { useCambiarEstadoContratoTrabajadorMutation } from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useState } from 'react';
import { toast } from 'react-toastify';

const TRANSICIONES: Record<TEstadoContrato, TEstadoContrato[]> = {
    borrador: ['pendiente_aceptacion', 'vigente', 'anulado'],
    pendiente_aceptacion: ['vigente', 'anulado', 'borrador'],
    vigente: ['terminado', 'anulado'],
    terminado: [],
    anulado: [],
};

const ESTADO_LABEL: Record<TEstadoContrato, string> = {
    borrador: 'Borrador',
    pendiente_aceptacion: 'Pendiente de aceptacion',
    vigente: 'Vigente',
    terminado: 'Terminado',
    anulado: 'Anulado',
};

const MOTIVO_OPTIONS: TSelectOption[] = [
    { value: 'renuncia', label: 'Renuncia voluntaria' },
    { value: 'mutuo_acuerdo', label: 'Mutuo acuerdo' },
    { value: 'vencimiento_plazo', label: 'Vencimiento de plazo' },
    { value: 'necesidades_empresa', label: 'Necesidades de la empresa' },
    { value: 'otro', label: 'Otro' },
];

interface IProps {
    contrato: IContratoTrabajador;
    isOpen: boolean;
    onClose: () => void;
}

const ModalCambiarEstadoContrato = ({ contrato, isOpen, onClose }: IProps) => {
    const transiciones = TRANSICIONES[contrato.estado] ?? [];

    const [cambiarEstado, { isLoading }] = useCambiarEstadoContratoTrabajadorMutation();

    const [estadoDestino, setEstadoDestino] = useState<TEstadoContrato | null>(null);
    const [fechaTerminoReal, setFechaTerminoReal] = useState(
        dayjs().format('YYYY-MM-DD'),
    );
    const [motivoTermino, setMotivoTermino] = useState<TSelectOption | null>(null);
    const [observaciones, setObservaciones] = useState('');

    const requiereTermino = estadoDestino === 'terminado';

    const handleConfirmar = async () => {
        if (!estadoDestino) return;
        if (requiereTermino && !motivoTermino) {
            toast.warning('Selecciona el motivo de termino.');
            return;
        }
        try {
            await cambiarEstado({
                id: contrato.id,
                estado: estadoDestino,
                ...(requiereTermino && {
                    fecha_termino_real: fechaTerminoReal,
                    motivo_termino: motivoTermino!.value as TMotivoTerminoContrato,
                    observaciones_termino: observaciones.trim() || undefined,
                }),
            }).unwrap();
            toast.success(`Contrato cambiado a "${ESTADO_LABEL[estadoDestino]}".`);
            onClose();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        }
    };

    const handleClose = () => {
        setEstadoDestino(null);
        setMotivoTermino(null);
        setObservaciones('');
        setFechaTerminoReal(dayjs().format('YYYY-MM-DD'));
        onClose();
    };

    if (transiciones.length === 0) return null;

    return (
        <Modal isOpen={isOpen} setIsOpen={handleClose} size='sm'>
            <ModalHeader>Cambiar estado del contrato</ModalHeader>
            <ModalBody className='space-y-4'>
                <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                    Estado actual:{' '}
                    <strong className='text-zinc-800 dark:text-zinc-100'>
                        {ESTADO_LABEL[contrato.estado]}
                    </strong>
                </p>

                {/* Botones de transicion */}
                <div>
                    <Label>Nuevo estado</Label>
                    <ButtonGroup className='mt-1 flex flex-wrap'>
                        {transiciones.map((est) => (
                            <Button
                                key={est}
                                size='sm'
                                variant={estadoDestino === est ? 'solid' : 'outline'}
                                color={estadoDestino === est ? 'blue' : 'zinc'}
                                isActive={estadoDestino === est}
                                onClick={() => setEstadoDestino(est)}>
                                {ESTADO_LABEL[est]}
                            </Button>
                        ))}
                    </ButtonGroup>
                </div>

                {/* Campos extra para estado "terminado" */}
                {requiereTermino && (
                    <>
                        <div>
                            <Label htmlFor='cec_fecha'>Fecha de termino real</Label>
                            <Input
                                id='cec_fecha'
                                name='cec_fecha'
                                type='date'
                                value={fechaTerminoReal}
                                onChange={(e) => setFechaTerminoReal(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor='cec_motivo'>Motivo de termino</Label>
                            <SelectReact
                                name='cec_motivo'
                                options={MOTIVO_OPTIONS}
                                value={motivoTermino}
                                onChange={(opt) => setMotivoTermino(opt as TSelectOption | null)}
                                placeholder='Seleccionar motivo...'
                            />
                        </div>
                        <div>
                            <Label htmlFor='cec_obs'>Observaciones (opcional)</Label>
                            <Textarea
                                id='cec_obs'
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                rows={2}
                                placeholder='Notas adicionales...'
                            />
                        </div>
                    </>
                )}
            </ModalBody>
            <ModalFooter>
                <Button onClick={handleClose} isDisable={isLoading}>
                    Cancelar
                </Button>
                <Button
                    variant='solid'
                    color={estadoDestino === 'anulado' ? 'red' : 'blue'}
                    isDisable={!estadoDestino || isLoading}
                    isLoading={isLoading}
                    onClick={handleConfirmar}>
                    Confirmar
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default ModalCambiarEstadoContrato;
