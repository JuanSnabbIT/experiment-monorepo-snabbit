import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import RatingInput from '@/components/utils/RatingInput';
import {
    GUARDAR_RETROALIMENTACION,
    LIMPIAR_RETROALIMENTACION,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import {
    useGetDetalleRetroalimentacionOTV3PublicQuery,
    useResponderRetroalimentacionPublicMutation,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function RetroalimentacionOTV3() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { uuid } = useParams();
    const {
        data: detalle,
        isLoading,
        isError,
        error,
        refetch,
    } = useGetDetalleRetroalimentacionOTV3PublicQuery(uuid, {
        skip: !uuid,
    });
    const { guardadoRetroalimentacionOT } = useAppSelector((state) => state.auth);
    const [responderRetroalimentacion] = useResponderRetroalimentacionPublicMutation();

    const vencida = detalle?.vencida === true && !detalle?.ya_respondida;
    const activa = detalle && !detalle.ya_respondida && !vencida;

    useEffect(() => {
        if (guardadoRetroalimentacionOT && guardadoRetroalimentacionOT.token !== uuid) {
            dispatch(LIMPIAR_RETROALIMENTACION());
        }
    }, [dispatch, guardadoRetroalimentacionOT, uuid]);

    useEffect(() => {
        if (detalle) {
            if (!detalle.ya_respondida && !detalle.vencida) {
                formik.setValues({
                    preguntas: detalle.retroalimentacion_aplicada.map((retro) => ({
                        id: retro.id,
                        cantidad_estrellas: retro.cantidad_estrellas || 0,
                        observaciones: retro.observaciones,
                    })),
                });
            }
        }
        if (
            detalle &&
            !detalle.ya_respondida &&
            !detalle.vencida &&
            guardadoRetroalimentacionOT &&
            detalle.uuid === guardadoRetroalimentacionOT.token
        ) {
            formik.setValues({ preguntas: guardadoRetroalimentacionOT.preguntas });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detalle]);

    const formik = useFormik<{
        preguntas: {
            id: number;
            cantidad_estrellas: number;
            observaciones: string;
        }[];
    }>({
        enableReinitialize: true,
        initialValues: {
            preguntas: [],
        },
        validationSchema: Yup.object().shape({
            preguntas: Yup.array().of(
                Yup.object().shape({
                    cantidad_estrellas: Yup.number()
                        .typeError('Debe ser un numero')
                        .required('La cantidad de estrellas es obligatoria'),
                    observaciones: Yup.string().when('cantidad_estrellas', {
                        is: (val: number) => val < 3,
                        then: (schema) =>
                            schema.required(
                                'Las observaciones son obligatorias cuando la calificacion es menor a 3',
                            ),
                        otherwise: (schema) => schema.notRequired(),
                    }),
                }),
            ),
        }),
        onSubmit: async (values) => {
            try {
                await responderRetroalimentacion({ uuid: uuid!, items: values.preguntas }).unwrap();
                toast.success(
                    'Retroalimentacion guardada exitosamente. Gracias por su evaluacion!',
                    { autoClose: 2000 },
                );
                dispatch(LIMPIAR_RETROALIMENTACION());
                formik.setValues({ preguntas: [] });
                await refetch();
            } catch (error: unknown) {
                toast.error(getErrorMessage(error) || 'Error al enviar la retroalimentacion', {
                    toastId: 'Error al editar la retroalimentacion',
                });
            }
        },
    });

    useEffect(() => {
        if (formik.values.preguntas.length > 0) {
            dispatch(
                GUARDAR_RETROALIMENTACION({ token: uuid, preguntas: formik.values.preguntas }),
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formik.values]);

    if (!uuid) {
        return (
            <PageWrapper isProtectedRoute={false} name='Retroalimentacion OT V3' title='Retroalimentacion OT V3'>
                <Container>
                    <Alert variant='solid' color='red' icon='HeroXCircle'>
                        Enlace no valido.
                    </Alert>
                </Container>
            </PageWrapper>
        );
    }

    if (isLoading) {
        return (
            <PageWrapper isProtectedRoute={false} name='Retroalimentacion OT V3' title='Retroalimentacion OT V3'>
                <Container>
                    <div className='py-10 text-center text-sm text-zinc-500'>
                        Cargando encuesta...
                    </div>
                </Container>
            </PageWrapper>
        );
    }

    if (isError || !detalle) {
        const statusCode =
            typeof error === 'object' && error !== null && 'status' in error
                ? (error as { status?: number }).status
                : undefined;
        const errorData =
            typeof error === 'object' && error !== null && 'data' in error
                ? (error as { data?: { fecha_vencimiento?: string } }).data
                : undefined;
        const fechaVencimiento = errorData?.fecha_vencimiento;

        return (
            <PageWrapper isProtectedRoute={false} name='Retroalimentacion OT V3' title='Retroalimentacion OT V3'>
                <Container>
                    {statusCode === 410 ? (
                        <Alert variant='solid' color='red' icon='HeroXCircle'>
                            <div className='text-center'>
                                <div className='text-lg font-bold'>Encuesta vencida</div>
                                <div className='mt-1 text-sm'>
                                    El plazo para responder esta encuesta ha finalizado
                                    {fechaVencimiento
                                        ? ` el ${dayjs(fechaVencimiento).format('DD/MM/YYYY [a las] HH:mm')}`
                                        : ''}
                                    .
                                </div>
                                <div className='mt-4 text-sm text-zinc-200'>
                                    Puede cerrar esta ventana.
                                </div>
                            </div>
                        </Alert>
                    ) : (
                        <Alert variant='solid' color='red' icon='HeroExclamationTriangle'>
                            <div className='text-center'>
                                <div className='text-lg font-bold'>
                                    {statusCode === 404
                                        ? 'Enlace no encontrado'
                                        : 'No pudimos cargar la encuesta'}
                                </div>
                                <div className='mt-1 text-sm'>{getErrorMessage(error)}</div>
                                <div className='mt-4 text-sm text-zinc-200'>
                                    Puede cerrar esta ventana.
                                </div>
                            </div>
                        </Alert>
                    )}
                </Container>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper
            isProtectedRoute={false}
            name='Retroalimentacion OT V3'
            title='Retroalimentacion OT V3'>
            <Subheader>
                <SubheaderLeft>
                    <Badge className='text-xl'>Encuesta de Satisfaccion</Badge>
                </SubheaderLeft>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex flex-col gap-4'>
                    {detalle && (
                        <>
                            {/* Encabezado con contexto de la OT */}
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <Badge className='text-xl' color='blue'>
                                            {detalle.empresa_nombre || 'Empresa'}
                                        </Badge>
                                    </CardHeaderChild>
                                    <CardHeaderChild>
                                        <Badge className='text-lg'>
                                            OT N°{detalle.numero_ot}
                                        </Badge>
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody>
                                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                                        {detalle.descripcion_ot && (
                                            <div className='col-span-full'>
                                                <Badge>Descripcion del Servicio</Badge>
                                                <div className='ml-4 mt-1'>
                                                    {detalle.descripcion_ot}
                                                </div>
                                            </div>
                                        )}
                                        {detalle.tecnico_responsable_nombre && (
                                            <div>
                                                <Badge>Responsable</Badge>
                                                <div className='ml-4 mt-1'>
                                                    {detalle.tecnico_responsable_nombre}
                                                </div>
                                            </div>
                                        )}
                                        {detalle.fecha_inicio_ot && (
                                            <div>
                                                <Badge>Fecha Inicio</Badge>
                                                <div className='ml-4 mt-1'>
                                                    {dayjs(detalle.fecha_inicio_ot).format(
                                                        'DD/MM/YYYY',
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {detalle.fecha_finalizacion_ot && (
                                            <div>
                                                <Badge>Fecha Finalizacion</Badge>
                                                <div className='ml-4 mt-1'>
                                                    {dayjs(detalle.fecha_finalizacion_ot).format(
                                                        'DD/MM/YYYY',
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {activa && detalle.fecha_vencimiento && (
                                            <div>
                                                <Badge color='amber'>Valida hasta</Badge>
                                                <div className='ml-4 mt-1'>
                                                    {dayjs(detalle.fecha_vencimiento).format(
                                                        'DD/MM/YYYY HH:mm',
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardBody>
                            </Card>

                            {/* Estado: Ya respondida */}
                            {detalle.ya_respondida && (
                                <Alert variant='solid' color='emerald' icon='HeroCheckCircle'>
                                    <div className='text-center'>
                                        <h3 className='text-lg font-bold'>
                                            Gracias por su retroalimentacion!
                                        </h3>
                                        <p className='mt-1'>
                                            Esta encuesta ya fue respondida el{' '}
                                            {dayjs(detalle.fecha_retroalimentacion).format(
                                                'DD/MM/YYYY [a las] HH:mm',
                                            )}
                                            .
                                        </p>
                                    </div>
                                </Alert>
                            )}

                            {/* Estado: Vencida */}
                            {vencida && (
                                <Alert variant='solid' color='red' icon='HeroXCircle'>
                                    <div className='text-center'>
                                        <h3 className='text-lg font-bold'>
                                            Encuesta vencida
                                        </h3>
                                        <p className='mt-1'>
                                            El plazo para responder esta encuesta ha finalizado
                                            {detalle.fecha_vencimiento &&
                                                ` el ${dayjs(detalle.fecha_vencimiento).format('DD/MM/YYYY [a las] HH:mm')}`}
                                            . Ya no es posible enviar su evaluacion.
                                        </p>
                                    </div>
                                </Alert>
                            )}

                            {/* Preguntas: solo si activa */}
                            {activa && (
                                <>
                                    {detalle.retroalimentacion_aplicada.length > 0 ? (
                                        <>
                                            {detalle.retroalimentacion_aplicada.map(
                                                (retro, index) => (
                                                    <Card key={retro.id}>
                                                        <CardHeader>
                                                            <CardHeaderChild>
                                                                <Badge className='text-xl'>
                                                                    Pregunta {index + 1}
                                                                </Badge>
                                                            </CardHeaderChild>
                                                        </CardHeader>
                                                        <CardBody>
                                                            <div className='flex flex-col gap-4'>
                                                                <div className='mx-4 text-center'>
                                                                    {retro.pregunta_texto}
                                                                </div>
                                                                <div className='flex items-center justify-center'>
                                                                    <RatingInput
                                                                        defaultValue={0}
                                                                        rating={
                                                                            formik.values
                                                                                .preguntas[index]
                                                                                ? formik.values
                                                                                      .preguntas[
                                                                                      index
                                                                                  ]
                                                                                      .cantidad_estrellas
                                                                                : 0
                                                                        }
                                                                        maxStars={5}
                                                                        onChange={(e) => {
                                                                            formik.setFieldValue(
                                                                                `preguntas[${index}].cantidad_estrellas`,
                                                                                e,
                                                                            );
                                                                            if (e > 3) {
                                                                                formik.setFieldValue(
                                                                                    `preguntas[${index}].observaciones`,
                                                                                    '',
                                                                                );
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                                {formik.values.preguntas[index] &&
                                                                    formik.values.preguntas[index]
                                                                        .cantidad_estrellas <
                                                                        3 && (
                                                                        <div className='flex flex-col items-center justify-center'>
                                                                            <Badge>
                                                                                A que se debe su
                                                                                calificacion?
                                                                            </Badge>
                                                                            <Validation
                                                                                isValid={
                                                                                    formik.isValid
                                                                                }
                                                                                isTouched={
                                                                                    typeof formik
                                                                                        .touched
                                                                                        .preguntas !==
                                                                                        'string' &&
                                                                                    Array.isArray(
                                                                                        formik
                                                                                            .touched
                                                                                            .preguntas,
                                                                                    )
                                                                                        ? !!formik
                                                                                              .touched
                                                                                              .preguntas[
                                                                                              index
                                                                                          ]
                                                                                              ?.observaciones
                                                                                        : false
                                                                                }
                                                                                invalidFeedback={
                                                                                    typeof formik
                                                                                        .errors
                                                                                        .preguntas ===
                                                                                    'string'
                                                                                        ? formik
                                                                                              .errors
                                                                                              .preguntas[
                                                                                              index
                                                                                          ]
                                                                                        : // @ts-ignore
                                                                                          formik
                                                                                                .errors
                                                                                                .preguntas &&
                                                                                              typeof formik
                                                                                                  .errors
                                                                                                  .preguntas[
                                                                                                  index
                                                                                              ] !==
                                                                                                  'string'
                                                                                            ? formik
                                                                                                  .errors
                                                                                                  .preguntas[
                                                                                                  index
                                                                                              ]
                                                                                                  .observaciones
                                                                                            : ''
                                                                                }>
                                                                                <Textarea
                                                                                    className='w-full md:w-[20vw]'
                                                                                    rows={4}
                                                                                    name={`preguntas[${index}].observaciones`}
                                                                                    onChange={(
                                                                                        e,
                                                                                    ) => {
                                                                                        formik.handleChange(
                                                                                            e,
                                                                                        );
                                                                                    }}
                                                                                    onBlur={
                                                                                        formik.handleBlur
                                                                                    }
                                                                                    value={
                                                                                        formik
                                                                                            .values
                                                                                            .preguntas[
                                                                                            index
                                                                                        ]
                                                                                            ? formik
                                                                                                  .values
                                                                                                  .preguntas[
                                                                                                  index
                                                                                              ]
                                                                                                  .observaciones
                                                                                            : ''
                                                                                    }
                                                                                />
                                                                            </Validation>
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        </CardBody>
                                                    </Card>
                                                ),
                                            )}
                                            <Card>
                                                <CardHeader>
                                                    <CardHeaderChild>
                                                        <Button
                                                            variant='solid'
                                                            color='zinc'
                                                            onClick={() => {
                                                                dispatch(
                                                                    LIMPIAR_RETROALIMENTACION(),
                                                                );
                                                                formik.setValues({
                                                                    preguntas: [],
                                                                });
                                                            }}>
                                                            Limpiar
                                                        </Button>
                                                    </CardHeaderChild>
                                                    <CardHeaderChild>
                                                        <Button
                                                            variant='solid'
                                                            color='blue'
                                                            onClick={() => {
                                                                formik.handleSubmit();
                                                            }}>
                                                            Enviar Evaluacion
                                                        </Button>
                                                    </CardHeaderChild>
                                                </CardHeader>
                                            </Card>
                                        </>
                                    ) : (
                                        <Alert
                                            variant='solid'
                                            color='amber'
                                            icon='HeroExclamationTriangle'>
                                            No hay preguntas disponibles para esta encuesta.
                                        </Alert>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </Container>
        </PageWrapper>
    );
}

export default RetroalimentacionOTV3;
