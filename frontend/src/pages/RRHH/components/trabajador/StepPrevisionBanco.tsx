import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import {
    useCrearBancoInlineMutation,
    useGetAfpCatalogoQuery,
    useGetBancoCatalogoQuery,
} from '@/store/slices/rrhh/catalogosRrhhApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { FormikProps } from 'formik';
import { useMemo } from 'react';
import { toast } from 'react-toastify';
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
    const { values, errors, touched, setFieldValue, handleChange, handleBlur } = formik;

    const { data: afpList = [] } = useGetAfpCatalogoQuery();
    const { data: bancoList = [] } = useGetBancoCatalogoQuery();
    const [crearBanco] = useCrearBancoInlineMutation();

    const afpOptions = useMemo<TSelectOption[]>(
        () => afpList.map((a) => ({ value: String(a.id), label: a.nombre })),
        [afpList],
    );
    const bancoOptions = useMemo<TSelectOption[]>(
        () => bancoList.map((b) => ({ value: b.nombre, label: b.nombre })),
        [bancoList],
    );

    const handleCrearBanco = async (inputValue: string) => {
        try {
            const nuevo = await crearBanco({ nombre: inputValue }).unwrap();
            setFieldValue('banco', nuevo.nombre);
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

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
                <div className='space-y-3'>
                    {/* AFP a ancho completo */}
                    <div>
                        <Label htmlFor='afp'>AFP *</Label>
                        <SelectReact
                            name='afp'
                            options={afpOptions}
                            value={afpOptions.find((o) => o.value === String(values.afp)) || null}
                            onChange={(opt) => setFieldValue('afp', (opt as TSelectOption)?.value ? Number((opt as TSelectOption).value) : null)}
                            isClearable
                            placeholder='Seleccionar AFP...'
                        />
                    </div>
                    {/* Sistema de salud + ISAPRE en la misma fila */}
                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                        <div>
                            <Label htmlFor='sistema_salud'>Sistema de salud *</Label>
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
                            <div>
                                <Label htmlFor='nombre_isapre'>
                                    Nombre Isapre <span className='text-red-500'>*</span>
                                </Label>
                                <Validation
                                    isValid={!errors.nombre_isapre}
                                    isTouched={!!touched.nombre_isapre}
                                    invalidFeedback={errors.nombre_isapre || ''}>
                                    <Input
                                        id='nombre_isapre'
                                        name='nombre_isapre'
                                        value={values.nombre_isapre}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    />
                                </Validation>
                            </div>
                        )}
                        {values.sistema_salud === 'otro' && (
                            <div>
                                <Label htmlFor='sistema_salud_otro'>
                                    Especifica el sistema de salud <span className='text-red-500'>*</span>
                                </Label>
                                <Validation
                                    isValid={!errors.sistema_salud_otro}
                                    isTouched={!!touched.sistema_salud_otro}
                                    invalidFeedback={errors.sistema_salud_otro || ''}>
                                    <Input
                                        id='sistema_salud_otro'
                                        name='sistema_salud_otro'
                                        value={values.sistema_salud_otro}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder='Ej: Mutual de Seguridad'
                                    />
                                </Validation>
                            </div>
                        )}
                    </div>
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
                        <Validation
                            isValid={!errors.banco}
                            isTouched={!!touched.banco}
                            invalidFeedback={errors.banco || ''}>
                            <SelectReact
                                name='banco'
                                options={bancoOptions}
                                value={bancoOptions.find((o) => o.value === values.banco) || null}
                                onChange={(opt) => setFieldValue('banco', (opt as TSelectOption)?.value || '')}
                                isClearable
                                isCreatable
                                onCreateOption={handleCrearBanco}
                                formatCreateLabel={(v) => `Agregar banco: "${v}"`}
                                placeholder='Seleccionar o crear...'
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='tipo_cuenta_bancaria'>Tipo de cuenta</Label>
                        <Validation
                            isValid={!errors.tipo_cuenta_bancaria}
                            isTouched={!!touched.tipo_cuenta_bancaria}
                            invalidFeedback={errors.tipo_cuenta_bancaria || ''}>
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
                        </Validation>
                    </div>
                    <div className='md:col-span-2'>
                        <Label htmlFor='numero_cuenta_bancaria'>Numero de cuenta</Label>
                        <Validation
                            isValid={!errors.numero_cuenta_bancaria}
                            isTouched={!!touched.numero_cuenta_bancaria}
                            invalidFeedback={errors.numero_cuenta_bancaria || ''}>
                            <Input
                                id='numero_cuenta_bancaria'
                                name='numero_cuenta_bancaria'
                                value={values.numero_cuenta_bancaria}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                        </Validation>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StepPrevisionBanco;
