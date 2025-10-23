import FieldWrap from "@/components/form/FieldWrap";
import Input from "@/components/form/Input";
import Validation from "@/components/form/Validation";
import Icon from "@/components/icon/Icon";
import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper"
import Button from "@/components/ui/Button";
import ApiService from "@/services/ApiService";
import LogoTemplate from "@/templates/layouts/Logo/Logo.template";
import classNames from "classnames";
import { useFormik } from "formik";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import * as Yup from 'yup'


const validationSchema = Yup.object().shape({
	password: Yup.string()
	  	.min(8, 'La contraseña debe tener al menos 8 caracteres')
	  	.required('La contraseña es obligatoria'),
	confirm_password: Yup.string()
	  	.oneOf([Yup.ref('password')], 'Las contraseñas no coinciden')
	  	.required('La confirmación de la contraseña es obligatoria'),
});

function AceptarInvitacionEmpresa() {
	const navigate = useNavigate()
	const { token } = useParams()
    const [passwordShowStatus, setPasswordShowStatus] = useState<boolean>(false)

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            password: "",
            confirm_password: ""
        },
		validationSchema,
        onSubmit: async (values) => {
            try {
				const response = await ApiService.fetchData({url: `/api/activar-cuenta/${token}/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({password: values.password})})
				if (response.status === 200) {
					toast.success("Invitacion aceptada", {autoClose: 1000})
					navigate('/login')
				}
			} catch (error: any) {
				toast.error(error.response.data.detail)
			}
        }
    })

    return (
        <PageWrapper isProtectedRoute={false} className='bg-white dark:bg-inherit' title="Aceptar Invitacion a Empresa" name="Aceptar Invitacion a Empresa">
            <div className='container mx-auto flex h-full items-center justify-center p-8'>
				<div className='flex max-w-xl flex-col gap-4'>
					<div>
						<LogoTemplate className='h-12' />
					</div>
					<div>
						<span className="font-semibold text-4xl">Has sido invitado a unirte a Gestion Snabbit.</span>
					</div>
					<div>
						<p>Donde podrás interactuar y operar dentro de nuestra plataforma de gestión.</p>
						<ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-6 text-left">
                            <li>Por favor, elige una contraseña segura.</li>
                            <li>Asegúrate de confirmarla antes de continuar.</li>
                        </ul>
						<p>Una vez creada la contraseña, tendrás acceso inmediato a todas las funciones que te ayudarán a gestionar tus actividades de manera eficiente.</p>
					</div>
					<div className='flex flex-col gap-4'>
						<div className={classNames({ 'mb-2': !formik.isValid, })}>
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
                                                onClick={() => {setPasswordShowStatus(!passwordShowStatus)}}
                                            />
                                        }>
                                        <Input
                                            dimension='lg'
                                            type={passwordShowStatus ? 'text' : 'password'}
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
						<div className={classNames({ 'mb-2': !formik.isValid, })}>
							<Validation
								isValid={formik.isValid}
								isTouched={formik.touched.confirm_password}
								invalidFeedback={formik.errors.confirm_password}>
								<FieldWrap
									firstSuffix={<Icon icon='HeroKey' className='mx-2' />}
									lastSuffix={
										<Icon
											className='mx-2 cursor-pointer'
											icon={passwordShowStatus ? 'HeroEyeSlash' : 'HeroEye'}
											onClick={() => {setPasswordShowStatus(!passwordShowStatus)}}
										/>
									}>
									<Input
										dimension='lg'
										type={passwordShowStatus ? 'text' : 'password'}
										id='confirm_password'
										name='confirm_password'
										placeholder='Confirmar Contraseña'
										value={formik.values.confirm_password}
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
								Aceptar
							</Button>
						</div>
					</div>
				</div>
			</div>
        </PageWrapper>
    )
}

export default AceptarInvitacionEmpresa