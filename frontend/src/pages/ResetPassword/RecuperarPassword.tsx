import Input from '@/components/form/Input';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Button from '@/components/ui/Button';
import LogoTemplate from '@/templates/layouts/Logo/Logo.template';
import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Validation from '@/components/form/Validation';
import ApiService from '@/services/ApiService';


const validationSchema = Yup.object().shape({
  email: Yup.string().email('Correo electrónico no válido').required('Correo electrónico es requerido'),
});

const RecuperarPassword = () => {
    const [isFormSubmitted, setIsFormSubmitted] = useState(false);
    const navigate = useNavigate();

    const formik = useFormik({
        initialValues: {
            email: '',
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/auth/users/reset_password/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({email: values.email})})
                if (response.status === 204) {
                    toast.success('Enlace de restablecimiento de contraseña enviado a tu correo.', {autoClose: 1000});
                    setIsFormSubmitted(true);
                }
            } catch (error: any) {
                toast.error(error.response.data || 'Error al enviar el enlace de restablecimiento de contraseña.', {toastId: 'Error al enviar el enlace de restablecimiento de contraseña.'});
            }
        },
    });

    return (
        <PageWrapper isProtectedRoute={false} className='bg-white dark:bg-inherit' name='Recuperar Contraseña' title='Recuperar Contraseña'>
            <div className='container mx-auto flex h-full items-center justify-center relative p-8'>
                <div className={`flex flex-col gap-8 transition-all duration-500 ${isFormSubmitted ? 'hidden' : 'block'}`}>
                    <div>
                        <LogoTemplate className='h-12' />
                    </div>
                    <div>
                        <span className='text-4xl font-semibold text-gray-900 dark:text-gray-100'>Restablecer su Contraseña</span>
                        <h3 className="text-gray-700 dark:text-gray-300 mb-4 mt-4">¡Hola! ¿Olvidaste tu contraseña? No te preocupes, estamos para ayudarte.</h3>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 text-left">
                            <li>Ingresa tu correo electrónico y haz clic en “Recuperar”.</li>
                            <li>Te enviaremos un enlace para que puedas establecer una nueva contraseña.</li>
                        </ul>
                    </div>
                    <Validation
                        isValid={formik.isValid}
                        isTouched={formik.touched.email}
                        invalidFeedback={formik.errors.email}
                    >
                        <Input
                            type="email"
                            name="email"
                            placeholder="Ingresa tu correo"
                            value={formik.values.email}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            className={`w-full p-2 border rounded-md`}
                        />
                    </Validation>
                    <Button
                        onClick={() => formik.handleSubmit()}
                        variant='solid'
                        className='w-full rounded-md transition-colors font-semibold'>Recuperar</Button>
                </div>
                {isFormSubmitted && (
                    <div className='flex flex-col gap-4 animate-fade-in'>
                        <div className='flex justify-center'>
                            <LogoTemplate className='h-12' />
                        </div>
                        <div>
                            <span className='text-4xl font-semibold text-gray-900 dark:text-gray-100'>¡Correo enviado con éxito!</span>
                        </div>
                        <p className='text-gray-700 dark:text-gray-300'>
                            Revisa tu bandeja de entrada; te hemos enviado un enlace para restablecer tu contraseña.
                        </p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-6 text-left">
                            <li>Si no encuentras nuestro mensaje, revisa tu carpeta de “Correo no deseado” o “Spam”.</li>
                            <li>Una vez ubiques el correo, haz clic en el enlace para continuar con el proceso.</li>
                        </ul>
                        <p className='text-gray-700 dark:text-gray-300'>¡Gracias por confiar en nosotros!</p>
                        <Button
                            onClick={() => navigate('/login')}
                            variant='solid'
                            className='w-full'
                        >Ir a la Pantalla de Bienvenida</Button>
                    </div>
                )}
            </div>
        </PageWrapper>
    );
};

export default RecuperarPassword;
