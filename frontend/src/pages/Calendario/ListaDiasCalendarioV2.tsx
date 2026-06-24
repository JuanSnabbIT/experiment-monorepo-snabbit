import Calendar, { TViewMode, useCalendarView } from '@/components/Calendar';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Dropdown, { DropdownItem, DropdownMenu, DropdownToggle } from '@/components/ui/Dropdown';
import { useAppDispatch, useAppSelector } from '@/store';
import {
    listaDiasCalendarioThunk,
    listaSolicitudesVacacionesThunk,
} from '@/store/slices/calendario/calendarioSlice';
import { useGetOrdenesTrabajoQuery } from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { TIcons } from '@/types/icons.type';
import {
    EventClickArg,
    EventContentArg,
    EventSourceInput,
} from '@fullcalendar/core/index.js';
import FullCalendar from '@fullcalendar/react';
import esLocale from '@fullcalendar/core/locales/es';
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import classNames from 'classnames';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Modal, { ModalBody, ModalHeader } from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { Dictionary } from '@fullcalendar/core/internal';
import Container from '@/components/layouts/Container/Container';
import Subheader, { SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import CrearDiasCalendario from './modals/CrearDiasCalendario';
import { useNavigate } from 'react-router-dom';

function ListaDiasCalendarioV2() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const ref = useRef<FullCalendar>(null);
    const { listaSolicitudesVacaciones, listaDiasCalendario } = useAppSelector(
        (state) => state.calendario,
    );
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { data: listaOrdenTrabajo = [] } = useGetOrdenesTrabajoQuery();
    const {
        viewMode,
        changeViewMode,
        next,
        prev,
        today,
        title: currentDate,
        handleDatesSet,
    } = useCalendarView(ref);
    const CALENDAR_VIEW: { [key in TViewMode]: { key: TViewMode; text: string; icon: TIcons } } = {
        timeGridDay: { key: 'timeGridDay', text: 'Dias', icon: 'HeroCalendar' },
        timeGridWeek: { key: 'timeGridWeek', text: 'Semanas', icon: 'HeroTableCells' },
        dayGridMonth: { key: 'dayGridMonth', text: 'Meses', icon: 'HeroCalendarDays' },
        listWeek: { key: 'listWeek', text: 'Lista', icon: 'HeroClipboardDocumentCheck' },
    };
    const [feriadoSeleccionado, setFeriadoSeleccionado] = useState<{ descripcion: string; tipo: string; es_irrenunciable: boolean; fecha: string } | undefined>();
    const [isOpenModalFeriado, setIsOpenModalFeriado] = useState<boolean>(false);
    const [isOpenModalDetalle, setIsOpenModalDetalle] = useState<boolean>(false);
    const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<Dictionary | undefined>();
    const [eventosVacaciones, setEventosVacaciones] = useState<EventSourceInput | undefined>();
    const [isOpenCrearFeriados, setIsOpenCrearFeriados] = useState<boolean>(false);

    useEffect(() => {
        dispatch(listaDiasCalendarioThunk());
        dispatch(listaSolicitudesVacacionesThunk());
    }, [personalizacionUsuario]);

    useEffect(() => {
        const eventosDiasCalendario = listaDiasCalendario.map((dia) => {
            return {
                id: `${dia.id}_C`,
                title: dia.descripcion,
                start: dayjs(dia.fecha).toDate(),
                classNames: ['bg-red-300 hover:bg-red-500 hover:cursor-pointer'],
                extendedProps: {
                    tipo_evento: 'calendario',
                },
            };
        });
        const eventosSolicitudesVacaciones = listaSolicitudesVacaciones
            .filter((sol) => sol.estado === '2')
            .map((solicitud) => {
                return {
                    id: `${solicitud.id}_S`,
                    title: solicitud.papeleta.nombre_empleado,
                    start: dayjs(solicitud.fecha_inicio).toDate(),
                    end: dayjs(solicitud.fecha_fin).toDate(),
                    classNames: ['bg-blue-300 hover:bg-blue-500 hover:cursor-pointer'],
                    extendedProps: {
                        tipo_evento: 'solicitud',
                        ...solicitud,
                    },
                };
            });
        const eventosOrdenDeTrabajo = listaOrdenTrabajo.map((ot) => {
            return {
                id: `${ot.id}_OT`,
                title: ot.cliente_nombre,
                start: dayjs(ot.fecha_inicio_ot).toDate(),
                end: dayjs(ot.fecha_finalizacion_ot).toDate(),
                classNames: [
                    `${ot.estado === 'pendiente' ? 'bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-8000' : ot.estado === 'en_proceso' ? 'bg-lime-300 hover:bg-lime-500' : ot.estado === 'completada' ? 'bg-emerald-300 hover:bg-emerald-500' : ot.estado === 'cerrada' ? 'bg-amber-300 hover:bg-amber-500' : ot.estado === 'facturada' ? 'bg-sky-300 hover:bg-sky-500' : ot.estado === 'cancelada' ? 'bg-red-300 hover:bg-red-500' : ''}`,
                ],
                extendedProps: {
                    tipo_evento: 'orden_trabajo',
                    ...ot,
                },
            };
        });
        const eventosCombinados = [
            ...eventosDiasCalendario,
            ...eventosSolicitudesVacaciones,
            ...eventosOrdenDeTrabajo,
        ];
        setEventosVacaciones(eventosCombinados);
    }, [listaDiasCalendario, listaSolicitudesVacaciones, listaOrdenTrabajo]);

    const handleEventClick = (clickInfo: EventClickArg) => {
        if (clickInfo.event.extendedProps.tipo_evento === 'calendario' && clickInfo.event.start) {
            const dia = listaDiasCalendario.find(
                (d) =>
                    dayjs(d.fecha).format('DD-MM-YYYY') ===
                    dayjs(clickInfo.event.start!).format('DD-MM-YYYY'),
            );
            if (dia) {
                setFeriadoSeleccionado({
                    descripcion: dia.descripcion,
                    tipo: dia.tipo,
                    es_irrenunciable: dia.es_irrenunciable,
                    fecha: dayjs(dia.fecha).format('DD-MM-YYYY'),
                });
                setIsOpenModalFeriado(true);
            }
        } else if (clickInfo.event.extendedProps.tipo_evento === 'orden_trabajo') {
            navigate(`/orden-trabajo/detalle-orden-trabajo/${clickInfo.event.extendedProps.id}`);
        } else {
            setSolicitudSeleccionada(clickInfo.event.extendedProps);
            setIsOpenModalDetalle(true);
        }
    };

    const renderEventContent = (eventContent: EventContentArg) => {
        return (
            <>
                {/* {user && <Avatar src={user.image?.thumb} className='me-2 w-6' />} */}
                {eventContent.event.extendedProps.tipo_evento === 'orden_trabajo' ? (
                    <div className='p-1'>
                        Orden de Trabajo N°{eventContent.event.extendedProps.id} -{' '}
                        {eventContent.event.title}
                    </div>
                ) : (
                    <div className='p-1'>{eventContent.event.title}</div>
                )}
                {/* {eventContent.timeText && <b>{eventContent.timeText}</b>} */}
            </>
        );
    };

    return (
        <PageWrapper isProtectedRoute={true} title='Calendario' name='Calendario'>
            <Subheader>
                <SubheaderRight>
                    <Dropdown>
                        <DropdownToggle>
                            <Button variant='solid' icon='HeroCog6Tooth'>
                                Configuración
                            </Button>
                        </DropdownToggle>
                        <DropdownMenu placement='bottom-end'>
                            <DropdownItem
                                icon='HeroCalendarPlus'
                                onClick={() => setIsOpenCrearFeriados(true)}>
                                Agregar feriados
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                    <CrearDiasCalendario
                        isOpen={isOpenCrearFeriados}
                        setIsOpen={setIsOpenCrearFeriados}
                    />
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <Card className='h-full overflow-auto'>
                    <CardHeader className='min-w-[700px]'>
                        <CardHeaderChild>{currentDate}</CardHeaderChild>
                        <CardHeaderChild>
                            <Button onClick={() => prev(true)} icon='HeroChevronDoubleLeft' />
                            <Button onClick={() => prev()} icon='HeroChevronLeft' />
                            <Button onClick={() => today()} icon='HeroCalendar' />
                            <Button onClick={() => next()} icon='HeroChevronRight' />
                            <Button onClick={() => next(true)} icon='HeroChevronDoubleRight' />
                            <Dropdown>
                                <DropdownToggle>
                                    <Button color='zinc' icon={CALENDAR_VIEW[viewMode].icon}>
                                        {CALENDAR_VIEW[viewMode].text}
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
                                height={700}
                                datesSet={handleDatesSet}
                                viewMode={viewMode}
                                events={eventosVacaciones}
                                dayCellContent={(props) => (
                                    <div
                                        className={classNames(
                                            'text-lg font-bold',
                                            props.date.getDay() === 0 ||
                                                listaDiasCalendario.some(
                                                    (dia) =>
                                                        dayjs(dia.fecha).format('DD-MM-YYYY') ===
                                                        dayjs(props.date).format('DD-MM-YYYY'),
                                                )
                                                ? 'text-red-600'
                                                : '',
                                        )}>
                                        <div>{dayjs(props.date).format('DD')}</div>
                                    </div>
                                )}
                                eventContent={renderEventContent}
                                eventClick={handleEventClick}
                                eventClassNames='truncate'
                                locale={esLocale}
                                // businessHours={{
                                // 	daysOfWeek: [ 1, 2, 3, 4, 5 ],
                                // }}
                                weekends={false}
                            />
                        </div>
                    </CardBody>
                </Card>
            </Container>
            <Modal isOpen={isOpenModalFeriado} setIsOpen={setIsOpenModalFeriado}>
                <ModalHeader>
                    <Badge className='text-xl'>Feriado — {feriadoSeleccionado?.fecha}</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='grid grid-cols-1 gap-3'>
                        <div className='flex gap-4'>
                            <div className='w-full'>
                                <Badge>Tipo</Badge>
                                <div className='ml-2 mt-1'>{feriadoSeleccionado?.tipo || '—'}</div>
                            </div>
                            <div className='w-full'>
                                <Badge>¿Es Irrenunciable?</Badge>
                                <div className='ml-2 mt-1'>
                                    {feriadoSeleccionado?.es_irrenunciable ? 'Sí' : 'No'}
                                </div>
                            </div>
                        </div>
                        <div>
                            <Badge>Descripción</Badge>
                            <div className='ml-2 mt-1'>{feriadoSeleccionado?.descripcion || '—'}</div>
                        </div>
                    </div>
                </ModalBody>
            </Modal>
            <Modal isOpen={isOpenModalDetalle} setIsOpen={setIsOpenModalDetalle}>
                <ModalHeader>
                    <Badge>Vacaciones {solicitudSeleccionada?.papeleta.nombre_empleado}</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='grid grid-cols-3'>
                        <div className='w-full'>
                            <Badge>Fecha Inicio</Badge>
                            <div className='ml-4'>{solicitudSeleccionada?.fecha_inicio}</div>
                        </div>
                        <div className='w-full'>
                            <Badge>Fecha Fin</Badge>
                            <div className='ml-4'>{solicitudSeleccionada?.fecha_fin}</div>
                        </div>
                        <div className='w-full'>
                            <Badge>Aprobado Por</Badge>
                            <div className='ml-4'>
                                {solicitudSeleccionada?.nombre_aprobado_rechazado_por}
                            </div>
                        </div>
                    </div>
                </ModalBody>
            </Modal>
        </PageWrapper>
    );
}

export default ListaDiasCalendarioV2;
