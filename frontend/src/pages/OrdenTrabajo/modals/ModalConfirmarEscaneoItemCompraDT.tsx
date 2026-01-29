import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import { IItemEmpresa } from '@/interface/items.interface';
import ApiService from '@/services/ApiService';
import {
    listaCategoriasThunk,
    listaFabricanteThunk,
    listaItemsCompraThunk,
    listaItemsEmpresaThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { IDetectedBarcode, Scanner } from '@yudiel/react-qr-scanner';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Gallery } from 'react-grid-gallery';
import Camera from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
import { toast } from 'react-toastify';
import Lightbox from 'yet-another-react-lightbox';
import * as Yup from 'yup';

interface FormikInterface {
    nombre: string;
    descripcion_corta: string;
    fabricante: string;
    categoria: string;
    comentarios: string;
    codigo_barras: string;
    creando: boolean;
    cantidad: number;
    precio: number;
    imagenes: string[];
    item: string;
}

function ModalConfirmarEscaneoItemCompraDT({
    isOpen,
    setIsOpen,
    setCodigos,
    setPaused,
    item,
    setItemEmpresa,
}: {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    setCodigos: Dispatch<SetStateAction<IDetectedBarcode[]>>;
    setPaused: Dispatch<SetStateAction<boolean>>;
    item: IItemEmpresa | undefined;
    setItemEmpresa: Dispatch<SetStateAction<IItemEmpresa | undefined>>;
}) {
    const dispatch = useAppDispatch();
    // const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo);
    const { detalleCompra, listaItemsCompra } = useAppSelector((state) => state.bodega);
    const { listaItemsEmpresa } = useAppSelector((state) => state.item);
    const { listaCategorias, listaFabricante } = useAppSelector((state) => state.item);
    const [activeComponent, setActiveComponent] = useState<string>('Item de la Empresa');
    const [hasCameraPermission, setHasCameraPermission] = useState(false);
    const [permissionChecked, setPermissionChecked] = useState(false);
    const [abrirCamara, setAbrirCamara] = useState<boolean>(false);
    const [index, setIndex] = useState<number>(-1);

    useEffect(() => {
        if (isOpen && detalleCompra && detalleOrdenTrabajo) {
            dispatch(listaItemsEmpresaThunk({ id_empresa: detalleOrdenTrabajo.empresa }));
            dispatch(listaCategoriasThunk());
            dispatch(listaFabricanteThunk());
        }
    }, [isOpen, detalleCompra, detalleOrdenTrabajo]);

    useEffect(() => {
        if (isOpen && item) {
            if (isOpen && item) {
                formik.setValues({
                    categoria: item.categoria ? item.categoria.toString() : '',
                    fabricante: item.fabricante ? item.fabricante.toString() : '',
                    codigo_barras: item.codigo_barras || '',
                    comentarios: item.comentarios,
                    descripcion_corta: item.descripcion_corta ? item.descripcion_corta : '',
                    nombre: item.nombre,
                    creando: false,
                    cantidad: 0,
                    precio: 0,
                    imagenes:
                        item.imagenes.length > 0
                            ? item.imagenes.map((imagen) => imagen.imagen)
                            : [],
                    item: item.id.toString(),
                });
            }
        }
    }, [isOpen, item]);

    const formik = useFormik<FormikInterface>({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            descripcion_corta: '',
            fabricante: '',
            categoria: '',
            comentarios: '',
            codigo_barras: '',
            creando: false,
            cantidad: 0,
            precio: 0,
            imagenes: [],
            item: '',
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.mixed().when(['creando'], ([creando], schema) => {
                if (creando) {
                    return schema
                        .required('Requerido')
                        .test(
                            'nombre-no-nulo',
                            'El nombre no debe ser nulo ni vacío',
                            (value) => value !== null && value !== '',
                        );
                }
                return schema;
            }),
            descripcion_corta: Yup.string()
                .notRequired()
                .nullable()
                .max(45, 'Máximo 45 caracteres'),
            fabricante: Yup.string().notRequired().nullable(),
            categoria: Yup.string().notRequired().nullable(),
            comentarios: Yup.string().notRequired().nullable(),
            codigo_barras: Yup.string().notRequired().nullable(),
            cantidad: Yup.number()
                .required('Requerido')
                .nonNullable('Requerido')
                .min(1, 'Minimo 1'),
            precio: Yup.number().required('Requerido').nonNullable('Requerido').min(1, 'Minimo 1'),
        }),
        onSubmit: async (values) => {
            if (values.creando) {
                try {
                    const response = await ApiService.fetchData({
                        url: `/api/compras/${detalleCompra?.id}/items-compras/crear-item-empresa/`,
                        method: 'post',
                        headers: { 'Content-Type': 'application/json' },
                        data: JSON.stringify({
                            imagenes: values.imagenes,
                            cantidad: values.cantidad >= 0 ? values.cantidad : 0,
                            precio: values.precio >= 0 ? values.precio : 0,
                            item_empresa: {
                                nombre: values.nombre,
                                descripcion_corta: values.descripcion_corta,
                                fabricante: values.fabricante,
                                categoria: values.categoria,
                                comentarios: values.comentarios,
                                codigo_barras: values.codigo_barras,
                                empresa: detalleOrdenTrabajo?.empresa,
                                proveedores_empresa: [],
                            },
                        }),
                    });
                    if (response.data) {
                        toast.success('Item añadido', { toastId: 'Item añadido', autoClose: 1000 });
                        formik.resetForm();
                        dispatch(listaItemsCompraThunk({ id_compra: detalleCompra?.id }));
                        setIsOpen(false);
                    }
                } catch (error: any) {
                    toast.error(error.response.data || 'Error al agregar items a la compra', {
                        toastId: 'Error al agregar items a la compra',
                    });
                }
            } else {
                try {
                    const response = await ApiService.fetchData({
                        url: `/api/compras/${detalleCompra?.id}/items-compras/`,
                        method: 'post',
                        headers: { 'Content-Type': 'application/json' },
                        data: JSON.stringify({
                            compra: detalleCompra?.id,
                            item: values.item,
                            cantidad: values.cantidad,
                            precio: values.precio,
                        }),
                    });
                    if (response.data) {
                        toast.success('Item añadido', { toastId: 'Item añadido', autoClose: 1000 });
                        formik.resetForm();
                        dispatch(listaItemsCompraThunk({ id_compra: detalleCompra?.id }));
                        setIsOpen(false);
                    }
                } catch (error: any) {
                    toast.error(error.response.data || 'Error al agregar items a la compra', {
                        toastId: 'Error al agregar items a la compra',
                    });
                }
            }
        },
    });

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
        if (abrirCamara) {
            checkCameraPermission();
        }
    }, [abrirCamara]);

    useEffect(() => {
        if (!isOpen) {
            setPaused(false);
            setItemEmpresa(undefined);
            setCodigos([]);
            formik.resetForm();
            setActiveComponent('Item de la Empresa');
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop>
            <ModalHeader>
                <Badge className='text-xl'>Agregar Item</Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    <div className='flex flex-row gap-4 overflow-auto'>
                        <Button
                            {...(activeComponent === 'Item de la Empresa'
                                ? {
                                      size: 'sm',
                                      rounded: 'rounded-full',
                                      className: 'border',
                                      isActive: true,
                                      color: 'blue',
                                      colorIntensity: '500',
                                      variant: 'solid',
                                  }
                                : {
                                      size: 'sm',
                                      color: 'zinc',
                                      rounded: 'rounded-full',
                                      className: 'border',
                                  })}
                            onClick={() => {
                                setActiveComponent('Item de la Empresa');
                                formik.setFieldValue('creando', false);
                            }}>
                            Item de la Empresa
                        </Button>
                        <Button
                            {...(activeComponent === 'Crear'
                                ? {
                                      size: 'sm',
                                      rounded: 'rounded-full',
                                      className: 'border',
                                      isActive: true,
                                      color: 'blue',
                                      colorIntensity: '500',
                                      variant: 'solid',
                                  }
                                : {
                                      size: 'sm',
                                      color: 'zinc',
                                      rounded: 'rounded-full',
                                      className: 'border',
                                  })}
                            onClick={() => {
                                setActiveComponent('Crear');
                                formik.setFieldValue('creando', true);
                            }}
                            isDisable={!!item}>
                            Crear
                        </Button>
                    </div>
                    {activeComponent === 'Item de la Empresa' && listaItemsEmpresa.length > 0 && (
                        <SelectReact
                            name='seleccionItem'
                            options={listaItemsEmpresa
                                .filter(
                                    (item) => !listaItemsCompra.some((it) => it.item === item.id),
                                )
                                .map((item) => ({ value: item.id.toString(), label: item.nombre }))}
                            value={{
                                value: formik.values.item.toString(),
                                label:
                                    listaItemsEmpresa.find(
                                        (item) => item.id.toString() === formik.values.item,
                                    )?.nombre || '',
                            }}
                            isClearable
                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                            onChange={(e) => {
                                if (e) {
                                    formik.setFieldValue('item', (e as TSelectOption).value);
                                } else {
                                    formik.setFieldValue('item', '');
                                }
                            }}
                            onBlur={formik.handleBlur}
                        />
                    )}
                    {activeComponent === 'Crear' && (
                        <>
                            <div>
                                <Badge>Nombre</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.nombre}
                                    invalidFeedback={formik.errors.nombre}>
                                    <Input
                                        name='nombre'
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.nombre}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Badge>Fabricante</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.fabricante}
                                    invalidFeedback={formik.errors.fabricante}>
                                    <SelectReact
                                        name='fabricante'
                                        placeholder='Seleccione un fabricante'
                                        options={listaFabricante.map((fab) => ({
                                            value: fab.id.toString(),
                                            label: fab.nombre,
                                        }))}
                                        onChange={(e) => {
                                            if (e) {
                                                formik.setFieldValue(
                                                    'fabricante',
                                                    (e as TSelectOption).value,
                                                );
                                            } else {
                                                formik.setFieldValue('fabricante', '');
                                            }
                                        }}
                                        onBlur={formik.handleBlur}
                                        value={{
                                            value: formik.values.fabricante,
                                            label:
                                                listaFabricante.find(
                                                    (fab) =>
                                                        fab.id.toString() ===
                                                        formik.values.fabricante,
                                                )?.nombre || '',
                                        }}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Badge>Categoria</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.categoria}
                                    invalidFeedback={formik.errors.categoria}>
                                    <SelectReact
                                        name='categoria'
                                        placeholder='Seleccione una categoria'
                                        options={listaCategorias.map((cat) => ({
                                            value: cat.id.toString(),
                                            label: cat.nombre,
                                        }))}
                                        onChange={(e) => {
                                            if (e) {
                                                formik.setFieldValue(
                                                    'categoria',
                                                    (e as TSelectOption).value,
                                                );
                                            } else {
                                                formik.setFieldValue('categoria', '');
                                            }
                                        }}
                                        onBlur={formik.handleBlur}
                                        value={{
                                            value: formik.values.categoria,
                                            label:
                                                listaCategorias.find(
                                                    (cat) =>
                                                        cat.id.toString() ===
                                                        formik.values.categoria,
                                                )?.nombre || '',
                                        }}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Badge>Descripción Corta</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.descripcion_corta}
                                    invalidFeedback={formik.errors.descripcion_corta}>
                                    <Textarea
                                        name='descripcion_corta'
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.descripcion_corta}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Badge>Comentarios</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.comentarios}
                                    invalidFeedback={formik.errors.comentarios}>
                                    <Textarea
                                        name='comentarios'
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.comentarios}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Badge>Codido de Barras</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.codigo_barras}
                                    invalidFeedback={formik.errors.codigo_barras}>
                                    <Input
                                        name='codigo_barras'
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.codigo_barras}
                                    />
                                </Validation>
                            </div>
                            {permissionChecked && hasCameraPermission && abrirCamara && (
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
                            {!abrirCamara && (
                                <div>
                                    <Button
                                        variant='solid'
                                        onClick={() => {
                                            setAbrirCamara(true);
                                        }}>
                                        Abrir Camara
                                    </Button>
                                </div>
                            )}
                            <div>
                                <Badge>Imagenes</Badge>
                                {formik.values.imagenes.length > 0 ? (
                                    <>
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
                                            rowHeight={240}
                                        />
                                        <Lightbox
                                            slides={formik.values.imagenes.map((imagen) => ({
                                                src: imagen,
                                            }))}
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
                                    </>
                                ) : (
                                    'Sin Imagenes'
                                )}
                            </div>
                        </>
                    )}
                    {activeComponent != 'Items' && (
                        <>
                            <div>
                                <Badge>Cantidad</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.cantidad}
                                    invalidFeedback={formik.errors.cantidad}>
                                    <Input
                                        name='cantidad'
                                        type='number'
                                        value={formik.values.cantidad}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Badge>Precio</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.precio}
                                    invalidFeedback={formik.errors.precio}>
                                    <Input
                                        name='precio'
                                        type='number'
                                        value={formik.values.precio}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                </Validation>
                            </div>
                        </>
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
                    {/* {activeComponent != "Items" ? (
                        <>
                            <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                            <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Agregar</Button>
                        </>
                    ) : (
                        <Button variant="solid" color="red" onClick={() => {setIsOpen(false)}}>Cerrar</Button>
                    )} */}
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default ModalConfirmarEscaneoItemCompraDT;
