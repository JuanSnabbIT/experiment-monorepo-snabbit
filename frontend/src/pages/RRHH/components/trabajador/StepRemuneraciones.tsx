import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import ButtonGroup from '@/components/ui/ButtonGroup';
import { FormikProps } from 'formik';
import { useState } from 'react';
import { IFormValuesContratoTrabajador, MONEDA_LABORAL_OPTIONS, TIPO_GRATIFICACION_OPTIONS } from './types';

interface Props {
    formik: FormikProps<IFormValuesContratoTrabajador>;
}

const StepRemuneraciones = ({ formik }: Props) => {
    const { values, errors, touched, setFieldValue, handleChange, handleBlur } = formik;

    const [modoSueldo, setModoSueldo] = useState<'bruto' | 'liquido'>('bruto');
    const [descuentoOption, setDescuentoOption] = useState('20');
    const incluirDescuentos = descuentoOption !== 'no';
    const pctDescuentos = Number(descuentoOption) || 0;

    const sueldoBase = Number(values.sueldo_base) || 0;
    const bonoColacion = Number(values.bono_colacion) || 0;
    const bonoMovilizacion = Number(values.bono_movilizacion) || 0;
    const gratificacion = values.tipo_gratificacion === 'art_50_mensual' ? Math.round(sueldoBase * 0.25) : 0;
    const totalBruto = sueldoBase + gratificacion + bonoColacion + bonoMovilizacion;
    const descuentos = incluirDescuentos ? Math.round(sueldoBase * (pctDescuentos / 100)) : 0;
    const totalLiquido = Math.max(0, totalBruto - descuentos);

    const fmtCLP = (v: number) => `$${v.toLocaleString('es-CL')}`;

    const campMoneda = (
        <div>
            <Label htmlFor='moneda'>Moneda</Label>
            <SelectReact
                name='moneda'
                options={MONEDA_LABORAL_OPTIONS}
                value={MONEDA_LABORAL_OPTIONS.find((o) => o.value === values.moneda) || null}
                onChange={(opt) =>
                    setFieldValue('moneda', (opt as TSelectOption)?.value || 'CLP')
                }
            />
        </div>
    );

    return (
        <div className='space-y-4'>
            {/* Toggle Sueldo Bruto / Sueldo Liquido */}
            <ButtonGroup className='flex w-full'>
                <Button
                    variant={modoSueldo === 'bruto' ? 'solid' : 'outline'}
                    color={modoSueldo === 'bruto' ? 'blue' : 'zinc'}
                    isActive={modoSueldo === 'bruto'}
                    onClick={() => setModoSueldo('bruto')}
                    className='flex-1'>
                    Sueldo Bruto
                </Button>
                <Button
                    variant={modoSueldo === 'liquido' ? 'solid' : 'outline'}
                    color={modoSueldo === 'liquido' ? 'blue' : 'zinc'}
                    isActive={modoSueldo === 'liquido'}
                    onClick={() => setModoSueldo('liquido')}
                    className='flex-1'>
                    Sueldo Liquido
                </Button>
            </ButtonGroup>

            {modoSueldo === 'bruto' ? (
                <>
                    {/* Sueldo bruto + Moneda */}
                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                        <div>
                            <Label htmlFor='sueldo_base'>
                                Sueldo bruto <span className='text-red-500'>*</span>
                            </Label>
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
                        </div>
                        {campMoneda}
                    </div>

                    {/* Gratificacion legal + Descuentos legales */}
                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                        <div>
                            <Label htmlFor='tipo_gratificacion'>Gratificacion</Label>
                            <SelectReact
                                id='tipo_gratificacion'
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
                            />
                        </div>
                        <div>
                            <Label htmlFor='descuentos_legales'>Descuentos legales</Label>
                            <SelectReact
                                id='descuentos_legales'
                                name='descuentos_legales'
                                options={[
                                    { value: 'no', label: 'No aplica' },
                                    { value: '10', label: '10%' },
                                    { value: '15', label: '15%' },
                                    { value: '20', label: '20%' },
                                    { value: '25', label: '25%' },
                                    { value: '30', label: '30%' },
                                ]}
                                value={{
                                    value: descuentoOption,
                                    label: descuentoOption === 'no' ? 'No aplica' : `${descuentoOption}%`,
                                }}
                                onChange={(opt) =>
                                    setDescuentoOption((opt as TSelectOption)?.value ?? 'no')
                                }
                            />
                        </div>
                    </div>

                    {/* Bono colacion + Bono movilizacion */}
                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                        <div>
                            <Label htmlFor='bono_colacion'>Bono colacion</Label>
                            <Input
                                id='bono_colacion'
                                name='bono_colacion'
                                type='number'
                                placeholder='0'
                                value={values.bono_colacion}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                        </div>
                        <div>
                            <Label htmlFor='bono_movilizacion'>Bono movilizacion</Label>
                            <Input
                                id='bono_movilizacion'
                                name='bono_movilizacion'
                                type='number'
                                placeholder='0'
                                value={values.bono_movilizacion}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                        </div>
                    </div>

                    {/* Resumen */}
                    <div className='space-y-1 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800/50'>
                        <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                            <span>Sueldo base</span>
                            <span>{fmtCLP(sueldoBase)}</span>
                        </div>
                        {gratificacion > 0 && (
                            <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                <span>Gratificacion legal</span>
                                <span className='text-emerald-600 dark:text-emerald-400'>+{fmtCLP(gratificacion)}</span>
                            </div>
                        )}
                        {bonoColacion > 0 && (
                            <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                <span>Bono colacion</span>
                                <span className='text-emerald-600 dark:text-emerald-400'>+{fmtCLP(bonoColacion)}</span>
                            </div>
                        )}
                        {bonoMovilizacion > 0 && (
                            <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                <span>Bono movilizacion</span>
                                <span className='text-emerald-600 dark:text-emerald-400'>+{fmtCLP(bonoMovilizacion)}</span>
                            </div>
                        )}
                        <div className='flex justify-between border-t border-zinc-200 pt-1 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'>
                            <span>Total bruto</span>
                            <span className='font-medium text-zinc-800 dark:text-zinc-100'>
                                {fmtCLP(totalBruto)}
                            </span>
                        </div>
                        {incluirDescuentos && (
                        <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                            <span>Descuentos legales (~{pctDescuentos}%)</span>
                            <span className='text-red-500'>-{fmtCLP(descuentos)}</span>
                        </div>
                        )}
                        <div className='mt-1 flex justify-between border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-700'>
                            <span>Liquido</span>
                            <span className='text-emerald-600 dark:text-emerald-400'>
                                {fmtCLP(totalLiquido)}
                            </span>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Sueldo liquido acordado + Moneda */}
                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                        <div>
                            <Label htmlFor='sueldo_liquido'>
                                Sueldo liquido acordado <span className='text-red-500'>*</span>
                            </Label>
                            <Input
                                id='sueldo_liquido'
                                name='sueldo_liquido'
                                type='number'
                                placeholder='0'
                                value={values.sueldo_liquido}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                        </div>
                        {campMoneda}
                    </div>

                    {/* Total simple */}
                    <div className='flex justify-between rounded-xl bg-zinc-50 p-4 text-sm font-semibold dark:bg-zinc-800/50'>
                        <span>Total</span>
                        <span className='text-emerald-600 dark:text-emerald-400'>
                            {fmtCLP(Number(values.sueldo_liquido) || 0)}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
};

export default StepRemuneraciones;
