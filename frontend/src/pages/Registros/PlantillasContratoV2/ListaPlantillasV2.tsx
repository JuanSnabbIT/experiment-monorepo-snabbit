import Input from '@/components/form/Input';
import Select from '@/components/form/Select';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { TIPO_CONTRATO } from '@/constants/contrato.constant';
import {
    useDeletePlantillaV2Mutation,
    useGetPlantillasV2Query,
} from '@/store/slices/contratos/plantillaContratoV2Api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalCrearPlantillaV2 from './components/ModalCrearPlantillaV2';

const getTipoLabel = (tipo: string) =>
    TIPO_CONTRATO.find((item) => item.value === tipo)?.label || tipo;

const ListaPlantillasV2 = () => {
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);
    const [filtroTipo, setFiltroTipo] = useState('');
    const [busqueda, setBusqueda] = useState('');

    const {
        data: plantillasRaw,
        isLoading,
        error,
    } = useGetPlantillasV2Query(filtroTipo ? { tipo_contrato: filtroTipo } : undefined);

    const plantillas = (plantillasRaw ?? []).filter((p) =>
        p.titulo.toLowerCase().includes(busqueda.toLowerCase()),
    );
    const [deletePlantilla] = useDeletePlantillaV2Mutation();

    const handleGestionar = (id: number) => {
        navigate(`/registros/plantillas-contrato-v2/${id}`);
    };

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <div className='flex items-center gap-3'>
                        <div className='flex flex-col gap-0.5'>
                            <h1 className='text-xl font-bold'>Plantillas de contrato</h1>
                            <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                                Gestiona las plantillas base para generar contratos
                            </p>
                        </div>
                        <Select
                            name='filtroTipo'
                            className='w-44'
                            value={filtroTipo}
                            onChange={(e) => setFiltroTipo(e.target.value)}>
                            <option value=''>Todos los tipos</option>
                            {TIPO_CONTRATO.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </Select>
                        <Input
                            name='busqueda'
                            className='w-52'
                            placeholder='Buscar por título...'
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </SubheaderLeft>
                <SubheaderRight>
                    <Button variant='solid' icon='HeroPlus' onClick={() => setModalOpen(true)}>
                        Nueva plantilla
                    </Button>
                </SubheaderRight>
            </Subheader>

            <Container className='flex flex-col gap-4'>
                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <div className='flex items-center gap-2'>
                                <span className='text-lg font-semibold'>
                                    Gestion de plantillas
                                </span>
                                {!!plantillas?.length && (
                                    <Badge color='zinc' variant='outline'>
                                        {plantillas.length}{' '}
                                        {plantillas.length === 1 ? 'plantilla' : 'plantillas'}
                                    </Badge>
                                )}
                            </div>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        {!!error && (
                            <Alert color='red' icon='HeroExclamationTriangle' className='mb-4'>
                                No se pudieron cargar las plantillas. Intenta recargar la pagina.
                            </Alert>
                        )}

                        {isLoading ? (
                            <p className='py-8 text-center text-zinc-500'>
                                Cargando plantillas...
                            </p>
                        ) : !plantillas?.length ? (
                            <div className='flex flex-col items-center gap-4 py-12 text-center'>
                                <p className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                                    Aun no hay plantillas creadas.
                                </p>
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
                                            <Th>Scope</Th>
                                            <Th>Versión</Th>
                                            <Th>Estado</Th>
                                            <Th>Secciones</Th>
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
                                                                `/registros/plantillas-contrato-v2/${plantilla.id}`,
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
                                                <Td>
                                                    {plantilla.empresa_cliente === null ? (
                                                        <Badge color='emerald' variant='outline'>
                                                            Global
                                                        </Badge>
                                                    ) : (
                                                        <Badge color='sky' variant='outline'>
                                                            {plantilla.empresa_cliente_nombre}
                                                        </Badge>
                                                    )}
                                                </Td>
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
                                                    <Badge variant='outline' color='amber'>
                                                        {plantilla.total_secciones ?? 0}
                                                    </Badge>
                                                </Td>
                                                <Td>
                                                    <div className='flex justify-center gap-2'>
                                                        <Tooltip text='Editar'>
                                                            <Button
                                                                size='sm'
                                                                color='blue'
                                                                variant='solid'
                                                                icon='HeroPencilSquare'
                                                                onClick={() => handleGestionar(plantilla.id)}
                                                            />
                                                        </Tooltip>
                                                        <ConfirmarEliminar
                                                            peticionUrl={`/api/v2/plantillas-contrato-v2/${plantilla.id}/`}
                                                            nombre={plantilla.titulo}
                                                            onDispatch={() =>
                                                                deletePlantilla(plantilla.id)
                                                            }
                                                            buttonSize='sm'
                                                        />
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
                onCreated={(id) => navigate(`/registros/plantillas-contrato-v2/${id}`)}
            />
        </PageWrapper>
    );
};

export default ListaPlantillasV2;
