import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Textarea from "@/components/form/Textarea"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { listaBodegasPorEmpresaThunk, listaTomaInventarioFiltroThunk, listaTomaInventarioThunk, useAppDispatch, useAppSelector } from "@/store"
import dayjs from "dayjs"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { MultiValue } from "react-select"
import { toast } from "react-toastify"
import * as Yup from 'yup'


interface IFormikTomaInventario {
    bodegas: {nombre: string, id: number}[]
    motivo: string
}

function CrearTomaInventario({bodegasSeleccionada, fechaInicio, fechaTermino} : {bodegasSeleccionada?: {id: number; nombre: string}[], fechaInicio?: string, fechaTermino?: string}) {
    const dispatch = useAppDispatch()
    const { listaBodegasPorEmpresa } = useAppSelector((state) => state.bodega)
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const [isOpen, setIsOpen] = useState<boolean>(false)

    useEffect(() => {
        if (isOpen && personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaBodegasPorEmpresaThunk({id_empresa: personalizacionUsuario.empresa}))
        }
        if (!isOpen) {
            formik.resetForm()
        }
    }, [isOpen, personalizacionUsuario])

    const formik = useFormik<IFormikTomaInventario>({
        enableReinitialize: true,
        initialValues: {
            bodegas: [],
            motivo: ""
        },
        validationSchema: Yup.object().shape({
            bodegas: Yup.array()
                .min(1, 'Debes seleccionar al menos una bodega')
                .required('Requerido')
                .nonNullable("Requerido"),
            motivo: Yup.string()
                .required('Requerido')
                .nonNullable("Requerido"),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/tomas-inventario/crear/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                    motivo: values.motivo,
                    bodegas: values.bodegas.map(bode => bode.id),
                    fecha_cambio: dayjs()
                })})
                if (response.data) {
                    toast.success("Toma de inventario creada", {autoClose: 1000})
                    const params = new URLSearchParams()
                    if (bodegasSeleccionada) {
                        params.append("bodegas", bodegasSeleccionada.map(bode => bode.id).toString())
                    }
                    if (fechaInicio) {
                        params.append("desde", fechaInicio)
                    }
                    if (fechaTermino) {
                        params.append("hasta", fechaTermino)
                    }
                    if (bodegasSeleccionada || fechaInicio || fechaTermino) {
                        dispatch(listaTomaInventarioFiltroThunk({filtro: params}))
                    } else {
                        dispatch(listaTomaInventarioThunk())
                    }
                    setIsOpen(false)
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear la toma de inventario")
            }
        }
    })

    return (
        <>
            <Tooltip text="Crear Toma de Inventario">
                <Button variant="solid" icon="HeroPlus" onClick={() => {setIsOpen(true)}} />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Toma de Inventario</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge>Bodegas</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={!!formik.touched.bodegas}
                                invalidFeedback={
                                    Array.isArray(formik.errors.bodegas)
                                        ? formik.errors.bodegas.join(", ")
                                        : (formik.errors.bodegas as string | undefined)
                                }
                            >
                                <SelectReact
                                    name="bodegas"
                                    isMulti={true}
                                    placeholder="Seleccione Bodegas"
                                    options={listaBodegasPorEmpresa.map(bode => ({value: bode.id.toString(), label: bode.nombre}))}
                                    noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                    onChange={(e) => {
                                        if (e) {
                                            formik.setFieldValue("bodegas", (e as MultiValue<TSelectOption>).map(value => ({nombre: value.label, id: Number(value.value)})))
                                        } else {
                                            formik.setFieldValue("bodegas", [])
                                        }
                                    }}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.bodegas.length > 0 ? formik.values.bodegas.map(bode => ({value: bode.id.toString(), label: bode.nombre})) : []}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Motivo</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.motivo}
                                invalidFeedback={formik.errors.motivo}
                            >
                                <Textarea
                                    name="motivo"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.motivo}
                                />
                            </Validation>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Crear</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearTomaInventario