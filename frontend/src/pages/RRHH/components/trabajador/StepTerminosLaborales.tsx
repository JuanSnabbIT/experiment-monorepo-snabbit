import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import {
    useCreateCargoCatalogoMutation,
    useGetCargosCatalogoQuery,
    useUpdateCargoCatalogoMutation,
} from '@/store/slices/rrhh/cargoCatalogoApi';
import { useAppSelector } from '@/store';
import { FormikProps } from 'formik';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import {
    IFormValuesContratoTrabajador,
    MESES_OPTIONS,
} from './types';
import { IUsuarioEmpresa } from '@/interface/empresas.interface';
import { getErrorMessage } from '@/utils/errorHandlers';

const CAUSAL_REEMPLAZO_OPTIONS: TSelectOption[] = [
    { value: 'licencia_medica', label: 'Licencia medica' },
    { value: 'vacaciones', label: 'Vacaciones' },
    { value: 'prenatal_postnatal', label: 'Pre/postnatal' },
    { value: 'permiso_sin_goce', label: 'Permiso sin goce de sueldo' },
    { value: 'otro', label: 'Otro' },
];

interface Props {
    formik: FormikProps<IFormValuesContratoTrabajador>;
    sucursalDireccion?: string;
    usuariosCliente?: IUsuarioEmpresa[];
}

const calcFechaTermino = (fechaInicio: string, meses: number): string => {
    if (!fechaInicio) return '';
    const d = new Date(fechaInicio + 'T00:00:00');
    d.setMonth(d.getMonth() + meses);
    return d.toISOString().slice(0, 10);
};

