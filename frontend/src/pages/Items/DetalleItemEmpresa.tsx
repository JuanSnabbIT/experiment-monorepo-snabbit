import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { IMovimientoStock } from '@/interface/bodega.interface';
import ApiService from '@/services/ApiService';
import { useAppDispatch, useAppSelector } from '@/store';
import {
    detalleItemEmpresaThunk,
    listaCategoriasThunk,
    listaFabricanteThunk,
    listaOrdenesCompraRecientesItemThunk,
} from '@/store/slices/item/itemSlice';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Swiper, SwiperSlide } from 'swiper/react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import * as Yup from 'yup';
import GraficoMovimientosStockEnItem from './components/GraficoMovimientosStockEnItem';
import TablaMovimientosStockEnItem from './components/TablaMovimientosStockEnItem';
import TablaOCEnItem from './components/TablaOCEnItem';
import TablaProveedoresEnItem from './components/TablaProveedoresEnItem';
import CrearImagenEnDetalleItem from './modals/CrearImagenEnDetalleItem';

const validationSchema = Yup.object({
    nombre: Yup.string().required('El nombre es requerido'),
    descripcion_corta: Yup.string().notRequired().nullable().max(45, 'Maximo 45 caracteres'),
    fabricante: Yup.string().notRequired().nullable(),
    categoria: Yup.string().notRequired().nullable(),
    codigo_barras: Yup.string().notRequired().nullable(),
});

