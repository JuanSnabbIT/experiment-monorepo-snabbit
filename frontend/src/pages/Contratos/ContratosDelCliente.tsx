import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
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
import Collapse from '@/components/utils/Collapse';
import {
    FRECUENCIA_VISITA,
    TIPO_MODALIDAD_LICENCIA,
    TIPO_MONEDA_LICENCIA,
    TIPOS_USUARIO_CONTRATO,
} from '@/constants/contrato.constant';
import ApiService from '@/services/ApiService';
import { getErrorMessage } from '@/utils/errorHandlers';
import {
    detalleClienteThunk,
    detalleContratoEmpresaClienteThunk,
    LIMPIAR_DETALLE_CONTRATO,
    listaCondicionesEspecialesThunk,
    listaContentTypeThunk,
    listaContratosDeEmpresaYClienteThunk,
    listaLicenciasThunk,
    listaUsuariosTodoElClienteThunk,
    listaVisitasThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import classNames from 'classnames';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { Fragment, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'swiper/css';
import 'swiper/css/pagination';
import { Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import * as Yup from 'yup';
import AgregarServiciosyPlanesContrato from './modals/AgregarServiciosyPlanesContrato';
import CrearEnvioContratoFirmaUsuario from './modals/CrearEnvioContratoFirmaUsuario';
import DetalleConfidencialidadContrato from './modals/DetalleConfidencialidadContrato';

interface IContratoEdicion {
    // Contrato
    fecha_inicio: string;
    fecha_fin: string | null;
    // estado: string
    observaciones: string | null;
    nombre: string;
    // CONTRATO VISITAS
    eliminar_visitas: number[];
    visitas: {
        id?: number;
        visita_id?: number;
        frecuencia: string;
        cantidad: number;
    }[];
    // CONTRATO LICENCIAS
    eliminar_licencias: number[];
    licencias: {
        id?: number;
        licencia_id?: number;
        tipo_modalidad: string;
        otro_tipo: string | null;
        cantidad: number;
        precio_unitario: number;
        fecha_inicio: string | null;
        fecha_fin: string | null;
        tipo_moneda: string;
    }[];
    // CONTRATO CONDICIONES ESPECIALES
    eliminar_condiciones: number[];
    condiciones_especiales: {
        id?: number;
        condicion_id?: number;
    }[];
    // USUARIOS VINCULADOS
    eliminar_usuarios: number[];
    usuarios_vinculados: {
        id?: number;
        usuario_id?: number;
        tipo_usuario: string;
        // firma: string | null
        // fecha_firma: string | null
    }[];
}

function ContratosDelCliente() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const { detalleCliente, listaUsuariosTodoElCliente } = useAppSelector((state) => state.empresa);
    const {
        detalleContratoEmpresaCliente,
        listaContratosDeEmpresaYCliente,
        listaCondicionesEspeciales,
        listaVisitas,
        listaLicencias,
    } = useAppSelector((state) => state.contrato);
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaContentType } = useAppSelector((state) => state.core);
    const [condicionCollapse, setCondicionCollapse] = useState<string>('');
    const [searchParams, setSearchParams] = useSearchParams();
    const [editando, setEditando] = useState<boolean>(false);

    // EDICION
    const [nuevaCondicion, setNuevaCondicion] = useState<string>('');
    const [nuevaVisita, setNuevaVisita] = useState<string>('');
    const [nuevaLicencia, setNuevaLicencia] = useState<string>('');
    const [nuevoUsuario, setNuevoUsuario] = useState<string>('');
    const [creandoFacturacion, setCreandoFacturacion] = useState<boolean>(false);
    const [facturacionExistente, setFacturacionExistente] = useState<any | null>(null);

    useEffect(() => {
        if (id) {
            dispatch(detalleClienteThunk({ id_relacion: id }));
        }
    }, [id]);

    useEffect(() => {
        if (searchParams && searchParams.has('contrato')) {
            dispatch(
                detalleContratoEmpresaClienteThunk({ id_contrato: searchParams.get('contrato') }),
            );
        }
    }, [searchParams]);

    useEffect(() => {
        if (detalleCliente) {
            if (personalizacionUsuario && personalizacionUsuario.empresa && detalleCliente) {
                dispatch(
                    listaContratosDeEmpresaYClienteThunk({
                        id_cliente: detalleCliente.cliente,
                        id_empresa: personalizacionUsuario.empresa,
                    }),
                );
            }
            if (listaContentType.length === 0) {
                dispatch(listaContentTypeThunk());
            }

            // Limpiar facturación previa al cambiar de cliente/contrato
            setFacturacionExistente(null);

            return () => {
                dispatch(LIMPIAR_DETALLE_CONTRATO());
            };
        }
    }, [detalleCliente]);

    // Traer facturación existente del contrato
    useEffect(() => {
        const fetchFacturacionContrato = async () => {
            if (!detalleContratoEmpresaCliente) {
                setFacturacionExistente(null);
                return;
            }
            try {
                const response = await ApiService.fetchData<{ results?: unknown[] } | unknown[]>({
                    url: `/api/cierres-facturacion/?contrato=${detalleContratoEmpresaCliente.id}`,
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
            } catch (error: unknown) {
                console.warn('Error cargando facturacion del contrato', getErrorMessage(error));
                setFacturacionExistente(null);
            }
        };

        fetchFacturacionContrato();
    }, [detalleContratoEmpresaCliente]);

    const formik = useFormik<IContratoEdicion>({
        enableReinitialize: true,
        initialValues: {
            // Contrato
            fecha_inicio: '',
            fecha_fin: '',
            observaciones: '',
            nombre: '',
            // CONTRATO VISITAS
            eliminar_visitas: [],
            visitas: [],
            // CONTRATO LICENCIAS
            eliminar_licencias: [],
            licencias: [],
            // CONTRATO CONDICIONES ESPECIALES
            eliminar_condiciones: [],
            condiciones_especiales: [],
            // USUARIOS VINCULADOS
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
                const response = await ApiService.fetchData({
                    url: `/api/contratos/${detalleContratoEmpresaCliente?.id}/actualizar/`,
                    method: 'put',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        contrato: {
                            fecha_inicio: values.fecha_inicio != '' ? values.fecha_inicio : null,
                            fecha_fin: values.fecha_fin != '' ? values.fecha_fin : null,
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
                    }),
                });
                if (response.data) {
                    dispatch(
                        detalleContratoEmpresaClienteThunk({
                            id_contrato: detalleContratoEmpresaCliente?.id,
                        }),
                    );
                    setEditando(false);
                    toast.success('Contrato editado', { autoClose: 1000 });
                }
            } catch (error: unknown) {
                toast.error(getErrorMessage(error) || 'Error al actualizar el contrato', {
                    toastId: 'Error al actualizar el contrato',
                });
            }
        },
    });

    useEffect(() => {
        if (detalleContratoEmpresaCliente && editando) {
            formik.setValues({
                // Contrato
                fecha_inicio: detalleContratoEmpresaCliente.fecha_inicio,
                fecha_fin: detalleContratoEmpresaCliente.fecha_fin,
                // estado: detalleContratoEmpresaCliente.estado,
                observaciones: detalleContratoEmpresaCliente.observaciones,
                nombre: detalleContratoEmpresaCliente.nombre,
                // CONTRATO VISITAS
                eliminar_visitas: [],
                visitas: detalleContratoEmpresaCliente.contrato_visitas.map((vis) => ({
                    id: vis.id,
                    cantidad: vis.cantidad,
                    frecuencia: vis.frecuencia,
                })),
                // CONTRATO LICENCIAS
                eliminar_licencias: [],
                licencias: detalleContratoEmpresaCliente.contrato_licencias.map((lic) => ({
                    id: lic.id,
                    cantidad: lic.cantidad,
                    otro_tipo: lic.otro_tipo,
                    precio_unitario: Number(lic.precio_unitario),
                    tipo_modalidad: lic.tipo_modalidad,
                    fecha_inicio: lic.fecha_inicio,
                    fecha_fin: lic.fecha_fin,
                    tipo_moneda: lic.tipo_moneda,
                })),
                // CONTRATO CONDICIONES ESPECIALES
                eliminar_condiciones: [],
                condiciones_especiales:
                    detalleContratoEmpresaCliente.contrato_condiciones_especiales.map((con) => ({
                        id: con.id,
                    })),
                // USUARIOS VINCULADOS
                eliminar_usuarios: [],
                usuarios_vinculados: detalleContratoEmpresaCliente.vinculos_contrato.map(
                    (user) => ({ id: user.id, tipo_usuario: user.tipo_usuario }),
                ),
            });
            dispatch(listaCondicionesEspecialesThunk());
            dispatch(listaVisitasThunk());
            dispatch(listaLicenciasThunk());
            dispatch(
                listaUsuariosTodoElClienteThunk({
                    id_empresa: detalleContratoEmpresaCliente.empresa_cliente,
                }),
            );
        }
    }, [detalleContratoEmpresaCliente, editando]);

    const crearFacturacionContrato = async () => {
        if (!detalleContratoEmpresaCliente) return;
        setCreandoFacturacion(true);
        try {
            const response = await ApiService.fetchData({
                url: `/api/cierres-facturacion/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({
                    contrato: detalleContratoEmpresaCliente.id,
                }),
            });
            if (response.data) {
                toast.success('Facturación creada en borrador');
                setFacturacionExistente(response.data);
            }
        } catch (error: any) {
            toast.error(error?.response?.data || 'Error al crear facturación');
        } finally {
            setCreandoFacturacion(false);
        }
    };

    const irAFacturacion = () => {
        if (!facturacionExistente) return;
        navigate(`/facturacion/cierre-contrato/${facturacionExistente.id}`);
    };

    return (
        <PageWrapper
            isProtectedRoute={true}
            name='Contratos del Cliente'
            title='Contratos del Cliente'>
            <Subheader>
                <SubheaderLeft>
                    <div className='flex w-full gap-4'>
                        <Button
                            icon='HeroArrowSmallLeft'
                            onClick={() => {
                                navigate(-1);
                            }}
                        />
                        <SelectReact
                            name='contrato'
                            className='min-w-[250px]'
                            options={listaContratosDeEmpresaYCliente.map((cont) => ({
                                value: cont.id.toString(),
                                label: cont.nombre,
                            }))}
                            isClearable
                            onChange={async (e) => {
                                if (e) {
                                    dispatch(
                                        detalleContratoEmpresaClienteThunk({
                                            id_contrato: (e as TSelectOption).value,
                                        }),
                                    );
                                } else {
                                    dispatch(LIMPIAR_DETALLE_CONTRATO());
                                }
                            }}
                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                            placeholder='Seleccione un Contrato'
                            value={
                                detalleContratoEmpresaCliente && {
                                    value: detalleContratoEmpresaCliente.id.toString(),
                                    label: detalleContratoEmpresaCliente.nombre,
                                }
                            }
                        />
                    </div>
                </SubheaderLeft>
            </Subheader>
            <Container className='h-full w-full'>
                {detalleContratoEmpresaCliente && (
                    <div className='grid grid-cols-12 gap-4'>
                        <Card className='col-span-full'>
                            <CardBody>
                                <div className='grid grid-cols-5 gap-4'>
                                    <div className='col-span-3 flex flex-col gap-2'>
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
                                                <>{detalleContratoEmpresaCliente.nombre} </>
                                            )}
                                            #{detalleContratoEmpresaCliente.id}
                                        </div>
                                        <div>
                                            <span className='font-bold text-blue-500'>
                                                Empresa Prestadora:{' '}
                                            </span>
                                            {detalleContratoEmpresaCliente.datos_empresa.nombre}
                                        </div>
                                        <div>
                                            <span className='font-bold text-blue-500'>
                                                Empresa Cliente:{' '}
                                            </span>
                                            {detalleContratoEmpresaCliente.datos_cliente.nombre}
                                        </div>
                                        <div>
                                            <span className='font-bold text-blue-500'>
                                                Vigencia:{' '}
                                            </span>
                                            {editando ? (
                                                <div className='flex flex-wrap gap-4'>
                                                    <Validation
                                                        isValid={formik.isValid}
                                                        isTouched={formik.touched.fecha_inicio}
                                                        invalidFeedback={
                                                            formik.errors.fecha_inicio
                                                        }>
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
                                                            value={
                                                                formik.values.fecha_fin
                                                                    ? formik.values.fecha_fin
                                                                    : ''
                                                            }
                                                        />
                                                    </Validation>
                                                    {/* ESTADOS CONTRATO */}
                                                    {/* <Validation
                                                        isValid={formik.isValid}
                                                        isTouched={formik.touched.estado}
                                                        invalidFeedback={formik.errors.estado}
                                                    >
                                                        <SelectReact
                                                            name="estado"
                                                            className="min-w-[150px]"
                                                            options={ESTADOS_CONTRATO}
                                                            onChange={(e) => {formik.setFieldValue("estado", (e as TSelectOption).value)}}
                                                            onBlur={formik.handleBlur}
                                                            value={ESTADOS_CONTRATO.find(estado => estado.value === formik.values.estado)}
                                                        />
                                                    </Validation> */}
                                                    <Badge
                                                        className='ml-2'
                                                        variant='solid'
                                                        color={
                                                            detalleContratoEmpresaCliente.estado ===
                                                            'borrador'
                                                                ? 'amber'
                                                                : detalleContratoEmpresaCliente.estado ===
                                                                    'activo'
                                                                  ? 'emerald'
                                                                  : detalleContratoEmpresaCliente.estado ===
                                                                          'suspendido' ||
                                                                      detalleContratoEmpresaCliente.estado ===
                                                                          'finalizado'
                                                                    ? 'red'
                                                                    : 'zinc'
                                                        }>
                                                        {detalleContratoEmpresaCliente.estado_label}
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <>
                                                    {dayjs(
                                                        detalleContratoEmpresaCliente.fecha_inicio,
                                                    ).format('DD/MM/YYYY') + ' '}
                                                    -{' '}
                                                    {detalleContratoEmpresaCliente.fecha_fin
                                                        ? dayjs(
                                                              detalleContratoEmpresaCliente.fecha_fin,
                                                          ).format('DD/MM/YYYY')
                                                        : 'Sin Fecha de Finalizacion'}
                                                    <Badge
                                                        className='ml-2'
                                                        variant='solid'
                                                        color={
                                                            detalleContratoEmpresaCliente.estado ===
                                                            'borrador'
                                                                ? 'amber'
                                                                : detalleContratoEmpresaCliente.estado ===
                                                                    'activo'
                                                                  ? 'emerald'
                                                                  : detalleContratoEmpresaCliente.estado ===
                                                                          'suspendido' ||
                                                                      detalleContratoEmpresaCliente.estado ===
                                                                          'finalizado'
                                                                    ? 'red'
                                                                    : 'zinc'
                                                        }>
                                                        {detalleContratoEmpresaCliente.estado_label}
                                                    </Badge>
                                                </>
                                            )}
                                        </div>
                                        <div>
                                            <span className='font-bold text-blue-500'>Tipo: </span>
                                            {detalleContratoEmpresaCliente.tipo_label}
                                        </div>
                                    </div>
                                    <div className='col-span-2 flex flex-wrap items-center justify-center gap-4'>
                                        {editando ? (
                                            <>
                                                <Button
                                                    className='hidden md:flex'
                                                    variant='solid'
                                                    color='red'
                                                    icon='HeroXMark'
                                                    onClick={() => {
                                                        setEditando(false);
                                                    }}>
                                                    Cancelar Edición
                                                </Button>
                                                <Button
                                                    className='hidden md:flex'
                                                    variant='solid'
                                                    color='emerald'
                                                    icon='HeroCheck'
                                                    onClick={() => {
                                                        formik.handleSubmit();
                                                    }}>
                                                    Guardar Edición
                                                </Button>
                                                <Button
                                                    className='md:hidden'
                                                    variant='solid'
                                                    color='red'
                                                    icon='HeroXMark'
                                                    onClick={() => {
                                                        setEditando(false);
                                                    }}></Button>
                                                <Button
                                                    className='md:hidden'
                                                    variant='solid'
                                                    color='emerald'
                                                    icon='HeroCheck'
                                                    onClick={() => {
                                                        formik.handleSubmit();
                                                    }}></Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button
                                                    className='hidden md:flex'
                                                    variant='solid'
                                                    icon='HeroPencil'
                                                    onClick={() => {
                                                        setEditando(true);
                                                    }}>
                                                    Editar Contrato
                                                </Button>
                                                <Button
                                                    className='md:hidden'
                                                    variant='solid'
                                                    icon='HeroPencil'
                                                    onClick={() => {
                                                        setEditando(true);
                                                    }}></Button>
                                                {!facturacionExistente ? (
                                                    <Tooltip text='Crear facturación para este contrato'>
                                                        <Button
                                                            variant='solid'
                                                            color='blue'
                                                            icon='HeroDocumentPlus'
                                                            isLoading={creandoFacturacion}
                                                            isDisable={creandoFacturacion}
                                                            onClick={crearFacturacionContrato}>
                                                            Crear facturación
                                                        </Button>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip text='Ver facturación creada para este contrato'>
                                                        <Button
                                                            variant='solid'
                                                            color='emerald'
                                                            icon='HeroEye'
                                                            onClick={irAFacturacion}>
                                                            Ver facturación
                                                        </Button>
                                                    </Tooltip>
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
                                                    value={
                                                        formik.values.observaciones
                                                            ? formik.values.observaciones
                                                            : ''
                                                    }
                                                />
                                            </Validation>
                                        ) : (
                                            <>{detalleContratoEmpresaCliente.observaciones}</>
                                        )}
                                    </div>
                                </CardFooterChild>
                            </CardFooter>
                        </Card>
                        <div className='col-span-full flex flex-col gap-4 lg:col-span-8'>
                            {(detalleContratoEmpresaCliente.tipo === 'servicios' ||
                                detalleContratoEmpresaCliente.tipo === 'licencia') && (
                                <Card>
                                    <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                                        <CardHeaderChild>
                                            <div className='text-xl font-bold text-blue-500'>
                                                Servicios y Planes Contratados
                                            </div>
                                        </CardHeaderChild>
                                        <CardHeaderChild>
                                            {(detalleContratoEmpresaCliente.tipo === 'servicios' ||
                                                detalleContratoEmpresaCliente.tipo ===
                                                    'licencia') && (
                                                <AgregarServiciosyPlanesContrato />
                                            )}
                                        </CardHeaderChild>
                                    </CardHeader>
                                    <CardBody className='py-4'>
                                        <Swiper
                                            modules={[Navigation, Pagination]}
                                            slidesPerView='auto'
                                            navigation
                                            pagination={{
                                                dynamicBullets: true,
                                            }}
                                            className='!max-w-none'>
                                            {detalleContratoEmpresaCliente &&
                                            detalleContratoEmpresaCliente.contrato_servicios
                                                .length > 0 ? (
                                                detalleContratoEmpresaCliente.contrato_servicios.map(
                                                    (contServ, index) => (
                                                        <SwiperSlide
                                                            key={index}
                                                            className='!w-full !shrink-0 pr-4 md:!w-1/2'>
                                                            {listaContentType.some(
                                                                (ct) =>
                                                                    ct.model === 'servicio' &&
                                                                    ct.id === contServ.content_type,
                                                            ) ? (
                                                                <div className='h-auto rounded-xl border border-blue-500'>
                                                                    <div className='flex flex-col gap-2 p-4'>
                                                                        <div>
                                                                            <div className='font-bold text-blue-500'>
                                                                                Servicio:{' '}
                                                                                {contServ.nombre}
                                                                            </div>
                                                                        </div>
                                                                        <div className='font-bold'>
                                                                            Categoría:{' '}
                                                                            <span className='font-normal'>
                                                                                {' '}
                                                                                {'categoria_label' in
                                                                                    contServ.servicio_generico &&
                                                                                    contServ
                                                                                        .servicio_generico
                                                                                        .categoria_label}
                                                                            </span>
                                                                        </div>
                                                                        <div className='font-bold'>
                                                                            Cantidad:{' '}
                                                                            <span className='font-normal'>
                                                                                {' '}
                                                                                {contServ.cantidad}
                                                                            </span>
                                                                        </div>
                                                                        <div className='font-bold'>
                                                                            Precio Unitario:{' '}
                                                                            <span className='font-normal'>
                                                                                $
                                                                                {Number(
                                                                                    contServ.precio_unitario,
                                                                                ).toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className='flex items-center justify-between border border-b-0 border-l-0 border-r-0 border-t-black p-4'>
                                                                        <div>
                                                                            ID Servicio:{' '}
                                                                            {contServ.id}
                                                                        </div>
                                                                        <div>
                                                                            <Button variant='outline'>
                                                                                Detalles
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className='h-auto rounded-xl border border-emerald-500'>
                                                                    <div className='flex flex-col gap-2 p-4'>
                                                                        <div>
                                                                            <div className='font-bold text-emerald-500'>
                                                                                Plan:{' '}
                                                                                {contServ.nombre}
                                                                            </div>
                                                                        </div>
                                                                        <div className='font-bold'>
                                                                            Servicios Incluidos:{' '}
                                                                            <span className='font-normal'>
                                                                                {' '}
                                                                                {'servicios' in
                                                                                    contServ.servicio_generico &&
                                                                                contServ
                                                                                    .servicio_generico
                                                                                    .servicios
                                                                                    .length > 0
                                                                                    ? contServ.servicio_generico.servicios.map(
                                                                                          (
                                                                                              ser,
                                                                                              index,
                                                                                              array,
                                                                                          ) =>
                                                                                              index +
                                                                                                  1 ===
                                                                                              array.length
                                                                                                  ? ser.nombre
                                                                                                  : `${ser.nombre}, `,
                                                                                      )
                                                                                    : 'Sin Servicios'}
                                                                            </span>
                                                                        </div>
                                                                        <div className='font-bold'>
                                                                            Cantidad:{' '}
                                                                            <span className='font-normal'>
                                                                                {' '}
                                                                                {contServ.cantidad}
                                                                            </span>
                                                                        </div>
                                                                        <div className='font-bold'>
                                                                            Precio Unitario:{' '}
                                                                            <span className='font-normal'>
                                                                                $
                                                                                {Number(
                                                                                    contServ.precio_unitario,
                                                                                ).toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className='flex items-center justify-between border border-b-0 border-l-0 border-r-0 border-t-black p-4'>
                                                                        <div>
                                                                            ID Plan: {contServ.id}
                                                                        </div>
                                                                        <div>
                                                                            <Button variant='outline'>
                                                                                Detalles
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </SwiperSlide>
                                                    ),
                                                )
                                            ) : (
                                                <SwiperSlide>Sin Servicios</SwiperSlide>
                                            )}
                                        </Swiper>
                                    </CardBody>
                                </Card>
                            )}

                            <Card>
                                <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                                    <CardHeaderChild>
                                        <div className='text-xl font-bold text-blue-500'>
                                            Condiciones Especiales
                                        </div>
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody className='p-4'>
                                    <div className='flex flex-col'>
                                        {editando ? (
                                            <>
                                                {formik.values.condiciones_especiales.length > 0 ? (
                                                    formik.values.condiciones_especiales.map(
                                                        (condicion, index) => (
                                                            <div
                                                                key={index}
                                                                className='mb-2 flex items-center justify-between border-b p-2'>
                                                                <span>
                                                                    {'condicion_id' in condicion
                                                                        ? listaCondicionesEspeciales.find(
                                                                              (con) =>
                                                                                  con.id ===
                                                                                  condicion.condicion_id,
                                                                          )?.titulo
                                                                        : 'id' in condicion
                                                                          ? detalleContratoEmpresaCliente.contrato_condiciones_especiales.find(
                                                                                (con) =>
                                                                                    con.id ===
                                                                                    condicion.id,
                                                                            )?.titulo_condicion
                                                                          : 'No se encontro la condicion'}
                                                                </span>
                                                                <Button
                                                                    onClick={() => {
                                                                        const condicionEliminada =
                                                                            formik.values
                                                                                .condiciones_especiales[
                                                                                index
                                                                            ];
                                                                        const nuevasCondiciones =
                                                                            formik.values.condiciones_especiales.filter(
                                                                                (_, i) =>
                                                                                    i !== index,
                                                                            );
                                                                        // Agregamos al array de eliminación solo si la condición eliminada posee un id (esto es útil si ya estaba registrada en la BD).
                                                                        let nuevosEliminados = [
                                                                            ...formik.values
                                                                                .eliminar_condiciones,
                                                                        ];
                                                                        if (condicionEliminada.id) {
                                                                            nuevosEliminados.push(
                                                                                condicionEliminada.id,
                                                                            );
                                                                        }
                                                                        formik.setFieldValue(
                                                                            'condiciones_especiales',
                                                                            nuevasCondiciones,
                                                                        );
                                                                        formik.setFieldValue(
                                                                            'eliminar_condiciones',
                                                                            nuevosEliminados,
                                                                        );
                                                                    }}
                                                                    color='red'
                                                                    icon='HeroTrash'
                                                                />
                                                            </div>
                                                        ),
                                                    )
                                                ) : (
                                                    <div>Sin Condiciones</div>
                                                )}
                                                {listaCondicionesEspeciales
                                                    .filter(
                                                        (con) =>
                                                            !detalleContratoEmpresaCliente.contrato_condiciones_especiales.some(
                                                                (num) =>
                                                                    num.condicion === con.id &&
                                                                    !formik.values.eliminar_condiciones.some(
                                                                        (formCon) =>
                                                                            formCon === num.id,
                                                                    ),
                                                            ),
                                                    )
                                                    .filter(
                                                        (con) =>
                                                            !formik.values.condiciones_especiales.some(
                                                                (formCon) =>
                                                                    formCon.condicion_id === con.id,
                                                            ),
                                                    ).length > 0 && (
                                                    <div className='mt-4 flex items-center justify-between gap-2'>
                                                        <div className='w-full'>
                                                            <Badge>Agregar Condicion</Badge>
                                                            <SelectReact
                                                                name='nueva_condicion'
                                                                placeholder='Agregar Condición'
                                                                className='w-full min-w-[200px]'
                                                                options={listaCondicionesEspeciales
                                                                    .filter(
                                                                        (con) =>
                                                                            !detalleContratoEmpresaCliente.contrato_condiciones_especiales.some(
                                                                                (num) =>
                                                                                    num.condicion ===
                                                                                        con.id &&
                                                                                    !formik.values.eliminar_condiciones.some(
                                                                                        (formCon) =>
                                                                                            formCon ===
                                                                                            num.id,
                                                                                    ),
                                                                            ),
                                                                    )
                                                                    .filter(
                                                                        (con) =>
                                                                            !formik.values.condiciones_especiales.some(
                                                                                (formCon) =>
                                                                                    formCon.condicion_id ===
                                                                                    con.id,
                                                                            ),
                                                                    )
                                                                    .map((con) => ({
                                                                        value: con.id.toString(),
                                                                        label: con.titulo,
                                                                    }))}
                                                                onChange={(e) => {
                                                                    setNuevaCondicion(
                                                                        (e as TSelectOption).value,
                                                                    );
                                                                }}
                                                                value={{
                                                                    value: nuevaCondicion,
                                                                    label:
                                                                        listaCondicionesEspeciales.find(
                                                                            (con) =>
                                                                                con.id.toString() ===
                                                                                nuevaCondicion,
                                                                        )?.titulo || '',
                                                                }}
                                                                noOptionsMessage={(e) =>
                                                                    `No Existe ${e.inputValue}`
                                                                }
                                                            />
                                                        </div>
                                                        <Button
                                                            onClick={() => {
                                                                if (nuevaCondicion.trim() === '') {
                                                                    toast.error(
                                                                        'Seleccione una condicion para agregarla',
                                                                        {
                                                                            toastId:
                                                                                'Seleccione una condicion para agregarla',
                                                                        },
                                                                    );
                                                                    return;
                                                                }
                                                                formik.setFieldValue(
                                                                    'condiciones_especiales',
                                                                    [
                                                                        ...formik.values
                                                                            .condiciones_especiales,
                                                                        {
                                                                            condicion_id:
                                                                                Number(
                                                                                    nuevaCondicion,
                                                                                ),
                                                                        },
                                                                    ],
                                                                );
                                                                setNuevaCondicion('');
                                                            }}>
                                                            Agregar
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {detalleContratoEmpresaCliente
                                                    .contrato_condiciones_especiales.length > 0 ? (
                                                    detalleContratoEmpresaCliente.contrato_condiciones_especiales.map(
                                                        (condicion, index, array) => (
                                                            <div
                                                                className={classNames(
                                                                    'border border-black p-2',
                                                                    index === 0 && 'rounded-t-xl',
                                                                    index + 1 === array.length &&
                                                                        'rounded-b-xl',
                                                                )}
                                                                key={index}>
                                                                <div
                                                                    className='flex w-full justify-between'
                                                                    onClick={() => {
                                                                        setCondicionCollapse(
                                                                            condicion.id.toString() ===
                                                                                condicionCollapse
                                                                                ? ''
                                                                                : condicion.id.toString(),
                                                                        );
                                                                    }}>
                                                                    <div>
                                                                        {condicion.titulo_condicion}
                                                                    </div>
                                                                    <Icon
                                                                        icon={
                                                                            condicion.id.toString() ===
                                                                            condicionCollapse
                                                                                ? 'HeroChevronUp'
                                                                                : 'HeroChevronDown'
                                                                        }
                                                                    />
                                                                </div>
                                                                <Collapse
                                                                    isOpen={
                                                                        condicion.id.toString() ===
                                                                        condicionCollapse
                                                                    }>
                                                                    <div className='pt-2'>
                                                                        {
                                                                            condicion.descripcion_condicion
                                                                        }
                                                                    </div>
                                                                </Collapse>
                                                            </div>
                                                        ),
                                                    )
                                                ) : (
                                                    <div>Sin Condiciones</div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </CardBody>
                            </Card>

                            <Card>
                                <CardHeader className='border-b border-b-black'>
                                    <CardHeaderChild>
                                        <div className='text-xl font-bold text-blue-500'>
                                            Usuarios Vinculados
                                        </div>
                                    </CardHeaderChild>
                                    <CardHeaderChild>
                                        <CrearEnvioContratoFirmaUsuario />
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody className='p-4'>
                                    {editando ? (
                                        <div className='grid grid-cols-12 gap-4'>
                                            <div className='col-span-6 font-bold'>Usuario</div>
                                            <div className='col-span-6 font-bold'>Tipo</div>
                                            {/* <div className="col-span-4 font-bold">F. Vinculación</div> */}
                                            {formik.values.usuarios_vinculados.length > 0 ? (
                                                formik.values.usuarios_vinculados.map(
                                                    (user, index) => (
                                                        <Fragment key={index}>
                                                            <div className='col-span-6'>
                                                                {'usuario_id' in user
                                                                    ? listaUsuariosTodoElCliente.find(
                                                                          (userCli) =>
                                                                              userCli.id ===
                                                                              user.usuario_id,
                                                                      )?.email_usuario
                                                                    : 'id' in user
                                                                      ? detalleContratoEmpresaCliente.vinculos_contrato.find(
                                                                            (userCli) =>
                                                                                userCli.id ===
                                                                                user.id,
                                                                        )?.datos_usuario.email
                                                                      : 'No se encontro al usuario'}
                                                                <Button
                                                                    color='red'
                                                                    icon='HeroTrash'
                                                                    onClick={() => {
                                                                        const usuarioEliminado =
                                                                            formik.values
                                                                                .usuarios_vinculados[
                                                                                index
                                                                            ];
                                                                        const nuevoUsuario =
                                                                            formik.values.usuarios_vinculados.filter(
                                                                                (_, i) =>
                                                                                    i !== index,
                                                                            );
                                                                        // Agregamos al array de eliminación solo si la condición eliminada posee un id (esto es útil si ya estaba registrada en la BD).
                                                                        let nuevosEliminados = [
                                                                            ...formik.values
                                                                                .eliminar_usuarios,
                                                                        ];
                                                                        if (usuarioEliminado.id) {
                                                                            nuevosEliminados.push(
                                                                                usuarioEliminado.id,
                                                                            );
                                                                        }
                                                                        formik.setFieldValue(
                                                                            'usuarios_vinculados',
                                                                            nuevoUsuario,
                                                                        );
                                                                        formik.setFieldValue(
                                                                            'eliminar_usuarios',
                                                                            nuevosEliminados,
                                                                        );
                                                                    }}></Button>
                                                            </div>
                                                            <div className='col-span-6'>
                                                                <SelectReact
                                                                    name='tipo_usuario'
                                                                    options={TIPOS_USUARIO_CONTRATO}
                                                                    value={TIPOS_USUARIO_CONTRATO.find(
                                                                        (tipo) =>
                                                                            tipo.value ===
                                                                            user.tipo_usuario,
                                                                    )}
                                                                    onChange={(e) => {
                                                                        formik.setFieldValue(
                                                                            `usuarios_vinculados[${index}].tipo_usuario`,
                                                                            (e as TSelectOption)
                                                                                .value,
                                                                        );
                                                                    }}
                                                                    noOptionsMessage={(e) =>
                                                                        `No Existe ${e.inputValue}`
                                                                    }
                                                                />
                                                            </div>
                                                        </Fragment>
                                                    ),
                                                )
                                            ) : (
                                                <div className='col-span-full text-center'>
                                                    Sin Usuarios
                                                </div>
                                            )}
                                            {listaUsuariosTodoElCliente
                                                .filter(
                                                    (us) =>
                                                        !detalleContratoEmpresaCliente.vinculos_contrato.some(
                                                            (num) =>
                                                                num.usuario === us.id &&
                                                                !formik.values.eliminar_usuarios.some(
                                                                    (formUs) => formUs === num.id,
                                                                ),
                                                        ),
                                                )
                                                .filter(
                                                    (us) =>
                                                        !formik.values.usuarios_vinculados.some(
                                                            (formUs) => formUs.usuario_id === us.id,
                                                        ),
                                                ).length > 0 && (
                                                <>
                                                    <div className='col-span-8'>
                                                        <SelectReact
                                                            name='nuevo_usuario'
                                                            options={listaUsuariosTodoElCliente
                                                                .filter(
                                                                    (us) =>
                                                                        !detalleContratoEmpresaCliente.vinculos_contrato.some(
                                                                            (num) =>
                                                                                num.usuario ===
                                                                                    us.id &&
                                                                                !formik.values.eliminar_usuarios.some(
                                                                                    (formUs) =>
                                                                                        formUs ===
                                                                                        num.id,
                                                                                ),
                                                                        ),
                                                                )
                                                                .filter(
                                                                    (us) =>
                                                                        !formik.values.usuarios_vinculados.some(
                                                                            (formUs) =>
                                                                                formUs.usuario_id ===
                                                                                us.id,
                                                                        ),
                                                                )
                                                                .map((us) => ({
                                                                    value: us.id.toString(),
                                                                    label: us.email_usuario,
                                                                }))}
                                                            onChange={(e) => {
                                                                setNuevoUsuario(
                                                                    (e as TSelectOption).value,
                                                                );
                                                            }}
                                                            value={{
                                                                value: nuevoUsuario,
                                                                label:
                                                                    listaUsuariosTodoElCliente.find(
                                                                        (us) =>
                                                                            us.id.toString() ===
                                                                            nuevoUsuario,
                                                                    )?.email_usuario || '',
                                                            }}
                                                            noOptionsMessage={(e) =>
                                                                `No Existe ${e.inputValue}`
                                                            }
                                                        />
                                                    </div>
                                                    <div className='col-span-4'>
                                                        <Button
                                                            onClick={() => {
                                                                if (nuevoUsuario.trim() === '') {
                                                                    toast.error(
                                                                        'Seleccione un usuario para agregarlo',
                                                                        {
                                                                            toastId:
                                                                                'Seleccione un usuario para agregarlo',
                                                                        },
                                                                    );
                                                                    return;
                                                                }
                                                                formik.setFieldValue(
                                                                    'usuarios_vinculados',
                                                                    [
                                                                        ...formik.values
                                                                            .usuarios_vinculados,
                                                                        {
                                                                            usuario_id:
                                                                                Number(
                                                                                    nuevoUsuario,
                                                                                ),
                                                                            tipo_usuario: 'general',
                                                                        },
                                                                    ],
                                                                );
                                                                setNuevoUsuario('');
                                                            }}>
                                                            Agregar
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className='grid grid-cols-12 gap-4'>
                                            <div className='col-span-3 font-bold'>Usuario</div>
                                            <div className='col-span-3 font-bold'>Tipo</div>
                                            <div className='col-span-4 font-bold'>
                                                F. Vinculación
                                            </div>
                                            <div className='col-span-2 font-bold'></div>
                                            {detalleContratoEmpresaCliente.vinculos_contrato
                                                .length > 0 ? (
                                                detalleContratoEmpresaCliente.vinculos_contrato.map(
                                                    (vinculos, index) => (
                                                        <Fragment key={index}>
                                                            <div
                                                                className={classNames(
                                                                    'col-span-3',
                                                                    index > 0 &&
                                                                        'border-t border-t-black',
                                                                )}>
                                                                {vinculos.datos_usuario.email}
                                                            </div>
                                                            <div
                                                                className={classNames(
                                                                    'col-span-3',
                                                                    index > 0 &&
                                                                        'border-t border-t-black',
                                                                )}>
                                                                {vinculos.tipo_usuario_label}
                                                            </div>
                                                            <div
                                                                className={classNames(
                                                                    'col-span-4',
                                                                    index > 0 &&
                                                                        'border-t border-t-black',
                                                                )}>
                                                                {dayjs(
                                                                    vinculos.fecha_vinculacion,
                                                                ).format('DD/MM/YYYY')}
                                                            </div>
                                                            <div
                                                                className={classNames(
                                                                    'col-span-2',
                                                                    index > 0 &&
                                                                        'border-t border-t-black',
                                                                )}>
                                                                {vinculos.existe_envio ? (
                                                                    <Tooltip text='Reenviar'>
                                                                        <Button
                                                                            variant='solid'
                                                                            color='emerald'
                                                                            icon='DuoOutgoingMail'
                                                                            onClick={async () => {
                                                                                try {
                                                                                    const response =
                                                                                        await ApiService.fetchData(
                                                                                            {
                                                                                                url: `/api/contratos/${detalleContratoEmpresaCliente.id}/usuarios-vinculados/${vinculos.usuario}/envio-firma/${vinculos.existe_envio}/reenviar/`,
                                                                                                method: 'post',
                                                                                            },
                                                                                        );
                                                                                    if (
                                                                                        response.data
                                                                                    ) {
                                                                                        toast.success(
                                                                                            'Reenvio exitoso',
                                                                                            {
                                                                                                autoClose: 1000,
                                                                                            },
                                                                                        );
                                                                                        dispatch(
                                                                                            detalleContratoEmpresaClienteThunk(
                                                                                                {
                                                                                                    id_contrato:
                                                                                                        detalleContratoEmpresaCliente.id,
                                                                                                },
                                                                                            ),
                                                                                        );
                                                                                    }
                                                                                } catch (error: any) {
                                                                                    const mensajesError =
                                                                                        Object.values(
                                                                                            error
                                                                                                .response
                                                                                                .data,
                                                                                        )
                                                                                            .flat()
                                                                                            .join(
                                                                                                ' ',
                                                                                            );
                                                                                    toast.error(
                                                                                        mensajesError ||
                                                                                            'Error al reenviar el contrato',
                                                                                        {
                                                                                            toastId:
                                                                                                'Error al reenviar el contrato',
                                                                                        },
                                                                                    );
                                                                                }
                                                                            }}></Button>
                                                                    </Tooltip>
                                                                ) : (
                                                                    <Tooltip text='No enviado'>
                                                                        <Button
                                                                            variant='solid'
                                                                            color='red'
                                                                            icon='HeroXMark'></Button>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        </Fragment>
                                                    ),
                                                )
                                            ) : (
                                                <div className='col-span-full'>Sin Usuarios</div>
                                            )}
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </div>

                        <div className='col-span-full flex flex-col gap-4 lg:col-span-4'>
                            {detalleContratoEmpresaCliente.tipo === 'servicios' && (
                                <Card>
                                    <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                                        <CardHeaderChild>
                                            <div className='text-xl font-bold text-blue-500'>
                                                Visitas Programadas
                                            </div>
                                        </CardHeaderChild>
                                    </CardHeader>
                                    <CardBody className='p-4'>
                                        <div className='flex flex-col'>
                                            {editando ? (
                                                <>
                                                    {formik.values.visitas.length > 0 ? (
                                                        formik.values.visitas.map(
                                                            (visita, index) => (
                                                                <div
                                                                    className={classNames(
                                                                        'flex flex-col justify-between p-2',
                                                                        index > 0 &&
                                                                            'border border-x-0 border-b-0 border-t-black dark:border-t-white',
                                                                    )}
                                                                    key={index}>
                                                                    <div className='font-bold'>
                                                                        {'visita_id' in visita
                                                                            ? listaVisitas.find(
                                                                                  (vis) =>
                                                                                      vis.id ===
                                                                                      visita.visita_id,
                                                                              )?.descripcion
                                                                            : 'id' in visita
                                                                              ? detalleContratoEmpresaCliente.contrato_visitas.find(
                                                                                    (vis) =>
                                                                                        vis.id ===
                                                                                        visita.id,
                                                                                )
                                                                                    ?.descripcion_visita
                                                                              : 'No se encontro la visita'}
                                                                        <Button
                                                                            color='red'
                                                                            icon='HeroTrash'
                                                                            onClick={() => {
                                                                                const visitaEliminada =
                                                                                    formik.values
                                                                                        .visitas[
                                                                                        index
                                                                                    ];
                                                                                const nuevasVisitas =
                                                                                    formik.values.visitas.filter(
                                                                                        (_, i) =>
                                                                                            i !==
                                                                                            index,
                                                                                    );
                                                                                // Agregamos al array de eliminación solo si la condición eliminada posee un id (esto es útil si ya estaba registrada en la BD).
                                                                                let nuevosEliminados =
                                                                                    [
                                                                                        ...formik
                                                                                            .values
                                                                                            .eliminar_visitas,
                                                                                    ];
                                                                                if (
                                                                                    visitaEliminada.id
                                                                                ) {
                                                                                    nuevosEliminados.push(
                                                                                        visitaEliminada.id,
                                                                                    );
                                                                                }
                                                                                formik.setFieldValue(
                                                                                    'visitas',
                                                                                    nuevasVisitas,
                                                                                );
                                                                                formik.setFieldValue(
                                                                                    'eliminar_visitas',
                                                                                    nuevosEliminados,
                                                                                );
                                                                            }}></Button>
                                                                    </div>
                                                                    <div className='grid grid-cols-2 gap-2'>
                                                                        <div>
                                                                            <Badge>
                                                                                Frecuencia
                                                                            </Badge>
                                                                            <SelectReact
                                                                                name='cambio_frecuencia'
                                                                                options={
                                                                                    FRECUENCIA_VISITA
                                                                                }
                                                                                value={FRECUENCIA_VISITA.find(
                                                                                    (fre) =>
                                                                                        fre.value ===
                                                                                        visita.frecuencia,
                                                                                )}
                                                                                onChange={(e) => {
                                                                                    formik.setFieldValue(
                                                                                        `visitas[${index}].frecuencia`,
                                                                                        (
                                                                                            e as TSelectOption
                                                                                        ).value,
                                                                                    );
                                                                                }}
                                                                                noOptionsMessage={(
                                                                                    e,
                                                                                ) =>
                                                                                    `No Existe ${e.inputValue}`
                                                                                }
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <Badge>Cantidad</Badge>
                                                                            <Input
                                                                                name={`visitas[${index}].cantidad`}
                                                                                type='number'
                                                                                value={
                                                                                    visita.cantidad
                                                                                }
                                                                                // onChange={(e) => {
                                                                                //     formik.setFieldValue(`visitas[${index}].cantidad`, Number(e.target.value));
                                                                                // }}
                                                                                onChange={
                                                                                    formik.handleChange
                                                                                }
                                                                            />
                                                                            {/* <Badge variant="solid">{visita.cantidad}</Badge> */}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ),
                                                        )
                                                    ) : (
                                                        <div>Sin Visitas</div>
                                                    )}
                                                    {listaVisitas
                                                        .filter(
                                                            (vis) =>
                                                                !detalleContratoEmpresaCliente.contrato_visitas.some(
                                                                    (num) =>
                                                                        num.visita === vis.id &&
                                                                        !formik.values.eliminar_visitas.some(
                                                                            (formVis) =>
                                                                                formVis === num.id,
                                                                        ),
                                                                ),
                                                        )
                                                        .filter(
                                                            (vis) =>
                                                                !formik.values.visitas.some(
                                                                    (formVis) =>
                                                                        formVis.visita_id ===
                                                                        vis.id,
                                                                ),
                                                        ).length > 0 && (
                                                        <div
                                                            className={classNames(
                                                                'flex flex-row justify-between p-2',
                                                                'border border-x-0 border-b-0 border-t-black dark:border-t-white',
                                                            )}>
                                                            <div className='w-full'>
                                                                <Badge>Agregar Visitas</Badge>
                                                                <SelectReact
                                                                    name='nueva_visita'
                                                                    options={listaVisitas
                                                                        .filter(
                                                                            (vis) =>
                                                                                !detalleContratoEmpresaCliente.contrato_visitas.some(
                                                                                    (num) =>
                                                                                        num.visita ===
                                                                                            vis.id &&
                                                                                        !formik.values.eliminar_visitas.some(
                                                                                            (
                                                                                                formVis,
                                                                                            ) =>
                                                                                                formVis ===
                                                                                                num.id,
                                                                                        ),
                                                                                ),
                                                                        )
                                                                        .filter(
                                                                            (vis) =>
                                                                                !formik.values.visitas.some(
                                                                                    (formVis) =>
                                                                                        formVis.visita_id ===
                                                                                        vis.id,
                                                                                ),
                                                                        )
                                                                        .map((vis) => ({
                                                                            value: vis.id.toString(),
                                                                            label: vis.descripcion,
                                                                        }))}
                                                                    onChange={(e) => {
                                                                        setNuevaVisita(
                                                                            (e as TSelectOption)
                                                                                .value,
                                                                        );
                                                                    }}
                                                                    value={{
                                                                        value: nuevaVisita,
                                                                        label:
                                                                            listaVisitas.find(
                                                                                (vis) =>
                                                                                    vis.id.toString() ===
                                                                                    nuevaVisita,
                                                                            )?.descripcion || '',
                                                                    }}
                                                                    noOptionsMessage={(e) =>
                                                                        `No Existe ${e.inputValue}`
                                                                    }
                                                                />
                                                            </div>
                                                            <Button
                                                                onClick={() => {
                                                                    if (nuevaVisita.trim() === '') {
                                                                        toast.error(
                                                                            'Seleccione una visita para agregarla',
                                                                            {
                                                                                toastId:
                                                                                    'Seleccione una visita para agregarla',
                                                                            },
                                                                        );
                                                                        return;
                                                                    }
                                                                    formik.setFieldValue(
                                                                        'visitas',
                                                                        [
                                                                            ...formik.values
                                                                                .visitas,
                                                                            {
                                                                                visita_id:
                                                                                    Number(
                                                                                        nuevaVisita,
                                                                                    ),
                                                                                cantidad: 1,
                                                                                frecuencia:
                                                                                    'mensual',
                                                                            },
                                                                        ],
                                                                    );
                                                                    setNuevaVisita('');
                                                                }}>
                                                                Agregar
                                                            </Button>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {detalleContratoEmpresaCliente.contrato_visitas
                                                        .length > 0 ? (
                                                        detalleContratoEmpresaCliente.contrato_visitas.map(
                                                            (visita, index) => (
                                                                <div
                                                                    className={classNames(
                                                                        'flex justify-between p-2',
                                                                        index > 0 &&
                                                                            'border border-x-0 border-b-0 border-t-black',
                                                                    )}
                                                                    key={index}>
                                                                    <div>
                                                                        <div className='font-bold'>
                                                                            {
                                                                                visita.descripcion_visita
                                                                            }
                                                                        </div>
                                                                        <div className='text-sm font-light'>
                                                                            Frecuencia:{' '}
                                                                            {
                                                                                visita.frecuencia_label
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <Badge variant='solid'>
                                                                            {visita.cantidad}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            ),
                                                        )
                                                    ) : (
                                                        <div>Sin Visitas</div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </CardBody>
                                </Card>
                            )}

                            {detalleContratoEmpresaCliente.tipo == 'licencia' && (
                                <Card>
                                    <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                                        <CardHeaderChild>
                                            <div className='text-xl font-bold text-blue-500'>
                                                Licencias
                                            </div>
                                        </CardHeaderChild>
                                    </CardHeader>
                                    <CardBody className='p-4'>
                                        <div className='flex flex-col'>
                                            {editando ? (
                                                <>
                                                    {formik.values.licencias.length > 0 ? (
                                                        formik.values.licencias.map(
                                                            (licencia, index) => (
                                                                <div
                                                                    className={classNames(
                                                                        'flex flex-col justify-between p-2',
                                                                        index > 0 &&
                                                                            'border border-x-0 border-b-0 border-t-black dark:border-t-white',
                                                                    )}
                                                                    key={index}>
                                                                    <div>
                                                                        {'licencia_id' in licencia
                                                                            ? listaLicencias.find(
                                                                                  (lic) =>
                                                                                      lic.id ===
                                                                                      licencia.licencia_id,
                                                                              )?.nombre
                                                                            : 'id' in licencia
                                                                              ? detalleContratoEmpresaCliente.contrato_licencias.find(
                                                                                    (lic) =>
                                                                                        lic.id ===
                                                                                        licencia.id,
                                                                                )?.nombre_licencia
                                                                              : 'No se encontro la licencia'}
                                                                        <Button
                                                                            color='red'
                                                                            icon='HeroTrash'
                                                                            onClick={() => {
                                                                                const licenciaEliminada =
                                                                                    formik.values
                                                                                        .licencias[
                                                                                        index
                                                                                    ];
                                                                                const nuevaLicencia =
                                                                                    formik.values.licencias.filter(
                                                                                        (_, i) =>
                                                                                            i !==
                                                                                            index,
                                                                                    );
                                                                                // Agregamos al array de eliminación solo si la condición eliminada posee un id (esto es útil si ya estaba registrada en la BD).
                                                                                let nuevosEliminados =
                                                                                    [
                                                                                        ...formik
                                                                                            .values
                                                                                            .eliminar_licencias,
                                                                                    ];
                                                                                if (
                                                                                    licenciaEliminada.id
                                                                                ) {
                                                                                    nuevosEliminados.push(
                                                                                        licenciaEliminada.id,
                                                                                    );
                                                                                }
                                                                                formik.setFieldValue(
                                                                                    'licencias',
                                                                                    nuevaLicencia,
                                                                                );
                                                                                formik.setFieldValue(
                                                                                    'eliminar_licencias',
                                                                                    nuevosEliminados,
                                                                                );
                                                                            }}></Button>
                                                                    </div>
                                                                    <div className='flex flex-col gap-2'>
                                                                        <div>
                                                                            <Badge>Modalidad</Badge>
                                                                            <SelectReact
                                                                                name='cambio_modalidad'
                                                                                options={
                                                                                    TIPO_MODALIDAD_LICENCIA
                                                                                }
                                                                                value={TIPO_MODALIDAD_LICENCIA.find(
                                                                                    (mod) =>
                                                                                        mod.value ===
                                                                                        licencia.tipo_modalidad,
                                                                                )}
                                                                                onChange={(e) => {
                                                                                    formik.setFieldValue(
                                                                                        `licencias[${index}].tipo_modalidad`,
                                                                                        (
                                                                                            e as TSelectOption
                                                                                        ).value,
                                                                                    );
                                                                                }}
                                                                                noOptionsMessage={(
                                                                                    e,
                                                                                ) =>
                                                                                    `No Existe ${e.inputValue}`
                                                                                }
                                                                            />
                                                                            {licencia.tipo_modalidad ===
                                                                                'otros' && (
                                                                                <div className='mt-2'>
                                                                                    <Badge>
                                                                                        Señale la
                                                                                        Modalidad
                                                                                    </Badge>
                                                                                    <Input
                                                                                        name='otro_tipo'
                                                                                        value={
                                                                                            licencia.otro_tipo ||
                                                                                            ''
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) => {
                                                                                            formik.setFieldValue(
                                                                                                `licencias[${index}].otro_tipo`,
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                            );
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className='grid grid-cols-2 gap-2'>
                                                                            <div>
                                                                                <Badge>
                                                                                    Cantidad
                                                                                </Badge>
                                                                                <Input
                                                                                    name='cantidad'
                                                                                    type='number'
                                                                                    value={
                                                                                        licencia.cantidad
                                                                                    }
                                                                                    onChange={(
                                                                                        e,
                                                                                    ) => {
                                                                                        formik.setFieldValue(
                                                                                            `licencias[${index}].cantidad`,
                                                                                            Number(
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                            ),
                                                                                        );
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <Badge>
                                                                                    Precio Unitario
                                                                                </Badge>
                                                                                <Input
                                                                                    name='precio_unitario'
                                                                                    type='number'
                                                                                    value={
                                                                                        licencia.precio_unitario
                                                                                    }
                                                                                    onChange={(
                                                                                        e,
                                                                                    ) => {
                                                                                        formik.setFieldValue(
                                                                                            `licencias[${index}].precio_unitario`,
                                                                                            Number(
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                            ),
                                                                                        );
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <Badge>
                                                                                    Fecha de Inicio
                                                                                </Badge>
                                                                                <Input
                                                                                    name='fecha_inicio'
                                                                                    type='date'
                                                                                    value={
                                                                                        licencia.fecha_inicio ||
                                                                                        ''
                                                                                    }
                                                                                    onChange={(
                                                                                        e,
                                                                                    ) => {
                                                                                        formik.setFieldValue(
                                                                                            `licencias[${index}].fecha_inicio`,
                                                                                            e.target
                                                                                                .value,
                                                                                        );
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <Badge>
                                                                                    Fecha de Fin
                                                                                </Badge>
                                                                                <Input
                                                                                    name='fecha_fin'
                                                                                    type='date'
                                                                                    value={
                                                                                        licencia.fecha_fin ||
                                                                                        ''
                                                                                    }
                                                                                    onChange={(
                                                                                        e,
                                                                                    ) => {
                                                                                        formik.setFieldValue(
                                                                                            `licencias[${index}].fecha_fin`,
                                                                                            e.target
                                                                                                .value,
                                                                                        );
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <Badge>
                                                                                Tipo de Moneda
                                                                            </Badge>
                                                                            <SelectReact
                                                                                name='tipo_moneda'
                                                                                options={
                                                                                    TIPO_MONEDA_LICENCIA
                                                                                }
                                                                                value={TIPO_MONEDA_LICENCIA.find(
                                                                                    (tip) =>
                                                                                        tip.value ===
                                                                                        licencia.tipo_moneda,
                                                                                )}
                                                                                onChange={(e) => {
                                                                                    if (e) {
                                                                                        formik.setFieldValue(
                                                                                            `licencias[${index}].tipo_moneda`,
                                                                                            (
                                                                                                e as TSelectOption
                                                                                            ).value,
                                                                                        );
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ),
                                                        )
                                                    ) : (
                                                        <div>Sin Licencias</div>
                                                    )}
                                                    {listaLicencias
                                                        .filter(
                                                            (lic) =>
                                                                !detalleContratoEmpresaCliente.contrato_licencias.some(
                                                                    (num) =>
                                                                        num.licencia === lic.id &&
                                                                        !formik.values.eliminar_licencias.some(
                                                                            (formLic) =>
                                                                                formLic === num.id,
                                                                        ),
                                                                ),
                                                        )
                                                        .filter(
                                                            (lic) =>
                                                                !formik.values.licencias.some(
                                                                    (formLic) =>
                                                                        formLic.licencia_id ===
                                                                        lic.id,
                                                                ),
                                                        ).length > 0 && (
                                                        <div
                                                            className={classNames(
                                                                'flex flex-row justify-between p-2',
                                                                'border border-x-0 border-b-0 border-t-black dark:border-t-white',
                                                            )}>
                                                            <div className='w-full'>
                                                                <Badge>Agregar Licencia</Badge>
                                                                <SelectReact
                                                                    name='nueva_licencia'
                                                                    options={listaLicencias
                                                                        .filter(
                                                                            (lic) =>
                                                                                !detalleContratoEmpresaCliente.contrato_licencias.some(
                                                                                    (num) =>
                                                                                        num.licencia ===
                                                                                            lic.id &&
                                                                                        !formik.values.eliminar_licencias.some(
                                                                                            (
                                                                                                formLic,
                                                                                            ) =>
                                                                                                formLic ===
                                                                                                num.id,
                                                                                        ),
                                                                                ),
                                                                        )
                                                                        .filter(
                                                                            (lic) =>
                                                                                !formik.values.licencias.some(
                                                                                    (formLic) =>
                                                                                        formLic.licencia_id ===
                                                                                        lic.id,
                                                                                ),
                                                                        )
                                                                        .map((lic) => ({
                                                                            value: lic.id.toString(),
                                                                            label: lic.nombre,
                                                                        }))}
                                                                    onChange={(e) => {
                                                                        setNuevaLicencia(
                                                                            (e as TSelectOption)
                                                                                .value,
                                                                        );
                                                                    }}
                                                                    value={{
                                                                        value: nuevaLicencia,
                                                                        label:
                                                                            listaLicencias.find(
                                                                                (lic) =>
                                                                                    lic.id.toString() ===
                                                                                    nuevaLicencia,
                                                                            )?.nombre || '',
                                                                    }}
                                                                    noOptionsMessage={(e) =>
                                                                        `No Existe ${e.inputValue}`
                                                                    }
                                                                />
                                                            </div>
                                                            <Button
                                                                onClick={() => {
                                                                    if (
                                                                        nuevaLicencia.trim() === ''
                                                                    ) {
                                                                        toast.error(
                                                                            'Seleccione una licencia para agregarla',
                                                                            {
                                                                                toastId:
                                                                                    'Seleccione una licencia para agregarla',
                                                                            },
                                                                        );
                                                                        return;
                                                                    }
                                                                    formik.setFieldValue(
                                                                        'licencias',
                                                                        [
                                                                            ...formik.values
                                                                                .licencias,
                                                                            {
                                                                                licencia_id:
                                                                                    Number(
                                                                                        nuevaLicencia,
                                                                                    ),
                                                                                cantidad: 1,
                                                                                tipo_modalidad:
                                                                                    'anual',
                                                                                precio_unitario: 1,
                                                                            },
                                                                        ],
                                                                    );
                                                                    setNuevaLicencia('');
                                                                }}>
                                                                Agregar
                                                            </Button>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {detalleContratoEmpresaCliente
                                                        .contrato_licencias.length > 0 ? (
                                                        detalleContratoEmpresaCliente.contrato_licencias.map(
                                                            (licencia, index) => (
                                                                <div
                                                                    className={classNames(
                                                                        'flex justify-between p-2',
                                                                        index > 0 &&
                                                                            'border-t border-t-black',
                                                                    )}
                                                                    key={index}>
                                                                    <div>
                                                                        <div className='font-bold'>
                                                                            {
                                                                                licencia.nombre_licencia
                                                                            }
                                                                            <div className='text-xs font-normal'>
                                                                                {dayjs(
                                                                                    licencia.fecha_inicio,
                                                                                )
                                                                                    .locale('es')
                                                                                    .format(
                                                                                        'DD/MM/YYYY',
                                                                                    )}{' '}
                                                                                -{' '}
                                                                                {dayjs(
                                                                                    licencia.fecha_fin,
                                                                                )
                                                                                    .locale('es')
                                                                                    .format(
                                                                                        'DD/MM/YYYY',
                                                                                    )}
                                                                            </div>
                                                                        </div>
                                                                        <div className='text-sm font-light'>
                                                                            Modalidad:{' '}
                                                                            {licencia.tipo_modalidad ===
                                                                            'otros'
                                                                                ? licencia.otro_tipo
                                                                                : licencia.tipo_modalidad_label}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div className='text-sm font-light'>
                                                                            Cantidad:{' '}
                                                                            {licencia.cantidad}
                                                                        </div>
                                                                        <div className='text-sm font-light'>
                                                                            ${' '}
                                                                            {
                                                                                licencia.precio_unitario
                                                                            }{' '}
                                                                            {licencia.tipo_moneda}{' '}
                                                                            c/u
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ),
                                                        )
                                                    ) : (
                                                        <div>Sin Licencias</div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </CardBody>
                                </Card>
                            )}
                        </div>
                    </div>
                )}
            </Container>
        </PageWrapper>
    );
}

export default ContratosDelCliente;
