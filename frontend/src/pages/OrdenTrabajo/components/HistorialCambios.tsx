import { Fragment, useEffect, useMemo, useState } from 'react';
import { listaHistorialCambiosThunk, useAppDispatch, useAppSelector } from '@/store';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { IHistorialCambiosOrden } from '@/interface/ordenTrabajo.interface';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import {
    createColumnHelper,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import dayjs from 'dayjs';

const columnHelper = createColumnHelper<IHistorialCambiosOrden>();

const HistorialCambios = ({ ordenId }: { ordenId: number | string | undefined }) => {
    const dispatch = useAppDispatch();
    const { listaHistorialCambios } = useAppSelector((state) => state.ordenTrabajo);
    const [historialSeleccionadoId, setHistorialSeleccionadoId] = useState<number | undefined>();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    const renderDetalleListado = (detalle?: string | null) => {
        if (!detalle) {
            return <p className='text-sm text-gray-500'>Sin informacion</p>;
        }

        const partes = detalle
            .split(';')
            .map((item) => item.trim())
            .filter(Boolean);

        if (partes.length === 0) {
            return <p className='text-sm text-gray-500'>Sin informacion</p>;
        }

        return (
            <ul className='ml-4 list-disc space-y-1 text-sm'>
                {partes.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                ))}
            </ul>
        );
    };

    useEffect(() => {
        dispatch(listaHistorialCambiosThunk({ id_orden: ordenId }));
    }, []);

    const columns = [
        columnHelper.accessor('fecha_cambio', {
            cell: (info) => <div>{dayjs(info.row.original.fecha_cambio).format('DD-MM-YYYY')}</div>,
            header: 'Fecha del Cambio',
        }),
        columnHelper.accessor('nombre_usuario', {
            cell: (info) => info.getValue(),
            header: 'Usuario',
        }),
        columnHelper.display({
            id: 'estados',
            cell: (info) => info.row.original.comentario || 'Sin comentario',
            header: 'Comentario',
        }),
    ];

    const table = useReactTable({
        data: listaHistorialCambios,
        columns: columns,
        state: {
            sorting: sorting,
            globalFilter: globalFilter,
        },
        onSortingChange: setSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    const visibleRows = table.getRowModel().rows;
    const visibleIds = useMemo(() => visibleRows.map((row) => row.original.id), [visibleRows]);

    useEffect(() => {
        if (historialSeleccionadoId && !visibleIds.includes(historialSeleccionadoId)) {
            setHistorialSeleccionadoId(undefined);
        }
    }, [historialSeleccionadoId, visibleIds]);

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-xl'>Historial de Cambios</Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='z-0'>
                {listaHistorialCambios.length > 0 ? (
                    <>
                        <div className='relative min-w-0'>
                            <div className='absolute left-0 right-0 top-3 h-px bg-zinc-200' />
                            <div className='relative flex snap-x snap-mandatory items-stretch gap-6 overflow-x-auto pb-4 pr-2 pt-6'>
                                {visibleRows.map((row) => {
                                    const item = row.original;
                                    const isSelected = historialSeleccionadoId === item.id;
                                    return (
                                        <Fragment key={item.id}>
                                            <div
                                                className={`relative flex h-[220px] min-h-0 w-[320px] flex-none snap-start flex-col rounded-lg border p-4 text-left shadow-sm transition ${
                                                    isSelected
                                                        ? 'border-blue-400 bg-blue-50/40 shadow-md'
                                                        : 'border-zinc-200 bg-white hover:border-blue-200 hover:shadow-md'
                                                }`}>
                                                <div className='absolute -top-4 left-6 h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow-sm' />
                                                <div className='flex min-h-0 flex-1 flex-col gap-3'>
                                                    <div className='flex flex-col gap-2'>
                                                        <div className='text-xs uppercase tracking-wide text-gray-500'>
                                                            Fecha del cambio
                                                        </div>
                                                        <div className='text-sm font-semibold text-gray-900'>
                                                            {dayjs(item.fecha_cambio).format(
                                                                'DD-MM-YYYY',
                                                            )}
                                                        </div>
                                                        <div className='text-sm text-gray-600'>
                                                            Usuario:{' '}
                                                            {item.nombre_usuario || 'Sin usuario'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Badge className='mb-1'>Comentario</Badge>
                                                        <p className='text-sm text-gray-700'>
                                                            {item.comentario || 'Sin comentario'}
                                                        </p>
                                                    </div>
                                                    <div className='mt-auto'>
                                                        <Button
                                                            variant='solid'
                                                            icon={
                                                                isSelected
                                                                    ? 'DuoAngleDown'
                                                                    : 'DuoAngleUp'
                                                            }
                                                            color='sky'
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setHistorialSeleccionadoId(
                                                                        undefined,
                                                                    );
                                                                } else {
                                                                    setHistorialSeleccionadoId(
                                                                        item.id,
                                                                    );
                                                                }
                                                            }}>
                                                            {isSelected
                                                                ? 'Ocultar detalle'
                                                                : 'Ver detalle'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className='relative flex h-[220px] min-h-0 w-[360px] flex-none snap-start flex-col overflow-hidden rounded-lg border border-blue-200 bg-white p-4 text-left shadow-sm'>
                                                    <div className='absolute -top-4 left-6 h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow-sm' />
                                                    <div className='flex min-h-0 flex-1 flex-col gap-2'>
                                                        <div className='grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1'>
                                                            <div className='rounded-md border border-zinc-200 bg-zinc-50 p-3'>
                                                                <Badge className='mb-1'>
                                                                    Estado Anterior
                                                                </Badge>
                                                                <div className='ml-4'>
                                                                    {renderDetalleListado(
                                                                        item.estado_anterior,
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className='rounded-md border border-zinc-200 bg-zinc-50 p-3'>
                                                                <Badge className='mb-1'>
                                                                    Estado Actual
                                                                </Badge>
                                                                <div className='ml-4'>
                                                                    {renderDetalleListado(
                                                                        item.estado_actual,
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </div>
                        </div>
                        <div className='mt-4'>
                            <TableCardFooterTemplateV2 table={table} />
                        </div>
                    </>
                ) : (
                    <div className='text-center text-gray-500'>No hay cambios sobre la OT.</div>
                )}
            </CardBody>
        </Card>
    );
};

export default HistorialCambios;
