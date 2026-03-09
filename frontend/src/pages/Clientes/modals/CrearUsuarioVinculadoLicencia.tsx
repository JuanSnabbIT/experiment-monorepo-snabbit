import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
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
    useCreateUsuarioVinculadoLicenciaMutation,
    useGetContratoLicenciasVinculosQuery,
    useGetDetalleContratoLicenciaQuery,
    useGetUsuariosDisponiblesLicenciaQuery,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface ICrearUsuarioVinculadoLicenciaProps {
    /** Cuando se provee, la licencia queda fija y no se muestra el selector */
    licenciaIdFijo?: string;
    /** ID de la empresa cliente — requerido cuando no hay detalleCliente en Redux (ej. desde DetalleLicencia) */
    clienteId?: string;
}

function CrearUsuarioVinculadoLicencia({ licenciaIdFijo, clienteId: clienteIdProp }: ICrearUsuarioVinculadoLicenciaProps = {}) {
    const { detalleCliente } = useAppSelector((state) => state.empresa);
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isUser, setIsUser] = useState<boolean>(false);
    const [selectedLicenciaId, setSelectedLicenciaId] = useState<string>(licenciaIdFijo ?? '');

    // RTK Query mutations
    const [createUsuario] = useCreateUsuarioVinculadoLicenciaMutation();

    // RTK Query: lista de licencias del cliente
    const { data: listaContratoLicencias = [] } = useGetContratoLicenciasVinculosQuery(
        {
            empresaId: personalizacionUsuario?.empresa ?? '',
            clienteId: detalleCliente?.cliente ?? '',
        },
        { skip: !personalizacionUsuario?.empresa || !detalleCliente?.cliente || !isOpen },
    );

    // RTK Query: detalle de licencia seleccionada
    const { data: detalleContratoLicencia } = useGetDetalleContratoLicenciaQuery(
        selectedLicenciaId,
        { skip: !selectedLicenciaId },
    );

    // ID de empresa cliente: prop explícita tiene prioridad sobre Redux
    const empresaClienteId = clienteIdProp ?? detalleCliente?.cliente ?? '';

    // RTK Query: usuarios disponibles
    const { data: listaUsuariosDisponibles = [] } = useGetUsuariosDisponiblesLicenciaQuery(
        { licenciaId: selectedLicenciaId, empresaId: empresaClienteId },
        { skip: !selectedLicenciaId || !empresaClienteId },
    );

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            correo_generico: '',
            usuario: '',
            licencia: '',
        },
        validationSchema: Yup.object().shape({
            licencia: Yup.string().required('Requerido').nonNullable('Requerido'),
            usuario: isUser
                ? Yup.string().required('Requerido').nonNullable('Requerido')
                : Yup.string().notRequired().nullable(),
            nombre: !isUser
                ? Yup.string().required('Requerido').nonNullable('Requerido')
                : Yup.string().notRequired().nullable(),
            correo_generico: !isUser
                ? Yup.string()
                      .required('Requerido')
                      .email('Debe ser un correo válido')
                      .nonNullable('Requerido')
                : Yup.string().notRequired().nullable(),
        }),
        onSubmit: async (values) => {
            try {
                const data: Record<string, unknown> = { licencia: values.licencia };
                if (isUser) {
                    data.usuario = values.usuario;
                } else {
                    data.nombre = values.nombre;
                    data.correo_generico = values.correo_generico;
                }
                await createUsuario({
                    licenciaId: values.licencia,
                    data,
                }).unwrap();
                toast.success('Vínculo creado', { autoClose: 1000 });
                setIsOpen(false);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    // Cuando hay licenciaIdFijo, inicializar al abrir el modal
    useEffect(() => {
        if (isOpen && licenciaIdFijo) {
            formik.setFieldValue('licencia', licenciaIdFijo);
            setSelectedLicenciaId(licenciaIdFijo);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, licenciaIdFijo]);

    // Sincronizar selección de licencia con el formik value
    useEffect(() => {
        setSelectedLicenciaId(formik.values.licencia);
    }, [formik.values.licencia]);

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
            setSelectedLicenciaId(licenciaIdFijo ?? '');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    return (
        <>
            <Tooltip text='Vincular Usuario'>
                <Button
                    variant='solid'
                    icon='HeroPlus'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>Vincular Usuario a una Licencia</ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        {/* Selector de licencia: solo cuando no hay licencia fija */}
                        {!licenciaIdFijo && (
                            <div>
                                <Label htmlFor='licencia'>Licencia</Label>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.licencia}
                                    invalidFeedback={formik.errors.licencia}>
                                    <SelectReact
                                        name='licencia'
                                        onBlur={formik.handleBlur}
                                        options={listaContratoLicencias.map((con) => ({
                                            value: con.id.toString(),
                                            label: `${con.nombre_contrato}: ${con.nombre_licencia}`,
                                        }))}
                                        onChange={(e) => {
                                            formik.setFieldValue(
                                                'licencia',
                                                (e as TSelectOption).value,
                                            );
                                        }}
                                        value={
                                            formik.values.licencia
                                                ? {
                                                      value: formik.values.licencia,
                                                      label: `${listaContratoLicencias.find((lic) => lic.id.toString() === formik.values.licencia)?.nombre_contrato}: ${listaContratoLicencias.find((lic) => lic.id.toString() === formik.values.licencia)?.nombre_licencia}`,
                                                  }
                                                : { value: '', label: '' }
                                        }
                                    />
                                </Validation>
                            </div>
                        )}
                        {formik.values.licencia != '' && detalleContratoLicencia && (
                            <div>
                                <Label htmlFor='licencia'>Disponibles / Cantidad</Label>
                                <div className='ml-4'>
                                    {detalleContratoLicencia.licencias_disponibles} /{' '}
                                    {detalleContratoLicencia.cantidad}
                                </div>
                            </div>
                        )}
                        {formik.values.licencia != '' &&
                            detalleContratoLicencia &&
                            detalleContratoLicencia.licencias_disponibles > 0 && (
                                <>
                                    <div>
                                        <Label htmlFor='usuario'>Usuario / Nombre</Label>
                                        <Validation
                                            isValid={formik.isValid}
                                            isTouched={
                                                isUser
                                                    ? formik.touched.usuario
                                                    : formik.touched.nombre
                                            }
                                            invalidFeedback={
                                                isUser
                                                    ? formik.errors.usuario
                                                    : formik.errors.nombre
                                            }>
                                            <SelectReact
                                                name={isUser ? 'usuario' : 'nombre'}
                                                isClearable
                                                isCreatable
                                                onBlur={formik.handleBlur}
                                                formatCreateLabel={(e) => `Nombre: ${e}`}
                                                noOptionsMessage={(e) =>
                                                    `No Existe ${e.inputValue}`
                                                }
                                                options={listaUsuariosDisponibles.map(
                                                    (user) => ({
                                                        value: user.id.toString(),
                                                        label: user.nombre_usuario,
                                                    }),
                                                )}
                                                value={
                                                    isUser
                                                        ? {
                                                              value: formik.values.usuario,
                                                              label:
                                                                  listaUsuariosDisponibles.find(
                                                                      (user) =>
                                                                          user.id.toString() ===
                                                                          formik.values.usuario,
                                                                  )?.nombre_usuario || '',
                                                          }
                                                        : {
                                                              value: formik.values.nombre,
                                                              label: formik.values.nombre,
                                                          }
                                                }
                                                onCreateOption={(e) => {
                                                    if (e) {
                                                        setIsUser(false);
                                                        formik.setFieldValue('nombre', e);
                                                        formik.setFieldValue('usuario', '');
                                                    } else {
                                                        setIsUser(true);
                                                        formik.setFieldValue('nombre', '');
                                                        formik.setFieldValue('correo', '');
                                                    }
                                                }}
                                                onChange={(e) => {
                                                    if (e) {
                                                        setIsUser(true);
                                                        formik.setFieldValue(
                                                            'usuario',
                                                            (e as TSelectOption).value,
                                                        );
                                                        formik.setFieldValue('nombre', '');
                                                        formik.setFieldValue('correo', '');
                                                    } else {
                                                        setIsUser(false);
                                                        formik.setFieldValue('usuario', '');
                                                        formik.setFieldValue('nombre', '');
                                                        formik.setFieldValue('correo', '');
                                                    }
                                                }}
                                            />
                                        </Validation>
                                    </div>
                                    {!isUser && formik.values.nombre && (
                                        <div>
                                            <Label htmlFor='correo_generico'>Correo</Label>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.correo_generico}
                                                invalidFeedback={formik.errors.correo_generico}>
                                                <Input
                                                    name='correo_generico'
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                    value={formik.values.correo_generico}
                                                />
                                            </Validation>
                                        </div>
                                    )}
                                </>
                            )}
                        {formik.values.licencia != '' &&
                            detalleContratoLicencia &&
                            detalleContratoLicencia.licencias_disponibles === 0 && (
                                <div>No hay licencias disponibles</div>
                            )}
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
                            Guardar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearUsuarioVinculadoLicencia;
