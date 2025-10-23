import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Textarea from "@/components/form/Textarea"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { TIPO_COMPRA } from "@/constants/bodegas.constant"
import { IProveedorEmpresa } from "@/interface/items.interface"
import ApiService from "@/services/ApiService"
import { listaBodegasThunk, listaComprasThunk, listaProveedoresEmpresaThunk, useAppDispatch, useAppSelector } from "@/store"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


function CrearCompra() {
    const dispatch = useAppDispatch()
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const { listaProveedoresEmpresa } = useAppSelector((state) => state.item)
    const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa)
    const { listaBodegas } = useAppSelector((state) => state.bodega)
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isCreandoProveedor, setIsCreandoProveedor] = useState<boolean>(false)

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            tipo: "",
            proveedor: "",
            rut: "",
            observaciones: "",
            bodega_temporal: "",
        },
        validationSchema: Yup.object().shape({
            tipo: Yup.string().nonNullable("Requerido").required("Requerido"),
            proveedor: Yup.string().nonNullable("Requerido").required("Requerido"),
            observaciones: Yup.string().nullable().notRequired(),
            bodega_temporal: Yup.string().nonNullable("Requerido").required("Requerido"),
        }),
        onSubmit: async (values) => {
            try {
                if (isCreandoProveedor) {
                    const responseProveedor = await ApiService.fetchData<IProveedorEmpresa, string>({url: `/api/proveedores-empresa/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                        rut: values.rut,
                        nombre: values.proveedor,
                        empresa: personalizacionUsuario?.empresa,
                    })})
                    if (responseProveedor.data) {
                        const response = await ApiService.fetchData({url: `/api/compras/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                            tipo: values.tipo,
                            observaciones: values.observaciones,
                            bodega_temporal: values.bodega_temporal,
                            proveedor: responseProveedor.data.id,
                            sucursal: personalizacionUsuario?.sucursal_principal,
                            creado_por: usuarioEmpresaLogeado?.id,
                        })})
                        if (response.data) {
                            toast.success("Compra creada", {autoClose: 1000})
                            setIsOpen(false)
                            dispatch(listaComprasThunk())
                        }
                    }
                } else {
                    const response = await ApiService.fetchData({url: `/api/compras/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                        tipo: values.tipo,
                        observaciones: values.observaciones,
                        bodega_temporal: values.bodega_temporal,
                        proveedor: values.proveedor,
                        sucursal: personalizacionUsuario?.sucursal_principal,
                        creado_por: usuarioEmpresaLogeado?.id,
                    })})
                    if (response.data) {
                        toast.success("Compra creada", {autoClose: 1000})
                        setIsOpen(false)
                        dispatch(listaComprasThunk())
                    }
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear la compra", {toastId: "Error al crear la compra"})
            }
        }
    })

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa && isOpen) {
            dispatch(listaProveedoresEmpresaThunk({id_empresa: personalizacionUsuario.empresa}))
            dispatch(listaBodegasThunk())
        }
        if (!isOpen) {
            formik.resetForm()
            setIsCreandoProveedor(false)
        }
    }, [personalizacionUsuario, isOpen])

    return (
        <>
            <Tooltip text="Crear Compra">
                <Button variant="solid" icon="HeroPlus" onClick={() => {setIsOpen(true)}}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Compra</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge>Tipo</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.tipo}
                                invalidFeedback={formik.errors.tipo}
                            >
                                <SelectReact
                                    name="tipo"
                                    options={TIPO_COMPRA}
                                    value={{value: formik.values.tipo, label: TIPO_COMPRA.find(tipo => tipo.value === formik.values.tipo)?.label || ""}}
                                    onChange={(e) => {formik.setFieldValue('tipo', (e as TSelectOption).value)}}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Proveedor</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.proveedor}
                                invalidFeedback={formik.errors.proveedor}
                            >
                                <SelectReact
                                    name="proveedor"
                                    isCreatable
                                    isClearable
                                    formatCreateLabel={(e) => (`Crear ${e}`)}
                                    onCreateOption={(e) => {
                                        if (e) {
                                            formik.setFieldValue("proveedor", e)
                                            setIsCreandoProveedor(true)
                                        } else {
                                            formik.setFieldValue("proveedor", "")
                                            formik.setFieldValue("rut", "")
                                            setIsCreandoProveedor(false)
                                        }
                                    }}
                                    placeholder="Seleccione un proveedor o cree uno"
                                    options={listaProveedoresEmpresa.map(prov => ({value: prov.id.toString(), label: prov.nombre}))}
                                    onChange={(e) => {
                                        if (e) {
                                            formik.setFieldValue("proveedor", (e as TSelectOption).value)
                                            formik.setFieldValue("rut", "")
                                            setIsCreandoProveedor(false)
                                        } else {
                                            formik.setFieldValue("proveedor", "")
                                            formik.setFieldValue("rut", "")
                                            setIsCreandoProveedor(false)
                                        }
                                    }}
                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                    value={isCreandoProveedor ? {value: formik.values.proveedor, label: formik.values.proveedor} : {value: formik.values.proveedor, label: listaProveedoresEmpresa.find(prov => prov.id.toString() === formik.values.proveedor)?.nombre || ""}}
                                />
                            </Validation>
                        </div>
                        {isCreandoProveedor && (
                            <div>
                                <Badge>Rut del Proveedor</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.rut}
                                    invalidFeedback={formik.errors.rut}
                                >
                                    <Input
                                        name="rut"
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.rut}
                                    />
                                </Validation>
                            </div>
                        )}
                        <div>
                            <Badge>Bodega Temporal</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.bodega_temporal}
                                invalidFeedback={formik.errors.bodega_temporal}
                            >
                                <SelectReact
                                    name="bodega_temporal"
                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                    options={listaBodegas.map(bode => ({value: bode.id.toString(), label: bode.nombre}))}
                                    value={{value: formik.values.bodega_temporal, label: listaBodegas.find(bode => bode.id.toString() === formik.values.bodega_temporal)?.nombre || ""}}
                                    onChange={(e) => {formik.setFieldValue("bodega_temporal", (e as TSelectOption).value)}}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Observaciones</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.observaciones}
                                invalidFeedback={formik.errors.observaciones}
                            >
                                <Textarea
                                    name="observaciones"
                                    onChange={formik.handleChange}
                                    value={formik.values.observaciones}
                                />
                            </Validation>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Guardar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearCompra