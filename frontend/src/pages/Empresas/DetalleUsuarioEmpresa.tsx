import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IUltimasActividadesUsuarioEmpresa } from '@/interface/empresas.interface';
import { useAppDispatch, useAppSelector } from '@/store';
import {
    detalleUsuarioEmpresaPorUserThunk,
    listaUltimasActividadesThunk,
} from '@/store/slices/empresa/empresaSlice';
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
import { useParams } from 'react-router-dom';

const columnHelper = createColumnHelper<IUltimasActividadesUsuarioEmpresa>();

function DetalleUsuarioEmpresa() {
    const dispatch = useAppDispatch();
    const { id } = useParams();
    const { detalleUsuarioEmpresa, listaUltimasActividades } = useAppSelector(
        (state) => state.empresa,
    );
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (id) {
            dispatch(detalleUsuarioEmpresaPorUserThunk({ id_usuario: id }));
        }
    }, [id]);

    useEffect(() => {
        if (detalleUsuarioEmpresa) {
            dispatch(
                listaUltimasActividadesThunk({ id_usuario_empresa: detalleUsuarioEmpresa.id }),
            );
        }
    }, [detalleUsuarioEmpresa]);

    const columns = [
        columnHelper.accessor('tipo', {
            cell: (info) => info.getValue(),
            header: 'Tipo',
        }),
        columnHelper.accessor('fecha', {
            cell: (info) => dayjs(info.getValue()).format('DD-MM-YYYY'),
            header: 'Fecha',
        }),
        columnHelper.accessor('descripcion', {
            cell: (info) => info.getValue(),
            header: 'Descripción',
        }),
    ];

    const table = useReactTable({
        data: listaUltimasActividades,
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
        <PageWrapper isProtectedRoute={true} name='Detalle Usuario' title='Detalle Usuario'>
            <Container className='flex h-full w-full flex-col gap-4'>
                <div className='w-full'>
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Datos Usuario</Badge>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className='grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                                <div className='w-full'>
                                    <Badge>Nombre Completo</Badge>
                                    <div className='ml-4'>
                                        {detalleUsuarioEmpresa?.nombre_usuario}
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Run</Badge>
                                    <div className='ml-4'>
                                        {detalleUsuarioEmpresa?.papeleta.rut}
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Correo</Badge>
                                    <div className='ml-4'>
                                        {detalleUsuarioEmpresa?.email_usuario}
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Estado</Badge>
                                    <div className='ml-4'>
                                        {detalleUsuarioEmpresa?.estado_label}
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Cargo</Badge>
                                    <div className='ml-4'>{detalleUsuarioEmpresa?.cargo}</div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Fecha de Ingreso</Badge>
                                    <div className='ml-4'>
                                        {dayjs(detalleUsuarioEmpresa?.fecha_ingreso).format(
                                            'DD-MM-YYYY',
                                        )}
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Fecha de Contrato</Badge>
                                    <div className='ml-4'>
                                        {dayjs(detalleUsuarioEmpresa?.fecha_contrato).format(
                                            'DD-MM-YYYY',
                                        )}
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Tiempo Contratado</Badge>
                                    <div className='ml-4'>
                                        {detalleUsuarioEmpresa?.papeleta.dias_corridos.formato} (
                                        {detalleUsuarioEmpresa?.papeleta.dias_corridos.dias_totales}{' '}
                                        Dias)
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Dias Disponibles de Vacaciones</Badge>
                                    <div className='ml-4'>
                                        {detalleUsuarioEmpresa?.papeleta.dias_disponibles} Dia(s)
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Dias Tomados de Vacaciones</Badge>
                                    <div className='ml-4'>
                                        {detalleUsuarioEmpresa?.papeleta.dias_tomados} Dia(s)
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
                <div className='w-full'>
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Últimas Actividades</Badge>
                            </CardHeaderChild>
                            <CardHeaderChild>
                                <AnimacionDeInputModoMovil
                                    globalFilter={globalFilter}
                                    setGlobalFilter={setGlobalFilter}
                                    anchoInput={100}></AnimacionDeInputModoMovil>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody className='z-0'>
                            <div className='overflow-auto'>
                                <Table className='min-w-[500px] table-fixed'>
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
                                <div className='mt-2 min-w-[500px]'>
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

export default DetalleUsuarioEmpresa;
