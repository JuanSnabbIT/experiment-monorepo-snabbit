import Checkbox from "@/components/form/Checkbox"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { obtenerPersonalizacionThunk, useAppDispatch, useAppSelector } from "@/store"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"


function EditarDashboardPreferences() {
    const dispatch = useAppDispatch()
    const { personalizacionUsuario, access } = useAppSelector((state) => state.auth)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            indicadores_economicos: false,
            empresa_seleccionada: false,
            actualizaciones_oc: false,
            ultimos_eventos: false
            
        },
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/personalizacion-usuarios/${personalizacionUsuario?.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                    dashboard_preferences: values
                })})
                if (response.data) {
                    toast.success("Preferencias guardadas", {autoClose: 1000})
                    dispatch(obtenerPersonalizacionThunk({access}))
                    setIsOpen(false)
                }
            } catch (error: any) {
                toast.error(error.response.data)
            }
        }
    })

    useEffect(() => {
        if (isOpen) {
            dispatch(obtenerPersonalizacionThunk({access}))
        }
    }, [isOpen])

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.dashboard_preferences) {
            Object.entries(personalizacionUsuario.dashboard_preferences).forEach(dash => {
                formik.setFieldValue(dash[0], dash[1])
            })
        }
    }, [personalizacionUsuario])

    return (
        <>
            <Tooltip text="Editar Dashboard">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroPencil"></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Editar Dashboard</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div className="w-full flex items-center gap-2">
                            Indicadores Económicos <Checkbox variant="switch" checked={formik.values.indicadores_economicos} onChange={(e) => {formik.setFieldValue("indicadores_economicos", e.target.checked)}}></Checkbox>
                        </div>
                        <div className="w-full flex items-center gap-2">
                            Empresa Seleccionada <Checkbox variant="switch" checked={formik.values.empresa_seleccionada} onChange={(e) => {formik.setFieldValue("empresa_seleccionada", e.target.checked)}}></Checkbox>
                        </div>
                        <div className="w-full flex items-center gap-2">
                            Ultimas actualizaciondes de OC <Checkbox variant="switch" checked={formik.values.actualizaciones_oc} onChange={(e) => {formik.setFieldValue("actualizaciones_oc", e.target.checked)}}></Checkbox>
                        </div>
                        <div className="w-full flex items-center gap-2">
                            Ultimos Eventos <Checkbox variant="switch" checked={formik.values.ultimos_eventos} onChange={(e) => {formik.setFieldValue("ultimos_eventos", e.target.checked)}}></Checkbox>
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

export default EditarDashboardPreferences