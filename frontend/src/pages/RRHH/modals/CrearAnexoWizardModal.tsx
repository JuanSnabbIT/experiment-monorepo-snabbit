import FileInput from '@/components/form/FileInput';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Icon from '@/components/icon/Icon';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import type { TIcons } from '@/types/icons.type';
import { useCrearAnexoContratoMutation } from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import classNames from 'classnames';
import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
    HORAS_SEMANALES_OPTIONS,
    JORNADA_OPTIONS,
    TIPO_GRATIFICACION_OPTIONS,
} from '../components/trabajador/types';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TSectionId = 'prorroga' | 'conversion' | 'sueldo' | 'cargo' | 'funciones' | 'jornada' | 'lugar';
type TWizardStepId = 'seleccion' | TSectionId | 'detalles';

interface ISection {
    id: TSectionId;
    label: string;
    icon: TIcons;
    soloPlazofijo?: boolean;
    excluyeCon?: TSectionId;
}

const SECTIONS: ISection[] = [
    { id: 'prorroga',   label: 'Prórroga',                icon: 'HeroCalendarDays', soloPlazofijo: true, excluyeCon: 'conversion' },
    { id: 'conversion', label: 'Conversión a indefinido', icon: 'HeroArrowPath',    soloPlazofijo: true, excluyeCon: 'prorroga'   },
    { id: 'sueldo',     label: 'Sueldo',                  icon: 'HeroBanknotes'    },
    { id: 'cargo',      label: 'Cargo',                   icon: 'HeroBriefcase'    },
    { id: 'funciones',  label: 'Funciones',               icon: 'HeroDocumentText' },
    { id: 'jornada',    label: 'Jornada',                 icon: 'HeroClock'        },
    { id: 'lugar',      label: 'Lugar de trabajo',        icon: 'HeroMapPin'       },
];

const STEP_LABEL: Record<TWizardStepId, string> = {
    seleccion:  'Seleccionar',
    prorroga:   'Prórroga',
    conversion: 'Conversión',
    sueldo:     'Sueldo',
    cargo:      'Cargo',
    funciones:  'Funciones',
    jornada:    'Jornada',
    lugar:      'Lugar',
    detalles:   'Detalles',
};

const formatMonto = (v?: string | null) =>
    v ? `$${Number(v).toLocaleString('es-CL')}` : null;

// ─── Stepper dinámico ─────────────────────────────────────────────────────────

const WizardStepper = ({ steps, currentIndex }: { steps: TWizardStepId[]; currentIndex: number }) => (
    <div className='mb-6 flex items-center justify-center overflow-x-auto pb-1'>
        {steps.map((stepId, i) => {
            const esActual = i === currentIndex;
            const esCompletado = i < currentIndex;
            return (
                <div key={stepId} className='flex items-center'>
                    {i > 0 && (
                        <div className={classNames('h-px w-5', esCompletado ? 'bg-blue-500' : 'bg-zinc-200 dark:bg-zinc-700')} />
                    )}
                    <div className='flex flex-col items-center gap-0.5'>
                        <div className={classNames(
                            'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                            {
                                'border-blue-500 bg-blue-500 text-white': esActual,
                                'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300': esCompletado,
                                'border-zinc-300 bg-white text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-500': !esActual && !esCompletado,
                            },
                        )}>
                            {esCompletado ? (
                                <svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                                </svg>
                            ) : (
                                i + 1
                            )}
                        </div>
                        <span className={classNames('text-[9px] font-medium leading-none', {
                            'text-blue-600 dark:text-blue-400': esActual,
                            'text-blue-500': esCompletado,
                            'text-zinc-400 dark:text-zinc-500': !esActual && !esCompletado,
                        })}>
                            {STEP_LABEL[stepId]}
                        </span>
                    </div>
                </div>
            );
        })}
    </div>
);

// ─── Modal wizard ─────────────────────────────────────────────────────────────

interface IProps {
    isOpen: boolean;
    onClose: () => void;
    contrato: IContratoTrabajador;
    seccionInicial?: TSectionId;
}

