import Input from '@/components/form/Input';
import SelectReact from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { getErrorMessage } from '@/utils/errorHandlers';
import {
    listaVouchersThunk,
    useAppDispatch,
} from '@/store';
import {
    useCrearVoucherDevolucionMutation,
    useDevolverCompraABodegaMutation,
    useFinalizarTrabajoSoporteMutation,
    useGetBodegasQuery,
    useGetCheckCompletibilidadOTQuery,
    useGetComprasEnOTQuery,
    useGetDetalleOrdenTrabajoQuery,
    useGetSoportesTecnicosQuery,
    useLazyGetItemsCompraDetalleQuery,
    useUpdateOrdenTrabajoMutation,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useParams } from 'react-router-dom';

type CompraItemDevolucion = {
    compraId: number;
    itemId: number;
    nombre: string;
    cantidad_total: number;
    cantidad_a_devolver: number;
    seleccionado: boolean;
};

function CompletarOT() {
    const dispatch = useAppDispatch();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    const {
        data: detalleOrdenTrabajo,
        refetch: refetchDetalleOrdenTrabajo,
    } = useGetDetalleOrdenTrabajoQuery(ordenId ?? 0, {
        skip: !ordenId,
    });
    const { data: checkCompletibilidadOT } = useGetCheckCompletibilidadOTQuery(ordenId ?? 0, {
        skip: !ordenId || !isOpen,
    });
    const { data: listaSoportesTecnicos = [] } = useGetSoportesTecnicosQuery(ordenId ?? 0, {
        skip: !ordenId || !isOpen,
    });
    const { data: listaComprasEnOT = [] } = useGetComprasEnOTQuery(ordenId ?? 0, {
        skip: !ordenId || !isOpen,
    });
    const { data: listaBodegas = [] } = useGetBodegasQuery(undefined, {
        skip: !isOpen,
    });
    const [getItemsCompraDetalle] = useLazyGetItemsCompraDetalleQuery();
    const [devolverCompraABodega] = useDevolverCompraABodegaMutation();
    const [crearVoucherDevolucionMutation] = useCrearVoucherDevolucionMutation();
    const [updateOrdenTrabajo] = useUpdateOrdenTrabajoMutation();
    const [finalizarTrabajoSoporte] = useFinalizarTrabajoSoporteMutation();
    const [tieneCompras, setTieneCompras] = useState<boolean>(false);
    const [cargandoInsumos, setCargandoInsumos] = useState<boolean>(false);
    const [todosItemsCompradosUsados, setTodosItemsCompradosUsados] = useState<boolean>(true);
    const [procesando, setProcesando] = useState<boolean>(false);
    const [comprasItems, setComprasItems] = useState<CompraItemDevolucion[]>([]);
    const [bodegaSeleccionada, setBodegaSeleccionada] = useState<number | null>(null);

    useEffect(() => {
        const cargarInsumos = async () => {
            if (!isOpen || !detalleOrdenTrabajo) return;

            setCargandoInsumos(true);
            try {
                const compras = listaComprasEnOT || [];
                if (compras.length === 0) {
                    setComprasItems([]);
                    setTieneCompras(false);
                    return;
                }

                const comprasConItems = await Promise.all(
                    compras.map(async (compra) => {
                        const items = await getItemsCompraDetalle(compra.id).unwrap();
                        return { compra, items: items || [] };
                    }),
                );

                const itemsCompra: CompraItemDevolucion[] = [];
                comprasConItems.forEach((compraData) => {
                    compraData.items.forEach((item) => {
                        itemsCompra.push({
                            compraId: compraData.compra.id,
                            itemId: item.id,
                            nombre: item.nombre_item,
                            cantidad_total: item.cantidad,
                            cantidad_a_devolver: 0,
                            seleccionado: false,
                        });
                    });
                });

                setComprasItems(itemsCompra);
                setTieneCompras(itemsCompra.length > 0);
            } catch (error) {
                console.error('Error al cargar insumos:', error);
                setComprasItems([]);
                setTieneCompras(false);
            } finally {
                setCargandoInsumos(false);
            }
        };

        cargarInsumos();
    }, [detalleOrdenTrabajo, getItemsCompraDetalle, isOpen, listaComprasEnOT]);

    const finalizarTrabajosEnProceso = async () => {
        if (!detalleOrdenTrabajo) return;
        const soportes = listaSoportesTecnicos || [];
        for (const sop of soportes) {
            if (sop.estado === 'en_proceso' && sop.guia_salida) {
                try {
                    await finalizarTrabajoSoporte({
                        ordenId: detalleOrdenTrabajo.id,
                        soporteId: sop.id,
                        data: { todos_usados: true, devoluciones: [] },
                    }).unwrap();
                } catch (error: unknown) {
                    const msg =
                        getErrorMessage(error) || `No se pudo finalizar el soporte ${sop.nombre}`;
                    throw new Error(msg);
                }
            }
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setTodosItemsCompradosUsados(true);
            setComprasItems([]);
            setBodegaSeleccionada(null);
            setTieneCompras(false);
        }
    }, [isOpen]);

    const actualizarCompraCantidad = (itemId: number, value: number) => {
        setComprasItems((prev) =>
            prev.map((item) =>
                item.itemId === itemId
                    ? {
                          ...item,
                          cantidad_a_devolver: Math.max(0, Math.min(value, item.cantidad_total)),
                      }
                    : item,
            ),
        );
    };

    const toggleCompraSeleccion = (itemId: number, seleccionado: boolean) => {
        setComprasItems((prev) =>
            prev.map((item) =>
                item.itemId === itemId
                    ? {
                          ...item,
                          seleccionado,
                          cantidad_a_devolver: seleccionado ? item.cantidad_a_devolver : 0,
                      }
                    : item,
            ),
        );
    };

    const procesarDevoluciones = async () => {
        const devolucionesCompras = comprasItems.filter((item) => item.seleccionado);

        if (devolucionesCompras.length === 0) {
            throw new Error('Debes indicar al menos un item para devolver.');
        }

        if (devolucionesCompras.length > 0 && !bodegaSeleccionada) {
            throw new Error('Selecciona una bodega para las devoluciones de compras.');
        }

        const errores: string[] = [];
        devolucionesCompras.forEach((item) => {
            if (item.cantidad_a_devolver <= 0) {
                errores.push(`Item ${item.nombre}: indica una cantidad a devolver.`);
                return;
            }
            if (item.cantidad_a_devolver > item.cantidad_total) {
                errores.push(`Item ${item.nombre}: cantidad a devolver excede el total comprado.`);
            }
        });
        if (errores.length > 0) {
            throw new Error(errores.join('\n'));
        }

        const devolucionesPorCompra = devolucionesCompras.reduce<
            Record<number, { item_en_compra_id: number; cantidad_a_devolver: number }[]>
        >((acc, item) => {
            if (!acc[item.compraId]) {
                acc[item.compraId] = [];
            }
            acc[item.compraId].push({
                item_en_compra_id: item.itemId,
                cantidad_a_devolver: item.cantidad_a_devolver,
            });
            return acc;
        }, {});

        for (const compraId of Object.keys(devolucionesPorCompra)) {
            await devolverCompraABodega({
                compraId: Number(compraId),
                ordenId: detalleOrdenTrabajo?.id,
                data: {
                    bodega: bodegaSeleccionada,
                    items: devolucionesPorCompra[Number(compraId)],
                },
            }).unwrap();
        }
    };

    const crearVoucherDevolucion = async () => {
        if (!detalleOrdenTrabajo) return;

        try {
            const voucher = await crearVoucherDevolucionMutation({
                ordenId: detalleOrdenTrabajo.id,
            }).unwrap();
            dispatch(listaVouchersThunk({ orden_trabajo: detalleOrdenTrabajo.id }));
            toast.success(`Voucher ${voucher.numero} generado`, { autoClose: 1200 });
        } catch (error: unknown) {
            const status =
                typeof error === 'object' && error && 'status' in error
                    ? (error as { status?: number }).status
                    : undefined;
            if (status === 409) {
                dispatch(listaVouchersThunk({ orden_trabajo: detalleOrdenTrabajo.id }));
                return;
            }

            const msg =
                getErrorMessage(error) ||
                'Error al generar voucher de devoluci??n';
            throw new Error(msg);
        }
    };

    const completarOrden = async (finalizarTrabajos: boolean) => {
        if (finalizarTrabajos) {
            await finalizarTrabajosEnProceso();
        }

        if (!detalleOrdenTrabajo) return;
        await updateOrdenTrabajo({
            id: detalleOrdenTrabajo.id,
            data: { estado: 'completada' },
        }).unwrap();
    };

    const handleCompletar = async () => {
        if (!detalleOrdenTrabajo) return;

        try {
            setProcesando(true);

            const requiereDevoluciones = !todosItemsCompradosUsados && comprasItems.length > 0;

            if (requiereDevoluciones) {
                await procesarDevoluciones();
                await crearVoucherDevolucion();
                await completarOrden(false);
            } else {
                await completarOrden(true);
            }

            toast.success('Orden de Trabajo actualizada', { autoClose: 1000 });
            refetchDetalleOrdenTrabajo();
            setIsOpen(false);
        } catch (error: unknown) {
            const msg = getErrorMessage(error) || 'Error al completar la OT';
            toast.error(msg, { toastId: 'Error al completar la OT' });
        } finally {
            setProcesando(false);
        }
    };

    const tieneDevolucionesCompra = comprasItems.some((item) => item.seleccionado);

    return (
        <>
            <Tooltip text='Cambiar a Completada'>
                <Button
                    variant='solid'
                    color='amber'
                    icon='HeroHandThumbUp'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Cambiar a Completada</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        {checkCompletibilidadOT ? (
                            <>
                                {checkCompletibilidadOT.se_puede_completar ? (
                                    <div>
                                        <div className='mb-2'>
                                            Al cambiar a Completada no se puede deshacer
                                        </div>
                                        {cargandoInsumos && (
                                            <div className='text-sm text-gray-500'>
                                                Cargando insumos...
                                            </div>
                                        )}
                                        {!cargandoInsumos && tieneCompras && (
                                            <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700'>
                                                Esta OT tiene compras registradas.
                                            </div>
                                        )}
                                        {tieneCompras && (
                                            <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm'>
                                                <label className='flex items-center gap-2'>
                                                    <input
                                                        type='checkbox'
                                                        checked={todosItemsCompradosUsados}
                                                        onChange={(e) =>
                                                            setTodosItemsCompradosUsados(
                                                                e.target.checked,
                                                            )
                                                        }
                                                    />
                                                    <span className='font-medium text-amber-700'>
                                                        Confirmo que todos los items comprados
                                                        fueron utilizados
                                                    </span>
                                                </label>
                                            </div>
                                        )}

                                        {!todosItemsCompradosUsados && (
                                            <div className='mt-4 flex flex-col gap-4'>
                                                {comprasItems.length > 0 && (
                                                    <div className='rounded-lg border border-gray-200 bg-gray-50 p-3'>
                                                        <div className='mb-3'>
                                                            <Badge>Items de Compras</Badge>
                                                        </div>
                                                        <div className='mb-3'>
                                                            <Badge>
                                                                Bodega para devoluciones de compras
                                                            </Badge>
                                                            <SelectReact
                                                                name='bodega_devolucion'
                                                                options={listaBodegas.map((b) => ({
                                                                    value: String(b.id),
                                                                    label: b.nombre,
                                                                }))}
                                                                value={
                                                                    bodegaSeleccionada
                                                                        ? {
                                                                              value: String(
                                                                                  bodegaSeleccionada,
                                                                              ),
                                                                              label:
                                                                                  listaBodegas.find(
                                                                                      (b) =>
                                                                                          b.id ===
                                                                                          bodegaSeleccionada,
                                                                                  )?.nombre || '',
                                                                          }
                                                                        : undefined
                                                                }
                                                                onChange={(option: any) =>
                                                                    setBodegaSeleccionada(
                                                                        Number(option?.value) ||
                                                                            null,
                                                                    )
                                                                }
                                                                placeholder='Seleccionar bodega'
                                                            />
                                                            {tieneDevolucionesCompra &&
                                                                !bodegaSeleccionada && (
                                                                    <div className='mt-1 text-xs text-red-600'>
                                                                        Selecciona una bodega para
                                                                        continuar.
                                                                    </div>
                                                                )}
                                                        </div>
                                                        <div className='grid grid-cols-1 gap-2 text-sm text-gray-500 md:grid-cols-12'>
                                                            <div className='md:col-span-6'>
                                                                Item
                                                            </div>
                                                            <div className='text-center md:col-span-2'>
                                                                Comprado
                                                            </div>
                                                            <div className='text-center md:col-span-2'>
                                                                Seleccionar
                                                            </div>
                                                            <div className='text-center md:col-span-2'>
                                                                Devolver
                                                            </div>
                                                        </div>
                                                        <div className='mt-2 flex flex-col gap-2'>
                                                            {comprasItems.map((item) => (
                                                                <div
                                                                    key={`compra-${item.itemId}`}
                                                                    className='grid grid-cols-1 gap-2 rounded border border-gray-200 bg-white p-2 md:grid-cols-12'>
                                                                    <div className='md:col-span-6'>
                                                                        <div className='font-medium'>
                                                                            {item.nombre}
                                                                        </div>
                                                                        <div className='text-xs text-gray-500'>
                                                                            Compra #{item.compraId}
                                                                        </div>
                                                                    </div>
                                                                    <div className='text-center md:col-span-2'>
                                                                        {item.cantidad_total}
                                                                    </div>
                                                                    <div className='flex justify-center md:col-span-2'>
                                                                        <input
                                                                            type='checkbox'
                                                                            checked={
                                                                                item.seleccionado
                                                                            }
                                                                            onChange={(e) =>
                                                                                toggleCompraSeleccion(
                                                                                    item.itemId,
                                                                                    e.target
                                                                                        .checked,
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                    <div className='md:col-span-2'>
                                                                        <Input
                                                                            name={`compra_devolver_${item.itemId}`}
                                                                            type='number'
                                                                            min='0'
                                                                            max={
                                                                                item.cantidad_total
                                                                            }
                                                                            value={
                                                                                item.cantidad_a_devolver
                                                                            }
                                                                            disabled={
                                                                                !item.seleccionado
                                                                            }
                                                                            onChange={(e) =>
                                                                                actualizarCompraCantidad(
                                                                                    item.itemId,
                                                                                    Number(
                                                                                        e.target
                                                                                            .value,
                                                                                    ),
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : !checkCompletibilidadOT.se_puede_completar &&
                                  checkCompletibilidadOT.razones.length > 0 ? (
                                    checkCompletibilidadOT.razones.map((raz, index) => (
                                        <div
                                            key={index}
                                            className='flex flex-wrap items-center gap-2'>
                                            <Icon icon='DuoCircle'></Icon>
                                            {raz}
                                        </div>
                                    ))
                                ) : (
                                    <div></div>
                                )}
                            </>
                        ) : (
                            'No se pudo obtener si la OT se puede completar'
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpen(false);
                            }}>
                            Cancelar
                        </Button>
                        {checkCompletibilidadOT && checkCompletibilidadOT.se_puede_completar ? (
                            <Button
                                variant='solid'
                                onClick={handleCompletar}
                                isDisable={cargandoInsumos || procesando}>
                                Completar
                            </Button>
                        ) : (
                            <Button variant='solid' isDisable>
                                Completar
                            </Button>
                        )}
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CompletarOT;
