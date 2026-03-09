import Input from '@/components/form/Input';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
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
import Dropdown, { DropdownItem, DropdownMenu, DropdownToggle } from '@/components/ui/Dropdown';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { useEstadoContrato } from '@/hooks/useEstadoContrato';
import {
  listaContentTypeThunk,
  listaUsuariosTodoElClienteThunk,
  useAppDispatch,
  useAppSelector,
} from '@/store';
import {
  useCambiarEstadoContratoMutation,
  useDeleteContratoMutation,
  useGetCondicionesEspecialesQuery,
  useGetDetalleContratoQuery,
  useGetLicenciasCatalogoQuery,
  useGetVisitasCatalogoQuery,
  useRenovarContratoMutation,
  useUpdateContratoMutation,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import TabCondiciones from './components/TabCondiciones';
import TabLicencias from './components/TabLicencias';
import TabServicios from './components/TabServicios';
import TabUsuarios from './components/TabUsuarios';
import TabVisitas from './components/TabVisitas';
import { colorEstadoContrato } from './components/contrato.helpers';
import { IContratoEdicion } from './components/contrato.types';
import DetalleConfidencialidadContrato from './modals/DetalleConfidencialidadContrato';

// ── Helpers locales ──

const validationSchema = Yup.object().shape({
    nombre: Yup.string()
        .required('Requerido')
        .nonNullable('Requerido')
        .max(100, 'Máximo 100 Caracteres'),
    fecha_inicio: Yup.string().required('Requerido').nonNullable('Requerido'),
    fecha_fin: Yup.string().notRequired().nullable(),
    observaciones: Yup.string().notRequired().nullable(),
});

const initialValues: IContratoEdicion = {
    fecha_inicio: '',
    fecha_fin: '',
    observaciones: '',
    nombre: '',
    eliminar_visitas: [],
    visitas: [],
    eliminar_licencias: [],
    licencias: [],
    eliminar_condiciones: [],
    condiciones_especiales: [],
    eliminar_usuarios: [],
    usuarios_vinculados: [],
};

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

    const { data: listaCondicionesEspeciales = [] } = useGetCondicionesEspecialesQuery();
    const { data: listaVisitas = [] } = useGetVisitasCatalogoQuery();
    const { data: listaLicencias = [] } = useGetLicenciasCatalogoQuery();

    const [updateContrato] = useUpdateContratoMutation();
    const [cambiarEstado] = useCambiarEstadoContratoMutation();
    const [renovarContrato] = useRenovarContratoMutation();
    const [deleteContrato] = useDeleteContratoMutation();

    // ── Redux legacy (catálogos sin migrar) ──
    const { listaContentType } = useAppSelector((state) => state.core);
    const { listaUsuariosTodoElCliente } = useAppSelector((state) => state.empresa);

    // ── Hook de permisos ──
    const {
        puedeEditar,
        puedeActivar,
        puedeSuspender,
        puedeFinalizar,
        puedeRenovar,
    } = useEstadoContrato(contrato ?? null);

    // ── Estado local ──
    const [editando, setEditando] = useState(false);
    const [modalEliminar, setModalEliminar] = useState(false);

    // ── Cargar catálogos legacy al montar / al editar ──
    useEffect(() => {
        if (listaContentType.length === 0) {
            dispatch(listaContentTypeThunk());
        }
    }, []);

    useEffect(() => {
        if (contrato && editando) {
            dispatch(
                listaUsuariosTodoElClienteThunk({
                    id_empresa: contrato.empresa_cliente,
                }),
            );
        }
    }, [contrato, editando]);

    /**
     * Sincronizar el detalle al store legacy para que
     * DetalleConfidencialidadContrato (que lee de Redux) funcione.
     * Se removerá al migrar ese modal a RTK Query.
     */
    useEffect(() => {
        if (contrato) {
            dispatch({
                type: 'contrato/detalleContratoEmpresaClienteThunk/fulfilled',
                payload: contrato,
            });
        }
    }, [contrato]);

    // ── Formik ──
    const formik = useFormik<IContratoEdicion>({
        enableReinitialize: true,
        initialValues,
        validationSchema,
        onSubmit: async (values) => {
            if (!contrato) return;
            try {
                await updateContrato({
                    id: contrato.id,
                    data: {
                        contrato: {
                            fecha_inicio: values.fecha_inicio || null,
                            fecha_fin: values.fecha_fin || null,
                            observaciones: values.observaciones,
                            nombre: values.nombre,
                        },
                        visitas: values.visitas,
                        eliminar_visitas: values.eliminar_visitas,
                        licencias: values.licencias,
                        eliminar_licencias: values.eliminar_licencias,
                        condiciones_especiales: values.condiciones_especiales,
                        eliminar_condiciones: values.eliminar_condiciones,
                        usuarios_vinculados: values.usuarios_vinculados,
                        eliminar_usuarios: values.eliminar_usuarios,
                    },
                }).unwrap();
                setEditando(false);
                toast.success('Contrato editado', { autoClose: 1000 });
            } catch (error: unknown) {
                toast.error(getErrorMessage(error) || 'Error al actualizar el contrato', {
                    toastId: 'Error al actualizar el contrato',
                });
            }
        },
    });

    // Poblar formik al entrar en modo edición
    useEffect(() => {
        if (contrato && editando) {
            formik.setValues({
                fecha_inicio: contrato.fecha_inicio,
                fecha_fin: contrato.fecha_fin,
                observaciones: contrato.observaciones,
                nombre: contrato.nombre,
                eliminar_visitas: [],
                visitas: contrato.contrato_visitas.map((vis) => ({
                    id: vis.id,
                    cantidad: vis.cantidad,
                    frecuencia: vis.frecuencia,
                })),
                eliminar_licencias: [],
                licencias: contrato.contrato_licencias.map((lic) => ({
                    id: lic.id,
                    cantidad: lic.cantidad,
                    otro_tipo: lic.otro_tipo,
                    precio_unitario: Number(lic.precio_unitario),
                    tipo_modalidad: lic.tipo_modalidad,
                    fecha_inicio: lic.fecha_inicio,
                    fecha_fin: lic.fecha_fin,
                    tipo_moneda: lic.tipo_moneda,
                })),
                eliminar_condiciones: [],
                condiciones_especiales: contrato.contrato_condiciones_especiales.map((con) => ({
                    id: con.id,
                })),
                eliminar_usuarios: [],
                usuarios_vinculados: contrato.vinculos_contrato.map((user) => ({
                    id: user.id,
                    tipo_usuario: user.tipo_usuario,
                })),
            });
        }
    }, [contrato, editando]);

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
                    {/* Acciones de estado */}
                    <Dropdown>
                        <DropdownToggle hasIcon={false}>
                            <Button icon='HeroEllipsisVertical' />
                        </DropdownToggle>
                        <DropdownMenu placement='bottom-end'>
                            {puedeActivar && (
                                <DropdownItem
                                    icon='HeroCheck'
                                    onClick={() => handleCambiarEstado('activo')}>
                                    Activar Contrato
                                </DropdownItem>
                            )}
                            {puedeSuspender && (
                                <DropdownItem
                                    icon='HeroPause'
                                    onClick={() => handleCambiarEstado('suspendido')}>
                                    Suspender Contrato
                                </DropdownItem>
                            )}
                            {puedeFinalizar && (
                                <DropdownItem
                                    icon='HeroXMark'
                                    onClick={() => handleCambiarEstado('finalizado')}>
                                    Finalizar Contrato
                                </DropdownItem>
                            )}
                            {puedeRenovar && (
                                <DropdownItem icon='HeroArrowPath' onClick={handleRenovar}>
                                    Renovar Contrato
                                </DropdownItem>
                            )}
                            <DropdownItem
                                icon='HeroTrash'
                                className='text-red-500'
                                onClick={() => setModalEliminar(true)}>
                                Eliminar Contrato
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </SubheaderRight>
            </Subheader>

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
                                        {editando ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.nombre}
                                                invalidFeedback={formik.errors.nombre}>
                                                <Input
                                                    name='nombre'
                                                    className='mr-2 max-w-[180px] md:max-w-[250px]'
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                    value={formik.values.nombre}
                                                />
                                            </Validation>
                                        ) : (
                                            <>
                                                {contrato.nombre}{' '}
                                            </>
                                        )}
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
                                        {editando ? (
                                            <div className='flex flex-wrap gap-4'>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.fecha_inicio}
                                                    invalidFeedback={formik.errors.fecha_inicio}>
                                                    <Input
                                                        name='fecha_inicio'
                                                        type='date'
                                                        className='max-w-[150px]'
                                                        onChange={formik.handleChange}
                                                        onBlur={formik.handleBlur}
                                                        value={formik.values.fecha_inicio}
                                                    />
                                                </Validation>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.fecha_fin}
                                                    invalidFeedback={formik.errors.fecha_fin}>
                                                    <Input
                                                        name='fecha_fin'
                                                        type='date'
                                                        className='max-w-[150px]'
                                                        onChange={formik.handleChange}
                                                        onBlur={formik.handleBlur}
                                                        value={formik.values.fecha_fin ?? ''}
                                                    />
                                                </Validation>
                                                <Badge
                                                    className='ml-2'
                                                    variant='solid'
                                                    color={colorEstadoContrato(contrato.estado)}>
                                                    {contrato.estado_label}
                                                </Badge>
                                            </div>
                                        ) : (
                                            <>
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
                                            </>
                                        )}
                                    </div>

                                    {/* Tipo */}
                                    <div>
                                        <span className='font-bold text-blue-500'>Tipo: </span>
                                        {contrato.tipo_label}
                                    </div>
                                </div>

                                {/* Botones de acción */}
                                <div className='col-span-2 flex flex-wrap items-center justify-center gap-4'>
                                    {editando ? (
                                        <>
                                            <Button
                                                className='hidden md:flex'
                                                variant='solid'
                                                color='red'
                                                icon='HeroXMark'
                                                onClick={() => setEditando(false)}>
                                                Cancelar Edición
                                            </Button>
                                            <Button
                                                className='hidden md:flex'
                                                variant='solid'
                                                color='emerald'
                                                icon='HeroCheck'
                                                onClick={() => formik.handleSubmit()}>
                                                Guardar Edición
                                            </Button>
                                            <Button
                                                className='md:hidden'
                                                variant='solid'
                                                color='red'
                                                icon='HeroXMark'
                                                onClick={() => setEditando(false)}
                                            />
                                            <Button
                                                className='md:hidden'
                                                variant='solid'
                                                color='emerald'
                                                icon='HeroCheck'
                                                onClick={() => formik.handleSubmit()}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            {puedeEditar && (
                                                <>
                                                    <Button
                                                        className='hidden md:flex'
                                                        variant='solid'
                                                        icon='HeroPencil'
                                                        onClick={() => setEditando(true)}>
                                                        Editar Contrato
                                                    </Button>
                                                    <Button
                                                        className='md:hidden'
                                                        variant='solid'
                                                        icon='HeroPencil'
                                                        onClick={() => setEditando(true)}
                                                    />
                                                </>
                                            )}
                                        </>
                                    )}
                                    <DetalleConfidencialidadContrato />
                                </div>
                            </div>
                        </CardBody>
                        <CardFooter className='border border-x-0 border-b-0 border-t-black pt-2'>
                            <CardFooterChild className='w-full'>
                                <div className='h-full w-full'>
                                    <span className='font-bold text-blue-500'>
                                        Observaciones:{' '}
                                    </span>
                                    {editando ? (
                                        <Validation
                                            isValid={formik.isValid}
                                            isTouched={formik.touched.observaciones}
                                            invalidFeedback={formik.errors.observaciones}>
                                            <Textarea
                                                name='observaciones'
                                                rows={4}
                                                onChange={formik.handleChange}
                                                onBlur={formik.handleBlur}
                                                value={formik.values.observaciones ?? ''}
                                            />
                                        </Validation>
                                    ) : (
                                        <>{contrato.observaciones}</>
                                    )}
                                </div>
                            </CardFooterChild>
                        </CardFooter>
                    </Card>

                    {/* ── Columna izquierda (8/12): Servicios, Condiciones, Usuarios ── */}
                    <div className='col-span-full flex flex-col gap-4 lg:col-span-8'>
                        <TabServicios
                            formik={formik}
                            editando={editando}
                            detalleContratoEmpresaCliente={contrato}
                            listaContentType={listaContentType}
                        />
                        <TabCondiciones
                            formik={formik}
                            editando={editando}
                            detalleContratoEmpresaCliente={contrato}
                            listaCondicionesEspeciales={listaCondicionesEspeciales}
                        />
                        <TabUsuarios
                            formik={formik}
                            editando={editando}
                            detalleContratoEmpresaCliente={contrato}
                            listaUsuariosTodoElCliente={listaUsuariosTodoElCliente}
                        />
                    </div>

                    {/* ── Columna derecha (4/12): Visitas, Licencias ── */}
                    <div className='col-span-full flex flex-col gap-4 lg:col-span-4'>
                        <TabVisitas
                            formik={formik}
                            editando={editando}
                            detalleContratoEmpresaCliente={contrato}
                            listaVisitas={listaVisitas}
                        />
                        <TabLicencias
                            formik={formik}
                            editando={editando}
                            detalleContratoEmpresaCliente={contrato}
                            listaLicencias={listaLicencias}
                        />
                    </div>
                </div>
            </Container>
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
