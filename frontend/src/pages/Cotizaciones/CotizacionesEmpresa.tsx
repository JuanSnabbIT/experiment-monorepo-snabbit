import { useEffect, useState } from 'react'
import { listaCotizacionesSucursalThunk, useAppDispatch, useAppSelector } from '@/store'
import Card, { CardBody } from '@/components/ui/Card'
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper'
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader'
import Badge from '@/components/ui/Badge'
import Container from '@/components/layouts/Container/Container'
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table'
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table'
import Icon from '@/components/icon/Icon'
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2'
import Tooltip from '@/components/ui/Tooltip'
import Button from '@/components/ui/Button'
import { useNavigate } from 'react-router-dom'
import ModalEliminar from '@/pages/Items/Proveedor/modals/ModalEliminar'
import { ICotizacion } from '@/interface/cotizaciones.interface'
import CrearCotizacion from './modals/CrearCotizacion'
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil'


const columnHelper = createColumnHelper<ICotizacion>()

const CotizacionesEmpresa = () => {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { listaCotizaciones } = useAppSelector((state) => state.cotizacion)
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        dispatch(listaCotizacionesSucursalThunk())
    }, [personalizacionUsuario])

    const columns = [
        columnHelper.accessor("cliente_nombre", {
            cell: (info) => info.getValue(),
            header: "Cliente"
        }),
        columnHelper.accessor("numero_cotizacion", {
            cell: (info) => info.getValue(),
            header: "Número de Cotización"
        }),
        columnHelper.accessor("estado_label", {
            cell: (info) => info.getValue(),
            header: "Estado"
        }),
        columnHelper.accessor("tipo_moneda_label", {
            cell: (info) => info.getValue(),
            header: "Tipo de Moneda"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div className="flex justify-center gap-2">
                    <Tooltip text="Detalle Cotización">
                        <Button variant="solid" color='violet' onClick={() => {navigate(`/cotizacion/detalle-cotizacion/${info.row.original.numero_cotizacion}/`)}} icon="HeroEye"></Button>
                    </Tooltip>
                    <ModalEliminar
                        mensaje={`Estas a punto de eliminar la cotización ${info.row.original.numero_cotizacion}. ¿Desea continuar?`} 
                        peticionUrl={`/api/cotizaciones/${info.row.original.id}/`}
                        onDispatch={() => {dispatch(listaCotizacionesSucursalThunk())}}
                    >
                        Eliminar
                    </ModalEliminar>

                </div>
            )
        })
    ]

    const table = useReactTable({
        data: listaCotizaciones,
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
        <PageWrapper isProtectedRoute={true} name="Cotizaciones Clientes" title="Cotizaciones Clientes">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Cotizaciones Clientes</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <AnimacionDeInputModoMovil globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} anchoInput={200}>
                        <CrearCotizacion empresa={true} />
                    </AnimacionDeInputModoMovil>
                </SubheaderRight>
            </Subheader>
            <Container className="w-full h-full">
                <Card>
                    <CardBody className='z-0'>
                        <div className="overflow-auto">
                            <Table className='table-fixed min-w-[700px]'>
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
                            <div className="mt-2 min-w-[700px]">
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    )
}

export default CotizacionesEmpresa 