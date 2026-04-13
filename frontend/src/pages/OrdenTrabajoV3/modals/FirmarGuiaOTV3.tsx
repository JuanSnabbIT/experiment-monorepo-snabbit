import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import type { IGuiaSalidaResumenOTV3 } from '@/interface/ordenTrabajoV3.interface';
import { useAprobarGuiaV3Mutation } from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-toastify';

interface IProps {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    guia: IGuiaSalidaResumenOTV3 | null;
    ordenId: number;
    firmantesOptions?: TSelectOption[];
}

const FirmarGuiaOTV3 = ({ isOpen, setIsOpen, guia, ordenId, firmantesOptions = [] }: IProps) => {
    const sigRef = useRef<SignatureCanvas>(null);
    const [firma, setFirma] = useState('');
    const [receptorSeleccionado, setReceptorSeleccionado] = useState<TSelectOption | null>(null);
    const [aprobarGuia, { isLoading }] = useAprobarGuiaV3Mutation();

    const handleClose = () => {
        setFirma('');
        setReceptorSeleccionado(null);
        sigRef.current?.clear();
        setIsOpen(false);
    };

    const handleSubmit = async () => {
        if (!guia) return;
        const nombreFirma = firmantesOptions.length > 0
            ? receptorSeleccionado?.label ?? ''
            : firma.trim();
        if (!nombreFirma) {
            toast.warning('Selecciona o ingresa el nombre de quien recibe');
            return;
        }
        if (!sigRef.current || sigRef.current.isEmpty()) {
            toast.warning('La firma es requerida');
            return;
        }
        try {
            await aprobarGuia({
                guiaId: guia.id,
                ordenId,
                firma_recibido_por: nombreFirma,
                firma_base64: sigRef.current.toDataURL(),
                ...(receptorSeleccionado ? { recibido_por: Number(receptorSeleccionado.value) } : {}),
            }).unwrap();
            toast.success(`Guia #${guia.id} firmada correctamente`);
            handleClose();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    if (!guia) return null;

    return (
        <Modal isOpen={isOpen} setIsOpen={handleClose} size='md'>
            <ModalHeader>Firmar Guia de Salida #{guia.id}</ModalHeader>
            <ModalBody>
                <div className='space-y-4'>
                    {guia.descripcion_items && (
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                            {guia.descripcion_items}
                        </p>
                    )}

                    <div className='grid grid-cols-1 gap-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20'>
                        <p className='text-sm font-semibold text-amber-800 dark:text-amber-300'>
                            Firma de recepcion requerida
                        </p>

                        <div>
                            <Label htmlFor='firma_recibido_por' className='mb-1'>
                                Quien recibe{' '}
                                <span className='text-red-500'>*</span>
                                <span className='ml-1 text-xs font-normal text-gray-400'>(usuario de la empresa proveedora)</span>
                            </Label>
                            {firmantesOptions.length > 0 ? (
                                <SelectReact
                                    id='firma_recibido_por'
                                    name='firma_recibido_por'
                                    options={firmantesOptions}
                                    isClearable
                                    placeholder='Selecciona el tecnico...'
                                    value={receptorSeleccionado}
                                    onChange={(opt) =>
                                        setReceptorSeleccionado((opt as TSelectOption) ?? null)
                                    }
                                />
                            ) : (
                                <Input
                                    id='firma_recibido_por'
                                    name='firma_recibido_por'
                                    value={firma}
                                    onChange={(e) => setFirma(e.target.value)}
                                    placeholder='Nombre completo del receptor'
                                    autoFocus
                                />
                            )}
                        </div>

                        <div>
                            <div className='mb-1 flex items-center justify-between'>
                                <Label htmlFor='firma_canvas' className='mb-0'>
                                    Firma <span className='text-red-500'>*</span>
                                </Label>
                                <Button
                                    size='sm'
                                    color='red'
                                    icon='HeroXMark'
                                    onClick={() => sigRef.current?.clear()}>
                                    Limpiar
                                </Button>
                            </div>
                            <div className='overflow-hidden rounded-md border-2 border-dashed border-amber-400 bg-white dark:border-amber-600'>
                                <SignatureCanvas
                                    ref={sigRef}
                                    penColor='#1e293b'
                                    canvasProps={{
                                        id: 'firma_canvas',
                                        className: 'w-full',
                                        height: 180,
                                    }}
                                />
                            </div>
                            <p className='mt-1 text-xs text-amber-600 dark:text-amber-400'>
                                Dibuje la firma en el area gris
                            </p>
                        </div>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button onClick={handleClose} isDisable={isLoading}>
                    Cancelar
                </Button>
                <Button
                    variant='solid'
                    color='emerald'
                    icon='HeroPencil'
                    isLoading={isLoading}
                    onClick={handleSubmit}>
                    Confirmar firma
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default FirmarGuiaOTV3;
