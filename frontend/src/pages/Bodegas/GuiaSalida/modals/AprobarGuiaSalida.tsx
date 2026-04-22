import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import {
    listaUsuariosTodaLaEmpresaThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import {
    useAprobarGuiaMutation,
    useGetDetalleGuiaSalidaQuery,
} from '@/store/slices/bodega/guiaSalidaApi';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-toastify';

function AprobarGuiaSalida({
    id_guia,
    isOpen,
    setIsOpen,
    onSuccess,
}: {
    id_guia: number | undefined;
    bodegaSelected?: string | undefined;
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    onSuccess?: () => void;
}) {
    const dispatch = useAppDispatch();
    const [aprobarGuia] = useAprobarGuiaMutation();
    const { data: detalleGuiaSalidaBodega } = useGetDetalleGuiaSalidaQuery(id_guia!, {
        skip: !id_guia || !isOpen,
    });
    const { listaUsuariosTodaLaEmpresa } = useAppSelector((state) => state.empresa);
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const sigCanvas = useRef<SignatureCanvas | null>(null);

    const [recibido, setRecibido] = useState<{ value: string; label: string } | undefined>();
    // const [optUsuarios, setOptUsuarios] = useState<{value: string, label: string}[]>([])

    const clear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    useEffect(() => {
        if (isOpen && personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(
                listaUsuariosTodaLaEmpresaThunk({ id_empresa: personalizacionUsuario.empresa }),
            );
        }
    }, [isOpen, personalizacionUsuario]);

    return (
        <>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Aprobar Guia</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        {detalleGuiaSalidaBodega && !detalleGuiaSalidaBodega.recibido_por && (
                            <div>
                                <Badge>Responsable</Badge>
                                <SelectReact
                                    name='recibido_por'
                                    placeholder='Seleccione un usuario'
                                    options={listaUsuariosTodaLaEmpresa.map((user) => ({
                                        value: user.id.toString(),
                                        label: user.nombre_usuario,
                                    }))}
                                    onChange={(e) => {
                                        if (e) {
                                            setRecibido(e as TSelectOption);
                                        }
                                    }}
                                    value={recibido}
                                />
                            </div>
                        )}
                        <div>
                            <Badge>Firma</Badge>
                            <div
                                className='signature-surface'
                                style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                                <SignatureCanvas
                                    ref={(ref) => {
                                        sigCanvas.current = ref;
                                    }}
                                    penColor='black'
                                    canvasProps={{
                                        height: 200,
                                        className: 'signature-canvas',
                                    }}
                                />
                            </div>
                            <Button className='mt-2' variant='solid' color='zinc' onClick={clear}>
                                Limpiar
                            </Button>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='zinc'
                            onClick={() => {
                                setIsOpen(false);
                                clear();
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            color='emerald'
                            onClick={async () => {
                                if (!id_guia) return;
                                try {
                                    const body: any = {
                                        firma_recibido_por:
                                            sigCanvas.current?.toDataURL('image/png'),
                                    };
                                    if (recibido) {
                                        body.recibido_por = recibido.value;
                                    }
                                    await aprobarGuia({ id: id_guia, ...body }).unwrap();
                                    toast.success('Guia aprobada', { autoClose: 1000 });
                                    clear();
                                    setIsOpen(false);
                                    // RTK Query cache invalidates automatically
                                    onSuccess && onSuccess();
                                } catch (error: any) {
                                    const msg =
                                        error?.data?.detail ||
                                        error?.data ||
                                        'Error al aprobar guía';
                                    toast.error(msg);
                                }
                            }}>
                            Aprobar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default AprobarGuiaSalida;
