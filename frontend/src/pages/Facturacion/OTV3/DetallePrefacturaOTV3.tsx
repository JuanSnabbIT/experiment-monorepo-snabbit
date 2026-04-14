import Input from '@/components/form/Input';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import type { IPrefacturaOTV3, TMonedaPrefacturaOTV3 } from '@/interface/ordenTrabajoV3.interface';
import {
    useAsociarDocumentoPrefacturaOTV3Mutation,
    useFinalizarPrefacturaOTV3Mutation,
    useGetPrefacturaOTV3Query,
    useUpdatePrefacturaOTV3Mutation,
} from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

type TItemPrefacturaDetalleVM = {
    key: string;
    otId: number | null;
    descripcion: string;
    tipo: string;
    tipoLabel: string;
    tipoColor: string;
    cantidad: number;
    precioUnitario: number | null;
    total: number;
    moneda: TMonedaPrefacturaOTV3;
    facturar: boolean;
};

type TVisitaPorOtVM = {
    otId: number;
    estado: 'incluida' | 'cobrable';
};

const estadoColor = (estado: string) => {
    if (estado === 'borrador') return 'zinc';
    if (estado === 'por_facturar') return 'amber';
    if (estado === 'facturado') return 'emerald';
    return 'zinc';
};

const estadoCierreLabel = (estado: string) => {
    if (estado === 'borrador') return 'Borrador';
    if (estado === 'por_facturar') return 'Por facturar';
    if (estado === 'facturado') return 'Facturado';
    return estado;
};

const itemTipoMeta = (
    tipo: string,
): { label: string; color: 'blue' | 'violet' | 'emerald' | 'amber' | 'red' | 'zinc' } => {
    const map: Record<string, { label: string; color: 'blue' | 'violet' | 'emerald' | 'amber' | 'red' | 'zinc' }> =
        {
            tarea_ot: { label: 'Tarea', color: 'blue' },
            cotizacion: { label: 'Cotización', color: 'violet' },
            guia_salida: { label: 'Material', color: 'emerald' },
            gasto_operativo: { label: 'Gasto', color: 'red' },
            visita_adicional_contrato: { label: 'Visita extra', color: 'red' },
        };
    return map[tipo] ?? { label: tipo || 'Ítem', color: 'zinc' };
};

const toNumberOrNull = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const toMoneda = (value: unknown, fallback: TMonedaPrefacturaOTV3): TMonedaPrefacturaOTV3 => {
    if (value === 'CLP' || value === 'USD' || value === 'UF') return value;
    return fallback;
};

const uniqPositiveNumbers = (values: unknown[]): number[] => {
    const seen = new Set<number>();
    const normalized: number[] = [];
    values.forEach((value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return;
        const intValue = Math.trunc(parsed);
        if (intValue <= 0 || seen.has(intValue)) return;
        seen.add(intValue);
        normalized.push(intValue);
    });
    return normalized;
};

const DetallePrefacturaOTV3 = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const prefacturaId = id ? Number(id) : NaN;

    const { data, isLoading } = useGetPrefacturaOTV3Query(prefacturaId, {
        skip: !prefacturaId,
    });
    const [updatePrefactura, { isLoading: saving }] = useUpdatePrefacturaOTV3Mutation();
    const [finalizarPrefactura, { isLoading: finalizando }] = useFinalizarPrefacturaOTV3Mutation();
    const [asociarDocumento, { isLoading: subiendo }] = useAsociarDocumentoPrefacturaOTV3Mutation();

    const [fechaPrefactura, setFechaPrefactura] = useState<string>('');
    const [archivo, setArchivo] = useState<File | null>(null);
    const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);

    const prefactura = data as IPrefacturaOTV3 | undefined;
    const monedaPrefactura: TMonedaPrefacturaOTV3 = prefactura?.moneda_prefactura ?? 'CLP';

    useEffect(() => {
        if (!prefactura) return;
        setFechaPrefactura(
            prefactura.fecha_prefactura ? dayjs(prefactura.fecha_prefactura).format('YYYY-MM-DD') : '',
        );
    }, [prefactura]);

    const itemsFacturables = useMemo<TItemPrefacturaDetalleVM[]>(() => {
        const rawItems = Array.isArray(prefactura?.resultado?.items)
            ? (prefactura?.resultado?.items as Record<string, unknown>[])
            : [];
        return rawItems.map((item, idx) => {
            const cantidad = Number(item.cantidad ?? 0) || 0;
            const precioUnitarioRaw =
                item.precio_ajustado ??
                item.precio_unitario ??
                (cantidad > 0 && item.precio_total != null ? Number(item.precio_total) / cantidad : null);
            const precioUnitario = toNumberOrNull(precioUnitarioRaw);
            const totalRaw = item.total ?? item.precio_total ?? (precioUnitario != null ? precioUnitario * cantidad : 0);
            const total = Number(totalRaw ?? 0) || 0;
            const tipo = String(item.tipo ?? '');
            const tipoMeta = itemTipoMeta(tipo);

            return {
                key: `${String(item.id ?? idx)}_${tipo}_${String(item.ot_id ?? 'sin_ot')}`,
                otId: toNumberOrNull(item.ot_id),
                descripcion: String(item.descripcion ?? item.nombre ?? `Ítem #${idx + 1}`),
                tipo,
                tipoLabel: tipoMeta.label,
                tipoColor: tipoMeta.color,
                cantidad,
                precioUnitario,
                total,
                moneda: toMoneda(item.moneda, monedaPrefactura),
                facturar: item.facturar !== false,
            };
        })
        .filter((item) => item.tipo !== 'compra');
    }, [monedaPrefactura, prefactura?.resultado?.items]);

    const resumenFinanciero = useMemo(() => {
        const resumenRaw =
            prefactura?.resultado?.resumen && typeof prefactura.resultado.resumen === 'object'
                ? (prefactura.resultado.resumen as Record<string, unknown>)
                : {};

        const totalItems = Number(resumenRaw.total_items ?? itemsFacturables.length) || 0;
        const totalFacturar =
            Number(
                resumenRaw.total_facturar ??
                    itemsFacturables.filter((item) => item.facturar).reduce((acc, item) => acc + item.total, 0),
            ) || 0;
        const totalExcluidos =
            Number(
                resumenRaw.total_excluidos ??
                    itemsFacturables.filter((item) => !item.facturar).reduce((acc, item) => acc + item.total, 0),
            ) || 0;

        return {
            totalItems,
            totalFacturar,
            totalExcluidos,
        };
    }, [itemsFacturables, prefactura?.resultado?.resumen]);

    const visitasInfo = useMemo(() => {
        const visitasRaw =
            prefactura?.resultado?.visitas && typeof prefactura.resultado.visitas === 'object'
                ? (prefactura.resultado.visitas as Record<string, unknown>)
                : null;
        const visitaExtraItem = itemsFacturables.find(
            (item) => item.tipo === 'visita_adicional_contrato' && item.facturar,
        );
        if (!visitasRaw && !visitaExtraItem) return null;

        const incluidasMes = Number(visitasRaw?.incluidas_mes ?? 0) || 0;
        const confirmadasMes = Number(visitasRaw?.confirmadas_mes ?? 0) || 0;
        const marcadasPrefactura =
            Number(visitasRaw?.marcadas_prefactura ?? (visitasRaw?.ots_marcadas as unknown[])?.length ?? 0) || 0;
        const proyectadasMes = Number(visitasRaw?.proyectadas_mes ?? confirmadasMes + marcadasPrefactura) || 0;
        const excesoRule = Number(visitasRaw?.exceso_prefactura ?? 0) || 0;
        const excesoByItem = Math.max(Number(visitaExtraItem?.cantidad ?? 0), 0);
        const excesoCobrable = Math.max(excesoRule, excesoByItem);
        const incluidasEnPrefactura = Math.max(marcadasPrefactura - excesoCobrable, 0);
        const precioUnitarioExceso = Number(visitasRaw?.precio_unitario_exceso ?? visitaExtraItem?.precioUnitario ?? 0) || 0;
        const totalExceso =
            Number(visitasRaw?.total_exceso ?? visitaExtraItem?.total ?? excesoCobrable * precioUnitarioExceso) || 0;

        const otsMarcadasRaw = Array.isArray(visitasRaw?.ots_marcadas) ? (visitasRaw?.ots_marcadas as unknown[]) : [];
        const otsMarcadas = uniqPositiveNumbers(
            otsMarcadasRaw.length > 0 ? otsMarcadasRaw : (prefactura?.ots ?? []).slice(0, marcadasPrefactura),
        );

        const visitasPorOt: TVisitaPorOtVM[] = otsMarcadas.map((otId, idx) => ({
            otId,
            estado: idx < incluidasEnPrefactura ? 'incluida' : 'cobrable',
        }));

        return {
            periodo: String(visitasRaw?.periodo ?? dayjs(prefactura?.fecha_prefactura).format('YYYY-MM')),
            incluidasMes,
            proyectadasMes,
            excesoCobrable,
            totalExceso,
            visitasPorOt,
        };
    }, [itemsFacturables, prefactura?.fecha_prefactura, prefactura?.ots, prefactura?.resultado?.visitas]);

    const contratosVinculados = useMemo(
        () =>
            (prefactura?.contratos ?? []).map((contratoId, idx) => ({
                id: contratoId,
                nombre: prefactura?.contratos_nombres?.[idx] ?? `Contrato #${contratoId}`,
            })),
        [prefactura?.contratos, prefactura?.contratos_nombres],
    );

    const otsVinculadas = useMemo(
        () =>
            (prefactura?.ots ?? []).map((otId, idx) => ({
                id: otId,
                titulo: prefactura?.ots_titulos?.[idx] ?? `OT #${otId}`,
            })),
        [prefactura?.ots, prefactura?.ots_titulos],
    );

    const canEditar = prefactura?.estado_cierre === 'borrador';
    const canSubirDocumento = prefactura?.estado_cierre === 'por_facturar' || prefactura?.estado_cierre === 'facturado';

    const nextStepMessage = useMemo(() => {
        if (prefactura?.estado_cierre === 'borrador') {
            return 'Selecciona la fecha para dejarla en Por facturar.';
        }
        if (prefactura?.estado_cierre === 'por_facturar') {
            return 'Adjunta el documento de factura para cerrar la prefactura como facturada.';
        }
        if (prefactura?.estado_cierre === 'facturado') {
            return 'La prefactura ya está cerrada; puedes reemplazar el documento si necesitas actualizar respaldo.';
        }
        return 'Revisa el estado de la prefactura.';
    }, [prefactura?.estado_cierre]);

    const handleFechaPrefacturaChange = async (value: string) => {
        setFechaPrefactura(value);

        if (!prefactura || prefactura.estado_cierre !== 'borrador') return;
        if (!value || !dayjs(value, 'YYYY-MM-DD', true).isValid()) return;
        if (isAutoAdvancing || saving || finalizando) return;

        const fechaActual = prefactura.fecha_prefactura
            ? dayjs(prefactura.fecha_prefactura).format('YYYY-MM-DD')
            : '';
        if (value === fechaActual) return;

        try {
            setIsAutoAdvancing(true);
            await updatePrefactura({
                id: prefactura.id,
                data: { fecha_prefactura: value } as any,
            }).unwrap();
            await finalizarPrefactura(prefactura.id).unwrap();
            toast.success('Prefactura lista para Por facturar');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setIsAutoAdvancing(false);
        }
    };

    const handleSubirDocumento = async () => {
        if (!prefactura || !archivo) return;
        try {
            await asociarDocumento({ id: prefactura.id, documento: archivo }).unwrap();
            toast.success(
                prefactura.estado_cierre === 'por_facturar'
                    ? 'Documento asociado y prefactura facturada'
                    : 'Documento asociado',
            );
            setArchivo(null);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <Button icon='HeroArrowLeft' onClick={() => navigate(-1)}>
                        Volver
                    </Button>
                    <h1 className='ml-2 text-lg font-bold text-gray-800 dark:text-gray-100'>
                        Detalle Prefactura OT V3 #{prefacturaId}
                    </h1>
                </SubheaderLeft>
                <SubheaderRight>
                    {prefactura && (
                        <Badge color={estadoColor(prefactura.estado_cierre) as any}>
                            {estadoCierreLabel(prefactura.estado_cierre)}
                        </Badge>
                    )}
                </SubheaderRight>
            </Subheader>

            <Container>
                {isLoading ? (
                    <div className='py-20 text-center text-sm text-gray-400'>Cargando detalle...</div>
                ) : !prefactura ? (
                    <div className='py-20 text-center text-sm text-gray-400'>No se encontró la prefactura.</div>
                ) : (
                    <div className='space-y-6'>
                        <Card className='border-blue-200 dark:border-blue-700'>
                            <CardHeader>
                                <CardHeaderChild>Facturacion</CardHeaderChild>
                            </CardHeader>
                            <CardBody className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                                <div className='space-y-4'>
                                    <div className='flex flex-wrap items-center gap-2'>
                                        <Badge color={estadoColor(prefactura.estado_cierre) as any}>
                                            Estado: {estadoCierreLabel(prefactura.estado_cierre)}
                                        </Badge>
                                        <Badge color={prefactura.documento_factura ? 'emerald' : 'zinc'}>
                                            {prefactura.documento_factura ? 'Documento asociado' : 'Sin documento'}
                                        </Badge>
                                    </div>

                                    <p className='text-xs text-gray-500'>{nextStepMessage}</p>

                                    <div>
                                        <p className='mb-1 text-xs text-gray-500'>Fecha prefactura</p>
                                        <Input
                                            name='fecha_prefactura'
                                            type='date'
                                            value={fechaPrefactura}
                                            onChange={(e: any) => handleFechaPrefacturaChange(e.target.value)}
                                            disabled={!canEditar || isAutoAdvancing || saving || finalizando}
                                        />
                                    </div>
                                </div>

                                <div className='space-y-2'>
                                    <p className='text-xs text-gray-500'>Documento de factura</p>
                                    <input
                                        type='file'
                                        accept='application/pdf,image/*'
                                        onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                                        disabled={!canSubirDocumento}
                                    />
                                    <Button
                                        variant='solid'
                                        color='blue'
                                        icon='HeroDocumentArrowUp'
                                        isLoading={subiendo}
                                        isDisable={!archivo || !canSubirDocumento}
                                        onClick={handleSubirDocumento}>
                                        {prefactura.estado_cierre === 'facturado'
                                            ? 'Reemplazar documento'
                                            : 'Adjuntar documento y facturar'}
                                    </Button>
                                    {!canSubirDocumento && (
                                        <p className='text-xs text-gray-400'>
                                            Selecciona fecha para habilitar carga de documento.
                                        </p>
                                    )}
                                </div>
                            </CardBody>
                        </Card>

                        <div className='grid grid-cols-1 gap-6 xl:grid-cols-12'>
                        <div className='space-y-6 xl:col-span-8'>
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>Puntos facturables</CardHeaderChild>
                                </CardHeader>
                                <CardBody className='space-y-4'>
                                    {visitasInfo && (
                                        <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
                                            <div className='grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4'>
                                                <div>
                                                    <p className='text-xs text-gray-500'>Periodo visitas</p>
                                                    <p className='font-semibold'>{visitasInfo.periodo}</p>
                                                </div>
                                                <div>
                                                    <p className='text-xs text-gray-500'>Usadas / incluidas</p>
                                                    <p className='font-semibold'>
                                                        {visitasInfo.proyectadasMes}/{visitasInfo.incluidasMes}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className='text-xs text-gray-500'>Visitas cobrables</p>
                                                    <p className='font-semibold text-red-600 dark:text-red-400'>
                                                        {visitasInfo.excesoCobrable}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className='text-xs text-gray-500'>Monto exceso</p>
                                                    <p className='font-semibold text-red-600 dark:text-red-400'>
                                                        {formatCurrency(visitasInfo.totalExceso, monedaPrefactura)}
                                                    </p>
                                                </div>
                                            </div>
                                            {visitasInfo.visitasPorOt.length > 0 && (
                                                <div className='mt-3 flex flex-wrap gap-2'>
                                                    {visitasInfo.visitasPorOt.map((visita) => (
                                                        <Badge
                                                            key={`${visita.otId}-${visita.estado}`}
                                                            color={visita.estado === 'incluida' ? 'emerald' : 'red'}>
                                                            OT #{visita.otId} ·{' '}
                                                            {visita.estado === 'incluida'
                                                                ? 'Incluida por contrato'
                                                                : 'Cobrable'}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {itemsFacturables.length === 0 ? (
                                        <p className='text-sm text-gray-400'>No hay ítems en esta prefactura.</p>
                                    ) : (
                                        <Table>
                                            <THead>
                                                <Tr>
                                                    <Th>OT</Th>
                                                    <Th>Tipo</Th>
                                                    <Th>Descripción</Th>
                                                    <Th className='text-right'>Cantidad</Th>
                                                    <Th className='text-right'>P. Unitario</Th>
                                                    <Th className='text-right'>Total</Th>
                                                    <Th className='text-center'>Estado</Th>
                                                </Tr>
                                            </THead>
                                            <TBody>
                                                {itemsFacturables.map((item) => (
                                                    <Tr key={item.key}>
                                                        <Td>{item.otId ? `#${item.otId}` : '-'}</Td>
                                                        <Td>
                                                            <Badge color={item.tipoColor as any}>{item.tipoLabel}</Badge>
                                                        </Td>
                                                        <Td className='max-w-[360px] truncate'>{item.descripcion}</Td>
                                                        <Td className='text-right'>{item.cantidad}</Td>
                                                        <Td className='text-right'>
                                                            {item.precioUnitario != null
                                                                ? formatCurrency(item.precioUnitario, item.moneda)
                                                                : '-'}
                                                        </Td>
                                                        <Td className='text-right'>
                                                            {formatCurrency(item.total, item.moneda)}
                                                        </Td>
                                                        <Td className='text-center'>
                                                            <Badge color={item.facturar ? 'emerald' : 'zinc'}>
                                                                {item.facturar ? 'A facturar' : 'Excluido'}
                                                            </Badge>
                                                        </Td>
                                                    </Tr>
                                                ))}
                                            </TBody>
                                        </Table>
                                    )}
                                </CardBody>
                            </Card>
                        </div>

                        <div className='space-y-4 xl:col-span-4'>
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>Resumen y vinculaciones</CardHeaderChild>
                                </CardHeader>
                                <CardBody className='space-y-4'>
                                    <div className='grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1'>
                                        <div>
                                            <p className='text-xs text-gray-500'>Cliente</p>
                                            <p className='font-semibold text-gray-700 dark:text-gray-100'>
                                                {prefactura.cliente_nombre ?? `Cliente #${prefactura.cliente}`}
                                            </p>
                                        </div>
                                        <div>
                                            <p className='text-xs text-gray-500'>Moneda</p>
                                            <p className='font-semibold text-gray-700 dark:text-gray-100'>
                                                {monedaPrefactura}
                                            </p>
                                        </div>
                                        <div>
                                            <p className='text-xs text-gray-500'>Creación</p>
                                            <p className='font-semibold text-gray-700 dark:text-gray-100'>
                                                {prefactura.fecha_creacion
                                                    ? dayjs(prefactura.fecha_creacion).format('DD/MM/YYYY HH:mm')
                                                    : '-'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className='grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 xl:grid-cols-1'>
                                        <div className='rounded-md bg-gray-50 p-2 dark:bg-gray-800/60'>
                                            <p className='text-xs text-gray-500'>Total ítems</p>
                                            <p className='font-semibold'>{resumenFinanciero.totalItems}</p>
                                        </div>
                                        <div className='rounded-md bg-emerald-50 p-2 dark:bg-emerald-900/20'>
                                            <p className='text-xs text-gray-500'>Total a facturar</p>
                                            <p className='font-semibold text-emerald-600 dark:text-emerald-400'>
                                                {formatCurrency(resumenFinanciero.totalFacturar, monedaPrefactura)}
                                            </p>
                                        </div>
                                        <div className='rounded-md bg-gray-50 p-2 dark:bg-gray-800/60'>
                                            <p className='text-xs text-gray-500'>Total excluido</p>
                                            <p className='font-semibold text-gray-600 dark:text-gray-300'>
                                                {formatCurrency(resumenFinanciero.totalExcluidos, monedaPrefactura)}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className='mb-2 text-xs font-semibold text-gray-500'>OTs vinculadas</p>
                                        {otsVinculadas.length > 0 ? (
                                            <div className='flex flex-wrap gap-2'>
                                                {otsVinculadas.map((ot) => (
                                                    <Badge key={ot.id} color='blue'>
                                                        #{ot.id} - {ot.titulo}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className='text-sm text-gray-400'>Sin OTs vinculadas.</p>
                                        )}
                                    </div>

                                    <div>
                                        <p className='mb-2 text-xs font-semibold text-gray-500'>Contratos vinculados</p>
                                        {contratosVinculados.length > 0 ? (
                                            <div className='flex flex-wrap gap-2'>
                                                {contratosVinculados.map((contrato) => (
                                                    <Badge key={contrato.id} color='violet'>
                                                        {contrato.nombre}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className='text-sm text-gray-400'>Sin contratos vinculados.</p>
                                        )}
                                    </div>

                                    {prefactura.comentario && (
                                        <div>
                                            <p className='mb-1 text-xs font-semibold text-gray-500'>Comentario interno</p>
                                            <p className='text-sm text-gray-600 dark:text-gray-200'>
                                                {prefactura.comentario}
                                            </p>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </div>
                    </div>
                </div>
                )}
            </Container>
        </PageWrapper>
    );
};

export default DetallePrefacturaOTV3;
