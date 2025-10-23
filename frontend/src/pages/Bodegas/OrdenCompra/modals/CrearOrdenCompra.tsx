import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Textarea from "@/components/form/Textarea"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { IOrdenCompra } from "@/interface/bodega.interface"
import ApiService from "@/services/ApiService"
import { useAppDispatch, useAppSelector } from "@/store"
import { listaMisOrdenesDeCompraThunk, listaOrdenesCompraThunk } from "@/store/slices/bodega/bodegaSlice"
import { usuarioEmpresaLogeadoThunk, listaMisClientesThunk, selectEmpresasThunk } from "@/store/slices/empresa/empresaSlice"
import { listaProveedoresEmpresaThunk } from "@/store/slices/item/itemSlice"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


function CrearOrdenCompra({id_empresa} : {id_empresa?: string | number | null | undefined}) {
    const dispatch = useAppDispatch()
    const { listaProveedoresEmpresa } = useAppSelector((state) => state.item)
    const { usuarioEmpresaLogeado, listaMisClientes, selectEmpresas } = useAppSelector((state) => state.empresa)
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const [optionProveedores, setOptionProveedores] = useState<{ value: string; label: string; }[]>([])
    const [optionClientes, setOptionClientes] = useState<{ value: string; label: string; }[]>([])
    const [optionsEmpresas, setOptionsEmpresas] = useState<{value: string, label: string}[]>([]);
    const [isOpen, setIsOpen] = useState<boolean>(false)

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa && isOpen) {
            dispatch(usuarioEmpresaLogeadoThunk({id_usuario: personalizacionUsuario.usuario}))
            dispatch(selectEmpresasThunk())
        }
    }, [personalizacionUsuario, isOpen])

    useEffect(() => {
        if (selectEmpresas.length > 0) {
            setOptionsEmpresas(selectEmpresas.map(emp => {return {value: emp.id.toString(), label: emp.nombre}}))
        }
    }, [selectEmpresas]);

    useEffect(() => {
        if (listaProveedoresEmpresa.length > 0) {
            setOptionProveedores(listaProveedoresEmpresa.map((pro) => {return {value: pro.id.toString(), label: pro.nombre}}))
        }
    }, [listaProveedoresEmpresa])

    useEffect(() => {
        if (!isOpen) {
            setOptionClientes([])
            setOptionProveedores([])
            setOptionsEmpresas([])
            formik.resetForm()
        }
    }, [isOpen])

    const formik = useFormik({
        enableReinitialize: true,
        // validateOnBlur: true,
        // validateOnChange: true,
        initialValues: {
            oc_empresa: "",
            oc_cliente: "",
            proveedor: "",
            observaciones: ""
        },
        validationSchema: Yup.object().shape({
            oc_empresa: Yup.string().required("Requerido"),
            oc_cliente: Yup.string().required("Requerido"),
            proveedor: Yup.string().required("Requerido"),
            observaciones: Yup.string().notRequired()
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData<IOrdenCompra, string>({url: `/api/ordenes-compra/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({...values, creado_por: usuarioEmpresaLogeado?.id})})
                if (response.data) {
                    toast.success("Orden Creada", {autoClose: 1000})
                    formik.resetForm()
                    if (id_empresa) {
                        dispatch(listaOrdenesCompraThunk({id_empresa}))
                    } else {
                        dispatch(listaMisOrdenesDeCompraThunk())
                    }
                    setIsOpen(false)
                }
            } catch (error: any) {
                toast.error(error.response.data)
            }
        }   
    })

    useEffect(() => {
        let opti: { value: string; label: string; }[] = []
        if (formik.values.oc_empresa !== "") {
            opti.push({value: formik.values.oc_empresa.toString(), label: optionsEmpresas.find(emp => emp.value === formik.values.oc_empresa)?.label || ""})
        }
        if (listaMisClientes.length > 0) {
            opti = [...opti, ...listaMisClientes.map(cli => {return {value: cli.cliente.toString(), label: cli.info_cliente.nombre}})]
        }
        setOptionClientes(opti)
    }, [listaMisClientes, formik.values.oc_empresa])

    useEffect(() => {
        if (formik.values.oc_empresa !== "") {
            dispatch(listaProveedoresEmpresaThunk({id_empresa: formik.values.oc_empresa}))
        }
    }, [formik.values.oc_empresa])

    return (
        <>
            <Tooltip text="Crear Orden de Compra">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroPlus"></Button>
            </Tooltip>
            <Modal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                isStaticBackdrop={true}
            >
                <ModalHeader>
                    <Badge className="text-xl">Crear Orden de Compra</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div className="w-full">
                            <Badge>Empresa</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.oc_empresa}
                                invalidFeedback={formik.errors.oc_empresa}
                            >
                                <SelectReact
                                    name="oc_empresa"
                                    options={optionsEmpresas}
                                    value={{value: formik.values.oc_empresa, label: optionsEmpresas.find(emp => emp.value === formik.values.oc_empresa)?.label || ""}}
                                    onBlur={formik.handleBlur}
                                    isMulti={false}
                                    isValid={formik.isValid}
                                    invalidFeedback={formik.errors.oc_empresa}
                                    isTouched={formik.touched.oc_empresa}
                                    onChange={(e) => {
                                        formik.setFieldValue("oc_empresa", (e as TSelectOption).value)
                                        formik.validateField("oc_empresa")
                                        formik.setFieldValue("oc_cliente", "")
                                        formik.validateField("oc_cliente")
                                        formik.setFieldValue("proveedor", "")
                                        formik.validateField("proveedor")
                                        dispatch(listaMisClientesThunk({id_empresa: (e as TSelectOption).value}))
                                        dispatch(listaProveedoresEmpresaThunk({id_empresa: (e as TSelectOption).value}))
                                    }}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Cliente</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.oc_cliente}
                                invalidFeedback={formik.errors.oc_cliente}
                            >
                                <SelectReact
                                    name="oc_cliente"
                                    options={optionClientes}
                                    value={{value: formik.values.oc_cliente, label: optionClientes.find(cli => cli.value.toString() === formik.values.oc_cliente)?.label || ""}}
                                    onBlur={formik.handleBlur}
                                    isMulti={false}
                                    onChange={(e) => {formik.setFieldValue("oc_cliente", (e as TSelectOption).value); formik.validateField("oc_cliente")}}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Proveedor</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.proveedor}
                                invalidFeedback={formik.errors.proveedor}
                            >
                                <SelectReact 
                                    name="proveedor"
                                    options={optionProveedores}
                                    value={{value: formik.values.proveedor, label: optionProveedores.find(pro => pro.value === formik.values.proveedor)?.label || ""}}
                                    onBlur={formik.handleBlur}
                                    isMulti={false}
                                    onChange={(e) => {formik.setFieldValue('proveedor', (e as TSelectOption).value); formik.validateField("proveedor")}}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Observaciones</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.observaciones}
                                invalidFeedback={formik.errors.observaciones}
                            >
                                <Textarea
                                    name="observaciones"
                                    rows={4}
                                    onBlur={formik.handleBlur}
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
                        <Button color="red" onClick={() => {setIsOpen(false); formik.resetForm()}}>Cancelar</Button>
                        <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Crear</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearOrdenCompra