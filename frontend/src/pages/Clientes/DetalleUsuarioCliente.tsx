import Breadcrumb from '@/components/layouts/Breadcrumb/Breadcrumb';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import {
    useGetEquiposPorUsuarioEmpresaQuery,
    useGetLicenciasPorUsuarioEmpresaQuery,
} from '@/store/slices/contratos/contratoApi';
import { useGetDetalleUsuarioClienteQuery } from '@/store/slices/empresa/empresaApi';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import { formatRut } from '@/utils/rut.util';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

// ── Helpers ───────────────────────────────────────────────────────────────────

const calcularEdad = (fecha: string | null | undefined): string => {
    if (!fecha) return '';
    const edad = dayjs().diff(dayjs(fecha), 'year');
    return `${edad} años`;
};

const getIniciales = (nombre: string): string => {
    const partes = nombre.trim().split(' ');
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
};

// ── Componente auxiliar FilaDato ──────────────────────────────────────────────

const FilaDato = ({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) => (
    <div className='flex flex-col gap-0.5'>
        <span className='text-xs text-zinc-500 dark:text-zinc-400'>{label}</span>
        <span className='text-sm font-medium'>{value ?? '-'}</span>
    </div>
);

// ── Tipos de pestana ──────────────────────────────────────────────────────────

type TTab = 'personal' | 'contrato' | 'prevision' | 'cargas' | 'historial' | 'equipos' | 'licencias';

const DetalleUsuarioCliente = () => {
    const navigate = useNavigate();
    const { clienteId, usuarioId } = useParams<{
        clienteId: string;
        usuarioId: string;
    }>();
    const [searchParams, setSearchParams] = useSearchParams();

    // ── Data fetching ─────────────────────────────────────────────────────────

    const {
        data: usuario,
        isLoading: loadingUsuario,
        isError: errorUsuario,
        error: errorUsuarioData,
    } = useGetDetalleUsuarioClienteQuery(usuarioId ?? '', { skip: !usuarioId });

    const { data: equipos = [], isLoading: loadingEquipos } =
        useGetEquiposPorUsuarioEmpresaQuery(usuarioId ?? '', { skip: !usuarioId });

    const { data: licencias = [], isLoading: loadingLicencias } =
        useGetLicenciasPorUsuarioEmpresaQuery(usuarioId ?? '', { skip: !usuarioId });

    // ── Estado del tab (persistido en URL) ──────────────────────────────────

    const VALID_TABS: TTab[] = ['personal', 'contrato', 'prevision', 'cargas', 'historial', 'equipos', 'licencias'];

    const activeTab = useMemo<TTab>(() => {
        const tab = searchParams.get('tab') as TTab | null;
        return tab && VALID_TABS.includes(tab) ? tab : 'personal';
    }, [searchParams]);

    const setActiveTab = (tab: TTab) => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', tab);
        setSearchParams(next, { replace: true });
    };

    // ── Loading / Error guards ────────────────────────────────────────────────

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
                        {getErrorMessage(errorUsuarioData) || 'No se pudo cargar el usuario. Verifique su conexión e intente nuevamente.'}
                    </Alert>
                </Container>
            </PageWrapper>
        );
    }

    if (!usuario) {
        return (
            <PageWrapper>
                <Container>
                    <Alert color='zinc'>Usuario no encontrado.</Alert>
                </Container>
            </PageWrapper>
        );
    }

    // ── Datos derivados ───────────────────────────────────────────────────────

    const contrato = usuario.contrato_laboral_vigente ?? null;
    const nombreCompleto = usuario.nombre_usuario;
    const iniciales = getIniciales(nombreCompleto);
    const equiposActivos = equipos.filter((e) => e.estado).length;
    const cargasFamiliares = usuario.cargas_familiares ?? [];
    const documentosLaborales = usuario.contratos_laborales_historial ?? [];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <Button
                        icon='HeroArrowLeft'
                        onClick={() => navigate(`/empresa/detalle-cliente/${clienteId}`)}>
                        Volver
                    </Button>
                    <h1 className='text-xl font-bold'>{nombreCompleto}</h1>
                    <Badge color={usuario.is_active ? 'emerald' : 'red'}>
                        {usuario.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                </SubheaderLeft>
            </Subheader>

            <Container>
                <div className='flex flex-col gap-4'>
                    <Breadcrumb
                        path='Clientes'
                        currentPage={nombreCompleto}
                    />
                    <Card>
                        <CardBody>
                            <div className='flex flex-col items-start gap-4 sm:flex-row sm:items-center'>
                                {/* Avatar */}
                                <div className='flex-shrink-0'>
                                    {usuario.foto_perfil ? (
                                        <img
                                            src={usuario.foto_perfil}
                                            alt={nombreCompleto}
                                            className='h-16 w-16 rounded-full object-cover'
                                        />
                                    ) : (
                                        <div className='flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-xl font-bold text-white'>
                                            {iniciales}
                                        </div>
                                    )}
                                </div>

                                {/* Info principal */}
                                <div className='flex-1'>
                                    <div className='flex flex-wrap items-center gap-2'>
                                        <h2 className='text-lg font-bold'>{nombreCompleto}</h2>
                                        <Badge color={usuario.is_active ? 'emerald' : 'red'}>
                                            {usuario.is_active ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                        {contrato && (
                                            <Badge color='blue'>
                                                {contrato.tipo_contrato_label}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className='mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500'>
                                        {usuario.papeleta?.rut && (
                                            <span>{formatRut(usuario.papeleta.rut) || 'Sin RUT'}</span>
                                        )}
                                        {usuario.cargo && <span>{usuario.cargo}</span>}
                                        {usuario.nombre_sucursal && (
                                            <span>{usuario.nombre_sucursal}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className='flex gap-6 text-center text-sm'>
                                    <div>
                                        <p className='text-xl font-bold'>{equiposActivos}</p>
                                        <p className='text-xs text-zinc-500'>Equipos</p>
                                    </div>
                                    <div>
                                        <p className='text-xl font-bold'>{licencias.length}</p>
                                        <p className='text-xs text-zinc-500'>Licencias</p>
                                    </div>
                                    <div>
                                        <p className='text-xl font-bold'>
                                            {usuario.papeleta?.dias_disponibles ?? '-'}
                                        </p>
                                        <p className='text-xs text-zinc-500'>Dias vacac.</p>
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* ── Tabs navigation ──────────────────────────────────── */}
                    <div className='flex flex-wrap gap-2'>
                        {(['personal', 'contrato', 'prevision', 'cargas', 'historial', 'equipos', 'licencias'] as TTab[]).map(
                            (tab) => {
                                const isActive = activeTab === tab;
                                const baseProps = isActive
                                    ? {
                                          size: 'sm' as const,
                                          rounded: 'rounded-full' as const,
                                          className: 'border',
                                          isActive: true,
                                          color: 'blue' as const,
                                          colorIntensity: '500' as const,
                                          variant: 'solid' as const,
                                      }
                                    : {
                                          size: 'sm' as const,
                                          color: 'zinc' as const,
                                          rounded: 'rounded-full' as const,
                                          className: 'border',
                                      };
                                const labels: Record<TTab, string> = {
                                    personal: 'Datos personales',
                                    contrato: 'Contrato',
                                    prevision: 'Previsi\u00f3n',
                                    cargas: 'Cargas familiares',
                                    historial: 'Historial contratos',
                                    equipos: 'Equipos',
                                    licencias: 'Licencias',
                                };
                                return (
                                    <Button key={tab} {...baseProps} onClick={() => setActiveTab(tab)}>
                                        {labels[tab]}
                                        {tab === 'cargas' && cargasFamiliares.length > 0 && (
                                            <Badge color='blue' className='ml-1'>
                                                {cargasFamiliares.length}
                                            </Badge>
                                        )}
                                        {tab === 'historial' && documentosLaborales.length > 0 && (
                                            <Badge color='zinc' className='ml-1'>
                                                {documentosLaborales.length}
                                            </Badge>
                                        )}
                                        {tab === 'equipos' && equiposActivos > 0 && (
                                            <Badge color='blue' className='ml-1'>
                                                {equiposActivos}
                                            </Badge>
                                        )}
                                        {tab === 'licencias' && licencias.length > 0 && (
                                            <Badge color='blue' className='ml-1'>
                                                {licencias.length}
                                            </Badge>
                                        )}
                                    </Button>
                                );
                            },
                        )}
                    </div>

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* Tab: Datos personales                                 */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {activeTab === 'personal' && (
                        <Card>
                            <CardBody>
                                {/* IDENTIFICACION */}
                                <div className='mb-6'>
                                    <p className='mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400'>
                                        Identificación
                                    </p>
                                    <div className='flex flex-wrap gap-x-8 gap-y-4'>
                                        <FilaDato
                                            label='RUT'
                                            value={formatRut(usuario.papeleta?.rut) || 'Sin RUT'}
                                        />
                                        <FilaDato
                                            label='Nombres'
                                            value={
                                                [usuario.first_name, usuario.second_name]
                                                    .filter(Boolean)
                                                    .join(' ') || null
                                            }
                                        />
                                        <FilaDato
                                            label='Apellido paterno'
                                            value={usuario.last_name}
                                        />
                                        <FilaDato
                                            label='Apellido materno'
                                            value={usuario.second_last_name}
                                        />
                                        <FilaDato
                                            label='Fecha de nacimiento'
                                            value={
                                                usuario.fecha_nacimiento
                                                    ? `${dayjs(usuario.fecha_nacimiento).format('DD/MM/YYYY')} (${calcularEdad(usuario.fecha_nacimiento)})`
                                                    : null
                                            }
                                        />
                                        <FilaDato
                                            label='Genero'
                                            value={usuario.genero_label}
                                        />
                                        <FilaDato
                                            label='Nacionalidad'
                                            value={usuario.nacionalidad}
                                        />
                                    </div>
                                    <div className='mt-4'>
                                        <FilaDato
                                            label='Estado civil'
                                            value={usuario.estado_civil_label}
                                        />
                                    </div>
                                </div>

                                <hr className='my-4 border-zinc-200 dark:border-zinc-700' />

                                {/* CONTACTO */}
                                <div className='mb-6'>
                                    <p className='mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400'>
                                        Contacto
                                    </p>
                                    <div className='flex flex-wrap gap-x-8 gap-y-4'>
                                        <FilaDato
                                            label='Correo electronico'
                                            value={usuario.email_usuario}
                                        />
                                        <FilaDato
                                            label='Telefono movil'
                                            value={usuario.celular}
                                        />
                                        <FilaDato
                                            label='Direccion'
                                            value={usuario.direccion}
                                        />
                                        <FilaDato label='Región' value={usuario.region_nombre} />
                                        <FilaDato label='Provincia' value={usuario.provincia_nombre} />
                                        <FilaDato label='Comuna' value={usuario.comuna_nombre} />
                                    </div>
                                </div>

                                <hr className='my-4 border-zinc-200 dark:border-zinc-700' />

                                {/* EDUCACION */}
                                <div>
                                    <p className='mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400'>
                                        Educación
                                    </p>
                                    <div className='flex flex-wrap gap-x-8 gap-y-4'>
                                        <FilaDato
                                            label='Nivel de estudios'
                                            value={usuario.nivel_estudios_label}
                                        />
                                        <FilaDato
                                            label='Titulo / especialidad'
                                            value={usuario.titulo_especialidad}
                                        />
                                        <FilaDato
                                            label='Institucion'
                                            value={usuario.institucion_educacional}
                                        />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* Tab: Contrato laboral                                 */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {activeTab === 'contrato' && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <span className='font-semibold'>Contrato laboral vigente</span>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    {contrato && (
                                        <Badge
                                            color={
                                                contrato.estado === 'vigente'
                                                    ? 'emerald'
                                                    : contrato.estado === 'pendiente_aprobacion'
                                                      ? 'amber'
                                                      : 'zinc'
                                            }>
                                            {contrato.estado_label}
                                        </Badge>
                                    )}
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        color='blue'
                                        icon='HeroArrowTopRightOnSquare'
                                        onClick={() => navigate(`/rrhh/trabajadores/${usuarioId}`)}>
                                        Gestionar en RRHH
                                    </Button>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                {!contrato ? (
                                    <Alert color='zinc'>
                                        Este trabajador no tiene un contrato laboral registrado en el
                                        sistema.
                                    </Alert>
                                ) : (
                                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                                        <FilaDato
                                            label='Tipo de contrato'
                                            value={contrato.tipo_contrato_label}
                                        />
                                        <FilaDato
                                            label='Jornada'
                                            value={contrato.jornada_label}
                                        />
                                        <FilaDato label='Cargo' value={contrato.cargo} />
                                        <FilaDato
                                            label='Lugar de trabajo'
                                            value={contrato.lugar_trabajo}
                                        />
                                        <FilaDato
                                            label='Fecha inicio'
                                            value={dayjs(contrato.fecha_inicio).format(
                                                'DD/MM/YYYY',
                                            )}
                                        />
                                        <FilaDato
                                            label='Fecha termino'
                                            value={
                                                contrato.fecha_termino
                                                    ? dayjs(contrato.fecha_termino).format(
                                                          'DD/MM/YYYY',
                                                      )
                                                    : 'Indefinido'
                                            }
                                        />
                                        <FilaDato
                                            label='Sueldo base'
                                            value={formatCurrency(
                                                contrato.sueldo_base,
                                                contrato.moneda,
                                            )}
                                        />
                                        <FilaDato
                                            label='Sueldo liquido'
                                            value={
                                                contrato.sueldo_liquido
                                                    ? formatCurrency(
                                                          contrato.sueldo_liquido,
                                                          contrato.moneda,
                                                      )
                                                    : null
                                            }
                                        />
                                        <FilaDato
                                            label='Bono movilizacion'
                                            value={formatCurrency(
                                                contrato.bono_movilizacion,
                                                contrato.moneda,
                                            )}
                                        />
                                        <FilaDato
                                            label='Bono colacion'
                                            value={formatCurrency(
                                                contrato.bono_colacion,
                                                contrato.moneda,
                                            )}
                                        />
                                        <FilaDato
                                            label='Gratificacion'
                                            value={contrato.tipo_gratificacion_label ?? '-'}
                                        />
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* Tab: Prevision                                        */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {activeTab === 'prevision' && (
                        <Card>
                            <CardBody>
                                {/* PREVISION SOCIAL */}
                                <div className='mb-6'>
                                    <p className='mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400'>
                                        Previsión social
                                    </p>
                                    <div className='flex flex-wrap gap-x-8 gap-y-4'>
                                        <FilaDato label='AFP' value={usuario.afp_nombre} />
                                        <FilaDato
                                            label='Sistema de salud'
                                            value={usuario.sistema_salud_label}
                                        />
                                        {usuario.sistema_salud === 'isapre' && (
                                            <FilaDato
                                                label='Nombre ISAPRE'
                                                value={usuario.nombre_isapre}
                                            />
                                        )}
                                    </div>
                                </div>

                                <hr className='my-4 border-zinc-200 dark:border-zinc-700' />

                                {/* DATOS BANCARIOS */}
                                <div>
                                    <p className='mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400'>
                                        Datos bancarios
                                    </p>
                                    <div className='flex flex-wrap gap-x-8 gap-y-4'>
                                        <FilaDato label='Banco' value={usuario.banco} />
                                        <FilaDato
                                            label='Tipo de cuenta'
                                            value={usuario.tipo_cuenta_bancaria_label}
                                        />
                                        {/* Número de cuenta de depósito de remuneraciones — se muestra completo intencionalmente.
                                            Es la cuenta bancaria donde se deposita el sueldo, no un número de tarjeta. No enmascarar. */}
                                        <FilaDato
                                            label='Número de cuenta'
                                            value={usuario.numero_cuenta_bancaria}
                                        />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* Tab: Cargas familiares                                */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {activeTab === 'cargas' && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <span className='font-semibold'>Cargas familiares</span>
                                    {cargasFamiliares.length > 0 && (
                                        <Badge color='blue'>{cargasFamiliares.length}</Badge>
                                    )}
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='p-0'>
                                {cargasFamiliares.length === 0 ? (
                                    <p className='p-4 text-sm text-zinc-500'>
                                        Sin cargas familiares registradas.
                                    </p>
                                ) : (
                                    <Table>
                                        <THead>
                                            <Tr>
                                                <Th>Nombre completo</Th>
                                                <Th>RUT</Th>
                                                <Th>Parentesco</Th>
                                                <Th>Fecha de nacimiento</Th>
                                                <Th>Estado</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {cargasFamiliares.map((carga) => (
                                                <Tr key={carga.id}>
                                                    <Td>
                                                        {carga.nombres} {carga.apellido_paterno}{' '}
                                                        {carga.apellido_materno}
                                                    </Td>
                                                    <Td>{carga.rut || '-'}</Td>
                                                    <Td>{carga.parentesco_label}</Td>
                                                    <Td>
                                                        {carga.fecha_nacimiento
                                                            ? dayjs(carga.fecha_nacimiento).format(
                                                                  'DD/MM/YYYY',
                                                              )
                                                            : '-'}
                                                    </Td>
                                                    <Td>
                                                        <Badge
                                                            color={
                                                                carga.is_activo ? 'emerald' : 'zinc'
                                                            }>
                                                            {carga.is_activo ? 'Activo' : 'Inactivo'}
                                                        </Badge>
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                )}
                            </CardBody>
                        </Card>
                    )}

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* Tab: Documentos laborales                             */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {activeTab === 'historial' && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <span className='font-semibold'>Historial de contratos laborales</span>
                                    {documentosLaborales.length > 0 && (
                                        <Badge color='zinc'>{documentosLaborales.length}</Badge>
                                    )}
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='p-0'>
                                {documentosLaborales.length === 0 ? (
                                    <p className='p-4 text-sm text-zinc-500'>
                                        Sin documentos laborales registrados.
                                    </p>
                                ) : (
                                    <Table>
                                        <THead>
                                            <Tr>
                                                <Th>Tipo</Th>
                                                <Th>Estado</Th>
                                                <Th>Fecha inicio</Th>
                                                <Th>Fecha termino</Th>
                                                <Th>PDF</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {documentosLaborales.map((doc) => (
                                                <Tr key={doc.id}>
                                                    <Td>{doc.tipo_contrato_label}</Td>
                                                    <Td>
                                                        <Badge
                                                            color={
                                                                doc.estado === 'vigente'
                                                                    ? 'emerald'
                                                                    : doc.estado ===
                                                                        'pendiente_aprobacion'
                                                                      ? 'amber'
                                                                      : 'zinc'
                                                            }>
                                                            {doc.estado_label}
                                                        </Badge>
                                                    </Td>
                                                    <Td>
                                                        {dayjs(doc.fecha_inicio).format(
                                                            'DD/MM/YYYY',
                                                        )}
                                                    </Td>
                                                    <Td>
                                                        {doc.fecha_termino
                                                            ? dayjs(doc.fecha_termino).format(
                                                                  'DD/MM/YYYY',
                                                              )
                                                            : 'Indefinido'}
                                                    </Td>
                                                    <Td>
                                                        {doc.archivo_pdf ? (
                                                            <Button
                                                                size='sm'
                                                                icon='HeroDocumentArrowDown'
                                                                color='blue'
                                                                variant='solid'
                                                                onClick={() =>
                                                                    window.open(
                                                                        doc.archivo_pdf!,
                                                                        '_blank',
                                                                    )
                                                                }
                                                            />
                                                        ) : (
                                                            <span className='text-xs text-zinc-400'>
                                                                Sin PDF
                                                            </span>
                                                        )}
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                )}
                            </CardBody>
                        </Card>
                    )}
                    {/* ══════════════════════════════════════════════════════ */}
                    {/* Tab: Equipos                                         */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {activeTab === 'equipos' && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <span className='font-semibold'>Equipos asignados</span>
                                    {equipos.length > 0 && (
                                        <Badge color='blue'>{equipos.length}</Badge>
                                    )}
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='p-0'>
                                {equipos.length === 0 ? (
                                    <p className='p-4 text-sm text-zinc-500'>
                                        Sin equipos asignados.
                                    </p>
                                ) : (
                                    <Table>
                                        <THead>
                                            <Tr>
                                                <Th>Equipo</Th>
                                                <Th>Serie</Th>
                                                <Th>Fecha asignaci\u00f3n</Th>
                                                <Th>Fecha devoluci\u00f3n</Th>
                                                <Th>Estado</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {equipos.map((e) => (
                                                <Tr key={e.id}>
                                                    <Td>{e.datos_equipo?.nombre_equipo ?? e.datos_equipo?.modelo ?? '-'}</Td>
                                                    <Td>{e.datos_equipo?.numero_serie ?? '-'}</Td>
                                                    <Td>
                                                        {e.fecha_asignacion
                                                            ? dayjs(e.fecha_asignacion).format(
                                                                  'DD/MM/YYYY',
                                                              )
                                                            : '-'}
                                                    </Td>
                                                    <Td>
                                                        {e.fecha_devolucion
                                                            ? dayjs(e.fecha_devolucion).format(
                                                                  'DD/MM/YYYY',
                                                              )
                                                            : '-'}
                                                    </Td>
                                                    <Td>
                                                        <Badge
                                                            color={e.estado ? 'emerald' : 'zinc'}>
                                                            {e.estado ? 'Activo' : 'Devuelto'}
                                                        </Badge>
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                )}
                            </CardBody>
                        </Card>
                    )}

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* Tab: Licencias                                        */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {activeTab === 'licencias' && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <span className='font-semibold'>Licencias asignadas</span>
                                    {licencias.length > 0 && (
                                        <Badge color='blue'>{licencias.length}</Badge>
                                    )}
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='p-0'>
                                {licencias.length === 0 ? (
                                    <p className='p-4 text-sm text-zinc-500'>
                                        Sin licencias asignadas.
                                    </p>
                                ) : (
                                    <Table>
                                        <THead>
                                            <Tr>
                                                <Th>Licencia</Th>
                                                <Th>Proveedor</Th>
                                                <Th>Estado</Th>
                                                <Th>Vencimiento</Th>
                                                <Th>Contrato</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {licencias.map((l) => (
                                                <Tr key={l.id}>
                                                    <Td>{l.nombre_licencia}</Td>
                                                    <Td>{l.proveedor_licencia || '-'}</Td>
                                                    <Td>
                                                        <Badge color={l.color_estado}>
                                                            {l.estado_licencia_label}
                                                        </Badge>
                                                    </Td>
                                                    <Td>
                                                        {l.fecha_fin_licencia
                                                            ? dayjs(l.fecha_fin_licencia).format(
                                                                  'DD/MM/YYYY',
                                                              )
                                                            : 'Sin vencimiento'}
                                                    </Td>
                                                    <Td>{l.nombre_contrato}</Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                )}
                            </CardBody>
                        </Card>
                    )}
                </div>
            </Container>
        </PageWrapper>
    );
};

export default DetalleUsuarioCliente;