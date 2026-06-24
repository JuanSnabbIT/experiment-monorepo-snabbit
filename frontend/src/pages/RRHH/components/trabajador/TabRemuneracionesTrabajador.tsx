import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import { useGetAfpCatalogoQuery } from '@/store/slices/rrhh/catalogosRrhhApi';
import { useUpdateContratoTrabajadorMutation } from '@/store/slices/rrhh/contratoTrabajadorApi';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { MONEDA_LABORAL_OPTIONS, TIPO_GRATIFICACION_OPTIONS } from './types';

interface Props {
    contrato: IContratoTrabajador;
}

const PORCENTAJE_DESCUENTO_OPTIONS = [
    { value: '10', label: '10%' },
    { value: '15', label: '15%' },
    { value: '20', label: '20%' },
    { value: '25', label: '25%' },
    { value: '30', label: '30%' },
];

const deriveInitialValues = (c: IContratoTrabajador) => {
    return {
        sueldo: c.sueldo ?? '',
        tipo_sueldo: (c.tipo_sueldo ?? 'base') as 'base' | 'liquido',
        moneda: c.moneda ?? 'CLP',
        gratificacion_activa: !!c.tipo_gratificacion && c.tipo_gratificacion !== 'no_aplica',
        tipo_gratificacion: c.tipo_gratificacion ?? 'no_aplica',
        descuentos_activos: false,
        porcentaje_descuentos: '20',
        bono_colacion_activo: parseFloat(c.bono_colacion || '0') > 0,
        bono_colacion: c.bono_colacion ?? '',
        bono_movilizacion_activo: parseFloat(c.bono_movilizacion || '0') > 0,
        bono_movilizacion: c.bono_movilizacion ?? '',
        descuento_prevision_activo: c.descuento_prevision_activo ?? false,
        descuento_salud_activo: c.descuento_salud_activo ?? false,
    };
};

