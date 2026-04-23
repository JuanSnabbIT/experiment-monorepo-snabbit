import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import {
    TIPO_MODALIDAD_ANUAL_FORMA_PAGO,
    TIPO_MODALIDAD_BASE_LICENCIA,
    TIPO_MONEDA_LICENCIA,
} from '@/constants/contrato.constant';
import { useAppDispatch, useAppSelector } from '@/store';
import {
    useGetLicenciaQuery,
    useUpdateLicenciaCatalogoMutation,
} from '@/store/slices/contratos/contratoApi';
import { listaProveedoresEmpresaThunk } from '@/store/slices/item/itemSlice';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IFormValues {
    nombre: string;
    numero_parte: string;
    proveedor: string;
    descripcion: string;
    modalidad_base: 'P1M' | 'P1Y' | 'PAGO_UNICO';
    modalidad_anual_forma_pago: 'PAGO_UNICO' | 'PAGO_MENSUAL' | '';
    precio_partner: number;
    precio_venta: number;
    moneda: string;
    activo: boolean;
}

const DetalleLicenciaCatalogo = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaProveedoresEmpresa } = useAppSelector((state) => state.item);

    const { data: licencia, isLoading, isError } = useGetLicenciaQuery(id ?? '', {
        skip: !id,
    });
    const [updateLicenciaCatalogo, { isLoading: isSaving }] = useUpdateLicenciaCatalogoMutation();

    useEffect(() => {
        if (personalizacionUsuario?.empresa) {
            dispatch(listaProveedoresEmpresaThunk({ id_empresa: personalizacionUsuario.empresa }));
        }
    }, [dispatch, personalizacionUsuario?.empresa]);

    const optionProveedores: TSelectOption[] = listaProveedoresEmpresa.map((proveedor) => ({
        value: proveedor.nombre,
        label: proveedor.nombre,
    }));

    const formik = useFormik<IFormValues>({
        enableReinitialize: true,
        initialValues: {
            nombre: licencia?.nombre ?? '',
            numero_parte: licencia?.numero_parte ?? '',
            proveedor: licencia?.proveedor ?? '',
            descripcion: licencia?.descripcion ?? '',
            modalidad_base: licencia?.modalidad_base ?? 'P1M',
            modalidad_anual_forma_pago: licencia?.modalidad_anual_forma_pago ?? '',
            precio_partner: Number(licencia?.precio_partner ?? 0),
            precio_venta: Number(licencia?.precio_venta ?? 0),
            moneda: licencia?.moneda ?? 'USD',
            activo: licencia?.activo ?? true,
        },
        validationSchema: Yup.object({
            nombre: Yup.string().required('Nombre es requerido'),
            modalidad_base: Yup.mixed<'P1M' | 'P1Y' | 'PAGO_UNICO'>()
                .oneOf(['P1M', 'P1Y', 'PAGO_UNICO'])
                .required('Modalidad es requerida'),
            modalidad_anual_forma_pago: Yup.string().when('modalidad_base', {
                is: 'P1Y',
                then: (schema) => schema.required('Forma de pago anual es requerida'),
                otherwise: (schema) => schema.notRequired(),
            }),
            precio_partner: Yup.number()
                .moreThan(0, 'Debe ser mayor a 0')
                .required('Precio partner es requerido'),
            precio_venta: Yup.number()
                .moreThan(0, 'Debe ser mayor a 0')
                .required('Precio venta es requerido'),
            moneda: Yup.string().required('Moneda es requerida'),
        }),
        onSubmit: async (values) => {
            if (!id) {
                return;
            }
            try {
                await updateLicenciaCatalogo({
                    id,
                    data: {
                        ...values,
                        modalidad_anual_forma_pago:
                            values.modalidad_base === 'P1Y'
                                && values.modalidad_anual_forma_pago !== ''
                                ? values.modalidad_anual_forma_pago
                                : null,
                    },
                }).unwrap();
                toast.success('Licencia actualizada');
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    if (isLoading) {
        return (
            <PageWrapper>
                <Container>
                    <p className='p-4 text-sm text-zinc-500'>Cargando licencia...</p>
                </Container>
            </PageWrapper>
        );
    }

    if (isError || !licencia) {
        return (
            <PageWrapper>
                <Container>
                    <Alert color='red'>No se pudo cargar la licencia solicitada.</Alert>
                </Container>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper isProtectedRoute name='Detalle Licencia' title='Detalle Licencia'>
            <Subheader>
                <SubheaderLeft>
                    <Button icon='HeroArrowLeft' variant='outline' onClick={() => navigate('/registros/licencias')}>
                        Volver
                    </Button>
                    <h1 className='text-lg font-semibold'>{licencia.nombre}</h1>
                </SubheaderLeft>
                <SubheaderRight>
                    <Button variant='solid' onClick={() => formik.submitForm()} disabled={isSaving}>
                        Guardar cambios
                    </Button>
                </SubheaderRight>
            </Subheader>
            <Container>
                <Card>
                    <CardHeader>Detalle de licencia</CardHeader>
                    <CardBody>
                        <form className='grid gap-4' onSubmit={formik.handleSubmit}>
                            <div className='grid gap-4 md:grid-cols-2'>
                                <div>
                                    <Label htmlFor='nombre'>Nombre</Label>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.nombre}
                                        invalidFeedback={formik.errors.nombre}>
                                        <Input
                                            name='nombre'
                                            value={formik.values.nombre}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                        />
                                    </Validation>
                                </div>
                                <div>
                                    <Label htmlFor='numero_parte'>Número de parte</Label>
                                    <Input
                                        name='numero_parte'
                                        value={formik.values.numero_parte}
                                        onChange={formik.handleChange}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor='proveedor'>Proveedor</Label>
                                <SelectReact
                                    name='proveedor'
                                    options={optionProveedores}
                                    value={
                                        optionProveedores.find(
                                            (option) => option.value === formik.values.proveedor,
                                        ) ??
                                        (formik.values.proveedor
                                            ? {
                                                  value: formik.values.proveedor,
                                                  label: formik.values.proveedor,
                                              }
                                            : null)
                                    }
                                    onChange={(option) =>
                                        formik.setFieldValue(
                                            'proveedor',
                                            (option as TSelectOption)?.value ?? '',
                                        )
                                    }
                                    isClearable
                                />
                            </div>

                            <div className='grid gap-4 md:grid-cols-2'>
                                <div>
                                    <Label htmlFor='modalidad_base'>Modalidad</Label>
                                    <SelectReact
                                        name='modalidad_base'
                                        options={[...TIPO_MODALIDAD_BASE_LICENCIA]}
                                        value={
                                            [...TIPO_MODALIDAD_BASE_LICENCIA].find(
                                                (option) => option.value === formik.values.modalidad_base,
                                            ) as unknown as TSelectOption
                                        }
                                        onChange={(option) => {
                                            const modalidad = (option as TSelectOption).value as
                                                | 'P1M'
                                                | 'P1Y'
                                                | 'PAGO_UNICO';
                                            formik.setFieldValue('modalidad_base', modalidad);
                                            if (modalidad !== 'P1Y') {
                                                formik.setFieldValue('modalidad_anual_forma_pago', '');
                                            }
                                        }}
                                    />
                                </div>

                                {formik.values.modalidad_base === 'P1Y' && (
                                    <div>
                                        <Label htmlFor='modalidad_anual_forma_pago'>Forma pago anual</Label>
                                        <Validation
                                            isValid={formik.isValid}
                                            isTouched={formik.touched.modalidad_anual_forma_pago}
                                            invalidFeedback={
                                                formik.errors.modalidad_anual_forma_pago as string
                                            }>
                                            <SelectReact
                                                name='modalidad_anual_forma_pago'
                                                options={[...TIPO_MODALIDAD_ANUAL_FORMA_PAGO]}
                                                value={
                                                    [...TIPO_MODALIDAD_ANUAL_FORMA_PAGO].find(
                                                        (option) =>
                                                            option.value ===
                                                            formik.values.modalidad_anual_forma_pago,
                                                    ) as unknown as TSelectOption
                                                }
                                                onChange={(option) =>
                                                    formik.setFieldValue(
                                                        'modalidad_anual_forma_pago',
                                                        (option as TSelectOption).value,
                                                    )
                                                }
                                            />
                                        </Validation>
                                    </div>
                                )}
                            </div>

                            <div className='grid gap-4 md:grid-cols-2'>
                                <div>
                                    <Label htmlFor='precio_partner'>Precio partner</Label>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.precio_partner}
                                        invalidFeedback={formik.errors.precio_partner as string}>
                                        <Input
                                            name='precio_partner'
                                            type='number'
                                            value={formik.values.precio_partner}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            step='0.01'
                                        />
                                    </Validation>
                                </div>
                                <div>
                                    <Label htmlFor='precio_venta'>Precio venta</Label>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.precio_venta}
                                        invalidFeedback={formik.errors.precio_venta as string}>
                                        <Input
                                            name='precio_venta'
                                            type='number'
                                            value={formik.values.precio_venta}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            step='0.01'
                                        />
                                    </Validation>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor='moneda'>Moneda</Label>
                                <SelectReact
                                    name='moneda'
                                    options={TIPO_MONEDA_LICENCIA}
                                    value={TIPO_MONEDA_LICENCIA.find(
                                        (option) => option.value === formik.values.moneda,
                                    )}
                                    onChange={(option) =>
                                        formik.setFieldValue('moneda', (option as TSelectOption).value)
                                    }
                                />
                            </div>

                            <div>
                                <Label htmlFor='descripcion'>Descripción</Label>
                                <Textarea
                                    name='descripcion'
                                    value={formik.values.descripcion}
                                    onChange={formik.handleChange}
                                />
                            </div>

                            <div>
                                <Checkbox
                                    name='activo'
                                    checked={formik.values.activo}
                                    onChange={(event) =>
                                        formik.setFieldValue('activo', event.target.checked)
                                    }>
                                    Activo
                                </Checkbox>
                            </div>
                        </form>
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    );
};

export default DetalleLicenciaCatalogo;
