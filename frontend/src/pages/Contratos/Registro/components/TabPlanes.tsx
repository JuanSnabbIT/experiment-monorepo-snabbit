import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
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
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'react-toastify';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import ModalPlanServicio from '../modals/ModalPlanServicio';
import PlanCatalogCard from './PlanCatalogCard';

const columnHelper = createColumnHelper<IPlanServicio>();

const SORT_OPTIONS: TSelectOption[] = [
    { value: 'default', label: 'Orden actual' },
    { value: 'nombre_asc', label: 'Nombre A-Z' },
    { value: 'nombre_desc', label: 'Nombre Z-A' },
];

const getSortValue = (sorting: SortingState) => {
    if (sorting[0]?.id === 'nombre' && sorting[0]?.desc) {
        return SORT_OPTIONS[2];
    }

    if (sorting[0]?.id === 'nombre') {
        return SORT_OPTIONS[1];
    }

    return SORT_OPTIONS[0];
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

    const handleSortChange = (option: TSelectOption | null) => {
        if (!option || option.value === 'default') {
            setSorting([]);
            return;
        }

        setSorting([
            {
                id: 'nombre',
                desc: option.value === 'nombre_desc',
            },
        ]);
    };

    const columns = [
        columnHelper.accessor('nombre', {
            header: 'Nombre',
        }),
        columnHelper.accessor((row) => row.descripcion || '', {
            id: 'descripcion',
            enableSorting: false,
            header: 'Descripcion',
        }),
        columnHelper.accessor((row) => row.servicios.map((service) => service.nombre).join(' '), {
            id: 'servicios',
            enableSorting: false,
            header: 'Servicios',
        }),
        columnHelper.accessor(
            (row) =>
                [row.incluye, row.no_incluye, row.clausulas_especiales]
                    .filter(Boolean)
                    .join(' '),
            {
                id: 'alcance',
                enableSorting: false,
                header: 'Alcance',
            },
        ),
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

    const filteredCount = table.getFilteredRowModel().rows.length;
    const visibleRows = table.getRowModel().rows;
    const hasResults = filteredCount > 0;

    return (
        <>
            <Card>
                <CardHeader>
                    <CardHeaderChild className='flex-1'>
                        <AnimacionDeInputModoMovil
                            globalFilter={globalFilter}
                            setGlobalFilter={setGlobalFilter}
                        />
                    </CardHeaderChild>
                    <CardHeaderChild className='w-full justify-between lg:w-auto lg:justify-end'>
                        <div className='min-w-[220px]'>
                            <SelectReact
                                name='orden_planes'
                                options={SORT_OPTIONS}
                                value={getSortValue(sorting)}
                                onChange={(option) => handleSortChange(option as TSelectOption)}
                                placeholder='Ordenar por...'
                            />
                        </div>
                        <Button variant='solid' icon='HeroPlus' onClick={handleCreate}>
                            Crear
                        </Button>
                    </CardHeaderChild>
                </CardHeader>

                <CardBody className='space-y-5'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <Badge variant='outline' color='blue'>
                            {planes.length} planes
                        </Badge>
                        <Badge variant='outline' color='emerald'>
                            {filteredCount} visibles
                        </Badge>
                        {sorting.length > 0 && (
                            <Badge variant='outline' color='amber'>
                                {sorting[0]?.desc ? 'Nombre Z-A' : 'Nombre A-Z'}
                            </Badge>
                        )}
                    </div>

                    {!planes.length ? (
                        <div className='flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-200 px-6 py-12 text-center dark:border-zinc-700'>
                            <div className='space-y-2'>
                                <h3 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                                    Aun no hay planes creados
                                </h3>
                                <p className='max-w-xl text-sm text-zinc-500 dark:text-zinc-400'>
                                    Crea el primer plan para comparar alcance, precios y servicios
                                    desde una vista vertical.
                                </p>
                            </div>
                            <Button variant='solid' icon='HeroPlus' onClick={handleCreate}>
                                Crear primer plan
                            </Button>
                        </div>
                    ) : !hasResults ? (
                        <div className='rounded-2xl border border-dashed border-zinc-200 px-6 py-12 text-center dark:border-zinc-700'>
                            <h3 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                                No hay resultados para tu busqueda
                            </h3>
                            <p className='mt-2 text-sm text-zinc-500 dark:text-zinc-400'>
                                Ajusta el filtro para volver a ver los planes del catalogo.
                            </p>
                        </div>
                    ) : (
                        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3'>
                            {visibleRows.map((row) => (
                                <PlanCatalogCard
                                    key={row.original.id}
                                    plan={row.original}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </CardBody>

                {hasResults && <TableCardFooterTemplateV2 table={table} />}
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
