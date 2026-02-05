import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import ApiService from '@/services/ApiService';
import { useAppDispatch, useAppSelector } from '@/store';
import { obtenerPersonalizacionThunk, userMeThunk } from '@/store/slices/auth/authSlice';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import Avatar from '../components/Avatar';
import FieldWrap from '../components/form/FieldWrap';
import Input from '../components/form/Input';
import Label from '../components/form/Label';
import Radio, { RadioGroup } from '../components/form/Radio';
import Icon from '../components/icon/Icon';
import Container from '../components/layouts/Container/Container';
import PageWrapper from '../components/layouts/PageWrapper/PageWrapper';
import Subheader, {
    SubheaderLeft,
    SubheaderRight,
} from '../components/layouts/Subheader/Subheader';
import Badge from '../components/ui/Badge';
import Button, { IButtonProps } from '../components/ui/Button';
import Card, { CardBody } from '../components/ui/Card';
import useDarkMode from '../hooks/useDarkMode';
import { TDarkMode } from '../types/darkMode.type';
import { TIcons } from '../types/icons.type';

type TTab = {
    text: 'Editar Perfil' | 'Contacto' | 'Apariencia';
    icon: TIcons;
};

type TTabs = {
    [key in 'EDIT' | 'CONTACTO' | 'APPEARANCE']: TTab;
};

const TAB: TTabs = {
    EDIT: {
        text: 'Editar Perfil',
        icon: 'HeroPencil',
    },
    CONTACTO: {
        text: 'Contacto',
        icon: 'HeroGlobeAmericas',
    },
    APPEARANCE: {
        text: 'Apariencia',
        icon: 'HeroSwatch',
    },
};

