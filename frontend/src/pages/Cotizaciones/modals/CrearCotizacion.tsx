import Input from "@/components/form/Input"
import SelectReact from "@/components/form/SelectReact"
import Validation from "@/components/form/Validation"
import Button from "@/components/ui/Button"
import ApiService from "@/services/ApiService"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import { listaCotizacionesSucursalThunk, listaCotizacionesThunk, useAppDispatch, useAppSelector } from "@/store"
import { listaMisClientesThunk } from "@/store/slices/empresa/empresaSlice"
import { useFormik } from "formik"
import { toast } from "react-toastify"
import { useState, useEffect } from "react"
import * as Yup from 'yup'
import { TIPO_MONEDA } from "@/constants/cotizacion.constant"
import Badge from "@/components/ui/Badge"
import Textarea from "@/components/form/Textarea"
import Tooltip from "@/components/ui/Tooltip"


function CrearCotizacion({empresa} : {empresa: boolean}) {
    const dispatch = useAppDispatch()
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const { listaMisClientes } = useAppSelector((state) => state.empresa)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa && isOpen) {
            dispatch(listaMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }))
        }
    }, [personalizacionUsuario, isOpen])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: "",
            cliente: "",
            descripcion: "",
            observaciones: "",
            tipo_moneda: "",
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().required("Requerido").nonNullable("Requerido"),
            cliente: Yup.string().required("Requerido").nonNullable("Requerido"),
            descripcion: Yup.string().notRequired().nullable(),
            observaciones: Yup.string().notRequired().nullable(),
            tipo_moneda: Yup.string().required("Requerido").nonNullable("Requerido"),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: '/api/cotizaciones/',
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    data: JSON.stringify({...values, empresa: personalizacionUsuario?.empresa})
                });
                if (response.data) {
                    toast.success("Cotización creada", {autoClose: 1000});
                    if (empresa) {
                        dispatch(listaCotizacionesSucursalThunk())
                    } else {
                        dispatch(listaCotizacionesThunk());
                    }
                    formik.resetForm();
                    setIsOpen(false);
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(" ");
                toast.error(mensajesError || "Error al crear la cotización", {toastId: "Error al crear la cotización"})
            }
        }
    })

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm()
        }
    }, [isOpen])

    return (
        <>
            <Tooltip text="Añadir cotización">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroPlus"></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Cotización</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div className="w-full">
                            <Badge>Nombre</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.nombre}
                                invalidFeedback={formik.errors.nombre}
                            >
                                <Input
                                    name="nombre"
                                    value={formik.values.nombre}
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Cliente</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cliente}
                                invalidFeedback={formik.errors.cliente}
                            >
                                <SelectReact
                                    name="cliente"
                                    id="cliente"
                                    placeholder="Seleccione un Cliente"
                                    noOptionsMessage={(e) => (`No existe ${e.inputValue}`)}
                                    options={listaMisClientes.map(cliente => ({ value: cliente.info_cliente.id.toString(), label: cliente.info_cliente.nombre }))}
                                    onBlur={formik.handleBlur}
                                    value={listaMisClientes.map(cliente => ({ value: cliente.info_cliente.id.toString(), label: cliente.info_cliente.nombre })).find(option => option.value === formik.values.cliente)}
                                    onChange={(option: any) => formik.setFieldValue("cliente", option?.value)}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Tipo de Moneda</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.tipo_moneda}
                                invalidFeedback={formik.errors.tipo_moneda}
                            >
                                <SelectReact
                                    name="tipo_moneda"
                                    id="tipo_moneda"
                                    options={TIPO_MONEDA}
                                    placeholder="Seleccione un tipo de moneda"
                                    noOptionsMessage={(e) => (`No existe ${e.inputValue}`)}
                                    onBlur={formik.handleBlur}
                                    value={TIPO_MONEDA.find(option => option.value === formik.values.tipo_moneda)}
                                    onChange={(option: any) => formik.setFieldValue("tipo_moneda", option?.value)}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Descripción</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.descripcion}
                                invalidFeedback={formik.errors.descripcion}
                            >
                                <Textarea
                                    name="descripcion"
                                    value={formik.values.descripcion}
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
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
                                    value={formik.values.observaciones}
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                />
                            </Validation>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red' onClick={() => {setIsOpen(false); formik.resetForm()}}>Cancelar</Button>
                        <Button variant='solid' onClick={() => {formik.handleSubmit()}}>Crear</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearCotizacion
