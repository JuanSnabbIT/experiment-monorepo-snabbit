import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Button from '@/components/ui/Button';
import { useState } from 'react';
import TabPlanes from './components/TabPlanes';
import TabServicios from './components/TabServicios';

type TTab = 'servicios' | 'planes';

const TABS: { key: TTab; label: string; icon: string }[] = [
    { key: 'servicios', label: 'Servicios', icon: 'HeroWrenchScrewdriver' },
    { key: 'planes', label: 'Planes', icon: 'HeroBriefcase' },
];

const PlanesYServicios = () => {
    const [activeTab, setActiveTab] = useState<TTab>('servicios');
    const [showInfo, setShowInfo] = useState(false);

    return (
        <PageWrapper
            isProtectedRoute
            name='Planes y Servicios'
            title='Planes y Servicios'>
            <Subheader>
                <SubheaderLeft>
                    {TABS.map((tab) => (
                        <Button
                            key={tab.key}
                            icon={tab.icon}
                            variant={activeTab === tab.key ? 'solid' : 'outline'}
                            onClick={() => setActiveTab(tab.key)}>
                            {tab.label}
                        </Button>
                    ))}
                </SubheaderLeft>
                <SubheaderRight>
                    <Button
                        icon='HeroInformationCircle'
                        variant={showInfo ? 'solid' : 'outline'}
                        color='blue'
                        onClick={() => setShowInfo((v) => !v)}>
                        ¿Cómo funciona?
                    </Button>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                {showInfo && (
                    <div className='mb-4 flex flex-wrap gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400'>
                        <div className='flex items-start gap-2'>
                            <span className='mt-0.5 text-base'>1️⃣</span>
                            <div>
                                <span className='font-semibold text-zinc-800 dark:text-zinc-200'>Características</span>
                                <span className='ml-1'>— Atributos reutilizables que definen qué incluye o no un servicio. Ej: <em>Soporte remoto</em>, <em>Backup diario</em>, <em>SLA 4h</em>.</span>
                            </div>
                        </div>
                        <div className='hidden text-zinc-300 dark:text-zinc-600 sm:flex sm:items-center'>→</div>
                        <div className='flex items-start gap-2'>
                            <span className='mt-0.5 text-base'>2️⃣</span>
                            <div>
                                <span className='font-semibold text-zinc-800 dark:text-zinc-200'>Servicios</span>
                                <span className='ml-1'>— Unidades de trabajo que ofreces. Ej: <em>Helpdesk</em>, <em>Mantención Preventiva</em>, <em>Backup en Nube</em>.</span>
                            </div>
                        </div>
                        <div className='hidden text-zinc-300 dark:text-zinc-600 sm:flex sm:items-center'>→</div>
                        <div className='flex items-start gap-2'>
                            <span className='mt-0.5 text-base'>3️⃣</span>
                            <div>
                                <span className='font-semibold text-zinc-800 dark:text-zinc-200'>Planes</span>
                                <span className='ml-1'>— Paquetes comerciales que agrupan servicios. Ej: <em>Plan Básico TI</em>, <em>Plan Enterprise 24/7</em>.</span>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'servicios' && <TabServicios />}
                {activeTab === 'planes' && <TabPlanes />}
            </Container>
        </PageWrapper>
    );
};

export default PlanesYServicios;
