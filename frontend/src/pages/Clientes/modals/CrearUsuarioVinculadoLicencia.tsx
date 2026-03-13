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
import { useGetUsuariosTodoElClienteQuery } from '@/store/slices/empresa/empresaApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface ICrearUsuarioVinculadoLicenciaProps {
    licenciaIdFijo?: string;
    clienteId?: string;
}

type TModoVinculo = 'existente' | 'interno' | 'externo';

function CrearUsuarioVinculadoLicencia({
    licenciaIdFijo,
    clienteId: clienteIdProp,
}: ICrearUsuarioVinculadoLicenciaProps = {}) {
    const { detalleCliente } = useAppSelector((state) => state.empresa);
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [modo, setModo] = useState<TModoVinculo>('existente');
    const [selectedLicenciaId, setSelectedLicenciaId] = useState<string>(licenciaIdFijo ?? '');

    const [createUsuario] = useCreateUsuarioVinculadoLicenciaMutation();

    const { data: listaContratoLicencias = [] } = useGetContratoLicenciasVinculosQuery(
        {
            empresaId: personalizacionUsuario?.empresa ?? '',
            clienteId: detalleCliente?.cliente ?? '',
        },
        { skip: !personalizacionUsuario?.empresa || !detalleCliente?.cliente || !isOpen },
    );

    const { data: detalleContratoLicencia } = useGetDetalleContratoLicenciaQuery(selectedLicenciaId, {
        skip: !selectedLicenciaId,
    });

    const empresaClienteId = clienteIdProp ?? detalleCliente?.cliente ?? '';

    const { data: correosDisponibles = [] } = useGetUsuariosDisponiblesLicenciaQuery(
        { licenciaId: selectedLicenciaId, empresaId: empresaClienteId },
        { skip: !selectedLicenciaId || !empresaClienteId || !isOpen },
    );

    const { data: usuariosCliente = [] } = useGetUsuariosTodoElClienteQuery(empresaClienteId, {
        skip: !empresaClienteId || !isOpen,
    });

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            licencia: '',
            correo_persona: '',
            usuario: '',
            correo: '',
            nombre: '',
            correo_generico: '',
        },
        validationSchema: Yup.object().shape({
            licencia: Yup.string().required('Requerido').nonNullable('Requerido'),
            correo_persona:
                modo === 'existente'
                    ? Yup.string().required('Requerido').nonNullable('Requerido')
                    : Yup.string().nullable(),
            usuario:
                modo === 'interno'
                    ? Yup.string().required('Requerido').nonNullable('Requerido')
                    : Yup.string().nullable(),
            correo:
                modo === 'interno'
                    ? Yup.string().required('Requerido').email('Debe ser un correo válido')
                    : Yup.string().nullable(),
            nombre:
                modo === 'externo'
                    ? Yup.string().required('Requerido').nonNullable('Requerido')
                    : Yup.string().nullable(),
            correo_generico:
                modo === 'externo'
                    ? Yup.string().required('Requerido').email('Debe ser un correo válido')
                    : Yup.string().nullable(),
        }),
        onSubmit: async (values) => {
            try {
                const data: Record<string, unknown> = { licencia: values.licencia };
                if (modo === 'existente') {
                    data.correo_persona = values.correo_persona;
                } else if (modo === 'interno') {
                    data.usuario = values.usuario;
                    data.correo = values.correo;
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

    const opcionesCorreosDisponibles = useMemo(
        () =>
            correosDisponibles.map((correo) => ({
                value: correo.id.toString(),
                label: `${correo.persona_detalle.nombre} <${correo.correo}>`,
            })),
        [correosDisponibles],
    );

    const opcionesUsuariosInternos = useMemo(
        () =>
            usuariosCliente.map((usuario) => ({
                value: usuario.id.toString(),
                label: `${usuario.nombre_usuario} <${usuario.email_usuario}>`,
            })),
        [usuariosCliente],
    );

    const opcionesCorreoUsuarioInterno = useMemo(() => {
        if (!formik.values.usuario) return [];
        return correosDisponibles
            .filter(
                (correo) =>
                    correo.persona_detalle.usuario_empresa?.toString() === formik.values.usuario,
            )
            .map((correo) => ({
                value: correo.correo,
                label: correo.correo,
            }));
    }, [correosDisponibles, formik.values.usuario]);

    const formikRef = useRef(formik);
    formikRef.current = formik;

    useEffect(() => {
        if (isOpen && licenciaIdFijo) {
            formikRef.current.setFieldValue('licencia', licenciaIdFijo);
            setSelectedLicenciaId(licenciaIdFijo);
        }
    }, [isOpen, licenciaIdFijo]);

    useEffect(() => {
        setSelectedLicenciaId(formik.values.licencia);
    }, [formik.values.licencia]);

    useEffect(() => {
        if (!isOpen) {
            formikRef.current.resetForm();
            setModo('existente');
            setSelectedLicenciaId(licenciaIdFijo ?? '');
        }
    }, [isOpen, licenciaIdFijo]);

    useEffect(() => {
        formikRef.current.setFieldValue('correo_persona', '');
        formikRef.current.setFieldValue('usuario', '');
        formikRef.current.setFieldValue('correo', '');
        formikRef.current.setFieldValue('nombre', '');
        formikRef.current.setFieldValue('correo_generico', '');
    }, [modo]);

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
                <ModalHeader>Vincular correo a una licencia</ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
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
                                            formik.setFieldValue('licencia', (e as TSelectOption).value);
                                        }}
                                        value={
                                            formik.values.licencia
                                                ? {
                                                      value: formik.values.licencia,
                                                      label:
                                                          `${listaContratoLicencias.find((lic) => lic.id.toString() === formik.values.licencia)?.nombre_contrato}: ${listaContratoLicencias.find((lic) => lic.id.toString() === formik.values.licencia)?.nombre_licencia}`,
                                                  }
                                                : { value: '', label: '' }
                                        }
                                    />
                                </Validation>
                            </div>
                        )}

                        {formik.values.licencia !== '' && detalleContratoLicencia && (
                            <div>
                                <Label htmlFor='licencia'>Disponibles / Cantidad</Label>
                                <div className='ml-4'>
                                    {detalleContratoLicencia.licencias_disponibles} /{' '}
                                    {detalleContratoLicencia.cantidad}
                                </div>
                            </div>
                        )}

                        {formik.values.licencia !== '' &&
                            detalleContratoLicencia &&
                            detalleContratoLicencia.licencias_disponibles > 0 && (
                                <>
                                    <div className='grid grid-cols-1 gap-2 md:grid-cols-3'>
                                        <Button
                                            variant={modo === 'existente' ? 'solid' : 'outline'}
                                            onClick={() => setModo('existente')}>
                                            Correo existente
                                        </Button>
                                        <Button
                                            variant={modo === 'interno' ? 'solid' : 'outline'}
                                            onClick={() => setModo('interno')}>
                                            Usuario interno
                                        </Button>
                                        <Button
                                            variant={modo === 'externo' ? 'solid' : 'outline'}
                                            onClick={() => setModo('externo')}>
                                            Persona externa
                                        </Button>
                                    </div>

                                    {modo === 'existente' && (
                                        <div>
                                            <Label htmlFor='correo_persona'>Correo existente</Label>
                                            <Validation
                                                isValid={formik.isValid}
                                                isTouched={formik.touched.correo_persona}
                                                invalidFeedback={formik.errors.correo_persona}>
                                                <SelectReact
                                                    name='correo_persona'
                                                    onBlur={formik.handleBlur}
                                                    options={opcionesCorreosDisponibles}
                                                    onChange={(e) => {
                                                        formik.setFieldValue(
                                                            'correo_persona',
                                                            (e as TSelectOption | null)?.value ?? '',
                                                        );
                                                    }}
                                                    value={
                                                        opcionesCorreosDisponibles.find(
                                                            (opt) => opt.value === formik.values.correo_persona,
                                                        ) ?? { value: '', label: '' }
                                                    }
                                                />
                                            </Validation>
                                        </div>
                                    )}

                                    {modo === 'interno' && (
                                        <>
                                            <div>
                                                <Label htmlFor='usuario'>Usuario interno</Label>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.usuario}
                                                    invalidFeedback={formik.errors.usuario}>
                                                    <SelectReact
                                                        name='usuario'
                                                        onBlur={formik.handleBlur}
                                                        options={opcionesUsuariosInternos}
                                                        onChange={(e) => {
                                                            formik.setFieldValue(
                                                                'usuario',
                                                                (e as TSelectOption | null)?.value ?? '',
                                                            );
                                                            formik.setFieldValue('correo', '');
                                                        }}
                                                        value={
                                                            opcionesUsuariosInternos.find(
                                                                (opt) => opt.value === formik.values.usuario,
                                                            ) ?? { value: '', label: '' }
                                                        }
                                                    />
                                                </Validation>
                                            </div>

                                            <div>
                                                <Label htmlFor='correo'>Correo a vincular</Label>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.correo}
                                                    invalidFeedback={formik.errors.correo}>
                                                    <SelectReact
                                                        name='correo'
                                                        isCreatable
                                                        onBlur={formik.handleBlur}
                                                        options={opcionesCorreoUsuarioInterno}
                                                        onCreateOption={(value) => {
                                                            formik.setFieldValue('correo', value.trim().toLowerCase());
                                                        }}
                                                        onChange={(e) => {
                                                            formik.setFieldValue(
                                                                'correo',
                                                                (e as TSelectOption | null)?.value ?? '',
                                                            );
                                                        }}
                                                        value={
                                                            formik.values.correo
                                                                ? {
                                                                      value: formik.values.correo,
                                                                      label: formik.values.correo,
                                                                  }
                                                                : { value: '', label: '' }
                                                        }
                                                    />
                                                </Validation>
                                            </div>
                                        </>
                                    )}

                                    {modo === 'externo' && (
                                        <>
                                            <div>
                                                <Label htmlFor='nombre'>Nombre</Label>
                                                <Validation
                                                    isValid={formik.isValid}
                                                    isTouched={formik.touched.nombre}
                                                    invalidFeedback={formik.errors.nombre}>
                                                    <Input
                                                        name='nombre'
                                                        onChange={formik.handleChange}
                                                        onBlur={formik.handleBlur}
                                                        value={formik.values.nombre}
                                                    />
                                                </Validation>
                                            </div>
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
                                        </>
                                    )}
                                </>
                            )}

                        {formik.values.licencia !== '' &&
                            detalleContratoLicencia &&
                            detalleContratoLicencia.licencias_disponibles === 0 && (
                                <div>No hay licencias disponibles</div>
                            )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
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
