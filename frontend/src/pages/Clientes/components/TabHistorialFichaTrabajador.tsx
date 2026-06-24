import Icon from '@/components/icon/Icon';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Dropdown, { DropdownItem, DropdownMenu, DropdownToggle } from '@/components/ui/Dropdown';
import type {
    ICambioCampoContrato,
    IContratoTrabajadorHistorialEvento,
    TEventoTipoContrato,
} from '@/interface/rrhh.interface';
import { useGetHistorialFichaTrabajadorQuery } from '@/store/slices/empresa/empresaApi';
import { type TIcons } from '@/types/icons.type';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface ITabHistorialFichaProps {
    usuarioEmpresaId: number;
}

type TFiltroTipo = 'todos' | 'contratos' | 'cambios_estado' | 'anexos';
type TOrden = 'desc' | 'asc';

// ── Datos estáticos ───────────────────────────────────────────────────────────

const MESES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const ESTADO_LABEL: Record<string, string> = {
    borrador: 'Borrador',
    pendiente_aprobacion: 'Pend. aprobación',
    vigente: 'Vigente',
    vencido: 'Vencido',
    terminado: 'Terminado',
    anulado: 'Anulado',
    descartado: 'Descartado',
};

interface IEventoConfig {
    label: string;
    icon: TIcons;
    iconBg: string;
    badgeBg: string;
    badgeLabel: string | ((cambios: ICambioCampoContrato[]) => string);
}

const EVENTO_CONFIG: Partial<Record<TEventoTipoContrato, IEventoConfig>> = {
    creacion: {
        label: 'Ingreso a la empresa',
        icon: 'HeroCheck',
        iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
        badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
        badgeLabel: 'CONTRATO INICIAL',
    },
    cambio_estado: {
        label: 'Cambio de estado',
        icon: 'HeroArrowPath',
        iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        badgeBg: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
        badgeLabel: 'ESTADO',
    },
    anexo_creado: {
        label: 'Anexo de contrato',
        icon: 'HeroPlus',
        iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
        badgeLabel: (cambios) => {
            const campos = cambios.map((c) => c.campo);
            if (campos.includes('Cargo')) return 'CAMBIO DE CARGO';
            if (campos.some((c) => c.toLowerCase().includes('sueldo'))) return 'AJUSTE SALARIAL';
            return 'ANEXO';
        },
    },
    aprobacion: {
        label: 'Aprobado por empleador',
        icon: 'HeroCheck',
        iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
        badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
        badgeLabel: 'APROBADO',
    },
};

