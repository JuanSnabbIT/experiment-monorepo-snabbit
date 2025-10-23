import Input from "@/components/form/Input"
import Label from "@/components/form/Label"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import { CONDICIONES_EQUIPO, GENERACION_PROCESADOR, MARCA_EQUIPO, SISTEMA_OPERATIVO, TAMANIO_RAM, TIPO_ALMACENAMIENTO, TIPO_EQUIPO, TIPO_PROCESADOR } from "@/constants/recursos.constant"
import ApiService from "@/services/ApiService"
import { useAppDispatch, useAppSelector } from "@/store"
import { listaUsuariosTodaLaEmpresaThunk } from "@/store/slices/empresa/empresaSlice"
import { listaEquiposEmpresaThunk } from "@/store/slices/recursos/recursosSlice"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from "yup"


const validationSchema = Yup.object().shape({
    tipo_equipo: Yup
      .string()
      .oneOf(['ESCRITORIO', 'PORTATIL', 'MOVIL', 'TABLET', 'OTRO'])
      .required('El tipo de equipo es obligatorio'),

    marca: Yup
      .string()
      .oneOf(['HP', 'DELL', 'APPLE', 'LENOVO', 'ACER', 'ASUS', 'OTRA'])
      .required('La marca es obligatoria'),
  
    modelo: Yup
      .string()
      .max(100, 'El modelo no debe exceder 100 caracteres')
      .nullable(),
  
    numero_serie: Yup
      .string()
      .max(100, 'El número de serie no debe exceder 100 caracteres')
      .required('El número de serie es obligatorio'),
  
    tipo_procesador: Yup
      .string()
      .oneOf(['Intel', 'AMD', 'OTRO'])
      .required('El tipo de procesador es obligatorio'),
  
    generacion_procesador: Yup
      .string()
      .oneOf(['GEN_6', 'GEN_7', 'GEN_8', 'GEN_9', 'GEN_10', 'GEN_11', 'GEN_12', 'GEN_13', 'GEN_14', 'GEN_15', 'OTRA'])
      .required('La generación del procesador es obligatoria'),
  
    ram: Yup
      .string()
      .oneOf(['4GB', '6GB', '8GB', '12GB', '16GB', '32GB', '64GB', 'OTRA'])
      .required('La memoria RAM es obligatoria'),
  
    almacenamiento: Yup
      .string()
      .oneOf(['HDD_500GB', 'HDD_1TB', 'SSD_256GB', 'SSD_512GB', 'SSD_1TB', 'OTRO'])
      .required('El almacenamiento es obligatorio'),
  
    sistema_operativo: Yup
      .string()
      .oneOf(['WINDOWS10', 'WINDOWS11', 'UBUNTU', 'DEBIAN', 'MACOS', 'ANDROID', 'IOS', 'OTRO'])
      .required('El sistema operativo es obligatorio'),
  
    fecha_compra: Yup
      .date()
      .nullable()
      .typeError('Debe ser una fecha válida'),
  
    fecha_caducidad_garantia: Yup
      .date()
      .nullable()
      .typeError('Debe ser una fecha válida'),
  
    asignado_a: Yup
      .string()
      .nullable(),
  
    condicion_equipo: Yup
      .string()
      .oneOf(['USADO', 'NUEVO', 'REFACCIONADO', 'OTRO'])
      .required('La condición del equipo es obligatoria'),
});

