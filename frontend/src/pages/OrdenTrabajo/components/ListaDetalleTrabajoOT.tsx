import Icon from "@/components/icon/Icon"
import Badge from "@/components/ui/Badge"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import { listaContentTypeThunk, listaDetalleTrabajoOTThunk, listaTrabajosFiltradasThunk, useAppDispatch, useAppSelector, usuarioEmpresaLogeadoThunk } from "@/store"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import { useEffect, useState } from "react"
import CrearDetalleTrabajoOT from "../modals/CrearDetalleTrabajoOT"
import { IDetalleOrdenDeTrabajo } from "@/interface/ordenTrabajo.interface"
import DetalledelDT from "../modals/DetalledelDT"
import Button from "@/components/ui/Button"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import Collapse from "@/components/utils/Collapse"
import CrearSeguimientoDT from "../modals/CrearSeguimientoDT"
import AñadirTrabajoDT from "../modals/AñadirTrabajoDT"
// import ListaVisitasDetalleDT from "../modals/ListaVisitasDetalleDT"
<<<<<<< Updated upstream
import AnimacionDeInputModoMovil from "@/components/utils/AnimacionDeIntputModoMovil"
import CrearComprasEnOT from "../modals/CrearComprasEnOT"
import AsignarTecnicoDT from "../modals/AsignarTecnicoDT"
import { toast } from "react-toastify"
import EliminarDetalleTrabajo from "../modals/EliminarDetalleTrabajo"
import AgregarInsumoADT from "../modals/AgregarInsumoADT"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Textarea from "@/components/form/Textarea"
import ListaEntregasDT from "../modals/ListaEntregasDT"
import ListaAsistenciasDT from "../modals/ListaAsistenciasDT"
import IniciarEstadoDT from "../modals/IniciarEstadoDT"
import TerminarInsumoDT from "../modals/TerminarInsumoDT"
import CompletarVisitaDT from "../modals/CompletarVisitaDT"
import CrearVisitaDT from "../modals/CrearVisitaDT"
=======
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalFooterChild,
	ModalHeader,
} from '@/components/ui/Modal';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { TIPO_TRABAJO_POR_SERVICIO } from '@/constants/tipoTrabajo.constant';
import { toast } from 'react-toastify';
import AgregarInsumoADT from '../modals/AgregarInsumoADT';
import AsignarTecnicoDT from '../modals/AsignarTecnicoDT';
import EliminarDetalleTrabajo from '../modals/EliminarDetalleTrabajo';
import ListaAsistenciasDT from '../modals/ListaAsistenciasDT';
import ListaEntregasDT from '../modals/ListaEntregasDT';
import TerminarInsumoDT from '../modals/TerminarInsumoDT';
import CrearCotizacionDesdeOT from '../modals/CrearCotizacionDesdeOT';
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes


const columnHelper = createColumnHelper<IDetalleOrdenDeTrabajo>()

