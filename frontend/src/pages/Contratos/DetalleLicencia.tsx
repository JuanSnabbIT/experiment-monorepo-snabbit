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
    useGetHistorialContratoLicenciaQuery,
    useGetUsuariosVinculadosLicenciaQuery,
} from '@/store/slices/contratos/contratoApi';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ItemsTablaDeUsuariosVinculadosLicencias from '../Clientes/components/ItemsTablaDeUsuariosVinculadosLicencias';
import CrearUsuarioVinculadoLicencia from '../Clientes/modals/CrearUsuarioVinculadoLicencia';
import ModalCambiarEstadoLicencia from './modals/ModalCambiarEstadoLicencia';

const DetalleLicencia = () => {
    const navigate = useNavigate();
    const { licenciaId } = useParams<{
        licenciaId: string;
    }>();

    const [modalEstadoOpen, setModalEstadoOpen] = useState(false);

    const {
        data: licencia,
        isLoading: loadingLicencia,
        isError: errorLicencia,
    } = useGetDetalleContratoLicenciaQuery(licenciaId ?? '', { skip: !licenciaId });

    const { data: usuarios = [], isLoading: loadingUsuarios, isError: errorUsuarios } =
        useGetUsuariosVinculadosLicenciaQuery(licenciaId ?? '', { skip: !licenciaId });

    const { data: historial = [], isLoading: loadingHistorial, isError: errorHistorial } =
        useGetHistorialContratoLicenciaQuery(licenciaId ?? '', { skip: !licenciaId });

    if (loadingLicencia) {
        return (
            <PageWrapper>
                <Container>
                    <p className='p-4 text-sm text-zinc-500'>Cargando licencia...</p>
                </Container>
            </PageWrapper>
        );
    }

    if (errorLicencia) {
        return (
            <PageWrapper>
                <Container>
                    <Alert color='red'>
                        No se pudo cargar la licencia. Verifique su conexión e intente nuevamente.
                    </Alert>
                </Container>
            </PageWrapper>
        );
    }

    if (!licencia) {
        return (
            <PageWrapper>
                <Container>
                    <p className='p-4 text-sm text-red-500'>Licencia no encontrada.</p>
                </Container>
            </PageWrapper>
        );
    }

    return (
        <>
            <PageWrapper>
                <Subheader>
                    <SubheaderLeft>
                        <Button
                            icon='HeroArrowLeft'
                            onClick={() => navigate(-1)}>
                            Volver
                        </Button>
                        <h1 className='text-xl font-bold'>{licencia.nombre_licencia}</h1>
                        <Badge color={licencia.color_estado}>{licencia.estado_label}</Badge>
                    </SubheaderLeft>
                    <SubheaderRight>
                        <Button icon='HeroArrowPath' onClick={() => setModalEstadoOpen(true)}>
                            Cambiar estado
                        </Button>
                    </SubheaderRight>
                </Subheader>

                <Container>
                    <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
                        {/* ── Información principal ── */}
                        <Card className='lg:col-span-1'>
                            <CardHeader>
                                <CardHeaderChild>
                                    <span className='font-semibold'>Información</span>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <dl className='space-y-3 text-sm'>
                                    <div>
                                        <dt className='text-zinc-500'>Proveedor</dt>
                                        <dd className='font-medium'>
                                            {licencia.proveedor_licencia || '—'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className='text-zinc-500'>Modalidad</dt>
                                        <dd className='font-medium'>
                                            {licencia.tipo_modalidad === 'otros'
                                                ? licencia.otro_tipo
                                                : licencia.tipo_modalidad_label}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className='text-zinc-500'>Moneda</dt>
                                        <dd className='font-medium'>
                                            {licencia.tipo_moneda_label}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className='text-zinc-500'>Precio unitario</dt>
                                        <dd className='font-medium'>{licencia.precio_unitario}</dd>
                                    </div>
                                    <div>
                                        <dt className='text-zinc-500'>Cupos (usados / total)</dt>
                                        <dd className='font-medium'>
                                            {licencia.cantidad - licencia.licencias_disponibles} /{' '}
                                            {licencia.cantidad}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className='text-zinc-500'>Vigencia</dt>
                                        <dd className='font-medium'>
                                            {licencia.fecha_inicio
                                                ? dayjs(licencia.fecha_inicio).format('DD/MM/YYYY')
                                                : '—'}{' '}
                                            →{' '}
                                            {licencia.fecha_fin
                                                ? dayjs(licencia.fecha_fin).format('DD/MM/YYYY')
                                                : '—'}
                                        </dd>
                                    </div>
                                    {licencia.dias_restantes_licencia <= 30 &&
                                        licencia.dias_restantes_licencia > 0 && (
                                            <div>
                                                <Badge color='amber'>
                                                    Vence en {licencia.dias_restantes_licencia} días
                                                </Badge>
                                            </div>
                                        )}
                                    <div>
                                        <dt className='text-zinc-500'>Contrato</dt>
                                        <dd className='font-medium'>{licencia.nombre_contrato}</dd>
                                    </div>
                                    {licencia.partner && (
                                        <Badge color='blue'>Partner</Badge>
                                    )}
                                </dl>
                            </CardBody>
                        </Card>

                        <div className='flex flex-col gap-4 lg:col-span-2'>
                            {/* ── Usuarios vinculados ── */}
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <span className='font-semibold'>Usuarios vinculados</span>
                                    </CardHeaderChild>
                                    <CardHeaderChild>
                                        <CrearUsuarioVinculadoLicencia
                                            licenciaIdFijo={licenciaId}
                                            clienteId={licencia?.empresa_cliente?.toString()}
                                        />
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody className='p-0'>
                                    {loadingUsuarios ? (
                                        <p className='p-4 text-sm text-zinc-500'>Cargando...</p>
                                    ) : errorUsuarios ? (
                                        <Alert color='red' className='m-4'>
                                            No se pudo cargar los usuarios vinculados.
                                        </Alert>
                                    ) : usuarios.length === 0 ? (
                                        <p className='p-4 text-sm text-zinc-500'>
                                            Sin usuarios vinculados
                                        </p>
                                    ) : (
                                        <Table>
                                            <THead>
                                                <Tr>
                                                    <Th>Usuario / Nombre</Th>
                                                    <Th>Fecha Asignación</Th>
                                                    <Th>Acciones</Th>
                                                </Tr>
                                            </THead>
                                            <TBody>
                                                {usuarios.map((u) => (
                                                    <ItemsTablaDeUsuariosVinculadosLicencias
                                                        key={u.id}
                                                        user={u}
                                                    />
                                                ))}
                                            </TBody>
                                        </Table>
                                    )}
                                </CardBody>
                            </Card>

                            {/* ── Historial ── */}
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <span className='font-semibold'>
                                            Historial de cambios
                                        </span>
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody className='p-0'>
                                    {loadingHistorial ? (
                                        <p className='p-4 text-sm text-zinc-500'>Cargando...</p>
                                    ) : errorHistorial ? (
                                        <Alert color='red' className='m-4'>
                                            No se pudo cargar el historial de cambios.
                                        </Alert>
                                    ) : historial.length === 0 ? (
                                        <p className='p-4 text-sm text-zinc-500'>
                                            Sin historial
                                        </p>
                                    ) : (
                                        <Table>
                                            <THead>
                                                <Tr>
                                                    <Th>Fecha</Th>
                                                    <Th>Tipo</Th>
                                                    <Th>Usuario</Th>
                                                    <Th>Cambios</Th>
                                                    <Th>Estado</Th>
                                                </Tr>
                                            </THead>
                                            <TBody>
                                                {historial.map((h) => (
                                                    <Tr key={h.id}>
                                                        <Td>
                                                            {dayjs(h.fecha).format(
                                                                'DD/MM/YYYY HH:mm',
                                                            )}
                                                        </Td>
                                                        <Td>{h.tipo}</Td>
                                                        <Td>{h.usuario ?? '—'}</Td>
                                                        <Td>{h.cambios}</Td>
                                                        <Td>{h.estado ?? '—'}</Td>
                                                    </Tr>
                                                ))}
                                            </TBody>
                                        </Table>
                                    )}
                                </CardBody>
                            </Card>
                        </div>
                    </div>
                </Container>
            </PageWrapper>

            {/* Modal cambiar estado */}
            {licencia && (
                <ModalCambiarEstadoLicencia
                    isOpen={modalEstadoOpen}
                    onClose={() => setModalEstadoOpen(false)}
                    licenciaId={licencia.id}
                    estadoActual={licencia.estado}
                    estadoActualLabel={licencia.estado_label}
                    colorEstado={licencia.color_estado}
                />
            )}
        </>
    );
};

export default DetalleLicencia;
