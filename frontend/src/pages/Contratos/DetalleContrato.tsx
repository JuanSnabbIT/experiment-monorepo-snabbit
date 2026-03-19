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
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { useEstadoContrato } from '@/hooks/useEstadoContrato';
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
    useGetVisitasCatalogoQuery,
    useReenviarAFirmaContratoMutation,
    useReenviarAprobacionContratoMutation,
    useRenovarContratoMutation,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import CicloVidaContrato from './components/CicloVidaContrato';
import { colorEstadoContrato } from './components/contrato.helpers';
import ResumenContrato from './components/ResumenContrato';
import TabCondiciones from './components/TabCondiciones';
import TabHistorial from './components/TabHistorial';
import TabLicencias from './components/TabLicencias';
import TabServicios from './components/TabServicios';
import TabUsuarios from './components/TabUsuarios';
import TabVisitas from './components/TabVisitas';
import DetalleConfidencialidadContrato from './modals/DetalleConfidencialidadContrato';
import ModalEditarDatosGenerales from './modals/ModalEditarDatosGenerales';

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

    const { data: listaVisitas = [] } = useGetVisitasCatalogoQuery();
    const { data: listaLicencias = [] } = useGetLicenciasCatalogoQuery();

    const [cambiarEstado] = useCambiarEstadoContratoMutation();
    const [renovarContrato] = useRenovarContratoMutation();
    const [deleteContrato] = useDeleteContratoMutation();
    const [enviarAprobacionContrato] = useEnviarAprobacionContratoMutation();
    const [reenviarAprobacionContrato] = useReenviarAprobacionContratoMutation();
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

    // ── Estado local ──
    const [modalEliminar, setModalEliminar] = useState(false);
    const [modalEditarDatos, setModalEditarDatos] = useState(false);
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
                            <div className='text-sm font-semibold text-zinc-700 dark:text-zinc-300'>
                                Operacion del contrato
                            </div>
                            <div className='text-xs text-zinc-500'>
                                Centraliza aqui los cambios de estado y las acciones principales.
                            </div>
                            {contrato && (
                                <div className='mt-2 flex flex-wrap gap-2 text-xs'>
                                    <span className='rounded-full bg-zinc-100 px-2 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'>
                                        Firma prestadora:{' '}
                                        {firmaPrestadoraDisponible ? 'configurada' : 'faltante'}
                                    </span>
                                    <span className='rounded-full bg-zinc-100 px-2 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'>
                                        Confidencialidad:{' '}
                                        {tieneConfidencialidad ? 'asociada' : 'sin acuerdos'}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className='flex flex-wrap items-center gap-2'>
                            {puedeActivar && (
                                <Button
                                    variant='solid'
                                    icon='HeroCheck'
                                    onClick={() => handleCambiarEstado('activo')}>
                                    Activar
                                </Button>
                            )}
                            {['borrador', 'cambios_solicitados'].includes(contrato.estado) && (
                                <Button
                                    variant='solid'
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
                            {puedeSuspender && (
                                <Tooltip text='Suspender contrato'>
                                    <Button
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
                                    icon='HeroPencil'
                                    onClick={() => setModalEditarDatos(true)}>
                                    Editar datos
                                </Button>
                            )}
                            {puedeEditar && (
                                <Tooltip text='Eliminar contrato'>
                                    <Button
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
                            <div className='grid grid-cols-5 gap-4'>
                                <div className='col-span-3 flex flex-col gap-2'>
                                    {/* Nombre */}
                                    <div className='text-xl font-bold text-blue-500'>
                                        {contrato.nombre}{' '}
                                        #{contrato.id}
                                    </div>

                                    {/* Empresa Prestadora */}
                                    <div>
                                        <span className='font-bold text-blue-500'>
                                            Empresa Prestadora:{' '}
                                        </span>
                                        {contrato.datos_empresa.nombre}
                                    </div>

                                    {/* Empresa Cliente */}
                                    <div>
                                        <span className='font-bold text-blue-500'>
                                            Empresa Cliente:{' '}
                                        </span>
                                        {contrato.datos_cliente.nombre}
                                    </div>

                                    {/* Vigencia */}
                                    <div>
                                        <span className='font-bold text-blue-500'>
                                            Vigencia:{' '}
                                        </span>
                                        {dayjs(contrato.fecha_inicio).format('DD/MM/YYYY')}{' '}
                                        -{' '}
                                        {contrato.fecha_fin
                                            ? dayjs(contrato.fecha_fin).format('DD/MM/YYYY')
                                            : 'Sin Fecha de Finalización'}
                                    </div>

                                    {/* Tipo */}
                                    <div>
                                        <span className='font-bold text-blue-500'>Tipo: </span>
                                        {contrato.tipo_label}
                                    </div>

                                    <div>
                                        <span className='font-bold text-blue-500'>
                                            Destinatario principal:{' '}
                                        </span>
                                        {contrato.destinatario_principal?.nombre_display ?? 'Sin definir'}
                                        {contrato.destinatario_principal?.correo_display
                                            ? ` (${contrato.destinatario_principal.correo_display})`
                                            : ''}
                                    </div>

                                    <div>
                                        <span className='font-bold text-blue-500'>
                                            Aprobación del cliente:{' '}
                                        </span>
                                        {contrato.ultimo_envio_aprobacion?.respondido
                                            ? contrato.ultimo_envio_aprobacion.aprobado
                                                ? 'Aprobada'
                                                : 'Rechazada'
                                            : contrato.ultimo_envio_aprobacion?.enviado
                                              ? 'Pendiente'
                                              : 'No enviada'}
                                    </div>

                                    <div>
                                        <span className='font-bold text-blue-500'>Firma: </span>
                                        {contrato.ultimo_envio_firma?.firmado
                                            ? 'Firmado'
                                            : contrato.ultimo_envio_firma?.enviado
                                              ? 'Pendiente'
                                              : 'No enviada'}
                                    </div>

                                    {contrato.ultimo_comentario_cliente && (
                                        <div>
                                            <span className='font-bold text-blue-500'>
                                                Comentario del cliente:{' '}
                                            </span>
                                            {contrato.ultimo_comentario_cliente}
                                        </div>
                                    )}

                                    {contrato.contrato_anterior_detalle && (
                                        <div>
                                            <span className='font-bold text-blue-500'>
                                                Renovación de:{' '}
                                            </span>
                                            <button
                                                type='button'
                                                className='text-blue-600 underline hover:text-blue-800'
                                                onClick={() =>
                                                    navigate(
                                                        `/empresa/detalle-cliente/${clienteId}/contrato/${contrato.contrato_anterior_detalle!.id}`,
                                                    )
                                                }>
                                                {contrato.contrato_anterior_detalle.nombre} #{contrato.contrato_anterior_detalle.id}
                                            </button>
                                        </div>
                                    )}

                                    {contrato.renovaciones_detalle && contrato.renovaciones_detalle.length > 0 && (
                                        <div>
                                            <span className='font-bold text-blue-500'>
                                                Renovado en:{' '}
                                            </span>
                                            {contrato.renovaciones_detalle.map((r, idx) => (
                                                <span key={r.id}>
                                                    {idx > 0 && ', '}
                                                    <button
                                                        type='button'
                                                        className='text-blue-600 underline hover:text-blue-800'
                                                        onClick={() =>
                                                            navigate(
                                                                `/empresa/detalle-cliente/${clienteId}/contrato/${r.id}`,
                                                            )
                                                        }>
                                                        {r.nombre} #{r.id}
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Botones de acción */}
                                <div className='col-span-2 flex items-start justify-end'>
                                    <Badge
                                        variant='outline'
                                        color={colorEstadoContrato(contrato.estado)}>
                                        {contrato.estado_label}
                                    </Badge>
                                </div>
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

                    {/* ── Columna izquierda (8/12): Servicios, Condiciones, Usuarios ── */}
                    <div className='col-span-full flex flex-col gap-4 lg:col-span-8'>
                        <TabServicios
                            detalleContratoEmpresaCliente={contrato}
                            puedeEditar={puedeEditar}
                            listaContentType={listaContentType}
                        />
                        <TabCondiciones
                            detalleContratoEmpresaCliente={contrato}
                            puedeEditar={puedeEditar}
                        />
                        <TabUsuarios
                            detalleContratoEmpresaCliente={contrato}
                            puedeEditar={puedeEditar}
                        />
                    </div>

                    {/* ── Columna derecha (4/12): Visitas, Licencias, Historial ── */}
                    <div className='col-span-full flex flex-col gap-4 lg:col-span-4'>
                        <TabVisitas
                            detalleContratoEmpresaCliente={contrato}
                            puedeEditar={puedeEditar}
                            listaVisitas={listaVisitas}
                        />
                        <TabLicencias
                            detalleContratoEmpresaCliente={contrato}
                            puedeEditar={puedeEditar}
                            listaLicencias={listaLicencias}
                        />
                        <TabHistorial contratoId={contrato.id} />
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
        </PageWrapper>
    );
};

export default DetalleContrato;
