import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import Collapse from '@/components/utils/Collapse';
import { TIPO_SEGUIMIENTO } from '@/constants/ordentrabajo.constant';
import ApiService from '@/services/ApiService';
import {
    actualizarSoporteTecnicoThunk,
    checkCompletibilidadOTThunk,
    detalleOrdenTrabajoThunk,
    eliminarSoporteTecnicoThunk,
    listaInsumosThunk,
    listaSoportesTecnicosThunk,
    listaTecnicosThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { confirmAlert } from '@/utils/sweetAlert';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useFormik } from 'formik';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import CrearSoporteTecnicoEnOT from '../modals/CrearSoporteTecnicoEnOT';
import FirmarCompletarTrabajo from '../modals/FirmarCompletarTrabajo';

// ⚠️ DEPRECATED NOTICE (2026-01):
// La funcionalidad de vincular guías directamente a soportes está deprecada.
// Las guías deben vincularse a la OT, no a servicios/soportes individuales.
// Ver: backend/ordentrabajov2/DEPRECATION_NOTICE.md
import ListaUsuarioEquipoOT from '../modals/ListaUsuarioEquipoOT';
import ModalVincularGuia from '../modals/ModalVincularGuia';
import DropdownEstadoTrabajo from './DropdownEstadoTrabajo';

