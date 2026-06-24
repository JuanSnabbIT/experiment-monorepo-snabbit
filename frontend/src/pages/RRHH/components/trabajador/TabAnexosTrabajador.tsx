import FileInput from '@/components/form/FileInput';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Icon from '@/components/icon/Icon';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import type { IAnexoContrato, IContratoTrabajador } from '@/interface/rrhh.interface';
import type { TIcons } from '@/types/icons.type';
import ApiService from '@/services/ApiService';
import {
    useActivarAnexoContratoMutation,
    useCrearAnexoContratoMutation,
    useEliminarAnexoContratoMutation,
    useGetAnexosContratoQuery,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert } from '@/utils/sweetAlert';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
    HORAS_SEMANALES_OPTIONS,
    JORNADA_OPTIONS,
    TIPO_GRATIFICACION_OPTIONS,
} from './types';

// ─── Tipos de sección ────────────────────────────────────────────────────────

type TSectionId = 'prorroga' | 'conversion' | 'sueldo' | 'cargo' | 'funciones' | 'jornada' | 'lugar';

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

const ERRORES_POR_SECCION: Record<TSectionId, string[]> = {
    prorroga:   ['nuevaFechaTermino'],
    conversion: [],
    sueldo:     ['nuevoSueldoBase'],
    cargo:      ['nuevoCargo'],
    funciones:  ['nuevasFunciones'],
    jornada:    ['nuevaJornada'],
    lugar:      ['nuevoLugarTrabajo'],
};

// ─── Helpers de display ───────────────────────────────────────────────────────

const formatMonto = (v?: string | null) =>
    v ? `$${Number(v).toLocaleString('es-CL')}` : null;

const GRATIFICACION_LABEL: Record<string, string> = {
    art_47: 'Gratif. anual (Art. 47)',
    art_50_mensual: 'Gratif. mensual (Art. 50)',
    no_aplica: 'Sin gratificación',
};

const JORNADA_LABEL: Record<string, string> = {
    completa: 'Completa',
    parcial: 'Parcial',
    turnos: 'Turnos',
};

const TIPO_LABEL: Record<string, string> = {
    prorroga: 'Prórroga',
    cambio_tipo_contrato: 'Conversión a indefinido',
    modificacion_sueldo: 'Modificación de sueldo',
    modificacion_cargo: 'Modificación de cargo',
    modificacion_funciones: 'Modificación de funciones',
    modificacion_jornada: 'Modificación de jornada',
    cambio_lugar_trabajo: 'Cambio de lugar de trabajo',
    modificacion_general: 'Modificación general',
    otro: 'Otro',
};

// ─── AnexoCard ────────────────────────────────────────────────────────────────

const buildDetalles = (a: IAnexoContrato): Array<{ label: string; valor: string }> => {
    const items: Array<{ label: string; valor: string }> = [];
    if (a.nuevo_tipo_contrato)
        items.push({ label: 'Tipo de contrato', valor: 'Indefinido' });
    if (a.nueva_fecha_termino)
        items.push({ label: 'Nueva fecha de término', valor: dayjs(a.nueva_fecha_termino).format('DD/MM/YYYY') });
    if (a.nuevo_sueldo)
        items.push({ label: 'Sueldo base', valor: formatMonto(a.nuevo_sueldo) ?? '' });
    if (a.nuevo_tipo_gratificacion)
        items.push({ label: 'Gratificación', valor: GRATIFICACION_LABEL[a.nuevo_tipo_gratificacion] ?? a.nuevo_tipo_gratificacion });
    if (a.nuevo_bono_movilizacion)
        items.push({ label: 'Bono movilización', valor: formatMonto(a.nuevo_bono_movilizacion) ?? '' });
    if (a.nuevo_bono_colacion)
        items.push({ label: 'Bono colación', valor: formatMonto(a.nuevo_bono_colacion) ?? '' });
    if (a.nuevo_cargo)
        items.push({ label: 'Cargo', valor: a.nuevo_cargo });
    if (a.nuevas_funciones)
        items.push({ label: 'Funciones', valor: a.nuevas_funciones });
    if (a.nueva_jornada)
        items.push({ label: 'Jornada', valor: JORNADA_LABEL[a.nueva_jornada] ?? a.nueva_jornada });
    if (a.nuevas_horas_semanales)
        items.push({ label: 'Horas semanales', valor: `${a.nuevas_horas_semanales} hrs/semana` });
    if (a.nuevo_lugar_trabajo)
        items.push({ label: 'Lugar de trabajo', valor: a.nuevo_lugar_trabajo });
    return items;
};

