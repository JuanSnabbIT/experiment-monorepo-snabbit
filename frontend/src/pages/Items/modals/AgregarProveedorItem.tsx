import Icon from "@/components/icon/Icon";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal";
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import Tooltip from "@/components/ui/Tooltip";
import { IProveedorEmpresa } from "@/interface/items.interface";
import ApiService from "@/services/ApiService";
import { detalleItemEmpresaThunk, listaProveedoresNoAsociadosAItemEspecificoThunk, useAppDispatch, useAppSelector } from "@/store";
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2";
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";


const columnHelper = createColumnHelper<IProveedorEmpresa>()

function AgregarProveedorItem({id_item} : {id_item: string | undefined | number}) {
    const dispatch = useAppDispatch()
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const { listaProveedoresNoAsociadosAItemEspecifico } = useAppSelector((state) => state.item)
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [sorting, setSorting] = useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState<string>('')

    useEffect(() => {
        if (isOpen) {
            dispatch(listaProveedoresNoAsociadosAItemEspecificoThunk({id_item}))
        }
        // if (!isOpen && personalizacionUsuario && personalizacionUsuario.empresa) {
        //     dispatch(detalleItemEmpresaThunk({id_empresa: personalizacionUsuario.empresa, id_item}));
        // }
    }, [isOpen])

    const columns = [
        columnHelper.accessor("nombre", {
            cell: (info) => info.getValue(),
            header: "Nombre"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div>
                    <Tooltip text="Asociar este Proveedor al Item">
                        <Button variant="solid" rounded="rounded-full" icon="HeroPlus" onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({url: `/api/items-empresa/${id_item}/asociar_proveedor/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({proveedor_id: info.row.original.id})})
                                if (response.data) {
                                    toast.success("Proveedor asociado al Item", {autoClose: 1000})
                                    dispatch(listaProveedoresNoAsociadosAItemEspecificoThunk({id_item}))
                                }
                            } catch (error: any) {
                                toast.error(error.response.data)
                            }
                        }}/>
                    </Tooltip>
                </div>
            ),
            header: ""
        })
    ]

    const table = useReactTable({
        data: listaProveedoresNoAsociadosAItemEspecifico,
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
        <>
            <Tooltip text="Agregar Proveedores">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroPlus"></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Agregar este Item a Proveedores</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex gap-4">
                        <div className="w-full">
                            <Badge>Proveedor</Badge>
                            <div className="overflow-auto">
                                <Table className='table-fixed min-w-[400px]'>
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
                                    <TBody className="dark:bg-zinc-800 rounded-lg">
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
                                <div className="mt-2 min-w-[400px]">
                                    <TableCardFooterTemplateV2 table={table} />
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalBody>
            </Modal>
        </>
    )
}

export default AgregarProveedorItem