const StepTerminosLaborales = ({ formik, sucursalDireccion, usuariosCliente = [] }: Props) => {
    const { values, errors, touched, setFieldValue, setFieldTouched, handleChange, handleBlur } = formik;

    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const empresaId = personalizacionUsuario?.empresa ?? undefined;

    const { data: cargos = [] } = useGetCargosCatalogoQuery();
    const [crearCargo] = useCreateCargoCatalogoMutation();
    const [actualizarCargo, { isLoading: guardandoDefault }] = useUpdateCargoCatalogoMutation();

    const cargosOpts: TSelectOption[] = cargos.map((c) => ({
        value: c.nombre,
        label: c.nombre,
    }));

    const cargoActual = cargos.find((c) => c.nombre === values.cargo);

    // Auto-rellenar lugar_trabajo desde la direccion de la sucursal seleccionada
    useEffect(() => {
        if (sucursalDireccion && !values.lugar_trabajo) {
            setFieldValue('lugar_trabajo', sucursalDireccion);
        }
    }, [sucursalDireccion]);

    // Recalcular fecha_termino cuando cambia cantidad_meses o fecha_inicio (solo plazo_fijo)
    useEffect(() => {
        if (values.tipo_contrato === 'plazo_fijo' && values.cantidad_meses && values.fecha_inicio) {
            const calculada = calcFechaTermino(values.fecha_inicio, Number(values.cantidad_meses));
            setFieldValue('fecha_termino', calculada);
        }
    }, [values.cantidad_meses, values.fecha_inicio, values.tipo_contrato]);

    /* ---- campos reutilizables ---- */
    const campoFechaInicio = (
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
    );

    const campoCargo = (
        <div>
            <Label htmlFor='cargo'>
                Cargo <span className='text-red-500'>*</span>
            </Label>
            <Validation
                isValid={!errors.cargo}
                isTouched={!!touched.cargo}
                invalidFeedback={errors.cargo || ''}>
                <SelectReact
                    name='cargo'
                    isCreatable
                    options={cargosOpts}
                    placeholder='Selecciona o escribe un cargo...'
                    value={values.cargo ? { value: values.cargo, label: values.cargo } : null}
                    onChange={(opt) => {
                        const nombreCargo = opt ? (opt as TSelectOption).value : '';
                        setFieldValue('cargo', nombreCargo);
                        setFieldTouched('cargo', true, false);
                        formik.setFieldError('cargo', undefined);
                        // Al elegir un cargo con funciones por defecto, siempre se
                        // sincroniza el textarea con esas funciones (sobrescribe lo que
                        // hubiera antes, incluidas ediciones manuales). Si el cargo no
                        // tiene funciones_default, se deja el texto actual intacto.
                        const seleccionado = cargos.find((c) => c.nombre === nombreCargo);
                        if (seleccionado?.funciones_default) {
                            setFieldValue('funciones', seleccionado.funciones_default, false);
                        }
                    }}
                    onCreateOption={async (inputValue) => {
                        const nombre = inputValue.trim();
                        if (!nombre) return;
                        try {
                            const creado = await crearCargo({
                                nombre,
                                empresa: empresaId,
                                funciones_default: values.funciones || '',
                            }).unwrap();
                            setFieldValue('cargo', creado.nombre, false);
                            setFieldTouched('cargo', true, false);
                            formik.setFieldError('cargo', undefined);
                        } catch (err) {
                            setFieldValue('cargo', nombre, false);
                            toast.error(getErrorMessage(err));
                        }
                    }}
                    formatCreateLabel={(inputValue) => `Crear cargo "${inputValue.trim()}"`}
                />
            </Validation>
        </div>
    );

    const campoLugarTrabajo = (
        <div>
            <Label htmlFor='lugar_trabajo'>Lugar de trabajo</Label>
            {sucursalDireccion && !values.lugar_trabajo && (
                <p className='mb-1 text-xs text-zinc-400 dark:text-zinc-500'>
                    Pre-llenado desde sucursal (editable)
                </p>
            )}
            <Input
                id='lugar_trabajo'
                name='lugar_trabajo'
                value={values.lugar_trabajo}
                onChange={handleChange}
                onBlur={handleBlur}
            />
        </div>
    );

    return (
        <div className='space-y-4'>
            {values.tipo_contrato === 'plazo_fijo' ? (
                <>
                    {/* Fila 1: Fecha inicio + Duración */}
                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                        {campoFechaInicio}
                        <div>
                            <Label htmlFor='cantidad_meses'>
                                Duracion <span className='text-red-500'>*</span>
                            </Label>
                            <SelectReact
                                name='cantidad_meses'
                                isCreatable
                                options={MESES_OPTIONS as unknown as TSelectOption[]}
                                placeholder='Selecciona o escribe duracion...'
                                value={
                                    values.cantidad_meses !== ''
                                        ? (MESES_OPTIONS.find(
                                              (o) => o.value === String(values.cantidad_meses),
                                          ) ?? {
                                              value: String(values.cantidad_meses),
                                              label: `${values.cantidad_meses} meses`,
                                          })
                                        : null
                                }
                                onChange={(opt) => {
                                    setFieldValue(
                                        'cantidad_meses',
                                        opt ? (opt as TSelectOption).value : '',
                                    );
                                }}
                            />
                            {values.fecha_termino && (
                                <p className='mt-1 text-xs text-emerald-600 dark:text-emerald-400'>
                                    Vence el {values.fecha_termino}
                                </p>
                            )}
                            <Validation
                                isValid={!errors.fecha_termino}
                                isTouched={!!touched.fecha_termino}
                                invalidFeedback={errors.fecha_termino || ''}>
                                <input
                                    type='hidden'
                                    name='fecha_termino'
                                    value={values.fecha_termino}
                                />
                            </Validation>
                        </div>
                    </div>
                    {/* Fila 2: Cargo + Lugar de trabajo */}
                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                        {campoCargo}
                        {campoLugarTrabajo}
                    </div>
                </>
            ) : (
                <>
                    {/* Fila 1: Fecha inicio + Cargo */}
                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                        {campoFechaInicio}
                        {campoCargo}
                    </div>
                    {/* Lugar de trabajo a ancho completo */}
                    {campoLugarTrabajo}
                </>
            )}
            {/* Funciones — siempre a ancho completo */}
            <div>
                <div className='mb-1 flex items-center justify-between gap-2'>
                    <Label htmlFor='funciones' className='mb-0'>
                        Funciones / Descripcion del cargo
                    </Label>
                    {cargoActual && (
                        <div className='flex gap-1'>
                            {cargoActual.funciones_default && (
                                <Tooltip text='Restaurar funciones por defecto de este cargo'>
                                    <Button
                                        type='button'
                                        size='xs'
                                        variant='outline'
                                        color='zinc'
                                        icon='HeroArrowPath'
                                        onClick={() =>
                                            setFieldValue('funciones', cargoActual.funciones_default, false)
                                        }
                                    />
                                </Tooltip>
                            )}
                            <Tooltip text='Guardar el texto actual como funciones por defecto de este cargo'>
                                <Button
                                    type='button'
                                    size='xs'
                                    variant='outline'
                                    color='zinc'
                                    icon='HeroBookmark'
                                    isDisable={guardandoDefault}
                                    isLoading={guardandoDefault}
                                    onClick={async () => {
                                        try {
                                            await actualizarCargo({
                                                id: cargoActual.id,
                                                funciones_default: values.funciones,
                                            }).unwrap();
                                            toast.success('Funciones por defecto actualizadas para este cargo.');
                                        } catch (err) {
                                            toast.error(getErrorMessage(err));
                                        }
                                    }}
                                />
                            </Tooltip>
                        </div>
                    )}
                </div>
                <Textarea
                    id='funciones'
                    name='funciones'
                    rows={3}
                    placeholder='Describe las funciones...'
                    value={values.funciones}
                    onChange={handleChange}
                    onBlur={handleBlur}
                />
            </div>

            {/* Bloque condicional reemplazo */}
            {values.tipo_contrato === 'reemplazo' && (
                <div className='rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3 dark:border-amber-800 dark:bg-amber-900/20'>
                    <p className='text-xs font-semibold text-amber-700 dark:text-amber-400'>
                        Datos del trabajador reemplazado (Art. 10 CT)
                    </p>
                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                        <div>
                            <Label htmlFor='trab_trabajador_reemplazado_id'>Trabajador reemplazado</Label>
                            <SelectReact
                                name='trab_trabajador_reemplazado_id'
                                options={usuariosCliente.map((u) => ({
                                    value: String(u.id),
                                    label: `${u.nombre_usuario} — ${u.papeleta?.rut ?? u.email_usuario}`,
                                }))}
                                placeholder='Selecciona el trabajador...'
                                isClearable
                                value={
                                    values.trab_trabajador_reemplazado_id
                                        ? {
                                              value: String(values.trab_trabajador_reemplazado_id),
                                              label: usuariosCliente.find(
                                                  (u) => u.id === values.trab_trabajador_reemplazado_id,
                                              )?.nombre_usuario ?? String(values.trab_trabajador_reemplazado_id),
                                          }
                                        : null
                                }
                                onChange={(opt) =>
                                    setFieldValue(
                                        'trab_trabajador_reemplazado_id',
                                        opt ? Number((opt as TSelectOption).value) : '',
                                    )
                                }
                            />
                        </div>
                        <div>
                            <Label htmlFor='causal_reemplazo'>
                                Causal de reemplazo <span className='text-red-500'>*</span>
                            </Label>
                            <Validation
                                isValid={!errors.causal_reemplazo}
                                isTouched={!!touched.causal_reemplazo}
                                invalidFeedback={errors.causal_reemplazo || ''}>
                                <SelectReact
                                    name='causal_reemplazo'
                                    options={CAUSAL_REEMPLAZO_OPTIONS}
                                    placeholder='Selecciona causal...'
                                    value={CAUSAL_REEMPLAZO_OPTIONS.find((o) => o.value === values.causal_reemplazo) ?? null}
                                    onChange={(opt) =>
                                        setFieldValue('causal_reemplazo', opt ? (opt as TSelectOption).value : '')
                                    }
                                />
                            </Validation>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StepTerminosLaborales;

