import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import { useAppDispatch, useAppSelector } from '@/store';
import { detalleCategoriaThunk, listaCategoriasThunk } from '@/store/slices/item/itemSlice';
import Input from '@/components/form/Input';
import { toast } from 'react-toastify';
import Textarea from '@/components/form/Textarea';
import ApiService from '@/services/ApiService';
import Button from '@/components/ui/Button';
import { Form, Formik, FormikProps, useFormik } from 'formik';
import * as Yup from 'yup'; // Importar Yup correctamente
import Validation from '@/components/form/Validation';

const validationSchema = Yup.object({
    nombre: Yup.string().required('Este campo no puede estar vacio'),
});

const DetalleCategoria = () => {
    const dispatch = useAppDispatch();
    const { id } = useParams();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaCategorias, detalleCategoria } = useAppSelector((state) => state.item);

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        dispatch(listaCategoriasThunk());
        dispatch(detalleCategoriaThunk({ id_categoria: id }));
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
            nombre: detalleCategoria?.nombre || '',
        },
        validationSchema: validationSchema,
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/categorias/${id}/`,
                    method: 'patch',
                    data: values,
                });

                const data = response.data;
                dispatch(listaCategoriasThunk());
                dispatch(detalleCategoriaThunk({ id_categoria: id }));
                toast.success('Datos guardados correctamente.');
                return data;
            } catch (error) {
                console.error('Error:', error);
                toast.error('Hubo un error al guardar los datos. Por favor, inténtelo de nuevo.');
            }
        },
    });

    if (!detalleCategoria) {
        return (
            <PageWrapper isProtectedRoute={true} name='Detalle Categoria' title='Detalle Categoria'>
                <div className='flex h-full items-center justify-center'>
                    <div className='text-center'>
                        <p className='text-xl font-semibold'>No se encontró la Categoria.</p>
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
        <PageWrapper isProtectedRoute={true} name='Detalle Categoria' title='Detalle Categoria'>
            <Subheader>
                <SubheaderLeft />
                <SubheaderRight>
                    <Button variant='solid' onClick={() => setIsEditing(!isEditing)}>
                        {isEditing ? 'Cancelar' : 'Modificar'}
                    </Button>
                </SubheaderRight>
            </Subheader>
            <Container>
                <div className='flex flex-col gap-4'>
                    <div className='w-full'>
                        <Card className='w-full'>
                            <CardHeader>
                                <Badge className='mb-2 text-xl'>Datos del Categoria</Badge>
                            </CardHeader>
                            <CardBody>
                                <div className='flex flex-col gap-4'>
                                    {detalleCategoria && (
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
                                                    <span>{detalleCategoria.nombre}</span>
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

export default DetalleCategoria;
