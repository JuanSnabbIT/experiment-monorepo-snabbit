import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IPlanServicio } from '@/interface/contrato.interface';
import {
    useDeletePlanServicioMutation,
    useGetPlanesServicioQuery,
} from '@/store/slices/contratos/contratoApi';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert } from '@/utils/sweetAlert';
import {
    SortingState,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'react-toastify';
import ScopeSummary from '../../components/ScopeSummary';
import ModalPlanServicio from '../modals/ModalPlanServicio';

const columnHelper = createColumnHelper<IPlanServicio>();

const formatMoney = (value?: string | number | null, suffix = '') => {
    const numeric = Number(value || 0);
    return `${new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: suffix === 'UF' ? 2 : 0,
        maximumFractionDigits: suffix === 'UF' ? 2 : 0,
    }).format(numeric)}${suffix ? ` ${suffix}` : ''}`;
};

const truncateText = (value?: string | null, max = 120) => {
    if (!value) return '-';
    return value.length > max ? `${value.slice(0, max)}...` : value;
};

const TabPlanes = () => {
    const { data: planes = [] } = useGetPlanesServicioQuery();
    const [deletePlan] = useDeletePlanServicioMutation();

    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<IPlanServicio | undefined>();

    const handleEdit = (item: IPlanServicio) => {
        setSelectedItem(item);
        setModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedItem(undefined);
        setModalOpen(true);
    };

    const handleDelete = async (item: IPlanServicio) => {
        const confirmado = await confirmAlert({
            title: 'Eliminar plan',
            text: `Se eliminara "${item.nombre}" del catalogo.`,
            confirmText: 'Eliminar',
        });
        if (!confirmado) return;
        try {
            await deletePlan(item.id).unwrap();
            toast.success('Plan eliminado');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const columns = [
        columnHelper.accessor('nombre', {
            cell: (info) => (
                <div className='space-y-1'>
                    <div className='font-medium'>{info.getValue()}</div>
                    <div className='text-sm text-zinc-500'>
                        {truncateText(info.row.original.descripcion)}
                    </div>
                </div>
            ),
            header: 'Plan',
        }),
        columnHelper.accessor('servicios', {
            cell: (info) => {
                const items = info.getValue();
                if (!items || items.length === 0) return <span className='text-zinc-400'>-</span>;
                return (
                    <div className='flex flex-wrap gap-1'>
                        {items.map((s) => (
                            <Badge key={s.id} color='emerald' variant='outline'>
                                {s.nombre}
                            </Badge>
                        ))}
                    </div>
                );
            },
            header: 'Servicios incluidos',
            enableSorting: false,
        }),
        columnHelper.display({
            id: 'precio_plan',
            cell: (info) => (
                <div className='min-w-[210px] space-y-2 text-sm'>
                    <div className='flex justify-between gap-3'>
                        <span className='text-zinc-500'>CLP</span>
                        <span className='font-medium'>{formatMoney(info.row.original.precio_clp)}</span>
                    </div>
                    <div className='flex justify-between gap-3'>
                        <span className='text-zinc-500'>UF</span>
                        <span className='font-medium'>{formatMoney(info.row.original.precio_uf, 'UF')}</span>
                    </div>
                    <div className='flex justify-between gap-3'>
                        <span className='text-zinc-500'>USD</span>
                        <span className='font-medium'>{formatMoney(info.row.original.precio_usd, 'USD')}</span>
                    </div>
                    <div className='rounded-2xl bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-900/40 dark:text-zinc-300'>
                        Sugerido: {formatMoney(info.row.original.precio_sugerido_clp)} CLP
                    </div>
                </div>
            ),
            header: 'Precio del plan',
        }),
        columnHelper.display({
            id: 'alcance',
            cell: (info) => (
                <div className='min-w-[340px]'>
                    <ScopeSummary
                        planItems={info.row.original.alcance_heredado}
                        conflicts={info.row.original.alcance_conflictos}
                        includeText={info.row.original.incluye}
                        excludeText={info.row.original.no_incluye}
                        clauseText={info.row.original.clausulas_especiales}
                        compact
                    />
                </div>
            ),
            header: 'Alcance heredado',
            enableSorting: false,
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
        data: planes,
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
                    <CardHeaderChild>
                        <Tooltip text='Crear Plan'>
                            <Button variant='solid' icon='HeroPlus' onClick={handleCreate}>
                                Crear
                            </Button>
                        </Tooltip>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className='z-0'>
                    <div className='overflow-auto'>
                        <Table className='min-w-[1240px] table-fixed'>
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
                        <div className='mt-2 min-w-[1240px]'>
                            <TableCardFooterTemplateV2 table={table} />
                        </div>
                    </div>
                </CardBody>
            </Card>

            <ModalPlanServicio
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
                plan={selectedItem}
            />
        </>
    );
};

export default TabPlanes;
