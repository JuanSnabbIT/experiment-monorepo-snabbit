import Label from '@/components/form/Label';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, {
    SubheaderLeft,
    SubheaderRight,
} from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { Pages } from '@/config/pages.config';
import { useGetDetalleUsuarioClienteQuery } from '@/store/slices/empresa/empresaApi';
import {
    useGetContratosTrabajadorPorUsuarioEmpresaQuery,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CrearContratoTrabajadorWizard from './modals/CrearContratoTrabajadorWizard';

// ── Tipos ──────────────────────────────────────────────────────────────────
type TTab = 'datos-personales' | 'contrato' | 'prevision' | 'cargas-familiares' | 'documentos';

const TABS: { id: TTab; label: string }[] = [
    { id: 'datos-personales', label: 'Datos personales' },
    { id: 'contrato', label: 'Contrato' },
    { id: 'prevision', label: 'Prevision' },
    { id: 'cargas-familiares', label: 'Cargas familiares' },
    { id: 'documentos', label: 'Documentos' },
];

const BADGE_CONTRATO: Record<string, 'amber' | 'blue' | 'emerald' | 'red' | 'zinc'> = {
    borrador: 'zinc',
    pendiente_aprobacion: 'amber',
    vigente: 'emerald',
    terminado: 'zinc',
    anulado: 'red',
};

// ── Helpers ────────────────────────────────────────────────────────────────
const Campo = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div>
        <Label className='text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>
            {label}
        </Label>
        <p className='mt-0.5 text-sm text-zinc-900 dark:text-zinc-100'>{value ?? '\u2014'}</p>
    </div>
);

