import Input from '@/components/form/Input'
import SelectReact, { TSelectOption } from '@/components/form/SelectReact'
import Icon from '@/components/icon/Icon'
import Container from '@/components/layouts/Container/Container'
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper'
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table'
import Tooltip from '@/components/ui/Tooltip'
import { ESTADO_COTIZACION } from '@/constants/cotizacion.constant'
import { ICotizacion } from '@/interface/cotizaciones.interface'
import ModalEliminar from '@/pages/Items/Proveedor/modals/ModalEliminar'
import { listaCotizacionesSucursalThunk, listaMisClientesThunk, useAppDispatch, useAppSelector } from '@/store'
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2'
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table'
import { MouseEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MultiValue } from 'react-select'
import CopiasCotizacion from './modals/CopiasCotizacion'
import CrearCotizacion from './modals/CrearCotizacion'


const columnHelper = createColumnHelper<ICotizacion>()

const CotizacionesEmpresa = () => {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { listaCotizaciones } = useAppSelector((state) => state.cotizacion)
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const { listaMisClientes } = useAppSelector((state) => state.empresa)
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [optionClientes, setOptionClientes] = useState<{ value: string; label: string }[]>([])
    const [filtroCliente, setFiltroCliente] = useState<string[]>([])
    const [filtroEstado, setFiltroEstado] = useState<string[]>([])
    const [copiasModalOpen, setCopiasModalOpen] = useState(false)
    const [cotizacionCopias, setCotizacionCopias] = useState<ICotizacion | null>(null)

    useEffect(() => {
        if (personalizacionUsuario?.empresa) {
            dispatch(listaCotizacionesSucursalThunk(undefined))
            dispatch(listaMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }))
        }
    }, [personalizacionUsuario])

    useEffect(() => {
        if (listaMisClientes.length > 0) {
            setOptionClientes(listaMisClientes.map(cliente => ({
                value: cliente.info_cliente.id.toString(),
                label: cliente.info_cliente.nombre
            })))
        } else {
            setOptionClientes([])
        }
    }, [listaMisClientes])

    useEffect(() => {
        if (!personalizacionUsuario?.empresa) {
            return
        }
        const params = new URLSearchParams()
        filtroCliente.forEach((id) => params.append("cliente", id))
        filtroEstado.forEach((id) => params.append("estado", id))
        dispatch(listaCotizacionesSucursalThunk({ filtro: params }))
    }, [filtroCliente, filtroEstado, personalizacionUsuario])

    const handleAbrirCopias = (cotizacion: ICotizacion, event?: MouseEvent<HTMLButtonElement>) => {
        if (event) {
            event.stopPropagation()
        }
        setCotizacionCopias(cotizacion)
        setCopiasModalOpen(true)
    }

    const columns = [

        columnHelper.accessor("numero_cotizacion", {
            cell: (info) => (
                <div className='font-bold text-gray-600 dark:text-gray-400'>
                    #{info.getValue()}
                </div>
            ),
            header: "N\u00b0"
        }),
        columnHelper.accessor("nombre", {
            cell: (info) => (
                <div className='font-semibold text-gray-900 dark:text-gray-100'>
                    {info.getValue()}
                </div>
            ),
            header: "Nombre"
        }),
        columnHelper.accessor("cliente_nombre", {
            cell: (info) => (
                <div className='font-medium text-gray-700 dark:text-gray-300'>
                    {info.getValue()}
                </div>
            ),
            header: "Cliente"
        }),
        columnHelper.accessor("fecha_creacion", {
            cell: (info) => {
                const date = new Date(info.getValue())
                return (
                    <div className='text-gray-500'>
                        {date.toLocaleDateString()}
                    </div>
                )
            },
            header: "Fecha"
        }),
        columnHelper.accessor("total_estimado", {
            cell: (info) => {
                const row = info.row.original
                let formattedValue = '';
                const val = parseFloat(info.getValue() as unknown as string);

                if (row.tipo_moneda === '2' || !row.tipo_moneda) { // CLP
                     // Redondear hacia arriba y usar separadores de miles, sin decimales
                     const rounded = Math.ceil(val);
                     formattedValue = `$${rounded.toLocaleString('es-CL')}`;
                } else if (row.tipo_moneda === '1') { // USD
                    // USD con decimales standard y sufijo
                    formattedValue = `${val.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} USD`;
                } else if (row.tipo_moneda === '3') { // UF
                    formattedValue = `${val.toLocaleString('es-CL', { minimumFractionDigits: 2 })} UF`;
                }

                return (
                    <div className='font-mono font-medium'>
                         {formattedValue}
                    </div>
                )
            },
            header: "Total"
        }),
        columnHelper.accessor("estado_label", {
            cell: (info) => {
                const estado = info.getValue()
                let color: "emerald" | "red" | "amber" | "blue" | "gray" = "gray"
                
                if (estado?.toLowerCase().includes("aceptad")) color = "emerald"
                else if (estado?.toLowerCase().includes("rechazad")) color = "red"
                else if (estado?.toLowerCase().includes("pendiente")) color = "amber"
                else if (estado?.toLowerCase().includes("enviada")) color = "blue"

                return (
                    <Badge variant='solid' color={color} className='capitalize'>
                        {estado}
                    </Badge>
                )
            },
            header: "Estado"
        }),
        columnHelper.display({
            id: "acciones",
            header: "Acciones",
            cell: (info) => {
                const esRechazada = info.row.original.estado?.toLowerCase() === "rechazada"
                const tieneCopias = (info.row.original.copias_count || 0) > 0
                return (
                    <div className="flex gap-2">
                        <Tooltip text="Ver Detalle">
                            <Button variant="solid" color='violet' onClick={() => {navigate(`/cotizacion/detalle-cotizacion/${info.row.original.numero_cotizacion}/`)}} icon="HeroEye"></Button>
                        </Tooltip>
                        {esRechazada || tieneCopias ? (
                            <Tooltip text="Copias">
                                <Button
                                    variant="solid"
                                    color="emerald"
                                    icon="HeroDocumentDuplicate"
                                    onClick={(event) => {handleAbrirCopias(info.row.original, event)}}
                                ></Button>
                            </Tooltip>
                        ) : null}
                        <ModalEliminar
                            mensaje={`Estas a punto de eliminar la cotizacion ${info.row.original.numero_cotizacion}. Desea continuar?`} 
                            peticionUrl={`/api/cotizaciones/${info.row.original.id}/`}
                            onDispatch={() => {dispatch(listaCotizacionesSucursalThunk(undefined))}}
                        />
                    </div>
                )
            }
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
                <SubheaderRight className="w-full md:w-auto">
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                        <div className="min-w-[200px]">
                            <SelectReact
                                name="cliente"
                                placeholder="Cliente"
                                noOptionsMessage={() => ("Sin Opciones")}
                                options={optionClientes}
                                isMulti={true}
                                onChange={(selectedOptions) => {
                                    const ids = (selectedOptions as MultiValue<TSelectOption>).map((option) => option.value)
                                    setFiltroCliente(ids)
                                }}
                            />
                        </div>
                        <div className="min-w-[200px]">
                            <SelectReact
                                name="estado"
                                placeholder="Estado"
                                noOptionsMessage={() => ("Sin Opciones")}
                                options={ESTADO_COTIZACION}
                                isMulti={true}
                                onChange={(selectedOptions) => {
                                    const ids = (selectedOptions as MultiValue<TSelectOption>).map((option) => option.value)
                                    setFiltroEstado(ids)
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
                        <CrearCotizacion empresa={true} />
                    </div>
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
            <CopiasCotizacion
                cotizacion={cotizacionCopias}
                isOpen={copiasModalOpen}
                setIsOpen={setCopiasModalOpen}
            />
        </PageWrapper>
    )
}

export default CotizacionesEmpresa 
