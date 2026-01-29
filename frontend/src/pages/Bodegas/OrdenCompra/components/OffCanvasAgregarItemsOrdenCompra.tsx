import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import OffCanvas, { OffCanvasBody, OffCanvasFooter, OffCanvasFooterChild, OffCanvasHeader } from "@/components/ui/OffCanvas"
import Tooltip from "@/components/ui/Tooltip"
import { IOrdenCompra } from "@/interface/bodega.interface"
import { ICategoria, IFabricante, IItemEmpresa } from "@/interface/items.interface"
import ApiService from "@/services/ApiService"
import { useAppDispatch, useAppSelector } from "@/store"
import { ordenCompraApi } from "@/store/slices/bodega/ordenCompraApi"
import { listaCategoriasThunk, listaFabricanteThunk, listaItemsEmpresaProveedorThunk } from "@/store/slices/item/itemSlice"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


const getValidationSchema = (isCreating: boolean) => Yup.object().shape({
    item: Yup.string()
        .when([], {
            is: () => !isCreating,
            then: (schema) => schema.required("Requerido"),
            otherwise: (schema) => schema.notRequired(),
        }),
    nombre: Yup.string()
        .max(250, "Máximo 250 Caracteres")
        .when([], {
            is: () => isCreating,
            then: (schema) => schema.required("Requerido"),
            otherwise: (schema) => schema.notRequired(),
        }),
    descripcion_corta: Yup.string().nullable().notRequired().max(45, "Máximo 45 Caracteres"),
    comentarios: Yup.string().notRequired().nullable(),
    cantidad: Yup.number().required("Requerido").min(1, "Minimo 1"),
    precio: Yup.number().required("Requerido").min(1, "Minimo 1"),
});

