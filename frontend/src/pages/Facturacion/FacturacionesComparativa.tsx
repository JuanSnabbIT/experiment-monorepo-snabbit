import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Select from '@/components/form/Select';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardTitle } from '@/components/ui/Card';
import Table, { TBody, Td, THead, Th, Tr } from '@/components/ui/Table';
import { IContratoMatching } from '@/interface/contrato.interface';
import { ICotizacion, IItemCotizacion } from '@/interface/cotizaciones.interface';
import { IOrdenDeTrabajo } from '@/interface/ordenTrabajo.interface';
import ApiService from '@/services/ApiService';
import { useAppSelector } from '@/store';
import { useGetContratosActivosClienteQuery } from '@/store/slices/contratos/contratoApi';
import { useGetMisClientesQuery } from '@/store/slices/empresa/empresaApi';
import { useGetOrdenesTrabajoQuery } from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    getPlanComponentDetails,
    isPlanContractSource,
    PlanIncludedServicesDetail,
} from '../Contratos/components/planContractDetail';
import {
    buildPrefacturacionListPath,
    buildPrefacturaOTDetailPath,
    parsePrefacturacionSearchParams,
} from './prefacturacion.shared';

interface ItemEjecutado {
    id: string;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    total: number;
    tipo: string;
    ot_id?: number;
    estado?: string;
    parent_id?: number;
    guia_id?: number;
    compra_id?: number;
    rendicion_id?: number;
    item_rendicion_id?: number;
    content_type?: string;
    item_id?: number;
}

interface VisitasContratoResumen {
    periodo: string;
    incluidas_mes: number;
    confirmadas_mes: number;
}

interface VisitasPrefacturaPayload extends VisitasContratoResumen {
    marcadas_prefactura: number;
    proyectadas_mes: number;
    exceso_prefactura: number;
    ots_marcadas: number[];
    precio_unitario_exceso: number;
    total_exceso: number;
}

interface ItemPrefactura {
    itemId: string;
    facturar: boolean;
    comentario: string;
    precioAsignado: number | null;
    precioAjustado?: number | null;
}

interface CotizacionRelacionada {
    id: number;
    numero_cotizacion: number;
    nombre: string;
    estado: string;
    estado_label?: string;
    cliente_id?: number;
    cliente_nombre?: string;
    total_estimado: number;
    fecha_vencimiento?: string | null;
    dolar_observado?: number | null;
    fecha_facturacion?: string | null;
}

interface IComparativaData {
    pactado: {
        items: any[];
        total: number;
        moneda: string;
    } | null;
    ejecutado: {
        items: ItemEjecutado[];
        total: number;
        moneda: string;
        resumen?: {
            trabajos: number;
            guias: number;
            compras?: number;
            gastos_operativos?: number;
            rendiciones: number;
        };
        cotizaciones?: CotizacionRelacionada[];
    } | null;
    diferencia: number | null;
    visitas_contrato?: VisitasContratoResumen | null;
}

interface ITipoCambioResponse {
    fecha: string;
    fecha_dolar: string | null;
    fecha_uf: string | null;
    dolar: number;
    uf: number;
}

