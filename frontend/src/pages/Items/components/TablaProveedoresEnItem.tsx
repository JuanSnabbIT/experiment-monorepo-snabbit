import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card"
import Tooltip from "@/components/ui/Tooltip";
import AnimacionDeInputModoMovil from "@/components/utils/AnimacionDeIntputModoMovil";
import { IProveedorEmpresa } from "@/interface/items.interface";
import ApiService from "@/services/ApiService";
import { detalleItemEmpresaThunk, useAppDispatch, useAppSelector } from "@/store"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AgregarProveedorItem from "../modals/AgregarProveedorItem";
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import Icon from "@/components/icon/Icon";
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2";


const columnHelper = createColumnHelper<IProveedorEmpresa>()

function TablaProveedoresEnItem() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { detalleItemEmpresa } = useAppSelector((state) => state.item)
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    const columns = [
        columnHelper.accessor("nombre", {
            cell: (info) => info.row.original.nombre,
            header: "Nombre"
        }),
        columnHelper.accessor("rut", {
            cell: (info) => info.row.original.rut,
            header: "Rut"
        }),
        columnHelper.accessor("direccion", {
            cell: (info) => info.row.original.direccion,
            header: "Dirección"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div className="flex gap-4">
                    <Tooltip text="Detalle">
                        <Button variant="solid" color="violet" icon="HeroEye" onClick={() => {navigate(`/registros/detalle-proveedor-empresa/${info.row.original.id}`)}}></Button>
                    </Tooltip>
                    <Tooltip text="Desasociar Proveedor">
                        <Button variant="solid" color="red" onClick={async () => {
                            try {
                            const response = await ApiService.fetchData({url: `/api/items-empresa/${detalleItemEmpresa?.id}/desasociar_proveedor/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({proveedor_id: info.row.original.id})})
                            if (response.data) {
                                toast.success("El proveedor ya no esta asociado", {autoClose: 1000})
                                if (personalizacionUsuario && personalizacionUsuario.empresa) {
                                    dispatch(detalleItemEmpresaThunk({id_empresa: personalizacionUsuario.empresa, id_item: detalleItemEmpresa?.id})); 
                                }
                            }
                            } catch (error: any) {
                                toast.error(error.response.data)
                            }
                        }}>Desasociar</Button>
                    </Tooltip>
                </div>
            ),
        })
    ];

    const table = useReactTable({
        data: detalleItemEmpresa?.datos_proveedores || [],
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
                    <Badge className="text-xl">Proveedores del Item</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    <AnimacionDeInputModoMovil globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} anchoInput={200}>
                        {detalleItemEmpresa && (
                            <AgregarProveedorItem id_item={detalleItemEmpresa.id} />
                        )}
                    </AnimacionDeInputModoMovil>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className="z-0">
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
    )
}

export default TablaProveedoresEnItem