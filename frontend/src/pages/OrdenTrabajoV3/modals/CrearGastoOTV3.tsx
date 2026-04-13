import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { useCreateGastoV3Mutation } from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { useGetCategoriasGastoQuery } from '@/store/slices/rendiciones/rendicionApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IProps {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
    ordenId: number;
}

const validationSchema = Yup.object({
    detalle: Yup.string().required('El detalle es requerido'),
    cantidad: Yup.number().min(1, 'Minimo 1').required('La cantidad es requerida'),
    monto_unitario: Yup.number().min(0, 'Debe ser positivo').required('El monto es requerido'),
});

const CrearGastoOTV3 = ({ isOpen, setIsOpen, ordenId }: IProps) => {
    const [createGasto, { isLoading }] = useCreateGastoV3Mutation();
    const { data: categorias = [] } = useGetCategoriasGastoQuery();

    const categoriasOptions: TSelectOption[] = categorias.map((c) => ({
        value: String(c.id),
        label: c.nombre,
    }));

    const formik = useFormik({
        initialValues: {
            categoria: null as number | null,
            detalle: '',
            cantidad: 1,
            monto_unitario: 0,
        },
        validationSchema,
        onSubmit: async (values, { resetForm }) => {
            try {
                await createGasto({
                    ordenId,
                    categoria: values.categoria || undefined,
                    detalle: values.detalle,
                    cantidad: values.cantidad,
                    monto_unitario: values.monto_unitario,
                }).unwrap();
                toast.success('Gasto registrado');
                resetForm();
                setIsOpen(false);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    const handleClose = () => {
        formik.resetForm();
        setIsOpen(false);
    };

    const montoTotal = formik.values.cantidad * formik.values.monto_unitario;

    return (
        <Modal isOpen={isOpen} setIsOpen={handleClose}>
            <ModalHeader>Registrar Gasto</ModalHeader>
            <form onSubmit={formik.handleSubmit}>
                <ModalBody className='grid grid-cols-1 gap-4'>
                    {/* Categoria */}
                    <div>
                        <Label htmlFor='categoria' className='mb-1'>
                            Categoria
                        </Label>
                        <SelectReact
                            id='categoria'
                            name='categoria'
                            options={categoriasOptions}
                            isClearable
                            value={
                                categoriasOptions.find((o) => Number(o.value) === formik.values.categoria) ??
                                null
                            }
                            onChange={(opt) =>
                                formik.setFieldValue(
                                    'categoria',
                                    opt ? Number((opt as TSelectOption).value) : null,
                                )
                            }
                        />
                    </div>

                    {/* Detalle */}
                    <div>
                        <Label htmlFor='detalle' className='mb-1'>
                            Detalle <span className='text-red-500'>*</span>
                        </Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.detalle}
                            invalidFeedback={formik.errors.detalle}>
                            <Input
                                id='detalle'
                                name='detalle'
                                value={formik.values.detalle}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                placeholder='Ej: Cable UTP cat 6'
                            />
                        </Validation>
                    </div>

                    {/* Cantidad y monto */}
                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <Label htmlFor='cantidad' className='mb-1'>
                                Cantidad <span className='text-red-500'>*</span>
                            </Label>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cantidad}
                                invalidFeedback={formik.errors.cantidad}>
                                <Input
                                    id='cantidad'
                                    name='cantidad'
                                    type='number'
                                    min={1}
                                    value={formik.values.cantidad}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Label htmlFor='monto_unitario' className='mb-1'>
                                Monto unitario (CLP) <span className='text-red-500'>*</span>
                            </Label>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.monto_unitario}
                                invalidFeedback={formik.errors.monto_unitario}>
                                <Input
                                    id='monto_unitario'
                                    name='monto_unitario'
                                    type='number'
                                    min={0}
                                    value={formik.values.monto_unitario}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                    </div>

                    {/* Total calculado */}
                    <div className='rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'>
                        Total calculado:{' '}
                        <span className='font-bold'>
                            $ {montoTotal.toLocaleString('es-CL')} CLP
                        </span>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={handleClose} isDisable={isLoading}>
                        Cancelar
                    </Button>
                    <Button variant='solid' isLoading={isLoading} onClick={() => { void formik.submitForm(); }}>
                        Registrar Gasto
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};

export default CrearGastoOTV3;
