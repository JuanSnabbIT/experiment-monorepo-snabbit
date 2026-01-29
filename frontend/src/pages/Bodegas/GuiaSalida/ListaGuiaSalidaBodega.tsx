import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Icon from "@/components/icon/Icon"
import Container from "@/components/layouts/Container/Container"
import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper"
import Subheader, { SubheaderLeft, SubheaderRight } from "@/components/layouts/Subheader/Subheader"
import ConfirmarEliminar from "@/components/modals/ConfirmarEliminar"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card, { CardBody } from "@/components/ui/Card"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import Tooltip from "@/components/ui/Tooltip"
import { IGuiaSalida } from "@/interface/bodega.interface"
import ApiService from "@/services/ApiService"
import { LIMPIAR_LISTA_GUIA_SALIDA_POR_BODEGA, listaBodegasThunk, listaGuiaSalidaPorBodegaThunk, listaUsuariosDeMisClientesThunk, useAppDispatch, useAppSelector, usuarioEmpresaLogeadoThunk } from "@/store"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import dayjs from "dayjs"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import AprobarGuiaSalida from "./modals/AprobarGuiaSalida"
import CrearGuiaSalidaBodega from "./modals/CrearGuiaSalidaBodega"
import FirmarEntregarGuia from "./modals/FirmarEntregarGuia"
import VolverAPendienteGuiaSalida from "./modals/VolverAPendienteGuiaSalida"


const columnHelper = createColumnHelper<IGuiaSalida>()

