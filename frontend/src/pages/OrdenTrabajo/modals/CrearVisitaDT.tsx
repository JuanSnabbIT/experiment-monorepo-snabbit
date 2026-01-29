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
import { IVisitaSoporte } from '@/interface/visitas.interface';
import ApiService from '@/services/ApiService';
import {
    listaContentTypeThunk,
    listaDetalleTrabajoOTThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

function CrearVisitaDT({ id_detalle }: { id_detalle: string | number | undefined }) {
    const dispatch = useAppDispatch();
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo);
    const { listaContentType } = useAppSelector((state) => state.core);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        if (listaContentType.length === 0) {
            dispatch(listaContentTypeThunk());
        }
    }, [listaContentType]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            descripcion_servicio: '',
        },
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData<IVisitaSoporte, string>({
                    url: `/api/visitas-soporte/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        descripcion_servicio: values.descripcion_servicio,
                        empresa: detalleOrdenTrabajo?.empresa,
                        cliente: detalleOrdenTrabajo?.cliente,
                    }),
                });
                if (response.data) {
                    const responseTrabajo = await ApiService.fetchData({
                        url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${id_detalle}/asociar-trabajo/`,
                        method: 'post',
                        headers: { 'Content-Type': 'application/json' },
                        data: JSON.stringify({
                            content_type: listaContentType.find(
                                (ct) => ct.model === 'visitasoporte',
                            )?.id,
                            trabajo_id: response.data.id,
                        }),
                    });
                    if (responseTrabajo) {
                        toast.success('Visita creada', { autoClose: 1000 });
                        setIsOpen(false);
                        dispatch(listaDetalleTrabajoOTThunk({ id_orden: detalleOrdenTrabajo?.id }));
                    }
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(' ');
                toast.error(mensajesError || 'Error al crear la visita', {
                    toastId: 'Error al crear la visita',
                });
            }
        },
    });

    return (
        <>
            <Tooltip text='Crear Visita'>
                <Button
                    variant='solid'
                    icon='HeroPlus'
                    color='amber'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Visita</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Descripción del Servicio</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.descripcion_servicio}
                                invalidFeedback={formik.errors.descripcion_servicio}>
                                <Textarea
                                    name='descripcion_servicio'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.descripcion_servicio}
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
                            Crear
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearVisitaDT;
