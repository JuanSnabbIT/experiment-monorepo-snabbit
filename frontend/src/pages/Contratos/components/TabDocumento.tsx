import Textarea from '@/components/form/Textarea';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { ClientIdentificationSection } from './ContratoDocumentoRenderer';
import { IContratoEmpresaCliente } from '@/interface/contrato.interface';
import { ISeccionContratoGenerada } from '@/interface/plantillaContrato.interface';
import { useAppSelector } from '@/store';
import { formatCurrency } from '@/utils/currency';
import {
    useGenerarSeccionesContratoMutation,
    useGetDetallePlantillaQuery,
    useGetSeccionesGeneradasQuery,
    useUpdateSeccionGeneradaMutation,
} from '@/store/slices/contratos/plantillaContratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';


interface ITabDocumentoProps {
    contrato: IContratoEmpresaCliente;
    puedeEditar: boolean;
}

// ── Utilidades ──

const formatFecha = (fecha: string | null | undefined): string => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

// ── Componente tabla editable para secciones tipo identificacion_cliente ──

interface IIdentificationRow {
    label: string;
    value: string;
}

function parseIdentificationContent(contenido: string): {
    title: string;
    rows: IIdentificationRow[];
} {
    const lines = contenido.split('\n');
    const title = lines[0] ?? '';
    const rows: IIdentificationRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        const colonIdx = line.indexOf(': ');
        if (colonIdx >= 0) {
            rows.push({ label: line.slice(0, colonIdx), value: line.slice(colonIdx + 2) });
        }
    }
    return { title, rows };
}

function serializeIdentificationContent(
    title: string,
    rows: IIdentificationRow[],
): string {
    return [title, '', ...rows.map((r) => `${r.label}: ${r.value}`)].join('\n');
}

