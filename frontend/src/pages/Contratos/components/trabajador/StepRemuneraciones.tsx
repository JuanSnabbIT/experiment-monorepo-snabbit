import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import { FormikProps } from 'formik';
import {
    IFormValuesContratoTrabajador,
    MONEDA_LABORAL_OPTIONS,
    SISTEMA_SALUD_OPTIONS,
    TIPO_CUENTA_OPTIONS,
} from './types';

interface Props {
    formik: FormikProps<IFormValuesContratoTrabajador>;
}

const StepRemuneraciones = ({ formik }: Props) => {
    const { values, errors, touched, setFieldValue, handleChange, handleBlur } = formik;

    return (
        <div className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
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
                            value={values.sueldo_base}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                    </Validation>
                </div>
                <div>
                    <Label htmlFor='sueldo_liquido'>Sueldo liquido (opcional)</Label>
                    <Input
                        id='sueldo_liquido'
                        name='sueldo_liquido'
                        type='number'
                        value={values.sueldo_liquido}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                </div>
                <div>
                    <Label htmlFor='moneda'>Moneda</Label>
                    <SelectReact
                        name='moneda'
                        options={MONEDA_LABORAL_OPTIONS}
                        value={
                            MONEDA_LABORAL_OPTIONS.find((o) => o.value === values.moneda) || null
                        }
                        onChange={(opt) =>
                            setFieldValue('moneda', (opt as TSelectOption)?.value || 'CLP')
                        }
                    />
                </div>
                <div>
                    <Label htmlFor='bono_movilizacion'>Bono movilizacion</Label>
                    <Input
                        id='bono_movilizacion'
                        name='bono_movilizacion'
                        type='number'
                        value={values.bono_movilizacion}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                </div>
                <div>
                    <Label htmlFor='bono_colacion'>Bono colacion</Label>
                    <Input
                        id='bono_colacion'
                        name='bono_colacion'
                        type='number'
                        value={values.bono_colacion}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                </div>
                <div className='md:col-span-2 flex items-center gap-2'>
                    <input
                        id='gratificacion_legal'
                        type='checkbox'
                        checked={values.gratificacion_legal}
                        onChange={(e) =>
                            setFieldValue('gratificacion_legal', e.target.checked)
                        }
                    />
                    <Label htmlFor='gratificacion_legal' className='!m-0'>
                        Incluye gratificacion legal
                    </Label>
                </div>
            </div>

            <div className='border-t pt-4'>
                <h4 className='text-sm font-semibold mb-2'>Datos previsionales (opcional)</h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
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

            <div className='border-t pt-4'>
                <h4 className='text-sm font-semibold mb-2'>Datos bancarios (opcional)</h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
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

export default StepRemuneraciones;
