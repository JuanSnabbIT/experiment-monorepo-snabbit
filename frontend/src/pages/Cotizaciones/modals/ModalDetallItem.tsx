import Input from '@/components/form/Input';
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
import { IItemCotizacion } from '@/interface/cotizaciones.interface';
import ApiService from '@/services/ApiService';
import { listaItemsEnCotizacionThunk, useAppDispatch, useAppSelector } from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

const ModalDetallItem = ({
    valuess,
    id_cotizacion,
    id_item,
}: {
    valuess: IItemCotizacion;
    id_cotizacion: number | string | any;
    id_item: number;
}) => {
    const dispatch = useAppDispatch();
    const { detalleCotizacion } = useAppSelector((state) => state.cotizacion);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    useEffect(() => {
        if (isEditing) {
            formikDetalle.setValues({
                nombre: valuess.nombre || '',
                descripcion: valuess.descripcion || '',
                cantidad: valuess.cantidad,
                precio_unitario: parseFloat(valuess.precio_unitario),
                porcentaje_recargo: valuess.porcentaje_recargo || 0,
            });
        }
    }, [isEditing]);

    const formikDetalle = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            descripcion: '',
            cantidad: 0,
            precio_unitario: 0,
            porcentaje_recargo: 0,
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().required('Requerido'),
            descripcion: Yup.string().required('Requerido'),
            cantidad: Yup.number().required('Requerido').min(1, 'Debe ser mayor a 0'),
            precio_unitario: Yup.string().required('Requerido'),
        }),
        onSubmit: async (values) => {
            setIsSubmitting(true);
            try {
                const response = await ApiService.fetchData({
                    url: `/api/cotizaciones/${id_cotizacion}/items/${id_item}/`,
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(values),
                });
                if (response.data) {
                    toast.success('Item actualizado', { autoClose: 1000 });
                    setIsOpen(false);
                    dispatch(listaItemsEnCotizacionThunk({ id_cotizacion: id_cotizacion }));
                    formikDetalle.resetForm();
                }
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.detail || error.message || 'Error al actualizar el item';
                toast.error(errorMessage, {
                    toastId: 'Error al actualizar el item de la cotizacion',
                });
            } finally {
                setIsSubmitting(false);
            }
        },
    });

    return (
        <>
            <Tooltip text='Editar Gasto'>
                <Button
                    color='violet'
                    variant='solid'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                    icon='HeroEye'
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Editar Item Cotizacion</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='grid grid-cols-2 gap-4'>
                        {isEditing ? (
                            <>
                                <div>
                                    <Badge>Nombre</Badge>
                                    <Validation
                                        isValid={formikDetalle.isValid}
                                        isTouched={formikDetalle.touched.nombre}
                                        invalidFeedback={formikDetalle.errors.nombre}>
                                        <Input
                                            name='nombre'
                                            placeholder='Nombre'
                                            onBlur={formikDetalle.handleBlur}
                                            onChange={formikDetalle.handleChange}
                                            value={formikDetalle.values.nombre}
                                        />
                                    </Validation>
                                </div>
                                <div>
                                    <Badge>Porcentaje de Recargo</Badge>
                                    <Validation
                                        isValid={formikDetalle.isValid}
                                        isTouched={formikDetalle.touched.porcentaje_recargo}
                                        invalidFeedback={formikDetalle.errors.porcentaje_recargo}>
                                        <Input
                                            name='porcentaje_recargo'
                                            type='number'
                                            onBlur={formikDetalle.handleBlur}
                                            onChange={formikDetalle.handleChange}
                                            value={formikDetalle.values.porcentaje_recargo}
                                        />
                                    </Validation>
                                </div>
                                <div>
                                    <Badge>Cantidad</Badge>
                                    <Validation
                                        isValid={formikDetalle.isValid}
                                        isTouched={!!formikDetalle.touched.cantidad}
                                        invalidFeedback={
                                            typeof formikDetalle.errors.cantidad === 'string'
                                                ? formikDetalle.errors.cantidad
                                                : undefined
                                        }>
                                        <Input
                                            name='cantidad'
                                            id='cantidad'
                                            type='number'
                                            onBlur={formikDetalle.handleBlur}
                                            onChange={formikDetalle.handleChange}
                                            value={formikDetalle.values.cantidad}
                                        />
                                    </Validation>
                                </div>
                                <div>
                                    <Badge>Precio Unitario</Badge>
                                    <Validation
                                        isValid={formikDetalle.isValid}
                                        isTouched={!!formikDetalle.touched.precio_unitario}
                                        invalidFeedback={
                                            typeof formikDetalle.errors.precio_unitario === 'string'
                                                ? formikDetalle.errors.precio_unitario
                                                : undefined
                                        }>
                                        <Input
                                            name='precio_unitario'
                                            id='precio_unitario'
                                            type='number'
                                            onBlur={formikDetalle.handleBlur}
                                            onChange={formikDetalle.handleChange}
                                            value={formikDetalle.values.precio_unitario}
                                        />
                                    </Validation>
                                </div>
                                <div className='col-span-full'>
                                    <Badge>Descripcion</Badge>
                                    <Validation
                                        isValid={formikDetalle.isValid}
                                        isTouched={formikDetalle.touched.descripcion}
                                        invalidFeedback={formikDetalle.errors.descripcion}>
                                        <Input
                                            name='descripcion'
                                            id='descripcion'
                                            type='text'
                                            placeholder='Descripción'
                                            onBlur={formikDetalle.handleBlur}
                                            onChange={formikDetalle.handleChange}
                                            value={formikDetalle.values.descripcion}
                                        />
                                    </Validation>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className='w-full'>
                                    <Badge>Nombre</Badge>
                                    <div className='ml-4'>{valuess.nombre}</div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Porcentaje de Recargo</Badge>
                                    <div className='ml-4'>{valuess.porcentaje_recargo}</div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Cantidad</Badge>
                                    <div className='ml-4'>{valuess.cantidad}</div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Precio Unitario</Badge>
                                    <div className='ml-4'>{valuess.precio_unitario}</div>
                                </div>
                                <div className='col-span-full'>
                                    <Badge>Descripcion</Badge>
                                    <div className='ml-4'>
                                        {valuess.descripcion || 'Sin Descripción'}
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Precio Total</Badge>
                                    <div className='ml-4'>{valuess.costo_total}</div>
                                </div>
                            </>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        {isEditing ? (
                            <>
                                <Button
                                    color='red'
                                    onClick={() => {
                                        setIsEditing(false);
                                        formikDetalle.resetForm();
                                    }}>
                                    Cancelar
                                </Button>
                                <Button
                                    variant='solid'
                                    isDisable={isSubmitting}
                                    onClick={() => {
                                        formikDetalle.handleSubmit();
                                    }}>
                                    {isSubmitting ? 'Guardando...' : 'Guardar'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    color='red'
                                    onClick={() => {
                                        setIsOpen(false);
                                    }}>
                                    Cerrar
                                </Button>
                                {detalleCotizacion &&
                                    detalleCotizacion.es_vigente &&
                                    (detalleCotizacion.estado === 'pendiente' ||
                                        detalleCotizacion.estado === 'rechazada') && (
                                        <Button
                                            variant='solid'
                                            onClick={() => {
                                                setIsEditing(true);
                                            }}>
                                            Modificar
                                        </Button>
                                    )}
                            </>
                        )}
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
};

export default ModalDetallItem;
