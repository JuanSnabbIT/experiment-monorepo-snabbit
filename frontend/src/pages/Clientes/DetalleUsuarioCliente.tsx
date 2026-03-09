import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import {
    useGetContratosPorUsuarioEmpresaQuery,
    useGetEquiposPorUsuarioEmpresaQuery,
    useGetLicenciasPorUsuarioEmpresaQuery,
} from '@/store/slices/contratos/contratoApi';
import { useGetDetalleUsuarioClienteQuery } from '@/store/slices/empresa/empresaApi';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';

const DetalleUsuarioCliente = () => {
    const navigate = useNavigate();
    const { clienteId, usuarioId } = useParams<{
        clienteId: string;
        usuarioId: string;
    }>();

    // ─── Queries ───
    const {
        data: usuario,
        isLoading: loadingUsuario,
        isError: errorUsuario,
    } = useGetDetalleUsuarioClienteQuery(usuarioId ?? '', { skip: !usuarioId });

    const { data: equipos = [], isLoading: loadingEquipos } =
        useGetEquiposPorUsuarioEmpresaQuery(usuarioId ?? '', { skip: !usuarioId });

    const { data: licencias = [], isLoading: loadingLicencias } =
        useGetLicenciasPorUsuarioEmpresaQuery(usuarioId ?? '', { skip: !usuarioId });

    const { data: contratos = [], isLoading: loadingContratos } =
        useGetContratosPorUsuarioEmpresaQuery(usuarioId ?? '', { skip: !usuarioId });

    // ─── Loading / Error / Not found ───
    if (loadingUsuario) {
        return (
            <PageWrapper>
                <Container>
                    <p className='p-4 text-sm text-zinc-500'>Cargando usuario...</p>
                </Container>
            </PageWrapper>
        );
    }

    if (errorUsuario) {
        return (
            <PageWrapper>
                <Container>
                    <Alert color='red'>
                        No se pudo cargar el usuario. Verifique su conexión e intente nuevamente.
                    </Alert>
                </Container>
            </PageWrapper>
        );
    }

    if (!usuario) {
        return (
            <PageWrapper>
                <Container>
                    <p className='p-4 text-sm text-red-500'>Usuario no encontrado.</p>
                </Container>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <Button icon='HeroArrowLeft' onClick={() => navigate(-1)}>
                        Volver
                    </Button>
                    <h1 className='text-xl font-bold'>{usuario.nombre_usuario}</h1>
                    <Badge color={usuario.estado === '1' ? 'emerald' : 'red'}>
                        {usuario.estado_label}
                    </Badge>
                    {!usuario.is_active && (
                        <Badge color='zinc'>Cuenta deshabilitada</Badge>
                    )}
                </SubheaderLeft>
            </Subheader>

            <Container>
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
                    {/* ── Información Personal ── */}
                    <Card className='lg:col-span-1'>
                        <CardHeader>
                            <CardHeaderChild>
                                <span className='font-semibold'>Información Personal</span>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <dl className='space-y-3 text-sm'>
                                <div>
                                    <dt className='text-zinc-500'>Nombre</dt>
                                    <dd className='font-medium'>
                                        {usuario.nombre_usuario || '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className='text-zinc-500'>Email</dt>
                                    <dd className='font-medium'>
                                        {usuario.email_usuario || '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className='text-zinc-500'>RUT</dt>
                                    <dd className='font-medium'>
                                        {usuario.papeleta?.rut || 'Sin RUT'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className='text-zinc-500'>Cargo</dt>
                                    <dd className='font-medium'>
                                        {usuario.cargo || '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className='text-zinc-500'>Sucursal</dt>
                                    <dd className='font-medium'>
                                        {usuario.nombre_sucursal || '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className='text-zinc-500'>Fecha Ingreso</dt>
                                    <dd className='font-medium'>
                                        {usuario.fecha_ingreso
                                            ? dayjs(usuario.fecha_ingreso).format('DD/MM/YYYY')
                                            : '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className='text-zinc-500'>Fecha Contrato</dt>
                                    <dd className='font-medium'>
                                        {usuario.fecha_contrato
                                            ? dayjs(usuario.fecha_contrato).format('DD/MM/YYYY')
                                            : '—'}
                                    </dd>
                                </div>
                            </dl>
                        </CardBody>
                    </Card>

                    {/* ── Columna derecha: Equipos + Licencias + Contratos ── */}
                    <div className='flex flex-col gap-4 lg:col-span-2'>
                        {/* ── Equipos Asignados ── */}
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <span className='font-semibold'>Equipos Asignados</span>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='p-0'>
                                {loadingEquipos ? (
                                    <p className='p-4 text-sm text-zinc-500'>Cargando...</p>
                                ) : equipos.length === 0 ? (
                                    <p className='p-4 text-sm text-zinc-500'>
                                        Sin equipos asignados
                                    </p>
                                ) : (
                                    <Table>
                                        <THead>
                                            <Tr>
                                                <Th>Tipo</Th>
                                                <Th>Marca / Modelo</Th>
                                                <Th>N° Serie</Th>
                                                <Th>Fecha Asignación</Th>
                                                <Th>Estado</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {equipos.map((ue) => (
                                                <Tr key={ue.id}>
                                                    <Td>
                                                        {ue.datos_equipo?.tipo_equipo_label || '—'}
                                                    </Td>
                                                    <Td>
                                                        {ue.datos_equipo?.marca_label || '—'} /{' '}
                                                        {ue.datos_equipo?.modelo || '—'}
                                                    </Td>
                                                    <Td>
                                                        {ue.datos_equipo?.numero_serie || '—'}
                                                    </Td>
                                                    <Td>
                                                        {ue.fecha_asignacion
                                                            ? dayjs(ue.fecha_asignacion).format(
                                                                  'DD/MM/YYYY',
                                                              )
                                                            : '—'}
                                                    </Td>
                                                    <Td>
                                                        <Badge
                                                            color={
                                                                ue.estado ? 'emerald' : 'zinc'
                                                            }>
                                                            {ue.estado ? 'Asignado' : 'Devuelto'}
                                                        </Badge>
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                )}
                            </CardBody>
                        </Card>

                        {/* ── Licencias Vinculadas ── */}
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <span className='font-semibold'>Licencias Vinculadas</span>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='p-0'>
                                {loadingLicencias ? (
                                    <p className='p-4 text-sm text-zinc-500'>Cargando...</p>
                                ) : licencias.length === 0 ? (
                                    <p className='p-4 text-sm text-zinc-500'>
                                        Sin licencias vinculadas
                                    </p>
                                ) : (
                                    <Table>
                                        <THead>
                                            <Tr>
                                                <Th>Licencia</Th>
                                                <Th>Proveedor</Th>
                                                <Th>Estado</Th>
                                                <Th>Fecha Asignación</Th>
                                                <Th>Contrato</Th>
                                                <Th>Acciones</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {licencias.map((lic) => (
                                                <Tr key={lic.id}>
                                                    <Td>{lic.nombre_licencia}</Td>
                                                    <Td>{lic.proveedor_licencia || '—'}</Td>
                                                    <Td>
                                                        <Badge color={lic.color_estado}>
                                                            {lic.estado_licencia_label}
                                                        </Badge>
                                                    </Td>
                                                    <Td>
                                                        {lic.fecha_asignacion
                                                            ? dayjs(lic.fecha_asignacion).format(
                                                                  'DD/MM/YYYY',
                                                              )
                                                            : '—'}
                                                    </Td>
                                                    <Td>{lic.nombre_contrato}</Td>
                                                    <Td>
                                                        <Tooltip text='Ver licencia'>
                                                            <Button
                                                                color='violet'
                                                                variant='solid'
                                                                icon='HeroEye'
                                                                size='sm'
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/empresa/detalle-cliente/${clienteId}/contrato/${lic.contrato_id}/licencia/${lic.licencia_contrato_id}`,
                                                                    )
                                                                }
                                                            />
                                                        </Tooltip>
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                )}
                            </CardBody>
                        </Card>

                        {/* ── Contratos Asociados ── */}
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <span className='font-semibold'>Contratos Asociados</span>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='p-0'>
                                {loadingContratos ? (
                                    <p className='p-4 text-sm text-zinc-500'>Cargando...</p>
                                ) : contratos.length === 0 ? (
                                    <p className='p-4 text-sm text-zinc-500'>
                                        Sin contratos asociados
                                    </p>
                                ) : (
                                    <Table>
                                        <THead>
                                            <Tr>
                                                <Th>Contrato</Th>
                                                <Th>Tipo</Th>
                                                <Th>Estado</Th>
                                                <Th>Rol</Th>
                                                <Th>Vigencia</Th>
                                                <Th>Acciones</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {contratos.map((c) => (
                                                <Tr key={c.id}>
                                                    <Td>{c.nombre_contrato}</Td>
                                                    <Td>
                                                        <Badge color='blue'>
                                                            {c.tipo_contrato_label}
                                                        </Badge>
                                                    </Td>
                                                    <Td>
                                                        <Badge
                                                            color={
                                                                c.estado_contrato === 'activo'
                                                                    ? 'emerald'
                                                                    : c.estado_contrato ===
                                                                        'borrador'
                                                                      ? 'amber'
                                                                      : c.estado_contrato ===
                                                                            'suspendido'
                                                                        ? 'red'
                                                                        : 'zinc'
                                                            }>
                                                            {c.estado_contrato_label}
                                                        </Badge>
                                                    </Td>
                                                    <Td>{c.tipo_usuario_label}</Td>
                                                    <Td>
                                                        {dayjs(c.fecha_inicio_contrato).format(
                                                            'DD/MM/YYYY',
                                                        )}{' '}
                                                        →{' '}
                                                        {c.fecha_fin_contrato
                                                            ? dayjs(
                                                                  c.fecha_fin_contrato,
                                                              ).format('DD/MM/YYYY')
                                                            : 'Indefinido'}
                                                    </Td>
                                                    <Td>
                                                        <Tooltip text='Ver contrato'>
                                                            <Button
                                                                color='violet'
                                                                variant='solid'
                                                                icon='HeroEye'
                                                                size='sm'
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/empresa/detalle-cliente/${clienteId}/contrato/${c.contrato_id}`,
                                                                    )
                                                                }
                                                            />
                                                        </Tooltip>
                                                    </Td>
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
    );
};

export default DetalleUsuarioCliente;
