import Label from '@/components/form/Label';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import Validation from '@/components/form/Validation';
import Input from '@/components/form/Input';
import ApiService from '@/services/ApiService';
import { detalleSucursalThunk, useAppDispatch, useAppSelector } from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';

const DetelleSucursal = () => {
    const dispatch = useAppDispatch();
    const { id, id_empresa } = useParams<{ id: string; id_empresa: string }>();
    const { detalleSucursal } = useAppSelector((state) => state.empresa);
    const [isEditing, setIsEditing] = useState(false);
    const { listaComunas, listaProvincias, listaRegiones } = useAppSelector((state) => state.core);
    const [optRegiones, setOptRegiones] = useState<{ value: string; label: string }[]>([]);
    const [optProvincias, setOptProvincias] = useState<{ value: string; label: string }[]>([]);
    const [optComunas, setOptComunas] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        if (id_empresa && id) {
            dispatch(
                detalleSucursalThunk({
                    id_sucursal: id,
                    id_empresa: id_empresa,
                }),
            );
        }
    }, [id_empresa, id, dispatch]);

    const formikSucursal = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            email: '',
            direccion: '',
            telefono: '',
            region: '',
            provincia: '',
            comuna: '',
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().required('El nombre es requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/empresas/${id_empresa}/sucursales-empresa/${id}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(values),
                });
                if (response.data) {
                    toast.success('Sucursal actualizada correctamente');
                    dispatch(
                        detalleSucursalThunk({
                            id_sucursal: id,
                            id_empresa: id_empresa,
                        }),
                    );
                    setIsEditing(false);
                }
            } catch (error) {
                toast.error('Ocurrió un error al actualizar la sucursal');
            }
        },
    });

    useEffect(() => {
        if (detalleSucursal) {
            formikSucursal.setValues({
                nombre: detalleSucursal.nombre,
                email: detalleSucursal.email || '',
                direccion: detalleSucursal.direccion || '',
                telefono: detalleSucursal.telefono || '',
                region: detalleSucursal.region.toString(),
                provincia: detalleSucursal.provincia.toString(),
                comuna: detalleSucursal.comuna.toString(),
            });
        }
    }, [detalleSucursal]);

    useEffect(() => {
        setOptRegiones(
            listaRegiones.map((region) => {
                return { value: region.region_id.toString(), label: region.region_nombre };
            }),
        );
        setOptProvincias(
            listaProvincias.map((provincia) => {
                return {
                    value: provincia.provincia_id.toString(),
                    label: provincia.provincia_nombre,
                };
            }),
        );
        setOptComunas(
            listaComunas.map((comuna) => {
                return { value: comuna.comuna_id.toString(), label: comuna.comuna_nombre };
            }),
        );
    }, [listaComunas, listaProvincias, listaRegiones]);

    useEffect(() => {
        if (formikSucursal.values.region) {
            setOptProvincias(
                listaProvincias
                    .filter(
                        (provincia) =>
                            provincia.provincia_region.toString() === formikSucursal.values.region,
                    )
                    .map((prov) => ({
                        value: prov.provincia_id.toString(),
                        label: prov.provincia_nombre,
                    })),
            );
            return;
        }
        setOptProvincias(
            listaProvincias.map((provincia) => ({
                value: provincia.provincia_id.toString(),
                label: provincia.provincia_nombre,
            })),
        );
    }, [formikSucursal.values.region, listaProvincias]);

    useEffect(() => {
        if (formikSucursal.values.provincia) {
            setOptComunas(
                listaComunas
                    .filter(
                        (comuna) =>
                            comuna.comuna_provincia.toString() === formikSucursal.values.provincia,
                    )
                    .map((com) => ({
                        value: com.comuna_id.toString(),
                        label: com.comuna_nombre,
                    })),
            );
            return;
        }
        setOptComunas(
            listaComunas.map((comuna) => ({
                value: comuna.comuna_id.toString(),
                label: comuna.comuna_nombre,
            })),
        );
    }, [formikSucursal.values.provincia, listaComunas]);

    return (
        <PageWrapper isProtectedRoute={true} name='Detalle Sucursal' title='Detalle Sucursal'>
            <Subheader>
                <SubheaderLeft>
                    <Badge className='text-xl'> Detalle Sucursal</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <Tooltip text={isEditing ? 'Cancelar Edición' : 'Modificar Sucursal'}>
                        <Button
                            variant='solid'
                            icon={isEditing ? 'HeroXCircle' : 'HeroAdjustmentsHorizontal'}
                            color={isEditing ? 'red' : undefined}
                            onClick={() => setIsEditing(!isEditing)}
                        />
                    </Tooltip>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex'>
                    <div className='w-full'>
                        <Card>
                            <CardHeader>
                                <Badge className='text-xl'>
                                    Datos de {detalleSucursal?.nombre}
                                </Badge>
                            </CardHeader>
                            <CardBody>
                                {isEditing ? (
                                    <form onSubmit={formikSucursal.handleSubmit}>
                                        <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                                            <div className='w-full'>
                                                <Badge>Nombre</Badge>
                                                <Validation
                                                    isValid={formikSucursal.isValid}
                                                    isTouched={formikSucursal.touched.nombre}
                                                    invalidFeedback={formikSucursal.errors.nombre}>
                                                    <Input
                                                        name='nombre'
                                                        value={formikSucursal.values.nombre}
                                                        onBlur={formikSucursal.handleBlur}
                                                        onChange={formikSucursal.handleChange}
                                                    />
                                                </Validation>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Email</Badge>
                                                <Validation
                                                    isValid={formikSucursal.isValid}
                                                    isTouched={formikSucursal.touched.email}
                                                    invalidFeedback={formikSucursal.errors.email}>
                                                    <Input
                                                        name='email'
                                                        value={formikSucursal.values.email}
                                                        onBlur={formikSucursal.handleBlur}
                                                        onChange={formikSucursal.handleChange}
                                                    />
                                                </Validation>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Dirección</Badge>
                                                <Validation
                                                    isValid={formikSucursal.isValid}
                                                    isTouched={formikSucursal.touched.direccion}
                                                    invalidFeedback={
                                                        formikSucursal.errors.direccion
                                                    }>
                                                    <Input
                                                        name='direccion'
                                                        value={formikSucursal.values.direccion}
                                                        onBlur={formikSucursal.handleBlur}
                                                        onChange={formikSucursal.handleChange}
                                                    />
                                                </Validation>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Teléfono</Badge>
                                                <Validation
                                                    isValid={formikSucursal.isValid}
                                                    isTouched={formikSucursal.touched.telefono}
                                                    invalidFeedback={
                                                        formikSucursal.errors.telefono
                                                    }>
                                                    <Input
                                                        name='telefono'
                                                        value={formikSucursal.values.telefono}
                                                        onBlur={formikSucursal.handleBlur}
                                                        onChange={formikSucursal.handleChange}
                                                    />
                                                </Validation>
                                            </div>
                                        </div>
                                        <div className='mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                                            <div className='w-full'>
                                                <Badge>Region</Badge>
                                                <Validation
                                                    isValid={formikSucursal.isValid}
                                                    isTouched={formikSucursal.touched.region}
                                                    invalidFeedback={formikSucursal.errors.region}>
                                                    <SelectReact
                                                        name='region'
                                                        noOptionsMessage={(e) =>
                                                            `No existe la Region ${e.inputValue}`
                                                        }
                                                        options={optRegiones}
                                                        onBlur={formikSucursal.handleBlur}
                                                        onChange={(e) => {
                                                            const value = (e as TSelectOption)
                                                                .value;
                                                            formikSucursal.setFieldValue(
                                                                'region',
                                                                value,
                                                            );
                                                            formikSucursal.setFieldValue(
                                                                'provincia',
                                                                '',
                                                            );
                                                            formikSucursal.setFieldValue(
                                                                'comuna',
                                                                '',
                                                            );
                                                        }}
                                                        value={{
                                                            value: formikSucursal.values.region,
                                                            label:
                                                                optRegiones.find(
                                                                    (region) =>
                                                                        region.value ===
                                                                        formikSucursal.values
                                                                            .region,
                                                                )?.label || '',
                                                        }}
                                                    />
                                                </Validation>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Provincia</Badge>
                                                <Validation
                                                    isValid={formikSucursal.isValid}
                                                    isTouched={formikSucursal.touched.provincia}
                                                    invalidFeedback={
                                                        formikSucursal.errors.provincia
                                                    }>
                                                    <SelectReact
                                                        name='provincia'
                                                        noOptionsMessage={(e) =>
                                                            `No existe la Provincia ${e.inputValue}`
                                                        }
                                                        options={optProvincias}
                                                        onBlur={formikSucursal.handleBlur}
                                                        onChange={(e) => {
                                                            const value = (e as TSelectOption)
                                                                .value;
                                                            formikSucursal.setFieldValue(
                                                                'provincia',
                                                                value,
                                                            );
                                                            formikSucursal.setFieldValue(
                                                                'comuna',
                                                                '',
                                                            );
                                                        }}
                                                        value={{
                                                            value: formikSucursal.values.provincia,
                                                            label:
                                                                optProvincias.find(
                                                                    (provincia) =>
                                                                        provincia.value ===
                                                                        formikSucursal.values
                                                                            .provincia,
                                                                )?.label || '',
                                                        }}
                                                    />
                                                </Validation>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Comuna</Badge>
                                                <Validation
                                                    isValid={formikSucursal.isValid}
                                                    isTouched={formikSucursal.touched.comuna}
                                                    invalidFeedback={formikSucursal.errors.comuna}>
                                                    <SelectReact
                                                        name='comuna'
                                                        noOptionsMessage={(e) =>
                                                            `No existe la Comuna ${e.inputValue}`
                                                        }
                                                        onBlur={formikSucursal.handleBlur}
                                                        options={optComunas}
                                                        onChange={(e) => {
                                                            formikSucursal.setFieldValue(
                                                                'comuna',
                                                                (e as TSelectOption).value,
                                                            );
                                                        }}
                                                        value={{
                                                            value: formikSucursal.values.comuna,
                                                            label:
                                                                optComunas.find(
                                                                    (comuna) =>
                                                                        comuna.value ===
                                                                        formikSucursal.values
                                                                            .comuna,
                                                                )?.label || '',
                                                        }}
                                                    />
                                                </Validation>
                                            </div>
                                        </div>
                                        <div className='mt-4 flex justify-end'>
                                            <Button
                                                variant='solid'
                                                onClick={() => {
                                                    formikSucursal.handleSubmit();
                                                }}>
                                                Guardar
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                                            <div className='w-full'>
                                                <Badge>Nombre</Badge>
                                                <div className='ml-4'>
                                                    {detalleSucursal?.nombre}
                                                </div>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Email</Badge>
                                                <div className='ml-4'>
                                                    {detalleSucursal?.email || 'Sin Email'}
                                                </div>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Dirección</Badge>
                                                <div className='ml-4'>
                                                    {detalleSucursal?.direccion || 'Sin Dirección'}
                                                </div>
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Teléfono</Badge>
                                                <div className='ml-4'>
                                                    {detalleSucursal?.telefono || 'Sin Teléfono'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className='mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                                            <div>
                                                <Badge>Región</Badge>
                                                <div className='ml-4'>
                                                    {optRegiones.find(
                                                        (region) =>
                                                            region.value ===
                                                            detalleSucursal?.region?.toString(),
                                                    )?.label || 'Sin Región'}
                                                </div>
                                            </div>
                                            <div>
                                                <Badge>Provincia</Badge>
                                                <div className='ml-4'>
                                                    {optProvincias.find(
                                                        (provincia) =>
                                                            provincia.value ===
                                                            detalleSucursal?.provincia?.toString(),
                                                    )?.label || 'Sin Provincia'}
                                                </div>
                                            </div>
                                            <div>
                                                <Badge>Comuna</Badge>
                                                <div className='ml-4'>
                                                    {optComunas.find(
                                                        (comuna) =>
                                                            comuna.value ===
                                                            detalleSucursal?.comuna?.toString(),
                                                    )?.label || 'Sin Comuna'}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </Container>
        </PageWrapper>
    );
};

export default DetelleSucursal;