const EditableIdentificationTable = ({
    value,
    onChange,
}: {
    value: string;
    onChange: (newValue: string) => void;
}) => {
    const { title, rows } = parseIdentificationContent(value);

    const handleValueChange = (idx: number, newVal: string) => {
        const newRows = rows.map((r, i) => (i === idx ? { ...r, value: newVal } : r));
        onChange(serializeIdentificationContent(title, newRows));
    };

    return (
        <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
            <div className='mb-4'>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                    Identificación
                </p>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>{title}</h2>
            </div>
            <div className='overflow-hidden rounded-md border border-gray-200 dark:border-zinc-700'>
                {rows.map((row, i) => (
                    <div
                        key={i}
                        className={`grid grid-cols-[200px,1fr] text-sm${i > 0 ? ' border-t border-gray-200 dark:border-zinc-700' : ''}`}>
                        <div className='border-r border-gray-200 px-3 py-2 font-medium text-gray-600 dark:border-zinc-700 dark:text-zinc-400'>
                            {row.label}
                        </div>
                        <div className='px-2 py-1'>
                            <input
                                type='text'
                                value={row.value}
                                onChange={(e) => handleValueChange(i, e.target.value)}
                                className='w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-gray-900 outline-none transition-colors hover:border-zinc-200 focus:border-blue-400 focus:bg-blue-50/30 dark:text-zinc-100 dark:hover:border-zinc-600 dark:focus:bg-blue-900/10'
                            />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

// ── Helper: detecta secciones de identificación por tipo o título ──
const esSeccionIdentificacion = (s: ISeccionContratoGenerada) =>
    s.tipo === 'identificacion_cliente' ||
    s.titulo?.toLowerCase().includes('identificaci');

// ── Componente: Firmas (solo lectura) ──
const FirmasModalSection = ({ contrato }: { contrato: IContratoEmpresaCliente }) => (
    <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
        <h2 className='mb-6 text-center text-base font-semibold uppercase tracking-wide text-gray-700 dark:text-zinc-400'>
            Firmas
        </h2>
        <div className='grid grid-cols-2 gap-8 text-center'>
            <div>
                <div className='mx-auto mb-2 h-16 w-48 border-b border-gray-400 dark:border-zinc-600' />
                <p className='text-sm font-medium text-gray-800 dark:text-zinc-200'>Empresa Prestadora</p>
                <p className='text-xs text-gray-500 dark:text-zinc-500'>{contrato.datos_empresa?.nombre || ''}</p>
            </div>
            <div>
                <div className='mx-auto mb-2 h-16 w-48 border-b border-gray-400 dark:border-zinc-600' />
                <p className='text-sm font-medium text-gray-800 dark:text-zinc-200'>Empresa Cliente</p>
                <p className='text-xs text-gray-500 dark:text-zinc-500'>{contrato.datos_cliente?.nombre || ''}</p>
            </div>
        </div>
    </section>
);

// ── Componente: Bloque Servicios (solo lectura) ──
const BloqueServiciosModal = ({ contrato }: { contrato: IContratoEmpresaCliente }) => {
    const moneda = contrato.moneda_cobro || 'USD';
    const items = contrato.items_comerciales ?? [];
    const servicios = contrato.contrato_servicios ?? [];
    const todos = [...items, ...servicios];
    return (
        <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
            <div className='mb-4'>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                    Servicios
                </p>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                    Servicios contratados
                </h2>
            </div>
            {todos.length === 0 ? (
                <p className='text-sm text-gray-400 dark:text-zinc-500'>Sin servicios registrados.</p>
            ) : (
                <div className='space-y-2'>
                    {todos.map((item, i) => (
                        <div
                            key={i}
                            className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                            <div className='flex items-start justify-between gap-2'>
                                <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                    {item.nombre}
                                </p>
                                <p className='shrink-0 text-sm text-gray-600 dark:text-zinc-300'>
                                    {formatCurrency(item.subtotal_en_moneda_cobro ?? item.subtotal, moneda)}
                                </p>
                            </div>
                            <p className='text-xs text-gray-500 dark:text-zinc-400'>
                                Cantidad: {item.cantidad}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

// ── Componente: Bloque Licencias (solo lectura) ──
const BloqueLicenciasModal = ({ contrato }: { contrato: IContratoEmpresaCliente }) => {
    const licencias = contrato.contrato_licencias ?? [];
    return (
        <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
            <div className='mb-4'>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                    Licencias
                </p>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                    Licencias contratadas
                </h2>
            </div>
            {licencias.length === 0 ? (
                <p className='text-sm text-gray-400 dark:text-zinc-500'>Sin licencias registradas.</p>
            ) : (
                <div className='space-y-2'>
                    {licencias.map((licencia) => (
                        <div
                            key={licencia.id}
                            className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                            <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                {licencia.nombre_licencia}
                            </p>
                            <p className='text-sm text-gray-500 dark:text-zinc-400'>
                                {licencia.modalidad_snapshot_label}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

// ── Componente: Bloque Condiciones Especiales (solo lectura) ──
const BloqueCondicionesModal = ({ contrato }: { contrato: IContratoEmpresaCliente }) => {
    const condiciones = contrato.contrato_condiciones_especiales ?? [];
    return (
        <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
            <div className='mb-4'>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                    Condiciones
                </p>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                    Condiciones especiales
                </h2>
            </div>
            {condiciones.length === 0 ? (
                <p className='text-sm text-gray-400 dark:text-zinc-500'>Sin condiciones especiales.</p>
            ) : (
                <div className='space-y-3'>
                    {condiciones.map((condicion) => (
                        <div
                            key={condicion.id}
                            className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                            <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                {condicion.titulo_personalizado || condicion.titulo_condicion}
                            </p>
                            <p className='mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-zinc-300'>
                                {condicion.detalle_personalizado ||
                                    condicion.detalle_condicion ||
                                    condicion.descripcion_condicion}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

// ── Componente: Bloque Resumen Comercial (solo lectura) ──
const BloqueResumenComercialModal = ({ contrato }: { contrato: IContratoEmpresaCliente }) => {
    const moneda = contrato.moneda_cobro || 'USD';
    const fechaInicio = formatFecha(contrato.fecha_inicio);
    const fechaFin = formatFecha(contrato.fecha_fin);
    return (
        <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
            <div className='mb-4'>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                    Resumen comercial
                </p>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                    {contrato.tipo === 'venta'
                        ? 'Total contractual consolidado'
                        : 'Total contractual referencial'}
                </h2>
            </div>
            <div className='grid grid-cols-2 gap-3 rounded-md border border-gray-100 bg-gray-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800 md:grid-cols-4'>
                <div>
                    <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                        Inicio
                    </p>
                    <p className='font-medium text-gray-800 dark:text-zinc-200'>{fechaInicio}</p>
                </div>
                <div>
                    <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                        Término
                    </p>
                    <p className='font-medium text-gray-800 dark:text-zinc-200'>{fechaFin}</p>
                </div>
                <div>
                    <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                        Moneda
                    </p>
                    <p className='font-medium text-gray-800 dark:text-zinc-200'>{moneda}</p>
                </div>
                {contrato.total_contrato != null && contrato.total_contrato > 0 && (
                    <div>
                        <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                            Total
                        </p>
                        <p className='font-semibold text-emerald-600 dark:text-emerald-400'>
                            {formatCurrency(contrato.total_contrato, moneda)}
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
};

// ── Componente: Bloque Acuerdos NDA (solo lectura) ──
const BloqueAcuerdosModal = ({ contrato }: { contrato: IContratoEmpresaCliente }) => {
    const acuerdos = contrato.firmas_confidencialidad ?? [];
    return (
        <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
            <div className='mb-4'>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                    Confidencialidad
                </p>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-zinc-100'>
                    Acuerdos asociados
                </h2>
            </div>
            {acuerdos.length === 0 ? (
                <p className='text-sm text-gray-400 dark:text-zinc-500'>
                    Sin acuerdos de confidencialidad registrados.
                </p>
            ) : (
                <div className='space-y-3'>
                    {acuerdos.map((acuerdo) => (
                        <div
                            key={acuerdo.id}
                            className='rounded-md border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                            <p className='font-medium text-gray-900 dark:text-zinc-100'>
                                {acuerdo.titulo_acuerdo}
                            </p>
                            <p className='mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-zinc-300'>
                                {acuerdo.contenido_acuerdo}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

const TabDocumento = ({ contrato, puedeEditar }: ITabDocumentoProps) => {
    const navigate = useNavigate();
    const { data: secciones = [], isLoading } = useGetSeccionesGeneradasQuery(contrato.id);
    const { data: plantillaDetalle } = useGetDetallePlantillaQuery(contrato.plantilla ?? 0, {
        skip: !contrato.plantilla,
    });
    const [generarSecciones, { isLoading: isGenerando }] = useGenerarSeccionesContratoMutation();
    const [updateSeccion] = useUpdateSeccionGeneradaMutation();
    const token = useAppSelector((state) => state.auth.access);
    const [descargandoPdfV29, setDescargandoPdfV29] = useState(false);

    // Plantilla v2.9 (documento único Slate + WeasyPrint): sin secciones que
    // listar/regenerar acá — el backend ya resuelve el motor correcto en
    // GET /api/contratos/{id}/pdf/ (ver flow_helpers._resolver_pdf_contrato),
    // mismo patrón que ya usa PDFContrato.tsx.
    const handleVerPdfV29 = async () => {
        setDescargandoPdfV29(true);
        try {
            const baseUrl = import.meta.env.VITE_API_URL ?? '';
            const response = await fetch(`${baseUrl}/api/contratos/${contrato.id}/pdf/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setDescargandoPdfV29(false);
        }
    };

    const [seccionModal, setSeccionModal] = useState<ISeccionContratoGenerada | null>(null);
    const [contenidoEdit, setContenidoEdit] = useState('');

    const seccionesOrdenadas = [...secciones].sort((a, b) => a.orden - b.orden);
    const tieneEditadasManualmente = secciones.some((s) => s.fue_editado_manualmente);

    const handleRegenerar = async () => {
        // eslint-disable-next-line no-alert
        const confirmar = window.confirm(
            tieneEditadasManualmente
                ? 'Las secciones editadas manualmente se mantendrán. Las demás se actualizarán con los datos vigentes del contrato. ¿Deseas continuar?'
                : 'Se regenerará el borrador con los datos actuales del contrato. ¿Deseas continuar?',
        );
        if (!confirmar) return;
        try {
            await generarSecciones(contrato.id).unwrap();
            toast.success('Borrador actualizado correctamente');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleAbrirModal = (seccion: ISeccionContratoGenerada) => {
        setSeccionModal(seccion);
        setContenidoEdit(seccion.contenido_renderizado);
    };

    const handleCerrarModal = () => {
        setSeccionModal(null);
        setContenidoEdit('');
    };

    const handleGuardar = async () => {
        if (!seccionModal) return;
        try {
            await updateSeccion({
                contratoId: contrato.id,
                seccionId: seccionModal.id,
                data: { contenido_renderizado: contenidoEdit },
            }).unwrap();
            toast.success('Sección actualizada');
            handleCerrarModal();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    // Tipos que nunca son editables en el modal (sin texto propio: renderizan desde datos del contrato)
    const TIPOS_SIEMPRE_READONLY = new Set([
        'bloque_servicios',
        'bloque_licencias',
        'bloque_condiciones_especiales',
        'bloque_resumen_comercial',
        'bloque_acuerdos',
        'firmas',
        'identificacion_cliente',
    ]);

    const puedeEditarSeccion = (seccion: ISeccionContratoGenerada) =>
        puedeEditar &&
        seccion.es_editable_en_contrato &&
        !TIPOS_SIEMPRE_READONLY.has(seccion.tipo ?? '');

    // Plantilla v2.9: documento único (Slate), no secciones — la UI de abajo
    // (listado/edición por sección, "Generar borrador" vía /generar-secciones/)
    // es del motor viejo y no aplica acá. El editor v2.9 en sí se edita desde
    // "Ver plantilla"; esta pestaña solo ofrece ver/descargar el PDF final.
    if (plantillaDetalle?.version_editor === 'v29') {
        return (
            <Card>
                <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                    <CardHeaderChild>
                        <div>
                            <div className='text-lg font-semibold text-blue-500'>Documento del contrato</div>
                            <div className='text-sm text-zinc-500'>
                                Basado en plantilla: {plantillaDetalle.titulo}
                            </div>
                        </div>
                    </CardHeaderChild>
                    <CardHeaderChild>
                        <Badge color='blue' variant='outline'>Editor v2.9</Badge>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className='space-y-4 p-4'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                        <Button
                            size='sm'
                            variant='solid'
                            color='blue'
                            icon='HeroDocumentArrowDown'
                            isLoading={descargandoPdfV29}
                            onClick={handleVerPdfV29}>
                            Ver / descargar PDF
                        </Button>
                        {contrato.plantilla && (
                            <Button
                                size='sm'
                                icon='HeroArrowTopRightOnSquare'
                                onClick={() =>
                                    navigate(`/registros/plantillas-contrato/${contrato.plantilla}`)
                                }>
                                Ver plantilla
                            </Button>
                        )}
                    </div>
                    <p className='text-sm text-zinc-500'>
                        Esta plantilla usa el editor v2.9 (documento único) — el contenido se edita
                        desde "Ver plantilla". El PDF se genera bajo demanda con los datos actuales
                        del contrato.
                    </p>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                <CardHeaderChild>
                    <div>
                        <div className='text-lg font-semibold text-blue-500'>Documento del contrato</div>
                        <div className='text-sm text-zinc-500'>
                            {plantillaDetalle
                                ? `Basado en plantilla: ${plantillaDetalle.titulo}`
                                : 'Secciones generadas automáticamente'}
                        </div>
                    </div>
                </CardHeaderChild>
                <CardHeaderChild>
                    <div className='flex flex-wrap items-center gap-2'>
                        <Badge
                            color={secciones.length > 0 ? 'emerald' : 'zinc'}
                            variant='outline'>
                            {secciones.length} secciones
                        </Badge>
                        {tieneEditadasManualmente && (
                            <Badge color='amber' variant='outline'>
                                Con ediciones manuales
                            </Badge>
                        )}
                        {contrato.plantilla_version_usada && (
                            <Badge
                                color={
                                    plantillaDetalle?.version &&
                                    String(plantillaDetalle.version) !==
                                        contrato.plantilla_version_usada
                                        ? 'amber'
                                        : 'zinc'
                                }
                                variant='outline'
                                title={
                                    plantillaDetalle?.version &&
                                    String(plantillaDetalle.version) !==
                                        contrato.plantilla_version_usada
                                        ? `La plantilla tiene cambios desde la v${contrato.plantilla_version_usada}. Considera regenerar el borrador.`
                                        : `Generado con plantilla v${contrato.plantilla_version_usada}`
                                }>
                                v{contrato.plantilla_version_usada}
                                {plantillaDetalle?.version &&
                                    String(plantillaDetalle.version) !==
                                        contrato.plantilla_version_usada && (
                                        <span className='ml-1'>⚠</span>
                                    )}
                            </Badge>
                        )}
                    </div>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='space-y-4 p-4'>
                {/* Acciones superiores */}
                <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='flex gap-2'>
                        {puedeEditar && secciones.length > 0 && (
                            <Button
                                size='sm'
                                variant='outline'
                                color='blue'
                                icon='HeroArrowPath'
                                isLoading={isGenerando}
                                onClick={handleRegenerar}>
                                Regenerar borrador
                            </Button>
                        )}
                    </div>
                    <div className='flex gap-2'>
                        {contrato.plantilla && (
                            <Button
                                size='sm'
                                icon='HeroArrowTopRightOnSquare'
                                onClick={() =>
                                    navigate(
                                        `/registros/plantillas-contrato/${contrato.plantilla}`,
                                    )
                                }>
                                Ver plantilla
                            </Button>
                        )}
                    </div>
                </div>

                {tieneEditadasManualmente && (
                    <Alert color='amber' icon='HeroExclamationTriangle' variant='outline'>
                        Hay secciones ajustadas manualmente. Al regenerar, esas secciones se
                        mantienen y solo se actualizan las demás.
                    </Alert>
                )}

                {isLoading && (
                    <p className='py-8 text-center text-zinc-500'>Cargando documento...</p>
                )}

                {!isLoading && secciones.length === 0 && (
                    <div className='flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-10 text-center dark:border-zinc-700'>
                        <p className='text-sm text-zinc-500'>
                            No se encontraron secciones generadas. Puedes regenerar el borrador
                            para crear las secciones desde la plantilla.
                        </p>
                        {puedeEditar && (
                            <Button
                                variant='solid'
                                size='sm'
                                icon='HeroDocumentText'
                                isLoading={isGenerando}
                                onClick={handleRegenerar}>
                                Generar borrador
                            </Button>
                        )}
                    </div>
                )}

                {!isLoading && secciones.length > 0 && (
                    <div className='flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700'>
                        {seccionesOrdenadas.map((seccion) => (
                            <div
                                key={seccion.id}
                                className='flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'>
                                <span className='w-6 shrink-0 text-right text-xs font-medium text-zinc-400'>
                                    {seccion.orden}.
                                </span>
                                <span className='min-w-0 flex-1 truncate text-sm font-medium text-zinc-800 dark:text-zinc-100'>
                                    {seccion.titulo}
                                </span>
                                <div className='flex shrink-0 items-center gap-2'>
                                    {!seccion.es_editable_en_contrato && (
                                        <Badge color='sky' variant='outline' className='text-xs'>
                                            Sistema
                                        </Badge>
                                    )}
                                    {seccion.fue_editado_manualmente && (
                                        <Badge color='amber' variant='outline' className='text-xs'>
                                            Editado
                                        </Badge>
                                    )}
                                    <Tooltip text='Ver detalle'>
                                        <Button
                                            size='sm'
                                            variant='solid'
                                            color='violet'
                                            icon='HeroEye'
                                            onClick={() => handleAbrirModal(seccion)}
                                        />
                                    </Tooltip>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>

            {/* Modal de detalle de sección */}
            <Modal
                isOpen={seccionModal !== null}
                setIsOpen={(open) => {
                    if (!open) handleCerrarModal();
                }}
                size='xl'>
                <ModalHeader>
                    <div className='flex items-center gap-2'>
                        <span className='text-base font-semibold'>
                            {seccionModal?.titulo ?? ''}
                        </span>
                        {seccionModal && !seccionModal.es_editable_en_contrato && (
                            <Badge color='sky' variant='outline' className='text-xs'>
                                Solo lectura
                            </Badge>
                        )}
                        {seccionModal?.fue_editado_manualmente && (
                            <Badge color='amber' variant='outline' className='text-xs'>
                                Editado manualmente
                            </Badge>
                        )}
                    </div>
                </ModalHeader>
                <ModalBody>
                    {seccionModal && (
                        <div className='mx-auto max-w-4xl py-2'>
                            {puedeEditarSeccion(seccionModal) ? (
                                // ── Modo editable ──
                                esSeccionIdentificacion(seccionModal) ? (
                                    <EditableIdentificationTable
                                        value={contenidoEdit}
                                        onChange={setContenidoEdit}
                                    />
                                ) : seccionModal.tipo === 'titulo' ||
                                  seccionModal.tipo === 'subtitulo' ? (
                                    <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                                        <p className='mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500'>
                                            {seccionModal.tipo === 'titulo' ? 'Título' : 'Subtítulo'}
                                        </p>
                                        <input
                                            type='text'
                                            value={contenidoEdit}
                                            onChange={(e) => setContenidoEdit(e.target.value)}
                                            className={`w-full rounded border border-transparent bg-transparent px-1 py-0.5 outline-none transition-colors hover:border-zinc-200 focus:border-blue-400 focus:bg-blue-50/30 dark:hover:border-zinc-600 dark:focus:bg-blue-900/10 ${
                                                seccionModal.tipo === 'titulo'
                                                    ? 'text-xl font-bold text-gray-900 dark:text-zinc-100'
                                                    : 'text-base font-semibold text-gray-800 dark:text-zinc-200'
                                            }`}
                                        />
                                    </section>
                                ) : (
                                    <div className='rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                                        <Textarea
                                            id='seccion-modal-edit'
                                            name='seccion-modal-edit'
                                            value={contenidoEdit}
                                            onChange={(e) => setContenidoEdit(e.target.value)}
                                            rows={16}
                                            className='w-full font-mono text-sm'
                                        />
                                    </div>
                                )
                            ) : (
                                // ── Modo solo lectura ──
                                esSeccionIdentificacion(seccionModal) ? (
                                    <ClientIdentificationSection cliente={contrato.datos_cliente} />
                                ) : seccionModal.tipo === 'firmas' ? (
                                    <FirmasModalSection contrato={contrato} />
                                ) : seccionModal.tipo === 'titulo' ? (
                                    <section className='rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900'>
                                        <h2 className='text-2xl font-bold text-gray-900 dark:text-zinc-100'>
                                            {seccionModal.contenido_renderizado || seccionModal.titulo}
                                        </h2>
                                    </section>
                                ) : seccionModal.tipo === 'subtitulo' ? (
                                    <section className='rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                                        <h3 className='text-lg font-semibold text-gray-800 dark:text-zinc-200'>
                                            {seccionModal.contenido_renderizado || seccionModal.titulo}
                                        </h3>
                                    </section>
                                ) : seccionModal.tipo === 'bloque_servicios' ? (
                                    <BloqueServiciosModal contrato={contrato} />
                                ) : seccionModal.tipo === 'bloque_licencias' ? (
                                    <BloqueLicenciasModal contrato={contrato} />
                                ) : seccionModal.tipo === 'bloque_condiciones_especiales' ? (
                                    <BloqueCondicionesModal contrato={contrato} />
                                ) : seccionModal.tipo === 'bloque_resumen_comercial' ? (
                                    <BloqueResumenComercialModal contrato={contrato} />
                                ) : seccionModal.tipo === 'bloque_acuerdos' ? (
                                    <BloqueAcuerdosModal contrato={contrato} />
                                ) : (
                                    <div className='rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900'>
                                        <div className='whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-zinc-300'>
                                            {seccionModal.contenido_renderizado || (
                                                <em className='text-zinc-400'>Sin contenido</em>
                                            )}
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <div className='flex w-full items-center justify-end gap-2'>
                        <Button onClick={handleCerrarModal}>
                            Cerrar
                        </Button>
                        {seccionModal && puedeEditarSeccion(seccionModal) && (
                            <Button
                                variant='solid'
                                color='blue'
                                icon='HeroCheck'
                                onClick={handleGuardar}>
                                Guardar cambios
                            </Button>
                        )}
                    </div>
                </ModalFooter>
            </Modal>
        </Card>
    );
};

export default TabDocumento;
