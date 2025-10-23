import Icon from "@/components/icon/Icon";
import Card, { CardBody } from "@/components/ui/Card";
import { checkCompletibilidadOTThunk, useAppDispatch, useAppSelector } from "@/store";
import { useEffect } from "react";
import Marquee from "react-fast-marquee";



function MarqueeCompletibilidad() {
    const dispatch = useAppDispatch()
    const { detalleOrdenTrabajo, checkCompletibilidadOT } = useAppSelector((state) => state.ordenTrabajo)

    useEffect(() => {
        if (detalleOrdenTrabajo) {
            dispatch(checkCompletibilidadOTThunk({id_orden: detalleOrdenTrabajo.id}))
        }
    }, [detalleOrdenTrabajo])

    return (
        <Card>
            <CardBody>
                <Marquee>
                    {checkCompletibilidadOT ? (
                        <div className="flex flex-row">
                            {checkCompletibilidadOT.se_puede_completar ? (
                                <div className="text-2xl">Todo listo para Completar la OT</div>
                            ) : (!checkCompletibilidadOT.se_puede_completar && checkCompletibilidadOT.razones.length > 0 ? (
                                checkCompletibilidadOT.razones.map((raz, index) => (
                                    <div key={index} className="flex flex-wrap gap-2 items-center text-2xl mx-10">
                                        <Icon icon="DuoCircle" className="text-blue-500"></Icon>
                                        {raz}
                                    </div>
                                ))
                            ) : (
                                <div></div>
                            ))}
                        </div>
                    ) : ("No se pudo obtener si la OT se puede completar")}
                </Marquee>
            </CardBody>
        </Card>
    )
}

export default MarqueeCompletibilidad