import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { CATEGORIAS_SERVICIO } from '@/constants/contrato.constant';
import { IPlanServicio, IServicio } from '@/interface/contrato.interface';
import { useGetPlanesServicioQuery, useGetServiciosQuery } from '@/store/slices/contratos/contratoApi';
import { useGetTipoCambioQuery } from '@/store/slices/cotizaciones/cotizacionApi';
import { convertCurrency, formatPrice } from '@/utils/currency';
import classNames from 'classnames';
import { useMemo, useState } from 'react';
import { ISelectorPlanServiciosProps, IServicioSeleccionado } from './contrato.types';

const normalizeCurrency = (currency?: string | null): 'CLP' | 'USD' | 'UF' => {
    if (currency === '1' || currency === 'USD') return 'USD';
    if (currency === '3' || currency === 'UF') return 'UF';
    return 'CLP';
};

const formatCurrencyByMoneda = (
    value: number | string | undefined | null,
    currency?: string | null,
): string => {
    const normalized = normalizeCurrency(currency);
    if (normalized === 'USD') {
        return `${formatPrice(value, 1, 1)} USD`;
    }
    if (normalized === 'UF') {
        return `${formatPrice(value, 2, 2)} UF`;
    }

    return `${formatPrice(value, 0, 0)} CLP`;
};

// ── Opción especial para modo personalizado ──
const PERSONALIZADO_VALUE = '__personalizado__';

