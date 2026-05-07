import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { TIPO_CONTRATO } from '@/constants/contrato.constant';
import {
    useDeletePlantillaMutation,
    useGetPlantillasContratoQuery,
} from '@/store/slices/contratos/plantillaContratoApi';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalCrearPlantilla from './components/ModalCrearPlantilla';

const ListaPlantillas = () => {
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);

    const { data: plantillas, isLoading, error } = useGetPlantillasContratoQuery();
    const [deletePlantilla] = useDeletePlantillaMutation();

    const getTipoLabel = (tipo: string) =>
        TIPO_CONTRATO.find((item) => item.value === tipo)?.label || tipo;

    const activas = plantillas?.filter((item) => item.activa).length || 0;
    const inactivas = (plantillas?.length || 0) - activas;
    const seccionesTotales =
        plantillas?.reduce((total, item) => total + (item.secciones?.length || 0), 0) || 0;

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <div>
                        <h1 className='text-xl font-bold'>Plantillas de contrato</h1>
                    </div>
                </SubheaderLeft>
                <SubheaderRight>
                    <Button variant='solid' icon='HeroPlus' onClick={() => setModalOpen(true)}>
                        Nueva plantilla
                    </Button>
                </SubheaderRight>
            </Subheader>
            <Container className='flex flex-col gap-4'>
                <Card className='border-blue-200/80 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/20'>
                    <CardBody className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                        <div className='max-w-2xl'>
                            <h2 className='mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                                Biblioteca base para tus contratos
                            </h2>
                            <p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
                                Define los bloques reutilizables de texto que se insertarán al
                                generar un contrato. Cada plantilla puede tener múltiples secciones
                                ordenadas y personalizadas con etiquetas dinámicas.
                            </p>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                            <Badge variant='outline' color='blue'>
                                {plantillas?.length || 0} plantillas
                            </Badge>
                            <Badge variant='outline' color='emerald'>
                                {activas} activas
                            </Badge>
                            <Badge variant='outline' color='zinc'>
                                {inactivas} inactivas
                            </Badge>
                            <Badge variant='outline' color='amber'>
                                {seccionesTotales} secciones totales
                            </Badge>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <div>
                                    <div className='text-lg font-semibold'>Gestión de plantillas</div>
                                </div>
                            </CardHeaderChild>
                        </CardHeader>
                    <CardBody>
                        {error && (
                            <Alert color='red' icon='HeroExclamationTriangle' className='mb-4'>
                                No se pudieron cargar las plantillas. Intenta recargar la página.
                            </Alert>
                        )}
                        {isLoading ? (
                            <p className='py-8 text-center text-zinc-500'>
                                Cargando plantillas...
                            </p>
                        ) : !plantillas?.length ? (
                            <div className='flex flex-col items-center gap-4 py-10 text-center'>
                                <div className='max-w-md'>
                                    <p className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                                        Aún no hay plantillas creadas.
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
                            <div className='flex flex-col gap-4'>
                                <div className='overflow-x-auto'>
                                    <Table>
                                        <THead>
                                            <Tr>
                                                <Th>Plantilla</Th>
                                                <Th>Tipo contrato</Th>
                                                <Th>Acciones</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {plantillas.map((plantilla) => (
                                                <Tr key={plantilla.id}>
                                                    <Td>
                                                        <div className='flex flex-col gap-1'>
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
                                                            <span className='text-xs text-zinc-500'>
                                                                {plantilla.descripcion ||
                                                                    'Sin descripción.'}
                                                            </span>
                                                            <div className='mt-1 flex flex-wrap gap-1'>
                                                                {plantilla.es_default && (
                                                                    <Badge
                                                                        variant='outline'
                                                                        color='blue'
                                                                        className='text-[10px]'>
                                                                        Sistema
                                                                    </Badge>
                                                                )}
                                                                <Badge
                                                                    variant='outline'
                                                                    color='zinc'
                                                                    className='text-[10px]'>
                                                                    v{plantilla.version}
                                                                </Badge>
                                                                <Badge
                                                                    color={
                                                                        plantilla.activa
                                                                            ? 'emerald'
                                                                            : 'zinc'
                                                                    }
                                                                    className='text-[10px]'>
                                                                    {plantilla.activa
                                                                        ? 'Activa'
                                                                        : 'Inactiva'}
                                                                </Badge>
                                                                <Badge
                                                                    variant='outline'
                                                                    color='amber'
                                                                    className='text-[10px]'>
                                                                    {plantilla.secciones
                                                                        ?.length || 0}{' '}
                                                                    secciones
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </Td>
                                                    <Td>
                                                        <Badge color='blue' variant='outline'>
                                                            {plantilla.tipo_contrato_label ||
                                                                getTipoLabel(
                                                                    plantilla.tipo_contrato,
                                                                )}
                                                        </Badge>
                                                    </Td>
                                                    <Td>
                                                        <div className='flex flex-wrap items-center gap-2'>
                                                            <Button
                                                                variant='solid'
                                                                size='sm'
                                                                icon='HeroArrowTopRightOnSquare'
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/registros/plantillas-contrato/${plantilla.id}`,
                                                                    )
                                                                }>
                                                                Gestionar
                                                            </Button>
                                                            {!plantilla.es_default && (
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
                                </div>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </Container>

            <ModalCrearPlantilla isOpen={modalOpen} setIsOpen={setModalOpen} />
        </PageWrapper>
    );
};

export default ListaPlantillas;
