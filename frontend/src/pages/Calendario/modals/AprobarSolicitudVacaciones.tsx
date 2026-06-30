import Radio, { RadioGroup } from '@/components/form/Radio';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import Badge from '@/components/ui/Badge';
import { useAppSelector } from '@/store';
import { useActualizarSolicitudVacacionesMutation } from '@/store/slices/vacaciones/vacacionesApi';
import { useFormik } from 'formik';
import { useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import { getErrorMessage } from '@/utils/errorHandlers';

function AprobarSolicitudVacaciones({ id_solicitud }: { id_solicitud: number }) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { userMe } = useAppSelector((state) => state.auth);
    const [actualizarSolicitud] = useActualizarSolicitudVacacionesMutation();

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            aprobado_rechazado_por: userMe?.pk,
            estado: '',
        },
        validationSchema: Yup.object({
            estado: Yup.string()
                .oneOf(['2', '3'], 'Selecciona una opción')
                .required('Selecciona una opción'),
        }),
        onSubmit: async (values) => {
            try {
                await actualizarSolicitud({ id: id_solicitud, data: values }).unwrap();
                toast.success(
                    values.estado === '2' ? 'Solicitud Aprobada' : 'Solicitud Rechazada',
                    { autoClose: 1000 },
                );
                setIsOpen(false);
                formik.resetForm();
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    return (
        <>
            <Tooltip text='Aprobar / Rechazar'>
                <Button
                    variant='solid'
                    onClick={() => setIsOpen(true)}
                    icon='HeroCheckCircle'
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>Resolver solicitud de vacaciones</ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <p>Esta acción no se puede deshacer.</p>
                    </div>
                    <div className='w-full'>
                        <Badge className='text-lg'>¿Aprobar o Rechazar?</Badge>
                        <RadioGroup isInline>
                            <Radio
                                name='estado'
                                value={'2'}
                                label='Aprobado'
                                selectedValue={formik.values.estado}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                            <Radio
                                name='estado'
                                value={'3'}
                                label='Rechazado'
                                selectedValue={formik.values.estado}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </RadioGroup>
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
                            isDisable={!formik.values.estado}
                            onClick={async () => formik.handleSubmit()}>
                            Guardar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default AprobarSolicitudVacaciones;
