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
import ApiService from '@/services/ApiService';
import { listaUsuariosTodoElClienteThunk, useAppDispatch, useAppSelector } from '@/store';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface Props {
    guiaId: number | undefined;
    clienteId: number | null | undefined;
    estadoDestino: 'E' | 'PR';
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    onSuccess?: () => void;
}

function FirmarEntregarGuiaTrabajo({
    guiaId,
    clienteId,
    estadoDestino,
    isOpen,
    setIsOpen,
    onSuccess,
}: Props) {
    const dispatch = useAppDispatch();
    const sigCanvas = useRef<SignatureCanvas | null>(null);
    const { listaUsuariosTodoElCliente } = useAppSelector((state) => state.empresa);

    const clear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    useEffect(() => {
        if (isOpen && clienteId) {
            dispatch(listaUsuariosTodoElClienteThunk({ id_empresa: clienteId }));
        }
    }, [isOpen, clienteId]);

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
            clear();
        }
    }, [isOpen]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            entregado_a: '',
        },
        validationSchema: Yup.object().shape({
            entregado_a: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            if (!guiaId) {
                toast.error('No se encontro la guia asociada.');
                return;
            }
            if (sigCanvas.current?.isEmpty()) {
                toast.error('Por favor firme la entrega', { toastId: 'firma-entrega' });
                return;
            }
            try {
                const response = await ApiService.fetchData({
                    url: `/api/guia-salida/${guiaId}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        ...values,
                        firma_entrega: sigCanvas.current?.toDataURL('image/png'),
                        estado: estadoDestino,
                    }),
                });
                if (response.data) {
                    toast.success('Entrega registrada', { autoClose: 1000 });
                    clear();
                    setIsOpen(false);
                    onSuccess && onSuccess();
                }
            } catch (error: any) {
                toast.error(
                    error.response?.data?.detail ||
                        error.response?.data ||
                        'Error al guardar la firma',
                    { toastId: 'error-firma-entrega' },
                );
            }
        },
    });

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
            <ModalHeader>
                <Badge className='text-xl'>Firmar y Entregar Guia</Badge>
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
                            options={listaUsuariosTodoElCliente.map((user) => ({
                                value: user.id.toString(),
                                label: user.nombre_usuario,
                            }))}
                            value={{
                                value: formik.values.entregado_a,
                                label:
                                    listaUsuariosTodoElCliente.find(
                                        (user) => user.id.toString() === formik.values.entregado_a,
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
                    <Button className='mt-2' variant='solid' onClick={clear}>
                        Limpiar
                    </Button>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild></ModalFooterChild>
                <ModalFooterChild>
                    <Button
                        color='red'
                        onClick={() => {
                            setIsOpen(false);
                            clear();
                        }}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        onClick={() => {
                            formik.handleSubmit();
                        }}>
                        Confirmar
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default FirmarEntregarGuiaTrabajo;
