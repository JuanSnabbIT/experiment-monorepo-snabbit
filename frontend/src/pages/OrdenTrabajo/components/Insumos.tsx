import Icon from "@/components/icon/Icon";
import Badge from "@/components/ui/Badge";
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card";
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { listaInsumosThunk, useAppDispatch, useAppSelector } from "@/store";
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2";
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal";
import ApiService from "@/services/ApiService";
import { toast } from "react-toastify";
import AnimacionDeInputModoMovil from "@/components/utils/AnimacionDeIntputModoMovil";
import { IInsumo } from "@/interface/ordenTrabajo.interface";
import Tooltip from "@/components/ui/Tooltip";
import { useNavigate } from "react-router-dom";


const columnHelper = createColumnHelper<IInsumo>();

function Insumos() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { detalleOrdenTrabajo, listaInsumos = [] } = useAppSelector((state) => state.ordenTrabajo ?? { listaInsumos: [] });
    const { listaVouchers = [] } = useAppSelector((state) => state.bodega ?? { listaVouchers: [] });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>("");

    useEffect(() => {
        if (detalleOrdenTrabajo) {
            dispatch(listaInsumosThunk({id_orden_trabajo: detalleOrdenTrabajo.id}));
        }
    }, [detalleOrdenTrabajo]);

    const hayDevolucionesDesdeGuias = useMemo(() => {
        if (!detalleOrdenTrabajo) return false;
        return listaVouchers
            .filter((voucher) => voucher.orden_trabajo === detalleOrdenTrabajo.id)
            .some((voucher) =>
                (Array.isArray(voucher.movimientos_agrupados) ? voucher.movimientos_agrupados : [])
                    .some((grupo) => grupo.origen_tipo === "GuíaSalida"),
            );
    }, [detalleOrdenTrabajo, listaVouchers]);

    const abrirDetalleGuia = (guiaId?: number | null) => {
        console.log("Insumos: click ver guía", guiaId);
        if (!guiaId) {
            toast.error("No se pudo abrir el detalle: guía sin identificador");
            return;
        }
        navigate(`/bodega/detalle-guia-salida-bodega/${guiaId}`);
    };

    const columns = [
        columnHelper.accessor("id", {
            cell: (info) => info.getValue(),
            header: "N° de Trabajo",
            size: 80
        }),
        columnHelper.accessor("nombre", {
            cell: (info) => info.getValue(),
            header: "Nombre de Trabajo",
        }),
        columnHelper.accessor("estado_label", {
            cell: (info) => info.getValue(),
            header: "Estado de Trabajo",
        }),
        columnHelper.accessor("tipo", {
            cell: (info) => (info.getValue() === "servicio" ? "Servicio" : "Soporte"),
            header: "Tipo",
            size: 80,
        }),
        columnHelper.accessor("guia.id", {
            cell: (info) => info.getValue() ?? "-",
            header: "N° de Guia",
            size: 80
        }),
        columnHelper.accessor("guia.estado_label", {
            cell: (info) => info.getValue() ?? "-",
            header: "Estado de Guia"
        }),
        columnHelper.accessor("guia.cantidad_items", {
            cell: (info) => info.getValue() ?? 0,
            header: "Cantidad de Items"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div>
                    {info.row.original.guia && (
                        <Tooltip text="Detalle Guia de Salida">
                            <Button
                                variant="solid"
                                color="violet"
                                icon="HeroEye"
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    console.log("mousedown detalle guía", info.row.original.guia?.id);
                                    abrirDetalleGuia(info.row.original.guia?.id);
                                }}
                            />
                        </Tooltip>
                    )}
                </div>
            ),
            header: "",
            size: 80
        })
    ];

    const dataFiltrada = (listaInsumos || []).filter((insumo) => !!insumo.guia);

    const table = useReactTable({
        data: dataFiltrada,
        columns: columns,
        state: {
            sorting: sorting,
            globalFilter: globalFilter
        },
        onSortingChange: setSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel()
    });

    return (
        <>
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <Badge className="text-xl">Insumos</Badge>
                    </CardHeaderChild>
                    <CardHeaderChild className="flex items-center gap-2">
                        <AnimacionDeInputModoMovil globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}>
                            {/* {detalleOrdenTrabajo && detalleOrdenTrabajo.estado === "pendiente" && <VincularInsumos id_orden={detalleOrdenTrabajo?.id} id_detalleTrabajo={detalleDelDetalleTrabajo?.id} />} */}
                        </AnimacionDeInputModoMovil>
                        {detalleOrdenTrabajo && hayDevolucionesDesdeGuias && (
                            <Tooltip text="Ver devoluciones de guías">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    color="blue"
                                    icon="HeroDocumentDuplicate"
                                    onClick={() =>
                                        navigate(`/bodega/devoluciones?orden_trabajo=${detalleOrdenTrabajo.id}`)
                                    }
                                />
                            </Tooltip>
                        )}
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className="z-0">
                    <div className="overflow-auto">
                        {listaInsumos.length > 0 ? (
                            <>
                                <Table>
                                    <THead>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <Tr key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <Th
                                                        key={header.id}
                                                        scope="col"
                                                        onClick={header.column.getToggleSortingHandler()}
                                                        className="cursor-pointer select-none"
                                                    >
                                                        {header.isPlaceholder ? null : (
                                                            <div className="flex items-center">
                                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                                {{
                                                                    asc: (
                                                                        <Icon icon="HeroChevronUp" className="ltr:ml-1.5 rtl:mr-1.5" />
                                                                    ),
                                                                    desc: (
                                                                        <Icon icon="HeroChevronDown" className="ltr:ml-1.5 rtl:mr-1.5" />
                                                                    )
                                                                }[header.column.getIsSorted() as string] ?? null}
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
                                                    <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
                                                ))}
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                                <div className="mt-2 min-w-[600px]">
                                    <TableCardFooterTemplateV2 table={table} />
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-gray-500">No se encontraron insumos.</div>
                        )}
                    </div>
                </CardBody>
            </Card>
            {/* <Modal isOpen={isModalOpen} setIsOpen={setIsModalOpen}>
                <ModalHeader>
                    <Badge className="text-2xl">Confirmar Desvinculación</Badge>
                </ModalHeader>
                <ModalBody>
                    <p className="text-center">¿Está seguro de que desea desvincular este insumo?</p>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button variant="solid" color="red" onClick={confirmarDesvincularInsumo}>Desvincular</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal> */}
        </>
    );
}

export default Insumos;
