import Input from '@/components/form/Input';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import {
    buscarItemEnTomaInventarioThunk,
    listaItemsEnTomaInventarioThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Gallery } from 'react-grid-gallery';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import Camera from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
import Icon from '@/components/icon/Icon';
import * as Yup from 'yup';

function ModalConfirmarEscaneoItem({
    isOpen,
    setIsOpen,
    codigos,
    setCodigos,
    setPaused,
}: {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    paused: boolean;
    setPaused: Dispatch<SetStateAction<boolean>>;
    codigos: IDetectedBarcode[];
    setCodigos: Dispatch<SetStateAction<IDetectedBarcode[]>>;
}) {
    const dispatch = useAppDispatch();
    const { detalleTomaInventario, buscarItemEnTomaInventario } = useAppSelector(
        (state) => state.bodega,
    );
    // const { listaItemsEmpresaFiltro,  } = useAppSelector((state) => state.item)
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const [cerrarObservaciones, setCerrarObservaciones] = useState<boolean>(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);
    const [permissionChecked, setPermissionChecked] = useState<boolean>(false);
    const [index, setIndex] = useState<number>(-1);
    const [abrirCamara, setAbrirCamara] = useState<boolean>(false);

    useEffect(() => {
        if (!isOpen) {
            setCodigos([]);
            setPaused(false);
            formik.resetForm();
        }
    }, [isOpen]);

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
                console.error('Error al obtener permisos de la cámara:', error);
                setHasCameraPermission(false);
                toast.error('No se pudo acceder a la cámara', {
                    toastId: 'No se pudo acceder a la cámara',
                });
            } finally {
                setPermissionChecked(true);
            }
        }
        if (abrirCamara && isOpen) {
            checkCameraPermission();
        }
    }, [isOpen, abrirCamara]);

    useEffect(() => {
        if (isOpen && codigos.length > 0) {
            const params = new URLSearchParams();
            params.set('codigo', codigos[0].rawValue);
            params.set('toma_id', detalleTomaInventario?.id.toString() || '');
            dispatch(buscarItemEnTomaInventarioThunk({ filtro: params }));
        }
    }, [isOpen, codigos]);

    useEffect(() => {
        if (cerrarObservaciones && buscarItemEnTomaInventario.length > 0) {
            formik.setValues({
                cantidad_encontrada: buscarItemEnTomaInventario[0].cantidad_original,
                observaciones: '',
                imagenes: [],
            });
        }
    }, [cerrarObservaciones, buscarItemEnTomaInventario]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            cantidad_encontrada: 0,
            observaciones: '',
            imagenes: [],
        },
        validationSchema: Yup.object().shape({
            cantidad_encontrada: Yup.number()
                .required('Requerido')
                .nonNullable('Requerido')
                .min(-1, 'Minimo 0'),
            observaciones: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/items-en-toma-inventario/${buscarItemEnTomaInventario[0].id}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        cantidad_encontrada: values.cantidad_encontrada,
                        estado: 'inventariado_observaciones',
                        observaciones: values.observaciones,
                    }),
                });
                if (response.data) {
                    if (values.imagenes.length > 0) {
                        const responseImagenes = await ApiService.fetchData({
                            url: `/api/items-en-toma-inventario/${buscarItemEnTomaInventario[0].id}/imagenes/`,
                            method: 'post',
                            headers: { 'Content-Type': 'application/json' },
                            data: JSON.stringify({
                                imagenes: values.imagenes,
                            }),
                        });
                        if (responseImagenes.data) {
                            toast.success('Item inventariado', { autoClose: 1000 });
                            setIsOpen(false);
                            dispatch(
                                listaItemsEnTomaInventarioThunk({
                                    id_toma: detalleTomaInventario?.id,
                                }),
                            );
                        }
                    } else {
                        toast.success('Item inventariado', { autoClose: 1000 });
                        setIsOpen(false);
                        dispatch(
                            listaItemsEnTomaInventarioThunk({ id_toma: detalleTomaInventario?.id }),
                        );
                    }
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(' ');
                toast.error(
                    mensajesError || 'Error al cerrar el inventario del item con observaciones',
                    { toastId: 'Error al cerrar el inventario del item con observaciones' },
                );
            }
        },
    });

    return (
        <>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>
                        Confimar Inventario de{' '}
                        {codigos.length > 0 ? codigos[0].rawValue : 'Sin Codigo'}
                    </Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        {buscarItemEnTomaInventario.length > 0 ? (
                            <>
                                {buscarItemEnTomaInventario[0].estado === 'por_inventariar' && (
                                    <div className='grid grid-cols-2 gap-4'>
                                        <div>
                                            <Badge>Nombre</Badge>
                                            <div className='ml-4'>
                                                {buscarItemEnTomaInventario[0].nombre_item}
                                            </div>
                                        </div>
                                        <div>
                                            <Badge>Cantidad Original</Badge>
                                            <div className='ml-4'>
                                                {buscarItemEnTomaInventario[0].cantidad_original}
                                            </div>
                                        </div>
                                        {cerrarObservaciones ? (
                                            <>
                                                <div>
                                                    <Badge>Cantidad Encontrada</Badge>
                                                    <Validation
                                                        isValid={formik.isValid}
                                                        isTouched={
                                                            formik.touched.cantidad_encontrada
                                                        }
                                                        invalidFeedback={
                                                            formik.errors.cantidad_encontrada
                                                        }>
                                                        <Input
                                                            name='cantidad_encontrada'
                                                            onChange={formik.handleChange}
                                                            onBlur={formik.handleChange}
                                                            type='number'
                                                            value={
                                                                formik.values.cantidad_encontrada
                                                            }
                                                        />
                                                    </Validation>
                                                </div>
                                                <div className='col-span-full'>
                                                    <Badge>Observaciones</Badge>
                                                    <Validation
                                                        isValid={formik.isValid}
                                                        isTouched={formik.touched.observaciones}
                                                        invalidFeedback={
                                                            formik.errors.observaciones
                                                        }>
                                                        <Textarea
                                                            name='observaciones'
                                                            onChange={formik.handleChange}
                                                            onBlur={formik.handleBlur}
                                                            value={formik.values.observaciones}
                                                        />
                                                    </Validation>
                                                </div>
                                                <div className='col-span-full'>
                                                    {abrirCamara ? (
                                                        <>
                                                            {permissionChecked &&
                                                                hasCameraPermission && (
                                                                    <Camera
                                                                        idealFacingMode='environment'
                                                                        onTakePhoto={(dataUri) => {
                                                                            formik.setFieldValue(
                                                                                'imagenes',
                                                                                [
                                                                                    ...formik.values
                                                                                        .imagenes,
                                                                                    dataUri,
                                                                                ],
                                                                            );
                                                                        }}
                                                                        onCameraError={() => {
                                                                            setHasCameraPermission(
                                                                                false,
                                                                            );
                                                                            setPermissionChecked(
                                                                                true,
                                                                            );
                                                                        }}
                                                                    />
                                                                )}
                                                            <div className='col-span-full'>
                                                                <Badge>Imagenes</Badge>
                                                                {formik.values.imagenes.length >
                                                                0 ? (
                                                                    <>
                                                                        <Gallery
                                                                            images={formik.values.imagenes.map(
                                                                                (imagen) => ({
                                                                                    src: imagen,
                                                                                    height: 240,
                                                                                    width: 320,
                                                                                }),
                                                                            )}
                                                                            onClick={(index) => {
                                                                                setIndex(index);
                                                                            }}
                                                                            enableImageSelection={
                                                                                false
                                                                            }
                                                                            rowHeight={240}
                                                                        />
                                                                        <Lightbox
                                                                            slides={formik.values.imagenes.map(
                                                                                (imagen) => ({
                                                                                    src: imagen,
                                                                                }),
                                                                            )}
                                                                            open={index >= 0}
                                                                            index={index}
                                                                            close={() =>
                                                                                setIndex(-1)
                                                                            }
                                                                            toolbar={{
                                                                                buttons: [
                                                                                    <div
                                                                                        className='flex items-center text-zinc-50 transition-colors delay-75 hover:text-red-600'
                                                                                        key={
                                                                                            'BotonEliminar'
                                                                                        }>
                                                                                        <Icon
                                                                                            icon='HeroTrash'
                                                                                            size='text-3xl'
                                                                                            onClick={() => {
                                                                                                formik.setFieldValue(
                                                                                                    'imagenes',
                                                                                                    formik.values.imagenes.splice(
                                                                                                        index +
                                                                                                            1,
                                                                                                        1,
                                                                                                    ),
                                                                                                );
                                                                                                setIndex(
                                                                                                    -1,
                                                                                                );
                                                                                            }}
                                                                                        />
                                                                                    </div>,
                                                                                    'close',
                                                                                ],
                                                                            }}
                                                                        />
                                                                    </>
                                                                ) : (
                                                                    'Sin Imagenes'
                                                                )}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant='solid'
                                                                onClick={() => {
                                                                    setAbrirCamara(true);
                                                                }}>
                                                                Abrir Camara
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className='col-span-full flex flex-row gap-4'>
                                                <Button
                                                    variant='solid'
                                                    color='red'
                                                    onClick={() => {
                                                        setCerrarObservaciones(true);
                                                    }}>
                                                    Añadir Observaciones
                                                </Button>
                                                <Button
                                                    variant='solid'
                                                    color='emerald'
                                                    onClick={async () => {
                                                        try {
                                                            const response =
                                                                await ApiService.fetchData({
                                                                    url: `/api/items-en-toma-inventario/${buscarItemEnTomaInventario[0].id}/`,
                                                                    method: 'patch',
                                                                    headers: {
                                                                        'Content-Type':
                                                                            'application/json',
                                                                    },
                                                                    data: JSON.stringify({
                                                                        cantidad_encontrada:
                                                                            buscarItemEnTomaInventario[0]
                                                                                .cantidad_original,
                                                                        estado: 'inventariado',
                                                                    }),
                                                                });
                                                            if (response.data) {
                                                                toast.success('Item inventariado', {
                                                                    autoClose: 1000,
                                                                });
                                                                setIsOpen(false);
                                                                dispatch(
                                                                    listaItemsEnTomaInventarioThunk(
                                                                        {
                                                                            id_toma:
                                                                                detalleTomaInventario?.id,
                                                                        },
                                                                    ),
                                                                );
                                                            }
                                                        } catch (error: any) {
                                                            const mensajesError = Object.values(
                                                                error.response.data,
                                                            )
                                                                .flat()
                                                                .join(' ');
                                                            toast.error(
                                                                mensajesError ||
                                                                    'Error al cerrar el inventario del item',
                                                                {
                                                                    toastId:
                                                                        'Error al cerrar el inventario del item',
                                                                },
                                                            );
                                                        }
                                                    }}>
                                                    Confirmar Inventario
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {(buscarItemEnTomaInventario[0].estado === 'inventariado' ||
                                    buscarItemEnTomaInventario[0].estado ===
                                        'inventariado_observaciones') && (
                                    <div className='grid grid-cols-2 gap-4'>
                                        <div className='col-span-full'>
                                            <Badge className='text-xl'>Item Ya Inventariado</Badge>
                                        </div>
                                        <div>
                                            <Badge>Nombre</Badge>
                                            <div className='ml-4'>
                                                {buscarItemEnTomaInventario[0].nombre_item}
                                            </div>
                                        </div>
                                        <div>
                                            <Badge>Cantidad Original</Badge>
                                            <div className='ml-4'>
                                                {buscarItemEnTomaInventario[0].cantidad_original}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div>Item no encontrado</div>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        {cerrarObservaciones ? (
                            <Button
                                variant='solid'
                                onClick={() => {
                                    formik.handleSubmit();
                                }}>
                                Cerrar Inventario con Observaciones
                            </Button>
                        ) : (
                            <Button
                                color='red'
                                onClick={() => {
                                    setIsOpen(false);
                                }}>
                                Cancelar
                            </Button>
                        )}
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default ModalConfirmarEscaneoItem;
