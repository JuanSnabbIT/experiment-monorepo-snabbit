import { useEffect, useState } from 'react'
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table'
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table'
import Icon from '@/components/icon/Icon'
import { ICotizacionEnOT } from '@/interface/ordenTrabajo.interface'
import DetalleCotizacionOT from './modals/DetalleCotizacionOT'
import ModalEliminar from '@/pages/Items/Proveedor/modals/ModalEliminar'
import { listaCotizacionesOTThunk, listaUsuariosEmpresaYClienteThunk, useAppDispatch, useAppSelector } from '@/store'
import CrearCotizacionOT from './modals/CrearCotizacionOT'
import Input from '@/components/form/Input'
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2'


const columnHelper = createColumnHelper<ICotizacionEnOT>()

const TablaCotizacion = ({id_ot}: {id_ot: number | string | undefined}) => {
    const dispatch = useAppDispatch()
    const { detalleOrdenTrabajo, listaCotizacionesOT } = useAppSelector((state) => state.ordenTrabajo)
    const [sorting, setSorting] = useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState<string>('')

    useEffect(() => {
        if (detalleOrdenTrabajo) {
            dispatch(listaUsuariosEmpresaYClienteThunk({ids_empresa: [detalleOrdenTrabajo.empresa, detalleOrdenTrabajo.cliente]}))
        }
    }, [])
    

    const columns = [
        columnHelper.accessor("numero_cotizacion", {
            cell: (info) => info.getValue(),
            header: "Cotizacion"
        }),
        columnHelper.accessor("usuario_nombre", {
            cell: (info) => info.getValue(),
            header: "Aceptado por"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div className="flex gap-2">
                    <DetalleCotizacionOT valuess={info.row.original} />
                    {(detalleOrdenTrabajo?.estado !== "2" && detalleOrdenTrabajo?.estado !== "4") && (
                        <ModalEliminar 
                            mensaje={`Estas seguro que deseas eliminar el detalle ${info.row.original.orden} de la cotizacion ${info.row.original.cotizacion} ¿desea continuar?`} 
                            peticionUrl={`/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/cotizaciones/${info.row.original.id}/`} 
                            onDispatch={() => dispatch(listaCotizacionesOTThunk({id_ot: detalleOrdenTrabajo?.id}))}>
                        </ModalEliminar>
                    )}
                </div>
            ),
            header: ""
        })
    ]

    const table = useReactTable({
        data: listaCotizacionesOT,
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
                    <Badge className="text-xl">Cotizacion OT</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    <div className="flex justify-between items-center gap-4">
                        <CrearCotizacionOT id_ot={id_ot}/>
                        <Input
                            name="globalFilter"
                            placeholder="Buscar..."
                            value={globalFilter}
                            onChange={(e) => {setGlobalFilter(e.target.value)}}
                        />
                    </div>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className="overflow-auto">
                <Table className='table-fixed min-w-[600px]'>
                    <THead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <Tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <Th
                                    key={header.id}
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
                                            onClick: header.column.getToggleSortingHandler(),
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
                <div className="mt-2 min-w-[600px]">
                    <TableCardFooterTemplateV2 table={table} />
                </div>
            </CardBody>
        </Card>
    )
}

export default TablaCotizacion