function ListaDetalleTrabajoOT() {
    const dispatch = useAppDispatch()
    const { detalleOrdenTrabajo, listaDetalleTrabajoOT } = useAppSelector((state) => state.ordenTrabajo)
    const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa)
    const { userMe } = useAppSelector((state) => state.auth)
    const { listaContentType } = useAppSelector((state) => state.core)
    const [sorting, setSorting] = useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState<string>('')
    const [detalleSeleccionado, setDetalleSeleccionado] = useState<number | null>(null);
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isOpenInsumo, setIsOpenInsumo] = useState<boolean>(false)
    const [isOpenDetalle, setIsOpenDetalle] = useState<boolean>(false)
    const [isOpenVisitas, setIsOpenVisitas] = useState<boolean>(false)
    const [isOpenTecnico, setIsOpenTecnico] = useState<boolean>(false)
    const [isOpenEntregas, setIsOpenEntregas] = useState<boolean>(false)
    const [isOpenDevolucion, setIsOpenDevolucion] = useState<boolean>(false)
    const [isOpenSeguimiento, setIsOpenSeguimiento] = useState<boolean>(false)

    // useEffect(() => {
    //     if (detalleOrdenTrabajo) {
    //         dispatch(checkCompletibilidadOTThunk({id_orden: detalleOrdenTrabajo?.id}))
    //     }
    // }, [listaDetalleTrabajoOT, detalleOrdenTrabajo])

    useEffect(() => {
        if (!usuarioEmpresaLogeado && userMe) {
            dispatch(usuarioEmpresaLogeadoThunk({id_usuario: userMe.pk}))
        }
    }, [usuarioEmpresaLogeado, userMe])

    useEffect(() => {
        if (detalleOrdenTrabajo) {
            dispatch(listaTrabajosFiltradasThunk({id_orden: detalleOrdenTrabajo.id}))
            dispatch(listaDetalleTrabajoOTThunk({id_orden: detalleOrdenTrabajo.id}))
        }
    }, [detalleOrdenTrabajo])

    useEffect(() => {
        if (isOpen) {
            dispatch(listaTrabajosFiltradasThunk({id_orden: detalleOrdenTrabajo?.id}))
        }
    }, [isOpen, detalleOrdenTrabajo?.id]);

    useEffect(() => {
        if (listaContentType.length === 0) {
            dispatch(listaContentTypeThunk())
        }
    }, [listaContentType])

    const columns = [
        columnHelper.accessor("id", {
            cell: (info) => info.getValue(),
            header: "N°",
            size: 15,      
            minSize: 10,   
            maxSize: 20,   
        }),
        columnHelper.accessor("content_type", {
            cell: (info) => (
                <div>
                    {listaContentType.find(ct => ct.id === info.row.original.content_type)?.model === "cotizacion" && ("Cotización")}
                    {listaContentType.find(ct => ct.id === info.row.original.content_type)?.model === "visitasoporte" && ("Visita de Soporte")}
                    {listaContentType.find(ct => ct.id === info.row.original.content_type)?.model === "compra" && ("Compra")}
                    {!info.row.original.content_type && ("Sin Tipo")}
                </div>
            ),
            header: "Tipo",
            size: 80
        }),
        columnHelper.accessor("nombre", {
            cell: (info) => {
                const [descripcionAbierto, setDescripcionAbierto] = useState<number | undefined>()
                const [isOpening, setIsOpening] = useState<boolean>(false)

                return (
                    <div className="flex flex-row gap-2">
                        <div>
                            {info.getValue()}
                            <Collapse isOpen={descripcionAbierto === info.row.original.id} className="transition-opacity">
                                <div>
                                    <Badge className="text-sm">Descripción:</Badge>
                                    <span className="text-sm">{info.row.original.descripcion}</span>
                                </div>
                            </Collapse>
                        </div>
                        <div>
                            <Button size="xs" isDisable={isOpening} variant='solid' icon={descripcionAbierto === info.row.original.id ? "HeroEyeSlash" : "HeroEye"} color='sky' onClick={() => {
                                if (isOpening) return;
                                setIsOpening(true);
                                if (descripcionAbierto === info.row.original.id) {
                                    setDescripcionAbierto(undefined);
                                } else {
                                    setDescripcionAbierto(info.row.original.id);
                                }
                                setTimeout(() => setIsOpening(false), 300);
                            }} />
                        </div>
                    </div>
                )
            },
            header: "Solicitud"
        }),
        columnHelper.accessor("estado_label", {
            cell: (info) => {
                const [isOpenEstado, setIsOpenEstado] = useState<boolean>(false)
                const [comentario, setComentario] = useState<string | undefined>()

                return (
                    <div className="flex flex-wrap gap-2">
                        {(info.row.original.insumo === null || (info.row.original.insumo && info.row.original.estado_insumo != "ER")) ? (
                            <>
                                {info.row.original.estado === "en_proceso" && (
                                    <Tooltip text="En Proceso">
                                        <Button variant="solid" icon="DuoPause" color="zinc" onClick={() => {
                                            if (detalleOrdenTrabajo && detalleOrdenTrabajo.estado === "en_proceso") {
                                                actualizarEstadoDetalle(info.row.original.id, "pendiente")
                                            }
                                        }}></Button>
                                    </Tooltip>
                                )}
                                {info.row.original.estado === "pendiente" && (
                                    <Tooltip text="Pendiente">
                                        <Button variant="solid" icon="DuoPlay" onClick={() => {
                                            if (detalleOrdenTrabajo && detalleOrdenTrabajo.estado === "en_proceso") {
                                                actualizarEstadoDetalle(info.row.original.id, "en_proceso")
                                            }
                                        }}></Button>
                                    </Tooltip>
                                )}
                            </>
                        ) : (
                            info.row.original.estado_insumo === "ER" && (
                                <IniciarEstadoDT detalle={info.row.original} />
                            )
                        )}
                        {info.row.original.estado === "completado" && (
                            <Tooltip text="Completado">
                                <Button variant="solid" icon="HeroCheck" color="emerald"></Button>
                            </Tooltip>
                        )}
                        {info.row.original.estado === "no_realizado" && (
                            <Tooltip text="No Realizado">
                                <Button variant="solid" icon="HeroXMark" color="red"></Button>
                            </Tooltip>
                        )}
                        {info.row.original.estado === "medianamente_completado" && (
                            <Tooltip text="Medianamente Completado">
                                <Button variant="solid" icon="HeroArrowPath" color="sky" onClick={() => {
                                    if (detalleOrdenTrabajo && detalleOrdenTrabajo.estado === "en_proceso") {
                                        setIsOpenEstado(true)
                                    }
                                }}></Button>
                            </Tooltip>
                        )}
                        <Modal isOpen={isOpenEstado} setIsOpen={setIsOpenEstado}>
                            <ModalHeader>
                                <Badge>Cambiar Estado</Badge>
                            </ModalHeader>
                            <ModalBody>
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <Badge>Nuevo Estado</Badge>
                                        <div className="ml-4">Completado</div>
                                    </div>
                                    <div>
                                        <Badge>Comentario del Seguimiento</Badge>
                                        <Textarea
                                            name="comentario"
                                            value={comentario}
                                            onChange={(e) => {setComentario(e.target.value)}}
                                        />
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <ModalFooterChild></ModalFooterChild>
                                <ModalFooterChild>
                                    <Button color="red" onClick={() => {setIsOpenEstado(false)}}>Cancelar</Button>
                                    <Button variant="solid" onClick={() => {actualizarEstadoDetalle(info.row.original.id, "completado")}}>Guardar</Button>
                                </ModalFooterChild>
                            </ModalFooter>
                        </Modal>
                    </div>
                )
            },
            header: "Estado",
            size: 100
        }),
        columnHelper.display({
            cell: (info) => (
                <div>
                    {detalleOrdenTrabajo && detalleOrdenTrabajo.estado === "en_proceso" && (
                        <Tooltip text="Crear Seguimiento">
                            <Button variant="solid" color="blue" icon="HeroPlusCircle" onClick={() => {setDetalleSeleccionado(info.row.original.id); setIsOpenSeguimiento(true)}}></Button>
                        </Tooltip>
                    )}
                </div>
            ),
            header: "Seguimientos",
            size: 100
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => {
                const [isOpenEstado, setIsOpenEstado] = useState<boolean>(false)
                const [estadoNuevo, setEstadoNuevo] = useState<string | undefined>()
                const [comentario, setComentario] = useState<string | undefined>()

                let optionsNuevo = [
                    {value: "medianamente_completado", label: "Medianamente Completado"},
                    {value: "completado", label: "Completado"},
                    {value: "no_realizado", label: "No Realizado"}
                ]

                return (
                    <div className="flex flex-wrap gap-2">
                        <Tooltip text="Detalle">
                            <Button variant="solid" color="violet" icon="HeroEye" onClick={() => {setDetalleSeleccionado(info.row.original.id); setIsOpenDetalle(true)}} />
                        </Tooltip>
                        {typeof(info.row.original.content_type) != "number" && typeof(info.row.original.trabajo_id) != "number" && detalleOrdenTrabajo && (detalleOrdenTrabajo.estado === "pendiente" || detalleOrdenTrabajo.estado === "en_proceso") && (info.row.original.estado === "pendiente" || info.row.original.estado === "en_proceso") && typeof(info.row.original.insumo) != "number" && (
                            <>
                                <Tooltip text="Añadir Cotización o Asistencia Técnica">
                                    <Button variant="solid" color="zinc" icon="HeroDocumentPlus" onClick={() => {setDetalleSeleccionado(info.row.original.id); setIsOpen(true)}}></Button>
                                </Tooltip>
                                <CrearVisitaDT id_detalle={info.row.original.id} />
                            </>
                        )}
                        {typeof(info.row.original.tecnico_asignado) === "number" && typeof(info.row.original.content_type) != "number" && typeof(info.row.original.trabajo_id) != "number" && detalleOrdenTrabajo && (detalleOrdenTrabajo.estado === "pendiente" || detalleOrdenTrabajo.estado === "en_proceso") && (info.row.original.estado === "pendiente" || info.row.original.estado === "en_proceso") && typeof(info.row.original.insumo) != "number" && (
                            <CrearComprasEnOT detalleTrabajo={info.row.original} />
                        )}
                        {info.row.original.estado === "pendiente" && detalleOrdenTrabajo && detalleOrdenTrabajo.estado === "pendiente" && (
                            <EliminarDetalleTrabajo detalle_trabajo={info.row.original} />
                        )}
                        {typeof(info.row.original.tecnico_asignado) != "number" && (info.row.original.estado === "pendiente" || info.row.original.estado === "en_proceso") && (
                            <Tooltip text="Asignar Técnico">
                                <Button variant="solid" color="sky" icon="DuoAddUser" onClick={() => {setDetalleSeleccionado(info.row.original.id); setIsOpenTecnico(true)}} />
                            </Tooltip>
                        )}
                        {listaContentType.find(ct => ct.id === info.row.original.content_type)?.model === "visitasoporte" && (
                            <>
                                <Tooltip text="Entregas de Equipos">
                                    <Button variant="solid" color="sky" icon="DuoLaptop" onClick={() => {setDetalleSeleccionado(info.row.original.id); setIsOpenEntregas(true)}}></Button>
                                </Tooltip>
                                <Tooltip text="Asistencias de Usuarios">
                                    <Button variant="solid" color="lime" icon="DuoUser" onClick={() => {setDetalleSeleccionado(info.row.original.id); setIsOpenVisitas(true)}}></Button>
                                </Tooltip>
                                {detalleOrdenTrabajo && detalleOrdenTrabajo.estado === "en_proceso" && (info.row.original.estado != "pendiente" && info.row.original.estado != "en_proceso") && info.row.original.estado_visita === "pendiente" && (
                                    <CompletarVisitaDT id_visita={info.row.original.trabajo_id} />
                                )}
                            </>
                        )}
                        {(typeof(info.row.original.tecnico_asignado) === "number") && (info.row.original.estado === "pendiente") && (info.row.original.insumo === null) && (listaContentType.find(ct => ct.id === info.row.original.content_type)?.model != "compra") && (
                            <Tooltip text="Agregar Insumo">
                                <Button variant="solid" icon="HeroPlus" color="lime" onClick={() => {setDetalleSeleccionado(info.row.original.id); setIsOpenInsumo(true)}}></Button>
                            </Tooltip>
                        )}
                        {(info.row.original.estado === "en_proceso") && detalleOrdenTrabajo && detalleOrdenTrabajo.estado === "en_proceso" && !(listaContentType.find(ct => ct.id === info.row.original.content_type)?.model === "compra") && (
                            <Tooltip text="Cambiar Estado">
                                <Button variant="solid" icon="HeroShieldCheck" onClick={() => {setIsOpenEstado(true)}}></Button>
                            </Tooltip>
                        )}
                        {(info.row.original.estado_insumo === "ET" && (info.row.original.estado != "en_proceso" && info.row.original.estado != "pendiente")) && (
                            <Tooltip text="Devolver/Terminar Insumo">
                                <Button variant="solid" icon="DuoIncomingBox" color="amber" onClick={() => {setDetalleSeleccionado(info.row.original.id); setIsOpenDevolucion(true)}}></Button>
                            </Tooltip>
                        )}
                        <Modal isOpen={isOpenEstado} setIsOpen={setIsOpenEstado}>
                            <ModalHeader>
                                <Badge>Cambiar Estado</Badge>
                            </ModalHeader>
                            <ModalBody>
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <Badge>Nuevo Estado</Badge>
                                        <SelectReact
                                            name="estadoNuevo"
                                            options={optionsNuevo}
                                            value={optionsNuevo.find(est => est.value === estadoNuevo)}
                                            noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                            placeholder="Seleccione un Estado"
                                            onChange={(e) => {
                                                if (e) {
                                                    setEstadoNuevo((e as TSelectOption).value)
                                                } else {
                                                    setEstadoNuevo(undefined)
                                                }
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <Badge>Comentario del Seguimiento</Badge>
                                        <Textarea
                                            name="comentario"
                                            value={comentario}
                                            onChange={(e) => {setComentario(e.target.value)}}
                                        />
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <ModalFooterChild></ModalFooterChild>
                                <ModalFooterChild>
                                    <Button color="red" onClick={() => {
                                        setIsOpenEstado(false);
                                        setEstadoNuevo(undefined);
                                        setComentario(undefined)
                                    }}>Cancelar</Button>
                                    <Button variant="solid" onClick={() => {
                                        if (estadoNuevo) {
                                            actualizarEstadoDetalle(info.row.original.id, estadoNuevo)
                                        } else {
                                            toast.error("Seleccione un estado", {toastId: "Seleccione un estado"})
                                        }
                                    }}>Guardar</Button>
                                </ModalFooterChild>
                            </ModalFooter>
                        </Modal>
                    </div>
                )
            },
            header: "Acciones"
        })
    ];

    const table = useReactTable({
        data: listaDetalleTrabajoOT,
        columns: columns,
        state: {
            sorting: sorting,
            globalFilter: globalFilter,
        },
        onSortingChange: setSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel()
    })

    async function actualizarEstadoDetalle(id_detalle_trabajo: number | string, estado: string, comentario?: string) {
        try {
            const response = await ApiService.fetchData({url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${id_detalle_trabajo}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({estado})})
            if (response.data) {
                if (comentario) {
                    const responseSeguimiento = await ApiService.fetchData({url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${id_detalle_trabajo}/seguimientos/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                        comentario: comentario,
                        tipo: "incidencia",
                        detalle_trabajo: id_detalle_trabajo,
                        usuario: usuarioEmpresaLogeado?.id
                    })})
                    if (responseSeguimiento.data) {
                        toast.success("Estado cambiado", {autoClose: 1000})
                        dispatch(listaDetalleTrabajoOTThunk({id_orden: detalleOrdenTrabajo?.id}));
                        return true
                    }
                } else {
                    toast.success("Estado cambiado", {autoClose: 1000})
                    dispatch(listaDetalleTrabajoOTThunk({id_orden: detalleOrdenTrabajo?.id}));
                    return true
                }
            }
        } catch (error: any) {
            const mensajesError = Object.values(error.response.data).flat().join(" ");
            toast.error(mensajesError || "Error al cambiar el estado", {toastId: "Error al cambiar el estado"})
            return false
        }
    }

