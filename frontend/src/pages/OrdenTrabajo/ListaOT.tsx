import { useEffect, useState } from 'react'
import { listaOrdenTrabajoThunk, RootState, useAppDispatch, useAppSelector } from '@/store'
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
import { IOrdenDeTrabajo } from '@/interface/ordenTrabajo.interface'
import dayjs from 'dayjs'
import CrearOrdenOT from './modals/CrearOrdenOT'
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil'


const columnHelper = createColumnHelper<IOrdenDeTrabajo>()

const ListaOT = () => {
	const dispatch = useAppDispatch()
	const navigate = useNavigate()
	const { listaOrdenTrabajo } = useAppSelector((state: RootState) => state.ordenTrabajo)
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState<string>('');
 
    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaOrdenTrabajoThunk())
        }
    }, [personalizacionUsuario])

    const columns = [
        columnHelper.accessor("id", {
            cell: (info) => info.getValue(),
            header: "N°",
            size: 20
        }),
        columnHelper.accessor("empresa_nombre", {
            cell: (info) => info.getValue(),
            header: "Empresa"
        }),
        columnHelper.accessor("cliente_nombre", {
            cell: (info) => info.getValue(),
            header: "Cliente"
        }),
        columnHelper.accessor("fecha_inicio_ot", {
            cell: (info) => (
                <div>{dayjs(info.row.original.fecha_inicio_ot).format('DD/MM/YYYY')}</div>
            ),
            header: "Fecha Inicio"
        }),
        columnHelper.accessor("fecha_finalizacion_ot", {
            cell: (info) => (
                <div>{dayjs(info.row.original.fecha_finalizacion_ot).format('DD/MM/YYYY')}</div>
            ),
            header: "Fecha Finalización"
        }),
        columnHelper.accessor("estado_label", {
            cell: (info) => info.getValue(),
            header: "Estado"
        }),
        columnHelper.accessor("prioridad_label", {
            cell: (info) => info.getValue(),
            header: "Prioridad"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div className="flex justify-center gap-2">
                    <Tooltip text="Detalle Orden">
                        <Button color='violet' variant="solid" onClick={() => {navigate(`/orden-trabajo/detalle-orden-trabajo/${info.row.original.id}/`)}} icon="HeroEye"></Button>
                    </Tooltip>
                    <ModalEliminar 
                        mensaje={`Estas a punto de eliminar la orden de trabajo del ${info.row.original.fecha_inicio_ot} ¿desea continuar?`} 
                        peticionUrl={`/api/ordenes-trabajo/${info.row.original.id}/`}
                        onDispatch={() => dispatch(listaOrdenTrabajoThunk())}
                    >
                        Eliminar
                    </ModalEliminar>
                </div>
            )
        })
    ]

    const table = useReactTable({
        data: listaOrdenTrabajo,
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
        <PageWrapper isProtectedRoute={true} name="Ordenes de Trabajo" title="Ordenes de Trabajo">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Ordenes de Trabajo</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <AnimacionDeInputModoMovil globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} anchoInput={100}>
                        <CrearOrdenOT />
                    </AnimacionDeInputModoMovil>
                </SubheaderRight>
            </Subheader>
            <Container className="w-full h-full">
                <Card>
                    <CardBody className='z-0'>
                        <div className="overflow-auto">
                            <Table className='table-fixed min-w-[800px]'>
                                <THead>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <Tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <Th
                                                    key={header.id}
                                                    style={{width: header.column.getSize()}}
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
                            <div className="mt-2 min-w-[800px]">
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    )
}

export default ListaOT