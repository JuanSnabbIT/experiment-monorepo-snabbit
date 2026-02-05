import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { ISolicitudVacaciones } from '@/interface/calendario.interface';
import { useAppDispatch, useAppSelector } from '@/store';
import { listaMisSolicitudesVacacionesThunk } from '@/store/slices/calendario/calendarioSlice';
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
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FirmarSolicitudVacaciones from './modals/FirmarSolicitudVacaciones';

const columnHelper = createColumnHelper<ISolicitudVacaciones>();

function ListaSolicitudesVacacionesUsuario() {
    const dispatch = useAppDispatch();
    const { listaMisSolicitudesVacaciones } = useAppSelector((state) => state.calendario);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(listaMisSolicitudesVacacionesThunk());
    }, []);

    const columns = [
        columnHelper.accessor('papeleta.nombre_empleado', {
            cell: (info) => info.getValue(),
            header: 'Nombre',
        }),
        columnHelper.accessor('fecha_solicitud', {
            cell: (info) => <div>{dayjs(info.getValue()).format('DD-MM-YYYY')}</div>,
            header: 'Fecha de la Solicitud',
        }),
        columnHelper.accessor('estado_label', {
            cell: (info) => info.getValue(),
            header: 'Estado',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div>
                    {info.row.original.estado === '2' && (
                        <>
                            {info.row.original.firma_usuario ? (
                                <Tooltip text='Ver PDF'>
                                    <Button
                                        variant='solid'
                                        color='red'
                                        icon='HeroDocument'
                                        onClick={() => {
                                            navigate(
                                                `/vacaciones/pdf-solicitud/${info.row.original.id}`,
                                            );
                                        }}></Button>
                                </Tooltip>
                            ) : (
                                <FirmarSolicitudVacaciones solicitud_id={info.row.original.id} />
                            )}
                        </>
                    )}
                </div>
            ),
            header: '',
        }),
    ];

    const table = useReactTable({
        data: listaMisSolicitudesVacaciones,
        columns,
        state: {
            sorting: sorting,
            globalFilter: globalFilter,
        },
        onSortingChange: setSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <PageWrapper isProtectedRoute={true} title='Mis Solicitudes' name='Mis Solicitudes'>
            <Subheader>
                <SubheaderLeft>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        anchoInput={180}
                    />
                </SubheaderLeft>
                <SubheaderRight />
            </Subheader>
            <Container className='h-full w-full'>
                <div className='w-full'>
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
                </div>
            </Container>
        </PageWrapper>
    );
}

export default ListaSolicitudesVacacionesUsuario;
