import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Card, { CardBody } from '@/components/ui/Card';
import Table, { Th, THead, Tr, TBody, Td } from '@/components/ui/Table';
import { ISolicitudVacaciones } from '@/interface/calendario.interface';
import { useAppDispatch, useAppSelector } from '@/store';
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
import { listaSolicitudesVacacionesThunk } from '@/store/slices/calendario/calendarioSlice';
import dayjs from 'dayjs';
import EliminarSolicitudVacaciones from './modals/EliminarSolicitudVacaciones';
import Tooltip from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import AprobarSolicitudVacaciones from './modals/AprobarSolicitudVacaciones';
import Input from '@/components/form/Input';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';

const columnHelper = createColumnHelper<ISolicitudVacaciones>();

function ListaSolicitudesVacaciones() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { listaSolicitudesVacaciones } = useAppSelector((state) => state.calendario);
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        dispatch(listaSolicitudesVacacionesThunk());
    }, [personalizacionUsuario]);

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
                <div className='flex gap-2'>
                    <EliminarSolicitudVacaciones id_solicitud={info.row.original.id} />
                    <Tooltip text='Detalle'>
                        <Button
                            variant='solid'
                            icon='HeroEye'
                            color='violet'
                            onClick={() => {
                                navigate(
                                    `/vacaciones/detalle-solicitud-vacaciones/${info.row.original.id}`,
                                );
                            }}></Button>
                    </Tooltip>
                    {info.row.original.estado === '1' && (
                        <AprobarSolicitudVacaciones id_solicitud={info.row.original.id} />
                    )}
                </div>
            ),
            header: '',
        }),
    ];

    const table = useReactTable({
        data: listaSolicitudesVacaciones,
        columns: columns,
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
        <PageWrapper
            isProtectedRoute={true}
            title='Solicitudes Vacaciones'
            name='Solicitudes Vacaciones'>
            <Subheader>
                <SubheaderLeft />
                <SubheaderRight>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        anchoInput={200}
                    />
                </SubheaderRight>
            </Subheader>
            <Container>
                <div className='grid grid-cols-12'>
                    <div className='col-span-full'>
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
                                                                        header.column.columnDef
                                                                            .header,
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
                </div>
            </Container>
        </PageWrapper>
    );
}

export default ListaSolicitudesVacaciones;
