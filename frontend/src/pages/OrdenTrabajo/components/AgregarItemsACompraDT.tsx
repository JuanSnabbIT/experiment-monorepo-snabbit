import Container from "@/components/layouts/Container/Container"
import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper"
import Subheader, { SubheaderLeft, SubheaderRight } from "@/components/layouts/Subheader/Subheader"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import { detalleCompraThunk, detalleDelDetalleTrabajoThunk, detalleOrdenTrabajoThunk, listaItemsCompraThunk, useAppDispatch, useAppSelector } from "@/store"
import { useNavigate, useParams } from "react-router-dom"
import { IDetectedBarcode, Scanner } from '@yudiel/react-qr-scanner';
import { toast } from "react-toastify"
import { useEffect, useState } from "react"
import ApiService from "@/services/ApiService"
import { IItemEmpresa } from "@/interface/items.interface"
import ModalConfirmarEscaneoItemCompraDT from "../modals/ModalConfirmarEscaneoItemCompraDT"
import Tooltip from "@/components/ui/Tooltip"
import CompletarCompraDT from "../modals/CompletarCompraDT"
import { useFormik } from "formik"
import Validation from "@/components/form/Validation"
import * as Yup from "yup"
import Input from "@/components/form/Input"


function AgregarItemsACompraDT({}) {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { idOrden, idDetalle } = useParams()
    const { detalleOrdenTrabajo, detalleDelDetalleTrabajo } = useAppSelector((state) => state.ordenTrabajo)
    const { detalleCompra, listaItemsCompra } = useAppSelector((state) => state.bodega)
    const [paused, setPaused] = useState<boolean>(false)
    const [escaneado, setEscaneado] = useState<boolean>(false)
    const [abrirCamara, setAbrirCamara] = useState<boolean>(false)
    const [codigos, setCodigos] = useState<IDetectedBarcode[]>([])
    const [permissionChecked, setPermissionChecked] = useState<boolean>(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);
    const [itemEmpresa, setItemEmpresa] = useState<IItemEmpresa | undefined>()
    const [editarItem, setEditarItem] = useState<number | undefined>(undefined)

    useEffect(() => {
        async function checkCameraPermission() {
            try {
                // Intentamos solicitar acceso a la cámara
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                // Si se concede, detenemos las pistas (para evitar que la cámara quede encendida)
                stream.getTracks().forEach(track => track.stop());
                setHasCameraPermission(true);
            } catch (error) {
                // Si ocurre algún error (por ejemplo, si se niega el acceso), actualizamos el estado
                console.error('Error al obtener permisos de la cámara:', error);
                setHasCameraPermission(false);
                toast.error("No se pudo acceder a la cámara", {toastId: "No se pudo acceder a la cámara"});
            } finally {
                setPermissionChecked(true);
            }
        }
        if (abrirCamara) {
            checkCameraPermission();
        }
    }, [abrirCamara])

    useEffect(() => {
        if (idOrden && idDetalle) {
            dispatch(detalleDelDetalleTrabajoThunk({id_orden: idOrden, id_detalle: idDetalle}))
            dispatch(detalleOrdenTrabajoThunk({id_ordenTrabajo: idOrden}))
        }
    }, [idOrden, idDetalle])

    useEffect(() => {
        if (detalleDelDetalleTrabajo) {
            dispatch(detalleCompraThunk({id_compra: detalleDelDetalleTrabajo.trabajo_id}))
        }
    }, [detalleDelDetalleTrabajo])

    useEffect(() => {
        if (detalleCompra) {
            dispatch(listaItemsCompraThunk({id_compra: detalleCompra.id}))
        }
    }, [detalleCompra])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            cantidad: 0,
            precio: 0
        },
        validationSchema: Yup.object().shape({
            cantidad: Yup.number().required("Requerido").nonNullable("Requerido").min(0, "Minimo 1"),
            precio: Yup.number().required("Requerido").nonNullable("Requerido").min(0, "Minimo 1")
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/compras/${detalleCompra?.id}/items-compras/${editarItem}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(values)})
                if (response.data) {
                    toast.success("Item editado", {autoClose: 1000})
                    formik.resetForm()
                    setEditarItem(undefined)
                    dispatch(listaItemsCompraThunk({id_compra: detalleCompra?.id}))
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(" ");
                toast.error(mensajesError || "Error al editar el item", {toastId: "Error al editar el item"})
            }
        }
    })

    return (
        <PageWrapper isProtectedRoute={true} name="Agregar Item a la Compra" title="Agregar Item a la Compra">
            <Subheader>
                <SubheaderLeft>
                    <Button icon="HeroArrowLeft" onClick={() => {navigate(-1)}}></Button>
                    <Badge className="text-xl">Agregar Item a la Compra N°{detalleDelDetalleTrabajo?.trabajo_id}</Badge>
                </SubheaderLeft>
            </Subheader>
            <Container className="w-full h-[calc(100dvh-theme(spacing.16))]">
                <div className="grid grid-rows-2 lg:grid-rows-none lg:grid-cols-3 gap-4 h-full">
                    <Card className="flex flex-col h-full">
                        <CardBody className="flex-1 min-h-0">
                            {detalleOrdenTrabajo && detalleOrdenTrabajo.estado === "en_proceso" && detalleDelDetalleTrabajo && detalleDelDetalleTrabajo.estado === "en_proceso" && (
                                <>
                                    {(permissionChecked && hasCameraPermission && abrirCamara) && (
                                        <Scanner
                                            onScan={async (detectedCodes: IDetectedBarcode[]) => {
                                                if (!escaneado) {
                                                    if (detectedCodes.length > 0) {
                                                        for (const code of detectedCodes) {
                                                            if (['ean_13', 'code_128', 'code_93', 'code_39', 'upc_a', 'upc_e'].includes(code.format)) {
                                                                setPaused(true);
                                                                const response = await ApiService.fetchData<IItemEmpresa[]>({url: `/api/items-empresa/?codigo_barras=${code.rawValue}`, method: 'get'})
                                                                if (response.data) {
                                                                    if (response.data.length > 0) {
                                                                        if (listaItemsCompra.find(item => item.item === response.data[0].id)) {
                                                                            toast.error("Item ya agregado a la compra")
                                                                            setPaused(false)
                                                                        } else {
                                                                            setItemEmpresa(response.data[0])
                                                                            setEscaneado(true)  
                                                                        }
                                                                    } else {
                                                                        toast.error(`Codigo ${code.rawValue} no encontrado`)
                                                                    }
                                                                }
                                                            } else {
                                                                toast.error('Formato de código de barras no soportado');
                                                                setPaused(false)
                                                            }
                                                        }
                                                        setCodigos(detectedCodes)
                                                    } else {
                                                        setPaused(false)
                                                        toast.error('No se detectaron códigos de barras');
                                                    }
                                                }
                                            }}
                                            onError={(error) => {
                                                console.error('Error en el escáner:', error);
                                                toast.error('Error al acceder a la cámara.');
                                            }}
                                            constraints={{
                                                facingMode: 'environment',
                                                width: { ideal: 1280 },
                                                height: { ideal: 720 }
                                            }}
                                            formats={['ean_13', 'code_128', 'code_39', 'upc_a', 'upc_e']}
                                            paused={paused}
                                            allowMultiple={false}
                                            scanDelay={300}
                                            styles={{
                                                container: { width: '100%', aspectRatio: '1 / 1' },
                                                video: { width: '100%', height: '100%', objectFit: 'cover' }
                                            }}
                                            components={{ finder: false }}
                                            classNames={{ container: 'relative' }}
                                        >
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="w-[90%] h-[90%] border-4 border-red-500" />
                                            </div>
                                        </Scanner>
                                    )}
                                    {(!abrirCamara) && (
                                        <div>
                                            <Button size="lg" variant="solid" onClick={() => {setAbrirCamara(true)}}>Abrir Camara</Button>
                                        </div>
                                    )}
                                    {(permissionChecked && !hasCameraPermission) && (
                                        <div>Sin Permisos de Camara</div>
                                    )}
                                </>
                            )}
                        </CardBody>
                    </Card>

                    <Card className="flex flex-col h-full overflow-hidden lg:col-span-2">
                        <CardHeader>
                            <CardHeaderChild></CardHeaderChild>
                            <CardHeaderChild>
                                {detalleCompra && detalleDelDetalleTrabajo && detalleDelDetalleTrabajo.estado === "en_proceso" && detalleCompra.estado === "-" && (
                                    <>
                                        <Tooltip text="Agregar Item">
                                            <Button variant="solid" icon="HeroPlus" onClick={() => {setEscaneado(true)}}></Button>
                                        </Tooltip>
                                        <CompletarCompraDT />
                                    </>
                                )}
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody className="flex-1 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-10">
                                <div className="col-span-4">
                                    <Badge>Nombre</Badge>
                                </div>
                                <div className="col-span-2">
                                    <Badge>Cantidad</Badge>
                                </div>
                                <div className="col-span-2">
                                    <Badge>Precio</Badge>
                                </div>
                                <div className="col-span-2">
                                    <Badge>Acciones</Badge>
                                </div>
                            </div>
                            {listaItemsCompra.length > 0 ? (
                                listaItemsCompra.map((item, index) => (
                                    <div className="grid grid-cols-10 border border-blue-500 rounded-xl" key={index}>
                                        <div className="col-span-4 border-r border-r-blue-500 p-2">{item.nombre_item}</div>
                                        <div className="col-span-2 border-r border-r-blue-500 p-2">
                                            {editarItem === item.id ? (
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.cantidad}
                                                    invalidFeedback={formik.errors.cantidad}
                                                >
                                                    <Input
                                                        name="cantidad"
                                                        type="number"
                                                        onChange={formik.handleChange}
                                                        onBlur={formik.handleBlur}
                                                        value={formik.values.cantidad}
                                                    />
                                                </Validation>
                                            ) : (<>{item.cantidad}</>)}
                                        </div>
                                        <div className="col-span-2 border-r border-r-blue-500 p-2">
                                            {editarItem === item.id ? (
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.precio}
                                                    invalidFeedback={formik.errors.precio}
                                                >
                                                    <Input
                                                        name="precio"
                                                        type="number"
                                                        onChange={formik.handleChange}
                                                        onBlur={formik.handleBlur}
                                                        value={formik.values.precio}
                                                    />
                                                </Validation>
                                            ) : (<>${item.precio}</>)}
                                        </div>
                                        <div className="col-span-2 p-2 flex flex-wrap gap-2 items-center">
                                            {detalleCompra && detalleCompra.estado != "1" && (
                                                editarItem === item.id ? (
                                                    <>
                                                        <Button variant="solid" color="emerald" icon="HeroCheck" onClick={() => {formik.handleSubmit()}}></Button>
                                                        <Button variant="solid" color="red" icon="HeroXMark" onClick={() => {setEditarItem(undefined)}}></Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button variant="solid" icon="HeroPencil" onClick={() => {setEditarItem(item.id); formik.setValues({cantidad: item.cantidad, precio: item.precio})}}></Button>
                                                        <Button variant="solid" color="red" icon="HeroTrash" onClick={async () => {
                                                            try {
                                                                const response = await ApiService.fetchData({url: `/api/compras/${detalleCompra?.id}/items-compras/${item.id}/`, method: 'delete'})
                                                                if (response.status === 204) {
                                                                    toast.success("Item eliminado", {autoClose: 1000})
                                                                    dispatch(listaItemsCompraThunk({id_compra: detalleCompra?.id}))
                                                                }
                                                            } catch (error: any) {
                                                                const mensajesError = Object.values(error.response.data).flat().join(" ");
                                                                toast.error(mensajesError || "Error al eliminar el item de la compra", {toastId: "Error al eliminar el item de la compra"})
                                                            }
                                                        }}></Button>
                                                    </>
                                                )
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="ml-4">Sin Items</div>
                            )}
                        </CardBody>
                    </Card>

                    <ModalConfirmarEscaneoItemCompraDT 
                        isOpen={escaneado}
                        setIsOpen={setEscaneado}
                        setCodigos={setCodigos}
                        setPaused={setPaused}
                        item={itemEmpresa}
                        setItemEmpresa={setItemEmpresa}
                    />
                </div>
            </Container>
        </PageWrapper>
    )
}

export default AgregarItemsACompraDT

// content_type: detalleDelDetalleTrabajo.content_type,
// descripcion: detalleDelDetalleTrabajo.descripcion,
// estado: detalleDelDetalleTrabajo.estado,
// estado_insumo: detalleDelDetalleTrabajo.estado_insumo,
// estado_label: detalleDelDetalleTrabajo.estado_label,
// fecha_creacion: detalleDelDetalleTrabajo.fecha_creacion