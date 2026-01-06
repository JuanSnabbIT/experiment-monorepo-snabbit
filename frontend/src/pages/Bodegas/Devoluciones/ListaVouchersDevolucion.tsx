import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type CellContext,
    type SortingState,
} from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'

type PaginationUpdater =
    | { pageIndex: number; pageSize: number }
    | ((state: { pageIndex: number; pageSize: number }) => { pageIndex: number; pageSize: number })

type VoucherTableInstance = ReturnType<typeof useReactTable<IVoucherDevolucion>>
type VoucherHeaderGroup = ReturnType<VoucherTableInstance['getHeaderGroups']>[number]
type VoucherHeader = VoucherHeaderGroup['headers'][number]
type VoucherRow = ReturnType<VoucherTableInstance['getRowModel']>['rows'][number]
type VoucherCell = ReturnType<VoucherRow['getVisibleCells']>[number]
type VoucherCellContext<TValue> = CellContext<IVoucherDevolucion, TValue>

import Input from '@/components/form/Input.tsx'
import Icon from '@/components/icon/Icon.tsx'
import Container from '@/components/layouts/Container/Container.tsx'
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper.tsx'
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader.tsx'
import Badge from '@/components/ui/Badge.tsx'
import Button from '@/components/ui/Button.tsx'
import Card, { CardBody } from '@/components/ui/Card.tsx'
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table.tsx'
import Tooltip from '@/components/ui/Tooltip.tsx'
import { IVoucherDevolucion } from '@/interface/bodega.interface.ts'
import ApiService from '@/services/ApiService.ts'
import { listaVouchersThunk, useAppDispatch, useAppSelector } from '@/store/index.ts'
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2.tsx'
import { downloadVoucherDevolucionPdf } from '@/utils/downloadHelpers.ts'

const columnHelper = createColumnHelper<IVoucherDevolucion>()

const getSortIcon = (direction: false | 'asc' | 'desc') => {
    if (direction === 'desc') return 'HeroChevronDown'
    if (direction === 'asc') return 'HeroChevronUp'
    return 'HeroChevronUpDown'
}