const FILTRO_OPTIONS: { value: TFiltroTipo; label: string }[] = [
    { value: 'todos', label: 'Todos los hitos' },
    { value: 'contratos', label: 'Ingresos y contratos' },
    { value: 'cambios_estado', label: 'Cambios de estado' },
    { value: 'anexos', label: 'Anexos' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const humanizarValor = (campo: string, valor: string | null): string => {
    if (!valor) return '—';
    if (campo === 'Estado') return ESTADO_LABEL[valor] ?? valor;
    return valor;
};

const getBadgeLabel = (config: IEventoConfig, cambios: ICambioCampoContrato[]): string =>
    typeof config.badgeLabel === 'function' ? config.badgeLabel(cambios) : config.badgeLabel;

// Solo eventos relevantes para el perfil del trabajador
const ESTADOS_RELEVANTES = new Set(['vigente', 'terminado', 'vencido', 'anulado']);

const esRelevanteParaFicha = (e: IContratoTrabajadorHistorialEvento): boolean => {
    if (['creacion', 'anexo_creado', 'aprobacion'].includes(e.evento_tipo)) return true;
    if (e.evento_tipo === 'cambio_estado') {
        const destino = e.cambios.find((c) => c.campo === 'Estado')?.valor_nuevo ?? '';
        return ESTADOS_RELEVANTES.has(destino);
    }
    return false;
};

const aplicarFiltroTipo = (
    eventos: IContratoTrabajadorHistorialEvento[],
    filtro: TFiltroTipo,
): IContratoTrabajadorHistorialEvento[] => {
    if (filtro === 'todos') return eventos;
    if (filtro === 'contratos') return eventos.filter((e) => e.evento_tipo === 'creacion' || e.evento_tipo === 'aprobacion');
    if (filtro === 'cambios_estado') return eventos.filter((e) => e.evento_tipo === 'cambio_estado');
    if (filtro === 'anexos') return eventos.filter((e) => e.evento_tipo === 'anexo_creado');
    return eventos;
};

const groupByMonth = (eventos: IContratoTrabajadorHistorialEvento[]) => {
    const map = new Map<string, { label: string; events: IContratoTrabajadorHistorialEvento[] }>();
    for (const e of eventos) {
        const d = dayjs(e.fecha);
        const key = `${d.year()}-${String(d.month()).padStart(2, '0')}`;
        if (!map.has(key)) {
            map.set(key, { label: `${MESES_ES[d.month()]} ${d.year()}`, events: [] });
        }
        map.get(key)!.events.push(e);
    }
    return Array.from(map.values());
};

// ── Componente ────────────────────────────────────────────────────────────────

const TabHistorialFichaTrabajador = ({ usuarioEmpresaId }: ITabHistorialFichaProps) => {
    const navigate = useNavigate();
    const { data: todosEventos = [], isLoading, isError } = useGetHistorialFichaTrabajadorQuery(usuarioEmpresaId);
    const [filtro, setFiltro] = useState<TFiltroTipo>('todos');
    const [orden, setOrden] = useState<TOrden>('desc');

    // Pre-filtro de relevancia + filtro de tipo + orden
    const eventosFiltrados = (() => {
        let lista = todosEventos.filter(esRelevanteParaFicha);
        lista = aplicarFiltroTipo(lista, filtro);
        if (orden === 'asc') lista = [...lista].reverse();
        return lista;
    })();

    const grupos = groupByMonth(eventosFiltrados);
    const filtroLabel = FILTRO_OPTIONS.find((o) => o.value === filtro)?.label ?? 'Todos los hitos';

    // Detectar si es el primer contrato (para el label "Ingreso a la empresa")
    const primeraCreacion = todosEventos.filter((e) => e.evento_tipo === 'creacion').at(-1)?.id;

    if (isLoading) {
        return (
            <Card>
                <CardBody>
                    <p className='text-sm text-zinc-400'>Cargando historial laboral...</p>
                </CardBody>
            </Card>
        );
    }

    if (isError) {
        return (
            <Card>
                <CardBody>
                    <p className='text-sm text-red-400'>No se pudo cargar el historial.</p>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card>
            <CardBody>
                {/* ── Toolbar ─────────────────────────────────────────── */}
                <div className='mb-6 flex flex-wrap items-center gap-2'>
                    {/* Filtro dropdown */}
                    <Dropdown>
                        <DropdownToggle>
                            <Button size='sm' variant='outline' color='zinc'>
                                {filtroLabel}
                            </Button>
                        </DropdownToggle>
                        <DropdownMenu placement='bottom-start'>
                            {FILTRO_OPTIONS.map((opt) => (
                                <DropdownItem
                                    key={opt.value}
                                    isActive={filtro === opt.value}
                                    onClick={() => setFiltro(opt.value)}>
                                    {opt.label}
                                </DropdownItem>
                            ))}
                        </DropdownMenu>
                    </Dropdown>

                    {/* Fechas (decorativo v1) */}
                    <Button size='sm' variant='outline' color='zinc' icon='HeroCalendarDays'>
                        Fechas
                    </Button>

                    {/* Ordenamiento */}
                    <button
                        type='button'
                        onClick={() => setOrden((o) => (o === 'desc' ? 'asc' : 'desc'))}
                        className='ml-auto text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'>
                        Ordenar por:{' '}
                        <span className='font-medium underline underline-offset-2'>
                            {orden === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}
                        </span>{' '}
                        {orden === 'desc' ? '↓' : '↑'}
                    </button>
                </div>

                {/* ── Timeline ────────────────────────────────────────── */}
                {eventosFiltrados.length === 0 ? (
                    <p className='text-sm italic text-zinc-400'>
                        {todosEventos.length === 0
                            ? 'No hay historial laboral registrado.'
                            : 'Sin eventos para el filtro seleccionado.'}
                    </p>
                ) : (
                    <div className='space-y-6'>
                        {grupos.map((grupo) => (
                            <div key={grupo.label}>
                                {/* Encabezado de mes */}
                                <h3 className='mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300'>
                                    {grupo.label}
                                </h3>

                                {/* Eventos del mes */}
                                <div className='space-y-1'>
                                    {grupo.events.map((evento) => {
                                        const cfg =
                                            EVENTO_CONFIG[evento.evento_tipo as TEventoTipoContrato] ??
                                            EVENTO_CONFIG.cambio_estado!;
                                        const badge = getBadgeLabel(cfg, evento.cambios);
                                        const d = dayjs(evento.fecha);

                                        // Label especial para primer contrato
                                        const labelEvento =
                                            evento.evento_tipo === 'creacion' && evento.id !== primeraCreacion
                                                ? `Nuevo contrato${evento.contrato_tipo_label ? ` · ${evento.contrato_tipo_label}` : ''}`
                                                : cfg.label;

                                        return (
                                            <div key={evento.id} className='flex gap-3'>
                                                {/* Fecha */}
                                                <div className='w-14 shrink-0 pt-1 text-right text-xs text-zinc-400 dark:text-zinc-500'>
                                                    {d.date()} {MESES_CORTO[d.month()]}
                                                </div>

                                                {/* Ícono */}
                                                <div
                                                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${cfg.iconBg}`}>
                                                    <Icon icon={cfg.icon} className='h-3.5 w-3.5' />
                                                </div>

                                                {/* Contenido */}
                                                <div className='min-w-0 flex-1 border-b border-zinc-100 pb-5 dark:border-zinc-800'>
                                                    {/* Título + badges */}
                                                    <div className='flex flex-wrap items-center gap-2'>
                                                        <span className='text-sm font-semibold text-zinc-800 dark:text-zinc-100'>
                                                            {labelEvento}
                                                        </span>
                                                        <span
                                                            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cfg.badgeBg}`}>
                                                            {badge}
                                                        </span>
                                                        {evento.contrato_tipo_label && (
                                                            <span className='rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'>
                                                                {evento.contrato_tipo_label}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Descripción */}
                                                    <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
                                                        {evento.detalle}
                                                    </p>

                                                    {/* Diff box */}
                                                    {evento.cambios.length > 0 && (
                                                        <div className='mt-2 space-y-0.5 rounded border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                                            {evento.cambios.map((c, i) => (
                                                                <div
                                                                    key={i}
                                                                    className='flex flex-wrap items-center gap-1 text-xs'>
                                                                    <span className='text-zinc-500 dark:text-zinc-400'>
                                                                        {c.campo}:
                                                                    </span>
                                                                    {c.valor_anterior && (
                                                                        <span className='text-zinc-400 line-through dark:text-zinc-500'>
                                                                            {humanizarValor(c.campo, c.valor_anterior)}
                                                                        </span>
                                                                    )}
                                                                    <span className='text-zinc-300 dark:text-zinc-600'>
                                                                        →
                                                                    </span>
                                                                    <span className='font-medium text-blue-600 dark:text-blue-400'>
                                                                        {humanizarValor(c.campo, c.valor_nuevo)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Link Ver contrato */}
                                                    {evento.contrato_id && (
                                                        <button
                                                            type='button'
                                                            onClick={() =>
                                                                navigate(`/rrhh/contratos/${evento.contrato_id}`)
                                                            }
                                                            className='mt-1.5 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'>
                                                            <Icon icon='HeroDocument' className='h-3 w-3' />
                                                            Ver contrato
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default TabHistorialFichaTrabajador;
