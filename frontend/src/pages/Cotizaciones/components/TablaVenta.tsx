import Badge from "@/components/ui/Badge"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import { ICotizacion, IItemCotizacion } from "@/interface/cotizaciones.interface"
import { listaItemsEnCotizacionThunk, useAppDispatch, useAppSelector } from "@/store"
import classNames from "classnames"
import { useEffect, useState } from "react"


function TablaVenta() {
    const dispatch = useAppDispatch()
    const { detalleCotizacion, listaItemsEnCotizacion } = useAppSelector((state) => state.cotizacion)

    useEffect(() => {
        if (detalleCotizacion) {
            dispatch(listaItemsEnCotizacionThunk({id_cotizacion: detalleCotizacion.id}));
        }
    }, [detalleCotizacion])

    // Helper para determinar el sufijo según tipo_moneda
    const obtenerSufijo = () => {
      switch (detalleCotizacion?.tipo_moneda) {
        case "1": return "USD"   // daremos la etiqueta USD
        case "2": return ""      // CLP (sin sufijo, tú le pones “$” si quieres)
        case "3": return "UF"
        default: return ""
      }
    }

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className="text-xl">Cotización Final</Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className="z-0">
                <div className="overflow-auto">
                    <div className="flex flex-col gap-2 min-w-[900px]">
                        {detalleCotizacion && (
                            listaItemsEnCotizacion.length > 0 ? (
                                <>
                                    <div className={classNames(
                                        "grid gap-4",
                                        detalleCotizacion.tipo_moneda === "3" ? "grid-cols-8" : "grid-cols-7"
                                    )}>
                                        <div className="col-span-2 text-center">
                                            <Badge>Nombre</Badge>
                                        </div>
                                        <div className="col-span-1 text-center">
                                            <Badge>Cantidad</Badge>
                                        </div>
                                        <div className="col-span-1 text-center">
                                            <Badge>Valor Unit.</Badge>
                                        </div>
                                        <div className="col-span-1 text-center">
                                            <Badge>Total Neto</Badge>
                                        </div>
                                        <div className="col-span-1 text-center">
                                            <Badge>Valor Unit. USD</Badge>
                                        </div>
                                        <div className="col-span-1 text-center">
                                            <Badge>Total USD</Badge>
                                        </div>
                                        {detalleCotizacion.tipo_moneda === "3" && (
                                            <div className="col-span-1">
                                                <Badge>Total UF</Badge>
                                            </div>
                                        )}
                                    </div>
                                    {listaItemsEnCotizacion.map((item, index) => (
                                        <div key={index} className={classNames(
                                            "grid gap-4 border border-blue-500 rounded-xl text-white transition-colors",
                                            "odd:bg-sky-400 odd:hover:bg-sky-500",
                                            "even:bg-emerald-400 even:hover:bg-emerald-500",
                                            detalleCotizacion.tipo_moneda === "3" ? "grid-cols-8" : "grid-cols-7"
                                        )}>
                                            <div className="col-span-2 border-r border-r-blue-500 p-4">
                                                <div>{item.nombre_item}</div>
                                                <div className='text-xs'>{item.descripcion}</div>
                                            </div>
                                            <div className="col-span-1 border-r border-r-blue-500 p-4">
                                                {item.cantidad}
                                            </div>
                                            <div className="col-span-1 border-r border-r-blue-500 p-4">
                                                ${Number(item.precio_unitario_backend.clp.toFixed(0)).toLocaleString()}
                                            </div>
                                            <div className="col-span-1 border-r border-r-blue-500 p-4">
                                                ${Number(item.precio_total_backend.clp.toFixed(0)).toLocaleString()}
                                            </div>
                                            <div className="col-span-1 border-r border-r-blue-500 p-4">
                                                {/*Valor Unit. USD */}
                                                {item.precio_unitario_backend.usd.toLocaleString()} USD
                                            </div>
                                            <div className="col-span-1 p-4">
                                                {/* Total USD */}
                                                {item.precio_total_backend.usd.toLocaleString()} USD
                                            </div>
                                            {detalleCotizacion.tipo_moneda === "3" && (
                                                <div className="col-span-1 border-l border-l-blue-500 p-4">
                                                    {/* En UF, quizá quieres mostrar el total en UF redondeado a 2 decimales */}
                                                    {/* Ya está incluido en precio_total_backend cuando tipo_moneda==="3" */}
                                                    {item.precio_venta_neta_total_moneda_base.toLocaleString()} UF
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <div>Sin Items</div>
                            )
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}
    
export default TablaVenta

// // valor_unitario_neto
// function ValorUnitarioNeto({item, detalleCotizacion} : {item: IItemCotizacion, detalleCotizacion: ICotizacion}) {
//     const [neto, setNeto] = useState<number>(0)

//     useEffect(() => {
//         if (item.ppm > 0 && item.porcentaje_recargo) {
//             const venta_neto = Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)
//             const iva_venta = (Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)) * 0.19
//             const iva_compra = Number(item.costo_total) * 0.19
//             const ppm = venta_neto * (item.ppm / 100)
//             const total_impuesto =  iva_venta - iva_compra + ppm
//             setNeto(venta_neto + total_impuesto)
//         } else if (item.ppm > 0) {
//             const venta_neto = Number(item.costo_total)
//             const iva_venta = Number(item.costo_total) * 0.19
//             const iva_compra = Number(item.costo_total) * 0.19
//             const ppm = venta_neto * (item.ppm / 100)
//             const total_impuesto =  iva_venta - iva_compra + ppm
//             setNeto(venta_neto + total_impuesto)
//         } else if (item.porcentaje_recargo) {
//             const venta_neto = Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)
//             const iva_venta = (Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)) * 0.19
//             const iva_compra = Number(item.costo_total) * 0.19
//             const total_impuesto =  iva_venta - iva_compra
//             setNeto(venta_neto + total_impuesto)
//         } else {
//             setNeto(Number(item.costo_total))
//         }

//         if (detalleCotizacion?.tipo_moneda === "1") {
//             setNeto((prev) => (prev * (Number(detalleCotizacion.dolar_observado || 0))))
//         } else if (detalleCotizacion?.tipo_moneda === "3") {
//             setNeto((prev) => (prev * (Number(detalleCotizacion.valor_uf) || 1)))
//         }
//     }, [item, detalleCotizacion])

//     return (
//         <div>${Number((neto / item.cantidad).toFixed(0)).toLocaleString()}</div>
//     )
// }

// // valor_venta_neto_clp
// function ValorVentaNetoCLP({item, detalleCotizacion} : {item: IItemCotizacion, detalleCotizacion: ICotizacion}) {
//     const [neto, setNeto] = useState<number>(0)

//     useEffect(() => {
//         if (item.ppm > 0 && item.porcentaje_recargo) {
//             const venta_neto = Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)
//             const iva_venta = (Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)) * 0.19
//             const iva_compra = Number(item.costo_total) * 0.19
//             const ppm = venta_neto * (item.ppm / 100)
//             const total_impuesto =  iva_venta - iva_compra + ppm
//             setNeto(venta_neto + total_impuesto)
//         } else if (item.ppm > 0) {
//             const venta_neto = Number(item.costo_total)
//             const iva_venta = Number(item.costo_total) * 0.19
//             const iva_compra = Number(item.costo_total) * 0.19
//             const ppm = venta_neto * (item.ppm / 100)
//             const total_impuesto =  iva_venta - iva_compra + ppm
//             setNeto(venta_neto + total_impuesto)
//         } else if (item.porcentaje_recargo) {
//             const venta_neto = Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)
//             const iva_venta = (Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)) * 0.19
//             const iva_compra = Number(item.costo_total) * 0.19
//             const total_impuesto =  iva_venta - iva_compra
//             setNeto(venta_neto + total_impuesto)
//         } else {
//             setNeto(Number(item.costo_total))
//         }

//         if (detalleCotizacion?.tipo_moneda === "1") {
//             setNeto((prev) => (prev * (Number(detalleCotizacion.dolar_observado || 0))))
//         } else if (detalleCotizacion?.tipo_moneda === "3") {
//             setNeto((prev) => (prev * (Number(detalleCotizacion.valor_uf) || 1)))
//         }
//     }, [item, detalleCotizacion])

//     return (
//         <div>${Number(neto.toFixed(0)).toLocaleString()}</div>
//     )
// }

// // valor_unitario_neto_usd
// function ValorUnitarioNetoUSD({item, detalleCotizacion} : {item: IItemCotizacion, detalleCotizacion: ICotizacion}) {
//     const [neto, setNeto] = useState<number>(0)

//     useEffect(() => {
//         if (item.ppm > 0 && item.porcentaje_recargo) {
//             const venta_neto = Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)
//             const iva_venta = (Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)) * 0.19
//             const iva_compra = Number(item.costo_total) * 0.19
//             const ppm = venta_neto * (item.ppm / 100)
//             const total_impuesto =  iva_venta - iva_compra + ppm
//             setNeto(venta_neto + total_impuesto)
//         } else if (item.ppm > 0) {
//             const venta_neto = Number(item.costo_total)
//             const iva_venta = Number(item.costo_total) * 0.19
//             const iva_compra = Number(item.costo_total) * 0.19
//             const ppm = venta_neto * (item.ppm / 100)
//             const total_impuesto =  iva_venta - iva_compra + ppm
//             setNeto(venta_neto + total_impuesto)
//         } else if (item.porcentaje_recargo) {
//             const venta_neto = Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)
//             const iva_venta = (Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)) * 0.19
//             const iva_compra = Number(item.costo_total) * 0.19
//             const total_impuesto =  iva_venta - iva_compra
//             setNeto(venta_neto + total_impuesto)
//         } else {
//             setNeto(Number(item.costo_total))
//         }

//         if (detalleCotizacion?.tipo_moneda === "2") {
//             setNeto((prev) => (prev / (Number(detalleCotizacion.dolar_observado || 1))))
//         } else if (detalleCotizacion?.tipo_moneda === "3") {
//             setNeto((prev) => (prev * (Number(detalleCotizacion.valor_uf) || 1) / Number(detalleCotizacion.dolar_observado || 1)))
//         }
//     }, [item, detalleCotizacion])

//     return (
//         <div>{Number((neto / item.cantidad).toFixed(1)).toLocaleString()} USD</div>
//     )
// }

// // valor_venta_neto_usd
// function ValorVentaNetoUSD({item, detalleCotizacion} : {item: IItemCotizacion, detalleCotizacion: ICotizacion}) {
//     const [neto, setNeto] = useState<number>(0)

//     useEffect(() => {
//         if (item.ppm > 0 && item.porcentaje_recargo) {
//             const venta_neto = Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)
//             const iva_venta = (Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)) * 0.19
//             const iva_compra = Number(item.costo_total) * 0.19
//             const ppm = venta_neto * (item.ppm / 100)
//             const total_impuesto =  iva_venta - iva_compra + ppm
//             setNeto(venta_neto + total_impuesto)
//         } else if (item.ppm > 0) {
//             const venta_neto = Number(item.costo_total)
//             const iva_venta = Number(item.costo_total) * 0.19
//             const iva_compra = Number(item.costo_total) * 0.19
//             const ppm = venta_neto * (item.ppm / 100)
//             const total_impuesto =  iva_venta - iva_compra + ppm
//             setNeto(venta_neto + total_impuesto)
//         } else if (item.porcentaje_recargo) {
//             const venta_neto = Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)
//             const iva_venta = (Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)) * 0.19
//             const iva_compra = Number(item.costo_total) * 0.19
//             const total_impuesto =  iva_venta - iva_compra
//             setNeto(venta_neto + total_impuesto)
//         } else {
//             setNeto(Number(item.costo_total))
//         }
    
//         if (detalleCotizacion?.tipo_moneda === "2") {
//             setNeto((prev) => (prev / Number(detalleCotizacion.dolar_observado || 1)))
//         } else if (detalleCotizacion?.tipo_moneda === "3") {
//             setNeto((prev) => (prev * (Number(detalleCotizacion.valor_uf) || 1) / Number(detalleCotizacion.dolar_observado || 1)))
//         }
//     }, [item, detalleCotizacion])

//     return (
//         <div>{Number(neto.toFixed(1)).toLocaleString()} USD</div>
//     )
// }

// // valor_venta_neto_uf
// function ValorVentaNetoUF({item, detalleCotizacion} : {item: IItemCotizacion, detalleCotizacion: ICotizacion}) {
//     const [neto, setNeto] = useState<number>(0)

//     useEffect(() => {
//         if (item.ppm > 0 && item.porcentaje_recargo) {
//             const venta_neto = Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)
//             const iva_venta = (Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)) * 0.19
//             const iva_compra = Number(item.costo_total) * 0.19
//             const ppm = venta_neto * (item.ppm / 100)
//             const total_impuesto =  iva_venta - iva_compra + ppm
//             setNeto(venta_neto + total_impuesto)
//         } else if (item.ppm > 0) {
//             const venta_neto = Number(item.costo_total)
//             const iva_venta = Number(item.costo_total) * 0.19
//             const iva_compra = Number(item.costo_total) * 0.19
//             const ppm = venta_neto * (item.ppm / 100)
//             const total_impuesto =  iva_venta - iva_compra + ppm
//             setNeto(venta_neto + total_impuesto)
//         } else if (item.porcentaje_recargo) {
//             const venta_neto = Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)
//             const iva_venta = (Number(item.costo_total) * ((item.porcentaje_recargo) / 100) + Number(item.costo_total)) * 0.19
//             const iva_compra = Number(item.costo_total) * 0.19
//             const total_impuesto =  iva_venta - iva_compra
//             setNeto(venta_neto + total_impuesto)
//         } else {
//             setNeto(Number(item.costo_total))
//         }
//     }, [item, detalleCotizacion])

//     return (
//         <div>{Number(neto.toFixed(2)).toLocaleString()} UF</div>
//     )
// }