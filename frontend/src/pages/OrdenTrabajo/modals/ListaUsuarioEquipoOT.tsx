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
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import { IItemSerializado, IUsuarioAsignadoSoporte } from '@/interface/ordenTrabajo.interface';
import FirmarAsignacionUsuario from './FirmarAsignacionUsuario';
import ApiService from '@/services/ApiService';
import { confirmAlert } from '@/utils/sweetAlert';
import { getErrorMessage } from '@/utils/errorHandlers';
import {
    listaEquiposPorClienteThunk,
    listaUsuariosDelEquipoPorClienteThunk,
    listaUsuariosTodoElClienteThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import {
    useActualizarUsuarioAsignadoSoporteMutation,
    useEliminarUsuarioAsignadoSoporteMutation,
    useGetItemsSerializadosQuery,
    useGetUsuariosAsignadosPendientesQuery,
    useGetUsuariosAsignadosSoporteQuery,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

interface ListaUsuarioEquipoOTProps {
    ordenId: number;
    soporteId: number;
    soporteEstado?: string | null;
    tecnicoNombre?: string | null;
    clienteId: number;
    isOpen: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

type TipoFila = 'ue' | 'u';

interface FilaPendiente {
    tipo: TipoFila;
    id: string; // usuario_equipo id si tipo ue, o usuario_empresa id si tipo u
    usuarioEmpresaId?: string;
    usuarioEquipoId?: string;
    nombre: string;
    equipoLabel?: string;
    equipoId?: string;
}

interface OpcionUsuario extends TSelectOption {
    usuarioEmpresaId?: string;
    usuarioEquipoId?: string;
    nombre?: string;
    equipoLabel?: string;
    equipoId?: string;
}

interface GrupoUsuarios {
    label: string;
    options: OpcionUsuario[];
}

type TipoSeleccion = 'equipo' | 'item_guia' | 'sin_equipo';

interface MovimientoAsignacion {
    tipo: 'vincular' | 'desvincular';
    equipo_id?: number | null;
    item_guia_id?: number | null;
    label?: string | null;
}

interface CacheAsignacion {
    original: {
        usuario_equipo_id?: number | null;
        equipo_id?: number | null;
        numero_serie?: string | null;
    };
    cache: {
        seleccion: {
            tipo: TipoSeleccion;
            equipo_id?: number | null;
            item_guia_id?: number | null;
            label?: string | null;
        };
        movimientos: MovimientoAsignacion[];
    };
    historial?: Array<Record<string, unknown>>;
    firma_pendiente?: Record<string, unknown>;
}

const buildEquipoNombre = (
    equipo?: {
        nombre_equipo?: string | null;
        tipo_equipo_label?: string | null;
        marca_label?: string | null;
        marca?: string | null;
        modelo?: string | null;
    } | null,
) => {
    if (!equipo) return 'Equipo';
    const nombre =
        (equipo.nombre_equipo || '').trim() ||
        (equipo.tipo_equipo_label || '').trim() ||
        (equipo.modelo || '').trim() ||
        (equipo.marca_label || equipo.marca || '').trim();
    return nombre || 'Equipo';
};

const buildEquipoLabel = (
    equipo?: {
        nombre_equipo?: string | null;
        tipo_equipo_label?: string | null;
        marca_label?: string | null;
        marca?: string | null;
        modelo?: string | null;
        numero_serie?: string | null;
    } | null,
) => {
    const nombre = buildEquipoNombre(equipo);
    const serie = (equipo?.numero_serie || '').trim() || 'Sin serie';
    return `${nombre} - No. ${serie}`;
};

function ListaUsuarioEquipoOT({
    ordenId,
    soporteId,
    soporteEstado,
    tecnicoNombre,
    clienteId,
    isOpen,
    onClose,
    onSaved,
}: ListaUsuarioEquipoOTProps) {
    const estadoLower = (soporteEstado || '').toLowerCase();
    const isPendiente = estadoLower === 'pendiente';
    const isEnProceso = estadoLower === 'en_proceso' || estadoLower === 'en proceso';
    const dispatch = useAppDispatch();
    const { listaUsuariosDelEquipoPorCliente, listaEquiposPorCliente } = useAppSelector(
        (state) => state.recursos,
    );
    const { listaUsuariosTodoElCliente } = useAppSelector((state) => state.empresa);
    const {
        data: listaUsuariosAsignadosSoporte = [],
        refetch: refetchUsuariosAsignados,
    } = useGetUsuariosAsignadosSoporteQuery(
        { ordenId, soporteId },
        { skip: !isOpen },
    );
    const { data: usuariosPendientesData } = useGetUsuariosAsignadosPendientesQuery(
        { ordenId, soporteId },
        { skip: !isOpen },
    );
    const {
        data: itemsSerializadosData = [],
        isFetching: cargandoSeriales,
    } = useGetItemsSerializadosQuery(ordenId, {
        skip: !isOpen || !isEnProceso,
    });
    const [actualizarUsuarioAsignado] = useActualizarUsuarioAsignadoSoporteMutation();
    const [eliminarUsuarioAsignado] = useEliminarUsuarioAsignadoSoporteMutation();
    const itemsSerializados = itemsSerializadosData || [];
    const usuariosAsignadosOtPendientes = usuariosPendientesData?.usuario_empresa_ids || [];

    const [seleccionPendiente, setSeleccionPendiente] = useState<FilaPendiente[]>([]);
    const [selectValue, setSelectValue] = useState<TSelectOption | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [cambiosEquipos, setCambiosEquipos] = useState<Record<number, CacheAsignacion>>({});
    const [limpiarCacheIds, setLimpiarCacheIds] = useState<number[]>([]);
    const [isOpenFirmaUsuario, setIsOpenFirmaUsuario] = useState(false);
    const [usuarioFirmaSeleccionado, setUsuarioFirmaSeleccionado] =
        useState<IUsuarioAsignadoSoporte | null>(null);
    const [movimientosFirma, setMovimientosFirma] = useState<MovimientoAsignacion[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        dispatch(listaUsuariosDelEquipoPorClienteThunk({ cliente_id: clienteId }));
        dispatch(listaUsuariosTodoElClienteThunk({ id_empresa: clienteId }));
        dispatch(listaEquiposPorClienteThunk({ cliente_id: clienteId }));
    }, [clienteId, dispatch, isOpen, ordenId, soporteId]);



    useEffect(() => {
        if (!isOpen) {
            setSeleccionPendiente([]);
            setSelectValue(null);
            setGuardando(false);
            setCambiosEquipos({});
            setLimpiarCacheIds([]);
            setIsOpenFirmaUsuario(false);
            setUsuarioFirmaSeleccionado(null);
            setMovimientosFirma([]);
        }
    }, [isOpen]);

    // Usuarios con equipo activo y usuarios sin equipo activo
    const usuarioEquipoToUsuarioEmpresa = useMemo(() => {
        const map = new Map<string, string>();
        (listaUsuariosDelEquipoPorCliente || []).forEach((u) => {
            if (!u.id || !u.usuario) return;
            map.set(u.id.toString(), u.usuario.toString());
        });
        return map;
    }, [listaUsuariosDelEquipoPorCliente]);

    const usuariosAsignadosSet = useMemo(() => {
        const set = new Set<string>();
        (listaUsuariosAsignadosSoporte || []).forEach((u) => {
            if (u.usuario_empresa) {
                set.add(u.usuario_empresa.toString());
                return;
            }
            if (u.usuario_equipo) {
                const usuarioEmpresaId = usuarioEquipoToUsuarioEmpresa.get(
                    u.usuario_equipo.toString(),
                );
                if (usuarioEmpresaId) set.add(usuarioEmpresaId);
            }
        });
        usuariosAsignadosOtPendientes.forEach((id) => {
            set.add(id.toString());
        });
        return set;
    }, [
        listaUsuariosAsignadosSoporte,
        usuarioEquipoToUsuarioEmpresa,
        usuariosAsignadosOtPendientes,
    ]);

    const opcionesUsuarios = useMemo((): GrupoUsuarios[] => {
        const activos: OpcionUsuario[] = (listaUsuariosDelEquipoPorCliente || [])
            .filter((u) => u.estado)
            .filter((u) => !usuariosAsignadosSet.has(u.usuario.toString()))
            .map((u) => ({
                value: `ue:${u.id}`,
                label: `${buildEquipoNombre(u.datos_equipo)} - ${u.nombre_usuario}`,
                usuarioEmpresaId: u.usuario.toString(),
                usuarioEquipoId: u.id.toString(),
                nombre: u.nombre_usuario,
                equipoLabel: buildEquipoLabel(u.datos_equipo),
                equipoId: u.equipo?.toString(),
            }));
        const activosUsuario = new Set(
            (listaUsuariosDelEquipoPorCliente || [])
                .filter((u) => u.estado)
                .map((u) => u.usuario.toString()),
        );
        const sinEquipo: OpcionUsuario[] = (listaUsuariosTodoElCliente || [])
            .filter((u) => !activosUsuario.has(u.id.toString()))
            .filter((u) => !usuariosAsignadosSet.has(u.id.toString()))
            .map((u) => ({
                value: `u:${u.id}`,
                label: `${u.nombre_usuario} (sin equipo activo)`,
                usuarioEmpresaId: u.id.toString(),
                nombre: u.nombre_usuario,
            }));
        return [
            { label: 'Usuarios con equipo', options: activos },
            { label: 'Usuarios sin equipo', options: sinEquipo },
        ];
    }, [listaUsuariosDelEquipoPorCliente, listaUsuariosTodoElCliente, usuariosAsignadosSet]);

    const yaAsignadosIds = useMemo(() => {
        const ids = (listaUsuariosAsignadosSoporte || [])
            .map((u) => u.usuario_equipo)
            .filter((id): id is number => Boolean(id))
            .map((id) => id.toString());
        return new Set(ids);
    }, [listaUsuariosAsignadosSoporte]);

    const equiposActivosSet = useMemo(
        () =>
            new Set(
                (listaUsuariosDelEquipoPorCliente || [])
                    .filter((u) => u.estado)
                    .map((u) => u.equipo.toString()),
            ),
        [listaUsuariosDelEquipoPorCliente],
    );

    const equiposActivosPorUsuario = useMemo(() => {
        const map = new Map<string, TSelectOption[]>();
        (listaUsuariosDelEquipoPorCliente || []).forEach((u) => {
            if (!u.estado) return; // solo equipos activos del usuario
            const key = u.usuario.toString();
            const arr = map.get(key) || [];
            arr.push({
                value: u.equipo.toString(),
                label: buildEquipoLabel(u.datos_equipo),
            });
            map.set(key, arr);
        });
        return map;
    }, [listaUsuariosDelEquipoPorCliente]);

    const getCacheGuardado = (usuario: IUsuarioAsignadoSoporte): CacheAsignacion | null => {
        const raw = usuario.cache_asignacion as Record<string, unknown> | null | undefined;
        if (!raw || typeof raw !== 'object') return null;
        const cache = raw.cache as Record<string, unknown> | undefined;
        const movimientos = cache?.movimientos;
        if (!Array.isArray(movimientos)) return null;
        return raw as unknown as CacheAsignacion;
    };

    const getCachePersistente = (usuario: IUsuarioAsignadoSoporte): Record<string, unknown> => {
        const raw = usuario.cache_asignacion as Record<string, unknown> | null | undefined;
        if (!raw || typeof raw !== 'object') return {};
        const next: Record<string, unknown> = {};
        if (raw.original) next.original = raw.original;
        if (Array.isArray(raw.historial) && raw.historial.length > 0) {
            next.historial = raw.historial;
        }
        return next;
    };

    const cacheInicialIds = useMemo(
        () =>
            new Set(
                (listaUsuariosAsignadosSoporte || [])
                    .filter((u) => {
                        const cache = getCacheGuardado(u);
                        return Boolean(cache?.cache?.movimientos?.length);
                    })
                    .map((u) => u.id),
            ),
        [listaUsuariosAsignadosSoporte],
    );

    const opcionesSeriales = useMemo(() => {
        return itemsSerializados.map((item) => ({
            value: `gs:${item.item_guia_id}`,
            label: `${item.item_nombre} - No. ${item.serie} (Guia #${item.guia_id})`,
        }));
    }, [itemsSerializados]);

    const seleccionActualPorId = useMemo(() => {
        const map = new Map<number, string>();
        (listaUsuariosAsignadosSoporte || []).forEach((u) => {
            const override = cambiosEquipos[u.id];
            const debeLimpiar = limpiarCacheIds.includes(u.id);
            const cache = debeLimpiar ? null : override || getCacheGuardado(u);
            const seleccion = cache?.cache?.seleccion;
            if (seleccion?.tipo === 'equipo' && seleccion.equipo_id) {
                map.set(u.id, `eq:${seleccion.equipo_id}`);
                return;
            }
            if (seleccion?.tipo === 'item_guia' && seleccion.item_guia_id) {
                map.set(u.id, `gs:${seleccion.item_guia_id}`);
                return;
            }
            if (seleccion?.tipo === 'sin_equipo') {
                map.set(u.id, 'none');
                return;
            }
            if (u.equipo_id) {
                map.set(u.id, `eq:${u.equipo_id}`);
                return;
            }
        });
        return map;
    }, [cambiosEquipos, limpiarCacheIds, listaUsuariosAsignadosSoporte]);

    const equiposLiberables = useMemo(() => {
        const ids = new Set<string>();
        (listaUsuariosAsignadosSoporte || []).forEach((u) => {
            if (!u.equipo_id) return;
            const seleccion = seleccionActualPorId.get(u.id);
            if (!seleccion) return;
            const actualId = u.equipo_id.toString();
            if (seleccion === 'none') {
                ids.add(actualId);
                return;
            }
            if (seleccion.startsWith('eq:')) {
                const nuevoId = seleccion.replace('eq:', '');
                if (nuevoId !== actualId) ids.add(actualId);
                return;
            }
            if (seleccion.startsWith('gs:')) {
                ids.add(actualId);
            }
        });
        return ids;
    }, [listaUsuariosAsignadosSoporte, seleccionActualPorId]);

    const equiposInactivosEmpresa = useMemo(() => {
        const map = new Map<string, { value: string; label: string }>();
        const baseEquipos = listaEquiposPorCliente || [];

        baseEquipos.forEach((e) => {
            const id = e.id?.toString?.();
            if (!id) return;
            if (equiposActivosSet.has(id) && !equiposLiberables.has(id)) return;
            const label = buildEquipoLabel(e);
            map.set(id, { value: id, label });
        });

        // Fallback: incluir equipos referenciados en usuarios-equipo inactivos o por liberar
        (listaUsuariosDelEquipoPorCliente || [])
            .filter((u) => !u.estado || equiposLiberables.has(u.equipo?.toString?.() || ''))
            .forEach((u) => {
                const id = u.equipo?.toString?.();
                if (!id || (equiposActivosSet.has(id) && !equiposLiberables.has(id)) || map.has(id))
                    return;
                const label = buildEquipoLabel(u.datos_equipo);
                map.set(id, { value: id, label });
            });

        return Array.from(map.values());
    }, [
        listaEquiposPorCliente,
        listaUsuariosDelEquipoPorCliente,
        equiposActivosSet,
        equiposLiberables,
    ]);

    const hayCambiosEnProceso = useMemo(
        () => Object.keys(cambiosEquipos).length > 0 || limpiarCacheIds.length > 0,
        [cambiosEquipos, limpiarCacheIds],
    );
    const cambiosCount = Object.keys(cambiosEquipos).length + limpiarCacheIds.length;
    const guardarDisabled =
        guardando ||
        (isPendiente ? seleccionPendiente.length === 0 : isEnProceso ? !hayCambiosEnProceso : true);
    const guardarLabel = guardando
        ? 'Guardando...'
        : isEnProceso
          ? `Guardar${cambiosCount ? ` (${cambiosCount})` : ''}`
          : `Guardar${seleccionPendiente.length ? ` (${seleccionPendiente.length})` : ''}`;
    const pendientesCount = useMemo(() => {
        if (isEnProceso) {
            return (listaUsuariosAsignadosSoporte || []).filter((u) => !u.resuelto).length;
        }
        return seleccionPendiente.length;
    }, [isEnProceso, listaUsuariosAsignadosSoporte, seleccionPendiente.length]);

    const abrirModalFirmaUsuario = (
        usuario: IUsuarioAsignadoSoporte,
        cache: CacheAsignacion | null,
    ) => {
        setUsuarioFirmaSeleccionado(usuario);
        setMovimientosFirma(cache?.cache?.movimientos || []);
        setIsOpenFirmaUsuario(true);
    };

    const guardarCacheUsuario = async (usuarioId: number, cache: CacheAsignacion) => {
        try {
            await actualizarUsuarioAsignado({
                ordenId,
                soporteId,
                usuarioId,
                data: { cache_asignacion: cache as unknown as Record<string, unknown> },
            }).unwrap();
            setCambiosEquipos((prev) => {
                const next = { ...prev };
                delete next[usuarioId];
                return next;
            });
            setLimpiarCacheIds((prev) => prev.filter((id) => id !== usuarioId));
            return true;
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
            return false;
        }
    };

    const handleFirmarUsuario = async (usuario: IUsuarioAsignadoSoporte) => {
        const cacheLocal = cambiosEquipos[usuario.id];
        const cacheGuardado = getCacheGuardado(usuario);
        const cacheParaFirma = cacheLocal || cacheGuardado;
        if (!cacheParaFirma?.cache?.movimientos?.length) {
            toast.info('No hay cambios para firmar');
            return;
        }
        if (cacheLocal) {
            const ok = await guardarCacheUsuario(usuario.id, cacheLocal);
            if (!ok) return;
        }
        abrirModalFirmaUsuario(usuario, cacheParaFirma);
    };

    const handleSelect = (option: TSelectOption | null) => {
        if (!isPendiente) return;
        if (!option) {
            setSelectValue(null);
            return;
        }
        const raw = (option.value as string) || '';
        if (raw.startsWith('ue:')) {
            const ueId = raw.replace('ue:', '');
            const flat = opcionesUsuarios.flatMap((g) => g.options ?? []);
            const found = flat.find((o) => o.value === option.value);
            if (!found) {
                toast.error('Usuario con equipo no encontrado');
                return;
            }
            if (seleccionPendiente.some((u) => u.id === ueId) || yaAsignadosIds.has(ueId)) {
                toast.warning('Este usuario con equipo ya esta agregado');
                setSelectValue(null);
                return;
            }
            const nombre = found.nombre || found.label || 'Usuario';
            setSeleccionPendiente((prev) => [
                ...prev,
                {
                    tipo: 'ue',
                    id: ueId,
                    usuarioEmpresaId: found.usuarioEmpresaId,
                    usuarioEquipoId: found.usuarioEquipoId,
                    nombre,
                    equipoLabel: found.equipoLabel,
                    equipoId: found.equipoId,
                },
            ]);
            setSelectValue(null);
            return;
        }
        if (raw.startsWith('u:')) {
            const userId = raw.replace('u:', '');
            const flat = opcionesUsuarios.flatMap((g) => g.options ?? []);
            const found = flat.find((o) => o.value === option.value);
            if (!found) return;
            if (usuariosAsignadosSet.has(userId)) {
                toast.warning('Este usuario ya esta asignado');
                setSelectValue(null);
                return;
            }
            const nombre = found.nombre || found.label || 'Usuario';
            setSeleccionPendiente((prev) => [
                ...prev,
                {
                    tipo: 'u',
                    id: userId,
                    usuarioEmpresaId: userId,
                    nombre,
                    equipoLabel: undefined,
                    equipoId: undefined,
                },
            ]);
            setSelectValue(null);
            return;
        }
    };

    const removerPendiente = (id: string) => {
        setSeleccionPendiente((prev) => prev.filter((u) => u.id !== id));
    };

    const eliminarAsignado = async (idAsignado: number, nombre: string) => {
        if (!isPendiente) return;
        const ok = await confirmAlert({
            title: 'Confirmar eliminacion',
            text: `Eliminar la asignacion de ${nombre}?`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            icon: 'warning',
            confirmColor: '#dc2626',
        });
        if (!ok) return;
        try {
            await eliminarUsuarioAsignado({
                ordenId,
                soporteId,
                usuarioId: idAsignado,
            }).unwrap();
            toast.success('Asignacion eliminada', { autoClose: 1000 });
            refetchUsuariosAsignados();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const getUsuarioEmpresaId = (usuario: IUsuarioAsignadoSoporte) => {
        if (usuario.usuario_empresa) return usuario.usuario_empresa.toString();
        if (usuario.usuario_equipo) {
            return usuarioEquipoToUsuarioEmpresa.get(usuario.usuario_equipo.toString()) || null;
        }
        return null;
    };

    const buildCacheAsignacion = (
        usuario: IUsuarioAsignadoSoporte,
        option: TSelectOption | null,
    ): CacheAsignacion | null => {
        const cacheGuardado = getCacheGuardado(usuario);
        const rawCache = usuario.cache_asignacion as Record<string, unknown> | null | undefined;
        const historialBase = Array.isArray(rawCache?.historial) ? rawCache?.historial : undefined;
        const firmaPendiente = rawCache?.firma_pendiente as Record<string, unknown> | undefined;
        const raw = (option?.value as string | undefined) ?? '';
        const currentEquipoId = usuario.equipo_id ?? null;
        const etiquetaActual = `${usuario.tipo_equipo || 'Equipo'} - No. ${usuario.numero_serie_equipo || 'Sin serie'}`;
        let tipo: TipoSeleccion = 'sin_equipo';
        let equipoId: number | null = null;
        let itemGuiaId: number | null = null;

        if (raw.startsWith('eq:')) {
            tipo = 'equipo';
            equipoId = Number(raw.replace('eq:', ''));
        } else if (raw.startsWith('gs:')) {
            tipo = 'item_guia';
            itemGuiaId = Number(raw.replace('gs:', ''));
        } else if (raw === 'none' || !raw) {
            tipo = 'sin_equipo';
        }

        const movimientos: MovimientoAsignacion[] = [];
        if (currentEquipoId) {
            if (tipo === 'sin_equipo') {
                movimientos.push({
                    tipo: 'desvincular',
                    equipo_id: currentEquipoId,
                    label: etiquetaActual,
                });
            } else if (tipo === 'equipo' && equipoId && equipoId !== currentEquipoId) {
                movimientos.push({
                    tipo: 'desvincular',
                    equipo_id: currentEquipoId,
                    label: etiquetaActual,
                });
                movimientos.push({
                    tipo: 'vincular',
                    equipo_id: equipoId,
                    label: option?.label || null,
                });
            } else if (tipo === 'item_guia' && itemGuiaId) {
                movimientos.push({
                    tipo: 'desvincular',
                    equipo_id: currentEquipoId,
                    label: etiquetaActual,
                });
                movimientos.push({
                    tipo: 'vincular',
                    item_guia_id: itemGuiaId,
                    label: option?.label || null,
                });
            }
        } else if (tipo === 'equipo' && equipoId) {
            movimientos.push({
                tipo: 'vincular',
                equipo_id: equipoId,
                label: option?.label || null,
            });
        } else if (tipo === 'item_guia' && itemGuiaId) {
            movimientos.push({
                tipo: 'vincular',
                item_guia_id: itemGuiaId,
                label: option?.label || null,
            });
        }

        if (movimientos.length === 0) return null;

        const original = cacheGuardado?.original ?? {
            usuario_equipo_id: usuario.usuario_equipo ?? null,
            equipo_id: currentEquipoId,
            numero_serie: usuario.numero_serie_equipo ?? null,
        };

        const nuevoCache: CacheAsignacion = {
            original,
            cache: {
                seleccion: {
                    tipo,
                    equipo_id: equipoId,
                    item_guia_id: itemGuiaId,
                    label: option?.label || null,
                },
                movimientos,
            },
            historial: historialBase && historialBase.length > 0 ? [...historialBase] : undefined,
            firma_pendiente: firmaPendiente,
        };

        return nuevoCache;
    };

    const actualizarCacheSeleccion = (
        usuario: IUsuarioAsignadoSoporte,
        option: TSelectOption | null,
    ) => {
        const cache = buildCacheAsignacion(usuario, option);
        setCambiosEquipos((prev) => {
            const next = { ...prev };
            if (cache) {
                next[usuario.id] = cache;
            } else {
                delete next[usuario.id];
            }
            return next;
        });

        setLimpiarCacheIds((prev) => {
            const shouldClear = !cache && cacheInicialIds.has(usuario.id);
            if (shouldClear) {
                return prev.includes(usuario.id) ? prev : [...prev, usuario.id];
            }
            return prev.filter((id) => id !== usuario.id);
        });
    };

    const guardarCambiosEquipos = async () => {
        const idsConCache = Object.keys(cambiosEquipos).map((id) => Number(id));
        const idsParaLimpiar = limpiarCacheIds.filter((id) => !idsConCache.includes(id));
        if (idsConCache.length === 0 && idsParaLimpiar.length === 0) {
            toast.info('No hay cambios para guardar');
            return;
        }

        setGuardando(true);
        let exitosos = 0;
        let fallidos = 0;

        const actualizar = async (
            idUsuarioAsignado: number,
            data: Partial<IUsuarioAsignadoSoporte>,
        ) => {
            try {
                await actualizarUsuarioAsignado({
                    ordenId,
                    soporteId,
                    usuarioId: idUsuarioAsignado,
                    data: data as Record<string, unknown>,
                }).unwrap();
                exitosos++;
            } catch (error: unknown) {
                fallidos++;
                toast.error(getErrorMessage(error));
            }
        };

        for (const idUsuario of idsConCache) {
            const usuario = (listaUsuariosAsignadosSoporte || []).find((u) => u.id === idUsuario);
            const baseCache = usuario ? getCachePersistente(usuario) : {};
            const cacheActualizado = { ...baseCache, ...cambiosEquipos[idUsuario] };
            await actualizar(idUsuario, { cache_asignacion: cacheActualizado });
        }

        for (const idUsuario of idsParaLimpiar) {
            const usuario = (listaUsuariosAsignadosSoporte || []).find((u) => u.id === idUsuario);
            const baseCache = usuario ? getCachePersistente(usuario) : {};
            await actualizar(idUsuario, { cache_asignacion: baseCache });
        }

        setGuardando(false);
        setCambiosEquipos({});
        setLimpiarCacheIds([]);

        if (exitosos > 0) {
            toast.success('Cambios guardados', { autoClose: 1200 });
            refetchUsuariosAsignados();
            if (onSaved) onSaved();
        }
        if (fallidos > 0) {
            toast.error(`${fallidos} Asignacion(es) no pudieron guardarse`, { autoClose: 2000 });
        }
    };

    const guardarAsignaciones = async () => {
        if (isEnProceso) {
            await guardarCambiosEquipos();
            return;
        }
        if (!isPendiente) return;
        if (seleccionPendiente.length === 0) {
            toast.warning('No hay usuarios para asignar');
            return;
        }

        setGuardando(true);
        let exitosos = 0;
        let fallidos = 0;

        for (const usuario of seleccionPendiente) {
            try {
                const payload = {
                    usuario_equipo: usuario.tipo === 'ue' ? usuario.usuarioEquipoId : null,
                    usuario_empresa: usuario.tipo === 'u' ? usuario.usuarioEmpresaId : null,
                    soporte_tecnico: soporteId,
                };

                try {
                    await ApiService.fetchData({
                        url: `/api/soportes-v2/${soporteId}/usuarios-asignados-soporte/`,
                        method: 'post',
                        headers: { 'Content-Type': 'application/json' },
                        data: payload,
                    });
                } catch (error: unknown) {
                    await ApiService.fetchData({
                        url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${soporteId}/usuarios-asignados/`,
                        method: 'post',
                        headers: { 'Content-Type': 'application/json' },
                        data: payload,
                    });
                }
                exitosos++;
            } catch (error: unknown) {
                fallidos++;
                toast.error(getErrorMessage(error));
            }
        }

        setGuardando(false);
        setSeleccionPendiente([]);

        if (exitosos > 0) {
            toast.success(`${exitosos} usuario(s) asignado(s)`, { autoClose: 1200 });
            refetchUsuariosAsignados();
            dispatch(listaUsuariosDelEquipoPorClienteThunk({ cliente_id: clienteId }));
            if (onSaved) onSaved();
            onClose();
        }
        if (fallidos > 0) {
            toast.error(`${fallidos} usuario(s) no pudieron asignarse`, { autoClose: 2000 });
        }
    };

    const renderEquipoPendienteCell = (fila: FilaPendiente) => {
        if (fila.tipo === 'ue') {
            return fila.equipoLabel || 'Equipo';
        }
        return <span className='italic text-gray-400'>Sin equipo</span>;
    };

    const renderEquipoAsignadoCell = (usuario: IUsuarioAsignadoSoporte) => {
        if (!isEnProceso) {
            return (
                usuario.numero_serie_equipo || (
                    <span className='italic text-gray-400'>Sin equipo</span>
                )
            );
        }
        if (usuario.resuelto) {
            return (
                usuario.numero_serie_equipo || (
                    <span className='italic text-gray-400'>Sin equipo</span>
                )
            );
        }
        const firmaPendiente = Boolean(
            (usuario.cache_asignacion as Record<string, unknown> | null | undefined)
                ?.firma_pendiente,
        );

        const usuarioEmpresaId = getUsuarioEmpresaId(usuario);
        const equiposUsuario = usuarioEmpresaId
            ? equiposActivosPorUsuario.get(usuarioEmpresaId) || []
            : [];
        const equiposUsuarioOpciones = equiposUsuario.map((opt) => ({
            value: `eq:${opt.value}`,
            label: opt.label,
        }));
        if (usuario.equipo_id) {
            const optionActual = {
                value: `eq:${usuario.equipo_id}`,
                label: `${usuario.tipo_equipo || 'Equipo'} - No. ${usuario.numero_serie_equipo || 'Sin serie'}`,
            };
            if (!equiposUsuarioOpciones.some((opt) => opt.value === optionActual.value)) {
                equiposUsuarioOpciones.unshift(optionActual);
            }
        }

        const seleccionActual = seleccionActualPorId.get(usuario.id);
        const cacheSeleccion =
            cambiosEquipos[usuario.id]?.cache?.seleccion ||
            getCacheGuardado(usuario)?.cache?.seleccion ||
            null;
        const equipoActualId = usuario.equipo_id ? usuario.equipo_id.toString() : null;
        const equiposDisponibles = equiposInactivosEmpresa
            .filter((opt) => !equiposUsuarioOpciones.some((u) => u.value === opt.value))
            .filter(
                (opt) =>
                    !(seleccionActual === 'none' && equipoActualId && opt.value === equipoActualId),
            )
            .map((opt) => ({
                value: `eq:${opt.value}`,
                label: opt.label,
            }));

        const gruposBase = [
            { label: 'Sin equipo', options: [{ value: 'none', label: 'Sin equipo' }] },
            {
                label: 'Equipos del usuario',
                options: equiposUsuarioOpciones,
            },
        ];

        if (equiposDisponibles.length > 0) {
            gruposBase.push({
                label: 'Equipos disponibles',
                options: equiposDisponibles,
            });
        }

        gruposBase.push({
            label: 'Items serializados',
            options: opcionesSeriales,
        });

        const grupos = gruposBase
            .map((group) => ({
                ...group,
                options: group.options.filter((opt) => opt.value),
            }))
            .filter((group) => group.options.length > 0);

        const seleccionados = new Set(Array.from(seleccionActualPorId.values()));
        if (seleccionActual) {
            seleccionados.delete(seleccionActual);
        }

        const gruposConDisabled = grupos.map((group) => ({
            ...group,
            options: group.options.map((opt) => ({
                ...opt,
                isDisabled: opt.value !== 'none' && seleccionados.has(opt.value),
            })),
        }));

        const findOption = (value?: string | null) => {
            if (!value) return null;
            for (const group of gruposConDisabled) {
                const match = group.options.find((opt) => opt.value === value);
                if (match) return match;
            }
            return null;
        };

        const fallbackLabel = (() => {
            if (!seleccionActual) return null;
            if (cacheSeleccion?.label) return cacheSeleccion.label;
            if (seleccionActual === 'none') return 'Sin equipo';
            if (seleccionActual.startsWith('eq:')) {
                return `${usuario.tipo_equipo || 'Equipo'} - No. ${usuario.numero_serie_equipo || 'Sin serie'}`;
            }
            if (seleccionActual.startsWith('gs:')) {
                const id = seleccionActual.replace('gs:', '');
                return `Item serializado #${id}`;
            }
            return null;
        })();
        const value =
            findOption(seleccionActual || null) ||
            (seleccionActual && fallbackLabel
                ? {
                      value: seleccionActual,
                      label: fallbackLabel,
                  }
                : null);

        return (
            <SelectReact
                name={`equipo-asignado-${usuario.id}`}
                placeholder={cargandoSeriales ? 'Cargando items...' : 'Seleccione equipo'}
                options={gruposConDisabled}
                isDisabled={cargandoSeriales || firmaPendiente}
                value={value}
                onChange={(opt) => actualizarCacheSeleccion(usuario, opt as TSelectOption | null)}
            />
        );
    };

    const renderEstadoAsignacion = (usuario: IUsuarioAsignadoSoporte) => {
        if (usuario.resuelto) {
            return <Badge color='emerald'>Realizada</Badge>;
        }
        const firmaPendiente = Boolean(
            (usuario.cache_asignacion as Record<string, unknown> | null | undefined)
                ?.firma_pendiente,
        );
        if (firmaPendiente) {
            return <Badge color='violet'>Firmada</Badge>;
        }
        const tieneCambios =
            Boolean(cambiosEquipos[usuario.id]) ||
            limpiarCacheIds.includes(usuario.id) ||
            Boolean(getCacheGuardado(usuario)?.cache?.movimientos?.length);
        if (isEnProceso && tieneCambios) {
            return <Badge color='amber'>Pendiente firma</Badge>;
        }
        return <Badge color='blue'>Asignado</Badge>;
    };

    const renderAccionesAsignado = (usuario: IUsuarioAsignadoSoporte) => {
        if (isPendiente) {
            return (
                <Tooltip text='Eliminar asignacion'>
                    <Button
                        variant='solid'
                        color='red'
                        size='xs'
                        icon='HeroTrash'
                        onClick={() => eliminarAsignado(usuario.id, usuario.nombre_usuario)}
                    />
                </Tooltip>
            );
        }
        if (!isEnProceso) {
            return <span className='text-xs text-gray-400'>Bloqueado</span>;
        }
        if (usuario.resuelto) {
            return <span className='text-xs text-gray-400'>Realizada</span>;
        }
        const firmaPendiente = Boolean(
            (usuario.cache_asignacion as Record<string, unknown> | null | undefined)
                ?.firma_pendiente,
        );
        if (firmaPendiente) {
            return <span className='text-xs text-gray-400'>Firmada</span>;
        }
        const cacheLocal = cambiosEquipos[usuario.id];
        const cacheGuardado = getCacheGuardado(usuario);
        if (cacheLocal?.cache?.movimientos?.length || cacheGuardado?.cache?.movimientos?.length) {
            return (
                <Button
                    variant='solid'
                    color='emerald'
                    size='xs'
                    onClick={() => handleFirmarUsuario(usuario)}>
                    Firmar
                </Button>
            );
        }
        return <span className='text-xs text-gray-400'>Sin cambios</span>;
    };

    return (
        <>
            <Modal isOpen={isOpen} setIsOpen={onClose} isStaticBackdrop={true} size='xl'>
                <ModalHeader>
                    <Badge className='text-xl'>Usuarios con Equipo del Cliente</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        {isPendiente && (
                            <div>
                                <Badge>Usuarios de la Empresa</Badge>
                                <SelectReact
                                    name='usuario_equipo'
                                    placeholder='Seleccione un usuario'
                                    isClearable
                                    options={opcionesUsuarios}
                                    value={selectValue}
                                    noOptionsMessage={() => 'No hay usuarios disponibles'}
                                    formatCreateLabel={() => 'No hay usuarios disponibles'}
                                    onCreateOption={() => {
                                        toast.info('No hay usuarios disponibles');
                                    }}
                                    onChange={(val) => handleSelect(val as TSelectOption | null)}
                                />
                                <div className='mt-2 text-xs text-gray-500'>
                                    Usuarios asignados no apareceran en la seleccion.
                                </div>
                            </div>
                        )}

                        <div className='rounded-lg border'>
                            <div className='flex items-center justify-between border-b px-4 py-2'>
                                <Badge>
                                    Asignados: {listaUsuariosAsignadosSoporte?.length ?? 0} |
                                    Pendientes: {pendientesCount}
                                </Badge>
                            </div>
                            <Table className='w-full table-fixed'>
                                <THead>
                                    <Tr>
                                        <Th className='w-[30%] text-left'>Usuario</Th>
                                        <Th className='w-[45%] text-left'>Equipo</Th>
                                        <Th className='w-[15%] text-left'>Asignacion</Th>
                                        <Th className='w-[10%] text-center'>Acciones</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {(listaUsuariosAsignadosSoporte || []).map((u) => (
                                        <Tr key={`asignado-${u.id}`}>
                                            <Td className='w-[30%] truncate'>{u.nombre_usuario}</Td>
                                            <Td className='w-[45%]'>
                                                <div className='max-w-full'>
                                                    {renderEquipoAsignadoCell(u)}
                                                </div>
                                            </Td>
                                            <Td className='w-[15%]'>{renderEstadoAsignacion(u)}</Td>
                                            <Td className='w-[10%] text-center'>
                                                {renderAccionesAsignado(u)}
                                            </Td>
                                        </Tr>
                                    ))}
                                    {isPendiente &&
                                        seleccionPendiente.map((u) => (
                                            <Tr key={`pendiente-${u.id}`}>
                                                <Td className='w-[30%] truncate'>{u.nombre}</Td>
                                                <Td className='w-[45%]'>
                                                    <div className='max-w-full'>
                                                        {renderEquipoPendienteCell(u)}
                                                    </div>
                                                </Td>
                                                <Td className='w-[15%]'>
                                                    <Badge color='amber'>
                                                        Pendiente de guardar
                                                    </Badge>
                                                </Td>
                                                <Td className='w-[10%] text-center'>
                                                    <Button
                                                        variant='solid'
                                                        color='red'
                                                        size='xs'
                                                        icon='HeroTrash'
                                                        onClick={() => removerPendiente(u.id)}
                                                    />
                                                </Td>
                                            </Tr>
                                        ))}
                                    {(listaUsuariosAsignadosSoporte?.length ?? 0) === 0 &&
                                        seleccionPendiente.length === 0 && (
                                            <Tr>
                                                <Td
                                                    colSpan={4}
                                                    className='text-center text-gray-500'>
                                                    No hay usuarios con equipo asignados.
                                                </Td>
                                            </Tr>
                                        )}
                                </TBody>
                            </Table>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                onClose();
                            }}
                            isDisable={guardando}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={guardarAsignaciones}
                            isDisable={guardarDisabled}>
                            {guardarLabel}
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
            {usuarioFirmaSeleccionado && (
                <FirmarAsignacionUsuario
                    ordenId={ordenId}
                    soporteId={soporteId}
                    usuarioAsignadoId={usuarioFirmaSeleccionado.id}
                    usuarioNombre={usuarioFirmaSeleccionado.nombre_usuario}
                    tecnicoNombre={tecnicoNombre || 'Tecnico'}
                    movimientos={movimientosFirma}
                    isOpen={isOpenFirmaUsuario}
                    setIsOpen={setIsOpenFirmaUsuario}
                    onSuccess={() => {
                        refetchUsuariosAsignados();
                        dispatch(listaUsuariosDelEquipoPorClienteThunk({ cliente_id: clienteId }));
                        setUsuarioFirmaSeleccionado(null);
                        setMovimientosFirma([]);
                    }}
                />
            )}
        </>
    );
}

export default ListaUsuarioEquipoOT;
