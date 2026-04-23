import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { TIPO_MONEDA_LICENCIA } from '@/constants/contrato.constant';
import { ILicencia } from '@/interface/contrato.interface';
import ApiService from '@/services/ApiService';
import {
    useDeleteLicenciaCatalogoMutation,
    useUpdateLicenciaCatalogoMutation,
} from '@/store/slices/contratos/contratoApi';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

const emptyLicencia: ILicencia = {
    id: 0,
    fecha_creacion: '',
    fecha_modificacion: '',
    nombre: '',
    proveedor: '',
    descripcion: '',
    numero_parte: '',
    precio_compra: 0,
    precio_venta: 0,
    precio_modalidad_p1m: 0,
    precio_modalidad_p1m_compromiso_p1y: 0,
    precio_modalidad_p1y: 0,
    precio_modalidad_pago_unico: 0,
    moneda: 'USD',
    activo: true,
};

const modalidades = [
    { label: 'Pago mensual', field: 'precio_modalidad_p1m' },
    { label: 'Pago mensual con compromiso anual', field: 'precio_modalidad_p1m_compromiso_p1y' },
    { label: 'Pago anual', field: 'precio_modalidad_p1y' },
    { label: 'Pago único', field: 'precio_modalidad_pago_unico' },
] as const;

