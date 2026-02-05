import Input from '@/components/form/Input';
import Validation from '@/components/form/Validation';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import ApiService from '@/services/ApiService';
import { useAppDispatch, useAppSelector } from '@/store';
import { detalleFabricanteThunk, listaFabricanteThunk } from '@/store/slices/item/itemSlice';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup'; // Importar Yup correctamente

const validationSchema = Yup.object({
    nombre: Yup.string().required('Este campo no puede estar vacio'),
});

const DetalleFabricante = () => {
    const dispatch = useAppDispatch();
    const { id } = useParams();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaFabricante, detalleFabricante } = useAppSelector((state) => state.item);

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        dispatch(listaFabricanteThunk());
        dispatch(detalleFabricanteThunk({ id_fabricante: id }));
    }, [personalizacionUsuario]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
        itemId: number,
        field: string,
    ) => {
        const { value } = e.target;
        setFormData((prev: any) => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [field]: value,
            },
        }));
    };

    const formik = useFormik({
        initialValues: {
            nombre: detalleFabricante?.nombre || '',
            pagina_web: detalleFabricante?.pagina_web || '',
            email_soporte: detalleFabricante?.email_soporte || '',
            telefono_soporte: detalleFabricante?.telefono_soporte || '',
        },
        validationSchema: validationSchema,
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/fabricantes/${id}/`,
                    method: 'patch',
                    data: values,
                });

                const data = response.data;
                dispatch(listaFabricanteThunk());
                dispatch(detalleFabricanteThunk({ id_fabricante: id }));
                toast.success('Datos guardados correctamente.');
                return data;
            } catch (error) {
                console.error('Error:', error);
                toast.error('Hubo un error al guardar los datos. Por favor, inténtelo de nuevo.');
            }
        },
    });

    if (!!!detalleFabricante) {
        return (
            <PageWrapper
                isProtectedRoute={true}
                name='Detalle fabricante'
                title='Detalle fabricante'>
                <div className='flex h-full items-center justify-center'>
                    <div className='text-center'>
                        <p className='text-xl font-semibold'>No se encontró la fabricante.</p>
                        <Icon
                            icon='DuoWarning1Circle'
                            color='red'
                            size='text-9xl'
                            className='mx-auto mt-4'
                        />
                    </div>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper isProtectedRoute={true} name='Detalle fabricante' title='Detalle fabricante'>
            <Subheader>
                <SubheaderLeft />
                <SubheaderRight>
                    <Button
                        variant='solid'
                        color={isEditing ? 'red' : 'blue'}
                        onClick={() => setIsEditing(!isEditing)}>
                        {isEditing ? 'Cancelar' : 'Modificar'}
                    </Button>
                </SubheaderRight>
            </Subheader>
            <Container>
                <div className='flex flex-col gap-4'>
                    <div className='w-full'>
                        <Card className='w-full'>
                            <CardHeader>
                                <Badge className='mb-2 text-xl'>Datos del Fabricante</Badge>
                            </CardHeader>
                            <CardBody>
                                <div className='flex flex-col gap-4'>
                                    {detalleFabricante && (
                                        <>
                                            <div className='w-full'>
                                                <Badge>Nombre</Badge>
                                                {isEditing ? (
                                                    <Validation
                                                        isValid={formik.isValid}
                                                        isTouched={formik.touched.nombre}
                                                        invalidFeedback={formik.errors.nombre}>
                                                        <Input
                                                            type='text'
                                                            name='nombre'
                                                            value={formik.values.nombre}
                                                            onChange={formik.handleChange}
                                                            onBlur={formik.handleBlur}
                                                        />
                                                    </Validation>
                                                ) : (
                                                    <span>{detalleFabricante.nombre}</span>
                                                )}
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Página Web</Badge>
                                                {isEditing ? (
                                                    <Validation
                                                        isValid={formik.isValid}
                                                        isTouched={formik.touched.pagina_web}
                                                        invalidFeedback={formik.errors.pagina_web}>
                                                        <Input
                                                            type='text'
                                                            name='pagina_web'
                                                            value={formik.values.pagina_web}
                                                            onChange={formik.handleChange}
                                                            onBlur={formik.handleBlur}
                                                        />
                                                    </Validation>
                                                ) : (
                                                    <a
                                                        href={
                                                            detalleFabricante?.pagina_web ||
                                                            undefined
                                                        }
                                                        target='_blank'
                                                        rel='noopener noreferrer'
                                                        className='text-blue-500 hover:underline'>
                                                        {detalleFabricante?.pagina_web}
                                                    </a>
                                                )}
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Email de Soporte</Badge>
                                                {isEditing ? (
                                                    <Validation
                                                        isValid={formik.isValid}
                                                        isTouched={formik.touched.email_soporte}
                                                        invalidFeedback={
                                                            formik.errors.email_soporte
                                                        }>
                                                        <Input
                                                            type='email'
                                                            name='email_soporte'
                                                            value={formik.values.email_soporte}
                                                            onChange={formik.handleChange}
                                                            onBlur={formik.handleBlur}
                                                        />
                                                    </Validation>
                                                ) : (
                                                    <span>{detalleFabricante?.email_soporte}</span>
                                                )}
                                            </div>
                                            <div className='w-full'>
                                                <Badge>Teléfono de Soporte</Badge>
                                                {isEditing ? (
                                                    <Validation
                                                        isValid={formik.isValid}
                                                        isTouched={formik.touched.telefono_soporte}
                                                        invalidFeedback={
                                                            formik.errors.telefono_soporte
                                                        }>
                                                        <Input
                                                            type='text'
                                                            name='telefono_soporte'
                                                            value={formik.values.telefono_soporte}
                                                            onChange={formik.handleChange}
                                                            onBlur={formik.handleBlur}
                                                        />
                                                    </Validation>
                                                ) : (
                                                    <span>
                                                        {detalleFabricante.telefono_soporte}
                                                    </span>
                                                )}
                                            </div>
                                            {isEditing && (
                                                <Button
                                                    variant='solid'
                                                    onClick={() => {
                                                        formik.submitForm();
                                                        setIsEditing(false);
                                                    }}>
                                                    Guardar
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </Container>
        </PageWrapper>
    );
};

export default DetalleFabricante;
