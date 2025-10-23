import Icon from "@/components/icon/Icon"
import Badge from "@/components/ui/Badge"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import { IUsuarioVinculado } from "@/interface/ordenTrabajo.interface"
import { listaUsuariosVinculadosOTThunk, useAppDispatch, useAppSelector } from "@/store"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import { useEffect, useState } from "react"
import CrearUsuarioAsignadoOT from "../modals/CrearUsuarioAsignadoOT"
import ModalEliminar from "@/pages/Items/Proveedor/modals/ModalEliminar"


const columnHelper = createColumnHelper<IUsuarioVinculado>()

function UsuariosVinculadosOT() {
    const dispatch = useAppDispatch()
    const { detalleOrdenTrabajo, listaUsuariosVinculadosOT } = useAppSelector((state) => state.ordenTrabajo)
    const [sorting, setSorting] = useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState<string>('')

    useEffect(() => {
        if (detalleOrdenTrabajo) {
            dispatch(listaUsuariosVinculadosOTThunk({id_orden: detalleOrdenTrabajo.id}))
        }
    }, [detalleOrdenTrabajo])

    const columns = [
        columnHelper.display({
            id: "usuario",
            cell: (info) => (
                <div>
                    {info.row.original.usuario_empresa ? (
                        <>
                            <div>{info.row.original.datos_usuario?.nombre}</div>
                            <div className="text-sm">Correo: {info.row.original.datos_usuario?.correo}</div>
                        </>
                    ) : (
                        <>
                            <div>{info.row.original.usuario_externo}</div>
                            <div className="text-sm">Correo: {info.row.original.correo_usuario_externo}</div>
                        </>
                    )}
                </div>
            ),
            header: "Usuario"
        }),
        columnHelper.display({
            id: "es_usuario_empresa",
            cell: (info) => (
                <div>{info.row.original.usuario_empresa ? "Si" : "No"}</div>
            ),
            header: "¿Es Usuario Empresa?"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div>
                    {(detalleOrdenTrabajo?.estado === "pendiente" || detalleOrdenTrabajo?.estado === "en_proceso") && (
                        <ModalEliminar
                            mensaje="¿Esta seguro de desvincular a este usuario de la OT?"
                            onDispatch={() => {
                                dispatch(listaUsuariosVinculadosOTThunk({id_orden: detalleOrdenTrabajo.id}))
                            }}
                            peticionUrl={`/api/ordenes-trabajo/${detalleOrdenTrabajo.id}/usuarios-vinculados/${info.row.original.id}/`}
                            nombre="Usuario"
                        />
                    )}
                </div>
            )
        })
    ]

    const table = useReactTable({
        data: listaUsuariosVinculadosOT,
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

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className="text-xl">Usuarios Vinculados</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    <CrearUsuarioAsignadoOT />
                </CardHeaderChild>
            </CardHeader>
            <CardBody className="z-0">
                <div className="overflow-auto">
                    {listaUsuariosVinculadosOT.length > 0 ? (
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
                        <div className="text-center text-gray-500">No se encontraron usuarios.</div>
                    )}
                </div>
            </CardBody>
        </Card>
    )
}

export default UsuariosVinculadosOT