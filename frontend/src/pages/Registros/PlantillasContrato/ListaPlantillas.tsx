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
                <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <div>
                                    <div className='text-lg font-semibold'>Gestión de plantillas</div>
                                </div>
                            </CardHeaderChild>
                        </CardHeader>
                    <CardBody>
                        {!!error && (
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
                                <div className='overflow-auto'>
                                    <Table className='min-w-[800px]'>
                                        <THead>
                                            <Tr>
                                                <Th>Título</Th>
                                                <Th>Tipo contrato</Th>
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
                                                                    `/registros/plantillas-contrato/${plantilla.id}`,
                                                                )
                                                            }>
                                                            {plantilla.titulo}
                                                        </Button>
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
                                                            {plantilla.secciones?.length || 0}
                                                        </Badge>
                                                    </Td>
                                                    <Td>
                                                        <div className='flex justify-center gap-2'>
                                                            <Button
                                                                color='violet'
                                                                variant='solid'
                                                                size='sm'
                                                                icon='HeroEye'
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
