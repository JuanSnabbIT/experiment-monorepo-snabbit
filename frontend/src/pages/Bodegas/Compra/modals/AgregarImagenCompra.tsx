import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { detalleCompraThunk, useAppDispatch, useAppSelector } from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Camera from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
import * as Yup from 'yup';
import ApiService from '@/services/ApiService';
import Validation from '@/components/form/Validation';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import Icon from '@/components/icon/Icon';
import { Gallery } from 'react-grid-gallery';
import Textarea from '@/components/form/Textarea';

const OPCIONES_IMAGEN = [
    { value: 'boleta', label: 'Boleta' },
    { value: 'factura', label: 'Factura' },
    { value: 'informacion_adicional', label: 'Información Adicional' },
    { value: 'imagen', label: 'Imagen de Item' },
];

function AgregarImagenCompra() {
    const dispatch = useAppDispatch();
    const { detalleCompra, listaItemsCompra } = useAppSelector((state) => state.bodega);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [hasCameraPermission, setHasCameraPermission] = useState(false);
    const [permissionChecked, setPermissionChecked] = useState(false);
    const [index, setIndex] = useState<number>(-1);

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

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
            setIndex(-1);
            setPermissionChecked(false);
        }
    }, [isOpen]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            opcion: '',
            imagenes: [],
            observaciones: '',
            item: '',
        },
        validationSchema: Yup.object().shape({
            opcion: Yup.string().required('Requerido').nonNullable('Requerido'),
            observaciones: Yup.string().notRequired().nonNullable(),
        }),
        onSubmit: async (values) => {
            try {
                let data = {};
                let url = '';
                if (values.opcion === 'imagen') {
                    // id: id del item, imagenes: base64
                    url = `/api/imagenes-item/bulk-create/`;
                    data = { item: values.item, imagenes: values.imagenes };
                } else {
                    // compra, imagenes: base64, observaciones
                    url = `/api/archivos-compras/subir-imagenes/`;
                    data = {
                        compra: detalleCompra?.id,
                        imagenes: values.imagenes,
                        observaciones: values.observaciones,
                        opcion: values.opcion,
                    };
                }
                const response = await ApiService.fetchData({
                    url: url,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(data),
                });
                if (response.data) {
                    toast.success('Imagen(es) subidas', { autoClose: 1000 });
                    setIsOpen(false);
                    dispatch(detalleCompraThunk({ id_compra: detalleCompra?.id }));
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(' ');
                toast.error(mensajesError || 'Error al subir las imagenes', {
                    toastId: 'Error al subir las imagenes',
                });
            }
        },
    });

    return (
        <>
            <Tooltip text='Agregar Imagen'>
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
                    <Badge className='text-xl'>Agregar Imagen</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Opcion</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.opcion}
                                invalidFeedback={formik.errors.opcion}>
                                <SelectReact
                                    name='opcion'
                                    options={OPCIONES_IMAGEN}
                                    onChange={(e) => {
                                        if (e) {
                                            if ((e as TSelectOption).value != 'imagen') {
                                                formik.setFieldValue('item', '');
                                            }
                                            formik.setFieldValue(
                                                'opcion',
                                                (e as TSelectOption).value,
                                            );
                                        }
                                    }}
                                    onBlur={formik.handleBlur}
                                    value={OPCIONES_IMAGEN.find(
                                        (ar) => ar.value === formik.values.opcion,
                                    )}
                                    noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                    placeholder='Seleccione una opcion'
                                />
                            </Validation>
                        </div>
                        {formik.values.opcion === 'imagen' && (
                            <div>
                                <Badge>Item</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.item}
                                    invalidFeedback={formik.errors.item}>
                                    <SelectReact
                                        name='item'
                                        options={listaItemsCompra.map((item) => ({
                                            value: item.item.toString(),
                                            label: item.nombre_item,
                                        }))}
                                        onChange={(e) => {
                                            if (e) {
                                                formik.setFieldValue(
                                                    'item',
                                                    (e as TSelectOption).value,
                                                );
                                            }
                                        }}
                                        onBlur={formik.handleBlur}
                                        value={{
                                            value: formik.values.item,
                                            label:
                                                listaItemsCompra.find(
                                                    (item) =>
                                                        item.item.toString() === formik.values.item,
                                                )?.nombre_item || '',
                                        }}
                                    />
                                </Validation>
                            </div>
                        )}
                        {hasCameraPermission && permissionChecked && formik.values.opcion != '' && (
                            <>
                                <div>
                                    <Camera
                                        idealFacingMode='environment'
                                        onTakePhoto={(dataUri) => {
                                            formik.setFieldValue('imagenes', [
                                                ...formik.values.imagenes,
                                                dataUri,
                                            ]);
                                        }}
                                    />
                                </div>
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
                            </>
                        )}
                        {!permissionChecked && formik.values.opcion != '' && (
                            <Button
                                variant='solid'
                                onClick={() => {
                                    checkCameraPermission();
                                }}>
                                Abrir Camara
                            </Button>
                        )}
                        {!hasCameraPermission && <div>No hay camara</div>}
                        {formik.values.opcion != 'imagen' && formik.values.opcion != '' && (
                            <div>
                                <Badge>Observaciones</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.observaciones}
                                    invalidFeedback={formik.errors.observaciones}>
                                    <Textarea
                                        name='observaciones'
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.observaciones}
                                    />
                                </Validation>
                            </div>
                        )}
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

export default AgregarImagenCompra;
