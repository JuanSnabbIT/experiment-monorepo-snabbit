import { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import Input from '@/components/form/Input';
import SelectReact from '@/components/form/SelectReact';
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
import Textarea from '@/components/form/Textarea';
import ApiService from '@/services/ApiService';
import { listaContentTypeThunk, useAppDispatch, useAppSelector } from '@/store';
import {
    detalleEquipoEmpresaThunk,
    listaSoftwareDeEmpresaThunk,
    listaSoftwareThunk,
} from '@/store/slices/recursos/recursosSlice';

const SoftwaresEnDetalleEquipo = () => {
    const dispatch = useAppDispatch();
    const { listaContentType } = useAppSelector((state) => state.core);
    const { listaSoftware, listaSoftwareEmpresa, detalleEquipoEmpresa } = useAppSelector(
        (state) => state.recursos,
    );
    const [optionsSoftware, setOptionsSoftware] = useState<
        { value: string; label: string; ct: number | undefined }[]
    >([]);
    const [isEditing, setIsEditing] = useState<boolean>(false);

    useEffect(() => {
        if (detalleEquipoEmpresa && detalleEquipoEmpresa.cliente) {
            dispatch(listaSoftwareDeEmpresaThunk({ id_empresa: detalleEquipoEmpresa.cliente }));
            dispatch(listaSoftwareThunk());
        }
    }, [detalleEquipoEmpresa]);

    useEffect(() => {
        if (listaContentType.length === 0) {
            dispatch(listaContentTypeThunk());
        }
    }, [listaContentType]);

    useEffect(() => {
        let lista: { value: string; label: string; ct: number | undefined }[] = [];
        if (listaSoftware.length > 0) {
            lista = lista.concat(
                listaSoftware.map((soft) => ({
                    value: soft.id.toString(),
                    label: soft.nombre,
                    ct: listaContentType.find((ct) => ct.model === 'software')?.id,
                })),
            );
        }
        if (listaSoftwareEmpresa.length > 0) {
            lista = lista.concat(
                listaSoftwareEmpresa.map((soft) => ({
                    value: soft.id.toString(),
                    label: soft.nombre_empresa,
                    ct: listaContentType.find((ct) => ct.model === 'softwaredeempresa')?.id,
                })),
            );
        }
        setOptionsSoftware(lista);
    }, [listaSoftware, listaSoftwareEmpresa]);

    const formikSoftware = useFormik({
        enableReinitialize: true,
        initialValues: {
            content_type: '',
            software_id: '',
            version: '',
            clave: '',
            observaciones: '',
        },
        validationSchema: Yup.object().shape({
            content_type: Yup.string().required('Requerido').nonNullable('Requerido'),
            software_id: Yup.string().required('Requerido').nonNullable('Requerido'),
            version: Yup.string().max(20, 'Maximo 20 Caracteres').notRequired().nullable(),
            clave: Yup.string().max(50, 'Maximo 50 Caracteres').notRequired().nullable(),
            observaciones: Yup.string().notRequired().nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/softwares-instalados/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        ...values,
                        content_type: Number(values.content_type),
                        equipo: detalleEquipoEmpresa?.id,
                    }),
                });
                if (response.data) {
                    toast.success('Software creado', { autoClose: 1000 });
                    dispatch(detalleEquipoEmpresaThunk({ id_equipo: detalleEquipoEmpresa?.id }));
                    formikSoftware.resetForm();
                }
            } catch (error: any) {
                toast.error(error.response.data || 'Error al crear el software', {
                    toastId: 'Error al crear el software',
                });
            }
        },
    });

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-xl'>Softwares</Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='flex flex-col gap-4'>
                {detalleEquipoEmpresa && detalleEquipoEmpresa.datos_software.length > 0 ? (
                    detalleEquipoEmpresa.datos_software.map((software, index) => (
                        <div className='rounded-xl border border-blue-500' key={index}>
                            <div className='grid grid-cols-2 gap-4 p-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                                <div>
                                    <Badge>Software</Badge>
                                    <div className='ml-4'>{software.nombre_software}</div>
                                </div>
                                <div>
                                    <Badge>Versión</Badge>
                                    <div className='ml-4'>{software.version || 'Sin Versión'}</div>
                                </div>
                                <div>
                                    <Badge>Clave</Badge>
                                    <div className='ml-4'>{software.clave || 'Sin Clave'}</div>
                                </div>
                                <div>
                                    <Badge>Observaciones</Badge>
                                    <div className='ml-4'>
                                        {software.observaciones || 'Sin Observaciones'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className='text-center'>Sin Softwares</div>
                )}
                {isEditing && (
                    <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                        <div className='col-span-full'>
                            <Badge className='text-xl'>Crear Software Instalado</Badge>
                        </div>
                        <div>
                            <Badge>Software</Badge>
                            <Validation
                                isValid={formikSoftware.isValid}
                                isTouched={formikSoftware.touched.software_id}
                                invalidFeedback={formikSoftware.errors.software_id}>
                                <SelectReact
                                    name='software_id'
                                    options={optionsSoftware}
                                    placeholder='Seleccione un Software'
                                    noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                    onBlur={formikSoftware.handleBlur}
                                    onChange={(e) => {
                                        formikSoftware.setFieldValue(
                                            'software_id',
                                            (
                                                e as {
                                                    value: string;
                                                    label: string;
                                                    ct: number | undefined;
                                                }
                                            ).value,
                                        );
                                        formikSoftware.setFieldValue(
                                            'content_type',
                                            (
                                                e as {
                                                    value: string;
                                                    label: string;
                                                    ct: number | undefined;
                                                }
                                            ).ct?.toString(),
                                        );
                                    }}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Version</Badge>
                            <Validation
                                isValid={formikSoftware.isValid}
                                isTouched={formikSoftware.touched.version}
                                invalidFeedback={formikSoftware.errors.version}>
                                <Input
                                    name='version'
                                    onBlur={formikSoftware.handleBlur}
                                    onChange={formikSoftware.handleChange}
                                    value={formikSoftware.values.version}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Clave</Badge>
                            <Validation
                                isValid={formikSoftware.isValid}
                                isTouched={formikSoftware.touched.clave}
                                invalidFeedback={formikSoftware.errors.clave}>
                                <Input
                                    name='clave'
                                    onBlur={formikSoftware.handleBlur}
                                    onChange={formikSoftware.handleChange}
                                    value={formikSoftware.values.clave}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Observaciones</Badge>
                            <Validation
                                isValid={formikSoftware.isValid}
                                isTouched={formikSoftware.touched.observaciones}
                                invalidFeedback={formikSoftware.errors.observaciones}>
                                <Textarea
                                    name='observaciones'
                                    onBlur={formikSoftware.handleBlur}
                                    onChange={formikSoftware.handleChange}
                                    value={formikSoftware.values.observaciones}
                                />
                            </Validation>
                        </div>
                    </div>
                )}
            </CardBody>
            <CardFooter>
                <CardFooterChild></CardFooterChild>
                <CardFooterChild>
                    {isEditing ? (
                        <>
                            <Button
                                variant='solid'
                                icon='HeroXMark'
                                color='red'
                                onClick={() => {
                                    setIsEditing(false);
                                    formikSoftware.resetForm();
                                }}></Button>
                            <Button
                                variant='solid'
                                icon='DuoSave'
                                onClick={() => {
                                    formikSoftware.handleSubmit();
                                }}></Button>
                        </>
                    ) : (
                        <Button
                            variant='solid'
                            onClick={() => {
                                setIsEditing(true);
                            }}>
                            Crear Software
                        </Button>
                    )}
                </CardFooterChild>
            </CardFooter>
        </Card>
    );
};

export default SoftwaresEnDetalleEquipo;
