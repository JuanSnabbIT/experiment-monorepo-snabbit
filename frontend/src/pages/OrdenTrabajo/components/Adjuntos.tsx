import Icon from '@/components/icon/Icon';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IAdjuntoDeOrden } from '@/interface/ordenTrabajo.interface';
import { useGetAdjuntosQuery, useGetDetalleOrdenTrabajoQuery } from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
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
import { useNavigate } from 'react-router-dom';
import CrearAdjunto from '../modals/CrearAdjunto';

const columnHelper = createColumnHelper<IAdjuntoDeOrden>();

function Adjuntos({ ordenId }: { ordenId: number | undefined }) {
    const navigate = useNavigate();
    const { data: detalleOrdenTrabajo } = useGetDetalleOrdenTrabajoQuery(ordenId || '', {
        skip: !ordenId,
    });
    const { data: listaAdjuntos = [] } = useGetAdjuntosQuery(
        ordenId || '',
        { skip: !ordenId },
    );
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedAdjunto, setSelectedAdjunto] = useState<IAdjuntoDeOrden | null>(null);
    const [listaFiltrada, setListaFiltrada] = useState<IAdjuntoDeOrden[]>([]);

    useEffect(() => {
        if (listaAdjuntos.filter((adj) => adj.tipo != 'imagen').length > 0) {
            setListaFiltrada(listaAdjuntos.filter((adj) => adj.tipo != 'imagen'));
        }
    }, [listaAdjuntos]);

    const columns = [
        columnHelper.accessor('descripcion', {
            cell: (info) => info.getValue(),
            header: 'Descripcion',
        }),
        columnHelper.accessor('archivo', {
            cell: (info) =>
                info.getValue() ? (
                    <Button
                        variant='solid'
                        onClick={() => {
                            if (
                                info.row.original.archivo
                                    .split(/[?#]/)[0]
                                    .split('.')
                                    .pop()!
                                    .toLowerCase() === 'pdf'
                            ) {
                                navigate(
                                    `/orden-trabajo/${info.row.original.orden}/vista-previa-adjunto/${info.row.original.id}`,
                                );
                            } else {
                                setSelectedAdjunto(info.row.original);
                                setIsOpen(true);
                            }
                        }}>
                        Ver archivo
                    </Button>
                ) : (
                    'Sin Archivo'
                ),
            header: 'Archivo',
        }),
        columnHelper.accessor('tipo_label', {
            cell: (info) => info.getValue(),
            header: 'Tipo',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex gap-2'>
                    {detalleOrdenTrabajo &&
                        (detalleOrdenTrabajo.estado === 'pendiente' ||
                            detalleOrdenTrabajo.estado === 'en_proceso' ||
                            detalleOrdenTrabajo.estado === 'completada') && (
                            <ConfirmarEliminar
                                mensaje={`Estas seguro que deseas eliminar el adjunto ${info.row.original.tipo_label} ¿Desea continuar?`}
                                peticionUrl={`/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/archivos-adjuntos/${info.row.original.id}/`}
                                onDispatch={() => {
                                }}
                            />
                        )}
                </div>
            ),
            header: 'Acciones',
        }),
    ];

    const table = useReactTable({
        data: listaFiltrada,
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
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Ver Adjunto de Orden de Trabajo</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        {selectedAdjunto && (
                            <>
                                {selectedAdjunto.descripcion && (
                                    <div>
                                        <Badge>Descripción</Badge>
                                        <p className='px-4'>{selectedAdjunto.descripcion}</p>
                                    </div>
                                )}
                                {selectedAdjunto.tipo_label && (
                                    <div>
                                        <Badge>Tipo de Adjunto</Badge>
                                        <p className='px-4'>{selectedAdjunto.tipo_label}</p>
                                    </div>
                                )}
                                {selectedAdjunto.archivo && (
                                    <div>
                                        <Badge>Archivo</Badge>
                                        <a
                                            className='px-4'
                                            href={selectedAdjunto.archivo}
                                            target='_blank'
                                            rel='noopener noreferrer'>
                                            Descargar archivo
                                        </a>
                                    </div>
                                )}
                            </>
                        )}
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
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <Badge className='text-xl'>Adjuntos</Badge>
                    </CardHeaderChild>
                    <CardHeaderChild>
                        <AnimacionDeInputModoMovil
                            globalFilter={globalFilter}
                            setGlobalFilter={setGlobalFilter}
                            anchoInput={160}>
                            {detalleOrdenTrabajo &&
                                (detalleOrdenTrabajo.estado === 'pendiente' ||
                                    detalleOrdenTrabajo.estado === 'en_proceso' ||
                                    detalleOrdenTrabajo.estado === 'completada') && (
                                    <CrearAdjunto />
                                )}
                        </AnimacionDeInputModoMovil>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className='z-0'>
                    {listaAdjuntos.filter((adj) => adj.tipo != 'imagen').length > 0 ? (
                        <div className='overflow-auto'>
                            <Table className='min-w-[600px] table-fixed'>
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
                            <div className='mt-2 min-w-[600px]'>
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </div>
                    ) : (
                        <div className='text-center text-gray-500'>No se encontraron adjuntos.</div>
                    )}
                </CardBody>
            </Card>
        </>
    );
}

export default Adjuntos;
