import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
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
import ApiService from '@/services/ApiService';
import {
    listaCategoriasGastoThunk,
    listaDetalleGastoRendicionOTThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function CrearRendicionesOT() {
    const dispatch = useAppDispatch();
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo);
    const { listaCategoriasGasto } = useAppSelector((state) => state.rendicion);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen) {
            dispatch(listaCategoriasGastoThunk());
        }
    }, [isOpen]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            categoria: '',
            detalle: '',
            cantidad: 0,
            monto_unitario: 0,
            fecha_gasto: '',
        },
        validationSchema: Yup.object().shape({
            categoria: Yup.string().required('Requerido').nonNullable('Requerido'),
            detalle: Yup.string()
                .required('Requerido')
                .nonNullable('Requerido')
                .max(255, 'Maximo 255 caracteres'),
            cantidad: Yup.number()
                .required('Requerido')
                .nonNullable('Requerido')
                .min(1, 'Minimo 1 de cantidad'),
            monto_unitario: Yup.number()
                .required('Requerido')
                .nonNullable('Requerido')
                .min(1, 'Minimo 1 de monto unitario'),
            fecha_gasto: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const fechaIso =
                    values.fecha_gasto && values.fecha_gasto.length > 0
                        ? new Date(values.fecha_gasto).toISOString()
                        : '';
                const payload = {
                    ...values,
                    fecha_gasto: fechaIso,
                    fecha_compra: fechaIso,
                    orden: detalleOrdenTrabajo?.id,
                };
                const response = await ApiService.fetchData({
                    url: `/api/ordenes-de-trabajo/${detalleOrdenTrabajo?.id}/gastos-operativos/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(payload),
                });
                if (response.data) {
                    toast.success('Gasto Operativo creado', { autoClose: 1000 });
                    formik.resetForm();
                    setIsOpen(false);
                    dispatch(
                        listaDetalleGastoRendicionOTThunk({ id_orden: detalleOrdenTrabajo?.id }),
                    );
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(' ');
                toast.error(mensajesError || 'Error al crear el detalle gasto de la rendicion', {
                    toastId: 'Error al crear el detalle gasto de la rendicion',
                });
            }
        },
    });

    return (
        <>
            <Tooltip text='Gastos Operativos'>
                <Button
                    variant='solid'
                    icon='HeroPlus'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Gasto Operativo</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='grid grid-cols-2 gap-4'>
                        <div className='col-span-full'>
                            <Badge>Detalle</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.detalle}
                                invalidFeedback={formik.errors.detalle}>
                                <Input
                                    name='detalle'
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.detalle}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Categoria</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.categoria}
                                invalidFeedback={formik.errors.categoria}>
                                <SelectReact
                                    name='categoria'
                                    noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                    placeholder='Seleccione una categoria'
                                    options={listaCategoriasGasto.map((cat) => ({
                                        value: cat.id.toString(),
                                        label: cat.nombre,
                                    }))}
                                    onChange={(e) => {
                                        if (e) {
                                            formik.setFieldValue(
                                                'categoria',
                                                (e as TSelectOption).value,
                                            );
                                        } else {
                                            formik.setFieldValue('categoria', '');
                                        }
                                    }}
                                    value={{
                                        value: formik.values.categoria,
                                        label:
                                            listaCategoriasGasto.find(
                                                (cat) =>
                                                    cat.id.toString() === formik.values.categoria,
                                            )?.nombre || '',
                                    }}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Fecha del Gasto</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.fecha_gasto}
                                invalidFeedback={formik.errors.fecha_gasto}>
                                <Input
                                    name='fecha_gasto'
                                    type='datetime-local'
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.fecha_gasto}
                                />
                            </Validation>
                        </div>
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
                            <Badge>Monto Unitario</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.monto_unitario}
                                invalidFeedback={formik.errors.monto_unitario}>
                                <Input
                                    name='monto_unitario'
                                    type='number'
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.monto_unitario}
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

export default CrearRendicionesOT;
