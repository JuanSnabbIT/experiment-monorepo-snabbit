import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Modal, { ModalBody, ModalHeader } from '@/components/ui/Modal';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TabPlanes from './PlanesYServicios/components/TabPlanes';
import TabServicios from './PlanesYServicios/components/TabServicios';

type TTab = 'servicios' | 'planes';

const TABS: { key: TTab; label: string; icon: string }[] = [
    { key: 'servicios', label: 'Servicios', icon: 'HeroWrenchScrewdriver' },
    { key: 'planes', label: 'Planes', icon: 'HeroBriefcase' },
];

const PlanesYServicios = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryTab = new URLSearchParams(location.search).get('tab');
    const [activeTab, setActiveTab] = useState<TTab>(
        queryTab === 'planes' ? 'planes' : 'servicios',
    );
    const [infoModalOpen, setInfoModalOpen] = useState(false);

    const INFO_CONTENT: Record<TTab, { titulo: string; pasos: { titulo: string; descripcion: string }[] }> = {
        servicios: {
            titulo: 'Como funciona Servicios',
            pasos: [
                {
                    titulo: 'Caracteristicas',
                    descripcion:
                        'Atributos reutilizables que definen que incluye o no un servicio. Por ejemplo: soporte remoto, backup diario, SLA 4h. Se crean una vez y se asignan a multiples servicios.',
                },
                {
                    titulo: 'Servicios',
                    descripcion:
                        'Unidades de trabajo que ofreces a tus clientes. Por ejemplo: Helpdesk, mantencion preventiva, backup en nube. Cada servicio puede tener un precio base, moneda y alcance definido mediante caracteristicas.',
                },
                {
                    titulo: 'Alcance (Incluye / No incluye)',
                    descripcion:
                        'Para cada servicio puedes definir que caracteristicas estan incluidas y cuales no. Esto se refleja automaticamente en contratos y cotizaciones.',
                },
            ],
        },
        planes: {
            titulo: 'Como funciona Planes',
            pasos: [
                {
                    titulo: 'Que es un Plan',
                    descripcion:
                        'Un plan es un paquete comercial que agrupa uno o mas servicios bajo un precio unico. Por ejemplo: Plan Basico TI, Plan Enterprise 24/7, Pack Startup.',
                },
                {
                    titulo: 'Precio y moneda',
                    descripcion:
                        'Cada plan tiene un precio mensual (y opcionalmente anual) en CLP, UF o USD. El sistema sugiere un precio base sumando los precios de los servicios incluidos.',
                },
                {
                    titulo: 'Visitas presenciales',
                    descripcion:
                        'Puedes definir cuantas visitas tecnicas mensuales incluye el plan. Este dato se usa al generar contratos y programar visitas de soporte.',
                },
                {
                    titulo: 'Alcance heredado',
                    descripcion:
                        'El plan hereda automaticamente el alcance de todos sus servicios. Puedes ver que caracteristicas incluye y cuales no desde el detalle del plan.',
                },
            ],
        },
    };

    const infoActiva = INFO_CONTENT[activeTab];

    return (
        <PageWrapper isProtectedRoute name='Planes y Servicios' title='Planes y Servicios'>
            <Subheader>
                <SubheaderLeft>
                    {TABS.map((tab) => (
                        <Button
                            key={tab.key}
                            icon={tab.icon}
                            variant={activeTab === tab.key ? 'solid' : 'outline'}
                            onClick={() => {
                                setActiveTab(tab.key);
                                navigate(`/registros/planes-y-servicios?tab=${tab.key}`, {
                                    replace: true,
                                });
                            }}>
                            {tab.label}
                        </Button>
                    ))}
                </SubheaderLeft>
                <SubheaderRight>
                    <Button
                        icon='HeroInformationCircle'
                        variant='outline'
                        color='blue'
                        onClick={() => setInfoModalOpen(true)}>
                        Como funciona?
                    </Button>
                </SubheaderRight>
            </Subheader>

            <Modal isOpen={infoModalOpen} setIsOpen={setInfoModalOpen}>
                <ModalHeader>{infoActiva.titulo}</ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-5'>
                        {infoActiva.pasos.map((paso, index) => (
                            <div key={paso.titulo} className='flex gap-4'>
                                <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-sm font-semibold text-blue-500'>
                                    {index + 1}
                                </div>
                                <div className='flex flex-col gap-1'>
                                    <span className='font-semibold text-zinc-800 dark:text-zinc-200'>
                                        {paso.titulo}
                                    </span>
                                    <span className='text-sm text-zinc-500 dark:text-zinc-400'>
                                        {paso.descripcion}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ModalBody>
            </Modal>

            <Container className='h-full w-full'>
                <Card>
                    <CardBody>
                        {activeTab === 'servicios' && <TabServicios />}
                        {activeTab === 'planes' && <TabPlanes />}
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    );
};

export default PlanesYServicios;