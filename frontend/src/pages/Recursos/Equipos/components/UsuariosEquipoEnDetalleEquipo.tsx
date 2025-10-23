import Badge from "@/components/ui/Badge"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import { listaUsuariosDelEquipoThunk, useAppDispatch, useAppSelector } from "@/store"
import Timeline, { TimelineItem } from '../../../../components/Timeline';
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import Tooltip from "@/components/ui/Tooltip";
import Icon from "@/components/icon/Icon";
import Collapse from "@/components/utils/Collapse";
import Button from "@/components/ui/Button";


function UsuariosEquipoEnDetalleEquipo() {
    const dispatch = useAppDispatch()
    const { detalleEquipoEmpresa, listaUsuariosDelEquipo } = useAppSelector((state) => state.recursos)
    const [equipoAbierto, setEquipoAbierto] = useState<number | undefined>()
    const [isOpening, setIsOpening] = useState<boolean>(false)

    useEffect(() => {
        dispatch(listaUsuariosDelEquipoThunk({id_equipo: detalleEquipoEmpresa?.id}))
    }, [])

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className="text-xl">Usuarios del Equipo</Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody>
                <div>
                    {listaUsuariosDelEquipo.length > 0 ? (
                        <Timeline>
                            {listaUsuariosDelEquipo.map((userEquipo, index) => (
                                <TimelineItem image={userEquipo.foto_usuario ? `${process.env.VITE_API_URL}${userEquipo.foto_usuario}` : "/src/assets/local/user_default.png"} key={index}>
                                    <Badge className="flex items-center gap-2">
                                        {userEquipo.nombre_usuario} 
                                        <Tooltip text={userEquipo.estado ? "Asignado" : "Devuelto"}>
                                            <Icon size="text-4xl" icon={userEquipo.estado ? "HeroCheckCircle" : "HeroXCircle"} color={userEquipo.estado ? "emerald" : "red"}></Icon>
                                        </Tooltip>
                                    </Badge>
                                    <div>Fecha de Asignación: {userEquipo.fecha_asignacion ? dayjs(userEquipo.fecha_asignacion).format('DD/MM/YYYY') : "Sin Fecha de Asignación"}</div>
                                    <div>Fecha de Devolución: {userEquipo.fecha_devolucion ? dayjs(userEquipo.fecha_devolucion).format('DD/MM/YYYY') : "Sin Fecha de Devolución"}</div>
                                    <div>
                                        {userEquipo.observaciones.length > 0 ? (
                                            <>
                                                <div>
                                                    Observaciones: 
                                                    <Button size="sm" isDisable={isOpening} icon={equipoAbierto === userEquipo.id ? "HeroEye" : "HeroEyeSlash"} onClick={() => {
                                                        if (isOpening) return;
                                                        setIsOpening(true);
                                                        if (equipoAbierto === userEquipo.id) {
                                                            setEquipoAbierto(undefined);
                                                        } else {
                                                            setEquipoAbierto(userEquipo.id);
                                                        }
                                                        setTimeout(() => setIsOpening(false), 300);
                                                    }}></Button>
                                                </div>
                                                <div className="flex flex-col p-2">
                                                    <Collapse isOpen={equipoAbierto === userEquipo.id} className="transition-opacity">
                                                        <div>{userEquipo.observaciones}</div>
                                                    </Collapse>
                                                </div>
                                            </>
                                        ) : ("Observaciones: Sin Observaciones")}
                                    </div>
                                </TimelineItem>
                            ))}
                        </Timeline>
                    ) : (
                        <div>Sin Usuarios</div>
                    )}
                </div>
            </CardBody>
        </Card>
    )
}

export default UsuariosEquipoEnDetalleEquipo