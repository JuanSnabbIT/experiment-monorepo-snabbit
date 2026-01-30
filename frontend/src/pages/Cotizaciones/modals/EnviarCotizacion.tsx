import Checkbox from '@/components/form/Checkbox';
import FieldWrap from '@/components/form/FieldWrap';
import Input from '@/components/form/Input';
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
import { ICotizacion } from '@/interface/cotizaciones.interface';
import ApiService from '@/services/ApiService';
import {
    detalleCotizacionThunk,
    listaUsuariosEmpresaYClienteThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { FormikErrors, useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { MultiValue } from 'react-select';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface InputItem {
    value: string;
}

interface Props {
    cotizacion: ICotizacion;
    onSuccess?: () => void;
}

function EnviarCotizacion({ cotizacion, onSuccess }: Props) {
    const dispatch = useAppDispatch();
    const { listaUsuariosEmpresaYCliente } = useAppSelector((state) => state.empresa);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [listaUsuarios, setListaUsuarios] = useState<{ value: string; label: string }[]>([]);
    const [isUser, setIsUser] = useState<boolean>(true);
    const [isTakingLong, setIsTakingLong] = useState<boolean>(false);

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
        } else {
            dispatch(
                listaUsuariosEmpresaYClienteThunk({
                    ids_empresa: [cotizacion.cliente, cotizacion.empresa],
                }),
            );
        }
    }, [isOpen]);

    useEffect(() => {
        if (listaUsuariosEmpresaYCliente.length > 0) {
            setListaUsuarios(
                listaUsuariosEmpresaYCliente.map((user) => {
                    return { value: user.id.toString(), label: user.nombre_usuario };
                }),
            );
        }
    }, [listaUsuariosEmpresaYCliente]);

    const validationSchema = Yup.object().shape({
        usuarios_empresa: Yup.array()
            .notRequired()
            .nullable()
            .of(
                Yup.object({
                    value: Yup.string(),
                }),
            ),
        copias: Yup.array()
            .notRequired()
            .nullable()
            .of(
                Yup.object({
                    value: isUser
                        ? Yup.string().notRequired().nullable()
                        : Yup.string()
                              .email('No es un correo valido')
                              .required('Requerido')
                              .nonNullable('Requerido'),
                }),
            ),
    });

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            usuarios_empresa: [] as { value: string }[],
            copias: [] as { value: string }[],
        },
        validationSchema,
        onSubmit: async (values, { setSubmitting }) => {
            setIsTakingLong(false);
            const timer = setTimeout(() => {
                setIsTakingLong(true);
            }, 5000);

            try {
                const usuariosSeleccionados = (values.usuarios_empresa || [])
                    .map((user) => user.value)
                    .filter((val) => val);
                const copiasSeleccionadas = (values.copias || [])
                    .map((cop) => cop.value)
                    .filter((val) => val);

                if (isUser && usuariosSeleccionados.length === 0) {
                    toast.error('Seleccione al menos un usuario interno');
                    setSubmitting(false);
                    clearTimeout(timer);
                    return;
                }
                if (!isUser && copiasSeleccionadas.length === 0) {
                    toast.error('Ingrese al menos un correo externo');
                    setSubmitting(false);
                    clearTimeout(timer);
                    return;
                }

                const data = isUser
                    ? { usuarios_empresa: usuariosSeleccionados.map((id) => Number(id)) }
                    : { copias: copiasSeleccionadas };

                const response = await ApiService.fetchData({
                    url: `/api/cotizaciones/${cotizacion.id}/enviar-cotizacion/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(data),
                    timeout: 90000,
                });
                if (response.data) {
                    toast.success('Copia de cotizacion enviada', { autoClose: 1000 });
                    setIsOpen(false);
                    dispatch(detalleCotizacionThunk({ id_cotizacion: cotizacion.id }));
                    if (onSuccess) onSuccess();
                }
            } catch (error: any) {
                console.error(
                    'Error al enviar copia de cotizacion',
                    error?.response?.data || error,
                );
                if (error?.code === 'ECONNABORTED') {
                    toast.info(
                        'El proceso de envío ha sido delegado al servidor. Recibirá una notificación al finalizar.',
                        { autoClose: 3000 },
                    );
                    setIsOpen(false);
                } else {
                    const detalleError = error?.response?.data?.detail || error?.response?.data;
                    toast.error(detalleError || 'Error al enviar copia de cotizacion');
                }
            } finally {
                clearTimeout(timer);
                setSubmitting(false);
                setIsTakingLong(false);
            }
        },
    });

    return (
        <>
            <Tooltip text='Enviar copia de la cotizacion'>
                <Button
                    variant='solid'
                    color='emerald'
                    icon='HeroEnvelopeOpen'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Enviar copia de la cotizacion</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div className='text-sm text-gray-500'>
                            Reenvia la cotizacion aprobada a usuarios internos o correos externos.
                        </div>
                        <div>
                            <Badge className='text-xl'>Usuarios del Sistema</Badge>
                            <Checkbox
                                name='isUser'
                                className='ml-4'
                                onChange={(e) => {
                                    setIsUser(e.target.checked);
                                }}
                                checked={isUser}
                                label={isUser ? 'Si' : 'No'}
                            />
                        </div>
                        {isUser ? (
                            <div>
                                <Badge>Usuarios</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={
                                        Array.isArray(formik.touched.usuarios_empresa) &&
                                        formik.touched.usuarios_empresa.length > 0
                                    }
                                    invalidFeedback={
                                        Array.isArray(formik.errors.usuarios_empresa)
                                            ? formik.errors.usuarios_empresa
                                                  .map((err) =>
                                                      typeof err === 'string' ? err : '',
                                                  )
                                                  .join('. ')
                                            : typeof formik.errors.usuarios_empresa === 'string'
                                              ? formik.errors.usuarios_empresa
                                              : undefined
                                    }>
                                    <SelectReact
                                        name='usuarios_empresa'
                                        isMulti={true}
                                        options={listaUsuarios}
                                        placeholder='Seleccione usuarios'
                                        noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                        onBlur={formik.handleBlur}
                                        onChange={(e) => {
                                            formik.setFieldValue(
                                                'usuarios_empresa',
                                                (e as MultiValue<TSelectOption>).map((value) => {
                                                    return { value: value.value };
                                                }),
                                            );
                                        }}
                                    />
                                </Validation>
                            </div>
                        ) : (
                            <div>
                                <Badge>Copias</Badge>
                                {formik.values.copias.map((input, index) => (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={
                                            formik.touched.copias &&
                                            formik.touched.copias[index] &&
                                            formik.touched.copias[index].value
                                        }
                                        invalidFeedback={
                                            formik.errors.copias &&
                                            Array.isArray(formik.errors.copias) &&
                                            formik.errors.copias[index] &&
                                            typeof formik.errors.copias[index] === 'object' &&
                                            // @ts-ignore
                                            'value' in formik.errors.copias[index]
                                                ? (
                                                      formik.errors.copias[
                                                          index
                                                      ] as FormikErrors<InputItem>
                                                  ).value
                                                : ''
                                        }
                                        key={index}>
                                        <FieldWrap
                                            lastSuffix={
                                                <Button
                                                    color='red'
                                                    variant='solid'
                                                    size='sm'
                                                    icon='HeroTrash'
                                                    onClick={() => {
                                                        const updatedInputs =
                                                            formik.values.copias.filter(
                                                                (_, i) => i !== index,
                                                            );
                                                        formik.setFieldValue(
                                                            'copias',
                                                            updatedInputs,
                                                        );
                                                    }}></Button>
                                            }>
                                            <Input
                                                type='text'
                                                name={`copias[${index}].value`}
                                                value={input.value}
                                                onChange={formik.handleChange}
                                                onBlur={formik.handleBlur}
                                                placeholder={`Copias ${index + 1}`}
                                            />
                                        </FieldWrap>
                                    </Validation>
                                ))}
                                <Button
                                    className='mt-2'
                                    variant='solid'
                                    onClick={() => {
                                        formik.setFieldValue('copias', [
                                            ...formik.values.copias,
                                            { value: '' },
                                        ]);
                                    }}>
                                    Añadir usuarios para el envio
                                </Button>
                            </div>
                        )}
                        {isTakingLong && (
                            <div className='mt-4 animate-pulse rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 shadow-sm'>
                                <div className='mb-1 font-semibold'>Nota informativa:</div>
                                El proceso de envío está tomando más tiempo de lo habitual debido a
                                la generación de los documentos adjuntos. Si lo prefiere, puede
                                cerrar esta ventana; la operación continuará en segundo plano y
                                recibirá la notificación correspondiente una vez finalizada.
                            </div>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='red'
                            isDisable={formik.isSubmitting}
                            onClick={() => {
                                setIsOpen(false);
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            isDisable={formik.isSubmitting}
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

export default EnviarCotizacion;
