import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import RadioCard from '@/components/form/RadioCard';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/icon/Icon';
import type { IUseContratoWizardReturn } from '@/hooks/useContratoWizard';
import { IRelacionEmpresa, IUsuarioEmpresa } from '@/interface/empresas.interface';
import {
    useCrearNacionalidadInlineMutation,
    useGetNacionalidadCatalogoQuery,
} from '@/store/slices/rrhh/catalogosRrhhApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { formatRut } from '@/utils/rut.util';
import { FormikProps } from 'formik';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { IFormValuesContratoTrabajador } from './types';

const ESTADO_CIVIL_OPTIONS: TSelectOption[] = [
    { value: 'soltero_a', label: 'Soltero/a' },
    { value: 'casado_a', label: 'Casado/a' },
    { value: 'conviviente_civil', label: 'Conviviente civil' },
    { value: 'divorciado_a', label: 'Divorciado/a' },
    { value: 'viudo_a', label: 'Viudo/a' },
];

interface Props {
    formik: FormikProps<IFormValuesContratoTrabajador>;
    usuariosCliente: IUsuarioEmpresa[];
    sucursales: { id: number; nombre: string }[];
    empresasCliente?: IRelacionEmpresa[];
    wizard?: IUseContratoWizardReturn;
    bloqueado?: boolean;
    nombreTrabajador?: string;
}

