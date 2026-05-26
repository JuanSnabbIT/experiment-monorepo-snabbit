import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, {
    SubheaderLeft,
    SubheaderRight,
} from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import {
    useGenerarPdfContratoTrabajadorMutation,
    useGetContratoTrabajadorDetalleQuery,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import CicloVidaContratoLaboral from './components/trabajador/CicloVidaContratoLaboral';
import TabDatosLaboralesTrabajador from './components/trabajador/TabDatosLaboralesTrabajador';
import TabDocumentoTrabajador from './components/trabajador/TabDocumentoTrabajador';
import TabHistorialTrabajador from './components/trabajador/TabHistorialTrabajador';
import TabRemuneracionesTrabajador from './components/trabajador/TabRemuneracionesTrabajador';

type TTabId = 'datos' | 'remuneraciones' | 'documento' | 'historial';

const TABS: { id: TTabId; label: string }[] = [
    { id: 'datos', label: 'Datos Laborales' },
    { id: 'remuneraciones', label: 'Remuneraciones' },
    { id: 'documento', label: 'Documento' },
    { id: 'historial', label: 'Historial' },
];

const BADGE_COLOR: Record<string, 'amber' | 'blue' | 'emerald' | 'red' | 'zinc'> = {
    borrador: 'zinc',
    pendiente_aceptacion: 'amber',
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

    const [generarPdf, { isLoading: generandoPdf }] = useGenerarPdfContratoTrabajadorMutation();

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

    const nombreTrabajador = contrato.nombre_trabajador ?? `Trabajador #${contrato.usuario_empresa}`;
    const iniciales = nombreTrabajador
        .split(' ')
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('');

    const handleGenerarPdf = async () => {
        try {
            await generarPdf(contrato.id).unwrap();
            toast.success('PDF generado correctamente.');
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

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
                <SubheaderRight>
                    <Button
                        icon='HeroDocumentArrowDown'
                        isDisable={generandoPdf}
                        onClick={handleGenerarPdf}>
                        {generandoPdf ? 'Generando...' : 'Generar PDF'}
                    </Button>
                </SubheaderRight>
            </Subheader>

            {/* Hero card — trabajador */}
            <Container className='pb-0 pt-2'>
                <Card>
                    <CardBody className='py-3'>
                        <div className='flex flex-wrap items-center gap-4'>
                            <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xl font-bold text-white'>
                                {iniciales || '?'}
                            </div>
                            <div className='min-w-0 flex-1'>
                                <p className='truncate text-base font-semibold text-zinc-800 dark:text-zinc-100'>
                                    {nombreTrabajador}
                                </p>
                                {contrato.email_trabajador && (
                                    <p className='truncate text-sm text-zinc-500 dark:text-zinc-400'>
                                        {contrato.email_trabajador}
                                    </p>
                                )}
                            </div>
                            <div className='flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400'>
                                <Badge variant='outline' color='zinc'>
                                    {contrato.tipo_contrato_label ?? contrato.tipo_contrato}
                                </Badge>
                                {contrato.fecha_inicio && (
                                    <span>Inicio: {contrato.fecha_inicio}</span>
                                )}
                                {contrato.fecha_termino && (
                                    <span>Termino: {contrato.fecha_termino}</span>
                                )}
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </Container>

            {/* Ciclo de vida */}
            <Container className='pb-0 pt-2'>
                <Card>
                    <CardBody className='py-3'>
                        <CicloVidaContratoLaboral estado={contrato.estado} />
                    </CardBody>
                </Card>
            </Container>

            {/* Tabs */}
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
            </Container>
        </PageWrapper>
    );
};

export default DetalleContratoTrabajador;
