import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { listaOrdenTrabajoThunk } from '@/store/slices/ordenTrabajo/ordenTrabajoSlice'
import Card, { CardBody } from '@/components/ui/Card'
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper'
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader'
import Container from '@/components/layouts/Container/Container'
import { IOrdenDeTrabajo } from '@/interface/ordenTrabajo.interface'
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table'
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table'
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2'
import Tooltip from '@/components/ui/Tooltip'
import Button from '@/components/ui/Button'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil'

const columnHelper = createColumnHelper<IOrdenDeTrabajo>()

const FacturacionesList = () => {
    const dispatch = useAppDispatch()
    const { listaOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo)
    const [sorting, setSorting] = useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState<string>('')
    const navigate = useNavigate()
  
    useEffect(() => {
        dispatch(listaOrdenTrabajoThunk(undefined))
    }, [dispatch])

    // Filtrar solo OTs con estado "completada"
    const facturacionesDisponibles = listaOrdenTrabajo.filter((ot: IOrdenDeTrabajo) => ot.estado === 'completada')

    const columns = [
        columnHelper.accessor("cliente_nombre", {
            cell: (info) => (
                <div>{info.row.original.cliente_nombre || 'Sin cliente'}</div>
            ),
            header: "Cliente"
        }),
        columnHelper.accessor("id", {
            cell: (info) => (
                <div>OT #{info.row.original.id}</div>
            ),
            header: "Número OT"
        }),
        columnHelper.accessor("fecha_finalizacion_ot", {
            cell: (info) => (
                <div>{info.row.original.fecha_finalizacion_ot ? dayjs(info.row.original.fecha_finalizacion_ot).format("DD/MM/YYYY") : '-'}</div>
            ),
            header: "Fecha Finalización"
        }),
        columnHelper.accessor("estado_label", {
            cell: () => (
                <div className="font-medium text-green-600">Completada</div>
            ),
            header: "Estado"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div className="flex justify-center">
                    <Button 
                        color='violet' 
                        variant="solid" 
                        onClick={() => navigate(`/facturacion/cierre-ot/${info.row.original.id}`)} 
                        icon="HeroEye"
                        title="Ver Facturación"
                    />
                </div>
            )
        })
    ]

    const table = useReactTable({
        data: facturacionesDisponibles,
        columns: columns,
        state: {
            sorting: sorting,
            globalFilter: globalFilter,
        },
        onSortingChange: setSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    return (
        <PageWrapper name="Facturaciones">
            <Subheader>
                <SubheaderLeft>
                    <AnimacionDeInputModoMovil 
                        globalFilter={globalFilter} 
                        setGlobalFilter={setGlobalFilter}
                    />
                </SubheaderLeft>
                <SubheaderRight>
                    <div></div>
                </SubheaderRight>
            </Subheader>

            <Container className="flex flex-col gap-2">
                <Card>
                    <CardBody>
                        <div className="overflow-x-auto">
                            <Table>
                                <THead>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <Tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <Th key={header.id} onClick={header.column.getToggleSortingHandler()} className="cursor-pointer">
                                                    {header.isPlaceholder ? null : (
                                                        <div>
                                                            {flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext()
                                                            )}
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
                        </div>
                        <TableCardFooterTemplateV2 table={table} />
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    )
}

export default FacturacionesList
