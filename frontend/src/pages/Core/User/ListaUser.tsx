import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IUser } from '@/interface/user.interface';
import ApiService from '@/services/ApiService';
import { listaUsuariosThunk, useAppDispatch, useAppSelector } from '@/store';
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
import { toast } from 'react-toastify';

const columnHelper = createColumnHelper<IUser>();

function ListaUser() {
    const dispatch = useAppDispatch();
    const { listaUsuarios } = useAppSelector((state) => state.core);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        dispatch(listaUsuariosThunk());
    }, []);

    const columns = [
        columnHelper.accessor('first_name', {
            cell: (info) => (
                <div>
                    {info.row.original.first_name} {info.row.original.second_name}{' '}
                    {info.row.original.last_name} {info.row.original.second_last_name}
                </div>
            ),
            header: 'Nombre',
        }),
        columnHelper.accessor('email', {
            cell: (info) => info.getValue(),
            header: 'Correo',
        }),
        columnHelper.accessor('rut', {
            cell: (info) => <div>{info.row.original.rut ? info.row.original.rut : 'Sin Rut'}</div>,
            header: 'Rut',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div>
                    {info.row.original.is_active ? (
                        <Tooltip text='Desactivar'>
                            <Button
                                variant='solid'
                                color='emerald'
                                icon='HeroUser'
                                onClick={async () => {
                                    try {
                                        const response = await ApiService.fetchData({
                                            url: `/api/users/${info.row.original.pk}/`,
                                            method: 'patch',
                                            headers: { 'Content-Type': 'application/json' },
                                            data: JSON.stringify({ is_active: false }),
                                        });
                                        if (response.data) {
                                            toast.success('Usuario desactivado', {
                                                autoClose: 1000,
                                            });
                                            dispatch(listaUsuariosThunk());
                                        }
                                    } catch (error: any) {
                                        toast.error(error.response.data);
                                    }
                                }}></Button>
                        </Tooltip>
                    ) : (
                        <Tooltip text='Activar'>
                            <Button
                                variant='solid'
                                color='red'
                                icon='HeroUser'
                                onClick={async () => {
                                    try {
                                        const response = await ApiService.fetchData({
                                            url: `/api/users/${info.row.original.pk}/`,
                                            method: 'patch',
                                            headers: { 'Content-Type': 'application/json' },
                                            data: JSON.stringify({ is_active: true }),
                                        });
                                        if (response.data) {
                                            toast.success('Usuario activado', { autoClose: 1000 });
                                            dispatch(listaUsuariosThunk());
                                        }
                                    } catch (error: any) {
                                        toast.error(error.response.data);
                                    }
                                }}></Button>
                        </Tooltip>
                    )}
                </div>
            ),
            header: '',
        }),
    ];

    const table = useReactTable({
        data: listaUsuarios,
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
        <PageWrapper isProtectedRoute={true} title='Lista de Usuarios' name='Lista de Usuarios'>
            <Subheader>
                <SubheaderLeft>
                    <Badge className='text-xl'>Lista de Usuarios</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        anchoInput={160}
                    />
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <Card className='w-full'>
                    <CardBody className='z-0'>
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
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    );
}

export default ListaUser;
