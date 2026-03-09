import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import { Td, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { IUsuarioVinculadoLicencia } from '@/interface/contrato.interface';
import { useAppSelector } from '@/store';
import {
    useDeleteUsuarioVinculadoLicenciaMutation,
    useGetDetalleContratoLicenciaQuery,
    useGetUsuariosDisponiblesLicenciaQuery,
    useUpdateUsuarioVinculadoLicenciaMutation,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useFormik } from 'formik';
import { useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function ItemsTablaDeUsuariosVinculadosLicencias({ user }: { user: IUsuarioVinculadoLicencia }) {
    const { detalleCliente } = useAppSelector((state) => state.empresa);
    const [editando, setEditando] = useState<boolean>(false);
    const [isUser, setIsUser] = useState<boolean>(true);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);

    // RTK Query mutations
    const [updateUsuario] = useUpdateUsuarioVinculadoLicenciaMutation();
    const [deleteUsuario, { isLoading: isDeleting }] = useDeleteUsuarioVinculadoLicenciaMutation();

    // RTK Query: detalle de la licencia (para se_puede_reducir y partner)
    const { data: detalleContratoLicencia } = useGetDetalleContratoLicenciaQuery(user.licencia);

    // RTK Query: usuarios disponibles (solo cuando se edita)
    const empresaClienteId = detalleCliente?.cliente ?? detalleContratoLicencia?.empresa_cliente ?? '';
    const { data: listaUsuariosDisponibles = [] } = useGetUsuariosDisponiblesLicenciaQuery(
        { licenciaId: user.licencia, empresaId: empresaClienteId },
        { skip: !empresaClienteId || !editando },
    );

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            correo_generico: '',
            usuario: '',
        },
        validationSchema: Yup.object().shape({
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
                const data: Record<string, unknown> = {};
                if (isUser) {
                    data.usuario = values.usuario;
                } else {
                    data.nombre = values.nombre;
                    data.correo_generico = values.correo_generico;
                }
                await updateUsuario({
                    licenciaId: detalleContratoLicencia?.id ?? user.licencia,
                    usuarioId: user.id,
                    data,
                }).unwrap();
                toast.success('Usuario cambiado', { autoClose: 1000 });
                setIsUser(true);
                setEditando(false);
                formik.resetForm();
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    const handleDelete = async () => {
        try {
            await deleteUsuario({
                licenciaId: user.licencia,
                usuarioId: user.id,
            }).unwrap();
            toast.success('Usuario desvinculado', { autoClose: 1000 });
            setConfirmDeleteOpen(false);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <>
            <Tr>
                <Td>
                    {editando ? (
                        <div className='flex flex-col gap-2'>
                            <div>
                                <Label htmlFor='usuario'>Usuario / Nombre</Label>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={
                                        isUser ? formik.touched.usuario : formik.touched.nombre
                                    }
                                    invalidFeedback={
                                        isUser ? formik.errors.usuario : formik.errors.nombre
                                    }>
                                    <SelectReact
                                        name={isUser ? 'usuario' : 'nombre'}
                                        isClearable
                                        isCreatable
                                        onBlur={formik.handleBlur}
                                        formatCreateLabel={(e) => `Nombre: ${e}`}
                                        noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                        options={listaUsuariosDisponibles.map((u) => ({
                                            value: u.id.toString(),
                                            label: u.nombre_usuario,
                                        }))}
                                        value={
                                            isUser
                                                ? {
                                                      value: formik.values.usuario,
                                                      label:
                                                          listaUsuariosDisponibles.find(
                                                              (u) =>
                                                                  u.id.toString() ===
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
                        </div>
                    ) : user.datos_usuario ? (
                        <>
                            <div className='font-bold'>{user.datos_usuario.nombre}</div>
                            <div className='text-sm'>Correo: {user.datos_usuario.correo}</div>
                        </>
                    ) : (
                        <>
                            <div className='flex items-center gap-2'>
                                <span className='font-bold'>{user.nombre}</span>
                                <Badge variant='outline' color='amber' className='text-xs'>
                                    Externo
                                </Badge>
                            </div>
                            <div className='text-sm'>Correo: {user.correo_generico}</div>
                        </>
                    )}
                </Td>
                <Td>
                    {dayjs(user.fecha_asignacion).locale('es').format('DD/MM/YYYY')}
                </Td>
                <Td>
                    {detalleContratoLicencia &&
                        (detalleContratoLicencia.se_puede_reducir ||
                            !detalleContratoLicencia.partner) && (
                            <>
                                {editando ? (
                                    <>
                                        <Tooltip text='Cancelar'>
                                            <Button
                                                variant='solid'
                                                color='red'
                                                icon='HeroXMark'
                                                onClick={() => {
                                                    setEditando(false);
                                                }}
                                            />
                                        </Tooltip>
                                        <Tooltip text='Guardar'>
                                            <Button
                                                variant='solid'
                                                color='emerald'
                                                icon='HeroCheck'
                                                onClick={() => {
                                                    formik.handleSubmit();
                                                }}
                                            />
                                        </Tooltip>
                                    </>
                                ) : (
                                    <Tooltip text='Editar'>
                                        <Button
                                            variant='solid'
                                            icon='HeroPencil'
                                            onClick={() => {
                                                setEditando(true);
                                            }}
                                        />
                                    </Tooltip>
                                )}
                                <Tooltip text='Desvincular'>
                                    <Button
                                        variant='solid'
                                        color='red'
                                        icon='HeroTrash'
                                        onClick={() => setConfirmDeleteOpen(true)}
                                    />
                                </Tooltip>
                            </>
                        )}
                </Td>
            </Tr>

            {/* Modal de confirmación para eliminar */}
            <Modal isOpen={confirmDeleteOpen} setIsOpen={setConfirmDeleteOpen}>
                <ModalHeader>Confirmar eliminación</ModalHeader>
                <ModalBody>
                    ¿Está seguro(a) de querer eliminar la licencia de este usuario?
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button onClick={() => setConfirmDeleteOpen(false)}>Cancelar</Button>
                        <Button
                            variant='solid'
                            color='red'
                            onClick={handleDelete}
                            isLoading={isDeleting}>
                            Eliminar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default ItemsTablaDeUsuariosVinculadosLicencias;
