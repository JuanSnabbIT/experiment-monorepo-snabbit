import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import SelectReact from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { IRelacionEmpresa, IUsuarioEmpresa } from '@/interface/empresas.interface';
import { useGetUsuariosTodoElClienteQuery } from '@/store/slices/empresa/empresaApi';
import { useGetContratosTrabajadorPorEmpresaClienteQuery } from '@/store/slices/rrhh/contratoTrabajadorApi';
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
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const columnHelper = createColumnHelper<IUsuarioEmpresa>();

interface TablaUsuariosDelClienteProps {
    detalleCliente?: IRelacionEmpresa;
}

function TablaUsuariosDelCliente({ detalleCliente }: TablaUsuariosDelClienteProps) {
    const navigate = useNavigate();
    const [sucursalSelected, setSucursalSelected] = useState<{ value: string; label: string }>();
    const [optionSucursal, setOptionSucursal] = useState<{ value: string; label: string }[]>([]);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [mostrarInactivos, setMostrarInactivos] = useState(false);

    useEffect(() => {
        if (detalleCliente) {
            setOptionSucursal(
                [
                    { value: 'ALL', label: 'Todas las sucursales' },
                    ...detalleCliente.info_cliente.sucursales.map((suc) => ({
                        value: suc.id.toString(),
                        label: suc.nombre,
                    })),
                ],
            );
        }
    }, [detalleCliente]);

    useEffect(() => {
        setSucursalSelected(undefined);
    }, [detalleCliente?.id]);

    // Seleccionar la primera sucursal por defecto cuando las opciones estén disponibles
    useEffect(() => {
        if (optionSucursal && optionSucursal.length > 0 && !sucursalSelected) {
            setSucursalSelected(optionSucursal[0]);
        }
    }, [optionSucursal]);

    const { data: usuariosClienteTodos = [] } = useGetUsuariosTodoElClienteQuery(
        detalleCliente?.cliente ?? '',
        {
            skip: !detalleCliente?.cliente,
        },
    );

        const { data: contratosLaboralesCliente = [] } = useGetContratosTrabajadorPorEmpresaClienteQuery(
            detalleCliente?.cliente ?? '',
            { skip: !detalleCliente?.cliente },
        );

        const trabajadoresPendientes = useMemo(() => {
            return contratosLaboralesCliente.filter(
                (contrato) => contrato.usuario_empresa === null && contrato.datos_trabajador_nuevo,
            );
        }, [contratosLaboralesCliente]);

    const listaUsuariosCliente = useMemo(() => {
        if (!sucursalSelected || sucursalSelected.value === 'ALL') {
            return usuariosClienteTodos;
        }
        return usuariosClienteTodos.filter(
            (usuario) => usuario.sucursal?.toString() === sucursalSelected.value,
        );
    }, [usuariosClienteTodos, sucursalSelected]);

    // Filtrar usuarios inactivos localmente
    const usuariosFiltrados = useMemo(() => {
        if (mostrarInactivos) return listaUsuariosCliente;
        return listaUsuariosCliente.filter((u) => u.estado !== '2');
    }, [listaUsuariosCliente, mostrarInactivos]);

    // Métricas calculadas
    const metricas = useMemo(() => {
        const total = listaUsuariosCliente.length;
        const activos = listaUsuariosCliente.filter((u) => u.estado === '1').length;
        const inactivos = listaUsuariosCliente.filter((u) => u.estado === '2').length;
        const pendientes = trabajadoresPendientes.length;
        return { total, activos, inactivos, pendientes };
    }, [listaUsuariosCliente, trabajadoresPendientes]);

    const columns = [
        columnHelper.accessor('nombre_usuario', {
            cell: (info) => info.getValue(),
            header: 'Nombre',
        }),
        columnHelper.accessor('email_usuario', {
            cell: (info) => (
                <Tooltip text={info.getValue()}>
                    <span className='block max-w-[180px] truncate'>{info.getValue()}</span>
                </Tooltip>
            ),
            header: 'Email',
        }),
        columnHelper.accessor('papeleta.rut', {
            cell: (info) => info.getValue() || 'Sin Rut',
            header: 'Rut',
        }),
        columnHelper.accessor('cargo', {
            cell: (info) => info.getValue() || '—',
            header: 'Cargo',
        }),
        columnHelper.accessor('estado', {
            cell: (info) => (
                <Badge color={info.getValue() === '1' ? 'emerald' : 'red'}>
                    {info.row.original.estado_label}
                </Badge>
            ),
            header: 'Estado',
        }),
        columnHelper.display({
            id: 'acciones',
            header: 'Acciones',
            cell: (info) => (
                <div className='flex justify-center'>
                    <Tooltip text='Ver detalle'>
                        <Button
                            color='violet'
                            variant='solid'
                            icon='HeroEye'
                            size='sm'
                            onClick={() =>
                                navigate(
                                    `/empresa/detalle-cliente/${detalleCliente?.id}/usuario/${info.row.original.id}`,
                                )
                            }
                        />
                    </Tooltip>
                </div>
            ),
        }),
    ];

    const table = useReactTable({
        data: usuariosFiltrados,
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
        <div className='flex flex-col gap-4'>
            {/* ── Métricas ── */}
            {listaUsuariosCliente.length > 0 && (
                <div className='grid grid-cols-3 gap-3'>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <Icon
                                icon='HeroUserGroup'
                                size='text-2xl'
                                className='text-blue-500'
                            />
                            <div>
                                <p className='text-xs text-zinc-500'>Total</p>
                                <p className='text-xl font-bold'>{metricas.total}</p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <Icon
                                icon='HeroCheckCircle'
                                size='text-2xl'
                                className='text-emerald-500'
                            />
                            <div>
                                <p className='text-xs text-zinc-500'>Activos</p>
                                <p className='text-xl font-bold'>{metricas.activos}</p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <Icon
                                icon='HeroXCircle'
                                size='text-2xl'
                                className='text-red-500'
                            />
                            <div>
                                <p className='text-xs text-zinc-500'>Inactivos</p>
                                <p className='text-xl font-bold'>{metricas.inactivos}</p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <Icon
                                icon='HeroClock'
                                size='text-2xl'
                                className='text-amber-500'
                            />
                            <div>
                                <p className='text-xs text-zinc-500'>Pendientes</p>
                                <p className='text-xl font-bold'>{metricas.pendientes}</p>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* ── Tabla principal ── */}
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <Badge className='text-xl'>Usuarios</Badge>
                    </CardHeaderChild>
                    <CardHeaderChild>
                        <div className='flex flex-wrap items-center gap-2'>
                            <div className='min-w-[160px]'>
                                <SelectReact
                                    placeholder='Sucursal...'
                                    name='sucursal'
                                    options={optionSucursal}
                                    value={sucursalSelected}
                                    onChange={(e) => {
                                        setSucursalSelected(e as { value: string; label: string });
                                    }}
                                />
                            </div>
                            <Input
                                name='globalFilter'
                                placeholder='Buscar...'
                                value={globalFilter}
                                onChange={(e) => {
                                    setGlobalFilter(e.target.value);
                                }}
                                className='max-w-[150px]'
                            />
                            <div className='flex items-center gap-2'>
                                <Checkbox
                                    id='mostrarInactivos'
                                    checked={mostrarInactivos}
                                    onChange={() => setMostrarInactivos(!mostrarInactivos)}
                                />
                                <label
                                    htmlFor='mostrarInactivos'
                                    className='cursor-pointer text-sm'>
                                    Inactivos
                                </label>
                            </div>
                        </div>
                    </CardHeaderChild>
                </CardHeader>
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
                                                            className: header.column.getCanSort()
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
                                                        }[header.column.getIsSorted() as string] ??
                                                            null}
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

            {trabajadoresPendientes.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <Badge className='text-xl'>Trabajadores pendientes de aprobación</Badge>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        <Table>
                            <THead>
                                <Tr>
                                    <Th>Nombre</Th>
                                    <Th>Email</Th>
                                    <Th>RUT</Th>
                                    <Th>Cargo</Th>
                                    <Th>Estado</Th>
                                    <Th>Acciones</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {trabajadoresPendientes.map((contrato) => (
                                    <Tr key={contrato.id}>
                                        <Td>
                                            <span className='font-medium'>
                                                {contrato.nombre_trabajador ||
                                                    contrato.datos_trabajador_nuevo?.first_name ||
                                                    '—'}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className='text-zinc-500'>
                                                {contrato.datos_trabajador_nuevo?.email || '—'}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className='text-zinc-500'>
                                                {contrato.rut_trabajador || contrato.datos_trabajador_nuevo?.rut || '—'}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className='text-zinc-500'>{contrato.cargo || '—'}</span>
                                        </Td>
                                        <Td>
                                            <Badge
                                                variant='solid'
                                                color={contrato.estado === 'borrador' ? 'zinc' : 'amber'}>
                                                {contrato.estado_label ?? contrato.estado}
                                            </Badge>
                                        </Td>
                                        <Td>
                                            <Tooltip text='Ver contrato laboral'>
                                                <Button
                                                    color='violet'
                                                    variant='solid'
                                                    icon='HeroEye'
                                                    size='sm'
                                                    onClick={() => {
                                                        navigate(
                                                            `/rrhh/contratos/${contrato.id}`,
                                                        );
                                                    }}
                                                />
                                            </Tooltip>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}

export default TablaUsuariosDelCliente;
