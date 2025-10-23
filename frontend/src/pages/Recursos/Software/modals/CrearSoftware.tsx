import Input from "@/components/form/Input";
import Validation from "@/components/form/Validation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal";
import Tooltip from "@/components/ui/Tooltip";
import ApiService from "@/services/ApiService";
import { listaSoftwareThunk, useAppDispatch } from "@/store"
import { useFormik } from "formik";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as Yup from 'yup'


function CrearSoftware() {
    const dispatch = useAppDispatch()
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: ""
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().required("Requerido").nonNullable("Requerido").max(100, "Maximo 100 Caracteres")
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/softwares/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({...values})})
                if (response.data) {
                    dispatch(listaSoftwareThunk())
                    setIsOpen(false)
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear el software", {toastId: "Error al crear el software"})
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
            <Tooltip text="Crear Software">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroPlus"></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Añadir Item</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="w-full">
                        <Badge>Nombre</Badge>
                        <Validation isValid={formik.isValid} isTouched={formik.touched.nombre} invalidFeedback={formik.errors.nombre}>
                            <Input name="nombre" value={formik.values.nombre} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                        </Validation>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" isDisable={formik.isSubmitting} onClick={() => {formik.handleSubmit()}}>Crear</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearSoftware