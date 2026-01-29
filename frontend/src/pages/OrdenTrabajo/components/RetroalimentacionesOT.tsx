import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { listaRetroalimentacionesOTThunk, useAppDispatch, useAppSelector } from '@/store';
import { useEffect, useState } from 'react';
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
import { IRetroalimentacionOT } from '@/interface/ordenTrabajo.interface';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Icon from '@/components/icon/Icon';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import Tooltip from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

const columnHelper = createColumnHelper<IRetroalimentacionOT>();

function RetroalimentacionesOT() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { detalleOrdenTrabajo, listaRetroalimentacionesOT } = useAppSelector(
        (state) => state.ordenTrabajo,
    );
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        if (detalleOrdenTrabajo) {
            dispatch(listaRetroalimentacionesOTThunk({ id_orden: detalleOrdenTrabajo.id }));
        }
    }, [detalleOrdenTrabajo]);

    // const columns = [
    //     columnHelper.accessor("id", {
    //         cell: (info) => info.getValue(),
    //         header: "N°",
    //         size: 20
    //     }),
    //     columnHelper.accessor("usuario", {
    //         cell: (info) => {
    //             const [isOpen, setIsOpen] = useState<boolean>(false)
    //             const [isOpening, setIsOpening] = useState<boolean>(false)
    //             return (
    //                 <div className="flex flex-row gap-2">
    //                     <div>
    //                         <div>{info.row.original.usuario ? info.row.original.nombre_usuario : info.row.original.nombre}</div>
    //                         <Collapse isOpen={isOpen} className="transition-opacity">
    //                             <div>
    //                                 <Badge className="text-sm">Correo:</Badge>
    //                                 <span className="text-sm">{info.row.original.usuario ? info.row.original.correo_usuario : info.row.original.correo}</span>
    //                             </div>
    //                         </Collapse>
    //                     </div>
    //                     <div>
    //                         <Button size="xs" isDisable={isOpening} variant='solid' icon={isOpen ? "HeroEyeSlash" : "HeroEye"} color='sky' onClick={() => {
    //                             if (isOpening) return;
    //                             setIsOpening(true);
    //                             if (isOpen) {
    //                                 setIsOpen(false);
    //                             } else {
    //                                 setIsOpen(true);
    //                             }
    //                             setTimeout(() => setIsOpening(false), 300);
    //                         }} />
    //                     </div>
    //                 </div>
    //             )
    //         },
    //         header: "Nombre/Correo"
    //     }),
    //     columnHelper.accessor("cantidad_estrellas", {
    //         cell: (info) => {
    //             const [isOpen, setIsOpen] = useState<boolean>(false)
    //             const [isOpening, setIsOpening] = useState<boolean>(false)
    //             return (
    //                 <div>
    //                     {info.row.original.cantidad_estrellas ? (
    //                         <div className="flex flex-row gap-2">
    //                             {info.row.original.cantidad_estrellas.toLocaleString()}: <Rating maxStars={5} rating={info.row.original.cantidad_estrellas} />
    //                             {info.row.original.observacion_retroalimentacion && (
    //                                 <div>
    //                                     <Button size="xs" isDisable={isOpening} variant='solid' icon={isOpen ? "HeroEyeSlash" : "HeroEye"} color='sky' onClick={() => {
    //                                         if (isOpening) return;
    //                                         setIsOpening(true);
    //                                         setIsOpen(!isOpen)
    //                                         setTimeout(() => setIsOpening(false), 300);
    //                                     }} />
    //                                 </div>
    //                             )}
    //                         </div>
    //                     ) : ("Sin retroalimentación")}
    //                     <Collapse isOpen={isOpen} className="transition-opacity">
    //                         <div>
    //                             <Badge className="text-sm">Observaciones:</Badge>
    //                             <span className="text-sm">{info.row.original.observacion_retroalimentacion}</span>
    //                         </div>
    //                     </Collapse>
    //                 </div>
    //             )
    //         },
    //         header: "Estrellas"
    //     }),
    //     columnHelper.accessor("cantidad_visitas", {
    //         cell: (info) => info.getValue(),
    //         header: "Visitas"
    //     }),
    //     columnHelper.display({
    //         id: "acciones",
    //         cell: (info) => (
    //             <div>
    //                 {info.row.original.vigente ? (
    //                     <Tooltip text="Reenviar">
    //                         <Button variant="solid" color="amber" icon="HeroArrowUturnRight" onClick={async () => {
    //                             try {
    //                                 const response = await ApiService.fetchData({url: `/api/ordenes-trabajo/${info.row.original.orden}/retroalimentaciones/${info.row.original.id}/`, method: 'get', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({usuario: info.row.original.usuario})})
    //                                 if (response.data) {
    //                                     toast.success("Retroalimentación reenviada", {autoClose: 1000})
    //                                 }
    //                             } catch (error: any) {
    //                                 const mensajesError = Object.values(error.response.data).flat().join(" ");
    //                                 toast.error(mensajesError || "Error al reenviar la retroalimentación", {toastId: "Error al reenviar la retroalimentación"})
    //                             }
    //                         }}></Button>
    //                     </Tooltip>
    //                 ) : (
    //                     <Tooltip text="Vencida">
    //                         <Button variant="solid" color="amber" icon="HeroArrowUturnRight" isDisable></Button>
    //                     </Tooltip>
    //                 )}
    //             </div>
    //         ),
    //         header: ""
    //     })
    // ]

    const columns = [
        columnHelper.display({
            id: 'usuario',
            cell: (info) => (
                <div>
                    {info.row.original.usuario_empresa ? (
                        <>
                            <div>{info.row.original.datos_usuario?.nombre}</div>
                            <div className='text-sm'>
                                Correo: {info.row.original.datos_usuario?.correo}
                            </div>
                        </>
                    ) : (
                        <>
                            <div>{info.row.original.usuario_externo}</div>
                            <div className='text-sm'>
                                Correo: {info.row.original.correo_usuario_externo}
                            </div>
                        </>
                    )}
                </div>
            ),
            header: 'Usuario',
        }),
        columnHelper.display({
            id: 'es_usuario_empresa',
            cell: (info) => <div>{info.row.original.usuario_empresa ? 'Si' : 'No'}</div>,
            header: '¿Es Usuario Empresa?',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div>
                    <Tooltip text='Detalle'>
                        <Button
                            variant='solid'
                            color='violet'
                            icon='HeroEye'
                            onClick={() => {
                                navigate(
                                    `/orden-trabajo/detalle-retroalimentacion/${info.row.original.id}/`,
                                );
                            }}></Button>
                    </Tooltip>
                </div>
            ),
        }),
    ];

    const table = useReactTable({
        data: listaRetroalimentacionesOT,
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
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-xl'>Retroalimentaciones</Badge>
                </CardHeaderChild>
                <CardHeaderChild>{/* <CrearRetroalimentacionOT /> */}</CardHeaderChild>
            </CardHeader>
            <CardBody className='z-0'>
                <div className='overflow-auto'>
                    {listaRetroalimentacionesOT.length > 0 ? (
                        <>
                            <Table className='min-w-[500px] table-fixed'>
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
                            <div className='mt-2 min-w-[500px]'>
                                <TableCardFooterTemplateV2 table={table} />
                            </div>
                        </>
                    ) : (
                        <div className='text-center'>No se encontraron retroalimentaciones</div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
}

export default RetroalimentacionesOT;
