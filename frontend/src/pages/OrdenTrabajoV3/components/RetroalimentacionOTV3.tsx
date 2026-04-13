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
import type {
    IRetroalimentacionAplicada,
    IRetroalimentacionSinPermisosOT,
} from '@/interface/ordenTrabajo.interface';
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
import { FormikErrors, FormikTouched, getIn, useFormik } from 'formik';
import { type ChangeEventHandler, type FocusEventHandler, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

type TPreguntaForm = {
    id: number;
    cantidad_estrellas: number;
    observaciones: string;
};

type TStandardFormValues = {
    preguntas: TPreguntaForm[];
    observacion_retroalimentacion: string;
};

type TLegacyFormValues = {
    preguntas: TPreguntaForm[];
};

type TSurveyMetrics = {
    minRating: number | null;
    ratedCount: number;
    remainingCount: number;
    allRated: boolean;
    showComment: boolean;
    commentRequired: boolean;
    readyToSend: boolean;
};

const PREGUNTAS_MAXIMAS_ESTANDAR = 5;

const PREGUNTAS_OTV3_GENERICAS: string[] = [
    '¿Qué tan satisfecho/a está con el servicio recibido?',
    '¿Cómo evalúa el tiempo de respuesta?',
    '¿Cómo evalúa la calidad de la solución/resultado?',
    '¿Cómo evalúa la comunicación y cordialidad?',
    '¿Recomendaría nuestro servicio?',
];

function normalizeQuestionText(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

const ORDEN_PREGUNTAS_OTV3 = new Map(
    PREGUNTAS_OTV3_GENERICAS.map((pregunta, index) => [
        normalizeQuestionText(pregunta),
        index,
    ]),
);

function isValidRating(value: number): boolean {
    return Number.isInteger(value) && value >= 1 && value <= 5;
}

function getMinRating(preguntas: TPreguntaForm[]): number | null {
    const ratings = preguntas.map((p) => p.cantidad_estrellas).filter(isValidRating);
    if (!ratings.length) {
        return null;
    }
    return Math.min(...ratings);
}

function sortStandardQuestions(
    retroalimentacionAplicada: IRetroalimentacionAplicada[],
): IRetroalimentacionAplicada[] {
    return [...retroalimentacionAplicada].sort((a, b) => {
        const indexA =
            ORDEN_PREGUNTAS_OTV3.get(normalizeQuestionText(a.pregunta_texto)) ?? Number.MAX_SAFE_INTEGER;
        const indexB =
            ORDEN_PREGUNTAS_OTV3.get(normalizeQuestionText(b.pregunta_texto)) ?? Number.MAX_SAFE_INTEGER;

        if (indexA === indexB) {
            return a.id - b.id;
        }

        return indexA - indexB;
    });
}

function isLegacySurvey(retroalimentacionAplicada: IRetroalimentacionAplicada[]): boolean {
    return retroalimentacionAplicada.length > PREGUNTAS_MAXIMAS_ESTANDAR;
}

function buildDraftPreguntas(
    retroalimentacionAplicada: IRetroalimentacionAplicada[],
    savedPreguntas?: TPreguntaForm[],
): TPreguntaForm[] {
    const savedById = new Map(savedPreguntas?.map((pregunta) => [pregunta.id, pregunta]) ?? []);

    return retroalimentacionAplicada.map((retro) => {
        const saved = savedById.get(retro.id);
        const rawRating = saved?.cantidad_estrellas ?? retro.cantidad_estrellas ?? 0;

        return {
            id: retro.id,
            cantidad_estrellas: isValidRating(rawRating) ? rawRating : 0,
            observaciones: saved?.observaciones ?? retro.observaciones ?? '',
        };
    });
}

function calculateSurveyMetrics(
    preguntas: TPreguntaForm[],
    observacionRetroalimentacion: string,
): TSurveyMetrics {
    const ratedCount = preguntas.filter((pregunta) => isValidRating(pregunta.cantidad_estrellas)).length;
    const allRated =
        preguntas.length === PREGUNTAS_MAXIMAS_ESTANDAR &&
        ratedCount === PREGUNTAS_MAXIMAS_ESTANDAR;
    const minRating = getMinRating(preguntas);
    const showComment = minRating !== null && minRating <= 4;
    const commentRequired = minRating !== null && minRating <= 2;
    const hasComment = observacionRetroalimentacion.trim().length > 0;
    const readyToSend = allRated && (!commentRequired || hasComment);

    return {
        minRating,
        ratedCount,
        remainingCount: Math.max(PREGUNTAS_MAXIMAS_ESTANDAR - ratedCount, 0),
        allRated,
        showComment,
        commentRequired,
        readyToSend,
    };
}

function getLegacyObservacionTouched(touched: FormikTouched<TLegacyFormValues>, index: number): boolean {
    return Boolean(getIn(touched, `preguntas[${index}].observaciones`));
}

function getLegacyObservacionError(
    errors: FormikErrors<TLegacyFormValues>,
    index: number,
): string | undefined {
    const value = getIn(errors, `preguntas[${index}].observaciones`);
    return typeof value === 'string' ? value : undefined;
}

const ratingFieldSchema = Yup.number()
    .typeError('Debe ser un número')
    .required('La cantidad de estrellas es obligatoria')
    .min(1, 'Debe estar entre 1 y 5')
    .max(5, 'Debe estar entre 1 y 5');

function buildStandardValidationSchema() {
    return Yup.object({
        preguntas: Yup.array()
            .of(
                Yup.object({
                    id: Yup.number().required(),
                    cantidad_estrellas: ratingFieldSchema,
                    observaciones: Yup.string().default(''),
                }),
            )
            .required()
            .length(PREGUNTAS_MAXIMAS_ESTANDAR, 'Debe responder todas las preguntas'),
        observacion_retroalimentacion: Yup.string().test(
            'required-if-low-rating',
            'Este campo es obligatorio cuando la calificación es 2 estrellas o menor.',
            function (value) {
                const parent = this.parent as TStandardFormValues;
                const minRating = getMinRating(parent?.preguntas ?? []);
                if (minRating !== null && minRating <= 2) {
                    return (value ?? '').trim().length > 0;
                }
                return true;
            },
        ),
    });
}

function buildLegacyValidationSchema() {
    return Yup.object({
        preguntas: Yup.array().of(
            Yup.object({
                id: Yup.number().required(),
                cantidad_estrellas: ratingFieldSchema,
                observaciones: Yup.string().when('cantidad_estrellas', {
                    is: (val: number) => typeof val === 'number' && val < 3,
                    then: (schema) =>
                        schema.required(
                            'Las observaciones son obligatorias cuando la calificación es menor a 3',
                        ),
                    otherwise: (schema) => schema.notRequired(),
                }),
            }),
        ),
    });
}

function SurveyHeader({
    detalle,
    activa,
}: {
    detalle: IRetroalimentacionSinPermisosOT;
    activa: boolean;
}) {
    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <div className='flex flex-wrap items-center gap-2'>
                        <Badge color='blue'>{detalle.empresa_nombre || 'Empresa'}</Badge>
                        <Badge color='zinc'>OT #{detalle.numero_ot}</Badge>
                    </div>
                </CardHeaderChild>
                {activa && detalle.fecha_vencimiento ? (
                    <CardHeaderChild>
                        <Badge color='amber'>
                            Válida hasta {dayjs(detalle.fecha_vencimiento).format('DD/MM/YYYY HH:mm')}
                        </Badge>
                    </CardHeaderChild>
                ) : null}
            </CardHeader>
            <CardBody>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    {detalle.descripcion_ot ? (
                        <div className='md:col-span-2'>
                            <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500'>
                                Descripción del servicio
                            </div>
                            <div className='mt-1 text-sm text-zinc-700 dark:text-zinc-200'>
                                {detalle.descripcion_ot}
                            </div>
                        </div>
                    ) : null}
                    {detalle.tecnico_responsable_nombre ? (
                        <div>
                            <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500'>
                                Responsable
                            </div>
                            <div className='mt-1 text-sm text-zinc-700 dark:text-zinc-200'>
                                {detalle.tecnico_responsable_nombre}
                            </div>
                        </div>
                    ) : null}
                    {detalle.fecha_inicio_ot ? (
                        <div>
                            <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500'>
                                Fecha inicio
                            </div>
                            <div className='mt-1 text-sm text-zinc-700 dark:text-zinc-200'>
                                {dayjs(detalle.fecha_inicio_ot).format('DD/MM/YYYY')}
                            </div>
                        </div>
                    ) : null}
                    {detalle.fecha_finalizacion_ot ? (
                        <div>
                            <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500'>
                                Fecha finalización
                            </div>
                            <div className='mt-1 text-sm text-zinc-700 dark:text-zinc-200'>
                                {dayjs(detalle.fecha_finalizacion_ot).format('DD/MM/YYYY')}
                            </div>
                        </div>
                    ) : null}
                </div>
            </CardBody>
        </Card>
    );
}

function SurveyQuestions({
    preguntas,
    values,
    onRate,
}: {
    preguntas: IRetroalimentacionAplicada[];
    values: TPreguntaForm[];
    onRate: (index: number, rating: number) => void;
}) {
    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <div>
                        <div className='text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                            Encuesta de satisfacción
                        </div>
                        <div className='text-xs text-zinc-500'>1 = Muy deficiente · 5 = Excelente</div>
                    </div>
                </CardHeaderChild>
                <CardHeaderChild>
                    <Badge color='blue'>{PREGUNTAS_MAXIMAS_ESTANDAR} preguntas</Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='space-y-3'>
                {preguntas.map((retro, index) => (
                    <div
                        key={retro.id}
                        className='rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                            <div className='max-w-2xl'>
                                <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500'>
                                    Pregunta {index + 1}
                                </div>
                                <div className='mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-100'>
                                    {retro.pregunta_texto}
                                </div>
                            </div>
                            <div
                                className='flex items-center justify-start md:justify-end'
                                role='group'
                                aria-label={`Califique la pregunta ${index + 1}`}>
                                <RatingInput
                                    defaultValue={0}
                                    rating={values[index]?.cantidad_estrellas ?? 0}
                                    maxStars={5}
                                    thumb={false}
                                    onChange={(newRating) => onRate(index, newRating)}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </CardBody>
        </Card>
    );
}

function SurveyComment({
    show,
    required,
    value,
    touched,
    error,
    onChange,
    onBlur,
}: {
    show: boolean;
    required: boolean;
    value: string;
    touched: boolean;
    error?: string;
    onChange: ChangeEventHandler<HTMLTextAreaElement>;
    onBlur: FocusEventHandler<HTMLTextAreaElement>;
}) {
    if (!show) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <div className='text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                        {required ? 'Cuéntenos qué ocurrió' : '¿Qué faltó para 5 estrellas?'}
                    </div>
                </CardHeaderChild>
                <CardHeaderChild>
                    <Badge color={required ? 'red' : 'amber'}>
                        {required ? 'Comentario obligatorio' : 'Comentario opcional'}
                    </Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody>
                <Validation isValid={!error} isTouched={touched} invalidFeedback={error}>
                    <Textarea
                        rows={4}
                        name='observacion_retroalimentacion'
                        placeholder={
                            required
                                ? 'Describa brevemente el problema o qué podemos mejorar'
                                : 'Comparta un comentario para ayudarnos a mejorar (opcional)'
                        }
                        onChange={onChange}
                        onBlur={onBlur}
                        value={value}
                    />
                </Validation>
            </CardBody>
        </Card>
    );
}

function SurveySubmitBar({
    metrics,
    hasComment,
    isLoading,
    isValid,
    onSubmit,
}: {
    metrics: TSurveyMetrics;
    hasComment: boolean;
    isLoading: boolean;
    isValid: boolean;
    onSubmit: () => void;
}) {
    const statusText =
        metrics.remainingCount > 0
            ? `Faltan ${metrics.remainingCount} pregunta${metrics.remainingCount === 1 ? '' : 's'} por responder.`
            : metrics.commentRequired && !hasComment
              ? 'Agregue un comentario para continuar con el envío.'
              : 'Listo para enviar su evaluación.';

    return (
        <Card>
            <CardBody className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                <div className='text-sm text-zinc-600 dark:text-zinc-300' aria-live='polite'>
                    {statusText}
                </div>
                <Button
                    variant='solid'
                    color='blue'
                    isLoading={isLoading}
                    isDisable={!metrics.readyToSend || !isValid}
                    onClick={onSubmit}>
                    Enviar evaluación
                </Button>
            </CardBody>
        </Card>
    );
}

function RetroalimentacionOTV3StandardForm({
    detalle,
    uuid,
    refetch,
}: {
    detalle: IRetroalimentacionSinPermisosOT;
    uuid: string;
    refetch: () => Promise<unknown>;
}) {
    const dispatch = useAppDispatch();
    const { guardadoRetroalimentacionOT } = useAppSelector((state) => state.auth);
    const [responderRetroalimentacion, { isLoading }] =
        useResponderRetroalimentacionPublicMutation();
    const standardValidationSchema = useMemo(() => buildStandardValidationSchema(), []);

    const aplicadasOrdenadas = useMemo(
        () =>
            sortStandardQuestions(detalle.retroalimentacion_aplicada).slice(
                0,
                PREGUNTAS_MAXIMAS_ESTANDAR,
            ),
        [detalle.retroalimentacion_aplicada],
    );

    const initialValues = useMemo(() => {
        const saved =
            guardadoRetroalimentacionOT && guardadoRetroalimentacionOT.token === uuid
                ? guardadoRetroalimentacionOT
                : undefined;

        return {
            preguntas: buildDraftPreguntas(aplicadasOrdenadas, saved?.preguntas),
            observacion_retroalimentacion:
                saved?.observacion_retroalimentacion ?? detalle.observacion_retroalimentacion ?? '',
        };
    }, [
        aplicadasOrdenadas,
        detalle.observacion_retroalimentacion,
        guardadoRetroalimentacionOT,
        uuid,
    ]);

    const [submitError, setSubmitError] = useState<string | null>(null);

    const formik = useFormik<TStandardFormValues>({
        enableReinitialize: true,
        validateOnMount: true,
        initialValues,
        validationSchema: standardValidationSchema,
        onSubmit: async (values) => {
            try {
                setSubmitError(null);
                await responderRetroalimentacion({
                    uuid,
                    items: values.preguntas,
                    observacion_retroalimentacion: values.observacion_retroalimentacion,
                }).unwrap();
                toast.success('Retroalimentación guardada exitosamente. ¡Gracias por su evaluación!', {
                    autoClose: 2000,
                });
                dispatch(LIMPIAR_RETROALIMENTACION());
                await refetch();
            } catch (error: unknown) {
                const message = getErrorMessage(error) || 'Error al enviar la retroalimentación';
                setSubmitError(message);
                toast.error(message, { toastId: 'Error al enviar la retroalimentación' });
            }
        },
    });

    useEffect(() => {
        if (formik.values.preguntas.length > 0) {
            dispatch(
                GUARDAR_RETROALIMENTACION({
                    token: uuid,
                    preguntas: formik.values.preguntas,
                    observacion_retroalimentacion: formik.values.observacion_retroalimentacion,
                }),
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formik.values]);

    const metrics = useMemo(
        () =>
            calculateSurveyMetrics(
                formik.values.preguntas,
                formik.values.observacion_retroalimentacion,
            ),
        [formik.values.observacion_retroalimentacion, formik.values.preguntas],
    );
    const observacionTouched = Boolean(formik.touched.observacion_retroalimentacion);
    const observacionError =
        typeof formik.errors.observacion_retroalimentacion === 'string'
            ? formik.errors.observacion_retroalimentacion
            : undefined;
    const hasComment = formik.values.observacion_retroalimentacion.trim().length > 0;

    return (
        <>
            <SurveyQuestions
                preguntas={aplicadasOrdenadas}
                values={formik.values.preguntas}
                onRate={(index, newRating) => {
                    formik.setFieldValue(`preguntas[${index}].cantidad_estrellas`, newRating);
                    formik.setFieldValue(`preguntas[${index}].observaciones`, '');
                }}
            />

            <SurveyComment
                show={metrics.showComment}
                required={metrics.commentRequired}
                touched={observacionTouched}
                error={observacionError}
                value={formik.values.observacion_retroalimentacion}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
            />

            {submitError && (
                <Alert variant='solid' color='red' icon='HeroXCircle'>
                    {submitError}
                </Alert>
            )}

            <SurveySubmitBar
                metrics={metrics}
                hasComment={hasComment}
                isLoading={isLoading}
                isValid={formik.isValid}
                onSubmit={formik.submitForm}
            />
        </>
    );
}

function RetroalimentacionOTV3LegacyForm({
    detalle,
    uuid,
    refetch,
}: {
    detalle: IRetroalimentacionSinPermisosOT;
    uuid: string;
    refetch: () => Promise<unknown>;
}) {
    const dispatch = useAppDispatch();
    const { guardadoRetroalimentacionOT } = useAppSelector((state) => state.auth);
    const [responderRetroalimentacion, { isLoading }] =
        useResponderRetroalimentacionPublicMutation();
    const legacyValidationSchema = useMemo(() => buildLegacyValidationSchema(), []);

    const [submitError, setSubmitError] = useState<string | null>(null);

    const initialValues = useMemo(() => {
        const saved =
            guardadoRetroalimentacionOT && guardadoRetroalimentacionOT.token === uuid
                ? guardadoRetroalimentacionOT
                : undefined;

        return {
            preguntas:
                saved?.preguntas ??
                detalle.retroalimentacion_aplicada.map((retro) => ({
                    id: retro.id,
                    cantidad_estrellas: retro.cantidad_estrellas || 0,
                    observaciones: retro.observaciones || '',
                })),
        };
    }, [detalle.retroalimentacion_aplicada, guardadoRetroalimentacionOT, uuid]);

    const formik = useFormik<TLegacyFormValues>({
        enableReinitialize: true,
        initialValues,
        validationSchema: legacyValidationSchema,
        onSubmit: async (values) => {
            try {
                setSubmitError(null);
                await responderRetroalimentacion({ uuid, items: values.preguntas }).unwrap();
                toast.success('Retroalimentación guardada exitosamente. ¡Gracias por su evaluación!', {
                    autoClose: 2000,
                });
                dispatch(LIMPIAR_RETROALIMENTACION());
                await refetch();
            } catch (error: unknown) {
                const message = getErrorMessage(error) || 'Error al enviar la retroalimentación';
                setSubmitError(message);
                toast.error(message, { toastId: 'Error al enviar la retroalimentación' });
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

    return (
        <>
            {detalle.retroalimentacion_aplicada.length > 0 ? (
                <>
                    {detalle.retroalimentacion_aplicada.map((retro, index) => (
                        <Card key={retro.id}>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className='text-xl'>Pregunta {index + 1}</Badge>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className='flex flex-col gap-4'>
                                    <div className='mx-4 text-center'>{retro.pregunta_texto}</div>
                                    <div className='flex items-center justify-center'>
                                        <RatingInput
                                            defaultValue={0}
                                            rating={
                                                formik.values.preguntas[index]
                                                    ? formik.values.preguntas[index].cantidad_estrellas
                                                    : 0
                                            }
                                            maxStars={5}
                                            onChange={(value) => {
                                                formik.setFieldValue(
                                                    `preguntas[${index}].cantidad_estrellas`,
                                                    value,
                                                );
                                                if (value > 3) {
                                                    formik.setFieldValue(
                                                        `preguntas[${index}].observaciones`,
                                                        '',
                                                    );
                                                }
                                            }}
                                        />
                                    </div>
                                    {formik.values.preguntas[index] &&
                                        formik.values.preguntas[index].cantidad_estrellas < 3 && (
                                            <div className='flex flex-col items-center justify-center'>
                                                <Badge>¿A qué se debe su calificación?</Badge>
                                                <Validation
                                                    isValid={!getLegacyObservacionError(formik.errors, index)}
                                                    isTouched={getLegacyObservacionTouched(formik.touched, index)}
                                                    invalidFeedback={getLegacyObservacionError(
                                                        formik.errors,
                                                        index,
                                                    )}>
                                                    <Textarea
                                                        className='w-full md:w-[20vw]'
                                                        rows={4}
                                                        name={`preguntas[${index}].observaciones`}
                                                        onChange={formik.handleChange}
                                                        onBlur={formik.handleBlur}
                                                        value={
                                                            formik.values.preguntas[index]
                                                                ? formik.values.preguntas[index].observaciones
                                                                : ''
                                                        }
                                                    />
                                                </Validation>
                                            </div>
                                        )}
                                </div>
                            </CardBody>
                        </Card>
                    ))}

                    {submitError && (
                        <Alert variant='solid' color='red' icon='HeroXCircle'>
                            {submitError}
                        </Alert>
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
                                    isLoading={isLoading}
                                    onClick={formik.submitForm}>
                                    Enviar evaluación
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
    );
}

function RetroalimentacionOTV3() {
    const dispatch = useAppDispatch();
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

    const vencida = detalle?.vencida === true && !detalle?.ya_respondida;
    const activa = detalle && !detalle.ya_respondida && !vencida;

    useEffect(() => {
        if (guardadoRetroalimentacionOT && guardadoRetroalimentacionOT.token !== uuid) {
            dispatch(LIMPIAR_RETROALIMENTACION());
        }
    }, [dispatch, guardadoRetroalimentacionOT, uuid]);

    if (!uuid) {
        return (
            <PageWrapper
                isProtectedRoute={false}
                name='Retroalimentacion OT V3'
                title='Retroalimentacion OT V3'>
                <Container>
                    <Alert variant='solid' color='red' icon='HeroXCircle'>
                        Enlace no válido.
                    </Alert>
                </Container>
            </PageWrapper>
        );
    }

    if (isLoading) {
        return (
            <PageWrapper
                isProtectedRoute={false}
                name='Retroalimentacion OT V3'
                title='Retroalimentacion OT V3'>
                <Container>
                    <div className='py-10 text-center text-sm text-zinc-500'>Cargando encuesta...</div>
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
            <PageWrapper
                isProtectedRoute={false}
                name='Retroalimentacion OT V3'
                title='Retroalimentacion OT V3'>
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
                                <div className='mt-4 text-sm text-zinc-200'>Puede cerrar esta ventana.</div>
                            </div>
                        </Alert>
                    ) : (
                        <Alert variant='solid' color='red' icon='HeroExclamationTriangle'>
                            <div className='text-center'>
                                <div className='text-lg font-bold'>
                                    {statusCode === 404 ? 'Enlace no encontrado' : 'No pudimos cargar la encuesta'}
                                </div>
                                <div className='mt-1 text-sm'>{getErrorMessage(error)}</div>
                                <div className='mt-4 text-sm text-zinc-200'>Puede cerrar esta ventana.</div>
                            </div>
                        </Alert>
                    )}
                </Container>
            </PageWrapper>
        );
    }

    const esLegacy = isLegacySurvey(detalle.retroalimentacion_aplicada);

    return (
        <PageWrapper isProtectedRoute={false} name='Retroalimentacion OT V3' title='Retroalimentacion OT V3'>
            <Subheader>
                <SubheaderLeft>
                    <Badge className='text-xl'>Encuesta de satisfacción</Badge>
                </SubheaderLeft>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex flex-col gap-4'>
                    <SurveyHeader detalle={detalle} activa={!!activa} />

                    {detalle.ya_respondida && (
                        <Alert variant='solid' color='emerald' icon='HeroCheckCircle'>
                            <div className='text-center'>
                                <h3 className='text-lg font-bold'>¡Gracias por su retroalimentación!</h3>
                                <p className='mt-1'>
                                    Esta encuesta ya fue respondida el{' '}
                                    {detalle.fecha_retroalimentacion
                                        ? dayjs(detalle.fecha_retroalimentacion).format('DD/MM/YYYY [a las] HH:mm')
                                        : ''}
                                    .
                                </p>
                            </div>
                        </Alert>
                    )}

                    {vencida && (
                        <Alert variant='solid' color='red' icon='HeroXCircle'>
                            <div className='text-center'>
                                <h3 className='text-lg font-bold'>Encuesta vencida</h3>
                                <p className='mt-1'>
                                    El plazo para responder esta encuesta ha finalizado
                                    {detalle.fecha_vencimiento
                                        ? ` el ${dayjs(detalle.fecha_vencimiento).format('DD/MM/YYYY [a las] HH:mm')}`
                                        : ''}
                                    . Ya no es posible enviar su evaluación.
                                </p>
                            </div>
                        </Alert>
                    )}

                    {activa &&
                        (esLegacy ? (
                            <RetroalimentacionOTV3LegacyForm detalle={detalle} uuid={uuid} refetch={refetch} />
                        ) : (
                            <RetroalimentacionOTV3StandardForm detalle={detalle} uuid={uuid} refetch={refetch} />
                        ))}
                </div>
            </Container>
        </PageWrapper>
    );
}

export default RetroalimentacionOTV3;
