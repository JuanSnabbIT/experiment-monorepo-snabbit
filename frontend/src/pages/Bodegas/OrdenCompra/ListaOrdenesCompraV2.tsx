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
import { listaOrdenesCompraThunk } from "@/store/slices/bodega/bodegaSlice"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import { useState, useEffect } from "react"
import CrearOrdenCompra from "./modals/CrearOrdenCompra"
import Button from "@/components/ui/Button"
import { useNavigate } from "react-router-dom"
import Tooltip from "@/components/ui/Tooltip"
import SubirCotizacion from "./modals/SubirCotizacion"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import { detalleEmpresaThunk, listaMisClientesThunk } from "@/store/slices/empresa/empresaSlice"
import AceptarORechazarOrdenCompra from "./modals/AceptarORechazarOrdenCompra"
import ModalEnviarProveedor from "./modals/ModalEnviarProveedor"
import ModalReenviarAlProveedor from "./modals/ModalReenviarAlProveedor"
import ModalVolverABorradorOC from "./modals/ModalVolverABorradorOC"
import { MultiValue } from "react-select"
import { ESTADOS_OC } from "@/constants/bodegas.constant"
import ModalEliminar from "@/pages/Items/Proveedor/modals/ModalEliminar"
import dayjs from "dayjs"
import useAuthority from "@/hooks/useAuthority"
import { toast } from "react-toastify"
import ApiService from "@/services/ApiService"


const columnHelper = createColumnHelper<IOrdenCompra>()

