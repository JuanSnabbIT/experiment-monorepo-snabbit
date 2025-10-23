import { Dispatch, SetStateAction, useEffect } from "react";
import { detalleDelDetalleTrabajoThunk, listaDetalleTrabajoOTThunk, listaSeguimientosThunk, useAppDispatch, useAppSelector, usuarioEmpresaLogeadoThunk } from "@/store";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal";
import TimelineSeguimientos from "./components/TimelineSeguimiento";
import { ESTADOS_DETALLE_TRABAJO } from "@/constants/ordentrabajo.constant";
import dayjs from "dayjs";
import "dayjs/locale/es"
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Tooltip from "@/components/ui/Tooltip";
import ApiService from "@/services/ApiService";


function DetalledelDT({isOpen, setIsOpen, detalleSeleccionado, setDetalleSeleccionado} : {isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>>, detalleSeleccionado: number | null, setDetalleSeleccionado: Dispatch<SetStateAction<number | null>>}) {
	const dispatch = useAppDispatch();
	const navigate = useNavigate()
	const { detalleOrdenTrabajo, detalleDelDetalleTrabajo, listaSeguimientos } = useAppSelector((state) => state.ordenTrabajo);
	const { listaContentType } = useAppSelector((state) => state.core)
	const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa)
	const { userMe } = useAppSelector((state) => state.auth)

	useEffect(() => {
		if (!usuarioEmpresaLogeado && userMe) {
			dispatch(usuarioEmpresaLogeadoThunk({id_usuario: userMe.pk}))
		}
	}, [usuarioEmpresaLogeado, userMe])

	useEffect(() => {
		if (isOpen && detalleSeleccionado && detalleOrdenTrabajo) {
			dispatch(detalleDelDetalleTrabajoThunk({id_orden: detalleOrdenTrabajo.id, id_detalle: detalleSeleccionado}))
			dispatch(listaSeguimientosThunk({id_orden: detalleDelDetalleTrabajo?.id, id_detalle: detalleSeleccionado}))
		}
	}, [isOpen, detalleSeleccionado, detalleOrdenTrabajo])

	useEffect(() => {
		if (!isOpen) {
			setDetalleSeleccionado(null)
		}
	}, [isOpen])

	return (
		<Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop>
			<ModalHeader>
				<Badge className="text-xl">Detalle del Trabajo</Badge>
			</ModalHeader>
			<ModalBody>
				<div className="grid grid-cols-2 gap-4">
					<div className="w-full">
						<Badge>Estado</Badge>
						<div className="ml-4">
							{ESTADOS_DETALLE_TRABAJO.find((estado) => estado.value === detalleDelDetalleTrabajo?.estado)?.label || "Sin estado"}
						</div>
					</div>
					<div className="w-full">
						<Badge>Técnico Asignado
							{detalleDelDetalleTrabajo && detalleDelDetalleTrabajo.tecnico_asignado != null && (
								<Tooltip text="Quitar Técnico">
									<Button size="xs" color="red" icon="HeroTrash" onClick={async () => {
										try {
											const seguimientoResponse = await ApiService.fetchData({
												url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${detalleDelDetalleTrabajo?.id}/seguimientos/`,
												method: 'POST',
												headers: { 'Content-Type': 'application/json' },
												data: JSON.stringify({
													detalle_trabajo: detalleDelDetalleTrabajo?.id,
													usuario: usuarioEmpresaLogeado?.id,
													tipo: "actualizacion",
													comentario: "Técnico quitado",
												}),
											});
											if (seguimientoResponse.data) {
												const response = await ApiService.fetchData({
													url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${detalleDelDetalleTrabajo?.id}/`,
													method: 'patch',
													headers: {'Content-Type': 'application/json'},
													data: JSON.stringify({tecnico_asignado: null})
												})
												if (response.data) {
													toast.success("Técnico quitado", {autoClose: 1000})
													dispatch(listaDetalleTrabajoOTThunk({id_orden: detalleOrdenTrabajo?.id}))
													setIsOpen(false)
												}
											}
										} catch (error: any) {
											const mensajesError = Object.values(error.response.data).flat().join(" ");
											toast.error(mensajesError || "Error al quitar el técnico", {toastId: "Error al quitar el técnico"})
										}
									}} />
								</Tooltip>
							)}
						</Badge>
						<div className="ml-4">{detalleDelDetalleTrabajo?.tecnico_asignado ? detalleDelDetalleTrabajo.nombre_tecnico : "Sin Técnico"}</div>
					</div>
					<div className="w-full">
						<Badge>Descripción</Badge>
						<div className="ml-4">{detalleDelDetalleTrabajo?.descripcion}</div>
					</div>
					<div className="w-full">
						<Badge>Fecha de Creación</Badge>
						<div className="ml-4">
							{detalleDelDetalleTrabajo?.fecha_creacion ? dayjs(detalleDelDetalleTrabajo.fecha_creacion).locale("es").format("DD/MM/YYYY") : "Sin fecha"}
						</div>
					</div>
					<div className="col-span-full flex flex-wrap gap-4">
						<div>
							{detalleDelDetalleTrabajo?.trabajo_id && (
								<Button variant="solid" icon="HeroEye" color="violet" onClick={() => {
									if (listaContentType.find(ct => ct.id === detalleDelDetalleTrabajo.content_type)?.model === "compra") {
										navigate(`/compras/detalle-compra/${detalleDelDetalleTrabajo.trabajo_id}`)
									} else if (listaContentType.find(ct => ct.id === detalleDelDetalleTrabajo.content_type)?.model === "visitasoporte") {
										navigate(`/orden-trabajo/detalle-visita-soporte/${detalleDelDetalleTrabajo.trabajo_id}`)
									} else if (listaContentType.find(ct => ct.id === detalleDelDetalleTrabajo.content_type)?.model === "cotizacion") {
										navigate(`/cotizacion/detalle-cotizacion/${detalleDelDetalleTrabajo.codigo_cotizacion}`)
									} else {
										toast.error("No se reconoce el tipo de trabajo", {toastId: "No se reconoce el tipo de trabajo"})
									}
								}}></Button>
							)}
						</div>
						{detalleDelDetalleTrabajo && detalleDelDetalleTrabajo.insumo !== null && (
							<Tooltip text="Insumo">
								<Button variant="solid" icon="DuoBox3" color="violet" onClick={() => {navigate(`/bodega/detalle-guia-salida-bodega/${detalleDelDetalleTrabajo.insumo}`)}}></Button>
							</Tooltip>
						)}
					</div>
					<div className="col-span-full">
						<Badge>Seguimientos</Badge>
						<div className="ml-4 mt-4">
							{listaSeguimientos && listaSeguimientos.length > 0 ? (
								<TimelineSeguimientos seguimientos={listaSeguimientos} />
							) : (
								<div>No hay seguimientos disponibles.</div>
							)}
						</div>
					</div>
				</div>
			</ModalBody>
			<ModalFooter>
				<ModalFooterChild />
				<ModalFooterChild>
					<Button color="red" onClick={() => setIsOpen(false)}>Cerrar</Button>
				</ModalFooterChild>
			</ModalFooter>
		</Modal>
	);
}

export default DetalledelDT;
