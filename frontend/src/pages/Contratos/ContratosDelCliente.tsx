/**
 * @deprecated Usar DetalleContrato.tsx con la ruta /empresa/detalle-cliente/:clienteId/contrato/:contratoId.
 * Esta página se mantiene temporalmente mientras se completa la migración.
 * Ver: pages/Contratos/DetalleContrato.tsx
 */
import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, {
    CardBody,
    CardFooter,
    CardFooterChild,
} from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
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
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import TabCondiciones from './components/TabCondiciones';
import TabLicencias from './components/TabLicencias';
import TabServicios from './components/TabServicios';
import TabUsuarios from './components/TabUsuarios';
import TabVisitas from './components/TabVisitas';
import { IContratoEdicion } from './components/contrato.types';
import DetalleConfidencialidadContrato from './modals/DetalleConfidencialidadContrato';

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
    const [searchParams, setSearchParams] = useSearchParams();
    const [editando, setEditando] = useState<boolean>(false);
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
                        {/* Servicios y Planes */}
                        <div className='col-span-full flex flex-col gap-4 lg:col-span-8'>
                            <TabServicios
                                formik={formik}
                                editando={editando}
                                detalleContratoEmpresaCliente={detalleContratoEmpresaCliente}
                                listaContentType={listaContentType}
                            />
                            <TabCondiciones
                                formik={formik}
                                editando={editando}
                                detalleContratoEmpresaCliente={detalleContratoEmpresaCliente}
                                listaCondicionesEspeciales={listaCondicionesEspeciales}
                            />
                            <TabUsuarios
                                formik={formik}
                                editando={editando}
                                detalleContratoEmpresaCliente={detalleContratoEmpresaCliente}
                                listaUsuariosTodoElCliente={listaUsuariosTodoElCliente}
                            />
                        </div>

                        {/* Visitas y Licencias */}
                        <div className='col-span-full flex flex-col gap-4 lg:col-span-4'>
                            <TabVisitas
                                formik={formik}
                                editando={editando}
                                detalleContratoEmpresaCliente={detalleContratoEmpresaCliente}
                                listaVisitas={listaVisitas}
                            />
                            <TabLicencias
                                formik={formik}
                                editando={editando}
                                detalleContratoEmpresaCliente={detalleContratoEmpresaCliente}
                                listaLicencias={listaLicencias}
                            />
                        </div>
                    </div>
                )}
            </Container>
        </PageWrapper>
    );
}

export default ContratosDelCliente;
