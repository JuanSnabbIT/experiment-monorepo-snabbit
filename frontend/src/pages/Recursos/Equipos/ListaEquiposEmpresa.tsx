import SelectReact from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Badge from '@/components/ui/Badge';
import Button, { IButtonProps } from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import { IEquipo } from '@/interface/recursos.interface';
import { listaMisClientesThunk, useAppDispatch, useAppSelector } from '@/store';
import {
    listaEquiposEmpresaThunk,
    listaEquiposPorClienteThunk,
} from '@/store/slices/recursos/recursosSlice';
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
import { SingleValue } from 'react-select';

const columnHelper = createColumnHelper<IEquipo>();

function ListaEquiposEmpresa() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { listaEquiposEmpresa } = useAppSelector((state) => state.recursos);
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaMisClientes } = useAppSelector((state) => state.empresa);
    const [clienteSeleccionado, setClienteSeleccionado] = useState<{
        value: string;
        label: string;
    } | null>(null);
    const [activeComponent, setActiveComponent] = useState<string>('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (personalizacionUsuario?.empresa) {
            dispatch(listaEquiposEmpresaThunk({ id_empresa: personalizacionUsuario.empresa }));
            dispatch(listaMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }));
        }
    }, [personalizacionUsuario, dispatch]);

    const columns = [
        columnHelper.accessor('nombre_equipo', {
            cell: (info) => (
                <p>
                    {info.row.original.nombre_equipo} /{' '}
                    <span
                        style={{
                            color:
                                (info.row.original.nombre_usuario_asignado || 'Sin usuario') ===
                                'Sin usuario'
                                    ? 'red'
                                    : 'green',
                        }}>
                        {info.row.original.nombre_usuario_asignado || 'Sin usuario'}
                    </span>
                </p>
            ),
            header: 'Nombre Equipo / Usuario',
        }),
        columnHelper.accessor('marca', {
            cell: (info) => info.getValue(),
            header: 'Marca',
        }),
        columnHelper.accessor('modelo', {
            cell: (info) => info.getValue(),
            header: 'Modelo',
        }),
        columnHelper.accessor('numero_serie', {
            cell: (info) => info.getValue(),
            header: 'N° Serie',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex gap-2'>
                    <Tooltip text='Detalle'>
                        <Button
                            icon='HeroEye'
                            variant='solid'
                            color='violet'
                            onClick={() => {
                                navigate(`/detalle-equipo-empresa/${info.row.original.id}`);
                            }}></Button>
                    </Tooltip>
                    <ConfirmarEliminar
                        mensaje='El equipo se elimina por completo sin dejar registro. ¿Está seguro(a)?'
                        peticionUrl={`/api/equipos/${info.row.original.id}/`}
                        onDispatch={() => {
                            dispatch(
                                listaEquiposEmpresaThunk({
                                    id_empresa: personalizacionUsuario?.empresa,
                                }),
                            );
                        }}
                    />
                </div>
            ),
            header: 'Acciones',
        }),
    ];

    const table = useReactTable({
        data: listaEquiposEmpresa,
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

    const defaultProps: IButtonProps = {
        size: 'sm',
        color: 'zinc',
        rounded: 'rounded-full',
        className: 'border',
    };

    const activeProps: IButtonProps = {
        ...defaultProps,
        isActive: true,
        color: 'blue',
        colorIntensity: '500',
        variant: 'solid',
    };

    return (
        <PageWrapper isProtectedRoute={true} title='Lista Equipos' name='Lista Equipos'>
            <Subheader>
                <SubheaderLeft>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        anchoInput={200}
                    />
                </SubheaderLeft>
                <SubheaderRight>
                    {listaMisClientes.length > 5 ? (
                        <SelectReact
                            options={listaMisClientes.map((cliente) => ({
                                value: String(cliente.info_cliente.id),
                                label: cliente.info_cliente.nombre,
                            }))}
                            isClearable
                            value={clienteSeleccionado}
                            onChange={(newValue) => {
                                const selectedOption = newValue as SingleValue<{
                                    value: string;
                                    label: string;
                                }> | null;
                                setClienteSeleccionado(selectedOption);

                                if (selectedOption) {
                                    const clienteId = parseInt(selectedOption.value, 10);
                                    if (!isNaN(clienteId)) {
                                        dispatch(
                                            listaEquiposPorClienteThunk({ cliente_id: clienteId }),
                                        );
                                    } else {
                                        console.error('Error: cliente_id no es un número válido.');
                                    }
                                }
                            }}
                            placeholder='Seleccione un cliente'
                            noOptionsMessage={() => 'No hay clientes disponibles'}
                            className='w-full sm:w-64'
                            name='lista_clientes'
                        />
                    ) : (
                        <>
                            <div className='flex flex-row gap-4 overflow-auto'>
                                {listaMisClientes.map((cliente, index) => (
                                    <Button
                                        key={index}
                                        {...(activeComponent === cliente.info_cliente.nombre
                                            ? { ...activeProps }
                                            : { ...defaultProps })}
                                        onClick={async () => {
                                            setActiveComponent(cliente.info_cliente.nombre);
                                            dispatch(
                                                listaEquiposPorClienteThunk({
                                                    cliente_id: cliente.info_cliente.id,
                                                }),
                                            );
                                        }}>
                                        {cliente.info_cliente.nombre}
                                    </Button>
                                ))}
                            </div>
                        </>
                    )}
                    {/* <CrearEquipoEmpresa /> */}
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
                                    {
                                        // clienteSeleccionado ? (
                                        listaEquiposEmpresa.length > 0 ? (
                                            table.getRowModel().rows.map((row) => (
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
                                            ))
                                        ) : (
                                            <Tr>
                                                <Td
                                                    colSpan={columns.length}
                                                    className='text-center'>
                                                    <div className='flex flex-col items-center justify-center'>
                                                        <Icon
                                                            icon='HeroFaceFrown'
                                                            className='mb-2 text-red-500'
                                                            size='text-6xl'
                                                        />
                                                        <Badge className='text-xl'>
                                                            El cliente seleccionado no tiene
                                                            equipos.
                                                        </Badge>
                                                    </div>
                                                </Td>
                                            </Tr>
                                        )
                                        // ) : (
                                        //     <Tr>
                                        //         <Td colSpan={columns.length} className="text-center">
                                        //             <div className="flex flex-col items-center justify-center">
                                        //                 <Icon icon="HeroFaceSmile" className="mb-2 text-green-800" size="text-6xl"/>
                                        //                 <Badge className="text-xl">Primero debe seleccionar un cliente para ver los equipos.</Badge>
                                        //             </div>
                                        //         </Td>
                                        //     </Tr>
                                        // )
                                    }
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

export default ListaEquiposEmpresa;
