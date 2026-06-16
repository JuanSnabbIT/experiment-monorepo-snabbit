import React from 'react';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Breadcrumb from '@/components/layouts/Breadcrumb/Breadcrumb';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
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
    useActualizarFichaTrabajadorMutation,
    useGetDetalleClienteQuery,
    useGetDetalleUsuarioClienteQuery,
    useLazyGenerarCertificadoAntiguedadQuery,
} from '@/store/slices/empresa/empresaApi';
import {
    useCrearBancoInlineMutation,
    useGetAfpCatalogoQuery,
    useGetBancoCatalogoQuery,
} from '@/store/slices/rrhh/catalogosRrhhApi';
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
import { useFormik } from 'formik';
import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import CrearContratoTrabajadorWizard from '@/pages/RRHH/modals/CrearContratoTrabajadorWizard';
import TabVacaciones from './components/TabVacaciones';

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
    <div>
        <p className='text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
            {label}
        </p>
        <p className='mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-100'>{value ?? '—'}</p>
    </div>
);

// ── Opciones para selects en modales de edición ───────────────────────────────

const GENERO_OPTIONS: TSelectOption[] = [
    { value: '0', label: 'No especificado' },
    { value: '1', label: 'Masculino' },
    { value: '2', label: 'Femenino' },
];

const ESTADO_CIVIL_OPTIONS: TSelectOption[] = [
    { value: 'soltero', label: 'Soltero/a' },
    { value: 'casado', label: 'Casado/a' },
    { value: 'divorciado', label: 'Divorciado/a' },
    { value: 'viudo', label: 'Viudo/a' },
    { value: 'conviviente', label: 'Conviviente civil' },
];

const NIVEL_ESTUDIOS_OPTIONS: TSelectOption[] = [
    { value: 'basica', label: 'Educación básica' },
    { value: 'media', label: 'Educación media' },
    { value: 'tecnico_nivel_medio', label: 'Técnico nivel medio' },
    { value: 'tecnico_nivel_superior', label: 'Técnico nivel superior' },
    { value: 'universitario', label: 'Universitario' },
    { value: 'postgrado', label: 'Postgrado / Magíster / Doctorado' },
];

const SISTEMA_SALUD_OPTIONS: TSelectOption[] = [
    { value: 'fonasa', label: 'Fonasa' },
    { value: 'isapre', label: 'Isapre' },
    { value: 'otro', label: 'Otro' },
];

const TIPO_CUENTA_OPTIONS: TSelectOption[] = [
    { value: 'corriente', label: 'Cuenta corriente' },
    { value: 'vista', label: 'Cuenta vista' },
    { value: 'ahorro', label: 'Cuenta de ahorro' },
    { value: 'rut', label: 'Cuenta RUT' },
];

// ── Tipos de pestaña ──────────────────────────────────────────────────────────

type TTab = 'personal' | 'contrato' | 'cargas' | 'vacaciones' | 'equipos' | 'licencias';

const VALID_TABS: TTab[] = ['personal', 'contrato', 'cargas', 'vacaciones', 'equipos', 'licencias'];

// ── Sub-componente: tab Personal + Previsión ──────────────────────────────────

interface ITabPersonalProps {
    usuario: import('@/interface/empresas.interface').IUsuarioEmpresa | null;
    contratoPendiente: import('@/interface/rrhh.interface').IContratoTrabajador | null;
    datosPendiente: import('@/interface/rrhh.interface').IContratoTrabajador['datos_trabajador_nuevo'];
    esPendiente: boolean;
    usuarioEmpresaId: number;
    actualizarFicha: ReturnType<typeof useActualizarFichaTrabajadorMutation>[0];
    modalPersonal: boolean; setModalPersonal: React.Dispatch<React.SetStateAction<boolean>>;
    modalContacto: boolean; setModalContacto: React.Dispatch<React.SetStateAction<boolean>>;
    modalEducacion: boolean; setModalEducacion: React.Dispatch<React.SetStateAction<boolean>>;
    modalPrevision: boolean; setModalPrevision: React.Dispatch<React.SetStateAction<boolean>>;
    modalBanco: boolean; setModalBanco: React.Dispatch<React.SetStateAction<boolean>>;
}

