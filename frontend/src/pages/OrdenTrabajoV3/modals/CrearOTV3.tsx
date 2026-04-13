import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import type { IUsuarioEmpresa } from '@/interface/empresas.interface';
import type { IOrdenDeTrabajoV3Write } from '@/interface/ordenTrabajoV3.interface';
import { useAppSelector } from '@/store';
import { useGetMisClientesQuery, useGetUsuariosTodoElClienteQuery } from '@/store/slices/empresa/empresaApi';
import { useCreateOrdenV3Mutation } from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IProps {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
}

const TIPO_SERVICIO_OPTIONS: TSelectOption[] = [
    { value: 'soporte_tecnico_presencial', label: 'Soporte Técnico Presencial' },
    { value: 'soporte_tecnico_remoto', label: 'Soporte Técnico Remoto' },
    { value: 'servicios_generales', label: 'Servicios Generales' },
];

const PRIORIDAD_OPTIONS: TSelectOption[] = [
    { value: 'baja', label: 'Baja' },
    { value: 'normal', label: 'Normal' },
    { value: 'alta', label: 'Alta' },
    { value: 'critica', label: 'Crítica' },
];

const validationSchema = Yup.object({
    titulo: Yup.string().required('El titulo es requerido'),
    tipo_servicio: Yup.string().required('El tipo de servicio es requerido'),
    cliente: Yup.number().required('El cliente es requerido').min(1, 'Seleccione un cliente'),
    prioridad: Yup.string().required('La prioridad es requerida'),
});

