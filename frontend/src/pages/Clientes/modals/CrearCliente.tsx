import Input from "@/components/form/Input"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalHeader } from "@/components/ui/Modal"
import ApiService from "@/services/ApiService"
import { useAppDispatch, useAppSelector } from "@/store"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { listaEmpresasThunk, listaMisClientesThunk } from "@/store/slices/empresa/empresaSlice"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import Icon from "@/components/icon/Icon"
import { IEmpresa } from "@/interface/empresas.interface"
import Tooltip from "@/components/ui/Tooltip"
import Badge from "@/components/ui/Badge"


const columnHelper = createColumnHelper<IEmpresa>()

function CrearCliente() {
    const dispatch = useAppDispatch()
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const { listaEmpresas, listaMisClientes } = useAppSelector((state) => state.empresa)
    const [empresas, setEmpresas] = useState<IEmpresa[]>([])
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [isCreating, setIsCreating] = useState<boolean>(false)

    useEffect(() => {
        if (isOpen && personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaEmpresasThunk())
            dispatch(listaMisClientesThunk({id_empresa: personalizacionUsuario.empresa}))
        }
    }, [isOpen, personalizacionUsuario])

    useEffect(() => {
        if (listaEmpresas.length > 0) {
            setEmpresas(listaEmpresas.filter(empresa => empresa.id != personalizacionUsuario?.empresa && !listaMisClientes.some(emp => emp.info_cliente.id === empresa.id && emp.info_prestador_servicios.id === personalizacionUsuario?.empresa)))
        }
    }, [listaEmpresas, listaMisClientes])

    const columns = [
        columnHelper.accessor("nombre", {
            cell: (info) => info.getValue(),
            header: "Nombre" 
        }),
        columnHelper.accessor("direccion_principal", {
            cell: (info) => info.getValue(),
            header: "Dirección Principal"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div>
                    <Tooltip text="Añadir como cliente">
                        <Button isDisable={isCreating} variant="solid" size="sm" icon="HeroPlus" onClick={async () => {
                            setIsCreating(true)
                            try {
                                const response = await ApiService.fetchData({url: `/api/relaciones-empresa/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({prestador_servicios: personalizacionUsuario?.empresa, cliente: info.row.original.id})})
                                if (response.data) {
                                    dispatch(listaMisClientesThunk({id_empresa: personalizacionUsuario?.empresa}))
                                    setIsCreating(false)
                                }
                            } catch (error: any) {
                                toast.error(error.response.data)
                                setIsCreating(false)
                            }
                        }}></Button>
                    </Tooltip>
                </div>
            ),
            header: ""
        })
    ]

    const table = useReactTable({
        data: empresas,
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
            <Button variant="solid" onClick={() => { setIsOpen(true) }}>Añadir Cliente</Button>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true} isStaticBackdropAnimation={false}>
                <ModalHeader>
                    <Badge>Añadir Cliente</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex justify-end gap-4 mb-4">
                        <div>
                            <Input
                                name="globalFilter"
                                placeholder="Buscar..."
                                value={globalFilter}
                                onChange={(e) => { setGlobalFilter(e.target.value) }}
                            />
                        </div>
                    </div>
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
                </ModalBody>
            </Modal>
        </>
    )
}

export default CrearCliente