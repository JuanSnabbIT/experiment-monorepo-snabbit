import Input from "@/components/form/Input"
import SelectReact from "@/components/form/SelectReact"
import Icon from "@/components/icon/Icon"
import Badge from "@/components/ui/Badge"
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import { IUsuarioEmpresa } from "@/interface/empresas.interface"
import { listaUsuariosClienteThunk, useAppDispatch, useAppSelector } from "@/store"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import { useEffect, useState } from "react"


const columnHelper = createColumnHelper<IUsuarioEmpresa>()

function TablaUsuariosDelCliente() {
    const dispatch = useAppDispatch()
    const { detalleCliente, listaUsuariosCliente } = useAppSelector((state) => state.empresa)
    const [sucursalSelected, setSucursalSelected] = useState<{value: string, label: string}>()
    const [optionSucursal, setOptionSucursal] = useState<{value: string, label: string}[]>([])
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('')

    useEffect(() => {
        if (detalleCliente) {
            setOptionSucursal(detalleCliente.info_cliente.sucursales.map((suc) => {return {value: suc.id.toString(), label: suc.nombre}}))
        }
    }, [detalleCliente])

    useEffect(() => {
        if (detalleCliente && sucursalSelected) {
            dispatch(listaUsuariosClienteThunk({id_empresa: detalleCliente.cliente, id_sucursal: sucursalSelected.value}))
        }
    }, [detalleCliente, sucursalSelected])

    const columns = [
        columnHelper.accessor("nombre_usuario", {
            cell: (info) => info.getValue(),
            header: "Nombre"
        }),
        columnHelper.accessor("email_usuario", {
            cell: (info) => info.getValue(),
            header: "Email"
        }),
        columnHelper.accessor("papeleta.rut", {
            cell: (info) => info.getValue() || "Sin Rut",
            header: "Rut"
        })
    ]

    const table = useReactTable({
        data: listaUsuariosCliente,
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
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-xl'>Usuarios</Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className="z-0">
                <div className="flex flex-col md:flex-row w-full gap-4 justify-between mb-4">
                    <div className='w-full md:w-1/3'>
                        <SelectReact
                            placeholder="Sucursal..."
                            name='sucursal'
                            options={optionSucursal}
                            value={sucursalSelected}
                            onChange={(e) => {setSucursalSelected(e as {value: string, label: string})}}
                        />
                    </div>
                    <div>
                        <Input
                            name="globalFilter"
                            placeholder="Buscar..."
                            value={globalFilter}
                            onChange={(e) => {setGlobalFilter(e.target.value)}}
                        />
                    </div>
                </div>
                <div className="overflow-auto">
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
    )
}

export default TablaUsuariosDelCliente