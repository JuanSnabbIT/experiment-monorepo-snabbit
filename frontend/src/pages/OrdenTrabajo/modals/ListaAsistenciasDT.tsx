import Icon from '@/components/icon/Icon';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IAsistenciaUsuario } from '@/interface/visitas.interface';
import CambiarEstadoAsistenciaUsuario from '@/pages/Visitas/modals/CambiarEstadoAsistenciaUsuario';
import {
    listaAsistenciaUsuariosThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { useGetDetalleTrabajoQuery } from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
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
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import CrearAsistenciaUsuarioEnOT from './CrearAsistenciaUsuarioEnOT';
import { useParams } from 'react-router-dom';

const columnHelper = createColumnHelper<IAsistenciaUsuario>();

function ListaAsistenciasDT({
    isOpen,
    setIsOpen,
    detalleSeleccionado,
    setDetalleSeleccionado,
}: {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    detalleSeleccionado: number | null;
    setDetalleSeleccionado: Dispatch<SetStateAction<number | null>>;
}) {
    const dispatch = useAppDispatch();
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    const { data: detalleDelDetalleTrabajo } = useGetDetalleTrabajoQuery(
        { ordenId: ordenId ?? 0, detalleId: detalleSeleccionado ?? 0 },
        { skip: !ordenId || !detalleSeleccionado || !isOpen },
    );
    const { listaAsistenciaUsuarios } = useAppSelector((state) => state.visita);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (detalleDelDetalleTrabajo && isOpen) {
            dispatch(
                listaAsistenciaUsuariosThunk({ id_visita: detalleDelDetalleTrabajo.trabajo_id }),
            );
        }
    }, [isOpen, detalleDelDetalleTrabajo]);

    useEffect(() => {
        if (!isOpen) {
            setDetalleSeleccionado(null);
        }
    }, [isOpen]);

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
                        {detalleDelDetalleTrabajo &&
                            detalleDelDetalleTrabajo.estado === 'en_proceso' &&
                            info.row.original.estado_revision === 'por_revisar' && (
                                <CambiarEstadoAsistenciaUsuario
                                    id_visita={detalleDelDetalleTrabajo?.trabajo_id}
                                    info={info.row.original}
                                    tipo='1'
                                />
                            )}
                        {detalleDelDetalleTrabajo &&
                            (detalleDelDetalleTrabajo.estado === 'en_proceso' ||
                                detalleDelDetalleTrabajo.estado === 'pendiente') &&
                            info.row.original.estado_revision === 'por_revisar' && (
                                <ConfirmarEliminar
                                    mensaje={`Estas a punto de eliminar esta asistencia a ${info.row.original.usuario_equipo_nombre} ¿desea continuar?`}
                                    peticionUrl={`/api/visitas-soporte/${detalleDelDetalleTrabajo.trabajo_id}/asistencias-usuarios/${info.row.original.id}/`}
                                    onDispatch={() => {
                                        dispatch(
                                            listaAsistenciaUsuariosThunk({
                                                id_visita: detalleDelDetalleTrabajo.trabajo_id,
                                            }),
                                        );
                                    }}
                                />
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
            <Modal
                size={'lg'}
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                isStaticBackdrop
                isStaticBackdropAnimation={false}>
                <ModalHeader>
                    <Badge className='text-xl'>Asistencias</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div className='flex justify-end'>
                            <AnimacionDeInputModoMovil
                                globalFilter={globalFilter}
                                setGlobalFilter={setGlobalFilter}>
                                {detalleDelDetalleTrabajo &&
                                    (detalleDelDetalleTrabajo.estado === 'pendiente' ||
                                        detalleDelDetalleTrabajo.estado === 'en_proceso') && (
                                        <CrearAsistenciaUsuarioEnOT />
                                    )}
                            </AnimacionDeInputModoMovil>
                        </div>
                        <div className='overflow-auto'>
                            {listaAsistenciaUsuarios.length > 0 ? (
                                <>
                                    <Table className='min-w-[500px] table-fixed'>
                                        <THead>
                                            {table.getHeaderGroups().map((headerGroup) => (
                                                <Tr key={headerGroup.id}>
                                                    {headerGroup.headers.map((header) => (
                                                        <Th
                                                            style={{
                                                                width: header.column.getSize(),
                                                            }}
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
                                                                        header.column.columnDef
                                                                            .header,
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
                                    <div className='mt-2 min-w-[500px]'>
                                        <TableCardFooterTemplateV2 table={table} />
                                    </div>
                                </>
                            ) : (
                                <div className='text-center text-xl'>No hay asistencias</div>
                            )}
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpen(false);
                            }}>
                            Cerrar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default ListaAsistenciasDT;
