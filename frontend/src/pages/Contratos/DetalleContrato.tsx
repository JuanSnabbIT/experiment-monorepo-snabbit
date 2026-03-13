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
import {
    listaContentTypeThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import {
    useCambiarEstadoContratoMutation,
    useDeleteContratoMutation,
    useGetDetalleContratoQuery,
    useGetLicenciasCatalogoQuery,
    useGetVisitasCatalogoQuery,
    useRenovarContratoMutation,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import CicloVidaContrato from './components/CicloVidaContrato';
import { colorEstadoContrato } from './components/contrato.helpers';
import ResumenContrato from './components/ResumenContrato';
import TabCondiciones from './components/TabCondiciones';
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

    // ── Estado local ──
    const [modalEliminar, setModalEliminar] = useState(false);
    const [modalEditarDatos, setModalEditarDatos] = useState(false);

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
                        onClick={() => navigate(`/empresa/detalle-cliente/${clienteId}`)}
                    />
                    <h4 className='font-bold'>
                        {contrato.nombre}{' '}
                        <span className='text-zinc-500'>#{contrato.id}</span>
                    </h4>
                    <Badge variant='solid' color={colorEstadoContrato(contrato.estado)}>
                        {contrato.estado_label}
                    </Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    {puedeActivar && (
                        <Button
                            variant='solid'
                            icon='HeroCheck'
                            onClick={() => handleCambiarEstado('activo')}>
                            Activar
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
                        <Tooltip text='Eliminar contrato'>
                            <Button
                                color='red'
                                icon='HeroTrash'
                                onClick={() => setModalEliminar(true)}
                            />
                        </Tooltip>
                    )}
                </SubheaderRight>
            </Subheader>

            {/* ── Ciclo de vida ── */}
            <Container className='pb-0'>
                <CicloVidaContrato estado={contrato.estado} />
            </Container>

            {/* ── Resumen operativo ── */}
            <Container className='pb-0 pt-2'>
                <ResumenContrato contrato={contrato} />
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
                                        <Badge
                                            className='ml-2'
                                            variant='solid'
                                            color={colorEstadoContrato(contrato.estado)}>
                                            {contrato.estado_label}
                                        </Badge>
                                    </div>

                                    {/* Tipo */}
                                    <div>
                                        <span className='font-bold text-blue-500'>Tipo: </span>
                                        {contrato.tipo_label}
                                    </div>
                                </div>

                                {/* Botones de acción */}
                                <div className='col-span-2 flex flex-wrap items-center justify-center gap-4'>
                                    {puedeEditar && (
                                        <>
                                            <Button
                                                className='hidden md:flex'
                                                variant='solid'
                                                icon='HeroPencil'
                                                onClick={() => setModalEditarDatos(true)}>
                                                Editar Datos
                                            </Button>
                                            <Button
                                                className='md:hidden'
                                                variant='solid'
                                                icon='HeroPencil'
                                                onClick={() => setModalEditarDatos(true)}
                                            />
                                        </>
                                    )}
                                    <DetalleConfidencialidadContrato contratoId={contrato.id} empresaClienteId={contrato.empresa_cliente} />
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

                    {/* ── Columna derecha (4/12): Visitas, Licencias ── */}
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
