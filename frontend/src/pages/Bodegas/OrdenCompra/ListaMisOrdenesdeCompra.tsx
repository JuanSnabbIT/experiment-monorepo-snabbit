import Input from "@/components/form/Input"
import Icon from "@/components/icon/Icon"
import Container from "@/components/layouts/Container/Container"
import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper"
import Subheader, { SubheaderLeft, SubheaderRight } from "@/components/layouts/Subheader/Subheader"
import Badge from "@/components/ui/Badge"
import Card, { CardBody } from "@/components/ui/Card"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import { IOrdenCompra } from "@/interface/bodega.interface"
import { useAppDispatch, useAppSelector } from "@/store"
import { listaMisOrdenesDeCompraThunk } from "@/store/slices/bodega/bodegaSlice"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import { useState, useEffect } from "react"
import CrearOrdenCompra from "./modals/CrearOrdenCompra"
import Button from "@/components/ui/Button"
import { useNavigate } from "react-router-dom"
import Tooltip from "@/components/ui/Tooltip"
import SubirCotizacion from "./modals/SubirCotizacion"
import ModalEnviarProveedor from "./modals/ModalEnviarProveedor"
import ModalVolverABorradorOC from "./modals/ModalVolverABorradorOC"
import AceptarORechazarOrdenCompra from "./modals/AceptarORechazarOrdenCompra"
import ModalReenviarAlProveedor from "./modals/ModalReenviarAlProveedor"
import ModalEliminar from "@/pages/Items/Proveedor/modals/ModalEliminar"
import AnimacionDeInputModoMovil from "@/components/utils/AnimacionDeIntputModoMovil"
import useAuthority from "@/hooks/useAuthority"
import ApiService from "@/services/ApiService"
import { toast } from "react-toastify"


const columnHelper = createColumnHelper<IOrdenCompra>()

function ListaMisOrdenesCompra() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { personalizacionUsuario, listaGrupos } = useAppSelector((state) => state.auth)
    const { listaMisOrdenesDeCompra } = useAppSelector((state) => state.bodega)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (personalizacionUsuario) {
            dispatch(listaMisOrdenesDeCompraThunk())
        }
    }, [personalizacionUsuario])

    const columns = [
        columnHelper.accessor("codigo", {
            cell: (info) => info.getValue(),
            header: "Codigo"
        }),
        columnHelper.accessor("estado_label", {
            cell: (info) => info.getValue(),
            header: "Estado"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div className="flex gap-2">
                    {info.row.original.estado === "-" && (
                        <Tooltip text="Agregar Items">
                            <Button variant="solid" onClick={() => {navigate(`/compras/agregar-items-oc/${info.row.original.id}`)}} icon="HeroPlus"></Button>
                        </Tooltip>
                    )}
                    {(info.row.original.estado === "0") && (
                        <>
                            <AceptarORechazarOrdenCompra id_orden={info.row.original.id} id_empresa={personalizacionUsuario?.empresa} />
                            {useAuthority(listaGrupos?.grupos, ["staff"]) && (
                                <ModalVolverABorradorOC id_orden={info.row.original.id} />
                            )}
                        </>
                    )}
                    {String(info.row.original.estado) === "1" && (
                        <>
                            <ModalEnviarProveedor id_empresa={info.row.original.oc_empresa} id_proveedor={info.row.original.proveedor} id_orden={info.row.original.id} />
                            <Tooltip text="Recibir Items de la compra">
                                <Button variant="solid" icon="DuoBox2" color="sky" onClick={() => {navigate(`/compras/completar-orden-compra/${info.row.original.id}`)}}></Button>
                            </Tooltip>
                        </>
                    )}
                    {String(info.row.original.estado) === "3" && (
                        <>
                            <Tooltip text="Recibir Items de la compra">
                                <Button variant="solid" icon="DuoBox2" color="sky" onClick={() => {navigate(`/compras/completar-orden-compra/${info.row.original.id}`)}}></Button>
                            </Tooltip>
                            <ModalReenviarAlProveedor id_orden={info.row.original.id} id_empresa={info.row.original.oc_empresa} id_proveedor={info.row.original.proveedor} />
                        </>
                    )}
                    {info.row.original.estado === "3" && (
                        <>
                            <Tooltip text="Recibir Items de la compra">
                                <Button variant="solid" icon="DuoBox2" color="sky" onClick={() => {navigate(`/compras/completar-orden-compra/${info.row.original.id}`)}}></Button>
                            </Tooltip>
                            <ModalReenviarAlProveedor id_orden={info.row.original.id} id_empresa={info.row.original.oc_empresa} id_proveedor={info.row.original.proveedor} />
                            {useAuthority(listaGrupos?.grupos, ["staff"]) && (
                                <ModalVolverABorradorOC id_orden={info.row.original.id} disabled={String(info.row.original.estado) !== '0'} />
                            )}
                        </>
                    )}
                    <Tooltip text="Detalle Orden de Compra">
                        <Button variant="solid" onClick={() => {navigate(`/compras/detalle-orden-compra/${info.row.original.id}`)}} icon="HeroEye"></Button>
                    </Tooltip>
                    <SubirCotizacion id_empresa={info.row.original.oc_empresa} cotizacion={info.row.original.cotizacion} nombre_cotizacion={info.row.original.nombre_cotizacion} id_orden={info.row.original.id} />
                    <ModalEliminar
                        mensaje={`Esta Seguro que desea eliminar la orden N°${info.row.original.codigo}`}
                        peticionUrl={`/api/ordenes-compra/${info.row.original.id}/`}
                        method="DELETE"
                        onDispatch={() => {dispatch(listaMisOrdenesDeCompraThunk())}}
                    />
                </div>
            )
        })
    ]

    const table = useReactTable({
        data: listaMisOrdenesDeCompra,
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
        <PageWrapper isProtectedRoute={true} name="Mis Ordenes de Compra" title="Mis Ordenes de Compra">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Mis Ordenes de Compra</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <AnimacionDeInputModoMovil globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} anchoInput={200}>
                        <CrearOrdenCompra />
                    </AnimacionDeInputModoMovil>
                </SubheaderRight>
            </Subheader>
            <Container className="w-full h-full">
                <Card>
                    <CardBody className="z-0">
                        <div className="overflow-auto">
                            <Table className='table-fixed min-w-[1000px]'>
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
            </Container>
        </PageWrapper>
    )
}

export default ListaMisOrdenesCompra