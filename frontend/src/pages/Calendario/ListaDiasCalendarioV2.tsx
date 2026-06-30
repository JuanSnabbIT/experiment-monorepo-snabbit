import Calendar, { TViewMode, useCalendarView } from '@/components/Calendar';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Dropdown, { DropdownItem, DropdownMenu, DropdownToggle } from '@/components/ui/Dropdown';
import { TIcons } from '@/types/icons.type';
import {
    DateSelectArg,
    EventClickArg,
    EventContentArg,
    EventDropArg,
    EventSourceInput,
} from '@fullcalendar/core/index.js';
import FullCalendar from '@fullcalendar/react';
import esLocale from '@fullcalendar/core/locales/es';
import { useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import classNames from 'classnames';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Container from '@/components/layouts/Container/Container';
import Subheader, { SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import CrearDiasCalendario from './modals/CrearDiasCalendario';
import { useGetDiasCalendarioQuery, useGetSolicitudesVacacionesCalendarioQuery } from '@/store/slices/calendario/calendarioApi';
import { useGetOrdenesV3Query, useUpdateOrdenV3Mutation } from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { useGetContratosQuery } from '@/store/slices/contratos/contratoApi';
import { useGetContratosTrabajadorQuery } from '@/store/slices/rrhh/contratoTrabajadorApi';
import { toast } from 'react-toastify';
import OffCanvasDetalleEvento, { ICalendarEventSelected } from './components/OffCanvasDetalleEvento';
import ModalCrearVacacionesConFechas from './components/ModalCrearVacacionesConFechas';
import ModalSelectorAccionRango from './components/ModalSelectorAccionRango';
import Badge from '@/components/ui/Badge';
import { useAppSelector } from '@/store';

type TLayer = 'feriados' | 'vacaciones' | 'ot' | 'contratos';

const LAYER_CONFIG: Record<TLayer, { label: string; icon: TIcons; color: string }> = {
    feriados: { label: 'Feriados', icon: 'HeroCalendar', color: 'red' },
    vacaciones: { label: 'Vacaciones', icon: 'HeroSun', color: 'blue' },
    ot: { label: 'OTs', icon: 'HeroWrenchScrewdriver', color: 'lime' },
    contratos: { label: 'Contratos', icon: 'HeroDocumentText', color: 'amber' },
};

const OT_COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
    borrador:               { bg: '#d4d4d8', border: '#a1a1aa', text: '#3f3f46' },
    preparacion:            { bg: '#a1a1aa', border: '#71717a', text: '#ffffff' },
    en_ejecucion:           { bg: '#bef264', border: '#84cc16', text: '#365314' },
    retroalimentacion:      { bg: '#fde047', border: '#ca8a04', text: '#713f12' },
    por_facturar:           { bg: '#7dd3fc', border: '#0ea5e9', text: '#0c4a6e' },
    completada:             { bg: '#6ee7b7', border: '#10b981', text: '#064e3b' },
    parcialmente_facturada: { bg: '#7dd3fc', border: '#0ea5e9', text: '#0c4a6e' },
    facturada:              { bg: '#38bdf8', border: '#0284c7', text: '#0c4a6e' },
    cerrada:                { bg: '#fcd34d', border: '#d97706', text: '#78350f' },
    cancelada:              { bg: '#fca5a5', border: '#ef4444', text: '#7f1d1d' },
};

function ListaDiasCalendarioV2() {
    const ref = useRef<FullCalendar>(null);
    const { listaGrupos } = useAppSelector((state) => state.auth);
    const grupos = listaGrupos?.grupos ?? [];
    const esRrhhPuro =
        grupos.includes('rrhh') &&
        !grupos.includes('staff') &&
        !grupos.includes('superadmin');
    const {
        viewMode,
        changeViewMode,
        next,
        prev,
        today,
        title: currentDate,
        handleDatesSet,
    } = useCalendarView(ref);

    const CALENDAR_VIEW: { [key: string]: { key: string; text: string; icon: TIcons } } = {
        timeGridDay: { key: 'timeGridDay', text: 'Días', icon: 'HeroCalendar' },
        timeGridWeek: { key: 'timeGridWeek', text: 'Semanas', icon: 'HeroTableCells' },
        dayGridMonth: { key: 'dayGridMonth', text: 'Meses', icon: 'HeroCalendarDays' },
        listWeek: { key: 'listWeek', text: 'Lista', icon: 'HeroClipboardDocumentCheck' },
        multiMonthYear: { key: 'multiMonthYear', text: 'Anual', icon: 'HeroCalendarDays' },
    };

    // ── Estado UI ────────────────────────────────────────────────────────────
    const [isOpenCrearFeriados, setIsOpenCrearFeriados] = useState(false);
    const [layers, setLayers] = useState<Record<TLayer, boolean>>({
        feriados: true,
        vacaciones: true,
        ot: true,
        contratos: true,
    });
    const [selectedEvent, setSelectedEvent] = useState<ICalendarEventSelected | null>(null);
    const [isOffCanvasOpen, setIsOffCanvasOpen] = useState(false);
    const [rangoSeleccionado, setRangoSeleccionado] = useState<{ inicio: string; fin: string } | null>(null);
    const [isSelectorAccionOpen, setIsSelectorAccionOpen] = useState(false);
    const [isCrearVacacionesOpen, setIsCrearVacacionesOpen] = useState(false);

    const toggleLayer = (layer: TLayer) =>
        setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));

    // ── RTK Query ────────────────────────────────────────────────────────────
    const { data: listaDiasCalendario = [] } = useGetDiasCalendarioQuery();
    const { data: listaSolicitudesVacaciones = [] } = useGetSolicitudesVacacionesCalendarioQuery();
    const { data: listaOrdenesV3 = [] } = useGetOrdenesV3Query(undefined, { skip: esRrhhPuro });
    const { data: listaContratosB2B = [] } = useGetContratosQuery();
    const { data: listaContratosLaborales = [] } = useGetContratosTrabajadorQuery();
    const [updateOrden] = useUpdateOrdenV3Mutation();

    // ── Set y mapa de feriados para validaciones y dayCellContent ────────────
    const feriadosFechas = useMemo(
        () => new Set(listaDiasCalendario.map((d) => dayjs(d.fecha).format('YYYY-MM-DD'))),
        [listaDiasCalendario],
    );

    const feriadoMapByFecha = useMemo(() => {
        const map: Record<string, { descripcion: string; tipo: string; es_irrenunciable: boolean }> = {};
        listaDiasCalendario.forEach((d) => {
            map[dayjs(d.fecha).format('YYYY-MM-DD')] = {
                descripcion: d.descripcion,
                tipo: d.tipo,
                es_irrenunciable: d.es_irrenunciable,
            };
        });
        return map;
    }, [listaDiasCalendario]);

    // ── Indicadores de capacidad por día ─────────────────────────────────────
    const otPorFecha = useMemo(() => {
        const map: Record<string, number> = {};
        listaOrdenesV3.forEach((ot) => {
            if (ot.fecha_programada) {
                const key = dayjs(ot.fecha_programada).format('YYYY-MM-DD');
                map[key] = (map[key] ?? 0) + 1;
            }
        });
        return map;
    }, [listaOrdenesV3]);

    const vacPorFecha = useMemo(() => {
        const map: Record<string, number> = {};
        listaSolicitudesVacaciones
            .filter((s) => s.estado === '2')
            .forEach((sol) => {
                let cur = dayjs(sol.fecha_inicio);
                const fin = dayjs(sol.fecha_fin);
                while (!cur.isAfter(fin)) {
                    const key = cur.format('YYYY-MM-DD');
                    map[key] = (map[key] ?? 0) + 1;
                    cur = cur.add(1, 'day');
                }
            });
        return map;
    }, [listaSolicitudesVacaciones]);

    // ── Construcción de eventos ───────────────────────────────────────────────
    const eventosCalendario = useMemo<EventSourceInput>(() => {
        const eventos: EventSourceInput = [];

        if (layers.feriados) {
            listaDiasCalendario.forEach((dia) => {
                eventos.push({
                    id: `feriado_${dia.id}`,
                    title: dia.descripcion,
                    start: dayjs(dia.fecha).toDate(),
                    display: 'background',
                    color: 'rgba(239,68,68,0.18)',
                });
            });
        }

        if (layers.vacaciones) {
            listaSolicitudesVacaciones
                .filter((sol) => sol.estado === '2')
                .forEach((solicitud) => {
                    eventos.push({
                        id: `vac_${solicitud.id}`,
                        title: solicitud.papeleta.nombre_empleado,
                        start: dayjs(solicitud.fecha_inicio).toDate(),
                        end: dayjs(solicitud.fecha_fin).add(1, 'day').toDate(),
                        allDay: true,
                        backgroundColor: '#93c5fd',
                        borderColor: '#3b82f6',
                        textColor: '#1e3a8a',
                        classNames: ['cursor-pointer'],
                        editable: false,
                        extendedProps: {
                            tipo_evento: 'solicitud_vacaciones',
                            id: solicitud.id,
                            nombre_empleado: solicitud.papeleta.nombre_empleado,
                            fecha_inicio: solicitud.fecha_inicio,
                            fecha_fin: solicitud.fecha_fin,
                            estado: solicitud.estado,
                            estado_label: solicitud.estado_label,
                            nombre_aprobado_rechazado_por:
                                solicitud.nombre_aprobado_rechazado_por,
                        },
                    });
                });
        }

        if (layers.ot) {
            listaOrdenesV3.forEach((ot) => {
                if (!ot.fecha_programada) return;
                const colorOT = OT_COLOR_MAP[ot.estado] ?? OT_COLOR_MAP.borrador;
                eventos.push({
                    id: `ot_${ot.id}`,
                    title: ot.titulo,
                    start: dayjs(ot.fecha_programada).toDate(),
                    end: ot.fecha_fin_estimada
                        ? dayjs(ot.fecha_fin_estimada).add(1, 'day').toDate()
                        : undefined,
                    backgroundColor: colorOT.bg,
                    borderColor: colorOT.border,
                    textColor: colorOT.text,
                    classNames: ['cursor-pointer'],
                    editable: !esRrhhPuro,
                    extendedProps: {
                        tipo_evento: 'orden_trabajo_v3',
                        id: ot.id,
                        titulo: ot.titulo,
                        cliente_nombre: ot.cliente_nombre,
                        estado: ot.estado,
                        tecnico_responsable_nombre: ot.tecnico_responsable_nombre,
                        fecha_programada: ot.fecha_programada,
                        fecha_fin_estimada: ot.fecha_fin_estimada,
                    },
                });
            });
        }

        if (layers.contratos) {
            listaContratosB2B
                .filter((c) => c.estado === 'activo' && c.fecha_fin)
                .forEach((contrato) => {
                    eventos.push({
                        id: `b2b_${contrato.id}`,
                        title: `Vence: ${contrato.nombre}`,
                        start: dayjs(contrato.fecha_fin!).toDate(),
                        allDay: true,
                        backgroundColor: '#fcd34d',
                        borderColor: '#d97706',
                        textColor: '#78350f',
                        classNames: ['cursor-pointer'],
                        editable: false,
                        extendedProps: {
                            tipo_evento: 'contrato_b2b',
                            id: contrato.id,
                            nombre: contrato.nombre,
                            datos_cliente_nombre: contrato.datos_cliente?.nombre ?? '—',
                            fecha_fin: contrato.fecha_fin!,
                            estado: contrato.estado,
                        },
                    });
                });

            listaContratosLaborales
                .filter((c) => c.fecha_termino && c.estado === 'vigente')
                .forEach((contrato) => {
                    eventos.push({
                        id: `lab_${contrato.id}`,
                        title: `Termina: ${contrato.nombre_trabajador ?? 'Trabajador'}`,
                        start: dayjs(contrato.fecha_termino!).toDate(),
                        allDay: true,
                        backgroundColor: '#c4b5fd',
                        borderColor: '#7c3aed',
                        textColor: '#2e1065',
                        classNames: ['cursor-pointer'],
                        editable: false,
                        extendedProps: {
                            tipo_evento: 'contrato_laboral',
                            id: contrato.id,
                            nombre_trabajador: contrato.nombre_trabajador,
                            cargo: contrato.cargo,
                            fecha_termino: contrato.fecha_termino!,
                            estado: contrato.estado,
                        },
                    });
                });
        }

        return eventos;
    }, [
        layers,
        listaDiasCalendario,
        listaSolicitudesVacaciones,
        listaOrdenesV3,
        listaContratosB2B,
        listaContratosLaborales,
    ]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleEventClick = (clickInfo: EventClickArg) => {
        const props = clickInfo.event.extendedProps;
        if (props.tipo_evento) {
            setSelectedEvent(props as ICalendarEventSelected);
            setIsOffCanvasOpen(true);
        }
    };

    const handleSelect = (selectInfo: DateSelectArg) => {
        setRangoSeleccionado({ inicio: selectInfo.startStr, fin: selectInfo.endStr });
        setIsSelectorAccionOpen(true);
    };

    const handleEventDrop = async ({ event, revert }: EventDropArg) => {
        if (event.extendedProps.tipo_evento !== 'orden_trabajo_v3' || !event.start) {
            revert();
            return;
        }
        const nuevaFecha = dayjs(event.start).format('YYYY-MM-DDTHH:mm:ss');
        try {
            await updateOrden({
                id: event.extendedProps.id as number,
                data: { fecha_programada: nuevaFecha },
            }).unwrap();
            toast.success('OT reprogramada', { autoClose: 1200 });
        } catch {
            revert();
            toast.error('No se pudo reprogramar la OT');
        }
    };

    const renderEventContent = (eventContent: EventContentArg) => {
        const props = eventContent.event.extendedProps;
        const tipo = props.tipo_evento as string;

        if (tipo === 'solicitud_vacaciones') {
            return (
                <div className='truncate px-1 text-xs'>
                    <span className='font-medium'>{props.nombre_empleado as string}</span>
                </div>
            );
        }
        if (tipo === 'orden_trabajo_v3') {
            return (
                <div className='truncate px-1 text-xs'>
                    <span className='font-semibold'>OT #{props.id as number}</span>{' '}
                    {eventContent.event.title}
                    {props.tecnico_responsable_nombre && (
                        <span className='opacity-75'> · {props.tecnico_responsable_nombre as string}</span>
                    )}
                </div>
            );
        }
        if (tipo === 'contrato_b2b' || tipo === 'contrato_laboral') {
            return (
                <div className='truncate px-1 text-xs font-medium'>
                    {eventContent.event.title}
                </div>
            );
        }
        return <div className='truncate px-1 text-xs'>{eventContent.event.title}</div>;
    };

    return (
        <PageWrapper isProtectedRoute={true} title='Calendario' name='Calendario'>
            <Subheader>
                <SubheaderRight>
                    {/* Toggles de capas — RRHH no ve la capa OT */}
                    <div className='flex items-center gap-1'>
                        {(Object.keys(LAYER_CONFIG) as TLayer[])
                            .filter((layer) => !(esRrhhPuro && layer === 'ot'))
                            .map((layer) => (
                                <Button
                                    key={layer}
                                    size='sm'
                                    variant={layers[layer] ? 'solid' : 'outline'}
                                    color={LAYER_CONFIG[layer].color as any}
                                    icon={LAYER_CONFIG[layer].icon}
                                    onClick={() => toggleLayer(layer)}>
                                    {LAYER_CONFIG[layer].label}
                                </Button>
                            ))}
                    </div>
                    <Button
                        variant='solid'
                        icon='HeroCalendarPlus'
                        onClick={() => setIsOpenCrearFeriados(true)}>
                        Agregar feriados
                    </Button>
                    <CrearDiasCalendario
                        isOpen={isOpenCrearFeriados}
                        setIsOpen={setIsOpenCrearFeriados}
                    />
                </SubheaderRight>
            </Subheader>

            <Container className='h-full w-full'>
                <Card className='h-full overflow-auto'>
                    <CardHeader className='min-w-[700px]'>
                        <CardHeaderChild>
                            {currentDate}
                            {viewMode === 'multiMonthYear' && (
                                <Badge color='amber' className='ml-2 text-xs'>
                                    Vista anual — los eventos individuales no se muestran
                                </Badge>
                            )}
                        </CardHeaderChild>
                        <CardHeaderChild>
                            <Button onClick={() => prev(true)} icon='HeroChevronDoubleLeft' />
                            <Button onClick={() => prev()} icon='HeroChevronLeft' />
                            <Button onClick={() => today()} icon='HeroCalendar' />
                            <Button onClick={() => next()} icon='HeroChevronRight' />
                            <Button onClick={() => next(true)} icon='HeroChevronDoubleRight' />
                            <Dropdown>
                                <DropdownToggle>
                                    <Button color='zinc' icon={CALENDAR_VIEW[viewMode]?.icon ?? 'HeroCalendarDays'}>
                                        {CALENDAR_VIEW[viewMode]?.text ?? 'Vista'}
                                    </Button>
                                </DropdownToggle>
                                <DropdownMenu placement='bottom-end'>
                                    {Object.values(CALENDAR_VIEW).map((item) => (
                                        <DropdownItem
                                            key={item.key}
                                            isActive={viewMode === item.key}
                                            onClick={() => changeViewMode(item.key)}
                                            icon={item.icon}>
                                            {item.text}
                                        </DropdownItem>
                                    ))}
                                </DropdownMenu>
                            </Dropdown>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        <div className='min-w-[700px]'>
                            <Calendar
                                ref={ref}
                                height='calc(100vh - 220px)'
                                datesSet={handleDatesSet}
                                viewMode={viewMode}
                                events={eventosCalendario}
                                locale={esLocale}
                                editable={true}
                                selectable={true}
                                selectMirror={true}
                                unselectAuto={true}
                                businessHours={{
                                    daysOfWeek: [1, 2, 3, 4, 5],
                                    startTime: '08:00',
                                    endTime: '18:00',
                                }}
                                selectAllow={(selectInfo) => {
                                    const dateKey = dayjs(selectInfo.start).format('YYYY-MM-DD');
                                    return !feriadosFechas.has(dateKey);
                                }}
                                eventAllow={(dropInfo) => {
                                    const dateKey = dayjs(dropInfo.start).format('YYYY-MM-DD');
                                    return !feriadosFechas.has(dateKey);
                                }}
                                eventContent={renderEventContent}
                                eventClick={handleEventClick}
                                eventDrop={handleEventDrop}
                                select={handleSelect}
                                eventClassNames='truncate'
                                views={{
                                    multiMonthYear: {
                                        eventDisplay: 'none',
                                    },
                                }}
                                dayCellContent={(props) => {
                                    const dateKey = dayjs(props.date).format('YYYY-MM-DD');
                                    const feriado = feriadoMapByFecha[dateKey];
                                    const countOT = otPorFecha[dateKey] ?? 0;
                                    const countVac = vacPorFecha[dateKey] ?? 0;
                                    return (
                                        <div className='flex w-full flex-col gap-0.5'>
                                            <span
                                                className={classNames(
                                                    'self-end text-lg font-bold',
                                                    feriado ? 'text-red-600' : '',
                                                )}>
                                                {dayjs(props.date).format('DD')}
                                            </span>
                                            {feriado && (
                                                <button
                                                    type='button'
                                                    title={feriado.es_irrenunciable
                                                        ? `${feriado.descripcion} · Irrenunciable`
                                                        : feriado.descripcion}
                                                    onClick={() => {
                                                        setSelectedEvent({
                                                            tipo_evento: 'feriado',
                                                            descripcion: feriado.descripcion,
                                                            tipo: feriado.tipo,
                                                            es_irrenunciable: feriado.es_irrenunciable,
                                                            fecha: dayjs(props.date).format('DD/MM/YYYY'),
                                                        });
                                                        setIsOffCanvasOpen(true);
                                                    }}
                                                    className='truncate rounded px-1 py-0.5 text-left text-[10px] font-medium text-red-700 hover:bg-red-100 active:bg-red-200'>
                                                    {feriado.descripcion}
                                                    {feriado.es_irrenunciable && (
                                                        <span className='ml-1 rounded bg-red-200 px-1 text-[9px] font-bold uppercase text-red-700'>
                                                            Irren.
                                                        </span>
                                                    )}
                                                </button>
                                            )}
                                            {(countOT > 0 || countVac > 0) && (
                                                <div className='flex gap-1 self-end'>
                                                    {countOT > 0 && (
                                                        <Badge
                                                            color='lime'
                                                            className='px-1 py-0 text-[10px]'>
                                                            {countOT} OT
                                                        </Badge>
                                                    )}
                                                    {countVac > 0 && (
                                                        <Badge
                                                            color='blue'
                                                            className='px-1 py-0 text-[10px]'>
                                                            {countVac} Vac
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }}
                            />
                        </div>
                    </CardBody>
                </Card>
            </Container>

            <OffCanvasDetalleEvento
                isOpen={isOffCanvasOpen}
                setIsOpen={setIsOffCanvasOpen}
                selectedEvent={selectedEvent}
            />

            {rangoSeleccionado && (
                <>
                    <ModalSelectorAccionRango
                        isOpen={isSelectorAccionOpen}
                        setIsOpen={setIsSelectorAccionOpen}
                        fechaInicio={rangoSeleccionado.inicio}
                        fechaFin={rangoSeleccionado.fin}
                        onSeleccion={(accion) => {
                            if (accion === 'vacaciones') setIsCrearVacacionesOpen(true);
                        }}
                    />
                    <ModalCrearVacacionesConFechas
                        isOpen={isCrearVacacionesOpen}
                        setIsOpen={setIsCrearVacacionesOpen}
                        fechaInicio={rangoSeleccionado.inicio}
                        fechaFin={rangoSeleccionado.fin}
                    />
                </>
            )}
        </PageWrapper>
    );
}

export default ListaDiasCalendarioV2;