function ListaOrdenesCompraV2() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { personalizacionUsuario, listaGrupos } = useAppSelector((state) => state.auth)
    const { listaOrdenesCompra } = useAppSelector((state) => state.bodega)
    const { detalleEmpresa, listaMisClientes } = useAppSelector((state) => state.empresa)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [optionEmpresa, setOptionEmpresa] = useState<{value: string, label: string}[]>([])
    const [filtroEmpresa, setFiltroEmpresa] = useState<string[]>([])
    const [filtroEstado, setFiltroEstado] = useState<string[]>([])

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaOrdenesCompraThunk({id_empresa: personalizacionUsuario.empresa}))
            dispatch(listaMisClientesThunk({id_empresa: personalizacionUsuario.empresa}))
            dispatch(detalleEmpresaThunk({id_empresa: personalizacionUsuario.empresa}))
        }
    }, [personalizacionUsuario])

    useEffect(() => {
        if (detalleEmpresa && listaMisClientes) {
            const options: {value: string, label: string}[] = []
            options.push({value: detalleEmpresa.id.toString(), label: detalleEmpresa.nombre})
            setOptionEmpresa(options.concat(listaMisClientes.map(emp => {return {value: emp.cliente.toString(), label: emp.info_cliente.nombre}})))
        }
    }, [detalleEmpresa, listaMisClientes])

    const columns = [
        columnHelper.accessor("codigo", {
            cell: (info) => info.getValue(),
            header: "Codigo"
        }),
        columnHelper.accessor("nombre_cliente", {
            cell: (info) => info.getValue(),
            header: "Cliente"
        }),
        columnHelper.accessor("estado_label", {
            cell: (info) => info.getValue(),
            header: "Estado"
        }),
        columnHelper.accessor("fecha_creacion", {
            cell: (info) => (
                <div>{dayjs(info.row.original.fecha_creacion).format('DD/MM/YYYY HH:MM')}</div>
            ),
            header: "Fecha de Creacion"
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
                    {info.row.original.estado === "1" && (
                        <>
                            <ModalEnviarProveedor id_empresa={info.row.original.oc_empresa} id_proveedor={info.row.original.proveedor} id_orden={info.row.original.id} />
                            {useAuthority(listaGrupos?.grupos, ["staff"]) && (
                                <ModalVolverABorradorOC id_orden={info.row.original.id} />
                            )}
                            <Tooltip text="No Enviar al Proveedor">
                                <Button variant="solid" color="sky" icon="HeroXCircle" onClick={async () => {
                                    try {
                                        const response = await ApiService.fetchData({url: `/api/ordenes-compra/${info.row.original.id}/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({estado: "3"})})
                                        if (response.data) {
                                            toast.success("Orden de compra cambiada de estado", {autoClose: 1000})
                                            dispatch(listaOrdenesCompraThunk({id_empresa: personalizacionUsuario?.empresa}))
                                        }
                                    } catch (error: any) {
                                        const mensajesError = Object.values(error.response.data).flat().join(" ");
                                        toast.error(mensajesError || "Error al cambiar el estado de la OC", {toastId: "Error al cambiar el estado de la OC"})
                                    }
                                }} />
                            </Tooltip>
                        </>
                    )}
                    {info.row.original.estado === "3" && (
                        <>
                            <Tooltip text="Completar Orden de Compra">
                                <Button variant="solid" icon="DuoBox2" color="sky" onClick={() => {navigate(`/compras/completar-orden-compra/${info.row.original.id}`)}}></Button>
                            </Tooltip>
                            <ModalReenviarAlProveedor id_orden={info.row.original.id} id_empresa={info.row.original.oc_empresa} id_proveedor={info.row.original.proveedor} />
                            {useAuthority(listaGrupos?.grupos, ["staff"]) && (
                                <ModalVolverABorradorOC id_orden={info.row.original.id} />
                            )}
                        </>
                    )}
                    <Tooltip text="Detalle Orden de Compra">
                        <Button variant="solid" color="violet" onClick={() => {navigate(`/compras/detalle-orden-compra/${info.row.original.id}`)}} icon="HeroEye"></Button>
                    </Tooltip>
                    <SubirCotizacion id_empresa={info.row.original.oc_empresa} cotizacion={info.row.original.cotizacion} nombre_cotizacion={info.row.original.nombre_cotizacion} id_orden={info.row.original.id} />
                    <ModalEliminar
                        mensaje={`Esta Seguro que desea eliminar la orden N°${info.row.original.codigo}`}
                        peticionUrl={`/api/ordenes-compra/${info.row.original.id}/`}
                        method="DELETE"
                        onDispatch={() => {dispatch(listaOrdenesCompraThunk({id_empresa: personalizacionUsuario?.empresa}))}}
                    />
                </div>
            )
        })
    ]

    const table = useReactTable({
        data: listaOrdenesCompra,
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
        getPaginationRowModel: getPaginationRowModel(),
    });

    useEffect(() => {
        const params = new URLSearchParams();
        filtroEmpresa.forEach((id) => params.append("oc_cliente", id));
        filtroEstado.forEach((id) => params.append("estado", id));
        dispatch(listaOrdenesCompraThunk({id_empresa: personalizacionUsuario?.empresa, filtro: params}))
    }, [filtroEmpresa, filtroEstado])

    return (
        <PageWrapper isProtectedRoute={true} name="Ordenes de Compra" title="Ordenes de Compra">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Ordenes de Compra</Badge>
                </SubheaderLeft>
                <SubheaderRight className="w-full md:w-auto">
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                        <div className="min-w-[200px]">
                            <SelectReact
                                name="oc_cliente"
                                placeholder="Cliente"
                                noOptionsMessage={() => ("Sin Opciones")}
                                options={optionEmpresa}
                                isMulti={true}
                                onChange={(selectedOptions) => {
                                    const ids = (selectedOptions as MultiValue<TSelectOption>).map((option) => option.value);
                                    setFiltroEmpresa(ids);
                                }}
                            />
                        </div>
                        <div className="min-w-[200px]">
                            <SelectReact
                                name="estado"
                                placeholder="Estado"
                                noOptionsMessage={() => ("Sin Opciones")}
                                options={ESTADOS_OC}
                                isMulti={true}
                                onChange={(selectedOptions) => {
                                    const ids = (selectedOptions as MultiValue<TSelectOption>).map((option) => option.value);
                                    setFiltroEstado(ids);
                                }}
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
                        <CrearOrdenCompra id_empresa={personalizacionUsuario?.empresa} />
                    </div>
                </SubheaderRight>
            </Subheader>
            <Container className="w-full h-full">
                <Card>
                    <CardBody className='z-0'>
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
                            <div className="mt-2 min-w-[1000px]">
                                <TableCardFooterTemplateV2 table={table} />
                            </div>

                        </div>
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    )
}

export default ListaOrdenesCompraV2