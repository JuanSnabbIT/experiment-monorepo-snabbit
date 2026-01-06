import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type CellContext,
    type SortingState,
} from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import Badge from '@/components/ui/Badge.tsx'
import Button from '@/components/ui/Button.tsx'
import Card, { CardBody } from '@/components/ui/Card.tsx'
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table.tsx'
import Tooltip from '@/components/ui/Tooltip.tsx'
import { IVoucherDevolucion } from '@/interface/bodega.interface.ts'
import { listaVouchersThunk, useAppDispatch, useAppSelector } from '@/store/index.ts'
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2.tsx'
import { downloadVoucherDevolucionPdf } from '@/utils/downloadHelpers.ts'

const columnHelper = createColumnHelper<IVoucherDevolucion>()

type VoucherCellContext<TValue> = CellContext<IVoucherDevolucion, TValue>

interface DevolucionesOTProps {
    ordenId?: number
}

const DevolucionesOT = ({ ordenId }: DevolucionesOTProps) => {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { listaVouchers = [], loading, error } = useAppSelector((state) => state.bodega)
    const [sorting, setSorting] = useState<SortingState>([])

    useEffect(() => {
        if (ordenId) {
            void dispatch(listaVouchersThunk({ orden_trabajo: ordenId, page: 1 }))
        }
    }, [ordenId, dispatch])

    const handleVerDetalle = (voucherId: number) => {
        navigate(`/bodega/detalle-voucher-devolucion/${voucherId}`)
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

    const columns = [
        columnHelper.accessor('numero', {
            header: 'Numero',
            cell: (info: VoucherCellContext<string>) => info.getValue(),
            size: 120,
        }),
        columnHelper.accessor('fecha_creacion', {
            header: 'Fecha',
            cell: (info: VoucherCellContext<string>) => dayjs(info.getValue()).format('DD/MM/YYYY'),
            size: 120,
        }),
        columnHelper.accessor('total_items_devueltos', {
            header: 'Items Devueltos',
            cell: (info: VoucherCellContext<number>) => (
                <Badge color="blue" variant="solid">
                    {info.getValue() ?? 0} {info.getValue() === 1 ? 'item' : 'items'}
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
                            variant="outline"
                            color="blue"
                            size="sm"
                            onClick={() => handleVerDetalle(info.row.original.id)}
                        />
                    </Tooltip>
                    <Tooltip text="Descargar PDF">
                        <Button
                            icon="HeroArrowDownTray"
                            variant="outline"
                            color="emerald"
                            size="sm"
                            onClick={() => handleDescargarPDF(info.row.original.id, info.row.original.numero)}
                        />
                    </Tooltip>
                </div>
            ),
            size: 120,
        }),
    ]

    const table = useReactTable<IVoucherDevolucion>({
        data: listaVouchers,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    })

    if (loading) {
        return (
            <Card>
                <CardBody className="flex items-center justify-center py-8">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full border-4 border-zinc-300 border-t-blue-500 h-8 w-8"></div>
                        <p className="mt-2 text-gray-600">Cargando devoluciones...</p>
                    </div>
                </CardBody>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardBody>
                    <div className="rounded-lg bg-red-50 p-4">
                        <p className="text-red-800">{error}</p>
                    </div>
                </CardBody>
            </Card>
        )
    }

    if (!listaVouchers || listaVouchers.length === 0) {
        return (
            <Card>
                <CardBody className="py-8 text-center text-zinc-600">
                    <p className="mb-4">No hay devoluciones registradas para esta orden de trabajo.</p>
                    <Tooltip text="Ir a lista de devoluciones">
                        <Button
                            color="blue"
                            variant="outline"
                            icon="HeroArrowTopRightOnSquare"
                            onClick={() => navigate(`/bodega/lista-vouchers-devolucion?orden_trabajo=${ordenId}`)}
                        >
                            Ver todas las devoluciones
                        </Button>
                    </Tooltip>
                </CardBody>
            </Card>
        )
    }

    return (
        <Card>
            <CardBody>
                <Table>
                    <THead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <Tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <Th
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        style={{ width: header.getSize() }}
                                        onClick={header.column.getToggleSortingHandler()}
                                        className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                                    >
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </Th>
                                ))}
                            </Tr>
                        ))}
                    </THead>
                    <TBody>
                        {table.getRowModel().rows.map((row) => (
                            <Tr key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                    <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
                                ))}
                            </Tr>
                        ))}
                    </TBody>
                </Table>
                {listaVouchers.length > 0 && <TableCardFooterTemplateV2 table={table} />}
            </CardBody>
        </Card>
    )
}

export default DevolucionesOT
