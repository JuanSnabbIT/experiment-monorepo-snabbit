import Badge from "@/components/ui/Badge"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import { listaItemsEnTomaInventarioThunk, useAppDispatch, useAppSelector } from "@/store"
import { useEffect } from "react"


function TablaItemsEnTomaDeInventario() {
    const dispatch = useAppDispatch()
    const { detalleTomaInventario, listaItemsEnTomaInventario } = useAppSelector((state) => state.bodega)

    useEffect(() => {
        if (detalleTomaInventario) {
            dispatch(listaItemsEnTomaInventarioThunk({id_toma: detalleTomaInventario.id}))
        }
    }, [detalleTomaInventario])

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className="text-xl">Items</Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className="z-0">
                <div className="overflow-auto">
                    {listaItemsEnTomaInventario.length > 0 ? (
                        <div className="flex flex-col gap-4 min-w-[800px]">
                            <div className="grid grid-cols-10 gap-4 text-center items-center">
                                <div className="col-span-2">
                                    <Badge>Nombre</Badge>
                                </div>
                                <div className="col-span-2">
                                    <Badge>Cantidad Esperada</Badge>
                                </div>
                                <div className="col-span-2">
                                    <Badge>Cantidad Encontrada</Badge>
                                </div>
                                <div className="col-span-2">
                                    <Badge>Estado</Badge>
                                </div>
                                <div className="col-span-2">
                                    <Badge>Observaciones</Badge>
                                </div>
                                {/* <div className="col-span-2">
                                    <Badge>Acciones</Badge>
                                </div> */}
                            </div>
                            {listaItemsEnTomaInventario.map((item, index) => (
                                <div className="grid grid-cols-5 gap-4 border border-blue-500 rounded-xl" key={index}>
                                    <div className="border-r border-r-blue-500 p-4">{item.nombre_item}</div>
                                    <div className="border-r border-r-blue-500 p-4">{item.cantidad_original}</div>
                                    <div className="border-r border-r-blue-500 p-4">{item.cantidad_encontrada}</div>
                                    <div className="border-r border-r-blue-500 p-4">{item.estado_label}</div>
                                    <div className="border-r border-r-blue-500 p-4">{item.observaciones || "Sin Observaciones"}</div>
                                    {/* <div className="p-4">
                                        {item.estado === "por_inventariar" && (
                                            <TomarInventarioDelItem  />
                                        )}
                                    </div> */}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="ml-4">Sin Items</div>
                    )}
                </div>
            </CardBody>
        </Card>
    )
}

export default TablaItemsEnTomaDeInventario