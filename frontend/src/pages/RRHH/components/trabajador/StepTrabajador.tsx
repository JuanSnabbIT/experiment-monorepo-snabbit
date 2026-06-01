import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import RadioCard from '@/components/form/RadioCard';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import { IRelacionEmpresa, IUsuarioEmpresa } from '@/interface/empresas.interface';
import { FormikProps } from 'formik';
import { IFormValuesContratoTrabajador } from './types';

interface Props {
    formik: FormikProps<IFormValuesContratoTrabajador>;
    usuariosCliente: IUsuarioEmpresa[];
    sucursales: { id: number; nombre: string }[];
    empresasCliente?: IRelacionEmpresa[];
}

const StepTrabajador = ({
    formik,
    usuariosCliente,
    sucursales,
    empresasCliente,
}: Props) => {
    const { values, errors, touched, setFieldValue, handleChange, handleBlur } = formik;

    const sucursalesOpts: TSelectOption[] = sucursales.map((s) => ({
        value: String(s.id),
        label: s.nombre,
    }));
    const empresasClienteOpts: TSelectOption[] = (empresasCliente ?? []).map((r) => ({
        value: String(r.info_cliente.id),
        label: r.info_cliente.nombre,
    }));
    const mostrarSelectorEmpresa = !!empresasCliente && empresasCliente.length > 0;

    // Email de la empresa seleccionada (para hint del checkbox)
    const emailEmpleador =
        (empresasCliente ?? []).find(
            (r) => String(r.info_cliente.id) === String(values.trab_empresa_cliente_id),
        )?.info_cliente.email ?? null;

    // Trabajadores filtrados por sucursal en modo existente
    const usuariosFiltrados =
        values.trab_modo === 'existente' && values.trab_sucursal_id
            ? usuariosCliente.filter((u) => u.sucursal === Number(values.trab_sucursal_id))
            : usuariosCliente;
    const usuariosOpts: TSelectOption[] = usuariosFiltrados.map((u) => ({
        value: String(u.id),
        label: `${u.nombre_usuario} — ${u.papeleta?.rut ?? u.email_usuario}`,
    }));

    return (
        <div className='space-y-4'>
            {/* Selector de modo como cards */}
            <div>
                <Label className='mb-2 block'>Seleccionar trabajador</Label>
                <p className='mb-3 text-xs text-zinc-500 dark:text-zinc-400'>
                    Elige un trabajador existente o crea uno nuevo.
                </p>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                    <RadioCard
                        id='trab_modo_existente'
                        name='trab_modo'
                        value='existente'
                        checked={values.trab_modo === 'existente'}
                        onChange={() => setFieldValue('trab_modo', 'existente')}
                        icon='HeroUserCircle'>
                        <p className='text-sm font-semibold'>Trabajador existente</p>
                        <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
                            Buscar entre los trabajadores ya registrados en la empresa.
                        </p>
                    </RadioCard>
                    <RadioCard
                        id='trab_modo_nuevo'
                        name='trab_modo'
                        value='nuevo'
                        checked={values.trab_modo === 'nuevo'}
                        onChange={() => setFieldValue('trab_modo', 'nuevo')}
                        icon='HeroPlus'>
                        <p className='text-sm font-semibold'>Crear nuevo trabajador</p>
                        <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
                            Registrar un nuevo trabajador durante la creacion del contrato.
                        </p>
                    </RadioCard>
                </div>
            </div>

            {values.trab_modo === 'existente' ? (
                <div className='space-y-3'>
                    {mostrarSelectorEmpresa && (
                        <div>
                            <Label htmlFor='trab_empresa_cliente_id'>
                                Empresa cliente <span className='text-red-500'>*</span>
                            </Label>
                            <SelectReact
                                name='trab_empresa_cliente_id'
                                options={empresasClienteOpts}
                                placeholder='Selecciona una empresa cliente'
                                value={
                                    empresasClienteOpts.find(
                                        (o) => o.value === String(values.trab_empresa_cliente_id),
                                    ) || null
                                }
                                onChange={(opt) => {
                                    setFieldValue(
                                        'trab_empresa_cliente_id',
                                        opt ? Number((opt as TSelectOption).value) : '',
                                    );
                                    setFieldValue('trab_sucursal_id', '');
                                    setFieldValue('trab_usuario_empresa_id', '');
                                    formik.setFieldTouched(
                                        'trab_empresa_cliente_id',
                                        true,
                                        false,
                                    );
                                }}
                            />
                            {touched.trab_empresa_cliente_id &&
                                errors.trab_empresa_cliente_id && (
                                    <div className='text-xs text-red-500 mt-1'>
                                        {errors.trab_empresa_cliente_id}
                                    </div>
                                )}
                        </div>
                    )}
                    {/* Sucursal — filtra la lista de trabajadores */}
                    <div>
                        <Label>
                            Sucursal <span className='text-red-500'>*</span>
                        </Label>
                        <SelectReact
                            name='trab_sucursal_id'
                            options={sucursalesOpts}
                            placeholder='Selecciona una sucursal'
                            isDisabled={mostrarSelectorEmpresa && !values.trab_empresa_cliente_id}
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
                                setFieldValue('trab_usuario_empresa_id', '');
                                formik.setFieldTouched('trab_sucursal_id', true, false);
                                if (opt) {
                                    formik.setFieldError('trab_sucursal_id', undefined);
                                }
                            }}
                        />
                        {touched.trab_sucursal_id && errors.trab_sucursal_id && (
                            <div className='text-xs text-red-500 mt-1'>
                                {errors.trab_sucursal_id}
                            </div>
                        )}
                    </div>
                    <div>
                        <Label htmlFor='trab_usuario_empresa_id'>
                            Trabajador <span className='text-red-500'>*</span>
                        </Label>
                        <SelectReact
                            name='trab_usuario_empresa_id'
                            options={usuariosOpts}
                            placeholder={
                                mostrarSelectorEmpresa && !values.trab_empresa_cliente_id
                                    ? 'Primero selecciona una empresa cliente'
                                    : !values.trab_sucursal_id
                                      ? 'Primero selecciona una sucursal'
                                      : 'Selecciona un trabajador'
                            }
                            isDisabled={
                                (mostrarSelectorEmpresa && !values.trab_empresa_cliente_id) ||
                                !values.trab_sucursal_id
                            }
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
                </div>
            ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                    {mostrarSelectorEmpresa && (
                        <div className='md:col-span-2'>
                            <Label>
                                Empresa cliente <span className='text-red-500'>*</span>
                            </Label>
                            <SelectReact
                                name='trab_empresa_cliente_id_nuevo'
                                options={empresasClienteOpts}
                                placeholder='Selecciona una empresa cliente'
                                value={
                                    empresasClienteOpts.find(
                                        (o) =>
                                            o.value === String(values.trab_empresa_cliente_id),
                                    ) || null
                                }
                                onChange={(opt) => {
                                    setFieldValue(
                                        'trab_empresa_cliente_id',
                                        opt ? Number((opt as TSelectOption).value) : '',
                                    );
                                    setFieldValue('trab_sucursal_id', '');
                                    formik.setFieldTouched(
                                        'trab_empresa_cliente_id',
                                        true,
                                        false,
                                    );
                                }}
                            />
                        </div>
                    )}
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
                            isDisabled={mostrarSelectorEmpresa && !values.trab_empresa_cliente_id}
                            placeholder={
                                mostrarSelectorEmpresa && !values.trab_empresa_cliente_id
                                    ? 'Primero selecciona empresa cliente'
                                    : 'Selecciona una sucursal'
                            }
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
