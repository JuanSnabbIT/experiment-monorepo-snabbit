import Input from '@/components/form/Input';
import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { IItemEmpresa } from '@/interface/items.interface';
import { useAppDispatch, useAppSelector } from '@/store';
import {
    listaItemsEmpresaProveedorThunk,
    listaItemsNoProveedorThunk,
} from '@/store/slices/item/itemSlice';
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
import Tooltip from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import Modal, { ModalBody, ModalHeader } from '@/components/ui/Modal';
import Checkbox from '@/components/form/Checkbox';
import { toast } from 'react-toastify';
import ApiService from '@/services/ApiService';

const columnHelper = createColumnHelper<IItemEmpresa>();

interface AgregarItemProps {
    id_empresa: number;
    id_proveedor: number;
}

const AgregarItem = ({ id_empresa, id_proveedor }: AgregarItemProps) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { listaItemsNoProveedor } = useAppSelector((state) => state.item);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    useEffect(() => {
        if (id_empresa && id_proveedor) {
            dispatch(listaItemsNoProveedorThunk({ id_empresa, id_proveedor }));
        }
    }, [id_empresa, id_proveedor]);

    useEffect(() => {
        if (isOpen && id_empresa && id_proveedor) {
            dispatch(listaItemsNoProveedorThunk({ id_empresa, id_proveedor }));
        }
    }, [isOpen, id_empresa, id_proveedor, dispatch]);

    const handleCheckboxClick = (itemId: number) => {
        setSelectedItems((prevSelectedItems) =>
            prevSelectedItems.includes(itemId)
                ? prevSelectedItems.filter((id) => id !== itemId)
                : [...prevSelectedItems, itemId],
        );
    };

    const handleAddItems = async () => {
        try {
            const response = await ApiService.fetchData({
                url: `/api/proveedores-empresa/${id_proveedor}/asociar-items/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ items: selectedItems }),
            });
            if (response.status === 200) {
                toast.success('Items asociados correctamente');
                dispatch(listaItemsNoProveedorThunk({ id_empresa, id_proveedor }));
                dispatch(listaItemsEmpresaProveedorThunk({ id_empresa, id_proveedor }));
                setIsOpen(false);
            }
        } catch (error) {
            console.error('Error al asociar los items:', error);
            toast.error('Error al asociar los items');
        }
    };

    const columns = [
        columnHelper.accessor('nombre', {
            cell: (info) => info.getValue(),
            header: 'Nombre',
        }),
        columnHelper.accessor('datos_categoria.nombre', {
            cell: (info) => (
                <div>
                    {(info.row.original.datos_categoria &&
                        info.row.original.datos_categoria.nombre) ||
                        'Sin Categoria'}
                </div>
            ),
            header: 'Categoria',
        }),
        columnHelper.accessor('datos_fabricante.nombre', {
            cell: (info) => (
                <div>
                    {(info.row.original.datos_fabricante &&
                        info.row.original.datos_fabricante.nombre) ||
                        'Sin Fabricante'}
                </div>
            ),
            header: 'Fabricante',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex space-x-2'>
                    <Tooltip text='Añadir'>
                        <Checkbox
                            id='id'
                            name='item'
                            color='violet'
                            checked={selectedItems.includes(info.row.original.id)}
                            onChange={() => handleCheckboxClick(info.row.original.id)}
                        />
                    </Tooltip>
                </div>
            ),
            header: 'Acciones',
        }),
    ];

    const table = useReactTable({
        data: listaItemsNoProveedor,
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
            <Tooltip text='Añadir Item'>
                <Button variant='solid' onClick={() => setIsOpen(true)} icon='HeroPlus'></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Items</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='mb-4 flex justify-end gap-4'>
                        <div>
                            <Input
                                name='globalFilter'
                                placeholder='Buscar...'
                                value={globalFilter}
                                onChange={(e) => {
                                    setGlobalFilter(e.target.value);
                                }}
                            />
                        </div>
                    </div>
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
                        <div className='mt-2 min-w-[600px]'>
                            <TableCardFooterTemplateV2 table={table} />
                        </div>
                    </div>
                    <div className='mt-4 flex justify-end'>
                        <Button variant='solid' onClick={handleAddItems}>
                            Asociar Items
                        </Button>
                    </div>
                </ModalBody>
            </Modal>
        </>
    );
};

export default AgregarItem;
