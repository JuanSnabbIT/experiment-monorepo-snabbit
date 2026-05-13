import Input from '@/components/form/Input';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, {
    CardBody,
    CardFooter,
    CardFooterChild,
    CardHeader,
    CardHeaderChild,
} from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import TabCondiciones from '@/pages/Contratos/components/TabCondiciones';
import TabLicencias from '@/pages/Contratos/components/TabLicencias';
import TabServicios from '@/pages/Contratos/components/TabServicios';
import TabUsuarios from '@/pages/Contratos/components/TabUsuarios';
import { IContratoEdicion } from '@/pages/Contratos/components/contrato.types';
import DetalleConfidencialidadContrato from '@/pages/Contratos/modals/DetalleConfidencialidadContrato';
import ApiService from '@/services/ApiService';
import {
    listaContentTypeThunk,
    listaLicenciasThunk,
    listaUsuariosTodoElClienteThunk,
    listaVisitasThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { useGetDetalleContratoQuery } from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

// ── Helpers ──

const colorEstado = (estado: string): 'amber' | 'emerald' | 'red' | 'violet' | 'zinc' => {
    switch (estado) {
        case 'borrador':
            return 'amber';
        case 'activo':
            return 'emerald';
        case 'suspendido':
        case 'finalizado':
            return 'red';
        default:
            return 'zinc';
    }
};

// ── Props ──

interface IDetalleContratoInlineProps {
    contratoId: number;
    onBack: () => void;
}

function DetalleContratoInline({ contratoId, onBack }: IDetalleContratoInlineProps) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    // ── Redux selectors ──
    const { listaContentType } = useAppSelector((state) => state.core);
    const { listaLicencias } = useAppSelector((state) => state.contrato);

    // ── RTK Query para detalle ──
    const {
        data: contrato,
        isLoading,
        refetch,
    } = useGetDetalleContratoQuery(contratoId, { skip: !contratoId });

    // ── Estado local ──
    const [editando, setEditando] = useState(false);
    const [creandoFacturacion, setCreandoFacturacion] = useState(false);
    const [facturacionExistente, setFacturacionExistente] = useState<
        { id: number } | null
    >(null);

    // ── Cargar content types si no existen ──
    useEffect(() => {
        if (listaContentType.length === 0) {
            dispatch(listaContentTypeThunk());
        }
    }, []);

    // ── Buscar facturación existente ──
    useEffect(() => {
        const fetchFacturacion = async () => {
            if (!contrato) {
                setFacturacionExistente(null);
                return;
            }
            try {
                const response = await ApiService.fetchData<
                    { results?: { id: number }[] } | { id: number }[]
                >({
                    url: `/api/cierres-facturacion/?contrato=${contrato.id}`,
                    method: 'get',
                });
                const resultados = Array.isArray(response.data)
                    ? response.data
                    : response.data?.results || [];
                if (Array.isArray(resultados) && resultados.length > 0) {
                    setFacturacionExistente(resultados[0]);
                } else {
                    setFacturacionExistente(null);
                }
            } catch {
                setFacturacionExistente(null);
            }
        };
        fetchFacturacion();
    }, [contrato]);

    // ── Formik para edición ──
    const formik = useFormik<IContratoEdicion>({
        enableReinitialize: true,
        initialValues: {
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
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string()
                .required('Requerido')
                .nonNullable('Requerido')
                .max(100, 'Máximo 100 Caracteres'),
            fecha_inicio: Yup.string().required('Requerido').nonNullable('Requerido'),
            fecha_fin: Yup.string().notRequired().nullable(),
            observaciones: Yup.string().notRequired().nullable(),
        }),
        onSubmit: async (values) => {
            try {
                await ApiService.fetchData({
                    url: `/api/contratos/${contrato?.id}/actualizar/`,
                    method: 'put',
                    headers: { 'Content-Type': 'application/json' },
                    data: {
                        contrato: {
                            fecha_inicio:
                                values.fecha_inicio !== '' ? values.fecha_inicio : null,
                            fecha_fin: values.fecha_fin !== '' ? values.fecha_fin : null,
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
                });
                // Refrescar datos del contrato vía RTK Query
                refetch();
                setEditando(false);
                toast.success('Contrato editado', { autoClose: 1000 });
            } catch (error: unknown) {
                toast.error(getErrorMessage(error) || 'Error al actualizar el contrato', {
                    toastId: 'Error al actualizar el contrato',
                });
            }
        },
    });

    // ── Cargar catálogos cuando se activa edición ──
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
                    fecha_inicio: lic.fecha_inicio,
                    fecha_fin: lic.fecha_fin,
                })),
                eliminar_condiciones: [],
                condiciones_especiales: contrato.contrato_condiciones_especiales.map(
                    (con) => ({ id: con.id }),
                ),
                eliminar_usuarios: [],
                usuarios_vinculados: contrato.vinculos_contrato.map((user) => ({
                    id: user.id,
                    tipo_usuario: user.tipo_usuario,
                })),
            });
            dispatch(listaVisitasThunk());
            dispatch(listaLicenciasThunk());
            if (contrato.empresa_cliente) {
                dispatch(
                    listaUsuariosTodoElClienteThunk({
                        id_empresa: contrato.empresa_cliente,
                    }),
                );
            }
        }
    }, [contrato, editando]);

    // ── Handlers de facturación ──
    const crearFacturacion = async () => {
        if (!contrato) return;
        setCreandoFacturacion(true);
        try {
            const response = await ApiService.fetchData<{ id: number }>({
                url: '/api/cierres-facturacion/',
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: { contrato: contrato.id },
            });
            if (response.data) {
                toast.success('Facturación creada en borrador');
                setFacturacionExistente(response.data);
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error) || 'Error al crear facturación');
        } finally {
            setCreandoFacturacion(false);
        }
    };

    const irAFacturacion = () => {
        if (!facturacionExistente) return;
        navigate(`/facturacion/cierre-contrato/${facturacionExistente.id}`);
    };

    // ── Loading ──
    if (isLoading || !contrato) {
        return (
            <Card>
                <CardBody>
                    <div className='flex items-center justify-center py-10'>
                        <span className='text-zinc-500'>Cargando contrato...</span>
                    </div>
                </CardBody>
            </Card>
        );
    }

    return (
        <div className='flex flex-col gap-4'>
            {/* ── Barra superior ── */}
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <Button icon='HeroArrowLeft' onClick={onBack}>
                            Volver a contratos
                        </Button>
                    </CardHeaderChild>
                    <CardHeaderChild>
                        <div className='flex flex-wrap items-center gap-2'>
                            {editando ? (
                                <>
                                    <Button
                                        variant='solid'
                                        color='red'
                                        icon='HeroXMark'
                                        onClick={() => setEditando(false)}>
                                        <span className='hidden md:inline'>
                                            Cancelar Edición
                                        </span>
                                    </Button>
                                    <Button
                                        variant='solid'
                                        color='emerald'
                                        icon='HeroCheck'
                                        onClick={() => formik.handleSubmit()}>
                                        <span className='hidden md:inline'>
                                            Guardar Edición
                                        </span>
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant='solid'
                                        icon='HeroPencil'
                                        onClick={() => setEditando(true)}>
                                        <span className='hidden md:inline'>Editar</span>
                                    </Button>
                                    {!facturacionExistente ? (
                                        <Tooltip text='Crear facturación para este contrato'>
                                            <Button
                                                variant='solid'
                                                color='blue'
                                                icon='HeroDocumentPlus'
                                                isLoading={creandoFacturacion}
                                                isDisable={creandoFacturacion}
                                                onClick={crearFacturacion}>
                                                <span className='hidden md:inline'>
                                                    Crear facturación
                                                </span>
                                            </Button>
                                        </Tooltip>
                                    ) : (
                                        <Tooltip text='Ver facturación'>
                                            <Button
                                                variant='solid'
                                                color='emerald'
                                                icon='HeroEye'
                                                onClick={irAFacturacion}>
                                                <span className='hidden md:inline'>
                                                    Ver facturación
                                                </span>
                                            </Button>
                                        </Tooltip>
                                    )}
                                    <DetalleConfidencialidadContrato
                                        contratoId={contrato.id}
                                        empresaClienteId={contrato.empresa_cliente}
                                    />
                                </>
                            )}
                        </div>
                    </CardHeaderChild>
                </CardHeader>
            </Card>

            {/* ── Información del contrato ── */}
            <Card>
                <CardBody>
                    <div className='grid grid-cols-1 gap-4 lg:grid-cols-5'>
                        <div className='flex flex-col gap-2 lg:col-span-3'>
                            <div className='text-xl font-bold text-blue-500'>
                                {editando ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.nombre}
                                        invalidFeedback={formik.errors.nombre}>
                                        <Input
                                            name='nombre'
                                            className='mr-2 max-w-[250px]'
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            value={formik.values.nombre}
                                        />
                                    </Validation>
                                ) : (
                                    <>{contrato.nombre} </>
                                )}
                                #{contrato.id}
                            </div>
                            <div>
                                <span className='font-bold text-blue-500'>
                                    Empresa Prestadora:{' '}
                                </span>
                                {contrato.datos_empresa.nombre}
                            </div>
                            <div>
                                <span className='font-bold text-blue-500'>
                                    Empresa Cliente:{' '}
                                </span>
                                {contrato.datos_cliente.nombre}
                            </div>
                            <div>
                                <span className='font-bold text-blue-500'>Vigencia: </span>
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
                                            color={colorEstado(contrato.estado)}>
                                            {contrato.estado_label}
                                        </Badge>
                                    </div>
                                ) : (
                                    <>
                                        {dayjs(contrato.fecha_inicio).format('DD/MM/YYYY')} –{' '}
                                        {contrato.fecha_fin
                                            ? dayjs(contrato.fecha_fin).format('DD/MM/YYYY')
                                            : 'Sin Fecha de Finalización'}
                                        <Badge
                                            className='ml-2'
                                            variant='solid'
                                            color={colorEstado(contrato.estado)}>
                                            {contrato.estado_label}
                                        </Badge>
                                    </>
                                )}
                            </div>
                            <div>
                                <span className='font-bold text-blue-500'>Tipo: </span>
                                {contrato.tipo_label}
                            </div>
                        </div>
                    </div>
                </CardBody>
                <CardFooter className='border border-x-0 border-b-0 border-t-black pt-2'>
                    <CardFooterChild className='w-full'>
                        <div className='h-full w-full'>
                            <span className='font-bold text-blue-500'>Observaciones: </span>
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

            {/* ── Sub-tabs: Servicios, Condiciones, Usuarios | Visitas, Licencias ── */}
            <div className='grid grid-cols-12 gap-4'>
                <div className='col-span-full flex flex-col gap-4 lg:col-span-8'>
                    <TabServicios
                        detalleContratoEmpresaCliente={contrato}
                        puedeEditar={editando}
                        listaContentType={listaContentType}
                    />
                    <TabCondiciones
                        detalleContratoEmpresaCliente={contrato}
                        puedeEditar={editando}
                    />
                    <TabUsuarios
                        detalleContratoEmpresaCliente={contrato}
                        puedeEditar={editando}
                    />
                </div>
                <div className='col-span-full flex flex-col gap-4 lg:col-span-4'>
                    <TabLicencias
                        detalleContratoEmpresaCliente={contrato}
                        puedeEditar={editando}
                        listaLicencias={listaLicencias}
                    />
                </div>
            </div>
        </div>
    );
}

export default DetalleContratoInline;
