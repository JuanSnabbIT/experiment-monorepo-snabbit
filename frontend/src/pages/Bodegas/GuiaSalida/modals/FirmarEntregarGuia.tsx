import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import { useAppDispatch, useAppSelector } from '@/store';
import { useUpdateGuiaSalidaMutation } from '@/store/slices/bodega/guiaSalidaApi';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function FirmarEntregarGuia({
    id_guia,
    isOpen,
    setIsOpen,
}: {
    id_guia: number | undefined;
    bodegaSelected?: string | undefined;
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    onSuccess?: () => void;
}) {
    const dispatch = useAppDispatch();
    const [updateGuia] = useUpdateGuiaSalidaMutation();
    const sigCanvas = useRef<SignatureCanvas | null>(null);
    const { listaUsuariosDeMisClientes } = useAppSelector((state) => state.empresa);

    const clear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            entregado_a: '',
        },
        validationSchema: Yup.object().shape({
            entregado_a: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            if (sigCanvas.current?.isEmpty()) {
                toast.error('Por favor firme la entrega', {
                    toastId: 'Por favor firme la entrega',
                });
            } else {
                try {
                    if (!id_guia) return;
                    await updateGuia({
                        id: id_guia,
                        entregado_a: values.entregado_a,
                        firma_entrega: sigCanvas.current?.toDataURL('image/png'),
                        estado: 'E',
                    }).unwrap();
                    toast.success('Firma guardada', { autoClose: 1000 });
                    clear();
                    setIsOpen(false);
                } catch (error: any) {
                    toast.error(error.data || 'Error al guardar la firma', {
                        toastId: 'Error al guardar la firma',
                    });
                }
            }
        },
    });

    return (
        <>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Firmar para Entregar</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='w-full'>
                        <Badge>Entregado A</Badge>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.entregado_a}
                            invalidFeedback={formik.errors.entregado_a}>
                            <SelectReact
                                name='entregado_a'
                                onBlur={formik.handleBlur}
                                options={listaUsuariosDeMisClientes.map((user) => ({
                                    value: user.id.toString(),
                                    label: user.nombre_usuario,
                                }))}
                                value={{
                                    value: formik.values.entregado_a,
                                    label:
                                        listaUsuariosDeMisClientes.find(
                                            (user) =>
                                                user.id.toString() === formik.values.entregado_a,
                                        )?.nombre_usuario || '',
                                }}
                                onChange={(e) => {
                                    formik.setFieldValue('entregado_a', (e as TSelectOption).value);
                                }}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Badge>Firma</Badge>
                        <div
                            onBlur={formik.handleBlur}
                            className='dark:bg-white'
                            style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                            <SignatureCanvas
                                ref={(ref) => {
                                    sigCanvas.current = ref;
                                }}
                                penColor='black'
                                canvasProps={{
                                    height: 200,
                                    className: 'sigCanvas',
                                    style: { width: '100%', border: '1px solid #000' },
                                }}
                            />
                        </div>
                        <Button className='mt-2' variant='solid' color='zinc' onClick={clear}>
                            Limpiar
                        </Button>
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
                                formik.handleSubmit();
                            }}>
                            Aceptar Entrega
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default FirmarEntregarGuia;
