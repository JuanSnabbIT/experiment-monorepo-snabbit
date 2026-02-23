import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import RatingInput from '@/components/utils/RatingInput';
import {
    GUARDAR_RETROALIMENTACION,
    LIMPIAR_RETROALIMENTACION,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import {
    useBulkUpdateRetroalimentacionOTMutation,
    useGetDetalleRetroalimentacionOTPublicQuery,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function RetroalimentacionOT() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { uuid } = useParams();
    const { data: detalleSinPermisosRetroalimentacionOT } =
        useGetDetalleRetroalimentacionOTPublicQuery(uuid, { skip: !uuid });
    const { guardadoRetroalimentacionOT } = useAppSelector((state) => state.auth);
    const [bulkUpdateRetroalimentacion] = useBulkUpdateRetroalimentacionOTMutation();

    useEffect(() => {
        if (guardadoRetroalimentacionOT && guardadoRetroalimentacionOT.token != uuid) {
            dispatch(LIMPIAR_RETROALIMENTACION());
        }
    }, [dispatch, guardadoRetroalimentacionOT, uuid]);

    useEffect(() => {
        if (detalleSinPermisosRetroalimentacionOT) {
            // Si ya fue respondida, no redirigir — mostrar estado visual
            if (!detalleSinPermisosRetroalimentacionOT.ya_respondida) {
                formik.setValues({
                    preguntas: detalleSinPermisosRetroalimentacionOT.retroalimentacion_aplicada.map(
                        (retro) => ({
                            id: retro.id,
                            cantidad_estrellas: retro.cantidad_estrellas || 0,
                            observaciones: retro.observaciones,
                        }),
                    ),
                });
            }
        }
        if (
            detalleSinPermisosRetroalimentacionOT &&
            !detalleSinPermisosRetroalimentacionOT.ya_respondida &&
            guardadoRetroalimentacionOT &&
            detalleSinPermisosRetroalimentacionOT.uuid === guardadoRetroalimentacionOT.token
        ) {
            formik.setValues({ preguntas: guardadoRetroalimentacionOT.preguntas });
        }
    }, [detalleSinPermisosRetroalimentacionOT]);

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
                    // Si necesitas validar el campo id, puedes descomentar la siguiente línea:
                    // id: Yup.number().required("El ID es obligatorio"),
                    cantidad_estrellas: Yup.number()
                        .typeError('Debe ser un número')
                        .required('La cantidad de estrellas es obligatoria'),
                    observaciones: Yup.string().when('cantidad_estrellas', {
                        is: (val: number) => val < 3,
                        then: (schema) =>
                            schema.required(
                                'Las observaciones son obligatorias cuando la calificación es menor a 3',
                            ),
                        otherwise: (schema) => schema.notRequired(),
                    }),
                }),
            ),
        }),
        onSubmit: async (values) => {
            try {
                await bulkUpdateRetroalimentacion({ items: values.preguntas }).unwrap();
                toast.success('Retroalimentación guardada exitosamente. ¡Gracias por su evaluación!', { autoClose: 2000 });
                navigate('/login');
            } catch (error: unknown) {
                toast.error(getErrorMessage(error) || 'Error al enviar la retroalimentación', {
                    toastId: 'Error al editar la retroalimentación',
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
    }, [formik.values]);

    return (
        <PageWrapper
            isProtectedRoute={false}
            name='Retroalimentación OT'
            title='Retroalimentación OT'>
            <Subheader>
                <SubheaderLeft>
                    <Tooltip text='Volver al inicio de sesión'>
                        <Button
                            icon='HeroArrowLeft'
                            onClick={() => {
                                navigate(`/login`);
                            }}></Button>
                    </Tooltip>
                    <Badge className='text-xl'>Encuesta de Satisfacción</Badge>
                </SubheaderLeft>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex flex-col gap-4'>
                    {detalleSinPermisosRetroalimentacionOT && (
                        <>
                            {/* Encabezado con contexto de la OT */}
                            <Card>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <Badge className='text-xl' color='blue'>
                                            {detalleSinPermisosRetroalimentacionOT.empresa_nombre || 'Empresa'}
                                        </Badge>
                                    </CardHeaderChild>
                                    <CardHeaderChild>
                                        <Badge className='text-lg'>
                                            OT N°{detalleSinPermisosRetroalimentacionOT.numero_ot}
                                        </Badge>
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody>
                                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                                        {detalleSinPermisosRetroalimentacionOT.descripcion_ot && (
                                            <div className='col-span-full'>
                                                <Badge>Descripción del Servicio</Badge>
                                                <div className='ml-4 mt-1'>
                                                    {detalleSinPermisosRetroalimentacionOT.descripcion_ot}
                                                </div>
                                            </div>
                                        )}
                                        {detalleSinPermisosRetroalimentacionOT.tecnico_responsable_nombre && (
                                            <div>
                                                <Badge>Responsable</Badge>
                                                <div className='ml-4 mt-1'>
                                                    {detalleSinPermisosRetroalimentacionOT.tecnico_responsable_nombre}
                                                </div>
                                            </div>
                                        )}
                                        {detalleSinPermisosRetroalimentacionOT.fecha_inicio_ot && (
                                            <div>
                                                <Badge>Fecha Inicio</Badge>
                                                <div className='ml-4 mt-1'>
                                                    {dayjs(detalleSinPermisosRetroalimentacionOT.fecha_inicio_ot).format('DD/MM/YYYY')}
                                                </div>
                                            </div>
                                        )}
                                        {detalleSinPermisosRetroalimentacionOT.fecha_finalizacion_ot && (
                                            <div>
                                                <Badge>Fecha Finalización</Badge>
                                                <div className='ml-4 mt-1'>
                                                    {dayjs(detalleSinPermisosRetroalimentacionOT.fecha_finalizacion_ot).format('DD/MM/YYYY')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardBody>
                            </Card>

                            {/* Estado: Ya respondida */}
                            {detalleSinPermisosRetroalimentacionOT.ya_respondida ? (
                                <Alert variant='solid' color='emerald' icon='HeroCheckCircle'>
                                    <div className='text-center'>
                                        <h3 className='text-lg font-bold'>¡Gracias por su retroalimentación!</h3>
                                        <p className='mt-1'>
                                            Esta encuesta ya fue respondida el{' '}
                                            {dayjs(detalleSinPermisosRetroalimentacionOT.fecha_retroalimentacion).format('DD/MM/YYYY [a las] HH:mm')}.
                                        </p>
                                    </div>
                                </Alert>
                            ) : (
                                <>
                                    {/* Preguntas */}
                                    {detalleSinPermisosRetroalimentacionOT.retroalimentacion_aplicada
                                        .length > 0 ? (
                                        <>
                                            {detalleSinPermisosRetroalimentacionOT.retroalimentacion_aplicada.map(
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
                                                                            formik.values.preguntas[index]
                                                                                ? formik.values.preguntas[
                                                                                      index
                                                                                  ].cantidad_estrellas
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
                                                                        .cantidad_estrellas < 3 && (
                                                                        <div className='flex flex-col items-center justify-center'>
                                                                            <Badge>
                                                                                ¿A qué se debe su
                                                                                calificación?
                                                                            </Badge>
                                                                            <Validation
                                                                                isValid={formik.isValid}
                                                                                isTouched={
                                                                                    typeof formik.touched
                                                                                        .preguntas !==
                                                                                        'string' &&
                                                                                    Array.isArray(
                                                                                        formik.touched
                                                                                            .preguntas,
                                                                                    )
                                                                                        ? !!formik.touched
                                                                                              .preguntas[
                                                                                              index
                                                                                          ]?.observaciones
                                                                                        : false
                                                                                }
                                                                                invalidFeedback={
                                                                                    typeof formik.errors
                                                                                        .preguntas ===
                                                                                    'string'
                                                                                        ? formik.errors
                                                                                              .preguntas[
                                                                                              index
                                                                                          ]
                                                                                        : // @ts-ignore
                                                                                          formik.errors
                                                                                                .preguntas &&
                                                                                            typeof formik
                                                                                                .errors
                                                                                                .preguntas[
                                                                                                index
                                                                                            ] != 'string'
                                                                                          ? formik.errors
                                                                                                .preguntas[
                                                                                                index
                                                                                            ].observaciones
                                                                                          : ''
                                                                                }>
                                                                                <Textarea
                                                                                    className='w-full md:w-[20vw]'
                                                                                    rows={4}
                                                                                    name={`preguntas[${index}].observaciones`}
                                                                                    onChange={(e) => {
                                                                                        formik.handleChange(
                                                                                            e,
                                                                                        );
                                                                                    }}
                                                                                    onBlur={
                                                                                        formik.handleBlur
                                                                                    }
                                                                                    value={
                                                                                        formik.values
                                                                                            .preguntas[
                                                                                            index
                                                                                        ]
                                                                                            ? formik.values
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
                                                                dispatch(LIMPIAR_RETROALIMENTACION());
                                                                formik.setValues({ preguntas: [] });
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
                                                            Enviar Evaluación
                                                        </Button>
                                                    </CardHeaderChild>
                                                </CardHeader>
                                            </Card>
                                        </>
                                    ) : (
                                        <Alert variant='solid' color='amber' icon='HeroExclamationTriangle'>
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

export default RetroalimentacionOT;
