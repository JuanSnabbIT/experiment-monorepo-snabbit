import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { IMovimientoStock } from '@/interface/bodega.interface';
import {
    listaContentTypeThunk,
    listaMovimientosStockThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    RowSelectionState,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import classNames from 'classnames';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CrearMovimientoStockInicial from '../modals/CrearMovimientoStockInicial';

const columnHelper = createColumnHelper<IMovimientoStock>();

function TablaMovimientosStockEnItem({
    movSeleccionado,
}: {
    movSeleccionado: IMovimientoStock | undefined;
}) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { detalleItemEmpresa } = useAppSelector((state) => state.item);
    const { listaMovimientosStock } = useAppSelector((state) => state.bodega);
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaContentType } = useAppSelector((state) => state.core);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (detalleItemEmpresa && personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(
                listaMovimientosStockThunk({
                    id_empresa: personalizacionUsuario.empresa,
                    id_item: detalleItemEmpresa.id,
                }),
            );
        }
    }, [detalleItemEmpresa, personalizacionUsuario]);

    useEffect(() => {
        if (listaContentType.length === 0) {
            dispatch(listaContentTypeThunk());
        }
    }, [listaContentType]);

    const columns = [
        columnHelper.accessor('id', {
            cell: (info) => info.getValue(),
            header: 'ID',
        }),
        columnHelper.accessor('tipo_movimiento', {
            cell: (info) => <div>{info.getValue()}</div>,
            header: 'Tipo de Movimiento',
        }),
        columnHelper.accessor('fecha_creacion', {
            cell: (info) => (
                <div>{dayjs(info.getValue()).locale('es').format('DD/MM/YYYY HH:mm:ss')}</div>
            ),
            header: 'Fecha',
        }),
        columnHelper.accessor('cantidad', {
            cell: (info) => info.getValue(),
            header: 'Cantidad',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div>
                    <Button
                        variant='solid'
                        icon='HeroEye'
                        color={
                            info.row.original.tipo_movimiento === 'SALIDA'
                                ? 'amber'
                                : info.row.original.tipo_movimiento === 'DEVOLUCION'
                                  ? 'violet'
                                  : info.row.original.tipo_movimiento === 'ENTRADA'
                                    ? 'emerald'
                                    : info.row.original.tipo_movimiento === 'AJUSTE'
                                      ? 'zinc'
                                      : info.row.original.tipo_movimiento === 'INICIAL'
                                        ? 'sky'
                                        : 'red'
                        }
                        onClick={() => {
                            let ruta = '';
                            const ct_model = listaContentType.find(
                                (ct) => ct.id === info.row.original.content_type,
                            )?.model;
                            if (ct_model === 'itemsguiasalida') {
                                // /bodega/detalle-guia-salida-bodega/13
                                ruta = `/bodega/detalle-guia-salida-bodega/${'guia' in info.row.original.datos_origen && info.row.original.datos_origen.guia}`;
                            }
                            if (ct_model === 'itemordencompraenstock') {
                                // /compras/detalle-compra/13
                                if ('content_type' in info.row.original.datos_origen) {
                                    if (info.row.original.datos_origen.tipo_documento === 'CR') {
                                        ruta = `/compras/detalle-compra/${info.row.original.datos_origen.id_documento}`;
                                    }
                                    if (info.row.original.datos_origen.tipo_documento === 'OC') {
                                        ruta = `/compras/detalle-orden-compra/${info.row.original.datos_origen.id_documento}`;
                                    }
                                }
                            }
                            if (ruta.length > 0) {
                                navigate(ruta);
                            }
                        }}></Button>
                </div>
            ),
            header: '',
        }),
    ];

    const table = useReactTable({
        data: listaMovimientosStock,
        columns: columns,
        state: {
            sorting: sorting,
            globalFilter: globalFilter,
        },
        onSortingChange: setSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilter,
        enableRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getRowId: (row) => row.id.toString(),
    });

    useEffect(() => {
        if (!movSeleccionado) return;

        // 1. ¿Dónde está ese movimiento en la data completa?
        const rowIndex = listaMovimientosStock.findIndex((m) => m.id === movSeleccionado.id);
        if (rowIndex === -1) return; // Por si lo eliminaron

        // 2. ¿En qué página cae?
        const pageSize = table.getState().pagination.pageSize;
        const newPageIndex = Math.floor(rowIndex / pageSize);

        // 3. Si es otra página, cámbiate
        if (newPageIndex !== table.getState().pagination.pageIndex) {
            table.setPageIndex(newPageIndex);
        }
    }, [movSeleccionado, listaMovimientosStock, table]);

    useEffect(() => {
        if (!movSeleccionado) return;

        // Espera a que la fila exista en el DOM
        const id = `row-${movSeleccionado.id}`;
        const nodo = document.getElementById(id);
        if (nodo) {
            nodo.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }, [movSeleccionado, table.getState().pagination.pageIndex]);

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-xl'>Movimientos de Stock</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    {listaMovimientosStock.length === 0 && <CrearMovimientoStockInicial />}
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='z-0'>
                <div className='overflow-auto'>
                    <Table className='min-w-[550px] table-fixed'>
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
                                                    }[header.column.getIsSorted() as string] ??
                                                        null}
                                                </div>
                                            )}
                                        </Th>
                                    ))}
                                </Tr>
                            ))}
                        </THead>
                        <TBody>
                            {table.getRowModel().rows.map((row) => (
                                <Tr
                                    key={row.id}
                                    id={`row-${row.original.id}`}
                                    className={classNames(
                                        'transition-colors',
                                        movSeleccionado?.id === row.original.id &&
                                            'bg-blue-50 ring-2 ring-inset ring-blue-500 dark:bg-blue-600/20',
                                    )}>
                                    {row.getVisibleCells().map((cell) => (
                                        <Td key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </Td>
                                    ))}
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                    <div className='mt-2 min-w-[550px]'>
                        <TableCardFooterTemplateV2 table={table} />
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

export default TablaMovimientosStockEnItem;
