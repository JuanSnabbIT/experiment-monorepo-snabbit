import { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import Input from "@/components/form/Input";
import Validation from "@/components/form/Validation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardFooter, CardFooterChild, CardHeader, CardHeaderChild } from "@/components/ui/Card";
import ApiService from "@/services/ApiService";
import { useAppDispatch, useAppSelector } from "@/store";
import { detalleEquipoEmpresaThunk } from "@/store/slices/recursos/recursosSlice";
import Textarea from "@/components/form/Textarea";


const MonitoresEnDetalleEquipo = () => {
    const dispatch = useAppDispatch();
    const { detalleEquipoEmpresa } = useAppSelector((state) => state.recursos);
    const [isEditing, setIsEditing] = useState<boolean>(false)

    const formikMonitor = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: "",
            modelo: "",
            numero_serie: "",
            accesorios: "",
            observaciones: "",
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().max(100, "Maximo 100 Caracteres").required("Requerido").nonNullable("Requerido"),
            modelo: Yup.string().max(100, "Maximo 100 Caracteres").notRequired().nullable(),
            numero_serie: Yup.string().max(100, "Maximo 100 Caracteres").notRequired().nullable(),
            accesorios: Yup.string().notRequired().nonNullable("Requerido"),
            observaciones: Yup.string().notRequired().nonNullable("Requerido")
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/monitores-equipo/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        ...values,
                        equipo: detalleEquipoEmpresa?.id
                    })
                });
                if (response.data) {
                    toast.success("Monitor creado", { autoClose: 1000 });
                    dispatch(detalleEquipoEmpresaThunk({ id_equipo: detalleEquipoEmpresa?.id }));
                    formikMonitor.resetForm();
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear el monitor", { toastId: "Error al crear el monitor" });
            }
        }
    });

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className="text-xl">Monitores</Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
                {detalleEquipoEmpresa && detalleEquipoEmpresa.datos_monitor.length > 0 ? detalleEquipoEmpresa.datos_monitor.map((monitor, index) => (
                    <div className="border border-blue-500 rounded-xl" key={index}>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
                            <div>
                                <Badge>Nombre</Badge>
                                <div className="ml-4">{monitor.nombre || "Sin Nombre"}</div>
                            </div>
                            <div>
                                <Badge>Modelo</Badge>
                                <div className="ml-4">{monitor.modelo || "Sin Modelo"}</div>
                            </div>
                            <div>
                                <Badge>Numero de Serie</Badge>
                                <div className="ml-4">{monitor.numero_serie || "Sin Numero de Serie"}</div>
                            </div>
                            <div>
                                <Badge>Accesorios</Badge>
                                <div className="ml-4">{monitor.accesorios || "Sin Accesorios"}</div>
                            </div>
                            <div>
                                <Badge>Observaciones</Badge>
                                <div className="ml-4">{monitor.observaciones || "Sin Observaciones"}</div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className='text-center'>Sin Monitores</div>
                )}
                {isEditing && (
                    <div className="col-span-full gap-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        <div className="col-span-full">
                            <Badge className="text-xl">Crear Monitor</Badge>
                        </div>
                        <div>
                            <Badge>Nombre</Badge>
                            <Validation
                                isValid={formikMonitor.isValid}
                                isTouched={formikMonitor.touched.nombre}
                                invalidFeedback={formikMonitor.errors.nombre}
                            >
                                <Input
                                    name="nombre"
                                    onBlur={formikMonitor.handleBlur}
                                    onChange={formikMonitor.handleChange}
                                    value={formikMonitor.values.nombre}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Modelo</Badge>
                            <Validation
                                isValid={formikMonitor.isValid}
                                isTouched={formikMonitor.touched.modelo}
                                invalidFeedback={formikMonitor.errors.modelo}
                            >
                                <Input
                                    name="modelo"
                                    onBlur={formikMonitor.handleBlur}
                                    onChange={formikMonitor.handleChange}
                                    value={formikMonitor.values.modelo}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Numero de Serie</Badge>
                            <Validation
                                isValid={formikMonitor.isValid}
                                isTouched={formikMonitor.touched.numero_serie}
                                invalidFeedback={formikMonitor.errors.numero_serie}
                            >
                                <Input
                                    name="numero_serie"
                                    onBlur={formikMonitor.handleBlur}
                                    onChange={formikMonitor.handleChange}
                                    value={formikMonitor.values.numero_serie}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Accesorios</Badge>
                            <Validation
                                isValid={formikMonitor.isValid}
                                isTouched={formikMonitor.touched.accesorios}
                                invalidFeedback={formikMonitor.errors.accesorios}
                            >
                                <Input
                                    name="accesorios"
                                    onBlur={formikMonitor.handleBlur}
                                    onChange={formikMonitor.handleChange}
                                    value={formikMonitor.values.accesorios}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Observaciones</Badge>
                            <Validation
                                isValid={formikMonitor.isValid}
                                isTouched={formikMonitor.touched.observaciones}
                                invalidFeedback={formikMonitor.errors.observaciones}
                            >
                                <Textarea
                                    name="observaciones"
                                    onBlur={formikMonitor.handleBlur}
                                    onChange={formikMonitor.handleChange}
                                    value={formikMonitor.values.observaciones}
                                />
                            </Validation>
                        </div>
                    </div>
                )}
            </CardBody>
            <CardFooter>
                <CardFooterChild></CardFooterChild>
                <CardFooterChild>
                    {isEditing ? (
                        <>
                            <Button variant='solid' icon='HeroXMark' color='red' onClick={() => {setIsEditing(false); formikMonitor.resetForm()}}></Button>
                            <Button variant="solid" icon='DuoSave' onClick={() => {formikMonitor.handleSubmit()}}></Button>
                        </>
                    ) : (
                        <Button variant='solid' onClick={() => {setIsEditing(true)}}>Crear Monitores</Button>
                    )}
                </CardFooterChild>
            </CardFooter>
        </Card>
    );
};

export default MonitoresEnDetalleEquipo;
