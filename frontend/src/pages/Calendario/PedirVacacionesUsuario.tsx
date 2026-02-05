import Radio, { RadioGroup } from '@/components/form/Radio';
import Textarea from '@/components/form/Textarea';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import themeConfig from '@/config/theme.config';
import ApiService from '@/services/ApiService';
import { listaSolicitudesVacacionesUsuarioThunk, useAppDispatch, useAppSelector } from '@/store';
import { usuarioEmpresaLogeadoThunk } from '@/store/slices/empresa/empresaSlice';
import es from 'date-fns/locale/es';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { DateRange, Range, RangeKeyDict } from 'react-date-range';
import { toast } from 'react-toastify';
import colors from 'tailwindcss/colors';
import * as Yup from 'yup';
import calcularDiasHabilesConCalendario from './utils/calcularDiasHabilesConCalendario';

function PedirVacacionesUsuario() {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa);
    const { listaDiasCalendario, listaSolicitudesVacacionesUsuario } = useAppSelector(
        (state) => state.calendario,
    );
    const [extraordinaria, setExtraordinaria] = useState<'true' | 'false'>('false');
    const [state, setState] = useState<Range[]>([
        {
            startDate: new Date(),
            endDate: new Date(),
            key: 'selection',
        },
    ]);

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

    useEffect(() => {
        if (personalizacionUsuario) {
            dispatch(usuarioEmpresaLogeadoThunk({ id_usuario: personalizacionUsuario?.usuario }));
        }
    }, [personalizacionUsuario]);

    useEffect(() => {
        if (usuarioEmpresaLogeado) {
            const filtro = new URLSearchParams();
            filtro.append('usuario_empresa', usuarioEmpresaLogeado.id.toString());
            dispatch(listaSolicitudesVacacionesUsuarioThunk({ filtro }));
        }
    }, [usuarioEmpresaLogeado]);

    useEffect(() => {
        let ranges: Range[] = [
            {
                startDate: dayjs().toDate(),
                endDate: dayjs().toDate(),
                color: colors.blue[themeConfig.themeColorShade],
                disabled: false,
                key: 'selection',
            },
        ];
        if (
            listaSolicitudesVacacionesUsuario.filter((sol) => sol.estado === '2').length > 0 &&
            usuarioEmpresaLogeado
        ) {
            ranges.push(
                ...listaSolicitudesVacacionesUsuario
                    .filter((sol) => sol.estado === '2')
                    .map((sol, index) => ({
                        startDate: dayjs(sol.fecha_inicio).toDate(),
                        endDate: dayjs(sol.fecha_fin).toDate(),
                        color: colors.emerald[themeConfig.themeColorShade],
                        disabled: true,
                        key: `tomada_${index}`,
                    })),
            );
        }
        if (listaDiasCalendario.filter((dias) => dias.es_feriado).length > 0) {
            ranges.push(
                ...listaDiasCalendario
                    .filter((dias) => dias.es_feriado)
                    .map((dias, index) => ({
                        startDate: dayjs(dias.fecha).toDate(),
                        endDate: dayjs(dias.fecha).toDate(),
                        color: colors.red[themeConfig.themeColorShade],
                        // color: "#ff3e14",
                        disabled: true,
                        key: `feriado_${index}`,
                    })),
            );
        }
        setState(ranges);
    }, [listaDiasCalendario, listaSolicitudesVacacionesUsuario, usuarioEmpresaLogeado]);

    const validationSchema = Yup.object()
        .shape({
            fecha_inicio: Yup.string().required('Requerido'),
            fecha_fin: Yup.string().required('Requerido'),
            comentario: Yup.string().nullable(),
        })
        .test('dias-disponibles', 'No tienes suficientes días disponibles', function (values) {
            if (extraordinaria === 'false') {
                const { fecha_inicio, fecha_fin } = values;

                if (fecha_inicio && fecha_fin) {
                    const startDate = new Date(fecha_inicio);
                    const endDate = new Date(fecha_fin);
                    const diasHabiles = calcularDiasHabilesConCalendario(
                        startDate,
                        endDate,
                        listaDiasCalendario,
                    );

                    if (
                        usuarioEmpresaLogeado &&
                        usuarioEmpresaLogeado.papeleta.dias_disponibles < diasHabiles
                    ) {
                        return this.createError({
                            path: 'fecha_fin',
                            message: `Los días seleccionados (${diasHabiles}) exceden los días disponibles (${usuarioEmpresaLogeado.papeleta.dias_disponibles}).`,
                        });
                    }
                }
            }

            return true;
        });

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            usuario_empresa: usuarioEmpresaLogeado?.id,
            fecha_inicio: '',
            fecha_fin: '',
            comentario: '',
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/solicitudes-vacaciones/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        ...values,
                        es_extraordinaria: extraordinaria === 'true' ? true : false,
                        fecha_inicio: dayjs(values.fecha_inicio).format('YYYY-MM-DD'),
                        fecha_fin: dayjs(values.fecha_fin).format('YYYY-MM-DD'),
                        creado_por: personalizacionUsuario?.usuario,
                    }),
                });
                if (response.data) {
                    toast.success('Solicitud Creada', { autoClose: 1000 });
                    formik.resetForm();
                    setState([
                        {
                            startDate: new Date(),
                            endDate: new Date(),
                            key: 'selection',
                        },
                    ]);
                }
            } catch (error: any) {
                toast.error(error.response.data[0]);
            }
        },
    });

    return (
        <PageWrapper
            isProtectedRoute={true}
            title='Crear Solicitud Vacaciones'
            name='Crear Solicitud Vacaciones'>
            <Subheader>
                <SubheaderLeft />
                <SubheaderRight>
                    <Button
                        onClick={() => {
                            formik.handleSubmit();
                        }}
                        variant='solid'>
                        Crear Solicitud
                    </Button>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='grid w-full grid-cols-12 gap-4'>
                    <div className='col-span-full'>
                        <Card>
                            <CardBody className='grid grid-cols-2 items-center justify-center lg:grid-cols-4'>
                                <div className='w-full'>
                                    <Badge>Dias Acumulados</Badge>
                                    <div id='dias_acumulados' className='ml-4'>
                                        {usuarioEmpresaLogeado
                                            ? `${usuarioEmpresaLogeado.papeleta.dias_acumulados} dias`
                                            : 'Sin Usuario'}
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Dias Disponibles</Badge>
                                    <div id='dias_disponibles' className='ml-4'>
                                        {usuarioEmpresaLogeado
                                            ? `${usuarioEmpresaLogeado.papeleta.dias_disponibles} dias`
                                            : 'Sin Usuario'}
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Dias Tomados</Badge>
                                    <div id='dias_tomados' className='ml-4'>
                                        {usuarioEmpresaLogeado
                                            ? `${usuarioEmpresaLogeado.papeleta.dias_tomados} dias`
                                            : 'Sin Usuario'}
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Dias Habiles Seleccionados</Badge>
                                    <div className='ml-4'>
                                        {calcularDiasHabilesConCalendario(
                                            new Date(formik.values.fecha_inicio),
                                            new Date(formik.values.fecha_fin),
                                            listaDiasCalendario,
                                        )}
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                    <div className='col-span-full'>
                        <Card className='h-full'>
                            <CardHeader>
                                <Badge className='text-lg'>Fechas</Badge>
                            </CardHeader>
                            <CardBody className='flex flex-col'>
                                <div className='flex justify-center'>
                                    <Badge className='text-lg'>¿Es Extraordinaria?</Badge>
                                    <RadioGroup isInline>
                                        <Radio
                                            label='Sí'
                                            name='si'
                                            value='true'
                                            selectedValue={extraordinaria}
                                            onChange={() => {
                                                setExtraordinaria('true');
                                            }}
                                        />
                                        <Radio
                                            label='No'
                                            name='no'
                                            value='false'
                                            selectedValue={extraordinaria}
                                            onChange={() => {
                                                setExtraordinaria('false');
                                            }}
                                        />
                                    </RadioGroup>
                                </div>
                                <div className='flex justify-center'>
                                    <DateRange
                                        showPreview={true}
                                        locale={es}
                                        ranges={state}
                                        showDateDisplay={false}
                                        maxDate={dayjs().add(1, 'year').toDate()}
                                        onChange={(item: RangeKeyDict) => {
                                            const sel = item.selection;
                                            setState((prev) =>
                                                prev.map((range) =>
                                                    range.key === sel.key
                                                        ? {
                                                              ...range,
                                                              startDate: sel.startDate,
                                                              endDate: sel.endDate,
                                                          }
                                                        : range,
                                                ),
                                            );
                                        }}
                                    />
                                </div>
                                <div className='flex justify-center'>
                                    <Badge className='text-center text-lg' color='red'>
                                        {formik.errors.fecha_fin}
                                    </Badge>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                    <div className='col-span-12'>
                        <Card>
                            <CardHeader>
                                <Badge className='text-lg'>Comentario</Badge>
                            </CardHeader>
                            <CardBody>
                                <Textarea
                                    rows={4}
                                    name='comentario'
                                    value={formik.values.comentario}
                                    onChange={formik.handleChange}
                                />
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </Container>
        </PageWrapper>
    );
}

export default PedirVacacionesUsuario;
