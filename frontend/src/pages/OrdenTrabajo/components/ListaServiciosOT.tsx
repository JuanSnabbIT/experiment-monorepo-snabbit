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
import { useAppSelector } from '@/store';
import {
    useActualizarServicioGeneralMutation,
    useCrearSeguimientoServicioMutation,
    useEliminarServicioGeneralMutation,
    useGetCheckCompletibilidadOTQuery,
    useGetDetalleOrdenTrabajoQuery,
    useGetSeguimientosServicioQuery,
    useGetServiciosGeneralesQuery,
    useGetTecnicosPorEmpresaQuery,
    useUpdateOrdenTrabajoMutation,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import { getErrorMessage } from '@/utils/errorHandlers';
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
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import CrearServicioEnOT from '../modals/CrearServicioEnOT';
import FirmarCompletarTrabajo from '../modals/FirmarCompletarTrabajo';
import FirmarEntregarGuiaTrabajo from '../modals/FirmarEntregarGuiaTrabajo';
import VincularCotizacion from '../modals/VincularCotizacion';
import DropdownEstadoTrabajo from './DropdownEstadoTrabajo';

// ⚠️ DEPRECATED NOTICE (2026-01):
// La funcionalidad de vincular guías directamente a servicios está deprecada.
// Las guías deben vincularse a la OT, no a servicios/soportes individuales.
// Ver: backend/ordentrabajov2/DEPRECATION_NOTICE.md

function ListaServiciosOT() {
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    const { personalizacionUsuario } = useAppSelector((s) => s.auth);
    const {
        data: detalleOrdenTrabajo,
        refetch: refetchDetalleOrdenTrabajo,
    } = useGetDetalleOrdenTrabajoQuery(ordenId ?? 0, { skip: !ordenId });
    const {
        data: listaServiciosGenerales = [],
        refetch: refetchServiciosGenerales,
    } = useGetServiciosGeneralesQuery(ordenId ?? 0, { skip: !ordenId });
    const { data: listaTecnicos = [] } = useGetTecnicosPorEmpresaQuery(
        personalizacionUsuario?.empresa ?? 0,
        { skip: !personalizacionUsuario?.empresa },
    );
    const { refetch: refetchCompletibilidadOT } = useGetCheckCompletibilidadOTQuery(
        ordenId ?? 0,
        { skip: !ordenId },
    );
    const [actualizarServicio] = useActualizarServicioGeneralMutation();
    const [eliminarServicio] = useEliminarServicioGeneralMutation();
    const [crearSeguimientoServicio] = useCrearSeguimientoServicioMutation();
    const [updateOrdenTrabajo] = useUpdateOrdenTrabajoMutation();

    const [selectedService, setSelectedService] = useState<any | null>(null);
    const [isOpenDetail, setIsOpenDetail] = useState(false);
    const [openedDescriptions, setOpenedDescriptions] = useState<number[]>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [sorting, setSorting] = useState<SortingState>([]);
    // Asignar fecha modal
    const [isOpenAsignarFecha, setIsOpenAsignarFecha] = useState<boolean>(false);
    const [isOpenVincularCotizacion, setIsOpenVincularCotizacion] = useState<boolean>(false);
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
    const {
        data: seguimientos = [],
        isFetching: cargandoSeguimientos,
    } = useGetSeguimientosServicioQuery(
        {
            ordenId: ordenId ?? 0,
            servicioId: selectedService?.id ?? 0,
        },
        {
            skip: !ordenId || !selectedService?.id || !isOpenDetail,
        },
    );
    const [isOpenSeguimiento, setIsOpenSeguimiento] = useState<boolean>(false);
    const [comentarioSeguimiento, setComentarioSeguimiento] = useState<string>('');
    const [tipoSeguimiento, setTipoSeguimiento] = useState<string>('comentario_tecnico');

    // Vincular guía
    const [isOpenGuia, setIsOpenGuia] = useState<boolean>(false);
    const [guiaSeleccionada, setGuiaSeleccionada] = useState<string | null>(null);
    const [guiasDisponibles, setGuiasDisponibles] = useState<{ value: string; label: string }[]>(
        [],
    );
    const [servicioParaGuia, setServicioParaGuia] = useState<number | null>(null);
    const [isOpenEntregaGuia, setIsOpenEntregaGuia] = useState<boolean>(false);
    const [guiaEntregaId, setGuiaEntregaId] = useState<number | undefined>();
    const [clienteEntregaId, setClienteEntregaId] = useState<number | null | undefined>();
    const [estadoEntregaGuia, setEstadoEntregaGuia] = useState<'E' | 'PR'>('E');

    // Modal de firma para completar trabajo
    const [isOpenFirmaModal, setIsOpenFirmaModal] = useState(false);
    const [firmaTrabajoId, setFirmaTrabajoId] = useState<number>(0);
    const [firmaTrabajoTipo, setFirmaTrabajoTipo] = useState<'servicio' | 'soporte'>('servicio');
    const [firmaEstadoFinal, setFirmaEstadoFinal] = useState<
        'completado' | 'medianamente_completado'
    >('completado');
    const [firmaTecnicoNombre, setFirmaTecnicoNombre] = useState<string>('Técnico');
    const [firmaComentariosTecnicos, setFirmaComentariosTecnicos] = useState<any[]>([]);

    // ⚠️ FUNCIONALIDAD ANTIGUA DESHABILITADA (2026-01)
    // Para reactivar carga de guías para servicios, descomenta:
    /*
	const cargarGuiasDisponibles = async () => {
		if (!detalleOrdenTrabajo) return;
		try {
			const resp = await ApiService.fetchData<any[]>({
				url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/guias-disponibles/`,
				method: 'get',
			});
			const opciones = (resp.data || []).map((g) => ({
				value: g.id.toString(),
                label: `#${g.id} - ${g.motivo || 'Sin motivo'} (${g.estado_label}) - ${g.cantidad_items} ítems`,
			}));
			setGuiasDisponibles(opciones);
		} catch (e: any) {
            toast.error(e?.response?.data?.detail || 'No se pudieron cargar las guías disponibles');
		}
	};
	*/

    // ⚠️ FUNCIONALIDAD ANTIGUA DESHABILITADA (2026-01)
    // Para reactivar vinculación de guías a servicios, descomenta:
    /*
	const vincularGuia = async () => {
		if (!detalleOrdenTrabajo || !servicioParaGuia || !guiaSeleccionada) return;
		try {
			await ApiService.fetchData({
				url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/servicios-generales/${servicioParaGuia}/asociar-guia/`,
				method: 'post',
				headers: { 'Content-Type': 'application/json' },
				data: JSON.stringify({ guia_salida: guiaSeleccionada }),
			});
            toast.success('Guía vinculada');
			setIsOpenGuia(false);
		} catch (e: any) {
            const msg = e?.response?.data?.detail || 'Error al vincular guía';
			toast.error(msg);
		}
	};
	*/

    // ⚠️ FUNCIONALIDAD ANTIGUA DESHABILITADA (2026-01)
    // Para reactivar desvinculación de guías de servicios, descomenta:
    /*
	const desvincularGuia = async (servicioId: number) => {
		if (!detalleOrdenTrabajo) return;
		const ok = await confirmAlert({
			title: 'Desvincular guia',
			text: 'Desvincular la guia de este servicio?',
			confirmText: 'Desvincular',
			cancelText: 'Cancelar',
			icon: 'warning',
		});
		if (!ok) return;
		try {
			await ApiService.fetchData({
				url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo.id}/servicios-generales/${servicioId}/desasociar-guia/`,
				method: 'post',
				headers: { 'Content-Type': 'application/json' },
			});
            toast.success('Guía desvinculada');
		} catch (e: any) {
            const msg = e?.response?.data?.detail || 'Error al desvincular guía';
			toast.error(msg);
		}
	}
	*/

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
            await actualizarServicio({
                ordenId: detalleOrdenTrabajo.id,
                servicioId: selectedService.id,
                data: payload,
            }).unwrap();
            if (requiresComment && comentario && comentario.trim()) {
                try {
                    await crearSeguimientoServicio({
                        ordenId: detalleOrdenTrabajo.id,
                        servicioId: selectedService.id,
                        data: {
                            comentario,
                            tipo: 'incidencia',
                            usuario: null,
                        },
                    }).unwrap();
                    // RTK Query cache invalidates automatically
                } catch {
                    // ignore seguimiento error
                }
            }
            toast.success('Estado cambiado', { autoClose: 1000 });
            // RTK Query cache invalidates automatically
            setIsOpenEstado(false);
            setEstadoNuevo(undefined);
            setComentario(undefined);
            setSelectedService(null);
            setTecnicoSeleccionado(undefined);
            setFechaEnModal(undefined);

            if (estadoNuevo === 'en_proceso' && detalleOrdenTrabajo.estado === 'pendiente') {
                await updateOrdenTrabajo({
                    id: detalleOrdenTrabajo.id,
                    data: { estado: 'en_proceso' },
                }).unwrap();
                // RTK Query cache invalidates automatically
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error) || 'Error al cambiar el estado');
        }
    };

    const iniciarServicio = async (servicio: any) => {
        if (!detalleOrdenTrabajo) return;
        const ok = await confirmAlert({
            title: 'Confirmar cambio de estado',
            text: 'Iniciar este servicio y pasar a En proceso?',
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            icon: 'warning',
        });
        if (!ok) return;
        try {
            await actualizarServicio({
                ordenId: detalleOrdenTrabajo.id,
                servicioId: servicio.id,
                data: { estado: 'en_proceso' },
            }).unwrap();
            toast.success('Servicio en proceso');
            // RTK Query cache invalidates automatically
            await updateOrdenTrabajo({
                id: detalleOrdenTrabajo.id,
                data: { estado: 'en_proceso' },
            }).unwrap();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error) || 'No se pudo iniciar el servicio.');
        }
    };

    const openDetail = (serv: any) => {
        setSelectedService(serv);
        setIsOpenDetail(true);
    };

    const toggleDescription = (id: number) => {
        setOpenedDescriptions((prev) =>
            prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
        );
    };

    const filtro = globalFilter?.toLowerCase()?.trim();
    const serviciosFiltrados = listaServiciosGenerales
        ? filtro
            ? listaServiciosGenerales.filter((s: any) => {
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
            : listaServiciosGenerales
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
                const isFinalState = isCompletado || isMedianamenteCompletado || isNoRealizado;

                const hasTecnico = !!info.row.original.tecnico_asignado;
                const hasFecha = !!info.row.original.fecha_servicio;
                const requierePrereqs = isPendiente;
                // Validar TODAS las guías de la OT (no solo per-trabajo)
                const guiasOT = detalleOrdenTrabajo?.guias_salida || [];
                const guiasTodosFirmadas =
                    guiasOT.length === 0 ||
                    guiasOT.every((g: any) => ['FR', 'ET', 'E', 'T'].includes(g.estado));
                const guiaListo = guiasTodosFirmadas;
                const faltaBasicos = !hasTecnico || !hasFecha;

                // Validación OT Padre (Normalización de estados)
                const hasOTFecha = !!detalleOrdenTrabajo?.fecha_inicio_ot;
                // Verificar responsable: puede estar en responsable_empresa O tecnico_responsable_ot
                const hasOTResponsable = !!(
                    detalleOrdenTrabajo?.responsable_empresa ||
                    detalleOrdenTrabajo?.tecnico_responsable_ot
                );
                const faltaOTConfig = !hasOTFecha || !hasOTResponsable;

                const canStart = !requierePrereqs || (!faltaBasicos && guiaListo && !faltaOTConfig);

                let tooltipText = 'Confirmar y pasar a En proceso';
                if (!canStart && requierePrereqs) {
                    if (faltaOTConfig) {
                        tooltipText =
                            'La OT principal debe tener fecha de inicio y responsable asignado para iniciar trabajos';
                    } else if (faltaBasicos) {
                        tooltipText = 'Requiere técnico asignado y fecha de servicio para iniciar';
                    } else if (!guiaListo) {
                        tooltipText =
                            'Todas las Guías de Salida de la OT deben estar firmadas (Firmada/En Tránsito) para iniciar';
                    }
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

                // CASO 1: Estados finales (Completado, Medianamente Completado, No Realizado)
                // → Botón gris deshabilitado, SIN Tooltip, SIN onClick
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

                // CASO 2: En proceso
                // → Renderizar DropdownEstadoTrabajo para cambiar a estados finales
                if (isEnProceso) {
                    return (
                        <DropdownEstadoTrabajo
                            onSelectEstado={async (estado) => {
                                // Para completado y medianamente_completado, el endpoint ya actualizó el estado
                                if (
                                    estado === 'completado' ||
                                    estado === 'medianamente_completado'
                                ) {
                                    refetchServiciosGenerales();
                                    refetchDetalleOrdenTrabajo();
                                    refetchCompletibilidadOT();
                                    return;
                                }
                                // Para no_realizado, hacer el cambio normal
                                if (!detalleOrdenTrabajo) return;
                                try {
                                    await actualizarServicio({
                                        ordenId: detalleOrdenTrabajo.id,
                                        servicioId: info.row.original.id,
                                        data: { estado },
                                    }).unwrap();
                                    toast.success(`Estado cambiado a ${estado}`, {
                                        autoClose: 1000,
                                    });
                                    // Refetch to ensure banner updates immediately
                                    refetchServiciosGenerales();
                                    refetchDetalleOrdenTrabajo();
                                    refetchCompletibilidadOT();
                                } catch (error: unknown) {
                                    toast.error(getErrorMessage(error) || 'Error al cambiar el estado');
                                }
                            }}
                            disabled={!canStart}
                            tooltipText={tooltipText}
                            ordenId={detalleOrdenTrabajo?.id}
                            servicioId={info.row.original.id}
                            clienteId={detalleOrdenTrabajo?.cliente}
                            tecnicoNombre={info.row.original.nombre_tecnico || 'Técnico'}
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

                // CASO 3: Pendiente
                // → Tooltip + Button que llama a iniciarServicio() con confirmación
                return (
                    <Tooltip text={tooltipText}>
                        <div className={!canStart ? 'inline-block' : ''}>
                            <Button
                                size='sm'
                                variant={!canStart ? 'outline' : 'solid'}
                                rounded='rounded-full'
                                color={!canStart ? 'amber' : 'amber'}
                                icon={estadoIcon}
                                isDisable={!canStart}
                                onClick={() => {
                                    if (!canStart) return;
                                    iniciarServicio(info.row.original);
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
        columnHelper.accessor('fecha_servicio', {
            cell: (info) =>
                info.getValue() ? (
                    dayjs(info.getValue()).locale('es').format('DD/MM/YYYY')
                ) : (
                    <span className='italic text-gray-400'>Sin fecha</span>
                ),
            header: 'Fecha trabajo',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => {
                const estadoLower = String(info.row.original.estado ?? '').toLowerCase();
                const isPendiente = estadoLower === 'pendiente';
                const isEnProceso = estadoLower === 'en_proceso' || estadoLower === 'en proceso';
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
                            <>
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
                                {/* Vincular Cotización - Comentado: Funcionalidad pendiente de implementación backend
							<Tooltip text='Vincular Cotización'>
									<Button
										variant='solid'
										color='emerald'
										icon='HeroDocumentText'
										onClick={() => {
											setSelectedService(info.row.original);
											setIsOpenVincularCotizacion(true);
										}}
									/>
								</Tooltip>
								*/}
                            </>
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
                                                info.row.original.fecha_servicio ?? undefined,
                                            );
                                            setIsOpenAsignarFecha(true);
                                        }}
                                    />
                                </Tooltip>
                                <Tooltip text='Eliminar servicio'>
                                    <Button
                                        variant='solid'
                                        color='red'
                                        icon='HeroTrash'
                                        onClick={async () => {
                                            if (!detalleOrdenTrabajo) return;
                                            const ok = await confirmAlert({
                                                title: 'Eliminar servicio',
                                                text: 'Eliminar este servicio? Esta accion no se puede deshacer.',
                                                confirmText: 'Eliminar',
                                                cancelText: 'Cancelar',
                                                icon: 'warning',
                                                confirmColor: '#dc2626',
                                            });
                                            if (!ok) return;
                                            try {
                                                await eliminarServicio({
                                                    ordenId: detalleOrdenTrabajo.id,
                                                    servicioId: info.row.original.id,
                                                }).unwrap();
                                                toast.success('Servicio eliminado', {
                                                    autoClose: 1000,
                                                });
                                            } catch (error: unknown) {
                                                toast.error(
                                                    getErrorMessage(error) ||
                                                        'Error al eliminar servicio',
                                                );
                                            }
                                        }}
                                    />
                                </Tooltip>
                            </>
                        )}
                        {!info.row.original
                            .guia_salida ? // ⚠️ DESHABILITADO: Botón de vinculación antigua comentado (2026-01)
                        // Para reactivar: descomentar y verificar que modal esté actualizado
                        /*
							<Tooltip text='Vincular Guía de Salida'>
								<Button
									variant='solid'
									color='emerald'
									icon='HeroLink'
									onClick={() => {
										setServicioParaGuia(info.row.original.id);
										setGuiaSeleccionada(null);
										setIsOpenGuia(true);
										cargarGuiasDisponibles();
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
                    </div>
                );
            },
            header: 'Acciones',
        }),
    ];
    const table = useReactTable({
        data: serviciosFiltrados,
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

    const quitarTecnico = async () => {
        if (!detalleOrdenTrabajo || !selectedService) return;
        try {
            await actualizarServicio({
                ordenId: detalleOrdenTrabajo.id,
                servicioId: selectedService.id,
                data: { tecnico_asignado: null },
            }).unwrap();
            toast.success('Técnico quitado', { autoClose: 1000 });
            setIsOpenDetail(false);
            setSelectedService(null);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error) || 'Error al quitar técnico');
        }
    };

    useEffect(() => {
        if (isOpenEstado) {
            setTecnicoSeleccionado(undefined);
            setFechaEnModal(undefined);
        }
    }, [isOpenEstado]);

    // Formik para Asignar Técnico en servicios generales: se crea más abajo junto al modal

    // Nota: el control de cambio de estado se realiza desde la columna de Acciones

    // Formik para Asignar Técnico (servicios generales)
    const formikTecnico = useFormik({
        enableReinitialize: true,
        initialValues: {
            tipo_seguimiento: 'actualizacion',
            comentario: 'Técnico agregado',
            tecnico_asignado: '',
        },
        validationSchema: Yup.object().shape({
            tecnico_asignado: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                await actualizarServicio({
                    ordenId: detalleOrdenTrabajo?.id ?? 0,
                    servicioId: detalleSeleccionado ?? 0,
                    data: { tecnico_asignado: Number(values.tecnico_asignado) },
                }).unwrap();
                try {
                    await crearSeguimientoServicio({
                        ordenId: detalleOrdenTrabajo?.id ?? 0,
                        servicioId: detalleSeleccionado ?? 0,
                        data: {
                            servicio: detalleSeleccionado,
                            usuario: null,
                            tipo: values.tipo_seguimiento,
                            comentario: values.comentario,
                        },
                    }).unwrap();
                } catch {
                    // ignore seguimiento error
                }
                toast.success('Técnico asignado', { autoClose: 1000 });
                formikTecnico.resetForm();
                setIsOpenTecnico(false);
                setDetalleSeleccionado(null);
                setSelectedService(null);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error) || 'Error al asignar el tecnico');
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
            await crearSeguimientoServicio({
                ordenId: detalleOrdenTrabajo.id,
                servicioId: selectedService.id,
                data: {
                    usuario: null,
                    tipo: tipoSeguimiento || 'comentario_tecnico',
                    comentario: comentarioSeguimiento,
                },
            }).unwrap();
            toast.success('Seguimiento creado', { autoClose: 1000 });
            setIsOpenSeguimiento(false);
            setComentarioSeguimiento('');
            setTipoSeguimiento('comentario_tecnico');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error) || 'Error al crear seguimiento');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-xl'>Servicios Generales</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    <AnimacionDeInputModoMovil
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        anchoInput={200}>
                        {detalleOrdenTrabajo &&
                            (detalleOrdenTrabajo.estado === 'pendiente' ||
                                detalleOrdenTrabajo.estado === 'en_proceso') && (
                                <CrearServicioEnOT />
                            )}
                    </AnimacionDeInputModoMovil>
                </CardHeaderChild>
            </CardHeader>
            <CardBody>
                <div className='mt-2 overflow-auto'>
                    {serviciosFiltrados && serviciosFiltrados.length > 0 ? (
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
                        <div className='text-center text-gray-500'>No hay servicios generales.</div>
                    )}
                </div>

                <div className='mt-2 min-w-[800px]'>
                    <TableCardFooterTemplateV2 table={table} />
                </div>
            </CardBody>

            <Modal isOpen={isOpenDetail} setIsOpen={setIsOpenDetail}>
                <ModalHeader>
                    <Badge>Detalle Servicio</Badge>
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
                                    <Badge>Fecha trabajo</Badge>
                                    <div className='ml-4'>
                                        {selectedService.fecha_servicio ? (
                                            dayjs(selectedService.fecha_servicio)
                                                .locale('es')
                                                .format('DD/MM/YYYY')
                                        ) : (
                                            <span className='italic text-gray-400'>Sin fecha</span>
                                        )}
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
                                                            {seg.fecha
                                                                ? dayjs(seg.fecha)
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
                                options={TIPO_SEGUIMIENTO}
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
            {/* ⚠️ MODAL ANTIGUO DESHABILITADO (2026-01)
            Para reactivar modal de vinculación de guías a servicios, descomenta y reinstancia la lógica de cargar guías disponibles y vincular.
			<Modal isOpen={isOpenGuia} setIsOpen={setIsOpenGuia}>
				<ModalHeader>
                    <Badge>Vincular Guía de Salida</Badge>
				</ModalHeader>
				<ModalBody>
					<div className='flex flex-col gap-4'>
						<div className='w-full'>
                            <Badge>Guías Disponibles</Badge>
							<SelectReact
								name='guia_salida'
                                placeholder='Seleccione una guía'
								options={guiasDisponibles}
								onChange={(e) => setGuiaSeleccionada((e as TSelectOption).value)}
								value={guiasDisponibles.find((g) => g.value === guiaSeleccionada)}
							/>
						</div>
					</div>
				</ModalBody>
				<ModalFooter>
					<ModalFooterChild />
					<ModalFooterChild>
						<Button color='red' onClick={() => setIsOpenGuia(false)}>
							Cancelar
						</Button>
						<Button
							variant='solid'
							color='emerald'
							onClick={vincularGuia}
							isDisable={!guiaSeleccionada}>
							Vincular
						</Button>
					</ModalFooterChild>
				</ModalFooter>
			</Modal>
			*/}

            {/* Modal para cambio de estado (Servicios Generales) */}
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
                                {!selectedService.fecha_servicio && (
                                    <div className='mt-2'>
                                        <Badge>Fecha de trabajo</Badge>
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
                                    estadoNuevo === 'en_proceso' && !selectedService.fecha_servicio;
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
                                        payload.fecha_servicio = fechaEnModal;

                                    // Auto-start OT if pending
                                    if (detalleOrdenTrabajo.estado === 'pendiente') {
                                        try {
                                            await updateOrdenTrabajo({
                                                id: detalleOrdenTrabajo.id,
                                                data: { estado: 'en_proceso' },
                                            }).unwrap();
                                        } catch (error) {
                                            console.error('Error auto-starting OT', error);
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

            <FirmarEntregarGuiaTrabajo
                guiaId={guiaEntregaId}
                clienteId={clienteEntregaId}
                estadoDestino={estadoEntregaGuia}
                isOpen={isOpenEntregaGuia}
                setIsOpen={setIsOpenEntregaGuia}
                onSuccess={async () => {
                    if (!estadoNuevo) return;
                    const requiresComment =
                        estadoNuevo === 'completado' ||
                        estadoNuevo === 'medianamente_completado' ||
                        estadoNuevo === 'no_realizado';
                    await guardarCambioEstado({ estado: estadoNuevo }, requiresComment);
                }}
            />

            <Modal isOpen={isOpenAsignarFecha} setIsOpen={setIsOpenAsignarFecha}>
                <ModalHeader>
                    <Badge>Asignar Fecha de Trabajo</Badge>
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
                                    await actualizarServicio({
                                        ordenId: detalleOrdenTrabajo.id,
                                        servicioId: selectedService.id,
                                        data: { fecha_servicio: fechaAsignar },
                                    }).unwrap();
                                    toast.success('Fecha asignada', { autoClose: 1000 });
                                    setIsOpenAsignarFecha(false);
                                    setFechaAsignar(undefined);
                                    setSelectedService(null);
                                } catch (error: unknown) {
                                    toast.error(getErrorMessage(error) || 'Error al asignar fecha');
                                }
                            }}>
                            Guardar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
            {selectedService && detalleOrdenTrabajo && (
                <VincularCotizacion
                    isOpen={isOpenVincularCotizacion}
                    setIsOpen={setIsOpenVincularCotizacion}
                    entityType='servicio-general'
                    entityId={selectedService.id}
                    ordenId={detalleOrdenTrabajo.id}
                    entityName={selectedService.nombre}
                    onSuccess={() => {
                        if (detalleOrdenTrabajo) {
                        }
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
                    refetchServiciosGenerales();
                    refetchDetalleOrdenTrabajo();
                    refetchCompletibilidadOT();
                }}
            />
        </Card>
    );
}

export default ListaServiciosOT;