const CrearAnexoWizardModal = ({ isOpen, onClose, contrato, seccionInicial }: IProps) => {
    const [crearAnexo, { isLoading: creando }] = useCrearAnexoContratoMutation();

    const [currentStepIndex, setCurrentStepIndex] = useState(seccionInicial ? 1 : 0);
    const [seccionesActivas, setSeccionesActivas] = useState<Set<TSectionId>>(
        seccionInicial ? new Set([seccionInicial]) : new Set(),
    );
    const [stepError, setStepError] = useState('');

    // Campos por sección
    const [nuevaFechaTermino, setNuevaFechaTermino] = useState('');
    const [nuevoSueldoBase, setNuevoSueldoBase] = useState('');
    const [nuevoTipoGratificacion, setNuevoTipoGratificacion] = useState<TSelectOption | null>(null);
    const [nuevoBonoMovilizacion, setNuevoBonoMovilizacion] = useState('');
    const [nuevoBonoColacion, setNuevoBonoColacion] = useState('');
    const [nuevoCargo, setNuevoCargo] = useState('');
    const [nuevasFunciones, setNuevasFunciones] = useState('');
    const [nuevaJornada, setNuevaJornada] = useState<TSelectOption | null>(null);
    const [nuevasHorasSemanales, setNuevasHorasSemanales] = useState<TSelectOption | null>(null);
    const [nuevoLugarTrabajo, setNuevoLugarTrabajo] = useState('');

    // Campos comunes (último paso)
    const [fechaEfectiva, setFechaEfectiva] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [archivoPdf, setArchivoPdf] = useState<File | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const esPlazofijo = contrato.tipo_contrato === 'plazo_fijo';
    const esVencido = contrato.estado === 'vencido';

    // Pasos dinámicos: seleccion → [secciones activas en orden] → detalles
    const steps: TWizardStepId[] = ['seleccion', ...Array.from(seccionesActivas), 'detalles'];
    const currentStepId = steps[currentStepIndex];
    const esUltimoPaso = currentStepIndex === steps.length - 1;
    const esPrimerPaso = currentStepIndex === 0;

    const toggleSeccion = (id: TSectionId) => {
        const seccion = SECTIONS.find((s) => s.id === id);
        if (esVencido && id !== 'conversion') return;
        if (seccion?.soloPlazofijo && !esPlazofijo) return;
        setSeccionesActivas((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                if (seccion?.excluyeCon) next.delete(seccion.excluyeCon);
                next.add(id);
            }
            return next;
        });
        setCurrentStepIndex(0);
        setStepError('');
    };

    const validateCurrentStep = (): boolean => {
        switch (currentStepId) {
            case 'seleccion':
                if (seccionesActivas.size === 0) {
                    setStepError('Selecciona al menos una modificación para continuar.');
                    return false;
                }
                break;
            case 'prorroga':
                if (!nuevaFechaTermino) { setStepError('La nueva fecha de término es requerida.'); return false; }
                break;
            case 'sueldo':
                if (!nuevoSueldoBase) { setStepError('El nuevo sueldo base es requerido.'); return false; }
                break;
            case 'cargo':
                if (!nuevoCargo.trim()) { setStepError('El nuevo cargo es requerido.'); return false; }
                break;
            case 'funciones':
                if (!nuevasFunciones.trim()) { setStepError('Las nuevas funciones son requeridas.'); return false; }
                break;
            case 'jornada':
                if (!nuevaJornada) { setStepError('La nueva jornada es requerida.'); return false; }
                break;
            case 'lugar':
                if (!nuevoLugarTrabajo.trim()) { setStepError('El nuevo lugar de trabajo es requerido.'); return false; }
                break;
            case 'detalles':
                if (!fechaEfectiva) { setStepError('La fecha efectiva es requerida.'); return false; }
                break;
        }
        return true;
    };

    const handleNext = () => {
        if (!validateCurrentStep()) return;
        setStepError('');
        setCurrentStepIndex((prev) => prev + 1);
    };

    const handlePrev = () => {
        setStepError('');
        setCurrentStepIndex((prev) => prev - 1);
    };

    const handleClose = () => {
        setCurrentStepIndex(seccionInicial ? 1 : 0);
        setSeccionesActivas(seccionInicial ? new Set([seccionInicial]) : new Set());
        setStepError('');
        setNuevaFechaTermino('');
        setNuevoSueldoBase('');
        setNuevoTipoGratificacion(null);
        setNuevoBonoMovilizacion('');
        setNuevoBonoColacion('');
        setNuevoCargo('');
        setNuevasFunciones('');
        setNuevaJornada(null);
        setNuevasHorasSemanales(null);
        setNuevoLugarTrabajo('');
        setFechaEfectiva('');
        setDescripcion('');
        setArchivoPdf(null);
        if (fileRef.current) fileRef.current.value = '';
        onClose();
    };

    const handleGuardar = async () => {
        if (!validateCurrentStep()) return;

        const fd = new FormData();
        fd.append('contrato', String(contrato.id));
        fd.append('fecha_efectiva', fechaEfectiva);
        if (descripcion.trim()) fd.append('descripcion', descripcion.trim());

        if (seccionesActivas.has('prorroga')) fd.append('nueva_fecha_termino', nuevaFechaTermino);
        if (seccionesActivas.has('conversion')) fd.append('nuevo_tipo_contrato', 'indefinido');
        if (seccionesActivas.has('sueldo')) {
            fd.append('nuevo_sueldo', nuevoSueldoBase);
            if (nuevoTipoGratificacion) fd.append('nuevo_tipo_gratificacion', nuevoTipoGratificacion.value);
            if (nuevoBonoMovilizacion) fd.append('nuevo_bono_movilizacion', nuevoBonoMovilizacion);
            if (nuevoBonoColacion) fd.append('nuevo_bono_colacion', nuevoBonoColacion);
        }
        if (seccionesActivas.has('cargo')) fd.append('nuevo_cargo', nuevoCargo.trim());
        if (seccionesActivas.has('funciones')) fd.append('nuevas_funciones', nuevasFunciones.trim());
        if (seccionesActivas.has('jornada')) {
            fd.append('nueva_jornada', nuevaJornada!.value);
            if (nuevaJornada?.value !== 'turnos' && nuevasHorasSemanales)
                fd.append('nuevas_horas_semanales', nuevasHorasSemanales.value);
        }
        if (seccionesActivas.has('lugar')) fd.append('nuevo_lugar_trabajo', nuevoLugarTrabajo.trim());
        if (archivoPdf) fd.append('archivo_pdf', archivoPdf);

        try {
            await crearAnexo(fd).unwrap();
            toast.success('Borrador de anexo creado. Actívalo cuando el documento esté firmado.');
            handleClose();
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const renderStepContent = () => {
        switch (currentStepId) {
            case 'seleccion':
                return (
                    <div className='space-y-4'>
                        <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                            Selecciona qué condiciones vas a modificar. Puedes elegir varias.
                            Cada una generará su propio paso en este wizard.
                        </p>
                        {esVencido && (
                            <p className='text-xs text-red-600 dark:text-red-400'>
                                Este contrato está vencido. Solo puedes formalizar la conversión a indefinido.
                            </p>
                        )}
                        <div className='flex flex-wrap gap-2'>
                            {SECTIONS.map((s) => {
                                const deshabilitada = (!!s.soloPlazofijo && !esPlazofijo) || (esVencido && s.id !== 'conversion');
                                const activa = seccionesActivas.has(s.id);
                                return (
                                    <button
                                        key={s.id}
                                        type='button'
                                        disabled={deshabilitada}
                                        title={deshabilitada ? 'Solo disponible para contratos a plazo fijo' : undefined}
                                        onClick={() => toggleSeccion(s.id)}
                                        className={classNames(
                                            'flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors',
                                            {
                                                'cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-600': deshabilitada,
                                                'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400': activa && !deshabilitada,
                                                'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400': !activa && !deshabilitada,
                                            },
                                        )}>
                                        <Icon icon={s.icon} className='h-4 w-4 shrink-0' />
                                        <span>{s.label}</span>
                                        {activa && (
                                            <span className='ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white'>
                                                ✓
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {seccionesActivas.size > 0 && (
                            <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                                {seccionesActivas.size} modificación{seccionesActivas.size > 1 ? 'es' : ''} seleccionada{seccionesActivas.size > 1 ? 's' : ''}.
                                El wizard tendrá {steps.length} pasos en total.
                            </p>
                        )}
                    </div>
                );

            case 'conversion':
                return (
                    <div className='space-y-4'>
                        <div className='rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20'>
                            <p className='mb-2 font-semibold text-blue-700 dark:text-blue-400'>
                                Conversión a contrato indefinido
                            </p>
                            <p className='text-sm text-zinc-600 dark:text-zinc-300'>
                                Al activar este anexo, el contrato pasará a tipo <strong>Indefinido</strong>{' '}
                                y se eliminará la fecha de término.
                            </p>
                            <p className='mt-3 text-xs text-zinc-500 dark:text-zinc-400'>
                                Contrato actual:{' '}
                                <strong>{contrato.tipo_contrato_label ?? contrato.tipo_contrato}</strong>
                                {contrato.fecha_termino && (
                                    <> · Fecha término: <strong>{contrato.fecha_termino}</strong></>
                                )}
                            </p>
                        </div>
                        <p className='text-sm text-zinc-400 dark:text-zinc-500'>
                            No se requieren datos adicionales. Continúa al siguiente paso.
                        </p>
                    </div>
                );

            case 'prorroga':
                return (
                    <div className='space-y-4'>
                        <div>
                            <Label htmlFor='wiz_nueva_fecha_termino'>
                                Nueva fecha de término <span className='text-red-500'>*</span>
                            </Label>
                            {contrato.fecha_termino && (
                                <p className='mt-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
                                    Actual: {contrato.fecha_termino}
                                </p>
                            )}
                            <Input
                                id='wiz_nueva_fecha_termino'
                                name='wiz_nueva_fecha_termino'
                                type='date'
                                min={contrato.fecha_termino ?? undefined}
                                value={nuevaFechaTermino}
                                onChange={(e) => { setNuevaFechaTermino(e.target.value); setStepError(''); }}
                            />
                        </div>
                    </div>
                );

            case 'sueldo':
                return (
                    <div className='space-y-4'>
                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                            <div>
                                <Label htmlFor='wiz_sueldo'>
                                    Nuevo sueldo <span className='text-red-500'>*</span>
                                </Label>
                                <p className='mt-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
                                    Actual: {formatMonto(contrato.sueldo)}
                                </p>
                                <Input
                                    id='wiz_sueldo'
                                    name='wiz_sueldo'
                                    type='number'
                                    placeholder='0'
                                    value={nuevoSueldoBase}
                                    onChange={(e) => { setNuevoSueldoBase(e.target.value); setStepError(''); }}
                                />
                            </div>
                            <div>
                                <Label htmlFor='wiz_tipo_gratificacion'>Tipo de gratificación</Label>
                                <SelectReact
                                    name='wiz_tipo_gratificacion'
                                    options={TIPO_GRATIFICACION_OPTIONS}
                                    value={nuevoTipoGratificacion}
                                    onChange={(opt) => setNuevoTipoGratificacion(opt as TSelectOption | null)}
                                    placeholder='Sin cambio...'
                                />
                            </div>
                            <div>
                                <Label htmlFor='wiz_bono_movilizacion'>Bono movilización</Label>
                                <Input
                                    id='wiz_bono_movilizacion'
                                    name='wiz_bono_movilizacion'
                                    type='number'
                                    placeholder='0'
                                    value={nuevoBonoMovilizacion}
                                    onChange={(e) => setNuevoBonoMovilizacion(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor='wiz_bono_colacion'>Bono colación</Label>
                                <Input
                                    id='wiz_bono_colacion'
                                    name='wiz_bono_colacion'
                                    type='number'
                                    placeholder='0'
                                    value={nuevoBonoColacion}
                                    onChange={(e) => setNuevoBonoColacion(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'cargo':
                return (
                    <div className='space-y-4'>
                        <div>
                            <Label htmlFor='wiz_cargo'>
                                Nuevo cargo <span className='text-red-500'>*</span>
                            </Label>
                            <p className='mt-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
                                Actual: {contrato.cargo}
                            </p>
                            <Input
                                id='wiz_cargo'
                                name='wiz_cargo'
                                type='text'
                                placeholder='Ej: Técnico Senior'
                                value={nuevoCargo}
                                onChange={(e) => { setNuevoCargo(e.target.value); setStepError(''); }}
                            />
                        </div>
                    </div>
                );

            case 'funciones':
                return (
                    <div className='space-y-4'>
                        {contrato.funciones && (
                            <div className='rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800'>
                                <p className='mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400'>
                                    Funciones actuales
                                </p>
                                <p className='text-sm text-zinc-600 dark:text-zinc-300'>{contrato.funciones}</p>
                            </div>
                        )}
                        <div>
                            <Label htmlFor='wiz_funciones'>
                                Nuevas funciones <span className='text-red-500'>*</span>
                            </Label>
                            <Textarea
                                id='wiz_funciones'
                                rows={4}
                                placeholder='Describe las funciones actualizadas...'
                                value={nuevasFunciones}
                                onChange={(e) => { setNuevasFunciones(e.target.value); setStepError(''); }}
                            />
                        </div>
                    </div>
                );

            case 'jornada':
                return (
                    <div className='space-y-4'>
                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                            <div>
                                <Label htmlFor='wiz_jornada'>
                                    Nueva jornada <span className='text-red-500'>*</span>
                                </Label>
                                <p className='mt-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
                                    Actual: {contrato.jornada_label ?? contrato.jornada}
                                </p>
                                <SelectReact
                                    name='wiz_jornada'
                                    options={JORNADA_OPTIONS}
                                    value={nuevaJornada}
                                    onChange={(opt) => {
                                        setNuevaJornada(opt as TSelectOption | null);
                                        setNuevasHorasSemanales(null);
                                        setStepError('');
                                    }}
                                    placeholder='Seleccionar...'
                                />
                            </div>
                            {nuevaJornada && nuevaJornada.value !== 'turnos' && (
                                <div>
                                    <Label htmlFor='wiz_horas_semanales'>Horas semanales</Label>
                                    <SelectReact
                                        name='wiz_horas_semanales'
                                        options={HORAS_SEMANALES_OPTIONS}
                                        value={nuevasHorasSemanales}
                                        onChange={(opt) => setNuevasHorasSemanales(opt as TSelectOption | null)}
                                        placeholder='Sin cambio...'
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'lugar':
                return (
                    <div className='space-y-4'>
                        <div>
                            <Label htmlFor='wiz_lugar'>
                                Nuevo lugar de trabajo <span className='text-red-500'>*</span>
                            </Label>
                            {contrato.lugar_trabajo && (
                                <p className='mt-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
                                    Actual: {contrato.lugar_trabajo}
                                </p>
                            )}
                            <Input
                                id='wiz_lugar'
                                name='wiz_lugar'
                                type='text'
                                placeholder='Ej: Av. Providencia 123, Santiago'
                                value={nuevoLugarTrabajo}
                                onChange={(e) => { setNuevoLugarTrabajo(e.target.value); setStepError(''); }}
                            />
                        </div>
                    </div>
                );

            case 'detalles':
                return (
                    <div className='space-y-4'>
                        <div>
                            <Label htmlFor='wiz_fecha_efectiva'>
                                Fecha efectiva <span className='text-red-500'>*</span>
                            </Label>
                            <p className='mt-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
                                Fecha desde la cual rigen los cambios del anexo.
                            </p>
                            <Input
                                id='wiz_fecha_efectiva'
                                name='wiz_fecha_efectiva'
                                type='date'
                                value={fechaEfectiva}
                                onChange={(e) => { setFechaEfectiva(e.target.value); setStepError(''); }}
                            />
                        </div>
                        <div>
                            <Label htmlFor='wiz_descripcion'>Descripción (opcional)</Label>
                            <Textarea
                                id='wiz_descripcion'
                                rows={2}
                                placeholder='Notas adicionales al documento...'
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                            />
                        </div>
                        <FileInput
                            ref={fileRef}
                            id='wiz_pdf'
                            name='wiz_pdf'
                            label='PDF del anexo (opcional)'
                            accept='application/pdf'
                            selectedFile={archivoPdf}
                            onFileSelect={(file) => setArchivoPdf(file)}
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={() => handleClose()} size='lg' isStaticBackdrop>
            <ModalHeader>
                Nuevo Anexo
                {contrato.referencia_interna && (
                    <span className='ml-2 text-sm font-normal text-zinc-400 dark:text-zinc-500'>
                        — {contrato.referencia_interna}
                    </span>
                )}
            </ModalHeader>
            <ModalBody className='flex h-[460px] flex-col overflow-y-auto'>
                <WizardStepper steps={steps} currentIndex={currentStepIndex} />
                <div className='flex-1'>
                    {renderStepContent()}
                    {stepError && (
                        <p className='mt-3 text-sm text-red-500'>{stepError}</p>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild>
                    <Button color='zinc' onClick={handleClose} isDisable={creando}>
                        Cancelar
                    </Button>
                </ModalFooterChild>
                <ModalFooterChild>
                    {!esPrimerPaso && (
                        <Button
                            icon='HeroArrowSmallLeft'
                            onClick={handlePrev}
                            isDisable={creando}>
                            Anterior
                        </Button>
                    )}
                    {!esUltimoPaso ? (
                        <Button
                            variant='solid'
                            color='blue'
                            icon='HeroArrowSmallRight'
                            onClick={handleNext}>
                            Siguiente
                        </Button>
                    ) : (
                        <Button
                            variant='solid'
                            color='emerald'
                            icon='HeroDocumentCheck'
                            onClick={handleGuardar}
                            isLoading={creando}
                            isDisable={creando}>
                            Guardar borrador
                        </Button>
                    )}
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

export default CrearAnexoWizardModal;
