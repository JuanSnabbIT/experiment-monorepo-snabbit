import Input from "@/components/form/Input"
import Validation from "@/components/form/Validation"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import { listaMisClientesThunk, listaUsuariosTodaLaEmpresaThunk, listaUsuariosTodoElClienteThunk, useAppDispatch, useAppSelector } from "@/store"
import { useFormik } from "formik"
import { toast } from "react-toastify"
import { useEffect, useState } from "react"
import * as Yup from 'yup'
import ApiService from "@/services/ApiService"
import Badge from "@/components/ui/Badge"
import { listaOrdenTrabajoThunk } from '@/store'
import SelectReact from "@/components/form/SelectReact"
import { PRIORIDAD } from "@/constants/ordentrabajo.constant"
import Textarea from "@/components/form/Textarea"
import Tooltip from "@/components/ui/Tooltip"


function CrearOrdenOT() {
    const dispatch = useAppDispatch()
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const { listaMisClientes, listaUsuariosTodaLaEmpresa, listaUsuariosTodoElCliente } = useAppSelector((state) => state.empresa)
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
            descripcion: "",
            cliente: "",
            fecha_inicio_ot: "",
            fecha_finalizacion_ot: "",
            prioridad: "",
            responsable_empresa: "",
            solicitante_empresa: "",
            notas_internas: "",
        },
        validationSchema: Yup.object().shape({
            cliente: Yup.string().required("Requerido").nonNullable("Requerido"),
            fecha_inicio_ot: Yup.date().required("Requerido").nonNullable("Requerido"),
            fecha_finalizacion_ot: Yup.date().required("Requerido").min(Yup.ref("fecha_inicio_ot"), "La fecha de fin no puede ser anterior a la fecha de inicio"),
            descripcion: Yup.string().required("Requerido").nonNullable("Requerido"),
            notas_internas: Yup.string().notRequired().nullable(),
            responsable_empresa: Yup.string().notRequired().nullable(),
            solicitante_empresa: Yup.string().notRequired().nullable(),
            prioridad: Yup.string().required("Requerido").nonNullable("Requerido")
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: '/api/ordenes-trabajo/',
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    data: JSON.stringify({
                        ...values,
                        empresa: personalizacionUsuario?.empresa
                    })
                });
                if (response.data) {
                    toast.success("Orden de Trabajo Creada", { autoClose: 1000 });
                    dispatch(listaOrdenTrabajoThunk());
                    formik.resetForm();
                    setIsOpen(false);
                } else {
                    toast.error("Error al crear la Orden de Trabajo");
                }
            } catch (error: any) {
                toast.error("Error al crear la Orden de Trabajo");
            }
        }
    })

    useEffect(() => {
        if (formik.values.cliente) {
            dispatch(listaUsuariosTodoElClienteThunk({id_empresa: formik.values.cliente}))
        }
    }, [formik.values.cliente])

    return (
        <>
            <Tooltip text="Crear Orden de Trabajo">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroPlus"></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Orden de Trabajo</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge>Descripcion</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.descripcion}
                                invalidFeedback={formik.errors.descripcion}
                            >
                                <Textarea
                                    name="descripcion"
                                    id="descripcion"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.descripcion}
                                />
                            </Validation>
                        </div>
                        <div>
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
                                    onChange={(option: any) => {formik.setFieldValue("cliente", option?.value)}}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Fecha Inicio</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.fecha_inicio_ot}
                                invalidFeedback={formik.errors.fecha_inicio_ot}
                            >
                                <Input
                                    name="fecha_inicio_ot"
                                    id="fecha_inicio_ot"
                                    type="date"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.fecha_inicio_ot}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Fecha Finalización</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.fecha_finalizacion_ot}
                                invalidFeedback={formik.errors.fecha_finalizacion_ot}
                            >
                                <Input
                                    name="fecha_finalizacion_ot"
                                    id="fecha_finalizacion_ot"
                                    type="date"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.fecha_finalizacion_ot}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Prioridad</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.prioridad}
                                invalidFeedback={formik.errors.prioridad}
                            >
                                <SelectReact
                                    name="prioridad"
                                    id="prioridad"
                                    placeholder="Seleccione una prioridad"
                                    noOptionsMessage={(e) => (`No existe ${e.inputValue}`)}
                                    options={PRIORIDAD}
                                    onBlur={formik.handleBlur}
                                    value={PRIORIDAD.find(option => option.value === formik.values.prioridad)}
                                    onChange={(option: any) => formik.setFieldValue("prioridad", option?.value)}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Responsable</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.responsable_empresa}
                                invalidFeedback={formik.errors.responsable_empresa}
                            >
                                <SelectReact
                                    name="responsable_empresa"
                                    isClearable={true}
                                    placeholder="Seleccione un responsable"
                                    noOptionsMessage={(e) => (`No existe ${e.inputValue}`)}
                                    options={listaUsuariosTodaLaEmpresa.map((user) => ({value: user.id.toString(), label: user.nombre_usuario}))}
                                    onBlur={formik.handleBlur}
                                    onChange={(e: any) => {formik.setFieldValue("responsable_empresa", e.value)}}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Solicitante</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.solicitante_empresa}
                                invalidFeedback={formik.errors.solicitante_empresa}
                            >
                                <SelectReact
                                    name="solicitante_empresa"
                                    isClearable={true}
                                    placeholder="Seleccione a un solicitante"
                                    noOptionsMessage={(e) => (`No existe ${e.inputValue}`)}
                                    options={listaUsuariosTodoElCliente.map((user) => ({value: user.id.toString(), label: user.nombre_usuario}))}
                                    onBlur={formik.handleBlur}
                                    onChange={(e: any) => {formik.setFieldValue("solicitante_empresa", e.value)}}
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

export default CrearOrdenOT
