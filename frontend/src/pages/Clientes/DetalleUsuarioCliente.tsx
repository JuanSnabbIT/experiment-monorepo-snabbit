import Breadcrumb from '@/components/layouts/Breadcrumb/Breadcrumb';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import {
    useGetEquiposPorUsuarioEmpresaQuery,
    useGetLicenciasPorUsuarioEmpresaQuery,
} from '@/store/slices/contratos/contratoApi';
import {
    useGetDetalleClienteQuery,
    useGetDetalleUsuarioClienteQuery,
} from '@/store/slices/empresa/empresaApi';
import {
    useCambiarEstadoContratoTrabajadorMutation,
    useGetContratoTrabajadorDetalleQuery,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { Pages } from '@/config/pages.config';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import { formatRut } from '@/utils/rut.util';
import { confirmAlert } from '@/utils/sweetAlert';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import CrearContratoTrabajadorWizard from '@/pages/RRHH/modals/CrearContratoTrabajadorWizard';

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

const getNombreEquipo = (e: {
    datos_equipo?: { nombre_equipo?: string | null; modelo?: string } | null;
}): string => (e.datos_equipo?.nombre_equipo ?? e.datos_equipo?.modelo) || '-';

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

// ── Tipos de pestaña ──────────────────────────────────────────────────────────

type TTab = 'personal' | 'contrato' | 'prevision' | 'cargas' | 'historial' | 'equipos' | 'licencias';

const VALID_TABS: TTab[] = ['personal', 'contrato', 'prevision', 'cargas', 'historial', 'equipos', 'licencias'];

const DetalleUsuarioCliente = () => {
    const navigate = useNavigate();
    const { clienteId, refId } = useParams<{
        clienteId: string;
        refId: string;
    }>();
    const [searchParams, setSearchParams] = useSearchParams();

    const tipo = (searchParams.get('tipo') ?? 'confirmado') as 'confirmado' | 'pendiente';
    const esPendiente = tipo === 'pendiente';

    // ── Data fetching ─────────────────────────────────────────────────────────

    const {
        data: usuario,
        isLoading: loadingUsuario,
        isError: errorUsuario,
        error: errorUsuarioData,
    } = useGetDetalleUsuarioClienteQuery(refId ?? '', { skip: !refId || esPendiente });

    const {
        data: contratoPendiente,
        isLoading: loadingPendiente,
        isError: errorPendiente,
        error: errorPendienteData,
    } = useGetContratoTrabajadorDetalleQuery(refId ?? '', { skip: !refId || !esPendiente });

    const { data: equipos = [], isLoading: loadingEquipos } =
        useGetEquiposPorUsuarioEmpresaQuery(refId ?? '', { skip: !refId || esPendiente });

    const { data: licencias = [], isLoading: loadingLicencias } =
        useGetLicenciasPorUsuarioEmpresaQuery(refId ?? '', { skip: !refId || esPendiente });

    const { data: relacionCliente } = useGetDetalleClienteQuery(clienteId ?? '', {
        skip: !clienteId,
    });

    const [cambiarEstado] = useCambiarEstadoContratoTrabajadorMutation();

    // ── Estado local ──────────────────────────────────────────────────────────

    const [equipoSeleccionado, setEquipoSeleccionado] = useState<
        (typeof equipos)[number] | null
    >(null);
    const [wizardOpen, setWizardOpen] = useState(false);

    // ── Estado del tab (persistido en URL) ──────────────────────────────────

    const activeTab = useMemo<TTab>(() => {
        const tab = searchParams.get('tab') as TTab | null;
        const allowed = esPendiente
            ? (['personal', 'contrato', 'prevision', 'cargas'] as TTab[])
            : VALID_TABS;
        return tab && allowed.includes(tab) ? tab : 'personal';
    }, [searchParams, esPendiente]);

    const setActiveTab = (tab: TTab) => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', tab);
        setSearchParams(next, { replace: true });
    };

    // ── Loading / Error guards ────────────────────────────────────────────────

    const isLoading = esPendiente ? loadingPendiente : loadingUsuario;
    const isError = esPendiente ? errorPendiente : errorUsuario;
    const errorData = esPendiente ? errorPendienteData : errorUsuarioData;

    if (isLoading) {
        return (
            <PageWrapper>
                <Container>
                    <p className='p-4 text-sm text-zinc-500'>Cargando ficha...</p>
                </Container>
            </PageWrapper>
        );
    }

    if (isError) {
        return (
            <PageWrapper>
                <Container>
                    <Alert color='red'>
                        {getErrorMessage(errorData) ||
                            'No se pudo cargar la ficha. Verifique su conexión e intente nuevamente.'}
                    </Alert>
                </Container>
            </PageWrapper>
        );
    }

    if (esPendiente && !contratoPendiente) {
        return (
            <PageWrapper>
                <Container>
                    <Alert color='zinc'>Contrato pendiente no encontrado.</Alert>
                </Container>
            </PageWrapper>
        );
    }

    if (!esPendiente && !usuario) {
        return (
            <PageWrapper>
                <Container>
                    <Alert color='zinc'>Usuario no encontrado.</Alert>
                </Container>
            </PageWrapper>
        );
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleDesechar = async () => {
        const ok = await confirmAlert({
            title: '¿Desechar este trabajador?',
            text: 'El contrato pasará a estado descartado. Esta acción no puede revertirse.',
            confirmText: 'Sí, desechar',
        });
        if (!ok) return;
        try {
            await cambiarEstado({ id: Number(refId), estado: 'descartado' }).unwrap();
            navigate(`/empresa/detalle-cliente/${clienteId}?tab=trabajadores`);
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    // ── Datos derivados ───────────────────────────────────────────────────────

    const contrato = esPendiente ? null : (usuario!.contrato_laboral_vigente ?? null);
    const datosPendiente = contratoPendiente?.datos_trabajador_nuevo ?? null;
    const nombreCompleto = esPendiente
        ? (contratoPendiente!.nombre_trabajador
            ?? ([datosPendiente?.first_name, datosPendiente?.last_name].filter(Boolean).join(' ')
                || contratoPendiente!.cargo
                || `Pendiente #${refId}`))
        : usuario!.nombre_usuario;
    const iniciales = getIniciales(nombreCompleto);
    const equiposActivos = equipos.filter((e) => e.estado).length;
    const cargasFamiliares = esPendiente ? [] : (usuario!.cargas_familiares ?? []);
    const documentosLaborales = esPendiente ? [] : (usuario!.contratos_laborales_historial ?? []);

    const TABS_PENDIENTE: TTab[] = ['personal', 'contrato', 'prevision', 'cargas'];
    const tabsActivos: TTab[] = esPendiente ? TABS_PENDIENTE : VALID_TABS;

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
                </SubheaderLeft>
            </Subheader>

            <Container>
                <div className='flex flex-col gap-4'>
                    <Breadcrumb
                        path={`Clientes / ${relacionCliente?.info_cliente?.nombre ?? '...'}`}
                        currentPage={nombreCompleto}
                    />
                    <Card>
                        <CardBody>
                            <div className='flex flex-col items-start gap-4 sm:flex-row sm:items-center'>
                                {/* Avatar */}
                                <div className='flex-shrink-0'>
                                    {!esPendiente && usuario!.foto_perfil ? (
                                        <img
                                            src={usuario!.foto_perfil}
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
                                        {esPendiente ? (
                                            <Badge color='amber'>
                                                {contratoPendiente!.estado_label ?? 'Pendiente'}
                                            </Badge>
                                        ) : (
                                            <Badge color={usuario!.is_active ? 'emerald' : 'red'}>
                                                {usuario!.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        )}
                                        {contrato && (
                                            <Badge color='blue'>
                                                {contrato.tipo_contrato_label}
                                            </Badge>
                                        )}
                                        {esPendiente && contratoPendiente?.tipo_contrato_label && (
                                            <Badge color='blue'>
                                                {contratoPendiente.tipo_contrato_label}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className='mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500'>
                                        {esPendiente ? (
                                            <>
                                                {contratoPendiente!.rut_trabajador && (
                                                    <span>{formatRut(contratoPendiente!.rut_trabajador) || 'Sin RUT'}</span>
                                                )}
                                                {contratoPendiente!.cargo && <span>{contratoPendiente!.cargo}</span>}
                                                {contratoPendiente!.sucursal_nombre && (
                                                    <span>{contratoPendiente!.sucursal_nombre}</span>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {usuario!.papeleta?.rut && (
                                                    <span>{formatRut(usuario!.papeleta.rut) || 'Sin RUT'}</span>
                                                )}
                                                {usuario!.cargo && <span>{usuario!.cargo}</span>}
                                                {usuario!.nombre_sucursal && (
                                                    <span>{usuario!.nombre_sucursal}</span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Stats */}
                                {!esPendiente && (
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
                                                {usuario!.papeleta?.dias_disponibles ?? '-'}
                                            </p>
                                            <p className='text-xs text-zinc-500'>Días vacaciones</p>
                                        </div>
                                        <div>
                                            <p className='text-xl font-bold'>
                                                {usuario!.papeleta?.años_servicio ?? '-'}
                                            </p>
                                            <p className='text-xs text-zinc-500'>Antigüedad (años)</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    {/* ── Banner: trabajador pendiente ─────────────────────── */}
                    {esPendiente && (
                        <Alert color='amber'>
                            <div className='flex flex-wrap items-center justify-between gap-2'>
                                <span>
                                    Este trabajador aún no ha completado su incorporación. Contrato
                                    en estado:{' '}
                                    <strong>
                                        {contratoPendiente!.estado_label ?? 'pendiente_aprobacion'}
                                    </strong>
                                </span>
                                <div className='flex gap-2'>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        color='blue'
                                        onClick={() =>
                                            navigate(
                                                Pages.rrhh.subPages.detalleContratoTrabajador.to.replace(
                                                    ':contratoId',
                                                    `${refId}`,
                                                ) + `?from=ficha&clienteId=${clienteId}`,
                                            )
                                        }>
                                        Ver contrato
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='solid'
                                        color='red'
                                        onClick={handleDesechar}>
                                        Desechar
                                    </Button>
                                </div>
                            </div>
                        </Alert>
                    )}

                    {/* ── Tabs navigation ──────────────────────────────────── */}
                    <div className='flex flex-wrap gap-2'>
                        {tabsActivos.map((tab) => {
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
                                prevision: 'Previsión',
                                cargas: 'Cargas familiares',
                                historial: 'Historial contratos',
                                equipos: 'Equipos',
                                licencias: 'Licencias de software',
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
                        })}
                    </div>

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* Tab: Datos personales                                 */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {activeTab === 'personal' && esPendiente && (
                        <Card>
                            <CardBody>
                                <div className='mb-6'>
                                    <p className='mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400'>
                                        Identificación
                                    </p>
                                    <div className='flex flex-wrap gap-x-8 gap-y-4'>
                                        <FilaDato
                                            label='RUT'
                                            value={
                                                contratoPendiente!.rut_trabajador
                                                    ? formatRut(contratoPendiente!.rut_trabajador)
                                                    : datosPendiente?.rut
                                                      ? formatRut(datosPendiente.rut)
                                                      : 'Sin RUT'
                                            }
                                        />
                                        <FilaDato
                                            label='Correo electrónico'
                                            value={
                                                contratoPendiente!.email_trabajador ??
                                                datosPendiente?.email
                                            }
                                        />
                                        <FilaDato
                                            label='Fecha de nacimiento'
                                            value={
                                                datosPendiente?.fecha_nacimiento
                                                    ? dayjs(
                                                          datosPendiente.fecha_nacimiento,
                                                      ).format('DD/MM/YYYY')
                                                    : null
                                            }
                                        />
                                        <FilaDato
                                            label='Nacionalidad'
                                            value={datosPendiente?.nacionalidad}
                                        />
                                        <FilaDato
                                            label='Dirección'
                                            value={datosPendiente?.direccion}
                                        />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {activeTab === 'personal' && !esPendiente && (
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
                                            value={formatRut(usuario!.papeleta?.rut) || 'Sin RUT'}
                                        />
                                        <FilaDato
                                            label='Nombres'
                                            value={
                                                [usuario!.first_name, usuario!.second_name]
                                                    .filter(Boolean)
                                                    .join(' ') || null
                                            }
                                        />
                                        <FilaDato
                                            label='Apellido paterno'
                                            value={usuario!.last_name}
                                        />
                                        <FilaDato
                                            label='Apellido materno'
                                            value={usuario!.second_last_name}
                                        />
                                        <FilaDato
                                            label='Fecha de nacimiento'
                                            value={
                                                usuario!.fecha_nacimiento
                                                    ? `${dayjs(usuario!.fecha_nacimiento).format('DD/MM/YYYY')} (${calcularEdad(usuario!.fecha_nacimiento)})`
                                                    : null
                                            }
                                        />
                                        <FilaDato
                                            label='Género'
                                            value={usuario!.genero_label}
                                        />
                                        <FilaDato
                                            label='Nacionalidad'
                                            value={usuario!.nacionalidad}
                                        />
                                    </div>
                                    <div className='mt-4'>
                                        <FilaDato
                                            label='Estado civil'
                                            value={usuario!.estado_civil_label}
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
                                            label='Correo electrónico'
                                            value={usuario!.email_usuario}
                                        />
                                        <FilaDato
                                            label='Teléfono móvil'
                                            value={usuario!.celular}
                                        />
                                        <FilaDato
                                            label='Dirección'
                                            value={usuario!.direccion}
                                        />
                                        <FilaDato label='Región' value={usuario!.region_nombre} />
                                        <FilaDato
                                            label='Provincia'
                                            value={usuario!.provincia_nombre}
                                        />
                                        <FilaDato label='Comuna' value={usuario!.comuna_nombre} />
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
                                            value={usuario!.nivel_estudios_label}
                                        />
                                        <FilaDato
                                            label='Título / especialidad'
                                            value={usuario!.titulo_especialidad}
                                        />
                                        <FilaDato
                                            label='Institución'
                                            value={usuario!.institucion_educacional}
                                        />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* Tab: Contrato laboral                                 */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {activeTab === 'contrato' && (() => {
                        const c = esPendiente ? contratoPendiente! : contrato;
                        return (
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <span className='font-semibold'>
                                            {esPendiente
                                                ? 'Datos del contrato'
                                                : 'Contrato laboral vigente'}
                                        </span>
                                    </CardHeaderChild>
                                    <CardHeaderChild>
                                        {c && (
                                            <Badge
                                                color={
                                                    c.estado === 'vigente'
                                                        ? 'emerald'
                                                        : c.estado === 'pendiente_aprobacion'
                                                          ? 'amber'
                                                          : 'zinc'
                                                }>
                                                {c.estado_label}
                                            </Badge>
                                        )}
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody>
                                    {!c ? (
                                        <Alert color='zinc'>
                                            Este trabajador no tiene un contrato laboral registrado en
                                            el sistema.
                                        </Alert>
                                    ) : (
                                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                                            <FilaDato
                                                label='Tipo de contrato'
                                                value={c.tipo_contrato_label}
                                            />
                                            <FilaDato label='Jornada' value={c.jornada_label} />
                                            {c.grupo_turno_snapshot && (
                                                <FilaDato
                                                    label='Grupo turnos'
                                                    value={c.grupo_turno_snapshot.nombre}
                                                />
                                            )}
                                            <FilaDato label='Cargo' value={c.cargo} />
                                            <FilaDato
                                                label='Lugar de trabajo'
                                                value={c.lugar_trabajo}
                                            />
                                            <FilaDato
                                                label='Fecha inicio'
                                                value={dayjs(c.fecha_inicio).format('DD/MM/YYYY')}
                                            />
                                            <FilaDato
                                                label='Fecha término'
                                                value={
                                                    c.fecha_termino
                                                        ? dayjs(c.fecha_termino).format(
                                                              'DD/MM/YYYY',
                                                          )
                                                        : 'Indefinido'
                                                }
                                            />
                                            <FilaDato
                                                label='Sueldo base'
                                                value={formatCurrency(c.sueldo_base, c.moneda)}
                                            />
                                            <FilaDato
                                                label='Sueldo líquido'
                                                value={
                                                    c.sueldo_liquido
                                                        ? formatCurrency(
                                                              c.sueldo_liquido,
                                                              c.moneda,
                                                          )
                                                        : null
                                                }
                                            />
                                            <FilaDato
                                                label='Bono movilización'
                                                value={formatCurrency(c.bono_movilizacion, c.moneda)}
                                            />
                                            <FilaDato
                                                label='Bono colación'
                                                value={formatCurrency(c.bono_colacion, c.moneda)}
                                            />
                                            <FilaDato
                                                label='Gratificación'
                                                value={
                                                    (c as { tipo_gratificacion_label?: string | null })
                                                        .tipo_gratificacion_label ??
                                                    c.tipo_gratificacion ??
                                                    '-'
                                                }
                                            />
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        );
                    })()}

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
                                        <FilaDato
                                            label='AFP'
                                            value={
                                                esPendiente
                                                    ? datosPendiente?.afp
                                                    : usuario!.afp_nombre
                                            }
                                        />
                                        <FilaDato
                                            label='Sistema de salud'
                                            value={
                                                esPendiente
                                                    ? datosPendiente?.sistema_salud
                                                    : usuario!.sistema_salud_label
                                            }
                                        />
                                        {(esPendiente
                                            ? datosPendiente?.sistema_salud === 'isapre'
                                            : usuario!.sistema_salud === 'isapre') && (
                                            <FilaDato
                                                label='Nombre ISAPRE'
                                                value={
                                                    esPendiente
                                                        ? datosPendiente?.nombre_isapre
                                                        : usuario!.nombre_isapre
                                                }
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
                                        <FilaDato
                                            label='Banco'
                                            value={
                                                esPendiente ? datosPendiente?.banco : usuario!.banco
                                            }
                                        />
                                        <FilaDato
                                            label='Tipo de cuenta'
                                            value={
                                                esPendiente
                                                    ? datosPendiente?.tipo_cuenta_bancaria
                                                    : usuario!.tipo_cuenta_bancaria_label
                                            }
                                        />
                                        {/* Cuenta de depósito de remuneraciones — no enmascarar, no es número de tarjeta */}
                                        <FilaDato
                                            label='Número de cuenta'
                                            value={
                                                esPendiente
                                                    ? datosPendiente?.numero_cuenta_bancaria
                                                    : usuario!.numero_cuenta_bancaria
                                            }
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
                                {esPendiente ? (
                                    <p className='p-4 text-sm italic text-zinc-500'>
                                        Las cargas familiares estarán disponibles una vez que el
                                        trabajador complete su incorporación al sistema.
                                    </p>
                                ) : cargasFamiliares.length === 0 ? (
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
                    {/* Tab: Historial contratos                              */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {activeTab === 'historial' && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <span className='font-semibold'>
                                        Historial de contratos laborales
                                    </span>
                                    {documentosLaborales.length > 0 && (
                                        <Badge color='zinc'>{documentosLaborales.length}</Badge>
                                    )}
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    <Button
                                        variant='solid'
                                        color='blue'
                                        icon='HeroPlus'
                                        size='sm'
                                        onClick={() => setWizardOpen(true)}>
                                        Nuevo contrato
                                    </Button>
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
                                                <Th>Fecha término</Th>
                                                <Th>PDF</Th>
                                                <Th>Acciones</Th>
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
                                                    <Td>
                                                        <Tooltip text='Ver contrato'>
                                                            <Button
                                                                icon='HeroEye'
                                                                size='sm'
                                                                color='violet'
                                                                variant='solid'
                                                                onClick={() =>
                                                                    navigate(
                                                                        Pages.rrhh.subPages.detalleContratoTrabajador.to.replace(
                                                                            ':contratoId',
                                                                            `${doc.id}`,
                                                                        ) +
                                                                            `?from=ficha&clienteId=${clienteId}`,
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
                    )}

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* Tab: Equipos                                          */}
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
                                <Table>
                                    <THead>
                                        <Tr>
                                            <Th>Equipo</Th>
                                            <Th>Serie</Th>
                                            <Th>Fecha asignación</Th>
                                            <Th>Fecha devolución</Th>
                                            <Th>Estado</Th>
                                            <Th>Acciones</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {loadingEquipos ? (
                                            Array.from({ length: 3 }).map((_, i) => (
                                                <Tr key={i}>
                                                    {Array.from({ length: 6 }).map((__, j) => (
                                                        <Td key={j}>
                                                            <div className='h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700' />
                                                        </Td>
                                                    ))}
                                                </Tr>
                                            ))
                                        ) : equipos.length === 0 ? (
                                            <Tr>
                                                <Td
                                                    colSpan={6}
                                                    className='p-4 text-sm text-zinc-500'>
                                                    Sin equipos asignados.
                                                </Td>
                                            </Tr>
                                        ) : (
                                            equipos.map((e) => (
                                                <Tr key={e.id}>
                                                    <Td>{getNombreEquipo(e)}</Td>
                                                    <Td>
                                                        {e.datos_equipo?.numero_serie ?? '-'}
                                                    </Td>
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
                                                    <Td>
                                                        <Tooltip text='Ver detalle'>
                                                            <Button
                                                                icon='HeroEye'
                                                                size='sm'
                                                                color='violet'
                                                                variant='solid'
                                                                onClick={() =>
                                                                    setEquipoSeleccionado(e)
                                                                }
                                                            />
                                                        </Tooltip>
                                                    </Td>
                                                </Tr>
                                            ))
                                        )}
                                    </TBody>
                                </Table>
                            </CardBody>
                        </Card>
                    )}

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* Tab: Licencias de software                            */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {activeTab === 'licencias' && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <span className='font-semibold'>
                                        Licencias de software asignadas
                                    </span>
                                    {licencias.length > 0 && (
                                        <Badge color='blue'>{licencias.length}</Badge>
                                    )}
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='p-0'>
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
                                        {loadingLicencias ? (
                                            Array.from({ length: 3 }).map((_, i) => (
                                                <Tr key={i}>
                                                    {Array.from({ length: 5 }).map((__, j) => (
                                                        <Td key={j}>
                                                            <div className='h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700' />
                                                        </Td>
                                                    ))}
                                                </Tr>
                                            ))
                                        ) : licencias.length === 0 ? (
                                            <Tr>
                                                <Td
                                                    colSpan={5}
                                                    className='p-4 text-sm text-zinc-500'>
                                                    Sin licencias asignadas.
                                                </Td>
                                            </Tr>
                                        ) : (
                                            licencias.map((l) => {
                                                const diasRestantes = l.fecha_fin_licencia
                                                    ? dayjs(l.fecha_fin_licencia).diff(
                                                          dayjs(),
                                                          'day',
                                                      )
                                                    : null;
                                                const vencimientoClass =
                                                    diasRestantes !== null && diasRestantes <= 7
                                                        ? 'font-medium text-red-500'
                                                        : diasRestantes !== null &&
                                                            diasRestantes <= 30
                                                          ? 'font-medium text-amber-500'
                                                          : 'text-zinc-500';
                                                return (
                                                    <Tr key={l.id}>
                                                        <Td>{l.nombre_licencia}</Td>
                                                        <Td>{l.proveedor_licencia || '-'}</Td>
                                                        <Td>
                                                            <Badge color={l.color_estado}>
                                                                {l.estado_licencia_label}
                                                            </Badge>
                                                        </Td>
                                                        <Td className={vencimientoClass}>
                                                            {l.fecha_fin_licencia
                                                                ? dayjs(
                                                                      l.fecha_fin_licencia,
                                                                  ).format('DD/MM/YYYY')
                                                                : 'Sin vencimiento'}
                                                        </Td>
                                                        <Td>{l.nombre_contrato}</Td>
                                                    </Tr>
                                                );
                                            })
                                        )}
                                    </TBody>
                                </Table>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </Container>

            {/* ── Wizard: nuevo contrato laboral ──────────────────────── */}
            {!esPendiente && (
                <CrearContratoTrabajadorWizard
                    detalleCliente={relacionCliente}
                    usuarioEmpresaInicial={
                        refId && usuario
                            ? { id: Number(refId), nombre: usuario.nombre_usuario }
                            : undefined
                    }
                    externalIsOpen={wizardOpen}
                    onExternalClose={() => setWizardOpen(false)}
                />
            )}

            {/* ── Modal: detalle de equipo ─────────────────────────────── */}
            <Modal
                isOpen={!!equipoSeleccionado}
                setIsOpen={(open) => {
                    if (!open) setEquipoSeleccionado(null);
                }}>
                <ModalHeader>Detalle del equipo</ModalHeader>
                <ModalBody>
                    {equipoSeleccionado && (
                        <div className='flex flex-col gap-4'>
                            <FilaDato
                                label='Nombre'
                                value={getNombreEquipo(equipoSeleccionado)}
                            />
                            <FilaDato
                                label='Número de serie'
                                value={equipoSeleccionado.datos_equipo?.numero_serie}
                            />
                            <FilaDato
                                label='Fecha de asignación'
                                value={
                                    equipoSeleccionado.fecha_asignacion
                                        ? dayjs(equipoSeleccionado.fecha_asignacion).format(
                                              'DD/MM/YYYY',
                                          )
                                        : null
                                }
                            />
                            <FilaDato
                                label='Fecha de devolución'
                                value={
                                    equipoSeleccionado.fecha_devolucion
                                        ? dayjs(equipoSeleccionado.fecha_devolucion).format(
                                              'DD/MM/YYYY',
                                          )
                                        : null
                                }
                            />
                            <FilaDato
                                label='Estado'
                                value={
                                    <Badge
                                        color={
                                            equipoSeleccionado.estado ? 'emerald' : 'zinc'
                                        }>
                                        {equipoSeleccionado.estado ? 'Activo' : 'Devuelto'}
                                    </Badge>
                                }
                            />
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button onClick={() => setEquipoSeleccionado(null)}>Cerrar</Button>
                </ModalFooter>
            </Modal>
        </PageWrapper>
    );
};

export default DetalleUsuarioCliente;
