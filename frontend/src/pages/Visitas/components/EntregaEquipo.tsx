import Icon from '@/components/icon/Icon';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IEntregaEquipo } from '@/interface/visitas.interface';
import { listaEntregaEquipoThunk, useAppDispatch, useAppSelector } from '@/store';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import AñadirEntregaEquipo from '../modals/AñadirEntregaEquipo';
import EditarEquipoVisita from '../modals/EditarEquipoVisita';

const columnHelper = createColumnHelper<IEntregaEquipo>();

const EntregaEquipo = ({
    id_cliente,
    id_visita,
}: {
    id_cliente: number | string | undefined;
    id_visita: number | string | undefined;
}) => {
    const dispatch = useAppDispatch();
    const { listaEntregaEquipos, detalleVisitasSoporte } = useAppSelector((state) => state.visita);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [isOpenEditar, setIsOpenEditar] = useState<boolean>(false);
    const [equipoSelected, setEquipoSelected] = useState<number | undefined>(undefined);

    useEffect(() => {
        if (id_visita) {
            dispatch(listaEntregaEquipoThunk({ id_visita }));
        }
    }, [id_visita]);

    const columns = [
        columnHelper.accessor('id', {
            cell: (info) => info.getValue(),
            header: 'N°',
            size: 25,
        }),
        columnHelper.accessor('datos_equipo.numero_serie', {
            cell: (info) => info.getValue(),
            header: 'N° de Serie Equipo',
        }),
        columnHelper.accessor('nombre_usuario_a_entregar', {
            cell: (info) => info.getValue(),
            header: 'Entregar al Usuario',
        }),
        columnHelper.accessor('estado_entrega_label', {
            cell: (info) => info.getValue(),
            header: 'Estado de la Entrega',
        }),
        columnHelper.accessor('observaciones', {
            cell: (info) => info.getValue(),
            header: 'Observaciones',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex justify-center gap-2'>
                    {detalleVisitasSoporte?.estado === 'pendiente' && (
                        <>
                            <Tooltip text='Editar Equipo'>
                                <Button
                                    variant='solid'
                                    icon='HeroTv'
                                    color='amber'
                                    onClick={() => {
                                        setEquipoSelected(info.row.original.equipo);
                                        setIsOpenEditar(true);
                                    }}
                                />
                            </Tooltip>
                            {/* {(info.row.original.estado_entrega != "entregado" && info.row.original.estado_entrega != "no_usuario") && (<CambiarEstadoEntregaEquipo entrega={info.row.original} />)} */}
                            {info.row.original.estado_entrega === 'por_entregar' && (
                                <ConfirmarEliminar
                                    mensaje={`Estas a punto de eliminar esta entrega a ${info.row.original.usuario_a_entregar} ¿desea continuar?`}
                                    peticionUrl={`/api/visitas-soporte/${id_visita}/entregas-equipos/${info.row.original.id}/`}
                                    onDispatch={() =>
                                        dispatch(listaEntregaEquipoThunk({ id_visita }))
                                    }
                                />
                            )}
                        </>
                    )}
                </div>
            ),
        }),
    ];

    const table = useReactTable({
        data: listaEntregaEquipos,
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
        if (!isOpenEditar) {
            dispatch(listaEntregaEquipoThunk({ id_visita }));
        }
    }, [isOpenEditar]);

    return (
        <>
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <Badge className='text-xl'>Entrega de Equipo</Badge>
                    </CardHeaderChild>
                    <CardHeaderChild>
                        <AnimacionDeInputModoMovil
                            globalFilter={globalFilter}
                            setGlobalFilter={setGlobalFilter}
                            anchoInput={200}>
                            {detalleVisitasSoporte &&
                                detalleVisitasSoporte.estado === 'pendiente' && (
                                    <AñadirEntregaEquipo
                                        id_visita={id_visita}
                                        id_cliente={id_cliente}
                                    />
                                )}
                        </AnimacionDeInputModoMovil>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className='z-0'>
                    <div className='overflow-auto'>
                        <Table className='min-w-[800px] table-fixed'>
                            <THead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <Tr key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <Th
                                                style={{ width: header.column.getSize() }}
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
                                    <Tr key={row.id}>
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
                        <div className='mt-2 min-w-[800px]'>
                            <TableCardFooterTemplateV2 table={table} />
                        </div>
                    </div>
                </CardBody>
            </Card>
            <EditarEquipoVisita
                isOpen={isOpenEditar}
                setIsOpen={setIsOpenEditar}
                id_equipo={equipoSelected}
            />
        </>
    );
};

export default EntregaEquipo;
