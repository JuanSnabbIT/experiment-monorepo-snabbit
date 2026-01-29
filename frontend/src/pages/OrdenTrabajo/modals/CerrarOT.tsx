import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import { detalleOrdenTrabajoThunk, useAppDispatch, useAppSelector } from "@/store"
import { useEffect, useMemo, useState } from "react"
import { confirmAlert } from "@/utils/sweetAlert"
// import SeguimientoEnCerrarOT from "./components/SeguimientoEnCerrarOT"
import { toast } from "react-toastify"
import ApiService from "@/services/ApiService"


function CerrarOT() {
    const dispatch = useAppDispatch()
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo)
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isBusy, setIsBusy] = useState<boolean>(false)
    const [rendicionEstado, setRendicionEstado] = useState<string | null>(null)
    const [prefacturaEstado, setPrefacturaEstado] = useState<string | null>(
        detalleOrdenTrabajo?.cierre_administrativo?.estado_cierre ?? null,
    )

    useEffect(() => {
        setPrefacturaEstado(detalleOrdenTrabajo?.cierre_administrativo?.estado_cierre ?? null)
    }, [detalleOrdenTrabajo?.cierre_administrativo])

    useEffect(() => {
        let mounted = true
        const fetchRendicionEstado = async () => {
            if (!detalleOrdenTrabajo?.rendicion_asociada_id) {
                if (mounted) {
                    setRendicionEstado(null)
                }
                return
            }
            try {
                const response = await ApiService.fetchData({
                    url: `/api/rendiciones/${detalleOrdenTrabajo.rendicion_asociada_id}/`,
                    method: "get",
                })
                if (mounted) {
                    setRendicionEstado(response.data?.estado ?? response.data?.estado_label ?? null)
                }
            } catch {
                if (mounted) {
                    setRendicionEstado(null)
                }
            }
        }
        fetchRendicionEstado()
        return () => {
            mounted = false
        }
    }, [detalleOrdenTrabajo?.rendicion_asociada_id])

    const isRendicionRendida = useMemo(() => {
        const normalized = rendicionEstado?.toLowerCase()?.trim()
        return normalized === "rendida" || normalized === "4"
    }, [rendicionEstado])

    const isPrefacturaFacturada = useMemo(() => {
        const normalized = prefacturaEstado?.toLowerCase()?.trim() ?? ""
        return normalized.includes("factur")
    }, [prefacturaEstado])

    const missingRendicionReason = useMemo(() => {
        if (!detalleOrdenTrabajo?.rendicion_asociada_id) {
            return "Asocia la rendición correspondiente (usa el módulo Rendiciones) para poder cerrar la OT."
        }
        if (!isRendicionRendida) {
            return "Marca la rendición como \"Rendida\" en el módulo Rendiciones antes de cerrar la OT."
        }
        return null
    }, [detalleOrdenTrabajo?.rendicion_asociada_id, isRendicionRendida])

    const missingPrefacturaReason = useMemo(() => {
        if (!detalleOrdenTrabajo?.cierre_administrativo) {
            return "Crea la prefactura manual desde Facturaciones (matching de OTs) para seguir."
        }
        if (!isPrefacturaFacturada) {
            return "Finaliza la prefactura (estado Facturado) en el módulo de facturas antes de cerrar la OT."
        }
        return null
    }, [detalleOrdenTrabajo?.cierre_administrativo, isPrefacturaFacturada])

    const getMissingReasons = useMemo(() => {
        return [missingRendicionReason, missingPrefacturaReason].filter(
            (reason): reason is string => Boolean(reason),
        )
    }, [missingPrefacturaReason, missingRendicionReason])

    const tooltipText = getMissingReasons.length ? getMissingReasons.join("\n") : "Cerrar la orden de trabajo"
    const canCloseOrden = getMissingReasons.length === 0

    return (
        <>
            <Tooltip text={tooltipText}>
                <span>
                    <Button
                        variant="solid"
                        color="red"
                        icon="HeroHandRaised"
                        disabled={!canCloseOrden}
                        isDisable={!canCloseOrden}
                        onClick={() => {
                            if (!canCloseOrden) return
                            setIsOpen(true)
                        }}
                    />
                </span>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className="text-xl">Cerrar la Orden de Trabajo</Badge>
                </ModalHeader>
                <ModalBody>
                    {/* {listaDetallesSeguimientosOT && listaDetallesSeguimientosOT.detalles.length > 0 ? listaDetallesSeguimientosOT.detalles.map((detalle, index) => (
                        <div key={index} className="flex flex-col gap-4">
                            {detalle.seguimientos.length > 0 && detalle.seguimientos.map((seguimiento, index) => (
                                <Fragment key={index}>
                                    <SeguimientoEnCerrarOT seguimiento={seguimiento} id_orden={detalleOrdenTrabajo?.id} id_detalle={detalle.detalle_id} />
                                </Fragment>
                            ))}
                            {detalle.visita && (
                                <div className="w-full">
                                    {detalle.visita.asistencias.length > 0 && detalle.visita.asistencias.map((asistencia, index) => (
                                        <div className="w-full" key={index}>asistencia {asistencia.id}</div>
                                    ))}
                                    {detalle.visita.entregas.length > 0 && detalle.visita.entregas.map((entrega, index) => (
                                        <div className="w-full" key={index}>entrega {entrega.id}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )) : (
                        <div>Sin Detalles en la OT</div>
                    )} */}
                    <div>¿Esta seguro(a) de querer cerrar la OT?</div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Tooltip text={tooltipText}>
                            <span>
                                <Button
                                    variant="solid"
                                    color="red"
                                    disabled={isBusy || !canCloseOrden}
                                    onClick={async () => {
                                        if (!detalleOrdenTrabajo || !canCloseOrden) return;
                                        setIsBusy(true);
                                        try {
                                            const confirmed = await confirmAlert({
                                                title: "Cerrar OT",
                                                text: "¿Confirmas cerrar la orden de trabajo y marcarla como Validada y Cerrada?",
                                                confirmText: "Cerrar OT",
                                                cancelText: "Cancelar",
                                                icon: "warning",
                                                confirmColor: "#dc2626",
                                            });
                                            if (!confirmed) {
                                                setIsBusy(false);
                                                return;
                                            }

                                            const response = await ApiService.fetchData({
                                                url: `/api/ordenes-trabajo/${detalleOrdenTrabajo.id}/`,
                                                method: "patch",
                                                headers: { 'Content-Type': 'application/json' },
                                                data: JSON.stringify({ estado: "cerrada" }),
                                            });

                                            if (response.data) {
                                                toast.success("Orden cerrada", { autoClose: 1000 });
                                                dispatch(detalleOrdenTrabajoThunk({ id_ordenTrabajo: detalleOrdenTrabajo.id }));
                                                setIsOpen(false);
                                            }
                                        } catch (error: any) {
                                            const mensajesError = error?.response?.data
                                                ? Object.values(error.response.data).flat().join(" ")
                                                : error?.message;
                                            toast.error(mensajesError || "Error al cerrar la OT", {
                                                toastId: "Error al cerrar la OT",
                                            });
                                        } finally {
                                            setIsBusy(false);
                                        }
                                    }}>
                                    Cerrar la OT
                                </Button>
                            </span>
                        </Tooltip>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CerrarOT
