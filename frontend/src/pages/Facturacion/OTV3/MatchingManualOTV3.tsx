import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import type { IContratoMatching } from '@/interface/contrato.interface';
import type { IRelacionEmpresa } from '@/interface/empresas.interface';
import type {
    ICotizacionComparativaV3,
    IComparativaV3Params,
    IComparativaV3Result,
    IItemEjecutadoV3,
    IItemFacturableV3,
    IItemPrefacturaV3,
    IOrdenDeTrabajoV3,
    IResultadoPrefacturaV3,
    TMonedaPrefacturaOTV3,
    ITipoCambioResponse,
    IVisitasContratoResumenV3,
    IVisitasPrefacturaV3,
} from '@/interface/ordenTrabajoV3.interface';
import ApiService from '@/services/ApiService';
import { useAppSelector } from '@/store/hook';
import { useGetContratosActivosClienteQuery } from '@/store/slices/contratos/contratoApi';
import { useGetMisClientesQuery } from '@/store/slices/empresa/empresaApi';
import {
    useCreatePrefacturaOTV3Mutation,
    useGetComparativaV3Mutation,
    useGetOtsElegiblesV3Query,
} from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    buildPrefacturaOTDetailPath,
    parsePrefacturacionSearchParams,
} from '../prefacturacion.shared';

// ── Helpers locales ──────────────────────────────────────────────────

const tipoBadge = (tipo: string): { color: string; label: string } => {
    const map: Record<string, { color: string; label: string }> = {
        tarea_ot: { color: 'blue', label: 'Tarea' },
        cotizacion: { color: 'violet', label: 'Cotizacion' },
        guia_salida: { color: 'emerald', label: 'Material' },
        compra: { color: 'amber', label: 'Compra' },
        gasto_operativo: { color: 'red', label: 'Gasto' },
        visita_adicional_contrato: { color: 'red', label: 'Visita Extra' },
    };
    return map[tipo] ?? { color: 'zinc', label: tipo };
};

type TContratoCardVM = {
    id: number;
    nombre: string;
    estadoLabel: string;
    moneda: string;
    diaFacturacion: number | null;
};

type TCotizacionCardVM = {
    id: number;
    numeroCotizacion: number | null;
    nombre: string;
    estadoLabel: string;
    totalAsociado: number;
    cantidadItems: number;
};

type TOrdenCompraCardVM = {
    id: number;
    totalAsociado: number;
    cantidadItems: number;
};

const toPositiveIntOrNull = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const normalized = Math.trunc(parsed);
    return normalized > 0 ? normalized : null;
};

const monedaPrefacturaOptions: TSelectOption[] = [
    { value: 'CLP', label: 'CLP' },
    { value: 'USD', label: 'USD' },
    { value: 'UF', label: 'UF' },
];

// ── Componente principal ─────────────────────────────────────────────