// ── Componente principal ────────────────────────────────────────────────────
const DetalleTrabajador = () => {
    const navigate = useNavigate();
    const { ueId } = useParams<{ ueId: string }>();
    const [activeTab, setActiveTab] = useState<TTab>('datos-personales');
    const [wizardOpen, setWizardOpen] = useState(false);

    const {
        data: ue,
        isLoading,
        isError,
    } = useGetDetalleUsuarioClienteQuery(ueId!, { skip: !ueId });

    const { data: contratos = [], isLoading: cargandoContratos } =
        useGetContratosTrabajadorPorUsuarioEmpresaQuery(ueId!, { skip: !ueId });

    // ── Estados de carga / error ────────────────────────────────────────────
    if (isLoading) {
        return (
            <PageWrapper isProtectedRoute name='Detalle Trabajador' title='Detalle Trabajador'>
                <Container>
                    <p className='py-12 text-center text-zinc-400'>Cargando...</p>
                </Container>
            </PageWrapper>
        );
    }

    if (isError || !ue) {
        return (
            <PageWrapper isProtectedRoute name='Detalle Trabajador' title='Detalle Trabajador'>
                <Container>
                    <p className='py-12 text-center text-red-500'>
                        No se pudo cargar el trabajador.
                    </p>
                </Container>
            </PageWrapper>
        );
    }

    const iniciales = [ue.first_name?.[0], ue.last_name?.[0]]
        .filter(Boolean)
        .join('')
        .toUpperCase() || '?';

    const nombreCompleto = [ue.first_name, ue.second_name, ue.last_name, ue.second_last_name]
        .filter(Boolean)
        .join(' ');

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <PageWrapper
            isProtectedRoute
            name='Detalle Trabajador'
            title={nombreCompleto || ue.nombre_usuario}>
            <Subheader>
                <SubheaderLeft>
                    <Button onClick={() => navigate(-1)} icon='HeroArrowLeft'>
                        Volver
                    </Button>
                </SubheaderLeft>
                <SubheaderRight>
                    <Button
                        variant='solid'
                        color='blue'
                        icon='HeroPlus'
                        onClick={() => setWizardOpen(true)}>
                        Nuevo Contrato
                    </Button>
                </SubheaderRight>
            </Subheader>

            <Container className='h-full w-full'>
                {/* Hero card */}
                <div className='mb-4 flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-6 py-4 dark:border-zinc-700 dark:bg-zinc-900'>
                    <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white'>
                        {iniciales}
                    </div>
                    <div className='min-w-0 flex-1'>
                        <h1 className='truncate text-lg font-bold text-zinc-900 dark:text-zinc-100'>
                            {nombreCompleto || ue.nombre_usuario}
                        </h1>
                        <p className='text-sm text-zinc-500'>{ue.email_usuario}</p>
                        {ue.papeleta?.rut && (
                            <p className='text-xs text-zinc-400'>{ue.papeleta.rut}</p>
                        )}
                    </div>
                    <div className='shrink-0 text-right'>
                        <p className='text-sm font-medium text-zinc-700 dark:text-zinc-300'>
                            {ue.nombre_sucursal}
                        </p>
                        <p className='mt-0.5 text-xs text-zinc-400'>{ue.cargo ?? '\u2014'}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className='mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-700'>
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            type='button'
                            onClick={() => setActiveTab(t.id)}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === t.id
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                            }`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── Tab: Datos personales ───────────────────────────────── */}
                {activeTab === 'datos-personales' && (
                    <Card>
                        <CardHeader>Datos personales</CardHeader>
                        <CardBody>
                            <div className='grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3'>
                                <Campo
                                    label='Nombre'
                                    value={
                                        [ue.first_name, ue.second_name]
                                            .filter(Boolean)
                                            .join(' ') || null
                                    }
                                />
                                <Campo
                                    label='Apellido'
                                    value={
                                        [ue.last_name, ue.second_last_name]
                                            .filter(Boolean)
                                            .join(' ') || null
                                    }
                                />
                                <Campo label='RUT' value={ue.papeleta?.rut} />
                                <Campo label='Email' value={ue.email_usuario} />
                                <Campo label='Celular' value={ue.celular} />
                                <Campo
                                    label='Fecha nacimiento'
                                    value={
                                        ue.fecha_nacimiento
                                            ? dayjs(ue.fecha_nacimiento).format('DD/MM/YYYY')
                                            : null
                                    }
                                />
                                <Campo label='Genero' value={ue.genero_label} />
                                <Campo label='Estado civil' value={ue.estado_civil_label} />
                                <Campo label='Nacionalidad' value={ue.nacionalidad} />
                                <Campo label='Direccion' value={ue.direccion} />
                                <Campo label='Region' value={ue.region_nombre} />
                                <Campo label='Provincia' value={ue.provincia_nombre} />
                                <Campo label='Comuna' value={ue.comuna_nombre} />
                                <Campo label='Nivel estudios' value={ue.nivel_estudios_label} />
                                <Campo
                                    label='Titulo / Especialidad'
                                    value={ue.titulo_especialidad}
                                />
                                <Campo
                                    label='Institucion educacional'
                                    value={ue.institucion_educacional}
                                />
                            </div>
                        </CardBody>
                    </Card>
                )}

                {/* ── Tab: Contrato ───────────────────────────────────────── */}
                {activeTab === 'contrato' && (
                    <Card>
                        <CardHeader>Contratos laborales</CardHeader>
                        <CardBody>
                            {cargandoContratos ? (
                                <p className='py-6 text-center text-zinc-400'>Cargando...</p>
                            ) : contratos.length === 0 ? (
                                <p className='py-8 text-center text-zinc-400'>
                                    Sin contratos registrados
                                </p>
                            ) : (
                                <Table>
                                    <THead>
                                        <Tr>
                                            <Th>N°</Th>
                                            <Th>Nombre</Th>
                                            <Th>Tipo</Th>
                                            <Th>Estado</Th>
                                            <Th>Inicio</Th>
                                            <Th>Termino</Th>
                                            <Th>Acciones</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {contratos.map((c) => (
                                            <Tr key={c.id}>
                                                <Td>
                                                    <span className='font-semibold text-zinc-600 dark:text-zinc-400'>
                                                        {c.id}
                                                    </span>
                                                </Td>
                                                <Td>{c.referencia_interna ?? '\u2014'}</Td>
                                                <Td>
                                                    <Badge variant='outline' color='blue'>
                                                        {c.tipo_contrato_label ?? c.tipo_contrato}
                                                    </Badge>
                                                </Td>
                                                <Td>
                                                    <Badge
                                                        color={BADGE_CONTRATO[c.estado] ?? 'zinc'}
                                                        variant='solid'>
                                                        {c.estado_label ?? c.estado}
                                                    </Badge>
                                                </Td>
                                                <Td>
                                                    {c.fecha_inicio
                                                        ? dayjs(c.fecha_inicio).format('DD/MM/YYYY')
                                                        : '\u2014'}
                                                </Td>
                                                <Td>
                                                    {c.fecha_termino ? (
                                                        dayjs(c.fecha_termino).format('DD/MM/YYYY')
                                                    ) : (
                                                        <span className='italic text-zinc-400'>
                                                            Indefinido
                                                        </span>
                                                    )}
                                                </Td>
                                                <Td>
                                                    <Tooltip text='Ver detalle'>
                                                        <Button
                                                            icon='HeroEye'
                                                            size='sm'
                                                            color='violet'
                                                            variant='solid'
                                                            onClick={() =>
                                                                navigate(
                                                                    Pages.rrhh.subPages.detalleContratoTrabajador.to.replace(
                                                                        ':contratoId',
                                                                        `${c.id}`,
                                                                    ),
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

                {/* ── Tab: Prevision ──────────────────────────────────────── */}
                {activeTab === 'prevision' && (
                    <Card>
                        <CardHeader>Datos previsionales y bancarios</CardHeader>
                        <CardBody>
                            <div className='grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3'>
                                <Campo label='AFP' value={ue.afp_nombre} />
                                <Campo label='Sistema de salud' value={ue.sistema_salud_label} />
                                <Campo label='Isapre' value={ue.nombre_isapre} />
                                <Campo label='Banco' value={ue.banco} />
                                <Campo
                                    label='Tipo de cuenta'
                                    value={ue.tipo_cuenta_bancaria_label}
                                />
                                <Campo
                                    label='Numero de cuenta'
                                    value={ue.numero_cuenta_bancaria}
                                />
                            </div>
                        </CardBody>
                    </Card>
                )}

                {/* ── Tab: Cargas familiares ──────────────────────────────── */}
                {activeTab === 'cargas-familiares' && (
                    <Card>
                        <CardHeader>Cargas familiares</CardHeader>
                        <CardBody>
                            {!ue.cargas_familiares?.length ? (
                                <p className='py-8 text-center text-zinc-400'>
                                    Sin cargas familiares registradas
                                </p>
                            ) : (
                                <Table>
                                    <THead>
                                        <Tr>
                                            <Th>Nombre</Th>
                                            <Th>RUT</Th>
                                            <Th>Parentesco</Th>
                                            <Th>Fecha nacimiento</Th>
                                            <Th>Estado</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {ue.cargas_familiares.map((cf) => (
                                            <Tr key={cf.id}>
                                                <Td>
                                                    {[
                                                        cf.nombres,
                                                        cf.apellido_paterno,
                                                        cf.apellido_materno,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' ')}
                                                </Td>
                                                <Td>{cf.rut}</Td>
                                                <Td>{cf.parentesco_label}</Td>
                                                <Td>
                                                    {cf.fecha_nacimiento
                                                        ? dayjs(cf.fecha_nacimiento).format(
                                                              'DD/MM/YYYY',
                                                          )
                                                        : '\u2014'}
                                                </Td>
                                                <Td>
                                                    <Badge
                                                        color={cf.is_activo ? 'emerald' : 'zinc'}
                                                        variant='solid'>
                                                        {cf.is_activo ? 'Activa' : 'Inactiva'}
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

                {/* ── Tab: Documentos ─────────────────────────────────────── */}
                {activeTab === 'documentos' && (
                    <Card>
                        <CardHeader>Documentos</CardHeader>
                        <CardBody>
                            {cargandoContratos ? (
                                <p className='py-6 text-center text-zinc-400'>Cargando...</p>
                            ) : contratos.filter((c) => c.archivo_pdf).length === 0 ? (
                                <p className='py-8 text-center text-zinc-400'>
                                    Sin documentos disponibles
                                </p>
                            ) : (
                                <div className='space-y-2'>
                                    {contratos
                                        .filter((c) => c.archivo_pdf)
                                        .map((c) => {
                                            const nombreArchivo =
                                                c.archivo_pdf!.split('/').pop() ?? 'contrato.pdf';
                                            return (
                                                <div
                                                    key={c.id}
                                                    className='flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                                    <div className='min-w-0 flex-1'>
                                                        <p className='truncate text-sm font-medium'>
                                                            {nombreArchivo}
                                                        </p>
                                                        <p className='text-xs text-zinc-400'>
                                                            {c.tipo_contrato_label ??
                                                                c.tipo_contrato}{' '}
                                                            &middot;{' '}
                                                            {dayjs(c.fecha_inicio).format(
                                                                'DD/MM/YYYY',
                                                            )}
                                                        </p>
                                                    </div>
                                                    <Badge
                                                        color={BADGE_CONTRATO[c.estado] ?? 'zinc'}
                                                        variant='solid'>
                                                        {c.estado_label ?? c.estado}
                                                    </Badge>
                                                    <Button
                                                        icon='HeroArrowDownTray'
                                                        size='sm'
                                                        onClick={() =>
                                                            window.open(c.archivo_pdf!, '_blank')
                                                        }>
                                                        Descargar
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </CardBody>
                    </Card>
                )}
            </Container>

            <CrearContratoTrabajadorWizard
                externalIsOpen={wizardOpen}
                onExternalClose={() => setWizardOpen(false)}
            />
        </PageWrapper>
    );
};

export default DetalleTrabajador;
