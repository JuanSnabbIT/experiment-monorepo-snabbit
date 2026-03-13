import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
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
import { IContratoEmpresaCliente } from '@/interface/contrato.interface';
import ApiService from '@/services/ApiService';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface ICrearEnvioContratoFirmaUsuarioProps {
    contrato: IContratoEmpresaCliente;
}

function CrearEnvioContratoFirmaUsuario({ contrato }: ICrearEnvioContratoFirmaUsuarioProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
        }
    }, [isOpen]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            usuario: '',
        },
        validationSchema: Yup.object().shape({
            usuario: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/contratos/${contrato.id}/usuarios-vinculados/${values.usuario}/envio-firma/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ usuario: values.usuario }),
                });
                if (response.data) {
                    toast.success('Envio exitoso', { autoClose: 1000 });
                    setIsOpen(false);
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(' ');
                toast.error(mensajesError || 'Error al enviar la firma', {
                    toastId: 'Error al enviar la firma',
                });
            }
        },
    });

    return (
        <>
            <Tooltip text='Enviar Contrato'>
                <Button
                    variant='solid'
                    icon='DuoMail'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Enviar Contrato</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Usuario</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.usuario}
                                invalidFeedback={formik.errors.usuario}>
                                <SelectReact
                                    name='usuario'
                                    noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                    placeholder='Seleccione un Usuario'
                                    options={contrato.vinculos_contrato
                                        .filter((user) => !user.existe_envio)
                                        .map((user) => ({
                                            value: user.id.toString(),
                                            label: user.datos_usuario.nombre,
                                        }))}
                                    onChange={(e) => {
                                        if (e) {
                                            formik.setFieldValue(
                                                'usuario',
                                                (e as TSelectOption).value,
                                            );
                                        }
                                    }}
                                    value={{
                                        value: formik.values.usuario,
                                        label:
                                            contrato.vinculos_contrato.find(
                                                (user) =>
                                                    user.id.toString() === formik.values.usuario,
                                            )?.datos_usuario.nombre || '',
                                    }}
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
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={() => {
                                formik.handleSubmit();
                            }}>
                            Enviar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearEnvioContratoFirmaUsuario;
