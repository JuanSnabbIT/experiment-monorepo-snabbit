import { Dispatch, SetStateAction } from 'react';
import { useFormik } from 'formik';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import { useGetUsuariosEmpresaQuery } from '@/store/slices/empresa/empresaApi';
import { useCrearSolicitudVacacionesMutation } from '@/store/slices/vacaciones/vacacionesApi';
import { useAppSelector } from '@/store';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

interface IModalCrearVacacionesConFechasProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    fechaInicio: string;
    fechaFin: string;
}

function ModalCrearVacacionesConFechas({
    isOpen,
    setIsOpen,
    fechaInicio,
    fechaFin,
}: IModalCrearVacacionesConFechasProps) {
    const { userMe } = useAppSelector((state) => state.auth);
    const { data: usuariosEmpresa = [] } = useGetUsuariosEmpresaQuery();
    const [crearSolicitud, { isLoading }] = useCrearSolicitudVacacionesMutation();

    const opcionesEmpleado: TSelectOption[] = usuariosEmpresa.map((u) => ({
        value: String(u.id),
        label: u.nombre_usuario ?? `Usuario ${u.id}`,
    }));

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            usuario_empresa: '',
            comentario: '',
        },
        validate: (values) => {
            const errors: Record<string, string> = {};
            if (!values.usuario_empresa) errors.usuario_empresa = 'Selecciona un empleado';
            return errors;
        },
        onSubmit: async (values, { resetForm }) => {
            try {
                await crearSolicitud({
                    usuario_empresa: values.usuario_empresa,
                    fecha_inicio: fechaInicio,
                    fecha_fin: dayjs(fechaFin).subtract(1, 'day').format('YYYY-MM-DD'),
                    es_extraordinaria: false,
                    comentario: values.comentario,
                    creado_por: userMe?.pk,
                }).unwrap();
                toast.success('Solicitud de vacaciones creada', { autoClose: 1500 });
                resetForm();
                setIsOpen(false);
            } catch (err: any) {
                const msg =
                    err?.data?.non_field_errors?.[0] ??
                    err?.data?.detail ??
                    'Error al crear la solicitud';
                toast.error(msg);
            }
        },
    });

    const handleClose = () => {
        formik.resetForm();
        setIsOpen(false);
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={handleClose} size='sm'>
            <ModalHeader>
                <Badge className='text-lg'>Nueva Solicitud de Vacaciones</Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    <div className='grid grid-cols-2 gap-3'>
                        <div>
                            <Badge>Fecha Inicio</Badge>
                            <p className='ml-2 mt-1 text-sm'>
                                {dayjs(fechaInicio).format('DD/MM/YYYY')}
                            </p>
                        </div>
                        <div>
                            <Badge>Fecha Fin</Badge>
                            <p className='ml-2 mt-1 text-sm'>
                                {dayjs(fechaFin).subtract(1, 'day').format('DD/MM/YYYY')}
                            </p>
                        </div>
                    </div>
                    <div>
                        <Badge>Empleado</Badge>
                        <SelectReact
                            name='usuario_empresa'
                            options={opcionesEmpleado}
                            value={
                                opcionesEmpleado.find(
                                    (o) => o.value === formik.values.usuario_empresa,
                                ) ?? null
                            }
                            onChange={(opt) =>
                                formik.setFieldValue(
                                    'usuario_empresa',
                                    (opt as TSelectOption)?.value ?? '',
                                )
                            }
                            placeholder='Seleccionar empleado...'
                            noOptionsMessage={() => 'Sin empleados'}
                        />
                        {formik.touched.usuario_empresa && formik.errors.usuario_empresa && (
                            <p className='mt-1 text-xs text-red-500'>
                                {formik.errors.usuario_empresa}
                            </p>
                        )}
                    </div>
                    <div>
                        <Badge>Comentario</Badge>
                        <Textarea
                            name='comentario'
                            value={formik.values.comentario}
                            onChange={formik.handleChange}
                            placeholder='Opcional...'
                            rows={3}
                        />
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
                        color='blue'
                        isLoading={isLoading}
                        onClick={() => formik.handleSubmit()}>
                        Crear Solicitud
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default ModalCrearVacacionesConFechas;
