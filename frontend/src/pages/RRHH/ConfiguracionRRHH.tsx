import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild, CardTitle } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import type { ITurnoLaboral, ITurnoLaboralWrite } from '@/interface/rrhh.interface';
import TabGruposTurnos from '@/pages/RRHH/components/TabGruposTurnos';
import { useAppDispatch, useAppSelector } from '@/store';
import { useGetPlantillasV2Query } from '@/store/slices/contratos/plantillaContratoV2Api';
import { listaMisClientesThunk } from '@/store/slices/empresa/empresaSlice';
import {
    useCrearAfpInlineMutation,
    useCrearBancoInlineMutation,
    useEliminarAfpMutation,
    useEliminarBancoMutation,
    useGetAfpCatalogoQuery,
    useGetBancoCatalogoQuery,
} from '@/store/slices/rrhh/catalogosRrhhApi';
import {
    useActualizarConfiguracionLaboralMutation,
    useCrearConfiguracionLaboralMutation,
    useGetConfiguracionLaboralQuery,
    type IConfiguracionLaboral,
} from '@/store/slices/rrhh/configuracionLaboralApi';
import {
    useCrearTurnoLaboralMutation,
    useEditarTurnoLaboralMutation,
    useEliminarTurnoLaboralMutation,
    useGetTurnosLaboralQuery,
} from '@/store/slices/rrhh/turnoLaboralApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert } from '@/utils/sweetAlert';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const DIAS_SEMANA = [
    { key: 'L', label: 'Lunes' },
    { key: 'M', label: 'Martes' },
    { key: 'X', label: 'Miercoles' },
    { key: 'J', label: 'Jueves' },
    { key: 'V', label: 'Viernes' },
    { key: 'S', label: 'Sabado' },
    { key: 'D', label: 'Domingo' },
];

type TTabId = 'parametros' | 'afp' | 'bancos' | 'turnos' | 'plantillas' | 'grupos_turnos';

const TABS: { id: TTabId; label: string }[] = [
    { id: 'parametros', label: 'Parámetros' },
    { id: 'afp', label: 'AFP' },
    { id: 'bancos', label: 'Bancos' },
    { id: 'turnos', label: 'Turnos' },
    { id: 'plantillas', label: 'Plantillas' },
    { id: 'grupos_turnos', label: 'Grupos de Turnos' },
];

const BadgeAmbito = ({ esGlobal }: { esGlobal: boolean }) =>
    esGlobal ? (
        <Badge variant='outline' color='zinc'>
            Global
        </Badge>
    ) : (
        <Badge variant='outline' color='violet'>
            De empresa
        </Badge>
    );

interface ITabProps {
    empresaId: number | null;
}

interface IConfiguracionRRHHProps {
    embedded?: boolean;
    empresaIdFijo?: number | null;
    nombreEmpresa?: string;
}

// ── Tab Parámetros ───────────────────────────────────────────────────────────
const TabParametros = ({ empresaId }: ITabProps) => {
    const { data: params = [], isLoading } = useGetConfiguracionLaboralQuery(
        empresaId ? { empresa_id: empresaId } : undefined,
    );
    const [crear] = useCrearConfiguracionLaboralMutation();
    const [actualizar] = useActualizarConfiguracionLaboralMutation();

    const [editId, setEditId] = useState<number | null>(null);
    const [editValor, setEditValor] = useState('');

    const guardar = async (item: IConfiguracionLaboral) => {
        try {
            await actualizar({ id: item.id, valor: Number(editValor) }).unwrap();
            toast.success('Parámetro actualizado.');
            setEditId(null);
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const crearOverride = async (item: IConfiguracionLaboral) => {
        if (!empresaId) return;
        try {
            // TODO RBAC: validar permiso explicito para crear overrides por empresa.
            await crear({
                clave: item.clave,
                valor: item.valor,
                descripcion: item.descripcion,
                empresa_id: empresaId,
            }).unwrap();
            toast.success('Override creado para la empresa.');
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    if (isLoading) return <p className='py-6 text-center text-sm text-zinc-400'>Cargando...</p>;

    return (
        <Table>
            <THead>
                <Tr>
                    <Th>Clave</Th>
                    <Th>Valor</Th>
                    <Th>Descripción</Th>
                    <Th>Ámbito</Th>
                    <Th> </Th>
                </Tr>
            </THead>
            <TBody>
                {params.map((item) => (
                    <Tr key={item.id}>
                        <Td className='font-mono text-xs font-medium'>{item.clave}</Td>
                        <Td>
                            {editId === item.id ? (
                                <Input
                                    name='valor'
                                    type='number'
                                    value={editValor}
                                    onChange={(e) => setEditValor(e.target.value)}
                                    className='w-32'
                                />
                            ) : (
                                <span className='font-medium'>{item.valor}</span>
                            )}
                        </Td>
                        <Td className='text-xs text-zinc-500 dark:text-zinc-400'>{item.descripcion || '—'}</Td>
                        <Td><BadgeAmbito esGlobal={item.es_global} /></Td>
                        <Td>
                            {item.es_global ? (
                                empresaId ? (
                                    <Button size='sm' variant='outline' onClick={() => crearOverride(item)}>
                                        Crear ajuste
                                    </Button>
                                ) : null
                            ) : editId === item.id ? (
                                <div className='flex gap-1'>
                                    <Button size='sm' variant='solid' color='blue' onClick={() => guardar(item)}>
                                        Guardar
                                    </Button>
                                    <Button size='sm' onClick={() => setEditId(null)}>Cancelar</Button>
                                </div>
                            ) : (
                                <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={() => { setEditId(item.id); setEditValor(String(item.valor)); }}>
                                    Editar
                                </Button>
                            )}
                        </Td>
                    </Tr>
                ))}
            </TBody>
        </Table>
    );
};

// ── Tab AFP ──────────────────────────────────────────────────────────────────
const TabAfp = ({ empresaId }: ITabProps) => {
    const { data: afps = [], isLoading } = useGetAfpCatalogoQuery(
        empresaId ? { empresa_id: empresaId } : undefined,
    );
    const [crear, { isLoading: creando }] = useCrearAfpInlineMutation();
    const [eliminar] = useEliminarAfpMutation();
    const [nuevoNombre, setNuevoNombre] = useState('');

    const agregar = async () => {
        if (!nuevoNombre.trim() || !empresaId) return;
        try {
            // TODO RBAC: validar permiso explicito para crear catalogos AFP por empresa.
            await crear({ nombre: nuevoNombre.trim(), empresa_id: empresaId }).unwrap();
            toast.success('AFP agregada.');
            setNuevoNombre('');
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const borrar = async (id: number, nombre: string) => {
        const ok = await confirmAlert({
            title: `¿Eliminar AFP "${nombre}"?`,
            text: 'Esta acción no se puede deshacer.',
            confirmText: 'Eliminar', cancelText: 'Cancelar', icon: 'warning', confirmColor: '#ef4444',
        });
        if (!ok) return;
        try {
            // TODO RBAC: validar permiso explicito para eliminar catalogos AFP por empresa.
            await eliminar(id).unwrap();
            toast.success('AFP eliminada.');
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    if (isLoading) return <p className='py-6 text-center text-sm text-zinc-400'>Cargando...</p>;

    return (
        <div className='space-y-4'>
            {empresaId && (
                <div className='flex items-end gap-2'>
                    <div className='flex-1'>
                        <Label htmlFor='nueva_afp'>Agregar AFP de empresa</Label>
                        <Input id='nueva_afp' name='nueva_afp' value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder='Nombre de la AFP' />
                    </div>
                    <Button variant='solid' color='blue' isDisable={creando || !nuevoNombre.trim()} onClick={agregar}>
                        Agregar
                    </Button>
                </div>
            )}
            <Table>
                <THead>
                    <Tr>
                        <Th>Nombre</Th>
                        <Th>Tasa cotización</Th>
                        <Th>Ámbito</Th>
                        <Th> </Th>
                    </Tr>
                </THead>
                <TBody>
                    {afps.map((afp) => (
                        <Tr key={afp.id}>
                            <Td className='font-medium'>{afp.nombre}</Td>
                            <Td className='text-sm text-zinc-600 dark:text-zinc-400'>
                                {afp.tasa_cotizacion != null
                                    ? `${(Number(afp.tasa_cotizacion) * 100).toFixed(2)}%`
                                    : '—'}
                            </Td>
                            <Td><BadgeAmbito esGlobal={afp.empresa === null} /></Td>
                            <Td>
                                {afp.empresa !== null && (
                                    <Button size='sm' variant='outline' color='red' onClick={() => borrar(afp.id, afp.nombre)}>
                                        Eliminar
                                    </Button>
                                )}
                            </Td>
                        </Tr>
                    ))}
                </TBody>
            </Table>
        </div>
    );
};

// ── Tab Bancos ───────────────────────────────────────────────────────────────
const TabBancos = ({ empresaId }: ITabProps) => {
    const { data: bancos = [], isLoading } = useGetBancoCatalogoQuery(
        empresaId ? { empresa_id: empresaId } : undefined,
    );
    const [crear, { isLoading: creando }] = useCrearBancoInlineMutation();
    const [eliminar] = useEliminarBancoMutation();
    const [nuevoNombre, setNuevoNombre] = useState('');

    const agregar = async () => {
        if (!nuevoNombre.trim() || !empresaId) return;
        try {
            // TODO RBAC: validar permiso explicito para crear catalogos de banco por empresa.
            await crear({ nombre: nuevoNombre.trim(), empresa_id: empresaId }).unwrap();
            toast.success('Banco agregado.');
            setNuevoNombre('');
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const borrar = async (id: number, nombre: string) => {
        const ok = await confirmAlert({
            title: `¿Eliminar banco "${nombre}"?`,
            text: 'Esta acción no se puede deshacer.',
            confirmText: 'Eliminar', cancelText: 'Cancelar', icon: 'warning', confirmColor: '#ef4444',
        });
        if (!ok) return;
        try {
            // TODO RBAC: validar permiso explicito para eliminar catalogos de banco por empresa.
            await eliminar(id).unwrap();
            toast.success('Banco eliminado.');
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    if (isLoading) return <p className='py-6 text-center text-sm text-zinc-400'>Cargando...</p>;

    return (
        <div className='space-y-4'>
            {empresaId && (
                <div className='flex items-end gap-2'>
                    <div className='flex-1'>
                        <Label htmlFor='nuevo_banco'>Agregar banco de empresa</Label>
                        <Input id='nuevo_banco' name='nuevo_banco' value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder='Nombre del banco' />
                    </div>
                    <Button variant='solid' color='blue' isDisable={creando || !nuevoNombre.trim()} onClick={agregar}>
                        Agregar
                    </Button>
                </div>
            )}
            <Table>
                <THead>
                    <Tr>
                        <Th>Nombre</Th>
                        <Th>Ámbito</Th>
                        <Th> </Th>
                    </Tr>
                </THead>
                <TBody>
                    {bancos.map((banco) => (
                        <Tr key={banco.id}>
                            <Td className='font-medium'>{banco.nombre}</Td>
                            <Td><BadgeAmbito esGlobal={banco.empresa === null} /></Td>
                            <Td>
                                {banco.empresa !== null && (
                                    <Button size='sm' variant='outline' color='red' onClick={() => borrar(banco.id, banco.nombre)}>
                                        Eliminar
                                    </Button>
                                )}
                            </Td>
                        </Tr>
                    ))}
                </TBody>
            </Table>
        </div>
    );
};

// ── Tab Turnos ───────────────────────────────────────────────────────────────
const TURNO_VACIO: ITurnoLaboralWrite = {
    nombre: '', hora_inicio: '', hora_fin: '', dias_semana: ['L', 'M', 'X', 'J', 'V'],
};

const ModalTurno = ({
    isOpen, onClose, turnoEditar, empresaId,
}: { isOpen: boolean; onClose: () => void; turnoEditar?: ITurnoLaboral | null; empresaId: number }) => {
    const [form, setForm] = useState<ITurnoLaboralWrite>(TURNO_VACIO);
    const [crear, { isLoading: creando }] = useCrearTurnoLaboralMutation();
    const [editar, { isLoading: editando }] = useEditarTurnoLaboralMutation();
    const isLoading = creando || editando;

    useEffect(() => {
        if (isOpen) {
            setForm(turnoEditar
                ? { nombre: turnoEditar.nombre, hora_inicio: turnoEditar.hora_inicio, hora_fin: turnoEditar.hora_fin, dias_semana: turnoEditar.dias_semana }
                : TURNO_VACIO);
        }
    }, [isOpen, turnoEditar]);

    const toggleDia = (key: string) => setForm((prev) => ({
        ...prev,
        dias_semana: prev.dias_semana.includes(key) ? prev.dias_semana.filter((d) => d !== key) : [...prev.dias_semana, key],
    }));

    const submit = async () => {
        if (!form.nombre.trim() || !form.hora_inicio || !form.hora_fin) {
            toast.error('Nombre, hora inicio y hora fin son obligatorios.');
            return;
        }
        try {
            if (turnoEditar) {
                // TODO RBAC: validar permiso explicito para editar turnos por empresa.
                await editar({ id: turnoEditar.id, ...form }).unwrap();
                toast.success('Turno actualizado.');
            } else {
                // TODO RBAC: validar permiso explicito para crear turnos por empresa.
                await crear({ ...form, empresa_id: empresaId }).unwrap();
                toast.success('Turno creado.');
            }
            onClose();
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={(v) => { if (!v) onClose(); }} size='sm'>
            <ModalHeader>{turnoEditar ? 'Editar turno' : 'Nuevo turno'}</ModalHeader>
            <ModalBody>
                <div className='space-y-4'>
                    <div>
                        <Label htmlFor='turno_nombre'>Nombre <span className='text-red-500'>*</span></Label>
                        <Input id='turno_nombre' name='turno_nombre' value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} placeholder='Ej: Turno A, Mañana' />
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                        <div>
                            <Label htmlFor='turno_inicio'>Hora inicio <span className='text-red-500'>*</span></Label>
                            <Input id='turno_inicio' name='turno_inicio' type='time' value={form.hora_inicio} onChange={(e) => setForm((p) => ({ ...p, hora_inicio: e.target.value }))} />
                        </div>
                        <div>
                            <Label htmlFor='turno_fin'>Hora fin <span className='text-red-500'>*</span></Label>
                            <Input id='turno_fin' name='turno_fin' type='time' value={form.hora_fin} onChange={(e) => setForm((p) => ({ ...p, hora_fin: e.target.value }))} />
                        </div>
                    </div>
                    <div>
                        <Label className='mb-2 block'>Días por defecto</Label>
                        <div className='flex flex-wrap gap-2'>
                            {DIAS_SEMANA.map((dia) => {
                                const activo = form.dias_semana.includes(dia.key);
                                return (
                                    <button key={dia.key} type='button' title={dia.label} onClick={() => toggleDia(dia.key)}
                                        className={['flex h-9 w-9 items-center justify-center rounded-lg border-2 text-xs font-semibold transition-all',
                                            activo ? 'border-blue-500 bg-blue-500 text-white' : 'border-zinc-300 bg-transparent text-zinc-600 hover:border-blue-400 dark:border-zinc-600 dark:text-zinc-400'].join(' ')}>
                                        {dia.key}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild><Button onClick={onClose}>Cancelar</Button></ModalFooterChild>
                <ModalFooterChild>
                    <Button variant='solid' color='blue' isDisable={isLoading} onClick={submit}>
                        {isLoading ? 'Guardando...' : turnoEditar ? 'Guardar cambios' : 'Crear turno'}
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

const TabTurnos = ({ empresaId }: ITabProps) => {
    const { data: turnos = [], isLoading } = useGetTurnosLaboralQuery(
        empresaId ? { empresa_id: empresaId } : undefined,
    );
    const [eliminar] = useEliminarTurnoLaboralMutation();
    const [modalAbierto, setModalAbierto] = useState(false);
    const [turnoEditar, setTurnoEditar] = useState<ITurnoLaboral | null>(null);

    const borrar = async (turno: ITurnoLaboral) => {
        const ok = await confirmAlert({
            title: `¿Eliminar turno "${turno.nombre}"?`,
            text: 'Esta acción no se puede deshacer. Los contratos existentes conservan su configuración.',
            confirmText: 'Eliminar', cancelText: 'Cancelar', icon: 'warning', confirmColor: '#ef4444',
        });
        if (!ok) return;
        try {
            // TODO RBAC: validar permiso explicito para eliminar turnos por empresa.
            await eliminar(turno.id).unwrap();
            toast.success('Turno eliminado.');
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    if (isLoading) return <p className='py-6 text-center text-sm text-zinc-400'>Cargando...</p>;

    return (
        <div className='space-y-4'>
            {empresaId ? (
                <div className='flex justify-end'>
                    <Button variant='solid' color='blue' icon='HeroPlusCircle' onClick={() => { setTurnoEditar(null); setModalAbierto(true); }}>
                        Agregar turno
                    </Button>
                </div>
            ) : (
                <Alert variant='outline' color='blue' icon='HeroInformationCircle'>
                    Selecciona una empresa para agregar turnos propios. Aquí se listan los turnos globales.
                </Alert>
            )}
            <Table>
                <THead>
                    <Tr>
                        <Th>Nombre</Th><Th>Horario</Th><Th>Días</Th><Th>Horas</Th><Th>Ámbito</Th><Th> </Th>
                    </Tr>
                </THead>
                <TBody>
                    {turnos.map((turno) => (
                        <Tr key={turno.id}>
                            <Td className='font-medium'>{turno.nombre}</Td>
                            <Td className='text-sm text-zinc-600 dark:text-zinc-400'>
                                {turno.hora_inicio}–{turno.hora_fin}
                                {turno.cruza_medianoche && <span className='ml-1 text-xs text-amber-500'>+1d</span>}
                            </Td>
                            <Td className='text-sm'>{turno.dias_semana.length > 0 ? turno.dias_semana.join(', ') : '—'}</Td>
                            <Td className='text-sm text-zinc-600 dark:text-zinc-400'>{turno.horas_turno ? `${turno.horas_turno} h` : '—'}</Td>
                            <Td><BadgeAmbito esGlobal={turno.es_global} /></Td>
                            <Td>
                                {!turno.es_global && (
                                    <div className='flex gap-1'>
                                        <Button size='sm' variant='outline' onClick={() => { setTurnoEditar(turno); setModalAbierto(true); }}>
                                            Editar
                                        </Button>
                                        <Button size='sm' variant='outline' color='red' onClick={() => borrar(turno)}>
                                            Eliminar
                                        </Button>
                                    </div>
                                )}
                            </Td>
                        </Tr>
                    ))}
                </TBody>
            </Table>
            {empresaId && (
                <ModalTurno
                    isOpen={modalAbierto}
                    onClose={() => { setModalAbierto(false); setTurnoEditar(null); }}
                    turnoEditar={turnoEditar}
                    empresaId={empresaId}
                />
            )}
        </div>
    );
};

// ── Tab Plantillas ───────────────────────────────────────────────────────────
const TabPlantillas = ({ empresaId }: ITabProps) => {
    const navigate = useNavigate();
    const { data: plantillas = [], isLoading } = useGetPlantillasV2Query();

    const filtradas = useMemo(
        () =>
            plantillas.filter((p) => {
                if (p.tipo_contrato !== 'trabajador') return false;
                if (!empresaId) return true;
                return p.empresa_prestadora === null || p.empresa_prestadora === empresaId;
            }),
        [plantillas, empresaId],
    );

    if (isLoading) return <p className='py-6 text-center text-sm text-zinc-400'>Cargando...</p>;

    return (
        <div className='space-y-4'>
            <div className='flex justify-end'>
                <Button variant='outline' icon='HeroArrowTopRightOnSquare' onClick={() => navigate('/registros/plantillas-contrato')}>
                    Gestionar plantillas
                </Button>
            </div>
            <Table>
                <THead>
                    <Tr><Th>Título</Th><Th>Estado</Th><Th>Ámbito</Th></Tr>
                </THead>
                <TBody>
                    {filtradas.map((p) => (
                        <Tr key={p.id}>
                            <Td className='font-medium'>{p.titulo}</Td>
                            <Td>
                                <Badge variant='outline' color={p.activa ? 'emerald' : 'zinc'}>
                                    {p.activa ? 'Activa' : 'Inactiva'}
                                </Badge>
                            </Td>
                            <Td><BadgeAmbito esGlobal={p.empresa_prestadora === null} /></Td>
                        </Tr>
                    ))}
                    {filtradas.length === 0 && (
                        <Tr><Td colSpan={3} className='py-4 text-center text-sm text-zinc-400'>Sin plantillas de tipo laboral.</Td></Tr>
                    )}
                </TBody>
            </Table>
        </div>
    );
};

// ── Página principal ───────────────────────────────────────────────────────────
const ConfiguracionRRHH = ({ embedded = false, empresaIdFijo = null, nombreEmpresa }: IConfiguracionRRHHProps) => {
    const dispatch = useAppDispatch();
    const { listaMisClientes } = useAppSelector((s) => s.empresa);
    const { personalizacionUsuario } = useAppSelector((s) => s.auth);

    const [empresaId, setEmpresaId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<TTabId>('parametros');

    const empresaIdActiva = empresaIdFijo ?? empresaId;

    const innerTabProps = (tab: TTabId) =>
        activeTab === tab
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

    useEffect(() => {
        if (!embedded && personalizacionUsuario?.empresa && listaMisClientes.length === 0) {
            dispatch(listaMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }));
        }
    }, [embedded, personalizacionUsuario?.empresa, listaMisClientes.length, dispatch]);

    const empresaOpts: TSelectOption[] = listaMisClientes.map((r) => ({
        value: String(r.info_cliente.id),
        label: r.info_cliente.nombre,
    }));
    const empresaValue = empresaOpts.find((o) => o.value === String(empresaIdActiva)) ?? null;

    const contenidoTabs = (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <CardTitle>
                        {empresaIdActiva
                            ? `Configuración de ${nombreEmpresa ?? empresaValue?.label ?? 'empresa seleccionada'}`
                            : 'Configuración global'}
                    </CardTitle>
                </CardHeaderChild>
            </CardHeader>
            <CardBody>
                <div className='mb-4 flex flex-wrap gap-2'>
                    {TABS.map((tab) => (
                        <Button
                            key={tab.id}
                            {...innerTabProps(tab.id)}
                            onClick={() => setActiveTab(tab.id)}>
                            {tab.label}
                        </Button>
                    ))}
                </div>

                {activeTab === 'parametros' && <TabParametros empresaId={empresaIdActiva} />}
                {activeTab === 'afp' && <TabAfp empresaId={empresaIdActiva} />}
                {activeTab === 'bancos' && <TabBancos empresaId={empresaIdActiva} />}
                {activeTab === 'turnos' && <TabTurnos empresaId={empresaIdActiva} />}
                {activeTab === 'plantillas' && <TabPlantillas empresaId={empresaIdActiva} />}
                {activeTab === 'grupos_turnos' && (
                    <TabGruposTurnos empresaId={empresaIdActiva ?? ''} />
                )}
            </CardBody>
        </Card>
    );

    if (embedded) {
        return contenidoTabs;
    }

    return (
        <PageWrapper name='Configuración RRHH'>
            <Subheader>
                <SubheaderLeft>
                    <span className='text-lg font-semibold'>Configuración RRHH</span>
                </SubheaderLeft>
                <SubheaderRight>
                    <SelectReact
                        name='empresa_filtro'
                        options={empresaOpts}
                        value={empresaValue}
                        onChange={(opt) =>
                            setEmpresaId(opt ? Number((opt as TSelectOption).value) : null)
                        }
                        placeholder='Todas las empresas (global)'
                        isClearable
                        className='w-64'
                    />
                </SubheaderRight>
            </Subheader>

            <Container>
                {contenidoTabs}
            </Container>
        </PageWrapper>
    );
};

export default ConfiguracionRRHH;
