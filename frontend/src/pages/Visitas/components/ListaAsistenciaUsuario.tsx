import Icon from '@/components/icon/Icon';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IAsistenciaUsuario } from '@/interface/visitas.interface';
import { listaAsistenciaUsuariosThunk, useAppDispatch, useAppSelector } from '@/store';
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
import { useParams } from 'react-router-dom';
import CambiarEstadoAsistenciaUsuario from '../modals/CambiarEstadoAsistenciaUsuario';
import CrearAsistenciaUsuario from '../modals/CrearAsistenciaUsuario';

const columnHelper = createColumnHelper<IAsistenciaUsuario>();

const ListaAsistenciaUsuario = ({}: { id_visita: number | string | undefined }) => {
    const dispatch = useAppDispatch();
    const { id } = useParams();
    const { listaAsistenciaUsuarios, detalleVisitasSoporte } = useAppSelector(
        (state) => state.visita,
    );
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        dispatch(listaAsistenciaUsuariosThunk({ id_visita: id }));
    }, []);

    const columns = [
        columnHelper.accessor('id', {
            cell: (info) => info.getValue(),
            header: 'N°',
            size: 25,
        }),
        columnHelper.accessor('usuario_equipo_nombre', {
            cell: (info) => info.getValue(),
            header: 'Usuario',
        }),
        columnHelper.accessor('estado_revision_label', {
            cell: (info) => info.getValue(),
            header: 'Estado de la revision',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => {
                return (
                    <div className='flex justify-center gap-2'>
                        {detalleVisitasSoporte?.estado === 'pendiente' && (
                            <>
                                <CambiarEstadoAsistenciaUsuario
                                    id_visita={id}
                                    info={info.row.original}
                                />
                                {info.row.original.estado_revision === 'por_revisar' && (
                                    <>
                                        <ConfirmarEliminar
                                            mensaje={`Estas a punto de eliminar esta asistencia a ${info.row.original.usuario_equipo_nombre} ¿desea continuar?`}
                                            peticionUrl={`/api/visitas-soporte/${id}/asistencias-usuarios/${info.row.original.id}/`}
                                            onDispatch={() =>
                                                dispatch(
                                                    listaAsistenciaUsuariosThunk({ id_visita: id }),
                                                )
                                            }
                                        />
                                    </>
                                )}
                            </>
                        )}
                    </div>
                );
            },
        }),
    ];

    const table = useReactTable({
        data: listaAsistenciaUsuarios,
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

    return (
        <>
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <Badge className='text-xl'>Asistencia Usuarios</Badge>
                    </CardHeaderChild>
                    <CardHeaderChild>
                        <AnimacionDeInputModoMovil
                            globalFilter={globalFilter}
                            setGlobalFilter={setGlobalFilter}
                            anchoInput={200}>
                            <CrearAsistenciaUsuario id_visita={detalleVisitasSoporte?.id} />
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
        </>
    );
};

export default ListaAsistenciaUsuario;
