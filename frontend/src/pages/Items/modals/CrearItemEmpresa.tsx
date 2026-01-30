import Input from '@/components/form/Input';
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
import { useAppDispatch, useAppSelector } from '@/store';
import {
    listaItemsEmpresaThunk,
    listaProveedoresEmpresaThunk,
    listaFabricanteThunk,
    listaCategoriasThunk,
} from '@/store/slices/item/itemSlice';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Tooltip from '@/components/ui/Tooltip';
import { IDetectedBarcode, Scanner } from '@yudiel/react-qr-scanner';

const validationSchema = Yup.object({
    nombre: Yup.string()
        .max(250, 'El nombre no puede exceder los 250 caracteres')
        .required('El nombre es requerido'),
    descripcion_corta: Yup.string()
        .max(45, 'La descripción corta no puede exceder los 45 caracteres')
        .nullable(),
    fabricante: Yup.number().nullable().notRequired(),
    categoria: Yup.number().nullable().notRequired(),
    comentarios: Yup.string().nullable().notRequired(),
    proveedor: Yup.array().nullable().notRequired(),
    codigo_barras: Yup.string().nullable().notRequired(),
});

function CrearItemEmpresa() {
    const dispatch = useAppDispatch();
    const { listaProveedoresEmpresa, listaFabricante, listaCategorias } = useAppSelector(
        (state) => state.item,
    );
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const [proveedorOptions, setProveedorOptions] = useState<TSelectOption[]>([]);
    const [fabricanteOptions, setFabricanteOptions] = useState<TSelectOption[]>([]);
    const [categoriaOptions, setCategoriaOptions] = useState<TSelectOption[]>([]);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [hasCameraPermission, setHasCameraPermission] = useState(false);
    const [permissionChecked, setPermissionChecked] = useState(false);
    const [escaneado, setEscaneado] = useState<boolean>(false);
    const [paused, setPaused] = useState<boolean>(false);
    const [isOpenCamara, setIsOpenCamara] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen && personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaProveedoresEmpresaThunk({ id_empresa: personalizacionUsuario.empresa }));
            dispatch(listaFabricanteThunk());
            dispatch(listaCategoriasThunk());
        }
    }, [personalizacionUsuario, isOpen]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            descripcion_corta: '',
            fabricante: '',
            categoria: '',
            comentarios: '',
            proveedor: [],
            codigo_barras: '',
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/empresas/${personalizacionUsuario?.empresa}/items-empresa/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        ...values,
                        proveedores_empresa: values.proveedor,
                        empresa: personalizacionUsuario?.empresa,
                        fabricante: values.fabricante
                            ? parseInt(values.fabricante.toString())
                            : null,
                        categoria: values.categoria ? parseInt(values.categoria.toString()) : null,
                    }),
                });
                if (response.status === 201) {
                    toast.success('Item creado correctamente', { autoClose: 1000 });
                    dispatch(
                        listaItemsEmpresaThunk({ id_empresa: personalizacionUsuario?.empresa }),
                    );
                    formik.resetForm();
                    setIsOpen(false);
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data)
                    .flat() // Aplana los arrays en caso de que haya más de uno
                    .join(' '); // Une los mensajes en una sola cadena
                toast.error(mensajesError || 'Error al crear el item', {
                    toastId: 'Error al crear el item',
                });
            }
        },
    });

    useEffect(() => {
        if (listaProveedoresEmpresa.length > 0) {
            setProveedorOptions(
                listaProveedoresEmpresa.map((prov) => ({
                    value: prov.id.toString(),
                    label: prov.nombre,
                })),
            );
        }
    }, [listaProveedoresEmpresa]);

    useEffect(() => {
        if (listaFabricante.length > 0) {
            setFabricanteOptions(
                listaFabricante.map((fab) => ({
                    value: fab.id.toString(),
                    label: fab.nombre,
                })),
            );
        }
    }, [listaFabricante]);

    useEffect(() => {
        if (listaCategorias.length > 0) {
            setCategoriaOptions(
                listaCategorias.map((cat) => ({
                    value: cat.id.toString(),
                    label: cat.nombre,
                })),
            );
        }
    }, [listaCategorias]);

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
                toast.error('No se pudo acceder a la cámara');
            } finally {
                setPermissionChecked(true);
            }
        }
        if (isOpen) {
            checkCameraPermission();
        }
        if (!isOpen) {
            formik.resetForm();
            setIsOpenCamara(false);
        }
    }, [isOpen]);

    const handleCreateFabricante = async (inputValue: string) => {
        try {
            const response = await ApiService.fetchData({
                url: `/api/fabricantes/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ nombre: inputValue }),
            });
            if (response.status === 201) {
                const data = response.data as { id: number; nombre: string };
                const newOption = { value: data.id.toString(), label: data.nombre };
                setFabricanteOptions((prev) => [...prev, newOption]);
                formik.setFieldValue('fabricante', data.id.toString());
            }
        } catch (error: any) {
            const mensajesError = Object.values(error.response.data)
                .flat() // Aplana los arrays en caso de que haya más de uno
                .join(' '); // Une los mensajes en una sola cadena
            toast.error(mensajesError || 'Error al crear el fabricante', {
                toastId: 'Error al crear el fabricante',
            });
        }
    };

    const handleCreateCategoria = async (inputValue: string) => {
        try {
            const response = await ApiService.fetchData({
                url: `/api/categorias/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ nombre: inputValue }),
            });
            if (response.status === 201) {
                const data = response.data as { id: number; nombre: string };
                const newOption = { value: data.id.toString(), label: data.nombre };
                setCategoriaOptions((prev) => [...prev, newOption]);
                formik.setFieldValue('categoria', data.id.toString());
            }
        } catch (error: any) {
            const mensajesError = Object.values(error.response.data)
                .flat() // Aplana los arrays en caso de que haya más de uno
                .join(' '); // Une los mensajes en una sola cadena
            toast.error(mensajesError || 'Error al crear la categoría', {
                toastId: 'Error al crear la categoría',
            });
        }
    };

    return (
        <>
            <Tooltip text='Crear Item'>
                <Button variant='solid' onClick={() => setIsOpen(true)} icon='HeroPlus'></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Añadir Item </Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Nombre</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.nombre}
                                invalidFeedback={formik.errors.nombre}>
                                <Input
                                    id='nombre'
                                    name='nombre'
                                    value={formik.values.nombre}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Descripción Corta</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.descripcion_corta}
                                invalidFeedback={formik.errors.descripcion_corta}>
                                <Input
                                    id='descripcion_corta'
                                    name='descripcion_corta'
                                    value={formik.values.descripcion_corta}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
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
                                    id='fabricante'
                                    name='fabricante'
                                    placeholder='Seleccione un fabricante'
                                    isClearable
                                    isCreatable
                                    formatCreateLabel={(inputValue) =>
                                        `Crear Fabricante "${inputValue}"`
                                    }
                                    onCreateOption={handleCreateFabricante}
                                    value={
                                        formik.values.fabricante
                                            ? {
                                                  value: formik.values.fabricante.toString(),
                                                  label:
                                                      fabricanteOptions.find(
                                                          (fab) =>
                                                              fab.value ===
                                                              formik.values.fabricante?.toString(),
                                                      )?.label || '',
                                              }
                                            : null
                                    }
                                    options={fabricanteOptions}
                                    onChange={(selectedOption) => {
                                        formik.setFieldValue(
                                            'fabricante',
                                            selectedOption
                                                ? (selectedOption as TSelectOption).value
                                                : null,
                                        );
                                    }}
                                    onBlur={formik.handleBlur}
                                    noOptionsMessage={() => 'No hay opciones'}
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
                                    id='categoria'
                                    name='categoria'
                                    placeholder='Seleccione una categoría'
                                    isClearable
                                    isCreatable
                                    formatCreateLabel={(inputValue) =>
                                        `Crear categoría "${inputValue}"`
                                    }
                                    onCreateOption={handleCreateCategoria}
                                    value={
                                        formik.values.categoria
                                            ? {
                                                  value: formik.values.categoria.toString(),
                                                  label:
                                                      categoriaOptions.find(
                                                          (cat) =>
                                                              cat.value ===
                                                              formik.values.categoria?.toString(),
                                                      )?.label || '',
                                              }
                                            : null
                                    }
                                    options={categoriaOptions}
                                    onChange={(selectedOption) => {
                                        formik.setFieldValue(
                                            'categoria',
                                            selectedOption
                                                ? (selectedOption as TSelectOption).value
                                                : null,
                                        );
                                    }}
                                    onBlur={formik.handleBlur}
                                    noOptionsMessage={() => 'No hay opciones'}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Comentarios</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.comentarios}
                                invalidFeedback={formik.errors.comentarios}>
                                <Input
                                    id='comentarios'
                                    name='comentarios'
                                    value={formik.values.comentarios}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Proveedor</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={!!formik.touched.proveedor}
                                invalidFeedback={
                                    Array.isArray(formik.errors.proveedor)
                                        ? formik.errors.proveedor.join(', ')
                                        : formik.errors.proveedor
                                }>
                                <SelectReact
                                    id='proveedor'
                                    name='proveedor'
                                    placeholder='Seleccione un proveedor'
                                    isMulti
                                    options={proveedorOptions}
                                    onChange={(selectedOptions) => {
                                        formik.setFieldValue(
                                            'proveedor',
                                            Array.isArray(selectedOptions)
                                                ? selectedOptions.map((option: any) => option.value)
                                                : [],
                                        );
                                    }}
                                    onBlur={formik.handleBlur}
                                    noOptionsMessage={() => 'No hay opciones'}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Codigo Barras</Badge>
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
                        <div>
                            {permissionChecked &&
                                hasCameraPermission &&
                                !escaneado &&
                                isOpenCamara && (
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
                                                        formik.setFieldValue(
                                                            'codigo_barras',
                                                            code.rawValue,
                                                        );
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
                                                toast.error('No se detectaron códigos de barras');
                                            }
                                        }}
                                        onError={(error) => {
                                            console.error('Error en el escáner:', error);
                                            toast.error('Error al acceder a la cámara.');
                                        }}
                                        constraints={{ facingMode: 'environment' }}
                                        formats={[
                                            'ean_13',
                                            'code_128',
                                            'code_39',
                                            'upc_a',
                                            'upc_e',
                                        ]}
                                        paused={paused}
                                        allowMultiple={false}
                                        scanDelay={300}
                                    />
                                )}
                            {!isOpenCamara && (
                                <Button
                                    variant='solid'
                                    onClick={() => {
                                        setIsOpenCamara(true);
                                    }}>
                                    Mostrar Escaner
                                </Button>
                            )}
                            {!hasCameraPermission && <div>No hay permisos de camara</div>}
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
                            isDisable={formik.isSubmitting}
                            onClick={() => formik.handleSubmit()}>
                            Crear
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearItemEmpresa;
