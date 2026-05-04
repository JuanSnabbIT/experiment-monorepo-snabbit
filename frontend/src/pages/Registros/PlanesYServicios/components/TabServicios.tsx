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

const formatMoney = (
    value?: string | number | null,
    currency: 'CLP' | 'USD' | 'UF' = 'CLP',
) => {
    const numeric = Number(value || 0);
    const decimals = currency === 'USD' ? 1 : currency === 'UF' ? 2 : 0;
    const formatted = new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(numeric);

    if (currency === 'CLP') {
        return `$${formatted}`;
    }
    return `${formatted} ${currency}`;
};

const truncateText = (value?: string | null, max = 120) => {
    if (!value) return '-';
    return value.length > max ? `${value.slice(0, max)}...` : value;
};

const TabServicios = () => {
    const { data: servicios = [] } = useGetServiciosQuery();
    const [deleteServicio] = useDeleteServicioMutation();

    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<IServicio | undefined>();
    const [offCanvasOpen, setOffCanvasOpen] = useState(false);

    const handleEdit = (item: IServicio) => {
        setSelectedItem(item);
        setModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedItem(undefined);
        setModalOpen(true);
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
            cell: (info) => {
                const descripcionCompleta = info.row.original.descripcion;
                const descripcionTruncada = truncateText(descripcionCompleta);
                const estaTruncada = (descripcionCompleta?.length ?? 0) > 120;

                return (
                    <div className='space-y-1'>
                        <div className='font-medium'>{info.getValue()}</div>
                        {estaTruncada ? (
                            <Tooltip text={descripcionCompleta ?? ''}>
                                <div className='cursor-help text-sm text-zinc-500'>
                                    {descripcionTruncada}
                                </div>
                            </Tooltip>
                        ) : (
                            <div className='text-sm text-zinc-500'>
                                {descripcionTruncada}
                            </div>
                        )}
                    </div>
                );
            },
            header: 'Servicio',
            size: 280,
        }),
        columnHelper.accessor('categoria_label', {
            cell: (info) => <Badge color='blue'>{info.getValue()}</Badge>,
            header: 'Categoria',
            size: 130,
        }),
        columnHelper.display({
            id: 'precio_base',
            cell: (info) => {
                const { precio, tipo_moneda } = info.row.original;
                const amount = Number(precio || 0);
                if (amount <= 0) return <span className='text-zinc-400'>Sin precio</span>;
                if (tipo_moneda === 'UF')
                    return <span className='font-medium'>{formatMoney(precio, 'UF')}</span>;
                if (tipo_moneda === 'USD')
                    return <span className='font-medium'>{formatMoney(precio, 'USD')}</span>;
                return <span className='font-medium'>${formatMoney(precio)}</span>;
            },
            header: 'Precio',
            size: 140,
        }),
        columnHelper.display({
            id: 'alcance',
            cell: (info) => (
                <ScopeSummary
                    serviceItems={info.row.original.alcance_caracteristicas}
                    includeText={info.row.original.incluye}
                    excludeText={info.row.original.no_incluye}
                    clauseText={info.row.original.clausulas_especiales}
                    compact
                />
            ),
            header: 'Alcance',
            enableSorting: false,
            size: 320,
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex gap-1'>
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
            size: 100,
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
                        <Table className='table-auto'>
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
        </>
    );
};

export default TabServicios;
