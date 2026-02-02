import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Button from '@/components/ui/Button';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
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
import { useAppSelector } from '@/store';
import { IEmpresa } from '@/interface/empresas.interface';
import CrearEmpresa from './modals/CrearEmpresa';
import EliminarEmpresa from './modals/EliminarEmpresa';
import CrearSucursal from './modals/CrearSucursal';
import Tooltip from '@/components/ui/Tooltip';
import { useNavigate } from 'react-router-dom';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import Badge from '@/components/ui/Badge';
import Card, { CardBody } from '@/components/ui/Card';
import AuthorityCheckNav from '@/components/layouts/AuthorityCheckNav/AuthorityCheckNav';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { useGetEmpresasQuery } from '@/store/slices/empresa/empresaApi';

const columnHelper = createColumnHelper<IEmpresa>();

const ListaEmpresas = () => {
    const navigate = useNavigate();
    const { personalizacionUsuario, listaGrupos } = useAppSelector((state) => state.auth);
    const {
        data: listaEmpresas = [],
        refetch: refetchEmpresas,
    } = useGetEmpresasQuery(undefined);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (personalizacionUsuario) {
            refetchEmpresas();
        }
    }, [personalizacionUsuario, refetchEmpresas]);

    const columns = [
        columnHelper.accessor('nombre', {
            cell: (info) => info.getValue(),
            header: 'Nombre',
        }),
        columnHelper.display({
            id: 'sucursales',
            cell: (info) => <div>{info.row.original.sucursales.length}</div>,
            header: 'Cantidad Sucursales',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex gap-2'>
                    <CrearSucursal empresaId={info.row.original.id.toString()} />
                    <AuthorityCheckNav authority={['staff']} userAuthority={listaGrupos?.grupos}>
                        <EliminarEmpresa empresaId={info.row.original.id.toString()} />
                    </AuthorityCheckNav>
                    <Tooltip text='Ver Detalle'>
                        <Button
                            variant='solid'
                            onClick={() => {
                                navigate(`/empresas/${info.row.original.id}`);
                            }}
                            icon='HeroEye'
                            color='violet'
                        />
                    </Tooltip>
                </div>
            ),
            header: '',
        }),
    ];

    const table = useReactTable({
        data: listaEmpresas,
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
        <PageWrapper isProtectedRoute={true} title='Empresas' name='Empresas'>
            <Subheader>
                <SubheaderLeft>
                    <Badge className='text-xl'>Empresas</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}>
                        <CrearEmpresa />
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

export default ListaEmpresas;
