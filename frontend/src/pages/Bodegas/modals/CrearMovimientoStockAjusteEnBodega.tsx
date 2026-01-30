import Input from '@/components/form/Input';
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
import { IStockItemEnBodega } from '@/interface/bodega.interface';
import ApiService from '@/services/ApiService';
import { listaStockItemsEnBodegaThunk, useAppDispatch, useAppSelector } from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function CrearMovimientoStockAjusteEnBodega({ item_stock }: { item_stock: IStockItemEnBodega }) {
    const dispatch = useAppDispatch();
    const { detalleBodega } = useAppSelector((state) => state.bodega);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen) {
            formik.setValues({
                cantidad: item_stock.cantidad,
                descripcion: '',
            });
        } else {
            formik.resetForm();
        }
    }, [isOpen]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            cantidad: 0,
            descripcion: '',
        },
        validationSchema: Yup.object().shape({
            cantidad: Yup.number()
                .required('Requerido')
                .nonNullable('Requerido')
                .min(-1, 'Minimo 0'),
            descripcion: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/movimientos-stock/crear-ajuste/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        ...values,
                        stock_item: item_stock.id,
                    }),
                });
                if (response.data) {
                    toast.success('Ajuste manual exitoso', { autoClose: 1000 });
                    dispatch(listaStockItemsEnBodegaThunk({ id_bodega: detalleBodega?.id }));
                    setIsOpen(false);
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data)
                    .flat() // Aplana los arrays en caso de que haya más de uno
                    .join(' '); // Une los mensajes en una sola cadena
                toast.error(mensajesError, { toastId: 'Error al hacer un ajuste manual al stock' });
            }
        },
    });

    return (
        <>
            <Tooltip text='Hacer Ajuste Manual'>
                <Button
                    variant='solid'
                    icon='HeroArrowPath'
                    color='zinc'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Hacer Ajuste Manual</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Cantidad</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cantidad}
                                invalidFeedback={formik.errors.cantidad}>
                                <Input
                                    name='cantidad'
                                    type='number'
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.cantidad}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Descripción</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.descripcion}
                                invalidFeedback={formik.errors.descripcion}>
                                <Textarea
                                    name='descripcion'
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.descripcion}
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
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={() => {
                                formik.handleSubmit();
                            }}>
                            Guardar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearMovimientoStockAjusteEnBodega;
