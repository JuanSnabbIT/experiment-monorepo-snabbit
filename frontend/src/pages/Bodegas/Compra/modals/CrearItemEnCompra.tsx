import Input from '@/components/form/Input';
import Radio, { RadioGroup } from '@/components/form/Radio';
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
import Tooltip from '@/components/ui/Tooltip';
import { ICompra } from '@/interface/bodega.interface';
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
import { useEffect, useState } from 'react';
import { Gallery } from 'react-grid-gallery';
import Camera from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
import { toast } from 'react-toastify';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
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

function CrearItemEnCompra({ compra }: { compra: ICompra }) {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaFabricante, listaCategorias, listaItemsEmpresa } = useAppSelector(
        (state) => state.item,
    );
    const { listaItemsCompra } = useAppSelector((state) => state.bodega);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [itemSelected, setItemSelected] = useState<IItemEmpresa | undefined>(undefined);
    const [categoriaSelected, setCategoriaSelected] = useState<TSelectOption | undefined>(
        undefined,
    );
    const [fabricanteSelected, setFabricanteSelected] = useState<TSelectOption | undefined>(
        undefined,
    );
    const [modoIngreso, setModoIngreso] = useState<'seleccionar' | 'escanear'>('seleccionar');
    const [paused, setPaused] = useState<boolean>(false);
    const [hasCameraPermission, setHasCameraPermission] = useState(false);
    const [permissionChecked, setPermissionChecked] = useState(false);
    const [index, setIndex] = useState(-1);
    const [escaneado, setEscaneado] = useState<boolean>(false);
    const [mostrarCamara, setMostrarCamara] = useState<boolean>(true);

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
            nombre: Yup.string().when(['creando'], ([creando], schema) => {
                return creando ? schema.required('Requerido') : schema.notRequired();
            }),
            descripcion_corta: Yup.string()
                .notRequired()
                .nullable()
                .max(45, 'Máximo 45 caracteres'),
            fabricante: Yup.string().notRequired().nullable(),
            categoria: Yup.string().notRequired().nullable(),
            comentarios: Yup.string().notRequired().nullable(),
            codigo_barras: Yup.string().notRequired().nullable(),
            item: Yup.string().when(['creando'], ([creando], schema) => {
                return !creando && modoIngreso === 'seleccionar'
                    ? schema.required('Requerido')
                    : schema.notRequired();
            }),
            cantidad: Yup.number()
                .required('Requerido')
                .nonNullable('Requerido')
                .min(1, 'Mínimo 1'),
            precio: Yup.number().required('Requerido').nonNullable('Requerido').min(1, 'Mínimo 1'),
        }),
        onSubmit: async (values) => {
            if (isCreating) {
                // Crear nuevo item
                try {
                    const response = await ApiService.fetchData({
                        url: `/api/compras/${compra.id}/items-compras/crear-item-empresa/`,
                        method: 'post',
                        headers: { 'Content-Type': 'application/json' },
                        data: JSON.stringify({
                            imagenes: values.imagenes,
                            cantidad: values.cantidad >= 0 ? values.cantidad : 0,
                            precio: values.precio >= 0 ? values.precio : 0,
                            item_empresa: {
                                nombre: values.nombre,
                                descripcion_corta: values.descripcion_corta,
                                fabricante: values.fabricante || null,
                                categoria: values.categoria || null,
                                comentarios: values.comentarios,
                                codigo_barras: values.codigo_barras,
                                empresa: personalizacionUsuario?.empresa,
                            },
                        }),
                    });
                    if (response.data) {
                        toast.success('Item creado y añadido', {
                            toastId: 'Item creado y añadido',
                            autoClose: 1000,
                        });
                        setIsOpen(false);
                        dispatch(listaItemsCompraThunk({ id_compra: compra.id }));
                    }
                } catch (error: any) {
                    toast.error(error.response.data || 'Error al crear y agregar item', {
                        toastId: 'Error al crear y agregar item',
                    });
                }
            } else {
                // Seleccionar item existente
                try {
                    const response = await ApiService.fetchData({
                        url: `/api/compras/${compra.id}/items-compras/`,
                        method: 'post',
                        headers: { 'Content-Type': 'application/json' },
                        data: JSON.stringify({
                            compra: compra.id,
                            item: values.item,
                            cantidad: values.cantidad,
                            precio: values.precio,
                        }),
                    });
                    if (response.data) {
                        toast.success('Item añadido', { toastId: 'Item añadido', autoClose: 1000 });
                        setIsOpen(false);
                        dispatch(listaItemsCompraThunk({ id_compra: compra.id }));
                    }
                } catch (error: any) {
                    toast.error(error.response.data || 'Error al agregar item a la compra', {
                        toastId: 'Error al agregar item a la compra',
                    });
                }
            }
        },
    });

    useEffect(() => {
        async function checkCameraPermission() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach((track) => track.stop());
                setHasCameraPermission(true);
            } catch (error) {
                console.error('Error al obtener permisos de la cámara:', error);
                setHasCameraPermission(false);
            } finally {
                setPermissionChecked(true);
            }
        }
        if (isOpen) {
            dispatch(listaFabricanteThunk());
            dispatch(listaCategoriasThunk());
            dispatch(listaItemsEmpresaThunk({ id_empresa: personalizacionUsuario?.empresa }));
            dispatch(listaItemsCompraThunk({ id_compra: compra.id }));
            if (modoIngreso === 'escanear') {
                checkCameraPermission();
            }
        } else {
            formik.resetForm();
            setIsCreating(false);
            setItemSelected(undefined);
            setCategoriaSelected(undefined);
            setFabricanteSelected(undefined);
            setModoIngreso('seleccionar');
            setEscaneado(false);
            setMostrarCamara(true);
            setPaused(false);
        }
    }, [isOpen, modoIngreso]);

    return (
        <>
            <Tooltip text='Agregar Item'>
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
                isStaticBackdrop={true}
                isStaticBackdropAnimation={false}>
                <ModalHeader>
                    <Badge className='text-xl'>Agregar Item</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        {/* Radio buttons para elegir modo */}
                        <div>
                            <Badge>Modo de Ingreso</Badge>
                            <RadioGroup isInline>
                                <Radio
                                    name='modoIngreso'
                                    label='Seleccionar'
                                    value='seleccionar'
                                    selectedValue={modoIngreso}
                                    onChange={() => {
                                        setModoIngreso('seleccionar');
                                    }}
                                />
                                <Radio
                                    name='modoIngreso'
                                    label='Escanear'
                                    value='escanear'
                                    selectedValue={modoIngreso}
                                    onChange={() => {
                                        setModoIngreso('escanear');
                                    }}
                                />
                            </RadioGroup>
                        </div>

                        {/* MODO: SELECCIONAR */}
                        {modoIngreso === 'seleccionar' && (
                            <>
                                <div>
                                    <Badge>Item</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.item || formik.touched.nombre}
                                        invalidFeedback={
                                            formik.errors.item || formik.errors.nombre
                                        }>
                                        <SelectReact
                                            name='item'
                                            placeholder='Seleccionar o crear item...'
                                            isCreatable={true}
                                            isClearable={true}
                                            options={listaItemsEmpresa
                                                .filter(
                                                    (item) =>
                                                        !listaItemsCompra.some(
                                                            (ic) => ic.item === item.id,
                                                        ),
                                                )
                                                .map((item) => ({
                                                    value: item.id.toString(),
                                                    label: item.nombre,
                                                }))}
                                            formatCreateLabel={(inputValue) =>
                                                `Crear item "${inputValue}"`
                                            }
                                            value={
                                                isCreating
                                                    ? {
                                                          value: formik.values.nombre,
                                                          label: formik.values.nombre,
                                                      }
                                                    : formik.values.item
                                                      ? {
                                                            value: formik.values.item,
                                                            label:
                                                                listaItemsEmpresa.find(
                                                                    (it) =>
                                                                        it.id.toString() ===
                                                                        formik.values.item,
                                                                )?.nombre || '',
                                                        }
                                                      : null
                                            }
                                            onCreateOption={(inputValue) => {
                                                setIsCreating(true);
                                                setItemSelected(undefined);
                                                formik.setFieldValue('nombre', inputValue);
                                                formik.setFieldValue('item', '');
                                                formik.setFieldValue('creando', true);
                                                setCategoriaSelected(undefined);
                                                setFabricanteSelected(undefined);
                                                formik.setFieldValue('categoria', '');
                                                formik.setFieldValue('fabricante', '');
                                            }}
                                            onChange={(e) => {
                                                if (e) {
                                                    const selectedItem = listaItemsEmpresa.find(
                                                        (it) =>
                                                            it.id.toString() ===
                                                            (e as TSelectOption).value,
                                                    );
                                                    setIsCreating(false);
                                                    formik.setFieldValue(
                                                        'item',
                                                        (e as TSelectOption).value,
                                                    );
                                                    formik.setFieldValue('creando', false);

                                                    if (selectedItem) {
                                                        setItemSelected(selectedItem);

                                                        if (selectedItem.categoria) {
                                                            setCategoriaSelected({
                                                                value: selectedItem.categoria.toString(),
                                                                label:
                                                                    selectedItem.datos_categoria
                                                                        ?.nombre || '',
                                                            });
                                                            formik.setFieldValue(
                                                                'categoria',
                                                                selectedItem.categoria.toString(),
                                                            );
                                                        } else {
                                                            setCategoriaSelected(undefined);
                                                            formik.setFieldValue('categoria', '');
                                                        }

                                                        if (selectedItem.fabricante) {
                                                            setFabricanteSelected({
                                                                value: selectedItem.fabricante.toString(),
                                                                label:
                                                                    selectedItem.datos_fabricante
                                                                        ?.nombre || '',
                                                            });
                                                            formik.setFieldValue(
                                                                'fabricante',
                                                                selectedItem.fabricante.toString(),
                                                            );
                                                        } else {
                                                            setFabricanteSelected(undefined);
                                                            formik.setFieldValue('fabricante', '');
                                                        }
                                                    }
                                                } else {
                                                    setIsCreating(false);
                                                    setItemSelected(undefined);
                                                    formik.setFieldValue('item', '');
                                                    formik.setFieldValue('creando', false);
                                                    setCategoriaSelected(undefined);
                                                    setFabricanteSelected(undefined);
                                                    formik.setFieldValue('categoria', '');
                                                    formik.setFieldValue('fabricante', '');
                                                }
                                            }}
                                            onBlur={formik.handleBlur}
                                        />
                                    </Validation>
                                </div>

                                {isCreating && (
                                    <>
                                        <div>
                                            <Badge>Fabricante</Badge>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.fabricante}
                                                invalidFeedback={formik.errors.fabricante}>
                                                <SelectReact
                                                    name='fabricante'
                                                    placeholder='Seleccione un fabricante'
                                                    isClearable
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
                                                            setFabricanteSelected(
                                                                e as TSelectOption,
                                                            );
                                                        } else {
                                                            formik.setFieldValue('fabricante', '');
                                                            setFabricanteSelected(undefined);
                                                        }
                                                    }}
                                                    onBlur={formik.handleBlur}
                                                    value={fabricanteSelected}
                                                />
                                            </Validation>
                                        </div>

                                        <div>
                                            <Badge>Categoría</Badge>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.categoria}
                                                invalidFeedback={formik.errors.categoria}>
                                                <SelectReact
                                                    name='categoria'
                                                    placeholder='Seleccione una categoría'
                                                    isClearable
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
                                                            setCategoriaSelected(
                                                                e as TSelectOption,
                                                            );
                                                        } else {
                                                            formik.setFieldValue('categoria', '');
                                                            setCategoriaSelected(undefined);
                                                        }
                                                    }}
                                                    onBlur={formik.handleBlur}
                                                    value={categoriaSelected}
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
                                            <Badge>Código de Barras</Badge>
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

                                        {/* Cámara para tomar fotos */}
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

                                        <div>
                                            <Badge>Imágenes</Badge>
                                            {formik.values.imagenes.length > 0 ? (
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
                                                        enableImageSelection={false}
                                                        rowHeight={240}
                                                    />
                                                    <Lightbox
                                                        slides={formik.values.imagenes.map(
                                                            (imagen) => ({ src: imagen }),
                                                        )}
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
                                                                                formik.values.imagenes.filter(
                                                                                    (_, i) =>
                                                                                        i !== index,
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
                                                'Sin Imágenes'
                                            )}
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {/* MODO: ESCANEAR */}
                        {modoIngreso === 'escanear' && (
                            <>
                                {permissionChecked &&
                                    hasCameraPermission &&
                                    !escaneado &&
                                    mostrarCamara && (
                                        <Scanner
                                            onScan={async (detectedCodes: IDetectedBarcode[]) => {
                                                if (detectedCodes.length > 0) {
                                                    for (const code of detectedCodes) {
                                                        if (
                                                            [
                                                                'ean_13',
                                                                'code_128',
                                                                'code_93',
                                                                'code_39',
                                                                'upc_a',
                                                                'upc_e',
                                                            ].includes(code.format)
                                                        ) {
                                                            setPaused(true);
                                                            const response =
                                                                await ApiService.fetchData<
                                                                    IItemEmpresa[]
                                                                >({
                                                                    url: `/api/items-empresa/?codigo_barras=${code.rawValue}`,
                                                                    method: 'get',
                                                                });
                                                            if (response.data) {
                                                                if (response.data.length > 0) {
                                                                    if (
                                                                        listaItemsCompra.some(
                                                                            (item) =>
                                                                                item.item ===
                                                                                response.data[0].id,
                                                                        )
                                                                    ) {
                                                                        toast.error(
                                                                            'Item ya agregado a la compra',
                                                                        );
                                                                    } else {
                                                                        formik.setValues({
                                                                            categoria: response
                                                                                .data[0].categoria
                                                                                ? response.data[0].categoria.toString()
                                                                                : '',
                                                                            fabricante: response
                                                                                .data[0].fabricante
                                                                                ? response.data[0].fabricante.toString()
                                                                                : '',
                                                                            codigo_barras:
                                                                                response.data[0]
                                                                                    .codigo_barras ||
                                                                                '',
                                                                            comentarios:
                                                                                response.data[0]
                                                                                    .comentarios,
                                                                            descripcion_corta:
                                                                                response.data[0]
                                                                                    .descripcion_corta
                                                                                    ? response
                                                                                          .data[0]
                                                                                          .descripcion_corta
                                                                                    : '',
                                                                            nombre: response.data[0]
                                                                                .nombre,
                                                                            creando: false,
                                                                            cantidad: 0,
                                                                            precio: 0,
                                                                            imagenes:
                                                                                response.data[0]
                                                                                    .imagenes
                                                                                    .length > 0
                                                                                    ? response.data[0].imagenes.map(
                                                                                          (
                                                                                              imagen,
                                                                                          ) =>
                                                                                              imagen.imagen,
                                                                                      )
                                                                                    : [],
                                                                            item: response.data[0].id.toString(),
                                                                        });
                                                                        setEscaneado(true);
                                                                    }
                                                                } else {
                                                                    toast.error(
                                                                        `Código ${code.rawValue} no encontrado`,
                                                                    );
                                                                }
                                                            }
                                                            setPaused(false);
                                                        } else {
                                                            toast.error(
                                                                'Formato de código de barras no soportado',
                                                            );
                                                            setPaused(false);
                                                        }
                                                    }
                                                } else {
                                                    setPaused(false);
                                                    toast.error(
                                                        'No se detectaron códigos de barras',
                                                    );
                                                }
                                            }}
                                            onError={(error) => {
                                                console.error('Error en el escáner:', error);
                                                toast.error('Error al acceder a la cámara.');
                                            }}
                                            formats={[
                                                'ean_13',
                                                'code_128',
                                                'code_39',
                                                'upc_a',
                                                'upc_e',
                                            ]}
                                            paused={paused}
                                            allowMultiple={false}
                                            constraints={{
                                                facingMode: 'environment',
                                                width: { ideal: 1280 },
                                                height: { ideal: 720 },
                                            }}
                                            scanDelay={300}
                                            styles={{
                                                container: { width: '100%', aspectRatio: '1 / 1' },
                                                video: {
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                },
                                            }}
                                            components={{ finder: false }}
                                            classNames={{ container: 'relative' }}
                                        />
                                    )}
                                {!mostrarCamara && hasCameraPermission && (
                                    <Button
                                        variant='solid'
                                        onClick={() => {
                                            setMostrarCamara(true);
                                        }}>
                                        Mostrar Escáner
                                    </Button>
                                )}
                                {!hasCameraPermission && permissionChecked && (
                                    <div>No hay permisos de cámara</div>
                                )}
                                {escaneado && (
                                    <Button
                                        variant='solid'
                                        onClick={() => {
                                            setEscaneado(false);
                                            formik.resetForm();
                                            setPaused(false);
                                        }}>
                                        Volver a escanear
                                    </Button>
                                )}
                            </>
                        )}

                        {/* Cantidad y Precio siempre visibles */}
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
                            {isCreating ? 'Crear y Agregar' : 'Agregar'}
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearItemEnCompra;
