import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import { useUpdateContratoTrabajadorMutation } from '@/store/slices/rrhh/contratoTrabajadorApi';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { MONEDA_LABORAL_OPTIONS } from './types';

interface Props {
    contrato: IContratoTrabajador;
}

const GRATIFICACION_OPTIONS = [
    { value: 'no_aplica', label: 'No aplica' },
    { value: 'art_47', label: 'Anual (Art. 47 CT)' },
    { value: 'art_50_mensual', label: 'Mensual garantizada (Art. 50 CT)' },
];

const DESCUENTO_OPTIONS = [
    { value: 'no', label: 'No aplica' },
    { value: '10', label: '10%' },
    { value: '15', label: '15%' },
    { value: '20', label: '20%' },
    { value: '25', label: '25%' },
    { value: '30', label: '30%' },
];

const TabRemuneracionesTrabajador = ({ contrato }: Props) => {
    const esBorrador = contrato.estado === 'borrador';
    const [editando, setEditando] = useState(false);
    const [descuentoOption, setDescuentoOption] = useState('20');
    const [guardando, setGuardando] = useState(false);

    const [updateContrato] = useUpdateContratoTrabajadorMutation();

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            sueldo_base: contrato.sueldo_base ?? '',
            moneda: contrato.moneda ?? 'CLP',
            tipo_gratificacion: contrato.tipo_gratificacion ?? 'no_aplica',
            bono_movilizacion: contrato.bono_movilizacion ?? '',
            bono_colacion: contrato.bono_colacion ?? '',
            sueldo_liquido: contrato.sueldo_liquido ?? '',
        },
        onSubmit: async (values) => {
            setGuardando(true);
            try {
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
                toast.success('Remuneraciones actualizadas');
                setEditando(false);
            } catch (err: unknown) {
                toast.error(getErrorMessage(err));
            } finally {
                setGuardando(false);
            }
        },
    });

    // ── Cálculos en tiempo real ────────────────────────────────────────
    const fmt = (v: number) => formatCurrency(v, formik.values.moneda);
    const sueldoBase = Number(formik.values.sueldo_base) || 0;
    const bonoColacion = Number(formik.values.bono_colacion) || 0;
    const bonoMovilizacion = Number(formik.values.bono_movilizacion) || 0;
    const gratificacion = formik.values.tipo_gratificacion === 'art_50_mensual'
        ? Math.round(sueldoBase * 0.25) : 0;
    const totalBruto = sueldoBase + gratificacion + bonoColacion + bonoMovilizacion;
    const incluirDescuentos = descuentoOption !== 'no';
    const pctDescuentos = Number(descuentoOption) || 0;
    const descuentos = incluirDescuentos ? Math.round(sueldoBase * (pctDescuentos / 100)) : 0;
    const totalLiquido = Math.max(0, totalBruto - descuentos);

    // ── Modo edición ──────────────────────────────────────────────────
    if (editando) {
        return (
            <div className='space-y-4'>
                <Card>
                    <CardHeader><span>Sueldo</span></CardHeader>
                    <CardBody>
                        <div className='space-y-4'>
                            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                                <div>
                                    <Label htmlFor='sueldo_base'>Sueldo bruto</Label>
                                    <Input id='sueldo_base' name='sueldo_base' type='number' min={0} placeholder='0' value={formik.values.sueldo_base} onChange={formik.handleChange} />
                                </div>
                                <div>
                                    <Label htmlFor='moneda'>Moneda</Label>
                                    <SelectReact id='moneda' name='moneda' options={MONEDA_LABORAL_OPTIONS} value={MONEDA_LABORAL_OPTIONS.find((o) => o.value === formik.values.moneda) ?? null} onChange={(opt) => formik.setFieldValue('moneda', (opt as TSelectOption)?.value ?? 'CLP')} />
                                </div>
                            </div>
                            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                                <div>
                                    <Label htmlFor='tipo_gratificacion'>Tipo de gratificacion</Label>
                                    <SelectReact id='tipo_gratificacion' name='tipo_gratificacion' options={GRATIFICACION_OPTIONS} value={GRATIFICACION_OPTIONS.find((o) => o.value === formik.values.tipo_gratificacion) ?? GRATIFICACION_OPTIONS[0]} onChange={(opt) => formik.setFieldValue('tipo_gratificacion', (opt as TSelectOption)?.value ?? 'no_aplica')} />
                                </div>
                                <div>
                                    <Label htmlFor='descuentos_legales'>Descuentos legales (estimado)</Label>
                                    <SelectReact id='descuentos_legales' name='descuentos_legales' options={DESCUENTO_OPTIONS} value={DESCUENTO_OPTIONS.find((o) => o.value === descuentoOption) ?? null} onChange={(opt) => setDescuentoOption((opt as TSelectOption)?.value ?? 'no')} />
                                </div>
                            </div>
                            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                                <div>
                                    <Label htmlFor='bono_colacion'>Bono colacion</Label>
                                    <Input id='bono_colacion' name='bono_colacion' type='number' min={0} placeholder='0' value={formik.values.bono_colacion} onChange={formik.handleChange} />
                                </div>
                                <div>
                                    <Label htmlFor='bono_movilizacion'>Bono movilizacion</Label>
                                    <Input id='bono_movilizacion' name='bono_movilizacion' type='number' min={0} placeholder='0' value={formik.values.bono_movilizacion} onChange={formik.handleChange} />
                                </div>
                            </div>
                            {/* Resumen */}
                            <div className='space-y-1 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800/50'>
                                <div className='flex justify-between text-zinc-600 dark:text-zinc-400'><span>Sueldo base</span><span>{fmt(sueldoBase)}</span></div>
                                {gratificacion > 0 && <div className='flex justify-between text-zinc-600 dark:text-zinc-400'><span>Gratificacion legal</span><span className='text-emerald-600 dark:text-emerald-400'>+{fmt(gratificacion)}</span></div>}
                                {bonoColacion > 0 && <div className='flex justify-between text-zinc-600 dark:text-zinc-400'><span>Bono colacion</span><span className='text-emerald-600 dark:text-emerald-400'>+{fmt(bonoColacion)}</span></div>}
                                {bonoMovilizacion > 0 && <div className='flex justify-between text-zinc-600 dark:text-zinc-400'><span>Bono movilizacion</span><span className='text-emerald-600 dark:text-emerald-400'>+{fmt(bonoMovilizacion)}</span></div>}
                                <div className='flex justify-between border-t border-zinc-200 pt-1 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'><span>Total bruto</span><span className='font-medium text-zinc-800 dark:text-zinc-100'>{fmt(totalBruto)}</span></div>
                                {incluirDescuentos && <div className='flex justify-between text-zinc-600 dark:text-zinc-400'><span>Descuentos legales (~{pctDescuentos}%)</span><span className='text-red-500'>-{fmt(descuentos)}</span></div>}
                                <div className='mt-1 flex justify-between border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-700'><span>Liquido</span><span className='text-emerald-600 dark:text-emerald-400'>{fmt(totalLiquido)}</span></div>
                            </div>
                        </div>
                    </CardBody>
                    <CardFooter>
                        <div className='flex justify-end gap-2'>
                            <Button type='button' onClick={() => setEditando(false)} isDisable={guardando}>Cancelar</Button>
                            <Button variant='solid' type='button' onClick={() => formik.handleSubmit()} isLoading={guardando}>Guardar cambios</Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // ── Modo lectura ──────────────────────────────────────────────────
    const monedaLabel = contrato.moneda_label ?? contrato.moneda;
    const sueldoBaseR = parseFloat(contrato.sueldo_base || '0');
    const bonoColacionR = parseFloat(contrato.bono_colacion || '0');
    const bonoMovilizacionR = parseFloat(contrato.bono_movilizacion || '0');
    const gratificacionR = contrato.tipo_gratificacion === 'art_50_mensual' ? Math.round(sueldoBaseR * 0.25) : 0;
    const totalBrutoR = sueldoBaseR + gratificacionR + bonoColacionR + bonoMovilizacionR;
    const totalLiquidoR = contrato.sueldo_liquido && contrato.sueldo_liquido !== '0.00' ? parseFloat(contrato.sueldo_liquido) : null;
    const descuentosEstimadosR = Math.round(sueldoBaseR * 0.2);
    const descuentosR = totalLiquidoR !== null ? totalBrutoR - totalLiquidoR : descuentosEstimadosR;
    const descuentosLabelR = totalLiquidoR !== null ? 'Descuentos legales' : 'Descuentos legales (~20%)';
    const liquidoFinalR = totalLiquidoR ?? Math.max(0, totalBrutoR - descuentosEstimadosR);
    const fmtR = (v: number) => formatCurrency(v, contrato.moneda);

    return (
        <div className='space-y-4'>
            <Card>
                <CardHeader>
                    <div className='flex items-center gap-2'>
                        <span>Sueldo</span>
                        <span className='rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'>{monedaLabel}</span>
                    </div>
                    {esBorrador && <Button variant='solid' icon='HeroPencil' size='sm' onClick={() => setEditando(true)} />}
                </CardHeader>
                <CardBody>
                    <div className='space-y-1 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800/50'>
                        <div className='flex justify-between text-zinc-600 dark:text-zinc-400'><span>Sueldo base</span><span>{fmtR(sueldoBaseR)}</span></div>
                        {gratificacionR > 0 && <div className='flex justify-between text-zinc-600 dark:text-zinc-400'><span>Gratificacion legal</span><span className='text-emerald-600 dark:text-emerald-400'>+{fmtR(gratificacionR)}</span></div>}
                        {bonoColacionR > 0 && <div className='flex justify-between text-zinc-600 dark:text-zinc-400'><span>Bono colacion</span><span className='text-emerald-600 dark:text-emerald-400'>+{fmtR(bonoColacionR)}</span></div>}
                        {bonoMovilizacionR > 0 && <div className='flex justify-between text-zinc-600 dark:text-zinc-400'><span>Bono movilizacion</span><span className='text-emerald-600 dark:text-emerald-400'>+{fmtR(bonoMovilizacionR)}</span></div>}
                        <div className='flex justify-between border-t border-zinc-200 pt-1 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'><span>Total bruto</span><span className='font-medium text-zinc-800 dark:text-zinc-100'>{fmtR(totalBrutoR)}</span></div>
                        {descuentosR > 0 && <div className='flex justify-between text-zinc-600 dark:text-zinc-400'><span>{descuentosLabelR}</span><span className='text-red-500'>-{fmtR(descuentosR)}</span></div>}
                        <div className='mt-1 flex justify-between border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-700'><span>Liquido</span><span className='text-emerald-600 dark:text-emerald-400'>{fmtR(liquidoFinalR)}</span></div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};

export default TabRemuneracionesTrabajador;
