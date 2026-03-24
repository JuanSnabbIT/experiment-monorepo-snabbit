import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Textarea from '@/components/form/Textarea';
import { IContratoEmpresaCliente } from '@/interface/contrato.interface';
import { ISeccionContratoGenerada } from '@/interface/plantillaContrato.interface';
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

const TabDocumento = ({ contrato, puedeEditar }: ITabDocumentoProps) => {
    const navigate = useNavigate();
    const { data: secciones = [], isLoading } = useGetSeccionesGeneradasQuery(contrato.id);
    const { data: plantillaDetalle } = useGetDetallePlantillaQuery(contrato.plantilla ?? 0, {
        skip: !contrato.plantilla,
    });
    const [generarSecciones, { isLoading: isGenerando }] =
        useGenerarSeccionesContratoMutation();
    const [updateSeccion] = useUpdateSeccionGeneradaMutation();

    const [editando, setEditando] = useState<number | null>(null);
    const [contenidoEdit, setContenidoEdit] = useState('');

    const seccionesOrdenadas = [...secciones].sort((a, b) => a.orden - b.orden);
    const tieneEditadasManualmente = secciones.some((s) => s.fue_editado_manualmente);
    const estadoDocumento = tieneEditadasManualmente
        ? 'Editado manualmente'
        : secciones.length > 0
          ? 'Generado'
          : 'No generado';
    const colorEstadoDocumento = tieneEditadasManualmente
        ? 'amber'
        : secciones.length > 0
          ? 'emerald'
          : 'zinc';

    const handleGenerar = async () => {
        try {
            await generarSecciones(contrato.id).unwrap();
            toast.success(
                secciones.length > 0
                    ? 'Borrador actualizado correctamente'
                    : 'Borrador generado correctamente',
            );
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleRegenerar = async () => {
        // eslint-disable-next-line no-alert
        const confirmar = window.confirm(
            tieneEditadasManualmente
                ? 'Las secciones editadas manualmente se mantendran. Las demas se actualizaran con los datos vigentes del contrato. Deseas continuar?'
                : 'Se regenerara el borrador con los datos actuales del contrato. Deseas continuar?',
        );
        if (!confirmar) return;
        await handleGenerar();
    };

    const handleIniciarEdicion = (seccion: ISeccionContratoGenerada) => {
        setEditando(seccion.id);
        setContenidoEdit(seccion.contenido_renderizado);
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
            toast.success('Seccion actualizada');
            setEditando(null);
            setContenidoEdit('');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <div>
                        <div className='text-lg font-semibold'>Documento basado en plantilla</div>
                        <div className='text-sm text-zinc-500'>
                            La plantilla define la estructura inicial, pero el borrador se genera
                            cuando tu equipo lo solicita.
                        </div>
                    </div>
                </CardHeaderChild>
                <CardHeaderChild>
                    <Badge color={colorEstadoDocumento} variant='outline'>
                        {estadoDocumento}
                    </Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody>
                <div className='flex flex-col gap-4'>
                    <div className='rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-700 dark:bg-zinc-900/50'>
                        <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
                            <div className='max-w-2xl'>
                                <p className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                    {plantillaDetalle?.titulo ||
                                        `Plantilla #${contrato.plantilla}`}
                                </p>
                                <p className='mt-1 text-xs text-zinc-500'>
                                    {plantillaDetalle?.descripcion ||
                                        'Usa esta plantilla como base para generar y revisar el borrador del contrato.'}
                                </p>
                                <div className='mt-3 flex flex-wrap gap-2'>
                                    <Badge color='blue' variant='outline'>
                                        Plantilla asociada
                                    </Badge>
                                    <Badge color={colorEstadoDocumento} variant='outline'>
                                        {estadoDocumento}
                                    </Badge>
                                    <Badge
                                        color={secciones.length > 0 ? 'emerald' : 'zinc'}
                                        variant='outline'>
                                        {secciones.length > 0
                                            ? `${secciones.length} secciones generadas`
                                            : 'Sin borrador generado'}
                                    </Badge>
                                </div>
                            </div>
                            <div className='flex flex-wrap gap-2'>
                                {contrato.plantilla && (
                                    <Button
                                        size='sm'
                                        icon='HeroArrowTopRightOnSquare'
                                        onClick={() =>
                                            navigate(
                                                `/registros/plantillas-contrato/${contrato.plantilla}`,
                                            )
                                        }>
                                        Ver origen de plantilla
                                    </Button>
                                )}
                                {puedeEditar && secciones.length === 0 && (
                                    <Button
                                        variant='solid'
                                        size='sm'
                                        icon='HeroDocumentText'
                                        isLoading={isGenerando}
                                        onClick={handleGenerar}>
                                        Generar borrador
                                    </Button>
                                )}
                                {puedeEditar && secciones.length > 0 && (
                                    <Button
                                        size='sm'
                                        icon='HeroArrowPath'
                                        isLoading={isGenerando}
                                        onClick={handleRegenerar}>
                                        Regenerar borrador
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                        <div className='rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                            <div className='text-xs uppercase text-zinc-500'>
                                Plantilla asociada
                            </div>
                            <div className='mt-2 font-semibold text-zinc-900 dark:text-zinc-100'>
                                {plantillaDetalle?.titulo || `#${contrato.plantilla}`}
                            </div>
                        </div>
                        <div className='rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                            <div className='text-xs uppercase text-zinc-500'>
                                Borrador generado
                            </div>
                            <div className='mt-2 font-semibold text-zinc-900 dark:text-zinc-100'>
                                {secciones.length > 0 ? 'Si' : 'No'}
                            </div>
                        </div>
                        <div className='rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                            <div className='text-xs uppercase text-zinc-500'>
                                Ediciones manuales
                            </div>
                            <div className='mt-2 font-semibold text-zinc-900 dark:text-zinc-100'>
                                {tieneEditadasManualmente ? 'Si' : 'No'}
                            </div>
                        </div>
                    </div>

                    <Alert color='blue' icon='HeroInformationCircle' variant='outline'>
                        Asociar una plantilla no genera automaticamente el borrador. Ese paso se
                        activa desde aqui para que puedas validar el documento cuando el contrato ya
                        tenga sus datos listos.
                    </Alert>

                    {isLoading && (
                        <p className='py-8 text-center text-zinc-500'>Cargando documento...</p>
                    )}

                    {!isLoading && secciones.length === 0 && (
                        <div className='flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-10 text-center dark:border-zinc-700'>
                            <p className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                                El borrador aun no fue generado.
                            </p>
                            <p className='max-w-xl text-sm text-zinc-500'>
                                Cuando generes el borrador, el sistema tomara la estructura de la
                                plantilla y la completara con los datos actuales del contrato.
                            </p>
                            {puedeEditar && (
                                <Button
                                    variant='solid'
                                    icon='HeroDocumentText'
                                    isLoading={isGenerando}
                                    onClick={handleGenerar}>
                                    Generar borrador
                                </Button>
                            )}
                        </div>
                    )}

                    {!isLoading && secciones.length > 0 && (
                        <div className='flex flex-col gap-4'>
                            {tieneEditadasManualmente && (
                                <Alert
                                    color='amber'
                                    icon='HeroExclamationTriangle'
                                    variant='outline'>
                                    Hay secciones ajustadas manualmente. Al regenerar, esas
                                    secciones se mantienen y solo se actualizan las demas.
                                </Alert>
                            )}

                            {seccionesOrdenadas.map((seccion) => (
                                <div
                                    key={seccion.id}
                                    className='rounded-xl border border-zinc-200 p-4 dark:border-zinc-700'>
                                    <div className='mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                                        <div>
                                            <div className='flex flex-wrap items-center gap-2'>
                                                <span className='font-semibold'>
                                                    {seccion.orden}. {seccion.titulo}
                                                </span>
                                                {seccion.fue_editado_manualmente && (
                                                    <Badge
                                                        variant='outline'
                                                        color='amber'
                                                        className='text-xs'>
                                                        Editado manualmente
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        {puedeEditar && editando !== seccion.id && (
                                            <Button
                                                icon='HeroPencil'
                                                size='sm'
                                                onClick={() => handleIniciarEdicion(seccion)}>
                                                Editar bloque
                                            </Button>
                                        )}
                                    </div>

                                    {editando === seccion.id ? (
                                        <div className='flex flex-col gap-2'>
                                            <Textarea
                                                id={`seccion-edit-${seccion.id}`}
                                                name={`seccion-edit-${seccion.id}`}
                                                value={contenidoEdit}
                                                onChange={(e) => setContenidoEdit(e.target.value)}
                                                rows={8}
                                            />
                                            <div className='flex justify-end gap-2'>
                                                <Button size='sm' onClick={handleCancelarEdicion}>
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
                            ))}
                        </div>
                    )}
                </div>
            </CardBody>
        </Card>
    );
};

export default TabDocumento;
