import { Dispatch, SetStateAction, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Textarea from "@/components/form/Textarea";
import Validation from "@/components/form/Validation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal";
import ApiService from "@/services/ApiService";
import { useAppDispatch, useAppSelector, listaDetalleTrabajoOTThunk, usuarioEmpresaLogeadoThunk } from "@/store";
import { toast } from "react-toastify";
import SelectReact from '@/components/form/SelectReact';
import { TIPO_SEGUIMIENTO } from '@/constants/ordentrabajo.constant';


function CrearSeguimientoDT({detalleSeleccionado, isOpen, setIsOpen, setDetalleSeleccionado} : {detalleSeleccionado: number | null, isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>>, setDetalleSeleccionado: Dispatch<SetStateAction<number | null>>}) {
    const dispatch = useAppDispatch();
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo);
    const { userMe } = useAppSelector((state) => state.auth);
    const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa);

    useEffect(() => {
        if (!usuarioEmpresaLogeado && userMe) {
            dispatch(usuarioEmpresaLogeadoThunk({id_usuario: userMe.pk}))
        }
    }, [usuarioEmpresaLogeado, userMe])

    const formik = useFormik({
        initialValues: {
            tipo_seguimiento: 'comentario',
            comentario: '',
        },
        validationSchema: Yup.object().shape({
            comentario: Yup.string().required("Requerido").nonNullable("Requerido"),
        }),
        onSubmit: async (values) => {
            try {
                const seguimientoResponse = await ApiService.fetchData({
                    url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${detalleSeleccionado}/seguimientos/`,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: {
                        detalle_trabajo: detalleSeleccionado,
                        usuario: usuarioEmpresaLogeado?.id,
                        tipo: values.tipo_seguimiento,
                        comentario: values.comentario,
                    },
                });
                if (seguimientoResponse.data) {
                    toast.success('Seguimiento creado exitosamente');
                    dispatch(listaDetalleTrabajoOTThunk({id_orden: detalleOrdenTrabajo?.id}));
                    setIsOpen(false)
                } else {
                    toast.error('Error al crear el seguimiento', {toastId: 'Error al crear el seguimiento'});
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(" ");
                toast.error(mensajesError || 'Error al crear el seguimiento', {toastId: 'Error al crear el seguimiento'})
            }
        },
    });

    useEffect(() => {
        if (!isOpen) {
            setDetalleSeleccionado(null)
            formik.resetForm()
        }
    }, [isOpen])

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
            <ModalHeader>
                <Badge className="text-xl">Crear Seguimiento</Badge>
            </ModalHeader>
            <ModalBody>
                <div className="flex flex-col gap-4">
                    <div>
                        <Badge>Tipo de Seguimiento</Badge>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.tipo_seguimiento}
                            invalidFeedback={formik.errors.tipo_seguimiento}
                        >
                            <SelectReact
                                name="tipo_seguimiento"
                                options={TIPO_SEGUIMIENTO}
                                value={TIPO_SEGUIMIENTO.find(option => option.value === formik.values.tipo_seguimiento)}
                                onChange={(option: any) => formik.setFieldValue('tipo_seguimiento', option.value)}
                                onBlur={formik.handleBlur}
                                className="form-select"
                            />
                        </Validation>
                    </div>
                    <div>
                        <Badge>Comentario del Seguimiento</Badge>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.comentario}
                            invalidFeedback={formik.errors.comentario}
                        >
                            <Textarea
                                name="comentario"
                                value={formik.values.comentario}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                            />
                        </Validation>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                    <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Guardar</Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

    export default CrearSeguimientoDT;
