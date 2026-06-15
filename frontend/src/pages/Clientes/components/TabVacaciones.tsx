import React, { useEffect, useState } from 'react';
import Radio, { RadioGroup } from '@/components/form/Radio';
import Textarea from '@/components/form/Textarea';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import themeConfig from '@/config/theme.config';
import type { IDiaCalendario, ISolicitudVacaciones } from '@/interface/calendario.interface';
import type { IUsuarioEmpresa } from '@/interface/empresas.interface';
import { listaDiasCalendarioThunk, useAppDispatch, useAppSelector } from '@/store';
import {
    useCrearSolicitudVacacionesMutation,
    useGetSolicitudesVacacionesPorUsuarioQuery,
} from '@/store/slices/vacaciones/vacacionesApi';
import es from 'date-fns/locale/es';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { DateRange, Range, RangeKeyDict } from 'react-date-range';
import { toast } from 'react-toastify';
import colors from 'tailwindcss/colors';
import * as Yup from 'yup';
import calcularDiasHabilesConCalendario from '@/pages/Calendario/utils/calcularDiasHabilesConCalendario';

interface Props {
    usuario: IUsuarioEmpresa;
}

const ESTADO_COLOR: Record<string, 'amber' | 'emerald' | 'red' | 'zinc'> = {
    '1': 'amber',
    '2': 'emerald',
    '3': 'red',
};

const Campo = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
        <p className='text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
            {label}
        </p>
        <p className='mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-100'>{value ?? '—'}</p>
    </div>
);

interface ModalPedirVacacionesProps {
    isOpen: boolean;
    onClose: () => void;
    usuario: IUsuarioEmpresa;
    solicitudes: ReturnType<typeof useGetSolicitudesVacacionesPorUsuarioQuery>['data'];
}

