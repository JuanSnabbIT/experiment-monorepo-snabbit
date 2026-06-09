import Icon from '@/components/icon/Icon';
import AuthorityCheckNav from '@/components/layouts/AuthorityCheckNav/AuthorityCheckNav';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IEmpresa } from '@/interface/empresas.interface';
import { useAppSelector } from '@/store';
import { useGetEmpresasQuery } from '@/store/slices/empresa/empresaApi';
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import CrearEmpresa from './modals/CrearEmpresa';
import CrearSucursal from './modals/CrearSucursal';
import EliminarEmpresa from './modals/EliminarEmpresa';

const columnHelper = createColumnHelper<IEmpresa>();

const ListaEmpresas = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { personalizacionUsuario, listaGrupos } = useAppSelector((state) => state.auth);
    const {
        data: listaEmpresas = [],
        refetch: refetchEmpresas,
    } = useGetEmpresasQuery(undefined);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    const legacySource = searchParams.get('legacy');
    const legacyTab = searchParams.get('tab');
    const mostrarAlertaLegacy = Boolean(legacySource?.startsWith('rrhh-'));

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
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                    />
                </SubheaderLeft>
                <SubheaderRight>
                    <CrearEmpresa />
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <Card>
                    <CardBody className='z-0'>
                        {mostrarAlertaLegacy && (
                            <Alert variant='outline' color='blue' icon='HeroInformationCircle' className='mb-3'>
                                Redirección automática desde RRHH legacy. Selecciona una empresa para continuar al flujo actualizado.
                                {legacyTab && (
                                    <span className='ml-1 font-medium'>Tab objetivo: {legacyTab}.</span>
                                )}
                            </Alert>
                        )}
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
