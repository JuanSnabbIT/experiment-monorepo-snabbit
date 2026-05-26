import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import { IRelacionEmpresa, IUsuarioEmpresa } from '@/interface/empresas.interface';
import classNames from 'classnames';
import { FormikProps } from 'formik';
import Swal from 'sweetalert2';
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
    const sucursalSeleccionadaNombre = sucursales.find(
        (s) => s.id === Number(values.trab_sucursal_id),
    )?.nombre;
    const usuariosFiltrados =
        values.trab_modo === 'existente' && values.trab_sucursal_id && sucursalSeleccionadaNombre
            ? usuariosCliente.filter((u) => u.nombre_sucursal === sucursalSeleccionadaNombre)
            : usuariosCliente;
    const usuariosOpts: TSelectOption[] = usuariosFiltrados.map((u) => ({
        value: String(u.id),
        label: `${u.nombre_usuario} — ${u.papeleta?.rut ?? u.email_usuario}`,
    }));

    return (
        <div className='space-y-4'>
            {/* Selector de modo como cards */}
            <div>
                <Label className='mb-2 block'>
                    Seleccionar trabajador
                </Label>
                <p className='mb-3 text-xs text-zinc-500 dark:text-zinc-400'>
                    Elige un trabajador existente o crea uno nuevo.
                </p>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                    <button
                        type='button'
                        onClick={() => setFieldValue('trab_modo', 'existente')}
                        className={classNames(
                            'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
                            values.trab_modo === 'existente'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-zinc-200 hover:border-blue-300 dark:border-zinc-700 dark:hover:border-blue-600',
                        )}>
                        <div
                            className={classNames(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all',
                                values.trab_modo === 'existente'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800',
                            )}>
                            <svg
                                className='h-5 w-5'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'>
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                                />
                            </svg>
                        </div>
                        <div>
                            <p className='text-sm font-semibold'>Trabajador existente</p>
                            <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
                                Buscar entre los trabajadores ya registrados en la empresa.
                            </p>
                        </div>
                    </button>
                    <button
                        type='button'
                        onClick={() => setFieldValue('trab_modo', 'nuevo')}
                        className={classNames(
                            'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
                            values.trab_modo === 'nuevo'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-zinc-200 hover:border-blue-300 dark:border-zinc-700 dark:hover:border-blue-600',
                        )}>
                        <div
                            className={classNames(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all',
                                values.trab_modo === 'nuevo'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800',
                            )}>
                            <svg
                                className='h-5 w-5'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'>
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
                                />
                            </svg>
                        </div>
                        <div>
                            <p className='text-sm font-semibold'>Crear nuevo trabajador</p>
                            <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
                                Registrar un nuevo trabajador durante la creacion del contrato.
                            </p>
                        </div>
                    </button>
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
                        <Label>Sucursal</Label>
                        <SelectReact
                            name='trab_sucursal_id'
                            options={sucursalesOpts}
                            placeholder='Filtrar por sucursal (opcional)'
                            isClearable
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
                            }}
                        />
                    </div>
                    <div>
                        <Label htmlFor='trab_usuario_empresa_id'>
                            Trabajador <span className='text-red-500'>*</span>
                        </Label>
                        <SelectReact
                            name='trab_usuario_empresa_id'
                            options={usuariosOpts}
                            placeholder={
                                !mostrarSelectorEmpresa || values.trab_empresa_cliente_id
                                    ? 'Selecciona un trabajador'
                                    : 'Primero selecciona una empresa cliente'
                            }
                            isDisabled={
                                mostrarSelectorEmpresa && !values.trab_empresa_cliente_id
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

            {/* Notificacion al empleador */}
            <div
                className={classNames(
                    'flex items-start gap-3 rounded-xl border-2 p-3 transition-all',
                    values.enviar_al_empleador
                        ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-900/10'
                        : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/30',
                )}>
                <input
                    id='enviar_al_empleador'
                    type='checkbox'
                    className='mt-0.5 h-4 w-4 cursor-pointer accent-blue-500'
                    checked={values.enviar_al_empleador}
                    onChange={async (e) => {
                        const nuevoValor = e.target.checked;
                        if (!nuevoValor) {
                            const { isConfirmed } = await Swal.fire({
                                title: 'Desactivar notificacion al empleador',
                                text: 'No se enviara un correo al contacto del empleador cuando se cree el contrato. ¿Confirmas?',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonText: 'Si, desactivar',
                                cancelButtonText: 'Cancelar',
                            });
                            if (!isConfirmed) return;
                        }
                        setFieldValue('enviar_al_empleador', nuevoValor);
                    }}
                />
                <div>
                    <Label htmlFor='enviar_al_empleador' className='!m-0 cursor-pointer'>
                        Notificar al empleador al crear el contrato
                    </Label>
                    <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
                        {emailEmpleador
                            ? `Se enviara a: ${emailEmpleador}`
                            : 'Se enviara un correo al contacto de la empresa empleadora.'}
                    </p>
                </div>
            </div>

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
