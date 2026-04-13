import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import type { ICotizacion } from '@/interface/cotizaciones.interface';
import CrearCotizacion from '@/pages/Cotizaciones/modals/CrearCotizacion';
import CrearItemCotizacion from '@/pages/Cotizaciones/modals/CrearItemCotizacion';
import ApiService from '@/services/ApiService';
import { listaCotizacionesThunk, useAppDispatch, useAppSelector } from '@/store';
import { useGetBodegasQuery } from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import type { Dispatch, SetStateAction } from 'react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

type EntityType = 'servicio-general' | 'detalle-trabajo' | 'orden-trabajo';

type ItemResumen = {
    id: number;
    item_id: number | null;
    item_nombre: string;
    cantidad_pedida: number;
    cantidad_recibida: number;
};

interface VincularCotizacionProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    entityType: EntityType;
    entityId: number;
    ordenId: number;
    entityName?: string;
    onSuccess?: () => void;
    clienteId?: number;
}

const VincularCotizacion = ({
    isOpen,
    setIsOpen,
    entityType,
    entityId,
    ordenId,
    entityName = 'Servicio',
    onSuccess,
    clienteId,
}: VincularCotizacionProps) => {
    const dispatch = useAppDispatch();
    const { listaCotizaciones } = useAppSelector((state) => state.cotizacion);
    const { data: listaBodegas = [] } = useGetBodegasQuery(undefined, {
        skip: !isOpen || entityType !== 'orden-trabajo',
    });

    const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
    const [bodegaId, setBodegaId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const isOrdenTrabajo = entityType === 'orden-trabajo';
    const [cotizacionesOt, setCotizacionesOt] = useState<ICotizacion[]>([]);
    const [loadingCotizacionesOt, setLoadingCotizacionesOt] = useState(false);
    const [itemsResumen, setItemsResumen] = useState<Record<string, ItemResumen[]>>({});
    const [loadingItemsResumen, setLoadingItemsResumen] = useState(false);

    const cotizacionesDisponibles = useMemo(() => {
        const base = isOrdenTrabajo ? cotizacionesOt : listaCotizaciones;
        if (!base) return [];
        if (!isOrdenTrabajo) return base;
        return base.filter((cotizacion) => {
            if (cotizacion.estado !== 'aceptada') return false;
            if (clienteId && cotizacion.cliente !== clienteId) return false;
            return true;
        });
    }, [clienteId, cotizacionesOt, isOrdenTrabajo, listaCotizaciones]);

    const cotizacionOptions = useMemo(
        () =>
            cotizacionesDisponibles.map((cotizacion) => ({
                value: cotizacion.id.toString(),
                label: `N°${cotizacion.numero_cotizacion} - ${cotizacion.nombre} (${cotizacion.cliente_nombre})`,
            })),
        [cotizacionesDisponibles],
    );

    const selectedOptions = useMemo(() => {
        if (!selectedQuoteIds.length) return [];
        return cotizacionOptions.filter((opt) => selectedQuoteIds.includes(opt.value));
    }, [cotizacionOptions, selectedQuoteIds]);

    const selectedCotizaciones = useMemo(
        () => cotizacionesDisponibles.filter((c) => selectedQuoteIds.includes(c.id.toString())),
        [cotizacionesDisponibles, selectedQuoteIds],
    );

    const requiereBodegaManual =
        isOrdenTrabajo && selectedCotizaciones.some((cot) => (cot.oc_count ?? 0) === 0);

    const bodegasOptions: TSelectOption[] = useMemo(
        () =>
            listaBodegas.map((b) => ({
                value: b.id.toString(),
                label: b.nombre,
            })),
        [listaBodegas],
    );

    const getEntityEndpoint = () => {
        if (entityType === 'servicio-general') {
            return `/api/ordenes-de-trabajo/${ordenId}/servicios-generales/${entityId}/`;
        }
        return `/api/ordenes-de-trabajo/${ordenId}/detalles-trabajo/${entityId}/`;
    };

    useEffect(() => {
        if (isOpen) {
            setSelectedQuoteIds([]);
            setBodegaId(null);
            if (isOrdenTrabajo) {
                setLoadingCotizacionesOt(true);
                ApiService.fetchData<ICotizacion[]>({
                    url: `/api/ordenes-de-trabajo/${ordenId}/cotizaciones-elegibles/`,
                    method: 'get',
                })
                    .then((response) => {
                        setCotizacionesOt(response.data ?? []);
                    })
                    .catch((error: unknown) => {
                        toast.error(
                            getErrorMessage(error) || 'Error al cargar cotizaciones elegibles',
                        );
                        setCotizacionesOt([]);
                    })
                    .finally(() => setLoadingCotizacionesOt(false));
            } else {
                dispatch(listaCotizacionesThunk());
            }
        } else {
            setSelectedQuoteIds([]);
            setBodegaId(null);
        }
    }, [dispatch, isOpen, isOrdenTrabajo, ordenId]);

    useEffect(() => {
        if (!selectedQuoteIds.length) {
            setItemsResumen({});
            return;
        }
        setLoadingItemsResumen(true);
        Promise.all(
            selectedQuoteIds.map((id) =>
                ApiService.fetchData<ItemResumen[]>({
                    url: `/api/cotizaciones/${id}/items-resumen/`,
                    method: 'get',
                }).then((response) => ({ id, data: response.data ?? [] })),
            ),
        )
            .then((responses) => {
                const mapped: Record<string, ItemResumen[]> = {};
                responses.forEach((resp) => {
                    mapped[resp.id] = resp.data;
                });
                setItemsResumen(mapped);
            })
            .catch((error: unknown) => {
                toast.error(getErrorMessage(error) || 'Error al cargar resumen de items');
            })
            .finally(() => setLoadingItemsResumen(false));
    }, [selectedQuoteIds]);

    useEffect(() => {
        if (!requiereBodegaManual) {
            setBodegaId(null);
        }
    }, [requiereBodegaManual]);

    const handleVincular = async () => {
        if (!selectedQuoteIds.length) {
            toast.error('Debe seleccionar una cotización');
            return;
        }
        if (requiereBodegaManual && !bodegaId) {
            toast.error('Debes seleccionar una bodega para crear la guía manual');
            return;
        }

        setIsLoading(true);
        try {
            const response = await ApiService.fetchData({
                url: isOrdenTrabajo
                    ? `/api/ordenes-de-trabajo/${ordenId}/vincular-cotizaciones-generar-guias/`
                    : getEntityEndpoint(),
                method: isOrdenTrabajo ? 'POST' : 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                data: isOrdenTrabajo
                    ? {
                          cotizaciones_ids: selectedQuoteIds.map((id) => parseInt(id)),
                          ...(bodegaId ? { bodega_id: parseInt(bodegaId) } : {}),
                      }
                    : JSON.stringify({ cotizacion: parseInt(selectedQuoteIds[0]) }),
            });

            if (response.data) {
                toast.success('Cotización vinculada correctamente');
                onSuccess?.();
                setIsOpen(false);
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error) || 'Error al vincular la cotización');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' isStaticBackdrop={true}>
            <ModalHeader>
                <Badge className='text-xl'>Vincular Cotización - {entityName}</Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-6'>
                    <div className='grid grid-cols-12 items-end gap-4'>
                        <div className='col-span-10'>
                            <Badge>Seleccionar Cotización</Badge>
                            <SelectReact
                                name='cotizacion'
                                options={cotizacionOptions}
                                value={isOrdenTrabajo ? selectedOptions : (selectedOptions[0] ?? null)}
                                onChange={(option) => {
                                    if (Array.isArray(option)) {
                                        setSelectedQuoteIds(
                                            (option as TSelectOption[]).map((opt) => opt.value),
                                        );
                                        return;
                                    }
                                    const selected = option as TSelectOption | null;
                                    setSelectedQuoteIds(selected?.value ? [selected.value] : []);
                                }}
                                placeholder='Buscar cotización...'
                                isClearable
                                isMulti={isOrdenTrabajo}
                                isLoading={isOrdenTrabajo && loadingCotizacionesOt}
                                noOptionsMessage={() => (
                                    <span className='text-xs'>
                                        {isOrdenTrabajo
                                            ? 'No hay cotizaciones elegibles para generar guías.'
                                            : 'No hay cotizaciones disponibles.'}
                                    </span>
                                )}
                            />
                        </div>
                        {!isOrdenTrabajo && (
                            <div className='col-span-2 flex justify-end'>
                                <CrearCotizacion
                                    empresa={false}
                                    onSuccess={(newQuote) => {
                                        setSelectedQuoteIds([newQuote.id.toString()]);
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {requiereBodegaManual && (
                        <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-900/20'>
                            <div className='mb-3'>
                                <p className='text-sm font-medium text-amber-800 dark:text-amber-200'>
                                    Hay cotizaciones seleccionadas sin OCs.
                                </p>
                                <p className='text-sm text-amber-700 dark:text-amber-300'>
                                    Selecciona una bodega para crear igualmente la guía manual
                                    asociada a esas cotizaciones.
                                </p>
                            </div>
                            <div className='max-w-md'>
                                <SelectReact
                                    name='bodega_manual'
                                    options={bodegasOptions}
                                    value={bodegasOptions.find((o) => o.value === bodegaId) ?? null}
                                    onChange={(option) =>
                                        setBodegaId(
                                            option ? (option as TSelectOption).value : null,
                                        )
                                    }
                                    placeholder='Selecciona una bodega...'
                                    isClearable
                                />
                            </div>
                        </div>
                    )}

                    {selectedQuoteIds.length > 0 && (
                        <div className='flex flex-col gap-3 border-t pt-4'>
                            <div className='flex items-center justify-between'>
                                <Badge>Detalle de cotizaciones</Badge>
                                <div className='flex items-center gap-3'>
                                    <span className='text-sm text-gray-500 dark:text-gray-300'>
                                        {selectedQuoteIds.length} cotizaciones
                                    </span>
                                    {loadingItemsResumen && (
                                        <span className='text-xs text-gray-400 dark:text-gray-300'>
                                            Actualizando...
                                        </span>
                                    )}
                                    {!isOrdenTrabajo && selectedCotizaciones[0] && (
                                        <CrearItemCotizacion
                                            cotizacion={selectedCotizaciones[0]}
                                            items={[]}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className='w-full overflow-auto rounded-lg border border-gray-200 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900'>
                                <table className='min-w-full divide-y divide-gray-200 dark:divide-zinc-700'>
                                    <thead className='bg-gray-100 dark:bg-zinc-800'>
                                        <tr>
                                            <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300'>
                                                Item
                                            </th>
                                            <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300'>
                                                Cant. pedida
                                            </th>
                                            <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300'>
                                                Cant. recibida
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className='divide-y divide-gray-200 bg-white dark:divide-zinc-700 dark:bg-zinc-800'>
                                        {selectedCotizaciones.map((cot) => {
                                            const items = itemsResumen[cot.id.toString()] ?? [];
                                            const totalPedido = items.reduce(
                                                (sum, item) => sum + (item.cantidad_pedida || 0),
                                                0,
                                            );
                                            const totalRecibido = items.reduce(
                                                (sum, item) => sum + (item.cantidad_recibida || 0),
                                                0,
                                            );
                                            const sinOcs = (cot.oc_count ?? 0) === 0;
                                            return (
                                                <Fragment key={cot.id}>
                                                    <tr className='bg-blue-50'>
                                                        <td
                                                            className='px-4 py-3 text-sm font-semibold text-slate-800'
                                                            colSpan={3}>
                                                            N°{cot.numero_cotizacion} - {cot.nombre}{' '}
                                                            · Pedido {totalPedido} · Recibido{' '}
                                                            {totalRecibido} · OCs{' '}
                                                            {cot.oc_recibidas_count ?? 0}/
                                                            {cot.oc_count ?? 0} · Guías{' '}
                                                            {cot.guias_count ?? 0}
                                                        </td>
                                                    </tr>
                                                    {sinOcs && (
                                                        <tr>
                                                            <td
                                                                className='px-4 py-3 text-sm text-amber-700 dark:text-amber-300'
                                                                colSpan={3}>
                                                                Esta cotización no tiene OCs. Se
                                                                creará una guía manual si completas
                                                                la vinculación con bodega.
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {items.length ? (
                                                        items.map((item) => (
                                                            <tr key={`${cot.id}-${item.id}`}>
                                                                <td className='px-4 py-3 text-sm text-gray-900 dark:text-gray-100'>
                                                                    {item.item_nombre}
                                                                </td>
                                                                <td className='px-4 py-3 text-sm text-gray-900 dark:text-gray-100'>
                                                                    {item.cantidad_pedida}
                                                                </td>
                                                                <td className='px-4 py-3 text-sm text-gray-900 dark:text-gray-100'>
                                                                    {item.cantidad_recibida}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td
                                                                className='px-4 py-3 text-sm text-gray-500 dark:text-gray-300'
                                                                colSpan={3}>
                                                                Sin items para mostrar.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Button color='red' onClick={() => setIsOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        onClick={handleVincular}
                        isLoading={isLoading}
                        isDisable={!selectedQuoteIds.length || (requiereBodegaManual && !bodegaId)}>
                        Vincular
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

export default VincularCotizacion;
