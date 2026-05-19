import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, {
  SubheaderLeft,
  SubheaderRight,
} from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import { useGetContratoTrabajadorDetalleQuery } from '@/store/slices/rrhh/contratoTrabajadorApi';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TabDatosLaboralesTrabajador from './components/trabajador/TabDatosLaboralesTrabajador';
import TabDocumentoTrabajador from './components/trabajador/TabDocumentoTrabajador';
import TabFirmaTrabajador from './components/trabajador/TabFirmaTrabajador';
import TabHistorialTrabajador from './components/trabajador/TabHistorialTrabajador';
import TabRemuneracionesTrabajador from './components/trabajador/TabRemuneracionesTrabajador';

type TTabId = 'datos' | 'remuneraciones' | 'documento' | 'historial' | 'firma';

const TABS: { id: TTabId; label: string }[] = [
    { id: 'datos', label: 'Datos Laborales' },
    { id: 'remuneraciones', label: 'Remuneraciones' },
    { id: 'documento', label: 'Documento' },
    { id: 'historial', label: 'Historial' },
    { id: 'firma', label: 'Firma' },
];

const BADGE_COLOR: Record<string, 'amber' | 'blue' | 'emerald' | 'red' | 'zinc'> = {
    borrador: 'zinc',
    pendiente_aceptacion: 'amber',
    en_firma: 'blue',
    vigente: 'emerald',
    terminado: 'zinc',
    anulado: 'red',
};

const DetalleContratoTrabajador = () => {
    const navigate = useNavigate();
    const { contratoId } = useParams<{ contratoId: string }>();
    const [activeTab, setActiveTab] = useState<TTabId>('datos');

    const {
        data: contrato,
        isLoading,
        isError,
    } = useGetContratoTrabajadorDetalleQuery(contratoId!, { skip: !contratoId });

    if (!contratoId) {
        return (
            <PageWrapper>
                <Container>
                    <p>ID de contrato no valido.</p>
                </Container>
            </PageWrapper>
        );
    }

    if (isLoading) {
        return (
            <PageWrapper>
                <Container>
                    <div className='py-12 text-center text-gray-500'>Cargando contrato...</div>
                </Container>
            </PageWrapper>
        );
    }

    if (isError || !contrato) {
        return (
            <PageWrapper>
                <Container>
                    <Card>
                        <CardBody>
                            <p className='text-red-500'>No se pudo cargar el contrato.</p>
                            <Button className='mt-4' icon='HeroArrowSmallLeft' onClick={() => navigate(-1)}>
                                Volver
                            </Button>
                        </CardBody>
                    </Card>
                </Container>
            </PageWrapper>
        );
    }

    const badgeColor = BADGE_COLOR[contrato.estado] ?? 'zinc';

    return (
        <PageWrapper isProtectedRoute title={`Contrato Trabajador #${contrato.id}`}>
            <Subheader>
                <SubheaderLeft>
                    <Button icon='HeroArrowSmallLeft' onClick={() => navigate(-1)} />
                    <h4 className='font-bold'>
                        {contrato.cargo}{' '}
                        <span className='text-zinc-500'>#{contrato.id}</span>
                    </h4>
                    <Badge variant='solid' color={badgeColor}>
                        {contrato.estado_label ?? contrato.estado}
                    </Badge>
                </SubheaderLeft>
                <SubheaderRight>{null}</SubheaderRight>
            </Subheader>

            <Container className='pb-0'>
                <div className='flex gap-1 border-b border-gray-200 dark:border-zinc-700'>
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type='button'
                            onClick={() => setActiveTab(tab.id)}
                            className={[
                                'px-4 py-2 text-sm font-medium transition-colors',
                                activeTab === tab.id
                                    ? 'border-b-2 border-blue-500 text-blue-500'
                                    : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                            ].join(' ')}>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </Container>

            <Container>
                {activeTab === 'datos' && <TabDatosLaboralesTrabajador contrato={contrato} />}
                {activeTab === 'remuneraciones' && (
                    <TabRemuneracionesTrabajador contrato={contrato} />
                )}
                {activeTab === 'documento' && <TabDocumentoTrabajador contrato={contrato} />}
                {activeTab === 'historial' && <TabHistorialTrabajador contrato={contrato} />}
                {activeTab === 'firma' && (
                    <TabFirmaTrabajador contratoId={contrato.id} contrato={contrato} />
                )}
            </Container>
        </PageWrapper>
    );
};

export default DetalleContratoTrabajador;
