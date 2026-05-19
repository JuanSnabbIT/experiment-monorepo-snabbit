import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Modal, { ModalBody, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IServicio } from '@/interface/contrato.interface';
import ScopeSummary from '@/pages/Contratos/components/ScopeSummary';
import {
    useDeleteServicioMutation,
    useGetServiciosQuery,
} from '@/store/slices/contratos/contratoApi';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { formatCurrency } from '@/utils/currency';
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
import ModalServicio from '../modals/ModalServicio';
import TabCaracteristicas from './TabCaracteristicas';

const columnHelper = createColumnHelper<IServicio>();

const TabServicios = () => {
    const { data: servicios = [] } = useGetServiciosQuery();
    const [deleteServicio] = useDeleteServicioMutation();

    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<IServicio | undefined>();
    const [offCanvasOpen, setOffCanvasOpen] = useState(false);
    const [detalleOpen, setDetalleOpen] = useState(false);
    const [detalleItem, setDetalleItem] = useState<IServicio | undefined>();

    const handleEdit = (item: IServicio) => {
        setSelectedItem(item);
        setModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedItem(undefined);
        setModalOpen(true);
    };

    const handleVerDetalle = (item: IServicio) => {
        setDetalleItem(item);
        setDetalleOpen(true);
    };

    const handleDelete = async (item: IServicio) => {
        const confirmado = await confirmAlert({
            title: 'Eliminar servicio',
            text: `Se eliminara "${item.nombre}" del catalogo.`,
            confirmText: 'Eliminar',
        });
        if (!confirmado) return;
        try {
            await deleteServicio(item.id).unwrap();
            toast.success('Servicio eliminado');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const columns = [
        columnHelper.accessor('nombre', {
            cell: (info) => <span className='font-medium'>{info.getValue()}</span>,
            header: 'Nombre',
            size: 180,
        }),
        columnHelper.accessor('descripcion', {
            cell: (info) => {
                const value = info.getValue();
                if (!value) return <span className='text-zinc-400'>—</span>;
                return (
                    <Tooltip text={value}>
                        <span className='line-clamp-2 cursor-help text-sm text-zinc-500 dark:text-zinc-400'>
                            {value}
                        </span>
                    </Tooltip>
                );
            },
            header: 'Descripcion',
            enableSorting: false,
            size: 280,
        }),
        columnHelper.accessor('categoria_label', {
            cell: (info) => <Badge color='blue'>{info.getValue()}</Badge>,
            header: 'Categoria',
            size: 140,
        }),
        columnHelper.display({
            id: 'precio_base',
            cell: (info) => {
                const { precio, tipo_moneda } = info.row.original;
                const amount = Number(precio || 0);
                if (amount <= 0) return <span className='text-zinc-400'>Sin precio</span>;
                return <span className='font-medium'>{formatCurrency(precio, tipo_moneda)}</span>;
            },
            header: 'Precio',
            size: 140,
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex gap-1'>
                    <Tooltip text='Ver detalle'>
                        <Button
                            variant='solid'
                            color='violet'
                            icon='HeroEye'
                            size='sm'
                            onClick={() => handleVerDetalle(info.row.original)}
                        />
                    </Tooltip>
                    <Tooltip text='Editar'>
                        <Button
                            variant='solid'
                            color='amber'
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
            size: 80,
        }),
    ];

    const table = useReactTable({
        data: servicios,
        columns,
        state: { sorting, globalFilter },
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
                        <AnimacionDeInputModoMovil
                            globalFilter={globalFilter}
                            setGlobalFilter={setGlobalFilter}
                        />
                    </CardHeaderChild>
                    <CardHeaderChild className='flex gap-2'>
                        <Button
                            icon='HeroTag'
                            variant='outline'
                            onClick={() => setOffCanvasOpen(true)}>
                            Administrar caracteristicas
                        </Button>
                        <Tooltip text='Crear Servicio'>
                            <Button variant='solid' icon='HeroPlus' onClick={handleCreate}>
                                Crear
                            </Button>
                        </Tooltip>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className='z-0'>
                    <div className='overflow-auto'>
                        <Table className='table-fixed w-full'>
                            <THead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <Tr key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <Th
                                                key={header.id}
                                                isColumnBorder={false}
                                                className='text-left'
                                                style={{ width: header.getSize() }}>
                                                {header.isPlaceholder ? null : (
                                                    <div
                                                        key={header.id}
                                                        aria-hidden='true'
                                                        className={
                                                            header.column.getCanSort()
                                                                ? 'flex cursor-pointer select-none items-center'
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
                                            <Td key={cell.id} style={{ width: cell.column.getSize() }}>
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
                        <div className='mt-2 min-w-[1200px]'>
                            <TableCardFooterTemplateV2 table={table} />
                        </div>
                    </div>
                </CardBody>
            </Card>

            <ModalServicio
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
                servicio={selectedItem}
            />

            <Modal isOpen={offCanvasOpen} setIsOpen={setOffCanvasOpen} isStaticBackdrop size='lg'>
                <ModalHeader>Características del catálogo</ModalHeader>
                <ModalBody>
                    <TabCaracteristicas />
                </ModalBody>
            </Modal>

            <Modal isOpen={detalleOpen} setIsOpen={setDetalleOpen} size='lg'>
                <ModalHeader>
                    <div className='flex flex-col gap-0.5'>
                        <span className='text-xl font-semibold'>{detalleItem?.nombre}</span>
                        {detalleItem?.categoria_label && (
                            <Badge color='blue' className='w-fit text-xs'>
                                {detalleItem.categoria_label}
                            </Badge>
                        )}
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-6'>
                        {detalleItem?.descripcion && (
                            <div>
                                <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                                    Descripcion
                                </p>
                                <p className='text-sm leading-relaxed text-zinc-700 dark:text-zinc-300'>
                                    {detalleItem.descripcion}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className='mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                                Alcance
                            </p>
                            {detalleItem && (
                                <ScopeSummary
                                    serviceItems={detalleItem.alcance_caracteristicas}
                                    includeText={detalleItem.incluye}
                                    excludeText={detalleItem.no_incluye}
                                    clauseText={detalleItem.clausulas_especiales}
                                />
                            )}
                        </div>
                    </div>
                </ModalBody>
            </Modal>
        </>
    );
};

export default TabServicios;
