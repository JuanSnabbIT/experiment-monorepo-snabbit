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
import { ITomaInventario } from '@/interface/bodega.interface';
import ApiService from '@/services/ApiService';
import { detalleTomaInventarioThunk, useAppDispatch, usuarioEmpresaLogeadoThunk } from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function CerrarTomaInventario({ toma }: { toma: ITomaInventario }) {
    const dispatch = useAppDispatch();
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            fecha_cambio: '',
            observaciones: '',
        },
        validationSchema: Yup.object().shape({
            fecha_cambio: Yup.string().required('Requerido').nonNullable('Requerido'),
            observaciones: Yup.string().notRequired().nullable(),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/tomas-inventario/${toma.id}/cerrar/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(values),
                });
                if (response.data) {
                    toast.success('Toma de inventario cerrada', { autoClose: 1000 });
                    setIsOpen(false);
                    dispatch(detalleTomaInventarioThunk({ id_toma: toma.id }));
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(' ');
                toast.error(mensajesError || 'Error al cerrar el inventariado', {
                    toastId: 'Error al cerrar el inventariado',
                });
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
            <Tooltip text='Cerrar Inventario'>
                <Button
                    variant='solid'
                    color='red'
                    icon='DuoArchive'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Cerrar Toma de Inventario</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Fecha de Cambio</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.fecha_cambio}
                                invalidFeedback={formik.errors.fecha_cambio}>
                                <Input
                                    type='datetime-local'
                                    name='fecha_cambio'
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.fecha_cambio}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Observaciones</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.observaciones}
                                invalidFeedback={formik.errors.observaciones}>
                                <Textarea
                                    name='observaciones'
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.observaciones}
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
                            color='red'
                            onClick={async () => {
                                formik.handleSubmit();
                            }}>
                            Cerrar Inventario
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CerrarTomaInventario;
