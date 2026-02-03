import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { IGuiaSalida } from '@/interface/bodega.interface';
import {
    listaBodegasThunk,
    listaUsuariosDeMisClientesThunk,
    useAppDispatch,
    useAppSelector,
    usuarioEmpresaLogeadoThunk,
} from '@/store';
import {
    useDeleteGuiaSalidaMutation,
    useDescargarPdfMutation,
    useDevolverABodegaMutation,
    useGetGuiasSalidaPorBodegaQuery,
    useUpdateGuiaSalidaMutation,
} from '@/store/slices/bodega/guiaSalidaApi';
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
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import AprobarGuiaSalida from './modals/AprobarGuiaSalida';
import CrearGuiaSalidaBodega from './modals/CrearGuiaSalidaBodega';
import FirmarEntregarGuia from './modals/FirmarEntregarGuia';
import VolverAPendienteGuiaSalida from './modals/VolverAPendienteGuiaSalida';

const columnHelper = createColumnHelper<IGuiaSalida>();

function ListaGuiaSalidaBodega() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaBodegas } = useAppSelector((state) => state.bodega);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [bodegaSelected, setBodegaSelected] = useState<string | undefined>();
    const [estadoFilter, setEstadoFilter] = useState<string | undefined>(undefined);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isOpenFirma, setIsOpenFirma] = useState<boolean>(false);
    const [guiaSelected, setGuiaSelected] = useState<number | undefined>(undefined);

    // RTK Query hooks
    const { data: listaGuiaSalidaPorBodega = [], isLoading, refetch: refetchGuias } = useGetGuiasSalidaPorBodegaQuery(
        bodegaSelected!,
        {
            skip: !bodegaSelected,
        },
    );
    const [deleteGuia] = useDeleteGuiaSalidaMutation();
    const [devolverABodega] = useDevolverABodegaMutation()
    const [descargarPdf] = useDescargarPdfMutation();
    const [updateGuia] = useUpdateGuiaSalidaMutation();

    const optBodegas = useMemo(() => {
        return listaBodegas.map((bod) => ({ value: bod.id.toString(), label: bod.nombre }));
    }, [listaBodegas]);

    const filteredData = useMemo(() => {
        let data = listaGuiaSalidaPorBodega;
        if (estadoFilter) {
            data = data.filter((guia) => guia.estado === estadoFilter);
        }
        return data;
    }, [listaGuiaSalidaPorBodega, estadoFilter]);

    const getEstadoBadge = (estado: string, label: string) => {
        let color: 'sky' | 'amber' | 'indigo' | 'emerald' | 'cyan' | 'zinc' | 'violet' | 'blue' = 'zinc';
        switch (estado) {
            case 'P': color = 'sky'; break; // Pendiente
            case 'ER': color = 'blue'; break; // Espera Recepción
            case 'ET': color = 'amber'; break; // Espera firma técnico
            case 'FR': color = 'violet'; break; // Firmada por técnico
            case 'E': color = 'emerald'; break; // Entregada
            case 'PR': color = 'sky'; break; // Parcialmente Revertida
            case 'R': color = 'zinc'; break; // Revertida
            case 'T': color = 'violet'; break; // Terminada
        }
        return <Badge color={color}>{label}</Badge>;
    };

    useEffect(() => {
        if (isOpen && personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(
                listaUsuariosDeMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }),
            );
        }
    }, [isOpen, personalizacionUsuario]);

    useEffect(() => {
        if (isOpenFirma && personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(
                listaUsuariosDeMisClientesThunk({ id_empresa: personalizacionUsuario?.empresa }),
            );
        }
    }, [isOpenFirma, personalizacionUsuario]);

    useEffect(() => {
        dispatch(usuarioEmpresaLogeadoThunk({ id_usuario: personalizacionUsuario?.usuario }));
    }, []);

    useEffect(() => {
        if (personalizacionUsuario) {
            dispatch(listaBodegasThunk());
        }
    }, [personalizacionUsuario]);

    useEffect(() => {
        // Seleccionar automáticamente la primera bodega disponible para evitar vista vacía
        if (!bodegaSelected && listaBodegas.length > 0) {
            setBodegaSelected(listaBodegas[0].id.toString());
        }
    }, [listaBodegas, bodegaSelected]);

    const columns = [
        columnHelper.accessor('id', {
            cell: (info) => info.getValue(),
            header: 'N°',
            size: 20,
        }),
        columnHelper.accessor('estado_label', {
            cell: (info) => getEstadoBadge(info.row.original.estado, info.getValue()),
            header: 'Estado',
        }),
        columnHelper.accessor('nombre_creado_por', {
            cell: (info) => info.getValue(),
            header: 'Creado Por',
        }),
        columnHelper.accessor('nombre_recibido_por', {
            cell: (info) => info.getValue(),
            header: 'Recibido Por',
        }),
        columnHelper.accessor('fecha_creacion', {
            cell: (info) => (
                <div>{dayjs(info.row.original.fecha_creacion).format('DD-MM-YYYY')}</div>
            ),
            header: 'Fecha de Creacion',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex flex-wrap gap-2'>
                    <Tooltip text='Ver Detalle'>
                        <Button
                            variant='solid'
                            color='violet'
                            icon='HeroEye'
                            onClick={() => {
                                navigate(
                                    `/bodega/detalle-guia-salida-bodega/${info.row.original.id}`,
                                );
                            }}
                        />
                    </Tooltip>
                    {info.row.original.estado === 'P' && (
                        <Tooltip text='Eliminar Guía'>
                            <Button
                                variant='solid'
                                color='red'
                                icon='HeroTrash'
                                onClick={async () => {
                                    const result = await Swal.fire({
                                        title: '¿Eliminar Guía de Salida?',
                                        text: `Está a punto de eliminar la guía N°${info.row.original.id}. Esta acción no se puede deshacer.`,
                                        icon: 'warning',
                                        showCancelButton: true,
                                        confirmButtonText: 'Eliminar',
                                        cancelButtonText: 'Cancelar',
                                        confirmButtonColor: '#dc2626',
                                    });
                                    if (result.isConfirmed) {
                                        try {
                                            await deleteGuia(info.row.original.id).unwrap();
                                            toast.success('Guía eliminada exitosamente', {
                                                autoClose: 1000,
                                            });
                                        } catch (error: any) {
                                            toast.error(
                                                error?.data?.detail || 'Error al eliminar la guía',
                                            );
                                        }
                                    }
                                }}
                            />
                        </Tooltip>
                    )}
                    {info.row.original.estado === 'ER' &&
                        (() => {
                            const soporte = info.row.original.soporte_tecnico;
                            const faltaDatosSoporte =
                                typeof soporte === 'object' && soporte !== null
                                    ? !!soporte.falta_datos
                                    : false;
                            const disabled = !!faltaDatosSoporte;
                            const tooltip = disabled
                                ? 'Faltan datos en la OT (asignar técnico y fecha)'
                                : 'Firmar para Aprobar Guia';
                            return (
                                <Tooltip text={tooltip}>
                                    <div
                                        className={disabled ? 'cursor-not-allowed opacity-60' : ''}>
                                        <Button
                                            variant='solid'
                                            isDisable={disabled}
                                            onClick={() => {
                                                if (disabled) return;
                                                setIsOpen(true);
                                                setGuiaSelected(info.row.original.id);
                                            }}
                                            icon='HeroPencil'
                                            color='emerald'
                                        />
                                    </div>
                                </Tooltip>
                            );
                        })()}
                    {info.row.original.estado === 'ET' && (
                        <>
                            <Tooltip text='Devolución Parcial'>
                                <Button
                                    variant='solid'
                                    color='amber'
                                    icon='DuoIncomingBox'
                                    onClick={() => {
                                        navigate(
                                            `/bodega/devolucion-parcial-guia-salida-bodega/${info.row.original.id}`,
                                        );
                                    }}
                                />
                            </Tooltip>
                            <Tooltip text='Devolución Completa'>
                                <Button
                                    variant='solid'
                                    color='emerald'
                                    icon='HeroInboxArrowDown'
                                    onClick={async () => {
                                        const result = await Swal.fire({
                                            title: '¿Devolver todos los items?',
                                            text: 'Se devolverán todos los items de esta guía a la bodega.',
                                            icon: 'question',
                                            showCancelButton: true,
                                            confirmButtonText: 'Devolver',
                                            cancelButtonText: 'Cancelar',
                                            confirmButtonColor: '#10b981',
                                        });
                                        if (result.isConfirmed) {
                                            try {
                                                await devolverABodega({
                                                    id: info.row.original.id,
                                                }).unwrap();
                                                toast.success(
                                                    'Se devolvieron todos los items a bodega',
                                                    { autoClose: 1000 },
                                                );
                                            } catch (error: any) {
                                                toast.error(
                                                    error?.data?.detail ||
                                                        'Error al devolver items',
                                                );
                                            }
                                        }
                                    }}
                                />
                            </Tooltip>
                            <Tooltip text='Firmar para Entregar'>
                                <Button
                                    variant='solid'
                                    color='emerald'
                                    icon='DuoArchive'
                                    onClick={() => {
                                        setGuiaSelected(info.row.original.id);
                                        setIsOpenFirma(true);
                                    }} />
                            </Tooltip>
                            <Tooltip text='Terminar Guia'>
                                <Button
                                    variant='solid'
                                    color='sky'
                                    icon='DuoBox3'
                                    onClick={async () => {
                                        const result = await Swal.fire({
                                            title: '¿Terminar Guía?',
                                            text: 'Marcará esta guía como terminada.',
                                            icon: 'question',
                                            showCancelButton: true,
                                            confirmButtonText: 'Terminar',
                                            cancelButtonText: 'Cancelar',
                                            confirmButtonColor: '#0ea5e9',
                                        });
                                        if (result.isConfirmed) {
                                            try {
                                                await updateGuia({
                                                    id: info.row.original.id,
                                                    estado: 'T',
                                                }).unwrap();
                                                toast.success('Guia terminada', {
                                                    autoClose: 1000,
                                                });
                                            } catch (error: any) {
                                                const mensajesError = error?.data
                                                    ? Object.values(error.data).flat().join(' ')
                                                    : 'Error al terminar la guia';
                                                toast.error(mensajesError, {
                                                    toastId: 'Error al terminar la guia',
                                                });
                                            }
                                        }
                                    }}></Button>
                            </Tooltip>
                        </>
                    )}
                    {info.row.original.estado === 'ER' && (
                        <VolverAPendienteGuiaSalida guia_salida={info.row.original} onSuccess={() => {
                            refetchGuias();
                        }} />
                    )}
                    {['ER', 'FR', 'R', 'PR', 'E', 'T'].includes(info.row.original.estado) && (
                        <Tooltip text='Descargar PDF'>
                            <Button
                                variant='solid'
                                color='red'
                                icon='HeroDocumentArrowDown'
                                onClick={async () => {
                                    try {
                                        const response = await descargarPdf(info.row.original.id).unwrap();
                                        if (response) {
                                            const url = window.URL.createObjectURL(new Blob([response]));
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.setAttribute('download', `Guia_Salida_${info.row.original.id}.pdf`);
                                            document.body.appendChild(link);
                                            link.click();
                                            link.remove();
                                            window.URL.revokeObjectURL(url);
                                        }
                                    } catch (error: any) {
                                        toast.error('Error al descargar PDF');
                                    }
                                }}
                            />
                        </Tooltip>
                    )}
                </div>
            ),
        }),
    ];

    const table = useReactTable({
        data: filteredData,
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
            name='Lista Guias de Salida Bodega'
            title='Lista Guias de Salida Bodega'>
            <Subheader>
                <SubheaderLeft>
                    <Badge className='text-xl'>Guias de Salida de Bodega</Badge>
                </SubheaderLeft>
                <SubheaderRight className='w-full md:w-auto'>
                        <div className='flex w-full items-center gap-2'>
                            <div className='min-w-[150px]'>
                                <SelectReact
                                    name='bodega'
                                    options={optBodegas}
                                    onChange={(e) => {
                                        setBodegaSelected((e as TSelectOption).value);
                                    }}
                                    value={optBodegas.find((b) => b.value === bodegaSelected)}
                                    placeholder='Bodega'
                                />
                            </div>
                            <div className='min-w-[150px]'>
                                <SelectReact
                                    name='estado'
                                    isClearable
                                    options={[
                                        { value: 'P', label: 'Pendiente' },
                                        { value: 'ER', label: 'Espera Recepción' },
                                        { value: 'ET', label: 'Espera firma técnico' },
                                        { value: 'FR', label: 'Firmada por técnico' },
                                        { value: 'E', label: 'Entregada' },
                                        { value: 'PR', label: 'Parcialmente Revertida' },
                                        { value: 'R', label: 'Revertida' },
                                        { value: 'T', label: 'Terminada' },
                                    ]}
                                    onChange={(e) => {
                                        setEstadoFilter((e as TSelectOption)?.value);
                                    }}
                                    value={
                                        estadoFilter
                                            ? [
                                                  { value: 'P', label: 'Pendiente' },
                                                  { value: 'ER', label: 'Espera Recepción' },
                                                  { value: 'ET', label: 'Espera firma técnico' },
                                                  { value: 'FR', label: 'Firmada por técnico' },
                                                  { value: 'E', label: 'Entregada' },
                                                  { value: 'PR', label: 'Parcialmente Revertida' },
                                                  { value: 'R', label: 'Revertida' },
                                                  { value: 'T', label: 'Terminada' },
                                              ].find((opt) => opt.value === estadoFilter)
                                            : null
                                    }
                                    placeholder='Estado'
                                />
                            </div>
                            <div className='min-w-[180px]'>
                                <Input
                                    name='globalFilter'
                                    placeholder='Buscar...'
                                    value={globalFilter}
                                    onChange={(e) => {
                                        setGlobalFilter(e.target.value);
                                    }}
                                />
                            </div>
                            <CrearGuiaSalidaBodega />
                        </div>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='w-full'>
                    <Card>
                        <CardBody className='z-0'>
                            <div className='overflow-auto'>
                                <Table className='min-w-[900px] table-fixed'>
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
                                <div className='mt-2 min-w-[900px]'>
                                    <TableCardFooterTemplateV2 table={table} />
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </Container>
            <AprobarGuiaSalida
                id_guia={guiaSelected}
                bodegaSelected={bodegaSelected}
                isOpen={isOpen}
                setIsOpen={setIsOpen}
            />
            <FirmarEntregarGuia
                id_guia={guiaSelected}
                bodegaSelected={bodegaSelected}
                isOpen={isOpenFirma}
                setIsOpen={setIsOpenFirma}
                onSuccess={() => {
                    refetchGuias();
                }}
            />
        </PageWrapper>
    );
}

export default ListaGuiaSalidaBodega;
