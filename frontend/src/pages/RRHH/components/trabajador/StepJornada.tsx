import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import RadioCard from '@/components/form/RadioCard';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import ButtonGroup from '@/components/ui/ButtonGroup';
import classNames from 'classnames';
import { FormikProps } from 'formik';
import { useEffect, useState } from 'react';
import {
    DIAS_SEMANA,
    HORAS_SEMANALES_OPTIONS,
    IFormValuesContratoTrabajador,
} from './types';

interface Props {
    formik: FormikProps<IFormValuesContratoTrabajador>;
}

const JORNADA_CARDS = [
    { value: 'completa', label: 'Jornada completa' },
    { value: 'parcial', label: 'Jornada parcial' },
    { value: 'part_time', label: 'Part time' },
    { value: 'turnos', label: 'Turnos rotativos' },
] as const;

const TURNOS_PRESET = [
    { nombre: 'Manana', label: 'Mañana', hora_inicio: '06:00', hora_fin: '14:00' },
    { nombre: 'Tarde', label: 'Tarde', hora_inicio: '14:00', hora_fin: '22:00' },
    { nombre: 'Noche', label: 'Noche', hora_inicio: '22:00', hora_fin: '06:00' },
] as const;

const CICLO_ROTACION_OPTIONS = [
    { value: 'semanal', label: 'Semanal' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'mensual', label: 'Mensual' },
];

const HORAS_TURNO_OPTIONS = [
    { value: '6', label: '6 h' },
    { value: '8', label: '8 h' },
    { value: '10', label: '10 h' },
    { value: '12', label: '12 h' },
];

