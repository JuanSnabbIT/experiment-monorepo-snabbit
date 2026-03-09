import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { TIPOS_USUARIO_CONTRATO } from '@/constants/contrato.constant';
import ApiService from '@/services/ApiService';
import { detalleContratoEmpresaClienteThunk, useAppDispatch } from '@/store';
import { getErrorMessage } from '@/utils/errorHandlers';
import classNames from 'classnames';
import dayjs from 'dayjs';
import { Fragment, useState } from 'react';
import { toast } from 'react-toastify';
import CrearEnvioContratoFirmaUsuario from '../modals/CrearEnvioContratoFirmaUsuario';
import { ITabUsuariosProps } from './contrato.types';

const TabUsuarios = ({
    formik,
    editando,
    detalleContratoEmpresaCliente,
    listaUsuariosTodoElCliente,
}: ITabUsuariosProps) => {
    const dispatch = useAppDispatch();
    const [nuevoUsuario, setNuevoUsuario] = useState<string>('');

    return (
        <Card>
            <CardHeader className='border-b border-b-black'>
                <CardHeaderChild>
                    <div className='text-xl font-bold text-blue-500'>Usuarios Vinculados</div>
                </CardHeaderChild>
                <CardHeaderChild>
                    <CrearEnvioContratoFirmaUsuario />
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='p-4'>
                {editando ? (
                    <div className='grid grid-cols-12 gap-4'>
                        <div className='col-span-6 font-bold'>Usuario</div>
                        <div className='col-span-6 font-bold'>Tipo</div>
                        {formik.values.usuarios_vinculados.length > 0 ? (
                            formik.values.usuarios_vinculados.map((user, index) => (
                                <Fragment key={index}>
                                    <div className='col-span-6'>
                                        {'usuario_id' in user
                                            ? listaUsuariosTodoElCliente.find(
                                                  (userCli) => userCli.id === user.usuario_id,
                                              )?.email_usuario
                                            : 'id' in user
                                              ? detalleContratoEmpresaCliente.vinculos_contrato.find(
                                                    (userCli) => userCli.id === user.id,
                                                )?.datos_usuario.email
                                              : 'No se encontró al usuario'}
                                        <Button
                                            color='red'
                                            icon='HeroTrash'
                                            onClick={() => {
                                                const usuarioEliminado =
                                                    formik.values.usuarios_vinculados[index];
                                                const nuevosUsuarios =
                                                    formik.values.usuarios_vinculados.filter(
                                                        (_, i) => i !== index,
                                                    );
                                                const nuevosEliminados = [
                                                    ...formik.values.eliminar_usuarios,
                                                ];
                                                if (usuarioEliminado.id) {
                                                    nuevosEliminados.push(usuarioEliminado.id);
                                                }
                                                formik.setFieldValue(
                                                    'usuarios_vinculados',
                                                    nuevosUsuarios,
                                                );
                                                formik.setFieldValue(
                                                    'eliminar_usuarios',
                                                    nuevosEliminados,
                                                );
                                            }}
                                        />
                                    </div>
                                    <div className='col-span-6'>
                                        <SelectReact
                                            name='tipo_usuario'
                                            options={TIPOS_USUARIO_CONTRATO}
                                            value={TIPOS_USUARIO_CONTRATO.find(
                                                (tipo) => tipo.value === user.tipo_usuario,
                                            )}
                                            onChange={(e) => {
                                                formik.setFieldValue(
                                                    `usuarios_vinculados[${index}].tipo_usuario`,
                                                    (e as TSelectOption).value,
                                                );
                                            }}
                                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                        />
                                    </div>
                                </Fragment>
                            ))
                        ) : (
                            <div className='col-span-full text-center'>Sin Usuarios</div>
                        )}
                        {listaUsuariosTodoElCliente
                            .filter(
                                (us) =>
                                    !detalleContratoEmpresaCliente.vinculos_contrato.some(
                                        (num) =>
                                            num.usuario === us.id &&
                                            !formik.values.eliminar_usuarios.some(
                                                (formUs) => formUs === num.id,
                                            ),
                                    ),
                            )
                            .filter(
                                (us) =>
                                    !formik.values.usuarios_vinculados.some(
                                        (formUs) => formUs.usuario_id === us.id,
                                    ),
                            ).length > 0 && (
                            <>
                                <div className='col-span-8'>
                                    <SelectReact
                                        name='nuevo_usuario'
                                        options={listaUsuariosTodoElCliente
                                            .filter(
                                                (us) =>
                                                    !detalleContratoEmpresaCliente.vinculos_contrato.some(
                                                        (num) =>
                                                            num.usuario === us.id &&
                                                            !formik.values.eliminar_usuarios.some(
                                                                (formUs) => formUs === num.id,
                                                            ),
                                                    ),
                                            )
                                            .filter(
                                                (us) =>
                                                    !formik.values.usuarios_vinculados.some(
                                                        (formUs) => formUs.usuario_id === us.id,
                                                    ),
                                            )
                                            .map((us) => ({
                                                value: us.id.toString(),
                                                label: us.email_usuario,
                                            }))}
                                        onChange={(e) => {
                                            setNuevoUsuario((e as TSelectOption).value);
                                        }}
                                        value={{
                                            value: nuevoUsuario,
                                            label:
                                                listaUsuariosTodoElCliente.find(
                                                    (us) => us.id.toString() === nuevoUsuario,
                                                )?.email_usuario || '',
                                        }}
                                        noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                    />
                                </div>
                                <div className='col-span-4'>
                                    <Button
                                        onClick={() => {
                                            if (nuevoUsuario.trim() === '') {
                                                toast.error(
                                                    'Seleccione un usuario para agregarlo',
                                                    {
                                                        toastId:
                                                            'Seleccione un usuario para agregarlo',
                                                    },
                                                );
                                                return;
                                            }
                                            formik.setFieldValue('usuarios_vinculados', [
                                                ...formik.values.usuarios_vinculados,
                                                {
                                                    usuario_id: Number(nuevoUsuario),
                                                    tipo_usuario: 'general',
                                                },
                                            ]);
                                            setNuevoUsuario('');
                                        }}>
                                        Agregar
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className='grid grid-cols-12 gap-4'>
                        <div className='col-span-3 font-bold'>Usuario</div>
                        <div className='col-span-3 font-bold'>Tipo</div>
                        <div className='col-span-4 font-bold'>F. Vinculación</div>
                        <div className='col-span-2 font-bold'></div>
                        {detalleContratoEmpresaCliente.vinculos_contrato.length > 0 ? (
                            detalleContratoEmpresaCliente.vinculos_contrato.map(
                                (vinculos, index) => (
                                    <Fragment key={index}>
                                        <div
                                            className={classNames(
                                                'col-span-3',
                                                index > 0 && 'border-t border-t-black',
                                            )}>
                                            {vinculos.datos_usuario.email}
                                        </div>
                                        <div
                                            className={classNames(
                                                'col-span-3',
                                                index > 0 && 'border-t border-t-black',
                                            )}>
                                            {vinculos.tipo_usuario_label}
                                        </div>
                                        <div
                                            className={classNames(
                                                'col-span-4',
                                                index > 0 && 'border-t border-t-black',
                                            )}>
                                            {dayjs(vinculos.fecha_vinculacion).format('DD/MM/YYYY')}
                                        </div>
                                        <div
                                            className={classNames(
                                                'col-span-2',
                                                index > 0 && 'border-t border-t-black',
                                            )}>
                                            {vinculos.existe_envio ? (
                                                <Tooltip text='Reenviar'>
                                                    <Button
                                                        variant='solid'
                                                        color='emerald'
                                                        icon='DuoOutgoingMail'
                                                        onClick={async () => {
                                                            try {
                                                                const response =
                                                                    await ApiService.fetchData({
                                                                        url: `/api/contratos/${detalleContratoEmpresaCliente.id}/usuarios-vinculados/${vinculos.usuario}/envio-firma/${vinculos.existe_envio}/reenviar/`,
                                                                        method: 'post',
                                                                    });
                                                                if (response.data) {
                                                                    toast.success(
                                                                        'Reenvío exitoso',
                                                                        { autoClose: 1000 },
                                                                    );
                                                                    dispatch(
                                                                        detalleContratoEmpresaClienteThunk(
                                                                            {
                                                                                id_contrato:
                                                                                    detalleContratoEmpresaCliente.id,
                                                                            },
                                                                        ),
                                                                    );
                                                                }
                                                            } catch (error: unknown) {
                                                                toast.error(
                                                                    getErrorMessage(error) ||
                                                                        'Error al reenviar el contrato',
                                                                    {
                                                                        toastId:
                                                                            'Error al reenviar el contrato',
                                                                    },
                                                                );
                                                            }
                                                        }}
                                                    />
                                                </Tooltip>
                                            ) : (
                                                <Tooltip text='No enviado'>
                                                    <Button
                                                        variant='solid'
                                                        color='red'
                                                        icon='HeroXMark'
                                                    />
                                                </Tooltip>
                                            )}
                                        </div>
                                    </Fragment>
                                ),
                            )
                        ) : (
                            <div className='col-span-full'>Sin Usuarios</div>
                        )}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default TabUsuarios;
