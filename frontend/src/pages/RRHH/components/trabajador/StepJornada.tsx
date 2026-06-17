import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import RadioCard from '@/components/form/RadioCard';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import ButtonGroup from '@/components/ui/ButtonGroup';
import { useGetGruposTurnoQuery } from '@/store/slices/rrhh/grupoTurnoApi';
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
    onConfigureTurnos?: () => void;
}

const JORNADA_CARDS = [
    { value: 'completa', label: 'Jornada completa' },
    { value: 'parcial', label: 'Jornada parcial' },
    { value: 'turnos', label: 'Turnos rotativos' },
] as const;

const StepJornada = ({ formik, empresaClienteId }: Props) => {
    const { values, errors, touched, setFieldValue, setFieldTouched, handleChange, handleBlur } =
        formik;

    const { data: gruposTurno = [], isLoading: cargandoGrupos } = useGetGruposTurnoQuery(
        { empresa_id: empresaClienteId },
        { skip: !empresaClienteId || values.jornada !== 'turnos' },
    );

    // Por defecto L-V al seleccionar jornada completa
    useEffect(() => {
        if (values.jornada === 'completa' && values.dias_semana.length === 0) {
            setFieldValue('dias_semana', ['L', 'M', 'X', 'J', 'V']);
        }
        // Limpiar turnos al cambiar de jornada
        if (values.jornada !== 'turnos') {
            if (values.turnos_rotativo.length > 0) setFieldValue('turnos_rotativo', []);
            if (values.grupo_turno_id !== null) setFieldValue('grupo_turno_id', null);
        }
    }, [values.jornada]);

    const toggleDia = (key: string) => {
        const actual = values.dias_semana;
        const nuevo = actual.includes(key) ? actual.filter((d) => d !== key) : [...actual, key];
        setFieldValue('dias_semana', nuevo);
    };

    const buildHorarioDetalle = () => {
        if (values.jornada === 'turnos') {
            if (!values.grupo_turno_id) return '';
            const grupo = gruposTurno.find((g) => g.id === values.grupo_turno_id);
            if (!grupo) return '';
            return `Grupo: ${grupo.nombre} · ciclo ${grupo.ciclo}`;
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
    }, [values.jornada, values.dias_semana, values.hora_inicio, values.hora_fin, values.grupo_turno_id, gruposTurno]);

    return (
        <div className='space-y-4'>
            {/* Tipo de jornada */}
            <div>
                <Label className='mb-2 block'>
                    Jornada laboral <span className='text-red-500'>*</span>
                </Label>
                <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
                    {JORNADA_CARDS.map((op) => (
                        <RadioCard
                            key={op.value}
                            id={`jornada_${op.value}`}
                            name='jornada'
                            value={op.value}
                            checked={values.jornada === op.value}
                            onChange={() => {
                                setFieldValue('jornada', op.value, false);
                                setFieldValue('horas_semanales', '', false);
                                setFieldValue('hora_inicio', '', false);
                                setFieldValue('hora_fin', '', false);
                                setFieldValue('dias_semana', [], false);
                                setFieldValue('grupo_turno_id', null, false);
                                setFieldValue('turnos_rotativo', [], false);
                                setFieldValue('horario_detalle', '', false);
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
                    {/* Grupo de turnos */}
                    <div>
                        <Label htmlFor='grupo_turno_id'>
                            Grupo de turnos <span className='text-red-500'>*</span>
                        </Label>
                        <Validation
                            isValid={!errors.grupo_turno_id}
                            isTouched={!!touched.grupo_turno_id}
                            invalidFeedback={errors.grupo_turno_id as string || ''}>
                            <SelectReact
                                inputId='grupo_turno_id'
                                name='grupo_turno_id'
                                options={gruposTurno.map((g) => ({
                                    value: String(g.id),
                                    label: `${g.nombre} (${g.ciclo})`,
                                }))}
                                isLoading={cargandoGrupos}
                                placeholder='Selecciona un grupo...'
                                value={
                                    values.grupo_turno_id
                                        ? {
                                              value: String(values.grupo_turno_id),
                                              label: gruposTurno.find((g) => g.id === values.grupo_turno_id)?.nombre ?? '',
                                          }
                                        : null
                                }
                                onChange={(opt) => {
                                    const val = opt ? Number((opt as TSelectOption).value) : null;
                                    setFieldValue('grupo_turno_id', val);
                                }}
                            />
                        </Validation>
                    </div>

                    {/* Preview de slots del grupo seleccionado */}
                    {values.grupo_turno_id && (() => {
                        const grupo = gruposTurno.find((g) => g.id === values.grupo_turno_id);
                        if (!grupo || grupo.slots.length === 0) return null;
                        return (
                            <div className='rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900'>
                                <div className='text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2'>
                                    Slots del grupo · ciclo {grupo.ciclo}
                                </div>
                                <div className='space-y-1'>
                                    {grupo.slots.map((slot) => (
                                        <div key={slot.id} className='flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-200'>
                                            <span className='font-medium'>{slot.orden + 1}.</span>
                                            <span>{slot.turno_nombre}</span>
                                            <span className='text-zinc-400'>{slot.turno_hora_inicio}–{slot.turno_hora_fin}</span>
                                            {slot.turno_horas && <span className='text-zinc-400'>· {slot.turno_horas}h</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

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
