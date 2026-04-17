import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import {
    useCambiarEstadoOrdenCompraMutation,
    useGetDetalleOCAgrupadaQuery,
} from '@/store/slices/bodega/ordenCompraApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

type TColorBadge = 'emerald' | 'amber' | 'red' | 'blue' | 'zinc';

function colorEstadoGrupo(estado: string): TColorBadge {
    if (estado === '5' || estado === '7') return 'emerald';
    if (estado === '4') return 'amber';
    if (estado === '1' || estado === '3') return 'blue';
    if (estado === '2' || estado === '6') return 'red';
    return 'zinc';
}

function colorEstadoAgrupada(estado: string): TColorBadge {
    if (estado === 'completada') return 'emerald';
    if (estado === 'en_proceso') return 'blue';
    if (estado === 'parcialmente_completada') return 'amber';
    if (estado === 'cancelada') return 'red';
    return 'zinc';
}

/** Acciones de transición simples disponibles por estado de grupo proveedor */
const ACCIONES_POR_ESTADO: Record<string, { estado: string; label: string; color: TColorBadge }[]> =
    {
        '-': [{ estado: '0', label: 'Enviar a aprobación', color: 'blue' }],
        '0': [
            { estado: '1', label: 'Aprobar', color: 'emerald' },
            { estado: '2', label: 'Rechazar', color: 'red' },
        ],
        '1': [{ estado: '2', label: 'Rechazar', color: 'red' }],
        '2': [{ estado: '0', label: 'Reenviar a aprobación', color: 'blue' }],
        '5': [{ estado: '7', label: 'Cerrar', color: 'zinc' }],
    };

