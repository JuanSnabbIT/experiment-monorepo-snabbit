import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IInvitacionEmpresa } from '@/interface/invitacion.interface';
import ApiService from '@/services/ApiService';
import { useAppDispatch, useAppSelector } from '@/store';
import {
    listaInvitacionesFiltroThunk,
    listaInvitacionesThunk,
} from '@/store/slices/invitacion/invitacionSlice';
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
import CrearInvitacionEmpresa from './modals/CrearInvitacionEmpresa';
import EliminarInvitacionRechazada from './modals/EliminarInvitacionRechazada';

const TABS: {
    [key in 'TODAS' | 'ACEPTADAS' | 'PENDIENTES' | 'EXPIRADAS']:
        | 'Todas'
        | 'Aceptadas'
        | 'Pendientes'
        | 'Expiradas';
} = {
    TODAS: 'Todas',
    ACEPTADAS: 'Aceptadas',
    PENDIENTES: 'Pendientes',
    EXPIRADAS: 'Expiradas',
};

const columnHelper = createColumnHelper<IInvitacionEmpresa>();

function ListaInvitacionesEmpresa() {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaInvitaciones } = useAppSelector((state) => state.invitacion);
    const [activeTab, setActiveTab] = useState(TABS.TODAS);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (activeTab === TABS.TODAS) {
            dispatch(listaInvitacionesThunk());
        } else {
            dispatch(
                listaInvitacionesFiltroThunk({
                    filtro: `?estado=${activeTab === TABS.ACEPTADAS ? 'aceptada' : activeTab === TABS.EXPIRADAS ? 'expirada' : activeTab === TABS.PENDIENTES ? 'pendiente' : 'aceptada'}`,
                }),
            );
        }
    }, [activeTab, personalizacionUsuario]);

    const columns = [
        columnHelper.accessor('email', {
            cell: (info) => info.getValue(),
            header: 'Email',
        }),
        columnHelper.accessor('first_name', {
            cell: (info) => (
                <div>
                    {info.row.original.first_name} {info.row.original.last_name}
                </div>
            ),
            header: 'Nombre',
        }),
        columnHelper.display({
            id: 'estado',
            cell: (info) => (
                <div>
                    {info.row.original.is_accepted
                        ? 'Aceptada'
                        : info.row.original.is_denied
                          ? 'Rechazada'
                          : info.row.original.is_expired
                            ? 'Expirada'
                            : 'Pendiente'}
                </div>
            ),
            header: 'Estado',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex gap-2'>
                    {/* {info.row.original.is_denied && (
                        <EliminarInvitacionRechazada invitacionId={info.row.original.id.toString()} />
                    )} */}
                    {!info.row.original.is_accepted &&
                        !info.row.original.is_denied &&
                        !info.row.original.is_expired && (
                            <>
                                <Tooltip text='Reenviar'>
                                    <Button
                                        variant='solid'
                                        color='amber'
                                        onClick={async () => {
                                            try {
                                                const response = await ApiService.fetchData({
                                                    url: `/api/invitaciones-empresa/${info.row.original.id}/reenviar-invitacion/`,
                                                    method: 'post',
                                                });
                                                if (response.data) {
                                                    toast.success('Invitación reenviada');
                                                }
                                            } catch (error: any) {
                                                toast.error(error.response.data);
                                            }
                                        }}>
                                        Reenviar
                                    </Button>
                                </Tooltip>
                                <EliminarInvitacionRechazada
                                    invitacionId={info.row.original.id.toString()}
                                />
                            </>
                        )}
                    {info.row.original.is_accepted && info.row.original.id_user && (
                        <Tooltip text='Deshabilitar Usuario'>
                            <Button
                                variant='solid'
                                onClick={async () => {
                                    try {
                                        const response = await ApiService.fetchData({
                                            url: `/api/users/${info.row.original.id_user}/`,
                                            method: 'patch',
                                            headers: { 'Content-Type': 'application/json' },
                                            data: JSON.stringify({ is_active: false }),
                                        });
                                        if (response.data) {
                                            toast.success('Usuario deshabilitado', {
                                                autoClose: 1000,
                                            });
                                            if (activeTab === TABS.TODAS) {
                                                dispatch(listaInvitacionesThunk());
                                            } else {
                                                dispatch(
                                                    listaInvitacionesFiltroThunk({
                                                        filtro: `?estado=${activeTab === TABS.ACEPTADAS ? 'aceptada' : activeTab === TABS.EXPIRADAS ? 'expirada' : activeTab === TABS.PENDIENTES ? 'pendiente' : 'aceptada'}`,
                                                    }),
                                                );
                                            }
                                        }
                                    } catch (error: any) {
                                        toast.error(error.response.data);
                                    }
                                }}>
                                Deshabilitar
                            </Button>
                        </Tooltip>
                    )}
                </div>
            ),
            header: '',
        }),
    ];

    const table = useReactTable({
        data: listaInvitaciones,
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
        <PageWrapper isProtectedRoute={true} title='Invitaciones' name='Invitaciones'>
            <Subheader>
                <SubheaderLeft>
                    {Object.values(TABS).map((i) => (
                        <Button
                            key={i}
                            className='!p-0'
                            isActive={i === activeTab}
                            onClick={() => setActiveTab(i)}>
                            {i}
                        </Button>
                    ))}
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        anchoInput={250}
                    />
                </SubheaderLeft>
                <SubheaderRight>
                    {personalizacionUsuario &&
                        personalizacionUsuario.empresa &&
                        personalizacionUsuario.sucursal_principal && (
                            <CrearInvitacionEmpresa
                                sucural={personalizacionUsuario.sucursal_principal}
                            />
                        )}
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

export default ListaInvitacionesEmpresa;
