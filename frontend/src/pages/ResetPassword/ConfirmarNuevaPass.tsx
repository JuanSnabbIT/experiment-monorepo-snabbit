import Input from '@/components/form/Input';
import Validation from '@/components/form/Validation';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Button from '@/components/ui/Button';
import ApiService from '@/services/ApiService';
import LogoTemplate from '@/templates/layouts/Logo/Logo.template';
import { useFormik } from 'formik';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

const validationSchema = Yup.object().shape({
    new_password: Yup.string().required('La nueva contraseña es obligatoria'),
    re_new_password: Yup.string()
        .oneOf([Yup.ref('new_password')], 'Las contraseñas deben coincidir')
        .required('La confirmación de la contraseña es obligatoria'),
});

const ConfirmarNuevaPass = () => {
    const { uid, token } = useParams<{ uid: string; token: string }>();
    const navigate = useNavigate();

    const formik = useFormik({
        initialValues: {
            new_password: '',
            re_new_password: '',
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/auth/users/reset_password_confirm/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        uid: uid,
                        token: token,
                        ...values,
                    }),
                });
                if (response.status === 204) {
                    toast.success('Contraseña reestablecida', { autoClose: 1000 });
                    navigate('/login');
                }
            } catch (error: any) {
                toast.error(error.response.data || 'Error al confirmar la contraseña', {
                    toastId: 'Error al confirmar la contraseña',
                });
            }
        },
    });

    return (
        <PageWrapper
            isProtectedRoute={false}
            className='bg-white dark:bg-inherit'
            name='Confirmar Contraseña'
            title='Confirmar Contraseña'>
            <div className='container mx-auto flex h-full items-center justify-center p-8'>
                <div className='flex max-w-sm flex-col gap-8 p-6'>
                    <div>
                        <LogoTemplate className='h-12' />
                    </div>
                    <div>
                        <span className='text-4xl font-semibold text-gray-900 dark:text-gray-100'>
                            Reestablecer Contraseña
                        </span>
                    </div>
                    <div className='flex flex-col gap-4'>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.new_password}
                            invalidFeedback={formik.errors.new_password}>
                            <Input
                                type='password'
                                name='new_password'
                                placeholder={'Nueva contraseña'}
                                value={formik.values.new_password}
                                onBlur={formik.handleBlur}
                                onChange={formik.handleChange}
                                className='w-full p-2'
                            />
                        </Validation>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.re_new_password}
                            invalidFeedback={formik.errors.re_new_password}>
                            <Input
                                type='password'
                                name='re_new_password'
                                placeholder={'Confirmar nueva contraseña'}
                                value={formik.values.re_new_password}
                                onBlur={formik.handleBlur}
                                onChange={formik.handleChange}
                                className='w-full p-2'
                            />
                        </Validation>
                        <Button
                            variant='solid'
                            onClick={() => formik.handleSubmit()}
                            className='w-full'>
                            Reestablecer Contraseña
                        </Button>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

export default ConfirmarNuevaPass;