function DetalleOCAgrupada() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const { data: ocAgrupada, isLoading } = useGetDetalleOCAgrupadaQuery(id ?? '', {
        skip: !id,
    });

    const [cambiarEstado, { isLoading: isCambiando }] = useCambiarEstadoOrdenCompraMutation();

    const handleCambiarEstado = async (grupoId: number, estado: string) => {
        try {
            await cambiarEstado({ id: grupoId, estado }).unwrap();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <PageWrapper isProtectedRoute={true} name='Detalle OC Agrupada' title='Detalle OC Agrupada'>
            <Subheader>
                <SubheaderLeft>
                    <Button icon='HeroArrowLeft' onClick={() => navigate(-1)}>
                        Volver
                    </Button>
                    {ocAgrupada && (
                        <div className='flex items-center gap-3'>
                            <span className='text-lg font-bold text-zinc-700 dark:text-zinc-200'>
                                OC Agrupada {ocAgrupada.codigo}
                            </span>
                            <Badge
                                variant='solid'
                                color={colorEstadoAgrupada(ocAgrupada.estado_derivado)}>
                                {ocAgrupada.estado_derivado_label}
                            </Badge>
                            {ocAgrupada.es_prospecto && (
                                <Badge color='amber' variant='outline'>
                                    Prospecto
                                </Badge>
                            )}
                        </div>
                    )}
                </SubheaderLeft>
                <SubheaderRight>
                    <Button
                        icon='HeroArrowPath'
                        onClick={() => navigate(0)}
                        variant='outline'
                        color='blue'>
                        Actualizar
                    </Button>
                </SubheaderRight>
            </Subheader>

            <Container className='h-full w-full'>
                {isLoading && (
                    <div className='py-12 text-center text-zinc-400'>Cargando...</div>
                )}

                {!isLoading && !ocAgrupada && (
                    <div className='py-12 text-center text-zinc-400'>
                        No se encontró la OC Agrupada.
                    </div>
                )}

                {!isLoading && ocAgrupada && (
                    <div className='flex flex-col gap-4'>
                        {/* Encabezado de la OC */}
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>Información General</CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <dl className='grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-4'>
                                    <div>
                                        <dt className='text-zinc-500 dark:text-zinc-400'>
                                            Cliente
                                        </dt>
                                        <dd className='flex items-center gap-2 font-semibold text-zinc-800 dark:text-zinc-100'>
                                            {ocAgrupada.nombre_cliente ?? '—'}
                                            {ocAgrupada.es_prospecto && (
                                                <Badge color='amber' variant='outline'>
                                                    Prospecto
                                                </Badge>
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className='text-zinc-500 dark:text-zinc-400'>
                                            Empresa
                                        </dt>
                                        <dd className='font-semibold text-zinc-800 dark:text-zinc-100'>
                                            {ocAgrupada.nombre_empresa ?? '—'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className='text-zinc-500 dark:text-zinc-400'>
                                            Creada el
                                        </dt>
                                        <dd className='font-semibold text-zinc-800 dark:text-zinc-100'>
                                            {dayjs(ocAgrupada.fecha_creacion).format('DD/MM/YYYY')}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className='text-zinc-500 dark:text-zinc-400'>
                                            Cotizaciones vinculadas
                                        </dt>
                                        <dd className='flex flex-wrap gap-1 pt-1'>
                                            {ocAgrupada.cotizaciones_detalle?.length ? (
                                                ocAgrupada.cotizaciones_detalle.map((cot) => (
                                                    <Button
                                                        key={cot.id}
                                                        size='xs'
                                                        variant='outline'
                                                        onClick={() =>
                                                            navigate(
                                                                `/cotizacion/detalle-cotizacion/${cot.numero_cotizacion}`,
                                                            )
                                                        }
                                                        className='font-medium text-blue-700 dark:text-blue-300'>
                                                        #{cot.numero_cotizacion} {cot.nombre}
                                                    </Button>
                                                ))
                                            ) : (
                                                <span className='font-semibold text-zinc-800 dark:text-zinc-100'>
                                                    Sin cotizaciones
                                                </span>
                                            )}
                                        </dd>
                                    </div>
                                    {ocAgrupada.observaciones && (
                                        <div className='col-span-2 md:col-span-4'>
                                            <dt className='text-zinc-500 dark:text-zinc-400'>
                                                Observaciones
                                            </dt>
                                            <dd className='font-semibold text-zinc-800 dark:text-zinc-100'>
                                                {ocAgrupada.observaciones}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </CardBody>
                        </Card>

                        {/* Grupos por proveedor */}
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    Grupos por Proveedor ({ocAgrupada.grupos_proveedor?.length ?? 0})
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                {!ocAgrupada.grupos_proveedor?.length ? (
                                    <div className='py-6 text-center text-zinc-400'>
                                        Sin grupos de proveedor creados.
                                    </div>
                                ) : (
                                    <div className='overflow-auto'>
                                        <Table className='min-w-[700px]'>
                                            <THead>
                                                <Tr>
                                                    <Th>Código</Th>
                                                    <Th>Proveedor</Th>
                                                    <Th>Cotización</Th>
                                                    <Th>Estado</Th>
                                                    <Th>Fecha compra</Th>
                                                    <Th>Acciones</Th>
                                                </Tr>
                                            </THead>
                                            <TBody>
                                                {ocAgrupada.grupos_proveedor.map((grupo) => {
                                                    const acciones =
                                                        ACCIONES_POR_ESTADO[grupo.estado] ?? [];
                                                    return (
                                                        <Tr key={grupo.id}>
                                                            <Td>
                                                                <span className='font-mono text-sm text-zinc-600 dark:text-zinc-400'>
                                                                    {grupo.codigo}
                                                                </span>
                                                            </Td>
                                                            <Td>
                                                                <span className='font-semibold text-zinc-700 dark:text-zinc-300'>
                                                                    {grupo.nombre_proveedor}
                                                                </span>
                                                            </Td>
                                                            <Td>
                                                                {grupo.relacion_cotizacion_numero ? (
                                                                    <Button
                                                                        size='xs'
                                                                        variant='outline'
                                                                        onClick={() =>
                                                                            navigate(
                                                                                `/cotizacion/detalle-cotizacion/${grupo.relacion_cotizacion_numero}`,
                                                                            )
                                                                        }
                                                                        className='font-medium text-blue-700 dark:text-blue-300'>
                                                                        #{grupo.relacion_cotizacion_numero}
                                                                    </Button>
                                                                ) : (
                                                                    <span className='text-zinc-400'>—</span>
                                                                )}
                                                            </Td>
                                                            <Td>
                                                                <Badge
                                                                    variant='solid'
                                                                    color={colorEstadoGrupo(
                                                                        grupo.estado,
                                                                    )}>
                                                                    {grupo.estado_label}
                                                                </Badge>
                                                            </Td>
                                                            <Td>
                                                                <span className='text-zinc-500'>
                                                                    {grupo.fecha_compra
                                                                        ? dayjs(
                                                                              grupo.fecha_compra,
                                                                          ).format('DD/MM/YYYY')
                                                                        : '—'}
                                                                </span>
                                                            </Td>
                                                            <Td>
                                                                <div className='flex items-center gap-1'>
                                                                    {/* Botones de transición de estado */}
                                                                    {acciones.map((accion) => (
                                                                        <Tooltip
                                                                            key={accion.estado}
                                                                            text={accion.label}>
                                                                            <Button
                                                                                size='sm'
                                                                                color={accion.color}
                                                                                isLoading={
                                                                                    isCambiando
                                                                                }
                                                                                onClick={() =>
                                                                                    handleCambiarEstado(
                                                                                        grupo.id,
                                                                                        accion.estado,
                                                                                    )
                                                                                }>
                                                                                {accion.label}
                                                                            </Button>
                                                                        </Tooltip>
                                                                    ))}
                                                                    {/* Enviar al proveedor: requiere email, navega al detalle */}
                                                                    {grupo.estado === '1' && (
                                                                        <Tooltip text='Enviar al proveedor (requiere email)'>
                                                                            <Button
                                                                                size='sm'
                                                                                color='blue'
                                                                                icon='HeroEnvelope'
                                                                                onClick={() =>
                                                                                    navigate(
                                                                                        `/compras/detalle-orden-compra/${grupo.id}`,
                                                                                    )
                                                                                }>
                                                                                Enviar
                                                                            </Button>
                                                                        </Tooltip>
                                                                    )}
                                                                    {/* Recepcionar: estados '3' (enviada) y '4' (parcial), navega al detalle con modo recepción */}
                                                                    {(grupo.estado === '3' ||
                                                                        grupo.estado === '4') && (
                                                                        <Tooltip text='Recepcionar ítems de esta OC'>
                                                                            <Button
                                                                                size='sm'
                                                                                color='emerald'
                                                                                icon='DuoBox2'
                                                                                onClick={() =>
                                                                                    navigate(
                                                                                        `/compras/detalle-orden-compra/${grupo.id}`,
                                                                                    )
                                                                                }>
                                                                                Recepcionar
                                                                            </Button>
                                                                        </Tooltip>
                                                                    )}
                                                                    {/* Ver detalle siempre disponible */}
                                                                    <Tooltip text='Ver detalle de esta OC'>
                                                                        <Button
                                                                            variant='outline'
                                                                            color='violet'
                                                                            size='sm'
                                                                            icon='HeroEye'
                                                                            onClick={() =>
                                                                                navigate(
                                                                                    `/compras/detalle-orden-compra/${grupo.id}`,
                                                                                )
                                                                            }
                                                                        />
                                                                    </Tooltip>
                                                                </div>
                                                            </Td>
                                                        </Tr>
                                                    );
                                                })}
                                            </TBody>
                                        </Table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                )}
            </Container>
        </PageWrapper>
    );
}

export default DetalleOCAgrupada;
