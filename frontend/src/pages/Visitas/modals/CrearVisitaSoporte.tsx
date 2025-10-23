import SelectReact from "@/components/form/SelectReact"
import Textarea from "@/components/form/Textarea"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { listaMisClientesThunk, listaUsuariosTodaLaEmpresaThunk, listaUsuariosTodoElClienteThunk, listaVisitasSoporteThunk, useAppDispatch, useAppSelector } from "@/store"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'

function CrearVisitaSoporte() {
    const dispatch = useAppDispatch()
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const { listaMisClientes } = useAppSelector((state) => state.empresa)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa && isOpen) {
            dispatch(listaMisClientesThunk({id_empresa: personalizacionUsuario.empresa}))
            dispatch(listaUsuariosTodaLaEmpresaThunk({id_empresa: personalizacionUsuario.empresa}))
        }
    }, [personalizacionUsuario, isOpen])

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm()
        }
    }, [isOpen])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            descripcion_servicio: "",
            cliente: "",
        },
        validationSchema: Yup.object().shape({
            descripcion_servicio: Yup.string().required("Requerido").nullable(),
            cliente: Yup.string().required("Requerido").nullable(),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: '/api/visitas-soporte/',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        ...values,
                        empresa: personalizacionUsuario?.empresa
                    })
                });
                if (response.data) {
                    toast.success("Visita de Soporte Creada", { autoClose: 1000 });
                    dispatch(listaVisitasSoporteThunk())
                    formik.resetForm();
                    setIsOpen(false);
                } else {
                    toast.error("Error al crear la Visita de Soporte");
                }
            } catch (error: any) {
                toast.error("Error al crear la Visita de Soporte");
            }
        }
    })

    useEffect(() => {
        if (formik.values.cliente) {
            dispatch(listaUsuariosTodoElClienteThunk({ id_empresa: formik.values.cliente }))
        }
    }, [formik.values.cliente])

    return (
        <>
            <Tooltip text="Crear Asistencia Técnica">
                <Button variant="solid" icon="HeroPlus" onClick={() => { setIsOpen(true) }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Asistencia Técnica</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge>Cliente</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cliente}
                                invalidFeedback={formik.errors.cliente}
                            >
                                <SelectReact
                                    name="cliente"
                                    placeholder="Seleccione un Cliente"
                                    noOptionsMessage={(e) => (`No existe ${e.inputValue}`)}
                                    options={listaMisClientes.map(cliente => ({ value: cliente.info_cliente.id.toString(), label: cliente.info_cliente.nombre }))}
                                    onBlur={formik.handleBlur}
                                    value={listaMisClientes.map(cliente => ({ value: cliente.info_cliente.id.toString(), label: cliente.info_cliente.nombre })).find(option => option.value === formik.values.cliente)}
                                    onChange={(option: any) => { formik.setFieldValue("cliente", option?.value) }}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Descripción del Servicio</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.descripcion_servicio}
                                invalidFeedback={formik.errors.descripcion_servicio}
                            >
                                <Textarea
                                    name="descripcion_servicio"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.descripcion_servicio}
                                />
                            </Validation>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false); formik.resetForm()}}>Cancelar</Button>
                        <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Guardar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearVisitaSoporte
