import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { TIPOS_USUARIO_CONTRATO } from '@/constants/contrato.constant';
import { listaUsuariosTodoElClienteThunk, useAppDispatch, useAppSelector } from '@/store';
import {
    useEnviarFirmaContratoMutation,
    useReenviarFirmaContratoMutation,
    useUpdateContratoMutation,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import classNames from 'classnames';
import dayjs from 'dayjs';
import { Fragment, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { buildUpdatePayload } from './contrato.helpers';
import { IContratoEdicion, ITabUsuariosProps } from './contrato.types';

type TUsuarioEditable = IContratoEdicion['usuarios_vinculados'][number];
type TVinculo = ITabUsuariosProps['detalleContratoEmpresaCliente']['vinculos_contrato'][number];

const getEstadoFirmaVisual = (vinculo: TVinculo) => {
    if (vinculo.firma_pendiente?.firmado) return { label: 'Firmado', color: 'emerald' } as const;
    if (vinculo.firma_pendiente?.enviado) return { label: 'Pendiente', color: 'amber' } as const;
    return { label: 'Sin envio', color: 'zinc' } as const;
};

const TabUsuarios = ({ detalleContratoEmpresaCliente, puedeEditar }: ITabUsuariosProps) => {
    const dispatch = useAppDispatch();
    const { listaUsuariosTodoElCliente } = useAppSelector((state) => state.empresa);
    const [editandoSeccion, setEditandoSeccion] = useState(false);
    const [nuevoUsuario, setNuevoUsuario] = useState('');
    const [usuarios, setUsuarios] = useState<TUsuarioEditable[]>([]);
    const [eliminarUsuarios, setEliminarUsuarios] = useState<number[]>([]);
    const [updateContrato, { isLoading: guardando }] = useUpdateContratoMutation();
    const [enviarFirma, { isLoading: enviando }] = useEnviarFirmaContratoMutation();
    const [reenviarFirma] = useReenviarFirmaContratoMutation();

    const { sinEnvio, pendientes, firmados } = useMemo(() => {
        const sin: TVinculo[] = [];
        const pend: TVinculo[] = [];
        const firm: TVinculo[] = [];
        detalleContratoEmpresaCliente.vinculos_contrato.forEach((v) => {
            if (!v.firma_pendiente) sin.push(v);
            else if (v.firma_pendiente.firmado) firm.push(v);
            else pend.push(v);
        });
        return { sinEnvio: sin, pendientes: pend, firmados: firm };
    }, [detalleContratoEmpresaCliente.vinculos_contrato]);

    const opcionesUsuariosCliente = useMemo(
        () =>
            listaUsuariosTodoElCliente.map((usuario) => ({
                value: usuario.id.toString(),
                label: `${usuario.nombre_usuario} (${usuario.email_usuario})`,
            })),
        [listaUsuariosTodoElCliente],
    );

    const actualizarUsuario = (index: number, patch: Partial<TUsuarioEditable>) =>
        setUsuarios((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));

    const marcarDestinatarioPrincipal = (targetIndex: number) =>
        setUsuarios((prev) =>
            prev.map((u, i) => ({ ...u, es_destinatario_principal: i === targetIndex })),
        );

    const getOpcionesFila = (index: number) =>
        opcionesUsuariosCliente.filter(
            (option) =>
                !usuarios.some(
                    (usuario, usuarioIndex) =>
                        usuarioIndex !== index && usuario.usuario_id === Number(option.value),
                ),
        );

    const opcionesNuevosUsuarios = opcionesUsuariosCliente.filter(
        (option) => !usuarios.some((usuario) => usuario.usuario_id === Number(option.value)),
    );

    const handleEditar = () => {
        dispatch(
            listaUsuariosTodoElClienteThunk({
                id_empresa: detalleContratoEmpresaCliente.empresa_cliente,
            }),
        );
        setUsuarios(
            detalleContratoEmpresaCliente.vinculos_contrato.map((u) => ({
                id: u.id,
                usuario_id: u.usuario ?? undefined,
                nombre: u.nombre,
                correo_generico: u.correo_generico,
                tipo_usuario: u.tipo_usuario,
                es_destinatario_principal: u.es_destinatario_principal,
            })),
        );
        setEliminarUsuarios([]);
        setNuevoUsuario('');
        setEditandoSeccion(true);
    };

    const handleCancelar = () => {
        setEditandoSeccion(false);
        setUsuarios([]);
        setEliminarUsuarios([]);
        setNuevoUsuario('');
    };

    const handleEliminarFila = (index: number) => {
        const eliminado = usuarios[index];
        const proximos = usuarios.filter((_, i) => i !== index);
        if (eliminado.id) setEliminarUsuarios((prev) => [...prev, eliminado.id!]);
        if (eliminado.es_destinatario_principal && proximos.length > 0) {
            proximos[0] = { ...proximos[0], es_destinatario_principal: true };
        }
        setUsuarios(proximos);
    };

    const handleGuardar = async () => {
        if (usuarios.length > 0 && usuarios.filter((u) => u.es_destinatario_principal).length !== 1) {
            toast.error('Debes marcar exactamente un destinatario principal.');
            return;
        }
        if (usuarios.some((u) => !u.usuario_id && (!u.nombre?.trim() || !u.correo_generico?.trim()))) {
            toast.error('Cada contacto manual debe tener nombre y correo.');
            return;
        }
        try {
            await updateContrato({
                id: detalleContratoEmpresaCliente.id,
                data: buildUpdatePayload(detalleContratoEmpresaCliente, {
                    usuarios_vinculados: usuarios.map((u) => ({
                        ...u,
                        nombre: u.nombre?.trim() || null,
                        correo_generico: u.correo_generico?.trim().toLowerCase() || null,
                    })),
                    eliminar_usuarios: eliminarUsuarios,
                }),
            }).unwrap();
            setEditandoSeccion(false);
            toast.success('Usuarios actualizados', { autoClose: 1000 });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleEnviarFirma = async (usuarioVinculadoId: number) => {
        try {
            await enviarFirma({ contratoId: detalleContratoEmpresaCliente.id, usuarioVinculadoId }).unwrap();
            toast.success('Envio exitoso', { autoClose: 1000 });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleReenviarFirma = async (usuarioVinculadoId: number, envioId: number) => {
        try {
            await reenviarFirma({ contratoId: detalleContratoEmpresaCliente.id, usuarioVinculadoId, envioId }).unwrap();
            toast.success('Reenvio exitoso', { autoClose: 1000 });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const renderGrupo = (titulo: string, items: TVinculo[], accion?: 'enviar' | 'reenviar' | 'ninguna') => {
        if (items.length === 0) return null;
        return (
            <div>
                <h6 className='mb-2 text-sm font-semibold text-zinc-500'>{titulo}</h6>
                <div className='grid grid-cols-12 gap-2'>
                    <div className='col-span-4 text-xs font-bold'>Usuario</div>
                    <div className='col-span-3 text-xs font-bold'>Tipo</div>
                    <div className='col-span-2 text-xs font-bold'>{accion === 'ninguna' ? 'F. firma' : 'F. Vinculacion'}</div>
                    <div className='col-span-2 text-xs font-bold'>Estado</div>
                    <div className='col-span-1 text-xs font-bold'></div>
                    {items.map((v, i) => (
                        <Fragment key={v.id}>
                            <div className={classNames('col-span-4', i > 0 && 'border-t border-t-zinc-200 pt-1 dark:border-t-zinc-700')}>
                                {v.correo_display}
                                {v.es_destinatario_principal && <div className='mt-1'><Badge variant='outline' color='emerald'>Principal</Badge></div>}
                            </div>
                            <div className={classNames('col-span-3', i > 0 && 'border-t border-t-zinc-200 pt-1 dark:border-t-zinc-700')}>{v.tipo_usuario_label}</div>
                            <div className={classNames('col-span-2', i > 0 && 'border-t border-t-zinc-200 pt-1 dark:border-t-zinc-700')}>
                                {accion === 'ninguna'
                                    ? v.firma_pendiente?.fecha_firma ? dayjs(v.firma_pendiente.fecha_firma).format('DD/MM/YYYY') : 'Sin fecha'
                                    : dayjs(v.fecha_vinculacion).format('DD/MM/YYYY')}
                            </div>
                            <div className={classNames('col-span-2', i > 0 && 'border-t border-t-zinc-200 pt-1 dark:border-t-zinc-700')}>
                                <Badge variant='outline' color={getEstadoFirmaVisual(v).color}>{getEstadoFirmaVisual(v).label}</Badge>
                            </div>
                            <div className={classNames('col-span-1', i > 0 && 'border-t border-t-zinc-200 pt-1 dark:border-t-zinc-700')}>
                                {accion === 'enviar' && <Tooltip text='Enviar firma'><Button variant='solid' color='blue' size='sm' icon='DuoMail' isLoading={enviando} onClick={() => handleEnviarFirma(v.id)} /></Tooltip>}
                                {accion === 'reenviar' && <Tooltip text='Reenviar firma'><Button variant='solid' color='emerald' size='sm' icon='DuoOutgoingMail' onClick={() => handleReenviarFirma(v.id, v.firma_pendiente!.id)} /></Tooltip>}
                                {accion === 'ninguna' && <span className='text-xs text-zinc-400'>-</span>}
                            </div>
                        </Fragment>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <Card>
            <CardHeader className='border-b border-b-black'>
                <CardHeaderChild><div className='text-xl font-bold text-blue-500'>Usuarios Vinculados</div></CardHeaderChild>
                <CardHeaderChild>
                    {puedeEditar && !editandoSeccion && <Tooltip text='Editar Usuarios'><Button variant='outline' color='blue' icon='HeroPlus' className='text-blue-500' onClick={handleEditar}>Gestionar usuarios</Button></Tooltip>}
                    {editandoSeccion && <><Button icon='HeroXMark' color='red' size='sm' onClick={handleCancelar}>Cancelar</Button><Button icon='HeroCheck' variant='solid' color='emerald' size='sm' isLoading={guardando} onClick={handleGuardar}>Guardar</Button></>}
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='p-4'>
                <div className='mb-4 text-xs text-zinc-500'>Vincula usuarios del cliente y define quien recibira la aprobacion y la firma del contrato.</div>
                {editandoSeccion ? <div className='space-y-4'>
                    {usuarios.length > 0 ? usuarios.map((usuario, index) => {
                        const esInterno = Boolean(usuario.usuario_id);
                        const opcionesFila = getOpcionesFila(index);
                        return <div key={usuario.id ?? `nuevo-${index}`} className='rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                            <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
                                <div className='flex flex-wrap items-center gap-2'>
                                    <Badge variant='outline' color={esInterno ? 'blue' : 'amber'}>{esInterno ? 'Usuario existente' : 'Contacto manual'}</Badge>
                                    {usuario.es_destinatario_principal && <Badge variant='outline' color='emerald'>Destinatario principal</Badge>}
                                </div>
                                <Button color='red' icon='HeroTrash' size='sm' onClick={() => handleEliminarFila(index)}>Quitar</Button>
                            </div>
                            <div className='mb-4 flex flex-wrap gap-2'>
                                <Button size='sm' variant={esInterno ? 'solid' : 'default'} onClick={() => actualizarUsuario(index, { usuario_id: usuario.usuario_id || Number(opcionesFila[0]?.value) || undefined, nombre: null, correo_generico: null })}>Usuario existente</Button>
                                <Button size='sm' variant={!esInterno ? 'solid' : 'default'} onClick={() => actualizarUsuario(index, { usuario_id: undefined, nombre: '', correo_generico: '' })}>Contacto manual</Button>
                            </div>
                            {esInterno ? <div className='grid grid-cols-12 gap-4'>
                                <div className='col-span-12 lg:col-span-7'><div className='mb-1 text-xs font-semibold text-zinc-500'>Usuario del cliente</div><SelectReact name={`usuario-${index}`} options={opcionesFila} value={opcionesFila.find((option) => Number(option.value) === usuario.usuario_id) ?? null} onChange={(option) => actualizarUsuario(index, { usuario_id: Number((option as TSelectOption | null)?.value || 0) })} placeholder='Selecciona un usuario' /></div>
                                <div className='col-span-12 lg:col-span-5'><div className='mb-1 text-xs font-semibold text-zinc-500'>Tipo</div><SelectReact name={`tipo-${index}`} options={TIPOS_USUARIO_CONTRATO} value={TIPOS_USUARIO_CONTRATO.find((tipo) => tipo.value === usuario.tipo_usuario)} onChange={(option) => actualizarUsuario(index, { tipo_usuario: (option as TSelectOption).value })} /></div>
                            </div> : <div className='grid grid-cols-12 gap-4'>
                                <div className='col-span-12 lg:col-span-4'><div className='mb-1 text-xs font-semibold text-zinc-500'>Nombre</div><Input name={`nombre-${index}`} value={usuario.nombre ?? ''} onChange={(event) => actualizarUsuario(index, { nombre: event.target.value })} /></div>
                                <div className='col-span-12 lg:col-span-4'><div className='mb-1 text-xs font-semibold text-zinc-500'>Correo</div><Input name={`correo-${index}`} type='email' value={usuario.correo_generico ?? ''} onChange={(event) => actualizarUsuario(index, { correo_generico: event.target.value })} /></div>
                                <div className='col-span-12 lg:col-span-4'><div className='mb-1 text-xs font-semibold text-zinc-500'>Tipo</div><SelectReact name={`tipo-${index}`} options={TIPOS_USUARIO_CONTRATO} value={TIPOS_USUARIO_CONTRATO.find((tipo) => tipo.value === usuario.tipo_usuario)} onChange={(option) => actualizarUsuario(index, { tipo_usuario: (option as TSelectOption).value })} /></div>
                            </div>}
                            <div className='mt-4'><Checkbox name={`principal-${index}`} label='Marcar como destinatario principal' checked={Boolean(usuario.es_destinatario_principal)} onChange={() => marcarDestinatarioPrincipal(index)} /></div>
                        </div>;
                    }) : <div className='rounded-lg border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700'>Sin usuarios vinculados. Agrega un usuario existente o un contacto manual.</div>}
                    <div className='rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                        <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
                            <div><div className='text-sm font-semibold'>Agregar nuevo vinculo</div><div className='text-xs text-zinc-500'>Puedes agregar usuarios existentes del cliente o un contacto manual.</div></div>
                            <Button size='sm' variant='outline' color='amber' icon='HeroUserPlus' onClick={() => setUsuarios((prev) => [...prev, { nombre: '', correo_generico: '', tipo_usuario: 'general', es_destinatario_principal: prev.length === 0 }])}>Agregar contacto manual</Button>
                        </div>
                        <div className='grid grid-cols-12 gap-3'>
                            <div className='col-span-12 lg:col-span-8'><SelectReact name='nuevo_usuario' options={opcionesNuevosUsuarios} onChange={(option) => setNuevoUsuario((option as TSelectOption | null)?.value ?? '')} value={opcionesNuevosUsuarios.find((option) => option.value === nuevoUsuario) ?? null} placeholder='Selecciona un usuario del cliente' /></div>
                            <div className='col-span-12 lg:col-span-4'><Button className='w-full' icon='HeroPlus' onClick={() => { if (!nuevoUsuario.trim()) { toast.error('Selecciona un usuario para agregarlo', { toastId: 'Selecciona un usuario para agregarlo' }); return; } setUsuarios((prev) => [...prev, { usuario_id: Number(nuevoUsuario), tipo_usuario: 'general', es_destinatario_principal: prev.length === 0 }]); setNuevoUsuario(''); }}>Agregar usuario existente</Button></div>
                        </div>
                    </div>
                </div> : <div className='flex flex-col gap-6'>{renderGrupo('Sin envio de firma', sinEnvio, 'enviar')}{renderGrupo('Pendientes de firma', pendientes, 'reenviar')}{renderGrupo('Firmados', firmados, 'ninguna')}{detalleContratoEmpresaCliente.vinculos_contrato.length === 0 && <div className='text-center text-sm text-zinc-500'>Sin usuarios</div>}{detalleContratoEmpresaCliente.vinculos_contrato.length > 0 && <div className='flex flex-wrap gap-2 border-t border-t-zinc-200 pt-3 dark:border-t-zinc-700'><Badge variant='outline' color='zinc'>{detalleContratoEmpresaCliente.vinculos_contrato.length} total</Badge>{sinEnvio.length > 0 && <Badge variant='outline' color='red'>{sinEnvio.length} sin envio</Badge>}{pendientes.length > 0 && <Badge variant='outline' color='amber'>{pendientes.length} pendientes</Badge>}{firmados.length > 0 && <Badge variant='outline' color='emerald'>{firmados.length} firmados</Badge>}</div>}</div>}
            </CardBody>
        </Card>
    );
};

export default TabUsuarios;
