import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Dropdown, {
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
} from '@/components/ui/Dropdown';
import { TIPO_CONTRATO, TIPOS_SECCION } from '@/constants/contrato.constant';
import { ISeccionPlantilla } from '@/interface/plantillaContrato.interface';
import { useAppDispatch } from '@/store';
import plantillaContratoApi, {
    useDuplicarPlantillaMutation,
    useGetDetallePlantillaQuery,
    useGetEtiquetasPlantillaQuery,
    useReordenarSeccionesPlantillaMutation,
} from '@/store/slices/contratos/plantillaContratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ModalCrearSeccionPlantilla from './components/ModalCrearSeccionPlantilla';
import ModalEditarPlantilla from './components/ModalEditarPlantilla';
import ModalEditarSeccionPlantilla from './components/ModalEditarSeccionPlantilla';
import PreviewDocumentalPlantilla from './components/PreviewDocumentalPlantilla';

const getTipoContratoLabel = (tipo: string) =>
    TIPO_CONTRATO.find((item) => item.value === tipo)?.label || tipo;

const getTipoSeccionLabel = (tipo: string) =>
    TIPOS_SECCION.find((item) => item.value === tipo)?.label || tipo;

// ─── Section card (static, no drag) ───
interface ISeccionCardProps {
    seccion: ISeccionPlantilla;
    plantillaId: string;
    onEdit: (seccion: ISeccionPlantilla) => void;
    onDeleted: () => void;
    onPreviewSection: (seccion: ISeccionPlantilla) => void;
}

const TIPOS_PREDETERMINADOS = new Set(['firmas', 'identificacion_cliente']);

const SeccionCard = ({ seccion, plantillaId, onEdit, onDeleted, onPreviewSection }: ISeccionCardProps) => {
    const esPredeterminada = TIPOS_PREDETERMINADOS.has(seccion.tipo);
    return (
    <div className={`rounded-xl border p-4 transition-all ${
        esPredeterminada
            ? 'border-blue-300 bg-blue-50/40 dark:border-blue-700 dark:bg-blue-950/20'
            : 'border-zinc-200 hover:border-blue-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900'
    }`}>
        <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
                <div className='flex flex-wrap gap-2'>
                    <Badge color='blue'>Bloque {seccion.orden}</Badge>
                    <Badge color='zinc' variant='outline'>{getTipoSeccionLabel(seccion.tipo)}</Badge>
                    {esPredeterminada && (
                        <Badge color='sky' variant='outline'>Predeterminada</Badge>
                    )}
                </div>
                <div className='mt-2 font-semibold text-zinc-900 dark:text-zinc-100'>{seccion.titulo}</div>
                <div className='mt-2 flex flex-wrap gap-2 text-xs text-zinc-500'>
                    <span>{seccion.es_editable_en_contrato ? 'Editable en contrato' : 'Bloque fijo'}</span>
                    <span>{seccion.es_obligatoria ? 'Obligatoria' : 'Opcional'}</span>
                </div>
            </div>
            <div className='flex shrink-0 gap-2'>
                <Button
                    size='sm'
                    icon='HeroEye'
                    onClick={() => onPreviewSection(seccion)}
                />
                <Button
                    size='sm'
                    icon='HeroPencil'
                    onClick={() => onEdit(seccion)}
                />
                <ConfirmarEliminar
                    peticionUrl={`/api/plantillas-contrato/${plantillaId}/secciones/${seccion.id}/`}
                    onDispatch={onDeleted}
                    nombre={seccion.titulo}
                    buttonSize='sm'
                />
            </div>
        </div>
    </div>
    );
};

