import Input from "@/components/form/Input"
import Label from "@/components/form/Label"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { useAppDispatch, useAppSelector } from "@/store"
import { listaBodegasThunk } from "@/store/slices/bodega/bodegaSlice"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


function CrearBodega() {
    const dispatch = useAppDispatch()
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm()
        }
    }, [isOpen])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: ""
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().max(250, "Maximo 250 Caracteres")
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/bodegas/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({...values, sucursal: personalizacionUsuario?.sucursal_principal})})
                if (response.data) {
                    toast.success("Bodega creada", {autoClose: 1000})
                    formik.resetForm()
                    setIsOpen(false)
                    dispatch(listaBodegasThunk())
                }
            } catch (error: any) {
                toast.error(error.response.data)
            }
        }
    })

    return (
        <>
            <Tooltip text="Crear Bodega">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroPlus"></Button>
            </Tooltip>
            <Modal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
            >
                <ModalHeader>
                    <Badge className="text-xl">Crear Bodega</Badge>
                </ModalHeader>
                <ModalBody>
                    <div>
                        <Badge>Nombre</Badge>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.nombre}
                            invalidFeedback={formik.errors.nombre}
                        >
                            <Input
                                id="nombre"
                                name="nombre"
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.nombre}
                            />
                        </Validation>
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

export default CrearBodega