const DetalleLicenciaCatalogo = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [licencia, setLicencia] = useState<ILicencia | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [updateLicenciaCatalogo, { isLoading: isSaving }] = useUpdateLicenciaCatalogoMutation();
    const [deleteLicenciaCatalogo, { isLoading: isDeleting }] = useDeleteLicenciaCatalogoMutation();

    const loadLicencia = async () => {
        if (!id) return;

        setIsLoading(true);
        setIsError(false);
        try {
            const response = await ApiService.fetchData<ILicencia>({
                url: `/api/licencias/${id}/`,
                method: 'get',
            });
            setLicencia(response.data ?? null);
        } catch (_error) {
            setIsError(true);
            setLicencia(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadLicencia();
    }, [id]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: licencia?.nombre || '',
            proveedor: licencia?.proveedor || '',
            numero_parte: licencia?.numero_parte || '',
            descripcion: licencia?.descripcion || '',
            precio_compra: licencia?.precio_compra || 0,
            precio_venta: licencia?.precio_venta || 0,
            precio_modalidad_p1m: licencia?.precio_modalidad_p1m || 0,
            precio_modalidad_p1m_compromiso_p1y: licencia?.precio_modalidad_p1m_compromiso_p1y || 0,
            precio_modalidad_p1y: licencia?.precio_modalidad_p1y || 0,
            precio_modalidad_pago_unico: licencia?.precio_modalidad_pago_unico || 0,
            moneda: licencia?.moneda || 'USD',
            activo: licencia?.activo ?? true,
        },
        validationSchema: Yup.object({
            nombre: Yup.string().required('Nombre es requerido'),
            moneda: Yup.string().required('Moneda es requerida'),
            precio_compra: Yup.number().min(0, 'Mínimo 0').required('Precio partner es requerido'),
            precio_venta: Yup.number().min(0, 'Mínimo 0').required('Precio venta es requerido'),
            precio_modalidad_p1m: Yup.number().min(0, 'Mínimo 0'),
            precio_modalidad_p1m_compromiso_p1y: Yup.number().min(0, 'Mínimo 0'),
            precio_modalidad_p1y: Yup.number().min(0, 'Mínimo 0'),
            precio_modalidad_pago_unico: Yup.number().min(0, 'Mínimo 0'),
        }),
        onSubmit: async (values) => {
            if (!licencia?.id) return;

            try {
                await updateLicenciaCatalogo({ id: licencia.id, data: values }).unwrap();
                toast.success('Licencia actualizada');
                setIsEditing(false);
                await loadLicencia();
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    const handleDelete = async () => {
        if (!licencia?.id) return;
        // eslint-disable-next-line no-alert
        if (!window.confirm('¿Eliminar esta licencia? Esta acción no se puede deshacer.')) return;

        try {
            await deleteLicenciaCatalogo(licencia.id).unwrap();
            toast.success('Licencia eliminada');
            navigate('/registros/licencias');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const detalle = licencia ?? emptyLicencia;

    if (isLoading) {
        return (
            <PageWrapper isProtectedRoute name='Detalle Licencia' title='Detalle Licencia'>
                <Container className='h-full w-full'>
                    <div className='flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400'>
                        Cargando licencia...
                    </div>
                </Container>
            </PageWrapper>
        );
    }

    if (isError) {
        return (
            <PageWrapper isProtectedRoute name='Detalle Licencia' title='Detalle Licencia'>
                <Container className='h-full w-full'>
                    <Alert color='red' variant='outline'>
                        No se pudo cargar la licencia. Verifica tu conexión e intenta nuevamente.
                    </Alert>
                </Container>
            </PageWrapper>
        );
    }

    if (!licencia) {
        return (
            <PageWrapper isProtectedRoute name='Detalle Licencia' title='Detalle Licencia'>
                <Container className='h-full w-full'>
                    <div className='flex h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400'>
                        Licencia no encontrada.
                    </div>
                </Container>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper isProtectedRoute name='Detalle Licencia' title='Detalle Licencia'>
            <Subheader>
                <SubheaderLeft>
                    <div className='flex flex-wrap items-center gap-3'>
                        <Button icon='HeroArrowLeft' onClick={() => navigate('/registros/licencias')}>
                            Volver a licencias
                        </Button>
                        <div>
                            <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                                Registros
                            </div>
                            <div className='flex flex-wrap items-center gap-2'>
                                <h1 className='text-lg font-semibold text-zinc-900 dark:text-zinc-100'>
                                    {detalle.nombre}
                                </h1>
                                <Badge color={detalle.activo ? 'emerald' : 'zinc'}>
                                    {detalle.activo ? 'Activo' : 'Inactivo'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </SubheaderLeft>
                <SubheaderRight className='w-full md:w-auto'>
                    <div className='flex w-full flex-col gap-2 md:w-auto md:flex-row'>
                        <Button
                            variant='outline'
                            icon='HeroPencilSquare'
                            onClick={() => {
                                formik.resetForm();
                                setIsEditing((prev) => !prev);
                            }}>
                            {isEditing ? 'Cancelar edición' : 'Editar'}
                        </Button>
                        <Button
                            variant='solid'
                            color='red'
                            icon='HeroTrash'
                            isLoading={isDeleting}
                            onClick={handleDelete}>
                            Eliminar
                        </Button>
                    </div>
                </SubheaderRight>
            </Subheader>

            <Container className='h-full w-full'>
                <div className='grid grid-cols-1 gap-4 xl:grid-cols-12'>
                    <div className='xl:col-span-4'>
                        <Card className='h-full border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'>
                            <CardHeader>
                                <CardHeaderChild>
                                    <div>
                                        <div className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                            Resumen de la licencia
                                        </div>
                                        <div className='text-xs text-zinc-500 dark:text-zinc-400'>
                                            Bloque principal alineado al patrón visual del detalle de cotización.
                                        </div>
                                    </div>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className='grid gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/40'>
                                    <div>
                                        <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Proveedor</div>
                                        <div className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>{detalle.proveedor || 'Sin proveedor'}</div>
                                    </div>
                                    <div>
                                        <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Número de parte</div>
                                        <div className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>{detalle.numero_parte || '—'}</div>
                                    </div>
                                    <div>
                                        <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Moneda</div>
                                        <div className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>{detalle.moneda}</div>
                                    </div>
                                    <div>
                                        <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Precio partner base</div>
                                        <div className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>
                                            {formatCurrency(Number(detalle.precio_compra || 0), detalle.moneda)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Precio venta base</div>
                                        <div className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>
                                            {formatCurrency(Number(detalle.precio_venta || 0), detalle.moneda)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Última actualización</div>
                                        <div className='mt-1 font-medium text-zinc-900 dark:text-zinc-100'>
                                            {detalle.fecha_modificacion
                                                ? dayjs(detalle.fecha_modificacion).format('DD/MM/YYYY HH:mm')
                                                : '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className='text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>Descripción</div>
                                        <div className='mt-1 text-sm text-zinc-700 dark:text-zinc-300'>
                                            {detalle.descripcion || 'Sin descripción registrada.'}
                                        </div>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>

                    <div className='xl:col-span-8'>
                        <div className='grid gap-4'>
                            <Card className='border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <div>
                                            <div className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                Configuración general
                                            </div>
                                            <div className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                Jerarquía visual, espaciados y validaciones consistentes con cotizaciones.
                                            </div>
                                        </div>
                                    </CardHeaderChild>
                                    <CardHeaderChild>
                                        <Badge variant='outline' color='zinc'>
                                            ID #{detalle.id}
                                        </Badge>
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody>
                                    <form onSubmit={formik.handleSubmit}>
                                        <div className='grid gap-4 md:grid-cols-2'>
                                            <div className='md:col-span-2'>
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
                                                        disabled={!isEditing}
                                                    />
                                                </Validation>
                                            </div>
                                            <div>
                                                <Label htmlFor='proveedor'>Proveedor</Label>
                                                <Input
                                                    name='proveedor'
                                                    value={formik.values.proveedor}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                    disabled={!isEditing}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor='numero_parte'>Número de parte</Label>
                                                <Input
                                                    name='numero_parte'
                                                    value={formik.values.numero_parte}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                    disabled={!isEditing}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor='moneda'>Moneda</Label>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.moneda}
                                                    invalidFeedback={formik.errors.moneda}>
                                                    <SelectReact
                                                        name='moneda'
                                                        options={TIPO_MONEDA_LICENCIA}
                                                        value={TIPO_MONEDA_LICENCIA.find(
                                                            (option) => option.value === formik.values.moneda,
                                                        )}
                                                        onChange={(option) =>
                                                            formik.setFieldValue(
                                                                'moneda',
                                                                (option as TSelectOption).value,
                                                            )
                                                        }
                                                        isDisabled={!isEditing}
                                                    />
                                                </Validation>
                                            </div>
                                            <div className='flex items-end'>
                                                <Badge color={formik.values.activo ? 'emerald' : 'zinc'}>
                                                    {formik.values.activo ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </div>
                                            <div className='md:col-span-2'>
                                                <Label htmlFor='descripcion'>Descripción</Label>
                                                <Textarea
                                                    name='descripcion'
                                                    value={formik.values.descripcion}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                    disabled={!isEditing}
                                                />
                                            </div>
                                        </div>

                                        {isEditing && (
                                            <div className='mt-6 flex flex-wrap justify-end gap-2'>
                                                <Button type='button' variant='outline' onClick={() => setIsEditing(false)}>
                                                    Cancelar
                                                </Button>
                                                <Button type='submit' variant='solid' isLoading={isSaving}>
                                                    Guardar cambios
                                                </Button>
                                            </div>
                                        )}
                                    </form>
                                </CardBody>
                            </Card>

                            <Card className='border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'>
                                <CardHeader>
                                    <CardHeaderChild>
                                        <div>
                                            <div className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                Precios por modalidad
                                            </div>
                                            <div className='text-xs text-zinc-500 dark:text-zinc-400'>
                                                Presentación secundaria con bloques consistentes y lectura rápida de valores.
                                            </div>
                                        </div>
                                    </CardHeaderChild>
                                </CardHeader>
                                <CardBody>
                                    <div className='grid gap-4 md:grid-cols-2'>
                                        {modalidades.map((modalidad) => (
                                            <div
                                                key={modalidad.field}
                                                className='rounded-2xl border border-zinc-200 bg-zinc-50/40 p-5 dark:border-zinc-800 dark:bg-zinc-950/40'>
                                                <div className='mb-3 flex items-center gap-2'>
                                                    <Icon icon='HeroCurrencyDollar' className='text-violet-500' />
                                                    <div className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>
                                                        {modalidad.label}
                                                    </div>
                                                </div>
                                                <div className='text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                                                    Precio partner
                                                </div>
                                                <div className='mt-1 font-mono text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                                                    {formatCurrency(
                                                        Number(detalle[modalidad.field] || 0),
                                                        detalle.moneda,
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                    </div>
                </div>
            </Container>
        </PageWrapper>
    );
};

export default DetalleLicenciaCatalogo;
