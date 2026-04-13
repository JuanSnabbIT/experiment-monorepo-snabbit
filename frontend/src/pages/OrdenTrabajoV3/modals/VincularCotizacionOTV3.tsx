import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import type { ICotizacion } from '@/interface/cotizaciones.interface';
import type { ICotizacionResumenOTV3 } from '@/interface/ordenTrabajoV3.interface';
import ApiService from '@/services/ApiService';
import {
    useDesvincularCotizacionV3Mutation,
    useGetCotizacionesDisponiblesV3Query,
    useVincularCotizacionV3Mutation,
} from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

type ItemResumen = {
    id: number;
    item_id: number | null;
    item_nombre: string;
    cantidad_pedida: number;
    cantidad_recibida: number;
};

interface IProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    ordenId: number;
    cotizacionesVinculadas: ICotizacionResumenOTV3[];
}

const VincularCotizacionOTV3 = ({
    isOpen,
    setIsOpen,
    ordenId,
    cotizacionesVinculadas,
}: IProps) => {
    const { data: disponibles = [], isFetching } = useGetCotizacionesDisponiblesV3Query(ordenId, {
        skip: !isOpen,
    });
    const [vincular, { isLoading: loadingVincular }] = useVincularCotizacionV3Mutation();
    const [desvincular, { isLoading: loadingDesvincular }] = useDesvincularCotizacionV3Mutation();
    const isLoading = loadingVincular || loadingDesvincular;

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [itemsResumen, setItemsResumen] = useState<ItemResumen[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    const cotizacionOptions: TSelectOption[] = useMemo(
        () =>
            (disponibles as ICotizacion[]).map((c) => ({
                value: c.id.toString(),
                label: `N°${c.numero_cotizacion} — ${c.nombre} (${c.cliente_nombre})`,
            })),
        [disponibles],
    );

    const selectedCotizacion = useMemo(
        () => (disponibles as ICotizacion[]).find((c) => c.id.toString() === selectedId) ?? null,
        [disponibles, selectedId],
    );

    useEffect(() => {
        if (!isOpen) {
            setSelectedId(null);
            setItemsResumen([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!selectedId) {
            setItemsResumen([]);
            return;
        }
        setLoadingItems(true);
        ApiService.fetchData<ItemResumen[]>({
            url: `/api/cotizaciones/${selectedId}/items-resumen/`,
            method: 'get',
        })
            .then((res) => setItemsResumen(res.data ?? []))
            .catch((err: unknown) => toast.error(getErrorMessage(err)))
            .finally(() => setLoadingItems(false));
    }, [selectedId]);

    const handleVincular = async () => {
        if (!selectedId) return;
        try {
            await vincular({ ordenId, cotizacion_id: parseInt(selectedId) }).unwrap();
            toast.success('Cotizacion vinculada correctamente');
            setSelectedId(null);
            setItemsResumen([]);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleDesvincular = async (cot: ICotizacionResumenOTV3) => {
        try {
            await desvincular({ ordenId, cotizacion_id: cot.id }).unwrap();
            toast.success(`Cotizacion #${cot.numero_cotizacion} desvinculada`);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl' isStaticBackdrop>
            <ModalHeader>
                <Badge className='text-xl'>Cotizaciones de la OT</Badge>
            </ModalHeader>

            <ModalBody>
                <div className='flex flex-col gap-6'>
                    {cotizacionesVinculadas.length > 0 && (
                        <div className='flex flex-col gap-2'>
                            <p className='text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                                Vinculadas
                            </p>
                            {cotizacionesVinculadas.map((cot) => (
                                <div
                                    key={cot.id}
                                    className='flex items-start justify-between gap-4 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/10'>
                                    <div className='flex flex-col gap-1'>
                                        <p className='font-semibold text-blue-800 dark:text-blue-300'>
                                            N°{cot.numero_cotizacion} — {cot.nombre}
                                        </p>
                                        <p className='text-sm text-blue-600 dark:text-blue-400'>
                                            Total estimado: $
                                            {parseFloat(cot.total_estimado).toLocaleString('es-CL')}
                                        </p>
                                        <div className='mt-1 flex flex-wrap gap-1'>
                                            <Badge color='emerald'>Vinculada</Badge>
                                            {cot.tiene_equipos && (
                                                <Tooltip text='Esta cotizacion incluye items marcados como equipo'>
                                                    <Badge color='violet'>Equipos</Badge>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        size='sm'
                                        color='red'
                                        icon='HeroXMark'
                                        isLoading={isLoading}
                                        onClick={() => handleDesvincular(cot)}>
                                        Desvincular
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={cotizacionesVinculadas.length > 0 ? 'border-t pt-4' : ''}>
                        <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                            {cotizacionesVinculadas.length > 0
                                ? 'Agregar otra cotizacion'
                                : 'Seleccionar cotizacion'}
                        </p>
                        <SelectReact
                            name='cotizacion'
                            options={cotizacionOptions}
                            value={cotizacionOptions.find((o) => o.value === selectedId) ?? null}
                            onChange={(option) => {
                                const sel = option as TSelectOption | null;
                                setSelectedId(sel?.value ?? null);
                            }}
                            placeholder='Buscar cotizacion...'
                            isClearable
                            isLoading={isFetching}
                            noOptionsMessage={() => (
                                <span className='text-xs'>
                                    No hay cotizaciones aceptadas disponibles para este cliente.
                                </span>
                            )}
                        />
                    </div>

                    {selectedCotizacion && (
                        <div className='flex flex-col gap-3 border-t pt-4'>
                            <div className='flex items-center justify-between'>
                                <Badge>Detalle de cotizacion</Badge>
                                {loadingItems && (
                                    <span className='text-xs text-gray-400'>Cargando...</span>
                                )}
                            </div>
                            <div className='overflow-auto rounded-lg border border-gray-200 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900'>
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
                                        <tr className='bg-blue-50 dark:bg-blue-900/20'>
                                            <td
                                                className='px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200'
                                                colSpan={3}>
                                                N°{selectedCotizacion.numero_cotizacion} —{' '}
                                                {selectedCotizacion.nombre} · Pedido{' '}
                                                {itemsResumen.reduce(
                                                    (s, i) => s + (i.cantidad_pedida || 0),
                                                    0,
                                                )}{' '}
                                                · Recibido{' '}
                                                {itemsResumen.reduce(
                                                    (s, i) => s + (i.cantidad_recibida || 0),
                                                    0,
                                                )}{' '}
                                                · Guías {selectedCotizacion.guias_count ?? 0}
                                            </td>
                                        </tr>
                                        {(selectedCotizacion.oc_count ?? 0) === 0 && (
                                            <tr>
                                                <td
                                                    className='px-4 py-3 text-sm text-amber-700 dark:text-amber-300'
                                                    colSpan={3}>
                                                    Sin OCs asociadas: al vincular podrás crear una
                                                    guía manual para esta cotización desde la OT.
                                                </td>
                                            </tr>
                                        )}
                                        {itemsResumen.length ? (
                                            itemsResumen.map((item) => (
                                                <tr key={item.id}>
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
                                                    className='px-4 py-3 text-sm text-gray-500 dark:text-gray-400'
                                                    colSpan={3}>
                                                    Sin items para mostrar.
                                                </td>
                                            </tr>
                                        )}
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
                        Cerrar
                    </Button>
                    <Button
                        variant='solid'
                        onClick={handleVincular}
                        isLoading={isLoading}
                        isDisable={!selectedId}>
                        Vincular
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

export default VincularCotizacionOTV3;
