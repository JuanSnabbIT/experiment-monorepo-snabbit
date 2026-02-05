import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
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
import { useFormik } from 'formik';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/utils/errorHandlers';
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
            if (detalleSinPermisosRetroalimentacionOT.fecha_retroalimentacion !== null) {
                toast.error('Retroalimentación ya contestada');
                navigate(`/login`);
            }
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
        if (
            detalleSinPermisosRetroalimentacionOT &&
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
                toast.success('Retroalimentaci??n guardada', { autoClose: 1000 });
                navigate('/login');
            } catch (error: unknown) {
                toast.error(getErrorMessage(error) || 'Error al editar la retroalimentaci??n', {
                    toastId: 'Error al editar la retroalimentaci??n',
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
                    <Badge className='text-xl'>Retroalimentación</Badge>
                </SubheaderLeft>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex flex-col gap-4'>
                    {detalleSinPermisosRetroalimentacionOT && (
                        <>
                            {detalleSinPermisosRetroalimentacionOT.retroalimentacion_aplicada
                                .length > 0 && (
                                <>
                                    {detalleSinPermisosRetroalimentacionOT.retroalimentacion_aplicada.map(
                                        (retro, index) => (
                                            <Card key={index}>
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
                                                                        ¿A que se debe su
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
                                                                            className='w-[20vw]'
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
                                                    onClick={() => {
                                                        formik.handleSubmit();
                                                    }}>
                                                    Guardar
                                                </Button>
                                            </CardHeaderChild>
                                        </CardHeader>
                                    </Card>
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

// import Input from "@/components/form/Input"
// import Textarea from "@/components/form/Textarea"
// import Validation from "@/components/form/Validation"
// import Container from "@/components/layouts/Container/Container"
// import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper"
// import Subheader, { SubheaderLeft, SubheaderRight } from "@/components/layouts/Subheader/Subheader"
// import Badge from "@/components/ui/Badge"
// import Button from "@/components/ui/Button"
// import Card, { CardBody, CardFooter, CardFooterChild, CardHeader, CardHeaderChild } from "@/components/ui/Card"
// import Tooltip from "@/components/ui/Tooltip"
// import RatingInput from "@/components/utils/RatingInput"
// import ApiService from "@/services/ApiService"
// import { detalleSinPermisosRetroalimentacionOTThunk, GUARDAR_RETROALIMENTACION, LIMPIAR_RETROALIMENTACION, useAppDispatch, useAppSelector } from "@/store"
// import dayjs from "dayjs"
// import { useFormik } from "formik"
// import { useEffect, useState } from "react"
// import { useNavigate, useParams } from "react-router-dom"
// import { toast } from "react-toastify"
// import * as Yup from 'yup'
// import { motion, AnimatePresence, Variants } from "framer-motion";

// // Variants dinámicos que reciben "direction" por custom
// const variants: Variants = {
//     enter: (direction: number) => ({
//         x: direction > 0 ? "100%" : "-100%",
//         opacity: 0,
//     }),
//     center: {
//         x: 0,
//         opacity: 1,
//     },
//     exit: (direction: number) => ({
//         x: direction > 0 ? "-100%" : "100%",
//         opacity: 0,
//     }),
// };

// // Función para hacer wrap de un número dentro de [0, length)
// const wrap = (val: number, length: number) => {
//     const mod = val % length;
//     return mod < 0 ? mod + length : mod;
// };

// function RetroalimentacionOT() {
//     const dispatch = useAppDispatch()
//     const navigate = useNavigate()
//     const { uuid } = useParams()
//     const { detalleSinPermisosRetroalimentacionOT } = useAppSelector((state) => state.ordenTrabajo)
//     const { guardadoRetroalimentacionOT } = useAppSelector((state) => state.auth)
//     // [page, direction] en un solo estado:
//     // - page: valor entero que puede crecer/decrecer sin límite
//     // - direction:  1 = “Siguiente”, -1 = “Anterior”
//     const [[page, direction], setPage] = useState<[number, number]>([0, 0]);

//     // “index” será el índice real dentro de retroalimentacion_aplicada (que puede tener N items)
//     const total = detalleSinPermisosRetroalimentacionOT?.retroalimentacion_aplicada.length || 0;
//     const index = wrap(page, total);

//     const nextCard = () => {
//         setPage([page + 1, 1]);
//     };

//     const prevCard = () => {
//         setPage([page - 1, -1]);
//     };

//     useEffect(() => {
//         if (uuid) {
//             dispatch(detalleSinPermisosRetroalimentacionOTThunk({uuid}))
//         }
//         // if (guardadoRetroalimentacionOT && (guardadoRetroalimentacionOT.token != uuid)) {
//         //     dispatch(LIMPIAR_RETROALIMENTACION())
//         // }
//     }, [uuid])

//     useEffect(() => {
//         if (detalleSinPermisosRetroalimentacionOT) {
//             formik.setValues({preguntas: detalleSinPermisosRetroalimentacionOT.retroalimentacion_aplicada.map(retro => ({id: retro.id, cantidad_estrellas: retro.cantidad_estrellas || 0, observaciones: retro.observaciones}))})
//         }
//         if (detalleSinPermisosRetroalimentacionOT && guardadoRetroalimentacionOT && (detalleSinPermisosRetroalimentacionOT.uuid === guardadoRetroalimentacionOT.token)) {
//             formik.setValues({preguntas: guardadoRetroalimentacionOT.preguntas})
//         }
//     }, [detalleSinPermisosRetroalimentacionOT])

//     const formik = useFormik<{
//         preguntas: {
//             id: number
//             cantidad_estrellas: number;
//             observaciones: string;
//         }[];
//     }>({
//         enableReinitialize: true,
//         initialValues: {
//             preguntas: []
//         },
//         onSubmit: async (values) => {
//             console.log(values)
//             console.log(guardadoRetroalimentacionOT)
//             // try {
//             //     const response = await ApiService.fetchData({url: `/api/retroalimentacion/${detalleSinPermisosRetroalimentacionOT?.uuid}/edit/`, method: 'patch', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
//             //         ...values,
//             //         fecha_retroalimentacion: dayjs()
//             //     })})
//             //     if (response.data) {
//             //         toast.success("Retroalimentación guardada", {autoClose: 1000})
//             //         navigate('/login')
//             //     }
//             // } catch (error: any) {
//             //     const mensajesError = Object.values(error.response.data).flat().join(" ");
//             //     toast.error(mensajesError || "Error al editar la retroalimentación", {toastId: "Error al editar la retroalimentación"})
//             // }
//         }
//     })

//     useEffect(() => {
//         if (formik.values.preguntas.length > 0) {
//             dispatch(GUARDAR_RETROALIMENTACION({token: uuid, preguntas: formik.values.preguntas}))
//         }
//     }, [formik.values])

//     return (
//         <PageWrapper isProtectedRoute={false} name="Retroalimentación OT" title="Retroalimentación OT">
//             <Subheader>
//                 <SubheaderLeft>
//                     <Tooltip text="Volver al inicio de sesión">
//                         <Button icon="HeroArrowLeft" onClick={() => {navigate(`/login`)}}></Button>
//                     </Tooltip>
//                     <Badge className="text-xl">Retroalimentación</Badge>
//                 </SubheaderLeft>
//             </Subheader>
//             <Container className="w-full h-full">
//                 <div className="flex flex-col gap-4">
//                     {detalleSinPermisosRetroalimentacionOT && (
//                         <>
//                             <div className=" overflow-hidden h-full">
//                                 {/*
//                                     1. Pasamos `initial={false}` para no animar al montar por primera vez.
//                                     2. Agregamos `custom={direction}` aquí en AnimatePresence, de modo que
//                                         el componente que sale use el mismo `direction` con el que se montó.
//                                 */}
//                                 <AnimatePresence initial={false} mode="wait" custom={direction}>
//                                     <motion.div
//                                         key={page} // clave única por “página”
//                                         className="w-full h-full border bg-white dark:bg-zinc-900 rounded-lg p-4"
//                                         variants={variants}
//                                         // También lo pasamos aquí para la tarjeta entrante
//                                         custom={direction}
//                                         initial="enter"
//                                         animate="center"
//                                         exit="exit"
//                                         transition={{ duration: 0.7 }}
//                                     >
//                                         <div className="flex flex-col gap-4 h-full">
//                                             <div className="h-full">
//                                                 <Badge className="text-xl">Pregunta N°{index + 1}</Badge>
//                                                 <p className="ml-4 mt-2">{detalleSinPermisosRetroalimentacionOT.retroalimentacion_aplicada[index].pregunta_texto}</p>
//                                             </div>
//                                             <div className="flex flex-row gap-4">
//                                                 <div className="self-end h-full">
//                                                     <Badge>Estrellas</Badge>
//                                                     <div className="ml-2 flex flex-row gap-2">
//                                                         <div className="w-14">
//                                                             <Validation
//                                                                 isValid={formik.isValid}
//                                                                 isTouched={
//                                                                     typeof formik.touched.preguntas !== "string" &&
//                                                                     Array.isArray(formik.touched.preguntas)
//                                                                     ? !!formik.touched.preguntas[index]?.cantidad_estrellas
//                                                                     : false
//                                                                 }
//                                                                 invalidFeedback={
//                                                                     typeof formik.errors.preguntas !== "string" && Array.isArray(formik.errors.preguntas)
//                                                                     ? typeof formik.errors.preguntas[index] !== "string"
//                                                                     ? formik.errors.preguntas[index].cantidad_estrellas
//                                                                     : formik.errors.preguntas[index]
//                                                                     : ""
//                                                                 }
//                                                             >
//                                                                 <Input
//                                                                     name={`preguntas[${index}].cantidad_estrellas`}
//                                                                     type="number"
//                                                                     onChange={(e) => {
//                                                                         formik.handleChange(e)
//                                                                     }}
//                                                                     onBlur={formik.handleBlur}
//                                                                     value={formik.values.preguntas[index] ? formik.values.preguntas[index].cantidad_estrellas : 0}
//                                                                 />
//                                                             </Validation>
//                                                         </div>
//                                                         <RatingInput
//                                                             defaultValue={0}
//                                                             rating={formik.values.preguntas[index] ? formik.values.preguntas[index].cantidad_estrellas : 0}
//                                                             maxStars={5}
//                                                             sizeClass="w-8 h-8"
//                                                             onChange={(e) => {
//                                                                 formik.setFieldValue(`preguntas[${index}].cantidad_estrellas`, e)
//                                                                 // dispatch(GUARDAR_RETROALIMENTACION({id: uuid, preguntas: formik.values.preguntas}))
//                                                             }}
//                                                         />
//                                                     </div>
//                                                 </div>
//                                                 <div className="w-full">
//                                                     <Badge>Observaciones</Badge>
//                                                     <Validation
//                                                         isValid={formik.isValid}
//                                                         isTouched={
//                                                             typeof formik.touched.preguntas !== "string" &&
//                                                             Array.isArray(formik.touched.preguntas)
//                                                             ? !!formik.touched.preguntas[index]?.observaciones
//                                                             : false
//                                                         }
//                                                         invalidFeedback={
//                                                             typeof formik.errors.preguntas !== "string" && Array.isArray(formik.errors.preguntas)
//                                                             ? typeof formik.errors.preguntas[index] !== "string"
//                                                             ? formik.errors.preguntas[index].observaciones
//                                                             : formik.errors.preguntas[index]
//                                                             : ""
//                                                         }
//                                                     >
//                                                         <Textarea
//                                                             name={`preguntas[${index}].observaciones`}
//                                                             onChange={(e) => {
//                                                                 formik.handleChange(e)
//                                                                 // dispatch(GUARDAR_RETROALIMENTACION({id: uuid, preguntas: formik.values.preguntas}))
//                                                             }}
//                                                             onBlur={formik.handleBlur}
//                                                             value={formik.values.preguntas[index] ? formik.values.preguntas[index].observaciones : ""}
//                                                         />
//                                                     </Validation>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </motion.div>
//                                 </AnimatePresence>
//                             </div>
//                             <div>
//                                 <Card>
//                                     <CardHeader>
//                                         <CardHeaderChild>
//                                             <Button variant="solid" onClick={() => {prevCard()}}>Anterior</Button>
//                                         </CardHeaderChild>
//                                         <CardHeaderChild>
//                                             <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Guardar</Button>
//                                         </CardHeaderChild>
//                                         <CardHeaderChild>
//                                             <Button variant="solid" onClick={() => {nextCard()}}>Siguiente</Button>
//                                         </CardHeaderChild>
//                                     </CardHeader>
//                                 </Card>
//                             </div>
//                         </>
//                     )}
//                 </div>
//             </Container>
//         </PageWrapper>
//     )
// }

// export default RetroalimentacionOT

// // <Card className="col-span-3 w-full">
// //     <CardHeader>
// //         <Badge className="text-xl">Orden de Trabajo N°{detalleSinPermisosRetroalimentacionOT.orden.id} del {dayjs(detalleSinPermisosRetroalimentacionOT.orden.fecha_creacion).format("DD/MM/YYYY")}</Badge>
// //     </CardHeader>
// //     <CardBody>
// //         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
// //             <div>
// //                 <Badge>Empresa</Badge>
// //                 <div className="ml-4">{detalleSinPermisosRetroalimentacionOT.orden.empresa_nombre}</div>
// //             </div>
// //             <div>
// //                 <Badge>Estado</Badge>
// //                 <div className="ml-4">{detalleSinPermisosRetroalimentacionOT.orden.estado_label}</div>
// //             </div>
// //             <div>
// //                 <Badge>Cliente</Badge>
// //                 <div className="ml-4">{detalleSinPermisosRetroalimentacionOT.orden.cliente_nombre}</div>
// //             </div>
// //             <div>
// //                 <Badge>Fecha de Inicio</Badge>
// //                 <div className="ml-4">{dayjs(detalleSinPermisosRetroalimentacionOT.orden.fecha_inicio_ot).format("DD/MM/YYYY")}</div>
// //             </div>
// //             <div>
// //                 <Badge>Fecha de Finalización</Badge>
// //                 <div className="ml-4">{dayjs(detalleSinPermisosRetroalimentacionOT.orden.fecha_finalizacion_ot).format("DD/MM/YYYY")}</div>
// //             </div>
// //             <div>
// //                 <Badge>Prioridad</Badge>
// //                 <div className="ml-4">{detalleSinPermisosRetroalimentacionOT.orden.prioridad_label}</div>
// //             </div>
// //             <div>
// //                 <Badge>Responsable</Badge>
// //                 <div className="ml-4">{detalleSinPermisosRetroalimentacionOT.orden.nombre_responsable || "Sin Responsable"}</div>
// //             </div>
// //             <div>
// //                 <Badge>Solicitante</Badge>
// //                 <div className="ml-4">{detalleSinPermisosRetroalimentacionOT.orden.nombre_solicitante || "Sin Solicitante"}</div>
// //             </div>
// //         </div>
// //     </CardBody>
// // </Card>
// // <Card className="col-span-1 w-full">
// //     <CardHeader>
// //         <Badge className="text-xl">Retroalimentación</Badge>
// //     </CardHeader>
// //     <CardBody>
// //         <div className="flex flex-col gap-4">
// //             <div>
// //                 <Badge>Estrellas</Badge>
// //                 <div className="ml-2 flex flex-row gap-2">
// //                     <div className="w-20">
// //                         <Validation
// //                             isValid={formik.isValid}
// //                             isTouched={formik.touched.cantidad_estrellas}
// //                             invalidFeedback={formik.errors.cantidad_estrellas}
// //                         >
// //                             <Input
// //                                 name="cantidad_estrellas"
// //                                 type="number"
// //                                 onChange={formik.handleChange}
// //                                 onBlur={formik.handleBlur}
// //                                 value={formik.values.cantidad_estrellas}
// //                             />
// //                         </Validation>
// //                     </div>
// //                     <RatingInput
// //                         defaultValue={0}
// //                         rating={formik.values.cantidad_estrellas}
// //                         maxStars={5}
// //                         onChange={(e) => {formik.setFieldValue("cantidad_estrellas", e)}}
// //                     />
// //                 </div>
// //             </div>
// //             <div>
// //                 <Badge>Observaciones de la Retroalimentación</Badge>
// //                 <div className="ml-2">
// //                     <Validation
// //                         isValid={formik.isValid}
// //                         isTouched={formik.touched.observaciones}
// //                         invalidFeedback={formik.errors.observaciones}
// //                     >
// //                         <Textarea
// //                             name="observaciones"
// //                             onChange={formik.handleChange}
// //                             onBlur={formik.handleBlur}
// //                             value={formik.values.observaciones}
// //                         />
// //                     </Validation>
// //                 </div>
// //             </div>
// //         </div>
// //     </CardBody>
// //     <CardFooter>
// //         <CardFooterChild></CardFooterChild>
// //         <CardFooterChild>
// //             <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Guardar</Button>
// //         </CardFooterChild>
// //     </CardFooter>
// // </Card>

// // {detalleSinPermisosRetroalimentacionOT.retroalimentacion_aplicada.length > 0 && (
// //     detalleSinPermisosRetroalimentacionOT.retroalimentacion_aplicada.map((retro, index) => (
// //         <Card>
// //             <CardHeader>
// //                 <CardHeaderChild>
// //                     <Badge className="text-xl">Pregunta {index + 1}</Badge>
// //                 </CardHeaderChild>
// //             </CardHeader>
// //             <CardBody>
// //                 <div className="flex flex-col gap-4">
// //                     <div>{retro.pregunta_texto}</div>
// //                     <div className="grid 4 gap-4">
// //                         <div>
// //                             <Badge>Estrellas</Badge>
// //                             <Validation
// //                                 isValid={formik.isValid}
// //                                 isTouched={formik.touched.preguntas[index].cantidad_estrellas}
// //                                 invalidFeedback={formik.errors.cantidad_estrellas}
// //                             >
// //                                 <Input
// //                                     name="cantidad_estrellas"
// //                                     type="number"
// //                                     onChange={formik.handleChange}
// //                                     onBlur={formik.handleBlur}
// //                                     value={formik.values.cantidad_estrellas}
// //                                 />
// //                             </Validation>
// //                             <RatingInput
// //                                 defaultValue={0}
// //                                 rating={formik.values.cantidad_estrellas}
// //                                 maxStars={5}
// //                                 onChange={(e) => {formik.setFieldValue("cantidad_estrellas", e)}}
// //                             />
// //                         </div>
// //                         <div>
// //                             <Badge>Observaciones</Badge>
// //                             <Validation
// //                                 isValid={formik.isValid}
// //                                 isTouched={formik.touched.observaciones}
// //                                 invalidFeedback={formik.errors.observaciones}
// //                             >
// //                                 <Textarea
// //                                     name="observaciones"
// //                                     onChange={formik.handleChange}
// //                                     onBlur={formik.handleBlur}
// //                                     value={formik.values.observaciones}
// //                                 />
// //                             </Validation>
// //                         </div>
// //                     </div>
// //                 </div>
// //             </CardBody>
// //         </Card>
// //     ))
// // )}