function OffCanvasAgregarItemsOrdenCompra({id_orden, detalleOrdenCompra} : {id_orden: string | number | undefined, detalleOrdenCompra: IOrdenCompra | undefined}) {
    const dispatch = useAppDispatch()
    const { listaItemsEmpresaProveedor, listaCategorias, listaFabricante } = useAppSelector((state) => state.item)
    // Removed selector for detalleOrdenCompra from state.bodega
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [optionsItems, setOptionsItems] = useState<{value: string, label: string}[]>([])
    const [isCreating, setIsCreating] = useState<boolean>(false)
    const [isCreatingCategoria, setIsCreatingCategoria] = useState<boolean>(false)
    const [isCreatingFabricante, setIsCreatingFabricante] = useState<boolean>(false)
    const [itemSelected, setItemSelected] = useState<IItemEmpresa>()
    const [categoriaSelected, setCategoriaSelected] = useState<{value: string, label: string}>()
    const [fabricanteSelected, setFabricanteSelected] = useState<{value: string, label: string}>()
    const [optionFabricante, setOptionFabricante] = useState<{value: string, label: string}[]>([])
    const [optionCategoria, setOptionCategoria] = useState<{value: string, label: string}[]>([])
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const validationSchema = getValidationSchema(isCreating);

    useEffect(() => {
        if (isOpen && id_orden) {
            dispatch(ordenCompraApi.util.invalidateTags([{ type: 'OrdenCompra', id: id_orden }]))
        }
    }, [isOpen])

    useEffect(() => {
        if (isOpen && detalleOrdenCompra) {
            dispatch(listaItemsEmpresaProveedorThunk({id_empresa: detalleOrdenCompra.oc_empresa, id_proveedor: detalleOrdenCompra.proveedor}))
            dispatch(listaFabricanteThunk())
            dispatch(listaCategoriasThunk())
        }
    }, [isOpen, detalleOrdenCompra])

    useEffect(() => {
        if (listaFabricante.length > 0) {
            setOptionFabricante(listaFabricante.map(fab => {return {value: fab.id.toString(), label: fab.nombre}}))
        }
    }, [listaFabricante])

    useEffect(() => {
        if (listaCategorias.length > 0) {
            setOptionCategoria(listaCategorias.map(cat => {return {value: cat.id.toString(), label: cat.nombre}}))
        }
    }, [listaCategorias])

    useEffect(() => {
        let opti: {value: string, label: string}[] = []
        if (listaItemsEmpresaProveedor.length > 0) {
            opti = listaItemsEmpresaProveedor
                .filter(it => !detalleOrdenCompra?.datos_item.some(i => i.item === it.id))
                .map(item => ({ value: item.id.toString(), label: item.nombre }));
        }
        setOptionsItems(opti)
    }, [listaItemsEmpresaProveedor, detalleOrdenCompra?.datos_item])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            item: "",
            nombre: "",
            descripcion_corta: "",
            comentarios: "",
            cantidad: 0,
            precio: 0,
            categoria: "",
            fabricante: "",
        },
        validationSchema,
        onSubmit: async (values) => {
            setIsSubmitting(true)
            try {
                let data = {...values}
                if (isCreatingCategoria) {
                    const responseCategoria = await ApiService.fetchData<ICategoria, string>({url: `/api/categorias/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({nombre: formik.values.categoria})})
                    if (responseCategoria.data) {
                        data = {...data, categoria: responseCategoria.data.id.toString()}
                    } else {
                        toast.error(responseCategoria.data || "Error al crear la categoria", {toastId: "Error al crear la categoria"})
                    }
                }
                if (isCreatingFabricante) {
                    const responseFabricante = await ApiService.fetchData<IFabricante, string>({url: `/api/fabricantes/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({nombre: formik.values.fabricante})})
                    if (responseFabricante.data) {
                        data = {...data, fabricante: responseFabricante.data.id.toString()}
                    } else {
                        toast.error(responseFabricante.data || "Error al crear el fabricante", {toastId: "Error al crear el fabricante"})
                    }
                }
                if (isCreating) {
                    const response = await ApiService.fetchData<IItemEmpresa, string>({url: `/api/items-empresa/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                        nombre: data.nombre,
                        descripcion_corta: data.descripcion_corta,
                        fabricante: data.fabricante,
                        categoria: data.categoria,
                        empresa: detalleOrdenCompra?.oc_cliente,
                        proveedores_empresa: [detalleOrdenCompra?.proveedor],
                        comentarios: data.comentarios
                    })})
                    if (response.data) {
                        const responseAgregar = await ApiService.fetchData<any, string>({url: `/api/ordenes-compra/${detalleOrdenCompra?.id}/add_item/`, headers: {'Content-Type': 'application/json'}, method: 'post', data: JSON.stringify({item: response.data.id, cantidad: data.cantidad, precio: data.precio})})
                        if (responseAgregar.data) {
                            toast.success(responseAgregar.data.message, {autoClose: 1000})
                            formik.resetForm()
                            setIsSubmitting(false)
                        } else {
                            toast.error(responseAgregar.data.error || "Error al agregar el item a la orden de compra", {toastId: "Error al agregar el item a la orden de compra"})
                        }
                    } else {
                        toast.error(response.data || "Error al crear el item en la empresa", {toastId: "Error al crear el item en la empresa"})
                    }
                } else {
                    const itemProv = listaItemsEmpresaProveedor.find(it => data.item === it.id.toString())
                    if (itemProv) {
                        const responseAgregar = await ApiService.fetchData<any, string>({url: `/api/ordenes-compra/${detalleOrdenCompra?.id}/add_item/`, headers: {'Content-Type': 'application/json'}, method: 'post', data: JSON.stringify({item: data.item, cantidad: data.cantidad, precio: data.precio})})
                        if (responseAgregar.data) {
                            toast.success(responseAgregar.data.message, {autoClose: 1000})
                            formik.resetForm()
                            setIsSubmitting(false)
                        } else {
                            toast.error(responseAgregar.data.error || "Error al agregar el item a la orden de compra", {toastId: "Error al agregar el item a la orden de compra"})
                        }
                    }
                }
                setIsCreating(false)
                setIsCreatingCategoria(false)
                setIsCreatingFabricante(false)
                setItemSelected(undefined)
                setCategoriaSelected(undefined)
                setFabricanteSelected(undefined)
                setOptionFabricante([])
                setOptionCategoria([])
                setIsOpen(false)
            } catch (error: any) {
                setIsSubmitting(false)
                const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.response?.data || error.message || "Error al agregar el item"
                toast.error(typeof errorMessage === 'string' ? errorMessage : "Error al agregar el item", {
                    toastId: "error-agregar-item-oc"
                })
            }
        },
    })

    useEffect(() => {
        if (!isOpen) {
            dispatch(ordenCompraApi.util.invalidateTags([{ type: 'OrdenCompraItems', id: id_orden }]))
            setItemSelected(undefined)
            setCategoriaSelected(undefined)
            setFabricanteSelected(undefined)
            formik.resetForm()
        }
    }, [isOpen])

    return (
        <>
            <Tooltip text="Agregar Items del Proveedor">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroPlus"></Button>
            </Tooltip>
            <OffCanvas isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <OffCanvasHeader>
                    <Badge className="text-xl">Agregar Items del Proveedor</Badge>
                </OffCanvasHeader>
                <OffCanvasBody>
                    <div className="flex flex-col gap-4">
                        <div className="w-full">
                            <Badge>Nombre</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.nombre}
                                invalidFeedback={formik.errors.nombre}
                            >
                                <SelectReact
                                    name="nombre"
                                    noOptionsMessage={(e) => (`Crear ${e.inputValue}`)}
                                    placeholder="Seleccionar o Crear Item"
                                    isCreatable={true}
                                    isClearable={true}
                                    options={optionsItems}
                                    formatCreateLabel={(e) => (`Crear item "${e}"`)}
                                    value={isCreating ? {value: formik.values.nombre, label: formik.values.nombre} : {value: formik.values.item, label: listaItemsEmpresaProveedor.find(it => it.id.toString() === formik.values.item)?.nombre || ""}}
                                    onCreateOption={(e) => {
                                        setIsCreating(true);
                                        setItemSelected(undefined)
                                        formik.setFieldValue("nombre", e);
                                        setCategoriaSelected(undefined)
                                        setFabricanteSelected(undefined)
                                        formik.setFieldValue("categoria", "")
                                        formik.setFieldValue("fabricante", "")
                                    }}
                                    onChange={(e) => {
                                        formik.setFieldValue("item", e ? (e as TSelectOption).value : "");
                                        setIsCreating(false);
                                        const itemProv = listaItemsEmpresaProveedor.find(it => it.id.toString() === (e as TSelectOption).value)
                                        if (itemProv) {
                                            setItemSelected(itemProv)
                                            if (itemProv.categoria) {
                                                setCategoriaSelected({value: itemProv.categoria.toString() || "", label: itemProv.datos_categoria?.nombre || ""})
                                                formik.setFieldValue("categoria", itemProv.categoria.toString())
                                            } else {
                                                setCategoriaSelected(undefined)
                                                formik.setFieldValue("categoria", "")
                                            }
                                            if (itemProv.fabricante) {
                                                setFabricanteSelected({value: itemProv.fabricante.toString(), label: itemProv.datos_fabricante?.nombre || ""})
                                                formik.setFieldValue("fabricante", itemProv.fabricante.toString())
                                            } else {
                                                setFabricanteSelected(undefined)
                                                formik.setFieldValue("fabricante", "")
                                            }
                                        } else {
                                            setItemSelected(undefined)
                                            setCategoriaSelected(undefined)
                                            formik.setFieldValue("categoria", "")
                                            setFabricanteSelected(undefined)
                                            formik.setFieldValue("fabricante", "")
                                        }
                                    }}
                                    onBlur={formik.handleBlur}
                                    disabled={isSubmitting}
                                />
                            </Validation>
                        </div>
                        {formik.values.nombre !== "" || typeof(itemSelected) != "undefined" ? (
                            <>
                                <div className="w-full">
                                    <Badge>Descripción</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.descripcion_corta}
                                        invalidFeedback={formik.errors.descripcion_corta}
                                    >
                                        <Input
                                            name="descripcion_corta"
                                            value={isCreating ? formik.values.descripcion_corta : itemSelected?.descripcion_corta || "Sin Descripción"}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            disabled={!isCreating || isSubmitting}
                                        />
                                    </Validation>
                                </div>
                                <div className="w-full">
                                    <Badge>Fabricante</Badge>
                                    <SelectReact
                                        name="fabricante"
                                        placeholder="Seleccione un fabricante o cree uno."
                                        isCreatable={true}
                                        isClearable={true}
                                        formatCreateLabel={(inputValue) => `Crear fabricante "${inputValue}"`}
                                        onCreateOption={(e) => {formik.setFieldValue("fabricante", e); setIsCreatingFabricante(true); setFabricanteSelected(undefined)}}
                                        onChange={(e) => {formik.setFieldValue("fabricante", e ? (e as TSelectOption).value : null); setIsCreatingFabricante(false); setFabricanteSelected((e as TSelectOption))}}
                                        value={isCreatingFabricante ? {value: formik.values.fabricante, label: formik.values.fabricante} : {value: formik.values.fabricante, label: fabricanteSelected?.label || "Sin Fabricante"}}
                                        options={optionFabricante}
                                        onBlur={formik.handleBlur}
                                        noOptionsMessage={() => "No hay opciones."}
                                        disabled={!isCreating || isSubmitting}
                                    />
                                </div>
                                <div className="w-full">
                                    <Badge>Categoria</Badge>
                                    <SelectReact
                                        name="categoria"
                                        placeholder="Seleccione una categoria o cree una."
                                        isCreatable={true}
                                        isClearable={true}
                                        formatCreateLabel={(inputValue) => `Crear categoría "${inputValue}"`}
                                        onCreateOption={(e) => {formik.setFieldValue("categoria", e); setIsCreatingCategoria(true); setCategoriaSelected(undefined)}}
                                        onChange={(e) => {formik.setFieldValue("categoria", e ? (e as TSelectOption).value : null); setIsCreatingCategoria(false); setCategoriaSelected((e as TSelectOption))}}
                                        value={isCreatingCategoria ? {value: formik.values.categoria, label: formik.values.categoria} : {value: formik.values.categoria, label: categoriaSelected?.label || "Sin Categoria"}}
                                        options={optionCategoria}
                                        onBlur={formik.handleBlur}
                                        noOptionsMessage={() => "No hay opciones."}
                                        disabled={!isCreating || isSubmitting}
                                    />
                                </div>
                                <div className="w-full">
                                    <Badge>Cantidad</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.cantidad}
                                        invalidFeedback={formik.errors.cantidad}
                                    >
                                        <Input
                                            name="cantidad"
                                            value={formik.values.cantidad}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            type="number"
                                            min={1}
                                            disabled={isSubmitting}
                                        />
                                    </Validation>
                                </div>
                                <div className="w-full">
                                    <Badge>Precio</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.precio}
                                        invalidFeedback={formik.errors.precio}
                                    >
                                        <Input
                                            name="precio"
                                            value={formik.values.precio}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            type="number"
                                            min={1}
                                            disabled={isSubmitting}
                                        />
                                    </Validation>
                                </div>
                            </>
                        ) : null}
                    </div>
                </OffCanvasBody>
                <OffCanvasFooter>
                    <OffCanvasFooterChild></OffCanvasFooterChild>
                    <OffCanvasFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button isDisable={isSubmitting} variant="solid" onClick={() => {formik.handleSubmit()}}>
                            {isSubmitting ? "Guardando..." : "Guardar"}
                        </Button>
                    </OffCanvasFooterChild>
                </OffCanvasFooter>
            </OffCanvas>
        </>
    )
}

export default OffCanvasAgregarItemsOrdenCompra
