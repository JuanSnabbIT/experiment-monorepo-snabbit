import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import Input from "@/components/form/Input";
import SelectReact, { TSelectOption } from "@/components/form/SelectReact";
import Validation from "@/components/form/Validation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardFooter, CardFooterChild, CardHeader, CardHeaderChild } from "@/components/ui/Card";
import { TIPO_ALMACENAMIENTO } from "@/constants/recursos.constant";
import ApiService from "@/services/ApiService";
import { useAppDispatch, useAppSelector } from "@/store";
import { detalleEquipoEmpresaThunk } from "@/store/slices/recursos/recursosSlice";
import Textarea from "@/components/form/Textarea";
import Checkbox from "@/components/form/Checkbox";
import { useState } from 'react';


const AlmacenamientosEnDetalleEquipo = () => {
    const dispatch = useAppDispatch();
    const { detalleEquipoEmpresa } = useAppSelector((state) => state.recursos)
    const [isEditing, setIsEditing] = useState<boolean>(false)

    const formikAlmacenamiento = useFormik({
        enableReinitialize: true,
        initialValues: {
            almacenamiento: "",
            fecha_instalacion: "",
            adicional: false,
            observaciones: "",
        },
        validationSchema: Yup.object().shape({
            almacenamiento: Yup.string().required("Requerido").nonNullable("Requerido"),
            fecha_instalacion: Yup.string().notRequired().nullable(),
            adicional: Yup.boolean().required("Requerido").nonNullable("Requerido"),
            observaciones: Yup.string().notRequired().nullable(),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/almacenamientos-equipo/`,
                    method: "post",
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        ...values,
                        equipo: detalleEquipoEmpresa?.id
                    })
                });
                if (response.data) {
                    toast.success("Almacenamiento creado", { autoClose: 1000 });
                    dispatch(detalleEquipoEmpresaThunk({ id_equipo: detalleEquipoEmpresa?.id }));
                    formikAlmacenamiento.resetForm();
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error al crear el almacenamiento", { toastId: "Error al crear el almacenamiento" });
            }
        }
    });

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className="text-xl">Almacenamientos</Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
                {detalleEquipoEmpresa && detalleEquipoEmpresa.datos_almacenamiento.length > 0 ? detalleEquipoEmpresa.datos_almacenamiento.map((almacenamiento, index) => (
                    <div key={index} className="border border-blue-500 rounded-xl">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
                            <div>
                                <Badge>Tipo</Badge>
                                <div className="ml-4">{almacenamiento.almacenamiento_label}</div>
                            </div>
                            <div>
                                <Badge>Fecha de Instalación</Badge>
                                <div className="ml-4">{dayjs(almacenamiento.fecha_instalacion).format("DD/MM/YYYY")}</div>
                            </div>
                            <div>
                                <Badge>Adicional</Badge>
                                <div className="ml-4">{almacenamiento.adicional ? "Si" : "No"}</div>
                            </div>
                            <div>
                                <Badge>Observaciones</Badge>
                                <div className="ml-4">{almacenamiento.observaciones || "Sin Observaciones"}</div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className='text-center'>Sin Almacenamientos</div>
                )}
                {isEditing && (
                    <div className="col-span-full gap-4 grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        <div className="col-span-full">
                            <Badge className="text-xl">Crear Almacenamiento</Badge>
                        </div>
                        <div>
                            <Badge>Tipo</Badge>
                            <Validation
                                isValid={formikAlmacenamiento.isValid}
                                isTouched={formikAlmacenamiento.touched.almacenamiento}
                                invalidFeedback={formikAlmacenamiento.errors.almacenamiento}
                            >
                                <SelectReact
                                    name="almacenamiento"
                                    onBlur={formikAlmacenamiento.handleBlur}
                                    options={TIPO_ALMACENAMIENTO}
                                    value={TIPO_ALMACENAMIENTO.find(alm => alm.value === formikAlmacenamiento.values.almacenamiento)}
                                    onChange={(e) => { formikAlmacenamiento.setFieldValue("almacenamiento", (e as TSelectOption).value) }}
                                    noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                    placeholder="Seleccione un Almacenamiento"
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Fecha de Instalación</Badge>
                            <Validation
                                isValid={formikAlmacenamiento.isValid}
                                isTouched={formikAlmacenamiento.touched.fecha_instalacion}
                                invalidFeedback={formikAlmacenamiento.errors.fecha_instalacion}
                            >
                                <Input
                                    name="fecha_instalacion"
                                    type="date"
                                    value={formikAlmacenamiento.values.fecha_instalacion}
                                    onBlur={formikAlmacenamiento.handleBlur}
                                    onChange={formikAlmacenamiento.handleChange}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Adicional</Badge>
                            <div className="ml-4">
                                <Validation
                                    isValid={formikAlmacenamiento.isValid}
                                    isTouched={formikAlmacenamiento.touched.adicional}
                                    invalidFeedback={formikAlmacenamiento.errors.adicional}
                                >
                                    <Checkbox
                                        name="adicional"
                                        onBlur={formikAlmacenamiento.handleBlur}
                                        label={formikAlmacenamiento.values.adicional ? "Si" : "No"}
                                        onChange={(e) => { formikAlmacenamiento.setFieldValue("adicional", e.target.checked) }}
                                        checked={formikAlmacenamiento.values.adicional}
                                    />
                                </Validation>
                            </div>
                        </div>
                        <div>
                            <Badge>Observaciones</Badge>
                            <Validation
                                isValid={formikAlmacenamiento.isValid}
                                isTouched={formikAlmacenamiento.touched.observaciones}
                                invalidFeedback={formikAlmacenamiento.errors.observaciones}
                            >
                                <Textarea
                                    name="observaciones"
                                    onChange={formikAlmacenamiento.handleChange}
                                    onBlur={formikAlmacenamiento.handleBlur}
                                    value={formikAlmacenamiento.values.observaciones}
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
                            <Button variant='solid' icon='HeroXMark' color='red' onClick={() => {setIsEditing(false); formikAlmacenamiento.resetForm()}}></Button>
                            <Button variant="solid" icon='DuoSave' onClick={() => {formikAlmacenamiento.handleSubmit()}}></Button>
                        </>
                    ) : (
                        <Button variant='solid' onClick={() => {setIsEditing(true)}}>Crear Almacenamiento</Button>
                    )}
                </CardFooterChild>
            </CardFooter>
        </Card>
    );
};

export default AlmacenamientosEnDetalleEquipo;
