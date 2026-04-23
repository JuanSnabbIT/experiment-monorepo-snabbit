import Breadcrumb from '@/components/layouts/Breadcrumb/Breadcrumb';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import {
    useGetDetalleContratoLicenciaQuery,
    useGetDetalleContratoQuery,
    useGetHistorialContratoLicenciaQuery,
    useGetUsuariosVinculadosLicenciaQuery,
} from '@/store/slices/contratos/contratoApi';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ItemsTablaDeUsuariosVinculadosLicencias from '../Clientes/components/ItemsTablaDeUsuariosVinculadosLicencias';
import CrearUsuarioVinculadoLicencia from '../Clientes/modals/CrearUsuarioVinculadoLicencia';
import MarqueeEstadoLicencia from './components/MarqueeEstadoLicencia';
import { colorEstadoContrato } from './components/contrato.helpers';
import ModalCambiarEstadoLicencia from './modals/ModalCambiarEstadoLicencia';
import ModalEditarCuposLicencia from './modals/ModalEditarCuposLicencia';

const DetalleLicencia = () => {
    const navigate = useNavigate();
    const { clienteId, contratoId, licenciaId } = useParams<{
        clienteId: string;
        contratoId: string;
        licenciaId: string;
    }>();
    const [searchParams] = useSearchParams();

    const [modalEstadoOpen, setModalEstadoOpen] = useState(false);
    const [modalEditarOpen, setModalEditarOpen] = useState(false);
    const [mostrarHistorial, setMostrarHistorial] = useState(false);
    const clientTab = searchParams.get('tab') || 'contratos';

    const {
        data: licencia,
        isLoading: loadingLicencia,
        isError: errorLicencia,
    } = useGetDetalleContratoLicenciaQuery(licenciaId ?? '', { skip: !licenciaId });

    const { data: usuarios = [], isLoading: loadingUsuarios, isError: errorUsuarios } =
        useGetUsuariosVinculadosLicenciaQuery(licenciaId ?? '', { skip: !licenciaId });

    const { data: historial = [], isLoading: loadingHistorial, isError: errorHistorial } =
        useGetHistorialContratoLicenciaQuery(licenciaId ?? '', { skip: !licenciaId });

    const { data: contratoPadre } = useGetDetalleContratoQuery(contratoId ?? '', {
        skip: !contratoId,
    });

    const handleBack = () => {
        if (clienteId && contratoId) {
            navigate(`/empresa/detalle-cliente/${clienteId}/contrato/${contratoId}?tab=${clientTab}`);
            return;
        }
        navigate(-1);
    };

    if (loadingLicencia) {
        return (
            <PageWrapper isProtectedRoute name='Detalle Licencia' title='Detalle Licencia'>
                <Container className='h-full w-full'>
                    <div className='flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400'>
                        Cargando licencia...
                    </div>
                </Container>
            </PageWrapper>
        );
    }

    if (errorLicencia) {
        return (
            <PageWrapper isProtectedRoute name='Detalle Licencia' title='Detalle Licencia'>
                <Container className='h-full w-full'>
                    <Alert color='red' variant='outline'>
                        No se pudo cargar la licencia. Verifica tu conexión e intenta nuevamente.
                    </Alert>
                </Container>
            </PageWrapper>
        );
    }

    if (!licencia) {
        return (
            <PageWrapper isProtectedRoute name='Detalle Licencia' title='Detalle Licencia'>
                <Container className='h-full w-full'>
                    <div className='flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400'>
                        Licencia no encontrada.
                    </div>
                </Container>
            </PageWrapper>
        );
    }

    return (
        <>
            <PageWrapper isProtectedRoute name='Detalle Licencia' title='Detalle Licencia'>
                <Subheader>
                    <SubheaderLeft>
                        <div className='flex flex-wrap items-center gap-3'>
                            <Button icon='HeroArrowLeft' onClick={handleBack}>
                                Volver al contrato
                            </Button>
                            <div>
                                <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                                    Licencias
                                </div>
                                <div className='flex flex-wrap items-center gap-2'>
                                    <h1 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                                        {licencia.nombre_licencia}
                                    </h1>
                                    <Badge color={licencia.color_estado}>{licencia.estado_label}</Badge>
                                    {contratoPadre && (
                                        <Badge
                                            variant='outline'
                                            color={colorEstadoContrato(contratoPadre.estado)}>
                                            Contrato: {contratoPadre.estado_label}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </SubheaderLeft>
                    <SubheaderRight className='w-full md:w-auto'>
                        <div className='flex w-full flex-col gap-2 md:w-auto md:flex-row'>
                            <Button
                                variant='outline'
                                icon='HeroPencilSquare'
                                isDisable={!licencia.se_puede_aumentar && !licencia.se_puede_reducir}
                                onClick={() => setModalEditarOpen(true)}>
                                Editar cupos
                            </Button>
                            <Button icon='HeroArrowPath' variant='solid' onClick={() => setModalEstadoOpen(true)}>
                                Cambiar estado
                            </Button>
                        </div>
                    </SubheaderRight>
                </Subheader>

                <Container className='h-full w-full'>
                    <div className='grid grid-cols-1 gap-4'>
                        <Breadcrumb
                            path={`Clientes / ${licencia.nombre_contrato}`}
                            currentPage={licencia.nombre_licencia}
                        />

                        <MarqueeEstadoLicencia licencia={licencia} />

                        <div className='grid grid-cols-1 gap-4 xl:grid-cols-12'>
                            <div className='xl:col-span-4'>
                                <Card className='h-full border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'>
                                    <CardHeader>
                                        <CardHeaderChild>
                                            <div>
                                                <div className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                    Información de la licencia
                                                </div>
                                                <div className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                    Resumen principal con el mismo bloque visual que detalle de cotización.
                                                </div>
                                            </div>
                                        </CardHeaderChild>
                                    </CardHeader>
                                    <CardBody>
                                        <div className='grid gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/40'>
                                            <div>
                                                <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Proveedor</div>
                                                <div className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>{licencia.proveedor_licencia || '—'}</div>
                                            </div>
                                            <div>
                                                <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Modalidad</div>
                                                <div className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>
                                                    {licencia.tipo_modalidad === 'otros'
                                                        ? licencia.otro_tipo
                                                        : licencia.tipo_modalidad_label}
                                                </div>
                                            </div>
                                            <div>
                                                <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Moneda</div>
                                                <div className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>{licencia.tipo_moneda_label}</div>
                                            </div>
                                            <div>
                                                <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Precio unitario</div>
                                                <div className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>{licencia.precio_unitario}</div>
                                            </div>
                                            <div>
                                                <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Cupos usados / total</div>
                                                <div className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>
                                                    {licencia.cantidad - licencia.licencias_disponibles} / {licencia.cantidad}
                                                </div>
                                            </div>
                                            <div>
                                                <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Vigencia</div>
                                                <div className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>
                                                    {licencia.fecha_inicio ? dayjs(licencia.fecha_inicio).format('DD/MM/YYYY') : '—'}
                                                    {' - '}
                                                    {licencia.fecha_fin ? dayjs(licencia.fecha_fin).format('DD/MM/YYYY') : '—'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Contrato</div>
                                                <div className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>{licencia.nombre_contrato}</div>
                                            </div>
                                            {licencia.dias_restantes_licencia <= 30 && licencia.dias_restantes_licencia > 0 && (
                                                <div>
                                                    <Badge color='amber'>Vence en {licencia.dias_restantes_licencia} días</Badge>
                                                </div>
                                            )}
                                        </div>
                                    </CardBody>
                                </Card>
                            </div>

                            <div className='xl:col-span-8'>
                                <div className='grid grid-cols-1 gap-4'>
                                    <Card className='border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'>
                                        <CardHeader>
                                            <CardHeaderChild>
                                                <div>
                                                    <div className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                        Usuarios vinculados
                                                    </div>
                                                    <div className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                        Administración de asignaciones y revisión rápida del estado actual.
                                                    </div>
                                                </div>
                                            </CardHeaderChild>
                                            <CardHeaderChild>
                                                <CrearUsuarioVinculadoLicencia
                                                    licenciaIdFijo={licenciaId}
                                                    clienteId={licencia?.empresa_cliente?.toString()}
                                                />
                                            </CardHeaderChild>
                                        </CardHeader>
                                        <CardBody className='z-0 overflow-auto p-0'>
                                            {loadingUsuarios ? (
                                                <div className='flex h-40 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400'>
                                                    Cargando usuarios vinculados...
                                                </div>
                                            ) : errorUsuarios ? (
                                                <Alert color='red' className='m-4' variant='outline'>
                                                    No se pudo cargar los usuarios vinculados.
                                                </Alert>
                                            ) : usuarios.length === 0 ? (
                                                <div className='flex h-40 items-center justify-center px-6 text-center text-sm text-zinc-500 dark:text-zinc-400'>
                                                    Sin usuarios vinculados.
                                                </div>
                                            ) : (
                                                <Table className='min-w-[720px] table-fixed'>
                                                    <THead>
                                                        <Tr>
                                                            <Th className='font-semibold text-zinc-900 dark:text-zinc-100'>Usuario / Nombre</Th>
                                                            <Th className='font-semibold text-zinc-900 dark:text-zinc-100'>Fecha asignación</Th>
                                                            <Th className='font-semibold text-zinc-900 dark:text-zinc-100'>Acciones</Th>
                                                        </Tr>
                                                    </THead>
                                                    <TBody>
                                                        {usuarios.map((u) => (
                                                            <ItemsTablaDeUsuariosVinculadosLicencias key={u.id} user={u} />
                                                        ))}
                                                    </TBody>
                                                </Table>
                                            )}
                                        </CardBody>
                                    </Card>

                                    <Card className='border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'>
                                        <CardHeader>
                                            <CardHeaderChild>
                                                <div>
                                                    <div className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                        Historial de cambios
                                                    </div>
                                                    <div className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                        Trazabilidad visual consistente con bloques secundarios de cotizaciones.
                                                    </div>
                                                </div>
                                            </CardHeaderChild>
                                            <CardHeaderChild>
                                                <Button
                                                    variant='outline'
                                                    size='sm'
                                                    icon={mostrarHistorial ? 'HeroChevronUp' : 'HeroChevronDown'}
                                                    onClick={() => setMostrarHistorial((prev) => !prev)}>
                                                    {mostrarHistorial ? 'Ocultar historial' : 'Ver historial'}
                                                </Button>
                                            </CardHeaderChild>
                                        </CardHeader>
                                        {mostrarHistorial && (
                                            <CardBody className='z-0 overflow-auto p-0'>
                                                {loadingHistorial ? (
                                                    <div className='flex h-40 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400'>
                                                        Cargando historial...
                                                    </div>
                                                ) : errorHistorial ? (
                                                    <Alert color='red' className='m-4' variant='outline'>
                                                        No se pudo cargar el historial de cambios.
                                                    </Alert>
                                                ) : historial.length === 0 ? (
                                                    <div className='flex h-40 items-center justify-center px-6 text-center text-sm text-zinc-500 dark:text-zinc-400'>
                                                        Sin historial.
                                                    </div>
                                                ) : (
                                                    <Table className='min-w-[720px] table-fixed'>
                                                        <THead>
                                                            <Tr>
                                                                <Th className='font-semibold text-zinc-900 dark:text-zinc-100'>Fecha</Th>
                                                                <Th className='font-semibold text-zinc-900 dark:text-zinc-100'>Tipo</Th>
                                                                <Th className='font-semibold text-zinc-900 dark:text-zinc-100'>Origen</Th>
                                                                <Th className='font-semibold text-zinc-900 dark:text-zinc-100'>Detalle</Th>
                                                                <Th className='font-semibold text-zinc-900 dark:text-zinc-100'>Estado</Th>
                                                            </Tr>
                                                        </THead>
                                                        <TBody>
                                                            {historial.map((h) => (
                                                                <Tr key={h.id}>
                                                                    <Td className='border-b border-zinc-100 dark:border-zinc-800/50'>
                                                                        {dayjs(h.fecha).format('DD/MM/YYYY HH:mm')}
                                                                    </Td>
                                                                    <Td className='border-b border-zinc-100 dark:border-zinc-800/50'>{h.tipo}</Td>
                                                                    <Td className='border-b border-zinc-100 dark:border-zinc-800/50'>
                                                                        {h.origen === 'vinculo_usuario' ? 'Vinculación' : 'Licencia'}
                                                                    </Td>
                                                                    <Td className='border-b border-zinc-100 dark:border-zinc-800/50'>{h.detalle || h.cambios || '—'}</Td>
                                                                    <Td className='border-b border-zinc-100 dark:border-zinc-800/50'>{h.estado ?? '—'}</Td>
                                                                </Tr>
                                                            ))}
                                                        </TBody>
                                                    </Table>
                                                )}
                                            </CardBody>
                                        )}
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </div>
                </Container>
            </PageWrapper>

            <ModalEditarCuposLicencia
                isOpen={modalEditarOpen}
                onClose={() => setModalEditarOpen(false)}
                licencia={licencia}
            />

            <ModalCambiarEstadoLicencia
                isOpen={modalEstadoOpen}
                onClose={() => setModalEstadoOpen(false)}
                licenciaId={licencia.id}
                estadoActual={licencia.estado}
                estadoActualLabel={licencia.estado_label}
                colorEstado={licencia.color_estado}
                sePuedeCancelar={licencia.se_puede_cancelar}
            />
        </>
    );
};

export default DetalleLicencia;