const StepJornada = ({ formik }: Props) => {
    const { values, errors, touched, setFieldValue, setFieldTouched, handleChange, handleBlur } =
        formik;

    const [cicloRotacion, setCicloRotacion] = useState('semanal');
    const [horasTurno, setHorasTurno] = useState('8');
    const [editingPreset, setEditingPreset] = useState<string | null>(null);
    const [editHoraInicio, setEditHoraInicio] = useState('');
    const [editHoraFin, setEditHoraFin] = useState('');
    const [presetOverrides, setPresetOverrides] = useState<Record<string, { hora_inicio: string; hora_fin: string }>>({});

    // Por defecto L-V al seleccionar jornada completa
    useEffect(() => {
        if (values.jornada === 'completa' && values.dias_semana.length === 0) {
            setFieldValue('dias_semana', ['L', 'M', 'X', 'J', 'V']);
        }
    }, [values.jornada]);

    const toggleDia = (key: string) => {
        const actual = values.dias_semana;
        const nuevo = actual.includes(key) ? actual.filter((d) => d !== key) : [...actual, key];
        setFieldValue('dias_semana', nuevo);
    };

    const buildHorarioDetalle = () => {
        if (values.jornada === 'turnos') {
            const turno = values.turnos_rotativo[0];
            if (!turno?.nombre) return '';
            const dias = turno.dias.join(', ');
            return `${turno.nombre} · ${turno.hora_inicio}\u2013${turno.hora_fin}${dias ? ` · ${dias}` : ''} · ciclo ${cicloRotacion}`;
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
    }, [values.jornada, values.dias_semana, values.hora_inicio, values.hora_fin, values.turnos_rotativo, cicloRotacion]);

    return (
        <div className='space-y-4'>
            {/* Jornada como cards */}
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

            {/* Horas semanales + Hora inicio/fin + Días + Resumen — oculto si jornada = turnos */}
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

            {/* Turnos rotativos — solo si jornada = turnos */}
            {values.jornada === 'turnos' && (
                <div className='space-y-4'>
                    {/* Tipo de turno */}
                    <div>
                        <Label className='mb-2 block'>Tipo de turno</Label>
                        <div className='grid grid-cols-3 gap-2'>
                            {TURNOS_PRESET.map((preset) => {
                                const selected = values.turnos_rotativo[0]?.nombre === preset.nombre;
                                const isEditing = editingPreset === preset.nombre;
                                const efectivo = presetOverrides[preset.nombre] ?? {
                                    hora_inicio: preset.hora_inicio,
                                    hora_fin: preset.hora_fin,
                                };
                                return (
                                    <div
                                        key={preset.nombre}
                                        className={classNames(
                                            'rounded-xl border-2 p-3 transition-all',
                                            !isEditing && 'cursor-pointer',
                                            selected
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-zinc-200 hover:border-blue-300 dark:border-zinc-700 dark:hover:border-blue-600',
                                        )}
                                        onClick={() => {
                                            if (!isEditing) {
                                                setFieldValue('turnos_rotativo', [{
                                                    nombre: preset.nombre,
                                                    dias: values.turnos_rotativo[0]?.dias.length
                                                        ? values.turnos_rotativo[0].dias
                                                        : ['L', 'M', 'X', 'J', 'V'],
                                                    hora_inicio: efectivo.hora_inicio,
                                                    hora_fin: efectivo.hora_fin,
                                                }]);
                                            }
                                        }}>
                                        <div className='flex items-center justify-between'>
                                            <div className='text-xs font-semibold'>{preset.label}</div>
                                            <button
                                                type='button'
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingPreset(preset.nombre);
                                                    setEditHoraInicio(efectivo.hora_inicio);
                                                    setEditHoraFin(efectivo.hora_fin);
                                                }}
                                                className='ml-1 rounded p-0.5 text-zinc-400 transition-colors hover:text-blue-500'>
                                                <svg className='h-3 w-3' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' />
                                                </svg>
                                            </button>
                                        </div>
                                        {isEditing ? (
                                            <div
                                                className='mt-2 space-y-1.5'
                                                onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type='time'
                                                    value={editHoraInicio}
                                                    onChange={(e) => setEditHoraInicio(e.target.value)}
                                                    className='w-full rounded border border-zinc-300 px-1.5 py-0.5 text-xs dark:border-zinc-600 dark:bg-zinc-800'
                                                />
                                                <input
                                                    type='time'
                                                    value={editHoraFin}
                                                    onChange={(e) => setEditHoraFin(e.target.value)}
                                                    className='w-full rounded border border-zinc-300 px-1.5 py-0.5 text-xs dark:border-zinc-600 dark:bg-zinc-800'
                                                />
                                                <div className='flex gap-1'>
                                                    <button
                                                        type='button'
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const updated = { hora_inicio: editHoraInicio, hora_fin: editHoraFin };
                                                            setPresetOverrides((prev) => ({
                                                                ...prev,
                                                                [preset.nombre]: updated,
                                                            }));
                                                            if (values.turnos_rotativo[0]?.nombre === preset.nombre) {
                                                                setFieldValue('turnos_rotativo', [{
                                                                    ...values.turnos_rotativo[0],
                                                                    ...updated,
                                                                }]);
                                                            }
                                                            setEditingPreset(null);
                                                        }}
                                                        className='flex-1 rounded bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-blue-600'>
                                                        Guardar
                                                    </button>
                                                    <button
                                                        type='button'
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingPreset(null);
                                                        }}
                                                        className='rounded border border-zinc-300 px-2 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800'>
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className='mt-1 text-[10px] text-zinc-500 dark:text-zinc-400'>
                                                {efectivo.hora_inicio}{'–'}{efectivo.hora_fin}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Ciclo rotación + Horas / turno */}
                    <div className='grid grid-cols-2 gap-3'>
                        <div>
                            <Label htmlFor='ciclo_rotacion'>Ciclo rotacion</Label>
                            <SelectReact
                                inputId='ciclo_rotacion'
                                name='ciclo_rotacion'
                                options={CICLO_ROTACION_OPTIONS as TSelectOption[]}
                                value={CICLO_ROTACION_OPTIONS.find((o) => o.value === cicloRotacion) ?? null}
                                onChange={(opt) =>
                                    setCicloRotacion(opt ? (opt as TSelectOption).value : 'semanal')
                                }
                                placeholder='Selecciona...'
                            />
                        </div>
                        <div>
                            <Label>Horas / turno</Label>
                            <SelectReact
                                name='horas_turno'
                                options={HORAS_TURNO_OPTIONS as TSelectOption[]}
                                value={HORAS_TURNO_OPTIONS.find((o) => o.value === horasTurno) ?? null}
                                onChange={(opt) =>
                                    setHorasTurno(opt ? (opt as TSelectOption).value : '8')
                                }
                                placeholder='Selecciona...'
                            />
                        </div>
                    </div>

                    {/* Días del turno */}
                    <div>
                        <Label className='mb-2 block'>Dias del turno</Label>
                        <div className='flex flex-wrap gap-2'>
                            {DIAS_SEMANA.map((dia) => {
                                const diasTurno = values.turnos_rotativo[0]?.dias ?? [];
                                const activo = diasTurno.includes(dia.key);
                                return (
                                    <button
                                        key={dia.key}
                                        type='button'
                                        title={dia.label}
                                        onClick={() => {
                                            const current = values.turnos_rotativo[0] ?? {
                                                nombre: '',
                                                dias: [],
                                                hora_inicio: '',
                                                hora_fin: '',
                                            };
                                            const nuevosDias = activo
                                                ? current.dias.filter((d) => d !== dia.key)
                                                : [...current.dias, dia.key];
                                            setFieldValue('turnos_rotativo', [{ ...current, dias: nuevosDias }]);
                                        }}
                                        className={classNames(
                                            'flex h-9 w-9 items-center justify-center rounded-lg border-2 text-xs font-semibold transition-all',
                                            activo
                                                ? 'border-blue-500 bg-blue-500 text-white'
                                                : 'border-zinc-300 bg-transparent text-zinc-600 hover:border-blue-400 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-blue-500',
                                        )}>
                                        {dia.key}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Resumen */}
                    {values.turnos_rotativo[0]?.nombre && (
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