const TabRemuneracionesTrabajador = ({ contrato }: Props) => {
    const esBorrador = contrato.estado === 'borrador';
    const [modalOpen, setModalOpen] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [updateContrato] = useUpdateContratoTrabajadorMutation();
    const { data: afpList = [] } = useGetAfpCatalogoQuery();

    // AFP del trabajador (para tasas de cotización)
    const afpId = contrato.datos_previsionales_trabajador?.afp_id;
    const afpObj = afpId ? afpList.find((a) => a.id === afpId) : null;
    const tasaAfp = Number(afpObj?.tasa_cotizacion ?? 0.1144);
    const afpNombre = afpObj?.nombre ?? contrato.datos_previsionales_trabajador?.afp;

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: deriveInitialValues(contrato),
        onSubmit: async (values) => {
            setGuardando(true);
            try {
                await updateContrato({
                    id: contrato.id,
                    data: {
                        sueldo: values.sueldo !== '' ? values.sueldo : undefined,
                        tipo_sueldo: values.tipo_sueldo,
                        moneda: values.moneda,
                        tipo_gratificacion: values.gratificacion_activa
                            ? values.tipo_gratificacion
                            : 'no_aplica',
                        bono_colacion: values.bono_colacion_activo ? values.bono_colacion : '0',
                        bono_movilizacion: values.bono_movilizacion_activo ? values.bono_movilizacion : '0',
                        descuento_prevision_activo: values.descuento_prevision_activo,
                        descuento_salud_activo: values.descuento_salud_activo,
                    } as Partial<IContratoTrabajador>,
                }).unwrap();
                toast.success('Remuneraciones actualizadas');
                setModalOpen(false);
            } catch (err: unknown) {
                toast.error(getErrorMessage(err));
            } finally {
                setGuardando(false);
            }
        },
    });

    // ── Cálculos en tiempo real (modal) — solo para modo base ────────
    const fmtModal = (v: number) => formatCurrency(v, formik.values.moneda);
    const esModoBase = formik.values.tipo_sueldo === 'base';
    const mBase = Number(formik.values.sueldo) || 0;
    const mColacion = formik.values.bono_colacion_activo ? Number(formik.values.bono_colacion) || 0 : 0;
    const mMovil = formik.values.bono_movilizacion_activo ? Number(formik.values.bono_movilizacion) || 0 : 0;
    const mGratif =
        formik.values.gratificacion_activa && formik.values.tipo_gratificacion === 'art_50_mensual'
            ? Math.round(mBase * 0.25)
            : 0;
    const mBruto = mBase + mGratif + mColacion + mMovil;
    const mDescGeneral = formik.values.descuentos_activos
        ? Math.round(mBase * ((Number(formik.values.porcentaje_descuentos) || 0) / 100))
        : 0;
    const mDescPrevision = formik.values.descuento_prevision_activo
        ? Math.round(mBase * tasaAfp)
        : 0;
    const mDescSalud = formik.values.descuento_salud_activo
        ? Math.round(mBase * 0.07)
        : 0;
    const mLiquido = Math.max(0, mBruto - mDescGeneral - mDescPrevision - mDescSalud);

    // ── Modo lectura ──────────────────────────────────────────────────
    const monedaLabel = contrato.moneda_label ?? contrato.moneda;
    const fmtR = (v: number) => formatCurrency(v, contrato.moneda);
    const rBase = parseFloat(contrato.sueldo || '0');
    const rEsModoBase = contrato.tipo_sueldo === 'base';
    const rColacion = parseFloat(contrato.bono_colacion || '0');
    const rMovil = parseFloat(contrato.bono_movilizacion || '0');
    const rGratif =
        contrato.tipo_gratificacion === 'art_50_mensual' ? Math.round(rBase * 0.25) : 0;
    const rBruto = rBase + rGratif + rColacion + rMovil;
    const rDescPrevision = contrato.descuento_prevision_activo ? Math.round(rBase * tasaAfp) : 0;
    const rDescSalud = contrato.descuento_salud_activo ? Math.round(rBase * 0.07) : 0;
    const rLiquidoEstimado = Math.max(0, rBruto - rDescPrevision - rDescSalud);

    return (
        <>
            <div className='space-y-4'>
                <Card>
                    <CardHeader>
                        <div className='flex items-center gap-2'>
                            <span>Sueldo</span>
                            <span className='rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'>
                                {monedaLabel}
                            </span>
                        </div>
                        {esBorrador && (
                            <Tooltip text='Editar'>
                                <Button
                                    variant='solid'
                                    icon='HeroPencil'
                                    size='sm'
                                    onClick={() => setModalOpen(true)}
                                />
                            </Tooltip>
                        )}
                    </CardHeader>
                    <CardBody>
                        <div className='space-y-1 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800/50'>
                            <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                <span>{rEsModoBase ? 'Sueldo base (bruto)' : 'Sueldo líquido (neto)'}</span>
                                <span>{fmtR(rBase)}</span>
                            </div>
                            {rGratif > 0 && (
                                <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                    <span>Gratificacion legal</span>
                                    <span className='text-emerald-600 dark:text-emerald-400'>
                                        +{fmtR(rGratif)}
                                    </span>
                                </div>
                            )}
                            {rColacion > 0 && (
                                <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                    <span>Bono colacion</span>
                                    <span className='text-emerald-600 dark:text-emerald-400'>
                                        +{fmtR(rColacion)}
                                    </span>
                                </div>
                            )}
                            {rMovil > 0 && (
                                <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                    <span>Bono movilizacion</span>
                                    <span className='text-emerald-600 dark:text-emerald-400'>
                                        +{fmtR(rMovil)}
                                    </span>
                                </div>
                            )}
                            <div className='flex justify-between border-t border-zinc-200 pt-1 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'>
                                <span>Total bruto</span>
                                <span className='font-medium text-zinc-800 dark:text-zinc-100'>
                                    {fmtR(rBruto)}
                                </span>
                            </div>
                            {rDescPrevision > 0 && (
                                <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                    <span>
                                        Cotización previsional AFP
                                        {afpNombre ? ` (${afpNombre})` : ''}
                                        {' '}({(tasaAfp * 100).toFixed(2)}%)
                                    </span>
                                    <span className='text-red-500'>-{fmtR(rDescPrevision)}</span>
                                </div>
                            )}
                            {rDescSalud > 0 && (
                                <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                    <span>Cotización de salud (7%)</span>
                                    <span className='text-red-500'>-{fmtR(rDescSalud)}</span>
                                </div>
                            )}
                            {rEsModoBase && (
                                <div className='mt-1 flex justify-between border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-700'>
                                    <span>Líquido estimado</span>
                                    <span className='text-emerald-600 dark:text-emerald-400'>
                                        {fmtR(rLiquidoEstimado)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </CardBody>
                </Card>
            </div>

            <Modal isOpen={modalOpen} setIsOpen={setModalOpen}>
                <ModalHeader>Editar remuneraciones</ModalHeader>
                <ModalBody>
                    <div className='space-y-5'>
                        {/* Sueldo + moneda */}
                        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                            <div>
                                <Label htmlFor='m_sueldo'>
                                    {esModoBase ? 'Sueldo base (bruto)' : 'Sueldo líquido (neto)'}
                                </Label>
                                <p className='mb-1.5 text-xs text-zinc-500 dark:text-zinc-400'>
                                    Moneda: {formik.values.moneda}
                                </p>
                                <Input
                                    id='m_sueldo'
                                    name='sueldo'
                                    type='number'
                                    min={0}
                                    placeholder='0'
                                    value={formik.values.sueldo}
                                    onChange={formik.handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor='m_moneda'>Moneda</Label>
                                <p className='mb-1.5 text-xs text-zinc-500 dark:text-zinc-400'>&nbsp;</p>
                                <SelectReact
                                    id='m_moneda'
                                    name='moneda'
                                    options={MONEDA_LABORAL_OPTIONS}
                                    value={
                                        MONEDA_LABORAL_OPTIONS.find(
                                            (o) => o.value === formik.values.moneda,
                                        ) ?? null
                                    }
                                    onChange={(opt) =>
                                        formik.setFieldValue('moneda', (opt as TSelectOption)?.value ?? 'CLP')
                                    }
                                />
                            </div>
                        </div>

                        {/* Checkboxes */}
                        <div className='space-y-3'>
                            {/* Gratificación */}
                            <div>
                                <Checkbox
                                    id='m_gratificacion_activa'
                                    name='gratificacion_activa'
                                    checked={formik.values.gratificacion_activa}
                                    onChange={(e) => {
                                        formik.setFieldValue('gratificacion_activa', e.target.checked);
                                        if (!e.target.checked)
                                            formik.setFieldValue('tipo_gratificacion', 'no_aplica');
                                    }}
                                    label='Gratificación'
                                    dimension='sm'
                                />
                                {formik.values.gratificacion_activa && (
                                    <div className='mt-2 pl-6'>
                                        <SelectReact
                                            name='tipo_gratificacion'
                                            options={TIPO_GRATIFICACION_OPTIONS.filter(
                                                (o) => o.value !== 'no_aplica',
                                            )}
                                            value={
                                                TIPO_GRATIFICACION_OPTIONS.find(
                                                    (o) => o.value === formik.values.tipo_gratificacion,
                                                ) ?? null
                                            }
                                            onChange={(opt) =>
                                                formik.setFieldValue(
                                                    'tipo_gratificacion',
                                                    (opt as TSelectOption)?.value ?? 'art_50_mensual',
                                                )
                                            }
                                            placeholder='Selecciona tipo...'
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Cotización previsional AFP */}
                            {afpId && (
                                <Checkbox
                                    id='m_descuento_prevision_activo'
                                    name='descuento_prevision_activo'
                                    checked={formik.values.descuento_prevision_activo}
                                    onChange={(e) =>
                                        formik.setFieldValue('descuento_prevision_activo', e.target.checked)
                                    }
                                    label={`Cotización previsional AFP${afpNombre ? ` (${afpNombre} · ${(tasaAfp * 100).toFixed(2)}%)` : ''}`}
                                    dimension='sm'
                                />
                            )}

                            {/* Cotización de salud */}
                            {contrato.datos_previsionales_trabajador?.sistema_salud && (
                                <Checkbox
                                    id='m_descuento_salud_activo'
                                    name='descuento_salud_activo'
                                    checked={formik.values.descuento_salud_activo}
                                    onChange={(e) =>
                                        formik.setFieldValue('descuento_salud_activo', e.target.checked)
                                    }
                                    label='Cotización de salud (7%)'
                                    dimension='sm'
                                />
                            )}

                            {/* Descuentos legales genéricos */}
                            <div>
                                <Checkbox
                                    id='m_descuentos_activos'
                                    name='descuentos_activos'
                                    checked={formik.values.descuentos_activos}
                                    onChange={(e) =>
                                        formik.setFieldValue('descuentos_activos', e.target.checked)
                                    }
                                    label='Otros descuentos legales'
                                    dimension='sm'
                                />
                                {formik.values.descuentos_activos && (
                                    <div className='mt-2 pl-6'>
                                        <SelectReact
                                            name='porcentaje_descuentos'
                                            options={PORCENTAJE_DESCUENTO_OPTIONS}
                                            value={
                                                PORCENTAJE_DESCUENTO_OPTIONS.find(
                                                    (o) => o.value === formik.values.porcentaje_descuentos,
                                                ) ?? PORCENTAJE_DESCUENTO_OPTIONS[2]
                                            }
                                            onChange={(opt) =>
                                                formik.setFieldValue(
                                                    'porcentaje_descuentos',
                                                    (opt as TSelectOption)?.value ?? '20',
                                                )
                                            }
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Bono colación */}
                            <div>
                                <Checkbox
                                    id='m_bono_colacion_activo'
                                    name='bono_colacion_activo'
                                    checked={formik.values.bono_colacion_activo}
                                    onChange={(e) => {
                                        formik.setFieldValue('bono_colacion_activo', e.target.checked);
                                        if (!e.target.checked) formik.setFieldValue('bono_colacion', '');
                                    }}
                                    label='Bono colación'
                                    dimension='sm'
                                />
                                {formik.values.bono_colacion_activo && (
                                    <div className='mt-2 pl-6'>
                                        <Input
                                            id='m_bono_colacion'
                                            name='bono_colacion'
                                            type='number'
                                            min={0}
                                            placeholder='0'
                                            value={formik.values.bono_colacion}
                                            onChange={formik.handleChange}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Bono movilización */}
                            <div>
                                <Checkbox
                                    id='m_bono_movilizacion_activo'
                                    name='bono_movilizacion_activo'
                                    checked={formik.values.bono_movilizacion_activo}
                                    onChange={(e) => {
                                        formik.setFieldValue('bono_movilizacion_activo', e.target.checked);
                                        if (!e.target.checked) formik.setFieldValue('bono_movilizacion', '');
                                    }}
                                    label='Bono movilización'
                                    dimension='sm'
                                />
                                {formik.values.bono_movilizacion_activo && (
                                    <div className='mt-2 pl-6'>
                                        <Input
                                            id='m_bono_movilizacion'
                                            name='bono_movilizacion'
                                            type='number'
                                            min={0}
                                            placeholder='0'
                                            value={formik.values.bono_movilizacion}
                                            onChange={formik.handleChange}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Resumen en tiempo real */}
                        <div className='space-y-1 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800/50'>
                            <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                <span>Sueldo base</span>
                                <span>{fmtModal(mBase)}</span>
                            </div>
                            {mGratif > 0 && (
                                <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                    <span>Gratificacion mensual</span>
                                    <span className='text-emerald-600 dark:text-emerald-400'>
                                        +{fmtModal(mGratif)}
                                    </span>
                                </div>
                            )}
                            {formik.values.gratificacion_activa &&
                                formik.values.tipo_gratificacion === 'art_47' && (
                                    <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                        <span>Gratificación anual (Art.47)</span>
                                        <span className='text-xs text-zinc-400'>Se calcula al año</span>
                                    </div>
                                )}
                            {mColacion > 0 && (
                                <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                    <span>Bono colacion</span>
                                    <span className='text-emerald-600 dark:text-emerald-400'>
                                        +{fmtModal(mColacion)}
                                    </span>
                                </div>
                            )}
                            {mMovil > 0 && (
                                <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                    <span>Bono movilizacion</span>
                                    <span className='text-emerald-600 dark:text-emerald-400'>
                                        +{fmtModal(mMovil)}
                                    </span>
                                </div>
                            )}
                            <div className='flex justify-between border-t border-zinc-200 pt-1 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'>
                                <span>Total bruto</span>
                                <span className='font-medium text-zinc-800 dark:text-zinc-100'>
                                    {fmtModal(mBruto)}
                                </span>
                            </div>
                            {mDescPrevision > 0 && (
                                <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                    <span>
                                        Cotización AFP ({(tasaAfp * 100).toFixed(2)}%)
                                    </span>
                                    <span className='text-red-500'>-{fmtModal(mDescPrevision)}</span>
                                </div>
                            )}
                            {mDescSalud > 0 && (
                                <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                    <span>Cotización de salud (7%)</span>
                                    <span className='text-red-500'>-{fmtModal(mDescSalud)}</span>
                                </div>
                            )}
                            {formik.values.descuentos_activos && mDescGeneral > 0 && (
                                <div className='flex justify-between text-zinc-600 dark:text-zinc-400'>
                                    <span>Otros descuentos (~{formik.values.porcentaje_descuentos}%)</span>
                                    <span className='text-red-500'>-{fmtModal(mDescGeneral)}</span>
                                </div>
                            )}
                            <div className='mt-1 flex justify-between border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-700'>
                                <span>Liquido estimado</span>
                                <span className='text-emerald-600 dark:text-emerald-400'>
                                    {fmtModal(mLiquido)}
                                </span>
                            </div>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button type='button' onClick={() => setModalOpen(false)} isDisable={guardando}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        type='button'
                        onClick={() => formik.handleSubmit()}
                        isLoading={guardando}>
                        Guardar cambios
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
};

export default TabRemuneracionesTrabajador;
