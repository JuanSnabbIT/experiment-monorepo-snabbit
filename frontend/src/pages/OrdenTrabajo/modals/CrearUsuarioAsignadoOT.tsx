import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import {
    listaEquiposPorClienteThunk,
    listaEquiposDeMisClientesThunk,
    listaUsuariosDelEquipoPorClienteThunk,
    listaUsuariosTodoElClienteThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import {
    useGetDetalleOrdenTrabajoQuery,
    useGetUsuariosAsignadosSoporteQuery,
    useGetUsuariosVinculadosOTQuery,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useParams } from 'react-router-dom';

interface UsuarioTemporalOT {
    tipo: 'empresa' | 'externo';
    usuario_empresa_id?: string;
    nombre: string;
    correo?: string;
}

interface UsuarioTemporalSoporte {
    tipo: 'soporte';
    usuario_equipo_id: string;
    nombre: string;
    equipo_label: string;
}

type UsuarioTemporal = UsuarioTemporalOT | UsuarioTemporalSoporte;

interface CrearUsuarioAsignadoOTProps {
    soporteId?: number;
    onSuccess?: () => void;
    modoCrearUsuarioEquipo?: boolean;
    clienteIdOverride?: number;
    externalOpen?: boolean;
    onExternalClose?: () => void;
    showTriggerButton?: boolean;
    onUsuarioEquipoCreado?: (nuevo: {
        id: string;
        nombre: string;
        numeroSerie: string;
        label: string;
    }) => void;
    presetUsuarioEmpresaId?: string;
}

function CrearUsuarioAsignadoOT({
    soporteId,
    onSuccess,
    modoCrearUsuarioEquipo = false,
    clienteIdOverride,
    externalOpen,
    onExternalClose,
    showTriggerButton = true,
    onUsuarioEquipoCreado,
    presetUsuarioEmpresaId,
}: CrearUsuarioAsignadoOTProps) {
    const dispatch = useAppDispatch();
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    const { data: detalleOrdenTrabajo } = useGetDetalleOrdenTrabajoQuery(ordenId ?? 0, {
        skip: !ordenId,
    });
    const { listaUsuariosTodoElCliente } = useAppSelector((state) => state.empresa);
    const { listaUsuariosDelEquipoPorCliente, listaEquiposPorCliente, listaEquiposDeMisClientes } =
        useAppSelector((state) => state.recursos);
    const [equiposFallback, setEquiposFallback] = useState<any[]>([]);
    const [isOpenLocal, setIsOpenLocal] = useState<boolean>(false);
    const [usuariosPendientes, setUsuariosPendientes] = useState<UsuarioTemporal[]>([]);
    // Selecciones modo asignación directa
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<TSelectOption | null>(null);
    const [nombreExterno, setNombreExterno] = useState<string>('');
    const [correoExterno, setCorreoExterno] = useState<string>('');
    const [mostrarCampoCorreo, setMostrarCampoCorreo] = useState<boolean>(false);
    // Selecciones modo crear usuario-equipo
    const [usuarioEmpresaNuevo, setUsuarioEmpresaNuevo] = useState<TSelectOption | null>(null);
    const [equipoNuevo, setEquipoNuevo] = useState<TSelectOption | null>(null);

    // Prefill usuario si viene desde el modal padre
    useEffect(() => {
        if (!presetUsuarioEmpresaId) return;
        const opt = (listaUsuariosTodoElCliente || []).find(
            (u) => u.id.toString() === presetUsuarioEmpresaId,
        );
        if (opt) {
            setUsuarioEmpresaNuevo({ value: opt.id.toString(), label: opt.nombre_usuario });
        }
    }, [presetUsuarioEmpresaId, listaUsuariosTodoElCliente]);

    const [guardando, setGuardando] = useState<boolean>(false);

    const isOpen = typeof externalOpen === 'boolean' ? externalOpen : isOpenLocal;
    const setIsOpen: React.Dispatch<React.SetStateAction<boolean>> = (value) => {
        const next = typeof value === 'function' ? value(isOpen) : value;
        if (typeof externalOpen === 'boolean') {
            if (!next && onExternalClose) onExternalClose();
        } else {
            setIsOpenLocal(next);
        }
    };

    const isSoporteMode = typeof soporteId === 'number';
    const { refetch: refetchUsuariosAsignados } = useGetUsuariosAsignadosSoporteQuery(
        { ordenId: detalleOrdenTrabajo?.id ?? 0, soporteId: soporteId ?? 0 },
        { skip: !isOpen || !isSoporteMode || !detalleOrdenTrabajo?.id || !soporteId },
    );
    const { refetch: refetchUsuariosVinculados } = useGetUsuariosVinculadosOTQuery(
        detalleOrdenTrabajo?.id ?? 0,
        { skip: !isOpen || !detalleOrdenTrabajo?.id || isSoporteMode },
    );
    const clienteId = clienteIdOverride ?? detalleOrdenTrabajo?.cliente;

    useEffect(() => {
        if (!clienteId || !isOpen) return;
        if (isSoporteMode) {
            dispatch(listaUsuariosDelEquipoPorClienteThunk({ cliente_id: clienteId }));
        }
        if (modoCrearUsuarioEquipo) {
            dispatch(listaUsuariosTodoElClienteThunk({ id_empresa: clienteId }));
            dispatch(listaEquiposPorClienteThunk({ cliente_id: clienteId }));
            // Equipos de mis clientes (prestador = empresa OT) para filtrar por clienteId en frontend
            if (detalleOrdenTrabajo?.empresa) {
                dispatch(
                    listaEquiposDeMisClientesThunk({ id_empresa: detalleOrdenTrabajo.empresa }),
                );
            }
        } else if (!isSoporteMode) {
            dispatch(listaUsuariosTodoElClienteThunk({ id_empresa: clienteId }));
        }
    }, [
        clienteId,
        isOpen,
        isSoporteMode,
        dispatch,
        modoCrearUsuarioEquipo,
        detalleOrdenTrabajo?.empresa,
    ]);

    useEffect(() => {
        if (!isOpen) {
            setUsuariosPendientes([]);
            setUsuarioSeleccionado(null);
            setNombreExterno('');
            setCorreoExterno('');
            setMostrarCampoCorreo(false);
            setGuardando(false);
            setUsuarioEmpresaNuevo(null);
            setEquipoNuevo(null);
            setEquiposFallback([]);
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchFallbackEquipos = async () => {
            if (!clienteId || !isOpen || !modoCrearUsuarioEquipo) return;
            if (listaEquiposPorCliente && listaEquiposPorCliente.length > 0) return;
            try {
                const resp = await ApiService.fetchData<any[]>({
                    url: `/api/empresas/${clienteId}/equipos/`,
                    method: 'get',
                });
                setEquiposFallback(resp.data || []);
            } catch (e) {
                // silencio; fallback opcional
            }
        };
        fetchFallbackEquipos();
    }, [clienteId, isOpen, modoCrearUsuarioEquipo, listaEquiposPorCliente]);

    const usuariosSinEquipoOptions = useMemo(() => {
        if (!modoCrearUsuarioEquipo) return [];
        const asignadosActivos = new Set(
            (listaUsuariosDelEquipoPorCliente || [])
                .filter((u) => u.estado)
                .map((u) => u.usuario.toString()),
        );
        return (listaUsuariosTodoElCliente || [])
            .filter((u) => !asignadosActivos.has(u.id.toString()))
            .map((u) => ({ value: u.id.toString(), label: u.nombre_usuario }));
    }, [listaUsuariosDelEquipoPorCliente, listaUsuariosTodoElCliente, modoCrearUsuarioEquipo]);

    const equiposLibresOptions = useMemo(() => {
        if (!modoCrearUsuarioEquipo) return [];
        // Libre = no tiene UsuarioEquipo activo (estado true).
        const equiposBase = (
            listaEquiposPorCliente && listaEquiposPorCliente.length > 0
                ? listaEquiposPorCliente
                : []
        ) as any[];
        const equiposExtra = equiposFallback || [];
        const equiposMisClientes = (listaEquiposDeMisClientes || []).filter(
            (e) => e.cliente?.toString?.() === clienteId?.toString?.(),
        );
        const equiposConUsuarioActivo = new Set(
            (listaUsuariosDelEquipoPorCliente || [])
                .filter((u) => u.estado)
                .map((u) => u.equipo.toString()),
        );

        // Fallback: si no recibimos equipos, pero sí usuarios-equipo, derivar equipos de los UE (incluye inactivos)
        const equiposDerivados = (listaUsuariosDelEquipoPorCliente || [])
            .filter((u) => u.datos_equipo)
            .map((u) => u.datos_equipo);

        const todosEquipos = [
            ...equiposBase,
            ...equiposDerivados,
            ...equiposExtra,
            ...equiposMisClientes,
        ];
        const libresMap = new Map<string, { value: string; label: string }>();

        todosEquipos.forEach((e) => {
            const id = e.id?.toString?.() || '';
            if (!id) return;
            if (equiposConUsuarioActivo.has(id)) return;
            if (!libresMap.has(id)) {
                libresMap.set(id, {
                    value: id,
                    label: `${e.numero_serie} - ${e.marca_label || e.marca}`,
                });
            }
        });

        return Array.from(libresMap.values());
    }, [
        listaEquiposPorCliente,
        listaUsuariosDelEquipoPorCliente,
        modoCrearUsuarioEquipo,
        clienteId,
        equiposFallback,
        listaEquiposDeMisClientes,
    ]);

    const handleSelectChange = (option: TSelectOption | null) => {
        if (!option) {
            setUsuarioSeleccionado(null);
            setMostrarCampoCorreo(false);
            return;
        }

        if (isSoporteMode) {
            const usuariosEquipo = listaUsuariosDelEquipoPorCliente || [];
            const usuarioEquipo = usuariosEquipo.find((u) => u.id.toString() === option.value);

            if (!usuarioEquipo) {
                toast.error('Usuario de equipo no encontrado');
                return;
            }

            if (
                usuariosPendientes.some(
                    (u) => u.tipo === 'soporte' && u.usuario_equipo_id === option.value,
                )
            ) {
                toast.warning('Este usuario ya está en la lista', { autoClose: 1000 });
                setUsuarioSeleccionado(null);
                return;
            }

            const nuevoUsuario: UsuarioTemporalSoporte = {
                tipo: 'soporte',
                usuario_equipo_id: option.value,
                nombre: usuarioEquipo.nombre_usuario,
                equipo_label: usuarioEquipo.datos_equipo?.numero_serie || 'Equipo sin N°',
            };

            setUsuariosPendientes((prev) => [...prev, nuevoUsuario]);
            setUsuarioSeleccionado(null);
            toast.success('Usuario agregado a la lista', { autoClose: 800 });
            return;
        }

        setUsuarioSeleccionado(option);

        const usuarioExiste = listaUsuariosTodoElCliente.find(
            (u) => u.id.toString() === option.value,
        );

        if (usuarioExiste) {
            if (
                usuariosPendientes.some(
                    (u) => u.tipo === 'empresa' && u.usuario_empresa_id === option.value,
                )
            ) {
                toast.warning('Este usuario ya está en la lista', { autoClose: 1000 });
                setUsuarioSeleccionado(null);
                return;
            }

            const nuevoUsuario: UsuarioTemporalOT = {
                tipo: 'empresa',
                usuario_empresa_id: option.value,
                nombre: usuarioExiste.nombre_usuario,
                correo: usuarioExiste.email_usuario || undefined,
            };

            setUsuariosPendientes((prev) => [...prev, nuevoUsuario]);
            setUsuarioSeleccionado(null);
            toast.success('Usuario agregado a la lista', { autoClose: 800 });
        }
    };

    const handleCreateOption = (inputValue: string) => {
        if (isSoporteMode) return;
        setNombreExterno(inputValue);
        setMostrarCampoCorreo(true);
    };

    const agregarUsuarioExterno = () => {
        if (!nombreExterno || !correoExterno) {
            toast.warning('Complete nombre y correo');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correoExterno)) {
            toast.error('Correo no válido');
            return;
        }

        if (usuariosPendientes.some((u) => u.tipo === 'externo' && u.correo === correoExterno)) {
            toast.warning('Este correo ya está en la lista', { autoClose: 1000 });
            return;
        }

        const nuevoUsuario: UsuarioTemporalOT = {
            tipo: 'externo',
            nombre: nombreExterno,
            correo: correoExterno,
        };

        setUsuariosPendientes((prev) => [...prev, nuevoUsuario]);
        setNombreExterno('');
        setCorreoExterno('');
        setMostrarCampoCorreo(false);
        setUsuarioSeleccionado(null);
        toast.success('Usuario externo agregado a la lista', { autoClose: 800 });
    };

    const eliminarDeLista = (index: number) => {
        setUsuariosPendientes((prev) => prev.filter((_, i) => i !== index));
        toast.info('Usuario removido de la lista', { autoClose: 800 });
    };

    const guardarTodos = async () => {
        if (!detalleOrdenTrabajo) {
            toast.error('No se encontró la orden de trabajo');
            return;
        }
        if (usuariosPendientes.length === 0) {
            toast.warning('No hay usuarios para guardar');
            return;
        }

        if (isSoporteMode && typeof soporteId !== 'number') {
            toast.error('Soporte técnico no válido');
            return;
        }

        setGuardando(true);
        let exitosos = 0;
        let fallidos = 0;

        if (isSoporteMode) {
            const usuariosSoporte = usuariosPendientes.filter(
                (u): u is UsuarioTemporalSoporte => u.tipo === 'soporte',
            );
            for (const usuario of usuariosSoporte) {
                try {
                    if (!detalleOrdenTrabajo) continue;
                    // Intentamos primero endpoint top-level (evita 405 del anidado en algunos despliegues)
                    try {
                        await ApiService.fetchData({
                            url: `/api/soportes-v2/${soporteId}/usuarios-asignados-soporte/`,
                            method: 'post',
                            headers: { 'Content-Type': 'application/json' },
                            data: {
                                usuario_equipo: usuario.usuario_equipo_id,
                                soporte_tecnico: soporteId,
                            },
                        });
                    } catch (error: any) {
                        // Fallback al anidado
                        await ApiService.fetchData({
                            url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/soportes-tecnicos/${soporteId}/usuarios-asignados/`,
                            method: 'post',
                            headers: { 'Content-Type': 'application/json' },
                            data: {
                                usuario_equipo: usuario.usuario_equipo_id,
                                soporte_tecnico: soporteId,
                            },
                        });
                    }
                    exitosos++;
                } catch (error: any) {
                    fallidos++;
                    const msg = Object.values(error?.response?.data || {})
                        .flat()
                        .join(' ');
                    if (msg) toast.error(msg);
                }
            }
        } else {
            const usuariosOT = usuariosPendientes.filter(
                (u): u is UsuarioTemporalOT => u.tipo === 'empresa' || u.tipo === 'externo',
            );
            for (const usuario of usuariosOT) {
                try {
                    const data: Record<string, string | number | undefined> = {
                        orden: detalleOrdenTrabajo.id,
                    };
                    if (usuario.tipo === 'empresa') {
                        data.usuario_empresa = usuario.usuario_empresa_id;
                    } else {
                        data.usuario_externo = usuario.nombre;
                        data.correo_usuario_externo = usuario.correo;
                    }

                    await ApiService.fetchData({
                        url: `/api/ordenes-trabajo/${detalleOrdenTrabajo.id}/usuarios-vinculados/`,
                        method: 'post',
                        headers: { 'Content-Type': 'application/json' },
                        data,
                    });
                    exitosos++;
                } catch (error: any) {
                    fallidos++;
                    const msg = Object.values(error?.response?.data || {})
                        .flat()
                        .join(' ');
                    if (msg) toast.error(msg);
                }
            }
        }

        setGuardando(false);

        if (exitosos > 0) {
            toast.success(`${exitosos} usuario(s) vinculado(s) correctamente`, {
                autoClose: 1500,
            });
            if (isSoporteMode) {
                refetchUsuariosAsignados();
                if (onSuccess) onSuccess();
            } else {
                refetchUsuariosVinculados();
            }
            setIsOpen(false);
        }

        if (fallidos > 0) {
            toast.error(`${fallidos} usuario(s) no pudieron ser vinculados`, { autoClose: 2000 });
        }
    };

    const crearUsuarioEquipo = async () => {
        if (!clienteId || !isSoporteMode) {
            toast.error('Faltan datos de cliente o soporte');
            return;
        }
        if (!usuarioEmpresaNuevo || !equipoNuevo) {
            toast.warning('Seleccione usuario y equipo');
            return;
        }
        setGuardando(true);
        try {
            const resp = await ApiService.fetchData<{ id: number }>({
                url: `/api/usuarios-equipo/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: {
                    usuario: usuarioEmpresaNuevo.value,
                    equipo: equipoNuevo.value,
                    estado: true,
                },
            });
            if (resp.data?.id) {
                toast.success('Usuario con equipo creado', { autoClose: 1200 });
                const numeroSerieParsed =
                    (equipoNuevo.label || '').split(' - ')[0] || equipoNuevo.label || '';
                onUsuarioEquipoCreado?.({
                    id: resp.data.id.toString(),
                    nombre: usuarioEmpresaNuevo.label || '',
                    numeroSerie: numeroSerieParsed,
                    label: `${numeroSerieParsed} - ${usuarioEmpresaNuevo.label || ''}`,
                });
            }
            dispatch(listaUsuariosDelEquipoPorClienteThunk({ cliente_id: clienteId }));
            if (onSuccess) onSuccess();
            setUsuarioEmpresaNuevo(null);
            setEquipoNuevo(null);
            setIsOpen(false);
        } catch (error: any) {
            const msg = Object.values(error?.response?.data || {})
                .flat()
                .join(' ');
            toast.error(msg || 'Error al crear asignación');
        } finally {
            setGuardando(false);
        }
    };

    const optionsSoporte = (listaUsuariosDelEquipoPorCliente || []).map((user) => ({
        value: user.id.toString(),
        label: `${user.datos_equipo?.numero_serie || 'Equipo'} - ${user.nombre_usuario}`,
    }));

    const optionsEmpresa = (listaUsuariosTodoElCliente || []).map((user) => ({
        value: user.id.toString(),
        label: user.nombre_usuario,
    }));

    return (
        <>
            {showTriggerButton &&
                detalleOrdenTrabajo &&
                (detalleOrdenTrabajo.estado === 'pendiente' ||
                    detalleOrdenTrabajo.estado === 'en_proceso') && (
                    <Tooltip text='Agregar Usuario'>
                        <Button
                            variant='solid'
                            icon='HeroPlus'
                            onClick={() => {
                                setIsOpen(true);
                            }}></Button>
                    </Tooltip>
                )}
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true} size='xl'>
                <ModalHeader>
                    <Badge className='text-xl'>
                        {modoCrearUsuarioEquipo
                            ? 'Crear nueva asignación usuario-equipo'
                            : isSoporteMode
                              ? 'Asignar Usuario con Equipo'
                              : 'Agregar Usuario'}
                    </Badge>
                </ModalHeader>
                <ModalBody>
                    {modoCrearUsuarioEquipo && isSoporteMode ? (
                        <div className='flex flex-col gap-4'>
                            <div>
                                <Badge>Usuario de la empresa (sin equipo activo)</Badge>
                                <SelectReact
                                    name='usuario_empresa'
                                    placeholder='Seleccione usuario'
                                    isClearable
                                    options={usuariosSinEquipoOptions}
                                    value={usuarioEmpresaNuevo}
                                    onChange={(val) =>
                                        setUsuarioEmpresaNuevo(val as TSelectOption | null)
                                    }
                                    noOptionsMessage={() => 'No hay usuarios disponibles'}
                                />
                            </div>
                            <div>
                                <Badge>Equipo libre</Badge>
                                <SelectReact
                                    name='equipo_libre'
                                    placeholder='Seleccione equipo'
                                    isClearable
                                    options={equiposLibresOptions}
                                    value={equipoNuevo}
                                    onChange={(val) => setEquipoNuevo(val as TSelectOption | null)}
                                    noOptionsMessage={() => 'No hay equipos libres'}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className='flex flex-col gap-4'>
                            <div>
                                <Badge>
                                    {isSoporteMode ? 'Usuario de Equipo' : 'Usuario / Nombre'}
                                </Badge>
                                <SelectReact
                                    name='usuario'
                                    placeholder={
                                        isSoporteMode
                                            ? 'Seleccione un usuario con equipo'
                                            : 'Seleccione un usuario o Ingrese un nombre'
                                    }
                                    isClearable
                                    isCreatable={!isSoporteMode}
                                    options={isSoporteMode ? optionsSoporte : optionsEmpresa}
                                    formatCreateLabel={(e) => `Crear "${e}"`}
                                    noOptionsMessage={(e) =>
                                        isSoporteMode
                                            ? `No existe ${e.inputValue}`
                                            : `No existe "${e.inputValue}"`
                                    }
                                    onChange={(val) =>
                                        handleSelectChange(val as TSelectOption | null)
                                    }
                                    onCreateOption={handleCreateOption}
                                    value={usuarioSeleccionado}
                                />
                            </div>

                            {!isSoporteMode && mostrarCampoCorreo && nombreExterno && (
                                <div className='rounded-lg border bg-blue-50 p-4'>
                                    <Badge className='mb-2'>Usuario Externo: {nombreExterno}</Badge>
                                    <div className='flex gap-2'>
                                        <div className='flex-1'>
                                            <Input
                                                name='correo'
                                                placeholder='correo@ejemplo.com'
                                                value={correoExterno}
                                                onChange={(
                                                    e: React.ChangeEvent<HTMLInputElement>,
                                                ) => setCorreoExterno(e.target.value)}
                                                onKeyDown={(
                                                    e: React.KeyboardEvent<HTMLInputElement>,
                                                ) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        agregarUsuarioExterno();
                                                    }
                                                }}
                                            />
                                        </div>
                                        <Button
                                            variant='solid'
                                            color='blue'
                                            onClick={agregarUsuarioExterno}>
                                            Agregar
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {usuariosPendientes.length > 0 && (
                                <div>
                                    <Badge className='mb-2'>
                                        Usuarios a Vincular ({usuariosPendientes.length})
                                    </Badge>
                                    <div className='overflow-hidden rounded-lg border'>
                                        <Table>
                                            <THead>
                                                <Tr>
                                                    <Th className='text-left'>Nombre</Th>
                                                    <Th className='text-left'>
                                                        {isSoporteMode ? 'Equipo' : 'Tipo'}
                                                    </Th>
                                                    {!isSoporteMode && (
                                                        <Th className='text-left'>Correo</Th>
                                                    )}
                                                    <Th className='text-center'>Acciones</Th>
                                                </Tr>
                                            </THead>
                                            <TBody>
                                                {usuariosPendientes.map((usuario, index) => (
                                                    <Tr key={`${usuario.nombre}-${index}`}>
                                                        <Td>{usuario.nombre}</Td>
                                                        <Td>
                                                            {usuario.tipo === 'empresa' ? (
                                                                <Badge color='blue'>Empresa</Badge>
                                                            ) : usuario.tipo === 'externo' ? (
                                                                <Badge color='amber'>Externo</Badge>
                                                            ) : (
                                                                <Badge color='sky'>
                                                                    {(
                                                                        usuario as UsuarioTemporalSoporte
                                                                    ).equipo_label || 'Equipo'}
                                                                </Badge>
                                                            )}
                                                        </Td>
                                                        {!isSoporteMode && (
                                                            <Td>
                                                                {usuario.tipo !== 'soporte' &&
                                                                usuario.correo ? (
                                                                    usuario.correo
                                                                ) : (
                                                                    <span className='italic text-gray-400'>
                                                                        -
                                                                    </span>
                                                                )}
                                                            </Td>
                                                        )}
                                                        <Td className='text-center'>
                                                            <Button
                                                                variant='solid'
                                                                color='red'
                                                                size='xs'
                                                                icon='HeroTrash'
                                                                onClick={() =>
                                                                    eliminarDeLista(index)
                                                                }
                                                            />
                                                        </Td>
                                                    </Tr>
                                                ))}
                                            </TBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            {usuariosPendientes.length === 0 && !mostrarCampoCorreo && (
                                <div className='rounded-lg border border-dashed bg-gray-50 py-4 text-center text-gray-500'>
                                    {isSoporteMode
                                        ? 'Seleccione usuarios de equipo para agregar a la lista'
                                        : 'Seleccione usuarios para agregar a la lista'}
                                </div>
                            )}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpen(false);
                            }}
                            isDisable={guardando}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={
                                modoCrearUsuarioEquipo && isSoporteMode
                                    ? crearUsuarioEquipo
                                    : guardarTodos
                            }
                            isDisable={
                                guardando ||
                                (modoCrearUsuarioEquipo && isSoporteMode
                                    ? !usuarioEmpresaNuevo || !equipoNuevo
                                    : usuariosPendientes.length === 0)
                            }>
                            {guardando
                                ? 'Guardando...'
                                : modoCrearUsuarioEquipo && isSoporteMode
                                  ? 'Crear'
                                  : `Guardar ${usuariosPendientes.length > 0 ? `(${usuariosPendientes.length})` : ''}`}
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearUsuarioAsignadoOT;
