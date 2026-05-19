import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
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
    const { values, errors, touched, setFieldValue, setFieldTouched, handleChange, handleBlur } = formik;

    const jornadaConHoras = values.jornada === 'parcial' || values.jornada === 'part_time';

    return (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            <div>
                <Label htmlFor='tipo_contrato'>
                    Tipo de contrato <span className='text-red-500'>*</span>
                </Label>
                <SelectReact
                    name='tipo_contrato'
                    options={TIPO_CONTRATO_OPTIONS}
                    value={
                        TIPO_CONTRATO_OPTIONS.find((o) => o.value === values.tipo_contrato) || null
                    }
                    onChange={(opt) => {
                        setFieldValue('tipo_contrato', (opt as TSelectOption)?.value || '');
                        setFieldTouched('tipo_contrato', true, false);
                    }}
                />
                {touched.tipo_contrato && errors.tipo_contrato && (
                    <div className='text-xs text-red-500 mt-1'>{errors.tipo_contrato}</div>
                )}
            </div>
            <div>
                <Label htmlFor='jornada'>
                    Jornada <span className='text-red-500'>*</span>
                </Label>
                <SelectReact
                    name='jornada'
                    options={JORNADA_OPTIONS}
                    value={JORNADA_OPTIONS.find((o) => o.value === values.jornada) || null}
                    onChange={(opt) => {
                        setFieldValue('jornada', (opt as TSelectOption)?.value || '');
                        setFieldTouched('jornada', true, false);
                    }}
                />
                {touched.jornada && errors.jornada && (
                    <div className='text-xs text-red-500 mt-1'>{errors.jornada}</div>
                )}
            </div>
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
            <div>
                <Label htmlFor='fecha_termino'>
                    Fecha termino{' '}
                    {values.tipo_contrato === 'plazo_fijo' && (
                        <span className='text-red-500'>*</span>
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
            <div>
                <Label htmlFor='cargo'>
                    Cargo <span className='text-red-500'>*</span>
                </Label>
                <Validation
                    isValid={!errors.cargo}
                    isTouched={!!touched.cargo}
                    invalidFeedback={errors.cargo || ''}>
                    <Input
                        id='cargo'
                        name='cargo'
                        value={values.cargo}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                </Validation>
            </div>
            <div>
                <Label htmlFor='horas_semanales'>
                    Horas semanales{' '}
                    {jornadaConHoras && <span className='text-red-500'>*</span>}
                </Label>
                <Validation
                    isValid={!errors.horas_semanales}
                    isTouched={!!touched.horas_semanales}
                    invalidFeedback={errors.horas_semanales || ''}>
                    <Input
                        id='horas_semanales'
                        name='horas_semanales'
                        type='number'
                        value={values.horas_semanales}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />
                </Validation>
            </div>
            <div>
                <Label htmlFor='tiempo_colacion'>Tiempo de colacion (minutos)</Label>
                <Input
                    id='tiempo_colacion'
                    name='tiempo_colacion'
                    type='number'
                    value={values.tiempo_colacion}
                    onChange={handleChange}
                    onBlur={handleBlur}
                />
            </div>
            <div className='md:col-span-2'>
                <Label htmlFor='horario_detalle'>Horario detallado</Label>
                <Input
                    id='horario_detalle'
                    name='horario_detalle'
                    value={values.horario_detalle}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder='Ej: Lunes a viernes 9:00 a 18:00'
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
    );
};

export default StepTerminosLaborales;