function ListaSoportesTecnicosOT() {
    const dispatch = useAppDispatch();
    const { detalleOrdenTrabajo, listaSoportesTecnicos, listaTecnicos } = useAppSelector(
        (s) => s.ordenTrabajo,
    );
    const { personalizacionUsuario } = useAppSelector((s) => s.auth);

    const [selectedService, setSelectedService] = useState<any | null>(null);
    const [isOpenDetail, setIsOpenDetail] = useState(false);
    const [openedDescriptions, setOpenedDescriptions] = useState<number[]>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [sorting, setSorting] = useState<SortingState>([]);
    // Asignar fecha modal
    const [isOpenAsignarFecha, setIsOpenAsignarFecha] = useState<boolean>(false);
    const [fechaAsignar, setFechaAsignar] = useState<string | undefined>();
    // Para cambio de estado: (usado en acciones)
    const [isOpenEstado, setIsOpenEstado] = useState<boolean>(false);
    const [estadoNuevo, setEstadoNuevo] = useState<string | undefined>();
    const [comentario, setComentario] = useState<string | undefined>();
    // Para cambio de estado: posible asignación de técnico y fecha
    const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<string | undefined>();
    const [fechaEnModal, setFechaEnModal] = useState<string | undefined>();
    const [isOpenTecnico, setIsOpenTecnico] = useState<boolean>(false);
    const [detalleSeleccionado, setDetalleSeleccionado] = useState<number | null>(null);
    const [seguimientos, setSeguimientos] = useState<any[]>([]);
    const [cargandoSeguimientos, setCargandoSeguimientos] = useState<boolean>(false);
    const [isOpenSeguimiento, setIsOpenSeguimiento] = useState<boolean>(false);
    const [comentarioSeguimiento, setComentarioSeguimiento] = useState<string>('');
    const [tipoSeguimiento, setTipoSeguimiento] = useState<string>('comentario_tecnico');
    // Para gestión de usuarios asignados
    const [isOpenUsuarios, setIsOpenUsuarios] = useState<boolean>(false);
    const [soporteIdUsuarios, setSoporteIdUsuarios] = useState<number | null>(null);
    const [soporteEstadoUsuarios, setSoporteEstadoUsuarios] = useState<string | null>(null);
    const [soporteTecnicoUsuarios, setSoporteTecnicoUsuarios] = useState<string | null>(null);
    const [isOpenEntregaGuia, setIsOpenEntregaGuia] = useState<boolean>(false);
    const [guiaEntregaId, setGuiaEntregaId] = useState<number | undefined>();
    const [clienteEntregaId, setClienteEntregaId] = useState<number | null | undefined>();
    const [estadoEntregaGuia, setEstadoEntregaGuia] = useState<'E' | 'PR'>('E');

    // Modal de firma para completar trabajo
    const [isOpenFirmaModal, setIsOpenFirmaModal] = useState(false);
    const [firmaTrabajoId, setFirmaTrabajoId] = useState<number>(0);
    const [firmaTrabajoTipo, setFirmaTrabajoTipo] = useState<'servicio' | 'soporte'>('soporte');
    const [firmaEstadoFinal, setFirmaEstadoFinal] = useState<
        'completado' | 'medianamente_completado'
    >('completado');
    const [firmaTecnicoNombre, setFirmaTecnicoNombre] = useState<string>('Técnico');
    const [firmaComentariosTecnicos, setFirmaComentariosTecnicos] = useState<any[]>([]);

    const requisitosGlobalesOk = useMemo(() => {
        if (!listaSoportesTecnicos || listaSoportesTecnicos.length === 0) return false;
        return listaSoportesTecnicos.every((s: any) => {
            const tieneTecnico = !!s.tecnico_asignado;
            const tieneFecha = !!s.fecha_soporte;
            const guiaOk = !s.guia_salida || ['FR', 'ET', 'E', 'T'].includes(s.guia_salida.estado);
            return tieneTecnico && tieneFecha && guiaOk;
        });
    }, [listaSoportesTecnicos]);

    const iniciarSoporte = async (soporte: any) => {
        if (!detalleOrdenTrabajo) return;
        const ok = await confirmAlert({
            title: 'Confirmar cambio de estado',
            text: '¿Iniciar este soporte y pasar a En proceso?',
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await dispatch(
                actualizarSoporteTecnicoThunk({
                    id_orden: detalleOrdenTrabajo.id,
                    id_soporte: soporte.id,
                    data: { estado: 'en_proceso' },
                }),
            ).unwrap();
            toast.success('Soporte en proceso');
        } catch (e: any) {
            const msg =
                e?.response?.data?.detail ||
                e?.message ||
                'No se pudo iniciar el soporte. Revisa técnico, fecha y guía.';
            toast.error(msg);
            return;
        }
        // Refrescar listas relacionadas
        dispatch(listaSoportesTecnicosThunk({ id_orden: detalleOrdenTrabajo.id }));
        dispatch(listaInsumosThunk({ id_orden_trabajo: detalleOrdenTrabajo.id }));
        dispatch(detalleOrdenTrabajoThunk({ id_ordenTrabajo: detalleOrdenTrabajo.id }));
    };

    const abrirModalEntregaGuia = (guia: any, estadoTrabajo: string) => {
        if (!guia?.id) return;
        setGuiaEntregaId(guia.id);
        setClienteEntregaId(guia.cliente ?? null);
        setEstadoEntregaGuia(estadoTrabajo === 'completado' ? 'E' : 'PR');
        setIsOpenEntregaGuia(true);
    };

    const guardarCambioEstado = async (payload: any, requiresComment: boolean) => {
        if (!detalleOrdenTrabajo || !selectedService) return;
        try {
            const resp = await ApiService.fetchData({
                url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/soportes-tecnicos/${selectedService.id}/`,
                method: 'patch',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(payload),
            });
            if (resp.data) {
                if (requiresComment && comentario && comentario.trim()) {
                    try {
                        await ApiService.fetchData({
                            url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/soportes-tecnicos/${selectedService.id}/seguimientos/`,
                            method: 'post',
                            headers: { 'Content-Type': 'application/json' },
                            data: JSON.stringify({
                                comentario,
                                tipo: 'incidencia',
                                usuario: null,
                            }),
                        });
                        fetchSeguimientosServicio(selectedService.id);
                    } catch (e) {
                        // ignore seguimiento error
                    }
                }
                toast.success('Estado cambiado', { autoClose: 1000 });
                dispatch(
                    listaSoportesTecnicosThunk({
                        id_orden: detalleOrdenTrabajo.id,
                    }),
                );
                dispatch(
                    checkCompletibilidadOTThunk({
                        id_orden: detalleOrdenTrabajo.id,
                    }),
                );
                setIsOpenEstado(false);
                setEstadoNuevo(undefined);
                setComentario(undefined);
                setSelectedService(null);
                setTecnicoSeleccionado(undefined);
                setFechaEnModal(undefined);

                if (estadoNuevo === 'en_proceso' && detalleOrdenTrabajo.estado === 'pendiente') {
                    dispatch(
                        detalleOrdenTrabajoThunk({
                            id_ordenTrabajo: detalleOrdenTrabajo.id,
                        }),
                    );
                }
            }
        } catch (e: any) {
            const msg = Object.values(e?.response?.data || {})
                .flat()
                .join(' ');
            toast.error(msg || 'Error al cambiar el estado');
        }
    };

    useEffect(() => {
        if (
            detalleOrdenTrabajo &&
            (detalleOrdenTrabajo.tipo_servicio === 'soporte_p' ||
                detalleOrdenTrabajo.tipo_servicio === 'soporte_r')
        ) {
            dispatch(listaSoportesTecnicosThunk({ id_orden: detalleOrdenTrabajo.id }));
        }
    }, [detalleOrdenTrabajo]);

    // Vincular guía
    const [isOpenGuia, setIsOpenGuia] = useState<boolean>(false);
    const [soporteParaGuia, setSoporteParaGuia] = useState<number | null>(null);

    const fetchSeguimientosServicio = async (soporteId: number) => {
        if (!detalleOrdenTrabajo) return;
        setCargandoSeguimientos(true);
        try {
            const resp = await ApiService.fetchData<any[]>({
                url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/soportes-tecnicos/${soporteId}/seguimientos/`,
                method: 'get',
            });
            setSeguimientos(resp.data || []);
        } catch (e) {
            toast.error('No se pudieron cargar los seguimientos');
        } finally {
            setCargandoSeguimientos(false);
        }
    };

    const openDetail = (serv: any) => {
        setSelectedService(serv);
        setIsOpenDetail(true);
    };

    useEffect(() => {
        if (isOpenDetail && selectedService?.id && detalleOrdenTrabajo) {
            fetchSeguimientosServicio(selectedService.id);
        }
        if (!isOpenDetail) {
            setSeguimientos([]);
        }
    }, [isOpenDetail, selectedService, detalleOrdenTrabajo]);

    const toggleDescription = (id: number) => {
        setOpenedDescriptions((prev) =>
            prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
        );
    };

    const filtro = globalFilter?.toLowerCase()?.trim();
    const soportesFiltrados = listaSoportesTecnicos
        ? filtro
            ? listaSoportesTecnicos.filter((s: any) => {
                  return (
                      String(s.nombre ?? '')
                          .toLowerCase()
                          .includes(filtro) ||
                      String(s.descripcion ?? '')
                          .toLowerCase()
                          .includes(filtro) ||
                      String(s.estado_label ?? s.estado ?? '')
                          .toLowerCase()
                          .includes(filtro)
                  );
              })
            : listaSoportesTecnicos
        : [];

    const estadoBadgeColor = (e: string) => {
        switch ((e || '').toString().toLowerCase()) {
            case 'pendiente':
                return 'amber';
            case 'en_proceso':
            case 'en proceso':
                return 'sky';
            case 'completado':
                return 'emerald';
            case 'no_realizado':
            case 'no realizado':
                return 'red';
            case 'medianamente_completado':
            case 'medianamente completado':
                return 'blue';
            default:
                return 'gray';
        }
    };

    const columnHelper = createColumnHelper<any>();

    const columns = [
        columnHelper.accessor('id', {
            cell: (info) => info.getValue(),
            header: 'Nº',
            size: 15,
        }),
        columnHelper.accessor('nombre', {
            cell: (info) => {
                const id = info.row.original.id;
                return (
                    <div className='flex flex-row gap-2'>
                        <div>
                            {info.getValue()}
                            <Collapse
                                isOpen={openedDescriptions.includes(id)}
                                className='transition-opacity'>
                                <div>
                                    <Badge className='text-sm'>Descripción:</Badge>
                                    <span className='text-sm'>
                                        {info.row.original.descripcion ?? ''}
                                    </span>
                                </div>
                            </Collapse>
                        </div>
                        <div>
                            <Button
                                size='xs'
                                variant='solid'
                                color='sky'
                                icon={openedDescriptions.includes(id) ? 'HeroEyeSlash' : 'HeroEye'}
                                onClick={() => toggleDescription(id)}
                            />
                        </div>
                    </div>
                );
            },
            header: 'Solicitud',
        }),
        columnHelper.accessor('estado_label', {
            cell: (info) => {
                const estado = info.getValue() ?? info.row.original.estado;
                const estadoStr = String(estado);
                const estadoLower = estadoStr.toLowerCase();
                const isPendiente = estadoLower === 'pendiente';
                const isEnProceso = estadoLower === 'en_proceso' || estadoLower === 'en proceso';
                const isCompletado = estadoLower === 'completado';
                const isMedianamenteCompletado =
                    estadoLower === 'medianamente_completado' ||
                    estadoLower === 'medianamente completado';
                const isNoRealizado =
                    estadoLower === 'no_realizado' || estadoLower === 'no realizado';
                const hasTecnico = !!info.row.original.tecnico_asignado;
                const hasFecha = !!info.row.original.fecha_soporte;
                const requierePrereqs = isPendiente;
                const guia = info.row.original.guia_salida;
                const guiaListo = !guia || ['FR', 'ET', 'E', 'T'].includes(guia.estado);
                const faltaBasicos = !hasTecnico || !hasFecha;
                const canStartLocal = !requierePrereqs || (!faltaBasicos && guiaListo);

                // Validación OT Padre (Normalización de estados)
                const hasOTFecha = !!detalleOrdenTrabajo?.fecha_inicio_ot;
                // Verificar responsable: puede estar en responsable_empresa O tecnico_responsable_ot
                const hasOTResponsable = !!(
                    detalleOrdenTrabajo?.responsable_empresa ||
                    detalleOrdenTrabajo?.tecnico_responsable_ot
                );
                const faltaOTConfig = !hasOTFecha || !hasOTResponsable;

                const canStart = requisitosGlobalesOk && canStartLocal && !faltaOTConfig;
                let tooltipText = 'Cambiar estado';
                if (faltaOTConfig && requierePrereqs) {
                    tooltipText =
                        'La OT principal debe tener fecha de inicio y responsable asignado para iniciar trabajos';
                } else if (!requisitosGlobalesOk) {
                    tooltipText =
                        'Todos los trabajos deben tener técnico, fecha y guía firmada (si aplica) antes de iniciar cualquiera.';
                } else if (!canStartLocal && requierePrereqs) {
                    tooltipText = faltaBasicos
                        ? 'Requiere técnico asignado y fecha de soporte para iniciar'
                        : 'Debes firmar la Guía de Salida (Firmada/En Tránsito) para iniciar';
                }
                const estadoIcon = isPendiente
                    ? 'HeroPlay'
                    : isEnProceso
                      ? 'DuoLoading'
                      : isCompletado
                        ? 'HeroCheck'
                        : isMedianamenteCompletado
                          ? 'HeroCheckCircle'
                          : isNoRealizado
                            ? 'HeroXMark'
                            : undefined;
                const isFinalState =
                    estadoLower !== 'pendiente' &&
                    estadoLower !== 'en_proceso' &&
                    estadoLower !== 'en proceso';

                // Si está en proceso, mostrar dropdown con estados finales
                if (isEnProceso) {
                    return (
                        <DropdownEstadoTrabajo
                            onSelectEstado={async (estado) => {
                                // Para completado y medianamente_completado, el endpoint /completar-trabajo/
                                // ya actualizó el estado, solo necesitamos refrescar
                                if (
                                    estado === 'completado' ||
                                    estado === 'medianamente_completado'
                                ) {
                                    if (detalleOrdenTrabajo) {
                                        dispatch(
                                            listaSoportesTecnicosThunk({
                                                id_orden: detalleOrdenTrabajo.id,
                                            }),
                                        );
                                        dispatch(
                                            checkCompletibilidadOTThunk({
                                                id_orden: detalleOrdenTrabajo.id,
                                            }),
                                        );
                                    }
                                    return;
                                }
                                // Para otros estados (no_realizado), hacer el cambio normal
                                if (!detalleOrdenTrabajo) return;
                                try {
                                    await ApiService.fetchData({
                                        url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/soportes-tecnicos/${info.row.original.id}/`,
                                        method: 'patch',
                                        headers: { 'Content-Type': 'application/json' },
                                        data: JSON.stringify({ estado }),
                                    });
                                    toast.success(`Estado cambiado a ${estado}`, {
                                        autoClose: 1000,
                                    });
                                    dispatch(
                                        listaSoportesTecnicosThunk({
                                            id_orden: detalleOrdenTrabajo.id,
                                        }),
                                    );
                                    dispatch(
                                        checkCompletibilidadOTThunk({
                                            id_orden: detalleOrdenTrabajo.id,
                                        }),
                                    );
                                } catch (e: any) {
                                    const msg = Object.values(e?.response?.data || {})
                                        .flat()
                                        .join(' ');
                                    toast.error(msg || 'Error al cambiar el estado');
                                }
                            }}
                            disabled={!canStart}
                            tooltipText={tooltipText}
                            ordenId={detalleOrdenTrabajo?.id}
                            soporteId={info.row.original.id}
                            clienteId={detalleOrdenTrabajo?.cliente}
                            tecnicoNombre={info.row.original.nombre_tecnico || 'Tecnico'}
                            usuariosAsignadosTotal={info.row.original.usuarios_asignados_total}
                            usuariosAsignadosResueltos={
                                info.row.original.usuarios_asignados_resueltos
                            }
                            // Props para controlar el modal desde el padre
                            onOpenModal={(trabajoId, tipo, estado, tecnico, comentarios) => {
                                setFirmaTrabajoId(trabajoId);
                                setFirmaTrabajoTipo(tipo);
                                setFirmaEstadoFinal(
                                    estado === 'completado'
                                        ? 'completado'
                                        : 'medianamente_completado',
                                );
                                setFirmaTecnicoNombre(tecnico);
                                setFirmaComentariosTecnicos(comentarios);
                                setIsOpenFirmaModal(true);
                            }}
                        />
                    );
                }

                if (isFinalState) {
                    return (
                        <Button
                            size='sm'
                            variant='solid'
                            rounded='rounded-full'
                            color={estadoBadgeColor(estadoStr)}
                            icon={estadoIcon}
                            aria-disabled
                            tabIndex={-1}
                            className='pointer-events-none cursor-not-allowed'>
                            {estadoStr}
                        </Button>
                    );
                }

                // Únicamente pendiente llega aquí
                return (
                    <Tooltip text={tooltipText}>
                        <div className={!canStart ? 'inline-block' : ''}>
                            <Button
                                size='sm'
                                variant={!canStart ? 'outline' : 'solid'}
                                rounded='rounded-full'
                                color={!canStart ? 'amber' : estadoBadgeColor(estadoStr)}
                                icon={estadoIcon}
                                isDisable={!canStart}
                                onClick={() => {
                                    if (!canStart) return;
                                    iniciarSoporte(info.row.original);
                                }}
                                aria-label={estadoStr}
                                title={estadoStr}
                                className={!canStart ? 'opacity-95 ring-1 ring-amber-200' : ''}>
                                {estadoStr}
                            </Button>
                        </div>
                    </Tooltip>
                );
            },
            header: 'Estado',
            size: 100,
        }),
        columnHelper.accessor('nombre_tecnico', {
            cell: (info) =>
                info.getValue() ?? <span className='italic text-gray-400'>Sin Técnico</span>,
            header: 'Técnico Asignado',
        }),
        columnHelper.accessor('usuarios_asignados_count', {
            cell: (info) => (
                <div className='flex items-center gap-2'>
                    <span>{info.getValue() ?? 0}</span>
                    <Tooltip text='Gestionar usuarios asignados'>
                        <Button
                            variant='solid'
                            color='violet'
                            icon='HeroUsers'
                            size='xs'
                            onClick={() => {
                                setSoporteIdUsuarios(info.row.original.id);
                                setSoporteEstadoUsuarios(info.row.original.estado || null);
                                setSoporteTecnicoUsuarios(info.row.original.nombre_tecnico || null);
                                setIsOpenUsuarios(true);
                            }}
                        />
                    </Tooltip>
                </div>
            ),
            header: 'Usuarios Asignados',
            size: 150,
        }),
        columnHelper.accessor('fecha_soporte', {
            cell: (info) =>
                info.getValue() ? (
                    dayjs(info.getValue()).locale('es').format('DD/MM/YYYY')
                ) : (
                    <span className='italic text-gray-400'>Sin fecha</span>
                ),
            header: 'Fecha soporte',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => {
                const estadoLower = String(info.row.original.estado ?? '').toLowerCase();
                const isPendiente = estadoLower === 'pendiente';
                const isEnProceso = estadoLower === 'en_proceso' || estadoLower === 'en proceso';
                const tieneGuia = !!info.row.original.guia_salida;
                return (
                    <div className='flex flex-wrap gap-2'>
                        {!isPendiente && (
                            <Tooltip text='Ver detalle'>
                                <Button
                                    variant='solid'
                                    color='violet'
                                    icon='HeroEye'
                                    onClick={() => openDetail(info.row.original)}
                                />
                            </Tooltip>
                        )}
                        {isEnProceso && (
                            <Tooltip text='Añadir seguimiento'>
                                <Button
                                    variant='solid'
                                    color='blue'
                                    icon='HeroPlusCircle'
                                    onClick={() => {
                                        setSelectedService(info.row.original);
                                        setComentarioSeguimiento('');
                                        setTipoSeguimiento('comentario_tecnico');
                                        setIsOpenSeguimiento(true);
                                    }}
                                />
                            </Tooltip>
                        )}
                        {isPendiente && (
                            <>
                                <Tooltip text='Asignar Técnico'>
                                    <Button
                                        variant='solid'
                                        color='sky'
                                        icon='DuoAddUser'
                                        onClick={() => {
                                            setDetalleSeleccionado(info.row.original.id);
                                            setSelectedService(info.row.original);
                                            setIsOpenTecnico(true);
                                        }}
                                    />
                                </Tooltip>
                                <Tooltip text='Asignar Fecha'>
                                    <Button
                                        variant='solid'
                                        color='amber'
                                        icon='HeroCalendar'
                                        onClick={() => {
                                            setSelectedService(info.row.original);
                                            setFechaAsignar(
                                                info.row.original.fecha_soporte ?? undefined,
                                            );
                                            setIsOpenAsignarFecha(true);
                                        }}
                                    />
                                </Tooltip>
                                <Tooltip text='Eliminar soporte técnico'>
                                    <Button
                                        variant='solid'
                                        color='red'
                                        icon='HeroTrash'
                                        onClick={async () => {
                                            if (!detalleOrdenTrabajo) return;
                                            const ok = await confirmAlert({
                                                title: 'Eliminar soporte tecnico',
                                                text: 'Eliminar este soporte tecnico? Esta accion no se puede deshacer.',
                                                confirmText: 'Eliminar',
                                                cancelText: 'Cancelar',
                                                icon: 'warning',
                                                confirmColor: '#dc2626',
                                            });
                                            if (!ok) return;
                                            try {
                                                await dispatch(
                                                    eliminarSoporteTecnicoThunk({
                                                        id_orden: detalleOrdenTrabajo.id,
                                                        id_soporte: info.row.original.id,
                                                    }),
                                                );
                                                toast.success('Soporte técnico eliminado', {
                                                    autoClose: 1000,
                                                });
                                                dispatch(
                                                    listaSoportesTecnicosThunk({
                                                        id_orden: detalleOrdenTrabajo.id,
                                                    }),
                                                );
                                            } catch (e: any) {
                                                const msg = Object.values(e?.response?.data || {})
                                                    .flat()
                                                    .join(' ');
                                                toast.error(
                                                    msg || 'Error al eliminar soporte técnico',
                                                );
                                            }
                                        }}
                                    />
                                </Tooltip>
                            </>
                        )}
                        {isPendiente && (
                            <>
                                {!tieneGuia ? // ⚠️ DESHABILITADO: Botón de vinculación antigua comentado (2026-01)
                                // Para reactivar: descomentar
                                /*
									<Tooltip text='Vincular Guía de Salida'>
										<Button
											variant='solid'
											color='emerald'
											icon='HeroLink'
											onClick={() => {
												setSoporteParaGuia(info.row.original.id);
												setIsOpenGuia(true);
											}}
										/>
									</Tooltip>
									*/
                                null : (
                                    // ⚠️ DESHABILITADO: Botón de desvinculación antigua comentado
                                    // Para reactivar: descomentar onClick
                                    <Tooltip text='Desvincular Guía de Salida [DESHABILITADO]'>
                                        <Button
                                            variant='solid'
                                            color='red'
                                            icon='HeroLink'
                                            // onClick={() => desvincularGuia(info.row.original.id)}
                                        />
                                    </Tooltip>
                                )}
                            </>
                        )}
                    </div>
                );
            },
            header: 'Acciones',
        }),
    ];
    const table = useReactTable({
        data: soportesFiltrados,
        columns: columns,
        state: {
            sorting: sorting,
            globalFilter: globalFilter,
        },
        onSortingChange: setSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    // ⚠️ FUNCIONALIDAD ANTIGUA DESHABILITADA (2026-01)
    // Para reactivar desvinculación de guías de soportes, descomenta:
    /*
	const desvincularGuia = async (soporteId: number) => {
		if (!detalleOrdenTrabajo) return;
		const ok = await confirmAlert({
			title: 'Desvincular guia',
			text: 'Desvincular la guia de este soporte?',
			confirmText: 'Desvincular',
			cancelText: 'Cancelar',
			icon: 'warning',
		});
		if (!ok) return;
		try {
			await ApiService.fetchData({
				url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/soportes-tecnicos/${soporteId}/desasociar-guia/`,
				method: 'post',
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (e: any) {
			const msg = e?.response?.data?.detail || 'Error al desvincular guía';
			toast.error(msg);
			return;
		}

		let refrescoOk = true;
		try {
			await dispatch(listaSoportesTecnicosThunk({ id_orden: detalleOrdenTrabajo.id }));
			await dispatch(listaInsumosThunk({ id_orden_trabajo: detalleOrdenTrabajo.id }));
		} catch (e) {
			refrescoOk = false;
			console.warn('No se pudo refrescar soportes/insumos tras desvincular guía', e);
		}

		if (refrescoOk) {
			toast.success('Guía desvinculada');
		} else {
			toast.warning('Guía desvinculada, pero no se pudo refrescar la lista');
		}
	}
	*/

    useEffect(() => {
        if (isOpenTecnico) {
            if (personalizacionUsuario?.empresa) {
                dispatch(listaTecnicosThunk({ id_empresa: personalizacionUsuario.empresa }));
            }
        }
    }, [isOpenTecnico, personalizacionUsuario]);

    useEffect(() => {
        if (isOpenEstado) {
            if (personalizacionUsuario?.empresa) {
                dispatch(listaTecnicosThunk({ id_empresa: personalizacionUsuario.empresa }));
            }
            setTecnicoSeleccionado(undefined);
            setFechaEnModal(undefined);
        }
    }, [isOpenEstado, personalizacionUsuario]);

    // Formik para Asignar Técnico en soportes técnicos
    const formikTecnico = useFormik({
        enableReinitialize: true,
        initialValues: {
            tipo_seguimiento: 'comentario_tecnico',
            comentario: 'Técnico agregado',
            tecnico_asignado: '',
        },
        validationSchema: Yup.object().shape({
            tecnico_asignado: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo?.id}/soportes-tecnicos/${detalleSeleccionado}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ tecnico_asignado: values.tecnico_asignado }),
                });
                if (response.data) {
                    try {
                        await ApiService.fetchData({
                            url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo?.id}/soportes-tecnicos/${detalleSeleccionado}/seguimientos/`,
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            data: JSON.stringify({
                                soporte_tecnico: detalleSeleccionado,
                                usuario: null,
                                tipo: values.tipo_seguimiento,
                                comentario: values.comentario,
                            }),
                        });
                    } catch (e) {
                        // ignore seguimiento error
                    }
                    toast.success('Técnico asignado', { autoClose: 1000 });
                    formikTecnico.resetForm();
                    dispatch(listaSoportesTecnicosThunk({ id_orden: detalleOrdenTrabajo?.id }));
                    setIsOpenTecnico(false);
                    setDetalleSeleccionado(null);
                    setSelectedService(null);
                }
            } catch (error: any) {
                toast.error(error?.response?.data || 'Error al asignar el tecnico');
            }
        },
    });

    useEffect(() => {
        if (!isOpenTecnico) {
            formikTecnico.resetForm();
        }
    }, [isOpenTecnico]);

    const crearSeguimientoManual = async () => {
        if (!detalleOrdenTrabajo || !selectedService) return;
        if (!comentarioSeguimiento.trim()) {
            toast.error('Ingrese un comentario');
            return;
        }
        try {
            await ApiService.fetchData({
                url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/soportes-tecnicos/${selectedService.id}/seguimientos/`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({
                    usuario: null,
                    tipo: tipoSeguimiento || 'comentario_tecnico',
                    comentario: comentarioSeguimiento,
                }),
            });
            toast.success('Seguimiento creado', { autoClose: 1000 });
            setIsOpenSeguimiento(false);
            setComentarioSeguimiento('');
            setTipoSeguimiento('comentario_tecnico');
            fetchSeguimientosServicio(selectedService.id);
        } catch (error: any) {
            toast.error(error?.response?.data || 'Error al crear seguimiento');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-xl'>Soportes Técnicos</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        anchoInput={200}>
                        {detalleOrdenTrabajo &&
                            (detalleOrdenTrabajo.estado === 'pendiente' ||
                                detalleOrdenTrabajo.estado === 'en_proceso') && (
                                <CrearSoporteTecnicoEnOT />
                            )}
                    </AnimacionDeInputModoMovil>
                </CardHeaderChild>
            </CardHeader>
            <CardBody>
                <div className='mt-2 overflow-auto'>
                    {soportesFiltrados && soportesFiltrados.length > 0 ? (
                        <>
                            <Table className='min-w-[800px] table-fixed'>
                                <THead>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <Tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <Th
                                                    key={header.id}
                                                    style={{ width: header.column.getSize() }}
                                                    isColumnBorder={false}
                                                    className='text-left'>
                                                    {header.isPlaceholder ? null : (
                                                        <div
                                                            aria-hidden='true'
                                                            {...{
                                                                className:
                                                                    header.column.getCanSort()
                                                                        ? 'cursor-pointer select-none flex items-center'
                                                                        : '',
                                                                onClick:
                                                                    header.column.getToggleSortingHandler(),
                                                            }}>
                                                            {flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext(),
                                                            )}
                                                        </div>
                                                    )}
                                                </Th>
                                            ))}
                                        </Tr>
                                    ))}
                                </THead>
                                <TBody>
                                    {table.getRowModel().rows.map((row) => (
                                        <Tr key={row.id}>
                                            {row.getVisibleCells().map((cell) => (
                                                <Td key={cell.id}>
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext(),
                                                    )}
                                                </Td>
                                            ))}
                                        </Tr>
                                    ))}
                                </TBody>
                            </Table>
                        </>
                    ) : (
                        <div className='text-center text-gray-500'>No hay soportes técnicos.</div>
                    )}
                </div>

                <div className='mt-2 min-w-[800px]'>
                    <TableCardFooterTemplateV2 table={table} />
                </div>
            </CardBody>

            {/* Modal Detalle - Continuará en siguiente mensaje por límite de tamaño */}
            <Modal isOpen={isOpenDetail} setIsOpen={setIsOpenDetail}>
                <ModalHeader>
                    <Badge>Detalle Soporte Técnico</Badge>
                </ModalHeader>
                <ModalBody>
                    {selectedService ? (
                        <>
                            <div className='grid grid-cols-2 gap-4'>
                                <div>
                                    <Badge>Solicitud</Badge>
                                    <div className='ml-4'>{selectedService.nombre}</div>
                                </div>
                                <div>
                                    <Badge>Estado</Badge>
                                    <div className='ml-4'>
                                        <Button
                                            size='sm'
                                            variant='solid'
                                            color={estadoBadgeColor(
                                                String(
                                                    selectedService.estado_label ??
                                                        selectedService.estado,
                                                ),
                                            )}
                                            isDisable={true}>
                                            {selectedService.estado_label ?? selectedService.estado}
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <Badge>Técnico Asignado</Badge>
                                    <div className='ml-4'>
                                        {selectedService.nombre_tecnico ?? (
                                            <span className='italic text-gray-400'>
                                                Sin Técnico
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Fecha soporte</Badge>
                                    <div className='ml-4'>
                                        {selectedService.fecha_soporte ? (
                                            dayjs(selectedService.fecha_soporte)
                                                .locale('es')
                                                .format('DD/MM/YYYY')
                                        ) : (
                                            <span className='italic text-gray-400'>Sin fecha</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Usuarios Asignados</Badge>
                                    <div className='ml-4'>
                                        {selectedService.usuarios_asignados_count ?? 0}
                                    </div>
                                </div>
                            </div>
                            <div className='col-span-2 mt-3'>
                                <div className='mb-2'>
                                    <Badge>Seguimientos</Badge>
                                </div>
                                <div className='mt-2 max-h-48 overflow-auto rounded-lg border'>
                                    {cargandoSeguimientos ? (
                                        <div className='py-4 text-center text-sm text-gray-500'>
                                            Cargando...
                                        </div>
                                    ) : seguimientos.length > 0 ? (
                                        <ul className='divide-y'>
                                            {seguimientos.map((seg, idx) => (
                                                <li
                                                    key={seg.id}
                                                    className='p-3 transition-colors hover:bg-gray-50'>
                                                    <div className='flex items-start justify-between gap-2'>
                                                        <div className='flex-1'>
                                                            <div className='mb-1 flex items-center gap-2'>
                                                                <Badge
                                                                    color={
                                                                        seg.tipo === 'incidencia'
                                                                            ? 'red'
                                                                            : seg.tipo ===
                                                                                'actualizacion'
                                                                              ? 'blue'
                                                                              : 'zinc'
                                                                    }
                                                                    className='text-xs'>
                                                                    {seg.tipo ?? 'seguimiento'}
                                                                </Badge>
                                                                {idx === 0 && (
                                                                    <span className='text-xs font-medium text-emerald-600'>
                                                                        Más reciente
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className='whitespace-pre-wrap text-sm text-gray-700'>
                                                                {seg.comentario || 'Sin comentario'}
                                                            </p>
                                                        </div>
                                                        <span className='whitespace-nowrap text-xs text-gray-500'>
                                                            {seg.fecha_creacion
                                                                ? dayjs(seg.fecha_creacion)
                                                                      .locale('es')
                                                                      .format('DD/MM HH:mm')
                                                                : ''}
                                                        </span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className='py-4 text-center text-sm text-gray-500'>
                                            No hay seguimientos registrados
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>No hay detalle seleccionado.</div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button color='red' onClick={() => setIsOpenDetail(false)}>
                            Cerrar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
            <Modal isOpen={isOpenSeguimiento} setIsOpen={setIsOpenSeguimiento}>
                <ModalHeader>
                    <Badge>Añadir Seguimiento</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Tipo</Badge>
                            <SelectReact
                                name='tipoSeguimiento'
                                options={TIPO_SEGUIMIENTO.filter(
                                    (t) => t.value !== 'actualizacion',
                                )}
                                value={TIPO_SEGUIMIENTO.find((t) => t.value === tipoSeguimiento)}
                                onChange={(e: any) =>
                                    setTipoSeguimiento(
                                        (e as TSelectOption)?.value || 'comentario_tecnico',
                                    )
                                }
                            />
                        </div>
                        <div>
                            <Badge>Comentario</Badge>
                            <Textarea
                                name='comentarioSeguimiento'
                                value={comentarioSeguimiento}
                                onChange={(e: any) => setComentarioSeguimiento(e.target.value)}
                            />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpenSeguimiento(false);
                                setComentarioSeguimiento('');
                                setTipoSeguimiento('comentario_tecnico');
                            }}>
                            Cancelar
                        </Button>
                        <Button variant='solid' onClick={crearSeguimientoManual}>
                            Guardar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
            {detalleOrdenTrabajo && (
                <ModalVincularGuia
                    isOpen={isOpenGuia}
                    setIsOpen={setIsOpenGuia}
                    otId={detalleOrdenTrabajo.id}
                    targetType='soporte'
                    targetId={soporteParaGuia ?? undefined}
                    onSuccess={() => {
                        dispatch(listaSoportesTecnicosThunk({ id_orden: detalleOrdenTrabajo.id }));
                        dispatch(listaInsumosThunk({ id_orden_trabajo: detalleOrdenTrabajo.id }));
                    }}
                />
            )}
            <Modal isOpen={isOpenTecnico} setIsOpen={setIsOpenTecnico} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Asignar Técnico</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div className='w-full'>
                            <Badge>Técnico</Badge>
                            {listaTecnicos && listaTecnicos.length > 0 && (
                                <Validation
                                    isValid={formikTecnico.isValid}
                                    isTouched={formikTecnico.touched.tecnico_asignado}
                                    invalidFeedback={formikTecnico.errors.tecnico_asignado}>
                                    <SelectReact
                                        name='tecnico_asignado'
                                        noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                        placeholder='Seleccione un Técnico'
                                        options={listaTecnicos.map((user: any) => ({
                                            value: String(user.id),
                                            label: user.nombre_usuario,
                                        }))}
                                        onChange={(e: any) => {
                                            formikTecnico.setFieldValue(
                                                'tecnico_asignado',
                                                (e as TSelectOption).value,
                                            );
                                        }}
                                        onBlur={formikTecnico.handleBlur}
                                        value={{
                                            value: formikTecnico.values.tecnico_asignado,
                                            label:
                                                listaTecnicos.find(
                                                    (us: any) =>
                                                        String(us.id) ===
                                                        formikTecnico.values.tecnico_asignado,
                                                )?.nombre_usuario || '',
                                        }}
                                    />
                                </Validation>
                            )}
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpenTecnico(false);
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={() => {
                                formikTecnico.handleSubmit();
                            }}>
                            Guardar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
            {/* Modal para cambio de estado (Soportes Técnicos) */}
            <Modal isOpen={isOpenEstado} setIsOpen={setIsOpenEstado}>
                <ModalHeader>
                    <Badge>Cambiar Estado</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Nuevo Estado</Badge>
                            <div className='ml-4'>
                                <SelectReact
                                    name='estadoNuevo'
                                    options={[
                                        { value: 'pendiente', label: 'Pendiente' },
                                        {
                                            value: 'medianamente_completado',
                                            label: 'Medianamente Completado',
                                        },
                                        { value: 'completado', label: 'Completado' },
                                        { value: 'no_realizado', label: 'No Realizado' },
                                        { value: 'en_proceso', label: 'En Proceso' },
                                    ]}
                                    value={
                                        estadoNuevo
                                            ? { value: estadoNuevo, label: estadoNuevo }
                                            : undefined
                                    }
                                    onChange={(e: any) => {
                                        if (e) setEstadoNuevo((e as TSelectOption).value);
                                        else setEstadoNuevo(undefined);
                                    }}
                                />
                            </div>
                        </div>
                        {(estadoNuevo === 'completado' ||
                            estadoNuevo === 'medianamente_completado' ||
                            estadoNuevo === 'no_realizado') && (
                            <div>
                                <Badge>
                                    Comentario del Seguimiento
                                    <span className='ml-2 text-xs text-red-500'>(Requerido)</span>
                                </Badge>
                                <div className='ml-4'>
                                    <Textarea
                                        name='comentario'
                                        value={comentario}
                                        onChange={(e: any) => setComentario(e.target.value)}
                                        placeholder='Requerido para estados finales (Completado, Medianamente Completado, No Realizado)'
                                    />
                                </div>
                            </div>
                        )}
                        {estadoNuevo === 'en_proceso' && selectedService && (
                            <div className='border-t pt-3'>
                                <p className='text-sm font-medium'>
                                    Requisitos para poner en proceso
                                </p>
                                {!selectedService.tecnico_asignado && (
                                    <div className='mt-2'>
                                        <Badge>Asignar Técnico</Badge>
                                        <div className='ml-4'>
                                            <SelectReact
                                                name='tecnicoSeleccionado'
                                                placeholder='Seleccione un técnico'
                                                options={(listaTecnicos || []).map((t: any) => ({
                                                    value: String(t.id),
                                                    label: t.nombre_usuario,
                                                }))}
                                                value={(listaTecnicos || [])
                                                    .map((t: any) => ({
                                                        value: String(t.id),
                                                        label: t.nombre_usuario,
                                                    }))
                                                    .find(
                                                        (o: any) => o.value === tecnicoSeleccionado,
                                                    )}
                                                onChange={(opt: any) =>
                                                    setTecnicoSeleccionado(opt?.value)
                                                }
                                                isClearable={true}
                                            />
                                        </div>
                                    </div>
                                )}
                                {!selectedService.fecha_soporte && (
                                    <div className='mt-2'>
                                        <Badge>Fecha de soporte</Badge>
                                        <div className='ml-4'>
                                            <Input
                                                name='fecha_en_modal'
                                                type='date'
                                                value={fechaEnModal ?? ''}
                                                onChange={(e: any) =>
                                                    setFechaEnModal(e.target.value)
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpenEstado(false);
                                setEstadoNuevo(undefined);
                                setComentario(undefined);
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={async () => {
                                if (!detalleOrdenTrabajo || !selectedService) return;
                                if (!estadoNuevo) {
                                    toast.error('Seleccione un estado');
                                    return;
                                }

                                // Validar que el comentario sea obligatorio para estados finales
                                const requiresComment =
                                    estadoNuevo === 'completado' ||
                                    estadoNuevo === 'medianamente_completado' ||
                                    estadoNuevo === 'no_realizado';
                                if (requiresComment && (!comentario || comentario.trim() === '')) {
                                    toast.error(
                                        'El comentario es obligatorio para estados finales (Completado, Medianamente Completado, No Realizado)',
                                    );
                                    return;
                                }
                                const requiereFirmaGuia =
                                    (estadoNuevo === 'completado' ||
                                        estadoNuevo === 'medianamente_completado') &&
                                    !!selectedService.guia_salida;
                                if (requiereFirmaGuia) {
                                    abrirModalEntregaGuia(selectedService.guia_salida, estadoNuevo);
                                    return;
                                }

                                const requiresTecnico =
                                    estadoNuevo === 'en_proceso' &&
                                    !selectedService.tecnico_asignado;
                                const requiresFecha =
                                    estadoNuevo === 'en_proceso' && !selectedService.fecha_soporte;
                                if (
                                    (requiresTecnico && !tecnicoSeleccionado) ||
                                    (requiresFecha && !fechaEnModal)
                                ) {
                                    toast.error(
                                        'Debe asignar técnico y fecha antes de poner en proceso',
                                    );
                                    return;
                                }

                                const payload: any = { estado: estadoNuevo };
                                if (estadoNuevo === 'en_proceso') {
                                    if (requiresTecnico && tecnicoSeleccionado)
                                        payload.tecnico_asignado = tecnicoSeleccionado;
                                    if (requiresFecha && fechaEnModal)
                                        payload.fecha_soporte = fechaEnModal;

                                    // Auto-start OT if pending
                                    if (detalleOrdenTrabajo.estado === 'pendiente') {
                                        try {
                                            await ApiService.fetchData({
                                                url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/`,
                                                method: 'patch',
                                                headers: { 'Content-Type': 'application/json' },
                                                data: JSON.stringify({ estado: 'en_proceso' }),
                                            });
                                            // Update OT details in store
                                            dispatch(
                                                detalleOrdenTrabajoThunk({
                                                    id_ordenTrabajo: detalleOrdenTrabajo.id,
                                                }),
                                            );
                                        } catch (e) {
                                            console.error('Error auto-starting OT', e);
                                        }
                                    }
                                }

                                await guardarCambioEstado(payload, requiresComment);
                            }}>
                            Guardar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>

            <Modal isOpen={isOpenAsignarFecha} setIsOpen={setIsOpenAsignarFecha}>
                <ModalHeader>
                    <Badge>Asignar Fecha de Soporte</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Fecha</Badge>
                            <div className='ml-4'>
                                <Input
                                    name='fecha_asignar'
                                    type='date'
                                    value={fechaAsignar ?? ''}
                                    onChange={(e: any) => setFechaAsignar(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpenAsignarFecha(false);
                                setFechaAsignar(undefined);
                                setSelectedService(null);
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={async () => {
                                if (!detalleOrdenTrabajo || !selectedService) return;
                                if (!fechaAsignar) {
                                    toast.error('Seleccione una fecha');
                                    return;
                                }
                                try {
                                    const resp = await ApiService.fetchData({
                                        url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/soportes-tecnicos/${selectedService.id}/`,
                                        method: 'patch',
                                        headers: { 'Content-Type': 'application/json' },
                                        data: JSON.stringify({ fecha_soporte: fechaAsignar }),
                                    });
                                    if (resp.data) {
                                        toast.success('Fecha asignada', { autoClose: 1000 });
                                        dispatch(
                                            listaSoportesTecnicosThunk({
                                                id_orden: detalleOrdenTrabajo.id,
                                            }),
                                        );
                                        setIsOpenAsignarFecha(false);
                                        setFechaAsignar(undefined);
                                        setSelectedService(null);
                                    }
                                } catch (e: any) {
                                    const msg = Object.values(e?.response?.data || {})
                                        .flat()
                                        .join(' ');
                                    toast.error(msg || 'Error al asignar fecha');
                                }
                            }}>
                            Guardar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>

            {/* Modal Firmar y Completar Trabajo */}
            <FirmarCompletarTrabajo
                ordenId={detalleOrdenTrabajo?.id || 0}
                trabajoId={firmaTrabajoId}
                trabajoTipo={firmaTrabajoTipo}
                estadoFinal={firmaEstadoFinal}
                clienteId={detalleOrdenTrabajo?.cliente || 0}
                tecnicoNombre={firmaTecnicoNombre}
                comentariosTecnicos={firmaComentariosTecnicos}
                isOpen={isOpenFirmaModal}
                setIsOpen={setIsOpenFirmaModal}
                onSuccess={() => {
                    setIsOpenFirmaModal(false);
                    if (detalleOrdenTrabajo) {
                        dispatch(listaSoportesTecnicosThunk({ id_orden: detalleOrdenTrabajo.id }));
                        dispatch(checkCompletibilidadOTThunk({ id_orden: detalleOrdenTrabajo.id }));
                    }
                }}
            />

            {/* Modal Gestionar Usuarios Asignados */}
            {detalleOrdenTrabajo && soporteIdUsuarios && (
                <ListaUsuarioEquipoOT
                    ordenId={detalleOrdenTrabajo.id}
                    soporteId={soporteIdUsuarios}
                    soporteEstado={soporteEstadoUsuarios}
                    tecnicoNombre={soporteTecnicoUsuarios}
                    clienteId={detalleOrdenTrabajo.cliente}
                    isOpen={isOpenUsuarios}
                    onClose={() => {
                        setIsOpenUsuarios(false);
                        setSoporteIdUsuarios(null);
                        setSoporteEstadoUsuarios(null);
                        setSoporteTecnicoUsuarios(null);
                    }}
                    onSaved={() => {
                        dispatch(
                            listaSoportesTecnicosThunk({
                                id_orden: detalleOrdenTrabajo.id,
                            }),
                        );
                    }}
                />
            )}

            {/* Modal Firmar y Completar Trabajo */}
            <FirmarCompletarTrabajo
                ordenId={detalleOrdenTrabajo?.id || 0}
                trabajoId={firmaTrabajoId}
                trabajoTipo={firmaTrabajoTipo}
                estadoFinal={firmaEstadoFinal}
                clienteId={detalleOrdenTrabajo?.cliente || 0}
                tecnicoNombre={firmaTecnicoNombre}
                comentariosTecnicos={firmaComentariosTecnicos}
                isOpen={isOpenFirmaModal}
                setIsOpen={setIsOpenFirmaModal}
                onSuccess={() => {
                    setIsOpenFirmaModal(false);
                    if (detalleOrdenTrabajo) {
                        dispatch(listaSoportesTecnicosThunk({ id_orden: detalleOrdenTrabajo.id }));
                        dispatch(checkCompletibilidadOTThunk({ id_orden: detalleOrdenTrabajo.id }));
                    }
                }}
            />
        </Card>
    );
}

export default ListaSoportesTecnicosOT;
