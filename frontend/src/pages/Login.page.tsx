import ApiService from '@/services/ApiService';
import { LOGIN, obtenerGruposThunk, useAppDispatch, userMeThunk } from '@/store';
import classNames from 'classnames';
import { useFormik } from 'formik';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useKeyPressEvent } from 'react-use';
import * as Yup from 'yup';
import FieldWrap from '../components/form/FieldWrap';
import Input from '../components/form/Input';
import Validation from '../components/form/Validation';
import Icon from '../components/icon/Icon';
import PageWrapper from '../components/layouts/PageWrapper/PageWrapper';
import Button from '../components/ui/Button';
import useFCMToken from '../hooks/useFCMToken';
import LogoTemplate from '../templates/layouts/Logo/Logo.template';

interface LoginResponse {
    access: string;
    refresh: string;
}

const LoginPage = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [passwordShowStatus, setPasswordShowStatus] = useState<boolean>(false);
    const { registrarToken } = useFCMToken();
    useKeyPressEvent('Enter', () => {
        formik.handleSubmit();
    });

    const formik = useFormik({
        initialValues: {
            email: '',
            password: '',
        },
        validationSchema: Yup.object({
            email: Yup.string()
                .email('El correo electrónico no es válido')
                .required('El correo electrónico es obligatorio'),
            password: Yup.string()
                .min(8, 'La contraseña debe tener al menos 8 caracteres')
                .required('La contraseña es obligatoria'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData<LoginResponse, string>({
                    url: '/auth/jwt/create/',
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ ...values }),
                    isLoginRequest: true,
                });
                if (response.status === 200) {
                    // Primero guardar tokens, luego obtener datos de usuario
                    dispatch(
                        LOGIN({ access: response.data.access, refresh: response.data.refresh }),
                    );
                    dispatch(userMeThunk());
                    dispatch(obtenerGruposThunk());
                    // Registrar token FCM (no bloqueante; tolera errores).
                    registrarToken().catch(() => {});
                    navigate('/');
                }
            } catch (error: any) {
                toast.error(error.response.data.detail || 'No se pudo iniciar sesión', {
                    toastId: error.response.data.detail,
                });
            }
        },
    });

    return (
        <PageWrapper
            isProtectedRoute={false}
            className='bg-white dark:bg-inherit'
            name='Iniciar Sesión'
            title='Iniciar Sesión'>
            <div className='container mx-auto flex h-full items-center justify-center p-8'>
                <div className='flex max-w-xl flex-col gap-8'>
                    <div>
                        <LogoTemplate className='h-12' />
                    </div>
                    <div>
                        <span className='text-4xl font-semibold'>
                            ¡Bienvenido a Gestion Snabbit!
                        </span>
                        <ul className='mb-6 list-inside list-disc text-left text-gray-600 dark:text-gray-300'>
                            <li>Ingresa tu usuario y contraseña para acceder a la plataforma.</li>
                            <li>
                                Si aún no tienes una cuenta o no has creado tu contraseña, revisa la
                                invitación que te enviamos.
                            </li>
                        </ul>
                        <p>¡Disfruta de todas las herramientas que hemos preparado para ti!</p>
                    </div>
                    <div className='flex flex-col gap-4'>
                        <div className={classNames({ 'mb-2': !formik.isValid })}>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.email}
                                invalidFeedback={formik.errors.email}>
                                <FieldWrap
                                    firstSuffix={<Icon icon='HeroEnvelope' className='mx-2' />}>
                                    <Input
                                        dimension='lg'
                                        id='email'
                                        name='email'
                                        placeholder='Correo Electronico'
                                        value={formik.values.email}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                </FieldWrap>
                            </Validation>
                        </div>
                        <div className={classNames({ 'mb-2': !formik.isValid })}>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.password}
                                invalidFeedback={formik.errors.password}>
                                <FieldWrap
                                    firstSuffix={<Icon icon='HeroKey' className='mx-2' />}
                                    lastSuffix={
                                        <Icon
                                            className='mx-2 cursor-pointer'
                                            icon={passwordShowStatus ? 'HeroEyeSlash' : 'HeroEye'}
                                            onClick={() => {
                                                setPasswordShowStatus(!passwordShowStatus);
                                            }}
                                        />
                                    }>
                                    <Input
                                        dimension='lg'
                                        type={passwordShowStatus ? 'text' : 'password'}
                                        autoComplete='current-password'
                                        id='password'
                                        name='password'
                                        placeholder='Contraseña'
                                        value={formik.values.password}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                    />
                                </FieldWrap>
                            </Validation>
                        </div>
                        <div>
                            <Button
                                size='lg'
                                variant='solid'
                                className='w-full font-semibold'
                                onClick={() => formik.handleSubmit()}>
                                Iniciar
                            </Button>
                        </div>
                    </div>
                    <div>
                        <Link to='/recuperar-contraseña' className='block'>
                            <Button
                                size='lg'
                                variant='outline'
                                className='w-full font-semibold'>  
                                Olvidaste tu contraseña
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

export default LoginPage;
