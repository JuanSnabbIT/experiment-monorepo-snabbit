import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { useAppDispatch, useAppSelector } from "@/store"
import { listaProveedoresEmpresaThunk } from "@/store/slices/item/itemSlice"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


function CrearProveedorEmpresa() {
    const dispatch = useAppDispatch()
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const { listaComunas, listaProvincias, listaRegiones } = useAppSelector((state) => state.core)
    const [optRegiones, setOptRegiones] = useState<{value: string, label: string}[]>([])
    const [optProvincias, setOptProvincias] = useState<{value: string, label: string}[]>([])
    const [optComunas, setOptComunas] = useState<{value: string, label: string}[]>([])
    const [isOpen, setIsOpen] = useState<boolean>(false)

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: "",
            rut: "",
            direccion: "",
            region: "",
            provincia: "",
            comuna: "",
            pagina_web: "",
            telefono: "",
            ejecutivo_asignado: "",
            email_ejecutivo: "",
            catalogo_web: "",
            recargo_dolar: 0,
        },
        validationSchema: Yup.object().shape({
            nombre: Yup
                .string()
                .max(250, "El nombre no debe exceder los 250 caracteres")
                .required("El nombre es obligatorio"),
            rut: Yup
                .string()
                .max(250, "El RUT no debe exceder los 250 caracteres")
                .required("El RUT es obligatorio"),
            direccion: Yup
                .string()
                .max(250, "La dirección no debe exceder los 250 caracteres")
                .required("La dirección es obligatoria"),
            region: Yup
                .number()
                .min(1, "Selecciona una región válida")
                .required("La región es obligatoria"),
            provincia: Yup
                .number()
                .min(1, "Selecciona una provincia válida")
                .required("La provincia es obligatoria"),
            comuna: Yup
                .number()
                .min(1, "Selecciona una comuna válida")
                .required("La comuna es obligatoria"),
            pagina_web: Yup
                .string()
                .max(250, "La página web no debe exceder los 250 caracteres")
                .nullable()
                .notRequired(),
            telefono: Yup
                .string()
                .max(16, "El teléfono no debe exceder los 16 caracteres")
                .nullable()
                .notRequired(),
            ejecutivo_asignado: Yup
                .string()
                .max(64, "El nombre del ejecutivo no debe exceder los 64 caracteres")
                .nullable()
                .notRequired(),
            email_ejecutivo: Yup
                .string()
                .email("El correo del ejecutivo debe ser válido")
                .max(45, "El correo del ejecutivo no debe exceder los 45 caracteres")
                .nullable()
                .notRequired(),
            catalogo_web: Yup
                .string()
                .max(64, "El catálogo web no debe exceder los 64 caracteres")
                .nullable()
                .notRequired(),
            recargo_dolar: Yup
                .number()
                .min(-1, "Minimo 0")
                .required("Requerido")
                .nonNullable("Requerido")
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/empresas/${personalizacionUsuario?.empresa}/proveedores-empresa/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({...values, empresa: personalizacionUsuario?.empresa})})
                if (response.data) {
                    dispatch(listaProveedoresEmpresaThunk({id_empresa: personalizacionUsuario?.empresa}))
                    toast.success("Proveedor Creado", {autoClose: 1000})
                    setIsOpen(false)
                    formik.resetForm()
                }
            } catch (error: any) {
                toast.error(error.response.data)
            }
        }
    })

    useEffect(() => {
        setOptRegiones(listaRegiones.map((region) => {return {value: region.region_id.toString(), label: region.region_nombre}}))
        setOptProvincias(listaProvincias.map((provincia) => {return {value: provincia.provincia_id.toString(), label: provincia.provincia_nombre}}))
        setOptComunas(listaComunas.map((comuna) => {return {value: comuna.comuna_id.toString(), label: comuna.comuna_nombre}}))
    }, [listaComunas, listaProvincias, listaRegiones])

    useEffect(() => {
        if (formik.values.region) {
            setOptProvincias(listaProvincias.filter(provincia => provincia.provincia_region.toString() === formik.values.region).map(prov => {return {value: prov.provincia_id.toString(), label: prov.provincia_nombre}}))
            formik.setFieldValue("comuna", 0)
            formik.setFieldValue("provincia", 0)
        } else {
            setOptProvincias(listaProvincias.map((provincia) => {return {value: provincia.provincia_id.toString(), label: provincia.provincia_nombre}}))
        }
    }, [formik.values.region])

    useEffect(() => {
        if (formik.values.provincia) {
            setOptComunas(listaComunas.filter(comuna => comuna.comuna_provincia.toString() === formik.values.provincia).map(com => {return {value: com.comuna_id.toString(), label: com.comuna_nombre}}))
            formik.setFieldValue("comuna", 0)
        } else {
            setOptComunas(listaComunas.map(comuna => {return {value: comuna.comuna_id.toString(), label: comuna.comuna_nombre}}))
        }
    }, [formik.values.provincia])

    return (
        <>
            <Tooltip text="Crear Proveedor" placement="left-end">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroPlus"></Button>
            </Tooltip>
            <Modal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
            >
                <ModalHeader>
                    <Badge className="text-2xl">Crear Proveedor</Badge>
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
                                    placeholder="Ingrese un Nombre"
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.nombre}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Rut</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.rut}
                                invalidFeedback={formik.errors.rut}
                            >
                                <Input 
                                    name="rut"
                                    placeholder="Ingrese un Rut"
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.rut}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Dirección</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.direccion}
                                invalidFeedback={formik.errors.direccion}
                            >
                                <Input 
                                    name="direccion"
                                    placeholder="Ingrese una Dirección"
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.direccion}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Recargo por Dolar</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.recargo_dolar}
                                invalidFeedback={formik.errors.recargo_dolar}
                            >
                                <Input
                                    name="recargo_dolar"
                                    type="number"
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.recargo_dolar}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Region</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.region}
                                invalidFeedback={formik.errors.region}
                            >
                                <SelectReact
                                    name="region"
                                    placeholder="Seleccione una Region"
                                    noOptionsMessage={(e) => `No existe la Region ${e.inputValue}`}
                                    options={optRegiones}
                                    onChange={(e) => {formik.setFieldValue('region', (e as TSelectOption).value)}}
                                    value={{value: formik.values.region, label: optRegiones.find(region => region.value === formik.values.region)?.label || ""}}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Provincia</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.provincia}
                                invalidFeedback={formik.errors.provincia}
                            >
                                <SelectReact
                                    name="provincia"
                                    placeholder="Seleccione una Provincia"
                                    noOptionsMessage={(e) => `No existe la Provincia ${e.inputValue}`}
                                    options={optProvincias}
                                    onChange={(e) => {formik.setFieldValue('provincia', (e as TSelectOption).value)}}
                                    value={{value: formik.values.provincia, label: optProvincias.find(provincia => provincia.value === formik.values.provincia)?.label || ""}}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Comuna</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.comuna}
                                invalidFeedback={formik.errors.comuna}
                            >
                                <SelectReact
                                    name="comuna"
                                    
                                    noOptionsMessage={(e) => `No existe la Comuna ${e.inputValue}`}
                                    options={optComunas}
                                    onChange={(e) => {formik.setFieldValue('comuna', (e as TSelectOption).value)}}
                                    value={{value: formik.values.comuna, label: optComunas.find(comuna => comuna.value === formik.values.comuna)?.label || ""}}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Pagina Web</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.pagina_web}
                                invalidFeedback={formik.errors.pagina_web}
                            >
                                <Input 
                                    name="pagina_web"
                                    placeholder="Ingrese una Pagina Web"
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.pagina_web}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Telefono</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.telefono}
                                invalidFeedback={formik.errors.telefono}
                            >
                                <Input 
                                    name="telefono"
                                    placeholder="Ingrese un Telefono"
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.telefono}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Correo Ejecutivo</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.email_ejecutivo}
                                invalidFeedback={formik.errors.email_ejecutivo}
                            >
                                <Input 
                                    name="email_ejecutivo"
                                    placeholder="Ingrese el Correo del Ejecutivo"
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.email_ejecutivo}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Catalogo Web</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.catalogo_web}
                                invalidFeedback={formik.errors.catalogo_web}
                            >
                                <Input 
                                    name="catalogo_web"
                                    placeholder="Ingrese la URL del Catalogo Web"
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.catalogo_web}
                                />
                            </Validation>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false); formik.resetForm()}}>Cancelar</Button>
                        <Button variant="solid" isDisable={formik.isSubmitting} onClick={() => {formik.handleSubmit()}}>Crear</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearProveedorEmpresa



    // const formik = useFormik({
    //     enableReinitialize: true,
    //     validationSchema: Yup.object().shape({
    //         ejecutivo_asignado: Yup.string().nullable().max(64, "Maximo 64 Caracteres"),
    //         email_ejecutivo: Yup.string().email("Ingrese un Correo Valido").nullable().max(45, "Maximo 45 Caracteres"),
    //         catalogo_web: Yup.string().nullable().max(64, "Maximo 64 Caracteres"),
    //     }),
    //     initialValues: {
    //         ejecutivo_asignado: "",
    //         email_ejecutivo: "",
    //         catalogo_web: ""
    //     },
    //     onSubmit: async (values) => {
    //         try {
    //             const response = await ApiService.fetchData({url: `/api/empresas/${personalizacionUsuario?.empresa}/proveedores-empresa/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
    //                 empresa: personalizacionUsuario?.empresa,
    //                 proveedor: checked,
    //                 ...values
    //             })})
    //             if (response.data) {
    //                 toast.success("Proveedor Añadido a la Empresa")
    //                 dispatch(listaProveedoresEmpresaThunk({id_empresa: personalizacionUsuario?.empresa}))
    //                 setIsOpen(false)
    //             }
    //         } catch (error: any) {
    //             toast.error(error.response.data)
    //         }
    //     }
    // })