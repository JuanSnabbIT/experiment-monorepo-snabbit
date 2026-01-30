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
import { IProveedorEmpresa } from '@/interface/items.interface';
import { useAppDispatch, useAppSelector } from '@/store';
import { listaProveedoresEmpresaThunk } from '@/store/slices/item/itemSlice';
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
import CrearProveedorEmpresa from './modals/CrearProveedorEmpresa';

const columnHelper = createColumnHelper<IProveedorEmpresa>();

function ListaProveedoresEmpresa() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaProveedoresEmpresa } = useAppSelector((state) => state.item);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaProveedoresEmpresaThunk({ id_empresa: personalizacionUsuario.empresa }));
        }
    }, [personalizacionUsuario]);

    const columns = [
        columnHelper.accessor('nombre', {
            cell: (info) => info.getValue(),
            header: 'Nombre',
        }),
        columnHelper.accessor('rut', {
            cell: (info) => info.getValue(),
            header: 'Rut',
        }),
        columnHelper.accessor('direccion', {
            cell: (info) => info.getValue(),
            header: 'Dirección',
        }),
        columnHelper.accessor('ejecutivo_asignado', {
            cell: (info) => (
                <div>
                    {info.row.original.ejecutivo_asignado
                        ? info.row.original.ejecutivo_asignado
                        : 'Sin Ejecutivo'}
                </div>
            ),
            header: 'Ejecutivo',
        }),
        columnHelper.accessor('email_ejecutivo', {
            cell: (info) => (
                <div>
                    {info.row.original.email_ejecutivo
                        ? info.row.original.email_ejecutivo
                        : 'Sin Correo'}
                </div>
            ),
            header: 'Correo Ejecutivo ',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex gap-2'>
                    <Tooltip text='Detalle Proveedor'>
                        <Button
                            variant='solid'
                            icon='HeroEye'
                            color='violet'
                            onClick={() => {
                                navigate(
                                    `/registros/detalle-proveedor-empresa/${info.row.original.id}`,
                                );
                            }}
                        />
                    </Tooltip>
                    <ConfirmarEliminar
                        mensaje={
                            '¿Está seguro que desea eliminar este proveedor? Se eliminarán todos los registros.'
                        }
                        peticionUrl={`/api/proveedores-empresa/${info.row.original.id}/`}
                        onDispatch={() => {
                            if (personalizacionUsuario && personalizacionUsuario.empresa) {
                                dispatch(
                                    listaProveedoresEmpresaThunk({
                                        id_empresa: personalizacionUsuario.empresa,
                                    }),
                                );
                            }
                        }}
                    />
                </div>
            ),
        }),
    ];

    const table = useReactTable({
        data: listaProveedoresEmpresa,
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
        <PageWrapper
            isProtectedRoute={true}
            name='Lista Proveedores Empresa'
            title='Lista Proveedores Empresa'>
            <Subheader>
                <SubheaderLeft>
                    <Badge className='text-xl'>Proveedores</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        anchoInput={160}>
                        <CrearProveedorEmpresa />
                    </AnimacionDeInputModoMovil>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <Card>
                    <CardBody className='z-0'>
                        <div className='overflow-auto'>
                            <Table className='min-w-[700px] table-fixed'>
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
                            <div className='mt-2 min-w-[700px]'>
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    );
}

export default ListaProveedoresEmpresa;
