import { useEffect, useState } from 'react';
import {
    detalleVisitaSoporteThunk,
    listaGuiasSalidasDisponiblesThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Container from '@/components/layouts/Container/Container';
import { useParams } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { useFormik } from 'formik';
import ApiService from '@/services/ApiService';
import { toast } from 'react-toastify';
import Validation from '@/components/form/Validation';
import Tooltip from '@/components/ui/Tooltip';
import Textarea from '@/components/form/Textarea';
import dayjs from 'dayjs';
import * as Yup from 'yup';
import ListaAsistenciaUsuario from './components/ListaAsistenciaUsuario';
import EntregaEquipo from './components/EntregaEquipo';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';

const DetalleVisita = () => {
    const dispatch = useAppDispatch();
    const { id } = useParams<{ id: string }>();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { detalleVisitasSoporte } = useAppSelector((state) => state.visita);
    const { listaGuiasSalidasDisponibles } = useAppSelector((state) => state.bodega);
    const [optionsGuia, setOptionsGuia] = useState<{ value: string; label: string }[]>([]);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [activeComponent, setActiveComponent] = useState<string>('Asistencia Usuarios');

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(detalleVisitaSoporteThunk({ id_visita: id }));
        }
    }, [personalizacionUsuario]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            guia_salida: '',
            descripcion_servicio: '',
        },
        validationSchema: Yup.object().shape({
            guia_salida: Yup.string().notRequired().nullable(),
            descripcion_servicio: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/visitas-soporte/${id}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(values),
                });
                if (response.data) {
                    toast.success('Asistencia técnica actualizada', { autoClose: 1000 });
                    dispatch(detalleVisitaSoporteThunk({ id_visita: id }));
                    setIsEditing(false);
                    formik.resetForm();
                }
            } catch (error: any) {
                toast.error(error.response.data || 'Error al actualizar la asistencia técnica', {
                    toastId: 'Error al actualizar la asistencia técnica',
                });
            }
        },
    });

    useEffect(() => {
        if (detalleVisitasSoporte && isEditing) {
            dispatch(
                listaGuiasSalidasDisponiblesThunk({ id_empresa: detalleVisitasSoporte.empresa }),
            );
            formik.setValues({
                guia_salida: detalleVisitasSoporte.guia_salida?.toString() || '',
                descripcion_servicio: detalleVisitasSoporte.descripcion_servicio || '',
            });
        }
    }, [detalleVisitasSoporte, isEditing]);

    useEffect(() => {
        if (detalleVisitasSoporte && isEditing) {
            if (listaGuiasSalidasDisponibles.length > 0) {
                setOptionsGuia([
                    {
                        value: detalleVisitasSoporte.guia_salida?.toString() || '',
                        label: detalleVisitasSoporte.guia_salida_nombre,
                    },
                    ...listaGuiasSalidasDisponibles.map((guia) => ({
                        value: guia.id.toString(),
                        label: `N°${guia.id} - ${guia.motivo}`,
                    })),
                ]);
            } else {
                setOptionsGuia([
                    {
                        value: detalleVisitasSoporte.guia_salida?.toString() || '',
                        label: detalleVisitasSoporte.guia_salida_nombre,
                    },
                ]);
            }
        }
    }, [listaGuiasSalidasDisponibles, detalleVisitasSoporte, isEditing]);

    return (
        <PageWrapper
            isProtectedRoute={true}
            name='Detalle Asistencia Técnica'
            title='Detalle Asistencia Técnica'>
            <Subheader>
                <SubheaderLeft />
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex flex-col gap-4'>
                    <div className='w-full'>
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className='text-xl'>
                                        Datos de la Asistencia Técnica
                                    </Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    <div className='flex items-center justify-end'>
                                        {detalleVisitasSoporte &&
                                            detalleVisitasSoporte.estado === 'pendiente' &&
                                            (isEditing ? (
                                                <div className='flex gap-2'>
                                                    <Tooltip text='Guardar Cambios'>
                                                        <Button
                                                            variant='solid'
                                                            color='emerald'
                                                            icon='HeroCheck'
                                                            onClick={() => formik.handleSubmit()}
                                                        />
                                                    </Tooltip>
                                                    <Tooltip text='Cancelar'>
                                                        <Button
                                                            color='red'
                                                            variant='solid'
                                                            onClick={() => {
                                                                setIsEditing(false);
                                                                formik.resetForm();
                                                            }}
                                                            icon='HeroXMark'
                                                        />
                                                    </Tooltip>
                                                </div>
                                            ) : (
                                                <Tooltip text='Editar'>
                                                    <Button
                                                        variant='solid'
                                                        icon='HeroPencil'
                                                        onClick={() => setIsEditing(true)}
                                                    />
                                                </Tooltip>
                                            ))}
                                        {detalleVisitasSoporte &&
                                            detalleVisitasSoporte.estado === 'completada' && (
                                                <div>
                                                    <Tooltip text='Cerrar Visita'>
                                                        <Button
                                                            variant='solid'
                                                            color='red'
                                                            onClick={async () => {
                                                                try {
                                                                    const response =
                                                                        await ApiService.fetchData({
                                                                            url: `/api/visitas-soporte/${detalleVisitasSoporte.id}/`,
                                                                            method: 'patch',
                                                                            headers: {
                                                                                'Content-Type':
                                                                                    'application/json',
                                                                            },
                                                                            data: JSON.stringify({
                                                                                estado: 'cerrada',
                                                                            }),
                                                                        });
                                                                    if (response.data) {
                                                                        toast.success(
                                                                            'Visita cambiada',
                                                                            { autoClose: 1000 },
                                                                        );
                                                                        dispatch(
                                                                            detalleVisitaSoporteThunk(
                                                                                { id_visita: id },
                                                                            ),
                                                                        );
                                                                    }
                                                                } catch (error: any) {
                                                                    toast.error(
                                                                        error.response.data ||
                                                                            'Error al cerrar la visita',
                                                                        {
                                                                            toastId:
                                                                                'Error al cerrar la visita',
                                                                        },
                                                                    );
                                                                }
                                                            }}>
                                                            Cerrar
                                                        </Button>
                                                    </Tooltip>
                                                </div>
                                            )}
                                    </div>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                                    <div className='w-full'>
                                        <Badge>Empresa</Badge>
                                        <div className='ml-4'>
                                            {detalleVisitasSoporte?.empresa_nombre}
                                        </div>
                                    </div>
                                    <div className='w-full'>
                                        <Badge>Cliente</Badge>
                                        <div className='ml-4'>
                                            {detalleVisitasSoporte?.cliente_nombre}
                                        </div>
                                    </div>
                                    <div className='w-full'>
                                        <Badge>Estado</Badge>
                                        <div className='ml-4'>
                                            {detalleVisitasSoporte?.estado_label}
                                        </div>
                                    </div>
                                    <div className='w-full'>
                                        <Badge>Guia de Salida</Badge>
                                        {isEditing ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.guia_salida}
                                                invalidFeedback={formik.errors.guia_salida}>
                                                <SelectReact
                                                    name='guia_salida'
                                                    placeholder='Seleccione una guia de salida'
                                                    noOptionsMessage={(e) =>
                                                        `No Existe ${e.inputValue}`
                                                    }
                                                    options={optionsGuia}
                                                    onChange={(e) => {
                                                        if (e) {
                                                            formik.setFieldValue(
                                                                'guia_salida',
                                                                (e as TSelectOption).value,
                                                            );
                                                        } else {
                                                            formik.setFieldValue(
                                                                'guia_salida',
                                                                null,
                                                            );
                                                        }
                                                    }}
                                                    onBlur={formik.handleBlur}
                                                    isClearable
                                                    value={optionsGuia.find(
                                                        (guia) =>
                                                            guia.value ===
                                                            formik.values.guia_salida,
                                                    )}
                                                />
                                            </Validation>
                                        ) : (
                                            <div className='ml-4'>
                                                {detalleVisitasSoporte?.guia_salida_nombre ||
                                                    'Sin Guia de Salida'}
                                            </div>
                                        )}
                                    </div>
                                    <div className='col-span-full'>
                                        <Badge>Descripción del Servicio</Badge>
                                        {isEditing ? (
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.descripcion_servicio}
                                                invalidFeedback={
                                                    formik.errors.descripcion_servicio
                                                }>
                                                <Textarea
                                                    name='descripcion_servicio'
                                                    id='descripcion_servicio'
                                                    onBlur={formik.handleBlur}
                                                    onChange={formik.handleChange}
                                                    value={formik.values.descripcion_servicio}
                                                />
                                            </Validation>
                                        ) : (
                                            <div className='ml-4'>
                                                {detalleVisitasSoporte?.descripcion_servicio}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                    <Card>
                        <CardBody>
                            <div className='flex flex-row gap-4 overflow-auto'>
                                <Button
                                    {...(activeComponent === 'Asistencia Usuarios'
                                        ? {
                                              size: 'sm',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                              isActive: true,
                                              color: 'blue',
                                              colorIntensity: '500',
                                              variant: 'solid',
                                          }
                                        : {
                                              size: 'sm',
                                              color: 'zinc',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                          })}
                                    onClick={() => {
                                        setActiveComponent('Asistencia Usuarios');
                                    }}>
                                    Asistencia Usuarios
                                </Button>
                                <Button
                                    {...(activeComponent === 'Entrega de Equipos'
                                        ? {
                                              size: 'sm',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                              isActive: true,
                                              color: 'blue',
                                              colorIntensity: '500',
                                              variant: 'solid',
                                          }
                                        : {
                                              size: 'sm',
                                              color: 'zinc',
                                              rounded: 'rounded-full',
                                              className: 'border',
                                          })}
                                    onClick={() => {
                                        setActiveComponent('Entrega de Equipos');
                                    }}>
                                    Entrega de Equipos
                                </Button>
                            </div>
                        </CardBody>
                    </Card>

                    {activeComponent === 'Asistencia Usuarios' && (
                        <ListaAsistenciaUsuario id_visita={id} />
                    )}

                    {activeComponent === 'Entrega de Equipos' && (
                        <EntregaEquipo id_cliente={detalleVisitasSoporte?.cliente} id_visita={id} />
                    )}
                </div>
            </Container>
        </PageWrapper>
    );
};

export default DetalleVisita;
