import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import type { IStockItemParaGuiaRapida } from '@/interface/ordenTrabajoV3.interface';
import {
    useCrearGuiaRapidaV3Mutation,
    useGetStockParaGuiaRapidaV3Query,
} from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface IItemSeleccionado {
    uid: string;
    stock_item_id: number;
    item_nombre: string;
    cantidad_rebajada: number;
    numero_serie: string;
    requiere_serie: boolean;
    series_disponibles: string[];
}

interface IIngresoExterno {
    item_id: number;
    item_nombre: string;
    cantidad: number;
    es_serializado: boolean;
    numero_serie: string;
}

interface IProps {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    ordenId: number;
    cotizacionId: number | null;
    bodegasOptions: TSelectOption[];
}

const CrearGuiaRapidaOTV3 = ({
    isOpen,
    setIsOpen,
    ordenId,
    cotizacionId,
    bodegasOptions,
}: IProps) => {
    const [bodegaId, setBodegaId] = useState<string | null>(null);
    const [motivo, setMotivo] = useState('');
    const [itemsSeleccionados, setItemsSeleccionados] = useState<IItemSeleccionado[]>([]);
    const [ingresosExternos, setIngresosExternos] = useState<IIngresoExterno[]>([]);

    const { data: stockItems = [], isFetching: loadingStock } = useGetStockParaGuiaRapidaV3Query(
        {
            ordenId,
            bodega_id: Number(bodegaId!),
            cotizacion_id: cotizacionId ?? undefined,
            incluir_sin_stock: cotizacionId !== null ? true : undefined,
        },
        { skip: !isOpen || !bodegaId },
    );

    const [crearGuia, { isLoading }] = useCrearGuiaRapidaV3Mutation();

    const handleAgregarItem = (stock: IStockItemParaGuiaRapida) => {
        if (!stock.stock_item_id) return;

        if (!stock.requiere_serie) {
            // Items sin serie: solo una fila por stock_item_id
            if (itemsSeleccionados.some((i) => i.stock_item_id === stock.stock_item_id)) return;
            setItemsSeleccionados((prev) => [
                ...prev,
                {
                    uid: crypto.randomUUID(),
                    stock_item_id: stock.stock_item_id as number,
                    item_nombre: stock.item_nombre,
                    cantidad_rebajada: 1,
                    numero_serie: '',
                    requiere_serie: false,
                    series_disponibles: [],
                },
            ]);
            return;
        }

        // Items serializados: una fila por serie, auto-seleccionar la primera libre
        const seriesYaUsadas = itemsSeleccionados
            .filter((i) => i.stock_item_id === stock.stock_item_id)
            .map((i) => i.numero_serie);
        const primeraSerieLibre = stock.series_disponibles.find(
            (s) => !seriesYaUsadas.includes(s),
        );
        if (!primeraSerieLibre) return; // Todas las series ya están en la lista

        setItemsSeleccionados((prev) => [
            ...prev,
            {
                uid: crypto.randomUUID(),
                stock_item_id: stock.stock_item_id as number,
                item_nombre: stock.item_nombre,
                cantidad_rebajada: 1,
                numero_serie: primeraSerieLibre,
                requiere_serie: true,
                series_disponibles: stock.series_disponibles,
            },
        ]);
    };

    const handleQuitarItem = (uid: string) => {
        setItemsSeleccionados((prev) => prev.filter((i) => i.uid !== uid));
    };

    const handleCambiarCantidad = (uid: string, cantidad: number) => {
        setItemsSeleccionados((prev) =>
            prev.map((i) => (i.uid === uid ? { ...i, cantidad_rebajada: cantidad } : i)),
        );
    };

    const handleCambiarSerie = (uid: string, serie: string) => {
        setItemsSeleccionados((prev) =>
            prev.map((i) => (i.uid === uid ? { ...i, numero_serie: serie } : i)),
        );
    };

    const handleAgregarIngresoExterno = (stock: IStockItemParaGuiaRapida) => {
        if (ingresosExternos.some((i) => i.item_id === stock.item_id)) return;
        setIngresosExternos((prev) => [
            ...prev,
            {
                item_id: stock.item_id,
                item_nombre: stock.item_nombre,
                cantidad: 1,
                es_serializado: false,
                numero_serie: '',
            },
        ]);
    };

    const handleQuitarIngresoExterno = (itemId: number) => {
        setIngresosExternos((prev) => prev.filter((i) => i.item_id !== itemId));
    };

    const handleCambiarCantidadExterna = (itemId: number, cantidad: number) => {
        setIngresosExternos((prev) =>
            prev.map((i) => (i.item_id === itemId ? { ...i, cantidad } : i)),
        );
    };

    const handleToggleSerializado = (itemId: number, checked: boolean) => {
        setIngresosExternos((prev) =>
            prev.map((i) =>
                i.item_id === itemId
                    ? { ...i, es_serializado: checked, cantidad: 1, numero_serie: '' }
                    : i,
            ),
        );
    };

    const handleCambiarSerieExterna = (itemId: number, serie: string) => {
        setIngresosExternos((prev) =>
            prev.map((i) => (i.item_id === itemId ? { ...i, numero_serie: serie } : i)),
        );
    };

    const handleConfirmar = async () => {
        if (!bodegaId) return;
        if (!itemsSeleccionados.length && !cotizacionId && !ingresosExternos.length) {
            toast.warning('Debe agregar al menos un item');
            return;
        }
        // Validar que ingresos serializados tengan número de serie
        const ingresoSinSerie = ingresosExternos.find(
            (i) => i.es_serializado && !i.numero_serie.trim(),
        );
        if (ingresoSinSerie) {
            toast.error(
                `El item "${ingresoSinSerie.item_nombre}" está marcado como serializado pero no tiene número de serie.`,
            );
            return;
        }
        try {
            await crearGuia({
                ordenId,
                bodega_id: Number(bodegaId),
                motivo,
                ...(cotizacionId ? { cotizacion_id: cotizacionId } : {}),
                items: itemsSeleccionados.map((i) => ({
                    stock_item_id: i.stock_item_id,
                    cantidad_rebajada: i.cantidad_rebajada,
                    ...(i.requiere_serie && i.numero_serie ? { numero_serie: i.numero_serie } : {}),
                })),
                ...(ingresosExternos.length > 0
                    ? {
                          ingresos_externos: ingresosExternos.map((i) => ({
                              item_id: i.item_id,
                              cantidad: i.cantidad,
                              ...(i.es_serializado
                                  ? { es_serializado: true, numero_serie: i.numero_serie }
                                  : {}),
                          })),
                      }
                    : {}),
            }).unwrap();
            toast.success('Guia de salida creada y vinculada');
            handleClose();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleClose = () => {
        setBodegaId(null);
        setMotivo('');
        setItemsSeleccionados([]);
        setIngresosExternos([]);
        setIsOpen(false);
    };

    const itemsConStock = stockItems.filter((s) => s.en_stock !== false);
    const itemsSinStock = stockItems.filter((s) => s.en_stock === false);
    const hayItems = itemsSeleccionados.length > 0 || ingresosExternos.length > 0;

    return (
        <Modal isOpen={isOpen} setIsOpen={handleClose} size='xl'>
            <ModalHeader>
                Crear Guia Rapida
                {cotizacionId && (
                    <span className='ml-2 text-sm font-normal text-gray-500'>
                        para la cotizacion vinculada
                    </span>
                )}
            </ModalHeader>
            <ModalBody className='grid grid-cols-1 gap-5'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <div>
                        <Label htmlFor='bodega_id' className='mb-1'>
                            Bodega <span className='text-red-500'>*</span>
                        </Label>
                        <SelectReact
                            name='bodega_id'
                            options={bodegasOptions}
                            value={bodegasOptions.find((o) => o.value === bodegaId) ?? null}
                            onChange={(opt) => {
                                setBodegaId(opt ? (opt as TSelectOption).value : null);
                                setItemsSeleccionados([]);
                                setIngresosExternos([]);
                            }}
                            placeholder='Selecciona una bodega...'
                        />
                    </div>
                    <div>
                        <Label htmlFor='motivo' className='mb-1'>
                            Motivo (opcional)
                        </Label>
                        <Input
                            id='motivo'
                            name='motivo'
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder='Ej: Entrega de equipos para OT...'
                        />
                    </div>
                </div>

                {bodegaId && (
                    <div className='space-y-4'>
                        {loadingStock ? (
                            <p className='text-sm text-gray-400'>Cargando stock...</p>
                        ) : (
                            <>
                                {itemsConStock.length > 0 ? (
                                    <div>
                                        <p className='mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300'>
                                            Stock disponible
                                            {cotizacionId ? (
                                                <span className='ml-1 font-normal text-gray-400'>
                                                    para esta cotizacion
                                                </span>
                                            ) : null}
                                        </p>
                                        <div className='max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700'>
                                            <Table>
                                                <THead>
                                                    <Tr>
                                                        <Th>Item</Th>
                                                        <Th className='text-right'>Disponible</Th>
                                                        <Th className='text-center'>Accion</Th>
                                                    </Tr>
                                                </THead>
                                                <TBody>
                                                    {itemsConStock.map((s) => {
                                                        const seriesUsadas = s.requiere_serie
                                                            ? itemsSeleccionados
                                                                  .filter(
                                                                      (i) =>
                                                                          i.stock_item_id ===
                                                                          s.stock_item_id,
                                                                  )
                                                                  .map((i) => i.numero_serie)
                                                            : [];
                                                        const yaAgregado = s.requiere_serie
                                                            ? seriesUsadas.length >=
                                                              s.series_disponibles.length
                                                            : itemsSeleccionados.some(
                                                                  (i) =>
                                                                      i.stock_item_id ===
                                                                      s.stock_item_id,
                                                              );
                                                        return (
                                                            <Tr key={s.stock_item_id ?? s.item_id}>
                                                                <Td>
                                                                    <p className='font-medium'>{s.item_nombre}</p>
                                                                    {s.categoria_nombre && (
                                                                        <p className='text-xs text-gray-400'>
                                                                            {s.categoria_nombre}
                                                                        </p>
                                                                    )}
                                                                    {s.requiere_serie && (
                                                                        <Badge
                                                                            color='blue'
                                                                            className='mt-0.5 text-xs'>
                                                                            Con series
                                                                        </Badge>
                                                                    )}
                                                                </Td>
                                                                <Td className='text-right'>
                                                                    {s.requiere_serie
                                                                        ? `${s.series_disponibles.length - seriesUsadas.length} / ${s.series_disponibles.length}`
                                                                        : s.cantidad_disponible}
                                                                </Td>
                                                                <Td className='text-center'>
                                                                    <Button
                                                                        size='sm'
                                                                        icon='HeroPlus'
                                                                        isDisable={yaAgregado}
                                                                        onClick={() =>
                                                                            handleAgregarItem(s)
                                                                        }>
                                                                        {yaAgregado
                                                                            ? s.requiere_serie
                                                                                ? 'Completo'
                                                                                : 'Agregado'
                                                                            : 'Agregar'}
                                                                    </Button>
                                                                </Td>
                                                            </Tr>
                                                        );
                                                    })}
                                                </TBody>
                                            </Table>
                                        </div>
                                    </div>
                                ) : !cotizacionId ? (
                                    <p className='text-sm text-gray-400'>
                                        Sin stock disponible en esta bodega.
                                    </p>
                                ) : null}

                                {itemsSinStock.length > 0 && (
                                    <div>
                                        <p className='mb-2 text-sm font-semibold text-amber-600 dark:text-amber-400'>
                                            Sin stock en bodega
                                            <span className='ml-1 font-normal text-gray-400'>
                                                — items de la cotizacion comprados fuera del sistema
                                            </span>
                                        </p>
                                        <div className='max-h-48 overflow-y-auto rounded-lg border border-amber-200 dark:border-amber-900/50'>
                                            <Table>
                                                <THead>
                                                    <Tr>
                                                        <Th>Item</Th>
                                                        <Th className='text-center'>Accion</Th>
                                                    </Tr>
                                                </THead>
                                                <TBody>
                                                    {itemsSinStock.map((s) => {
                                                        const yaAgregado = ingresosExternos.some(
                                                            (i) => i.item_id === s.item_id,
                                                        );
                                                        return (
                                                            <Tr key={s.item_id}>
                                                                <Td>
                                                                    <p className='font-medium'>
                                                                        {s.item_nombre}
                                                                    </p>
                                                                    {s.categoria_nombre && (
                                                                        <p className='text-xs text-gray-400'>
                                                                            {s.categoria_nombre}
                                                                        </p>
                                                                    )}
                                                                    <Badge
                                                                        color='amber'
                                                                        className='mt-0.5 text-xs'>
                                                                        Sin stock
                                                                    </Badge>
                                                                </Td>
                                                                <Td className='text-center'>
                                                                    <Button
                                                                        size='sm'
                                                                        icon='HeroArrowDownTray'
                                                                        color='amber'
                                                                        isDisable={yaAgregado}
                                                                        onClick={() =>
                                                                            handleAgregarIngresoExterno(
                                                                                s,
                                                                            )
                                                                        }>
                                                                        {yaAgregado
                                                                            ? 'Agregado'
                                                                            : 'Ingresar'}
                                                                    </Button>
                                                                </Td>
                                                            </Tr>
                                                        );
                                                    })}
                                                </TBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {cotizacionId && itemsSeleccionados.length === 0 && ingresosExternos.length === 0 && (
                    <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200'>
                        Puedes crear la guia vacia y completar los items mas tarde si esta
                        cotizacion aun no tiene OCs vinculadas.
                    </div>
                )}

                {itemsSeleccionados.length > 0 && (
                    <div>
                        <p className='mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300'>
                            Items a despachar <Badge color='emerald'>{itemsSeleccionados.length}</Badge>
                        </p>
                        <div className='space-y-2'>
                            {itemsSeleccionados.map((item) => {
                                // Series ocupadas por otras filas del mismo stock_item
                                const seriesOcupadas = itemsSeleccionados
                                    .filter(
                                        (i) =>
                                            i.uid !== item.uid &&
                                            i.stock_item_id === item.stock_item_id,
                                    )
                                    .map((i) => i.numero_serie);
                                const serieOpts: TSelectOption[] = item.series_disponibles
                                    .filter((s) => !seriesOcupadas.includes(s))
                                    .map((s) => ({ value: s, label: s }));
                                return (
                                    <div
                                        key={item.uid}
                                        className='flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50'>
                                        <span className='flex-1 text-sm font-medium'>
                                            {item.item_nombre}
                                        </span>
                                        {item.requiere_serie ? (
                                            <div className='w-44'>
                                                <SelectReact
                                                    name={`serie_${item.uid}`}
                                                    options={serieOpts}
                                                    value={
                                                        serieOpts.find(
                                                            (o) => o.value === item.numero_serie,
                                                        ) ?? null
                                                    }
                                                    onChange={(opt) =>
                                                        handleCambiarSerie(
                                                            item.uid,
                                                            opt
                                                                ? (opt as TSelectOption).value
                                                                : '',
                                                        )
                                                    }
                                                    placeholder='Nro serie...'
                                                />
                                            </div>
                                        ) : (
                                            <div className='w-24'>
                                                <Input
                                                    name={`cantidad_${item.uid}`}
                                                    type='number'
                                                    min={1}
                                                    value={item.cantidad_rebajada}
                                                    onChange={(e) =>
                                                        handleCambiarCantidad(
                                                            item.uid,
                                                            Number(e.target.value),
                                                        )
                                                    }
                                                />
                                            </div>
                                        )}
                                        <Button
                                            size='sm'
                                            icon='HeroTrash'
                                            color='red'
                                            onClick={() => handleQuitarItem(item.uid)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                {ingresosExternos.length > 0 && (
                    <div>
                        <p className='mb-2 text-sm font-semibold text-amber-600 dark:text-amber-400'>
                            Ingresos a registrar{' '}
                            <Badge color='amber'>{ingresosExternos.length}</Badge>
                        </p>
                        <p className='mb-2 text-xs text-gray-400'>
                            Estos items se ingresaran al stock de la bodega y se despacharan en la
                            guia.
                        </p>
                        <div className='space-y-2'>
                            {ingresosExternos.map((item) => (
                                <div
                                    key={item.item_id}
                                    className='rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/10'>
                                    <div className='flex flex-wrap items-center gap-3'>
                                        <span className='flex-1 text-sm font-medium'>
                                            {item.item_nombre}
                                        </span>
                                        {!item.es_serializado && (
                                            <div className='w-24'>
                                                <Input
                                                    name={`ingreso_${item.item_id}`}
                                                    type='number'
                                                    min={1}
                                                    value={item.cantidad}
                                                    onChange={(e) =>
                                                        handleCambiarCantidadExterna(
                                                            item.item_id,
                                                            Number(e.target.value),
                                                        )
                                                    }
                                                />
                                            </div>
                                        )}
                                        <Button
                                            size='sm'
                                            icon='HeroTrash'
                                            color='red'
                                            onClick={() =>
                                                handleQuitarIngresoExterno(item.item_id)
                                            }
                                        />
                                    </div>
                                    <div className='mt-2 flex flex-wrap items-center gap-3'>
                                        <label className='flex cursor-pointer items-center gap-2 text-xs text-gray-600 dark:text-gray-400'>
                                            <Checkbox
                                                id={`serializado_${item.item_id}`}
                                                name={`serializado_${item.item_id}`}
                                                checked={item.es_serializado}
                                                onChange={(e) =>
                                                    handleToggleSerializado(
                                                        item.item_id,
                                                        e.target.checked,
                                                    )
                                                }
                                            />
                                            <span>Tiene número de serie</span>
                                        </label>
                                        {item.es_serializado && (
                                            <div className='flex-1'>
                                                <Input
                                                    name={`serie_ext_${item.item_id}`}
                                                    placeholder='Ingresar número de serie...'
                                                    value={item.numero_serie}
                                                    onChange={(e) =>
                                                        handleCambiarSerieExterna(
                                                            item.item_id,
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </ModalBody>
            <ModalFooter>
                <Button onClick={handleClose} isDisable={isLoading}>
                    Cancelar
                </Button>
                <Button
                    variant='solid'
                    color='emerald'
                    isLoading={isLoading}
                    isDisable={!bodegaId || (!cotizacionId && !hayItems)}
                    onClick={() => {
                        void handleConfirmar();
                    }}>
                    {hayItems ? 'Crear Guia de Salida' : 'Crear Guia Vacia'}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default CrearGuiaRapidaOTV3;