const ListaVouchersDevolucion = () => {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const ordenTrabajoParam = searchParams.get('orden_trabajo')
    const ordenTrabajoId = useMemo(() => (ordenTrabajoParam ? parseInt(ordenTrabajoParam, 10) : undefined), [ordenTrabajoParam])

    const { listaVouchers = [], vouchersPaginacion = { count: 0, next: null, previous: null }, loading, error } =
        useAppSelector((state) => state.bodega)

    const [sorting, setSorting] = useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [page, setPage] = useState(1)

    useEffect(() => {
        void dispatch(
            listaVouchersThunk({
                orden_trabajo: ordenTrabajoId,
                search: globalFilter || undefined,
                page,
            })
        )
    }, [dispatch, ordenTrabajoId, globalFilter, page])

    const handleCrearVoucherAhora = async () => {
        if (!ordenTrabajoId) return
        try {
            await ApiService.fetchData<IVoucherDevolucion>({
                url: '/api/vouchers-devolucion/',
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: { orden_trabajo: ordenTrabajoId } as unknown as Record<string, unknown>,
            })
            toast.success(`Voucher de devoluciones creado para OT #${ordenTrabajoId}`)
            setPage(1)
            void dispatch(
                listaVouchersThunk({
                    orden_trabajo: ordenTrabajoId,
                    search: globalFilter || undefined,
                    page: 1,
                })
            )
        } catch (err: unknown) {
            const anyErr = err as { response?: { status?: number; data?: { detail?: string; voucher_id?: number } }; message?: string }
            const status = anyErr?.response?.status
            const msg = anyErr?.response?.data?.detail || anyErr?.message || 'No se pudo crear el voucher'
            if (status === 409 && anyErr?.response?.data?.voucher_id) {
                toast.info('Ya existia un voucher para esta OT. Actualizando lista...')
                setPage(1)
                void dispatch(
                    listaVouchersThunk({
                        orden_trabajo: ordenTrabajoId,
                        search: globalFilter || undefined,
                        page: 1,
                    })
                )
                return
            }
            toast.error(msg)
        }
    }

    const handleDescargarPDF = async (voucherId: number, numero: string) => {
        try {
            await downloadVoucherDevolucionPdf(voucherId)
            toast.success(`PDF '${numero}' descargado correctamente`)
        } catch (err: unknown) {
            const anyErr = err as { message?: string }
            toast.error(anyErr?.message || 'Error al descargar PDF')
        }
    }

    const handleVerDetalle = (voucherId: number) => {
        navigate(`/bodega/detalle-voucher-devolucion/${voucherId}`)
    }

    const columns = [
        columnHelper.accessor('numero', {
            header: 'Numero',
            cell: (info: VoucherCellContext<string>) => info.getValue(),
            size: 120,
        }),
        columnHelper.accessor('orden_trabajo', {
            header: 'Orden Trabajo',
            cell: (info: VoucherCellContext<number>) => `OT #${info.getValue()}`,
            size: 140,
        }),
        columnHelper.accessor('fecha_creacion', {
            header: 'Fecha',
            cell: (info: VoucherCellContext<string>) => dayjs(info.getValue()).format('DD/MM/YYYY'),
            size: 140,
        }),
        columnHelper.accessor('total_items_devueltos', {
            header: 'Items devueltos',
            cell: (info: VoucherCellContext<number>) => (
                <Badge color="blue" variant="solid">
                    {(info.getValue() as number) ?? 0} {(info.getValue() as number) === 1 ? 'item' : 'items'}
                </Badge>
            ),
            size: 150,
        }),
        columnHelper.display({
            id: 'acciones',
            header: 'Acciones',
            cell: (info: VoucherCellContext<unknown>) => (
                <div className="flex gap-2">
                    <Tooltip text="Ver detalle">
                        <Button
                            icon="HeroEye"
                            variant="solid"
                            color="violet"
                            onClick={() => handleVerDetalle(info.row.original.id)}
                        />
                    </Tooltip>
                    <Tooltip text="Descargar PDF">
                        <Button
                            icon="HeroArrowDownTray"
                            variant="solid"
                            color="red"
                            onClick={() => handleDescargarPDF(info.row.original.id, info.row.original.numero)}
                        />
                    </Tooltip>
                </div>
            ),
            size: 150,
        }),
    ]

    const table = useReactTable<IVoucherDevolucion>({
        data: listaVouchers,
        columns,
        state: {
            sorting,
            globalFilter,
            pagination: {
                pageIndex: page - 1,
                pageSize: 10,
            },
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: (updater: PaginationUpdater) => {
            const next = typeof updater === 'function' ? updater({ pageIndex: page - 1, pageSize: 10 }) : updater
            setPage((next.pageIndex ?? 0) + 1)
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        manualPagination: true,
        pageCount: Math.max(Math.ceil((vouchersPaginacion?.count ?? 0) / 10), 1),
    })

    return (
        <PageWrapper isProtectedRoute name="Devoluciones" title="Devoluciones (Vouchers)">
            <Subheader>
                <SubheaderLeft>
                    <Badge className='text-xl'>Devoluciones (Vouchers)</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <div className='flex items-center gap-4'>
                        {ordenTrabajoId && (
                            <Badge color="blue" variant="outline">
                                OT #{ordenTrabajoId}
                            </Badge>
                        )}
                        <Input
                            id="search"
                            name="search"
                            type="text"
                            placeholder="Buscar..."
                            value={globalFilter}
                            onChange={(e) => {
                                setGlobalFilter(e.target.value)
                                setPage(1)
                            }}
                        />
                        {ordenTrabajoId && (
                            <Tooltip text="Agrupa todas las devoluciones registradas en esta OT">
                                <Button variant="solid" color="blue" icon="HeroPlusCircle" onClick={handleCrearVoucherAhora}>
                                    Crear voucher ahora
                                </Button>
                            </Tooltip>
                        )}
                    </div>
                </SubheaderRight>
            </Subheader>

            <Container className='w-full h-full'>
                <div className='w-full'>
                    <Card>
                        <CardBody className='z-0'>
                            {loading ? (
                                <div className="py-10 text-center text-zinc-500">Cargando vouchers...</div>
                            ) : error ? (
                                <div className="py-10 text-center text-red-500">{String(error)}</div>
                            ) : listaVouchers.length === 0 ? (
                                <div className="py-10 text-center text-zinc-600">
                                    <div className="mb-3">No hay vouchers de devolucion para los filtros actuales.</div>
                                    {ordenTrabajoId && (
                                        <Button color="blue" icon="HeroPlus" onClick={handleCrearVoucherAhora}>
                                            Crear voucher ahora
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-auto">
                                    <Table className='table-fixed min-w-[900px]'>
                                        <THead>
                                            {table.getHeaderGroups().map((headerGroup: VoucherHeaderGroup) => (
                                                <Tr key={headerGroup.id}>
                                                    {headerGroup.headers.map((header: VoucherHeader) => (
                                                        <Th
                                                            key={header.id}
                                                            colSpan={header.colSpan}
                                                            style={{ width: header.getSize() }}
                                                            onClick={header.column.getToggleSortingHandler()}
                                                            className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                                                            isColumnBorder={false}
                                                        >
                                                            {header.isPlaceholder ? null : (
                                                                <div className="flex items-center gap-2">
                                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                                    {header.column.getCanSort() && (
                                                                        <Icon
                                                                            icon={getSortIcon(header.column.getIsSorted())}
                                                                            className="text-lg"
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </Th>
                                                    ))}
                                                </Tr>
                                            ))}
                                        </THead>
                                        <TBody>
                                            {table.getRowModel().rows.map((row: VoucherRow) => (
                                                <Tr key={row.id}>
                                                    {row.getVisibleCells().map((cell: VoucherCell) => (
                                                        <Td key={cell.id} style={{ width: cell.column.getSize() }}>
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </Td>
                                                    ))}
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                    <div className="mt-2 min-w-[900px]">
                                        <TableCardFooterTemplateV2 table={table} />
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </Container>
        </PageWrapper>
    )
}

export default ListaVouchersDevolucion
