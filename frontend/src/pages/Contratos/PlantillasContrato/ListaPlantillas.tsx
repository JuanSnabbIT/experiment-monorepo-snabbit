import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import ConfirmarEliminar from '@/components/modals/ConfirmarEliminar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { TIPO_CONTRATO } from '@/constants/contrato.constant';
import { useAppDispatch } from '@/store';
import plantillaContratoApi, {
    useGetPlantillasContratoQuery,
} from '@/store/slices/contratos/plantillaContratoApi';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalCrearPlantilla from './components/ModalCrearPlantilla';

const ListaPlantillas = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [modalOpen, setModalOpen] = useState(false);

    const { data: plantillas, isLoading } = useGetPlantillasContratoQuery();

    const getTipoLabel = (tipo: string) =>
        TIPO_CONTRATO.find((item) => item.value === tipo)?.label || tipo;

    const activas = plantillas?.filter((item) => item.activa).length || 0;
    const inactivas = (plantillas?.length || 0) - activas;
    const seccionesTotales =
        plantillas?.reduce((total, item) => total + (item.secciones?.length || 0), 0) || 0;

    const handlePlantillaDeleted = () => {
        dispatch(plantillaContratoApi.util.invalidateTags(['PlantillasContrato']));
    };

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
                                    <div className='text-lg font-semibold'>Gestion de plantillas</div>
                                </div>
                            </CardHeaderChild>
                        </CardHeader>
                    <CardBody>
                        {isLoading ? (
                            <p className='py-8 text-center text-zinc-500'>
                                Cargando plantillas...
                            </p>
                        ) : !plantillas?.length ? (
                            <div className='flex flex-col items-center gap-4 py-10 text-center'>
                                <div className='max-w-md'>
                                    <p className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                                        Aun no hay plantillas creadas.
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
                                                            <button
                                                                type='button'
                                                                className='text-left font-semibold text-blue-600 hover:underline dark:text-blue-300'
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/registros/plantillas-contrato/${plantilla.id}`,
                                                                    )
                                                                }>
                                                                {plantilla.titulo}
                                                            </button>
                                                            <span className='text-xs text-zinc-500'>
                                                                {plantilla.descripcion ||
                                                                    'Sin descripcion.'}
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
                                                                icon='HeroPencil'
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/registros/plantillas-contrato/${plantilla.id}`,
                                                                    )
                                                                }>
                                                                Editar
                                                            </Button>
                                                            {!plantilla.es_default && (
                                                                <ConfirmarEliminar
                                                                    peticionUrl={`/api/plantillas-contrato/${plantilla.id}/`}
                                                                    nombre={plantilla.titulo}
                                                                    onDispatch={
                                                                        handlePlantillaDeleted
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
