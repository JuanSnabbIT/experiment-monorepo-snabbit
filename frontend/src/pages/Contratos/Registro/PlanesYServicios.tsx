import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
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
            </Subheader>
            <Container className='h-full w-full'>
                {activeTab === 'servicios' && <TabServicios />}
                {activeTab === 'planes' && <TabPlanes />}
            </Container>
        </PageWrapper>
    );
};

export default PlanesYServicios;