const ModalPedirVacaciones = ({
    isOpen,
    onClose,
    usuario,
    solicitudes = [],
}: ModalPedirVacacionesProps) => {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaDiasCalendario } = useAppSelector((state) => state.calendario);

    const [esExtraordinaria, setEsExtraordinaria] = useState<'true' | 'false'>('false');
    const [crearSolicitud, { isLoading }] = useCrearSolicitudVacacionesMutation();

    const [ranges, setRanges] = useState<Range[]>([
        {
            startDate: new Date(),
            endDate: new Date(),
            color: colors.blue[themeConfig.themeColorShade],
            disabled: false,
            key: 'selection',
        },
    ]);

    // Load calendar days when modal opens
    useEffect(() => {
        if (isOpen && listaDiasCalendario.length === 0) {
            dispatch(listaDiasCalendarioThunk());
        }
    }, [isOpen]);

    // Rebuild disabled ranges when source data changes
    useEffect(() => {
        setRanges((prev) => {
            const seleccion = prev.find((r) => r.key === 'selection') ?? {
                startDate: new Date(),
                endDate: new Date(),
                color: colors.blue[themeConfig.themeColorShade],
                disabled: false,
                key: 'selection',
            };

            const nuevos: Range[] = [seleccion];

            // Approved vacations → disabled green
            solicitudes
                .filter((s: ISolicitudVacaciones) => s.estado === '2')
                .forEach((s: ISolicitudVacaciones, i: number) => {
                    nuevos.push({
                        startDate: dayjs(s.fecha_inicio).toDate(),
                        endDate: dayjs(s.fecha_fin).toDate(),
                        color: colors.emerald[themeConfig.themeColorShade],
                        disabled: true,
                        key: `tomada_${i}`,
                    });
                });

            // Holidays → disabled red
            listaDiasCalendario
                .filter((d: IDiaCalendario) => d.es_feriado)
                .forEach((d: IDiaCalendario, i: number) => {
                    nuevos.push({
                        startDate: dayjs(d.fecha).toDate(),
                        endDate: dayjs(d.fecha).toDate(),
                        color: colors.red[themeConfig.themeColorShade],
                        disabled: true,
                        key: `feriado_${i}`,
                    });
                });

            return nuevos;
        });
    }, [listaDiasCalendario, solicitudes]);

    // Sync DateRange selection → formik
    useEffect(() => {
        const sel = ranges.find((r) => r.key === 'selection');
        if (sel?.startDate) {
            formik.setFieldValue('fecha_inicio', sel.startDate.toDateString());
        }
        if (sel?.endDate) {
            formik.setFieldValue('fecha_fin', sel.endDate.toDateString());
        }
    }, [ranges]);

    const validationSchema = Yup.object()
        .shape({
            fecha_inicio: Yup.string().required('Requerido'),
            fecha_fin: Yup.string().required('Requerido'),
            comentario: Yup.string().nullable(),
        })
        .test('dias-disponibles', 'Sin días suficientes', function (values) {
            if (esExtraordinaria === 'true') return true;
            const { fecha_inicio, fecha_fin } = values;
            if (!fecha_inicio || !fecha_fin) return true;
            const diasHabiles = calcularDiasHabilesConCalendario(
                new Date(fecha_inicio),
                new Date(fecha_fin),
                listaDiasCalendario,
            );
            const disponibles = usuario.papeleta?.dias_disponibles ?? 0;
            if (disponibles < diasHabiles) {
                return this.createError({
                    path: 'fecha_fin',
                    message: `Los días seleccionados (${diasHabiles}) exceden los disponibles (${disponibles}).`,
                });
            }
            return true;
        });

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            fecha_inicio: '',
            fecha_fin: '',
            comentario: '',
        },
        validationSchema,
        onSubmit: async (values, { resetForm }) => {
            try {
                await crearSolicitud({
                    usuario_empresa: usuario.id,
                    fecha_inicio: dayjs(values.fecha_inicio).format('YYYY-MM-DD'),
                    fecha_fin: dayjs(values.fecha_fin).format('YYYY-MM-DD'),
                    es_extraordinaria: esExtraordinaria === 'true',
                    comentario: values.comentario,
                    creado_por: personalizacionUsuario?.usuario,
                }).unwrap();
                toast.success('Solicitud creada', { autoClose: 1500 });
                handleClose(resetForm);
            } catch (error: any) {
                const msg =
                    error?.data?.[0] ??
                    error?.data?.detail ??
                    'Error al crear la solicitud';
                toast.error(msg);
            }
        },
    });

    const handleClose = (resetFormFn?: () => void) => {
        (resetFormFn ?? formik.resetForm)();
        setEsExtraordinaria('false');
        setRanges([
            {
                startDate: new Date(),
                endDate: new Date(),
                color: colors.blue[themeConfig.themeColorShade],
                disabled: false,
                key: 'selection',
            },
        ]);
        onClose();
    };

    const diasHabiles = formik.values.fecha_inicio && formik.values.fecha_fin
        ? calcularDiasHabilesConCalendario(
              new Date(formik.values.fecha_inicio),
              new Date(formik.values.fecha_fin),
              listaDiasCalendario,
          )
        : null;

    return (
        <Modal isOpen={isOpen} setIsOpen={(v) => { if (!v) handleClose(); }} size='md'>
            <ModalHeader>
                Pedir vacaciones — {usuario.nombre_usuario}
            </ModalHeader>
            <ModalBody>
                <div className='space-y-4'>
                    {/* Stats */}
                    <div className='grid grid-cols-3 gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50'>
                        <div className='text-center'>
                            <p className='text-xs font-semibold uppercase tracking-wider text-zinc-400'>
                                Disponibles
                            </p>
                            <p className='text-lg font-bold text-emerald-600 dark:text-emerald-400'>
                                {usuario.papeleta?.dias_disponibles ?? '—'}
                            </p>
                        </div>
                        <div className='text-center'>
                            <p className='text-xs font-semibold uppercase tracking-wider text-zinc-400'>
                                Tomados
                            </p>
                            <p className='text-lg font-bold text-zinc-700 dark:text-zinc-200'>
                                {usuario.papeleta?.dias_tomados ?? '—'}
                            </p>
                        </div>
                        <div className='text-center'>
                            <p className='text-xs font-semibold uppercase tracking-wider text-zinc-400'>
                                Días hábiles sel.
                            </p>
                            <p className='text-lg font-bold text-blue-600 dark:text-blue-400'>
                                {diasHabiles ?? '—'}
                            </p>
                        </div>
                    </div>

                    {/* Tipo */}
                    <div className='flex items-center gap-4'>
                        <p className='text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                            ¿Es extraordinaria?
                        </p>
                        <RadioGroup isInline>
                            <Radio
                                label='No'
                                name='extraordinaria_no'
                                value='false'
                                selectedValue={esExtraordinaria}
                                onChange={() => setEsExtraordinaria('false')}
                            />
                            <Radio
                                label='Sí'
                                name='extraordinaria_si'
                                value='true'
                                selectedValue={esExtraordinaria}
                                onChange={() => setEsExtraordinaria('true')}
                            />
                        </RadioGroup>
                    </div>

                    {/* Calendar */}
                    <div className='flex justify-center'>
                        <DateRange
                            showPreview
                            locale={es}
                            ranges={ranges}
                            showDateDisplay={false}
                            maxDate={dayjs().add(1, 'year').toDate()}
                            onChange={(item: RangeKeyDict) => {
                                const sel = item.selection;
                                setRanges((prev) =>
                                    prev.map((r) =>
                                        r.key === 'selection'
                                            ? { ...r, startDate: sel.startDate, endDate: sel.endDate }
                                            : r,
                                    ),
                                );
                            }}
                        />
                    </div>

                    {/* Validation error */}
                    {formik.errors.fecha_fin && (
                        <p className='text-center text-sm font-medium text-red-500'>
                            {formik.errors.fecha_fin}
                        </p>
                    )}

                    {/* Comentario */}
                    <div>
                        <p className='mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                            Comentario
                        </p>
                        <Textarea
                            name='comentario'
                            rows={3}
                            value={formik.values.comentario}
                            onChange={formik.handleChange}
                        />
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button variant='default' onClick={() => handleClose()} isDisable={isLoading}>
                    Cancelar
                </Button>
                <Button
                    variant='solid'
                    onClick={() => formik.handleSubmit()}
                    isLoading={isLoading}
                    isDisable={isLoading}>
                    Crear solicitud
                </Button>
            </ModalFooter>
        </Modal>
    );
};