const DetallePlantilla = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { plantillaId } = useParams<{ plantillaId: string }>();
    const id = plantillaId!;

    const [editingSeccion, setEditingSeccion] = useState<ISeccionPlantilla | null>(null);
    const [editSeccionModalOpen, setEditSeccionModalOpen] = useState(false);
    const [createSectionModalOpen, setCreateSectionModalOpen] = useState(false);
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewMode, setPreviewMode] = useState<'general' | 'focus-section' | 'reorder'>('general');
    const [focusSectionId, setFocusSectionId] = useState<number | undefined>(undefined);

    const { data: plantilla, isLoading, error } = useGetDetallePlantillaQuery(id);
    const { data: etiquetas = [] } = useGetEtiquetasPlantillaQuery();
    const [duplicarPlantilla] = useDuplicarPlantillaMutation();
    const [reordenarSecciones, { isLoading: isReordering }] = useReordenarSeccionesPlantillaMutation();

    const handlePreview = () => {
        setPreviewMode('general');
        setFocusSectionId(undefined);
        setPreviewOpen(true);
    };

    const handlePreviewSection = (seccion: ISeccionPlantilla) => {
        setPreviewMode('focus-section');
        setFocusSectionId(seccion.id);
        setPreviewOpen(true);
    };

    useEffect(() => {
        if (!previewOpen) {
            setPreviewMode('general');
        }
    }, [previewOpen]);

    const handleDuplicar = async () => {
        try {
            const nueva = await duplicarPlantilla(id).unwrap();
            toast.success('Plantilla duplicada');
            navigate(`/registros/plantillas-contrato/${nueva.id}`);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleOpenEditSeccion = (seccion: ISeccionPlantilla) => {
        setEditingSeccion(seccion);
        setEditSeccionModalOpen(true);
    };

    const handleSeccionDeleted = () => {
        dispatch(
            plantillaContratoApi.util.invalidateTags([
                { type: 'PlantillasContrato', id },
                'PlantillasContrato',
            ]),
        );
    };

    if (isLoading) {
        return (
            <PageWrapper>
                <Container>
                    <p className='py-10 text-center text-zinc-500'>Cargando plantilla...</p>
                </Container>
            </PageWrapper>
        );
    }

    if (error) {
        return (
            <PageWrapper>
                <Container>
                    <Alert color='red' icon='HeroExclamationTriangle' className='mt-6'>
                        No se pudo cargar la plantilla. Intenta recargar la página.
                    </Alert>
                </Container>
            </PageWrapper>
        );
    }

    if (!plantilla) {
        return (
            <PageWrapper>
                <Container>
                    <p className='py-10 text-center text-zinc-500'>Plantilla no encontrada</p>
                </Container>
            </PageWrapper>
        );
    }

    const secciones = [...(plantilla.secciones || [])].sort((a, b) => a.orden - b.orden);

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <Button onClick={() => navigate('/registros/plantillas-contrato')} icon='HeroArrowLeft'>
                        Volver
                    </Button>
                    <div>
                        <h1 className='text-xl font-bold'>{plantilla.titulo}</h1>
                    </div>
                </SubheaderLeft>
                <SubheaderRight>
                    {plantilla.es_default && (
                        <Badge color='blue' variant='outline'>
                            Sistema
                        </Badge>
                    )}
                    <Badge color={plantilla.activa ? 'emerald' : 'zinc'}>
                        {plantilla.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                </SubheaderRight>
            </Subheader>
            <Container className='flex flex-col gap-4'>
                {plantilla.es_default && (
                    <Alert color='blue' icon='HeroInformationCircle' variant='outline'>
                        Esta es una plantilla del sistema. Puedes editar sus secciones y configuración
                        directamente. Si necesitas una variante para otro flujo, usa{' '}
                        <strong>Duplicar</strong> para crear una versión alternativa.
                        También puedes usar etiquetas como{' '}
                        <code className='rounded bg-blue-100 px-1 text-xs dark:bg-blue-900'>[nombre_proveedor]</code>{' '}
                        para insertar datos reales del contrato.
                    </Alert>
                )}
                <div className='sticky top-0 z-10 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95'>
                    <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
                        <div className='max-w-2xl'>
                            <div className='mt-2 flex flex-wrap gap-2'>
                                <Badge variant='outline' color='blue'>{getTipoContratoLabel(plantilla.tipo_contrato)}</Badge>
                                <Badge variant='outline' color='amber'>Versión {plantilla.version}</Badge>
                                <Badge variant='outline' color='zinc'>{secciones.length} secciones</Badge>
                            </div>
                        </div>
                        <div className='flex flex-wrap items-center gap-2'>
                            <Dropdown>
                                <DropdownToggle>
                                    <Button icon='HeroEllipsisVertical'>
                                        Más acciones
                                    </Button>
                                </DropdownToggle>
                                <DropdownMenu placement='bottom-end'>
                                    <DropdownItem
                                        icon='HeroCog6Tooth'
                                        onClick={() => setConfigModalOpen(true)}>
                                        Configuración
                                    </DropdownItem>
                                    <DropdownItem
                                        icon='HeroEye'
                                        onClick={handlePreview}>
                                        Vista previa
                                    </DropdownItem>
                                    <DropdownItem
                                        icon='HeroDocumentDuplicate'
                                        onClick={handleDuplicar}>
                                        Duplicar plantilla
                                    </DropdownItem>
                                </DropdownMenu>
                            </Dropdown>
                            <Button
                                variant='solid'
                                icon='HeroPlus'
                                onClick={() => setCreateSectionModalOpen(true)}>
                                Nueva sección
                            </Button>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <div>
                                <div className='text-lg font-semibold'>Estructura del documento</div>
                            </div>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        {secciones.length === 0 ? (
                            <div className='rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700'>
                                Aun no hay secciones. Presiona &quot;Nueva seccion&quot; para agregar la primera.
                            </div>
                        ) : (
                            <div className='flex flex-col gap-3'>
                                {secciones.map((seccion) => (
                                    <SeccionCard
                                        key={seccion.id}
                                        seccion={seccion}
                                        plantillaId={id}
                                        onEdit={handleOpenEditSeccion}
                                        onDeleted={handleSeccionDeleted}
                                        onPreviewSection={handlePreviewSection}
                                    />
                                ))}
                            </div>
                        )}
                    </CardBody>
                </Card>
            </Container>
            <ModalCrearSeccionPlantilla
                isOpen={createSectionModalOpen}
                setIsOpen={setCreateSectionModalOpen}
                plantillaId={id}
                etiquetas={etiquetas}
                nextOrder={(plantilla.secciones?.length || 0) + 1}
                onCreated={() => setCreateSectionModalOpen(false)}
            />
            <ModalEditarSeccionPlantilla
                isOpen={editSeccionModalOpen}
                setIsOpen={setEditSeccionModalOpen}
                plantillaId={id}
                seccion={editingSeccion}
                etiquetas={etiquetas}
            />
            <ModalEditarPlantilla
                isOpen={configModalOpen}
                setIsOpen={setConfigModalOpen}
                plantilla={plantilla}
            />
            <PreviewDocumentalPlantilla
                isOpen={previewOpen}
                setIsOpen={setPreviewOpen}
                plantilla={plantilla}
                etiquetas={etiquetas}
                mode={previewMode}
                focusSectionId={focusSectionId}
                onModeChange={setPreviewMode}
                onReorder={async ({ secciones, bloques }) => {
                    try {
                        await reordenarSecciones({
                            plantillaId: id,
                            secciones,
                            bloques,
                        }).unwrap();
                        toast.success('Orden actualizado');
                        setPreviewOpen(false);
                    } catch (error: unknown) {
                        toast.error(getErrorMessage(error));
                    }
                }}
                isReordering={isReordering}
            />
        </PageWrapper>
    );
};

export default DetallePlantilla;
