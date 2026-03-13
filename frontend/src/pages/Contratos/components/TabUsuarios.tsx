import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { TIPOS_USUARIO_CONTRATO } from '@/constants/contrato.constant';
import {
    listaUsuariosTodoElClienteThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
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

const getEstadoFirmaVisual = (existeEnvio: number | null) =>
    existeEnvio
        ? ({ label: 'Firma enviada', color: 'amber' } as const)
        : ({ label: 'Sin envio', color: 'zinc' } as const);

const TabUsuarios = ({
    detalleContratoEmpresaCliente,
    puedeEditar,
}: ITabUsuariosProps) => {
    const dispatch = useAppDispatch();
    const { listaUsuariosTodoElCliente } = useAppSelector((state) => state.empresa);
    const [editandoSeccion, setEditandoSeccion] = useState(false);
    const [nuevoUsuario, setNuevoUsuario] = useState<string>('');
    const [updateContrato, { isLoading: guardando }] = useUpdateContratoMutation();
    const [enviarFirma, { isLoading: enviando }] = useEnviarFirmaContratoMutation();
    const [reenviarFirma] = useReenviarFirmaContratoMutation();

    // Estado local para la sección
    const [usuarios, setUsuarios] = useState<IContratoEdicion['usuarios_vinculados']>([]);
    const [eliminarUsuarios, setEliminarUsuarios] = useState<number[]>([]);

    // ── Agrupar vínculos por estado de firma ──
    const { sinEnvio, pendientes, firmados } = useMemo(() => {
        const sin: typeof detalleContratoEmpresaCliente.vinculos_contrato = [];
        const pend: typeof detalleContratoEmpresaCliente.vinculos_contrato = [];
        const firm: typeof detalleContratoEmpresaCliente.vinculos_contrato = [];

        for (const v of detalleContratoEmpresaCliente.vinculos_contrato) {
            if (!v.existe_envio) {
                sin.push(v);
            } else {
                // existe_envio indica que tiene un envío creado — puede o no estar firmado
                // No tenemos campo `firmado` en IVinculoContrato, todos con envío van a pendientes
                pend.push(v);
            }
        }
        return { sinEnvio: sin, pendientes: pend, firmados: firm };
    }, [detalleContratoEmpresaCliente.vinculos_contrato]);

    const handleEditar = () => {
        dispatch(
            listaUsuariosTodoElClienteThunk({
                id_empresa: detalleContratoEmpresaCliente.empresa_cliente,
            }),
        );
        setUsuarios(
            detalleContratoEmpresaCliente.vinculos_contrato.map((u) => ({
                id: u.id,
                tipo_usuario: u.tipo_usuario,
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

    const handleGuardar = async () => {
        try {
            const payload = buildUpdatePayload(detalleContratoEmpresaCliente, {
                usuarios_vinculados: usuarios,
                eliminar_usuarios: eliminarUsuarios,
            });
            await updateContrato({
                id: detalleContratoEmpresaCliente.id,
                data: payload,
            }).unwrap();
            setEditandoSeccion(false);
            toast.success('Usuarios actualizados', { autoClose: 1000 });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleEnviarFirma = async (usuarioVinculadoId: number) => {
        try {
            await enviarFirma({
                contratoId: detalleContratoEmpresaCliente.id,
                usuarioVinculadoId,
            }).unwrap();
            toast.success('Envío exitoso', { autoClose: 1000 });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleReenviarFirma = async (usuarioVinculadoId: number, envioId: number) => {
        try {
            await reenviarFirma({
                contratoId: detalleContratoEmpresaCliente.id,
                usuarioVinculadoId,
                envioId,
            }).unwrap();
            toast.success('Reenvío exitoso', { autoClose: 1000 });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <Card>
            <CardHeader className='border-b border-b-black'>
                <CardHeaderChild>
                    <div className='text-xl font-bold text-blue-500'>Usuarios Vinculados</div>
                </CardHeaderChild>
                <CardHeaderChild>
                    {puedeEditar && !editandoSeccion && (
                        <Tooltip text='Editar Usuarios'>
                            <Button
                                variant='outline'
                                color='blue'
                                icon='HeroPlus'
                                className='text-blue-500'
                                onClick={handleEditar}>
                                Gestionar usuarios
                            </Button>
                        </Tooltip>
                    )}
                    {editandoSeccion && (
                        <>
                            <Button
                                icon='HeroXMark'
                                color='red'
                                size='sm'
                                onClick={handleCancelar}>
                                Cancelar
                            </Button>
                            <Button
                                icon='HeroCheck'
                                variant='solid'
                                color='emerald'
                                size='sm'
                                isLoading={guardando}
                                onClick={handleGuardar}>
                                Guardar
                            </Button>
                        </>
                    )}
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='p-4'>
                <div className='mb-4 text-xs text-zinc-500'>
                    Vincula usuarios del cliente al contrato y controla el envio de firma desde
                    esta seccion.
                </div>
                {editandoSeccion ? (
                    // ── Modo edición ──
                    <div className='grid grid-cols-12 gap-4'>
                        <div className='col-span-6 font-bold'>Usuario</div>
                        <div className='col-span-6 font-bold'>Tipo</div>
                        {usuarios.length > 0 ? (
                            usuarios.map((user, index) => (
                                <Fragment key={index}>
                                    <div className='col-span-6'>
                                        {'usuario_id' in user
                                            ? listaUsuariosTodoElCliente.find(
                                                  (userCli) => userCli.id === user.usuario_id,
                                              )?.email_usuario
                                            : 'id' in user
                                              ? detalleContratoEmpresaCliente.vinculos_contrato.find(
                                                    (userCli) => userCli.id === user.id,
                                                )?.datos_usuario.email
                                              : 'No se encontró al usuario'}
                                        <Button
                                            color='red'
                                            icon='HeroTrash'
                                            onClick={() => {
                                                const eliminado = usuarios[index];
                                                setUsuarios(
                                                    usuarios.filter((_, i) => i !== index),
                                                );
                                                if (eliminado.id) {
                                                    setEliminarUsuarios((prev) => [
                                                        ...prev,
                                                        eliminado.id!,
                                                    ]);
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className='col-span-6'>
                                        <SelectReact
                                            name='tipo_usuario'
                                            options={TIPOS_USUARIO_CONTRATO}
                                            value={TIPOS_USUARIO_CONTRATO.find(
                                                (tipo) => tipo.value === user.tipo_usuario,
                                            )}
                                            onChange={(e) => {
                                                const nuevos = [...usuarios];
                                                nuevos[index] = {
                                                    ...nuevos[index],
                                                    tipo_usuario: (e as TSelectOption).value,
                                                };
                                                setUsuarios(nuevos);
                                            }}
                                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                        />
                                    </div>
                                </Fragment>
                            ))
                        ) : (
                            <div className='col-span-full text-center'>Sin Usuarios</div>
                        )}
                        {listaUsuariosTodoElCliente
                            .filter(
                                (us) =>
                                    !detalleContratoEmpresaCliente.vinculos_contrato.some(
                                        (num) =>
                                            num.usuario === us.id &&
                                            !eliminarUsuarios.some(
                                                (formUs) => formUs === num.id,
                                            ),
                                    ),
                            )
                            .filter(
                                (us) =>
                                    !usuarios.some(
                                        (formUs) => formUs.usuario_id === us.id,
                                    ),
                            ).length > 0 && (
                            <>
                                <div className='col-span-8'>
                                    <SelectReact
                                        name='nuevo_usuario'
                                        options={listaUsuariosTodoElCliente
                                            .filter(
                                                (us) =>
                                                    !detalleContratoEmpresaCliente.vinculos_contrato.some(
                                                        (num) =>
                                                            num.usuario === us.id &&
                                                            !eliminarUsuarios.some(
                                                                (formUs) => formUs === num.id,
                                                            ),
                                                    ),
                                            )
                                            .filter(
                                                (us) =>
                                                    !usuarios.some(
                                                        (formUs) => formUs.usuario_id === us.id,
                                                    ),
                                            )
                                            .map((us) => ({
                                                value: us.id.toString(),
                                                label: us.email_usuario,
                                            }))}
                                        onChange={(e) => {
                                            setNuevoUsuario((e as TSelectOption).value);
                                        }}
                                        value={{
                                            value: nuevoUsuario,
                                            label:
                                                listaUsuariosTodoElCliente.find(
                                                    (us) => us.id.toString() === nuevoUsuario,
                                                )?.email_usuario || '',
                                        }}
                                        noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                    />
                                </div>
                                <div className='col-span-4'>
                                    <Button
                                        onClick={() => {
                                            if (nuevoUsuario.trim() === '') {
                                                toast.error(
                                                    'Seleccione un usuario para agregarlo',
                                                    {
                                                        toastId:
                                                            'Seleccione un usuario para agregarlo',
                                                    },
                                                );
                                                return;
                                            }
                                            setUsuarios((prev) => [
                                                ...prev,
                                                {
                                                    usuario_id: Number(nuevoUsuario),
                                                    tipo_usuario: 'general',
                                                },
                                            ]);
                                            setNuevoUsuario('');
                                        }}>
                                        Agregar usuario
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    // ── Modo lectura: 3 grupos ──
                    <div className='flex flex-col gap-6'>
                        {/* Grupo 1: Sin envío */}
                        {sinEnvio.length > 0 && (
                            <div>
                                <h6 className='mb-2 text-sm font-semibold text-zinc-500'>
                                    Sin envío de firma
                                </h6>
                                <div className='grid grid-cols-12 gap-2'>
                                    <div className='col-span-4 text-xs font-bold'>Usuario</div>
                                    <div className='col-span-3 text-xs font-bold'>Tipo</div>
                                    <div className='col-span-2 text-xs font-bold'>
                                        F. Vinculación
                                    </div>
                                    <div className='col-span-2 text-xs font-bold'>Estado</div>
                                    <div className='col-span-1 text-xs font-bold'></div>
                                    {sinEnvio.map((v, i) => (
                                        <Fragment key={v.id}>
                                            <div
                                                className={classNames(
                                                    'col-span-4',
                                                    i > 0 && 'border-t border-t-zinc-200 pt-1 dark:border-t-zinc-700',
                                                )}>
                                                {v.datos_usuario.email}
                                            </div>
                                            <div
                                                className={classNames(
                                                    'col-span-3',
                                                    i > 0 && 'border-t border-t-zinc-200 pt-1 dark:border-t-zinc-700',
                                                )}>
                                                {v.tipo_usuario_label}
                                            </div>
                                            <div
                                                className={classNames(
                                                    'col-span-2',
                                                    i > 0 && 'border-t border-t-zinc-200 pt-1 dark:border-t-zinc-700',
                                                )}>
                                                {dayjs(v.fecha_vinculacion).format('DD/MM/YYYY')}
                                            </div>
                                            <div
                                                className={classNames(
                                                    'col-span-2',
                                                    i > 0 && 'border-t border-t-zinc-200 pt-1 dark:border-t-zinc-700',
                                                )}>
                                                <Badge
                                                    variant='outline'
                                                    color={getEstadoFirmaVisual(v.existe_envio).color}>
                                                    {getEstadoFirmaVisual(v.existe_envio).label}
                                                </Badge>
                                            </div>
                                            <div
                                                className={classNames(
                                                    'col-span-1',
                                                    i > 0 && 'border-t border-t-zinc-200 pt-1 dark:border-t-zinc-700',
                                                )}>
                                                <Tooltip text='Enviar firma'>
                                                    <Button
                                                        variant='solid'
                                                        color='blue'
                                                        size='sm'
                                                        icon='DuoMail'
                                                        isLoading={enviando}
                                                        onClick={() => handleEnviarFirma(v.id)}
                                                    />
                                                </Tooltip>
                                            </div>
                                        </Fragment>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Grupo 2: Pendientes de firma (enviado, no firmado) */}
                        {pendientes.length > 0 && (
                            <div>
                                <h6 className='mb-2 text-sm font-semibold text-amber-500'>
                                    Firma enviada
                                </h6>
                                <p className='mb-2 text-xs text-zinc-500'>
                                    El sistema confirma que existe un envio. La firma final no se
                                    expone en esta vista.
                                </p>
                                <div className='grid grid-cols-12 gap-2'>
                                    <div className='col-span-4 text-xs font-bold'>Usuario</div>
                                    <div className='col-span-3 text-xs font-bold'>Tipo</div>
                                    <div className='col-span-2 text-xs font-bold'>
                                        F. Vinculación
                                    </div>
                                    <div className='col-span-2 text-xs font-bold'>Estado</div>
                                    <div className='col-span-1 text-xs font-bold'></div>
                                    {pendientes.map((v, i) => (
                                        <Fragment key={v.id}>
                                            <div
                                                className={classNames(
                                                    'col-span-4',
                                                    i > 0 && 'border-t border-t-zinc-200 pt-1 dark:border-t-zinc-700',
                                                )}>
                                                {v.datos_usuario.email}
                                            </div>
                                            <div
                                                className={classNames(
                                                    'col-span-3',
                                                    i > 0 && 'border-t border-t-zinc-200 pt-1 dark:border-t-zinc-700',
                                                )}>
                                                {v.tipo_usuario_label}
                                            </div>
                                            <div
                                                className={classNames(
                                                    'col-span-2',
                                                    i > 0 && 'border-t border-t-zinc-200 pt-1 dark:border-t-zinc-700',
                                                )}>
                                                {dayjs(v.fecha_vinculacion).format('DD/MM/YYYY')}
                                            </div>
                                            <div
                                                className={classNames(
                                                    'col-span-2',
                                                    i > 0 && 'border-t border-t-zinc-200 pt-1 dark:border-t-zinc-700',
                                                )}>
                                                <Badge
                                                    variant='outline'
                                                    color={getEstadoFirmaVisual(v.existe_envio).color}>
                                                    {getEstadoFirmaVisual(v.existe_envio).label}
                                                </Badge>
                                            </div>
                                            <div
                                                className={classNames(
                                                    'col-span-1',
                                                    i > 0 && 'border-t border-t-zinc-200 pt-1 dark:border-t-zinc-700',
                                                )}>
                                                <Tooltip text='Reenviar firma'>
                                                    <Button
                                                        variant='solid'
                                                        color='emerald'
                                                        size='sm'
                                                        icon='DuoOutgoingMail'
                                                        onClick={() =>
                                                            handleReenviarFirma(
                                                                v.id,
                                                                v.existe_envio!,
                                                            )
                                                        }
                                                    />
                                                </Tooltip>
                                            </div>
                                        </Fragment>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Estado vacío */}
                        {detalleContratoEmpresaCliente.vinculos_contrato.length === 0 && (
                            <div className='text-center text-sm text-zinc-500'>Sin Usuarios</div>
                        )}

                        {/* Resumen de estado de firmas */}
                        {detalleContratoEmpresaCliente.vinculos_contrato.length > 0 && (
                            <div className='flex flex-wrap gap-2 border-t border-t-zinc-200 pt-3 dark:border-t-zinc-700'>
                                <Badge variant='outline' color='zinc'>
                                    {detalleContratoEmpresaCliente.vinculos_contrato.length} total
                                </Badge>
                                {sinEnvio.length > 0 && (
                                    <Badge variant='outline' color='red'>
                                        {sinEnvio.length} sin envío
                                    </Badge>
                                )}
                                {pendientes.length > 0 && (
                                    <Badge variant='outline' color='amber'>
                                        {pendientes.length} con envio
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default TabUsuarios;
