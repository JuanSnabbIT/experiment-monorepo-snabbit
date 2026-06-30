import Input from '@/components/form/Input';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalHeader } from '@/components/ui/Modal';
import ApiService from '@/services/ApiService';
import { useAppDispatch, useAppSelector } from '@/store';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
    listaEmpresasThunk,
    listaMisClientesRrhhThunk,
    listaMisClientesThunk,
} from '@/store/slices/empresa/empresaSlice';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
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
import Icon from '@/components/icon/Icon';
import { IEmpresa } from '@/interface/empresas.interface';
import Tooltip from '@/components/ui/Tooltip';
import Badge from '@/components/ui/Badge';
import { NavItem } from '@/components/layouts/Navigation/Nav';

const columnHelper = createColumnHelper<IEmpresa>();

interface ICrearClienteEnMenuProps {
    modoRrhh?: boolean;
}

function CrearClienteEnMenu({ modoRrhh = false }: ICrearClienteEnMenuProps) {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaEmpresas, listaMisClientes, listaMisClientesRrhh } = useAppSelector(
        (state) => state.empresa,
    );
    const [empresas, setEmpresas] = useState<IEmpresa[]>([]);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [isCreating, setIsCreating] = useState<boolean>(false);

    const listaVinculados = modoRrhh ? listaMisClientesRrhh : listaMisClientes;

    useEffect(() => {
        if (isOpen && personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaEmpresasThunk());
            if (modoRrhh) {
                dispatch(listaMisClientesRrhhThunk({ id_empresa: personalizacionUsuario.empresa }));
            } else {
                dispatch(listaMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }));
            }
        }
    }, [isOpen, personalizacionUsuario]);

    useEffect(() => {
        if (listaEmpresas.length > 0) {
            setEmpresas(
                listaEmpresas.filter(
                    (empresa) =>
                        empresa.id != personalizacionUsuario?.empresa &&
                        !listaVinculados.some(
                            (rel) =>
                                rel.info_cliente.id === empresa.id &&
                                rel.info_prestador_servicios.id === personalizacionUsuario?.empresa,
                        ),
                ),
            );
        }
    }, [listaEmpresas, listaVinculados]);

    const columns = [
        columnHelper.accessor('nombre', {
            cell: (info) => info.getValue(),
            header: 'Nombre',
        }),
        columnHelper.accessor('direccion_principal', {
            cell: (info) => info.getValue(),
            header: 'Dirección Principal',
        }),
        columnHelper.display({
            id: 'acciones',
            size: 60,
            cell: (info) => (
                <div className='flex justify-center'>
                    <Tooltip text='Añadir como cliente'>
                        <Button
                            isDisable={isCreating}
                            variant='solid'
                            size='sm'
                            icon='HeroPlus'
                            onClick={async () => {
                                setIsCreating(true);
                                try {
                                    const payload: Record<string, unknown> = {
                                        prestador_servicios: personalizacionUsuario?.empresa,
                                        cliente: info.row.original.id,
                                    };
                                    if (modoRrhh) {
                                        payload.tipo_relacion = 'rrhh-cliente';
                                    }
                                    const response = await ApiService.fetchData({
                                        url: `/api/relaciones-empresa/`,
                                        method: 'post',
                                        headers: { 'Content-Type': 'application/json' },
                                        data: JSON.stringify(payload),
                                    });
                                    if (response.data) {
                                        if (modoRrhh) {
                                            dispatch(
                                                listaMisClientesRrhhThunk({
                                                    id_empresa: personalizacionUsuario?.empresa,
                                                }),
                                            );
                                        } else {
                                            dispatch(
                                                listaMisClientesThunk({
                                                    id_empresa: personalizacionUsuario?.empresa,
                                                }),
                                            );
                                        }
                                        setIsCreating(false);
                                    }
                                } catch (error: any) {
                                    toast.error(error.response?.data ?? 'Error al vincular cliente');
                                    setIsCreating(false);
                                }
                            }}
                        />
                    </Tooltip>
                </div>
            ),
            header: '',
        }),
    ];

    const table = useReactTable({
        data: empresas,
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
            <NavItem
                onClick={() => setIsOpen(true)}
                text='Vincular Cliente'
                icon='DuoPlus'
            />
            <Modal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                isStaticBackdrop={true}
                isStaticBackdropAnimation={false}
                size='lg'>
                <ModalHeader>
                    <Badge className='text-xl'>Vincular Cliente</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='mb-4 flex justify-end gap-4'>
                        <div>
                            <Input
                                name='globalFilter'
                                placeholder='Buscar...'
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className='overflow-auto max-h-[70vh]'>
                        <Table className='w-full table-fixed'>
                            <THead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <Tr key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <Th
                                                key={header.id}
                                                isColumnBorder={false}
                                                className='text-left sticky top-0 bg-white dark:bg-zinc-900 z-10'>
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
                                            <Td key={cell.id} className='align-middle'>
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
                    </div>
                    <div className='mt-2'>
                        <TableCardFooterTemplateV2 table={table} />
                    </div>
                </ModalBody>
            </Modal>
        </>
    );
}

export default CrearClienteEnMenu;