interface IAnexoCardProps {
    a: IAnexoContrato;
    onDescargar: (url: string, id: number) => void;
    onActivar: (id: number) => void;
    onDescartar: (id: number, contratoId: number) => void;
    activandoId: number | null;
    descartandoId: number | null;
}

const AnexoCard = ({ a, onDescargar, onActivar, onDescartar, activandoId, descartandoId }: IAnexoCardProps) => {
    const [expanded, setExpanded] = useState(false);
    const esBorrador = a.estado === 'borrador';
    const detalles = buildDetalles(a);
    const tieneDetalles = detalles.length > 0;

    const alguienOcupado = activandoId !== null || descartandoId !== null;

    return (
        <div className={`rounded-lg border p-4 ${esBorrador ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20' : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'}`}>
            <div className='flex items-start justify-between gap-2'>
                <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                        {a.numero_anexo && (
                            <span className='shrink-0 rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-xs font-bold text-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'>
                                N°{a.numero_anexo}
                            </span>
                        )}
                        <p className='text-sm font-semibold text-zinc-800 dark:text-zinc-100'>
                            {a.tipo_label ?? TIPO_LABEL[a.tipo] ?? a.tipo}
                        </p>
                        {esBorrador && (
                            <Badge color='amber' variant='outline'>Pendiente de activar</Badge>
                        )}
                        {a.numero_prorroga && (
                            <Badge color='blue' variant='outline'>Prórroga N°{a.numero_prorroga}</Badge>
                        )}
                    </div>
                    <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
                        Efectivo: {a.fecha_efectiva ? dayjs(a.fecha_efectiva).format('DD/MM/YYYY') : '—'}
                    </p>
                    {a.descripcion && (
                        <p className='mt-1 text-sm text-zinc-600 dark:text-zinc-300'>{a.descripcion}</p>
                    )}
                    {tieneDetalles && (
                        <button
                            type='button'
                            onClick={() => setExpanded((p) => !p)}
                            className='mt-1.5 text-xs text-blue-500 hover:underline dark:text-blue-400'>
                            {expanded
                                ? 'Ocultar detalle'
                                : `Ver detalle (${detalles.length} campo${detalles.length > 1 ? 's' : ''})`}
                        </button>
                    )}
                    {tieneDetalles && expanded && (
                        <div className='mt-2 rounded border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/60'>
                            <table className='w-full text-xs'>
                                <tbody>
                                    {detalles.map((item, i) => (
                                        <tr
                                            key={i}
                                            className={i > 0 ? 'border-t border-zinc-200 dark:border-zinc-700' : ''}>
                                            <td className='py-1 pr-4 font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap align-top'>
                                                {item.label}
                                            </td>
                                            <td className='py-1 text-zinc-800 dark:text-zinc-100 break-words'>
                                                {item.valor}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className='flex shrink-0 items-center gap-2'>
                    {esBorrador && (
                        <>
                            <Button
                                size='sm'
                                color='red'
                                variant='outline'
                                icon='HeroTrash'
                                isLoading={descartandoId === a.id}
                                isDisable={alguienOcupado}
                                onClick={() => onDescartar(a.id, a.contrato)}>
                                Descartar
                            </Button>
                            <Button
                                size='sm'
                                variant='solid'
                                color='emerald'
                                icon='HeroCheckCircle'
                                isLoading={activandoId === a.id}
                                isDisable={alguienOcupado}
                                onClick={() => onActivar(a.id)}>
                                Activar
                            </Button>
                        </>
                    )}
                    {a.archivo_pdf && !esBorrador && (
                        <Button
                            icon='HeroDocumentArrowDown'
                            size='sm'
                            onClick={() => onDescargar(a.archivo_pdf!, a.id)}>
                            PDF
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Componente principal ─────────────────────────────────────────────────────

interface IProps {
    contrato: IContratoTrabajador;
}

const TabAnexosTrabajador = ({ contrato }: IProps) => {
    const { data: anexos = [], isLoading } = useGetAnexosContratoQuery(contrato.id);
    const [crearAnexo, { isLoading: creando }] = useCrearAnexoContratoMutation();
    const [activarAnexo] = useActivarAnexoContratoMutation();
    const [eliminarAnexo] = useEliminarAnexoContratoMutation();

    const [formVisible, setFormVisible] = useState(false);
    const [seccionesActivas, setSeccionesActivas] = useState<Set<TSectionId>>(new Set());
    const [activandoId, setActivandoId] = useState<number | null>(null);
    const [descartandoId, setDescartandoId] = useState<number | null>(null);

    // Campos comunes
    const [fechaEfectiva, setFechaEfectiva] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [archivoPdf, setArchivoPdf] = useState<File | null>(null);

    // Prórroga
    const [nuevaFechaTermino, setNuevaFechaTermino] = useState('');

    // Sueldo
    const [nuevoSueldoBase, setNuevoSueldoBase] = useState('');
    const [nuevoTipoGratificacion, setNuevoTipoGratificacion] = useState<TSelectOption | null>(null);
    const [nuevoBonoMovilizacion, setNuevoBonoMovilizacion] = useState('');
    const [nuevoBonoColacion, setNuevoBonoColacion] = useState('');

    // Cargo
    const [nuevoCargo, setNuevoCargo] = useState('');

    // Funciones
    const [nuevasFunciones, setNuevasFunciones] = useState('');

    // Jornada
    const [nuevaJornada, setNuevaJornada] = useState<TSelectOption | null>(null);
    const [nuevasHorasSemanales, setNuevasHorasSemanales] = useState<TSelectOption | null>(null);

    // Lugar
    const [nuevoLugarTrabajo, setNuevoLugarTrabajo] = useState('');

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const fileRef = useRef<HTMLInputElement>(null);

    const esVigente = contrato.estado === 'vigente';
    const esVencido = contrato.estado === 'vencido';
    const esFinal = contrato.estado === 'terminado' || contrato.estado === 'anulado';
    const esBorradorOPendiente = contrato.estado === 'borrador' || contrato.estado === 'pendiente_aprobacion';
    const esPlazofijo = contrato.tipo_contrato === 'plazo_fijo';

    // ── Toggle de sección con exclusión mutua ──────────────────────────────────
    const toggleSeccion = (id: TSectionId) => {
        const seccion = SECTIONS.find((s) => s.id === id);
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
        // Limpiar solo los errores de la sección toggled + el error global de secciones
        setFormErrors((prev) => {
            const next = { ...prev };
            ERRORES_POR_SECCION[id].forEach((k) => delete next[k]);
            delete next.secciones;
            return next;
        });
    };

    // ── Descarga PDF ───────────────────────────────────────────────────────────
    const handleDescargarPdf = async (url: string, id: number) => {
        try {
            const response = await ApiService.fetchData<Blob>({
                url,
                method: 'get',
                responseType: 'blob',
            });
            const blobUrl = window.URL.createObjectURL(
                new Blob([response.data], { type: 'application/pdf' }),
            );
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `anexo_${id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    // ── Activar anexo ──────────────────────────────────────────────────────────
    const handleActivar = async (id: number) => {
        const ok = await confirmAlert({
            title: 'Activar anexo',
            text: 'Al activar, los cambios se aplicarán al contrato. Esta acción no se puede revertir.',
            confirmText: 'Activar',
            icon: 'warning',
        });
        if (!ok) return;
        setActivandoId(id);
        try {
            const result = await activarAnexo(id).unwrap();
            toast.success('Anexo activado. Cambios aplicados al contrato.');
            if (result.numero_prorroga && result.numero_prorroga >= 2) {
                toast.warn(
                    `Esta es la ${result.numero_prorroga}ª prórroga. Art. 159 N°4 CT: si el contrato supera 1 año o se renueva más de una vez, el trabajador puede exigir que se declare indefinido.`,
                    { autoClose: 10000 },
                );
            }
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setActivandoId(null);
        }
    };

    // ── Descartar borrador ─────────────────────────────────────────────────────
    const handleDescartar = async (id: number, contratoId: number) => {
        const ok = await confirmAlert({
            title: 'Descartar borrador',
            text: 'El borrador se eliminará. Esta acción no se puede deshacer.',
            confirmText: 'Descartar',
            icon: 'warning',
        });
        if (!ok) return;
        setDescartandoId(id);
        try {
            await eliminarAnexo({ id, contratoId }).unwrap();
            toast.success('Borrador descartado.');
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setDescartandoId(null);
        }
    };

    // ── Reset formulario ───────────────────────────────────────────────────────
    const resetForm = () => {
        setSeccionesActivas(new Set());
        setFechaEfectiva('');
        setDescripcion('');
        setArchivoPdf(null);
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
        setFormErrors({});
        if (fileRef.current) fileRef.current.value = '';
        setFormVisible(false);
    };

    // ── Crear borrador ─────────────────────────────────────────────────────────
    const handleCrear = async () => {
        const errs: Record<string, string> = {};
        if (!fechaEfectiva) errs.fechaEfectiva = 'Requerido';
        if (seccionesActivas.size === 0) errs.secciones = 'Selecciona al menos una modificación';
        if (seccionesActivas.has('prorroga') && !nuevaFechaTermino) errs.nuevaFechaTermino = 'Requerido';
        if (seccionesActivas.has('sueldo') && !nuevoSueldoBase) errs.nuevoSueldoBase = 'Requerido';
        if (seccionesActivas.has('cargo') && !nuevoCargo.trim()) errs.nuevoCargo = 'Requerido';
        if (seccionesActivas.has('funciones') && !nuevasFunciones.trim()) errs.nuevasFunciones = 'Requerido';
        if (seccionesActivas.has('jornada') && !nuevaJornada) errs.nuevaJornada = 'Requerido';
        if (seccionesActivas.has('lugar') && !nuevoLugarTrabajo.trim()) errs.nuevoLugarTrabajo = 'Requerido';

        setFormErrors(errs);
        if (Object.keys(errs).length > 0) return;

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
            resetForm();
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    // ── Estados no aplicables ─────────────────────────────────────────────────
    if (esBorradorOPendiente) {
        return (
            <Card>
                <CardBody>
                    <Alert variant='outline' color='blue' icon='HeroInformationCircle'>
                        Los anexos están disponibles únicamente cuando el contrato está Vigente.
                    </Alert>
                </CardBody>
            </Card>
        );
    }

    if (esVencido) {
        return (
            <Card>
                <CardBody>
                    <Alert variant='outline' color='red' icon='HeroExclamationTriangle'>
                        Este contrato está vencido. Solo es posible crear un anexo de{' '}
                        <strong>Conversión a Indefinido</strong> para formalizar la continuación de la relación laboral.
                        Usa el tab <strong>Anexos V2</strong> para iniciar ese proceso.
                    </Alert>
                </CardBody>
            </Card>
        );
    }

    return (
        <div className='space-y-4'>
            {/* Alert solo visible mientras el formulario está abierto */}
            {esVigente && formVisible && (
                <Alert variant='outline' color='blue' icon='HeroInformationCircle'>
                    Los anexos modifican condiciones del contrato vigente. Los cambios se aplican al contrato solo al activar el borrador.
                </Alert>
            )}

            {/* Lista de anexos */}
            <Card>
                <CardHeader>
                    <div className='flex items-center justify-between w-full'>
                        <span>{esFinal ? 'Historial de Anexos' : 'Anexos del Contrato'}</span>
                        <div className='flex items-center gap-2'>
                            {esFinal && <Badge color='zinc' variant='outline'>Solo lectura</Badge>}
                            {esVigente && !formVisible && (
                                <Button
                                    icon='HeroPlus'
                                    variant='solid'
                                    size='sm'
                                    onClick={() => setFormVisible(true)}>
                                    Nuevo anexo
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardBody>
                    {isLoading ? (
                        <p className='text-sm text-zinc-500'>Cargando...</p>
                    ) : anexos.length === 0 ? (
                        <p className='text-sm text-zinc-400'>No hay anexos registrados.</p>
                    ) : (
                        <div className='space-y-3'>
                            {anexos.map((a: IAnexoContrato) => (
                                <AnexoCard
                                    key={a.id}
                                    a={a}
                                    onDescargar={handleDescargarPdf}
                                    onActivar={handleActivar}
                                    onDescartar={handleDescartar}
                                    activandoId={activandoId}
                                    descartandoId={descartandoId}
                                />
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Formulario nuevo anexo */}
            {esVigente && formVisible && (
                <Card>
                    <CardHeader>Nuevo anexo</CardHeader>
                    <CardBody>
                        <div className='space-y-5'>

                            {/* Fecha efectiva */}
                            <div>
                                <Label htmlFor='anexo_fecha'>Fecha efectiva <span className='text-red-500'>*</span></Label>
                                <Input
                                    id='anexo_fecha'
                                    name='anexo_fecha'
                                    type='date'
                                    value={fechaEfectiva}
                                    onChange={(e) => {
                                        setFechaEfectiva(e.target.value);
                                        setFormErrors((p) => ({ ...p, fechaEfectiva: '' }));
                                    }}
                                />
                                {formErrors.fechaEfectiva && (
                                    <p className='mt-1 text-xs text-red-500'>{formErrors.fechaEfectiva}</p>
                                )}
                            </div>

                            {/* Toggle cards de secciones */}
                            <div>
                                <p className='mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300'>
                                    ¿Qué modifica este anexo? <span className='text-red-500'>*</span>
                                </p>
                                <div className='flex flex-wrap gap-2'>
                                    {SECTIONS.map((s) => {
                                        const deshabilitada = !!s.soloPlazofijo && !esPlazofijo;
                                        const activa = seccionesActivas.has(s.id);
                                        return (
                                            <button
                                                key={s.id}
                                                type='button'
                                                disabled={deshabilitada}
                                                title={deshabilitada ? 'Solo disponible para contratos a plazo fijo' : undefined}
                                                onClick={() => toggleSeccion(s.id)}
                                                className={`flex items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors
                                                    ${deshabilitada
                                                        ? 'cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-600'
                                                        : activa
                                                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                                                    }`}>
                                                <Icon icon={s.icon} className='h-4 w-4 shrink-0' />
                                                <span>{s.label}</span>
                                                {activa && <span className='text-blue-500'>✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                {formErrors.secciones && (
                                    <p className='mt-1 text-xs text-red-500'>{formErrors.secciones}</p>
                                )}
                            </div>

                            {/* Sección: Conversión a indefinido */}
                            {seccionesActivas.has('conversion') && (
                                <div className='rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20'>
                                    <p className='text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1'>
                                        Conversión a contrato indefinido
                                    </p>
                                    <p className='text-sm text-zinc-600 dark:text-zinc-300'>
                                        Al activar este anexo, el contrato pasará a tipo <strong>Indefinido</strong> y se eliminará la fecha de término.
                                    </p>
                                </div>
                            )}

                            {/* Sección: Prórroga */}
                            {seccionesActivas.has('prorroga') && (
                                <div className='rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3 dark:border-blue-800 dark:bg-blue-900/20'>
                                    <p className='text-xs font-semibold text-blue-700 dark:text-blue-400'>
                                        Extensión de plazo
                                    </p>
                                    <div>
                                        <Label htmlFor='nueva_fecha_termino'>
                                            Nueva fecha de término <span className='text-red-500'>*</span>
                                        </Label>
                                        {contrato.fecha_termino && (
                                            <p className='mt-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
                                                Actual: {dayjs(contrato.fecha_termino).format('DD/MM/YYYY')}
                                            </p>
                                        )}
                                        <Input
                                            id='nueva_fecha_termino'
                                            name='nueva_fecha_termino'
                                            type='date'
                                            min={contrato.fecha_termino ?? undefined}
                                            value={nuevaFechaTermino}
                                            onChange={(e) => {
                                                setNuevaFechaTermino(e.target.value);
                                                setFormErrors((p) => ({ ...p, nuevaFechaTermino: '' }));
                                            }}
                                        />
                                        {formErrors.nuevaFechaTermino && (
                                            <p className='mt-1 text-xs text-red-500'>{formErrors.nuevaFechaTermino}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Sección: Sueldo */}
                            {seccionesActivas.has('sueldo') && (
                                <div className='rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3 dark:border-blue-800 dark:bg-blue-900/20'>
                                    <p className='text-xs font-semibold text-blue-700 dark:text-blue-400'>
                                        Nuevas condiciones de remuneración
                                    </p>
                                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                                        <div>
                                            <Label htmlFor='nuevo_sueldo'>
                                                Nuevo sueldo base <span className='text-red-500'>*</span>
                                            </Label>
                                            <p className='mt-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
                                                Actual: {formatMonto(contrato.sueldo)}
                                            </p>
                                            <Input
                                                id='nuevo_sueldo'
                                                name='nuevo_sueldo'
                                                type='number'
                                                placeholder='0'
                                                value={nuevoSueldoBase}
                                                onChange={(e) => {
                                                    setNuevoSueldoBase(e.target.value);
                                                    setFormErrors((p) => ({ ...p, nuevoSueldoBase: '' }));
                                                }}
                                            />
                                            {formErrors.nuevoSueldoBase && (
                                                <p className='mt-1 text-xs text-red-500'>{formErrors.nuevoSueldoBase}</p>
                                            )}
                                        </div>
                                        <div>
                                            <Label htmlFor='nuevo_tipo_gratificacion'>Tipo de gratificación</Label>
                                            <SelectReact
                                                name='nuevo_tipo_gratificacion'
                                                options={TIPO_GRATIFICACION_OPTIONS}
                                                value={nuevoTipoGratificacion}
                                                onChange={(opt) => setNuevoTipoGratificacion(opt as TSelectOption | null)}
                                                placeholder='Sin cambio...'
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor='nuevo_bono_movilizacion'>Bono movilización</Label>
                                            <Input
                                                id='nuevo_bono_movilizacion'
                                                name='nuevo_bono_movilizacion'
                                                type='number'
                                                placeholder='0'
                                                value={nuevoBonoMovilizacion}
                                                onChange={(e) => setNuevoBonoMovilizacion(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor='nuevo_bono_colacion'>Bono colación</Label>
                                            <Input
                                                id='nuevo_bono_colacion'
                                                name='nuevo_bono_colacion'
                                                type='number'
                                                placeholder='0'
                                                value={nuevoBonoColacion}
                                                onChange={(e) => setNuevoBonoColacion(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sección: Cargo */}
                            {seccionesActivas.has('cargo') && (
                                <div className='rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3 dark:border-blue-800 dark:bg-blue-900/20'>
                                    <p className='text-xs font-semibold text-blue-700 dark:text-blue-400'>
                                        Nuevo cargo
                                    </p>
                                    <div>
                                        <Label htmlFor='nuevo_cargo'>
                                            Cargo <span className='text-red-500'>*</span>
                                        </Label>
                                        <p className='mt-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
                                            Actual: {contrato.cargo}
                                        </p>
                                        <Input
                                            id='nuevo_cargo'
                                            name='nuevo_cargo'
                                            type='text'
                                            placeholder='Ej: Técnico Senior'
                                            value={nuevoCargo}
                                            onChange={(e) => {
                                                setNuevoCargo(e.target.value);
                                                setFormErrors((p) => ({ ...p, nuevoCargo: '' }));
                                            }}
                                        />
                                        {formErrors.nuevoCargo && (
                                            <p className='mt-1 text-xs text-red-500'>{formErrors.nuevoCargo}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Sección: Funciones */}
                            {seccionesActivas.has('funciones') && (
                                <div className='rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3 dark:border-blue-800 dark:bg-blue-900/20'>
                                    <p className='text-xs font-semibold text-blue-700 dark:text-blue-400'>
                                        Actualización de funciones
                                    </p>
                                    {contrato.funciones && (
                                        <p className='text-xs text-zinc-400 dark:text-zinc-500'>
                                            Actual: {contrato.funciones}
                                        </p>
                                    )}
                                    <div>
                                        <Label htmlFor='nuevas_funciones'>
                                            Nuevas funciones <span className='text-red-500'>*</span>
                                        </Label>
                                        <Textarea
                                            id='nuevas_funciones'
                                            value={nuevasFunciones}
                                            onChange={(e) => {
                                                setNuevasFunciones(e.target.value);
                                                setFormErrors((p) => ({ ...p, nuevasFunciones: '' }));
                                            }}
                                            placeholder='Describe las funciones actualizadas...'
                                            rows={3}
                                        />
                                        {formErrors.nuevasFunciones && (
                                            <p className='mt-1 text-xs text-red-500'>{formErrors.nuevasFunciones}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Sección: Jornada */}
                            {seccionesActivas.has('jornada') && (
                                <div className='rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3 dark:border-blue-800 dark:bg-blue-900/20'>
                                    <p className='text-xs font-semibold text-blue-700 dark:text-blue-400'>
                                        Nueva jornada laboral
                                    </p>
                                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                                        <div>
                                            <Label htmlFor='nueva_jornada'>
                                                Jornada <span className='text-red-500'>*</span>
                                            </Label>
                                            <p className='mt-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
                                                Actual: {contrato.jornada_label ?? contrato.jornada}
                                            </p>
                                            <SelectReact
                                                name='nueva_jornada'
                                                options={JORNADA_OPTIONS}
                                                value={nuevaJornada}
                                                onChange={(opt) => {
                                                    setNuevaJornada(opt as TSelectOption | null);
                                                    setNuevasHorasSemanales(null);
                                                    setFormErrors((p) => ({ ...p, nuevaJornada: '' }));
                                                }}
                                                placeholder='Seleccionar...'
                                            />
                                            {formErrors.nuevaJornada && (
                                                <p className='mt-1 text-xs text-red-500'>{formErrors.nuevaJornada}</p>
                                            )}
                                        </div>
                                        {nuevaJornada && nuevaJornada.value !== 'turnos' && (
                                            <div>
                                                <Label htmlFor='nuevas_horas_semanales'>Horas semanales</Label>
                                                <SelectReact
                                                    name='nuevas_horas_semanales'
                                                    options={HORAS_SEMANALES_OPTIONS}
                                                    value={nuevasHorasSemanales}
                                                    onChange={(opt) => setNuevasHorasSemanales(opt as TSelectOption | null)}
                                                    placeholder='Sin cambio...'
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Sección: Lugar de trabajo */}
                            {seccionesActivas.has('lugar') && (
                                <div className='rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3 dark:border-blue-800 dark:bg-blue-900/20'>
                                    <p className='text-xs font-semibold text-blue-700 dark:text-blue-400'>
                                        Nuevo lugar de trabajo
                                    </p>
                                    <div>
                                        <Label htmlFor='nuevo_lugar_trabajo'>
                                            Lugar <span className='text-red-500'>*</span>
                                        </Label>
                                        {contrato.lugar_trabajo && (
                                            <p className='mt-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
                                                Actual: {contrato.lugar_trabajo}
                                            </p>
                                        )}
                                        <Input
                                            id='nuevo_lugar_trabajo'
                                            name='nuevo_lugar_trabajo'
                                            type='text'
                                            placeholder='Ej: Av. Providencia 123, Santiago'
                                            value={nuevoLugarTrabajo}
                                            onChange={(e) => {
                                                setNuevoLugarTrabajo(e.target.value);
                                                setFormErrors((p) => ({ ...p, nuevoLugarTrabajo: '' }));
                                            }}
                                        />
                                        {formErrors.nuevoLugarTrabajo && (
                                            <p className='mt-1 text-xs text-red-500'>{formErrors.nuevoLugarTrabajo}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Descripción (opcional) */}
                            <div>
                                <Label htmlFor='anexo_descripcion'>Descripción (opcional)</Label>
                                <Textarea
                                    id='anexo_descripcion'
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                    placeholder='Notas adicionales al documento...'
                                    rows={2}
                                />
                            </div>

                            {/* PDF opcional */}
                            <FileInput
                                ref={fileRef}
                                id='anexo_pdf'
                                name='anexo_pdf'
                                label='PDF del anexo (opcional)'
                                accept='application/pdf'
                                selectedFile={archivoPdf}
                                onFileSelect={(file) => setArchivoPdf(file)}
                            />

                            <div className='flex gap-2'>
                                <Button
                                    variant='solid'
                                    onClick={handleCrear}
                                    isLoading={creando}
                                    isDisable={creando}>
                                    Guardar como borrador
                                </Button>
                                <Button onClick={resetForm} isDisable={creando}>
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
};

export default TabAnexosTrabajador;
