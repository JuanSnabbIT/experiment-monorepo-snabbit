import Container from "@/components/layouts/Container/Container"
import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper"
import Subheader, { SubheaderLeft } from "@/components/layouts/Subheader/Subheader"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import Tooltip from "@/components/ui/Tooltip"
import { detalleRetroalimentacionOTThunk, useAppDispatch, useAppSelector } from "@/store"
import dayjs from "dayjs"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import "dayjs/locale/es"
import RatingInput from "@/components/utils/RatingInput"


function DetalleRetroalimentacionOT() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { id } = useParams()
    const { detalleRetroalimentacionOT } = useAppSelector((state) => state.ordenTrabajo)

    useEffect(() => {
        if (id) {
            dispatch(detalleRetroalimentacionOTThunk({id_retro: id}))
        }
    }, [id])

    return (
        <PageWrapper isProtectedRoute={true} name="Detalle Retroalimentación OT" title="Detalle Retroalimentación OT">
            <Subheader>
                <SubheaderLeft>
                    <Button icon="HeroArrowSmallLeft" onClick={() => {navigate(-1)}}></Button>
                    <Badge className="text-xl">Detalle Retroalimentación OT</Badge>
                </SubheaderLeft>
            </Subheader>
            <Container>
                <div className="flex flex-col gap-4">
                    {detalleRetroalimentacionOT && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <Badge className="text-xl">Datos</Badge>
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Badge>Usuario</Badge>
                                            <div className="ml-4">
                                                {detalleRetroalimentacionOT.usuario_empresa ? (
                                                    <>
                                                        <div>{detalleRetroalimentacionOT.datos_usuario?.nombre}</div>
                                                        <div className="text-sm">Correo: {detalleRetroalimentacionOT.datos_usuario?.correo}</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div>{detalleRetroalimentacionOT.usuario_externo}</div>
                                                        <div className="text-sm">Correo: {detalleRetroalimentacionOT.correo_usuario_externo}</div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <Badge>Fecha de Retroalimentación</Badge>
                                            <div className="ml-4">
                                                {detalleRetroalimentacionOT.fecha_retroalimentacion ? dayjs(detalleRetroalimentacionOT.fecha_retroalimentacion).locale("es").format("DD/MM/YYYY") : "Sin Fecha de Retroalimentación"}
                                            </div>
                                        </div>
                                        <div>
                                            <Badge>Cantidad de Visitas</Badge>
                                            <div className="ml-4">
                                                {detalleRetroalimentacionOT.cantidad_visitas}
                                            </div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <Badge className="text-xl">Preguntas</Badge>
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody>
                                    <div className="flex flex-col gap-4">
                                        {detalleRetroalimentacionOT.retroalimentacion_aplicada.length > 0 ? (
                                            detalleRetroalimentacionOT.retroalimentacion_aplicada.map((retro, index) => (
                                                <div className="text-center flex flex-col gap-4 border rounded-xl border-blue-500 p-4" key={index}>
                                                    <Badge className="text-xl">Pregunta N°{index + 1}</Badge>
                                                    <div>{retro.pregunta_texto}</div>
                                                    <div className="flex flex-row">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <Badge>Estrellas</Badge>
                                                            <RatingInput
                                                                thumb={false}
                                                                editable={false}
                                                                defaultValue={retro.cantidad_estrellas || 0}
                                                                rating={retro.cantidad_estrellas || 0}
                                                            />
                                                        </div>
                                                        {retro.cantidad_estrellas && retro.cantidad_estrellas < 3 && (
                                                            <div>
                                                                <Badge>Observaciones</Badge>
                                                                <div>{retro.observaciones}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center">No hay preguntas</div>
                                        )}
                                    </div>
                                </CardBody>
                            </Card>
                        </>
                    )}
                </div>
            </Container>
        </PageWrapper>
    )
}

export default DetalleRetroalimentacionOT