const StepTrabajador = ({
    formik,
    usuariosCliente,
    sucursales,
    empresasCliente,
    bloqueado,
    nombreTrabajador,
}: Props) => {
    const { values, errors, touched, setFieldValue, handleChange, handleBlur } = formik;
    const { data: nacionalidadesCatalogo = [] } = useGetNacionalidadCatalogoQuery();
    const [crearNacionalidad] = useCrearNacionalidadInlineMutation();

    const normalizarNacionalidad = (value: string): string => {
        const normalizada = value.trim().replace(/\s+/g, ' ');
        if (!normalizada) return '';
        const lower = normalizada.toLocaleLowerCase('es-CL');
        return `${lower.charAt(0).toLocaleUpperCase('es-CL')}${lower.slice(1)}`;
    };

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

    const nacionalidadesUsuarios = useMemo(() => {
        const únicas = Array.from(
            new Set(
                usuariosCliente
                    .map((u) => u.nacionalidad)
                    .filter((nacionalidad): nacionalidad is string => !!nacionalidad?.trim())
                    .map((nacionalidad) => normalizarNacionalidad(nacionalidad)),
            ),
        );
        return únicas.sort((a, b) => a.localeCompare(b, 'es-CL'));
    }, [usuariosCliente]);

    const nacionalidadesCatalogoNormalizadas = useMemo(
        () =>
            nacionalidadesCatalogo
                .map((item) => normalizarNacionalidad(item.nombre))
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, 'es-CL')),
        [nacionalidadesCatalogo],
    );

    const [nacionalidadesCreadas, setNacionalidadesCreadas] = useState<string[]>([]);

    useEffect(() => {
        if (!values.trab_nacionalidad?.trim()) return;
        const actual = normalizarNacionalidad(values.trab_nacionalidad);
        if (!actual) return;
        setNacionalidadesCreadas((prev) =>
            prev.includes(actual) ||
            nacionalidadesUsuarios.includes(actual) ||
            nacionalidadesCatalogoNormalizadas.includes(actual)
                ? prev
                : [...prev, actual],
        );
    }, [values.trab_nacionalidad, nacionalidadesUsuarios, nacionalidadesCatalogoNormalizadas]);

    const nacionalidadOptions: TSelectOption[] = useMemo(() => {
        const merged = Array.from(
            new Set([
                ...nacionalidadesCatalogoNormalizadas,
                ...nacionalidadesUsuarios,
                ...nacionalidadesCreadas,
            ]),
        );
        return merged
            .sort((a, b) => a.localeCompare(b, 'es-CL'))
            .map((item) => ({ value: item, label: item }));
    }, [nacionalidadesCatalogoNormalizadas, nacionalidadesUsuarios, nacionalidadesCreadas]);

    if (bloqueado) {
        return (
            <div className='space-y-4'>
                <div className='rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60'>
                    <div className='flex items-center gap-3'>
                        <Icon icon='HeroUserCircle' className='h-9 w-9 shrink-0 text-blue-400' />
                        <div className='min-w-0 flex-1'>
                            <p className='text-xs text-zinc-500 dark:text-zinc-400'>Trabajador</p>
                            <p className='truncate font-semibold text-zinc-800 dark:text-zinc-100'>
                                {nombreTrabajador ?? 'Trabajador seleccionado'}
                            </p>
                        </div>
                        <Badge color='blue' variant='outline'>
                            Preseleccionado
                        </Badge>
                    </div>
                    <p className='mt-3 text-xs text-zinc-400 dark:text-zinc-500'>
                        El trabajador fue seleccionado desde su ficha. Para cambiar el trabajador,
                        cierra este formulario y ábrelo desde otro contexto.
                    </p>
                </div>
            </div>
        );
    }

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
                                setFieldValue('trab_sucursal_id', opt ? Number((opt as TSelectOption).value) : '', false);
                                setFieldValue('trab_usuario_empresa_id', '', false);
                                formik.setFieldTouched('trab_sucursal_id', true, false);
                                formik.setFieldError('trab_sucursal_id', undefined);
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
                                const ueId = opt ? Number((opt as TSelectOption).value) : '';
                                setFieldValue('trab_usuario_empresa_id', ueId);
                                // Propagar el RUT del trabajador elegido para que el
                                // Step Previsión pueda consultar afiliación AFP.
                                const elegido = usuariosFiltrados.find((u) => u.id === ueId);
                                setFieldValue('trab_rut', elegido?.papeleta?.rut ?? '');
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
                        <Label htmlFor='trab_last_name'>
                            Apellidos <span className='text-red-500'>*</span>
                        </Label>
                        <Validation
                            isValid={!errors.trab_last_name}
                            isTouched={!!touched.trab_last_name}
                            invalidFeedback={errors.trab_last_name || ''}>
                            <Input
                                id='trab_last_name'
                                name='trab_last_name'
                                value={values.trab_last_name}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                        </Validation>
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
                        <Validation
                            isValid={!errors.trab_rut}
                            isTouched={!!touched.trab_rut}
                            invalidFeedback={errors.trab_rut || ''}>
                            <Input
                                id='trab_rut'
                                name='trab_rut'
                                value={values.trab_rut}
                                onChange={handleChange}
                                onBlur={(event) => {
                                    handleBlur(event);
                                    setFieldValue('trab_rut', formatRut(event.target.value));
                                }}
                            />
                        </Validation>
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
                                setFieldValue('trab_sucursal_id', opt ? Number((opt as TSelectOption).value) : '', false);
                                formik.setFieldTouched('trab_sucursal_id', true, false);
                                formik.setFieldError('trab_sucursal_id', undefined);
                            }}
                        />
                        {touched.trab_sucursal_id && errors.trab_sucursal_id && (
                            <div className='text-xs text-red-500 mt-1'>
                                {errors.trab_sucursal_id}
                            </div>
                        )}
                    </div>
                    <div>
                        <Label htmlFor='trab_nacionalidad'>
                            Nacionalidad <span className='text-red-500'>*</span>
                        </Label>
                        <Validation
                            isValid={!errors.trab_nacionalidad}
                            isTouched={!!touched.trab_nacionalidad}
                            invalidFeedback={errors.trab_nacionalidad || ''}>
                            <SelectReact
                                name='trab_nacionalidad'
                                options={nacionalidadOptions}
                                placeholder='Selecciona o crea nacionalidad'
                                value={
                                    values.trab_nacionalidad
                                        ? {
                                              value: normalizarNacionalidad(values.trab_nacionalidad),
                                              label: normalizarNacionalidad(values.trab_nacionalidad),
                                          }
                                        : null
                                }
                                onChange={(opt) => {
                                    const value = opt ? (opt as TSelectOption).value : '';
                                    setFieldValue('trab_nacionalidad', normalizarNacionalidad(value));
                                }}
                                isCreatable
                                onCreateOption={async (inputValue) => {
                                    const nueva = normalizarNacionalidad(inputValue);
                                    if (!nueva) return;
                                    try {
                                        const creada = await crearNacionalidad({ nombre: nueva }).unwrap();
                                        const normalizada = normalizarNacionalidad(creada.nombre);
                                        setNacionalidadesCreadas((prev) =>
                                            prev.includes(normalizada)
                                                ? prev
                                                : [...prev, normalizada],
                                        );
                                        setFieldValue('trab_nacionalidad', normalizada);
                                    } catch (error) {
                                        setNacionalidadesCreadas((prev) =>
                                            prev.includes(nueva) ? prev : [...prev, nueva],
                                        );
                                        setFieldValue('trab_nacionalidad', nueva);
                                        toast.error(getErrorMessage(error));
                                    }
                                }}
                                formatCreateLabel={(inputValue) => {
                                    const preview = normalizarNacionalidad(inputValue);
                                    return preview ? `Crear "${preview}"` : 'Ingresa una nacionalidad';
                                }}
                                isClearable
                            />
                        </Validation>
                    </div>
                    <div>
                        <Label htmlFor='trab_fecha_nacimiento'>
                            Fecha de nacimiento <span className='text-red-500'>*</span>
                        </Label>
                        <Validation
                            isValid={!errors.trab_fecha_nacimiento}
                            isTouched={!!touched.trab_fecha_nacimiento}
                            invalidFeedback={errors.trab_fecha_nacimiento || ''}>
                            <Input
                                id='trab_fecha_nacimiento'
                                name='trab_fecha_nacimiento'
                                type='date'
                                value={values.trab_fecha_nacimiento}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                        </Validation>
                    </div>
                    <div className='md:col-span-2'>
                        <Label htmlFor='trab_direccion'>
                            Direccion <span className='text-red-500'>*</span>
                        </Label>
                        <Validation
                            isValid={!errors.trab_direccion}
                            isTouched={!!touched.trab_direccion}
                            invalidFeedback={errors.trab_direccion || ''}>
                            <Input
                                id='trab_direccion'
                                name='trab_direccion'
                                value={values.trab_direccion}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                        </Validation>
                    </div>
                    {/* Campos legales Art. 10 CT */}
                    <div>
                        <Label htmlFor='trab_estado_civil'>Estado civil</Label>
                        <SelectReact
                            name='trab_estado_civil'
                            options={ESTADO_CIVIL_OPTIONS}
                            placeholder='Selecciona...'
                            value={ESTADO_CIVIL_OPTIONS.find((o) => o.value === values.trab_estado_civil) ?? null}
                            onChange={(opt) => setFieldValue('trab_estado_civil', opt ? (opt as TSelectOption).value : '')}
                            isClearable
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default StepTrabajador;
