import Radio, { RadioGroup } from '@/components/form/Radio';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import { useAppDispatch, useAppSelector } from '@/store';
import { listaSolicitudesVacacionesThunk } from '@/store/slices/calendario/calendarioSlice';
import { useFormik } from 'formik';
import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import SignatureCanvas from 'react-signature-canvas';
import Badge from '@/components/ui/Badge';

function AprobarSolicitudVacaciones({ id_solicitud }: { id_solicitud: number }) {
    const dispatch = useAppDispatch();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { userMe } = useAppSelector((state) => state.auth);
    // const sigCanvas = useRef<SignatureCanvas | null>(null)

    // const clear = () => {
    //     if (sigCanvas.current) {
    //         sigCanvas.current.clear();
    //     }
    // };

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            aprobado_rechazado_por: userMe?.pk,
            estado: '2',
        },
        onSubmit: async (values) => {
            try {
                // const form = new FormData()
                // if (values.aprobado_rechazado_por) {
                //     form.append("aprobado_rechazado_por", values.aprobado_rechazado_por.toString())
                // }
                // if (values.estado === "2" && sigCanvas.current) {
                //     form.append("estado", "2")
                //     const byteString = atob(sigCanvas.current.toDataURL('image/png').split(',')[1]);
                //     const arrayBuffer = new ArrayBuffer(byteString.length);
                //     const intArray = new Uint8Array(arrayBuffer);
                //     for (let i = 0; i < byteString.length; i++) {
                //         intArray[i] = byteString.charCodeAt(i);
                //     }
                //     const blob = new Blob([intArray], { type: 'image/png' });
                //     const file = new File([blob], 'firma.png', { type: 'image/png' });
                //     form.append("firma_aprobado_por", file)
                // }
                const response = await ApiService.fetchData({
                    url: `/api/solicitudes-vacaciones/${id_solicitud}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(values),
                });
                if (response.data) {
                    toast.success(
                        values.estado === '2' ? 'Solicitud Aprobada' : 'Solicitud Rechazada',
                        { autoClose: 1000 },
                    );
                    dispatch(listaSolicitudesVacacionesThunk());
                }
            } catch (error: any) {
                toast.error(error.response.data);
            }
        },
    });

    return (
        <>
            <Tooltip text='Aprobar'>
                <Button
                    variant='solid'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                    icon='HeroMinusCircle'
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>¿Estas Seguro(a) de Aprobar o Rechazar la Solicitud?</ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <p>Esta acción no se puede deshacer.</p>
                    </div>
                    <div className='w-full'>
                        <Badge className='text-lg'>¿Aprobar o Rechazar?</Badge>
                        <RadioGroup isInline>
                            <Radio
                                name='estado'
                                value={'2'}
                                label='Aprobado'
                                selectedValue={formik.values.estado}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                            <Radio
                                name='estado'
                                value={'3'}
                                label='Rechazado'
                                selectedValue={formik.values.estado}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </RadioGroup>
                    </div>
                    {/* {formik.values.estado === "2" && (
                        <>
                            <Badge className="text-lg">Firma</Badge>
                            <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                                <SignatureCanvas
                                    ref={(ref) => {sigCanvas.current = ref}}
                                    penColor="black"
                                    canvasProps={{
                                        height: 200,
                                        className: 'sigCanvas',
                                        style: { width: '100%', border: '1px solid #000' },
                                    }}
                                />
                                <Button className="mt-2" variant="solid" onClick={clear}>Limpiar</Button>
                            </div>
                        </>
                    )} */}
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpen(false);
                                formik.resetForm();
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={async () => {
                                formik.handleSubmit();
                            }}>
                            Guardar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default AprobarSolicitudVacaciones;
