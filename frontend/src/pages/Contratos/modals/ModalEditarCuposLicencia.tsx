import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import { IContratoLicencia } from '@/interface/contrato.interface';
import { useUpdateCantidadContratoLicenciaMutation } from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import { buildLicenciaNotification } from '../licenciaNotification';

interface IModalEditarCuposLicenciaProps {
    isOpen: boolean;
    onClose: () => void;
    licencia: IContratoLicencia;
}

function ModalEditarCuposLicencia({
    isOpen,
    onClose,
    licencia,
}: IModalEditarCuposLicenciaProps) {
    const [updateCantidad, { isLoading }] = useUpdateCantidadContratoLicenciaMutation();

    const usados = licencia.cantidad - licencia.licencias_disponibles;
    const minimoPermitido = licencia.se_puede_reducir ? Math.max(usados, 1) : licencia.cantidad;
    const puedeEditar = licencia.se_puede_aumentar || licencia.se_puede_reducir;
    const notificacion = buildLicenciaNotification(licencia);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            cantidad: licencia.cantidad,
        },
        validationSchema: Yup.object({
            cantidad: Yup.number()
                .typeError('Debe ingresar un número válido')
                .required('Requerido')
                .integer('Debe ser un número entero')
                .min(minimoPermitido, `El mínimo permitido es ${minimoPermitido}`),
        }),
        onSubmit: async (values) => {
            try {
                await updateCantidad({
                    id: licencia.id,
                    cantidad: Number(values.cantidad),
                }).unwrap();
                toast.success('Cupos actualizados', { autoClose: 1200 });
                onClose();
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    const handleClose = () => {
        formik.resetForm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={handleClose}>
            <ModalHeader>Editar cupos</ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    <div className='grid grid-cols-3 gap-3 text-sm'>
                        <div>
                            <div className='text-zinc-500'>Usados</div>
                            <div className='font-medium'>{usados}</div>
                        </div>
                        <div>
                            <div className='text-zinc-500'>Totales</div>
                            <div className='font-medium'>{licencia.cantidad}</div>
                        </div>
                        <div>
                            <div className='text-zinc-500'>Disponibles</div>
                            <div className='font-medium'>{licencia.licencias_disponibles}</div>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor='cantidad'>Cantidad de cupos</Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.cantidad}
                            invalidFeedback={formik.errors.cantidad}>
                            <Input
                                name='cantidad'
                                type='number'
                                min={minimoPermitido}
                                value={formik.values.cantidad}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                disabled={!puedeEditar}
                            />
                        </Validation>
                        <div className='mt-2 flex items-center gap-2 text-sm text-zinc-500'>
                            <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                    notificacion.color === 'emerald'
                                        ? 'bg-emerald-500'
                                        : notificacion.color === 'red'
                                          ? 'bg-red-500'
                                          : 'bg-amber-500'
                                }`}
                            />
                            <span>{notificacion.recordatorio}</span>
                            {licencia.se_puede_reducir && licencia.fecha_fin_edicion && (
                                <span className='text-zinc-400'>
                                    ({dayjs(licencia.fecha_fin_edicion).format('DD/MM/YYYY')})
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Button color='red' onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        onClick={() => formik.handleSubmit()}
                        isDisable={!puedeEditar || isLoading || !formik.isValid}
                        isLoading={isLoading}>
                        Guardar
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default ModalEditarCuposLicencia;
