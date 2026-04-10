import Input from '@/components/form/Input';
import SelectReact from '@/components/form/SelectReact';
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
import { PRIORIDAD, TIPO_SERVICIO } from '@/constants/ordentrabajo.constant';
import CrearProspectoModal from '@/pages/OrdenTrabajo/modals/CrearProspectoModal';
import ApiService from '@/services/ApiService';
import {
    listaMisClientesThunk,
    listaMisProspectosThunk,
    listaUsuariosTodaLaEmpresaThunk,
    listaUsuariosTodoElClienteThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function CrearOrdenOT() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaMisClientes, listaMisProspectos, listaUsuariosTodaLaEmpresa, listaUsuariosTodoElCliente } =
        useAppSelector((state) => state.empresa);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isProspectoModalOpen, setIsProspectoModalOpen] = useState<boolean>(false);
    const [nombreProspectoSugerido, setNombreProspectoSugerido] = useState<string>('');
    const [isCrearContactoOpen, setIsCrearContactoOpen] = useState(false);
    const [contactoNombre, setContactoNombre] = useState('');
    const [contactoApellido, setContactoApellido] = useState('');
    const [contactoEmail, setContactoEmail] = useState('');
    const [creandoContacto, setCreandoContacto] = useState(false);

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa && isOpen) {
            dispatch(listaMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }));
            dispatch(listaMisProspectosThunk({ id_empresa: personalizacionUsuario.empresa }));
            dispatch(
                listaUsuariosTodaLaEmpresaThunk({ id_empresa: personalizacionUsuario.empresa }),
            );
        }
    }, [personalizacionUsuario, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
            setIsCrearContactoOpen(false);
            setContactoNombre('');
            setContactoApellido('');
            setContactoEmail('');
        }
    }, [isOpen]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            descripcion: '',
            cliente: '',
            tipo_servicio: 'general', // Por defecto: Servicios Generales
            fecha_inicio_ot: '',
            fecha_finalizacion_ot: '',
            prioridad: '2', // Prioridad por defecto: Media
            responsable_empresa: '',
            solicitante_empresa: '',
            notas_internas: '',
        },
        validationSchema: Yup.object().shape({
            cliente: Yup.string().required('Requerido').nonNullable('Requerido'),
            descripcion: Yup.string().required('Requerido').nonNullable('Requerido'),
            tipo_servicio: Yup.string().required('Requerido').nonNullable('Requerido'),
            // Fechas opcionales al crear (serán obligatorias al cerrar la OT)
            fecha_inicio_ot: Yup.date()
                .notRequired()
                .nullable()
                .transform((value, originalValue) => {
                    return originalValue === '' ? null : value;
                }),
            fecha_finalizacion_ot: Yup.date()
                .notRequired()
                .nullable()
                .transform((value, originalValue) => {
                    return originalValue === '' ? null : value;
                })
                .when('fecha_inicio_ot', {
                    is: (val: any) => val != null && val !== '',
                    then: (schema) =>
                        schema.min(
                            Yup.ref('fecha_inicio_ot'),
                            'La fecha de fin no puede ser anterior a la fecha de inicio',
                        ),
                    otherwise: (schema) => schema,
                }),
            prioridad: Yup.string().required('Requerido').nonNullable('Requerido'),
            notas_internas: Yup.string().notRequired().nullable(),
            responsable_empresa: Yup.string().notRequired().nullable(),
            solicitante_empresa: Yup.string().notRequired().nullable(),
        }),
        onSubmit: async (values) => {
            try {
                // Filtrar campos vacíos opcionales
                const cleanValues: any = {
                    descripcion: values.descripcion,
                    cliente: values.cliente,
                    tipo_servicio: values.tipo_servicio,
                    prioridad: values.prioridad,
                    empresa: personalizacionUsuario?.empresa,
                };

                // Solo agregar campos opcionales si tienen valor
                if (values.fecha_inicio_ot) cleanValues.fecha_inicio_ot = values.fecha_inicio_ot;
                if (values.fecha_finalizacion_ot)
                    cleanValues.fecha_finalizacion_ot = values.fecha_finalizacion_ot;
                if (values.responsable_empresa)
                    cleanValues.responsable_empresa = values.responsable_empresa;
                if (values.solicitante_empresa)
                    cleanValues.solicitante_empresa = values.solicitante_empresa;
                if (values.notas_internas) cleanValues.notas_internas = values.notas_internas;


                // Mapear campos del frontend al backend
                const backendPayload = {
                    ...cleanValues,
                    cliente_solicitante: cleanValues.solicitante_empresa,
                    tecnico_responsable_ot: cleanValues.responsable_empresa,
                };
                // Eliminar campos con nombres del frontend
                delete backendPayload.solicitante_empresa;
                delete backendPayload.responsable_empresa;


                const response = await ApiService.fetchData({
                    url: '/api/ordenes-de-trabajo/',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: backendPayload,
                });

                if (response.data) {
                    toast.success('Orden de Trabajo Creada', { autoClose: 1000 });
                    const nuevaOtId = (response.data as { id: number }).id;
                    formik.resetForm();
                    setIsOpen(false);
                    // Redirigir al detalle de la OT recién creada
                    navigate(`/orden-trabajo/detalle-orden-trabajo/${nuevaOtId}`);
                } else {
                    toast.error('Error al crear la Orden de Trabajo');
                }
            } catch (error: any) {
                const errorMsg =
                    error.response?.data?.detail || error.message || 'Error desconocido';
                toast.error(`Error: ${errorMsg}`);
            }
        },
    });

    useEffect(() => {
        if (formik.values.cliente) {
            dispatch(listaUsuariosTodoElClienteThunk({ id_empresa: formik.values.cliente }));
            setIsCrearContactoOpen(false);
        }
    }, [formik.values.cliente]);

    const esProspecto = listaMisProspectos.some(
        (p) => p.info_cliente.id.toString() === formik.values.cliente,
    );
    const esProspectoSinContactos = esProspecto && listaUsuariosTodoElCliente.length === 0;

    const handleCrearContacto = async () => {
        if (!contactoNombre.trim() || !contactoApellido.trim() || !contactoEmail.trim()) {
            toast.error('Nombre, apellido y email son obligatorios');
            return;
        }
        setCreandoContacto(true);
        try {
            const sucursalesResp = await ApiService.fetchData<Array<{ id: number; nombre: string }>>(
                {
                    url: `/api/empresas/${formik.values.cliente}/sucursales-empresa/`,
                    method: 'GET',
                },
            );
            const casaMatriz =
                (sucursalesResp.data as Array<{ id: number; nombre: string }>).find(
                    (s) => s.nombre === 'Casa Matriz',
                ) || (sucursalesResp.data as Array<{ id: number; nombre: string }>)[0];
            if (!casaMatriz) throw new Error('No se encontró la sucursal de la empresa.');

            await ApiService.fetchData({
                url: '/api/invitaciones-empresa/',
                method: 'POST',
                data: {
                    email: contactoEmail.trim(),
                    first_name: contactoNombre.trim(),
                    last_name: contactoApellido.trim(),
                    sucursal: casaMatriz.id,
                },
            });

            const result = await dispatch(
                listaUsuariosTodoElClienteThunk({ id_empresa: formik.values.cliente }),
            );
            const usuarios = (result.payload as any[]) || [];
            const nuevo = usuarios.find(
                (u: any) =>
                    u.email_usuario?.toLowerCase() === contactoEmail.trim().toLowerCase(),
            );
            if (nuevo) {
                formik.setFieldValue('solicitante_empresa', nuevo.id.toString());
            }

            toast.success(
                `Contacto "${contactoNombre.trim()} ${contactoApellido.trim()}" creado correctamente`,
            );
            setIsCrearContactoOpen(false);
            setContactoNombre('');
            setContactoApellido('');
            setContactoEmail('');
        } catch (error: any) {
            const errorMsg =
                error.response?.data?.detail || error.message || 'Error desconocido';
            toast.error(`Error: ${errorMsg}`);
        } finally {
            setCreandoContacto(false);
        }
    };

    return (
        <>
            <Tooltip text='Crear Orden de Trabajo'>
                <Button
                    variant='solid'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                    icon='HeroPlus'></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Orden de Trabajo</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        {/* Campo requerido */}
                        <div>
                            <Badge>Descripción *</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.descripcion}
                                invalidFeedback={formik.errors.descripcion}>
                                <Textarea
                                    name='descripcion'
                                    id='descripcion'
                                    placeholder='Descripción breve del servicio a realizar'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.descripcion}
                                />
                            </Validation>
                        </div>

                        {/* Tipo de Servicio - Campo requerido */}
                        <div>
                            <Badge>Tipo de Servicio *</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.tipo_servicio}
                                invalidFeedback={formik.errors.tipo_servicio}>
                                <SelectReact
                                    name='tipo_servicio'
                                    id='tipo_servicio'
                                    placeholder='Seleccione el tipo de servicio'
                                    noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                    options={TIPO_SERVICIO}
                                    onBlur={formik.handleBlur}
                                    value={TIPO_SERVICIO.find(
                                        (option) => option.value === formik.values.tipo_servicio,
                                    )}
                                    onChange={(option: any) =>
                                        formik.setFieldValue('tipo_servicio', option?.value)
                                    }
                                />
                            </Validation>
                        </div>

                        {/* Cliente/Prospecto - Campo requerido */}
                        <div>
                            <Badge>Cliente / Prospecto *</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cliente}
                                invalidFeedback={formik.errors.cliente}>
                                <SelectReact
                                    name='cliente'
                                    id='cliente'
                                    placeholder='Buscar cliente o prospecto...'
                                    isCreatable={true}
                                    noOptionsMessage={(e) => {
                                        if (e.inputValue) {
                                            return `No existe "${e.inputValue}" - Presiona Enter para crear prospecto`;
                                        }
                                        return 'Escribe para buscar o crear';
                                    }}
                                    formatCreateLabel={(inputValue) =>
                                        `Crear prospecto: "${inputValue}"`
                                    }
                                    options={[
                                        {
                                            label: 'Clientes',
                                            options: listaMisClientes.map((c) => ({
                                                value: c.info_cliente.id.toString(),
                                                label: c.info_cliente.nombre,
                                            })),
                                        },
                                        {
                                            label: 'Prospectos',
                                            options: listaMisProspectos.map((p) => ({
                                                value: p.info_cliente.id.toString(),
                                                label: p.info_cliente.nombre,
                                            })),
                                        },
                                    ]}
                                    onBlur={formik.handleBlur}
                                    value={
                                        [...listaMisClientes, ...listaMisProspectos]
                                            .map((r) => ({
                                                value: r.info_cliente.id.toString(),
                                                label: r.info_cliente.nombre,
                                            }))
                                            .find((option) => option.value === formik.values.cliente) ?? null
                                    }
                                    onChange={(option: any) => {
                                        formik.setFieldValue('cliente', option?.value);
                                    }}
                                    onCreateOption={(inputValue: string) => {
                                        setNombreProspectoSugerido(inputValue);
                                        setIsProspectoModalOpen(true);
                                    }}
                                />
                            </Validation>
                            <p className='mt-1 text-xs text-gray-500'>
                                Si no existe, escribe el nombre y presiona Enter para crear un
                                prospecto
                            </p>
                        </div>

                        {/* Prioridad - Campo requerido */}
                        <div>
                            <Badge>Prioridad *</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.prioridad}
                                invalidFeedback={formik.errors.prioridad}>
                                <SelectReact
                                    name='prioridad'
                                    id='prioridad'
                                    placeholder='Seleccione una prioridad'
                                    noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                    options={PRIORIDAD}
                                    onBlur={formik.handleBlur}
                                    value={PRIORIDAD.find(
                                        (option) => option.value === formik.values.prioridad,
                                    )}
                                    onChange={(option: any) =>
                                        formik.setFieldValue('prioridad', option?.value)
                                    }
                                />
                            </Validation>
                        </div>

                        {/* Espacio entre secciones principales y opcionales */}
                        <div className='mt-2'></div>

                        {/* Fechas opcionales */}
                        <div className='grid grid-cols-2 gap-4'>
                            <div>
                                <Badge>Fecha Inicio</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.fecha_inicio_ot}
                                    invalidFeedback={formik.errors.fecha_inicio_ot}>
                                    <Input
                                        name='fecha_inicio_ot'
                                        id='fecha_inicio_ot'
                                        type='date'
                                        onBlur={formik.handleBlur}
                                        onChange={formik.handleChange}
                                        value={formik.values.fecha_inicio_ot}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Badge>Fecha Fin</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.fecha_finalizacion_ot}
                                    invalidFeedback={formik.errors.fecha_finalizacion_ot}>
                                    <Input
                                        name='fecha_finalizacion_ot'
                                        id='fecha_finalizacion_ot'
                                        type='date'
                                        onBlur={formik.handleBlur}
                                        onChange={formik.handleChange}
                                        value={formik.values.fecha_finalizacion_ot}
                                    />
                                </Validation>
                            </div>
                        </div>

                        {/* Responsable y solicitante opcionales */}
                        <div className='grid grid-cols-2 gap-4'>
                            <div>
                                <Badge>Responsable</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.responsable_empresa}
                                    invalidFeedback={formik.errors.responsable_empresa}>
                                    <SelectReact
                                        name='responsable_empresa'
                                        isClearable={true}
                                        placeholder='Seleccione un responsable'
                                        noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                        options={listaUsuariosTodaLaEmpresa.map((user) => ({
                                            value: user.id.toString(),
                                            label: user.nombre_usuario,
                                        }))}
                                        onBlur={formik.handleBlur}
                                        onChange={(e: any) => {
                                            formik.setFieldValue('responsable_empresa', e?.value);
                                        }}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Badge>Solicitante</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.solicitante_empresa}
                                    invalidFeedback={formik.errors.solicitante_empresa}>
                                    <SelectReact
                                        name='solicitante_empresa'
                                        isClearable={true}
                                        placeholder='Seleccione a un solicitante'
                                        noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                        options={listaUsuariosTodoElCliente.map((user) => ({
                                            value: user.id.toString(),
                                            label: user.nombre_usuario,
                                        }))}
                                        onBlur={formik.handleBlur}
                                        value={
                                            listaUsuariosTodoElCliente.find(
                                                (user) =>
                                                    user.id.toString() ===
                                                    formik.values.solicitante_empresa,
                                            )
                                                ? {
                                                      value: formik.values.solicitante_empresa,
                                                      label:
                                                          listaUsuariosTodoElCliente.find(
                                                              (user) =>
                                                                  user.id.toString() ===
                                                                  formik.values.solicitante_empresa,
                                                          )?.nombre_usuario || '',
                                                  }
                                                : null
                                        }
                                        onChange={(e: any) => {
                                            formik.setFieldValue('solicitante_empresa', e?.value);
                                        }}
                                    />
                                </Validation>
                            </div>
                        </div>

                        {/* Crear contacto para prospecto sin usuarios */}
                        {esProspectoSinContactos && (
                            <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20'>
                                <p className='mb-2 text-xs text-amber-700 dark:text-amber-300'>
                                    Este prospecto no tiene contactos registrados.
                                </p>
                                {!isCrearContactoOpen ? (
                                    <Button
                                        size='sm'
                                        color='amber'
                                        icon='HeroPlus'
                                        onClick={() => setIsCrearContactoOpen(true)}>
                                        Crear contacto
                                    </Button>
                                ) : (
                                    <div className='flex flex-col gap-2'>
                                        <div className='grid grid-cols-2 gap-2'>
                                            <Input
                                                name='contacto_nombre'
                                                placeholder='Nombre'
                                                value={contactoNombre}
                                                onChange={(e) =>
                                                    setContactoNombre(e.target.value)
                                                }
                                            />
                                            <Input
                                                name='contacto_apellido'
                                                placeholder='Apellido'
                                                value={contactoApellido}
                                                onChange={(e) =>
                                                    setContactoApellido(e.target.value)
                                                }
                                            />
                                        </div>
                                        <Input
                                            name='contacto_email'
                                            type='email'
                                            placeholder='Email del contacto'
                                            value={contactoEmail}
                                            onChange={(e) => setContactoEmail(e.target.value)}
                                        />
                                        <div className='flex gap-2'>
                                            <Button
                                                size='sm'
                                                color='amber'
                                                variant='solid'
                                                isDisable={creandoContacto}
                                                onClick={handleCrearContacto}>
                                                {creandoContacto ? 'Guardando...' : 'Guardar contacto'}
                                            </Button>
                                            <Button
                                                size='sm'
                                                onClick={() => setIsCrearContactoOpen(false)}>
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notas internas opcionales */}
                        <div>
                            <Badge>Notas Internas</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.notas_internas}
                                invalidFeedback={formik.errors.notas_internas}>
                                <Textarea
                                    name='notas_internas'
                                    id='notas_internas'
                                    placeholder='Notas o comentarios internos...'
                                    onBlur={formik.handleBlur}
                                    onChange={formik.handleChange}
                                    value={formik.values.notas_internas}
                                    rows={2}
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
                                formik.resetForm();
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

            {/* Modal para crear prospecto */}
            <CrearProspectoModal
                isOpen={isProspectoModalOpen}
                setIsOpen={setIsProspectoModalOpen}
                nombreSugerido={nombreProspectoSugerido}
                onProspectoCreado={(prospecto: any) => {
                    // Refrescar la lista de clientes para que aparezca el nuevo prospecto
                    if (personalizacionUsuario?.empresa) {
                        dispatch(
                            listaMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }),
                        );
                    }

                    // Refrescar la lista de usuarios del cliente recién creado
                    dispatch(listaUsuariosTodoElClienteThunk({ id_empresa: prospecto.id })).then(
                        () => {
                            // Una vez cargados los usuarios, actualizar el formulario
                            formik.setFieldValue('cliente', prospecto.id);
                            formik.setFieldValue('solicitante_empresa', prospecto.usuario_id);
                        },
                    );

                    toast.success(`Prospecto "${prospecto.nombre}" creado correctamente`, {
                        autoClose: 2000,
                    });
                }}
            />
        </>
    );
}

export default CrearOrdenOT;