const MatchingManualOTV3 = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const routeState = parsePrefacturacionSearchParams(searchParams, 'ot');
    const otPreseleccionadaRaw =
        searchParams.get('ot_preseleccionada') ?? searchParams.get('ot_id');

    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const empresaId = personalizacionUsuario?.empresa ?? undefined;

    // ── Estado del wizard ────────────────────────────────────────────
    const [clienteId, setClienteId] = useState<number | null>(
        searchParams.get('cliente_id') ? Number(searchParams.get('cliente_id')) : null,
    );
    const [otIdsSeleccionadas, setOtIdsSeleccionadas] = useState<number[]>(() => {
        if (!otPreseleccionadaRaw) return [];
        const otId = Number(otPreseleccionadaRaw);
        return Number.isFinite(otId) ? [otId] : [];
    });
    const [contratoIds, setContratoIds] = useState<number[]>([]);
    const [comentario, setComentario] = useState('');
    const [fechaPrefactura, setFechaPrefactura] = useState(dayjs().format('YYYY-MM-DD'));
    const [monedaPrefactura, setMonedaPrefactura] = useState<TMonedaPrefacturaOTV3>('CLP');

    // Comparativa
    const [comparativa, setComparativa] = useState<IComparativaV3Result | null>(null);
    const [comparativaCargada, setComparativaCargada] = useState(false);

    // Matching manual por item
    const [itemsConfig, setItemsConfig] = useState<Map<string, IItemPrefacturaV3>>(new Map());

    // Visitas
    const [visitasMarcadasPorOt, setVisitasMarcadasPorOt] = useState<Record<number, boolean>>({});
    const [precioVisitaAdicional, setPrecioVisitaAdicional] = useState<number>(0);

    // Tipo de cambio
    const [tipoCambio, setTipoCambio] = useState<{ dolar: number | null; uf: number | null } | null>(null);
    const [cargandoTipoCambio, setCargandoTipoCambio] = useState(false);

    // ── Queries ──────────────────────────────────────────────────────
    const { data: clientes = [], isLoading: cargandoClientes } = useGetMisClientesQuery(empresaId, {
        skip: !empresaId,
    });

    const { data: otsElegibles = [], isFetching: cargandoOts } = useGetOtsElegiblesV3Query(
        { cliente_id: clienteId! },
        { skip: !clienteId },
    );

    const { data: contratosActivosCliente = [] } = useGetContratosActivosClienteQuery(
        clienteId ?? 0,
        { skip: !clienteId },
    );

    const [getComparativa, { isLoading: cargandoComparativa }] = useGetComparativaV3Mutation();
    const [crearPrefactura, { isLoading: creando }] = useCreatePrefacturaOTV3Mutation();

    // ── Efectos de reset ─────────────────────────────────────────────
    useEffect(() => {
        if (!otPreseleccionadaRaw) {
            setOtIdsSeleccionadas([]);
        }
        setContratoIds([]);
        setComparativa(null);
        setComparativaCargada(false);
        setItemsConfig(new Map());
        setVisitasMarcadasPorOt({});
    }, [clienteId, otPreseleccionadaRaw]);

    useEffect(() => {
        setComparativa(null);
        setComparativaCargada(false);
        setPrecioVisitaAdicional(0);
    }, [otIdsSeleccionadas, contratoIds, fechaPrefactura, monedaPrefactura]);

    // ── Tipo de cambio ───────────────────────────────────────────────
    useEffect(() => {
        if (!fechaPrefactura) {
            setTipoCambio(null);
            return;
        }
        let active = true;
        setCargandoTipoCambio(true);
        ApiService.fetchData<ITipoCambioResponse>({
            url: `/api/cotizaciones/tipo-cambio/?fecha=${fechaPrefactura}`,
            method: 'get',
        })
            .then((response) => {
                if (!active) return;
                setTipoCambio({ dolar: response.data.dolar, uf: response.data.uf });
            })
            .catch(() => {
                if (!active) return;
                setTipoCambio(null);
            })
            .finally(() => {
                if (!active) return;
                setCargandoTipoCambio(false);
            });
        return () => {
            active = false;
        };
    }, [fechaPrefactura]);

    // ── Opciones de selects ──────────────────────────────────────────
    const clienteOptions = useMemo<TSelectOption[]>(
        () =>
            clientes.map((rel: IRelacionEmpresa) => ({
                value: String(rel.cliente),
                label: rel.info_cliente?.nombre ?? `Cliente #${rel.cliente}`,
            })),
        [clientes],
    );

    const otOptions = useMemo<TSelectOption[]>(
        () =>
            otsElegibles.map((ot: IOrdenDeTrabajoV3) => ({
                value: String(ot.id),
                label: `#${ot.id} - ${ot.titulo}`,
            })),
        [otsElegibles],
    );

    const otSeleccionadasData = useMemo(
        () => otsElegibles.filter((ot: IOrdenDeTrabajoV3) => otIdsSeleccionadas.includes(ot.id)),
        [otsElegibles, otIdsSeleccionadas],
    );

    const contratoOptions = useMemo<TSelectOption[]>(() => {
        return contratosActivosCliente.map((c) => ({
            value: String(c.id),
            label: c.nombre || `Contrato #${c.id}`,
        }));
    }, [contratosActivosCliente]);

    // ── Visitas ──────────────────────────────────────────────────────
    const visitasContratoBase = useMemo<IVisitasContratoResumenV3>(() => {
        const periodo = dayjs(fechaPrefactura).format('YYYY-MM');
        const vc = comparativa?.visitas_contrato;
        return {
            periodo: (vc?.periodo as string) ?? periodo,
            incluidas_mes: Number(vc?.incluidas_mes ?? vc?.incluidas_total ?? 0),
            confirmadas_mes: Number(vc?.confirmadas_mes ?? 0),
        };
    }, [comparativa?.visitas_contrato, fechaPrefactura]);

    const otsMarcadasVisita = useMemo(
        () => otIdsSeleccionadas.filter((otId) => Boolean(visitasMarcadasPorOt[otId])),
        [otIdsSeleccionadas, visitasMarcadasPorOt],
    );

    const visitasPrefactura = useMemo<IVisitasPrefacturaV3>(() => {
        const proyectadasMes = visitasContratoBase.confirmadas_mes + otsMarcadasVisita.length;
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
        if (contratoIds.length === 0 || visitasPrefactura.exceso_prefactura <= 0) return null;
        return {
            tipo: 'visita_adicional_contrato',
            id: `visita-extra-${visitasPrefactura.periodo}`,
            nombre: `Visita adicional contrato - ${visitasPrefactura.periodo}`,
            cantidad: visitasPrefactura.exceso_prefactura,
            precio_unitario: precioVisitaAdicional,
            total: visitasPrefactura.total_exceso,
            moneda: monedaPrefactura,
        } as IItemEjecutadoV3;
    }, [contratoIds.length, monedaPrefactura, precioVisitaAdicional, visitasPrefactura]);

    // ── Items combinados para render ─────────────────────────────────
    const allItems = useMemo(
        () => [
            ...(comparativa?.ejecutado?.items ?? []),
            ...(syntheticVisitaItem ? [syntheticVisitaItem] : []),
        ],
        [comparativa?.ejecutado?.items, syntheticVisitaItem],
    );

    const monedaRender = comparativa?.meta_monedas?.moneda_objetivo ?? monedaPrefactura;

    const contractCardsVM = useMemo<TContratoCardVM[]>(() => {
        if (!contratoIds.length) return [];
        const contratosMap = new Map<number, IContratoMatching>(
            contratosActivosCliente.map((contrato) => [contrato.id, contrato]),
        );
        return contratoIds
            .map((id) => {
                const contrato = contratosMap.get(id);
                if (!contrato) return null;
                return {
                    id: contrato.id,
                    nombre: contrato.nombre || `Contrato #${contrato.id}`,
                    estadoLabel: contrato.estado_label || contrato.estado,
                    moneda: contrato.moneda_cobro,
                    diaFacturacion: contrato.dia_facturacion ?? null,
                };
            })
            .filter((item): item is TContratoCardVM => item !== null);
    }, [contratoIds, contratosActivosCliente]);

    const cotizacionCardsVM = useMemo<TCotizacionCardVM[]>(() => {
        if (!comparativaCargada) return [];

        const cotizacionesMeta = new Map<number, ICotizacionComparativaV3>();
        (comparativa?.ejecutado?.cotizaciones ?? []).forEach((cotizacion) => {
            const cotizacionId = toPositiveIntOrNull(cotizacion?.id);
            if (!cotizacionId) return;
            cotizacionesMeta.set(cotizacionId, cotizacion);
        });

        const agregados = new Map<number, { total: number; keys: Set<string> }>();
        allItems.forEach((item) => {
            const cotizacionId = toPositiveIntOrNull(item.cotizacion_id);
            if (!cotizacionId) return;
            const key = `${item.tipo}_${item.id}_${item.ot_id ?? 'sin_ot'}`;
            const actual = agregados.get(cotizacionId) ?? { total: 0, keys: new Set<string>() };
            if (!actual.keys.has(key)) {
                actual.keys.add(key);
                actual.total += Number(item.total || 0);
            }
            agregados.set(cotizacionId, actual);
        });

        return Array.from(agregados.entries())
            .map(([cotizacionId, agregado]) => {
                const meta = cotizacionesMeta.get(cotizacionId);
                return {
                    id: cotizacionId,
                    numeroCotizacion: meta?.numero_cotizacion ?? null,
                    nombre: meta?.nombre ?? `Cotizacion #${cotizacionId}`,
                    estadoLabel: meta?.estado_label ?? meta?.estado ?? 'Sin estado',
                    totalAsociado: agregado.total,
                    cantidadItems: agregado.keys.size,
                };
            })
            .filter((item) => item.cantidadItems > 0)
            .sort((a, b) => b.totalAsociado - a.totalAsociado);
    }, [allItems, comparativa?.ejecutado?.cotizaciones, comparativaCargada]);

    const ordenCompraCardsVM = useMemo<TOrdenCompraCardVM[]>(() => {
        if (!comparativaCargada) return [];
        const agregados = new Map<number, { total: number; keys: Set<string> }>();
        allItems.forEach((item) => {
            const ordenCompraId = toPositiveIntOrNull(item.oc_id ?? item.compra_id);
            if (!ordenCompraId) return;
            const key = `${item.tipo}_${item.id}_${item.ot_id ?? 'sin_ot'}`;
            const actual = agregados.get(ordenCompraId) ?? { total: 0, keys: new Set<string>() };
            if (!actual.keys.has(key)) {
                actual.keys.add(key);
                actual.total += Number(item.total || 0);
            }
            agregados.set(ordenCompraId, actual);
        });

        return Array.from(agregados.entries())
            .map(([id, agregado]) => ({
                id,
                totalAsociado: agregado.total,
                cantidadItems: agregado.keys.size,
            }))
            .filter((item) => item.cantidadItems > 0)
            .sort((a, b) => b.totalAsociado - a.totalAsociado);
    }, [allItems, comparativaCargada]);

    const visitasPorContrato = useMemo(() => {
        const visitasRaw = comparativa?.visitas_contrato;
        const porContratoRaw = Array.isArray(visitasRaw?.por_contrato)
            ? visitasRaw.por_contrato
            : [];
        const resumen = new Map<number, { incluidasMes: number; confirmadasMes: number }>();

        porContratoRaw.forEach((item: any) => {
            const contratoId = toPositiveIntOrNull(item?.contrato_id);
            if (!contratoId) return;
            resumen.set(contratoId, {
                incluidasMes: Number(item?.incluidas_mes ?? 0),
                confirmadasMes: Number(item?.confirmadas_mes ?? 0),
            });
        });
        return resumen;
    }, [comparativa?.visitas_contrato]);

    const hasVisualCards = useMemo(
        () =>
            contractCardsVM.length > 0 ||
            cotizacionCardsVM.length > 0 ||
            ordenCompraCardsVM.length > 0,
        [contractCardsVM.length, cotizacionCardsVM.length, ordenCompraCardsVM.length],
    );

    // ── Totales ──────────────────────────────────────────────────────
    const totales = useMemo(() => {
        let totalFacturar = 0;
        let totalExcluido = 0;
        allItems.forEach((item) => {
            const key = `${item.tipo}_${item.id}`;
            const config = itemsConfig.get(key);
            const facturar = config?.facturar ?? true;
            const precio =
                config?.precioAsignado != null
                    ? config.precioAsignado * (item.cantidad || 1)
                    : item.total;
            if (facturar) {
                totalFacturar += precio;
            } else {
                totalExcluido += precio;
            }
        });
        return { totalFacturar, totalExcluido };
    }, [allItems, itemsConfig]);

    // ── Helpers ──────────────────────────────────────────────────────
    const updateItemConfig = (itemId: string, updates: Partial<IItemPrefacturaV3>) => {
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

    // ── Cargar comparativa ───────────────────────────────────────────
    const handleCargarComparativa = async () => {
        if (otIdsSeleccionadas.length === 0) {
            toast.warn('Selecciona al menos una OT');
            return;
        }
        try {
            const params: IComparativaV3Params = {
                ot_ids: otIdsSeleccionadas,
                contrato_ids: contratoIds.length > 0 ? contratoIds : undefined,
                fecha_prefactura: fechaPrefactura || undefined,
                moneda_objetivo: monedaPrefactura,
                dolar: tipoCambio?.dolar ?? undefined,
                uf: tipoCambio?.uf ?? undefined,
            };
            const resultado = await getComparativa(params).unwrap();
            setComparativa(resultado);
            setComparativaCargada(true);

            // Inicializar itemsConfig
            if (resultado.ejecutado?.items) {
                const newConfig = new Map<string, IItemPrefacturaV3>();
                resultado.ejecutado.items.forEach((item: IItemEjecutadoV3) => {
                    const key = `${item.tipo}_${item.id}`;
                    newConfig.set(key, {
                        itemId: key,
                        facturar: true,
                        comentario: '',
                        precioAsignado: item.precio_unitario > 0 ? item.precio_unitario : null,
                    });
                });
                setItemsConfig(newConfig);
            }

            // Inicializar visitas marcadas
            if (resultado.ots_marcadas_visitas?.length > 0) {
                const marcadas: Record<number, boolean> = {};
                resultado.ots_marcadas_visitas.forEach((id) => {
                    marcadas[id] = true;
                });
                setVisitasMarcadasPorOt(marcadas);
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    // ── Crear prefactura ─────────────────────────────────────────────
    const handleCrear = async () => {
        if (otIdsSeleccionadas.length === 0) {
            toast.warn('Selecciona al menos una OT');
            return;
        }

        if (visitasPrefactura.exceso_prefactura > 0 && precioVisitaAdicional <= 0) {
            toast.warn('Debes indicar un precio mayor a 0 para las visitas adicionales.');
            return;
        }

        try {
            // Construir items facturables
            const itemsFacturables: IItemFacturableV3[] = allItems.map((item) => {
                const key = `${item.tipo}_${item.id}`;
                const config = itemsConfig.get(key);
                const isSynthetic = item.tipo === 'visita_adicional_contrato';
                return {
                    tipo: item.tipo,
                    id: item.id,
                    descripcion: String((item as any).descripcion || item.nombre || ''),
                    ot_id: item.ot_id,
                    cantidad: item.cantidad || 1,
                    precio_total: Number(item.precio_unitario || 0) * (item.cantidad || 1),
                    moneda: (item.moneda as TMonedaPrefacturaOTV3) ?? monedaPrefactura,
                    precio_ajustado: config?.precioAsignado ?? null,
                    facturar: isSynthetic ? true : (config?.facturar ?? true),
                    comentario: isSynthetic
                        ? 'Cobro adicional por exceso de visitas contractuales.'
                        : (config?.comentario || ''),
                    categoria_id: (item as any).categoria_id ?? null,
                    categoria_nombre: (item as any).categoria_nombre ?? null,
                    fecha_gasto: (item as any).fecha_gasto ?? null,
                    dolar_observado: (item as any).dolar_observado ?? null,
                    parent_id: item.guia_id ?? item.compra_id ?? item.rendicion_id ?? null,
                    item_id: item.item_id ?? item.id,
                    guia_id: item.guia_id ?? null,
                    compra_id: item.compra_id ?? null,
                    rendicion_id: item.rendicion_id ?? null,
                    item_rendicion_id: item.item_rendicion_id ?? null,
                    content_type: item.content_type ?? null,
                };
            });

            if (itemsFacturables.filter((i) => i.facturar).length === 0) {
                toast.warn('No hay items marcados para facturar');
                return;
            }

            const resultado: IResultadoPrefacturaV3 = {
                cliente_id: clienteId,
                contrato_ids: contratoIds.length > 0 ? contratoIds : null,
                ots_incluidas: otIdsSeleccionadas,
                items: itemsFacturables,
                resumen: {
                    total_items: itemsFacturables.length,
                    total_facturar: totales.totalFacturar,
                    total_excluidos: totales.totalExcluido,
                },
                meta_monedas: comparativa?.meta_monedas ?? {
                    moneda_objetivo: monedaPrefactura,
                    precision_aplicada: monedaPrefactura === 'CLP' ? 0 : monedaPrefactura === 'USD' ? 1 : 4,
                    tipo_cambio_aplicado: {
                        dolar: tipoCambio?.dolar ?? null,
                        uf: tipoCambio?.uf ?? null,
                        fecha: fechaPrefactura || null,
                    },
                },
                visitas: visitasPrefactura,
            };

            const pref = await crearPrefactura({
                ot_ids: otIdsSeleccionadas,
                contrato_ids: contratoIds.length > 0 ? contratoIds : undefined,
                comentario: comentario || undefined,
                moneda_prefactura: monedaPrefactura,
                resultado,
                fecha_prefactura: fechaPrefactura || undefined,
            }).unwrap();

            toast.success('Prefactura creada');
            navigate(buildPrefacturaOTDetailPath(pref.id, routeState));
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const puedeCrear = otIdsSeleccionadas.length > 0 && comparativaCargada;

    // ── Render ───────────────────────────────────────────────────────
    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <Button icon='HeroArrowLeft' onClick={() => navigate(-1)}>
                        Volver
                    </Button>
                    <h1 className='ml-2 text-lg font-bold text-gray-800 dark:text-gray-100'>
                        Matching Manual - Prefactura OT V3
                    </h1>
                </SubheaderLeft>
                <SubheaderRight>
                    <Button
                        variant='solid'
                        color='blue'
                        icon='HeroDocumentText'
                        isLoading={creando}
                        isDisable={!puedeCrear}
                        onClick={handleCrear}>
                        Crear prefactura
                    </Button>
                </SubheaderRight>
            </Subheader>

            <Container>
                <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                    {/* ── 1. Cliente ──────────────────────────────── */}
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>1. Seleccionar cliente</CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <Label htmlFor='cliente'>Cliente</Label>
                            <SelectReact
                                id='cliente'
                                name='cliente'
                                options={clienteOptions}
                                isLoading={cargandoClientes}
                                placeholder='Selecciona un cliente...'
                                value={
                                    clienteId
                                        ? clienteOptions.find((o) => o.value === String(clienteId))
                                        : null
                                }
                                onChange={(opt) =>
                                    setClienteId(opt ? Number((opt as TSelectOption).value) : null)
                                }
                            />
                        </CardBody>
                    </Card>

                    {/* ── 2. OTs elegibles ────────────────────────── */}
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>2. Seleccionar OTs</CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            {!clienteId ? (
                                <p className='text-sm text-gray-400'>
                                    Selecciona primero un cliente.
                                </p>
                            ) : (
                                <>
                                    <Label htmlFor='ots'>OTs por facturar</Label>
                                    <SelectReact
                                        id='ots'
                                        name='ots'
                                        options={otOptions}
                                        isMulti
                                        isLoading={cargandoOts}
                                        placeholder='Selecciona OTs...'
                                        value={otOptions.filter((o) =>
                                            otIdsSeleccionadas.includes(Number(o.value)),
                                        )}
                                        onChange={(opts) =>
                                            setOtIdsSeleccionadas(
                                                (opts as TSelectOption[]).map((o) => Number(o.value)),
                                            )
                                        }
                                    />
                                    {otOptions.length === 0 && !cargandoOts && (
                                        <p className='mt-2 text-xs text-gray-400'>
                                            No hay OTs elegibles para este cliente.
                                        </p>
                                    )}
                                </>
                            )}
                        </CardBody>
                    </Card>

                    {/* ── 3. Contratos (opcional) ─────────────────── */}
                    {clienteId && contratoOptions.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>3. Contratos (opcional)</CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <Label htmlFor='contratos'>Contratos activos del cliente</Label>
                                <SelectReact
                                    id='contratos'
                                    name='contratos'
                                    options={contratoOptions}
                                    isMulti
                                    placeholder='Selecciona contratos...'
                                    value={contratoOptions.filter((o) =>
                                        contratoIds.includes(Number(o.value)),
                                    )}
                                    onChange={(opts) =>
                                        setContratoIds(
                                            (opts as TSelectOption[]).map((o) => Number(o.value)),
                                        )
                                    }
                                />
                            </CardBody>
                        </Card>
                    )}

                    {/* ── 4. Fecha y Tipo de Cambio ──────────────── */}
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>Fecha prefactura y tipo de cambio</CardHeaderChild>
                        </CardHeader>
                        <CardBody className='space-y-3'>
                            <div>
                                <Label htmlFor='fechaPrefactura'>Fecha prefactura</Label>
                                <Input
                                    id='fechaPrefactura'
                                    name='fechaPrefactura'
                                    type='date'
                                    value={fechaPrefactura}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setFechaPrefactura(e.target.value)
                                    }
                                />
                            </div>
                            <div>
                                <Label htmlFor='monedaPrefactura'>Moneda de prefactura</Label>
                                <SelectReact
                                    id='monedaPrefactura'
                                    name='monedaPrefactura'
                                    options={monedaPrefacturaOptions}
                                    value={
                                        monedaPrefacturaOptions.find(
                                            (option) => option.value === monedaPrefactura,
                                        ) ?? null
                                    }
                                    onChange={(opt) => {
                                        const selected = (opt as TSelectOption | null)?.value;
                                        if (!selected) return;
                                        setMonedaPrefactura(selected as TMonedaPrefacturaOTV3);
                                    }}
                                />
                            </div>
                            <div className='text-xs text-gray-500 dark:text-gray-400'>
                                {cargandoTipoCambio && <span>Cargando dolar/UF...</span>}
                                {!cargandoTipoCambio && tipoCambio && (
                                    <span>
                                        Dolar: {formatCurrency(tipoCambio.dolar ?? 0, 'CLP')} | UF:{' '}
                                        {formatCurrency(tipoCambio.uf ?? 0, 'CLP')}
                                    </span>
                                )}
                                {!cargandoTipoCambio && !tipoCambio && fechaPrefactura && (
                                    <span className='text-amber-500'>
                                        No se pudo obtener tipo de cambio
                                    </span>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    {/* ── 5. Comparativa + Matching Manual ─────────── */}
                    {otIdsSeleccionadas.length > 0 && (
                        <Card className='lg:col-span-2'>
                            <CardHeader>
                                <CardHeaderChild>
                                    Comparativa pactado vs ejecutado
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    {!comparativaCargada && (
                                        <Button
                                            variant='outline'
                                            color='blue'
                                            icon='HeroCalculator'
                                            isLoading={cargandoComparativa}
                                            onClick={handleCargarComparativa}>
                                            Calcular
                                        </Button>
                                    )}
                                    {comparativaCargada && (
                                        <Button
                                            variant='outline'
                                            color='zinc'
                                            icon='HeroArrowPath'
                                            isLoading={cargandoComparativa}
                                            onClick={handleCargarComparativa}>
                                            Recalcular
                                        </Button>
                                    )}
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                {!comparativaCargada && !cargandoComparativa && (
                                    <p className='text-sm text-gray-400'>
                                        Presiona &quot;Calcular&quot; para cargar
                                        la comparativa y los items ejecutados.
                                    </p>
                                )}

                                {comparativa && (
                                    <>
                                        {/* Resumen totales pactado/ejecutado/diferencia */}
                                        <div className='mb-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3'>
                                            <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
                                                <p className='mb-1 font-semibold text-gray-500'>
                                                    Pactado
                                                </p>
                                                <p className='text-lg font-bold'>
                                                    {formatCurrency(
                                                        comparativa.pactado.total,
                                                        comparativa.pactado.moneda || monedaRender,
                                                    )}
                                                </p>
                                            </div>
                                            <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
                                                <p className='mb-1 font-semibold text-gray-500'>
                                                    Ejecutado
                                                </p>
                                                <p className='text-lg font-bold'>
                                                    {formatCurrency(
                                                        comparativa.ejecutado.total,
                                                        comparativa.ejecutado.moneda || monedaRender,
                                                    )}
                                                </p>
                                            </div>
                                            <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
                                                <p className='mb-1 font-semibold text-gray-500'>
                                                    Diferencia
                                                </p>
                                                <p
                                                    className={`text-lg font-bold ${
                                                        comparativa.diferencia >= 0
                                                            ? 'text-emerald-600'
                                                            : 'text-red-500'
                                                    }`}>
                                                    {formatCurrency(
                                                        comparativa.diferencia,
                                                        monedaRender,
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Tabla de items con matching */}
                                        {allItems.length > 0 && (
                                            <div
                                                className={
                                                    hasVisualCards
                                                        ? 'grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]'
                                                        : ''
                                                }>
                                                {hasVisualCards && (
                                                    <div className='space-y-3'>
                                                        {contractCardsVM.length > 0 && (
                                                            <Card className='border border-gray-200 dark:border-gray-700'>
                                                                <CardHeader>
                                                                    <CardHeaderChild>
                                                                        Contratos
                                                                    </CardHeaderChild>
                                                                </CardHeader>
                                                                <CardBody className='space-y-2 text-xs'>
                                                                    {contractCardsVM.map((contrato) => {
                                                                        const base = visitasPorContrato.get(contrato.id);
                                                                        return (
                                                                            <div key={contrato.id} className='rounded border border-gray-200 p-2 dark:border-gray-700'>
                                                                                <div className='mb-1 flex items-center justify-between gap-2'>
                                                                                    <p className='truncate font-semibold text-gray-700 dark:text-gray-100'>
                                                                                        {contrato.nombre}
                                                                                    </p>
                                                                                    <Badge color='zinc'>
                                                                                        {contrato.estadoLabel}
                                                                                    </Badge>
                                                                                </div>
                                                                                <p className='text-gray-500'>{`Moneda: ${contrato.moneda}`}</p>
                                                                                <p className='text-gray-500'>{`Dia facturacion: ${contrato.diaFacturacion ?? '-'}`}</p>
                                                                                <p className='text-gray-500'>{`Visitas base: ${base?.confirmadasMes ?? 0}/${base?.incluidasMes ?? 0}`}</p>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    <div className='rounded border border-blue-200 bg-blue-50 p-2 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300'>
                                                                        <p className='font-semibold'>Visitas proyectadas</p>
                                                                        <p>{`${visitasPrefactura.proyectadas_mes}/${visitasPrefactura.incluidas_mes}`}</p>
                                                                        {visitasPrefactura.exceso_prefactura > 0 && (
                                                                            <p>{`Exceso: ${visitasPrefactura.exceso_prefactura}`}</p>
                                                                        )}
                                                                    </div>
                                                                </CardBody>
                                                            </Card>
                                                        )}

                                                        {cotizacionCardsVM.length > 0 && (
                                                            <Card className='border border-gray-200 dark:border-gray-700'>
                                                                <CardHeader>
                                                                    <CardHeaderChild>
                                                                        Cotizaciones
                                                                    </CardHeaderChild>
                                                                </CardHeader>
                                                                <CardBody className='space-y-2 text-xs'>
                                                                    {cotizacionCardsVM.map((cotizacion) => (
                                                                        <div key={cotizacion.id} className='rounded border border-gray-200 p-2 dark:border-gray-700'>
                                                                            <div className='mb-1 flex items-center justify-between gap-2'>
                                                                                <p className='font-semibold text-gray-700 dark:text-gray-100'>
                                                                                    {cotizacion.numeroCotizacion ? `#${cotizacion.numeroCotizacion}` : `#${cotizacion.id}`}
                                                                                </p>
                                                                                <Badge color='zinc'>
                                                                                    {cotizacion.estadoLabel}
                                                                                </Badge>
                                                                            </div>
                                                                            <p className='truncate text-gray-500'>{cotizacion.nombre}</p>
                                                                            <p className='text-gray-500'>{`Items: ${cotizacion.cantidadItems}`}</p>
                                                                            <p className='font-semibold text-gray-700 dark:text-gray-100'>
                                                                                {formatCurrency(
                                                                                    cotizacion.totalAsociado,
                                                                                    monedaRender,
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                    ))}
                                                                </CardBody>
                                                            </Card>
                                                        )}

                                                        {ordenCompraCardsVM.length > 0 && (
                                                            <Card className='border border-gray-200 dark:border-gray-700'>
                                                                <CardHeader>
                                                                    <CardHeaderChild>
                                                                        Ordenes de compra
                                                                    </CardHeaderChild>
                                                                </CardHeader>
                                                                <CardBody className='space-y-2 text-xs'>
                                                                    {ordenCompraCardsVM.map((ordenCompra) => (
                                                                        <div key={ordenCompra.id} className='rounded border border-gray-200 p-2 dark:border-gray-700'>
                                                                            <p className='mb-1 font-semibold text-gray-700 dark:text-gray-100'>{`OC #${ordenCompra.id}`}</p>
                                                                            <p className='text-gray-500'>{`Items: ${ordenCompra.cantidadItems}`}</p>
                                                                            <p className='font-semibold text-gray-700 dark:text-gray-100'>
                                                                                {formatCurrency(
                                                                                    ordenCompra.totalAsociado,
                                                                                    monedaRender,
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                    ))}
                                                                </CardBody>
                                                            </Card>
                                                        )}
                                                    </div>
                                                )}
                                                <div className='overflow-x-auto'>
                                                <Table>
                                                    <THead>
                                                        <Tr>
                                                            <Th>Tipo</Th>
                                                            <Th>Descripcion</Th>
                                                            <Th>OT</Th>
                                                            <Th className='text-right'>
                                                                Cant.
                                                            </Th>
                                                            <Th className='text-right'>
                                                                P. Unit.
                                                            </Th>
                                                            <Th className='text-right'>
                                                                Total
                                                            </Th>
                                                            <Th className='border-l-2 border-gray-300 text-center dark:border-gray-700'>
                                                                Facturar
                                                            </Th>
                                                            <Th className='text-right'>
                                                                Precio Ajust.
                                                            </Th>
                                                            <Th>Comentario</Th>
                                                        </Tr>
                                                    </THead>
                                                    <TBody>
                                                        {allItems.map((item) => {
                                                            const key = `${item.tipo}_${item.id}`;
                                                            const config = itemsConfig.get(key);
                                                            const badge = tipoBadge(item.tipo);
                                                            const isSynthetic =
                                                                item.tipo ===
                                                                'visita_adicional_contrato';

                                                            return (
                                                                <Tr key={key}>
                                                                    <Td>
                                                                        <Badge
                                                                            color={
                                                                                badge.color as any
                                                                            }>
                                                                            {badge.label}
                                                                        </Badge>
                                                                    </Td>
                                                                    <Td className='max-w-[220px] truncate text-xs'>
                                                                        {(item as any)
                                                                            .descripcion ||
                                                                            item.nombre}
                                                                    </Td>
                                                                    <Td className='text-xs'>
                                                                        {item.ot_id
                                                                            ? `#${item.ot_id}`
                                                                            : '-'}
                                                                    </Td>
                                                                    <Td className='text-right text-xs'>
                                                                        {item.cantidad}
                                                                    </Td>
                                                                    <Td className='text-right text-xs'>
                                                                        {formatCurrency(
                                                                            item.precio_unitario,
                                                                            item.moneda ?? monedaRender,
                                                                        )}
                                                                    </Td>
                                                                    <Td className='text-right text-xs'>
                                                                        {formatCurrency(
                                                                            item.total,
                                                                            item.moneda ?? monedaRender,
                                                                        )}
                                                                    </Td>
                                                                    {/* Matching columns */}
                                                                    <Td className='border-l-2 border-gray-300 text-center dark:border-gray-700'>
                                                                        {isSynthetic ? (
                                                                            <Badge
                                                                                variant='solid'
                                                                                color='red'>
                                                                                Exceso
                                                                            </Badge>
                                                                        ) : (
                                                                            <input
                                                                                type='checkbox'
                                                                                checked={
                                                                                    config?.facturar ??
                                                                                    true
                                                                                }
                                                                                onChange={(e) =>
                                                                                    updateItemConfig(
                                                                                        key,
                                                                                        {
                                                                                            facturar:
                                                                                                e
                                                                                                    .target
                                                                                                    .checked,
                                                                                        },
                                                                                    )
                                                                                }
                                                                                className='h-4 w-4 cursor-pointer'
                                                                            />
                                                                        )}
                                                                    </Td>
                                                                    <Td>
                                                                        {isSynthetic ? (
                                                                            <div className='text-right text-xs font-semibold text-red-600 dark:text-red-400'>
                                                                                {formatCurrency(
                                                                                    visitasPrefactura.total_exceso,
                                                                                    monedaRender,
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <input
                                                                                type='number'
                                                                                placeholder={
                                                                                    monedaRender === 'CLP'
                                                                                        ? '$'
                                                                                        : monedaRender
                                                                                }
                                                                                value={
                                                                                    config?.precioAsignado ??
                                                                                    ''
                                                                                }
                                                                                onChange={(e) =>
                                                                                    updateItemConfig(
                                                                                        key,
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
                                                                                className='w-24 rounded border border-gray-300 px-2 py-1 text-right text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                                                                            />
                                                                        )}
                                                                    </Td>
                                                                    <Td>
                                                                        {isSynthetic ? (
                                                                            <span className='text-xs text-gray-500'>
                                                                                Cobro por exceso de
                                                                                visitas del
                                                                                contrato.
                                                                            </span>
                                                                        ) : (
                                                                            <input
                                                                                type='text'
                                                                                placeholder='Comentario...'
                                                                                value={
                                                                                    config?.comentario ??
                                                                                    ''
                                                                                }
                                                                                onChange={(e) =>
                                                                                    updateItemConfig(
                                                                                        key,
                                                                                        {
                                                                                            comentario:
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                        },
                                                                                    )
                                                                                }
                                                                                className='w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                                                                            />
                                                                        )}
                                                                    </Td>
                                                                </Tr>
                                                            );
                                                        })}
                                                    </TBody>
                                                </Table>
                                            </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardBody>
                        </Card>
                    )}

                    {/* ── 6. Visitas de contrato ──────────────────── */}
                    {comparativaCargada && contratoIds.length > 0 && (
                        <Card className='lg:col-span-2'>
                            <CardHeader>
                                <CardHeaderChild>Visitas de contrato</CardHeaderChild>
                            </CardHeader>
                            <CardBody className='space-y-4'>
                                <div className='grid grid-cols-2 gap-4 text-sm md:grid-cols-4'>
                                    <div>
                                        <p className='text-xs text-gray-500'>Periodo</p>
                                        <p className='font-semibold'>
                                            {visitasPrefactura.periodo}
                                        </p>
                                    </div>
                                    <div>
                                        <p className='text-xs text-gray-500'>Incluidas/mes</p>
                                        <p className='font-semibold'>
                                            {visitasPrefactura.incluidas_mes}
                                        </p>
                                    </div>
                                    <div>
                                        <p className='text-xs text-gray-500'>
                                            Visitas usadas/incluidas
                                        </p>
                                        <p className='font-semibold'>
                                            {`${visitasPrefactura.proyectadas_mes}/${visitasPrefactura.incluidas_mes}`}
                                        </p>
                                    </div>
                                    <div>
                                        <p className='text-xs text-gray-500'>
                                            Exceso esta prefactura
                                        </p>
                                        <p
                                            className={`font-semibold ${visitasPrefactura.exceso_prefactura > 0 ? 'text-red-500' : ''}`}>
                                            {visitasPrefactura.exceso_prefactura}
                                        </p>
                                    </div>
                                </div>

                                {/* Marcar OTs con visita */}
                                <div>
                                    <p className='mb-2 text-xs font-semibold text-gray-500'>
                                        Marcar OTs con visita presencial:
                                    </p>
                                    <div className='flex flex-wrap gap-3'>
                                        {otSeleccionadasData.map((ot) => (
                                            <Checkbox
                                                key={ot.id}
                                                id={`visita-ot-${ot.id}`}
                                                name={`visita-ot-${ot.id}`}
                                                label={`OT #${ot.id}`}
                                                checked={
                                                    visitasMarcadasPorOt[ot.id] ?? false
                                                }
                                                onChange={(
                                                    e: React.ChangeEvent<HTMLInputElement>,
                                                ) =>
                                                    setVisitasMarcadasPorOt((prev) => ({
                                                        ...prev,
                                                        [ot.id]: e.target.checked,
                                                    }))
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Precio visita adicional */}
                                {visitasPrefactura.exceso_prefactura > 0 && (
                                    <div className='max-w-xs'>
                                        <Label htmlFor='precioVisita'>
                                            Precio unitario visita adicional
                                        </Label>
                                        <Input
                                            id='precioVisita'
                                            name='precioVisita'
                                            type='number'
                                            value={precioVisitaAdicional || ''}
                                            onChange={(
                                                e: React.ChangeEvent<HTMLInputElement>,
                                            ) =>
                                                setPrecioVisitaAdicional(
                                                    Number(e.target.value) || 0,
                                                )
                                            }
                                            placeholder={monedaRender === 'CLP' ? '$0' : `0 ${monedaRender}`}
                                        />
                                        <p className='mt-1 text-xs text-gray-400'>
                                            Total exceso:{' '}
                                            {formatCurrency(
                                                visitasPrefactura.total_exceso,
                                                monedaRender,
                                            )}{' '}
                                            ({visitasPrefactura.exceso_prefactura} visita
                                            {visitasPrefactura.exceso_prefactura > 1 ? 's' : ''})
                                        </p>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}

                    {/* ── 7. Resumen y comentario ─────────────────── */}
                    {comparativaCargada && allItems.length > 0 && (
                        <Card className='lg:col-span-2'>
                            <CardHeader>
                                <CardHeaderChild>Resumen y comentario</CardHeaderChild>
                            </CardHeader>
                            <CardBody className='space-y-4'>
                                {/* Totales */}
                                <div className='grid grid-cols-1 gap-4 text-sm md:grid-cols-3'>
                                    <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950'>
                                        <p className='text-xs font-semibold text-emerald-600 dark:text-emerald-400'>
                                            Total a facturar
                                        </p>
                                        <p className='text-lg font-bold text-emerald-700 dark:text-emerald-300'>
                                            {formatCurrency(totales.totalFacturar, monedaRender)}
                                        </p>
                                    </div>
                                    <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
                                        <p className='text-xs font-semibold text-gray-500'>
                                            Total excluido
                                        </p>
                                        <p className='text-lg font-bold text-gray-400'>
                                            {formatCurrency(totales.totalExcluido, monedaRender)}
                                        </p>
                                    </div>
                                    {visitasPrefactura.total_exceso > 0 && (
                                        <div className='rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950'>
                                            <p className='text-xs font-semibold text-red-500'>
                                                Exceso visitas
                                            </p>
                                            <p className='text-lg font-bold text-red-600 dark:text-red-400'>
                                                {formatCurrency(
                                                    visitasPrefactura.total_exceso,
                                                    monedaRender,
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* OTs incluidas */}
                                <div>
                                    <p className='mb-1 text-xs font-semibold text-gray-500'>
                                        OTs incluidas
                                    </p>
                                    <div className='flex flex-wrap gap-1'>
                                        {otSeleccionadasData.map((ot) => (
                                            <Badge key={ot.id} color='blue'>
                                                #{ot.id} - {ot.titulo}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Comentario */}
                                <div>
                                    <Label htmlFor='comentario'>Comentario (opcional)</Label>
                                    <Textarea
                                        id='comentario'
                                        name='comentario'
                                        value={comentario}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                            setComentario(e.target.value)
                                        }
                                        placeholder='Notas internas sobre esta prefactura...'
                                        rows={3}
                                    />
                                </div>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </Container>
        </PageWrapper>
    );
};

export default MatchingManualOTV3;
