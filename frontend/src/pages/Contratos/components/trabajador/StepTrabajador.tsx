import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import { IUsuarioEmpresa } from '@/interface/empresas.interface';
import { FormikProps } from 'formik';
import { IFormValuesContratoTrabajador } from './types';

interface Props {
    formik: FormikProps<IFormValuesContratoTrabajador>;
    usuariosCliente: IUsuarioEmpresa[];
    sucursales: { id: number; nombre: string }[];
}

const StepTrabajador = ({ formik, usuariosCliente, sucursales }: Props) => {
    const { values, errors, touched, setFieldValue, handleChange, handleBlur } = formik;

    const usuariosOpts: TSelectOption[] = usuariosCliente.map((u) => ({
        value: String(u.id),
        label: `${u.nombre_usuario} (${u.email_usuario})`,
    }));
    const sucursalesOpts: TSelectOption[] = sucursales.map((s) => ({
        value: String(s.id),
        label: s.nombre,
    }));

    return (
        <div className='space-y-4'>
            <div>
                <Label htmlFor='trab_modo'>Tipo de trabajador</Label>
                <div className='mt-1 flex gap-3'>
                    <label className='flex items-center gap-2 cursor-pointer'>
                        <input
                            type='radio'
                            name='trab_modo'
                            value='existente'
                            checked={values.trab_modo === 'existente'}
                            onChange={() => setFieldValue('trab_modo', 'existente')}
                        />
                        Existente
                    </label>
                    <label className='flex items-center gap-2 cursor-pointer'>
                        <input
                            type='radio'
                            name='trab_modo'
                            value='nuevo'
                            checked={values.trab_modo === 'nuevo'}
                            onChange={() => setFieldValue('trab_modo', 'nuevo')}
                        />
                        Nuevo
                    </label>
                </div>
            </div>

            {values.trab_modo === 'existente' ? (
                <div>
                    <Label htmlFor='trab_usuario_empresa_id'>
                        Trabajador <span className='text-red-500'>*</span>
                    </Label>
                    <SelectReact
                        name='trab_usuario_empresa_id'
                        options={usuariosOpts}
                        value={
                            usuariosOpts.find(
                                (o) => o.value === String(values.trab_usuario_empresa_id),
                            ) || null
                        }
                        onChange={(opt) => {
                            setFieldValue(
                                'trab_usuario_empresa_id',
                                opt ? Number((opt as TSelectOption).value) : '',
                            );
                            formik.setFieldTouched('trab_usuario_empresa_id', true, false);
                        }}
                    />
                    {touched.trab_usuario_empresa_id && errors.trab_usuario_empresa_id && (
                        <div className='text-xs text-red-500 mt-1'>
                            {errors.trab_usuario_empresa_id}
                        </div>
                    )}
                </div>
            ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                    <div>
                        <Label htmlFor='trab_first_name'>
                            Nombres <span className='text-red-500'>*</span>
                        </Label>
                        <Validation
                            isValid={!errors.trab_first_name}
                            isTouched={!!touched.trab_first_name}
                            invalidFeedback={errors.trab_first_name || ''}>
                            <Input
                                id='trab_first_name'
                                name='trab_first_name'
                                value={values.trab_first_name}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='trab_last_name'>Apellidos</Label>
                        <Input
                            id='trab_last_name'
                            name='trab_last_name'
                            value={values.trab_last_name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                    </div>
                    <div>
                        <Label htmlFor='trab_email'>
                            Email <span className='text-red-500'>*</span>
                        </Label>
                        <Validation
                            isValid={!errors.trab_email}
                            isTouched={!!touched.trab_email}
                            invalidFeedback={errors.trab_email || ''}>
                            <Input
                                id='trab_email'
                                name='trab_email'
                                type='email'
                                value={values.trab_email}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='trab_rut'>RUT</Label>
                        <Input
                            id='trab_rut'
                            name='trab_rut'
                            value={values.trab_rut}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                    </div>
                    <div className='md:col-span-2'>
                        <Label htmlFor='trab_sucursal_id'>
                            Sucursal <span className='text-red-500'>*</span>
                        </Label>
                        <SelectReact
                            name='trab_sucursal_id'
                            options={sucursalesOpts}
                            value={
                                sucursalesOpts.find(
                                    (o) => o.value === String(values.trab_sucursal_id),
                                ) || null
                            }
                            onChange={(opt) => {
                                setFieldValue(
                                    'trab_sucursal_id',
                                    opt ? Number((opt as TSelectOption).value) : '',
                                );
                                formik.setFieldTouched('trab_sucursal_id', true, false);
                            }}
                        />
                        {touched.trab_sucursal_id && errors.trab_sucursal_id && (
                            <div className='text-xs text-red-500 mt-1'>
                                {errors.trab_sucursal_id}
                            </div>
                        )}
                    </div>
                    <div>
                        <Label htmlFor='trab_nacionalidad'>Nacionalidad</Label>
                        <Input
                            id='trab_nacionalidad'
                            name='trab_nacionalidad'
                            value={values.trab_nacionalidad}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                    </div>
                    <div>
                        <Label htmlFor='trab_fecha_nacimiento'>Fecha de nacimiento</Label>
                        <Input
                            id='trab_fecha_nacimiento'
                            name='trab_fecha_nacimiento'
                            type='date'
                            value={values.trab_fecha_nacimiento}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                    </div>
                    <div className='md:col-span-2'>
                        <Label htmlFor='trab_direccion'>Direccion</Label>
                        <Input
                            id='trab_direccion'
                            name='trab_direccion'
                            value={values.trab_direccion}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                    </div>
                    <div className='md:col-span-2 flex items-center gap-2'>
                        <input
                            id='trab_enviar_invitacion'
                            type='checkbox'
                            checked={values.trab_enviar_invitacion}
                            onChange={(e) =>
                                setFieldValue('trab_enviar_invitacion', e.target.checked)
                            }
                        />
                        <Label htmlFor='trab_enviar_invitacion' className='!m-0'>
                            Enviar correo de invitacion al trabajador
                        </Label>
                    </div>
                </div>
            )}

            <div>
                <Label htmlFor='observaciones'>Observaciones</Label>
                <Textarea
                    id='observaciones'
                    name='observaciones'
                    value={values.observaciones}
                    onChange={handleChange}
                    onBlur={handleBlur}
                />
            </div>
        </div>
    );
};

export default StepTrabajador;