<<<<<<< Updated upstream
    return (
        <>
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <Badge className="text-xl">Detalles del Trabajo</Badge>
                    </CardHeaderChild>
                    <CardHeaderChild>
                        <AnimacionDeInputModoMovil globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} anchoInput={200}>
                            {detalleOrdenTrabajo && (detalleOrdenTrabajo.estado === "pendiente" || detalleOrdenTrabajo.estado === "en_proceso") && (<CrearDetalleTrabajoOT />)}
                        </AnimacionDeInputModoMovil>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className="z-0">
                    <div className="overflow-auto">
                        {listaDetalleTrabajoOT.length > 0 ? (
                            <>
                                <Table className='table-fixed min-w-[800px]'>
                                    <THead>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <Tr key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <Th
                                                        style={{ width: header.column.getSize() }}
                                                        key={header.id}
                                                        isColumnBorder={false}
                                                        className='text-left'>
                                                        {header.isPlaceholder ? null : (
                                                            <div
                                                                key={header.id}
                                                                aria-hidden='true'
                                                                {...{
                                                                    className: header.column.getCanSort() ? 'cursor-pointer select-none flex items-center' : '',
                                                                    onClick: header.column.getToggleSortingHandler(),
                                                                }}
                                                            >
                                                                {flexRender(
                                                                    header.column.columnDef.header,
                                                                    header.getContext(),
                                                                )}
                                                                {{
                                                                    asc: (<Icon icon='HeroChevronUp' className='ltr:ml-1.5 rtl:mr-1.5' />),
                                                                    desc: (<Icon icon='HeroChevronDown' className='ltr:ml-1.5 rtl:mr-1.5' />),
                                                                }[header.column.getIsSorted() as string] ?? null}
                                                            </div>
                                                        )}
                                                    </Th>
                                                ))}
                                            </Tr>
                                        ))}
                                    </THead>
                                    <TBody>
                                        {table.getRowModel().rows.map((row) => (
                                            <Tr key={row.id}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <Td key={cell.id}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </Td>
                                                ))}
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                                <div className="mt-2 min-w-[800px]">
                                    <TableCardFooterTemplateV2 table={table} />
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-gray-500">No se encontraron detalles.</div>
                        )}
                    </div>
                </CardBody>
            </Card>
            <AñadirTrabajoDT detalleSeleccionado={detalleSeleccionado} isOpen={isOpen} setIsOpen={setIsOpen} />
            <AsignarTecnicoDT isOpen={isOpenTecnico} setIsOpen={setIsOpenTecnico} detalle={detalleSeleccionado} setDetalleSeleccionado={setDetalleSeleccionado} />
            <DetalledelDT isOpen={isOpenDetalle} setIsOpen={setIsOpenDetalle} detalleSeleccionado={detalleSeleccionado} setDetalleSeleccionado={setDetalleSeleccionado} />
            <AgregarInsumoADT isOpen={isOpenInsumo} setIsOpen={setIsOpenInsumo} detalleSeleccionado={detalleSeleccionado} setDetalleSeleccionado={setDetalleSeleccionado} />
            <ListaEntregasDT isOpen={isOpenEntregas} setIsOpen={setIsOpenEntregas} detalleSeleccionado={detalleSeleccionado} setDetalleSeleccionado={setDetalleSeleccionado} />
            <ListaAsistenciasDT isOpen={isOpenVisitas} setIsOpen={setIsOpenVisitas} detalleSeleccionado={detalleSeleccionado} setDetalleSeleccionado={setDetalleSeleccionado} />
            <CrearSeguimientoDT isOpen={isOpenSeguimiento} setIsOpen={setIsOpenSeguimiento} detalleSeleccionado={detalleSeleccionado} setDetalleSeleccionado={setDetalleSeleccionado} />
            <TerminarInsumoDT isOpen={isOpenDevolucion} setIsOpen={setIsOpenDevolucion} detalleSeleccionado={detalleSeleccionado} setDetalleSeleccionado={setDetalleSeleccionado} />
        </>
    )