const TabPersonalConPrevision = ({
    usuario,
    contratoPendiente,
    datosPendiente,
    esPendiente,
    usuarioEmpresaId,
    actualizarFicha,
    modalPersonal, setModalPersonal,
    modalContacto, setModalContacto,
    modalEducacion, setModalEducacion,
    modalPrevision, setModalPrevision,
    modalBanco, setModalBanco,
}: ITabPersonalProps) => {
    const [guardando, setGuardando] = useState(false);

    const { data: afpList = [] } = useGetAfpCatalogoQuery(undefined, { skip: !modalPrevision });
    const { data: bancoList = [] } = useGetBancoCatalogoQuery(undefined, { skip: !modalBanco });
    const [crearBanco] = useCrearBancoInlineMutation();

    const afpOptions: TSelectOption[] = afpList.map((a) => ({ value: String(a.id), label: a.nombre }));
    const bancoOptions: TSelectOption[] = bancoList.map((b) => ({ value: b.nombre, label: b.nombre }));

    const submitFicha = async (data: Record<string, unknown>, onClose: () => void) => {
        setGuardando(true);
        try {
            await actualizarFicha({ id: usuarioEmpresaId, data }).unwrap();
            toast.success('Datos actualizados');
            onClose();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setGuardando(false);
        }
    };

    // ── Formiks ───────────────────────────────────────────────────────────────

    const fPersonal = useFormik({
        enableReinitialize: true,
        initialValues: {
            first_name: usuario?.first_name ?? '',
            second_name: usuario?.second_name ?? '',
            last_name: usuario?.last_name ?? '',
            second_last_name: usuario?.second_last_name ?? '',
            fecha_nacimiento: usuario?.fecha_nacimiento ?? '',
            genero: usuario?.genero ?? '0',
            estado_civil: usuario?.estado_civil ?? '',
            nacionalidad: usuario?.nacionalidad ?? '',
        },
        onSubmit: (values) => submitFicha(values, () => setModalPersonal(false)),
    });

    const fContacto = useFormik({
        enableReinitialize: true,
        initialValues: {
            celular: usuario?.celular ?? '',
            direccion: usuario?.direccion ?? '',
        },
        onSubmit: (values) => submitFicha(values, () => setModalContacto(false)),
    });

    const fEducacion = useFormik({
        enableReinitialize: true,
        initialValues: {
            nivel_estudios: usuario?.nivel_estudios ?? '',
            titulo_especialidad: usuario?.titulo_especialidad ?? '',
            institucion_educacional: usuario?.institucion_educacional ?? '',
        },
        onSubmit: (values) => submitFicha(values, () => setModalEducacion(false)),
    });

    const fPrevision = useFormik({
        enableReinitialize: true,
        initialValues: {
            afp: usuario?.afp ? String(usuario.afp) : '',
            sistema_salud: usuario?.sistema_salud ?? '',
            nombre_isapre: usuario?.nombre_isapre ?? '',
        },
        onSubmit: (values) => submitFicha({
            afp: values.afp || null,
            sistema_salud: values.sistema_salud || null,
            nombre_isapre: values.sistema_salud === 'isapre' ? values.nombre_isapre || null : null,
        }, () => setModalPrevision(false)),
    });

    const fBanco = useFormik({
        enableReinitialize: true,
        initialValues: {
            banco: usuario?.banco ?? '',
            tipo_cuenta_bancaria: usuario?.tipo_cuenta_bancaria ?? '',
            numero_cuenta_bancaria: usuario?.numero_cuenta_bancaria ?? '',
        },
        onSubmit: (values) => submitFicha(values, () => setModalBanco(false)),
    });

    // ── Datos para modo lectura ────────────────────────────────────────────────

    const rut = esPendiente
        ? (contratoPendiente?.rut_trabajador ?? datosPendiente?.rut ?? null)
        : (usuario?.papeleta?.rut ?? null);
    const email = esPendiente
        ? (contratoPendiente?.email_trabajador ?? datosPendiente?.email ?? null)
        : (usuario?.email_usuario ?? null);

    const saludLabel = usuario?.sistema_salud === 'fonasa'
        ? 'Fonasa'
        : usuario?.sistema_salud === 'isapre'
            ? `Isapre${usuario.nombre_isapre ? ` — ${usuario.nombre_isapre}` : ''}`
            : usuario?.sistema_salud === 'otro'
                ? 'Otro'
                : null;

    const editBtn = (onClick: () => void) => (
        <Tooltip text='Editar'>
            <Button variant='solid' icon='HeroPencil' size='sm' onClick={onClick} />
        </Tooltip>
    );

    return (
        <div className='space-y-4'>
            {/* ── Identificación ─────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <span>Identificación</span>
                    {!esPendiente && editBtn(() => setModalPersonal(true))}
                </CardHeader>
                <CardBody>
                    <div className='grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4'>
                        <FilaDato label='RUT' value={rut ? formatRut(rut) : '—'} />
                        {!esPendiente ? (
                            <>
                                <FilaDato
                                    label='Primer nombre'
                                    value={usuario!.first_name}
                                />
                                <FilaDato
                                    label='Segundo nombre'
                                    value={usuario!.second_name}
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
                                <FilaDato label='Género' value={usuario!.genero_label} />
                                <FilaDato label='Nacionalidad' value={usuario!.nacionalidad} />
                                <FilaDato label='Estado civil' value={usuario!.estado_civil_label} />
                            </>
                        ) : (
                            <>
                                <FilaDato label='Correo electrónico' value={email} />
                                <FilaDato
                                    label='Fecha de nacimiento'
                                    value={
                                        datosPendiente?.fecha_nacimiento
                                            ? dayjs(datosPendiente.fecha_nacimiento).format('DD/MM/YYYY')
                                            : null
                                    }
                                />
                                <FilaDato label='Nacionalidad' value={datosPendiente?.nacionalidad} />
                            </>
                        )}
                    </div>
                </CardBody>
            </Card>

            {/* ── Contacto ───────────────────────────────────────────────── */}
            {!esPendiente && (
                <Card>
                    <CardHeader>
                        <span>Contacto</span>
                        {editBtn(() => setModalContacto(true))}
                    </CardHeader>
                    <CardBody>
                        <div className='grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3'>
                            <FilaDato label='Correo electrónico' value={email} />
                            <FilaDato label='Teléfono' value={usuario!.celular} />
                            <FilaDato label='Dirección' value={usuario!.direccion} />
                            <FilaDato label='Región' value={usuario!.region_nombre} />
                            <FilaDato label='Provincia' value={usuario!.provincia_nombre} />
                            <FilaDato label='Comuna' value={usuario!.comuna_nombre} />
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* ── Educación ──────────────────────────────────────────────── */}
            {!esPendiente && (
                <Card>
                    <CardHeader>
                        <span>Educación</span>
                        {editBtn(() => setModalEducacion(true))}
                    </CardHeader>
                    <CardBody>
                        <div className='grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3'>
                            <FilaDato label='Nivel de estudios' value={usuario!.nivel_estudios_label} />
                            <FilaDato label='Título / especialidad' value={usuario!.titulo_especialidad} />
                            <FilaDato label='Institución' value={usuario!.institucion_educacional} />
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* ── Previsión + Banco (side-by-side) ──────────────────────── */}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <Card>
                    <CardHeader>
                        <span>Previsión y Salud</span>
                        {!esPendiente && editBtn(() => setModalPrevision(true))}
                    </CardHeader>
                    <CardBody>
                        {usuario?.afp_nombre || saludLabel || datosPendiente?.afp ? (
                            <div className='grid grid-cols-1 gap-4'>
                                <FilaDato
                                    label='AFP'
                                    value={esPendiente ? datosPendiente?.afp : usuario!.afp_nombre}
                                />
                                <FilaDato
                                    label='Sistema de salud'
                                    value={
                                        esPendiente
                                            ? datosPendiente?.sistema_salud
                                            : saludLabel
                                    }
                                />
                            </div>
                        ) : (
                            <p className='text-sm text-zinc-400'>Sin datos previsionales.</p>
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <span>Datos Bancarios</span>
                        {!esPendiente && editBtn(() => setModalBanco(true))}
                    </CardHeader>
                    <CardBody>
                        {usuario?.banco || usuario?.tipo_cuenta_bancaria || datosPendiente?.banco ? (
                            <div className='grid grid-cols-1 gap-4'>
                                <FilaDato
                                    label='Banco'
                                    value={esPendiente ? datosPendiente?.banco : usuario!.banco}
                                />
                                <FilaDato
                                    label='Tipo de cuenta'
                                    value={
                                        esPendiente
                                            ? datosPendiente?.tipo_cuenta_bancaria
                                            : usuario!.tipo_cuenta_bancaria_label
                                    }
                                />
                                <FilaDato
                                    label='N° de cuenta'
                                    value={
                                        esPendiente
                                            ? datosPendiente?.numero_cuenta_bancaria
                                            : usuario!.numero_cuenta_bancaria
                                    }
                                />
                            </div>
                        ) : (
                            <p className='text-sm text-zinc-400'>Sin datos bancarios.</p>
                        )}
                    </CardBody>
                </Card>
            </div>

            {/* ════════════════════════════════════════════════════════════ */}
            {/* Modales de edición                                          */}
            {/* ════════════════════════════════════════════════════════════ */}

            {/* Modal: Identificación */}
            <Modal isOpen={modalPersonal} setIsOpen={setModalPersonal}>
                <ModalHeader>Editar identificación</ModalHeader>
                <ModalBody>
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <div>
                            <Label htmlFor='mp_first_name'>Primer nombre</Label>
                            <Input id='mp_first_name' name='first_name' value={fPersonal.values.first_name} onChange={fPersonal.handleChange} />
                        </div>
                        <div>
                            <Label htmlFor='mp_second_name'>Segundo nombre</Label>
                            <Input id='mp_second_name' name='second_name' value={fPersonal.values.second_name} onChange={fPersonal.handleChange} />
                        </div>
                        <div>
                            <Label htmlFor='mp_last_name'>Apellido paterno</Label>
                            <Input id='mp_last_name' name='last_name' value={fPersonal.values.last_name} onChange={fPersonal.handleChange} />
                        </div>
                        <div>
                            <Label htmlFor='mp_second_last_name'>Apellido materno</Label>
                            <Input id='mp_second_last_name' name='second_last_name' value={fPersonal.values.second_last_name} onChange={fPersonal.handleChange} />
                        </div>
                        <div>
                            <Label htmlFor='mp_fecha_nacimiento'>Fecha de nacimiento</Label>
                            <Input id='mp_fecha_nacimiento' name='fecha_nacimiento' type='date' value={fPersonal.values.fecha_nacimiento} onChange={fPersonal.handleChange} />
                        </div>
                        <div>
                            <Label htmlFor='mp_genero'>Género</Label>
                            <SelectReact
                                id='mp_genero'
                                name='genero'
                                options={GENERO_OPTIONS}
                                value={GENERO_OPTIONS.find((o) => o.value === fPersonal.values.genero) ?? null}
                                onChange={(opt) => fPersonal.setFieldValue('genero', (opt as TSelectOption)?.value ?? '0')}
                            />
                        </div>
                        <div>
                            <Label htmlFor='mp_estado_civil'>Estado civil</Label>
                            <SelectReact
                                id='mp_estado_civil'
                                name='estado_civil'
                                isClearable
                                options={ESTADO_CIVIL_OPTIONS}
                                value={ESTADO_CIVIL_OPTIONS.find((o) => o.value === fPersonal.values.estado_civil) ?? null}
                                onChange={(opt) => fPersonal.setFieldValue('estado_civil', (opt as TSelectOption)?.value ?? '')}
                            />
                        </div>
                        <div>
                            <Label htmlFor='mp_nacionalidad'>Nacionalidad</Label>
                            <Input id='mp_nacionalidad' name='nacionalidad' value={fPersonal.values.nacionalidad} onChange={fPersonal.handleChange} />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button type='button' onClick={() => setModalPersonal(false)} isDisable={guardando}>Cancelar</Button>
                    <Button variant='solid' type='button' onClick={() => fPersonal.handleSubmit()} isLoading={guardando}>Guardar</Button>
                </ModalFooter>
            </Modal>

            {/* Modal: Contacto */}
            <Modal isOpen={modalContacto} setIsOpen={setModalContacto}>
                <ModalHeader>Editar contacto</ModalHeader>
                <ModalBody>
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <div>
                            <Label htmlFor='mc_celular'>Teléfono</Label>
                            <Input id='mc_celular' name='celular' value={fContacto.values.celular} onChange={fContacto.handleChange} placeholder='+569...' />
                        </div>
                        <div className='sm:col-span-2'>
                            <Label htmlFor='mc_direccion'>Dirección</Label>
                            <Input id='mc_direccion' name='direccion' value={fContacto.values.direccion} onChange={fContacto.handleChange} />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button type='button' onClick={() => setModalContacto(false)} isDisable={guardando}>Cancelar</Button>
                    <Button variant='solid' type='button' onClick={() => fContacto.handleSubmit()} isLoading={guardando}>Guardar</Button>
                </ModalFooter>
            </Modal>

            {/* Modal: Educación */}
            <Modal isOpen={modalEducacion} setIsOpen={setModalEducacion}>
                <ModalHeader>Editar educación</ModalHeader>
                <ModalBody>
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <div className='sm:col-span-2'>
                            <Label htmlFor='me_nivel'>Nivel de estudios</Label>
                            <SelectReact
                                id='me_nivel'
                                name='nivel_estudios'
                                isClearable
                                options={NIVEL_ESTUDIOS_OPTIONS}
                                value={NIVEL_ESTUDIOS_OPTIONS.find((o) => o.value === fEducacion.values.nivel_estudios) ?? null}
                                onChange={(opt) => fEducacion.setFieldValue('nivel_estudios', (opt as TSelectOption)?.value ?? '')}
                            />
                        </div>
                        <div>
                            <Label htmlFor='me_titulo'>Título / especialidad</Label>
                            <Input id='me_titulo' name='titulo_especialidad' value={fEducacion.values.titulo_especialidad} onChange={fEducacion.handleChange} />
                        </div>
                        <div>
                            <Label htmlFor='me_institucion'>Institución</Label>
                            <Input id='me_institucion' name='institucion_educacional' value={fEducacion.values.institucion_educacional} onChange={fEducacion.handleChange} />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button type='button' onClick={() => setModalEducacion(false)} isDisable={guardando}>Cancelar</Button>
                    <Button variant='solid' type='button' onClick={() => fEducacion.handleSubmit()} isLoading={guardando}>Guardar</Button>
                </ModalFooter>
            </Modal>

            {/* Modal: Previsión */}
            <Modal isOpen={modalPrevision} setIsOpen={setModalPrevision}>
                <ModalHeader>Editar previsión y salud</ModalHeader>
                <ModalBody>
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <div className='sm:col-span-2'>
                            <Label htmlFor='mpv_afp'>AFP</Label>
                            <SelectReact
                                id='mpv_afp'
                                name='afp'
                                isClearable
                                options={afpOptions}
                                value={afpOptions.find((o) => o.value === fPrevision.values.afp) ?? null}
                                onChange={(opt) => fPrevision.setFieldValue('afp', (opt as TSelectOption)?.value ?? '')}
                                placeholder='Selecciona AFP...'
                            />
                        </div>
                        <div>
                            <Label htmlFor='mpv_salud'>Sistema de salud</Label>
                            <SelectReact
                                id='mpv_salud'
                                name='sistema_salud'
                                isClearable
                                options={SISTEMA_SALUD_OPTIONS}
                                value={SISTEMA_SALUD_OPTIONS.find((o) => o.value === fPrevision.values.sistema_salud) ?? null}
                                onChange={(opt) => fPrevision.setFieldValue('sistema_salud', (opt as TSelectOption)?.value ?? '')}
                                placeholder='Fonasa / Isapre...'
                            />
                        </div>
                        {fPrevision.values.sistema_salud === 'isapre' && (
                            <div>
                                <Label htmlFor='mpv_isapre'>Nombre Isapre</Label>
                                <Input id='mpv_isapre' name='nombre_isapre' value={fPrevision.values.nombre_isapre} onChange={fPrevision.handleChange} placeholder='Banmédica, Cruz Blanca...' />
                            </div>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button type='button' onClick={() => setModalPrevision(false)} isDisable={guardando}>Cancelar</Button>
                    <Button variant='solid' type='button' onClick={() => fPrevision.handleSubmit()} isLoading={guardando}>Guardar</Button>
                </ModalFooter>
            </Modal>

            {/* Modal: Banco */}
            <Modal isOpen={modalBanco} setIsOpen={setModalBanco}>
                <ModalHeader>Editar datos bancarios</ModalHeader>
                <ModalBody>
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <div>
                            <Label htmlFor='mb_banco'>Banco</Label>
                            <SelectReact
                                id='mb_banco'
                                name='banco'
                                isCreatable
                                isClearable
                                options={bancoOptions}
                                value={fBanco.values.banco ? { value: fBanco.values.banco, label: fBanco.values.banco } : null}
                                onChange={(opt) => fBanco.setFieldValue('banco', (opt as TSelectOption)?.value ?? '')}
                                onCreateOption={async (nombre) => {
                                    try { await crearBanco({ nombre }).unwrap(); } catch { /* ok */ }
                                    fBanco.setFieldValue('banco', nombre);
                                }}
                                formatCreateLabel={(v) => `Agregar: "${v}"`}
                                placeholder='Selecciona o escribe...'
                            />
                        </div>
                        <div>
                            <Label htmlFor='mb_tipo'>Tipo de cuenta</Label>
                            <SelectReact
                                id='mb_tipo'
                                name='tipo_cuenta_bancaria'
                                isClearable
                                options={TIPO_CUENTA_OPTIONS}
                                value={TIPO_CUENTA_OPTIONS.find((o) => o.value === fBanco.values.tipo_cuenta_bancaria) ?? null}
                                onChange={(opt) => fBanco.setFieldValue('tipo_cuenta_bancaria', (opt as TSelectOption)?.value ?? '')}
                                placeholder='Tipo...'
                            />
                        </div>
                        <div className='sm:col-span-2'>
                            <Label htmlFor='mb_numero'>Número de cuenta</Label>
                            <Input id='mb_numero' name='numero_cuenta_bancaria' value={fBanco.values.numero_cuenta_bancaria} onChange={fBanco.handleChange} placeholder='00000000' />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button type='button' onClick={() => setModalBanco(false)} isDisable={guardando}>Cancelar</Button>
                    <Button variant='solid' type='button' onClick={() => fBanco.handleSubmit()} isLoading={guardando}>Guardar</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

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
    const [actualizarFicha] = useActualizarFichaTrabajadorMutation();
    const [fetchCertificado, { isFetching: generandoCertificado }] =
        useLazyGenerarCertificadoAntiguedadQuery();

    // ── Estado local ──────────────────────────────────────────────────────────

    const [equipoSeleccionado, setEquipoSeleccionado] = useState<
        (typeof equipos)[number] | null
    >(null);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [modalPersonal, setModalPersonal] = useState(false);
    const [modalContacto, setModalContacto] = useState(false);
    const [modalEducacion, setModalEducacion] = useState(false);
    const [modalPrevision, setModalPrevision] = useState(false);
    const [modalBanco, setModalBanco] = useState(false);

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

    const handleCertificadoAntiguedad = async () => {
        if (!refId) return;
        try {
            const blob = await fetchCertificado(refId).unwrap();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch {
            toast.error('No se pudo generar el certificado de antigüedad.');
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

    const TABS_PENDIENTE: TTab[] = ['personal', 'contrato', 'cargas'];
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
                {!esPendiente && (
                    <SubheaderRight>
                        <Button
                            icon='HeroDocumentText'
                            color='zinc'
                            variant='outlined'
                            isLoading={generandoCertificado}
                            onClick={handleCertificadoAntiguedad}>
                            Certificado de Antigüedad
                        </Button>
                    </SubheaderRight>
                )}
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
                    {(() => {
                        const TAB_LABELS: Record<TTab, string> = {
                            personal: 'Datos personales',
                            contrato: 'Contrato',
                            cargas: 'Cargas familiares',
                            vacaciones: 'Vacaciones',
                            equipos: 'Equipos',
                            licencias: 'Licencias de software',
                        };
                        const TAB_BADGES: Partial<Record<TTab, React.ReactNode>> = {
                            cargas:
                                cargasFamiliares.length > 0 ? (
                                    <Badge color='blue' className='ml-1'>
                                        {cargasFamiliares.length}
                                    </Badge>
                                ) : null,
                            equipos:
                                equiposActivos > 0 ? (
                                    <Badge color='blue' className='ml-1'>
                                        {equiposActivos}
                                    </Badge>
                                ) : null,
                            licencias:
                                licencias.length > 0 ? (
                                    <Badge color='blue' className='ml-1'>
                                        {licencias.length}
                                    </Badge>
                                ) : null,
                        };
                        const renderTab = (tab: TTab) => {
                            const isActive = activeTab === tab;
                            const props = isActive
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
                            return (
                                <Button key={tab} {...props} onClick={() => setActiveTab(tab)}>
                                    {TAB_LABELS[tab]}
                                    {TAB_BADGES[tab]}
                                </Button>
                            );
                        };
                        const LEFT_TABS: TTab[] = ['personal', 'cargas', 'vacaciones', 'contrato'];
                        const RIGHT_TABS: TTab[] = ['equipos', 'licencias'];
                        const leftVisible = LEFT_TABS.filter((t) => tabsActivos.includes(t));
                        const rightVisible = RIGHT_TABS.filter((t) => tabsActivos.includes(t));
                        return (
                            <div className='flex flex-wrap items-center gap-2'>
                                {leftVisible.map(renderTab)}
                                {rightVisible.length > 0 && (
                                    <>
                                        <div className='flex-1' />
                                        <div className='flex flex-wrap gap-2'>
                                            {rightVisible.map(renderTab)}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })()}

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* Tab: Datos personales + Previsión                     */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {activeTab === 'personal' && (() => {
                        const uId = Number(refId);
                        return (
                            <TabPersonalConPrevision
                                usuario={esPendiente ? null : usuario!}
                                contratoPendiente={esPendiente ? contratoPendiente! : null}
                                datosPendiente={datosPendiente}
                                esPendiente={esPendiente}
                                usuarioEmpresaId={uId}
                                actualizarFicha={actualizarFicha}
                                modalPersonal={modalPersonal}
                                setModalPersonal={setModalPersonal}
                                modalContacto={modalContacto}
                                setModalContacto={setModalContacto}
                                modalEducacion={modalEducacion}
                                setModalEducacion={setModalEducacion}
                                modalPrevision={modalPrevision}
                                setModalPrevision={setModalPrevision}
                                modalBanco={modalBanco}
                                setModalBanco={setModalBanco}
                            />
                        );
                    })()}

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* Tab: Contrato laboral                                 */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {activeTab === 'contrato' && (() => {
                        const c = esPendiente ? contratoPendiente! : contrato;
                        return (
                            <div className='space-y-4'>
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

                                {!esPendiente && (
                                    <Card>
                                        <CardHeader>
                                            <CardHeaderChild>
                                                <span className='font-semibold'>
                                                    Historial de contratos
                                                </span>
                                                {documentosLaborales.length > 0 && (
                                                    <Badge color='zinc'>
                                                        {documentosLaborales.length}
                                                    </Badge>
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
                                                        {documentosLaborales.map((doc) => {
                                                            const esActual =
                                                                doc.id === contrato?.id ||
                                                                doc.estado === 'vigente';
                                                            return (
                                                                <Tr
                                                                    key={doc.id}
                                                                    className={
                                                                        esActual
                                                                            ? 'bg-emerald-50 dark:bg-emerald-900/10'
                                                                            : ''
                                                                    }>
                                                                    <Td>
                                                                        <span
                                                                            className={
                                                                                esActual
                                                                                    ? 'font-semibold'
                                                                                    : ''
                                                                            }>
                                                                            {doc.tipo_contrato_label}
                                                                        </span>
                                                                    </Td>
                                                                    <Td>
                                                                        <div className='flex items-center gap-1.5'>
                                                                            <Badge
                                                                                color={
                                                                                    doc.estado ===
                                                                                    'vigente'
                                                                                        ? 'emerald'
                                                                                        : doc.estado ===
                                                                                            'pendiente_aprobacion'
                                                                                          ? 'amber'
                                                                                          : 'zinc'
                                                                                }>
                                                                                {doc.estado_label}
                                                                            </Badge>
                                                                            {esActual && (
                                                                                <Badge color='emerald' variant='outline'>
                                                                                    Actual
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </Td>
                                                                    <Td>
                                                                        {dayjs(
                                                                            doc.fecha_inicio,
                                                                        ).format('DD/MM/YYYY')}
                                                                    </Td>
                                                                    <Td>
                                                                        {doc.fecha_termino
                                                                            ? dayjs(
                                                                                  doc.fecha_termino,
                                                                              ).format('DD/MM/YYYY')
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
                                                            );
                                                        })}
                                                    </TBody>
                                                </Table>
                                            )}
                                        </CardBody>
                                    </Card>
                                )}
                            </div>
                        );
                    })()}

                    {/* ══════════════════════════════════════════════════════ */}
                    {/* Tab: Vacaciones                                       */}
                    {/* ══════════════════════════════════════════════════════ */}
                    {activeTab === 'vacaciones' && !esPendiente && (
                        <TabVacaciones usuario={usuario!} />
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
