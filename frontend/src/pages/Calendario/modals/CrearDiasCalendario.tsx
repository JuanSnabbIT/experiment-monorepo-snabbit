import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { listaDiasCalendarioThunk, useAppDispatch, useAppSelector } from "@/store"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"


function CrearDiasCalendario() {
    const dispatch = useAppDispatch()
    const [anioSelected, setAnioSelected] = useState<{value: string, label: string}>()
    const [isOpen, setIsOpen] = useState<boolean>(false)

    return (
        <>
            <Tooltip text="Crear Dias">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroPlus"></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Dias</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex">
                        <div className="w-full">
                            <Badge>Año</Badge>
                            <SelectReact
                                name="anio"
                                options={[
                                    {value: "2025", label: "2025"},
                                    {value: "2026", label: "2026"},
                                    {value: "2027", label: "2027"},
                                ]}
                                onChange={(e) => {setAnioSelected((e as TSelectOption))}}
                                placeholder="Seleccione un año"
                                noOptionsMessage={(e) => (`No hay ${e}`)}
                            />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}></Button>
                        <Button variant="solid" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/dias-calendario/generar_calendario_anual/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({anio: anioSelected?.value})})
                                if (response.data) {
                                    toast.success("Dias creados", {autoClose: 1000})
                                    dispatch(listaDiasCalendarioThunk())
                                    setIsOpen(false)
                                }
                            } catch (error: any) {
                                toast.error(error.response.data)
                            }
                        }}>Crear</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearDiasCalendario