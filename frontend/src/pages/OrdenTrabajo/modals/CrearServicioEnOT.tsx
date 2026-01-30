import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
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
import { useAppSelector } from '@/store';
import {
    useCrearServicioGeneralMutation,
    useGetDetalleOrdenTrabajoQuery,
    useGetTecnicosPorEmpresaQuery,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { useFormik } from 'formik';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import { getErrorMessage } from '@/utils/errorHandlers';

const formatDateForInput = (value?: string | null) => {
    if (!value) {
        return '';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }
    return parsed.toISOString().slice(0, 10);
};

function CrearServicioEnOT() {
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    const { data: detalleOrdenTrabajo } = useGetDetalleOrdenTrabajoQuery(ordenId ?? 0, {
        skip: !ordenId,
    });
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { data: listaTecnicos = [] } = useGetTecnicosPorEmpresaQuery(
        personalizacionUsuario?.empresa ?? 0,
        { skip: !personalizacionUsuario?.empresa || !isOpen },
    );
    const [crearServicio] = useCrearServicioGeneralMutation();

    const initialFormValues = useMemo(() => {
        const tecnico = detalleOrdenTrabajo?.tecnico_responsable_ot;
        return {
            nombre: '',
            descripcion: '',
            tecnico_asignado: tecnico ? String(tecnico) : '',
            fecha_servicio: formatDateForInput(detalleOrdenTrabajo?.fecha_inicio_ot),
        };
    }, [detalleOrdenTrabajo?.tecnico_responsable_ot, detalleOrdenTrabajo?.fecha_inicio_ot]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: initialFormValues,
        validationSchema: Yup.object().shape({
            nombre: Yup.string()
                .required('Requerido')
                .nonNullable('Requerido')
                .max(100, 'Maximo 100 Caracteres'),
            descripcion: Yup.string().required('Requerido').nonNullable('Requerido'),
            tecnico_asignado: Yup.string().nullable().notRequired(),
            fecha_servicio: Yup.string().nullable().notRequired(),
        }),
        onSubmit: async (values) => {
            try {
                if (!ordenId) return;
                const data: any = {
                    nombre: values.nombre,
                    orden: ordenId,
                    descripcion: values.descripcion,
                };
                if (values.tecnico_asignado) {
                    data.tecnico_asignado = values.tecnico_asignado;
                }
                if (values.fecha_servicio) {
                    data.fecha_servicio = values.fecha_servicio;
                }
                await crearServicio({ ordenId, data }).unwrap();
                toast.success('Servicio creado', { autoClose: 1000 });
                formik.resetForm();
                setIsOpen(false);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error) || 'Error al crear el servicio en OT', {
                    toastId: 'Error crear servicio OT',
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
            <Tooltip text='Crear Servicio'>
                <Button
                    variant='solid'
                    icon='HeroPlus'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Servicio</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Nombre *</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.nombre}
                                invalidFeedback={formik.errors.nombre}>
                                <Input
                                    name='nombre'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.nombre}
                                />
                            </Validation>
                            <div className='text-xs'>
                                Caracteres restantes: {100 - formik.values.nombre.length}
                            </div>
                        </div>
                        <div>
                            <Badge>Descripción *</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.descripcion}
                                invalidFeedback={formik.errors.descripcion}>
                                <Textarea
                                    name='descripcion'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.descripcion}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Técnico Asignado</Badge>
                            {listaTecnicos && listaTecnicos.length > 0 && (
                                <SelectReact
                                    name='tecnico_asignado'
                                    noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                    placeholder='Seleccione un Técnico'
                                    isClearable
                                    options={listaTecnicos.map((user: any) => ({
                                        value: String(user.id),
                                        label: user.nombre_usuario,
                                    }))}
                                    onChange={(e) => {
                                        formik.setFieldValue(
                                            'tecnico_asignado',
                                            e ? (e as TSelectOption).value : '',
                                        );
                                    }}
                                    onBlur={formik.handleBlur}
                                    value={
                                        formik.values.tecnico_asignado
                                            ? {
                                                  value: formik.values.tecnico_asignado,
                                                  label:
                                                      listaTecnicos.find(
                                                          (us: any) =>
                                                              String(us.id) ===
                                                              formik.values.tecnico_asignado,
                                                      )?.nombre_usuario ||
                                                      detalleOrdenTrabajo?.nombre_responsable ||
                                                      'Responsable',
                                              }
                                            : null
                                    }
                                />
                            )}
                        </div>
                        <div>
                            <Badge>Fecha de Servicio</Badge>
                            <Input
                                name='fecha_servicio'
                                type='date'
                                onBlur={formik.handleBlur}
                                onChange={formik.handleChange}
                                value={formik.values.fecha_servicio}
                            />
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

export default CrearServicioEnOT;
