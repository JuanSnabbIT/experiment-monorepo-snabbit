import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import RadioCard from '@/components/form/RadioCard';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import ButtonGroup from '@/components/ui/ButtonGroup';
import { ITurnoLaboral } from '@/interface/rrhh.interface';
import { useGetTurnosLaboralQuery } from '@/store/slices/rrhh/turnoLaboralApi';
import classNames from 'classnames';
import { FormikProps } from 'formik';
import { useEffect } from 'react';
import {
    DIAS_SEMANA,
    HORAS_SEMANALES_OPTIONS,
    IFormValuesContratoTrabajador,
} from './types';

interface Props {
    formik: FormikProps<IFormValuesContratoTrabajador>;
    empresaClienteId: number | '';
}

const JORNADA_CARDS = [
    { value: 'completa', label: 'Jornada completa' },
    { value: 'parcial', label: 'Jornada parcial' },
    { value: 'turnos', label: 'Turnos rotativos' },
] as const;

const CICLO_ROTACION_OPTIONS = [
    { value: 'semanal', label: 'Semanal' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'mensual', label: 'Mensual' },
];

const StepJornada = ({ formik, empresaClienteId }: Props) => {
    const { values, errors, touched, setFieldValue, setFieldTouched, handleChange, handleBlur } =
        formik;

    const { data: turnosCatalogo = [], isLoading: cargandoTurnos } = useGetTurnosLaboralQuery(
        { empresa_id: empresaClienteId },
        { skip: !empresaClienteId || values.jornada !== 'turnos' },
    );

    // Por defecto L-V al seleccionar jornada completa
    useEffect(() => {
        if (values.jornada === 'completa' && values.dias_semana.length === 0) {
            setFieldValue('dias_semana', ['L', 'M', 'X', 'J', 'V']);
        }
        // Limpiar turnos al cambiar de jornada
        if (values.jornada !== 'turnos' && values.turnos_rotativo.length > 0) {
            setFieldValue('turnos_rotativo', []);
        }
    }, [values.jornada]);

    const toggleDia = (key: string) => {
        const actual = values.dias_semana;
        const nuevo = actual.includes(key) ? actual.filter((d) => d !== key) : [...actual, key];
        setFieldValue('dias_semana', nuevo);
    };

    // Multi-selección de turnos del catálogo
    const isSelected = (nombre: string) =>
        values.turnos_rotativo.some((t) => t.nombre === nombre);

    const toggleTurno = (turno: ITurnoLaboral) => {
        if (isSelected(turno.nombre)) {
            setFieldValue(
                'turnos_rotativo',
                values.turnos_rotativo.filter((t) => t.nombre !== turno.nombre),
            );
        } else {
            setFieldValue('turnos_rotativo', [
                ...values.turnos_rotativo,
                {
                    nombre: turno.nombre,
                    dias: turno.dias_semana,
                    hora_inicio: turno.hora_inicio,
                    hora_fin: turno.hora_fin,
                },
            ]);
        }
    };

    const toggleDiaTurno = (nombreTurno: string, diaKey: string) => {
        setFieldValue(
            'turnos_rotativo',
            values.turnos_rotativo.map((t) => {
                if (t.nombre !== nombreTurno) return t;
                const nuevosDias = t.dias.includes(diaKey)
                    ? t.dias.filter((d) => d !== diaKey)
                    : [...t.dias, diaKey];
                return { ...t, dias: nuevosDias };
            }),
        );
    };

    const buildHorarioDetalle = () => {
        if (values.jornada === 'turnos') {
            if (values.turnos_rotativo.length === 0) return '';
            const resumen = values.turnos_rotativo
                .map((t) => `${t.nombre} ${t.hora_inicio}–${t.hora_fin}`)
                .join(' | ');
            return `${resumen} · ciclo ${values.ciclo_rotacion}`;
        }
        if (values.dias_semana.length === 0 || !values.hora_inicio || !values.hora_fin) {
            return '';
        }
        return `${values.dias_semana.join(', ')} ${values.hora_inicio}-${values.hora_fin}`;
    };

    useEffect(() => {
        const detalle = buildHorarioDetalle();
        if (values.horario_detalle !== detalle) {
            setFieldValue('horario_detalle', detalle);
        }
    }, [values.jornada, values.dias_semana, values.hora_inicio, values.hora_fin, values.turnos_rotativo, values.ciclo_rotacion]);

    return (
        <div className='space-y-4'>
            {/* Tipo de jornada */}
            <div>
                <Label className='mb-2 block'>
                    Jornada laboral <span className='text-red-500'>*</span>
                </Label>
                <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                    {JORNADA_CARDS.map((op) => (
                        <RadioCard
                            key={op.value}
                            id={`jornada_${op.value}`}
                            name='jornada'
                            value={op.value}
                            checked={values.jornada === op.value}
                            onChange={() => {
                                setFieldValue('jornada', op.value);
                                setFieldTouched('jornada', true, false);
                            }}>
                            <span className='text-xs font-semibold leading-tight'>{op.label}</span>
                        </RadioCard>
                    ))}
                </div>
                {touched.jornada && errors.jornada && (
                    <p className='mt-1 text-xs text-red-500'>{errors.jornada}</p>
                )}
            </div>

            {/* Jornada completa / parcial */}
            {values.jornada && values.jornada !== 'turnos' && (
                <div className='space-y-4'>
                    <div>
                        <Label htmlFor='horas_semanales'>Horas semanales</Label>
                        <Validation
                            isValid={!errors.horas_semanales}
                            isTouched={!!touched.horas_semanales}
                            invalidFeedback={errors.horas_semanales || ''}>
                            <SelectReact
                                name='horas_semanales'
                                isCreatable
                                options={HORAS_SEMANALES_OPTIONS as TSelectOption[]}
                                placeholder='Selecciona o escribe horas...'
                                value={
                                    values.horas_semanales !== ''
                                        ? (HORAS_SEMANALES_OPTIONS.find(
                                              (o) => o.value === String(values.horas_semanales),
                                          ) ?? {
                                              value: String(values.horas_semanales),
                                              label: `${values.horas_semanales} hrs`,
                                          })
                                        : null
                                }
                                onChange={(opt) => {
                                    const val = opt ? (opt as TSelectOption).value : '';
                                    setFieldValue(
                                        'horas_semanales',
                                        val !== '' ? Number(val) || val : '',
                                    );
                                }}
                            />
                        </Validation>
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                        <div>
                            <Label htmlFor='hora_inicio'>Hora inicio</Label>
                            <Input
                                id='hora_inicio'
                                name='hora_inicio'
                                type='time'
                                value={values.hora_inicio}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                        </div>
                        <div>
                            <Label htmlFor='hora_fin'>Hora termino</Label>
                            <Input
                                id='hora_fin'
                                name='hora_fin'
                                type='time'
                                value={values.hora_fin}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                        </div>
                    </div>
                    <div>
                        <Label className='mb-2 block'>Dias trabajados</Label>
                        <ButtonGroup>
                            {DIAS_SEMANA.map((dia) => {
                                const activo = values.dias_semana.includes(dia.key);
                                return (
                                    <Button
                                        key={dia.key}
                                        title={dia.label}
                                        size='sm'
                                        variant={activo ? 'solid' : 'outline'}
                                        color={activo ? 'blue' : 'zinc'}
                                        isActive={activo}
                                        onClick={() => toggleDia(dia.key)}>
                                        {dia.key}
                                    </Button>
                                );
                            })}
                        </ButtonGroup>
                    </div>
                    <div className='rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'>
                        <div className='text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Resumen horario</div>
                        <div className='mt-1 font-medium'>
                            {values.horario_detalle || 'Configura los dias y la hora de inicio/finalizacion.'}
                        </div>
                    </div>
                </div>
            )}

            {/* Turnos rotativos */}
            {values.jornada === 'turnos' && (
                <div className='space-y-4'>
                    <div>
                        <Label className='mb-2 block'>
                            Turnos disponibles{' '}
                            <span className='text-red-500'>*</span>
                        </Label>
                        {cargandoTurnos ? (
                            <p className='py-4 text-center text-xs text-zinc-400'>Cargando turnos...</p>
                        ) : turnosCatalogo.length === 0 ? (
                            <p className='py-4 text-center text-xs text-zinc-400'>
                                No hay turnos configurados para esta empresa.
                            </p>
                        ) : (
                            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                                {turnosCatalogo.map((turno) => {
                                    const selected = isSelected(turno.nombre);
                                    return (
                                        <div
                                            key={turno.id}
                                            className={classNames(
                                                'cursor-pointer rounded-xl border-2 p-3 transition-all',
                                                selected
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-zinc-200 hover:border-blue-300 dark:border-zinc-700 dark:hover:border-blue-600',
                                            )}
                                            onClick={() => toggleTurno(turno)}>
                                            <div className='flex items-start justify-between gap-1'>
                                                <div>
                                                    <div className='text-xs font-semibold leading-tight'>
                                                        {turno.nombre}
                                                    </div>
                                                    <div className='mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400'>
                                                        {turno.hora_inicio}–{turno.hora_fin}
                                                        {turno.horas_turno && (
                                                            <span className='ml-1'>· {turno.horas_turno}h</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className='flex flex-col items-end gap-1'>
                                                    {selected && (
                                                        <svg className='h-4 w-4 flex-shrink-0 text-blue-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                                                        </svg>
                                                    )}
                                                    <span className={classNames(
                                                        'inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                                                        turno.es_global
                                                            ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                                                            : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
                                                    )}>
                                                        {turno.es_global ? 'Global' : 'De empresa'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {touched.turnos_rotativo && errors.turnos_rotativo && (
                            <p className='mt-1 text-xs text-red-500'>
                                {typeof errors.turnos_rotativo === 'string' ? errors.turnos_rotativo : 'Selecciona al menos un turno'}
                            </p>
                        )}
                    </div>

                    {/* Días por turno seleccionado */}
                    {values.turnos_rotativo.length > 0 && (
                        <div className='space-y-3'>
                            <Label className='block'>Dias por turno</Label>
                            {values.turnos_rotativo.map((turno) => (
                                <div key={turno.nombre} className='rounded-xl border border-zinc-200 p-3 dark:border-zinc-700'>
                                    <div className='mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200'>
                                        {turno.nombre}
                                        <span className='ml-2 font-normal text-zinc-400'>
                                            {turno.hora_inicio}–{turno.hora_fin}
                                        </span>
                                    </div>
                                    <div className='flex flex-wrap gap-1.5'>
                                        {DIAS_SEMANA.map((dia) => {
                                            const activo = turno.dias.includes(dia.key);
                                            return (
                                                <button
                                                    key={dia.key}
                                                    type='button'
                                                    title={dia.label}
                                                    onClick={() => toggleDiaTurno(turno.nombre, dia.key)}
                                                    className={classNames(
                                                        'flex h-8 w-8 items-center justify-center rounded-lg border-2 text-xs font-semibold transition-all',
                                                        activo
                                                            ? 'border-blue-500 bg-blue-500 text-white'
                                                            : 'border-zinc-300 bg-transparent text-zinc-600 hover:border-blue-400 dark:border-zinc-600 dark:text-zinc-400',
                                                    )}>
                                                    {dia.key}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Ciclo de rotación */}
                    <div>
                        <Label htmlFor='ciclo_rotacion'>Ciclo de rotacion</Label>
                        <SelectReact
                            inputId='ciclo_rotacion'
                            name='ciclo_rotacion'
                            options={CICLO_ROTACION_OPTIONS as TSelectOption[]}
                            value={CICLO_ROTACION_OPTIONS.find((o) => o.value === values.ciclo_rotacion) ?? null}
                            onChange={(opt) =>
                                setFieldValue('ciclo_rotacion', opt ? (opt as TSelectOption).value : 'semanal')
                            }
                            placeholder='Selecciona...'
                        />
                    </div>

                    {/* Resumen */}
                    {values.horario_detalle && (
                        <div className='rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'>
                            <div className='text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Resumen horario</div>
                            <div className='mt-1 font-medium'>{values.horario_detalle}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StepJornada;