const CrearOTV3 = ({ isOpen, setIsOpen }: IProps) => {
    const navigate = useNavigate();
    const [createOrden, { isLoading }] = useCreateOrdenV3Mutation();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const empresaId = personalizacionUsuario?.empresa ?? undefined;

    const { data: relacionesClientes = [] } = useGetMisClientesQuery(empresaId, {
        skip: !empresaId,
    });

    const clientesOptions: TSelectOption[] = relacionesClientes.map((r) => ({
        value: String(r.cliente),
        label: r.info_cliente.nombre,
    }));

    const formik = useFormik({
        initialValues: {
            titulo: '',
            descripcion: '',
            tipo_servicio: 'soporte_tecnico_presencial',
            cliente: 0,
            cliente_solicitante: 0,
            prioridad: 'normal',
            fecha_programada: '',
            fecha_fin_estimada: '',
        },
        validationSchema,
        onSubmit: async (values, { resetForm }) => {
            try {
                const payload: IOrdenDeTrabajoV3Write = {
                    titulo: values.titulo,
                    tipo_servicio: values.tipo_servicio as IOrdenDeTrabajoV3Write['tipo_servicio'],
                    cliente: values.cliente,
                    prioridad: values.prioridad as IOrdenDeTrabajoV3Write['prioridad'],
                    ...(values.cliente_solicitante ? { cliente_solicitante: values.cliente_solicitante } : {}),
                    ...(values.descripcion ? { descripcion: values.descripcion } : {}),
                    ...(values.fecha_programada ? { fecha_programada: values.fecha_programada } : {}),
                    ...(values.fecha_fin_estimada ? { fecha_fin_estimada: values.fecha_fin_estimada } : {}),                };
                const created = await createOrden(payload).unwrap();
                toast.success('Orden de trabajo creada');
                resetForm();
                setIsOpen(false);
                navigate(`/orden-trabajo-v3/${created.id}`);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    const clienteSeleccionado = formik.values.cliente || 0;
    const { data: usuariosCliente = [] } = useGetUsuariosTodoElClienteQuery(clienteSeleccionado, {
        skip: !clienteSeleccionado,
    });
    const solicitantesOptions: TSelectOption[] = usuariosCliente.map((u: IUsuarioEmpresa) => ({
        value: String(u.id),
        label: u.nombre_usuario || u.email_usuario,
    }));

    const handleClose = () => {
        formik.resetForm();
        setIsOpen(false);
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={handleClose} size='lg'>
            <ModalHeader>Nueva Orden de Trabajo V3</ModalHeader>
            <form onSubmit={formik.handleSubmit}>
                <ModalBody className='grid grid-cols-1 gap-4'>
                    {/* Titulo */}
                    <div>
                        <Label htmlFor='titulo' className='mb-1'>
                            Título <span className='text-red-500'>*</span>
                        </Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.titulo}
                            invalidFeedback={formik.errors.titulo}>
                            <Input
                                id='titulo'
                                name='titulo'
                                value={formik.values.titulo}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                placeholder='Ej: Soporte técnico servidor principal'
                            />
                        </Validation>
                    </div>

                    {/* Tipo de servicio */}
                    <div>
                        <Label htmlFor='tipo_servicio' className='mb-1'>
                            Tipo de servicio <span className='text-red-500'>*</span>
                        </Label>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.tipo_servicio}
                            invalidFeedback={formik.errors.tipo_servicio}>
                            <SelectReact
                                id='tipo_servicio'
                                name='tipo_servicio'
                                options={TIPO_SERVICIO_OPTIONS}
                                value={
                                    TIPO_SERVICIO_OPTIONS.find(
                                        (o) => o.value === formik.values.tipo_servicio,
                                    ) ?? null
                                }
                                onChange={(opt) =>
                                    formik.setFieldValue(
                                        'tipo_servicio',
                                        (opt as TSelectOption).value,
                                    )
                                }
                            />
                        </Validation>
                    </div>

                    {/* Cliente + Solicitante */}
                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <Label htmlFor='cliente' className='mb-1'>
                                Cliente <span className='text-red-500'>*</span>
                            </Label>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cliente}
                                invalidFeedback={formik.errors.cliente}>
                                <SelectReact
                                    id='cliente'
                                    name='cliente'
                                    options={clientesOptions}
                                    placeholder='Seleccionar cliente...'
                                    value={
                                        clientesOptions.find(
                                            (o) => Number(o.value) === formik.values.cliente,
                                        ) ?? null
                                    }
                                    onChange={(opt) =>
                                        formik.setFieldValue(
                                            'cliente',
                                            opt ? Number((opt as TSelectOption).value) : 0,
                                        )
                                    }
                                />
                            </Validation>
                        </div>
                        <div>
                            <Label htmlFor='cliente_solicitante' className='mb-1'>
                                Solicitante
                                <span className='ml-1 text-xs font-normal text-gray-400'>(opcional)</span>
                            </Label>
                            <SelectReact
                                id='cliente_solicitante'
                                name='cliente_solicitante'
                                options={solicitantesOptions}
                                isClearable
                                isDisabled={clienteSeleccionado === 0}
                                placeholder={clienteSeleccionado === 0 ? 'Seleccione cliente primero' : 'Seleccionar solicitante...'}
                                value={
                                    solicitantesOptions.find(
                                        (o) => Number(o.value) === formik.values.cliente_solicitante,
                                    ) ?? null
                                }
                                onChange={(opt) =>
                                    formik.setFieldValue(
                                        'cliente_solicitante',
                                        opt ? Number((opt as TSelectOption).value) : 0,
                                    )
                                }
                            />
                        </div>
                    </div>

                    {/* Prioridad */}
                    <div>
                        <Label htmlFor='prioridad' className='mb-1'>
                            Prioridad <span className='text-red-500'>*</span>
                        </Label>
                        <SelectReact
                            id='prioridad'
                            name='prioridad'
                            options={PRIORIDAD_OPTIONS}
                            value={
                                PRIORIDAD_OPTIONS.find(
                                    (o) => o.value === formik.values.prioridad,
                                ) ?? null
                            }
                            onChange={(opt) =>
                                formik.setFieldValue('prioridad', (opt as TSelectOption).value)
                            }
                        />
                    </div>

                    {/* Fecha inicio + Fecha fin estimada */}
                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <Label htmlFor='fecha_programada' className='mb-1'>
                                Fecha inicio
                            </Label>
                            <Input
                                id='fecha_programada'
                                name='fecha_programada'
                                type='date'
                                value={formik.values.fecha_programada}
                                onChange={formik.handleChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor='fecha_fin_estimada' className='mb-1'>
                                Fecha fin estimada
                            </Label>
                            <Input
                                id='fecha_fin_estimada'
                                name='fecha_fin_estimada'
                                type='date'
                                value={formik.values.fecha_fin_estimada}
                                onChange={formik.handleChange}
                            />
                        </div>
                    </div>

                    {/* Descripcion */}
                    <div>
                        <Label htmlFor='descripcion' className='mb-1'>
                            Descripción
                        </Label>
                        <Textarea
                            id='descripcion'
                            name='descripcion'
                            value={formik.values.descripcion}
                            onChange={formik.handleChange}
                            rows={3}
                            placeholder='Descripción del trabajo a realizar...'
                        />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={handleClose} isDisable={isLoading}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        isLoading={isLoading}
                        onClick={() => {
                            void formik.submitForm();
                        }}>
                        Crear OT
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};

export default CrearOTV3;