function ListaGuiaSalidaBodega() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const { listaGuiaSalidaPorBodega, listaBodegas } = useAppSelector((state) => state.bodega)
    const [optBodegas, setOptBodegas] = useState<{value: string, label: string}[]>([])
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [bodegaSelected, setBodegaSelected] = useState<string | undefined>()
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [isOpenFirma, setIsOpenFirma] = useState<boolean>(false)
    const [guiaSelected, setGuiaSelected] = useState<number | undefined>(undefined)

    useEffect(() => {
        if (isOpen && personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaUsuariosDeMisClientesThunk({id_empresa: personalizacionUsuario.empresa}))
        }
    }, [isOpen, personalizacionUsuario])

    useEffect(() => {
        if (isOpenFirma && personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaUsuariosDeMisClientesThunk({id_empresa: personalizacionUsuario?.empresa}))
        }
    }, [isOpenFirma, personalizacionUsuario])

    useEffect(() => {
        if (listaGuiaSalidaPorBodega) {
            dispatch(LIMPIAR_LISTA_GUIA_SALIDA_POR_BODEGA())
        }
        dispatch(usuarioEmpresaLogeadoThunk({id_usuario: personalizacionUsuario?.usuario}))
    }, [])

    useEffect(() => {
        if (personalizacionUsuario) {
            dispatch(listaBodegasThunk())
        }
    }, [personalizacionUsuario])

    useEffect(() => {
        if (bodegaSelected) {
            dispatch(listaGuiaSalidaPorBodegaThunk({id_bodega: bodegaSelected}))
        }
    }, [bodegaSelected])

    useEffect(() => {
        if (listaBodegas.length > 0) {
            setOptBodegas(listaBodegas.map(bod => {return {value: bod.id.toString(), label: bod.nombre}}))
        }
    }, [listaBodegas])

    useEffect(() => {
        // Seleccionar automáticamente la primera bodega disponible para evitar vista vacía
        if (!bodegaSelected && listaBodegas.length > 0) {
            setBodegaSelected(listaBodegas[0].id.toString())
        }
    }, [listaBodegas, bodegaSelected])

    const columns = [
        columnHelper.accessor("id", {
            cell: (info) => info.getValue(),
            header: "N°",
            size: 20
        }),
        columnHelper.accessor("estado_label", {
            cell: (info) => info.getValue(),
            header: "Estado"
        }),
        columnHelper.accessor("nombre_creado_por", {
            cell: (info) => info.getValue(),
            header: "Creado Por"
        }),
        columnHelper.accessor("nombre_recibido_por", {
            cell: (info) => info.getValue(),
            header: "Recibido Por"
        }),
        columnHelper.accessor("fecha_creacion", {
            cell: (info) => (
                <div>{dayjs(info.row.original.fecha_creacion).format('DD-MM-YYYY')}</div>
            ),
            header: "Fecha de Creacion"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div className="flex flex-wrap gap-2">
                    <Tooltip text="Ver Detalle">
                        <Button variant="solid" color="violet" icon="HeroEye" onClick={() => {navigate(`/bodega/detalle-guia-salida-bodega/${info.row.original.id}`)}} />
                    </Tooltip>
                    {info.row.original.estado === "P" && (
                        <ConfirmarEliminar
                            mensaje={`Estas a punto de eliminar esta asistencia en ${info.row.original.id} ¿desea continuar?`}
                            onDispatch={() => {dispatch(listaGuiaSalidaPorBodegaThunk({id_bodega: bodegaSelected}))}}
                            peticionUrl={`/api/guia-salida/${info.row.original.id}/`}
                        />
                    )}
                    {info.row.original.estado === "ER" && (
                        (() => {
                            const soporte = info.row.original.soporte_tecnico;
                            const faltaDatosSoporte = typeof soporte === 'object' && soporte !== null ? !!soporte.falta_datos : false;
                            const disabled = !!faltaDatosSoporte;
                            const tooltip = disabled ? "Faltan datos en la OT (asignar técnico y fecha)" : "Firmar para Aprobar Guia";
                            return (
                                <Tooltip text={tooltip}>
                                    <div className={disabled ? "opacity-60 cursor-not-allowed" : ""}>
                                        <Button
                                            variant="solid"
                                            isDisable={disabled}
                                            onClick={() => {
                                                if (disabled) return;
                                                setIsOpen(true);
                                                setGuiaSelected(info.row.original.id);
                                            }}
                                            icon="HeroPencil"
                                            color="emerald"
                                        />
                                    </div>
                                </Tooltip>
                            );
                        })()
                    )}
                    {info.row.original.estado === "ET" && (
                        <>
                            <Tooltip text="Devolución Parcial">
                                <Button variant="solid" color="amber" icon="DuoIncomingBox" onClick={() => {navigate(`/bodega/devolucion-parcial-guia-salida-bodega/${info.row.original.id}`)}} />
                            </Tooltip>
                            <Tooltip text="Devolución Completa">
                                <Button variant="solid" color="emerald" icon="HeroInboxArrowDown" onClick={async () => {
                                    try {
                                        const response = await ApiService.fetchData({url: `/api/guia-salida/${info.row.original.id}/devolver_a_bodega/`, method: 'post', headers: {'Content-Type': 'application/json'}})
                                        if (response.data) {
                                            toast.success("Se devolvieron todos los items a bodega", {autoClose: 1000})
                                            dispatch(listaGuiaSalidaPorBodegaThunk({id_bodega: bodegaSelected}))
                                        }
                                    } catch (error:any) {
                                        toast.error(error.response.data.detail)
                                    }
                                }} />
                            </Tooltip>
                            <Tooltip text="Firmar para Entregar">
                                <Button variant="solid" color="lime" icon="DuoArchive" onClick={() => {setIsOpenFirma(true)}}></Button>
                            </Tooltip>
                            <Tooltip text="Terminar Guia">
                                <Button variant="solid" color="sky" icon="DuoBox3" onClick={async () => {
                                    try {
                                        const response = await ApiService.fetchData({url: `/api/guia-salida/${info.row.original.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({estado: "T"})})
                                        if (response.data) {
                                            toast.success("Guia terminada", {autoClose: 1000})
                                            dispatch(listaGuiaSalidaPorBodegaThunk({id_bodega: bodegaSelected}))
                                        }
                                    } catch (error: any) {
                                        const mensajesError = Object.values(error.response.data).flat().join(" ");
                                        toast.error(mensajesError || "Error al terminar la guia", {toastId: "Error al terminar la guia"})
                                    }
                                }}></Button>
                            </Tooltip>
                        </>
                    )}
                    {info.row.original.estado === "ER" && (
                        <VolverAPendienteGuiaSalida guia_salida={info.row.original} />
                    )}
                    {(["ER", "FR", "R", "PR", "E", "T"].includes(info.row.original.estado)) && (
                        <Tooltip text="Descargar PDF">
                             <Button 
                                variant="solid" 
                                color="red" 
                                icon="HeroDocumentArrowDown" 
                                onClick={async () => {
                                    try {
                                        const response = await ApiService.fetchData<BlobPart>({
                                            url: `/api/guia-salida/${info.row.original.id}/descargar-pdf/`,
                                            method: 'get',
                                            responseType: 'blob',
                                        });
                                        if (response.data) {
                                            const url = window.URL.createObjectURL(new Blob([response.data]));
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.setAttribute(
                                                'download',
                                                `Guia_Salida_${info.row.original.id}.pdf`,
                                            );
                                            document.body.appendChild(link);
                                            link.click();
                                            link.remove();
                                            window.URL.revokeObjectURL(url);
                                        }
                                    } catch (error: any) {
                                        toast.error("Error al descargar PDF");
                                    }
                                }} 
                             />
                        </Tooltip>
                    )}
                </div>
            )
        })
    ]

    const table = useReactTable({
        data: listaGuiaSalidaPorBodega,
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
    });

    return (
        <PageWrapper isProtectedRoute={true} name="Lista Guias de Salida Bodega" title="Lista Guias de Salida Bodega">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Guias de Salida de Bodega</Badge>
                </SubheaderLeft>
                <SubheaderRight className="w-full md:w-auto">
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                        <div>
                            {optBodegas.length > 4 ? (
                                <div className="min-w-[100px]">
                                    <SelectReact
                                        name="bodega"
                                        options={optBodegas}
                                        onChange={(e) => {setBodegaSelected((e as TSelectOption).value)}}
                                        placeholder="Seleccione una bodega"
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-row gap-4 overflow-auto">
                                    {optBodegas.map((bod, index) => (
                                        <Button
                                            key={index}
                                            {...(bodegaSelected === bod.value ? {size: 'sm', rounded: 'rounded-full', className: 'border', isActive: true, colorIntensity: '500', variant: 'solid', color: 'blue'} : {size: 'sm', color: 'zinc', rounded: 'rounded-full', className: 'border'})}
                                            onClick={async () => {
                                                setBodegaSelected(bod.value);
                                            }}
                                        >{bod.label}</Button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <Input
                                name="globalFilter"
                                placeholder="Buscar..."
                                value={globalFilter}
                                onChange={(e) => {setGlobalFilter(e.target.value)}}
                            />
                        </div>
                        <CrearGuiaSalidaBodega />
                    </div>
                </SubheaderRight>
            </Subheader>
            <Container className="w-full h-full">
                <div className="w-full">
                    <Card>
                        <CardBody className="z-0">
                            <div className="overflow-auto">
                                <Table className='table-fixed min-w-[900px]'>
                                    <THead>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <Tr key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <Th
                                                        key={header.id}
                                                        style={{ width: header.column.getSize() }}
                                                        isColumnBorder={false}
                                                        className='text-left'>
                                                        {header.isPlaceholder ? null : (
                                                            <div
                                                                key={header.id}
                                                                aria-hidden='true'
                                                                {...{
                                                                    className: header.column.getCanSort()
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
                                <div className="mt-2 min-w-[900px]">
                                    <TableCardFooterTemplateV2 table={table} />
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </Container>
            <AprobarGuiaSalida id_guia={guiaSelected} bodegaSelected={bodegaSelected} isOpen={isOpen} setIsOpen={setIsOpen} />
            <FirmarEntregarGuia id_guia={guiaSelected} bodegaSelected={bodegaSelected} isOpen={isOpenFirma} setIsOpen={setIsOpenFirma} />
        </PageWrapper>
    )
}

export default ListaGuiaSalidaBodega
