import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import { IItemGuiaSalida } from "@/interface/bodega.interface"
import ApiService from "@/services/ApiService"
import { detalleGuiaSalidaBodegaThunk, listaItemsEnGuiaSalidaBodegaThunk, useAppDispatch, useAppSelector } from "@/store"
import { useFormik } from "formik"
import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { toast } from "react-toastify"


function AsignarNumeroDeSerie({isOpen, setIsOpen, itemRebajaSelected, setItemRebajaSelected} : {isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>>, itemRebajaSelected: IItemGuiaSalida | undefined, setItemRebajaSelected: Dispatch<SetStateAction<IItemGuiaSalida | undefined>>}) {
    const dispatch = useAppDispatch()
    const { listaComprasDeStock } = useAppSelector((state) => state.bodega)
    const [optionsNumeros, setOptionsNumeros] = useState<TSelectOption[]>([])

    useEffect(() => {
        const lista: TSelectOption[] = []
        listaComprasDeStock.forEach(stock => {
            if (stock.numeros_serie.numeros_serie && stock.numeros_serie.numeros_serie.length > 0) {
                stock.numeros_serie.numeros_serie.forEach((num) => {
                    if (num.object_id === 0 && num.modelo.length === 0) {
                        lista.push({value: num.serie, label: num.serie})
                    }
                })
            }
        })
        setOptionsNumeros(lista)
    }, [listaComprasDeStock])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            numero_serie: ""
        },
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/guia-salida/${itemRebajaSelected?.guia}/items-guia/${itemRebajaSelected?.id}/actualizar-serie/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                    serie: values.numero_serie,
                })})
                if (response.data) {
                    toast.success("Numero de serie asignado", {autoClose: 1000})
                    dispatch(listaItemsEnGuiaSalidaBodegaThunk({id_guia: itemRebajaSelected?.guia}))
                    dispatch(detalleGuiaSalidaBodegaThunk({id_guia: itemRebajaSelected?.guia}))
                    setIsOpen(false)
                    setItemRebajaSelected(undefined)
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al actualizar la serie", {toastId: "Error al actualizar la serie"})
            }
        }
    })

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <ModalHeader>
                <Badge className="text-xl">Asignar Numero de Serie</Badge>
            </ModalHeader>
            <ModalBody>
                <div className="w-full">
                    <Badge>Numero de Serie</Badge>
                    <Validation
                        isValid={formik.isValid}
                        isTouched={formik.touched.numero_serie}
                        invalidFeedback={formik.errors.numero_serie}
                    >
                        <SelectReact
                            name="numero_serie"
                            options={optionsNumeros}
                            placeholder="Seleccione un numero de serie"
                            noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                            onBlur={formik.handleBlur}
                            onChange={(e) => {formik.setFieldValue("numero_serie", (e as TSelectOption).value)}}
                        />
                    </Validation>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild></ModalFooterChild>
                <ModalFooterChild>
                    <Button color="red" onClick={() => {setIsOpen(false); setItemRebajaSelected(undefined)}}>Cancelar</Button>
                    <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Guardar</Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    )
}

export default AsignarNumeroDeSerie