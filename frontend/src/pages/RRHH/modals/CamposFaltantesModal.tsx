import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import Textarea from '@/components/form/Textarea';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import { ICampoFaltante, ICampoConAlcance } from '@/interface/rrhh.interface';
import {
    useCompletarCamposFaltantesContratoTrabajadorMutation,
    useGenerarPdfContratoTrabajadorMutation,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface Props {
    isOpen: boolean;
    camposFaltantes: ICampoFaltante[];
    onClose: () => void;
    // Modo "posterior": el contrato ya existe — se guarda de inmediato
    // via API y se regenera el PDF.
    contratoId?: number;
    // Modo "previo": el contrato aun no se crea — se entrega el payload
    // armado al padre (o null si se omitió), que lo aplica al momento de
    // crear el contrato. No se llama a ningun endpoint desde aqui.
    onGuardarPrevio?: (payload: Record<string, string | ICampoConAlcance> | null) => void;
}

const UBICACION_HINT: Record<ICampoFaltante['ubicacion'], string> = {
    wizard: 'Dato del contrato',
    trabajador: 'Dato del trabajador',
    empresa: 'Dato de la empresa',
};

// Claves cuyo valor puede guardarse "para siempre" en un registro compartido
// (Usuario/Empresa) o "solo para este contrato" — las de ubicacion 'wizard'
// ya viven en el contrato mismo, no aplica la eleccion.
const CLAVES_CON_ALCANCE = new Set(['rut_trabajador', 'rut_empresa', 'representante_legal', 'rut_representante']);

const CamposFaltantesModal = ({ isOpen, contratoId, camposFaltantes, onClose, onGuardarPrevio }: Props) => {
    const [valores, setValores] = useState<Record<string, string>>({});
    const [guardarSiempre, setGuardarSiempre] = useState<Record<string, boolean>>({});
    const [completar, { isLoading: isSaving }] = useCompletarCamposFaltantesContratoTrabajadorMutation();
    const [generarPdf, { isLoading: isGenerandoPdf }] = useGenerarPdfContratoTrabajadorMutation();
    const isLoading = isSaving || isGenerandoPdf;

    const construirPayload = (): Record<string, string | ICampoConAlcance> => {
        const payload: Record<string, string | ICampoConAlcance> = {};
        for (const campo of camposFaltantes) {
            const valor = (valores[campo.clave] || '').trim();
            if (!valor) continue;
            if (CLAVES_CON_ALCANCE.has(campo.clave)) {
                payload[campo.clave] = {
                    valor,
                    guardar_siempre: !!guardarSiempre[campo.clave],
                };
            } else {
                payload[campo.clave] = valor;
            }
        }
        return payload;
    };

    const handleOmitir = () => {
        onGuardarPrevio?.(null);
        onClose();
    };

    const handleGuardar = async () => {
        const payload = construirPayload();

        if (Object.keys(payload).length === 0) {
            handleOmitir();
            return;
        }

        // Modo previo: el contrato aun no existe, se entrega el payload al
        // wizard para que lo aplique al crear el contrato.
        if (!contratoId) {
            onGuardarPrevio?.(payload);
            onClose();
            return;
        }

        try {
            await completar({ id: contratoId, ...payload }).unwrap();
            // El PDF ya se generó antes de mostrar este modal (con los datos
            // que estaban faltando en blanco); hay que regenerarlo para que
            // refleje lo que se acaba de guardar.
            try {
                await generarPdf(contratoId).unwrap();
            } catch {
                toast.warning('Datos completados, pero no se pudo regenerar el PDF.');
            }
            toast.success('Datos completados.');
            onClose();
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    return (
        <Modal setIsOpen={(open) => !open && handleOmitir()} isOpen={isOpen} size='lg' isStaticBackdrop>
            <ModalHeader>
                <div>
                    <p className='font-semibold leading-tight'>Faltan datos obligatorios</p>
                    <p className='text-xs font-normal text-zinc-500 dark:text-zinc-400'>
                        {contratoId
                            ? 'El contrato ya se creó. Puedes completar estos datos ahora (opcional) o hacerlo después desde el detalle del contrato.'
                            : 'Puedes completarlos ahora (opcional) antes de generar el contrato, o hacerlo después desde su detalle.'}
                    </p>
                </div>
            </ModalHeader>
            <ModalBody isScrollable>
                <div className='space-y-4'>
                    {camposFaltantes.map((campo) => (
                        <div key={campo.clave} className='rounded-xl border border-zinc-200 p-3 dark:border-zinc-700'>
                            <Label htmlFor={`falta_${campo.clave}`} className='mb-0'>
                                {campo.label}
                            </Label>
                            <p className='mb-1 text-xs text-zinc-400 dark:text-zinc-500'>
                                {UBICACION_HINT[campo.ubicacion]}
                            </p>
                            {campo.clave === 'funciones_cargo' ? (
                                <Textarea
                                    id={`falta_${campo.clave}`}
                                    rows={2}
                                    value={valores[campo.clave] || ''}
                                    onChange={(e) =>
                                        setValores((prev) => ({ ...prev, [campo.clave]: e.target.value }))
                                    }
                                />
                            ) : (
                                <Input
                                    id={`falta_${campo.clave}`}
                                    name={`falta_${campo.clave}`}
                                    value={valores[campo.clave] || ''}
                                    onChange={(e) =>
                                        setValores((prev) => ({ ...prev, [campo.clave]: e.target.value }))
                                    }
                                />
                            )}
                            {CLAVES_CON_ALCANCE.has(campo.clave) && (
                                <div className='mt-2'>
                                    <Checkbox
                                        id={`siempre_${campo.clave}`}
                                        checked={!!guardarSiempre[campo.clave]}
                                        onChange={(e) =>
                                            setGuardarSiempre((prev) => ({
                                                ...prev,
                                                [campo.clave]: e.target.checked,
                                            }))
                                        }
                                        label={
                                            campo.ubicacion === 'empresa'
                                                ? 'Guardar permanentemente en la empresa (afecta a todos sus contratos)'
                                                : 'Guardar permanentemente en la ficha del trabajador'
                                        }
                                        dimension='sm'
                                    />
                                    {!guardarSiempre[campo.clave] && (
                                        <p className='mt-1 pl-6 text-xs text-zinc-400 dark:text-zinc-500'>
                                            Sin marcar: se usa solo para este contrato.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild>
                    <Button variant='outline' color='zinc' onClick={handleOmitir}>
                        Omitir por ahora
                    </Button>
                </ModalFooterChild>
                <ModalFooterChild>
                    <Button variant='solid' color='blue' isLoading={isLoading} onClick={handleGuardar}>
                        Guardar
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

export default CamposFaltantesModal;