function CrearEquipoAlCliente() {
    const dispatch = useAppDispatch()
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const { listaUsuariosTodaLaEmpresa } = useAppSelector((state) => state.empresa)
    const [optionsUsuarios, setOptionsUsuarios] = useState<{value: string, label: string}[]>([])
    const [isOpen, setIsOpen] = useState<boolean>(false)

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaUsuariosTodaLaEmpresaThunk({id_empresa: personalizacionUsuario.empresa}))
        }
    }, [personalizacionUsuario])

    useEffect(() => {
        if (listaUsuariosTodaLaEmpresa.length > 0) {
            setOptionsUsuarios(listaUsuariosTodaLaEmpresa.map(user => {return {value: user.id.toString(), label: user.nombre_usuario}}))
        }
    }, [listaUsuariosTodaLaEmpresa])

    const formik = useFormik({
        enableReinitialize: true,
        validationSchema,
        initialValues: {
            tipo_equipo: "ESCRITORIO",
            marca: "OTRA",
            modelo: "",
            numero_serie: "",
            tipo_procesador: "OTRO",
            generacion_procesador: "OTRA",
            ram: "OTRA",
            sistema_operativo: "OTRO",
            fecha_compra: "",
            fecha_caducidad_garantia: "",
            asignado_a: "",
            condicion_equipo: "NUEVO",
        },
        onSubmit: async (values) => {
            try {
                const data = {
                    ...values,
                    cliente: personalizacionUsuario?.empresa,
                    registrado_por: personalizacionUsuario?.usuario,
                    estado: true
                }
                const response = await ApiService.fetchData({url: `/api/equipos/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(data)})
                if (response.data) {
                    toast.success("Equipo Creado", {autoClose: 1000})
                    dispatch(listaEquiposEmpresaThunk({id_empresa: personalizacionUsuario?.empresa}))
                    setIsOpen(false)
                }
            } catch (error: any) {
                toast.error(error.response.data)
            }
        }
    })

    return (
        <>
            <Button variant="solid" onClick={() => {setIsOpen(true)}}>Crear Equipo</Button>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Equipo</Badge>
                </ModalHeader>
                <ModalBody className="grid grid-cols-2 gap-4">
                    <div className="w-full">
                        <Label htmlFor="">Numero de Serie</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.numero_serie}
                            invalidFeedback={formik.errors.numero_serie}
                        >
                            <Input
                                name="numero_serie"
                                value={formik.values.numero_serie}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div className="w-full">
                        <Label htmlFor="">Tipo</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.tipo_equipo}
                            invalidFeedback={formik.errors.tipo_equipo}
                        >
                            <SelectReact
                                name="tipo_equipo"
                                options={TIPO_EQUIPO}
                                value={{value: formik.values.tipo_equipo, label: TIPO_EQUIPO.find(equ => equ.value === formik.values.tipo_equipo)?.label || "Sin Tipo"}}
                                onChange={(e) => {formik.setFieldValue('tipo_equipo', (e as TSelectOption).value)}}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div className="w-full">
                        <Label htmlFor="">Marca</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.marca}
                            invalidFeedback={formik.errors.marca}
                        >
                            <SelectReact
                                name="marca"
                                options={MARCA_EQUIPO}
                                value={{value: formik.values.marca, label: MARCA_EQUIPO.find(equ => equ.value === formik.values.marca)?.label || "Sin Marca"}}
                                onChange={(e) => {formik.setFieldValue('marca', (e as TSelectOption).value)}}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div className="w-full">
                        <Label htmlFor="">Modelo</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.modelo}
                            invalidFeedback={formik.errors.modelo}
                        >
                            <Input
                                name="modelo"
                                value={formik.values.modelo}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div className="w-full">
                        <Label htmlFor="">Condición del Equipo</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.condicion_equipo}
                            invalidFeedback={formik.errors.condicion_equipo}
                        >
                            <SelectReact
                                name="condicion_equipo"
                                options={CONDICIONES_EQUIPO}
                                value={{value: formik.values.condicion_equipo, label: CONDICIONES_EQUIPO.find(equ => equ.value === formik.values.condicion_equipo)?.label || "Sin Condicion"}}
                                onChange={(e) => {formik.setFieldValue('condicion_equipo', (e as TSelectOption).value)}}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div className="w-full">
                        <Label htmlFor="">Tipo de Procesador</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.tipo_procesador}
                            invalidFeedback={formik.errors.tipo_procesador}
                        >
                            <SelectReact
                                name="tipo_procesador"
                                options={TIPO_PROCESADOR}
                                value={{value: formik.values.tipo_procesador, label: TIPO_PROCESADOR.find(equ => equ.value === formik.values.tipo_procesador)?.label || "Sin Tipo Procesador"}}
                                onChange={(e) => {formik.setFieldValue('tipo_procesador', (e as TSelectOption).value)}}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div className="w-full">
                        <Label htmlFor="">Generación del Procesador</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.generacion_procesador}
                            invalidFeedback={formik.errors.generacion_procesador}
                        >
                            <SelectReact
                                name="generacion_procesador"
                                options={GENERACION_PROCESADOR}
                                value={{value: formik.values.generacion_procesador, label: GENERACION_PROCESADOR.find(equ => equ.value === formik.values.generacion_procesador)?.label || "Sin Generacion"}}
                                onChange={(e) => {formik.setFieldValue('generacion_procesador', (e as TSelectOption).value)}}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div className="w-full">
                        <Label htmlFor="">Ram</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.ram}
                            invalidFeedback={formik.errors.ram}
                        >
                            <SelectReact
                                name="ram"
                                options={TAMANIO_RAM}
                                value={{value: formik.values.ram, label: TAMANIO_RAM.find(equ => equ.value === formik.values.ram)?.label || "Sin Ram"}}
                                onChange={(e) => {formik.setFieldValue('ram', (e as TSelectOption).value)}}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div className="w-full">
                        <Label htmlFor="">Sistema Operativo</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.sistema_operativo}
                            invalidFeedback={formik.errors.sistema_operativo}
                        >
                            <SelectReact
                                name="sistema_operativo"
                                options={SISTEMA_OPERATIVO}
                                value={{value: formik.values.sistema_operativo, label: SISTEMA_OPERATIVO.find(equ => equ.value === formik.values.sistema_operativo)?.label || "Sin Condicion"}}
                                onChange={(e) => {formik.setFieldValue('sistema_operativo', (e as TSelectOption).value)}}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div className="w-full">
                        <Label htmlFor="">Fecha de Compra</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.fecha_compra}
                            invalidFeedback={formik.errors.fecha_compra}
                        >
                            <Input
                                name="fecha_compra"
                                type="date"
                                value={formik.values.fecha_compra}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div className="w-full">
                        <Label htmlFor="">Fecha de Caducidad de la Garantía</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.fecha_caducidad_garantia}
                            invalidFeedback={formik.errors.fecha_caducidad_garantia}
                        >
                            <Input
                                name="fecha_caducidad_garantia"
                                type="date"
                                value={formik.values.fecha_caducidad_garantia}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                    <div className="w-full">
                        <Label htmlFor="">Asignado A</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.asignado_a}
                            invalidFeedback={formik.errors.asignado_a}
                        >
                            <SelectReact
                                name="asignado_a"
                                options={optionsUsuarios}
                                value={{value: formik.values.asignado_a, label: optionsUsuarios.find(equ => equ.value === formik.values.asignado_a)?.label || "Sin Asignacion"}}
                                onChange={(e) => {formik.setFieldValue('asignado_a', (e as TSelectOption).value)}}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                        {formik.values.asignado_a != "" && listaUsuariosTodaLaEmpresa.some(user => user.id.toString() === formik.values.asignado_a) && (
                            <div className="w-full">Nombre: {listaUsuariosTodaLaEmpresa.find(user => user.id.toString() === formik.values.asignado_a)?.nombre_usuario}, Rut: {listaUsuariosTodaLaEmpresa.find(user => user.id.toString() === formik.values.asignado_a)?.papeleta.rut}</div>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" variant="solid" onClick={() => {setIsOpen(false); formik.resetForm()}}>Cancelar</Button>
                        <Button variant="solid" isDisable={formik.isSubmitting} onClick={() => {formik.submitForm()}}>Crear</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearEquipoAlCliente