import Input from '@/components/form/Input';
import SelectReact from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { TIPO_MONEDA } from '@/constants/cotizacion.constant';
import ApiService from '@/services/ApiService';
import {
    listaCotizacionesSucursalThunk,
    listaCotizacionesThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { listaMisClientesThunk } from '@/store/slices/empresa/empresaSlice';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function CrearCotizacion({
    empresa,
    onSuccess,
}: {
    empresa: boolean;
    onSuccess?: (cotizacion: any) => void;
}) {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaMisClientes } = useAppSelector((state) => state.empresa);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa && isOpen) {
            dispatch(listaMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }));
        }
    }, [personalizacionUsuario, isOpen]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            cliente: '',
            tipo_moneda: '2',
            porcentaje_recargo: 0,
            descripcion: '',
            observaciones: '',
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().required('Requerido').nonNullable('Requerido'),
            cliente: Yup.string().required('Requerido').nonNullable('Requerido'),
            tipo_moneda: Yup.string().when('cliente', {
                is: (cliente: string) => !!cliente,
                then: (schema) => schema.required('Requerido').nonNullable('Requerido'),
                otherwise: (schema) => schema.notRequired(),
            }),
            porcentaje_recargo: Yup.number()
                .when('cliente', {
                    is: (cliente: string) => !!cliente,
                    then: (schema) =>
                        schema.required('Requerido').min(0, 'Debe ser mayor o igual a 0'),
                    otherwise: (schema) => schema.notRequired(),
                })
                .nonNullable('Requerido'),
            descripcion: Yup.string().notRequired().nullable(),
            observaciones: Yup.string().notRequired().nullable(),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData<{ id: number }>({
                    url: '/api/cotizaciones/',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: { ...values, empresa: personalizacionUsuario?.empresa },
                });
                if (response.data) {
                    // El backend dispara automáticamente la actualización de tipo de cambio
                    // via Celery en perform_create, no es necesario llamar refrescar-tipo-cambio

                    toast.success('Cotización creada', { autoClose: 1000 });
                    if (empresa) {
                        dispatch(listaCotizacionesSucursalThunk(undefined));
                    } else {
                        dispatch(listaCotizacionesThunk());
                    }
                    if (onSuccess) {
                        onSuccess(response.data);
                    }
                    formik.resetForm();
                    setIsOpen(false);
                }
            } catch (error: any) {
                const errorData = error.response?.data;
                const mensajesError = errorData
                    ? Object.values(errorData).flat().join(' ')
                    : error.message || 'Error al crear la cotización';
                toast.error(mensajesError, { toastId: 'Error al crear la cotización' });
            } finally {
                formik.setSubmitting(false);
            }
        },
    });

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
        }
    }, [isOpen]);

    return (
        <>
            <Tooltip text='Añadir cotización'>
                <Button
                    variant='solid'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                    icon='HeroPlus'></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Cotización</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div className='w-full'>
                            <Badge>Nombre</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.nombre}
                                invalidFeedback={formik.errors.nombre}>
                                <Input
                                    name='nombre'
                                    value={formik.values.nombre}
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                />
                            </Validation>
                        </div>
                        <div className='w-full'>
                            <Badge>Cliente</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cliente}
                                invalidFeedback={formik.errors.cliente}>
                                <SelectReact
                                    name='cliente'
                                    id='crear-cotizacion-cliente'
                                    placeholder='Seleccione un Cliente'
                                    noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                    options={listaMisClientes.map((cliente) => ({
                                        value: cliente.info_cliente.id.toString(),
                                        label: cliente.info_cliente.nombre,
                                    }))}
                                    onBlur={formik.handleBlur}
                                    value={listaMisClientes
                                        .map((cliente) => ({
                                            value: cliente.info_cliente.id.toString(),
                                            label: cliente.info_cliente.nombre,
                                        }))
                                        .find((option) => option.value === formik.values.cliente)}
                                    onChange={(option: any) => {
                                        const clienteSeleccionado = listaMisClientes.find(
                                            (cliente) =>
                                                cliente.info_cliente.id.toString() ===
                                                option?.value,
                                        )?.info_cliente;
                                        formik.setFieldValue('cliente', option?.value);
                                        formik.setFieldValue(
                                            'porcentaje_recargo',
                                            clienteSeleccionado?.recargo ?? 0,
                                        );
                                    }}
                                />
                            </Validation>
                        </div>
                        {formik.values.cliente && (
                            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                                <div className='w-full'>
                                    <Badge>Tipo de Moneda</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.tipo_moneda}
                                        invalidFeedback={formik.errors.tipo_moneda}>
                                        <SelectReact
                                            name='tipo_moneda'
                                            id='tipo_moneda'
                                            placeholder='Seleccione un tipo de moneda'
                                            noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                            options={TIPO_MONEDA}
                                            onBlur={formik.handleBlur}
                                            value={TIPO_MONEDA.find(
                                                (option) =>
                                                    option.value === formik.values.tipo_moneda,
                                            )}
                                            onChange={(option: any) =>
                                                formik.setFieldValue('tipo_moneda', option?.value)
                                            }
                                        />
                                    </Validation>
                                </div>
                                <div className='w-full'>
                                    <Badge>Porcentaje de Recargo</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.porcentaje_recargo}
                                        invalidFeedback={formik.errors.porcentaje_recargo}>
                                        <Input
                                            name='porcentaje_recargo'
                                            type='number'
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                            value={formik.values.porcentaje_recargo}
                                        />
                                    </Validation>
                                </div>
                            </div>
                        )}
                        <div className='w-full'>
                            <Badge>Descripción</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.descripcion}
                                invalidFeedback={formik.errors.descripcion}>
                                <Textarea
                                    name='descripcion'
                                    value={formik.values.descripcion}
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                />
                            </Validation>
                        </div>
                        <div className='w-full'>
                            <Badge>Observaciones</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.observaciones}
                                invalidFeedback={formik.errors.observaciones}>
                                <Textarea
                                    name='observaciones'
                                    value={formik.values.observaciones}
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                />
                            </Validation>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpen(false);
                                formik.resetForm();
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={() => {
                                formik.handleSubmit();
                            }}
                            isDisable={formik.isSubmitting}
                            isLoading={formik.isSubmitting}>
                            Crear
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearCotizacion;
