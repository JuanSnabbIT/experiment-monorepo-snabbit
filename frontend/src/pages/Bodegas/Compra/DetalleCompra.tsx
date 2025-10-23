import SelectReact, { TSelectOption } from "@/components/form/SelectReact";
import Textarea from "@/components/form/Textarea";
import Validation from "@/components/form/Validation";
import Container from "@/components/layouts/Container/Container";
import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper";
import Subheader, { SubheaderLeft, SubheaderRight } from "@/components/layouts/Subheader/Subheader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card";
import { TIPO_COMPRA } from "@/constants/bodegas.constant";
import ApiService from "@/services/ApiService";
import { detalleCompraThunk, listaBodegasThunk, useAppDispatch, useAppSelector } from "@/store";
import { useFormik } from "formik";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import AgregarArchivoCompra from "./modals/AgregarArchivoCompra";
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Gallery } from "react-grid-gallery";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import TablaItemsCompra from "./components/TablaItemsCompra";
import * as Yup from 'yup'
import Icon from "@/components/icon/Icon";
import { getImageSize } from "@/utils/getImageSize";
import dayjs from "dayjs";
import "dayjs/locale/es"
import Tooltip from "@/components/ui/Tooltip";
import ModalEliminar from "@/pages/Items/Proveedor/modals/ModalEliminar";
import AgregarImagenCompra from "./modals/AgregarImagenCompra";


