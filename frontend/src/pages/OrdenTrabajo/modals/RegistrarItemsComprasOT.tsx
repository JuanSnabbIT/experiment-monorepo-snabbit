import Input from '@/components/form/Input';
import SelectReact from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import type {
    IBodega,
    ICompra,
    ICompraConItems,
    IItemEnCompra,
    IItemTracking,
} from '@/interface/bodega.interface';
import ApiService from '@/services/ApiService';
import { detalleOrdenTrabajoThunk, useAppDispatch, useAppSelector } from '@/store';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

interface Props {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onSuccess?: () => void;
}

interface ItemTrackingState extends IItemTracking {
    item: IItemEnCompra;
    cantidad_total: number;
}

function RegistrarItemsComprasOT({ isOpen, setIsOpen, onSuccess }: Props) {
    const dispatch = useAppDispatch();
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo);
    const [comprasConItems, setComprasConItems] = useState<ICompraConItems[]>([]);
    const [itemsTracking, setItemsTracking] = useState<ItemTrackingState[]>([]);
    const [listaBodegas, setListaBodegas] = useState<IBodega[]>([]);
    const [loading, setLoading] = useState(false);
    const [bodegaSeleccionada, setBodegaSeleccionada] = useState<number | null>(null);

    // Cargar compras con items al abrir el modal
    useEffect(() => {
        if (isOpen && detalleOrdenTrabajo) {
            cargarComprasItems();
            cargarBodegas();
        }
    }, [isOpen, detalleOrdenTrabajo]);

    const cargarComprasItems = async () => {
        try {
            const response = await ApiService.fetchData<ICompra[]>({
                url: `/api/compras/?orden_trabajo=${detalleOrdenTrabajo?.id}`,
                method: 'get',
            });

            const compras = response.data || [];
            const comprasConItemsData: ICompraConItems[] = [];

            for (const compra of compras) {
                const itemsResponse = await ApiService.fetchData<IItemEnCompra[]>({
                    url: `/api/compras/${compra.id}/items-compras/`,
                    method: 'get',
                });
                comprasConItemsData.push({
                    compra,
                    items: itemsResponse.data || [],
                });
            }

            setComprasConItems(comprasConItemsData);

            // Inicializar tracking para cada item
            const tracking: ItemTrackingState[] = [];
            comprasConItemsData.forEach((compraData) => {
                compraData.items.forEach((item) => {
                    tracking.push({
                        item_en_compra_id: item.id,
                        cantidad_usada: 0,
                        cantidad_sobrante: 0,
                        bodega_destino: null,
                        item: item,
                        cantidad_total: item.cantidad,
                    });
                });
            });
            setItemsTracking(tracking);
        } catch (error: any) {
            toast.error('Error al cargar items de compras', { toastId: 'error-compras-items' });
        }
    };

    const cargarBodegas = async () => {
        try {
            const response = await ApiService.fetchData<IBodega[]>({
                url: '/api/bodegas/',
                method: 'get',
            });
            if (response.data) {
                setListaBodegas(response.data);
            }
        } catch (error) {
            toast.error('Error al cargar bodegas');
        }
    };

    const updateTracking = (
        itemId: number,
        field: 'cantidad_usada' | 'cantidad_sobrante' | 'bodega_destino',
        value: number | null,
    ) => {
        setItemsTracking((prev) =>
            prev.map((tracking) => {
                if (tracking.item_en_compra_id === itemId) {
                    const updated = { ...tracking, [field]: value };

                    // Auto-calcular sobrante cuando se ingresa cantidad usada
                    if (field === 'cantidad_usada') {
                        const usada = Number(value) || 0;
                        updated.cantidad_sobrante = Math.max(0, tracking.cantidad_total - usada);
                    }

                    // Auto-calcular usada cuando se ingresa sobrante
                    if (field === 'cantidad_sobrante') {
                        const sobrante = Number(value) || 0;
                        updated.cantidad_usada = Math.max(0, tracking.cantidad_total - sobrante);
                    }

                    return updated;
                }
                return tracking;
            }),
        );
    };

    const aplicarBodegaATodos = () => {
        if (!bodegaSeleccionada) {
            toast.warning('Seleccione una bodega primero');
            return;
        }

        setItemsTracking((prev) =>
            prev.map((tracking) => ({
                ...tracking,
                bodega_destino: tracking.cantidad_sobrante > 0 ? bodegaSeleccionada : null,
            })),
        );

        toast.success('Bodega aplicada a todos los items con sobrantes');
    };

    const validarYCompletar = async () => {
        // Validaciones
        const errores: string[] = [];

        itemsTracking.forEach((tracking) => {
            const suma = tracking.cantidad_usada + tracking.cantidad_sobrante;
            if (suma > tracking.cantidad_total) {
                errores.push(
                    `Item ${tracking.item.nombre_item}: usado + sobrante (${suma}) excede total (${tracking.cantidad_total})`,
                );
            }

            if (tracking.cantidad_sobrante > 0 && !tracking.bodega_destino) {
                errores.push(
                    `Item ${tracking.item.nombre_item}: debe seleccionar bodega para sobrantes`,
                );
            }
        });

        if (errores.length > 0) {
            toast.error(errores.join('\n'), { autoClose: 5000 });
            return;
        }

        setLoading(true);

        try {
            const payload = {
                items_tracking: itemsTracking.map((t) => ({
                    item_en_compra_id: t.item_en_compra_id,
                    cantidad_usada: t.cantidad_usada,
                    cantidad_sobrante: t.cantidad_sobrante,
                    bodega_destino: t.bodega_destino,
                })),
            };

            const response = await ApiService.fetchData({
                url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo?.id}/completar-con-compras/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(payload),
            });

            if (response.data) {
                toast.success('OT completada con éxito', { autoClose: 2000 });
                dispatch(detalleOrdenTrabajoThunk({ id_ordenTrabajo: detalleOrdenTrabajo?.id }));
                setIsOpen(false);
                if (onSuccess) onSuccess();
            }
        } catch (error: any) {
            const errores = error.response?.data?.errores || [];
            const mensaje = errores.length > 0 ? errores.join('\n') : 'Error al completar la OT';
            toast.error(mensaje, { toastId: 'error-completar-ot', autoClose: 5000 });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} size='5xl' isStaticBackdrop>
            <ModalHeader>
                <Badge className='text-xl'>Registrar Uso de Items de Compras</Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-6'>
                    <div className='text-sm text-gray-600'>
                        Indique cuánto de cada item se usó en la OT. Los sobrantes se ingresarán
                        automáticamente a la bodega seleccionada.
                    </div>

                    {/* Selector global de bodega */}
                    <div className='flex items-end gap-2 rounded-lg bg-gray-50 p-3'>
                        <div className='flex-1'>
                            <Badge>Bodega para Sobrantes (aplicar a todos)</Badge>
                            <SelectReact
                                name='bodega_global'
                                options={listaBodegas.map((b) => ({
                                    value: String(b.id),
                                    label: b.nombre,
                                }))}
                                value={
                                    bodegaSeleccionada
                                        ? {
                                              value: String(bodegaSeleccionada),
                                              label:
                                                  listaBodegas.find(
                                                      (b) => b.id === bodegaSeleccionada,
                                                  )?.nombre || '',
                                          }
                                        : undefined
                                }
                                onChange={(option: any) =>
                                    setBodegaSeleccionada(Number(option?.value) || null)
                                }
                                placeholder='Seleccionar bodega'
                            />
                        </div>
                        <Button variant='solid' onClick={aplicarBodegaATodos} className='mb-1'>
                            Aplicar a Todos
                        </Button>
                    </div>

                    {/* Tabla de items */}
                    <div className='overflow-x-auto'>
                        <div className='min-w-full'>
                            {/* Header */}
                            <div className='grid grid-cols-6 gap-2 rounded-t-lg bg-gray-100 p-2 font-semibold'>
                                <div className='col-span-2'>Item</div>
                                <div className='text-center'>Cantidad Total</div>
                                <div className='text-center'>Usado</div>
                                <div className='text-center'>Sobrante</div>
                                <div>Bodega Sobrantes</div>
                            </div>

                            {/* Rows */}
                            {comprasConItems.map((compraOT) => (
                                <div key={compraOT.compra.id} className='mb-4'>
                                    <div className='mt-2 bg-blue-50 p-2 text-sm font-medium text-blue-600'>
                                        {compraOT.compra.observaciones || 'Sin descripcion'}{' '}
                                        {compraOT.compra.fecha_compra
                                            ? `(${new Date(
                                                  compraOT.compra.fecha_compra,
                                              ).toLocaleDateString()})`
                                            : ''}
                                    </div>

                                    {compraOT.items.map((item) => {
                                        const tracking = itemsTracking.find(
                                            (t) => t.item_en_compra_id === item.id,
                                        );
                                        if (!tracking) return null;

                                        return (
                                            <div
                                                key={item.id}
                                                className='grid grid-cols-6 gap-2 border-b p-2 hover:bg-gray-50'>
                                                <div className='col-span-2 flex items-center text-sm'>
                                                    {item.nombre_item}
                                                </div>
                                                <div className='flex items-center justify-center text-center font-medium'>
                                                    {item.cantidad}
                                                </div>
                                                <div>
                                                    <Input
                                                        name={`usado_${item.id}`}
                                                        type='number'
                                                        min='0'
                                                        max={tracking.cantidad_total}
                                                        value={tracking.cantidad_usada}
                                                        onChange={(
                                                            e: React.ChangeEvent<HTMLInputElement>,
                                                        ) =>
                                                            updateTracking(
                                                                item.id,
                                                                'cantidad_usada',
                                                                Number(e.target.value),
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <Input
                                                        name={`sobrante_${item.id}`}
                                                        type='number'
                                                        min='0'
                                                        max={tracking.cantidad_total}
                                                        value={tracking.cantidad_sobrante}
                                                        onChange={(
                                                            e: React.ChangeEvent<HTMLInputElement>,
                                                        ) =>
                                                            updateTracking(
                                                                item.id,
                                                                'cantidad_sobrante',
                                                                Number(e.target.value),
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    {tracking.cantidad_sobrante > 0 && (
                                                        <SelectReact
                                                            name={`bodega_${item.id}`}
                                                            options={listaBodegas.map((b) => ({
                                                                value: String(b.id),
                                                                label: b.nombre,
                                                            }))}
                                                            value={
                                                                tracking.bodega_destino
                                                                    ? {
                                                                          value: String(
                                                                              tracking.bodega_destino,
                                                                          ),
                                                                          label:
                                                                              listaBodegas.find(
                                                                                  (b) =>
                                                                                      b.id ===
                                                                                      tracking.bodega_destino,
                                                                              )?.nombre || '',
                                                                      }
                                                                    : undefined
                                                            }
                                                            onChange={(option: any) =>
                                                                updateTracking(
                                                                    item.id,
                                                                    'bodega_destino',
                                                                    Number(option?.value) || null,
                                                                )
                                                            }
                                                            placeholder='Seleccionar'
                                                            className='text-xs'
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {itemsTracking.length === 0 && (
                        <div className='py-8 text-center text-gray-500'>
                            No hay items en las compras vinculadas
                        </div>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild></ModalFooterChild>
                <ModalFooterChild>
                    <Button color='red' onClick={() => setIsOpen(false)} isDisable={loading}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        onClick={validarYCompletar}
                        isDisable={loading || itemsTracking.length === 0}>
                        {loading ? 'Procesando...' : 'Completar OT'}
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default RegistrarItemsComprasOT;
