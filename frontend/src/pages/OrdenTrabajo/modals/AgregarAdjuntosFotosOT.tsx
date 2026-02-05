import Textarea from '@/components/form/Textarea';
import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { useCreateAdjuntosBulkMutation } from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { Gallery } from 'react-grid-gallery';
import Camera from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
import { toast } from 'react-toastify';
import Lightbox from 'yet-another-react-lightbox';
import { useParams } from 'react-router-dom';
import { getErrorMessage } from '@/utils/errorHandlers';

function AgregarAdjuntosFotosOT() {
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    const [createAdjuntosBulk] = useCreateAdjuntosBulkMutation();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [hasCameraPermission, setHasCameraPermission] = useState(false);
    const [permissionChecked, setPermissionChecked] = useState(false);
    const [index, setIndex] = useState<number>(-1);

    useEffect(() => {
        async function checkCameraPermission() {
            try {
                // Intentamos solicitar acceso a la cámara
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                // Si se concede, detenemos las pistas (para evitar que la cámara quede encendida)
                stream.getTracks().forEach((track) => track.stop());
                setHasCameraPermission(true);
            } catch (error) {
                // Si ocurre algún error (por ejemplo, si se niega el acceso), actualizamos el estado
                setHasCameraPermission(false);
                toast.error('No se pudo acceder a la cámara');
            } finally {
                setPermissionChecked(true);
            }
        }
        if (isOpen) {
            checkCameraPermission();
        } else {
            formik.resetForm();
        }
    }, [isOpen]);

    const formik = useFormik<{ imagenes: string[]; descripcion: string }>({
        enableReinitialize: true,
        initialValues: {
            imagenes: [],
            descripcion: '',
        },
        onSubmit: async (values) => {
            try {
                if (!ordenId) return;
                await createAdjuntosBulk({
                    ordenId,
                    data: {
                        imagenes: values.imagenes,
                        descripcion: values.descripcion,
                    },
                }).unwrap();
                toast.success('Fotos agregadas', { autoClose: 1000 });
                setIsOpen(false);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error) || 'Error al agregar la imagen', {
                    toastId: 'Error al agregar la imagen',
                });
            }
        },
    });

    return (
        <>
            <Tooltip text='Agregar Fotos'>
                <Button
                    variant='solid'
                    icon='HeroPlus'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                isStaticBackdrop
                isStaticBackdropAnimation={false}>
                <ModalHeader>
                    <Badge className='text-xl'>Agregar Fotos</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        {permissionChecked && hasCameraPermission && (
                            <Camera
                                idealFacingMode='environment'
                                onTakePhoto={(dataUri) => {
                                    formik.setFieldValue('imagenes', [
                                        ...formik.values.imagenes,
                                        dataUri,
                                    ]);
                                }}
                                onCameraError={() => {
                                    setHasCameraPermission(false);
                                    setPermissionChecked(true);
                                }}
                            />
                        )}
                        {formik.values.imagenes.length > 0 && (
                            <div>
                                <Gallery
                                    images={formik.values.imagenes.map((imagen) => ({
                                        src: imagen,
                                        height: 240,
                                        width: 320,
                                    }))}
                                    onClick={(index) => {
                                        setIndex(index);
                                    }}
                                    enableImageSelection={false}
                                />
                                <Lightbox
                                    slides={formik.values.imagenes.map((img) => ({ src: img }))}
                                    open={index >= 0}
                                    index={index}
                                    close={() => setIndex(-1)}
                                    toolbar={{
                                        buttons: [
                                            <div
                                                className='flex items-center text-zinc-50 transition-colors delay-75 hover:text-red-600'
                                                key={'BotonEliminar'}>
                                                <Icon
                                                    icon='HeroTrash'
                                                    size='text-3xl'
                                                    onClick={() => {
                                                        formik.setFieldValue(
                                                            'imagenes',
                                                            formik.values.imagenes.splice(
                                                                index + 1,
                                                                1,
                                                            ),
                                                        );
                                                        setIndex(-1);
                                                    }}
                                                />
                                            </div>,
                                            'close',
                                        ],
                                    }}
                                />
                            </div>
                        )}
                        <div>
                            <Badge>Descripción</Badge>
                            <Textarea
                                name='descripcion'
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.descripcion}
                            />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpen(false);
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={() => {
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

export default AgregarAdjuntosFotosOT;
