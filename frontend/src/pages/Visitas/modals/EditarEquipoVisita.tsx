import Checkbox from "@/components/form/Checkbox"
import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Textarea from "@/components/form/Textarea"
import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button, { IButtonProps } from "@/components/ui/Button"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import { CONDICIONES_EQUIPO, GENERACION_PROCESADOR, MARCA_EQUIPO, MARCA_TARJETA_GRAFICA, SISTEMA_OPERATIVO, TAMANIO_RAM, TIPO_ALMACENAMIENTO, TIPO_EQUIPO, TIPO_PROCESADOR, TIPO_TARJETA_GRAFICA } from "@/constants/recursos.constant"
import ApiService from "@/services/ApiService"
import { detalleEquipoEmpresaThunk, listaContentTypeThunk, listaSoftwareDeEmpresaThunk, listaSoftwareThunk, useAppDispatch, useAppSelector } from "@/store"
import dayjs from "dayjs"
import { useFormik } from "formik"
import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from "yup"


function EditarEquipoVisita ({id_equipo, isOpen, setIsOpen} : {id_equipo: number | string | undefined, isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>>}) {
    const dispatch = useAppDispatch()
    const { detalleEquipoEmpresa, listaSoftware, listaSoftwareEmpresa } = useAppSelector((state) => state.recursos)
    const { listaContentType } = useAppSelector((state) => state.core)
    const [isEditting, setIsEditting] = useState<boolean>(false)
    const [optionsSoftware, setOptionsSoftware] = useState<{value: string, label: string, ct: number | undefined}[]>([])
    const [activeComponent, setActiveComponent] = useState<string>("Almacenamiento");

    const defaultProps: IButtonProps = {
        size: 'sm',
        color: 'zinc',
        rounded: 'rounded-full',
        className: 'border'
    };
    const activeProps: IButtonProps = {
        ...defaultProps,
        isActive: true,
        color: 'blue',
        colorIntensity: '500',
        variant: 'solid',
    };

    useEffect(() => {
        if (id_equipo && isOpen) {
            dispatch(detalleEquipoEmpresaThunk({id_equipo}))
        }
    }, [id_equipo, isOpen])

    useEffect(() => {
        if (detalleEquipoEmpresa && detalleEquipoEmpresa.cliente) {
            dispatch(listaSoftwareDeEmpresaThunk({id_empresa: detalleEquipoEmpresa.cliente}))
            dispatch(listaSoftwareThunk())
        }
    }, [detalleEquipoEmpresa])

    useEffect(() => {
        if (listaContentType.length === 0) {
            dispatch(listaContentTypeThunk())
        }
    }, [listaContentType])

    useEffect(() => {
        let lista: {value: string, label: string, ct: number | undefined}[] = []
        if (listaSoftware.length > 0) {
            lista = lista.concat(listaSoftware.map(soft => ({value: soft.id.toString(), label: soft.nombre, ct: listaContentType.find(ct => ct.model === "software")?.id})))
        }
        if (listaSoftwareEmpresa.length > 0) {
            lista = lista.concat(listaSoftwareEmpresa.map(soft => ({value: soft.id.toString(), label: soft.nombre_empresa, ct: listaContentType.find(ct => ct.model === "softwaredeempresa")?.id})))
        }
        setOptionsSoftware(lista)
    }, [listaSoftware, listaSoftwareEmpresa])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre_equipo: "",
            contraseña_administrador: "",
            // cliente  models.ForeignKey("empresas.Empresa", on_deletemodels.CASCADE, related_name'equipos_cliente', nullTrue, blankTrue)
            // registrado_por  models.ForeignKey("empresas.UsuarioEmpresa", on_deletemodels.CASCADE, related_name'equipos_registrados')
            tipo_equipo: "",
            marca: "",
            modelo: "",
            // numero_serie  models.CharField("Número de serie", max_length100, uniqueTrue)
            id_procesador: "",
            tipo_procesador: "",
            generacion_procesador: "",
            // almacenamientos  models.ManyToManyField("self", through"AlmacenamientoEquipo", blankTrue)
            ram: "",
            sistema_operativo: "",
            tipo_tarjeta_grafica: "",
            nombre_tarjeta_grafica: "",
            marca_tarjeta_grafica: "",
            // monitor  models.ManyToManyField("self", through"recursos.MonitorEquipo", blankTrue)
            fecha_compra: "",
            fecha_caducidad_garantia: "",
            condicion_equipo: "",
            // estado: "",
            // usuarios  models.ManyToManyField("self", through"recursos.UsuarioEquipo", blankTrue)
            // software_instalado  models.ManyToManyField("contenttypes.ContentType", through=SoftwareInstalado, blank=True)
        },
        validationSchema: Yup.object().shape({
            nombre_equipo: Yup.string().notRequired().nullable(),
            contraseña_administrador: Yup.string().notRequired().nullable(),
            tipo_equipo: Yup.string().required("Requerido").nonNullable("Requerido"),
            marca: Yup.string().required("Requerido").nonNullable("Requerido"),
            modelo: Yup.string().notRequired().nullable(),
            id_procesador: Yup.string().notRequired().nullable(),
            tipo_procesador: Yup.string().required("Requerido").nonNullable("Requerido"),
            generacion_procesador: Yup.string().required("Requerido").nonNullable("Requerido"),
            ram: Yup.string().required("Requerido").nonNullable("Requerido"),
            sistema_operativo: Yup.string().required("Requerido").nonNullable("Requerido"),
            tipo_tarjeta_grafica: Yup.string().required("Requerido").nonNullable("Requerido"),
            nombre_tarjeta_grafica: Yup.string().notRequired().nullable(),
            marca_tarjeta_grafica: Yup.string().required("Requerido").nonNullable("Requerido"),
            fecha_compra: Yup.string().notRequired().nullable(),
            fecha_caducidad_garantia: Yup.string().notRequired().nullable(),
            condicion_equipo: Yup.string().required("Requerido").nonNullable("Requerido")
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/equipos/${id_equipo}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                    ...values,
                    fecha_compra: values.fecha_compra.length > 0 ? values.fecha_compra : undefined,
                    fecha_caducidad_garantia: values.fecha_caducidad_garantia.length > 0 ? values.fecha_caducidad_garantia : undefined
                })})
                if (response.data) {
                    toast.success("Equipo editado", {autoClose: 1000})
                    setIsEditting(false)
                    dispatch(detalleEquipoEmpresaThunk({id_equipo}))
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al editar el equipo", {toastId: "Error al editar el equipo"})
            }
        }
    })

    const formikAlmacenamiento = useFormik({
        enableReinitialize: true,
        initialValues: {
            almacenamiento: "",
            fecha_instalacion: "",
            adicional: false,
            observaciones: "",
        },
        validationSchema: Yup.object().shape({
            almacenamiento: Yup.string().required("Requerido").nonNullable("Requerido"),
            fecha_instalacion: Yup.string().notRequired().nullable(),
            adicional: Yup.boolean().required("Requerido").nonNullable("Requerido"),
            observaciones: Yup.string().notRequired().nullable(),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/almacenamientos-equipo/`, method: "post", headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                    ...values,
                    equipo: id_equipo
                })})
                if (response.data) {
                    toast.success("Almacenamiento creado", {autoClose: 1000})
                    dispatch(detalleEquipoEmpresaThunk({id_equipo}))
                    formikAlmacenamiento.resetForm()
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear el almacenamiento", {toastId: "Error al crear el almacenamiento"})
            }
        }
    })

    const formikMonitor = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: "",
            modelo: "",
            numero_serie: "",
            accesorios: "",
            observaciones: "",
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().max(100, "Maximo 100 Caracteres").required("Requerido").nonNullable("Requerido"),
            modelo: Yup.string().max(100, "Maximo 100 Caracteres").notRequired().nullable(),
            numero_serie: Yup.string().max(100, "Maximo 100 Caracteres").notRequired().nullable(),
            accesorios: Yup.string().notRequired().nonNullable("Requerido"),
            observaciones: Yup.string().notRequired().nonNullable("Requerido")
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/monitores-equipo/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                    ...values,
                    equipo: id_equipo
                })})
                if (response.data) {
                    toast.success("Monitor creado", {autoClose: 1000})
                    dispatch(detalleEquipoEmpresaThunk({id_equipo}))
                    formikMonitor.resetForm()
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear el monitor", {toastId: "Error al crear el monitor"})
            }
        }
    })

    const formikSoftware = useFormik({
        enableReinitialize: true,
        initialValues: {
            content_type: "",
            software_id: "",
            version: "",
            clave: "",
            observaciones: "",
        },
        validationSchema: Yup.object().shape({
            content_type: Yup.string().required("Requerido").nonNullable("Requerido"),
            software_id: Yup.string().required("Requerido").nonNullable("Requerido"),
            version: Yup.string().max(20, "Maximo 20 Caracteres").notRequired().nullable(),
            clave: Yup.string().max(50, "Maximo 50 Caracteres").notRequired().nullable(),
            observaciones: Yup.string().notRequired().nonNullable("Requerido")
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/softwares-instalados/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                    ...values,
                    content_type: Number(values.content_type),
                    equipo: id_equipo
                })})
                if (response.data) {
                    toast.success("Software creado", {autoClose: 1000})
                    dispatch(detalleEquipoEmpresaThunk({id_equipo}))
                    formikSoftware.resetForm()
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear el software", {toastId: "Error al crear el software"})
            }
        }
    })

    useEffect(() => {
        if (detalleEquipoEmpresa && isEditting) {
            formik.setValues({
                condicion_equipo: detalleEquipoEmpresa.condicion_equipo,
                contraseña_administrador: detalleEquipoEmpresa.contraseña_administrador || "",
                fecha_caducidad_garantia: detalleEquipoEmpresa.fecha_caducidad_garantia || "",
                fecha_compra: detalleEquipoEmpresa.fecha_compra || "",
                generacion_procesador: detalleEquipoEmpresa.generacion_procesador,
                id_procesador: detalleEquipoEmpresa.id_procesador || "",
                marca: detalleEquipoEmpresa.marca,
                marca_tarjeta_grafica: detalleEquipoEmpresa.marca_tarjeta_grafica,
                modelo: detalleEquipoEmpresa.modelo,
                nombre_equipo: detalleEquipoEmpresa.nombre_equipo || "",
                nombre_tarjeta_grafica: detalleEquipoEmpresa.nombre_tarjeta_grafica || "",
                ram: detalleEquipoEmpresa.ram,
                sistema_operativo: detalleEquipoEmpresa.sistema_operativo,
                tipo_equipo: detalleEquipoEmpresa.tipo_equipo,
                tipo_procesador: detalleEquipoEmpresa.tipo_procesador,
                tipo_tarjeta_grafica: detalleEquipoEmpresa.tipo_tarjeta_grafica
            })
        }
    }, [detalleEquipoEmpresa, isEditting])

    useEffect(() => {
        if (!isEditting || !isOpen) {
           formikAlmacenamiento.resetForm()
           formikMonitor.resetForm()
           formikSoftware.resetForm()
        }
    }, [isEditting, isOpen])

    return (
        <>
            <Modal size={"lg"} isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Editar Equipo N°{detalleEquipoEmpresa?.numero_serie}</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        {/* Datos del Equipo */}
                        <div>
                            <Card className="border border-blue-500">
                                <CardHeader>
                                    <CardHeaderChild>
                                        <Badge className="text-xl">Datos del Equipo</Badge>
                                    </CardHeaderChild>
                                    <CardHeaderChild>
                                        {isEditting ? (
                                            <Button variant="solid" color="red" onClick={() => {setIsEditting(false)}}>Cancelar</Button>
                                        ) : (
                                            <Button variant="solid" onClick={() => {setIsEditting(true)}}>Editar</Button>
                                        )}
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    <div>
                                        <Badge>Número de Serie</Badge>
                                        <div className="ml-4">{detalleEquipoEmpresa?.numero_serie}</div>
                                    </div>
                                    <div>
                                        <Badge>Marca*</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.marca}
                                                invalidFeedback={formik.errors.marca}
                                            >
                                                <SelectReact
                                                    name="marca"
                                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                                    onBlur={formik.handleBlur}
                                                    options={MARCA_EQUIPO}
                                                    onChange={(e) => {formik.setFieldValue("marca", (e as TSelectOption).value)}}
                                                    value={{value: formik.values.marca, label: MARCA_EQUIPO.find(tg => tg.value === formik.values.marca)?.label || ""}}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.marca_label}</div>)}
                                    </div>
                                    <div>
                                        <Badge>Modelo*</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.modelo}
                                                invalidFeedback={formik.errors.modelo}
                                            >
                                                <Input
                                                    name="modelo"
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.modelo}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.modelo || "Sin Modelo"}</div>)}
                                    </div>
                                    <div>
                                        <Badge>Tipo de Equipo</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.tipo_equipo}
                                                invalidFeedback={formik.errors.tipo_equipo}
                                            >
                                                <SelectReact
                                                    name="tipo_equipo"
                                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                                    onBlur={formik.handleBlur}
                                                    options={TIPO_EQUIPO}
                                                    onChange={(e) => {formik.setFieldValue("tipo_equipo", (e as TSelectOption).value)}}
                                                    value={{value: formik.values.tipo_equipo, label: TIPO_EQUIPO.find(tg => tg.value === formik.values.tipo_equipo)?.label || ""}}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.tipo_equipo_label}</div>)}
                                    </div>
                                    <div>
                                        <Badge>Nombre del Equipo</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.nombre_equipo}
                                                invalidFeedback={formik.errors.nombre_equipo}
                                            >
                                                <Input
                                                    name="nombre_equipo"
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.nombre_equipo}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.nombre_equipo || "Sin Nombre"}</div>)}
                                    </div>
                                    <div>
                                        <Badge>Contraseña de Administrador</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.contraseña_administrador}
                                                invalidFeedback={formik.errors.contraseña_administrador}
                                            >
                                                <Input
                                                    name="contraseña_administrador"
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.contraseña_administrador}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.contraseña_administrador || "Sin Contraseña"}</div>)}
                                    </div>
                                    <div>
                                        <Badge>Condición del Equipo</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.condicion_equipo}
                                                invalidFeedback={formik.errors.condicion_equipo}
                                            >
                                                <SelectReact
                                                    name="condicion_equipo"
                                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                                    options={CONDICIONES_EQUIPO}
                                                    value={{value: formik.values.condicion_equipo, label: CONDICIONES_EQUIPO.find(ce => ce.value === formik.values.condicion_equipo)?.label || ""}}
                                                    onChange={(e) => {formik.setFieldValue("condicion_equipo", (e as TSelectOption).value)}}
                                                    onBlur={formik.handleBlur}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.condicion_equipo_label}</div>)}
                                    </div>
                                    <div>
                                        <Badge>Ram*</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.ram}
                                                invalidFeedback={formik.errors.ram}
                                            >
                                                <SelectReact
                                                    name="ram"
                                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                                    onBlur={formik.handleBlur}
                                                    options={TAMANIO_RAM}
                                                    onChange={(e) => {formik.setFieldValue("ram", (e as TSelectOption).value)}}
                                                    value={{value: formik.values.ram, label: TAMANIO_RAM.find(gp => gp.value === formik.values.ram)?.label || ""}}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.ram_label}</div>)}
                                    </div>
                                    <div>
                                        <Badge>Sistema Operativo</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.sistema_operativo}
                                                invalidFeedback={formik.errors.sistema_operativo}
                                            >
                                                <SelectReact
                                                    name="sistema_operativo"
                                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                                    onBlur={formik.handleBlur}
                                                    options={SISTEMA_OPERATIVO}
                                                    onChange={(e) => {formik.setFieldValue("sistema_operativo", (e as TSelectOption).value)}}
                                                    value={{value: formik.values.sistema_operativo, label: SISTEMA_OPERATIVO.find(gp => gp.value === formik.values.sistema_operativo)?.label || ""}}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.sistema_operativo_label}</div>)}
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                        {/* Datos del Procesador */}
                        <div>
                            <Card className="border border-blue-500">
                                <CardHeader>
                                    <Badge className="text-xl">Datos Procesador</Badge>
                                </CardHeader>
                                <CardBody className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    <div>
                                        <Badge>Generación</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.generacion_procesador}
                                                invalidFeedback={formik.errors.generacion_procesador}
                                            >
                                                <SelectReact
                                                    name="generacion_procesador"
                                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                                    onBlur={formik.handleBlur}
                                                    options={GENERACION_PROCESADOR}
                                                    onChange={(e) => { formik.setFieldValue("generacion_procesador", (e as TSelectOption).value) }}
                                                    value={{ value: formik.values.generacion_procesador, label: GENERACION_PROCESADOR.find(gp => gp.value === formik.values.generacion_procesador)?.label || "" }}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.generacion_procesador_label}</div>)}
                                    </div>
                                    <div>
                                        <Badge>Tipo*</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.tipo_procesador}
                                                invalidFeedback={formik.errors.tipo_procesador}
                                            >
                                                <SelectReact
                                                    name="tipo_procesador"
                                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                                    onBlur={formik.handleBlur}
                                                    options={TIPO_PROCESADOR}
                                                    onChange={(e) => {formik.setFieldValue("tipo_procesador", (e as TSelectOption).value)}}
                                                    value={{ value: formik.values.tipo_procesador, label: TIPO_PROCESADOR.find(gp => gp.value === formik.values.tipo_procesador)?.label || "" }}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.tipo_procesador_label}</div>)}
                                    </div>
                                    <div>
                                        <Badge>Identificador*</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.id_procesador}
                                                invalidFeedback={formik.errors.id_procesador}
                                            >
                                                <Input
                                                    name="id_procesador"
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.id_procesador}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.id_procesador || "Sin Identificador"}</div>)}
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                        {/* Datos de Tarjeta Grafica */}
                        <div>
                            <Card className="border border-blue-500">
                                <CardHeader>
                                    <Badge className="text-xl">Datos Tarjeta Gráfica</Badge>
                                </CardHeader>
                                <CardBody className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    <div>
                                        <Badge>Marca</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.marca_tarjeta_grafica}
                                                invalidFeedback={formik.errors.marca_tarjeta_grafica}
                                            >
                                                <SelectReact
                                                    name="marca_tarjeta_grafica"
                                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                                    onBlur={formik.handleBlur}
                                                    options={MARCA_TARJETA_GRAFICA}
                                                    onChange={(e) => { formik.setFieldValue("marca_tarjeta_grafica", (e as TSelectOption).value) }}
                                                    value={{ value: formik.values.marca_tarjeta_grafica, label: MARCA_TARJETA_GRAFICA.find(mt => mt.value === formik.values.marca_tarjeta_grafica)?.label || "" }}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.marca_tarjeta_grafica_label}</div>)}
                                    </div>
                                    <div>
                                        <Badge>Tipo</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.tipo_tarjeta_grafica}
                                                invalidFeedback={formik.errors.tipo_tarjeta_grafica}
                                            >
                                                <SelectReact
                                                    name="tipo_tarjeta_grafica"
                                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                                    onBlur={formik.handleBlur}
                                                    options={TIPO_TARJETA_GRAFICA}
                                                    onChange={(e) => { formik.setFieldValue("tipo_tarjeta_grafica", (e as TSelectOption).value) }}
                                                    value={{ value: formik.values.tipo_tarjeta_grafica, label: TIPO_TARJETA_GRAFICA.find(tg => tg.value === formik.values.tipo_tarjeta_grafica)?.label || "" }}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.tipo_tarjeta_grafica_label}</div>)}
                                    </div>
                                    <div>
                                        <Badge>Nombre</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.nombre_tarjeta_grafica}
                                                invalidFeedback={formik.errors.nombre_tarjeta_grafica}
                                            >
                                                <Input
                                                    name="nombre_tarjeta_grafica"
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.nombre_tarjeta_grafica}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.nombre_tarjeta_grafica || "Sin Nombre"}</div>)}
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                        {/* Fechas Importantes */}
                        <div>
                            <Card className="border border-blue-500">
                                <CardHeader>
                                    <Badge className="text-xl">Fechas Importantes</Badge>
                                </CardHeader>
                                <CardBody className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    <div>
                                        <Badge>Fecha de Compra*</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.fecha_compra}
                                                invalidFeedback={formik.errors.fecha_compra}
                                            >
                                                <Input
                                                    name="fecha_compra"
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    type="date"
                                                    value={formik.values.fecha_compra}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.fecha_compra ? dayjs(detalleEquipoEmpresa?.fecha_compra).format("DD/MM/YYYY") : "Sin Fecha de Compra"}</div>)}
                                    </div>
                                    <div>
                                        <Badge>Fecha de Caducidad de Garantia</Badge>
                                        {isEditting ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.fecha_caducidad_garantia}
                                                invalidFeedback={formik.errors.fecha_caducidad_garantia}
                                            >
                                                <Input
                                                    name="fecha_caducidad_garantia"
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    type="date"
                                                    value={formik.values.fecha_caducidad_garantia}
                                                />
                                            </Validation>
                                        ) : (<div className="ml-4">{detalleEquipoEmpresa?.fecha_caducidad_garantia ? dayjs(detalleEquipoEmpresa?.fecha_caducidad_garantia).format("DD/MM/YYYY") : "Sin Fecha de Caducidad"}</div>)}
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                        {/* TABS */}
                        <div>
                            <Card>
                                <CardBody>
                                    <div className="flex flex-row gap-4 overflow-auto">
                                        <Button
                                            {...(activeComponent === "Almacenamiento"  ? {size: 'sm', rounded: 'rounded-full', className: 'border', isActive: true,color: 'blue', colorIntensity: '500', variant: 'solid',} : {size: 'sm', color: 'zinc', rounded: 'rounded-full', className: 'border'})}
                                            onClick={() => {setActiveComponent("Almacenamiento")}}>
                                            Almacenamiento
                                        </Button>
                                        <Button
                                            {...(activeComponent === "Softwares"  ? {size: 'sm', rounded: 'rounded-full', className: 'border', isActive: true,color: 'blue', colorIntensity: '500', variant: 'solid',} : {size: 'sm', color: 'zinc', rounded: 'rounded-full', className: 'border'})}
                                            onClick={() => {setActiveComponent("Softwares")}}>
                                            Softwares
                                        </Button>
                                        <Button
                                            {...(activeComponent === "Monitores"  ? {size: 'sm', rounded: 'rounded-full', className: 'border', isActive: true,color: 'blue', colorIntensity: '500', variant: 'solid',} : {size: 'sm', color: 'zinc', rounded: 'rounded-full', className: 'border'})}
                                            onClick={() => {setActiveComponent("Monitores")}}>
                                            Monitores
                                        </Button>
                                    </div>
                                </CardBody>
                            </Card>
                            {detalleEquipoEmpresa && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {activeComponent === "Almacenamiento" && (
                                        <>
                                            <div className="col-span-full mt-4">
                                                <Badge className="text-xl">Datos Almacenamiento</Badge>
                                            </div>
                                            {detalleEquipoEmpresa && detalleEquipoEmpresa.datos_almacenamiento.length > 0 && detalleEquipoEmpresa.datos_almacenamiento.map((almacenamiento, index) => (
                                                <div className="col-span-full" key={index}>
                                                    <Card className="border border-blue-500">
                                                        {/* <CardHeader>
                                                            <Badge className="text-xl">#{almacenamiento.id}</Badge>
                                                        </CardHeader> */}
                                                        <CardBody className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                                            <div>
                                                                <Badge>Tipo</Badge>
                                                                <div className="ml-4">{almacenamiento.almacenamiento_label}</div>
                                                            </div>
                                                            <div>
                                                                <Badge>Fecha de Instalación</Badge>
                                                                <div className="ml-4">{dayjs(almacenamiento.fecha_instalacion).format("DD/MM/YYYY")}</div>
                                                            </div>
                                                            <div>
                                                                <Badge>Adicional</Badge>
                                                                <div className="ml-4">{almacenamiento.adicional ? "Si" : "No"}</div>
                                                            </div>
                                                            <div>
                                                                <Badge>Observaciones</Badge>
                                                                <div className="ml-4">{almacenamiento.observaciones || "Sin Observaciones"}</div>
                                                            </div>
                                                        </CardBody>
                                                    </Card>
                                                </div>
                                            ))}
                                            {isEditting && (
                                                <div className="col-span-full gap-4 grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                                    <div className="col-span-full">
                                                        <Badge className="text-xl">Crear Almacenamiento</Badge>
                                                    </div>
                                                    <div>
                                                        <Badge>Tipo</Badge>
                                                        <Validation
                                                            isValid={formikAlmacenamiento.isValid}
                                                            isTouched={formikAlmacenamiento.touched.almacenamiento}
                                                            invalidFeedback={formikAlmacenamiento.errors.almacenamiento}
                                                        >
                                                            <SelectReact
                                                                name="almacenamiento"
                                                                onBlur={formik.handleBlur}
                                                                options={TIPO_ALMACENAMIENTO}
                                                                value={TIPO_ALMACENAMIENTO.find(alm => alm.value === formikAlmacenamiento.values.almacenamiento)}
                                                                onChange={(e) => {formikAlmacenamiento.setFieldValue("almacenamiento", (e as TSelectOption).value)}}
                                                                noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                                                placeholder="Seleccione un Almacenamiento"
                                                            />
                                                        </Validation>
                                                    </div>
                                                    <div>
                                                        <Badge>Fecha de Instalación</Badge>
                                                        <Validation
                                                            isValid={formikAlmacenamiento.isValid}
                                                            isTouched={formikAlmacenamiento.touched.fecha_instalacion}
                                                            invalidFeedback={formikAlmacenamiento.errors.fecha_instalacion}
                                                        >
                                                            <Input
                                                                name="fecha_instalacion"
                                                                type="date"
                                                                value={formikAlmacenamiento.values.fecha_instalacion}
                                                                onBlur={formikAlmacenamiento.handleBlur}
                                                                onChange={formikAlmacenamiento.handleChange}
                                                            />
                                                        </Validation>
                                                    </div>
                                                    <div>
                                                        <Badge>Adicional</Badge>
                                                        <div className="ml-4">
                                                            <Validation
                                                                isValid={formikAlmacenamiento.isValid}
                                                                isTouched={formikAlmacenamiento.touched.adicional}
                                                                invalidFeedback={formikAlmacenamiento.errors.adicional}
                                                            >
                                                                <Checkbox
                                                                    name="adicional"
                                                                    onBlur={formikAlmacenamiento.handleBlur}
                                                                    label={formikAlmacenamiento.values.adicional ? "Si" : "No"}
                                                                    onChange={(e) => {formikAlmacenamiento.setFieldValue("adicional", e.target.checked)}}
                                                                    checked={formikAlmacenamiento.values.adicional}
                                                                />
                                                            </Validation>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Badge>Observaciones</Badge>
                                                        <Validation
                                                            isValid={formikAlmacenamiento.isValid}
                                                            isTouched={formikAlmacenamiento.touched.observaciones}
                                                            invalidFeedback={formikAlmacenamiento.errors.observaciones}
                                                        >
                                                            <Textarea
                                                                name="observaciones"
                                                                onChange={formikAlmacenamiento.handleChange}
                                                                onBlur={formikAlmacenamiento.handleBlur}
                                                                value={formikAlmacenamiento.values.observaciones}
                                                            />
                                                        </Validation>
                                                    </div>
                                                    <div className="col-span-full">
                                                        <Button variant="solid" onClick={() => {formikAlmacenamiento.handleSubmit()}}>Crear Almacenamiento</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {activeComponent === "Softwares" && (
                                        <>
                                            <div className="col-span-full mt-4">
                                                <Badge className="text-xl">Datos Software Instalado</Badge>
                                            </div>
                                            {detalleEquipoEmpresa && detalleEquipoEmpresa.datos_software.length > 0 && detalleEquipoEmpresa.datos_software.map((software, index) => (
                                                <div className="col-span-full" key={index}>
                                                    <Card className="border border-blue-500">
                                                        <CardBody className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                                            <div>
                                                                <Badge>Software</Badge>
                                                                <div className="ml-4">{software.nombre_software}</div>
                                                            </div>
                                                            <div>
                                                                <Badge>Versión</Badge>
                                                                <div className="ml-4">{software.version || "Sin Versión"}</div>
                                                            </div>
                                                            <div>
                                                                <Badge>Clave</Badge>
                                                                <div className="ml-4">{software.clave || "Sin Clave"}</div>
                                                            </div>
                                                            <div>
                                                                <Badge>Observaciones</Badge>
                                                                <div className="ml-4">{software.observaciones || "Sin Observaciones"}</div>
                                                            </div>
                                                        </CardBody>
                                                    </Card>
                                                </div>
                                            ))}
                                            {isEditting && (
                                                <div className="col-span-full gap-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                                    <div className="col-span-full">
                                                        <Badge className="text-xl">Crear Software Instalado</Badge>
                                                    </div>
                                                    <div>
                                                        <Badge>Software</Badge>
                                                        <Validation
                                                            isValid={formikSoftware.isValid}
                                                            isTouched={formikSoftware.touched.software_id}
                                                            invalidFeedback={formikSoftware.errors.software_id}
                                                        >
                                                            <SelectReact
                                                                name="software_id"
                                                                options={optionsSoftware}
                                                                placeholder="Seleccione un Software"
                                                                noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                                                onBlur={formik.handleBlur}
                                                                onChange={(e) => {
                                                                    formikSoftware.setFieldValue("software_id", (e as {value: string, label: string, ct: number | undefined}).value)
                                                                    formikSoftware.setFieldValue("content_type", (e as {value: string, label: string, ct: number | undefined}).ct?.toString())
                                                                }}
                                                            />
                                                        </Validation>
                                                    </div>
                                                    <div>
                                                        <Badge>Version</Badge>
                                                        <Validation
                                                            isValid={formikSoftware.isValid}
                                                            isTouched={formikSoftware.touched.version}
                                                            invalidFeedback={formikSoftware.errors.version}
                                                        >
                                                            <Input
                                                                name="version"
                                                                onBlur={formikSoftware.handleBlur}
                                                                onChange={formikSoftware.handleChange}
                                                                value={formikSoftware.values.version}
                                                            />
                                                        </Validation>
                                                    </div>
                                                    <div>
                                                        <Badge>Clave</Badge>
                                                        <Validation
                                                            isValid={formikSoftware.isValid}
                                                            isTouched={formikSoftware.touched.clave}
                                                            invalidFeedback={formikSoftware.errors.clave}
                                                        >
                                                            <Input
                                                                name="clave"
                                                                onBlur={formikSoftware.handleBlur}
                                                                onChange={formikSoftware.handleChange}
                                                                value={formikSoftware.values.clave}
                                                            />
                                                        </Validation>
                                                    </div>
                                                    <div>
                                                        <Badge>Observaciones</Badge>
                                                        <Validation
                                                            isValid={formikSoftware.isValid}
                                                            isTouched={formikSoftware.touched.observaciones}
                                                            invalidFeedback={formikSoftware.errors.observaciones}
                                                        >
                                                            <Textarea
                                                                name="observaciones"
                                                                onBlur={formikSoftware.handleBlur}
                                                                onChange={formikSoftware.handleChange}
                                                                value={formikSoftware.values.observaciones}
                                                            />
                                                        </Validation>
                                                    </div>
                                                    <div className="col-span-full">
                                                        <Button variant="solid" onClick={() => {formikSoftware.handleSubmit()}}>Crear Software</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {activeComponent === "Monitores" && (
                                        <>
                                            <div className="col-span-full mt-4">
                                                <Badge className="text-xl">Datos Monitores</Badge>
                                            </div>
                                            {detalleEquipoEmpresa && detalleEquipoEmpresa.datos_monitor.length > 0 && detalleEquipoEmpresa.datos_monitor.map((monitor, index) => (
                                                <div className="col-span-full" key={index}>
                                                    <Card className="border border-blue-500">
                                                        <CardBody className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                                            <div>
                                                                <Badge>Nombre</Badge>
                                                                <div className="ml-4">{monitor.nombre || "Sin Nombre"}</div>
                                                            </div>
                                                            <div>
                                                                <Badge>Modelo</Badge>
                                                                <div className="ml-4">{monitor.modelo || "Sin Modelo"}</div>
                                                            </div>
                                                            <div>
                                                                <Badge>Numero de Serie</Badge>
                                                                <div className="ml-4">{monitor.numero_serie || "Sin Numero de Serie"}</div>
                                                            </div>
                                                            <div>
                                                                <Badge>Accesorios</Badge>
                                                                <div className="ml-4">{monitor.accesorios || "Sin Accesorios"}</div>
                                                            </div>
                                                            <div>
                                                                <Badge>Observaciones</Badge>
                                                                <div className="ml-4">{monitor.observaciones || "Sin Observaciones"}</div>
                                                            </div>
                                                        </CardBody>
                                                    </Card>
                                                </div>
                                            ))}
                                            {isEditting && (
                                                <div className="col-span-full gap-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                                    <div className="col-span-full">
                                                        <Badge className="text-xl">Crear Monitor</Badge>
                                                    </div>
                                                    <div>
                                                        <Badge>Nombre</Badge>
                                                        <Validation
                                                            isValid={formikMonitor.isValid}
                                                            isTouched={formikMonitor.touched.nombre}
                                                            invalidFeedback={formikMonitor.errors.nombre}
                                                        >
                                                            <Input
                                                                name="nombre"
                                                                onBlur={formikMonitor.handleBlur}
                                                                onChange={formikMonitor.handleChange}
                                                                value={formikMonitor.values.nombre}
                                                            />
                                                        </Validation>
                                                    </div>
                                                    <div>
                                                        <Badge>Modelo</Badge>
                                                        <Validation
                                                            isValid={formikMonitor.isValid}
                                                            isTouched={formikMonitor.touched.modelo}
                                                            invalidFeedback={formikMonitor.errors.modelo}
                                                        >
                                                            <Input
                                                                name="modelo"
                                                                onBlur={formikMonitor.handleBlur}
                                                                onChange={formikMonitor.handleChange}
                                                                value={formikMonitor.values.modelo}
                                                            />
                                                        </Validation>
                                                    </div>
                                                    <div>
                                                        <Badge>Numero de Serie</Badge>
                                                        <Validation
                                                            isValid={formikMonitor.isValid}
                                                            isTouched={formikMonitor.touched.numero_serie}
                                                            invalidFeedback={formikMonitor.errors.numero_serie}
                                                        >
                                                            <Input
                                                                name="numero_serie"
                                                                onBlur={formikMonitor.handleBlur}
                                                                onChange={formikMonitor.handleChange}
                                                                value={formikMonitor.values.numero_serie}
                                                            />
                                                        </Validation>
                                                    </div>
                                                    <div>
                                                        <Badge>Accesorios</Badge>
                                                        <Validation
                                                            isValid={formikMonitor.isValid}
                                                            isTouched={formikMonitor.touched.accesorios}
                                                            invalidFeedback={formikMonitor.errors.accesorios}
                                                        >
                                                            <Input
                                                                name="accesorios"
                                                                onBlur={formikMonitor.handleBlur}
                                                                onChange={formikMonitor.handleChange}
                                                                value={formikMonitor.values.accesorios}
                                                            />
                                                        </Validation>
                                                    </div>
                                                    <div>
                                                        <Badge>Observaciones</Badge>
                                                        <Validation
                                                            isValid={formikMonitor.isValid}
                                                            isTouched={formikMonitor.touched.observaciones}
                                                            invalidFeedback={formikMonitor.errors.observaciones}
                                                        >
                                                            <Textarea
                                                                name="observaciones"
                                                                onBlur={formikMonitor.handleBlur}
                                                                onChange={formikMonitor.handleChange}
                                                                value={formikMonitor.values.observaciones}
                                                            />
                                                        </Validation>
                                                    </div>
                                                    <div className="col-span-full">
                                                        <Button variant="solid" onClick={() => {formikMonitor.handleSubmit()}}>Crear Monitor</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
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

export default EditarEquipoVisita