const TabVacaciones = ({ usuario }: Props) => {
    const papeleta = usuario.papeleta;
    const [modalOpen, setModalOpen] = useState(false);

    const { data: solicitudes = [], isLoading } = useGetSolicitudesVacacionesPorUsuarioQuery(
        usuario.id,
    );

    const pendientes = solicitudes.filter((s) => s.estado === '1').length;
    const ordenadas = [...solicitudes].sort(
        (a, b) => dayjs(b.fecha_solicitud).valueOf() - dayjs(a.fecha_solicitud).valueOf(),
    );

    return (
        <div className='space-y-4'>
            {/* ── Resumen ──────────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <span>Resumen de vacaciones</span>
                    {pendientes > 0 && (
                        <Badge color='amber'>{pendientes} pendiente{pendientes > 1 ? 's' : ''}</Badge>
                    )}
                </CardHeader>
                <CardBody>
                    <div className='grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3'>
                        <Campo
                            label='Días disponibles'
                            value={
                                <span className='text-lg font-bold text-emerald-600 dark:text-emerald-400'>
                                    {papeleta?.dias_disponibles ?? '—'}
                                </span>
                            }
                        />
                        <Campo
                            label='Días tomados'
                            value={papeleta?.dias_tomados ?? '—'}
                        />
                        <Campo
                            label='Antigüedad'
                            value={
                                papeleta?.dias_corridos
                                    ? `${papeleta.dias_corridos.dias} d / ${papeleta.dias_corridos.meses} m / ${papeleta.dias_corridos.años} a`
                                    : '—'
                            }
                        />
                    </div>
                </CardBody>
            </Card>

            {/* ── Historial de solicitudes ──────────────────────────── */}
            <Card>
                <CardHeader>
                    <div className='flex w-full items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <span>Historial de solicitudes</span>
                            {solicitudes.length > 0 && (
                                <Badge color='zinc'>{solicitudes.length}</Badge>
                            )}
                        </div>
                        <Button
                            variant='solid'
                            size='sm'
                            icon='HeroPlus'
                            onClick={() => setModalOpen(true)}>
                            Pedir vacaciones
                        </Button>
                    </div>
                </CardHeader>
                <CardBody className='p-0'>
                    {isLoading ? (
                        <div className='space-y-2 p-4'>
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className='h-8 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800'
                                />
                            ))}
                        </div>
                    ) : solicitudes.length === 0 ? (
                        <p className='p-4 text-sm text-zinc-400 dark:text-zinc-500'>
                            Sin solicitudes de vacaciones registradas.
                        </p>
                    ) : (
                        <Table>
                            <THead>
                                <Tr>
                                    <Th>Período</Th>
                                    <Th>Días</Th>
                                    <Th>Tipo</Th>
                                    <Th>Estado</Th>
                                    <Th>Solicitado</Th>
                                    <Th>Gestionado por</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {ordenadas.map((s) => {
                                    const dias = dayjs(s.fecha_fin).diff(
                                        dayjs(s.fecha_inicio),
                                        'day',
                                    ) + 1;
                                    return (
                                        <Tr key={s.id}>
                                            <Td>
                                                <span className='font-medium'>
                                                    {dayjs(s.fecha_inicio).format('DD/MM/YYYY')}
                                                </span>
                                                <span className='mx-1 text-zinc-400'>–</span>
                                                {dayjs(s.fecha_fin).format('DD/MM/YYYY')}
                                            </Td>
                                            <Td>
                                                <span className='font-medium'>{dias}</span>
                                            </Td>
                                            <Td>
                                                {s.es_extraordinaria ? (
                                                    <Badge color='violet' variant='outline'>
                                                        Extraordinaria
                                                    </Badge>
                                                ) : (
                                                    <Badge color='zinc' variant='outline'>
                                                        Normal
                                                    </Badge>
                                                )}
                                            </Td>
                                            <Td>
                                                <Badge
                                                    color={ESTADO_COLOR[s.estado] ?? 'zinc'}>
                                                    {s.estado_label}
                                                </Badge>
                                            </Td>
                                            <Td className='text-zinc-500'>
                                                {dayjs(s.fecha_solicitud).format('DD/MM/YYYY')}
                                            </Td>
                                            <Td className='text-zinc-500'>
                                                {s.nombre_aprobado_rechazado_por || '—'}
                                            </Td>
                                        </Tr>
                                    );
                                })}
                            </TBody>
                        </Table>
                    )}
                </CardBody>
            </Card>

            <ModalPedirVacaciones
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                usuario={usuario}
                solicitudes={solicitudes}
            />
        </div>
    );
};

export default TabVacaciones;