function DetalleItemEmpresa() {
    const dispatch = useAppDispatch();
    const { id } = useParams();
    const { detalleItemEmpresa, listaFabricante, listaCategorias } = useAppSelector(
        (state) => state.item,
    );
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [fabricanteOptions, setFabricanteOptions] = useState<{ value: string; label: string }[]>(
        [],
    );
    const [categoriaOptions, setCategoriaOptions] = useState<{ value: string; label: string }[]>(
        [],
    );
    const [activeComponent, setActiveComponent] = useState<string>('Proveedores');
    const [activeComponent2, setActiveComponent2] = useState<string>('Imagenes');
    const [index, setIndex] = useState<number>(-1);
    const [movSeleccionado, setMovSeleccionado] = useState<IMovimientoStock | undefined>();

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa && id) {
            dispatch(
                detalleItemEmpresaThunk({
                    id_empresa: personalizacionUsuario.empresa,
                    id_item: id,
                }),
            );
            dispatch(listaFabricanteThunk());
            dispatch(listaCategoriasThunk());
            dispatch(listaOrdenesCompraRecientesItemThunk({ dias: 30, id_item: id }));
        }
    }, [id, personalizacionUsuario?.empresa]);

    useEffect(() => {
        if (detalleItemEmpresa) {
            formik.setValues({
                nombre: detalleItemEmpresa.nombre || '',
                descripcion_corta: detalleItemEmpresa.descripcion_corta || '',
                fabricante: detalleItemEmpresa.datos_fabricante?.id.toString() || '',
                categoria: detalleItemEmpresa.datos_categoria?.id.toString() || '',
                proveedores_empresa: detalleItemEmpresa.datos_proveedores
                    ? detalleItemEmpresa.datos_proveedores.map((prov) => prov.id.toString())
                    : [],
                codigo_barras: detalleItemEmpresa.codigo_barras || '',
            });
        }
    }, [detalleItemEmpresa]);

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

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            descripcion_corta: '',
            fabricante: '',
            categoria: '',
            proveedores_empresa: detalleItemEmpresa?.datos_proveedores
                ? detalleItemEmpresa.datos_proveedores.map((prov) => prov.id.toString())
                : [],
            codigo_barras: '',
        },
        validationSchema,
        onSubmit: async (values) => {
            const datosTransformados = {
                ...values,
                proveedores_empresa: values.proveedores_empresa.map((provId: string) =>
                    parseInt(provId, 10),
                ),
            };
            try {
                const response = await ApiService.fetchData({
                    url: `/api/empresas/${personalizacionUsuario?.empresa}/items-empresa/${detalleItemEmpresa?.id}/`,
                    method: 'patch',
                    data: datosTransformados,
                });

                if (response.status === 201) {
                    toast.success('Item creado correctamente', { autoClose: 1000 });
                } else {
                    toast.success('Datos guardados correctamente.', { autoClose: 1000 });
                }

                setIsEditing(false);
                if (personalizacionUsuario?.empresa) {
                    dispatch(
                        detalleItemEmpresaThunk({
                            id_empresa: personalizacionUsuario.empresa,
                            id_item: id,
                        }),
                    );
                }
            } catch (error) {
                console.error('Error:', error);
                toast.error('Hubo un error al guardar los datos. Por favor, inténtelo de nuevo.');
            }
        },
    });

    const formikFabricante = useFormik({
        enableReinitialize: true,
        initialValues: {
            email_soporte: '',
            pagina_web: '',
            telefono_soporte: '',
        },
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/fabricantes/${detalleItemEmpresa?.fabricante}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ ...values }),
                });
                if (response.data) {
                    toast.success('Fabricante editado', { autoClose: 1000 });
                    formikFabricante.resetForm();
                }
            } catch (error: any) {
                toast.error(error.response.data || 'Error al cambiar datos del fabricante', {
                    toastId: 'Error al cambiar datos del fabricante',
                });
            }
        },
    });

    useEffect(() => {
        if (
            isEditing &&
            detalleItemEmpresa &&
            detalleItemEmpresa.fabricante &&
            detalleItemEmpresa.datos_fabricante
        ) {
            formikFabricante.setValues({
                email_soporte: detalleItemEmpresa.datos_fabricante.email_soporte || '',
                pagina_web: detalleItemEmpresa.datos_fabricante.pagina_web || '',
                telefono_soporte: detalleItemEmpresa.datos_fabricante.telefono_soporte || '',
            });
        }
    }, [isEditing, detalleItemEmpresa]);

    const handleCreateFabricante = async (inputValue: string) => {
        try {
            const response = await ApiService.fetchData({
                url: `/api/fabricantes/`,
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ nombre: inputValue }),
            });
            if (response.status === 201) {
                const data = response.data as { id: number; nombre: string };
                const newOption = { value: data.id.toString(), label: data.nombre };
                setFabricanteOptions((prev) => [...prev, newOption]);
                formik.setFieldValue('fabricante', data.id.toString());
            }
        } catch (error) {
            toast.error('Error al crear el fabricante');
        }
    };

    const handleCreateCategoria = async (inputValue: string) => {
        try {
            const response = await ApiService.fetchData({
                url: `/api/categorias/`,
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ nombre: inputValue }),
            });
            if (response.status === 201) {
                const data = response.data as { id: number; nombre: string };
                const newOption = { value: data.id.toString(), label: data.nombre };
                setCategoriaOptions((prev) => [...prev, newOption]);
                formik.setFieldValue('categoria', data.id.toString());
            }
        } catch (error) {
            toast.error('Error al crear la categoría');
        }
    };

    return (
        <PageWrapper isProtectedRoute={true} name='Detalle Item' title='Detalle Item'>
            <Subheader>
                <SubheaderLeft />
                <SubheaderRight>
                    {isEditing ? (
                        <>
                            <Button
                                variant='solid'
                                onClick={() => {
                                    if (formik.dirty) {
                                        formik.handleSubmit();
                                    }
                                    if (formikFabricante.dirty) {
                                        formikFabricante.handleSubmit();
                                    }
                                }}>
                                Guardar
                            </Button>
                            <Button
                                variant='solid'
                                onClick={() => {
                                    setIsEditing(false);
                                    formik.setValues({
                                        nombre: detalleItemEmpresa?.nombre || '',
                                        descripcion_corta:
                                            detalleItemEmpresa?.descripcion_corta || '',
                                        fabricante:
                                            detalleItemEmpresa?.datos_fabricante?.id.toString() ||
                                            '',
                                        categoria:
                                            detalleItemEmpresa?.datos_categoria?.id.toString() ||
                                            '',
                                        proveedores_empresa: detalleItemEmpresa?.datos_proveedores
                                            ? detalleItemEmpresa.datos_proveedores.map((prov) =>
                                                  prov.id.toString(),
                                              )
                                            : [],
                                        codigo_barras: detalleItemEmpresa?.codigo_barras || '',
                                    });
                                }}
                                color='red'>
                                Cancelar
                            </Button>
                        </>
                    ) : (
                        <Tooltip text='Editar Item'>
                            <Button
                                variant='solid'
                                onClick={() => {
                                    setIsEditing(true);
                                }}
                                icon='HeroPencil'></Button>
                        </Tooltip>
                    )}
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex flex-col gap-4'>
                    <div className='grid grid-cols-1 gap-4 xl:grid-cols-12'>
                        <div className='xl:col-span-7'>
                            <Card>
                                <CardHeader>
                                    <Badge className='text-xl'>Detalle Item</Badge>
                                </CardHeader>
                                <CardBody>
                                    {detalleItemEmpresa && (
                                        <div className='flex flex-row gap-4'>
                                            <div className='grid w-full grid-cols-3 gap-4'>
                                                <div className='w-full'>
                                                    <Badge>Nombre</Badge>
                                                    {isEditing ? (
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
                                                    ) : (
                                                        <div className='ml-4'>
                                                            {detalleItemEmpresa.nombre}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className='w-full'>
                                                    <Badge>Categoria</Badge>
                                                    {isEditing ? (
                                                        <Validation
                                                            isValid={formik.isValid}
                                                            isTouched={formik.touched.categoria}
                                                            invalidFeedback={
                                                                formik.errors.categoria
                                                            }>
                                                            <SelectReact
                                                                id='categoria'
                                                                name='categoria'
                                                                isClearable
                                                                isCreatable
                                                                placeholder='Seleccione una Categoria'
                                                                onCreateOption={
                                                                    handleCreateCategoria
                                                                }
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
                                                                            ? (
                                                                                  selectedOption as TSelectOption
                                                                              ).value
                                                                            : null,
                                                                    );
                                                                }}
                                                                onBlur={formik.handleBlur}
                                                            />
                                                        </Validation>
                                                    ) : (
                                                        <div className='ml-4'>
                                                            {(detalleItemEmpresa.datos_categoria &&
                                                                detalleItemEmpresa?.datos_categoria
                                                                    .nombre) ||
                                                                'Sin Categoria'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className='w-full'>
                                                    <Badge>Codigo</Badge>
                                                    {isEditing ? (
                                                        <Validation
                                                            isValid={formik.isValid}
                                                            isTouched={formik.touched.codigo_barras}
                                                            invalidFeedback={
                                                                formik.errors.codigo_barras
                                                            }>
                                                            <Input
                                                                name='codigo_barras'
                                                                onChange={formik.handleChange}
                                                                onBlur={formik.handleBlur}
                                                                value={formik.values.codigo_barras}
                                                            />
                                                        </Validation>
                                                    ) : (
                                                        <div className='ml-4'>
                                                            {detalleItemEmpresa.codigo_barras ||
                                                                'Sin Codigo'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className='w-full'>
                                                    <Badge>Descripción Corta</Badge>
                                                    {isEditing ? (
                                                        <Validation
                                                            isValid={formik.isValid}
                                                            isTouched={
                                                                formik.touched.descripcion_corta
                                                            }
                                                            invalidFeedback={
                                                                formik.errors.descripcion_corta
                                                            }>
                                                            <Input
                                                                name='descripcion_corta'
                                                                value={
                                                                    formik.values.descripcion_corta
                                                                }
                                                                onChange={formik.handleChange}
                                                                onBlur={formik.handleBlur}
                                                            />
                                                        </Validation>
                                                    ) : (
                                                        <div className='ml-4'>
                                                            {detalleItemEmpresa.descripcion_corta ||
                                                                'Sin Descripción'}
                                                        </div>
                                                    )}
                                                </div>
                                                {detalleItemEmpresa &&
                                                detalleItemEmpresa?.datos_fabricante ? (
                                                    <>
                                                        {isEditing ? (
                                                            <>
                                                                <div className='w-full'>
                                                                    <Badge>Fabricante</Badge>
                                                                    <Validation
                                                                        isValid={formik.isValid}
                                                                        isTouched={
                                                                            formik.touched
                                                                                .fabricante
                                                                        }
                                                                        invalidFeedback={
                                                                            formik.errors.fabricante
                                                                        }>
                                                                        <SelectReact
                                                                            id='fabricante'
                                                                            name='fabricante'
                                                                            isClearable
                                                                            isCreatable
                                                                            placeholder='Seleccione un Fabricante'
                                                                            formatCreateLabel={(
                                                                                e,
                                                                            ) => `Crear ${e}`}
                                                                            onCreateOption={
                                                                                handleCreateFabricante
                                                                            }
                                                                            value={
                                                                                formik.values
                                                                                    .fabricante
                                                                                    ? {
                                                                                          value: formik.values.fabricante.toString(),
                                                                                          label:
                                                                                              fabricanteOptions.find(
                                                                                                  (
                                                                                                      fab,
                                                                                                  ) =>
                                                                                                      fab.value ===
                                                                                                      formik.values.fabricante?.toString(),
                                                                                              )
                                                                                                  ?.label ||
                                                                                              '',
                                                                                      }
                                                                                    : null
                                                                            }
                                                                            options={
                                                                                fabricanteOptions
                                                                            }
                                                                            onChange={(
                                                                                selectedOption,
                                                                            ) => {
                                                                                formik.setFieldValue(
                                                                                    'fabricante',
                                                                                    selectedOption
                                                                                        ? (
                                                                                              selectedOption as TSelectOption
                                                                                          ).value
                                                                                        : null,
                                                                                );
                                                                            }}
                                                                            onBlur={
                                                                                formik.handleBlur
                                                                            }
                                                                        />
                                                                    </Validation>
                                                                </div>
                                                                {Number(
                                                                    formik.values.fabricante,
                                                                ) ===
                                                                detalleItemEmpresa.fabricante ? (
                                                                    <>
                                                                        <div className='w-full'>
                                                                            <Badge>
                                                                                Correo Soporte
                                                                            </Badge>
                                                                            <Validation
                                                                                isValid={
                                                                                    formikFabricante.isValid
                                                                                }
                                                                                isTouched={
                                                                                    formikFabricante
                                                                                        .touched
                                                                                        .email_soporte
                                                                                }
                                                                                invalidFeedback={
                                                                                    formikFabricante
                                                                                        .errors
                                                                                        .email_soporte
                                                                                }>
                                                                                <Input
                                                                                    name='email_soporte'
                                                                                    onChange={
                                                                                        formikFabricante.handleChange
                                                                                    }
                                                                                    onBlur={
                                                                                        formikFabricante.handleBlur
                                                                                    }
                                                                                    value={
                                                                                        formikFabricante
                                                                                            .values
                                                                                            .email_soporte
                                                                                    }
                                                                                />
                                                                            </Validation>
                                                                        </div>
                                                                        <div className='w-full'>
                                                                            <Badge>
                                                                                Pagina Web
                                                                            </Badge>
                                                                            <Validation
                                                                                isValid={
                                                                                    formikFabricante.isValid
                                                                                }
                                                                                isTouched={
                                                                                    formikFabricante
                                                                                        .touched
                                                                                        .pagina_web
                                                                                }
                                                                                invalidFeedback={
                                                                                    formikFabricante
                                                                                        .errors
                                                                                        .pagina_web
                                                                                }>
                                                                                <Input
                                                                                    name='pagina_web'
                                                                                    onChange={
                                                                                        formikFabricante.handleChange
                                                                                    }
                                                                                    onBlur={
                                                                                        formikFabricante.handleBlur
                                                                                    }
                                                                                    value={
                                                                                        formikFabricante
                                                                                            .values
                                                                                            .pagina_web
                                                                                    }
                                                                                />
                                                                            </Validation>
                                                                        </div>
                                                                        <div className='w-full'>
                                                                            <Badge>
                                                                                Telefono Soporte
                                                                            </Badge>
                                                                            <Validation
                                                                                isValid={
                                                                                    formikFabricante.isValid
                                                                                }
                                                                                isTouched={
                                                                                    formikFabricante
                                                                                        .touched
                                                                                        .telefono_soporte
                                                                                }
                                                                                invalidFeedback={
                                                                                    formikFabricante
                                                                                        .errors
                                                                                        .telefono_soporte
                                                                                }>
                                                                                <Input
                                                                                    name='telefono_soporte'
                                                                                    onChange={
                                                                                        formikFabricante.handleChange
                                                                                    }
                                                                                    onBlur={
                                                                                        formikFabricante.handleBlur
                                                                                    }
                                                                                    value={
                                                                                        formikFabricante
                                                                                            .values
                                                                                            .telefono_soporte
                                                                                    }
                                                                                />
                                                                            </Validation>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className='w-full'>
                                                                            <Badge>
                                                                                Correo Soporte
                                                                            </Badge>
                                                                            <div className='ml-4'>
                                                                                {detalleItemEmpresa
                                                                                    ?.datos_fabricante
                                                                                    .email_soporte ||
                                                                                    'Sin Correo'}
                                                                            </div>
                                                                        </div>
                                                                        <div className='w-full'>
                                                                            <Badge>
                                                                                Pagina Web
                                                                            </Badge>
                                                                            <div className='ml-4'>
                                                                                {detalleItemEmpresa
                                                                                    ?.datos_fabricante
                                                                                    .pagina_web ||
                                                                                    'Sin Pagina'}
                                                                            </div>
                                                                        </div>
                                                                        <div className='w-full'>
                                                                            <Badge>
                                                                                Telefono Soporte
                                                                            </Badge>
                                                                            <div className='ml-4'>
                                                                                {detalleItemEmpresa
                                                                                    ?.datos_fabricante
                                                                                    .telefono_soporte ||
                                                                                    'Sin Telefono Soporte'}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className='w-full'>
                                                                    <Badge>Nombre</Badge>
                                                                    <div className='ml-4'>
                                                                        {
                                                                            detalleItemEmpresa
                                                                                ?.datos_fabricante
                                                                                .nombre
                                                                        }
                                                                    </div>
                                                                </div>
                                                                <div className='w-full'>
                                                                    <Badge>Correo Soporte</Badge>
                                                                    <div className='ml-4'>
                                                                        {detalleItemEmpresa
                                                                            ?.datos_fabricante
                                                                            .email_soporte ||
                                                                            'Sin Correo'}
                                                                    </div>
                                                                </div>
                                                                <div className='w-full'>
                                                                    <Badge>Pagina Web</Badge>
                                                                    <div className='ml-4'>
                                                                        {detalleItemEmpresa
                                                                            ?.datos_fabricante
                                                                            .pagina_web ||
                                                                            'Sin Pagina'}
                                                                    </div>
                                                                </div>
                                                                <div className='w-full'>
                                                                    <Badge>Telefono Soporte</Badge>
                                                                    <div className='ml-4'>
                                                                        {detalleItemEmpresa
                                                                            ?.datos_fabricante
                                                                            .telefono_soporte ||
                                                                            'Sin Telefono Soporte'}
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </>
                                                ) : isEditing ? (
                                                    <div className='w-full'>
                                                        <Badge>Fabricante</Badge>
                                                        <Validation
                                                            isValid={formik.isValid}
                                                            isTouched={formik.touched.fabricante}
                                                            invalidFeedback={
                                                                formik.errors.fabricante
                                                            }>
                                                            <SelectReact
                                                                id='fabricante'
                                                                name='fabricante'
                                                                isClearable
                                                                placeholder='Seleccione un Fabricante'
                                                                isCreatable
                                                                formatCreateLabel={(e) =>
                                                                    `Crear ${e}`
                                                                }
                                                                onCreateOption={
                                                                    handleCreateFabricante
                                                                }
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
                                                                            ? (
                                                                                  selectedOption as TSelectOption
                                                                              ).value
                                                                            : null,
                                                                    );
                                                                }}
                                                                onBlur={formik.handleBlur}
                                                            />
                                                        </Validation>
                                                    </div>
                                                ) : (
                                                    <div className='ml-4'>Sin Fabricante</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </div>

                        <div className='flex flex-col gap-4 xl:col-span-5'>
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <div className='flex flex-row gap-4 overflow-auto'>
                                            <Button
                                                {...(activeComponent2 === 'Imagenes'
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
                                                    setActiveComponent2('Imagenes');
                                                }}>
                                                Imagenes
                                            </Button>
                                            <Button
                                                {...(activeComponent2 === 'Historico del Stock'
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
                                                    setActiveComponent2('Historico del Stock');
                                                }}>
                                                Historico del Stock
                                            </Button>
                                        </div>
                                    </CardHeaderChild>
                                </CardHeader>
                            </Card>

                            {activeComponent2 === 'Imagenes' && (
                                <Card>
                                    <CardHeader>
                                        <CardHeaderChild>
                                            <Badge className='text-xl'>Imagenes</Badge>
                                        </CardHeaderChild>
                                        <CardHeaderChild>
                                            <CrearImagenEnDetalleItem />
                                        </CardHeaderChild>
                                    </CardHeader>
                                    <CardBody>
                                        {detalleItemEmpresa &&
                                        detalleItemEmpresa.imagenes.length > 0 ? (
                                            <>
                                                <Swiper spaceBetween={30}>
                                                    {detalleItemEmpresa.imagenes.map(
                                                        (imagen, index) => (
                                                            <SwiperSlide
                                                                key={index}
                                                                className='w-full'
                                                                onClick={() => setIndex(index)}>
                                                                <div className='h-[250px]'>
                                                                    <img
                                                                        src={imagen.imagen}
                                                                        alt={`imagen-${index}`}
                                                                        className='h-full w-full rounded-xl object-cover object-center'
                                                                    />
                                                                </div>
                                                            </SwiperSlide>
                                                        ),
                                                    )}
                                                </Swiper>
                                                <Lightbox
                                                    slides={detalleItemEmpresa.imagenes.map(
                                                        (imagen) => ({
                                                            src: imagen.imagen,
                                                            alt: imagen.id.toString(),
                                                        }),
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
                                                                    onClick={async () => {
                                                                        try {
                                                                            const response =
                                                                                await ApiService.fetchData(
                                                                                    {
                                                                                        url: `/api/imagenes-item/${detalleItemEmpresa.imagenes[index].id}/`,
                                                                                        method: 'delete',
                                                                                    },
                                                                                );
                                                                            if (
                                                                                response.status ===
                                                                                204
                                                                            ) {
                                                                                toast.success(
                                                                                    'Imagen eliminada',
                                                                                    {
                                                                                        autoClose: 1000,
                                                                                    },
                                                                                );
                                                                                dispatch(
                                                                                    detalleItemEmpresaThunk(
                                                                                        {
                                                                                            id_empresa:
                                                                                                detalleItemEmpresa.empresa,
                                                                                            id_item:
                                                                                                detalleItemEmpresa.id,
                                                                                        },
                                                                                    ),
                                                                                );
                                                                                setIndex(-1);
                                                                            }
                                                                        } catch (error: any) {
                                                                            const mensajesError =
                                                                                Object.values(
                                                                                    error.response
                                                                                        .data,
                                                                                )
                                                                                    .flat() // Aplana los arrays en caso de que haya más de uno
                                                                                    .join(' '); // Une los mensajes en una sola cadena
                                                                            toast.error(
                                                                                mensajesError ||
                                                                                    'Error al eliminar la imagen',
                                                                                {
                                                                                    toastId:
                                                                                        'Error al eliminar la imagen',
                                                                                },
                                                                            );
                                                                        }
                                                                    }}
                                                                />
                                                            </div>,
                                                            'close',
                                                        ],
                                                    }}
                                                />
                                            </>
                                        ) : (
                                            <div className='ml-4'>Sin Imagenes</div>
                                        )}
                                    </CardBody>
                                </Card>
                            )}

                            {activeComponent2 === 'Historico del Stock' && (
                                <GraficoMovimientosStockEnItem
                                    setMovSeleccionado={setMovSeleccionado}
                                    setActiveComponent={setActiveComponent}
                                />
                            )}
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <div className='flex flex-row gap-4 overflow-auto'>
                                    <Button
                                        {...(activeComponent === 'Proveedores'
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
                                            setActiveComponent('Proveedores');
                                        }}>
                                        Proveedores
                                    </Button>
                                    <Button
                                        {...(activeComponent === 'Ordenes de Compra'
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
                                            setActiveComponent('Ordenes de Compra');
                                        }}>
                                        Ordenes de Compra
                                    </Button>
                                    <Button
                                        {...(activeComponent === 'Movimientos del Stock'
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
                                            setActiveComponent('Movimientos del Stock');
                                        }}>
                                        Movimientos del Stock
                                    </Button>
                                </div>
                            </CardHeaderChild>
                        </CardHeader>
                    </Card>

                    {activeComponent === 'Proveedores' && <TablaProveedoresEnItem />}

                    {activeComponent === 'Ordenes de Compra' && <TablaOCEnItem />}

                    {activeComponent === 'Movimientos del Stock' && (
                        <TablaMovimientosStockEnItem movSeleccionado={movSeleccionado} />
                    )}
                </div>
            </Container>
        </PageWrapper>
    );
}

export default DetalleItemEmpresa;

{
    /* */
}
