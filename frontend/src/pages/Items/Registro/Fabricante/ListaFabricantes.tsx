import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IFabricante } from '@/interface/items.interface';
import { useAppDispatch, useAppSelector } from '@/store';
import { listaFabricanteThunk } from '@/store/slices/item/itemSlice';
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
import CrearFabricante from './modals/CrearFabricante';

const columnHelper = createColumnHelper<IFabricante>();

const ListaFabricantes = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { listaFabricante } = useAppSelector((state) => state.item);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaFabricanteThunk());
        }
    }, [personalizacionUsuario, dispatch]);

    const columns = [
        columnHelper.accessor('nombre', {
            cell: (info) => info.getValue(),
            header: 'Nombre',
        }),
        columnHelper.accessor('id', {
            cell: (info) => <div>{info.row.original.nombre || 'Sin Nombre'}</div>,
            header: 'Tamaño',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex gap-2'>
                    <Tooltip text='Detalle'>
                        <Button
                            variant='solid'
                            color='violet'
                            icon='HeroEye'
                            onClick={() => {
                                navigate(`/registros/detalle-fabricante/${info.row.original.id}`);
                            }}
                        />
                    </Tooltip>
                    <ConfirmarEliminar
                        nombre={info.row.original.nombre}
                        mensaje={
                            '¿Está seguro que desea eliminar este item? Se eliminarán todos los registros.'
                        }
                        peticionUrl={`/api/fabricantes/${info.row.original.id}/`}
                        onDispatch={() => {
                            if (personalizacionUsuario && personalizacionUsuario.empresa) {
                                dispatch(listaFabricanteThunk());
                            }
                        }}
                    />
                </div>
            ),
            header: 'Acciones',
        }),
    ];

    const table = useReactTable({
        data: listaFabricante,
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
        <PageWrapper isProtectedRoute={true} name='Lista Fabricantes' title='Lista Fabricantes'>
            <Subheader>
                <SubheaderLeft>
                    <Badge className='text-xl'>Fabricantes</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}>
                        <CrearFabricante />
                    </AnimacionDeInputModoMovil>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <Card>
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
};

export default ListaFabricantes;
