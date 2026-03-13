import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { TIPO_CONTRATO } from '@/constants/contrato.constant';
import { IRelacionEmpresa } from '@/interface/empresas.interface';
import { useAppSelector } from '@/store';
import {
    useCreateContratoLicenciaMutation,
    useCreateContratoMutation,
    useGetLicenciasCatalogoQuery,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import classNames from 'classnames';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import { IContratoEdicion } from '../components/contrato.types';
import ModalLicenciaContrato from './ModalLicenciaContrato';

// ── Tipos ──

type TWizardStep = 1 | 2 | 3;

const STEP_LABELS: Record<TWizardStep, string> = {
    1: 'Datos del contrato',
    2: 'Licencias',
    3: 'Revisión',
};

interface ICrearContratoDelClienteProps {
    detalleCliente?: IRelacionEmpresa;
    /** Control externo: si se define, el modal se abre/cierra desde afuera */
    externalIsOpen?: boolean;
    /** Callback cuando el modal externo debe cerrarse */
    onExternalClose?: () => void;
    /** Si se define, el tipo queda fijo y no es editable en el paso 1 */
    tipoFijo?: string;
    /** Licencias preseleccionadas que se cargan en el paso 2 (no se pueden eliminar) */
    licenciasIniciales?: IContratoEdicion['licencias'];
}

// ── Stepper visual ──

const WizardStepper = ({ step, esLicencia }: { step: TWizardStep; esLicencia: boolean }) => {
    const pasos: { key: TWizardStep; label: string; visible: boolean }[] = [
        { key: 1, label: STEP_LABELS[1], visible: true },
        { key: 2, label: STEP_LABELS[2], visible: esLicencia },
        { key: 3, label: STEP_LABELS[3], visible: true },
    ];

    const pasosVisibles = pasos.filter((p) => p.visible);

    return (
        <div className='mb-4 flex items-center justify-center gap-1'>
            {pasosVisibles.map((paso, i) => {
                const esActual = paso.key === step;
                const esCompletado =
                    paso.key < step || (paso.key === 2 && !esLicencia && step >= 3);

                return (
                    <div key={paso.key} className='flex items-center gap-1'>
                        {i > 0 && (
                            <div
                                className={classNames(
                                    'h-0.5 w-6',
                                    esCompletado || esActual
                                        ? 'bg-blue-500'
                                        : 'bg-zinc-300 dark:bg-zinc-600',
                                )}
                            />
                        )}
                        <div
                            className={classNames(
                                'rounded-full px-3 py-1 text-xs font-medium',
                                {
                                    'bg-blue-500 text-white': esActual,
                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300':
                                        esCompletado,
                                    'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500':
                                        !esActual && !esCompletado,
                                },
                            )}>
                            {paso.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ── Componente principal ──

function CrearContratoDelCliente({
    detalleCliente: detalleClienteProp,
    externalIsOpen,
    onExternalClose,
    tipoFijo,
    licenciasIniciales,
}: ICrearContratoDelClienteProps = {}) {
    const navigate = useNavigate();
    const { detalleCliente: detalleClienteStore } = useAppSelector((state) => state.empresa);
    const detalleCliente = detalleClienteProp ?? detalleClienteStore;

    const isControlledExternally = externalIsOpen !== undefined;
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = isControlledExternally ? externalIsOpen : internalIsOpen;

    const [step, setStep] = useState<TWizardStep>(1);
    const [modalAddLicencia, setModalAddLicencia] = useState(false);

    const { data: listaLicencias = [] } = useGetLicenciasCatalogoQuery();
    const [createContrato] = useCreateContratoMutation();
    const [createContratoLicencia] = useCreateContratoLicenciaMutation();

    // Formik auxiliar para licencias (Paso 2)
    const licFormik = useFormik<IContratoEdicion>({
        initialValues: {
            fecha_inicio: '',
            fecha_fin: null,
            observaciones: null,
            nombre: '',
            eliminar_visitas: [],
            visitas: [],
            eliminar_licencias: [],
            licencias: [],
            eliminar_condiciones: [],
            condiciones_especiales: [],
            eliminar_usuarios: [],
            usuarios_vinculados: [],
        },
        onSubmit: () => {},
    });

    useEffect(() => {
        if (isOpen && licenciasIniciales && licenciasIniciales.length > 0) {
            licFormik.setFieldValue('licencias', licenciasIniciales);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && tipoFijo) {
            formik.setFieldValue('tipo', tipoFijo);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, tipoFijo]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            fecha_inicio: '',
            fecha_fin: '',
            observaciones: '',
            tipo: tipoFijo ?? '',
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string()
                .required('Requerido')
                .nonNullable('Requerido')
                .max(100, 'Máximo 100 caracteres'),
            fecha_inicio: Yup.string().required('Requerido').nonNullable('Requerido'),
            fecha_fin: Yup.string().notRequired().nullable(),
            observaciones: Yup.string().notRequired().nullable(),
            tipo: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const contratoCreado = await createContrato({
                    nombre: values.nombre,
                    fecha_inicio: dayjs(values.fecha_inicio).format('YYYY-MM-DD'),
                    fecha_fin: values.fecha_fin
                        ? dayjs(values.fecha_fin).format('YYYY-MM-DD')
                        : undefined,
                    observaciones: values.observaciones || undefined,
                    tipo: values.tipo,
                    empresa_prestadora: detalleCliente?.prestador_servicios,
                    empresa_cliente: detalleCliente?.info_cliente.id,
                } as Record<string, unknown>).unwrap();

                const totalLicencias = licFormik.values.licencias.length;

                if (values.tipo === 'licencia' && totalLicencias > 0) {
                    try {
                        await Promise.all(
                            licFormik.values.licencias.map((lic) =>
                                createContratoLicencia({
                                    contratoId: contratoCreado.id,
                                    data: {
                                        licencia: lic.licencia_id,
                                        tipo_modalidad: lic.tipo_modalidad,
                                        otro_tipo: lic.otro_tipo ?? null,
                                        cantidad: lic.cantidad,
                                        precio_unitario: lic.precio_unitario,
                                        fecha_inicio: lic.fecha_inicio ?? null,
                                        fecha_fin: lic.fecha_fin ?? null,
                                        tipo_moneda: lic.tipo_moneda,
                                    },
                                }).unwrap(),
                            ),
                        );
                        toast.success(
                            `Contrato y ${totalLicencias} licencia${totalLicencias > 1 ? 's' : ''} creadas`,
                            { autoClose: 1500 },
                        );
                    } catch {
                        toast.warning(
                            'Contrato creado, pero hubo errores al guardar algunas licencias',
                        );
                    }
                } else {
                    toast.success('Contrato creado', { autoClose: 1000 });
                }

                handleClose();
                navigate(
                    `/empresa/detalle-cliente/${detalleCliente?.id}/contrato/${contratoCreado.id}`,
                );
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    const esLicencia = formik.values.tipo === 'licencia' || tipoFijo === 'licencia';

    const handleClose = () => {
        if (isControlledExternally) {
            onExternalClose?.();
        } else {
            setInternalIsOpen(false);
        }
        setStep(1);
        formik.resetForm();
        licFormik.resetForm();
    };

    const handleSiguiente = async () => {
        if (step === 1) {
            const errors = await formik.validateForm();
            formik.setTouched(
                Object.keys(formik.values).reduce(
                    (acc, key) => ({ ...acc, [key]: true }),
                    {},
                ),
            );
            if (Object.keys(errors).length > 0) return;
            setStep(esLicencia ? 2 : 3);
        } else if (step === 2) {
            setStep(3);
        }
    };

    const handleAtras = () => {
        if (step === 3) {
            setStep(esLicencia ? 2 : 1);
        } else if (step === 2) {
            setStep(1);
        }
    };

    const getLicenciaNombre = (licId?: number) =>
        listaLicencias.find((l) => l.id === licId)?.nombre ?? '';

    const esLicenciaInicial = (index: number): boolean => {
        if (!licenciasIniciales || licenciasIniciales.length === 0) return false;
        const lic = licFormik.values.licencias[index];
        return licenciasIniciales.some((ini) => ini.licencia_id === lic.licencia_id);
    };

    const tipoLabel =
        TIPO_CONTRATO.find((t) => t.value === formik.values.tipo)?.label ?? formik.values.tipo;

    return (
        <>
            {!isControlledExternally && (
                <Tooltip text='Crear Contrato'>
                    <Button variant='solid' onClick={() => setInternalIsOpen(true)}>
                        Crear
                    </Button>
                </Tooltip>
            )}

            <Modal
                isOpen={isOpen}
                setIsOpen={(val) => {
                    if (!val) handleClose();
                }}
                size='md'>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Contrato</Badge>
                </ModalHeader>
                <ModalBody>
                    <WizardStepper step={step} esLicencia={esLicencia} />

                    {/* ── Paso 1: Datos del contrato ── */}
                    {step === 1 && (
                        <div className='grid grid-cols-2 gap-4'>
                            <div>
                                <Label htmlFor='nombre'>Nombre</Label>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.nombre}
                                    invalidFeedback={formik.errors.nombre}>
                                    <Input
                                        id='nombre'
                                        name='nombre'
                                        onChange={formik.handleChange}
                                        value={formik.values.nombre}
                                        onBlur={formik.handleBlur}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Label htmlFor='tipo'>Tipo</Label>
                                {tipoFijo ? (
                                    <div className='mt-1'>
                                        <Badge variant='solid' color='blue'>
                                            {TIPO_CONTRATO.find((t) => t.value === tipoFijo)
                                                ?.label ?? tipoFijo}
                                        </Badge>
                                    </div>
                                ) : (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.tipo}
                                        invalidFeedback={formik.errors.tipo}>
                                        <SelectReact
                                            name='tipo'
                                            options={TIPO_CONTRATO}
                                            value={TIPO_CONTRATO.find(
                                                (con) => con.value === formik.values.tipo,
                                            )}
                                            onChange={(e) => {
                                                formik.setFieldValue(
                                                    'tipo',
                                                    (e as TSelectOption).value,
                                                );
                                            }}
                                            placeholder='Seleccione un tipo'
                                            noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                        />
                                    </Validation>
                                )}
                            </div>
                            <div>
                                <Label htmlFor='fecha_inicio'>Fecha de inicio</Label>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.fecha_inicio}
                                    invalidFeedback={formik.errors.fecha_inicio}>
                                    <Input
                                        id='fecha_inicio'
                                        name='fecha_inicio'
                                        type='date'
                                        onChange={formik.handleChange}
                                        value={formik.values.fecha_inicio}
                                        onBlur={formik.handleBlur}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Label htmlFor='fecha_fin'>Fecha de fin</Label>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.fecha_fin}
                                    invalidFeedback={formik.errors.fecha_fin}>
                                    <Input
                                        id='fecha_fin'
                                        name='fecha_fin'
                                        type='date'
                                        onChange={formik.handleChange}
                                        value={formik.values.fecha_fin}
                                        onBlur={formik.handleBlur}
                                    />
                                </Validation>
                            </div>
                            <div className='col-span-full'>
                                <Label htmlFor='observaciones'>Observaciones</Label>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.observaciones}
                                    invalidFeedback={formik.errors.observaciones}>
                                    <Textarea
                                        id='observaciones'
                                        name='observaciones'
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.observaciones}
                                    />
                                </Validation>
                            </div>
                        </div>
                    )}

                    {/* ── Paso 2: Licencias (solo tipo licencia) ── */}
                    {step === 2 && (
                        <div className='flex flex-col gap-3'>
                            <p className='text-sm text-zinc-500'>
                                Agrega las licencias que incluirá este contrato. Puedes omitir
                                este paso y agregarlas más tarde.
                            </p>
                            {licFormik.values.licencias.length > 0 && (
                                <Table>
                                    <THead>
                                        <Tr>
                                            <Th>Licencia</Th>
                                            <Th>Cupos</Th>
                                            <Th>Vigencia</Th>
                                            <Th>{' '}</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {licFormik.values.licencias.map((lic, i) => (
                                            <Tr key={i}>
                                                <Td>{getLicenciaNombre(lic.licencia_id)}</Td>
                                                <Td>{lic.cantidad}</Td>
                                                <Td>
                                                    <span className='text-sm'>
                                                        {lic.fecha_inicio
                                                            ? dayjs(lic.fecha_inicio).format(
                                                                  'DD/MM/YY',
                                                              )
                                                            : ''}{' '}
                                                        →{' '}
                                                        {lic.fecha_fin
                                                            ? dayjs(lic.fecha_fin).format(
                                                                  'DD/MM/YY',
                                                              )
                                                            : ''}
                                                    </span>
                                                </Td>
                                                <Td>
                                                    {!esLicenciaInicial(i) && (
                                                        <Button
                                                            icon='HeroTrash'
                                                            size='sm'
                                                            color='red'
                                                            onClick={() => {
                                                                licFormik.setFieldValue(
                                                                    'licencias',
                                                                    licFormik.values.licencias.filter(
                                                                        (_, idx) => idx !== i,
                                                                    ),
                                                                );
                                                            }}
                                                        />
                                                    )}
                                                </Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                            )}
                            <Button icon='HeroPlus' onClick={() => setModalAddLicencia(true)}>
                                Agregar licencia
                            </Button>
                        </div>
                    )}

                    {/* ── Paso 3: Revisión ── */}
                    {step === 3 && (
                        <div className='flex flex-col gap-3'>
                            <p className='text-sm text-zinc-500'>
                                Revisa los datos antes de crear el contrato.
                            </p>
                            <div className='grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                                <ResumenItem label='Nombre' valor={formik.values.nombre} />
                                <ResumenItem label='Tipo' valor={tipoLabel} />
                                <ResumenItem
                                    label='Fecha inicio'
                                    valor={
                                        formik.values.fecha_inicio
                                            ? dayjs(formik.values.fecha_inicio).format(
                                                  'DD/MM/YYYY',
                                              )
                                            : '—'
                                    }
                                />
                                <ResumenItem
                                    label='Fecha fin'
                                    valor={
                                        formik.values.fecha_fin
                                            ? dayjs(formik.values.fecha_fin).format('DD/MM/YYYY')
                                            : 'Sin fecha fin'
                                    }
                                />
                                {formik.values.observaciones && (
                                    <div className='col-span-full'>
                                        <ResumenItem
                                            label='Observaciones'
                                            valor={formik.values.observaciones}
                                        />
                                    </div>
                                )}
                            </div>

                            {esLicencia && licFormik.values.licencias.length > 0 && (
                                <div className='rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                                    <span className='text-xs font-semibold text-zinc-500'>
                                        Licencias ({licFormik.values.licencias.length})
                                    </span>
                                    <div className='mt-2 flex flex-col gap-1'>
                                        {licFormik.values.licencias.map((lic, i) => (
                                            <div
                                                key={i}
                                                className='flex items-center justify-between text-sm'>
                                                <span>
                                                    {getLicenciaNombre(lic.licencia_id)}
                                                </span>
                                                <span className='text-zinc-500'>
                                                    {lic.cantidad} cupos
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {esLicencia && licFormik.values.licencias.length === 0 && (
                                <p className='text-sm text-zinc-400'>
                                    No se agregaron licencias. Podrás agregarlas después.
                                </p>
                            )}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild>
                        <span className='text-xs text-zinc-400'>
                            Paso {step} de {esLicencia ? 3 : 2}
                        </span>
                    </ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red' onClick={handleClose}>
                            Cancelar
                        </Button>
                        {step > 1 && <Button onClick={handleAtras}>Atrás</Button>}
                        {step < 3 && !(step === 1 && !esLicencia) && (
                            <Button variant='solid' onClick={handleSiguiente}>
                                Siguiente
                            </Button>
                        )}
                        {(step === 3 || (step === 1 && !esLicencia)) && (
                            <Button
                                variant='solid'
                                isLoading={formik.isSubmitting}
                                onClick={
                                    step === 1 ? handleSiguiente : () => formik.handleSubmit()
                                }>
                                {step === 3 ? 'Crear contrato' : 'Siguiente'}
                            </Button>
                        )}
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>

            <ModalLicenciaContrato
                isOpen={modalAddLicencia}
                onClose={() => setModalAddLicencia(false)}
                formik={licFormik}
                listaLicencias={listaLicencias}
            />
        </>
    );
}

// ── Sub-componente: línea de resumen ──

const ResumenItem = ({ label, valor }: { label: string; valor: string }) => (
    <div>
        <span className='text-xs text-zinc-500'>{label}</span>
        <p className='text-sm font-medium'>{valor}</p>
    </div>
);

export default CrearContratoDelCliente;