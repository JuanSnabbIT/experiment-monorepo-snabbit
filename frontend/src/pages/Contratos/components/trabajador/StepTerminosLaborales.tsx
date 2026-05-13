import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import { FormikProps } from 'formik';
import {
    IFormValuesContratoTrabajador,
    JORNADA_OPTIONS,
    TIPO_CONTRATO_OPTIONS,
} from './types';

interface Props {
    formik: FormikProps<IFormValuesContratoTrabajador>;
}

const StepTerminosLaborales = ({ formik }: Props) => {
    const { values, setFieldValue, handleChange, handleBlur } = formik;

    return (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            <div>
                <Label htmlFor='tipo_contrato'>Tipo de contrato</Label>
                <SelectReact
                    name='tipo_contrato'
                    options={TIPO_CONTRATO_OPTIONS}
                    value={
                        TIPO_CONTRATO_OPTIONS.find((o) => o.value === values.tipo_contrato) || null
                    }
                    onChange={(opt) =>
                        setFieldValue('tipo_contrato', (opt as TSelectOption)?.value || '')
                    }
                />
            </div>
            <div>
                <Label htmlFor='jornada'>Jornada</Label>
                <SelectReact
                    name='jornada'
                    options={JORNADA_OPTIONS}
                    value={JORNADA_OPTIONS.find((o) => o.value === values.jornada) || null}
                    onChange={(opt) =>
                        setFieldValue('jornada', (opt as TSelectOption)?.value || '')
                    }
                />
            </div>
            <div>
                <Label htmlFor='fecha_inicio'>Fecha inicio</Label>
                <Input
                    id='fecha_inicio'
                    name='fecha_inicio'
                    type='date'
                    value={values.fecha_inicio}
                    onChange={handleChange}
                    onBlur={handleBlur}
                />
            </div>
            <div>
                <Label htmlFor='fecha_termino'>
                    Fecha termino {values.tipo_contrato === 'plazo_fijo' && '*'}
                </Label>
                <Input
                    id='fecha_termino'
                    name='fecha_termino'
                    type='date'
                    value={values.fecha_termino}
                    onChange={handleChange}
                    onBlur={handleBlur}
                />
            </div>
            <div>
                <Label htmlFor='cargo'>Cargo</Label>
                <Input
                    id='cargo'
                    name='cargo'
                    value={values.cargo}
                    onChange={handleChange}
                    onBlur={handleBlur}
                />
            </div>
            <div>
                <Label htmlFor='horas_semanales'>Horas semanales</Label>
                <Input
                    id='horas_semanales'
                    name='horas_semanales'
                    type='number'
                    value={values.horas_semanales}
                    onChange={handleChange}
                    onBlur={handleBlur}
                />
            </div>
            <div className='md:col-span-2'>
                <Label htmlFor='lugar_trabajo'>Lugar de trabajo</Label>
                <Input
                    id='lugar_trabajo'
                    name='lugar_trabajo'
                    value={values.lugar_trabajo}
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
    );
};

export default StepTerminosLaborales;
