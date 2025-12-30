import Input from "@/components/form/Input";
import Textarea from "@/components/form/Textarea";
import Validation from "@/components/form/Validation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal";
import Tooltip from "@/components/ui/Tooltip";
import ApiService from "@/services/ApiService";
import { listaComprasThunk, useAppDispatch, useAppSelector } from "@/store";
import { useFormik } from "formik";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as Yup from "yup";

function CrearCompra() {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa);
    const [isOpen, setIsOpen] = useState<boolean>(false);

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
                    url: `/api/compras/`,
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
                    toast.success("Compra creada", { autoClose: 1000 });
                    setIsOpen(false);
                    dispatch(listaComprasThunk());
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear la compra", {
                    toastId: "Error al crear la compra",
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
            <Tooltip text="Crear Compra">
                <Button
                    variant="solid"
                    icon="HeroPlus"
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Compra</Badge>
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
                        <Button color="red" onClick={() => { setIsOpen(false); }}>Cancelar</Button>
                        <Button variant="solid" onClick={() => { formik.handleSubmit(); }}>Guardar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearCompra;