const FacturacionesComparativa = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const routeState = parsePrefacturacionSearchParams(searchParams, 'ot');
    const backToList = buildPrefacturacionListPath(routeState, 'ot');
    const { data: listaOrdenTrabajo = [], refetch: refetchOrdenesTrabajo } =
        useGetOrdenesTrabajoQuery();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);

    // Obtener TODOS los clientes de la empresa (vÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a RelacionEmpresa)
    const empresaId = personalizacionUsuario?.empresa;
    const { data: misClientes = [] } = useGetMisClientesQuery(empresaId ?? undefined, {
        skip: !empresaId,
    });

    // Estado para selecciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n de empresa cliente
    const [selectedEmpresaClienteId, setSelectedEmpresaClienteId] = useState<number | null>(null);
    const [selectedContratoId, setSelectedContratoId] = useState<number | ''>('');
    const [selectedOts, setSelectedOts] = useState<number[]>([]);
    const [visitasMarcadasPorOt, setVisitasMarcadasPorOt] = useState<Record<number, boolean>>({});
    const [precioVisitaAdicional, setPrecioVisitaAdicional] = useState<number>(0);
    const [expandedPlanItems, setExpandedPlanItems] = useState<Record<number, boolean>>({});
    const { data: contratosActivosCliente = [], isLoading: loadingContratos } =
        useGetContratosActivosClienteQuery(selectedEmpresaClienteId ?? 0, {
            skip: !selectedEmpresaClienteId,
        });

    // Estado para bÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºsqueda en dropdown OTs
    const [searchOtInput, setSearchOtInput] = useState<string>('');
    const [showOtDropdown, setShowOtDropdown] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Estado para comparativa
    const [comparativaData, setComparativaData] = useState<IComparativaData | null>(null);
    const [loadingComparativa, setLoadingComparativa] = useState<boolean>(false);
    const [pactadoData, setPactadoData] = useState<any>(null);
    const [ejecutadoData, setEjecutadoData] = useState<any>(null);
    const [loadingPactado, setLoadingPactado] = useState<boolean>(false);
    const [loadingEjecutado, setLoadingEjecutado] = useState<boolean>(false);
    const [cotizacionItemsById, setCotizacionItemsById] = useState<
        Record<number, IItemCotizacion[]>
    >({});
    const [cotizacionDetallesById, setCotizacionDetallesById] = useState<
        Record<number, ICotizacion>
    >({});
    const cotizacionesItemsCargadasRef = useRef<Set<number>>(new Set());
    const cotizacionesDetallesCargadasRef = useRef<Set<number>>(new Set());
    const [loadingCotizaciones, setLoadingCotizaciones] = useState<boolean>(false);

    // Estado para controles de prefactura (por item)
    const [itemsConfig, setItemsConfig] = useState<Map<string, ItemPrefactura>>(new Map());
    // Cotizaciones relacionadas (se usan en varias funciones). Declarar temprano para evitar TDZ
    const cotizacionesRelacionadas = useMemo<CotizacionRelacionada[]>(
        () =>
            Array.isArray(ejecutadoData?.ejecutado?.cotizaciones)
                ? ejecutadoData.ejecutado.cotizaciones
                : [],
        [ejecutadoData],
    );
    const cotizacionesRelacionadasKey = useMemo(
        () => cotizacionesRelacionadas.map((cotizacion) => cotizacion.id).join(','),
        [cotizacionesRelacionadas],
    );

    const [creatingPrefactura, setCreatingPrefactura] = useState<boolean>(false);
    const [fechaPrefactura, setFechaPrefactura] = useState<string>(
        dayjs().format('YYYY-MM-DD'),
    );
    const [tipoCambioSeleccionado, setTipoCambioSeleccionado] = useState<{
        dolar: number | null;
        uf: number | null;
        fecha: string | null;
    } | null>(null);
    const [cargandoTipoCambio, setCargandoTipoCambio] = useState<boolean>(false);
    const [errorTipoCambio, setErrorTipoCambio] = useState<string | null>(null);
    const fechaInicialSetRef = useRef(false);

    // OTs que ya estÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡n incluidas en otras prefacturas (excluirlas del dropdown)
    const [excludedOtIds, setExcludedOtIds] = useState<number[]>([]);

    // FunciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n para crear prefactura (POST a API)
    const handleCrearPrefactura = async () => {
        try {
            if (!selectedEmpresaClienteId) {
                toast.warning('Debes seleccionar una empresa cliente.');
                return;
            }
            if (visitasPrefactura.exceso_prefactura > 0 && precioVisitaAdicional <= 0) {
                toast.warning(
                    'Debes indicar un precio mayor a 0 para las visitas adicionales antes de crear la prefactura.',
                );
                return;
            }

            setCreatingPrefactura(true);

            const itemsFacturables = [
                ...((ejecutadoData?.ejecutado?.items ?? []).map((item: ItemEjecutado) => {
                    const itemKey = `${item.tipo}_${item.id}`;
                    const config: Partial<ItemPrefactura> = itemsConfig.get(itemKey) ?? {};
                    const itemRecord = item as unknown as Record<string, unknown>;
                    const categoria = itemRecord.categoria;
                    const fallbackCategoria =
                        itemRecord.categoria_nombre ||
                        (categoria && typeof categoria === 'object'
                            ? (categoria as { nombre?: string }).nombre
                            : categoria) ||
                        null;
                    const fallbackFecha = itemRecord.fecha_gasto || itemRecord.fecha_compra || itemRecord.fecha || null;
                    return {
                        tipo: item.tipo,
                        id: item.id,
                        descripcion: String(itemRecord.descripcion || item.nombre || ''),
                        ot_id: item.ot_id,
                        cantidad: item.cantidad || 1,
                        precio_total: Number(item.precio_unitario || 0) * (item.cantidad || 1),
                        precio_ajustado: config.precioAsignado ?? null,
                        facturar: config.facturar ?? true,
                        comentario: config.comentario || '',
                        categoria_id:
                            itemRecord.categoria_id ??
                            (categoria && typeof categoria === 'object'
                                ? ((categoria as { id?: number }).id ?? null)
                                : null),
                        categoria_nombre: fallbackCategoria,
                        fecha_gasto: fallbackFecha,
                        dolar_observado: itemRecord.dolar_observado ?? null,
                        parent_id: item.guia_id ?? item.compra_id ?? item.rendicion_id ?? null,
                        item_id: item.item_id ?? item.id,
                        guia_id: item.guia_id ?? null,
                        compra_id: item.compra_id ?? null,
                        rendicion_id: item.rendicion_id ?? null,
                        item_rendicion_id: item.item_rendicion_id ?? null,
                        content_type: item.content_type ?? null,
                    };
                })),
                ...(syntheticVisitaItem ? [syntheticVisitaItem] : []),
            ];

            if (itemsFacturables.length === 0) {
                toast.warning('No hay items seleccionados para facturar');
                return;
            }

            const itemsJsonPayload = {
                cliente_id: selectedEmpresaClienteId,
                contrato_id: selectedContratoId || null,
                ots_incluidas: selectedOts,
                items: itemsFacturables,
                resumen: {
                    total_items: prefacturaPreviewItems.length,
                    total_facturar: totales.totalFacturable,
                },
                visitas: visitasPrefactura,
            };

            const payloadPOST = {
                cliente: selectedEmpresaClienteId,
                resultado: itemsJsonPayload,
                comentario: '',
                estado_cierre: 'borrador',
                fecha_prefactura: fechaPrefactura,
            };

            const response = await ApiService.fetchData<{ id: number }>({
                url: '/api/cierres-administrativos/',
                method: 'post',
                data: payloadPOST,
            });

            const prefacturaId = response.data?.id;

            if (response.status === 201 && prefacturaId) {
                toast.success(`Prefactura #${prefacturaId} creada exitosamente`);
                refetchOrdenesTrabajo();
                setTimeout(() => {
                    navigate(buildPrefacturaOTDetailPath(prefacturaId, routeState));
                }, 1000);
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setCreatingPrefactura(false);
        }
    };

    // Inicializar con parÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡metros desde URL (cliente_id y ot_id)
    useEffect(() => {
        const clienteIdParam = searchParams.get('cliente_id');
        const otIdParam = searchParams.get('ot_id');

        if (clienteIdParam) {
            const clienteId = parseInt(clienteIdParam, 10);
            if (!isNaN(clienteId)) {
                setSelectedEmpresaClienteId(clienteId);
            }
        }

        if (otIdParam) {
            const otId = parseInt(otIdParam, 10);
            if (!isNaN(otId)) {
                setSelectedOts([otId]);
            }
        }
    }, [searchParams]);

    useEffect(() => {
        if (!selectedEmpresaClienteId) {
            setSelectedContratoId('');
            setExpandedPlanItems({});
        }
    }, [selectedEmpresaClienteId]);

    useEffect(() => {
        if (fechaInicialSetRef.current) return;
        if (cotizacionesRelacionadas.length > 0) {
            const fecha = cotizacionesRelacionadas[0].fecha_facturacion;
            if (fecha) {
                setFechaPrefactura(dayjs(fecha).format('YYYY-MM-DD'));
                fechaInicialSetRef.current = true;
            }
        }
    }, [cotizacionesRelacionadas]);


    // Cargar comparativa automÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ticamente cuando cambian contrato u OTs
    useEffect(() => {
        if (selectedContratoId && selectedOts.length > 0) {
            setLoadingComparativa(true);
            ApiService.fetchData<IComparativaData>({
                url: '/api/cierres-facturacion/comparativa/',
                method: 'post',
                data: {
                    ots_ids: selectedOts,
                    contrato_id: selectedContratoId,
                    fecha_prefactura: fechaPrefactura,
                },
            })
                .then((response) => {
                    setComparativaData(response.data);
                    // Guardar la respuesta completa para mantener consistencia con otros useEffect
                    setPactadoData(response.data);
                    setEjecutadoData(response.data);
                })
                .catch(() => {
                    setComparativaData(null);
                })
                .finally(() => {
                    setLoadingComparativa(false);
            });
        } else {
            setComparativaData(null);
        }
    }, [selectedContratoId, selectedOts, fechaPrefactura]);

    useEffect(() => {
        if (!fechaPrefactura) {
            setTipoCambioSeleccionado(null);
            return;
        }

        let active = true;
        setCargandoTipoCambio(true);
        setErrorTipoCambio(null);

        ApiService.fetchData<ITipoCambioResponse>({
            url: `/api/cotizaciones/tipo-cambio/?fecha=${fechaPrefactura}`,
            method: 'get',
        })
            .then((response) => {
                if (!active) return;
                setTipoCambioSeleccionado({
                    dolar: response.data.dolar,
                    uf: response.data.uf,
                    fecha: response.data.fecha,
                });
            })
            .catch((_error) => {
                if (!active) return;
                const mensaje = 'No se pudo cargar el tipo de cambio.';
                setErrorTipoCambio(mensaje);
                setTipoCambioSeleccionado(null);
            })
            .finally(() => {
                if (!active) return;
                setCargandoTipoCambio(false);
            });

        return () => {
            active = false;
        };
    }, [fechaPrefactura]);

    // Cargar datos de OTs seleccionadas apenas se seleccionen (sin esperar contrato)
    useEffect(() => {
        if (selectedOts.length > 0) {
            setLoadingEjecutado(true);
            ApiService.fetchData<any>({
                url: '/api/cierres-facturacion/comparativa/',
                method: 'post',
                data: {
                    ots_ids: selectedOts,
                    fecha_prefactura: fechaPrefactura,
                    // No enviar contrato_id, backend ahora soporta parÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡metros opcionales
                },
            })
                .then((response) => {
                    // La respuesta deberÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a tener estructura { ejecutado: {...}, pactado: null, diferencia: null }
                    setEjecutadoData(response.data);

                    // Inicializar config de items (por defecto: facturar=true, sin comentario)
                    if (response.data?.ejecutado?.items) {
                        const newConfig = new Map<string, ItemPrefactura>();
                        response.data.ejecutado.items.forEach((item: ItemEjecutado) => {
                            const itemKey = `${item.tipo}_${item.id}`;
                            newConfig.set(itemKey, {
                                itemId: itemKey,
                                facturar: true,
                                comentario: '',
                                precioAsignado:
                                    item.precio_unitario > 0 ? item.precio_unitario : null,
                            });
                        });
                        setItemsConfig(newConfig);
                    }
                })
                .catch(() => {
                    setEjecutadoData(null);
                })
                .finally(() => {
                    setLoadingEjecutado(false);
                });
        } else {
            setEjecutadoData(null);
            setItemsConfig(new Map());
            setVisitasMarcadasPorOt({});
        }
    }, [selectedOts, fechaPrefactura]);

    // Cargar datos de contrato apenas se seleccione
    useEffect(() => {
        if (selectedContratoId) {
            setLoadingPactado(true);
            ApiService.fetchData<any>({
                url: '/api/cierres-facturacion/comparativa/',
                method: 'post',
                data: {
                    contrato_id: selectedContratoId,
                    // No enviar ots_ids, backend ahora soporta parÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡metros opcionales
                },
            })
                .then((response) => {
                    // La respuesta deberÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a tener estructura { pactado: {...}, ejecutado: null, diferencia: null }
                    setPactadoData(response.data);
                })
                .catch(() => {
                    setPactadoData(null);
                })
                .finally(() => {
                    setLoadingPactado(false);
                });
        } else {
            setPactadoData(null);
        }
    }, [selectedContratoId]);

    // Deseleccionar contrato si no hay empresa cliente seleccionada
    useEffect(() => {
        if (!selectedEmpresaClienteId && selectedContratoId) {
            setSelectedContratoId('');
        }
    }, [selectedEmpresaClienteId, selectedContratoId]);

    // Cerrar dropdown de OTs al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowOtDropdown(false);
            }
        };

        if (showOtDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showOtDropdown]);

    // Actualizar configuraciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n de item
    const updateItemConfig = (itemId: string, updates: Partial<ItemPrefactura>) => {
        setItemsConfig((prev) => {
            const newMap = new Map(prev);
            const current = newMap.get(itemId) || {
                itemId,
                facturar: true,
                comentario: '',
                precioAsignado: null,
            };
            newMap.set(itemId, { ...current, ...updates });
            return newMap;
        });
    };

    // Obtener tipo de badge segÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºn tipo de item
    const getTipoBadge = (tipo: string) => {
        switch (tipo) {
            case 'servicio_ot':
            case 'soporte_tecnico':
                return { variant: 'solid' as const, color: 'blue' as const, label: 'Servicio' };
            case 'guia_salida':
                return { variant: 'solid' as const, color: 'emerald' as const, label: 'Material' };
            case 'compra':
                return { variant: 'solid' as const, color: 'violet' as const, label: 'Compra' };
            case 'gasto_operativo':
                return {
                    variant: 'solid' as const,
                    color: 'amber' as const,
                    label: 'Gasto Operativo',
                };
            // Legacy (mantener compatibilidad)
            case 'compra_material':
                return { variant: 'solid' as const, color: 'violet' as const, label: 'Compra' };
            case 'rendicion_gasto':
                return {
                    variant: 'solid' as const,
                    color: 'amber' as const,
                    label: 'Gasto Operativo',
                };
            case 'visita_adicional_contrato':
                return {
                    variant: 'solid' as const,
                    color: 'red' as const,
                    label: 'Visita adicional',
                };
            default:
                return { variant: 'solid' as const, color: 'gray' as const, label: 'Otro' };
        }
    };

    // Filtrar OTs completadas, filtrar por cliente seleccionado y excluir OTs ya en prefacturas
    const otasDisponibles = useMemo(
        () =>
            listaOrdenTrabajo.filter(
                (ot: IOrdenDeTrabajo) =>
                    ot.estado === 'completada' &&
                    (!selectedEmpresaClienteId || ot.cliente === selectedEmpresaClienteId) &&
                    !excludedOtIds.includes(ot.id),
            ),
        [listaOrdenTrabajo, selectedEmpresaClienteId, excludedOtIds],
    );

    // Filtrar OTs por bÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºsqueda
    const otasFiltradas = useMemo(() => {
        return otasDisponibles.filter((ot) =>
            `#${ot.id} - ${ot.cliente_nombre}`.toLowerCase().includes(searchOtInput.toLowerCase()),
        );
    }, [otasDisponibles, searchOtInput]);

    // Obtener contrato seleccionado
    const contratoSeleccionado = useMemo<IContratoMatching | undefined>(
        () => contratosActivosCliente.find((contrato) => contrato.id === selectedContratoId),
        [contratosActivosCliente, selectedContratoId],
    );

    const visitasContratoBase = useMemo<VisitasContratoResumen>(() => {
        const periodo = dayjs(fechaPrefactura).format('YYYY-MM');
        const incluidasDesdeContrato = (contratoSeleccionado?.items_comerciales ?? []).reduce(
            (acumulado, item) => acumulado + Number(item.num_visitas_mensuales ?? 0),
            0,
        );

        return {
            periodo: comparativaData?.visitas_contrato?.periodo ?? periodo,
            incluidas_mes:
                comparativaData?.visitas_contrato?.incluidas_mes ?? incluidasDesdeContrato,
            confirmadas_mes: comparativaData?.visitas_contrato?.confirmadas_mes ?? 0,
        };
    }, [comparativaData?.visitas_contrato, contratoSeleccionado, fechaPrefactura]);

    const otsMarcadasVisita = useMemo(
        () => selectedOts.filter((otId) => Boolean(visitasMarcadasPorOt[otId])),
        [selectedOts, visitasMarcadasPorOt],
    );

    const visitasPrefactura = useMemo<VisitasPrefacturaPayload>(() => {
        const proyectadasMes =
            visitasContratoBase.confirmadas_mes + otsMarcadasVisita.length;
        const excesoTotalProyectado = Math.max(
            proyectadasMes - visitasContratoBase.incluidas_mes,
            0,
        );
        const excesoYaConfirmado = Math.max(
            visitasContratoBase.confirmadas_mes - visitasContratoBase.incluidas_mes,
            0,
        );
        const excesoPrefactura = Math.max(excesoTotalProyectado - excesoYaConfirmado, 0);

        return {
            ...visitasContratoBase,
            marcadas_prefactura: otsMarcadasVisita.length,
            proyectadas_mes: proyectadasMes,
            exceso_prefactura: excesoPrefactura,
            ots_marcadas: otsMarcadasVisita,
            precio_unitario_exceso: precioVisitaAdicional,
            total_exceso: excesoPrefactura * precioVisitaAdicional,
        };
    }, [otsMarcadasVisita, precioVisitaAdicional, visitasContratoBase]);

    const syntheticVisitaItem = useMemo(() => {
        if (!selectedContratoId || visitasPrefactura.exceso_prefactura <= 0) {
            return null;
        }

        return {
            tipo: 'visita_adicional_contrato',
            id: `visita-extra-${visitasPrefactura.periodo}`,
            descripcion: `Visita adicional contrato - ${visitasPrefactura.periodo}`,
            nombre: `Visita adicional contrato - ${visitasPrefactura.periodo}`,
            cantidad: visitasPrefactura.exceso_prefactura,
            precio_total: visitasPrefactura.total_exceso,
            precio_ajustado: visitasPrefactura.total_exceso,
            precio_unitario: precioVisitaAdicional,
            facturar: true,
            comentario: 'Cobro adicional por exceso de visitas contractuales.',
        };
    }, [precioVisitaAdicional, selectedContratoId, visitasPrefactura]);

    const prefacturaPreviewItems = useMemo(
        () => [
            ...(ejecutadoData?.ejecutado?.items ?? []),
            ...(syntheticVisitaItem ? [syntheticVisitaItem] : []),
        ],
        [ejecutadoData?.ejecutado?.items, syntheticVisitaItem],
    );

    useEffect(() => {
        if (selectedContratoId && !loadingContratos && !contratoSeleccionado) {
            setSelectedContratoId('');
            setExpandedPlanItems({});
        }
    }, [contratoSeleccionado, loadingContratos, selectedContratoId]);

    // Cargar facturas existentes para excluir OTs ya incluidas en otras prefacturas
    useEffect(() => {
        let mounted = true;
        const fetchFacturas = async () => {
            try {
                const resp: any = await ApiService.fetchData({
                    url: '/api/cierres-administrativos/',
                    method: 'get',
                });
                const results = Array.isArray(resp.data) ? resp.data : (resp.data?.results ?? []);
                const otIds: number[] = [];
                results.forEach((f: any) => {
                    // Solo excluir OTs de prefacturas activas (por_facturar o facturado)
                    if (f?.estado_cierre === 'borrador') return;
                    const ots = f?.resultado?.ots_incluidas || [];
                    if (Array.isArray(ots)) otIds.push(...ots);
                });
                if (mounted) setExcludedOtIds(Array.from(new Set(otIds)));
            } catch (err) {
                void err;
            }
        };
        fetchFacturas();
        return () => {
            mounted = false;
        };
    }, []);

    // Obtener empresas cliente disponibles (desde RelacionEmpresa, NO solo OTs completadas)
    const empresasClienteDisponibles = useMemo(() => {
        return misClientes.map((r) => r.cliente);
    }, [misClientes]);

    // Obtener nombre de empresa cliente por ID
    const getNombreEmpresaCliente = (empresaClienteId: number) => {
        const relacion = misClientes.find((r) => r.cliente === empresaClienteId);
        if (relacion?.info_cliente?.nombre) return relacion.info_cliente.nombre;
        // Fallback: buscar en OTs
        return (
            listaOrdenTrabajo.find((ot: IOrdenDeTrabajo) => ot.cliente === empresaClienteId)
                ?.cliente_nombre || `Empresa #${empresaClienteId}`
        );
    };

    // OTs seleccionadas (objetos completos)
    const otsSeleccionadas = useMemo(
        () => otasDisponibles.filter((ot) => selectedOts.includes(ot.id)),
        [otasDisponibles, selectedOts],
    );

    const getPrecioUnitario = (item: IItemCotizacion) => {
        return Number(item.precio_venta_neta_unitario_moneda_base || 0);
    };

    const getPrecioTotal = (item: IItemCotizacion) => {
        return Number(item.precio_venta_neta_total_moneda_base || 0);
    };

    // Calcular valores para items ejecutados segÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºn moneda activa (visual)
    const computeItemValues = (item: any, moneda: 'CLP' | 'USD') => {
        const cantidad = item.cantidad ?? 1;
        if (moneda === 'CLP') {
            const unit = Number(item.precio_unitario ?? item.precio_unitario_clp ?? 0);
            const total = Number(item.total ?? unit * cantidad);
            return { unit, total };
        }

        // USD: intentar extraer valores ya disponibles
        const unitUsdCandidates = [item.precio_unitario_usd, item.precio_unitario_backend?.usd];
        for (const cand of unitUsdCandidates) {
            if (cand !== undefined && cand !== null) {
                const unit = Number(cand);
                const total = Number(item.total_usd ?? item.precio_total_usd ?? unit * cantidad);
                return { unit, total };
            }
        }

        const fallbackDolar =
            cotizacionesRelacionadas.length > 0 &&
            (cotizacionDetallesById[cotizacionesRelacionadas[0].id]?.dolar_observado ??
                cotizacionesRelacionadas[0].dolar_observado);

        const dolarObservado =
            tipoCambioSeleccionado?.dolar ?? item.dolar_observado ?? fallbackDolar;

        if (dolarObservado && (item.precio_unitario || item.total)) {
            const unidad = Number(item.precio_unitario ?? 0) / Number(dolarObservado);
            const total =
                Number(item.total ?? (item.precio_unitario ?? 0) * cantidad) /
                Number(dolarObservado);
            return { unit: unidad, total };
        }

        // Intentar buscar en items de cotizacion por coincidencia de nombre / ids
        try {
            const cotId = item.cotizacion_id ?? item.cotizacion;
            if (cotId && cotizacionItemsById[cotId]) {
                const match = (cotizacionItemsById[cotId] as any[]).find(
                    (ci) => ci.id === item.item_cotizacion_id || ci.nombre_item === item.nombre,
                );
                if (match) {
                    const unit = getPrecioUnitario(match as any);
                    const total = getPrecioTotal(match as any);
                    return { unit, total };
                }
            }
            // buscar por nombre en todas
            for (const list of Object.values(cotizacionItemsById)) {
                const match = (list as any[]).find(
                    (ci) => ci.nombre_item === item.nombre || ci.nombre_item === item.descripcion,
                );
                if (match) {
                    const unit = getPrecioUnitario(match as any);
                    const total = getPrecioTotal(match as any);
                    return { unit, total };
                }
            }
        } catch (err) {
            // ignore
        }

        // Fallback: devolver valores CLP para evitar NaN
        const unit = Number(item.precio_unitario ?? 0);
        const total = Number(item.total ?? unit * cantidad);
        return { unit, total };
    };

    const getMonedaCotizacion = (cotizacion: Partial<ICotizacion>) => {
        const tipo = cotizacion.tipo_moneda;
        if (tipo === '1') return 'USD' as const;
        if (tipo === '3') return 'UF' as const;
        return 'CLP' as const;
    };

    // Calcular totales dinÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡micamente
    const totales = useMemo(() => {
        let totalFacturable = 0;
        let countFacturables = 0;
        let countNoFacturables = 0;

        prefacturaPreviewItems.forEach((item) => {
            if (item.tipo === 'visita_adicional_contrato') {
                totalFacturable += visitasPrefactura.total_exceso;
                countFacturables++;
                return;
            }

            const itemKey = `${item.tipo}_${item.id}`;
            const config = itemsConfig.get(itemKey);
            if (config?.facturar === false) {
                countNoFacturables++;
                return;
            }

            const cantidad = item.cantidad ?? 1;
            const computed = computeItemValues(item as any, 'CLP');
            const totalBase =
                typeof computed.total === 'number'
                    ? computed.total
                    : (computed.unit ?? 0) * cantidad;
            const totalLinea = config?.precioAsignado ?? totalBase;
            totalFacturable += totalLinea;
            countFacturables++;
        });

        return {
            totalFacturable,
            countFacturables,
            countNoFacturables,
            totalItems: prefacturaPreviewItems.length,
        };
    }, [
        cotizacionItemsById,
        cotizacionesRelacionadasKey,
        itemsConfig,
        prefacturaPreviewItems,
        visitasPrefactura.total_exceso,
    ]);

    useEffect(() => {
        let mounted = true;
        const fetchCotizaciones = async () => {
            if (cotizacionesRelacionadas.length === 0) {
                if (mounted) {
                    setCotizacionItemsById({});
                    setCotizacionDetallesById({});
                    cotizacionesItemsCargadasRef.current.clear();
                    cotizacionesDetallesCargadasRef.current.clear();
                }
                return;
            }

            const missingDetalleIds = cotizacionesRelacionadas
                .map((cotizacion) => cotizacion.id)
                .filter((id) => !cotizacionesDetallesCargadasRef.current.has(id));
            const missingItemsIds = cotizacionesRelacionadas
                .map((cotizacion) => cotizacion.id)
                .filter((id) => !cotizacionesItemsCargadasRef.current.has(id));

            if (missingDetalleIds.length === 0 && missingItemsIds.length === 0) {
                return;
            }

            setLoadingCotizaciones(true);
            try {
                const detallePromises = missingDetalleIds.map(async (id) => {
                    const response = await ApiService.fetchData<ICotizacion>({
                        url: `/api/cotizaciones/${id}/`,
                        method: 'get',
                    });
                    return { id, data: response.data };
                });

                const itemsPromises = missingItemsIds.map(async (id) => {
                    const response = await ApiService.fetchData<any>({
                        url: `/api/cotizaciones/${id}/items/`,
                        method: 'get',
                    });
                    const items = Array.isArray(response.data)
                        ? response.data
                        : (response.data?.results ?? []);
                    return { id, items };
                });

                const [detalles, items] = await Promise.all([
                    Promise.all(detallePromises),
                    Promise.all(itemsPromises),
                ]);

                if (!mounted) return;

                if (detalles.length > 0) {
                    setCotizacionDetallesById((prev) => {
                        const next = { ...prev };
                        detalles.forEach(({ id, data }) => {
                            if (data) {
                                next[id] = data;
                                cotizacionesDetallesCargadasRef.current.add(id);
                            }
                        });
                        return next;
                    });
                }

                if (items.length > 0) {
                    setCotizacionItemsById((prev) => {
                        const next = { ...prev };
                        items.forEach(({ id, items: list }) => {
                            next[id] = list;
                            cotizacionesItemsCargadasRef.current.add(id);
                        });
                        return next;
                    });
                }
            } catch (error) {
                void error;
            } finally {
                if (mounted) {
                    setLoadingCotizaciones(false);
                }
            }
        };

        fetchCotizaciones();

        return () => {
            mounted = false;
        };
    }, [cotizacionesRelacionadasKey]);

    const formatInfoValue = (value: string | number | null | undefined) => {
        if (value === null || value === undefined || value === '') return '-';
        return String(value);
    };

    const formatFecha = (value?: string | null) => {
        if (!value) return '-';
        return dayjs(value).format('DD/MM/YYYY');
    };

    // Manejar selecciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n de contrato
    const handleSelectContrato = (contratoId: number | '') => {
        setSelectedContratoId(contratoId);
        setVisitasMarcadasPorOt({});
        setPrecioVisitaAdicional(0);
        setExpandedPlanItems({});
    };

    // Manejar selecciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n de empresa cliente
    const handleSelectEmpresaCliente = (empresaClienteId: number | null) => {
        setSelectedEmpresaClienteId(empresaClienteId);
        setSelectedContratoId('');
        setSelectedOts([]);
        setVisitasMarcadasPorOt({});
        setPrecioVisitaAdicional(0);
        setExpandedPlanItems({});
    };

    // Manejar selecciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n/deselecciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n de OT
    const handleToggleOt = (ot: IOrdenDeTrabajo) => {
        const isSelected = selectedOts.includes(ot.id);
        const nextSelected = isSelected
            ? selectedOts.filter((id) => id !== ot.id)
            : [...selectedOts, ot.id];

        setSelectedOts(nextSelected);
        if (isSelected) {
            setVisitasMarcadasPorOt((prev) => {
                const next = { ...prev };
                delete next[ot.id];
                return next;
            });
        }
    };

    // Limpiar selecciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n
    const handleLimpiar = () => {
        setSelectedEmpresaClienteId(null);
        setSelectedContratoId('');
        setSelectedOts([]);
        setComparativaData(null);
        setPactadoData(null);
        setEjecutadoData(null);
        setSearchOtInput('');
        setShowOtDropdown(false);
        setItemsConfig(new Map());
        setVisitasMarcadasPorOt({});
        setPrecioVisitaAdicional(0);
        setExpandedPlanItems({});
    };

    const toggleExpandedPlanItem = (itemId: number) => {
        setExpandedPlanItems((prev) => ({
            ...prev,
            [itemId]: !prev[itemId],
        }));
    };

    const totalPactadoComparativa = Number(comparativaData?.pactado?.total ?? 0);
    const totalEjecutadoComparativa = Number(comparativaData?.ejecutado?.total ?? 0);
    const diferenciaComparativa = Number(comparativaData?.diferencia ?? 0);
    const diferenciaComparativaPositiva = diferenciaComparativa >= 0;

    return (
        <PageWrapper name='FacturaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n - Matching Manual'>
            <Subheader>
                <SubheaderLeft>
                    <h2 className='text-2xl font-bold dark:text-white'>Matching Manual de FacturaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n</h2>
                    <p className='mt-1 text-sm text-zinc-600 dark:text-zinc-400'>
                        Selecciona un contrato y sus ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³rdenes de trabajo para comparar y hacer
                        matching
                    </p>
                </SubheaderLeft>
                <SubheaderRight>
                    <Button
                        icon='HeroXMark'
                        variant='outline'
                        onClick={() => navigate(backToList)}>
                        Volver
                    </Button>
                </SubheaderRight>
            </Subheader>

            {/* SELECTORES: EmpresaCliente + Contrato + OTs */}
            <Container className='mb-6'>
                <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
                    {/* DROPDOWN EMPRESA CLIENTE */}
                    <div className='flex flex-col gap-2'>
                        <label className='text-sm font-semibold text-zinc-700 dark:text-zinc-300'>
                            Selecciona Empresa Cliente
                        </label>
                        <Select
                            name='empresa_cliente'
                            value={selectedEmpresaClienteId || ''}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                handleSelectEmpresaCliente(
                                    e.target.value ? Number(e.target.value) : null,
                                )
                            }
                            className='font-semibold'>
                            <option value=''>-- Selecciona una empresa --</option>
                            {empresasClienteDisponibles.map((empresaId) => (
                                <option key={empresaId} value={empresaId}>
                                    {getNombreEmpresaCliente(empresaId)}
                                </option>
                            ))}
                        </Select>
                    </div>

                    {/* DROPDOWN CONTRATOS */}
                    <div className='flex flex-col gap-2'>
                        <label className='text-sm font-semibold text-zinc-700 dark:text-zinc-300'>
                            Contrato <span className='font-normal text-zinc-400'>(opcional)</span>
                        </label>
                        <Select
                            name='contrato'
                            value={selectedContratoId}
                            onChange={(e) => handleSelectContrato(Number(e.target.value) || '')}
                            disabled={selectedEmpresaClienteId === null}
                            className={`font-semibold ${
                                selectedEmpresaClienteId === null
                                    ? 'cursor-not-allowed text-zinc-500 dark:text-zinc-400'
                                    : 'text-zinc-900 dark:text-zinc-100'
                            }`}>
                            <option value=''>-- Sin contrato --</option>
                            {contratosActivosCliente.map((contrato) => (
                                <option key={contrato.id} value={contrato.id}>
                                    #{contrato.id} - {contrato.nombre}
                                </option>
                            ))}
                        </Select>
                        {selectedEmpresaClienteId === null && (
                            <p className='text-xs italic text-zinc-500 dark:text-zinc-400'>
                                Selecciona una empresa cliente primero
                            </p>
                        )}
                        {selectedEmpresaClienteId !== null && loadingContratos && (
                            <p className='text-xs italic text-zinc-500 dark:text-zinc-400'>
                                Cargando contratos activos...
                            </p>
                        )}
                    </div>

                    {/* SELECTOR DE OTs */}
                    <div className='flex flex-col gap-2'>
                        <label className='text-sm font-semibold text-zinc-700 dark:text-zinc-300'>
                            Selecciona ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“rdenes de Trabajo
                        </label>
                        <div className='relative' ref={dropdownRef}>
                            <div
                                onClick={() => {
                                    if (selectedEmpresaClienteId === null) return;
                                    setShowOtDropdown(!showOtDropdown);
                                }}
                                className={`w-full cursor-pointer rounded-lg border-2 border-zinc-300 dark:border-zinc-700 px-4 py-3 font-semibold transition focus:outline-none ${
                                    selectedEmpresaClienteId === null
                                        ? 'pointer-events-none cursor-not-allowed bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                                        : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:border-zinc-400 dark:border-zinc-600'
                                }`}>
                                {selectedOts.length === 0 ? (
                                    <span className='text-sm text-zinc-500 dark:text-zinc-400'>
                                        -- Selecciona OTs --
                                    </span>
                                ) : (
                                    <span className='text-sm'>
                                        {selectedOts.length} OT{selectedOts.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            {showOtDropdown && selectedEmpresaClienteId !== null && (
                                <div className='absolute left-0 right-0 top-full z-20 mt-2 rounded-lg border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg dark:border-zinc-600 dark:border-zinc-500 dark:bg-zinc-800'>
                                    <div className='border-b border-zinc-200 dark:border-zinc-700 p-3'>
                                        <Input
                                            name='buscar_ot'
                                            type='text'
                                            placeholder='Buscar OT por ID o cliente...'
                                            value={searchOtInput}
                                            onChange={(e) => setSearchOtInput(e.target.value)}
                                            className='text-sm'
                                        />
                                    </div>

                                    <div className='max-h-64 overflow-y-auto'>
                                        {otasFiltradas.length > 0 ? (
                                            otasFiltradas.map((ot) => (
                                                <label
                                                    key={ot.id}
                                                    className='flex cursor-pointer items-center gap-3 border-b border-zinc-100 dark:border-zinc-700 px-4 py-2 last:border-0 hover:bg-zinc-100 dark:hover:bg-zinc-700'>
                                                    <Checkbox
                                                        id={`ot-${ot.id}`}
                                                        name={`ot-${ot.id}`}
                                                        checked={selectedOts.includes(ot.id)}
                                                        onChange={() => handleToggleOt(ot)}
                                                        className='py-0'
                                                        inputClassName='h-4 w-4 cursor-pointer'
                                                    />
                                                    <div className='flex-1 text-sm'>
                                                        <p className='font-medium'>
                                                            OT #{ot.id} - {ot.cliente_nombre}
                                                        </p>
                                                        <p className='text-xs text-zinc-600 dark:text-zinc-400'>
                                                            Finalizada:{' '}
                                                            {dayjs(ot.fecha_finalizacion_ot).format(
                                                                'DD/MM/YYYY',
                                                            )}
                                                        </p>
                                                    </div>
                                                </label>
                                            ))
                                        ) : (
                                            <div className='p-4 text-center text-sm text-zinc-500 dark:text-zinc-400'>
                                                No hay OTs disponibles
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CHIPS de OTs Seleccionadas */}
                    {selectedOts.length > 0 && (
                        <div className='mt-3 flex flex-wrap gap-2'>
                            {otsSeleccionadas.map((ot) => (
                                <div
                                    key={ot.id}
                                    className='inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700'>
                                    OT #{ot.id}
                                    <Button
                                        size='xs'
                                        variant='default'
                                        onClick={() => handleToggleOt(ot)}
                                        className='!px-0 !py-0 font-bold text-blue-700 hover:text-blue-900'>
                                        x
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Container>

            {/* LAYOUT DOS COLUMNAS: Contrato (STICKY LEFT) + OTs + Ejecutado (RIGHT) */}
            {selectedEmpresaClienteId && (
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-12'>
                    {/* COLUMNA IZQUIERDA: Resumen del Contrato (Sticky) */}
                    <div className='lg:col-span-4'>
                        <div className='sticky top-4'>
                            <Container>
                                <Card className='shadow-md'>
                                    <CardBody className='space-y-3'>
                                        {selectedContratoId && contratoSeleccionado ? (
                                            <>
                                                {/* HEADER COMPACTO */}
                                                <div className='border-b border-zinc-200 pb-2 dark:border-zinc-700'>
                                                    <h3 className='text-sm font-bold text-blue-600 dark:text-blue-400'>
                                                        {contratoSeleccionado.nombre}
                                                    </h3>
                                                    <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                        ID #{contratoSeleccionado.id} | Estado:{' '}
                                                        {contratoSeleccionado.estado_label}
                                                    </p>
                                                    <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                        Moneda {contratoSeleccionado.moneda_cobro}
                                                        {contratoSeleccionado.dia_facturacion
                                                            ? ` | DÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a facturaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n ${contratoSeleccionado.dia_facturacion}`
                                                            : ''}
                                                    </p>
                                                </div>

                                                {/* SERVICIOS CONTRATADOS (TABLA COMPACTA) */}
                                                {contratoSeleccionado.items_comerciales.length > 0 ? (
                                                    <div>
                                                        <h4 className='mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400'>
                                                            ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âtems comerciales
                                                        </h4>
                                                        <div className='overflow-hidden rounded border border-zinc-300 dark:border-zinc-600'>
                                                            <Table className='w-full text-xs dark:text-zinc-100'>
                                                                <THead className='bg-zinc-100 dark:bg-zinc-800'>
                                                                    <Tr>
                                                                        <Th className='px-2 py-1 text-left font-medium text-zinc-700 dark:text-zinc-300'>
                                                                            ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âtem
                                                                        </Th>
                                                                        <Th className='px-2 py-1 text-right font-medium text-zinc-700 dark:text-zinc-300'>
                                                                            Total mes
                                                                        </Th>
                                                                    </Tr>
                                                                </THead>
                                                                <TBody className='divide-y bg-white dark:bg-zinc-900'>
                                                                    {contratoSeleccionado.items_comerciales.map(
                                                                        (item) => {
                                                                            const planComponents =
                                                                                isPlanContractSource(
                                                                                    item,
                                                                                )
                                                                                    ? getPlanComponentDetails(
                                                                                          item,
                                                                                      )
                                                                                    : [];
                                                                            const hasPlanBreakdown =
                                                                                item.tipo_origen ===
                                                                                    'plan' &&
                                                                                planComponents.length >
                                                                                    0;
                                                                            const isExpanded =
                                                                                Boolean(
                                                                                    expandedPlanItems[
                                                                                        item.id
                                                                                    ],
                                                                                );

                                                                            return (
                                                                                <Fragment
                                                                                    key={item.id}>
                                                                                    <Tr
                                                                                        className='hover:bg-zinc-50 dark:hover:bg-zinc-700'>
                                                                                        <Td className='px-2 py-1.5 text-zinc-800 dark:text-zinc-100'>
                                                                                            <div className='font-medium'>
                                                                                                {
                                                                                                    item.snapshot_nombre
                                                                                                }
                                                                                            </div>
                                                                                            {Number(
                                                                                                item.num_visitas_mensuales ??
                                                                                                    0,
                                                                                            ) > 0 && (
                                                                                                <div className='text-[11px] text-blue-600 dark:text-blue-400'>
                                                                                                    {
                                                                                                        item.num_visitas_mensuales
                                                                                                    }{' '}
                                                                                                    visita(s)/mes
                                                                                                </div>
                                                                                            )}
                                                                                            {hasPlanBreakdown && (
                                                                                                <Button
                                                                                                    size='xs'
                                                                                                    variant='default'
                                                                                                    onClick={() =>
                                                                                                        toggleExpandedPlanItem(
                                                                                                            item.id,
                                                                                                        )
                                                                                                    }
                                                                                                    className='mt-1 !px-0 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200'>
                                                                                                    {isExpanded
                                                                                                        ? 'v Ocultar servicios incluidos'
                                                                                                        : '> Ver servicios incluidos'}
                                                                                                </Button>
                                                                                            )}
                                                                                        </Td>
                                                                                        <Td className='px-2 py-1.5 text-right font-medium text-zinc-800 dark:text-zinc-100'>
                                                                                            {formatCurrency(
                                                                                                Number(
                                                                                                    item.total_mensual ??
                                                                                                        0,
                                                                                                ),
                                                                                                item.moneda,
                                                                                            )}
                                                                                        </Td>
                                                                                    </Tr>
                                                                                    {hasPlanBreakdown &&
                                                                                        isExpanded && (
                                                                                            <Tr
                                                                                                key={`item-${item.id}-expanded`}
                                                                                                className='bg-zinc-50 dark:bg-zinc-800/60'>
                                                                                                <Td
                                                                                                    colSpan={2}
                                                                                                    className='px-3 py-2'>
                                                                                                    <PlanIncludedServicesDetail
                                                                                                        components={
                                                                                                            planComponents
                                                                                                        }
                                                                                                        title='Servicios incluidos'
                                                                                                        compact
                                                                                                    />
                                                                                                </Td>
                                                                                            </Tr>
                                                                                        )}
                                                                                </Fragment>
                                                                            );
                                                                        },
                                                                    )}
                                                                </TBody>
                                                            </Table>
                                                        </div>
                                                    </div>
                                                ) : loadingPactado ? (
                                                    <div className='py-4 text-center text-xs text-zinc-600 dark:text-zinc-400'>
                                                        Cargando...
                                                    </div>
                                                ) : (
                                                    <div className='py-4 text-center text-xs text-zinc-500 dark:text-zinc-400'>
                                                        Sin ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­tems comerciales
                                                    </div>
                                                )}

                                                {visitasContratoBase.incluidas_mes > 0 && (
                                                    <div className='mt-3'>
                                                        <h4 className='mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400'>
                                                            Visitas del contrato
                                                        </h4>
                                                        <div className='space-y-3 rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900 dark:bg-opacity-20 p-3'>
                                                            <div className='grid grid-cols-2 gap-2 text-xs'>
                                                                <div className='rounded bg-white dark:bg-zinc-800 p-2'>
                                                                    <p className='text-zinc-500 dark:text-zinc-400'>
                                                                        Incluidas este mes
                                                                    </p>
                                                                    <p className='text-lg font-bold text-zinc-900 dark:text-zinc-100'>
                                                                        {visitasContratoBase.incluidas_mes}
                                                                    </p>
                                                                </div>
                                                                <div className='rounded bg-white dark:bg-zinc-800 p-2'>
                                                                    <p className='text-zinc-500 dark:text-zinc-400'>
                                                                        Confirmadas este mes
                                                                    </p>
                                                                    <p className='text-lg font-bold text-zinc-900 dark:text-zinc-100'>
                                                                        {visitasContratoBase.confirmadas_mes}
                                                                    </p>
                                                                </div>
                                                                <div className='rounded bg-white dark:bg-zinc-800 p-2'>
                                                                    <p className='text-zinc-500 dark:text-zinc-400'>
                                                                        Marcadas en esta prefactura
                                                                    </p>
                                                                    <p className='text-lg font-bold text-zinc-900 dark:text-zinc-100'>
                                                                        {visitasPrefactura.marcadas_prefactura}
                                                                    </p>
                                                                </div>
                                                                <div className='rounded bg-white dark:bg-zinc-800 p-2'>
                                                                    <p className='text-zinc-500 dark:text-zinc-400'>
                                                                        ProyecciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n
                                                                    </p>
                                                                    <p className='text-lg font-bold text-zinc-900 dark:text-zinc-100'>
                                                                        {visitasPrefactura.proyectadas_mes}/
                                                                        {visitasContratoBase.incluidas_mes}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className='flex items-center justify-between rounded bg-white dark:bg-zinc-800 p-2 text-xs'>
                                                                <div>
                                                                    <p className='font-semibold text-zinc-800 dark:text-zinc-100'>
                                                                        Estado mensual
                                                                    </p>
                                                                    <p className='text-zinc-600 dark:text-zinc-400'>
                                                                        PerÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­odo {visitasContratoBase.periodo}
                                                                    </p>
                                                                </div>
                                                                <Badge
                                                                    variant='solid'
                                                                    color={
                                                                        visitasPrefactura.exceso_prefactura > 0
                                                                            ? 'red'
                                                                            : 'emerald'
                                                                    }>
                                                                    {visitasPrefactura.exceso_prefactura > 0
                                                                        ? `Exceso x${visitasPrefactura.exceso_prefactura}`
                                                                        : 'Dentro del plan'}
                                                                </Badge>
                                                            </div>

                                                            {visitasPrefactura.exceso_prefactura > 0 && (
                                                                <div className='rounded bg-white dark:bg-zinc-800 p-2'>
                                                                    <label className='mb-1 block text-[11px] font-semibold uppercase text-zinc-500 dark:text-zinc-400'>
                                                                        Precio visita adicional
                                                                    </label>
                                                                    <Input
                                                                        name='precio_visita_adicional'
                                                                        type='number'
                                                                        min='0'
                                                                        value={precioVisitaAdicional}
                                                                        onChange={(event) =>
                                                                            setPrecioVisitaAdicional(
                                                                                Number(event.target.value || 0),
                                                                            )
                                                                        }
                                                                        className='w-full px-2 py-1 text-sm'
                                                                    />
                                                                    <p className='mt-1 text-xs text-zinc-600 dark:text-zinc-400'>
                                                                        Total adicional:{' '}
                                                                        {formatCurrency(
                                                                            visitasPrefactura.total_exceso,
                                                                            'CLP',
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* CONDICIONES ESPECIALES */}
                                                {(contratoSeleccionado as any)
                                                    ?.contrato_condiciones_especiales &&
                                                    (contratoSeleccionado as any)
                                                        .contrato_condiciones_especiales.length >
                                                        0 && (
                                                        <div className='mt-3'>
                                                            <h4 className='mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400'>
                                                                Condiciones Especiales
                                                            </h4>
                                                            <div className='space-y-2'>
                                                                {(
                                                                    contratoSeleccionado as any
                                                                ).contrato_condiciones_especiales.map(
                                                                    (cond: any, idx: number) => (
                                                                        <div
                                                                            key={idx}
                                                                            className='rounded-md bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 px-3 py-2 text-xs text-zinc-800 dark:text-yellow-200'>
                                                                            <details className='cursor-pointer'>
                                                                                <summary className='font-medium text-yellow-900 dark:text-yellow-300'>
                                                                                    {typeof cond ===
                                                                                    'string'
                                                                                        ? cond.substring(
                                                                                              0,
                                                                                              40,
                                                                                          ) +
                                                                                          (cond.length >
                                                                                          40
                                                                                              ? '...'
                                                                                              : '')
                                                                                        : cond.titulo_condicion ||
                                                                                          cond.nombre ||
                                                                                          'CondiciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n'}
                                                                                </summary>
                                                                                <p className='mt-2 text-xs text-zinc-700 dark:text-zinc-300'>
                                                                                    {typeof cond ===
                                                                                    'string'
                                                                                        ? cond
                                                                                        : cond.descripcion_condicion ||
                                                                                          cond.descripcion ||
                                                                                          'Sin descripciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n'}
                                                                                </p>
                                                                            </details>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                {/* OBSERVACIONES */}
                                                {(contratoSeleccionado as any)?.observaciones && (
                                                    <div className='mt-3 rounded-md border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 p-3'>
                                                        <p className='mb-1 text-xs font-semibold text-blue-900 dark:text-blue-300'>
                                                            Observaciones
                                                        </p>
                                                        <p className='text-xs leading-relaxed text-blue-800 dark:text-blue-200'>
                                                            {
                                                                (contratoSeleccionado as any)
                                                                    .observaciones
                                                            }
                                                        </p>
                                                    </div>
                                                )}

                                                {contratoSeleccionado.visitas.length > 0 && (
                                                    <div className='mt-3'>
                                                        <h4 className='mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400'>
                                                            Visitas programadas
                                                        </h4>
                                                        <div className='space-y-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-2'>
                                                            {contratoSeleccionado.visitas.map((visita) => (
                                                                <div
                                                                    key={visita.id}
                                                                    className='rounded bg-white dark:bg-zinc-800 p-2 text-xs'>
                                                                    <p className='font-medium text-zinc-800 dark:text-zinc-100'>
                                                                        {visita.descripcion_visita}
                                                                    </p>
                                                                    <p className='text-zinc-600 dark:text-zinc-400'>
                                                                        {visita.frecuencia_label || visita.frecuencia} | Incluidas:{' '}
                                                                        {visita.cantidad}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* VISITAS PROGRAMADAS */}
                                                {Array.isArray(
                                                    (contratoSeleccionado as any)?.contrato_visitas,
                                                ) &&
                                                    (contratoSeleccionado as any).contrato_visitas
                                                        .length > 0 && (
                                                        <div className='mt-3'>
                                                            <h4 className='mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400'>
                                                                Visitas Programadas
                                                            </h4>
                                                            <div className='space-y-2 rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900 dark:bg-opacity-20 p-2'>
                                                                {(
                                                                    contratoSeleccionado as any
                                                                ).contrato_visitas.map(
                                                                    (visita: any, idx: number) => (
                                                                        <div
                                                                            key={idx}
                                                                            className='flex items-start justify-between rounded bg-white dark:bg-zinc-800 p-2'>
                                                                            <div>
                                                                                <p className='font-medium text-zinc-800 dark:text-zinc-100'>
                                                                                    {visita.tipo ||
                                                                                        visita.nombre ||
                                                                                        'Visita'}
                                                                                </p>
                                                                                <p className='text-xs text-zinc-600 dark:text-zinc-400'>
                                                                                    Frecuencia:{' '}
                                                                                    {visita.frecuencia ||
                                                                                        'Mensual'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                {/* USUARIOS VINCULADOS */}
                                                {Array.isArray(
                                                    (contratoSeleccionado as any)
                                                        ?.usuarios_vinculados,
                                                ) &&
                                                    (contratoSeleccionado as any)
                                                        .usuarios_vinculados.length > 0 && (
                                                        <div className='mt-3'>
                                                            <h4 className='mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400'>
                                                                Usuarios Vinculados
                                                            </h4>
                                                            <div className='overflow-x-auto rounded-md border border-zinc-300 dark:border-zinc-600'>
                                                                <Table className='w-full text-xs dark:text-zinc-100'>
                                                                    <THead className='bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300'>
                                                                        <Tr>
                                                                            <Th className='p-2 text-left font-semibold text-zinc-700 dark:text-zinc-300'>
                                                                                Usuario
                                                                            </Th>
                                                                        </Tr>
                                                                    </THead>
                                                                    <TBody className='divide-y dark:divide-zinc-700'>
                                                                        {(
                                                                            contratoSeleccionado as any
                                                                        ).usuarios_vinculados.map(
                                                                            (
                                                                                usuarioId: number,
                                                                                idx: number,
                                                                            ) => (
                                                                                <Tr
                                                                                    key={idx}
                                                                                    className='hover:bg-zinc-50 dark:hover:bg-zinc-700'>
                                                                                    <Td className='p-2 text-zinc-800 dark:text-zinc-100'>
                                                                                        Usuario #
                                                                                        {usuarioId}
                                                                                    </Td>
                                                                                </Tr>
                                                                            ),
                                                                        )}
                                                                    </TBody>
                                                                </Table>
                                                            </div>
                                                        </div>
                                                    )}
                                            </>
                                        ) : (
                                            <div className='py-6 text-center'>
                                                <p className='text-sm font-semibold text-zinc-600 dark:text-zinc-400'>
                                                    Selecciona un contrato para ver los detalles
                                                </p>
                                            </div>
                                        )}
                                    </CardBody>
                                </Card>
                            </Container>
                            {selectedOts.length > 0 && (
                                <Container className='mt-4'>
                                    <Card className='shadow-md'>
                                        <CardBody className='space-y-3'>
                                            <CardTitle>
                                                <h3 className='text-sm font-bold text-blue-600 dark:text-blue-400'>
                                                    Cotizaciones relacionadas
                                                </h3>
                                            </CardTitle>
                                            {loadingCotizaciones && (
                                                <div className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                    Cargando cotizaciones...
                                                </div>
                                            )}
                                            {cotizacionesRelacionadas.length > 0 ? (
                                                <div className='space-y-4'>
                                                    {cotizacionesRelacionadas.map((cotizacion) => {
                                                        const detalle =
                                                            cotizacionDetallesById[cotizacion.id] ??
                                                            cotizacion;
                                                        const moneda = getMonedaCotizacion(detalle);
                                                        const items =
                                                            cotizacionItemsById[cotizacion.id] ??
                                                            [];
                                                        const totalItems = items.reduce(
                                                            (acc, item) => acc + getPrecioTotal(item),
                                                            0,
                                                        );
                                                        const titulo = `Nro${detalle.numero_cotizacion ?? cotizacion.numero_cotizacion} - ${
                                                            detalle.nombre ?? cotizacion.nombre
                                                        }`;
                                                        const aprobadosItems = items.filter(
                                                            (item) => item.aprobado,
                                                        );
                                                        const totalAprobados = aprobadosItems.reduce(
                                                            (acc, item) => acc + getPrecioTotal(item),
                                                            0,
                                                        );

                                                        return (
                                                            <div
                                                                key={cotizacion.id}
                                                                className='rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800'>
                                                                <div className='flex flex-wrap items-start justify-between gap-2'>
                                                                    <div>
                                                                        <p className='text-sm font-semibold text-zinc-800 dark:text-zinc-100'>
                                                                            {titulo}
                                                                        </p>
                                                                        <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                                            Estado:{' '}
                                                                            {detalle.estado_label ??
                                                                                cotizacion.estado_label ??
                                                                                detalle.estado ??
                                                                                cotizacion.estado}
                                                                        </p>
                                                                    </div>
                                                                    <span className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                                        {items.length} items
                                                                    </span>
                                                                </div>

                                                                <div className='mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-700 dark:text-zinc-300 md:grid-cols-2'>
                                                                    <div>
                                                                        <span className='font-semibold'>
                                                                            Descripcion:
                                                                        </span>{' '}
                                                                        {formatInfoValue(
                                                                            detalle.descripcion,
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <span className='font-semibold'>
                                                                            Moneda de venta:
                                                                        </span>{' '}
                                                                        {detalle.tipo_moneda_label ??
                                                                            moneda}
                                                                    </div>
                                                                    <div>
                                                                        <span className='font-semibold'>
                                                                            Dolar observado:
                                                                        </span>{' '}
                                                                        {formatInfoValue(
                                                                            detalle.dolar_observado,
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <span className='font-semibold'>
                                                                            UF:
                                                                        </span>{' '}
                                                                        {formatInfoValue(
                                                                            detalle.valor_uf,
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <span className='font-semibold'>
                                                                            PPM:
                                                                        </span>{' '}
                                                                        {formatInfoValue(
                                                                            detalle.ppm,
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <span className='font-semibold'>
                                                                            Fecha facturacion:
                                                                        </span>{' '}
                                                                        {formatFecha(
                                                                            detalle.fecha_facturacion,
                                                                        )}
                                                                    </div>
                                                                    <div className='md:col-span-2'>
                                                                        <span className='font-semibold'>
                                                                            Observaciones:
                                                                        </span>{' '}
                                                                        {formatInfoValue(
                                                                            detalle.observaciones,
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className='mt-4 overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-700'>
                                                                    <Table className='w-full text-xs dark:text-zinc-100'>
                                                                        <THead className='bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'>
                                                                            <Tr>
                                                                                <Th className='px-3 py-2 text-left font-semibold'>
                                                                                    Nombre
                                                                                </Th>
                                                                                <Th className='px-3 py-2 text-right font-semibold'>
                                                                                    Cantidad
                                                                                </Th>
                                                                                <Th className='px-3 py-2 text-right font-semibold'>
                                                                                    Valor Unit.
                                                                                </Th>
                                                                                <Th className='px-3 py-2 text-right font-semibold'>
                                                                                    Total
                                                                                </Th>
                                                                            </Tr>
                                                                        </THead>
                                                                        <TBody className='divide-y bg-white dark:bg-zinc-800 dark:divide-zinc-700'>
                                                                            {items.length > 0 ? (
                                                                                items.map(
                                                                                    (item) => (
                                                                                        <Tr
                                                                                            key={
                                                                                                item.id
                                                                                            }
                                                                                            className={`border-l-4 ${
                                                                                                item.aprobado
                                                                                                    ? 'border-l-emerald-500 bg-white dark:bg-zinc-800 dark:text-zinc-100'
                                                                                                    : 'border-l-zinc-200 bg-zinc-50 dark:border-l-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                                                                                            }`}>
                                                                                            <Td className='px-3 py-2'>
                                                                                                <div className='font-medium'>
                                                                                                    {
                                                                                                        item.nombre_item
                                                                                                    }
                                                                                                </div>
                                                                                                {item.descripcion && (
                                                                                                    <div className='text-[11px] text-zinc-500 dark:text-zinc-400'>
                                                                                                        {
                                                                                                            item.descripcion
                                                                                                        }
                                                                                                    </div>
                                                                                                )}
                                                                                            </Td>
                                                                                            <Td className='px-3 py-2 text-right'>
                                                                                                {
                                                                                                    item.cantidad
                                                                                                }
                                                                                            </Td>
                                                                                            <Td className='px-3 py-2 text-right'>
                                                                                                {formatCurrency(
                                                                                                    getPrecioUnitario(item),
                                                                                                    moneda,
                                                                                                )}
                                                                                            </Td>
                                                                                            <Td className='px-3 py-2 text-right font-semibold text-zinc-800 dark:text-zinc-100'>
                                                                                                {formatCurrency(
                                                                                                    getPrecioTotal(item),
                                                                                                    moneda,
                                                                                                )}
                                                                                            </Td>
                                                                                        </Tr>
                                                                                    ),
                                                                                )
                                                                            ) : (
                                                                                <Tr>
                                                                                    <Td
                                                                                        colSpan={4}
                                                                                        className='px-3 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400'>
                                                                                        Sin items en
                                                                                        la
                                                                                        cotizacion
                                                                                    </Td>
                                                                                </Tr>
                                                                            )}
                                                                        </TBody>
                                                                    </Table>
                                                                </div>

                                                                <div className='mt-3 space-y-2 text-right text-xs text-zinc-600 dark:text-zinc-400'>
                                                                    {aprobadosItems.length > 0 && (
                                                                        <div>
                                                                            Total Aprobados:{' '}
                                                                            <span className='font-semibold text-emerald-600'>
                                                                                {formatCurrency(
                                                                                    totalAprobados,
                                                                                    moneda,
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {items.length !== aprobadosItems.length && (
                                                                        <div>
                                                                            Total General:{' '}
                                                                            <span className='font-semibold text-zinc-800 dark:text-zinc-100'>
                                                                                {formatCurrency(
                                                                                    totalItems,
                                                                                    moneda,
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {items.length === aprobadosItems.length && (
                                                                        <div>
                                                                            Total:{' '}
                                                                            <span className='font-semibold text-zinc-800 dark:text-zinc-100'>
                                                                                {formatCurrency(
                                                                                    totalItems,
                                                                                    moneda,
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className='py-4 text-center text-xs text-zinc-500 dark:text-zinc-400'>
                                                    Sin cotizaciones vinculadas
                                                </div>
                                            )}
                                        </CardBody>
                                    </Card>
                                </Container>
                            )}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: OTs Ejecutado + Prefactura */}
                    <div className='lg:col-span-8'>
                        <Container className='mb-5'>
                            {selectedOts.length > 0 && ejecutadoData && ejecutadoData.ejecutado ? (
                                <Card>
                                    <CardBody>
                                        <CardTitle>
                                            <h3 className='text-lg font-bold text-emerald-600'>
                                                OTs Ejecutado y Prefactura ({selectedOts.length})
                                            </h3>
                                        </CardTitle>

                                        {/* Resumen */}
                                        <div className='mb-4 grid grid-cols-4 gap-2 text-center'>
                                            <div>
                                                <p className='text-xs text-zinc-600 dark:text-zinc-400'>Trabajos</p>
                                                <p className='text-lg font-bold text-emerald-600'>
                                                    {ejecutadoData?.ejecutado?.resumen?.trabajos ||
                                                        0}
                                                </p>
                                            </div>
                                            <div>
                                                <p className='text-xs text-zinc-600 dark:text-zinc-400'>GuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­as</p>
                                                <p className='text-lg font-bold text-emerald-600'>
                                                    {ejecutadoData?.ejecutado?.resumen?.guias || 0}
                                                </p>
                                            </div>
                                            <div>
                                                <p className='text-xs text-zinc-600 dark:text-zinc-400'>Compras</p>
                                                <p className='text-lg font-bold text-emerald-600'>
                                                    {ejecutadoData?.ejecutado?.resumen?.compras ||
                                                        0}
                                                </p>
                                            </div>
                                            <div>
                                                <p className='text-xs text-zinc-600 dark:text-zinc-400'>
                                                    Gastos Operativos
                                                </p>
                                                <p className='text-lg font-bold text-emerald-600'>
                                                    {ejecutadoData?.ejecutado?.resumen
                                                        ?.gastos_operativos || 0}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Acciones de prefactura */}
                                        <div className='mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800'>
                                            <h3 className='mb-3 text-base font-semibold'>
                                                Acciones
                                            </h3>
                                            <div className='flex flex-wrap items-center gap-3'>
                                                <div className='flex flex-col gap-1'>
                                                    <label className='text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400'>
                                                        Fecha de prefactura
                                                    </label>
                                                    <Input
                                                        name='fecha_prefactura'
                                                        type='date'
                                                        className='h-9 px-2 text-sm shadow-sm'
                                                        value={fechaPrefactura}
                                                        onChange={(event) =>
                                                            setFechaPrefactura(
                                                                event.target.value,
                                                            )
                                                        }
                                                    />
                                                    {cargandoTipoCambio && (
                                                        <span className='text-xs text-zinc-400 dark:text-zinc-300'>
                                                            Cargando dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³lar/UF...
                                                        </span>
                                                    )}
                                                    {!cargandoTipoCambio &&
                                                        tipoCambioSeleccionado && (
                                                            <span className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                                DÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³lar:{' '}
                                                                {formatCurrency(
                                                                    tipoCambioSeleccionado.dolar ??
                                                                        0,
                                                                    'CLP',
                                                                )}{' '}
                                                                + $5 | UF:{' '}
                                                                {formatCurrency(
                                                                    tipoCambioSeleccionado.uf ??
                                                                        0,
                                                                    'CLP',
                                                                )}
                                                            </span>
                                                        )}
                                                    {!cargandoTipoCambio &&
                                                        !tipoCambioSeleccionado &&
                                                        errorTipoCambio && (
                                                            <span className='text-xs text-red-500'>
                                                                {errorTipoCambio}
                                                            </span>
                                                        )}
                                                </div>
                                                <Button
                                                    isDisable={
                                                        totales.countFacturables === 0 ||
                                                        creatingPrefactura
                                                    }
                                                    color={
                                                        totales.countFacturables > 0
                                                            ? 'blue'
                                                            : 'gray'
                                                    }
                                                    onClick={handleCrearPrefactura}>
                                                    Crear Prefactura ({totales.countFacturables}{' '}
                                                    items)
                                                </Button>
                                                {totales.countNoFacturables > 0 && (
                                                    <span className='text-sm text-zinc-600 dark:text-zinc-400'>
                                                        {totales.countNoFacturables} items excluidos
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tabla ejecutado con controles de prefactura */}
                                        {prefacturaPreviewItems.length > 0 ? (
                                            <div className='overflow-x-auto'>
                                                <Table className='w-full text-xs dark:text-zinc-100'>
                                                    <THead className='border-b-2 border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800'>
                                                        <Tr>
                                                            <Th className='p-2 text-left font-semibold'>
                                                                Tipo
                                                            </Th>
                                                            <Th className='p-2 text-left font-semibold'>
                                                                DescripciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n
                                                            </Th>
                                                            <Th className='p-2 text-right font-semibold'>
                                                                Cant
                                                            </Th>
                                                            <Th className='p-2 text-right font-semibold'>
                                                                P.Unit ({ejecutadoData.ejecutado.moneda})
                                                            </Th>
                                                            <Th className='p-2 text-right font-semibold'>
                                                                Total ({ejecutadoData.ejecutado.moneda})
                                                            </Th>
                                                            <Th className='border-l-2 border-zinc-300 dark:border-zinc-700 p-2 text-center font-semibold'>
                                                                Facturar
                                                            </Th>
                                                            <Th className='p-2 text-right font-semibold'>
                                                                P.Ajustado
                                                            </Th>
                                                            <Th className='p-2 text-left font-semibold'>
                                                                Comentario
                                                            </Th>
                                                        </Tr>
                                                    </THead>
                                                    <TBody>
                                                        {(() => {
                                                            // Agrupar items por OT
                                                            const itemsPorOT =
                                                                prefacturaPreviewItems.reduce(
                                                                    (
                                                                        acc: any,
                                                                        item: any,
                                                                    ) => {
                                                                        const otId =
                                                                            item.ot_id || 'sin_ot';
                                                                        if (!acc[otId])
                                                                            acc[otId] = [];
                                                                        acc[otId].push(item);
                                                                        return acc;
                                                                    },
                                                                    {},
                                                                );

                                                            let rows: any[] = [];
                                                            let isFirstOT = true;

                                                            Object.entries(itemsPorOT).forEach(
                                                                ([otId, itemsDeOT]: [
                                                                    string,
                                                                    any,
                                                                ]) => {
                                                                    // Separador de OT
                                                                    rows.push(
                                                                        <Tr
                                                                            key={`sep-ot-${otId}`}
                                                                            className={
                                                                                isFirstOT
                                                                                    ? 'bg-blue-50 dark:bg-zinc-800'
                                                                                    : 'border-t-2 border-blue-300 bg-blue-50 dark:border-zinc-600 dark:bg-zinc-800'
                                                                            }>
                                                                            <Td
                                                                               colSpan={8}
                                                                                className='p-2 font-bold text-zinc-700 dark:text-zinc-100'>
                                                                                <div className='flex items-center justify-between gap-3'>
                                                                                    <span>
                                                                                        {otId === 'sin_ot'
                                                                                            ? 'Ajustes de contrato'
                                                                                            : `OT #${otId}`}
                                                                                    </span>
                                                                                    {otId !== 'sin_ot' &&
                                                                                        visitasContratoBase.incluidas_mes > 0 && (
                                                                                        <label className='flex items-center gap-2 rounded-md bg-white/80 px-2 py-1 text-[11px] font-medium text-zinc-700 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'>
                                                                                            <Checkbox
                                                                                                id={`marcar-visita-ot-${otId}`}
                                                                                                name={`marcar-visita-ot-${otId}`}
                                                                                                checked={Boolean(
                                                                                                    visitasMarcadasPorOt[
                                                                                                        Number(otId)
                                                                                                    ],
                                                                                                )}
                                                                                                onChange={(event) =>
                                                                                                    setVisitasMarcadasPorOt(
                                                                                                        (
                                                                                                            prev,
                                                                                                        ) => ({
                                                                                                            ...prev,
                                                                                                            [Number(
                                                                                                                otId,
                                                                                                            )]:
                                                                                                                event
                                                                                                                    .target
                                                                                                                    .checked,
                                                                                                        }),
                                                                                                    )
                                                                                                }
                                                                                                className='py-0'
                                                                                                inputClassName='h-4 w-4 cursor-pointer'
                                                                                            />
                                                                                            Cuenta como visita
                                                                                        </label>
                                                                                    )}
                                                                                </div>
                                                                            </Td>
                                                                        </Tr>,
                                                                    );
                                                                    isFirstOT = false;

                                                                    // Agrupar items de esta OT por tipo y contenedor
                                                                    const grupos: {
                                                                        [
                                                                            key: string
                                                                        ]: ItemEjecutado[];
                                                                    } = {};

                                                                    itemsDeOT.forEach(
                                                                        (item: ItemEjecutado) => {
                                                                            let grupoKey = '';

                                                                            if (
                                                                                item.tipo ===
                                                                                'visita_adicional_contrato'
                                                                            ) {
                                                                                grupoKey =
                                                                                    'visitas_contrato';
                                                                            } else if (
                                                                                item.tipo ===
                                                                                'guia_salida'
                                                                            ) {
                                                                                // Agrupar por guia_id
                                                                                const guiaId =
                                                                                    (item as any)
                                                                                        .guia_id ||
                                                                                    'sin_guia';
                                                                                grupoKey = `guia_${guiaId}`;
                                                                            } else if (
                                                                                item.tipo ===
                                                                                    'servicio_ot' ||
                                                                                item.tipo ===
                                                                                    'soporte_tecnico'
                                                                            ) {
                                                                                // Agrupar todos los trabajos juntos
                                                                                grupoKey =
                                                                                    'trabajos';
                                                                            } else if (
                                                                                item.tipo ===
                                                                                'compra'
                                                                            ) {
                                                                                // Agrupar todas las compras juntas
                                                                                grupoKey =
                                                                                    'compras';
                                                                            } else if (
                                                                                item.tipo ===
                                                                                'gasto_operativo'
                                                                            ) {
                                                                                // Agrupar todos los gastos juntos
                                                                                grupoKey = 'gastos';
                                                                            } else {
                                                                                // Otros tipos
                                                                                grupoKey = `otro_${item.tipo}`;
                                                                            }

                                                                            if (!grupos[grupoKey]) {
                                                                                grupos[grupoKey] =
                                                                                    [];
                                                                            }
                                                                            grupos[grupoKey].push(
                                                                                item,
                                                                            );
                                                                        },
                                                                    );

                                                                    // Ordenar grupos: trabajos, guÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­as, compras, gastos
                                                                    const ordenGrupos = [
                                                                        'trabajos',
                                                                        'guia_',
                                                                        'compras',
                                                                        'gastos',
                                                                        'visitas_contrato',
                                                                    ];
                                                                    const gruposOrdenados =
                                                                        Object.entries(grupos).sort(
                                                                            ([a], [b]) => {
                                                                                const idxA =
                                                                                    ordenGrupos.findIndex(
                                                                                        (prefix) =>
                                                                                            a.startsWith(
                                                                                                prefix,
                                                                                            ),
                                                                                    );
                                                                                const idxB =
                                                                                    ordenGrupos.findIndex(
                                                                                        (prefix) =>
                                                                                            b.startsWith(
                                                                                                prefix,
                                                                                            ),
                                                                                    );
                                                                                if (idxA !== idxB)
                                                                                    return (
                                                                                        (idxA === -1
                                                                                            ? 999
                                                                                            : idxA) -
                                                                                        (idxB === -1
                                                                                            ? 999
                                                                                            : idxB)
                                                                                    );
                                                                                return a.localeCompare(
                                                                                    b,
                                                                                );
                                                                            },
                                                                        );

                                                                    // Renderizar cada grupo
                                                                    gruposOrdenados.forEach(
                                                                        ([
                                                                            grupoKey,
                                                                            itemsGrupo,
                                                                        ]) => {
                                                                            // Generar nombre del separador
                                                                            let nombreGrupo = '';
                                                                            const primerItem =
                                                                                itemsGrupo[0];

                                                                            if (
                                                                                grupoKey ===
                                                                                'trabajos'
                                                                            ) {
                                                                                nombreGrupo = `Trabajos - ${itemsGrupo.length} item(s)`;
                                                                            } else if (
                                                                                grupoKey ===
                                                                                'visitas_contrato'
                                                                            ) {
                                                                                nombreGrupo =
                                                                                    'Visitas de contrato';
                                                                            } else if (
                                                                                grupoKey.startsWith(
                                                                                    'guia_',
                                                                                )
                                                                            ) {
                                                                                const guiaId = (
                                                                                    primerItem as any
                                                                                ).guia_id;
                                                                                nombreGrupo = `GuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a de Salida #${guiaId} - ${itemsGrupo.length} item(s)`;
                                                                            } else if (
                                                                                grupoKey ===
                                                                                'compras'
                                                                            ) {
                                                                                nombreGrupo = `Compras - ${itemsGrupo.length} item(s)`;
                                                                            } else if (
                                                                                grupoKey ===
                                                                                'gastos'
                                                                            ) {
                                                                                nombreGrupo = `Gastos Operativos - ${itemsGrupo.length} item(s)`;
                                                                            } else {
                                                                                nombreGrupo = `${grupoKey} - ${itemsGrupo.length} item(s)`;
                                                                            }

                                                                            // Separador del grupo
                                                                            rows.push(
                                                                                <Tr
                                                                                    key={`sep-grupo-${otId}-${grupoKey}`}
                                                                                    className='bg-zinc-100 dark:bg-zinc-800'>
                                                                                    <Td
                                                                                        colSpan={8}
                                                                                        className='p-1.5 pl-6 text-xs font-semibold text-zinc-600 dark:text-zinc-400'>
                                                                                        {
                                                                                            nombreGrupo
                                                                                        }
                                                                                    </Td>
                                                                                </Tr>,
                                                                            );

                                                                            // Items del grupo
                                                                            itemsGrupo.forEach(
                                                                                (
                                                                                    item: ItemEjecutado,
                                                                                ) => {
                                                                                    const itemId = `${item.tipo}_${item.id}`;
                                                                                    const config =
                                                                                        itemsConfig.get(
                                                                                            itemId,
                                                                                        );
                                                                                    const isSyntheticVisit =
                                                                                        item.tipo ===
                                                                                        'visita_adicional_contrato';
                                                                                    const tipoBadge =
                                                                                        getTipoBadge(
                                                                                            item.tipo,
                                                                                        );
                                                                                    const computedValues =
                                                                                        isSyntheticVisit
                                                                                            ? {
                                                                                                  unit: precioVisitaAdicional,
                                                                                                  total: visitasPrefactura.total_exceso,
                                                                                              }
                                                                                            : computeItemValues(
                                                                                                  item as any,
                                                                                                  'CLP',
                                                                                              );
                                                                                    rows.push(
                                                                                        <Tr
                                                                                            key={`${item.tipo}_${item.id}_${item.ot_id || 'no_ot'}`}
                                                                                            className='border-b hover:bg-zinc-50 dark:hover:bg-zinc-700'>
                                                                                            <Td className='p-2 pl-8'>
                                                                                                <Badge
                                                                                                    variant={
                                                                                                        tipoBadge.variant
                                                                                                    }
                                                                                                    color={
                                                                                                        tipoBadge.color
                                                                                                    }
                                                                                                    className='text-xs'>
                                                                                                    {
                                                                                                        tipoBadge.label
                                                                                                    }
                                                                                                </Badge>
                                                                                            </Td>
                                                                                            <Td className='p-2 text-zinc-800 dark:text-zinc-100'>
                                                                                                <div className='font-medium'>
                                                                                                    {item.nombre ||
                                                                                                        (item as any)
                                                                                                            .descripcion ||
                                                                                                        'Sin nombre'}
                                                                                                </div>
                                                                                            </Td>
                                                                                            <Td className='p-2 text-right'>
                                                                                                {
                                                                                                    item.cantidad
                                                                                                }
                                                                                            </Td>
                                                                                            <Td className='p-2 text-right'>
                                                                                                {formatCurrency(
                                                                                                    computedValues.unit,
                                                                                                    'CLP',
                                                                                                )}
                                                                                            </Td>
                                                                                            <Td className='p-2 text-right font-semibold text-emerald-600'>
                                                                                                {formatCurrency(
                                                                                                    computedValues.total,
                                                                                                    'CLP',
                                                                                                )}
                                                                                            </Td>
                                                                                            <Td className='border-l-2 border-zinc-300 dark:border-zinc-700 p-2 text-center'>
                                                                                                {isSyntheticVisit ? (
                                                                                                    <Badge
                                                                                                        variant='solid'
                                                                                                        color='red'
                                                                                                        className='text-[10px]'>
                                                                                                        Exceso
                                                                                                    </Badge>
                                                                                                ) : (
                                                                                                    <Checkbox
                                                                                                        id={`facturar-${itemId}`}
                                                                                                        name={`facturar-${itemId}`}
                                                                                                        checked={
                                                                                                            config?.facturar ??
                                                                                                            true
                                                                                                        }
                                                                                                        onChange={(
                                                                                                            e,
                                                                                                        ) =>
                                                                                                            updateItemConfig(
                                                                                                                itemId,
                                                                                                                {
                                                                                                                    facturar:
                                                                                                                        e
                                                                                                                            .target
                                                                                                                    .checked,
                                                                                                                },
                                                                                                            )
                                                                                                        }
                                                                                                        className='py-0'
                                                                                                        inputClassName='h-4 w-4 cursor-pointer'
                                                                                                    />
                                                                                                )}
                                                                                            </Td>
                                                                                            <Td className='p-2'>
                                                                                                {isSyntheticVisit ? (
                                                                                                    <div className='text-right font-semibold text-red-600 dark:text-red-400'>
                                                                                                        {formatCurrency(
                                                                                                            visitasPrefactura.total_exceso,
                                                                                                            'CLP',
                                                                                                        )}
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <Input
                                                                                                        name={`precio-${itemId}`}
                                                                                                        type='number'
                                                                                                        placeholder='$'
                                                                                                        value={
                                                                                                            config?.precioAsignado ??
                                                                                                            ''
                                                                                                        }
                                                                                                        onChange={(
                                                                                                            e,
                                                                                                        ) =>
                                                                                                            updateItemConfig(
                                                                                                                itemId,
                                                                                                                {
                                                                                                                    precioAsignado:
                                                                                                                        e
                                                                                                                            .target
                                                                                                                            .value
                                                                                                                            ? Number(
                                                                                                                                  e
                                                                                                                                      .target
                                                                                                                                      .value,
                                                                                                                              )
                                                                                                                            : null,
                                                                                                                },
                                                                                                            )
                                                                                                        }
                                                                                                        className='w-20 px-2 py-1 text-right text-xs'
                                                                                                    />
                                                                                                )}
                                                                                            </Td>
                                                                                            <Td className='p-2'>
                                                                                                {isSyntheticVisit ? (
                                                                                                    <span className='text-xs text-zinc-600 dark:text-zinc-400'>
                                                                                                        Cobro por exceso de visitas del contrato.
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    <Input
                                                                                                        name={`comentario-${itemId}`}
                                                                                                        type='text'
                                                                                                        placeholder='Comentario...'
                                                                                                        value={
                                                                                                            config?.comentario ??
                                                                                                            ''
                                                                                                        }
                                                                                                        onChange={(
                                                                                                            e,
                                                                                                        ) =>
                                                                                                            updateItemConfig(
                                                                                                                itemId,
                                                                                                                {
                                                                                                                    comentario:
                                                                                                                        e
                                                                                                                            .target
                                                                                                                            .value,
                                                                                                                },
                                                                                                            )
                                                                                                        }
                                                                                                        className='w-full px-2 py-1 text-xs'
                                                                                                    />
                                                                                                )}
                                                                                            </Td>
                                                                                        </Tr>,
                                                                                    );
                                                                                },
                                                                            );
                                                                        },
                                                                    );
                                                                },
                                                            );

                                                            return rows;
                                                        })()}
                                                    </TBody>
                                                </Table>

                                                {/* Totales de prefactura */}
                                                <div className='mt-4 grid grid-cols-4 gap-3'>
                                                    <div className='rounded-lg bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 p-3 text-center'>
                                                        <p className='text-xs text-zinc-600 dark:text-zinc-400'>
                                                            Items
                                                        </p>
                                                        <p className='text-lg font-bold dark:text-zinc-100'>
                                                            {totales.totalItems}
                                                        </p>
                                                    </div>
                                                    <div className='rounded-lg bg-emerald-50 dark:bg-emerald-900 dark:bg-opacity-30 p-3 text-center'>
                                                        <p className='text-xs text-zinc-600 dark:text-zinc-400'>
                                                            A Facturar
                                                        </p>
                                                        <p className='text-lg font-bold text-emerald-600 dark:text-emerald-400'>
                                                            {totales.countFacturables}
                                                        </p>
                                                    </div>
                                                    <div className='rounded-lg bg-red-50 dark:bg-red-900 dark:bg-opacity-30 p-3 text-center'>
                                                        <p className='text-xs text-zinc-600 dark:text-zinc-400'>
                                                            No Facturar
                                                        </p>
                                                        <p className='text-lg font-bold text-red-600 dark:text-red-400'>
                                                            {totales.countNoFacturables}
                                                        </p>
                                                    </div>
                                                    <div className='rounded-lg bg-violet-50 dark:bg-violet-900 dark:bg-opacity-30 p-3 text-center'>
                                                        <p className='text-xs text-zinc-600 dark:text-zinc-400'>
                                                            Total
                                                        </p>
                                                        <p className='text-lg font-bold text-violet-600 dark:text-violet-400'>
                                                            {formatCurrency(
                                                                totales.totalFacturable,
                                                                'CLP',
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className='mt-4 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-4 text-center'>
                                                <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                                                    No hay servicios registrados
                                                </p>
                                            </div>
                                        )}
                                    </CardBody>
                                </Card>
                            ) : (
                                <Card>
                                    <CardBody>
                                        <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                                            Selecciona OTs para ver el ejecutado.
                                        </p>
                                    </CardBody>
                                </Card>
                            )}
                        </Container>
                    </div>
                </div>
            )}

            {/* RESUMEN COMPARATIVO */}
            {comparativaData && (
                <Container className='mb-5'>
                    <Card>
                        <CardBody>
                            <CardTitle>
                                <h3 className='text-lg font-bold'>Resumen Comparativo</h3>
                            </CardTitle>
                            <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-3'>
                                <div className='rounded-lg bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 p-4 text-center'>
                                    <p className='text-sm text-zinc-600 dark:text-zinc-400'>Total Pactado</p>
                                    <p className='text-3xl font-bold text-blue-600 dark:text-blue-400'>
                                        $
                                        {totalPactadoComparativa.toLocaleString('es-CL')}
                                    </p>
                                </div>
                                <div className='rounded-lg bg-emerald-50 dark:bg-emerald-900 dark:bg-opacity-30 p-4 text-center'>
                                    <p className='text-sm text-zinc-600 dark:text-zinc-400'>Total Ejecutado</p>
                                    <p className='text-3xl font-bold text-emerald-600 dark:text-emerald-400'>
                                        $
                                        {totalEjecutadoComparativa.toLocaleString('es-CL')}
                                    </p>
                                </div>
                                <div
                                    className={`rounded-lg p-4 text-center ${
                                        diferenciaComparativaPositiva
                                            ? 'bg-emerald-50 dark:bg-emerald-900 dark:bg-opacity-30'
                                            : 'bg-red-50 dark:bg-red-900 dark:bg-opacity-30'
                                    }`}>
                                    <p className='text-sm text-zinc-600 dark:text-zinc-400'>Diferencia</p>
                                    <p
                                        className={`text-3xl font-bold ${
                                            diferenciaComparativaPositiva
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-red-600 dark:text-red-400'
                                        }`}>
                                        $
                                        {Math.abs(diferenciaComparativa).toLocaleString('es-CL')}
                                    </p>
                                    <p className='mt-2 text-xs text-zinc-500 dark:text-zinc-400'>
                                        {diferenciaComparativaPositiva ? '+ Sobra' : '- Falta'}
                                    </p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Container>
            )}

            {/* BOTÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“N LIMPIAR - solo si hay selecciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n */}
            {(selectedEmpresaClienteId || selectedContratoId || selectedOts.length > 0) && (
                <Container className='mb-4 flex justify-end gap-4'>
                    <Button variant='outline' color='gray' onClick={handleLimpiar}>
                        Limpiar SelecciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n
                    </Button>
                </Container>
            )}
        </PageWrapper>
    );
};

export default FacturacionesComparativa;
