import FieldWrap from '@/components/form/FieldWrap';
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
import { IItemEnOrdenCompra, IItemOrdenCompraEnStock } from '@/interface/bodega.interface';
import ApiService from '@/services/ApiService';
import { useAppDispatch, useAppSelector } from '@/store';
import { ordenCompraApi } from '@/store/slices/bodega/ordenCompraApi';
import { FormikErrors, useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface InputItem {
    value: string;
}

interface FormValues {
    inputs: InputItem[];
    bodega: string;
    cantidad: number;
}

function EditarItemOrdenStock({
    item_orden,
    item_stock,
    id_orden,
}: {
    item_orden: IItemEnOrdenCompra;
    item_stock: IItemOrdenCompraEnStock | undefined;
    id_orden: string | number | undefined;
}) {
    const dispatch = useAppDispatch();
    const { listaBodegasPorEmpresa } = useAppSelector((state) => state.bodega);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [optionsBodega, setOptionsBodega] = useState<{ value: string; label: string }[]>([]);
    const bodegaStockId = item_stock?.bodega_stock_id ? item_stock.bodega_stock_id.toString() : '';
    const bodegaBloqueada = Boolean(bodegaStockId);

    const validationSchema = Yup.object({
        inputs: Yup.array()
            .of(
                Yup.object({
                    value: Yup.string()
                        .matches(/^\S*$/, 'El valor no puede contener espacios') // Sin espacios
                        .required('Este campo es obligatorio'),
                }),
            )
            .notRequired(),
        bodega: Yup.string().notRequired(),
        cantidad: Yup.number()
            .required('Requerido')
            .nonNullable('Requerido')
            .max(item_orden.cantidad, 'No puede superar la cantidad original')
            .min(0, 'No puede ser menor a 0'),
    });

    const formik = useFormik<FormValues>({
        enableReinitialize: true,
        initialValues: {
            inputs:
                item_stock &&
                item_stock.numeros_serie.numeros_serie &&
                item_stock.numeros_serie.numeros_serie.length > 0
                    ? item_stock.numeros_serie.numeros_serie.map((itm) => {
                          return { value: itm.serie };
                      })
                    : [],
            bodega: bodegaStockId || item_stock?.bodega_temporal?.toString() || '',
            cantidad: item_stock?.cantidad || 0,
        },
        validationSchema,
        onSubmit: async (values) => {
            setIsSubmitting(true);
            try {
                const response = await ApiService.fetchData({
                    url: `/api/ordenes-compra/${id_orden}/items-orden-compra-en-stock/${item_stock?.id}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        bodega_temporal: values.bodega,
                        numeros_serie: {
                            numeros_serie: values.inputs.map((val) => ({
                                serie: val.value,
                                modelo: '',
                                object_id: 0,
                            })),
                        },
                        cantidad: values.cantidad,
                    }),
                });
                if (response.data) {
                    toast.success('Item editado', { autoClose: 1000 });
                    setIsOpen(false);
                    formik.resetForm();
                    dispatch(
                        ordenCompraApi.util.invalidateTags([
                            { type: 'OrdenCompraItemsStock', id: id_orden },
                        ]),
                    );
                }
            } catch (error: any) {
                const errorMessage =
                    error.response?.data?.detail ||
                    error.response?.data ||
                    error.message ||
                    'Error al editar el item';
                toast.error(
                    typeof errorMessage === 'string' ? errorMessage : 'Error al editar el item',
                    {
                        toastId: 'error-editar-item-stock',
                    },
                );
            } finally {
                setIsSubmitting(false);
            }
        },
    });

    useEffect(() => {
        if (listaBodegasPorEmpresa.length > 0) {
            setOptionsBodega(
                listaBodegasPorEmpresa.map((bodega) => {
                    return { value: bodega.id.toString(), label: bodega.nombre };
                }),
            );
        }
    }, [listaBodegasPorEmpresa]);

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
        }
    }, [isOpen]);

    return (
        <>
            <Tooltip text='Editar Item'>
                <Button
                    variant='solid'
                    onClick={() => {
                        setIsOpen(true);
                    }}>
                    Editar
                </Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Editar Item</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='grid w-full grid-cols-1 gap-4 md:grid-cols-2'>
                        <div className='w-full'>
                            <Badge>N° de Series</Badge>
                            <div className='flex flex-col gap-2'>
                                {formik.values.inputs.map((input, index) => (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={
                                            formik.touched.inputs &&
                                            formik.touched.inputs[index] &&
                                            formik.touched.inputs[index].value
                                        }
                                        invalidFeedback={
                                            formik.errors.inputs &&
                                            Array.isArray(formik.errors.inputs) &&
                                            formik.errors.inputs[index] &&
                                            typeof formik.errors.inputs[index] === 'object' &&
                                            // @ts-ignore
                                            'value' in formik.errors.inputs[index]
                                                ? (
                                                      formik.errors.inputs[
                                                          index
                                                      ] as FormikErrors<InputItem>
                                                  ).value
                                                : ''
                                        }
                                        key={index}>
                                        <FieldWrap
                                            lastSuffix={
                                                <Button
                                                    color='red'
                                                    variant='solid'
                                                    size='sm'
                                                    icon='HeroTrash'
                                                    onClick={() => {
                                                        const updatedInputs =
                                                            formik.values.inputs.filter(
                                                                (_, i) => i !== index,
                                                            );
                                                        formik.setFieldValue(
                                                            'inputs',
                                                            updatedInputs,
                                                        );
                                                    }}></Button>
                                            }>
                                            <Input
                                                type='text'
                                                name={`inputs[${index}].value`}
                                                value={input.value}
                                                onChange={formik.handleChange}
                                                onBlur={formik.handleBlur}
                                                placeholder={`Input ${index + 1}`}
                                            />
                                        </FieldWrap>
                                    </Validation>
                                ))}
                            </div>
                            <Button
                                className='mt-2'
                                variant='solid'
                                onClick={() => {
                                    formik.setFieldValue('inputs', [
                                        ...formik.values.inputs,
                                        { value: '' },
                                    ]);
                                }}>
                                Añadir N° de Serie
                            </Button>
                        </div>
                        <div className='w-full'>
                            <Badge>Bodega</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.bodega}
                                invalidFeedback={formik.errors.bodega}>
                                <SelectReact
                                    name='bodega'
                                    placeholder='Selecciona una Bodega'
                                    noOptionsMessage={(e) => `No existe la bodega ${e.inputValue}`}
                                    options={optionsBodega}
                                    onBlur={formik.handleBlur}
                                    onChange={(e) => {
                                        formik.setFieldValue('bodega', (e as TSelectOption).value);
                                    }}
                                    value={{
                                        value: formik.values.bodega,
                                        label:
                                            optionsBodega.find(
                                                (bode) => bode.value === formik.values.bodega,
                                            )?.label || '',
                                    }}
                                    disabled={bodegaBloqueada}
                                />
                            </Validation>
                            {bodegaBloqueada && (
                                <div className='mt-2 text-xs text-zinc-500'>
                                    La bodega ya esta definida por stock existente.
                                </div>
                            )}
                        </div>
                        <div className='w-full'>
                            <Badge>Cantidad Esperada</Badge>
                            <div className='ml-4'>{item_orden.cantidad}</div>
                        </div>
                        <div className='w-full'>
                            <Badge>Cantidad Recibida</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cantidad}
                                invalidFeedback={formik.errors.cantidad}>
                                <Input
                                    name='cantidad'
                                    type='number'
                                    value={formik.values.cantidad}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
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
                            isDisable={isSubmitting}
                            onClick={() => {
                                formik.handleSubmit();
                            }}>
                            {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default EditarItemOrdenStock;
