import Textarea from '@/components/form/Textarea';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { IContratoEmpresaCliente, IEmpresaContrato } from '@/interface/contrato.interface';
import { ISeccionContratoGenerada } from '@/interface/plantillaContrato.interface';
import {
    useGenerarSeccionesContratoMutation,
    useGetDetallePlantillaQuery,
    useGetSeccionesGeneradasQuery,
    useUpdateSeccionGeneradaMutation,
} from '@/store/slices/contratos/plantillaContratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import classNames from 'classnames';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const IdentificacionClienteCard = ({ cliente }: { cliente: IEmpresaContrato }) => {
    const rep = cliente?.representantes_legales?.[0] ?? null;
    const rows: { label: string; value: string }[] = [
        { label: 'Nombre o Raz\u00f3n Social', value: cliente?.nombre || '\u2014' },
        { label: 'R.U.T', value: cliente?.rut_empresa || '' },
        { label: 'Domicilio', value: cliente?.direccion_principal || '' },
        { label: 'Giro o actividad', value: '' },
        { label: 'Representante legal', value: rep?.nombre_usuario ?? '' },
        { label: 'R.U.T', value: rep?.papeleta?.rut ?? '' },
        { label: 'E-mail', value: rep?.email_usuario ?? '' },
    ];

    return (
        <div className='overflow-hidden rounded-md border border-gray-200 dark:border-zinc-700'>
            <div className='flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/60'>
                <Badge color='sky' variant='outline' className='text-xs'>
                    Secci&oacute;n predeterminada
                </Badge>
                <span className='text-sm font-semibold text-gray-800 dark:text-zinc-100'>
                    1.- Identificaci&oacute;n de &quot;EL CLIENTE&quot;
                </span>
            </div>
            <div>
                {rows.map((row, i) => (
                    <div
                        key={i}
                        className={`grid grid-cols-[200px,1fr] text-sm${
                            i > 0 ? ' border-t border-gray-200 dark:border-zinc-700' : ''
                        }`}>
                        <div className='border-r border-gray-200 px-3 py-2 font-medium text-gray-600 dark:border-zinc-700 dark:text-zinc-400'>
                            {row.label}
                        </div>
                        <div className='px-3 py-2 text-gray-900 dark:text-zinc-100'>
                            {row.value || (
                                <span className='italic text-gray-300 dark:text-zinc-600'>&mdash;</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface ITabDocumentoProps {
    contrato: IContratoEmpresaCliente;
    puedeEditar: boolean;
}

const TabDocumento = ({ contrato, puedeEditar }: ITabDocumentoProps) => {
    const navigate = useNavigate();
    const { data: secciones = [], isLoading } = useGetSeccionesGeneradasQuery(contrato.id);
    const { data: plantillaDetalle } = useGetDetallePlantillaQuery(contrato.plantilla ?? 0, {
        skip: !contrato.plantilla,
    });
    const [generarSecciones, { isLoading: isGenerando }] =
        useGenerarSeccionesContratoMutation();
    const [updateSeccion] = useUpdateSeccionGeneradaMutation();

    const [expandidas, setExpandidas] = useState<Set<number>>(new Set());
    const [editando, setEditando] = useState<number | null>(null);
    const [contenidoEdit, setContenidoEdit] = useState('');

    const seccionesOrdenadas = [...secciones].sort((a, b) => a.orden - b.orden);
    const tieneEditadasManualmente = secciones.some((s) => s.fue_editado_manualmente);

    const EXPAND_THRESHOLD = 5;
    const MAX_VISIBLE_SECCIONES_COMPACTAS = 3;
    const [compactMode, setCompactMode] = useState(false);

    useEffect(() => {
        if (seccionesOrdenadas.length > EXPAND_THRESHOLD) {
            setCompactMode(true);
        }
    }, [seccionesOrdenadas.length]);

    const seccionesVisibles =
        compactMode && seccionesOrdenadas.length > EXPAND_THRESHOLD
            ? seccionesOrdenadas.slice(0, MAX_VISIBLE_SECCIONES_COMPACTAS)
            : seccionesOrdenadas;
    const seccionesOcultas =
        compactMode && seccionesOrdenadas.length > EXPAND_THRESHOLD
            ? seccionesOrdenadas.length - MAX_VISIBLE_SECCIONES_COMPACTAS
            : 0;

    const toggleSeccion = (id: number) => {
        setExpandidas((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const expandirTodas = () => {
        setExpandidas(new Set(secciones.map((s) => s.id)));
    };

    const colapsarTodas = () => {
        setExpandidas(new Set());
        setEditando(null);
        setContenidoEdit('');
    };

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

    const handleIniciarEdicion = (seccion: ISeccionContratoGenerada) => {
        setEditando(seccion.id);
        setContenidoEdit(seccion.contenido_renderizado);
        setExpandidas((prev) => new Set(prev).add(seccion.id));
    };

    const handleCancelarEdicion = () => {
        setEditando(null);
        setContenidoEdit('');
    };

    const handleGuardarEdicion = async (seccionId: number) => {
        try {
            await updateSeccion({
                contratoId: contrato.id,
                seccionId,
                data: { contenido_renderizado: contenidoEdit },
            }).unwrap();
            toast.success('Sección actualizada');
            setEditando(null);
            setContenidoEdit('');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

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
                <div className='flex flex-col gap-4'>
                    {/* Acciones superiores */}
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                        <div className='flex gap-2'>
                            {secciones.length > 0 && (
                                <>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        color='blue'
                                        className='text-blue-500'
                                        onClick={expandirTodas}>
                                        Expandir todas
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        color='blue'
                                        className='text-blue-500'
                                        onClick={colapsarTodas}>
                                        Colapsar todas
                                    </Button>
                                </>
                            )}
                            {seccionesOrdenadas.length > EXPAND_THRESHOLD && (
                                <Button
                                    size='sm'
                                    variant='outline'
                                    color='blue'
                                    className='text-blue-500'
                                    onClick={() => setCompactMode((prev) => !prev)}>
                                    {compactMode ? 'Vista completa' : 'Vista compacta'}
                                </Button>
                            )}
                        </div>
                        <div className='flex gap-2'>
                            {contrato.plantilla && (
                                <Button
                                    size='sm'
                                    variant='outline'
                                    color='blue'
                                    className='text-blue-500'
                                    icon='HeroArrowTopRightOnSquare'
                                    onClick={() =>
                                        navigate(
                                            `/registros/plantillas-contrato/${contrato.plantilla}`,
                                        )
                                    }>
                                    Ver plantilla
                                </Button>
                            )}
                            {puedeEditar && secciones.length > 0 && (
                                <Button
                                    size='sm'
                                    variant='outline'
                                    color='blue'
                                    className='text-blue-500'
                                    icon='HeroArrowPath'
                                    isLoading={isGenerando}
                                    onClick={handleRegenerar}>
                                    Regenerar borrador
                                </Button>
                            )}
                        </div>
                    </div>

                    <IdentificacionClienteCard cliente={contrato.datos_cliente} />

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
                        <div className='flex flex-col gap-2'>
                            {compactMode && seccionesOcultas > 0 && (
                                <div className='rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50'>
                                    Mostrando {MAX_VISIBLE_SECCIONES_COMPACTAS} de {seccionesOrdenadas.length} secciones. {seccionesOcultas} secciones ocultas.
                                </div>
                            )}
                            <div className='flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-2'>
                                {seccionesVisibles.map((seccion) => {
                                    const estaExpandida = expandidas.has(seccion.id);
                                    const estaEditando = editando === seccion.id;

                                    return (
                                        <div
                                            key={seccion.id}
                                            className='rounded-lg border border-zinc-200 dark:border-zinc-700'>
                                            {/* Header colapsable */}
                                            <div className='flex w-full items-center justify-between gap-3 border-b border-transparent p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'>
                                                <button
                                                    type='button'
                                                    className='flex min-w-0 flex-1 items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-300'
                                                    aria-expanded={estaExpandida}
                                                    onClick={() => toggleSeccion(seccion.id)}>
                                                    <span
                                                        className={classNames(
                                                            'text-xs transition-transform',
                                                            estaExpandida && 'rotate-90',
                                                        )}>
                                                        ▶
                                                    </span>
                                                    <span className='text-sm font-semibold'>
                                                        {seccion.titulo}
                                                    </span>
                                                    {seccion.fue_editado_manualmente && (
                                                        <Badge
                                                            variant='outline'
                                                            color='amber'
                                                            className='text-xs'>
                                                            Editado
                                                        </Badge>
                                                    )}
                                                </button>
                                                {puedeEditar && !estaEditando && (
                                                    <Button
                                                        icon='HeroPencil'
                                                        size='sm'
                                                        onClick={() => handleIniciarEdicion(seccion)}>
                                                        Editar
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Contenido expandido */}
                                            {estaExpandida && (
                                                <div className='border-t border-zinc-200 p-4 dark:border-zinc-700'>
                                                    {estaEditando ? (
                                                        <div className='flex flex-col gap-2'>
                                                            <Textarea
                                                                id={`seccion-edit-${seccion.id}`}
                                                                name={`seccion-edit-${seccion.id}`}
                                                                value={contenidoEdit}
                                                                onChange={(e) =>
                                                                    setContenidoEdit(e.target.value)
                                                                }
                                                                rows={8}
                                                            />
                                                            <div className='flex justify-end gap-2'>
                                                                <Button
                                                                    size='sm'
                                                                    onClick={handleCancelarEdicion}>
                                                                    Cancelar
                                                                </Button>
                                                                <Button
                                                                    variant='solid'
                                                                    size='sm'
                                                                    onClick={() =>
                                                                        handleGuardarEdicion(seccion.id)
                                                                    }>
                                                                    Guardar cambios
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className='whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300'>
                                                            {seccion.contenido_renderizado}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {compactMode && seccionesOcultas > 0 && (
                                <div className='flex justify-end'>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        onClick={() => setCompactMode(false)}>
                                        Ver todas las secciones
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
};

export default TabDocumento;
