import Icon from '@/components/icon/Icon';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { IUsuarioAsignadoSoporte, IUsuarioVinculado } from '@/interface/ordenTrabajo.interface';
import {
    eliminarUsuarioAsignadoSoporteThunk,
    listaUsuariosAsignadosSoporteThunk,
    listaUsuariosVinculadosOTThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { confirmAlert } from '@/utils/sweetAlert';
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
import { toast } from 'react-toastify';
import CrearUsuarioAsignadoOT from '../modals/CrearUsuarioAsignadoOT';

interface UsuariosVinculadosOTProps {
    soporteId?: number;
    onRefreshSoporte?: () => void;
}

const columnHelper = createColumnHelper<IUsuarioVinculado>();

function UsuariosVinculadosOT({ soporteId, onRefreshSoporte }: UsuariosVinculadosOTProps) {
    const dispatch = useAppDispatch();
    const { detalleOrdenTrabajo, listaUsuariosVinculadosOT, listaUsuariosAsignadosSoporte } =
        useAppSelector((state) => state.ordenTrabajo);
    const isSoporteMode = typeof soporteId === 'number';
    const soporteIdNumber = typeof soporteId === 'number' ? soporteId : null;
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (!detalleOrdenTrabajo || isSoporteMode) return;
        dispatch(listaUsuariosVinculadosOTThunk({ id_orden: detalleOrdenTrabajo.id }));
    }, [detalleOrdenTrabajo, isSoporteMode, dispatch]);

    useEffect(() => {
        if (detalleOrdenTrabajo && isSoporteMode && soporteIdNumber !== null) {
            dispatch(
                listaUsuariosAsignadosSoporteThunk({
                    id_orden: detalleOrdenTrabajo.id,
                    id_soporte: soporteIdNumber,
                }),
            );
        }
    }, [detalleOrdenTrabajo, isSoporteMode, soporteIdNumber, dispatch]);

    const refreshSoporteLista = () => {
        if (detalleOrdenTrabajo && isSoporteMode && soporteIdNumber !== null) {
            dispatch(
                listaUsuariosAsignadosSoporteThunk({
                    id_orden: detalleOrdenTrabajo.id,
                    id_soporte: soporteIdNumber,
                }),
            );
            if (onRefreshSoporte) onRefreshSoporte();
        }
    };

    const handleDeleteSoporte = async (usuario: IUsuarioAsignadoSoporte) => {
        if (!detalleOrdenTrabajo || soporteIdNumber === null) return;
        const ok = await confirmAlert({
            title: 'Confirmar eliminacion',
            text: `¿Eliminar asignacion de ${usuario.nombre_usuario}?`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            icon: 'warning',
            confirmColor: '#dc2626',
        });
        if (!ok) return;
        try {
            await dispatch(
                eliminarUsuarioAsignadoSoporteThunk({
                    id_orden: detalleOrdenTrabajo.id,
                    id_soporte: soporteIdNumber,
                    id_usuario_asignado: usuario.id,
                }),
            );
            toast.success('Asignación eliminada', { autoClose: 1000 });
            refreshSoporteLista();
        } catch (error: any) {
            const msg = Object.values(error?.response?.data || {})
                .flat()
                .join(' ');
            toast.error(msg || 'Error al eliminar asignación');
        }
    };

    if (isSoporteMode) {
        return (
            <div className='flex flex-col gap-4'>
                <div className='flex items-center justify-between'>
                    <Badge className='text-xl'>Usuarios Asignados</Badge>
                    {soporteIdNumber !== null && (
                        <CrearUsuarioAsignadoOT
                            soporteId={soporteIdNumber}
                            onSuccess={refreshSoporteLista}
                        />
                    )}
                </div>

                <div className='overflow-auto'>
                    {listaUsuariosAsignadosSoporte && listaUsuariosAsignadosSoporte.length > 0 ? (
                        <Table>
                            <THead>
                                <Tr>
                                    <Th className='text-left'>Usuario</Th>
                                    <Th className='text-left'>N° Serie Equipo</Th>
                                    <Th className='text-left'>Tipo Equipo</Th>
                                    <Th className='text-left'>Trabajo Realizado</Th>
                                    <Th className='text-left'>Estado</Th>
                                    <Th className='text-center'>Acciones</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {listaUsuariosAsignadosSoporte.map((usuario) => (
                                    <Tr key={usuario.id}>
                                        <Td>{usuario.nombre_usuario}</Td>
                                        <Td>{usuario.numero_serie_equipo}</Td>
                                        <Td>{usuario.tipo_equipo}</Td>
                                        <Td>
                                            {usuario.trabajo_realizado || (
                                                <span className='italic text-gray-400'>-</span>
                                            )}
                                        </Td>
                                        <Td>
                                            <Badge color={usuario.resuelto ? 'emerald' : 'amber'}>
                                                {usuario.resuelto ? 'Resuelto' : 'Pendiente'}
                                            </Badge>
                                        </Td>
                                        <Td className='text-center'>
                                            <Button
                                                variant='solid'
                                                color='red'
                                                size='xs'
                                                icon='HeroTrash'
                                                onClick={() => handleDeleteSoporte(usuario)}
                                            />
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    ) : (
                        <div className='py-4 text-center text-gray-500'>
                            No hay usuarios asignados. Use + para agregar.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const columns = [
        columnHelper.display({
            id: 'usuario',
            cell: (info) => (
                <div>
                    {info.row.original.usuario_empresa ? (
                        <>
                            <div>{info.row.original.datos_usuario?.nombre}</div>
                            <div className='text-sm'>
                                Correo: {info.row.original.datos_usuario?.correo}
                            </div>
                        </>
                    ) : (
                        <>
                            <div>{info.row.original.usuario_externo}</div>
                            <div className='text-sm'>
                                Correo: {info.row.original.correo_usuario_externo}
                            </div>
                        </>
                    )}
                </div>
            ),
            header: 'Usuario',
        }),
        columnHelper.display({
            id: 'es_usuario_empresa',
            cell: (info) => <div>{info.row.original.usuario_empresa ? 'Si' : 'No'}</div>,
            header: '¿Es Usuario Empresa?',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div>
                    {(detalleOrdenTrabajo?.estado === 'pendiente' ||
                        detalleOrdenTrabajo?.estado === 'en_proceso') && (
                        <ConfirmarEliminar
                            mensaje='¿Esta seguro de desvincular a este usuario de la OT?'
                            onDispatch={() => {
                                dispatch(
                                    listaUsuariosVinculadosOTThunk({
                                        id_orden: detalleOrdenTrabajo.id,
                                    }),
                                );
                            }}
                            peticionUrl={`/api/ordenes-trabajo/${detalleOrdenTrabajo.id}/usuarios-vinculados/${info.row.original.id}/`}
                            nombre='Usuario'
                        />
                    )}
                </div>
            ),
        }),
    ];

    const table = useReactTable({
        data: listaUsuariosVinculadosOT,
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
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-xl'>Usuarios Vinculados</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    <CrearUsuarioAsignadoOT />
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='z-0'>
                <div className='overflow-auto'>
                    {listaUsuariosVinculadosOT.length > 0 ? (
                        <>
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
                                                                className:
                                                                    header.column.getCanSort()
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
                                                            }[
                                                                header.column.getIsSorted() as string
                                                            ] ?? null}
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
                        </>
                    ) : (
                        <div className='text-center text-gray-500'>No se encontraron usuarios.</div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
}

export default UsuariosVinculadosOT;