const SelectorPlanServicios = ({
    value,
    onChange,
    contractCurrency,
    contractPaymentMode,
    hidePlanInputs = false,
    hideVisitasSection = false,
}: ISelectorPlanServiciosProps) => {
    const { data: planes = [] } = useGetPlanesServicioQuery();
    const { data: servicios = [] } = useGetServiciosQuery();
    const [categoriasColapsadas, setCategoriasColapsadas] = useState<Set<string>>(new Set());

    const [serviciosModalOpen, setServiciosModalOpen] = useState(false);
    const [planesModalOpen, setPlanesModalOpen] = useState(false);

    // ── Estado de búsqueda y filtros del modal de servicios ──
    const [busquedaServicios, setBusquedaServicios] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<'todos' | 'seleccionado' | 'disponible'>('todos');
    const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);

    const cerrarModalServicios = () => {
        setServiciosModalOpen(false);
        setBusquedaServicios('');
        setFiltroEstado('todos');
        setFiltroCategoria(null);
    };

    const fechaTipoCambio = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const { data: tipoCambio } = useGetTipoCambioQuery(fechaTipoCambio, {
        skip: !contractCurrency,
    });

    // ── Plan seleccionado actual ──
    const planSeleccionado: IPlanServicio | undefined = useMemo(
        () => (value.plan_id ? planes.find((p) => p.id === value.plan_id) : undefined),
        [planes, value.plan_id],
    );

    // ── IDs de servicios incluidos en el plan seleccionado ──
    const serviciosIncluidosIds: Set<number> = useMemo(
        () => new Set(planSeleccionado?.servicios.map((s) => s.id) ?? []),
        [planSeleccionado],
    );

    // ── Servicios agrupados por categoría ──
    const serviciosPorCategoria: { categoria: string; label: string; items: IServicio[] }[] =
        useMemo(() => {
            const mapa = new Map<string, IServicio[]>();
            servicios.forEach((s) => {
                const lista = mapa.get(s.categoria) ?? [];
                lista.push(s);
                mapa.set(s.categoria, lista);
            });

            return CATEGORIAS_SERVICIO.filter((cat) => mapa.has(cat.value)).map((cat) => ({
                categoria: cat.value,
                label: cat.label,
                items: mapa.get(cat.value) ?? [],
            }));
        }, [servicios]);

    // ── Handlers ──

    const parsePrecio = (precio?: string | number | null) => {
        if (precio == null) return 0;
        if (typeof precio === 'number') return precio;
        const parsed = Number(String(precio).replace(/[^0-9.-]+/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const getPlanCantidadPorModoPago = (
        modoPago?: 'mensual' | 'anual' | 'pago_unico',
    ): number => {
        if (modoPago === 'anual') return 12;
        return 1;
    };

    const handleCambioPlan = (planValue: string) => {
        if (planValue === PERSONALIZADO_VALUE) {
            onChange({
                modo: 'personalizado',
                plan_id: null,
                plan_cantidad: 1,
                plan_precio_unitario: 0,
                plan_precio_unitario_anual: null,
                servicios: value.servicios,
            });
            return;
        }

        const nuevoPlanId = Number(planValue);
        const nuevoPlan = planes.find((p) => p.id === nuevoPlanId);
        const idsNuevoPlan = new Set(nuevoPlan?.servicios.map((s) => s.id) ?? []);

        // Quitar addons que ahora están incluidos en el nuevo plan
        const addonsRestantes = value.servicios.filter((a) => !idsNuevoPlan.has(a.servicio_id));

        onChange({
            modo: 'plan',
            plan_id: nuevoPlanId,
            plan_cantidad: value.plan_cantidad || 1,
            plan_precio_unitario: parsePrecio(nuevoPlan?.precio),
            plan_precio_unitario_anual: nuevoPlan?.precio_anual
                ? parsePrecio(nuevoPlan.precio_anual)
                : null,
            plan_num_visitas_mensuales: nuevoPlan?.num_visitas_mensuales ?? null,
            servicios: addonsRestantes,
        });
    };

    const toggleServicio = (servicioId: number) => {
        const existe = value.servicios.find((s) => s.servicio_id === servicioId);
        if (existe) {
            onChange({
                ...value,
                servicios: value.servicios.filter((s) => s.servicio_id !== servicioId),
            });
        } else {
            const servicio = servicios.find((item) => item.id === servicioId);
            onChange({
                ...value,
                servicios: [
                    ...value.servicios,
                    {
                        servicio_id: servicioId,
                        cantidad: 1,
                        precio_unitario: parsePrecio(servicio?.precio),
                    },
                ],
            });
        }
    };

    const actualizarServicio = (servicioId: number, campo: keyof IServicioSeleccionado, valor: number) => {
        onChange({
            ...value,
            servicios: value.servicios.map((s) =>
                s.servicio_id === servicioId ? { ...s, [campo]: valor } : s,
            ),
        });
    };

    const eliminarServicio = (servicioId: number) => {
        onChange({
            ...value,
            servicios: value.servicios.filter((s) => s.servicio_id !== servicioId),
        });
    };

    // ── Helpers de estado por servicio ──

    // 'incluido' = del plan (inmutable) | 'seleccionado' = elegido por usuario (ambos modos) | 'disponible' = no seleccionado
    const getEstadoServicio = (servicioId: number): 'incluido' | 'seleccionado' | 'disponible' => {
        if (serviciosIncluidosIds.has(servicioId)) return 'incluido';
        if (value.servicios.some((s) => s.servicio_id === servicioId)) return 'seleccionado';
        return 'disponible';
    };

    const getServicioOrden = (servicioId: number) => {
        const estado = getEstadoServicio(servicioId);
        const orden = { incluido: 0, seleccionado: 1, disponible: 2 } as const;
        return orden[estado];
    };

    // ── Cálculo de total ──

    const getPrecioPlanUnitario = () => {
        if (value.plan_precio_unitario > 0) return value.plan_precio_unitario;
        return parsePrecio(planSeleccionado?.precio);
    };

    const getPrecioServicioSeleccionado = (servicioId: number, precioUnitario: number) => {
        if (precioUnitario > 0) return precioUnitario;
        const servicio = servicios.find((item) => item.id === servicioId);
        return parsePrecio(servicio?.precio);
    };

    const planVisitasIncluidas = value.plan_num_visitas_mensuales ?? planSeleccionado?.num_visitas_mensuales ?? 0;

    const planCantidadParaMostrar = contractPaymentMode
        ? getPlanCantidadPorModoPago(contractPaymentMode)
        : value.plan_cantidad;
    const cantidadPorModoPago = contractPaymentMode
        ? getPlanCantidadPorModoPago(contractPaymentMode)
        : 1;
    const planSubtotal = value.plan_cantidad * getPrecioPlanUnitario();
    const totalPlan = value.modo === 'plan' ? planSubtotal * cantidadPorModoPago : 0;
    const totalAddonsBase = value.servicios.reduce((sum, s) => {
        const precioServicio = getPrecioServicioSeleccionado(s.servicio_id, s.precio_unitario);
        return sum + s.cantidad * precioServicio;
    }, 0);
    const totalAddons = totalAddonsBase * cantidadPorModoPago;
    const totalGeneral = totalPlan + totalAddons;

    const totalPlanConvertido = value.modo === 'plan'
        ? convertCurrency(totalPlan, planSeleccionado?.tipo_moneda, contractCurrency, tipoCambio)
        : 0;
    const totalAddonsConvertidos = value.servicios.reduce((sum, s) => {
        const servicio = servicios.find((item) => item.id === s.servicio_id);
        const precioServicio = getPrecioServicioSeleccionado(s.servicio_id, s.precio_unitario);
        const subtotal = s.cantidad * precioServicio * cantidadPorModoPago;
        return sum + convertCurrency(subtotal, servicio?.tipo_moneda, contractCurrency, tipoCambio);
    }, 0);
    const totalGeneralConvertido = totalPlanConvertido + totalAddonsConvertidos;

    return (
        <div className='flex flex-col gap-4'>
            {/* ── Zona A: Selector de Plan ── */}
            <div className='space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60'>
                <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                        <h3 className='text-sm font-semibold text-zinc-700 dark:text-zinc-300'>
                            Plan de servicio
                        </h3>
                        <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                            {value.plan_id
                                ? planSeleccionado?.nombre ?? 'Plan seleccionado'
                                : value.modo === 'personalizado'
                                ? 'Sin plan — solo servicios individuales'
                                : 'Ningún plan seleccionado'}
                        </p>
                    </div>
                    <div className='flex items-center gap-2'>
                        {(value.plan_id || value.modo === 'personalizado') && (
                            <Button
                                size='sm'
                                variant='default'
                                onClick={() =>
                                    onChange({
                                        modo: 'plan',
                                        plan_id: null,
                                        plan_cantidad: 1,
                                        plan_precio_unitario: 0,
                                        plan_precio_unitario_anual: null,
                                        servicios: [],
                                    })
                                }>
                                Limpiar
                            </Button>
                        )}
                        <Button
                            variant='outline'
                            color='blue'
                            onClick={() => setPlanesModalOpen(true)}>
                            {!value.plan_id && value.modo !== 'personalizado'
                                ? 'Seleccionar'
                                : 'Cambiar'}
                        </Button>
                    </div>
                </div>
                {value.modo === 'plan' && !value.plan_id && (
                    <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                        Selecciona un plan o elige "Sin plan" para agregar servicios individuales.
                    </p>
                )}
                {planSeleccionado && (
                    <div className='rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950'>
                        <div className='border-b border-zinc-200 px-4 py-3 dark:border-zinc-700'>
                            <div className='flex items-center justify-between gap-4'>
                                <div className='min-w-0'>
                                    <p className='text-xs text-zinc-500 dark:text-zinc-400'>Plan de servicio</p>
                                    <h3 className='text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                                        {planSeleccionado.nombre}
                                    </h3>
                                    <p className='mt-0.5 text-sm text-zinc-500 dark:text-zinc-400'>
                                        {planSeleccionado.descripcion || 'Sin descripción'}
                                    </p>
                                    <p className='mt-2 text-sm text-zinc-500 dark:text-zinc-400'>
                                        Visitas incluidas: {planVisitasIncluidas} / mes
                                    </p>
                                </div>
                                <div className='flex-shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-right dark:border-zinc-700 dark:bg-zinc-900'>
                                    <p className='text-xs text-zinc-500 dark:text-zinc-400'>Precio</p>
                                    <div className='text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                                        {planSeleccionado.tipo_moneda && planSeleccionado.precio
                                            ? formatCurrencyByMoneda(planSeleccionado.precio, planSeleccionado.tipo_moneda)
                                            : 'Sin precio'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className='px-4 py-3'>
                            <div className='rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900'>
                                <div className='flex items-center justify-between gap-3'>
                                    <div>
                                        <p className='text-xs font-semibold text-zinc-500 dark:text-zinc-400'>Servicios incluidos</p>
                                        <p className='mt-0.5 text-sm text-zinc-500 dark:text-zinc-400'>{planSeleccionado.servicios.length} servicios</p>
                                    </div>
                                    <Badge color='blue' variant='outline'>Incluido</Badge>
                                </div>
                                <div className='mt-3 flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1'>
                                    {planSeleccionado.servicios.length > 0 ? (
                                        planSeleccionado.servicios.map((service) => (
                                            <Badge
                                                key={service.id}
                                                color='emerald'
                                                variant='outline'
                                                className='text-xs whitespace-normal'>
                                                {service.nombre}
                                            </Badge>
                                        ))
                                    ) : (
                                        <div className='rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'>
                                            Este plan no tiene servicios incluidos.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className='px-4 pb-4'>
                            <div className='rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'>
                                <div className='flex items-center justify-between'>
                                    <span>Precio unitario del plan</span>
                                    <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                        {formatCurrencyByMoneda(getPrecioPlanUnitario(), planSeleccionado?.tipo_moneda)}
                                    </span>
                                </div>
                                <div className='mt-2 flex items-center justify-between'>
                                    <span>Cantidad de planes</span>
                                    <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                        {value.plan_cantidad}
                                    </span>
                                </div>
                                {contractPaymentMode === 'anual' ? (
                                    <>
                                        <div className='mt-2 flex items-center justify-between'>
                                            <span>Total anual del plan</span>
                                            <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                                {formatCurrencyByMoneda(totalPlan, planSeleccionado?.tipo_moneda)}
                                            </span>
                                        </div>
                                        {contractCurrency && (
                                            <div className='mt-2 flex items-center justify-between'>
                                                <span>Total anual ({contractCurrency})</span>
                                                <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                                    {formatCurrencyByMoneda(totalPlanConvertido, contractCurrency)}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className='mt-2 flex items-center justify-between'>
                                            <span>Total mensual del plan</span>
                                            <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                                {formatCurrencyByMoneda(planSubtotal, planSeleccionado?.tipo_moneda)}
                                            </span>
                                        </div>
                                        {contractCurrency && (
                                            <div className='mt-2 flex items-center justify-between'>
                                                <span>Total ({contractCurrency})</span>
                                                <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                                    {formatCurrencyByMoneda(totalPlanConvertido, contractCurrency)}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {value.modo === 'personalizado' && (
                    <p className='mt-1 text-sm text-zinc-500'>
                        Selecciona los servicios que deseas incluir
                    </p>
                )}
            </div>

            {value.servicios.length > 0 && (
                <Card className='border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950 rounded-lg shadow-sm'>
                    <CardHeader className='border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-300'>
                        Servicios agregados
                    </CardHeader>
                    <CardBody className='px-4 py-4'>
                        <div className='space-y-3'>
                            {value.servicios.map((s) => {
                                const servicio = servicios.find((item) => item.id === s.servicio_id);
                                const precioServicio = getPrecioServicioSeleccionado(s.servicio_id, s.precio_unitario);
                                const subtotalServicio = s.cantidad * precioServicio;
                                const totalServicio = subtotalServicio * cantidadPorModoPago;

                                return (
                                    <div key={s.servicio_id} className='rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900'>
                                        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                                            <div>
                                                <p className='font-medium text-zinc-900 dark:text-zinc-100'>
                                                    {servicio?.nombre ?? `Servicio ${s.servicio_id}`}
                                                </p>
                                                <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                    {s.cantidad} × {formatCurrencyByMoneda(precioServicio, servicio?.tipo_moneda)}
                                                </p>
                                            </div>
                                            <div className='text-right'>
                                                <p className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                    {formatCurrencyByMoneda(subtotalServicio, servicio?.tipo_moneda)}
                                                </p>
                                                {contractPaymentMode === 'anual' && (
                                                    <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                        Total anual: {formatCurrencyByMoneda(totalServicio, servicio?.tipo_moneda)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <div className='rounded-lg border-t border-zinc-200 pt-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300'>
                                <div className='flex items-center justify-between'>
                                    <span>Total servicios</span>
                                    <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                        {formatCurrencyByMoneda(totalAddonsBase, contractCurrency || 'CLP')}
                                    </span>
                                </div>
                                {contractPaymentMode === 'anual' ? (
                                    <>
                                        <div className='mt-2 flex items-center justify-between'>
                                            <span>Total anual</span>
                                            <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                                {formatCurrencyByMoneda(totalAddons, contractCurrency || 'CLP')}
                                            </span>
                                        </div>
                                        {contractCurrency && (
                                            <div className='mt-2 flex items-center justify-between'>
                                                <span>Convertido ({contractCurrency})</span>
                                                <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                                    {formatCurrencyByMoneda(totalAddonsConvertidos, contractCurrency)}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className='mt-2 flex items-center justify-between'>
                                            <span>Total mensual</span>
                                            <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                                {formatCurrencyByMoneda(totalAddonsBase, contractCurrency || 'CLP')}
                                            </span>
                                        </div>
                                        {contractCurrency && (
                                            <div className='mt-2 flex items-center justify-between'>
                                                <span>Convertido ({contractCurrency})</span>
                                                <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                                    {formatCurrencyByMoneda(totalAddonsConvertidos, contractCurrency)}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* ── Precio y cantidad del plan (solo modo plan) ── */}
            {value.modo === 'plan' && value.plan_id && !hidePlanInputs && (
                <div className='grid grid-cols-2 gap-3 lg:grid-cols-3'>
                    <div>
                        <Label htmlFor='plan_cantidad'>Cantidad del plan</Label>
                        <Input
                            id='plan_cantidad'
                            name='plan_cantidad'
                            type='number'
                            min={1}
                            value={value.plan_cantidad}
                            onChange={(e) =>
                                onChange({ ...value, plan_cantidad: Number(e.target.value) || 1 })
                            }
                        />
                    </div>
                    <div>
                        <Label htmlFor='plan_precio'>Precio unitario del plan</Label>
                        <Input
                            id='plan_precio'
                            name='plan_precio'
                            type='number'
                            min={0}
                            value={getPrecioPlanUnitario()}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    plan_precio_unitario: Number(e.target.value) || 0,
                                })
                            }
                        />
                    </div>
                </div>
            )}

            {(value.modo === 'plan' || value.modo === 'personalizado') && !hideVisitasSection && (
                <Card className='mt-3 border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950 rounded-lg shadow-sm'>
                    <CardHeader className='border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-300'>
                        Visitas incluidas / mes
                    </CardHeader>
                    <CardBody className='px-4 py-4'>
                        <div className='grid gap-3'>
                            <Input
                                id='plan_visitas'
                                name='plan_visitas'
                                type='number'
                                min={0}
                                value={value.plan_num_visitas_mensuales ?? planSeleccionado?.num_visitas_mensuales ?? ''}
                                placeholder='0'
                                onChange={(e) =>
                                    onChange({
                                        ...value,
                                        plan_num_visitas_mensuales: e.target.value
                                            ? Number(e.target.value)
                                            : null,
                                    })
                                }
                            />
                            <p className='text-xs text-zinc-400'>
                                {value.plan_id
                                    ? 'Heredado del plan. Personalizable para este contrato.'
                                    : 'Sin plan seleccionado. Ingresa el número de visitas mensuales aquí.'}
                            </p>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* ── Zona B: Servicios — visible solo cuando hay plan activo o modo personalizado ── */}
            {(value.plan_id !== null || value.modo === 'personalizado') && (
                <div className='space-y-4'>
                    <div className='flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60'>
                        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                            <div>
                                <h3 className='text-sm font-semibold text-zinc-700 dark:text-zinc-300'>
                                    {value.modo === 'plan' ? 'Servicios adicionales' : 'Servicios'}
                                </h3>
                                <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                                    {value.modo === 'plan'
                                        ? 'Servicios extra al plan incluidos en el contrato.'
                                        : 'Servicios incluidos en el contrato.'}
                                </p>
                            </div>
                            <Button
                                variant='outline'
                                color='blue'
                                onClick={() => setServiciosModalOpen(true)}>
                                Seleccionar servicios
                            </Button>
                        </div>
                        <div className='rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950'>
                            {value.servicios.length > 0 ? (
                                <div className={classNames('space-y-3', { 'max-h-64 overflow-y-auto pr-1': value.servicios.length >= 2 })}>
                                    {value.servicios.map((s) => {
                                        const servicio = servicios.find((item) => item.id === s.servicio_id);
                                        const precioServicio = getPrecioServicioSeleccionado(s.servicio_id, s.precio_unitario);
                                        const subtotalServicio = s.cantidad * precioServicio;
                                        const totalServicio = subtotalServicio * cantidadPorModoPago;

                                        return (
                                            <div
                                                key={s.servicio_id}
                                                className='rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'>
                                                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                                    <div>
                                                        <div className='font-medium text-zinc-900 dark:text-zinc-100'>
                                                            {servicio?.nombre ?? `Servicio ${s.servicio_id}`}
                                                        </div>
                                                    </div>
                                                    <div className='w-full sm:w-auto'>
                                                        <div className='flex items-center gap-2'>
                                                            <div className='relative flex-1 min-w-0'>
                                                                <Input
                                                                    id={`precio_${s.servicio_id}`}
                                                                    name={`precio_${s.servicio_id}`}
                                                                    type='number'
                                                                    min={0}
                                                                    value={precioServicio}
                                                                    onChange={(e) => actualizarServicio(s.servicio_id, 'precio_unitario', Number(e.target.value) || 0)}
                                                                    className='w-full pr-16'
                                                                />
                                                                <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-zinc-500 dark:text-zinc-400'>
                                                                    {servicio?.tipo_moneda ?? 'CLP'}
                                                                </span>
                                                            </div>
                                                            <Button
                                                                icon='HeroTrash'
                                                                color='red'
                                                                size='xs'
                                                                className='rounded-full p-1.5'
                                                                onClick={() => eliminarServicio(s.servicio_id)}
                                                                aria-label='Eliminar servicio'
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className='mt-3 rounded-lg border-t border-zinc-200 pt-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'>
                                                    {contractPaymentMode === 'anual' ? (
                                                        <div className='flex items-center justify-between'>
                                                            <span>Total anual</span>
                                                            <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                {formatCurrencyByMoneda(totalServicio, servicio?.tipo_moneda)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className='flex items-center justify-between'>
                                                            <span>Total mensual</span>
                                                            <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                                                {formatCurrencyByMoneda(subtotalServicio, servicio?.tipo_moneda)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className='rounded-lg border border-dashed border-zinc-300 p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'>
                                    {value.modo === 'plan'
                                        ? 'No hay servicios adicionales seleccionados.'
                                        : 'No se han seleccionado servicios.'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <Modal
                isStaticBackdrop
                isOpen={planesModalOpen}
                setIsOpen={setPlanesModalOpen}
                size='xl'
                isScrollable={false}
                isCentered>
                <ModalHeader>Seleccionar plan</ModalHeader>
                <ModalBody className='flex h-[80vh] flex-col overflow-hidden p-0'>
                    <div className='min-h-0 flex-1 overflow-y-auto p-4 space-y-3'>
                    {planes.map((plan) => {
                        const isSelected = value.plan_id === plan.id;
                        return (
                            <button
                                key={plan.id}
                                type='button'
                                className={classNames(
                                    'w-full rounded-lg border p-4 text-left transition-all duration-200 cursor-pointer hover:border-blue-500',
                                    {
                                        'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20': isSelected,
                                        'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900': !isSelected,
                                    },
                                )}
                                onClick={() => {
                                    handleCambioPlan(String(plan.id));
                                    setPlanesModalOpen(false);
                                }}>
                                <div className='flex items-center justify-between gap-3'>
                                    <div className='min-w-0'>
                                        <div className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                            {plan.nombre}
                                        </div>
                                        {plan.descripcion && (
                                            <p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
                                                {plan.descripcion}
                                            </p>
                                        )}
                                        <p className='mt-1 text-xs text-zinc-400'>
                                            {plan.servicios.length} servicios incluidos
                                        </p>
                                    </div>
                                    <div className='flex-shrink-0 text-right'>
                                        <div className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                            {plan.precio
                                                ? formatCurrencyByMoneda(plan.precio, plan.tipo_moneda)
                                                : 'Sin precio'}
                                        </div>
                                        {isSelected && (
                                            <Badge color='blue' variant='outline' className='mt-1'>
                                                Seleccionado
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                    <button
                        type='button'
                        className={classNames(
                            'w-full rounded-lg border p-4 text-left transition-all duration-200 cursor-pointer hover:border-blue-500',
                            {
                                'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20': value.modo === 'personalizado',
                                'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900': value.modo !== 'personalizado',
                            },
                        )}
                        onClick={() => {
                            handleCambioPlan(PERSONALIZADO_VALUE);
                            setPlanesModalOpen(false);
                        }}>
                        <div className='flex items-center justify-between gap-3'>
                            <div className='min-w-0'>
                                <div className='font-semibold text-zinc-900 dark:text-zinc-100'>Sin plan — solo servicios</div>
                                <p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
                                    Selecciona servicios individuales sin asociar un plan base.
                                </p>
                            </div>
                            {value.modo === 'personalizado' && (
                                <Badge color='blue' variant='outline'>Seleccionado</Badge>
                            )}
                        </div>
                    </button>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button onClick={() => setPlanesModalOpen(false)}>Cerrar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>

            <Modal
                isStaticBackdrop
                isOpen={serviciosModalOpen}
                setIsOpen={setServiciosModalOpen}
                size='xl'
                isScrollable={false}
                isCentered>
                <ModalHeader>
                    {value.modo === 'plan' && planSeleccionado
                        ? `Servicios adicionales — ${planSeleccionado.nombre}`
                        : 'Seleccionar servicios'}
                </ModalHeader>
                <ModalBody className='flex h-[80vh] flex-col overflow-hidden p-0'>
                    {/* Header fijo: leyenda + buscador + filtros */}
                    <div className='flex-shrink-0 border-b border-zinc-200 bg-zinc-50 px-4 pb-3 pt-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                        {/* Leyenda */}
                        <div className='flex flex-wrap items-center gap-3'>
                            {value.modo === 'plan' && planSeleccionado ? (
                                <span className='text-xs text-zinc-500 dark:text-zinc-400'>
                                    Los servicios incluidos en <strong>{planSeleccionado.nombre}</strong> no aparecen aquí.
                                </span>
                            ) : (
                                <span className='text-xs font-semibold text-zinc-500'>Leyenda:</span>
                            )}
                            <span className='flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400'>
                                <Badge color='emerald' variant='outline'>Seleccionado</Badge>
                                Incluido en el contrato
                            </span>
                            <span className='flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400'>
                                <Badge color='zinc' variant='outline'>Disponible</Badge>
                                No seleccionado
                            </span>
                        </div>

                        {/* Buscador */}
                        <div className='relative mt-3'>
                            <Input
                                id='search_servicios'
                                name='search_servicios'
                                placeholder='Buscar servicio por nombre o descripción...'
                                value={busquedaServicios}
                                onChange={(e) => setBusquedaServicios(e.target.value)}
                            />
                            {busquedaServicios && (
                                <button
                                    type='button'
                                    onClick={() => setBusquedaServicios('')}
                                    className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'>
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Filtro de estado */}
                        <div className='mt-2 flex flex-wrap items-center gap-2'>
                            <span className='text-xs text-zinc-500 dark:text-zinc-400'>Estado:</span>
                            {(['todos', 'seleccionado', 'disponible'] as const).map((f) => (
                                <button
                                    key={f}
                                    type='button'
                                    onClick={() => setFiltroEstado(f)}
                                    className={classNames(
                                        'rounded-full px-3 py-0.5 text-xs font-medium transition-colors',
                                        {
                                            'bg-blue-500 text-white': filtroEstado === f,
                                            'bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600':
                                                filtroEstado !== f,
                                        },
                                    )}>
                                    {f === 'todos' ? 'Todos' : f === 'seleccionado' ? 'Seleccionados' : 'Disponibles'}
                                </button>
                            ))}
                        </div>

                        {/* Filtro de categoría */}
                        <div className='mt-2 flex flex-wrap items-center gap-2'>
                            <span className='text-xs text-zinc-500 dark:text-zinc-400'>Categoría:</span>
                            <button
                                type='button'
                                onClick={() => setFiltroCategoria(null)}
                                className={classNames(
                                    'rounded-full px-3 py-0.5 text-xs font-medium transition-colors',
                                    {
                                        'bg-blue-500 text-white': filtroCategoria === null,
                                        'bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600':
                                            filtroCategoria !== null,
                                    },
                                )}>
                                Todas
                            </button>
                            {serviciosPorCategoria
                                .map((grupo) => ({
                                    ...grupo,
                                    items: value.modo === 'plan'
                                        ? grupo.items.filter((s) => !serviciosIncluidosIds.has(s.id))
                                        : grupo.items,
                                }))
                                .filter((grupo) => grupo.items.length > 0)
                                .map((grupo) => (
                                    <button
                                        key={grupo.categoria}
                                        type='button'
                                        onClick={() => setFiltroCategoria(grupo.categoria)}
                                        className={classNames(
                                            'rounded-full px-3 py-0.5 text-xs font-medium transition-colors',
                                            {
                                                'bg-blue-500 text-white': filtroCategoria === grupo.categoria,
                                                'bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600':
                                                    filtroCategoria !== grupo.categoria,
                                            },
                                        )}>
                                        {grupo.label}
                                    </button>
                                ))}
                        </div>
                    </div>
                    {/* Lista de servicios: scrollable */}
                    <div className='min-h-0 flex-1 overflow-y-auto p-4 space-y-4'>
                    {(() => {
                        const busquedaNorm = busquedaServicios.toLowerCase().trim();
                        const grupos = serviciosPorCategoria
                            .map((grupo) => ({
                                ...grupo,
                                items: (value.modo === 'plan'
                                    ? grupo.items.filter((s) => !serviciosIncluidosIds.has(s.id))
                                    : grupo.items
                                )
                                .filter((s) => !busquedaNorm || s.nombre.toLowerCase().includes(busquedaNorm) || (s.descripcion ?? '').toLowerCase().includes(busquedaNorm))
                                .filter((s) => {
                                    if (filtroEstado === 'todos') return true;
                                    return getEstadoServicio(s.id) === filtroEstado;
                                }),
                            }))
                            .filter((grupo) => filtroCategoria === null || grupo.categoria === filtroCategoria)
                            .filter((grupo) => grupo.items.length > 0);

                        if (grupos.length === 0) {
                            return (
                                <div className='flex flex-col items-center justify-center py-16 text-center'>
                                    <div className='mb-2 text-4xl'>🔍</div>
                                    <p className='font-semibold text-zinc-700 dark:text-zinc-300'>Sin resultados</p>
                                    <p className='mt-1 text-sm text-zinc-500'>
                                        No hay servicios que coincidan con los filtros aplicados.
                                    </p>
                                    <button
                                        type='button'
                                        onClick={() => { setBusquedaServicios(''); setFiltroEstado('todos'); setFiltroCategoria(null); }}
                                        className='mt-4 text-sm text-blue-600 hover:underline dark:text-blue-400'>
                                        Limpiar filtros
                                    </button>
                                </div>
                            );
                        }

                        return grupos.map((grupo) => {
                        const serviciosOrdenados = [...grupo.items].sort((a, b) => {
                            const ordenA = getServicioOrden(a.id);
                            const ordenB = getServicioOrden(b.id);
                            if (ordenA !== ordenB) return ordenA - ordenB;
                            return a.nombre.localeCompare(b.nombre);
                        });

                        return (
                            <div key={grupo.categoria}>
                                <div className='mb-3 flex items-center justify-between'>
                                    <div>
                                        <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                                            {grupo.label}
                                        </div>
                                        <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                                            Selecciona servicios para este contrato.
                                        </p>
                                    </div>
                                    <Badge color='zinc' variant='outline'>
                                        {grupo.items.length} servicios
                                    </Badge>
                                </div>
                                <div className='space-y-3'>
                                    {serviciosOrdenados.map((servicio) => {
                                        const estado = getEstadoServicio(servicio.id);
                                        const isSeleccionado = estado === 'seleccionado';
                                        const rowClass = classNames(
                                            'w-full rounded-lg border p-4 text-left transition-all duration-200 cursor-pointer',
                                            {
                                                'border-emerald-400 bg-emerald-50 hover:border-emerald-500 dark:border-emerald-600 dark:bg-emerald-900/20': isSeleccionado,
                                                'border-zinc-200 bg-white hover:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900': !isSeleccionado,
                                            },
                                        );

                                        return (
                                            <button
                                                key={servicio.id}
                                                type='button'
                                                className={rowClass}
                                                onClick={() => toggleServicio(servicio.id)}>
                                                <div className='flex w-full items-start justify-between gap-3'>
                                                    <div className='min-w-0'>
                                                        <div className='font-semibold text-zinc-900 dark:text-zinc-100'>
                                                            {servicio.nombre}
                                                        </div>
                                                        <p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
                                                            {servicio.categoria_label}
                                                        </p>
                                                    </div>
                                                    <Badge
                                                        color={isSeleccionado ? 'emerald' : 'zinc'}
                                                        variant='outline'>
                                                        {isSeleccionado ? 'Seleccionado' : 'Disponible'}
                                                    </Badge>
                                                </div>
                                                {servicio.descripcion && (
                                                    <p className='mt-3 text-sm text-zinc-500 dark:text-zinc-400'>
                                                        {servicio.descripcion}
                                                    </p>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    });
                    })()}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button onClick={cerrarModalServicios}>
                            Cerrar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </div>
    );
};

// ── Sub-componente: Fila de servicio ──

interface IFilaServicioProps {
    servicio: IServicio;
    estado: 'incluido' | 'addon' | 'disponible' | 'no-incluido';
    esSeleccionado: boolean;
    datos: IServicioSeleccionado | undefined;
    modo: 'plan' | 'personalizado';
    onToggle: () => void;
    onCantidadChange: (v: number) => void;
    onPrecioChange: (v: number) => void;
}

const FilaServicio = ({
    servicio,
    estado,
    esSeleccionado,
    datos,
    modo,
    onToggle,
    onCantidadChange,
    onPrecioChange,
}: IFilaServicioProps) => {
    const esEditable = estado === 'addon' || estado === 'disponible';
    const puedeToggle = estado !== 'incluido';

    return (
        <div
            className={classNames(
                'rounded-lg border p-3 transition-all duration-200',
                {
                    // Incluido (obligatorio del plan): azul
                    'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20':
                        estado === 'incluido',
                    // Addon: ámbar
                    'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20':
                        estado === 'addon',
                    // Seleccionado en modo personalizado: emerald
                    'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/20':
                        estado === 'disponible',
                    // No incluido / gris
                    'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50':
                        estado === 'no-incluido',
                },
            )}>
            <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                    {puedeToggle && (
                        <Checkbox
                            checked={esSeleccionado}
                            onChange={onToggle}
                        />
                    )}
                    <div>
                        <span
                            className={classNames('font-medium', {
                                'text-zinc-400 dark:text-zinc-500': estado === 'no-incluido',
                            })}>
                            {servicio.nombre}
                        </span>
                        {servicio.caracteristicas.length > 0 && (
                            <p
                                className={classNames('text-xs', {
                                    'text-zinc-400 dark:text-zinc-500': estado === 'no-incluido',
                                    'text-zinc-500 dark:text-zinc-400': estado !== 'no-incluido',
                                })}>
                                {servicio.caracteristicas.map((c) => c.nombre).join(' · ')}
                            </p>
                        )}
                    </div>
                </div>
                <div>
                    {estado === 'incluido' && (
                        <Tooltip text='Servicio obligatorio incluido en el plan. No se puede deseleccionar.'>
                            <Badge color='blue' variant='outline'>
                                Incluido
                            </Badge>
                        </Tooltip>
                    )}
                    {estado === 'addon' && (
                        <Tooltip text='Servicio extra añadido al plan base.'>
                            <Badge color='amber' variant='outline'>
                                Addon
                            </Badge>
                        </Tooltip>
                    )}
                    {estado === 'disponible' && (
                        <Tooltip text='Servicio seleccionado en modo personalizado.'>
                            <Badge color='emerald' variant='outline'>
                                Seleccionado
                            </Badge>
                        </Tooltip>
                    )}
                    {estado === 'no-incluido' && (
                        <Tooltip text={modo === 'plan' ? 'No incluido en el plan. Puede añadirse como addon.' : 'Haz clic para incluir este servicio.'}>
                            <Badge color='zinc' variant='outline'>
                                {modo === 'plan' ? 'No incluido' : 'Disponible'}
                            </Badge>
                        </Tooltip>
                    )}
                </div>
            </div>

            {/* Inputs de cantidad y precio — visibles siempre cuando el servicio está seleccionado */}
            {esSeleccionado && (
                <div className='mt-2 grid grid-cols-2 gap-3'>
                    <div>
                        <Label htmlFor={`cant-${servicio.id}`} className='text-xs'>Cantidad</Label>
                        <Input
                            id={`cant-${servicio.id}`}
                            name={`cant-${servicio.id}`}
                            type='number'
                            min={1}
                            value={datos?.cantidad ?? 1}
                            disabled={!esEditable}
                            onChange={(e) => esEditable && onCantidadChange(Number(e.target.value) || 1)}
                        />
                    </div>
                    <div>
                        <Label htmlFor={`precio-${servicio.id}`} className='text-xs'>Precio unitario</Label>
                        <Input
                            id={`precio-${servicio.id}`}
                            name={`precio-${servicio.id}`}
                            type='number'
                            min={0}
                            value={datos?.precio_unitario ?? 0}
                            disabled={!esEditable}
                            onChange={(e) => esEditable && onPrecioChange(Number(e.target.value) || 0)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SelectorPlanServicios;
