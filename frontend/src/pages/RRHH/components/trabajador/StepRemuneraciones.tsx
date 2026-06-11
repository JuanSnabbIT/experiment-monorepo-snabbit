import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import { FormikProps } from 'formik';
import { IFormValuesContratoTrabajador, TIPO_GRATIFICACION_OPTIONS } from './types';

interface Props {
    formik: FormikProps<IFormValuesContratoTrabajador>;
}

const PORCENTAJE_DESCUENTO_OPTIONS = [
    { value: '10', label: '10%' },
    { value: '15', label: '15%' },
    { value: '20', label: '20%' },
    { value: '25', label: '25%' },
    { value: '30', label: '30%' },
];

// Sueldo mínimo legal vigente desde enero 2026 (Ley 21.751)
// Actualizar cuando se promulgue nuevo reajuste
const SUELDO_MINIMO_LEGAL = 539_000;

const StepRemuneraciones = ({ formik }: Props) => {
    const { values, errors, touched, setFieldValue, handleChange, handleBlur } = formik;

    const fmtCLP = (v: number) => `$${v.toLocaleString('es-CL')}`;

    const sueldoBase = Number(values.sueldo_base) || 0;
    const bonoColacion = values.bono_colacion_activo ? Number(values.bono_colacion) || 0 : 0;
    const bonoMovilizacion = values.bono_movilizacion_activo ? Number(values.bono_movilizacion) || 0 : 0;
    const gratificacionMensual =
        values.gratificacion_activa && values.tipo_gratificacion === 'art_50_mensual'
            ? Math.round(sueldoBase * 0.25)
            : 0;
    const pctDescuentos = values.descuentos_activos ? Number(values.porcentaje_descuentos) || 0 : 0;
    const descuentos = Math.round(sueldoBase * (pctDescuentos / 100));
    const totalBruto = sueldoBase + gratificacionMensual + bonoColacion + bonoMovilizacion;
    const totalLiquido = Math.max(0, totalBruto - descuentos);

    return (
        <div className='space-y-5'>
            {/* Sueldo base */}
            <div>
                <Label htmlFor='sueldo_base'>
                    Sueldo base <span className='text-red-500'>*</span>
                </Label>
                <p className='mb-1.5 text-xs text-zinc-500 dark:text-zinc-400'>Moneda: CLP</p>
                <Validation
                    isValid={!errors.sueldo_base}
                    isTouched={!!touched.sueldo_base}
                    invalidFeedback={errors.sueldo_base || ''}>
                    <Input
                        id='sueldo_base'
                        name='sueldo_base'
                        type='number'
                        placeholder='0'
                        value={values.sueldo_base}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                </Validation>
                {values.jornada === 'completa' && sueldoBase > 0 && sueldoBase < SUELDO_MINIMO_LEGAL && (
                    <p className='mt-1.5 text-xs text-amber-600 dark:text-amber-400'>
                        El monto ingresado es inferior al sueldo mínimo legal ({fmtCLP(SUELDO_MINIMO_LEGAL)} CLP).
                    </p>
                )}
            </div>

            {/* Checkboxes opcionales */}
            <div className='space-y-3'>
                {/* Gratificación */}
                <div>
                    <Checkbox
                        id='gratificacion_activa'
                        name='gratificacion_activa'
                        checked={values.gratificacion_activa}
                        onChange={(e) => {
                            setFieldValue('gratificacion_activa', e.target.checked);
                            if (!e.target.checked) setFieldValue('tipo_gratificacion', '');
                        }}
                        label='Gratificación'
                        dimension='sm'
                    />
                    {values.gratificacion_activa && (
                        <div className='mt-2 pl-6'>
                            <Validation
                                isValid={!errors.tipo_gratificacion}
                                isTouched={!!touched.tipo_gratificacion}
                                invalidFeedback={errors.tipo_gratificacion || ''}>
                                <SelectReact
                                    name='tipo_gratificacion'
                                    options={TIPO_GRATIFICACION_OPTIONS}
                                    value={
                                        TIPO_GRATIFICACION_OPTIONS.find(
                                            (o) => o.value === values.tipo_gratificacion,
                                        ) || null
                                    }
                                    onChange={(opt) =>
                                        setFieldValue(
                                            'tipo_gratificacion',
                                            (opt as TSelectOption)?.value ?? '',
                                        )
                                    }
                                    placeholder='Selecciona tipo de gratificacion...'
                                />
                            </Validation>
                        </div>
                    )}
                </div>

                {/* Descuentos legales */}
                <div>
                    <Checkbox
                        id='descuentos_activos'
                        name='descuentos_activos'
                        checked={values.descuentos_activos}
                        onChange={(e) => setFieldValue('descuentos_activos', e.target.checked)}
                        label='Descuentos legales'
                        dimension='sm'
                    />
                    {values.descuentos_activos && (
                        <div className='mt-2 pl-6'>
                            <SelectReact
                                name='porcentaje_descuentos'
                                options={PORCENTAJE_DESCUENTO_OPTIONS}
                                value={
                                    PORCENTAJE_DESCUENTO_OPTIONS.find(
                                        (o) => o.value === values.porcentaje_descuentos,
                                    ) ?? PORCENTAJE_DESCUENTO_OPTIONS[2]
                                }
                                onChange={(opt) =>
                                    setFieldValue(
                                        'porcentaje_descuentos',
                                        (opt as TSelectOption)?.value ?? '20',
                                    )
                                }
                            />
                        </div>
                    )}
                </div>

                {/* Bono colación */}
                <div>
                    <Checkbox
                        id='bono_colacion_activo'
                        name='bono_colacion_activo'
                        checked={values.bono_colacion_activo}
                        onChange={(e) => {
                            setFieldValue('bono_colacion_activo', e.target.checked);
                            if (!e.target.checked) setFieldValue('bono_colacion', '');
                        }}
                        label='Bono colación'
                        dimension='sm'
                    />
                    {values.bono_colacion_activo && (
                        <div className='mt-2 pl-6'>
                            <Validation
                                isValid={!errors.bono_colacion}
                                isTouched={!!touched.bono_colacion}
                                invalidFeedback={String(errors.bono_colacion ?? '')}>
                                <Input
                                    id='bono_colacion'
                                    name='bono_colacion'
                                    type='number'
                                    placeholder='0'
                                    value={values.bono_colacion}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                />
                            </Validation>
                        </div>
                    )}
                </div>

                {/* Bono movilización */}
                <div>
                    <Checkbox
                        id='bono_movilizacion_activo'
                        name='bono_movilizacion_activo'
                        checked={values.bono_movilizacion_activo}
                        onChange={(e) => {
                            setFieldValue('bono_movilizacion_activo', e.target.checked);
                            if (!e.target.checked) setFieldValue('bono_movilizacion', '');
                        }}
                        label='Bono movilización'
                        dimension='sm'
                    />
                    {values.bono_movilizacion_activo && (
                        <div className='mt-2 pl-6'>
                            <Validation
                                isValid={!errors.bono_movilizacion}
                                isTouched={!!touched.bono_movilizacion}
                                invalidFeedback={String(errors.bono_movilizacion ?? '')}>
                                <Input
                                    id='bono_movilizacion'
                                    name='bono_movilizacion'
                                    type='number'
                                    placeholder='0'
                                    value={values.bono_movilizacion}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                />
                            </Validation>
                        </div>
                    )}
                </div>
            </div>

            {/* Resumen */}
            <div className='space-y-1 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800/50'>
                <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                    <span>Sueldo base</span>
                    <span>{fmtCLP(sueldoBase)}</span>
                </div>
                {values.gratificacion_activa && values.tipo_gratificacion === 'art_50_mensual' && gratificacionMensual > 0 && (
                    <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                        <span>Gratificacion mensual</span>
                        <span className='text-emerald-600 dark:text-emerald-400'>
                            +{fmtCLP(gratificacionMensual)}
                        </span>
                    </div>
                )}
                {values.gratificacion_activa && values.tipo_gratificacion === 'art_47' && (
                    <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                        <span>Gratificación anual (Art.47)</span>
                        <span className='text-zinc-400 text-xs'>Se calcula al año</span>
                    </div>
                )}
                {values.bono_colacion_activo && bonoColacion > 0 && (
                    <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                        <span>Bono colacion</span>
                        <span className='text-emerald-600 dark:text-emerald-400'>
                            +{fmtCLP(bonoColacion)}
                        </span>
                    </div>
                )}
                {values.bono_movilizacion_activo && bonoMovilizacion > 0 && (
                    <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                        <span>Bono movilizacion</span>
                        <span className='text-emerald-600 dark:text-emerald-400'>
                            +{fmtCLP(bonoMovilizacion)}
                        </span>
                    </div>
                )}
                <div className='flex justify-between border-t border-zinc-200 pt-1 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'>
                    <span>Total bruto</span>
                    <span className='font-medium text-zinc-800 dark:text-zinc-100'>
                        {fmtCLP(totalBruto)}
                    </span>
                </div>
                {values.gratificacion_activa && values.tipo_gratificacion === 'art_47' && (
                    <p className='text-xs text-zinc-400 dark:text-zinc-500 italic'>
                        * La gratificación anual (Art.47) no está incluida en este cálculo.
                    </p>
                )}
                {values.descuentos_activos && (
                    <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                        <span>Descuentos legales (~{pctDescuentos}%)</span>
                        <span className='text-red-500'>-{fmtCLP(descuentos)}</span>
                    </div>
                )}
                <div className='mt-1 flex justify-between border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-700'>
                    <span>Liquido estimado</span>
                    <span className='text-emerald-600 dark:text-emerald-400'>
                        {fmtCLP(totalLiquido)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default StepRemuneraciones;
