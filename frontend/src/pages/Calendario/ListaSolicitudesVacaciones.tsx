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
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import { ISolicitudVacaciones } from '@/interface/calendario.interface';
import { useGetSolicitudesVacacionesQuery } from '@/store/slices/vacaciones/vacacionesApi';
import { COLOR_ESTADO_VACACIONES } from '@/constants/vacaciones.constant';
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
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AprobarSolicitudVacaciones from './modals/AprobarSolicitudVacaciones';
import EliminarSolicitudVacaciones from './modals/EliminarSolicitudVacaciones';

const columnHelper = createColumnHelper<ISolicitudVacaciones>();

function ListaSolicitudesVacaciones() {
    const navigate = useNavigate();
    const { data: listaSolicitudesVacaciones = [], isLoading } = useGetSolicitudesVacacionesQuery();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [empresaFiltro, setEmpresaFiltro] = useState<TSelectOption | null>(null);

    const empresaOpciones = useMemo<TSelectOption[]>(() => {
        const nombres = [...new Set(listaSolicitudesVacaciones.map((s) => s.nombre_empresa).filter(Boolean))];
        return nombres.map((n) => ({ value: n, label: n }));
    }, [listaSolicitudesVacaciones]);

    const solicitudesFiltradas = useMemo(() =>
        empresaFiltro
            ? listaSolicitudesVacaciones.filter((s) => s.nombre_empresa === empresaFiltro.value)
            : listaSolicitudesVacaciones,
    [listaSolicitudesVacaciones, empresaFiltro]);

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
            cell: (info) => (
                <Badge
                    variant='solid'
                    color={COLOR_ESTADO_VACACIONES[info.row.original.estado] ?? 'zinc'}>
                    {info.getValue()}
                </Badge>
            ),
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
        data: solicitudesFiltradas,
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
                <SubheaderLeft>
                    <div className='flex items-center gap-3'>
                        <AnimacionDeInputModoMovil
                            globalFilter={globalFilter}
                            setGlobalFilter={setGlobalFilter}
                            anchoInput={200}
                        />
                        <div className='w-56'>
                            <SelectReact
                                name='empresa_filtro'
                                isClearable
                                options={empresaOpciones}
                                value={empresaFiltro}
                                onChange={(opt) => setEmpresaFiltro(opt as TSelectOption | null)}
                                placeholder='Filtrar por empresa...'
                            />
                        </div>
                    </div>
                </SubheaderLeft>
                <SubheaderRight />
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
                                            {isLoading ? (
                                                <Tr>
                                                    <Td colSpan={columns.length} className='text-center text-zinc-400'>
                                                        Cargando solicitudes...
                                                    </Td>
                                                </Tr>
                                            ) : table.getRowModel().rows.map((row) => (
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
