import { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
    CONDICIONES_EQUIPO,
    MARCA_EQUIPO,
    SISTEMA_OPERATIVO,
    TAMANIO_RAM,
    TIPO_EQUIPO,
    GENERACION_PROCESADOR,
    TIPO_PROCESADOR,
    MARCA_TARJETA_GRAFICA,
    TIPO_TARJETA_GRAFICA,
} from '@/constants/recursos.constant';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import dayjs from 'dayjs';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Validation from '@/components/form/Validation';
import Input from '@/components/form/Input';
import { toast } from 'react-toastify';
import {
    detalleEquipoEmpresaThunk,
    listaUsuariosTodaLaEmpresaThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import ApiService from '@/services/ApiService';

const DatosEquipoEnDetalleEquipo = () => {
    const dispatch = useAppDispatch();
    const { detalleEquipoEmpresa } = useAppSelector((state) => state.recursos);
    const [isEditing, setIsEditing] = useState<boolean>(false);

    useEffect(() => {
        if (isEditing && detalleEquipoEmpresa && detalleEquipoEmpresa.cliente) {
            dispatch(listaUsuariosTodaLaEmpresaThunk({ id_empresa: detalleEquipoEmpresa.cliente }));
        }
    }, [isEditing, detalleEquipoEmpresa]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre_equipo: detalleEquipoEmpresa?.nombre_equipo || '',
            contraseña_administrador: detalleEquipoEmpresa?.contraseña_administrador || '',
            // cliente  models.ForeignKey("empresas.Empresa", on_deletemodels.CASCADE, related_name'equipos_cliente', nullTrue, blankTrue)
            // registrado_por  models.ForeignKey("empresas.UsuarioEmpresa", on_deletemodels.CASCADE, related_name'equipos_registrados')
            tipo_equipo: detalleEquipoEmpresa?.tipo_equipo || '',
            marca: detalleEquipoEmpresa?.marca || '',
            modelo: detalleEquipoEmpresa?.modelo || '',
            // numero_serie  models.CharField("Número de serie", max_length100, uniqueTrue)
            id_procesador: detalleEquipoEmpresa?.id_procesador || '',
            tipo_procesador: detalleEquipoEmpresa?.tipo_procesador || '',
            generacion_procesador: detalleEquipoEmpresa?.generacion_procesador || '',
            // almacenamientos  models.ManyToManyField("self", through"AlmacenamientoEquipo", blankTrue)
            ram: detalleEquipoEmpresa?.ram || '',
            sistema_operativo: detalleEquipoEmpresa?.sistema_operativo || '',
            tipo_tarjeta_grafica: detalleEquipoEmpresa?.tipo_tarjeta_grafica || '',
            nombre_tarjeta_grafica: detalleEquipoEmpresa?.nombre_tarjeta_grafica || '',
            marca_tarjeta_grafica: detalleEquipoEmpresa?.marca_tarjeta_grafica || '',
            // monitor  models.ManyToManyField("self", through"recursos.MonitorEquipo", blankTrue)
            fecha_compra: detalleEquipoEmpresa?.fecha_compra || '',
            fecha_caducidad_garantia: detalleEquipoEmpresa?.fecha_caducidad_garantia || '',
            condicion_equipo: detalleEquipoEmpresa?.condicion_equipo || '',
            // estado: "",
            // usuarios  models.ManyToManyField("self", through"recursos.UsuarioEquipo", blankTrue)
            // software_instalado  models.ManyToManyField("contenttypes.ContentType", through=SoftwareInstalado, blank=True)
        },
        validationSchema: Yup.object().shape({
            nombre_equipo: Yup.string().notRequired().nullable(),
            contraseña_administrador: Yup.string().notRequired().nullable(),
            tipo_equipo: Yup.string().required('Requerido').nonNullable('Requerido'),
            marca: Yup.string().required('Requerido').nonNullable('Requerido'),
            modelo: Yup.string().notRequired().nullable(),
            id_procesador: Yup.string().notRequired().nullable(),
            tipo_procesador: Yup.string().required('Requerido').nonNullable('Requerido'),
            generacion_procesador: Yup.string().required('Requerido').nonNullable('Requerido'),
            ram: Yup.string().required('Requerido').nonNullable('Requerido'),
            sistema_operativo: Yup.string().required('Requerido').nonNullable('Requerido'),
            tipo_tarjeta_grafica: Yup.string().required('Requerido').nonNullable('Requerido'),
            nombre_tarjeta_grafica: Yup.string().notRequired().nullable(),
            marca_tarjeta_grafica: Yup.string().required('Requerido').nonNullable('Requerido'),
            fecha_compra: Yup.string().notRequired().nullable(),
            fecha_caducidad_garantia: Yup.string().notRequired().nullable(),
            condicion_equipo: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const data = {
                    ...values,
                    fecha_compra: values.fecha_compra
                        ? dayjs(values.fecha_compra).format('YYYY-MM-DD')
                        : null,
                    fecha_caducidad_garantia: values.fecha_caducidad_garantia
                        ? dayjs(values.fecha_caducidad_garantia).format('YYYY-MM-DD')
                        : null,
                };
                const response = await ApiService.fetchData({
                    url: `/api/equipos/${detalleEquipoEmpresa?.id}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(data),
                });
                if (response.data) {
                    toast.success('Equipo Editado', { autoClose: 1000 });
                    dispatch(detalleEquipoEmpresaThunk({ id_equipo: detalleEquipoEmpresa?.id }));
                    setIsEditing(false);
                }
            } catch (error: any) {
                toast.error(error.response.data);
            }
        },
    });

    useEffect(() => {
        if (detalleEquipoEmpresa && isEditing) {
            formik.setValues({
                condicion_equipo: detalleEquipoEmpresa.condicion_equipo,
                contraseña_administrador: detalleEquipoEmpresa.contraseña_administrador || '',
                fecha_caducidad_garantia: detalleEquipoEmpresa.fecha_caducidad_garantia || '',
                fecha_compra: detalleEquipoEmpresa.fecha_compra || '',
                generacion_procesador: detalleEquipoEmpresa.generacion_procesador,
                id_procesador: detalleEquipoEmpresa.id_procesador || '',
                marca: detalleEquipoEmpresa.marca,
                marca_tarjeta_grafica: detalleEquipoEmpresa.marca_tarjeta_grafica,
                modelo: detalleEquipoEmpresa.modelo,
                nombre_equipo: detalleEquipoEmpresa.nombre_equipo || '',
                nombre_tarjeta_grafica: detalleEquipoEmpresa.nombre_tarjeta_grafica || '',
                ram: detalleEquipoEmpresa.ram,
                sistema_operativo: detalleEquipoEmpresa.sistema_operativo,
                tipo_equipo: detalleEquipoEmpresa.tipo_equipo,
                tipo_procesador: detalleEquipoEmpresa.tipo_procesador,
                tipo_tarjeta_grafica: detalleEquipoEmpresa.tipo_tarjeta_grafica,
            });
        }
    }, [detalleEquipoEmpresa, isEditing]);

    return (
        <>
            <Card>
                <CardBody className='flex flex-col gap-4'>
                    <Card className='border border-blue-500'>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Datos del Equipo</Badge>
                            </CardHeaderChild>
                            <CardHeaderChild>
                                {isEditing ? (
                                    <>
                                        <Button
                                            variant='solid'
                                            onClick={() => {
                                                formik.handleSubmit();
                                            }}>
                                            Guardar
                                        </Button>
                                        <Button
                                            variant='solid'
                                            color='red'
                                            onClick={() => {
                                                setIsEditing(false);
                                            }}>
                                            Cancelar
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant='solid'
                                        onClick={() => {
                                            setIsEditing(true);
                                        }}>
                                        Editar
                                    </Button>
                                )}
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                            <div>
                                <Badge>Número de Serie</Badge>
                                <div className='ml-4'>{detalleEquipoEmpresa?.numero_serie}</div>
                            </div>
                            <div>
                                <Badge>Marca</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.marca}
                                        invalidFeedback={formik.errors.marca}>
                                        <SelectReact
                                            name='marca'
                                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                            onBlur={formik.handleBlur}
                                            options={MARCA_EQUIPO}
                                            onChange={(e) => {
                                                formik.setFieldValue(
                                                    'marca',
                                                    (e as TSelectOption).value,
                                                );
                                            }}
                                            value={{
                                                value: formik.values.marca,
                                                label:
                                                    MARCA_EQUIPO.find(
                                                        (tg) => tg.value === formik.values.marca,
                                                    )?.label || '',
                                            }}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>{detalleEquipoEmpresa?.marca_label}</div>
                                )}
                            </div>
                            <div>
                                <Badge>Modelo</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.modelo}
                                        invalidFeedback={formik.errors.modelo}>
                                        <Input
                                            name='modelo'
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                            value={formik.values.modelo}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>
                                        {detalleEquipoEmpresa?.modelo || 'Sin Modelo'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Badge>Tipo de Equipo</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.tipo_equipo}
                                        invalidFeedback={formik.errors.tipo_equipo}>
                                        <SelectReact
                                            name='tipo_equipo'
                                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                            onBlur={formik.handleBlur}
                                            options={TIPO_EQUIPO}
                                            onChange={(e) => {
                                                formik.setFieldValue(
                                                    'tipo_equipo',
                                                    (e as TSelectOption).value,
                                                );
                                            }}
                                            value={{
                                                value: formik.values.tipo_equipo,
                                                label:
                                                    TIPO_EQUIPO.find(
                                                        (tg) =>
                                                            tg.value === formik.values.tipo_equipo,
                                                    )?.label || '',
                                            }}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>
                                        {detalleEquipoEmpresa?.tipo_equipo_label}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Badge>Nombre del Equipo</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.nombre_equipo}
                                        invalidFeedback={formik.errors.nombre_equipo}>
                                        <Input
                                            name='nombre_equipo'
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                            value={formik.values.nombre_equipo}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>
                                        {detalleEquipoEmpresa?.nombre_equipo || 'Sin Nombre'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Badge>Contraseña de Administrador</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.contraseña_administrador}
                                        invalidFeedback={formik.errors.contraseña_administrador}>
                                        <Input
                                            name='contraseña_administrador'
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                            value={formik.values.contraseña_administrador}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>
                                        {detalleEquipoEmpresa?.contraseña_administrador ||
                                            'Sin Contraseña'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Badge>Condición del Equipo</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.condicion_equipo}
                                        invalidFeedback={formik.errors.condicion_equipo}>
                                        <SelectReact
                                            name='condicion_equipo'
                                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                            options={CONDICIONES_EQUIPO}
                                            value={{
                                                value: formik.values.condicion_equipo,
                                                label:
                                                    CONDICIONES_EQUIPO.find(
                                                        (ce) =>
                                                            ce.value ===
                                                            formik.values.condicion_equipo,
                                                    )?.label || '',
                                            }}
                                            onChange={(e) => {
                                                formik.setFieldValue(
                                                    'condicion_equipo',
                                                    (e as TSelectOption).value,
                                                );
                                            }}
                                            onBlur={formik.handleBlur}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>
                                        {detalleEquipoEmpresa?.condicion_equipo_label}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Badge>Ram</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.ram}
                                        invalidFeedback={formik.errors.ram}>
                                        <SelectReact
                                            name='ram'
                                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                            onBlur={formik.handleBlur}
                                            options={TAMANIO_RAM}
                                            onChange={(e) => {
                                                formik.setFieldValue(
                                                    'ram',
                                                    (e as TSelectOption).value,
                                                );
                                            }}
                                            value={{
                                                value: formik.values.ram,
                                                label:
                                                    TAMANIO_RAM.find(
                                                        (gp) => gp.value === formik.values.ram,
                                                    )?.label || '',
                                            }}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>{detalleEquipoEmpresa?.ram_label}</div>
                                )}
                            </div>
                            <div>
                                <Badge>Sistema Operativo</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.sistema_operativo}
                                        invalidFeedback={formik.errors.sistema_operativo}>
                                        <SelectReact
                                            name='sistema_operativo'
                                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                            onBlur={formik.handleBlur}
                                            options={SISTEMA_OPERATIVO}
                                            onChange={(e) => {
                                                formik.setFieldValue(
                                                    'sistema_operativo',
                                                    (e as TSelectOption).value,
                                                );
                                            }}
                                            value={{
                                                value: formik.values.sistema_operativo,
                                                label:
                                                    SISTEMA_OPERATIVO.find(
                                                        (gp) =>
                                                            gp.value ===
                                                            formik.values.sistema_operativo,
                                                    )?.label || '',
                                            }}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>
                                        {detalleEquipoEmpresa?.sistema_operativo_label}
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                    {/* Datos del Procesador */}
                    <Card className='border border-blue-500'>
                        <CardHeader>
                            <Badge className='text-xl'>Datos Procesador</Badge>
                        </CardHeader>
                        <CardBody className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                            <div>
                                <Badge>Generación</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.generacion_procesador}
                                        invalidFeedback={formik.errors.generacion_procesador}>
                                        <SelectReact
                                            name='generacion_procesador'
                                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                            onBlur={formik.handleBlur}
                                            options={GENERACION_PROCESADOR}
                                            onChange={(e) => {
                                                formik.setFieldValue(
                                                    'generacion_procesador',
                                                    (e as TSelectOption).value,
                                                );
                                            }}
                                            value={{
                                                value: formik.values.generacion_procesador,
                                                label:
                                                    GENERACION_PROCESADOR.find(
                                                        (gp) =>
                                                            gp.value ===
                                                            formik.values.generacion_procesador,
                                                    )?.label || '',
                                            }}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>
                                        {detalleEquipoEmpresa?.generacion_procesador_label}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Badge>Tipo</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.tipo_procesador}
                                        invalidFeedback={formik.errors.tipo_procesador}>
                                        <SelectReact
                                            name='tipo_procesador'
                                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                            onBlur={formik.handleBlur}
                                            options={TIPO_PROCESADOR}
                                            onChange={(e) => {
                                                formik.setFieldValue(
                                                    'tipo_procesador',
                                                    (e as TSelectOption).value,
                                                );
                                            }}
                                            value={{
                                                value: formik.values.tipo_procesador,
                                                label:
                                                    TIPO_PROCESADOR.find(
                                                        (gp) =>
                                                            gp.value ===
                                                            formik.values.tipo_procesador,
                                                    )?.label || '',
                                            }}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>
                                        {detalleEquipoEmpresa?.tipo_procesador_label}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Badge>Identificador</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.id_procesador}
                                        invalidFeedback={formik.errors.id_procesador}>
                                        <Input
                                            name='id_procesador'
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                            value={formik.values.id_procesador}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>
                                        {detalleEquipoEmpresa?.id_procesador || 'Sin Identificador'}
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                    {/* Datos de Tarjeta Grafica */}
                    <Card className='border border-blue-500'>
                        <CardHeader>
                            <Badge className='text-xl'>Datos Tarjeta Gráfica</Badge>
                        </CardHeader>
                        <CardBody className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                            <div>
                                <Badge>Marca</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.marca_tarjeta_grafica}
                                        invalidFeedback={formik.errors.marca_tarjeta_grafica}>
                                        <SelectReact
                                            name='marca_tarjeta_grafica'
                                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                            onBlur={formik.handleBlur}
                                            options={MARCA_TARJETA_GRAFICA}
                                            onChange={(e) => {
                                                formik.setFieldValue(
                                                    'marca_tarjeta_grafica',
                                                    (e as TSelectOption).value,
                                                );
                                            }}
                                            value={{
                                                value: formik.values.marca_tarjeta_grafica,
                                                label:
                                                    MARCA_TARJETA_GRAFICA.find(
                                                        (mt) =>
                                                            mt.value ===
                                                            formik.values.marca_tarjeta_grafica,
                                                    )?.label || '',
                                            }}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>
                                        {detalleEquipoEmpresa?.marca_tarjeta_grafica_label}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Badge>Tipo</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.tipo_tarjeta_grafica}
                                        invalidFeedback={formik.errors.tipo_tarjeta_grafica}>
                                        <SelectReact
                                            name='tipo_tarjeta_grafica'
                                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                            onBlur={formik.handleBlur}
                                            options={TIPO_TARJETA_GRAFICA}
                                            onChange={(e) => {
                                                formik.setFieldValue(
                                                    'tipo_tarjeta_grafica',
                                                    (e as TSelectOption).value,
                                                );
                                            }}
                                            value={{
                                                value: formik.values.tipo_tarjeta_grafica,
                                                label:
                                                    TIPO_TARJETA_GRAFICA.find(
                                                        (tg) =>
                                                            tg.value ===
                                                            formik.values.tipo_tarjeta_grafica,
                                                    )?.label || '',
                                            }}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>
                                        {detalleEquipoEmpresa?.tipo_tarjeta_grafica_label}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Badge>Nombre</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.nombre_tarjeta_grafica}
                                        invalidFeedback={formik.errors.nombre_tarjeta_grafica}>
                                        <Input
                                            name='nombre_tarjeta_grafica'
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                            value={formik.values.nombre_tarjeta_grafica}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>
                                        {detalleEquipoEmpresa?.nombre_tarjeta_grafica ||
                                            'Sin Nombre'}
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                    {/* Fechas Importantes */}
                    <Card className='border border-blue-500'>
                        <CardHeader>
                            <Badge className='text-xl'>Fechas Importantes</Badge>
                        </CardHeader>
                        <CardBody className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                            <div>
                                <Badge>Fecha de Compra</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.fecha_compra}
                                        invalidFeedback={formik.errors.fecha_compra}>
                                        <Input
                                            name='fecha_compra'
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                            type='date'
                                            value={formik.values.fecha_compra}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>
                                        {detalleEquipoEmpresa?.fecha_compra
                                            ? dayjs(detalleEquipoEmpresa?.fecha_compra).format(
                                                  'DD/MM/YYYY',
                                              )
                                            : 'Sin Fecha de Compra'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Badge>Garantia del equipo</Badge>
                                {isEditing ? (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.fecha_caducidad_garantia}
                                        invalidFeedback={formik.errors.fecha_caducidad_garantia}>
                                        <Input
                                            name='fecha_caducidad_garantia'
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                            type='date'
                                            value={formik.values.fecha_caducidad_garantia}
                                        />
                                    </Validation>
                                ) : (
                                    <div className='ml-4'>
                                        {detalleEquipoEmpresa?.fecha_caducidad_garantia
                                            ? dayjs(
                                                  detalleEquipoEmpresa?.fecha_caducidad_garantia,
                                              ).format('DD/MM/YYYY')
                                            : 'Sin Fecha de Caducidad'}
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                </CardBody>
            </Card>
        </>
    );
};

export default DatosEquipoEnDetalleEquipo;
