import Breadcrumb from '@/components/layouts/Breadcrumb/Breadcrumb';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, {
    CardBody,
    CardFooter,
    CardFooterChild,
} from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { useEstadoContrato } from '@/hooks/useEstadoContrato';
import type { IContratoEmpresaCliente } from '@/interface/contrato.interface';
import ApiService from '@/services/ApiService';
import {
    listaContentTypeThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import {
    useCambiarEstadoContratoMutation,
    useDeleteContratoMutation,
    useEnviarAFirmaContratoMutation,
    useEnviarAprobacionContratoMutation,
    useGetDetalleContratoQuery,
    useGetLicenciasCatalogoQuery,
    useGetPreviewFirmaContratoQuery,
    useGetVisitasCatalogoQuery,
    useReenviarAFirmaContratoMutation,
    useReenviarAprobacionContratoMutation,
    useRenovarContratoMutation,
    useVolverContratoABorradorMutation
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import CicloVidaContrato from './components/CicloVidaContrato';
import { colorEstadoContrato } from './components/contrato.helpers';
import ContratoFirmaExperience from './components/ContratoFirmaExperience';
import ResumenContrato from './components/ResumenContrato';
import TabCondiciones from './components/TabCondiciones';
import TabCotizaciones from './components/TabCotizaciones';
import TabDocumento from './components/TabDocumento';
import TabHistorial from './components/TabHistorial';
import TabLicencias from './components/TabLicencias';
import TabServicios from './components/TabServicios';
import TabUsuarios from './components/TabUsuarios';
import TabVisitas from './components/TabVisitas';
import DetalleConfidencialidadContrato from './modals/DetalleConfidencialidadContrato';
import ModalEditarDatosGenerales from './modals/ModalEditarDatosGenerales';

const PAGO_LABEL: Record<string, string> = {
    mensual: 'Mensual',
    anual: 'Anual',
    pago_unico: 'Pago unico',
};

const PAGO_VENTA_LABEL: Record<string, string> = {
    contado: 'Contado',
    cuotas: 'Cuotas',
};

const getFormaPagoLabel = (contrato: IContratoEmpresaCliente) => {
    if (contrato.tipo === 'venta') {
        return (
            contrato.resumen_comercial?.forma_pago_venta_label ||
            (contrato.forma_pago_venta ? PAGO_VENTA_LABEL[contrato.forma_pago_venta] : null) ||
            'Contado'
        );
    }

    return PAGO_LABEL[contrato.forma_pago_contractual] || contrato.forma_pago_contractual || '—';
};

// ── Componente Principal ──

const DetalleContrato = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { clienteId, contratoId } = useParams<{ clienteId: string; contratoId: string }>();
    const [searchParams] = useSearchParams();

    // ── RTK Query ──
    const {
        data: contrato,
        isLoading,
        isError,
    } = useGetDetalleContratoQuery(contratoId!, { skip: !contratoId });

    const { data: listaLicencias = [] } = useGetLicenciasCatalogoQuery();
    const { data: listaVisitas = [] } = useGetVisitasCatalogoQuery();

    const [cambiarEstado] = useCambiarEstadoContratoMutation();
    const [renovarContrato] = useRenovarContratoMutation();
    const [deleteContrato] = useDeleteContratoMutation();
    const [enviarAprobacionContrato] = useEnviarAprobacionContratoMutation();
    const [reenviarAprobacionContrato] = useReenviarAprobacionContratoMutation();
    const [volverContratoABorrador] = useVolverContratoABorradorMutation();
    const [enviarAFirmaContrato] = useEnviarAFirmaContratoMutation();
    const [reenviarAFirmaContrato] = useReenviarAFirmaContratoMutation();

    // ── Redux legacy (catálogos sin migrar) ──
    const { listaContentType } = useAppSelector((state) => state.core);

    // ── Hook de permisos ──
    const {
        puedeEditar,
        puedeActivar,
        puedeSuspender,
        puedeFinalizar,
        puedeRenovar,
    } = useEstadoContrato(contrato ?? null);
    const firmaPrestadoraDisponible = Boolean(contrato?.datos_empresa.firma_empresa);
    const tieneConfidencialidad = Boolean(contrato?.firmas_confidencialidad.length);
    const ultimoEnvioAprobacionDeprecado = Boolean(contrato?.ultimo_envio_aprobacion?.deprecado);

    // ── Estado local ──
    const [modalEliminar, setModalEliminar] = useState(false);
    const [modalEditarDatos, setModalEditarDatos] = useState(false);
    const [modalVolverBorrador, setModalVolverBorrador] = useState(false);
    const [firmaModalOpen, setFirmaModalOpen] = useState(false);
    const clientTab = searchParams.get('tab') || 'contratos';

    // ── Cargar catálogos legacy al montar ──
    useEffect(() => {
        if (listaContentType.length === 0) {
            dispatch(listaContentTypeThunk());
        }
    }, []);

    // ── Acciones de estado ──
    const handleCambiarEstado = async (nuevoEstado: string) => {
        if (!contrato) return;
        try {
            await cambiarEstado({ id: contrato.id, estado: nuevoEstado }).unwrap();
            toast.success(`Estado cambiado a ${nuevoEstado}`, { autoClose: 1500 });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error) || 'Error al cambiar estado');
        }
    };

    const handleRenovar = async () => {
        if (!contrato) return;
        try {
            const nuevo = await renovarContrato({ id: contrato.id }).unwrap();
            toast.success('Contrato renovado correctamente');
            navigate(
                `/empresa/detalle-cliente/${clienteId}/contrato/${nuevo.id}`,
                { replace: true },
            );
        } catch (error: unknown) {
            toast.error(getErrorMessage(error) || 'Error al renovar contrato');
        }
    };

    const handleEliminar = async () => {
        if (!contrato) return;
        try {
            await deleteContrato(contrato.id).unwrap();
            toast.success('Contrato eliminado');
            navigate(`/empresa/detalle-cliente/${clienteId}`);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error) || 'Error al eliminar el contrato');
        } finally {
            setModalEliminar(false);
        }
    };

    const handleEnviarAprobacion = async () => {
        if (!contrato) return;
        try {
            await enviarAprobacionContrato(contrato.id).unwrap();
            toast.success('Borrador enviado a aprobación del cliente');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleReenviarAprobacion = async () => {
        if (!contrato) return;
        try {
            await reenviarAprobacionContrato(contrato.id).unwrap();
            toast.success('Aprobación reenviada al cliente');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleVolverABorrador = async () => {
        if (!contrato) return;
        try {
            const response = await volverContratoABorrador(contrato.id).unwrap();
            toast.success(
                `${response.detail} ${response.envios_deprecados} enlace(s) invalidado(s).`,
            );
            setModalVolverBorrador(false);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleEnviarFirma = async () => {
        if (!contrato) return;
        try {
            await enviarAFirmaContrato(contrato.id).unwrap();
            toast.success('Contrato enviado a firma');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleReenviarFirma = async () => {
        if (!contrato) return;
        try {
            await reenviarAFirmaContrato(contrato.id).unwrap();
            toast.success('Firma reenviada al cliente');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    // ── Guards ──
    if (!contratoId) {
        return (
            <PageWrapper>
                <Container>
                    <p>ID de contrato no válido</p>
                </Container>
            </PageWrapper>
        );
    }

    if (isLoading) {
        return (
            <PageWrapper>
                <Container>
                    <div className='flex items-center justify-center py-12'>
                        <span className='text-lg'>Cargando contrato...</span>
                    </div>
                </Container>
            </PageWrapper>
        );
    }

    if (isError || !contrato) {
        return (
            <PageWrapper>
                <Container>
                    <Card>
                        <CardBody>
                            <p className='text-red-500'>
                                No se pudo cargar el contrato. Verifique que el ID es válido.
                            </p>
                            <Button
                                className='mt-4'
                                icon='HeroArrowSmallLeft'
                                onClick={() => navigate(-1)}>
                                Volver
                            </Button>
                        </CardBody>
                    </Card>
                </Container>
            </PageWrapper>
        );
    }

    // ── Acciones pendientes por estado ──
    const pendientes: { label: string; cumplido: boolean }[] = [];
    if (['borrador', 'cambios_solicitados'].includes(contrato.estado)) {
        pendientes.push({
            label: 'Destinatario principal definido',
            cumplido: Boolean(contrato.destinatario_principal),
        });
    }
    if (contrato.estado === 'aprobado_cliente') {
        pendientes.push({
            label: 'Firma de la empresa configurada',
            cumplido: firmaPrestadoraDisponible,
        });
    }

    return (
        <PageWrapper isProtectedRoute title={`Contrato: ${contrato.nombre}`}>
            {/* ── Subheader ── */}
            <Subheader>
                <SubheaderLeft>
                    <Button
                        icon='HeroArrowSmallLeft'
                        onClick={() =>
                            navigate(`/empresa/detalle-cliente/${clienteId}?tab=${clientTab}`)
                        }
                    />
                    <h4 className='font-bold'>
                        {contrato.nombre}{' '}
                        <span className='text-zinc-500'>#{contrato.id}</span>
                    </h4>
                    <Badge variant='solid' color={colorEstadoContrato(contrato.estado)}>
                        {contrato.estado_label}
                    </Badge>
                    {contrato.requiere_nda && (
                        <Badge variant='outline' color='amber'>
                            Requiere NDA
                        </Badge>
                    )}
                </SubheaderLeft>
                <SubheaderRight>{null}</SubheaderRight>
            </Subheader>

            {/* ── Ciclo de vida ── */}
            <Container className='pb-0'>
                <Breadcrumb
                    path={`Clientes / ${contrato.datos_cliente.nombre}`}
                    currentPage={`Contrato #${contrato.id}`}
                />
            </Container>
            <Container className='pb-0 pt-2'>
                <CicloVidaContrato estado={contrato.estado} />
            </Container>

            {/* ── Resumen operativo ── */}
            <Container className='pb-0 pt-2'>
                <ResumenContrato contrato={contrato} />
            </Container>
            <Container className='pb-0 pt-2'>
                <Card>
                    <CardBody className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                        <div>
                            <div className='text-xl font-bold text-blue-500'>
                                {contrato.nombre}{' '}
                                <span className='text-base font-medium text-zinc-500'>#{contrato.id}</span>
                            </div>
                        </div>
                        <div className='flex flex-wrap items-center gap-2'>
                            {puedeActivar && (
                                <Button
                                    variant='solid'
                                    color='emerald'
                                    icon='HeroCheck'
                                    onClick={() => handleCambiarEstado('activo')}>
                                    Activar
                                </Button>
                            )}
                            {['borrador', 'cambios_solicitados'].includes(contrato.estado) && (
                                <Button
                                    variant='solid'
                                    color='blue'
                                    icon='HeroPaperAirplane'
                                    onClick={handleEnviarAprobacion}>
                                    Enviar a aprobación
                                </Button>
                            )}
                            {contrato.estado === 'en_aprobacion_cliente' && (
                                <Button icon='HeroEnvelope' onClick={handleReenviarAprobacion}>
                                    Reenviar aprobación
                                </Button>
                            )}
                            {contrato.estado === 'en_aprobacion_cliente' && (
                                <Button
                                    variant='solid'
                                    color='amber'
                                    icon='HeroArrowUturnLeft'
                                    onClick={() => setModalVolverBorrador(true)}>
                                    Volver a borrador
                                </Button>
                            )}
                            {contrato.estado === 'aprobado_cliente' && (
                                <Button
                                    icon='HeroDocumentText'
                                    onClick={async () => {
                                        try {
                                            const response = await ApiService.fetchData<Blob>({
                                                url: `/api/contratos/${contrato.id}/preview-firma/pdf/`,
                                                method: 'get',
                                                responseType: 'blob',
                                            });
                                            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                                            window.open(url, '_blank', 'noopener,noreferrer');
                                        } catch (err: unknown) {
                                            toast.error(getErrorMessage(err));
                                        }
                                    }}>
                                    Ver PDF del contrato
                                </Button>
                            )}
                            {contrato.estado === 'aprobado_cliente' && (
                                <Button
                                    variant='solid'
                                    color='blue'
                                    icon='HeroPencilSquare'
                                    isDisable={!firmaPrestadoraDisponible}
                                    onClick={handleEnviarFirma}>
                                    Enviar a firma
                                </Button>
                            )}
                            {contrato.estado === 'en_firma' && (
                                <Button
                                    icon='HeroDocumentText'
                                    onClick={async () => {
                                        try {
                                            const response = await ApiService.fetchData<Blob>({
                                                url: `/api/contratos/${contrato.id}/preview-firma/pdf/`,
                                                method: 'get',
                                                responseType: 'blob',
                                            });
                                            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                                            window.open(url, '_blank', 'noopener,noreferrer');
                                        } catch (err: unknown) {
                                            toast.error(getErrorMessage(err));
                                        }
                                    }}>
                                    Ver PDF enviado
                                </Button>
                            )}
                            {contrato.estado === 'en_firma' && (
                                <Button icon='HeroEnvelope' onClick={handleReenviarFirma}>
                                    Reenviar firma
                                </Button>
                            )}
                            {contrato.estado === 'en_firma' && (
                                <Button
                                    variant='solid'
                                    color='emerald'
                                    icon='HeroPencilSquare'
                                    onClick={() => setFirmaModalOpen(true)}>
                                    Firmar contrato
                                </Button>
                            )}
                            {puedeSuspender && (
                                <Tooltip text='Suspender contrato'>
                                    <Button
                                        variant='solid'
                                        color='amber'
                                        icon='HeroPause'
                                        onClick={() => handleCambiarEstado('suspendido')}>
                                        Suspender
                                    </Button>
                                </Tooltip>
                            )}
                            {puedeFinalizar && (
                                <Tooltip text='Finalizar contrato'>
                                    <Button
                                        variant='solid'
                                        color='amber'
                                        icon='HeroXMark'
                                        onClick={() => handleCambiarEstado('finalizado')}>
                                        Finalizar
                                    </Button>
                                </Tooltip>
                            )}
                            {puedeRenovar && (
                                <Button icon='HeroArrowPath' onClick={handleRenovar}>
                                    Renovar
                                </Button>
                            )}
                            {puedeEditar && (
                                <Button
                                    variant='solid'
                                    color='amber'
                                    icon='HeroPencil'
                                    onClick={() => setModalEditarDatos(true)}>
                                    Editar datos
                                </Button>
                            )}
                            {puedeEditar && (
                                <Tooltip text='Eliminar contrato'>
                                    <Button
                                        variant='solid'
                                        color='red'
                                        icon='HeroTrash'
                                        onClick={() => setModalEliminar(true)}
                                    />
                                </Tooltip>
                            )}
                            <DetalleConfidencialidadContrato
                                contratoId={contrato.id}
                                empresaClienteId={contrato.empresa_cliente}
                            />
                        </div>
                    </CardBody>
                </Card>
            </Container>

            {/* ── Contenido ── */}
            <Container className='h-full w-full'>
                <div className='grid grid-cols-12 gap-4'>
                    {/* ── Cabecera del contrato ── */}
                    <Card className='col-span-full'>
                        <CardBody>
                            <div className='mb-4 flex items-center justify-between'>
                                <div className='text-xl font-bold text-blue-500'>Resumen del contrato</div>
                            </div>
                            <div className='grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3'>
                                <div className='space-y-1'>
                                    <span className='font-bold text-blue-500'>Empresa Prestadora</span>
                                    <div className='text-zinc-700 dark:text-zinc-200'>
                                        {contrato.datos_empresa.nombre}
                                    </div>
                                </div>

                                <div className='space-y-1'>
                                    <span className='font-bold text-blue-500'>Empresa Cliente</span>
                                    <div className='text-zinc-700 dark:text-zinc-200'>
                                        {contrato.datos_cliente.nombre}
                                    </div>
                                </div>

                                <div className='space-y-1'>
                                    <span className='font-bold text-blue-500'>Vigencia</span>
                                    <div className='text-zinc-700 dark:text-zinc-200'>
                                        {dayjs(contrato.fecha_inicio).format('DD/MM/YYYY')} -{' '}
                                        {contrato.fecha_fin
                                            ? dayjs(contrato.fecha_fin).format('DD/MM/YYYY')
                                            : 'Sin Fecha de Finalización'}
                                    </div>
                                </div>

                                <div className='space-y-1'>
                                    <span className='font-bold text-blue-500'>Tipo</span>
                                    <div className='text-zinc-700 dark:text-zinc-200'>
                                        {contrato.tipo_label}
                                    </div>
                                </div>

                                <div className='space-y-1'>
                                    <span className='font-bold text-blue-500'>Moneda</span>
                                    <div className='text-zinc-700 dark:text-zinc-200'>
                                        {contrato.moneda_cobro}
                                    </div>
                                </div>

                                <div className='space-y-1'>
                                    <span className='font-bold text-blue-500'>Forma de pago</span>
                                    <div className='text-zinc-700 dark:text-zinc-200'>
                                        {getFormaPagoLabel(contrato)}
                                    </div>
                                </div>

                                <div className='space-y-1'>
                                    <span className='font-bold text-blue-500'>Destinatario principal</span>
                                    <div className='text-zinc-700 dark:text-zinc-200'>
                                        {contrato.destinatario_principal?.nombre_display ?? 'Sin definir'}
                                        {contrato.destinatario_principal?.correo_display
                                            ? ` (${contrato.destinatario_principal.correo_display})`
                                            : ''}
                                    </div>
                                </div>

                                <div className='space-y-1'>
                                    <span className='font-bold text-blue-500'>Aprobación del cliente</span>
                                    <div className='text-zinc-700 dark:text-zinc-200'>
                                        {ultimoEnvioAprobacionDeprecado
                                            ? 'Enlace invalidado'
                                            : contrato.ultimo_envio_aprobacion?.respondido
                                                ? contrato.ultimo_envio_aprobacion.aprobado
                                                    ? 'Aprobada'
                                                    : 'Rechazada'
                                                : contrato.ultimo_envio_aprobacion?.enviado
                                                    ? 'Pendiente'
                                                    : 'No enviada'}
                                    </div>
                                </div>

                                <div className='space-y-1'>
                                    <span className='font-bold text-blue-500'>Firma</span>
                                    <div className='text-zinc-700 dark:text-zinc-200'>
                                        {contrato.ultimo_envio_firma?.firmado
                                            ? 'Firmado'
                                            : contrato.ultimo_envio_firma?.enviado
                                                ? 'Pendiente'
                                                : 'No enviada'}
                                    </div>
                                </div>

                                {contrato.ultimo_comentario_cliente && (
                                    <div className='col-span-full space-y-1'>
                                        <span className='font-bold text-blue-500'>Comentario del cliente</span>
                                        <div className='text-zinc-700 dark:text-zinc-200'>
                                            {contrato.ultimo_comentario_cliente}
                                        </div>
                                    </div>
                                )}

                                {contrato.contrato_anterior_detalle && (
                                    <div className='col-span-full space-y-1'>
                                        <span className='font-bold text-blue-500'>Renovación de</span>
                                        <div>
                                            <Button
                                                variant='default'
                                                size='xs'
                                                className='!px-0 text-blue-600 underline hover:text-blue-800'
                                                onClick={() =>
                                                    navigate(
                                                        `/empresa/detalle-cliente/${clienteId}/contrato/${contrato.contrato_anterior_detalle!.id}`,
                                                    )
                                                }>
                                                {contrato.contrato_anterior_detalle.nombre} #{contrato.contrato_anterior_detalle.id}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {contrato.renovaciones_detalle && contrato.renovaciones_detalle.length > 0 && (
                                    <div className='col-span-full space-y-1'>
                                        <span className='font-bold text-blue-500'>Renovado en</span>
                                        <div className='text-zinc-700 dark:text-zinc-200'>
                                            {contrato.renovaciones_detalle.map((r, idx) => (
                                                <span key={r.id}>
                                                    {idx > 0 && ', '}
                                                    <Button
                                                        variant='default'
                                                        size='xs'
                                                        className='!px-0 text-blue-600 underline hover:text-blue-800'
                                                        onClick={() =>
                                                            navigate(
                                                                `/empresa/detalle-cliente/${clienteId}/contrato/${r.id}`,
                                                            )
                                                        }>
                                                        {r.nombre} #{r.id}
                                                    </Button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                        <CardFooter className='border border-x-0 border-b-0 border-t-black pt-2'>
                            <CardFooterChild className='w-full'>
                                <div className='h-full w-full'>
                                    <span className='font-bold text-blue-500'>
                                        Observaciones:{' '}
                                    </span>
                                    {contrato.observaciones}
                                </div>
                            </CardFooterChild>
                        </CardFooter>
                    </Card>

                    {/* ── Secciones del contrato — orden canónico ── */}
                    <div className='col-span-full grid grid-cols-12 gap-4'>
                        <div className='col-span-full lg:col-span-8 flex flex-col gap-4'>
                            <TabLicencias
                                detalleContratoEmpresaCliente={contrato}
                                puedeEditar={puedeEditar}
                                listaLicencias={listaLicencias}
                            />
                            <TabCotizaciones
                                detalleContratoEmpresaCliente={contrato}
                                puedeEditar={puedeEditar}
                            />
                            {contrato.tipo !== 'licencia' && (
                                <TabServicios
                                    detalleContratoEmpresaCliente={contrato}
                                    puedeEditar={puedeEditar}
                                    listaContentType={listaContentType}
                                />
                            )}
                            <TabUsuarios
                                detalleContratoEmpresaCliente={contrato}
                                puedeEditar={puedeEditar}
                            />
                            <TabCondiciones
                                detalleContratoEmpresaCliente={contrato}
                                puedeEditar={puedeEditar}
                            />
                            <TabDocumento
                                contrato={contrato}
                                puedeEditar={puedeEditar}
                            />
                        </div>
                        <div className='col-span-full lg:col-span-4 flex flex-col gap-4'>
                            <TabVisitas
                                detalleContratoEmpresaCliente={contrato}
                                puedeEditar={puedeEditar}
                                listaVisitas={listaVisitas}
                            />
                            <TabHistorial contratoId={contrato.id} />
                        </div>
                    </div>
                </div>
            </Container>
            {/* ── Modal editar datos generales ── */}
            {contrato && (
                <ModalEditarDatosGenerales
                    contrato={contrato}
                    isOpen={modalEditarDatos}
                    setIsOpen={setModalEditarDatos}
                />
            )}
            {/* ── Modal de confirmación de eliminación ── */}
            <Modal isOpen={modalVolverBorrador} setIsOpen={setModalVolverBorrador}>
                <ModalHeader>Volver contrato a borrador</ModalHeader>
                <ModalBody className='space-y-4'>
                    <p>
                        Esta accion sacara el contrato de <strong>Revision cliente</strong> y lo
                        devolvera a <strong>Borrador</strong>.
                    </p>
                    <div className='rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900'>
                        <p className='font-semibold'>Advertencias importantes</p>
                        <ul className='mt-2 list-disc space-y-1 pl-5'>
                            <li>El enlace enviado al cliente quedara invalidado inmediatamente.</li>
                            <li>El cliente no podra aprobar ni rechazar usando el correo anterior.</li>
                            <li>El contrato volvera a ser editable desde esta vista.</li>
                            <li>Despues de corregir destinatario o contenido, deberas reenviar una nueva aprobacion.</li>
                        </ul>
                    </div>
                    <div className='rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700'>
                        <p>
                            <strong>Destinatario actual:</strong>{' '}
                            {contrato.destinatario_principal?.correo_display || 'Sin definir'}
                        </p>
                        <p>
                            <strong>Version del ultimo envio:</strong>{' '}
                            {contrato.ultimo_envio_aprobacion?.version_envio || 'Sin envio'}
                        </p>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button color='zinc' onClick={() => setModalVolverBorrador(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            color='amber'
                            icon='HeroArrowUturnLeft'
                            onClick={handleVolverABorrador}>
                            Volver a borrador e invalidar enlace
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
            <Modal isOpen={modalEliminar} setIsOpen={setModalEliminar}>
                <ModalHeader>Eliminar Contrato</ModalHeader>
                <ModalBody>
                    <p>
                        ¿Estás seguro de que deseas eliminar el contrato{' '}
                        <strong>{contrato?.nombre}</strong>? Esta acción no se puede deshacer.
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={() => setModalEliminar(false)}>Cancelar</Button>
                    <Button
                        variant='solid'
                        color='red'
                        icon='HeroTrash'
                        onClick={handleEliminar}>
                        Eliminar
                    </Button>
                </ModalFooter>
            </Modal>
            {/* Modal de firma interna */}
            {firmaModalOpen && contrato && (
                <FirmaInternaModal
                    isOpen={firmaModalOpen}
                    setIsOpen={setFirmaModalOpen}
                    contratoId={contrato.id}
                />
            )}
        </PageWrapper>
    );
};

const FirmaInternaModal = ({
    isOpen,
    setIsOpen,
    contratoId,
}: {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    contratoId: number;
}) => {
    const { data: detalle, isLoading } = useGetPreviewFirmaContratoQuery(contratoId);
    const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);

    useEffect(() => {
        let objectUrl: string | null = null;
        const loadPdf = async () => {
            setPdfLoading(true);
            setPdfError(null);
            try {
                const response = await ApiService.fetchData<Blob>({
                    url: `/api/contratos/${contratoId}/preview-firma/pdf/`,
                    method: 'get',
                    responseType: 'blob',
                });
                objectUrl = window.URL.createObjectURL(response.data);
                setPdfObjectUrl((currentUrl) => {
                    if (currentUrl) window.URL.revokeObjectURL(currentUrl);
                    return objectUrl;
                });
            } catch (err: unknown) {
                setPdfError(getErrorMessage(err));
            } finally {
                setPdfLoading(false);
            }
        };
        loadPdf();
        return () => {
            if (objectUrl) window.URL.revokeObjectURL(objectUrl);
        };
    }, [contratoId]);

    const descargarPdf = () => {
        if (!pdfObjectUrl) return;
        const link = document.createElement('a');
        link.href = pdfObjectUrl;
        link.download = `Contrato_firma_${contratoId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const abrirPdf = () => {
        if (!pdfObjectUrl) return;
        window.open(pdfObjectUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} fullScreen isScrollable>
            <ModalHeader>Firma del contrato</ModalHeader>
            <ModalBody>
                {isLoading && (
                    <div className='flex items-center justify-center py-12'>
                        <p className='text-sm text-zinc-500'>Cargando vista previa de firma...</p>
                    </div>
                )}
                {!isLoading && detalle && (
                    <Container className='py-4'>
                        <ContratoFirmaExperience
                            detalle={detalle}
                            mode='preview'
                            pdfObjectUrl={pdfObjectUrl}
                            pdfLoading={pdfLoading}
                            pdfError={pdfError}
                            onDownloadPdf={descargarPdf}
                            onOpenPdf={abrirPdf}
                        />
                    </Container>
                )}
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

export default DetalleContrato;