=======
				const estadoActual = info.row.original.estado;
				const estadoOT = detalleOrdenTrabajo?.estado;
				const otPendiente = estadoOT === 'pendiente';
				const otEnProceso = estadoOT === 'en_proceso';
				const tieneTecnico = !!info.row.original.tecnico_asignado;

				// Verificar requisitos para cambiar estado de Pendiente a En Proceso
				const tieneFechaInicio =
					detalleOrdenTrabajo?.fecha_inicio_ot &&
					detalleOrdenTrabajo.fecha_inicio_ot !== '';
				const tieneFechaFin =
					detalleOrdenTrabajo?.fecha_finalizacion_ot &&
					detalleOrdenTrabajo.fecha_finalizacion_ot !== '';
				const cumpleRequisitos = tieneFechaInicio && tieneFechaFin && tieneTecnico;

				// Opciones de estado según estado actual del detalle Y estado de la OT
				const getOpcionesEstado = () => {
					if (estadoActual === 'pendiente') {
						// Pendiente puede ir a En Proceso (si cumple requisitos)
						return [{ value: 'en_proceso', label: 'En Proceso' }];
					} else if (estadoActual === 'en_proceso') {
						// En Proceso puede volver a Pendiente siempre
						// Pero solo puede ir a estados finales si OT está en proceso
						const opciones = [{ value: 'pendiente', label: 'Pendiente' }];
						if (otEnProceso) {
							opciones.push(
								{ value: 'completado', label: 'Completado' },
								{
									value: 'medianamente_completado',
									label: 'Medianamente Completado',
								},
								{ value: 'no_realizado', label: 'No Realizado' },
							);
						}
						return opciones;
					} else if (estadoActual === 'medianamente_completado') {
						return [
							{ value: 'en_proceso', label: 'En Proceso' },
							{ value: 'completado', label: 'Completado' },
						];
					} else {
						// completado, no_realizado: solo reabrir
						return [{ value: 'en_proceso', label: 'Reabrir (En Proceso)' }];
					}
				};

				const optionsEstado = getOpcionesEstado();

				// Mensaje de requisitos faltantes
				const getMensajeRequisitos = () => {
					const faltantes = [];
					if (!tieneFechaInicio) faltantes.push('Fecha de Inicio de OT');
					if (!tieneFechaFin) faltantes.push('Fecha de Finalización de OT');
					if (!tieneTecnico) faltantes.push('Técnico asignado');
					return faltantes.length > 0 ? `Faltan: ${faltantes.join(', ')}` : '';
				};

				return (
					<div className='flex flex-wrap gap-2'>
						{/* SIEMPRE: Ver Detalle */}
						<Tooltip text='Ver Detalle'>
							<Button
								variant='solid'
								color='violet'
								icon='HeroEye'
								onClick={() => {
									setDetalleSeleccionado(info.row.original.id);
									setIsOpenDetalle(true);
								}}
							/>
						</Tooltip>

						{/* PENDIENTE: Asignar/Reasignar Técnico, Eliminar */}
						{estadoActual === 'pendiente' && (
							<>
								<Tooltip
									text={tieneTecnico ? 'Reasignar Técnico' : 'Asignar Técnico'}>
									<Button
										variant='solid'
										color={tieneTecnico ? 'amber' : 'sky'}
										icon={tieneTecnico ? 'HeroArrowPath' : 'DuoAddUser'}
										onClick={() => {
											setDetalleSeleccionado(info.row.original.id);
											setIsOpenTecnico(true);
										}}
									/>
								</Tooltip>
								{otPendiente && (
									<Tooltip text='Eliminar Trabajo'>
										<EliminarDetalleTrabajo
											detalle_trabajo={info.row.original}
										/>
									</Tooltip>
								)}
							</>
						)}

					{/* EN PROCESO: Crear Seguimiento, Cotización, Compra */}
					{estadoActual === 'en_proceso' && otEnProceso && (
						<>
							<Tooltip text='Crear Seguimiento'>
								<Button
									variant='solid'
									color='blue'
									icon='HeroChatBubbleBottomCenterText'
									onClick={() => {
										setDetalleSeleccionado(info.row.original.id);
										setIsOpenSeguimiento(true);
									}}></Button>
							</Tooltip>
							
							{/* Botón Crear Cotización */}
							<CrearCotizacionDesdeOT
								detalleTrabajo={info.row.original}
								clienteId={detalleOrdenTrabajo?.cliente || 0}
								clienteNombre={detalleOrdenTrabajo?.cliente_nombre || ''}
								ordenId={detalleOrdenTrabajo?.id || 0}
								onSuccess={() => {
									// Opcional: recargar datos si es necesario
									dispatch(listaDetalleTrabajoOTThunk({ id_orden: detalleOrdenTrabajo?.id }));
								}}
							/>
							
							{/* TODO: Agregar botón Crear Compra Rápida */}
						</>
					)}						{/* PENDIENTE: Cambiar Estado (con requisitos) - permite cambiar en OT Pendiente o En Proceso */}
						{estadoActual === 'pendiente' && (otPendiente || otEnProceso) && (
							<Tooltip
								text={cumpleRequisitos ? 'Cambiar Estado' : getMensajeRequisitos()}>
								<span>
									<Button
										variant='solid'
										color='zinc'
										icon='HeroArrowPath'
										isDisable={!cumpleRequisitos}
										onClick={() => {
											if (cumpleRequisitos) {
												setIsOpenEstado(true);
											}
										}}
									/>
								</span>
							</Tooltip>
						)}

						{/* EN PROCESO / MED. COMPLETADO: Cambiar Estado - permite en OT Pendiente o En Proceso */}
						{(estadoActual === 'en_proceso' ||
							estadoActual === 'medianamente_completado') &&
							(otPendiente || otEnProceso) && (
								<Tooltip text='Cambiar Estado'>
									<Button
										variant='solid'
										color='zinc'
										icon='HeroArrowPath'
										onClick={() => {
											setIsOpenEstado(true);
										}}></Button>
								</Tooltip>
							)}

						{/* COMPLETADO/NO_REALIZADO: Reabrir - solo si OT en proceso */}
						{(estadoActual === 'completado' || estadoActual === 'no_realizado') &&
							(otPendiente || otEnProceso) && (
								<Tooltip text='Reabrir Trabajo'>
									<Button
										variant='solid'
										color='amber'
										icon='HeroArrowUturnLeft'
										onClick={() => {
											setIsOpenEstado(true);
										}}></Button>
								</Tooltip>
							)}

						{/* Modal Cambiar Estado */}
						<Modal isOpen={isOpenEstado} setIsOpen={setIsOpenEstado}>
							<ModalHeader>
								<Badge className='text-xl'>Cambiar Estado del Trabajo</Badge>
							</ModalHeader>
							<ModalBody>
								<div className='flex flex-col gap-4'>
									<div>
										<Badge>Estado Actual</Badge>
										<div className='ml-4 text-gray-600'>
											{estadoActual === 'pendiente' && '⏳ Pendiente'}
											{estadoActual === 'en_proceso' && '🔄 En Proceso'}
											{estadoActual === 'completado' && '✅ Completado'}
											{estadoActual === 'medianamente_completado' &&
												'🔶 Medianamente Completado'}
											{estadoActual === 'no_realizado' && '❌ No Realizado'}
										</div>
									</div>
									<div>
										<Badge>Nuevo Estado</Badge>
										<SelectReact
											name='estadoNuevo'
											options={optionsEstado}
											value={optionsEstado.find(
												(est) => est.value === estadoNuevo,
											)}
											noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
											placeholder='Seleccione el nuevo estado'
											onChange={(e) => {
												if (e) {
													setEstadoNuevo((e as TSelectOption).value);
												} else {
													setEstadoNuevo(undefined);
												}
											}}
										/>
									</div>
									<div>
										<Badge>Comentario (opcional)</Badge>
										<Textarea
											name='comentario'
											placeholder='Describa el motivo del cambio...'
											value={comentario}
											onChange={(e) => {
												setComentario(e.target.value);
											}}
										/>
									</div>
								</div>
							</ModalBody>
							<ModalFooter>
								<ModalFooterChild></ModalFooterChild>
								<ModalFooterChild>
									<Button
										color='red'
										onClick={() => {
											setIsOpenEstado(false);
											setEstadoNuevo(undefined);
											setComentario(undefined);
										}}>
										Cancelar
									</Button>
									<Button
										variant='solid'
										onClick={() => {
											if (estadoNuevo) {
												actualizarEstadoDetalle(
													info.row.original.id,
													estadoNuevo,
													comentario,
												);
												setIsOpenEstado(false);
												setEstadoNuevo(undefined);
												setComentario(undefined);
											} else {
												toast.error('Seleccione un estado', {
													toastId: 'Seleccione un estado',
												});
											}
										}}>
										Guardar
									</Button>
								</ModalFooterChild>
							</ModalFooter>
						</Modal>
					</div>
				);
			},
			header: 'Acciones',
		}),
	];

	const table = useReactTable({
		data: listaDetalleTrabajoOT,
		columns: columns,
		state: {
			sorting: sorting,
			globalFilter: globalFilter,
		},
		onSortingChange: setSorting,
		enableGlobalFilter: true,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	async function actualizarEstadoDetalle(
		id_detalle_trabajo: number | string,
		estado: string,
		comentario?: string,
	) {
		try {
			const response = await ApiService.fetchData({
				url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${id_detalle_trabajo}/`,
				method: 'patch',
				headers: { 'Content-Type': 'application/json' },
				data: JSON.stringify({ estado }),
			});
			if (response.data) {
				if (comentario) {
					const responseSeguimiento = await ApiService.fetchData({
						url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${id_detalle_trabajo}/seguimientos/`,
						method: 'post',
						headers: { 'Content-Type': 'application/json' },
						data: JSON.stringify({
							comentario: comentario,
							tipo: 'incidencia',
							detalle_trabajo: id_detalle_trabajo,
							usuario: usuarioEmpresaLogeado?.id,
						}),
					});
					if (responseSeguimiento.data) {
						toast.success('Estado cambiado', { autoClose: 1000 });
						dispatch(listaDetalleTrabajoOTThunk({ id_orden: detalleOrdenTrabajo?.id }));
						return true;
					}
				} else {
					toast.success('Estado cambiado', { autoClose: 1000 });
					dispatch(listaDetalleTrabajoOTThunk({ id_orden: detalleOrdenTrabajo?.id }));
					return true;
				}
			}
		} catch (error: any) {
			const mensajesError = Object.values(error.response.data).flat().join(' ');
			toast.error(mensajesError || 'Error al cambiar el estado', {
				toastId: 'Error al cambiar el estado',
			});
			return false;
		}
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardHeaderChild>
						<Badge className='text-xl'>Detalles del Trabajo</Badge>
					</CardHeaderChild>
					<CardHeaderChild>
						<AnimacionDeInputModoMovil
							globalFilter={globalFilter}
							setGlobalFilter={setGlobalFilter}
							anchoInput={200}>
							{detalleOrdenTrabajo &&
								(detalleOrdenTrabajo.estado === 'pendiente' ||
									detalleOrdenTrabajo.estado === 'en_proceso') && (
									<CrearDetalleTrabajoOT />
								)}
						</AnimacionDeInputModoMovil>
					</CardHeaderChild>
				</CardHeader>
				<CardBody className='z-0'>
					<div className='overflow-auto'>
						{listaDetalleTrabajoOT.length > 0 ? (
							<>
								<Table className='min-w-[800px] table-fixed'>
									<THead>
										{table.getHeaderGroups().map((headerGroup) => (
											<Tr key={headerGroup.id}>
												{headerGroup.headers.map((header) => (
													<Th
														style={{ width: header.column.getSize() }}
														key={header.id}
														isColumnBorder={false}
														className='text-left'>
														{header.isPlaceholder ? null : (
															<div
																key={header.id}
																aria-hidden='true'
																{...{
																	className:
																		header.column.getCanSort()
																			? 'cursor-pointer select-none flex items-center'
																			: '',
																	onClick:
																		header.column.getToggleSortingHandler(),
																}}>
																{flexRender(
																	header.column.columnDef.header,
																	header.getContext(),
																)}
																{{
																	asc: (
																		<Icon
																			icon='HeroChevronUp'
																			className='ltr:ml-1.5 rtl:mr-1.5'
																		/>
																	),
																	desc: (
																		<Icon
																			icon='HeroChevronDown'
																			className='ltr:ml-1.5 rtl:mr-1.5'
																		/>
																	),
																}[
																	header.column.getIsSorted() as string
																] ?? null}
															</div>
														)}
													</Th>
												))}
											</Tr>
										))}
									</THead>
									<TBody>
										{table.getRowModel().rows.map((row) => (
											<Tr key={row.id}>
												{row.getVisibleCells().map((cell) => (
													<Td key={cell.id}>
														{flexRender(
															cell.column.columnDef.cell,
															cell.getContext(),
														)}
													</Td>
												))}
											</Tr>
										))}
									</TBody>
								</Table>
								<div className='mt-2 min-w-[800px]'>
									<TableCardFooterTemplateV2 table={table} />
								</div>
							</>
						) : (
							<div className='text-center text-gray-500'>
								No se encontraron detalles.
							</div>
						)}
					</div>
				</CardBody>
			</Card>
			<AñadirTrabajoDT
				detalleSeleccionado={detalleSeleccionado}
				isOpen={isOpen}
				setIsOpen={setIsOpen}
			/>
			<AsignarTecnicoDT
				isOpen={isOpenTecnico}
				setIsOpen={setIsOpenTecnico}
				detalle={detalleSeleccionado}
				setDetalleSeleccionado={setDetalleSeleccionado}
			/>
			<DetalledelDT
				isOpen={isOpenDetalle}
				setIsOpen={setIsOpenDetalle}
				detalleSeleccionado={detalleSeleccionado}
				setDetalleSeleccionado={setDetalleSeleccionado}
			/>
			<AgregarInsumoADT
				isOpen={isOpenInsumo}
				setIsOpen={setIsOpenInsumo}
				detalleSeleccionado={detalleSeleccionado}
				setDetalleSeleccionado={setDetalleSeleccionado}
			/>
			<ListaEntregasDT
				isOpen={isOpenEntregas}
				setIsOpen={setIsOpenEntregas}
				detalleSeleccionado={detalleSeleccionado}
				setDetalleSeleccionado={setDetalleSeleccionado}
			/>
			<ListaAsistenciasDT
				isOpen={isOpenVisitas}
				setIsOpen={setIsOpenVisitas}
				detalleSeleccionado={detalleSeleccionado}
				setDetalleSeleccionado={setDetalleSeleccionado}
			/>
			<CrearSeguimientoDT
				isOpen={isOpenSeguimiento}
				setIsOpen={setIsOpenSeguimiento}
				detalleSeleccionado={detalleSeleccionado}
				setDetalleSeleccionado={setDetalleSeleccionado}
			/>
			<TerminarInsumoDT
				isOpen={isOpenDevolucion}
				setIsOpen={setIsOpenDevolucion}
				detalleSeleccionado={detalleSeleccionado}
				setDetalleSeleccionado={setDetalleSeleccionado}
			/>
		</>
	);
>>>>>>> Stashed changes
}

export default ListaDetalleTrabajoOT