const ProfilePage = () => {
    const dispatch = useAppDispatch();
    const { setDarkModeStatus } = useDarkMode();
    const {
        userMe: userData,
        access,
        personalizacionUsuario,
    } = useAppSelector((state) => state.auth);
    const { listaComunas, listaProvincias, listaRegiones } = useAppSelector((state) => state.core);
    const [activeTab, setActiveTab] = useState<TTab>(TAB.EDIT);
    const [optionsRegion, setOptionsRegion] = useState<{ value: string; label: string }[]>([]);
    const [optionsProvincia, setOptionsProvincia] = useState<{ value: string; label: string }[]>(
        [],
    );
    const [optionsComuna, setOptionsComuna] = useState<{ value: string; label: string }[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isSaving, setIsSaving] = useState<boolean>(false);

    useEffect(() => {
        dispatch(userMeThunk());
    }, []);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            email: userData?.email,
            first_name: userData?.first_name,
            second_name: userData?.second_name,
            last_name: userData?.last_name,
            second_last_name: userData?.second_last_name,
            rut: userData?.rut,
            celular: userData?.celular,
            fono_fijo: userData?.fono_fijo,
            genero: userData?.genero,
            theme:
                personalizacionUsuario?.tema === '1'
                    ? 'light'
                    : personalizacionUsuario?.tema === '2'
                      ? 'dark'
                      : personalizacionUsuario?.tema === '3'
                        ? 'system'
                        : 'system',
            fecha_nacimiento: userData?.fecha_nacimiento,
        },
        validationSchema: Yup.object().shape({
            first_name: Yup.string()
                .required('El primer nombre es requerido')
                .matches(
                    /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/,
                    'El primer nombre solo puede contener letras y espacios',
                ),
            second_name: Yup.string()
                .matches(
                    /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/,
                    'El segundo nombre solo puede contener letras y espacios',
                )
                .nullable(),
            last_name: Yup.string()
                .required('El primer apellido es requerido')
                .matches(
                    /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/,
                    'El primer apellido solo puede contener letras y espacios',
                ),
            second_last_name: Yup.string()
                .matches(
                    /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/,
                    'El segundo apellido solo puede contener letras y espacios',
                )
                .nullable(),
            rut: Yup.string()
                .required('El RUT es requerido')
                .matches(/^\d+(-[\dkK])$/, 'El formato del RUT no es válido'),
            celular: Yup.string()
                .matches(
                    /^(\+569|569|9)[\d]{8}$/,
                    'El número de celular debe tener 9 dígitos comenzando con 9',
                )
                .nullable(),
            fono_fijo: Yup.string()
                .matches(/^\d{9}$/, 'El número de teléfono fijo debe tener 9 dígitos')
                .nullable(),
        }),
        onSubmit: async (values) => {
            try {
                const new_tema =
                    values.theme === 'light'
                        ? '1'
                        : values.theme === 'dark'
                          ? '2'
                          : values.theme === 'system'
                            ? '3'
                            : '';
                if (values.theme != personalizacionUsuario?.tema) {
                    const responseTema = await ApiService.fetchData({
                        url: `/api/personalizacion-usuarios/${personalizacionUsuario?.id}/`,
                        method: 'patch',
                        headers: { 'Content-Type': 'application/json' },
                        data: JSON.stringify({ tema: new_tema }),
                    });
                    if (responseTema.data) {
                        dispatch(obtenerPersonalizacionThunk());
                    }
                }
                const new_values = {
                    first_name: values.first_name,
                    second_name: values.second_name,
                    last_name: values.last_name,
                    second_last_name: values.second_last_name,
                    rut: values.rut,
                    celular: values.celular,
                    fono_fijo: values.fono_fijo,
                    genero: values.genero,
                    fecha_nacimiento: values.fecha_nacimiento,
                };
                const response = await ApiService.fetchData({
                    url: `/auth/users/${userData?.pk}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(new_values),
                });
                if (response.data) {
                    toast.success('Se actualizo el perfil', { autoClose: 1000 });
                    dispatch(userMeThunk());
                }
            } catch (error: any) {
                toast.error(error.response.data || 'Error al actualizar el perfil', {
                    toastId: 'Error al actualizar el perfil',
                });
            }
            formik.setSubmitting(false);
        },
    });

    const formikContacto = useFormik({
        enableReinitialize: true,
        initialValues: {
            direccion: userData?.direccion,
            region: userData?.region,
            provincia: userData?.provincia,
            comuna: userData?.comuna,
        },
        validationSchema: Yup.object().shape({
            direccion: Yup.string()
                .max(250, 'La direccion debe tener menos de 250 caracteres')
                .nullable(),
            region: Yup.number()
                .nullable()
                .oneOf(
                    listaRegiones.map((region) => region.region_id),
                    'La región seleccionada no es válida',
                ),
            provincia: Yup.number()
                .nullable()
                .test(
                    'provincia-valida',
                    'La provincia no pertenece a la región seleccionada',
                    function (value) {
                        const { region } = this.parent;
                        if (!region || !value) return true; // Si no hay región o provincia, se omite la validación
                        const provincia = listaProvincias.find(
                            (prov) => prov.provincia_id === value,
                        );
                        return provincia ? provincia.provincia_region === region : false;
                    },
                ),
            comuna: Yup.number()
                .nullable()
                .test(
                    'comuna-valida',
                    'La comuna no pertenece a la provincia seleccionada',
                    function (value) {
                        const { provincia } = this.parent;
                        if (!provincia || !value) return true; // Si no hay provincia o comuna, se omite la validación
                        const comuna = listaComunas.find((com) => com.comuna_id === value);
                        return comuna ? comuna.comuna_provincia === provincia : false;
                    },
                ),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/auth/users/${userData?.pk}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(values),
                });
                if (response.data) {
                    toast.success('Se actualizo el contacto', { autoClose: 1000 });
                    dispatch(userMeThunk());
                }
            } catch (error: any) {
                toast.error(error.response.data || 'Error al editar el contacto del perfil', {
                    toastId: 'Error al editar el contacto del perfil',
                });
            }
        },
    });

    useEffect(() => {
        setDarkModeStatus(formik.values.theme as TDarkMode);
    }, [formik.values.theme]);

    useEffect(() => {
        setOptionsRegion(
            listaRegiones.map((region) => {
                return { value: region.region_id.toString(), label: region.region_nombre };
            }),
        );
    }, [listaRegiones]);

    useEffect(() => {
        setOptionsProvincia(
            listaProvincias.map((provincia) => {
                return {
                    value: provincia.provincia_id.toString(),
                    label: provincia.provincia_nombre,
                };
            }),
        );
    }, [listaProvincias]);

    useEffect(() => {
        setOptionsComuna(
            listaComunas.map((comuna) => {
                return { value: comuna.comuna_id.toString(), label: comuna.comuna_nombre };
            }),
        );
    }, [listaComunas]);

    useEffect(() => {
        if (formikContacto.values.region != 0) {
            const filteredProvincias = listaProvincias.filter(
                (provincia) => provincia.provincia_region === formikContacto.values.region,
            );

            setOptionsProvincia(
                filteredProvincias.map((provincia) => ({
                    value: provincia.provincia_id.toString(),
                    label: provincia.provincia_nombre,
                })),
            );

            formikContacto.setFieldValue('comuna', 0);
            formikContacto.setFieldValue('provincia', 0);
        }
    }, [formikContacto.values.region]);

    useEffect(() => {
        if (formikContacto.values.provincia != 0) {
            const filteredComunas = listaComunas.filter(
                (comuna) => comuna.comuna_provincia === formikContacto.values.provincia,
            );

            setOptionsComuna(
                filteredComunas.map((comuna) => ({
                    value: comuna.comuna_id.toString(),
                    label: comuna.comuna_nombre,
                })),
            );

            formikContacto.setFieldValue('comuna', 0);
        }
    }, [formikContacto.values.provincia]);

    // const { saveBtnText, saveBtnColor, saveBtnDisable } = useSaveBtn({
    // 	isNewItem: false,
    // 	isSaving,
    // 	isDirty: formik.dirty,
    // });

    const defaultProps: IButtonProps = {
        color: 'zinc',
    };

    const activeProps: IButtonProps = {
        ...defaultProps,
        isActive: true,
        color: 'blue',
        colorIntensity: '500',
    };

    return (
        <PageWrapper isProtectedRoute={true} name={formik.values.first_name}>
            <Subheader>
                <SubheaderLeft>
                    {`${userData?.first_name} ${userData?.last_name}`}{' '}
                    <Badge
                        color='blue'
                        variant='outline'
                        rounded='rounded-full'
                        className='border-transparent'>
                        Editar Usuario
                    </Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <></>
                    {/* <Button
						icon='HeroServer'
						variant='solid'
						color={saveBtnColor}
						isDisable={saveBtnDisable}
						onClick={() => {formik.handleSubmit(); formikContacto.handleSubmit()}}>
						{saveBtnText}
					</Button> */}
                </SubheaderRight>
            </Subheader>
            <Container className='h-full'>
                <Card className='h-full'>
                    <CardBody>
                        <div className='grid grid-cols-12 gap-4'>
                            <div className='col-span-12 flex gap-4 max-sm:flex-wrap sm:col-span-4 sm:flex-col md:col-span-2'>
                                {Object.values(TAB).map((i) => (
                                    <div key={i.text}>
                                        <Button
                                            icon={i.icon}
                                            // eslint-disable-next-line react/jsx-props-no-spreading
                                            {...(activeTab.text === i.text
                                                ? {
                                                      ...activeProps,
                                                  }
                                                : {
                                                      ...defaultProps,
                                                  })}
                                            onClick={() => {
                                                setActiveTab(i);
                                            }}>
                                            {i.text}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <div className='col-span-12 flex flex-col gap-4 sm:col-span-8 md:col-span-10'>
                                {activeTab === TAB.EDIT && (
                                    <>
                                        <div className='flex justify-between'>
                                            <div className='text-4xl font-semibold'>
                                                Editar Perfil
                                            </div>
                                            <Button
                                                variant='solid'
                                                onClick={() => {
                                                    formik.setSubmitting(true);
                                                    formik.handleSubmit();
                                                }}
                                                isDisable={formik.isSubmitting}>
                                                Guardar
                                            </Button>
                                        </div>
                                        <div className='flex w-full gap-4'>
                                            <div className='flex-shrink-0'>
                                                <Avatar
                                                    src={userData?.image ? userData.image : ''}
                                                    className='!w-24'
                                                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                                                    name={`${userData?.first_name} ${userData?.last_name}`}
                                                />
                                            </div>
                                            <div className='flex grow items-center'>
                                                <div>
                                                    <div className='w-full'>
                                                        <Label
                                                            htmlFor=''
                                                            className=''
                                                            description='Esta permitido JPG o PNG.'>
                                                            Sube una nueva imagen
                                                        </Label>
                                                        <Input
                                                            id='fileUpload'
                                                            name='fileUpload'
                                                            type='file'
                                                            onChange={async (e) => {
                                                                if (
                                                                    e.target.files &&
                                                                    e.target.files.length > 0
                                                                ) {
                                                                    const form = new FormData();
                                                                    form.append(
                                                                        'image',
                                                                        e.target.files[0],
                                                                    );
                                                                    try {
                                                                        const response =
                                                                            await ApiService.fetchData(
                                                                                {
                                                                                    url: `/api/users/${userData?.pk}/`,
                                                                                    method: 'patch',
                                                                                    data: form,
                                                                                },
                                                                            );
                                                                        if (response.data) {
                                                                            toast.success(
                                                                                'Imagen actualizada',
                                                                                { autoClose: 1000 },
                                                                            );
                                                                            dispatch(
                                                                                userMeThunk(),
                                                                            );
                                                                        }
                                                                    } catch (error: any) {
                                                                        toast.error(
                                                                            error.response.detail,
                                                                        );
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className='grid grid-cols-12 gap-4'>
                                            <div className='col-span-12 lg:col-span-6'>
                                                <Label htmlFor='email'>Email</Label>
                                                <FieldWrap
                                                    firstSuffix={
                                                        <Icon
                                                            icon='HeroEnvelope'
                                                            className='mx-2'
                                                        />
                                                    }>
                                                    <Input
                                                        id='email'
                                                        name='email'
                                                        onChange={formik.handleChange}
                                                        value={formik.values.email}
                                                        autoComplete='email'
                                                        readOnly
                                                    />
                                                </FieldWrap>
                                            </div>
                                            <div className='col-span-12 lg:col-span-6'>
                                                <Label htmlFor='rut'>Rut</Label>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.rut}
                                                    invalidFeedback={formik.errors.rut}>
                                                    <Input
                                                        id='rut'
                                                        name='rut'
                                                        onChange={formik.handleChange}
                                                        value={formik.values.rut || ''}
                                                        onBlur={formik.handleBlur}
                                                    />
                                                </Validation>
                                            </div>
                                            <div className='col-span-12 lg:col-span-6'>
                                                <Label htmlFor='first_name'>Primer Nombre</Label>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.first_name}
                                                    invalidFeedback={formik.errors.first_name}>
                                                    <Input
                                                        id='first_name'
                                                        name='first_name'
                                                        onChange={formik.handleChange}
                                                        value={formik.values.first_name}
                                                        onBlur={formik.handleBlur}
                                                    />
                                                </Validation>
                                            </div>
                                            <div className='col-span-12 lg:col-span-6'>
                                                <Label htmlFor='second_name'>Segundo Nombre</Label>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.second_name}
                                                    invalidFeedback={
                                                        formik.errors.second_last_name
                                                    }>
                                                    <Input
                                                        id='second_name'
                                                        name='second_name'
                                                        onChange={formik.handleChange}
                                                        value={formik.values.second_name || ''}
                                                        onBlur={formik.handleBlur}
                                                    />
                                                </Validation>
                                            </div>
                                            <div className='col-span-12 lg:col-span-6'>
                                                <Label htmlFor='last_name'>Apellido Paterno</Label>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.last_name}
                                                    invalidFeedback={
                                                        formik.errors.second_last_name
                                                    }>
                                                    <Input
                                                        id='last_name'
                                                        name='last_name'
                                                        onChange={formik.handleChange}
                                                        value={formik.values.last_name}
                                                        onBlur={formik.handleBlur}
                                                    />
                                                </Validation>
                                            </div>
                                            <div className='col-span-12 lg:col-span-6'>
                                                <Label htmlFor='second_last_name'>
                                                    Apellido Materno
                                                </Label>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.second_last_name}
                                                    invalidFeedback={
                                                        formik.errors.second_last_name
                                                    }>
                                                    <Input
                                                        id='second_last_name'
                                                        name='second_last_name'
                                                        onChange={formik.handleChange}
                                                        value={formik.values.second_last_name || ''}
                                                        onBlur={formik.handleBlur}
                                                    />
                                                </Validation>
                                            </div>
                                            <div className='col-span-12 lg:col-span-6'>
                                                <Label htmlFor='celular'>Celular</Label>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.celular}
                                                    invalidFeedback={formik.errors.celular}>
                                                    <Input
                                                        type='text'
                                                        id='celular'
                                                        name='celular'
                                                        onChange={formik.handleChange}
                                                        value={
                                                            formik.values.celular
                                                                ? formik.values.celular
                                                                : ''
                                                        }
                                                        onBlur={formik.handleBlur}
                                                    />
                                                </Validation>
                                            </div>
                                            <div className='col-span-12 lg:col-span-6'>
                                                <Label htmlFor='fono_fijo'>Telefono Fijo</Label>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.fono_fijo}
                                                    invalidFeedback={formik.errors.fono_fijo}>
                                                    <Input
                                                        type='text'
                                                        id='fono_fijo'
                                                        name='fono_fijo'
                                                        onChange={formik.handleChange}
                                                        value={
                                                            formik.values.fono_fijo
                                                                ? formik.values.fono_fijo
                                                                : ''
                                                        }
                                                        onBlur={formik.handleBlur}
                                                    />
                                                </Validation>
                                            </div>
                                            <div className='col-span-12 lg:col-span-6'>
                                                <Label htmlFor='fecha_nacimiento'>
                                                    Fecha de Nacimiento
                                                </Label>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.fecha_nacimiento}
                                                    invalidFeedback={
                                                        formik.errors.fecha_nacimiento
                                                    }>
                                                    <Input
                                                        type='date'
                                                        id='fecha_nacimiento'
                                                        name='fecha_nacimiento'
                                                        onChange={formik.handleChange}
                                                        value={
                                                            formik.values.fecha_nacimiento
                                                                ? formik.values.fecha_nacimiento
                                                                : ''
                                                        }
                                                        onBlur={formik.handleBlur}
                                                    />
                                                </Validation>
                                            </div>
                                            <div className='col-span-12 lg:col-span-6'>
                                                <Label htmlFor=''>Genero</Label>
                                                <RadioGroup isInline>
                                                    {[
                                                        { value: '0', label: 'No Especificado' },
                                                        { value: '1', label: 'Masculino' },
                                                        { value: '2', label: 'Femenino' },
                                                    ].map((i) => (
                                                        <Radio
                                                            key={i.value}
                                                            label={i.label}
                                                            name='genero'
                                                            value={i.value}
                                                            selectedValue={formik.values.genero}
                                                            onChange={formik.handleChange}
                                                        />
                                                    ))}
                                                </RadioGroup>
                                            </div>

                                            {/* <div className='col-span-12'>
												<Label htmlFor='position'>Role</Label>
												<FieldWrap
													firstSuffix={
														<Icon
															icon='HeroShieldCheck'
															className='mx-2'
														/>
													}
													lastSuffix={
														<Icon
															icon='HeroChevronDown'
															className='mx-2'
														/>
													}>
													<Select
														name='role'
														onChange={formik.handleChange}
														value={formik.values.role}
														placeholder='Select role'>
														{rolesDb.map((role) => (
															<option key={role.id} value={role.id}>
																{role.name}
															</option>
														))}
													</Select>
												</FieldWrap>
											</div> */}
                                            {/* <div className='col-span-12'>
												<Label htmlFor='position'>Position</Label>

												<FieldWrap
													firstSuffix={
														<Icon
															icon='HeroBriefcase'
															className='mx-2'
														/>
													}>
													<Input
														id='position'
														name='position'
														onChange={formik.handleChange}
														value={formik.values.position}
													/>
												</FieldWrap>
											</div> */}
                                            {/* <div className='col-span-12'>
												<Label htmlFor='bio'>Bio</Label>
												<RichText
													id='bio'
													value={formik.values.bio}
													handleChange={(event) => {
														formik
															.setFieldValue('bio', event)
															.then(() => {})
															.catch(() => {});
													}}
												/>
											</div> */}
                                        </div>
                                    </>
                                )}
                                {activeTab === TAB.CONTACTO && (
                                    <>
                                        <div className='flex justify-between'>
                                            <div className='text-4xl font-semibold'>Contacto</div>
                                            <Button
                                                variant='solid'
                                                onClick={() => {
                                                    formikContacto.setSubmitting(true);
                                                    formikContacto.handleSubmit();
                                                }}
                                                isDisable={formik.isSubmitting}>
                                                Guardar
                                            </Button>
                                        </div>
                                        <div className='grid grid-cols-12 gap-4'>
                                            <div className='col-span-12'>
                                                <Label htmlFor='direccion'>Direccion</Label>
                                                <Validation
                                                    isValid={formikContacto.isValid}
                                                    isTouched={formikContacto.touched.direccion}
                                                    invalidFeedback={
                                                        formikContacto.errors.direccion
                                                    }>
                                                    <Input
                                                        id='direccion'
                                                        name='direccion'
                                                        onChange={formikContacto.handleChange}
                                                        value={
                                                            formikContacto.values.direccion || ''
                                                        }
                                                    />
                                                </Validation>
                                            </div>
                                        </div>
                                        <div className='grid grid-cols-12 gap-4'>
                                            <div className='col-span-12'>
                                                <Label htmlFor='region'>Region</Label>
                                                <Validation
                                                    isValid={formikContacto.isValid}
                                                    isTouched={formikContacto.touched.region}
                                                    invalidFeedback={formikContacto.errors.region}>
                                                    <SelectReact
                                                        id='region'
                                                        name='region'
                                                        isMulti={false}
                                                        placeholder='Region'
                                                        options={optionsRegion}
                                                        onBlur={formikContacto.handleBlur}
                                                        onChange={(e) => {
                                                            formikContacto.setFieldValue(
                                                                'region',
                                                                parseInt(
                                                                    (e as TSelectOption)?.value,
                                                                ),
                                                            );
                                                        }}
                                                        value={{
                                                            value:
                                                                formikContacto.values.region?.toString() ||
                                                                '0',
                                                            label:
                                                                optionsRegion.find(
                                                                    (region) =>
                                                                        region.value ==
                                                                        formikContacto.values.region?.toString(),
                                                                )?.label || '',
                                                        }}
                                                    />
                                                </Validation>
                                            </div>
                                        </div>
                                        <div className='grid grid-cols-12 gap-4'>
                                            <div className='col-span-12'>
                                                <Label htmlFor='provincia'>Provincia</Label>
                                                <Validation
                                                    isValid={formikContacto.isValid}
                                                    isTouched={formikContacto.touched.provincia}
                                                    invalidFeedback={
                                                        formikContacto.errors.provincia
                                                    }>
                                                    <SelectReact
                                                        id='provincia'
                                                        name='provincia'
                                                        isMulti={false}
                                                        placeholder='Provincia'
                                                        options={optionsProvincia}
                                                        onBlur={formikContacto.handleBlur}
                                                        onChange={(e) => {
                                                            formikContacto.setFieldValue(
                                                                'provincia',
                                                                parseInt(
                                                                    (e as TSelectOption)?.value,
                                                                ),
                                                            );
                                                        }}
                                                        value={{
                                                            value:
                                                                formikContacto.values.provincia?.toString() ||
                                                                '0',
                                                            label:
                                                                optionsProvincia.find(
                                                                    (provincia) =>
                                                                        provincia.value ==
                                                                        formikContacto.values.provincia?.toString(),
                                                                )?.label || '',
                                                        }}
                                                    />
                                                </Validation>
                                            </div>
                                        </div>
                                        <div className='grid grid-cols-12 gap-4'>
                                            <div className='col-span-12'>
                                                <Label htmlFor='comuna'>Comuna</Label>
                                                <Validation
                                                    isValid={formikContacto.isValid}
                                                    isTouched={formikContacto.touched.comuna}
                                                    invalidFeedback={formikContacto.errors.comuna}>
                                                    <SelectReact
                                                        id='comuna'
                                                        name='comuna'
                                                        isMulti={false}
                                                        placeholder='Comuna'
                                                        options={optionsComuna}
                                                        onBlur={formikContacto.handleBlur}
                                                        onChange={(e) => {
                                                            formikContacto.setFieldValue(
                                                                'comuna',
                                                                parseInt(
                                                                    (e as TSelectOption)?.value,
                                                                ),
                                                            );
                                                        }}
                                                        value={{
                                                            value:
                                                                formikContacto.values.comuna?.toString() ||
                                                                '0',
                                                            label:
                                                                optionsComuna.find(
                                                                    (comuna) =>
                                                                        comuna.value ==
                                                                        formikContacto.values.comuna?.toString(),
                                                                )?.label || '',
                                                        }}
                                                    />
                                                </Validation>
                                            </div>
                                        </div>
                                    </>
                                )}
                                {/* {activeTab === TAB.PASSWORD && (
									<>
										<div className='text-4xl font-semibold'>Password</div>
										<div className='grid grid-cols-12 gap-4'>
											<div className='col-span-12'>
												<Label htmlFor='oldPassword'>Old Password</Label>
												<FieldWrap
													lastSuffix={
														<Icon
															className='mx-2'
															icon={
																passwordShowStatus
																	? 'HeroEyeSlash'
																	: 'HeroEye'
															}
															onClick={() => {
																setPasswordShowStatus(
																	!passwordShowStatus,
																);
															}}
														/>
													}>
													<Input
														type={
															passwordShowStatus ? 'text' : 'password'
														}
														id='oldPassword'
														name='oldPassword'
														onChange={formik.handleChange}
														value={formik.values.oldPassword}
														autoComplete='current-password'
													/>
												</FieldWrap>
											</div>
											<div className='col-span-12'>
												<Label htmlFor='newPassword'>New Password</Label>
												<FieldWrap
													lastSuffix={
														<Icon
															className='mx-2'
															icon={
																passwordNewShowStatus
																	? 'HeroEyeSlash'
																	: 'HeroEye'
															}
															onClick={() => {
																setPasswordNewShowStatus(
																	!passwordNewShowStatus,
																);
															}}
														/>
													}>
													<Input
														type={
															passwordNewShowStatus
																? 'text'
																: 'password'
														}
														id='newPassword'
														name='newPassword'
														onChange={formik.handleChange}
														value={formik.values.newPassword}
														autoComplete='new-password'
													/>
												</FieldWrap>
											</div>
											<div className='col-span-12'>
												<Label htmlFor='newPasswordConfirmation'>
													New Password Confirmation
												</Label>
												<FieldWrap
													lastSuffix={
														<Icon
															className='mx-2'
															icon={
																passwordNewConfShowStatus
																	? 'HeroEyeSlash'
																	: 'HeroEye'
															}
															onClick={() => {
																setPasswordNewConfShowStatus(
																	!passwordNewConfShowStatus,
																);
															}}
														/>
													}>
													<Input
														type={
															passwordNewConfShowStatus
																? 'text'
																: 'password'
														}
														id='newPasswordConfirmation'
														name='newPasswordConfirmation'
														onChange={formik.handleChange}
														value={
															formik.values.newPasswordConfirmation
														}
														autoComplete='new-password'
													/>
												</FieldWrap>
											</div>
										</div>
									</>
								)} */}
                                {/* {activeTab === TAB['2FA'] && (
									<>
										<div className='text-4xl font-semibold'>2FA</div>
										<div className='flex flex-wrap divide-y divide-dashed divide-zinc-500/50 [&>*]:py-4'>
											<div className='flex basis-full gap-4'>
												<div className='flex grow items-center'>
													<div className='w-full text-xl font-semibold'>
														Authenticator App
													</div>
												</div>
												<div className='flex-shrink-0'>
													<Button
														variant='outline'
														isDisable={!formik.values.twoFactorAuth}>
														Set up
													</Button>
												</div>
											</div>
											<div className='flex basis-full gap-4'>
												<div className='flex grow items-center'>
													<div className='w-full text-xl font-semibold'>
														Security Keys
													</div>
												</div>
												<div className='flex-shrink-0'>
													<Button
														color='red'
														className='!px-0'
														isDisable={!formik.values.twoFactorAuth}>
														Deactivate
													</Button>
												</div>
											</div>
											<div className='flex basis-full gap-4'>
												<div className='flex grow items-center'>
													<div className='w-full text-xl font-semibold'>
														Telephone Number
													</div>
												</div>
												<div className='flex flex-shrink-0 items-center gap-4'>
													<span className='text-zinc-500'>
														{userData?.phone}
													</span>
													<Button
														variant='outline'
														color='zinc'
														isDisable={!formik.values.twoFactorAuth}>
														Edit
													</Button>
												</div>
											</div>
										</div>
									</>
								)}
								{activeTab === TAB.NEWSLETTER && (
									<>
										<div className='text-4xl font-semibold'>Newsletter</div>
										<div className='flex flex-wrap divide-y divide-dashed divide-zinc-500/50 [&>*]:py-4'>
											<div className='flex basis-full gap-4'>
												<div className='flex grow items-center'>
													<Label
														htmlFor='weeklyNewsletter'
														className='!mb-0'>
														<div className='text-xl font-semibold'>
															Weekly newsletter
														</div>
														<div className='text-zinc-500'>
															Get notified about articles, discounts
															and new products.
														</div>
													</Label>
												</div>
												<div className='flex flex-shrink-0 items-center'>
													<Checkbox
														variant='switch'
														id='weeklyNewsletter'
														name='weeklyNewsletter'
														onChange={formik.handleChange}
														checked={formik.values.weeklyNewsletter}
													/>
												</div>
											</div>
											<div className='flex basis-full gap-4'>
												<div className='flex grow items-center'>
													<Label
														htmlFor='lifecycleEmails'
														className='!mb-0'>
														<div className='text-xl font-semibold'>
															Lifecycle emails
														</div>
														<div className='text-zinc-500'>
															Get personalized offers and emails based
															on your activity.
														</div>
													</Label>
												</div>
												<div className='flex flex-shrink-0 items-center'>
													<Checkbox
														variant='switch'
														id='lifecycleEmails'
														name='lifecycleEmails'
														onChange={formik.handleChange}
														checked={formik.values.lifecycleEmails}
													/>
												</div>
											</div>
											<div className='flex basis-full gap-4'>
												<div className='flex grow items-center'>
													<Label
														htmlFor='promotionalEmails'
														className='!mb-0'>
														<div className='text-xl font-semibold'>
															Promotional emails
														</div>
														<div className='text-zinc-500'>
															Get personalized offers and emails based
															on your orders & preferences.
														</div>
													</Label>
												</div>
												<div className='flex flex-shrink-0 items-center'>
													<Checkbox
														variant='switch'
														id='promotionalEmails'
														name='promotionalEmails'
														onChange={formik.handleChange}
														checked={formik.values.promotionalEmails}
													/>
												</div>
											</div>
											<div className='flex basis-full gap-4'>
												<div className='flex grow items-center'>
													<Label
														htmlFor='productUpdates'
														className='!mb-0'>
														<div className='text-xl font-semibold'>
															Product updates
														</div>
														<div className='text-zinc-500'>
															Checking this will allow us to notify
															you when we make updates to products you
															have downloaded/purchased.
														</div>
													</Label>
												</div>
												<div className='flex flex-shrink-0 items-center'>
													<Checkbox
														variant='switch'
														id='productUpdates'
														name='productUpdates'
														onChange={formik.handleChange}
														checked={formik.values.productUpdates}
													/>
												</div>
											</div>
										</div>
									</>
								)}
								{activeTab === TAB.SESSIONS && (
									<>
										<div className='text-4xl font-semibold'>Newsletter</div>
										<div className='flex flex-wrap divide-y divide-dashed divide-zinc-500/50 [&>*]:py-4'>
											<div className='group flex basis-full gap-4'>
												<div className='flex grow items-center'>
													<div>
														<div className='text-xl font-semibold'>
															Chrome
														</div>
														<div className='text-zinc-500'>
															MacOS 13.4.1
														</div>
													</div>
													<Button
														className='invisible group-hover:visible'
														color='red'>
														Delete
													</Button>
												</div>
												<div className='flex flex-shrink-0 items-center gap-4'>
													<Icon icon='CustomUSA' size='text-3xl' />
													<Badge
														variant='outline'
														rounded='rounded-full'
														className='border-transparent'>
														3 hours ago
													</Badge>
												</div>
											</div>
											<div className='group flex basis-full gap-4'>
												<div className='flex grow items-center'>
													<div>
														<div className='text-xl font-semibold'>
															Safari
														</div>
														<div className='text-zinc-500'>
															MacOS 13.4.1
														</div>
													</div>
													<Button
														className='invisible group-hover:visible'
														color='red'>
														Delete
													</Button>
												</div>
												<div className='flex flex-shrink-0 items-center gap-4'>
													<Icon icon='CustomUSA' size='text-3xl' />
													<Badge
														variant='outline'
														rounded='rounded-full'
														className='border-transparent'>
														1 day ago
													</Badge>
												</div>
											</div>
											<div className='group flex basis-full gap-4'>
												<div className='flex grow items-center'>
													<div>
														<div className='text-xl font-semibold'>
															App
														</div>
														<div className='text-zinc-500'>
															iOS 16.5.1
														</div>
													</div>
													<Button
														className='invisible group-hover:visible'
														color='red'>
														Delete
													</Button>
												</div>
												<div className='flex flex-shrink-0 items-center gap-4'>
													<Icon icon='CustomUSA' size='text-3xl' />
													<Badge
														variant='outline'
														rounded='rounded-full'
														className='border-transparent'>
														3 days ago
													</Badge>
												</div>
											</div>
											<div className='group flex basis-full gap-4'>
												<div className='flex grow items-center'>
													<div>
														<div className='text-xl font-semibold'>
															Safari
														</div>
														<div className='text-zinc-500'>
															iPadOS 16.5.1
														</div>
													</div>
													<Button
														className='invisible group-hover:visible'
														color='red'>
														Delete
													</Button>
												</div>
												<div className='flex flex-shrink-0 items-center gap-4'>
													<Icon icon='CustomUSA' size='text-3xl' />
													<Badge
														variant='outline'
														rounded='rounded-full'
														color='red'
														className='border-transparent'>
														Expired
													</Badge>
												</div>
											</div>
										</div>
									</>
								)}
								{activeTab === TAB.CONNECTED && (
									<>
										<div className='text-4xl font-semibold'>Connected</div>
										<div className='flex flex-wrap divide-y divide-dashed divide-zinc-500/50 [&>*]:py-4'>
											{userData?.socialAuth &&
												Object.keys(userData?.socialAuth).map((i) => {
													// @ts-ignore
													// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
													const status = userData?.socialAuth[i];
													return (
														<div
															key={i}
															className='flex basis-full gap-4'>
															<div className='flex grow items-center'>
																<div className='text-xl font-semibold capitalize'>
																	{i}
																</div>
															</div>
															<div className='flex flex-shrink-0 items-center gap-4'>
																<Button
																	icon={
																		status
																			? 'HeroTrash'
																			: 'HeroCog8Tooth'
																	}
																	color={status ? 'red' : 'blue'}>
																	{status ? 'Delete' : 'Set up'}
																</Button>
															</div>
														</div>
													);
												})}
										</div>
									</>
								)} */}
                                {activeTab === TAB.APPEARANCE && (
                                    <>
                                        <div className='text-4xl font-semibold'>Apariencia</div>
                                        <div className='grid grid-cols-12 gap-4'>
                                            <div className='col-span-12'>
                                                <Label htmlFor='theme'>Tema</Label>
                                                <RadioGroup isInline>
                                                    <Radio
                                                        name='theme'
                                                        value='dark'
                                                        selectedValue={formik.values.theme}
                                                        onChange={formik.handleChange}>
                                                        <div className='relative'>
                                                            <div className='flex h-2 w-full items-center gap-1 bg-zinc-500 p-1'>
                                                                <div className='h-1 w-1 rounded-full bg-red-500' />
                                                                <div className='h-1 w-1 rounded-full bg-amber-500' />
                                                                <div className='h-1 w-1 rounded-full bg-emerald-500' />
                                                            </div>
                                                            <div className='flex aspect-video w-56 bg-zinc-950'>
                                                                <div className='h-full w-1/4 border-e border-zinc-800/50 bg-zinc-900/75' />
                                                                <div className='h-full w-3/4'>
                                                                    <div className='h-4 w-full border-b border-zinc-800/50 bg-zinc-900/75' />
                                                                    <div />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Radio>
                                                    <Radio
                                                        name='theme'
                                                        value='light'
                                                        selectedValue={formik.values.theme}
                                                        onChange={formik.handleChange}>
                                                        <div className='relative'>
                                                            <div className='flex h-2 w-full items-center gap-1 bg-zinc-500 p-1'>
                                                                <div className='h-1 w-1 rounded-full bg-red-500' />
                                                                <div className='h-1 w-1 rounded-full bg-amber-500' />
                                                                <div className='h-1 w-1 rounded-full bg-emerald-500' />
                                                            </div>
                                                            <div className='flex aspect-video w-56 bg-zinc-100'>
                                                                <div className='h-full w-1/4 border-e border-zinc-300/25 bg-white' />
                                                                <div className='h-full w-3/4'>
                                                                    <div className='h-4 w-full border-b border-zinc-300/25 bg-white' />
                                                                    <div />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Radio>
                                                    <Radio
                                                        name='theme'
                                                        value='system'
                                                        selectedValue={formik.values.theme}
                                                        onChange={formik.handleChange}>
                                                        <div className='relative'>
                                                            <div className='flex h-2 w-full items-center gap-1 bg-zinc-500 p-1'>
                                                                <div className='h-1 w-1 rounded-full bg-red-500' />
                                                                <div className='h-1 w-1 rounded-full bg-amber-500' />
                                                                <div className='h-1 w-1 rounded-full bg-emerald-500' />
                                                            </div>
                                                            <div className='flex aspect-video w-56'>
                                                                {/* Parte Oscura */}
                                                                <div className='h-full w-1/2 bg-zinc-950'>
                                                                    <div className='h-full w-1/4 border-e border-zinc-800/50 bg-zinc-900/75' />
                                                                    <div className='h-full w-3/4'>
                                                                        <div className='h-4 w-full border-b border-zinc-800/50 bg-zinc-900/75' />
                                                                        <div />
                                                                    </div>
                                                                </div>
                                                                {/* Parte Clara */}
                                                                <div className='h-full w-1/2 bg-zinc-100'>
                                                                    <div className='h-full w-1/4 border-e border-zinc-300/25 bg-white' />
                                                                    <div className='h-full w-3/4'>
                                                                        <div className='h-4 w-full border-b border-zinc-300/25 bg-white' />
                                                                        <div />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Radio>
                                                </RadioGroup>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardBody>
                    {/* <CardFooter>
						<CardFooterChild>
							<div className='flex items-center gap-2'>
								<Icon icon='HeroDocumentCheck' size='text-2xl' />
								<span className='text-zinc-500'>Last saved:</span>
								<b>{dayjs().locale(i18n.language).format('LLL')}</b>
							</div>
						</CardFooterChild>
						<CardFooterChild>
							<Button
								icon='HeroServer'
								variant='solid'
								color={saveBtnColor}
								isDisable={saveBtnDisable}
								onClick={() => formik.handleSubmit()}>
								{saveBtnText}
							</Button>
						</CardFooterChild>
					</CardFooter> */}
                </Card>
            </Container>
        </PageWrapper>
    );
};

export default ProfilePage;
