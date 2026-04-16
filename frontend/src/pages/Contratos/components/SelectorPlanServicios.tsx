import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Tooltip from '@/components/ui/Tooltip';
import { CATEGORIAS_SERVICIO } from '@/constants/contrato.constant';
import { IPlanServicio, IServicio } from '@/interface/contrato.interface';
import { useGetPlanesServicioQuery, useGetServiciosQuery } from '@/store/slices/contratos/contratoApi';
import classNames from 'classnames';
import { useMemo, useState } from 'react';
import { ISelectorPlanServiciosProps, IServicioSeleccionado } from './contrato.types';

// ── Opción especial para modo personalizado ──
const PERSONALIZADO_VALUE = '__personalizado__';

const SelectorPlanServicios = ({ value, onChange }: ISelectorPlanServiciosProps) => {
    const { data: planes = [] } = useGetPlanesServicioQuery();
    const { data: servicios = [] } = useGetServiciosQuery();
    const [categoriasColapsadas, setCategoriasColapsadas] = useState<Set<string>>(new Set());

    // ── Opciones del select de plan ──
    const opcionesPlan: TSelectOption[] = useMemo(
        () => [
            ...planes.map((p) => ({ value: String(p.id), label: p.nombre })),
            { value: PERSONALIZADO_VALUE, label: 'Personalizado' },
        ],
        [planes],
    );

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

    const handleCambioPlan = (opcion: TSelectOption | null) => {
        if (!opcion) return;

        if (opcion.value === PERSONALIZADO_VALUE) {
            onChange({
                modo: 'personalizado',
                plan_id: null,
                plan_cantidad: 1,
                plan_precio_unitario: 0,
                servicios: value.servicios,
            });
            return;
        }

        const nuevoPlanId = Number(opcion.value);
        const nuevoPlan = planes.find((p) => p.id === nuevoPlanId);
        const idsNuevoPlan = new Set(nuevoPlan?.servicios.map((s) => s.id) ?? []);

        // Quitar addons que ahora están incluidos en el nuevo plan
        const addonsRestantes = value.servicios.filter((a) => !idsNuevoPlan.has(a.servicio_id));

        onChange({
            modo: 'plan',
            plan_id: nuevoPlanId,
            plan_cantidad: value.plan_cantidad || 1,
            plan_precio_unitario: value.plan_precio_unitario,
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
            onChange({
                ...value,
                servicios: [...value.servicios, { servicio_id: servicioId, cantidad: 1, precio_unitario: 0 }],
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

    // ── Helpers de estado por servicio ──

    const getEstadoServicio = (servicioId: number): 'incluido' | 'addon' | 'disponible' | 'no-incluido' => {
        if (value.modo === 'personalizado') {
            return value.servicios.some((s) => s.servicio_id === servicioId) ? 'disponible' : 'no-incluido';
        }
        if (serviciosIncluidosIds.has(servicioId)) return 'incluido';
        if (value.servicios.some((s) => s.servicio_id === servicioId)) return 'addon';
        return 'no-incluido';
    };

    // ── Cálculo de total ──

    const totalAddons = value.servicios.reduce((sum, s) => sum + s.cantidad * s.precio_unitario, 0);
    const totalPlan = value.modo === 'plan' ? value.plan_cantidad * value.plan_precio_unitario : 0;
    const totalGeneral = totalPlan + totalAddons;

    // ── Select value actual ──

    const selectValue: TSelectOption | null = useMemo(() => {
        if (value.modo === 'personalizado') {
            return { value: PERSONALIZADO_VALUE, label: 'Personalizado' };
        }
        if (value.plan_id) {
            const plan = planes.find((p) => p.id === value.plan_id);
            return plan ? { value: String(plan.id), label: plan.nombre } : null;
        }
        return null;
    }, [value.modo, value.plan_id, planes]);

    return (
        <div className='flex flex-col gap-4'>
            {/* ── Leyenda de estados ── */}
            <div className='flex flex-wrap gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                <span className='text-xs font-semibold text-zinc-500'>Leyenda:</span>
                <span className='flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400'>
                    <Badge color='blue' variant='outline'>Incluido</Badge>
                    Obligatorio del plan
                </span>
                <span className='flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400'>
                    <Badge color='amber' variant='outline'>Addon</Badge>
                    Extra añadido
                </span>
                <span className='flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400'>
                    <Badge color='emerald' variant='outline'>Seleccionado</Badge>
                    Incluido en modo personalizado
                </span>
                <span className='flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400'>
                    <Badge color='zinc' variant='outline'>Disponible</Badge>
                    No seleccionado
                </span>
            </div>

            {/* ── Zona A: Selector de Plan ── */}
            <div>
                <Label htmlFor='plan_selector'>Plan de servicio</Label>
                <SelectReact
                    name='plan_selector'
                    options={opcionesPlan}
                    value={selectValue}
                    onChange={(e) => handleCambioPlan(e as TSelectOption)}
                    placeholder='Seleccione un plan o "Personalizado"'
                />
                {planSeleccionado && (
                    <p className='mt-1 text-sm text-zinc-500'>{planSeleccionado.descripcion}</p>
                )}
                {value.modo === 'personalizado' && (
                    <p className='mt-1 text-sm text-zinc-500'>
                        Selecciona los servicios que deseas incluir
                    </p>
                )}
            </div>

            {/* ── Precio y cantidad del plan (solo modo plan) ── */}
            {value.modo === 'plan' && value.plan_id && (
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
                            value={value.plan_precio_unitario}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    plan_precio_unitario: Number(e.target.value) || 0,
                                })
                            }
                        />
                    </div>
                    <div>
                        <Label htmlFor='plan_visitas'>Visitas presenciales / mes</Label>
                        <Input
                            id='plan_visitas'
                            name='plan_visitas'
                            type='number'
                            min={0}
                            value={value.plan_num_visitas_mensuales ?? ''}
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
                        <p className='mt-1 text-xs text-zinc-400'>
                            Heredado del plan. Personalizable para este contrato.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Zona B: Lista de servicios por categoría ── */}
            {(value.plan_id || value.modo === 'personalizado') && (
                <div className='flex flex-col gap-3'>
                    <h3 className='text-sm font-semibold text-zinc-700 dark:text-zinc-300'>
                        {value.modo === 'plan'
                            ? 'Servicios adicionales (add-ons)'
                            : 'Servicios'}
                    </h3>
                    {serviciosPorCategoria.map((grupo) => {
                        const estaColapsada = categoriasColapsadas.has(grupo.categoria);
                        const toggleCollapse = () => {
                            setCategoriasColapsadas((prev) => {
                                const next = new Set(prev);
                                if (next.has(grupo.categoria)) next.delete(grupo.categoria);
                                else next.add(grupo.categoria);
                                return next;
                            });
                        };
                        const seleccionadosEnGrupo = grupo.items.filter((s) => {
                            const est = getEstadoServicio(s.id);
                            return est === 'incluido' || est === 'addon' || est === 'disponible';
                        }).length;

                        return (
                        <div key={grupo.categoria}>
                            <button
                                type='button'
                                onClick={toggleCollapse}
                                className='mb-2 flex w-full items-center justify-between rounded px-1 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800'>
                                <span className='text-xs font-semibold uppercase tracking-wider text-zinc-500'>
                                    {grupo.label}
                                </span>
                                <span className='flex items-center gap-2'>
                                    {seleccionadosEnGrupo > 0 && (
                                        <Badge color='blue' variant='outline'>
                                            {seleccionadosEnGrupo} seleccionado{seleccionadosEnGrupo > 1 ? 's' : ''}
                                        </Badge>
                                    )}
                                    <span className='text-xs text-zinc-400'>
                                        {estaColapsada ? '▼' : '▲'}
                                    </span>
                                </span>
                            </button>
                            {!estaColapsada && (
                            <div className='flex flex-col gap-2'>
                                {grupo.items.map((servicio) => {
                                    const estado = getEstadoServicio(servicio.id);
                                    const esSeleccionado = estado === 'incluido' || estado === 'addon' || estado === 'disponible';
                                    const datos = value.servicios.find(
                                        (s) => s.servicio_id === servicio.id,
                                    );

                                    return (
                                        <FilaServicio
                                            key={servicio.id}
                                            servicio={servicio}
                                            estado={estado}
                                            esSeleccionado={esSeleccionado}
                                            datos={datos}
                                            modo={value.modo}
                                            onToggle={() => toggleServicio(servicio.id)}
                                            onCantidadChange={(v) =>
                                                actualizarServicio(servicio.id, 'cantidad', v)
                                            }
                                            onPrecioChange={(v) =>
                                                actualizarServicio(servicio.id, 'precio_unitario', v)
                                            }
                                        />
                                    );
                                })}
                            </div>
                            )}
                        </div>
                        );
                    })}
                </div>
            )}

            {/* ── Zona C: Resumen ── */}
            {(value.plan_id || value.servicios.length > 0) && (
                <div className='rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                    <h4 className='mb-2 text-xs font-semibold text-zinc-500'>Resumen</h4>
                    <div className='flex flex-col gap-1 text-sm'>
                        {value.modo === 'plan' && planSeleccionado && (
                            <div className='flex justify-between'>
                                <span>
                                    {planSeleccionado.nombre} (×{value.plan_cantidad})
                                </span>
                                <span className='font-medium'>
                                    ${(totalPlan).toLocaleString()}
                                </span>
                            </div>
                        )}
                        {value.servicios.map((s) => {
                            const serv = servicios.find((sv) => sv.id === s.servicio_id);
                            return (
                                <div key={s.servicio_id} className='flex justify-between'>
                                    <span className='text-zinc-500'>
                                        {value.modo === 'plan' ? '+ ' : ''}
                                        {serv?.nombre ?? `Servicio #${s.servicio_id}`} (×
                                        {s.cantidad})
                                    </span>
                                    <span>
                                        ${(s.cantidad * s.precio_unitario).toLocaleString()}
                                    </span>
                                </div>
                            );
                        })}
                        <div className='mt-1 flex justify-between border-t border-zinc-200 pt-1 font-semibold dark:border-zinc-700'>
                            <span>Total</span>
                            <span>${totalGeneral.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )}
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
