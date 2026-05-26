import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import { FormikProps } from 'formik';
import {
    IFormValuesContratoTrabajador,
    SISTEMA_SALUD_OPTIONS,
    TIPO_CUENTA_OPTIONS,
} from './types';

interface Props {
    formik: FormikProps<IFormValuesContratoTrabajador>;
}

const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className='mb-3 flex items-center gap-2 border-b border-zinc-100 pb-2 dark:border-zinc-800'>
        <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'>
            {icon}
        </span>
        <h4 className='text-sm font-semibold'>{title}</h4>
    </div>
);

const StepPrevisionBanco = ({ formik }: Props) => {
    const { values, setFieldValue, handleChange, handleBlur } = formik;

    return (
        <div className='space-y-5'>
            {/* Datos previsionales */}
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
                                d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                            />
                        </svg>
                    }
                    title='Datos previsionales (opcional)'
                />
                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                    <div>
                        <Label htmlFor='afp'>AFP</Label>
                        <Input
                            id='afp'
                            name='afp'
                            value={values.afp}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                    </div>
                    <div>
                        <Label htmlFor='sistema_salud'>Sistema de salud</Label>
                        <SelectReact
                            name='sistema_salud'
                            options={SISTEMA_SALUD_OPTIONS}
                            value={
                                SISTEMA_SALUD_OPTIONS.find(
                                    (o) => o.value === values.sistema_salud,
                                ) || null
                            }
                            onChange={(opt) =>
                                setFieldValue(
                                    'sistema_salud',
                                    (opt as TSelectOption)?.value || '',
                                )
                            }
                        />
                    </div>
                    {values.sistema_salud === 'isapre' && (
                        <div className='md:col-span-2'>
                            <Label htmlFor='nombre_isapre'>Nombre Isapre</Label>
                            <Input
                                id='nombre_isapre'
                                name='nombre_isapre'
                                value={values.nombre_isapre}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Datos bancarios */}
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
                                d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
                            />
                        </svg>
                    }
                    title='Datos bancarios (opcional)'
                />
                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                    <div>
                        <Label htmlFor='banco'>Banco</Label>
                        <Input
                            id='banco'
                            name='banco'
                            value={values.banco}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                    </div>
                    <div>
                        <Label htmlFor='tipo_cuenta_bancaria'>Tipo de cuenta</Label>
                        <SelectReact
                            name='tipo_cuenta_bancaria'
                            options={TIPO_CUENTA_OPTIONS}
                            value={
                                TIPO_CUENTA_OPTIONS.find(
                                    (o) => o.value === values.tipo_cuenta_bancaria,
                                ) || null
                            }
                            onChange={(opt) =>
                                setFieldValue(
                                    'tipo_cuenta_bancaria',
                                    (opt as TSelectOption)?.value || '',
                                )
                            }
                        />
                    </div>
                    <div className='md:col-span-2'>
                        <Label htmlFor='numero_cuenta_bancaria'>Numero de cuenta</Label>
                        <Input
                            id='numero_cuenta_bancaria'
                            name='numero_cuenta_bancaria'
                            value={values.numero_cuenta_bancaria}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StepPrevisionBanco;
