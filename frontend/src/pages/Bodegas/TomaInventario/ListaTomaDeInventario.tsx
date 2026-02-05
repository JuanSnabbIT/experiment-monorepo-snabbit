import FieldWrap from '@/components/form/FieldWrap';
import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { ITomaInventario } from '@/interface/bodega.interface';
import ApiService from '@/services/ApiService';
import {
    listaBodegasPorEmpresaThunk,
    listaTomaInventarioFiltroThunk,
    listaTomaInventarioThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
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
import 'dayjs/locale/es';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MultiValue } from 'react-select';
import { toast } from 'react-toastify';
import CrearTomaInventario from './modals/CrearTomaInventario';

const columnHelper = createColumnHelper<ITomaInventario>();

function ListaTomaDeInventario() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { listaTomaInventario, listaBodegasPorEmpresa } = useAppSelector((state) => state.bodega);
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const [bodegasSeleccionada, setBodegasSeleccionada] = useState<
        { id: number; nombre: string }[]
    >([]);
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaTermino, setFechaTermino] = useState<string>('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaBodegasPorEmpresaThunk({ id_empresa: personalizacionUsuario.empresa }));
        }
    }, [personalizacionUsuario]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (bodegasSeleccionada.length > 0) {
            params.append('bodegas', bodegasSeleccionada.map((bode) => bode.id).toString());
        }
        if (fechaInicio.length > 0) {
            params.append('desde', fechaInicio);
        }
        if (fechaTermino.length > 0) {
            params.append('hasta', fechaTermino);
        }
        if (bodegasSeleccionada || fechaInicio || fechaTermino) {
            dispatch(listaTomaInventarioFiltroThunk({ filtro: params }));
        } else {
            dispatch(listaTomaInventarioThunk());
        }
    }, [bodegasSeleccionada, fechaInicio, fechaTermino]);

    const columns = [
        columnHelper.accessor('id', {
            cell: (info) => info.getValue(),
            header: 'N°',
            size: 20,
            minSize: 15,
            maxSize: 30,
        }),
        columnHelper.accessor('fecha_inicio', {
            cell: (info) => (
                <div>
                    {info.getValue()
                        ? dayjs(info.getValue()).locale('es').format('DD/MM/YYYY HH:mm:ss')
                        : 'Sin Fecha'}
                </div>
            ),
            header: 'Fecha de Inicio',
        }),
        columnHelper.accessor('fecha_termino', {
            cell: (info) => (
                <div>
                    {info.getValue()
                        ? dayjs(info.getValue()).locale('es').format('DD/MM/YYYY HH:mm:ss')
                        : 'Sin Fecha'}
                </div>
            ),
            header: 'Fecha de Termino',
        }),
        columnHelper.accessor('nombre_creado_por', {
            cell: (info) => info.getValue(),
            header: 'Creado Por',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex flex-wrap gap-2'>
                    <Button
                        variant='solid'
                        color='violet'
                        icon='HeroEye'
                        onClick={() => {
                            navigate(`/bodega/detalle-toma-inventario/${info.row.original.id}`);
                        }}
                    />
                    <Button
                        variant='solid'
                        color='red'
                        icon='HeroTrash'
                        onClick={async () => {
                            try {
                                const response = await ApiService.fetchData({
                                    url: `/api/tomas-inventario/${info.row.original.id}/`,
                                    method: 'delete',
                                });
                                if (response.status === 204) {
                                    const params = new URLSearchParams();
                                    if (bodegasSeleccionada.length > 0) {
                                        params.append(
                                            'bodegas',
                                            bodegasSeleccionada.map((bode) => bode.id).toString(),
                                        );
                                    }
                                    if (fechaInicio.length > 0) {
                                        params.append('desde', fechaInicio);
                                    }
                                    if (fechaTermino.length > 0) {
                                        params.append('hasta', fechaTermino);
                                    }
                                    if (bodegasSeleccionada || fechaInicio || fechaTermino) {
                                        dispatch(
                                            listaTomaInventarioFiltroThunk({ filtro: params }),
                                        );
                                    } else {
                                        dispatch(listaTomaInventarioThunk());
                                    }
                                }
                            } catch (error: any) {
                                toast.error(
                                    error.response.data ||
                                        'Error al eliminar la toma de inventario',
                                );
                            }
                        }}
                    />
                </div>
            ),
            header: '',
        }),
    ];

    const table = useReactTable({
        data: listaTomaInventario,
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
            name='Tomas de Inventarios'
            title='Tomas de Inventarios'>
            <Subheader>
                <SubheaderLeft>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        anchoInput={200}
                    />
                </SubheaderLeft>
                <SubheaderRight>
                    <CrearTomaInventario
                        bodegasSeleccionada={bodegasSeleccionada}
                        fechaInicio={fechaInicio}
                        fechaTermino={fechaTermino}
                    />
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <Card>
                    <CardHeader>
                        <CardHeaderChild></CardHeaderChild>
                        <CardHeaderChild>
                            <div>
                                <Badge>Bodegas</Badge>
                                <SelectReact
                                    name='bodega'
                                    isMulti={true}
                                    options={listaBodegasPorEmpresa.map((bode) => ({
                                        value: bode.id.toString(),
                                        label: bode.nombre,
                                    }))}
                                    placeholder='Seleccione Bodegas'
                                    noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                    onChange={(e) => {
                                        if (e) {
                                            setBodegasSeleccionada(
                                                (e as MultiValue<TSelectOption>).map((bode) => ({
                                                    id: Number(bode.value),
                                                    nombre: bode.label,
                                                })),
                                            );
                                        } else {
                                            setBodegasSeleccionada([]);
                                        }
                                    }}
                                    value={bodegasSeleccionada.map((bode) => ({
                                        value: bode.id.toString(),
                                        label: bode.nombre,
                                    }))}
                                />
                            </div>
                            <div>
                                <Badge>Fecha de Inicio</Badge>
                                <FieldWrap
                                    lastSuffix={
                                        fechaInicio && (
                                            <Button
                                                variant='solid'
                                                color='red'
                                                icon='HeroXMark'
                                                size='sm'
                                                onClick={() => {
                                                    setFechaInicio('');
                                                }}
                                            />
                                        )
                                    }>
                                    <Input
                                        type='date'
                                        name='fecha_inicio'
                                        value={fechaInicio}
                                        onChange={(e) => {
                                            setFechaInicio(e.target.value);
                                        }}
                                    />
                                </FieldWrap>
                            </div>
                            <div>
                                <Badge>Fecha de Termino</Badge>
                                <FieldWrap
                                    lastSuffix={
                                        fechaTermino && (
                                            <Button
                                                variant='solid'
                                                color='red'
                                                icon='HeroXMark'
                                                size='sm'
                                                onClick={() => {
                                                    setFechaTermino('');
                                                }}
                                            />
                                        )
                                    }>
                                    <Input
                                        type='date'
                                        name='fecha_termino'
                                        value={fechaTermino}
                                        onChange={(e) => {
                                            setFechaTermino(e.target.value);
                                        }}
                                    />
                                </FieldWrap>
                            </div>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody className='z-0'>
                        <div className='overflow-auto'>
                            <Table className='min-w-[800px] table-fixed'>
                                <THead>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <Tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <Th
                                                    key={header.id}
                                                    style={{ width: header.column.getSize() }}
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
                            <div className='mt-2 min-w-[800px]'>
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    );
}

export default ListaTomaDeInventario;
