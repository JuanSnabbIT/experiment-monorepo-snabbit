import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';

import {
    useAsociarDocumentoFacturaMutation,
    useDeleteFacturaContratoMutation,
    useFinalizarFacturaContratoMutation,
    useGetDetalleFacturaContratoQuery,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { buildPrefacturacionListPath, parsePrefacturacionSearchParams } from './prefacturacion.shared';

// ── Helpers ───────────────────────────────────────────────────

const colorEstado = (estado: string) => {
    const map: Record<string, 'amber' | 'blue' | 'emerald' | 'zinc'> = {
        borrador: 'amber',
        por_facturar: 'blue',
        facturado: 'emerald',
    };
    return map[estado] ?? 'zinc';
};

// ══════════════════════════════════════════════════════════════
//  Componente
// ══════════════════════════════════════════════════════════════

const DetalleFacturaContrato = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const routeState = parsePrefacturacionSearchParams(searchParams, 'contrato');
    const backToList = buildPrefacturacionListPath(routeState, 'contrato');

    const { data: factura, isLoading } = useGetDetalleFacturaContratoQuery(id!, { skip: !id });
    const [finalizarFactura] = useFinalizarFacturaContratoMutation();
    const [asociarDocumento] = useAsociarDocumentoFacturaMutation();
    const [deleteFactura] = useDeleteFacturaContratoMutation();

    // ── Modal documento ───────────────────────────────────────
    const [modalDocumento, setModalDocumento] = useState(false);
    const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);

    // ── Handlers ──────────────────────────────────────────────
    const handleFinalizar = async () => {
        if (!id) return;
        try {
            await finalizarFactura(Number(id)).unwrap();
            toast.success('Prefactura marcada como "Por facturar"');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleSubirDocumento = async () => {
        if (!id || !archivoSeleccionado) {
            toast.error('Selecciona un archivo antes de continuar');
            return;
        }
        try {
            await asociarDocumento({
                id: Number(id),
                documento: archivoSeleccionado,
            }).unwrap();
            toast.success('Documento adjuntado. Prefactura marcada como Facturada.');
            setModalDocumento(false);
            setArchivoSeleccionado(null);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleEliminar = async () => {
        if (!id) return;
        try {
            await deleteFactura(Number(id)).unwrap();
            toast.success('Prefactura eliminada');
            navigate(backToList);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    // ── Loading / Error ───────────────────────────────────────
    if (isLoading) {
        return (
            <PageWrapper>
                <Container>
                    <p className='py-12 text-center text-zinc-400'>Cargando detalle...</p>
                </Container>
            </PageWrapper>
        );
    }

    if (!factura) {
        return (
            <PageWrapper>
                <Container>
                    <p className='py-12 text-center text-zinc-400'>
                        No se encontró la prefactura.
                    </p>
                </Container>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <Button
                        onClick={() => navigate(backToList)}
                        icon='HeroArrowLeft'>
                        Volver
                    </Button>
                    <h1 className='text-xl font-bold'>
                        Prefactura #{factura.id}
                    </h1>
                    <Badge color={colorEstado(factura.estado)}>
                        {factura.estado_label}
                    </Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    {factura.estado === 'borrador' && (
                        <>
                            <Tooltip text='Marcar como Por facturar'>
                                <Button
                                    variant='solid'
                                    color='blue'
                                    icon='HeroArrowRight'
                                    onClick={handleFinalizar}>
                                    Por facturar
                                </Button>
                            </Tooltip>
                            <Tooltip text='Eliminar prefactura'>
                                <Button
                                    variant='outline'
                                    color='red'
                                    icon='HeroTrash'
                                    onClick={handleEliminar}>
                                    Eliminar
                                </Button>
                            </Tooltip>
                        </>
                    )}
                    {factura.estado === 'por_facturar' && (
                        <Tooltip text='Adjuntar documento (marca como Facturado)'>
                            <Button
                                variant='solid'
                                color='emerald'
                                icon='HeroDocumentArrowUp'
                                onClick={() => {
                                    setArchivoSeleccionado(null);
                                    setModalDocumento(true);
                                }}>
                                Adjuntar factura
                            </Button>
                        </Tooltip>
                    )}
                    {factura.estado === 'facturado' && factura.documento_factura && (
                        <Tooltip text='Reemplazar documento'>
                            <Button
                                variant='outline'
                                color='zinc'
                                icon='HeroArrowPath'
                                onClick={() => {
                                    setArchivoSeleccionado(null);
                                    setModalDocumento(true);
                                }}>
                                Reemplazar documento
                            </Button>
                        </Tooltip>
                    )}
                </SubheaderRight>
            </Subheader>

            <Container>
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                    {/* Info general */}
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>Información General</CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className='grid grid-cols-2 gap-3 text-sm'>
                                <div>
                                    <p className='text-zinc-500'>Contrato</p>
                                    <p className='font-semibold'>{factura.nombre_contrato}</p>
                                </div>
                                <div>
                                    <p className='text-zinc-500'>Cliente</p>
                                    <p className='font-semibold'>{factura.nombre_cliente}</p>
                                </div>
                                <div>
                                    <p className='text-zinc-500'>Prestadora</p>
                                    <p className='font-semibold'>{factura.nombre_prestadora}</p>
                                </div>
                                <div>
                                    <p className='text-zinc-500'>Moneda</p>
                                    <p className='font-semibold'>{factura.moneda_label}</p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Detalle financiero */}
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>Detalle Financiero</CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className='grid grid-cols-2 gap-3 text-sm'>
                                <div>
                                    <p className='text-zinc-500'>Período</p>
                                    <p className='font-semibold'>
                                        {dayjs(factura.periodo_inicio).format('DD/MM/YYYY')} →{' '}
                                        {dayjs(factura.periodo_fin).format('DD/MM/YYYY')}
                                    </p>
                                </div>
                                <div>
                                    <p className='text-zinc-500'>Fecha Emisión</p>
                                    <p className='font-semibold'>
                                        {factura.fecha_emision
                                            ? dayjs(factura.fecha_emision).format('DD/MM/YYYY')
                                            : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className='text-zinc-500'>Monto Total</p>
                                    <p className='text-lg font-bold'>
                                        {factura.moneda_label}{' '}
                                        {Number(factura.monto_total).toLocaleString('es-CL')}
                                    </p>
                                </div>
                                {factura.monto_calculado && (
                                    <div>
                                        <p className='text-zinc-500'>Monto Calculado</p>
                                        <p className='text-lg font-bold text-blue-500'>
                                            {factura.moneda_label}{' '}
                                            {Number(factura.monto_calculado).toLocaleString('es-CL')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Comentario */}
                {factura.comentario && (
                    <Card className='mt-4'>
                        <CardHeader>
                            <CardHeaderChild>Comentario</CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <p className='text-sm'>{factura.comentario}</p>
                        </CardBody>
                    </Card>
                )}

                {/* Documento adjunto */}
                {factura.documento_factura && (
                    <Card className='mt-4'>
                        <CardHeader>
                            <CardHeaderChild>Documento Adjunto</CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <a
                                href={factura.documento_factura}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='inline-flex items-center gap-2 text-blue-500 hover:underline'>
                                Ver documento de factura
                            </a>
                        </CardBody>
                    </Card>
                )}

                {/* Metadata */}
                <Card className='mt-4'>
                    <CardBody>
                        <div className='flex gap-6 text-xs text-zinc-400'>
                            <span>
                                Creado: {dayjs(factura.fecha_creacion).format('DD/MM/YYYY HH:mm')}
                            </span>
                            <span>
                                Modificado:{' '}
                                {dayjs(factura.fecha_modificacion).format('DD/MM/YYYY HH:mm')}
                            </span>
                            {factura.creado_por_nombre && (
                                <span>Creado por: {factura.creado_por_nombre}</span>
                            )}
                        </div>
                    </CardBody>
                </Card>
            </Container>

            {/* Modal subir documento */}
            <Modal isOpen={modalDocumento} setIsOpen={setModalDocumento}>
                <ModalHeader>Adjuntar Documento de Factura</ModalHeader>
                <ModalBody>
                    <p className='mb-3 text-sm text-zinc-400'>
                        Selecciona el archivo de factura emitido externamente. Al confirmar, la
                        prefactura pasará automáticamente al estado <strong>Facturado</strong>.
                    </p>
                    <input
                        type='file'
                        accept='.pdf,.xml,.jpg,.jpeg,.png'
                        onChange={(e) => setArchivoSeleccionado(e.target.files?.[0] ?? null)}
                        className='block w-full text-sm'
                    />
                    {archivoSeleccionado && (
                        <p className='mt-2 text-xs text-emerald-500'>
                            Archivo seleccionado: {archivoSeleccionado.name}
                        </p>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        onClick={() => {
                            setModalDocumento(false);
                            setArchivoSeleccionado(null);
                        }}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        color='emerald'
                        isDisable={!archivoSeleccionado}
                        onClick={handleSubirDocumento}>
                        Confirmar y Facturar
                    </Button>
                </ModalFooter>
            </Modal>
        </PageWrapper>
    );
};

export default DetalleFacturaContrato;
