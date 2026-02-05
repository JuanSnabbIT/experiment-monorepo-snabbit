import Input from '@/components/form/Input';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import ApiService from '@/services/ApiService';
import { useAppSelector } from '@/store';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface CrearProspectoModalProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    nombreSugerido?: string;
    onProspectoCreado: (prospecto: {
        id: string;
        nombre: string;
        usuario_id: string;
        usuario_nombre: string;
    }) => void;
}

function CrearProspectoModal({
    isOpen,
    setIsOpen,
    nombreSugerido,
    onProspectoCreado,
}: CrearProspectoModalProps) {
    const [isCreating, setIsCreating] = useState(false);
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre_empresa: nombreSugerido || '',
            direccion_empresa: '',
            email_empresa: '',
            telefono_empresa: '',
            email_contacto: '',
            nombre_contacto: '',
            apellido_contacto: '',
            telefono_contacto: '',
        },
        validationSchema: Yup.object().shape({
            // Datos de la empresa (prospecto)
            nombre_empresa: Yup.string().required('El nombre de la empresa es requerido'),
            direccion_empresa: Yup.string().required('La dirección es requerida'),
            email_empresa: Yup.string().email('Email inválido').notRequired().nullable(),
            telefono_empresa: Yup.string().notRequired().nullable(),

            // Datos del contacto (usuario que se creará)
            email_contacto: Yup.string()
                .email('Email inválido')
                .required('El email del contacto es requerido'),
            nombre_contacto: Yup.string().required('El nombre del contacto es requerido'),
            apellido_contacto: Yup.string().required('El apellido del contacto es requerido'),
            telefono_contacto: Yup.string().notRequired().nullable(),
        }),
        onSubmit: async (values) => {
            setIsCreating(true);

            try {
                // 1) Crear Empresa (cliente) mínima
                // El signal crear_casa_matriz crea automáticamente una sucursal "Casa Matriz"
                const empresaResp = await ApiService.fetchData<{
                    id: number;
                    nombre: string;
                    sucursales?: Array<{ id: number; nombre: string }>;
                }>({
                    url: `/api/empresas/`,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: {
                        nombre: values.nombre_empresa,
                        direccion_principal: values.direccion_empresa,
                        telefono: values.telefono_empresa || '',
                        email: values.email_empresa || '',
                    },
                });

                const empresaId = empresaResp.data.id;

                // 2) Crear relación prestador_servicios -> cliente para que aparezca en "mis clientes"
                await ApiService.fetchData({
                    url: `/api/relaciones-empresa/`,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: {
                        prestador_servicios: personalizacionUsuario?.empresa,
                        cliente: empresaId,
                    },
                });

                // 3) Obtener la sucursal Casa Matriz creada automáticamente por el signal
                const sucursalesResp = await ApiService.fetchData<
                    Array<{ id: number; nombre: string }>
                >({
                    url: `/api/empresas/${empresaId}/sucursales-empresa/`,
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });

                const casaMatriz =
                    sucursalesResp.data.find((s) => s.nombre === 'Casa Matriz') ||
                    sucursalesResp.data[0];
                if (!casaMatriz) {
                    throw new Error('No se encontró la sucursal principal de la empresa creada.');
                }

                const sucursalId = casaMatriz.id;

                // 4) Invitar contacto principal: crea User inactivo + UsuarioEmpresa asociado a la sucursal
                const usuarioNombre =
                    `${values.nombre_contacto} ${values.apellido_contacto}`.trim();
                await ApiService.fetchData({
                    url: `/api/invitaciones-empresa/`,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: {
                        email: values.email_contacto,
                        first_name: values.nombre_contacto,
                        last_name: values.apellido_contacto,
                        sucursal: sucursalId,
                    },
                });

                // 5) Recuperar los usuarios de la sucursal Casa Matriz (incluye el recién creado)
                const usuariosSucursalResp = await ApiService.fetchData<
                    Array<{ id: number; nombre_usuario?: string; email_usuario?: string }>
                >({
                    url: `/api/empresas/${empresaId}/sucursales-empresa/${sucursalId}/usuarios/`,
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });

                const creado = usuariosSucursalResp.data.find(
                    (u: any) =>
                        u.email_usuario?.toLowerCase() === values.email_contacto.toLowerCase(),
                );

                if (!creado) {
                    // Si no encontramos el usuario, usar el primer usuario de la sucursal como fallback
                    const primerUsuario = usuariosSucursalResp.data[0];
                    if (!primerUsuario) {
                        throw new Error('No se pudo recuperar el contacto creado.');
                    }

                    const prospecto = {
                        id: String(empresaId),
                        nombre: empresaResp.data.nombre,
                        usuario_id: String(primerUsuario.id),
                        usuario_nombre: primerUsuario.nombre_usuario || usuarioNombre,
                    };
                    onProspectoCreado(prospecto);
                    formik.resetForm();
                    setIsOpen(false);
                    toast.success(`Prospecto "${prospecto.nombre}" creado.`, { autoClose: 2500 });
                    return;
                }

                // 6) Devolver datos al padre
                const prospecto = {
                    id: String(empresaId),
                    nombre: empresaResp.data.nombre,
                    usuario_id: String(creado.id),
                    usuario_nombre: creado.nombre_usuario || usuarioNombre,
                };

                onProspectoCreado(prospecto);
                formik.resetForm();
                setIsOpen(false);
                toast.success(`Prospecto "${prospecto.nombre}" creado.`, { autoClose: 2500 });
            } catch (error: any) {
                const errorMsg = error.response?.data?.detail || 'Error al crear el prospecto';
                toast.error(errorMsg, { autoClose: 4000 });
            } finally {
                setIsCreating(false);
            }
        },
    });

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true} size='lg'>
            <ModalHeader>
                <Badge className='text-xl'>Crear Nuevo Prospecto</Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    {/* Sección Empresa */}
                    <div className='border-b pb-3'>
                        <h3 className='mb-3 text-lg font-semibold text-gray-800 dark:text-gray-100'>
                            Datos de la Empresa
                        </h3>

                        <div className='space-y-3'>
                            <div>
                                <Badge>Nombre de la Empresa *</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.nombre_empresa}
                                    invalidFeedback={formik.errors.nombre_empresa}>
                                    <Input
                                        name='nombre_empresa'
                                        id='nombre_empresa'
                                        placeholder='Ej: ACME Corporation'
                                        onBlur={formik.handleBlur}
                                        onChange={formik.handleChange}
                                        value={formik.values.nombre_empresa}
                                    />
                                </Validation>
                            </div>

                            <div>
                                <Badge>Dirección *</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.direccion_empresa}
                                    invalidFeedback={formik.errors.direccion_empresa}>
                                    <Input
                                        name='direccion_empresa'
                                        id='direccion_empresa'
                                        placeholder='Ej: Av. Principal 123, Santiago'
                                        onBlur={formik.handleBlur}
                                        onChange={formik.handleChange}
                                        value={formik.values.direccion_empresa}
                                    />
                                </Validation>
                            </div>

                            <div>
                                <Badge>Teléfono Empresa (opcional)</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.telefono_empresa}
                                    invalidFeedback={formik.errors.telefono_empresa}>
                                    <Input
                                        name='telefono_empresa'
                                        id='telefono_empresa'
                                        placeholder='Ej: +56912345678'
                                        onBlur={formik.handleBlur}
                                        onChange={formik.handleChange}
                                        value={formik.values.telefono_empresa}
                                    />
                                </Validation>
                            </div>
                        </div>
                    </div>

                    {/* Sección Contacto */}
                    <div>
                        <h3 className='mb-2 text-lg font-semibold text-gray-800 dark:text-gray-100'>
                            Datos del Contacto Principal
                        </h3>
                        <p className='mb-3 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300'>
                            Este contacto será el solicitante de la orden de trabajo
                        </p>

                        <div className='space-y-3'>
                            <div className='grid grid-cols-2 gap-3'>
                                <div>
                                    <Badge>Nombre *</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.nombre_contacto}
                                        invalidFeedback={formik.errors.nombre_contacto}>
                                        <Input
                                            name='nombre_contacto'
                                            id='nombre_contacto'
                                            placeholder='Ej: Juan'
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                            value={formik.values.nombre_contacto}
                                        />
                                    </Validation>
                                </div>

                                <div>
                                    <Badge>Apellido *</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.apellido_contacto}
                                        invalidFeedback={formik.errors.apellido_contacto}>
                                        <Input
                                            name='apellido_contacto'
                                            id='apellido_contacto'
                                            placeholder='Ej: Pérez'
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                            value={formik.values.apellido_contacto}
                                        />
                                    </Validation>
                                </div>
                            </div>

                            <div>
                                <Badge>Email *</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.email_contacto}
                                    invalidFeedback={formik.errors.email_contacto}>
                                    <Input
                                        name='email_contacto'
                                        id='email_contacto'
                                        type='email'
                                        placeholder='Ej: juan.perez@acme.com'
                                        onBlur={formik.handleBlur}
                                        onChange={formik.handleChange}
                                        value={formik.values.email_contacto}
                                    />
                                </Validation>
                                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-300'>
                                    Se enviará un correo de invitación a esta dirección
                                </p>
                            </div>

                            <div>
                                <Badge>Teléfono (opcional)</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.telefono_contacto}
                                    invalidFeedback={formik.errors.telefono_contacto}>
                                    <Input
                                        name='telefono_contacto'
                                        id='telefono_contacto'
                                        placeholder='Ej: +56987654321'
                                        onBlur={formik.handleBlur}
                                        onChange={formik.handleChange}
                                        value={formik.values.telefono_contacto}
                                    />
                                </Validation>
                            </div>
                        </div>
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
                            formik.resetForm();
                        }}
                        isDisable={isCreating}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        onClick={() => formik.handleSubmit()}
                        isDisable={isCreating}>
                        {isCreating ? 'Creando...' : 'Crear Prospecto'}
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default CrearProspectoModal;
