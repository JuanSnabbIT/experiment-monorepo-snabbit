import Icon from '@/components/icon/Icon'
import Container from '@/components/layouts/Container/Container'
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper'
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader'
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table'
import Tooltip from '@/components/ui/Tooltip'
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil'
import { IRendicion } from '@/interface/rendicion.interface'
import { listaMisRendicionesThunk, listaRendicionesThunk, useAppDispatch, useAppSelector } from '@/store'
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2'
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'


const columnHelper = createColumnHelper<IRendicion>()

const ListaMisRendiciones = () => {
    const dispatch = useAppDispatch()
    const { listaMisRendiciones } = useAppSelector((state) => state.rendicion)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const navigate = useNavigate()
    
    useEffect(() => {
        dispatch(listaMisRendicionesThunk())
    }, [dispatch])

    const columns = [
        columnHelper.accessor("datos_usuario.nombre_usuario", {
            cell: (info) => (
                <div>{info.row.original.datos_usuario.nombre_usuario}</div>
            ),
            header: "Usuario"
        }),
        columnHelper.accessor("estado", {
            cell: (info) => (
                <div>{info.row.original.estado_label}</div>
            ),
            header: "Estado"
        }),
        columnHelper.accessor("fecha_rendicion", {
            cell: (info) => (
                <div>{dayjs(info.row.original.fecha_rendicion).format("DD/MM/YYYY")}</div>
            ),
            header: "Fecha Rendición"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div className="flex justify-center space-x-2">
                    <Tooltip text="Detalle Sucursal">
                        <Button variant="solid" color='violet' onClick={() => {navigate(`/rendicion/detalle-rendicion/${info.row.original.id}/`)}} icon="HeroEye"></Button>
                    </Tooltip>
                    {(info.row.original.estado === "0" || info.row.original.estado === "1" || info.row.original.estado === "3") && (
                        <ConfirmarEliminar 
                            mensaje={`Estas a punto de eliminar la Redencion del ${info.row.original.fecha_rendicion} ¿desea continuar?`} 
                            peticionUrl={`/api/rendiciones/${info.row.original.id}/`}
                            onDispatch={() => dispatch(listaRendicionesThunk())}
                        />
                    )}
                </div>
            )
        })
    ]

    const table = useReactTable({
        data: listaMisRendiciones,
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
        <PageWrapper isProtectedRoute={true} name="Mis Rendiciones" title="Mis Rendiciones">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Mis Rendiciones</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <div className="flex justify-between items-center">
                        <AnimacionDeInputModoMovil globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} anchoInput={200}>
                            {/* OCULTADO PORQUE SE CREAN AUTOMATICAMENTE */}
                            {/* <CrearRendicion tipo="0" /> */}
                        </AnimacionDeInputModoMovil>
                    </div>
                </SubheaderRight>
            </Subheader>
            <Container className="w-full h-full">
                <Card>
                    <CardBody className='z-0'>
                        <div className="overflow-auto">
                            <Table className='table-fixed min-w-[600px]'>
                                <THead>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <Tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <Th
                                                    key={header.id}
                                                    isColumnBorder={false}
                                                    style={{width: header.getSize()}}
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
                            <div className="mt-2 min-w-[600px]">
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    )
}

export default ListaMisRendiciones