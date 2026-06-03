import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import {
    useCrearBancoInlineMutation,
    useGetAfpCatalogoQuery,
    useGetBancoCatalogoQuery,
} from '@/store/slices/rrhh/catalogosRrhhApi';
import {
    useActualizarDatosRelacionadosContratoMutation,
    useUpdateContratoTrabajadorMutation,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { MONEDA_LABORAL_OPTIONS, SISTEMA_SALUD_OPTIONS, TIPO_CUENTA_OPTIONS } from './types';

interface ITabRemuneracionesProps {
    contrato: IContratoTrabajador;
    tab: 'sueldo' | 'prevision';
}

const SeccionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className='mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
        {children}
    </p>
);

const TabRemuneracionesTrabajador = ({ contrato, tab }: ITabRemuneracionesProps) => {
    const prev = contrato.datos_previsionales_trabajador;
    const esBorrador = contrato.estado === 'borrador';
    const [editando, setEditando] = useState(false);
    const [descuentoOption, setDescuentoOption] = useState('20');

    const { data: afpList = [] } = useGetAfpCatalogoQuery(undefined, { skip: !editando });
    const { data: bancoList = [] } = useGetBancoCatalogoQuery(undefined, { skip: !editando });
    const [crearBanco] = useCrearBancoInlineMutation();
    const [updateContrato] = useUpdateContratoTrabajadorMutation();
    const [actualizarDatos] = useActualizarDatosRelacionadosContratoMutation();
    const [guardando, setGuardando] = useState(false);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            // Remuneraciones del contrato
            sueldo_base: contrato.sueldo_base ?? '',
            moneda: contrato.moneda ?? 'CLP',
            tipo_gratificacion: contrato.tipo_gratificacion ?? 'no_aplica',
            bono_movilizacion: contrato.bono_movilizacion ?? '',
            bono_colacion: contrato.bono_colacion ?? '',
            sueldo_liquido: contrato.sueldo_liquido ?? '',
            // Previsionales
            afp: prev?.afp_id ? String(prev.afp_id) : '',
            sistema_salud: prev?.sistema_salud ?? '',
            nombre_isapre: prev?.nombre_isapre ?? '',
            banco: prev?.banco ?? '',
            tipo_cuenta_bancaria: prev?.tipo_cuenta_bancaria ?? '',
            numero_cuenta_bancaria: prev?.numero_cuenta_bancaria ?? '',
        },
        onSubmit: async (values) => {
            setGuardando(true);
            try {
                // 1) Actualizar campos del contrato
                await updateContrato({
                    id: contrato.id,
                    data: {
                        sueldo_base: values.sueldo_base !== '' ? values.sueldo_base : undefined,
                        moneda: values.moneda,
                        tipo_gratificacion: values.tipo_gratificacion,
                        bono_movilizacion: values.bono_movilizacion !== '' ? values.bono_movilizacion : undefined,
                        bono_colacion: values.bono_colacion !== '' ? values.bono_colacion : undefined,
                        sueldo_liquido: values.sueldo_liquido !== '' ? values.sueldo_liquido : null,
                    } as Partial<IContratoTrabajador>,
                }).unwrap();

                // 2) Actualizar previsionales / banco
                const prevPayload: Record<string, unknown> = {};
                if (values.afp) prevPayload.afp = Number(values.afp);
                if (values.sistema_salud) prevPayload.sistema_salud = values.sistema_salud;
                if (values.nombre_isapre) prevPayload.nombre_isapre = values.nombre_isapre;
                if (values.banco) prevPayload.banco = values.banco;
                if (values.tipo_cuenta_bancaria) prevPayload.tipo_cuenta_bancaria = values.tipo_cuenta_bancaria;
                if (values.numero_cuenta_bancaria) prevPayload.numero_cuenta_bancaria = values.numero_cuenta_bancaria;
                if (Object.keys(prevPayload).length > 0) {
                    await actualizarDatos({ id: contrato.id, data: prevPayload }).unwrap();
                }

                toast.success('Remuneraciones actualizadas');
                setEditando(false);
            } catch (err: unknown) {
                toast.error(getErrorMessage(err));
            } finally {
                setGuardando(false);
            }
        },
    });

    const afpOptions: TSelectOption[] = afpList.map((a) => ({ value: String(a.id), label: a.nombre }));
    const bancoOptions: TSelectOption[] = bancoList.map((b) => ({ value: b.nombre, label: b.nombre }));

    const handleCrearBanco = async (nombre: string) => {
        try {
            await crearBanco({ nombre }).unwrap();
        } catch {
            // ignorar
        }
        formik.setFieldValue('banco', nombre);
    };

    if (editando) {
        // Cálculos en tiempo real (mismo patrón que StepRemuneraciones)
        const fmtEdit = (v: number) => formatCurrency(v, formik.values.moneda);
        const sueldoBaseEdit = Number(formik.values.sueldo_base) || 0;
        const bonoColacionEdit = Number(formik.values.bono_colacion) || 0;
        const bonoMovilizacionEdit = Number(formik.values.bono_movilizacion) || 0;
        const gratificacionEdit = formik.values.tipo_gratificacion === 'art_50_mensual'
            ? Math.round(sueldoBaseEdit * 0.25)
            : 0;
        const totalBrutoEdit =
            sueldoBaseEdit + gratificacionEdit + bonoColacionEdit + bonoMovilizacionEdit;
        const incluirDescuentos = descuentoOption !== 'no';
        const pctDescuentos = Number(descuentoOption) || 0;
        const descuentosEdit = incluirDescuentos
            ? Math.round(sueldoBaseEdit * (pctDescuentos / 100))
            : 0;
        const totalLiquidoEdit = Math.max(0, totalBrutoEdit - descuentosEdit);

        const DESCUENTO_OPTIONS = [
            { value: 'no', label: 'No aplica' },
            { value: '10', label: '10%' },
            { value: '15', label: '15%' },
            { value: '20', label: '20%' },
            { value: '25', label: '25%' },
            { value: '30', label: '30%' },
        ];

        const GRATIFICACION_OPTIONS = [
            { value: 'no_aplica', label: 'No aplica' },
            { value: 'art_47', label: 'Anual (Art. 47 CT)' },
            { value: 'art_50_mensual', label: 'Mensual garantizada (Art. 50 CT)' },
        ];

        return (
            <div className='space-y-4'>
                <Card>
                    <CardHeader>
                        <span>{tab === 'sueldo' ? 'Sueldo' : 'Previsión'}</span>
                    </CardHeader>
                    <CardBody>
                        <div className='space-y-4'>
                            {tab === 'sueldo' ? (
                                <>
                                    {/* Sueldo bruto + Moneda */}
                                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                                        <div>
                                            <Label htmlFor='sueldo_base'>Sueldo bruto</Label>
                                            <Input
                                                id='sueldo_base'
                                                name='sueldo_base'
                                                type='number'
                                                min={0}
                                                placeholder='0'
                                                value={formik.values.sueldo_base}
                                                onChange={formik.handleChange}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor='moneda'>Moneda</Label>
                                            <SelectReact
                                                id='moneda'
                                                name='moneda'
                                                options={MONEDA_LABORAL_OPTIONS}
                                                value={
                                                    MONEDA_LABORAL_OPTIONS.find(
                                                        (o) => o.value === formik.values.moneda,
                                                    ) ?? null
                                                }
                                                onChange={(opt) =>
                                                    formik.setFieldValue(
                                                        'moneda',
                                                        (opt as TSelectOption)?.value ?? 'CLP',
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Gratificacion + Descuentos estimados */}
                                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                                        <div>
                                            <Label htmlFor='tipo_gratificacion'>
                                                Tipo de gratificacion
                                            </Label>
                                            <SelectReact
                                                id='tipo_gratificacion'
                                                name='tipo_gratificacion'
                                                options={GRATIFICACION_OPTIONS}
                                                value={
                                                    GRATIFICACION_OPTIONS.find(
                                                        (o) => o.value === formik.values.tipo_gratificacion,
                                                    ) ?? GRATIFICACION_OPTIONS[0]
                                                }
                                                onChange={(opt) =>
                                                    formik.setFieldValue(
                                                        'tipo_gratificacion',
                                                        (opt as TSelectOption)?.value ?? 'no_aplica',
                                                    )
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor='descuentos_legales'>
                                                Descuentos legales (estimado)
                                            </Label>
                                            <SelectReact
                                                id='descuentos_legales'
                                                name='descuentos_legales'
                                                options={DESCUENTO_OPTIONS}
                                                value={
                                                    DESCUENTO_OPTIONS.find(
                                                        (o) => o.value === descuentoOption,
                                                    ) ?? null
                                                }
                                                onChange={(opt) =>
                                                    setDescuentoOption(
                                                        (opt as TSelectOption)?.value ?? 'no',
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Bonos */}
                                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                                        <div>
                                            <Label htmlFor='bono_colacion'>Bono colacion</Label>
                                            <Input
                                                id='bono_colacion'
                                                name='bono_colacion'
                                                type='number'
                                                min={0}
                                                placeholder='0'
                                                value={formik.values.bono_colacion}
                                                onChange={formik.handleChange}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor='bono_movilizacion'>
                                                Bono movilizacion
                                            </Label>
                                            <Input
                                                id='bono_movilizacion'
                                                name='bono_movilizacion'
                                                type='number'
                                                min={0}
                                                placeholder='0'
                                                value={formik.values.bono_movilizacion}
                                                onChange={formik.handleChange}
                                            />
                                        </div>
                                    </div>

                                    {/* Resumen en tiempo real */}
                                    <div className='space-y-1 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800/50'>
                                        <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                            <span>Sueldo base</span>
                                            <span>{fmtEdit(sueldoBaseEdit)}</span>
                                        </div>
                                        {gratificacionEdit > 0 && (
                                            <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                                <span>Gratificacion legal</span>
                                                <span className='text-emerald-600 dark:text-emerald-400'>
                                                    +{fmtEdit(gratificacionEdit)}
                                                </span>
                                            </div>
                                        )}
                                        {bonoColacionEdit > 0 && (
                                            <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                                <span>Bono colacion</span>
                                                <span className='text-emerald-600 dark:text-emerald-400'>
                                                    +{fmtEdit(bonoColacionEdit)}
                                                </span>
                                            </div>
                                        )}
                                        {bonoMovilizacionEdit > 0 && (
                                            <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                                <span>Bono movilizacion</span>
                                                <span className='text-emerald-600 dark:text-emerald-400'>
                                                    +{fmtEdit(bonoMovilizacionEdit)}
                                                </span>
                                            </div>
                                        )}
                                        <div className='flex justify-between border-t border-zinc-200 pt-1 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'>
                                            <span>Total bruto</span>
                                            <span className='font-medium text-zinc-800 dark:text-zinc-100'>
                                                {fmtEdit(totalBrutoEdit)}
                                            </span>
                                        </div>
                                        {incluirDescuentos && (
                                            <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                                <span>
                                                    Descuentos legales (~{pctDescuentos}%)
                                                </span>
                                                <span className='text-red-500'>
                                                    -{fmtEdit(descuentosEdit)}
                                                </span>
                                            </div>
                                        )}
                                        <div className='mt-1 flex justify-between border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-700'>
                                            <span>Liquido</span>
                                            <span className='text-emerald-600 dark:text-emerald-400'>
                                                {fmtEdit(totalLiquidoEdit)}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* ── Descuentos previsionales ── */}
                                    <div>
                                        <SeccionLabel>Descuentos previsionales</SeccionLabel>
                                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                                            <div>
                                                <Label htmlFor='afp'>AFP</Label>
                                                <SelectReact
                                                    id='afp'
                                                    name='afp'
                                                    isClearable
                                                    options={afpOptions}
                                                    value={
                                                        afpOptions.find(
                                                            (o) => o.value === formik.values.afp,
                                                        ) ?? null
                                                    }
                                                    onChange={(opt) =>
                                                        formik.setFieldValue(
                                                            'afp',
                                                            (opt as TSelectOption)?.value ?? '',
                                                        )
                                                    }
                                                    placeholder='Selecciona AFP...'
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor='sistema_salud'>Sistema de salud</Label>
                                                <SelectReact
                                                    id='sistema_salud'
                                                    name='sistema_salud'
                                                    isClearable
                                                    options={SISTEMA_SALUD_OPTIONS}
                                                    value={
                                                        SISTEMA_SALUD_OPTIONS.find(
                                                            (o) => o.value === formik.values.sistema_salud,
                                                        ) ?? null
                                                    }
                                                    onChange={(opt) =>
                                                        formik.setFieldValue(
                                                            'sistema_salud',
                                                            (opt as TSelectOption)?.value ?? '',
                                                        )
                                                    }
                                                    placeholder='Fonasa / Isapre...'
                                                />
                                            </div>
                                            {formik.values.sistema_salud === 'isapre' && (
                                                <div className='sm:col-span-2'>
                                                    <Label htmlFor='nombre_isapre'>Nombre Isapre</Label>
                                                    <Input
                                                        id='nombre_isapre'
                                                        name='nombre_isapre'
                                                        value={formik.values.nombre_isapre}
                                                        onChange={formik.handleChange}
                                                        placeholder='Banmedica, Cruz Blanca...'
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Datos bancarios ── */}
                                    <div className='rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                        <SeccionLabel>Datos bancarios</SeccionLabel>
                                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                                            <div>
                                                <Label htmlFor='banco'>Banco</Label>
                                                <SelectReact
                                                    id='banco'
                                                    name='banco'
                                                    isCreatable
                                                    isClearable
                                                    options={bancoOptions}
                                                    value={
                                                        formik.values.banco
                                                            ? {
                                                                  value: formik.values.banco,
                                                                  label: formik.values.banco,
                                                              }
                                                            : null
                                                    }
                                                    onChange={(opt) =>
                                                        formik.setFieldValue(
                                                            'banco',
                                                            (opt as TSelectOption)?.value ?? '',
                                                        )
                                                    }
                                                    onCreateOption={handleCrearBanco}
                                                    placeholder='Selecciona o escribe banco...'
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor='tipo_cuenta_bancaria'>
                                                    Tipo de cuenta
                                                </Label>
                                                <SelectReact
                                                    id='tipo_cuenta_bancaria'
                                                    name='tipo_cuenta_bancaria'
                                                    isClearable
                                                    options={TIPO_CUENTA_OPTIONS}
                                                    value={
                                                        TIPO_CUENTA_OPTIONS.find(
                                                            (o) =>
                                                                o.value ===
                                                                formik.values.tipo_cuenta_bancaria,
                                                        ) ?? null
                                                    }
                                                    onChange={(opt) =>
                                                        formik.setFieldValue(
                                                            'tipo_cuenta_bancaria',
                                                            (opt as TSelectOption)?.value ?? '',
                                                        )
                                                    }
                                                    placeholder='Tipo...'
                                                />
                                            </div>
                                            <div className='sm:col-span-2'>
                                                <Label htmlFor='numero_cuenta_bancaria'>
                                                    Numero de cuenta
                                                </Label>
                                                <Input
                                                    id='numero_cuenta_bancaria'
                                                    name='numero_cuenta_bancaria'
                                                    value={formik.values.numero_cuenta_bancaria}
                                                    onChange={formik.handleChange}
                                                    placeholder='00000000'
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardBody>
                    <CardFooter>
                        <div className='flex justify-end gap-2'>
                            <Button
                                type='button'
                                onClick={() => setEditando(false)}
                                isDisable={guardando}>
                                Cancelar
                            </Button>
                            <Button
                                variant='solid'
                                type='button'
                                onClick={() => formik.handleSubmit()}
                                isLoading={guardando}>
                                Guardar cambios
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // ── Vista de lectura ────────────────────────────────────────────────────

    const monedaLabel = contrato.moneda_label ?? contrato.moneda;

    // Variables alineadas con StepRemuneraciones del wizard
    const sueldoBase = parseFloat(contrato.sueldo_base || '0');
    const bonoColacion = parseFloat(contrato.bono_colacion || '0');
    const bonoMovilizacion = parseFloat(contrato.bono_movilizacion || '0');
    const gratificacion =
        contrato.tipo_gratificacion === 'art_50_mensual' ? Math.round(sueldoBase * 0.25) : 0;
    const totalBruto = sueldoBase + gratificacion + bonoColacion + bonoMovilizacion;
    const totalLiquido =
        contrato.sueldo_liquido && contrato.sueldo_liquido !== '0.00'
            ? parseFloat(contrato.sueldo_liquido)
            : null;

    // Si hay liquido guardado, derivar descuentos de la diferencia.
    // Si no, usar estimado 20% del sueldo base (igual que el default del modo editar).
    const descuentosEstimados = Math.round(sueldoBase * 0.2);
    const descuentos = totalLiquido !== null ? totalBruto - totalLiquido : descuentosEstimados;
    const descuentosLabel = totalLiquido !== null ? 'Descuentos legales' : 'Descuentos legales (~20%)';
    const liquidoFinal = totalLiquido ?? Math.max(0, totalBruto - descuentosEstimados);

    const fmtHaber = (v: number) => formatCurrency(v, contrato.moneda);

    const saludLabel =
        prev?.sistema_salud === 'fonasa'
            ? 'Fonasa'
            : prev?.sistema_salud === 'isapre'
              ? `Isapre${prev.nombre_isapre ? ` ${prev.nombre_isapre}` : ''}`
              : prev?.sistema_salud === 'otro'
                ? 'Otro sistema de salud'
                : null;

    const tieneDescuentos = prev?.afp || saludLabel;

    const tipoCuentaLabel: Record<string, string> = {
        corriente: 'Cuenta corriente',
        vista: 'Cuenta vista',
        ahorro: 'Cuenta de ahorro',
        rut: 'Cuenta RUT',
    };

    return (
        <div className='space-y-4'>
            <Card>
                <CardHeader>
                    <div className='flex items-center gap-2'>
                        <span>{tab === 'sueldo' ? 'Sueldo' : 'Previsión'}</span>
                        {tab === 'sueldo' && (
                            <span className='rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'>
                                {monedaLabel}
                            </span>
                        )}
                    </div>
                    {esBorrador && (
                        <Button
                            variant='solid'
                            icon='HeroPencil'
                            size='sm'
                            onClick={() => setEditando(true)}
                        />
                    )}
                </CardHeader>
                <CardBody>
                    {tab === 'sueldo' && (
                    <div className='space-y-1 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800/50'>
                        <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                            <span>Sueldo base</span>
                            <span>{fmtHaber(sueldoBase)}</span>
                        </div>
                        {gratificacion > 0 && (
                            <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                <span>Gratificacion legal</span>
                                <span className='text-emerald-600 dark:text-emerald-400'>
                                    +{fmtHaber(gratificacion)}
                                </span>
                            </div>
                        )}
                        {bonoColacion > 0 && (
                            <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                <span>Bono colacion</span>
                                <span className='text-emerald-600 dark:text-emerald-400'>
                                    +{fmtHaber(bonoColacion)}
                                </span>
                            </div>
                        )}
                        {bonoMovilizacion > 0 && (
                            <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                <span>Bono movilizacion</span>
                                <span className='text-emerald-600 dark:text-emerald-400'>
                                    +{fmtHaber(bonoMovilizacion)}
                                </span>
                            </div>
                        )}
                        <div className='flex justify-between border-t border-zinc-200 pt-1 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'>
                            <span>Total bruto</span>
                            <span className='font-medium text-zinc-800 dark:text-zinc-100'>
                                {fmtHaber(totalBruto)}
                            </span>
                        </div>
                        {descuentos > 0 && (
                            <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                <span>{descuentosLabel}</span>
                                <span className='text-red-500'>-{fmtHaber(descuentos)}</span>
                            </div>
                        )}
                        <div className='mt-1 flex justify-between border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-700'>
                            <span>Liquido</span>
                            <span className='text-emerald-600 dark:text-emerald-400'>
                                {fmtHaber(liquidoFinal)}
                            </span>
                        </div>
                    </div>
                    )}
                    {tab === 'prevision' && (
                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                        {/* Descuentos */}
                        {tieneDescuentos && (
                            <div className='rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                <SeccionLabel>Descuentos previsionales</SeccionLabel>
                                <div className='mt-2 space-y-2'>
                                    {prev?.afp && (
                                        <div className='flex items-center gap-3'>
                                            <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700'>
                                                <Icon
                                                    icon='HeroBuildingLibrary'
                                                    className='text-sm text-zinc-500 dark:text-zinc-400'
                                                />
                                            </div>
                                            <div>
                                                <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                                                    AFP
                                                </p>
                                                <p className='text-sm font-medium text-zinc-800 dark:text-zinc-200'>
                                                    {prev.afp}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {saludLabel && (
                                        <div className='flex items-center gap-3'>
                                            <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30'>
                                                <Icon
                                                    icon='HeroHeart'
                                                    className='text-sm text-red-400 dark:text-red-500'
                                                />
                                            </div>
                                            <div>
                                                <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                                                    Sistema de salud
                                                </p>
                                                <p className='text-sm font-medium text-zinc-800 dark:text-zinc-200'>
                                                    {saludLabel}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Datos bancarios */}
                        <div className='rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50'>
                            <SeccionLabel>Datos bancarios</SeccionLabel>
                            {prev?.banco ? (
                                <div className='mt-2 space-y-2'>
                                    <div className='flex items-center gap-3'>
                                        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700'>
                                            <Icon
                                                icon='HeroBuildingOffice'
                                                className='text-sm text-zinc-500 dark:text-zinc-400'
                                            />
                                        </div>
                                        <div>
                                            <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                                                Banco
                                            </p>
                                            <p className='text-sm font-medium text-zinc-800 dark:text-zinc-200'>
                                                {prev.banco}
                                            </p>
                                        </div>
                                    </div>
                                    {prev.tipo_cuenta_bancaria && (
                                        <div className='flex items-center gap-3'>
                                            <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700'>
                                                <Icon
                                                    icon='HeroCreditCard'
                                                    className='text-sm text-zinc-500 dark:text-zinc-400'
                                                />
                                            </div>
                                            <div>
                                                <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                                                    Tipo de cuenta
                                                </p>
                                                <p className='text-sm font-medium text-zinc-800 dark:text-zinc-200'>
                                                    {tipoCuentaLabel[prev.tipo_cuenta_bancaria] ??
                                                        prev.tipo_cuenta_bancaria}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {prev.numero_cuenta_bancaria && (
                                        <div className='flex items-center gap-3'>
                                            <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700'>
                                                <Icon
                                                    icon='HeroHashtag'
                                                    className='text-sm text-zinc-500 dark:text-zinc-400'
                                                />
                                            </div>
                                            <div>
                                                <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                                                    Número de cuenta
                                                </p>
                                                <p className='font-mono text-sm font-medium tracking-wide text-zinc-800 dark:text-zinc-200'>
                                                    {prev.numero_cuenta_bancaria}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className='mt-2 text-xs italic text-zinc-400 dark:text-zinc-600'>
                                    No registrados
                                </p>
                            )}
                        </div>
                    </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
};

export default TabRemuneracionesTrabajador;

