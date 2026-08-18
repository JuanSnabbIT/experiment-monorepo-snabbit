import Input from '@/components/form/Input';
import Select from '@/components/form/Select';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { TIPO_CONTRATO } from '@/constants/contrato.constant';
import { useAppSelector } from '@/store';
import {
    useDeletePlantillaV2Mutation,
    useGetPlantillasV2Query,
} from '@/store/slices/contratos/plantillaContratoV2Api';
import { useGetMisClientesQuery } from '@/store/slices/empresa/empresaApi';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalCrearPlantillaV2 from './components/ModalCrearPlantillaV2';
import ModalVistaPreviaPlantillaV2 from './components/ModalVistaPreviaPlantillaV2';

type TScopeTab = 'todas' | 'comercial' | 'laboral';

const TIPO_CONTRATO_COMERCIAL = TIPO_CONTRATO.filter((t) => t.value !== 'trabajador');

const getTipoLabel = (tipo: string) =>
    TIPO_CONTRATO.find((item) => item.value === tipo)?.label || tipo;

const ListaPlantillasV2 = () => {
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);
    const [previewId, setPreviewId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<TScopeTab>('todas');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [filtroCliente, setFiltroCliente] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const { listaGrupos, personalizacionUsuario } = useAppSelector((state) => state.auth);
    const esSuperadmin = !!listaGrupos?.grupos?.includes('superadmin');

    const { data: plantillasRaw, isLoading, error } = useGetPlantillasV2Query();
    const empresaId = personalizacionUsuario?.empresa ?? undefined;
    const { data: misClientes = [] } = useGetMisClientesQuery(empresaId, { skip: !empresaId });

    const handleTabChange = (tab: TScopeTab) => {
        setActiveTab(tab);
        setFiltroTipo('');
        setFiltroCliente('');
    };

    const plantillasEnTab = (plantillasRaw ?? []).filter((p) => {
        if (activeTab === 'laboral') return p.tipo_contrato === 'trabajador';
        if (activeTab === 'comercial') return p.tipo_contrato !== 'trabajador';
        return true;
    });

    const plantillas = plantillasEnTab
        .filter((p) => !filtroTipo || p.tipo_contrato === filtroTipo)
        .filter(
            (p) =>
                activeTab !== 'laboral' ||
                !filtroCliente ||
                (filtroCliente === 'global'
                    ? p.empresa_cliente === null
                    : p.empresa_cliente === Number(filtroCliente)),
        )
        .filter((p) => p.titulo.toLowerCase().includes(busqueda.toLowerCase()));

    const totalGlobales = plantillasEnTab.filter((p) => p.empresa_cliente === null).length;
    const totalClienteEspecificas = plantillasEnTab.length - totalGlobales;
    const totalContratosEmitidos = plantillasEnTab.reduce(
        (sum, p) => sum + p.total_contratos_emitidos,
        0,
    );

    const totalTodas = (plantillasRaw ?? []).length;
    const totalComercial = (plantillasRaw ?? []).filter((p) => p.tipo_contrato !== 'trabajador').length;
    const totalLaboral = (plantillasRaw ?? []).filter((p) => p.tipo_contrato === 'trabajador').length;

    const [deletePlantilla] = useDeletePlantillaV2Mutation();

    const handleGestionar = (id: number) => {
        navigate(`/registros/plantillas-contrato/${id}`);
    };

    return (
        <PageWrapper>
            <Subheader className='flex-col items-stretch gap-4 md:flex-row md:items-center'>
                <SubheaderLeft className='flex-col items-start gap-1 md:gap-1'>
                    <div className='flex items-center gap-2.5'>
                        <h1 className='text-xl font-bold text-zinc-900 dark:text-zinc-50'>
                            Plantillas de contrato
                        </h1>
                        <Badge
                            variant='outline'
                            color='blue'
                            rounded='rounded-full'
                            className='gap-1 py-0.5 text-xs font-semibold'>
                            <Icon icon='HeroCpuChip' className='text-sm' />
                            {plantillas?.length ?? 0}{' '}
                            {(plantillas?.length ?? 0) === 1 ? 'registrada' : 'registradas'}
                        </Badge>
                    </div>
                    <p className='max-w-2xl text-sm text-zinc-500 dark:text-zinc-400'>
                        Gestiona, diseña y versiona las plantillas base automatizadas para la
                        emisión ágil de contratos comerciales y laborales.
                    </p>
                </SubheaderLeft>
                <SubheaderRight>
                    <Button variant='solid' icon='HeroPlus' onClick={() => setModalOpen(true)}>
                        Nueva plantilla
                    </Button>
                </SubheaderRight>
            </Subheader>

            <Container className='flex flex-col gap-4'>
                <div
                    className={
                        activeTab === 'laboral'
                            ? 'grid grid-cols-2 gap-3 md:grid-cols-4'
                            : 'grid grid-cols-2 gap-3'
                    }>
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10'>
                                <Icon icon='HeroDocumentText' className='text-xl text-blue-500' />
                            </div>
                            <div>
                                <p className='text-xs text-zinc-500 dark:text-zinc-400'>Total plantillas</p>
                                <p className='text-2xl font-bold text-zinc-900 dark:text-zinc-100'>
                                    {plantillasEnTab.length}
                                </p>
                            </div>
                        </CardBody>
                    </Card>
                    {activeTab === 'laboral' && (
                        <>
                            <Card>
                                <CardBody className='flex items-center gap-3 py-3'>
                                    <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10'>
                                        <Icon icon='HeroGlobeAlt' className='text-xl text-emerald-500' />
                                    </div>
                                    <div>
                                        <p className='text-xs text-zinc-500 dark:text-zinc-400'>Globales</p>
                                        <p className='text-2xl font-bold text-zinc-900 dark:text-zinc-100'>
                                            {totalGlobales}
                                        </p>
                                    </div>
                                </CardBody>
                            </Card>
                            <Card>
                                <CardBody className='flex items-center gap-3 py-3'>
                                    <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10'>
                                        <Icon icon='HeroBuildingOffice2' className='text-xl text-sky-500' />
                                    </div>
                                    <div>
                                        <p className='text-xs text-zinc-500 dark:text-zinc-400'>Cliente-específicas</p>
                                        <p className='text-2xl font-bold text-zinc-900 dark:text-zinc-100'>
                                            {totalClienteEspecificas}
                                        </p>
                                    </div>
                                </CardBody>
                            </Card>
                        </>
                    )}
                    <Card>
                        <CardBody className='flex items-center gap-3 py-3'>
                            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10'>
                                <Icon icon='HeroArrowTrendingUp' className='text-xl text-violet-500' />
                            </div>
                            <div>
                                <p className='text-xs text-zinc-500 dark:text-zinc-400'>Contratos emitidos</p>
                                <p className='text-2xl font-bold text-zinc-900 dark:text-zinc-100'>
                                    {totalContratosEmitidos}
                                </p>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                <Card>
                    <div className='flex flex-wrap items-center gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800'>
                        <div className='flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800'>
                            <button
                                type='button'
                                onClick={() => handleTabChange('todas')}
                                className={
                                    activeTab === 'todas'
                                        ? 'flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900'
                                        : 'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
                                }>
                                Todas
                                <span className='rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] dark:bg-black/20'>
                                    {totalTodas}
                                </span>
                            </button>
                            <button
                                type='button'
                                onClick={() => handleTabChange('comercial')}
                                className={
                                    activeTab === 'comercial'
                                        ? 'flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900'
                                        : 'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
                                }>
                                <span className='h-1.5 w-1.5 rounded-full bg-blue-500' />
                                Comercial
                                <span className='text-zinc-400 dark:text-zinc-500'>{totalComercial}</span>
                            </button>
                            <button
                                type='button'
                                onClick={() => handleTabChange('laboral')}
                                className={
                                    activeTab === 'laboral'
                                        ? 'flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900'
                                        : 'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
                                }>
                                <span className='h-1.5 w-1.5 rounded-full bg-violet-500' />
                                Laboral
                                <span className='text-zinc-400 dark:text-zinc-500'>{totalLaboral}</span>
                            </button>
                        </div>
                        <Input
                            name='busqueda'
                            rounded='rounded-full'
                            className='w-52'
                            placeholder='Buscar por título...'
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        {activeTab !== 'laboral' && (
                            <Select
                                name='filtroTipo'
                                rounded='rounded-full'
                                className='w-44'
                                value={filtroTipo}
                                onChange={(e) => setFiltroTipo(e.target.value)}>
                                <option value=''>Todos los tipos</option>
                                {(activeTab === 'comercial' ? TIPO_CONTRATO_COMERCIAL : TIPO_CONTRATO).map(
                                    (t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ),
                                )}
                            </Select>
                        )}
                        {activeTab === 'laboral' && (
                            <Select
                                name='filtroCliente'
                                rounded='rounded-full'
                                className='w-52'
                                value={filtroCliente}
                                onChange={(e) => setFiltroCliente(e.target.value)}>
                                <option value=''>Todos los clientes</option>
                                <option value='global'>Global</option>
                                {misClientes.map((rel) => (
                                    <option key={rel.cliente} value={String(rel.cliente)}>
                                        {rel.info_cliente.nombre}
                                    </option>
                                ))}
                            </Select>
                        )}
                    </div>
                    <CardBody>
                        {!!error && (
                            <Alert color='red' icon='HeroExclamationTriangle' className='mb-4'>
                                No se pudieron cargar las plantillas. Intenta recargar la pagina.
                            </Alert>
                        )}

                        {isLoading ? (
                            <div className='flex min-h-[220px] flex-col items-center justify-center gap-3 text-center'>
                                <Icon icon='HeroArrowPath' className='animate-spin text-3xl text-zinc-400' />
                                <div>
                                    <p className='font-medium text-zinc-700 dark:text-zinc-300'>
                                        Cargando plantillas
                                    </p>
                                    <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                                        Estamos preparando el catálogo.
                                    </p>
                                </div>
                            </div>
                        ) : !plantillas?.length ? (
                            <div className='flex min-h-[220px] flex-col items-center justify-center gap-4 text-center'>
                                <Icon icon='HeroCpuChip' className='text-3xl text-zinc-300 dark:text-zinc-600' />
                                <div>
                                    <p className='font-medium text-zinc-700 dark:text-zinc-300'>
                                        Aún no hay plantillas creadas
                                    </p>
                                    <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                                        Crea la primera plantilla para comenzar.
                                    </p>
                                </div>
                                <Button
                                    variant='solid'
                                    icon='HeroPlus'
                                    onClick={() => setModalOpen(true)}>
                                    Crear primera plantilla
                                </Button>
                            </div>
                        ) : (
                            <div className='overflow-auto'>
                                <Table className='min-w-[900px]'>
                                    <THead>
                                        <Tr>
                                            <Th>Título</Th>
                                            <Th>Tipo contrato</Th>
                                            {activeTab !== 'comercial' && <Th>Scope</Th>}
                                            <Th>Versión</Th>
                                            <Th>Estado</Th>
                                            <Th>Acciones</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {plantillas.map((plantilla) => (
                                            <Tr key={plantilla.id}>
                                                <Td>
                                                    <Button
                                                        size='xs'
                                                        variant='default'
                                                        className='!px-0 text-left font-semibold text-blue-600 hover:underline dark:text-blue-300'
                                                        onClick={() =>
                                                            navigate(
                                                                `/registros/plantillas-contrato/${plantilla.id}`,
                                                            )
                                                        }>
                                                        {plantilla.titulo}
                                                    </Button>
                                                </Td>
                                                <Td>
                                                    <Badge color='blue' variant='outline'>
                                                        {getTipoLabel(plantilla.tipo_contrato)}
                                                    </Badge>
                                                </Td>
                                                {activeTab !== 'comercial' && (
                                                    <Td>
                                                        {plantilla.tipo_contrato !== 'trabajador' ? (
                                                            <span className='text-zinc-400 dark:text-zinc-600'>
                                                                —
                                                            </span>
                                                        ) : plantilla.empresa_cliente === null ? (
                                                            <Badge color='emerald' variant='outline'>
                                                                Global
                                                            </Badge>
                                                        ) : (
                                                            <Badge color='sky' variant='outline'>
                                                                {plantilla.empresa_cliente_nombre}
                                                            </Badge>
                                                        )}
                                                    </Td>
                                                )}
                                                <Td>
                                                    <Badge variant='outline' color='zinc'>
                                                        v{plantilla.version}
                                                    </Badge>
                                                </Td>
                                                <Td>
                                                    <Badge
                                                        variant={plantilla.activa ? 'solid' : 'outline'}
                                                        color={plantilla.activa ? 'emerald' : 'zinc'}>
                                                        {plantilla.activa ? 'Activa' : 'Inactiva'}
                                                    </Badge>
                                                </Td>
                                                <Td>
                                                    <div className='flex justify-center gap-2'>
                                                        <Tooltip text='Vista previa'>
                                                            <Button
                                                                size='sm'
                                                                color='zinc'
                                                                variant='solid'
                                                                icon='HeroEye'
                                                                onClick={() => setPreviewId(plantilla.id)}
                                                            />
                                                        </Tooltip>
                                                        <Tooltip text='Editar'>
                                                            <Button
                                                                size='sm'
                                                                color='blue'
                                                                variant='solid'
                                                                icon='HeroPencilSquare'
                                                                onClick={() => handleGestionar(plantilla.id)}
                                                            />
                                                        </Tooltip>
                                                        {plantilla.empresa_prestadora === null &&
                                                        !esSuperadmin ? (
                                                            <Tooltip text='Plantilla global del sistema — solo un superadministrador puede eliminarla'>
                                                                <Button
                                                                    size='sm'
                                                                    color='red'
                                                                    variant='solid'
                                                                    icon='HeroTrash'
                                                                    isDisable
                                                                />
                                                            </Tooltip>
                                                        ) : (
                                                            <ConfirmarEliminar
                                                                peticionUrl={`/api/plantillas-contrato/${plantilla.id}/`}
                                                                nombre={plantilla.titulo}
                                                                onDispatch={() =>
                                                                    deletePlantilla(plantilla.id)
                                                                }
                                                                buttonSize='sm'
                                                            />
                                                        )}
                                                    </div>
                                                </Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                                <p className='mt-3 text-right text-xs text-zinc-500'>
                                    Mostrando {plantillas.length}{' '}
                                    {plantillas.length === 1 ? 'plantilla' : 'plantillas'}
                                </p>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </Container>

            <ModalCrearPlantillaV2
                isOpen={modalOpen}
                setIsOpen={setModalOpen}
                onCreated={(id) => navigate(`/registros/plantillas-contrato/${id}`)}
            />

            <ModalVistaPreviaPlantillaV2
                plantillaId={previewId}
                onClose={() => setPreviewId(null)}
            />
        </PageWrapper>
    );
};

export default ListaPlantillasV2;