function DetalleCompra() {
    const dispatch = useAppDispatch()
    const { id } = useParams()
    const { detalleCompra, listaBodegas, listaItemsCompra } = useAppSelector((state) => state.bodega)
    const [editando, setEditando] = useState<boolean>(false)
    const [activeComponent, setActiveComponent] = useState<string>("Items")
    const [completando, setCompletando] = useState<boolean>(false)
    const [imagenesConTamanio, setImagenesConTamanio] = useState<{src: string, height: number, width: number}[]>([])
    const [index, setIndex] = useState<number>(-1)

    useEffect(() => {
        if (activeComponent === "Imagenes" || activeComponent === "Archivos") {
            dispatch(detalleCompraThunk({id_compra: id}))
        }
    }, [activeComponent])

    useEffect(() => {
        dispatch(detalleCompraThunk({id_compra: id}))
        dispatch(listaBodegasThunk())
    }, [id])

    useEffect(() => {
        if (editando && detalleCompra) {
            formik.setValues({
                observaciones: detalleCompra.observaciones,
                tipo: detalleCompra.tipo,
                bodega_temporal: typeof(detalleCompra.bodega_temporal) === "number" ? detalleCompra.bodega_temporal.toString() : "",
            })
        }
        if (!editando) {
            formik.resetForm()
        }
    }, [editando, detalleCompra])

    useEffect(() => {
        async function tamanioImagenes() {
            const imagenes: {src: string, height: number, width: number}[] = []
            detalleCompra?.archivos.filter(archivo => archivo.tipo === "2").forEach(async archivo => {
                const size = await getImageSize(archivo.imagen || "")
                imagenes.push({src: archivo.imagen || "", height: size.height, width: size.width})
            })
            setImagenesConTamanio(imagenes)
        }
        if (detalleCompra && detalleCompra.archivos.length > 0 && detalleCompra.archivos.filter(archivo => archivo.tipo === "2").length > 0) {
            tamanioImagenes()
        }
    }, [detalleCompra])

    const formik = useFormik<{tipo: string, observaciones: string, bodega_temporal: string | null}>({
        enableReinitialize: true,
        initialValues: {
            tipo: "",
            observaciones: "",
            bodega_temporal: "",
        },
        validationSchema: Yup.object().shape({
            tipo: Yup.string().nonNullable("Requerido").required("Requerido"),
            observaciones: Yup.string().nullable().notRequired(),
            bodega_temporal: Yup.string().nullable().required("Requerido"),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/compras/${detalleCompra?.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                    ...values,
                    bodega_temporal: Number(values.bodega_temporal)
                })})
                if (response.data) {
                    setEditando(false)
                    dispatch(detalleCompraThunk({id_compra: detalleCompra?.id}))
                    toast.success("Compra editada", {autoClose: 1000})
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al editar la compra", {toastId: "Error al editar la compra"})
            }
        }
    })

    return (
        <PageWrapper isProtectedRoute={true} name="Detalle Compra" title="Detalle Compra">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Detalle Compra</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    {detalleCompra && detalleCompra.estado === "-" && (
                        completando ? (
                            <>
                                <Tooltip text="Cancelar">
                                    <Button variant="solid" color="red" icon="HeroXMark" onClick={() => {setCompletando(false)}} />
                                </Tooltip>
                                <Tooltip text="Completar">
                                    <Button
                                        variant="solid"
                                        color="emerald"
                                        icon="DuoDoubleCheck"
                                        onClick={async () => {
                                            try {
                                                const response = await ApiService.fetchData({url: `/api/compras/${detalleCompra.id}/completar/`, method: 'post'})
                                                if (response.data) {
                                                    dispatch(detalleCompraThunk({id_compra: id}))
                                                    setCompletando(false)
                                                }
                                            } catch (error: any) {
                                                toast.error(error.response.data)
                                            }
                                        }}
                                        isDisable={listaItemsCompra.some(item => (item.cantidad <= 0 || item.precio <= 0 || !item.item_stock?.bodega_temporal))}
                                    />
                                </Tooltip>
                            </>
                        ) : (
                            <Tooltip text="Completar Compra">
                                <Button variant="solid" color="emerald" icon="HeroCheck" onClick={() => {setCompletando(true)}} />
                            </Tooltip>
                        )
                    )}
                </SubheaderRight>
            </Subheader>
            <Container className="w-full h-full">
                <div className="flex flex-col gap-4">
                    {completando && (
                        <Card>
                            <CardHeader>
                                <Badge className="text-xl">¿Estas seguro(a) de querer completar la compra?</Badge>
                            </CardHeader>
                            <CardBody>
                                <div>
                                    {listaItemsCompra.filter(item => !item.item_stock?.bodega_temporal).map((item, index) => (
                                        <div className="ml-4 flex flex-row items-center" key={index}><Icon icon="DuoCircle" className="mr-2" /> {item.nombre_item} no tiene una bodega asignada</div>
                                    ))}
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className="text-xl">Datos</Badge>
                            </CardHeaderChild>
                            <CardHeaderChild>
                                {detalleCompra && detalleCompra.estado === "-" && (
                                    editando ? (
                                        <>
                                            <Tooltip text="Guardar">
                                                <Button variant="solid" icon="HeroCheck" color="emerald" onClick={() => {formik.handleSubmit()}} />
                                            </Tooltip>
                                            <Tooltip text="Cancelar">
                                                <Button variant="solid" icon="HeroXMark" color="red" onClick={() => {setEditando(false)}} />
                                            </Tooltip>
                                        </>
                                    ) : (
                                        <Tooltip text="Editar">
                                            <Button variant="solid" icon="HeroPencil" onClick={() => {setEditando(true)}} />
                                        </Tooltip>
                                    )
                                )}
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            {detalleCompra ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <Badge>Codigo</Badge>
                                        <div className="ml-4">{detalleCompra.codigo}</div>
                                    </div>
                                    <div>
                                        <Badge>Tipo</Badge>
                                        {editando ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.tipo}
                                                invalidFeedback={formik.errors.tipo}
                                            >
                                                <SelectReact
                                                    name="tipo"
                                                    options={TIPO_COMPRA}
                                                    onChange={(e) => {formik.setFieldValue("tipo", (e as TSelectOption).value)}}
                                                    value={TIPO_COMPRA.find(tipo => tipo.value === formik.values.tipo)}
                                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                                    placeholder="Seleccione un Tipo"
                                                />
                                            </Validation>
                                        ) : (
                                            <div className="ml-4">{detalleCompra.tipo_label}</div>
                                        )}
                                    </div>
                                    <div>
                                        <Badge>Proveedor</Badge>
                                        <div className="ml-4">{detalleCompra.nombre_proveedor}</div>
                                    </div>
                                    <div>
                                        <Badge>Creado Por</Badge>
                                        <div className="ml-4">{detalleCompra.nombre_creado_por}</div>
                                    </div>
                                    <div>
                                        <Badge>Estado</Badge>
                                        <div className="ml-4">{detalleCompra.estado_label}</div>
                                    </div>
                                    <div>
                                        <Badge>Bodega Temporal</Badge>
                                        {editando ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.bodega_temporal}
                                                invalidFeedback={formik.errors.bodega_temporal}
                                            >
                                                <SelectReact
                                                    name="bodega_temporal"
                                                    placeholder="Seleccione una Bodega"
                                                    onChange={(e) => {formik.setFieldValue("bodega_temporal", (e as TSelectOption).value)}}
                                                    onBlur={formik.handleBlur}
                                                    options={listaBodegas.map(bode => ({value: bode.id.toString(), label: bode.nombre}))}
                                                    value={formik.values.bodega_temporal ? {value: formik.values.bodega_temporal, label: listaBodegas.find(bode => bode.id.toString() === formik.values.bodega_temporal)?.nombre || ""} : undefined}
                                                />
                                            </Validation>
                                        ) : (
                                            <div className="ml-4">{detalleCompra.nombre_bodega}</div>
                                        )}
                                    </div>
                                    <div className="col-span-full">
                                        <Badge>Observaciones</Badge>
                                        {editando ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.observaciones}
                                                invalidFeedback={formik.errors.observaciones}
                                            >
                                                <Textarea
                                                    name="observaciones"
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                    value={formik.values.observaciones}
                                                />
                                            </Validation>
                                        ) : (
                                            <div className="ml-4">{detalleCompra.observaciones}</div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div>No se encontro la compra</div>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardBody>
                            <div className="flex flex-row gap-4 overflow-auto">
                                <Button
                                    {...(activeComponent === "Items"  ? {size: 'sm', rounded: 'rounded-full', className: 'border', isActive: true,color: 'blue', colorIntensity: '500', variant: 'solid',} : {size: 'sm', color: 'zinc', rounded: 'rounded-full', className: 'border'})}
                                    onClick={() => {setActiveComponent("Items")}}>
                                    Items
                                </Button>
                                <Button
                                    {...(activeComponent === "Imagenes"  ? {size: 'sm', rounded: 'rounded-full', className: 'border', isActive: true,color: 'blue', colorIntensity: '500', variant: 'solid',} : {size: 'sm', color: 'zinc', rounded: 'rounded-full', className: 'border'})}
                                    onClick={() => {setActiveComponent("Imagenes")}}>
                                    Imagenes
                                </Button>
                                <Button
                                    {...(activeComponent === "Archivos"  ? {size: 'sm', rounded: 'rounded-full', className: 'border', isActive: true,color: 'blue', colorIntensity: '500', variant: 'solid',} : {size: 'sm', color: 'zinc', rounded: 'rounded-full', className: 'border'})}
                                    onClick={() => {setActiveComponent("Archivos")}}>
                                    Archivos
                                </Button>
                            </div>
                        </CardBody>
                    </Card>

                    {activeComponent === "Items" && (
                        <TablaItemsCompra />
                    )}

                    {activeComponent === "Imagenes" && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className="text-xl">Imagenes</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    {detalleCompra && (
                                        <AgregarImagenCompra />
                                    )}
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className="p-4 border border-blue-500 rounded-xl">
                                    {detalleCompra && detalleCompra.archivos.length > 0 && detalleCompra.archivos.filter(archivo => archivo.tipo === "2").length > 0 ? (
                                        <>
                                            <Gallery
                                                images={imagenesConTamanio}
                                                onClick={(index) => {setIndex(index)}}
                                                enableImageSelection={false}
                                                thumbnailImageComponent={(image) => (
                                                    <div className="relative h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${detalleCompra.archivos.filter(archivo => archivo.tipo === "2")[image.index].imagen})`}}>
                                                        <div className="absolute inset-0 bg-black opacity-30"></div>
                                                        <div className="absolute top-0 left-0 m-2 p-2 bg-black bg-opacity-60 text-white rounded">
                                                            <p className="font-bold">{detalleCompra.archivos.filter(archivo => archivo.tipo === "2")[image.index].nombre_creado_por}, {dayjs(detalleCompra.archivos.filter(archivo => archivo.tipo === "2")[image.index].fecha_creacion).format("DD/MM/YYYY")}</p>
                                                            <p className="mt-1">{detalleCompra.archivos.filter(archivo => archivo.tipo === "2")[image.index].opcion_label}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            />
                                            <Lightbox
                                                slides={detalleCompra.archivos.filter(archivo => archivo.tipo === "2").map(archivo => ({src: archivo.imagen || ""}))}
                                                open={index >= 0}
                                                index={index}
                                                close={() => setIndex(-1)}
                                            />
                                        </>
                                    ) : (
                                        <div>Sin Imagenes</div>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {activeComponent === "Archivos" && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className="text-xl">Archivos</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    {detalleCompra && (
                                        <AgregarArchivoCompra compra={detalleCompra} />
                                    )}
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className="flex flex-col gap-4">
                                    {detalleCompra && detalleCompra.archivos.length > 0 && detalleCompra.archivos.filter(archivo => archivo.tipo === "1").length > 0 ? detalleCompra.archivos.filter(archivo => archivo.tipo === "1").map((archivo, index) => (
                                        <Tooltip text={`
                                            Creado por: ${archivo.nombre_creado_por} el ${dayjs(archivo.fecha_creacion).locale("es").format("dddd D [de] MMMM [de] YYYY [a las] HH:mm")}
                                            Observaciones: ${archivo.observaciones}
                                        `} key={index}>
                                            <div className="p-4 grid grid-cols-12 gap-2 border border-blue-500 rounded-xl">
                                                <Badge className="col-span-10">{archivo.nombre_archivo}</Badge>
                                                <div className="col-span-2 flex flex-wrap gap-2">
                                                    <Tooltip text="Descargar">
                                                        <Button variant="solid" icon="HeroDocumentArrowDown" color="emerald" onClick={() => {window.open(`${archivo.archivo}`, "_blank")}}></Button>
                                                    </Tooltip>
                                                    <ModalEliminar
                                                        mensaje="¿Esta seguro(a) de querer eliminar el archivo?"
                                                        nombre="Archivo"
                                                        onDispatch={() => {dispatch(detalleCompraThunk({id_compra: detalleCompra.id}))}}
                                                        peticionUrl={`/api/archivos-compras/${archivo.id}/`}
                                                    ></ModalEliminar>
                                                </div>
                                            </div>
                                        </Tooltip>
                                    )) : (
                                        <div className="border border-blue-500 rounded-xl p-4">Sin Archivos</div>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </Container>
        </PageWrapper>
    )
}

export default DetalleCompra