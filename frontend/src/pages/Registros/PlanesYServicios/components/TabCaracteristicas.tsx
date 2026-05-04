import Icon from '@/components/icon/Icon';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { ICaracteristicaServicio } from '@/interface/contrato.interface';
import {
    useDeleteCaracteristicaServicioMutation,
    useGetCaracteristicasServicioQuery,
} from '@/store/slices/contratos/contratoApi';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { getErrorMessage } from '@/utils/errorHandlers';
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
import { useState } from 'react';
import { toast } from 'react-toastify';
import ModalCaracteristicaServicio from '../modals/ModalCaracteristicaServicio';

const columnHelper = createColumnHelper<ICaracteristicaServicio>();

const TabCaracteristicas = () => {
    const { data: caracteristicas = [], isLoading } = useGetCaracteristicasServicioQuery();
    const [deleteCaracteristica] = useDeleteCaracteristicaServicioMutation();

    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ICaracteristicaServicio | undefined>();

    const handleEdit = (item: ICaracteristicaServicio) => {
        setSelectedItem(item);
        setModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedItem(undefined);
        setModalOpen(true);
    };

    const handleDelete = async (item: ICaracteristicaServicio) => {
        const confirmado = await confirmAlert({
            title: 'Eliminar característica',
            text: `Se eliminará "${item.nombre}" del catálogo.`,
            confirmText: 'Eliminar',
        });
        if (!confirmado) return;
        try {
            await deleteCaracteristica(item.id).unwrap();
            toast.success('Característica eliminada');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const columns = [
        columnHelper.accessor('nombre', {
            cell: (info) => <span className='font-medium'>{info.getValue()}</span>,
            header: 'Nombre',
        }),
        columnHelper.accessor('descripcion', {
            cell: (info) => (
                <span className='text-zinc-500'>{info.getValue() || '—'}</span>
            ),
            header: 'Descripción',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex space-x-2'>
                    <Tooltip text='Editar'>
                        <Button
                            variant='solid'
                            color='blue'
                            icon='HeroPencil'
                            size='sm'
                            onClick={() => handleEdit(info.row.original)}
                        />
                    </Tooltip>
                    <Tooltip text='Eliminar'>
                        <Button
                            variant='solid'
                            color='red'
                            icon='HeroTrash'
                            size='sm'
                            onClick={() => handleDelete(info.row.original)}
                        />
                    </Tooltip>
                </div>
            ),
            header: 'Acciones',
        }),
    ];

    const table = useReactTable({
        data: caracteristicas,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilter,
        initialState: {
            pagination: {
                pageSize: 5,
                pageIndex: 0,
            },
        },
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
                        <AnimacionDeInputModoMovil
                            globalFilter={globalFilter}
                            setGlobalFilter={setGlobalFilter}
                        />
                    </CardHeaderChild>
                    <CardHeaderChild>
                        <Tooltip text='Crear Característica'>
                            <Button variant='solid' icon='HeroPlus' onClick={handleCreate}>
                                Crear
                            </Button>
                        </Tooltip>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className='z-0'>
                    <div className='overflow-auto'>
                        <Table className='min-w-[500px] table-fixed'>
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
                                                        className={
                                                            header.column.getCanSort()
                                                                ? 'cursor-pointer select-none flex items-center'
                                                                : ''
                                                        }
                                                        onClick={header.column.getToggleSortingHandler()}>
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
                        <div className='mt-2 min-w-[500px]'>
                            <TableCardFooterTemplateV2 table={table} />
                        </div>
                    </div>
                </CardBody>
            </Card>

            <ModalCaracteristicaServicio
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
                caracteristica={selectedItem}
            />
        </>
    );
};

export default TabCaracteristicas;
