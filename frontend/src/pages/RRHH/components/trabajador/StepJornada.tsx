import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import classNames from 'classnames';
import { FormikProps } from 'formik';
import { useEffect } from 'react';
import {
    DIAS_SEMANA,
    HORAS_SEMANALES_OPTIONS,
    IFormValuesContratoTrabajador,
    ITurnoRotativo,
    TURNOS_PREDETERMINADOS,
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

const StepJornada = ({ formik }: Props) => {
    const { values, errors, touched, setFieldValue, setFieldTouched, handleChange, handleBlur } =
        formik;

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
            if (values.turnos_rotativo.length === 0) return '';
            return values.turnos_rotativo
                .map((turno) => {
                    const dias = turno.dias.join(',');
                    const nombre = turno.nombre || 'Turno';
                    return `${nombre} ${dias} ${turno.hora_inicio}-${turno.hora_fin}`;
                })
                .join(' | ');
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
    }, [values.jornada, values.dias_semana, values.hora_inicio, values.hora_fin, values.turnos_rotativo]);

    return (
        <div className='space-y-4'>
            {/* Jornada como cards */}
            <div>
                <Label className='mb-2 block'>
                    Jornada laboral <span className='text-red-500'>*</span>
                </Label>
                <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                    {JORNADA_CARDS.map((op) => (
                        <button
                            key={op.value}
                            type='button'
                            onClick={() => {
                                setFieldValue('jornada', op.value);
                                setFieldTouched('jornada', true, false);
                            }}
                            className={classNames(
                                'flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all',
                                values.jornada === op.value
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-zinc-200 hover:border-blue-300 dark:border-zinc-700 dark:hover:border-blue-600',
                            )}>
                            <span className='text-xs font-semibold leading-tight'>{op.label}</span>
                        </button>
                    ))}
                </div>
                {touched.jornada && errors.jornada && (
                    <p className='mt-1 text-xs text-red-500'>{errors.jornada}</p>
                )}
            </div>

            {/* Dias de la semana — oculto si jornada = turnos */}
            {values.jornada && values.jornada !== 'turnos' && (
                <div>
                    <Label className='mb-2 block'>Dias de trabajo</Label>
                    <div className='flex flex-wrap gap-2'>
                        {DIAS_SEMANA.map((dia) => {
                            const activo = values.dias_semana.includes(dia.key);
                            return (
                                <button
                                    key={dia.key}
                                    type='button'
                                    title={dia.label}
                                    onClick={() => toggleDia(dia.key)}
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
            )}

            {/* Horas semanales — oculto si jornada = turnos */}
            {values.jornada && values.jornada !== 'turnos' && (
                <div className='space-y-4'>
                    <div>
                        <Label htmlFor='horas_semanales'>Horas semanales</Label>
                        <Validation
                            isValid={!errors.horas_semanales}
                            isTouched={!!touched.horas_semanales}
                            invalidFeedback={errors.horas_semanales || ''}>
                            {values.jornada === 'completa' ? (
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
                            ) : (
                                <Input
                                    id='horas_semanales'
                                    name='horas_semanales'
                                    type='number'
                                    value={values.horas_semanales}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                />
                            )}
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
                            <Label htmlFor='hora_fin'>Hora fin</Label>
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
                    <div className='rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'>
                        <div className='text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Resumen horario</div>
                        <div className='mt-1 font-medium'>
                            {values.horario_detalle || 'Configura los días y la hora de inicio/finalización.'}
                        </div>
                    </div>
                </div>
            )}

            {/* Turnos rotativos — solo si jornada = turnos */}
            {values.jornada === 'turnos' && (
                <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                        <Label className='mb-0 block'>Configurar turnos</Label>
                        <div className='flex gap-2'>
                            <Button
                                type='button'
                                size='sm'
                                color='zinc'
                                onClick={() =>
                                    setFieldValue('turnos_rotativo', TURNOS_PREDETERMINADOS)
                                }>
                                Predeterminados
                            </Button>
                            {values.turnos_rotativo.length < 3 && (
                                <Button
                                    type='button'
                                    size='sm'
                                    color='blue'
                                    onClick={() =>
                                        setFieldValue('turnos_rotativo', [
                                            ...values.turnos_rotativo,
                                            {
                                                nombre: '',
                                                dias: [],
                                                hora_inicio: '08:00',
                                                hora_fin: '16:00',
                                            } as ITurnoRotativo,
                                        ])
                                    }>
                                    + Agregar turno
                                </Button>
                            )}
                        </div>
                    </div>
                    {values.turnos_rotativo.length === 0 && (
                        <p className='text-xs text-zinc-500'>
                            Sin turnos. Usa predeterminados o agrega uno.
                        </p>
                    )}
                    {values.turnos_rotativo.map((turno, idx) => (
                        <div
                            key={idx}
                            className='space-y-2 rounded-xl border-2 border-zinc-200 p-3 dark:border-zinc-700'>
                            <div className='flex items-center gap-2'>
                                <Input
                                    name={`turnos_rotativo.${idx}.nombre`}
                                    placeholder='Nombre del turno (Ej: Manana)'
                                    value={turno.nombre}
                                    onChange={(e) => {
                                        const updated = [...values.turnos_rotativo];
                                        updated[idx] = { ...updated[idx], nombre: e.target.value };
                                        setFieldValue('turnos_rotativo', updated);
                                    }}
                                />
                                <button
                                    type='button'
                                    onClick={() =>
                                        setFieldValue(
                                            'turnos_rotativo',
                                            values.turnos_rotativo.filter((_, i) => i !== idx),
                                        )
                                    }
                                    className='shrink-0 rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'>
                                    <svg
                                        className='h-4 w-4'
                                        fill='none'
                                        viewBox='0 0 24 24'
                                        stroke='currentColor'>
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M6 18L18 6M6 6l12 12'
                                        />
                                    </svg>
                                </button>
                            </div>
                            <div className='flex flex-wrap gap-1'>
                                {DIAS_SEMANA.map((dia) => {
                                    const activo = turno.dias.includes(dia.key);
                                    return (
                                        <button
                                            key={dia.key}
                                            type='button'
                                            title={dia.label}
                                            onClick={() => {
                                                const updated = [...values.turnos_rotativo];
                                                const dias = activo
                                                    ? turno.dias.filter((d) => d !== dia.key)
                                                    : [...turno.dias, dia.key];
                                                updated[idx] = { ...updated[idx], dias };
                                                setFieldValue('turnos_rotativo', updated);
                                            }}
                                            className={classNames(
                                                'flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold',
                                                activo
                                                    ? 'border-blue-500 bg-blue-500 text-white'
                                                    : 'border-zinc-300 text-zinc-600 dark:border-zinc-600 dark:text-zinc-400',
                                            )}>
                                            {dia.key}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className='grid grid-cols-2 gap-2'>
                                <div>
                                    <Label>Hora inicio</Label>
                                    <Input
                                        name={`turnos_rotativo.${idx}.hora_inicio`}
                                        type='time'
                                        value={turno.hora_inicio}
                                        onChange={(e) => {
                                            const updated = [...values.turnos_rotativo];
                                            updated[idx] = {
                                                ...updated[idx],
                                                hora_inicio: e.target.value,
                                            };
                                            setFieldValue('turnos_rotativo', updated);
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label>Hora fin</Label>
                                    <Input
                                        name={`turnos_rotativo.${idx}.hora_fin`}
                                        type='time'
                                        value={turno.hora_fin}
                                        onChange={(e) => {
                                            const updated = [...values.turnos_rotativo];
                                            updated[idx] = {
                                                ...updated[idx],
                                                hora_fin: e.target.value,
                                            };
                                            setFieldValue('turnos_rotativo', updated);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Campos adicionales */}
            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div>
                    <Label htmlFor='tiempo_colacion'>Tiempo de colacion (min)</Label>
                    <Input
                        id='tiempo_colacion'
                        name='tiempo_colacion'
                        type='number'
                        value={values.tiempo_colacion}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                </div>
                <div>
                    <Label htmlFor='lugar_firma'>Lugar de firma</Label>
                    <Input
                        id='lugar_firma'
                        name='lugar_firma'
                        value={values.lugar_firma}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder='Ej: Santiago, Chile'
                    />
                </div>
                <div>
                    <Label htmlFor='fecha_firma'>Fecha de firma</Label>
                    <Input
                        id='fecha_firma'
                        name='fecha_firma'
                        type='date'
                        value={values.fecha_firma}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                </div>
                <div className='md:col-span-2'>
                    <Label htmlFor='funciones'>Funciones</Label>
                    <Textarea
                        id='funciones'
                        name='funciones'
                        value={values.funciones}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                </div>
            </div>
        </div>
    );
};

export default StepJornada;

