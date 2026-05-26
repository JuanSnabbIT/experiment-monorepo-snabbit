import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import { useGetCargosCatalogoQuery } from '@/store/slices/rrhh/cargoCatalogoApi';
import classNames from 'classnames';
import { FormikProps } from 'formik';
import { useEffect } from 'react';
import {
    IFormValuesContratoTrabajador,
    MESES_OPTIONS,
} from './types';

interface Props {
    formik: FormikProps<IFormValuesContratoTrabajador>;
    sucursalDireccion?: string;
}

const calcFechaTermino = (fechaInicio: string, meses: number): string => {
    if (!fechaInicio) return '';
    const d = new Date(fechaInicio + 'T00:00:00');
    d.setMonth(d.getMonth() + meses);
    return d.toISOString().slice(0, 10);
};

const StepTerminosLaborales = ({ formik, sucursalDireccion }: Props) => {
    const { values, errors, touched, setFieldValue, setFieldTouched, handleChange, handleBlur } = formik;

    const { data: cargos = [] } = useGetCargosCatalogoQuery();

    const cargosOpts: TSelectOption[] = cargos.map((c) => ({
        value: c.nombre,
        label: c.nombre,
    }));

    // Auto-rellenar lugar_trabajo desde la direccion de la sucursal seleccionada
    useEffect(() => {
        if (sucursalDireccion && !values.lugar_trabajo) {
            setFieldValue('lugar_trabajo', sucursalDireccion);
        }
    }, [sucursalDireccion]);

    // Recalcular fecha_termino cuando cambia cantidad_meses o fecha_inicio (solo plazo_fijo)
    useEffect(() => {
        if (values.tipo_contrato === 'plazo_fijo' && values.cantidad_meses && values.fecha_inicio) {
            const calculada = calcFechaTermino(values.fecha_inicio, Number(values.cantidad_meses));
            setFieldValue('fecha_termino', calculada);
        }
    }, [values.cantidad_meses, values.fecha_inicio, values.tipo_contrato]);

    const TIPO_CONTRATO_CARDS = [
        { value: 'indefinido', label: 'Indefinido', desc: 'Sin fecha de termino pactada.' },
        { value: 'plazo_fijo', label: 'Plazo fijo', desc: 'Fecha de termino determinada.' },
        { value: 'obra_o_faena', label: 'Por obra o faena', desc: 'Duracion ligada a un proyecto.' },
        { value: 'honorarios', label: 'Honorarios', desc: 'Prestacion de servicios.' },
        { value: 'reemplazo', label: 'Reemplazo', desc: 'Cubre ausencia temporal.' },
    ] as const;

    return (
        <div className='space-y-4'>
            {/* Tipo de contrato como cards */}
            <div>
                <Label className='mb-2 block'>
                    Tipo de contrato <span className='text-red-500'>*</span>
                </Label>
                <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5'>
                    {TIPO_CONTRATO_CARDS.map((op) => (
                        <button
                            key={op.value}
                            type='button'
                            onClick={() => {
                                setFieldValue('tipo_contrato', op.value);
                                setFieldTouched('tipo_contrato', true, false);
                                // Limpiar campos dependientes al cambiar tipo
                                if (op.value !== 'plazo_fijo') {
                                    setFieldValue('cantidad_meses', '');
                                }
                            }}
                            className={classNames(
                                'flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all',
                                values.tipo_contrato === op.value
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-zinc-200 hover:border-blue-300 dark:border-zinc-700 dark:hover:border-blue-600',
                            )}>
                            <span className='text-xs font-semibold leading-tight'>{op.label}</span>
                            <span className='text-[10px] leading-tight text-zinc-500 dark:text-zinc-400'>
                                {op.desc}
                            </span>
                        </button>
                    ))}
                </div>
                {touched.tipo_contrato && errors.tipo_contrato && (
                    <p className='mt-1 text-xs text-red-500'>{errors.tipo_contrato}</p>
                )}
            </div>

            {/* Fechas */}
            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div>
                    <Label htmlFor='fecha_inicio'>
                        Fecha inicio <span className='text-red-500'>*</span>
                    </Label>
                    <Validation
                        isValid={!errors.fecha_inicio}
                        isTouched={!!touched.fecha_inicio}
                        invalidFeedback={errors.fecha_inicio || ''}>
                        <Input
                            id='fecha_inicio'
                            name='fecha_inicio'
                            type='date'
                            value={values.fecha_inicio}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                    </Validation>
                </div>

                {/* Selector de meses para plazo_fijo */}
                {values.tipo_contrato === 'plazo_fijo' ? (
                    <div>
                        <Label htmlFor='cantidad_meses'>
                            Duracion <span className='text-red-500'>*</span>
                        </Label>
                        <SelectReact
                            name='cantidad_meses'
                            isCreatable
                            options={MESES_OPTIONS as unknown as TSelectOption[]}
                            placeholder='Selecciona o escribe duracion...'
                            value={
                                values.cantidad_meses !== ''
                                    ? (MESES_OPTIONS.find(
                                          (o) => o.value === String(values.cantidad_meses),
                                      ) ?? {
                                          value: String(values.cantidad_meses),
                                          label: `${values.cantidad_meses} meses`,
                                      })
                                    : null
                            }
                            onChange={(opt) => {
                                setFieldValue(
                                    'cantidad_meses',
                                    opt ? (opt as TSelectOption).value : '',
                                );
                            }}
                        />
                        {values.fecha_termino && (
                            <p className='mt-1 text-xs text-emerald-600 dark:text-emerald-400'>
                                Vence el {values.fecha_termino}
                            </p>
                        )}
                        <Validation
                            isValid={!errors.fecha_termino}
                            isTouched={!!touched.fecha_termino}
                            invalidFeedback={errors.fecha_termino || ''}>
                            <input type='hidden' name='fecha_termino' value={values.fecha_termino} />
                        </Validation>
                    </div>
                ) : (
                    <div>
                        <Label htmlFor='fecha_termino'>
                            Fecha termino{' '}
                            {values.tipo_contrato === 'indefinido' && (
                                <span className='text-xs text-zinc-400 ml-1'>(opcional)</span>
                            )}
                        </Label>
                        <Validation
                            isValid={!errors.fecha_termino}
                            isTouched={!!touched.fecha_termino}
                            invalidFeedback={errors.fecha_termino || ''}>
                            <Input
                                id='fecha_termino'
                                name='fecha_termino'
                                type='date'
                                value={values.fecha_termino}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                        </Validation>
                    </div>
                )}

                <div>
                    <Label htmlFor='cargo'>
                        Cargo <span className='text-red-500'>*</span>
                    </Label>
                    <Validation
                        isValid={!errors.cargo}
                        isTouched={!!touched.cargo}
                        invalidFeedback={errors.cargo || ''}>
                        <SelectReact
                            name='cargo'
                            isCreatable
                            options={cargosOpts}
                            placeholder='Selecciona o escribe un cargo...'
                            value={values.cargo ? { value: values.cargo, label: values.cargo } : null}
                            onChange={(opt) => {
                                setFieldValue('cargo', opt ? (opt as TSelectOption).value : '');
                                setFieldTouched('cargo', true, false);
                            }}
                        />
                    </Validation>
                </div>

                <div>
                    <Label htmlFor='lugar_trabajo'>Lugar de trabajo</Label>
                    {sucursalDireccion && !values.lugar_trabajo && (
                        <p className='mb-1 text-xs text-zinc-400 dark:text-zinc-500'>
                            Pre-llenado desde sucursal (editable)
                        </p>
                    )}
                    <Input
                        id='lugar_trabajo'
                        name='lugar_trabajo'
                        value={values.lugar_trabajo}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                </div>
            </div>
        </div>
    );
};

export default StepTerminosLaborales;

