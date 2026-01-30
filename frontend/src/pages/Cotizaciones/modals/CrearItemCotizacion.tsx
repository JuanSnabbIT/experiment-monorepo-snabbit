import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
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
import { IItemEmpresa, IProveedorEmpresa } from '@/interface/items.interface';
import ApiService from '@/services/ApiService';
import {
    listaCamposAdicionalesItemThunk,
    listaCategoriasThunk,
    listaItemsEmpresaFiltroThunk,
    listaProveedoresEmpresaThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import { parseLocaleNumber } from '@/utils/currency';

import { ICotizacion, IItemCotizacion } from '@/interface/cotizaciones.interface';

function CrearItemCotizacion({
    cotizacion,
    items = [],
    onItemChange,
}: {
    cotizacion: ICotizacion | undefined;
    items: IItemCotizacion[];
    onItemChange?: () => void;
}) {
    const dispatch = useAppDispatch();
    const {
        listaItemsEmpresaFiltro,
        listaCategorias,
        listaProveedoresEmpresa,
        listaCamposAdicionalesItem,
    } = useAppSelector((state) => state.item);
    const [itemSeleccionado, setItemSeleccionado] = useState<IItemEmpresa | undefined>();
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState<
        IProveedorEmpresa | undefined
    >();
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('');
    const [valorSeleccionado, setValorSeleccionado] = useState<
        { value: string; label: string } | undefined
    >();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [creandoItem, setCreandoItem] = useState<boolean>(false);
    const [showCategoria, setShowCategoria] = useState<boolean>(false);
    const [isService, setIsService] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const itemsEnPreparacion = items;

    const itemsEmpresaDisponibles = listaItemsEmpresaFiltro.filter(
        (item) =>
            !itemsEnPreparacion.some((itemPreparacion) => itemPreparacion.item_empresa === item.id),
    );

    const validationSchema = Yup.object().shape({
        nombre: !creandoItem
            ? Yup.string().notRequired().nullable()
            : Yup.string()
                  .required('Requerido')
                  .nonNullable('Requerido')
                  .max(250, 'Maximo 250 Caracteres'),
        descripcion: !creandoItem
            ? Yup.string().notRequired().nullable()
            : Yup.string()
                  .required('Requerido')
                  .nonNullable('Requerido')
                  .max(250, 'Maximo 250 Caracteres'),
        cantidad: Yup.number()
            .required('Requerido')
            .min(1, 'Debe ser mayor a 0')
            .nonNullable('Requerido'),
        precio_unitario: Yup.string()
            .required('Requerido')
            .test('precio', 'Debe ser mayor o igual a 0', (value) => {
                return parseLocaleNumber(value || '') >= 0;
            })
            .nonNullable('Requerido'),
        recargo_dolar: Yup.number()
            .required('Requerido')
            .nonNullable('Requerido')
            .min(0, 'Debe ser mayor o igual a 0'),
    });

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            descripcion: '',
            cantidad: 1,
            precio_unitario: '',
            recargo_dolar: 0,
        },
        validationSchema,
        onSubmit: async (values) => {
            const precioUnitario = parseLocaleNumber(values.precio_unitario);
            if (!creandoItem) {
                if (!itemSeleccionado || !proveedorSeleccionado) {
                    toast.error('Debe seleccionar un item y un proveedor', {
                        toastId: 'Debe seleccionar un item y un proveedor',
                    });
                } else {
                    setIsSubmitting(true);
                    try {
                        const response = await ApiService.fetchData({
                            url: `/api/cotizaciones/${cotizacion?.id}/items/`,
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            data: JSON.stringify({
                                cotizacion: cotizacion?.id,
                                cantidad: values.cantidad,
                                precio_unitario: precioUnitario,
                                item_empresa: itemSeleccionado.id,
                                descripcion: values.descripcion,
                                proveedor_empresa: proveedorSeleccionado.id,
                                recargo_dolar: values.recargo_dolar,
                            }),
                        });
                        if (response.data) {
                            toast.success('Item creado', { autoClose: 1000 });
                            if (onItemChange) onItemChange();
                            setIsOpen(false);
                            formik.resetForm();
                        }
                    } catch (error: any) {
                        const errorData = error.response?.data;
                        const mensajesError = errorData
                            ? Object.values(errorData).flat().join(' ')
                            : error.message || 'Error al crear el Item';
                        toast.error(mensajesError, {
                            toastId: 'Error al crear el Item',
                        });
                    } finally {
                        setIsSubmitting(false);
                    }
                }
            } else if (creandoItem && !isService) {
                if (!proveedorSeleccionado) {
                    toast.error('Debe seleccionar un proveedor', {
                        toastId: 'Debe seleccionar un proveedor',
                    });
                    return;
                }
                setIsSubmitting(true);
                try {
                    const response = await ApiService.fetchData<IItemEmpresa, string>({
                        url: `/api/items-empresa/`,
                        method: 'post',
                        headers: { 'Content-Type': 'application/json' },
                        data: JSON.stringify({
                            nombre: values.nombre,
                            descripcion_corta: values.descripcion,
                            proveedores_empresa: [proveedorSeleccionado?.id],
                            empresa: cotizacion?.empresa,
                        }),
                    });
                    if (response.data) {
                        const responseCoti = await ApiService.fetchData({
                            url: `/api/cotizaciones/${cotizacion?.id}/items/`,
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            data: JSON.stringify({
                                cotizacion: cotizacion?.id,
                                cantidad: values.cantidad,
                                precio_unitario: precioUnitario,
                                item_empresa: response.data.id,
                                descripcion: values.descripcion,
                                proveedor_empresa: proveedorSeleccionado?.id,
                                recargo_dolar: response.data.datos_proveedores[0].recargo_dolar,
                            }),
                        });
                        if (responseCoti.data) {
                            toast.success('Item creado', { autoClose: 1000 });
                            if (onItemChange) onItemChange();
                            setIsOpen(false);
                            formik.resetForm();
                        }
                    }
                } catch (error: any) {
                    const errorData = error.response?.data;
                    const mensajesError = errorData
                        ? Object.values(errorData).flat().join(' ')
                        : error.message || 'Error al crear el item';
                    toast.error(mensajesError, {
                        toastId: 'Error al crear el item',
                    });
                } finally {
                    setIsSubmitting(false);
                }
            } else {
                setIsSubmitting(true);
                try {
                    const response = await ApiService.fetchData({
                        url: `/api/cotizaciones/${cotizacion?.id}/items/`,
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        data: JSON.stringify({
                            cotizacion: cotizacion?.id,
                            proveedor_empresa: proveedorSeleccionado?.id,
                            ...values,
                            precio_unitario: precioUnitario,
                        }),
                    });
                    if (response.data) {
                        toast.success('Item creado', { autoClose: 1000 });
                        if (onItemChange) onItemChange();
                        setIsOpen(false);
                        formik.resetForm();
                    }
                } catch (error: any) {
                    const errorData = error.response?.data;
                    const mensajesError = errorData
                        ? Object.values(errorData).flat().join(' ')
                        : error.message || 'Error al crear el Item';
                    toast.error(mensajesError, {
                        toastId: 'Error al crear el Item',
                    });
                } finally {
                    setIsSubmitting(false);
                }
            }
        },
    });

    useEffect(() => {
        if (isOpen && cotizacion?.empresa) {
            dispatch(listaCamposAdicionalesItemThunk({ id_empresa: cotizacion.empresa }));
            dispatch(listaItemsEmpresaFiltroThunk({ id_empresa: cotizacion.empresa }));
            dispatch(listaProveedoresEmpresaThunk({ id_empresa: cotizacion.empresa }));
            dispatch(listaCategoriasThunk());
        } else {
            formik.resetForm();
            setItemSeleccionado(undefined);
            setProveedorSeleccionado(undefined);
            setCategoriaSeleccionada('');
            setValorSeleccionado(undefined);
            setShowCategoria(false);
        }
    }, [isOpen]);

    return (
        <>
            <Tooltip text='Crear Item'>
                <Button
                    variant='solid'
                    icon='HeroPlus'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                />
            </Tooltip>
            <Modal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                isStaticBackdrop
                isStaticBackdropAnimation={false}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Item</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='grid grid-cols-6 gap-4'>
                        {showCategoria && (
                            <>
                                <div className='col-span-3'>
                                    <Badge>Filtrar Items por Categoria</Badge>
                                    <SelectReact
                                        name='categoria'
                                        options={listaCategorias.map((cate) => ({
                                            value: cate.id.toString(),
                                            label: cate.nombre,
                                        }))}
                                        noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                        placeholder='Seleccione una Categoria'
                                        onChange={(e) => {
                                            if (e) {
                                                setCategoriaSeleccionada(
                                                    (e as TSelectOption).value,
                                                );
                                                const params = new URLSearchParams();
                                                params.append(
                                                    'categoria_id',
                                                    (e as TSelectOption).value,
                                                );
                                                dispatch(
                                                    listaItemsEmpresaFiltroThunk({
                                                        id_empresa: cotizacion?.empresa,
                                                        filtro: params,
                                                    }),
                                                );
                                                setItemSeleccionado(undefined);
                                                setProveedorSeleccionado(undefined);
                                            } else {
                                                dispatch(
                                                    listaItemsEmpresaFiltroThunk({
                                                        id_empresa: cotizacion?.empresa,
                                                    }),
                                                );
                                                setItemSeleccionado(undefined);
                                                setCategoriaSeleccionada('');
                                                setProveedorSeleccionado(undefined);
                                            }
                                        }}
                                        value={{
                                            value: categoriaSeleccionada,
                                            label:
                                                listaCategorias.find(
                                                    (cate) =>
                                                        cate.id.toString() ===
                                                        categoriaSeleccionada,
                                                )?.nombre || '',
                                        }}
                                        isClearable
                                    />
                                </div>
                                <div className='col-span-3'>
                                    <Badge>Filtrar por Campos Adicionales</Badge>
                                    <SelectReact
                                        name='campo'
                                        placeholder='Seleccione un Campo'
                                        options={listaCamposAdicionalesItem.map((campo) => ({
                                            value: campo.id.toString(),
                                            label: `${campo.nombre_campo}: ${campo.valor}`,
                                        }))}
                                        onChange={(e) => {
                                            if (e) {
                                                setValorSeleccionado(e as TSelectOption);
                                                const campo = listaCamposAdicionalesItem.find(
                                                    (campo) =>
                                                        campo.id.toString() ===
                                                        (e as TSelectOption).value,
                                                );
                                                if (campo) {
                                                    const item = listaItemsEmpresaFiltro.find(
                                                        (item) => item.id === campo.item,
                                                    );
                                                    if (item) {
                                                        setItemSeleccionado(item);
                                                        setProveedorSeleccionado(
                                                            item.datos_proveedores.find(
                                                                (prov) =>
                                                                    prov.id === campo.proveedor,
                                                            ),
                                                        );
                                                    }
                                                }
                                            } else {
                                                setValorSeleccionado(undefined);
                                                setItemSeleccionado(undefined);
                                                setProveedorSeleccionado(undefined);
                                            }
                                        }}
                                        isClearable
                                        value={valorSeleccionado}
                                    />
                                    {/* <Input
                                        name="filtro"
                                        onChange={(e) => {
                                            const params = new URLSearchParams();
                                            params.append("categoria_id", categoriaSeleccionada)
                                            setValorSeleccionado(e.target.value)
                                            if (e.target.value) {
                                                params.append("valor", e.target.value)
                                            }
                                            dispatch(listaItemsEmpresaFiltroThunk({id_empresa: detalleCotizacion?.empresa, filtro: params}))
                                            setItemSeleccionado(undefined)
                                            setProveedorSeleccionado(undefined)
                                        }}
                                        value={valorSeleccionado}
                                    /> */}
                                </div>
                            </>
                        )}
                        {/* Item selector - full width */}
                        <div className='col-span-full'>
                            <div className='flex items-center justify-between gap-3'>
                                <Badge>Item de la Empresa</Badge>
                                <Button
                                    size='xs'
                                    variant='outline'
                                    color='gray'
                                    onClick={() => {
                                        setCreandoItem((prev) => !prev);
                                        setItemSeleccionado(undefined);
                                        setProveedorSeleccionado(undefined);
                                        setShowCategoria(false);
                                    }}>
                                    {creandoItem ? 'Seleccionar existente' : 'Crear nuevo'}
                                </Button>
                            </div>
                            {!creandoItem ? (
                                <div className='flex flex-row gap-2'>
                                    <div className='w-full'>
                                        <SelectReact
                                            key={categoriaSeleccionada}
                                            name='item_empresa'
                                            options={itemsEmpresaDisponibles.map((item) => ({
                                                value: item.id.toString(),
                                                label: item.nombre,
                                            }))}
                                            onChange={(e) => {
                                                if (e) {
                                                    const sel = itemsEmpresaDisponibles.find(
                                                        (i) =>
                                                            i.id.toString() ===
                                                            (e as TSelectOption).value,
                                                    );
                                                    setItemSeleccionado(sel);
                                                    const primerProveedor =
                                                        sel?.datos_proveedores?.[0];
                                                    setProveedorSeleccionado(primerProveedor);
                                                    // Auto-fill recargo_dolar if provider has USD currency
                                                    if (primerProveedor?.tipo_moneda === '1') {
                                                        formik.setFieldValue(
                                                            'recargo_dolar',
                                                            primerProveedor.recargo_dolar || 0,
                                                        );
                                                    }
                                                } else {
                                                    setItemSeleccionado(undefined);
                                                    setProveedorSeleccionado(undefined);
                                                }
                                            }}
                                            value={
                                                itemSeleccionado
                                                    ? {
                                                          value: itemSeleccionado.id.toString(),
                                                          label: itemSeleccionado.nombre,
                                                      }
                                                    : undefined
                                            }
                                        />
                                    </div>

                                    {showCategoria ? (
                                        <Button
                                            size='sm'
                                            variant='solid'
                                            color='red'
                                            icon='HeroXMark'
                                            onClick={() => {
                                                setShowCategoria(false);
                                                setCategoriaSeleccionada('');
                                            }}
                                        />
                                    ) : (
                                        <Button
                                            size='sm'
                                            variant='solid'
                                            color='zinc'
                                            icon='DuoSearch'
                                            onClick={() => {
                                                setShowCategoria(true);
                                            }}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className='mt-3 grid grid-cols-6 gap-4'>
                                    <div className='col-span-3'>
                                        <Badge>Nombre</Badge>
                                        <Validation
                                            isValid={formik.isValid}
                                            isTouched={formik.touched.nombre}
                                            invalidFeedback={formik.errors.nombre}>
                                            <Input
                                                name='nombre'
                                                id='nombre'
                                                placeholder='Nombre del item'
                                                onBlur={formik.handleBlur}
                                                onChange={formik.handleChange}
                                                value={formik.values.nombre}
                                            />
                                        </Validation>
                                    </div>
                                    <div className='col-span-3'>
                                        <Badge>Proveedor</Badge>
                                        <SelectReact
                                            name='proveedor_empresa'
                                            options={listaProveedoresEmpresa.map((pro) => ({
                                                value: pro.id.toString(),
                                                label: pro.nombre,
                                            }))}
                                            onChange={(e) => {
                                                if (e) {
                                                    const prov = listaProveedoresEmpresa.find(
                                                        (pro) =>
                                                            pro.id.toString() ===
                                                            (e as TSelectOption).value,
                                                    );
                                                    setProveedorSeleccionado(prov);
                                                    formik.setFieldValue(
                                                        'recargo_dolar',
                                                        prov?.recargo_dolar || 0,
                                                    );
                                                } else {
                                                    setProveedorSeleccionado(undefined);
                                                }
                                            }}
                                            value={
                                                proveedorSeleccionado
                                                    ? {
                                                          value: proveedorSeleccionado.id.toString(),
                                                          label: proveedorSeleccionado.nombre,
                                                      }
                                                    : undefined
                                            }
                                            placeholder='Seleccione un proveedor'
                                            isClearable
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* When an item is selected show Provider + Recargo side-by-side */}
                        {itemSeleccionado && (
                            <>
                                <div className='col-span-3'>
                                    <Badge>Proveedor (Moneda)</Badge>
                                    <SelectReact
                                        name='proveedor_empresa'
                                        options={itemSeleccionado?.datos_proveedores.map((pro) => {
                                            const moneda =
                                                pro.tipo_moneda === '1'
                                                    ? 'USD'
                                                    : pro.tipo_moneda === '3'
                                                      ? 'UF'
                                                      : 'CLP';
                                            return {
                                                value: pro.id.toString(),
                                                label: `${pro.nombre} (${moneda})`,
                                            };
                                        })}
                                        onChange={(e) => {
                                            if (e) {
                                                const prov =
                                                    itemSeleccionado?.datos_proveedores.find(
                                                        (pro) =>
                                                            pro.id.toString() ===
                                                            (e as TSelectOption).value,
                                                    );
                                                setProveedorSeleccionado(prov);
                                                formik.setFieldValue(
                                                    'recargo_dolar',
                                                    prov?.recargo_dolar || 0,
                                                );
                                            } else {
                                                setProveedorSeleccionado(undefined);
                                            }
                                        }}
                                        noOptionsMessage={(opts) => `No Existe ${opts.inputValue}`}
                                        value={
                                            proveedorSeleccionado
                                                ? {
                                                      value: proveedorSeleccionado.id.toString(),
                                                      label: proveedorSeleccionado.nombre,
                                                  }
                                                : undefined
                                        }
                                        placeholder='Seleccione un Proveedor'
                                        isClearable
                                    />
                                </div>
                                <div className='col-span-3'>
                                    {proveedorSeleccionado?.tipo_moneda === '1' ? (
                                        <>
                                            <Badge>Recargo por Dólar</Badge>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.recargo_dolar}
                                                invalidFeedback={formik.errors.recargo_dolar}>
                                                <Input
                                                    name='recargo_dolar'
                                                    type='number'
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.recargo_dolar}
                                                />
                                            </Validation>
                                        </>
                                    ) : (
                                        <div />
                                    )}
                                </div>
                            </>
                        )}

                        {/* Row: Cantidad + Precio side-by-side */}
                        <div className='col-span-3'>
                            <Badge>Cantidad</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cantidad}
                                invalidFeedback={formik.errors.cantidad}>
                                <Input
                                    name='cantidad'
                                    id='cantidad'
                                    type='number'
                                    placeholder='Cantidad'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.cantidad}
                                />
                            </Validation>
                        </div>
                        <div className='col-span-3'>
                            <Badge>
                                Precio Unitario
                                {proveedorSeleccionado && (
                                    <span className='ml-1 text-xs font-normal text-gray-500'>
                                        (
                                        {proveedorSeleccionado.tipo_moneda === '1'
                                            ? 'USD'
                                            : proveedorSeleccionado.tipo_moneda === '3'
                                              ? 'UF'
                                              : 'CLP'}
                                        )
                                    </span>
                                )}
                            </Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.precio_unitario}
                                invalidFeedback={formik.errors.precio_unitario}>
                                <Input
                                    name='precio_unitario'
                                    id='precio_unitario'
                                    type='text'
                                    inputMode='decimal'
                                    placeholder='Precio Unitario'
                                    onBlur={formik.handleBlur}
                                    onChange={(e) => {
                                        formik.setFieldValue('precio_unitario', e.target.value);
                                    }}
                                    value={formik.values.precio_unitario}
                                />
                            </Validation>
                        </div>
                        <div className='col-span-full'>
                            <Badge>
                                Descripción
                                <Tooltip text='Borrar Descripción'>
                                    <Button
                                        variant='default'
                                        color='red'
                                        size='xs'
                                        icon='DuoBroom'
                                        onClick={() => {
                                            formik.setFieldValue('descripcion', '');
                                        }}
                                    />
                                </Tooltip>
                            </Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.descripcion}
                                invalidFeedback={formik.errors.descripcion}>
                                <Textarea
                                    name='descripcion'
                                    id='descripcion'
                                    placeholder='Descripción'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.descripcion}
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
                            isDisable={isSubmitting}
                            onClick={() => {
                                formik.handleSubmit();
                            }}>
                            {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearItemCotizacion;
