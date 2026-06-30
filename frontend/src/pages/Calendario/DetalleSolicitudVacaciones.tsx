import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import { useAppDispatch, useAppSelector } from '@/store';
import { listaDiasCalendarioThunk } from '@/store/slices/calendario/calendarioSlice';
import {
    useGetDetalleSolicitudVacacionesQuery,
    useActualizarSolicitudVacacionesMutation,
} from '@/store/slices/vacaciones/vacacionesApi';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '@/utils/errorHandlers';
import calcularDiasHabilesConCalendario from './utils/calcularDiasHabilesConCalendario';
import Radio, { RadioGroup } from '@/components/form/Radio';
import { DateRange, Range } from 'react-date-range';
import es from 'date-fns/locale/es';
import dayjs from 'dayjs';
import { parseISO, startOfDay } from 'date-fns';
import { toast } from 'react-toastify';
import Textarea from '@/components/form/Textarea';
import * as Yup from 'yup';
import colors from 'tailwindcss/colors';
import themeConfig from '@/config/theme.config';

function DetalleSolicitudVacaciones() {
    const dispatch = useAppDispatch();
    const { id } = useParams();
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaDiasCalendario } = useAppSelector((state) => state.calendario);

    const { data: detalleSolicitudVacaciones } = useGetDetalleSolicitudVacacionesQuery(id ?? '', {
        skip: !id,
    });
    const [actualizarSolicitud] = useActualizarSolicitudVacacionesMutation();

    const [editando, setEditando] = useState<boolean>(false);
    const [state, setState] = useState<Range[]>([
        {
            startDate: new Date(),
            endDate: new Date(),
            key: 'selection',
        },
    ]);

    useEffect(() => {
        if (personalizacionUsuario) {
            dispatch(listaDiasCalendarioThunk());
        }
    }, [personalizacionUsuario]);

    useEffect(() => {
        if (detalleSolicitudVacaciones && !editando) {
            setState([
                {
                    startDate: startOfDay(parseISO(detalleSolicitudVacaciones.fecha_inicio)),
                    endDate: startOfDay(parseISO(detalleSolicitudVacaciones.fecha_fin)),
                    key: 'selection',
                },
            ]);
        }
        if (!editando) {
            formik.resetForm();
        }
    }, [detalleSolicitudVacaciones, editando]);

    useEffect(() => {
        if (state.length > 0) {
            if (state[0].startDate) {
                formik.setFieldValue('fecha_inicio', state[0].startDate.toDateString());
            }
            if (state[0].endDate) {
                formik.setFieldValue('fecha_fin', state[0].endDate.toDateString());
            }
        }
    }, [state]);

    const validationSchema = Yup.object().shape({
        fecha_inicio: Yup.string().required('Requerido'),
        fecha_fin: Yup.string().required('Requerido'),
        comentario: Yup.string().nullable(),
        es_extraordinaria: Yup.boolean().required('Requerido'),
    });

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            fecha_inicio: detalleSolicitudVacaciones?.fecha_inicio,
            fecha_fin: detalleSolicitudVacaciones?.fecha_fin,
            estado: detalleSolicitudVacaciones?.estado,
            es_extraordinaria: detalleSolicitudVacaciones?.es_extraordinaria,
            comentario: detalleSolicitudVacaciones?.comentario,
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                await actualizarSolicitud({
                    id: detalleSolicitudVacaciones?.id ?? '',
                    data: {
                        ...values,
                        fecha_inicio: dayjs(values.fecha_inicio).format('YYYY-MM-DD'),
                        fecha_fin: dayjs(values.fecha_fin).format('YYYY-MM-DD'),
                    },
                }).unwrap();
                toast.success('Solicitud Editada', { autoClose: 1000 });
                setEditando(false);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    return (
        <PageWrapper isProtectedRoute={true} title='Detalle solicitud' name='Detalle solicitud'>
            <Subheader>
                <SubheaderLeft>
                    <Button icon='HeroChevronLeft' onClick={() => navigate(-1)}>
                        Volver
                    </Button>
                    <Badge className='text-lg'>
                        Solicitud de {detalleSolicitudVacaciones?.papeleta.nombre_empleado}
                    </Badge>
                </SubheaderLeft>
                {detalleSolicitudVacaciones && detalleSolicitudVacaciones.estado === '1' && (
                    <SubheaderRight>
                        {editando ? (
                            <>
                                <Button
                                    variant='solid'
                                    onClick={() => formik.handleSubmit()}>
                                    Guardar
                                </Button>
                                <Button
                                    variant='solid'
                                    color='red'
                                    onClick={() => setEditando(false)}>
                                    Cancelar
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant='solid'
                                onClick={() => setEditando(true)}>
                                Editar
                            </Button>
                        )}
                    </SubheaderRight>
                )}
            </Subheader>
            <Container>
                <div className='flex flex-col gap-4 sm:flex-row'>
                    <div className='grid grid-cols-1 gap-4'>
                        <div>
                            <Card className='h-full'>
                                <CardHeader>
                                    <Badge className='text-xl'>Datos Usuario</Badge>
                                </CardHeader>
                                <CardBody>
                                    <div className='grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                                        <div className='w-full'>
                                            <Badge>Usuario</Badge>
                                            <div className='ml-4'>
                                                {detalleSolicitudVacaciones
                                                    ? `${detalleSolicitudVacaciones.papeleta.nombre_empleado}`
                                                    : 'Sin Usuario'}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Dias Acumulados</Badge>
                                            <div id='dias_acumulados' className='ml-4'>
                                                {detalleSolicitudVacaciones
                                                    ? `${detalleSolicitudVacaciones.papeleta.dias_acumulados} dias`
                                                    : 'Sin Usuario'}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Dias Disponibles</Badge>
                                            <div id='dias_disponibles' className='ml-4'>
                                                {detalleSolicitudVacaciones
                                                    ? `${detalleSolicitudVacaciones.papeleta.dias_disponibles} dias`
                                                    : 'Sin Usuario'}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Dias Tomados</Badge>
                                            <div id='dias_tomados' className='ml-4'>
                                                {detalleSolicitudVacaciones
                                                    ? `${detalleSolicitudVacaciones.papeleta.dias_tomados} dias`
                                                    : 'Sin Usuario'}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Dias Habiles Seleccionados</Badge>
                                            <div className='ml-4'>
                                                {detalleSolicitudVacaciones
                                                    ? `${calcularDiasHabilesConCalendario(new Date(detalleSolicitudVacaciones.fecha_inicio), new Date(detalleSolicitudVacaciones.fecha_fin), listaDiasCalendario)} dias `
                                                    : 'Sin Usuario'}
                                            </div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                        <div>
                            <Card className='h-full'>
                                <CardHeader>
                                    <Badge className='text-xl'>Datos Solicitud</Badge>
                                </CardHeader>
                                <CardBody>
                                    <div className='grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4'>
                                        <div className='w-full'>
                                            <Badge>¿Es Extraordinaria?</Badge>
                                            {editando ? (
                                                <RadioGroup isInline>
                                                    <Radio
                                                        label='Sí'
                                                        name='si'
                                                        value='true'
                                                        selectedValue={
                                                            formik.values.es_extraordinaria
                                                                ? 'true'
                                                                : 'false'
                                                        }
                                                        onChange={() =>
                                                            formik.setFieldValue('es_extraordinaria', true)
                                                        }
                                                    />
                                                    <Radio
                                                        label='No'
                                                        name='no'
                                                        value='false'
                                                        selectedValue={
                                                            formik.values.es_extraordinaria
                                                                ? 'true'
                                                                : 'false'
                                                        }
                                                        onChange={() =>
                                                            formik.setFieldValue('es_extraordinaria', false)
                                                        }
                                                    />
                                                </RadioGroup>
                                            ) : (
                                                <div className='ml-4'>
                                                    {detalleSolicitudVacaciones?.es_extraordinaria ? 'Si' : 'No'}
                                                </div>
                                            )}
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Fecha de Inicio</Badge>
                                            <div className='ml-4'>
                                                {detalleSolicitudVacaciones
                                                    ? dayjs(detalleSolicitudVacaciones.fecha_inicio)
                                                          .locale('es')
                                                          .format('DD-MM-YYYY')
                                                    : ''}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Fecha de Fin</Badge>
                                            <div className='ml-4'>
                                                {detalleSolicitudVacaciones
                                                    ? dayjs(detalleSolicitudVacaciones.fecha_fin)
                                                          .locale('es')
                                                          .format('DD-MM-YYYY')
                                                    : ''}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Estado</Badge>
                                            <div className='ml-4'>
                                                {detalleSolicitudVacaciones
                                                    ? detalleSolicitudVacaciones.estado_label
                                                    : ''}
                                            </div>
                                        </div>
                                        <div className='w-full'>
                                            <Badge>Creada Por</Badge>
                                            <div className='ml-4'>
                                                {detalleSolicitudVacaciones
                                                    ? detalleSolicitudVacaciones.nombre_creado_por
                                                    : ''}
                                            </div>
                                        </div>
                                        {detalleSolicitudVacaciones &&
                                            detalleSolicitudVacaciones.estado != '1' && (
                                                <div className='w-full'>
                                                    <Badge>
                                                        {detalleSolicitudVacaciones.estado === '2'
                                                            ? 'Aprobado Por'
                                                            : 'Rechazado Por'}
                                                    </Badge>
                                                    <div className='ml-4'>
                                                        {detalleSolicitudVacaciones.nombre_aprobado_rechazado_por}
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                    </div>
                    <div className='flex justify-center'>
                        <Card className='w-full'>
                            <CardHeader>
                                <Badge className='text-xl'>Fechas de Inicio y Fin</Badge>
                                {!editando && (
                                    <Badge color='zinc'>Solo lectura</Badge>
                                )}
                            </CardHeader>
                            <CardBody className='flex w-full justify-center'>
                                <div
                                    className={
                                        editando
                                            ? 'pointer-events-auto'
                                            : 'pointer-events-none cursor-not-allowed opacity-60'
                                    }>
                                    <DateRange
                                        editableDateInputs
                                        onChange={(item) => setState([item.selection])}
                                        moveRangeOnFirstSelection={false}
                                        ranges={state}
                                        color={
                                            colors[themeConfig.themeColor][
                                                themeConfig.themeColorShade
                                            ]
                                        }
                                        locale={es}
                                        maxDate={dayjs().add(1, 'year').toDate()}
                                    />
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>
                <div className='mt-4 flex justify-center'>
                    <Card className='w-full'>
                        <CardHeader>
                            <Badge className='text-xl'>Comentario</Badge>
                        </CardHeader>
                        <CardBody>
                            {editando ? (
                                <Textarea
                                    name='comentario'
                                    value={formik.values.comentario}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            ) : (
                                <div className='mb-4 ml-4'>
                                    {detalleSolicitudVacaciones?.comentario.length === 0
                                        ? 'Sin Comentario'
                                        : detalleSolicitudVacaciones?.comentario}
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </Container>
        </PageWrapper>
    );
}

export default DetalleSolicitudVacaciones;
