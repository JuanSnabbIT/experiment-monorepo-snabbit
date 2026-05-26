import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import { FormikProps } from 'formik';
import { IFormValuesContratoTrabajador, MONEDA_LABORAL_OPTIONS } from './types';

interface Props {
    formik: FormikProps<IFormValuesContratoTrabajador>;
}

const SectionTitle = ({
    icon,
    title,
}: {
    icon: React.ReactNode;
    title: string;
}) => (
    <div className='mb-3 flex items-center gap-2 border-b border-zinc-100 pb-2 dark:border-zinc-800'>
        <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'>
            {icon}
        </span>
        <h4 className='text-sm font-semibold'>{title}</h4>
    </div>
);

const StepRemuneraciones = ({ formik }: Props) => {
    const { values, errors, touched, setFieldValue, handleChange, handleBlur } = formik;

    const sueldoBase = Number(values.sueldo_base) || 0;
    const bonoColacion = Number(values.bono_colacion) || 0;
    const bonoMovilizacion = Number(values.bono_movilizacion) || 0;
    // Gratificacion legal = 25% del sueldo base si aplica
    const gratificacion = values.gratificacion_legal ? Math.round(sueldoBase * 0.25) : 0;
    const totalBruto = sueldoBase + gratificacion;
    // Descuentos previsionales estimados (aprox 20%: AFP 10% + salud 7% + cesantia 3%)
    const descuentos = Math.round(sueldoBase * 0.2);
    const totalLiquido = Math.max(0, totalBruto - descuentos) + bonoColacion + bonoMovilizacion;

    const fmtCLP = (v: number) =>
        `$${v.toLocaleString('es-CL')}`;

    return (
        <div className='space-y-5'>
            {/* Ingresos imponibles */}
            <div>
                <SectionTitle
                    icon={
                        <svg
                            className='h-4 w-4'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'>
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3'
                            />
                        </svg>
                    }
                    title='Ingresos imponibles'
                />
                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                    <div>
                        <Label htmlFor='sueldo_base'>
                            Sueldo base mensual <span className='text-red-500'>*</span>
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
                    <div>
                        <Label htmlFor='moneda'>Moneda</Label>
                        <SelectReact
                            name='moneda'
                            options={MONEDA_LABORAL_OPTIONS}
                            value={
                                MONEDA_LABORAL_OPTIONS.find((o) => o.value === values.moneda) ||
                                null
                            }
                            onChange={(opt) =>
                                setFieldValue('moneda', (opt as TSelectOption)?.value || 'CLP')
                            }
                        />
                    </div>
                    <div className='md:col-span-2'>
                        <div className='flex items-center gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                            <input
                                id='gratificacion_legal'
                                type='checkbox'
                                className='h-4 w-4 accent-blue-500'
                                checked={values.gratificacion_legal}
                                onChange={(e) =>
                                    setFieldValue('gratificacion_legal', e.target.checked)
                                }
                            />
                            <label
                                htmlFor='gratificacion_legal'
                                className='cursor-pointer select-none text-sm'>
                                Incluye gratificacion legal{' '}
                                <span className='text-xs text-zinc-500'>
                                    (25% del sueldo base, maximo legal)
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Asignaciones no imponibles */}
            <div>
                <SectionTitle
                    icon={
                        <svg
                            className='h-4 w-4'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'>
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                            />
                        </svg>
                    }
                    title='Asignaciones no imponibles'
                />
                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                    <div>
                        <Label htmlFor='bono_colacion'>Asignacion de colacion</Label>
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
                        <Label htmlFor='bono_movilizacion'>Asignacion de movilizacion</Label>
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
                    <div>
                        <Label htmlFor='sueldo_liquido'>Sueldo liquido (opcional)</Label>
                        <Input
                            id='sueldo_liquido'
                            name='sueldo_liquido'
                            type='number'
                            placeholder='Se calcula automaticamente'
                            value={values.sueldo_liquido}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                    </div>
                </div>
            </div>

            {/* Totales estimados */}
            <div className='grid grid-cols-2 gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50'>
                <div>
                    <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                        Total bruto estimado
                    </p>
                    <p className='mt-1 text-lg font-bold text-zinc-800 dark:text-zinc-100'>
                        {fmtCLP(totalBruto)}
                    </p>
                </div>
                <div>
                    <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                        Total liquido estimado{' '}
                        <span className='text-[10px]'>(aprox.)</span>
                    </p>
                    <p className='mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400'>
                        {fmtCLP(totalLiquido)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StepRemuneraciones;
