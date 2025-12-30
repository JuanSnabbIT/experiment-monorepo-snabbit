import Input from "@/components/form/Input";
import Textarea from "@/components/form/Textarea";
import Validation from "@/components/form/Validation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal";
import Tooltip from "@/components/ui/Tooltip";
import { IDetalleOrdenDeTrabajo } from "@/interface/ordenTrabajo.interface";
import ApiService from "@/services/ApiService";
import { listaDetalleTrabajoOTThunk, useAppDispatch, useAppSelector, usuarioEmpresaLogeadoThunk } from "@/store";
import { useFormik } from "formik";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as Yup from "yup";

function CrearComprasEnOT({ detalleTrabajo }: { detalleTrabajo: IDetalleOrdenDeTrabajo }) {
    const dispatch = useAppDispatch();
    const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa);
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo);
    const { personalizacionUsuario, userMe } = useAppSelector((state) => state.auth);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen && !usuarioEmpresaLogeado) {
            dispatch(usuarioEmpresaLogeadoThunk({ id_usuario: userMe?.pk }));
        }
        if (!isOpen) {
            formik.resetForm();
        }
    }, [isOpen, usuarioEmpresaLogeado, userMe, dispatch]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            observaciones: "",
            fecha_compra: new Date().toISOString().split("T")[0],
        },
        validationSchema: Yup.object().shape({
            observaciones: Yup.string().nonNullable("Requerido").required("Requerido"),
            fecha_compra: Yup.date().required("Requerido"),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${detalleTrabajo.id}/crear-compra/`,
                    method: "post",
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify({
                        observaciones: values.observaciones,
                        fecha_compra: values.fecha_compra,
                        sucursal: personalizacionUsuario?.sucursal_principal,
                        creado_por: usuarioEmpresaLogeado?.id,
                    }),
                });
                if (response.data) {
                    dispatch(listaDetalleTrabajoOTThunk({ id_orden: detalleOrdenTrabajo?.id }));
                    setIsOpen(false);
                    toast.success("Compra creada", { autoClose: 1000 });
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear la compra", {
                    toastId: "Error al crear la compra",
                });
            }
        },
    });

    return (
        <>
            <Tooltip text="Agregar Compra">
                <Button
                    variant="solid"
                    color="lime"
                    icon="HeroCurrencyDollar"
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Agregar Compra</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div>
                            <Badge>Descripcion</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.observaciones}
                                invalidFeedback={formik.errors.observaciones}>
                                <Textarea
                                    name="observaciones"
                                    onChange={formik.handleChange}
                                    value={formik.values.observaciones}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Fecha de compra</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.fecha_compra}
                                invalidFeedback={formik.errors.fecha_compra as string}>
                                <Input
                                    name="fecha_compra"
                                    type="date"
                                    value={formik.values.fecha_compra}
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
                        <Button color="red" onClick={() => { setIsOpen(false); }}>Cerrar</Button>
                        <Button variant="solid" onClick={() => { formik.handleSubmit(); }}>Agregar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearComprasEnOT;
