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
import { IUsuarioEmpresa } from '@/interface/empresas.interface';
import ApiService from '@/services/ApiService';
import { useAppSelector } from '@/store';
import { useGetUsuariosEmpresaQuery } from '@/store/slices/empresa/empresaApi';
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
import { toast } from 'react-toastify';

const columnHelper = createColumnHelper<IUsuarioEmpresa>();

function ListaUsuariosEmpresa() {
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const {
        data: listaUsuariosEmpresa = [],
        refetch: refetchUsuarios,
    } = useGetUsuariosEmpresaQuery(undefined);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (personalizacionUsuario) {
            refetchUsuarios();
        }
    }, [personalizacionUsuario, refetchUsuarios]);

    const columns = [
        columnHelper.accessor('nombre_usuario', {
            cell: (info) => info.getValue(),
            header: 'Nombre Completo',
        }),
        columnHelper.accessor('papeleta.rut', {
            cell: (info) => info.getValue(),
            header: 'RUN',
        }),
        columnHelper.accessor('email_usuario', {
            cell: (info) => info.getValue(),
            header: 'Correo',
        }),
        columnHelper.accessor('cargo', {
            cell: (info) => info.getValue(),
            header: 'Cargo',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex flex-wrap gap-2'>
                    <Tooltip text='Detalle'>
                        <Button
                            variant='solid'
                            onClick={() => {
                                navigate(
                                    `/empresa/detalle-usuario-empresa/${info.row.original.usuario}`,
                                );
                            }}
                            icon='HeroEye'
                            color='violet'
                        />
                    </Tooltip>
                    <Tooltip text='Eliminar'>
                        <ConfirmarEliminar
                            mensaje={`Estas Seguro que desas eliminar a ${info.row.original.nombre_usuario}`}
                            peticionUrl={`/api/users/${info.row.original.usuario}/`}
                            method='delete'
                            onDispatch={() => {
                                refetchUsuarios();
                            }}
                        />
                    </Tooltip>
                    {info.row.original.is_active ? (
                        <Tooltip text='Desactivar'>
                            <Button
                                variant='solid'
                                color='emerald'
                                icon='HeroUser'
                                onClick={async () => {
                                    try {
                                        const response = await ApiService.fetchData({
                                            url: `/api/users/${info.row.original.usuario}/`,
                                            method: 'patch',
                                            headers: { 'Content-Type': 'application/json' },
                                            data: JSON.stringify({ is_active: false }),
                                        });
                                        if (response.data) {
                                            toast.success('Usuario desactivado', {
                                                autoClose: 1000,
                                            });
                                            refetchUsuarios();
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
                                            url: `/api/users/${info.row.original.usuario}/`,
                                            method: 'patch',
                                            headers: { 'Content-Type': 'application/json' },
                                            data: JSON.stringify({ is_active: true }),
                                        });
                                        if (response.data) {
                                            toast.success('Usuario activado', { autoClose: 1000 });
                                            refetchUsuarios();
                                        }
                                    } catch (error: any) {
                                        toast.error(error.response.data);
                                    }
                                }}></Button>
                        </Tooltip>
                    )}
                </div>
            ),
        }),
    ];

    const table = useReactTable({
        data: listaUsuariosEmpresa,
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
        <PageWrapper isProtectedRoute={true} name='Lista Usuarios' title='Lista Usuarios'>
            <Subheader>
                <SubheaderLeft>
                    <Badge className='text-xl'>Usuarios</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}></AnimacionDeInputModoMovil>
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

export default ListaUsuariosEmpresa;
